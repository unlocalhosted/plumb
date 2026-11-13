// On Next, a request through the App Router route pays Next's route invocation before our handler runs (hundreds of
// milliseconds on a large app under Turbopack: 230 ms for a 1 ms GET /__plumb/health on magicui), so the route opens a
// sidecar (src/hosts/next-dev.ts): a loopback server on its own port, the same Session, the same token, CORS for the
// page's origin. The client module served through the route is a bridge that loads the overlay from the sidecar, with
// the route as the door that always answers. Proved through real Next (Turbopack), React and Chromium on a workspace
// app below its repository top, in every setup where the browser can or cannot reach 127.0.0.1:PORT: the happy path
// (a warm stamped locate is a lookup), an https page, a page with a Content-Security-Policy, a sidecar that dies, two
// apps in one browser, a dev server restart, and the listener gone with the dev server. Slower is fine; broken is not,
// and nothing is logged to the console that a person would read as Plumber's fault.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer as createHttpsServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import { connect } from 'node:net';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { after, before, test } from 'node:test';
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
const CSP = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' ws: wss:; img-src * data:";
// the config: Plumber's, plus a CSP header when the dev server is started with PLUMB_TEST_CSP=1
const config = (tpRoot) => `import { withPlumb } from '@unlocalhosted/react-plumber/next/config';
const csp = process.env.PLUMB_TEST_CSP === '1' ? { headers: async () => [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: ${JSON.stringify(CSP)} }] }] } : {};
export default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} }, ...csp });
`;

let top, app, app2, tpRoot, browser;
before(async () => {
  tpRoot = await turbopackRoot();
  top = await mkdtemp(join(repo, 'fixtures/.next-sidecar-'));
  spawnSync('git', ['init', '-q'], { cwd: top });
  await file(top, 'package.json', '{"name":"acme","private":true}');
  await file(top, 'pnpm-workspace.yaml', 'packages:\n  - apps/*\n');
  app = join(top, 'apps/web');
  await file(app, 'next.config.mjs', `export default { experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } };\n`);
  await file(app, 'app/layout.jsx', 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n');
  await file(app, 'app/page.jsx', `import { Rows } from '../components/Rows';\nexport default function Page() { return <main id="main"><Rows /></main>; }\n`);
  await file(app, 'components/Rows.jsx', `export function Rows() { return <ul>\n${Array.from({ length: 20 }, (_, i) => `  <li id="s${i}" className="p-[${10 + i}px]">${i}</li>`).join('\n')}\n</ul>; }\n`);
  await file(app, 'src/styles.css', '@import "tailwindcss";\n');
  await file(app, 'package.json', '{"name":"web","private":true,"type":"module"}');
  const run = (args, cwd = app) => { const r = spawnSync(args[0], args.slice(1), { cwd, encoding: 'utf8', timeout: 240000 }); assert.equal(r.status, 0, r.stderr + r.stdout); };
  run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--legacy-peer-deps', '--install-links=false', '--prefer-offline', `file:${repo}`]);
  const metadata = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'));
  metadata.dependencies.next = '^16.4.0';
  await writeFile(join(app, 'package.json'), JSON.stringify(metadata));
  run([process.execPath, join(app, 'node_modules/@unlocalhosted/react-plumber/dist/cli.js'), 'install', '--overlay', '--write']);
  await file(app, 'next.config.mjs', config(tpRoot));
  // a second project: the same app copied (its links as links), with its own component file so the two are told apart
  app2 = join(top, 'apps/web2');
  run(['cp', '-R', app, app2], top);
  await writeFile(join(app2, 'components/Rows.jsx'), (await readFile(join(app2, 'components/Rows.jsx'), 'utf8')).replace('id="s0"', 'id="s0" data-app="two"'));
  browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
});
after(async () => { await browser?.close(); if (top) await rm(top, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); });

// next dev on the app, ready at its URL; `stop` ends it and waits for it to be gone
async function startNext(dir, { port = 0, env: extra = {} } = {}) {
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ...extra }; delete env.NODE_ENV;
  const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--turbopack', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; child.stdout.on('data', (c) => logs += c); child.stderr.on('data', (c) => logs += c);
  let url;
  for (let i = 0; i < 1200 && !url; i++) { assert.equal(child.exitCode, null, logs); if (/Ready in/.test(logs)) url = /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0]; await delay(50); }
  assert.ok(url, logs);
  const stop = async () => { if (child.exitCode !== null) return; child.kill('SIGTERM'); for (let i = 0; i < 100 && child.exitCode === null; i++) await delay(100); if (child.exitCode === null) { child.kill('SIGKILL'); await delay(500); } };
  return { url, child, stop, logs: () => logs };
}
// a page on the app, the overlay ready; console errors and page errors collected
async function open(url, context = browser) {
  const page = await context.newPage();
  const errors = [], consoleErrors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(url, { timeout: 120000 });
  await page.waitForFunction(() => window.__plumb?.ready, undefined, { timeout: 120000 });
  await page.evaluate(() => window.__plumb.ready());
  await delay(1000);
  return { page, errors, consoleErrors };
}
// where the overlay came from and where it asks: every /__plumb resource, as `origin path`
const plumbResources = (page) => page.evaluate(() => performance.getEntriesByType('resource').map((e) => new URL(e.name)).filter((u) => u.pathname.startsWith('/__plumb/')).map((u) => `${u.origin} ${u.pathname}`));
const sidecarOf = async (page, pageOrigin) => [...new Set((await plumbResources(page)).map((r) => r.split(' ')[0]).filter((o) => o !== pageOrigin))];
// the overlay works: a stamped locate of every row, through whatever door it has
async function locates(page, file = 'components/Rows.jsx', rounds = 1) {
  const found = await page.evaluate(async (rounds) => {
    const els = Array.from({ length: 20 }, (_, i) => document.getElementById('s' + i)), out = [];
    for (let round = 0; round < rounds; round++) for (const el of els) { const t0 = performance.now(); const r = await window.__plumb.locate(el, { explain: true }); out.push([performance.now() - t0, r?.via, r?.file, r?.line]); }
    return out;
  }, rounds);
  assert.ok(found.every(([, via, f]) => via === 'stamp' && f === file), JSON.stringify(found.filter(([, via, f]) => via !== 'stamp' || f !== file).slice(0, 3)));
  return found.map(([ms]) => ms);
}
const p95 = (ms) => [...ms].sort((a, b) => a - b)[Math.floor(ms.length * 0.95)];
// console errors that are not the engine's own "still reading" answers (503 to the health poll while it starts; the
// browser logs each as a failed resource; the route answers the same way without a sidecar)
const noise = (consoleErrors) => consoleErrors.filter((text) => !/status of 503/.test(text));
// is anything listening at this loopback port?
const listening = (port) => new Promise((resolve) => { const socket = connect({ host: '127.0.0.1', port }); socket.once('connect', () => { socket.destroy(); resolve(true); }); socket.once('error', () => resolve(false)); });

test('the overlay talks to the route’s sidecar: a warm stamped locate is under 30 ms p95; the route still serves the client itself; the listener dies with the dev server', { timeout: 300000 }, async (t) => {
  const server = await startNext(app);
  t.after(server.stop);
  const { page, errors, consoleErrors } = await open(server.url);
  const pageOrigin = new URL(server.url).origin;
  const resources = await plumbResources(page);
  const sidecar = await sidecarOf(page, pageOrigin);
  assert.equal(sidecar.length, 1, `one sidecar origin: ${JSON.stringify(resources)}`);
  assert.match(sidecar[0], /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.ok(resources.includes(`${sidecar[0]} /__plumb/client.js`) && resources.includes(`${sidecar[0]} /__plumb/src/api.js`), JSON.stringify(resources));
  assert.ok(resources.includes(`${pageOrigin} /__plumb/client.js`), 'the page’s own tag loaded the bridge through the route');
  const asked = [];
  page.on('request', (r) => { if (/\/__plumb\/resolve/.test(r.url())) asked.push(new URL(r.url()).origin); });
  await locates(page);
  const warm = await locates(page, 'components/Rows.jsx', 3);
  assert.ok(asked.length > 0 && asked.every((o) => o === sidecar[0]), `resolve asked at the sidecar: ${JSON.stringify([...new Set(asked)])}`);
  t.diagnostic(`Next Turbopack warm stamped locate through the sidecar: n=${warm.length} p95=${p95(warm).toFixed(1)}ms`);
  assert.ok(p95(warm) < 30, `p95 ${p95(warm).toFixed(1)} ms`);
  // the door: the route serves the real client on request, the bridge otherwise; the sidecar refuses another origin
  assert.match(await (await fetch(new URL('/__plumb/client.js?direct=1', server.url))).text(), /^\/\/ Plumb's dev client/);
  assert.match(await (await fetch(new URL('/__plumb/client.js', server.url), { headers: { referer: server.url } })).text(), /^\/\/ React Plumber: the overlay from its sidecar/);
  assert.equal((await fetch(`${sidecar[0]}/__plumb/client.js`, { headers: { Origin: 'http://evil.localhost:1' } })).status, 403);
  assert.deepEqual(errors, []); assert.deepEqual(noise(consoleErrors), []);
  // the dev server stops: nothing listens at the sidecar's port any more
  const port = Number(new URL(sidecar[0]).port);
  assert.equal(await listening(port), true);
  await page.close();
  await server.stop();
  for (let i = 0; i < 50 && await listening(port); i++) await delay(100);
  assert.equal(await listening(port), false, 'the sidecar closed with the dev server');
});

test('an https page cannot use a plain-http sidecar: the route serves the client itself, and the overlay works through it with no console error', { timeout: 300000 }, async (t) => {
  const server = await startNext(app);
  t.after(server.stop);
  // https in front of the dev server: a self-signed certificate, the Host kept, the protocol said in X-Forwarded-Proto
  const certDir = join(top, 'tls'); await mkdir(certDir, { recursive: true });
  const openssl = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(certDir, 'key.pem'), '-out', join(certDir, 'cert.pem'), '-days', '2', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { encoding: 'utf8' });
  assert.equal(openssl.status, 0, openssl.stderr);
  const upstream = new URL(server.url);
  const proxy = createHttpsServer({ key: await readFile(join(certDir, 'key.pem')), cert: await readFile(join(certDir, 'cert.pem')) }, (request, response) => {
    const headers = { ...request.headers, 'x-forwarded-proto': 'https' };
    const out = httpRequest({ host: upstream.hostname, port: upstream.port, method: request.method, path: request.url, headers }, (answer) => { response.writeHead(answer.statusCode, answer.headers); answer.pipe(response); });
    out.on('error', () => { response.writeHead(502); response.end(); });
    request.pipe(out);
  });
  // the HMR WebSocket goes through too (Next's client reloads the page when it cannot connect)
  proxy.on('upgrade', (request, socket, head) => {
    const link = connect({ host: upstream.hostname, port: upstream.port }, () => {
      link.write(`${request.method} ${request.url} HTTP/1.1\r\n${Object.entries(request.headers).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\r\n')}\r\n\r\n`);
      if (head?.length) link.write(head);
      socket.pipe(link); link.pipe(socket);
    });
    link.on('error', () => socket.destroy()); socket.on('error', () => link.destroy());
  });
  await new Promise((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => proxy.close(resolve)));
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  t.after(() => context.close());
  const origin = `https://127.0.0.1:${proxy.address().port}`;
  const { page, errors, consoleErrors } = await open(`${origin}/`, context);
  const resources = await plumbResources(page);
  assert.deepEqual(await sidecarOf(page, origin), [], `nothing from another origin: ${JSON.stringify(resources)}`);
  assert.ok(resources.includes(`${origin} /__plumb/client.js`) && resources.includes(`${origin} /__plumb/src/api.js`), JSON.stringify(resources));
  const asked = [];
  page.on('request', (r) => { if (/\/__plumb\/resolve/.test(r.url())) asked.push(new URL(r.url()).origin); });
  await locates(page);
  assert.ok(asked.length > 0 && asked.every((o) => o === origin), JSON.stringify([...new Set(asked)]));
  assert.deepEqual(errors, []); assert.deepEqual(noise(consoleErrors), []);
});

test('a page whose Content-Security-Policy leaves 127.0.0.1 out keeps the route: no sidecar is tried, the overlay works, no console error', { timeout: 300000 }, async (t) => {
  const server = await startNext(app, { env: { PLUMB_TEST_CSP: '1' } });
  t.after(server.stop);
  assert.equal((await fetch(server.url)).headers.get('content-security-policy'), CSP, 'the page carries the policy');
  const { page, errors, consoleErrors } = await open(server.url);
  const pageOrigin = new URL(server.url).origin;
  const resources = await plumbResources(page);
  assert.deepEqual(await sidecarOf(page, pageOrigin), [], `nothing from another origin: ${JSON.stringify(resources)}`);
  assert.ok(resources.includes(`${pageOrigin} /__plumb/src/api.js`), JSON.stringify(resources));
  await locates(page);
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors.filter((text) => /Content Security Policy|__plumb|127\.0\.0\.1/.test(text)), [], JSON.stringify(consoleErrors));
});

test('a sidecar that stops answering: the overlay moves to the route once and stays there, never asking the dead port again', { timeout: 300000 }, async (t) => {
  const server = await startNext(app);
  t.after(server.stop);
  const context = await browser.newContext();
  t.after(() => context.close());
  const { page, errors } = await open(server.url, context);
  const pageOrigin = new URL(server.url).origin;
  const [sidecar] = await sidecarOf(page, pageOrigin);
  assert.ok(sidecar, 'the overlay came from the sidecar');
  await locates(page);
  // the sidecar's port is unreachable from now on (its process gone, a firewall, a remote browser)
  let refused = 0;
  await context.route(`${sidecar}/**`, (route) => { refused++; return route.abort('connectionrefused'); });
  const asked = [];
  page.on('request', (r) => { if (/\/__plumb\//.test(r.url())) asked.push(new URL(r.url()).origin); });
  await locates(page);
  await locates(page);
  const toSidecar = asked.filter((o) => o === sidecar).length, toRoute = asked.filter((o) => o === pageOrigin).length;
  assert.ok(toRoute >= 20, `the questions moved to the route: ${toRoute}`);
  assert.ok(toSidecar <= 1 && refused <= 1, `the dead sidecar was asked once, not again: ${toSidecar} (${refused} refused)`);
  assert.deepEqual(errors, []);
});

test('two apps in one browser: each page talks to its own sidecar with its own token; a sidecar refuses the other page’s origin and token', { timeout: 300000 }, async (t) => {
  const one = await startNext(app), two = await startNext(app2);
  t.after(one.stop); t.after(two.stop);
  const a = await open(one.url), b = await open(two.url);
  const [sidecarA] = await sidecarOf(a.page, new URL(one.url).origin), [sidecarB] = await sidecarOf(b.page, new URL(two.url).origin);
  assert.ok(sidecarA && sidecarB && sidecarA !== sidecarB, `two sidecars: ${sidecarA} ${sidecarB}`);
  const askedA = [], askedB = [];
  a.page.on('request', (r) => { if (/\/__plumb\/resolve/.test(r.url())) askedA.push(new URL(r.url()).origin); });
  b.page.on('request', (r) => { if (/\/__plumb\/resolve/.test(r.url())) askedB.push(new URL(r.url()).origin); });
  await locates(a.page); await locates(b.page);
  assert.ok(askedA.length && askedA.every((o) => o === sidecarA), JSON.stringify([...new Set(askedA)]));
  assert.ok(askedB.length && askedB.every((o) => o === sidecarB), JSON.stringify([...new Set(askedB)]));
  assert.ok(await b.page.evaluate(() => document.getElementById('s0').dataset.app === 'two'), 'the second page is the second app');
  // crossed: the other page's origin is refused; the right origin with the other page's token is refused
  const tokenA = await a.page.evaluate(() => document.querySelector('script[data-plumb-token]').dataset.plumbToken);
  const tokenB = await b.page.evaluate(() => document.querySelector('script[data-plumb-token]').dataset.plumbToken);
  assert.notEqual(tokenA, tokenB);
  assert.equal((await fetch(`${sidecarA}/__plumb/health`, { headers: { Origin: new URL(two.url).origin, 'x-plumb-token': tokenB } })).status, 403);
  assert.equal((await fetch(`${sidecarA}/__plumb/health`, { headers: { Origin: new URL(one.url).origin, 'x-plumb-token': tokenB } })).status, 401);
  assert.equal((await fetch(`${sidecarA}/__plumb/health`, { headers: { Origin: new URL(one.url).origin, 'x-plumb-token': tokenA } })).status, 200);
  assert.deepEqual([...a.errors, ...b.errors, ...noise(a.consoleErrors), ...noise(b.consoleErrors)], []);
});

test('the dev server restarts on the same port: the page finds the new sidecar, the old port is closed, no stale port is used', { timeout: 300000 }, async (t) => {
  const first = await startNext(app);
  const port = Number(new URL(first.url).port);
  const { page, errors, consoleErrors } = await open(first.url);
  const pageOrigin = new URL(first.url).origin;
  const [oldSidecar] = await sidecarOf(page, pageOrigin);
  await locates(page);
  await first.stop();
  const oldPort = Number(new URL(oldSidecar).port);
  for (let i = 0; i < 50 && await listening(oldPort); i++) await delay(100);
  assert.equal(await listening(oldPort), false, 'the old sidecar is gone with its dev server');
  const second = await startNext(app, { port });
  t.after(second.stop);
  assert.equal(second.url, first.url);
  await page.reload({ timeout: 120000 });
  await page.waitForFunction(() => window.__plumb?.ready, undefined, { timeout: 120000 });
  await page.evaluate(() => window.__plumb.ready());
  await delay(1000);
  const [newSidecar] = await sidecarOf(page, pageOrigin);
  assert.ok(newSidecar && newSidecar !== oldSidecar, `a new sidecar: ${oldSidecar} → ${newSidecar}`);
  const asked = [];
  page.on('request', (r) => { if (/\/__plumb\/resolve/.test(r.url())) asked.push(new URL(r.url()).origin); });
  await locates(page);
  assert.ok(asked.length && asked.every((o) => o === newSidecar), JSON.stringify([...new Set(asked)]));
  // while the dev server was down the page's own HMR socket and Next's client complained; nothing of Plumber's did
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors.filter((text) => new RegExp(`__plumb|plumb|${new URL(oldSidecar).host.replace('.', '\\.')}`).test(text)), [], JSON.stringify(consoleErrors));
});
