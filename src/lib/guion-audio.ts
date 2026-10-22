import { pronunciar } from "@/datos/pronunciacion";
import {
  textosRespuesta,
  type IdiomaRespuesta,
} from "@/components/respuesta/textos";
import type { Entrada } from "./entrada";

// Guion del audio de la respuesta (tickets 14 y 17): lo visible, en el orden de
// la pantalla, sin URL ni fuentes. Cada fragmento lleva su idioma de voz: el
// contenido, siempre castellano y compartido por las dos versiones; las
// etiquetas y la frase final, en el idioma de la versión.

export type Fragmento = { texto: string; voz: "es" | "ca" };

const fraseFinal: Record<IdiomaRespuesta, string> = {
  es: "Para hacerlo, usa el botón Hacer el trámite.",
  va: "Per a fer-ho, fes servir el botó Fer el tràmit.",
};

// Cierra la frase para que la voz haga la pausa antes del siguiente fragmento.
const cerrar = (t: string) => (/[.!?:;]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);

export function guionAudio(e: Entrada, idioma: IdiomaRespuesta): Fragmento[] {
  const tx = textosRespuesta[idioma];
  const voz = idioma === "va" ? "ca" : "es";
  const etiqueta = (texto: string): Fragmento => ({ texto: `${texto}.`, voz });
  const contenido = (texto: string): Fragmento => ({
    texto: pronunciar(texto),
    voz: "es",
  });
  const lista = (items: string[]) => items.map(cerrar).join("\n");

  const guion: Fragmento[] = [];
  if (!e.verificado) guion.push({ texto: tx.sinVerificar, voz });
  guion.push(contenido(`${cerrar(e.titulo)}\n${e.organismo}, ${cerrar(e.administracion)}`));
  if (e.pasos.length > 0) {
    guion.push(etiqueta(tx.pasos));
    guion.push(contenido(e.pasos.map((p, i) => `${i + 1}. ${cerrar(p)}`).join("\n")));
  }
  if (e.plazo) guion.push(etiqueta(tx.plazo), contenido(cerrar(e.plazo)));
  if (e.requisitos_clave.length > 0)
    guion.push(etiqueta(tx.requisitos), contenido(lista(e.requisitos_clave)));
  if (e.documentacion.length > 0)
    guion.push(etiqueta(tx.documentacion), contenido(lista(e.documentacion)));
  if (e.nota) guion.push(etiqueta(tx.convieneSaber), contenido(cerrar(e.nota)));
  guion.push({
    texto: e.enlace_tramite !== null ? fraseFinal[idioma] : tx.sinEnlace,
    voz,
  });
  return guion;
}
