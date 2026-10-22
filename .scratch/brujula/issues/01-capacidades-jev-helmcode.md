# Capacidades de Jev y HelmCode para clasificar

Type: research
Status: closed
Blocked by:

## Question

¿Qué ofrecen Jev (https://typesafe.ai/blog/introducing-system-one-models-and-jev) y HelmCode (`glm5.3-flash`, API compatible con OpenAI, `src/lib/ia.ts`) para clasificar una consulta contra 21 entradas?

Hechos a reunir, para cada uno: cómo se llama (endpoint, autenticación, SDK), si fuerza salida estructurada (JSON schema, enums, tool calling), si devuelve algo usable como confianza, si entiende valenciano, latencia y límites de uso, si admite historial de varios turnos y qué dicen sobre retención o uso de los datos enviados. De Jev, además: qué modelos hay, si puede devolver el idioma detectado y qué coste o registro exige.

## Resolution

Fuentes: investigación de Miguel en la rama `research/capacidades-jev-helmcode` (`research/capacidades-jev-helmcode.md`, solo documentación oficial, sin llamar a las APIs) y lo que Saul ha subido en `70fe34d` (`src/lib/jev.ts`, `src/lib/clasificar.ts`, `src/lib/ia.ts`, `docs/ESPECIFICACION.md` §9, `scripts/probar.ts`). La implementación de Saul confirma con llamadas reales casi todo lo que la documentación solo prometía.

| Pregunta | Jev | HelmCode (`glm5.3-flash`) |
| - | - | - |
| Llamada | `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer`, modelo `jev-latest`. Funciona con `fetch` directo, sin SDK (Saul ya lo hace así, con Bun). | `POST {HELMCODE_BASE_URL}/chat/completions`, `Authorization: Bearer`. `completar()` en `src/lib/ia.ts`, con `fetch`, solo manda `model` y `messages`. |
| Salida estructurada | Sí. Una `choice` con los 21 ids como `criteria` solo puede devolver un id del catálogo. Sale `probabilities` de todos. | No forzada. Hay que pedir JSON en el prompt y validar en código que cada id existe (así lo hace `preguntarLLM`). |
| Confianza | `confidence` 0-1 de la `choice` y `probabilities` por id; la pregunta `noul` da la probabilidad de que la consulta encaje en el catálogo. | Ninguna usable. Solo el campo que se le pida al modelo en su JSON (sin calibrar). |
| Valenciano | Sin documentación, pero en la prueba de Saul «m'han acomiadat» sale con 0,99 de confianza y el idioma sale de una `choice` `es`/`va` en la misma llamada. Falta medir el set completo en valenciano. | Sin documentación ni medición. El idioma lo tiene que devolver el modelo en su JSON. |
| Latencia | 0,25-0,4 s por llamada medida (catálogo completo, 21 ids). Saul usa un timeout de 3 s con un reintento ante 429/529. | No medida con `glm5.3-flash`; con `deepseek-v4-flash` en local, unos 2 s. El razonamiento no se puede apagar en GLM. |
| Límites | Por organización, valores solo en la consola. Un 429/529 se reintenta una vez. | 100 rpm y 10 concurrentes por clave, compartidos entre equipos según `AGENTS.md`. `completar()` reintenta los 429 hasta 3 veces. |
| Multi-turno | Sin `messages`: el historial va serializado en `state`. | `messages` estándar de OpenAI. |
| Datos | No entrena con el input; alojado en EE. UU.; sin plazo de retención público. | «Zero logs», solo UE, no entrena (declarado por el proveedor). |
| Coste y registro | 0,042 $/M tokens de entrada. Clave `JEV_API_KEY` ya obtenida; falta que la organización la ponga en Vercel. | Sin coste para el equipo: claves del evento. |

### Lo que se decide con esto

- Jev clasifica y HelmCode es el respaldo y el redactor de aclaraciones. Es el reparto que ya recogía el mapa y ahora tiene evidencia.
- La confianza de Jev sola no basta. En la prueba de Saul «necesito el pasaporte» sale como DNI con 0,81 y «quiero casarme» como empadronamiento con 0,59, y ambos tienen `encaja` de 0,16 y 0,02. El contrato del motor necesita las dos señales (confianza de la `choice` y encaje) para decidir «sin coincidencia».
- Para «de 0 a 3 candidatas» se usan las `probabilities` de una sola `choice`, no una pregunta por entrada: Saul filtra las de ≥ 0,10, con un mínimo de 2 en la aclaración. Una `noul` por entrada queda descartada para esta pieza.
- Con HelmCode no hay confianza calibrada, así que el adaptador de HelmCode solo puede devolver candidatas sin confianza real; ver el ticket del contrato del motor.
- Multi-turno: HelmCode lo admite nativo; con Jev el historial se serializa en `state` y hay que mandar solo los turnos del ciudadano.
- Regla 3 de la plataforma: la consulta viaja a EE. UU. con Jev, sin compromiso público de no retenerla. Está apuntado en el README de Saul como pendiente de RGPD y contrato de encargado. Validar con un experto humano antes de usarlo fuera de la demo.

### Sigue sin saberse

- Precisión de Jev y de HelmCode sobre el set completo, sobre todo en valenciano y con faltas: `bun scripts/probar.ts [jev|llm|palabras]` con `src/datos/pruebas.json` lo mide, pero no hay resultados guardados. Los umbrales de `src/lib/clasificar.ts` (encaja 0,40; alta 0,85; media 0,40) son provisionales.
- Latencia real de `glm5.3-flash` con `reasoning_effort` bajo, y si HelmCode admite `response_format`: `ia.ts` no lo manda y la especificación de Saul dice que sí.
- Límites de Jev en el plan actual y si el alias `jev-latest` cambiará de versión durante el evento (conviene fijar la versión).
