"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { POLITICAS, type TextosFlujo } from "./textos";

// Aviso del primer uso (tickets 08 y 15), en un <dialog> modal: con
// showModal() el resto de la página queda inert, así que nada llega a ningún
// proveedor hasta aceptar. Sin aceptación no se puede cerrar (ni con Esc);
// reabierto desde «Privacidad» se cierra con Esc o «Volver» y permite retirarla.
export function Aviso({
  t,
  lang,
  abierto,
  aceptado,
  anuncio,
  selectorIdioma,
  onAceptar,
  onVolver,
  onRetirar,
}: {
  t: TextosFlujo;
  lang: string;
  abierto: boolean;
  aceptado: boolean;
  anuncio: string; // dentro del diálogo: fuera, la página está inert
  selectorIdioma: ReactNode; // también dentro: hay que poder leerlo en valenciano
  onAceptar: () => void;
  onVolver: () => void;
  onRetirar: () => void;
}) {
  const refDialogo = useRef<HTMLDialogElement>(null);
  const refTitulo = useRef<HTMLHeadingElement>(null);
  const a = t.aviso;

  useEffect(() => {
    const d = refDialogo.current;
    if (!d) return;
    if (abierto && !d.open) {
      d.showModal();
      refTitulo.current?.focus();
    } else if (!abierto && d.open) d.close();
  }, [abierto]);

  // Al retirar, el diálogo sigue abierto pero cambia de botones: foco al título.
  useEffect(() => {
    if (refDialogo.current?.open) refTitulo.current?.focus();
  }, [aceptado]);

  return (
    <dialog
      ref={refDialogo}
      lang={lang}
      aria-labelledby="aviso-titulo"
      onCancel={(e) => {
        e.preventDefault();
        if (aceptado) onVolver();
      }}
      // Chrome cierra igualmente con Esc si aún no ha habido interacción
      // (ignora el preventDefault): sin aceptación, se vuelve a abrir.
      onClose={() => {
        if (!abierto) return;
        if (aceptado) onVolver();
        else {
          refDialogo.current?.showModal();
          refTitulo.current?.focus();
        }
      }}
      className="m-auto max-h-[90dvh] w-[min(640px,calc(100vw-2*var(--page-gutter)))] overflow-y-auto rounded-xl bg-background p-6 text-foreground shadow-[0_8px_24px_rgb(0_0_0/0.08)] ring-1 ring-foreground/10 backdrop:bg-foreground/40 md:p-8"
    >
      <div className="grid gap-5">
        <div role="status" className="sr-only">
          {anuncio}
        </div>
        <div className="flex justify-end">{selectorIdioma}</div>
        <h1
          id="aviso-titulo"
          ref={refTitulo}
          tabIndex={-1}
          className="rounded-md text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-0.02em] outline-none"
        >
          {a.titulo}
        </h1>
        <p className="text-lg">{a.intro}</p>
        <ul className="grid list-disc gap-3 pl-6 text-lg marker:text-brand">
          {a.puntos.map((punto) => (
            <li key={punto}>{punto}</li>
          ))}
        </ul>
        <p className="text-lg font-medium">{a.datos}</p>

        <details className="group rounded-xl ring-1 ring-foreground/10">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 py-3 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span
              aria-hidden="true"
              className="transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
            >
              ▸
            </span>
            {a.masInfo}
          </summary>
          <div className="grid gap-4 px-4 pb-4 text-base">
            <p>{a.envio}</p>
            <p>{a.finalidad}</p>
            <ul className="grid gap-3">
              {(
                [
                  [a.jev, "TypeSafe"],
                  [a.helmcode, "HelmCode"],
                  [a.elevenlabs, "ElevenLabs"],
                ] as const
              ).map(([texto, empresa]) => (
                <li key={empresa}>
                  {texto}{" "}
                  <a
                    href={POLITICAS[empresa]}
                    className="underline underline-offset-4"
                  >
                    {a.politica(empresa)}
                  </a>
                </li>
              ))}
            </ul>
            <p>{a.contrato}</p>
            <p className="text-(--text-secondary)">{a.navegador}</p>
          </div>
        </details>

        <div className="flex flex-wrap gap-2">
          {aceptado ? (
            <>
              <Button
                type="button"
                variant="sunset"
                size="lg"
                onClick={onVolver}
                className="min-h-11 max-md:w-full"
              >
                {a.volver}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onRetirar}
                className="min-h-11 max-md:w-full"
              >
                {a.retirar}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="sunset"
              size="lg"
              onClick={onAceptar}
              className="min-h-11 max-md:w-full"
            >
              {a.aceptar}
            </Button>
          )}
        </div>
      </div>
    </dialog>
  );
}
