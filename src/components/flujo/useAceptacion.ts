"use client";

import { useSyncExternalStore } from "react";

// Aceptación del aviso del primer uso (tickets 08 y 15). Vive solo en el
// navegador: nunca se manda ni se registra en el servidor. Si el navegador no
// deja guardarla, dura lo que la pestaña y se vuelve a pedir en cada visita.
// Sube la versión de la clave cada vez que cambie el texto del aviso: es lo
// único que hace que quien ya aceptó vuelva a verlo.
const CLAVE = "brujula-aviso-v1";

let enMemoria = false;
const oyentes = new Set<() => void>();

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE) === "aceptado" || enMemoria;
  } catch {
    return enMemoria;
  }
}

function guardar(aceptado: boolean) {
  enMemoria = aceptado;
  try {
    if (aceptado) localStorage.setItem(CLAVE, "aceptado");
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento: queda en memoria.
  }
  oyentes.forEach((o) => o());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  window.addEventListener("storage", oyente); // otra pestaña acepta o retira
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener("storage", oyente);
  };
}

// null mientras no se sabe (en el servidor y antes de hidratar).
export function useAceptacion() {
  const aceptado = useSyncExternalStore<boolean | null>(suscribir, leer, () => null);
  return {
    aceptado,
    aceptar: () => guardar(true),
    retirar: () => guardar(false),
  };
}
