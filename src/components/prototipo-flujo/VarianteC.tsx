"use client";

// PROTOTIPO (ticket 02). Variante C: un hilo. La respuesta compuesta aparece
// dentro de la conversación, a todo el ancho, y el chat queda debajo con la
// caja fija abajo. Si la conversación cambia de entrada, la anterior se pliega.

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FichaTramite } from "@/components/FichaTramite";
import { getTramite } from "@/lib/catalogo";
import type { Conversacion } from "./motor-simulado";
import {
  Burbuja,
  Composer,
  Ejemplos,
  Pensando,
  SelectorIdioma,
  Titular,
  lang,
  tx,
} from "./piezas";

export const nombre = "Hilo con la respuesta dentro";

export function VarianteC({ c }: { c: Conversacion }) {
  const { estado } = c;
  const t = tx(estado.idioma);
  const { mensajes, fase, entradaId } = estado;
  const ultimo = useRef<HTMLLIElement>(null);

  useEffect(() => {
    ultimo.current?.scrollIntoView({ block: "start" });
  }, [mensajes.length]);

  // La respuesta se pinta donde la conversación llegó a esa entrada, no en
  // cada confirmación posterior de la misma.
  let dondeRespuesta = -1;
  let idPrevio: string | null = null;
  mensajes.forEach((m, i) => {
    if (m.de === "brujula" && m.tipo === "confirmacion") {
      if (m.id !== idPrevio) {
        if (m.id === entradaId) dondeRespuesta = i;
        idPrevio = m.id;
      }
    }
  });

  if (fase === "inicio")
    return (
      <main
        id="contenido"
        lang={lang(estado.idioma)}
        className="mx-auto max-w-[760px] px-(--page-gutter) pt-8 pb-20 md:pt-12"
      >
        <div className="flex justify-end">
          <SelectorIdioma c={c} />
        </div>
        <div className="mt-6">
          <Titular t={t} />
        </div>
        <Composer
          c={c}
          t={t}
          id="consulta"
          etiqueta={t.etiqueta}
          pista={t.pista}
          grande
          principal
          className="mt-10"
        />
        <div className="mt-6">
          <Ejemplos c={c} t={t} />
        </div>
      </main>
    );

  return (
    <main
      id="contenido"
      lang={lang(estado.idioma)}
      className="mx-auto max-w-[760px] px-(--page-gutter) pt-8 pb-56"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={c.reiniciar}
          className="min-h-11"
        >
          ← {t.nueva}
        </Button>
        <SelectorIdioma c={c} />
      </div>

      <ol aria-live="polite" className="mt-8 grid gap-4">
        {mensajes.map((m, i) => {
          const esUltimo = i === mensajes.length - 1;
          const ref = esUltimo ? ultimo : undefined;
          if (m.de === "brujula" && m.tipo === "confirmacion") {
            const entrada = getTramite(m.id);
            if (i === dondeRespuesta && entrada)
              return (
                <li key={i} ref={ref} className="grid scroll-mt-24 gap-6">
                  <Burbuja m={m} c={c} t={t} ultima={false} />
                  <div className="border-t pt-8">
                    <FichaTramite
                      key={entrada.id}
                      tramite={entrada}
                      tx={t}
                      enValenciano={estado.idioma === "va"}
                      onAbrir={c.elegir}
                      sinRelacionados
                    />
                  </div>
                </li>
              );
            if (estado.sustituidas.includes(m.id) && m.id !== entradaId)
              return (
                <li key={i} ref={ref} className="grid scroll-mt-24">
                  <p className="rounded-xl bg-muted px-4 py-3 text-sm text-(--text-secondary)">
                    {t.sustituida}:{" "}
                    <span lang="es" className="line-through">
                      {entrada?.titulo}
                    </span>
                  </p>
                </li>
              );
          }
          return (
            <li key={i} ref={ref} className="grid scroll-mt-24">
              <Burbuja m={m} c={c} t={t} ultima={esUltimo} />
            </li>
          );
        })}
        {fase === "pensando" && (
          <li className="grid">
            <Pensando t={t} />
          </li>
        )}
      </ol>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background shadow-[0_-8px_24px_rgb(0_0_0/0.08)]">
        <Composer
          c={c}
          t={t}
          id="afinar-hilo"
          etiqueta={t.afinar}
          className="mx-auto max-w-[760px] px-(--page-gutter) py-3"
        />
      </div>
    </main>
  );
}
