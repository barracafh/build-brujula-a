"use client";

import { useSyncExternalStore } from "react";
import type { Resumen } from "@/lib/entrada";

// Trámites abiertos en este navegador, para volver a ellos sin iniciar
// sesión. Solo se guarda el resumen de la entrada del catálogo (id, tipo,
// título y organismo), nunca lo que escribió el ciudadano (regla 3), y nunca
// se manda al servidor. Si el navegador no deja guardarlo, dura lo que la
// pestaña.
const CLAVE = "brujula-recientes-v1";
const MAX = 5;
const VACIA: Resumen[] = [];

let enMemoria: Resumen[] = VACIA;
let sinAlmacen = false;
let cache: { crudo: string | null; lista: Resumen[] } = {
  crudo: null,
  lista: VACIA,
};
const oyentes = new Set<() => void>();

function valido(x: unknown): x is Resumen {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    (r.tipo === "tramite" || r.tipo === "ayuda") &&
    typeof r.titulo === "string" &&
    typeof r.organismo === "string"
  );
}

function interpretar(crudo: string | null): Resumen[] {
  if (!crudo) return VACIA;
  try {
    const datos: unknown = JSON.parse(crudo);
    return Array.isArray(datos) ? datos.filter(valido).slice(0, MAX) : VACIA;
  } catch {
    return VACIA;
  }
}

// useSyncExternalStore exige la misma referencia mientras no cambie nada.
function leer(): Resumen[] {
  if (sinAlmacen) return enMemoria;
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo !== cache.crudo) cache = { crudo, lista: interpretar(crudo) };
    return cache.lista;
  } catch {
    sinAlmacen = true;
    return enMemoria;
  }
}

function guardar(lista: Resumen[]) {
  enMemoria = lista;
  try {
    if (lista.length) localStorage.setItem(CLAVE, JSON.stringify(lista));
    else localStorage.removeItem(CLAVE);
  } catch {
    sinAlmacen = true; // Sin almacenamiento: queda en memoria.
  }
  oyentes.forEach((o) => o());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  window.addEventListener("storage", oyente); // otra pestaña abre o borra
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener("storage", oyente);
  };
}

// La entrada abierta pasa a ser la primera; sin repetidos y como mucho MAX.
export function recordar({ id, tipo, titulo, organismo }: Resumen) {
  const lista = leer();
  if (lista[0]?.id === id && lista[0].titulo === titulo) return;
  guardar(
    [{ id, tipo, titulo, organismo }, ...lista.filter((r) => r.id !== id)].slice(
      0,
      MAX,
    ),
  );
}

export function borrarRecientes() {
  guardar(VACIA);
}

// Vacía en el servidor y antes de hidratar.
export function useRecientes() {
  return useSyncExternalStore(suscribir, leer, () => VACIA);
}
