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
    voz: {
      dictar: "Dictar",
      parar: "Parar",
      permiso: "Permite el micrófono en el navegador.",
      grabando: "Grabando",
      transcribiendo: "Pasando tu voz a texto…",
      listo: "Listo. Revisa el texto y envíalo.",
      tope: "Hemos parado al minuto. Revisa el texto o añade lo que falte escribiendo.",
      denegado:
        "No tenemos permiso para el micrófono. Puedes escribir tu consulta.",
      error:
        "No hemos podido pasar tu voz a texto. Puedes escribir tu consulta.",
      sinSoporte:
        "Este navegador no permite dictar. Puedes escribir tu consulta.",
    },
    aviso: {
      titulo: "Antes de empezar",
      intro:
        "Brújula usa servicios de inteligencia artificial de otras empresas para saber qué trámite buscas.",
      puntos: [
        "Lo que escribes va a Jev (TypeSafe, en EE. UU.) y a HelmCode (en la UE). TypeSafe puede conservarlo.",
        "Si dictas, tu voz va a ElevenLabs (en EE. UU.), que guarda el audio y el texto, sin un plazo publicado.",
        "Brújula no guarda nada de lo que escribes ni dices.",
      ],
      datos:
        "No escribas ni digas datos personales: ni DNI, ni nombres, ni direcciones, ni teléfonos.",
      aceptar: "Aceptar y seguir",
      masInfo: "Más información",
      envio:
        "Qué se envía. El texto que escribes, después de que Brújula quite los DNI, NIE, correos y teléfonos. Si dictas, el audio tal cual: la voz no se puede limpiar antes de enviarla.",
      finalidad:
        "Para qué. Solo para saber qué trámite buscas. Los pasos, plazos y requisitos no los escribe la IA: salen del catálogo con su fuente oficial.",
      jev: "Jev (TypeSafe), en EE. UU. Puede conservar el texto el tiempo que considere necesario, sin un plazo publicado. Declara que no entrena sus modelos con él.",
      helmcode: "HelmCode, en la UE. Declara que no guarda el texto ni entrena con él.",
      elevenlabs:
        "ElevenLabs, en EE. UU. Guarda el audio y la transcripción, sin un plazo publicado.",
      politica: (empresa: string) => `Política de privacidad de ${empresa}`,
      contrato:
        "Brújula es una herramienta experimental y no tiene un contrato de encargado del tratamiento con estas empresas.",
      navegador:
        "En tu navegador solo guardamos que has aceptado este aviso. Puedes retirarlo cuando quieras desde «Privacidad», al pie de la página.",
      volver: "Volver",
      retirar: "Retirar la aceptación",
      retirada:
        "Has retirado la aceptación. Brújula no enviará nada hasta que vuelvas a aceptar.",
    },
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
    voz: {
      dictar: "Dictar",
      parar: "Parar",
      permiso: "Permet el micròfon en el navegador.",
      grabando: "Gravant",
      transcribiendo: "Passant la teua veu a text…",
      listo: "Fet. Revisa el text i envia'l.",
      tope: "Hem parat al minut. Revisa el text o afig el que falte escrivint.",
      denegado:
        "No tenim permís per al micròfon. Pots escriure la teua consulta.",
      error:
        "No hem pogut passar la teua veu a text. Pots escriure la teua consulta.",
      sinSoporte:
        "Este navegador no permet dictar. Pots escriure la teua consulta.",
    },
    aviso: {
      titulo: "Abans de començar",
      intro:
        "Brújula usa servicis d'intel·ligència artificial d'altres empreses per a saber quin tràmit busques.",
      puntos: [
        "El que escrius va a Jev (TypeSafe, als EUA) i a HelmCode (a la UE). TypeSafe pot conservar-ho.",
        "Si dictes, la teua veu va a ElevenLabs (als EUA), que guarda l'àudio i el text, sense un termini publicat.",
        "Brújula no guarda res del que escrius ni dius.",
      ],
      datos:
        "No escrigues ni digues dades personals: ni DNI, ni noms, ni adreces, ni telèfons.",
      aceptar: "Acceptar i continuar",
      masInfo: "Més informació",
      envio:
        "Què s'envia. El text que escrius, després que Brújula en lleve els DNI, NIE, correus i telèfons. Si dictes, l'àudio tal qual: la veu no es pot netejar abans d'enviar-la.",
      finalidad:
        "Per a què. Només per a saber quin tràmit busques. Els passos, terminis i requisits no els escriu la IA: ixen del catàleg amb la seua font oficial.",
      jev: "Jev (TypeSafe), als EUA. Pot conservar el text el temps que considere necessari, sense un termini publicat. Declara que no entrena els seus models amb ell.",
      helmcode: "HelmCode, a la UE. Declara que no guarda el text ni entrena amb ell.",
      elevenlabs:
        "ElevenLabs, als EUA. Guarda l'àudio i la transcripció, sense un termini publicat.",
      politica: (empresa: string) => `Política de privacitat de ${empresa}`,
      contrato:
        "Brújula és una eina experimental i no té un contracte d'encarregat del tractament amb estes empreses.",
      navegador:
        "Al teu navegador només guardem que has acceptat este avís. Pots retirar-ho quan vulgues des de «Privacitat», al peu de la pàgina.",
      volver: "Tornar",
      retirar: "Retirar l'acceptació",
      retirada:
        "Has retirat l'acceptació. Brújula no enviarà res fins que tornes a acceptar.",
    },
  },
} satisfies Record<Idioma, unknown>;

export type TextosFlujo = (typeof textosFlujo)["es"];

export const lang = (i: Idioma) => (i === "va" ? "ca" : "es");

export const PAG =
  "https://administracion.gob.es/tramites-electronicos/resultados-actuaciones";

// Políticas que enlaza «Más información» del aviso (ticket 15), comprobadas
// el 22/10/2026.
export const POLITICAS = {
  TypeSafe: "https://typesafe.ai/legal/privacy-policy",
  HelmCode: "https://helmcode.com/privacy",
  ElevenLabs: "https://elevenlabs.io/privacy-policy",
};

export const EJEMPLOS = [
  "Me han echado del trabajo",
  "M'han acomiadat",
  "Quiero votar por correo",
  "Me he mudado a València",
  "Ayuda para los libros del cole",
];
