// Layer 4 of the craft hard rules: pairs. `plumber craft` renders the route again under another condition (dark, touch,
// held responses) and hands the result to the rules. The real CLI binary, a real Vite server with the plugin, real
// Chromium. Each rule has an element that breaks it and one beside it that must stay quiet.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';

import { APP, STYLES } from './helpers/pairs-app.mjs';

test('plumber craft reads the page under dark, touch and held responses', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP, { styles: STYLES, api: { items: [{ id: 1, title: 'One' }, { id: 2, title: 'Two' }] } });
  const result = await plumber(['--url', url, '--json', '--root', root]);
  const report = JSON.parse(result.stdout);
  const line = (id) => lineOf(APP, id);

  // 54: a shadow that does nothing in the dark scheme, beside one on a lifted surface
  assert.ok(hasLine(report, 'craft/dark-elevation', line('lift-bad')), JSON.stringify(at(report, 'craft/dark-elevation')));
  assert.ok(!hasLine(report, 'craft/dark-elevation', line('lift-good')));
  // 44: light text on dark at weight 500 (a note, never failing), beside the same words at 400
  const weight = at(report, 'craft/dark-weight');
  assert.ok(weight.some((f) => f.line === line('dw') && f.severity === 'info'), JSON.stringify(weight));
  assert.ok(!weight.some((f) => f.line === line('dw-ok')));
  // 77: a skeleton 40px short of what lands, beside one that matches
  assert.ok(hasLine(report, 'craft/skeleton-match', line('sk-bad')), JSON.stringify(at(report, 'craft/skeleton-match')));
  assert.ok(!hasLine(report, 'craft/skeleton-match', line('sk-good')));
  // 66: a spinner that blinks on a fast reply, beside one that waits 300ms
  assert.ok(hasLine(report, 'craft/spinner-timing', line('sp-bad')), JSON.stringify(at(report, 'craft/spinner-timing')));
  assert.ok(!hasLine(report, 'craft/spinner-timing', line('sp-good')));
  // 75: a scroll area with nothing at its edges, beside one with a fade and one with shadows that come and go
  assert.ok(hasLine(report, 'craft/scroll-cue', line('sc-bad')), JSON.stringify(at(report, 'craft/scroll-cue')));
  assert.ok(!hasLine(report, 'craft/scroll-cue', line('sc-mask')) && !hasLine(report, 'craft/scroll-cue', line('sc-local')), JSON.stringify(at(report, 'craft/scroll-cue')));

  // --no-pairs: the page is read as it is, and none of the pair rules can speak (scroll-cue also has a still half)
  const bare = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-pairs'])).stdout);
  for (const rule of ['dark-elevation', 'dark-weight', 'skeleton-match', 'spinner-timing']) assert.deepEqual(at(bare, `craft/${rule}`), [], rule);
});
