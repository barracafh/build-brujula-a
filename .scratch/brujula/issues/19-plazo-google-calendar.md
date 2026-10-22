# Añadir el plazo a Google Calendar

Type: task
Status: open
Claimed: sí (sesión 22/10/2026)
Blocked by:

## Question

Un enlace «Añadir a Google Calendar» en la tarjeta sol del plazo de la respuesta compuesta, para las entradas cuyo plazo tiene una fecha límite fija que aún no ha pasado. Abre Google Calendar con un evento de día entero ya rellenado. No usa la API de Google, ni OAuth, ni claves, y no pasa nada por nuestro servidor.

`plazo` es texto libre ([Anatomía de la respuesta compuesta](03-anatomia-respuesta-compuesta.md), [Fuente del catálogo](05-fuente-del-catalogo.md)). Así están las 21 entradas a 22/10/2026:

| Plazo | Entradas | Enlace |
|---|---|---|
| Fecha fija y abierta | `voto-por-correo` (pedirlo hasta el 19/11/2026, entregar el voto hasta el 25/11/2026), `xarxa-llibres` (hasta el 10/11/2026, inclusive) | Sí |
| Fecha fija ya pasada | `declaracion-renta`, `bono-alquiler-joven`, `ayudas-comedor-escolar` | No |
| Relativo («15 días desde…») | `prestacion-desempleo`, `inscripcion-demandante-labora`, `cambio-domicilio-dgt`, `multa-dgt` | No |
| Sin fecha límite o `null` | el resto | No |

- **Solo fechas fijas.** Los plazos relativos quedan fuera: habría que pedir la fecha de inicio y contar días hábiles con un calendario de festivos, y un error ahí es un plazo inventado (regla 4).
- **Las fechas se escriben a mano** en `src/datos/fechas-plazo.ts`, porque `datos/` no se edita: id de la entrada → lista de `{ fecha: "AAAA-MM-DD", que: { es, va } }`.
- **Guardarraíl:** una fecha solo vale si su forma larga en castellano («19 de noviembre de 2026») aparece tal cual en el `plazo` de la entrada. Si el catálogo cambia y la fecha ya no está, el enlace desaparece solo. Es la misma regla que en el chat: cifras tal cual o nada ([Contrato del motor](04-contrato-motor.md)).
- **Solo si no ha pasado:** se compara con la fecha de hoy en `Europe/Madrid`. El último día se sigue mostrando.
- **Estilo:** `<a>` con `buttonVariants({ variant: "outline" })`, porque `sunset` es solo «Hacer el trámite». Va dentro de la tarjeta sol, debajo del plazo literal, con la fecha visible en `font-mono`. Se abre en una pestaña nueva para no perder la respuesta, y lo dice al lector de pantalla.
- **El evento:** el título es «<que> · <titulo>», con `que` en el idioma de la interfaz y el título literal. Es de día entero. La descripción lleva el `plazo` literal, el enlace de «Dónde se hace» y la primera fuente.
- **Privacidad:** el enlace solo lleva datos del catálogo (título, fecha, plazo y enlaces), nada de lo que escribió el ciudadano, así que las reglas 2 y 3 no se tocan. El evento queda en la cuenta de Google de quien lo añade, que es quien lo decide. No hace falta ampliar el aviso del primer uso ([Aviso del primer uso con ElevenLabs](15-aviso-elevenlabs.md)) [INFERENCE: no se envía nada a un proveedor nuevo desde Brújula].
- **Fuera:** un `.ics` para Apple Calendar y Outlook (unas 15 líneas más, si sobra tiempo) y `FichaTramite.tsx`, que no se monta en ninguna página (`Buscador` no se usa).

Hecho cuando `voto-por-correo` muestra dos enlaces y `xarxa-llibres` uno; `declaracion-renta`, `bono-alquiler-joven`, `prestacion-desempleo` y `renovacion-dni` no muestran ninguno; al pulsar, Google Calendar abre el evento de día entero en el día correcto (comprobado a mano: el 19/11, no el 18 ni el 20), con el plazo y los enlaces en la descripción; se ve en `es` y en `va` sin scroll horizontal a 320 px; y `bun run build` pasa.

## Para quien implemente

Unos 15 minutos. Toca cuatro archivos y no cambia el guion de audio ni los MP3 pregenerados ([Pregenerar el audio de las respuestas](17-pregenerar-audio.md)), porque el plazo que se lee es el mismo.

### 1. `src/datos/fechas-plazo.ts`

```ts
// Fechas límite fijas sacadas a mano del `plazo` del catálogo, para el enlace
// «Añadir a Google Calendar» (ticket 19). `datos/` no se edita, así que van
// aquí. Cada fecha tiene que aparecer literal en el plazo («10 de noviembre de
// 2026»); si no, no se muestra. Los plazos relativos no van aquí.
export type FechaPlazo = { fecha: string; que: { es: string; va: string } };

export const fechasPlazo: Record<string, FechaPlazo[]> = {
  "voto-por-correo": [
    {
      fecha: "2026-11-19",
      que: {
        es: "Último día para pedir el voto por correo",
        va: "Últim dia per a demanar el vot per correu",
      },
    },
    {
      fecha: "2026-11-25",
      que: {
        es: "Último día para entregar el voto",
        va: "Últim dia per a lliurar el vot",
      },
    },
  ],
  "xarxa-llibres": [
    {
      fecha: "2026-11-10",
      que: {
        es: "Último día para solicitarlo",
        va: "Últim dia per a sol·licitar-ho",
      },
    },
  ],
};
```

Los textos en valenciano están sin revisar: que los mire alguien del equipo.

### 2. `src/lib/calendario.ts`

```ts
import type { Entrada } from "@/lib/entrada";
import { fechasPlazo, type FechaPlazo } from "@/datos/fechas-plazo";
import type { IdiomaRespuesta } from "@/components/respuesta/textos";

// Enlace «Añadir a Google Calendar» del plazo (ticket 19). Solo fechas fijas
// que aparecen literales en el plazo y que aún no han pasado.

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// "2026-11-10" → "10 de noviembre de 2026", como lo escribe el catálogo.
function enLetra(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

// Hoy en Madrid como "AAAA-MM-DD": las fechas ISO se comparan como texto.
const hoy = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(
    new Date(),
  );

export function fechasAbiertas(e: Entrada): FechaPlazo[] {
  const plazo = e.plazo;
  if (!plazo) return [];
  const h = hoy();
  return (fechasPlazo[e.id] ?? []).filter(
    (f) => f.fecha >= h && plazo.includes(enLetra(f.fecha)),
  );
}

// Evento de día entero: Google toma el día final como excluido.
export function enlaceGoogleCalendar(
  e: Entrada,
  f: FechaPlazo,
  idioma: IdiomaRespuesta,
) {
  const [a, m, d] = f.fecha.split("-").map(Number);
  const siguiente = new Date(Date.UTC(a, m - 1, d + 1))
    .toISOString()
    .slice(0, 10);
  // El enlace del trámite suele ser también la primera fuente: va una vez.
  const enlaces = new Set([
    e.enlace_tramite ?? e.enlace_info,
    e.fuentes[0]?.url,
  ]);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${f.que[idioma]} · ${e.titulo}`,
    dates: `${f.fecha.replaceAll("-", "")}/${siguiente.replaceAll("-", "")}`,
    details: [e.plazo, ...enlaces].filter(Boolean).join("\n\n"),
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
```

- `calendar/render?action=TEMPLATE` no lo documenta Google oficialmente, aunque lleva años estable y es el que usa todo el mundo. Por eso el «Hecho cuando» pide comprobarlo a mano.
- `hoy()` se calcula al pintar. Hoy no hay problema, porque `RespuestaCompuesta` solo se monta dentro de `Flujo` (cliente) tras la respuesta de la API, así que no hay desajuste de hidratación. Si algún día se pinta en el servidor (la ruta propia de cada entrada sigue sin especificar en el mapa), una página estática congelaría la fecha del build: entonces hay que hacerla dinámica o calcular la fecha en un efecto.

### 3. `src/components/respuesta/textos.ts`

En `es`:

```ts
    anadirCalendario: "Añadir a Google Calendar",
    pestanaNueva: "(se abre en una pestaña nueva)",
```

En `va`:

```ts
    anadirCalendario: "Afegir a Google Calendar",
    pestanaNueva: "(s'obri en una pestanya nova)",
```

### 4. `src/components/respuesta/RespuestaCompuesta.tsx`

En la tarjeta sol, justo después del `<p>` con `{e.plazo}`:

```tsx
{fechas.length > 0 && (
  <ul className="grid gap-3">
    {fechas.map((f) => (
      <li
        key={f.fecha}
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
      >
        <p className="min-w-0 flex-[1_1_200px]">
          <time dateTime={f.fecha} className="font-mono text-sm">
            {f.fecha.split("-").reverse().join("/")}
          </time>{" "}
          {f.que[idioma]}
        </p>
        <a
          href={enlaceGoogleCalendar(e, f, idioma)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-auto min-h-11 whitespace-normal max-md:w-full",
          )}
        >
          {tx.anadirCalendario} <span aria-hidden="true">↗</span>
          <span className="sr-only">
            : {f.que[idioma]} {tx.pestanaNueva}
          </span>
        </a>
      </li>
    ))}
  </ul>
)}
```

Con `const fechas = fechasAbiertas(e);` junto a `conTramite`. El texto visible del enlace es el comienzo de su nombre accesible (WCAG 2.5.3), y el `sr-only` distingue los dos enlaces de `voto-por-correo`. `outline` lleva `bg-background`, así que se lee bien sobre el sol; comprobar el foco visible sobre el amarillo.

### Al cerrar

Añadir la línea a «Decisions so far» de `.scratch/brujula/map.md` y anotar en la resolución si el formato de URL funcionó tal cual en escritorio y en móvil (en Android puede abrir la app de Calendar en vez de la web).

## Notas

- 22/10/2026: implementado tal como dice la guía, en `src/datos/fechas-plazo.ts`, `src/lib/calendario.ts`, `textos.ts` y `RespuestaCompuesta.tsx`. Un cambio respecto a la guía: en `voto-por-correo` el enlace del trámite y la primera fuente son la misma URL, así que la descripción la ponía dos veces. Ahora va una sola vez.
- Comprobado en local con el motor simulado:
  - De las 21 entradas, solo `voto-por-correo` (19/11 y 25/11) y `xarxa-llibres` (10/11) dan enlace, como estaba previsto.
  - `dates` sale `20261119/20261120`, `20261125/20261126` y `20261110/20261111`.
  - El nombre accesible es, por ejemplo, «Añadir a Google Calendar: Último día para pedir el voto por correo (se abre en una pestaña nueva)», y en valenciano «Afegir a Google Calendar: …».
  - A 320 px no hay scroll horizontal y `bun run build` pasa.
- **Falta para cerrar:** abrir uno de los enlaces con una sesión de Google iniciada y comprobar que el evento cae el día correcto. Sin sesión, Google redirige a la página de producto de Calendar y no se ve el evento. Siguen sin revisar los textos en valenciano de `fechas-plazo.ts` y `plazos-relativos.ts`.

## Comments

- 22/10/2026, Guillem: «si hay uno que es en 15 días, podríamos hacer que mire la fecha y sume los días». Esto sustituye la decisión «Solo fechas fijas» de arriba para tres entradas:
  - **Qué entradas:** `prestacion-desempleo` y `inscripcion-demandante-labora` (15 días hábiles) y `multa-dgt` (20 días naturales), en `src/datos/plazos-relativos.ts`. Cada una lleva fragmentos que tienen que estar literales en su `plazo` («15 días hábiles», «20 días naturales»); si el catálogo cambia, el cálculo desaparece.
  - **Qué queda fuera:** `cambio-domicilio-dgt`, porque su plazo dice «15 días» sin decir si son hábiles o naturales (regla 4). Tampoco entran los plazos relativos que son de un caso particular: la incorporación sobrevenida de `ayudas-comedor-escolar` y las subsanaciones de los pasos.
  - **Desde hoy, solo el botón:** Guillem pidió después «que sea desde la fecha actual y solo el añadir al Google Calendar». Así que no se pide ninguna fecha: el plazo se cuenta desde hoy y en la tarjeta sol solo aparece el botón `outline`. Lo que antes explicaba la tarjeta va ahora al principio de la descripción del evento: «Contado desde hoy, 22/10/2026. Si el despido o el fin del contrato fue antes, el plazo termina antes.», seguido de cómo se cuenta y del enlace al BOE. Lo genera `enlaceRelativo()` en `src/lib/calendario.ts`, con `siAntes` de `src/datos/plazos-relativos.ts`.
  - **Riesgo aceptado:** quien consulte días después del despido o de la notificación recibe un recordatorio más tarde que su plazo real. Solo lo avisa la descripción del evento. Se intentó antes con un campo de fecha, que evitaba esto, y se quitó a petición de Guillem.
  - **Cómo se cuenta:** desde el día siguiente (Ley 39/2015, art. 30, que cita `contexto.md`). Los días hábiles saltan sábados, domingos y los días inhábiles de 2026, nacionales y de la Comunitat Valenciana, del calendario de la AGE ([BOE-A-2025-23702](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-23702)). Los copié del anexo en `src/datos/dias-inhabiles.ts`: 1 y 6/1, 19/3, 3 y 6/4, 1/5, 24/6, 9 y 12/10, 8 y 25/12. El 2/11 y el 7/12 solo son inhábiles en otras comunidades.
  - **Del lado seguro en el cómputo:** solo se quitan días que con seguridad son inhábiles. Las fiestas locales y el art. 30.6 (día inhábil en la sede del órgano) no se cuentan, así que, contando desde la fecha correcta, la fecha calculada puede salir antes que la real, nunca después. La descripción del evento lo dice y enlaza el BOE.
  - **Sin calendario, no hay botón:** si un día contado cae fuera de 2026, el botón no aparece. El calendario de 2027 aún no está publicado; desde hoy, eso pasa con el paro a partir del 10/12. Los días naturales no necesitan calendario.
  - **Comprobado:**
    - `calcularPlazo` da 12/11 para el paro y 11/11 para la multa desde el 22/10; desde el 8/10, el paro da 2/11 (salta el 9 y el 12/10 y el fin de semana); desde el 10/12 devuelve `null`.
    - En el navegador, el botón del paro lleva `dates=20261112/20261113` y la nota al principio de la descripción.
    - El botón mide 205 px en escritorio y ocupa todo el ancho por debajo de `md`, como «Hacer el trámite».
    - `bun run build` pasa.
- 22/10/2026: revisadas las 21 entradas y todos sus campos en busca de fechas. No falta ninguna fecha fija abierta en `plazo`. Las únicas fechas que no van son las de la `nota` de `voto-por-correo` para quien vive fuera: el 31/10 para quien reside temporalmente en el extranjero, y del 21 al 26/11 y el 24/11 para el CERA. Son de otro grupo y no llevan año.
