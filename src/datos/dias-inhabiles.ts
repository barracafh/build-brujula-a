// Días inhábiles de 2026 entre semana, nacionales y de la Comunitat Valenciana,
// según el calendario de la AGE para el cómputo de plazos (BOE-A-2025-23702).
// Los sábados y domingos se quitan aparte. No incluye fiestas locales: sin
// ellas, la fecha calculada puede salir antes que la real, nunca después
// (ticket 19).
export const fuenteInhabiles = {
  nombre: "Calendario de días inhábiles 2026 (BOE)",
  url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-23702",
};

// Solo se calcula en días hábiles dentro de este año.
export const anioInhabiles = 2026;

export const inhabiles = new Set([
  "2026-01-01",
  "2026-01-06",
  "2026-03-19",
  "2026-04-03",
  "2026-04-06",
  "2026-05-01",
  "2026-06-24",
  "2026-10-09",
  "2026-10-12",
  "2026-12-08",
  "2026-12-25",
]);
