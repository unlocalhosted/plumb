// Two natural cases the showcase's passenger form (#7) found, through the real CLI on a real page:
// - inner-outer spacing: a field written the plain JSX way, <label>Date of birth<span>…</span></label>, is a group of
//   two (bare words and a box). Its 12px inside, against 8px between fields, is marked; 4px inside is not.
// - card optical padding: a bordered footer whose small words sit beside a taller button is measured from the button
//   (the first thing the eye meets at its top), so its even padding is not reported as too tall.
// Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const fields = (id, inner) => `
      <div className="flex flex-col gap-s2">
        <label id="${id}" className="flex flex-col ${inner} text-small">Date of birth<span className="flex h-10 items-center rounded-control px-s3 ring-1 ring-line">14 March 1991</span></label>
        <label className="flex flex-col ${inner} text-small">Nationality<span className="flex h-10 items-center rounded-control px-s3 ring-1 ring-line">Portuguese</span></label>
        <label className="flex flex-col ${inner} text-small">Passport number<span className="flex h-10 items-center rounded-control px-s3 ring-1 ring-line">CB 482 1907</span></label>
      </div>`;
const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-s6 px-s4 py-s6 text-body">${fields('loose', 'gap-s3')}${fields('tight', 'gap-s1')}
      <footer id="footer" className="flex items-center justify-between border-t border-line px-s6 py-s4">
        <span className="text-small">Saved to your trip</span>
        <button type="button" className="h-10 rounded-control bg-ink px-s4 text-surface">Continue to seats</button>
      </footer>
    </main>
  );
}
`;

test('a label of bare words and a box is a group; a footer is measured from its button', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  assert.ok(hasLine(report, 'craft/inner-outer-spacing', lineOf(APP, 'loose')), `12px inside, 8px between: marked: ${JSON.stringify(at(report, 'craft/inner-outer-spacing'))}`);
  assert.ok(!hasLine(report, 'craft/inner-outer-spacing', lineOf(APP, 'tight')), '4px inside is not');
  assert.ok(!hasLine(report, 'craft/card-optical-padding', lineOf(APP, 'footer')), `the footer is measured from its button: ${JSON.stringify(at(report, 'craft/card-optical-padding'))}`);
});
