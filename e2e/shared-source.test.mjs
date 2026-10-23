import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
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
const api = (page, method, params = {}, post = false) => page.evaluate(async ({ method, params, post }) => {
  const token = document.querySelector('script[data-plumb-token]')?.dataset.plumbToken;
  const response = await fetch('/__plumb/' + method + (post ? '' : '?' + new URLSearchParams(params)), { method: post ? 'POST' : 'GET', headers: { ...(token ? { 'x-plumb-token': token } : {}), ...(post ? { 'Content-Type': 'application/json' } : {}) }, ...(post ? { body: JSON.stringify(params) } : {}) });
  return { status: response.status, body: await response.json() };
}, { method, params, post });
for (const host of ['vite', 'next']) for (const checked of [false, true]) test(`${host}: shared source ${checked ? 'reads and applies within workspace' : 'never borrows ancestor location'}`, { timeout: 120000 }, async t => {
  const parent = await mkdtemp(join(repo, 'fixtures/.shared-source-'));
  let stop = async () => {};
  t.after(async () => { await stop(); await rm(parent, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); });
  await cp(join(repo, 'fixtures/shared-source'), parent, { recursive: true });
  const root = join(parent, host);
  await writeFile(join(root, 'plumber.config.mjs'), `export default { css: '../src/styles.css', source: ${JSON.stringify(checked ? ['app/**', '../src/**'] : ['app/**'])}, decisions: { spacing: { from: 'css:../src/styles.css' } } };\n`);
  let url;
  if (host === 'vite') {
    const server = await createServer({ root, configFile: false, plugins: [plumb({ watch: false })],
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
  if (checked) {
    assert.equal(found.file, '../src/screens/Board.jsx', JSON.stringify(found));
    if (host === 'vite') assert.equal(found.via, 'stamp');
    const site = await page.$eval('#card', element => window.__plumb.site(element));
    assert.ok(site.findings.length, JSON.stringify(site));
    await page.keyboard.press('Alt+B');
    await page.waitForFunction(() => { const p = window.__plumb.overlay.progress; return p?.total && p.read === p.total; });
    assert.ok((await page.evaluate(() => window.__plumb.overlay.progress)).drift > 0, JSON.stringify({ site, progress: await page.evaluate(() => window.__plumb.overlay.progress), marks: await page.$eval('#card', el => window.__plumb.overlay.readMarks(el)) }));
    const edits = await api(page, 'edits', { file: found.file, line: found.line, column: found.column });
    assert.equal(edits.status, 200, JSON.stringify(edits));
    assert.ok(edits.body.edits.length, JSON.stringify(edits));
    const before = await readFile(join(parent, 'src/screens/Board.jsx'), 'utf8');
    const applied = await api(page, 'apply', { file: found.file, hash: edits.body.hash, edits: [{ id: edits.body.edits[0].id }] }, true);
    assert.equal(applied.status, 200, JSON.stringify(applied));
    assert.notEqual(await readFile(join(parent, 'src/screens/Board.jsx'), 'utf8'), before);
    const windows = await api(page, 'site', { file: '..\\src\\screens\\Board.jsx', line: found.line, column: found.column });
    assert.equal(windows.status, 200, JSON.stringify(windows));
    for (const file of ['../../../../package.json', '..\\..\\..\\..\\package.json', 'C:\\outside\\Board.jsx', '\\\\server\\share\\Board.jsx']) {
      const refused = await api(page, 'edits', { file, line: 1, column: 1 });
      assert.equal(refused.status, 400, JSON.stringify({ file, refused }));
    }
    return;
  }
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
  await page.keyboard.press('Escape');
  await page.keyboard.press('Alt+B');
  await page.waitForFunction(() => { const p = window.__plumb.overlay.progress; return p?.total && p.read === p.total; });
  const progress = await page.evaluate(() => window.__plumb.overlay.progress);
  assert.ok(progress.outsideSource >= 2, JSON.stringify(progress));
  assert.equal(progress.checked + progress.notChecked, progress.total);
  assert.equal(progress.drift, 0); assert.equal(progress.on, 0);
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.dock .say').textContent.includes('not checked'));
  const blueprint = await page.evaluate(() => { const root = document.querySelector('plumb-overlay').shadowRoot; return [root.querySelector('.dock .say').textContent, root.querySelector('.tally').textContent]; });
  for (const text of blueprint) { assert.match(text, /not checked · outside source/); assert.doesNotMatch(text, /all true/); }
  const ready = await api(page, 'readiness');
  assert.equal(ready.status, 200, JSON.stringify(ready));
  const source = ready.body.requirements.find(item => item.id === 'locate.source');
  assert.equal(source.status, 'missing');
  assert.equal(source.evidence[0].file, '../src/screens/Board.jsx');
  assert.equal(source.fix.kind, 'diff', JSON.stringify(source));
  assert.match(source.fix.diff, /"app\/\*\*",\s*"\.\.\/src\/\*\*"/);
  const consent = { id: 'locate.source', hash: source.fix.hash, confirm: true, allowDirty: true };
  const configBefore = await readFile(join(root, 'plumber.config.mjs'), 'utf8');
  for (const request of [{ ...consent, confirm: false }, { ...consent, hash: 'stale' }, { ...consent, allowDirty: false }]) {
    assert.equal((await api(page, 'readiness/fix', request, true)).status, 400);
    assert.equal(await readFile(join(root, 'plumber.config.mjs'), 'utf8'), configBefore);
  }
  const fixed = await api(page, 'readiness/fix', consent, true);
  assert.equal(fixed.status, 200, JSON.stringify(fixed));
  assert.match(await readFile(join(root, 'plumber.config.mjs'), 'utf8'), /"\.\.\/src\/\*\*"/);
  await api(page, 'refresh');
  const after = await api(page, 'readiness');
  assert.equal(after.body.requirements.find(item => item.id === 'locate.source').status, 'ok');
  assert.equal((await page.$eval('#card', el => window.__plumb.locate(el))).file, '../src/screens/Board.jsx');
});

test('source globs refuse workspace escapes and symlinks; Windows selectors select shared files', async t => {
  const { Session, check } = await import('../dist/index.js');
  const parent = await mkdtemp(join(repo, 'fixtures/.source-boundary-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/shared-source'), parent, { recursive: true });
  const root = join(parent, 'vite'), config = join(root, 'plumber.config.mjs');
  for (const pattern of ['../../**/*.jsx', '..\\..\\**\\*.jsx', '../src/**/../../**', 'C:\\outside\\**', '\\\\host\\share\\**']) {
    await writeFile(config, `export default { source: ${JSON.stringify([pattern])} };`);
    await assert.rejects(Session.create({ root, watch: false }), /repository\/workspace root/, pattern);
  }
  await symlink(join(repo, 'src'), join(parent, 'src/escape'));
  await writeFile(config, `export default { source: ['app/**', '..\\\\src\\\\**'] };`);
  const report = await check({ root });
  assert.ok(report.declarations.some(d => d.site.file === join(parent, 'src/screens/Board.jsx')));
  assert.ok(!report.declarations.some(d => d.site.file.includes('/escape/')));
  const session = await Session.create({ root, watch: false }); t.after(() => session.close());
  assert.deepEqual(await session.resolveSource('file://' + join(parent, 'src/escape/index.ts')), { library: true, untracked: '../src/escape/index.ts' });
  await assert.rejects(session.edits('../src/escape/index.ts', 1), /inside the project root/);
  await assert.rejects(session.apply({ file: '../src/escape/index.ts', hash: 'unproved', edits: [{ id: 'unproved' }] }), /inside the project root/);
  const board = join(parent, 'src/screens/Board.jsx');
  await rm(board); await symlink(join(repo, 'src/index.ts'), board);
  for (const method of ['text', 'site', 'edits']) await assert.rejects(session[method]('../src/screens/Board.jsx', 3, 30), /symbolic links/);
});
