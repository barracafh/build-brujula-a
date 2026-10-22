# Mapa · Brújula, pieza 1 «Qué trámite necesito»

## Destination

Una spec implementable (`.scratch/brujula/spec.md`) de la pieza 1, centrada en la UX: flujo híbrido consulta → aclaración → respuesta compuesta, contrato del motor con proveedores intercambiables, fuente del catálogo reemplazable e idioma dinámico (castellano y valenciano). Incluye la voz con ElevenLabs: consulta por voz y escuchar la respuesta, las dos para la demo de esta noche.

## Notes

- Dominio: asistente de trámites del Build night (22/10/2026). Vocabulario en `GLOSSARY.md`; reglas de plataforma y de diseño en `AGENTS.md`; reto en `SETUP.md`.
- Hard rule: el sistema de diseño Sol (`src/styles/tema.css`, `src/components/ui/`, composición de `src/app/page.tsx`). El resto del código se puede reescribir.
- La UX es la prioridad del equipo; el motor y el resto se tocan, pero al servicio de la UX.
- Skills para cada sesión: `grilling` y `domain-modeling` en los tickets de conversación; `prototype` en los de prototipo.
- Tracker local: tickets en `.scratch/brujula/issues/`.

Decisiones de partida, tomadas al trazar el mapa (22/10/2026):

- Interacción híbrida: la primera consulta es texto libre; con coincidencia clara se pasa a la respuesta compuesta. El chat sigue presente para afinar y no lleva a la respuesta sin coincidencia clara.
- La IA elige entradas; el contenido visible (pasos, plazo, documentación, requisitos, enlaces) sale literal del catálogo.
- El motor devuelve de 0 a 3 candidatas con confianza alta o media, e incluye el idioma detectado.
- Coincidencia clara: 1 candidata con confianza alta. Con 2 o 3, o alguna con confianza media, hay aclaración con las candidatas como botones. Con 0, sin coincidencia, enlace al buscador del PAG y chat abierto. Tras 2 aclaraciones sin cerrar, se muestran las candidatas o el PAG.
- Los mensajes del chat solo pueden aclarar, confirmar la entrada o decir que no hay coincidencia; nunca enuncian pasos, plazos, importes, requisitos ni enlaces. Las aclaraciones las redacta un LLM (Jev clasifica y no genera texto).
- Afinar: el historial vive solo en el navegador y se envía en cada petición; se reclasifica con contexto y la respuesta se sustituye si cambia la coincidencia.
- Idioma: interfaz (textos fijos) y chat en el idioma de la consulta (`es`/`va`), con selector manual. El contenido de la entrada, siempre literal en castellano y marcado como tal.
- Sin respaldo local: si la IA falla, aviso, reintentar y enlace al PAG, conservando la consulta.
- Proveedores: interfaz `clasificar(historial) → resultado` con un adaptador por proveedor elegido por variable de entorno; HelmCode por defecto. Hay acceso a las variables de entorno de Vercel.
- Privacidad: la consulta nunca va en la URL ni en logs. Cada entrada tiene su ruta propia compartible.

Decisiones sobre la voz con ElevenLabs (suscripción del plan Creator), tomadas al ampliar el mapa (22/10/2026):

- Dos usos: consulta por voz (Scribe) y escuchar la respuesta (texto a voz). Las dos, completas, para la demo de esta noche. La voz se activa con `ELEVENLABS_API_KEY`; sin ella, Brújula funciona como ahora.
- La consulta por voz produce texto que entra en el mismo `clasificar(historial)`: no cambia el contrato del motor.
- Valenciano: para ElevenLabs se trata como catalán (`ca`) en el servidor, y al ciudadano se le muestra siempre «valenciano».
- Privacidad: el aviso del primer uso del ticket 08 se amplía para nombrar a ElevenLabs. El audio no se guarda en nuestro servidor y la transcripción pasa por la misma minimización. Pendiente de validar con un experto humano.
- La clave de ElevenLabs solo vive en el servidor; el navegador nunca la ve.
- Escuchar la respuesta usa audio pregenerado en `public/`, sin generar al vuelo: no gasta créditos ni depende de ElevenLabs en directo. (22/10/2026)

## Decisions so far

- [Flujo consulta → aclaración → respuesta](issues/02-flujo-consulta-aclaracion-respuesta.md): pantallas que se sustituyen con fundido, igual en escritorio y móvil; la aclaración surgida al afinar ofrece volver a la respuesta, y la respuesta lleva una barra fija para afinar.
- [Capacidades de Jev y HelmCode para clasificar](issues/01-capacidades-jev-helmcode.md): Jev clasifica con `choice` + `noul` de encaje + idioma en una llamada de ~0,3 s; la confianza sola no basta, HelmCode queda como respaldo y redactor sin confianza calibrada.
- [Anatomía de la respuesta compuesta](issues/03-anatomia-respuesta-compuesta.md): sol solo para el plazo si existe, `sunset` solo con `enlace_tramite`, `nota` literal en «Conviene saber», aviso arriba si no está verificada, fuentes con nombre escrito a mano.
- [Contrato del motor](issues/04-contrato-motor.md): unión discriminada `respuesta | aclaracion | sin_coincidencia` con candidatas `{ id, confianza }`; aclaraciones redactadas por HelmCode con guardarraíl de tres capas y plantilla de respaldo; «sin coincidencia» siempre de plantilla; sin respaldo por palabras.
- [Fuente del catálogo](issues/05-fuente-del-catalogo.md): interfaz asíncrona de servidor (`listar`, `obtener`); la implementación por defecto normaliza fuentes y notas; el catálogo es `datos/catalogo-tramites-ayudas.json`, no `ficha.json`.
- [Accesibilidad del flujo por pantallas](issues/09-accesibilidad-flujo-pantallas.md): cada pantalla nueva lleva el foco a su `h1` y vuelve arriba; «Pensando…» es una región de estado fija y visible con la pantalla anterior `inert`; afinar sin cambio anuncia «Sigue siendo: <título>»; la barra de afinar devuelve el foco al cerrarse.
- [Tarjetas de la respuesta: lado a lado o apiladas](issues/10-tarjetas-respuesta-apiladas.md): apiladas a todo el ancho, con etiquetas mono como `h2`, pastillas con icono sobre `bg-muted` y la nota en tarjeta visible antes de «Dónde se hace»; pendiente de que Nico lo ratifique.
- [¿Jev es compatible con la regla 3?](issues/08-jev-y-regla-3.md): Jev se admite en producción con aviso aceptado en el primer uso y minimización de DNI, correos y teléfonos; pendiente de validar con un experto humano.
- [Capacidades de ElevenLabs para la voz de Brújula](issues/11-capacidades-elevenlabs.md): Scribe v2 por lotes desde una ruta de servidor con autodetección (`ca`/`cat` → `va`), `eleven_v4_turbo` para leer en castellano y valenciano, escucha generable por adelantado; Creator retiene audio en EE. UU. sin retención cero, así que el aviso pide no decir datos personales.
- [Clave de ElevenLabs en local y en Vercel](issues/12-clave-elevenlabs.md): clave en `.env.local` y verificada con llamadas reales (plan Creator, 131.000 caracteres al mes, no 275.000; renueva el 22/11/2026); sin `voices_read`, así que el `voice_id` va fijo; Vercel pasa a los organizadores.
- [Consulta por voz: cómo se habla a Brújula](issues/13-consulta-por-voz.md): botón «Dictar» `outline` junto a Buscar, pulsar para empezar y parar, en todas las cajas; Scribe por lotes rellena la caja sin enviar; para a los 60 s; el idioma detectado cambia la interfaz si no se eligió a mano; Creator no admite retención cero.
- [Aviso del primer uso con ElevenLabs](issues/15-aviso-elevenlabs.md): un solo aviso al inicio con texto fijo que nombra a Jev, HelmCode y ElevenLabs («tu voz va a ElevenLabs (en EE. UU.), que guarda el audio y el texto»); «Más información» en un desplegable y «Retirar la aceptación» desde «Privacidad» en el pie; pendiente de validar con un experto humano.

## Not yet specified

- Textos de las plantillas fijas de la interfaz en castellano y valenciano. Punto de partida: los del prototipo del flujo (`UI` en `src/components/prototipo-flujo/piezas.tsx`, rama `prototype/flujo-consulta`), más el anuncio «Sigue siendo: <título>» de [Accesibilidad del flujo por pantallas](issues/09-accesibilidad-flujo-pantallas.md).
- Prompt o configuración de cada proveedor (clasificación y redacción de aclaraciones).
- Ruta propia de cada entrada: forma de la URL y qué se ve al entrar por ella sin consulta previa.
- Voz en la aclaración: si las preguntas de aclaración, redactadas por HelmCode en `es` o `va`, también se pueden escuchar. Contestarlas hablando ya está resuelto (el micrófono va en todas las cajas). Depende de cómo quede la escucha de la respuesta.

## Out of scope

- Pieza 2, «Y después, ¿qué?»: encadenar entradas con `relacionados`. El equipo acota el destino a la pieza 1.
- Clasificador léxico local de respaldo: el equipo prefiere fiarse de la IA y de varios proveedores.
- Traducción del contenido de las entradas: riesgo de alterar plazos o requisitos (regla 4).
- Agentes de voz de ElevenLabs (ElevenAgents, widget o teléfono): el agente habla con texto generado por un LLM, y eso rompe «la IA elige entradas» y la regla 4.
- Usos creativos de ElevenLabs (voz en off, doblaje) fuera del producto: solo para el pitch, si sobra tiempo.
