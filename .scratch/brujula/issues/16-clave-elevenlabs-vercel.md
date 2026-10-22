# Clave de ElevenLabs en Vercel

Type: task
Status: closed
Blocked by:

## Question

Los organizadores tienen que poner `ELEVENLABS_API_KEY` en las variables de entorno de Vercel de la versión publicada (`https://build.barraca.house/<equipo>`), solo en el servidor, sin el prefijo `NEXT_PUBLIC_` y en Production. Nico se lo pide; el equipo no tiene la CLI de Vercel enlazada. La clave es la misma que está en `.env.local` ([Clave de ElevenLabs en local y en Vercel](12-clave-elevenlabs.md)) y se les pasa por un canal privado, nunca en el repo ni en un canal público.

Comprobación: hasta que una ruta publicada use la clave, solo se puede confirmar que la variable existe. La llamada real se comprueba con la primera ruta de voz que llegue a `main` ([Consulta por voz: cómo se habla a Brújula](13-consulta-por-voz.md) o [Escuchar la respuesta: qué se lee y cuándo se genera](14-escuchar-respuesta.md)): la voz tiene que aparecer en la versión publicada y responder sin error.

En la misma sesión, confirmar que el interruptor «Improve the models for everyone» (Perfil → Terms and privacy → Data use) está apagado en la cuenta de ElevenLabs y anotarlo.

Hecho cuando la voz funciona en la versión publicada y el interruptor está anotado como apagado.

## Notas

- 22/10/2026: Nico confirma que los organizadores ya pusieron `ELEVENLABS_API_KEY` y `JEV_API_KEY` en producción. Sin verificar con una llamada: el cortafuegos de Vercel devuelve 403 (`x-vercel-mitigated: deny`) a las peticiones a `/brujula-a/api/*` hechas desde la terminal, aunque la página responde 200. La comprobación tiene que hacerse desde el navegador.
- Para Jev ya se puede comprobar: la ruta publicada `/brujula-a/api/brujula` devuelve `motor`, y con la clave puesta debería decir `"jev"` en una consulta clara. Para ElevenLabs sigue haciendo falta la primera ruta de voz publicada.

## Resolution

Cerrado el 22/10/2026 con Nico. Lo que no se puede comprobar todavía pasa a la implementación, para que el mapa no se quede esperando código.

- **Jev en producción: comprobado.** Desde el navegador, en `https://build.barraca.house/brujula-a`, `POST /brujula-a/api/brujula` devuelve 200 y `"motor":"jev"` con «me han despedido y quiero cobrar el paro» (`prestacion-desempleo`, `es`) y con «vull demanar la targeta sanitària» (`tarjeta-sanitaria-sip`, `va`). Esto confirma que `JEV_API_KEY` está puesta.
- **ElevenLabs en producción: sin comprobar.** En `main` todavía no hay ninguna ruta de voz: `GET /brujula-a/api/voz` devuelve 404. Que los organizadores hayan puesto `ELEVENLABS_API_KEY` solo lo sabemos por Nico. **Condición para dar por terminada la implementación de la voz:** con la ruta de voz en `main`, `GET /brujula-a/api/voz` devuelve `disponible: true` en la versión publicada, y dictar una frase la transcribe sin error, probado desde el navegador. Si devuelve `disponible: false`, falta la clave en Vercel y hay que pedírsela a los organizadores.
- **Interruptor «Improve the models for everyone»: encendido**, según Nico (22/10/2026). Mientras siga así, ElevenLabs puede usar el audio dictado para entrenar sus modelos. Apagarlo es un ajuste de la cuenta que hace Nico; no es retroactivo y no cubre el audio de las pruebas del prototipo. El aviso de [Aviso del primer uso con ElevenLabs](15-aviso-elevenlabs.md) es coherente con esto, porque no promete que no se entrene. No se puede añadir esa promesa hasta que el interruptor esté apagado y comprobado. En `elevenlabs.io/app/settings` no aparece: hay que buscarlo en el perfil o en la sección de privacidad de la cuenta.
