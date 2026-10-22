import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Fragmento } from "../src/lib/guion-audio";

// Audio pregenerado de la respuesta (ticket 17). Lee el catálogo a través de la
// fuente del catálogo, genera cada fragmento del guion con ElevenLabs y
// concatena un MP3 por entrada e idioma en public/audio/.
//   bun scripts/pregenerar-audio.ts             genera lo que falte o haya cambiado
//   bun scripts/pregenerar-audio.ts --solo <id> solo esa entrada (para escucharla antes)
//   bun scripts/pregenerar-audio.ts --seco      dice qué generaría y cuántos caracteres, sin llamar
// Un fragmento con el mismo texto, idioma, voz y modelo no se vuelve a pedir:
// su hash va en el manifiesto y su audio en .audio-fragmentos/ (fuera del repo).

// El repo no instala los tipos de Bun: basta con lo que usa este script.
declare const Bun: {
  plugin(p: {
    setup(b: {
      module(nombre: string, f: () => { exports: object; loader: "object" }): void;
    }): void;
  }): void;
};
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// La fuente del catálogo es de servidor; fuera de Next, `server-only` no existe.
Bun.plugin({
  setup(build) {
    build.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});
const { catalogo } = await import("../src/lib/fuente-catalogo");
const { guionAudio } = await import("../src/lib/guion-audio");

const VOZ = { nombre: "Alice", id: "Xb7hH8MSUJpSbSDYk0k2" };
const MODELO = "eleven_v4_turbo";
const FORMATO = "mp3_22050_32";
const IDIOMAS = ["es", "va"] as const;
const SALIDA = "public/audio";
const CACHE = ".audio-fragmentos";
const MANIFIESTO = "src/datos/audio.json";
const API = "https://api.elevenlabs.io/v1";

type Version = { segundos: number; bytes: number; fragmentos: string[] };
type Manifiesto = {
  voz: typeof VOZ;
  modelo: string;
  formato: string;
  entradas: Record<string, Partial<Record<(typeof IDIOMAS)[number], Version>>>;
};

const args = process.argv.slice(2);
const solo = args.includes("--solo") ? args[args.indexOf("--solo") + 1] : null;
const seco = args.includes("--seco");

const clave = process.env.ELEVENLABS_API_KEY;
if (!clave && !seco) throw new Error("Falta ELEVENLABS_API_KEY en .env.local");

const manifiesto: Manifiesto = existsSync(MANIFIESTO)
  ? JSON.parse(readFileSync(MANIFIESTO, "utf8"))
  : { voz: VOZ, modelo: MODELO, formato: FORMATO, entradas: {} };
manifiesto.voz = VOZ;
manifiesto.modelo = MODELO;
manifiesto.formato = FORMATO;

const hash = (f: Fragmento) =>
  createHash("sha256")
    .update([MODELO, VOZ.id, FORMATO, f.voz, f.texto].join("\n"))
    .digest("hex")
    .slice(0, 16);

async function caracteresUsados(): Promise<number> {
  const r = await fetch(`${API}/user/subscription`, {
    headers: { "xi-api-key": clave! },
  });
  if (!r.ok) throw new Error(`subscription ${r.status}`);
  return (await r.json()).character_count;
}

async function sintetizar(f: Fragmento): Promise<Uint8Array> {
  for (let intento = 1; ; intento++) {
    const r = await fetch(
      `${API}/text-to-speech/${VOZ.id}?output_format=${FORMATO}`,
      {
        method: "POST",
        headers: { "xi-api-key": clave!, "content-type": "application/json" },
        body: JSON.stringify({
          text: f.texto,
          model_id: MODELO,
          language_code: f.voz,
        }),
      },
    );
    if (r.ok) return new Uint8Array(await r.arrayBuffer());
    if ((r.status === 429 || r.status >= 500) && intento < 4) {
      await esperar(2000 * intento);
      continue;
    }
    throw new Error(`text-to-speech ${r.status}: ${await r.text()}`);
  }
}

// Fragmentos pedidos en esta ejecución: la misma etiqueta en 21 entradas es
// una sola llamada aunque se pida a la vez.
const enCurso = new Map<string, Promise<Uint8Array>>();
let llamadas = 0;
let caracteres = 0;

function fragmento(f: Fragmento): Promise<Uint8Array> {
  const h = hash(f);
  const ruta = `${CACHE}/${h}.mp3`;
  if (!enCurso.has(h)) {
    enCurso.set(
      h,
      existsSync(ruta)
        ? Promise.resolve(new Uint8Array(readFileSync(ruta)))
        : (async () => {
            llamadas++;
            caracteres += f.texto.length;
            const audio = await sintetizar(f);
            writeFileSync(ruta, audio);
            return audio;
          })(),
    );
  }
  return enCurso.get(h)!;
}

// --- MP3: tramas MPEG de capa III, sin etiquetas ID3 ni trama Xing/Info, para
// que el archivo concatenado no anuncie la duración de su primer fragmento.

const KBPS = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const HZ = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

function tramas(audio: Uint8Array) {
  const lista: { inicio: number; fin: number; muestras: number; hz: number }[] = [];
  let i = 0;
  if (audio[0] === 0x49 && audio[1] === 0x44 && audio[2] === 0x33) {
    i = 10 + ((audio[6] << 21) | (audio[7] << 14) | (audio[8] << 7) | audio[9]);
  }
  while (i + 4 <= audio.length) {
    if (audio[i] !== 0xff || (audio[i + 1] & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const version = (audio[i + 1] >> 3) & 3; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const capa = (audio[i + 1] >> 1) & 3; // 1 = capa III
    const kbps = KBPS[version === 3 ? 1 : 2][audio[i + 2] >> 4];
    const hz = HZ[version as 0 | 2 | 3]?.[(audio[i + 2] >> 2) & 3];
    if (version === 1 || capa !== 1 || !kbps || !hz) {
      i++;
      continue;
    }
    const relleno = (audio[i + 2] >> 1) & 1;
    const muestras = version === 3 ? 1152 : 576;
    const largo = Math.floor(((muestras / 8) * kbps * 1000) / hz) + relleno;
    const cuerpo = new TextDecoder().decode(audio.subarray(i + 4, i + 40));
    if (!cuerpo.includes("Xing") && !cuerpo.includes("Info")) {
      lista.push({ inicio: i, fin: i + largo, muestras, hz });
    }
    i += largo;
  }
  return lista;
}

function concatenar(partes: Uint8Array[]) {
  const trozos: Uint8Array[] = [];
  let segundos = 0;
  for (const parte of partes) {
    for (const t of tramas(parte)) {
      trozos.push(parte.subarray(t.inicio, t.fin));
      segundos += t.muestras / t.hz;
    }
  }
  const audio = new Uint8Array(trozos.reduce((n, t) => n + t.length, 0));
  let p = 0;
  for (const t of trozos) {
    audio.set(t, p);
    p += t.length;
  }
  return { audio, segundos: Math.round(segundos * 10) / 10 };
}

// --- Generación

mkdirSync(SALIDA, { recursive: true });
mkdirSync(CACHE, { recursive: true });

const entradas = (await catalogo.listar()).filter((e) => !solo || e.id === solo);
if (entradas.length === 0) throw new Error(`No hay ninguna entrada ${solo}`);

const pendientes = entradas.flatMap((e) =>
  IDIOMAS.map((idioma) => {
    const guion = guionAudio(e, idioma);
    const hashes = guion.map(hash);
    const archivo = `${SALIDA}/${e.id}.${idioma}.mp3`;
    const previa = manifiesto.entradas[e.id]?.[idioma];
    const igual =
      existsSync(archivo) && previa?.fragmentos.join() === hashes.join();
    return { e, idioma, guion, hashes, archivo, igual };
  }),
).filter((v) => !v.igual);

if (seco) {
  const nuevos = new Map<string, Fragmento>();
  for (const v of pendientes)
    v.guion.forEach((f, i) => {
      if (!existsSync(`${CACHE}/${v.hashes[i]}.mp3`)) nuevos.set(v.hashes[i], f);
    });
  const total = [...nuevos.values()].reduce((n, f) => n + f.texto.length, 0);
  console.log(
    `${pendientes.length} versiones por generar, ${nuevos.size} fragmentos nuevos, ${total} caracteres`,
  );
  for (const v of pendientes.slice(0, 2))
    console.log(`\n# ${v.e.id}.${v.idioma}\n${v.guion.map((f) => `[${f.voz}] ${f.texto}`).join("\n")}`);
  process.exit(0);
}

const antes = await caracteresUsados();

// Dos a la vez como mucho, para no rozar los límites del plan Creator.
const cola = [...pendientes];
async function trabajador() {
  for (let v = cola.shift(); v; v = cola.shift()) {
    const partes: Uint8Array[] = [];
    for (const f of v.guion) partes.push(await fragmento(f));
    const { audio, segundos } = concatenar(partes);
    writeFileSync(v.archivo, audio);
    (manifiesto.entradas[v.e.id] ??= {})[v.idioma] = {
      segundos,
      bytes: audio.length,
      fragmentos: v.hashes,
    };
    console.log(`${v.archivo} · ${segundos} s · ${Math.round(audio.length / 1024)} KB`);
  }
}
await Promise.all([trabajador(), trabajador()]);

const ordenado = Object.fromEntries(
  Object.entries(manifiesto.entradas).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(MANIFIESTO, `${JSON.stringify({ ...manifiesto, entradas: ordenado }, null, 2)}\n`);

// El contador de ElevenLabs puede ir con retraso: se vuelve a leer al rato.
await esperar(5000);
const despues = await caracteresUsados();
const versiones = Object.values(ordenado).flatMap((v) => Object.values(v));
const bytes = versiones.reduce((n, v) => n + (v?.bytes ?? 0), 0);
console.log(
  `\n${pendientes.length} versiones, ${llamadas} llamadas, ${caracteres} caracteres enviados.` +
    `\nCréditos: ${antes} → ${despues} (${despues - antes}).` +
    `\nTotal en ${SALIDA}: ${versiones.length} MP3, ${(bytes / 1024 / 1024).toFixed(1)} MB.`,
);
