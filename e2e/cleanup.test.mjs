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

// the stage page on crafting-ui (src/pages/sloppy/SloppyIssuesPage.tsx:36): a nav whose size class sits in a template
// string beside a weight switched by an expression, so one of the text pass's swaps can't be written
const NAV = `export function Nav() {
  return <nav>{['Inbox', 'My issues', 'Projects'].map((n, i) => <a key={n} href="#" className={\`rounded-md px-2 py-1.5 text-[13px] \${i === 1 ? 'font-medium' : 'opacity-90'}\`}>{n}</a>)}</nav>;
}
`;

async function standards(t, { nav = false } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.cleanup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(root, 'src'), { recursive: true });
  if (nav) await writeFile(join(root, 'src/Nav.jsx'), NAV);
  await writeFile(join(root, 'src/App.jsx'), nav
    ? `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';\nimport { Nav } from './Nav.jsx';\nexport function App() { return <><Nav /><MotionStandardsPage /></>; }\n`
    : `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';\nexport function App() { return <MotionStandardsPage />; }\n`);
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
    await until(/Clean up/);
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
  await s.until(/Clean up/);
  assert.doesNotMatch(await s.panel(), /Apply to this page/);
  assert.deepEqual(s.errors, []);
});

// One run at a time (cleanup.js, docs/state-machines/cleanup-spec.md). Apply plays the show before it writes, and the
// show takes a moment: Esc during it used to put the page back yet write anyway, and a second Enter wrote twice.
test('Esc during the show Apply plays writes nothing; Enter twice during it writes once', { timeout: 300000 }, async (t) => {
  const s = await standards(t);
  const original = await readFile(join(s.root, FILE), 'utf8');
  let writes = 0;
  s.page.on('request', (r) => { if (r.method() === 'POST' && /\/apply-all\b/.test(r.url())) writes++; });
  await s.begin();
  // Enter plays the show, then writes; Esc while it plays takes it all back
  await s.page.keyboard.press('Enter');
  await s.until(/Hold Space to compare/, 10000);
  await s.page.keyboard.press('Escape');
  await s.until(/Apply to this page/);
  await s.page.waitForTimeout(4000); // longer than the show: the old code wrote once it ended
  assert.equal(writes, 0, 'Esc during the show writes nothing');
  assert.equal(await readFile(join(s.root, FILE), 'utf8'), original);
  // Enter, and Enter again while the show plays: one write
  await s.page.keyboard.press('Enter');
  await s.until(/Hold Space to compare/, 10000);
  await s.page.keyboard.press('Enter');
  for (let i = 0; i < 4; i++) { try { await s.until(/Undo/, 120000); break; } catch (e) { if (!/context was destroyed|navigation/.test(e.message)) throw e; } }
  await s.page.waitForTimeout(3000);
  assert.equal(writes, 1, 'one Apply, one write');
  assert.deepEqual(s.errors, []);
});

test('the write reloads the page: the clean-up comes back done, with its Undo, and Undo puts every file back', { timeout: 300000 }, async (t) => {
  const s = await standards(t);
  const original = await readFile(join(s.root, FILE), 'utf8'), all = await snapshot(s.root);
  await s.begin();
  await s.page.keyboard.press('Enter');
  // the failure: the page reloaded mid-write and came back without Blueprint or a word about what was written
  // the write's own reload may come after the first page says it: the panel is read once a page has stayed
  let done = '';
  for (let i = 0; i < 4 && !done; i++) { try { await s.until(/Text\s*Saved|places? in \d+ files?|Undo/, 120000); await new Promise((r) => setTimeout(r, 1500)); done = await s.panel(); } catch (e) { if (!/context was destroyed|navigation/.test(e.message)) throw e; } }
  assert.match(done, /Undo/, done);
  assert.notEqual(await readFile(join(s.root, FILE), 'utf8'), original, 'the page\'s own places were swapped');
  await s.page.locator('plumb-overlay').locator('[data-cu="undo"]').click();
  // one undo, more than one file (the page and the theme's tokens): each lands in its own moment
  for (let i = 0; i < 60 && JSON.stringify(await snapshot(s.root)) !== JSON.stringify(all); i++) await new Promise((r) => setTimeout(r, 500));
  assert.deepEqual(await snapshot(s.root), all, 'Undo put every file back as it was');
  await s.until(/Apply to this page/, 60000);
  assert.deepEqual(s.errors, []);
});

test('a reload while the write is saving: the clean-up comes back done, with its Undo, not offering the pass again', { timeout: 300000 }, async (t) => {
  const s = await standards(t);
  const original = await readFile(join(s.root, FILE), 'utf8'), all = await snapshot(s.root);
  await s.begin();
  await s.page.keyboard.press('Enter');
  // the failure, on the fixture: the file was written, and the page came back offering the text pass again, its record
  // stuck at "writing", with no word of the write and no Undo
  await s.page.waitForFunction(() => JSON.parse(sessionStorage.getItem('plumb:cleanup') ?? 'null')?.state === 'writing', null, { timeout: 60000, polling: 10 });
  await s.page.reload();
  // the write's own reload may follow the first one: the panel is read once a page has stayed
  let done = '';
  for (let i = 0; i < 4 && !done; i++) { try { await s.until(/places? in \d+ files?/, 60000); await new Promise((r) => setTimeout(r, 1500)); done = await s.panel(); } catch (e) { if (!/context was destroyed|navigation/.test(e.message)) throw e; } }
  assert.match(done, /Undo/, done);
  assert.doesNotMatch(done, /Apply to this page/, done);
  assert.notEqual(await readFile(join(s.root, FILE), 'utf8'), original, 'the write landed');
  await s.page.locator('plumb-overlay').locator('[data-cu="undo"]').click();
  // one undo, more than one file (the page and the theme's tokens): each lands in its own moment
  for (let i = 0; i < 60 && JSON.stringify(await snapshot(s.root)) !== JSON.stringify(all); i++) await new Promise((r) => setTimeout(r, 500));
  assert.deepEqual(await snapshot(s.root), all, 'Undo put every file back as it was');
  assert.deepEqual(s.errors, []);
});

test('a write that partly lands is a step all the same: back after its reload, done with its Undo, saying what was left as it is', { timeout: 300000 }, async (t) => {
  const s = await standards(t, { nav: true });
  const original = await readFile(join(s.root, FILE), 'utf8'), all = await snapshot(s.root);
  await s.begin();
  await s.page.keyboard.press('Enter');
  // the failure, on crafting-ui: one swap of seventeen refused, the other sixteen written, and the reload came back with
  // no Blueprint, no word and no Undo (the step was forgotten as if nothing had landed)
  let done = '';
  for (let i = 0; i < 4 && !done; i++) { try { await s.until(/places? in \d+ files?/, 60000); await new Promise((r) => setTimeout(r, 1500)); done = await s.panel(); } catch (e) { if (!/context was destroyed|navigation/.test(e.message)) throw e; } }
  assert.match(done, /Undo/, done);
  assert.notEqual(await readFile(join(s.root, FILE), 'utf8'), original, 'the places that could be written were');
  assert.match(await readFile(join(s.root, 'src/Nav.jsx'), 'utf8'), /text-\[13px\]/, 'the split one was left as it is');
  await s.page.locator('plumb-overlay').locator('[data-cu="undo"]').click();
  for (let i = 0; i < 60 && JSON.stringify(await snapshot(s.root)) !== JSON.stringify(all); i++) await new Promise((r) => setTimeout(r, 500));
  assert.deepEqual(await snapshot(s.root), all, 'Undo put every file back as it was');
  assert.deepEqual(s.errors, []);
});
