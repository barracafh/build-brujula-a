# Plan · Buscador semántico (RAG) como herramienta del agente

Rama `rag-buscador` (worktree `../brujula-rag`). Parte de `indexacion-valencia` (índice, catálogo de València y scripts) con `main` fusionado (motor, `/api/consulta` y fuente del catálogo). Decisión de producto: `decisiones.md`, punto 18.

Revisado por Codex dos veces. Pasada 2: validar solo las dimensiones usadas, similitud de -1 a 1 y `null` al degradar explicados al modelo, minimización dentro de la herramienta y respuesta final en el ejemplo del bucle. Pasada 1: incorporados sus 7 hallazgos (orden de las pruebas, módulo puro de similitud, timeout propio, validación de la respuesta, redondeo después de ordenar, prueba real de la herramienta, despacho de `tool_calls`).

## Objetivo

Una función que el agente pueda llamar con una frase en lenguaje natural y que devuelva los trámites más parecidos:

```ts
const { candidatos } = await buscarTramites("me han echado del trabajo");
// [{ id: "prestacion-desempleo", titulo: "…", tipo: "tramite", organismo: "…", administracion: "…", similitud: 0.71 }, … hasta 10]
```

Y la misma función como herramienta de la API de OpenAI (HelmCode): `definicion` va en `tools` y `responder(llamada)` convierte cada `tool_call` del modelo en el mensaje `role: "tool"` que se le devuelve. El bucle del agente y el cliente que acepte `tools` los pone quien construya el agente: `completar()` de `src/lib/ia.ts` hoy no envía `tools` ni devuelve `tool_calls` (ver «Uso desde un agente»).

Requisitos:
- **Rápida.** Una sola llamada de red: el embedding de la frase (~150–250 ms medido el 22/10). La comparación con los 37 vectores es en memoria (<1 ms). Timeout propio de 3 s.
- **Correcta.** La misma variante y la misma instrucción que ganaron la evaluación (D, con `instruccion_consulta`), y el mismo cálculo de similitud que `evaluar.ts`. Con las 40 preguntas ciegas: top 10 = 100 % y top 3 ≥ 95 %.
- **Sin estado.** Ni la frase ni su vector se guardan ni se registran (regla 3).
- **Si falla el embedding** (error, respuesta inválida o timeout propio), devuelve las 37 entradas sin `similitud` y con `aviso`, para que el agente siga funcionando (punto 18). Si quien llama cancela, se propaga la cancelación.

## Fuera de alcance

- El agente en sí (su prompt, su bucle de herramientas y el cliente con `tools`).
- Los adaptadores reales del motor (Jev, HelmCode) y el código antiguo de `/api/brujula` (`clasificar.ts`, `jev.ts`, `catalogo.ts`), que sigue usando solo los 21.
- Un umbral de similitud para decidir «sin coincidencia»: se decide cuando el agente funcione.

## Diseño

Cuatro piezas, de abajo arriba. Cada una se puede usar sola.

| Archivo | Qué hace | `server-only` |
|---|---|---|
| `src/lib/similitud.ts` (nuevo) | Cálculo puro: producto escalar, similitud de un trámite (máximo sobre sus vectores) y ordenación. Sin datos ni red. Lo comparten `evaluar.ts` y el buscador. | No |
| `src/lib/embeddings.ts` (nuevo) | Llamada HTTP a `/embeddings` de HelmCode, validación y normalización. Lo comparten la app y los scripts de indexado. | No: lo importan scripts de Bun |
| `src/lib/buscador.ts` (nuevo) | Carga `vectores.json`, convierte la frase en vector con la instrucción y ordena. Devuelve ids y similitud. | No: lo importan las pruebas |
| `src/lib/herramientas/buscar-tramites.ts` (nuevo) | La herramienta del agente: valida argumentos, timeout, llama al buscador, completa con el catálogo y degrada si falla. | Sí |

Por qué `server-only` solo en la pieza de arriba: Bun no resuelve el paquete `server-only` (lo aporta Next), así que un script que lo importe no arranca. Las piezas de abajo no tienen secretos en el código (la clave sale de `process.env`), igual que `src/lib/ia.ts`. La herramienta importa `fuente-catalogo.ts`, que ya es `server-only`. Para probarla con Bun se precarga `scripts/sin-server-only.ts`, que sustituye el paquete por un módulo vacío (comprobado: con `bun --preload` se carga `fuente-catalogo.ts`).

## Pasos

Cada paso es un commit. Tras cada uno: `bun run typecheck` y `bun scripts/unitarias.ts`.

### Paso 1 · `src/lib/similitud.ts`

```ts
// Similitud entre un vector de consulta y los vectores de un trámite. Los
// vectores están normalizados: el producto escalar es el coseno. Lo usan
// scripts/indexado/evaluar.ts y src/lib/buscador.ts: mismo cálculo en la
// evaluación y en la app.

export function producto(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// La mejor entre los vectores del trámite (la variante C tiene varios; la D, uno).
export const similitud = (consulta: number[], vectores: number[][]) =>
  Math.max(...vectores.map((v) => producto(consulta, v)));

// De más a menos parecido, con la precisión completa. Ante empate, el orden
// de entrada (sort es estable), igual que en la evaluación.
export function ordenar<T extends { vectores: number[][] }>(
  consulta: number[],
  items: T[],
): (T & { puntos: number })[] {
  return items
    .map((item) => ({ ...item, puntos: similitud(consulta, item.vectores) }))
    .sort((a, b) => b.puntos - a.puntos);
}
```

`scripts/indexado/evaluar.ts`: borra su `producto` y el `Math.max(...)` de `ranking`; `ranking` pasa a ser:

```ts
const ranking = (consulta: number[], items: Item[], v: Variante) =>
  ordenar(consulta, items.map((item) => ({ id: item.id, vectores: vectoresDe(item, v) }))).map((r) => r.id);
```

No depende de `vectores.json`, así que la evaluación puede regenerarlo aunque falte o esté roto.

### Paso 2 · `src/lib/embeddings.ts`

Sale de `scripts/indexado/comun.ts` (`embeber`, `normalizar`, `MODELO_EMBEDDINGS`, `DIMENSIONES`), sin lotes ni pausas: eso es cosa del script.

```ts
// Embeddings de HelmCode (API compatible con OpenAI). Lo usan la app y los
// scripts de indexado. Solo en el servidor: la clave sale de process.env.
export const MODELO_EMBEDDINGS = "qwen3-embedding";
export const DIMENSIONES = 1536;

// Una sola petición, sin reintentos. Devuelve un vector por texto, en el mismo
// orden, normalizado a longitud 1 y redondeado a 5 decimales. Lanza si la
// respuesta no trae exactamente un vector válido por texto.
export async function embeber(
  textos: string[],
  { signal }: { signal?: AbortSignal } = {},
): Promise<number[][]> {
  const { HELMCODE_API_KEY, HELMCODE_BASE_URL } = process.env;
  if (!HELMCODE_API_KEY) throw new Error("Falta HELMCODE_API_KEY en .env.local");
  const res = await fetch(`${HELMCODE_BASE_URL ?? "https://api.helmcode.com/v1"}/embeddings`, {
    method: "POST",
    headers: { authorization: `Bearer ${HELMCODE_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODELO_EMBEDDINGS, input: textos, dimensions: DIMENSIONES }),
    signal,
  });
  if (!res.ok) throw new Error(`Embeddings: HelmCode respondió ${res.status}`);
  const { data } = (await res.json()) as { data?: { index: number; embedding: number[] }[] };
  const vectores: number[][] = [];
  for (const d of data ?? []) vectores[d.index] = d.embedding;
  if (data?.length !== textos.length || textos.some((_, i) => !valido(vectores[i])))
    throw new Error("Embeddings: respuesta inválida");
  return vectores.map(normalizar);
}

// Se valida lo que se usa: los primeros DIMENSIONES valores, con norma > 0.
const valido = (v: unknown): v is number[] => {
  if (!Array.isArray(v) || v.length < DIMENSIONES) return false;
  const corto = v.slice(0, DIMENSIONES);
  return corto.every(Number.isFinite) && corto.some((x) => x !== 0);
};

function normalizar(v: number[]): number[] {
  const corto = v.slice(0, DIMENSIONES);
  const norma = Math.hypot(...corto);
  return corto.map((x) => Math.round((x / norma) * 1e5) / 1e5);
}
```

La validación cubre: índices repetidos o que faltan (algún hueco en `vectores`), vectores vacíos, cortos, con `NaN` o todo ceros. Ante cualquiera, lanza, y la herramienta degrada.

`scripts/indexado/comun.ts` cambia:
- Borra `MODELO_EMBEDDINGS`, `DIMENSIONES`, `normalizar` y el cuerpo HTTP de su `embeber`; los reexporta desde `../../src/lib/embeddings` para no tocar más imports.
- Su `embeber(textos)` queda como bucle de lotes de 32 con `PAUSA_IA_MS` que llama al de `src/lib/embeddings` (importado como `embeberLote`).

### Paso 3 · `src/lib/buscador.ts`

```ts
import indice from "@/datos/vectores.json";
import { embeber } from "./embeddings";
import { ordenar } from "./similitud";

// Búsqueda semántica sobre src/datos/vectores.json (docs/index_specification.md).
// Sin estado: ni la frase ni su vector se guardan (regla 3).

export type Coincidencia = { id: string; similitud: number };

export const LIMITE_POR_DEFECTO = 10;
export const TOTAL = indice.items.length;

const items: { id: string; vectores: number[][] }[] = indice.items;
const prefijo: string = indice.instruccion_consulta ?? "";

// La frase lleva delante la instrucción con la que se evaluó el índice.
export const textoConsulta = (frase: string) => prefijo + frase;

// Pura y síncrona: la usan buscar() y las pruebas. Ordena con la precisión
// completa y redondea solo lo que devuelve.
export function mejores(consulta: number[], limite = LIMITE_POR_DEFECTO): Coincidencia[] {
  const n = Math.max(1, Math.min(Math.trunc(limite) || LIMITE_POR_DEFECTO, TOTAL));
  return ordenar(consulta, items)
    .slice(0, n)
    .map((r) => ({ id: r.id, similitud: Math.round(r.puntos * 1e4) / 1e4 }));
}

export async function buscar(
  frase: string,
  { limite, signal }: { limite?: number; signal?: AbortSignal } = {},
): Promise<Coincidencia[]> {
  const [vector] = await embeber([textoConsulta(frase)], { signal });
  return mejores(vector, limite);
}
```

Notas:
- `vectores.json` pesa ~1 MB y se importa estático: entra en el bundle del servidor y Vercel lo incluye sin configuración. Ningún componente de cliente lo importa.
- Si TypeScript tarda demasiado en inferir el tipo del JSON grande, se cambia por `readFileSync(path.join(process.cwd(), "src/datos/vectores.json"))` y `outputFileTracingIncludes` en `next.config.ts`. Solo si hace falta: medir `bun run typecheck` antes y después.

### Paso 4 · Catálogo con las 37 entradas

`src/lib/fuente-catalogo.ts`:

```ts
import catalogoJson from "../../datos/catalogo-tramites-ayudas.json";
import valenciaJson from "@/datos/catalogo-valencia.json";
// …
type EntradaJson =
  | (typeof catalogoJson.items)[number]
  | (typeof valenciaJson.items)[number];
// …
const entradas: Entrada[] = [...catalogoJson.items, ...valenciaJson.items].map(normalizar);
```

Comprobar que `normalizar` tipa con la unión (si `nota` o `plazo` difieren en tipo entre los dos JSON, ajustar con `?? null`). `sede.valencia.es` ya tiene nombre en `src/datos/nombres-fuentes.ts`. `/api/consulta` no cambia: el motor simulado solo devuelve ids de los 21.

### Paso 5 · La herramienta: `src/lib/herramientas/buscar-tramites.ts`

```ts
import "server-only";
import { buscar, LIMITE_POR_DEFECTO, TOTAL } from "@/lib/buscador";
import { catalogo } from "@/lib/fuente-catalogo";
import type { Entrada } from "@/lib/entrada";

// Herramienta del agente: de una frase del ciudadano a los trámites más
// parecidos del catálogo (decisiones.md, punto 18). La frase se minimiza aquí
// (src/lib/minimizar.ts) antes de enviarla a HelmCode, venga de donde venga.
//
//   const { candidatos } = await buscarTramites("me han echado del trabajo");
//
// Como herramienta de HelmCode: `definicion` va en `tools` y, por cada
// `tool_call` del modelo, `responder(llamada)` da el mensaje `role: "tool"`.

export type Candidato = Pick<Entrada, "id" | "titulo" | "tipo" | "organismo" | "administracion"> & {
  similitud: number | null; // null si el buscador no respondió
};

export type ResultadoBusqueda = {
  candidatos: Candidato[];
  aviso?: string; // solo si se devuelve el catálogo entero por un fallo
};

const MAX_CARACTERES = 1000;
const TIMEOUT_MS = 3000;

const candidato = ({ id, titulo, tipo, organismo, administracion }: Entrada, similitud: number | null): Candidato => ({
  id, titulo, tipo, organismo, administracion, similitud,
});

export async function buscarTramites(
  frase: string,
  { limite, signal }: { limite?: number; signal?: AbortSignal } = {},
): Promise<ResultadoBusqueda> {
  const texto = minimizar(frase.trim().slice(0, MAX_CARACTERES));
  if (!texto) return { candidatos: [] };
  const plazo = AbortSignal.timeout(TIMEOUT_MS);
  try {
    const coincidencias = await buscar(texto, {
      limite,
      signal: signal ? AbortSignal.any([signal, plazo]) : plazo,
    });
    const entradas = await Promise.all(coincidencias.map((c) => catalogo.obtener(c.id)));
    return {
      candidatos: coincidencias.flatMap((c, i) => (entradas[i] ? [candidato(entradas[i], c.similitud)] : [])),
    };
  } catch {
    if (signal?.aborted) throw signal.reason; // cancela quien llama: no degradar
    const todas = await catalogo.listar();
    return {
      candidatos: todas.map((e) => candidato(e, null)),
      aviso: "El buscador no responde: se devuelve el catálogo completo sin ordenar.",
    };
  }
}

// Formato `tools` de la API de OpenAI (HelmCode lo acepta).
export const definicion = {
  type: "function",
  function: {
    name: "buscar_tramites",
    description:
      "Busca en el catálogo de Brújula (trámites y ayudas para quien vive en València) los más parecidos a lo que necesita el ciudadano. Devuelve id, título, tipo, organismo, administración y similitud (coseno, de -1 a 1; cuanto más alta, más parecido), de más a menos parecido. Si el buscador falla, devuelve el catálogo entero sin ordenar, con similitud null y un campo aviso: elige tú entre todos. Llámala una vez por mensaje del ciudadano, antes de hablar de un trámite concreto.",
    parameters: {
      type: "object",
      properties: {
        consulta: {
          type: "string",
          description: "Lo que necesita el ciudadano, con sus palabras, en castellano o valenciano.",
        },
        limite: {
          type: "integer",
          minimum: 1,
          maximum: TOTAL,
          description: `Cuántos trámites devolver. Por defecto, ${LIMITE_POR_DEFECTO}.`,
        },
      },
      required: ["consulta"],
      additionalProperties: false,
    },
  },
} as const;

// Lo que trae `choices[0].message.tool_calls[i]` en la API de OpenAI.
export type LlamadaHerramienta = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

// Ejecuta una llamada del modelo y devuelve el mensaje que se le contesta.
// Los errores de argumentos van en el contenido para que el modelo corrija;
// solo la cancelación de quien llama lanza.
export async function responder(llamada: LlamadaHerramienta, signal?: AbortSignal) {
  const contenido = await ejecutar(llamada.function.arguments, signal).catch((e) => {
    if (signal?.aborted) throw e;
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  });
  return { role: "tool" as const, tool_call_id: llamada.id, content: JSON.stringify(contenido) };
}

// `argumentos` es el JSON (texto) de `function.arguments`.
export async function ejecutar(argumentos: string, signal?: AbortSignal): Promise<ResultadoBusqueda> {
  let args: { consulta?: unknown; limite?: unknown };
  try {
    args = JSON.parse(argumentos) ?? {};
  } catch {
    throw new Error("buscar_tramites: los argumentos no son JSON");
  }
  if (typeof args.consulta !== "string" || !args.consulta.trim())
    throw new Error("buscar_tramites: falta «consulta»");
  const limite = Number.isInteger(args.limite) ? (args.limite as number) : undefined;
  return buscarTramites(args.consulta, { limite, signal });
}
```

Notas:
- La frase se minimiza dentro de `buscarTramites`, así que también la que escribe el modelo en `tool_calls` pasa por `minimizar` antes de llegar a HelmCode.
- Ningún `console.*` con la frase (regla 3). El `catch` no registra nada.
- `Promise.all` sobre `catalogo.obtener`: hoy es un `Map`; si la fuente pasa a ser remota, son 10 consultas en paralelo, no en serie.

### Paso 6 · Pruebas

**`scripts/unitarias.ts`** (sin red). Los casos nuevos van **antes** de las dos líneas finales (`console.log(fallos ? …)` y `process.exitCode`), para que cuenten en el resultado:
1. `vectores.json`: `dimensiones === DIMENSIONES`, cada vector mide 1.536 y su norma está entre 0,999 y 1,001.
2. Los ids de `vectores.json` y los de los dos catálogos (`datos/catalogo-tramites-ayudas.json` + `src/datos/catalogo-valencia.json`, leídos directamente, sin `fuente-catalogo.ts`) son el mismo conjunto, sin repetidos.
3. `mejores(vectorDe("multa-dgt"))[0].id === "multa-dgt"` y su `similitud` ≈ 1.
4. `mejores(v).length === 10`; `mejores(v, 3).length === 3`; `mejores(v, 0).length === 10` (0 no es válido → por defecto); `mejores(v, -5).length === 1`; `mejores(v, 999).length === 37`.
5. `mejores` va de mayor a menor similitud.
6. `ordenar` de `similitud.ts`: con dos items que solo difieren en la quinta cifra decimal, el orden es el correcto (no redondea antes).
7. `mejores` tarda menos de 5 ms de media en 1.000 llamadas.

**`scripts/sin-server-only.ts`** (nuevo, precarga para Bun):

```ts
// Bun no resuelve `server-only` (lo aporta Next). Para probar módulos de
// servidor desde scripts: bun --preload ./scripts/sin-server-only.ts <script>
import { plugin } from "bun";
plugin({
  name: "server-only",
  setup(b) {
    b.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});
```

**`scripts/probar-buscador.ts`** (nuevo, con red; `bun --preload ./scripts/sin-server-only.ts scripts/probar-buscador.ts`):
1. Precisión: las 40 frases de `src/datos/pruebas-indice.json`, convertidas con `textoConsulta()` en **una sola** llamada a `embeber`. Con `mejores(v, 10)` calcula top 1, top 3 y top 10. Falla si top 10 < 100 % o top 3 < 95 %. Imprime los fallos de top 3.
2. Velocidad: 5 llamadas seguidas a `buscarTramites()` con frases distintas, 1 s entre ellas. Imprime cada tiempo y la mediana. Falla si la mediana pasa de 1.000 ms o si alguna devuelve `aviso`.
3. Herramienta:
   - `responder({ id: "t1", type: "function", function: { name: "buscar_tramites", arguments: '{"consulta":"quiero votar por correo","limite":3}' } })` → `role: "tool"`, `tool_call_id: "t1"`, `content` con 3 candidatos y `voto-por-correo` entre ellos.
   - `arguments: "no es json"` y `arguments: "{}"` → `content` con `error`, sin llamada de red.
   - `buscarTramites("")` → `{ candidatos: [] }` sin red.
   - Fallo de embeddings: con `process.env.HELMCODE_BASE_URL = "http://127.0.0.1:9"` (puerto cerrado), `buscarTramites("multa")` devuelve 37 candidatos con `similitud: null` y `aviso`. Se restaura la variable después.
   - Cancelación: con `AbortSignal.abort()`, `buscarTramites("multa", { signal })` lanza.
4. En total, 7 llamadas a la API: respeta los límites compartidos. Sale con código 1 si algo falla.

`package.json`: `"probar:buscador": "bun --preload ./scripts/sin-server-only.ts scripts/probar-buscador.ts"`.

### Paso 7 · Documentación

- `docs/index_specification.md`, sección 7 «Pendiente»: quitar «Usar `vectores.json` en la búsqueda de la app» y añadir una sección «Uso en la app» con las cuatro piezas, la llamada de ejemplo y el comando de las pruebas.
- `decisiones.md` (solo mis cambios; el apartado de audio y el punto 15 del compañero no se suben): punto nuevo con lo decidido al implementar: sin reintentos ante 429 y timeout de 3 s, degradar al catálogo entero salvo cancelación, `server-only` solo en la herramienta y precarga para Bun, cálculo de similitud compartido.

## Uso desde un agente

Ejemplo para quien construya el bucle (no se implementa aquí). Necesita un cliente que envíe `tools` y lea `tool_calls`; `completar()` no lo hace.

```ts
import { definicion, responder } from "@/lib/herramientas/buscar-tramites";

const mensajes = [{ role: "system", content: "…" }, { role: "user", content: frase }];
let respuesta: string | undefined;
for (let paso = 0; paso < 4 && respuesta === undefined; paso++) {
  // En el último paso no se ofrecen herramientas: el modelo tiene que contestar.
  const ultimo = paso === 3;
  const { choices } = await llamarHelmCode({ messages: mensajes, tools: ultimo ? undefined : [definicion] });
  const mensaje = choices[0].message;
  mensajes.push(mensaje);
  if (!mensaje.tool_calls?.length) respuesta = mensaje.content; // respuesta final
  else for (const llamada of mensaje.tool_calls) mensajes.push(await responder(llamada, signal));
}
```

## Verificación final

1. `bun run typecheck` y `bun run build` pasan.
2. `bun scripts/unitarias.ts`: todo ✓.
3. `bun run probar:buscador`: top 10 = 100 %, top 3 ≥ 95 %, mediana < 1.000 ms, herramienta ✓.
4. `bun run dev` y `curl -s localhost:3000/<equipo>/api/consulta -H 'content-type: application/json' -d '{"historial":[{"rol":"ciudadano","texto":"quiero votar por correo"}]}'` devuelve `tipo: "respuesta"`.
5. `grep -rn "console\." src/lib/similitud.ts src/lib/buscador.ts src/lib/embeddings.ts src/lib/herramientas` no encuentra nada.

## Riesgos

- **Límites compartidos de HelmCode:** cada búsqueda es una llamada. El agente la llama una vez por mensaje del ciudadano, nunca por tecla.
- **Tipo inferido del JSON grande:** ver la nota del paso 3.
- **Catálogo con 37 entradas:** todo lo que use `catalogo.listar()` verá también las de València.
