# Plan: fichas en valenciano

Decisión de partida (`decisiones.md`, puntos 21 a 23). Revisado una vez por Codex: los 7 hallazgos están aplicados y marcados en el texto.

La decisión:

- se busca siempre con los embeddings en castellano;
- cuando el idioma de la consulta es valenciano, se muestra la ficha traducida de antemano;
- lleva el aviso «Traducció automàtica sense revisar», porque nadie la ha revisado.

Rama `fichas-valenciano`, desde `origin/main` (2119957).

## Flujo

1. El ciudadano escribe.
2. `/api/consulta` responde con `entrada` e `idioma` (el de Jev, o el del LLM si Jev falla). Ya funciona así.
3. **Nuevo:** `/api/consulta` (cuando `tipo: "respuesta"`) y `/api/entradas/[id]` añaden a la entrada un campo `va`, con la traducción o `null`. El catálogo (`catalogo.obtener`/`listar`) **no cambia**. Así el agente, `buscar_tramites` y los demás consumidores nunca ven la traducción sin revisar (Codex, hallazgo 3).
4. **Nuevo:** `RespuestaCompuesta` muestra `e.va` cuando `idioma === "va"`, con el aviso y `lang="ca"`. Si `e.va` es `null`, muestra el castellano como hoy, con la marca «Contingut oficial en castellà».
5. El botón de idioma cambia `c.idioma`, y la ficha cambia sin otra petición, porque las dos versiones ya están en el cliente.

**No cambian:**

- la búsqueda (embeddings, Jev, LLM);
- el audio pregenerado: la versión `va` sigue leyendo el contenido en castellano con las etiquetas en valenciano, igual que hoy;
- el chat de la ficha;
- el `FichaTramite` antiguo de `Buscador.tsx`, que no usa ninguna página.

## Paso 1: traducir las 37 fichas (script, una sola vez)

**Archivo nuevo:** `scripts/traducir-fichas.ts`. Se ejecuta con el preload de Bun, porque `fuente-catalogo` importa `server-only`:

```
HELMCODE_MODEL=deepseek-v4-flash bun --preload ./scripts/sin-server-only.ts --env-file=.env.local scripts/traducir-fichas.ts
```

y en `package.json`:

```
"traducir:fichas": "bun --preload ./scripts/sin-server-only.ts scripts/traducir-fichas.ts"
```

**Qué traduce.** De cada `Entrada` normalizada (`catalogo.listar()`, con las notas ya sustituidas):

- se traducen `titulo`, `organismo`, `administracion`, `requisitos_clave`, `pasos`, `documentacion`, `plazo` y `nota`;
- no se tocan ids, URLs, `fuentes`, `relacionados`, `frases_usuario` ni `verificado`.

**Cómo llama a la IA:**

- lotes de 3 fichas por llamada a `completar()`, en serie, con `PAUSA_IA_MS` (3 s) entre llamadas;
- si un lote falla la validación de forma, se repite una vez;
- caché en `.cache/fichas-va/cache.json` (ya ignorada por `.cache/`), con clave = sha256 de `VERSION + JSON de los campos`. Relanzarlo solo traduce lo que cambió.

**Prompt de sistema:**

```
Tradueixes al valencià fitxes de tràmits per a la versió en valencià d'una web pública: traducció fidel i formal.
- Valencià normatiu de l'AVL amb formes valencianes (presentar, sol·licitud, este, eixir).
- No traduïsques sigles, noms de lleis ni noms propis d'organismes que no tinguen nom oficial en valencià. «Valencia» → «València».
- Copia exactament xifres, imports, dates, terminis, telèfons, adreces web i codis de procediment.
- No afegisques ni lleves informació. Mantín el nombre d'elements de cada llista i el seu ordre.
- Si un camp és null, torna null.
Respon NOMÉS amb un objecte JSON {"<id>": {"titulo", "organismo", "administracion", "requisitos_clave", "pasos", "documentacion", "plazo", "nota"}}.
```

**Validación** (función pura `validarTraduccion(es, va): string[]`, en `src/lib/traduccion.ts` para poder probarla). La lista vacía significa válida. Se compara **campo a campo y, en las listas, elemento a elemento** (Codex, hallazgo 4):

1. `va` es un objeto con **exactamente** las 8 claves de `CAMPOS_TRADUCIBLES`; una clave de más es un error (Codex, hallazgo 2). Si en castellano un campo es `null`, en valenciano también; si no, es un texto no vacío.
2. Las listas tienen la misma longitud y no hay ningún elemento vacío.
3. **Cifras:** en cada texto, la lista ordenada de `cifras()` es idéntica. `cifras` se mueve de `scripts/indexado/comun.ts` a `src/lib/traduccion.ts`, y `comun.ts` la importa de ahí.
4. **Meses:** en cada texto, los meses del castellano (enero…diciembre) son los mismos que los del valenciano (gener, febrer, març, abril, maig, juny, juliol, agost, setembre, octubre, novembre, desembre), comparados como listas ordenadas de números de mes.
5. **Tipo de días:** si el castellano dice «hábil(es)», el valenciano dice «hàbil(s)»; si dice «natural(es)», «natural(s)». Y al revés.
6. **URLs:** el conjunto de `/https?:\/\/[^\s)»"]+/g` es idéntico.
7. **Códigos:** el conjunto de `/\b[A-Z]{2}\.[A-Z]{2}\.\d+\b/g` es idéntico.

Lo que no se puede validar así (una negación o una condición cambiadas) queda cubierto por el aviso de traducción sin revisar. Se apunta en `decisiones.md`.

Una ficha que no valida **no entra** en la salida (se mostrará en castellano), y el script la imprime con el motivo.

**Huella del original** (Codex, hallazgo 5). Cada traducción guarda `huella`: FNV-1a de 32 bits, en hexadecimal, del JSON de los 8 campos castellanos en el orden de `CAMPOS_TRADUCIBLES`. La calcula `huella(es)`, una función pura de `src/lib/traduccion.ts` sin `node:crypto`. Al cargar, si la huella no coincide con la del castellano actual, se usa el castellano: una corrección posterior del catálogo nunca deja visible una traducción vieja.

**Salida:** `src/datos/catalogo-va.json` (se sube):

```json
{
  "modelo": "deepseek-v4-flash",
  "generado": "2026-10-22T…",
  "revisado": false,
  "items": {
    "voto-por-correo": { "huella": "9f1c2a3b", "titulo": "…", "organismo": "…", "administracion": "…", "requisitos_clave": ["…"], "pasos": ["…"], "documentacion": ["…"], "plazo": "…", "nota": null }
  }
}
```

**Al terminar,** el script imprime cuántas fichas tradujo, cuántas no y por qué.

## Paso 2: tipos y lógica (`src/lib/entrada.ts`, `src/lib/traduccion.ts`, rutas)

En `src/lib/entrada.ts` (la `Entrada` **no cambia**):

```ts
// Campos de la ficha que se traducen (decisiones.md, punto 23).
export const CAMPOS_TRADUCIBLES = [
  "titulo", "organismo", "administracion", "requisitos_clave",
  "pasos", "documentacion", "plazo", "nota",
] as const;
export type Traduccion = Pick<Entrada, (typeof CAMPOS_TRADUCIBLES)[number]>;

// Lo que reciben la interfaz y /api/entradas: la entrada y su traducción
// automática sin revisar (null → se muestra en castellano).
export type EntradaConTraduccion = Entrada & { va: Traduccion | null };
```

**Archivo nuevo:** `src/lib/traduccion.ts`, sin `server-only`, porque lo usan el cliente, el servidor y los scripts:

```ts
import { CAMPOS_TRADUCIBLES, type Entrada, type EntradaConTraduccion, type Traduccion } from "./entrada";

// Movida tal cual desde scripts/indexado/comun.ts.
export const cifras = (texto: string): string[] => …;

export const campos = (e: Traduccion): Traduccion =>
  Object.fromEntries(CAMPOS_TRADUCIBLES.map((c) => [c, e[c]])) as Traduccion;

// FNV-1a 32 bits del JSON de los campos castellanos, en hexadecimal.
export function huella(es: Traduccion): string { … }

export function validarTraduccion(es: Traduccion, va: unknown): string[] { … } // reglas del paso 1

// La versión que se muestra. Copia solo los campos traducibles: ni id ni URLs
// ni `verificado` pueden venir de la traducción.
export function enIdioma(e: EntradaConTraduccion, idioma: "es" | "va"): { entrada: Entrada; traducida: boolean } {
  const { va, ...original } = e;
  if (idioma !== "va" || !va) return { entrada: original, traducida: false };
  return { entrada: { ...original, ...campos(va) }, traducida: true };
}
```

**Archivo nuevo:** `src/lib/traducciones.ts` (`server-only`):

```ts
import "server-only";
import traduccionesJson from "@/datos/catalogo-va.json";
import { CAMPOS_TRADUCIBLES, type Entrada, type EntradaConTraduccion, type Traduccion } from "./entrada";
import { campos, huella, validarTraduccion } from "./traduccion";

const items = traduccionesJson.items as Record<string, unknown>;

// Se valida al usarla: si la huella no coincide (el castellano cambió) o una
// cifra no cuadra, la ficha vuelve al castellano en vez de mostrar un dato falso.
export function conTraduccion(e: Entrada): EntradaConTraduccion {
  const t = items[e.id] as ({ huella?: unknown } & Record<string, unknown>) | undefined;
  if (!t || t.huella !== huella(campos(e))) return { ...e, va: null };
  const { huella: _, ...va } = t;
  return { ...e, va: validarTraduccion(campos(e), va).length === 0 ? campos(va as Traduccion) : null };
}
```

Como el JSON es fijo, el resultado se puede memorizar en un `Map` por id.

**Rutas:**

- `src/app/api/consulta/route.ts`, en `completar()`: `return entrada ? { tipo: r.tipo, entrada: conTraduccion(entrada), idioma: r.idioma } : null;`.
- `src/app/api/entradas/[id]/route.ts`: `Response.json(conTraduccion(entrada))`.
- `src/lib/consulta.ts`: `{ tipo: "respuesta"; entrada: EntradaConTraduccion }`.

**Cliente.** `src/components/flujo/useConversacion.ts` guarda la entrada en el estado. Donde hoy tipa `Entrada` para la respuesta, pasa a `EntradaConTraduccion`, incluido lo que recibe de `/api/entradas`. El implementador busca cada `Entrada` en `src/components/flujo/` y la cambia solo donde llega a `RespuestaCompuesta`. Al historial del chat (`entradaAbierta`) solo va el id: no cambia.

## Paso 3: interfaz (`src/components/respuesta/`)

**En `textos.ts`:**

- se añaden `traduccionAutomatica`, `avisoTraduccion` y `audioCastellano` en los dos idiomas (en `es` no se muestran, pero se necesitan por el `satisfies`):
  - va: `"Traducció automàtica sense revisar"`, `"Esta fitxa s'ha traduït automàticament i ningú l'ha revisada. El text oficial, en castellà, és el de la font enllaçada."` y `"L'àudio llig el contingut en castellà."`;
  - es: `"Traducción automática sin revisar"`, `"Esta ficha se ha traducido automáticamente y nadie la ha revisado. El texto oficial es el de la fuente enlazada."` y `"El audio lee el contenido en castellano."`;
- el comentario de cabecera ya no dice que el contenido sea siempre castellano.

**En `RespuestaCompuesta.tsx`:**

```tsx
export function RespuestaCompuesta({ entrada: conVa, idioma, refTitular }: { entrada: EntradaConTraduccion; … }) {
  const { entrada: e, traducida } = enIdioma(conVa, idioma);
  const { va: _, ...original } = conVa;
  const lc = traducida ? "ca" : "es"; // lang del contenido
  const fechas = fechasAbiertas(original); // busca la fecha en letra en el plazo castellano
  …
```

- Todos los `lang="es"` del contenido pasan a `lang={lc}`: `h1`, organismo, `ol` de pasos, plazo, nota, `ul` de `TarjetaLista` (recibe `lang` como prop) y «Dónde se hace». El de `<Fuentes />` se queda en `"es"`.
- **Insignia:** con `idioma === "va"`, si `traducida` es `tx.traduccionAutomatica`, con el icono `Languages` de lucide; si no, `tx.contenidoCastellano`, como hoy. Debe poder partirse en varias líneas a 320 px: `className="h-auto max-w-full min-w-0 whitespace-normal"` (Codex, hallazgo 6; el `Badge` trae `whitespace-nowrap shrink-0`).
- **Aviso:** con `traducida`, un párrafo debajo del organismo, con el mismo estilo que el de «sin verificar» pero con `ring-border` (no rojo) y el icono `Languages`: `tx.avisoTraduccion`.
- **`Escuchar`** (Codex, hallazgo 7): recibe `original.id`, y el audio no cambia. Con `traducida`, recibe además `nota={tx.audioCastellano}`, que:
  - se muestra debajo del botón (`text-sm text-(--text-secondary)`);
  - se añade al final del `aria-label`.

  Sin pista de audio no se muestra nada, como hoy.
- **`enlaceGoogleCalendar(e, f, idioma)`:** con la `e` traducida: título y plazo del evento en valenciano. Las URLs no cambian.

**En `Flujo.tsx` y `piezas.tsx`:** «Volver a», las candidatas de la aclaración y las recientes siguen en castellano, porque `Resumen` no lleva traducción. Queda fuera de este plan para no tocar el `localStorage` de recientes.

## Paso 4: pruebas sin red (`scripts/unitarias.ts`)

Nuevos casos, antes del resumen final:

- `enIdioma`:
  - con `va` e idioma `va` → traducida, el título es el de `va` y el id y las URLs son los originales;
  - con idioma `es` → original y sin la clave `va`;
  - con `va: null` → original, `traducida: false`;
  - una `va` con `enlace_tramite` de más no lo cambia.
- `validarTraduccion`:
  - una traducción correcta → `[]`;
  - cifra cambiada (`1,50` → `150`) → error;
  - «noviembre» → «desembre» → error;
  - «15 días hábiles» → «15 dies naturals» → error;
  - lista con un elemento menos → error;
  - URL distinta → error;
  - `plazo` null en es y texto en va → error;
  - campo que falta → error;
  - clave de más → error;
  - `va` no es un objeto → error.
- `huella`:
  - es estable (mismo valor dos veces);
  - cambia si cambia una coma de un paso.
- `guionAudio(entrada)` es igual para la entrada castellana y para la que sale de `enIdioma(..., "es")`: el audio sigue igual.
- **Catálogo real** (`scripts/probar-fichas-va.ts`, con el preload de `sin-server-only.ts`, sin red):
  - todas las entradas de `catalogo-va.json` corresponden a un id del catálogo;
  - `conTraduccion` devuelve `va` distinto de `null` para todas: ninguna se descarta sin avisar.

  En `package.json`: `"probar:fichas-va": "bun --preload ./scripts/sin-server-only.ts scripts/probar-fichas-va.ts"`.

## Paso 5: decisiones y documentación

- `decisiones.md`: pasar los puntos de la sesión, que estaban sin subir en otra rama:
  - 21: preguntas en valenciano, medir primero;
  - 22: medido, no se indexa en valenciano;
  - 23: fichas en valenciano con aviso.
- `docs/valenciano_specification.md` y los scripts `scripts/valenciano/` de la rama `evaluacion-valenciano` se suben aparte. No son parte de este plan.

## Paso 6: comprobar que todo funciona

1. `bun run typecheck`, `bun scripts/unitarias.ts`, `bun scripts/unitarias-chat.ts`.
2. `bun run build`. Si sale el aviso de seguridad de Next, se reintenta; no se actualiza Next.
3. `bun run probar:buscador`, `bun run probar:agente` y `bun scripts/probar.ts`: lo que ya había sigue igual.
4. API con `bun run dev`:
   - `POST /api/consulta` con «m'han acomiadat i vull demanar l'atur» → `idioma: "va"` y `entrada.va` con título en valenciano;
   - con «me han echado del trabajo» → `idioma: "es"` y `entrada.va` presente (la interfaz no la usa);
   - `GET /api/entradas/voto-por-correo` → trae `va`.
5. Navegador (Claude in Chrome) en `http://localhost:3000/<equipo>`:
   - consulta en valenciano → ficha en valenciano, insignia y aviso visibles;
   - botón de idioma a castellano → ficha en castellano sin aviso, y vuelta;
   - consulta en castellano → como antes;
   - aclaración → elegir candidata → ficha en el idioma de la interfaz;
   - «Escuchar» y «Afegir a Google Calendar» en `voto-por-correo`;
   - chat de la ficha (una pregunta);
   - a 320 px, sin scroll horizontal.
