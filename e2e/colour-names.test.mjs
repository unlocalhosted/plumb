// Colour roles by name (docs/design/token-spec.md §3, §5): plumber reads a theme however its colours are named, offers
// to rename them onto its own role names only when asked, writes that rename everywhere with one Undo, and builds a
// whole colour system from one brand colour. Real Vite, React, Tailwind, the real CLI and Chromium.
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
// the project's files; a write's temporary file (it is renamed over the file a moment later) is not one of them
const snapshot = async (root) => Object.fromEntries((await Promise.all((await readdir(join(root, 'src'), { recursive: true, withFileTypes: true }))
  .filter((d) => d.isFile() && !d.name.endsWith('.plumb-tmp')).map(async (d) => { const f = join(d.parentPath, d.name); return [f.slice(root.length + 1), await readFile(f, 'utf8').catch((e) => (e.code === 'ENOENT' ? null : Promise.reject(e)))]; })))
  .filter(([, text]) => text !== null));

// crafting-ui's theme shape: short role names, `bg` for the page, `surface-pressed` for the press state, a second ink
const FLAT = `@import "tailwindcss";
:root {
  --bg: oklch(98.7% 0 0); --surface: oklch(100% 0 0); --surface-pressed: oklch(95.6% 0.008 265);
  --fg: oklch(13% 0 0); --fg-muted: oklch(0% 0 0 / 0.62); --line: oklch(0% 0 0 / 0.12);
  --draw: oklch(50.6% 0.289 264.8); --draw-soft: oklch(50.6% 0.289 264.8 / 0.1); --accent: oklch(57% 0.2 28);
}
@theme inline {
  --color-*: initial;
  --color-transparent: transparent; --color-current: currentColor;
  --color-bg: var(--bg); --color-surface: var(--surface); --color-surface-pressed: var(--surface-pressed);
  --color-fg: var(--fg); --color-muted: var(--fg-muted); --color-line: var(--line);
  --color-accent: var(--accent); --color-draw: var(--draw); --color-draw-soft: var(--draw-soft);
}
body { margin: 0; background: var(--bg); color: var(--fg); }
`;
const FLAT_PAGE = `export function Dashboard() {
  return (
    <main id="page" className="min-h-screen bg-bg p-8 text-fg">
      <h1 className="text-fg">Overview</h1>
      <div id="card" className="mt-6 border border-line bg-surface p-4 active:bg-surface-pressed"><p className="text-muted">Orders</p></div>
      <button id="go" className="mt-6 bg-accent px-3 py-2 text-surface">Go</button>
      <p id="ink" className="mt-6 text-draw">A drawing label</p>
    </main>
  )
}`;

// a theme named by job paths, BoardUI's way: category, role, state
const PATHS = `@import "tailwindcss";
@theme inline {
  --color-*: initial;
  --color-transparent: transparent; --color-current: currentColor;
  --color-background-full: oklch(98.7% 0 0); --color-background-primary-default: oklch(100% 0 0);
  --color-text-primary: oklch(13% 0 0); --color-text-secondary: oklch(0% 0 0 / 0.62);
  --color-border-default: oklch(0% 0 0 / 0.12); --color-accent-default: oklch(57% 0.2 28);
}
body { margin: 0; background: var(--color-background-full); color: var(--color-text-primary); }
`;
const PATHS_PAGE = `export function Dashboard() {
  return (
    <main className="min-h-screen bg-background-full p-8 text-text-primary">
      <h1 className="text-text-primary">Overview</h1>
      <div id="written" className="mt-6 border border-border-default bg-[#ffffff] p-4"><p className="text-text-secondary">Revenue</p></div>
    </main>
  )
}`;

// shadcn's own theme and its components' own classes (fixtures/shadcn-system), without the libraries
const SHADCN = await readFile(join(repo, 'fixtures/shadcn-system/src/index.css'), 'utf8');
const SHADCN_PAGE = `// shadcn's own variant classes (fixtures/shadcn-system/src/components/ui), without the libraries
const btn = 'inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4';
export function Dashboard() {
  return (
    <main className="p-10 grid gap-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Team settings</h1>
      <p className="text-muted-foreground text-sm">Invite people and choose what they can see.</p>
      <div className="flex gap-2">
        <button className={\`\${btn} bg-primary text-primary-foreground shadow-xs hover:bg-primary/90\`}>Save</button>
        <button className={\`\${btn} border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50\`}>Cancel</button>
        <button className={\`\${btn} bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80\`}>Export</button>
        <button className={\`\${btn} hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50\`}>More</button>
        <button className={\`\${btn} bg-destructive text-white shadow-xs hover:bg-destructive/90\`}>Remove</button>
      </div>
      <div className="rounded-md border bg-popover text-popover-foreground p-1 w-56 shadow-md">
        {['Owner', 'Editor', 'Viewer'].map((r) => <div key={r} tabIndex={0} className="focus:bg-accent focus:text-accent-foreground hover:bg-accent relative flex w-full cursor-default items-center rounded-sm py-1.5 px-2 text-sm outline-none">{r}</div>)}
      </div>
      <div className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center rounded-lg p-[3px] text-sm">
        <span className="bg-background text-foreground rounded-md px-3 py-1 shadow-sm">Members</span><span className="px-3 py-1">Invites</span>
      </div>
      <button data-state="open" className="rounded-xs opacity-70 data-[state=open]:bg-accent data-[state=open]:text-muted-foreground w-8 h-8">×</button>
    </main>
  );
}`;

async function site(t, theme, dashboard, { alone = false } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.colour-names-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/styles.css'), theme);
  await writeFile(join(root, 'src/Dashboard.jsx'), dashboard);
  await writeFile(join(root, 'src/App.jsx'), `import { Dashboard } from './Dashboard.jsx';\nexport function App() { return <Dashboard />; }\n`);
  // alone: the page's code is only this screen (the demo's other screens use colours in ways of their own)
  if (alone) {
    for (const f of ['Craft.jsx', 'Team.jsx', 'Rules.jsx', 'rules']) await rm(join(root, 'src', f), { recursive: true, force: true });
    await writeFile(join(root, 'src/entry.jsx'), `import { createRoot } from 'react-dom/client';\nimport './styles.css';\nimport { App } from './App.jsx';\ncreateRoot(document.getElementById('root')).render(<App />);\n`);
  }
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
  const panel = async () => { for (let i = 0; ; i++) { try { return await page.evaluate(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx')?.innerText.replace(/\s+/g, ' ') ?? ''); } catch (e) { if (i > 40 || !/context was destroyed|navigation/.test(e.message)) throw e; await page.waitForTimeout(500); } } };
  const until = async (re, timeout = 60000) => { const end = Date.now() + timeout; for (;;) { if (re.test(await panel())) return; if (Date.now() > end) throw new Error(`panel never said ${re}: ${await panel()}`); await page.waitForTimeout(400); } };
  const click = (act) => page.locator('plumb-overlay').locator(`[data-cu="${act}"]`).click();
  // what the page paints, by id: text, background and border colour
  const painted = async (ids) => { for (let i = 0; ; i++) { try { return await page.evaluate((ids) => Object.fromEntries(ids.map((id) => { const c = getComputedStyle(document.getElementById(id)); return [id, [c.color, c.backgroundColor, c.borderTopColor].join(' ')]; })), ids); } catch (e) { if (i > 40 || !/context was destroyed|navigation|null/.test(e.message)) throw e; await page.waitForTimeout(500); } } };
  // Blueprint on, C, then on past text and spacing to the colour pass
  const begin = async () => {
    await page.keyboard.press('Alt+B');
    await until(/Clean up/);
    await page.keyboard.press('c');
    await until(/Apply to this page|already|Next/);
    // the colour step says how it reads colours: by the job each does
    for (let i = 0; i < 4 && !/read by the job it does/.test(await panel()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1500); }
    await until(/read by the job it does/);
  };
  return { root, page, errors, panel, until, click, painted, begin };
}

test('renaming waits behind one entry; asked, it lists plumber\'s role names, writes them everywhere with the colours unchanged, and Undo puts every file back', { timeout: 360000 }, async (t) => {
  const s = await site(t, FLAT, FLAT_PAGE);
  const all = await snapshot(s.root), ids = ['page', 'card', 'go', 'ink'];
  const before = await s.painted(ids);
  await s.begin();
  // only when asked: the colour step shows one quiet entry, not the plan
  const resting = await s.panel();
  assert.match(resting, /Rename my colours…/, resting);
  assert.doesNotMatch(resting, /was bg/, 'the plan is not shown until asked');
  await s.click('names-open');
  const plan = await s.panel();
  // our role names, each with what it was; the second ink keeps the project's own name
  assert.match(plan, /2 of your colour names can take Plumber’s role names/, plan);
  assert.match(plan, /ground was bg/, plan);
  assert.match(plan, /surface-active was surface-pressed/, plan);
  assert.match(plan, /draw/, 'the second ink is named as kept');
  assert.doesNotMatch(plan, /text-primary|background-/, 'no names from outside plumber');
  await s.click('names-go');
  // the write reloads the page; the panel comes back on the colour step, done, with its Undo
  await s.until(/Renamed 2 colour names in \d+ files?\. Every colour looks the same\./, 180000);
  const theme = await readFile(join(s.root, 'src/styles.css'), 'utf8'), page = await readFile(join(s.root, 'src/Dashboard.jsx'), 'utf8');
  assert.match(theme, /--color-ground: var\(--bg\);/); assert.match(theme, /--color-surface-active: var\(--surface-pressed\);/);
  assert.match(theme, /--color-draw: var\(--draw\);/, 'the second ink keeps its name');
  assert.match(page, /bg-ground/); assert.match(page, /active:bg-surface-active/); assert.doesNotMatch(page, /\bbg-bg\b|surface-pressed/);
  assert.deepEqual(await s.painted(ids), before, 'every colour paints as it did');
  await s.click('names-undo');
  for (let i = 0; i < 120 && JSON.stringify(await snapshot(s.root)) !== JSON.stringify(all); i++) await new Promise((r) => setTimeout(r, 500));
  assert.deepEqual(await snapshot(s.root), all, 'Undo put every file back as it was');
  await s.until(/Rename my colours…/, 60000);
  assert.deepEqual(s.errors, []);
});

test('a theme named by job paths is read by role: a white written by hand folds onto that theme\'s own surface, and renaming is only offered', { timeout: 300000 }, async (t) => {
  const s = await site(t, PATHS, PATHS_PAGE);
  await s.begin();
  const said = await s.panel();
  assert.match(said, /#ffffff → background-primary-default/, said);
  assert.doesNotMatch(said, /→ accent/, '"primary" in a path name is not the accent');
  assert.match(said, /Rename my colours…/, 'its names can take plumber\'s role names, offered quietly');
  assert.deepEqual(s.errors, []);
});

test('a shadcn theme is read by what each colour does in the code, not its name: the rename plan gives each its job', { timeout: 300000 }, async (t) => {
  const s = await site(t, SHADCN, SHADCN_PAGE, { alone: true });
  await s.begin();
  await s.click('names-open');
  const plan = await s.panel();
  // `accent` is only ever filled on hover, focus or an open menu: a hover surface, not the brand
  assert.match(plan, /surface-hover was accent/, plan);
  assert.match(plan, /accent was primary/, plan);
  // words named after the brand are the words on it; the other -foreground colours are words, never fills or brand
  assert.match(plan, /on-accent was primary-foreground/, plan);
  assert.match(plan, /muted was muted-foreground/, plan);
  // the raised fill takes surface; a fill darker than the page is set into it
  assert.match(plan, /surface was popover/, plan);
  assert.match(plan, /sunken was muted(?!-)/, plan);
  assert.doesNotMatch(plan, /was input|was accent-foreground|was popover-foreground/, plan);
  assert.deepEqual(s.errors, []);
});

