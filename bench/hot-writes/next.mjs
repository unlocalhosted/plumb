// What a React Plumber write does to a Next.js page: does it reload, and does the page keep its state?
// (docs/briefs/no-reload-writes.md, layer 5.) A measurement, not a test: it prints a table.
//
//   node bench/hot-writes/next.mjs            webpack and Turbopack
//   node bench/hot-writes/next.mjs turbopack  one of them
//
// The page has a client component (a counter that was clicked, an input that was typed in) and a server component.
// Each step writes through the session as the overlay does, then reports: page loads, whether the counter and the
// words survived, whether the new class reached the element, how long that took, and what the dev server's
// hot-update socket said.
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const bundlers = process.argv.slice(2).length ? process.argv.slice(2) : ['webpack', 'turbopack'];
const file = async (root, path, text) => { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); };
const at = (text, fragment) => { const offset = text.indexOf(fragment); if (offset < 0) throw new Error(`not in the source: ${fragment}`); const before = text.slice(0, offset); return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') }; };
async function turbopackRoot() {
  const parts = [repo.replace(/\/$/, ''), dirname(await realpath(join(repo, 'node_modules')))].map((p) => p.split(sep));
  const out = [];
  for (let i = 0; i < parts[0].length && parts.every((p) => p[i] === parts[0][i]); i++) out.push(parts[0][i]);
  return out.join(sep) || sep;
}

const LAYOUT = `import './globals.css';
export default function Layout({ children }) { return <html><body>{children}</body></html>; }
`;
const PAGE = `import { Counter } from './Counter';
export default function Page() {
  return <main id="main">
    <p id="server" className="mt-[10px]">drawn on the server</p>
    <Counter />
  </main>;
}
`;
const COUNTER = `'use client';
import { useState } from 'react';
export function Counter() {
  const [n, setN] = useState(0);
  return <div id="client" className="px-[7px]">
    <button id="count" onClick={() => setN(n + 1)}>clicked {n}</button>
    <input id="typed" />
  </div>;
}
`;
const CSS = `@import "tailwindcss";

@theme {
  /* why: compact related items */
  --spacing-s2: 8px;
}
`;

const root = await mkdtemp(join(repo, 'fixtures/.hot-next-'));
const rows = [];
let browser;
try {
  const tpRoot = await turbopackRoot();
  spawnSync('git', ['init', '-q'], { cwd: root });
  await file(root, 'app/layout.jsx', LAYOUT);
  await file(root, 'app/page.jsx', PAGE);
  await file(root, 'app/Counter.jsx', COUNTER);
  await file(root, 'app/globals.css', CSS);
  await file(root, 'postcss.config.mjs', `export default { plugins: { '@tailwindcss/postcss': {} } };\n`);
  await file(root, 'package.json', '{"name":"hot-next","private":true,"type":"module"}\n');
  const run = (args) => { const r = spawnSync(args[0], args.slice(1), { cwd: root, encoding: 'utf8', timeout: 240000 }); if (r.status !== 0) throw new Error(`${args.slice(0, 3).join(' ')}: ${r.stderr}${r.stdout}`); };
  run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--legacy-peer-deps', '--install-links=false', `file:${repo}`, '@tailwindcss/postcss@^4']);
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  metadata.dependencies.next = '^16.4.0';
  await writeFile(join(root, 'package.json'), JSON.stringify(metadata));
  await file(root, 'next.config.mjs', `export default { experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } };\n`);
  run([process.execPath, join(root, 'node_modules/@unlocalhosted/react-plumber/dist/cli.js'), 'install', '--overlay', '--write']);
  await file(root, 'next.config.mjs', `import { withPlumb } from '@unlocalhosted/react-plumber/next/config';\nexport default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } });\n`);
  const sources = { 'app/page.jsx': PAGE, 'app/Counter.jsx': COUNTER };
  const restore = async () => { for (const [path, text] of Object.entries(sources)) await writeFile(join(root, path), text); await writeFile(join(root, 'app/globals.css'), CSS); };

  browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  for (const bundler of bundlers) {
    await restore();
    const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }; delete env.NODE_ENV;
    const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', `--${bundler}`, '--hostname', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const done = once(child, 'exit');
    let logs = ''; child.stdout.on('data', (chunk) => { logs += chunk; }); child.stderr.on('data', (chunk) => { logs += chunk; });
    try {
      let url;
      for (let i = 0; i < 2400 && !url; i++) { if (child.exitCode !== null) throw new Error(logs); if (/Ready in/.test(logs)) url = /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0]; if (!url) await delay(50); }
      if (!url) throw new Error(`next dev never said ready:\n${logs}`);
      const page = await browser.newPage();
      let loads = 0; page.on('load', () => { loads += 1; });
      const said = [];
      page.on('websocket', (ws) => { if (ws.url().includes('/_next/')) ws.on('framereceived', (frame) => { try { const m = JSON.parse(frame.payload); const kind = m.type ?? m.action; if (kind && !/^(ping|pong|isrManifest|devIndicator|appIsrManifest)$/.test(kind)) said.push(kind); } catch { /* binary */ } }); });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
      // the overlay is up and the session has read the project (a cold one says "still reading" for a while)
      const ready = async () => {
        for (let attempt = 0; attempt < 200; attempt++) {
          try {
            await page.waitForFunction(() => window.__plumb?.ready && document.querySelector('#count'), undefined, { timeout: 120000 });
            await page.evaluate(() => window.__plumb.ready());
            return;
          } catch (error) { if (!/Execution context was destroyed|still reading|navigation/i.test(error.message)) throw error; await delay(300); }
        }
        throw new Error('the page never became ready');
      };
      const call = (method, params, verb = 'GET') => page.evaluate(async ([method, params, verb]) => {
        const token = document.querySelector('script[data-plumb-token]')?.dataset.plumbToken;
        const headers = { ...(token ? { 'x-plumb-token': token } : {}), ...(verb === 'POST' ? { 'Content-Type': 'application/json' } : {}) };
        const response = await fetch(`/__plumb/${method}${verb === 'GET' ? `?${new URLSearchParams(params)}` : ''}`, { method: verb, headers, ...(verb === 'POST' ? { body: JSON.stringify(params) } : {}) });
        return { status: response.status, body: await response.json().catch(() => null) };
      }, [method, params, verb]);
      const read = async (method, params) => { for (let i = 0; i < 200; i++) { const r = await call(method, params); if (r.status !== 503 && r.body?.status !== 'starting') return r; await delay(300); } throw new Error(`${method} never answered`); };
      const editOf = async (path, fragment, from, to) => { const text = await readFile(join(root, path), 'utf8'), place = at(text, fragment); const props = await read('props', { file: path, ...place }); if (!props.body?.hash) throw new Error(`props ${path}: ${JSON.stringify(props.body).slice(0, 200)}`); return { file: path, hash: props.body.hash, edits: [{ ...place, from, to }] }; };

      const step = async (name, write, landed) => {
        let row = { bundler, name };
        try {
          await ready();
          await page.click('#count'); await page.fill('#typed', 'my words');
          const before = loads; said.length = 0;
          const began = Date.now();
          const answer = await write();
          if (answer && answer.status !== 200) throw new Error(`refused: ${JSON.stringify(answer.body).slice(0, 240)}`);
          let ms = null;
          try { await page.waitForFunction(landed, undefined, { timeout: 30000, polling: 50 }); ms = Date.now() - began; } catch { /* never landed */ }
          await delay(2500); // anything the dev server still has to say (a late reload)
          const state = await page.evaluate(() => ({ count: document.querySelector('#count')?.textContent, typed: document.querySelector('#typed')?.value })).catch(() => ({}));
          row = { ...row, reloads: loads - before, kept: state.count === 'clicked 1' && state.typed === 'my words' ? 'yes' : `NO (${state.count ?? '?'}, "${state.typed ?? '?'}")`, landed: ms === null ? 'NO' : `${ms} ms`, socket: [...new Set(said)].join(' ') || '-' };
        } catch (error) { row = { ...row, error: error.message.split('\n')[0].slice(0, 200) }; }
        rows.push(row);
        console.log(JSON.stringify(row));
        // each step starts from a fresh page with fresh sources, so a counter is always at zero before its click
        await restore(); await delay(1500); await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      };

      await step('a class in a client component', async () => call('swaps', await editOf('app/Counter.jsx', '<div id="client"', 'px-[7px]', 'px-2'), 'POST'),
        () => document.querySelector('#client')?.className.includes('px-2'));
      await step('a class in a server component', async () => call('swaps', await editOf('app/page.jsx', '<p id="server"', 'mt-[10px]', 'mt-2'), 'POST'),
        () => document.querySelector('#server')?.className.includes('mt-2'));
      await step('apply-all: both files', async () => call('apply-all', { swaps: [await editOf('app/Counter.jsx', '<div id="client"', 'px-[7px]', 'px-2'), await editOf('app/page.jsx', '<p id="server"', 'mt-[10px]', 'mt-2')], trace: { group: `hot-${bundler}-1`, meta: { step: 'Spacing' } } }, 'POST'),
        () => document.querySelector('#client')?.className.includes('px-2') && document.querySelector('#server')?.className.includes('mt-2'));
      await step('apply-all: a new theme token and a class', async () => {
        const spec = await read('spec', {});
        if (!spec.body?.tokens?.file) throw new Error(`no token file in spec: ${JSON.stringify(spec.body?.tokens ?? spec.body).slice(0, 200)}`);
        return call('apply-all', { tokens: [{ file: spec.body.tokens.file, hash: spec.body.tokens.hash, name: '--spacing-hot', value: '13px', why: 'Measured.' }], swaps: [{ ...(await editOf('app/Counter.jsx', '<div id="client"', 'px-[7px]', 'px-hot')) }], trace: { group: `hot-${bundler}-2`, meta: { step: 'Spacing' } } }, 'POST');
      }, () => { const el = document.querySelector('#client'); return el?.className.includes('px-hot') && getComputedStyle(el).paddingLeft === '13px'; });
      await page.close();
    } catch (error) { rows.push({ bundler, name: 'setup', error: error.message.split('\n').slice(0, 6).join(' | ').slice(0, 600) }); console.log(JSON.stringify(rows.at(-1))); }
    finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
      await done;
      await rm(join(root, '.next'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  }
} finally {
  await browser?.close();
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

console.log('\n| Bundler | Write | Page reloads | State kept | New class on the page | Hot-update socket |');
console.log('|---|---|---|---|---|---|');
for (const r of rows) console.log(r.error ? `| ${r.bundler} | ${r.name} | failed: ${r.error} | | | |` : `| ${r.bundler} | ${r.name} | ${r.reloads} | ${r.kept} | ${r.landed} | ${r.socket} |`);
process.exit(0);
