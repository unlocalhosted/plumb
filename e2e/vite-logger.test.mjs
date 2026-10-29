// The Vite plugin serves /__plumb/* itself. Vite must not try to load the two tags it injects into index.html as
// modules of its own: that logged "Pre-transform error: Failed to load url /__plumb/client.js" into the terminal on
// every page load. Real Vite dev server, real page request, the logger captured.
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createLogger, createServer } from 'vite';
import { plumb } from '../dist/hosts/vite.js';

const repo = fileURLToPath(new URL('../', import.meta.url));

test('a page load logs no failed /__plumb loads, and the injected tags still reach the browser', { timeout: 120_000 }, async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.vite-logger-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/computed'), root, { recursive: true });
  const lines = [];
  const logger = createLogger('info', { allowClearScreen: false });
  for (const level of ['info', 'warn', 'error']) { const own = logger[level]; logger[level] = (message, options) => { lines.push(`${level} ${message}`); own.call(logger, message, options); }; }
  const server = await createServer({ root, cacheDir: join(root, '.cache/vite'), configFile: false, plugins: [plumb({ watch: false, stamp: false })], customLogger: logger, server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  const base = `http://127.0.0.1:${server.config.server.port ?? server.httpServer.address().port}`;
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /<script type="module" src="\/__plumb\/client\.js"\s*><\/script>/);
  assert.match(html, /import \{ invalidateSourceMaps \} from '\/__plumb\/src\/sourcemap\.js'/);
  assert.doesNotMatch(html, /vite-ignore/);
  // the client and its imports are served by the plugin, not Vite's transform pipeline
  for (const path of ['/__plumb/client.js', '/__plumb/src/sourcemap.js']) assert.equal((await fetch(`${base}${path}`)).status, 200, path);
  await new Promise(resolve => setTimeout(resolve, 1500));
  const failed = lines.filter(line => /Pre-transform error|Failed to load url/.test(line));
  assert.deepEqual(failed, []);
});
