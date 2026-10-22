# Capacidades de Jev y HelmCode para clasificar (ticket 01)

Fecha de consulta: 22/10/2026. Solo fuentes primarias: documentación y páginas de TypeSafe (Jev), de HelmCode y, para el modelo GLM, de Z.ai y su ficha en Hugging Face. No se ha llamado a ninguna API con clave ni se ha enviado nada del repo. Lo no confirmado va marcado como [SPECULATION].

## Resumen

| Pregunta | Jev (TypeSafe) | HelmCode (`glm5.3-flash`) |
| - | - | - |
| Llamada | `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer`, SDK `@typesafe-ai/sdk` | `POST https://api.helmcode.com/v1/chat/completions`, `Authorization: Bearer`, cualquier SDK de OpenAI |
| Salida estructurada | Sí, por diseño: la respuesta siempre es una de las opciones (`choice`), validada por esquema | No documentada en HelmCode. Z.ai documenta solo `json_object` (modo JSON, sin esquema) |
| Confianza | `probabilities` por opción y `confidence` 0-1 en cada respuesta | No documentado (`logprobs` no aparece) |
| Valenciano/catalán | No documentado. Inglés es el idioma principal; otros "handled but not equally well" | No documentado. La ficha del modelo solo etiqueta inglés y chino |
| Idioma detectado | No hay campo propio; se pide como otra pregunta `choice` (`es`/`va`) en la misma llamada | Lo tendría que generar el modelo en su salida |
| Latencia | Fabricante: 70-500 ms; ejemplos de la doc con 182 opciones: 0,09-0,31 s | No documentada. El razonamiento no se puede desactivar (mínimo `low`) |
| Límites | Por organización, en tokens/s y peticiones/s; los valores solo se ven en la consola | 100 rpm y 10 concurrentes por clave en `glm5.3-flash`, 2M tpm |
| Multi-turno | No hay mensajes: el historial se manda dentro de `state` (array u objeto) | Sí, `messages` estándar de OpenAI |
| Datos | No entrena con el input; alojado en EE. UU.; retención "as long as necessary"; ZDR solo enterprise | "Zero logs" de prompts y respuestas; solo UE; no entrena |
| Coste/registro | 0,042 $/M tokens de entrada, salida gratis; clave desde la consola; "early access" | Tarifa plana por clave (desde 399 €/mes); en el evento las claves las pone la organización |

## Jev (TypeSafe)

### Qué es y qué modelos hay

Jev es el primer "System One model" de TypeSafe: no genera texto, responde preguntas tipadas sobre un `state` con probabilidades calibradas ([blog de lanzamiento](https://typesafe.ai/blog/introducing-system-one-models-and-jev), [introducción](https://docs.typesafe.ai/introduction)). Hay tres tipos de pregunta: Choice (elegir una opción de una lista), Score (nivel en una rúbrica ordenada) y Noul (probabilidad de que una afirmación sea cierta) ([quick start](https://docs.typesafe.ai/introduction/quickstart.md)). Existe también Box (localizar en imagen), experimental ([API System One](https://docs.typesafe.ai/api/system-one.md)).

Modelos según [Models](https://docs.typesafe.ai/models.md):

| ID | Alias | Contexto | Entrada | Precio |
| - | - | - | - | - |
| `jev-1.14.0` (desde el 14/10/2026) | `jev-preview` | 64k por petición / 32k por pregunta | Texto | 0,042 $/M tokens de entrada |
| `jev-1.13.0` | `jev-latest` (por defecto en los SDK) | 64k / 32k | Texto | 0,042 $/M tokens de entrada |

Los alias se mueven con cada versión, así que las respuestas pueden cambiar sin tocar código. La propia doc recomienda fijar la versión si se han ajustado umbrales de confianza ([Models, Aliases](https://docs.typesafe.ai/models.md)). Hay contexto largo (262k) con la cabecera `TypeSafe-Danger-Zone-Long-Context: true`, más lento y menos preciso (misma fuente). No hace falta para 21 entradas.

### Cómo se llama

- Endpoint: `POST https://api.typesafe.ai/v1/systemone`, cabecera `Authorization: Bearer <API_KEY>`, cuerpo JSON con `model`, `state` y `questions` ([quick start](https://docs.typesafe.ai/introduction/quickstart.md), [OpenAPI](https://api.typesafe.ai/openapi.json)).
- `GET /v1/models` lista los nombres disponibles para la cuenta ([Models](https://docs.typesafe.ai/models.md)).
- SDK JavaScript/TypeScript: `npm install @typesafe-ai/sdk`, lee `TYPESAFE_API_KEY`, infiere los tipos de respuesta (p. ej. `choice` tipado como unión de las claves) ([quick start](https://docs.typesafe.ai/introduction/quickstart.md)). La página del SDK pide Node.js 22 o superior ([JavaScript SDK](https://docs.typesafe.ai/sdk/javascript.md)); el quick start dice Node 20 para JavaScript. Bun no aparece en la documentación: [SPECULATION] debería funcionar con `fetch` directo contra la API aunque el SDK diera problemas.
- SDK Python: `typesafe-sdk` ([quick start](https://docs.typesafe.ai/introduction/quickstart.md)).
- Reglas de petición: cuerpo de hasta 32 MiB, UTF-8 sin BOM, anidamiento máximo de 64 niveles; errores 400, 401, 413, 415, 422, 429 y 529 ([Request rules and errors](https://docs.typesafe.ai/api/errors.md)).

### Salida estructurada

Es el punto fuerte. La pregunta `choice` lleva `criteria`, un mapa de 1 a 255 opciones (`nombre: descripción`), y la respuesta `choice` es siempre el nombre de la opción con más probabilidad ([OpenAPI, ChoiceQuestion/ChoiceAnswer](https://docs.typesafe.ai/api/system-one.md)). No hay texto libre que parsear ni JSON que pueda salir mal formado. Las descripciones de cada opción pueden ser objetos o arrays JSON, no solo cadenas ([Advanced: structure](https://docs.typesafe.ai/primitives/advanced.md)), así que cada entrada del catálogo puede ir con su `titulo` y sus 5 `frases_usuario` como descripción.

Lo que no hay: tool calling ni `response_format` al estilo OpenAI, porque la API no es de chat. Tampoco "elige de 0 a 3": una `choice` devuelve una sola opción. Para nuestro 0-3 hay dos caminos documentados:

1. Una `choice` con las 21 entradas y quedarse con las 3 mejores de `probabilities`, que trae la probabilidad de cada opción y suma 1 ([Choice](https://docs.typesafe.ai/primitives/choice.md)). Para el caso "ninguna", la doc avisa de que una opción `none of the above` "may not work well in many use cases" y propone una pregunta Noul acompañante en la misma petición ("¿la consulta encaja con algún trámite del catálogo?") (misma fuente).
2. Una Noul por entrada (21 preguntas en una sola petición). Las preguntas se evalúan en paralelo y de forma independiente, y añadir preguntas "barely changes the response time", aunque cuestan tokens ([Primitives](https://docs.typesafe.ai/primitives.md)). [SPECULATION] Esto da una probabilidad independiente por entrada, que encaja mejor con "0 a 3 candidatas" que una distribución que suma 1.

### Confianza

Cada respuesta Choice y Score trae `probabilities` y `confidence` (0 a 1); Noul trae solo la probabilidad `noul` ([Confidence](https://docs.typesafe.ai/confidence.md)). La fórmula para Choice es `(p_max - 1/n) / (1 - 1/n)`, publicada, así que se puede recalcular o sustituir por "probabilidad top" o "ratio top/segundo", que la doc también recomienda (misma fuente). La doc propone justo nuestro esquema de tres tramos: confianza alta, actuar; media, confirmar o pedir más información; baja, no actuar y pedir aclaración (misma fuente). Los umbrales (0,5 o 0,9 en sus ejemplos) son ilustrativos: "Start with conservative thresholds, test with your own data" (misma fuente). Mapear eso a nuestras etiquetas `alta`/`media` es decisión nuestra.

Matices de la propia TypeSafe ([Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md)):

- Lectura literal: responde a lo que pone, no a lo que se quiso decir. Hay que escribir los límites de cada opción en `criteria`.
- Orden de opciones: "leans toward the option that comes first". Recomiendan reordenar y comprobar que la respuesta se mantiene.
- Contenido adversario: el `state` no se trata como hostil; texto que pide su propia clasificación puede mover la respuesta.
- No genera texto: "If you really need to generate text... there are other models for that". Cuadra con nuestra decisión de que un LLM redacte solo las preguntas aclaratorias.

### Valenciano/catalán e idioma detectado

No hay mención a castellano, valenciano ni catalán. La doc dice: "English is the primary training language and where accuracy is currently best. Other languages, including CJK scripts, are handled but not equally well; test on your own content before relying on Jev for a non-English workload" ([Models, Language support](https://docs.typesafe.ai/models.md); lo repite [State](https://docs.typesafe.ai/concepts/state.md)). Ningún número sobre español o catalán.

No hay campo de idioma detectado. La doc sugiere añadir otra pregunta Choice a la misma petición si hace falta saber el idioma del cliente ([Choice](https://docs.typesafe.ai/primitives/choice.md)): por ejemplo `idioma: choice({ es: "castellano", va: "valenciano/catalán" })`. [SPECULATION] Distinguir castellano de valenciano debería ser fácil para un modelo de clasificación, pero no hay evidencia publicada; hay que probarlo con frases nuestras.

### Latencia y límites

- Latencia, según el fabricante: "70ms to 500ms end-to-end", y entre 40x y 200x más rápido que LLMs frontera en tareas System One ([blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev)). Son benchmarks propios medidos desde portátiles en la costa oeste de EE. UU.; desde València habrá que sumar la red transatlántica [SPECULATION sobre la cifra concreta].
- En el cookbook de elegir una skill entre 182, los tiempos impresos son 0,16 a 0,31 s en la primera petición y 0,09 a 0,12 s en la segunda ([Skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion.md)). Ese caso es parecido al nuestro con 21 opciones.
- Límites: por organización, en tokens por segundo y peticiones por segundo; los valores concretos "are in the developer console", no en la doc pública. 429 si se pasan; los SDK reintentan con backoff y respetan `retry-after` ([Models, Rate limits](https://docs.typesafe.ai/models.md)). No he encontrado cifras públicas.

### Multi-turno

No hay `messages` ni sesión: cada llamada es un `state` más preguntas, sin memoria. El `state` admite "A sequence of messages or records" como array, o un objeto con la conversación dentro (el ejemplo de la doc mete `ticket.messages` con `from`/`text`) ([State](https://docs.typesafe.ai/concepts/state.md)). Encaja con `clasificar(historial)`: se serializa el historial en `state`. Contra esto, la doc avisa de que la precisión baja con `state` grande y lleno de detalle irrelevante ([jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md)); conviene mandar solo los turnos del ciudadano que importan.

### Datos enviados

- No entrenan con lo que se manda: "Jev is not trained on customer requests or responses" ([Models, Data handling](https://docs.typesafe.ai/models.md)); la política de privacidad dice "We will not train or fine tune any artificial intelligence or machine learning models on your prompts or other Input" ([Privacy Policy](https://typesafe.ai/legal/privacy-policy), actualizada el 19/11/2025).
- Ubicación: "The Services are hosted in the United States" (misma fuente).
- Retención: ni la política ni el DPA dan un plazo para los inputs de la API; el DPA dice "retained for as long as necessary taking into account the purpose of the Processing" ([DPA](https://typesafe.ai/legal/data-processing), Schedule I §8). El DPA incluye SCC de la UE (módulo 2) y una lista de subencargados en [trust.typesafe.ai/subprocessors](https://trust.typesafe.ai/subprocessors), que no he podido leer (la página no devolvió contenido).
- Retención cero (ZDR) solo para clientes enterprise ([Legal](https://docs.typesafe.ai/legal.md)).

Para la regla 3 de la plataforma ("No se guarda lo que escribe el ciudadano"), esto pesa: el texto viaja a EE. UU. y no hay compromiso público de no retenerlo en el plan estándar. Validar con un experto humano antes de usarlo fuera de la demo.

### Coste y registro

- 0,042 $ por millón de tokens de entrada; la salida es gratis ([Models](https://docs.typesafe.ai/models.md), [blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev)). El blog admite que no puede demostrar que el precio no esté subvencionado.
- Clave desde la consola ([console.typesafe.ai/keys](https://console.typesafe.ai/keys)), que exige login. La web habla de "early access" ([typesafe.ai](https://typesafe.ai/)). No he encontrado si hay créditos gratuitos, si el acceso es inmediato o por lista de espera, ni qué datos pide el registro. La consola devuelve 403 sin sesión.

## HelmCode (`glm5.3-flash`)

### Qué es y cómo se llama

HelmCode es una plataforma de inferencia de modelos abiertos alojada en la UE, con API compatible con OpenAI ([helmcode.com](https://helmcode.com/)). Base URL `https://api.helmcode.com/v1` ([docs](https://helmcode.com/docs)), cabecera `Authorization: Bearer $HELMCODE_API_KEY` ([quickstart](https://helmcode.com/docs/quickstart)), endpoint `/chat/completions` ([examples](https://helmcode.com/docs/examples)). Vale cualquier SDK de OpenAI cambiando `baseURL` (mismas fuentes). El repo ya lo llama así con `fetch` en `src/lib/ia.ts`, sin SDK, mandando solo `model` y `messages`.

El ID es `glm5.3-flash`, sin guion, como en el repo; Z.ai, el fabricante, lo llama `glm-5.3-flash` ([HelmCode models](https://helmcode.com/docs/models), [Z.ai](https://docs.z.ai/guides/vlm/glm-5.3-flash)). Es un MoE de 320B parámetros con 18B activos, contexto de 1M, tool calling, imagen y vídeo, streaming SSE ([HelmCode models](https://helmcode.com/docs/models)).

La página de referencia de la API de HelmCode ([/docs/api](https://helmcode.com/docs/api)) no devolvió contenido al leerla (solo navegación; probablemente se renderiza en el navegador [SPECULATION]). Lo que sigue sale del resto de páginas.

### Salida estructurada

- Tool calling: sí para `glm5.3-flash` ([HelmCode models](https://helmcode.com/docs/models)). No he encontrado si admite `tool_choice` forzado.
- `response_format`, `json_schema` o modo JSON: HelmCode no lo menciona en ninguna página leída. Z.ai, en su propia API, documenta solo `response_format: {"type": "json_object"}`; el esquema va en el prompt y se valida en cliente ([Z.ai structured output](https://docs.z.ai/guides/capabilities/struct-output)). Que HelmCode lo reenvíe al modelo es [SPECULATION].
- Enums: no hay forma documentada de forzar que el id esté en el catálogo. Hay que validar en nuestro código que cada id devuelto existe y descartar lo demás.

### Confianza

No documentado. `logprobs` y `top_logprobs` no aparecen en HelmCode ni en la ficha de Z.ai. La confianza `alta`/`media` tendría que pedírsela al modelo como campo de su JSON, que es una autoevaluación sin calibrar [SPECULATION sobre su fiabilidad; no hay datos publicados].

### Valenciano/catalán e idioma detectado

No documentado. La ficha oficial en Hugging Face solo lleva las etiquetas de idioma inglés y chino ([zai-org/GLM-5.3-Flash](https://huggingface.co/zai-org/GLM-5.3-Flash)); HelmCode no dice nada de idiomas para sus modelos de chat ([models](https://helmcode.com/docs/models)). El idioma detectado lo devolvería el propio modelo en su JSON. [SPECULATION] Un modelo de este tamaño probablemente entiende castellano y valenciano, pero no hay evidencia primaria: hay que probarlo.

### Latencia y límites

- Latencia: no publicada. Lo que la condiciona: el razonamiento no se puede apagar. HelmCode lista para `glm5.3-flash` los niveles `low, medium, high, max` en `reasoning_effort`, sin `none`, y devuelve la traza aparte en `message.reasoning_content` ([models](https://helmcode.com/docs/models)). Z.ai: "thinking cannot be disabled" ([Z.ai](https://docs.z.ai/guides/vlm/glm-5.3-flash)); la ficha de Hugging Face dice que el valor por defecto es `max` ([HF](https://huggingface.co/zai-org/GLM-5.3-Flash)). HelmCode no documenta su valor por defecto. `completar()` no manda `reasoning_effort`, así que para clasificar conviene pasar `"low"` [SPECULATION sobre la ganancia real].
- Límites por clave: 100 rpm; 10 peticiones concurrentes en GLM 5.3 Flash (5 en otros modelos); 2M tokens por minuto. Un 429 trae `Retry-After` ([rate limits](https://helmcode.com/docs/rate-limits)). Cuota mensual compartida con `deepseek-v4-flash` ([models](https://helmcode.com/docs/models)).
- `AGENTS.md` dice que todos los equipos comparten los límites de HelmCode. [SPECULATION] Si es una sola clave para el evento, son 100 rpm y 10 concurrentes para todos los equipos a la vez: una clasificación por turno está bien, una por tecla no.

### Multi-turno

Sí: `messages` con roles `system`, `user` y `assistant`, el formato estándar de OpenAI, que es lo que ya modela el tipo `Mensaje` de `src/lib/ia.ts`. HelmCode no dedica una página a esto; se deduce de la compatibilidad con OpenAI ([docs](https://helmcode.com/docs)).

### Datos enviados

- "Prompts and completions are processed in memory and discarded. Nothing is logged"; solo guardan metadatos de la clave y contadores agregados para facturar ([security](https://helmcode.com/security)).
- No entrenan: "Nothing you send is used to train or fine-tune any model" (misma fuente).
- Solo UE para los modelos propios; no nombran países ni proveedores (misma fuente). Los modelos "frontier" que revenden (Claude, GPT, Gemini) se procesan fuera de la UE ([docs](https://helmcode.com/docs), [models](https://helmcode.com/docs/models)); `glm5.3-flash` no es uno de ellos.
- DPA conforme al RGPD y lista de subencargados "on request" ([security](https://helmcode.com/security)). Responsable: Helmcode S.L., Santiago del Teide (Tenerife) ([privacy](https://helmcode.com/privacy), actualizada el 31/07/2026).

Para la regla 3 de la plataforma, HelmCode es la opción más limpia de las dos según lo que declara. Son afirmaciones del proveedor sin certificación publicada; validar con un experto humano para uso real.

### Coste

Tarifa plana por clave desde 399 €/mes ([helmcode.com](https://helmcode.com/)). En el Build night las claves las pone la organización (`AGENTS.md`), así que no hay coste por llamada para el equipo.

## Lo que no he encontrado

- Jev: cifras de límites del plan estándar, si hay créditos gratuitos, cómo se entra al "early access", precisión en castellano o valenciano, latencia desde Europa, la lista de subencargados.
- HelmCode: la referencia de la API (no renderiza), soporte de `response_format`/`json_schema`, `logprobs`, `tool_choice`, valor por defecto de `reasoning_effort`, cualquier cifra de latencia, idiomas de los modelos de chat.

## Qué implica para `clasificar(historial)`

- Jev hace justo lo que hemos decidido que haga la IA: elegir entre opciones cerradas con una probabilidad. No puede inventar un id. Con 21 entradas cabe de sobra en una pregunta. El idioma sale en la misma llamada con otra `choice`. Riesgos: el idioma (inglés primero, sin datos de español/valenciano), los datos en EE. UU. sin plazo de retención y el registro (clave propia, no la del evento).
- HelmCode ya está montado, con clave en producción, datos en la UE sin logs y multi-turno nativo. Pero hay que pedir JSON por prompt, validar cada id en código, aceptar una "confianza" autodeclarada y pagar la latencia del razonamiento, sin cifras publicadas. Además comparte 100 rpm con el resto de equipos [SPECULATION sobre el número de claves].
- La interfaz intercambiable es viable con los dos. [SPECULATION] Un diseño razonable: un proveedor Jev (21 Noul o una `choice` con su Noul de "ninguna", más una `choice` de idioma) y un proveedor HelmCode (JSON por prompt, `reasoning_effort: "low"`, validación de ids), ambos devolviendo `{ candidatas: [{ id, confianza }], idioma }`. HelmCode queda además como redactor de las preguntas aclaratorias. Antes de elegir, probar los dos con las 105 `frases_usuario` del catálogo, una parte traducida al valenciano.
