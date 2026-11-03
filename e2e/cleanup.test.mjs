// "Clean up this page", the text pass, from the fix panel on crafting-ui's standards page (fixtures/crafting-ui-standards)
// after `plumber census` read the site. One test per failure its QA on crafting-ui found: held Space showed the page as
// it was and never brought the preview back (Blueprint's glass took every Space release, its own or not); the write
// reloaded the page and the clean-up was gone, with nothing said and no Undo. Real Vite, React, Tailwind, the real CLI
// and Chromium.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { plumb } from '@unlocalhosted/react-plumber/vite';

const repo = fileURLToPath(new URL('../', import.meta.url));
const run = promisify(execFile);
const FILE = 'src/pages/MotionStandardsPage.tsx';
// every source file's text, to say a write left nothing behind once undone
const snapshot = async (root) => Object.fromEntries(await Promise.all((await readdir(join(root, 'src'), { recursive: true, withFileTypes: true }))
  .filter((d) => d.isFile()).map(async (d) => { const f = join(d.parentPath, d.name); return [f.slice(root.length + 1), await readFile(f, 'utf8')]; })));

async function standards(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.cleanup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/App.jsx'), `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';\nexport function App() { return <MotionStandardsPage />; }\n`);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const census = await run('node', [join(repo, 'dist/cli.js'), 'census', '--url', url, '--root', root, '--json'], { cwd: repo, env: process.env, timeout: 240000 });
  assert.ok(JSON.parse(census.stdout).routes.length >= 1, 'the site was read');
  const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => launched.close());
  const page = await launched.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
  const panel = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText.replace(/\s+/g, ' ') ?? '');
  const until = (re, timeout = 60000) => page.waitForFunction((s) => new RegExp(s).test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx:not([hidden])')?.innerText ?? ''), re.source, { timeout });
  // the page's text as drawn: every stamped element's size, in order
  const sizes = `[...document.querySelectorAll('[data-plumb-source]')].map((e) => getComputedStyle(e).fontSize).join()`;
  const h1 = () => page.evaluate(sizes);
  // Blueprint on, the fixes read, then C: the text pass, ready to apply
  const begin = async () => {
    await page.keyboard.press('Alt+B');
    await until(/Clean up this page/);
    await page.keyboard.press('c');
    await until(/Apply to this page/);
  };
  return { root, page, errors, panel, until, h1, sizes, begin };
}

test('held Space shows the page as it was, and letting go brings the preview back; Esc ends the preview, then the clean-up', { timeout: 300000 }, async (t) => {
  const s = await standards(t);
  await s.begin();
  const before = await s.h1();
  await s.page.keyboard.press('p');
  await s.until(/Hold Space to compare/);
  // the preview plays role by role (each role's marks sweep in before its text moves): read it once every role is set
  await s.page.waitForFunction(() => { const chips = [...(document.querySelector('plumb-overlay')?.shadowRoot.querySelectorAll('.sh-chip') ?? [])]; return chips.length && chips.every((c) => c.hasAttribute('data-done')); }, null, { timeout: 30000 });
  let previewed = await s.h1();
  for (let last = ''; last !== previewed; ) { last = previewed; await s.page.waitForTimeout(300); previewed = await s.h1(); }
  assert.notEqual(previewed, before, 'the preview draws the page in its styles');
  await s.page.keyboard.down(' ');
  await s.page.waitForFunction(`${s.sizes} === ${JSON.stringify(before)}`, null, { timeout: 5000 });
  await s.page.keyboard.up(' ');
  // the failure: the release never reached the clean-up, so the page stayed as it was
  await s.page.waitForFunction(`${s.sizes} === ${JSON.stringify(previewed)}`, null, { timeout: 5000 });
  assert.match(await s.panel(), /Hold Space to compare/, 'still previewing, and Blueprint never let the page through');
  await s.page.keyboard.press('Escape');
  await s.until(/Apply to this page/);
  // Esc put the page back (it glides there)
  await s.page.waitForFunction(`${s.sizes} === ${JSON.stringify(before)}`, null, { timeout: 5000 });
  await s.page.keyboard.press('Escape');
  await s.until(/Clean up this page/);
  assert.doesNotMatch(await s.panel(), /Apply to this page/);
  assert.deepEqual(s.errors, []);
});

test('the write reloads the page: the clean-up comes back done, with its Undo, and Undo puts every file back', { timeout: 300000 }, async (t) => {
  const s = await standards(t);
  const original = await readFile(join(s.root, FILE), 'utf8'), all = await snapshot(s.root);
  await s.begin();
  await s.page.keyboard.press('Enter');
  // the failure: the page reloaded mid-write and came back without Blueprint or a word about what was written
  await s.until(/Text\s*Saved|places? in \d+ files?|Undo/, 120000);
  const done = await s.panel();
  assert.match(done, /Undo/, done);
  assert.notEqual(await readFile(join(s.root, FILE), 'utf8'), original, 'the page\'s own places were swapped');
  await s.page.locator('plumb-overlay').locator('[data-cu="undo"]').click();
  for (let i = 0; i < 60 && (await readFile(join(s.root, FILE), 'utf8')) !== original; i++) await new Promise((r) => setTimeout(r, 500));
  assert.deepEqual(await snapshot(s.root), all, 'Undo put every file back as it was');
  await s.until(/Apply to this page/, 60000);
  assert.deepEqual(s.errors, []);
});
