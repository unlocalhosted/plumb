// "Clean up this page", the spacing pass, on crafting-ui's standards page (fixtures/crafting-ui-standards) with two
// drifted margins of the kind QA found on crafting-ui: the aside's summary at mt-[7px] (its siblings are mt-2) and each
// standard's rule at mt-[18px] (an 18 on a 4px grid). One test per failure its QA found: the pass crashed reading the
// site's rhythm; with a census too small to name a scale, the drifted values counted as the app's own and 18 was never
// moved; the show's chips drew their values in the theme's ink, white on the light panel in a dark-scheme browser; the
// write's reload threw in the dev server (a source-only write reloads its modules, and Vite 8's server.reloadModule
// takes none of hotUpdate's).
// Real Vite, React, Tailwind, the real CLI and Chromium.
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

async function drifted(t, { scheme = 'light' } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.cleanup-spacing-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await cp(join(repo, 'fixtures/crafting-ui-standards/src'), join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'src/App.jsx'), `import { MotionStandardsPage } from './pages/MotionStandardsPage.tsx';\nexport function App() { return <MotionStandardsPage />; }\n`);
  const page0 = await readFile(join(root, FILE), 'utf8');
  assert.ok(page0.includes(`"mt-2 ${SUMMARY}`) && page0.includes(`"mt-4 ${RULE}`), 'the fixture still has the two margins this test drifts');
  await writeFile(join(root, FILE), page0.replace(`"mt-2 ${SUMMARY}`, `"mt-[7px] ${SUMMARY}`).replace(`"mt-4 ${RULE}`, `"mt-[18px] ${RULE}`));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const census = await run('node', [join(repo, 'dist/cli.js'), 'census', '--url', url, '--root', root, '--json'], { cwd: repo, env: process.env, timeout: 240000 });
  assert.ok(JSON.parse(census.stdout).routes.length >= 1, 'the site was read');
  const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => launched.close());
  const page = await launched.newPage({ viewport: { width: 1280, height: 860 }, colorScheme: scheme });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
  const panel = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText.replace(/\s+/g, ' ') ?? '');
  const until = (re, timeout = 60000) => page.waitForFunction((s) => new RegExp(s).test(document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.fx:not([hidden])')?.innerText ?? ''), re.source, { timeout });
  // the two drifted spaces as drawn: summary below its title, rule below its standard's title (the first one)
  const spaces = `(() => { const gap = (cls) => { const el = document.querySelector('[class*="' + cls + '"]'); return Math.round(el.getBoundingClientRect().top - el.previousElementSibling.getBoundingClientRect().bottom); }; return [gap(${JSON.stringify(SUMMARY)}), gap(${JSON.stringify(RULE)})].join(); })()`;
  const at = (want, timeout = 5000) => page.waitForFunction(`${spaces} === ${JSON.stringify(want)}`, null, { timeout });
  // Blueprint on, C, the text pass skipped: the spacing pass, ready
  const begin = async () => {
    await page.keyboard.press('Alt+B');
    await until(/Clean up this page/);
    await page.keyboard.press('c');
    await until(/Apply to this page|already uses your/);
    await page.keyboard.press('ArrowRight');
    await until(/spaces between things/);
  };
  return { root, page, errors, panel, until, spaces, at, begin };
}

test('the spacing pass moves the drifted margins onto the 4px unit; Preview plays them, held Space compares, Esc puts them back', { timeout: 300000 }, async (t) => {
  const s = await drifted(t, { scheme: 'dark' });
  await s.begin();
  const read = await s.panel();
  // the failures: no pass at all (the rhythm read crashed), then 18 kept as if it were one of the app's own steps
  assert.match(read, /7px → 8px/, read);
  assert.match(read, /18px → 20px/, read);
  assert.equal(await s.page.evaluate(s.spaces), '7,18');
  await s.page.keyboard.press('p');
  await s.until(/Hold Space to compare/);
  await s.page.waitForFunction(() => { const chips = [...(document.querySelector('plumb-overlay')?.shadowRoot.querySelectorAll('.sh-chip') ?? [])]; return chips.length === 2 && chips.every((c) => c.hasAttribute('data-done')); }, null, { timeout: 30000 });
  await s.at('8,20');
  // the failure: in a dark-scheme browser the played chips' values were drawn near-white on the light panel
  const inks = await s.page.evaluate(() => [...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.sh-chip')].map((c) => getComputedStyle(c).color.match(/\d+/g).slice(0, 3).map(Number)));
  for (const ink of inks) assert.ok(ink.every((v) => v < 120), `a chip's value is drawn dark on the light panel: rgb(${ink})`);
  await s.page.keyboard.down(' ');
  await s.at('7,18');
  await s.page.keyboard.up(' ');
  await s.at('8,20');
  await s.page.keyboard.press('Escape');
  await s.until(/spaces between things/);
  await s.at('7,18');
  assert.deepEqual(s.errors, []);
});

test('Apply writes the classes where the margins are, as one step; Undo puts every file back', { timeout: 300000 }, async (t) => {
  const s = await drifted(t);
  const all = await snapshot(s.root);
  await s.begin();
  await s.page.keyboard.press('Enter');
  await s.until(/now follow your scale/, 120000);
  const written = await readFile(join(s.root, FILE), 'utf8');
  assert.ok(written.includes(`"mt-2 ${SUMMARY}`), 'the summary\'s margin is mt-2 again');
  assert.ok(written.includes(`"mt-5 ${RULE}`), 'the rule\'s margin is mt-5 (20px)');
  // the page draws the new spaces from its own classes, with nothing left inline
  await s.at('8,20', 30000);
  assert.equal(await s.page.evaluate(() => document.querySelector('[class*="max-w-[36em]"]').getAttribute('style')), null);
  // the write reloads what it changed: the clean-up comes back done, with its Undo
  await s.until(/Spacing is cleaned up/, 60000);
  await s.page.locator('plumb-overlay').locator('[data-cu="undo"]').click();
  for (let i = 0; i < 60 && (await readFile(join(s.root, FILE), 'utf8')) !== all[FILE]; i++) await new Promise((r) => setTimeout(r, 500));
  assert.deepEqual(await snapshot(s.root), all, 'Undo put every file back as it was');
  await s.until(/spaces between things/, 60000);
  assert.deepEqual(s.errors, []);
});
