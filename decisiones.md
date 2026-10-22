# Decisiones y restricciones

Registro de lo que vamos descubriendo y decidiendo. Lo más reciente, al final de cada sección. `[sin verificar]` = no comprobado todavía.

## Contexto fijado (22/10/2026)

- Demo de hackathon, **no va a producción**.
- Solo usamos **la clave de HelmCode que da la organización**. NaN y HelmCode son la misma empresa (Helmcode S.L.) y la misma API: `api.helmcode.com` aparece en https://nan.builders/docs/models como URL alternativa.
- Ámbito del índice: **solo València ciudad**.
- Embeddings a **1.536 dimensiones**, no 4.096.

## Restricciones encontradas

### robots.txt y franjas horarias

- **`sede.valencia.es`**: `Visit-time: 0200-0745`. **No la rastreamos durante el evento.** Sus enlaces se guardan como «dónde se hace», sin descargarlos.
- **`www.valencia.es`**: sin `Visit-time` ni `Crawl-delay`, y `/cas/tramites` está permitido. **Es la fuente que rastreamos**, con una petición cada 1 o 2 s y un User-Agent identificable.
- **gva.es, sede.gva.es, labora.gva.es y sepe.es** bloquean expresamente a los rastreadores de IA. **No los rastreamos**, ni siquiera con un User-Agent genérico. Los datos de la GVA, si hacen falta, salen del export del SIA.
- **administracion.gob.es (PAG)**: 1 petición por minuto, de 01:00 a 06:45 GMT, y las fichas necesitan JavaScript. El export XML/CSV del buscador funciona (POST a `/content/sling/endpoints/pag/front-elastic/actuacion-elastic/descargar`, con un máximo de 10.000 filas), pero no es una API documentada. El aviso legal exige citar el origen.

### Límites de la IA

- **La clave es compartida por todos los equipos.** AGENTS.md pide no llamarla en bucle.
- Límites: 60 peticiones por minuto por clave sumando todos los modelos y 7 simultáneas. Embeddings en lotes de 32. El reranker (`/v1/rerank`) admite 1.000 por minuto.
- Privacidad: procesan en la UE (país sin especificar), «zero logs», no entrenan con los datos y Cloudflare está delante. No hay contrato de encargado del tratamiento publicado.

### Infraestructura

- **No hay base de datos** ni acceso al panel de Vercel. Las claves solo se usan en el servidor.

### Calidad de las fuentes

- Muchas URLs del SIA llevan solo al dominio, son texto libre o fallan: 7 errores en una muestra de 25.
- Hay **páginas de error que responden 200**. Ejemplo: la DGT del SIA 202338 da 200 con el título «Page Not Found». Comprobar los enlaces mirando el contenido, no solo el código HTTP.
- `plazoResolucion` del SIA es el plazo para resolver, no para solicitar.

## Fuentes de datos (de dónde sale cada cosa)

| Capa | Fuente | Cómo |
|---|---|---|
| 21 trámites curados | `datos/catalogo-tramites-ayudas.json` (organización) | Se lee tal cual, no se edita |
| Índice de València (fuente principal, la que da `SETUP.md`) | `www.valencia.es/cas/participacion/juntas-municipales-de-distrito/tramites-gestiones-y-servicios` (la URL `/val/participacio/...` de SETUP.md redirige aquí) | Rastreo lento esta noche. Enlaza a 16 fichas de la sede |
| Complemento opcional (no está en el repo) | `www.valencia.es/cas/tramites` | Solo si falta cobertura |
| Enlace «dónde se hace» | `sede.valencia.es/sede/registro/procedimiento/...` | Se guarda la URL sin descargarla (Visit-time 02:00–07:45) |
| Trámites estatales y de la GVA | Export del SIA (administracion.gob.es) | Opcional. No es para el índice de València |

**Descartado: `opendata.vlci.valencia.es`.** Su API (CKAN) no devuelve ningún catálogo de trámites al buscar «tramites», «procedimientos» o «tramits»: solo estadísticas y registros (ORA, expedientes de derecho de acceso, libro de edificios, presupuestos). Comprobado el 22/10/2026.

Dominios del catálogo que **no** rastreamos: gva.es, sede.gva.es, labora.gva.es y sepe.es bloquean los rastreadores de IA; interior.gob.es bloquea ClaudeBot y GPTBot. Sus enlaces se muestran tal como vienen en el catálogo.

### Cómo está organizada la web de València (comprobado el 22/10/2026)

- `www.valencia.es/cas/tramites` **no es el catálogo completo**. Son unas 45 páginas de portal (Liferay, renderizado en el servidor), y muchas no son trámites para el ciudadano: oposiciones, perfil del contratante, legislación, novedades.
- **El catálogo real está en la sede**: `sede.valencia.es/sede/registro/indexM.xhtml?m=<materia>` y las fichas `.../registro/procedimiento/<código>`, por ejemplo `PA.CE.10` (certificado de padrón). Por su `Visit-time`, no se puede rastrear durante el evento.
- La web devuelve un 404 de verdad (con el título «Portal del Ayuntamiento de la ciudad de Valencia - València»), y algunas páginas redirigen con un 302.
- El `Visit-time: 0200-0745` se interpreta normalmente en UTC [sin verificar]. Serían las 04:00–09:45 en hora de València (CEST).

### IA: embeddings comprobados

- `qwen3-embedding` en `api.helmcode.com/v1/embeddings` **acepta `dimensions: 1536`** y devuelve vectores de 1.536 valores con la clave de la organización. Comprobado con una llamada el 22/10/2026.

## Decisiones

1. **Arquitectura híbrida.**
   - Jev clasifica entre los 21 trámites curados más la opción «ninguno».
   - Si responde «ninguno», se busca en el índice semántico de València.
   - Del índice solo se muestra el título, el enlace oficial y la fecha; nunca pasos generados.
2. **El índice es un fichero JSON en el repo** (`src/datos/indice.json`), no una base de datos.
   - Lo genera un script local (`scripts/indexar.ts`) que se ejecuta una vez.
   - En cada consulta se calcula el embedding de la pregunta y se compara por similitud coseno con todos los vectores en memoria. Con unos cientos de trámites tarda milisegundos.
3. **El resumen generado por el LLM solo sirve para buscar; no se muestra al ciudadano.** Así cumplimos la regla de no inventar.
4. **Cuidado con la clave compartida al indexar.**
   - El script se lanza una sola vez, con unos 3 s entre llamadas al LLM, y guarda lo hecho en disco para poder reanudarlo.
   - Si falta tiempo, se crea el embedding del texto oficial (título y descripción) sin resumen.
5. **Las 1.536 dimensiones se piden con `dimensions: 1536`.** Si la API lo ignora [sin verificar], se cortan los primeros 1.536 valores y se normaliza el vector.
6. **Lo que escribe el ciudadano no se guarda.** Su embedding se calcula al momento y se descarta; no hay logs con su texto.
7. **Pipeline en dos fases.**
   - **Fase A (esta noche):** `www.valencia.es/cas/tramites` y `/val/tramits`, más los 21 trámites curados. Los enlaces a la sede se guardan sin comprobar.
   - **Fase B (opcional, de 04:00 a 09:45 hora local):** el catálogo de la sede.
   - Detalle en el HTML del pipeline.
8. **Dónde se guarda cada cosa.**
   - Lo intermedio va en `.cache/indexado/` (local; añadir a `.gitignore`).
   - El resultado es `src/datos/indice-valencia.json`, que se revisa a mano y luego se sube con commit.
   - El texto del ciudadano no se guarda en ningún sitio.

## Preguntas abiertas

- Con la ficha delante, ¿qué preguntas le pueden surgir al usuario? ¿Pueden ser sobre un trámite en concreto? Si es así, ¿dónde encontramos la información para resolverlas?
9. **Usamos primero las fuentes que da el repo** (`SETUP.md`, `ficha.json` y `datos/`). Las fuentes que encontramos nosotros solo son complemento. Empezamos el índice por la página de trámites de `SETUP.md`, no por `/cas/tramites`.
10. **Las 16 fichas de la sede se capturan con el navegador (Claude in Chrome), a ritmo humano.**
    - Una pestaña, una ficha cada 10 s, sin paralelo y solo esas 16 URLs.
    - Es una decisión consciente del equipo: es navegación automatizada que hace el usuario, a ritmo de persona, pero queda fuera de la franja `Visit-time` del robots.txt de la sede.
    - Las fichas se estructuran con el formato del catálogo de la organización y las revisa Claude antes de marcarlas `verificado: true` (ver punto 13).
11. **Frases de usuario.** Pensamos en añadir a cada trámite frases de cómo lo diría un ciudadano («me han echado del trabajo») para mejorar la búsqueda. Lo investigamos:
    - **Funciona** con buscadores por palabras (BM25), cuando la gente pregunta en lenguaje llano y el documento está en lenguaje oficial. Recall@5 pasa del 44 % al 80 % ([arXiv 2609.01645](https://arxiv.org/abs/2609.01645)). También funciona si se filtran las frases inventadas ([Doc2Query--](https://arxiv.org/abs/2301.03266)).
    - **No funciona** con embeddings potentes, como Qwen3-Embedding 8B, si las frases se pegan al texto: meten ruido y suelen empeorar el resultado ([Weller et al. 2024](https://arxiv.org/abs/2309.08541); [Doc2Query++](https://arxiv.org/abs/2510.09557)).
    - **Decisión final:**
      - Las frases se usan en Jev, como ejemplos para el clasificador.
      - En embeddings no se pegan al texto: el vector del trámite es título + requisitos. Como experimento, probamos un vector por frase quedándonos con el mejor, y solo lo adoptamos si mejora con preguntas escritas sin mirar las frases. `src/datos/pruebas.json` copia frases literales del catálogo y no sirve para esta prueba.
12. **Resumen en palabras sencillas (Contextual Retrieval de Anthropic).**
    - **Qué es:** el método de [Anthropic (19/09/2024)](https://www.anthropic.com/news/contextual-retrieval) añade delante de cada fragmento un contexto de 50–100 tokens generado por un LLM, sin quitar el texto original. Los fallos en el top 20 bajan un 35 % solo con embeddings, un 49 % añadiendo BM25 y un 67 % con reranker.
    - **Por qué no aplica del todo:** el método resuelve que un fragmento pierda el contexto de su documento. Nuestras fichas son cortas y no se trocean.
    - **Conclusión para nosotros:** si lo usamos, el resumen va **delante del texto completo**, nunca solo. Entra en el experimento como variante D (resumen + texto) frente a A (solo texto).
    - **Alternativa del mismo artículo:** con menos de unos 200.000 tokens de contenido, recomiendan meter todo en el prompt en lugar de usar RAG. 37 trámites caben [sin verificar el tamaño exacto].
13. **Sin revisión humana de las fichas: las revisa Claude, el agente de desarrollo.** Se ha decidido así para ir más rápido.
    - Claude compara cada campo con el texto capturado de la sede, quita lo que no esté respaldado y deja un registro de cambios en `.cache/indexado/revision.md`.
    - `verificado: true` pasa a significar «revisado por IA contra la ficha oficial» y se dice en `nota`.
    - Riesgo aceptado: un modelo que revisa la salida de otro modelo puede dejar pasar errores. La validación automática de cifras (paso 3) sigue siendo obligatoria.
14. **Captura hecha (22/10/2026): 16 fichas de 17. UR.LC.10 queda fuera.**
    - La sede devolvió «PAGINA DE ERROR – Dificultad Técnica» para UR.LC.10 en los dos intentos. No se insiste para no cargar la sede. El alcance sigue en **37 trámites** (21 de la organización + 16 de València).
    - Los dos enlaces web del Registro Municipal de Entidades sí tienen ficha: `WEB_ASSET_CRG_0141` es **PC.AE.10** (Inscripción) y `WEB_ASSET_1_20170000428694` es **PC.AE.40** (Actualización de datos). Se indexan con su código real.
    - El texto se guarda como `.txt` (cabecera `URL_FINAL` y `CONSULTADO`, texto visible y lista de enlaces), no como `.json`: es más fácil de revisar.
15. **Revisión de las 16 fichas hecha (22/10/2026): 15 verificadas, 1 no.**
    - **TR.OT.60** (carné EMT ambTU) queda `verificado: false`: la sede cita la normativa de 2026 pero fija el Abono Anual en 10 € «para el año 2025».
    - **LA.AI.90, LA.OT.10, VP.PU.55 y CU.US.10** dan en la sede dos plazos de resolución distintos (3 meses y «no aplica»). Se dejan los dos en `plazo` y se avisa en `nota`.
    - El LLM no copió los costes de casi ninguna ficha; se añadieron en la revisión como un requisito «Coste: …». Todas las cifras finales están en el texto de la sede (comprobado con la misma validación del paso 3).
    - Registro de cambios por ficha: `docs/revision-valencia.md`.
16. **Los resúmenes se guardan en `src/datos/resumenes.json` (37), no en `resumenes-catalogo.json`.** Un solo fichero para los de la organización y los de València: `embeber.ts` lee uno.
17. **Índice: gana la variante D con la instrucción de Qwen3 delante de la pregunta (22/10/2026).**
    - **Qué probamos.** Tres formas de convertir cada trámite en vector, y cada una con dos formas de convertir la pregunta:
      - **A:** título + requisitos + documentación. Un vector por trámite.
      - **D:** el `resumen_sencillo` delante del texto de A, como en Contextual Retrieval (punto 12). Un vector por trámite.
      - **C:** el vector de A más uno por cada frase de usuario; el trámite puntúa con el mejor (punto 11). Seis vectores por trámite.
      - La pregunta, tal cual o con la instrucción que recomienda Qwen3 delante: `Instruct: Given a citizen's question, retrieve the public administration procedure that answers it\nQuery: `.
    - **Cómo lo medimos.** 40 preguntas ciegas (29 en castellano y 11 en valenciano) en `src/datos/pruebas-indice.json`, escritas por un subagente que solo vio ids y títulos. Contamos si el trámite correcto sale el primero (top 1) o entre los tres primeros (top 3).
    - **Resultado:**

      | Variante | Sin instrucción (top 1 / top 3) | Con instrucción (top 1 / top 3) |
      |---|---|---|
      | A | 75 % / 93 % | 83 % / 98 % |
      | D | 78 % / 95 % | **83 % / 100 %** |
      | C | 83 % / 98 % | 85 % / 98 % |

    - **Por qué D con instrucción:**
      - Es la única que no falla ninguna pregunta en el top 3. Para nosotros el top 3 es lo que cuenta: el buscador entrega varias candidatas y el chat elige o pregunta.
      - C con instrucción acierta una más en el top 1, pero falla una en el top 3 y necesita seis vectores por trámite en lugar de uno.
      - La instrucción mejora todas las variantes (A pasa del 93 % al 98 % en el top 3) y no cuesta nada: es texto delante de la pregunta.
      - El resumen ayuda con las preguntas en lenguaje llano: sin instrucción, D acierta en el top 3 las del certificado de empadronamiento («un papel del ayuntamiento que diga que vivo aquí») y la del Ingreso Mínimo Vital, que A falla. Con instrucción, D acierta la de la Renta Valenciana de Inclusión en valenciano, que C falla.
    - **Consecuencias:**
      - Al consultar hay que poner la instrucción delante de la pregunta: va en `vectores.json` como `instruccion_consulta`.
      - Las frases de usuario no entran en el índice. Se siguen usando como ejemplos en Jev (punto 11).
      - El orden de desempate quedó fijado así: mejor top 3, luego mejor top 1, luego la variante más simple (A, D, C) y, dentro de ella, sin instrucción.
    - **Límites:** 40 preguntas son pocas, y entre variantes hay una o dos preguntas de diferencia. Tres trámites de la organización no tienen pregunta (`bono-alquiler-joven`, `ayudas-comedor-escolar`, `xarxa-llibres`). Si añadimos trámites, hay que repetir la prueba con `bun scripts/indexado/evaluar.ts`.
18. **Cuándo se usa el índice: siempre, como primer paso, para quedarnos con los 10 trámites más parecidos (22/10/2026).**
    - **Flujo:** cada consulta se convierte en vector (con `instruccion_consulta` delante) y se compara con los 37. Los 10 más parecidos pasan al clasificador (Jev o HelmCode), que elige entre ellos o pide aclaración como hasta ahora (ticket 04).
    - **Por qué 10:** antes el clasificador veía los 21 trámites a la vez y funcionaba bien; 10 es menos que eso, así que no le complicamos la elección. Y con 10 no perdemos el correcto: en la prueba, D con instrucción ya lo tenía siempre entre los 3 primeros.
    - **Por qué no otras opciones:**
      - Solo como respaldo (cuando Jev dice «no encaja»): una pregunta de València podía acabar mal clasificada en uno de los 21.
      - Solo vectores, sin clasificador: el top 1 es del 83 %; demasiadas respuestas directas erróneas.
      - Los 37 directamente al clasificador: funcionaría hoy, pero no escala si añadimos más trámites.
    - **Qué ve el ciudadano si gana un trámite de València:** la ficha completa, igual que las 21 de la organización. Las 16 están revisadas y tienen el mismo formato. TR.OT.60 lleva el aviso de ficha no verificada (ticket 03). Sustituye a lo que decía el punto 1 («solo título, enlace y fecha»).
    - **Consecuencias para el código:**
      - La fuente del catálogo (ticket 05) devuelve en `listar()` las 37 entradas: `datos/catalogo-tramites-ayudas.json` más `src/datos/catalogo-valencia.json`.
      - Los criterios de Jev y la lista del prompt de HelmCode se construyen en cada consulta con los 10 candidatos, no con el catálogo entero.
      - Cada consulta hace una llamada más a HelmCode (el embedding de la pregunta). La pregunta no se guarda: su vector se descarta al responder (punto 6).
      - Si falla el embedding, el clasificador recibe los 37: es una lista corta y sigue funcionando.
