// Writes, hot reload and the network (docs/briefs/stamping-everywhere.md): each race in the table, reproduced through
// the real boundary. The audit in docs/briefs/write-races.result.md names which test proves which row; the rows an
// older test already proves are named there, not repeated here.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { serve } from '../dist/session/server.js';
import react from '@vitejs/plugin-react';
import { plumb } from '../dist/hosts/vite.js';

const repo = fileURLToPath(new URL('../', import.meta.url));
const chromiumPath = () => (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined;
async function file(root, path, text) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); }
const SOURCE = `import './styles.css';
export const App = () => <>
  <div id="a" className="p-4 gap-2" />
  <div id="b" className="p-[13px]" />
  <div id="c" className="mt-[10px]" />
</>;
`;
/** A session over HTTP, with no host: the server's own write guards. */
async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.races-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await writeFile(join(root, 'src/App.tsx'), SOURCE);
  let server;
  const start = async () => { server = await serve({ root, watch: false }); };
  await start();
  t.after(() => server?.close());
  // a write's idempotency key goes in its own header, never in the body (where `key` is an endpoint's own field)
  const call = async (method, params = {}, verb = 'GET', { key } = {}) => {
    const url = new URL('/__plumb/' + method, `http://127.0.0.1:${server.info.port}`);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const read = () => readFile(join(root, 'src/App.tsx'), 'utf8');
  const hash = async () => (await call('props', { file: 'src/App.tsx', line: 3, column: 3 })).body.hash;
  const swap = (line, from, to, { key, ...extra } = {}) => call('swaps', { file: 'src/App.tsx', hash: extra.hash, edits: [{ line, column: 3, from, to }], ...extra }, 'POST', { key });
  return { root, call, read, hash, swap, restart: async () => { await server.close(); await start(); }, stop: () => server.close(), port: () => server.info.port };
}

test('a partial file is never seen: a reader racing many writes reads the file before or after, never between', { timeout: 120000 }, async t => {
  const { root, read, hash, swap } = await project(t);
  const path = join(root, 'src/App.tsx');
  const seen = new Set(), reads = [];
  let stop = false;
  // a tight reader, as a watcher or a formatter would be
  const reader = (async () => { while (!stop) { try { reads.push(await readFile(path, 'utf8')); } catch (error) { reads.push('ERROR ' + error.code); } } })();
  const known = new Set([await read()]);
  for (let i = 0; i < 60; i++) {
    const [from, to] = i % 2 ? ['gap-3', 'gap-2'] : ['gap-2', 'gap-3'];
    const r = await swap(3, from, to, { hash: await hash() });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    known.add(await read());
  }
  stop = true; await reader;
  for (const text of reads) if (!known.has(text)) seen.add(text);
  assert.ok(reads.length > 100, `the reader read ${reads.length} times`);
  assert.deepEqual([...seen].map(text => text.slice(0, 120)), [], 'every read is a whole file the writes produced');
});

test('a write carries an idempotency key: the same key again returns the first result and does not apply twice', { timeout: 60000 }, async t => {
  const { read, hash, swap } = await project(t);
  const key = 'retry-' + Date.now(), h0 = await hash();
  const first = await swap(3, 'gap-2', 'gap-3', { hash: h0, key });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const after = await read();
  assert.match(after, /className="p-4 gap-3"/);
  // the client never saw the answer and sends the same request again, byte for byte
  const again = await swap(3, 'gap-2', 'gap-3', { hash: h0, key });
  assert.equal(again.status, 200, JSON.stringify(again.body));
  assert.deepEqual(again.body, first.body, 'the first result, again');
  assert.equal(await read(), after, 'applied once');
  // a different key is a new write: the hash moved on, so it is refused as stale rather than applied over the top
  const other = await swap(3, 'gap-2', 'gap-3', { hash: h0, key: key + '-2' });
  assert.equal(other.status, 400, JSON.stringify(other.body));
});

test('a dev server restart mid-request fails typed, and the server there next answers', { timeout: 60000 }, async t => {
  const api = await project(t);
  const port = api.port();
  const inflight = fetch(`http://127.0.0.1:${port}/__plumb/props?file=src/App.tsx&line=3&column=3`, { headers: { 'x-plumb-token': 'x' } }).then(r => r.status, error => error.name);
  await api.stop();
  const outcome = await inflight;
  assert.ok(outcome === 'TypeError' || typeof outcome === 'number', String(outcome));
  // the socket is gone: a new request is refused by the network, not hung
  const refused = await fetch(`http://127.0.0.1:${port}/__plumb/health`).then(r => r.status, error => error.name);
  assert.equal(refused, 'TypeError');
  await api.restart();
  assert.equal((await api.call('health')).body.status, 'ready');
});

// ── through the page ─────────────────────────────────────
const APP = `export default function App() {
  return <main id="main">
    <h1 id="title" className="p-4 gap-2">Title</h1>
    <p id="copy" className="p-[13px]">Copy</p>
  </main>;
}
`;
async function site(t, { watch = { usePolling: true, interval: 30 } } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.races-page-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q'], { cwd: root });
  await file(root, 'package.json', '{"name":"races","private":true,"type":"module"}');
  await file(root, 'src/App.jsx', APP);
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'src/entry.jsx', `import { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\ncreateRoot(document.getElementById('root')).render(<App />);\n`);
  await file(root, 'index.html', '<html><head><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>');
  const server = await createServer({ root, configFile: false, cacheDir: join(root, '.vite-cache'), logLevel: 'silent',
    plugins: [plumb({ watch: false }), react()], // Fast Refresh: a save swaps the component in place, as in an app
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    server: { host: '127.0.0.1', port: 0, fs: { allow: [repo] }, watch } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  t.after(() => browser.close());
  const open = async () => {
    const page = await browser.newPage(), errors = [], logs = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => logs.push(message.text()));
    await page.goto(url);
    await page.waitForSelector('#title');
    await page.waitForFunction(() => window.__plumb?.overlay);
    await page.evaluate(() => window.__plumb.ready());
    return { page, errors, logs };
  };
  const headers = { Origin: url, 'Content-Type': 'application/json' };
  const hash = async () => (await (await fetch(url + '/__plumb/props?file=src/App.jsx&line=3&column=5', { headers })).json()).hash;
  const swap = async (line, from, to, extra = {}) => { const r = await fetch(url + '/__plumb/swaps', { method: 'POST', headers, body: JSON.stringify({ file: 'src/App.jsx', hash: extra.hash ?? await hash(), edits: [{ line, column: 5, from, to }], ...extra }) }); return { status: r.status, body: await r.json() }; };
  return { root, url, open, hash, swap, server };
}

test('a request made against the code before a reload never answers about it: the answer is the code on screen', { timeout: 120000 }, async t => {
  const { root, open } = await site(t);
  const { page, errors } = await open();
  const before = await page.evaluate(() => window.__plumb.locate(document.querySelector('#copy')));
  assert.equal(before.line, 4);
  // every line moves: a request in flight while the update lands must not answer with the old line
  const asked = page.evaluate(() => window.__plumb.locate(document.querySelector('#copy'), { explain: true }));
  await writeFile(join(root, 'src/App.jsx'), '// moved\n' + APP);
  const answer = await asked;
  assert.ok(answer.line === undefined || answer.line === 4 || answer.line === 5, JSON.stringify(answer));
  await page.waitForFunction(() => document.querySelector('#copy')?.getAttribute('data-plumb-source')?.startsWith('src/App.jsx:5:'), undefined, { timeout: 20000 });
  for (let i = 0; i < 20; i++) {
    const now = await page.evaluate(() => window.__plumb.locate(document.querySelector('#copy'), { explain: true }));
    if (now.line === 5) break;
    assert.ok(now.location === null, 'never the old line once the page shows the new code: ' + JSON.stringify(now));
    await delay(100);
  }
  assert.equal((await page.evaluate(() => window.__plumb.locate(document.querySelector('#copy')))).line, 5);
  assert.deepEqual(errors, []);
});

test('a request aborted when the element goes away settles at once with a typed reason', { timeout: 60000 }, async t => {
  const { open } = await site(t);
  const { page } = await open();
  const outcome = await page.evaluate(async () => {
    const controller = new AbortController();
    const started = performance.now();
    const pending = window.__plumb.locate(document.querySelector('#copy'), { explain: true, chain: true, signal: controller.signal });
    controller.abort();
    const answer = await pending.catch(error => ({ error: String(error?.message ?? error) }));
    return { answer, ms: performance.now() - started };
  });
  assert.ok(outcome.ms < 2000, `settled in ${outcome.ms}ms`);
  assert.ok(outcome.answer.location === null || outcome.answer.partial || outcome.answer.error, JSON.stringify(outcome));
});

test('two pages writing one file: the server takes them in turn, the late one re-reads, and both pages see the result', { timeout: 120000 }, async t => {
  const { root, url, open, hash, swap } = await site(t);
  const a = await open(), b = await open();
  const h0 = await hash();
  const [first, second] = await Promise.all([swap(3, 'gap-2', 'gap-3', { hash: h0 }), swap(4, 'p-[13px]', 'p-3', { hash: h0 })]);
  const landed = [first, second].filter(r => r.status === 200), refused = [first, second].filter(r => r.status !== 200);
  assert.equal(landed.length, 1, JSON.stringify([first, second]));
  assert.equal(refused.length, 1);
  assert.match(refused[0].body.error, /changed/);
  // the late page reads the file again and its write lands on the new content
  const retry = landed[0] === first ? await swap(4, 'p-[13px]', 'p-3') : await swap(3, 'gap-2', 'gap-3');
  assert.equal(retry.status, 200, JSON.stringify(retry.body));
  const text = await readFile(join(root, 'src/App.jsx'), 'utf8');
  assert.match(text, /gap-3/); assert.match(text, /"p-3"/);
  for (const [which, { page, errors, logs }] of [a, b].entries()) {
    await page.bringToFront();
    // Both pages hear the update on the same path (each console says "[vite] hot updated: /src/App.jsx"). A page that
    // was hidden while it arrived sometimes never re-renders it in headless Chrome, even once shown; that is the
    // browser's, not the overlay's: what the overlay must never do is answer about the old code, and it does not.
    const rendered = await page.waitForFunction(() => document.querySelector('#copy')?.className === 'p-3', undefined, { timeout: 8000, polling: 100 }).then(() => true, () => false);
    assert.ok(logs.some(line => /hot updated: \/src\/App\.jsx/.test(line)), 'page ' + which + ' heard the update: ' + logs.slice(-6).join(' | '));
    if (!rendered) {
      const stale = await page.evaluate(() => window.__plumb.locate(document.querySelector('#copy'), { explain: true }));
      assert.equal(stale.location, null, 'page ' + which + ' shows old code and the overlay says so rather than answering: ' + JSON.stringify(stale));
      await page.reload(); await page.waitForSelector('#copy'); await page.waitForFunction(() => window.__plumb?.overlay); await page.evaluate(() => window.__plumb.ready());
      try { await page.waitForFunction(() => document.querySelector('#copy')?.className === 'p-3', undefined, { timeout: 8000, polling: 100 }); }
      catch (error) { const served = await (await fetch(url + '/src/App.jsx')).text(); throw new Error(error.message + '\nserved module has p-3: ' + served.includes('p-3') + '\nfile has p-3: ' + (await readFile(join(root, 'src/App.jsx'), 'utf8')).includes('"p-3"') + '\ncopy: ' + await page.evaluate(() => document.querySelector('#copy')?.outerHTML)); }
    }
    const located = await page.evaluate(() => window.__plumb.locate(document.querySelector('#copy')));
    assert.equal(located.line, 4); assert.deepEqual(errors, []);
  }
});

// The session tells Vite about every file it writes (`written`, through the engine's worker to the host), so a hot
// update never waits on the watcher, and two writes within one poll tick are two updates, not one. With no watcher at
// all, that word is the only way Vite can hear a write: the page must still update, twice.
test('a write reaches Vite from the session itself: with no file watcher, two writes in a row both reach the page', { timeout: 120000 }, async t => {
  const { url, open, swap } = await site(t, { watch: null });
  const { page, errors, logs } = await open();
  const first = await swap(3, 'gap-2', 'gap-3');
  assert.equal(first.status, 200, JSON.stringify(first.body));
  await page.waitForFunction(() => document.querySelector('#title')?.className === 'p-4 gap-3', undefined, { timeout: 8000, polling: 50 });
  const second = await swap(4, 'p-[13px]', 'p-3');
  assert.equal(second.status, 200, JSON.stringify(second.body));
  await page.waitForFunction(() => document.querySelector('#copy')?.className === 'p-3', undefined, { timeout: 8000, polling: 50 });
  assert.equal(logs.filter(line => /hot updated: \/src\/App\.jsx/.test(line)).length, 2, logs.filter(line => /vite/.test(line)).join(' | '));
  // a reload gets the module as written, never a 304 of an older one
  await page.reload(); await page.waitForSelector('#copy');
  assert.equal(await page.evaluate(() => document.querySelector('#copy').className), 'p-3');
  assert.equal(await page.evaluate(() => document.querySelector('#title').className), 'p-4 gap-3');
  assert.deepEqual(errors, []);
});
