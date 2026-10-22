import type { Idioma } from "@/lib/motor/contrato";

// Textos fijos del flujo (ticket 02 y 09). El contenido de las entradas no se
// traduce: sale literal del catálogo, en castellano.
export const textosFlujo = {
  es: {
    titular: "¿Qué trámite necesitas?",
    entradilla:
      "Cuéntalo con tus palabras y te decimos qué trámite es, qué necesitas, el plazo y dónde se hace.",
    cambiarIdioma: "Idioma de la interfaz",
    etiqueta: "Cuéntanos qué te pasa",
    pista:
      "En castellano o en valenciano. No escribas datos personales: ni DNI ni nombres.",
    avisoIA:
      "Hablas con una inteligencia artificial. Solo identifica el trámite: los pasos, plazos y requisitos no los escribe ella, salen del catálogo con su fuente oficial.",
    buscar: "Buscar",
    enviar: "Enviar",
    ejemplos: "O prueba con un ejemplo",
    pensando: "Pensando…",
    nueva: "Nueva consulta",
    tuConsulta: "Tu consulta",
    ronda: (n: number) => `Aclaración ${n} de 2`,
    confianzaMedia: "Puede encajar",
    tipoTramite: "Trámite",
    tipoAyuda: "Ayuda",
    ninguna: "Ninguna de estas",
    afinar: "Afina tu consulta",
    afinarPista: "Añade detalles o corrige lo que has dicho.",
    ocultar: "Ocultar",
    conversacion: "Conversación",
    volverA: "Volver a",
    cierre:
      "No conseguimos saber cuál es con seguridad. Elige una de estas o búscalo en el Punto de Acceso General.",
    fueraTitulo: "No lo encontramos en Brújula",
    errorTitulo: "No hemos podido consultarlo ahora mismo",
    errorTexto:
      "Tu consulta sigue aquí: vuelve a intentarlo o búscalo en el Punto de Acceso General.",
    reintentar: "Reintentar",
    buscarPag: "Buscar en administracion.gob.es",
    esEsta: (titulo: string) => `Es esta: ${titulo}.`,
    sigueSiendo: (titulo: string) => `Sigue siendo: ${titulo}`,
  },
  va: {
    titular: "Quin tràmit necessites?",
    entradilla:
      "Conta-ho amb les teues paraules i et diem quin tràmit és, què necessites, el termini i on es fa.",
    cambiarIdioma: "Idioma de la interfície",
    etiqueta: "Conta'ns què et passa",
    pista:
      "En castellà o en valencià. No escrigues dades personals: ni DNI ni noms.",
    avisoIA:
      "Parles amb una intel·ligència artificial. Només identifica el tràmit: els passos, terminis i requisits no els escriu ella, ixen del catàleg amb la seua font oficial.",
    buscar: "Cercar",
    enviar: "Enviar",
    ejemplos: "O prova amb un exemple",
    pensando: "Pensant…",
    nueva: "Nova consulta",
    tuConsulta: "La teua consulta",
    ronda: (n: number) => `Aclariment ${n} de 2`,
    confianzaMedia: "Pot encaixar",
    tipoTramite: "Tràmit",
    tipoAyuda: "Ajuda",
    ninguna: "Cap d'estos",
    afinar: "Afina la teua consulta",
    afinarPista: "Afig detalls o corregix el que has dit.",
    ocultar: "Amagar",
    conversacion: "Conversa",
    volverA: "Tornar a",
    cierre:
      "No aconseguim saber quin és amb seguretat. Tria'n un d'estos o busca'l en el Punt d'Accés General.",
    fueraTitulo: "No ho trobem a Brújula",
    errorTitulo: "No hem pogut consultar-ho ara mateix",
    errorTexto:
      "La teua consulta continua ací: torna-ho a provar o busca-ho en el Punt d'Accés General.",
    reintentar: "Torna-ho a provar",
    buscarPag: "Cercar en administracion.gob.es",
    esEsta: (titulo: string) => `És este: ${titulo}.`,
    sigueSiendo: (titulo: string) => `Continua sent: ${titulo}`,
  },
} satisfies Record<Idioma, unknown>;

export type TextosFlujo = (typeof textosFlujo)["es"];

export const lang = (i: Idioma) => (i === "va" ? "ca" : "es");

export const PAG =
  "https://administracion.gob.es/tramites-electronicos/resultados-actuaciones";

export const EJEMPLOS = [
  "Me han echado del trabajo",
  "M'han acomiadat",
  "Quiero votar por correo",
  "Me he mudado a València",
  "Ayuda para los libros del cole",
];
