// Writes under pressure (docs/briefs/stamping-everywhere.md, "Writes, hot reload and the network"): a concurrent
// writer, a formatter rewriting right after a write, rapid Apply across files under Vite HMR and Next Fast Refresh,
// a request in flight during a reload, a dropped response retried, a restart mid-request, two pages writing one
// file. Each runs ROUNDS times, so a race is not passed by luck.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { cp, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parseSync } from 'oxc-parser';
import { serve } from '../dist/session/server.js';
import { plumb } from '../dist/hosts/vite.js';

const ROUNDS = Number(process.env.PLUMB_STRESS_ROUNDS ?? 3);
const repo = fileURLToPath(new URL('../', import.meta.url));
const chromiumPath = () => (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined;
async function file(root, path, text) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); }
const parses = (path, text) => !parseSync(path, text).errors.length;
const SOURCE = `import './styles.css';
export const App = () => <>
  <div id="a" className="p-4 gap-2" />
  <div id="b" className="p-[13px]" />
  <div id="c" className="mt-[10px]" />
</>;
`;

async function session(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.stress-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/spacing'), root, { recursive: true, filter: path => !path.split('/').includes('.plumb-cache') });
  await writeFile(join(root, 'src/App.tsx'), SOURCE);
  let server;
  const start = async () => { server = await serve({ root, watch: false }); };
  await start();
  t.after(() => server?.close().catch(() => {}));
  const call = async (method, params = {}, verb = 'GET') => {
    const url = new URL('/__plumb/' + method, `http://127.0.0.1:${server.info.port}`);
    if (verb === 'GET') url.search = new URLSearchParams(params);
    const response = await fetch(url, { method: verb, headers: { 'x-plumb-token': server.info.token, 'Content-Type': 'application/json' }, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  const path = join(root, 'src/App.tsx');
  const read = () => readFile(path, 'utf8');
  const hash = async () => (await call('props', { file: 'src/App.tsx', line: 3, column: 3 })).body.hash;
  const swap = (line, from, to, extra = {}) => call('swaps', { file: 'src/App.tsx', hash: extra.hash, edits: [{ line, column: 3, from, to }], ...extra }, 'POST');
  return { root, path, call, read, hash, swap, restart: async () => { await server.close(); await start(); }, stop: () => server.close(), port: () => server.info.port };
}

test(`a concurrent writer racing Plumber's writes (${ROUNDS} rounds): every answer is true and the file is always whole`, { timeout: 180000 }, async t => {
  for (let round = 0; round < ROUNDS; round++) {
    const { path, read, hash, swap } = await session(t);
    let stop = false, edits = 0;
    // another writer (an editor, a script) saving its own change to the same file, over and over
    // it saves whole files (temp file, rename), as an editor does, so a torn read can only be Plumber's
    const writer = (async () => { while (!stop) { const text = await read(); await writeFile(path + '.editor', text.replace(/mt-\[(\d+)px\]/, (_, n) => `mt-[${(Number(n) % 40) + 1}px]`)).then(() => rename(path + '.editor', path)).catch(() => {}); edits++; await delay(150); } })();
    let landed = 0, refused = 0;
    for (let i = 0; i < 40; i++) {
      const h = await hash(), before = await read();
      // the file may be mid-change when the hash is read: no hash is a refusal of its own
      if (!h) { refused++; continue; }
      const [from, to] = i % 2 ? ['gap-3', 'gap-2'] : ['gap-2', 'gap-3'];
      const r = await swap(3, from, to, { hash: h });
      const after = await read();
      assert.ok(parses(path, after), 'the file always parses');
      if (r.status === 200) { landed++; assert.ok(after.includes(to) || after !== before, 'a success changed the file'); }
      else { refused++; assert.match(r.body.error, /changed|not written|no longer/, JSON.stringify(r.body)); }
    }
    stop = true; await writer;
    assert.ok(landed > 0, `round ${round}: ${landed} landed, ${refused} refused, writer made ${edits} edits`);
    t.diagnostic(`round ${round}: ${landed} landed, ${refused} refused as stale, concurrent writer made ${edits} edits`);
  }
});

test(`a formatter rewriting right after Plumber's write (${ROUNDS} rounds): the next write and the undo see the new hash`, { timeout: 120000 }, async t => {
  for (let round = 0; round < ROUNDS; round++) {
    const { path, call, read, hash, swap } = await session(t);
    const h0 = await hash();
    const first = await swap(3, 'gap-2', 'gap-3', { hash: h0 });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    // format on save lands right behind it
    await writeFile(path, (await read()).replace(/ \/>/g, '/>'));
    const stale = await swap(4, 'p-[13px]', 'p-3', { hash: first.body.hash });
    assert.equal(stale.status, 400, 'a write with the hash from before the formatter is refused: ' + JSON.stringify(stale.body));
    const undo = await call('undo', { id: first.body.undo.id }, 'POST');
    assert.equal(undo.status, 400, 'undo never restores over the formatter: ' + JSON.stringify(undo.body));
    assert.match(await read(), /gap-3/);
    const fresh = await swap(4, 'p-[13px]', 'p-3', { hash: await hash() });
    assert.equal(fresh.status, 200, JSON.stringify(fresh.body));
    assert.match(await read(), /"p-3"/);
  }
});

test(`a dropped response retried (${ROUNDS} rounds × 5 writes): the same key never applies twice`, { timeout: 120000 }, async t => {
  for (let round = 0; round < ROUNDS; round++) {
    const { read, hash, swap } = await session(t);
    for (let i = 0; i < 5; i++) {
      const [from, to] = i % 2 ? ['gap-3', 'gap-2'] : ['gap-2', 'gap-3'];
      const h = await hash(), key = `k-${round}-${i}`;
      const [first, again, third] = [await swap(3, from, to, { hash: h, key }), await swap(3, from, to, { hash: h, key }), await swap(3, from, to, { hash: h, key })];
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.deepEqual(again, first); assert.deepEqual(third, first);
      assert.equal((await read()).split(to).length - 1, 1, 'applied once');
    }
  }
});

test(`a dev server restart mid-request (${ROUNDS} rounds): the request fails typed and the next server answers`, { timeout: 120000 }, async t => {
  for (let round = 0; round < ROUNDS; round++) {
    const api = await session(t);
    const port = api.port();
    const inflight = api.call('props', { file: 'src/App.tsx', line: 3, column: 3 }).then(r => r.status, error => error.name);
    const closing = api.stop();
    const outcome = await inflight;
    await closing;
    assert.ok(typeof outcome === 'number' || outcome === 'TypeError', String(outcome));
    assert.equal(await fetch(`http://127.0.0.1:${port}/__plumb/health`).then(r => r.status, error => error.name), 'TypeError', 'nothing answers on the old port');
    await api.restart();
    assert.equal((await api.call('health')).body.status, 'ready');
    const r = await api.swap(3, 'gap-2', 'gap-3', { hash: await api.hash() });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
});

// ── through the page, under Vite HMR ─────────────────────
const FILES = {
  'src/App.jsx': `import { One } from './One.jsx';\nimport { Two } from './Two.jsx';\nexport default function App() {\n  return <main id="main">\n    <h1 id="title" className="p-4 gap-2">Title</h1>\n    <One /><Two />\n  </main>;\n}\n`,
  'src/One.jsx': `export function One() {\n  return <p id="one" className="p-[13px]">One</p>;\n}\n`,
  'src/Two.jsx': `export function Two() {\n  return <p id="two" className="mt-[10px]">Two</p>;\n}\n`,
};
async function site(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.stress-page-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q'], { cwd: root });
  await file(root, 'package.json', '{"name":"stress","private":true,"type":"module"}');
  for (const [path, text] of Object.entries(FILES)) await file(root, path, text);
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'src/entry.jsx', `import { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\ncreateRoot(document.getElementById('root')).render(<App />);\n`);
  await file(root, 'index.html', '<html><head><link rel="icon" href="data:,"></head><body><div id="root"></div><script type="module" src="/src/entry.jsx"></script></body></html>');
  const server = await createServer({ root, configFile: false, cacheDir: join(root, '.vite-cache'), logLevel: 'silent',
    plugins: [plumb({ watch: false }), react()],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    server: { host: '127.0.0.1', port: 0, fs: { allow: [repo] }, watch: { usePolling: true, interval: 30 } } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  t.after(() => browser.close());
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForSelector('#two');
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const headers = { Origin: url, 'Content-Type': 'application/json' };
  const hash = async (path, line, column) => (await (await fetch(url + `/__plumb/props?file=${path}&line=${line}&column=${column}`, { headers })).json()).hash;
  const swap = async (path, line, column, from, to) => { const r = await fetch(url + '/__plumb/swaps', { method: 'POST', headers, body: JSON.stringify({ file: path, hash: await hash(path, line, column), edits: [{ line, column, from, to }] }) }); return { status: r.status, body: await r.json() }; };
  return { root, url, page, errors, swap };
}

test(`rapid Apply across files under Vite HMR (${ROUNDS} rounds): every file lands and the page shows the result`, { timeout: 240000 }, async t => {
  for (let round = 0; round < ROUNDS; round++) {
    const { root, page, errors, swap } = await site(t); // a fresh site each round
    const flip = true;
    const writes = [
      ['src/App.jsx', 5, 5, 'gap-2', 'gap-3'],
      ['src/One.jsx', 2, 10, 'p-[13px]', 'p-3'],
      ['src/Two.jsx', 2, 10, 'mt-[10px]', 'mt-2.5'],
    ];
    const results = await Promise.all(writes.map(args => swap(...args)));
    for (const [i, r] of results.entries()) assert.equal(r.status, 200, writes[i][0] + ' ' + JSON.stringify(r.body));
    assert.match(await readFile(join(root, 'src/App.jsx'), 'utf8'), flip ? /gap-3/ : /gap-2/);
    assert.match(await readFile(join(root, 'src/One.jsx'), 'utf8'), /"p-3"/);
    assert.match(await readFile(join(root, 'src/Two.jsx'), 'utf8'), /"mt-2\.5"/);
    await page.waitForFunction(() => document.querySelector('#one')?.className === 'p-3' && document.querySelector('#two')?.className === 'mt-2.5', undefined, { timeout: 20000, polling: 100 });
    // after the updates, the overlay answers about the code on screen
    const one = await page.evaluate(() => window.__plumb.locate(document.querySelector('#one')));
    assert.deepEqual({ file: one.file, line: one.line }, { file: 'src/One.jsx', line: 2 });
    assert.deepEqual(errors, []);
  }
});

test(`a request in flight during a reload (${ROUNDS} rounds × 8): never an answer about the old code`, { timeout: 240000 }, async t => {
  for (let round = 0; round < ROUNDS; round++) {
    const { root, page, errors } = await site(t);
    let text = FILES['src/One.jsx'];
    for (let i = 0; i < 8; i++) {
      const asked = page.evaluate(() => window.__plumb.locate(document.querySelector('#one'), { explain: true }));
      text = '// ' + i + '\n' + text; // every line moves by one
      await writeFile(join(root, 'src/One.jsx'), text);
      const answer = await asked;
      const expected = 2 + i;
      // the answer is the old line (asked before the write), the new line (asked after), or no answer; never another
      assert.ok(answer.location === null || answer.line === expected || answer.line === expected + 1, `round ${round} write ${i}: ${JSON.stringify(answer)}`);
      await page.waitForFunction(line => document.querySelector('#one')?.getAttribute('data-plumb-source')?.startsWith('src/One.jsx:' + line + ':'), expected + 1, { timeout: 20000, polling: 100 });
      const now = await page.evaluate(() => window.__plumb.locate(document.querySelector('#one')));
      assert.equal(now.line, expected + 1, `after write ${i}`);
    }
    assert.deepEqual(errors, []);
  }
});

// ── Next Fast Refresh, webpack and Turbopack ─────────────
async function turbopackRoot() {
  const parts = [repo.replace(/\/$/, ''), dirname(await realpath(join(repo, 'node_modules')))].map((p) => p.split(sep));
  const out = [];
  for (let i = 0; i < parts[0].length && parts.every((p) => p[i] === parts[0][i]); i++) out.push(parts[0][i]);
  return out.join(sep) || sep;
}
test(`rapid Apply across files under Next Fast Refresh, webpack and Turbopack (${ROUNDS} rounds each)`, { timeout: 420000 }, async t => {
  const tpRoot = await turbopackRoot();
  const root = await mkdtemp(join(repo, 'fixtures/.stress-next-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  spawnSync('git', ['init', '-q'], { cwd: root });
  await file(root, 'next.config.mjs', `export default { experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } };\n`);
  await file(root, 'app/layout.jsx', 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n');
  await file(root, 'app/page.jsx', `'use client';\nimport { One } from './One';\nimport { Two } from './Two';\nexport default function Page() {\n  return <main id="main"><One /><Two /></main>;\n}\n`);
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'plumber.config.mjs', "export default { source: ['app/**/*.jsx'], css: 'src/styles.css' };\n");
  await file(root, 'package.json', '{"name":"stress-next","private":true,"type":"module"}\n');
  const run = (args) => { const r = spawnSync(args[0], args.slice(1), { cwd: root, encoding: 'utf8', timeout: 120000 }); assert.equal(r.status, 0, r.stderr + r.stdout); };
  run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--legacy-peer-deps', '--install-links=false', `file:${repo}`]);
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  metadata.dependencies.next = '^16.4.0';
  await writeFile(join(root, 'package.json'), JSON.stringify(metadata));
  run([process.execPath, join(root, 'node_modules/@unlocalhosted/react-plumber/dist/cli.js'), 'install', '--overlay', '--write']);
  await file(root, 'next.config.mjs', `import { withPlumb } from '@unlocalhosted/react-plumber/next/config';\nexport default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } });\n`);
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  t.after(() => browser.close());
  for (const bundler of ['turbopack', 'webpack']) {
    await t.test(bundler, async () => {
      await file(root, 'app/One.jsx', `'use client';\nexport function One() {\n  return <p id="one" className="p-[13px]">One</p>;\n}\n`);
      await file(root, 'app/Two.jsx', `'use client';\nexport function Two() {\n  return <p id="two" className="mt-[10px]">Two</p>;\n}\n`);
      const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', WATCHPACK_POLLING: 'true' }; delete env.NODE_ENV;
      const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', `--${bundler}`, '--hostname', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
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
        await page.goto(url, { timeout: 120000 });
        await page.waitForSelector('#two');
        await page.waitForFunction(() => window.__plumb?.overlay, undefined, { timeout: 60000 });
        await page.evaluate(() => window.__plumb.ready());
        const token = await page.evaluate(() => document.querySelector('script[data-plumb-token]').dataset.plumbToken);
        const headers = { 'x-plumb-token': token, 'Content-Type': 'application/json' };
        const hash = async (path) => (await (await fetch(url + `/__plumb/props?file=${path}&line=3&column=10`, { headers })).json()).hash;
        const swap = async (path, from, to) => { const r = await fetch(url + '/__plumb/swaps', { method: 'POST', headers, body: JSON.stringify({ file: path, hash: await hash(path), edits: [{ line: 3, column: 10, from, to }] }) }); return { status: r.status, body: await r.json() }; };
        // the overlay's module generation advances on the host's update (plumb:updated on the page), as it does on Vite
        await page.evaluate(() => { window.__updates = 0; addEventListener('plumb:updated', () => { window.__updates++; }); });
        for (let round = 0; round < ROUNDS; round++) {
          const flip = round % 2 === 0;
          const updates = await page.evaluate(() => window.__updates);
          // a question in flight while the write lands: its answer is the line it was asked about, or none, never another
          const asked = page.evaluate(() => window.__plumb.locate(document.querySelector('#one'), { explain: true }));
          const results = await Promise.all([swap('app/One.jsx', flip ? 'p-[13px]' : 'p-3', flip ? 'p-3' : 'p-[13px]'), swap('app/Two.jsx', flip ? 'mt-[10px]' : 'mt-2.5', flip ? 'mt-2.5' : 'mt-[10px]')]);
          for (const r of results) assert.equal(r.status, 200, JSON.stringify(r.body));
          const answer = await asked;
          assert.ok(answer.location === null || answer.line === 3, `round ${round}: ${JSON.stringify(answer)}`);
          await page.waitForFunction(([one, two]) => document.querySelector('#one')?.className === one && document.querySelector('#two')?.className === two, [flip ? 'p-3' : 'p-[13px]', flip ? 'mt-2.5' : 'mt-[10px]'], { timeout: 30000, polling: 100 });
          await page.waitForFunction(before => window.__updates > before, updates, { timeout: 10000, polling: 100 }).catch(() => {});
          assert.ok(await page.evaluate(() => window.__updates) > updates, `round ${round}: the page heard the host's update (plumb:updated)`);
          const located = await page.evaluate(() => window.__plumb.locate(document.querySelector('#one')));
          assert.deepEqual({ file: located.file, line: located.line }, { file: 'app/One.jsx', line: 3 }, `round ${round}`);
        }
        assert.deepEqual(errors, []);
        assert.doesNotMatch(logs, /Failed to compile|Unexpected character/);
      } finally {
        await page.close();
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await done;
        await rm(join(root, '.next'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    });
  }
});
