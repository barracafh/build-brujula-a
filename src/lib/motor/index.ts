import "server-only";
import type { Motor } from "./contrato";
import { motorSimulado } from "./simulado";

// Un adaptador por proveedor, elegido con BRUJULA_MOTOR. Cada adaptador real
// (Jev, HelmCode) se registra aquí. Hasta entonces, el único es el simulado.
const motores: Record<string, Motor> = {
  simulado: motorSimulado,
};

export function motor(): Motor {
  const nombre = process.env.BRUJULA_MOTOR ?? "simulado";
  const elegido = motores[nombre];
  if (!elegido) throw new Error(`BRUJULA_MOTOR desconocido: ${nombre}`);
  return elegido;
}
