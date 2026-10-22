import type { Idioma } from "@/lib/motor/contrato";

// Consulta por voz (ticket 13): voz a texto con ElevenLabs Scribe por lotes.
// GET → { disponible }; POST multipart { audio } → { texto, idioma }.
// Ni el audio ni la transcripción se guardan ni se registran (regla 3). Sin
// ELEVENLABS_API_KEY la voz no aparece y Brújula funciona igual.
export const dynamic = "force-dynamic";

const MAX_BYTES = 2_000_000; // ~90 s de Opus; el botón para a los 60 s
const TIMEOUT_MS = 20_000;

// Scribe devuelve ISO 639-3 ("spa", "cat") o 639-1 según la documentación:
// se aceptan los dos. Cualquier otro idioma no cambia la interfaz.
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
  envio.set(
    "file",
    audio,
    audio.type.includes("mp4") ? "consulta.m4a" : "consulta.webm",
  );
  envio.set("tag_audio_events", "false");

  try {
    // Sin ?enable_logging=false: en Creator devuelve 403 (la retención cero es
    // solo enterprise). ElevenLabs guarda el audio, y el aviso lo dice.
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": clave },
      body: envio,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok)
      return Response.json({ error: "No se pudo transcribir." }, { status: 502 });
    const d = (await res.json()) as { text?: string; language_code?: string };
    return Response.json({
      texto: (d.text ?? "").trim(),
      idioma: aIdioma(d.language_code),
    });
  } catch {
    return Response.json({ error: "No se pudo transcribir." }, { status: 502 });
  }
}
