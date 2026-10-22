# Chat de la ficha · contrato para el frontend

El backend está hecho; la interfaz del chat la construye el frontend.

## Petición

`POST ruta("/api/consulta")` con
`{ "historial": Turno[], "entradaAbierta": "<id de la ficha que se ve>" }`.

- `historial`: los turnos del chat, como en el flujo de pantallas (máximo `MAX_TURNOS`, cada texto hasta `MAX_CARACTERES`, el último del ciudadano).
- `entradaAbierta`: obligatorio para el chat. Si no es un id del catálogo → 400.
- Tarda de 5 a 40 s (varias llamadas a la IA; con glm5.3-flash, una pregunta sobre otro trámite ronda los 30 s). Mostrar «pensando» y permitir cancelar. La ruta corta a los 45 s → 502.

## En vivo (streaming)

Con `"enVivo": true` en la petición, la respuesta llega como NDJSON (una línea JSON por evento) y el texto se puede pintar según se escribe:

- `{"texto": "trozo"}`: añadir al mensaje del asistente.
- `{"descartar": true}`: borrar lo escrito hasta ahora (el modelo escribió algo antes de llamar a una herramienta).
- `{"respuesta": RespuestaConsulta}`: el final. Su `texto` (ya comprobado) sustituye lo escrito en vivo; si no pasó la comprobación de cifras y enlaces, es la plantilla «No podemos confirmarlo».
- `{"error": "La IA no responde."}`: no hubo respuesta.

Es lo que usa la interfaz (`charlar()` en `useConversacion.ts`). Sin `enVivo`, todo igual que abajo.

## Respuesta

`{ tipo: "contestacion", texto, fuentes, candidatas, idioma }` (`RespuestaConsulta` de `src/lib/consulta.ts`).

- `texto`: texto plano. Se muestra tal cual, como mensaje del asistente, y se añade al historial con `rol: "asistente"`.
- `fuentes`: debajo del mensaje con `<Fuentes />`. Puede venir vacío cuando la pregunta no trata de trámites.
- `candidatas`: otras entradas que salieron en la conversación (máximo 3). Para cada una, su `titulo` y un botón «Abrir» (`variant="outline"`) que trae la ficha con `GET ruta("/api/entradas/<id>")` y la muestra, igual que `elegir()` en `useConversacion.ts`. Al abrirla, esa pasa a ser la `entradaAbierta`.
- Errores: 400 «Consulta no válida.», 502 «La IA no responde.» (con reintento).

## Lo que pone el frontend

- El aviso de que responde una IA y el de la Ley de IA bajo el campo de texto.
- Dónde vive el chat (al lado de la ficha o debajo).

## Cómo encuentra otros trámites

- Si la pregunta trata de otro trámite o de una situación nueva, el chat llama una vez a `buscar_tramites` (el índice semántico, `src/lib/herramientas/buscar-tramites.ts`), elige entre los ids que devuelve y lee su ficha con `consultar_contexto` antes de dar datos.
- Si duda entre dos, pregunta; si ninguno encaja, lo dice y enlaza el Punto de Acceso General.
- Las dudas sobre la ficha abierta no buscan: van directas a `consultar_contexto`.
- Prueba: `bun run probar:agente` (con `HELMCODE_MODEL=glm5.3-flash` para el modelo publicado).
