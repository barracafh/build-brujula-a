# Mapa · Brújula, pieza 1 «Qué trámite necesito»

## Destination

Una spec implementable (`.scratch/brujula/spec.md`) de la pieza 1, centrada en la UX: flujo híbrido consulta → aclaración → respuesta compuesta, contrato del motor con proveedores intercambiables, fuente del catálogo reemplazable e idioma dinámico (castellano y valenciano).

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

## Decisions so far

- [Capacidades de Jev y HelmCode para clasificar](issues/01-capacidades-jev-helmcode.md): Jev clasifica con `choice` + `noul` de encaje + idioma en una llamada de ~0,3 s; la confianza sola no basta, HelmCode queda como respaldo y redactor sin confianza calibrada.

- [Anatomía de la respuesta compuesta](issues/03-anatomia-respuesta-compuesta.md): sol solo para el plazo si existe, `sunset` solo con `enlace_tramite`, `nota` literal en «Conviene saber», aviso arriba si no está verificada, fuentes con nombre escrito a mano.

## Not yet specified

- Textos de las plantillas fijas de la interfaz en castellano y valenciano.
- Prompt o configuración de cada proveedor (clasificación y redacción de aclaraciones).
- Ruta propia de cada entrada: forma de la URL y qué se ve al entrar por ella sin consulta previa.
- Accesibilidad del chat: gestión del foco, anuncio de mensajes nuevos y `prefers-reduced-motion`.

## Out of scope

- Pieza 2, «Y después, ¿qué?»: encadenar entradas con `relacionados`. El equipo acota el destino a la pieza 1.
- Clasificador léxico local de respaldo: el equipo prefiere fiarse de la IA y de varios proveedores.
- Traducción del contenido de las entradas: riesgo de alterar plazos o requisitos (regla 4).
