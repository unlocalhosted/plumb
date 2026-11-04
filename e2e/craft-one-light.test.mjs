// One light source (#20) the way the showcase's sprint board found it: on a page whose shadows fall one way (five cards
// casting straight down), a card whose shadow falls down and to the right has a second light. It is marked and handed
// a class that turns its layers to the page's direction at their own lengths, leaving its ring alone. The cards that
// agree are not marked. Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const card = (id, cls) => `<div id="${id}" className="rounded-control bg-surface p-s3 ${cls}">Card</div>`;
const APP = `export function App() {
  return (
    <main className="grid grid-cols-3 gap-s4 p-s6 text-body">
      ${card('a', 'shadow-[0_1px_3px_rgb(0_0_0/0.12)]')}
      ${card('b', 'shadow-[0_1px_3px_rgb(0_0_0/0.12)]')}
      ${card('c', 'shadow-[0_2px_6px_rgb(0_0_0/0.12)]')}
      ${card('d', 'shadow-[0_1px_3px_rgb(0_0_0/0.12)]')}
      ${card('e', 'shadow-[0_2px_6px_rgb(0_0_0/0.12)]')}
      ${card('lifted', 'shadow-[8px_10px_24px_rgb(0_0_0/0.16)] ring-1 ring-black/10')}
    </main>
  );
}
`;

test('a shadow falling another way than the page’s other shadows is marked and turned to their light; the ones that agree are not', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  const marks = at(report, 'craft/one-light');
  const lifted = marks.find((f) => f.line === lineOf(APP, 'lifted'));
  assert.ok(lifted, `the diagonal shadow is marked: ${JSON.stringify(marks)}`);
  assert.match(lifted.finding.title, /falls 39° away from every other shadow/, lifted.finding.title);
  // its one layer, 12.8px long, turned straight down at the same length and blur; the ring is ring-1's, not part of it
  assert.match(lifted.finding.action, /0px_12\.8px_24px/, lifted.finding.action);
  assert.doesNotMatch(lifted.finding.action, /0px_0px_0px_1px/, `no ring in the shadow: ${lifted.finding.action}`);
  for (const id of ['a', 'b', 'c', 'd', 'e']) assert.ok(!hasLine(report, 'craft/one-light', lineOf(APP, id)), `${id} agrees with the light`);
});
