import type {
  Candidata,
  Idioma,
  Motor,
  Resultado,
  Turno,
} from "./contrato";
import { plantillas } from "./plantillas";

// Motor simulado: reglas fijas, sin red, para construir y probar la interfaz
// hasta que lleguen los adaptadores reales. Recorre todos los estados:
// - clara: «quiero votar por correo», «me han puesto una multa»
// - aclaración: «me han echado del trabajo», «m'han acomiadat», «me he mudado»
// - sin coincidencia: «quiero adoptar un perro»
// - error: cualquier consulta con «error de prueba»
// Afinar con la misma entrada («sí, pedir el paro») mantiene la respuesta.

const LATENCIA_MS = 600;

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
  [/dni|carne de identidad/, "renovacion-dni"],
  [/vida laboral/, "vida-laboral"],
  [/renta|hacienda/, "declaracion-renta"],
  [/medico|cita|metge/, "cita-medica-gva"],
  [/tarjeta sanitaria|sip/, "tarjeta-sanitaria-sip"],
  [/alquiler|lloguer/, "bono-alquiler-joven"],
  [/certificado digital|clave/, "identificacion-digital"],
];

const media = (id: string): Candidata => ({ id, confianza: "media" });

// Las aclaraciones las redactaría HelmCode: solo preguntan.
const AMBIGUAS: [RegExp, Record<Idioma, string>, Candidata[]][] = [
  [
    /echad|despid|paro|trabajo|acomiad|atur|treball/,
    {
      es: "¿Qué necesitas exactamente: pedir el paro, apuntarte como demandante de empleo o se te ha acabado ya el paro?",
      va: "Què necessites exactament: demanar l'atur, inscriure't com a demandant d'ocupació o ja se t'ha acabat l'atur?",
    },
    ["prestacion-desempleo", "inscripcion-demandante-labora", "subsidio-desempleo"].map(media),
  ],
  [
    /mudad|mudat|padron|domicilio/,
    {
      es: "¿Qué quieres hacer: empadronarte en València, pedir un certificado de empadronamiento o cambiar tu dirección en la DGT?",
      va: "Què vols fer: empadronar-te a València, demanar un certificat d'empadronament o canviar la teua adreça en la DGT?",
    },
    ["alta-padron-valencia", "certificado-empadronamiento", "cambio-domicilio-dgt"].map(media),
  ],
  [
    /fin de mes|dinero|no llego|diners|no arribe/,
    {
      es: "¿Buscas una ayuda para tener ingresos, un descuento en la factura de la luz o la renta valenciana?",
      va: "Busques una ajuda per a tindre ingressos, un descompte en la factura de la llum o la renda valenciana?",
    },
    ["ingreso-minimo-vital", "bono-social-electrico", "renta-valenciana-inclusion"].map(media),
  ],
  [
    /libro|llibre|cole|escola/,
    {
      es: "¿Te refieres al banco de libros o a la ayuda de comedor del colegio?",
      va: "Et refereixes al banc de llibres o a l'ajuda de menjador del col·legi?",
    },
    ["xarxa-llibres", "ayudas-comedor-escolar"].map(media),
  ],
];

const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const detectarIdioma = (s: string): Idioma =>
  /\b(m'han|vull|meu|meua|treball|acomiadat|atur|arribe|llibres|cotxe|tinc|necessite)\b/i.test(
    s,
  )
    ? "va"
    : "es";

function esperar(ms: number, senal?: AbortSignal) {
  return new Promise<void>((resolver, rechazar) => {
    const t = setTimeout(resolver, ms);
    senal?.addEventListener("abort", () => {
      clearTimeout(t);
      rechazar(senal.reason);
    });
  });
}

function clasificarTexto(texto: string, idioma: Idioma): Resultado | null {
  const t = normalizar(texto);
  const comun = { idioma, proveedor: "simulado" as const };
  for (const [re, id] of CLARAS)
    if (re.test(t))
      return { tipo: "respuesta", candidata: { id, confianza: "alta" }, ...comun };
  for (const [re, textos, candidatas] of AMBIGUAS)
    if (re.test(t))
      return { tipo: "aclaracion", candidatas, texto: textos[idioma], ...comun };
  return null;
}

export const motorSimulado: Motor = {
  async clasificar(historial: Turno[], senal?: AbortSignal) {
    await esperar(LATENCIA_MS, senal);
    const delCiudadano = historial
      .filter((t) => t.rol === "ciudadano")
      .map((t) => t.texto);
    const ultima = delCiudadano.at(-1) ?? "";
    if (/error de prueba/i.test(ultima)) throw new Error("Error simulado");
    const idioma = detectarIdioma(delCiudadano.join(" "));
    // Primero el último mensaje; si no basta, toda la conversación.
    return (
      clasificarTexto(ultima, idioma) ??
      clasificarTexto(delCiudadano.join(" "), idioma) ?? {
        tipo: "sin_coincidencia",
        texto: plantillas[idioma].sinCoincidencia,
        idioma,
        proveedor: "simulado",
      }
    );
  },
};
