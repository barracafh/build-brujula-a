# Capacidades de ElevenLabs para la voz de Brújula

Type: research
Status: closed
Blocked by:

## Question

¿Qué piezas de ElevenLabs usamos para la consulta por voz y para escuchar la respuesta, y con qué límites? Hay que dejarlo documentado en `.scratch/brujula/research/elevenlabs.md` con enlaces a la documentación oficial. Hay que responder:

- **Voz a texto (Scribe v2):** ¿por lotes al terminar de hablar o en tiempo real (`scribe_v2_realtime`)? Para el tiempo real, cómo se conecta el navegador sin exponer la clave: tokens de un solo uso emitidos desde una ruta de `src/app/api/`. Formatos de audio que acepta desde `MediaRecorder` y latencia real de extremo a extremo.
- **Valenciano como catalán:** qué código de idioma acepta (`ca`, `cat`) y cuál devuelve el idioma detectado. Si conviene autodetectar o forzar el idioma (forzar `ca` puede empeorar la transcripción del castellano). Hay que probar la calidad con las frases en valenciano de `frases_usuario` del catálogo, dichas en voz alta, y anotar los aciertos.
- **Texto a voz:** qué modelo lee castellano con mejor relación entre calidad, latencia y coste (Flash v2.5, v4 Turbo); qué voz castellana usamos; streaming al navegador. Si el audio de las 21 entradas se puede generar por adelantado, porque es texto del catálogo y no del ciudadano.
- **Plan Creator:** créditos al mes, límite de concurrencia y coste en créditos de una consulta por voz y de una respuesta leída. Hay que comprobarlo en la cuenta, con el conector de ElevenLabs o `GET /v1/user/subscription`, y estimar si aguanta la demo.
- **Privacidad (regla 3):** retención del audio y de las transcripciones en el plan Creator, si existe un modo de retención cero o de exclusión del entrenamiento y en qué plan, y dónde se procesa (EE. UU. por defecto; la UE, solo en enterprise). Con estos datos se completa el aviso del primer uso.
- **Integración:** SDK `@elevenlabs/elevenlabs-js` o `fetch` directo, como en `src/lib/jev.ts`. Tiene que funcionar en Vercel con `bun run build`.

## Resolution

Investigación en [`research/elevenlabs.md`](../research/elevenlabs.md), solo con documentación oficial. No se ha llamado a la API: no hay clave en local.

- **Voz a texto:** `scribe_v2` por lotes. El navegador graba con `MediaRecorder` y una ruta de `src/app/api/` lo reenvía con `fetch` y devuelve `text` y `language_code`. Sin paquetes nuevos y muy por debajo de los 4,5 MB de Vercel. El tiempo real (`scribe_v2_realtime` con token de un solo uso y `@elevenlabs/react`) queda como alternativa: da texto en vivo y el audio no pasa por nuestro servidor, pero exige dos paquetes y su idioma detectado es menos fiable.
- **Valenciano:** Scribe da el catalán (`cat`) con WER ≤ 5 %. Se autodetecta sin forzar `language_code` y se normaliza `ca`/`cat` → `va` y `es`/`spa` → `es`, aceptando los dos formatos porque la documentación se contradice.
- **Texto a voz:** `eleven_v4_turbo`, que habla castellano y catalán, cuesta lo mismo que Flash (0,04 $/1.000 car.) y tarda ~100 ms. `eleven_flash_v2_5` y `multilingual_v2` no hablan catalán. Generar por adelantado las 21 entradas cuesta unos 30.000 caracteres, una vez.
- **Creator:** 275.000 caracteres al mes; concurrencia de TTS 10/5 y de STT 20/15. Aguanta la demo con holgura, sobre todo con la escucha pregenerada.
- **Privacidad:** Creator guarda por defecto el audio y las transcripciones en EE. UU.; la retención cero y la residencia en la UE son solo enterprise. Hay un interruptor de exclusión del entrenamiento en la cuenta que hay que apagar. El audio no se puede minimizar antes de enviarlo, así que el aviso tiene que pedir que no se diga ningún dato personal. Pendiente de validar con un experto humano.
- **Pendiente en vivo** (con la clave, dentro del prototipo de la consulta por voz): calidad del valenciano dictado, código de idioma devuelto, latencia de extremo a extremo, saldo de la cuenta y comportamiento de `enable_logging=false` en Creator.
