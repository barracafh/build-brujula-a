# Escuchar la respuesta: qué se lee y cuándo se genera

Type: grilling
Status: closed
Blocked by: 11

## Question

¿Qué parte de la respuesta compuesta se lee en voz alta, en qué orden y desde qué control? Partimos de [Anatomía de la respuesta compuesta](03-anatomia-respuesta-compuesta.md) y de [Tarjetas de la respuesta: lado a lado o apiladas](10-tarjetas-respuesta-apiladas.md). El botón «Escuchar» es `outline` o `secondary` y no compite con la acción principal. Hay que decidir:

- Qué se lee: titular, pasos, plazo, documentación, requisitos, «Conviene saber», el aviso de entrada sin verificar. Los enlaces y las fuentes, ¿se nombran o se omiten?
- Si se lee todo seguido o por bloques, y cómo se para y se reanuda.
- La voz (prediseñada, con `voice_id` fijo, porque la clave no tiene `voices_read`). El audio se pregenera, decidido el 22/10/2026; la ejecución está en [Pregenerar el audio de las respuestas](17-pregenerar-audio.md), que depende de lo que se decida aquí.
- Los textos fijos de la interfaz en valenciano, si se leen, con un modelo que hable catalán (v4 o v3). El contenido de la entrada se lee siempre en castellano, como se muestra.
- Su relación con los lectores de pantalla: es un complemento, nunca sustituye al texto accesible.

## Resolution

Decidido con Nico el 22/10/2026 en Plannotator, sobre las preguntas de [`grilling/14-escuchar-respuesta.md`](../grilling/14-escuchar-respuesta.md).

Datos que condicionan: leyendo todo el contenido visible, el catálogo suma unos 30.600 caracteres. Por entrada: mediana de 1.320, mínimo de 726 y máximo de 2.841. Con la voz real salen unos 14 caracteres por segundo (137 caracteres en 9,8 s), así que la mediana dura cerca de 1 min 35 s y la más larga unos 3 min 20 s.

- **Qué se lee:** todo lo visible, en el orden de la pantalla ([Tarjetas de la respuesta: lado a lado o apiladas](10-tarjetas-respuesta-apiladas.md)): el aviso de entrada sin verificar (si lo hay, siempre primero), el titular, el organismo, los pasos numerados, el plazo, los requisitos, la documentación y «Conviene saber».
- **Enlaces y fuentes:** no se lee ninguna URL y las fuentes se omiten. Se termina con una frase que remite a la pantalla: «Para hacerlo, usa el botón Hacer el trámite», o el texto del 012 (`sinEnlace`) si no hay trámite.
- **Notas:** se lee la `nota` de la `Entrada` que entrega la [Fuente del catálogo](05-fuente-del-catalogo.md), con las notas internas ya sustituidas por `src/datos/notas.ts` (8 entradas en `main`). Las notas que quedan son para el ciudadano, pero 3 llevan URL (`inscripcion-demandante-labora`, `multa-dgt` y `complemento-ayuda-infancia`). En el audio, cada URL se cambia por «(enlace en pantalla)».
- **Pronunciación:** una tabla en `src/datos/` que solo usa el guion del audio y nunca cambia lo que se ve: `Cl@ve` → «Clave», `DNI/NIE` → «DNI o NIE», `NIF/NIE` → «NIF o NIE», `UE/EEE` → «Unión Europea o Espacio Económico Europeo», `art.` → «artículo», `RD` → «Real Decreto» y las URL → «(enlace en pantalla)». No puede tocar plazos, importes ni requisitos.
- **Un MP3 por entrada e idioma**, todo seguido, con un solo control en la cabecera.
- **Control:** botón `outline` «Escuchar», bajo el organismo. Al pulsarlo pasa a «Pausar · 0:42 / 1:20» y lleva `aria-pressed`. Volver a pulsar pausa, y la siguiente pulsación sigue desde donde se paró. No se ve el reproductor nativo y no se puede adelantar. El nombre accesible lleva la duración («Escuchar la respuesta, 1 min 35 s»).
- **Idioma:** con la interfaz en valenciano, las etiquetas («Passos», «Termini», «Requisits», «Documentació», «Convé saber») y la frase final se leen en valenciano. El contenido se lee siempre en castellano. Nico eligió esta opción frente a mi recomendación de hacerlo todo en castellano. Para no duplicar el gasto, cada fragmento se genera aparte con su `language_code` (`es` para el contenido, `ca` para las etiquetas en valenciano) y los MP3 se concatenan. El contenido se genera una sola vez y sirve para las dos versiones.
- **Voz:** Alice, `Xb7hH8MSUJpSbSDYk0k2`, prediseñada (Nico me dejó elegirla). Con la clave sin `voices_read` solo se pueden probar ids conocidos. De las 4 voces que probé con `eleven_v4_turbo`, Sarah (`EXAVITQu4vr4xnAvoFFx`) da 404 en esta cuenta y Daniel (`onwK4e9ZLuTAKqWW03F9`) falla en valenciano: Scribe lo detecta como castellano con 0,50 de probabilidad y transcribe «Recollits» por «Requisits». Alice y George (`JBFqnCBsd6RMkjVDRZzb`) pasan igual en los dos idiomas (`spa` 0,93 y `cat` 0,78, transcripción exacta). Elegí entre las dos sin criterio de oído, así que alguien del equipo tiene que escuchar las muestras antes de generar el catálogo entero. Es una voz nativa en inglés: el acento castellano está [SPECULATION: sin escuchar].
- **Aclaraciones:** no se pueden escuchar esta noche. HelmCode las redacta en directo y eso obligaría a generar audio al vuelo, justo lo que se descartó para la respuesta. Pasa a fuera de alcance en el mapa.
- **Lectores de pantalla y pantallas:** el audio es un complemento y nada suena solo. Si al afinar cambia la respuesta, o si se vuelve a la consulta, el audio se para.

### Medido

- Formato `mp3_22050_32`: 4 KB por segundo. El catálogo en castellano ocupa unos 9 MB, y con la versión en valenciano, unos 18 MB en `public/audio/` [SPECULATION: extrapolado de muestras de 10 s].
- Créditos: después de unos 570 caracteres de muestras, `GET /v1/user/subscription` marcaba 9 caracteres usados de 131.000. O el contador va con retraso o `eleven_v4_turbo` cuenta menos de un crédito por carácter; lo medirá [Pregenerar el audio de las respuestas](17-pregenerar-audio.md).
- Las muestras no se suben: están en el scratchpad de la sesión.

## Comments

- 22/10/2026: en el borrador de preguntas dije que 7 de las 14 notas eran internas y que solo estaba identificada la de la RVI. No era así: `main` ya sustituye 8 en `src/datos/notas.ts`. Las 3 que no sustituye son para el ciudadano y solo llevan URL.
