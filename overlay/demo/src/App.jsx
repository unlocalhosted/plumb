// A settings page with the drift a real one collects: hardcoded spacing, an off-scale radius, a hand-written shadow.
function SyncRow({ title, detail, action }) {
  return (
    <div id="sync-row" className="flex items-center gap-[10px] py-[10px] px-[14px] rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)]">
      <span className="size-8 shrink-0 rounded-full bg-ground" />
      <div className="flex min-w-0 flex-1 flex-col gap-s1">
        <span className="text-[13.5px] font-medium">{title}</span>
        <span className="text-small text-ink-muted">{detail}</span>
      </div>
      <button className="h-8 rounded-control px-s3 text-small font-medium shadow-[inset_0_0_0_1px_var(--color-rule)]">{action}</button>
    </div>
  );
}

function Chip({ children }) {
  return <span id="beta-chip" className="inline-flex items-center gap-[3px] rounded-[5px] bg-accent/10 px-[7px] py-[2px] text-[11px] font-semibold text-accent">{children}</span>;
}

// The corner cases, below the fold and only with ?corners in the URL: every way a real page tries to break the
// blueprint (docs/briefs/blueprint-corners.md). The page without them is what the recording and the main suite see.
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export function Corners() {
  return (
    <section id="corners" className="flex flex-col gap-s6">
      <p id="prose" className="max-w-sm text-body">Plain words, <b className="font-semibold">bold words</b> and <em>emphasised words</em> share one line, then enough words follow to wrap this paragraph onto a second and a third line of its own.</p>
      <p id="truncated" className="max-w-[160px] truncate text-small text-ink-muted">A long label that is cut with an ellipsis long before it ends</p>
      <div id="plates" className="flex items-center gap-s3">
        <button id="icon-button" className="flex h-8 items-center gap-s1 rounded-control px-s3 text-small shadow-[inset_0_0_0_1px_var(--color-rule)]">
          <svg id="icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="#2f5bd3" /><text x="8" y="11" fontSize="8" textAnchor="middle" fill="#fff">i</text></svg>
          Icon
        </button>
        <svg id="logo" width="48" height="24" viewBox="0 0 48 24" aria-hidden="true"><rect width="48" height="24" rx="4" fill="#15181b" /><path d="M6 12h36" stroke="#fff" strokeWidth="2" /><text x="24" y="20" fontSize="6" fill="#fff" textAnchor="middle">logo</text></svg>
        <img id="photo" alt="" width="40" height="40" src={PIXEL} className="rounded-[7px] bg-ground" />
        <canvas id="chart" width="60" height="24" className="rounded-tag bg-ground" />
        <div id="hero" className="h-10 w-16 rounded-tag bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3C/svg%3E')] bg-accent/20" />
      </div>
      <div id="fields" className="flex items-center gap-s2">
        <input id="field" className="h-8 rounded-control px-s2 text-small shadow-[inset_0_0_0_1px_var(--color-rule)]" placeholder="Search" defaultValue="hello" />
        <span id="pseudo" className="text-small text-ink-muted before:text-[10px] before:content-['NEW']" />
        <div id="editable" contentEditable suppressContentEditableWarning className="min-w-20 text-small">editable words</div>
        <label className="flex items-center gap-s1 text-small"><input type="checkbox" defaultChecked /> Opt in</label>
        <span id="tiny" className="text-[9px] text-ink-muted">tiny print</span>
        <span id="lonely" className="flex gap-[6px] rounded-tag bg-ground px-s1 text-small"><span>only child</span></span>
      </div>
      <div id="wrapper" className="flex flex-col gap-[9px] rounded-card bg-surface p-[13px] shadow-rest">
        <div id="dense" className="grid grid-cols-6 gap-[5px]">
          {Array.from({ length: 36 }, (_, i) => <span key={i} className="h-6 rounded-[3px] bg-ground px-[3px] text-[9px] leading-6 text-ink-muted">{i + 1}</span>)}
        </div>
        <ul id="rows" className="flex flex-col gap-s1">
          {['one', 'two', 'three', 'four'].map((word) => <li key={word} className="flex items-center justify-between rounded-[5px] px-[6px] py-s1 text-small"><span>{word}</span><span className="text-ink-muted">0</span></li>)}
        </ul>
        <button id="nested-button" className="self-start rounded-[11px] px-s3 py-s1 text-small shadow-[inset_0_0_0_1px_var(--color-rule)]">Nested</button>
      </div>
      <div id="hidden" className="hidden gap-[11px] p-[11px] text-small">never shown</div>
      <div id="invisible" className="invisible h-4 gap-[11px] p-[11px] text-small">unseen words</div>
      <details id="folded" className="text-small"><summary>More</summary><div id="folded-body" className="gap-[11px] p-[11px]">folded away</div></details>
      <div id="relative" className="relative h-16 rounded-card bg-surface shadow-rest">
        <span id="corner-badge" className="absolute right-[6px] top-[6px] rounded-tag bg-accent/10 px-s1 text-[11px] text-accent">3</span>
        <div id="scaled" className="absolute left-s3 top-s3 origin-top-left scale-75 rounded-[9px] bg-ground px-[7px] py-[3px] text-small">scaled</div>
      </div>
      <div id="scroller" className="flex h-20 flex-col gap-[7px] overflow-y-auto rounded-card bg-surface p-s2 shadow-rest">
        {Array.from({ length: 12 }, (_, i) => <div key={i} className="h-5 shrink-0 rounded-[4px] bg-ground px-s1 text-small leading-5">line {i + 1}</div>)}
      </div>
      {[0, 1, 2].map((k) => <div key={k} id={`stagger-${k}`} className="h-2 rounded-tag bg-accent/20" style={{ marginLeft: k * 13, width: `${40 + k * 10}%` }} />)}
    </section>
  );
}

export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6">
      <header className="flex items-center gap-s2">
        <h1 className="text-body font-semibold">Integrations</h1>
        <Chip>Beta</Chip>
      </header>
      <section className="flex flex-col gap-s3">
        <SyncRow title="Sync calendar" detail="Last run 4 minutes ago" action="Run now" />
        <div className="flex items-center gap-s3 rounded-card bg-surface px-s4 py-s3 shadow-rest">
          <span className="size-8 shrink-0 rounded-full bg-ground" />
          <div className="flex flex-1 flex-col gap-s1">
            <span className="text-body font-medium">Import contacts</span>
            <span className="text-small text-ink-muted">Every night at 2:00</span>
          </div>
          <button className="h-8 rounded-control px-s3 text-small font-medium shadow-[inset_0_0_0_1px_var(--color-rule)]">Edit</button>
        </div>
      </section>
      {new URLSearchParams(location.search).has('corners') && <Corners />}
    </main>
  );
}
