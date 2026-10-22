// Pronunciación del audio de la respuesta (ticket 14). Solo la usa el guion
// del audio: lo que se ve en pantalla nunca pasa por aquí. Cambia cómo se dice
// una sigla o un signo, nunca un plazo, un importe ni un requisito.
// Se aplica en orden: las URL primero, para que nada las parta antes.
export const pronunciacion: [RegExp, string][] = [
  [/https?:\/\/[^\s)]+?(?=[.,;:]?(?:\s|\)|$))/g, "(enlace en pantalla)"],
  [/Cl@ve/g, "Clave"],
  [/Import@ss/g, "Importass"],
  [/\bDNI\/NIE\b/g, "DNI o NIE"],
  [/\bNIF\/NIE\b/g, "NIF o NIE"],
  [/\bDNIe\b/g, "DNI electrónico"],
  [/\bUE\/EEE\b/g, "Unión Europea o Espacio Económico Europeo"],
  [/\bart\./g, "artículo"],
  [/\bRD\b/g, "Real Decreto"],
  [/€\/mes/g, "euros al mes"],
  [/€\/día/g, "euros al día"],
  // «certificado/DNIe», «borrador/declaración»: la barra entre palabras es «o».
  // Entre cifras (fechas, leyes) no se toca.
  [/(?<=\p{L})\/(?=\p{L})/gu, " o "],
];

export function pronunciar(texto: string): string {
  return pronunciacion.reduce((t, [patron, dicho]) => t.replace(patron, dicho), texto);
}
