import catalogoJson from "../../datos/catalogo-tramites-ayudas.json";

// Lectura del catálogo de la organización (datos/). No se edita: lo nuestro va
// en src/datos/. Lo usan el servidor y el cliente.
export type Tramite = {
  id: string;
  tipo: string; // "tramite" | "ayuda"
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
  fuente: string;
  verificado: boolean;
  nota?: string | null;
  relacionados: string[];
};

// Asignación comprobada por TypeScript: si el JSON cambia de forma, falla el build.
export const tramites: Tramite[] = catalogoJson.items;
export const avisoCatalogo: string = catalogoJson.aviso;

const porId = new Map(tramites.map((t) => [t.id, t]));

export const getTramite = (id: string): Tramite | undefined => porId.get(id);

export const esId = (id: unknown): id is string =>
  typeof id === "string" && porId.has(id);

// "url1 ; url2" → [{nombre: host, url}], el formato de <Fuentes />.
export function fuentesDe(t: Tramite) {
  return t.fuente
    .split(";")
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//.test(u))
    .map((url) => ({ nombre: new URL(url).hostname, url }));
}

// Una línea por trámite para el prompt del LLM.
export const resumenParaPrompt = () =>
  tramites
    .map(
      (t) => `- ${t.id}: ${t.titulo}. Ejemplos: ${t.frases_usuario.join(" | ")}`,
    )
    .join("\n");
