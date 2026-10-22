// Contrato del motor (ticket 04 del mapa Brújula, .scratch/brujula/issues/).
// Cada proveedor (Jev, HelmCode, el simulado) es un adaptador que implementa
// `Motor`; la ruta /api/consulta elige uno y es lo único que lo llama.
//
// El motor solo maneja ids del catálogo: nunca devuelve pasos, plazos,
// importes, requisitos ni enlaces. La ruta valida y recorta el historial y
// sustituye DNI/NIE, correos y teléfonos por un marcador antes de llamarlo.
// Si el motor no puede responder, lanza: la ruta lo convierte en el error de
// la interfaz («la IA no responde»), que no forma parte del resultado.

export type Idioma = "es" | "va";
export type Proveedor = "jev" | "helmcode" | "simulado";

export const MAX_TURNOS = 6;
export const MAX_CARACTERES = 1000;

// A Jev se le manda solo lo que escribió el ciudadano, concatenado; a
// HelmCode, la lista completa.
export type Turno = { rol: "ciudadano" | "asistente"; texto: string };

// HelmCode solo puede devolver "alta" para una candidata; si dudó entre
// varias, todas pasan a "media".
export type Candidata = { id: string; confianza: "alta" | "media" };

type Comun = { idioma: Idioma; proveedor: Proveedor };

// - respuesta: coincidencia clara, una candidata con confianza alta.
// - aclaracion: de 2 a 3 candidatas, o alguna media. `texto` lo redacta
//   HelmCode con el guardarraíl del ticket 04 (sin dígitos, moneda, `http` ni
//   más de 280 caracteres) o, si falla, sale de la plantilla fija.
// - sin_coincidencia: `texto` siempre de plantilla, nunca redactado.
// Los ids ya vienen validados contra el catálogo: un id inventado se descarta.
export type Resultado =
  | ({ tipo: "respuesta"; candidata: Candidata } & Comun)
  | ({ tipo: "aclaracion"; candidatas: Candidata[]; texto: string } & Comun)
  | ({ tipo: "sin_coincidencia"; texto: string } & Comun);

export interface Motor {
  clasificar(historial: Turno[], senal?: AbortSignal): Promise<Resultado>;
}
