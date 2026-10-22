import { catalogo } from "@/lib/fuente-catalogo";
import { minimizar } from "@/lib/minimizar";
import { motor } from "@/lib/motor";
import {
  MAX_CARACTERES,
  MAX_TURNOS,
  type Resultado,
  type Turno,
} from "@/lib/motor/contrato";
import type { RespuestaConsulta } from "@/lib/consulta";

// POST {"historial": Turno[]} → RespuestaConsulta (src/lib/consulta.ts).
// Es lo único que llama al motor: valida, minimiza, clasifica y completa los
// ids con el catálogo. No se guarda ni se registra el texto (regla 3).
const TIMEOUT_MS = 15_000;

function leerHistorial(cuerpo: unknown): Turno[] | null {
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo))
    return null;
  const historial = (cuerpo as { historial?: unknown }).historial;
  if (!Array.isArray(historial) || historial.length === 0) return null;
  const turnos: Turno[] = [];
  for (const t of historial) {
    const { rol, texto } = (t ?? {}) as Partial<Turno>;
    if (rol !== "ciudadano" && rol !== "asistente") return null;
    if (typeof texto !== "string" || !texto.trim()) return null;
    if (texto.length > MAX_CARACTERES) return null;
    turnos.push({ rol, texto: texto.trim() });
  }
  if (turnos.at(-1)?.rol !== "ciudadano") return null;
  return turnos.slice(-MAX_TURNOS);
}

async function completar(r: Resultado): Promise<RespuestaConsulta | null> {
  if (r.tipo === "sin_coincidencia")
    return { tipo: r.tipo, texto: r.texto, idioma: r.idioma };
  if (r.tipo === "respuesta") {
    const entrada = await catalogo.obtener(r.candidata.id);
    return entrada ? { tipo: r.tipo, entrada, idioma: r.idioma } : null;
  }
  const candidatas = [];
  for (const c of r.candidatas) {
    const e = await catalogo.obtener(c.id);
    if (e)
      candidatas.push({
        id: e.id,
        tipo: e.tipo,
        titulo: e.titulo,
        organismo: e.organismo,
        confianza: c.confianza,
      });
  }
  return candidatas.length > 0
    ? { tipo: r.tipo, texto: r.texto, candidatas, idioma: r.idioma }
    : null;
}

export async function POST(req: Request) {
  const historial = leerHistorial(await req.json().catch(() => null));
  if (!historial)
    return Response.json({ error: "Consulta no válida." }, { status: 400 });

  const senal = AbortSignal.any([req.signal, AbortSignal.timeout(TIMEOUT_MS)]);
  try {
    const resultado = await motor().clasificar(
      historial.map((t) => ({ ...t, texto: minimizar(t.texto) })),
      senal,
    );
    const respuesta = await completar(resultado);
    if (!respuesta) throw new Error("El motor devolvió ids fuera del catálogo");
    return Response.json(respuesta);
  } catch {
    return Response.json({ error: "La IA no responde." }, { status: 502 });
  }
}
