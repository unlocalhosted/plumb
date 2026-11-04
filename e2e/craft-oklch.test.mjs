// Colours as Chromium computes them: Tailwind v4's palette is oklch, and getComputedStyle keeps oklch (and oklab, for
// color-mix) rather than turning it into rgb(). A colour rule must read them, or it is silent on the default palette.
// Real CLI, real Vite with Tailwind v4, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 bg-white px-s4 py-s6">
      <span id="faint-oklch" className="text-[12px] text-gray-300">faint words in the default palette</span>
      <span id="faint-mix" className="text-[12px] text-[color-mix(in_oklab,var(--color-gray-200)_80%,white)]">faint words, mixed</span>
      <span id="clear-oklch" className="text-[12px] text-gray-900">clear words in the default palette</span>
    </main>
  );
}
`;

test('oklch: faint text in Tailwind’s default palette is marked for contrast; clear text in it is not', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  const why = JSON.stringify(at(report, 'craft/contrast').map((f) => [f.line, f.finding.title]));
  assert.ok(hasLine(report, 'craft/contrast', lineOf(APP, 'faint-oklch')), `oklch text-gray-300 not marked: ${why}`);
  assert.ok(hasLine(report, 'craft/contrast', lineOf(APP, 'faint-mix')), `oklab color-mix not marked: ${why}`);
  assert.ok(!hasLine(report, 'craft/contrast', lineOf(APP, 'clear-oklch')), `oklch text-gray-900 marked: ${why}`);
});
