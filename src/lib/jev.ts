import { esId, tramites } from "./catalogo";
import type { Idioma } from "./tipos";

// Jev (TypeSafe System One): tres preguntas en una sola llamada. HTTP directo,
// sin SDK. Solo en el servidor.
const URL_JEV = "https://api.typesafe.ai/v1/systemone";
const TIMEOUT_MS = 3000;

export type RespuestaJev = {
  probabilidades: [string, number][]; // ids del catálogo, de más a menos probable
  confianza: number; // 0–1
  encaja: number; // 0–1: ¿corresponde a algún trámite del catálogo?
  idioma: Idioma;
};

const criterios = Object.fromEntries(
  tramites.map((t) => [
    t.id,
    `${t.titulo} (${t.organismo}). Ejemplos: ${t.frases_usuario.join(" | ")}`,
  ]),
);

const instruccionesEncaja =
  "La persona (que puede escribir en castellano o en valenciano, de forma coloquial o con faltas) describe una situación o necesidad que se resuelve con alguno de estos trámites o ayudas: " +
  tramites.map((t) => t.titulo).join("; ");

export async function preguntarJev(frase: string): Promise<RespuestaJev> {
  const clave = process.env.JEV_API_KEY;
  if (!clave) throw new Error("Falta JEV_API_KEY");
  const body = JSON.stringify({
    model: "jev-latest",
    state: frase,
    questions: {
      tramite: {
        type: "choice",
        instructions:
          "¿Qué trámite o ayuda del catálogo necesita la persona que escribe esto?",
        criteria: criterios,
      },
      encaja: { type: "noul", instructions: instruccionesEncaja },
      idioma: {
        type: "choice",
        instructions: "¿En qué idioma está escrito el texto?",
        criteria: { es: "Castellano (español)", va: "Valenciano (catalán)" },
      },
    },
  });
  // Los 3 s cubren la operación entera, reintento incluido.
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  for (let intento = 0; ; intento++) {
    const res = await fetch(URL_JEV, {
      method: "POST",
      headers: {
        authorization: `Bearer ${clave}`,
        "content-type": "application/json",
      },
      body,
      signal,
    });
    // Un único reintento ante 429/529 (saturación).
    if ((res.status === 429 || res.status === 529) && intento < 1) {
      await new Promise((r) => setTimeout(r, 300));
      signal.throwIfAborted();
      continue;
    }
    if (!res.ok) throw new Error(`Jev respondió ${res.status}`);
    return parsearJev(await res.json());
  }
}

const prob = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;

// Valida la respuesta. Ante cualquier anomalía lanza un error y se usa el fallback.
export function parsearJev(data: unknown): RespuestaJev {
  const answers = (data as { answers?: Record<string, unknown> } | null)?.answers;
  const tramite = answers?.tramite as
    | { confidence?: unknown; probabilities?: unknown }
    | undefined;
  const encaja = (answers?.encaja as { noul?: unknown } | undefined)?.noul;
  const idioma = (answers?.idioma as { choice?: unknown } | undefined)?.choice;
  if (
    !tramite ||
    typeof tramite.probabilities !== "object" ||
    tramite.probabilities === null ||
    !prob(tramite.confidence) ||
    !prob(encaja)
  )
    throw new Error("Respuesta de Jev incompleta");
  const probabilidades = Object.entries(
    tramite.probabilities as Record<string, unknown>,
  )
    .filter((e): e is [string, number] => esId(e[0]) && prob(e[1]))
    .sort((a, b) => b[1] - a[1]);
  if (probabilidades.length < 2) throw new Error("Jev sin candidatos");
  return {
    probabilidades,
    confianza: tramite.confidence,
    encaja,
    idioma: idioma === "va" ? "va" : "es",
  };
}
