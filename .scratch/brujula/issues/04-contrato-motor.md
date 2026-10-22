# Contrato del motor

Type: grilling
Status: closed
Blocked by: 01

## Question

¿Qué forma exacta tiene `clasificar(historial) → resultado`? Campos del resultado (candidatas con id y confianza, idioma, tipo de mensaje y texto de aclaración), cómo se mapea la confianza de cada proveedor a alta o media, cómo se validan los ids contra el catálogo, qué LLM redacta las aclaraciones cuando el clasificador es Jev, qué guardarraíl impide que esa aclaración enuncie pasos, plazos, importes, requisitos o enlaces, y si «sin coincidencia» y «la IA no responde» llevan texto de plantilla o redactado.

## Resolution

Decidido con el equipo en una sesión de grilling (22/10/2026), sobre lo que el mapa y el ticket 1 no cerraban. Ya estaba decidido y no se reabrió: de 0 a 3 candidatas con confianza alta o media, la IA solo elige ids, el aviso cuando la IA falla es de plantilla y los ids se validan contra el catálogo (un id inventado se descarta).

- **Forma del resultado:** una unión discriminada con tres casos: `respuesta { candidata }`, `aclaracion { candidatas (2 a 3), texto }` y `sin_coincidencia { texto }`. Cada candidata es `{ id, confianza: "alta" | "media" }`. Todos los casos llevan `idioma` y `proveedor`.
- **Regla de Jev (la regla, no los números; los umbrales se fijan con los tickets 6 y 7):** encaje bajo, sin coincidencia. Confianza alta, una candidata alta (la top). Confianza media, de 2 a 3 candidatas medias con probabilidad de 0,10 o más. Confianza baja con encaje, sin coincidencia y el chat abierto aclara. Ya no hay segunda opinión de HelmCode en esa zona.
- **Confianza de HelmCode:** autodeclarada, con tope. Solo puede devolver `alta` para una candidata; si dudó entre varias, todas pasan a `media`.
- **Entrada:** `clasificar(historial)` recibe una lista de turnos `{ rol: "ciudadano" | "asistente", texto }`, con tope de 6 turnos y 1.000 caracteres por mensaje. A Jev se le manda solo lo que escribió el ciudadano, concatenado; a HelmCode, la lista completa.
- **Respaldo por palabras:** se quita del motor, como pedía el mapa.
- **Aclaraciones:** las redacta HelmCode en una llamada aparte, solo cuando hay aclaración, con la consulta y los títulos de las candidatas como único material. Cualquier fallo cae a la plantilla fija.
- **Guardarraíl, tres capas:** el prompt solo contiene consulta y títulos; el texto devuelto se rechaza si tiene dígitos, símbolos de moneda, `http` o más de 280 caracteres; si se rechaza o falla, se usa la plantilla fija.
- **Sin coincidencia:** plantilla fija en castellano y valenciano («No tenemos este trámite en Brújula…») más el enlace al buscador del PAG. El texto redactado queda solo para las aclaraciones.

### Para quien implemente

- **Conflicto del filtro de dígitos:** cuatro títulos del catálogo contienen dígitos (`voto-por-correo`, con «29 de noviembre de 2026»; `bono-alquiler-joven`; `ayudas-comedor-escolar` y `xarxa-llibres`, con años). Si la aclaración cita el título, el filtro la rechaza y cae siempre a la plantilla. Hay que quitar los títulos de las candidatas del texto antes de aplicar el filtro, o pedir a HelmCode que no los cite. Sin eso, el valor de la capa redactada se pierde justo en esas entradas.
- **Código de Saul que cambia:** `Resultado` en `src/lib/tipos.ts`, la cadena `clasificar` y `porPalabras`, que se eliminan. `scripts/probar.ts` y `scripts/unitarias.ts` se adaptan al nuevo contrato; `porPalabras` puede quedarse solo en un script de pruebas si hace falta.
- **Validación pendiente:** las constantes de la regla (0,85, 0,40, 0,10) siguen siendo provisionales hasta el conjunto de evaluación.

## Comments

- 22/10/2026, después del cierre (Saul): se quita el filtro de dígitos, símbolos de moneda y `http` de la segunda capa del guardarraíl. En su lugar, el chat puede decir cifras (plazos, importes, fechas) y enlaces solo si aparecen tal cual en el material que tuvo delante: lo que devolvieron sus herramientas (la entrada o `contexto.md`) o, en una aclaración, los títulos de las candidatas. Si dice un número o un enlace que no está ahí, se descarta y se responde «No podemos confirmarlo» con el enlace oficial. El tope de 280 caracteres de las aclaraciones se mantiene. Con esto desaparece el conflicto del filtro de dígitos: los títulos de las candidatas forman parte del material, así que citarlos ya no hace caer la aclaración a la plantilla. Cambio recogido en `map.md`.
