"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Fuentes } from "@/components/Fuentes";
import { RespuestaCompuesta } from "@/components/respuesta/RespuestaCompuesta";
import type { Entrada, Resumen } from "@/lib/entrada";
import {
  Avisos,
  BotonesCandidatas,
  Composer,
  EnlacePag,
  SelectorIdioma,
  TuConsulta,
  titular,
} from "./piezas";
import { EJEMPLOS, PAG, lang, textosFlujo, type TextosFlujo } from "./textos";
import { Aviso } from "./Aviso";
import { useAceptacion } from "./useAceptacion";
import { useConversacion, type Conversacion } from "./useConversacion";
import { borrarRecientes, recordar, useRecientes } from "./useRecientes";

// Flujo por pantallas (ticket 02, variante B) con la accesibilidad del ticket
// 09: cada pantalla nueva entra con un fundido, el foco va a su h1 y la página
// vuelve arriba; mientras piensa, la pantalla anterior queda inert.
// Antes de todo va el aviso del primer uso (tickets 08 y 15); el enlace
// «Privacidad» del pie (#privacidad) lo reabre para retirar la aceptación.
// Cada respuesta abierta se apunta en los trámites recientes del inicio.
export function Flujo() {
  const c = useConversacion();
  const t = textosFlujo[c.idioma];
  const refTitular = useRef<HTMLHeadingElement>(null);
  const { aceptado, aceptar, retirar } = useAceptacion();
  const recientes = useRecientes();
  const [revisando, setRevisando] = useState(false);
  const [cambioAviso, setCambioAviso] = useState(0);
  const [anuncioAviso, setAnuncioAviso] = useState("");

  useEffect(() => {
    if (c.vez === 0 && cambioAviso === 0) return;
    refTitular.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [c.vez, cambioAviso]);

  useEffect(() => {
    if (c.pantalla.tipo === "respuesta") recordar(c.pantalla.entrada);
  }, [c.pantalla]);

  useEffect(() => {
    const abrir = () => {
      if (window.location.hash !== "#privacidad") return;
      setRevisando(true);
      setAnuncioAviso("");
    };
    abrir();
    window.addEventListener("hashchange", abrir);
    return () => window.removeEventListener("hashchange", abrir);
  }, []);

  function cerrarAviso() {
    setRevisando(false);
    setCambioAviso((n) => n + 1);
    if (window.location.hash === "#privacidad")
      history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  function retirarAceptacion() {
    retirar();
    borrarRecientes();
    c.reiniciar();
    setRevisando(false);
    setAnuncioAviso(t.aviso.retirada);
    if (window.location.hash === "#privacidad")
      history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  const { pantalla, consulta } = c;

  return (
    <div lang={lang(c.idioma)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {pantalla.tipo !== "inicio" ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={c.reiniciar}
            className="min-h-11"
          >
            ← {t.nueva}
          </Button>
        ) : (
          <span />
        )}
        <SelectorIdioma c={c} t={t} />
      </div>

      {/* Siempre en el DOM: anuncia «Pensando…» y afinar sin cambio. */}
      <div role="status" className="sr-only">
        {c.anuncio}
      </div>

      <Aviso
        t={t}
        lang={lang(c.idioma)}
        abierto={aceptado === false || (aceptado === true && revisando)}
        aceptado={aceptado === true}
        anuncio={anuncioAviso}
        selectorIdioma={<SelectorIdioma c={c} t={t} />}
        onAceptar={() => {
          aceptar();
          setAnuncioAviso("");
          cerrarAviso();
        }}
        onVolver={cerrarAviso}
        onRetirar={retirarAceptacion}
      />
      {c.pensando && (
        <p
          aria-hidden="true"
          className="sticky top-2 z-40 mt-6 rounded-xl bg-muted px-4 py-3 text-base shadow-[0_8px_24px_rgb(0_0_0/0.08)] motion-safe:animate-pulse"
        >
          {t.pensando}
        </p>
      )}

      <div
        inert={c.pensando}
        className={cn(
          "transition-opacity duration-200 motion-reduce:transition-none",
          c.pensando && "opacity-50",
        )}
      >
        <div
          key={c.vez}
          className="transition-opacity duration-300 ease-(--ease-brand) motion-reduce:transition-none starting:opacity-0"
        >
          {pantalla.tipo === "inicio" && (
            <Inicio
              c={c}
              t={t}
              refTitular={refTitular}
              recientes={recientes}
            />
          )}

          {pantalla.tipo === "aclaracion" && (
            <section className="mt-8 grid gap-6">
              {c.respuesta && <VolverA c={c} t={t} entrada={c.respuesta} />}
              <TuConsulta t={t} texto={consulta} />
              <p className="font-mono text-sm tracking-[0.06em] text-(--text-secondary) uppercase">
                {t.ronda(pantalla.ronda)}
              </p>
              {/* Texto redactado con IA o de plantilla (AI Act, art. 50.2). */}
              <h1
                ref={refTitular}
                tabIndex={-1}
                data-generado-con-ia=""
                className={titular}
              >
                {pantalla.texto}
              </h1>
              <BotonesCandidatas c={c} t={t} candidatas={pantalla.candidatas} />
              <Ninguna c={c} t={t} />
            </section>
          )}

          {pantalla.tipo === "cierre" && (
            <section className="mt-8 grid gap-6">
              <TuConsulta t={t} texto={consulta} />
              <h1 ref={refTitular} tabIndex={-1} className={titular}>
                {t.cierre}
              </h1>
              <BotonesCandidatas c={c} t={t} candidatas={pantalla.candidatas} />
              <EnlacePag t={t} principal />
            </section>
          )}

          {pantalla.tipo === "respuesta" && (
            <>
              <BarraAfinar c={c} t={t} consulta={consulta} />
              <div className="mt-10">
                <RespuestaCompuesta
                  entrada={pantalla.entrada}
                  idioma={c.idioma}
                  refTitular={refTitular}
                />
              </div>
            </>
          )}

          {pantalla.tipo === "sin_coincidencia" && (
            <section className="mt-8 grid gap-6">
              <TuConsulta t={t} texto={consulta} />
              <h1 ref={refTitular} tabIndex={-1} className={titular}>
                {t.fueraTitulo}
              </h1>
              <p className="text-lg">{pantalla.texto}</p>
              <EnlacePag t={t} principal />
              <Composer
                c={c}
                t={t}
                id="otra-forma"
                etiqueta={t.afinar}
                pista={t.afinarPista}
                className="mt-4"
              />
              <Fuentes
                fuentes={[{ nombre: "Punto de Acceso General", url: PAG }]}
              />
            </section>
          )}

          {pantalla.tipo === "error" && (
            <section className="mt-8 grid gap-6">
              <h1 ref={refTitular} tabIndex={-1} className={titular}>
                {t.errorTitulo}
              </h1>
              <p className="text-lg">{t.errorTexto}</p>
              <TuConsulta t={t} texto={c.borrador} />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="sunset"
                  size="lg"
                  onClick={c.reintentar}
                  className="min-h-11 max-md:w-full"
                >
                  {t.reintentar}
                </Button>
                <EnlacePag t={t} principal={false} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Inicio({
  c,
  t,
  refTitular,
  recientes,
}: {
  c: Conversacion;
  t: TextosFlujo;
  refTitular: Ref<HTMLHeadingElement>;
  recientes: Resumen[];
}) {
  return (
    <>
      <h1
        ref={refTitular}
        tabIndex={-1}
        className="mt-6 rounded-md text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em] outline-none"
      >
        {t.titular}
      </h1>
      <p className="mt-6 text-lg text-(--text-secondary)">{t.entradilla}</p>
      <Composer
        c={c}
        t={t}
        id="consulta"
        etiqueta={t.etiqueta}
        grande
        principal
        avisosAparte
        className="mt-10"
      />
      {/* Sin título visible: «O prueba con un ejemplo» queda para lectores de pantalla. */}
      <ul aria-label={t.ejemplos} className="mt-6 flex flex-wrap gap-2">
        {EJEMPLOS.map((ejemplo) => (
          <li key={ejemplo}>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => c.enviar(ejemplo)}
              className="h-auto min-h-11 whitespace-normal"
            >
              {ejemplo}
            </Button>
          </li>
        ))}
      </ul>
      <Avisos t={t} id="consulta" className="mt-6" />
      <Recientes c={c} t={t} recientes={recientes} />
    </>
  );
}

// Trámites abiertos antes en este navegador (useRecientes). Abrir uno no
// llama al motor: trae la entrada como una candidata elegida. Al borrar, el
// foco pasa al aviso de borrado para no perderse con el botón.
function Recientes({
  c,
  t,
  recientes,
}: {
  c: Conversacion;
  t: TextosFlujo;
  recientes: Resumen[];
}) {
  const [borrado, setBorrado] = useState(false);
  const refAviso = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (borrado) refAviso.current?.focus();
  }, [borrado]);

  if (recientes.length === 0)
    return borrado ? (
      <p
        ref={refAviso}
        tabIndex={-1}
        className="mt-12 rounded-md text-base text-(--text-secondary) outline-none"
      >
        {t.recientesBorrados}
      </p>
    ) : null;

  return (
    <section aria-labelledby="recientes-titulo" className="mt-12 grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="recientes-titulo"
          className="font-mono text-sm tracking-[0.06em] text-(--text-secondary) uppercase"
        >
          {t.recientes}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => {
            borrarRecientes();
            setBorrado(true);
          }}
          className="min-h-11"
        >
          {t.borrarRecientes}
        </Button>
      </div>
      <ul className="grid gap-2">
        {recientes.map((r) => (
          <li key={r.id}>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => c.elegir(r)}
              className="h-auto min-h-11 w-full flex-col items-start justify-start gap-1 px-4 py-3 text-left whitespace-normal"
            >
              <Badge variant="outline">
                {r.tipo === "ayuda" ? t.tipoAyuda : t.tipoTramite}
              </Badge>
              <span lang="es" className="text-base font-medium">
                {r.titulo}
              </span>
              <span lang="es" className="text-sm text-(--text-secondary)">
                {r.organismo}
              </span>
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-sm text-(--text-secondary)">{t.recientesPista}</p>
    </section>
  );
}

function VolverA({
  c,
  t,
  entrada,
}: {
  c: Conversacion;
  t: TextosFlujo;
  entrada: Entrada;
}) {
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={c.volver}
        className="h-auto min-h-11 justify-start py-2 text-left whitespace-normal"
      >
        ← {t.volverA}: <span lang="es">{entrada.titulo}</span>
      </Button>
    </div>
  );
}

function Ninguna({ c, t }: { c: Conversacion; t: TextosFlujo }) {
  const [abierta, setAbierta] = useState(false);
  const refCaja = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (abierta) refCaja.current?.focus();
  }, [abierta]);

  if (abierta)
    return (
      <Composer
        c={c}
        t={t}
        id="aclarar"
        etiqueta={t.afinar}
        pista={t.afinarPista}
        refCaja={refCaja}
      />
    );
  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={() => setAbierta(true)}
        className="min-h-11"
      >
        {t.ninguna}
      </Button>
    </div>
  );
}

// Barra fija sobre la respuesta: despliega el historial y una caja para
// afinar. Al abrirla, foco en la caja; al cerrarla, vuelve al botón.
function BarraAfinar({
  c,
  t,
  consulta,
}: {
  c: Conversacion;
  t: TextosFlujo;
  consulta?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const refBoton = useRef<HTMLButtonElement>(null);
  const refCaja = useRef<HTMLTextAreaElement>(null);
  const yaAbierta = useRef(false);

  useEffect(() => {
    if (abierta) refCaja.current?.focus();
    else if (yaAbierta.current) refBoton.current?.focus();
    yaAbierta.current ||= abierta;
  }, [abierta]);

  // Mientras piensa la barra queda inert y pierde el foco. Si la respuesta no
  // cambia, la pantalla sigue montada y el foco vuelve a la caja.
  const pensaba = useRef(false);
  useEffect(() => {
    if (pensaba.current && !c.pensando && abierta) refCaja.current?.focus();
    pensaba.current = c.pensando;
  }, [c.pensando, abierta]);

  return (
    <section
      aria-label={t.preguntar}
      className="sticky top-2 z-30 mt-6 rounded-xl bg-background px-4 py-3 shadow-[0_8px_24px_rgb(0_0_0/0.08)] ring-1 ring-foreground/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm text-(--text-secondary)">
          {t.tuConsulta}: <q className="text-foreground">{consulta}</q>
        </p>
        <Button
          ref={refBoton}
          type="button"
          variant="outline"
          size="lg"
          aria-expanded={abierta}
          aria-controls="afinar-panel"
          onClick={() => setAbierta((a) => !a)}
          className="min-h-11"
        >
          {abierta ? t.ocultar : t.preguntar}
        </Button>
      </div>
      {abierta && (
        <div id="afinar-panel" className="mt-3 grid gap-3">
          <h2 className="sr-only">{t.conversacion}</h2>
          <ol className="grid max-h-[40dvh] gap-3 overflow-y-auto">
            {c.historial.map((turno, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-xl px-4 py-3 text-base [overflow-wrap:anywhere]",
                  turno.rol === "ciudadano"
                    ? "ml-8 justify-self-end bg-muted"
                    : "mr-4 grid gap-4 ring-1 ring-foreground/10",
                )}
              >
                {/* Las respuestas del chat las redacta una IA (AI Act, art. 50.2). */}
                <p
                  className="whitespace-pre-line"
                  data-generado-con-ia={turno.fuentes ? "" : undefined}
                >
                  {turno.texto}
                </p>
                {!!turno.candidatas?.length && (
                  <BotonesCandidatas c={c} t={t} candidatas={turno.candidatas} />
                )}
                {!!turno.fuentes?.length && <Fuentes fuentes={turno.fuentes} />}
              </li>
            ))}
          </ol>
          <Composer
            c={c}
            t={t}
            id="afinar-barra"
            etiqueta={t.preguntar}
            pista={t.preguntarPista}
            refCaja={refCaja}
            onEscape={() => setAbierta(false)}
          />
        </div>
      )}
    </section>
  );
}
