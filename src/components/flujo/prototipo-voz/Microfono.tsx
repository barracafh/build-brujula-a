"use client";

import { useEffect, useState } from "react";
import { MicIcon, SquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Idioma } from "@/lib/motor/contrato";
import {
  MAX_SEGUNDOS,
  useGrabadora,
  useVozDisponible,
  type Transcripcion,
} from "./useGrabadora";

// PROTOTIPO (ticket 13): tres formas de hablarle a Brújula, por ?voz=A|B|C.
// A · botón junto a Buscar (pulsar para empezar y para parar).
// B · mantener pulsado para hablar (como una nota de voz).
// C · voz primero: botón grande encima de la caja, para solo con el silencio.
// En todas, la transcripción rellena la caja y se envía con «Buscar».

export type VarianteVoz = "A" | "B" | "C";
export const VARIANTES: Record<VarianteVoz, string> = {
  A: "Botón junto a Buscar",
  B: "Mantener pulsado",
  C: "Voz primero, para con el silencio",
};

const textos = {
  es: {
    hablar: "Dictar",
    parar: "Parar",
    mantener: "Mantén pulsado para hablar",
    suelta: "Suelta para terminar",
    tocaHabla: "Toca y habla",
    teEscucho: "Te escucho… para cuando te calles",
    permiso: "Permite el micrófono en el navegador",
    grabando: (s: number) => `Grabando ${reloj(s)} de ${reloj(MAX_SEGUNDOS)}`,
    transcribiendo: "Pasando tu voz a texto…",
    listo: "Listo. Revisa el texto y pulsa Buscar.",
    tope: "Hemos parado al minuto. Revisa el texto o añade lo que falte escribiendo.",
    denegado: "No tenemos permiso para el micrófono. Puedes escribir tu consulta.",
    error: "No hemos podido pasar tu voz a texto. Puedes escribir tu consulta.",
    sinSoporte: "Este navegador no permite dictar. Puedes escribir tu consulta.",
    avisoVoz:
      "Tu voz se envía a ElevenLabs para pasarla a texto. No digas datos personales.",
  },
  va: {
    hablar: "Dictar",
    parar: "Parar",
    mantener: "Mantín premut per a parlar",
    suelta: "Solta per a acabar",
    tocaHabla: "Toca i parla",
    teEscucho: "T'escolte… pare quan calles",
    permiso: "Permet el micròfon en el navegador",
    grabando: (s: number) => `Gravant ${reloj(s)} de ${reloj(MAX_SEGUNDOS)}`,
    transcribiendo: "Passant la teua veu a text…",
    listo: "Fet. Revisa el text i prem Cercar.",
    tope: "Hem parat al minut. Revisa el text o afig el que falte escrivint.",
    denegado: "No tenim permís per al micròfon. Pots escriure la teua consulta.",
    error: "No hem pogut passar la teua veu a text. Pots escriure la teua consulta.",
    sinSoporte: "Este navegador no permet dictar. Pots escriure la teua consulta.",
    avisoVoz:
      "La teua veu s'envia a ElevenLabs per a passar-la a text. No digues dades personals.",
  },
};

function reloj(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Microfono({
  variante,
  grande,
  idioma,
  idCaja,
  alTexto,
  deshabilitado,
}: {
  variante: VarianteVoz;
  grande: boolean;
  idioma: Idioma;
  idCaja: string;
  alTexto: (t: Transcripcion) => void;
  deshabilitado?: boolean;
}) {
  const t = textos[idioma];
  const disponible = useVozDisponible();
  const [listo, setListo] = useState(false);
  const g = useGrabadora((tr) => {
    alTexto(tr);
    setListo(true);
    // El foco vuelve a la caja, con el cursor al final, para revisar.
    const caja = document.getElementById(idCaja) as HTMLTextAreaElement | null;
    requestAnimationFrame(() => {
      caja?.focus();
      caja?.setSelectionRange(caja.value.length, caja.value.length);
    });
  });
  useEffect(() => {
    if (g.estado !== "inactivo") setListo(false);
  }, [g.estado]);

  // Sin clave en el servidor, la voz no aparece.
  if (!disponible) return null;

  const grabando = g.estado === "grabando";
  const ocupado = g.estado === "permiso" || g.estado === "transcribiendo";

  const mensaje =
    g.estado === "permiso"
      ? t.permiso
      : grabando
        ? t.grabando(g.segundos)
        : g.estado === "transcribiendo"
          ? t.transcribiendo
          : g.estado === "denegado"
            ? t.denegado
            : g.estado === "error"
              ? t.error
              : g.estado === "sin_soporte"
                ? t.sinSoporte
                : listo
                  ? g.topeAlcanzado
                    ? t.tope
                    : t.listo
                  : "";

  // El contador cambia cada segundo: solo se anuncia el cambio de estado.
  const anuncio = grabando ? t.grabando(0).split(" ")[0] : mensaje;

  const estadoVisible = mensaje && (
    <p
      className={cn(
        "text-sm",
        g.estado === "denegado" || g.estado === "error"
          ? "text-foreground"
          : "text-(--text-secondary)",
        grabando && "font-mono tabular-nums",
      )}
    >
      {mensaje}
    </p>
  );
  const vivo = (
    <span role="status" className="sr-only">
      {anuncio}
    </span>
  );

  if (variante === "B") {
    const empezar = () => !deshabilitado && !ocupado && g.empezar();
    return (
      <div className="grid gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={deshabilitado || ocupado}
          aria-pressed={grabando}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            empezar();
          }}
          onPointerUp={() => g.parar()}
          onPointerCancel={() => g.cancelar()}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              empezar();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") g.parar();
          }}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            "min-h-11 touch-none select-none",
            grande && "max-md:w-full",
            grabando && "bg-muted",
          )}
        >
          <MicIcon aria-hidden="true" />
          {grabando ? t.suelta : t.mantener}
        </Button>
        {estadoVisible}
        {vivo}
      </div>
    );
  }

  if (variante === "C" && grande) {
    return (
      <div className="grid justify-items-start gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={deshabilitado || ocupado}
          aria-pressed={grabando}
          onClick={() =>
            grabando ? g.parar() : g.empezar({ autoSilencio: true })
          }
          className="h-auto min-h-16 gap-3 rounded-full px-6 text-lg"
        >
          <span
            aria-hidden="true"
            className={cn(
              "grid size-10 place-items-center rounded-full bg-muted",
              grabando && "motion-safe:animate-pulse",
            )}
          >
            {grabando ? <SquareIcon /> : <MicIcon />}
          </span>
          {grabando ? t.teEscucho : t.tocaHabla}
        </Button>
        {estadoVisible}
        <p className="text-sm text-(--text-secondary)">{t.avisoVoz}</p>
        {vivo}
      </div>
    );
  }

  // A, y C en las cajas pequeñas (con parada por silencio).
  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={deshabilitado || ocupado}
        aria-pressed={grabando}
        onClick={() =>
          grabando ? g.parar() : g.empezar({ autoSilencio: variante === "C" })
        }
        className={cn("min-h-11", grande && "max-md:w-full")}
      >
        {grabando ? <SquareIcon aria-hidden="true" /> : <MicIcon aria-hidden="true" />}
        {grabando ? `${t.parar} · ${reloj(g.segundos)}` : t.hablar}
      </Button>
      {(grande || !grabando) && estadoVisible}
      {vivo}
    </div>
  );
}

export const textosVoz = textos;
