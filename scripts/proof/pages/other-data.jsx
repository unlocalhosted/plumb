// The test page for the other-data reality (docs/briefs/realities.md): the page is opened again and one column of
// each table gets words twice as long, as the next page of rows has. A table laid out by its contents lets the
// other columns move; one with a fixed layout, set widths or a column that cuts its words holds.
const ROWS = [['Acme Co', '3 Nov', '$1,240.00'], ['Northwind Traders', '28 Oct', '$310.00'], ['Globex', '14 Oct', '$2,075.50']];
const Body = ({ cell = '' }) => (
  <tbody>{ROWS.map((r) => <tr key={r[0]} className="border-t border-slate-200">{r.map((c, i) => <td key={i} className={`px-3 py-2 ${i === 0 ? cell : ''}`}>{c}</td>)}</tr>)}</tbody>
);
export function App() {
  return (
    <main className="mx-auto grid w-[520px] gap-10 p-10 text-sm text-slate-800">
      <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>

      {/* columns-jump: laid out by its contents, so a longer name moves the dates and the amounts */}
      <table id="jumps" className="whitespace-nowrap"><Body /></table>

      {/* quiet: a fixed layout */}
      <table id="fixed" className="w-full table-fixed"><Body /></table>

      {/* quiet: the name column cuts its words at a set width */}
      <table id="cuts"><Body cell="max-w-[160px] truncate" /></table>

      {/* figure-breaks: a narrow amount column that wraps; a figure three digits longer breaks onto two lines */}
      <table id="breaks" className="w-[300px] table-fixed"><tbody>{ROWS.map((r) => <tr key={r[0]} className="border-t border-slate-200"><td className="px-3 py-2">{r[0]}</td><td className="w-[92px] px-3 py-2 text-right">{r[2]}</td></tr>)}</tbody></table>

      {/* figure-breaks, the other way: a figure with a space in it (a currency code) breaks onto a second line */}
      <table id="wraps" className="w-[300px] table-fixed"><tbody>{ROWS.map((r) => <tr key={r[0]} className="border-t border-slate-200"><td className="px-3 py-2">{r[0]}</td><td className="w-[132px] px-3 py-2 text-right">{r[2].slice(1)} USD</td></tr>)}</tbody></table>

      {/* quiet: the same column kept on one line */}
      <table id="holds" className="w-[300px]"><tbody>{ROWS.map((r) => <tr key={r[0]} className="border-t border-slate-200"><td className="px-3 py-2">{r[0]}</td><td className="px-3 py-2 text-right whitespace-nowrap">{r[2]}</td></tr>)}</tbody></table>

      {/* rows-cut: a card with a set height that clips; ten times the rows fall past its edge and nothing scrolls */}
      <div id="clipped" className="h-[160px] overflow-hidden rounded-lg border border-slate-200"><table className="w-full table-fixed"><Body /></table></div>

      {/* quiet: the same card scrolls */}
      <div id="scrolls" className="h-[160px] overflow-y-auto rounded-lg border border-slate-200"><table className="w-full table-fixed"><Body /></table></div>

      {/* foot-drifts: three cards whose buttons line up only because the titles are alike */}
      <div id="cards" className="grid grid-cols-3 gap-3">{['Starter', 'Team', 'Company'].map((n) => <div key={n} className="rounded-lg border border-slate-200 p-3"><h3 className="font-medium">{n}</h3><p className="mt-1 text-slate-500">For small jobs.</p><button className="mt-3 rounded bg-slate-900 px-2 py-1 text-white">Choose</button></div>)}</div>

      {/* quiet: the same cards with the button pinned to the bottom */}
      <div id="cards-pinned" className="grid grid-cols-3 gap-3">{['Starter', 'Team', 'Company'].map((n) => <div key={n} className="flex flex-col rounded-lg border border-slate-200 p-3"><h3 className="font-medium">{n}</h3><p className="mt-1 text-slate-500">For small jobs.</p><button className="mt-auto rounded bg-slate-900 px-2 py-1 text-white">Choose</button></div>)}</div>

      {/* trail-squeezed: a badge beside a name gives up its width when the name is longer */}
      <ul id="squeezed" className="grid w-[260px] gap-1">{ROWS.map((r) => <li key={r[0]} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1"><span>{r[0]}</span><span className="ml-auto overflow-hidden rounded bg-emerald-100 px-2 text-emerald-800">Paid in full</span></li>)}</ul>

      {/* label-pushes: a name that can't break and a badge that won't shrink; a longer name runs out of the row */}
      <ul id="pushes" className="grid w-[170px] gap-1">{ROWS.map((r) => <li key={r[0]} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1"><span className="whitespace-nowrap">{r[0]}</span><span className="ml-auto shrink-0 rounded bg-emerald-100 px-2 text-emerald-800">Paid</span></li>)}</ul>

      {/* quiet: the name truncates and the badge keeps its width */}
      <ul id="row-holds" className="grid w-[260px] gap-1">{ROWS.map((r) => <li key={r[0]} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1"><span className="min-w-0 truncate">{r[0]}</span><span className="ml-auto shrink-0 rounded bg-emerald-100 px-2 text-emerald-800">Paid</span></li>)}</ul>

      {/* quiet: one row is not a list of data */}
      <table id="one"><tbody><tr><td className="px-3 py-2">Total</td><td className="px-3 py-2">$3,625.50</td></tr></tbody></table>
    </main>
  );
}
