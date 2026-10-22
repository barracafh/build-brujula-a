// [2] Estructuración y [3] validación automática (docs/index_specification.md).
// Pasa cada ficha capturada por glm5.3-flash, de una en una y con 3 s entre
// llamadas, y genera el resumen_sencillo de los 21 trámites de la organización.
// Lo hecho se guarda en disco: si se relanza, no repite llamadas.
//   bun scripts/indexado/estructurar.ts
import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { completar } from "../../src/lib/ia";
import { tramites, type Tramite } from "../../src/lib/catalogo";
import {
  DIR_FICHAS,
  PAUSA_IA_MS,
  RUTA_RESUMENES,
  archivosCapturados,
  cifrasInventadas,
  escribirJson,
  esperar,
  extraerJson,
  leerCaptura,
  leerJson,
  type Captura,
} from "./comun";

// Lo que redacta el LLM. El resto de campos de Tramite se fijan en código.
type Extraccion = Pick<
  Tramite,
  "titulo" | "organismo" | "requisitos_clave" | "pasos" | "documentacion" | "plazo" | "frases_usuario"
> & { resumen_sencillo: string };

export type FichaSinRevisar = Tramite & { resumen_sencillo: string | null; revisar: string[] };

const REGLA_RESUMEN =
  "resumen_sencillo: 2 o 3 frases en lenguaje llano que digan qué es el trámite, para quién es y para qué sirve. Sin cifras, importes, plazos ni fechas.";

const ejemplo = tramites.find((t) => t.id === "alta-padron-valencia")!;

const PROMPT_FICHA = `Eres un extractor de datos. Recibes el texto literal de una ficha de la sede electrónica del Ayuntamiento de València y devuelves SOLO un objeto JSON, sin texto alrededor, con estas claves:
- titulo: el trámite dicho como lo buscaría un vecino, en una línea (ejemplo: "${ejemplo.titulo}").
- organismo: el servicio municipal que lo gestiona, o null.
- requisitos_clave: lista de requisitos y de quién puede pedirlo.
- pasos: lista de pasos para hacerlo, en orden.
- documentacion: lista de documentos que hay que presentar.
- plazo: cuándo se pide y/o el plazo de resolución, en una frase, o null.
- frases_usuario: 5 frases cortas de cómo lo pediría un vecino: 3 en castellano y 2 en valenciano. Sin cifras.
- ${REGLA_RESUMEN}

Reglas:
1. Copia solo lo que dice el texto. No añadas requisitos, documentos, importes, plazos ni pasos que no aparezcan.
2. Si un dato no está en el texto, pon null o una lista vacía.
3. Cada elemento de lista es una frase corta en castellano llano y fiel al texto. Máximo 6 elementos por lista.
4. Copia cifras e importes exactamente como aparecen en el texto.
5. frases_usuario y resumen_sencillo son lo único que puedes redactar con tus palabras.`;

const PROMPT_RESUMEN = `Recibes la ficha de un trámite en JSON. Devuelve SOLO un objeto JSON con la clave resumen_sencillo.
${REGLA_RESUMEN}
Usa solo lo que dice la ficha.`;

// [3] Cifras que no están en la fuente: el campo se anula (o el elemento de la
// lista se quita) y la ficha queda marcada para revisar.
function validar(e: Extraccion, fuente: string, revisar: string[]) {
  const limpiar = (campo: string, valor: string | null) => {
    if (!valor) return null;
    const malas = cifrasInventadas(valor, fuente);
    if (malas.length === 0) return valor;
    revisar.push(`${campo}: cifras que no están en la ficha (${malas.join(", ")}): «${valor}»`);
    return null;
  };
  const lista = (campo: string, valores: string[] | null | undefined) =>
    (valores ?? []).flatMap((v, i) => limpiar(`${campo}[${i}]`, v) ?? []);
  return {
    titulo: limpiar("titulo", e.titulo),
    organismo: limpiar("organismo", e.organismo),
    requisitos_clave: lista("requisitos_clave", e.requisitos_clave),
    pasos: lista("pasos", e.pasos),
    documentacion: lista("documentacion", e.documentacion),
    plazo: limpiar("plazo", e.plazo),
    resumen_sencillo: limpiar("resumen_sencillo", e.resumen_sencillo),
  };
}

function aFicha(c: Captura, e: Extraccion): FichaSinRevisar {
  const revisar: string[] = [];
  const v = validar(e, `${c.titulo}\n${c.texto}`, revisar);
  return {
    id: c.codigo,
    tipo: "tramite",
    titulo: v.titulo ?? c.titulo,
    administracion: "Ajuntament de València",
    organismo: v.organismo ?? "Ajuntament de València",
    frases_usuario: (e.frases_usuario ?? []).slice(0, 5),
    requisitos_clave: v.requisitos_clave,
    pasos: v.pasos,
    documentacion: v.documentacion,
    plazo: v.plazo,
    enlace_info: c.url_final,
    enlace_tramite: c.url_final,
    fuente: c.url_final,
    verificado: false,
    nota: null,
    relacionados: [],
    resumen_sencillo: v.resumen_sencillo,
    revisar,
  };
}

let llamadas = 0;
async function llamar(sistema: string, usuario: string): Promise<string> {
  if (llamadas++ > 0) await esperar(PAUSA_IA_MS);
  return completar([
    { role: "system", content: sistema },
    { role: "user", content: usuario },
  ]);
}

async function estructurarFichas() {
  await mkdir(DIR_FICHAS, { recursive: true });
  for (const archivo of await archivosCapturados()) {
    const captura = await leerCaptura(archivo);
    const destino = `${DIR_FICHAS}/${captura.codigo}.json`;
    if (existsSync(destino)) continue;
    try {
      const respuesta = await llamar(PROMPT_FICHA, `${captura.titulo}\n\n${captura.texto}`);
      const ficha = aFicha(captura, extraerJson<Extraccion>(respuesta));
      await escribirJson(destino, ficha);
      console.log(`✓ ${captura.codigo}${ficha.revisar.length ? ` (revisar: ${ficha.revisar.length})` : ""}`);
    } catch (error) {
      console.error(`✗ ${captura.codigo}: ${(error as Error).message}`);
    }
  }
}

// Los resúmenes de la organización: el propio fichero hace de caché. Los de
// València salen de las fichas ya estructuradas.
async function resumir() {
  const resumenes = existsSync(RUTA_RESUMENES) ? await leerJson<Record<string, string>>(RUTA_RESUMENES) : {};
  for (const archivo of await readdir(DIR_FICHAS)) {
    const ficha = await leerJson<FichaSinRevisar>(`${DIR_FICHAS}/${archivo}`);
    if (ficha.resumen_sencillo) resumenes[ficha.id] ??= ficha.resumen_sencillo;
  }
  for (const t of tramites) {
    if (resumenes[t.id]) continue;
    const { titulo, organismo, requisitos_clave, pasos, documentacion } = t;
    const ficha = JSON.stringify({ titulo, organismo, requisitos_clave, pasos, documentacion });
    try {
      const { resumen_sencillo } = extraerJson<{ resumen_sencillo: string }>(await llamar(PROMPT_RESUMEN, ficha));
      const malas = cifrasInventadas(resumen_sencillo, ficha);
      if (malas.length) throw new Error(`cifras inventadas (${malas.join(", ")})`);
      resumenes[t.id] = resumen_sencillo.trim();
      await escribirJson(RUTA_RESUMENES, resumenes);
      console.log(`✓ ${t.id}`);
    } catch (error) {
      console.error(`✗ ${t.id}: ${(error as Error).message}`);
    }
  }
  await escribirJson(RUTA_RESUMENES, resumenes);
}

await estructurarFichas();
await resumir();
