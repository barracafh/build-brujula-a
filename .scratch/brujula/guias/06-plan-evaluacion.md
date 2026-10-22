# Plan · Conjunto de evaluación con el motor actual

Cómo hacer el [ticket 6](../issues/06-conjunto-evaluacion.md) sin tocar el motor ni el contrato. Se mide el código tal como está (`src/lib/clasificar.ts`, `src/lib/jev.ts` y `src/lib/ia.ts`) y se traduce su vocabulario al del ticket.

## Restricciones

- **No se toca nada de `src/`** salvo el conjunto nuevo en `src/datos/`. El motor sigue recibiendo una frase y devolviendo `respuesta | desambiguar | fuera`.
- **`scripts/probar.ts` y `src/datos/pruebas.json` se quedan como están.** Lo nuevo va en archivos aparte.
- **HelmCode:** 100 peticiones por minuto y 10 a la vez por clave, compartidas con todos los equipos. Como mucho 2 llamadas a la vez y nunca el conjunto entero en paralelo.
- **Claves:** `HELMCODE_API_KEY` y `HELMCODE_MODEL=glm5.3-flash` en `.env.local`. `JEV_API_KEY` todavía no la tenemos en local.
- **Archivos protegidos:** no se editan `datos/`, `comun/`, `contexto.md` ni `SETUP.md`.

## Cómo encaja el motor actual en el ticket

| El ticket pide | Con el motor actual |
| - | - |
| `respuesta` | `respuesta` |
| `aclaracion` | `desambiguar` |
| `sin_coincidencia` | `fuera` |
| Medir cada proveedor por separado y sin respaldo por palabras | `clasificar(frase, "llm")` es HelmCode solo. Para Jev se llama a `preguntarJev(frase)`. Con un motor forzado, las palabras clave no entran nunca. |
| Casos de varios turnos | El motor recibe una sola frase, así que se unen los turnos del ciudadano con saltos de línea. Es lo que el ticket 4 dice que recibe Jev. HelmCode pierde los turnos del asistente: es una aproximación y hay que decirlo en los resultados. |
| Confianza `alta` o `media` | No existe por candidata. `respuesta` equivale a alta y `desambiguar`, a media. |

## Qué se mide: tres columnas con dos llamadas por caso

Cada caso hace una llamada a Jev y otra a HelmCode. Con eso se sacan tres columnas sin llamadas extra:

- **Jev:** `decidirJev(bruto)`; si devuelve `null` (confianza baja), las 2 o 3 candidatas más probables, como hace `clasificar(frase, "jev")`. Esas 3 líneas de `desambiguarJev` no están exportadas y se copian en el script.
- **HelmCode:** el resultado de `clasificar(frase, "llm")`.
- **Cadena actual:** `decidirJev(bruto)` y, si es `null`, el resultado de HelmCode con el idioma de Jev. Es lo que hace `clasificar(frase)` y lo que verá el público esta noche si `JEV_API_KEY` está en Vercel. Sin la clave, la versión publicada es la columna de HelmCode más el respaldo por palabras.

En la práctica, el ticket 7 («qué proveedor por defecto») se reduce hoy a una pregunta: ¿ponemos `JEV_API_KEY` en Vercel, y con qué umbrales?

## Paso 1 · El conjunto: `src/datos/evaluacion.json`

Cada caso tiene esta forma:

```json
{
  "id": "va-menjador",
  "grupo": "nuevas",
  "tipo": "parafrasis",
  "turnos": ["el menjador del col·legi del meu fill és molt car"],
  "esperado": { "caso": "respuesta", "id": "ayudas-comedor-escolar" },
  "idioma": "va"
}
```

- **`esperado`** tiene una de tres formas: `{ "caso": "respuesta", "id" }`, `{ "caso": "aclaracion", "ids": [...] }` (los ids aceptables) o `{ "caso": "sin_coincidencia" }`.
- **`tipo`** es uno de `parafrasis`, `faltas`, `ambigua`, `sin_coincidencia` o `varios_turnos`. El castellano y el valenciano salen de `idioma`.

**Catálogo (105 casos, `grupo: "catalogo"`).** Se generan una vez a partir de las `frases_usuario`, con `esperado: respuesta` y el id de su entrada. En cada entrada, la quinta frase es la valenciana (comprobado en las 21), así que lleva `idioma: "va"` y las demás, `"es"`. Están en los `criteria` de Jev y en el prompt de HelmCode, así que solo sirven de prueba de cordura.

**Nuevas (48, `grupo: "nuevas"`).** Por tipo: 19 de paráfrasis, 8 con faltas, 6 ambiguas, 10 sin coincidencia y 5 de varios turnos. De ellas, 12 están en valenciano.

- Las 30 de `pruebas.json`, menos 2 que son frases literales del catálogo («me han echado del trabajo» y «m'han acomiadat i vull demanar l'atur») y pasan a ese grupo. Se traducen al formato nuevo:
  - un id da `respuesta`;
  - una lista da `aclaracion`;
  - `null` da `sin_coincidencia`.
- 20 nuevas para cubrir lo que faltaba. Antes solo había 5 en valenciano y 2 ambiguas, y ninguna de varios turnos:
  - más valenciano y más faltas de ortografía;
  - ambiguas como «me he mudado» (padrón, DGT o SIP) o «no tengo dinero» (IMV, RVI o subsidio);
  - sin coincidencia: «quiero adoptar un perro», «cómo pido la nacionalidad» y otra inyección de prompt;
  - de 3 a 5 de varios turnos, por ejemplo `["me he mudado", "a València, y quiero empadronarme"]`.
- **El equipo revisa los resultados esperados antes de lanzar nada.** Son decisiones, no hechos: por ejemplo, si «me he mudado a valencia» es `respuesta` de padrón o una aclaración entre padrón y DGT.

## Paso 2 · El script: `scripts/evaluar.ts`

```bash
bun scripts/evaluar.ts                                   # llama a los dos, guarda y saca el informe
bun scripts/evaluar.ts --limite 5                        # prueba de humo con los 5 primeros
bun scripts/evaluar.ts --solo llm                        # solo HelmCode (mientras no haya clave de Jev)
bun scripts/evaluar.ts --desde evaluacion/<archivo>.json # informe y barrido sin llamar a nadie
```

- **Llamadas:** Jev, de una en una (tarda unos 0,3 s). HelmCode, como mucho 2 a la vez. `completar()` ya reintenta los 429.
- **Si falta una clave,** ese proveedor se salta con un aviso y el script no se cae.
- **Salida en bruto:** `evaluacion/<fecha>.json`, con cada caso y su `RespuestaJev` (`probabilidades`, `confianza`, `encaja`, `idioma`), el resultado de HelmCode, las latencias y los errores. La carpeta `evaluacion/` se añade a `.gitignore`. Es el único cambio en un archivo que ya existe.
- **Informe** en Markdown, listo para pegar en el ticket.

### Cómo se puntúa cada caso

| Resultado | Cuándo |
| - | - |
| Acierto | Coincide el caso esperado: `respuesta` con el id esperado, `desambiguar` con al menos un id aceptable o `fuera` cuando no había coincidencia |
| Aclaración con el id correcto | Se esperaba `respuesta` y salió `desambiguar` con ese id entre las opciones. Cuesta un clic, pero no rompe la regla 4. |
| **Respuesta indebida** | `respuesta` cuando se esperaba aclaración o sin coincidencia. Es la métrica principal del ticket. |
| Respuesta con id equivocado | `respuesta` con otro id cuando se esperaba `respuesta`. Va aparte porque el ticket no la incluye en la métrica principal, aunque también enseña una entrada que no toca. |
| Otro fallo | `fuera` sin motivo, o `desambiguar` sin ningún id aceptable |
| Error | Excepción o timeout (HelmCode corta a los 15 s) |

### Tablas

1. Una tabla por grupo (`catalogo` y `nuevas`) con una fila por columna medida (Jev, HelmCode y cadena) y estas columnas: N, aciertos, aclaración con el id correcto, respuestas indebidas (n/N de los casos donde no tocaba responder), id equivocado, idioma correcto, errores y latencia (mediana y p95). En la cadena, la latencia es la de Jev más la de HelmCode cuando hay que preguntarle.
2. El desglose de `nuevas` por idioma (`es` y `va`) y por `tipo`, con aciertos y respuestas indebidas.

### Barrido de umbrales

Solo sobre `nuevas` y con las respuestas de Jev ya guardadas, sin llamar a nadie. El script cambia `UMBRAL` (es un objeto exportado y sus campos se pueden reasignar) y vuelve a llamar al `decidirJev` real, así que mide la regla del código y no una copia.

- **Rejilla:** `encaja` de 0,10 a 0,80, `confianzaAlta` de 0,60 a 0,95 y `confianzaMedia` de 0,20 a 0,70, de 0,05 en 0,05 y con media por debajo de alta. Son 1.230 combinaciones.
- **Salida:** la combinación actual (0,40, 0,85 y 0,40) y la frontera entre las dos métricas. Para cada número de respuestas malas (indebidas más ids equivocados), desde el mínimo hasta el actual, sale el máximo de aciertos que se consigue y el rango de cada umbral entre las combinaciones que lo empatan. Se hace para la columna de Jev y para la de la cadena (los resultados de HelmCode ya están guardados para todos los casos).
- **Por qué una frontera y no un ganador:** ordenar solo por «menos respuestas malas» premia umbrales extremos que lo mandan todo a «fuera». La frontera enseña cuánto acierto cuesta cada respuesta mala que se evita, y eso lo decide el equipo.
- **Con 48 casos es fácil sobreajustar.** Hay que elegir valores redondos en medio de un rango ancho, no el borde exacto de uno.

## Paso 3 · Ejecutar

1. **`.env.local` en este worktree** con las claves de HelmCode (está en el worktree `api-key-tokens`) y `JEV_API_KEY`. Es la decisión 2, pendiente.
2. **Prueba de humo:** `--limite 5`.
3. **Pasada completa.** HelmCode son 145 llamadas; con 2 a la vez y 3 a 8 s cada una, entre 5 y 10 minutos. Jev, menos de un minuto. Sin clave de Jev se lanza `--solo llm` y Jev se mide cuando llegue.
4. **Informe y barrido** con `--desde`.

## Paso 4 · Cerrar el ticket

En `## Resolution` del ticket 6:

- La tabla comparativa de `nuevas`. La de `catalogo` va como prueba de cordura.
- La tasa de respuestas indebidas de Jev, HelmCode y la cadena.
- Los umbrales recomendados y por qué.
- Lo que no se ha podido medir:
  - el contexto del asistente en los casos de varios turnos;
  - la confianza por candidata;
  - el texto de las aclaraciones, que no existe en el código actual.
- Si muchos errores de HelmCode son timeouts de 15 s, apuntarlo para el ticket 7. No se cambia ahora.

Cambiar `UMBRAL` en `clasificar.ts` por los valores recomendados es un paso aparte que decide el equipo: son tres números, no el contrato.

## Comprobación

- `bun run typecheck` y `bun run build` pasan. `tsconfig.json` incluye `scripts/`, así que el script tiene que compilar.
- `bun scripts/unitarias.ts` sigue pasando.
- `git status` solo muestra `src/datos/evaluacion.json`, `scripts/evaluar.ts`, `.gitignore` y esta guía.
