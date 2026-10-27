// The recommendation engine (docs/briefs/craft-spec.md §4), layer 3: when the theme has no step for what a rule wants,
// the suggestion is a new token, named and valued from the spec, with the class that uses it; the server writes it into
// the theme in the shape the theme has, then swaps the class, and the page comes back quiet. Real CLI, real server,
// real Chromium, the demo theme (which has no --tracking-* step).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { at, built, fixture, lineOf, plumber } from './helpers/craft-headless.mjs';

const launch = () => chromium.launch({ executablePath: process.env.PLUMBER_CHROMIUM || process.env.PLUMB_CHROMIUM || undefined });

const CAPS = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-start gap-s6 px-s4 pb-s6 text-ink">
      <span id="caps" className="text-[11px] uppercase">Status</span>
      <h1 id="loose" className="text-[40px] leading-[1.6] font-semibold">A heading with a loose line height</h1>
      <p className="text-body">Plain words beside them.</p>
    </main>
  );
}
`;

test('a theme without a tracking step is offered one: --tracking-caps 0.06em, named and valued from the spec, with tracking-caps to use it', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, CAPS);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-pairs', '--no-probe'])).stdout);
  const caps = report.routes[0].findings.find((f) => f.rule === 'craft/tracking' && f.line === lineOf(CAPS, 'caps'));
  assert.ok(caps, JSON.stringify(report.routes[0].findings.map((f) => [f.rule, f.line])));
  const s = caps.suggest;
  assert.equal(s.kind, 'token');
  assert.deepEqual([s.family, s.name, s.value, s.file, s.shape, s.then], ['tracking', '--tracking-caps', '0.06em', 'src/styles.css', 'theme', { from: '', to: 'tracking-caps' }]);
  assert.equal(s.hash, report.spec.tokens.hash, 'the token names the theme file as the server read it');
  assert.match(s.why, /^0\.06em, in the 0\.05em–0\.1em small capitals need$/);
  assert.equal(s.text, 'Add --tracking-caps: 0.06em to your theme, then use tracking-caps here.');
  assert.ok(s.text.length <= 90);
  assert.ok(s.alternatives.some((a) => a.kind === 'advice'), 'advice stays as the last resort');
  // the loose heading wants a leading step the theme lacks, too: the same engine names it
  const loose = report.routes[0].findings.find((f) => f.rule === 'craft/leading' && f.line === lineOf(CAPS, 'loose'));
  assert.ok(loose, 'the loose heading is found');
  assert.deepEqual([loose.suggest.kind, loose.suggest.name, loose.suggest.value, loose.suggest.then.to], ['token', '--leading-display', '1.25', 'leading-display']);
  // the CLI's human report says the same sentence
  const text = await plumber(['--url', url, '--root', root, '--no-pairs', '--no-probe']);
  assert.match(text.stdout, /→ Add --tracking-caps: 0\.06em to your theme, then use tracking-caps here\./);

  // the write: the same request the overlay makes. The token goes into @theme, the class follows, and both are undoable
  const browser = await launch();
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  const post = (body) => page.evaluate(async (b) => { const { post } = await import('/__plumb/src/api.js'); return post('token', b).then((r) => r, (e) => ({ error: e.message })); }, body);
  const then = { file: 'src/App.jsx', hash: caps.hash ?? null, line: caps.line, column: caps.column, from: '', to: 'tracking-caps' };
  // the class swap needs the source file's hash: read it the way the overlay does
  then.hash = await page.evaluate(async () => { const { request } = await import('/__plumb/src/api.js'); return (await request('resolve', { source: 'src/App.jsx', snapshot: '1' })).hash; });
  const written = await post({ file: s.file, hash: s.hash, name: s.name, value: s.value, why: 'small capitals', then });
  assert.equal(written.error, undefined, JSON.stringify(written));
  assert.deepEqual([written.written, written.applied, written.then.applied], [true, ['token:--tracking-caps'], ['swap:']]);
  assert.ok(written.undo && written.then.undo, 'two undo handles');
  const css = await readFile(join(root, 'src/styles.css'), 'utf8');
  assert.match(css, /@theme \{[\s\S]*\/\* why: small capitals \*\/\n  --tracking-caps: 0\.06em;\n\}/, 'the token sits inside the @theme block, with its why');
  assert.match(await readFile(join(root, 'src/App.jsx'), 'utf8'), /className="text-\[11px\] uppercase tracking-caps"/);

  // a stale hash is refused, and nothing is written twice
  const stale = await post({ file: s.file, hash: s.hash, name: '--tracking-caps-2', value: '0.08em' });
  assert.match(stale.error, /changed since|Read it again/);
  assert.equal((await readFile(join(root, 'src/styles.css'), 'utf8')).match(/--tracking-caps/g).length, 1);
  // a file the spec did not name is refused
  const elsewhere = await post({ file: 'src/App.jsx', hash: then.hash, name: '--tracking-x', value: '0.1em' });
  assert.match(elsewhere.error, /Tokens go in src\/styles\.css/);

  // and the page comes back quiet: the capitals now wear a step of the theme
  const again = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-pairs', '--no-probe'])).stdout);
  assert.deepEqual(at(again, 'craft/tracking').map((f) => f.line), []);
});

test('in the live overlay the token suggestion is a verified mark: it keeps the gap where the step would be, and says what fills it', { timeout: 300000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { url } = await fixture(t, CAPS);
  const browser = await launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(url);
  await page.waitForFunction(() => window.__plumb?.overlay);
  await page.evaluate(() => window.__plumb.ready());
  // blueprint on, the page read to the end
  await page.keyboard.press('Alt+B');
  await page.locator('plumb-overlay').locator('.bpp .meta').filter({ hasText: /on this page|Everything matches your system|not checked/ }).waitFor({ timeout: 20000 });
  await page.waitForFunction(() => window.__plumb.overlay.blueprintReader.items.some((i) => i.el.id === 'caps' && i.marks.some((m) => m.rule === 'craft/tracking')), null, { timeout: 15000 });
  // the mark as the overlay holds it: the hollow bar's reason, the proof that the token settles the rule, the sentence
  const mark = await page.evaluate(() => { const item = window.__plumb.overlay.blueprintReader.items.find((i) => i.el.id === 'caps'); const m = item.marks.find((m) => m.rule === 'craft/tracking'); return { whyNot: m.whyNot, proof: m.proof, kind: m.craft.suggest.kind, action: m.action, name: m.craft.suggest.name }; });
  assert.deepEqual(mark, { whyNot: 'no-step', proof: { theme: 'new', quiet: true, above: 'clear' }, kind: 'token', action: 'Add --tracking-caps: 0.06em to your theme, then use tracking-caps here.', name: '--tracking-caps' });
});
