// Invoices: the list on the left, the selected invoice open beside it (a split view, as Linear and Stripe do it).
import { Close, More, Paperclip, Refresh } from './icons.jsx';
import receipt from './receipt.png';
import site from './site.png';

const INVOICES = [
  { id: 'INV-2041', client: 'Halden & Co. Architecture and Interiors', amount: '4,820.00', status: 'sent', due: 'Nov 12', by: 'Ada' },
  { id: 'INV-2040', client: 'Northfield Dental Group', amount: '1,240.50', status: 'paid', due: 'Nov 3', by: 'Ada' },
  { id: 'INV-2039', client: 'Okafor Landscape Studio', amount: '12,000.00', status: 'overdue', due: 'Oct 28', by: 'Tomás' },
  { id: 'INV-2038', client: 'Brightwater Veterinary Clinic', amount: '387.10', status: 'paid', due: 'Oct 24', by: 'Ada' },
  { id: 'INV-2037', client: 'Mireille Laurent Photography', amount: '960.00', status: 'draft', due: '—', by: 'Tomás' },
  { id: 'INV-2036', client: 'Kestrel Logistics', amount: '7,415.25', status: 'paid', due: 'Oct 15', by: 'Ada' },
  { id: 'INV-2035', client: 'Juniper Street Bakery', amount: '212.40', status: 'paid', due: 'Oct 9', by: 'Ada' },
];
const TONE = { sent: 'text-accent', paid: 'text-positive', overdue: 'text-negative', draft: 'text-ink-muted' };

// #42 the tab that is hovered changes colour, not weight, so the row doesn't move
function Tabs({ broken }) {
  return (
    <div role="tablist" aria-label="Filter invoices" className="-ml-2 flex gap-2 text-sm">
      {['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map((t) => (
        <button key={t} role="tab" type="button" aria-selected={t === 'All'}
          className={'h-8 rounded-chip px-2 active:bg-sunken ' + (t === 'All' ? 'font-medium text-ink ' : 'text-ink-muted ') + (broken ? 'hover:font-semibold' : 'hover:text-ink')}>{t}</button>
      ))}
    </div>
  );
}

// #15/#46 status: small capitals tracked out, with the case feature. #16 amounts in tabular figures. #35 a cut-off client
// name can be read on hover. #57 a muted line is a muted colour, not faded text. #27 the row's menu is 24px to hit.
// #38 the dividers are hairlines.
function Row({ broken, inv, open }) {
  return (
    <tr className={(broken ? 'border-b border-line ' : 'border-b-hairline border-line ') + (open ? 'bg-sunken' : '')}>
      <td className={'py-3 pr-4 pl-4 font-medium ' + (broken ? '' : 'case-forms')}>{inv.id}</td>
      <td className="py-3 pr-4">
        <p className="w-48 truncate" title={broken ? undefined : inv.client}>{inv.client}</p>
        <p className={'text-xs ' + (broken ? 'opacity-60' : 'text-ink-muted')}>Sent by {inv.by}</p>
      </td>
      <td className={'py-3 pr-4 text-right ' + (broken ? '' : 'tabular-nums')}>${inv.amount}</td>
      <td className="py-3 pr-4">
        <span className={'text-[11px] font-medium ' + TONE[inv.status] + (broken ? ' uppercase' : ' caps')}>{inv.status}</span>
      </td>
      <td className="py-3 pr-4 text-ink-muted">{inv.due}</td>
      <td className="py-3 pr-2">
        <button type="button" aria-label={'More for ' + inv.id} className={'grid place-items-center rounded-chip text-ink-subtle hover:bg-sunken active:bg-line ' + (broken ? 'size-4' : 'size-6')}><More /></button>
      </td>
    </tr>
  );
}

// #36 the table's scroller keeps room for its scrollbar, so the columns don't jump when it appears
function Table({ broken }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className={'max-h-96 overflow-y-auto rounded-card bg-surface shadow-raised ' + (broken ? '' : 'gutter-stable fade-bottom')}>
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface text-xs text-ink-muted">
            <tr><th className="py-2 pl-4 font-medium">Invoice</th><th className="font-medium">Client</th><th className="pr-4 text-right font-medium">Amount</th><th className="font-medium">Status</th><th className="font-medium">Due</th><th /></tr>
          </thead>
          <tbody>{[...INVOICES, ...INVOICES.map((i) => ({ ...i, id: i.id.replace('20', '19') }))].map((inv) => <Row key={inv.id} broken={broken} inv={inv} open={inv.id === 'INV-2041'} />)}</tbody>
        </table>
      </div>
      {/* #24 helper text is readable at 12px */}
      <p className={'text-xs ' + (broken ? 'text-[#b8bcc2]' : 'text-ink-subtle')}>Amounts include tax. Overdue invoices are reminded every seven days.</p>
    </div>
  );
}

// #7 the gap inside a group is smaller than the gap between groups
function Lines({ broken }) {
  const group = (title, items) => (
    <div className={'flex flex-col ' + (broken ? 'gap-4' : 'gap-1')}>
      <h3 className="text-xs font-medium text-ink-muted">{title}</h3>
      {items.map(([what, amt]) => <div key={what} className="flex justify-between text-sm"><span>{what}</span><span className="tabular-nums">{amt}</span></div>)}
    </div>
  );
  return (
    <div className={'flex flex-col ' + (broken ? 'gap-2' : 'gap-4')}>
      {group('Design', [['Concept and layouts', '$2,400.00'], ['Two rounds of revisions', '$800.00']])}
      {group('Build', [['Site build, 6 pages', '$1,200.00'], ['Hosting setup', '$420.00']])}
    </div>
  );
}

// #23 the raised panel's border is see-through, not grey. #74 its header doesn't fight with z-index 9999.
// #39 the white receipt gets a faint inner outline on the white panel. #56 the photo caption's scrim eases.
// #76 a long path is cut in the middle, where it carries least.
function Detail({ broken }) {
  const path = 'uploads/2026/11/halden-and-co/receipts/INV-2041-signed-scan.pdf';
  return (
    <aside aria-label="INV-2041" className={'flex w-[420px] shrink-0 flex-col rounded-card bg-surface p-5 shadow-overlay ' + (broken ? 'gap-5 border border-[#d0d5db]' : 'isolate gap-4 border border-line')}>
      <header className={'relative flex items-start justify-between bg-surface ' + (broken ? 'z-[9999]' : 'z-10')}>
        <div className="flex flex-col gap-1">
          <h2 className={'text-lg font-semibold ' + (broken ? '' : 'case-forms')}>INV-2041</h2>
          <p className="text-sm text-ink-muted">Halden &amp; Co. · due Nov 12</p>
        </div>
        <button type="button" aria-label="Close invoice" className="grid size-8 place-items-center rounded-control text-ink-muted hover:bg-sunken active:bg-line"><Close /></button>
      </header>
      <Lines broken={broken} />
      <div className={'flex justify-between border-line pt-3 text-base font-semibold ' + (broken ? 'border-t' : 'border-t-hairline')}><span>Total</span><span className="tabular-nums">$4,820.00</span></div>
      <div className="flex items-center gap-3">
        <img src={receipt} alt="Signed receipt for INV-2041" width="72" height="96" className={'rounded-chip ' + (broken ? '' : 'outline outline-1 -outline-offset-1 outline-line')} />
        <p className="text-sm text-ink-muted">Receipt, signed by M. Halden on Nov 2</p>
      </div>
      <figure className="relative overflow-hidden rounded-control">
        <img src={site} alt="The finished studio at Halden & Co." width="480" height="270" className="h-48 w-full object-cover" />
        <figcaption className={'absolute inset-x-0 bottom-0 px-4 pt-12 pb-3 text-sm text-night-ink ' + (broken ? 'scrim' : 'scrim-eased')}>The finished studio, photographed on handover</figcaption>
      </figure>
      <a href="#invoices" title={broken ? undefined : path} className="flex items-center gap-2 text-sm text-ink-muted">
        <Paperclip />
        {broken
          ? <span className="w-64 truncate">{path}</span>
          : <span>{path.slice(0, 16)}…{path.slice(-24)}</span>}
      </a>
    </aside>
  );
}

export function Invoices({ broken }) {
  return (
    <section id="invoices" aria-labelledby="invoices-title" className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="invoices-title" className="text-xl font-semibold">Invoices</h2>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Refresh" className="grid size-9 place-items-center rounded-control text-ink-muted hover:bg-sunken active:bg-line"><Refresh /></button>
          {/* #31 Export answers the press like every other button */}
          <button type="button" className={'h-9 rounded-control bg-surface px-4 text-sm font-medium shadow-raised ' + (broken ? '' : 'active:bg-sunken')}>Export</button>
          <button type="button" className="h-9 rounded-control bg-accent px-4 text-sm font-medium text-accent-ink active:bg-ink">New invoice</button>
        </div>
      </div>
      <Tabs broken={broken} />
      <div className="flex items-start gap-4">
        <Table broken={broken} />
        <Detail broken={broken} />
      </div>
    </section>
  );
}
