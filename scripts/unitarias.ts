import { readFileSync } from "node:fs";
import { parsearJev } from "../src/lib/jev";
import { LIMITE_POR_DEFECTO, TOTAL, mejores } from "../src/lib/buscador";
import { DIMENSIONES } from "../src/lib/embeddings";
import { ordenar } from "../src/lib/similitud";
import {
  decidirJev,
  detectarIdioma,
  parsearLLM,
  porPalabras,
} from "../src/lib/clasificar";

let fallos = 0;
function comprobar(nombre: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${nombre}`);
  if (!ok) fallos++;
}
function lanza(f: () => unknown) {
  try {
    f();
    return false;
  } catch {
    return true;
  }
}

const jevBase = (probs: Record<string, number>, confidence: number, noul: number) => ({
  answers: {
    tramite: { type: "choice", choice: "x", confidence, probabilities: probs },
    encaja: { type: "noul", noul },
    idioma: { type: "choice", choice: "es", confidence: 1, probabilities: {} },
  },
});

// Jev: validación
comprobar("Jev sin probabilidades lanza", lanza(() => parsearJev(jevBase({}, 1, 0.9))));
comprobar("Jev con un solo candidato lanza", lanza(() => parsearJev(jevBase({ "voto-por-correo": 1 }, 1, 0.9))));
comprobar("Jev con confianza fuera de rango lanza", lanza(() => parsearJev(jevBase({ "voto-por-correo": 0.9, "multa-dgt": 0.1 }, 7, 0.9))));
comprobar("Jev null lanza", lanza(() => parsearJev(null)));
comprobar("Jev ignora ids inventados", lanza(() => parsearJev(jevBase({ inventado: 0.9, "multa-dgt": 0.1 }, 0.9, 0.9))));

// Jev: umbrales
const alta = parsearJev(jevBase({ "voto-por-correo": 0.95, "multa-dgt": 0.05 }, 0.95, 0.9));
const r1 = decidirJev(alta);
comprobar("Confianza alta → respuesta", r1?.caso === "respuesta" && r1.id === "voto-por-correo");
const fuera = parsearJev(jevBase({ "renovacion-dni": 0.8, "multa-dgt": 0.2 }, 0.81, 0.16));
comprobar("Encaja bajo → fuera (pasaporte)", decidirJev(fuera)?.caso === "fuera");
const media = parsearJev(jevBase({ "complemento-ayuda-infancia": 0.67, "ingreso-minimo-vital": 0.32, "multa-dgt": 0.01 }, 0.65, 0.8));
const r3 = decidirJev(media);
comprobar("Confianza media → desambiguar con 2", r3?.caso === "desambiguar" && r3.opciones.length === 2);
const baja = parsearJev(jevBase({ "multa-dgt": 0.2, "vida-laboral": 0.15 }, 0.2, 0.7));
comprobar("Confianza baja → null (pasa al LLM)", decidirJev(baja) === null);

// LLM: parseo
const l1 = parsearLLM('```json\n{"id":"multa-dgt","alternativas":[],"idioma":"es"}\n```');
comprobar("LLM con bloque de código → respuesta", l1.caso === "respuesta" && l1.id === "multa-dgt");
comprobar("LLM id inventado → fuera", parsearLLM('{"id":"pasaporte","alternativas":[]}').caso === "fuera");
const l3 = parsearLLM('{"id":null,"alternativas":["vida-laboral"]}');
comprobar("LLM una alternativa → desambiguar, no respuesta", l3.caso === "desambiguar");
comprobar("LLM sin JSON lanza", lanza(() => parsearLLM("no sé")));
comprobar("LLM idioma va", parsearLLM('{"id":null,"alternativas":[],"idioma":"va"}').idioma === "va");

// Palabras
comprobar("«quiero montar una empresa» → fuera", porPalabras("quiero montar una empresa").caso === "fuera");
comprobar("«hola» → fuera", porPalabras("hola").caso === "fuera");
const p1 = porPalabras("quiero cobrar el paro");
comprobar("«quiero cobrar el paro» → prestación", p1.caso !== "fuera");

// Idioma
for (const [f, i] of [
  ["els llibres de text del institut", "va"],
  ["m'he mudat a un pis nou a Benimaclet", "va"],
  ["m'han acomiadat", "va"],
  ["vull demanar cita amb el metge", "va"],
  ["el menjador del col·legi del meu fill és molt car", "va"],
  ["me han echado del trabajo", "es"],
  ["no llego a fin de mes y tengo dos críos", "es"],
  ["quiero votar por correo", "es"],
  ["la casa de mi madre", "es"],
] as const)
  comprobar(`idioma «${f}» → ${i}`, detectarIdioma(f) === i);

// Buscador (sin red)
const leer = (ruta: string) => JSON.parse(readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8"));
const indice = leer("src/datos/vectores.json") as {
  dimensiones: number;
  items: { id: string; vectores: number[][] }[];
};
const normaOk = (v: number[]) => {
  const n = Math.hypot(...v);
  return v.length === DIMENSIONES && n > 0.999 && n < 1.001;
};
comprobar(
  "vectores.json: dimensiones y normas",
  indice.dimensiones === DIMENSIONES && indice.items.every((i) => i.vectores.every(normaOk)),
);
const idsIndice = indice.items.map((i) => i.id);
const idsCatalogo = [
  ...leer("datos/catalogo-tramites-ayudas.json").items,
  ...leer("src/datos/catalogo-valencia.json").items,
].map((i: { id: string }) => i.id);
comprobar(
  "ids de vectores.json = ids de los catálogos, sin repetidos",
  new Set(idsIndice).size === idsIndice.length &&
    new Set(idsCatalogo).size === idsCatalogo.length &&
    idsIndice.length === idsCatalogo.length &&
    idsIndice.every((id) => idsCatalogo.includes(id)),
);
const vectorDe = (id: string) => indice.items.find((i) => i.id === id)!.vectores[0];
const vMulta = vectorDe("multa-dgt");
const top = mejores(vMulta);
comprobar("mejores(vector de multa-dgt)[0] es multa-dgt con similitud ≈ 1", top[0].id === "multa-dgt" && Math.abs(top[0].similitud - 1) < 0.001);
comprobar("mejores: límite por defecto", top.length === LIMITE_POR_DEFECTO && LIMITE_POR_DEFECTO === 10);
comprobar("mejores: límite 3", mejores(vMulta, 3).length === 3);
comprobar("mejores: límite 0 → por defecto", mejores(vMulta, 0).length === 10);
comprobar("mejores: límite -5 → 1", mejores(vMulta, -5).length === 1);
comprobar("mejores: límite 999 → todos", mejores(vMulta, 999).length === 37 && TOTAL === 37);
comprobar("mejores va de mayor a menor", top.every((c, i) => i === 0 || top[i - 1].similitud >= c.similitud));
const orden = ordenar([1, 0], [
  { id: "b", vectores: [[0.500001, 0]] },
  { id: "a", vectores: [[0.500004, 0]] },
]);
comprobar("ordenar no redondea antes de ordenar", orden[0].id === "a");
const t0 = performance.now();
for (let i = 0; i < 1000; i++) mejores(vMulta);
comprobar("mejores < 5 ms de media", (performance.now() - t0) / 1000 < 5);

console.log(fallos ? `\n${fallos} fallos` : "\nTodo bien");
if (fallos) process.exitCode = 1;
