"use client";

import { useState, type FormEvent, type Ref } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CARACTERES } from "@/lib/motor/contrato";
import type { Candidata, Conversacion } from "./useConversacion";
import { PAG, lang, type TextosFlujo } from "./textos";
import { Dictar } from "./voz/Dictar";

export const titular =
  "rounded-md text-[clamp(30px,5vw,48px)] leading-[1.1] tracking-[-0.02em] outline-none";

// Caja de texto que envía un mensaje. Lleva siempre el aviso de IA (AI Act,
// art. 50.1), asociado con aria-describedby: debajo, o donde se pinte <Avisos />
// si avisosAparte. Al lado, «Dictar» (ticket 13): lo dictado se añade a la
// caja y se envía con el botón.
export function Composer({
  c,
  t,
  id,
  etiqueta,
  pista,
  grande = false,
  principal = false,
  avisosAparte = false,
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
  avisosAparte?: boolean;
  refCaja?: Ref<HTMLTextAreaElement>;
  onEscape?: () => void;
  className?: string;
}) {
  const [texto, setTexto] = useState("");

  function enviar(e?: FormEvent) {
    e?.preventDefault();
    if (!texto.trim() || c.pensando) return;
    c.enviar(texto);
    setTexto("");
  }

  const dictar = (
    <Dictar
      t={t}
      grande={grande}
      deshabilitado={c.pensando}
      alTexto={(tr) => {
        setTexto((prev) =>
          (prev.trim() ? `${prev.trimEnd()} ${tr.texto}` : tr.texto).slice(
            0,
            MAX_CARACTERES,
          ),
        );
        if (tr.idioma) c.idiomaDetectado(tr.idioma);
        // Foco a la caja con el cursor al final, para revisar antes de enviar.
        requestAnimationFrame(() => {
          const caja = document.getElementById(id) as HTMLTextAreaElement | null;
          caja?.focus();
          caja?.setSelectionRange(caja.value.length, caja.value.length);
        });
      }}
    />
  );

  const descripcion = [
    pista && `${id}-pista`,
    avisosAparte && `${id}-datos`,
    `${id}-ia`,
  ]
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
      {/* En móvil, la caja pequeña ocupa su línea y los botones bajan. */}
      <div
        className={cn(grande ? "grid gap-3" : "flex flex-wrap items-end gap-2")}
      >
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
            grande
              ? "min-h-24 px-4 py-3 text-lg md:text-lg"
              : "min-h-11 min-w-0 flex-1 max-sm:basis-full",
          )}
        />
        {!grande && dictar}
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
          {grande && dictar}
        </div>
      </div>
      {pista && (
        <p id={`${id}-pista`} className="text-sm text-(--text-secondary)">
          {pista}
        </p>
      )}
      {!avisosAparte && <AvisoIA t={t} id={id} />}
    </form>
  );
}

// Avisos de la caja principal, uno debajo del otro: datos personales e IA.
// Las ids coinciden con el aria-describedby del Composer con avisosAparte.
export function Avisos({
  t,
  id,
  className,
}: {
  t: TextosFlujo;
  id: string;
  className?: string;
}) {
  return (
    <div className={cn("grid justify-items-start gap-1", className)}>
      <p
        id={`${id}-datos`}
        className="flex items-start gap-1.5 text-sm text-(--text-secondary)"
      >
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0"
          strokeWidth={1.5}
        />
        {t.pista}
      </p>
      <AvisoIA t={t} id={id} />
    </div>
  );
}

// «Usa IA» con el aviso completo en un popover (hover, clic o teclado).
function AvisoIA({ t, id }: { t: TextosFlujo; id: string }) {
  return (
    <p className="flex items-center gap-0.5 text-sm text-(--text-secondary)">
      <span id={`${id}-ia`}>{t.usaIA}</span>
      <Popover>
        <PopoverTrigger
          openOnHover
          aria-label={t.infoIA}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "text-(--text-secondary)",
          )}
        >
          <Info aria-hidden="true" strokeWidth={1.5} />
        </PopoverTrigger>
        <PopoverContent align="start" className="p-3 text-sm">
          {t.avisoIA}
        </PopoverContent>
      </Popover>
    </p>
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
