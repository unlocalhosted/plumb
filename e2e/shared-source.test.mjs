import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
for (const host of ['vite', 'next']) test(`${host}: shared authored source never borrows ancestor location`, { timeout: 120000 }, async t => {
  const parent = await mkdtemp(join(repo, 'fixtures/.shared-source-'));
  let stop = async () => {};
  t.after(async () => { await stop(); await rm(parent, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); });
  await cp(join(repo, 'fixtures/shared-source'), parent, { recursive: true });
  const root = join(parent, host);
  await writeFile(join(root, 'plumber.config.mjs'), "export default { css: '../src/styles.css', source: ['app/**'], decisions: { spacing: { from: 'css:../src/styles.css' } } };\n");
  let url;
  if (host === 'vite') {
    const server = await createServer({ root, configFile: false, plugins: [plumb({ watch: false, stamp: false })],
      oxc: { jsx: { runtime: 'automatic', development: true } }, resolve: { dedupe: ['react', 'react-dom'] },
      logLevel: 'silent', server: { host: '127.0.0.1', port: 0, fs: { allow: [repo] }, watch: null } });
    stop = () => server.close(); await server.listen(); url = `http://127.0.0.1:${server.httpServer.address().port}`;
  } else {
    await mkdir(join(root, 'node_modules/@unlocalhosted'), { recursive: true });
    await symlink(repo, join(root, 'node_modules/@unlocalhosted/react-plumber'));
    const route = join(root, 'app/%5F_plumb/[...path]'); await mkdir(route, { recursive: true });
    await writeFile(join(route, 'route.plumb.ts'), "import { createPlumbRoute } from '@unlocalhosted/react-plumber/next'; export const runtime = 'nodejs'; export const { GET, POST } = createPlumbRoute({ watch: false });\n");
    await writeFile(join(root, 'next.config.mjs'), `import { withPlumb } from '@unlocalhosted/react-plumber/next/config'; export default withPlumb({ experimental: { agentUpgrade: false }, turbopack: { root: ${JSON.stringify(repo)} } });\n`);
    const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }; delete env.NODE_ENV;
    const child = spawn(process.execPath, [join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--turbopack', '--hostname', '127.0.0.1', '--port', '0'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const done = once(child, 'exit'); let logs = '';
    child.stdout.on('data', chunk => logs += chunk); child.stderr.on('data', chunk => logs += chunk);
    stop = async () => { if (child.exitCode === null && child.signalCode === null) { child.kill('SIGTERM'); await done; } };
    for (let i = 0; i < 600; i++) { assert.equal(child.exitCode, null, logs); if (/Ready in/.test(logs)) { url = /http:\/\/127\.0\.0\.1:\d+/.exec(logs)?.[0]; if (url) break; } await delay(50); }
    assert.ok(url, logs);
  }
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLUMBER_CHROMIUM });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(url, { timeout: 60000 });
  await page.waitForFunction(() => window.__plumb && document.getElementById('card'));
  await page.evaluate(() => window.__plumb.ready());
  const found = await page.$eval('#card', element => window.__plumb.locate(element, { explain: true }));
  assert.equal(found.location, null, JSON.stringify(found));
  assert.equal(found.reason, 'resolve-refusal');
  assert.equal(found.detail.file, '../src/screens/Board.jsx');
  assert.equal(await page.$eval('#card', element => window.__plumb.site(element)), null);
  await page.locator('#card').click({ modifiers: ['Alt'] });
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.textContent.includes('not checked: ../src/screens/Board.jsx'));
  const text = await page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.textContent);
  assert.match(text, /outside this project.s source/);
  const explained = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), 'explain', '../src/screens/Board.jsx', '--root', root], { encoding: 'utf8' });
  assert.equal(explained.status, 0, explained.stderr);
  assert.match(explained.stdout, /not checked: Written in ..\/src\/screens\/Board.jsx, outside/);
});
