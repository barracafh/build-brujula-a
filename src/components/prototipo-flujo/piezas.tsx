"use client";

// PROTOTIPO (ticket 02). Piezas pequeñas que comparten las variantes; el
// layout es de cada variante.

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getTramite } from "@/lib/catalogo";
import { textos, type Idioma } from "@/i18n";
import {
  EJEMPLOS,
  PAG,
  type Candidata,
  type Conversacion,
  type Mensaje,
} from "./motor-simulado";

export const UI = {
  es: {
    afinar: "Afina tu consulta",
    volverA: "Volver a",
    afinarPista: "Añade detalles o corrige lo que has dicho.",
    enviar: "Enviar",
    pensando: "Pensando…",
    nueva: "Nueva consulta",
    reintentar: "Reintentar",
    tuConsulta: "Tu consulta",
    conversacion: "Conversación",
    verConversacion: "Ver conversación",
    ocultar: "Ocultar",
    ninguna: "Ninguna de estas",
    buscarPag: "Buscar en administracion.gob.es",
    esperando: "Aquí verás qué hay que hacer cuando sepamos qué trámite es.",
    sustituida: "Respuesta anterior, sustituida",
    ronda: (n: number) => `Aclaración ${n} de 2`,
    confianzaMedia: "Puede encajar",
  },
  va: {
    afinar: "Afina la teua consulta",
    volverA: "Tornar a",
    afinarPista: "Afig detalls o corregix el que has dit.",
    enviar: "Enviar",
    pensando: "Pensant…",
    nueva: "Nova consulta",
    reintentar: "Torna-ho a provar",
    tuConsulta: "La teua consulta",
    conversacion: "Conversa",
    verConversacion: "Veure la conversa",
    ocultar: "Amagar",
    ninguna: "Cap d'estos",
    buscarPag: "Cercar en administracion.gob.es",
    esperando: "Ací veuràs què cal fer quan sapiguem quin tràmit és.",
    sustituida: "Resposta anterior, substituïda",
    ronda: (n: number) => `Aclariment ${n} de 2`,
    confianzaMedia: "Pot encaixar",
  },
};

export const tx = (i: Idioma) => ({ ...textos[i], ...UI[i] });
export type Tx = ReturnType<typeof tx>;

export const lang = (i: Idioma) => (i === "va" ? "ca" : "es");

export function SelectorIdioma({ c }: { c: Conversacion }) {
  const actual = c.estado.idioma;
  return (
    <div
      role="group"
      aria-label={textos[actual].cambiarIdioma}
      className="flex gap-2"
    >
      {(["es", "va"] as const).map((i) => (
        <Button
          key={i}
          type="button"
          variant={actual === i ? "secondary" : "ghost"}
          size="lg"
          aria-pressed={actual === i}
          onClick={() => c.cambiarIdioma(i)}
          lang={lang(i)}
        >
          {i === "es" ? "Castellano" : "Valencià"}
        </Button>
      ))}
    </div>
  );
}

export function Ejemplos({ c, t }: { c: Conversacion; t: Tx }) {
  return (
    <div>
      <p className="text-base text-(--text-secondary)">{t.ejemplos}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {EJEMPLOS.map((ej) => (
          <li key={ej.texto}>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={c.estado.fase === "pensando"}
              onClick={() => c.enviar(ej.texto)}
              className="h-auto min-h-11 whitespace-normal"
            >
              {ej.texto}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Caja de texto con Enter para enviar. `grande` para la consulta inicial.
export function Composer({
  c,
  t,
  id,
  etiqueta,
  pista,
  grande = false,
  principal = false,
  inicial = "",
  className,
}: {
  c: Conversacion;
  t: Tx;
  id: string;
  etiqueta: string;
  pista?: string;
  grande?: boolean;
  principal?: boolean;
  inicial?: string;
  className?: string;
}) {
  const [texto, setTexto] = useState(inicial);
  const pensando = c.estado.fase === "pensando";

  function enviar(e?: FormEvent) {
    e?.preventDefault();
    if (!texto.trim() || pensando) return;
    c.enviar(texto);
    setTexto("");
  }

  return (
    <form onSubmit={enviar} className={cn("grid gap-3", className)}>
      <label
        htmlFor={id}
        className={cn("font-medium", grande ? "text-base" : "text-sm")}
      >
        {etiqueta}
      </label>
      <div className={cn(grande ? "grid gap-3" : "flex items-end gap-2")}>
        <Textarea
          id={id}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              enviar();
            }
          }}
          maxLength={1000}
          rows={grande ? 3 : 1}
          aria-describedby={pista ? `${id}-pista` : undefined}
          className={cn(
            "text-base md:text-base",
            grande ? "min-h-24 px-4 py-3 text-lg md:text-lg" : "min-h-11",
          )}
        />
        <div>
          <Button
            type="submit"
            variant={principal ? "sunset" : "outline"}
            size="lg"
            disabled={pensando}
            className={cn("min-h-11", grande && "max-md:w-full")}
          >
            {pensando ? t.pensando : grande ? t.buscar : t.enviar}
          </Button>
        </div>
      </div>
      {pista && (
        <p id={`${id}-pista`} className="text-sm text-(--text-secondary)">
          {pista}
        </p>
      )}
    </form>
  );
}

export function BotonesCandidatas({
  candidatas,
  c,
  t,
  grandes = false,
}: {
  candidatas: Candidata[];
  c: Conversacion;
  t: Tx;
  grandes?: boolean;
}) {
  return (
    <ul className="grid gap-2">
      {candidatas.map((cand) => {
        const e = getTramite(cand.id);
        if (!e) return null;
        return (
          <li key={cand.id}>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => c.elegir(cand.id)}
              className={cn(
                "h-auto min-h-11 w-full flex-col items-start justify-start gap-1 py-3 text-left whitespace-normal",
                grandes ? "px-5 py-4 text-lg" : "text-base",
              )}
            >
              <span className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {e.tipo === "ayuda" ? t.tipoAyuda : t.tipoTramite}
                </Badge>
                {cand.confianza === "media" && (
                  <Badge variant="secondary">{t.confianzaMedia}</Badge>
                )}
              </span>
              <span lang="es" className="font-medium">
                {e.titulo}
              </span>
              {grandes && (
                <span lang="es" className="text-sm text-(--text-secondary)">
                  {e.organismo}
                </span>
              )}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export function EnlacePag({ t, principal }: { t: Tx; principal: boolean }) {
  return (
    <a
      href={PAG.url}
      className={cn(
        buttonVariants({ variant: principal ? "sunset" : "outline", size: "lg" }),
        "h-auto min-h-11 w-fit whitespace-normal max-md:w-full",
      )}
    >
      {t.buscarPag} <span aria-hidden="true">↗</span>
    </a>
  );
}

export function BotonReintentar({
  c,
  t,
  principal = true,
}: {
  c: Conversacion;
  t: Tx;
  principal?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={principal ? "sunset" : "outline"}
      size="lg"
      onClick={c.reintentar}
      className="min-h-11 max-md:w-full"
    >
      {t.reintentar}
    </Button>
  );
}

// Una burbuja de chat. Las de Brújula pueden traer botones.
export function Burbuja({
  m,
  c,
  t,
  ultima,
  soloCandidatas = false,
}: {
  m: Mensaje;
  c: Conversacion;
  t: Tx;
  ultima: boolean;
  soloCandidatas?: boolean; // las demás acciones las pinta la variante
}) {
  if (m.de === "ciudadano")
    return (
      <div className="ml-8 justify-self-end rounded-xl bg-muted px-4 py-3 text-base">
        {m.texto}
      </div>
    );

  return (
    <div
      className={cn(
        "mr-4 grid gap-3 rounded-xl px-4 py-3 text-base ring-1 ring-foreground/10",
        m.tipo === "error" && "ring-destructive/40",
      )}
    >
      {m.tipo === "aclaracion" && (
        <p className="font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
          {t.ronda(m.ronda)}
        </p>
      )}
      <p className={cn(m.tipo === "error" && "text-destructive")}>{m.texto}</p>
      {ultima && (m.tipo === "aclaracion" || m.tipo === "cierre") && (
        <BotonesCandidatas candidatas={m.candidatas} c={c} t={t} />
      )}
      {ultima &&
        !soloCandidatas &&
        (m.tipo === "cierre" || m.tipo === "sin-coincidencia") && (
        <EnlacePag t={t} principal={false} />
      )}
      {ultima && !soloCandidatas && m.tipo === "error" && (
        <div className="flex flex-wrap gap-2">
          <BotonReintentar c={c} t={t} principal={false} />
          <EnlacePag t={t} principal={false} />
        </div>
      )}
    </div>
  );
}

export function Pensando({ t }: { t: Tx }) {
  return (
    <p className="mr-4 rounded-xl px-4 py-3 text-base text-(--text-secondary) ring-1 ring-foreground/10 motion-safe:animate-pulse">
      {t.pensando}
    </p>
  );
}

export function Titular({ t }: { t: Tx }) {
  return (
    <>
      <h1 className="text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
        {t.titular}
      </h1>
      <p className="mt-6 text-lg text-(--text-secondary)">{t.entradilla}</p>
    </>
  );
}
