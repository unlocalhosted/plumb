// One example per principle, from Quarry, the made-up invoicing workspace. Each takes `broken` and draws the same
// real-app fragment with the mistake or without it; nothing else on it is wrong, so the overlay marks one thing.

const INVOICES = [
  ['INV-2041', 'Halden & Co.', '4,820.00'],
  ['INV-2040', 'Northfield Dental', '1,240.50'],
  ['INV-2039', 'Okafor Landscape', '12,000.00'],
  ['INV-2038', 'Brightwater Vets', '387.10'],
];

// #16 amounts in a column line up only in tabular figures; proportional digits drift by their widths
function Amounts({ broken }) {
  return (
    <table className="w-full max-w-xs text-left text-sm">
      <thead className="text-xs text-ink-muted"><tr><th className="pb-2 font-medium">Invoice</th><th className="pb-2 text-right font-medium">Amount</th></tr></thead>
      <tbody>
        {INVOICES.map(([id, , amount]) => (
          <tr key={id}>
            <td className="case-forms py-1.5 pr-4">{id}</td>
            <td className={'py-1.5 text-right ' + (broken ? '' : 'tabular-nums')}>${amount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const EXAMPLES = { 16: Amounts };
