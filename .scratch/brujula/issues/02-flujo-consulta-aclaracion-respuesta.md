# Flujo consulta → aclaración → respuesta

Type: prototype
Status: resolved
Blocked by:

## Question

¿Cómo se ve y se comporta el flujo híbrido con Sol? Pantalla inicial (caja de consulta y ejemplos), aclaración con candidatas como botones, paso a la respuesta compuesta y dónde vive el chat respecto a ella: panel lateral en escritorio y barra fija en móvil, sustitución a pantalla completa o chat encima de la respuesta. Incluye el estado sin coincidencia y el de error de la IA, en escritorio y a 320 px.

## Answer

Prototipo: rama `prototype/flujo-consulta` (subida a `origin`, no se mergea), ruta `/brujula-a?variant=B`. Se probaron tres variantes (A panel lateral, B pantallas que se sustituyen, C hilo con la respuesta dentro) y el equipo eligió **B**. Lo que se ve en esa variante es la decisión: el equipo dio por buenos los puntos que no discutió expresamente.

- **Una pantalla cada vez, igual en escritorio y en móvil.** Una sola columna de 760 px como máximo. A 320 px no hay scroll horizontal.
- **Inicio:** titular, caja de consulta como acción principal (`sunset`) y ejemplos.
- **Aclaración:** sustituye a la pantalla anterior. Arriba, «Tu consulta: …» con el último mensaje del ciudadano y el contador «Aclaración N de 2». La pregunta redactada va como `h1` grande aunque ocupe varias líneas. Las candidatas son botones grandes con el tipo, «Puede encajar» si la confianza es media, el título y el organismo. «Ninguna de estas» despliega una caja para explicarse mejor.
- **Cierre tras dos aclaraciones:** las candidatas y el PAG como acción principal.
- **Respuesta:** a pantalla completa, con una barra fija arriba («Tu consulta: … / Afina tu consulta») que despliega el historial y una caja para afinar.
- **Afinar que acaba en aclaración:** la aclaración sustituye a la respuesta, pero lleva «← Volver a: <título>», que la recupera sin reclasificar.
- **Sin coincidencia:** titular, texto, PAG como acción principal y debajo una caja para contarlo de otra forma.
- **Error de la IA:** titular de error, la consulta conservada, «Reintentar» como acción principal y el PAG como secundaria.
- **Mientras piensa:** la pantalla anterior se atenúa al 50 % con un aviso «Pensando…».
- **Transición:** cada pantalla nueva entra con un fundido de 300 ms (`--ease-brand`). Con `prefers-reduced-motion`, sin animación.
- **Fuentes:** se respeta `tema.css`. La jerarquía sale de los pesos, las etiquetas mono y los iconos.
- **Fuera de este ticket:** lo que salió sobre la anatomía de la respuesta (tarjetas apiladas, iconos, plazo destacado) choca en parte con [Anatomía de la respuesta compuesta](03-anatomia-respuesta-compuesta.md), resuelto en paralelo, y queda para [Tarjetas de la respuesta: lado a lado o apiladas](10-tarjetas-respuesta-apiladas.md).

## Comments

- 22/10/2026: prototipo en la rama local `prototype/flujo-consulta` (commit `bc377d1` y siguientes), ruta `/brujula-a?variant=A|B|C`. El equipo elige la variante B (pantallas que se sustituyen) y pasa a detallarla.
- Dentro de la respuesta, requisitos y documentación van a todo el ancho y apiladas bajo el plazo, no en dos columnas. Es anatomía: pendiente de conciliar en [Tarjetas de la respuesta: lado a lado o apiladas](10-tarjetas-respuesta-apiladas.md).
- Fuentes: se respeta `tema.css`, con la serif en `h1` y `h2` y Geist en lo demás. La jerarquía sale de los pesos, las etiquetas mono y los iconos (ver [Tarjetas de la respuesta: lado a lado o apiladas](10-tarjetas-respuesta-apiladas.md)). Contexto: reforma-digital.es usa hoy Host Grotesk 400 en los titulares, pero cambiarla rompería la regla de diseño de `AGENTS.md` y la unidad con las demás herramientas de la plataforma.
- Afinar que acaba en aclaración: la pantalla de aclaración sustituye a la respuesta, pero lleva arriba «← Volver a: <título>», que recupera la respuesta anterior sin reclasificar. La línea «Tu consulta» de la aclaración muestra el último mensaje del ciudadano, no el primero (commit `b86ec38`).
- El titular de la aclaración se queda como `h1` grande con la pregunta redactada, aunque ocupe varias líneas.
- El contador «Aclaración N de 2» se queda tal cual, como etiqueta mono encima de la pregunta (en valenciano, «Aclariment N de 2»).
