"use client";

import { useRef, useState } from "react";
import { ruta } from "@/config/sitio";
import type { RespuestaConsulta } from "@/lib/consulta";
import type { Entrada, Resumen } from "@/lib/entrada";
import { MAX_TURNOS, type Idioma, type Turno } from "@/lib/motor/contrato";
import { textosFlujo } from "./textos";

// Estado del flujo por pantallas (ticket 02): cada resultado sustituye la
// pantalla, salvo afinar sin cambio, que la mantiene y lo anuncia (ticket 09).
// El historial vive solo aquí, en el navegador, y se manda en cada petición.

export type Candidata = Resumen & { confianza: "alta" | "media" };

export type Pantalla =
  | { tipo: "inicio" }
  | { tipo: "aclaracion"; texto: string; candidatas: Candidata[]; ronda: number }
  | { tipo: "cierre"; candidatas: Candidata[] }
  | { tipo: "respuesta"; entrada: Entrada }
  | { tipo: "sin_coincidencia"; texto: string }
  | { tipo: "error" };

type Estado = {
  pantalla: Pantalla;
  vez: number; // sube con cada sustitución: foco al h1 y arriba
  historial: Turno[];
  respuesta: Entrada | null; // la última, para «Volver a» desde una aclaración
  consulta: string; // lo último que escribió el ciudadano, para «Tu consulta»
  idioma: Idioma;
  idiomaManual: boolean;
  anuncio: string; // región role="status"
};

const INICIAL: Estado = {
  pantalla: { tipo: "inicio" },
  vez: 0,
  historial: [],
  respuesta: null,
  consulta: "",
  idioma: "es",
  idiomaManual: false,
  anuncio: "",
};

const MAX_RONDAS = 2;

export function useConversacion() {
  const [estado, setEstado] = useState<Estado>(INICIAL);
  const [pensando, setPensando] = useState(false);
  const [borrador, setBorrador] = useState(""); // se conserva si la IA falla
  const enCurso = useRef<AbortController | null>(null);
  const reintento = useRef<(() => void) | null>(null);

  const sustituir = (e: Estado, pantalla: Pantalla): Estado => ({
    ...e,
    pantalla,
    vez: e.vez + 1,
    anuncio: "",
  });

  // Ejecuta una petición con cerrojo: no hay dos a la vez.
  async function pedir<T>(
    hacer: (senal: AbortSignal) => Promise<T>,
    aplicar: (r: T) => void,
    alFallar: () => void,
  ) {
    if (enCurso.current) return;
    const control = new AbortController();
    enCurso.current = control;
    setPensando(true);
    setEstado((e) => ({ ...e, anuncio: textosFlujo[e.idioma].pensando }));
    try {
      aplicar(await hacer(control.signal));
    } catch {
      if (control.signal.aborted) return;
      alFallar();
    } finally {
      if (enCurso.current === control) {
        enCurso.current = null;
        setPensando(false);
      }
    }
  }

  function aplicarResultado(r: RespuestaConsulta) {
    setEstado((prev) => {
      const e = prev.idiomaManual ? prev : { ...prev, idioma: r.idioma };
      const tx = textosFlujo[e.idioma];
      const decir = (texto: string): Turno[] => [
        ...e.historial,
        { rol: "asistente", texto },
      ];
      const viendoRespuesta = e.pantalla.tipo === "respuesta" && e.respuesta;

      if (r.tipo === "contestacion") {
        // TODO(frontend): chat de la ficha (docs/CHAT.md). Esta pantalla no
        // manda `entradaAbierta`, así que hoy no llega aquí.
        return { ...e, historial: decir(r.texto), anuncio: r.texto };
      }

      if (r.tipo === "respuesta") {
        // Afinar que confirma la misma entrada: no se sustituye nada.
        if (viendoRespuesta && e.respuesta?.id === r.entrada.id) {
          const texto = tx.sigueSiendo(r.entrada.titulo);
          return { ...e, historial: decir(texto), anuncio: texto };
        }
        return {
          ...sustituir(e, { tipo: "respuesta", entrada: r.entrada }),
          historial: decir(tx.esEsta(r.entrada.titulo)),
          respuesta: r.entrada,
        };
      }

      if (r.tipo === "sin_coincidencia") {
        // Afinar sin coincidencia nueva mantiene la respuesta que había.
        if (viendoRespuesta && e.respuesta) {
          const texto = tx.sigueSiendo(e.respuesta.titulo);
          return { ...e, historial: decir(texto), anuncio: texto };
        }
        return {
          ...sustituir(e, { tipo: "sin_coincidencia", texto: r.texto }),
          historial: decir(r.texto),
        };
      }

      const ronda =
        e.pantalla.tipo === "aclaracion" ? e.pantalla.ronda + 1 : 1;
      if (ronda > MAX_RONDAS)
        return {
          ...sustituir(e, { tipo: "cierre", candidatas: r.candidatas }),
          historial: decir(tx.cierre),
        };
      return {
        ...sustituir(e, {
          tipo: "aclaracion",
          texto: r.texto,
          candidatas: r.candidatas,
          ronda,
        }),
        historial: decir(r.texto),
      };
    });
  }

  function fallar() {
    setEstado((e) => sustituir(e, { tipo: "error" }));
  }

  function enviar(texto: string) {
    const limpio = texto.trim();
    if (!limpio || enCurso.current) return;
    const historial = [
      ...estado.historial,
      { rol: "ciudadano", texto: limpio } satisfies Turno,
    ].slice(-MAX_TURNOS);
    setBorrador(limpio);
    reintento.current = () => enviar(limpio);
    pedir(
      async (senal) => {
        const res = await fetch(ruta("/api/consulta"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ historial }),
          signal: senal,
        });
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as RespuestaConsulta;
      },
      (r) => {
        setBorrador("");
        setEstado((e) => ({ ...e, historial, consulta: limpio }));
        aplicarResultado(r);
      },
      fallar,
    );
  }

  // Abrir una candidata no llama al motor: solo trae la entrada.
  function elegir(c: Resumen) {
    reintento.current = () => elegir(c);
    pedir(
      async (senal) => {
        const res = await fetch(ruta(`/api/entradas/${c.id}`), {
          signal: senal,
        });
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as Entrada;
      },
      (entrada) =>
        setEstado((e) => ({
          ...sustituir(e, { tipo: "respuesta", entrada }),
          historial: [
            ...e.historial,
            { rol: "ciudadano" as const, texto: c.titulo },
            {
              rol: "asistente" as const,
              texto: textosFlujo[e.idioma].esEsta(c.titulo),
            },
          ].slice(-MAX_TURNOS),
          respuesta: entrada,
        })),
      fallar,
    );
  }

  // Desde una aclaración surgida al afinar: recupera la respuesta sin
  // reclasificar.
  function volver() {
    setEstado((e) =>
      e.respuesta
        ? sustituir(e, { tipo: "respuesta", entrada: e.respuesta })
        : e,
    );
  }

  function reiniciar() {
    enCurso.current?.abort();
    enCurso.current = null;
    setPensando(false);
    setBorrador("");
    setEstado((e) => ({
      ...sustituir(INICIAL, { tipo: "inicio" }),
      vez: e.vez + 1,
      idioma: e.idioma,
      idiomaManual: e.idiomaManual,
    }));
  }

  return {
    ...estado,
    pensando,
    borrador,
    enviar,
    elegir,
    volver,
    reiniciar,
    reintentar: () => reintento.current?.(),
    cambiarIdioma: (idioma: Idioma) =>
      setEstado((e) => ({ ...e, idioma, idiomaManual: true })),
  };
}

export type Conversacion = ReturnType<typeof useConversacion>;
