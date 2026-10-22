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
import {
  definicion as buscarTramites,
  responder as responderBusqueda,
  type ResultadoBusqueda,
} from "@/lib/herramientas/buscar-tramites";
import {
  MAX_CARACTERES,
  type Candidata,
  type EnVivo,
  type FuenteResultado,
  type Idioma,
  type Motor,
  type Resultado,
} from "./contrato";
import { plantillas } from "./plantillas";
import { sinRespaldo } from "./respaldo";

// Chat de la ficha: un loop agéntico con dos herramientas (consultar_contexto y
// buscar_tramites, el índice semántico). El loop es nuestro; HelmCode solo
// decide qué herramienta llamar y redacta. Nunca se registra el
// texto del ciudadano (regla 3).

const MAX_LLAMADAS = 4; // la última, sin herramientas
const MAX_TEXTO = MAX_CARACTERES; // el frontend lo reenvía en el historial
const MAX_CANDIDATAS = 3;
// Respaldo para «ninguno encaja»: el buscador del PAG, que el chat puede
// enlazar sin que lo devuelva una herramienta.
const PAG =
  "https://administracion.gob.es/tramites-electronicos/resultados-actuaciones";

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

function sistema(abierta: Entrada): string {
  return `Eres el asistente de Brújula, una herramienta experimental (no oficial) que orienta sobre trámites y ayudas públicas en España y en la Comunitat Valenciana.
El ciudadano tiene abierta la ficha «${abierta.titulo}» (id: ${abierta.id}).

Reglas:
1. Solo respondes dudas sobre trámites, ayudas y el funcionamiento de la Administración. Antes de responder, llama a una herramienta y usa solo lo que devuelva.
2. Si la pregunta no trata de eso (por ejemplo, programar en Python, recetas, charla o saludos), no llames a ninguna herramienta y contesta en una frase que esa pregunta no forma parte de lo que hace este asistente.
3. Nunca digas si la persona cumple los requisitos ni si le corresponde una ayuda: explica qué pide la ficha y remite al organismo.
4. Cifras (plazos, importes, fechas, porcentajes), requisitos y enlaces: escríbelos solo si aparecen tal cual en lo que devolvieron las herramientas. Nunca los inventes. Si no están, di «No podemos confirmarlo» y remite a la sede oficial.
5. Responde en el idioma del ciudadano, castellano o valenciano. Sé breve: como mucho 5 frases o una lista corta, y nunca más de 800 caracteres. Texto plano, sin tablas ni títulos.
6. Dudas sobre la ficha abierta o sobre cómo funciona la Administración: llama a consultar_contexto sin id.
7. Si el mensaje trata de otro trámite o de una situación nueva, llama a buscar_tramites una sola vez, antes de hablar de ningún trámite concreto, con lo que necesita el ciudadano. Después:
   - Elige solo entre los ids que devuelva; nunca otro.
   - Si dudas entre dos, no elijas: nombra los dos por su título y pregunta cuál es su caso.
   - Si ninguno encaja, di que no puedes confirmarlo y enlaza el Punto de Acceso General (${PAG}).
   - Antes de dar pasos, cifras o requisitos del elegido, lee su ficha con consultar_contexto y su id.`;
}

type Estado = {
  material: string[];
  consultadas: Map<string, Entrada>;
  candidatas: string[];
  devueltos: Map<string, string>; // id → título, de buscar_tramites
  buscado: boolean;
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
  abierta: Entrada,
  senal?: AbortSignal,
): Promise<string> {
  if (llamada.function.name === "consultar_contexto") {
    const args = leerArgumentos(llamada);
    const id = typeof args.id === "string" && args.id ? args.id : abierta.id;
    // Solo ids que el chat ya conoce por las herramientas: la abierta, sus
    // relacionados y lo que devolvió buscar_tramites.
    const conocido =
      id === abierta.id ||
      abierta.relacionados.includes(id) ||
      estado.devueltos.has(id);
    const entrada = conocido ? await catalogo.obtener(id) : undefined;
    if (!entrada)
      return JSON.stringify({
        error: `No conozco la entrada «${id}». Usa un id devuelto por buscar_tramites.`,
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
    anotarCandidata(estado, entrada.id, abierta.id);
    return JSON.stringify({ entrada, marco: texto });
  }

  if (llamada.function.name === "buscar_tramites") {
    // Una búsqueda por mensaje: la segunda no llega a HelmCode.
    if (estado.buscado)
      return JSON.stringify({
        error: "Ya has buscado en este mensaje: elige entre esos candidatos.",
      });
    const respuesta = await responderBusqueda(llamada, senal);
    const resultado = JSON.parse(respuesta.content) as
      | ResultadoBusqueda
      | { error: string };
    if ("candidatos" in resultado) {
      estado.buscado = true;
      estado.usoHerramientas = true;
      for (const c of resultado.candidatos) {
        estado.devueltos.set(c.id, c.titulo);
        estado.material.push(`${c.titulo} — ${c.organismo}`);
      }
    }
    return respuesta.content;
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

async function cerrar(
  texto: string,
  idioma: Idioma,
  abierta: Entrada,
  estado: Estado,
): Promise<Resultado> {
  const comun = { idioma, proveedor: "helmcode" as const };
  // Las consultadas y, de lo que devolvió la búsqueda, lo que el texto nombra.
  const nombradas = [...estado.devueltos]
    .filter(([id, titulo]) => id !== abierta.id && texto.includes(titulo))
    .map(([id]) => id);
  const candidatas: Candidata[] = [
    ...new Set([...estado.candidatas, ...nombradas]),
  ]
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

  // Fuentes: las fichas que sostienen la respuesta (consultadas o nombradas),
  // nunca la abierta por defecto. Sin ninguna, el buscador del PAG.
  const ids = new Set([
    ...estado.consultadas.keys(),
    ...candidatas.map((c) => c.id),
  ]);
  const entradas = await Promise.all([...ids].map((id) => catalogo.obtener(id)));
  const fuentes = unicas(entradas.flatMap((e) => e?.fuentes ?? []));
  if (!fuentes.length)
    fuentes.push({ nombre: "Buscador de trámites del PAG", url: PAG });

  // Solo el material oficial respalda cifras y enlaces: lo que escribió el
  // ciudadano no cuenta (si dice «me dijeron 30 días», el chat no lo confirma).
  const material = estado.material.join("\n");
  const limpio = texto.trim();

  if (
    !limpio ||
    limpio.length > MAX_TEXTO ||
    sinRespaldo(limpio, material).length > 0
  )
    return {
      tipo: "contestacion",
      texto: plantillas[idioma].noConfirmado,
      fuentes,
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
  async clasificar(historial, senal, entradaAbierta, enVivo?: EnVivo) {
    if (!entradaAbierta) throw new Error("El agente necesita entradaAbierta");
    const abierta = await catalogo.obtener(entradaAbierta);
    if (!abierta) throw new Error("entradaAbierta fuera del catálogo");

    const idioma = detectarIdioma(
      historial.findLast((t) => t.rol === "ciudadano")?.texto ?? "",
    );
    const herramientas: Herramienta[] = [consultarContexto, buscarTramites];

    const estado: Estado = {
      material: [PAG],
      consultadas: new Map(),
      candidatas: [],
      devueltos: new Map(),
      buscado: false,
      marcoEnviado: false,
      usoHerramientas: false,
    };
    const mensajes: MensajeChat[] = [
      { role: "system", content: sistema(abierta) },
      ...historial.map((t) => ({
        role: t.rol === "ciudadano" ? ("user" as const) : ("assistant" as const),
        content: t.texto,
      })),
    ];

    for (let i = 0; i < MAX_LLAMADAS; i++) {
      const ultima = i === MAX_LLAMADAS - 1;
      let escrito = false;
      const msg = await conversar(mensajes, {
        tools: herramientas,
        toolChoice: ultima ? "none" : "auto",
        signal: senal,
        alTexto:
          enVivo &&
          ((trozo) => {
            escrito = true;
            enVivo.texto(trozo);
          }),
      });
      if (!msg.tool_calls || ultima)
        return cerrar(msg.content ?? "", idioma, abierta, estado);
      // Lo que escribió antes de llamar a una herramienta no es la respuesta.
      if (escrito) enVivo?.descartar();
      mensajes.push(msg);
      for (const llamada of msg.tool_calls)
        mensajes.push({
          role: "tool",
          tool_call_id: llamada.id,
          content: await ejecutar(llamada, estado, abierta, senal),
        });
    }
    // No se llega aquí: la última vuelta siempre cierra.
    return cerrar("", idioma, abierta, estado);
  },
};
