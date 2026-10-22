// Embeddings de HelmCode (API compatible con OpenAI). Lo usan la app y los
// scripts de indexado. Solo en el servidor: la clave sale de process.env.
export const MODELO_EMBEDDINGS = "qwen3-embedding";
export const DIMENSIONES = 1536;

// Una sola petición, sin reintentos. Devuelve un vector por texto, en el mismo
// orden, normalizado a longitud 1 y redondeado a 5 decimales. Lanza si la
// respuesta no trae exactamente un vector válido por texto.
export async function embeber(
  textos: string[],
  { signal }: { signal?: AbortSignal } = {},
): Promise<number[][]> {
  const { HELMCODE_API_KEY, HELMCODE_BASE_URL } = process.env;
  if (!HELMCODE_API_KEY) throw new Error("Falta HELMCODE_API_KEY en .env.local");
  const res = await fetch(`${HELMCODE_BASE_URL ?? "https://api.helmcode.com/v1"}/embeddings`, {
    method: "POST",
    headers: { authorization: `Bearer ${HELMCODE_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODELO_EMBEDDINGS, input: textos, dimensions: DIMENSIONES }),
    signal,
  });
  if (!res.ok) throw new Error(`Embeddings: HelmCode respondió ${res.status}`);
  const { data } = (await res.json()) as { data?: { index: number; embedding: number[] }[] };
  const vectores: number[][] = [];
  for (const d of data ?? []) vectores[d.index] = d.embedding;
  if (data?.length !== textos.length || textos.some((_, i) => !valido(vectores[i])))
    throw new Error("Embeddings: respuesta inválida");
  return vectores.map(normalizar);
}

const valido = (v: unknown): v is number[] =>
  Array.isArray(v) &&
  v.length >= DIMENSIONES &&
  v.every(Number.isFinite) &&
  v.some((x) => x !== 0);

function normalizar(v: number[]): number[] {
  const corto = v.slice(0, DIMENSIONES);
  const norma = Math.hypot(...corto);
  return corto.map((x) => Math.round((x / norma) * 1e5) / 1e5);
}
