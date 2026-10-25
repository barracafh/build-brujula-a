import { plantillas } from "../src/lib/motor/plantillas";

const base = process.argv[2] ?? "http://localhost:3000/punto-atencion-ciudadana/brujula-a";

type Caso = {
  nombre: string;
  cuerpo: object;
  espera: (status: number, r: any) => boolean;
};

const chat = (entradaAbierta: string, texto: string) => ({
  entradaAbierta,
  historial: [{ rol: "ciudadano", texto }],
});
const plantilla = (t: string) =>
  [plantillas.es, plantillas.va].some(
    (p) => t === p.fueraDeAmbito || t === p.noConfirmado,
  );
const redactada = (r: any) =>
  r.tipo === "contestacion" && !plantilla(r.texto) && r.fuentes.length > 0;

const casos: Caso[] = [
  {
    nombre: "plazo de la entrada abierta",
    cuerpo: chat("prestacion-desempleo", "¿Cuánto tiempo tengo para pedirla?"),
    espera: (s, r) => s === 200 && redactada(r),
  },
  {
    nombre: "duda del marco (Cl@ve)",
    cuerpo: chat("prestacion-desempleo", "¿Qué es Cl@ve y cómo la consigo?"),
    espera: (s, r) => s === 200 && redactada(r),
  },
  {
    nombre: "otra entrada por id → candidata",
    cuerpo: chat("prestacion-desempleo", "¿Y qué necesito para votar por correo?"),
    espera: (s, r) =>
      s === 200 &&
      r.tipo === "contestacion" &&
      r.candidatas.some((c: any) => c.id === "voto-por-correo"),
  },
  {
    nombre: "segunda pregunta con historial",
    cuerpo: {
      entradaAbierta: "prestacion-desempleo",
      historial: [
        { rol: "ciudadano", texto: "¿Cuánto tiempo tengo para pedirla?" },
        { rol: "asistente", texto: "Tienes 15 días hábiles desde la situación legal de desempleo. Puedes pedirla en la sede del SEPE." },
        { rol: "ciudadano", texto: "¿Y qué documentos tengo que llevar?" },
      ],
    },
    espera: (s, r) => s === 200 && redactada(r),
  },
  {
    nombre: "Python → fuera de ámbito",
    cuerpo: chat("prestacion-desempleo", "Escríbeme un script en Python que ordene una lista"),
    espera: (s, r) => s === 200 && r.texto === plantillas.es.fueraDeAmbito && r.fuentes.length === 0,
  },
  {
    nombre: "saludo → fuera de ámbito",
    cuerpo: chat("prestacion-desempleo", "hola, ¿qué tal?"),
    espera: (s, r) => s === 200 && r.texto === plantillas.es.fueraDeAmbito,
  },
  {
    nombre: "valenciano",
    cuerpo: chat("prestacion-desempleo", "Quant de temps tinc per a demanar-la? On ho faig?"),
    espera: (s, r) => s === 200 && r.tipo === "contestacion" && r.idioma === "va",
  },
  {
    nombre: "¿me toca? (revisar a mano: sin dictamen)",
    cuerpo: chat("prestacion-desempleo", "He cotizado 3 años y me han despedido, ¿me toca la prestación?"),
    espera: (s, r) => s === 200 && r.tipo === "contestacion",
  },
  {
    nombre: "entradaAbierta inventada → 400",
    cuerpo: chat("no-existe", "¿Cuánto tarda?"),
    espera: (s) => s === 400,
  },
  {
    nombre: "entradaAbierta no string → 400",
    cuerpo: { entradaAbierta: 3, historial: [{ rol: "ciudadano", texto: "hola" }] },
    espera: (s) => s === 400,
  },
  {
    nombre: "sin entradaAbierta → motor de siempre",
    cuerpo: { historial: [{ rol: "ciudadano", texto: "me han echado del trabajo" }] },
    espera: (s, r) => s === 200 && ["respuesta", "aclaracion", "sin_coincidencia"].includes(r.tipo),
  },
];

let fallos = 0;
for (const c of casos) {
  const t0 = Date.now();
  const res = await fetch(`${base}/api/consulta`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(c.cuerpo),
  });
  const r = await res.json().catch(() => null);
  const ok = c.espera(res.status, r);
  if (!ok) fallos++;
  console.log(`${ok ? "✓" : "✗"} ${c.nombre} · ${res.status} · ${Date.now() - t0} ms`);
  if (r?.fuentes) console.log(`   fuentes: ${r.fuentes.length}`);
  if (r?.texto) console.log(`   ${r.texto.replace(/\n/g, " ").slice(0, 300)}`);
  if (r?.candidatas?.length) console.log(`   candidatas: ${r.candidatas.map((x: any) => x.id).join(", ")}`);
}
if (fallos) {
  console.log(`\n${fallos} fallos`);
  process.exit(1);
}
console.log("\nTodo bien");
