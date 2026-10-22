# Pregenerar el audio de las respuestas

Type: task
Status: open
Blocked by: 14

## Question

Generar por adelantado el audio de cada entrada del catálogo con ElevenLabs y servirlo desde `public/`, para que escuchar la respuesta no gaste créditos ni dependa de ElevenLabs durante la demo. Es texto del catálogo, no del ciudadano, así que la regla 3 no aplica. Lo que se lee, en qué orden y con qué voz lo decide [Escuchar la respuesta: qué se lee y cuándo se genera](14-escuchar-respuesta.md); este ticket solo lo ejecuta.

- **Script** en `scripts/`, ejecutado con Bun, que lee `ELEVENLABS_API_KEY` de `.env.local` y el catálogo a través de la fuente del catálogo ([Fuente del catálogo](05-fuente-del-catalogo.md)), no del JSON a pelo.
- **Modelo y voz:** `eleven_v4_turbo` y el `voice_id` fijo que salga del ticket 14. La clave no tiene `voices_read` ([Clave de ElevenLabs en local y en Vercel](12-clave-elevenlabs.md)): el id va escrito en el código.
- **Salida:** un MP3 por entrada en `public/audio/`, servido con `ruta()`. Elegir un formato de salida de voz de bitrate bajo para no subir decenas de MB al repo y anotar el tamaño total.
- **Regenerar solo lo que cambia:** un manifiesto con un hash del texto leído de cada entrada; si el texto no cambia, no se vuelve a llamar.
- **Llamadas en serie**, o con muy poca concurrencia, para no tocar los límites del plan Creator.
- **Créditos:** anotar `GET /v1/user/subscription` antes y después. Así se mide por fin el coste por carácter de `eleven_v4_turbo`, que la documentación no da.
- **Sin audio no hay botón:** si falta el MP3 de una entrada, «Escuchar» no aparece. No se genera nada al vuelo.
- Si el ticket 14 decide leer en valenciano también los textos fijos de la interfaz, se pregeneran igual, una versión por idioma.

Hecho cuando todas las entradas del catálogo tienen su MP3 en `public/audio/`, el manifiesto está en el repo, `bun run build` pasa y la resolución anota los créditos gastados, el tamaño total y el `voice_id` usado.
