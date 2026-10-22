import indice from "@/datos/vectores.json";
import { embeber } from "./embeddings";
import { ordenar } from "./similitud";

// Búsqueda semántica sobre src/datos/vectores.json (docs/index_specification.md).
// Sin estado: ni la frase ni su vector se guardan (regla 3).

export type Coincidencia = { id: string; similitud: number };

export const LIMITE_POR_DEFECTO = 10;
export const TOTAL = indice.items.length;

const items: { id: string; vectores: number[][] }[] = indice.items;
const prefijo: string = indice.instruccion_consulta ?? "";

// La frase lleva delante la instrucción con la que se evaluó el índice.
export const textoConsulta = (frase: string) => prefijo + frase;

// Pura y síncrona: la usan buscar() y las pruebas. Ordena con la precisión
// completa y redondea solo lo que devuelve.
export function mejores(consulta: number[], limite = LIMITE_POR_DEFECTO): Coincidencia[] {
  const n = Math.max(1, Math.min(Math.trunc(limite) || LIMITE_POR_DEFECTO, TOTAL));
  return ordenar(consulta, items)
    .slice(0, n)
    .map((r) => ({ id: r.id, similitud: Math.round(r.puntos * 1e4) / 1e4 }));
}

export async function buscar(
  frase: string,
  { limite, signal }: { limite?: number; signal?: AbortSignal } = {},
): Promise<Coincidencia[]> {
  const [vector] = await embeber([textoConsulta(frase)], { signal });
  return mejores(vector, limite);
}
