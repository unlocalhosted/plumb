// Stroke weight (#50) where the showcase's empty search found it: a stroked icon drawn in a 24-unit box at 48px has a
// 4px line, so it is marked and handed a class that keeps the stroke at the width it's drawn (non-scaling). The same
// icon with that class is not marked. Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const icon = '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M16.5 16.5 21 21" /></svg>';
const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-s6 px-s4 py-s6 text-body">
      <div id="heavy" className="flex flex-col items-center gap-s3">${icon}<span>No notes match</span></div>
      <div id="kept" className="flex flex-col items-center gap-s3 [&>svg_*]:[vector-effect:non-scaling-stroke]">${icon}<span>No notes match</span></div>
    </main>
  );
}
`;

test('a big stroked icon is told to keep its stroke; one that keeps it is not', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  const marks = at(report, 'craft/stroke-weight');
  const heavy = marks.find((f) => f.line === lineOf(APP, 'heavy'));
  assert.ok(heavy, `the 4px stroke is marked: ${JSON.stringify(marks)}`);
  assert.match(heavy.finding.action, /\[&>svg_\*\]:\[vector-effect:non-scaling-stroke\]/, `a class that keeps the stroke: ${heavy.finding.action}`);
  assert.ok(!hasLine(report, 'craft/stroke-weight', lineOf(APP, 'kept')), `the kept stroke is not: ${JSON.stringify(marks)}`);
});
