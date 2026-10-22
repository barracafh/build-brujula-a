# Proveedor por defecto

Type: grilling
Status: closed
Blocked by: 01, 06, 08

## Question

Con las capacidades del research y los números del conjunto de evaluación, ¿qué proveedor clasifica por defecto en la versión publicada, Jev o HelmCode, y cuál queda como alternativa configurable?

## Resolution

Cerrado el 22/10/2026 sin sesión propia: lo respondieron otros tickets y el código ya lo aplica. Nico confirmó que debía estar cerrado.

- **Por defecto clasifica Jev, con HelmCode de respaldo si Jev falla.** Es la recomendación de [Conjunto de evaluación](06-conjunto-evaluacion.md): los dos empatan en precisión (92 % y 88 % en las consultas nuevas), y Jev es unas 18 veces más rápido. Además, el p95 de HelmCode (10,6 s) roza su tiempo máximo de 15 s.
- **La alternativa configurable es HelmCode solo**, con `BRUJULA_MOTOR=helmcode`. Sin `BRUJULA_MOTOR`, `porDefecto()` de `src/lib/motor/index.ts` elige `jev` si hay `JEV_API_KEY` y, si no, `helmcode`. Quitar la clave desactiva Jev sin tocar código, como pedía [¿Jev es compatible con la regla 3?](08-jev-y-regla-3.md).
- **En producción ya está así:** [Clave de ElevenLabs en Vercel](16-clave-elevenlabs-vercel.md) comprobó `"motor":"jev"` en `es` y en `va`.

Quedan dos cosas que no reabren la decisión y pasan a la spec:

- **El encaje de 0,20** recomendado para Jev (hoy `encaja: 0.4` en `UMBRAL` de `src/lib/motor/jev.ts`) está pendiente de que lo decida el equipo.
- **La inyección:** Jev la deja pasar y HelmCode la resiste. Aun así, solo puede devolver una entrada del catálogo, cuyo contenido es literal, así que el daño es mostrar el trámite equivocado.
