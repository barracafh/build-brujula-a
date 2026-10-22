// Piezas compartidas por los scripts de indexación (docs/index_specification.md).
export const DIR_CACHE = ".cache/indexado";
export const DIR_SEDE = `${DIR_CACHE}/sede`;
export const DIR_FICHAS = `${DIR_CACHE}/fichas`;

// Lo que guarda la captura [1]: el texto visible de la ficha, sin tocar.
// `archivo` es el código de la URL; `codigo`, el que imprime la ficha (los
// enlaces WEB_ASSET_* del registro de entidades llevan dentro su PC.AE.*).
export type Captura = {
  archivo: string;
  codigo: string;
  url_final: string;
  consultado: string;
  titulo: string;
  texto: string;
  enlaces: { texto: string; url: string }[];
};

// Formato del .txt: cabecera, `---`, texto visible, `---`, `ENLACES:` y una
// línea `texto -> url` por enlace.
export async function leerCaptura(archivo: string): Promise<Captura> {
  const crudo = await Bun.file(`${DIR_SEDE}/${archivo}.txt`).text();
  const [cabecera, texto, pie = ""] = crudo.split(/^---$/m).map((p) => p.trim());
  const campo = (nombre: string) => cabecera.match(new RegExp(`^${nombre}: (.+)$`, "m"))?.[1].trim() ?? "";
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const enlaces = pie
    .split("\n")
    .slice(1)
    .map((l) => l.match(/^(.*) -> (\S+)$/))
    .filter((m) => m !== null)
    .map(([, t, url]) => ({ texto: t.trim(), url }));
  return {
    archivo,
    codigo: lineas.find((l) => /^[A-Z]{2}\.[A-Z]{2}\.\d+$/.test(l)) ?? archivo,
    url_final: campo("URL_FINAL"),
    consultado: campo("CONSULTADO"),
    titulo: lineas[0],
    texto,
    enlaces,
  };
}

// Los 16 archivos capturados, en el orden de src/datos/fuentes-valencia.json.
export async function archivosCapturados(): Promise<string[]> {
  const fuentes: { items: { url: string }[] } = await Bun.file("src/datos/fuentes-valencia.json").json();
  const archivos = fuentes.items.map((f) => new URL(f.url).pathname.split("/").pop()!);
  const existe = await Promise.all(archivos.map((a) => Bun.file(`${DIR_SEDE}/${a}.txt`).exists()));
  return archivos.filter((_, i) => existe[i]);
}

// El LLM a veces envuelve el JSON en ```json o lo precede de <think>.
export function extraerJson<T>(respuesta: string): T {
  const limpio = respuesta.replace(/<think>[\s\S]*?<\/think>/g, "");
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio < 0 || fin < inicio) throw new Error("La respuesta no trae JSON");
  return JSON.parse(limpio.slice(inicio, fin + 1)) as T;
}

// Cifras de un texto («3 meses», «5,00 €», «65%»), para comprobar que el LLM
// no ha inventado ninguna. Se comparan sin separadores de miles ni decimales cero.
export const cifras = (texto: string): string[] =>
  (texto.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/[.,]00$/, "").replace(/[.,]/g, ""));

export function cifrasInventadas(salida: string, fuente: string): string[] {
  const validas = new Set(cifras(fuente));
  return cifras(salida).filter((c) => !validas.has(c));
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Pausa entre llamadas a HelmCode: la clave es compartida por todos los equipos.
export const PAUSA_IA_MS = 3000;

const MODELO_EMBEDDINGS = "qwen3-embedding";
export const DIMENSIONES = 1536;
const LOTE = 32;

// Embeddings en lotes de 32, normalizados a longitud 1 y con 5 decimales.
export async function embeber(textos: string[]): Promise<number[][]> {
  const { HELMCODE_API_KEY, HELMCODE_BASE_URL } = process.env;
  if (!HELMCODE_API_KEY) throw new Error("Falta HELMCODE_API_KEY en .env.local");
  const vectores: number[][] = [];
  for (let i = 0; i < textos.length; i += LOTE) {
    if (i > 0) await esperar(PAUSA_IA_MS);
    const res = await fetch(`${HELMCODE_BASE_URL ?? "https://api.helmcode.com/v1"}/embeddings`, {
      method: "POST",
      headers: { authorization: `Bearer ${HELMCODE_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODELO_EMBEDDINGS,
        input: textos.slice(i, i + LOTE),
        dimensions: DIMENSIONES,
      }),
    });
    if (!res.ok) throw new Error(`Embeddings: HelmCode respondió ${res.status}`);
    const data = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    for (const d of data.data.sort((a, b) => a.index - b.index)) vectores.push(normalizar(d.embedding));
  }
  return vectores;
}

function normalizar(v: number[]): number[] {
  const corto = v.slice(0, DIMENSIONES);
  const norma = Math.hypot(...corto) || 1;
  return corto.map((x) => Math.round((x / norma) * 1e5) / 1e5);
}
