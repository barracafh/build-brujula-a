"use client";

import { useState, type FormEvent, type Ref } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CARACTERES } from "@/lib/motor/contrato";
import type { Candidata, Conversacion } from "./useConversacion";
import { PAG, lang, type TextosFlujo } from "./textos";
import { Microfono } from "./prototipo-voz/Microfono";
import { useVarianteVoz } from "./prototipo-voz/Conmutador";

export const titular =
  "rounded-md text-[clamp(30px,5vw,48px)] leading-[1.1] tracking-[-0.02em] outline-none";

// Caja de texto que envía un mensaje. Lleva siempre debajo el aviso de IA
// (AI Act, art. 50.1), asociado con aria-describedby.
export function Composer({
  c,
  t,
  id,
  etiqueta,
  pista,
  grande = false,
  principal = false,
  refCaja,
  onEscape,
  className,
}: {
  c: Conversacion;
  t: TextosFlujo;
  id: string;
  etiqueta: string;
  pista?: string;
  grande?: boolean;
  principal?: boolean;
  refCaja?: Ref<HTMLTextAreaElement>;
  onEscape?: () => void;
  className?: string;
}) {
  const [texto, setTexto] = useState("");
  const variante = useVarianteVoz();
  // PROTOTIPO (ticket 13): la transcripción se añade a la caja; no se envía sola.
  const microfono = (
    <Microfono
      variante={variante}
      grande={grande}
      idioma={c.idioma}
      idCaja={id}
      deshabilitado={c.pensando}
      alTexto={(tr) =>
        setTexto((prev) =>
          (prev.trim() ? `${prev.trimEnd()} ${tr.texto}` : tr.texto).slice(
            0,
            MAX_CARACTERES,
          ),
        )
      }
    />
  );

  function enviar(e?: FormEvent) {
    e?.preventDefault();
    if (!texto.trim() || c.pensando) return;
    c.enviar(texto);
    setTexto("");
  }

  const descripcion = [pista && `${id}-pista`, `${id}-ia`]
    .filter(Boolean)
    .join(" ");

  return (
    <form onSubmit={enviar} className={cn("grid gap-3", className)}>
      <label
        htmlFor={id}
        className={cn("font-medium", grande ? "text-base" : "text-sm")}
      >
        {etiqueta}
      </label>
      {grande && variante === "C" && microfono}
      <div className={cn(grande ? "grid gap-3" : "flex items-end gap-2")}>
        <Textarea
          id={id}
          ref={refCaja}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && onEscape) {
              e.preventDefault();
              onEscape();
            }
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (!e.repeat) enviar();
            }
          }}
          maxLength={MAX_CARACTERES}
          rows={grande ? 3 : 1}
          aria-describedby={descripcion}
          className={cn(
            "text-base md:text-base",
            grande ? "min-h-24 px-4 py-3 text-lg md:text-lg" : "min-h-11",
          )}
        />
        {!grande && microfono}
        <div className={cn(grande && "flex flex-wrap items-start gap-2")}>
          <Button
            type="submit"
            variant={principal ? "sunset" : "outline"}
            size="lg"
            disabled={c.pensando}
            className={cn("min-h-11", grande && "max-md:w-full")}
          >
            {grande ? t.buscar : t.enviar}
          </Button>
          {grande && variante !== "C" && microfono}
        </div>
      </div>
      {pista && (
        <p id={`${id}-pista`} className="text-sm text-(--text-secondary)">
          {pista}
        </p>
      )}
      <p id={`${id}-ia`} className="text-sm text-(--text-secondary)">
        {t.avisoIA}
      </p>
    </form>
  );
}

export function BotonesCandidatas({
  c,
  t,
  candidatas,
}: {
  c: Conversacion;
  t: TextosFlujo;
  candidatas: Candidata[];
}) {
  return (
    <ul className="grid gap-2">
      {candidatas.map((cand) => (
        <li key={cand.id}>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => c.elegir(cand)}
            className="h-auto min-h-11 w-full flex-col items-start justify-start gap-1 px-5 py-4 text-left text-lg whitespace-normal"
          >
            <span className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {cand.tipo === "ayuda" ? t.tipoAyuda : t.tipoTramite}
              </Badge>
              {cand.confianza === "media" && (
                <Badge variant="secondary">{t.confianzaMedia}</Badge>
              )}
            </span>
            <span lang="es" className="font-medium">
              {cand.titulo}
            </span>
            <span lang="es" className="text-base text-(--text-secondary)">
              {cand.organismo}
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function EnlacePag({
  t,
  principal,
}: {
  t: TextosFlujo;
  principal: boolean;
}) {
  return (
    <a
      href={PAG}
      className={cn(
        buttonVariants({ variant: principal ? "sunset" : "outline", size: "lg" }),
        "h-auto min-h-11 w-fit whitespace-normal max-md:w-full",
      )}
    >
      {t.buscarPag} <span aria-hidden="true">↗</span>
    </a>
  );
}

export function SelectorIdioma({ c, t }: { c: Conversacion; t: TextosFlujo }) {
  return (
    <div role="group" aria-label={t.cambiarIdioma} className="flex gap-2">
      {(["es", "va"] as const).map((i) => (
        <Button
          key={i}
          type="button"
          variant={c.idioma === i ? "secondary" : "ghost"}
          size="lg"
          aria-pressed={c.idioma === i}
          onClick={() => c.cambiarIdioma(i)}
          lang={lang(i)}
          className="min-h-11"
        >
          {i === "es" ? "Castellano" : "Valencià"}
        </Button>
      ))}
    </div>
  );
}

export function TuConsulta({ t, texto }: { t: TextosFlujo; texto?: string }) {
  if (!texto) return null;
  return (
    <p className="text-base text-(--text-secondary) [overflow-wrap:anywhere]">
      {t.tuConsulta}: <q className="text-foreground">{texto}</q>
    </p>
  );
}
