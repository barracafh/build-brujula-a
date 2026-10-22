# Brújula

Asistente que traduce la necesidad de un ciudadano, dicha con sus palabras, al trámite o la ayuda del catálogo que le corresponde.

## Lenguaje

**Ciudadano**:
La persona que usa la herramienta para resolver su situación.
_Evitar_: usuario, cliente

**Consulta**:
Lo que el ciudadano escribe con sus palabras, en castellano o en valenciano.
_Evitar_: entrada, pregunta, input

**Entrada**:
Cada uno de los elementos del catálogo curado: un trámite o una ayuda con sus pasos, documentación, plazo, sede y fuente.
_Evitar_: ficha, item, procedimiento

**Trámite**:
Entrada que el ciudadano tiene que realizar ante un organismo (pedir el paro, empadronarse).
_Evitar_: gestión, procedimiento

**Ayuda**:
Entrada que es una prestación o bonificación a la que el ciudadano puede optar (IMV, bono social).
_Evitar_: subvención, beneficio

**Candidata**:
Entrada que el motor propone como posible respuesta a una consulta, con su confianza (alta o media).
_Evitar_: resultado, match, sugerencia

**Coincidencia clara**:
Una sola candidata con confianza alta; es la única situación en la que se muestra la respuesta compuesta.
_Evitar_: acierto, match

**Aclaración**:
Pregunta que se hace al ciudadano cuando hay varias candidatas o alguna con confianza media, ofreciéndolas para que elija.
_Evitar_: desambiguación, repregunta

**Respuesta compuesta**:
La vista de una entrada con el sistema de diseño: pasos, tarjetas de requisitos, documentación y plazo, dónde se hace y fuentes. Su contenido es literal del catálogo.
_Evitar_: ficha, resultado, tarjeta

**Sin coincidencia**:
Resultado de una consulta que no corresponde a ninguna entrada del catálogo; se remite al buscador del PAG.
_Evitar_: no encontrado, fallback
