# Escuchar la respuesta: qué se lee y cuándo se genera

Type: grilling
Status: open
Blocked by: 11

## Question

¿Qué parte de la respuesta compuesta se lee en voz alta, en qué orden y desde qué control? Partimos de [Anatomía de la respuesta compuesta](03-anatomia-respuesta-compuesta.md) y de [Tarjetas de la respuesta: lado a lado o apiladas](10-tarjetas-respuesta-apiladas.md). El botón «Escuchar» es `outline` o `secondary` y no compite con la acción principal. Hay que decidir:

- Qué se lee: titular, pasos, plazo, documentación, requisitos, «Conviene saber», el aviso de entrada sin verificar. Los enlaces y las fuentes, ¿se nombran o se omiten?
- Si se lee todo seguido o por bloques, y cómo se para y se reanuda.
- La voz (prediseñada, con `voice_id` fijo, porque la clave no tiene `voices_read`). El audio se pregenera, decidido el 22/10/2026; la ejecución está en [Pregenerar el audio de las respuestas](17-pregenerar-audio.md), que depende de lo que se decida aquí.
- Los textos fijos de la interfaz en valenciano, si se leen, con un modelo que hable catalán (v4 o v3). El contenido de la entrada se lee siempre en castellano, como se muestra.
- Su relación con los lectores de pantalla: es un complemento, nunca sustituye al texto accesible.
