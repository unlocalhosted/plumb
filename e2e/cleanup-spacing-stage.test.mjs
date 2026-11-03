// The spacing pass on the stages added to crafting-ui for the clean-up show (src/pages/sloppy/), reduced to what failed
// on them: crafting-ui's most-used gap is 10px (gap-2.5, a Tailwind half step), so its spaces read as a 2px grid and
// 18/26/34 counted as on the scale (the tracker's sidebar: nothing proposed); the chat answer's grouped 7/7/7 then 18 was
// skipped whole, and moving only some of a size added sizes ("4 → 7 spaces"). Real Vite, React, Tailwind, the real CLI
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
const FILE = 'src/Stage.jsx';
// crafting-ui's spacing as its census has it: gap-2.5 most of all, then the half steps and the 4px grid
const rows = (n, gap) => Array.from({ length: n }, (_, i) => `<ul key="${gap}${i}" className="flex flex-col ${gap}"><li>One</li><li>Two</li><li>Three</li></ul>`).join('\n      ');
const STAGE = `export function Stage() {
  return (
    <main className="flex gap-8 p-8">
      <aside className="w-56">
        <p>Tickety</p>
        <button className="mt-[18px] w-full">New issue</button>
        <nav className="mt-[26px] flex flex-col"><a href="#a">Inbox</a><a href="#b">My issues</a></nav>
        <p className="mt-[34px]">Your teams</p>
        <ul className="mt-[7px] flex flex-col"><li>Web</li><li>Mobile</li></ul>
      </aside>
      <article className="flex flex-col">
        <p>A plan that fits three engineers and twelve weeks:</p>
        <p className="mt-[7px]">Weeks 1–4. Fix checkout and the slow build.</p>
        <p className="mt-[7px]">Weeks 5–9. The new onboarding.</p>
        <p className="mt-[7px]">Weeks 10–12. Polish, docs, and a buffer.</p>
        <p className="mt-[18px]">Copy · Retry</p>
      </article>
      <section className="hidden">
      ${rows(14, 'gap-2.5')}
      ${rows(4, 'gap-1.5')}
      ${rows(4, 'gap-2')}
      ${rows(3, 'gap-3')}
      ${rows(3, 'gap-4')}
      </section>
    </main>
  )
}`;

async function stage(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.cleanup-stage-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/styles.css'), '@import "tailwindcss";\n');
  await writeFile(join(root, FILE), STAGE);
  await writeFile(join(root, 'src/App.jsx'), `import { Stage } from './Stage.jsx';\nexport function App() { return <Stage />; }\n`);
  // the site's other spaces, drawn where the census reads them (hidden lists are not drawn: a second route shows them)
  await writeFile(join(root, FILE), STAGE.replace('className="hidden"', 'className="grid grid-cols-4 gap-6"'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const census = await run('node', [join(repo, 'dist/cli.js'), 'census', '--url', url, '--root', root, '--json'], { cwd: repo, env: process.env, timeout: 240000 });
  assert.ok(JSON.parse(census.stdout).routes.length >= 1, 'the site was read');
  const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => launched.close());
  const page = await launched.newPage({ viewport: { width: 1280, height: 1400 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
  const panel = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText.replace(/\s+/g, ' ') ?? '');
  const until = (re, timeout = 60000) => page.waitForFunction((s) => new RegExp(s).test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx:not([hidden])')?.innerText ?? ''), re.source, { timeout });
  const begin = async () => {
    await page.keyboard.press('Alt+B'); await until(/Clean up this page/);
    await page.keyboard.press('c'); await until(/Apply to this page|already|Next/);
    await page.keyboard.press('ArrowRight'); await until(/spaces between things|already follows/);
  };
  return { root, page, errors, panel, until, begin };
}

test('the stages\' spaces: 18, 26 and 34 are off a 4px scale with half steps, a grouped 7/18 keeps two levels on it, and no size is added', { timeout: 300000 }, async (t) => {
  const s = await stage(t);
  await s.begin();
  const said = await s.panel();
  // 18, 26 and 34 sit halfway between two steps: either is on the scale (the one the site uses more wins)
  for (const m of ['7px → 8px', /18px → (16|20)px/, /26px → (24|28)px/, /34px → (32|36)px/]) assert.ok(typeof m === 'string' ? said.includes(m) : m.test(said), `${m} is proposed: ${said}`);
  const [before, after] = (said.match(/This page has (\d+) different spaces between things\. After this, (\d+)/) ?? []).slice(1).map(Number);
  assert.ok(after <= before, `no size is added: ${before} → ${after}`);
  await s.page.keyboard.press('Enter');
  await s.until(/now follow your scale/, 120000);
  const file = await readFile(join(s.root, FILE), 'utf8');
  assert.doesNotMatch(file, /mt-\[(7|18|26|34)px\]/, 'every drifted margin is written onto the scale');
  assert.match(file, /<p className="mt-2">Weeks 1–4/, 'the grouped answer keeps its inside level, on the scale');
  assert.match(file, /<p className="mt-(4|5)">Copy · Retry/, 'and its between level, on the scale');
  assert.deepEqual(s.errors, []);
});
