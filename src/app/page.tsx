import { Compass } from "lucide-react";
import { BotonAviso } from "@/components/BotonAviso";
import { Flujo } from "@/components/flujo/Flujo";
import ficha from "../../ficha.json";

// «Brújula · Asistente de trámites»: el nombre pesa y la frase acompaña.
const [nombre, apellido] = ficha.nombre.split(" · ");

export default function Home() {
  return (
    <>
      <header className="mx-auto flex min-h-20 max-w-(--container-content) flex-wrap items-center justify-between gap-4 px-(--page-gutter) py-4">
        <span className="inline-flex items-center gap-3 leading-tight">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-white"
          >
            <Compass className="size-5" strokeWidth={2.25} />
          </span>
          <span className="text-lg font-semibold tracking-tight">{nombre}</span>
          {apellido && (
            <span className="hidden text-base text-(--text-secondary) sm:inline">
              {apellido}
            </span>
          )}
        </span>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-[760px] px-(--page-gutter) pt-8 pb-20 outline-none md:pt-12"
      >
        <Flujo />
      </main>

      <footer className="p-2">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] px-(--page-gutter) py-12 [background:radial-gradient(80%_70%_at_50%_-12%,#ffe58f_0%,rgba(255,229,143,0)_70%),linear-gradient(180deg,#ffd34d_0%,var(--brand-yellow)_46%,var(--brand-orange)_100%)] md:px-12">
          <p className="text-[15px]">
            Una pieza del squad{" "}
            <span className="font-mono">{ficha.equipo}</span> · Build night ·{" "}
            {ficha.datos === "reales" ? "Datos públicos" : "Datos simulados"} ·{" "}
            {/* Reabre el aviso del primer uso para retirar la aceptación. */}
            <a href="#privacidad" className="underline underline-offset-4">
              Privacidad<span aria-hidden="true"> · </span>
              <span lang="ca">Privacitat</span>
            </a>
          </p>
          <BotonAviso />
        </div>
      </footer>
    </>
  );
}
