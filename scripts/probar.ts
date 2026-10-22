import pruebas from "../src/datos/pruebas.json";
import { clasificar } from "../src/lib/clasificar";
import type { Motor } from "../src/lib/tipos";

// Puntuación: 1 por acierto (respuesta correcta o fuera cuando se esperaba null),
// 0,5 por desambiguar con el correcto entre las opciones.
const forzar = process.argv[2] as Motor | undefined;
const minimoDefecto = forzar === "palabras" ? 0 : forzar === "llm" ? 60 : 80;
const minimo = Number(process.argv[3] ?? minimoDefecto);
let puntos = 0;
let idiomaOk = 0;
let motorMal = 0;
const tiempos: number[] = [];
const lista = pruebas as {
  frase: string;
  esperado: string | string[] | null;
  idioma: string;
}[];

for (const p of lista) {
  const esperados = p.esperado === null ? [] : [p.esperado].flat();
  const t0 = performance.now();
  let estado = "✗";
  let detalle = "";
  try {
    const r = await clasificar(p.frase, forzar);
    tiempos.push(performance.now() - t0);
    if (forzar && r.motor !== forzar) motorMal++;
    if (r.caso === "fuera" ? p.esperado === null : r.caso === "respuesta" && esperados.includes(r.id)) {
      puntos += 1;
      estado = "✓";
    } else if (r.caso === "desambiguar" && r.opciones.some((o) => esperados.includes(o))) {
      puntos += 0.5;
      estado = "~";
    }
    if (r.idioma === p.idioma) idiomaOk++;
    detalle = `${r.motor.padEnd(8)} ${r.caso.padEnd(11)} ${(r.caso === "respuesta" ? r.id : r.caso === "desambiguar" ? r.opciones.join(",") : "").padEnd(50)} ${r.idioma}`;
  } catch (e) {
    detalle = `ERROR ${(e as Error).message}`;
  }
  const ms = Math.round(performance.now() - t0);
  console.log(`${estado} ${String(ms).padStart(5)}ms ${detalle} ← ${p.frase}`);
}

const n = lista.length;
const pct = Math.round((puntos / n) * 100);
tiempos.sort((a, b) => a - b);
console.log(
  `\nMotor ${forzar ?? "completo"} · puntuación ${pct}% (${puntos}/${n}) · idioma ${idiomaOk}/${n} · mediana ${Math.round(tiempos[Math.floor(tiempos.length / 2)] ?? 0)} ms`,
);
if (pct < minimo || motorMal > 0) {
  console.log(`✗ Por debajo del mínimo (${minimo}%) o motor incorrecto (${motorMal})`);
  process.exitCode = 1;
}
