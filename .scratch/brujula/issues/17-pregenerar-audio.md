# Pregenerar el audio de las respuestas

Type: task
Status: closed
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

## Notas

- 22/10/2026, de [Escuchar la respuesta: qué se lee y cuándo se genera](14-escuchar-respuesta.md), que ya desbloquea este ticket:
  - **Guion:** el aviso de entrada sin verificar (si lo hay), el titular, el organismo, los pasos, el plazo, los requisitos, la documentación, la `nota` normalizada y una frase final que remite a «Hacer el trámite» o al 012. Sin URL y sin fuentes. Se aplica la tabla de pronunciación de `src/datos/`, que hay que crear.
  - **Dos MP3 por entrada:** `public/audio/<id>.es.mp3` y `public/audio/<id>.va.mp3`. El contenido va siempre en castellano (`language_code: "es"`). Las etiquetas y la frase final, en el idioma de la versión (`ca` en la valenciana). Cada fragmento se genera aparte y se concatena, y los fragmentos de contenido se generan una sola vez para los dos idiomas. El hash del manifiesto va por fragmento.
  - **Voz:** Alice, `Xb7hH8MSUJpSbSDYk0k2`, con `eleven_v4_turbo`. **Antes de generar todo**, que alguien del equipo escuche una entrada completa en los dos idiomas. Si no convence, la alternativa probada es George, `JBFqnCBsd6RMkjVDRZzb`.
  - **Formato:** `mp3_22050_32`, unos 4 KB por segundo, en total unos 18 MB [SPECULATION: extrapolado].
  - **Duración:** el componente necesita la duración de cada MP3 para el nombre accesible y para «Pausar · 0:42 / 1:20». Guardarla en el manifiesto.

## Resolution

Hecho el 22/10/2026. Nico confirmó la voz Alice al abrir la sesión («usamos alice»), así que no se probó George.

- **Script:** `bun scripts/pregenerar-audio.ts` lee el catálogo con la [Fuente del catálogo](05-fuente-del-catalogo.md) (un plugin de Bun anula `server-only` fuera de Next) y monta el guion con `src/lib/guion-audio.ts`. `--seco` dice qué generaría y cuántos caracteres costaría sin llamar a nada, y `--solo <id>` genera una sola entrada.
- **Pronunciación:** `src/datos/pronunciacion.ts`, la tabla del ticket 14 más `Import@ss`, `DNIe` → «DNI electrónico», `€/mes` → «euros al mes» y la barra entre palabras → «o». Las fechas y los números de ley no se tocan.
- **Fragmentos:** cada uno se genera aparte con su `language_code` (`es` para el contenido, `ca` para las etiquetas y la frase final de la versión valenciana). El hash de cada fragmento cubre modelo, voz, formato, idioma y texto. El audio se guarda en `.audio-fragmentos/`, que no se sube. Las etiquetas comunes («Pasos», «Termini»…) se generan una sola vez para todo el catálogo. Dos llamadas a la vez como mucho, con reintento si llega un 429 o un 5xx.
- **MP3:** las tramas de los fragmentos se concatenan sin ID3 ni trama Xing/Info, para que el navegador no tome la duración del primer fragmento. La duración se calcula contando tramas y coincide con `ffprobe` (97,3 s frente a 97,25 s).
- **Manifiesto:** `src/datos/audio.json` (20 KB): voz, modelo, formato y, por entrada e idioma, `segundos`, `bytes` y los hashes de sus fragmentos. El componente puede importarlo para el nombre accesible y «Pausar · 0:42 / 1:20»; si una entrada no aparece, no hay botón.
- **Voz:** Alice, `Xb7hH8MSUJpSbSDYk0k2`, `eleven_v4_turbo`, `mp3_22050_32`.

### Medido

- **Salida:** 42 MP3 (21 entradas × `es` y `va`) en `public/audio/<id>.<idioma>.mp3`, 17,0 MB en total. Duración: mínimo de 45 s, mediana de 1 min 37 s y máximo de 3 min 46 s (`bono-alquiler-joven`).
- **Llamadas:** 124 fragmentos y 26.799 caracteres, menos de lo previsto (~30.600) porque las etiquetas se comparten.
- **Créditos:** `character_count` pasó de 153 a 5.683, es decir, 5.530 créditos por 26.799 caracteres: **unos 0,21 créditos por carácter** con `eleven_v4_turbo`. La lectura se repitió minutos después y no se movió, así que no es un contador con retraso. Queda el 96 % del mes (5.683 de 131.000).
- **Regenerar:** una segunda pasada hace 0 llamadas.
- **Comprobación con Scribe:** la versión valenciana de `prestacion-desempleo` sale con «Termini», «Requisits», «Documentació» y «Per a fer-ho, fes servir el botó Fer el tràmit», y el contenido en castellano. En `multa-dgt`, la URL de la nota se lee «enlace en pantalla». El 012 se lee «cero uno dos». Las pausas entre fragmentos duran unos 0,4 s.
- **Sin escuchar:** nadie del equipo ha oído aún el acento de Alice. Si no convence, `VOZ` es una constante del script y regenerar todo cuesta unos 5.500 créditos.
