// "Clean up this page", the spacing pass's proofs (docs/briefs/cleanup-proofs.md file 2; the table in
// docs/briefs/pass-spacing.md "E2E tests"), pass at its default (keep):
//   4 grouping is kept: the aside of crafting-ui's standards page (eyebrow, h2 mt-2, p mt-2, nav mt-5: 8/8/20)
//   5 one rhythm for the site: the same off-scale drift on two pages is moved to the same value
//   6 refuse, don't guess: a gap from gap-[1cqw] and a margin from a stylesheet are not written
//   7 nothing to do is said: a page on its scale says so, offers no Apply, and changes no file
//   8 one step in the history: Apply is one "Spacing" step with its law, and Undo puts every file back
// Fixtures come from crafting-ui's own code (fixtures/crafting-ui-standards = src/pages/MotionStandardsPage.tsx,
// OvershootExample.tsx:172); the sources are quoted at each. Real Vite, React, Tailwind, the real CLI (`plumber census`),
// Chromium, the overlay driven by keys and clicks. Nothing here reads the overlay's code.
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
const SUMMARY = 'font-read text-[0.9375rem]', RULE = 'max-w-[36em]';
const snapshot = async (root) => Object.fromEntries(await Promise.all((await readdir(join(root, 'src'), { recursive: true, withFileTypes: true }))
  .filter((d) => d.isFile()).map(async (d) => { const f = join(d.parentPath, d.name); return [f.slice(root.length + 1), await readFile(f, 'utf8')]; })));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// the words the panel uses (words.js CLEANUP.spacing)
const NOTHING = 'The space on this page already follows your scale.';

// the aside of MotionStandardsPage.tsx:34-46 as its own page: eyebrow, h2, summary, and the nav; `mt` is the summary's margin
const aside = (name, mt, { nav = true } = {}) => `import { Lettering } from '../components/blueprint'
export function ${name}() {
  return (
    <main className="mx-auto max-w-wide px-[clamp(1rem,4vw,2.5rem)] pt-7 pb-16">
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <Lettering><span>Discipline 01</span><span>·</span><span>MOT</span></Lettering>
        <h2 id="disc-motion" className="mt-2 font-read text-[1.125rem] font-semibold tracking-[-0.012em]">Screen rules</h2>
        <p className="mt-${mt} font-read text-[0.9375rem] leading-relaxed text-muted">The rules every clip is checked against, each shown beside its violation.</p>
${nav ? `        <nav aria-label="Screen rules standards" className="mt-5 grid border-t border-line">
          <a href="#a" className="grid grid-cols-[6.5rem_1fr] gap-2 border-b border-line py-2 text-[13px]"><span className="measure text-[11px] text-faint">A1</span><span className="text-muted">Entrances</span></a>
          <a href="#b" className="grid grid-cols-[6.5rem_1fr] gap-2 border-b border-line py-2 text-[13px]"><span className="measure text-[11px] text-faint">A2</span><span className="text-muted">Exits</span></a>
        </nav>
` : ''}      </aside>
    </main>
  )
}
`;
// crafting-ui's OvershootExample.tsx:172-178: a grid whose gap is gap-[1cqw]
const CQW = `export function CqwPage() {
  return (
    <main className="p-8">
      <div className="absolute-none grid gap-[1cqw]">
        <span className="text-[#6b665c]" style={{ fontSize: '2.3cqw' }}>Revenue, year on year</span>
        <span className="inline-flex items-baseline gap-[1.2cqw] font-semibold tabular-nums" style={{ fontSize: '9cqw', lineHeight: 0.9 }}>3.2%</span>
      </div>
    </main>
  )
}
`;
// a margin that comes from a stylesheet rule (crafting-ui keeps some in pages/home/hero.css; none sits on a plain stack,
// so this is the same shape: two paragraphs, the second spaced by `.sheet-next { margin-top: 7px }`)
const SHEET = `import './sheet.css'
export function SheetPage() {
  return (
    <main className="p-8">
      <section>
        <p className="font-read text-[0.9375rem]">The rules every clip is checked against.</p>
        <p className="sheet-next font-read text-[0.9375rem]">Each shown beside its violation.</p>
      </section>
    </main>
  )
}
`;
const SHEET_CSS = `.sheet-next { margin-top: 7px; }\n`;
const STANDARDS_ONLY = `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';\nexport function App() { return <MotionStandardsPage />; }\n`;
// several routes under one nav, so the crawl from `/` finds them all
const router = (routes) => `${routes.map((r, i) => r.import).join('\n')}
export function App() {
  const path = location.pathname;
  return (
    <>
      <nav className="flex gap-4 px-6 pt-4">${routes.map((r) => `<a href="${r.path}">${r.path.slice(1)}</a>`).join('')}</nav>
      ${routes.map((r) => `{path === '${r.path}' ? ${r.element} : null}`).join('\n      ')}
    </>
  );
}
`;

// a project in a temp folder under fixtures/, a dev server, `plumber census`, and a Chromium to drive it
async function site(t, { app = STANDARDS_ONLY, files = {}, drift = false, scheme = 'light' } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.spacing-proofs-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/App.jsx'), app);
  for (const [name, text] of Object.entries(files)) await writeFile(join(root, 'src', name), text);
  if (drift) { // the summary at mt-[7px] and each standard's rule at mt-[18px], as cleanup-spacing.test.mjs
    const page0 = await readFile(join(root, FILE), 'utf8');
    assert.ok(page0.includes(`"mt-2 ${SUMMARY}`) && page0.includes(`"mt-4 ${RULE}`), 'the fixture still has the two margins this test drifts');
    await writeFile(join(root, FILE), page0.replace(`"mt-2 ${SUMMARY}`, `"mt-[7px] ${SUMMARY}`).replace(`"mt-4 ${RULE}`, `"mt-[18px] ${RULE}`));
  }
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const census = await run('node', [join(repo, 'dist/cli.js'), 'census', '--url', url, '--root', root, '--json'], { cwd: repo, env: process.env, timeout: 240000 });
  assert.ok(JSON.parse(census.stdout).routes.length >= 1, 'the site was read');
  const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => launched.close());
  const errors = [];
  const visit = async (route = '/') => {
    const page = await launched.newPage({ viewport: { width: 1280, height: 860 }, colorScheme: scheme });
    page.on('pageerror', (e) => errors.push(`${route}: ${e.message}`));
    await page.goto(new URL(route.slice(1), url).href);
    const ready = () => page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
    await ready();
    const panel = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText.replace(/\s+/g, ' ') ?? '');
    const until = (re, timeout = 60000) => page.waitForFunction((s) => new RegExp(s).test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx:not([hidden])')?.innerText ?? ''), re.source, { timeout });
    const offered = () => page.evaluate(() => !!document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx [data-cu="apply"]'));
    // Blueprint on, C, the text pass skipped (its own button), then the spacing pass read: with moves, or with nothing to do
    const begin = async () => {
      await page.keyboard.press('Alt+B');
      await until(/Clean up this page/);
      await page.keyboard.press('c');
      await until(/Apply to this page|already uses your/);
      await page.locator('plumb-overlay').locator('.fx [data-cu="skip"]').click();
      await until(/spaces between things|already follows your scale/);
    };
    // the distance from each child to the one above it, down every element matching `sel`, as drawn
    const gaps = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((el) => [...el.children].slice(1).map((k, i) => Math.round(k.getBoundingClientRect().top - el.children[i].getBoundingClientRect().bottom)).join('/')), sel);
    // the write landed and the page came back: the clean-up is done again, with its Undo
    const wrote = async (re = /now follows? your scale/) => { await until(re, 120000); await ready(); await until(/Spacing is cleaned up/, 60000); };
    return { page, panel, until, offered, begin, gaps, wrote, ready };
  };
  return { root, errors, visit };
}
const settled = async (root, file, was) => { for (let i = 0; i < 60 && (await readFile(join(root, file), 'utf8')) === was; i++) await sleep(500); };
const asideBlock = (text) => text.slice(text.indexOf('<aside'), text.indexOf('</aside>'));

test('grouping is kept: the aside\'s 8/8/20 is left as it is, in the file and on the page', { timeout: 400000 }, async (t) => {
  const s = await site(t);
  const all = await snapshot(s.root), block = asideBlock(all[FILE]);
  assert.ok(block.includes('"mt-2 mt-2') === false && block.includes('<h2') && block.includes('"mt-5 grid'), 'the fixture still has the aside this test is about');
  const v = await s.visit('/');
  const before = await v.gaps('aside');
  assert.ok(before.length >= 1 && before.every((g) => g === '8/8/20'), `the aside draws 8/8/20: ${before}`);
  await v.begin();
  const read = await v.panel();
  // Apply, if the pass offers it at all (it may move something else on the page, never the aside)
  if (await v.offered()) { await v.page.keyboard.press('Enter'); await v.wrote(/now follows? your scale|Spacing is cleaned up/); await sleep(1500); }
  const now = await readFile(join(s.root, FILE), 'utf8');
  assert.equal(asideBlock(now), block, `the aside's classes are as they were; the panel said: ${read}`);
  assert.deepEqual(await v.gaps('aside'), before, 'the aside still draws 8/8/20');
  assert.deepEqual(s.errors, []);
});

test('one rhythm for the site: the same off-scale margin on two pages is moved to the same value', { timeout: 400000 }, async (t) => {
  // page one: crafting-ui's standards page with its summary at mt-[7px]; page two: the aside again, its summary at mt-[7px]
  const s = await site(t, {
    app: router([{ path: '/standards', import: `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';`, element: '<MotionStandardsPage />' },
      { path: '/aside', import: `import { AsidePage } from './pages/AsidePage.jsx';`, element: '<AsidePage />' }]),
    files: { 'pages/AsidePage.jsx': aside('AsidePage', '[7px]', { nav: false }) }, drift: false,
  });
  const std = await readFile(join(s.root, FILE), 'utf8');
  assert.ok(std.includes(`"mt-2 ${SUMMARY}`));
  await writeFile(join(s.root, FILE), std.replace(`"mt-2 ${SUMMARY}`, `"mt-[7px] ${SUMMARY}`));
  const one = await s.visit('/standards'), two = await s.visit('/aside');
  assert.equal((await one.gaps('aside'))[0].split('/')[1], '7');
  assert.equal((await two.gaps('aside'))[0], '8/7', 'page two draws the same drift');
  await one.begin();
  assert.match(await one.panel(), /7px → 8px/);
  await one.page.keyboard.press('Enter');
  await one.wrote();
  await two.page.reload(); await two.ready();
  await two.begin();
  assert.match(await two.panel(), /7px → 8px/, 'page two is proposed the same value');
  await two.page.keyboard.press('Enter');
  await two.wrote();
  const [a, b] = [await readFile(join(s.root, FILE), 'utf8'), await readFile(join(s.root, 'src/pages/AsidePage.jsx'), 'utf8')];
  assert.ok(a.includes(`"mt-2 ${SUMMARY}`) && !a.includes('mt-[7px]'), 'page one\'s summary is mt-2');
  assert.ok(b.includes('"mt-2 font-read text-[0.9375rem]') && !b.includes('mt-[7px]'), 'page two\'s summary is mt-2');
  await two.page.waitForFunction(() => { const p = document.querySelector('aside p.text-muted'); return p && Math.round(p.getBoundingClientRect().top - p.previousElementSibling.getBoundingClientRect().bottom) === 8; }, null, { timeout: 30000 });
  assert.equal((await one.gaps('aside'))[0].split('/')[1], '8');
  assert.deepEqual(s.errors, []);
});

test('refuse, don\'t guess: a gap from gap-[1cqw] and a margin from a stylesheet are not written', { timeout: 400000 }, async (t) => {
  // a third page, on a class the pass can write, so Apply is really offered and really runs while the other two stay
  const s = await site(t, {
    app: router([{ path: '/control', import: `import { ControlPage } from './pages/ControlPage.jsx';`, element: '<ControlPage />' },
      { path: '/cqw', import: `import { CqwPage } from './pages/CqwPage.jsx';`, element: '<CqwPage />' },
      { path: '/sheet', import: `import { SheetPage } from './pages/SheetPage.jsx';`, element: '<SheetPage />' }]),
    files: { 'pages/ControlPage.jsx': aside('ControlPage', '[7px]', { nav: false }), 'pages/CqwPage.jsx': CQW, 'pages/SheetPage.jsx': SHEET, 'pages/sheet.css': SHEET_CSS },
  });
  const all = await snapshot(s.root);
  // the refused spaces are really drawn off the scale (12.8px from 1cqw at 1280 wide; 7px from the stylesheet)
  const cqw = await s.visit('/cqw'), sheet = await s.visit('/sheet');
  assert.equal((await cqw.gaps('main > div'))[0], '13', 'the cqw gap is drawn');
  assert.equal((await sheet.gaps('section'))[0], '7', 'the stylesheet margin is drawn');
  for (const v of [cqw, sheet]) {
    await v.begin();
    const said = await v.panel();
    assert.equal(await v.offered(), false, `nothing to write, so no Apply: ${said}`);
    await v.page.keyboard.press('Enter');
    await sleep(1500);
  }
  assert.deepEqual(await snapshot(s.root), all, 'the refused pages wrote nothing');
  // the control: Apply runs, writes its own class, and leaves the refused files as they were
  const control = await s.visit('/control');
  await control.begin();
  assert.equal(await control.offered(), true);
  await control.page.keyboard.press('Enter');
  await control.wrote();
  const now = await snapshot(s.root), changed = Object.keys(now).filter((f) => now[f] !== all[f]);
  assert.deepEqual(changed, ['src/pages/ControlPage.jsx'], 'only the page with a class to write changed');
  assert.deepEqual(s.errors, []);
});

test('nothing to do is said: a page on its scale says so, offers no Apply, and changes no file', { timeout: 400000 }, async (t) => {
  const s = await site(t, {
    app: router([{ path: '/aside', import: `import { AsidePage } from './pages/AsidePage.jsx';`, element: '<AsidePage />' }]),
    files: { 'pages/AsidePage.jsx': aside('AsidePage', '2') },
  });
  const all = await snapshot(s.root);
  const v = await s.visit('/aside');
  assert.equal((await v.gaps('aside'))[0], '8/8/20');
  await v.begin();
  const said = await v.panel();
  assert.ok(said.includes(NOTHING), `the panel says there is nothing to do: ${said}`);
  assert.equal(await v.offered(), false, 'Apply is not offered');
  await v.page.keyboard.press('Enter');
  await sleep(1500);
  assert.deepEqual(await snapshot(s.root), all, 'no file changed');
  assert.deepEqual(s.errors, []);
});

test('Apply is one step in the history, named Spacing with the law of proximity, and Undo from it puts every file back', { timeout: 400000 }, async (t) => {
  const s = await site(t, { drift: true });
  const all = await snapshot(s.root);
  const v = await s.visit('/');
  await v.begin();
  await v.page.keyboard.press('Enter');
  await v.wrote();
  assert.notEqual(await readFile(join(s.root, FILE), 'utf8'), all[FILE], 'the write landed');
  await v.page.locator('plumb-overlay').locator('.dock .history').click();
  await v.page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.tt .tt-tick[data-i]').length > 0, null, { timeout: 30000 });
  const read = await v.page.evaluate(() => {
    const root = document.querySelector('plumb-overlay').shadowRoot;
    return { steps: [...root.querySelectorAll('.tt-seg')].map((g) => ({ name: g.querySelector('.tt-name').textContent.trim(), ticks: g.querySelectorAll('.tt-tick').length })),
      laws: [...root.querySelectorAll('.tt-pill:not([hidden]) .tt-law')].map((l) => l.textContent.trim()) };
  });
  // the words the UI uses: the step is "Spacing" (words.js CLEANUP.pass.spacing), its law "Law of proximity" (laws.js)
  assert.equal(read.steps.length, 1, `one step for the write: ${JSON.stringify(read)}`);
  assert.equal(read.steps[0].name, 'Spacing', JSON.stringify(read));
  assert.ok(read.steps[0].ticks >= 2, `a tick for each space written: ${JSON.stringify(read)}`);
  assert.ok(read.laws.includes('Law of proximity'), `the law on the step: ${JSON.stringify(read)}`);
  // the strip redraws while it learns the classes: click the button when it is there and enabled
  await v.page.waitForFunction(() => { const b = document.querySelector('plumb-overlay').shadowRoot.querySelector('.tt-acts [data-act="step"]'); if (b && !b.disabled && !b.hidden) { b.click(); return true; } return false; }, null, { timeout: 30000 });
  for (let i = 0; i < 60 && JSON.stringify(await snapshot(s.root)) !== JSON.stringify(all); i++) await sleep(500);
  assert.deepEqual(await snapshot(s.root), all, 'Undo put every file back as it was');
  assert.deepEqual(s.errors, []);
});
