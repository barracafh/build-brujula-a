import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import evaluacion from "../src/datos/evaluacion.json";
import { clasificar, decidirJev, UMBRAL } from "../src/lib/clasificar";
import { preguntarJev, type RespuestaJev } from "../src/lib/jev";
import type { Idioma, Resultado } from "../src/lib/tipos";

// Conjunto de evaluación (ticket 6) contra el motor actual, sin tocarlo.
//   bun scripts/evaluar.ts                        llama a Jev y HelmCode, guarda y saca el informe
//   bun scripts/evaluar.ts --limite 5             solo los 5 primeros casos
//   bun scripts/evaluar.ts --solo llm             solo un proveedor (jev o llm)
//   bun scripts/evaluar.ts --desde evaluacion/x.json            informe y barrido sin llamar
//   bun scripts/evaluar.ts --desde evaluacion/x.json --solo jev completa lo guardado con un proveedor
// El informe sale en Markdown; las llamadas se guardan en evaluacion/ (fuera de git).

type Esperado =
  | { caso: "respuesta"; id: string }
  | { caso: "aclaracion"; ids: string[] }
  | { caso: "sin_coincidencia" };
type Caso = {
  id: string;
  grupo: "catalogo" | "nuevas";
  tipo: string;
  turnos: string[];
  esperado: Esperado;
  idioma: Idioma;
};
type Medida<T> = { ms: number; r?: T; error?: string };
type Fila = { jev?: Medida<RespuestaJev>; llm?: Medida<Resultado> };
type Guardado = { fecha: string; modelo?: string; filas: Record<string, Fila> };
type Proveedor = "jev" | "llm";

const args = process.argv.slice(2);
const opcion = (nombre: string) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
};
const desde = opcion("--desde");
const solo = opcion("--solo") as Proveedor | undefined;
const limite = Number(opcion("--limite") ?? Infinity);
if (solo && solo !== "jev" && solo !== "llm") throw new Error("--solo jev | llm");

const casos = (evaluacion as Caso[]).slice(0, limite);
// El motor actual recibe una sola frase: los turnos del ciudadano, unidos.
const frase = (c: Caso) => c.turnos.join("\n");

// --- Llamadas -----------------------------------------------------------------

const guardado: Guardado = desde
  ? JSON.parse(readFileSync(desde, "utf8"))
  : { fecha: "", filas: {} };
const llamar: Proveedor[] = solo ? [solo] : desde ? [] : ["jev", "llm"];
const disponible: Record<Proveedor, boolean> = {
  jev: !!process.env.JEV_API_KEY,
  llm: !!(process.env.HELMCODE_API_KEY && process.env.HELMCODE_MODEL),
};

async function medir<T>(f: () => Promise<T>): Promise<Medida<T>> {
  const t0 = performance.now();
  try {
    const r = await f();
    return { ms: Math.round(performance.now() - t0), r };
  } catch (e) {
    return { ms: Math.round(performance.now() - t0), error: (e as Error).message };
  }
}

// HelmCode: límites compartidos entre equipos, como mucho 2 llamadas a la vez.
async function enParalelo(n: number, f: (c: Caso) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < casos.length) await f(casos[i++]);
    }),
  );
}

let llamados = 0;
for (const p of llamar) {
  if (!disponible[p]) {
    console.error(`Sin claves para ${p} en .env.local: se salta.`);
    continue;
  }
  let hechos = 0;
  await enParalelo(p === "llm" ? 2 : 1, async (c) => {
    const fila = (guardado.filas[c.id] ??= {});
    if (p === "jev") fila.jev = await medir(() => preguntarJev(frase(c)));
    else fila.llm = await medir(() => clasificar(frase(c), "llm"));
    process.stderr.write(`\r${p} ${++hechos}/${casos.length}`);
  });
  process.stderr.write("\n");
  llamados++;
}
if (llamados) {
  guardado.fecha = new Date().toISOString();
  guardado.modelo = process.env.HELMCODE_MODEL ?? guardado.modelo;
  mkdirSync("evaluacion", { recursive: true });
  const archivo = `evaluacion/${guardado.fecha.replace(/[:.]/g, "-")}.json`;
  writeFileSync(archivo, JSON.stringify(guardado, null, 1));
  console.error(`Guardado en ${archivo}`);
}

// --- Las tres columnas ----------------------------------------------------------

// Igual que desambiguarJev en src/lib/clasificar.ts, que no se exporta.
function desambiguarJev(jev: RespuestaJev): Resultado {
  const buenos = jev.probabilidades.filter(([, p]) => p >= 0.1).slice(0, 3);
  const elegidos = buenos.length >= 2 ? buenos : jev.probabilidades.slice(0, 2);
  return {
    caso: "desambiguar",
    opciones: elegidos.map(([id]) => id),
    idioma: jev.idioma,
    motor: "jev",
  };
}

const columnas = {
  // Jev solo, como clasificar(frase, "jev").
  Jev: (f: Fila): Medida<Resultado> | undefined =>
    f.jev && {
      ms: f.jev.ms,
      r: f.jev.r && (decidirJev(f.jev.r) ?? desambiguarJev(f.jev.r)),
      error: f.jev.error,
    },
  HelmCode: (f: Fila) => f.llm,
  // La cadena de clasificar(frase): Jev y, si duda, HelmCode con el idioma de Jev.
  Cadena: (f: Fila): Medida<Resultado> | undefined => {
    if (!f.jev || !f.llm) return undefined;
    const decision = f.jev.r && decidirJev(f.jev.r);
    if (decision) return { ms: f.jev.ms, r: decision };
    const ms = f.jev.ms + f.llm.ms;
    if (!f.jev.r) return f.llm.r ? { ms, r: f.llm.r } : { ms, error: f.llm.error };
    if (f.llm.r) return { ms, r: { ...f.llm.r, idioma: f.jev.r.idioma } };
    return { ms, r: desambiguarJev(f.jev.r) };
  },
};
type Columna = keyof typeof columnas;
const nombres = Object.keys(columnas) as Columna[];

// --- Puntuación ----------------------------------------------------------------

type Nota = "acierto" | "aclaraBien" | "indebida" | "idEquivocado" | "otro" | "error";

function puntuar(e: Esperado, m: Medida<Resultado>): Nota {
  const r = m.r;
  if (!r) return "error";
  if (r.caso === "respuesta") {
    if (e.caso !== "respuesta") return "indebida";
    return r.id === e.id ? "acierto" : "idEquivocado";
  }
  if (r.caso === "fuera") return e.caso === "sin_coincidencia" ? "acierto" : "otro";
  if (e.caso === "aclaracion")
    return r.opciones.some((o) => e.ids.includes(o)) ? "acierto" : "otro";
  if (e.caso === "respuesta" && r.opciones.includes(e.id)) return "aclaraBien";
  return "otro";
}

type Recuento = Record<Nota, number> & {
  n: number;
  sinRespuesta: number; // casos donde no tocaba responder
  conRespuesta: number;
  idiomaOk: number;
  ms: number[];
};

function recontar(lista: Caso[], col: Columna): Recuento {
  const t: Recuento = {
    n: 0, acierto: 0, aclaraBien: 0, indebida: 0, idEquivocado: 0, otro: 0, error: 0,
    sinRespuesta: 0, conRespuesta: 0, idiomaOk: 0, ms: [],
  };
  for (const c of lista) {
    const fila = guardado.filas[c.id];
    const m = fila && columnas[col](fila);
    if (!m) continue;
    t.n++;
    t[puntuar(c.esperado, m)]++;
    if (c.esperado.caso === "respuesta") t.conRespuesta++;
    else t.sinRespuesta++;
    if (m.r) {
      t.ms.push(m.ms);
      if (m.r.idioma === c.idioma) t.idiomaOk++;
    }
  }
  return t;
}

// --- Informe ---------------------------------------------------------------------

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const fraccion = (a: number, b: number) => (b ? `${a}/${b} (${pct(a, b)})` : "—");
const coma = (x: number) => x.toFixed(2).replace(".", ",");
function percentil(v: number[], p: number) {
  if (!v.length) return "—";
  const s = [...v].sort((a, b) => a - b);
  return String(s[Math.max(0, Math.ceil(p * s.length) - 1)]);
}
const tabla = (cabecera: string[], filas: string[][]) =>
  [cabecera, cabecera.map(() => "-"), ...filas].map((f) => `| ${f.join(" | ")} |`).join("\n");

const conDatos = nombres.filter((col) => recontar(casos, col).n > 0);
if (!conDatos.length) {
  console.log("No hay resultados que puntuar: faltan claves o el archivo de --desde.");
  process.exit(llamar.length ? 1 : 0);
}

const datos = [
  guardado.fecha && `Llamadas del ${guardado.fecha}`,
  guardado.modelo && `HelmCode ${guardado.modelo}`,
  `umbrales de Jev: encaja ${coma(UMBRAL.encaja)}, alta ${coma(UMBRAL.confianzaAlta)}, media ${coma(UMBRAL.confianzaMedia)}`,
];
console.log(`# Evaluación del motor actual\n\n${datos.filter(Boolean).join(" · ")}\n`);

for (const grupo of ["nuevas", "catalogo"] as const) {
  const lista = casos.filter((c) => c.grupo === grupo);
  if (!lista.length) continue;
  console.log(`## ${grupo}\n`);
  console.log(
    tabla(
      ["", "N", "Aciertos", "Aclara con el id", "Respuestas indebidas", "Id equivocado", "Idioma", "Errores", "Mediana ms", "p95 ms"],
      conDatos.map((col) => {
        const t = recontar(lista, col);
        const ok = t.n - t.error;
        return [
          col, String(t.n), fraccion(t.acierto, t.n), String(t.aclaraBien),
          fraccion(t.indebida, t.sinRespuesta), fraccion(t.idEquivocado, t.conRespuesta),
          pct(t.idiomaOk, ok), String(t.error), percentil(t.ms, 0.5), percentil(t.ms, 0.95),
        ];
      }),
    ) + "\n",
  );
}

const nuevas = casos.filter((c) => c.grupo === "nuevas");
if (nuevas.length) {
  const segmentos: [string, Caso[]][] = [
    ["castellano", nuevas.filter((c) => c.idioma === "es")],
    ["valenciano", nuevas.filter((c) => c.idioma === "va")],
    ...["parafrasis", "faltas", "ambigua", "sin_coincidencia", "varios_turnos"].map(
      (tipo): [string, Caso[]] => [tipo, nuevas.filter((c) => c.tipo === tipo)],
    ),
  ];
  console.log("## nuevas por segmento\n\nAciertos · respuestas indebidas.\n");
  console.log(
    tabla(
      ["", "N", ...conDatos],
      segmentos
        .filter(([, l]) => l.length)
        .map(([nombre, l]) => [
          nombre,
          String(l.length),
          ...conDatos.map((col) => {
            const t = recontar(l, col);
            return `${pct(t.acierto, t.n)} · ${t.indebida}`;
          }),
        ]),
    ) + "\n",
  );

  console.log("## Fallos en nuevas\n");
  for (const col of conDatos) {
    const fallos = nuevas.flatMap((c) => {
      const fila = guardado.filas[c.id];
      const m = fila && columnas[col](fila);
      if (!m) return [];
      const nota = puntuar(c.esperado, m);
      if (nota === "acierto") return [];
      const r = m.r;
      const dio = !r
        ? `error: ${m.error}`
        : r.caso === "respuesta" ? `respuesta ${r.id}`
        : r.caso === "desambiguar" ? `desambiguar ${r.opciones.join(", ")}`
        : "fuera";
      return [`- ${c.id} (${nota}): ${dio}`];
    });
    console.log(`**${col}**\n\n${fallos.join("\n") || "- Ninguno"}\n`);
  }
}

// --- Barrido de umbrales (solo nuevas, sin llamar a nadie) ------------------------

const barribles = (["Jev", "Cadena"] as const).filter((col) => recontar(nuevas, col).n > 0);
if (barribles.length) {
  const original = { ...UMBRAL };
  const rango = (a: number, b: number) =>
    Array.from({ length: Math.round((b - a) / 0.05) + 1 }, (_, i) => Math.round((a + i * 0.05) * 100) / 100);
  console.log(
    "## Barrido de umbrales en nuevas\n\n" +
      "Para cada número de respuestas malas (indebidas + id equivocado), lo máximo en aciertos que se consigue, " +
      "con el rango de cada umbral entre las combinaciones que lo empatan. Conviene un valor redondo en medio de un rango ancho.\n",
  );
  const malas = (t: Recuento) => t.indebida + t.idEquivocado;
  type Combo = typeof UMBRAL & { t: Recuento };
  const rangoDe = (l: Combo[], k: keyof typeof UMBRAL) => {
    const v = l.map((c) => c[k]);
    const [a, b] = [Math.min(...v), Math.max(...v)];
    return a === b ? coma(a) : `${coma(a)}–${coma(b)}`;
  };
  for (const col of barribles) {
    const combos: Combo[] = [];
    for (const encaja of rango(0.1, 0.8))
      for (const confianzaAlta of rango(0.6, 0.95))
        for (const confianzaMedia of rango(0.2, 0.7)) {
          if (confianzaMedia >= confianzaAlta) continue;
          Object.assign(UMBRAL, { encaja, confianzaAlta, confianzaMedia });
          combos.push({ encaja, confianzaAlta, confianzaMedia, t: recontar(nuevas, col) });
        }
    Object.assign(UMBRAL, original);
    const actual = recontar(nuevas, col);
    const filas = [
      [`actual`, String(malas(actual)), coma(original.encaja), coma(original.confianzaAlta),
        coma(original.confianzaMedia), fraccion(actual.acierto, actual.n), "1"],
    ];
    // Frontera: solo los niveles que mejoran los aciertos del nivel anterior.
    let tope = -1;
    for (let k = Math.min(...combos.map((c) => malas(c.t))); k <= malas(actual); k++) {
      const nivel = combos.filter((c) => malas(c.t) === k);
      const mejor = Math.max(-1, ...nivel.map((c) => c.t.acierto));
      if (mejor <= tope) continue;
      tope = mejor;
      const empatan = nivel.filter((c) => c.t.acierto === mejor);
      filas.push([
        "", String(k), rangoDe(empatan, "encaja"), rangoDe(empatan, "confianzaAlta"),
        rangoDe(empatan, "confianzaMedia"), fraccion(mejor, actual.n), String(empatan.length),
      ]);
    }
    console.log(`**${col}** · ${combos.length} combinaciones.\n`);
    console.log(
      tabla(["", "Malas", "Encaja", "Alta", "Media", "Aciertos", "Combinaciones"], filas) + "\n",
    );
  }
}
