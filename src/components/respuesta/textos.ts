// Textos fijos de la respuesta compuesta (tickets 03, 10 y 19). El contenido de la
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
    traduccionAutomatica: "Traducción automática sin revisar",
    avisoTraduccion:
      "Esta ficha se ha traducido automáticamente y nadie la ha revisado. El texto oficial, en castellano, es el de la fuente enlazada.",
    audioCastellano: "El audio lee el contenido en castellano.",
    escuchar: "Escuchar",
    pausar: "Pausar",
    escucharRespuesta: "Escuchar la respuesta",
    pausarRespuesta: "Pausar la respuesta",
    audioError: "No hemos podido reproducir el audio.",
    anadirCalendario: "Añadir a Google Calendar",
    pestanaNueva: "(se abre en una pestaña nueva)",
    contadoDesdeHoy: "Contado desde hoy",
    cuentaHabiles:
      "Contamos desde el día siguiente, sin sábados, domingos ni festivos nacionales o de la Comunitat Valenciana, según el",
    calendarioInhabiles: "calendario oficial de días inhábiles de 2026",
    sinFiestasLocales:
      "No contamos las fiestas locales: si hay alguna, puede que tengas un día más.",
    cuentaNaturales:
      "Contamos desde el día siguiente, todos los días seguidos (naturales).",
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
    traduccionAutomatica: "Traducció automàtica sense revisar",
    avisoTraduccion:
      "Esta fitxa s'ha traduït automàticament i ningú l'ha revisada. El text oficial, en castellà, és el de la font enllaçada.",
    audioCastellano: "L'àudio llig el contingut en castellà.",
    escuchar: "Escoltar",
    pausar: "Pausar",
    escucharRespuesta: "Escoltar la resposta",
    pausarRespuesta: "Pausar la resposta",
    audioError: "No hem pogut reproduir l'àudio.",
    anadirCalendario: "Afegir a Google Calendar",
    pestanaNueva: "(s'obri en una pestanya nova)",
    contadoDesdeHoy: "Comptat des de hui",
    cuentaHabiles:
      "Comptem des de l'endemà, sense dissabtes, diumenges ni festius nacionals o de la Comunitat Valenciana, segons el",
    calendarioInhabiles: "calendari oficial de dies inhàbils de 2026",
    sinFiestasLocales:
      "No comptem les festes locals: si n'hi ha alguna, pot ser que tingues un dia més.",
    cuentaNaturales:
      "Comptem des de l'endemà, tots els dies seguits (naturals).",
  },
} satisfies Record<IdiomaRespuesta, Record<string, string>>;

export type TextosRespuesta = (typeof textosRespuesta)["es"];
