// Menus on pointerdown (#61), the other half: press, drag onto an item, let go. plumber's probe now does it. A menu that
// opens on the press but whose items choose on click picks nothing (the press began on the button, so no click lands
// on the item): it is marked. One whose items choose on pointerup, and Radix's, pick: they are not.
// Real CLI, real Vite, real Chromium.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, built, fixture, hasLine, plumber } from './helpers/craft-headless.mjs';

const menu = (name, pick) => `function ${name}() {
  const [open, setOpen] = useState(false), [chosen, setChosen] = useState(null);
  const choose = (v) => { setChosen(v); setOpen(false); };
  return (
    <div className="relative">
      <button type="button" id="${name}" aria-haspopup="menu" aria-expanded={open} className="rounded border px-3 py-1"
        onPointerDown={(e) => { if (e.button === 0) { e.preventDefault(); setOpen((o) => !o); } }}>{chosen ?? 'Sort'}</button>
      {open && <div role="menu" className="absolute top-full left-0 z-10 flex w-32 flex-col bg-white">
        {['Name', 'Date'].map((v) => <div key={v} role="menuitem" className="px-2 py-1" ${pick}={() => choose(v)}>{v}</div>)}
      </div>}
    </div>
  );
}
`;
const APP = `import { useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
${menu('OnClick', 'onClick')}${menu('OnRelease', 'onPointerUp')}
function WithRadix() {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger id="WithRadix" className="rounded border px-3 py-1">Sort</Menu.Trigger>
      <Menu.Content className="flex w-32 flex-col bg-white"><Menu.Item className="px-2 py-1">Name</Menu.Item><Menu.Item className="px-2 py-1">Date</Menu.Item></Menu.Content>
    </Menu.Root>
  );
}
export function App() {
  return (
    <main className="flex gap-40 p-s6 text-body">
      <OnClick />
      <OnRelease />
      <WithRadix />
    </main>
  );
}
`;

test('press, drag, release: a menu whose items choose on click picks nothing and is marked; one that picks on release, and Radix, are not', { timeout: 600000 }, async (t) => {
  if (!await built()) return t.skip('Run npm run build first.');
  const { root, url } = await fixture(t, APP);
  const report = JSON.parse((await plumber(['--url', url, '--json', '--root', root, '--no-pairs'])).stdout);
  const marks = at(report, 'craft/menu-pointerdown');
  // each menu's own button line
  const line = (name) => APP.split('\n').findIndex((l) => l.includes(`id="${name}"`)) + 1;
  const of = (name) => marks.filter((m) => m.line === line(name)).map((m) => m.finding.title);
  assert.deepEqual(of('OnClick'), ['Press, drag to an item and let go: nothing is picked.'], JSON.stringify(marks.map((m) => [m.line, m.finding.title])));
  assert.deepEqual(of('OnRelease'), [], 'picks on the release');
  assert.ok(!hasLine(report, 'craft/menu-pointerdown', line('WithRadix')), 'Radix picks on the release');
});
