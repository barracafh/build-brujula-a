"use client";

import { useState } from "react";
import { MicIcon, SquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TextosFlujo } from "../textos";
import {
  useGrabadora,
  useVozDisponible,
  type EstadoVoz,
  type Transcripcion,
} from "./useGrabadora";

// Botón «Dictar» (ticket 13, variante A): se pulsa para empezar y otra vez
// para parar. La transcripción la recibe la caja con `alTexto`; nunca se
// envía sola. Sin ELEVENLABS_API_KEY en el servidor, no aparece.
export function Dictar({
  t,
  grande,
  deshabilitado,
  alTexto,
}: {
  t: TextosFlujo;
  grande: boolean;
  deshabilitado: boolean;
  alTexto: (tr: Transcripcion) => void;
}) {
  const v = t.voz;
  const disponible = useVozDisponible();
  const [listo, setListo] = useState(false);
  const g = useGrabadora((tr) => {
    setListo(true);
    alTexto(tr);
  });

  if (!disponible) return null;

  const grabando = g.estado === "grabando";
  const ocupado = g.estado === "permiso" || g.estado === "transcribiendo";
  const mensajes: Record<EstadoVoz, string> = {
    inactivo: listo ? (g.topeAlcanzado ? v.tope : v.listo) : "",
    permiso: v.permiso,
    grabando: `${v.grabando} ${reloj(g.segundos)}`,
    transcribiendo: v.transcribiendo,
    denegado: v.denegado,
    error: v.error,
    sin_soporte: v.sinSoporte,
  };
  const mensaje = mensajes[g.estado];
  // El contador cambia cada segundo: solo se anuncia el cambio de estado.
  const anuncio = grabando ? v.grabando : mensaje;

  return (
    <div className={cn("grid gap-2", grande && "max-md:w-full")}>
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={deshabilitado || ocupado}
        aria-pressed={grabando}
        onClick={() => {
          setListo(false);
          if (grabando) g.parar();
          else g.empezar();
        }}
        className={cn("min-h-11", grande && "max-md:w-full")}
      >
        {grabando ? (
          <SquareIcon aria-hidden="true" />
        ) : (
          <MicIcon aria-hidden="true" />
        )}
        {grabando ? `${v.parar} · ${reloj(g.segundos)}` : v.dictar}
      </Button>
      {mensaje && (grande || !grabando) && (
        <p
          aria-hidden="true"
          className={cn(
            "text-sm text-(--text-secondary)",
            grabando && "font-mono tabular-nums",
          )}
        >
          {mensaje}
        </p>
      )}
      <span role="status" className="sr-only">
        {anuncio}
      </span>
    </div>
  );
}

function reloj(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
