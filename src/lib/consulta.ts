import type { Candidata, Idioma, Turno } from "./motor/contrato";
import type { Entrada, Resumen } from "./entrada";

// Lo que intercambian la interfaz y POST /api/consulta. Solo tipos.

export type PeticionConsulta = { historial: Turno[] };

type Comun = { idioma: Idioma };

export type RespuestaConsulta =
  | ({ tipo: "respuesta"; entrada: Entrada } & Comun)
  | ({
      tipo: "aclaracion";
      texto: string; // redactado con IA o de plantilla
      candidatas: (Resumen & Pick<Candidata, "confianza">)[];
    } & Comun)
  | ({ tipo: "sin_coincidencia"; texto: string } & Comun);
