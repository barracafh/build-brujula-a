"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Fuentes } from "@/components/Fuentes";
import { FichaTramite, focoTitulo } from "@/components/FichaTramite";
import { fuentesDe, getTramite, type Tramite } from "@/lib/catalogo";
import type { Resultado } from "@/lib/tipos";
import { ruta } from "@/config/sitio";
import { textos, type Idioma } from "@/i18n";

const EJEMPLOS = [
  "Me han echado del trabajo",
  "M'han acomiadat",
  "Quiero votar por correo el 29-N",
  "Me he mudado a València",
  "Me han puesto una multa",
  "No llego a fin de mes",
];

const PAG = {
  nombre: "administracion.gob.es",
  url: "https://administracion.gob.es/tramites-electronicos/resultados-actuaciones",
};

export function Buscador() {
  const [frase, setFrase] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [idioma, setIdioma] = useState<Idioma>("es");
  const [foco, setFoco] = useState(0); // sube para pedir foco tras renderizar
  const ocupado = useRef(false); // cerrojo síncrono contra envíos dobles
  const zona = useRef<HTMLDivElement>(null);
  const tx = textos[idioma];

  // Tras pintar el resultado, lleva el foco a su título (teclado y lector de pantalla).
  useEffect(() => {
    if (!foco) return;
    const destino = zona.current?.querySelector<HTMLElement>("[data-foco]");
    destino?.focus({ preventScroll: true });
    zona.current?.scrollIntoView({ block: "start" });
  }, [foco]);

  async function buscar(texto: string) {
    if (ocupado.current) return;
    if (!texto.trim()) {
      setError(tx.vacio);
      return;
    }
    ocupado.current = true;
    setCargando(true);
    setError(null);
    setResultado(null);
    setAbierto(null);
    try {
      const res = await fetch(ruta("/api/brujula"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ frase: texto }),
      });
      if (!res.ok) throw new Error();
      const r = (await res.json()) as Resultado;
      setIdioma(r.idioma);
      setResultado(r);
      if (r.caso === "respuesta" && getTramite(r.id)) setAbierto(r.id);
      setFoco((n) => n + 1);
    } catch {
      setError(tx.error);
    } finally {
      ocupado.current = false;
      setCargando(false);
    }
  }

  function abrir(id: string) {
    setAbierto(id);
    setFoco((n) => n + 1);
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    buscar(frase);
  }

  const tramite = abierto ? getTramite(abierto) : undefined;
  const enValenciano = idioma === "va";
  const candidatos =
    resultado?.caso === "desambiguar"
      ? resultado.opciones
          .map(getTramite)
          .filter((t): t is Tramite => t !== undefined)
      : [];

  return (
    <div lang={enValenciano ? "ca" : "es"}>
      <div
        role="group"
        aria-label={tx.cambiarIdioma}
        className="flex justify-end gap-2"
      >
        {(["es", "va"] as const).map((i) => (
          <Button
            key={i}
            type="button"
            variant={idioma === i ? "secondary" : "ghost"}
            size="lg"
            aria-pressed={idioma === i}
            onClick={() => setIdioma(i)}
            lang={i === "va" ? "ca" : "es"}
          >
            {i === "es" ? "Castellano" : "Valencià"}
          </Button>
        ))}
      </div>

      <h1 className="mt-6 text-[clamp(36px,4.5vw,60px)] leading-[1.1] tracking-[-0.02em]">
        {tx.titular}
      </h1>
      <p className="mt-6 text-lg text-(--text-secondary)">{tx.entradilla}</p>

      <form onSubmit={enviar} className="mt-10 grid gap-3">
        <label htmlFor="frase" className="text-base font-medium">
          {tx.etiqueta}
        </label>
        <Textarea
          id="frase"
          name="frase"
          value={frase}
          onChange={(e) => setFrase(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.repeat &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              buscar(frase);
            }
          }}
          maxLength={1000}
          rows={3}
          aria-describedby="frase-pista"
          className="min-h-24 px-4 py-3 text-lg md:text-lg"
        />
        <p id="frase-pista" className="text-base text-(--text-secondary)">
          {tx.pista}
        </p>
        <div>
          <Button
            type="submit"
            variant={resultado ? "outline" : "sunset"}
            size="lg"
            disabled={cargando}
            className="max-md:w-full"
          >
            {cargando ? tx.buscando : tx.buscar}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <p className="text-base text-(--text-secondary)">{tx.ejemplos}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {EJEMPLOS.map((ej) => (
            <li key={ej}>
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={cargando}
                onClick={() => {
                  setFrase(ej);
                  buscar(ej);
                }}
                className="h-auto min-h-11 whitespace-normal"
              >
                {ej}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div ref={zona} aria-live="polite" className="mt-16 scroll-mt-6">
        {error && (
          <p role="alert" className="text-base text-destructive">
            {error}
          </p>
        )}

        {resultado?.caso === "fuera" && (
          <div className="grid gap-8">
            <Card render={<section />} className="gap-3 px-6 py-6 text-base">
              <h2
                data-foco
                tabIndex={-1}
                className={cn(
                  "font-sans text-[clamp(26px,4vw,36px)] leading-[1.1] tracking-[-0.02em]",
                  focoTitulo,
                )}
              >
                {tx.fueraTitulo}
              </h2>
              <p>{tx.fueraTexto}</p>
              <a
                href={PAG.url}
                className={cn(
                  buttonVariants({ variant: "sunset", size: "lg" }),
                  "w-fit max-md:w-full",
                )}
              >
                {tx.fueraEnlace} <span aria-hidden="true">↗</span>
              </a>
            </Card>
            <div lang="es">
              <Fuentes fuentes={[PAG]} />
            </div>
          </div>
        )}

        {resultado?.caso === "desambiguar" && !tramite && (
          <section aria-labelledby="desambiguar-titulo" className="grid gap-8">
            <div>
              <h2
                id="desambiguar-titulo"
                data-foco
                tabIndex={-1}
                className={cn(
                  "font-sans text-[clamp(26px,4vw,36px)] leading-[1.1] tracking-[-0.02em]",
                  focoTitulo,
                )}
              >
                {tx.teRefieres}
              </h2>
              <p className="mt-2 text-base text-(--text-secondary)">
                {tx.teRefieresTexto}
              </p>
              <ul className="mt-5 grid gap-3">
                {candidatos.map((t) => (
                  <li key={t.id}>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => abrir(t.id)}
                      className="h-auto min-h-11 w-full justify-start py-3 text-left text-base whitespace-normal"
                    >
                      <span lang="es">{t.titulo}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div lang="es">
              <Fuentes
                fuentes={[
                  ...new Map(
                    candidatos.flatMap(fuentesDe).map((f) => [f.url, f]),
                  ).values(),
                ]}
              />
            </div>
          </section>
        )}

        {tramite && (
          <FichaTramite
            key={tramite.id}
            tramite={tramite}
            tx={tx}
            enValenciano={enValenciano}
            onAbrir={abrir}
          />
        )}

        {resultado && (
          <p className="mt-10 font-mono text-xs tracking-[0.06em] text-(--text-secondary) uppercase">
            {tx.motor} {resultado.motor}
          </p>
        )}
      </div>
    </div>
  );
}
