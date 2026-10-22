// QA Cockpit para Brújula: todo lo que el cockpit sabe de la app. Las rutas
// son relativas a este archivo (`base`). Cómo se usa, en SKILL.md, al lado.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'qa-cockpit';
import { processStack } from 'qa-cockpit/process';

// Lo que cambia de una máquina a otra (un puerto ocupado...) va en .env, al
// lado, sin subirlo; .env.example dice qué se puede poner.
loadEnv(import.meta.url);
const APP_PORT = process.env.QA_APP_PORT ?? '4400';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const NEXT = path.join(RAIZ, 'node_modules', 'next', 'dist', 'bin', 'next');
// La app vive en /<equipo> también en local (next.config.ts).
const INICIO = '/brujula-a';

// El motor simulado: reglas fijas, sin red ni claves, la misma respuesta cada
// vez. La copia de QA nunca llama a HelmCode ni a Jev (límites compartidos).
// El entorno gana a .env.local, así que las claves de allí no se usan.
const ENTORNO = { BRUJULA_MOTOR: 'simulado', NEXT_TELEMETRY_DISABLED: '1' };

// La copia de QA es la app construida desde este árbol y servida con
// `next start` en su propio puerto. No usa `next dev`: Next 16 bloquea
// .next/dev y chocaría con el `bun run dev` de quien trabaja en esta misma
// copia. Por eso un cambio en la app pide `down` y `up`, que vuelve a
// construir (unos 25 s). Un `bun run build` con la copia en marcha la rompe.
const servidor = processStack({
  base: import.meta.url,
  name: 'brujula-a',
  command: process.execPath,
  args: [NEXT, 'start', '-p', APP_PORT, '-H', '127.0.0.1'],
  cwd: '..',
  env: ENTORNO,
  app: `http://127.0.0.1:${APP_PORT}${INICIO}`,
  health: null,
  // Brújula no guarda nada entre peticiones (regla 3): no hay datos que borrar.
  reset: async () => 'Brújula no guarda nada: no hay datos que borrar.',
});

// Next 16.4 detiene el primer `next build` que lanza un agente para avisar de
// que su versión tiene un aviso de seguridad, y sigue si se repite (docs:
// experimental.agentUpgrade). Se repite una vez; el aviso queda en la salida.
// Actualizar Next es decisión del equipo, no de la copia de QA.
function construir() {
  for (let intento = 1; ; intento += 1) {
    const build = spawnSync(process.execPath, [NEXT, 'build', '--webpack'], {
      cwd: RAIZ,
      env: { ...process.env, ...ENTORNO },
      encoding: 'utf8',
    });
    process.stdout.write(build.stdout ?? '');
    process.stderr.write(build.stderr ?? '');
    if (build.status === 0) return;
    if (intento === 1 && /SecurityFatalError/.test(`${build.stdout}${build.stderr}`)) continue;
    throw new Error('`next build` ha fallado (salida arriba): la copia de QA no arranca.');
  }
}

export default defineConfig({
  base: import.meta.url,
  name: 'Brújula',
  root: '..',
  paths: {
    suites: 'suites',
    recordings: 'recordings',
    setups: 'setups',
    sessionsSetup: 'sessions.setup.mjs',
    skill: 'SKILL.md',
  },

  // Las suites se escriben en castellano, como la app.
  suites: { castHeading: 'Reparto', runsHeading: 'Ejecuciones' },

  // Brújula no tiene cuentas: cada persona es un ciudadano anónimo en su
  // propio dispositivo. Nombres inventados, nunca datos reales (regla 2).
  cast: {
    ana: { name: 'Ana', device: 'Desktop Chrome' },
    pau: { name: 'Pau', device: 'Pixel 7' },
  },

  stack: {
    ...servidor,
    async up(ctx) {
      if (await servidor.urlsAsync()) return;
      construir();
      await servidor.up(ctx);
    },
  },

  // Sin inicio de sesión. Lo más parecido: aceptar el aviso del primer uso,
  // que queda en el localStorage del navegador y, con él, en la sesión
  // guardada. Si cambia la clave del aviso (brujula-aviso-v2...), se renueva
  // con `qa-cockpit sessions`.
  signIn: async ({ page }) => {
    await page.goto(INICIO);
    await page.getByRole('heading', { name: 'Antes de empezar' }).waitFor();
    await page.getByRole('button', { name: 'Aceptar y seguir', exact: true }).click();
    await page.getByRole('heading', { name: '¿Qué trámite necesitas?' }).waitFor();
  },

  browser: {
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    landing: INICIO,
  },

  // El selector Castellano / Valencià de la cabecera. Sus botones se llaman
  // igual en los dos idiomas. <html lang> es siempre «es»: el idioma de la
  // pantalla es el del botón pulsado (el flujo pone lang="ca" en valenciano).
  // Ojo: cambiar el idioma a mano apaga la detección por el texto de la
  // consulta (idiomaManual) durante el resto de la conversación.
  languages: {
    others: ['ca'],
    names: { ca: { en: 'Valencian', ca: 'valencià', es: 'valenciano' } },
    async switchTo({ page, lang }) {
      const boton = page.getByRole('button', { name: lang === 'ca' ? 'Valencià' : 'Castellano', exact: true });
      await boton.click();
      await boton.and(page.locator('[aria-pressed="true"]')).waitFor();
    },
    // Mientras piensa, la pantalla queda inert y no se puede pulsar.
    async ready({ page }) {
      const pensando = page.locator('[inert]');
      await pensando.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
      if (await pensando.count()) return 'Brújula sigue pensando';
    },
    async current({ page }) {
      return page.locator('[role="group"] button[aria-pressed="true"]').getAttribute('lang');
    },
  },
});
