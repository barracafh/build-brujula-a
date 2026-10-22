# Brújula · Especificación de la indexación

Cómo traemos los trámites que faltan, cómo los estructuramos y cómo los convertimos en embeddings. **El retrieval (cómo se busca en el índice) queda fuera de este documento** y se define después. El porqué de cada decisión está en `decisiones.md`.

## 1. Alcance

| Entra | No entra |
|---|---|
| Los 21 trámites de `datos/catalogo-tramites-ayudas.json` (solo se leen y se crea su embedding) | Rastrear GVA, Labora, SEPE o DGT |
| Los 16 trámites de València enlazados desde la página de trámites de `SETUP.md` que la sede sirvió (UR.LC.10 dio error) | El catálogo completo de `sede.valencia.es` (cientos de trámites [sin verificar]) |
| Estructurarlos con el formato del catálogo de la organización | PDFs e impresos enlazados (se guarda solo su URL) |
| Embeddings con `qwen3-embedding` a 1.536 dimensiones | El retrieval: búsqueda, umbral, reranker e integración con Jev |

**Resultado: 37 trámites** (21 + 16), todos con ficha completa y vector.

## 2. Fuentes

1. **Catálogo de la organización:** `datos/catalogo-tramites-ayudas.json`. Solo se lee, no se edita.
2. **Página de trámites de `SETUP.md`:** `https://www.valencia.es/val/participacio/juntes-municipals-de-districte/tramits-gestions-i-servicis`, que redirige a `https://www.valencia.es/cas/participacion/juntas-municipales-de-distrito/tramites-gestiones-y-servicios`.
3. **Fichas de la sede:** `https://sede.valencia.es/sede/registro/procedimiento/<código>?lang=1`, una por trámite.

Los 16 trámites de la página de `SETUP.md`, capturados el 22/10/2026:

| Código | Trámite |
|---|---|
| TR.OT.15 | Emisión Bono Oro EMT |
| TR.OT.60 | Emisión del Bono EMT AMBTU |
| LA.AS.10 | Comunicaciones Ambientales de Actividad Inocua sin obras |
| LA.AC.65 | Declaración Responsable de Obras Tipo II y Comunicación de Actividad Inocua |
| VP.OC.30 | Contenedores de Obra Comunicación Ambiental con obras tipo Declaración Responsable Tipo II |
| LA.AI.10 | Comunicación de Cambio de Titularidad Actividad Inocua |
| LA.AI.90 | Denuncia molestias aire acondicionado Actividad Inocua |
| LA.OT.10 | Certificado referido a antecedentes de la existencia de una Actividad Inocua en local |
| UR.LC.135 | Licencia de Obras Tipo II |
| UR.LC.140 | Declaración Responsable de Obra Tipo II |
| ~~UR.LC.10~~ | Comunicación previa a la ejecución de Obras. **Fuera:** la sede dio error dos veces |
| VP.PU.55 | Licencia de publicidad |
| PC.OT.20 | Certificados de fe de vida |
| CU.US.10 | Solicitud de uso de las Salas de Exposiciones de las Juntas Municipales |
| PC.AE.10 | Inscripción en el Registro Municipal de Entidades (URL `WEB_ASSET_CRG_0141`) |
| PC.AE.40 | Actualización de datos en el Registro Municipal de Entidades (URL `WEB_ASSET_1_20170000428694`) |
| PC.AE.50 | Comunicación anual de Datos al Registro Municipal de Entidades |

## 3. Pipeline

```
fuentes-valencia.json ─► [1] Captura (Chrome) ─► [2] Estructuración (glm5.3-flash)
   ─► [3] Validación automática ─► [4] Revisión por Claude ─► catalogo-valencia.json
   ─► [5] Embeddings (qwen3-embedding, 1536) ─► vectores.json
```

### [0] Entrada

`src/datos/fuentes-valencia.json`: un objeto por trámite, `{ codigo, nombre, url }`, sacado de la tabla anterior.

### [1] Captura con Chrome (Claude in Chrome)

- Una sola pestaña y una ficha cada 10 s, sin paralelo. Solo esas 16 URLs: no se siguen enlaces ni se descargan PDFs.
- Por ficha se guarda `.cache/indexado/sede/<codigo de la URL>.txt`: cabecera `URL_FINAL` y `CONSULTADO`, el texto visible entre `---` y la lista de enlaces (`texto -> url`). Repeticiones literales se sustituyen por una nota `[Captura: …]`; las cifras se conservan todas.
- Es una decisión consciente del equipo: queda fuera de la franja `Visit-time` del robots.txt de la sede (punto 10 de `decisiones.md`).

### [2] Estructuración

- Una llamada a `glm5.3-flash` por ficha (16 en total), con 3 s entre llamadas. Ante un 429 se espera lo que indique `retry-after`.
- El modelo recibe el texto literal y devuelve **el mismo formato que `datos/catalogo-tramites-ayudas.json`**: `id`, `tipo`, `titulo`, `administracion`, `organismo`, `requisitos_clave`, `pasos`, `documentacion`, `plazo`, `enlace_info`, `enlace_tramite`, `fuente`, `frases_usuario`.
- Reglas del prompt:
  - Solo extrae lo que está en la ficha. Si un campo falta, `null`.
  - `frases_usuario` (5, en castellano y en valenciano) es lo único que puede redactar libremente.
  - `resumen_sencillo` (campo extra, 2–3 frases en lenguaje llano) solo sirve para el embedding y nunca se muestra.
- Lo que devuelve se guarda en `.cache/indexado/fichas/<codigo>.json`. Si se relanza, no repite las llamadas ya hechas.

### [3] Validación automática

- Cada cifra, importe, plazo o fecha de los campos visibles y de `resumen_sencillo` tiene que aparecer literalmente en `texto`. Si no, la ficha se marca `revisar` y el campo se anula.
- `fuente` y `enlace_tramite` son la URL de la ficha capturada.
- La ficha se queda en `verificado: false`.

### [4] Revisión por Claude (agente)

- Claude, el agente de desarrollo y no el LLM del pipeline, compara cada ficha campo a campo con el texto capturado en `.cache/indexado/sede/<codigo>.json`.
  - Cada requisito, paso, documento y plazo tiene que estar respaldado por el texto. Lo que no lo esté se quita.
  - Lo que esté en la ficha y falte en la salida, se añade.
  - Se comprueba que `fuente` y `enlace_tramite` son la URL capturada.
- Si la ficha supera la revisión, se marca `verificado: true` y en `nota`: «Revisado por IA contra la ficha oficial el AAAA-MM-DD». Si queda alguna duda, `verificado: false` y la duda en `nota`. La app la trata como no verificada.
- Claude deja en `.cache/indexado/revision.md` qué ha cambiado en cada ficha.
- El resultado es `src/datos/catalogo-valencia.json`, con la misma cabecera que el catálogo de la organización (`version`, `ambito`, `aviso`, `items`).

### [5] Embeddings

- Modelo `qwen3-embedding` en `${HELMCODE_BASE_URL}/embeddings`, con `dimensions: 1536` (comprobado que lo acepta). Lotes de 32 y 3 s entre lotes.
- Cada vector se normaliza a longitud 1 y se redondea a 5 decimales.
- Se generan **tres variantes** para los 37 trámites. Cuál se usa lo decide la evaluación (sección 5):

| Variante | Texto que se convierte en vector | Vectores por trámite |
|---|---|---|
| A | `titulo` + `requisitos_clave` + `documentacion` | 1 |
| C | A + un vector por cada `frase_usuario`; el trámite puntúa con el mejor | 1 + N |
| D | `resumen_sencillo` + texto de A (resumen delante, como Contextual Retrieval) | 1 |

- Para los 21 de la organización, `resumen_sencillo` se genera igual: 21 llamadas al LLM. Se guarda en `src/datos/resumenes-catalogo.json` sin tocar `datos/`.

## 4. Dónde se guarda

```
src/datos/fuentes-valencia.json     entrada: 16 URLs                         se sube
.cache/indexado/sede/*.txt          texto capturado                          NO se sube (.gitignore)
.cache/indexado/fichas/*.json       salida del LLM sin revisar               NO se sube
src/datos/catalogo-valencia.json    16 fichas revisadas                      se sube
src/datos/resumenes-catalogo.json   resumen_sencillo de los 21 de la org.    se sube
src/datos/vectores.json             vectores A, C y D de los 37              se sube (~1–2 MB)
```

Forma de `vectores.json`:

```json
{
  "modelo": "qwen3-embedding",
  "dimensiones": 1536,
  "generado": "2026-10-22T21:00:00Z",
  "items": [
    { "id": "UR.LC.140", "origen": "valencia",
      "A": [ ... ], "D": [ ... ], "C": [[ ... ], [ ... ]] }
  ]
}
```

No se guarda nada de lo que escribe el ciudadano. La clave de la IA solo está en `.env.local` y en Vercel.

## 5. Evaluación (para elegir la variante)

- Alguien del equipo escribe 20–30 preguntas **sin mirar `frases_usuario` ni el catálogo**, con su respuesta esperada: `{ frase, esperado, idioma }`. Se guardan en `src/datos/pruebas-indice.json`.
- `src/datos/pruebas.json` no sirve para esto: repite frases literales del catálogo.
- Métrica: acierto en el top 1 y en el top 3 para A, C y D. Gana la mejor en el top 3; si hay empate, la más simple (A).

## 6. Consumo de la clave compartida

| Paso | Llamadas |
|---|---|
| Estructuración de los 16 | 16 al LLM |
| `resumen_sencillo` de los 21 | 21 al LLM |
| Embeddings (A + D + C, unos 300 textos) | ~10 lotes |
| Evaluación (30 preguntas) | 1 lote |

En total, menos de 50 llamadas, una sola vez.

## 7. Pendiente

- Escribir las preguntas de evaluación (sección 5).
