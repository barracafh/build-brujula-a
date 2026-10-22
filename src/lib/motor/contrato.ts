// Contrato del motor (ticket 04 del mapa Brújula, .scratch/brujula/issues/).
// Cada proveedor (Jev, HelmCode, el simulado) es un adaptador que implementa
// `Motor`; la ruta /api/consulta elige uno y es lo único que lo llama.
//
// Al clasificar, el motor solo maneja ids del catálogo: nunca devuelve pasos,
// plazos, importes, requisitos ni enlaces. En el chat de la ficha
// (`entradaAbierta`), el texto puede citar cifras y enlaces solo si aparecen
// tal cual en lo que devolvieron las herramientas (regla del 22/10/2026,
// comentario del ticket 04); si no, se responde con la plantilla
// «No podemos confirmarlo». La ruta valida y recorta el historial y sustituye
// DNI/NIE, correos y teléfonos por un marcador antes de llamarlo. Si el motor
// no puede responder, lanza: la ruta lo convierte en el error de la interfaz
// («la IA no responde»), que no forma parte del resultado.

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

// Fuente oficial que sostiene una contestación del chat.
export type FuenteResultado = { nombre: string; url: string };

type Comun = { idioma: Idioma; proveedor: Proveedor };

// - respuesta: coincidencia clara, una candidata con confianza alta.
// - aclaracion: de 2 a 3 candidatas, o alguna media. `texto` lo redacta
//   HelmCode (como mucho 280 caracteres; cifras y enlaces solo si están en
//   los títulos de las candidatas) o, si falla, sale de la plantilla fija.
// - sin_coincidencia: `texto` siempre de plantilla, nunca redactado.
// - contestacion: solo con `entradaAbierta` (chat de la ficha). `texto` lo
//   redacta el agente con lo que devolvieron sus herramientas, o sale de una
//   plantilla (fuera de ámbito, no podemos confirmarlo). `fuentes` son las de
//   las entradas consultadas; `candidatas`, otras entradas que salieron en la
//   conversación, para ofrecer «Abrir» (siempre "media", nunca la abierta).
// Los ids ya vienen validados contra el catálogo: un id inventado se descarta.
export type Resultado =
  | ({ tipo: "respuesta"; candidata: Candidata } & Comun)
  | ({ tipo: "aclaracion"; candidatas: Candidata[]; texto: string } & Comun)
  | ({ tipo: "sin_coincidencia"; texto: string } & Comun)
  | ({
      tipo: "contestacion";
      texto: string;
      fuentes: FuenteResultado[];
      candidatas: Candidata[];
    } & Comun);

export interface Motor {
  // `entradaAbierta`: id de la ficha que el ciudadano está viendo. Si llega,
  // el motor contesta dudas sobre ella (tipo "contestacion").
  clasificar(
    historial: Turno[],
    senal?: AbortSignal,
    entradaAbierta?: string,
  ): Promise<Resultado>;
}
