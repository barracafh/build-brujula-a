"use client";

import { useEffect, useSyncExternalStore } from "react";
import { VARIANTES, type VarianteVoz } from "./Microfono";
import { useDepuracion } from "./useGrabadora";

// PROTOTIPO (ticket 13): barra para cambiar de variante (?voz=A|B|C, flechas
// ← →) y panel con el estado de la grabación. No se muestra en producción.

const CLAVES = Object.keys(VARIANTES) as VarianteVoz[];
const oyentes = new Set<() => void>();

function leer(): VarianteVoz {
  const v = new URLSearchParams(window.location.search).get("voz");
  return CLAVES.includes(v as VarianteVoz) ? (v as VarianteVoz) : "A";
}

function poner(v: VarianteVoz) {
  const url = new URL(window.location.href);
  url.searchParams.set("voz", v);
  window.history.replaceState(null, "", url);
  oyentes.forEach((o) => o());
}

export const useVarianteVoz = () =>
  useSyncExternalStore(
    (o) => (oyentes.add(o), () => oyentes.delete(o)),
    leer,
    () => "A" as VarianteVoz,
  );

export function ConmutadorVoz() {
  const v = useVarianteVoz();
  const d = useDepuracion();
  const mover = (paso: number) =>
    poner(CLAVES[(CLAVES.indexOf(v) + paso + CLAVES.length) % CLAVES.length]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") mover(-1);
      if (e.key === "ArrowRight") mover(1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  if (process.env.NODE_ENV === "production") return null;

  const tr = d.transcripcion;
  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground px-2 py-1 font-mono text-sm text-background shadow-lg">
        <button type="button" onClick={() => mover(-1)} className="px-2 py-1" aria-label="Variante anterior">←</button>
        <span className="px-2">
          {v} — {VARIANTES[v]}
        </span>
        <button type="button" onClick={() => mover(1)} className="px-2 py-1" aria-label="Variante siguiente">→</button>
      </div>
      <pre className="fixed right-4 bottom-16 z-50 max-w-[min(360px,calc(100vw-2rem))] overflow-x-auto rounded-lg bg-foreground/90 p-3 font-mono text-xs whitespace-pre-wrap text-background">
        {[
          `estado: ${d.estado}`,
          `segundos: ${d.segundos}`,
          d.motivoParada && `parada: ${d.motivoParada}`,
          d.bytes != null && `audio: ${(d.bytes / 1024).toFixed(0)} KB ${d.mime}`,
          tr && `scribe: ${tr.codigo} (p=${tr.probabilidad?.toFixed(2)}) → ${tr.idioma ?? "?"}`,
          tr && `scribe ms: ${tr.ms} · total ms: ${d.latenciaTotalMs}`,
          tr && `texto: ${tr.texto}`,
          d.error && `error: ${d.error}`,
        ]
          .filter(Boolean)
          .join("\n")}
      </pre>
    </>
  );
}
