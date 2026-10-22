"use client";

import { useEffect } from "react";

// Frases que la caja grande escribe y borra en el placeholder. Alternan
// castellano y valenciano y cada una apunta a una entrada del catálogo
// (src/datos/catalogo-valencia.json), para no sugerir lo que no sabemos
// responder. No repiten los ejemplos clicables de debajo.
export const FRASES_CAJA = [
  "Quiero abrir una tienda de ropa",
  "Vull reformar el bany de casa",
  "Necesito un contenedor para los escombros",
  "Vull demanar el Bono Oro de l'autobús",
  "Hemos montado una asociación de vecinos",
  "L'aire condicionat del bar de baix no em deixa dormir",
  "Me piden un certificado de fe de vida",
  "Traspasse el meu bar a una altra persona",
  "Quiero colgar una pancarta en el balcón",
  "Hay que arreglar la fachada del edificio",
];

const ESCRIBIR_MS = 55;
const BORRAR_MS = 25;
const PAUSA_LLENA_MS = 1800;
const PAUSA_VACIA_MS = 400;

// Escribe y borra las frases en el placeholder de la caja `id`, empezando por
// borrar `inicial`. Toca el atributo en el DOM, sin estado de React, para no
// repintar el Composer en cada letra. Con prefers-reduced-motion, o mientras
// hay texto en la caja, se queda quieta en `inicial`.
export function useEjemploEscrito(
  id: string,
  inicial: string,
  activo: boolean,
) {
  useEffect(() => {
    if (!activo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const encontrada = document.getElementById(id);
    if (!(encontrada instanceof HTMLTextAreaElement)) return;
    const caja = encontrada;

    const frases = [inicial, ...FRASES_CAJA];
    let frase = 0;
    let letras = inicial.length;
    let borrando = true;
    let temporizador: ReturnType<typeof setTimeout>;

    function paso() {
      let espera = borrando ? BORRAR_MS : ESCRIBIR_MS;
      letras += borrando ? -1 : 1;
      caja.placeholder = frases[frase].slice(0, letras);
      if (borrando && letras === 0) {
        borrando = false;
        frase = (frase + 1) % frases.length;
        espera = PAUSA_VACIA_MS;
      } else if (!borrando && letras === frases[frase].length) {
        borrando = true;
        espera = PAUSA_LLENA_MS;
      }
      temporizador = setTimeout(paso, espera);
    }

    temporizador = setTimeout(paso, PAUSA_LLENA_MS);
    return () => {
      clearTimeout(temporizador);
      caja.placeholder = inicial;
    };
  }, [id, inicial, activo]);
}
