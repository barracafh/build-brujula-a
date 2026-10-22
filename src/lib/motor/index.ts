import "server-only";
import type { Motor } from "./contrato";
import { motorHelmcode } from "./helmcode";
import { motorJev } from "./jev";
import { motorSimulado } from "./simulado";

// Un adaptador por proveedor, elegido con BRUJULA_MOTOR.
const motores: Record<string, Motor> = {
  jev: motorJev, // con HelmCode de respaldo
  helmcode: motorHelmcode,
  simulado: motorSimulado,
};

// Sin BRUJULA_MOTOR: Jev si hay JEV_API_KEY y, si no, HelmCode (ticket 08:
// quitar la clave desactiva Jev sin tocar código). El simulado solo entra en
// local sin ninguna clave; la versión publicada nunca cae a él.
function porDefecto() {
  const { JEV_API_KEY, HELMCODE_API_KEY, NODE_ENV } = process.env;
  if (JEV_API_KEY) return "jev";
  if (HELMCODE_API_KEY || NODE_ENV === "production") return "helmcode";
  return "simulado";
}

export function motor(): Motor {
  const nombre = process.env.BRUJULA_MOTOR ?? porDefecto();
  const elegido = motores[nombre];
  if (!elegido) throw new Error(`BRUJULA_MOTOR desconocido: ${nombre}`);
  return elegido;
}
