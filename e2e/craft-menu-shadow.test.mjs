// Two natural cases the showcase's share menu (#23) and delete dialog (#51) found, through the real CLI on a real page:
// - icon-side: a menu's full-width rows, their icon and words at the start, aren't a centred button: the row's two
//   sides are never seen against each other, so its even padding is not marked. A hugging button with an icon still is.
// - layered-shadow: one big blur in a tinted colour is told to layer, and the layers keep that tint, not black.
// Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const icon = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" /></svg>';
const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-s6 px-s4 py-s6 text-body">
      <div className="flex w-52 flex-col p-1">
        <button id="menu-row" type="button" className="flex items-center gap-s2 px-s2 py-s2 text-left">${icon}<span>Copy link</span></button>
        <button type="button" className="flex items-center gap-s2 px-s2 py-s2 text-left">${icon}<span>Add to album</span></button>
      </div>
      <button id="icon-button" type="button" className="flex items-center gap-s2 self-start rounded-control bg-ground px-s3 py-s2">${icon}<span>New album</span></button>
      <div id="dialog" className="rounded-card bg-surface p-s4 shadow-dialog">Delete 3 photos?</div>
    </main>
  );
}
`;

test('menu rows are not an icon side, a hugging button is; a tinted single blur is layered in its own tint', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  // the theme's dialog shadow, one blur, the way most themes write it
  const { root, url } = await fixture(t, APP, { styles: '@theme { --shadow-dialog: 0 25px 50px -12px rgb(18 35 61 / 0.25); }' });
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  const side = at(report, 'craft/icon-side');
  assert.ok(!hasLine(report, 'craft/icon-side', lineOf(APP, 'menu-row')), `the menu row is not marked: ${JSON.stringify(side)}`);
  assert.ok(hasLine(report, 'craft/icon-side', lineOf(APP, 'icon-button')), `the hugging button still is: ${JSON.stringify(side)}`);
  const layered = at(report, 'craft/layered-shadow').find((f) => f.line === lineOf(APP, 'dialog'));
  assert.ok(layered, `the single blur is marked: ${JSON.stringify(at(report, 'craft/layered-shadow'))}`);
  assert.match(layered.finding.action, /rgb\(18_35_61_\/_0\.\d+\)/, `the layers keep the tint: ${layered.finding.action}`);
  assert.doesNotMatch(layered.finding.action, /rgb\(0_0_0_/, `no black layer: ${layered.finding.action}`);
});
