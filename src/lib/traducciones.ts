import "server-only";
import traduccionesJson from "@/datos/catalogo-va.json";
import type { Entrada, EntradaConTraduccion, Traduccion } from "./entrada";
import { campos, huella, validarTraduccion } from "./traduccion";

const items = traduccionesJson.items as Record<string, unknown>;
const memo = new Map<string, EntradaConTraduccion>();

// Se valida al usarla: si la huella no coincide (el castellano cambió) o una
// cifra no cuadra, la ficha vuelve al castellano en vez de mostrar un dato falso.
export function conTraduccion(e: Entrada): EntradaConTraduccion {
  const hecha = memo.get(e.id);
  if (hecha && hecha.titulo === e.titulo) return hecha;
  const t = items[e.id] as ({ huella?: unknown } & Record<string, unknown>) | undefined;
  let va: Traduccion | null = null;
  if (t && t.huella === huella(campos(e))) {
    const { huella: _, ...resto } = t;
    if (validarTraduccion(campos(e), resto).length === 0) va = campos(resto as unknown as Traduccion);
  }
  const r = { ...e, va };
  memo.set(e.id, r);
  return r;
}
