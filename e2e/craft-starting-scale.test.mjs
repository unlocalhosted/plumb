// Scale from zero (#63) where the showcase's Insert menu found it: an entrance written as a transition from its
// starting style (Tailwind v4's starting:, @starting-style) that starts at scale 0 is marked and handed the class to
// start at 95%. The same menu starting at 95% is not marked. Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const menu = (id, start) => `<div id="${id}" role="menu" className="flex w-48 origin-top-left flex-col bg-surface p-s1 transition-[scale,opacity] duration-200 ${start} starting:opacity-0"><button type="button">Heading</button><button type="button">Table</button></div>`;
const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-s6 px-s4 py-s6 text-body">
      ${menu('point', 'starting:scale-0')}
      ${menu('near', 'starting:scale-95')}
    </main>
  );
}
`;

test('an entrance from scale 0 is told to start at 95%; one from 95% is not', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  const marks = at(report, 'craft/scale-from-zero');
  const point = marks.find((f) => f.line === lineOf(APP, 'point'));
  assert.ok(point, `the menu from 0 is marked: ${JSON.stringify(marks)}`);
  assert.match(point.finding.action, /`starting:scale-0` to `starting:scale-95`/, `start at 95%: ${point.finding.action}`);
  assert.ok(!hasLine(report, 'craft/scale-from-zero', lineOf(APP, 'near')), `the menu from 95% is not: ${JSON.stringify(marks)}`);
});
