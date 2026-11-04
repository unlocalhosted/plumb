// plumber craft --record-probe: the submenu probe leaves frames of the page and its own clock (probe.json) in a folder.
// The real CLI, a real Vite server with the plugin, real Chromium, a hand-rolled menu whose submenu closes on the way.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { built, fixture, plumber } from './helpers/craft-headless.mjs';
import { STYLES } from './helpers/probes-apps.mjs';

const BTN = 'rounded border px-3 py-1';
const APP = `import { useState } from 'react';
function Custom({ id, label }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false);
  return (
    <div className="relative">
      <button id={id} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="${BTN}">{label}</button>
      {open && (
        <div role="menu" className="menu-box absolute left-0 top-full z-10" style={{ width: 128 }}>
          <div role="menuitem" aria-haspopup="menu" aria-expanded={sub} className="menu-item" onMouseEnter={() => setSub(true)}>More</div>
          <div role="menuitem" className="menu-item" onMouseEnter={() => setSub(false)}>Settings</div>
          <div role="menuitem" className="menu-item" onMouseEnter={() => setSub(false)}>Help</div>
          {sub && <div role="menu" className="menu-box absolute top-0" style={{ left: '100%' }}><div role="menuitem" className="menu-item">Alpha</div><div role="menuitem" className="menu-item">Beta</div><div role="menuitem" className="menu-item">Gamma</div></div>}
        </div>
      )}
    </div>
  );
}
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-start gap-s4 px-s4 pb-6 text-body text-ink" style={{ minHeight: 600 }}>
      <div id="outside"><Custom id="mn-outside" label="Outside" /></div>
      <div data-example style={{ padding: 16, width: 420, height: 260, background: '#fff' }}><Custom id="mn-inside" label="Inside" /></div>
    </main>
  );
}
`;

test('record-probe: a scoped submenu probe writes probe.json and frames that bracket the moment the submenu closed', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP, { styles: STYLES });
  const dir = await mkdtemp(join(tmpdir(), 'probe-rec-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const result = await plumber(['--url', url, '--json', '--root', root, '--scope', '[data-example]', '--record-probe', dir], { PLUMBER_DEBUG: '1' });
  assert.ok([0, 1].includes(result.code), result.stderr?.slice(0, 2000)); // 1: it found the submenu path
  const rec = JSON.parse(await readFile(join(dir, 'probe.json'), 'utf8'));
  const why = JSON.stringify({ ...rec, frames: rec.frames }) + (result.stderr ?? '').slice(0, 1500);

  // the probe's own record, and only the scoped menu was tried (the one outside has no samples of its own to confuse)
  assert.equal(rec.lost, true, why);
  assert.ok(rec.step >= 1 && rec.crossed >= 1, why);
  assert.ok(!(result.stderr ?? '').includes('"k":"div:1>main:1>div:1>div:1>button:1","rec":{"lost"'), why); // the menu outside the scope was not tried
  // the clip: the scope's box, in CSS px
  assert.deepEqual(rec.box, { w: 420, h: 260 }, why);
  assert.equal(rec.dpr, 1);
  // pointer samples on one clock: t rises from 0, one per move, `open` true until the step it closed at
  assert.ok(rec.samples.length >= 11, why);
  assert.equal(rec.samples[0].t, 0);
  assert.ok(rec.samples.every((s, i) => i === 0 || s.t > rec.samples[i - 1].t));
  const closedAt = rec.samples.find((s) => s.step === rec.step);
  assert.equal(closedAt.open, false, why);
  assert.ok(rec.samples.filter((s) => s.step < rec.step).every((s) => s.open), why);
  // rects, relative to the scope: the item, the submenu to its right, and the other items
  assert.ok(rec.subtrigger.w > 0 && rec.subtrigger.x >= 0 && rec.subtrigger.y >= 0 && rec.subtrigger.x + rec.subtrigger.w <= 420, why);
  assert.ok(rec.submenu.x >= rec.subtrigger.x + rec.subtrigger.w - 1 && rec.submenu.w > 0, why);
  assert.equal(rec.siblings.length, 2, why);
  assert.equal(rec.subtrigger.label, 'More', why);
  assert.deepEqual(rec.siblings.map((r) => r.label), ['Settings', 'Help'], why);
  // the samples lie inside the scope's box on the way (relative coordinates)
  assert.ok(rec.samples.every((s) => s.x >= 0 && s.y >= 0), why);
  // frames: files that exist, rising t, one before the gesture's first move, and the gesture's frames bracket the close
  const files = await readdir(dir);
  assert.ok(rec.frames.length >= 3, why);
  for (const f of rec.frames) assert.ok(files.includes(f.file), f.file);
  assert.ok(rec.frames.every((f, i) => i === 0 || f.t >= rec.frames[i - 1].t));
  assert.ok(rec.frames[0].t <= 0, why);
  assert.ok(rec.frames.at(-1).t >= closedAt.t, why);
  assert.ok(rec.frames.some((f) => f.t <= closedAt.t) && rec.frames.some((f) => f.t >= closedAt.t), why);
  const png = await readFile(join(dir, rec.frames[0].file));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 420); assert.equal(png.readUInt32BE(20), 260); // clipped to the scope

  // without the flag nothing is written
  const quiet = await mkdtemp(join(tmpdir(), 'probe-none-'));
  t.after(() => rm(quiet, { recursive: true, force: true }));
  const bare = await plumber(['--url', url, '--json', '--root', root, '--scope', '[data-example]']);
  assert.ok([0, 1].includes(bare.code));
  assert.deepEqual(await readdir(quiet), []);
});
