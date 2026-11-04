// One example per principle, each a small scene from a real product, drawn with care: real content, quiet colour,
// soft depth. Each takes `broken` and is wrong in exactly one way, the principle's; everything else on it is right, so
// plumber, scoped to it, finds one thing. `measure` (optional) says where the eye sees the harm, for the ticks drawn
// over the example; it reads the page, it never decides what is wrong (plumber does).
import { Bell, Play } from '../icons.jsx';
import site from '../site.png';

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


// #1 sections down a page line up by their words, not their boxes: a filled notice between a heading and a list
// keeps its box on the column, so its words sit in by its padding; it should bleed out by that padding instead
const HISTORY = [['Nov 1, 2026', '96.00'], ['Oct 1, 2026', '96.00'], ['Sep 1, 2026', '72.00']];
function Billing({ broken }) {
  return (
    <div data-sections className="flex w-full max-w-md flex-col gap-6">
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
  );
}
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
    <div className="flex w-full max-w-md flex-col gap-4">
      <span className="text-xs font-medium text-ink-muted">Quarry Academy · Getting paid</span>
      <div className="relative overflow-hidden rounded-control">
        <img src={site} alt="" width="480" height="270" className="aspect-video w-full object-cover" />
        <div className="absolute inset-0 grid place-items-center">
          <button type="button" aria-label="Play: Send your first invoice" data-play className="grid size-14 place-items-center rounded-full bg-surface text-ink shadow-overlay active:bg-sunken"><Play size={24} /></button>
        </div>
        <span className="absolute right-2 bottom-2 rounded-chip bg-ink px-1.5 py-0.5 text-xs font-medium text-accent-ink tabular-nums">2:14</span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">Send your first invoice</h3>
        <span className="text-sm text-ink-muted">Lesson 2 of 6 · with Ada Morales</span>
      </div>
      <ol className="flex flex-col border-t-hairline border-line">
        {CHAPTERS.map(([title, time, at]) => (
          <li key={title} className="flex items-center gap-3 border-b-hairline border-line py-2 text-sm">
            <span className={'grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ' + (at === 'done' ? 'bg-positive-soft text-positive' : at === 'now' ? 'bg-accent text-accent-ink' : 'bg-sunken text-ink-muted')}>{at === 'done' ? '✓' : CHAPTERS.findIndex((c) => c[0] === title) + 1}</span>
            <span className={'flex-1 ' + (at === 'now' ? 'font-medium' : at === 'done' ? 'text-ink-muted' : '')}>{title}</span>
            <span className="text-ink-muted tabular-nums">{time}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
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
function Connected({ broken }) {
  const r = 9;
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold">Integrations</h3>
          <span className="text-sm text-ink-muted">Three connected · synced 4 min ago</span>
        </div>
        <div data-logos aria-label="Ledgerline, Orbit Mail, Tallyhook, Copperbank" className="flex items-center -space-x-1">
          {APPS.map((a) => <Mark key={a.name} shape={a.shape} r={r} tone={a.tone} letter={a.letter} />)}
        </div>
      </div>
      <ul className="flex flex-col rounded-control border border-line">
        {APPS.map((a) => (
          <li key={a.name} className="flex items-center gap-3 border-b-hairline border-line px-3 py-2.5 last:border-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-sunken"><Mark shape={a.shape} r={9.75} tone={a.tone} letter={a.letter} size={20} /></span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">{a.name}</span>
              <span className="truncate text-xs text-ink-muted" title={a.what}>{a.what}</span>
            </span>
            <span role="switch" aria-checked={a.on} aria-label={a.name} className={'relative h-6 w-11 shrink-0 rounded-full ' + (a.on ? 'bg-accent' : 'bg-line')}>
              <span className={'absolute top-0.5 size-5 rounded-full bg-surface shadow-raised ' + (a.on ? 'left-5.5' : 'left-0.5')} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
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

// #4 an icon beside words sits on the capitals' middle (broken: pushed down with mt-1, for a font long gone)
const NOTES = [
  ['Halden & Co. paid INV-2041', '$4,820.00 arrived in Studio checking', '2m'],
  ['Northfield Dental opened INV-2040', 'Viewed twice, from Lisbon', '1h'],
  ['Reminder sent for INV-2039', 'Okafor Landscape · 12 days overdue', '3h'],
];
function Notice({ broken }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div className="flex items-baseline justify-between pb-1">
        <h3 className="text-base font-semibold">Notifications</h3>
        <span className="text-sm text-accent">Mark all read</span>
      </div>
      <ul className="flex flex-col">
        {NOTES.map(([title, detail, when], i) => (
          <li key={title} className={'flex flex-col gap-0.5 border-b-hairline border-line py-2.5 last:border-0 ' + (i === 0 ? '' : '')}>
            <div data-notice className="flex items-center gap-2.5 text-sm font-medium">
              <Bell className={'text-accent ' + (broken ? 'mt-1' : '')} />
              <span className="min-w-0 flex-1 truncate" title={title}>{title}</span>
              <span className="text-xs font-normal text-ink-muted tabular-nums">{when}</span>
            </div>
            <p className="pl-6.5 text-sm text-ink-muted">{detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
Notice.measure = (root) => {
  const row = root.querySelector('[data-notice]'), g = row.querySelector('svg').getBoundingClientRect(), t = lineOf(row.querySelector('span'));
  const icon = g.top + g.height / 2, d = icon - t.capMiddle;
  return { around: row, focus: { x: g.right + 4, y: (icon + t.capMiddle) / 2 }, ticks: [{ y: icon, left: g.left - 4, right: g.right + 2 }, { y: t.capMiddle, left: t.left - 2, right: t.left + 48 }], broken: `icon ${px(d)} low`, fixed: 'on the capitals ✓', off: Math.abs(d) > 0.6 };
};

// #5 padding meant to be even all round (p-3) is measured from the letters, not from the line's leading: one line of
// text-sm/6 carries 5px of invisible leading above and below, so the top reads 17px against 12px at the sides
function Chips({ broken }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <p data-chip className="rounded-control bg-ink p-3 text-sm leading-6 text-accent-ink">
        Card payments are live. <a href="#banner" className="font-semibold underline underline-offset-2">See how</a>
      </p>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Invoices</h3>
        <button type="button" className="rounded-control bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink active:bg-ink">New invoice</button>
      </div>
      <ul className="flex flex-col">
        {[['INV-2041', 'Halden & Co.', 'Sent', 'bg-accent-soft text-accent'], ['INV-2040', 'Northfield Dental', 'Paid', 'bg-positive-soft text-positive']].map(([id, who, st, tone]) => (
          <li key={id} className="flex items-center gap-3 border-b-hairline border-line py-2.5 text-sm last:border-0">
            <span className="case-forms w-20 text-ink-muted">{id}</span>
            <span className="flex-1 font-medium">{who}</span>
            <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + tone}>{st}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
Chips.measure = (root) => {
  const c = root.querySelector('[data-chip]'), r = c.getBoundingClientRect(), t = lineOf(c);
  const capTop = t.baseline - (t.baseline - t.capMiddle) * 2, above = capTop - r.top;
  // the bar's top edge and where its letters begin, against the padding at its side
  const side = parseFloat(getComputedStyle(c).paddingLeft);
  return { around: c, ticks: [{ y: r.top, left: r.left + side, right: r.left + side + 160 }, { y: capTop, left: r.left + side, right: r.left + side + 160 }, { x: r.left + side, top: capTop, bottom: capTop + 8 }],
    broken: `${px(above)} above · ${px(side)} beside`, fixed: 'even padding ✓', off: above > side + 1.5 };
};

// #6 a price and its unit, two sizes side by side, share a baseline
const PLANS = [['Starter', '0', 'For one person'], ['Studio', '24', 'For small teams'], ['Agency', '64', 'For many clients']];
function Price({ broken }) {
  return (
    <div className="grid w-full max-w-lg gap-3 sm:grid-cols-3">
      {PLANS.map(([name, price, who]) => (
        <div key={name} className={'flex flex-col gap-3 rounded-control border px-3 pt-3 pb-4 ' + (name === 'Studio' ? 'border-accent bg-accent-soft' : 'border-line')}>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{name}</span>
            <span className="text-xs text-ink-muted">{who}</span>
          </div>
          <div data-price className={'flex gap-1 ' + (broken ? 'items-center' : '')}>
            <span className="text-3xl font-semibold tracking-tight tabular-nums">${price}</span>
            <span className="text-sm whitespace-nowrap text-ink-muted">/mo</span>
          </div>
          <button type="button" className={'rounded-control px-3 py-1.5 text-sm font-medium ' + (name === 'Studio' ? 'bg-accent text-accent-ink active:bg-ink' : 'border border-line bg-surface active:bg-sunken')}>{name === 'Studio' ? 'Current plan' : 'Choose'}</button>
        </div>
      ))}
    </div>
  );
}
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
export const EXAMPLES = { 1: Billing, 2: Lesson, 3: Connected, 4: Notice, 5: Chips, 6: Price, 16: Amounts };

