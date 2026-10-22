import { catalogo } from "@/lib/fuente-catalogo";

// GET → Entrada (src/lib/entrada.ts). Para abrir una candidata elegida en la
// aclaración sin volver a llamar al motor.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const entrada = await catalogo.obtener((await params).id);
  return entrada
    ? Response.json(entrada)
    : Response.json({ error: "No existe." }, { status: 404 });
}
