# Consulta por voz: cómo se habla a Brújula

Type: prototype
Status: open
Claimed: sí (sesión 22/10/2026)
Blocked by: 11, 12

## Question

¿Cómo dice el ciudadano su consulta en voz alta, con la misma pantalla de consulta del flujo de [Flujo consulta → aclaración → respuesta](02-flujo-consulta-aclaracion-respuesta.md)? El prototipo tiene que fijar:

- Dónde va el botón de micrófono y cómo es: `outline` junto a la `Textarea`, porque la acción principal sigue siendo «Buscar».
- Pulsar para hablar o hablar hasta que se detecte el silencio, y si la transcripción aparece en vivo.
- Qué pasa con la transcripción. Propuesta: rellena la `Textarea`, el ciudadano la puede corregir y se envía con «Buscar», con una llamada al motor por envío. No se envía sola.
- Los estados: pidiendo permiso, grabando, transcribiendo, permiso denegado, sin clave y error. En todos, escribir sigue funcionando.
- El idioma: para ElevenLabs, el valenciano es catalán (`ca`); al ciudadano se le muestra siempre «valenciano». ¿El idioma detectado en la transcripción alimenta el `idioma` del motor, o el motor lo vuelve a detectar en el texto?
- Accesibilidad: foco, anuncios de estado y uso con teclado, según [Accesibilidad del flujo por pantallas](09-accesibilidad-flujo-pantallas.md).
- La voz también al afinar desde la barra fija de la respuesta, o solo en la primera consulta.

**Duración, decidido el 22/10/2026:** contador visible y la grabación se para sola a los 60 s; la transcripción entra en la `Textarea` con un aviso para revisarla o completarla escribiendo. No se trocea el audio. El servidor rechaza solo lo que no puede venir del botón (más de 90 s o más de 2 MB) para acotar el abuso de la versión publicada; un ciudadano nunca ve ese error. Los 60 s encajan con el tope de 1.000 caracteres por mensaje de [Contrato del motor](04-contrato-motor.md).

El audio no se guarda ni se registra en el servidor, y la transcripción pasa por la misma minimización que el texto escrito ([¿Jev es compatible con la regla 3?](08-jev-y-regla-3.md)).
