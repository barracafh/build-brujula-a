# Fuente del catálogo

Type: grilling
Status: open
Blocked by:

## Question

¿Qué interfaz tiene la fuente del catálogo para que `datos/catalogo-tramites-ayudas.json` sea la implementación por defecto y se pueda sustituir por otra fuente de datos? Hay que decidir qué operaciones expone (listar entradas, obtener por id), qué forma normalizada tiene una entrada (por ejemplo, `fuente` ya partida en URLs), si se lee en build o en cada petición y qué valor lleva `"datos"` en `ficha.json`: el catálogo actual son datos públicos verificados, así que la regla 6 apunta a `reales`.

Aclaración pendiente: el equipo pidió «usar `ficha.json` por defecto», pero `ficha.json` es la descripción de la herramienta para el CLI del evento, no el catálogo. Confirmar que se refería a `datos/catalogo-tramites-ayudas.json`.
