"use client";

import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { titular } from "./piezas";
import { POLITICAS, type TextosFlujo } from "./textos";

// Aviso del primer uso (tickets 08 y 15). Hasta que se acepta, Flujo no
// enseña ninguna caja de texto, así que nada llega a ningún proveedor.
// Reabierto desde «Privacidad», con la aceptación dada, permite retirarla.
export function Aviso({
  t,
  aceptado,
  onAceptar,
  onVolver,
  onRetirar,
  refTitular,
}: {
  t: TextosFlujo;
  aceptado: boolean;
  onAceptar: () => void;
  onVolver: () => void;
  onRetirar: () => void;
  refTitular: Ref<HTMLHeadingElement>;
}) {
  const a = t.aviso;
  return (
    <section aria-labelledby="aviso-titulo" className="mt-8 grid gap-6">
      <h1 id="aviso-titulo" ref={refTitular} tabIndex={-1} className={titular}>
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

      {aceptado ? (
        <div className="flex flex-wrap gap-2">
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
        </div>
      ) : (
        <div>
          <Button
            type="button"
            variant="sunset"
            size="lg"
            onClick={onAceptar}
            className="min-h-11 max-md:w-full"
          >
            {a.aceptar}
          </Button>
        </div>
      )}
    </section>
  );
}
