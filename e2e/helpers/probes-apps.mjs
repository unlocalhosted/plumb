// The fixture apps for the probes test (layer 5). Each DOES the thing: a panel that really animates in and out, a Radix
// and a Headless UI menu, a Radix tooltip provider with the wrong delay beside a right one, a form whose counter the
// test asserts at 0 to prove no probe submitted anything.
const BTN = 'rounded-control bg-surface px-s4 py-s2 text-body transition-transform active:scale-95';

export const STYLES = `
.t-same, .t-quick { transition: opacity 200ms ease, transform 200ms ease; }
.t-quick[data-state=closed] { transition-duration: 100ms; }
.t-same[data-state=closed], .t-quick[data-state=closed] { opacity: 0; transform: scale(.95); pointer-events: none; }
.t-same[data-state=open], .t-quick[data-state=open] { opacity: 1; transform: none; }
@keyframes k-in { from { opacity: 0; transform: scale(.95); } to { opacity: 1; transform: none; } }
@keyframes k-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: scale(.95); } }
.k-restart[data-state=open] { animation: k-in 300ms ease forwards; }
.k-restart[data-state=closed] { animation: k-out 150ms ease forwards; }
.palette-in { animation: k-in 200ms ease both; }
.menu-box { background: var(--color-surface); border-radius: var(--radius-card); padding: 8px; box-shadow: var(--shadow-rest); min-width: 128px; font-size: 14px; color: var(--color-ink); }
.menu-item { padding: 10px 8px; border-radius: 6px; cursor: default; outline: none; }
.menu-item[data-highlighted], .menu-item[data-focus] { background: var(--color-ground); }
`;

const disclosure = (name, id, cls) => `function ${name}() {
  const [open, setOpen] = useState(false);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') setOpen(false); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  return <div className="relative"><button id="${id}-btn" aria-expanded={open} aria-controls="${id}" onClick={() => setOpen((o) => !o)} className="${BTN}">${name}</button><div id="${id}" data-state={open ? 'open' : 'closed'} className="${cls} mt-s2 rounded-card bg-surface p-s3 text-body text-ink">panel</div></div>;
}
`;
const loader = (name, id, wait) => `function ${name}() {
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(${wait === 0});
  return <button id="${id}" className="${BTN}" onClick={() => { setBusy(true); ${wait ? `setTimeout(() => setShown(true), ${wait});` : ''} fetch('/api/slow').then(() => { setBusy(false); ${wait ? 'setShown(false);' : ''} }); }}>{busy && shown ? <span role="status" className="inline-block size-4 animate-spin rounded-full border-2 border-ink" /> : 'Load'}</button>;
}
`;

// motion, presses, spinners that start on a press, and the things no probe may touch
export const MOTION = `import { useEffect, useState } from 'react';
${disclosure('Slow', 'pn-slow', 't-same')}${disclosure('Quick', 'pn-quick', 't-quick')}${disclosure('Restart', 'pn-restart', 'k-restart')}${loader('LoadNow', 'ld-bad', 0)}${loader('LoadLater', 'ld-good', 300)}
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s4 px-s4 pb-s6 text-body text-ink">
      <Slow />
      <Quick />
      <Restart />
      <button id="pr-bad" className="rounded-control bg-surface px-s4 py-s2 text-body">Save</button>
      <button id="pr-good" className="${BTN}">Save</button>
      <button id="pr-late" className="rounded-control bg-surface px-s4 py-s2 text-body transition-colors delay-200 active:bg-ground">Save</button>
      <LoadNow />
      <LoadLater />
      <form onSubmit={(e) => { e.preventDefault(); fetch('/api/count', { method: 'POST' }); }}><button id="submit-btn" type="submit" className="rounded-control bg-surface px-s4 py-s2 text-body">Send</button></form>
      <a id="away" href="/elsewhere" className="text-body text-ink">Elsewhere</a>
      <button id="posts" className="${BTN}" onClick={() => fetch('/api/hit', { method: 'POST' })}>Post</button>
    </main>
  );
}
`;

// menus: Radix (opens on the press, has a safe triangle), Headless UI (opens on the click), and a hand-made nested one
export const MENUS = `import { useEffect, useState } from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
function Custom() {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') { setOpen(false); setSub(false); } }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  return (
    <div className="relative">
      <button id="mn-custom" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="${BTN}">Custom menu</button>
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
function Flat() {
  const [open, setOpen] = useState(false);
  const setSub = () => {};
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') { setOpen(false); setSub(false); } }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  return (
    <div className="relative">
      <button id="mn-flat" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="${BTN}">Flat menu</button>
      {open && <div role="menu" className="menu-box absolute left-0 top-full z-10" style={{ width: 128 }}><div role="menuitem" className="menu-item">Settings</div><div role="menuitem" className="menu-item">Help</div></div>}
    </div>
  );
}
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-start gap-s4 px-s4 pb-6 text-body text-ink" style={{ minHeight: 600 }}>
      <Dropdown.Root>
        <Dropdown.Trigger id="mn-radix" className="${BTN}">Radix menu</Dropdown.Trigger>
        <Dropdown.Portal>
          <Dropdown.Content className="menu-box" sideOffset={4} style={{ width: 128 }}>
            <Dropdown.Sub>
              <Dropdown.SubTrigger className="menu-item">More</Dropdown.SubTrigger>
              <Dropdown.Portal><Dropdown.SubContent className="menu-box" sideOffset={2}><Dropdown.Item className="menu-item">Alpha</Dropdown.Item><Dropdown.Item className="menu-item">Beta</Dropdown.Item><Dropdown.Item className="menu-item">Gamma</Dropdown.Item></Dropdown.SubContent></Dropdown.Portal>
            </Dropdown.Sub>
            <Dropdown.Item className="menu-item">Settings</Dropdown.Item>
            <Dropdown.Item className="menu-item">Help</Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Portal>
      </Dropdown.Root>
      <Menu as="div">
        <MenuButton id="mn-headless" className="${BTN}">Headless menu</MenuButton>
        <MenuItems className="menu-box"><MenuItem><div className="menu-item">Settings</div></MenuItem><MenuItem><div className="menu-item">Help</div></MenuItem></MenuItems>
      </Menu>
      <Custom />
      <Flat />
    </main>
  );
}
`;

// tooltips: four providers with the wait set four ways, and a shortcut that opens a palette with an entrance
const tip = (id, label) => `<Tooltip.Root><Tooltip.Trigger asChild><button id="${id}" className="${BTN}">${label}</button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="menu-box" sideOffset={6}>${label} tip</Tooltip.Content></Tooltip.Portal></Tooltip.Root>`;
export const TIPS = (palette = 'palette-in') => `import { useEffect, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
function Palette() {
  const [open, setOpen] = useState(false);
  useEffect(() => { const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen((o) => !o); } if (e.key === 'Escape') setOpen(false); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  return open ? <div role="dialog" aria-label="Commands" id="palette" className="${palette} fixed left-1/2 top-24 -translate-x-1/2 rounded-card bg-surface p-s4 text-body text-ink shadow-rest">Commands</div> : null;
}
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-start gap-s4 px-s4 pb-s6 text-body text-ink">
      <Palette />
      <Tooltip.Provider delayDuration={500} skipDelayDuration={0}>
        <div id="tp-p0" className="flex gap-s2">${tip('tp-skip-1', 'One')}${tip('tp-skip-2', 'Two')}</div>
      </Tooltip.Provider>
      <Tooltip.Provider delayDuration={0} skipDelayDuration={300}>
        <div id="tp-p1" className="flex gap-s2">${tip('tp-quick-1', 'Three')}${tip('tp-quick-2', 'Four')}</div>
      </Tooltip.Provider>
      <Tooltip.Provider delayDuration={1300} skipDelayDuration={300}>
        <div id="tp-p2" className="flex gap-s2">${tip('tp-slow-1', 'Five')}${tip('tp-slow-2', 'Six')}</div>
      </Tooltip.Provider>
      <Tooltip.Provider delayDuration={500} skipDelayDuration={300}>
        <div id="tp-p3" className="flex gap-s2">${tip('tp-good-1', 'Seven')}${tip('tp-good-2', 'Eight')}</div>
      </Tooltip.Provider>
    </main>
  );
}
`;

// two things to drag: one stops dead at 40px, one gives (a third of the travel past 40px)
const dragger = (name, id, over) => `function ${name}() {
  const [x, setX] = useState(0);
  const from = useRef(null);
  return <div id="${id}" className="w-24 select-none rounded-card bg-surface p-s3 text-body text-ink" style={{ touchAction: 'none', cursor: 'grab', transform: \`translateX(\${x}px)\` }} onPointerDown={(e) => { from.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={(e) => { if (from.current === null) return; const raw = Math.max(0, e.clientX - from.current); setX(${over}); }} onPointerUp={() => { from.current = null; setX(0); }}>Drag</div>;
}
`;
export const DRAGS = `import { useRef, useState } from 'react';
${dragger('Stops', 'dr-dead', 'Math.min(raw, 40)')}${dragger('Gives', 'dr-elastic', 'raw <= 40 ? raw : 40 + (raw - 40) * 0.3')}
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-start gap-s4 px-s4 pb-s6 text-body text-ink">
      <Stops />
      <Gives />
    </main>
  );
}
`;
