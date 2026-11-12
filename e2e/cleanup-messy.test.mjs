// "Clean up this page" on a page written the way an LLM writes one (bench/messy: a dashboard in a project whose theme
// names its spacing steps, its colours and its corners by job, which the page only half follows). Each check is a
// decision plumber got wrong on this page, or on crafting-ui, before 2026-11-12:
//   spacing  four 14px gaps and a 20px one were left alone: the scale was read off the code, not the theme's own steps;
//            and padding and gaps in rows were never read at all
//   colour   a row's title was folded onto the grey of the description under it (crafting-ui /interfaces, 105 rows)
//   icons    a 16px icon among four 18px in one nav was not seen; and a size passed as a prop could not be written
//   text     a dashboard's big numbers were folded into a heading style and shrank
//   controls a border added to one button of a pair made it 42px, and nothing read a control's height
//   craft    a theme step nearer the standard's number beat the step the theme names for the job
//   shadows  cards cast a framework shadow while the theme names one for a resting card; nothing read it by job
//   timings  hand-written durations (160ms, 300ms) sit within a fifth of the theme's named speeds (fast, base), which
//            nothing on the page uses yet (so they are only in the stylesheet's source); a 700ms one is a speed of its own
//   disabled three buttons fade to 40, 50 and 60% when disabled; the theme names no disabled opacity
//   corners  no pass: a card at the control's 8px is on a token by value and on the wrong one by job
// Real Vite, React, Tailwind, the real CLI and Chromium; the panel is driven by its keys; every write is read back from
// the source file.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
const FILE = 'src/App.jsx';

// crafting-ui's list row (src/pages/IndexPage: a number, a title drawn stronger than the description under it), in the
// messy project's own tokens: the title is a softened full text colour, the description the muted grey
const ROWS = `export function Rows() {
  const rows = [['01', 'Elastic drag boundaries', 'Resist movement beyond the edge, then spring back.'], ['02', 'Scroll-snap carousel', 'Cards that settle on a boundary when you let go.'], ['03', 'Sticky section headers', 'A heading that stays while its section scrolls under it.']];
  return (
    <ul id="rows" className="flex flex-col gap-s4">
      {rows.map(([n, title, about]) => (
        <li key={n} className="flex items-baseline gap-s3">
          <span className="text-[11px] text-faint">{n}</span>
          <span data-row="title" className="text-[19px] font-medium text-fg/75">{title}</span>
          <span data-row="about" className="text-[16px] text-muted">{about}</span>
        </li>
      ))}
    </ul>
  );
}
`;

async function stage(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.cleanup-messy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'bench/messy/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'bench/messy/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'src/Rows.jsx'), ROWS);
  const app = await readFile(join(root, FILE), 'utf8');
  await writeFile(join(root, FILE), app.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { Rows } from './Rows.jsx';").replace('<Hero />', '<Hero />\n          <Rows />'));
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [plumb({ watch: false }), tailwindcss()],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close()); await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  const census = await run('node', [join(repo, 'dist/cli.js'), 'census', '--url', url, '--root', root, '--json'], { cwd: repo, env: process.env, timeout: 240000 });
  assert.ok(JSON.parse(census.stdout).routes.length >= 1, 'the site was read');
  const launched = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => launched.close());
  const page = await launched.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('plumb-overlay')?.shadowRoot.querySelector('.dock')?.dataset.state === 'ready', null, { timeout: 90000 });
  const panel = () => page.evaluate(() => document.querySelector('plumb-overlay').shadowRoot.querySelector('.fx')?.innerText.replace(/\s+/g, ' ') ?? '').catch(() => '');
  const until = async (re, timeout = 60000) => { for (const end = Date.now() + timeout; Date.now() < end;) { if (re.test(await panel())) return; await page.waitForTimeout(150); } throw new Error(`timeout ${re}: ${await panel()}`); };
  const source = () => readFile(join(root, FILE), 'utf8');
  // the file once a write has landed in it (a write may hot-update the page: the file is the proof, not the panel)
  const written = async (re, timeout = 120000) => { for (const end = Date.now() + timeout; Date.now() < end;) { const text = await source(); if (re.test(text)) return text; await new Promise((r) => setTimeout(r, 300)); } throw new Error(`not written ${re}: ${await panel()}`); };
  // on to the pass whose panel says `re` (→ skips the one in hand, or moves on from one just applied)
  const pass = async (re) => { for (let i = 0; i < 6 && !re.test(await panel()); i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(2000); } await until(re); return panel(); };
  return { root, page, errors, panel, until, source, written, pass };
}

test('a messy page is put back on its own design system: timings on its named speeds, spacing on the theme\'s steps, a title kept apart from its description, the nav\'s odd icon by its prop, corners by job', { timeout: 600000 }, async (t) => {
  const s = await stage(t);

  // a craft suggestion: small capitals with no letter spacing. The theme has two steps in range, `wide` (0.05em, nearest
  // the standard's number) and `caps` (0.08em, named for the job): the one named for the job is the project's answer
  const craft = await s.page.evaluate(async () => (await window.__plumb.craft({ timeout: 60000, hidden: true, scope: 'aside' })).findings.filter((f) => f.rule === 'craft/tracking').map((f) => f.suggest));
  assert.equal(craft.length, 1, JSON.stringify(craft));
  assert.equal(craft[0].to, 'tracking-caps', JSON.stringify(craft[0]));
  assert.match(craft[0].why, /your step for this/, craft[0].why);

  await s.page.keyboard.press('Alt+B'); await s.until(/Clean up/);
  await s.page.keyboard.press('c'); await s.until(/Apply to this page|already|Next/);

  // text: the four stat figures ("142", 30px) are a style of their own; they were folded into the 24px headline with a
  // section title, and would have shrunk by 6px
  const text = await s.panel();
  assert.match(text, /Figure 30px/, text);
  assert.doesNotMatch(text, /30px → 24px/, text);
  // and the words on its buttons are a style of their own, in plain case (labels force capitals)
  assert.match(text, /Button \d+px/, text);

  // spacing: the 14px gaps go to the theme's 16px step, written with the theme's own name
  // and the spacing a stack cannot show: padding and the gap between things in a row, on the same steps
  const spacing = await s.pass(/off your scale|different spaces between things/);
  assert.match(spacing, /This page has 12 different spaces between things\. After this, 8\./, spacing);
  assert.match(spacing, /Padding 20px → 24px/, spacing);
  assert.match(spacing, /Gap in a row 10px → 12px/, spacing);
  await s.page.keyboard.press('Enter');
  const spaced = await s.written(/gap-s4\]?"|gap-s4 |gap-s4"/);
  assert.match(spaced, /className="flex flex-col gap-s4">\s*\{ACTIVITY\.map/, 'the activity list\'s 14px gap is the theme\'s s4');
  assert.match(spaced, /font-semibold text-\[#111827\] mb-s4"/, 'the heading\'s 14px margin is the theme\'s s4');
  assert.doesNotMatch(spaced, /gap-\[14px\]|mb-\[14px\]/, 'no hand-written 14px is left');
  assert.match(spaced, /mt-0\.5/, 'a 2px label gap is a level of its own and stays');
  assert.match(spaced, /rounded-\[14px\] border border-\[#e5e7eb\] p-s4"/, 'a card\'s 18px padding is the theme\'s s4');
  assert.match(spaced, /<div key=\{a\.target \+ a\.when\} className="flex gap-s3">/, 'a 10px gap in a row is the theme\'s s3');
  assert.match(spaced, /font-semibold px-s6 py-2\.5 rounded-lg/, 'a button\'s sides go onto the scale; its top and bottom padding is its height, and stays');
  assert.match(spaced, /px-2 py-0\.5 rounded /, 'a chip\'s 2px padding is a size of its own and stays');

  // icons: the nav's 16px icon is seen among its four 18px peers, and the number is changed where it is written
  const icons = await s.pass(/off your icon system/);
  assert.match(icons, /Size 16px → 18px/, icons);
  await s.page.keyboard.press('Enter');
  const sized = await s.written(/<Chart size=\{18\} stroke=\{1\.5\} \/>/);
  assert.doesNotMatch(sized, /<Bell size=\{18\}/, 'the header bell is not resized to match icons it does not sit with');
  await s.page.waitForFunction(() => [...document.querySelectorAll('nav a svg')].every((x) => x.getAttribute('width') === '18'), null, { timeout: 30000 });

  // corners: each rounded thing takes the theme's step for what it is
  const corners = await s.pass(/corner sizes/);
  assert.match(corners, /This page uses 7 corner sizes\. After this, 4\./, corners);
  assert.match(corners, /Tags 4px → 6px/, corners);
  assert.match(corners, /Controls 6px → 8px/, corners);
  assert.match(corners, /Cards 16px → 12px/, corners);
  await s.page.keyboard.press('Enter');
  const rounded = await s.written(/rounded-card bg-gradient-to-r/);
  assert.match(rounded, /<section className="bg-white rounded-card border border-gray-200">/, 'a card at the control\'s 8px takes the card step');
  assert.match(rounded, /text-sm font-medium px-s4 py-2 rounded-control"/, 'a button at 10px takes the control step');
  assert.match(rounded, /px-2 py-0\.5 rounded-tag \$\{cls\}/, 'a chip takes the tag step');
  assert.match(rounded, /w-\[30px\] h-\[30px\] rounded-\[8px\]/, 'an icon tile does not say what it is and is left');
  assert.match(rounded, /border border-gray-300 rounded px-1">⌘K/, 'a key is not a tag and is left');

  // controls: a height off the spacing steps goes onto them; a border added on top of a 40px button is taken back in
  const controls = await s.pass(/come in \d+ heights|off your spacing steps/);
  assert.match(controls, /Height 42px → 40px/, controls);
  assert.match(controls, /Height 34px → 32px/, controls);
  await s.page.keyboard.press('Enter');
  const heights = await s.written(/border-white\/40[^"\n]*\bh-10\b/);
  assert.match(heights, /border border-gray-300[^"\n]*\bh-s8\b/, 'the bordered 34px button takes the 32px step, by the theme\'s name');
  assert.doesNotMatch(heights, /bg-white text-indigo-700[^"\n]*\bh-10\b/, 'the button only stretched to its neighbour gets no class of its own');

  // shadows: the stat cards cast the framework's shadow-sm; the theme names a shadow for a resting card. The pressed
  // tab's shadow-sm is a control's own state and is left
  const shadows = await s.pass(/different shadows|not the one your theme names/);
  assert.match(shadows, /Cards sm → rest/, shadows);
  await s.page.keyboard.press('Enter');
  const lifted = await s.written(/rounded-xl border border-gray-200 p-s6 shadow-rest"/);
  assert.match(lifted, /bg-white shadow-sm font-medium/, 'a pressed tab keeps its own shadow');

  // Undo takes the shadows back, and only the shadows
  await s.until(/Undo/);
  await s.page.locator('plumb-overlay').locator('[data-cu="undo"]').click();
  const undone = await s.written(/rounded-xl border border-gray-200 p-s6 shadow-sm"/);
  assert.match(undone, /\bh-10\b/, 'the controls step stays written');
  assert.match(undone, /rounded-card bg-gradient-to-r/, 'the corners step stays written');
  assert.match(undone, /<Chart size=\{18\}/, 'the icon step stays written');

  // timings: the theme names two speeds (fast 150ms, base 250ms). The nav's 160ms and the bell's 300ms are those speeds
  // written by hand (within a fifth: no one can tell them apart); the menu button's 700ms is a speed of its own and stays
  const timings = await s.pass(/written by hand where your theme names the speed/);
  assert.match(timings, /160ms → fast/, timings);
  assert.match(timings, /300ms → base/, timings);
  assert.doesNotMatch(timings, /700ms/, timings);
  await s.page.keyboard.press('Enter');
  const timed = await s.written(/text-gray-500 transition-colors duration-base"/);
  assert.match(timed, /text-sm transition-colors duration-fast \$\{active/, 'the nav link takes the fast speed');
  assert.match(timed, /hover:text-gray-600 transition-colors duration-700"/, 'a speed of its own is left');

  // the disabled look: three buttons fade by three amounts when disabled; the theme names none, so Material's 38% on
  // the framework's nearest step (40) is the one. The one already at 40 is left
  const states = await s.pass(/Disabled controls here fade to 3 different amounts\. After this, 1\./);
  assert.match(states, /Material’s 38%/, states);
  await s.page.keyboard.press('Enter');
  const faded = await s.written(/py-1\.5 disabled:opacity-40"/);
  assert.match(faded, /"disabled:opacity-40 flex items-center gap-1\.5 bg-accent/, 'the 50% one takes the one disabled look');
  assert.match(faded, /"disabled:opacity-40 bg-white text-indigo-700/, 'the one already there is left as it was');
  assert.deepEqual(s.errors, []);
});
