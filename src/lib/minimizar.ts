// Minimización antes de llamar a cualquier proveedor (ticket 08): DNI/NIE,
// correos y teléfonos pasan a un marcador. No cubre nombres ni direcciones,
// así que no es una garantía. Nada de esto se guarda ni se registra.

const PATRONES: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[correo]"],
  [/\b[XYZxyz][-\s]?\d{7}[-\s]?[A-Za-z]\b/g, "[NIE]"],
  [/\b\d{8}[-\s]?[A-Za-z]\b/g, "[DNI]"],
  [/(\+34[\s-]?)?\b[6789](?:[\s-]?\d){8}\b/g, "[teléfono]"],
];

export const minimizar = (texto: string) =>
  PATRONES.reduce((t, [re, marcador]) => t.replace(re, marcador), texto);
