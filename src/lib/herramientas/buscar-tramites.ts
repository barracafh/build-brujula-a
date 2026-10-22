import "server-only";
import { buscar, LIMITE_POR_DEFECTO, TOTAL } from "@/lib/buscador";
import { catalogo } from "@/lib/fuente-catalogo";
import type { Entrada } from "@/lib/entrada";
import { minimizar } from "@/lib/minimizar";

// Herramienta del agente: de una frase del ciudadano a los trámites más
// parecidos del catálogo (decisiones.md, punto 18). La frase se minimiza aquí
// (src/lib/minimizar.ts) antes de enviarla a HelmCode, venga de donde venga.
//
//   const { candidatos } = await buscarTramites("me han echado del trabajo");
//
// Como herramienta de HelmCode: `definicion` va en `tools` y, por cada
// `tool_call` del modelo, `responder(llamada)` da el mensaje `role: "tool"`.

export type Candidato = Pick<Entrada, "id" | "titulo" | "tipo" | "organismo" | "administracion"> & {
  similitud: number | null; // null si el buscador no respondió
};

export type ResultadoBusqueda = {
  candidatos: Candidato[];
  aviso?: string; // solo si se devuelve el catálogo entero por un fallo
};

const MAX_CARACTERES = 1000;
const TIMEOUT_MS = 3000;

const candidato = ({ id, titulo, tipo, organismo, administracion }: Entrada, similitud: number | null): Candidato => ({
  id, titulo, tipo, organismo, administracion, similitud,
});

export async function buscarTramites(
  frase: string,
  { limite, signal }: { limite?: number; signal?: AbortSignal } = {},
): Promise<ResultadoBusqueda> {
  const texto = minimizar(frase.trim().slice(0, MAX_CARACTERES));
  if (!texto) return { candidatos: [] };
  const plazo = AbortSignal.timeout(TIMEOUT_MS);
  try {
    const coincidencias = await buscar(texto, {
      limite,
      signal: signal ? AbortSignal.any([signal, plazo]) : plazo,
    });
    const entradas = await Promise.all(coincidencias.map((c) => catalogo.obtener(c.id)));
    return {
      candidatos: coincidencias.flatMap((c, i) => (entradas[i] ? [candidato(entradas[i], c.similitud)] : [])),
    };
  } catch {
    if (signal?.aborted) throw signal.reason; // cancela quien llama: no degradar
    const todas = await catalogo.listar();
    return {
      candidatos: todas.map((e) => candidato(e, null)),
      aviso: "El buscador no responde: se devuelve el catálogo completo sin ordenar.",
    };
  }
}

// Formato `tools` de la API de OpenAI (HelmCode lo acepta).
export const definicion = {
  type: "function",
  function: {
    name: "buscar_tramites",
    description:
      "Busca en el catálogo de Brújula (trámites y ayudas para quien vive en València) los más parecidos a lo que necesita el ciudadano. Devuelve id, título, tipo, organismo, administración y similitud (coseno, de -1 a 1; cuanto más alta, más parecido), de más a menos parecido. Si el buscador falla, devuelve el catálogo entero sin ordenar, con similitud null y un campo aviso: elige tú entre todos. Llámala una vez por mensaje del ciudadano, antes de hablar de un trámite concreto.",
    parameters: {
      type: "object",
      properties: {
        consulta: {
          type: "string",
          description: "Lo que necesita el ciudadano, con sus palabras, en castellano o valenciano.",
        },
        limite: {
          type: "integer",
          minimum: 1,
          maximum: TOTAL,
          description: `Cuántos trámites devolver. Por defecto, ${LIMITE_POR_DEFECTO}.`,
        },
      },
      required: ["consulta"],
      additionalProperties: false,
    },
  },
} as const;

// Lo que trae `choices[0].message.tool_calls[i]` en la API de OpenAI.
export type LlamadaHerramienta = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

// Ejecuta una llamada del modelo y devuelve el mensaje que se le contesta.
// Los errores de argumentos van en el contenido para que el modelo corrija;
// solo la cancelación de quien llama lanza.
export async function responder(llamada: LlamadaHerramienta, signal?: AbortSignal) {
  const contenido = await ejecutar(llamada.function.arguments, signal).catch((e) => {
    if (signal?.aborted) throw e;
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  });
  return { role: "tool" as const, tool_call_id: llamada.id, content: JSON.stringify(contenido) };
}

// `argumentos` es el JSON (texto) de `function.arguments`.
export async function ejecutar(argumentos: string, signal?: AbortSignal): Promise<ResultadoBusqueda> {
  let args: { consulta?: unknown; limite?: unknown };
  try {
    args = JSON.parse(argumentos) ?? {};
  } catch {
    throw new Error("buscar_tramites: los argumentos no son JSON");
  }
  if (typeof args.consulta !== "string" || !args.consulta.trim())
    throw new Error("buscar_tramites: falta «consulta»");
  const limite = Number.isInteger(args.limite) ? (args.limite as number) : undefined;
  return buscarTramites(args.consulta, { limite, signal });
}
