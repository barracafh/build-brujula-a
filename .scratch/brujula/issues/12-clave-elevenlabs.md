# Clave de ElevenLabs en local y en Vercel

Type: task
Status: closed
Blocked by:

## Question

Poner la clave de la suscripción de ElevenLabs (plan Creator) como `ELEVENLABS_API_KEY` en `.env.local` y en las variables de entorno de Vercel, solo en el servidor y sin el prefijo `NEXT_PUBLIC_`. Comprobar con una llamada que funciona en los dos sitios. Sin la clave, la voz no aparece y Brújula funciona como ahora. La resolución anota dónde está puesta la clave, nunca su valor.

Al poner la clave, en la misma sesión ([`research/elevenlabs.md`](../research/elevenlabs.md)):

- Apagar en la cuenta el interruptor «Improve the models for everyone» (Perfil → Terms and privacy → Data use) y anotar que está apagado.
- `GET /v1/user/subscription`: anotar caracteres restantes del mes y fecha de renovación.

## Resolution

Hecho el 22/10/2026 en lo local; la parte de Vercel pasa a [Clave de ElevenLabs en Vercel](16-clave-elevenlabs-vercel.md), porque la ponen los organizadores y no depende del equipo.

- **Dónde está la clave:** `ELEVENLABS_API_KEY` en `.env.local` del worktree `mantaray`, que está en `.gitignore`. La puso Nico sin que el valor pasara por la conversación. En Vercel todavía no está.
- **Permisos de la clave:** restringida. Funcionan texto a voz, voz a texto y lectura del usuario. **No tiene `voices_read`**: `GET /v2/voices` devuelve 401. El código tiene que llevar el `voice_id` fijo, o hay que añadir ese permiso a la clave para elegir voz desde la API. La voz se elige en [Escuchar la respuesta: qué se lee y cuándo se genera](14-escuchar-respuesta.md).
- **Comprobado con llamadas reales desde local:**
  - `GET /v1/user/subscription`: 200, plan `creator`, estado `active`, 0 de **131.000 caracteres** usados, renovación el 22/11/2026 a las 18:34.
  - `POST /v1/text-to-speech/{voice_id}` con `eleven_v4_turbo` y una voz prediseñada: 200, `audio/mpeg`.
  - `POST /v1/speech-to-text` con `scribe_v2` sobre ese audio: 200, texto correcto. La prueba usaba una frase mixta, así que no dice nada sobre la calidad del valenciano; eso se mide en [Consulta por voz: cómo se habla a Brújula](13-consulta-por-voz.md).
- **Discrepancia con el research:** [`research/elevenlabs.md`](../research/elevenlabs.md) dice que Creator trae 275.000 caracteres al mes; la cuenta tiene 131.000. Manda el dato de la cuenta. La escucha pregenerada de las 21 entradas (~30.000 caracteres) sigue cabiendo, pero el coste en créditos por carácter de `eleven_v4_turbo` no consta, así que hay que mirar el contador después de generarla.
- **Interruptor «Improve the models for everyone»:** sin confirmar. Se lo indicamos a Nico, pero no ha confirmado que esté apagado. Queda como paso pendiente en el ticket 16.
