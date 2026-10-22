import { sinRespaldo } from "../src/lib/motor/respaldo";

let fallos = 0;
function comprobar(nombre: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${nombre}`);
  if (!ok) fallos++;
}

const material =
  "Tienes 15 días hábiles. Más info en https://www.sepe.es/HomeSepe/Personas/distributiva-prestaciones.html. Importe: 1.200 euros; 7,5 %.";

comprobar("sin cifras ni enlaces → vale", sinRespaldo("Pídela en el SEPE.", material).length === 0);
comprobar("cifra del material → vale", sinRespaldo("Tienes 15 días.", material).length === 0);
comprobar("cifra inventada → falla", sinRespaldo("Tienes 30 días.", material).join() === "30");
comprobar("«5» no vale por estar «15»", sinRespaldo("Son 5 días.", material).join() === "5");
comprobar("1200 = 1.200", sinRespaldo("Unos 1200 euros.", material).length === 0);
comprobar("7.5 = 7,5", sinRespaldo("Un 7.5 %.", material).length === 0);
comprobar("75 ≠ 7,5", sinRespaldo("Un 75 %.", material).join() === "75");
comprobar("1,2 ≠ 1.200", sinRespaldo("Unos 1,2 euros.", material).join() === "1.2");
comprobar(
  "enlace que es prefijo de otro → falla",
  sinRespaldo("https://www.sepe.es", material).join() === "https://www.sepe.es",
);
comprobar(
  "enlace del material con punto final → vale",
  sinRespaldo("Mira https://www.sepe.es/HomeSepe/Personas/distributiva-prestaciones.html.", material).length === 0,
);
comprobar(
  "enlace inventado → falla",
  sinRespaldo("Mira https://sepe.es/inventado", material).join() === "https://sepe.es/inventado",
);
comprobar(
  "cifras dentro de un enlace válido no cuentan aparte",
  sinRespaldo("Ver https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430", "x https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430").length === 0,
);
comprobar(
  "una cifra que solo está dentro de una URL no respalda",
  sinRespaldo("Son 2015 euros.", "x https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430").join() === "2015",
);
comprobar("cifra al final de frase", sinRespaldo("Tienes 15.", material).length === 0);

if (fallos) {
  console.log(`\n${fallos} fallos`);
  process.exit(1);
}
console.log("\nTodo bien");
