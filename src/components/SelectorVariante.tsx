"use client";

// PROTOTIPO. Barra flotante para cambiar de variante con ?variant= y ver el
// estado. Va arriba porque las variantes usan la parte de abajo en móvil.
// Oculta en producción.

import { useEffect } from "react";

export function SelectorVariante({
  variantes,
  actual,
  onCambiar,
  estado,
  extra,
}: {
  variantes: { clave: string; nombre: string }[];
  actual: string;
  onCambiar: (clave: string) => void;
  estado: string;
  extra?: React.ReactNode;
}) {
  const i = Math.max(
    0,
    variantes.findIndex((v) => v.clave === actual),
  );
  const mover = (d: number) =>
    onCambiar(variantes[(i + d + variantes.length) % variantes.length].clave);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      if (e.key === "ArrowLeft") mover(-1);
      if (e.key === "ArrowRight") mover(1);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed top-2 left-1/2 z-50 w-[min(560px,calc(100vw-16px))] -translate-x-1/2 rounded-2xl bg-foreground px-3 py-2 font-mono text-xs text-background shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => mover(-1)}
          aria-label="Variante anterior"
          className="min-h-8 rounded-md px-2 hover:bg-background/15"
        >
          ←
        </button>
        <span className="text-center">
          {variantes[i].clave} · {variantes[i].nombre}
        </span>
        <button
          type="button"
          onClick={() => mover(1)}
          aria-label="Variante siguiente"
          className="min-h-8 rounded-md px-2 hover:bg-background/15"
        >
          →
        </button>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-background/20 pt-1">
        <span className="opacity-80 max-md:hidden">{estado}</span>
        {extra}
      </div>
    </div>
  );
}
