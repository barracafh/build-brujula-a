// Similitud entre un vector de consulta y los vectores de un trámite. Los
// vectores están normalizados: el producto escalar es el coseno. Lo usan
// scripts/indexado/evaluar.ts y src/lib/buscador.ts: mismo cálculo en la
// evaluación y en la app.

export function producto(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// La mejor entre los vectores del trámite (la variante C tiene varios; la D, uno).
export const similitud = (consulta: number[], vectores: number[][]) =>
  Math.max(...vectores.map((v) => producto(consulta, v)));

// De más a menos parecido, con la precisión completa. Ante empate, el orden
// de entrada (sort es estable), igual que en la evaluación.
export function ordenar<T extends { vectores: number[][] }>(
  consulta: number[],
  items: T[],
): (T & { puntos: number })[] {
  return items
    .map((item) => ({ ...item, puntos: similitud(consulta, item.vectores) }))
    .sort((a, b) => b.puntos - a.puntos);
}
