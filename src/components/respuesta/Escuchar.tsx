"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, Volume2Icon } from "lucide-react";
import { ruta } from "@/config/sitio";
import audio from "@/datos/audio.json";
import { Button } from "@/components/ui/button";
import type { IdiomaRespuesta, TextosRespuesta } from "./textos";

type Pista = { segundos: number };
const pistas = audio.entradas as Record<
  string,
  Partial<Record<IdiomaRespuesta, Pista>>
>;

// Botón «Escuchar» (ticket 14) con el audio pregenerado del ticket 17. Sin MP3
// en el manifiesto, no aparece. Nada suena solo: el audio no se descarga hasta
// la primera pulsación, y se para al desmontarse (afinar con otra respuesta,
// volver o cambiar de idioma). Sin reproductor nativo y sin adelantar.
export function Escuchar({
  id,
  idioma,
  tx,
}: {
  id: string;
  idioma: IdiomaRespuesta;
  tx: TextosRespuesta;
}) {
  const pista = pistas[id]?.[idioma];
  const refAudio = useRef<HTMLAudioElement | null>(null);
  const [sonando, setSonando] = useState(false);
  const [segundo, setSegundo] = useState(0);
  const [error, setError] = useState(false);

  useEffect(
    () => () => {
      const a = refAudio.current;
      if (!a) return;
      a.pause();
      a.removeAttribute("src");
      a.load();
    },
    [],
  );

  if (!pista) return null;
  const total = pista.segundos;

  function pulsar() {
    let a = refAudio.current;
    if (!a) {
      a = new Audio(ruta(`/audio/${id}.${idioma}.mp3`));
      a.addEventListener("play", () => setSonando(true));
      a.addEventListener("pause", () => setSonando(false));
      a.addEventListener("timeupdate", () =>
        setSegundo(Math.floor(a!.currentTime)),
      );
      a.addEventListener("ended", () => {
        a!.currentTime = 0;
        setSegundo(0);
      });
      a.addEventListener("error", () => {
        setSonando(false);
        setError(true);
      });
      refAudio.current = a;
    }
    setError(false);
    if (a.paused) a.play().catch(() => setError(true));
    else a.pause();
  }

  const empezado = segundo > 0;
  const posicion = `${reloj(segundo)} / ${reloj(total)}`;

  return (
    <div className="mt-5 grid justify-items-start">
      <Button
        type="button"
        variant="outline"
        size="lg"
        aria-pressed={sonando}
        aria-label={
          sonando ? tx.pausarRespuesta : `${tx.escucharRespuesta}, ${duracion(total)}`
        }
        onClick={pulsar}
        className="min-h-11"
      >
        {sonando ? (
          <PauseIcon aria-hidden="true" />
        ) : (
          <Volume2Icon aria-hidden="true" />
        )}
        {sonando ? tx.pausar : tx.escuchar}
        {(sonando || empezado) && (
          <span aria-hidden="true" className="font-mono tabular-nums">
            · {posicion}
          </span>
        )}
      </Button>
      {/* Siempre en el DOM para que el error se anuncie al aparecer. */}
      <span role="status" className="text-sm text-(--text-secondary)">
        {error && <span className="mt-2 block">{tx.audioError}</span>}
      </span>
    </div>
  );
}

function reloj(s: number) {
  const n = Math.round(s);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

// «1 min 35 s»: sirve igual en castellano y en valenciano.
function duracion(s: number) {
  const n = Math.round(s);
  const min = Math.floor(n / 60);
  const seg = n % 60;
  if (min === 0) return `${seg} s`;
  return seg === 0 ? `${min} min` : `${min} min ${seg} s`;
}
