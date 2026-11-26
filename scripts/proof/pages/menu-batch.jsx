// The test page for the checks from Pratik's tips (docs/research/harvests/maybepratikk/tips.md): dead strips between
// menu rows, a tooltip cut off by the screen's edge, and a list in a popover that moves the page behind it. Each
// fault once, with the cases its check must stay quiet on. The page is long, so there is a page behind to move.
import { useState } from 'react';

const actions = ['Open in new tab', 'Rename', 'Duplicate', 'Copy link', 'Archive'];
const people = Array.from({ length: 20 }, (_, i) => `Person ${i + 1}`);
const Row = ({ children }) => <li><button role="menuitem" className="w-full rounded px-3 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-100">{children}</button></li>;

// a trigger that shows its tooltip on hover; the tooltip is passed in, so its classes sit on its own line
function Hint({ id, tip, children }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button id={id} aria-describedby={`${id}-tip`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white">{children}</button>
      {open && tip}
    </span>
  );
}

export function App() {
  return (
    <main className="mx-auto grid max-w-2xl gap-12 p-10 pb-[1600px] pt-24">
      {/* tooltip-cut: a bar fixed to the top; the first tooltip opens above it, off the screen */}
      <header className="fixed inset-x-0 top-0 flex h-12 items-center gap-3 bg-slate-900 px-4">
        <Hint id="share" tip={<span id="share-tip" role="tooltip" className="absolute bottom-full left-0 z-10 mb-1 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white">Copy share link</span>}>Share</Hint>
        {/* quiet: opens below, where there is room */}
        <Hint id="alerts" tip={<span id="alerts-tip" role="tooltip" className="absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white">Notifications</span>}>Alerts</Hint>
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
      {/* quiet: rows ruled by their own line, a link filling each; the pixel between two links is the divider */}
      <ul id="ruled" className="w-56">
        {actions.map((a) => <li key={a} className="border-t border-slate-200 first:border-t-0"><a href={`#${a}`} className="block py-2 text-sm text-slate-800">{a}</a></li>)}
      </ul>
      {/* quiet: questions, each a heading holding its button, set apart by space alone; not a menu */}
      <div id="questions" className="grid w-56 gap-2">
        {actions.slice(0, 3).map((a) => <div key={a}><h3><button className="w-full py-2 text-left text-sm text-slate-800">{a}?</button></h3></div>)}
      </div>

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
