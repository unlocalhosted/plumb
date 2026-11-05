// On Next, a request through the App Router route pays Next's route invocation before our handler runs (hundreds of
// milliseconds on a large app under Turbopack: 230 ms for a 1 ms GET /__plumb/health on magicui), so the route opens a
// sidecar (src/hosts/next-dev.ts): a loopback server on its own port, the same Session, the same token, CORS for the
// page's origin. The client module served through the route is a bridge that loads the overlay from the sidecar, with
// the route as the fallback door. Proved through real Next (Turbopack), React and Chromium on a workspace app below
// its repository top: the overlay's modules and questions go to the sidecar, a warm stamped locate is a lookup, and
// the route still serves the client itself when asked directly.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo = fileURLToPath(new URL('../', import.meta.url));
const chromiumPath = () => (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined;
async function file(root, path, text) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); }
async function turbopackRoot() {
  const parts = [repo.replace(/\/$/, ''), dirname(await realpath(join(repo, 'node_modules')))].map((p) => p.split(sep));
  const out = [];
  for (let i = 0; i < parts[0].length && parts.every((p) => p[i] === parts[0][i]); i++) out.push(parts[0][i]);
  return out.join(sep) || sep;
}

test('Next: the overlay talks to the route’s sidecar, a warm stamped locate is under 30 ms p95, and the route still serves the client itself', { timeout: 420000 }, async (t) => {
  const tpRoot = await turbopackRoot();
  const top = await mkdtemp(join(repo, 'fixtures/.next-sidecar-'));
  t.after(() => rm(top, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  spawnSync('git', ['init', '-q'], { cwd: top });
  await file(top, 'package.json', '{"name":"acme","private":true}');
  await file(top, 'pnpm-workspace.yaml', 'packages:\n  - apps/*\n');
  const app = join(top, 'apps/web');
  await file(app, 'next.config.mjs', `export default { experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } };\n`);
  await file(app, 'app/layout.jsx', 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n');
  await file(app, 'app/page.jsx', `import { Rows } from '../components/Rows';\nexport default function Page() { return <main id="main"><Rows /></main>; }\n`);
  await file(app, 'components/Rows.jsx', `export function Rows() { return <ul>\n${Array.from({ length: 20 }, (_, i) => `  <li id="s${i}" className="p-[${10 + i}px]">${i}</li>`).join('\n')}\n</ul>; }\n`);
  await file(app, 'src/styles.css', '@import "tailwindcss";\n');
  await file(app, 'package.json', '{"name":"web","private":true,"type":"module"}');
  const run = (args) => { const r = spawnSync(args[0], args.slice(1), { cwd: app, encoding: 'utf8', timeout: 240000 }); assert.equal(r.status, 0, r.stderr + r.stdout); };
  run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--legacy-peer-deps', '--install-links=false', '--prefer-offline', `file:${repo}`]);
  const metadata = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'));
  metadata.dependencies.next = '^16.4.0';
  await writeFile(join(app, 'package.json'), JSON.stringify(metadata));
  run([process.execPath, join(app, 'node_modules/@unlocalhosted/react-plumber/dist/cli.js'), 'install', '--overlay', '--write']);
  await file(app, 'next.config.mjs', `import { withPlumb } from '@unlocalhosted/react-plumber/next/config';\nexport default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } });\n`);
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }; delete env.NODE_ENV;
  const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--turbopack', '--hostname', '127.0.0.1', '--port', '0'], { cwd: app, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; child.stdout.on('data', (c) => logs += c); child.stderr.on('data', (c) => logs += c);
  t.after(async () => { child.kill('SIGTERM'); await delay(500); child.kill('SIGKILL'); });
  let url;
  for (let i = 0; i < 1200 && !url; i++) { assert.equal(child.exitCode, null, logs); if (/Ready in/.test(logs)) url = /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0]; await delay(50); }
  assert.ok(url, logs);
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url, { timeout: 120000 });
  await page.waitForFunction(() => window.__plumb?.ready, undefined, { timeout: 120000 });
  await page.evaluate(() => window.__plumb.ready());
  await delay(1500);
  // the overlay came from the sidecar: another loopback origin than the page's, for the client and every module
  const origins = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => new URL(e.name)).filter((u) => u.pathname.startsWith('/__plumb/')).map((u) => `${u.origin} ${u.pathname}`));
  const pageOrigin = new URL(url).origin;
  const sidecar = [...new Set(origins.map((o) => o.split(' ')[0]).filter((o) => o !== pageOrigin))];
  assert.equal(sidecar.length, 1, `one sidecar origin: ${JSON.stringify(origins)}`);
  assert.match(sidecar[0], /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.ok(origins.includes(`${sidecar[0]} /__plumb/client.js`) && origins.includes(`${sidecar[0]} /__plumb/src/api.js`), JSON.stringify(origins));
  assert.ok(origins.includes(`${pageOrigin} /__plumb/client.js`), 'the page’s own tag loaded the bridge through the route');
  // a question goes to the sidecar, with the token, and is answered there
  const asked = [];
  page.on('request', (r) => { if (/\/__plumb\/resolve/.test(r.url())) asked.push(new URL(r.url()).origin); });
  const { first, warm } = await page.evaluate(async () => {
    const els = Array.from({ length: 20 }, (_, i) => document.getElementById('s' + i));
    const first = await window.__plumb.locate(els[0], { explain: true });
    const warm = [];
    for (let round = 0; round < 4; round++) for (const el of els) { const t0 = performance.now(); const found = await window.__plumb.locate(el, { explain: true }); if (round) warm.push([performance.now() - t0, found?.via, found?.file]); }
    return { first, warm };
  });
  assert.equal(first.via, 'stamp', JSON.stringify(first));
  assert.equal(first.file, 'components/Rows.jsx');
  assert.ok(asked.length > 0 && asked.every((o) => o === sidecar[0]), `resolve asked at the sidecar: ${JSON.stringify([...new Set(asked)])}`);
  assert.ok(warm.every(([, via, f]) => via === 'stamp' && f === 'components/Rows.jsx'), JSON.stringify(warm.filter(([, via]) => via !== 'stamp')));
  const ms = warm.map(([t]) => t).sort((a, b) => a - b), p50 = ms[Math.floor(ms.length / 2)], p95 = ms[Math.floor(ms.length * 0.95)];
  t.diagnostic(`Next Turbopack warm stamped locate through the sidecar: n=${ms.length} p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms max=${ms.at(-1).toFixed(1)}ms`);
  assert.ok(p95 < 30, `p95 ${p95.toFixed(1)} ms (p50 ${p50.toFixed(1)}, max ${ms.at(-1).toFixed(1)})`);
  // the fallback door: the route serves the real client when asked for it directly, and the sidecar refuses another origin
  const direct = await (await fetch(new URL('/__plumb/client.js?direct=1', url))).text();
  assert.match(direct, /^\/\/ Plumb's dev client/);
  const bridge = await (await fetch(new URL('/__plumb/client.js', url))).text();
  assert.match(bridge, /^\/\/ React Plumber: the overlay from its sidecar/);
  const refused = await fetch(`${sidecar[0]}/__plumb/client.js`, { headers: { Origin: 'http://evil.localhost:1' } });
  assert.equal(refused.status, 403);
  assert.deepEqual(errors, []);
});
