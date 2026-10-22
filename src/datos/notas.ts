// Notas del catálogo que hablan al equipo o describen cómo se investigó, no al
// ciudadano (ticket 03). `datos/` no se edita, así que se sustituyen aquí.
// Cada texto sale de frases literales de la nota original; nunca añade datos.
// `null` quita la tarjeta «Conviene saber». Las notas que no están aquí se
// muestran literales.
export const notasSustituidas: Record<string, string | null> = {
  // Solo cuenta qué páginas no se pudieron abrir; el enlace a la presolicitud
  // ya está en los pasos.
  "prestacion-desempleo": null,
  "subsidio-desempleo":
    "Cuantía según La Moncloa (2024): 95 % del IPREM los 6 primeros meses, 90 % los 6 siguientes y 80 % el resto. Se elimina el mes de espera tras agotar el paro. Existe el Complemento de Apoyo al Empleo para compatibilizarlo con un trabajo. No hemos podido confirmar en una web oficial el plazo actual de solicitud tras la reforma.",
  "renovacion-dni":
    "El importe de la tasa está en la página de tasas de dnielectronico.es.",
  "cita-medica-gva": null,
  "ingreso-minimo-vital":
    "Cuantía 2026 para una persona adulta sola: 733,60 €/mes (más en hogares con más miembros). Teléfono de información: 020.",
  "renta-valenciana-inclusion":
    "La Ley 2/2026 deroga la Ley 19/2017 desde el 20/10/2026 y el procedimiento nuevo todavía no está publicado en la sede de la Generalitat. Mientras tanto, pregunta en los servicios sociales de tu ayuntamiento o llama al 012. Quien ya cobra la RVI la mantiene con al menos la misma cuantía. La resolución tarda hasta 5 meses y, sin respuesta, se considera desestimada.",
  "ayudas-comedor-escolar":
    "Importe: hasta 4,35 €/día (Infantil, Primaria y ESO), 5,54 € (educación especial). No es un trámite online: se entrega en el centro.",
  "xarxa-llibres":
    "No es un trámite online: se entrega en el centro. La sede y la Conselleria lo llaman «Programa Banco de Libros».",
};
