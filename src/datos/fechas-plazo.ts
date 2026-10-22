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
