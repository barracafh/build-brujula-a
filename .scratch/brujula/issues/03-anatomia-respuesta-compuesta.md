# Anatomía de la respuesta compuesta

Type: grilling
Status: closed
Blocked by:

## Question

¿Qué campos de una entrada muestra la respuesta compuesta y con qué jerarquía? Hay que decidir: qué dato lleva la única tarjeta sol (¿plazo?), cómo se muestran `requisitos_clave`, `documentacion` y `organismo`, qué enlace es la acción principal (`enlace_tramite` o `enlace_info`, y qué pasa si falta uno), si `nota` se enseña y cómo, cómo se avisa de `verificado: false`, cómo se parte `fuente` (URLs separadas por ` ; `) para `<Fuentes />` y dónde va la marca de «contenido oficial en castellano».

## Resolution

Decidido con el equipo en una sesión de grilling (22/10/2026). Datos del catálogo que condicionan: `plazo` es `null` en 9 de 21 entradas; `enlace_tramite` falta solo en `renta-valenciana-inclusion`; 14 de 21 llevan `nota`; solo la RVI tiene `verificado: false`.

- **Tarjeta sol:** el `plazo`, cuando exista. Si es `null`, la respuesta no lleva tarjeta sol. No se sustituye por otro dato.
- **Acción principal:** con `enlace_tramite`, botón `sunset` «Hacer el trámite». Sin él, `enlace_info` como botón `outline` «Más información» y un texto fijo que remite a servicios sociales o al 012. La acción principal solo existe si hay trámite.
- **`nota`:** se muestra siempre, literal, en una tarjeta neutra «Conviene saber» después de los pasos. Las notas dirigidas al equipo (la de la RVI, por ejemplo) se sustituyen por un texto fijo en `src/datos/`, porque `datos/` no se edita.
- **`verificado: false`:** aviso visible arriba, junto al titular (`Badge` y «Información sin verificar: compruébala en la sede oficial»). Se muestra el resto de la respuesta.
- **`fuente`:** se parte por ` ; ` y cada fuente lleva un nombre legible escrito a mano por dominio en `src/datos/`. El catálogo usa 23 dominios distintos (`sede.sepe.gob.es`, `www.boe.es`, `sede.gva.es`...), así que esa tabla hay que escribirla y mantenerla. Un dominio sin nombre en la tabla cae al nombre del dominio.
- **«Contenido oficial en castellano»:** `Badge` `font-mono` junto al titular, solo cuando la interfaz está en valenciano.
- **Jerarquía:** titular `h1` serif con el `organismo` debajo y el tipo (trámite o ayuda) en `Badge`; pasos numerados; `requisitos_clave` y `documentacion` en dos tarjetas lado a lado, en una columna en móvil.

### Para quien implemente

- La implementación de Saul (`src/components/FichaTramite.tsx`) ya sigue el plazo como sol, `enlace_tramite ?? enlace_info` y la nota; diverge en: la nota no va en tarjeta «Conviene saber» ni se sustituyen las del equipo, la acción sin trámite no baja a `outline` y los nombres de fuente no salen de una tabla. Comprobarlo contra esta resolución.
- Las notas dirigidas al equipo hay que identificarlas entrada por entrada; hoy solo está confirmada la de la RVI.

## Comments

- 22/10/2026, después del cierre: en el prototipo de [Flujo consulta → aclaración → respuesta](02-flujo-consulta-aclaracion-respuesta.md), Miguel prefiere `requisitos_clave` y `documentacion` apiladas a todo el ancho, no lado a lado como dice esta resolución, y añade iconos y etiquetas mono a las tarjetas. Se concilia en [Tarjetas de la respuesta: lado a lado o apiladas](10-tarjetas-respuesta-apiladas.md); esta resolución no se toca hasta entonces.
