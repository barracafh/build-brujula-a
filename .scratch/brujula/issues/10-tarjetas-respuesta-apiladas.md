# Tarjetas de la respuesta: lado a lado o apiladas

Type: grilling
Status: closed
Blocked by:

## Question

[Anatomía de la respuesta compuesta](03-anatomia-respuesta-compuesta.md) resolvió «`requisitos_clave` y `documentacion` en dos tarjetas lado a lado, en una columna en móvil». En el prototipo de [Flujo consulta → aclaración → respuesta](02-flujo-consulta-aclaracion-respuesta.md) (rama `prototype/flujo-consulta`, commits `f4c849d` y `b90a935`), Miguel prefirió el plazo, los requisitos y la documentación apilados a todo el ancho, y añadió a cada tarjeta una pastilla con icono de lucide (plazo `CalendarClock`, requisitos `ListChecks`, documentación `FileText`, dónde se hace `Landmark`), etiquetas en mono mayúscula como en reforma-digital.es y el plazo a 20 px en peso 500. ¿Qué queda: lado a lado o apiladas? ¿Entran los iconos y las etiquetas mono en la anatomía? Hay que decidirlo con quien cerró el 03.

## Resolution

Decidido con Miguel en una sesión de grilling (22/10/2026). **Pendiente de ratificar por Nico García, que cerró [Anatomía de la respuesta compuesta](03-anatomia-respuesta-compuesta.md) y no estuvo en esta sesión.** Si no la ratifica, se reabre este ticket.

Datos que condicionan: [Flujo consulta → aclaración → respuesta](02-flujo-consulta-aclaracion-respuesta.md) fijó una sola columna de 760 px como máximo. En el catálogo, `requisitos_clave` tiene de 1 a 6 elementos (3,6 de media) y `documentacion` de 1 a 6 (2,8); en una misma entrada difieren 1,3 elementos de media y hasta 4.

- **Apiladas a todo el ancho**, no lado a lado. Lado a lado, cada tarjeta quedaría en unos 360 px y la lista corta dejaría un hueco; apiladas se leen en un solo orden, también con lector de pantalla. Coste aceptado: más scroll y «Dónde se hace» más abajo. Sustituye la línea de jerarquía del 03 sobre las dos tarjetas lado a lado.
- **Orden:** pasos, plazo (sol, si existe), requisitos, documentación, «Conviene saber» (si hay `nota`), «Dónde se hace» y `<Fuentes />`. La nota va antes de «Dónde se hace» porque avisa de algo que hay que leer antes de actuar.
- **Nota:** gana el 03: tarjeta neutra «Conviene saber», visible y apilada como las demás, no el `<details>` plegado del prototipo.
- **Etiquetas:** cada tarjeta y la sección de pasos llevan una etiqueta en mono mayúscula que es un `h2` semántico con estilo mono, bajo el titular `h1`. `AGENTS.md` limita la serif a `h1` y `h2`, pero no obliga a que todo `h2` sea serif.
- **Pastillas con icono:** entran en la anatomía. Plazo `CalendarClock`, requisitos `ListChecks`, documentación `FileText`, dónde se hace `Landmark`; iconos `aria-hidden`. Fondo `bg-muted` con el icono en `text-brand` (el rojo como acento de icono), no el tinte `bg-brand/[0.08]` del prototipo, que no está en `tema.css`.
- **Plazo:** Geist a 20 px, peso 500. Es texto, no una cifra grande, así que no lleva serif.

### Para quien implemente

- Partir de `FichaTramite.tsx` en la rama `prototype/flujo-consulta` (commits `f4c849d` y `b90a935`): cambiar `h2`/`h3` por `h1`/`h2`, la pastilla a `bg-muted` y la nota de `<details>` a tarjeta.
