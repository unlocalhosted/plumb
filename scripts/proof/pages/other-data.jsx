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

      {/* quiet: one row is not a list of data */}
      <table id="one"><tbody><tr><td className="px-3 py-2">Total</td><td className="px-3 py-2">$3,625.50</td></tr></tbody></table>
    </main>
  );
}
