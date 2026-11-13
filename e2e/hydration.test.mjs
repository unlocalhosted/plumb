// A click right after load: on Next, "overlay ready" used to come before the client's reload-on-hash and React's
// hydration, so the first Alt+click answered no-fiber. The overlay's ready now waits for a hydrated page (and, on
// Next, the client's first sync), and a locate on an element with no fiber yet waits for hydration, bounded, then
// answers. No test-side waiting beyond what a user does: the overlay exists, the user clicks.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROUNDS = Number(process.env.PLUMB_STRESS_ROUNDS ?? 3);
const repo = fileURLToPath(new URL('../', import.meta.url));
const chromiumPath = () => (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined;
async function file(root, path, text) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); }
function position(text, fragment) {
  const offset = text.indexOf(fragment); assert.ok(offset >= 0, fragment);
  const before = text.slice(0, offset);
  return { line: before.split('\n').length, column: offset - before.lastIndexOf('\n') };
}
async function turbopackRoot() {
  const parts = [repo.replace(/\/$/, ''), dirname(await realpath(join(repo, 'node_modules')))].map((p) => p.split(sep));
  const out = [];
  for (let i = 0; i < parts[0].length && parts.every((p) => p[i] === parts[0][i]); i++) out.push(parts[0][i]);
  return out.join(sep) || sep;
}
const PAGE = `'use client';
import Link from 'next/link';
export default function Page() {
  return <main id="main">
    <h1 id="heading">Heading</h1>
    <Link id="link" href="/about" className="link">About</Link>
  </main>;
}
`;

test('Next: a click the moment the overlay exists answers the stamp and the usage, on webpack and Turbopack', { timeout: 420000 }, async t => {
  const tpRoot = await turbopackRoot();
  const root = await mkdtemp(join(repo, 'fixtures/.hydration-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  spawnSync('git', ['init', '-q'], { cwd: root });
  await file(root, 'next.config.mjs', `export default { experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } };\n`);
  await file(root, 'app/layout.jsx', 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n');
  await file(root, 'app/page.jsx', PAGE);
  await file(root, 'app/about/page.jsx', 'export default function About() { return <p>About</p>; }\n');
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'package.json', '{"name":"hydration","private":true,"type":"module"}\n');
  const run = (args) => { const r = spawnSync(args[0], args.slice(1), { cwd: root, encoding: 'utf8', timeout: 120000 }); assert.equal(r.status, 0, r.stderr + r.stdout); };
  run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--legacy-peer-deps', '--install-links=false', `file:${repo}`]);
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  metadata.dependencies.next = '^16.4.0';
  await writeFile(join(root, 'package.json'), JSON.stringify(metadata));
  run([process.execPath, join(root, 'node_modules/@unlocalhosted/react-plumber/dist/cli.js'), 'install', '--overlay', '--write']);
  await file(root, 'next.config.mjs', `import { withPlumb } from '@unlocalhosted/react-plumber/next/config';\nexport default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } });\n`);
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  t.after(() => browser.close());
  const heading = { via: 'stamp', file: 'app/page.jsx', ...position(PAGE, '<h1') }, link = { via: 'usage', file: 'app/page.jsx', ...position(PAGE, '<Link'), component: 'Link' };
  for (const bundler of ['webpack', 'turbopack']) {
    await t.test(bundler, async () => {
      const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }; delete env.NODE_ENV;
      const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', `--${bundler}`, '--hostname', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
      const done = once(child, 'exit');
      let logs = ''; child.stdout.on('data', chunk => logs += chunk); child.stderr.on('data', chunk => logs += chunk);
      try {
        let url;
        for (let i = 0; i < 1200; i++) {
          assert.equal(child.exitCode, null, logs);
          if (/Ready in/.test(logs)) { url = /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0]; if (url) break; }
          await delay(50);
        }
        assert.ok(url, logs);
        for (let round = 0; round < ROUNDS; round++) {
          const page = await browser.newPage();
          try {
            // the user: the page is there, the overlay script has run, click now. If Next's client reloads the page
            // under the click (its first sync on a changed bundle hash), the user clicks again on the page that came.
            const click = async () => {
              await page.waitForFunction(() => window.__plumb?.locate, undefined, { timeout: 60000, polling: 20 });
              return page.evaluate(() => Promise.all([window.__plumb.locate(document.querySelector('#heading'), { explain: true }), window.__plumb.locate(document.querySelector('#link'), { explain: true })]));
            };
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
            let answers;
            for (let attempt = 0; ; attempt++) {
              try { answers = await click(); break; }
              catch (error) {
                // Plumber still reading the project on a cold dev server: the dock says so, the user clicks again
                if (/still reading your project/.test(error.message) && attempt < 100) { await delay(300); continue; }
                if (!/Execution context was destroyed/.test(error.message) || attempt > 2) throw error;
              }
            }
            const [found, usage] = answers;
            if (found.via !== 'stamp') {
              // what the stamp itself resolves to, for the record
              const probe = await page.evaluate(async () => {
                const stamp = document.querySelector('#heading')?.getAttribute('data-plumb-source'), m = /^(.+):(\d+):(\d+)#([a-f0-9]{12})$/.exec(stamp ?? '');
                const token = document.querySelector('script[data-plumb-token]')?.dataset.plumbToken;
                const r = m && await fetch(`/__plumb/resolve?${new URLSearchParams({ source: m[1], line: m[2], column: m[3], hash: m[4], tag: 'h1', stamp: '1' })}`, { headers: { 'x-plumb-token': token } });
                return { stamp, status: r?.status, body: r ? await r.text() : null };
              });
              assert.fail(`round ${round}: ${JSON.stringify(found).slice(0, 200)} probe ${JSON.stringify(probe)}`);
            }
            assert.deepEqual({ via: found.via, file: found.file, line: found.line, column: found.column }, heading, `round ${round}: ${JSON.stringify(found).slice(0, 300)}`);
            assert.deepEqual({ via: usage.via, file: usage.file, line: usage.line, column: usage.column, component: usage.component }, link, `round ${round}: ${JSON.stringify(usage).slice(0, 300)}`);
            // ready resolves on a hydrated page: the element has its fiber by then
            const hydrated = await page.evaluate(async () => { await window.__plumb.ready(); const el = document.querySelector('#heading'); return Object.keys(el).some(key => key.startsWith('__reactFiber$')); });
            assert.equal(hydrated, true, `round ${round}: ready on a hydrated page`);
          } finally { await page.close(); }
        }
        assert.doesNotMatch(logs, /Failed to compile|Unexpected character/);
      } finally {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await done;
        await rm(join(root, '.next'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    });
  }
});
