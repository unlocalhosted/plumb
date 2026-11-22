// Release gate, no browser. React Plumber failing to start never stops the app compiling: the packed package on
// every supported host, with a config that can't be read and a cache that can't be written (docs/journey.md 81).
// @tier host
import assert from 'node:assert/strict';
import { chmod, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { installApp, serve } from './helpers/hosts.mjs';

const config = (text) => async (root) => writeFile(join(root, 'plumber.config.mjs'), text);
const BREAKS = {
  'a typo in plumber.config': config('export default {{{ broken\n'),
  'a plumber.config that throws': config("throw new Error('no environment here');\n"),
  'a plumber.config of the wrong shape': config('export default { source: 42 };\n'),
  'a cache folder that can’t be written': async (root) => {
    await rm(join(root, '.plumber'), { recursive: true, force: true });
    await writeFile(join(root, '.plumber'), 'a file where the folder goes\n');
  },
};
// root reads a file whatever its mode, so there is nothing to show as root
if (process.getuid?.() !== 0) {
  BREAKS['a plumber.config that can’t be read'] = async (root) => {
    await writeFile(join(root, 'plumber.config.mjs'), 'export default {};\n');
    await chmod(join(root, 'plumber.config.mjs'), 0o000);
  };
}
const HOSTS = [
  ['vite8', undefined, Object.keys(BREAKS)],
  // a Next server takes seconds to boot, and its loader reads the same two things
  ...['next15', 'next16'].flatMap((name) => ['webpack', 'turbopack'].map((bundler) => [name, bundler, ['a typo in plumber.config', 'a cache folder that can’t be written']])),
];

async function compiled(app, url) {
  const response = await fetch(url + (app.next ? '/' : '/src/App.jsx'), { signal: AbortSignal.timeout(120000) });
  return { status: response.status, body: await response.text() };
}

for (const [name, bundler, breaks] of HOSTS) {
  test(`${name}${bundler ? ` ${bundler}` : ''}: the app compiles when React Plumber can’t start`, { timeout: 420000 }, async (t) => {
    const app = await installApp(name);
    await t.test('when all is well the app is stamped', async (t) => {
      const { url } = await serve(t, app, bundler);
      const { status, body } = await compiled(app, url);
      assert.equal(status, 200);
      assert.match(body, /data-plumb-source/, 'so the cases below are Plumber failing, not Plumber absent');
    });
    for (const what of breaks) {
      await t.test(what, async (t) => {
        t.after(async () => {
          await rm(join(app.root, 'plumber.config.mjs'), { force: true });
          await rm(join(app.root, '.plumber'), { recursive: true, force: true });
        });
        await BREAKS[what](app.root);
        const server = await serve(t, app, bundler);
        const { status, body } = await compiled(app, server.url);
        assert.equal(status, 200, `${body.slice(0, 1500)}\n${server.logs().slice(-1500)}`);
        assert.match(body, /A small test page/);
        // on Vite the stamping is the app's own transform, so the terminal is where the person learns why
        if (!app.next && what.includes('plumber.config')) {
          for (let i = 0; i < 50 && !/\[plumb\]/.test(server.logs()); i++) await delay(100);
          assert.match(server.logs(), /\[plumb\].*restart the dev server/s, 'the terminal says what to fix');
        }
      });
    }
  });
}
