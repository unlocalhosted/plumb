// The test page for the checks from Pratik's tips (docs/research/harvests/maybepratikk/tips.md): dead strips between
// menu rows, a tooltip cut off by the screen's edge, and a list in a popover that moves the page behind it. Each
// fault once, with the cases its check must stay quiet on. The page is long, so there is a page behind to move.
import { useState } from 'react';

const actions = ['Open in new tab', 'Rename', 'Duplicate', 'Copy link', 'Archive'];
const people = Array.from({ length: 20 }, (_, i) => `Person ${i + 1}`);
const Row = ({ children }) => <li><button role="menuitem" className="w-full rounded px-3 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-100">{children}</button></li>;

function Tip({ id, label, place, children }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button id={id} aria-describedby={`${id}-tip`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white">{children}</button>
      {open && <span id={`${id}-tip`} role="tooltip" className={`absolute left-0 z-10 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white ${place}`}>{label}</span>}
    </span>
  );
}

export function App() {
  return (
    <main className="mx-auto grid max-w-2xl gap-12 p-10 pb-[1600px] pt-24">
      {/* tooltip-cut: a bar fixed to the top; the first tooltip opens above it, off the screen */}
      <header className="fixed inset-x-0 top-0 flex h-12 items-center gap-3 bg-slate-900 px-4">
        <Tip id="share" label="Copy share link" place="bottom-full mb-1">Share</Tip>
        {/* quiet: opens below, where there is room */}
        <Tip id="alerts" label="Notifications" place="top-full mt-1">Alerts</Tip>
      </header>

      <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>

      {/* row-dead-zone: 4px between rows that belongs to no row */}
      <ul id="gapped" role="menu" className="grid w-56 gap-1 rounded-lg bg-white p-1 shadow">
        {actions.map((a) => <Row key={a}>{a}</Row>)}
      </ul>
      {/* quiet: rows that touch */}
      <ul id="touching" role="menu" className="grid w-56 rounded-lg bg-white p-1 shadow">
        {actions.map((a) => <Row key={a}>{a}</Row>)}
      </ul>
      {/* quiet: separate things, set well apart */}
      <ul id="apart" className="grid w-56 gap-4">
        {actions.slice(0, 3).map((a) => <li key={a}><button className="w-full rounded-lg bg-slate-100 px-3 py-3 text-left text-sm text-slate-800">{a}</button></li>)}
      </ul>

      {/* scroll-chain, widened: a list in a popover, positioned out of the page's flow */}
      <div className="relative h-10">
        <ul id="picker" role="listbox" className="absolute left-0 top-0 h-40 w-56 overflow-y-auto rounded-lg bg-white p-1 shadow">
          {people.map((p) => <li key={p} role="option" aria-selected="false" className="px-3 py-1.5 text-sm text-slate-800">{p}</li>)}
        </ul>
      </div>
      <div className="relative mt-40 h-10">
        {/* quiet: the same list, keeping its scroll */}
        <ul id="kept" role="listbox" className="absolute left-0 top-0 h-40 w-56 overflow-y-auto overscroll-contain rounded-lg bg-white p-1 shadow">
          {people.map((p) => <li key={p} role="option" aria-selected="false" className="px-3 py-1.5 text-sm text-slate-800">{p}</li>)}
        </ul>
      </div>
    </main>
  );
}
