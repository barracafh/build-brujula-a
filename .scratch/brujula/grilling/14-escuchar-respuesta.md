# Escuchar la respuesta: preguntas

Ticket: [Escuchar la respuesta: qué se lee y cuándo se genera](../issues/14-escuchar-respuesta.md). Ya decidido: el audio se genera por adelantado en `public/` con `eleven_v4_turbo` y un `voice_id` fijo; sin MP3 no aparece el botón; el botón es `outline` y no compite con «Hacer el trámite».

## Lo que he medido en el catálogo

- 21 entradas. Leyendo todo el contenido visible salen unos **30.600 caracteres**: mediana de 1.320 por entrada (en torno a **1 min 20 s** de audio), mínimo 726 y máximo 2.841 (unos **3 min**) [SPECULATION: a unos 15 caracteres por segundo, sin medir con la voz real]. Es el 23 % de los 131.000 caracteres al mes del plan, una sola vez.
- **7 de las 14 notas están escritas para el equipo, no para el ciudadano.** La del paro dice: «sepe.es (web informativa) no se pudo abrir (robots)… La presolicitud está en https://sede.sepe.gob.es/portalSede/en/…». El ticket 03 solo tenía confirmada la de la RVI. Pasa también en pantalla, pero en voz es peor: lee la URL letra a letra. Entradas: `prestacion-desempleo`, `subsidio-desempleo`, `inscripcion-demandante-labora`, `cita-medica-gva`, `multa-dgt`, `complemento-ayuda-infancia`, `ayudas-comedor-escolar`.
- Fragmentos que una voz lee mal: `@` 24 veces (casi todas «Cl@ve»), `DNI/NIE` 7, `NIF/NIE` 3, `UE/EEE` 2, `art.` 2, `RD` 1, 5 URLs dentro del contenido.

## Borrador de guion (prestación por desempleo, 1.690 caracteres)

> Solicitar la prestación por desempleo (paro). Lo gestiona Servicio Público de Empleo Estatal (SEPE).
>
> Pasos. 1. Inscribirse como demandante de empleo en Labora. 2. Opcional: calcular la prestación con el simulador del SEPE. 3. Presentar la solicitud online en la sede del SEPE con certificado digital, DNIe o Cl@ve…
>
> Plazo. 15 días desde el día siguiente a la situación legal de desempleo (RD 625/1985, art. 21)…
>
> Requisitos. … Documentación. …
>
> Conviene saber. *(ver pregunta 3)*
>
> Para hacerlo, usa el botón «Hacer el trámite», debajo de la respuesta.

:::question
¿Qué se lee de la respuesta?

Es lo que se oye al pulsar «Escuchar». El aviso de información sin verificar, si existe, va siempre lo primero.

- [ ] Todo lo visible, en el orden de la pantalla — titular, organismo, pasos, plazo, requisitos, documentación, nota y cierre; ~1 min 20 s de mediana
- [ ] Solo lo esencial — titular, pasos y plazo; ~40 s, pero quien escucha no se entera de requisitos ni documentación
- [ ] Todo menos la documentación — recorta algo sin dejar fuera requisitos

Recommended: Todo lo visible, en el orden de la pantalla
:::

:::question
¿Cómo se tratan los enlaces y las fuentes en voz?

Una URL leída en voz alta no sirve a nadie, y las fuentes ya están en pantalla con `<Fuentes />`.

- [ ] No se lee ninguna URL; se cierra con una frase que remite al botón de la pantalla — «Para hacerlo, usa el botón Hacer el trámite», o el texto del 012 si no hay trámite; las fuentes se omiten
- [ ] Se nombran las fuentes por su nombre legible al final — más largo, poco útil al oído
- [ ] Ni enlaces ni frase de cierre

Recommended: No se lee ninguna URL; se cierra con una frase que remite al botón de la pantalla
:::

:::question
¿Qué hacemos con las notas («Conviene saber») en el audio?

La mitad son notas internas del equipo con URLs y comentarios como «no se pudo abrir (robots)». El ticket 03 dice que esas se sustituyen por un texto fijo en `src/datos/`, pero aún no están identificadas una a una.

- [ ] Leer solo las notas revisadas para el ciudadano — se revisan las 14 ahora (sirve también para la pantalla) y las 7 internas se sustituyen o se callan
- [ ] No leer nunca la nota; decir «En pantalla hay una nota que conviene leer» — cero riesgo, pierde información útil
- [ ] Leerlas tal cual — rápido, pero se oyen URLs y comentarios internos en la demo

Recommended: Leer solo las notas revisadas para el ciudadano
:::

:::question
¿Podemos ajustar la pronunciación sin tocar el texto que se ve?

El contenido es literal (regla 4), pero «Cl@ve» se leería «Cl arroba ve». La propuesta es una tabla pequeña en `src/datos/` que solo usa el script del audio: `Cl@ve` → «Clave», `DNI/NIE` → «DNI o NIE», `UE/EEE` → «Unión Europea o Espacio Económico Europeo», `art.` → «artículo», `RD` → «Real Decreto». Nada de lo que cambia afecta a plazos, importes ni requisitos.

- [ ] Sí, tabla de pronunciación solo para el audio
- [ ] No, se lee literal aunque suene mal

Recommended: Sí, tabla de pronunciación solo para el audio
:::

:::question
¿Un solo audio por entrada o uno por bloque?

Decide cuántos MP3 genera Pregenerar el audio y cómo se navega. Con 1 min 20 s de mediana y 3 min de máximo, un solo archivo se puede pausar y adelantar con la barra.

- [ ] Un MP3 por entrada y un reproductor arriba — 21 archivos; parar, seguir y adelantar con el reproductor
- [ ] Un MP3 por bloque, con «Escuchar» en cada tarjeta — unos 150 archivos y un botón en cada tarjeta, que compite con la lectura visual
- [ ] Un MP3 por entrada con saltos por bloque — capítulos con marcas de tiempo; más trabajo de interfaz

Recommended: Un MP3 por entrada y un reproductor arriba
:::

:::question
¿Cómo es el control?

Va bajo el organismo, en la cabecera de la respuesta, en `outline`.

- [ ] Botón «Escuchar» que pasa a «Pausar · 0:42 / 1:20» — control propio con `aria-pressed`, sin reproductor nativo a la vista; adelantar no se puede
- [ ] Botón «Escuchar» que despliega `<audio controls>` nativo — barra para adelantar y velocidad gratis en casi todos los navegadores, pero su aspecto no es Sol
- [ ] Solo `<audio controls>` nativo, siempre visible

Recommended: Botón «Escuchar» que despliega `<audio controls>` nativo
:::

:::question
Con la interfaz en valenciano, ¿en qué idioma van las etiquetas habladas («Pasos», «Plazo»…)?

El contenido se lee siempre en castellano, como se muestra con «Contenido oficial en castellano».

- [ ] Todo el audio en castellano, un solo MP3 por entrada — coherente con lo que se ve; la mitad de generación
- [ ] Etiquetas en valenciano y contenido en castellano — dos MP3 por entrada y cambios de idioma a media frase, que con una sola voz suenan raros

Recommended: Todo el audio en castellano, un solo MP3 por entrada
:::

:::question-text
¿Qué voz usamos? Pega el `voice_id`.

La clave no tiene `voices_read`, así que no puedo listar voces: hay que elegirla en la web de ElevenLabs (biblioteca de voces, castellano con acento de España) y copiar su id. Si prefieres que la elija yo, escribe «tú» y dime cómo la busco.
:::

:::question
¿Se pueden escuchar también las preguntas de aclaración?

Ahora está en «Not yet specified». Las aclaraciones las redacta HelmCode en directo, así que leerlas obliga a generar audio al vuelo, justo lo que descartamos para la respuesta.

- [ ] No, esta noche no — se quita de «Not yet specified» y pasa a «Out of scope»
- [ ] Sí, generadas al vuelo — ruta de servidor nueva, gasta créditos y depende de ElevenLabs en directo

Recommended: No, esta noche no
:::

## Lo que doy por hecho si no dices nada

- **Lectores de pantalla:** el audio es un complemento. El botón tiene nombre accesible con la duración («Escuchar la respuesta, 1 min 20 s») y no se reproduce nada solo.
- **Cambio de pantalla:** si se afina y cambia la respuesta, o se vuelve a la consulta, el audio se para.
- **`prefers-reduced-motion`:** no aplica al audio; no hay animación asociada.
