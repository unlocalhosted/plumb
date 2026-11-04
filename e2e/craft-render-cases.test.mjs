// Rendering cases the showcase's stats chart (#37) and project tabs (#42) found, through the real CLI on a real page:
// - half-pixel: a tooltip of two lines centred on its point with top-1/2 -translate-y-1/2 moves up a fraction of a
//   pixel, and the words in it blur (measured: the grey fringe on its letters goes 0.44 → 0.60 at 1×). It is marked
//   though its words sit in children, and told to centre by layout. A box moved half a pixel across is not marked:
//   words are placed across at sub-pixel precision anyway, so it doesn't blur.
// - bold-hover: tabs that go semibold on hover are told to darken instead: the theme's ink, the same width.
// Real CLI, real Vite, real Chromium, at 1×.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-s6 px-s4 py-s6 text-body">
      <div className="relative h-24">
        <span className="absolute top-12 left-8 h-0">
          <span id="tip" className="absolute top-1/2 left-3 flex -translate-y-1/2 flex-col bg-ink px-s2 py-[6px] text-surface">
            <span className="text-[12px] leading-snug">Thu 6 Nov</span>
            <span className="text-[13px] leading-snug">1,284 readers</span>
          </span>
        </span>
      </div>
      <div className="relative h-10">
        <span id="across" className="absolute top-0 left-1/2 -translate-x-1/2 text-small" style={{ width: 33 }}>odd</span>
      </div>
      <nav className="flex gap-s4">
        <a id="tab" href="#board" className="text-small text-ink-muted hover:font-semibold">Board</a>
        <a href="#files" className="text-small text-ink-muted hover:font-semibold">Files</a>
      </nav>
    </main>
  );
}
`;

test('a tooltip a fraction of a pixel down is told to centre by layout, one moved across is not; a bold hover is told to darken', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);

  const tip = at(report, 'craft/half-pixel').find((f) => f.line === lineOf(APP, 'tip'));
  assert.ok(tip, `the tooltip is marked: ${JSON.stringify(at(report, 'craft/half-pixel'))}`);
  assert.match(tip.finding.action, /`top-1\/2 -translate-y-1\/2` to `inset-y-0 my-auto h-fit`/, `centred by layout: ${tip.finding.action}`);
  assert.ok(!hasLine(report, 'craft/half-pixel', lineOf(APP, 'across')), `half a pixel across is not marked: ${JSON.stringify(at(report, 'craft/half-pixel'))}`);

  const tab = at(report, 'craft/bold-hover').find((f) => f.line === lineOf(APP, 'tab'));
  assert.ok(tab, `the bold hover is marked: ${JSON.stringify(at(report, 'craft/bold-hover'))}`);
  assert.match(tab.finding.action, /`hover:font-semibold` to `hover:text-ink`/, `darker, the same width: ${tab.finding.action}`);
});
