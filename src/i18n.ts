import type { Idioma } from "@/lib/tipos";

// Textos fijos de la interfaz. El contenido de los trámites sale del catálogo
// tal cual, en castellano: no se traduce con IA para no inventar nada.
export type { Idioma };

export const textos = {
  es: {
    titular: "¿Qué trámite necesitas?",
    entradilla:
      "Cuéntalo con tus palabras y te decimos qué trámite es, qué necesitas, el plazo y dónde se hace.",
    cambiarIdioma: "Idioma de la interfaz",
    etiqueta: "Cuéntanos qué te pasa",
    pista: "No escribas datos personales: ni DNI ni nombres.",
    buscar: "Buscar",
    buscando: "Buscando…",
    ejemplos: "O prueba con un ejemplo",
    vacio: "Escribe qué necesitas.",
    error: "No hemos podido buscarlo. Inténtalo otra vez.",
    teRefieres: "¿Te refieres a…?",
    teRefieresTexto: "Elige la opción que encaja con tu caso.",
    fueraTitulo: "No lo encontramos en Brújula",
    fueraTexto:
      "Brújula solo conoce 21 trámites y ayudas, y no podemos identificar el tuyo con seguridad. Búscalo en el Punto de Acceso General de la Administración.",
    fueraEnlace: "Buscar en administracion.gob.es",
    pasos: "Pasos",
    requisitos: "Requisitos",
    documentacion: "Documentación",
    plazo: "Plazo",
    sinPlazo:
      "No podemos confirmar el plazo con este catálogo. Consúltalo en la fuente oficial.",
    dondeSeHace: "Dónde se hace",
    hacerTramite: "Ir al trámite",
    masInfo: "Más información",
    sinEnlace:
      "Ahora mismo no hay un enlace para hacerlo en línea. Pregunta en los servicios sociales de tu ayuntamiento o llama al 012.",
    sinVerificar:
      "Información sin verificar: compruébala en la sede oficial antes de hacer nada.",
    marcaSinVerificar: "Sin verificar",
    notas: "Notas sobre la fuente",
    despues: "Y después, ¿qué?",
    despuesTexto: "Trámites que suelen venir a continuación.",
    tipoTramite: "Trámite",
    tipoAyuda: "Ayuda",
    verFicha: "Ver qué hay que hacer",
    fuente: "Fuente",
    contenidoCastellano: "La información oficial está en castellano.",
    aviso: "Comprueba siempre los datos en la sede oficial antes de actuar.",
    motor: "Clasificado con",
  },
  va: {
    titular: "Quin tràmit necessites?",
    entradilla:
      "Conta-ho amb les teues paraules i et diem quin tràmit és, què necessites, el termini i on es fa.",
    cambiarIdioma: "Idioma de la interfície",
    etiqueta: "Conta'ns què et passa",
    pista: "No escrigues dades personals: ni DNI ni noms.",
    buscar: "Cercar",
    buscando: "Cercant…",
    ejemplos: "O prova amb un exemple",
    vacio: "Escriu què necessites.",
    error: "No hem pogut cercar-ho. Torna-ho a provar.",
    teRefieres: "Et refereixes a…?",
    teRefieresTexto: "Tria l'opció que encaixa amb el teu cas.",
    fueraTitulo: "No ho trobem a Brújula",
    fueraTexto:
      "Brújula només coneix 21 tràmits i ajudes, i no podem identificar el teu amb seguretat. Busca'l en el Punt d'Accés General de l'Administració.",
    fueraEnlace: "Cercar en administracion.gob.es",
    pasos: "Passos",
    requisitos: "Requisits",
    documentacion: "Documentació",
    plazo: "Termini",
    sinPlazo:
      "No podem confirmar el termini amb este catàleg. Consulta'l en la font oficial.",
    dondeSeHace: "On es fa",
    hacerTramite: "Anar al tràmit",
    masInfo: "Més informació",
    sinEnlace:
      "Ara mateix no hi ha un enllaç per a fer-ho en línia. Pregunta en els serveis socials del teu ajuntament o telefona al 012.",
    sinVerificar:
      "Informació sense verificar: comprova-la en la seu oficial abans de fer res.",
    marcaSinVerificar: "Sense verificar",
    notas: "Notes sobre la font",
    despues: "I després, què?",
    despuesTexto: "Tràmits que solen vindre a continuació.",
    tipoTramite: "Tràmit",
    tipoAyuda: "Ajuda",
    verFicha: "Veure què cal fer",
    fuente: "Font",
    contenidoCastellano: "La informació oficial està en castellà.",
    aviso: "Comprova sempre les dades en la seu oficial abans d'actuar.",
    motor: "Classificat amb",
  },
} satisfies Record<Idioma, Record<string, string>>;

export type Textos = (typeof textos)["es"];
