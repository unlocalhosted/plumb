// One example per principle, each a small scene from a real product, drawn with care: real content, quiet colour,
// soft depth. Each takes `broken` and is wrong in exactly one way, the principle's; everything else on it is right, so
// plumber, scoped to it, finds one thing.

const CLIENTS = [
  { id: 'INV-2041', name: 'Halden & Co.', initials: 'HC', tint: 'bg-accent-soft text-accent', status: 'Sent', tone: 'bg-accent-soft text-accent', amount: '1,111.10' },
  { id: 'INV-2040', name: 'Northfield Dental', initials: 'ND', tint: 'bg-positive-soft text-positive', status: 'Paid', tone: 'bg-positive-soft text-positive', amount: '8,808.00' },
  { id: 'INV-2039', name: 'Okafor Landscape', initials: 'OL', tint: 'bg-accent-soft text-accent', status: 'Overdue', tone: 'bg-negative-soft text-negative', amount: '4,170.40' },
  { id: 'INV-2038', name: 'Brightwater Vets', initials: 'BV', tint: 'bg-negative-soft text-negative', status: 'Paid', tone: 'bg-positive-soft text-positive', amount: '6,990.50' },
];

// #16 amounts in a column line up only in tabular figures; proportional digits drift by their widths
function Amounts({ broken }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold">Invoices</h3>
          <span className="text-sm text-ink-muted">November</span>
        </div>
        <span className="text-sm text-ink-muted">4 open</span>
      </div>
      <table className="w-full table-fixed text-left text-sm">
        <colgroup><col /><col className="hidden w-24 sm:table-column" /><col className="w-28" /></colgroup>
        <tbody>
          {CLIENTS.map((c) => (
            <tr key={c.id} className="border-b-hairline border-line last:border-0">
              <td className="py-2.5 pr-3">
                <span className="flex items-center gap-3">
                  <span data-avatar className={'grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ' + c.tint}>{c.initials}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium" title={c.name}>{c.name}</span>
                    <span className="case-forms text-xs whitespace-nowrap text-ink-muted">{c.id}</span>
                  </span>
                </span>
              </td>
              <td className="hidden py-2.5 pr-3 sm:table-cell"><span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + c.tone}>{c.status}</span></td>
              <td data-amount className={'py-2.5 text-right font-medium ' + (broken ? '' : 'tabular-nums')}>{'$' + c.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-baseline justify-between gap-3 border-t-hairline border-line pt-3 text-sm">
        <span className="text-ink-muted">Total outstanding</span>
        <span className="text-base font-semibold tabular-nums">$21,080.00</span>
      </div>
    </div>
  );
}

// What the eye should see: where each amount's thousands comma falls. Proportional digits scatter them; tabular
// digits put them on one line.
Amounts.measure = (root) => {
  const ticks = [...root.querySelectorAll('[data-amount]')].map((td) => {
    const text = td.firstChild, i = text?.textContent.indexOf(',');
    if (!text || i < 0) return null;
    const range = document.createRange();
    range.setStart(text, i); range.setEnd(text, i + 1);
    const r = range.getBoundingClientRect();
    return { x: r.left + r.width / 2, top: r.top - 2, bottom: r.bottom + 2 };
  }).filter(Boolean);
  if (ticks.length < 2) return null;
  const xs = ticks.map((t) => t.x), drift = Math.max(...xs) - Math.min(...xs);
  return { ticks, broken: `commas drift ${Math.round(drift * 10) / 10}px`, fixed: 'aligned ✓', off: drift > 0.5 };
};

export const EXAMPLES = { 16: Amounts };
