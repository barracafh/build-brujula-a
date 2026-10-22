# Fuente del catálogo

Type: grilling
Status: closed
Blocked by:

## Question

Revisado el 22/10/2026 contra el código de `70fe34d`: ya está resuelto el valor de `"datos"` en `ficha.json` (`reales`) y el momento de lectura (build, con `import` estático del JSON en `src/lib/catalogo.ts`). Queda abierto:

1. La interfaz de la fuente. Hoy `catalogo.ts` exporta funciones sueltas y síncronas sobre el JSON importado, que también se empaqueta en el cliente. ¿Qué operaciones expone (listar entradas, obtener por id) y es asíncrona y solo de servidor, para poder sustituir la fuente? Hay que tener en cuenta que cada entrada tiene ruta propia compartible y que las tarjetas de «Y después, ¿qué?» abren otra entrada sin llamar a la IA.
2. La forma normalizada de una entrada: dónde se hace la normalización (por ejemplo, `fuente` ya partida y con los nombres escritos a mano del ticket 3, y las notas dirigidas al equipo sustituidas) y qué parte pertenece a la implementación por defecto.
3. Confirmar con el equipo que «usar `ficha.json` por defecto» se refería a `datos/catalogo-tramites-ayudas.json`: `ficha.json` es la descripción de la herramienta para el CLI del evento, y el código ya lee el catálogo de `datos/`.

## Resolution

Decidido con el equipo en una sesión de grilling (22/10/2026). Ya estaba resuelto en código: `"datos": "reales"` en `ficha.json` y lectura del catálogo en build.

- **Interfaz:** asíncrona y solo de servidor, con dos operaciones: `listar(): Promise<Entrada[]>` y `obtener(id): Promise<Entrada | undefined>`. El cliente recibe las entradas por props o por una ruta de API; la respuesta del motor y la ruta propia de cada entrada llevan ya las entradas relacionadas en resumen. La validación de ids del motor (ticket 4) usa `listar()`.
- **Normalización:** la hace la implementación por defecto, que devuelve una `Entrada` con `fuentes: [{ nombre, url }]` ya partidas y con el nombre tomado de `src/datos/` (el dominio si falta), y con la `nota` ya sustituida cuando era interna (ticket 3). El resto de campos son los del catálogo. Una fuente nueva devuelve la misma `Entrada` y no necesita conocer los apaños del catálogo actual.
- **`ficha.json`:** «usar `ficha.json` por defecto» se refería a `datos/catalogo-tramites-ayudas.json`, que es lo que ya lee el código. `ficha.json` sigue siendo la descripción de la herramienta para el CLI.

### Para quien implemente

- `src/lib/catalogo.ts` (funciones síncronas e `import` estático del JSON) pasa a ser la implementación por defecto de la interfaz. `getTramite`, `esId`, `fuentesDe` y `resumenParaPrompt` desaparecen como exportaciones sueltas.
- `Buscador.tsx` es un componente de cliente que hoy llama a `getTramite` de forma síncrona (líneas 70, 90 y 95). Hay que cambiarlo para recibir las entradas desde el servidor, y con ello deja de empaquetarse el JSON en el navegador.
- Las tarjetas de «Y después, ¿qué?» abren otra entrada sin llamar a la IA: por eso la respuesta y la ruta de cada entrada incluyen los relacionados en resumen, y abrirlos no necesita otra petición al motor.
