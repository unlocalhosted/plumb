// Layer 5 of the craft hard rules: probes. `plumber craft` presses, hovers and types at the page, in pages of their own,
// and reads what happened. The real CLI binary, a real Vite server with the plugin, real Chromium, fixtures that DO the
// thing. The run must also never submit, follow or send anything: the form's counter stays 0.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, lineOf, plumber } from './helpers/craft-headless.mjs';
import { DRAGS, MENUS, MOTION, STYLES, TIPS } from './helpers/probes-apps.mjs';

const API = { slow: { ok: true } };

test('probes: exits, interruptions, presses and spinners, and nothing is submitted, followed or sent', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url, hits } = await fixture(t, MOTION, { styles: STYLES, api: API, track: ['/elsewhere'] });
  const result = await plumber(['--url', url, '--json', '--root', root], { PLUMBER_DEBUG: '1' });
  const report = JSON.parse(result.stdout);
  const line = (id) => lineOf(MOTION, id);
  const why = (rule) => JSON.stringify(at(report, rule).map((f) => f.line)) + result.stderr.slice(0, 1500);

  // 68: an exit as slow as the entrance, beside one at half
  assert.ok(hasLine(report, 'craft/exit-faster', line('pn-slow')), why('craft/exit-faster'));
  assert.ok(!hasLine(report, 'craft/exit-faster', line('pn-quick')) && !hasLine(report, 'craft/exit-faster', line('pn-restart')), why('craft/exit-faster'));
  // 64: keyframes that restart from the first frame, beside transitions that reverse
  assert.ok(hasLine(report, 'craft/interruptible', line('pn-restart')), why('craft/interruptible'));
  assert.ok(!hasLine(report, 'craft/interruptible', line('pn-slow')) && !hasLine(report, 'craft/interruptible', line('pn-quick')), why('craft/interruptible'));
  // 31: a button that does nothing when pressed, and one whose answer starts 200ms late, beside one that answers at once
  assert.ok(hasLine(report, 'craft/press-feedback', line('pr-bad')) && hasLine(report, 'craft/press-feedback', line('pr-late')), why('craft/press-feedback'));
  assert.ok(!hasLine(report, 'craft/press-feedback', line('pr-good')), why('craft/press-feedback'));
  // 66: a spinner that shows on the press, beside one that waits 300ms
  assert.ok(hasLine(report, 'craft/spinner-timing', line('ld-bad')), why('craft/spinner-timing'));
  assert.ok(!hasLine(report, 'craft/spinner-timing', line('ld-good')), why('craft/spinner-timing'));

  // safety: no probe submitted the form, followed the link, or sent the POST
  const counted = await fetch(new URL('/__hits', url)).then((r) => r.json());
  assert.equal(counted['count'] ?? 0, 0, 'the form was submitted');
  assert.equal(counted['hit'] ?? 0, 0, 'a POST reached the server');
  assert.equal(counted['/elsewhere'] ?? 0, 0, 'the link was followed');

  // --no-probe: the page is read as it is
  const bare = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-probe'])).stdout);
  assert.ok(!hasLine(bare, 'craft/interruptible', line('pn-restart')));
  assert.deepEqual(at(bare, 'craft/spinner-timing'), []);
});

test('probes: a menu that waits for the click is marked, Radix’s and Headless UI’s (both open on the press) are not; a custom submenu closes on the way, Radix’s does not', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, MENUS, { styles: STYLES });
  const result = await plumber(['--url', url, '--json', '--root', root], { PLUMBER_DEBUG: '1' });
  const report = JSON.parse(result.stdout);
  const line = (id) => lineOf(MENUS, id);
  const why = (rule) => JSON.stringify(at(report, rule).map((f) => f.line)) + result.stderr.slice(0, 2500);
  // (a click menu with a submenu answers to the submenu rule: one verdict per element and facet)
  assert.ok(hasLine(report, 'craft/menu-pointerdown', line('mn-flat')), why('craft/menu-pointerdown'));
  assert.ok(!hasLine(report, 'craft/menu-pointerdown', line('mn-radix')) && !hasLine(report, 'craft/menu-pointerdown', line('mn-headless')), why('craft/menu-pointerdown'));
  assert.ok(hasLine(report, 'craft/submenu-path', line('mn-custom')), why('craft/submenu-path'));
  assert.ok(!hasLine(report, 'craft/submenu-path', line('mn-radix')), why('craft/submenu-path'));
});

test('probes: tooltips wait too little, too long, and not skip; a shortcut’s palette animates in', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const app = TIPS();
  const { root, url } = await fixture(t, app, { styles: STYLES });
  const result = await plumber(['--url', url, '--json', '--root', root], { PLUMBER_DEBUG: '1' });
  const report = JSON.parse(result.stdout);
  const line = (id) => lineOf(app, id);
  const why = (rule) => JSON.stringify(at(report, rule).map((f) => [f.line, f.finding.title])) + result.stderr.slice(0, 2500);
  const tips = at(report, 'craft/tooltip-delay').map((f) => f.line);
  assert.ok(tips.includes(line('tp-skip-1')), why('craft/tooltip-delay'));   // the next tooltip waits again
  assert.ok(tips.includes(line('tp-quick-1')), why('craft/tooltip-delay'));  // 0ms: flickers
  assert.ok(tips.includes(line('tp-slow-1')), why('craft/tooltip-delay'));   // 1300ms: slow
  assert.ok(!tips.includes(line('tp-good-1')) && !tips.includes(line('tp-good-2')), why('craft/tooltip-delay'));
  const palette = at(report, 'craft/palette-motion');
  assert.ok(palette.some((f) => f.line === line('palette')), why('craft/palette-motion'));
});

test('probes: a page built right gets no finding from any probe', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const app = TIPS('palette-still').replace('<Tooltip.Provider delayDuration={500} skipDelayDuration={0}>', '<Tooltip.Provider delayDuration={500} skipDelayDuration={300}>')
    .replace('delayDuration={0} skipDelayDuration={300}', 'delayDuration={500} skipDelayDuration={300}').replace('delayDuration={1300}', 'delayDuration={500}');
  const { root, url } = await fixture(t, app, { styles: STYLES });
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root])).stdout);
  const probed = ['tooltip-delay', 'palette-motion', 'press-feedback', 'exit-faster', 'interruptible', 'menu-pointerdown', 'submenu-path', 'spinner-timing'];
  assert.deepEqual(report.findings.filter((f) => probed.some((r) => f.rule === `craft/${r}`)).map((f) => [f.rule, f.sites[0].line]), []);
});

test('probes: a drag is only tried when asked for; one that stops dead is marked (a note), one that gives is not', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, DRAGS, { styles: STYLES });
  const line = (id) => lineOf(DRAGS, id);
  const quiet = JSON.parse((await plumber(['--url', url, '--json', '--root', root])).stdout);
  assert.deepEqual(at(quiet, 'craft/overdrag'), []);
  const result = await plumber(['--url', url, '--json', '--root', root, '--probe', 'drag'], { PLUMBER_DEBUG: '1' });
  const report = JSON.parse(result.stdout);
  const found = at(report, 'craft/overdrag');
  assert.ok(found.some((f) => f.line === line('dr-dead') && f.severity === 'info'), JSON.stringify(found.map((f) => f.line)) + result.stderr.slice(0, 1500));
  assert.ok(!found.some((f) => f.line === line('dr-elastic')), JSON.stringify(found.map((f) => f.line)));
});
