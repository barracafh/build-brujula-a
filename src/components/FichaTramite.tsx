import {
  CalendarClock,
  FileText,
  Info,
  Landmark,
  ListChecks,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Fuentes } from "@/components/Fuentes";
import {
  avisoCatalogo,
  fuentesDe,
  getTramite,
  type Tramite,
} from "@/lib/catalogo";
import type { Textos } from "@/i18n";

// Anillo de foco visible para títulos que reciben el foco por código.
export const focoTitulo =
  "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

// Etiqueta de sección como en reforma-digital.es: mono, mayúsculas, tracking.
const etiqueta = "font-mono text-xs font-medium tracking-[0.08em] uppercase";

export function FichaTramite({
  tramite: t,
  tx,
  enValenciano,
  onAbrir,
  sinRelacionados = false,
}: {
  tramite: Tramite;
  tx: Textos;
  enValenciano: boolean;
  onAbrir: (id: string) => void;
  sinRelacionados?: boolean;
}) {
  const principal = t.enlace_tramite ?? t.enlace_info;
  const relacionados = t.relacionados
    .map(getTramite)
    .filter((r): r is Tramite => r !== undefined);

  return (
    <article className="text-lg [&>*+*]:mt-8">
      <div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {t.tipo === "ayuda" ? tx.tipoAyuda : tx.tipoTramite}
          </Badge>
          {!t.verificado && (
            <Badge variant="destructive">{tx.marcaSinVerificar}</Badge>
          )}
        </div>
        <h2
          id="ficha-titulo"
          data-foco
          tabIndex={-1}
          lang="es"
          className={cn(
            "mt-3 font-sans text-[clamp(30px,5vw,44px)] leading-[1.08] tracking-[-0.03em]",
            focoTitulo,
          )}
        >
          {t.titulo}
        </h2>
        <p className="mt-3 text-base text-(--text-secondary)" lang="es">
          {t.organismo} · {t.administracion}
        </p>
        {enValenciano && (
          <p className="mt-2 text-base text-(--text-secondary)">
            {tx.contenidoCastellano}
          </p>
        )}
      </div>

      {!t.verificado && (
        <p
          role="note"
          className="flex gap-3 rounded-xl bg-destructive/10 px-5 py-4 text-base text-destructive"
        >
          <TriangleAlert aria-hidden="true" className="mt-1 size-5 shrink-0" />
          {tx.sinVerificar}
        </p>
      )}

      <section aria-labelledby="pasos-titulo">
        <h3
          id="pasos-titulo"
          className={cn("mb-4 text-(--text-secondary)", etiqueta)}
        >
          {tx.pasos}
        </h3>
        <ol className="grid gap-5" lang="es">
          {t.pasos.map((paso, i) => (
            <li
              key={paso}
              className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 md:grid-cols-[32px_minmax(0,1fr)] md:gap-x-4"
            >
              <span className="text-[22px] leading-[1.1] font-light text-brand tabular-nums md:text-[26px]">
                {i + 1}
              </span>
              <p className="min-w-0 [overflow-wrap:anywhere]">{paso}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-3">
        {/* Una sola tarjeta con el sol por vista: el plazo. */}
        <Card
          render={<section />}
          className="gap-4 px-6 py-6 text-base ring-0 [background:radial-gradient(120%_90%_at_100%_0%,#ffd34d_0%,rgba(255,211,77,0)_60%),var(--brand-yellow)]"
        >
          <Cabecera icono={CalendarClock} titulo={tx.plazo} sobreSol />
          {t.plazo ? (
            <p lang="es" className="text-xl leading-snug font-medium">
              {t.plazo}
            </p>
          ) : (
            <p>{tx.sinPlazo}</p>
          )}
        </Card>
        <TarjetaLista
          icono={ListChecks}
          titulo={tx.requisitos}
          items={t.requisitos_clave}
        />
        <TarjetaLista
          icono={FileText}
          titulo={tx.documentacion}
          items={t.documentacion}
        />
      </div>

      <Card
        render={<section />}
        className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-6 text-base"
      >
        <div className="min-w-0 flex-[1_1_260px]">
          <Cabecera icono={Landmark} titulo={tx.dondeSeHace} />
          <p className="mt-4 text-lg leading-[1.35] font-medium" lang="es">
            {t.organismo}
          </p>
          <p className="mt-1 font-mono text-sm [overflow-wrap:anywhere] text-(--text-secondary)">
            {new URL(principal).hostname}
          </p>
          {!t.enlace_tramite && <p className="mt-3">{tx.sinEnlace}</p>}
        </div>
        <a
          href={principal}
          className={cn(
            buttonVariants({ variant: "sunset", size: "lg" }),
            "max-md:w-full",
          )}
        >
          {t.enlace_tramite ? tx.hacerTramite : tx.masInfo}{" "}
          <span aria-hidden="true">↗</span>
        </a>
      </Card>

      {t.nota && (
        <details className="rounded-xl bg-muted px-6 py-4 text-base">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium text-(--text-secondary)">
            <Info aria-hidden="true" className="size-4 shrink-0" />
            {tx.notas}
          </summary>
          <p className="mt-3 min-w-0 [overflow-wrap:anywhere]" lang="es">
            {t.nota}
          </p>
        </details>
      )}

      <p className="text-base text-(--text-secondary)">
        {tx.aviso} <span lang="es">{avisoCatalogo}</span>
      </p>

      <div lang="es">
        <Fuentes fuentes={fuentesDe(t)} />
      </div>

      {!sinRelacionados && relacionados.length > 0 && (
        <section aria-labelledby="despues-titulo" className="pt-8">
          <h2
            id="despues-titulo"
            className="text-[clamp(26px,4vw,36px)] leading-[1.1] tracking-[-0.02em]"
          >
            {tx.despues}
          </h2>
          <p className="mt-2 text-base text-(--text-secondary)">
            {tx.despuesTexto}
          </p>
          <ul className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            {relacionados.map((r) => (
              <li
                key={r.id}
                className="flex h-full flex-col items-start gap-3 rounded-xl px-5 py-4 text-base ring-1 ring-foreground/10"
              >
                <span className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {r.tipo === "ayuda" ? tx.tipoAyuda : tx.tipoTramite}
                  </Badge>
                  {!r.verificado && (
                    <Badge variant="destructive">{tx.marcaSinVerificar}</Badge>
                  )}
                </span>
                <span className="font-medium" lang="es">
                  {r.titulo}
                </span>
                <span className="text-sm text-(--text-secondary)" lang="es">
                  {r.organismo}
                </span>
                {/* Enlace oficial y fuentes fuera del botón: sin controles anidados. */}
                <a
                  href={r.enlace_tramite ?? r.enlace_info}
                  className="inline-flex min-h-11 items-center gap-1 font-mono text-sm [overflow-wrap:anywhere] underline underline-offset-4"
                >
                  {new URL(r.enlace_tramite ?? r.enlace_info).hostname}{" "}
                  <span aria-hidden="true">↗</span>
                </a>
                <p className="text-sm text-(--text-secondary)">
                  {tx.fuente}:{" "}
                  {fuentesDe(r).map((f, k) => (
                    <span key={f.url}>
                      {k > 0 && " · "}
                      <a
                        href={f.url}
                        className="font-mono [overflow-wrap:anywhere] underline underline-offset-4"
                      >
                        {f.nombre}
                      </a>
                    </span>
                  ))}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => onAbrir(r.id)}
                  className="mt-auto h-auto min-h-11 whitespace-normal"
                >
                  {tx.verFicha}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

// Pastilla con icono y etiqueta: la cabecera de cada tarjeta de información.
function Cabecera({
  icono: Icono,
  titulo,
  sobreSol = false,
}: {
  icono: LucideIcon;
  titulo: string;
  sobreSol?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          sobreSol ? "bg-background/70 text-foreground" : "bg-brand/[0.08] text-brand",
        )}
      >
        <Icono className="size-[18px]" strokeWidth={1.5} />
      </span>
      <h3
        className={cn(
          etiqueta,
          sobreSol ? "text-foreground" : "text-(--text-secondary)",
        )}
      >
        {titulo}
      </h3>
    </div>
  );
}

function TarjetaLista({
  icono,
  titulo,
  items,
}: {
  icono: LucideIcon;
  titulo: string;
  items: string[];
}) {
  return (
    <Card
      render={<section />}
      className="gap-4 bg-muted px-6 py-6 text-base ring-0"
    >
      <Cabecera icono={icono} titulo={titulo} />
      <ul className="grid list-disc gap-2 pl-5" lang="es">
        {items.map((item) => (
          <li key={item} className="min-w-0 [overflow-wrap:anywhere]">
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}
