// Menus on pointerdown (#61) where the showcase's layer menu (#59) found the probe misreading: a menu that is already
// open when the probe arrives (open at rest, or left open). The probe closes it first, then presses, so a menu that
// opens on the press is not marked and one that waits for the click is, whether or not it started open.
// Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, plumber } from './helpers/craft-headless.mjs';

// two menus, each its own component (its own line), both open at rest and closed by Escape
const menu = (name, press) => `function ${name}() {
  const [open, setOpen] = useState(true);
  useEffect(() => { const esc = (e) => { if (e.key === 'Escape') setOpen(false); }; addEventListener('keydown', esc); return () => removeEventListener('keydown', esc); }, []);
  const toggle = () => setOpen((o) => !o);
  return (
    <div className="relative">
      <button type="button" id="${name}" aria-haspopup="menu" aria-expanded={open} className="rounded border px-3 py-1" ${press
        ? 'onPointerDown={(e) => { if (e.button === 0) { e.preventDefault(); toggle(); } }} onClick={(e) => { if (e.detail === 0) toggle(); }}'
        : 'onClick={toggle}'}>Options</button>
      {open && <div role="menu" className="absolute top-full left-0 z-10 flex w-32 flex-col bg-white"><div role="menuitem">Rename</div><div role="menuitem">Delete</div></div>}
    </div>
  );
}
`;
const APP = `import { useEffect, useState } from 'react';
${menu('OnClick', false)}${menu('OnPress', true)}
export function App() {
  return (
    <main className="flex gap-40 p-s6 text-body">
      <OnClick />
      <OnPress />
    </main>
  );
}
`;

test('a menu open at rest is closed before the press: one that waits for the click is marked, one that opens on the press is not', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-pairs'])).stdout);
  const marks = at(report, 'craft/menu-pointerdown');
  // a mark sits on the menu's button: each menu is its own component, so its own line
  const own = (name) => APP.slice(0, APP.indexOf(`function ${name}()`)).split('\n').length + 6;
  assert.ok(hasLine(report, 'craft/menu-pointerdown', own('OnClick')), `the menu that waits for the click is marked: ${JSON.stringify(marks.map((m) => m.line))}`);
  assert.ok(!hasLine(report, 'craft/menu-pointerdown', own('OnPress')), `the one that opens on the press is not: ${JSON.stringify(marks.map((m) => m.line))}`);
});
