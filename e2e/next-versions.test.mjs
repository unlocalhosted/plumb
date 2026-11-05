// The route's handoff from next.config must not depend on process env reaching the route's process: on Next 15.5
// with webpack it did not, and every /__plumb request answered 500. withPlumb now also inlines what the route and the
// overlay component need through next.config `env` (compile-time, both bundlers). On Next 15.5 and 16, webpack and
// Turbopack: the route answers 200 and the overlay connects.
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
const chromiumPath = () => (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined;
async function file(root, path, text) { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); }
async function turbopackRoot() {
  const parts = [repo.replace(/\/$/, ''), dirname(await realpath(join(repo, 'node_modules')))].map((p) => p.split(sep));
  const out = [];
  for (let i = 0; i < parts[0].length && parts.every((p) => p[i] === parts[0][i]); i++) out.push(parts[0][i]);
  return out.join(sep) || sep;
}
const VERSIONS = (process.env.PLUMB_NEXT_VERSIONS ?? '15.5.28,workspace').split(',');

for (const version of VERSIONS) test(`Next ${version}: the route answers and the overlay connects, on webpack and Turbopack`, { timeout: 420000 }, async t => {
  const tpRoot = await turbopackRoot();
  const root = await mkdtemp(join(repo, 'fixtures/.next-version-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  spawnSync('git', ['init', '-q'], { cwd: root });
  await file(root, 'next.config.mjs', `export default { experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(tpRoot)} } };\n`);
  await file(root, 'app/layout.jsx', 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n');
  await file(root, 'app/page.jsx', 'export default function Page() { return <main id="main"><h1 id="heading">Heading</h1></main>; }\n');
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'package.json', '{"name":"next-version","private":true,"type":"module"}\n');
  const run = (args) => { const r = spawnSync(args[0], args.slice(1), { cwd: root, encoding: 'utf8', timeout: 240000 }); assert.equal(r.status, 0, r.stderr + r.stdout); };
  const installs = [`file:${repo}`, ...(version === 'workspace' ? [] : [`next@${version}`])];
  run(['npm', 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--legacy-peer-deps', '--install-links=false', '--prefer-offline', ...installs]);
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  if (version === 'workspace') metadata.dependencies.next = '^16.4.0';
  await writeFile(join(root, 'package.json'), JSON.stringify(metadata));
  run([process.execPath, join(root, 'node_modules/@unlocalhosted/react-plumber/dist/cli.js'), 'install', '--overlay', '--write']);
  const nextBin = version === 'workspace' ? join(repo, 'node_modules/next/dist/bin/next') : join(root, 'node_modules/next/dist/bin/next');
  const installed = JSON.parse(await readFile(join(dirname(dirname(dirname(nextBin))), 'package.json'), 'utf8')).version;
  t.diagnostic(`next ${installed}`);
  // the written config, wrapped by install; Turbopack's root for a worktree
  const experimental = installed.startsWith('15.') ? '' : 'experimental: { agentUpgrade: false }, ';
  // two shapes a config takes: the plain wrapped export, and an async function that imports withPlumb itself (as a
  // bench wrapper or a config that loads plugins lazily does)
  // Next 15.5 + webpack lost the handoff with the function shape (the one the bench and lazy-loading configs use)
  const shape = process.env.PLUMB_CONFIG_SHAPE ?? (installed.startsWith('15.') ? 'async' : 'plain');
  await file(root, 'next.config.mjs', shape === 'plain'
    ? `import { withPlumb } from '@unlocalhosted/react-plumber/next/config';\nexport default withPlumb({ ${experimental}turbopack: { root: ${JSON.stringify(tpRoot)} } });\n`
    : `export default async (phase, context) => {\n  const { withPlumb } = await new Function('u', 'return import(u)')('@unlocalhosted/react-plumber/next/config');\n  return withPlumb({ ${experimental}turbopack: { root: ${JSON.stringify(tpRoot)} } });\n};\n`);
  const browser = await chromium.launch({ headless: true, executablePath: chromiumPath() });
  t.after(() => browser.close());
  for (const bundler of ['webpack', 'turbopack']) {
    await t.test(`${installed} ${bundler}`, async () => {
      const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }; delete env.NODE_ENV;
      // Next 15 has no --webpack flag: webpack is its default, --turbopack opts in; Next 16 names both
      const flag = bundler === 'turbopack' ? ['--turbopack'] : installed.startsWith('15.') ? [] : ['--webpack'];
      const child = spawn(process.execPath, [nextBin, 'dev', ...flag, '--hostname', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
      const done = once(child, 'exit');
      let logs = ''; child.stdout.on('data', chunk => logs += chunk); child.stderr.on('data', chunk => logs += chunk);
      const page = await browser.newPage(), consoleLines = [];
      page.on('console', message => consoleLines.push(message.text().slice(0, 200)));
      try {
        let url;
        for (let i = 0; i < 1200; i++) {
          assert.equal(child.exitCode, null, logs);
          if (/Ready in/.test(logs)) { url = /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0]; if (url) break; }
          await delay(50);
        }
        assert.ok(url, logs);
        await page.goto(url, { timeout: 120000 });
        await page.waitForFunction(() => window.__plumb?.ready, undefined, { timeout: 120000 });
        // the route answers: health through the overlay's own token, then ready (which reads the project through it)
        const health = await page.evaluate(async () => {
          const token = document.querySelector('script[data-plumb-token]')?.dataset.plumbToken;
          const response = await fetch('/__plumb/health', { headers: { 'x-plumb-token': token } });
          return { status: response.status, body: await response.text() };
        });
        assert.equal(health.status, 200, `${health.body}\n${logs.split('\n').filter(line => /__plumb|Error|error/.test(line)).slice(-12).join('\n')}`);
        const ready = await page.evaluate(() => window.__plumb.ready());
        assert.equal(ready.status, 'ready', JSON.stringify(ready));
        assert.ok(consoleLines.some(line => /\[plumb\] overlay connected/.test(line)), consoleLines.slice(-10).join(' | '));
        const found = await page.evaluate(() => window.__plumb.locate(document.querySelector('#heading'), { explain: true }));
        assert.equal(found.via, 'stamp', JSON.stringify(found).slice(0, 300));
        assert.doesNotMatch(logs, / 500 in |Failed to compile/);
      } finally {
        await page.close();
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await done;
        await rm(join(root, '.next'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    });
  }
});
