# Caja de la primera pregunta y sus avisos

Type: prototype
Status: closed
Blocked by:

## Question

En la pantalla de inicio, la caja de la primera pregunta ocupaba 272 px a 1000 px de ancho: etiqueta visible «Cuéntanos qué te pasa», caja de tres líneas, «Buscar» debajo y dos párrafos de aviso (idioma y datos personales; aviso de IA). ¿Se puede compactar sin perder el aviso de IA del art. 50.1 ni la accesibilidad?

## Resolution

Prototipo: rama `prototype/composer-inicio` (commit `43ff2ce`, solo local), ruta `/brujula-a?variant=A|B|C|D`. Se probaron cuatro variantes: A la actual (272 px), B barra de búsqueda (106 px), C caja tipo chat con el aviso dentro del marco (190 px) y D aviso en la fila del botón (156 px). Miguel elige **B** (22/10/2026).

Mientras tanto, Guillem rehízo los avisos del inicio en `0347f5e`: aviso de datos con icono y «Usa IA» con el texto completo en un popover, en `<Avisos />` debajo de los ejemplos. Miguel decide juntar las dos cosas: la barra de B y los avisos de Guillem, que suben a justo debajo de la barra.

- **Barra:** la caja es de una línea y crece con el texto; «Dictar» y «Buscar» van dentro del marco, a la derecha. En móvil la caja ocupa su línea y los botones bajan, dentro del marco. El foco se ve en el marco (`focus-within`), no en la caja.
- **Etiqueta:** «Cuéntanos qué te pasa» queda solo para lectores de pantalla; el `h1` «¿Qué trámite necesitas?» hace de etiqueta visible.
- **Idioma:** «En castellano o en valenciano» pasa a texto de ejemplo dentro de la caja. Se pierde al escribir; lo cubre el selector de idioma.
- **Avisos:** los de Guillem tal cual, pero entre la barra y los ejemplos, asociados con `aria-describedby`. Se descarta el párrafo único de la variante B.

Riesgo aceptado: una barra de una línea puede invitar a escribir palabras sueltas («paro») en vez de contar el caso. No se ha probado con ciudadanos.

### Para quien implemente

- Las cajas de afinar y de «sin coincidencia» no cambian de forma: etiqueta visible y el aviso de IA de Guillem debajo.
- «Usa IA» con el detalle en un popover es la forma más corta del aviso del art. 50.1 que ha pasado por el equipo: validar con un experto humano.
