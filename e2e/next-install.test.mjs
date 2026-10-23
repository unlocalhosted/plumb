import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo = fileURLToPath(new URL('../', import.meta.url));
function command(root, executable, args) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', timeout: 120000,
    env: { ...process.env, npm_config_update_notifier: 'false' }, maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(result.error); assert.equal(result.status, 0, result.stderr + result.stdout);
  return result.stdout;
}
async function file(root, path, source) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), source);
}

for (const mode of ['linked', 'packed']) test(`Next 16 ${mode} install: overlay and health on Turbopack and webpack`, { timeout: 240000 }, async t => {
  const root = await mkdtemp(join(repo, 'fixtures/.next-install-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  // Next/React come from the workspace; npm installs the actual local package.
  await file(root, 'next.config.mjs', `export default { experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(repo)} } };\n`);
  await file(root, 'app/layout.jsx', 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n');
  await file(root, 'app/page.jsx', 'export default function Page() { return <main>Linked host page</main>; }\n');
  await file(root, 'src/styles.css', '@import "tailwindcss";\n');
  await file(root, 'plumber.config.mjs', "export default { source: ['app/**/*.jsx'], css: 'src/styles.css' };\n");
  // Omit Next from npm's work: it already resolves from the fixture's parent.
  await file(root, 'package.json', '{"name":"next-install-fixture","private":true,"type":"module"}\n');
  const archive = mode === 'packed' ? JSON.parse(command(repo, 'npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', root]))[0].filename : undefined;
  command(root, 'npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--legacy-peer-deps', '--install-links=false', archive ? join(root, archive) : `file:${repo}`]);
  const installed = join(root, 'node_modules/@unlocalhosted/react-plumber');
  assert.equal((await lstat(installed)).isSymbolicLink(), mode === 'linked');
  if (mode === 'linked') assert.equal(await realpath(installed), repo.replace(/\/$/, ''));
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  metadata.dependencies.next = '^16.4.0';
  await writeFile(join(root, 'package.json'), JSON.stringify(metadata));
  command(root, process.execPath, [join(installed, 'dist/cli.js'), 'install', '--overlay', '--write']);
  assert.match(await readFile(join(root, 'app/layout.jsx'), 'utf8'), /@unlocalhosted\/react-plumber\/next\/overlay/);
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM });
  t.after(() => browser.close());
  for (const bundler of ['turbopack', 'webpack']) {
    await t.test(bundler, async () => {
      const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }; delete env.NODE_ENV;
      const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', `--${bundler}`, '--hostname', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
      const done = once(child, 'exit');
      let logs = ''; child.stdout.on('data', chunk => logs += chunk); child.stderr.on('data', chunk => logs += chunk);
      const page = await browser.newPage();
      try {
        let url;
        for (let i = 0; i < 600; i++) {
          assert.equal(child.exitCode, null, logs);
          if (/Ready in/.test(logs)) { url = /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0]; if (url) break; }
          await delay(50);
        }
        assert.ok(url, logs);
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        const response = await page.goto(url, { timeout: 60000 });
        assert.equal(response.status(), 200, logs);
        await page.getByText('Linked host page').waitFor();
        await page.waitForFunction(() => window.__plumb?.overlay, undefined, { timeout: 30000 });
        await page.evaluate(() => window.__plumb.ready());
        const health = await page.evaluate(async () => {
          const token = document.querySelector('script[data-plumb-token]').dataset.plumbToken;
          return (await fetch('/__plumb/health', { headers: { 'x-plumb-token': token } })).json();
        });
        assert.equal(health.status, 'ready', JSON.stringify(health)); assert.equal(health.root, root);
        assert.equal((await fetch(url + '/__plumb/health')).status, 401);
        assert.deepEqual(errors, []);
        assert.doesNotMatch(logs, /Module not found|Unexpected character|Failed to compile/);
      } finally {
        await page.close();
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
        await done;
        await rm(join(root, '.next'), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    });
  }
});
