// Causes: one value the author meant, however many rules complain about it. Seen from the CLI's `--json` (the
// `causes` list of `plumber check`), the way the project page and the overlay's panel read them.
// The fixture is crafting-ui's white in small: a theme that names white `on-accent` and defines no `white`, so
// `bg-white` renders nothing, `bg-[#ffffff]` and `text-[#fff]` copy the theme's value, and the dead class's nearest
// spelling is the unrelated `bg-warning`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
export const theme = `@import "tailwindcss";
@theme {
  --color-*: initial;
  --spacing: 1px;
  --spacing-s2: 8px; --spacing-s4: 16px;
  --color-accent: #2563eb; --color-warning: #f59e0b;
  --color-on-accent: #ffffff; --color-ink: #111111;
  --text-body: 16px; --text-small: 14px;
}
`;
export const source = `import './styles.css';
export const App = () => <>
  <button id="a" className="bg-white text-[#fff] px-s4">go</button>
  <button id="b" className="bg-white bg-[#ffffff] text-ink">stop</button>
  <p id="c" className="text-white/15 text-[#ffffff]">soft</p>
  <p id="d" className="text-[15px] text-[0.9375rem]">fifteen</p>
  <div id="e" style={{ background: '#FFFFFF' }} />
</>;
`;
export async function project(t) {
  const root = await mkdtemp(join(repo, 'fixtures/.causes-model-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(join(repo, 'fixtures/messages'), root, { recursive: true });
  await writeFile(join(root, 'src/styles.css'), theme);
  await writeFile(join(root, 'src/App.tsx'), source);
  return root;
}
export function check(root) {
  const result = spawnSync(process.execPath, [join(repo, 'dist/cli.js'), 'check', '--root', root, '--json'], { encoding: 'utf8', timeout: 60_000, maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.stderr, ''); assert.ok([0, 1].includes(result.status), result.stdout);
  return JSON.parse(result.stdout);
}
const line = (f) => `${f.rule} ${f.text} -> ${f.choice}`;

test('white is one cause across three rules: every way it was written, which render nothing, and the theme name for it', { timeout: 90000 }, async (t) => {
  const report = check(await project(t));
  // today's findings, per rule: the same white sits under several of them
  const rules = new Set(report.findings.filter(f => f.sites.some(s => /white|#fff/i.test(s.text))).map(f => f.rule));
  assert.ok(rules.has('existence/dead-class') && rules.has('provenance/color/by-value'), [...rules].join());
  // and the dead class's own finding offers the look-alike first
  assert.equal(report.findings.find(f => f.rule === 'existence/dead-class' && f.sites[0].text === 'bg-white').choices[0].name, 'bg-warning');

  assert.ok(Array.isArray(report.causes), 'the report carries causes');
  const white = report.causes.filter(c => c.family === 'color' && c.label === 'white');
  assert.equal(white.length, 1, white.map(c => c.id).join());
  const cause = white[0];
  assert.equal(cause.id, 'value:color:#ffffff');
  // bg-white twice, text-[#fff], bg-[#ffffff], text-[#ffffff] and the inline '#FFFFFF': six places, two render nothing
  assert.equal(cause.count, 6); assert.equal(cause.places.length, 6);
  assert.equal(cause.rendersNothing, 2);
  assert.deepEqual(cause.places.filter(p => p.rendersNothing).map(p => p.text), ['bg-white', 'bg-white']);
  assert.ok(cause.rules.includes('existence/dead-class') && cause.rules.includes('provenance/color/by-value'));
  assert.deepEqual(Object.fromEntries(cause.spellings.map(s => [s.text, s.count])), { white: 2, '#fff': 1, '#ffffff': 3 });
  assert.deepEqual(cause.status, { new: 6, debt: 0, exception: 0 });

  // the answer is the theme's own name for white, for the dead class too; never the nearest-looking class
  assert.equal(cause.suggestion.token, '--color-on-accent');
  assert.equal(cause.suggestion.name, 'on-accent'); assert.equal(cause.suggestion.exact, true);
  assert.ok(!JSON.stringify(cause).includes('warning'), 'the dead class must not point at bg-warning');
  assert.deepEqual(cause.places.filter(p => p.text === 'bg-white').map(p => p.to), ['bg-on-accent', 'bg-on-accent']);
  assert.ok(cause.places.some(p => p.text === 'text-[#fff]' && p.to === 'text-on-accent'));
  // one request per spelling, in the shape apply-all takes (the inline style is a copy too)
  assert.deepEqual(cause.fixes.map(line).sort(), [
    'existence/dead-class bg-white -> bg-on-accent',
    "provenance/color/by-value background: '#FFFFFF' -> --color-on-accent",
    'provenance/color/by-value bg-[#ffffff] -> --color-on-accent',
    'provenance/color/by-value text-[#fff] -> --color-on-accent',
    'provenance/color/by-value text-[#ffffff] -> --color-on-accent',
  ]);
});

test('a different alpha is a different value: white at 15% is its own cause and keeps its alpha in the suggestion', { timeout: 90000 }, async (t) => {
  const report = check(await project(t));
  const soft = report.causes.find(c => c.id === 'value:color:#ffffff/15');
  assert.ok(soft, report.causes.map(c => c.id).join());
  assert.equal(soft.label, 'white at 15%'); assert.equal(soft.count, 1); assert.equal(soft.rendersNothing, 1);
  assert.equal(soft.places[0].to, 'text-on-accent/15');
  assert.equal(soft.suggestion.token, '--color-on-accent'); assert.equal(soft.suggestion.exact, false);
});

test('one size written two ways is one cause: 15px and 0.9375rem, with the nearest step but no exact answer', { timeout: 90000 }, async (t) => {
  const report = check(await project(t));
  const fifteen = report.causes.find(c => c.id === 'value:type:font-size:15px');
  assert.ok(fifteen, report.causes.map(c => c.id).join());
  assert.equal(fifteen.count, 2);
  assert.deepEqual(fifteen.spellings.map(s => s.text).sort(), ['0.9375rem', '15px']);
  assert.ok(!fifteen.suggestion || fifteen.suggestion.exact === false);
  assert.deepEqual(fifteen.fixes, []);
});

test('the biggest cause comes first, and every place in a cause is a place a finding reported', { timeout: 90000 }, async (t) => {
  const report = check(await project(t));
  const counts = report.causes.map(c => c.count);
  assert.deepEqual(counts, [...counts].sort((a, b) => b - a));
  const reported = new Set(report.findings.flatMap(f => f.sites.map(s => `${s.file}:${s.line}:${s.column}`)));
  for (const cause of report.causes) for (const p of cause.places) assert.ok(reported.has(`${p.file}:${p.line}:${p.column}`), `${cause.id} ${p.text}`);
});
