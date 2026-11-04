// Two natural cases the showcase's timesheet (#16) found, through the real CLI on a real page:
// - tabular-nums: figures stacked down the rows of a list (a timesheet's durations) wobble like a table's column;
//   the same list in tabular figures is not marked.
// - concentric-radius: a child flush in a rounded card whose only paint is a top border draws no bottom corner, so
//   it is not marked; a child with a full border flush in the same corner still is; a presence dot at a round avatar's
//   box corner is not (a circle has no corner to nest in).
// Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6 text-body">
      <ul className="flex flex-col">
        <li className="flex justify-between py-s2"><span>Wireframes</span><span id="dur-bad">2:06:18</span></li>
        <li className="flex justify-between py-s2"><span>Logo exploration</span><span>1:11:40</span></li>
        <li className="flex justify-between py-s2"><span>Kickoff call</span><span>0:48:05</span></li>
      </ul>
      <ul className="flex flex-col">
        <li className="flex justify-between py-s2"><span>Wireframes</span><span id="dur-good" className="tabular-nums">2:06:18</span></li>
        <li className="flex justify-between py-s2"><span>Logo exploration</span><span className="tabular-nums">1:11:40</span></li>
        <li className="flex justify-between py-s2"><span>Kickoff call</span><span className="tabular-nums">0:48:05</span></li>
      </ul>
      <article className="flex flex-col rounded-card bg-surface shadow-raised">
        <header className="px-s4 py-s4">Tracking</header>
        <section id="top-border" className="border-t border-line px-s4 py-s4">Earlier today</section>
      </article>
      <span className="relative grid size-9 place-items-center rounded-full bg-ground">SO<span id="presence" className="absolute right-0 bottom-0 size-2.5 rounded-full bg-surface" /></span>
      <article className="flex flex-col rounded-card bg-surface shadow-raised">
        <header className="px-s4 py-s4">Tracking</header>
        <section id="full-border" className="border border-line px-s4 py-s4">Earlier today</section>
      </article>
    </main>
  );
}
`;

test('figures stacked down a list are told tabular-nums; a top-border-only child draws no corner to match', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const r = await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs']);
  const report = JSON.parse(r.stdout);

  assert.ok(hasLine(report, 'craft/tabular-nums', lineOf(APP, 'dur-bad')), `the proportional durations are marked: ${JSON.stringify(at(report, 'craft/tabular-nums'))}`);
  assert.ok(!hasLine(report, 'craft/tabular-nums', lineOf(APP, 'dur-good')), 'the tabular durations are not');

  assert.ok(!hasLine(report, 'craft/concentric-radius', lineOf(APP, 'top-border')), `a top border draws no bottom corner: ${JSON.stringify(at(report, 'craft/concentric-radius'))}`);
  assert.ok(hasLine(report, 'craft/concentric-radius', lineOf(APP, 'full-border')), 'a full border flush in the corner is still marked');
  assert.ok(!hasLine(report, 'craft/concentric-radius', lineOf(APP, 'presence')), 'a presence dot on a round avatar is not: a circle has no corner to nest in');
});
