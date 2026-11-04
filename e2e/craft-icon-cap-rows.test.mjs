// Icon on cap height (#4) where the showcase's activity panel found it: a list row built to the top (items-start) so
// its title can wrap, with when under it. The icon sits at the top of the first line's box, about 2.5px above the middle
// of the title's capitals: marked, and told the nudge. The same row with the icon already nudged is not. The icon in the
// marked rows carries text of its own (an animated icon's styles), which must not be taken for the row's words.
// Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const icon = (cls) => `<svg viewBox="0 0 16 16" width="16" height="16" className="${cls}" aria-hidden="true"><style>{'.d{fill:currentColor}'}</style><rect className="d" x="2" y="2" width="12" height="12" rx="2" /></svg>`;
const row = (id, cls) => `
        <li id="${id}" className="flex items-start gap-s3 py-s3">
          ${icon(cls)}
          <span className="flex flex-col"><span className="text-body">Mira uploaded <b>Brand guidelines v3.pdf</b></span><span className="text-small">Design · 4 min ago</span></span>
        </li>`;
const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-s6 px-s4 py-s6">
      <ul>${row('top', 'shrink-0')}</ul>
      <ul>${row('nudged', 'shrink-0 translate-y-[2.5px]')}</ul>
    </main>
  );
}
`;

test('an icon at the top of a row built to wrap is told to sit on its title\'s capitals; nudged, it is not', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  const marks = at(report, 'craft/icon-cap');
  const top = marks.find((m) => m.file.endsWith('src/App.jsx') && m.line === lineOf(APP, 'top'));
  assert.ok(top, `the top-aligned row is marked: ${JSON.stringify(marks)}`);
  assert.match(top.finding.action, /translate-y-\[\d(?:\.\d)?px\]/, `told the nudge: ${top.finding.action}`);
  assert.ok(!hasLine(report, 'craft/icon-cap', lineOf(APP, 'nudged')), 'the nudged row is not');
});
