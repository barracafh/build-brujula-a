import type { Idioma } from "./contrato";

// Textos fijos que devuelve el motor (ticket 04). «Sin coincidencia» siempre
// sale de aquí; la aclaración, cuando la redacción con IA falla o el
// guardarraíl la rechaza. En el chat de la ficha: «fuera de ámbito» cuando el
// agente no usó ninguna herramienta, y «no confirmado» cuando citó una cifra o
// un enlace que no estaba en el material. Nunca pasos, plazos ni requisitos.
export const plantillas: Record<
  Idioma,
  {
    aclaracion: string;
    sinCoincidencia: string;
    fueraDeAmbito: string;
    noConfirmado: string;
  }
> = {
  es: {
    aclaracion: "¿Cuál de estas opciones se parece más a tu caso?",
    sinCoincidencia:
      "No tenemos este trámite en Brújula. Búscalo en el Punto de Acceso General o cuéntanoslo de otra forma.",
    fueraDeAmbito:
      "Esa pregunta no forma parte de lo que puede hacer este asistente. Solo resuelvo dudas sobre este trámite y otros trámites y ayudas públicas.",
    noConfirmado:
      "No podemos confirmarlo con la información oficial que tenemos. Consúltalo en la sede oficial que aparece en las fuentes.",
  },
  va: {
    aclaracion: "Quina d'estes opcions s'assembla més al teu cas?",
    sinCoincidencia:
      "No tenim este tràmit en Brújula. Busca'l en el Punt d'Accés General o conta'ns-ho d'una altra manera.",
    fueraDeAmbito:
      "Eixa pregunta no forma part del que pot fer este assistent. Només resolc dubtes sobre este tràmit i altres tràmits i ajudes públiques.",
    noConfirmado:
      "No podem confirmar-ho amb la informació oficial que tenim. Consulta-ho en la seu oficial que apareix en les fonts.",
  },
};
