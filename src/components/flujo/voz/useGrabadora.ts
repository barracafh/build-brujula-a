"use client";

import { useEffect, useRef, useState } from "react";
import { ruta } from "@/config/sitio";
import type { Idioma } from "@/lib/motor/contrato";

// Graba con MediaRecorder y transcribe con /api/voz (ticket 13). Se pulsa
// para empezar y para parar; para sola a los 60 s.

export const MAX_SEGUNDOS = 60;

export type EstadoVoz =
  | "inactivo"
  | "permiso"
  | "grabando"
  | "transcribiendo"
  | "denegado"
  | "error"
  | "sin_soporte";

export type Transcripcion = { texto: string; idioma: Idioma | null };

// ¿Hay clave en el servidor? Se pregunta una vez por carga de página.
let disponible: Promise<boolean> | undefined;
export function useVozDisponible() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    disponible ??= fetch(ruta("/api/voz"))
      .then((r) => r.json())
      .then((d: { disponible?: boolean }) => Boolean(d.disponible))
      .catch(() => false);
    let vivo = true;
    disponible.then((v) => vivo && setOk(v));
    return () => {
      vivo = false;
    };
  }, []);
  return ok;
}

export function useGrabadora(alTexto: (t: Transcripcion) => void) {
  const [estado, setEstado] = useState<EstadoVoz>("inactivo");
  const [segundos, setSegundos] = useState(0);
  const [topeAlcanzado, setTope] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const limpiar = useRef<() => void>(() => {});
  const cancelado = useRef(false);
  const alTextoRef = useRef(alTexto);
  useEffect(() => {
    alTextoRef.current = alTexto;
  });

  // Al desmontar (cambia la pantalla) se suelta el micrófono sin transcribir.
  useEffect(
    () => () => {
      cancelado.current = true;
      limpiar.current();
    },
    [],
  );

  async function empezar() {
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
    let r: MediaRecorder;
    try {
      r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setEstado("error");
      return;
    }
    const trozos: Blob[] = [];
    r.ondataavailable = (e) => {
      if (e.data.size) trozos.push(e.data);
    };

    const inicio = Date.now();
    const reloj = setInterval(() => {
      const s = Math.floor((Date.now() - inicio) / 1000);
      setSegundos(s);
      if (s >= MAX_SEGUNDOS) {
        setTope(true);
        parar();
      }
    }, 250);

    limpiar.current = () => {
      clearInterval(reloj);
      stream.getTracks().forEach((t) => t.stop());
      if (rec.current?.state === "recording") rec.current.stop();
      rec.current = null;
    };

    r.onstop = async () => {
      limpiar.current();
      const audio = new Blob(trozos, { type: r.mimeType });
      if (cancelado.current) {
        setEstado("inactivo");
        return;
      }
      // Sin audio (micrófono cortado, por ejemplo): que se vea, no silencio.
      if (audio.size === 0) {
        setEstado("error");
        return;
      }
      setEstado("transcribiendo");
      try {
        const form = new FormData();
        form.set("audio", audio);
        const res = await fetch(ruta("/api/voz"), { method: "POST", body: form });
        if (!res.ok) throw new Error(String(res.status));
        const d = (await res.json()) as Transcripcion;
        if (!d.texto) throw new Error("Sin texto"); // no se ha oído nada
        setEstado("inactivo");
        alTextoRef.current(d);
      } catch {
        setEstado("error");
      }
    };

    cancelado.current = false;
    rec.current = r;
    try {
      r.start();
    } catch {
      // Chrome puede dejarlo en "recording" tras lanzar: sin onstop, que
      // pisaría el error al limpiar.
      r.onstop = null;
      limpiar.current();
      setEstado("error");
      return;
    }
    setSegundos(0);
    setEstado("grabando");
  }

  function parar() {
    if (rec.current?.state === "recording") rec.current.stop();
  }

  return { estado, segundos, topeAlcanzado, empezar, parar };
}
