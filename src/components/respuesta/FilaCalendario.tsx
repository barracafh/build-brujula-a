import { cn } from "@/lib/utils";
import type { Entrada } from "@/lib/entrada";
import type { FechaPlazo } from "@/datos/fechas-plazo";
import { buttonVariants } from "@/components/ui/button";
import { enlaceGoogleCalendar, fechaCorta } from "@/lib/calendario";
import type { IdiomaRespuesta, TextosRespuesta } from "./textos";

// Una fecha límite con su enlace «Añadir a Google Calendar» (ticket 19), para
// las fechas fijas y para las calculadas. Sin estado ni hooks. El enlace se
// abre en otra pestaña para no perder la respuesta, y el nombre accesible dice
// qué fecha es.
export function FilaCalendario({
  entrada,
  fecha: f,
  idioma,
  tx,
}: {
  entrada: Entrada;
  fecha: Pick<FechaPlazo, "fecha" | "que">;
  idioma: IdiomaRespuesta;
  tx: TextosRespuesta;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="min-w-0 flex-[1_1_200px]">
        <time dateTime={f.fecha} className="font-mono text-sm">
          {fechaCorta(f.fecha)}
        </time>{" "}
        {f.que[idioma]}
      </p>
      <a
        href={enlaceGoogleCalendar(entrada, f, idioma)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-auto min-h-11 whitespace-normal max-md:w-full",
        )}
      >
        {tx.anadirCalendario} <span aria-hidden="true">↗</span>
        <span className="sr-only">
          : {f.que[idioma]} {tx.pestanaNueva}
        </span>
      </a>
    </div>
  );
}
