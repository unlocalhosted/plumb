const Play = () => <svg width="24" height="24" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 1 L14 8 L2 15 Z" /></svg>;
const Square = ({ s = 16 }) => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x={(16 - s) / 2} y={(16 - s) / 2} width={s} height={s} /></svg>;
const Round = ({ r = 8 }) => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r={r} /></svg>;
const Line = ({ w = 1.5, size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} aria-hidden="true"><path d="M4 12h16M12 4v16" /></svg>;
const rows = ['Inbox', 'Drafts', 'Sent', 'Archive', 'Spam', 'Trash', 'Starred', 'Snoozed'];
const tall = Array.from({ length: 12 }, (_, i) => <p key={i} className="text-body">Row {i + 1}</p>);
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 py-s6">
      <div className="grid grid-cols-2 gap-s8">
        <div><button id="optical-centre-bad" className="flex size-10 items-center justify-center rounded-control bg-surface"><Play /></button></div>
        <div><button id="optical-centre-good" className="flex size-10 items-center justify-center rounded-control bg-surface"><Square s={14} /></button></div>
        <div id="overshoot-bad" className="flex gap-s2"><Square /><Square /><Round r={7.5} /></div>
        <div id="overshoot-good" className="flex gap-s2"><Square s={15} /><Square s={15} /><Round /></div>
        <ul className="flex flex-col gap-s1">
          {rows.map((r) => <li key={r} className="flex items-center gap-s2 text-body"><Line />{r}</li>)}
          <li id="stroke-weight-bad" className="flex items-center gap-s2 text-body"><Line w={2.5} />Heavy</li>
        </ul>
        <ul className="flex flex-col gap-s1">
          <li id="stroke-weight-good" className="flex items-center gap-s2 text-body"><Line />Even</li>
        </ul>
        <div id="scroll-cue-bad" className="h-24 overflow-y-auto [scrollbar-width:none]">{tall}</div>
        <div id="scroll-cue-good" className="h-24 overflow-y-auto [scrollbar-width:none] [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">{tall}</div>
        <div className="flex gap-s2">
          <button className="rounded-control bg-surface px-s3 py-s2 text-body active:scale-95">Save</button>
          <button className="rounded-control bg-surface px-s3 py-s2 text-body active:scale-95">Share</button>
          <button id="press-feedback-bad" className="rounded-control bg-surface px-s3 py-s2 text-body">Copy</button>
        </div>
        <div><button id="press-feedback-good" className="rounded-control bg-surface px-s3 py-s2 text-body active:scale-95">Move</button></div>
        <div><div id="exit-faster-bad" data-state="open" className="rounded-card bg-surface p-s4 text-body transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0">Menu</div></div>
        <div><div id="exit-faster-good" data-state="open" className="rounded-card bg-surface p-s4 text-body transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:duration-150">Menu</div></div>
        <div><div id="interruptible-bad" data-state="open" className="rounded-card bg-surface p-s4 text-body data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-150">Popover</div></div>
        <div><div id="interruptible-good" data-state="open" className="rounded-card bg-surface p-s4 text-body transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:duration-150">Popover</div></div>
      </div>
    </main>
  );
}
