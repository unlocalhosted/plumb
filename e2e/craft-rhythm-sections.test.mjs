// Two natural cases the showcase's notification settings (#12) found, through the real CLI on a real page:
// - rhythm: a page keeps its rows 12px apart; one stack at 8px is marked and told the page's gap. The stack of sections
//   around them, 32px apart, is not: a stack of stacks spaces groups and is meant to be wider than the gaps inside them.
// - text-wrap-role: a one-line section heading with an icon that carries its own styles (an animated icon) is not
//   "two uneven lines": lines are read from the words, not from what an svg holds.
// Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const section = (name, gap, id = '') => `
        <section className="flex flex-col gap-s3">
          <h3 ${id ? `id="${id}-h" ` : ''}className="flex items-center gap-s2 text-small"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><style>{'.d{fill:currentColor}'}</style><rect className="d" x="2" y="2" width="12" height="12" /></svg>${name}</h3>
          <ul ${id ? `id="${id}" ` : ''}className="flex flex-col ${gap}"><li>One</li><li>Two</li><li>Three</li></ul>
        </section>`;
const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-sm flex-col px-s4 py-s6 text-body">
      <div id="sections" className="flex flex-col gap-[32px]">${section('Email', 'gap-s3')}${section('Mentions', 'gap-s2', 'odd')}${section('Push', 'gap-s3')}${section('Calendar', 'gap-s3')}${section('Security', 'gap-s3')}
      </div>
    </main>
  );
}
`;

test('a stack off the page\'s rhythm is marked, the stack of sections is not; a heading with an icon is one line', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  const rhythm = at(report, 'craft/rhythm');
  assert.ok(hasLine(report, 'craft/rhythm', lineOf(APP, 'odd')), `the 8px stack is marked: ${JSON.stringify(rhythm)}`);
  assert.ok(!hasLine(report, 'craft/rhythm', lineOf(APP, 'sections')), `the stack of sections is not: ${JSON.stringify(rhythm)}`);
  assert.deepEqual(at(report, 'craft/text-wrap-role'), [], 'a one-line heading with an icon is not two lines');
});
