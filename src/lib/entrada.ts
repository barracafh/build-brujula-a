// Forma normalizada de una entrada del catálogo (ticket 05). Solo tipos: lo
// importan el servidor y los componentes de cliente.

export type Fuente = { nombre: string; url: string };

export type Entrada = {
  id: string;
  tipo: "tramite" | "ayuda";
  titulo: string;
  administracion: string;
  organismo: string;
  frases_usuario: string[];
  requisitos_clave: string[];
  pasos: string[];
  documentacion: string[];
  plazo: string | null;
  enlace_info: string;
  enlace_tramite: string | null;
  fuentes: Fuente[]; // `fuente` partida, con el nombre de src/datos/
  verificado: boolean;
  nota: string | null; // ya sustituida si hablaba al equipo
  relacionados: string[];
};

// Campos de la ficha que se traducen al valenciano (decisiones.md, punto 23).
export const CAMPOS_TRADUCIBLES = [
  "titulo",
  "organismo",
  "administracion",
  "requisitos_clave",
  "pasos",
  "documentacion",
  "plazo",
  "nota",
] as const;
export type Traduccion = Pick<Entrada, (typeof CAMPOS_TRADUCIBLES)[number]>;

// Lo que reciben la interfaz y /api/entradas: la entrada y su traducción
// automática sin revisar (null → se muestra en castellano). El catálogo y el
// agente nunca la ven.
export type EntradaConTraduccion = Entrada & { va: Traduccion | null };

// Lo que necesita un botón de candidata en la aclaración.
export type Resumen = Pick<Entrada, "id" | "tipo" | "titulo" | "organismo">;

export interface FuenteCatalogo {
  listar(): Promise<Entrada[]>;
  obtener(id: string): Promise<Entrada | undefined>;
}
