// "Clean up this page", the icon pass, in the panel: the fourth pass after text, spacing and colour, on a nav drawn with
// the app's own icon renderer (crafting-ui src/language/Icon.tsx: 20 grid, 1.5 stroke) and drifting as the stage added to
// crafting-ui does (src/pages/sloppy/SloppyIssuesPage.tsx): one icon at 18px among 20px, one row's gap at 13px among
// 8px, one icon nudged 2px off its label, a hand-drawn svg at stroke 2, emoji on two buttons the family has no mark for.
// Preview eases them onto the system, held Space shows the page as it was, Esc puts it back; Apply writes the classes as
// one Icons step and lists the emoji; Undo puts every file back. Real Vite, React, Tailwind, the real CLI and Chromium.
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
const FILE = 'src/Stage.jsx';
const snapshot = async (root) => Object.fromEntries(await Promise.all((await readdir(join(root, 'src'), { recursive: true, withFileTypes: true }))
  .filter((d) => d.isFile()).map(async (d) => { const f = join(d.parentPath, d.name); return [f.slice(root.length + 1), await readFile(f, 'utf8')]; })));
const STYLES = `@import "tailwindcss";
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
`;

// the renderer: 20 grid, 1.5 stroke, square caps, size-5 by default, its class a template literal (crafting-ui src/language/Icon.tsx)
const ICONS = `export const PATHS = { box: 'M4 4h12v12H4z', bell: 'M5 14V9a5 5 0 0 1 10 0v5l1 1H4z', check: 'M4 10l4 4 8-8', arrow: 'M4 10h12M11 5l5 5-5 5' }
export function Icon({ name, id, className = 'size-5' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" id={id} className={\`block shrink-0 overflow-visible \${className}\`}>
      <path d={PATHS[name] ?? PATHS.box} />
    </svg>
  )
}
`;

const STAGE = `import { Icon } from './icons.jsx'
export function Stage() {
  return (
    <main className="flex gap-10 p-8">
      <nav className="flex w-56 flex-col">
        <a href="#a" className="flex items-center gap-2 py-1.5 text-sm"><Icon name="box" className="size-5" />Inbox</a>
        <a href="#b" className="flex items-center gap-2 py-1.5 text-sm"><Icon name="box" className="size-5" />My issues</a>
        <a href="#c" className="flex items-center gap-2 py-1.5 text-sm"><Icon id="small" name="box" className="size-[18px]" />Projects</a>
        <a id="wide" href="#d" className="flex items-center gap-[13px] py-1.5 text-sm"><Icon name="box" className="size-5" />Views</a>
        <a href="#e" className="flex items-center gap-2 py-1.5 text-sm"><Icon id="low" name="box" className="size-5 translate-y-[2px]" />Cycles</a>
        <a href="#f" className="flex items-center gap-2 py-1.5 text-sm"><Icon name="box" className="size-5" />Web</a>
        <a href="#g" className="flex items-center gap-2 py-1.5 text-sm"><Icon name="box" className="size-5" />Mobile</a>
        <a href="#h" className="flex items-center gap-2 py-1.5 text-sm"><Icon name="box" className="size-5" />Platform</a>
      </nav>
      <header className="flex h-fit gap-2">
        <button className="flex items-center gap-2 px-2 py-1.5 text-sm"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" className="size-5 [stroke-width:2]"><path d="M3.5 5.5h13l-5 6v5l-3-1.5v-3.5z" /></svg>Filter</button>
        <button className="flex items-center gap-2 px-2 py-1.5 text-sm"><span>🔔</span>Notify</button>
        <button className="flex items-center gap-2 px-2 py-1.5 text-sm"><span>⚙️</span>Settings</button>
      </header>
    </main>
  )
}
`;

async function stage(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.cleanup-icons-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/styles.css'), STYLES);
  await writeFile(join(root, 'src/icons.jsx'), ICONS);
  await writeFile(join(root, FILE), STAGE);
  await writeFile(join(root, 'src/App.jsx'), `import { Stage } from './Stage.jsx';\nexport function App() { return <Stage />; }\n`);
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
  const panel = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText.replace(/\s+/g, ' ') ?? '').catch(() => '');
  const until = async (re, timeout = 60000) => { for (const end = Date.now() + timeout; Date.now() < end;) { if (re.test(await panel())) return; await page.waitForTimeout(150); } throw new Error(`timeout ${re}: ${await panel()}`); };
  // what the drifted icons draw: the small one's width, the wide row's gap, the low one's offset from where it would sit
  const drawn = () => page.evaluate(() => [Math.round(document.getElementById('small').getBoundingClientRect().width), Math.round(parseFloat(getComputedStyle(document.getElementById('wide')).columnGap)), getComputedStyle(document.getElementById('low')).translate].join());
  // Blueprint on, C, then on past text, spacing and colour to the icon pass
  const begin = async () => {
    await page.keyboard.press('Alt+B'); await until(/Clean up/);
    await page.keyboard.press('c'); await until(/Apply to this page|already|Next/);
    for (let i = 0; i < 5 && !/off your icon system|already follow your icon system/.test(await panel()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1800); }
    await until(/off your icon system/);
  };
  return { root, page, errors, panel, until, drawn, begin };
}

test('the icon pass puts the drifted icons on the app\'s system; Preview plays them, held Space compares, Esc puts them back; the emoji are said, not swapped', { timeout: 300000 }, async (t) => {
  const s = await stage(t);
  await s.begin();
  const said = await s.panel();
  assert.match(said, /Size 18px → 20px/, said);
  assert.match(said, /Gap 13px → 8px/, said);
  assert.match(said, /Off its label/, said);
  assert.match(said, /2 emoji stay: your icons have no mark for them yet/, said);
  const before = await s.drawn();
  await s.page.keyboard.press('p');
  await s.page.waitForFunction(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.sh-chip')].every((c) => c.hasAttribute('data-done')), null, { timeout: 30000 });
  await s.page.waitForTimeout(700);
  const shown = (await s.drawn()).split(',');
  assert.equal(shown[0], '20', `the small icon is drawn at 20px: ${shown}`);
  assert.equal(shown[1], '8', `the wide row's gap is 8px: ${shown}`);
  await s.page.keyboard.down(' ');
  await s.page.waitForFunction((b) => { const e = (id) => document.getElementById(id); return [Math.round(e('small').getBoundingClientRect().width), Math.round(parseFloat(getComputedStyle(e('wide')).columnGap)), getComputedStyle(e('low')).translate].join() === b; }, before, { timeout: 5000 });
  await s.page.keyboard.up(' ');
  await s.page.keyboard.press('Escape');
  await s.page.waitForTimeout(400);
  assert.equal(await s.drawn(), before, 'Esc puts the page back as it was');
  assert.equal(await s.page.evaluate(() => document.getElementById('small').getAttribute('style')), null, 'no inline size left behind');
  assert.deepEqual(s.errors, []);
});

test('Apply writes the classes where the icons are, as one Icons step; the emoji stay; Undo puts every file back', { timeout: 300000 }, async (t) => {
  const s = await stage(t);
  const all = await snapshot(s.root);
  await s.begin();
  await s.page.keyboard.press('Enter');
  let done = '';
  for (let i = 0; i < 4 && !done; i++) { try { await s.until(/now follows? your icon system/, 120000); await new Promise((r) => setTimeout(r, 1500)); done = await s.panel(); } catch (e) { if (!/context was destroyed|navigation/.test(e.message)) throw e; } }
  const file = await readFile(join(s.root, FILE), 'utf8');
  assert.match(file, /<Icon id="small" name="box" className="size-5" \/>/, file);
  assert.match(file, /id="wide" href="#d" className="flex items-center gap-2 /, file);
  assert.match(file, /<Icon id="low" name="box" className="size-5" \/>/, 'the nudge is removed, not zeroed');
  assert.match(file, /🔔/, 'the emoji with no mark stays');
  assert.match(done, /4 icons in 1 file now follow your icon system/, done);
  assert.match(done, /Undo/, done);
  await s.page.locator('plumb-overlay').locator('[data-cu="undo"]').click();
  for (let i = 0; i < 60 && JSON.stringify(await snapshot(s.root)) !== JSON.stringify(all); i++) await new Promise((r) => setTimeout(r, 500));
  assert.deepEqual(await snapshot(s.root), all, 'Undo put every file back as it was');
  assert.deepEqual(s.errors, []);
});
