// Words that run into other words (overlay/src/craft-rules.js, craft/text-collision). On crafting-ui's hero, in a narrow
// window with the pointer over the headline, two guide labels sat 9px apart ("cap height" over "x-height") and a readout
// ended exactly where the hint beside it began ("… GEIST MEDIUMGRAB A LETTER …"). Plumber had no check for it. The same
// two cases here, and the five that look alike and are not collisions. Real CLI, real server, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { built, fixture, lineOf, plumber } from './helpers/craft-headless.mjs';

const PAGE = `export function App() {
  return (
    <main className="relative mx-auto h-[520px] max-w-5xl bg-ground text-ink">
      <span id="guide-a" className="absolute left-[40px] top-[40px] text-[11px] uppercase">Cap height</span>
      <span id="guide-b" className="absolute left-[40px] top-[49px] text-[11px] uppercase">X-height</span>
      <div className="absolute left-[40px] top-[100px] w-[220px] text-right">
        <span id="readout" className="text-[11px] uppercase">51 px · cap 36 · medium</span>
      </div>
      <div className="absolute left-[260px] top-[100px]">
        <span id="hint" className="text-[11px] uppercase">Grab a letter and pull</span>
      </div>
      <span className="absolute left-[40px] top-[160px] flex text-[11px]">
        <span id="time-a">0:00</span>
        <span id="time-b">.00</span>
      </span>
      <div className="absolute left-[420px] top-[40px] w-[220px] bg-surface p-s3">
        <span id="under" className="text-body">Kiln firing finished</span>
      </div>
      <div className="absolute left-[420px] top-[46px] w-[220px] bg-surface p-s3 shadow-rest">
        <span id="over" className="text-body">Kiln firing started</span>
      </div>
      <span id="ghost" className="absolute left-[40px] top-[40px] text-[11px] uppercase opacity-0">Baseline</span>
      <a id="tab" href="#x" className="absolute left-[420px] top-[160px] flex text-[11px] uppercase"><span>Vol. I</span><span id="reader" className="sr-only">Interfaces</span></a>
      <h1 id="tight" className="absolute left-[40px] top-[240px] w-[320px] text-[40px] leading-[0.9] font-semibold">A heading that wraps onto three lines</h1>
    </main>
  );
}
`;

test('two labels whose letters meet and a readout that runs into the hint beside it are found; pieces of one number, stacked cards, a transparent label, words kept for a screen reader and a tight heading are not', { timeout: 300000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, PAGE);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-pairs', '--no-probe'])).stdout);
  const found = report.routes[0].findings.filter((f) => f.rule === 'craft/text-collision');
  const at = (id) => found.find((f) => f.line === lineOf(PAGE, id));
  assert.deepEqual(found.map((f) => f.line).sort((a, b) => a - b), [lineOf(PAGE, 'guide-b'), lineOf(PAGE, 'hint')], JSON.stringify(found.map((f) => [f.line, f.title])));
  // said once, at the text that comes later, naming the one it meets
  assert.equal(at('guide-b').title, 'This sits so close to “Cap height” that their letters meet.');
  assert.equal(at('hint').title, 'This runs straight into “51 px · cap 36 · medium”, with no space between them.');
  assert.equal(at('hint').evidence.how, 'run');
  assert.match(at('hint').action, /Put a gap between them, or let one wrap or hide/);
});
