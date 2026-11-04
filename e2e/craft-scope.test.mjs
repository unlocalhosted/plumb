// plumber craft --scope: the scripted twin of an Alt+click. Only the element the selector names, and what is inside it,
// is read, so a finding outside it is not reported. A scope that matches nothing is an error, not a whole-page read.
// Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 py-s6">
      <button id="frame-button" className="rounded-control bg-surface p-s2 text-body">Save</button>
      <section data-example className="flex flex-col gap-s2">
        <table className="text-body">
          <tbody>
            <tr><td id="amount">$4,820.00</td></tr>
            <tr><td>$1,240.50</td></tr>
            <tr><td>$12,000.00</td></tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
`;
const report = async (root, url, extra = []) => {
  const r = await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs', ...extra]);
  return { ...r, json: r.stdout ? JSON.parse(r.stdout) : null };
};

test('craft --scope reads only the scoped element: the example is judged, the page around it is not', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const button = lineOf(APP, 'frame-button'), amount = lineOf(APP, 'amount');

  const whole = (await report(root, url)).json;
  assert.ok(hasLine(whole, 'craft/button-padding', button), 'the whole page: the frame button is marked');
  assert.ok(hasLine(whole, 'craft/tabular-nums', amount), 'the whole page: the amounts are marked');

  const scoped = (await report(root, url, ['--scope', '[data-example]'])).json;
  assert.ok(hasLine(scoped, 'craft/tabular-nums', amount), `scoped: the amounts are still marked: ${JSON.stringify(at(scoped, 'craft/tabular-nums'))}`);
  assert.deepEqual(at(scoped, 'craft/button-padding'), [], 'scoped: the button outside the example is not read');

  const missing = await report(root, url, ['--scope', '#no-such-thing']);
  assert.notEqual(missing.code, 0);
  assert.match(String(missing.stderr) + String(missing.stdout), /no-such-thing/);
});
