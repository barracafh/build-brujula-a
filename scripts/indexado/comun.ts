// Piezas compartidas por los scripts de indexación (docs/index_specification.md).
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { DIMENSIONES, MODELO_EMBEDDINGS, embeber as embeberLote } from "../../src/lib/embeddings";

export const DIR_CACHE = ".cache/indexado";
export const DIR_SEDE = `${DIR_CACHE}/sede`;
export const DIR_FICHAS = `${DIR_CACHE}/fichas`;
export const RUTA_CATALOGO_VALENCIA = "src/datos/catalogo-valencia.json";
// resumen_sencillo de los 37 trámites (los 21 de la organización y los 16 de
// València). Solo sirve para el embedding de la variante D; nunca se muestra.
export const RUTA_RESUMENES = "src/datos/resumenes.json";

// Vectores de las tres variantes, de embeber.ts a evaluar.ts.
export const RUTA_VARIANTES = `${DIR_CACHE}/variantes.json`;
export type Variantes = {
  generado: string;
  items: { id: string; origen: "organizacion" | "valencia"; A: number[]; D: number[]; frases: number[][] }[];
};

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
  const crudo = await readFile(`${DIR_SEDE}/${archivo}.txt`, "utf8");
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
  const fuentes = await leerJson<{ items: { url: string }[] }>("src/datos/fuentes-valencia.json");
  return fuentes.items
    .map((f) => new URL(f.url).pathname.split("/").pop()!)
    .filter((a) => existsSync(`${DIR_SEDE}/${a}.txt`));
}

export const leerJson = async <T>(ruta: string): Promise<T> => JSON.parse(await readFile(ruta, "utf8"));

export const escribirJson = (ruta: string, valor: unknown) => writeFile(ruta, JSON.stringify(valor, null, 2) + "\n");

// El LLM a veces envuelve el JSON en ```json o lo precede de <think>.
export function extraerJson<T>(respuesta: string): T {
  const limpio = respuesta.replace(/<think>[\s\S]*?<\/think>/g, "");
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio < 0 || fin < inicio) throw new Error("La respuesta no trae JSON");
  return JSON.parse(limpio.slice(inicio, fin + 1)) as T;
}

// Cifras de un texto («3 meses», «5,00 €», «65%»), para comprobar que el LLM
// no ha inventado ninguna. Se comparan sin separadores de miles ni decimales cero
// y con coma decimal: «6.010,12» y «6010,12» son la misma; «1,50» y «150», no.
export const cifras = (texto: string): string[] =>
  (texto.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) =>
    n
      .replace(/[.,]00$/, "")
      .replace(/[.,](?=\d{3}(?:[.,]|$))/g, "")
      .replace(".", ","),
  );

export function cifrasInventadas(salida: string, fuente: string): string[] {
  const validas = new Set(cifras(fuente));
  return cifras(salida).filter((c) => !validas.has(c));
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Pausa entre llamadas a HelmCode: la clave es compartida por todos los equipos.
export const PAUSA_IA_MS = 3000;

export { DIMENSIONES, MODELO_EMBEDDINGS };

const LOTE = 32;

// Embeddings en lotes de 32 con pausa entre ellos.
export async function embeber(textos: string[]): Promise<number[][]> {
  const vectores: number[][] = [];
  for (let i = 0; i < textos.length; i += LOTE) {
    if (i > 0) await esperar(PAUSA_IA_MS);
    vectores.push(...(await embeberLote(textos.slice(i, i + LOTE))));
  }
  return vectores;
}
