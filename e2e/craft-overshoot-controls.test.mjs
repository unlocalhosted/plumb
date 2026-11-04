// Overshoot (#3) where the showcase's whiteboard found it: a Shapes picker whose square, circle and triangle sit in
// icon-only buttons, all drawn in one 20px box. The circle is told to grow by a class on the picker that reaches the
// circle button's svg (not advice). The same picker with the circle already drawn 4% larger is quiet, and so is
// media-size (#34): a list shares a box size, and an overshoot's scale is drawn on purpose.
// Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const picker = (id, circle) => `
      <div id="${id}" className="flex gap-s1">
        <button type="button" aria-label="Square" className="grid size-11 place-items-center"><svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="1" /></svg></button>
        <button type="button" aria-label="Circle" className="grid size-11 place-items-center"><svg viewBox="0 0 24 24" className="${circle}" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="10" /></svg></button>
        <button type="button" aria-label="Triangle" className="grid size-11 place-items-center"><svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true"><path d="M12 2.5 22 21H2z" /></svg></button>
      </div>`;
const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6 text-body">${picker('same-box', 'size-6')}${picker('overshoot', 'size-6 scale-[1.04]')}
    </main>
  );
}
`;

test('a circle drawn in the same box as a square, inside picker buttons, is told to grow by a class; drawn larger, nothing complains', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  const marks = at(report, 'craft/overshoot');
  const same = marks.find((m) => m.file.endsWith('src/App.jsx') && m.line === lineOf(APP, 'same-box'));
  assert.ok(same, `the same-box picker is marked: ${JSON.stringify(marks)}`);
  // a class it can take, not advice: the report's action names it
  assert.match(same.finding.action, /Add `\[&>:nth-child\(2\)>svg\]:scale-\[1\.0\d\]`/, `a class on the picker that reaches the circle's svg: ${same.finding.action}`);
  assert.ok(!hasLine(report, 'craft/overshoot', lineOf(APP, 'overshoot')), 'the picker whose circle overshoots is not marked');
  assert.deepEqual(at(report, 'craft/media-size'), [], `media-size takes the overshoot's scale out: ${JSON.stringify(at(report, 'craft/media-size'))}`);
});
