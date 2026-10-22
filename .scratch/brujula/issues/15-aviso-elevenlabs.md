# Aviso del primer uso con ElevenLabs

Type: grilling
Status: closed
Blocked by: 11

## Question

El aviso que el ciudadano acepta en el primer uso ([¿Jev es compatible con la regla 3?](08-jev-y-regla-3.md)) tiene que nombrar también a ElevenLabs. ¿Qué dice exactamente, en castellano y valenciano, con los datos de retención y de dónde se procesa el audio que traiga [Capacidades de ElevenLabs para la voz de Brújula](11-capacidades-elevenlabs.md)? ¿Se pide la aceptación antes de abrir el micrófono aunque el ciudadano ya hubiera aceptado el aviso para el texto? Escuchar la respuesta no envía nada del ciudadano, así que no necesita aviso. Lo que se decida aquí, validadlo con un experto humano en protección de datos antes de usarlo fuera de la demo.

## Notas

- 22/10/2026, de [Consulta por voz: cómo se habla a Brújula](13-consulta-por-voz.md): Creator rechaza `enable_logging=false` (403, retención cero solo en enterprise o trial). ElevenLabs guarda siempre el audio, y el aviso tiene que decirlo sin matices.

## Resolution

Decidido con Nico en una sesión de grilling (22/10/2026). Pendiente de validar con un experto humano en protección de datos antes de usarlo fuera de la demo.

- **Un solo aviso al inicio, sin aviso aparte para la voz.** El aviso del primer uso del ticket 08 nombra a la vez a Jev, HelmCode y ElevenLabs, y se acepta una vez. «Dictar» abre el micrófono directamente. Se descartó pedir una segunda aceptación al pulsar «Dictar», que era más granular, a cambio de una sola pantalla.
- **Texto fijo con los tres proveedores**, estén activos o no (sin `JEV_API_KEY` o sin `ELEVENLABS_API_KEY` el texto no cambia). Se descartó mostrar solo los proveedores activos y volver a pedir la aceptación cuando cambiaran.
- **Texto aprobado:**

  Castellano. Título «Antes de empezar».
  > Brújula usa servicios de inteligencia artificial de otras empresas para saber qué trámite buscas.
  > - Lo que escribes va a Jev (TypeSafe, en EE. UU.) y a HelmCode (en la UE). TypeSafe puede conservarlo.
  > - Si dictas, tu voz va a ElevenLabs (en EE. UU.), que guarda el audio y el texto, sin un plazo publicado.
  > - Brújula no guarda nada de lo que escribes ni dices.
  >
  > No escribas ni digas datos personales: ni DNI, ni nombres, ni direcciones, ni teléfonos.

  Botón «Aceptar y seguir» y desplegable «Más información».

  Valenciano. Títol «Abans de començar».
  > Brújula usa servicis d'intel·ligència artificial d'altres empreses per a saber quin tràmit busques.
  > - El que escrius va a Jev (TypeSafe, als EUA) i a HelmCode (a la UE). TypeSafe pot conservar-ho.
  > - Si dictes, la teua veu va a ElevenLabs (als EUA), que guarda l'àudio i el text, sense un termini publicat.
  > - Brújula no guarda res del que escrius ni dius.
  >
  > No escrigues ni digues dades personals: ni DNI, ni noms, ni adreces, ni telèfons.

  Botó «Acceptar i continuar» i desplegable «Més informació».
- **«Más información» es un `<details>` dentro del propio aviso:** qué se envía y a quién, dónde se procesa, enlaces a la política de privacidad de cada proveedor y que no hay contrato de encargado firmado (reserva del ticket 08). Sin rutas nuevas.
- **Retirar la aceptación:** un enlace «Privacidad» en el pie reabre el aviso con un botón «Retirar la aceptación», que borra lo guardado en el navegador.
- **Escuchar la respuesta** no envía nada del ciudadano y no necesita aviso (lo decía ya la pregunta).

### Para quien implemente

- **Versión en la clave guardada:** guardar la aceptación con una versión fija (por ejemplo, `brujula-aviso-v1`) y subirla a mano cada vez que cambie el texto. Con el texto fijo, es lo único que hace que alguien que ya aceptó vea un proveedor nuevo.
- **Enlaces a las políticas:** comprobar cada URL antes de ponerla. La única que está en la investigación es la del EU-US Data Privacy Framework de ElevenLabs (`https://elevenlabs.io/eu-us-data-privacy-framework-policy`); las de TypeSafe y HelmCode no se han verificado.
- **Entrenamiento:** el aviso no dice que ElevenLabs no entrene con el audio, porque todavía no se ha comprobado que el interruptor «Improve the models for everyone» esté apagado ([Clave de ElevenLabs en Vercel](16-clave-elevenlabs-vercel.md)). Si se confirma, se puede añadir al desplegable, no al cuerpo.
- **Encaje en el flujo y accesibilidad:** el aviso entra antes de la primera consulta, según los tickets 02 y 09: foco en su `h1` y controles nativos. La etiqueta del AI Act bajo cada caja de texto sigue aparte y no sustituye a este aviso.
