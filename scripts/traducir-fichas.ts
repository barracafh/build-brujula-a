// Paso 1 de docs/plan-fichas-valenciano.md: traduce al valenciano los 8 campos
// traducibles de cada ficha del catálogo, con el LLM de HelmCode.
//   HELMCODE_MODEL=deepseek-v4-flash bun --preload ./scripts/sin-server-only.ts --env-file=.env.local scripts/traducir-fichas.ts
// Lo traducido se guarda en caché (por id y huella): relanzarlo solo traduce lo que falte.
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { CAMPOS_TRADUCIBLES, type Entrada, type Traduccion } from "../src/lib/entrada";
import { catalogo } from "../src/lib/fuente-catalogo";
import { completar } from "../src/lib/ia";
import { campos, huella, validarTraduccion } from "../src/lib/traduccion";
import { PAUSA_IA_MS, escribirJson, esperar, extraerJson, leerJson } from "./indexado/comun";

const DIR = ".cache/fichas-va";
const RUTA_CACHE = `${DIR}/cache.json`;
const RUTA_SALIDA = "src/datos/catalogo-va.json";
const LOTE = 3;

const PROMPT = `Tradueixes al valencià fitxes de tràmits per a la versió en valencià d'una web pública: traducció fidel i formal.
- Valencià normatiu de l'AVL amb formes valencianes (presentar, sol·licitud, este, eixir).
- No traduïsques sigles, noms de lleis ni noms propis d'organismes que no tinguen nom oficial en valencià. «Valencia» → «València».
- Copia exactament xifres, imports, dates, terminis, telèfons, adreces web i codis de procediment.
- No afegisques ni lleves informació. Mantín el nombre d'elements de cada llista i el seu ordre.
- Si un camp és null, torna null.
Respon NOMÉS amb un objecte JSON {"<id>": {"titulo", "organismo", "administracion", "requisitos_clave", "pasos", "documentacion", "plazo", "nota"}}.`;

type Cache = Record<string, { huella: string; va: Traduccion }>;

const cache: Cache = existsSync(RUTA_CACHE) ? await leerJson<Cache>(RUTA_CACHE) : {};
await mkdir(DIR, { recursive: true });

const entradas = await catalogo.listar();
const problemas: Record<string, string[]> = {};
const enCache = (e: Entrada) => cache[e.id]?.huella === huella(campos(e));
const pendientes = entradas.filter((e) => !enCache(e));
console.log(`${entradas.length} fichas, ${entradas.length - pendientes.length} en caché, ${pendientes.length} por traducir`);

for (let i = 0; i < pendientes.length; i += LOTE) {
  const lote = pendientes.slice(i, i + LOTE);
  const entrada = Object.fromEntries(lote.map((e) => [e.id, campos(e)]));
  for (let intento = 0; intento < 2; intento++) {
    if (i > 0 || intento > 0) await esperar(PAUSA_IA_MS);
    const t0 = performance.now();
    try {
      const salida = extraerJson<Record<string, unknown>>(
        await completar([
          { role: "system", content: PROMPT },
          { role: "user", content: JSON.stringify(entrada, null, 1) },
        ]),
      );
      const malas: string[] = [];
      for (const e of lote) {
        const p = validarTraduccion(campos(e), salida[e.id]);
        if (p.length) {
          problemas[e.id] = p;
          malas.push(e.id);
        } else {
          delete problemas[e.id];
          cache[e.id] = { huella: huella(campos(e)), va: campos(salida[e.id] as Traduccion) };
        }
      }
      await escribirJson(RUTA_CACHE, cache);
      console.log(`✓ lote ${i / LOTE + 1} en ${Math.round(performance.now() - t0)} ms${malas.length ? ` · no validan: ${malas.join(", ")}` : ""}`);
      if (!malas.length) break;
      // Solo se repiten las que no validaron.
      for (const e of lote) if (enCache(e)) delete entrada[e.id];
    } catch (err) {
      console.log(`✗ lote ${i / LOTE + 1}, intento ${intento + 1}: ${(err as Error).message}`);
    }
  }
}

const items: Record<string, Record<string, unknown>> = {};
for (const e of entradas) {
  if (!enCache(e)) continue;
  const va = cache[e.id].va;
  items[e.id] = { huella: cache[e.id].huella, ...Object.fromEntries(CAMPOS_TRADUCIBLES.map((c) => [c, va[c]])) };
}
await escribirJson(RUTA_SALIDA, {
  modelo: process.env.HELMCODE_MODEL,
  generado: new Date().toISOString(),
  revisado: false,
  items,
});

const fuera = entradas.filter((e) => !items[e.id]);
console.log(`\n${Object.keys(items).length} de ${entradas.length} fichas traducidas`);
for (const e of fuera) console.log(`  ✗ ${e.id}: ${(problemas[e.id] ?? ["sin respuesta"]).join("; ")}`);
