// Stamping is mandatory (docs/briefs/stamping-everywhere.md, "Enforcement"): a Vite config with plumb() after the JSX
// plugin stops the dev server with the line to move; a Next config that keeps the loader out throws at config load;
// a page that renders without stamps gets "Source stamping isn’t running" in the setup panel and a typed refusal
// instead of a guess; doctor fails on a misordered Vite app and on a Next app without withPlumb, and passes once fixed.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import MagicString from 'magic-string';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function file(root, path, text) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); }
const chromiumPath = () => (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined;
const APP = `import { Button } from 'enforced-library';
export default function App() {
  return <main id="main"><h1 id="heading">Heading</h1><Button id="library">Library</Button></main>;
}
`;
async function viteApp(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.enforced-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q'], { cwd: root });
  await file(root, 'package.json', '{"name":"enforced","private":true,"type":"module"}');
  await file(root, 'src/App.jsx', APP);
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'src/entry.jsx', `import { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\ncreateRoot(document.getElementById('root')).render(<App />);\n`);
  await file(root, 'index.html', '<html><head><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>');
  await file(root, 'node_modules/enforced-library/package.json', '{"name":"enforced-library","type":"module","exports":"./index.jsx"}');
  await file(root, 'node_modules/enforced-library/index.jsx', 'export function Button(props) { return <button {...props}>Library</button>; }\n');
  return root;
}
const settings = root => ({ root, configFile: false, cacheDir: join(root, '.vite-cache'), logLevel: 'silent',
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'enforced-library'] },
  server: { watch: null, host: '127.0.0.1', port: 0, fs: { allow: [repo] } } });

test('Vite: plumb() after the JSX plugin stops the dev server and names the line to move', { timeout: 60000 }, async t => {
  const root = await viteApp(t);
  await assert.rejects(createServer({ ...settings(root), plugins: [react(), plumb({ watch: false })] }), error => {
    assert.match(error.message, /React Plumber must run before vite:react-babel\. In vite\.config\.ts, move plumb\(\) before the plugin that compiles JSX \(react\(\)\) in plugins/);
    return true;
  });
  // The right order starts, and stamps.
  const server = await createServer({ ...settings(root), plugins: [plumb({ watch: false }), react()] });
  try { await server.listen(); assert.match((await server.transformRequest('/src/App.jsx')).code, /"data-plumb-source": "src\/App\.jsx:/); }
  finally { await server.close(); }
});

test('Vite: a page whose stamps never reach the DOM gets the setup row and a typed refusal, not a guess', { timeout: 120000 }, async t => {
  const root = await viteApp(t);
  // Stamping runs, but a later transform drops every stamp the way a misbehaving plugin would.
  const strip = { name: 'strip-stamps', enforce: 'post', transform(code, id) {
    if (!id.endsWith('.jsx')) return null;
    const edit = new MagicString(code);
    for (const match of code.matchAll(/"data-plumb-source": "[^"]*",?\s*/g)) edit.remove(match.index, match.index + match[0].length);
    return { code: edit.toString(), map: edit.generateMap({ hires: true }) };
  } };
  const server = await createServer({ ...settings(root), plugins: [plumb({ watch: false }), react(), strip] });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForSelector('#heading');
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  assert.equal(await page.getAttribute('#heading', 'data-plumb-source'), null, 'the fixture strips the stamps');
  // The setup panel names it. The note in the dock shows first; the panel opens from it.
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot?.querySelector('.dock .ready'), undefined, { timeout: 30000 });
  await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock .ready').click()); // the dock shows on hover; the note is there either way
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.rd'));
  const causes = await page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.rd .req[data-status="missing"] .what')].map(e => e.textContent));
  assert.ok(causes.some(text => /Source stamping isn’t running/.test(text)), JSON.stringify(causes));
  // Your own element: refused with the reason, and where the owner stack would have guessed. A library's host answers with its usage.
  const own = await page.evaluate(() => window.__plumb.locate(document.querySelector('#heading'), { explain: true }));
  assert.equal(own.location, null); assert.equal(own.reason, 'no-stamps'); assert.equal(own.detail?.file, 'src/App.jsx');
  assert.equal(await page.evaluate(() => window.__plumb.locate(document.querySelector('#heading'))), null);
  const library = await page.evaluate(() => window.__plumb.locate(document.querySelector('#library'), { explain: true }));
  assert.equal(library?.via, 'usage', JSON.stringify(library)); assert.equal(library?.file, 'src/App.jsx'); assert.equal(library?.component, 'Button');
  assert.deepEqual(errors, [], 'nothing thrown into the page');
});

// ── doctor ───────────────────────────────────────────────
function cli(root, args, expected) {
  const result = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), ...args, '--root', root], { cwd: repo, encoding: 'utf8', env: { ...process.env, PLUMBER_WATCH_ENV: 'wsl' } });
  assert.equal(result.status, expected, result.stderr + result.stdout);
  return result.stdout;
}
async function doctorFixture(t, host) {
  const root = await mkdtemp(join(repo, 'fixtures/.enforced-doctor-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await rm(join(root, 'vite.config.ts'), { force: true });
  await file(root, 'package.json', host === 'next' ? '{"type":"module","dependencies":{"next":"^16.4.0","react":"^19.0.0"}}' : '{"type":"module","devDependencies":{"vite":"^8.0.0"},"dependencies":{"react":"^19.0.0"}}');
  cli(root, ['init', '--force'], 0);
  return root;
}
test('doctor: a misordered Vite config fails with the line to move; the right order passes', { timeout: 120000 }, async t => {
  const root = await doctorFixture(t, 'vite');
  const config = order => `import { plumb } from '@unlocalhosted/react-plumber/vite';\nimport react from '@vitejs/plugin-react';\nexport default { plugins: [${order}] };\n`;
  await file(root, 'vite.config.mjs', config('react(), plumb()'));
  const failed = cli(root, ['doctor'], 1);
  assert.match(failed, /✗ Shows on your page\s+Move Plumber before the JSX plugins → plumber (?:fix locate\.order|install --overlay --write)/);
  await file(root, 'vite.config.mjs', config('plumb(), react()'));
  assert.match(cli(root, ['doctor'], 0), /✓ Shows on your page/);
});
test('doctor: a Next config without withPlumb fails with the fix; wrapped, it passes', { timeout: 120000 }, async t => {
  const root = await doctorFixture(t, 'next');
  await file(root, 'next.config.mjs', 'export default { reactStrictMode: true };\n');
  const failed = cli(root, ['doctor'], 1);
  assert.match(failed, /✗ Shows on your page\s+Plumber isn't in next\.config\.mjs → plumber install --overlay --write/);
  await file(root, 'next.config.mjs', "import { withPlumb } from '@unlocalhosted/react-plumber/next/config';\nexport default withPlumb({ reactStrictMode: true });\n");
  assert.match(cli(root, ['doctor'], 0), /✓ Shows on your page/);
});

// ── Next ─────────────────────────────────────────────────
// Turbopack's root must hold the package, the fixture and the node_modules this tree links from (a worktree links the main checkout's).
async function turbopackRoot() {
  const parts = [repo.replace(/\/$/, ''), dirname(await realpath(join(repo, 'node_modules')))].map((p) => p.split(sep));
  const out = [];
  for (let i = 0; i < parts[0].length && parts.every((p) => p[i] === parts[0][i]); i++) out.push(parts[0][i]);
  return out.join(sep) || sep;
}
test('Next: a config that keeps the loader out throws at config load, with the fix', { timeout: 300000 }, async t => {
  const tpRoot = await turbopackRoot();
  const root = await mkdtemp(join(repo, 'fixtures/.enforced-next-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  spawnSync('git', ['init', '-q'], { cwd: root });
  await file(root, 'next.config.mjs', `export default { experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } };\n`);
  await file(root, 'app/layout.jsx', 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n');
  await file(root, 'app/page.jsx', 'export default function Page() { return <main id="main">Page</main>; }\n');
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'package.json', '{"name":"enforced-next","private":true,"type":"module"}\n');
  const run = (args) => { const r = spawnSync(args[0], args.slice(1), { cwd: root, encoding: 'utf8', timeout: 120000 }); assert.equal(r.status, 0, r.stderr + r.stdout); };
  run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--legacy-peer-deps', '--install-links=false', `file:${repo}`]);
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  metadata.dependencies.next = '^16.4.0';
  await writeFile(join(root, 'package.json'), JSON.stringify(metadata));
  run([process.execPath, join(root, 'node_modules/@unlocalhosted/react-plumber/dist/cli.js'), 'install', '--overlay', '--write']);
  const dev = async (config) => {
    await file(root, 'next.config.mjs', config);
    const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }; delete env.NODE_ENV;
    const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const done = once(child, 'exit');
    let logs = ''; child.stdout.on('data', chunk => logs += chunk); child.stderr.on('data', chunk => logs += chunk);
    let url;
    try {
      for (let i = 0; i < 1200 && child.exitCode === null; i++) {
        if (/Ready in/.test(logs)) { url = /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0]; if (url) break; }
        await delay(50);
      }
      // Next 16 can print Ready before it loads next.config, so a config that throws shows up on the first request:
      // the server answers nothing, or exits.
      const html = url ? await fetch(url).then(response => response.ok ? response.text() : '', () => '') : '';
      await delay(500);
      return { logs, url, exited: child.exitCode, html };
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
      await done;
      await rm(join(root, '.next'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  };
  // webpack set to an object: the loader could never be added. The dev server does not start; the message says what to do.
  const broken = await dev(`import { withPlumb } from '@unlocalhosted/react-plumber/next/config';
export default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} }, webpack: { rules: [] } });
`);
  assert.doesNotMatch(broken.html, /id="main"/, broken.logs);
  assert.match(broken.logs, /In next\.config\.mjs, webpack must be a function \(config, context\) => config\. React Plumber adds its source loader/);
  // withPlumb alone stamps: the server HTML carries the stamps before any script runs.
  const fixed = await dev(`import { withPlumb } from '@unlocalhosted/react-plumber/next/config';
export default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } });
`);
  assert.ok(fixed.url, fixed.logs);
  assert.match(fixed.html, /id="main"[^>]*data-plumb-source="app\/page\.jsx:/);
});
