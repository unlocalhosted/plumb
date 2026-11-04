// One example per principle, each a small scene from a real product, drawn with care: real content, quiet colour,
// soft depth. Each takes `broken` and is wrong in exactly one way, the principle's; everything else on it is right, so
// plumber, scoped to it, finds one thing. `measure` (optional) says where the eye sees the harm, for the ticks drawn
// over the example; it reads the page, it never decides what is wrong (plumber does).
import { Bell, Gear, Invoice, People, Play, Round, Square } from '../icons.jsx';

// where a line of text sits, from its font: the baseline and the middle of its capitals, in page pixels
let ctx;
function lineOf(el) {
  const s = getComputedStyle(el), r = el.getBoundingClientRect();
  ctx ??= document.createElement('canvas').getContext('2d');
  ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const m = ctx.measureText('Hx'), asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent, cap = ctx.measureText('H').actualBoundingBoxAscent;
  const lh = parseFloat(s.lineHeight) || (asc + desc), baseline = r.top + (lh - (asc + desc)) / 2 + asc;
  return { baseline, capMiddle: baseline - cap / 2, left: r.left, right: r.right };
}
const px = (n) => `${Math.round(Math.abs(n) * 10) / 10}px`;

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


// #1 a highlighted row bleeds out by its padding, so its words stay on the edge the other rows' words share
const NAV = [['General', Gear], ['Members', People], ['Billing', Invoice], ['Notifications', Bell]];
function SettingsNav({ broken }) {
  return (
    <div className="flex w-full max-w-sm gap-6">
      <nav aria-label="Settings" className="flex w-40 shrink-0 flex-col gap-0.5">
        <span className="pb-2 text-xs font-medium text-ink-muted">Workspace</span>
        {NAV.map(([label, Icon]) => (
          <a key={label} href="#settings" data-row aria-current={label === 'Billing' ? 'page' : undefined}
            className={'flex h-8 items-center gap-2 text-sm ' + (label === 'Billing' ? 'rounded-control bg-sunken px-2 font-medium text-ink' : 'text-ink-muted')}>
            <Icon />{label}
          </a>
        ))}
      </nav>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-6">
        <h3 className="text-base font-semibold">Billing</h3>
        <p className="text-sm text-ink-muted">Studio plan, renews December 1.</p>
      </div>
    </div>
  );
}
SettingsNav.measure = (root) => {
  const ticks = [...root.querySelectorAll('[data-row] svg')].map((g) => { const r = g.getBoundingClientRect(); return { x: r.left, top: r.top - 4, bottom: r.bottom + 4 }; });
  const xs = ticks.map((t) => t.x), d = Math.max(...xs) - Math.min(...xs);
  return { ticks, broken: `row starts ${px(d)} in`, fixed: 'one edge ✓', off: d > 0.5 };
};

// #2 a play triangle is centred by its weight, not its box: it leans toward its point
function Lesson({ broken }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="grid aspect-video place-items-center rounded-control bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-positive-soft))]">
        <button type="button" aria-label="Play: Send your first invoice" data-play className="grid size-14 place-items-center rounded-full bg-surface text-ink shadow-overlay active:bg-sunken"><Play size={24} /></button>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">Send your first invoice</span>
        <span className="text-sm text-ink-muted tabular-nums">2:14</span>
      </div>
    </div>
  );
}
Lesson.measure = (root) => {
  const b = root.querySelector('[data-play]').getBoundingClientRect(), g = root.querySelector('[data-play] svg').getBoundingClientRect();
  const centre = b.left + b.width / 2, seen = g.left + g.width * (10.5 / 24); // the triangle's weight: halfway from its box's middle to its centroid
  const d = centre - seen;
  return { ticks: [{ x: centre, top: b.top - 6, bottom: b.bottom + 6 }, { x: seen, top: g.top, bottom: g.bottom }], broken: `weight ${px(d)} left`, fixed: 'centred ✓', off: Math.abs(d) > 0.6 };
};

// #3 round logos are drawn a touch larger than square ones, or they look smaller
function Connected({ broken }) {
  const r = broken ? 8.5 : 9.75;
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold">Connected apps</h3>
          <span className="text-sm text-ink-muted">Four sync every hour</span>
        </div>
        <div data-logos aria-label="Ledgerline, Orbit Mail, Tallyhook, Copperbank" className="flex items-center gap-2">
          <Square size={28} className="text-accent" /><Round size={28} r={r} className="text-violet" /><Square size={28} className="text-positive" /><Round size={28} r={r} className="text-caution" />
        </div>
      </div>
    </div>
  );
}
Connected.measure = (root) => {
  const ticks = [...root.querySelectorAll('[data-logos] svg')].map((g) => {
    const box = g.getBoundingClientRect(), round = !!g.querySelector('circle');
    const half = round ? Number(g.querySelector('circle').getAttribute('r')) : 9, size = (box.height / 24) * half * 2 * (parseFloat(getComputedStyle(g).scale) || 1);
    const mid = box.top + box.height / 2;
    return { y: mid - size / 2, left: box.left - 2, right: box.right + 2, size, round };
  });
  const rd = Math.min(...ticks.filter((t) => t.round).map((t) => t.size)), sq = Math.max(...ticks.filter((t) => !t.round).map((t) => t.size));
  return { ticks, broken: `round ${px(rd)} · square ${px(sq)}`, fixed: 'reads the same ✓', off: rd < sq * 1.04 };
};

// #4 an icon beside words sits on the capitals' middle (broken: pushed down with mt-1, for a font long gone)
function Notice({ broken }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div data-notice className="flex items-center gap-2 text-sm font-medium">
        <Bell className={'text-accent ' + (broken ? 'mt-1' : '')} /><span>Halden &amp; Co. paid INV-2041</span>
      </div>
      <p className="pl-6 text-sm text-ink-muted">$4,820.00 arrived in Studio checking, 2 minutes ago.</p>
    </div>
  );
}
Notice.measure = (root) => {
  const row = root.querySelector('[data-notice]'), g = row.querySelector('svg').getBoundingClientRect(), t = lineOf(row.querySelector('span'));
  const icon = g.top + g.height / 2, d = icon - t.capMiddle;
  return { ticks: [{ y: icon, left: g.left - 4, right: g.right + 2 }, { y: t.capMiddle, left: t.left - 2, right: t.left + 40 }], broken: `icon ${px(d)} low`, fixed: 'on the capitals ✓', off: Math.abs(d) > 0.6 };
};

// #5 the padding around a line of words is measured from the letters, not from the line's invisible leading
function Chips({ broken }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <span className="text-sm text-ink-muted">Invoice INV-2041</span>
      <div className="flex items-center gap-2">
        <span data-chip className="rounded-full bg-accent-soft px-3 py-1.5 text-sm leading-6 font-medium text-accent">Awaiting payment</span>
        <span className="text-sm text-ink-muted">since Nov 2</span>
      </div>
    </div>
  );
}
Chips.measure = (root) => {
  const c = root.querySelector('[data-chip]'), r = c.getBoundingClientRect(), t = lineOf(c);
  const capTop = t.baseline - (t.baseline - t.capMiddle) * 2, above = capTop - r.top;
  return { ticks: [{ y: r.top, left: r.left, right: r.right }, { y: capTop, left: r.left, right: r.right }], broken: `${px(above)} above the letters`, fixed: 'even padding ✓', off: above > 9 };
};

// #6 a price and its unit, two sizes side by side, share a baseline
function Price({ broken }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <span className="text-sm font-medium text-ink-muted">Studio</span>
      <div data-price className={'flex gap-1 ' + (broken ? 'items-center' : '')}>
        <span className="text-3xl font-semibold tracking-tight tabular-nums">$24</span>
        <span className="text-sm text-ink-muted">per seat / month</span>
      </div>
      <p className="text-sm text-ink-muted">Unlimited clients, reminders that send themselves.</p>
    </div>
  );
}
Price.measure = (root) => {
  const [a, b] = [...root.querySelectorAll('[data-price] > span')].map(lineOf);
  const d = b.baseline - a.baseline;
  return { ticks: [{ y: a.baseline, left: a.left, right: a.right }, { y: b.baseline, left: b.left, right: b.right }], broken: `baselines ${px(d)} apart`, fixed: 'one baseline ✓', off: Math.abs(d) > 0.6 };
};

export const EXAMPLES = { 1: SettingsNav, 2: Lesson, 3: Connected, 4: Notice, 5: Chips, 6: Price, 16: Amounts };

