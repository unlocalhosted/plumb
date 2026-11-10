// The injection allowlist, proven differentially (docs/briefs/stamping-everywhere.md, "Patterns we hold to"): the same
// page rendered with and without stamping gives the same server HTML and the same hydrated DOM once the
// data-plumb-source attributes are removed. The page has what stamping must not disturb: a component that renders a
// Fragment and throws on any prop (Headless UI's Menu), inline SVG, a fragment, a spread, an authored stamp.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function file(root, path, text) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); }
const PAGE = (client) => `${client ? "'use client';\n" : ''}import { Fragment } from 'react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
const spread = { title: 'spread', 'data-plumb-source': 'spread' };
export default function Page() {
  return <main id="main">
    <h1 className="text-xl">Heading</h1>
    <p {...spread}>Spread</p>
    <aside data-plumb-source="author">Authored</aside>
    <><em>Shorthand fragment</em></>
    <Fragment><em>Fragment</em></Fragment>
    <svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="4" /><path d="M0 0h10v10z" /></svg>
    <my-widget label="custom">Custom element</my-widget>
    <Menu>
      <MenuButton id="menu-button">Open</MenuButton>
      <MenuItems anchor="bottom"><MenuItem as={Fragment}><a href="#item">Item</a></MenuItem></MenuItems>
    </Menu>
  </main>;
}
`;
/** The page without its stamps; the overlay's own elements live outside #main. */
const strip = html => html.replace(/ data-plumb-source="[^"]*"/g, '');
const mainOf = html => { const match = /<main id="main"[\s\S]*?<\/main>/.exec(html); assert.ok(match, html.slice(0, 500)); return match[0]; };
/** The overlay answers from the Session; until it is ready its requests fail, which is not a difference in the page. */
async function ready(url) {
  for (let i = 0; i < 3000; i++) {
    const health = await fetch(url + '/__plumb/health').then(response => response.json()).catch(() => ({ status: 'starting' }));
    if (health.status === undefined) return; // Next's route answers only the overlay (token); its own ready() waits below
    if (health.status !== 'starting') { assert.equal(health.status, 'ready', JSON.stringify(health)); return; }
    await delay(20);
  }
  assert.fail('Session did not become ready');
}
const chromiumPath = () => (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined;

/** The hydrated DOM of #main, with the menu opened so its items (a portal) are in the page, as the page's own text. */
async function hydrated(page, url, overlay = true) {
  if (overlay) await ready(url);
  await page.goto(url, { timeout: 120000 });
  await page.waitForSelector('#menu-button');
  if (overlay) { await page.waitForFunction(() => window.__plumb?.ready); await page.evaluate(() => window.__plumb.ready()); }
  else await page.waitForFunction(() => document.querySelector('#menu-button')?.getAttribute('aria-controls') || document.querySelector('#menu-button')?.getAttribute('aria-expanded') !== null);
  await page.click('#menu-button');
  await page.waitForSelector('a[href="#item"]', { state: 'attached' });
  return page.evaluate(() => {
    const main = document.getElementById('main').outerHTML;
    const items = [...document.querySelectorAll('a[href="#item"]')].map(a => a.closest('[role="menu"]')?.outerHTML ?? a.outerHTML).join('');
    // Headless UI's hover/active state attributes land in whichever order the pointer's timing gives: not the page's structure.
    return (main + items).replace(/ data-plumb-source="[^"]*"/g, '').replace(/_r_[a-z0-9]+_/g, '_r_').replace(/ style="[^"]*"/g, '')
      .replace(/ data-(?:hover|active|focus|open)=""/g, '').replace(/ data-headlessui-state="[^"]*"/g, '');
  });
}

test('Vite: the page with stamps is the page without them, apart from the attribute', { timeout: 120000 }, async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.differential-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q'], { cwd: root });
  await file(root, 'package.json', '{"name":"differential","private":true,"type":"module"}');
  await file(root, 'src/App.jsx', PAGE(false));
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'src/entry.jsx', `import { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\ncreateRoot(document.getElementById('root')).render(<App />);\n`);
  await file(root, 'index.html', '<html><head><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>');
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  t.after(() => browser.close());
  const rendered = {};
  for (const stamp of [true, false]) {
    const server = await createServer({ root, configFile: false, cacheDir: join(root, '.vite-cache'), logLevel: 'silent',
      plugins: [plumb({ watch: false, stamp })], oxc: { jsx: { runtime: 'automatic', development: true } },
      optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@headlessui/react'] },
      server: { watch: null, host: '127.0.0.1', port: 0, fs: { allow: [repo] } } });
    try {
      await server.listen();
      const url = `http://127.0.0.1:${server.httpServer.address().port}`;
      const page = await browser.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      const stamped = (await server.transformRequest('/src/App.jsx')).code.includes('"data-plumb-source": "src/App.jsx:');
      assert.equal(stamped, stamp, 'stamping is ' + (stamp ? 'on' : 'off'));
      rendered[stamp] = await hydrated(page, url);
      if (stamp) assert.ok(await page.getAttribute('h1', 'data-plumb-source'), 'the stamped page carries stamps');
      assert.deepEqual(errors, [], 'no errors with stamping ' + (stamp ? 'on' : 'off'));
      await page.close();
    } finally { await server.close(); }
  }
  assert.equal(rendered[true], rendered[false]);
});

// Turbopack's root must hold the package, the fixture and the node_modules this tree links from (a worktree links the main checkout's).
async function turbopackRoot() {
  const parts = [repo.replace(/\/$/, ''), dirname(await realpath(join(repo, 'node_modules')))].map((p) => p.split(sep));
  const out = [];
  for (let i = 0; i < parts[0].length && parts.every((p) => p[i] === parts[0][i]); i++) out.push(parts[0][i]);
  return out.join(sep) || sep;
}

test('Next (Turbopack): the server HTML and hydrated DOM with stamps are the ones without, apart from the attribute', { timeout: 300000 }, async t => {
  const tpRoot = await turbopackRoot();
  const root = await mkdtemp(join(repo, 'fixtures/.differential-next-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  spawnSync('git', ['init', '-q'], { cwd: root });
  await file(root, 'next.config.mjs', `export default { experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } };\n`);
  await file(root, 'app/layout.jsx', 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n');
  await file(root, 'app/page.jsx', PAGE(true));
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'package.json', '{"name":"differential-next","private":true,"type":"module"}\n');
  const run = (args) => { const r = spawnSync(args[0], args.slice(1), { cwd: root, encoding: 'utf8', timeout: 120000 }); assert.equal(r.status, 0, r.stderr + r.stdout); };
  run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--legacy-peer-deps', '--install-links=false', `file:${repo}`]);
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  metadata.dependencies.next = '^16.4.0';
  await writeFile(join(root, 'package.json'), JSON.stringify(metadata));
  run([process.execPath, join(root, 'node_modules/@unlocalhosted/react-plumber/dist/cli.js'), 'install', '--overlay', '--write']);
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  t.after(() => browser.close());
  const rendered = {}, served = {};
  for (const stamp of [true, false]) {
    // withPlumb always stamps; the page without stamps is the page without React Plumber at all.
    await file(root, 'next.config.mjs', stamp ? `import { withPlumb } from '@unlocalhosted/react-plumber/next/config';
export default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } });
` : `export default { experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } };
`);
    const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }; delete env.NODE_ENV;
    const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--turbopack', '--hostname', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const done = once(child, 'exit');
    let logs = ''; child.stdout.on('data', chunk => logs += chunk); child.stderr.on('data', chunk => logs += chunk);
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      let url;
      for (let i = 0; i < 1200; i++) {
        assert.equal(child.exitCode, null, logs);
        if (/Ready in/.test(logs)) { url = /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0]; if (url) break; }
        await delay(50);
      }
      assert.ok(url, logs);
      const html = await (await fetch(url).catch((error) => { throw new Error(error.message + '\n' + logs); })).text();
      assert.equal(/<h1[^>]* data-plumb-source="app\/page\.jsx:/.test(html), stamp, 'server HTML stamping is ' + (stamp ? 'on' : 'off'));
      served[stamp] = strip(mainOf(html));
      rendered[stamp] = await hydrated(page, url, stamp);
      assert.deepEqual(errors, [], 'no errors with stamping ' + (stamp ? 'on' : 'off'));
      assert.doesNotMatch(logs, /Failed to compile|Passing props on Fragment/);
    } finally {
      await page.close();
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
      await done;
      await rm(join(root, '.next'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  }
  assert.equal(served[true], served[false], 'server HTML');
  assert.equal(rendered[true], rendered[false], 'hydrated DOM');
});
