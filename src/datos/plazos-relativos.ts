// Plazos que cuentan desde una fecha de cada persona («15 días hábiles desde…»).
// Se cuentan desde hoy para el enlace «Añadir a Google Calendar» (ticket 19), y
// el evento avisa de que, si esa fecha fue antes, el plazo termina antes. Cada
// fragmento de `literal` tiene que aparecer tal cual en el plazo del catálogo;
// si no, no hay enlace. `cambio-domicilio-dgt` no va: su plazo dice «15 días»
// sin decir si son hábiles o naturales.
export type PlazoRelativo = {
  dias: number;
  tipo: "habiles" | "naturales";
  literal: string[];
  que: { es: string; va: string };
  siAntes: { es: string; va: string };
};

export const plazosRelativos: Record<string, PlazoRelativo> = {
  "prestacion-desempleo": {
    dias: 15,
    tipo: "habiles",
    literal: ["15 días", "días hábiles"],
    que: {
      es: "Último día para pedir el paro",
      va: "Últim dia per a demanar l'atur",
    },
    siAntes: {
      es: "Si el despido o el fin del contrato fue antes, el plazo termina antes.",
      va: "Si l'acomiadament o la fi del contracte va ser abans, el termini acaba abans.",
    },
  },
  "inscripcion-demandante-labora": {
    dias: 15,
    tipo: "habiles",
    literal: ["15 días hábiles"],
    que: {
      es: "Último día para inscribirte si vas a pedir el paro",
      va: "Últim dia per a inscriure't si demanaràs l'atur",
    },
    siAntes: {
      es: "Si el fin de la última relación laboral fue antes, el plazo termina antes.",
      va: "Si la fi de l'última relació laboral va ser abans, el termini acaba abans.",
    },
  },
  "multa-dgt": {
    dias: 20,
    tipo: "naturales",
    literal: ["20 días naturales"],
    que: {
      es: "Último día para pagar la multa con el 50 % de descuento",
      va: "Últim dia per a pagar la multa amb el 50 % de descompte",
    },
    siAntes: {
      es: "Si la notificación de la multa fue antes, el plazo termina antes.",
      va: "Si la notificació de la multa va ser abans, el termini acaba abans.",
    },
  },
};
