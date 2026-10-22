// Prueba del buscador y de la herramienta con la API real (7 llamadas).
//   bun run probar:buscador
import { readFileSync } from "node:fs";
import { mejores, textoConsulta } from "../src/lib/buscador";
import { embeber } from "../src/lib/embeddings";
import { buscarTramites, responder } from "../src/lib/herramientas/buscar-tramites";

let fallos = 0;
function comprobar(nombre: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${nombre}`);
  if (!ok) fallos++;
}

type Prueba = { frase: string; esperado: string; idioma: string };
const pruebas: Prueba[] = JSON.parse(
  readFileSync(new URL("../src/datos/pruebas-indice.json", import.meta.url), "utf8"),
);

// 1. Precisión: una sola llamada a embeddings con las 40 frases.
const vectores = await embeber(pruebas.map((p) => textoConsulta(p.frase)));
let top1 = 0;
let top3 = 0;
let top10 = 0;
const falloTop3: string[] = [];
pruebas.forEach((p, i) => {
  const ids = mejores(vectores[i], 10).map((c) => c.id);
  const pos = ids.indexOf(p.esperado);
  if (pos === 0) top1++;
  if (pos >= 0 && pos < 3) top3++;
  else falloTop3.push(`«${p.frase}» esperado ${p.esperado}, top 3: ${ids.slice(0, 3).join(", ")}`);
  if (pos >= 0) top10++;
});
const pct = (n: number) => (100 * n) / pruebas.length;
console.log(`Precisión (${pruebas.length} frases): top 1 ${pct(top1).toFixed(1)} %, top 3 ${pct(top3).toFixed(1)} %, top 10 ${pct(top10).toFixed(1)} %`);
for (const f of falloTop3) console.log(`  fuera del top 3: ${f}`);
comprobar("top 10 = 100 %", top10 === pruebas.length);
comprobar("top 3 ≥ 95 %", pct(top3) >= 95);

// 2. Velocidad: 5 llamadas seguidas, 1 s entre ellas.
const frases = [
  "me han echado del trabajo",
  "quiero votar por correo",
  "me ha llegado una multa de tráfico",
  "necesito el certificado de empadronamiento",
  "ayudas para pagar el alquiler siendo joven",
];
const tiempos: number[] = [];
let avisos = 0;
for (const frase of frases) {
  const t0 = performance.now();
  const r = await buscarTramites(frase);
  tiempos.push(Math.round(performance.now() - t0));
  if (r.aviso) avisos++;
  await new Promise((ok) => setTimeout(ok, 1000));
}
const mediana = [...tiempos].sort((a, b) => a - b)[Math.floor(tiempos.length / 2)];
console.log(`Latencias: ${tiempos.join(" ms, ")} ms · mediana ${mediana} ms`);
comprobar("mediana < 1.000 ms", mediana < 1000);
comprobar("ninguna búsqueda degradó (sin aviso)", avisos === 0);

// 3. Herramienta.
const llamada = (args: string) => ({
  id: "t1",
  type: "function" as const,
  function: { name: "buscar_tramites", arguments: args },
});
const ok = await responder(llamada('{"consulta":"quiero votar por correo","limite":3}'));
const cuerpo = JSON.parse(ok.content) as { candidatos?: { id: string }[] };
comprobar(
  "responder: mensaje tool con 3 candidatos y voto-por-correo",
  ok.role === "tool" &&
    ok.tool_call_id === "t1" &&
    cuerpo.candidatos?.length === 3 &&
    cuerpo.candidatos.some((c) => c.id === "voto-por-correo"),
);
const malo = await responder(llamada("no es json"));
comprobar("responder: JSON inválido → error en el contenido", "error" in JSON.parse(malo.content));
const vacio = await responder(llamada("{}"));
comprobar("responder: {} → error en el contenido", "error" in JSON.parse(vacio.content));
const sinFrase = await buscarTramites("");
comprobar("buscarTramites(''): sin candidatos", sinFrase.candidatos.length === 0 && !sinFrase.aviso);

const base = process.env.HELMCODE_BASE_URL;
process.env.HELMCODE_BASE_URL = "http://127.0.0.1:9";
try {
  const caido = await buscarTramites("multa");
  comprobar(
    "embeddings caído: 37 candidatos sin similitud y con aviso",
    caido.candidatos.length === 37 && caido.candidatos.every((c) => c.similitud === null) && !!caido.aviso,
  );
} finally {
  if (base === undefined) delete process.env.HELMCODE_BASE_URL;
  else process.env.HELMCODE_BASE_URL = base;
}

let lanzo = false;
try {
  await buscarTramites("multa", { signal: AbortSignal.abort() });
} catch {
  lanzo = true;
}
comprobar("señal cancelada: lanza", lanzo);

console.log(fallos ? `\n${fallos} fallos` : "\nTodo bien");
if (fallos) process.exitCode = 1;
