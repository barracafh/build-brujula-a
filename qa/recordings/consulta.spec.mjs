// suite: consulta.md sha256:8bee50d5772424e4ed0c27df84034010e5b6dcd92e454ed107b974f224bcb40d
// La grabación de suites/consulta.md: una prueba por prueba de la suite y un
// `test.step` por fila, «n · Quién: qué hace». La primera línea es el hash de
// la suite (`qa-cockpit stamp consulta`).
import { test, expect } from '../fixtures.mjs';

const INICIO = '/brujula-a';
const titular = (page, name) => page.getByRole('heading', { level: 1, name, exact: true });

test('T1 · Una consulta clara lleva a su ficha', async ({ ana }) => {
  await test.step('1 · Ana: abre Brújula', async () => {
    await ana.goto(INICIO);
    await expect(titular(ana, '¿Qué trámite necesitas?')).toBeVisible();
  });

  await test.step('2 · Ana: escribe «Quiero votar por correo» y pulsa «Buscar»', async () => {
    await ana.getByLabel('Cuéntanos qué te pasa').fill('Quiero votar por correo');
    await ana.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(
      titular(ana, 'Solicitar el voto por correo (Elecciones Generales del 29 de noviembre de 2026)'),
    ).toBeVisible();
  });

  await test.step('3 · Ana: mira «Dónde se hace»', async () => {
    const donde = ana.locator('section').filter({ has: ana.getByRole('heading', { name: 'Dónde se hace' }) });
    await donde.scrollIntoViewIfNeeded();
    await expect(donde.getByText('Correos / Oficina del Censo Electoral (INE)', { exact: true })).toBeVisible();
    await expect(donde.getByRole('link', { name: 'Hacer el trámite' })).toBeVisible();
  });
});

test('T2 · En valenciano y desde el móvil, una consulta vaga pide aclaración', async ({ pau }) => {
  await test.step('1 · Pau: abre Brújula', async () => {
    await pau.goto(INICIO);
    await expect(titular(pau, '¿Qué trámite necesitas?')).toBeVisible();
  });

  await test.step('2 · Pau: pulsa «Valencià»', async () => {
    await pau.getByRole('button', { name: 'Valencià', exact: true }).click();
    await expect(titular(pau, 'Quin tràmit necessites?')).toBeVisible();
  });

  await test.step('3 · Pau: pulsa el ejemplo «M\'han acomiadat»', async () => {
    await pau.getByRole('button', { name: "M'han acomiadat", exact: true }).click();
    await expect(pau.getByText('Aclariment 1 de 2', { exact: true })).toBeVisible();
    await expect(
      titular(
        pau,
        "Què necessites exactament: demanar l'atur, inscriure't com a demandant d'ocupació o ja se t'ha acabat l'atur?",
      ),
    ).toBeVisible();
  });

  await test.step('4 · Pau: elige «Solicitar la prestación por desempleo (paro)»', async () => {
    await pau.getByRole('button').filter({ hasText: 'Solicitar la prestación por desempleo (paro)' }).click();
    await expect(titular(pau, 'Solicitar la prestación por desempleo (paro)')).toBeVisible();
    await expect(pau.getByText('Contingut oficial en castellà', { exact: true })).toBeVisible();
  });
});

test('T3 · Lo que Brújula no conoce lleva al Punto de Acceso General', async ({ ana }) => {
  await test.step('1 · Ana: abre Brújula', async () => {
    await ana.goto(INICIO);
    await expect(titular(ana, '¿Qué trámite necesitas?')).toBeVisible();
  });

  await test.step('2 · Ana: escribe «Quiero adoptar un perro» y pulsa «Buscar»', async () => {
    await ana.getByLabel('Cuéntanos qué te pasa').fill('Quiero adoptar un perro');
    await ana.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(titular(ana, 'No lo encontramos en Brújula')).toBeVisible();
    await expect(ana.getByRole('link', { name: 'Buscar en administracion.gob.es' })).toBeVisible();
  });
});

test('T4 · Si el motor falla, la consulta no se pierde', async ({ ana }) => {
  await test.step('1 · Ana: abre Brújula', async () => {
    await ana.goto(INICIO);
    await expect(titular(ana, '¿Qué trámite necesitas?')).toBeVisible();
  });

  await test.step('2 · Ana: escribe «error de prueba» y pulsa «Buscar»', async () => {
    await ana.getByLabel('Cuéntanos qué te pasa').fill('error de prueba');
    await ana.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(titular(ana, 'No hemos podido consultarlo ahora mismo')).toBeVisible();
    await expect(ana.locator('q', { hasText: 'error de prueba' })).toBeVisible();
    await expect(ana.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
  });
});
