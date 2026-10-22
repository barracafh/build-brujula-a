import type { Candidata, Idioma, Turno } from "./motor/contrato";
import type { EntradaConTraduccion, Fuente, Resumen } from "./entrada";

// Lo que intercambian la interfaz y POST /api/consulta. Solo tipos.

// `entradaAbierta`: id de la ficha que se está viendo. Con él, la ruta
// responde como chat de la ficha (tipo "contestacion", docs/CHAT.md).
export type PeticionConsulta = { historial: Turno[]; entradaAbierta?: string };

type Comun = { idioma: Idioma };

type CandidataResumida = Resumen & Pick<Candidata, "confianza">;

export type RespuestaConsulta =
  | ({ tipo: "respuesta"; entrada: EntradaConTraduccion } & Comun)
  | ({
      tipo: "aclaracion";
      texto: string; // redactado con IA o de plantilla
      candidatas: CandidataResumida[];
    } & Comun)
  | ({ tipo: "sin_coincidencia"; texto: string } & Comun)
  | ({
      tipo: "contestacion";
      texto: string; // redactado por el agente o de plantilla
      fuentes: Fuente[]; // para <Fuentes />; vacío si la pregunta era de fuera
      candidatas: CandidataResumida[]; // otras entradas, con botón «Abrir»
    } & Comun);
