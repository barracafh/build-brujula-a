"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ruta } from "@/config/sitio";
import type { Idioma } from "@/lib/motor/contrato";

// PROTOTIPO (ticket 13): graba con MediaRecorder y transcribe con /api/voz.
// Para sola a los 60 s; en modo "silencio", también tras 1,5 s callado.

export const MAX_SEGUNDOS = 60;
const SILENCIO_MS = 1500;
const SIN_VOZ_MS = 8000;
const UMBRAL_RMS = 0.02;

export type EstadoVoz =
  | "inactivo"
  | "permiso"
  | "grabando"
  | "transcribiendo"
  | "denegado"
  | "error"
  | "sin_soporte";

export type Transcripcion = {
  texto: string;
  idioma: Idioma | null;
  codigo: string | null;
  probabilidad: number | null;
  ms: number;
};

// Estado visible en el panel de depuración del prototipo.
type Depuracion = {
  estado: EstadoVoz;
  segundos: number;
  bytes?: number;
  mime?: string;
  motivoParada?: string;
  transcripcion?: Transcripcion;
  latenciaTotalMs?: number;
  error?: string;
};
let depuracion: Depuracion = { estado: "inactivo", segundos: 0 };
const oyentes = new Set<() => void>();
function depurar(cambio: Partial<Depuracion>) {
  depuracion = { ...depuracion, ...cambio };
  oyentes.forEach((o) => o());
}
export const useDepuracion = () =>
  useSyncExternalStore(
    (o) => (oyentes.add(o), () => oyentes.delete(o)),
    () => depuracion,
    () => depuracion,
  );

// ¿Hay clave en el servidor? Se pregunta una vez por carga de página.
let disponible: Promise<boolean> | undefined;
export function useVozDisponible() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    disponible ??= fetch(ruta("/api/voz"))
      .then((r) => r.json())
      .then((d: { disponible?: boolean }) => Boolean(d.disponible))
      .catch(() => false);
    disponible.then(setOk);
  }, []);
  return ok;
}

export function useGrabadora(alTexto: (t: Transcripcion) => void) {
  const [estado, setEstadoLocal] = useState<EstadoVoz>("inactivo");
  const [segundos, setSegundos] = useState(0);
  const [topeAlcanzado, setTope] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const limpiar = useRef<() => void>(() => {});
  const motivo = useRef("manual");
  const alTextoRef = useRef(alTexto);
  alTextoRef.current = alTexto;

  const setEstado = (e: EstadoVoz) => {
    setEstadoLocal(e);
    depurar({ estado: e });
  };

  useEffect(() => () => limpiar.current(), []);

  async function empezar({ autoSilencio = false } = {}) {
    if (rec.current) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices) {
      setEstado("sin_soporte");
      return;
    }
    setTope(false);
    setEstado("permiso");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setEstado("denegado");
      return;
    }
    const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
      (m) => MediaRecorder.isTypeSupported(m),
    );
    const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const trozos: Blob[] = [];
    r.ondataavailable = (e) => e.data.size && trozos.push(e.data);

    const inicio = Date.now();
    const reloj = setInterval(() => {
      const s = Math.floor((Date.now() - inicio) / 1000);
      setSegundos(s);
      depurar({ segundos: s });
      if (s >= MAX_SEGUNDOS) {
        setTope(true);
        parar("tope 60 s");
      }
    }, 250);

    // Detección de silencio con un AnalyserNode (solo modo "silencio").
    let ctx: AudioContext | undefined;
    let vigia: ReturnType<typeof setInterval> | undefined;
    if (autoSilencio) {
      ctx = new AudioContext();
      const analizador = ctx.createAnalyser();
      analizador.fftSize = 2048;
      ctx.createMediaStreamSource(stream).connect(analizador);
      const buf = new Float32Array(analizador.fftSize);
      let habló = false;
      let ultimaVoz = Date.now();
      vigia = setInterval(() => {
        analizador.getFloatTimeDomainData(buf);
        const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length);
        if (rms > UMBRAL_RMS) {
          habló = true;
          ultimaVoz = Date.now();
        } else if (habló && Date.now() - ultimaVoz > SILENCIO_MS) {
          parar("silencio");
        } else if (!habló && Date.now() - inicio > SIN_VOZ_MS) {
          parar("sin voz");
        }
      }, 100);
    }

    limpiar.current = () => {
      clearInterval(reloj);
      if (vigia) clearInterval(vigia);
      ctx?.close();
      stream.getTracks().forEach((t) => t.stop());
      if (rec.current?.state === "recording") rec.current.stop();
      rec.current = null;
    };

    r.onstop = async () => {
      limpiar.current();
      const audio = new Blob(trozos, { type: r.mimeType });
      depurar({ bytes: audio.size, mime: r.mimeType, motivoParada: motivo.current });
      if (motivo.current === "cancelado" || audio.size === 0) {
        setEstado("inactivo");
        return;
      }
      setEstado("transcribiendo");
      const t0 = Date.now();
      try {
        const form = new FormData();
        form.set("audio", audio);
        const res = await fetch(ruta("/api/voz"), { method: "POST", body: form });
        const d = await res.json();
        if (!res.ok) throw new Error(`${res.status} ${d.tipo ?? d.error ?? ""}`);
        depurar({ transcripcion: d, latenciaTotalMs: Date.now() - t0, error: undefined });
        setEstado("inactivo");
        if (d.texto) alTextoRef.current(d);
      } catch (e) {
        depurar({ error: String(e) });
        setEstado("error");
      }
    };

    motivo.current = "manual";
    rec.current = r;
    r.start();
    setSegundos(0);
    depurar({ segundos: 0, transcripcion: undefined, error: undefined });
    setEstado("grabando");
  }

  function parar(porque = "manual") {
    if (rec.current?.state !== "recording") return;
    motivo.current = porque;
    rec.current.stop();
  }

  return {
    estado,
    segundos,
    topeAlcanzado,
    empezar,
    parar,
    cancelar: () => parar("cancelado"),
  };
}
