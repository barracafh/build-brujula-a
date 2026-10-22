# Chat de la ficha · contrato para el frontend

El backend está hecho; la interfaz del chat la construye el frontend.

## Petición

`POST ruta("/api/consulta")` con
`{ "historial": Turno[], "entradaAbierta": "<id de la ficha que se ve>" }`.

- `historial`: los turnos del chat, como en el flujo de pantallas (máximo `MAX_TURNOS`, cada texto hasta `MAX_CARACTERES`, el último del ciudadano).
- `entradaAbierta`: obligatorio para el chat. Si no es un id del catálogo → 400.
- Tarda de 5 a 30 s (varias llamadas a la IA). Mostrar «pensando» y permitir cancelar. La ruta corta a los 45 s → 502.

## Respuesta

`{ tipo: "contestacion", texto, fuentes, candidatas, idioma }` (`RespuestaConsulta` de `src/lib/consulta.ts`).

- `texto`: texto plano. Se muestra tal cual, como mensaje del asistente, y se añade al historial con `rol: "asistente"`.
- `fuentes`: debajo del mensaje con `<Fuentes />`. Puede venir vacío cuando la pregunta no trata de trámites.
- `candidatas`: otras entradas que salieron en la conversación (máximo 3). Para cada una, su `titulo` y un botón «Abrir» (`variant="outline"`) que trae la ficha con `GET ruta("/api/entradas/<id>")` y la muestra, igual que `elegir()` en `useConversacion.ts`. Al abrirla, esa pasa a ser la `entradaAbierta`.
- Errores: 400 «Consulta no válida.», 502 «La IA no responde.» (con reintento).

## Lo que pone el frontend

- El aviso de que responde una IA y el de la Ley de IA bajo el campo de texto.
- Dónde vive el chat (al lado de la ficha o debajo).

## Pendiente

- La búsqueda de otros trámites con el RAG (`buscar_tramites`, `src/lib/rag.ts`). Hasta entonces, el chat solo encuentra otras entradas por su id (la lista del catálogo va en el prompt).
