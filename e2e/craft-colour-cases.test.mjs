// Colour cases the showcase's recipe (#21), feature card (#25) and inbox (#57) found, through the real CLI on a real page:
// - a craft insight on an element the theme also marks (pure black is off this theme) is still reported by `plumber
//   craft`, with its fix: the project's own near-black, not the framework's black or a stock grey.
// - text-opacity marks a preview line muted with opacity; the @mention inside it isn't marked again for contrast:
//   its fade is that line's, and it reads fine once the line has a colour.
// - tinted-shadow's fix carries only the shadow's real layers, not Tailwind's empty ring and inset ones.
// Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

const APP = `export function App() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-s6 px-s4 py-s6 text-body">
      <article id="dark" className="flex h-[480px] w-[448px] flex-col justify-end rounded-card bg-black p-s4 text-white">Focus sessions</article>
      <p id="line" className="text-[13px] opacity-60"><span id="mention" className="font-medium text-accent">@you</span> can you take the empty states?</p>
      <div className="rounded-card bg-[#f4e2c3] p-s4">
        <section id="card" className="rounded-card bg-surface p-s3 shadow-float">Carnaroli rice</section>
      </div>
    </main>
  );
}
`;

test('a craft insight under the theme\'s mark is reported; a mention isn\'t marked for its line\'s fade; a tinted fix has no empty layers', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  // the theme's float shadow is Tailwind's lg as it came: black
  const { root, url } = await fixture(t, APP, { styles: '@theme { --shadow-float: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }' });
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe', '--no-pairs'])).stdout);

  const dark = at(report, 'craft/pure-black-white').find((f) => f.line === lineOf(APP, 'dark'));
  assert.ok(dark, `the pure black card is reported: ${JSON.stringify(at(report, 'craft/pure-black-white'))}`);
  assert.match(dark.finding.action, /bg-ink\b/, `told the project's own near-black: ${dark.finding.action}`);

  assert.ok(hasLine(report, 'craft/text-opacity', lineOf(APP, 'line')), `the muted line is marked: ${JSON.stringify(at(report, 'craft/text-opacity'))}`);
  assert.ok(!hasLine(report, 'craft/contrast', lineOf(APP, 'mention')), `the mention is not marked for contrast: ${JSON.stringify(at(report, 'craft/contrast'))}`);

  const card = at(report, 'craft/tinted-shadow').find((f) => f.line === lineOf(APP, 'card'));
  assert.ok(card, `the grey shadow on saffron is marked: ${JSON.stringify(at(report, 'craft/tinted-shadow'))}`);
  assert.doesNotMatch(card.finding.action, /rgba\(0,0,0,0\)_0px_0px_0px_0px/, `no empty layers in the fix: ${card.finding.action}`);
  assert.match(card.finding.action, /oklch\(/, `the shadow is tinted: ${card.finding.action}`);
});
