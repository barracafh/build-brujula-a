import {
  CAMPOS_TRADUCIBLES,
  type Entrada,
  type EntradaConTraduccion,
  type Traduccion,
} from "./entrada";

// Traducción automática de las fichas al valenciano (docs/plan-fichas-valenciano.md).
// Sin server-only: lo usan la interfaz, el servidor y los scripts.

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

// Solo los campos traducibles: lo demás (id, URLs, verificado) nunca sale de
// una traducción.
export const campos = (e: Traduccion): Traduccion =>
  Object.fromEntries(CAMPOS_TRADUCIBLES.map((c) => [c, e[c]])) as Traduccion;

// FNV-1a de 32 bits del castellano: si el catálogo cambia, la traducción vieja
// deja de coincidir y se muestra el castellano.
export function huella(es: Traduccion): string {
  let h = 0x811c9dc5;
  for (const ch of JSON.stringify(campos(es))) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const MESES_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_VA = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"];

// Números de mes que aparecen, ordenados («marzo» → 3).
function meses(texto: string, nombres: string[]) {
  const palabras = texto.toLowerCase().match(/\p{L}+/gu) ?? [];
  return palabras.flatMap((p) => (nombres.includes(p) ? [nombres.indexOf(p) + 1] : [])).sort((a, b) => a - b);
}

const tiposDia = (texto: string, habil: RegExp, natural: RegExp) =>
  `${habil.test(texto) ? "h" : ""}${natural.test(texto) ? "n" : ""}`;

const urls = (t: string) => [...new Set(t.match(/https?:\/\/[^\s)»"]+/g) ?? [])].sort();
const codigos = (t: string) => [...new Set(t.match(/\b[A-Z]{2}\.[A-Z]{2}\.\d+\b/g) ?? [])].sort();
const igual = (a: unknown[], b: unknown[]) => JSON.stringify(a) === JSON.stringify(b);

// Un texto castellano frente a su traducción. Devuelve los problemas.
function compararTexto(donde: string, es: string, va: string): string[] {
  const p: string[] = [];
  if (!va.trim()) return [`${donde}: vacío`];
  if (!igual([...cifras(es)].sort(), [...cifras(va)].sort())) p.push(`${donde}: cifras distintas`);
  if (!igual(meses(es, MESES_ES), meses(va, MESES_VA))) p.push(`${donde}: meses distintos`);
  if (tiposDia(es, /h[áa]bil/i, /natural/i) !== tiposDia(va, /h[àa]bil/i, /natural/i))
    p.push(`${donde}: días hábiles/naturales distintos`);
  if (!igual(urls(es), urls(va))) p.push(`${donde}: URLs distintas`);
  if (!igual(codigos(es), codigos(va))) p.push(`${donde}: códigos distintos`);
  return p;
}

// Lista vacía = válida. Campo a campo y, en las listas, elemento a elemento.
export function validarTraduccion(es: Traduccion, va: unknown): string[] {
  if (!va || typeof va !== "object" || Array.isArray(va)) return ["no es un objeto"];
  const t = va as Record<string, unknown>;
  const p: string[] = [];
  const claves = Object.keys(t);
  const sobran = claves.filter((c) => !(CAMPOS_TRADUCIBLES as readonly string[]).includes(c));
  const faltan = CAMPOS_TRADUCIBLES.filter((c) => !(c in t));
  if (sobran.length) p.push(`claves de más: ${sobran.join(", ")}`);
  if (faltan.length) p.push(`faltan: ${faltan.join(", ")}`);
  for (const c of CAMPOS_TRADUCIBLES) {
    if (!(c in t)) continue;
    const o = es[c];
    const v = t[c];
    if (Array.isArray(o)) {
      if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) p.push(`${c}: no es una lista de textos`);
      else if (v.length !== o.length) p.push(`${c}: ${v.length} elementos en lugar de ${o.length}`);
      else o.forEach((x, i) => p.push(...compararTexto(`${c}[${i}]`, x, v[i] as string)));
    } else if (o === null) {
      if (v !== null) p.push(`${c}: debería ser null`);
    } else if (typeof v !== "string") p.push(`${c}: no es un texto`);
    else p.push(...compararTexto(c, o, v));
  }
  return p;
}

// La versión que se muestra. Solo en valenciano y si hay traducción.
export function enIdioma(
  e: EntradaConTraduccion,
  idioma: "es" | "va",
): { entrada: Entrada; traducida: boolean } {
  const { va, ...original } = e;
  if (idioma !== "va" || !va) return { entrada: original, traducida: false };
  return { entrada: { ...original, ...campos(va) }, traducida: true };
}
