# Plan · Buscador semántico (RAG) como herramienta del agente

Rama `rag-buscador` (worktree `../brujula-rag`). Parte de `indexacion-valencia` (índice, catálogo de València y scripts) con `main` fusionado (motor, `/api/consulta` y fuente del catálogo). Decisión de producto: `decisiones.md`, punto 18.

## Objetivo

Una función que el agente pueda llamar con una frase en lenguaje natural y que devuelva los trámites más parecidos:

```ts
const { candidatos } = await buscarTramites("me han echado del trabajo");
// [{ id: "prestacion-desempleo", titulo: "…", tipo: "tramite", organismo: "…", similitud: 0.71 }, … hasta 10]
```

Y la misma función, en formato de herramienta compatible con la API de OpenAI (HelmCode), para meterla en la lista `tools` del agente sin escribir más código.

Requisitos:
- **Rápida.** Una sola llamada de red: el embedding de la frase (~150–250 ms medido el 22/10). La comparación con los 37 vectores es en memoria (<1 ms).
- **Correcta.** La misma variante y la misma instrucción que ganaron la evaluación (D, con `instruccion_consulta`). Con las 40 preguntas ciegas: top 10 = 100 % y top 3 ≥ 95 %.
- **Sin estado.** Ni la frase ni su vector se guardan (regla 3).
- **Si falla el embedding,** devuelve los 37 sin `similitud` y con `aviso`, para que el agente siga funcionando (punto 18).

## Fuera de alcance

- El agente en sí (su prompt y su bucle de herramientas) lo construye el usuario.
- Los adaptadores reales del motor (Jev, HelmCode) y el código antiguo de `/api/brujula` (`clasificar.ts`, `jev.ts`, `catalogo.ts`), que sigue usando solo los 21.
- Un umbral de similitud para decidir «sin coincidencia»: se decide cuando el agente funcione.

## Diseño

Tres capas, de abajo arriba. Cada una se puede usar sola.

| Archivo | Qué hace | `server-only` |
|---|---|---|
| `src/lib/embeddings.ts` (nuevo) | Llamada HTTP a `/embeddings` de HelmCode y normalización. Lo comparten la app y los scripts de indexado. | No: lo importan scripts de Bun |
| `src/lib/buscador.ts` (nuevo) | Carga `vectores.json`, convierte la frase en vector con la instrucción y ordena. Devuelve ids y similitud. | No: lo importan los tests de Bun |
| `src/lib/herramientas/buscar-tramites.ts` (nuevo) | La herramienta del agente: valida argumentos, llama al buscador, completa con el catálogo (título, tipo, organismo) y gestiona el fallo. | Sí |

Por qué `server-only` solo en la capa de arriba: Bun no resuelve el paquete `server-only` (lo aporta Next), así que un script que lo importe no arranca. Las dos capas de abajo no tienen secretos en el código (la clave sale de `process.env`, que en el navegador no existe), igual que `src/lib/ia.ts`. La capa de arriba importa `fuente-catalogo.ts`, que ya es `server-only`.

## Pasos

Cada paso es un commit. Tras cada uno: `bun run typecheck` y `bun scripts/unitarias.ts`.

### Paso 1 · `src/lib/embeddings.ts`

Sale de `scripts/indexado/comun.ts` (función `embeber` y `normalizar`), sin lotes ni pausas: eso es cosa del script.

```ts
// Embeddings de HelmCode (API compatible con OpenAI). Lo usan la app y los
// scripts de indexado. Solo en el servidor: la clave sale de process.env.
export const MODELO_EMBEDDINGS = "qwen3-embedding";
export const DIMENSIONES = 1536;

// Una sola petición. Devuelve un vector por texto, en el mismo orden,
// normalizado a longitud 1 y redondeado a 5 decimales.
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
  const data = (await res.json()) as { data: { index: number; embedding: number[] }[] };
  if (data.data.length !== textos.length) throw new Error("Embeddings: respuesta incompleta");
  return data.data.sort((a, b) => a.index - b.index).map((d) => normalizar(d.embedding));
}

function normalizar(v: number[]): number[] {
  const corto = v.slice(0, DIMENSIONES);
  const norma = Math.hypot(...corto) || 1;
  return corto.map((x) => Math.round((x / norma) * 1e5) / 1e5);
}
```

Sin reintentos ante 429: la herramienta tiene que ser rápida; si falla, la capa de arriba degrada a la lista completa.

`scripts/indexado/comun.ts` cambia:
- Borra `MODELO_EMBEDDINGS`, `DIMENSIONES`, `normalizar` y el cuerpo HTTP de `embeber`.
- `embeber(textos)` queda como bucle de lotes de 32 con `PAUSA_IA_MS` que llama a `embeber` de `src/lib/embeddings` (importado con otro nombre, p. ej. `embeberLote`).
- `evaluar.ts` importa `MODELO_EMBEDDINGS` y `DIMENSIONES` de `src/lib/embeddings`.

### Paso 2 · `src/lib/buscador.ts`

```ts
import indice from "@/datos/vectores.json";
import { embeber } from "./embeddings";

// Búsqueda semántica sobre src/datos/vectores.json (docs/index_specification.md).
// Sin estado: ni la frase ni su vector se guardan (regla 3).

export type Coincidencia = { id: string; similitud: number };

export const LIMITE_POR_DEFECTO = 10;

type Item = { id: string; vectores: number[][] };
const items: Item[] = indice.items;
const prefijo: string = indice.instruccion_consulta ?? "";

const producto = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

// Similitud de un trámite: la mejor entre sus vectores (la variante C tiene
// varios; la D, uno). Los vectores están normalizados: producto = coseno.
export const similitud = (consulta: number[], vectores: number[][]) =>
  Math.max(...vectores.map((v) => producto(consulta, v)));

// Pura y síncrona: la usan buscar() y las pruebas.
export function ordenar(consulta: number[], limite = LIMITE_POR_DEFECTO): Coincidencia[] {
  return items
    .map((item) => ({ id: item.id, similitud: Math.round(similitud(consulta, item.vectores) * 1e4) / 1e4 }))
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, Math.max(1, Math.min(limite, items.length)));
}

// La frase lleva delante la instrucción con la que se evaluó el índice.
export const textoConsulta = (frase: string) => prefijo + frase;

export async function buscar(
  frase: string,
  { limite = LIMITE_POR_DEFECTO, signal }: { limite?: number; signal?: AbortSignal } = {},
): Promise<Coincidencia[]> {
  const [vector] = await embeber([textoConsulta(frase)], { signal });
  return ordenar(vector, limite);
}
```

Notas:
- `vectores.json` pesa ~1 MB y se importa estático: entra en el bundle del servidor y Vercel lo incluye sin configuración. No lo importa ningún componente de cliente.
- Si TypeScript tarda demasiado en inferir el tipo del JSON grande, se cambia por `readFileSync` con `path.join(process.cwd(), "src/datos/vectores.json")` y `outputFileTracingIncludes` en `next.config.ts`. Solo si hace falta: medir `bun run typecheck` antes y después.
- `scripts/indexado/evaluar.ts` deja su `producto` y su `Math.max(...)` y usa `similitud` de aquí (código duplicado fuera).

### Paso 3 · Catálogo con las 37 entradas

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

`sede.valencia.es` ya tiene nombre en `src/datos/nombres-fuentes.ts`. Las notas de València no hablan al equipo: no hace falta tocar `src/datos/notas.ts`.

Comprobar que `/api/consulta` sigue igual: el motor simulado solo devuelve ids de los 21.

### Paso 4 · La herramienta del agente: `src/lib/herramientas/buscar-tramites.ts`

```ts
import "server-only";
import { buscar, LIMITE_POR_DEFECTO } from "@/lib/buscador";
import { catalogo } from "@/lib/fuente-catalogo";
import type { Entrada } from "@/lib/entrada";

// Herramienta del agente: de una frase del ciudadano a los trámites más
// parecidos del catálogo (decisiones.md, punto 18). Uso directo:
//   const { candidatos } = await buscarTramites("me han echado del trabajo");
// O como herramienta de HelmCode: `definicion` va en `tools` y, cuando el
// modelo la pide, `ejecutar(argumentos)` devuelve lo que se le contesta.

export type Candidato = Pick<Entrada, "id" | "titulo" | "tipo" | "organismo" | "administracion"> & {
  similitud: number | null; // null si el buscador no respondió
};

export type ResultadoBusqueda = {
  candidatos: Candidato[];
  aviso?: string; // solo si se devuelve el catálogo entero por un fallo
};

const MAX_CARACTERES = 1000;

function candidato(e: Entrada, similitud: number | null): Candidato {
  const { id, titulo, tipo, organismo, administracion } = e;
  return { id, titulo, tipo, organismo, administracion, similitud };
}

export async function buscarTramites(
  frase: string,
  opciones: { limite?: number; signal?: AbortSignal } = {},
): Promise<ResultadoBusqueda> {
  const texto = frase.trim().slice(0, MAX_CARACTERES);
  if (!texto) return { candidatos: [] };
  try {
    const coincidencias = await buscar(texto, opciones);
    const candidatos: Candidato[] = [];
    for (const c of coincidencias) {
      const e = await catalogo.obtener(c.id);
      if (e) candidatos.push(candidato(e, c.similitud));
    }
    return { candidatos };
  } catch {
    if (opciones.signal?.aborted) throw opciones.signal.reason;
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
      "Busca en el catálogo de Brújula (trámites y ayudas para quien vive en València) los más parecidos a lo que necesita el ciudadano. Devuelve id, título, tipo, organismo y similitud (0 a 1), de más a menos parecido. Llámala antes de hablar de un trámite concreto; con el id se obtiene la ficha completa.",
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
          maximum: 37,
          description: `Cuántos trámites devolver. Por defecto, ${LIMITE_POR_DEFECTO}.`,
        },
      },
      required: ["consulta"],
      additionalProperties: false,
    },
  },
} as const;

// Ejecuta la llamada que pide el modelo. `argumentos` es el JSON (texto) que
// trae `tool_calls[i].function.arguments`.
export async function ejecutar(argumentos: string, signal?: AbortSignal): Promise<ResultadoBusqueda> {
  let args: unknown;
  try {
    args = JSON.parse(argumentos);
  } catch {
    throw new Error("buscar_tramites: argumentos no son JSON");
  }
  const { consulta, limite } = (args ?? {}) as { consulta?: unknown; limite?: unknown };
  if (typeof consulta !== "string") throw new Error("buscar_tramites: falta «consulta»");
  return buscarTramites(consulta, {
    limite: Number.isInteger(limite) ? (limite as number) : undefined,
    signal,
  });
}
```

Notas:
- No se registra la frase en ningún `console.*` (regla 3).
- La minimización de DNI, correos y teléfonos (`src/lib/minimizar.ts`) la hace quien llama, igual que `/api/consulta` antes del motor. Se documenta en el comentario de cabecera.

### Paso 5 · Pruebas

**`scripts/unitarias.ts`** (sin red; se añaden casos al final, con el mismo `comprobar`):
1. `vectores.json`: `dimensiones === DIMENSIONES`, cada vector mide 1.536 y su norma está entre 0,999 y 1,001.
2. Los ids de `vectores.json` y los de los dos catálogos (`datos/catalogo-tramites-ayudas.json` + `src/datos/catalogo-valencia.json`, leídos directamente) son el mismo conjunto, sin repetidos.
3. `ordenar(vectorDe("multa-dgt"))[0].id === "multa-dgt"` y `similitud` ≈ 1.
4. `ordenar(v).length === 10`; `ordenar(v, 3).length === 3`; `ordenar(v, 0).length === 1`; `ordenar(v, 999).length === 37`.
5. `ordenar` va de mayor a menor similitud.
6. `ordenar` tarda menos de 5 ms de media en 1.000 llamadas.

**`scripts/probar-buscador.ts`** (nuevo, con red; `bun scripts/probar-buscador.ts`):
1. Precisión: las 40 frases de `src/datos/pruebas-indice.json`, convertidas con `textoConsulta()` en **una sola** llamada a `embeber`. Con `ordenar(v, 10)` calcula top 1, top 3 y top 10. Falla (exit 1) si top 10 < 100 % o top 3 < 95 %. Imprime los fallos de top 3.
2. Velocidad: 5 llamadas seguidas a `buscar()` con frases distintas, con 1 s entre ellas. Imprime cada tiempo y la mediana. Falla si la mediana pasa de 1.000 ms.
3. En total, 6 llamadas a la API: respeta los límites compartidos.

**Herramienta** (con el servidor de desarrollo, `bun run dev`): una ruta de prueba no hace falta. Se prueba con un script de un solo uso en el scratchpad que no se sube, o importándola desde una ruta temporal. Lo mínimo: `bun run build` pasa y `curl` a `/api/consulta` con «quiero votar por correo» sigue devolviendo `respuesta` con la entrada `voto-por-correo`.

### Paso 6 · Documentación

- `docs/index_specification.md`, sección 7 «Pendiente»: quitar «Usar `vectores.json` en la búsqueda de la app» y añadir una sección «Uso en la app» con las tres capas, la llamada de ejemplo y el comando de las pruebas.
- `decisiones.md`: punto nuevo con lo que se haya decidido al implementar (por ejemplo, sin reintentos ante 429, `server-only` solo en la herramienta), con fecha.
- `package.json`: script `"probar:buscador": "bun scripts/probar-buscador.ts"`.

## Verificación final

1. `bun run typecheck` y `bun run build` pasan.
2. `bun scripts/unitarias.ts`: todo ✓.
3. `bun scripts/probar-buscador.ts`: top 10 = 100 %, top 3 ≥ 95 %, mediana < 1.000 ms.
4. `bun run dev` y `curl -s localhost:3000/<equipo>/api/consulta -d '{"historial":[{"rol":"ciudadano","texto":"quiero votar por correo"}]}'` devuelve `tipo: "respuesta"`.
5. `grep -rn "console\." src/lib/buscador.ts src/lib/embeddings.ts src/lib/herramientas` no encuentra nada.

## Riesgos

- **Límites compartidos de HelmCode:** cada búsqueda es una llamada. El agente no debe llamar a la herramienta por cada tecla; una vez por mensaje del ciudadano.
- **Tipo inferido del JSON grande:** ver la nota del paso 2.
- **Catálogo con 37 entradas en `/api/consulta`:** el motor simulado no cambia, pero las rutas de cada entrada (si se añaden) mostrarán también las de València.
