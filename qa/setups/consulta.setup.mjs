// La preparación de suites/consulta.md: una prueba por fila de su tabla
// «Preparación», cada una con su comprobación.
// `npx qa-cockpit setup consulta` la ejecuta, después de `reset`.
import { test, expect } from '@playwright/test';
import { saveSession } from 'qa-cockpit/sessions';
import config from '../qa-cockpit.config.mjs';

test.describe.configure({ mode: 'serial' });

test('S1 · La copia de QA en marcha, con el motor simulado', async ({ page }) => {
  const respuesta = await page.goto('/brujula-a');
  expect(respuesta?.ok()).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Antes de empezar' })).toBeVisible();
});

test('S2 · Ana y Pau abren Brújula una vez y aceptan el aviso', async ({ browser }) => {
  for (const id of ['ana', 'pau']) await saveSession(browser, config, id);
});
