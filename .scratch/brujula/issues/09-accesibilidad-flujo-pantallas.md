# Accesibilidad del flujo por pantallas

Type: grilling
Status: closed
Blocked by:

## Question

En el flujo elegido en [Flujo consulta → aclaración → respuesta](02-flujo-consulta-aclaracion-respuesta.md), cada pantalla sustituye a la anterior con un fundido. ¿A dónde va el foco al sustituir una pantalla (titular de la nueva, primera candidata…)? ¿Se vuelve arriba del todo o se conserva el scroll? ¿Cómo se anuncian a un lector de pantalla la fase «Pensando…», la llegada de una aclaración, el error y el cambio de respuesta al afinar? ¿Qué pasa con el foco al abrir y cerrar la barra «Afina tu consulta» y al pulsar «← Volver a»? Contexto: el prototipo no gestiona nada de esto; hoy el scroll se queda donde estaba y el aviso «Pensando…» puede quedar fuera de la vista a 320 px.

## Resolution

Decidido con Miguel en una sesión de grilling (22/10/2026). Punto de partida: en el prototipo (`VarianteB.tsx`, rama `prototype/flujo-consulta`) nadie mueve el foco al sustituir una pantalla, así que cae en `body`; y «Pensando…» es un `role="status"` que solo se monta al pensar, arriba del todo, fuera de la vista a 320 px.

- **Sustituir una pantalla:** en toda sustitución (aclaración, respuesta, sin coincidencia, error, cierre, «← Volver a» y «Nueva consulta»), el foco va al `h1` de la nueva pantalla (`tabIndex={-1}`, sin anillo visible al recibirlo así) y la página vuelve arriba. Con `prefers-reduced-motion`, sin desplazamiento suave.
- **«Pensando…»:** la región `role="status"` existe siempre en el DOM y está vacía cuando no se piensa. El aviso visible va pegado arriba bajo la barra (`sticky`; como flota, admite sombra). La pantalla atenuada pasa a `inert` mientras piensa: no se puede enviar dos veces ni recorrer.
- **Lo que llega (aclaración, respuesta, sin coincidencia, error):** se anuncia con el foco en el `h1`; no hay `role="alert"` en el error, para que no suene dos veces. La región de estado se vacía al llegar y solo se usa para «Pensando…» y para afinar sin cambio.
- **Afinar sin cambio de respuesta:** si el motor mantiene la entrada, la pantalla no cambia, el foco se queda en la caja de la barra y la región de estado anuncia una plantilla fija, «Sigue siendo: <título>» (en valenciano, «Continua sent: <título>»). Solo confirma la entrada, así que cumple la regla del chat.
- **Barra «Afina tu consulta»:** al abrirla, foco en la caja de texto; al cerrarla con «Ocultar» o con Escape, vuelve al botón que la abre. Si lo enviado desde la barra trae una pantalla nueva, se aplica la sustitución de arriba y la barra queda cerrada.

### Para quien implemente

- El titular de la respuesta es hoy `h2` en `FichaTramite`; tiene que ser `h1` (ya lo pedía [Anatomía de la respuesta compuesta](03-anatomia-respuesta-compuesta.md)) para que el foco caiga en él.
- El texto exacto de «Sigue siendo» entra con las plantillas fijas de la interfaz (Not yet specified del mapa).
