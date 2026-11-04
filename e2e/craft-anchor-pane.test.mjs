// Anchor offset (#73) where the showcase's team handbook found it missing: a pane that scrolls by itself (a docs column,
// an app panel) with its own sticky header, narrower than the window. A linked heading in it lands under that header,
// so it is marked and told a scroll margin at least the header's height. The same heading with that
// margin is not marked. Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const pane = (n, margin) => `
      <article className="relative h-[240px] w-[360px] overflow-y-auto">
        <header className="sticky top-0 flex h-[54px] items-center gap-s3 bg-surface">
          <a href="#first-${n}">First week</a><a href="#tools-${n}">Tools</a>
        </header>
        <div className="flex flex-col gap-s6 pb-[400px]">
          <p>Before you start.</p>
          <h3 id="first-${n}" className="${margin}">First week</h3>
          <p>Each day has one thing to finish.</p>
          <h3 id="tools-${n}" className="${margin}">Tools</h3>
        </div>
      </article>`;
const APP = `export function App() {
  return (
    <main className="flex gap-s6 p-s6 text-body">${pane('a', '')}${pane('b', 'scroll-mt-14')}
    </main>
  );
}
`;

test('a linked heading in a pane with its own sticky header is told a scroll margin the header’s height; one that has it is not', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  const marks = at(report, 'craft/anchor-offset');
  const bad = marks.find((f) => f.line === lineOf(APP, 'first-a'));
  assert.ok(bad, `the heading under the pane's header is marked: ${JSON.stringify(marks)}`);
  // the header is 54px: a margin at least that (this theme names its spacing steps, none near 54px, so it's said
  // in px; on a numeric scale it's a whole step, scroll-mt-14)
  assert.match(bad.finding.action, /`scroll-mt-14`|scroll-margin-top: 54px/, `a margin at least the header: ${bad.finding.action}`);
  assert.ok(!hasLine(report, 'craft/anchor-offset', lineOf(APP, 'first-b')), `the heading with the margin is not: ${JSON.stringify(marks)}`);
});
