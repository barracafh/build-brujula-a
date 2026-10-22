// [5] Embeddings de las tres variantes (A, C y D) para los 37 trámites. El
// resultado va a la caché; evaluar.ts elige la variante y escribe vectores.json.
//   bun scripts/indexado/embeber.ts
import { tramites as catalogoOrg, type Tramite } from "../../src/lib/catalogo";
import {
  RUTA_CATALOGO_VALENCIA,
  RUTA_RESUMENES,
  RUTA_VARIANTES,
  embeber,
  escribirJson,
  leerJson,
  type Variantes,
} from "./comun";

const textoA = (t: Tramite) => [t.titulo, ...t.requisitos_clave, ...t.documentacion].join("\n");

const valencia = (await leerJson<{ items: Tramite[] }>(RUTA_CATALOGO_VALENCIA)).items;
const resumenes = await leerJson<Record<string, string>>(RUTA_RESUMENES);
const todos = [
  ...catalogoOrg.map((t) => ({ t, origen: "organizacion" as const })),
  ...valencia.map((t) => ({ t, origen: "valencia" as const })),
];

// D sin resumen sería igual que A: mejor fallar y relanzar estructurar.ts.
const sinResumen = todos.filter(({ t }) => !resumenes[t.id]).map(({ t }) => t.id);
if (sinResumen.length) throw new Error(`Faltan resúmenes: ${sinResumen.join(", ")}`);

// Una sola lista de textos para aprovechar los lotes de 32.
const textos = todos.flatMap(({ t }) => [textoA(t), `${resumenes[t.id]}\n${textoA(t)}`, ...t.frases_usuario]);
const vectores = await embeber(textos);

let i = 0;
const items = todos.map(({ t, origen }) => ({
  id: t.id,
  origen,
  A: vectores[i++],
  D: vectores[i++],
  frases: t.frases_usuario.map(() => vectores[i++]),
}));

await escribirJson(RUTA_VARIANTES, { generado: new Date().toISOString(), items } satisfies Variantes);
console.log(`${items.length} trámites, ${textos.length} textos → ${RUTA_VARIANTES}`);
