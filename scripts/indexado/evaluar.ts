// Evaluación (docs/index_specification.md, sección 5): top 1 y top 3 de cada
// variante con las preguntas ciegas de src/datos/pruebas-indice.json, con y sin
// instrucción delante de la pregunta. Escribe src/datos/vectores.json con la
// combinación ganadora.
//   bun scripts/indexado/evaluar.ts
import { ordenar } from "../../src/lib/similitud";
import {
  DIMENSIONES,
  DIR_CACHE,
  MODELO_EMBEDDINGS,
  RUTA_VARIANTES,
  embeber,
  escribirJson,
  leerJson,
  type Variantes,
} from "./comun";

type Prueba = { frase: string; esperado: string; idioma: "es" | "va" };
type Variante = "A" | "C" | "D";
type Item = Variantes["items"][number];

// Qwen3-Embedding recomienda una instrucción en inglés delante de cada consulta.
const INSTRUCCION =
  "Instruct: Given a citizen's question, retrieve the public administration procedure that answers it\nQuery: ";

// Orden de simplicidad: ante empate gana la primera.
const VARIANTES: Variante[] = ["A", "D", "C"];
const CONSULTAS = [
  { nombre: "sin instrucción", prefijo: "" },
  { nombre: "con instrucción", prefijo: INSTRUCCION },
];

const vectoresDe = (item: Item, v: Variante) => (v === "C" ? [item.A, ...item.frases] : [item[v]]);

const ranking = (consulta: number[], items: Item[], v: Variante) =>
  ordenar(consulta, items.map((item) => ({ id: item.id, vectores: vectoresDe(item, v) }))).map((r) => r.id);

const { items } = await leerJson<Variantes>(RUTA_VARIANTES);
const pruebas = await leerJson<Prueba[]>("src/datos/pruebas-indice.json");
const ids = new Set(items.map((i) => i.id));
const desconocidos = pruebas.filter((p) => !ids.has(p.esperado));
if (desconocidos.length) throw new Error(`Esperados sin trámite: ${desconocidos.map((p) => p.esperado).join(", ")}`);

// Las preguntas de las dos consultas en una sola tanda de lotes.
const vectores = await embeber(CONSULTAS.flatMap((c) => pruebas.map((p) => c.prefijo + p.frase)));

const resultados = CONSULTAS.flatMap((c, ic) =>
  VARIANTES.map((variante) => {
    const fallos: { frase: string; esperado: string; top3: string[] }[] = [];
    let top1 = 0;
    let top3 = 0;
    pruebas.forEach((p, ip) => {
      const orden = ranking(vectores[ic * pruebas.length + ip], items, variante).slice(0, 3);
      if (orden[0] === p.esperado) top1++;
      if (orden.includes(p.esperado)) top3++;
      else fallos.push({ frase: p.frase, esperado: p.esperado, top3: orden });
    });
    return { variante, consulta: c.nombre, prefijo: c.prefijo, top1, top3, fallos };
  }),
);

const total = pruebas.length;
const pct = (n: number) => `${Math.round((n / total) * 100)} %`;
console.log(`${total} preguntas, ${items.length} trámites\n`);
for (const r of resultados)
  console.log(`${r.variante} ${r.consulta.padEnd(16)} top1 ${pct(r.top1).padStart(5)}  top3 ${pct(r.top3).padStart(5)}`);

// Gana el mejor top 3, luego el mejor top 1; el resto de empates, la variante
// más simple y, dentro de ella, sin instrucción.
const ganador = [...resultados].sort(
  (a, b) =>
    b.top3 - a.top3 ||
    b.top1 - a.top1 ||
    VARIANTES.indexOf(a.variante) - VARIANTES.indexOf(b.variante) ||
    Number(Boolean(a.prefijo)) - Number(Boolean(b.prefijo)),
)[0];
console.log(`\nGana ${ganador.variante} ${ganador.consulta}`);

await escribirJson(`${DIR_CACHE}/evaluacion.json`, {
  preguntas: total,
  resultados: resultados.map(({ prefijo: _, ...r }) => r),
});
await escribirJson("src/datos/vectores.json", {
  modelo: MODELO_EMBEDDINGS,
  dimensiones: DIMENSIONES,
  variante: ganador.variante,
  instruccion_consulta: ganador.prefijo || null,
  generado: new Date().toISOString(),
  items: items.map((item) => ({ id: item.id, origen: item.origen, vectores: vectoresDe(item, ganador.variante) })),
});
