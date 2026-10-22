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
17. **Índice: gana la variante D con la instrucción de Qwen3 delante de la pregunta.**
    - Probamos A, C y D, cada una con y sin `Instruct: … Query: ` en la consulta. Con 40 preguntas ciegas, D con instrucción da top 3 del 100 % y top 1 del 83 %; ninguna otra llega al 100 % en el top 3. Tabla completa en `docs/index_specification.md`, sección 5.
    - La instrucción mejora todas las variantes (A pasa de 93 % a 98 % en el top 3). Al consultar hay que ponerla delante: va en `vectores.json` como `instruccion_consulta`.
    - Las frases de usuario (variante C) no entran en el índice. Se siguen usando como ejemplos en Jev (punto 11).
    - Las preguntas las escribió un subagente que solo vio ids y títulos. Tres trámites de la organización no tienen pregunta (`bono-alquiler-joven`, `ayudas-comedor-escolar`, `xarxa-llibres`), y 40 preguntas son pocas: la diferencia entre variantes es de una o dos preguntas.
