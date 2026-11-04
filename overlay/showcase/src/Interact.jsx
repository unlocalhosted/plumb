// The parts of Quarry that only show their craft when used: pressed, hovered, dragged, waited on. `plumber craft` finds
// these by doing it (its probes and pairs); the overlay can't see them on a page at rest.
import { useEffect, useRef, useState } from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Refresh } from './icons.jsx';

const MENU = 'q-menu flex w-52 flex-col rounded-control bg-surface p-1 text-sm text-ink shadow-popover';
const ITEM = 'flex h-8 items-center rounded-chip px-2 outline-none data-[highlighted]:bg-sunken';
const WORKSPACES = ['Quarry Studio', 'Halden Projects', 'Personal'];

// #61 the menu opens on the press, so a press-drag-release picks an item. #59 its submenu stays open while the pointer
// crosses the item below on its way there. Broken: a hand-made menu that opens on click and drops its submenu.
export function UserMenu({ broken }) {
  const [open, setOpen] = useState(false), [sub, setSub] = useState(false);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') { setOpen(false); setSub(false); } }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  const avatar = 'grid size-8 place-items-center rounded-full bg-violet text-xs font-medium text-accent-ink transition-transform active:scale-95';
  if (broken) return (
    <div className="relative">
      <button type="button" aria-label="Account" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={avatar}>AM</button>
      {open && (
        <div role="menu" className={MENU + ' absolute top-10 right-0 z-30'}>
          <div role="menuitem" aria-haspopup="menu" aria-expanded={sub} className={ITEM} onMouseEnter={() => setSub(true)}>Switch workspace</div>
          <div role="menuitem" className={ITEM} onMouseEnter={() => setSub(false)}>Profile</div>
          <div role="menuitem" className={ITEM} onMouseEnter={() => setSub(false)}>Sign out</div>
          {sub && <div role="menu" className={MENU + ' absolute top-0 right-full mr-1'}>{WORKSPACES.map((w) => <div key={w} role="menuitem" className={ITEM}>{w}</div>)}</div>}
        </div>
      )}
    </div>
  );
  return (
    <Dropdown.Root>
      <Dropdown.Trigger aria-label="Account" className={avatar}>AM</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content align="end" sideOffset={8} className={MENU}>
          <Dropdown.Sub>
            <Dropdown.SubTrigger className={ITEM}>Switch workspace</Dropdown.SubTrigger>
            <Dropdown.Portal><Dropdown.SubContent sideOffset={4} className={MENU}>{WORKSPACES.map((w) => <Dropdown.Item key={w} className={ITEM}>{w}</Dropdown.Item>)}</Dropdown.SubContent></Dropdown.Portal>
          </Dropdown.Sub>
          <Dropdown.Item className={ITEM}>Profile</Dropdown.Item>
          <Dropdown.Item className={ITEM}>Sign out</Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

// #62 ⌘K opens the commands at once, with no entrance (broken.css animates it in)
export function Palette() {
  const [open, setOpen] = useState(false);
  useEffect(() => { const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen((o) => !o); } if (e.key === 'Escape') setOpen(false); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  if (!open) return null;
  return (
    <div role="dialog" aria-label="Commands" className="q-palette fixed inset-x-0 top-24 z-40 mx-auto flex w-[560px] flex-col gap-1 rounded-card bg-surface p-2 text-sm shadow-popover">
      <input autoFocus aria-label="Command" placeholder="Type a command or search" className="q-field h-10 rounded-control bg-sunken px-3 text-base" />
      {['New invoice', 'Go to Invoices', 'Invite member'].map((c) => <div key={c} className="flex h-8 items-center rounded-chip px-2">{c}</div>)}
    </div>
  );
}

const tip = (label, children) => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
    <Tooltip.Portal><Tooltip.Content sideOffset={6} className="rounded-chip bg-ink px-2 py-1 text-xs text-accent-ink">{label}</Tooltip.Content></Tooltip.Portal>
  </Tooltip.Root>
);

// #60 the toolbar's tooltips wait a beat for the first and none for the next (broken: they flicker up at once).
// #66 Refresh shows a spinner only if the reply is slow, and then keeps it long enough to be read.
export function Toolbar({ broken }) {
  const [busy, setBusy] = useState(false), [spin, setSpin] = useState(false);
  const refresh = () => {
    setBusy(true);
    const t = setTimeout(() => setSpin(true), broken ? 0 : 300);
    fetch('/api/refresh').then(() => { clearTimeout(t); setBusy(false); setSpin(false); });
  };
  const btn = 'grid size-9 place-items-center rounded-control text-ink-muted hover:bg-sunken active:bg-line';
  return (
    <Tooltip.Provider delayDuration={broken ? 0 : 500} skipDelayDuration={300}>
      {tip('Refresh invoices', <button type="button" aria-label="Refresh" onClick={refresh} className={btn}>{busy && spin ? <span role="status" aria-label="Refreshing" className="size-4 animate-spin rounded-full border-2 border-ink-subtle border-t-transparent" /> : <Refresh />}</button>)}
      {tip('Download as CSV', <button type="button" aria-label="Download" className={btn}><Refresh className="rotate-90" /></button>)}
    </Tooltip.Provider>
  );
}

// #68 a panel leaves quicker than it came. #64 closed midway, it reverses from where it is (broken: Columns restarts
// its keyframes from the far end).
export function Disclosure({ label, keyed, children }) {
  const [open, setOpen] = useState(false);
  const id = 'q-' + label.toLowerCase();
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="h-9 rounded-control bg-surface px-4 text-sm font-medium shadow-raised active:bg-sunken">{label}</button>
      <div id={id} data-state={open ? 'open' : 'closed'} className={(keyed ? 'q-keyed' : 'q-panel') + ' absolute top-11 left-0 z-20 flex w-56 flex-col gap-2 rounded-control bg-surface px-3 pt-2 pb-3 text-sm shadow-popover'}>{children}</div>
    </div>
  );
}

// #65 dragged past its end, the handle gives a little and springs back (broken: it stops dead).
export function SlideToPay({ broken }) {
  const [x, setX] = useState(0);
  const from = useRef(null);
  const end = 220;
  const give = (raw) => (broken ? Math.max(0, Math.min(raw, end)) : raw <= end ? Math.max(0, raw) : end + (raw - end) * 0.3);
  return (
    <div className="relative h-11 rounded-full bg-sunken p-1 text-sm text-ink-muted">
      <span className="absolute inset-0 grid place-items-center">Slide to mark as paid</span>
      <div role="button" aria-label="Mark INV-2041 as paid" tabIndex={0}
        className={'relative grid h-9 w-14 cursor-grab place-items-center rounded-full bg-positive text-accent-ink shadow-raised select-none active:bg-positive/90 ' + (from.current === null ? 'transition-transform ' : '') + 'touch-none'}
        style={{ transform: `translateX(${x}px)` }}
        onClick={() => {}}
        onPointerDown={(e) => { from.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (from.current !== null) setX(give(e.clientX - from.current)); }}
        onPointerUp={() => { from.current = null; setX(0); }}>→</div>
    </div>
  );
}

// #71 a grip built from a div says it handles touch itself, so a phone neither flashes it grey nor scrolls the page
// under the drag (broken: touch-action left to the browser)
export function Grip({ broken, label }) {
  const [y, setY] = useState(0);
  const from = useRef(null);
  return (
    <div role="button" tabIndex={0} aria-label={'Reorder ' + label} onClick={() => {}}
      className={'grid size-6 cursor-grab place-items-center rounded-chip text-ink-subtle hover:bg-sunken active:bg-line ' + (broken ? '' : 'touch-none')}
      style={{ transform: `translateY(${y}px)` }}
      onPointerDown={(e) => { from.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { if (from.current !== null) setY(e.clientY - from.current); }}
      onPointerUp={() => { from.current = null; setY(0); }}>⋮⋮</div>
  );
}

// #77 the activity feed's skeleton is the shape of what lands: the same rows at the same height
export function Activity({ broken }) {
  const [items, setItems] = useState(null);
  useEffect(() => { fetch('/api/activity').then((r) => r.json()).then(setItems); }, []);
  return (
    <section aria-label="Recent activity" className="flex flex-col gap-2 rounded-card bg-surface px-4 pt-3 pb-4 shadow-raised">
      <h2 className="text-base font-semibold">Recent activity</h2>
      <ul className="flex flex-col">
        {items
          ? items.map((i) => <li key={i.id} className="flex h-12 items-center justify-between text-sm"><span>{i.what}</span><span className="text-ink-muted">{i.when}</span></li>)
          : [0, 1, 2].map((n) => <li key={n} className={'flex items-center ' + (broken ? 'h-8' : 'h-12')}><span className="h-3 w-2/3 animate-pulse rounded-chip bg-sunken" /></li>)}
      </ul>
    </section>
  );
}
