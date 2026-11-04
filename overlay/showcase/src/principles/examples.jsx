// One example per principle, each a small scene from a real product, drawn with care: real content, quiet colour,
// soft depth. Each takes `broken` and is wrong in exactly one way, the principle's; everything else on it is right, so
// plumber, scoped to it, finds one thing. `measure` (optional) says where the eye sees the harm, for the ticks drawn
// over the example; it reads the page, it never decides what is wrong (plumber does).
import { Bell, Play } from '../icons.jsx';
import site from '../site.png';
import receipt from '../receipt.png';

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

// Quarry's app frame: every framed example is a screen of the product, not a component alone in a window. The app
// bar carries the mark, the workspace, search, the bell and the user; `bell` opens what the screen is about.
export function AppFrame({ children, bell, crumb = 'Studio' }) {
  return (
    <div className="flex w-full flex-col">
      <header className="flex h-12 items-center gap-3 border-b-hairline border-line px-4">
        <span className="grid size-6 shrink-0 place-items-center rounded-control bg-accent text-xs font-semibold text-accent-ink">Q</span>
        <span className="text-sm font-semibold">Quarry</span>
        <span className="hidden text-sm text-ink-muted sm:inline">/ {crumb}</span>
        <span className="ml-auto hidden h-8 w-48 items-center gap-2 rounded-full bg-sunken px-3 text-xs text-ink-muted md:flex">Search invoices, clients<kbd className="ml-auto font-sans">⌘K</kbd></span>
        <span className="relative ml-auto md:ml-0">{bell}</span>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-violet text-[11px] font-semibold text-accent-ink">AM</span>
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

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


// #1 sections down a page line up by their words, not their boxes: a filled notice between a heading and a list
// keeps its box on the column, so its words sit in by its padding; it should bleed out by that padding instead
const HISTORY = [['Nov 1, 2026', '96.00'], ['Oct 1, 2026', '96.00'], ['Sep 1, 2026', '72.00']];
function Billing({ broken }) {
  return (
    <AppFrame crumb="Settings">
      <div className="flex gap-6 px-5 pt-4 pb-6">
        <nav aria-label="Settings" className="hidden w-32 shrink-0 flex-col gap-0.5 text-sm sm:flex">
          {['General', 'Members', 'Billing', 'Integrations', 'Notifications'].map((t) => <span key={t} className={'-mx-2 rounded-control px-2 py-1.5 ' + (t === 'Billing' ? 'bg-sunken font-medium text-ink' : 'text-ink-muted')}>{t}</span>)}
        </nav>
    <div data-sections className="flex min-w-0 flex-1 flex-col gap-6">
      <section className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">Billing</h3>
          <p className="text-sm text-ink-muted">Manage your plan, payment method and invoices.</p>
        </div>
        <button type="button" className="shrink-0 rounded-control border border-line bg-surface px-3 py-1.5 text-sm font-medium shadow-raised active:bg-sunken">Change plan</button>
      </section>
      <section className="flex gap-3 rounded-control bg-caution-soft px-4 pt-3 pb-4">
        <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-caution text-[11px] font-bold text-accent-ink">!</span>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">Your card expires this month</span>
          <span className="text-sm text-ink-muted">Update it before Dec 1 so reminders keep sending. <a href="#billing" className="font-medium text-ink underline decoration-line underline-offset-2">Update card</a></span>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Studio plan</span>
          <span className="text-sm text-ink-muted"><span className="tabular-nums">$24</span> per seat / month</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full w-4/5 rounded-full bg-accent" /></div>
          <span className="text-xs text-ink-muted"><span className="tabular-nums">4 of 5</span> seats used · next invoice <span className="tabular-nums">$96.00</span> on Dec 1</span>
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <span className="text-xs font-medium text-ink-muted">Invoice history</span>
        <ul className="flex flex-col">
          {HISTORY.map(([date, amount]) => (
            <li key={date} className="flex items-center gap-3 border-b-hairline border-line py-2 text-sm last:border-0">
              <span className="flex-1">{date}</span>
              <span className="rounded-full bg-positive-soft px-2 py-0.5 text-xs font-medium text-positive">Paid</span>
              <span className="w-16 text-right font-medium tabular-nums">${amount}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
      </div>
    </AppFrame>
  );
}
Billing.framed = true;
// where each section's words begin
Billing.measure = (root) => {
  const ticks = [...root.querySelectorAll('[data-sections] > section')].map((sec) => {
    // where its content begins, as plumber reads it: an icon, or the first words
    const icon = sec.querySelector('svg, img, [aria-hidden="true"]');
    const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim() && !n.parentElement.closest('[aria-hidden="true"]') ? 1 : 3) });
    const text = walker.nextNode();
    if (!text && !icon) return null;
    const range = document.createRange(); if (text) range.selectNodeContents(text);
    const xs = [text && range.getBoundingClientRect().left, icon?.getBoundingClientRect().left].filter((x) => x != null);
    const box = sec.getBoundingClientRect();
    return { x: Math.min(...xs), top: box.top, bottom: box.bottom };
  }).filter(Boolean);
  const xs = ticks.map((t) => t.x), d = Math.max(...xs) - Math.min(...xs);
  const notice = root.querySelectorAll('[data-sections] > section')[1], nr = notice.getBoundingClientRect();
  return { around: notice, focus: { x: nr.left + 16, y: nr.top + nr.height / 2 }, ticks, broken: `words ${px(d)} in`, fixed: 'one edge ✓', off: d > 0.5 };
};

// #2 a play triangle is centred by its weight, not its box: it leans toward its point
const CHAPTERS = [['Create a client', '1:08', 'done'], ['Send your first invoice', '2:14', 'now'], ['Get paid by card', '3:02', 'next']];
function Lesson({ broken }) {
  return (
    <AppFrame crumb="Academy">
      <div className="@container px-5 pt-4 pb-6">
        <div className="flex flex-col gap-5 @xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <span className="text-xs font-medium text-ink-muted">Getting paid · Lesson 2 of 6</span>
            <div className="relative overflow-hidden rounded-control">
              <img src={site} alt="" width="480" height="270" className="aspect-video w-full object-cover" />
              <div className="absolute inset-0 grid place-items-center">
                <button type="button" aria-label="Play: Send your first invoice" data-play className="grid size-14 place-items-center rounded-full bg-surface text-ink shadow-overlay active:bg-sunken"><Play size={24} /></button>
              </div>
              <span className="absolute right-2 bottom-2 rounded-chip bg-ink px-1.5 py-0.5 text-xs font-medium text-accent-ink tabular-nums">2:14</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold">Send your first invoice</h3>
              <span className="text-sm text-ink-muted">From a draft to a paid invoice in under a minute.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-violet text-[11px] font-semibold text-accent-ink">AM</span>
              <span className="flex flex-col"><span className="text-sm font-medium">Ada Morales</span><span className="text-xs text-ink-muted">Product, Quarry</span></span>
            </div>
          </div>
          <aside className="flex flex-col gap-3 @xl:w-56 @xl:shrink-0">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-ink-muted"><span>Course progress</span><span className="tabular-nums">1 of 6</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full w-1/6 rounded-full bg-accent" /></div>
            </div>
            <ol className="flex flex-col border-t-hairline border-line">
              {CHAPTERS.map(([title, time, at], i) => (
                <li key={title} className="flex items-center gap-3 border-b-hairline border-line py-2 text-sm">
                  <span className={'grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ' + (at === 'done' ? 'bg-positive-soft text-positive' : at === 'now' ? 'bg-accent text-accent-ink' : 'bg-sunken text-ink-muted')}>{at === 'done' ? '✓' : i + 1}</span>
                  <span className={'min-w-0 flex-1 truncate ' + (at === 'now' ? 'font-medium' : at === 'done' ? 'text-ink-muted' : '')} title={title}>{title}</span>
                  <span className="text-xs text-ink-muted tabular-nums">{time}</span>
                </li>
              ))}
            </ol>
            <span className="text-xs font-medium text-ink-muted">Resources</span>
            <span className="text-sm text-accent">Invoice template (.pdf)</span>
          </aside>
        </div>
      </div>
    </AppFrame>
  );
}
Lesson.framed = true;
Lesson.measure = (root) => {
  const b = root.querySelector('[data-play]').getBoundingClientRect(), g = root.querySelector('[data-play] svg').getBoundingClientRect();
  const centre = b.left + b.width / 2, seen = g.left + g.width * (10.5 / 24);
  const d = centre - seen;
  return { around: root.querySelector('[data-play]'), focus: { x: centre, y: b.top + b.height / 2 }, ticks: [{ x: centre, top: b.top - 6, bottom: b.bottom + 6 }, { x: seen, top: g.top, bottom: g.bottom }], broken: `weight ${px(d)} left`, fixed: 'centred ✓', off: Math.abs(d) > 0.6 };
};

// #3 round logos are drawn a touch larger than square ones, or they look smaller
const Mark = ({ shape, r, tone, letter, size = 28 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={'shrink-0 ' + tone}>
    {shape === 'round' ? <circle cx="12" cy="12" r={r} fill="currentColor" /> : <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" />}
    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">{letter}</text>
  </svg>
);
const APPS = [
  { name: 'Ledgerline', what: 'Books every paid invoice', shape: 'square', tone: 'text-accent', letter: 'L', on: true },
  { name: 'Orbit Mail', what: 'Sends reminders from your address', shape: 'round', tone: 'text-violet', letter: 'O', on: true },
  { name: 'Tallyhook', what: 'Imports hours from your tracker', shape: 'square', tone: 'text-positive', letter: 'T', on: true },
  { name: 'Copperbank', what: 'Matches payments to invoices', shape: 'round', tone: 'text-caution', letter: 'C', on: false },
];
// every logo drawn in the same box at the same size, the way a logo strip is made; the circles read smaller
const SETTINGS = ['General', 'Members', 'Billing', 'Integrations', 'Notifications'];
const CATALOG = [
  { name: 'Ledgerline', what: 'Books every paid invoice', shape: 'square', tone: 'text-accent', letter: 'L', state: 'Connected' },
  { name: 'Orbit Mail', what: 'Reminders from your address', shape: 'round', tone: 'text-violet', letter: 'O', state: 'Connected' },
  { name: 'Tallyhook', what: 'Imports tracked hours', shape: 'square', tone: 'text-positive', letter: 'T', state: 'Connected' },
  { name: 'Copperbank', what: 'Matches payments to invoices', shape: 'round', tone: 'text-caution', letter: 'C', state: 'Connect' },
];
function Connected({ broken }) {
  return (
    <AppFrame crumb="Settings">
      <div className="flex gap-6 px-5 pt-4 pb-6">
        <nav aria-label="Settings" className="hidden w-32 shrink-0 flex-col gap-0.5 text-sm sm:flex">
          {SETTINGS.map((t) => <span key={t} className={'-mx-2 rounded-control px-2 py-1.5 ' + (t === 'Integrations' ? 'bg-sunken font-medium text-ink' : 'text-ink-muted')}>{t}</span>)}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-base font-semibold">Integrations</h3>
              <span className="text-sm text-ink-muted">Three connected · synced 4 min ago</span>
            </div>
            {/* the strip of what's connected: every mark drawn in one box, at one size */}
            <div data-logos aria-label="Ledgerline, Orbit Mail, Tallyhook, Copperbank" className="flex items-center gap-1">
              {CATALOG.map((a) => <Mark key={a.name} shape={a.shape} r={9} tone={a.tone} letter={a.letter} />)}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {['All', 'Accounting', 'Payments', 'Email'].map((t, i) => <span key={t} className={'rounded-full px-2.5 py-1 ' + (i === 0 ? 'bg-ink font-medium text-accent-ink' : 'bg-sunken text-ink-muted')}>{t}</span>)}
          </div>
          <div className="grid gap-3 @container sm:grid-cols-2">
            {CATALOG.map((a) => (
              <div key={a.name} className="flex flex-col gap-3 rounded-control border border-line px-3 pt-2.5 pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-control bg-sunken"><Mark shape={a.shape} r={9.75} tone={a.tone} letter={a.letter} size={20} /></span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{a.name}</span>
                    <span className="truncate text-xs text-ink-muted" title={a.what}>{a.what}</span>
                  </span>
                </div>
                <span className={'self-start rounded-full px-2 py-0.5 text-xs font-medium ' + (a.state === 'Connected' ? 'bg-positive-soft text-positive' : 'bg-sunken text-ink')}>{a.state}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
Connected.framed = true;
Connected.measure = (root) => {
  const ticks = [...root.querySelectorAll('[data-logos] svg')].map((g) => {
    const box = g.getBoundingClientRect(), circle = g.querySelector('circle');
    const half = circle ? Number(circle.getAttribute('r')) : 9, size = (box.height / 24) * half * 2 * (parseFloat(getComputedStyle(g).scale) || 1);
    const mid = box.top + box.height / 2;
    return { y: mid - size / 2, left: box.left + 2, right: box.right - 2, size, round: !!circle };
  });
  const rd = Math.min(...ticks.filter((t) => t.round).map((t) => t.size)), sq = Math.max(...ticks.filter((t) => !t.round).map((t) => t.size));
  const near = [...root.querySelectorAll('[data-logos] svg')].slice(0, 2).map((g) => g.getBoundingClientRect());
  return { around: root.querySelector('[data-logos]'), focus: { x: (near[0].right + near[1].left) / 2, y: near[0].top + near[0].height / 2 }, ticks, broken: Math.abs(rd - sq) < 0.6 ? `same ${px(sq)} · circle reads smaller` : `round ${px(rd)} · square ${px(sq)}`, fixed: 'reads the same ✓', off: rd < sq * 1.04 };
};

// #4 an icon beside words sits on the capitals' middle (broken: pushed down with mt-1, a nudge made for a font the app
// no longer uses). The notifications popover, opened from the bell over the dashboard.
const NOTES = [
  { who: 'HC', tint: 'bg-accent-soft text-accent', title: 'Halden & Co. paid INV-2041', detail: '$4,820.00 · arrived in Studio checking', when: '2m', icon: 'paid', unread: true },
  { who: 'ND', tint: 'bg-positive-soft text-positive', title: 'Northfield Dental opened INV-2040', detail: 'Viewed twice · Lisbon, Portugal', when: '1h', icon: 'seen', unread: true },
  { who: 'OL', tint: 'bg-caution-soft text-ink', title: 'Reminder sent for INV-2039', detail: 'Okafor Landscape · 12 days overdue', when: '3h', icon: 'sent' },
  { who: 'TR', tint: 'bg-sunken text-ink-muted', title: 'Tomás commented on INV-2037', detail: '“Can we split this into two payments?”', when: 'Yesterday', icon: 'note' },
];
const NoteIcon = ({ kind, className }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={'shrink-0 ' + className}>
    {kind === 'paid' ? <><circle cx="8" cy="8" r="6" /><path d="m5.5 8.2 1.7 1.7 3.3-3.6" /></>
      : kind === 'seen' ? <><path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8Z" /><circle cx="8" cy="8" r="1.8" /></>
      : kind === 'sent' ? <path d="M14 2 7 9M14 2l-4.5 12-2.5-5-5-2.5Z" />
      : <path d="M3 3.5h10v7H7.5L4.5 13v-2.5H3z" />}
  </svg>
);
function Notice({ broken }) {
  return (
    <AppFrame crumb="Dashboard" bell={<button type="button" aria-label="Notifications, 2 unread" className="relative grid size-8 place-items-center rounded-full bg-sunken text-ink active:bg-line"><Bell /><span className="absolute top-1 right-1 size-2 rounded-full bg-negative ring-2 ring-surface" /></button>}>
      {/* the dashboard behind, quiet */}
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 opacity-50" aria-hidden="true">
        <span className="text-base font-semibold">Good morning, Ada</span>
        <div className="grid grid-cols-3 gap-3">{['Outstanding', 'Paid', 'Overdue'].map((t) => <div key={t} className="flex flex-col gap-1 rounded-control bg-sunken px-3 pt-2 pb-3"><span className="text-xs text-ink-muted">{t}</span><span className="h-4 w-16 rounded-chip bg-line" /></div>)}</div>
        <div className="h-24 rounded-control bg-sunken" />
      </div>
      {/* the popover, opened from the bell */}
      <div className="absolute top-2 right-3 left-3 flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-popover sm:left-auto sm:w-96">
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <span className="text-sm font-semibold">Notifications</span>
          <span className="text-xs font-medium text-accent">Mark all read</span>
        </div>
        <div className="flex gap-1 px-3 pb-2 text-xs">
          {['All', 'Payments', 'Mentions'].map((t, i) => <span key={t} className={'rounded-full px-2.5 py-1 ' + (i === 0 ? 'bg-sunken font-medium text-ink' : 'text-ink-muted')}>{t}{i === 0 ? <span className="ml-1 text-ink-muted tabular-nums">4</span> : null}</span>)}
        </div>
        <ul className="flex flex-col border-t-hairline border-line">
          {NOTES.map((n) => (
            <li key={n.title} className="flex gap-3 border-b-hairline border-line px-4 py-3 last:border-0">
              <span className={'grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ' + n.tint}>{n.who}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span data-notice className="flex items-center gap-1.5 text-sm font-medium">
                  <NoteIcon kind={n.icon} className={'text-ink-muted ' + (broken ? 'mt-1' : '')} />
                  <span className="min-w-0 flex-1 truncate" title={n.title}>{n.title}</span>
                  <span className="text-xs font-normal text-ink-muted tabular-nums">{n.when}</span>
                </span>
                <span className="truncate text-sm text-ink-muted" title={n.detail}>{n.detail}</span>
              </span>
              {n.unread ? <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-accent" /> : <span className="w-2 shrink-0" />}
            </li>
          ))}
        </ul>
        <span className="border-t-hairline border-line px-4 py-2.5 text-center text-xs font-medium text-ink-muted">View all notifications</span>
      </div>
      <div className="h-[22rem]" aria-hidden="true" />
    </AppFrame>
  );
}
Notice.framed = true;
Notice.measure = (root) => {
  const row = root.querySelector('[data-notice]'), g = row.querySelector('svg').getBoundingClientRect(), t = lineOf(row.querySelectorAll('span')[0]);
  const icon = g.top + g.height / 2, d = icon - t.capMiddle;
  return { around: row, focus: { x: g.right + 3, y: (icon + t.capMiddle) / 2 }, ticks: [{ y: icon, left: g.left - 3, right: g.right + 2 }, { y: t.capMiddle, left: t.left - 2, right: t.left + 40 }], broken: `icon ${px(d)} low`, fixed: 'on the capitals ✓', off: Math.abs(d) > 0.6 };
};
// #5 padding meant to be even all round (p-3) is measured from the letters, not from the line's leading: one line of
// text-sm/6 carries 5px of invisible leading above and below, so the top reads 17px against 12px at the sides
const LINES = [['Brand workshop, two days', '2', '1,200.00', '2,400.00'], ['Website design, six pages', '1', '1,800.00', '1,800.00'], ['Hosting setup', '1', '420.00', '420.00']];
function Chips({ broken }) {
  return (
    <AppFrame crumb="Invoices / INV-2042">
      <div className="flex flex-col gap-5 px-5 pt-4 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="case-forms text-base font-semibold">INV-2042</h3>
            <span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-medium text-ink-muted">Draft</span>
          </div>
          <div className="flex gap-2">
            <button type="button" className="rounded-control border border-line px-3 py-1.5 text-sm font-medium active:bg-sunken">Preview</button>
            <button type="button" className="rounded-control bg-ink px-3 py-1.5 text-sm font-medium text-accent-ink active:bg-ink-muted">Send invoice</button>
          </div>
        </div>
        {/* the callout: padded evenly, one line of text-sm/6 */}
        <p data-chip className="rounded-control bg-accent-soft p-3 text-sm leading-6 text-ink">Card payments are on: Halden &amp; Co. can pay this invoice by card. <a href="#settings" className="font-medium text-accent underline underline-offset-2">Settings</a></p>
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">HC</span>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Halden &amp; Co.</span>
            <span className="text-xs text-ink-muted">billing@halden.example · Due Dec 12</span>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-ink-muted"><tr><th className="pb-2 font-medium">Item</th><th className="pb-2 text-right font-medium">Qty</th><th className="hidden pb-2 text-right font-medium sm:table-cell">Rate</th><th className="pb-2 text-right font-medium">Amount</th></tr></thead>
          <tbody>
            {LINES.map(([item, qty, rate, amount]) => (
              <tr key={item} className="border-t-hairline border-line">
                <td className="py-2 pr-3">{item}</td>
                <td className="py-2 text-right tabular-nums">{qty}</td>
                <td className="hidden py-2 text-right tabular-nums sm:table-cell">${rate}</td>
                <td className="py-2 text-right font-medium tabular-nums">${amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col gap-1 self-end text-sm">
          <div className="flex justify-between gap-10 text-ink-muted"><span>Tax (5%)</span><span className="tabular-nums">$231.00</span></div>
          <div className="flex justify-between gap-10 font-semibold"><span>Total</span><span className="tabular-nums">$4,851.00</span></div>
        </div>
      </div>
    </AppFrame>
  );
}
Chips.framed = true;
Chips.measure = (root) => {
  const c = root.querySelector('[data-chip]'), r = c.getBoundingClientRect(), t = lineOf(c);
  const capTop = t.baseline - (t.baseline - t.capMiddle) * 2, above = capTop - r.top;
  // the bar's top edge and where its letters begin, against the padding at its side
  const side = parseFloat(getComputedStyle(c).paddingLeft);
  return { around: c, ticks: [{ y: r.top, left: r.left + side, right: r.left + side + 160 }, { y: capTop, left: r.left + side, right: r.left + side + 160 }, { x: r.left + side, top: capTop, bottom: capTop + 8 }],
    broken: `${px(above)} above · ${px(side)} beside`, fixed: 'even padding ✓', off: above > side + 1.5 };
};

// #6 a price and its unit, two sizes side by side, share a baseline
const PLANS = [
  { name: 'Starter', price: '0', who: 'Just you, starting out', perks: ['5 clients', 'Invoices and quotes', 'Card payments'] },
  { name: 'Studio', price: '24', who: 'A small team, billing weekly', perks: ['Unlimited clients', 'Automatic reminders', 'Team seats'], current: true },
  { name: 'Agency', price: '64', who: 'Many clients and projects', perks: ['Everything in Studio', 'Client portal', 'Priority support'] },
];
const Check = () => <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-positive"><path d="m3.5 8.5 3 3 6-7" /></svg>;
function Price({ broken }) {
  return (
    <div className="@container flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">Plans</h3>
          <span className="text-sm text-ink-muted">Billed monthly, per seat. Change any time.</span>
        </div>
        <div role="group" aria-label="Billing period" className="flex shrink-0 rounded-full bg-sunken p-0.5 text-xs whitespace-nowrap">
          <span className="rounded-full bg-surface px-3 py-1 font-medium shadow-raised">Monthly</span>
          <span className="px-3 py-1 text-ink-muted">Yearly −20%</span>
        </div>
      </div>
      {/* three columns only when the window can hold them; below that the plans stack, one per row */}
      <div className="grid gap-6 divide-y-hairline divide-line @xl:grid-cols-3 @xl:gap-0 @xl:divide-x-hairline @xl:divide-y-0">
        {PLANS.map((p) => (
          <div key={p.name} className="flex flex-col gap-4 pb-6 last:pb-0 @xl:px-5 @xl:pb-0 @xl:first:pl-0 @xl:last:pr-0">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-sm font-medium">{p.name}{p.current ? <span className="rounded-full bg-accent-soft px-1.5 text-xs font-medium text-accent">Current</span> : null}</span>
              <span className="text-xs text-ink-muted">{p.who}</span>
            </div>
            <div data-price className={'flex gap-1 ' + (broken ? 'items-center' : '')}>
              <span className="text-3xl font-semibold tracking-tight tabular-nums">${p.price}</span>
              <span className="text-sm whitespace-nowrap text-ink-muted">/mo</span>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-ink-muted">
              {p.perks.map((k) => <li key={k} className="flex items-center gap-2"><Check />{k}</li>)}
            </ul>
            <button type="button" className={'mt-auto rounded-control px-3 py-1.5 text-sm font-medium ' + (p.current ? 'border border-line text-ink-muted active:bg-sunken' : p.name === 'Agency' ? 'bg-ink text-accent-ink active:bg-ink-muted' : 'border border-line active:bg-sunken')}>
              {p.current ? 'Your plan' : p.name === 'Agency' ? 'Upgrade' : 'Switch'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
Price.wide = true;
Price.measure = (root) => {
  const row = root.querySelector('[data-price]'), [a, b] = [...row.children].map(lineOf);
  const d = b.baseline - a.baseline;
  return { around: row, ticks: [{ y: a.baseline, left: a.left, right: a.right }, { y: b.baseline, left: b.left, right: b.right }], broken: `baselines ${px(d)} apart`, fixed: 'one baseline ✓', off: Math.abs(d) > 0.6 };
};

Billing.lesson = { why: "The notice's box sits on the column like the sections around it, so its padding pushes its words 16px in. The eye follows letters, not boxes, so the page reads as misaligned.", habit: 'A filled panel in a column bleeds out by its own padding: the background escapes the column, the words stay on it.' };
Lesson.lesson = { why: "A triangle's weight sits toward its flat side. Centre its box and the point carries empty space, so the shape reads left of centre.", habit: 'Centre an uneven glyph by its weight, not its box: nudge it toward its point, about a twelfth of its width.' };
Connected.lesson = { why: 'A circle fills about 78% of its box, a square nearly all of it. In the same box the circle has less ink, so it reads smaller.', habit: 'In one set, draw round marks a few percent larger than square ones (type designers call it overshoot).' };
Notice.lesson = { why: 'items-center centres the line box, and the line box keeps room for descenders below the baseline. The capitals sit above its middle, so a centred icon reads low.', habit: "Line icons up with the capitals' middle, not the line box: nudge up by the gap, or make the line box as tall as the capitals." };
Chips.lesson = { why: 'text-sm/6 puts a 24px line around 14px letters: 5px of invisible leading sits above and below them and adds itself to the padding, so even padding looks taller than it is wide.', habit: 'Measure padding from the letters: trim the text box to the capitals and baseline (text-box: trim-both cap alphabetic).' };
Price.lesson = { why: 'items-center lines up the middles of the two boxes. Boxes of different sizes keep their baselines at different heights, so the unit floats beside the price.', habit: 'Text of different sizes side by side sits on one baseline: items-baseline.' };
Amounts.lesson = { why: "Proportional digits are as wide as their shapes: a 1 is narrow, an 8 wide. Down a column, each amount's digits land in different places.", habit: 'Numbers that line up or change use tabular figures: every digit the same width.' };

// ── Spacing and rhythm ─────────────────────────────────────

// #7 the space inside a group is tighter than the space between groups: here a shared Field puts 12px between a label
// and its input, inside a form that sets its fields only 8px apart, so each label reads as belonging to the input above it
const FIELDS = [['Name', 'Halden & Co.'], ['Email', 'billing@halden.example'], ['Company number', 'SC 412 908'], ['Payment terms', 'Net 14']];
function Grouping({ broken }) {
  return (
    <AppFrame crumb="Clients / New client">
      <div className="flex flex-col gap-5 px-5 pt-4 pb-6">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold">New client</h3>
          <span className="text-sm text-ink-muted">Who you bill, and how they pay.</span>
        </div>
        <div data-form className="flex max-w-sm flex-col gap-2">
          {FIELDS.map(([label, value]) => (
            <div key={label} data-field className="flex flex-col gap-3">
              <span className="text-xs font-medium text-ink-muted">{label}</span>
              <span className="flex h-9 items-center rounded-control border border-line px-3 text-sm">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className="rounded-control bg-ink px-3 py-1.5 text-sm font-medium text-accent-ink active:bg-ink-muted">Create client</button>
          <button type="button" className="rounded-control border border-line px-3 py-1.5 text-sm font-medium active:bg-sunken">Cancel</button>
        </div>
      </div>
    </AppFrame>
  );
}
Grouping.framed = true;
Grouping.measure = (root) => {
  const [a, b] = [...root.querySelectorAll('[data-field]')], la = a.children[0].getBoundingClientRect(), ia = a.children[1].getBoundingClientRect(), lb = b.children[0].getBoundingClientRect();
  const inside = la.bottom < ia.top ? ia.top - la.bottom : 0, between = lb.top - ia.bottom;
  return { around: a, focus: { x: ia.left + 30, y: (ia.bottom + lb.top) / 2 }, ticks: [{ y: la.bottom, left: la.left, right: la.left + 60 }, { y: ia.top, left: la.left, right: la.left + 60 }, { y: ia.bottom, left: la.left, right: la.left + 60 }, { y: lb.top, left: la.left, right: la.left + 60 }],
    broken: `${px(inside)} inside · ${px(between)} between`, fixed: 'tighter inside ✓', off: inside > between };
};
Grouping.lesson = { why: 'Each field puts 12px between its label and its input, but the form sets fields only 8px apart, so every label sits closer to the input above it than to its own.', habit: 'Space inside a group is always tighter than space between groups: proximity is how people read what belongs together.' };

// #8 nested corners are concentric: inner radius = outer radius − the padding between them
const TEMPLATES = [['Classic', 'Serif heading, ruled lines'], ['Studio', 'Your logo, a calm grid'], ['Minimal', 'Just the numbers']];
function Templates({ broken }) {
  return (
    <AppFrame crumb="Settings / Invoice templates">
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-base font-semibold">Invoice templates</h3>
            <span className="text-sm text-ink-muted">What clients see when they open an invoice.</span>
          </div>
          <span className="text-sm text-accent">Upload your own</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {TEMPLATES.map(([name, what], i) => (
            <div key={name} data-tpl className={'flex flex-col gap-2 rounded-card border bg-surface p-2 ' + (i === 1 ? 'border-accent' : 'border-line')}>
              <img src={receipt} alt="" width="240" height="320" className="aspect-[4/3] w-full rounded-card bg-sunken object-cover object-top outline outline-1 -outline-offset-1 outline-line" />
              <div className="flex flex-col gap-0.5 px-1 pb-1">
                <span className="flex items-center gap-1.5 text-sm font-medium">{name}{i === 1 ? <span className="rounded-full bg-accent-soft px-1.5 text-xs text-accent">In use</span> : null}</span>
                <span className="truncate text-xs text-ink-muted" title={what}>{what}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppFrame>
  );
}
Templates.framed = true;
Templates.measure = (root) => {
  const card = root.querySelector('[data-tpl]'), img = card.querySelector('img'), c = card.getBoundingClientRect(), r = img.getBoundingClientRect();
  const R = parseFloat(getComputedStyle(card).borderTopLeftRadius), ir = parseFloat(getComputedStyle(img).borderTopLeftRadius), inset = r.left - c.left;
  return { around: card, focus: { x: r.left + 4, y: r.top + 4 }, ticks: [{ x: c.left, top: c.top, bottom: c.top + 24 }, { x: r.left, top: r.top, bottom: r.top + 24 }, { y: c.top, left: c.left, right: c.left + 24 }, { y: r.top, left: r.left, right: r.left + 24 }],
    broken: `${px(ir)} inside ${px(R)} · ${px(inset)} apart`, fixed: 'concentric ✓', off: Math.abs(ir - Math.max(0, R - inset)) > 1 };
};
Templates.lesson = { why: 'The preview keeps the card’s 12px corner but sits 9px inside it (8px of padding and the 1px border), so the two curves run side by side at different rates: the gap between them pinches at every corner.', habit: 'Inner radius = outer radius − everything between them, padding and border, at every level of nesting.' };

// #9 a text button takes about twice as much padding across as up and down (broken: p-2, copied from the icon
// buttons beside it)
const Ico = ({ d }) => <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const ROWS = [['INV-2041', 'Halden & Co.', 'Sent', '4,820.00'], ['INV-2040', 'Northfield Dental', 'Paid', '1,240.50'], ['INV-2039', 'Okafor Landscape', 'Overdue', '12,000.00']];
const TONES = { Sent: 'bg-accent-soft text-accent', Paid: 'bg-positive-soft text-positive', Overdue: 'bg-negative-soft text-negative' };
function Toolbar({ broken }) {
  return (
    <AppFrame crumb="Invoices">
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Invoices</h3>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Filter" className="grid size-8 place-items-center rounded-control border border-line text-ink-muted active:bg-sunken"><Ico d="M2.5 4h11M4.5 8h7M6.5 12h3" /></button>
            <button type="button" aria-label="Sort" className="grid size-8 place-items-center rounded-control border border-line text-ink-muted active:bg-sunken"><Ico d="M5 3v10m0 0-2-2m2 2 2-2M11 13V3m0 0-2 2m2-2 2 2" /></button>
            <button type="button" data-export className="rounded-control border border-line p-2 text-sm leading-4 font-medium active:bg-sunken">Export</button>
            <button type="button" className="rounded-control bg-accent px-3 py-2 text-sm leading-4 font-medium text-accent-ink active:bg-ink">New invoice</button>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <tbody>
            {ROWS.map(([id, client, st, amt]) => (
              <tr key={id} className="border-t-hairline border-line">
                <td className="case-forms py-2.5 pr-3 text-ink-muted">{id}</td>
                <td className="py-2.5 pr-3 font-medium">{client}</td>
                <td className="py-2.5 pr-3"><span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + TONES[st]}>{st}</span></td>
                <td className="py-2.5 text-right font-medium tabular-nums">${amt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppFrame>
  );
}
Toolbar.framed = true;
Toolbar.measure = (root) => {
  const b = root.querySelector('[data-export]'), r = b.getBoundingClientRect(), s = getComputedStyle(b), pl = parseFloat(s.paddingLeft), pt = parseFloat(s.paddingTop);
  return { around: b, focus: { x: r.left + r.width / 2, y: r.top + r.height / 2 }, ticks: [{ x: r.left + pl, top: r.top, bottom: r.bottom }, { x: r.right - parseFloat(s.paddingRight), top: r.top, bottom: r.bottom }],
    broken: `${px(pl)} across · ${px(pt)} up`, fixed: `${px(pl)} across ✓`, off: pl < pt * 1.6 };
};
Toolbar.lesson = { why: 'Words are wide and short. With the same padding on every side, the label looks squeezed from the sides and the button looks taller than it is wide.', habit: 'Text buttons take about twice as much padding across as up and down; only icon buttons are square.' };

// #10 the icon side of a button takes less padding: an icon carries its own whitespace inside its glyph box
const PEOPLE = [['Halden & Co.', 'billing@halden.example', 'HC', 'bg-accent-soft text-accent'], ['Northfield Dental', 'accounts@northfield.example', 'ND', 'bg-positive-soft text-positive'], ['Okafor Landscape', 'pay@okafor.example', 'OL', 'bg-sunken text-ink']];
function NewClient({ broken }) {
  return (
    <AppFrame crumb="Clients">
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-base font-semibold">Clients</h3>
            <span className="text-sm text-ink-muted">38 active · 4 with invoices due</span>
          </div>
          <button type="button" data-new className="flex items-center gap-1.5 rounded-control bg-ink px-4 py-2 text-sm font-medium text-accent-ink active:bg-ink-muted"><Ico d="M8 3v10M3 8h10" />New client</button>
        </div>
        <ul className="flex flex-col">
          {PEOPLE.map(([name, email, ini, tint]) => (
            <li key={name} className="flex items-center gap-3 border-t-hairline border-line py-2.5">
              <span className={'grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ' + tint}>{ini}</span>
              <span className="flex min-w-0 flex-col"><span className="text-sm font-medium">{name}</span><span className="truncate text-xs text-ink-muted">{email}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </AppFrame>
  );
}
NewClient.framed = true;
NewClient.measure = (root) => {
  const b = root.querySelector('[data-new]'), r = b.getBoundingClientRect(), g = b.querySelector('svg').getBoundingClientRect();
  const t = document.createRange(); t.selectNodeContents(b.lastChild); const tr = t.getBoundingClientRect();
  const left = g.left - r.left, right = r.right - tr.right;
  return { around: b, focus: { x: g.left, y: r.top + r.height / 2 }, ticks: [{ x: r.left, top: r.top, bottom: r.bottom }, { x: g.left, top: r.top, bottom: r.bottom }, { x: tr.right, top: r.top, bottom: r.bottom }, { x: r.right, top: r.top, bottom: r.bottom }],
    broken: `${px(left)} by the icon · ${px(right)} by the text`, fixed: 'icon side lighter ✓', off: left >= right - 1 };
};
NewClient.lesson = { why: 'An icon’s glyph box carries its own space around the drawing. With the same padding on both sides, the icon side looks looser than the text side and the label reads off-centre.', habit: 'On the side with the icon, take 2–4px of padding off.' };

export const EXAMPLES = { 7: Grouping, 8: Templates, 9: Toolbar, 10: NewClient, 1: Billing, 2: Lesson, 3: Connected, 4: Notice, 5: Chips, 6: Price, 16: Amounts };

