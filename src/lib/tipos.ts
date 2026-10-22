export type Idioma = "es" | "va";
export type Motor = "jev" | "llm" | "palabras";

// RESPUESTA siempre lleva id; DESAMBIGUAR, de 1 a 3 opciones; FUERA, nada.
export type Resultado =
  | { caso: "respuesta"; id: string; idioma: Idioma; motor: Motor }
  | { caso: "desambiguar"; opciones: string[]; idioma: Idioma; motor: Motor }
  | { caso: "fuera"; idioma: Idioma; motor: Motor };
