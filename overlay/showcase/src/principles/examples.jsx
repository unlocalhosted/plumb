// One example per principle, each a small scene from a real product, drawn with care: real content, quiet colour,
// soft depth. Each takes `broken` and is wrong in exactly one way, the principle's; everything else on it is right, so
// plumber, scoped to it, finds one thing. `measure` (optional) says where the eye sees the harm, for the ticks drawn
// over the example; it reads the page, it never decides what is wrong (plumber does).
import { useEffect, useState } from 'react';
import { ArrowRightIcon, BoltIcon, FolderIcon, HeadphonesIcon, HeartIcon, HistoryIcon, LayersIcon, MessageIcon, PathIcon, PauseIcon, PlusIcon, SearchIcon, SendIcon, SparklesIcon, UploadIcon, UserIcon } from '@unlocalhosted/dither-icons';
import lowTide from '../media/low-tide.jpg';
import paperCities from '../media/paper-cities.jpg';
import afterglow from '../media/afterglow.jpg';

// one canvas for reading font metrics, shared by the measures below
let ctx;

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

// #15 small capitals need tracking. An issue tracker's table: its column labels are 11px capitals with no letter
// spacing. Capitals are drawn to sit beside lowercase; set alone and small, they crowd into each other. plumber opens
// them to 0.06em.
const ISSUES = [
  { id: 'PLM-214', title: 'Upload queue retries forever on a 413', who: 'Mira', state: 'In review', tone: 'bg-accent-soft text-accent-deep', updated: '2h' },
  { id: 'PLM-209', title: 'Dark mode loses focus rings in menus', who: 'Theo', state: 'In progress', tone: 'bg-caution-soft text-caution', updated: '5h' },
  { id: 'PLM-198', title: 'Search ignores accents in names', who: 'Sana', state: 'Done', tone: 'bg-positive-soft text-positive', updated: '1d' },
];
function IssueTable() {
  // Slate's primitives, with dithered icons
  const head = ['Issue', 'Assignee', 'Status', 'Updated'];
  return (
    <article className="w-full max-w-[36rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-baseline gap-2 px-5 pt-4 pb-3">
        <LayersIcon size={16} texture="dither" className="translate-y-0.5 self-center text-ink-muted" />
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Upload pipeline</span>
        <span className="ml-auto text-[13px] text-ink-muted">3 open</span>
      </header>
      <table className="w-full table-fixed text-left text-sm">
        <colgroup><col /><col className="w-24" /><col className="w-28" /><col className="w-20" /></colgroup>
        <thead><tr className="border-y-hairline border-line bg-sunken/60">
          {head.map((h, i) => <th key={h} data-label scope="col" className={'py-2 text-[11px] font-semibold text-ink-muted uppercase ' + (i === 0 ? 'pl-5' : i === 3 ? 'pr-5 text-right' : '')}>{h}</th>)}
        </tr></thead>
        <tbody>
          {ISSUES.map((r) => (
            <tr key={r.id} className="border-b-hairline border-line last:border-0">
              <td className="py-3 pl-5"><span className="flex min-w-0 flex-col"><span className="truncate font-medium">{r.title}</span><span className="case-forms font-mono text-xs text-ink-muted">{r.id}</span></span></td>
              <td className="py-3">{r.who}</td>
              <td className="py-3"><span className={'inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ' + r.tone}>{r.state}</span></td>
              <td className="py-3 pr-5 text-right text-ink-muted tabular-nums">{r.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
IssueTable.stage = true;
IssueTable.names = ['Untracked', 'Tracked'];
IssueTable.lesson = {
  why: 'Capitals are spaced to sit beside lowercase letters, which carry most of a line’s white space. Set alone, small and bold, they have nothing between them: the letters touch at a glance and the label reads as a smudge.',
  habit: 'Small capitals get 0.05–0.1em of letter spacing; big display type gets tighter instead.',
};
// What the eye sees in "Assignee": the space between each pair of capitals, hatched. The pill is the letter spacing,
// in hundredths of an em.
IssueTable.measure = (root) => {
  const th = [...(root?.querySelectorAll('[data-label]') ?? [])][1];
  if (!th) return null;
  const t = th.firstChild, k = th.getBoundingClientRect().width / th.offsetWidth || 1, range = document.createRange(), boxes = [];
  for (let i = 0; i < t.length; i++) { range.setStart(t, i); range.setEnd(t, i + 1); boxes.push(range.getBoundingClientRect()); }
  const bands = [], lines = [];
  boxes.forEach((b, i) => {
    lines.push({ key: `l${i}`, x: b.left, top: b.top + b.height * 0.2, bottom: b.bottom - b.height * 0.2 });
    if (boxes[i + 1]) bands.push({ key: `g${i}`, left: b.right - 0.5 * k, right: boxes[i + 1].left + 0.5 * k, top: b.top + b.height * 0.25, bottom: b.bottom - b.height * 0.25, pattern: 'hatch' });
  });
  const s = getComputedStyle(th), em = (s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing)) / parseFloat(s.fontSize);
  const first = boxes[0], last = boxes.at(-1);
  return {
    lines, bands, off: em < 0.04,
    pills: [{ key: 'em', x: (first.left + last.right) / 2, y: first.top - 12 * k, text: (em * 100 * k).toFixed(0), ok: em >= 0.04 }],
    cut: { left: first.left - 4 * k, right: last.right + 4 * k, top: first.top - 2 * k, bottom: first.bottom + 2 * k },
    subject: { left: first.left - 40 * k, right: last.right + 60 * k, top: first.top - 40 * k, bottom: first.bottom + 50 * k },
  };
};

// #18 no widows in headings. A news reader's front page: headlines wrap where they run out of room, so a story's last
// word often sits alone on its own line, a widow, and the heading's shape breaks. plumber balances the lines.
const STORIES = [
  { kicker: 'Science', head: 'Northern lights reach farther south than any year since records began', meta: 'The Ledger · 6 min' },
  { kicker: 'Cities', head: 'Lisbon turns three of its busiest streets over to bicycles and trams', meta: 'Metro Weekly · 4 min' },
];
function NewsFront() {
  // Slate's primitives, with dithered icons and real photos
  return (
    <article className="w-full max-w-[34rem] rounded-card bg-surface shadow-card">
      <header className="flex items-baseline justify-between px-6 pt-5 pb-1">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Today</span>
        <span className="text-[13px] text-ink-muted">Wednesday, 4 November</span>
      </header>
      <ul className="flex flex-col px-6 pb-2">
        {STORIES.map((st, i) => (
          <li key={st.head} className="flex gap-4 border-b-hairline border-line py-4 last:border-0">
            <img src={i ? paperCities : lowTide} alt="" width="96" height="96" className="size-24 shrink-0 rounded-control object-cover outline-1 -outline-offset-1 outline-ink/10" />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-medium text-accent">{st.kicker}</span>
              <h3 data-head className="text-[19px] leading-6 font-semibold tracking-[-0.01em]">{st.head}</h3>
              <span className="text-[13px] text-ink-muted">{st.meta}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
NewsFront.stage = true;
NewsFront.names = ['Greedy', 'Balanced'];
NewsFront.lesson = {
  why: 'A browser fills each line as far as it can and carries over whatever is left, so a heading’s last word often ends up alone. One short word under two full lines reads as a mistake, and the heading loses its shape.',
  habit: 'Headings get text-wrap: balance (even lines); paragraphs get text-wrap: pretty (no lone last word).',
};
// What the eye sees on the first headline: each line's length, as a band under it. The pill is the last line's length
// as a share of the longest.
NewsFront.measure = (root) => {
  const h = root?.querySelector('[data-head]');
  if (!h) return null;
  const k = h.getBoundingClientRect().width / h.offsetWidth || 1, range = document.createRange();
  range.selectNodeContents(h);
  const rows = [];
  for (const q of range.getClientRects()) { const row = rows.find((r) => Math.abs(r.top - q.top) < 4); if (row) { row.left = Math.min(row.left, q.left); row.right = Math.max(row.right, q.right); } else rows.push({ top: q.top, bottom: q.bottom, left: q.left, right: q.right }); }
  rows.sort((a, b) => a.top - b.top);
  const widths = rows.map((r) => r.right - r.left), share = widths.at(-1) / Math.max(...widths);
  const r = h.getBoundingClientRect();
  return {
    lines: [], off: share < 0.5,
    bands: rows.map((row, i) => ({ key: `row${i}`, left: row.left, right: row.right, top: row.bottom - 3 * k, bottom: row.bottom, pattern: 'hatch' })),
    pills: [{ key: 'share', x: r.right + 18 * k, y: rows.at(-1).top + 8 * k, text: String(Math.round(share * 100) * k), ok: share >= 0.5 }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
    subject: { left: r.left - 30 * k, right: r.right + 50 * k, top: r.top - 40 * k, bottom: r.bottom + 30 * k },
  };
};

// #45 hanging punctuation. A magazine's long read with a pull quote: the opening quote mark sits on the column edge
// and pushes the quote's first line in by its own width, so the quote's words don't line up with the text around them.
// plumber hangs the mark in the margin, measured from the mark itself.
function LongRead() {
  // Slate's primitives, with a real photo
  return (
    <article className="w-full max-w-[34rem] overflow-hidden rounded-card bg-surface shadow-card">
      <img src={afterglow} alt="" width="544" height="160" className="h-40 w-full object-cover" />
      <div data-column className="flex flex-col gap-4 px-8 pt-6 pb-8">
        <span className="text-xs font-medium text-accent">Culture · Long read</span>
        <p className="text-[15px] leading-7 text-pretty">By the third night the studio had stopped arguing about the sign. Kaito Ren wanted it pink; the landlord wanted it gone.</p>
        <blockquote data-quote className="text-[21px] leading-8 font-medium tracking-[-0.01em] text-balance"><p>“Neon is a promise you make to the street at two in the morning.”</p></blockquote>
        <p className="text-[15px] leading-7 text-pretty">The sign stayed. So did the crowd that gathers under it every Friday.</p>
      </div>
    </article>
  );
}
LongRead.stage = true;
LongRead.names = ['Flush', 'Hanging'];
LongRead.lesson = {
  why: 'An opening quote mark is punctuation, not a letter, but set flush it takes the first place on the line. The quote’s words start a mark’s width in from every other line on the page, and the column looks dented.',
  habit: 'Hang opening quotes (and bullets) in the margin, so the words line up: text-indent by minus the mark’s width, or hanging-punctuation where it’s supported.',
};
// What the eye sees: the column's edge, and where the quote's words start after the mark (the hatch is the mark's
// width). The pill is that width, in px.
LongRead.measure = (root) => {
  const col = root?.querySelector('[data-column]'), q = root?.querySelector('[data-quote] p');
  if (!col || !q) return null;
  const k = col.getBoundingClientRect().width / col.offsetWidth || 1, cs = getComputedStyle(col);
  const edge = col.getBoundingClientRect().left + parseFloat(cs.paddingLeft) * k, t = q.firstChild, r = document.createRange();
  r.setStart(t, 1); r.setEnd(t, 2);
  const word = r.getBoundingClientRect(), qr = q.getBoundingClientRect(), off = (word.left - edge) / k, cr = col.getBoundingClientRect();
  return {
    lines: [{ key: 'edge', x: edge, top: cr.top + 16 * k, bottom: cr.bottom - 16 * k }, { key: 'word', x: word.left, top: word.top, bottom: word.bottom }],
    bands: [{ key: 'mark', left: Math.min(edge, word.left), right: Math.max(edge, word.left), top: word.top, bottom: word.bottom, pattern: 'hatch' }],
    pills: [{ key: 'off', x: edge, y: word.top - 12 * k, text: (Math.abs(off) * k).toFixed(1), ok: Math.abs(off) < 1 }],
    off: Math.abs(off) >= 1,
    cut: { left: qr.left - 14 * k, right: qr.right, top: qr.top, bottom: qr.bottom },
    subject: { left: edge - 40 * k, right: edge + 260 * k, top: qr.top - 70 * k, bottom: qr.bottom + 40 * k },
  };
};

// #46 capitals get case-sensitive forms. An airline's boarding pass, set in capitals as boarding passes are: dashes,
// colons and brackets are drawn to sit beside lowercase, so between capitals they hang low. The case feature lifts them
// to the capitals' middle.
const Caps = ({ className = '', children }) => <span data-caps className={'uppercase ' + className}>{children}</span>;
function BoardingPass() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[26rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-center justify-between bg-ink px-6 py-4 text-surface">
        <span className="text-sm font-semibold">Northwind Air</span>
        <Caps className="text-xs font-medium tracking-caps">Boarding pass</Caps>
      </header>
      <div className="flex flex-col gap-5 px-6 pt-5 pb-6">
        <div className="flex items-end justify-between">
          <span className="flex flex-col"><span className="text-xs text-ink-muted">Lisbon</span><Caps className="text-[34px] leading-none font-semibold tracking-[-0.02em]">LIS</Caps></span>
          <ArrowRightIcon size={20} texture="dither" className="mb-1.5 text-ink-muted" />
          <span className="flex flex-col items-end"><span className="text-xs text-ink-muted">Copenhagen</span><Caps className="text-[34px] leading-none font-semibold tracking-[-0.02em]">CPH</Caps></span>
        </div>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
          <span className="flex flex-col"><dt className="text-xs text-ink-muted">Flight</dt><dd><Caps className="font-medium tracking-caps tabular-nums">NW–754</Caps></dd></span>
          <span className="flex flex-col"><dt className="text-xs text-ink-muted">Time</dt><dd><Caps className="font-medium tracking-caps tabular-nums">07:55–12:30</Caps></dd></span>
          <span className="flex flex-col"><dt className="text-xs text-ink-muted">Seat</dt><dd><Caps className="font-medium tracking-caps">14A (Zone 2)</Caps></dd></span>
        </dl>
        <div className="flex items-center justify-between border-t border-dashed border-line pt-4">
          <span className="flex flex-col"><span className="text-xs text-ink-muted">Passenger</span><Caps className="text-sm font-medium tracking-caps">Okafor / Sana</Caps></span>
          <span aria-hidden="true" className="h-10 w-28 bg-[repeating-linear-gradient(90deg,var(--color-ink)_0_2px,transparent_2px_4px,var(--color-ink)_4px_5px,transparent_5px_8px)]" />
        </div>
      </div>
    </article>
  );
}
BoardingPass.stage = true;
BoardingPass.names = ['Lowercase forms', 'Case forms'];
BoardingPass.lesson = {
  why: 'Hyphens, dashes, colons and brackets are drawn to sit at the middle of lowercase letters. Between capitals that middle is too low, so in “07:55–12:30” the colon and dash sag below the figures around them.',
  habit: 'Text set in capitals turns on the font’s case-sensitive forms (font-feature-settings: "case"), so punctuation rises to the capitals.',
};
// What the eye sees in the time: the middle of its capitals (figures), carried across. The pill is 1 while the
// punctuation sits on lowercase forms, and turns to ✓ once the case feature is on.
BoardingPass.measure = (root) => {
  const el = [...(root?.querySelectorAll('[data-caps]') ?? [])].find((e) => /\d:\d\d–/.test(e.textContent));
  if (!el) return null;
  const k = el.getBoundingClientRect().width / el.offsetWidth || 1, s = getComputedStyle(el), r = el.getBoundingClientRect();
  ctx ??= document.createElement('canvas').getContext('2d');
  ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const m = ctx.measureText('H'), q = document.createRange(); q.selectNodeContents(el);
  const box = q.getClientRects()[0], base = box.top + ((box.height / k - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent) * k;
  const mid = base - (m.actualBoundingBoxAscent / 2) * k, on = /case/.test(s.fontFeatureSettings);
  const at = (i) => { const c = document.createRange(); c.setStart(el.firstChild, i); c.setEnd(el.firstChild, i + 1); return c.getBoundingClientRect(); };
  const colon = at(2), dash = at(5);
  return {
    lines: [{ key: 'colon', x: (colon.left + colon.right) / 2, top: mid - 6 * k, bottom: base + 2 * k }, { key: 'dash', x: (dash.left + dash.right) / 2, top: mid - 6 * k, bottom: base + 2 * k }],
    rules: [{ key: 'mid', y: mid, left: r.left - 8 * k, right: r.right + 8 * k }],
    bands: [], off: !on,
    pills: [{ key: 'case', x: r.right + 18 * k, y: mid, text: on ? '0' : String(k), ok: on }],
    cut: { left: r.left - 3 * k, right: r.right + 3 * k, top: r.top, bottom: r.bottom },
    subject: { left: r.left - 50 * k, right: r.right + 70 * k, top: r.top - 50 * k, bottom: r.bottom + 40 * k },
  };
};

// #55 gradients mix in OKLCH. A weather app's 10-day forecast: each day's temperature bar runs from a cold blue to a
// warm orange, written as a plain CSS gradient (as design tools export it). Mixed in sRGB, a blue and an orange pass
// through grey on the way, so every bar sags into a dull middle. plumber mixes them in OKLCH.
const DAYS = [
  { day: 'Today', low: 9, high: 19, from: 0.18, to: 0.72 }, { day: 'Thu', low: 11, high: 21, from: 0.27, to: 0.82 },
  { day: 'Fri', low: 8, high: 16, from: 0.14, to: 0.58 }, { day: 'Sat', low: 7, high: 15, from: 0.09, to: 0.52 },
  { day: 'Sun', low: 10, high: 22, from: 0.23, to: 0.88 },
];
const COLD = '#2f6fe4', WARM = '#f5a524';
function Forecast() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[26rem] rounded-card bg-surface shadow-card">
      <header className="flex items-baseline justify-between px-5 pt-4 pb-2">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Lisbon</span>
        <span className="text-[13px] text-ink-muted">5-day forecast</span>
      </header>
      <ul className="px-5 pb-4">
        {DAYS.map((d) => (
          <li key={d.day} className="grid grid-cols-[3.5rem_2rem_1fr_2rem] items-center gap-3 border-b-hairline border-line py-2.5 text-sm last:border-0">
            <span className="font-medium">{d.day}</span>
            <span className="text-right text-ink-muted tabular-nums">{d.low}°</span>
            <span className="relative h-1.5 rounded-full bg-sunken">
              {/* the gradient as a design tool exports it, pasted into a class */}
              <span data-range className="absolute inset-y-0 rounded-full bg-[linear-gradient(90deg,#2f6fe4,#f5a524)]" style={{ left: `${d.from * 100}%`, right: `${(1 - d.to) * 100}%` }} />
            </span>
            <span className="tabular-nums">{d.high}°</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
Forecast.stage = true;
Forecast.names = ['sRGB', 'OKLCH'];
Forecast.lesson = {
  why: 'sRGB mixes the red, green and blue channels separately, so the path from a blue to an orange runs straight through grey. OKLCH mixes lightness, chroma and hue the way the eye sees them, so the colour stays vivid all the way across.',
  habit: 'Mix gradients in OKLCH (or OKLab): linear-gradient(in oklch, …), or Tailwind’s /oklch.',
};
// What the eye sees on the first bar: how colourful it is along its length, sampled the way the browser mixes it. The
// hatch is where it drops below half the colour of its ends; the pill is the most colour it loses, in percent.
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toLab = (c) => {
  const [r, g, b] = c.map(lin), l = Math.cbrt(0.4122 * r + 0.5363 * g + 0.0514 * b), m = Math.cbrt(0.2119 * r + 0.6807 * g + 0.1074 * b), s2 = Math.cbrt(0.0883 * r + 0.2817 * g + 0.6299 * b);
  return [0.2105 * l + 0.7936 * m - 0.0041 * s2, 1.978 * l - 2.4286 * m + 0.4506 * s2, 0.0259 * l + 0.7828 * m - 0.8087 * s2];
};
const chromaOf = (lab) => Math.hypot(lab[1], lab[2]);
Forecast.measure = (root) => {
  const bar = root?.querySelector('[data-range]');
  if (!bar) return null;
  const r = bar.getBoundingClientRect(), k = r.width / bar.offsetWidth || 1, oklch = /in oklch/.test(getComputedStyle(bar).backgroundImage);
  const [a, b] = [hex2rgb(COLD), hex2rgb(WARM)], [A, B] = [toLab(a), toLab(b)], ends = Math.min(chromaOf(A), chromaOf(B));
  const at = (t) => {
    if (!oklch) return chromaOf(toLab(a.map((x, i) => x + (b[i] - x) * t)));
    const [ca, cb] = [chromaOf(A), chromaOf(B)];
    return ca + (cb - ca) * t; // OKLCH keeps chroma on a straight line between the ends
  };
  let low = Infinity, dull = null;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, c = at(t);
    low = Math.min(low, c);
    if (c < ends * 0.5) dull = dull ? { from: dull.from, to: t } : { from: t, to: t };
  }
  const loss = Math.max(0, 1 - low / ends), x = (t) => r.left + r.width * t;
  return {
    lines: [], off: loss > 0.3,
    bands: [{ key: 'dull', left: x(dull?.from ?? 0.5), right: x(dull?.to ?? 0.5), top: r.top - 6 * k, bottom: r.bottom + 6 * k, pattern: 'hatch' }],
    pills: [{ key: 'loss', x: x(0.5), y: r.top - 16 * k, text: String(Math.round(loss * 100) * k), ok: loss <= 0.3 }],
    cut: { left: r.left - 4 * k, right: r.right + 4 * k, top: r.top - 4 * k, bottom: r.bottom + 4 * k, r: 4 * k },
    subject: { left: r.left - 30 * k, right: r.right + 30 * k, top: r.top - 60 * k, bottom: r.bottom + 50 * k },
  };
};

// #56 eased gradients for scrims. A travel app's destination card: the title sits on the photo over a fade from black
// to clear, drawn as a straight two-stop gradient. A linear fade stops abruptly, so its top edge shows as a line across
// the photo. plumber eases it: most of the darkness at the bottom, a long soft tail.
function Destination() {
  // Slate's primitives, with dithered icons and a real photo
  return (
    <article className="w-full max-w-[24rem] overflow-hidden rounded-card bg-surface shadow-card">
      <div className="relative aspect-[4/5]">
        <img src={paperCities} alt="" width="384" height="480" className="absolute inset-0 size-full object-cover" />
        <div data-scrim className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-white">
          <span className="case-forms text-xs font-medium tracking-caps uppercase">Los Angeles · 4 nights</span>
          <span className="text-[26px] leading-8 font-semibold tracking-[-0.02em] text-balance">Light and stone at the Getty</span>
          <span className="flex items-center gap-1.5 text-sm"><HeartIcon size={14} texture="dither" />Saved by 1,312 travellers</span>
        </div>
      </div>
    </article>
  );
}
Destination.stage = true;
Destination.names = ['Linear', 'Eased'];
Destination.lesson = {
  why: 'A two-stop fade changes darkness at a constant rate, then stops dead where it ends. The eye catches that sudden stop as an edge, so the photo looks cut by a horizontal line well above the words.',
  habit: 'Ease a scrim: several stops on a curve, dark near the words and a long soft tail, so its end has no edge.',
};
// What the eye sees: where the fade ends (the hatch is its last tenth, where a linear fade still darkens as much as
// anywhere). The pill is how much darkness that last tenth holds, in hundredths.
Destination.measure = (root) => {
  const el = root?.querySelector('[data-scrim]');
  if (!el) return null;
  const r = el.getBoundingClientRect(), k = r.width / el.offsetWidth || 1, bg = getComputedStyle(el).backgroundImage;
  const alphas = [...bg.matchAll(/rgba?\(([^)]+)\)\s*([\d.]+%)?/g)].map((m) => ({ a: parseFloat(m[1].split(/[ ,/]+/).filter(Boolean)[3] ?? 1), at: m[2] ? parseFloat(m[2]) / 100 : null }));
  alphas.forEach((s, i) => { s.at ??= i / Math.max(1, alphas.length - 1); });
  const alphaAt = (t) => { for (let i = 1; i < alphas.length; i++) if (t <= alphas[i].at) { const p = alphas[i - 1], q = alphas[i]; return p.a + (q.a - p.a) * ((t - p.at) / (q.at - p.at || 1)); } return alphas.at(-1)?.a ?? 0; };
  const tail = alphaAt(0.9) - alphaAt(1); // to top: t runs from the bottom (0) to the top (1)
  const y = (t) => r.bottom - r.height * t;
  return {
    lines: [], off: tail > 0.04,
    rules: [{ key: 'end', y: y(1), left: r.left, right: r.right }],
    bands: [{ key: 'tail', left: r.left, right: r.right, top: y(1), bottom: y(0.9), pattern: 'hatch' }],
    pills: [{ key: 'tail', x: r.right - 30 * k, y: y(1) - 12 * k, text: String(Math.round(tail * 100) * k), ok: tail <= 0.04 }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
    subject: { left: r.left - 10 * k, right: r.right + 10 * k, top: y(1) - 50 * k, bottom: r.bottom },
  };
};

export const EXAMPLES = { 8: RecentlyPlayed, 1: ClientProfile, 2: InvoiceWalkthrough, 3: Whiteboard, 4: DriveActivity, 5: ChatThread, 6: FitnessToday, 15: IssueTable, 16: Timesheet, 18: NewsFront, 45: LongRead, 46: BoardingPass, 55: Forecast, 56: Destination };

