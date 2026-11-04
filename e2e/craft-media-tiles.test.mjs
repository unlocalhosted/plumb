// Icon side (#10) where the showcase's music shelf (#8) found it overreaching: a media tile, a button whose cover art
// sits above its title, is not an icon beside words, so its even padding is not marked. A small icon beside the words
// of an evenly padded button still is. Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-s6 px-s4 py-s6 text-body">
      <button id="tile" type="button" className="flex w-40 flex-col gap-s2 rounded-card bg-ground p-s2 text-left">
        <svg viewBox="0 0 120 120" className="block aspect-square w-full" aria-hidden="true"><rect width="120" height="120" fill="currentColor" /></svg>
        <span>Low Tide</span>
      </button>
      <button id="icon-row" type="button" className="flex items-center gap-s2 rounded-control bg-ground px-s3 py-s2">
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" /></svg>
        <span>New playlist</span>
      </button>
    </main>
  );
}
`;

test('a cover above its title is not an icon side; a small icon beside the words still is', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);
  const marks = at(report, 'craft/icon-side');
  assert.ok(!hasLine(report, 'craft/icon-side', lineOf(APP, 'tile')), `the media tile is not marked: ${JSON.stringify(marks)}`);
  assert.ok(hasLine(report, 'craft/icon-side', lineOf(APP, 'icon-row')), `the icon beside the words still is: ${JSON.stringify(marks)}`);
});
