// withPlumb(config) on a real Next app, on both bundlers: a server component and a client component
// each reach the DOM with data-plumb-source, and the overlay's own locate answers via 'stamp' with the exact file:line:col.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function file(root, path, source) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), source);
}
const SERVER = `export default function Page() {
  return (
    <main>
      <h1 id="server-heading">Server heading</h1>
      <Client />
    </main>
  );
}
import Client from './client';
`;
const CLIENT = `'use client';
export default function Client() {
  return <button id="client-button" type="button">Client button</button>;
}
`;

// Turbopack's root must hold the package, the fixture and the node_modules this tree links from (a worktree links the main checkout's).
async function turbopackRoot() {
  const parts = [repo.replace(/\/$/, ''), dirname(await realpath(join(repo, 'node_modules')))].map((p) => p.split(sep));
  const out = [];
  for (let i = 0; i < parts[0].length && parts.every((p) => p[i] === parts[0][i]); i++) out.push(parts[0][i]);
  return out.join(sep) || sep;
}

test('Next stamp loader: server and client components are located via stamp on webpack and Turbopack', { timeout: 300000 }, async t => {
  const tpRoot = await turbopackRoot();
  const root = await mkdtemp(join(repo, 'fixtures/.next-stamp-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  spawnSync('git', ['init', '-q'], { cwd: root }); // its own repository: stamps name files from the repository root
  await file(root, 'next.config.mjs', `export default { experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } };\n`);
  await file(root, 'app/layout.jsx', 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n');
  await file(root, 'app/page.jsx', SERVER);
  await file(root, 'app/client.jsx', CLIENT);
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'plumber.config.mjs', "export default { source: ['app/**/*.jsx'], css: 'src/styles.css' };\n");
  await file(root, 'package.json', '{"name":"next-stamp-fixture","private":true,"type":"module"}\n');
  const run = (args) => { const r = spawnSync(args[0], args.slice(1), { cwd: root, encoding: 'utf8', timeout: 120000 }); assert.equal(r.status, 0, r.stderr + r.stdout); };
  run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--legacy-peer-deps', '--install-links=false', `file:${repo}`]);
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  metadata.dependencies.next = '^16.4.0';
  await writeFile(join(root, 'package.json'), JSON.stringify(metadata));
  run([process.execPath, join(root, 'node_modules/@unlocalhosted/react-plumber/dist/cli.js'), 'install', '--overlay', '--write']);
  // the install wrapped the config in withPlumb(); the stamps it writes are what this test is about
  await file(root, 'next.config.mjs', `import { withPlumb } from '@unlocalhosted/react-plumber/next/config';
export default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } });
`);
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM });
  t.after(() => browser.close());
  // where the JSX openings are, in the 1-based line and column the stamp uses
  const at = (text, needle) => { const i = text.indexOf(needle); const before = text.slice(0, i).split('\n'); return `${before.length}:${before.at(-1).length + 1}`; };
  const expected = { 'server-heading': ['app/page.jsx', at(SERVER, '<h1')], 'client-button': ['app/client.jsx', at(CLIENT, '<button')] };
  for (const bundler of ['turbopack', 'webpack']) {
    await t.test(bundler, async () => {
      const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }; delete env.NODE_ENV;
      const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', `--${bundler}`, '--hostname', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
      const done = once(child, 'exit');
      let logs = ''; child.stdout.on('data', chunk => logs += chunk); child.stderr.on('data', chunk => logs += chunk);
      const page = await browser.newPage();
      try {
        let url;
        for (let i = 0; i < 1200; i++) {
          assert.equal(child.exitCode, null, logs);
          if (/Ready in/.test(logs)) { url = /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0]; if (url) break; }
          await delay(50);
        }
        assert.ok(url, logs);
        const html = await (await fetch(url).catch((error) => { throw new Error(error.message + '\n' + logs); })).text(); // server-rendered: the stamps are in the HTML before any script runs
        assert.match(html, /id="server-heading"[^>]*data-plumb-source="app\/page\.jsx:/s, 'server component stamp is in the server HTML');
        await page.goto(url, { timeout: 120000 });
        await page.waitForFunction(() => window.__plumb?.overlay, undefined, { timeout: 60000 });
        await page.evaluate(() => window.__plumb.ready());
        for (const [id, [path, position]] of Object.entries(expected)) {
          const dom = await page.locator('#' + id).getAttribute('data-plumb-source');
          assert.match(dom, new RegExp(`^${path.replace('.', '\\.')}:${position}#[a-f0-9]{12}$`), `${id} DOM stamp`);
          const found = await page.evaluate((selector) => window.__plumb.locate(document.querySelector(selector), { explain: true }), '#' + id);
          assert.equal(found.via, 'stamp', `${id}: ${JSON.stringify(found).slice(0, 300)}`);
          assert.match(`${found.file}:${found.line}:${found.column}`, new RegExp(`${path.replace('.', '\\.')}:${position}$`), id);
        }
        assert.doesNotMatch(logs, /Failed to compile|Unexpected character|next-stamp-loader/);
      } finally {
        await page.close();
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await done;
        await rm(join(root, '.next'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    });
  }
});
