# Consulta por voz: cómo se habla a Brújula

Type: prototype
Status: closed
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

## Resolution

Decidido con Nico el 22/10/2026 sobre un prototipo con tres variantes montado en el flujo real de `main`: rama `niicogrc/prototype-consulta-voz` (commit `f0fea71`), con `src/app/api/voz/route.ts` y `src/components/flujo/prototipo-voz/`. Se abre en `/brujula-a?voz=A|B|C`.

- **Gana la variante A:** botón `outline` «Dictar» con icono de micrófono, al lado de «Buscar» en la caja grande y antes de «Enviar» en las pequeñas. Se pulsa para empezar y se vuelve a pulsar para parar («Parar · 0:12»). Se descartan mantener pulsado (B) y parar con el silencio (C).
- **Por lotes, sin texto en vivo:** `scribe_v2` desde una ruta de servidor. Mientras transcribe, se ve «Pasando tu voz a texto…».
- **La transcripción se añade a la caja** (detrás de lo ya escrito, con el tope de 1.000 caracteres), el foco vuelve a la caja con el cursor al final y se envía con «Buscar». Nunca se envía sola.
- **Duración:** se para sola a los 60 s con el aviso «Hemos parado al minuto…». El servidor rechaza más de 2 MB con 413, sin llegar a ElevenLabs.
- **Estados:** pidiendo permiso, grabando (con contador), transcribiendo, permiso denegado, error y navegador sin soporte. Cada uno lleva un mensaje y escribir sigue funcionando. Sin `ELEVENLABS_API_KEY`, `GET /api/voz` devuelve `disponible: false` y el botón no aparece.
- **Idioma:** el que detecta Scribe cambia el idioma de la interfaz, salvo que el ciudadano lo haya elegido a mano (`idiomaManual`). Correspondencia: `cat`/`ca` → `va` y `spa`/`es` → `es`; cualquier otro código no cambia nada. Después, el motor sigue mandando con la regla de siempre.
- **El micrófono va en todas las cajas:** la primera consulta, «Ninguna de estas» en la aclaración y la barra fija para afinar la respuesta.
- **Accesibilidad:** `aria-pressed` en el botón y una región `role="status"` que anuncia los cambios de estado, no cada segundo del contador. Con teclado se usa como cualquier botón.

### Medido en vivo

- Castellano (voz del sistema): `spa`, probabilidad 0,99, 1,1 s de Scribe, transcripción exacta.
- Catalán central sintético (voz Montse): `cat`, 0,80, 1,3 s, un error pequeño («per recobrar» por «per a cobrar»). **El valenciano dictado por una persona no se ha medido**; queda para la prueba con el equipo antes de la demo.
- **`enable_logging=false` devuelve 403 en Creator** («Only users from the enterprise or trial tier can use ZRM mode»). ElevenLabs guarda siempre el audio: la ruta no manda el parámetro y [Aviso del primer uso con ElevenLabs](15-aviso-elevenlabs.md) lo tiene que decir.

### Para quien implemente

- Quedarse solo con la variante A. Borrar las variantes B y C, `Conmutador.tsx`, el panel de depuración y el modo silencio de `useGrabadora`. Es código de prototipo: reescribirlo con cuidado, no copiarlo.
- Falta en el prototipo: que el idioma de Scribe cambie la interfaz (hoy solo se ve en el panel de depuración). Hay que pasarlo desde `alTexto` a `c.cambiarIdioma` sin marcar `idiomaManual`.
- El aviso de voz del primer uso todavía no está; lo fija el ticket 15.
