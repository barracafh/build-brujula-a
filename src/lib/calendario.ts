import type { Entrada } from "@/lib/entrada";
import { fechasPlazo, type FechaPlazo } from "@/datos/fechas-plazo";
import { plazosRelativos, type PlazoRelativo } from "@/datos/plazos-relativos";
import {
  anioInhabiles,
  fuenteInhabiles,
  inhabiles,
} from "@/datos/dias-inhabiles";
import {
  textosRespuesta,
  type IdiomaRespuesta,
} from "@/components/respuesta/textos";

// Enlace «Añadir a Google Calendar» del plazo (ticket 19): fechas fijas que
// aparecen literales en el plazo y aún no han pasado, y plazos que cuentan
// desde una fecha de cada persona («15 días hábiles desde…»), contados desde
// hoy.

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// "2026-11-10" → "10 de noviembre de 2026", como lo escribe el catálogo.
function enLetra(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

// Hoy en Madrid como "AAAA-MM-DD": las fechas ISO se comparan como texto.
export const hoy = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(
    new Date(),
  );

// "2026-11-10" → "2026-11-11", en UTC para no cruzar cambios de hora.
function diaSiguiente(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
}

function esFinDeSemana(fecha: string) {
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return dia === 0 || dia === 6;
}

export function fechasAbiertas(e: Entrada): FechaPlazo[] {
  const plazo = e.plazo;
  if (!plazo) return [];
  const h = hoy();
  return (fechasPlazo[e.id] ?? []).filter(
    (f) => f.fecha >= h && plazo.includes(enLetra(f.fecha)),
  );
}

function plazoRelativo(e: Entrada): PlazoRelativo | undefined {
  const p = plazosRelativos[e.id];
  const plazo = e.plazo;
  if (!p || !plazo) return undefined;
  return p.literal.every((l) => plazo.includes(l)) ? p : undefined;
}

// Cuenta desde el día siguiente (Ley 39/2015, art. 30). En días hábiles se
// saltan sábados, domingos y los inhábiles de src/datos/; si algún día contado
// cae fuera del año de ese calendario, no se puede confirmar y devuelve null.
export function calcularPlazo(desde: string, p: PlazoRelativo): string | null {
  let fecha = desde;
  let quedan = p.dias;
  while (quedan > 0) {
    fecha = diaSiguiente(fecha);
    if (p.tipo === "habiles") {
      if (!fecha.startsWith(`${anioInhabiles}-`)) return null;
      if (esFinDeSemana(fecha) || inhabiles.has(fecha)) continue;
    }
    quedan--;
  }
  return fecha;
}

// Plazo que cuenta desde una fecha de cada persona, contado desde hoy. La nota
// del evento dice desde cuándo y cómo se contó, y que si esa fecha fue antes el
// plazo termina antes. Sin calendario para algún día contado, no hay enlace.
// `e` es la ficha castellana (el plazo se reconoce por su texto literal);
// `mostrada`, la que ve el ciudadano, quizá traducida.
export function enlaceRelativo(
  e: Entrada,
  idioma: IdiomaRespuesta,
  mostrada: Entrada = e,
) {
  const p = plazoRelativo(e);
  if (!p) return undefined;
  const h = hoy();
  const fecha = calcularPlazo(h, p);
  if (!fecha) return undefined;
  const tx = textosRespuesta[idioma];
  const cuenta =
    p.tipo === "habiles"
      ? `${tx.cuentaHabiles} ${tx.calendarioInhabiles} (${fuenteInhabiles.url}). ${tx.sinFiestasLocales}`
      : tx.cuentaNaturales;
  const nota = `${tx.contadoDesdeHoy}, ${fechaCorta(h)}. ${p.siAntes[idioma]} ${cuenta}`;
  return {
    que: p.que[idioma],
    href: enlaceGoogleCalendar(mostrada, { fecha, que: p.que }, idioma, nota),
  };
}

// "2026-11-10" → "10/11/2026".
export const fechaCorta = (fecha: string) =>
  fecha.split("-").reverse().join("/");

// Evento de día entero: Google toma el día final como excluido. `nota` va al
// principio de la descripción, antes del plazo literal.
export function enlaceGoogleCalendar(
  e: Entrada,
  f: Pick<FechaPlazo, "fecha" | "que">,
  idioma: IdiomaRespuesta,
  nota?: string,
) {
  // El enlace del trámite suele ser también la primera fuente: va una vez.
  const enlaces = new Set([
    e.enlace_tramite ?? e.enlace_info,
    e.fuentes[0]?.url,
  ]);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${f.que[idioma]} · ${e.titulo}`,
    dates: `${f.fecha.replaceAll("-", "")}/${diaSiguiente(f.fecha).replaceAll("-", "")}`,
    details: [nota, e.plazo, ...enlaces].filter(Boolean).join("\n\n"),
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
