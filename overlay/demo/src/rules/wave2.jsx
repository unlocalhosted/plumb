export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6">
      <style>{'@keyframes pop-zero { from { transform: scale(0) } to { transform: scale(1) } } @keyframes pop-near { from { transform: scale(0.95) } to { transform: scale(1) } }'}</style>
      <ul id="list-bad" className="flex flex-col">
        <li className="py-s1 text-small">Inbox</li>
        <li id="row-bad" className="rounded-control bg-surface px-s3 py-s1 text-small">Board</li>
        <li className="py-s1 text-small">Issues</li>
        <li className="py-s1 text-small">Automations</li>
      </ul>
      <ul id="list-good" className="flex flex-col">
        <li className="py-s1 text-small">Inbox</li>
        <li id="row-good" className="-mx-s3 rounded-control bg-surface px-s3 py-s1 text-small">Board</li>
        <li className="py-s1 text-small">Issues</li>
        <li className="py-s1 text-small">Automations</li>
      </ul>
      <div className="flex gap-s4">
        <img id="img-bad" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP48+c3VsQwtCQAwE+8wUiVX/4AAAAASUVORK5CYII=" width="64" height="64" alt="" />
        <img id="img-good" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP48+c3VsQwtCQAwE+8wUiVX/4AAAAASUVORK5CYII=" width="64" height="64" alt="" className="outline outline-1 -outline-offset-1 outline-black/10" />
      </div>
      <div className="flex gap-s4">
        <div id="shadow-bad" className="h-16 w-32 rounded-card bg-surface shadow-[0_12px_32px_rgba(0,0,0,0.18)]" />
        <div id="shadow-good" className="h-16 w-32 rounded-card bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_8px_rgba(0,0,0,0.06),0_12px_24px_rgba(0,0,0,0.06)]" />
      </div>
      <div className="flex gap-s4">
        <div id="pop-bad" className="h-10 w-24 rounded-control bg-surface text-small" style={{ animation: 'pop-zero 1ms both' }}>from zero</div>
        <div id="pop-good" className="h-10 w-24 rounded-control bg-surface text-small" style={{ animation: 'pop-near 1ms both' }}>from 0.95</div>
      </div>
      <div className="relative flex gap-s4">
        <div id="z-bad" className="relative z-[999] h-10 w-24 bg-surface text-small">z 999</div>
        <div id="z-good" className="relative z-10 h-10 w-24 bg-surface text-small">z 10</div>
      </div>
      <div className="flex flex-col gap-s2">
        <div id="rule-bad" className="h-px w-48 bg-ink-muted" />
        <div className="h-4" />
      </div>
    </main>
  );
}
