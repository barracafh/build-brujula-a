import { preguntarJev, type RespuestaJev } from "../jev";
import type { Candidata, Motor } from "./contrato";
import { componer, delCiudadano } from "./componer";
import { motorHelmcode } from "./helmcode";

// Adaptador de Jev (tickets 01 y 04): clasifica solo con lo que escribió el
// ciudadano. Si Jev no responde (sin clave, error o timeout), clasifica
// HelmCode, que además redacta las aclaraciones.

// Provisionales hasta el conjunto de evaluación (tickets 06 y 07).
export const UMBRAL = {
  encaja: 0.4, // por debajo → sin coincidencia
  confianzaAlta: 0.85, // a partir de aquí → respuesta
  confianzaMedia: 0.4, // entre media y alta → aclaración; por debajo → sin coincidencia
  probabilidad: 0.1, // mínima para ser candidata en una aclaración
};

// La regla de Jev del ticket 04.
export function candidatasJev(jev: RespuestaJev): Candidata[] {
  if (jev.encaja < UMBRAL.encaja || jev.confianza < UMBRAL.confianzaMedia)
    return [];
  if (jev.confianza >= UMBRAL.confianzaAlta)
    return [{ id: jev.probabilidades[0][0], confianza: "alta" }];
  // Hasta 3 con probabilidad suficiente, y siempre al menos 2.
  const buenas = jev.probabilidades
    .filter(([, p]) => p >= UMBRAL.probabilidad)
    .slice(0, 3);
  const elegidas = buenas.length >= 2 ? buenas : jev.probabilidades.slice(0, 2);
  return elegidas.map(([id]) => ({ id, confianza: "media" }));
}

export const motorJev: Motor = {
  async clasificar(historial, senal) {
    const consulta = delCiudadano(historial);
    let jev: RespuestaJev;
    try {
      jev = await preguntarJev(consulta, senal);
    } catch {
      senal?.throwIfAborted();
      return motorHelmcode.clasificar(historial, senal);
    }
    return componer(candidatasJev(jev), jev.idioma, "jev", consulta, senal);
  },
};
