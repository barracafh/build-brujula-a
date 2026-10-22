import type { Entrada } from "@/lib/entrada";
import { fechasPlazo, type FechaPlazo } from "@/datos/fechas-plazo";
import type { IdiomaRespuesta } from "@/components/respuesta/textos";

// Enlace «Añadir a Google Calendar» del plazo (ticket 19). Solo fechas fijas
// que aparecen literales en el plazo y que aún no han pasado.

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
