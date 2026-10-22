import { parsearJev } from "../src/lib/jev";
import {
  decidirJev,
  detectarIdioma,
  parsearLLM,
  porPalabras,
} from "../src/lib/clasificar";
import { getTramite } from "../src/lib/catalogo";
import { componer, pasaGuardarrail } from "../src/lib/motor/componer";
import { leerHelmcode } from "../src/lib/motor/helmcode";
import { candidatasJev } from "../src/lib/motor/jev";
import { plantillas } from "../src/lib/motor/plantillas";

let fallos = 0;
function comprobar(nombre: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${nombre}`);
  if (!ok) fallos++;
}
function lanza(f: () => unknown) {
  try {
    f();
    return false;
  } catch {
    return true;
  }
}

const jevBase = (probs: Record<string, number>, confidence: number, noul: number) => ({
  answers: {
    tramite: { type: "choice", choice: "x", confidence, probabilities: probs },
    encaja: { type: "noul", noul },
    idioma: { type: "choice", choice: "es", confidence: 1, probabilities: {} },
  },
});

// Jev: validación
comprobar("Jev sin probabilidades lanza", lanza(() => parsearJev(jevBase({}, 1, 0.9))));
comprobar("Jev con un solo candidato lanza", lanza(() => parsearJev(jevBase({ "voto-por-correo": 1 }, 1, 0.9))));
comprobar("Jev con confianza fuera de rango lanza", lanza(() => parsearJev(jevBase({ "voto-por-correo": 0.9, "multa-dgt": 0.1 }, 7, 0.9))));
comprobar("Jev null lanza", lanza(() => parsearJev(null)));
comprobar("Jev ignora ids inventados", lanza(() => parsearJev(jevBase({ inventado: 0.9, "multa-dgt": 0.1 }, 0.9, 0.9))));

// Jev: umbrales
const alta = parsearJev(jevBase({ "voto-por-correo": 0.95, "multa-dgt": 0.05 }, 0.95, 0.9));
const r1 = decidirJev(alta);
comprobar("Confianza alta → respuesta", r1?.caso === "respuesta" && r1.id === "voto-por-correo");
const fuera = parsearJev(jevBase({ "renovacion-dni": 0.8, "multa-dgt": 0.2 }, 0.81, 0.16));
comprobar("Encaja bajo → fuera (pasaporte)", decidirJev(fuera)?.caso === "fuera");
const media = parsearJev(jevBase({ "complemento-ayuda-infancia": 0.67, "ingreso-minimo-vital": 0.32, "multa-dgt": 0.01 }, 0.65, 0.8));
const r3 = decidirJev(media);
comprobar("Confianza media → desambiguar con 2", r3?.caso === "desambiguar" && r3.opciones.length === 2);
const baja = parsearJev(jevBase({ "multa-dgt": 0.2, "vida-laboral": 0.15 }, 0.2, 0.7));
comprobar("Confianza baja → null (pasa al LLM)", decidirJev(baja) === null);

// LLM: parseo
const l1 = parsearLLM('```json\n{"id":"multa-dgt","alternativas":[],"idioma":"es"}\n```');
comprobar("LLM con bloque de código → respuesta", l1.caso === "respuesta" && l1.id === "multa-dgt");
comprobar("LLM id inventado → fuera", parsearLLM('{"id":"pasaporte","alternativas":[]}').caso === "fuera");
const l3 = parsearLLM('{"id":null,"alternativas":["vida-laboral"]}');
comprobar("LLM una alternativa → desambiguar, no respuesta", l3.caso === "desambiguar");
comprobar("LLM sin JSON lanza", lanza(() => parsearLLM("no sé")));
comprobar("LLM idioma va", parsearLLM('{"id":null,"alternativas":[],"idioma":"va"}').idioma === "va");

// Palabras
comprobar("«quiero montar una empresa» → fuera", porPalabras("quiero montar una empresa").caso === "fuera");
comprobar("«hola» → fuera", porPalabras("hola").caso === "fuera");
const p1 = porPalabras("quiero cobrar el paro");
comprobar("«quiero cobrar el paro» → prestación", p1.caso !== "fuera");

// Idioma
for (const [f, i] of [
  ["els llibres de text del institut", "va"],
  ["m'he mudat a un pis nou a Benimaclet", "va"],
  ["m'han acomiadat", "va"],
  ["vull demanar cita amb el metge", "va"],
  ["el menjador del col·legi del meu fill és molt car", "va"],
  ["me han echado del trabajo", "es"],
  ["no llego a fin de mes y tengo dos críos", "es"],
  ["quiero votar por correo", "es"],
  ["la casa de mi madre", "es"],
] as const)
  comprobar(`idioma «${f}» → ${i}`, detectarIdioma(f) === i);

// Motor: regla de Jev (ticket 04)
const ids = (cs: { id: string; confianza: string }[]) =>
  cs.map((c) => `${c.id}:${c.confianza}`).join(",");
comprobar("Motor Jev: confianza alta → una alta", ids(candidatasJev(alta)) === "voto-por-correo:alta");
comprobar("Motor Jev: encaja bajo → ninguna", candidatasJev(fuera).length === 0);
comprobar("Motor Jev: confianza media → 2 medias", ids(candidatasJev(media)) === "complemento-ayuda-infancia:media,ingreso-minimo-vital:media");
comprobar("Motor Jev: confianza baja → ninguna", candidatasJev(baja).length === 0);

// Motor: HelmCode
const h1 = leerHelmcode('```json\n{"id":"multa-dgt","alternativas":[],"idioma":"es"}\n```');
comprobar("Motor HelmCode: id seguro → una alta", ids(h1.candidatas) === "multa-dgt:alta");
const h2 = leerHelmcode('{"id":null,"alternativas":["vida-laboral","inventado","vida-laboral","multa-dgt"],"idioma":"va"}');
comprobar("Motor HelmCode: duda → medias sin inventadas ni repetidas", ids(h2.candidatas) === "vida-laboral:media,multa-dgt:media" && h2.idioma === "va");
comprobar("Motor HelmCode: id inventado → ninguna", leerHelmcode('{"id":"pasaporte","alternativas":[]}').candidatas.length === 0);
comprobar("Motor HelmCode: sin JSON lanza", lanza(() => leerHelmcode("no sé")));

// Motor: resultado
const c0 = await componer([], "va", "jev", "x");
comprobar("Motor: ninguna → sin coincidencia de plantilla", c0.tipo === "sin_coincidencia" && c0.texto === plantillas.va.sinCoincidencia);
const c1 = await componer([{ id: "multa-dgt", confianza: "alta" }], "es", "helmcode", "x");
comprobar("Motor: una alta → respuesta", c1.tipo === "respuesta" && c1.candidata.id === "multa-dgt");

// Motor: guardarraíl de la aclaración
comprobar("Guardarraíl: pregunta limpia pasa", pasaGuardarrail("¿Quieres pedir el paro o apuntarte en Labora?", []));
comprobar("Guardarraíl: dígitos no pasan", !pasaGuardarrail("¿Han pasado 15 días?", []));
comprobar("Guardarraíl: moneda no pasa", !pasaGuardarrail("¿Cobras menos de mil €?", []));
comprobar("Guardarraíl: enlace no pasa", !pasaGuardarrail("¿Has mirado HTTPS://sede.gva.es?", []));
comprobar("Guardarraíl: más de 280 caracteres no pasa", !pasaGuardarrail(`¿${"a".repeat(280)}?`, []));
const voto = getTramite("voto-por-correo")!.titulo;
comprobar("Guardarraíl: los dígitos del título citado no cuentan", pasaGuardarrail(`¿Te refieres a «${voto}»?`, [voto]));

console.log(fallos ? `\n${fallos} fallos` : "\nTodo bien");
if (fallos) process.exitCode = 1;
