"use client";

import { useRef, useState } from "react";
import { ruta } from "@/config/sitio";
import type { RespuestaConsulta } from "@/lib/consulta";
import type { EntradaConTraduccion, Fuente, Resumen } from "@/lib/entrada";
import { MAX_TURNOS, type Idioma, type Turno } from "@/lib/motor/contrato";
import { textosFlujo } from "./textos";

// Estado del flujo por pantallas (ticket 02): cada resultado sustituye la
// pantalla, salvo afinar sin cambio, que la mantiene y lo anuncia (ticket 09).
// El historial vive solo aquí, en el navegador, y se manda en cada petición.

export type Candidata = Resumen & { confianza: "alta" | "media" };

// Un turno del chat de la ficha lleva además sus fuentes y las otras fichas
// que nombra. Solo se muestran: al servidor se manda `rol` y `texto`.
// `pendiente`: la respuesta se está escribiendo; `error`: no llegó (no se
// manda en el historial).
export type TurnoChat = Turno & {
  fuentes?: Fuente[];
  candidatas?: Candidata[];
  pendiente?: boolean;
  error?: boolean;
};

export type Pantalla =
  | { tipo: "inicio" }
  | { tipo: "aclaracion"; texto: string; candidatas: Candidata[]; ronda: number }
  | { tipo: "cierre"; candidatas: Candidata[] }
  | { tipo: "respuesta"; entrada: EntradaConTraduccion }
  | { tipo: "sin_coincidencia"; texto: string }
  | { tipo: "error" };

type Estado = {
  pantalla: Pantalla;
  vez: number; // sube con cada sustitución: foco al h1 y arriba
  historial: TurnoChat[];
  respuesta: EntradaConTraduccion | null; // la última, para «Volver a» desde una aclaración
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
  const [charlando, setCharlando] = useState(false); // chat de la ficha en curso
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
      const decir = (texto: string): TurnoChat[] => [
        ...e.historial,
        { rol: "asistente", texto },
      ];
      const viendoRespuesta = e.pantalla.tipo === "respuesta" && e.respuesta;

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
    const historial: TurnoChat[] = [
      ...estado.historial.filter((t) => !t.error),
      { rol: "ciudadano", texto: limpio } satisfies Turno,
    ].slice(-MAX_TURNOS);
    // Con una ficha en pantalla, la pregunta va al chat de esa ficha.
    if (estado.pantalla.tipo === "respuesta")
      return charlar(historial, estado.pantalla.entrada.id);
    setBorrador(limpio);
    reintento.current = () => enviar(limpio);
    pedir(
      async (senal) => {
        const res = await fetch(ruta("/api/consulta"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            historial: historial.map(({ rol, texto }) => ({ rol, texto })),
          }),
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

  // Chat de la ficha (docs/CHAT.md): la pregunta y «Pensando…» aparecen ya
  // en el chat, y la respuesta se va escribiendo según llega. No apaga la
  // pantalla: la ficha sigue usable mientras tanto.
  async function charlar(historial: TurnoChat[], entradaAbierta: string) {
    const control = new AbortController();
    enCurso.current = control;
    setCharlando(true);
    const ultimo = (cambio: (t: TurnoChat) => TurnoChat) =>
      setEstado((e) => ({
        ...e,
        historial: [...e.historial.slice(0, -1), cambio(e.historial.at(-1)!)],
      }));
    setEstado((e) => ({
      ...e,
      historial: [...historial, { rol: "asistente", texto: "", pendiente: true }],
      anuncio: textosFlujo[e.idioma].pensando,
    }));
    try {
      const res = await fetch(ruta("/api/consulta"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          historial: historial.map(({ rol, texto }) => ({ rol, texto })),
          entradaAbierta,
          enVivo: true,
        }),
        signal: control.signal,
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const fin: { respuesta?: RespuestaConsulta } = {};
      await leerLineas(res.body, (ev) => {
        if (typeof ev.texto === "string")
          ultimo((t) => ({ ...t, texto: t.texto + ev.texto }));
        else if (ev.descartar) ultimo((t) => ({ ...t, texto: "" }));
        else if (ev.respuesta) fin.respuesta = ev.respuesta as RespuestaConsulta;
      });
      const r = fin.respuesta;
      if (r?.tipo !== "contestacion") throw new Error("sin respuesta");
      setEstado((e) => ({
        ...(e.idiomaManual ? e : { ...e, idioma: r.idioma }),
        historial: [
          ...e.historial.slice(0, -1),
          {
            rol: "asistente",
            texto: r.texto,
            fuentes: r.fuentes,
            candidatas: r.candidatas,
          },
        ],
        anuncio: r.texto,
      }));
    } catch {
      if (control.signal.aborted) return;
      setEstado((e) => {
        const texto = textosFlujo[e.idioma].errorChat;
        return {
          ...e,
          historial: [
            ...e.historial.slice(0, -1),
            { rol: "asistente", texto, error: true },
          ],
          anuncio: texto,
        };
      });
    } finally {
      if (enCurso.current === control) {
        enCurso.current = null;
        setCharlando(false);
      }
    }
  }

  // Abrir una candidata no llama al motor: solo trae la entrada. Desde los
  // trámites recientes no hay consulta escrita: «Tu consulta» es el título.
  function elegir(c: Resumen) {
    reintento.current = () => elegir(c);
    pedir(
      async (senal) => {
        const res = await fetch(ruta(`/api/entradas/${c.id}`), {
          signal: senal,
        });
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as EntradaConTraduccion;
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
          consulta: e.consulta || c.titulo,
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
    setCharlando(false);
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
    charlando,
    ocupado: pensando || charlando,
    borrador,
    enviar,
    elegir,
    volver,
    reiniciar,
    reintentar: () => reintento.current?.(),
    cambiarIdioma: (idioma: Idioma) =>
      setEstado((e) => ({ ...e, idioma, idiomaManual: true })),
    // El idioma que detecta el dictado (ticket 13) solo manda si el
    // ciudadano no lo ha elegido a mano.
    idiomaDetectado: (idioma: Idioma) =>
      setEstado((e) => (e.idiomaManual ? e : { ...e, idioma })),
  };
}

export type Conversacion = ReturnType<typeof useConversacion>;

// Lee una respuesta NDJSON: un objeto JSON por línea.
async function leerLineas(
  cuerpo: ReadableStream<Uint8Array>,
  alEvento: (ev: Record<string, unknown>) => void,
) {
  const lector = cuerpo.getReader();
  const decodificar = new TextDecoder();
  let resto = "";
  for (;;) {
    const { value, done } = await lector.read();
    if (done) break;
    const lineas = (resto + decodificar.decode(value, { stream: true })).split(
      "\n",
    );
    resto = lineas.pop() ?? "";
    for (const linea of lineas) if (linea.trim()) alEvento(JSON.parse(linea));
  }
  if (resto.trim()) alEvento(JSON.parse(resto));
}
