import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { detectarIdioma } from "@/lib/clasificar";
import type { Entrada } from "@/lib/entrada";
import { catalogo } from "@/lib/fuente-catalogo";
import {
  conversar,
  type Herramienta,
  type LlamadaHerramienta,
  type MensajeChat,
} from "@/lib/ia";
import { buscar } from "@/lib/rag";
import {
  MAX_CARACTERES,
  type Candidata,
  type FuenteResultado,
  type Idioma,
  type Motor,
  type Resultado,
} from "./contrato";
import { plantillas } from "./plantillas";
import { sinRespaldo } from "./respaldo";

// Chat de la ficha: un loop agéntico con dos herramientas. El loop es nuestro;
// HelmCode solo decide qué herramienta llamar y redacta. Nunca se registra el
// texto del ciudadano (regla 3).

const MAX_LLAMADAS = 3; // la última, sin herramientas
const MAX_TEXTO = MAX_CARACTERES; // el frontend lo reenvía en el historial
const MAX_CANDIDATAS = 3;

// contexto.md (unos 30k tokens) se lee una vez por instancia. En Vercel llega
// gracias a outputFileTracingIncludes (next.config.ts).
let marco: Promise<string> | undefined;
function leerMarco() {
  marco ??= readFile(path.join(process.cwd(), "contexto.md"), "utf8");
  return marco;
}

const consultarContexto: Herramienta = {
  type: "function",
  function: {
    name: "consultar_contexto",
    description:
      "Devuelve la ficha completa de una entrada del catálogo (por defecto, la que el ciudadano tiene abierta) y el marco general verificado de la Administración (plazos administrativos, identificación digital, Cl@ve, certificados, notificaciones, registro, recursos). Úsala para cualquier duda sobre un trámite o sobre cómo funciona la Administración.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            "id de una entrada del catálogo. Si se omite, la entrada abierta.",
        },
      },
      additionalProperties: false,
    },
  },
};

const buscarTramites: Herramienta = {
  type: "function",
  function: {
    name: "buscar_tramites",
    description:
      "Busca en el índice de trámites y ayudas los que encajan con una situación o una pregunta. Devuelve fragmentos, cada uno con el id de su entrada. Úsala cuando el ciudadano pregunte por otro trámite y no sepas su id.",
    parameters: {
      type: "object",
      properties: {
        consulta: {
          type: "string",
          description: "La situación o el trámite, en lenguaje natural.",
        },
      },
      required: ["consulta"],
      additionalProperties: false,
    },
  },
};

function sistema(abierta: Entrada, lista: string, conRag: boolean): string {
  return `Eres el asistente de Brújula, una herramienta experimental (no oficial) que orienta sobre trámites y ayudas públicas en España y en la Comunitat Valenciana.
El ciudadano tiene abierta la ficha «${abierta.titulo}» (id: ${abierta.id}).

Reglas:
1. Solo respondes dudas sobre trámites, ayudas y el funcionamiento de la Administración. Antes de responder, llama a una herramienta y usa solo lo que devuelva.
2. Si la pregunta no trata de eso (por ejemplo, programar en Python, recetas, charla o saludos), no llames a ninguna herramienta y contesta en una frase que esa pregunta no forma parte de lo que hace este asistente.
3. Nunca digas si la persona cumple los requisitos ni si le corresponde una ayuda: explica qué pide la ficha y remite al organismo.
4. Cifras (plazos, importes, fechas, porcentajes) y enlaces: escríbelos solo si aparecen tal cual en lo que devolvieron las herramientas. Si no están, di «No podemos confirmarlo» y remite a la sede oficial.
5. Responde en el idioma del ciudadano, castellano o valenciano. Sé breve: como mucho 5 frases o una lista corta, y nunca más de 800 caracteres. Texto plano, sin tablas ni títulos.
6. Si pregunta por otro trámite o por un tema que tiene entrada propia en la lista (por ejemplo, identificacion-digital para Cl@ve o certificado digital), llama a consultar_contexto con ese id${conRag ? " o, si no, a buscar_tramites" : ""}. Si no está, dilo y remite al Punto de Acceso General.

Entradas del catálogo (id — título):
${lista}`;
}

type Estado = {
  material: string[];
  consultadas: Map<string, Entrada>;
  candidatas: string[];
  marcoEnviado: boolean;
  usoHerramientas: boolean;
};

function leerArgumentos(llamada: LlamadaHerramienta): Record<string, unknown> {
  try {
    const a = JSON.parse(llamada.function.arguments || "{}");
    return a && typeof a === "object" ? a : {};
  } catch {
    return {};
  }
}

function anotarCandidata(estado: Estado, id: string, abierta: string) {
  if (id !== abierta && !estado.candidatas.includes(id))
    estado.candidatas.push(id);
}

async function ejecutar(
  llamada: LlamadaHerramienta,
  estado: Estado,
  abierta: string,
): Promise<string> {
  const args = leerArgumentos(llamada);

  if (llamada.function.name === "consultar_contexto") {
    const id = typeof args.id === "string" && args.id ? args.id : abierta;
    const entrada = await catalogo.obtener(id);
    if (!entrada)
      return JSON.stringify({
        error: `No hay ninguna entrada con id «${id}». Usa un id de la lista.`,
      });
    const texto = estado.marcoEnviado
      ? "(ya enviado más arriba)"
      : await leerMarco();
    const ficha = JSON.stringify(entrada);
    estado.material.push(ficha);
    if (!estado.marcoEnviado) estado.material.push(texto);
    estado.marcoEnviado = true;
    estado.consultadas.set(entrada.id, entrada);
    estado.usoHerramientas = true;
    anotarCandidata(estado, entrada.id, abierta);
    return JSON.stringify({ entrada, marco: texto });
  }

  if (llamada.function.name === "buscar_tramites" && buscar) {
    const consulta = typeof args.consulta === "string" ? args.consulta : "";
    const fragmentos = [];
    for (const f of await buscar(consulta, 5)) {
      const e = await catalogo.obtener(f.id);
      if (!e) continue;
      fragmentos.push({ id: e.id, titulo: e.titulo, texto: f.texto });
      estado.material.push(e.titulo, f.texto);
      estado.consultadas.set(e.id, e);
      anotarCandidata(estado, e.id, abierta);
    }
    estado.usoHerramientas = true;
    return JSON.stringify({ fragmentos });
  }

  return JSON.stringify({ error: "Herramienta desconocida." });
}

function enlacesCitados(texto: string): FuenteResultado[] {
  const fuentes: FuenteResultado[] = [];
  for (const bruta of texto.match(/https?:\/\/[^\s<>"'()[\]]+/gi) ?? []) {
    const url = bruta.replace(/[.,;:!?]+$/, "");
    try {
      fuentes.push({ nombre: new URL(url).hostname, url });
    } catch {
      // URL mal formada: se omite de las fuentes.
    }
  }
  return fuentes;
}

function unicas(fuentes: FuenteResultado[]): FuenteResultado[] {
  const vistas = new Set<string>();
  return fuentes.filter((f) => !vistas.has(f.url) && vistas.add(f.url));
}

function cerrar(
  texto: string,
  idioma: Idioma,
  abierta: Entrada,
  estado: Estado,
): Resultado {
  const comun = { idioma, proveedor: "helmcode" as const };
  const candidatas: Candidata[] = estado.candidatas
    .slice(0, MAX_CANDIDATAS)
    .map((id) => ({ id, confianza: "media" }));

  if (!estado.usoHerramientas)
    return {
      tipo: "contestacion",
      texto: plantillas[idioma].fueraDeAmbito,
      fuentes: [],
      candidatas: [],
      ...comun,
    };

  // Solo el material oficial respalda cifras y enlaces: lo que escribió el
  // ciudadano no cuenta (si dice «me dijeron 30 días», el chat no lo confirma).
  const material = estado.material.join("\n");
  const limpio = texto.trim();
  const consultadas = [...estado.consultadas.values()];
  const fuentes = unicas(
    (consultadas.length ? consultadas : [abierta]).flatMap((e) => e.fuentes),
  );

  if (
    !limpio ||
    limpio.length > MAX_TEXTO ||
    sinRespaldo(limpio, material).length > 0
  )
    return {
      tipo: "contestacion",
      texto: plantillas[idioma].noConfirmado,
      fuentes: unicas([
        { nombre: abierta.organismo, url: abierta.enlace_info },
        ...fuentes,
      ]),
      candidatas,
      ...comun,
    };

  // Superó la comprobación: los enlaces que cita salen del material y se
  // añaden a las fuentes.
  return {
    tipo: "contestacion",
    texto: limpio,
    fuentes: unicas([...fuentes, ...enlacesCitados(limpio)]),
    candidatas,
    ...comun,
  };
}

export const motorAgente: Motor = {
  async clasificar(historial, senal, entradaAbierta) {
    if (!entradaAbierta) throw new Error("El agente necesita entradaAbierta");
    const abierta = await catalogo.obtener(entradaAbierta);
    if (!abierta) throw new Error("entradaAbierta fuera del catálogo");

    const idioma = detectarIdioma(
      historial.findLast((t) => t.rol === "ciudadano")?.texto ?? "",
    );
    const entradas = await catalogo.listar();
    const lista = entradas.map((e) => `- ${e.id} — ${e.titulo}`).join("\n");
    const herramientas = buscar
      ? [consultarContexto, buscarTramites]
      : [consultarContexto];

    const estado: Estado = {
      material: [lista],
      consultadas: new Map(),
      candidatas: [],
      marcoEnviado: false,
      usoHerramientas: false,
    };
    const mensajes: MensajeChat[] = [
      { role: "system", content: sistema(abierta, lista, Boolean(buscar)) },
      ...historial.map((t) => ({
        role: t.rol === "ciudadano" ? ("user" as const) : ("assistant" as const),
        content: t.texto,
      })),
    ];

    for (let i = 0; i < MAX_LLAMADAS; i++) {
      const ultima = i === MAX_LLAMADAS - 1;
      const msg = await conversar(mensajes, {
        tools: herramientas,
        toolChoice: ultima ? "none" : "auto",
        signal: senal,
      });
      if (!msg.tool_calls || ultima)
        return cerrar(msg.content ?? "", idioma, abierta, estado);
      mensajes.push(msg);
      for (const llamada of msg.tool_calls)
        mensajes.push({
          role: "tool",
          tool_call_id: llamada.id,
          content: await ejecutar(llamada, estado, abierta.id),
        });
    }
    // No se llega aquí: la última vuelta siempre cierra.
    return cerrar("", idioma, abierta, estado);
  },
};
