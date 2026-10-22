"use client";

// PROTOTIPO (ticket 02). Variante B: una pantalla cada vez. La aclaración
// sustituye a la consulta y la respuesta a la aclaración, a pantalla completa.
// El chat queda plegado en una barra «Afinar» sobre la respuesta.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FichaTramite } from "@/components/FichaTramite";
import { getTramite } from "@/lib/catalogo";
import type { Conversacion } from "./motor-simulado";
import {
  BotonReintentar,
  BotonesCandidatas,
  Burbuja,
  Composer,
  Ejemplos,
  EnlacePag,
  SelectorIdioma,
  Titular,
  lang,
  tx,
  type Tx,
} from "./piezas";

export const nombre = "Pantallas que se sustituyen";

const titular = "text-[clamp(30px,5vw,48px)] leading-[1.1] tracking-[-0.02em]";

export function VarianteB({ c }: { c: Conversacion }) {
  const { estado } = c;
  const t = tx(estado.idioma);
  const pensando = estado.fase === "pensando";
  const fase = pensando ? estado.previa : estado.fase;
  const primera = estado.mensajes.find((m) => m.de === "ciudadano")?.texto;
  const ultima = estado.mensajes.findLast((m) => m.de === "ciudadano")?.texto;

  return (
    <main
      id="contenido"
      lang={lang(estado.idioma)}
      aria-busy={pensando}
      className="mx-auto max-w-[760px] px-(--page-gutter) pt-8 pb-20 md:pt-12"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {fase !== "inicio" ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={c.reiniciar}
            className="min-h-11"
          >
            ← {t.nueva}
          </Button>
        ) : (
          <span />
        )}
        <SelectorIdioma c={c} />
      </div>

      {pensando && (
        <p
          role="status"
          className="mt-6 rounded-xl bg-muted px-4 py-3 text-base motion-safe:animate-pulse"
        >
          {t.pensando}
        </p>
      )}

      <div className={pensando ? "opacity-50" : undefined}>
        {fase === "inicio" && (
          <>
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
          </>
        )}

        {(fase === "aclaracion" || fase === "cierre") && (
          <Aclaracion c={c} t={t} primera={ultima} />
        )}

        {fase === "respuesta" && <Respuesta c={c} t={t} primera={primera} />}

        {fase === "sin-coincidencia" && (
          <section className="mt-8 grid gap-6">
            <Consulta t={t} texto={primera} />
            <h1 className={titular}>{t.fueraTitulo}</h1>
            <p className="text-lg">{t.fueraTexto}</p>
            <EnlacePag t={t} principal />
            <Composer
              c={c}
              t={t}
              id="otra-forma"
              etiqueta={t.afinar}
              pista={t.afinarPista}
              className="mt-4"
            />
          </section>
        )}

        {fase === "error" && (
          <section className="mt-8 grid gap-6">
            <h1 className={titular}>{t.error}</h1>
            <Consulta t={t} texto={estado.borrador} />
            <div className="flex flex-wrap gap-2">
              <BotonReintentar c={c} t={t} />
              <EnlacePag t={t} principal={false} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Consulta({ t, texto }: { t: Tx; texto?: string }) {
  if (!texto) return null;
  return (
    <p className="text-base text-(--text-secondary)">
      {t.tuConsulta}: <q className="text-foreground">{texto}</q>
    </p>
  );
}

function Aclaracion({
  c,
  t,
  primera,
}: {
  c: Conversacion;
  t: Tx;
  primera?: string;
}) {
  const ultimo = c.estado.mensajes.findLast(
    (m) => m.de === "brujula" && (m.tipo === "aclaracion" || m.tipo === "cierre"),
  );
  const [ninguna, setNinguna] = useState(false);
  if (!ultimo || ultimo.de !== "brujula") return null;
  const esCierre = ultimo.tipo === "cierre";
  // Si la aclaración sale al afinar una respuesta, se puede volver a ella.
  const anterior = c.estado.entradaId
    ? getTramite(c.estado.entradaId)
    : undefined;

  return (
    <section className="mt-8 grid gap-6">
      {anterior && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={c.volver}
            className="h-auto min-h-11 justify-start py-2 text-left whitespace-normal"
          >
            ← {t.volverA}: <span lang="es">{anterior.titulo}</span>
          </Button>
        </div>
      )}
      <Consulta t={t} texto={primera} />
      {ultimo.tipo === "aclaracion" && (
        <Badge variant="outline" className="font-mono uppercase">
          {t.ronda(ultimo.ronda)}
        </Badge>
      )}
      <h1 className={titular}>{ultimo.texto}</h1>
      {(ultimo.tipo === "aclaracion" || esCierre) && (
        <BotonesCandidatas
          candidatas={ultimo.candidatas}
          c={c}
          t={t}
          grandes
        />
      )}
      {esCierre ? (
        <EnlacePag t={t} principal />
      ) : ninguna ? (
        <Composer
          c={c}
          t={t}
          id="aclarar"
          etiqueta={t.afinar}
          pista={t.afinarPista}
        />
      ) : (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => setNinguna(true)}
            className="min-h-11"
          >
            {t.ninguna}
          </Button>
        </div>
      )}
    </section>
  );
}

function Respuesta({
  c,
  t,
  primera,
}: {
  c: Conversacion;
  t: Tx;
  primera?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const { estado } = c;
  const entrada = estado.entradaId ? getTramite(estado.entradaId) : undefined;
  if (!entrada) return null;

  return (
    <>
      <section
        aria-label={t.afinar}
        className="sticky top-20 z-30 mt-6 rounded-xl bg-background px-4 py-3 shadow-[0_8px_24px_rgb(0_0_0/0.08)] ring-1 ring-foreground/10"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm text-(--text-secondary)">
            {t.tuConsulta}: <q className="text-foreground">{primera}</q>
          </p>
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-expanded={abierta}
            onClick={() => setAbierta((a) => !a)}
            className="min-h-11"
          >
            {abierta ? t.ocultar : t.afinar}
          </Button>
        </div>
        {abierta && (
          <div className="mt-3 grid gap-3">
            <ol className="grid max-h-[40dvh] gap-3 overflow-y-auto">
              {estado.mensajes.map((m, i) => (
                <li key={i} className="grid">
                  <Burbuja m={m} c={c} t={t} ultima={false} />
                </li>
              ))}
            </ol>
            <Composer
              c={c}
              t={t}
              id="afinar-barra"
              etiqueta={t.afinar}
              pista={t.afinarPista}
            />
          </div>
        )}
      </section>
      <div className="mt-10">
        <FichaTramite
          key={entrada.id}
          tramite={entrada}
          tx={t}
          enValenciano={estado.idioma === "va"}
          onAbrir={c.elegir}
          sinRelacionados
        />
      </div>
    </>
  );
}
