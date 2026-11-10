// A monorepo Next app: apps/web (App Router, server and client components) consuming packages/ui from source through
// a node_modules link, withPlumb, on webpack and Turbopack. Stamps are named from the repository root, the session's
// root is apps/web: every DOM element of apps/web and packages/ui locates via 'stamp' to the right file.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
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
const PAGE = `import { Card } from '@acme/ui';
import { Counter } from '@acme/ui/client';
import { Hero } from '../components/Hero';
export default function Page() {
  return <main id="main">
    <Hero />
    <Card><p id="card-text">In a card</p></Card>
    <Counter />
  </main>;
}
`;
const HERO = `export function Hero() { return <section id="hero"><h1 id="hero-title">Hero</h1></section>; }\n`;
const CARD = `export function Card({ children }) { return <div id="card" className="card"><span id="card-badge">ui</span>{children}</div>; }\n`;
const COUNTER = `'use client';\nimport { useState } from 'react';\nexport function Counter() { const [n, set] = useState(0); return <button id="counter" onClick={() => set(n + 1)}>{n}</button>; }\n`;

test('monorepo: apps/web and packages/ui elements locate via stamp to their repository files, webpack and Turbopack', { timeout: 420000 }, async t => {
  const tpRoot = await turbopackRoot();
  const top = await mkdtemp(join(repo, 'fixtures/.next-mono-'));
  t.after(() => rm(top, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  spawnSync('git', ['init', '-q'], { cwd: top });
  await file(top, 'package.json', '{"name":"acme","private":true}');
  await file(top, 'pnpm-workspace.yaml', 'packages:\n  - apps/*\n  - packages/*\n');
  await file(top, 'packages/ui/package.json', '{"name":"@acme/ui","type":"module","exports":{".":"./src/Card.jsx","./client":"./src/Counter.jsx"}}');
  await file(top, 'packages/ui/src/Card.jsx', CARD);
  await file(top, 'packages/ui/src/Counter.jsx', COUNTER);
  const app = join(top, 'apps/web');
  await file(app, 'next.config.mjs', `export default { experimental: { agentUpgrade: false }, transpilePackages: ['@acme/ui'], turbopack: { root: ${JSON.stringify(tpRoot)} } };\n`);
  await file(app, 'app/layout.jsx', 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n');
  await file(app, 'app/page.jsx', PAGE);
  await file(app, 'components/Hero.jsx', HERO);
  await file(app, 'src/styles.css', '@import "tailwindcss";\n');
  await file(app, 'package.json', '{"name":"web","private":true,"type":"module"}');
  const run = (args) => { const r = spawnSync(args[0], args.slice(1), { cwd: app, encoding: 'utf8', timeout: 240000 }); assert.equal(r.status, 0, r.stderr + r.stdout); };
  run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--legacy-peer-deps', '--install-links=false', '--prefer-offline', `file:${repo}`]);
  // the workspace link, as pnpm makes it
  await mkdir(join(app, 'node_modules/@acme'), { recursive: true });
  await symlink(join(top, 'packages/ui'), join(app, 'node_modules/@acme/ui'));
  const metadata = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'));
  metadata.dependencies.next = '^16.4.0'; metadata.dependencies['@acme/ui'] = 'workspace:*';
  await writeFile(join(app, 'package.json'), JSON.stringify(metadata));
  run([process.execPath, join(app, 'node_modules/@unlocalhosted/react-plumber/dist/cli.js'), 'install', '--overlay', '--write']);
  await file(app, 'next.config.mjs', `import { withPlumb } from '@unlocalhosted/react-plumber/next/config';\nexport default withPlumb({ experimental: { agentUpgrade: false }, transpilePackages: ['@acme/ui'], turbopack: { root: ${JSON.stringify(tpRoot)} } });\n`);
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  t.after(() => browser.close());
  const expected = {
    '#main': ['app/page.jsx', 'apps/web/app/page.jsx'], '#hero': ['components/Hero.jsx', 'apps/web/components/Hero.jsx'], '#hero-title': ['components/Hero.jsx', 'apps/web/components/Hero.jsx'],
    '#card-text': ['app/page.jsx', 'apps/web/app/page.jsx'], '#card': ['../../packages/ui/src/Card.jsx', 'packages/ui/src/Card.jsx'], '#card-badge': ['../../packages/ui/src/Card.jsx', 'packages/ui/src/Card.jsx'],
    '#counter': ['../../packages/ui/src/Counter.jsx', 'packages/ui/src/Counter.jsx'],
  };
  for (const bundler of ['webpack', 'turbopack']) {
    await t.test(bundler, async () => {
      const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }; delete env.NODE_ENV;
      const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', `--${bundler}`, '--hostname', '127.0.0.1', '--port', '0'], { cwd: app, env, stdio: ['ignore', 'pipe', 'pipe'] });
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
        const html = await (await fetch(url)).text();
        assert.match(html, /id="card"[^>]*data-plumb-source="packages\/ui\/src\/Card\.jsx:/, 'the package file is stamped from the repository root in the server HTML');
        await page.goto(url, { timeout: 120000 });
        await page.waitForFunction(() => window.__plumb?.ready, undefined, { timeout: 120000 });
        await page.evaluate(() => window.__plumb.ready());
        const answers = await page.evaluate(selectors => Promise.all(selectors.map(async selector => [selector, document.querySelector(selector)?.getAttribute('data-plumb-source'), await window.__plumb.locate(document.querySelector(selector), { explain: true })])), Object.keys(expected));
        for (const [selector, stamp, found] of answers) {
          const [file, repoPath] = expected[selector];
          assert.ok(stamp?.startsWith(repoPath + ':'), `${selector} stamp ${stamp}`);
          assert.equal(found.via, 'stamp', `${selector}: ${JSON.stringify(found).slice(0, 400)}`);
          assert.equal(found.file, file, selector);
        }
        assert.deepEqual(errors, []);
        assert.doesNotMatch(logs, /Failed to compile/);
        for (const line of logs.split('\n').filter(line => /⚠|Module not found/.test(line))) t.diagnostic(`${bundler}: ${line.trim().slice(0, 200)}`);
      } finally {
        await page.close();
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await done;
        await rm(join(app, '.next'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    });
  }
});
