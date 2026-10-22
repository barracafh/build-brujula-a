// Comprueba src/datos/catalogo-va.json contra el catálogo real, sin red.
import traducciones from "../src/datos/catalogo-va.json";
import { catalogo } from "../src/lib/fuente-catalogo";
import { conTraduccion } from "../src/lib/traducciones";

const entradas = await catalogo.listar();
const ids = new Set(entradas.map((e) => e.id));
const huerfanos = Object.keys(traducciones.items).filter((id) => !ids.has(id));
const con = entradas.filter((e) => conTraduccion(e).va !== null);
const sin = entradas.filter((e) => conTraduccion(e).va === null).map((e) => e.id);

console.log(`${huerfanos.length ? "✗" : "✓"} ids de catalogo-va que no existen en el catálogo: ${huerfanos.join(", ") || "ninguno"}`);
console.log(`${sin.length ? "·" : "✓"} ${con.length} de ${entradas.length} entradas con va${sin.length ? ` (sin: ${sin.join(", ")})` : ""}`);
if (huerfanos.length) process.exitCode = 1;
