# ¿Jev es compatible con la regla 3?

Type: grilling
Status: closed
Blocked by:

## Question

La regla 3 de la plataforma dice que no se guarda lo que escribe el ciudadano. Según el research ([Capacidades de Jev y HelmCode para clasificar](01-capacidades-jev-helmcode.md)), TypeSafe aloja Jev en EE. UU. y retiene los datos «as long as necessary»; la retención cero solo existe en enterprise. HelmCode declara cero logs y procesamiento en la UE. ¿Se puede mandar la consulta del ciudadano a Jev en la versión publicada? Opciones: solo HelmCode en producción y Jev solo en local o en la evaluación; Jev en producción con un aviso explícito al ciudadano; o descartar Jev. Lo que se decida aquí, validarlo con un experto humano antes de usarlo fuera de la demo.

## Resolution

Decidido con el equipo en una sesión de grilling (22/10/2026). Jev puede usarse en la versión publicada, con un aviso que el ciudadano acepta en su primer uso. La decisión queda pendiente de validar con un experto humano en protección de datos antes de usarla fuera de la demo.

- **Aviso con aceptación en el primer uso:** hasta que el ciudadano acepta, la consulta no se envía a ningún proveedor. Vale para Jev y para HelmCode.
- **Contenido del aviso**, en castellano y valenciano: el texto se envía a servicios de IA de terceros para identificar el trámite; uno de ellos (Jev, de TypeSafe) lo procesa en EE. UU. y puede conservarlo; no escribas datos personales como DNI o nombre; enlace a más información. No puede decir «no se guarda» sin matiz.
- **Dónde se recuerda la aceptación:** solo en el navegador, sin registrarla en el servidor, con una forma de retirarla. Si el navegador no permite guardarla, se vuelve a pedir en cada visita.
- **Minimización:** el servidor sustituye DNI/NIE, correos y teléfonos por un marcador antes de llamar a cualquier proveedor. Los marcadores nunca se guardan ni se registran. No cubre nombres ni direcciones, así que no es una garantía.

### Reservas que quedan abiertas

- **El consentimiento no sustituye el contrato de encargado** con TypeSafe (RGPD art. 28) ni da un plazo de retención. Hoy no hay contrato firmado con ninguno de los dos proveedores, como dice el README.
- **La regla 3 se cumple en lo que guarda nuestra herramienta** (nada), pero no en lo que un tercero pueda conservar. El aviso tiene que decirlo así, no ocultarlo.
- **Si el experto lo rechaza,** se desactiva Jev sin tocar código: no se pone `JEV_API_KEY` en Vercel y el motor pasa a HelmCode.
- **Quedan por hacer** `JEV_API_KEY` en Vercel (lo pone la organización) y encajar la pantalla de aceptación en el flujo del ticket 2 y su accesibilidad (ticket 9).
