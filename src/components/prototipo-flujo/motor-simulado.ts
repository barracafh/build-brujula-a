"use client";

// PROTOTIPO (ticket 02 del mapa Brújula). Desechable: vive en la rama
// prototype/flujo-consulta y no se mergea. Motor falso con reglas fijas para
// recorrer todos los estados del flujo sin llamar a la IA.

import { useRef, useState } from "react";
import { getTramite } from "@/lib/catalogo";
import type { Idioma } from "@/lib/tipos";

export type Confianza = "alta" | "media";
export type Candidata = { id: string; confianza: Confianza };

export type Mensaje =
  | { de: "ciudadano"; texto: string }
  | {
      de: "brujula";
      tipo: "aclaracion";
      texto: string;
      candidatas: Candidata[];
      ronda: number;
    }
  | { de: "brujula"; tipo: "confirmacion"; texto: string; id: string }
  | { de: "brujula"; tipo: "sin-coincidencia"; texto: string }
  | { de: "brujula"; tipo: "cierre"; texto: string; candidatas: Candidata[] }
  | { de: "brujula"; tipo: "error"; texto: string };

export type Fase =
  | "inicio"
  | "pensando"
  | "aclaracion"
  | "respuesta"
  | "sin-coincidencia"
  | "cierre"
  | "error";

export type Estado = {
  fase: Fase;
  previa: Fase; // la que se ve mientras piensa
  mensajes: Mensaje[];
  entradaId: string | null; // respuesta compuesta visible
  sustituidas: string[]; // respuestas que la conversación ha reemplazado
  candidatas: Candidata[]; // las de la última aclaración o cierre
  ronda: number; // aclaraciones seguidas sin cerrar
  idioma: Idioma;
  borrador: string; // la consulta se conserva si la IA falla
};

const INICIAL: Estado = {
  fase: "inicio",
  previa: "inicio",
  mensajes: [],
  entradaId: null,
  sustituidas: [],
  candidatas: [],
  ronda: 0,
  idioma: "es",
  borrador: "",
};

export const PAG = {
  nombre: "administracion.gob.es",
  url: "https://administracion.gob.es/tramites-electronicos/resultados-actuaciones",
};

export const EJEMPLOS = [
  { texto: "Me han echado del trabajo", da: "aclaración" },
  { texto: "M'han acomiadat", da: "aclaración, va" },
  { texto: "Quiero votar por correo el 29-N", da: "clara" },
  { texto: "Me he mudado a València", da: "aclaración" },
  { texto: "Ayuda para los libros del cole", da: "una media" },
  { texto: "Quiero adoptar un perro", da: "sin coincidencia" },
];

// Las redactaría un LLM: solo aclaran, nunca dicen pasos, plazos ni requisitos.
const T = {
  es: {
    paro: "¿Qué necesitas exactamente: pedir el paro, apuntarte como demandante de empleo o se te ha acabado ya el paro?",
    padron:
      "¿Qué quieres hacer: empadronarte en València, pedir un certificado de empadronamiento o cambiar tu dirección en la DGT?",
    dinero:
      "¿Buscas una ayuda para tener ingresos, un descuento en la factura de la luz o la renta valenciana?",
    libros: "¿Te refieres al banco de libros del colegio?",
    otraVez: "Todavía no sé cuál es. ¿Cuál de estas se parece más a tu caso?",
    cierre:
      "No consigo saber cuál es con seguridad. Elige una de estas o búscalo en el Punto de Acceso General.",
    confirmacion: (titulo: string) => `Es esta: ${titulo}.`,
    mantengo: (titulo: string) =>
      `No encuentro otra que encaje mejor. Sigue siendo: ${titulo}.`,
    sinCoincidencia:
      "No encuentro tu caso entre los 21 trámites y ayudas que conozco. Búscalo en el Punto de Acceso General o cuéntamelo de otra forma.",
    error:
      "No he podido consultarlo ahora mismo. Tu consulta sigue aquí: vuelve a intentarlo o búscalo en el Punto de Acceso General.",
  },
  va: {
    paro: "Què necessites exactament: demanar l'atur, inscriure't com a demandant d'ocupació o ja se t'ha acabat l'atur?",
    padron:
      "Què vols fer: empadronar-te a València, demanar un certificat d'empadronament o canviar la teua adreça en la DGT?",
    dinero:
      "Busques una ajuda per a tindre ingressos, un descompte en la factura de la llum o la renda valenciana?",
    libros: "Et refereixes al banc de llibres del col·legi?",
    otraVez: "Encara no sé quin és. Quin d'estos s'assembla més al teu cas?",
    cierre:
      "No aconseguisc saber quin és amb seguretat. Tria'n un d'estos o busca'l en el Punt d'Accés General.",
    confirmacion: (titulo: string) => `És este: ${titulo}.`,
    mantengo: (titulo: string) =>
      `No trobe cap altre que encaixe millor. Continua sent: ${titulo}.`,
    sinCoincidencia:
      "No trobe el teu cas entre els 21 tràmits i ajudes que conec. Busca'l en el Punt d'Accés General o conta-m'ho d'una altra manera.",
    error:
      "No he pogut consultar-ho ara mateix. La teua consulta continua ací: torna-ho a provar o busca-ho en el Punt d'Accés General.",
  },
};

const CLARAS: [RegExp, string][] = [
  [/multa/, "multa-dgt"],
  [/apunt|demandante|labora|inscri/, "inscripcion-demandante-labora"],
  [/subsidio|se me ha acabado|se me acabo|agotad|acabat/, "subsidio-desempleo"],
  [/pedir el paro|cobrar el paro|prestacion|cotizad|demanar l.atur/, "prestacion-desempleo"],
  [/certificado|volante|certificat/, "certificado-empadronamiento"],
  [/dgt|carnet|coche|cotxe/, "cambio-domicilio-dgt"],
  [/empadronar|alta en el padron|darme de alta/, "alta-padron-valencia"],
  [/vot/, "voto-por-correo"],
  [/luz|electric|llum/, "bono-social-electrico"],
  [/ingreso minimo|imv/, "ingreso-minimo-vital"],
  [/renta valenciana|rvi|renda valenciana/, "renta-valenciana-inclusion"],
  [/comedor|menjador/, "ayudas-comedor-escolar"],
];

type Clave = "paro" | "padron" | "dinero" | "libros";

const AMBIGUAS: [RegExp, Clave, Candidata[]][] = [
  [
    /echad|despid|paro|trabajo|acomiad|atur|treball/,
    "paro",
    [
      { id: "prestacion-desempleo", confianza: "alta" },
      { id: "inscripcion-demandante-labora", confianza: "media" },
      { id: "subsidio-desempleo", confianza: "media" },
    ],
  ],
  [
    /mudad|mudat|padron|domicilio/,
    "padron",
    [
      { id: "alta-padron-valencia", confianza: "alta" },
      { id: "certificado-empadronamiento", confianza: "media" },
      { id: "cambio-domicilio-dgt", confianza: "media" },
    ],
  ],
  [
    /fin de mes|dinero|no llego|diners|no arribe/,
    "dinero",
    [
      { id: "ingreso-minimo-vital", confianza: "media" },
      { id: "bono-social-electrico", confianza: "media" },
      { id: "renta-valenciana-inclusion", confianza: "media" },
    ],
  ],
  [/libro|llibre/, "libros", [{ id: "xarxa-llibres", confianza: "media" }]],
];

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const detectarIdioma = (s: string): Idioma =>
  /\b(m'han|vull|meu|meua|que et|treball|acomiadat|atur|no arribe|llibres|cotxe)\b/i.test(
    s,
  )
    ? "va"
    : "es";

type Clasificacion =
  | { tipo: "clara"; id: string }
  | { tipo: "ambigua"; clave: Clave; candidatas: Candidata[] }
  | { tipo: "ninguna" };

function clasificar(texto: string): Clasificacion {
  const t = normalizar(texto);
  for (const [re, id] of CLARAS) if (re.test(t)) return { tipo: "clara", id };
  for (const [re, clave, candidatas] of AMBIGUAS)
    if (re.test(t)) return { tipo: "ambigua", clave, candidatas };
  return { tipo: "ninguna" };
}

const titulo = (id: string) => getTramite(id)?.titulo ?? id;

function mostrarEntrada(e: Estado, id: string, texto: string): Estado {
  const cambia = e.entradaId && e.entradaId !== id;
  return {
    ...e,
    fase: "respuesta",
    entradaId: id,
    sustituidas: cambia ? [...e.sustituidas, e.entradaId!] : e.sustituidas,
    candidatas: [],
    ronda: 0,
    mensajes: [
      ...e.mensajes,
      { de: "brujula", tipo: "confirmacion", texto, id },
    ],
  };
}

function aplicar(e: Estado, texto: string): Estado {
  const tx = T[e.idioma];
  const c = clasificar(texto);

  if (c.tipo === "clara")
    return mostrarEntrada(e, c.id, tx.confirmacion(titulo(c.id)));

  const enAclaracion = e.fase === "aclaracion";
  const ronda = enAclaracion ? e.ronda + 1 : 1;
  const candidatas =
    c.tipo === "ambigua" ? c.candidatas : enAclaracion ? e.candidatas : [];

  // Afinando una respuesta sin coincidencia nueva: se mantiene la que había.
  if (c.tipo === "ninguna" && e.entradaId && !enAclaracion) {
    const id = e.entradaId;
    return {
      ...e,
      fase: "respuesta",
      mensajes: [
        ...e.mensajes,
        { de: "brujula", tipo: "confirmacion", texto: tx.mantengo(titulo(id)), id },
      ],
    };
  }

  if (candidatas.length === 0)
    return {
      ...e,
      fase: "sin-coincidencia",
      candidatas: [],
      ronda: 0,
      mensajes: [
        ...e.mensajes,
        { de: "brujula", tipo: "sin-coincidencia", texto: tx.sinCoincidencia },
      ],
    };

  if (ronda > 2)
    return {
      ...e,
      fase: "cierre",
      candidatas,
      ronda: 0,
      mensajes: [
        ...e.mensajes,
        { de: "brujula", tipo: "cierre", texto: tx.cierre, candidatas },
      ],
    };

  const pregunta =
    c.tipo === "ambigua" && !enAclaracion ? tx[c.clave] : tx.otraVez;
  return {
    ...e,
    fase: "aclaracion",
    candidatas,
    ronda,
    mensajes: [
      ...e.mensajes,
      {
        de: "brujula",
        tipo: "aclaracion",
        texto: pregunta,
        candidatas,
        ronda,
      },
    ],
  };
}

export function useConversacion() {
  const [estado, setEstado] = useState<Estado>(INICIAL);
  const [fallarSiguiente, setFallarSiguiente] = useState(false);
  const anterior = useRef<Fase>("inicio"); // a dónde volver tras un error

  function resolver(texto: string, fallar: boolean) {
    setTimeout(() => {
      setEstado((e) => {
        if (fallar)
          return {
            ...e,
            fase: "error",
            borrador: texto,
            mensajes: [
              ...e.mensajes,
              { de: "brujula", tipo: "error", texto: T[e.idioma].error },
            ],
          };
        return aplicar({ ...e, fase: anterior.current, borrador: "" }, texto);
      });
    }, 700);
  }

  function enviar(texto: string) {
    const limpio = texto.trim();
    if (!limpio || estado.fase === "pensando") return;
    const fallar = fallarSiguiente;
    setFallarSiguiente(false);
    anterior.current = estado.fase === "error" ? anterior.current : estado.fase;
    setEstado((e) => ({
      ...e,
      fase: "pensando",
      previa: e.fase,
      idioma: e.mensajes.length === 0 ? detectarIdioma(limpio) : e.idioma,
      mensajes: [...e.mensajes, { de: "ciudadano", texto: limpio }],
    }));
    resolver(limpio, fallar);
  }

  // Reintenta la última consulta sin duplicarla en el historial.
  function reintentar() {
    const texto = estado.borrador;
    if (!texto) return;
    setEstado((e) => ({
      ...e,
      fase: "pensando",
      previa: "error",
      mensajes: e.mensajes.filter(
        (m, i) => !(i === e.mensajes.length - 1 && m.de === "brujula"),
      ),
    }));
    resolver(texto, false);
  }

  function elegir(id: string) {
    setEstado((e) =>
      mostrarEntrada(
        {
          ...e,
          mensajes: [...e.mensajes, { de: "ciudadano", texto: titulo(id) }],
        },
        id,
        T[e.idioma].confirmacion(titulo(id)),
      ),
    );
  }

  return {
    estado,
    enviar,
    reintentar,
    elegir,
    reiniciar: () => setEstado(INICIAL),
    cambiarIdioma: (idioma: Idioma) => setEstado((e) => ({ ...e, idioma })),
    fallarSiguiente,
    setFallarSiguiente,
  };
}

export type Conversacion = ReturnType<typeof useConversacion>;
