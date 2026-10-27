// The craft spec (docs/briefs/craft-spec.md), layer 4: a project's config changes what the engine finds and what it
// suggests. The same page, judged twice: against the standard, and against a config that tightens the measure to 70
// characters, asks 44px hit targets, turns a rule off and forbids new tokens. Through the real CLI and the real
// overlay in Chromium, on a Vite dev server with the plugin.
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
const cli = join(repo, 'dist/cli.js');
const run = promisify(execFile);
const built = () => readFile(cli).then(() => true, () => false);

async function fixture(t, { config } = {}) {
  const root = await mkdtemp(join(repo, 'fixtures/.tuning-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'overlay/demo/src'), join(root, 'src'), { recursive: true });
  await cp(join(repo, 'overlay/demo/index.html'), join(root, 'index.html'));
  await writeFile(join(root, 'package.json'), '{"type":"module","dependencies":{"react":"*","vite":"*"}}');
  await writeFile(join(root, 'src/App.jsx'), PAGE);
  if (config) await writeFile(join(root, 'plumber.config.mjs'), config);
  const server = await createServer({ root, cacheDir: join(root, '.vite-cache'), configFile: false, plugins: [tailwindcss(), plumb({ watch: false })],
    oxc: { jsx: { runtime: 'automatic', development: true } }, logLevel: 'silent', server: { host: '127.0.0.1', port: 0 } });
  t.after(() => server.close());
  await server.listen();
  return { root, url: `http://127.0.0.1:${server.httpServer.address().port}/` };
}
const craft = (url, root) => run('node', [cli, 'craft', '--url', url, '--json', '--root', root, '--no-pairs', '--no-probe'], { cwd: repo, env: process.env, timeout: 180000 })
  .then((r) => r, (e) => e).then((r) => JSON.parse(r.stdout));
const lineOf = (id) => PAGE.slice(0, PAGE.indexOf(`id="${id}"`)).split('\n').length;
const found = (report, rule, id) => report.routes[0].findings.find((f) => f.rule === rule && f.line === lineOf(id));

// about 80 characters a line (14px text, half an em a glyph: 560px), four lines; a 32px button; a loose heading; tight capitals
const WORDS = 'Reading text runs best between forty-five and seventy-five characters a line, because the eye has to find the start of the next line on the way back, and a long line makes that return sweep a guess. ';
const PAGE = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-start gap-s6 px-s4 pb-s6 text-ink">
      <p id="measure" className="w-[560px] text-body">${WORDS}${WORDS}</p>
      <button id="hit" aria-label="Close" className="size-8 rounded-control bg-surface text-body">×</button>
      <h1 id="loose" className="text-[40px] leading-[1.6] font-semibold">A heading with a loose line height</h1>
      <span id="caps" className="text-[11px] uppercase">Status</span>
    </main>
  );
}
`;
const TUNED = `export default {
  craft: {
    values: { legibility: { measure: { max: 70, want: { max: 70 } } }, access: { 'hit-target': { min: 44 } } },
    rules: { 'craft/leading': false },
    tokens: { create: false },
  },
};
`;

test('plumber craft judges by the project’s config: a tighter measure and a bigger hit target find more, a rule off finds nothing, and no token is proposed where the config forbids one', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const standard = await fixture(t);
  const a = await craft(standard.url, standard.root);
  assert.equal(a.spec.preset, 'balanced');
  assert.equal(found(a, 'craft/measure', 'measure'), undefined, '80 characters a line is under the standard’s 90');
  assert.equal(found(a, 'craft/hit-target', 'hit'), undefined, '32px is over the standard’s 24');
  assert.equal(found(a, 'craft/leading', 'loose')?.suggest.kind, 'token', 'the loose heading is offered a leading token');
  assert.equal(found(a, 'craft/tracking', 'caps')?.suggest.kind, 'token', 'the capitals are offered a tracking token');

  const tuned = await fixture(t, { config: TUNED });
  const b = await craft(tuned.url, tuned.root);
  const measure = found(b, 'craft/measure', 'measure');
  assert.ok(measure, 'with the measure at 70, 80 characters a line is too long');
  assert.match(measure.title, /About 80 characters a line/);
  const hit = found(b, 'craft/hit-target', 'hit');
  assert.ok(hit, 'with hit targets at 44, a 32px button is too small');
  assert.match(hit.title, /32×32\. People miss anything under 44×44\./);
  assert.equal(found(b, 'craft/leading', 'loose'), undefined, 'the leading rule is off');
  const caps = found(b, 'craft/tracking', 'caps');
  assert.equal(caps?.suggest.kind, 'advice', 'no token where the config forbids one');
  assert.match(caps.suggest.text, /^Use 0\.06em of letter spacing here\.$/);
  assert.equal(b.spec.tokens.create, false);
  assert.deepEqual(b.spec.principles.flatMap((p) => p.rules).find((r) => r.id === 'craft/hit-target').from, { min: 'config' });
});

test('the live overlay judges by the same config: the marks on the page follow it', { timeout: 300000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { url } = await fixture(t, { config: TUNED });
  const browser = await chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1200, height: 1100 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  for (let i = 0; ; i++) {
    try { await page.waitForFunction(() => window.__plumb?.overlay); await page.evaluate(() => window.__plumb.ready()); break; }
    catch (error) { if (i > 2 || !/context was destroyed|navigation/i.test(error.message)) throw error; await page.waitForLoadState('load'); }
  }
  await page.keyboard.press('Alt+B');
  await page.locator('plumb-overlay').locator('.fx[data-settled]').waitFor({ timeout: 20000 }); // the fix panel: every element read
  await page.waitForFunction(() => window.__plumb.overlay.blueprintReader.items.some((i) => i.el.id === 'hit' && i.marks.some((m) => m.rule === 'craft/hit-target')), null, { timeout: 15000 });
  const rules = await page.evaluate(() => Object.fromEntries(['measure', 'hit', 'loose', 'caps'].map((id) => { const i = window.__plumb.overlay.blueprintReader.items.find((x) => x.el.id === id); return [id, (i?.marks ?? []).filter((m) => m.family === 'craft').map((m) => [m.rule, m.craft.suggest.kind])]; })));
  const of = (list, rule) => list.filter(([r]) => r === rule).map(([, kind]) => kind);
  assert.deepEqual(of(rules.measure, 'craft/measure'), ['class'], JSON.stringify(rules));
  assert.deepEqual(of(rules.hit, 'craft/hit-target'), ['advice'], JSON.stringify(rules));
  assert.deepEqual(of(rules.loose, 'craft/leading'), [], JSON.stringify(rules));
  assert.deepEqual(of(rules.caps, 'craft/tracking'), ['advice'], JSON.stringify(rules));
  assert.deepEqual(errors, []);
});
