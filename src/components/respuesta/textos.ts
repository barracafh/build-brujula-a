// Textos fijos de la respuesta compuesta (tickets 03 y 10). El contenido de la
// entrada no pasa por aquí: se muestra literal y en castellano.

export type IdiomaRespuesta = "es" | "va";

export const textosRespuesta = {
  es: {
    tipoTramite: "Trámite",
    tipoAyuda: "Ayuda",
    pasos: "Pasos",
    plazo: "Plazo",
    requisitos: "Requisitos",
    documentacion: "Documentación",
    convieneSaber: "Conviene saber",
    dondeSeHace: "Dónde se hace",
    hacerTramite: "Hacer el trámite",
    masInfo: "Más información",
    sinEnlace:
      "Ahora mismo no hay un enlace para hacerlo en línea. Pregunta en los servicios sociales de tu ayuntamiento o llama al 012.",
    marcaSinVerificar: "Sin verificar",
    sinVerificar: "Información sin verificar: compruébala en la sede oficial.",
    contenidoCastellano: "Contenido oficial en castellano",
    escuchar: "Escuchar",
    pausar: "Pausar",
    escucharRespuesta: "Escuchar la respuesta",
    pausarRespuesta: "Pausar la respuesta",
    audioError: "No hemos podido reproducir el audio.",
  },
  va: {
    tipoTramite: "Tràmit",
    tipoAyuda: "Ajuda",
    pasos: "Passos",
    plazo: "Termini",
    requisitos: "Requisits",
    documentacion: "Documentació",
    convieneSaber: "Convé saber",
    dondeSeHace: "On es fa",
    hacerTramite: "Fer el tràmit",
    masInfo: "Més informació",
    sinEnlace:
      "Ara mateix no hi ha un enllaç per a fer-ho en línia. Pregunta en els serveis socials del teu ajuntament o telefona al 012.",
    marcaSinVerificar: "Sense verificar",
    sinVerificar: "Informació sense verificar: comprova-la en la seu oficial.",
    contenidoCastellano: "Contingut oficial en castellà",
    escuchar: "Escoltar",
    pausar: "Pausar",
    escucharRespuesta: "Escoltar la resposta",
    pausarRespuesta: "Pausar la resposta",
    audioError: "No hem pogut reproduir l'àudio.",
  },
} satisfies Record<IdiomaRespuesta, Record<string, string>>;

export type TextosRespuesta = (typeof textosRespuesta)["es"];
