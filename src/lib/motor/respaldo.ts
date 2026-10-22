// Segunda capa del guardarraíl del chat (ticket 04, comentario del
// 22/10/2026): cada cifra y cada enlace del texto tienen que aparecer tal cual
// en el material oficial que tuvo delante el modelo (lo que devolvieron sus
// herramientas). Devuelve los que no aparecen; si la lista no está vacía, el
// texto se descarta.

const URL = /https?:\/\/[^\s<>"'()[\]]+/gi;
const CIFRA = /\d+(?:[.,]\d+)*/g;

function urls(texto: string): string[] {
  return (texto.match(URL) ?? []).map((u) => u.replace(/[.,;:!?]+$/, ""));
}

// Forma única de una cifra, sin ambigüedad: el punto de miles se quita solo
// si agrupa de 3 en 3 («1.200» = «1200», pero «1,2» no), y la coma decimal
// pasa a punto («7,5» = «7.5», pero no «75»).
function normalizar(cifra: string): string {
  const c = cifra.replace(/[.,]+$/, "");
  if (/^\d{1,3}(\.\d{3})+$/.test(c)) return c.replace(/\./g, "");
  return c.replace(",", ".");
}

export function sinRespaldo(texto: string, material: string): string[] {
  const faltan: string[] = [];

  const enlaces = new Set(urls(material));
  for (const url of urls(texto)) if (!enlaces.has(url)) faltan.push(url);

  const cifras = new Set(
    (material.replace(URL, " ").match(CIFRA) ?? []).map(normalizar),
  );
  for (const cifra of texto.replace(URL, " ").match(CIFRA) ?? []) {
    const n = normalizar(cifra);
    if (!cifras.has(n)) faltan.push(n);
  }

  return faltan;
}
