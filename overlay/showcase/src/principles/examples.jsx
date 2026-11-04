// One example per principle, each a small scene from a real product, drawn with care: real content, quiet colour,
// soft depth. Each takes `broken` and is wrong in exactly one way, the principle's; everything else on it is right, so
// plumber, scoped to it, finds one thing. `measure` (optional) says where the eye sees the harm, for the ticks drawn
// over the example; it reads the page, it never decides what is wrong (plumber does).
import { useEffect, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, BellIcon, BoltIcon, BookIcon, CheckIcon, FileIcon, FolderIcon, HeadphonesIcon, HeartIcon, HistoryIcon, LayersIcon, LockIcon, MailIcon, MessageIcon, PathIcon, PauseIcon, PlayIcon, PlusIcon, SearchIcon, SendIcon, SparklesIcon, UploadIcon, UserIcon } from '@unlocalhosted/dither-icons';
import receipt from '../receipt.png';
import lowTide from '../media/low-tide.jpg';
import paperCities from '../media/paper-cities.jpg';
import afterglow from '../media/afterglow.jpg';

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

// #16 figures that change, or stack in a column, line up only in tabular figures. Quarry's time tracking: a timer
// running on a job, its earnings climbing, today's finished entries stacked under it. In proportional figures the
// clock wobbles every second and the durations never stack.

/* ─────────────────────────────────────────────────────────
 * THE TIMER
 *   running   one second a tick; what it has earned climbs with it
 *   paused    by its own button, or frozen by the stage for plumber's look
 * ───────────────────────────────────────────────────────── */
const TIMER = { every: 1000, startedAgo: 6157, rate: 145, task: 'Moodboard review', job: 'Marlow Joinery · Showroom launch' };
const EARLIER = [
  { task: 'Wireframes, checkout', client: 'Brightwater Vets', seconds: 7578, rate: 130 },
  { task: 'Logo exploration', client: 'Halden & Co.', seconds: 4300, rate: 145 },
  { task: 'Kickoff call', client: 'Northfield Dental', seconds: 2885, rate: 120 },
  { task: 'Invoice review', client: 'Okafor Landscape', seconds: 1192, rate: 95 },
];
const clock = (t) => `${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
const dollars = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const earned = (seconds, rate) => (seconds / 3600) * rate;
function useTimer(live) {
  const [t, setT] = useState(TIMER.startedAgo);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!live || paused) return undefined;
    const id = setInterval(() => setT((x) => x + 1), TIMER.every);
    return () => clearInterval(id);
  }, [live, paused]);
  return { t, paused, toggle: () => setPaused((p) => !p) };
}

// every figure on the card, set in one place
const Fig = ({ col, className = '', children }) => <span data-fig data-col={col} className={className}>{children}</span>;
function Timesheet({ live = true }) {
  const { t, paused, toggle } = useTimer(live);
  const total = EARLIER.reduce((a, e) => a + e.seconds, 0) + t;
  const totalEarned = EARLIER.reduce((a, e) => a + earned(e.seconds, e.rate), 0) + earned(t, TIMER.rate);
  // Quarry's Slate primitives only: the card, the type ramp (figure, title, body, meta, label), one brand colour
  return (
    <article className="w-full max-w-[30rem] rounded-card bg-surface shadow-card">
      <header className="flex flex-col gap-5 p-6">
        <span className="flex items-center gap-2 text-xs font-medium text-ink-muted">
          <span className={'size-1.5 rounded-full ' + (paused ? 'bg-ink-subtle' : 'bg-positive')} />
          {paused ? 'Paused' : 'Tracking'}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[17px] leading-6 font-medium tracking-[-0.01em]">{TIMER.task}</span>
          <span className="truncate text-[13px] text-ink-muted">{TIMER.job}</span>
        </span>
        <span className="flex flex-col gap-2">
          {/* the control sits on what it controls: centred on the clock */}
          <span className="flex items-center justify-between gap-6">
            <Fig col="clock" className="text-[48px] leading-none font-medium tracking-[-0.025em]">{clock(t)}</Fig>
            <button type="button" onClick={toggle} aria-label={paused ? 'Resume timer' : 'Pause timer'}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition-[background-color,scale] duration-150 hover:bg-accent-deep active:scale-95 outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent">
              {paused
                ? <svg viewBox="0 0 16 16" className="size-3.5 translate-x-px" fill="currentColor" aria-hidden="true"><path d="M4 2.8v10.4a.8.8 0 0 0 1.2.7l8.6-5.2a.8.8 0 0 0 0-1.4L5.2 2.1a.8.8 0 0 0-1.2.7" /></svg>
                : <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" rx="1" /><rect x="9.5" y="2.5" width="3" height="11" rx="1" /></svg>}
            </button>
          </span>
          <span className="text-[13px] text-ink-muted"><Fig col="earned" className="text-ink">{dollars(earned(t, TIMER.rate))}</Fig> at ${TIMER.rate} an hour</span>
        </span>
      </header>
      <section data-entries className="border-t-hairline border-line px-6 pt-4 pb-5">
        <h3 className="text-xs font-medium text-ink-muted">Earlier today</h3>
        <ul className="mt-1">
          {EARLIER.map((e) => (
            <li key={e.task} data-entry className="flex items-start gap-3 border-b-hairline border-line py-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{e.task}</span>
                <span className="truncate text-[13px] text-ink-muted">{e.client}</span>
              </span>
              <span className="flex flex-col items-end">
                <Fig col="time" className="text-sm">{clock(e.seconds)}</Fig>
                <Fig col="money" className="text-[13px] text-ink-muted">{dollars(earned(e.seconds, e.rate))}</Fig>
              </span>
            </li>
          ))}
        </ul>
        <div data-total className="flex items-baseline justify-between gap-3 pt-3.5">
          <span className="text-xs font-medium text-ink-muted">Today so far</span>
          <span className="flex flex-col items-end">
            <Fig col="time" className="text-[17px] font-medium tracking-[-0.01em]">{clock(total)}</Fig>
            <Fig col="money" className="text-[13px] text-ink-muted">{dollars(totalEarned)}</Fig>
          </span>
        </div>
      </section>
    </article>
  );
}
Timesheet.stage = true;
Timesheet.names = ['Proportional', 'Tabular'];
Timesheet.lesson = {
  why: 'Proportional figures are as wide as their shapes: a 1 is narrow, a 0 is wide. A running clock changes width every second, so it wobbles, and durations stacked in a column never line up.',
  habit: 'Any number that changes, or sits above another, gets tabular figures: timers, totals, prices, counters, tables.',
};
// What the eye sees: the edges of every digit in the stacked durations, keyed by row and place (counted from the
// right: they're aligned right), so plumber's fix can glide them. The pill is the most one place drifts between rows.
Timesheet.measure = (root) => {
  // the rows only: the total is set larger, so its digits never stack with theirs, tabular or not
  const list = root?.querySelector('[data-entries] ul');
  if (!list) return null;
  const { top, bottom } = list.getBoundingClientRect(), range = document.createRange();
  const lines = [], bands = [], pills = [];
  let off = false;
  for (const col of ['time']) { // the durations: the amounts share their stack, and two sets of stripes would merge
    const figs = [...list.querySelectorAll(`[data-col="${col}"]`)];
    const places = [];
    let l = Infinity, r = -Infinity;
    figs.forEach((f, row) => {
      const text = f.firstChild, n = text?.textContent.length ?? 0;
      for (let c = 0; c < n; c++) {
        range.setStart(text, c); range.setEnd(text, c + 1);
        const g = range.getBoundingClientRect(), place = n - 1 - c;
        lines.push({ key: `${col}-${row}-${place}-l`, x: g.left, top, bottom }, { key: `${col}-${row}-${place}-r`, x: g.right, top, bottom });
        (places[place] ??= []).push(g.left);
        l = Math.min(l, g.left); r = Math.max(r, g.right);
      }
    });
    const drift = Math.max(0, ...places.filter((p) => p.length > 1).map((p) => Math.max(...p) - Math.min(...p)));
    bands.push({ key: col, left: l, right: r, top, bottom });
    pills.push({ key: col, x: (l + r) / 2, y: top, text: drift.toFixed(1), ok: drift < 0.3 });
    off ||= drift >= 0.3;
  }
  const s = root.querySelector('[data-entries]').getBoundingClientRect();
  return { lines, bands, pills, off, subject: { left: s.left, right: s.right, top: top - 12, bottom } };
};


// ── Spacing and rhythm ─────────────────────────────────────



// #1 align content, not boxes. A client's profile in Quarry: who they are, a note the team keeps about them, their
// recent invoices. The note is a tinted panel with its own padding, sitting on the same column as the sections around
// it, so its words start 16px in from every other line on the page. plumber's fix bleeds the panel out by that padding.
const RECENT = [
  { id: 'INV-2041', what: 'Brand refresh', state: 'Overdue', tone: 'negative', amount: '$4,820.00' },
  { id: 'INV-2036', what: 'Signage', state: 'Paid', tone: 'positive', amount: '$1,950.00' },
  { id: 'INV-2029', what: 'Retainer, October', state: 'Paid', tone: 'positive', amount: '$3,200.00' },
];
// Slate's status: a soft pill in the status's own ink, with a hairline ring of the same ink
const STATUS = {
  positive: 'bg-positive-soft text-positive ring-positive/15',
  negative: 'bg-negative-soft text-negative ring-negative/15',
};
function ClientProfile() {
  // Quarry's Slate primitives only: the card, the type ramp, a client shown by its own mark, one brand colour
  return (
    <article className="w-full max-w-[32rem] rounded-card bg-surface shadow-card">
      <div data-profile className="flex flex-col gap-5 p-6">
        <header className="flex items-center gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-deep">
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><rect x="5" y="6.5" width="14" height="4" rx="2" /><rect x="5" y="13.5" width="9" height="4" rx="2" /></svg>
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[17px] leading-6 font-medium tracking-[-0.01em]">Halden & Co.</span>
            <span className="truncate text-[13px] text-ink-muted">Brand studio · Copenhagen · client since 2023</span>
          </span>
        </header>
        <dl className="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-ink-muted">Billing contact</dt><dd>Mette Halden</dd>
          <dt className="text-ink-muted">Send invoices to</dt><dd className="truncate">accounts@halden.studio</dd>
          <dt className="text-ink-muted">Terms</dt><dd>Net 14, in DKK</dd>
        </dl>
        <aside data-note className="rounded-control bg-sunken px-4 pt-3 pb-3.5 text-sm">
          <p className="font-medium">Note from Ana</p>
          <p className="mt-0.5 text-pretty text-ink-muted">They need a PO number on every invoice since September. Mette approves anything over 5,000 kr.</p>
        </aside>
        <section className="flex flex-col">
          <h3 className="text-xs font-medium text-ink-muted">Recent invoices</h3>
          <ul className="mt-1">
            {RECENT.map((r) => (
              <li key={r.id} className="flex items-center gap-3 border-b-hairline border-line py-2.5 last:border-0">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{r.what}</span>
                  <span className="case-forms text-[13px] text-ink-muted">{r.id}</span>
                </span>
                <span className={'inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ring-1 ring-inset ' + STATUS[r.tone]}>{r.state}</span>
                <span className="w-24 text-right text-sm tabular-nums">{r.amount}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
ClientProfile.stage = true;
ClientProfile.names = ['Boxes aligned', 'Words aligned'];
ClientProfile.lesson = {
  why: 'The note’s box sits on the same column as the sections around it, so its padding pushes its words 16px in. The eye follows letters, not boxes: the page reads as if the note were indented.',
  habit: 'A filled panel in a column bleeds out by its own padding: the fill escapes into the gutter, the words stay on the edge every other line shares.',
};
// What the eye sees: where each section's words start, against the column the page sets. The note's padding is the
// hatch (plumber's pattern for padding); the pill is how far its words sit off the column.
ClientProfile.measure = (root) => {
  const page = root?.querySelector('[data-profile]'), note = root?.querySelector('[data-note]');
  if (!page || !note) return null;
  // on screen, under the camera's zoom: the padding is scaled with everything else
  const ps = getComputedStyle(page), pr = page.getBoundingClientRect(), k = pr.width / page.offsetWidth || 1, column = pr.left + parseFloat(ps.paddingLeft) * k;
  const lines = [...page.children].map((sec, i) => {
    const first = sec === note ? note.firstElementChild : sec.querySelector('span span, dt, h3') ?? sec;
    const b = sec.getBoundingClientRect(), r = document.createRange();
    r.selectNodeContents(first);
    return { key: 's' + i, x: r.getBoundingClientRect().left, top: b.top, bottom: b.bottom };
  });
  const top = pr.top + parseFloat(ps.paddingTop) * k, bottom = pr.bottom - parseFloat(ps.paddingBottom) * k;
  lines.push({ key: 'column', x: column, top, bottom });
  const n = note.getBoundingClientRect(), words = lines[[...page.children].indexOf(note)].x, off = words - column;
  return {
    lines, off: Math.abs(off) >= 0.5,
    bands: [{ key: 'pad', left: n.left, right: words, top: n.top, bottom: n.bottom, pattern: 'hatch' }],
    pills: [{ key: 'off', x: column, y: n.top - 14 * k, text: Math.abs(off).toFixed(1), ok: Math.abs(off) < 0.5 }],
    cut: { left: n.left, right: n.right, top: n.top, bottom: n.bottom, r: parseFloat(getComputedStyle(note).borderTopLeftRadius) * k }, // the drifting element only
    subject: { left: pr.left - 4 * k, right: pr.left + pr.width * 0.66, top: top - 8 * k, bottom: n.bottom + 64 * k },
  };
};

// #2 optical centre beats geometric centre. The invoice a client of Quarry receives, with a short walkthrough the
// studio recorded. Its play button centres the triangle by its box, and a triangle's weight sits toward its flat side,
// so the glyph reads left of centre. plumber's fix nudges it toward its point by its weight.
function InvoiceWalkthrough() {
  // Quarry's Slate primitives only
  return (
    <article className="w-full max-w-[30rem] rounded-card bg-surface shadow-card">
      <div className="flex flex-col gap-5 p-6">
        <header className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-deep">
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden="true"><path d="M12 4 20 18H4z" /></svg>
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">Studio North</span>
            <span className="truncate text-[13px] text-ink-muted">Invoice <span className="case-forms">INV-2041</span> for Halden & Co.</span>
          </span>
        </header>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-muted">Amount due</span>
          <span className="text-[34px] leading-[38px] font-medium tracking-[-0.02em] tabular-nums">$4,820.00</span>
          <span className="text-[13px] text-ink-muted">Due 12 November 2026 · Net 14</span>
        </div>
        {/* the walkthrough: a frame of the recording (the invoice itself, on the studio's screen) and its play button */}
        <figure className="flex flex-col gap-2">
          <div data-video className="relative grid aspect-[16/9] place-items-center overflow-hidden rounded-control bg-ink">
            <div aria-hidden="true" className="absolute inset-x-[18%] top-[14%] bottom-0 rounded-t-[4px] bg-surface/95 px-[6%] pt-[5%]">
              <div className="h-1.5 w-1/3 rounded-full bg-ink/25" />
              <div className="mt-[6%] flex flex-col gap-[5%]">
                {[70, 55, 62, 40].map((w) => <div key={w} className="flex justify-between"><span className="h-1 rounded-full bg-ink/12" style={{ width: `${w}%` }} /><span className="h-1 w-[14%] rounded-full bg-ink/12" /></div>)}
              </div>
            </div>
            <div aria-hidden="true" className="absolute inset-0 bg-ink/35" />
            <button type="button" data-play aria-label="Play Ana’s walkthrough, 1 minute 24 seconds"
              className="relative grid size-14 place-items-center rounded-full bg-surface text-ink shadow-[0_6px_20px_rgb(18_35_61/0.35)] transition-[scale] duration-150 hover:scale-105 active:scale-95 outline-offset-2 focus-visible:outline-2 focus-visible:outline-surface">
              {/* exported from the design file with its box centred, as custom glyphs usually are */}
              <svg viewBox="0.3 0 20 20" className="size-6" fill="currentColor" aria-hidden="true"><path d="M2 1.6v16.8a1 1 0 0 0 1.5.86l14.6-8.4a1 1 0 0 0 0-1.72L3.5.74A1 1 0 0 0 2 1.6" /></svg>
            </button>
            <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-ink/70 py-1 pr-2.5 pl-1 text-xs text-surface backdrop-blur">
              <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] font-semibold text-accent-ink">A</span>Ana · 1:24
            </span>
          </div>
          <figcaption className="text-[13px] text-ink-muted">Ana walked through this invoice for you.</figcaption>
        </figure>
        <div className="flex items-center gap-4">
          <button type="button" className="h-10 flex-1 rounded-control bg-accent px-4 text-sm font-medium text-accent-ink hover:bg-accent-deep outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent">Pay $4,820.00</button>
          <a href="#pdf" className="text-sm font-medium text-ink-muted hover:text-ink">Download PDF</a>
        </div>
      </div>
    </article>
  );
}
InvoiceWalkthrough.stage = true;
InvoiceWalkthrough.names = ['Box centred', 'Weight centred'];
InvoiceWalkthrough.lesson = {
  why: 'A triangle’s weight sits toward its flat side. Centre its box in the circle and the point carries empty space, so the glyph reads left of centre, and the button looks off.',
  habit: 'Centre an uneven glyph by its weight, not its box: nudge it toward its point, about a twelfth of its width.',
};
// The glyph's real shape, in its own units: the box of its ink and its centre of mass, sampled from the filled path
// once (the shape never changes; only where it's drawn does)
const SHAPES = new WeakMap();
function shapeOf(svg) {
  const path = svg.querySelector('path');
  if (SHAPES.has(path)) return SHAPES.get(path);
  const vb = svg.viewBox.baseVal, pt = svg.createSVGPoint(), step = vb.width / 160;
  let a = 0, cx = 0, x0 = Infinity, x1 = -Infinity;
  for (let y = vb.y; y < vb.y + vb.height; y += step) for (let x = vb.x; x < vb.x + vb.width; x += step) {
    pt.x = x; pt.y = y;
    if (!path.isPointInFill(pt)) continue;
    a++; cx += x; x0 = Math.min(x0, x); x1 = Math.max(x1, x + step);
  }
  const v = { mid: (x0 + x1) / 2 - vb.x, centroid: cx / a - vb.x, units: vb.width };
  SHAPES.set(path, v);
  return v;
}
// What the eye sees: the button's middle, and where the eye puts the triangle's middle (halfway between its ink's
// middle and its weight, as plumber reads it). The pill is the distance between them; under 1px the eye can't tell
// (plumber's own threshold for this rule).
InvoiceWalkthrough.measure = (root) => {
  const b = root?.querySelector('[data-play]'), g = b?.querySelector('svg');
  if (!g) return null;
  const br = b.getBoundingClientRect(), gr = g.getBoundingClientRect(), k = br.width / b.offsetWidth || 1, shape = shapeOf(g), u = gr.width / shape.units;
  const centre = br.left + br.width / 2, seen = gr.left + ((shape.mid + shape.centroid) / 2) * u, off = (centre - seen) / k;
  const top = br.top - 10 * k, bottom = br.bottom + 10 * k;
  return {
    lines: [{ key: 'centre', x: centre, top, bottom }, { key: 'seen', x: seen, top: gr.top, bottom: gr.bottom }],
    bands: [{ key: 'gap', left: Math.min(centre, seen), right: Math.max(centre, seen), top: gr.top, bottom: gr.bottom, pattern: 'hatch' }],
    pills: [{ key: 'off', x: centre, y: top - 4 * k, text: (Math.abs(off) * k).toFixed(1), ok: Math.abs(off) < 1 }],
    off: Math.abs(off) >= 1,
    cut: { left: br.left, right: br.right, top: br.top, bottom: br.bottom, r: br.width / 2 }, // the round button itself
    subject: { left: br.left - 60 * k, right: br.right + 60 * k, top: br.top - 40 * k, bottom: br.bottom + 40 * k },
  };
};

// #3 round shapes are drawn a touch larger than square ones. A whiteboard in a team's design tool, with the Shapes
// picker open: square, circle, triangle and diamond all drawn in the same 20px box. A circle fills about 78% of its
// box and a square nearly all of it, so the circle reads smaller. plumber's fix draws it 4% larger (overshoot).
const SHAPES_PICKER = [
  { name: 'Square', shape: <rect x="2" y="2" width="20" height="20" rx="1" /> },
  { name: 'Circle', shape: <circle cx="12" cy="12" r="10" /> },
  { name: 'Triangle', shape: <path d="M12 2.5 22 21H2z" /> },
  { name: 'Diamond', shape: <path d="M12 1.5 22.5 12 12 22.5 1.5 12z" /> },
];
const TOOLS = [
  { name: 'Layers', Icon: LayersIcon },
  { name: 'Comment', Icon: MessageIcon },
  { name: 'Ideas', Icon: SparklesIcon },
];
function Whiteboard() {
  // Slate's primitives, with dithered icons for the tool's own controls
  return (
    <article className="w-full max-w-[36rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex h-12 items-center gap-3 border-b-hairline border-line px-4">
        <span className="text-sm font-medium">Spring launch</span>
        <span className="text-[13px] text-ink-muted">Board</span>
        <span className="ml-auto flex -space-x-1.5" aria-label="Mira, Theo and Sana are here">
          {[['M', 'bg-accent-soft text-accent-deep'], ['T', 'bg-positive-soft text-positive'], ['S', 'bg-caution-soft text-caution']].map(([l, c]) => (
            <span key={l} className={'grid size-6 place-items-center rounded-full text-[11px] font-semibold ring-2 ring-surface ' + c}>{l}</span>
          ))}
        </span>
        <button type="button" aria-label="History" className="grid size-8 place-items-center rounded-control text-ink-muted hover:bg-sunken hover:text-ink"><HistoryIcon size={18} texture="dither" /></button>
        <button type="button" className="h-8 rounded-control bg-accent px-3 text-[13px] font-medium text-accent-ink hover:bg-accent-deep">Share</button>
      </header>
      {/* the board: a dotted canvas with the team's notes on it */}
      <div className="relative h-[19rem] bg-canvas [background-image:radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="absolute top-6 left-6 w-40 rotate-[-1.5deg] rounded-[4px] bg-caution-soft p-3 text-[13px] leading-5 shadow-raised">Landing page copy by Friday</div>
        <svg aria-hidden="true" className="absolute top-12 left-[12.5rem] h-10 w-32 text-ink/45" viewBox="0 0 128 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 30C40 4 84 4 120 22" /><path d="m112 14 9 8-11 3" /></svg>
        <div className="absolute top-8 right-8 w-36 rotate-[1deg] rounded-[4px] bg-accent-soft p-3 text-[13px] leading-5 shadow-raised">Ask Sana for the hero photo</div>
        <div className="absolute top-[8.75rem] left-8 grid h-12 w-28 place-items-center rounded-full border-[1.5px] border-ink/50 text-[13px] text-ink-muted">Launch</div>
        {/* the Shapes picker, open above the toolbar */}
        <div className="absolute bottom-[4.25rem] left-1/2 flex -translate-x-1/2 flex-col gap-2 rounded-card bg-surface p-2.5 shadow-popover">
          <span className="px-1 text-xs font-medium text-ink-muted">Shapes</span>
          <div data-shapes className="flex gap-1">
            {SHAPES_PICKER.map((s) => (
              <button key={s.name} type="button" aria-label={s.name} className="grid size-11 place-items-center rounded-control text-ink hover:bg-sunken">
                <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">{s.shape}</svg>
              </button>
            ))}
          </div>
        </div>
        {/* the toolbar */}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-card bg-surface p-1.5 shadow-overlay">
          {TOOLS.map(({ name, Icon }) => (
            <button key={name} type="button" aria-label={name} className="grid size-9 place-items-center rounded-chip text-ink-muted hover:bg-sunken hover:text-ink"><Icon size={20} texture="dither" /></button>
          ))}
          <button type="button" aria-label="Shapes" aria-expanded="true" className="grid size-9 place-items-center rounded-chip bg-accent-soft text-accent-deep">
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="1" /><circle cx="16" cy="16" r="5.5" /></svg>
          </button>
        </div>
      </div>
    </article>
  );
}
Whiteboard.stage = true;
Whiteboard.names = ['Same box', 'Overshoot'];
Whiteboard.lesson = {
  why: 'A circle fills about 78% of its box, a square nearly all of it. Drawn in the same box, the circle carries less ink, so it reads smaller than the square beside it.',
  habit: 'In one set, draw round shapes a few percent larger than square ones. Type designers call it overshoot: an O is taller than an H.',
};
// What the eye sees: the square's top and bottom edges carried across to the circle, which falls short of them. The
// pill is how much larger the circle has to be (to the square's size and the 4% overshoot past it), in px.
Whiteboard.measure = (root) => {
  const row = root?.querySelector('[data-shapes]');
  if (!row) return null;
  const [sq, ci] = [row.querySelector('rect'), row.querySelector('circle')].map((n) => n.getBoundingClientRect());
  const k = row.getBoundingClientRect().width / row.offsetWidth || 1, want = sq.height * 1.04, short = (want - ci.height) / k;
  const left = sq.left - 6 * k, right = ci.right + 6 * k;
  return {
    lines: [],
    rules: [
      { key: 'sq-top', y: sq.top, left, right }, { key: 'sq-bottom', y: sq.bottom, left, right },
      { key: 'ci-top', y: ci.top, left: ci.left, right: ci.right }, { key: 'ci-bottom', y: ci.bottom, left: ci.left, right: ci.right },
    ],
    bands: [{ key: 'short', left: ci.left, right: ci.right, top: sq.top, bottom: ci.top, pattern: 'hatch' }],
    pills: [{ key: 'short', x: (ci.left + ci.right) / 2, y: sq.top - 14 * k, text: (Math.max(0, short) * k).toFixed(1), ok: short < 0.3 }],
    off: short >= 0.3,
    cut: (() => { const r = row.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, r: 6 * k }; })(),
    subject: { left: sq.left - 40 * k, right: ci.right + 40 * k, top: sq.top - 50 * k, bottom: sq.bottom + 40 * k },
  };
};

// #4 an icon beside words centres on the capitals, not the line box. A team drive's Activity panel: each row is an
// icon beside a title that may wrap, with when under it, so the row is built to the top (items-start), and every icon
// sits at the top of the line box, about 2.5px above the middle of its title's capitals. plumber nudges them down.
const ACTIVITY = [
  { Icon: UploadIcon, who: 'Mira', did: 'uploaded', what: 'Brand guidelines v3.pdf', where: 'Design', when: '4 min ago' },
  { Icon: MessageIcon, who: 'Theo', did: 'commented on', what: 'Launch timeline', where: 'Planning', when: '22 min ago' },
  { Icon: FolderIcon, who: 'Sana', did: 'moved 12 files to', what: 'Archive / 2025', where: 'Shared drive', when: '1 hr ago' },
  { Icon: UserIcon, who: 'Jonas', did: 'joined', what: 'Spring launch', where: 'Invited by Mira', when: '3 hr ago' },
];
function DriveActivity() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[28rem] rounded-card bg-surface shadow-card">
      <header className="flex items-baseline justify-between px-5 pt-3.5 pb-3">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Activity</span>
        <span className="text-[13px] text-ink-muted">Today</span>
      </header>
      <ul data-activity className="px-5">
        {ACTIVITY.map(({ Icon, who, did, what, where, when }) => (
          <li key={what} className="flex items-start gap-3 border-t-hairline border-line py-3.5">
            <Icon size={16} texture="dither" className="shrink-0 text-ink-muted" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm text-pretty text-ink-muted"><span className="font-medium text-ink">{who}</span> {did} <span className="font-medium text-ink">{what}</span></span>
              <span className="text-[13px] text-ink-subtle">{where} · {when}</span>
            </span>
          </li>
        ))}
      </ul>
      <footer className="border-t-hairline border-line px-5 pt-2 pb-3">
        <a href="#activity" className="text-[13px] font-medium text-accent hover:text-accent-deep">View all activity</a>
      </footer>
    </article>
  );
}
DriveActivity.stage = true;
DriveActivity.names = ['Line box', 'Cap height'];
DriveActivity.lesson = {
  why: 'A row built to the top puts the icon at the top of the first line’s box, but a line box holds room above the capitals and below the baseline. The eye reads the capitals, so the icon sits high beside every title.',
  habit: 'Centre an icon on the middle of the capitals beside it, not on the line box: in a row built to wrap, on the first line’s.',
};
// What the eye sees: in each row, the middle of the title's capitals and the middle of the icon, carried across as
// guides; the hatch is the gap between them. The pill is the first row's gap, in px.
DriveActivity.measure = (root) => {
  const list = root?.querySelector('[data-activity]');
  if (!list) return null;
  const k = list.getBoundingClientRect().width / list.offsetWidth || 1;
  const rules = [], bands = [];
  let first = null;
  [...list.children].forEach((li, i) => {
    const icon = li.querySelector('svg').getBoundingClientRect(), words = li.querySelector('span span'), r = document.createRange();
    r.selectNodeContents(words);
    const q = r.getClientRects()[0], s = getComputedStyle(words);
    ctx ??= document.createElement('canvas').getContext('2d');
    ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const m = ctx.measureText('H'), asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent, cap = m.actualBoundingBoxAscent;
    const capMid = q.top + ((q.height / k - (asc + desc)) / 2 + asc - cap / 2) * k, iconMid = icon.top + icon.height / 2;
    // the guides stay in the gutter and the gap: never across the words
    rules.push({ key: `cap${i}`, y: capMid, left: icon.left - 8 * k, right: q.left - 3 * k }, { key: `icon${i}`, y: iconMid, left: icon.left - 8 * k, right: icon.right + 3 * k });
    bands.push({ key: `gap${i}`, left: icon.left, right: icon.right, top: Math.min(capMid, iconMid), bottom: Math.max(capMid, iconMid), pattern: 'hatch' });
    first ??= { off: (iconMid - capMid) / k, x: icon.left + icon.width / 2, y: icon.top };
  });
  const lr = list.getBoundingClientRect();
  return {
    lines: [], rules, bands, off: Math.abs(first.off) > 1,
    pills: [{ key: 'off', x: first.x, y: first.y - 16 * k, text: (Math.abs(first.off) * k).toFixed(1), ok: Math.abs(first.off) <= 1 }],
    cut: { left: lr.left, right: lr.right, top: lr.top, bottom: lr.bottom },
    subject: { left: lr.left - 8 * k, right: lr.left + lr.width * 0.62, top: lr.top - 30 * k, bottom: lr.bottom },
  };
};

// #5 trim the text's leading. A team chat thread: message bubbles built as px-3.5 py-2 with 15px words on a 24px line.
// The line's leading adds itself to the padding above and below the letters, so the short replies look puffy, taller
// than their sides. plumber's fix trims the text box to the letters, so the padding is measured from them.
const THREAD = [
  { id: 1, me: false, text: 'Are we still on for the walkthrough at 3?' },
  { id: 2, me: true, text: 'Yes, finishing the last two slides now.' },
  { id: 3, me: false, text: 'Perfect, thanks!' },
  { id: 4, me: true, text: 'On my way' },
];
function ChatThread() {
  // Slate's primitives, with dithered icons
  return (
    <article className="flex w-full max-w-[26rem] flex-col overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-3 border-b-hairline border-line px-4 py-3">
        <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-positive-soft text-[13px] font-semibold text-positive">
          SO<span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-positive ring-2 ring-surface" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">Sana Okafor</span>
          <span className="text-xs text-ink-muted">Active now</span>
        </span>
        <button type="button" aria-label="Search this conversation" className="grid size-9 place-items-center rounded-control text-ink-muted hover:bg-sunken hover:text-ink"><SearchIcon size={18} texture="dither" /></button>
      </header>
      <div className="flex flex-col gap-1.5 px-4 pt-4 pb-5">
        <span className="self-center pb-2 text-xs text-ink-muted">Today, 2:41 pm</span>
        {THREAD.map((m) => (
          <p key={m.id} data-bubble={m.id} className={'max-w-[78%] rounded-[18px] px-3.5 py-2 text-[15px] leading-6 ' + (m.me ? 'self-end bg-accent text-accent-ink' : 'self-start bg-sunken')}>{m.text}</p>
        ))}
        <span className="self-end pt-0.5 text-xs text-ink-muted">Read 2:44 pm</span>
      </div>
      <footer className="flex items-center gap-2 border-t-hairline border-line px-3 py-2.5">
        <button type="button" aria-label="Attach a file" className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-sunken hover:text-ink"><PlusIcon size={18} texture="dither" /></button>
        <span className="flex h-9 min-w-0 flex-1 items-center rounded-full bg-sunken px-4 text-sm text-ink-subtle">Message Sana</span>
        <button type="button" aria-label="Send" className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink hover:bg-accent-deep"><SendIcon size={16} texture="dither" /></button>
      </footer>
    </article>
  );
}
ChatThread.stage = true;
ChatThread.names = ['Line box', 'Trimmed'];
ChatThread.lesson = {
  why: 'A 24px line around 15px letters puts about 3px of invisible leading above and below them, on top of the room every font keeps above its capitals. It adds itself to py-2, so a one-line bubble looks taller than it is wide.',
  habit: 'Measure padding from the letters: trim the text box to the capitals and the baseline (text-box: trim-both cap alphabetic), then set the padding you mean.',
};
// What the eye sees on a one-line reply: the bubble's padding, and the space the line adds between it and the letters
// (the hatch), above the capitals and below the baseline. The pill is that unseen space above, in px.
ChatThread.measure = (root) => {
  const b = root?.querySelector('[data-bubble="3"]');
  if (!b) return null;
  const br = b.getBoundingClientRect(), k = br.width / b.offsetWidth || 1, s = getComputedStyle(b);
  const r = document.createRange(); r.selectNodeContents(b); const q = r.getClientRects()[0];
  ctx ??= document.createElement('canvas').getContext('2d');
  ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const m = ctx.measureText('H'), asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent, cap = m.actualBoundingBoxAscent;
  const baseline = q.top + ((q.height / k - (asc + desc)) / 2 + asc) * k, capTop = baseline - cap * k;
  const top = br.top + parseFloat(s.paddingTop) * k, bottom = br.bottom - parseFloat(s.paddingBottom) * k, unseen = (capTop - top) / k;
  const left = br.left, right = br.right;
  return {
    lines: [],
    rules: [{ key: 'cap', y: capTop, left: left - 10 * k, right: right + 10 * k }, { key: 'base', y: baseline, left: left - 10 * k, right: right + 10 * k }],
    bands: [{ key: 'above', left, right, top, bottom: capTop, pattern: 'hatch' }, { key: 'below', left, right, top: baseline, bottom, pattern: 'hatch' }],
    pills: [{ key: 'unseen', x: right + 22 * k, y: (top + capTop) / 2, text: (Math.max(0, unseen) * k).toFixed(1), ok: unseen < 0.5 }],
    off: unseen >= 0.5,
    cut: { left: br.left, right: br.right, top: br.top, bottom: br.bottom, r: 18 * k },
    subject: { left: br.left - 40 * k, right: br.right + 60 * k, top: br.top - 50 * k, bottom: br.bottom + 50 * k },
  };
};

// #6 text of different sizes side by side shares a baseline. A fitness app's Today: a big figure with its unit beside
// it, in a row centred the default way (items-center). Centring lines up the middles of the two boxes, and boxes of
// different sizes keep their baselines at different heights, so every unit floats above its figure's baseline.
const STATS = [
  { Icon: BoltIcon, label: 'Active', value: '46', unit: 'min' },
  { Icon: PathIcon, label: 'Distance', value: '6.2', unit: 'km' },
  { Icon: HeartIcon, label: 'Resting', value: '58', unit: 'bpm' },
];
// a figure and its unit: one place in the code, at two sizes
const Reading = ({ value, unit, big }) => (
  <span data-reading className="flex items-center gap-1"><span className={big ? 'text-[44px] leading-none font-medium tracking-[-0.025em] tabular-nums' : 'text-[22px] leading-7 font-medium tracking-[-0.01em] tabular-nums'}>{value}</span><span className="text-[13px] leading-5 text-ink-muted">{unit}</span></span>
);
function FitnessToday() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[26rem] rounded-card bg-surface shadow-card">
      <div className="flex flex-col gap-5 p-6">
        <header className="flex items-baseline justify-between">
          <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Today</span>
          <span className="text-[13px] text-ink-muted">Thursday</span>
        </header>
        <div className="flex flex-col gap-3">
          <Reading value="8,421" unit="steps" big />
          <div className="flex flex-col gap-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="Steps toward today's goal" aria-valuenow={84} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full w-[84%] rounded-full bg-accent" />
            </div>
            <span className="text-[13px] text-ink-muted">84% of your 10,000 goal · 1,579 to go</span>
          </div>
        </div>
        <ul className="grid grid-cols-3 border-t-hairline border-line pt-4">
          {STATS.map(({ Icon, label, value, unit }) => (
            <li key={label} className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted"><Icon size={14} texture="dither" />{label}</span>
              <Reading value={value} unit={unit} />
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
FitnessToday.stage = true;
FitnessToday.names = ['Centred', 'Baseline'];
FitnessToday.lesson = {
  why: 'items-center lines up the middles of two boxes. A 44px figure and a 13px unit keep their baselines at very different heights in boxes that size, so the unit floats beside the figure instead of sitting on its line.',
  habit: 'Text of different sizes side by side sits on one baseline: items-baseline. Centre boxes, not words.',
};
// What the eye sees on the big reading: the figure's baseline and the unit's, carried across; the hatch is the gap.
// The pill is that gap, in px.
FitnessToday.measure = (root) => {
  const row = root?.querySelector('[data-reading]');
  if (!row) return null;
  const k = row.getBoundingClientRect().width / row.offsetWidth || 1;
  const base = (el) => {
    const s = getComputedStyle(el), r = document.createRange(); r.selectNodeContents(el); const q = r.getClientRects()[0];
    ctx ??= document.createElement('canvas').getContext('2d');
    ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const m = ctx.measureText('H');
    return { y: q.top + ((q.height / k - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent) * k, left: q.left, right: q.right };
  };
  const [fig, unit] = [...row.children].map(base), off = (fig.y - unit.y) / k;
  return {
    lines: [],
    rules: [{ key: 'fig', y: fig.y, left: fig.left - 8 * k, right: unit.right + 10 * k }, { key: 'unit', y: unit.y, left: unit.left - 4 * k, right: unit.right + 10 * k }],
    bands: [{ key: 'gap', left: unit.left, right: unit.right, top: Math.min(fig.y, unit.y), bottom: Math.max(fig.y, unit.y), pattern: 'hatch' }],
    pills: [{ key: 'off', x: unit.right + 26 * k, y: (fig.y + unit.y) / 2, text: (Math.abs(off) * k).toFixed(1), ok: Math.abs(off) <= 1 }],
    off: Math.abs(off) > 1,
    cut: (() => { const r = row.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, r: 4 * k }; })(),
    subject: { left: fig.left - 30 * k, right: unit.right + 70 * k, top: fig.y - 70 * k, bottom: fig.y + 40 * k },
  };
};

// #7 space inside a group is tighter than space between groups. A flight booking's passenger step: each field puts its
// label 10px above its input (gap-2.5, for room), but the fields sit only 8px apart, so every label is as near the input
// above it as its own. plumber's fix tightens each field to half the gap between them.
const PASSENGER = [
  { label: 'Full name, as on passport', value: 'Sana Okafor' },
  { label: 'Date of birth', value: '14 March 1991' },
  { label: 'Nationality', value: 'Portuguese' },
  { label: 'Passport number', value: 'CB 482 1907' },
];
function PassengerStep() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[25rem] rounded-card bg-surface shadow-card">
      <header className="flex flex-col gap-1 border-b-hairline border-line px-6 pt-5 pb-4">
        <span className="flex items-center gap-2 text-[13px] text-ink-muted">Lisbon<ArrowRightIcon size={14} texture="dither" />Copenhagen · Fri 14 Nov</span>
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Who’s flying?</span>
        <span className="text-[13px] text-ink-muted">Passenger 1 of 2 · adult</span>
      </header>
      <div data-fields className="flex flex-col gap-2 px-6 pt-5 pb-6">
        {PASSENGER.map((f) => (
          <label key={f.label} className="flex flex-col gap-2.5 text-[13px] font-medium text-ink-muted">
            {f.label}
            <span className="flex h-10 items-center rounded-control bg-surface px-3 text-sm font-normal text-ink ring-1 ring-line ring-inset">{f.value}</span>
          </label>
        ))}
      </div>
      <footer className="flex items-center justify-between gap-4 border-t-hairline border-line px-6 py-4">
        <span className="flex items-center gap-1.5 text-xs text-ink-muted"><LockIcon size={14} texture="dither" />Saved to your trip</span>
        <button type="button" className="h-10 rounded-control bg-accent px-4 text-sm font-medium text-accent-ink hover:bg-accent-deep">Continue to seats</button>
      </footer>
    </article>
  );
}
PassengerStep.stage = true;
PassengerStep.names = ['Even', 'Grouped'];
PassengerStep.lesson = {
  why: 'Each field puts 10px between its label and its input, but the fields are only 8px apart. Every label sits as near the input above it as its own, so the form reads as a stack of lines, not four questions.',
  habit: 'Space inside a group is always tighter than space between groups. Proximity is how people read what belongs together.',
};
// What the eye sees: the space inside each field (label to input) and between fields (input to the next label),
// hatched on the left gutter. The pill is the space inside, which should be the smaller.
PassengerStep.measure = (root) => {
  const list = root?.querySelector('[data-fields]');
  if (!list) return null;
  const k = list.getBoundingClientRect().width / list.offsetWidth || 1, fields = [...list.children];
  const bands = [], rules = [];
  let inner = 0, outer = Infinity;
  fields.forEach((f, i) => {
    const words = document.createRange(); words.selectNodeContents(f.firstChild);
    const lb = words.getBoundingClientRect(), box = f.lastElementChild.getBoundingClientRect();
    bands.push({ key: `in${i}`, left: box.left - 14 * k, right: box.left - 4 * k, top: lb.bottom, bottom: box.top, pattern: 'hatch' });
    rules.push({ key: `lb${i}`, y: lb.bottom, left: box.left - 16 * k, right: lb.right + 6 * k }, { key: `bx${i}`, y: box.top, left: box.left - 16 * k, right: box.left + 40 * k });
    inner = Math.max(inner, (box.top - lb.bottom) / k);
    const next = fields[i + 1];
    if (next) { const n = document.createRange(); n.selectNodeContents(next.firstChild); outer = Math.min(outer, (n.getBoundingClientRect().top - box.bottom) / k); }
  });
  const ok = inner < outer - 0.5, lr = list.getBoundingClientRect(), first = bands[0];
  return {
    lines: [], rules, bands, off: !ok,
    pills: [{ key: 'inner', x: first.left - 18 * k, y: (first.top + first.bottom) / 2, text: (inner * k).toFixed(1), ok }],
    cut: { left: lr.left, right: lr.right, top: lr.top, bottom: lr.bottom },
    subject: { left: lr.left - 30 * k, right: lr.left + lr.width * 0.6, top: lr.top - 10 * k, bottom: lr.top + lr.height * 0.62 },
  };
};

// #8 nested corners are concentric: inner radius = outer radius − the padding between them. A music app's Recently
// played: each tile is a 14px card with 8px of padding, and its cover art keeps the card's own 14px corner, so the two
// curves run side by side at different rates and the gap between them pinches at every corner. plumber's fix: 6px.
// real photos as cover art (src/media, credited in src/media/CREDITS.md)
const ALBUMS = [
  { title: 'Low Tide', artist: 'Marina Avila', cover: lowTide },
  { title: 'Paper Cities', artist: 'The Lanterns', cover: paperCities },
  { title: 'Afterglow', artist: 'Kaito Ren', cover: afterglow },
];
function RecentlyPlayed() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[30rem] rounded-card bg-surface shadow-card">
      <header className="flex items-baseline justify-between px-5 pt-4 pb-3">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Recently played</span>
        <a href="#history" className="-my-1 inline-flex min-h-6 items-center text-[13px] font-medium text-accent hover:text-accent-deep">See all</a>
      </header>
      <ul data-albums className="grid grid-cols-3 gap-3 px-5">
        {ALBUMS.map((a) => (
          <li key={a.title}>
            <button type="button" data-tile className="flex w-full flex-col gap-2 rounded-sheet bg-sunken p-2 text-left hover:bg-line/40">
              <span data-cover className="block overflow-hidden rounded-sheet">
                <img src={a.cover} alt="" width="240" height="240" className="block aspect-square w-full object-cover outline-1 -outline-offset-1 outline-ink/10" />
              </span>
              <span className="flex flex-col px-0.5 pb-0.5">
                <span className="truncate text-[13px] font-medium">{a.title}</span>
                <span className="truncate text-xs text-ink-muted">{a.artist}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <footer className="mt-4 flex items-center gap-3 border-t-hairline border-line px-5 py-3">
        <HeadphonesIcon size={16} texture="dither" className="shrink-0 text-ink-muted" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-medium">Low Tide · Marina Avila</span>
          <span className="mt-1.5 h-1 overflow-hidden rounded-full bg-sunken"><span className="block h-full w-2/5 rounded-full bg-ink" /></span>
        </span>
        <button type="button" aria-label="Pause" className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-surface hover:bg-ink/85"><PauseIcon size={16} texture="solid" /></button>
      </footer>
    </article>
  );
}
RecentlyPlayed.stage = true;
RecentlyPlayed.names = ['Same radius', 'Concentric'];
RecentlyPlayed.lesson = {
  why: 'The cover keeps the tile’s 14px corner but sits 8px inside it, so the two curves run side by side at different rates: the gap between them is 8px along the sides and pinches at the corner.',
  habit: 'Inner radius = outer radius − everything between them, padding and border. Here 14 − 8 = 6, at every level of nesting.',
};
// What the eye sees at the first tile's corner: the tile's edges and the cover's, and the padding between them (the
// hatch). The pill is how far the cover's corner is from concentric (its radius against 14 − 8), in px.
RecentlyPlayed.measure = (root) => {
  const tile = root?.querySelector('[data-tile]'), cover = tile?.querySelector('[data-cover]');
  if (!cover) return null;
  const t = tile.getBoundingClientRect(), c = cover.getBoundingClientRect(), k = t.width / tile.offsetWidth || 1;
  const R = parseFloat(getComputedStyle(tile).borderTopLeftRadius), r = parseFloat(getComputedStyle(cover).borderTopLeftRadius), p = (c.left - t.left) / k;
  const off = Math.abs(r - Math.max(0, R - p)), span = 34 * k;
  return {
    lines: [{ key: 'tile', x: t.left, top: t.top, bottom: t.top + span }, { key: 'cover', x: c.left, top: c.top, bottom: c.top + span }],
    rules: [{ key: 'tile-top', y: t.top, left: t.left, right: t.left + span }, { key: 'cover-top', y: c.top, left: c.left, right: c.left + span }],
    bands: [{ key: 'pad', left: t.left, right: c.left, top: t.top, bottom: t.top + span, pattern: 'hatch' }, { key: 'pad-top', left: c.left, right: t.left + span, top: t.top, bottom: c.top, pattern: 'hatch' }],
    pills: [{ key: 'off', x: t.left + span + 18 * k, y: t.top - 10 * k, text: (off * k).toFixed(1), ok: off <= 1.5 }],
    off: off > 1.5,
    cut: { left: t.left, right: t.right, top: t.top, bottom: t.bottom, r: R * k },
    subject: { left: t.left - 30 * k, right: t.left + 90 * k, top: t.top - 30 * k, bottom: t.top + 80 * k },
  };
};

// #9 equal padding isn't equal. A code review tool's pull request header: the two review buttons are p-2, the same 8px
// on every side, copied from the icon buttons beside them. Words are wide and short, so the labels look squeezed from
// the sides. plumber's fix: twice the padding across as up and down.
const ReviewButton = ({ primary, children }) => (
  <button type="button" data-review className={'rounded-control p-2 text-sm leading-4 font-medium ' + (primary ? 'bg-accent text-accent-ink hover:bg-accent-deep' : 'bg-surface text-ink ring-1 ring-line ring-inset hover:bg-sunken')}>{children}</button>
);
function PullRequest() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[34rem] rounded-card bg-surface shadow-card">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 text-[13px] text-ink-muted">
            <span className="inline-flex h-5 items-center gap-1 rounded-full bg-positive-soft px-2 text-xs font-medium text-positive ring-1 ring-positive/15 ring-inset">Open</span>
            <span className="font-mono text-xs">mira/retry-queue → main</span>
          </span>
          <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Fix the flaky retry in the upload queue <span className="font-normal text-ink-muted">#482</span></span>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-ink-muted">
          <span className="flex items-center gap-1.5"><CheckIcon size={14} texture="dither" className="text-positive" />All checks passed</span>
          <span className="flex items-center gap-1.5"><FileIcon size={14} texture="dither" />3 files</span>
          <span className="font-mono text-xs"><span className="text-positive">+48</span> <span className="text-negative">−12</span></span>
        </div>
        <div className="flex items-center gap-3 border-t-hairline border-line pt-4">
          <span className="flex -space-x-1.5" aria-label="Reviewers: Theo and Sana">
            {[['T', 'bg-accent-soft text-accent-deep'], ['S', 'bg-positive-soft text-positive']].map(([l, c]) => <span key={l} className={'grid size-7 place-items-center rounded-full text-xs font-semibold ring-2 ring-surface ' + c}>{l}</span>)}
          </span>
          <span className="text-[13px] text-ink-muted">Theo asked for your review</span>
          <span className="ml-auto flex items-center gap-2">
            <ReviewButton>Request changes</ReviewButton>
            <ReviewButton primary>Approve</ReviewButton>
          </span>
        </div>
      </div>
    </article>
  );
}
PullRequest.stage = true;
PullRequest.names = ['Equal', 'Wider sides'];
PullRequest.lesson = {
  why: 'Words are wide and short. With the same 8px on every side, the label looks squeezed from the sides and the button looks taller than it is wide, a square box around a long word.',
  habit: 'Text buttons take about twice as much padding across as up and down; only icon buttons are square.',
};
// What the eye sees on Approve: its padding, hatched on all four sides. The pill is the padding across, which wants to
// be about twice the padding up and down.
PullRequest.measure = (root) => {
  const b = [...(root?.querySelectorAll('[data-review]') ?? [])].at(-1);
  if (!b) return null;
  const r = b.getBoundingClientRect(), k = r.width / b.offsetWidth || 1, s = getComputedStyle(b);
  const [pt, pr, pb, pl] = ['Top', 'Right', 'Bottom', 'Left'].map((side) => parseFloat(s[`padding${side}`]));
  const ok = pl >= pt * 1.75;
  return {
    lines: [], off: !ok,
    bands: [
      { key: 'l', left: r.left, right: r.left + pl * k, top: r.top, bottom: r.bottom, pattern: 'hatch' },
      { key: 'r', left: r.right - pr * k, right: r.right, top: r.top, bottom: r.bottom, pattern: 'hatch' },
      { key: 't', left: r.left + pl * k, right: r.right - pr * k, top: r.top, bottom: r.top + pt * k, pattern: 'hatch' },
      { key: 'b', left: r.left + pl * k, right: r.right - pr * k, top: r.bottom - pb * k, bottom: r.bottom, pattern: 'hatch' },
    ],
    pills: [{ key: 'across', x: (r.left + r.right) / 2, y: r.top - 14 * k, text: (pl * k).toFixed(1), ok }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, r: 6 * k },
    subject: { left: r.left - 150 * k, right: r.right + 30 * k, top: r.top - 50 * k, bottom: r.bottom + 40 * k },
  };
};

// #10 the icon side of a button gets less padding. A calendar's week: the New event button has a + icon before its
// words and the same 16px on both sides. An icon's glyph box carries space of its own, so the icon side looks looser
// and the label reads off-centre. plumber takes 4px off the icon side.
const WEEK = [
  { day: 'Mon', date: 9, events: [{ at: '9:30', what: 'Standup', tone: 'bg-accent-soft text-accent-deep' }] },
  { day: 'Tue', date: 10, events: [{ at: '11:00', what: 'Design review', tone: 'bg-positive-soft text-positive' }, { at: '15:00', what: '1:1 Mira', tone: 'bg-accent-soft text-accent-deep' }] },
  { day: 'Wed', date: 11, today: true, events: [{ at: '10:00', what: 'Launch sync', tone: 'bg-caution-soft text-caution' }] },
  { day: 'Thu', date: 12, events: [{ at: '14:30', what: 'Hiring panel', tone: 'bg-positive-soft text-positive' }] },
  { day: 'Fri', date: 13, events: [] },
];
function CalendarWeek() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[34rem] rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-2 border-b-hairline border-line px-5 py-3">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">November 2026</span>
        <span className="ml-1 flex items-center">
          <button type="button" aria-label="Previous week" className="grid size-8 place-items-center rounded-control text-ink-muted hover:bg-sunken hover:text-ink"><ArrowLeftIcon size={16} texture="dither" /></button>
          <button type="button" aria-label="Next week" className="grid size-8 place-items-center rounded-control text-ink-muted hover:bg-sunken hover:text-ink"><ArrowRightIcon size={16} texture="dither" /></button>
        </span>
        <button type="button" data-new className="ml-auto flex items-center gap-1.5 rounded-control bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink/85"><PlusIcon size={16} texture="dither" />New event</button>
      </header>
      <div className="grid grid-cols-5 divide-x divide-line">
        {WEEK.map((d) => (
          <div key={d.day} className="flex min-h-40 flex-col gap-1.5 p-2">
            <span className="flex items-baseline gap-1 px-1 text-xs text-ink-muted">{d.day}<span className={'tabular-nums ' + (d.today ? 'font-semibold text-accent' : 'text-ink')}>{d.date}</span></span>
            {d.events.map((e) => <span key={e.what} className={'flex flex-col rounded-chip px-1.5 py-1 text-xs ' + e.tone}><span className="font-medium">{e.what}</span><span className="tabular-nums">{e.at}</span></span>)}
          </div>
        ))}
      </div>
    </article>
  );
}
CalendarWeek.stage = true;
CalendarWeek.names = ['Even', 'Icon side lighter'];
CalendarWeek.lesson = {
  why: 'An icon’s glyph box carries space of its own around the drawing. With the same 16px on both sides, the icon side looks looser than the text side and the whole label reads off-centre.',
  habit: 'On the side with the icon, take 2–4px of padding off.',
};
// What the eye sees: the button's padding on the icon side and on the text side, hatched. The pill is how much more
// the icon side has than the text side (it should have less).
CalendarWeek.measure = (root) => {
  const b = root?.querySelector('[data-new]');
  if (!b) return null;
  const r = b.getBoundingClientRect(), k = r.width / b.offsetWidth || 1, s = getComputedStyle(b);
  const pl = parseFloat(s.paddingLeft), pr = parseFloat(s.paddingRight), extra = pl - pr + 1;
  return {
    lines: [], off: extra > 0,
    bands: [
      { key: 'icon', left: r.left, right: r.left + pl * k, top: r.top, bottom: r.bottom, pattern: 'hatch' },
      { key: 'text', left: r.right - pr * k, right: r.right, top: r.top, bottom: r.bottom, pattern: 'hatch' },
    ],
    pills: [{ key: 'icon', x: r.left + (pl * k) / 2, y: r.top - 14 * k, text: (pl * k).toFixed(1), ok: extra <= 0 }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, r: 6 * k },
    subject: { left: r.left - 60 * k, right: r.right + 30 * k, top: r.top - 40 * k, bottom: r.bottom + 60 * k },
  };
};

// #12 vertical rhythm: every stack keeps to the gaps the page keeps to. A team mail app's notification settings: rows
// are 12px apart in every section but one, which was built on its own with gap-2, so its rows bunch 8px apart and the
// page loses its beat. plumber brings it back to the page's 12px.
const NOTIFY = [
  { Icon: MailIcon, name: 'Email', gap: 'gap-3', rows: [['Daily digest', 'What you missed, at 8am', true], ['Replies to your threads', 'When someone answers you', true], ['Weekly summary', 'Mondays, your team at a glance', false]] },
  { Icon: MessageIcon, name: 'Mentions', gap: 'gap-2', rows: [['@you', 'When someone mentions you by name', true], ['@channel', 'When a whole channel is called', false], ['Keywords', '“launch”, “review”, “urgent”', true]] },
  { Icon: BellIcon, name: 'Push', gap: 'gap-3', rows: [['Direct messages', 'On your phone and desktop', true], ['Channel activity', 'Only channels you star', false], ['Reminders', 'The ones you set yourself', true]] },
  { Icon: HistoryIcon, name: 'Calendar', gap: 'gap-3', rows: [['Invitations', 'New events and changes', true], ['Starting soon', '10 minutes before', true], ['Declines', 'When someone can’t make it', false]] },
  { Icon: LockIcon, name: 'Security', gap: 'gap-3', rows: [['New sign-in', 'From a device we haven’t seen', true], ['Password changed', 'Always on', true], ['Apps connected', 'When an app gets access', true]] },
];
const Switch = ({ on }) => (
  <button type="button" role="switch" aria-checked={on} className={'relative h-6 w-10 shrink-0 rounded-full transition-colors ' + (on ? 'bg-accent' : 'bg-line')}>
    <span className={'absolute top-0.5 left-0.5 size-5 rounded-full bg-surface shadow-raised transition-transform ' + (on ? 'translate-x-4' : '')} />
  </button>
);
function NotificationSettings() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[28rem] rounded-card bg-surface shadow-card">
      <header className="flex flex-col gap-0.5 border-b-hairline border-line px-6 pt-5 pb-4">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Notifications</span>
        <span className="text-[13px] text-ink-muted">Choose what reaches you, and where.</span>
      </header>
      <div className="flex flex-col gap-8 px-6 pt-5 pb-6">
        {NOTIFY.map(({ Icon, name, gap, rows }) => (
          <section key={name} className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-xs font-medium text-ink-muted"><Icon size={14} texture="dither" />{name}</h3>
            <ul data-rows={name} className={'flex flex-col ' + gap}>
              {rows.map(([title, detail, on]) => (
                <li key={title} className="flex items-center justify-between gap-4">
                  <span className="flex min-w-0 flex-col"><span className="text-sm font-medium">{title}</span><span className="truncate text-[13px] text-ink-muted">{detail}</span></span>
                  <Switch on={on} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
NotificationSettings.stage = true;
NotificationSettings.names = ['One-off gap', 'On the rhythm'];
NotificationSettings.lesson = {
  why: 'Every section keeps its rows 12px apart except Mentions, built on its own with 8px. The eye reads spacing as structure, so that section looks like a different kind of list and the page loses its beat.',
  habit: 'Keep a page to a few gaps and reuse them: the same kind of stack gets the same gap everywhere.',
};
// What the eye sees: the gaps between rows in the Email section and in Mentions, hatched in the gutter. The pill is how
// far Mentions' gap is off the page's.
NotificationSettings.measure = (root) => {
  const odd = root?.querySelector('[data-rows="Mentions"]'), even = root?.querySelector('[data-rows="Email"]');
  if (!odd || !even) return null;
  const k = odd.getBoundingClientRect().width / odd.offsetWidth || 1, bands = [];
  const gaps = (list, key) => [...list.children].slice(0, -1).map((li, i) => {
    const a = li.getBoundingClientRect(), b = li.nextElementSibling.getBoundingClientRect();
    bands.push({ key: `${key}${i}`, left: a.left - 14 * k, right: a.left - 4 * k, top: a.bottom, bottom: b.top, pattern: 'hatch' });
    return (b.top - a.bottom) / k;
  });
  const g = gaps(odd, 'm')[0], base = gaps(even, 'p')[0], off = g - base, r = odd.getBoundingClientRect(), top = even.getBoundingClientRect().top;
  return {
    lines: [], bands, off: Math.abs(off) > 2,
    pills: [{ key: 'off', x: bands.find((b) => b.key === 'm0').left - 16 * k, y: (bands.find((b) => b.key === 'm0').top + bands.find((b) => b.key === 'm0').bottom) / 2, text: (Math.abs(off) * k).toFixed(1), ok: Math.abs(off) <= 2 }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
    subject: { left: r.left - 30 * k, right: r.left + r.width * 0.7, top: top - 20 * k, bottom: r.bottom + 10 * k },
  };
};

// #13 45–75 characters per line. A help centre article in a docs product: the body runs the width of the reading pane,
// about 94 characters a line, so the eye loses its place on the way back to the next line. plumber caps it at a measure.
const HELP = [
  'Two-step sign-in asks for a second proof that it’s really you, a code from an authenticator app on your phone, each time you sign in on a new device. Even if someone learns your password, they can’t get into your account without your phone in their hand as well.',
  'Open Settings, choose Security, and select Turn on beside Two-step sign-in. Scan the code with your authenticator app, then type the six digits it shows to confirm. Save your backup codes somewhere safe: they let you in if you ever lose your phone.',
];
function HelpArticle() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full rounded-card bg-surface shadow-card">
      <div className="flex flex-col gap-4 px-8 pt-7 pb-8">
        <span className="flex items-center gap-2 text-[13px] text-ink-muted"><BookIcon size={14} texture="dither" />Help centre · Security</span>
        <h2 className="text-2xl leading-8 font-semibold tracking-[-0.015em] text-balance">Turn on two-step sign-in</h2>
        <div data-body className="flex flex-col gap-3">
          {HELP.map((t) => <p key={t.slice(0, 12)} className="text-[15px] leading-7 text-pretty">{t}</p>)}
        </div>
      </div>
    </article>
  );
}
HelpArticle.stage = true;
HelpArticle.names = ['Full width', 'A measure'];
HelpArticle.lesson = {
  why: 'At about 94 characters a line, the eye’s return sweep to the start of the next line is long enough to land on the wrong one. Readers slow down, reread, or skim.',
  habit: 'Keep running text to 45–75 characters a line: cap paragraphs with a measure (max-width in ch), however wide the pane.',
};
// What the eye sees: each paragraph's lines, from the first letter to the last, and what runs past the 75th character
// (the hatch). The pill is the characters actually on the first line, counted from the text itself.
function firstLine(p) {
  const t = p.firstChild, r = document.createRange();
  let top = null, n = 0, cut = null;
  for (let i = 0; i < t.length; i++) {
    r.setStart(t, i); r.setEnd(t, i + 1);
    const q = r.getClientRects()[0];
    if (!q) continue;
    top ??= q.top;
    if (q.top > top + q.height / 2) break;
    n = i + 1;
    if (i === 74) cut = q.right;
  }
  return { chars: n, cut };
}
HelpArticle.measure = (root) => {
  const ps = [...(root?.querySelectorAll('[data-body] p') ?? [])];
  if (!ps.length) return null;
  const k = ps[0].getBoundingClientRect().width / ps[0].offsetWidth || 1, lines = [], bands = [];
  const reads = ps.map((p, i) => {
    const r = p.getBoundingClientRect(), f = firstLine(p);
    lines.push({ key: `start${i}`, x: r.left, top: r.top, bottom: r.bottom }, { key: `end${i}`, x: r.right, top: r.top, bottom: r.bottom });
    bands.push({ key: `over${i}`, left: f.cut ?? r.right, right: r.right, top: r.top, bottom: r.bottom, pattern: 'hatch' });
    return f.chars;
  });
  const r0 = ps[0].getBoundingClientRect(), most = Math.max(...reads), body = root.querySelector('[data-body]').getBoundingClientRect();
  return {
    lines, bands, off: most > 75,
    pills: [{ key: 'chars', x: r0.right, y: r0.top - 12 * k, text: String(most * k), ok: most <= 75 }],
    cut: { left: body.left, right: body.right, top: body.top, bottom: body.bottom },
    subject: { left: body.left - 20 * k, right: body.right + 20 * k, top: body.top - 30 * k, bottom: body.bottom + 20 * k },
  };
};

// #14 line height shrinks as size grows. A podcast app's episode page: the 40px title keeps the 1.5 line height that
// suits body text, so its two lines float apart. plumber tightens it to a display leading.
function EpisodePage() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[34rem] rounded-card bg-surface shadow-card">
      <div className="flex flex-col gap-5 p-7">
        <span className="flex items-center gap-2 text-[13px] text-ink-muted"><HeadphonesIcon size={14} texture="dither" />Small Studios · Episode 42 · 38 min</span>
        <h2 data-title className="text-[40px] leading-[1.5] font-semibold tracking-[-0.025em] text-balance">How small teams ship big launches</h2>
        <p className="text-[15px] leading-6 text-ink-muted text-pretty">Mira Avila on cutting scope without cutting quality, and the one checklist her studio never skips.</p>
        <div className="flex items-center gap-3">
          <button type="button" className="flex h-10 items-center gap-2 rounded-full bg-accent pr-5 pl-4 text-sm font-medium text-accent-ink hover:bg-accent-deep"><PlayIcon size={16} texture="solid" />Play episode</button>
          <button type="button" aria-label="Save episode" className="grid size-10 place-items-center rounded-full text-ink-muted ring-1 ring-line ring-inset hover:bg-sunken hover:text-ink"><HeartIcon size={18} texture="dither" /></button>
        </div>
      </div>
    </article>
  );
}
EpisodePage.stage = true;
EpisodePage.names = ['Body leading', 'Display leading'];
EpisodePage.lesson = {
  why: 'Line height is a ratio of the type size. At 40px, 1.5 puts 20px of air between the lines, so the title’s two lines read as two separate lines rather than one heading.',
  habit: 'Line height shrinks as size grows: about 1.5 for body text, 1.1–1.25 for display sizes.',
};
// What the eye sees: the title's two lines, their baselines and the air between them (the hatch). The pill is the line
// height as a ratio of the size.
EpisodePage.measure = (root) => {
  const h = root?.querySelector('[data-title]');
  if (!h) return null;
  const r = h.getBoundingClientRect(), k = r.width / h.offsetWidth || 1, s = getComputedStyle(h), lh = parseFloat(s.lineHeight), fs = parseFloat(s.fontSize);
  const range = document.createRange(); range.selectNodeContents(h);
  const rows = [...range.getClientRects()].reduce((a, q) => (a.some((x) => Math.abs(x.top - q.top) < 4) ? a : [...a, q]), []);
  const ratio = lh / fs, bands = [], rules = [];
  ctx ??= document.createElement('canvas').getContext('2d');
  ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const m = ctx.measureText('H'), cap = m.actualBoundingBoxAscent * k, half = ((lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2) * k;
  rows.forEach((q, i) => {
    const base = q.top + half + m.fontBoundingBoxAscent * k;
    rules.push({ key: `base${i}`, y: base, left: r.left - 10 * k, right: r.left + 160 * k }, { key: `cap${i}`, y: base - cap, left: r.left - 10 * k, right: r.left + 160 * k });
    if (rows[i + 1]) bands.push({ key: `air${i}`, left: r.left - 10 * k, right: r.left + 160 * k, top: base + 6 * k, bottom: rows[i + 1].top + half + m.fontBoundingBoxAscent * k - cap, pattern: 'hatch' });
  });
  return {
    lines: [], rules, bands, off: ratio > 1.4,
    pills: [{ key: 'ratio', x: r.left + 190 * k, y: r.top + 10 * k, text: (ratio * k).toFixed(2), ok: ratio <= 1.3 }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
    subject: { left: r.left - 30 * k, right: r.left + 360 * k, top: r.top - 40 * k, bottom: r.bottom + 30 * k },
  };
};

export const EXAMPLES = { 7: PassengerStep, 8: RecentlyPlayed, 9: PullRequest, 10: CalendarWeek, 1: ClientProfile, 2: InvoiceWalkthrough, 3: Whiteboard, 4: DriveActivity, 5: ChatThread, 6: FitnessToday, 12: NotificationSettings, 13: HelpArticle, 14: EpisodePage, 16: Timesheet };

