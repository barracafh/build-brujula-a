import type { Idioma } from "./contrato";

// Textos fijos que devuelve el motor (ticket 04). «Sin coincidencia» siempre
// sale de aquí; la aclaración, cuando la redacción con IA falla o el
// guardarraíl la rechaza. Solo aclaran: nunca pasos, plazos ni requisitos.
export const plantillas: Record<
  Idioma,
  { aclaracion: string; sinCoincidencia: string }
> = {
  es: {
    aclaracion: "¿Cuál de estas opciones se parece más a tu caso?",
    sinCoincidencia:
      "No tenemos este trámite en Brújula. Búscalo en el Punto de Acceso General o cuéntanoslo de otra forma.",
  },
  va: {
    aclaracion: "Quina d'estes opcions s'assembla més al teu cas?",
    sinCoincidencia:
      "No tenim este tràmit en Brújula. Busca'l en el Punt d'Accés General o conta'ns-ho d'una altra manera.",
  },
};
