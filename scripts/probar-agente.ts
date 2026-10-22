// Prueba del loop del agente con buscar_tramites, contra HelmCode de verdad.
//   bun run probar:agente           (modelo de HELMCODE_MODEL)
//   HELMCODE_MODEL=glm5.3-flash bun run probar:agente
// Comprueba que cada frase hace una sola búsqueda y que las candidatas de la
// respuesta salen de los ids que devolvió la herramienta.
import { motorAgente } from "../src/lib/motor/agente";

const casos = [
  { frase: "quiero votar por correo", esperado: "voto-por-correo" },
  { frase: "me han echado del trabajo", esperado: "prestacion-desempleo" },
  { frase: "m'he mudat a València i vull empadronar-me", esperado: "alta-padron-valencia" },
];
const ABIERTA = "renovacion-dni";

// Cuenta las búsquedas y recoge los ids que la herramienta devolvió al modelo
// leyendo los mensajes `role: "tool"` de la siguiente petición.
let busquedas = 0;
let devueltos = new Set<string>();
const fetchOriginal = globalThis.fetch;
globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
  const url = String(entrada instanceof Request ? entrada.url : entrada);
  if (url.endsWith("/embeddings")) busquedas++;
  if (url.endsWith("/chat/completions") && typeof init?.body === "string") {
    for (const m of JSON.parse(init.body).messages ?? []) {
      if (m.role !== "tool") continue;
      try {
        for (const c of JSON.parse(m.content).candidatos ?? []) devueltos.add(c.id);
      } catch {
        // respuesta de consultar_contexto u otra: no trae candidatos
      }
    }
  }
  return fetchOriginal(entrada, init);
}) as typeof fetch;

let fallos = 0;
function comprobar(nombre: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${nombre}`);
  if (!ok) fallos++;
}

for (const { frase, esperado } of casos) {
  busquedas = 0;
  devueltos = new Set();
  const inicio = performance.now();
  const r = await motorAgente.clasificar([{ rol: "ciudadano", texto: frase }], undefined, ABIERTA);
  const ms = Math.round(performance.now() - inicio);
  console.log(`\n«${frase}» (${ms} ms)`);
  if (r.tipo !== "contestacion") {
    comprobar(`contestación (llegó ${r.tipo})`, false);
    continue;
  }
  console.log(`  texto: ${r.texto}`);
  console.log(`  candidatas: ${r.candidatas.map((c) => c.id).join(", ") || "—"}`);
  comprobar("una sola búsqueda", busquedas === 1);
  comprobar("hay candidatas", r.candidatas.length > 0);
  comprobar(
    "las candidatas salen de la búsqueda",
    r.candidatas.every((c) => devueltos.has(c.id)),
  );
  if (esperado) comprobar(`incluye ${esperado}`, r.candidatas.some((c) => c.id === esperado));
  comprobar("con fuentes", r.fuentes.length > 0);
}

if (fallos) {
  console.log(`\n${fallos} fallos`);
  process.exit(1);
}
console.log("\nTodo bien");
