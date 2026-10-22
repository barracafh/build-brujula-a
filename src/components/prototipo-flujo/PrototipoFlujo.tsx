"use client";

// PROTOTIPO (ticket 02 del mapa Brújula): tres variantes del flujo consulta →
// aclaración → respuesta en la ruta /, con ?variant=A|B|C. Comparten la
// conversación, así que al cambiar de variante se ve el mismo estado.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SelectorVariante } from "@/components/SelectorVariante";
import { useConversacion } from "./motor-simulado";
import { VarianteA, nombre as nombreA } from "./VarianteA";
import { VarianteB, nombre as nombreB } from "./VarianteB";
import { VarianteC, nombre as nombreC } from "./VarianteC";

const VARIANTES = [
  { clave: "A", nombre: nombreA, Componente: VarianteA },
  { clave: "B", nombre: nombreB, Componente: VarianteB },
  { clave: "C", nombre: nombreC, Componente: VarianteC },
];

export function PrototipoFlujo({ inicial }: { inicial: string }) {
  const router = useRouter();
  const [variante, setVariante] = useState(
    VARIANTES.some((v) => v.clave === inicial) ? inicial : "A",
  );
  const c = useConversacion();
  const { Componente } = VARIANTES.find((v) => v.clave === variante)!;
  const e = c.estado;

  const resumen = [
    `fase: ${e.fase}`,
    e.ronda ? `ronda ${e.ronda}/2` : null,
    e.candidatas.length ? `candidatas: ${e.candidatas.map((x) => `${x.id} (${x.confianza})`).join(", ")}` : null,
    e.entradaId ? `entrada: ${e.entradaId}` : null,
    e.sustituidas.length ? `sustituidas: ${e.sustituidas.join(", ")}` : null,
    `idioma: ${e.idioma}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Componente c={c} />
      <SelectorVariante
        variantes={VARIANTES}
        actual={variante}
        onCambiar={(v) => {
          setVariante(v);
          router.replace(`?variant=${v}`, { scroll: false });
        }}
        estado={resumen}
        extra={
          <span className="flex gap-2">
            <button
              type="button"
              aria-pressed={c.fallarSiguiente}
              onClick={() => c.setFallarSiguiente(!c.fallarSiguiente)}
              className="min-h-8 rounded-md px-2 ring-1 ring-background/30 aria-pressed:bg-destructive"
            >
              fallo IA {c.fallarSiguiente ? "ON" : "off"}
            </button>
            <button
              type="button"
              onClick={c.reiniciar}
              className="min-h-8 rounded-md px-2 ring-1 ring-background/30"
            >
              reiniciar
            </button>
          </span>
        }
      />
    </>
  );
}
