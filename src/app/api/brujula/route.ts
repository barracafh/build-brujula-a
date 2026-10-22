import { clasificar } from "@/lib/clasificar";

// POST {"frase": "…"} → Resultado (src/lib/tipos.ts).
// No se guarda ni se registra la frase (regla 3 de la plataforma).
export async function POST(req: Request) {
  const cuerpo: unknown = await req.json().catch(() => null);
  const frase =
    cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo)
      ? (cuerpo as { frase?: unknown }).frase
      : undefined;
  if (typeof frase !== "string" || !frase.trim() || frase.length > 1000)
    return Response.json(
      { error: "Escribe qué necesitas, hasta 1.000 caracteres." },
      { status: 400 },
    );
  try {
    return Response.json(await clasificar(frase.trim()));
  } catch {
    return Response.json(
      { error: "No hemos podido clasificarlo." },
      { status: 500 },
    );
  }
}
