// The test page for the scroll and native-control checks (docs/research/scroll-batch.md): each fault once, and beside
// it the cases its check must stay quiet on. The page itself is long, so there is a page behind the panel to move.
const plans = ['Starter', 'Team', 'Business', 'Enterprise'];
const tags = ['Design', 'Research', 'Billing', 'Support', 'Growth', 'Legal', 'Finance', 'People', 'Security', 'Platform', 'Mobile', 'Data'];
const notes = Array.from({ length: 24 }, (_, i) => `Note ${i + 1}`);
const Slide = ({ children, className = '' }) => <section className={`rounded-lg bg-slate-100 p-6 text-slate-800 ${className}`}>{children}</section>;

export function App() {
  return (
    <main className="mx-auto grid max-w-2xl gap-10 p-10 pb-[1600px]">
      <h1 className="text-2xl font-semibold text-slate-900">Workspace</h1>

      {/* snap-rest: paged cards with nowhere to rest */}
      <div id="rest" className="flex gap-4 overflow-x-auto">
        {plans.map((p) => <div key={p} className="w-[70%] shrink-0 rounded-lg bg-slate-100 p-6 text-slate-800">{p} plan</div>)}
      </div>
      {/* quiet: small chips scroll freely */}
      <div id="chips" className="flex gap-2 overflow-x-auto">
        {tags.map((t) => <span key={t} className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{t}</span>)}
      </div>
      {/* quiet: already rests on a card */}
      <div id="rested" className="flex snap-x snap-mandatory gap-4 overflow-x-auto">
        {plans.map((p) => <div key={p} className="w-[70%] shrink-0 snap-start rounded-lg bg-slate-100 p-6 text-slate-800">{p} plan</div>)}
      </div>

      {/* snap-strict: one part far taller than the view */}
      <div id="strict" className="grid h-64 snap-y snap-mandatory gap-4 overflow-y-auto">
        <Slide className="h-64 snap-start">Overview</Slide>
        <Slide className="h-[520px] snap-start">The long terms, which run well past one screen of this panel.</Slide>
        <Slide className="h-64 snap-start">Sign</Slide>
      </div>
      {/* quiet: the same long part, snapping only when near */}
      <div id="near" className="grid h-64 snap-y snap-proximity gap-4 overflow-y-auto">
        <Slide className="h-64 snap-start">Overview</Slide>
        <Slide className="h-[520px] snap-start">The long terms, which run well past one screen of this panel.</Slide>
      </div>

      {/* snap-unreachable: the third part names no place to rest */}
      <div id="steps" className="grid h-64 snap-y snap-mandatory gap-4 overflow-y-auto">
        <Slide className="h-64 snap-start">Step one</Slide>
        <Slide className="h-64 snap-start">Step two</Slide>
        <Slide className="h-64">Step three</Slide>
        <Slide className="h-64 snap-start">Step four</Slide>
      </div>

      {/* snap-offset: parts rest under the stuck bar */}
      <div id="under" className="h-72 snap-y snap-proximity overflow-y-auto rounded-lg bg-white">
        <div className="sticky top-0 flex h-12 items-center bg-slate-900 px-4 text-sm font-medium text-white">Release notes</div>
        <Slide className="h-64 snap-start">November</Slide>
        <Slide className="h-64 snap-start">October</Slide>
        <Slide className="h-64 snap-start">September</Slide>
      </div>
      {/* quiet: room kept for the bar */}
      <div id="clear" className="h-72 snap-y snap-proximity scroll-pt-12 overflow-y-auto rounded-lg bg-white">
        <div className="sticky top-0 flex h-12 items-center bg-slate-900 px-4 text-sm font-medium text-white">Release notes</div>
        <Slide className="h-64 snap-start">November</Slide>
        <Slide className="h-64 snap-start">October</Slide>
      </div>

      {/* scroll-chain: a panel fixed over the page */}
      <aside id="panel" className="fixed right-4 top-4 h-48 w-56 overflow-y-auto rounded-lg bg-white p-3 text-sm text-slate-800 shadow-lg">
        {notes.map((n) => <p key={n} className="py-1">{n}</p>)}
      </aside>
      {/* quiet: a panel that keeps its scroll, and a block in the page's own flow */}
      <aside id="kept" className="fixed right-4 top-60 h-48 w-56 overflow-y-auto overscroll-contain rounded-lg bg-white p-3 text-sm text-slate-800 shadow-lg">
        {notes.map((n) => <p key={n} className="py-1">{n}</p>)}
      </aside>
      <div id="inflow" className="h-40 overflow-y-auto rounded-lg bg-slate-50 p-3 text-sm text-slate-800">
        {notes.map((n) => <p key={n} className="py-1">{n}</p>)}
      </div>

      {/* native-accent: browser-drawn controls beside green buttons */}
      <form className="grid gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-800"><input id="box" type="checkbox" defaultChecked /> Email me the weekly summary</label>
        <label className="grid gap-1 text-sm text-slate-800">Volume <input id="range" type="range" defaultValue="60" /></label>
        <label className="grid gap-1 text-sm text-slate-800">Storage used <progress id="bar" value="40" max="100" /></label>
        {/* quiet: already in the product's colour */}
        <label className="flex items-center gap-2 text-sm text-slate-800"><input id="own" type="checkbox" defaultChecked className="accent-emerald-600" /> Keep me signed in</label>
        <div className="flex gap-3">
          <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Save</button>
          <button type="button" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Save and close</button>
        </div>
      </form>
    </main>
  );
}
