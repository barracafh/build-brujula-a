import type { Idioma } from "@/lib/motor/contrato";

// PROTOTIPO (ticket 13): voz a texto con ElevenLabs Scribe por lotes.
// GET → { disponible }; POST multipart { audio } → { texto, idioma, ... }.
// El audio no se guarda ni se registra; la transcripción tampoco (regla 3).
// Sin ELEVENLABS_API_KEY la voz no aparece y Brújula funciona como siempre.
export const dynamic = "force-dynamic";

const MAX_BYTES = 2_000_000; // ~90 s de Opus; el botón para a los 60 s
const TIMEOUT_MS = 20_000;

// Scribe devuelve ISO 639-3 ("spa", "cat") o 639-1 según la doc: aceptamos los dos.
function aIdioma(codigo?: string): Idioma | null {
  if (codigo === "spa" || codigo === "es") return "es";
  if (codigo === "cat" || codigo === "ca") return "va";
  return null;
}

export function GET() {
  return Response.json({ disponible: Boolean(process.env.ELEVENLABS_API_KEY) });
}

export async function POST(req: Request) {
  const clave = process.env.ELEVENLABS_API_KEY;
  if (!clave)
    return Response.json({ error: "Voz no disponible." }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0)
    return Response.json({ error: "Falta el audio." }, { status: 400 });
  if (audio.size > MAX_BYTES)
    return Response.json({ error: "Audio demasiado largo." }, { status: 413 });

  const envio = new FormData();
  envio.set("model_id", "scribe_v2");
  envio.set("file", audio, audio.type.includes("mp4") ? "consulta.m4a" : "consulta.webm");
  envio.set("tag_audio_events", "false");

  const inicio = Date.now();
  try {
    // Sin ?enable_logging=false: en Creator devuelve 403 (retención cero solo
    // en enterprise). ElevenLabs guarda el audio: el aviso lo tiene que decir.
    const res = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: { "xi-api-key": clave },
        body: envio,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok) {
      // Solo el código y el tipo de error, nunca el cuerpo con texto.
      const detalle = (await res.json().catch(() => null)) as {
        detail?: { status?: string };
      } | null;
      return Response.json(
        { error: "Scribe falló.", estado: res.status, tipo: detalle?.detail?.status },
        { status: 502 },
      );
    }
    const d = (await res.json()) as {
      text?: string;
      language_code?: string;
      language_probability?: number;
    };
    return Response.json({
      texto: (d.text ?? "").trim(),
      idioma: aIdioma(d.language_code),
      codigo: d.language_code ?? null,
      probabilidad: d.language_probability ?? null,
      ms: Date.now() - inicio,
    });
  } catch {
    return Response.json({ error: "Scribe no responde." }, { status: 502 });
  }
}
