"use client";

// PROTOTIPO (ticket 02). Variante A: la respuesta ocupa la columna principal y
// el chat vive al lado. Escritorio: panel lateral fijo. Móvil: barra fija abajo
// que se despliega en hoja; se abre sola cuando hay que elegir.

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FichaTramite } from "@/components/FichaTramite";
import { getTramite } from "@/lib/catalogo";
import type { Conversacion } from "./motor-simulado";
import {
  BotonReintentar,
  Burbuja,
  Composer,
  Ejemplos,
  EnlacePag,
  Pensando,
  SelectorIdioma,
  Titular,
  lang,
  tx,
  type Tx,
} from "./piezas";

export const nombre = "Panel lateral";

export function VarianteA({ c }: { c: Conversacion }) {
  const { estado } = c;
  const t = tx(estado.idioma);

  if (estado.fase === "inicio")
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
      className="mx-auto max-w-(--container-content) px-(--page-gutter) pt-8 pb-48 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10 lg:pb-20"
    >
      <div className="min-w-0">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={c.reiniciar}
            className="min-h-11"
          >
            ← {t.nueva}
          </Button>
          <SelectorIdioma c={c} />
        </div>
        <Principal c={c} t={t} />
      </div>

      <aside
        aria-label={t.conversacion}
        className="sticky top-24 hidden h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10 lg:flex"
      >
        <h2 className="border-b px-4 py-3 font-sans text-sm font-medium text-(--text-secondary)">
          {t.conversacion}
        </h2>
        <Hilo c={c} t={t} className="flex-1 overflow-y-auto p-4" />
        <Composer
          c={c}
          t={t}
          id="afinar-lateral"
          etiqueta={t.afinar}
          className="border-t p-4"
        />
      </aside>

      <HojaMovil c={c} t={t} />
    </main>
  );
}

function Principal({ c, t }: { c: Conversacion; t: Tx }) {
  const { estado } = c;
  const fase = estado.fase === "pensando" ? estado.previa : estado.fase;
  const entrada = estado.entradaId ? getTramite(estado.entradaId) : undefined;

  if (entrada)
    return (
      <FichaTramite
        key={entrada.id}
        tramite={entrada}
        tx={t}
        enValenciano={estado.idioma === "va"}
        onAbrir={c.elegir}
        sinRelacionados
      />
    );

  if (fase === "sin-coincidencia" || fase === "cierre")
    return (
      <Card render={<section />} className="gap-3 px-6 py-6 text-base">
        <h2 className="text-[clamp(26px,4vw,36px)] leading-[1.1] tracking-[-0.02em]">
          {t.fueraTitulo}
        </h2>
        <p>{t.fueraTexto}</p>
        <EnlacePag t={t} principal />
      </Card>
    );

  if (fase === "error")
    return (
      <Card render={<section />} className="gap-3 px-6 py-6 text-base">
        <h2 className="text-[clamp(26px,4vw,36px)] leading-[1.1] tracking-[-0.02em]">
          {t.error}
        </h2>
        <div className="flex flex-wrap gap-2">
          <BotonReintentar c={c} t={t} />
          <EnlacePag t={t} principal={false} />
        </div>
      </Card>
    );

  // Aclaración o primera búsqueda: la respuesta aún no existe.
  return (
    <div className="grid min-h-60 place-items-center rounded-xl border border-dashed px-6 py-10 text-center text-base text-(--text-secondary)">
      {estado.fase === "pensando" ? t.pensando : t.esperando}
    </div>
  );
}

function Hilo({
  c,
  t,
  className,
}: {
  c: Conversacion;
  t: Tx;
  className?: string;
}) {
  const { mensajes, fase } = c.estado;
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length, fase]);

  return (
    <div className={className}>
      <ol aria-live="polite" className="grid gap-3">
        {mensajes.map((m, i) => (
          <li key={i} className="grid">
            <Burbuja
              m={m}
              c={c}
              t={t}
              ultima={i === mensajes.length - 1}
              soloCandidatas
            />
          </li>
        ))}
        {fase === "pensando" && (
          <li className="grid">
            <Pensando t={t} />
          </li>
        )}
      </ol>
      <div ref={fin} />
    </div>
  );
}

// Se abre sola cuando el último mensaje pide elegir, salvo que el ciudadano la
// haya cerrado en ese mismo mensaje.
function HojaMovil({ c, t }: { c: Conversacion; t: Tx }) {
  const { mensajes } = c.estado;
  const [abierta, setAbierta] = useState(false);
  const [cerradaEn, setCerradaEn] = useState(-1);
  const ultimo = mensajes.at(-1);
  const pideElegir =
    ultimo?.de === "brujula" &&
    (ultimo.tipo === "aclaracion" || ultimo.tipo === "cierre");
  const expandida = abierta || (pideElegir && cerradaEn !== mensajes.length);
  const ultimoDeBrujula = [...mensajes].reverse().find((m) => m.de === "brujula");

  return (
    <section
      aria-label={t.conversacion}
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-xl border-t bg-background shadow-[0_-8px_24px_rgb(0_0_0/0.08)] lg:hidden"
    >
      <div className="mx-auto max-w-[760px] px-(--page-gutter) py-3">
        <div className="flex items-center justify-between gap-3">
          {!expandida && ultimoDeBrujula && (
            <p className="min-w-0 truncate text-sm text-(--text-secondary)">
              {ultimoDeBrujula.texto}
            </p>
          )}
          {expandida && (
            <h2 className="font-sans text-sm font-medium text-(--text-secondary)">
              {t.conversacion}
            </h2>
          )}
          <Button
            type="button"
            variant="ghost"
            size="lg"
            aria-expanded={expandida}
            onClick={() => {
              if (expandida) {
                setAbierta(false);
                setCerradaEn(mensajes.length);
              } else setAbierta(true);
            }}
            className="min-h-11 shrink-0"
          >
            {expandida ? t.ocultar : t.verConversacion}
          </Button>
        </div>
        {expandida && (
          <Hilo c={c} t={t} className="mt-2 max-h-[55dvh] overflow-y-auto" />
        )}
        <Composer
          c={c}
          t={t}
          id="afinar-movil"
          etiqueta={t.afinar}
          className={cn("mt-2", !expandida && "[&_label]:sr-only")}
        />
      </div>
    </section>
  );
}
