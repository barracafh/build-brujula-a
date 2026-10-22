# Conjunto de evaluación

Type: task
Status: open
Claimed: sí (sesión 22/10/2026)
Blocked by: 04

## Question

Construir el conjunto de evaluación y su script, y medir cada proveedor (Jev y HelmCode) con el modelo del evento (`glm5.3-flash`). Ya hay una base en `scripts/probar.ts` y `src/datos/pruebas.json` (30 frases, 6 en valenciano); hay que ampliarla y adaptarla al contrato del motor del ticket 4.

**Conjunto**
- Las 105 `frases_usuario` del catálogo, marcadas como `catalogo`. Están dentro de los `criteria` de Jev y del prompt de HelmCode, así que sirven de prueba de cordura y no cuentan para elegir proveedor.
- Unas 40 consultas nuevas, marcadas como `nuevas`: paráfrasis en castellano y valenciano, con faltas de ortografía, consultas ambiguas que deben acabar en aclaración y consultas que deben dar sin coincidencia («quiero adoptar un perro», «cómo pido la nacionalidad», inyección de prompt) y algunos casos de varios turnos.
- Cada caso lleva su resultado esperado explícito: `respuesta` con un id, `aclaracion` con el conjunto de ids aceptables, o `sin_coincidencia`; más el idioma.

**Script**
- Llama al motor con el contrato nuevo (`clasificar(historial)`, `respuesta | aclaracion | sin_coincidencia`) y mide cada proveedor por separado, sin el respaldo por palabras, que desaparece del motor.
- Informa en tablas separadas `catalogo` y `nuevas`, y desglosa por tipo de consulta (castellano, valenciano, faltas, ambiguas, sin coincidencia, varios turnos).
- La métrica principal es la tasa de respuestas directas incorrectas: dar una `respuesta` cuando se esperaba `aclaracion` o `sin_coincidencia`, porque rompe la regla 4. Junto a ella, aciertos, aclaraciones con el id correcto, idioma detectado y latencia (mediana y p95).
- Guarda las respuestas en bruto de Jev (confianza, encaje, probabilidades) en un archivo fuera de git, para ajustar los umbrales de la regla del ticket 4 sin repetir llamadas.

**Requisitos:** `HELMCODE_API_KEY`, `HELMCODE_MODEL=glm5.3-flash` y `JEV_API_KEY` en `.env.local`. Respetar los límites de HelmCode (100 rpm, 10 concurrentes por clave, compartidos entre equipos); no lanzar el conjunto entero en paralelo.

Hecho cuando el script corre contra los dos proveedores y deja en la respuesta del ticket la tabla comparativa, los umbrales recomendados y la tasa de respuestas directas incorrectas de cada uno.
