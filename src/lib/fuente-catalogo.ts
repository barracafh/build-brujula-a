import "server-only";
import catalogoJson from "../../datos/catalogo-tramites-ayudas.json";
import valenciaJson from "@/datos/catalogo-valencia.json";
import { nombresFuentes } from "@/datos/nombres-fuentes";
import { notasSustituidas } from "@/datos/notas";
import type { Entrada, Fuente, FuenteCatalogo } from "./entrada";

// Implementación por defecto de la fuente del catálogo (ticket 05): el JSON de
// la organización, leído en build y normalizado una vez. Otra fuente solo
// tiene que devolver la misma `Entrada`.

type EntradaJson =
  | (typeof catalogoJson.items)[number]
  | (typeof valenciaJson.items)[number];

function partirFuentes(fuente: string): Fuente[] {
  return fuente
    .split(";")
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//.test(u))
    .map((url) => {
      const dominio = new URL(url).hostname;
      return { nombre: nombresFuentes[dominio] ?? dominio, url };
    });
}

function normalizar(e: EntradaJson): Entrada {
  const { fuente, nota, ...resto } = e;
  return {
    ...resto,
    tipo: e.tipo === "ayuda" ? "ayuda" : "tramite",
    fuentes: partirFuentes(fuente),
    nota:
      e.id in notasSustituidas ? notasSustituidas[e.id] : (nota ?? null),
  };
}

const entradas: Entrada[] = [...catalogoJson.items, ...valenciaJson.items].map(normalizar);
const porId = new Map(entradas.map((e) => [e.id, e]));

export const catalogo: FuenteCatalogo = {
  listar: async () => entradas,
  obtener: async (id) => porId.get(id),
};
