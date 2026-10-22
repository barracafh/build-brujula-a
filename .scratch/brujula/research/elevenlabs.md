# ElevenLabs para la voz de Brújula

Investigación del ticket [Capacidades de ElevenLabs para la voz de Brújula](../issues/11-capacidades-elevenlabs.md), 22/10/2026. Sale de la documentación oficial; lo que solo se puede comprobar con la clave o hablando en voz alta queda en «Pendiente de comprobar en vivo».

## Resumen

| Pregunta | Respuesta corta |
|---|---|
| Voz a texto | `scribe_v2` por lotes: el navegador graba con `MediaRecorder` (WebM/Opus), nuestra ruta lo reenvía y devuelve texto e idioma. `scribe_v2_realtime` queda como mejora si sobra tiempo. |
| Valenciano | Scribe lista el catalán como `cat` con WER ≤ 5 %; la petición acepta ISO-639-1 o -3 (`ca` o `cat`). Autodetectar, no forzar, y normalizar `ca`/`cat` → `va`, `es`/`spa` → `es`. |
| Texto a voz | `eleven_v4_turbo`: habla castellano y catalán, ~100 ms y $0,04 por 1.000 caracteres, lo mismo que Flash. `eleven_flash_v2_5` no habla catalán. |
| Por adelantado | Sí se puede: las 21 entradas suman unos 30.000 caracteres. |
| Plan Creator | 275.000 caracteres al mes en la tabla de la API; concurrencia de 10 (TTS Flash/Turbo), 5 (resto de TTS), 20 (STT) y 15 (STT en tiempo real). Sobra para la demo. |
| Privacidad | Creator guarda por defecto el audio y la transcripción; la retención cero, la residencia de datos y el procesado en la UE son solo para enterprise. Los datos se guardan en EE. UU. |
| Integración | `fetch` directo desde el servidor, como `src/lib/jev.ts`. Sin SDK para la versión por lotes. |

## Voz a texto (Scribe v2)

Modelos ([modelos](https://elevenlabs.io/docs/overview/models), [STT](https://elevenlabs.io/docs/overview/capabilities/speech-to-text)): `scribe_v2` por lotes y `scribe_v2_realtime` por WebSocket (~150 ms sin contar red). `scribe_v1` está obsoleto.

**Por lotes** ([`POST /v1/speech-to-text`](https://elevenlabs.io/docs/api-reference/speech-to-text/convert)), `multipart/form-data` con `model_id=scribe_v2`, `file` y `language_code` opcional.

- Acepta WebM, OGG, Opus, MP4/M4A, MP3 y WAV, así que vale lo que da `MediaRecorder` en Chrome (`audio/webm;codecs=opus`) y en Safari (`audio/mp4`). Mínimo 100 ms de audio.
- La respuesta trae `text`, `language_code` y `language_probability`. La documentación se contradice sobre el formato del código (describe `'eng'` y el ejemplo devuelve `"en"`), así que hay que aceptar los dos.
- El tamaño no es un problema: Vercel admite 4,5 MB por petición ([límites](https://vercel.com/docs/functions/limitations#request-body-size)) y una consulta de 30 s en Opus ronda los 100-200 KB [SPECULATION: cálculo a ~32-48 kbps, sin medir].
- Sin texto en vivo: el ciudadano ve «Transcribiendo…» al soltar y luego el texto en la `Textarea`.

**En tiempo real** ([WebSocket](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime), [guía de cliente](https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/client-side-streaming)), `wss://api.elevenlabs.io/v1/speech-to-text/realtime`.

- El navegador se conecta directamente con un token de un solo uso que caduca a los 15 min. Nuestro servidor lo emite con `elevenlabs.tokens.singleUse.create("realtime_scribe")` del SDK `@elevenlabs/elevenlabs-js`. La ruta HTTP de ese endpoint no aparece en la guía.
- Audio en PCM (`pcm_16000` por defecto), no WebM: hay que convertirlo en el navegador. `@elevenlabs/react` (`useScribe`) o `@elevenlabs/client` (`Scribe.connect`) abren el micrófono y lo hacen solos.
- Envía `partial_transcript` (en vivo) y `committed_transcript`. Cierre por `commit_strategy`: `manual`, `vad` (con `vad_silence_threshold_secs`) o `turn_prediction`.
- El idioma detectado solo llega con `include_language_detection=true` y en `committed_transcript_with_timestamps`, y puede ser `null`.
- Ventaja para la regla 3: el audio va del navegador a ElevenLabs y nunca pasa por nuestro servidor.

**Recomendación para esta noche: por lotes.** Es una ruta de servidor con `fetch`, sin dependencias nuevas en el cliente, y devuelve el idioma de forma fiable. Sus contras: no hay texto en vivo y el audio pasa por nuestro servidor, aunque solo en memoria. La alternativa es el tiempo real con `useScribe`: transcripción en vivo y detección de silencio, a cambio de dos paquetes nuevos, la ruta de tokens y un idioma detectado menos fiable. Decide el ticket [Consulta por voz: cómo se habla a Brújula](../issues/13-consulta-por-voz.md).

## Valenciano como catalán

- Scribe lista «Catalan (cat)» y «Spanish (spa)» en el nivel «Excellent (≤ 5 % WER)». No menciona el valenciano por separado.
- **No forzar `language_code`.** Si se fuerza `ca`, una consulta en castellano se transcribe peor [SPECULATION: sin probar, es lo esperable de un parámetro que fija el idioma]. Mejor autodetectar y mapear el resultado: `ca`/`cat` → `va`, `es`/`spa` → `es`, cualquier otro → que lo decida el motor.
- El valenciano coloquial puede salir con la ortografía del catalán central («aquesta», «nosaltres»). Para el clasificador da igual; para el ciudadano, que ve el texto antes de enviarlo, puede chocar. Se mide en la prueba en vivo.

## Texto a voz

Fuentes: [modelos](https://elevenlabs.io/docs/overview/models), [TTS](https://elevenlabs.io/docs/capabilities/text-to-speech), [streaming](https://elevenlabs.io/docs/api-reference/text-to-speech/stream), [precios de la API](https://elevenlabs.io/pricing/api).

| Modelo | Castellano | Catalán | Latencia | $ / 1.000 car. | Límite por petición |
|---|---|---|---|---|---|
| `eleven_flash_v2_5` | Sí | **No** | ~75 ms | 0,04 | 40.000 |
| `eleven_v4_turbo` | Sí | Sí | ~100 ms | 0,04 | no consta |
| `eleven_v4` | Sí | Sí | no consta | 0,08 | 10.000 |
| `eleven_multilingual_v2` | Sí | **No** | más alta | 0,08 | 10.000 |

- **Recomendación: `eleven_v4_turbo` para todo.** Con un solo modelo valen el contenido (siempre en castellano) y los textos fijos en valenciano, al mismo precio que Flash. La alternativa es Flash v2.5 si solo se leen textos en castellano: es algo más rápido y su coste en créditos está documentado (0,5 por carácter), pero obliga a no leer nada en valenciano.
- `POST /v1/text-to-speech/{voice_id}/stream` devuelve el audio por trozos (MP3 `mp3_44100_128` por defecto), y una ruta nuestra puede reenviarlo tal cual al `<audio>`. El `language_code` opcional fija el idioma; los modelos que no lo admiten lo ignoran y `multilingual_v2` no lo acepta. Hay que pasar `es` en el contenido.
- **Voz:** la documentación no recomienda ninguna voz castellana. Se elige en la biblioteca de voces de la cuenta, con acento de España, que no sea de México. La biblioteca no está disponible por API en el plan gratuito, pero sí en Creator.
- **Por adelantado:** el contenido legible de las 21 entradas, sin frases de ejemplo, enlaces ni ids, suma unos 36.000 caracteres en JSON. Leído quedarían unos 30.000 [SPECULATION: medido sobre el JSON, el guion real de lectura lo decide el ticket 14]. Un script que genere `public/audio/<id>.mp3` gasta en torno al 11 % del mes del plan Creator una sola vez, la escucha queda instantánea y no consume nada durante la demo. Si cambia el catálogo, hay que volver a generarlo. Es texto del catálogo, no del ciudadano: la regla 3 no aplica.

## Plan Creator: créditos y concurrencia

- [Precios de la API](https://elevenlabs.io/pricing/api): 22 $/mes y 275.000 caracteres de TTS al mes. Las filas de horas incluidas de STT no llevan etiqueta y por orden saldrían 100 h de `scribe_v2` (0,22 $/h) y 56 h de tiempo real (0,39 $/h) [SPECULATION: deducido del orden de la tabla].
- Concurrencia en Creator ([TTS](https://elevenlabs.io/docs/help-center/technical/how-many-text-to-speech-requests-can-i-make-and-can-i-increase-it.md), [STT](https://elevenlabs.io/docs/help-center/product/core-capabilities/speech-to-text/how-many-speech-to-text-requests-can-i-make-and-can-i-increase-it.md)): TTS Flash/Turbo 10, resto de TTS 5, STT 20 y STT en tiempo real 15.
- **¿Aguanta la demo?** Sí, con margen. 100 consultas por voz de 10 s son 0,3 h de STT, y 100 respuestas leídas al vuelo a ~1.500 caracteres, 150.000 caracteres, más de la mitad del mes. Con el audio generado por adelantado, la escucha no gasta nada [SPECULATION: volúmenes de demo supuestos].
- El saldo real de la cuenta (`GET /v1/user/subscription`) no se ha comprobado: no hay clave en local ([Clave de ElevenLabs en local y en Vercel](../issues/12-clave-elevenlabs.md)) y el conector de ElevenLabs no está autenticado.

## Privacidad (regla 3)

Todo esto es para validar con un experto humano en protección de datos.

- **Retención:** en STT, el audio de entrada y el texto de salida se guardan por defecto («Enabled») ([retención cero](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode)). La documentación no da un plazo para STT. `enable_logging=false` activa la retención cero, pero «may only be used by enterprise customers». Qué pasa si lo envía una cuenta Creator no está documentado [SPECULATION: lo más probable es que se ignore o falle]. Hay que probarlo en vivo y no contar con ello.
- **Entrenamiento:** la cuenta tiene un interruptor de exclusión, «Improve the models for everyone», en Perfil → Terms and privacy → Data use. No es retroactivo. La página de ayuda oficial devolvió 403 y el dato viene del resultado de búsqueda, así que hay que verlo en la cuenta. **Hay que apagarlo antes de la demo.**
- **Dónde:** los datos se guardan en EE. UU. por defecto. La residencia en la UE, India o Singapur es enterprise, y el procesado solo en la UE exige además retención cero ([residencia de datos](https://elevenlabs.io/docs/overview/administration/data-residency)). ElevenLabs se acoge al [EU-US Data Privacy Framework](https://elevenlabs.io/eu-us-data-privacy-framework-policy).
- **Minimizar antes de enviar no es posible con el audio:** el DNI dicho en voz alta llega a ElevenLabs antes de que podamos quitarlo. Scribe tiene `entity_detection` y `entity_redaction`, que redactan la transcripción devuelta, pero el audio ya está en sus servidores. Por eso el aviso del ticket [Aviso del primer uso con ElevenLabs](../issues/15-aviso-elevenlabs.md) tiene que decir que no se diga ningún dato personal.
- **Escuchar la respuesta** con audio generado por adelantado no envía nada en tiempo de uso. Generado al vuelo, envía texto del catálogo, nunca del ciudadano.

## Integración

- **Por lotes y TTS:** `fetch` directo con la cabecera `xi-api-key: process.env.ELEVENLABS_API_KEY`, en rutas de `src/app/api/`, siguiendo el patrón de `src/lib/jev.ts`. No añade dependencias y no afecta a `bun run build`. Duración máxima en Vercel Hobby: 300 s, de sobra.
- **En tiempo real:** `@elevenlabs/elevenlabs-js` en el servidor para el token y `@elevenlabs/react` en el cliente. Son dos paquetes nuevos en `package.json` y `bun.lock`.
- La voz aparece solo si existe `ELEVENLABS_API_KEY`. El servidor lo dice a la página con un booleano, nunca con la clave.

## Pendiente de comprobar en vivo

Requiere la clave del ticket 12 y alguien que hable. Va dentro del prototipo del ticket 13.

1. Dictar 6-8 `frases_usuario` en valenciano y 4 en castellano. Anotar aciertos, el `language_code` devuelto (`ca` o `cat`) y la latencia de extremo a extremo.
2. `GET /v1/user/subscription`: caracteres restantes y fecha de renovación.
3. Una petición con `enable_logging=false` desde Creator: ¿falla o se ignora?
4. El interruptor de entrenamiento de la cuenta, apagado.
5. Elegir la voz castellana y escuchar `eleven_v4_turbo` con `language_code=es` sobre una entrada larga.
