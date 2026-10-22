import type { Ref } from "react";
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
import type { Entrada } from "@/lib/entrada";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Fuentes } from "@/components/Fuentes";
import { Escuchar } from "./Escuchar";
import { textosRespuesta, type IdiomaRespuesta } from "./textos";

// Respuesta compuesta (tickets 03, 09 y 10). Sin estado ni hooks: sirve en
// cliente y en servidor. El contenido de la entrada se muestra literal y lleva
// lang="es"; los textos fijos siguen el idioma de la interfaz.

// Etiqueta de sección como en reforma-digital.es: mono, mayúsculas, tracking.
// Es un h2 semántico; la clase pisa la serif que la base pone a h1 y h2.
const etiqueta =
  "font-mono text-xs font-medium tracking-[0.08em] uppercase";

const tarjeta = "gap-4 px-6 py-6 text-base ring-0";

function dominio(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function RespuestaCompuesta({
  entrada: e,
  idioma,
  refTitular,
}: {
  entrada: Entrada;
  idioma: IdiomaRespuesta;
  refTitular?: Ref<HTMLHeadingElement>;
}) {
  const tx = textosRespuesta[idioma];
  const conTramite = e.enlace_tramite !== null;
  const enlace = e.enlace_tramite ?? e.enlace_info;

  return (
    <article
      lang={idioma === "va" ? "ca" : "es"}
      className="text-lg [&>*+*]:mt-8"
    >
      <header>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {e.tipo === "ayuda" ? tx.tipoAyuda : tx.tipoTramite}
          </Badge>
          {!e.verificado && (
            <Badge variant="outline">
              <TriangleAlert aria-hidden="true" className="text-destructive" />
              {tx.marcaSinVerificar}
            </Badge>
          )}
          {idioma === "va" && (
            <Badge variant="outline" className="font-mono">
              {tx.contenidoCastellano}
            </Badge>
          )}
        </div>
        {/* Recibe el foco por código al sustituir la pantalla (ticket 09):
            fuera del orden de tabulación y sin anillo al recibirlo así. */}
        <h1
          ref={refTitular}
          tabIndex={-1}
          lang="es"
          className="mt-3 text-[clamp(30px,5vw,44px)] leading-[1.08] tracking-[-0.02em] [overflow-wrap:anywhere] outline-none"
        >
          {e.titulo}
        </h1>
        <p className="mt-3 text-base text-(--text-secondary)" lang="es">
          {e.organismo} · {e.administracion}
        </p>
        {/* La key lo desmonta, y lo para, al cambiar de entrada o de idioma. */}
        <Escuchar key={`${e.id}.${idioma}`} id={e.id} idioma={idioma} tx={tx} />
        {!e.verificado && (
          <p className="mt-4 flex gap-3 rounded-xl px-5 py-4 text-base ring-1 ring-destructive/40">
            <TriangleAlert
              aria-hidden="true"
              className="mt-1 size-5 shrink-0 text-destructive"
            />
            {tx.sinVerificar}
          </p>
        )}
      </header>

      {e.pasos.length > 0 && (
        <section>
          <h2 className={cn("mb-4 text-(--text-secondary)", etiqueta)}>
            {tx.pasos}
          </h2>
          <ol className="grid gap-5" lang="es">
            {e.pasos.map((paso, i) => (
              <li
                key={i}
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
      )}

      <div className="grid gap-3">
        {/* Una sola tarjeta con el sol por vista: el plazo, si existe. */}
        {e.plazo && (
          <Card
            render={<section />}
            className={cn(
              tarjeta,
              "[background:radial-gradient(120%_90%_at_100%_0%,#ffd34d_0%,rgba(255,211,77,0)_60%),var(--brand-yellow)]",
            )}
          >
            <Cabecera icono={CalendarClock} titulo={tx.plazo} sobre="sol" />
            <p
              lang="es"
              className="text-xl leading-snug font-medium [overflow-wrap:anywhere]"
            >
              {e.plazo}
            </p>
          </Card>
        )}
        <TarjetaLista
          icono={ListChecks}
          titulo={tx.requisitos}
          items={e.requisitos_clave}
        />
        <TarjetaLista
          icono={FileText}
          titulo={tx.documentacion}
          items={e.documentacion}
        />
        {e.nota && (
          <Card render={<section />} className={cn(tarjeta, "bg-muted")}>
            <Cabecera icono={Info} titulo={tx.convieneSaber} sobre="muted" />
            <p lang="es" className="min-w-0 [overflow-wrap:anywhere]">
              {e.nota}
            </p>
          </Card>
        )}
      </div>

      <Card
        render={<section />}
        className="flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-6 text-base"
      >
        <div className="min-w-0 flex-[1_1_260px]">
          <Cabecera icono={Landmark} titulo={tx.dondeSeHace} sobre="blanco" />
          <p className="mt-4 text-lg leading-[1.35] font-medium" lang="es">
            {e.organismo}
          </p>
          <p className="mt-1 font-mono text-sm [overflow-wrap:anywhere] text-(--text-secondary)">
            {dominio(enlace)}
          </p>
          {!conTramite && <p className="mt-3">{tx.sinEnlace}</p>}
        </div>
        {/* La acción principal solo existe si hay trámite (ticket 03). */}
        <a
          href={enlace}
          className={cn(
            buttonVariants({
              variant: conTramite ? "sunset" : "outline",
              size: "lg",
            }),
            "h-auto min-h-11 whitespace-normal max-md:w-full",
          )}
        >
          {conTramite ? tx.hacerTramite : tx.masInfo}{" "}
          <span aria-hidden="true">↗</span>
        </a>
      </Card>

      {e.fuentes.length > 0 && (
        <div lang="es">
          <Fuentes fuentes={e.fuentes} />
        </div>
      )}
    </article>
  );
}

// Pastilla con icono y etiqueta: la cabecera de cada tarjeta. La pastilla es
// neutra (bg-muted) con el icono en rojo; sobre una tarjeta ya gris pasa a
// blanco para seguir viéndose.
const pastilla = {
  blanco: "bg-muted text-brand",
  muted: "bg-background text-brand",
  sol: "bg-background/70 text-foreground",
} as const;

function Cabecera({
  icono: Icono,
  titulo,
  sobre,
}: {
  icono: LucideIcon;
  titulo: string;
  sobre: keyof typeof pastilla;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          pastilla[sobre],
        )}
      >
        <Icono className="size-[18px]" strokeWidth={1.5} />
      </span>
      <h2
        className={cn(
          etiqueta,
          sobre === "sol" ? "text-foreground" : "text-(--text-secondary)",
        )}
      >
        {titulo}
      </h2>
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
  if (items.length === 0) return null;
  return (
    <Card render={<section />} className={cn(tarjeta, "bg-muted")}>
      <Cabecera icono={icono} titulo={titulo} sobre="muted" />
      <ul className="grid list-disc gap-2 pl-5" lang="es">
        {items.map((item, i) => (
          <li key={i} className="min-w-0 [overflow-wrap:anywhere]">
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}
