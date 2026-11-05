// One example per principle, each a small scene from a real product, drawn with care: real content, quiet colour,
// soft depth. Each takes `broken` and is wrong in exactly one way, the principle's; everything else on it is right, so
// plumber, scoped to it, finds one thing. `measure` (optional) says where the eye sees the harm, for the ticks drawn
// over the example; it reads the page, it never decides what is wrong (plumber does).
import { useEffect, useRef, useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { ArrowRightIcon, BoltIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, FolderIcon, HeadphonesIcon, HeartIcon, HistoryIcon, LayersIcon, MailIcon, SunIcon, BookIcon, FileIcon, ChartIcon, CodeIcon, MessageIcon, PathIcon, PauseIcon, PlusIcon, SearchIcon, SendIcon, SparklesIcon, TrashIcon, UploadIcon, UserIcon } from '@unlocalhosted/dither-icons';
import lowTide from '../media/low-tide.jpg';
import paperCities from '../media/paper-cities.jpg';
import afterglow from '../media/afterglow.jpg';
import lake from '../media/lake.jpg';
import valley from '../media/valley.jpg';
import peak from '../media/peak.jpg';
import ceramic from '../media/ceramic.jpg';
import tomi from '../media/people/person-09.jpg';
import arlo from '../media/people/person-06.jpg';
import ines from '../media/people/person-01.jpg';
import walt from '../media/people/person-04.jpg';
import remy from '../media/people/person-08.jpg';
import spotifyLogo from '../media/logos/spotify.svg';
import stripeLogo from '../media/logos/stripe.svg';
import figmaLogo from '../media/logos/figma.svg';
import notionLogo from '../media/logos/notion.svg';
import mailchimpLogo from '../media/logos/mailchimp.svg';

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
const TIMER = { every: 1000, startedAgo: 6157, rate: 130, task: 'Wrapped 2026, share cards', job: 'Spotify · Brand studio', at: 375, brand: 'spotify', face: tomi };
// each client keeps its own brand colour everywhere: the logo on the contact's face, the block on the day, the bar.
// `at` is when the entry started, in minutes after 08:00; the day runs 08:00 to 18:00
const BRANDS = {
  spotify: { color: '#1db954', logo: spotifyLogo },
  stripe: { color: '#635bff', logo: stripeLogo },
  figma: { color: '#f24e1e', logo: figmaLogo },
  notion: { color: '#37352f', logo: notionLogo },
  mailchimp: { color: '#ffe01b', logo: mailchimpLogo, glyph: '#241c15' },
};
const EARLIER = [
  { task: 'Checkout wireframes', client: 'Stripe', brand: 'stripe', face: arlo, seconds: 7578, rate: 130, at: 45 },
  { task: 'Config keynote slides', client: 'Figma', brand: 'figma', face: ines, seconds: 4300, rate: 145, at: 172 },
  { task: 'Template gallery kickoff', client: 'Notion', brand: 'notion', face: walt, seconds: 2885, rate: 120, at: 300 },
  { task: 'Onboarding email review', client: 'Mailchimp', brand: 'mailchimp', face: remy, seconds: 1192, rate: 95, at: 352 },
  { task: 'Studio standup', client: 'Internal · not billed', seconds: 900, rate: 0, at: 30 },
];
const DAY = { start: 8, hours: 10, goal: 7 * 3600 };
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
const hhmm = (min) => `${String(DAY.start + Math.floor(min / 60)).padStart(2, '0')}:${String(Math.floor(min) % 60).padStart(2, '0')}`;
const dayPct = (min) => `${(min / (DAY.hours * 60)) * 100}%`;

// a contact's face with their company's logo on its corner, in the brand's colour
function Face({ src, brand, size = 'size-8' }) {
  const b = BRANDS[brand];
  return (
    <span className={'relative shrink-0 ' + size}>
      <img src={src} alt="" className="size-full rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
      <span className="absolute -right-1 -bottom-1 grid size-[17px] place-items-center rounded-[5px] ring-2 ring-surface" style={{ background: b.color }}>
        <span className="size-[9px]" style={{ background: b.glyph ?? '#fff', mask: `url(${b.logo}) center / contain no-repeat` }} />
      </span>
    </span>
  );
}

function Timesheet({ live = true }) {
  const { t, paused, toggle } = useTimer(live);
  const total = EARLIER.reduce((a, e) => a + e.seconds, 0) + t;
  const totalEarned = EARLIER.reduce((a, e) => a + earned(e.seconds, e.rate), 0) + earned(t, TIMER.rate);
  const now = TIMER.at + t / 60, longest = Math.max(...EARLIER.map((e) => e.seconds));
  const done = Math.min(total / DAY.goal, 1);
  // Quarry's Slate primitives; the clients bring their own brand colours
  return (
    <article className="w-full max-w-[32.5rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex flex-col gap-4 px-6 pt-5 pb-4">
        <span className="flex items-center gap-3">
          <Face src={TIMER.face} brand={TIMER.brand} size="size-9" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] leading-5 font-medium tracking-[-0.01em]">{TIMER.task}</span>
            <span className="truncate text-[13px] text-ink-muted">{TIMER.job}</span>
          </span>
          <span className={'flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ' + (paused ? 'bg-sunken text-ink-muted' : 'bg-positive-soft text-positive')}>
            <span className={'size-1.5 rounded-full ' + (paused ? 'bg-ink-subtle' : 'bg-positive')} />
            {paused ? 'Paused' : 'Tracking'}
          </span>
        </span>
        <span className="flex items-center justify-between gap-6">
          <span className="flex flex-col gap-2">
            <Fig col="clock" className="text-[52px] leading-none font-medium tracking-[-0.03em]">{clock(t)}</Fig>
            <span className="text-[13px] text-ink-muted"><Fig col="earned" className="font-medium text-ink">{dollars(earned(t, TIMER.rate))}</Fig> at ${TIMER.rate} an hour · since {hhmm(TIMER.at)}</span>
          </span>
          <button type="button" onClick={toggle} aria-label={paused ? 'Resume timer' : 'Pause timer'}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition-[background-color,scale] duration-150 hover:bg-accent-deep active:scale-95 outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent">
            {paused
              ? <svg viewBox="0 0 16 16" className="size-3.5 translate-x-px" fill="currentColor" aria-hidden="true"><path d="M4 2.8v10.4a.8.8 0 0 0 1.2.7l8.6-5.2a.8.8 0 0 0 0-1.4L5.2 2.1a.8.8 0 0 0-1.2.7" /></svg>
              : <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" rx="1" /><rect x="9.5" y="2.5" width="3" height="11" rx="1" /></svg>}
          </button>
        </span>
      </header>
      {/* the day as data: a block per entry in its client's colour; the running one is striped and grows to now */}
      <section data-day aria-label="Today, hour by hour" className="px-6 pt-5 pb-4">
        <span className="relative block h-[30px] rounded-[7px] bg-sunken">
          {EARLIER.map((e) => (
            <span key={e.task} className="absolute inset-y-1 rounded-[4px]" style={{ left: dayPct(e.at), width: dayPct(e.seconds / 60), background: e.brand ? BRANDS[e.brand].color : '#a3acb9' }} />
          ))}
          <span className="absolute inset-y-1 rounded-[4px] bg-[repeating-linear-gradient(-45deg,rgb(255_255_255/0.3)_0_4px,transparent_4px_8px)]" style={{ left: dayPct(TIMER.at), width: dayPct(t / 60), backgroundColor: BRANDS[TIMER.brand].color }} />
          <span className="absolute -inset-y-1.5 -ml-px w-0.5 rounded-full bg-ink" style={{ left: dayPct(now) }} />
          <span className="absolute -top-[22px] -translate-x-1/2 text-[11px] font-semibold" style={{ left: dayPct(now) }}>{hhmm(now)}</span>
        </span>
        <span className="mt-1.5 flex justify-between text-[11px] text-ink-subtle">
          {[0, 2, 4, 6, 8, 10].map((h) => <span key={h}>{String(DAY.start + h).padStart(2, '0')}</span>)}
        </span>
      </section>
      <section data-entries className="border-t-hairline border-line px-6 pt-3 pb-1">
        <h3 className="flex justify-between py-1.5 text-xs font-medium text-ink-muted">Earlier today<span>{EARLIER.length} entries</span></h3>
        <ul>
          {EARLIER.map((e) => (
            <li key={e.task} data-entry className="grid grid-cols-[2rem_1fr_5.75rem_4.25rem] items-center gap-3 border-b-hairline border-line py-2.5 last:hairline-none">
              {e.face ? <Face src={e.face} brand={e.brand} />
                : <span className="grid size-8 place-items-center rounded-full bg-sunken text-[11px] font-semibold text-ink-muted">QS</span>}
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{e.task}</span>
                <span className="truncate text-[13px] text-ink-muted">{e.client}</span>
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-sunken">
                <span className="block h-full rounded-full shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.12)]" style={{ width: `${(e.seconds / longest) * 100}%`, background: e.brand ? BRANDS[e.brand].color : '#a3acb9' }} />
              </span>
              <span className="flex flex-col items-end">
                <Fig col="time" className="text-sm font-medium">{clock(e.seconds)}</Fig>
                {e.rate ? <Fig col="money" className="text-[13px] text-ink-muted">{dollars(earned(e.seconds, e.rate))}</Fig>
                  : <span className="text-[13px] text-ink-muted">—</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <footer data-total className="flex items-center gap-3.5 bg-sunken px-6 pt-3.5 pb-4">
        {/* the day's goal as a ring: drawn by a conic fill under a mask, it's a chart, not an icon */}
        <span className="relative grid size-12 shrink-0 place-items-center text-[11px] font-semibold">
          <span aria-hidden="true" className="absolute inset-0 rounded-full [mask:radial-gradient(farthest-side,transparent_calc(100%-5px),#000_calc(100%-4.5px))]"
            style={{ background: `conic-gradient(var(--color-accent) ${done * 360}deg, var(--color-line) 0)` }} />
          {Math.round(done * 100)}%
        </span>
        <span className="flex flex-col">
          <span className="text-xs font-medium text-ink-muted">Today so far · of {DAY.goal / 3600}h</span>
          <Fig col="total" className="text-lg font-semibold tracking-[-0.01em]">{clock(total)}</Fig>
        </span>
        <span className="ml-auto flex flex-col items-end">
          <Fig col="money" className="text-[15px] font-semibold">{dollars(totalEarned)}</Fig>
          <span className="text-xs text-ink-muted">billed today</span>
        </span>
      </footer>
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
              <li key={r.id} className="flex items-center gap-3 border-b-hairline border-line py-2.5 last:hairline-none">
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
              className="relative grid size-14 place-items-center rounded-full bg-surface text-ink shadow-[0_1px_3px_rgb(18_35_61/0.25),0_6px_20px_rgb(18_35_61/0.3)] transition-[scale] duration-150 hover:scale-105 active:scale-95 outline-offset-2 focus-visible:outline-2 focus-visible:outline-surface">
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
            <tr key={r.id} className="border-b-hairline border-line last:hairline-none">
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
// one 11px label needs a closer look than the stage's usual 2.4×
IssueTable.maxZoom = 5;
// What the eye sees on one label: the space between one capital's ink and the next (the hatch), nothing drawn over the
// letters themselves. Placed
// at the letters' real positions (the DOM's) with each glyph's own ink bounds (canvas measureText). The pill is the
// tightest of those gaps, in px: where two capitals all but touch.
IssueTable.measure = (root) => {
  const th = [...(root?.querySelectorAll('[data-label]') ?? [])][1];
  if (!th) return null;
  const t = th.firstChild, k = th.getBoundingClientRect().width / th.offsetWidth || 1, range = document.createRange();
  const s = getComputedStyle(th), ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const ink = [];
  for (let i = 0; i < t.length; i++) {
    range.setStart(t, i); range.setEnd(t, i + 1);
    const b = range.getBoundingClientRect(), ch = s.textTransform === 'uppercase' ? t.data[i].toUpperCase() : t.data[i];
    if (!ch.trim()) continue;
    const m = ctx.measureText(ch);
    ink.push({ left: b.left + -m.actualBoundingBoxLeft * k, right: b.left + m.actualBoundingBoxRight * k, top: b.top, bottom: b.bottom, h: b.height });
  }
  const bands = [], lines = [];
  let tight = Infinity;
  ink.forEach((g, i) => {
    const n = ink[i + 1];
    if (!n) return;
    tight = Math.min(tight, (n.left - g.right) / k);
    bands.push({ key: `g${i}`, left: g.right, right: Math.max(g.right + 0.5 * k, n.left), top: g.top + g.h * 0.3, bottom: g.bottom - g.h * 0.3, pattern: 'hatch' });
  });
  const first = ink[0], last = ink.at(-1), ok = tight >= 1;
  return {
    lines, bands, off: !ok,
    pills: [{ key: 'gap', x: (first.left + last.right) / 2, y: first.top - 10 * k, text: (Math.max(tight, 0.05) * k).toFixed(1), ok }],
    cut: { left: first.left - 4 * k, right: last.right + 4 * k, top: first.top - 2 * k, bottom: first.bottom + 2 * k },
    subject: { left: first.left - 12 * k, right: last.right + 12 * k, top: first.top - 22 * k, bottom: first.bottom + 14 * k },
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
          <li key={st.head} className="flex gap-4 border-b-hairline border-line py-4 last:hairline-none">
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
// the time is 13px: the stage goes in closer than usual so a 1px rise can be seen
BoardingPass.maxZoom = 5;
// What the eye sees in the time: the middle of its capitals (figures), carried across, and where the colon's and the
// dash's ink actually sit, measured from the default glyphs (canvas measureText). The hatch is the sag between; the
// pill is the colon's sag in px. With the case forms on, the alternates rise to the middle (the browser draws them;
// canvas can't, so the fixed side shows the middle and the glyphs themselves, zoomed).
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
  // the ink centre of a default glyph, in the page's pixels
  const centre = (ch) => { const g = ctx.measureText(ch); return base - ((g.actualBoundingBoxAscent - g.actualBoundingBoxDescent) / 2) * k; };
  const colon = at(2), dash = at(5), cy = centre(':'), dy = centre('–'), sag = Math.max(0, (cy - mid) / k);
  return {
    lines: [],
    rules: [{ key: 'mid', y: mid, left: r.left - 8 * k, right: r.right + 8 * k },
      // with the case forms on, the sag closes: the glyphs' marks land on the middle (they glide there)
      { key: 'colon', y: on ? mid : cy, left: colon.left - 2 * k, right: colon.right + 2 * k }, { key: 'dash', y: on ? mid : dy, left: dash.left - 1 * k, right: dash.right + 1 * k }],
    bands: [{ key: 'csag', left: colon.left - 2 * k, right: colon.right + 2 * k, top: mid, bottom: on ? mid : cy, pattern: 'hatch' }, { key: 'dsag', left: dash.left - 1 * k, right: dash.right + 1 * k, top: mid, bottom: on ? mid : Math.max(mid, dy), pattern: 'hatch' }],
    off: !on,
    pills: [{ key: 'sag', x: r.right + 22 * k, y: mid, text: on ? '0' : (Math.max(sag, 0.05) * k).toFixed(1), ok: on }],
    cut: { left: r.left - 3 * k, right: r.right + 3 * k, top: r.top, bottom: r.bottom },
    subject: { left: r.left - 14 * k, right: r.right + 40 * k, top: r.top - 16 * k, bottom: r.bottom + 12 * k },
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
          <li key={d.day} className="grid grid-cols-[3.5rem_2rem_1fr_2rem] items-center gap-3 border-b-hairline border-line py-2.5 text-sm last:hairline-none">
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

// A photo library's grid, shared by the depth screens: real photos, a day's heading, a selection count
const LIBRARY = [lowTide, lake, paperCities, valley, afterglow, peak];
function PhotoGrid({ selected = [] }) {
  return (
    <div className="grid grid-cols-3 gap-1 p-1">
      {LIBRARY.map((src, i) => (
        <span key={src} className="relative aspect-square overflow-hidden">
          <img src={src} alt="" width="160" height="160" className="size-full object-cover" />
          {selected.includes(i) ? <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-accent text-[11px] text-accent-ink ring-2 ring-white">✓</span> : null}
        </span>
      ))}
    </div>
  );
}

// #23 translucent borders on elevated surfaces. A photo library's Share menu, open over the grid, built the usual way:
// a 1px gray-200 border and a large shadow. Over dark photos, an opaque light-grey line glows like a frame around the
// menu. A 10% black border takes on whatever is behind it, and sinks into the shadow. plumber makes it see-through.
function ShareMenu() {
  // Slate's primitives, with dithered icons and real photos
  const items = [[CopyIcon, 'Copy link'], [DownloadIcon, 'Download 3 photos'], [FolderIcon, 'Add to album'], [ExternalLinkIcon, 'Open in editor']];
  return (
    <article className="relative w-full max-w-[26rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-baseline justify-between px-4 pt-3 pb-2">
        <span className="text-[15px] font-medium">Sunday, 2 November</span>
        <span className="text-[13px] text-ink-muted">3 selected</span>
      </header>
      <PhotoGrid selected={[0, 2, 4]} />
      <div data-menu role="menu" className="absolute top-24 right-6 flex w-52 flex-col rounded-control border border-gray-200 bg-white p-1 shadow-lg">
        {items.map(([Icon, label]) => (
          <button key={label} type="button" role="menuitem" className="flex h-9 items-center gap-2.5 rounded-chip px-2.5 text-left text-sm hover:bg-sunken"><Icon size={16} texture="dither" className="text-ink-muted" />{label}</button>
        ))}
      </div>
    </article>
  );
}
ShareMenu.stage = true;
ShareMenu.names = ['Solid border', 'See-through border'];
ShareMenu.lesson = {
  why: 'A solid light-grey border is one fixed colour. Over a white page it’s a quiet edge; over dark photos it’s brighter than everything around it, so the menu wears a glowing frame. A see-through border darkens with whatever is behind it and sinks into the shadow.',
  habit: 'Elevated surfaces (menus, popovers, dialogs) get a border of black or white at about 10%, never an opaque grey.',
};
// What the eye sees: the menu's edge against the photo behind it, traced along all four sides. The pill is the
// border's opacity, in percent.
ShareMenu.measure = (root) => {
  const m = root?.querySelector('[data-menu]');
  if (!m) return null;
  const r = m.getBoundingClientRect(), k = r.width / m.offsetWidth || 1, a = (getComputedStyle(m).borderTopColor.match(/[\d.]+(?=\)$)/) && /rgba|\//.test(getComputedStyle(m).borderTopColor)) ? parseFloat(getComputedStyle(m).borderTopColor.match(/[\d.]+(?=\)$)/)[0]) : 1;
  return {
    lines: [{ key: 'l', x: r.left, top: r.top, bottom: r.bottom }, { key: 'r', x: r.right, top: r.top, bottom: r.bottom }],
    rules: [{ key: 't', y: r.top, left: r.left, right: r.right }, { key: 'b', y: r.bottom, left: r.left, right: r.right }],
    bands: [], off: a > 0.3,
    pills: [{ key: 'a', x: r.left - 22 * k, y: r.top + 16 * k, text: String(Math.round(a * 100) * k), ok: a <= 0.3 }],
    cut: { left: r.left - 30 * k, right: r.right + 30 * k, top: r.top - 30 * k, bottom: r.bottom + 30 * k, r: 8 * k },
    // the whole menu, every row of it over the photos, where the grey line glows
    subject: { left: r.left - 60 * k, right: r.right + 30 * k, top: r.top - 30 * k, bottom: r.bottom + 30 * k },
  };
};

// #51 layered shadows. The same library's Delete dialog, lifted with Tailwind's shadow-2xl: one large soft layer. Real
// light gives a tight, dark shadow where a thing nearly touches and a wide, faint one around it; one big blur gives
// neither, so the dialog floats in a fog with nothing under its edge. plumber stacks four layers.
function DeleteDialog() {
  // Slate's primitives, with dithered icons and real photos
  return (
    <article className="relative w-full max-w-[26rem] overflow-hidden rounded-card bg-surface shadow-card">
      <PhotoGrid selected={[1, 3, 5]} />
      <div className="absolute inset-0 bg-ink/35" />
      <div data-dialog role="alertdialog" aria-label="Delete 3 photos?" className="absolute inset-x-8 inset-y-0 my-auto flex h-fit flex-col gap-3 rounded-sheet bg-surface p-5 shadow-2xl">
        <span className="grid size-9 place-items-center rounded-full bg-negative-soft text-negative"><TrashIcon size={18} texture="dither" /></span>
        <span className="flex flex-col gap-1">
          <span className="text-[15px] font-medium">Delete 3 photos?</span>
          <span className="text-[13px] text-ink-muted text-pretty">They’ll stay in Recently deleted for 30 days, then go for good.</span>
        </span>
        <span className="flex justify-end gap-2 pt-1">
          <button type="button" className="h-9 rounded-control px-3.5 text-sm font-medium ring-1 ring-line ring-inset hover:bg-sunken">Cancel</button>
          <button type="button" className="h-9 rounded-control bg-negative px-3.5 text-sm font-medium text-white hover:bg-negative/90">Delete</button>
        </span>
      </div>
    </article>
  );
}
DeleteDialog.stage = true;
DeleteDialog.names = ['One blur', 'Layered'];
DeleteDialog.lesson = {
  why: 'A single shadow can be soft or tight, not both. Tailwind’s largest shadow is one 50px blur pushed 25px down, so right under the dialog’s edge there’s almost nothing: no contact, and the dialog reads as hovering in a haze rather than resting above the page.',
  habit: 'Build shadows from layers: a small, dark one for contact and wider, fainter ones for distance, each doubling the last.',
};
// What the eye sees: the contact right under the dialog's edge. The pill is how dark the shadow is 2px below the edge,
// in percent, from the shadow's own layers (each a Gaussian falloff of its blur, offset and spread, laid over each
// other): one big blur leaves the edge floating; a small, dark layer gives it contact.
const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
const contactAt = (shadow, d) => {
  const layers = shadow.split(/,(?![^(]*\))/).filter((l) => !/inset/.test(l)).map((l) => {
    const a = parseFloat(l.match(/(?:rgba?|oklch|oklab)\([^)]*?[,/]\s*([\d.]+)\s*\)/)?.[1] ?? '1'), n = (l.replace(/(?:rgba?|oklch|oklab)\([^)]*\)/g, '').match(/-?[\d.]+px/g) ?? []).map(parseFloat);
    return { a, y: n[1] ?? 0, blur: n[2] ?? 0, spread: n[3] ?? 0 };
  }).filter((l) => l.a > 0 && (l.blur || l.y));
  // coverage of each layer at d px below the edge; layers stack as over-painting
  return 1 - layers.reduce((left, l) => { const sigma = Math.max(0.5, l.blur / 2), reach = l.y + l.spread, cov = 0.5 * (1 - erf((d - reach) / (sigma * Math.SQRT2))); return left * (1 - l.a * cov); }, 1);
};
DeleteDialog.measure = (root) => {
  const d = root?.querySelector('[data-dialog]');
  if (!d) return null;
  const r = d.getBoundingClientRect(), k = r.width / d.offsetWidth || 1, contact = Math.round(contactAt(getComputedStyle(d).boxShadow, 2) * 100);
  return {
    lines: [], off: contact < 25,
    rules: [{ key: 'edge', y: r.bottom, left: r.left, right: r.right }],
    bands: [{ key: 'contact', left: r.left + 12 * k, right: r.right - 12 * k, top: r.bottom, bottom: r.bottom + 4 * k, pattern: 'hatch' }],
    pills: [{ key: 'contact', x: r.right + 24 * k, y: r.bottom, text: String(contact * k), ok: contact >= 25 }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom + 14 * k, r: 14 * k },
    subject: { left: r.left - 20 * k, right: r.right + 50 * k, top: r.top - 20 * k, bottom: r.bottom + 40 * k },
  };
};

// #21 shadows are tinted by what they fall on. A recipe app's page takes the dish's warm saffron as its ground, and
// the ingredients card floats on it with Tailwind's shadow-lg: 10% black. Black over saffron isn't a darker saffron,
// it's a grey smudge, so the card looks dusty at its edge. plumber tints the shadow with the ground's own hue.
const INGREDIENTS = [
  { what: 'Carnaroli rice', much: '320 g' },
  { what: 'Saffron threads', much: '1 pinch' },
  { what: 'Warm stock', much: '1.2 l' },
  { what: 'Parmesan, grated', much: '60 g' },
];
function Recipe() {
  // Slate's primitives on the recipe's own ground, with dithered icons
  return (
    <article data-ground className="flex w-full max-w-[24rem] flex-col gap-5 rounded-card bg-[#f4e2c3] p-6 text-[#3d2a12]">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#7a5a2e]">Dinner · 35 min · serves 4</span>
        <span className="text-[22px] leading-7 font-medium tracking-[-0.015em]">Saffron risotto</span>
      </header>
      <section data-card className="flex flex-col rounded-card bg-surface px-4 py-2 text-ink shadow-lg">
        {INGREDIENTS.map((i) => (
          <span key={i.what} className="flex items-baseline justify-between border-b-hairline border-line py-2.5 text-sm last:hairline-none">
            <span>{i.what}</span>
            <span className="text-ink-muted tabular-nums">{i.much}</span>
          </span>
        ))}
      </section>
      <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-[#3d2a12] text-sm font-medium text-[#f4e2c3] hover:bg-[#3d2a12]/90">
        Start cooking <ArrowRightIcon size={16} texture="dither" />
      </button>
    </article>
  );
}
Recipe.stage = true;
Recipe.names = ['Grey shadow', 'Tinted'];
Recipe.lesson = {
  why: 'A shadow is the ground with less light on it, so on saffron it should be a deeper saffron. Black at 10% doesn’t darken the colour, it greys it out: the card’s edge sits in a dusty band that belongs to no colour on the page.',
  habit: 'On a coloured ground, make the shadow a dark tint of that ground’s hue, not black.',
};
// What the eye sees: the band where the shadow falls under the card. The pill is how much of the ground's colour that
// band loses, in percent: a darker saffron keeps all of it, black laid over it greys it out.
Recipe.measure = (root) => {
  const card = root?.querySelector('[data-card]'), ground = root?.querySelector('[data-ground]');
  if (!card) return null;
  const r = card.getBoundingClientRect(), g = ground.getBoundingClientRect(), k = r.width / card.offsetWidth || 1;
  // the band right under the edge, where the shadow's layers overlap, painted the way the browser paints it
  const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  const paint = (colours) => { ctx.clearRect(0, 0, 1, 1); for (const c of colours) { ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); } return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => v / 255); };
  const base = getComputedStyle(ground).backgroundColor;
  const layers = getComputedStyle(card).boxShadow.split(/,(?![^(]*\))/).map((l) => l.match(/(rgba?|oklch)\([^)]*\)/)?.[0]).filter((c) => c && !/rgba\(0, 0, 0, 0\)/.test(c));
  const C = (c) => chromaOf(toLab(c));
  const loss = Math.max(0, Math.round((1 - C(paint([base, ...layers])) / C(paint([base]))) * 100));
  return {
    lines: [], off: loss > 8,
    rules: [{ key: 'edge', y: r.bottom, left: r.left, right: r.right }],
    bands: [{ key: 'shadow', left: r.left + 10 * k, right: r.right - 10 * k, top: r.bottom, bottom: r.bottom + 14 * k, pattern: 'dots' }],
    pills: [{ key: 'loss', x: r.right - 30 * k, y: r.bottom + 10 * k, text: String(loss * k), ok: loss <= 8 }],
    // the whole ground stays in colour: the shadow is judged against it
    cut: { left: g.left, right: g.right, top: g.top, bottom: g.bottom, r: 10 * k },
    subject: { left: r.left - 24 * k, right: r.right + 24 * k, top: r.bottom - 90 * k, bottom: r.bottom + 50 * k },
  };
};

// #57 text colour by colour, not by opacity. An email inbox mutes each message's preview line with opacity-60, the
// quickest way to make words quieter. But opacity fades the whole line, not just its grey: the @mention in it, the one
// part written to stand out, is washed out with the rest. plumber names a colour for the words instead.
const MAIL = [
  { from: 'Anika Rao', at: '9:41', subject: 'Venue for the offsite', preview: ['Two options left, both near the station. Pick by Friday?'] },
  { from: 'Design review', at: '9:12', subject: 'Notes from Tuesday', preview: [<span key="m" data-mention className="font-medium text-accent">@you</span>, ' can you take the empty states before we ship?'] },
  { from: 'Jonas Weber', at: 'Mon', subject: 'Re: the April numbers', preview: ['Thanks, that matches what finance sent this morning.'] },
];
function Inbox() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[26rem] rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <MailIcon size={16} texture="dither" className="text-ink-muted" />
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Inbox</span>
      </header>
      <ul className="flex flex-col gap-0.5 px-2 pb-2">
        {MAIL.map((m) => (
          <li key={m.subject} className="flex flex-col gap-0.5 rounded-control px-3 py-2.5 hover:bg-sunken">
            <span className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{m.from}</span>
              <span className="text-xs text-ink-muted tabular-nums">{m.at}</span>
            </span>
            <span className="truncate text-[13px]">{m.subject}</span>
            <span data-preview className="line-clamp-1 text-[13px] opacity-60">{m.preview}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
Inbox.stage = true;
Inbox.names = ['Opacity', 'A colour'];
Inbox.lesson = {
  why: 'Opacity doesn’t make words a quieter colour, it fades everything inside them. The preview turns grey, and so does the @mention in it: the one word coloured to catch your eye is washed out to 60% with the rest.',
  habit: 'Mute text with a colour from your theme (or color-mix with a fixed colour), never with opacity, so what’s inside keeps its own colour.',
};
// What the eye sees: the @mention in the muted line. The pill is how much of it is faded away, in percent.
Inbox.measure = (root) => {
  const mention = root?.querySelector('[data-mention]');
  if (!mention) return null;
  const r = mention.getBoundingClientRect(), line = mention.parentElement.getBoundingClientRect(), k = r.width / mention.offsetWidth || 1;
  let seen = 1;
  for (let el = mention; el && el !== root; el = el.parentElement) seen *= parseFloat(getComputedStyle(el).opacity);
  const faded = Math.round((1 - seen) * 100);
  return {
    lines: [], off: faded > 0,
    bands: [{ key: 'mention', left: r.left - 2 * k, right: r.right + 2 * k, top: r.top, bottom: r.bottom, pattern: 'dots' }],
    pills: [{ key: 'faded', x: r.left + r.width / 2, y: r.bottom + 14 * k, text: String(faded * k), ok: faded === 0 }],
    cut: { left: line.left - 4 * k, right: line.right + 4 * k, top: line.top - 2 * k, bottom: line.bottom + 2 * k, r: 4 * k },
    // the whole preview line, the mention and the grey either side of it
    subject: { left: line.left - 20 * k, right: line.right + 20 * k, top: r.top - 50 * k, bottom: r.bottom + 40 * k },
  };
};

// #25 no pure black for large areas. A notes app announces a new feature with a dark card, bg-black under white words:
// the most contrast a screen can make. On a large area that's harsh rather than rich: the white words glow and smear
// into the black (worse on OLED, where black pixels switch off and smear as you scroll), and the card reads as a hole in
// the page instead of a dark surface. plumber moves it to the theme's near-black.
function FeatureCard() {
  // Slate's primitives, with dithered icons
  return (
    <article data-dark className="flex w-full max-w-[28rem] flex-col gap-5 rounded-card bg-black p-6 text-white">
      <span className="grid size-9 place-items-center rounded-full bg-white/10"><SparklesIcon size={18} texture="dither" /></span>
      {/* the feature itself: a session running */}
      <span className="flex flex-col gap-3 rounded-control px-5 py-6 ring-1 ring-white/10 ring-inset">
        <span className="flex items-baseline justify-between text-[13px] text-white/70"><span>Draft: Q3 offsite plan</span><span className="tabular-nums">2 of 4</span></span>
        <span className="text-[56px] leading-none font-medium tracking-[-0.03em] tabular-nums">18:42</span>
        <span className="h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full w-1/4 rounded-full bg-white" /></span>
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-caps text-white/70 uppercase">New in Notes</span>
        <span className="text-[22px] leading-7 font-medium tracking-[-0.015em]">Focus sessions</span>
        <span className="text-sm leading-relaxed text-white/80 text-pretty">Pick a note, set a time, and everything else in the app goes quiet until the timer ends. Your sessions add up on the Today page.</span>
      </span>
      <span className="flex items-center gap-2 pt-1">
        <button type="button" className="h-9 rounded-control bg-white px-3.5 text-sm font-medium text-black hover:bg-white/90">Try a session</button>
        <button type="button" className="h-9 rounded-control px-3.5 text-sm font-medium text-white/80 hover:bg-white/10">Not now</button>
      </span>
    </article>
  );
}
FeatureCard.stage = true;
FeatureCard.names = ['Pure black', 'Near-black'];
FeatureCard.lesson = {
  why: 'Black under white is the most contrast a screen can make: 21 to 1. On a large area that much is harsh, not rich: white words glow and smear into the black, especially on OLED screens, and the card reads as a hole cut in the page rather than a dark surface on it.',
  habit: 'Use a near-black, a few percent toward your brand’s hue, for any dark area bigger than a button.',
};
const lum = (c) => { const [r, g, b] = c.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
// What the eye sees: the card's dark ground behind its words. The pill is the contrast of white on it, out of 21.
FeatureCard.measure = (root) => {
  const card = root?.querySelector('[data-dark]');
  if (!card) return null;
  const r = card.getBoundingClientRect(), k = r.width / card.offsetWidth || 1;
  const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = getComputedStyle(card).backgroundColor; ctx.fillRect(0, 0, 1, 1);
  const g = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => v / 255), ratio = 1.05 / (lum(g) + 0.05);
  return {
    lines: [], off: ratio > 19,
    bands: [{ key: 'ground', left: r.right - 120 * k, right: r.right - 16 * k, top: r.top + 16 * k, bottom: r.top + 52 * k, pattern: 'dots' }],
    pills: [{ key: 'contrast', x: r.right - 68 * k, y: r.top + 34 * k, text: (ratio * k).toFixed(1), ok: ratio <= 19 }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, r: 10 * k },
    subject: { left: r.left - 20 * k, right: r.right + 20 * k, top: r.top - 20 * k, bottom: r.bottom + 20 * k },
  };
};

// #38 hairlines are one device pixel. A calendar's agenda divides its events with border-b, 1px, the thinnest line
// Tailwind names. On a 2× screen that's two device pixels: every divider is drawn twice as heavy as a line can be, and
// the rules compete with the words they separate. plumber halves them to one device pixel.
const AGENDA = [
  { at: '9:00', until: '9:30', what: 'Design crit', where: 'Studio 2', tone: 'bg-accent' },
  { at: '11:00', until: '12:00', what: 'Interview: Priya Nair', where: 'Video call', tone: 'bg-positive' },
  { at: '13:30', until: '14:00', what: 'Lunch with Jonas', where: 'Café Mona', tone: 'bg-caution' },
  { at: '16:00', until: '17:00', what: 'Release review', where: 'Room 4B', tone: 'bg-accent' },
];
function Agenda() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[24rem] rounded-card bg-surface shadow-card">
      <header className="flex items-baseline justify-between px-5 pt-4 pb-2">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Thursday</span>
        <span className="text-[13px] text-ink-muted">6 November</span>
      </header>
      <ul className="px-5 pb-2">
        {AGENDA.map((e, i) => (
          <li key={e.what} data-row={i === 0 || undefined} className="flex gap-3 border-b border-line py-3 last:border-0">
            <span className="w-11 shrink-0 text-[13px] text-ink-muted tabular-nums">{e.at}</span>
            <span className={`w-0.5 shrink-0 rounded-full ${e.tone}`} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{e.what}</span>
              <span className="text-[13px] text-ink-muted">{e.where} · until {e.until}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
Agenda.stage = true;
Agenda.names = ['1px', 'One device pixel'];
Agenda.lesson = {
  why: 'CSS pixels aren’t screen pixels. On a 2× screen, border-b’s 1px is drawn two device pixels thick: as heavy as the thinnest strokes of the words, so the dividers compete with what they divide.',
  habit: 'Draw dividers one device pixel on 2× screens: a box 0.5px tall, or a half-pixel inset shadow. Not a 0.5px border: Chrome draws every border at least one CSS pixel wide.',
};
// What the eye sees: the first divider, magnified. The pill is its thickness in device pixels.
Agenda.measure = (root) => {
  const row = root?.querySelector('[data-row]');
  if (!row) return null;
  const r = row.getBoundingClientRect(), k = r.width / row.offsetWidth || 1, cs = getComputedStyle(row);
  // the line is the border, or once fixed, the inset shadow drawn in its place
  const w = parseFloat(cs.borderBottomWidth) || Math.abs(parseFloat(cs.boxShadow.match(/(-?[\d.]+)px\s+0px\s+0px\s+inset/)?.[1] ?? cs.boxShadow.match(/0px\s+(-?[\d.]+)px/)?.[1] ?? 0)) || 0;
  const device = Math.round(w * (devicePixelRatio || 1) * 10) / 10;
  return {
    lines: [], off: device > 1,
    rules: [{ key: 'divider', y: r.bottom - (w * k) / 2, left: r.left, right: r.right }],
    bands: [{ key: 'line', left: r.left + 120 * k, right: r.right, top: r.bottom - 4 * k, bottom: r.bottom + 3 * k, pattern: 'dots' }],
    pills: [{ key: 'device', x: r.left + 90 * k, y: r.bottom + 12 * k, text: String(device * k), ok: device <= 1 }],
    cut: { left: r.left, right: r.right, top: r.bottom - 14 * k, bottom: r.bottom + 14 * k, r: 4 * k },
    subject: { left: r.left - 10 * k, right: r.left + 170 * k, top: r.bottom - 40 * k, bottom: r.bottom + 36 * k },
  };
};

// #39 images get a faint inner outline. A moodboard app's board of glaze tests: each pin is a white card with its
// photo inside. Most photos have edges of their own, but a product shot on a white sweep has none: its edge is the
// card's colour, so the picture has no boundary and the mugs float loose in the card. plumber adds a 10% black outline
// inside the image's edge, which a dark photo hides and a light one needs.
const PINS = [
  { src: ceramic, title: 'Cobalt over honey', note: 'Two dips, cone 6', light: true },
  { src: lake, title: 'Celadon', note: 'The colour to aim for' },
  { src: peak, title: 'Iron speckle', note: 'Reduction, test 3' },
];
function GlazeBoard() {
  // Slate's primitives, with dithered icons and real photos
  return (
    <article className="w-full max-w-[34rem] rounded-card bg-sunken p-4">
      <header className="flex items-center gap-2 px-1 pb-3">
        <LayersIcon size={16} texture="dither" className="text-ink-muted" />
        <span className="text-[15px] font-medium">Glaze tests</span>
      </header>
      <ul className="grid grid-cols-3 gap-3">
        {PINS.map((p) => (
          <li key={p.title} className="flex flex-col gap-2 rounded-control bg-surface p-2 shadow-card">
            <img src={p.src} alt={p.title} width="160" height="160" data-light={p.light || undefined} className="block aspect-square w-full rounded-chip object-cover" />
            <span className="flex flex-col px-0.5 pb-0.5">
              <span className="truncate text-[13px] font-medium">{p.title}</span>
              <span className="truncate text-xs text-ink-muted">{p.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
GlazeBoard.stage = true;
GlazeBoard.names = ['No outline', 'Inner outline'];
GlazeBoard.lesson = {
  why: 'A photo’s edge is drawn by its own pixels. A product shot on a white sweep has none: its border is the card’s white, so the picture has no shape and its subject floats loose in the card.',
  habit: 'Give every image a 1px inner outline at about 10% black (white on dark grounds). Dark photos hide it; light ones get their edge back.',
};
// What the eye sees: the light photo's edge against its card. The pill is how far apart the two are in lightness, out
// of 100: near 0, there's no edge to see.
GlazeBoard.measure = (root) => {
  const img = root?.querySelector('[data-light]');
  if (!img) return null;
  const r = img.getBoundingClientRect(), k = r.width / img.offsetWidth || 1, s = getComputedStyle(img);
  const lined = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  // the edge as painted: the photo's own outer pixels, or the outline over them
  const c = Object.assign(document.createElement('canvas'), { width: 16, height: 16 }).getContext('2d', { willReadFrequently: true });
  c.drawImage(img, 0, 0, 16, 16);
  if (lined) { c.strokeStyle = s.outlineColor; c.lineWidth = 2; c.strokeRect(0, 0, 16, 16); }
  const d = c.getImageData(0, 0, 16, 1).data, edge = [0, 1, 2].map((i) => d[i + 4 * 8] / 255);
  const L = (x) => toLab(x)[0], gap = Math.round(Math.abs(L(edge) - L([1, 1, 1])) * 100);
  return {
    lines: [], off: gap < 4,
    rules: [{ key: 'top', y: r.top, left: r.left, right: r.right }],
    bands: [{ key: 'edge', left: r.left, right: r.right, top: r.top - 4 * k, bottom: r.top + 4 * k, pattern: 'dots' }],
    pills: [{ key: 'gap', x: r.left + r.width / 2, y: r.top - 16 * k, text: String(Math.max(gap, 1) * k), ok: gap >= 4 }],
    cut: { left: r.left - 8 * k, right: r.right + 8 * k, top: r.top - 8 * k, bottom: r.bottom + 8 * k, r: 6 * k },
    subject: { left: r.left - 30 * k, right: r.right + 30 * k, top: r.top - 50 * k, bottom: r.bottom + 30 * k },
  };
};

// #40 continuous corners. A phone's widget picker: large tiles with a 22px border-radius, the way CSS rounds a corner:
// a quarter circle joined to a straight edge. Where they meet the curve starts all at once, and at this size the eye
// sees the kink, a shape that looks pressed from a cookie cutter beside the system's own smooth icons. plumber keeps
// the radius and changes the curve: corner-shape: squircle eases in from the edge.
function Widgets() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[26rem] rounded-sheet bg-sunken p-5">
      <header className="flex items-baseline justify-between pb-4">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Add a widget</span>
        <span className="text-[13px] text-ink-muted">Small</span>
      </header>
      <ul className="grid grid-cols-2 gap-4">
        <li data-widget className="flex aspect-square flex-col justify-between rounded-[22px] bg-accent p-4 text-accent-ink">
          <span className="flex items-center justify-between text-[13px] font-medium"><span>Lisbon</span><SunIcon size={18} texture="dither" /></span>
          <span className="flex flex-col">
            <span className="text-[40px] leading-none font-medium tracking-[-0.03em] tabular-nums">21°</span>
            <span className="pt-1.5 text-xs text-accent-soft">Clear until 6pm</span>
          </span>
        </li>
        <li className="flex aspect-square flex-col justify-between rounded-[22px] bg-surface p-4 shadow-card">
          <span className="text-[13px] leading-none font-medium text-negative">Thursday</span>
          <span className="flex flex-col gap-1">
            <span className="text-[40px] leading-none font-medium tracking-[-0.03em] tabular-nums">6</span>
            <span className="truncate pt-1 text-xs text-ink-muted">Design crit · 9:00</span>
          </span>
        </li>
      </ul>
    </article>
  );
}
Widgets.stage = true;
Widgets.names = ['Round', 'Continuous'];
Widgets.lesson = {
  why: 'border-radius draws a quarter circle, and a circle bends at full strength from its very first point: straight, then suddenly curved. On a small button nobody sees it; at widget size the eye catches the kink where the edge turns, and the tile looks stamped out rather than shaped.',
  habit: 'For large rounded surfaces, ease the curve in: corner-shape: squircle (continuous corners), at the same radius.',
};
// What the eye sees at the first widget's top-left corner: where the straight edge ends and the curve begins. The pill
// is how hard the curve bends at that join, as a share of its tightest bend: a circle starts at full bend (100), a
// squircle at none.
Widgets.measure = (root) => {
  const w = root?.querySelector('[data-widget]');
  if (!w) return null;
  const r = w.getBoundingClientRect(), k = r.width / w.offsetWidth || 1, s = getComputedStyle(w);
  const rad = parseFloat(s.borderTopLeftRadius) * k, round = /^(round|superellipse\(1\))?$/.test(s.getPropertyValue('corner-shape').trim());
  const kink = round ? 100 : 0;
  return {
    lines: [{ key: 'join-x', x: r.left + rad, top: r.top - 10 * k, bottom: r.top + 10 * k }],
    rules: [{ key: 'join-y', y: r.top + rad, left: r.left - 10 * k, right: r.left + 10 * k }],
    bands: [{ key: 'corner', left: r.left, right: r.left + rad, top: r.top, bottom: r.top + rad, pattern: 'hatch' }],
    pills: [{ key: 'kink', x: r.left + rad + 26 * k, y: r.top - 14 * k, text: String(Math.max(kink, 0) * k), ok: !round }],
    off: round,
    // clear of the corner, so a round hole never fights the squircle it frames
    cut: { left: r.left - 10 * k, right: r.right + 10 * k, top: r.top - 10 * k, bottom: r.bottom + 10 * k, r: rad + 10 * k },
    subject: { left: r.left - 30 * k, right: r.left + 110 * k, top: r.top - 40 * k, bottom: r.top + 80 * k },
  };
};

// #42 bold on hover must not move anything. A project tool's view tabs darken and go semibold on hover. Bold letters
// are wider, so the hovered tab grows by a few pixels and every tab after it slides right as the pointer passes:
// the row jitters under the cursor. plumber keeps the hover, as a colour: darker, the same width.
const VIEWS = ['Overview', 'Board', 'Timeline', 'Files', 'Settings'];
function ProjectTabs() {
  // Slate's primitives, with dithered icons
  return (
    <article className="w-full max-w-[30rem] rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <FolderIcon size={16} texture="dither" className="text-ink-muted" />
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Spring launch</span>
      </header>
      <nav aria-label="Views" className="flex gap-5 border-b-hairline border-line px-5">
        {VIEWS.map((v, i) => (
          <a key={v} href={`#${v.toLowerCase()}`} data-tab={i === 1 || undefined} aria-current={i === 0 ? 'page' : undefined}
            className={i === 0 ? '-mb-px border-b-2 border-ink py-2.5 text-sm font-semibold' : 'border-b-2 border-transparent py-2.5 text-sm text-ink-muted hover:font-semibold'}>{v}</a>
        ))}
      </nav>
      <p className="px-5 py-4 text-[13px] text-ink-muted">12 tasks open · 4 due this week</p>
    </article>
  );
}
ProjectTabs.stage = true;
ProjectTabs.names = ['Bold on hover', 'Darker on hover'];
ProjectTabs.lesson = {
  why: 'Bold letters are wider than regular ones. When a tab turns semibold under the pointer it grows a few pixels, and every tab after it slides over: move along the row and the whole row jitters under your cursor.',
  habit: 'Show hover with colour, not weight. If a hover must be bold, reserve the bold width first (a hidden bold copy of the label).',
};
// What the eye sees on hover: the second tab, and how far the tabs after it would move. The pill is the shift, in px.
const WEIGHT = { medium: 500, semibold: 600, bold: 700 };
ProjectTabs.measure = (root) => {
  const tab = root?.querySelector('[data-tab]');
  if (!tab) return null;
  const r = tab.getBoundingClientRect(), k = r.width / tab.offsetWidth || 1;
  const hover = /(?:^|\s)hover:font-(medium|semibold|bold)(?:\s|$)/.exec(tab.className)?.[1];
  let shift = 0;
  if (hover) {
    const copy = tab.cloneNode(true);
    Object.assign(copy.style, { position: 'absolute', visibility: 'hidden', fontWeight: String(WEIGHT[hover]) });
    tab.parentElement.append(copy);
    shift = copy.offsetWidth - tab.offsetWidth;
    copy.remove();
  }
  const next = tab.nextElementSibling.getBoundingClientRect();
  return {
    lines: [{ key: 'next', x: next.left, top: next.top, bottom: next.bottom }, ...(shift ? [{ key: 'moved', x: next.left + shift * k, top: next.top, bottom: next.bottom }] : [])],
    bands: [{ key: 'shift', left: next.left, right: next.left + Math.max(shift, 0) * k, top: next.top + 6 * k, bottom: next.bottom - 6 * k, pattern: 'hatch' }],
    pills: [{ key: 'shift', x: next.left + 10 * k, y: next.top - 12 * k, text: (shift * k).toFixed(1), ok: shift < 0.5 }],
    off: shift >= 0.5,
    cut: { left: r.left - 6 * k, right: next.right + 6 * k, top: r.top, bottom: r.bottom, r: 4 * k },
    subject: { left: r.left - 30 * k, right: next.right + 50 * k, top: r.top - 40 * k, bottom: r.bottom + 30 * k },
  };
};

// #37 never land on half pixels. A reading app's stats chart pins a tooltip beside the hovered point, centred on it
// the usual way: top-1/2 and -translate-y-1/2, half its own height up. Two snug lines make it 46.4px tall, so it moves
// up 23.19px and its words land between pixel rows: every letter is smeared across two, soft beside the sharp labels
// around it. plumber centres it by layout, which lands on whole pixels.
const READERS = [820, 910, 880, 1040, 1284, 1190, 1120];
function ReadersChart() {
  // Slate's primitives, with dithered icons
  const max = 1400, at = 4, x = (i) => (i / (READERS.length - 1)) * 100, y = (v) => 100 - (v / max) * 100;
  return (
    <article className="w-full max-w-[28rem] rounded-card bg-surface shadow-card">
      <header className="flex items-baseline justify-between px-5 pt-4">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Readers this week</span>
        <span className="text-[13px] text-ink-muted tabular-nums">7,244</span>
      </header>
      <div className="relative mx-5 mt-8 mb-5 h-36">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
          <polyline points={READERS.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke="var(--color-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          <line x1={x(at)} x2={x(at)} y1="0" y2="100" stroke="var(--color-line)" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute size-2.5 -translate-1/2 rounded-full border-2 border-surface bg-accent" style={{ left: `${x(at)}%`, top: `${y(READERS[at])}%` }} />
        {/* the tooltip, pinned to the point: a zero-height anchor, and the tip centred on it */}
        <span className="absolute h-0" style={{ left: `${x(at)}%`, top: `${y(READERS[at])}%` }}>
          <span data-tip className="absolute top-1/2 left-3 flex -translate-y-1/2 flex-col rounded-control bg-ink px-2.5 py-1.5 whitespace-nowrap text-surface">
            <span className="text-xs leading-snug text-surface/70">Thu 6 Nov</span>
            <span className="text-[13px] leading-snug font-medium tabular-nums">1,284 readers</span>
          </span>
        </span>
      </div>
    </article>
  );
}
ReadersChart.stage = true;
ReadersChart.names = ['Centred by transform', 'Centred by layout'];
ReadersChart.lesson = {
  why: 'translate moves a box by exactly what you ask, fractions included, and a fraction of a pixel down is a place no pixel row is. Half of a 46.4px tooltip is 23.19px, so its words sit between rows and each letter is smeared across two: soft, beside the sharp labels around it.',
  habit: 'Centre with layout (inset-y-0 my-auto, flex or grid), which lands on whole pixels; translate by whole pixels only.',
};
// What the eye sees: the tooltip's words and the pixel rows they fall between. The pill is how far off the nearest row
// the tooltip sits, in hundredths of a pixel.
ReadersChart.measure = (root) => {
  const tip = root?.querySelector('[data-tip]');
  if (!tip) return null;
  const r = tip.getBoundingClientRect(), k = r.width / tip.offsetWidth || 1;
  const s = getComputedStyle(tip), ty = /%$/.test(s.translate.split(' ')[1] ?? '') ? (parseFloat(s.translate.split(' ')[1]) / 100) * tip.offsetHeight : parseFloat(s.translate.split(' ')[1]) || 0;
  const dpr = devicePixelRatio || 1, frac = Math.abs(ty * dpr - Math.round(ty * dpr)) / dpr, off = Math.round(frac * 100);
  return {
    lines: [], off: off >= 5,
    rules: [{ key: 'top', y: r.top, left: r.left - 8 * k, right: r.right + 8 * k }],
    bands: [{ key: 'words', left: r.left, right: r.right, top: r.top, bottom: r.bottom, pattern: 'dots' }],
    pills: [{ key: 'off', x: r.right + 24 * k, y: r.top, text: String(off * k), ok: off < 5 }],
    cut: { left: r.left - 4 * k, right: r.right + 4 * k, top: r.top - 4 * k, bottom: r.bottom + 4 * k, r: 8 * k },
    subject: { left: r.left - 60 * k, right: r.right + 60 * k, top: r.top - 40 * k, bottom: r.bottom + 40 * k },
  };
};

// #73 scroll-margin-top on anchor targets. A team handbook scrolls in its own pane under a sticky header that holds
// the section links. Jump to "First week" and the browser puts the heading at the very top of the pane, which is
// exactly where the header sits: you land on the section with its title hidden. plumber gives the headings a scroll
// margin the header's height, so a jump stops just below it.
const HANDBOOK = [
  { id: 'before', title: 'Before you start', body: 'You’ll get a laptop and your accounts on the Friday before. Set up two-factor sign-in first; everything else asks for it.' },
  { id: 'first-week', title: 'First week', body: 'Each day has one thing to finish: meet your buddy, ship a small fix, sit in on a design crit, and write down three things that confused you.' },
  { id: 'tools', title: 'Tools', body: 'We plan in the tracker, talk in threads, and keep decisions in the handbook itself, so the reason for a choice outlives the chat about it.' },
  { id: 'people', title: 'People', body: 'Your buddy is your first stop for anything. Your lead sets goals with you at the end of week two.' },
];
const jump = (pane, id) => {
  // what the browser does on a jump to #id: the heading's top, less its scroll margin, at the top of the pane
  const h = pane?.querySelector(`#${id}`);
  if (h) pane.scrollTop = h.offsetTop - (parseFloat(getComputedStyle(h).scrollMarginTop) || 0);
};
function Handbook() {
  // Slate's primitives, with dithered icons
  const pane = useRef(null);
  useEffect(() => jump(pane.current, 'first-week'), []);
  return (
    <article ref={pane} data-pane className="relative h-[20rem] w-full max-w-[28rem] overflow-y-auto rounded-card [scrollbar-gutter:stable] [background:linear-gradient(#ffffff_30%,_transparent)_center_top_/_100%_40px_no-repeat_local,_linear-gradient(transparent,_#ffffff_70%)_center_bottom_/_100%_40px_no-repeat_local,_radial-gradient(farthest-side_at_50%_0,_rgb(0_0_0_/_0.12),_transparent)_center_top_/_100%_12px_no-repeat_scroll,_radial-gradient(farthest-side_at_50%_100%,_rgb(0_0_0_/_0.12),_transparent)_center_bottom_/_100%_12px_no-repeat_scroll,_#ffffff] shadow-card">
      <header data-header className="sticky top-0 z-10 flex flex-col gap-2 border-b-hairline border-line bg-surface/95 px-5 pt-4 pb-2.5 backdrop-blur">
        <span className="flex items-center gap-2 text-[15px] font-medium"><BookIcon size={16} texture="dither" className="text-ink-muted" />Team handbook</span>
        <nav aria-label="Sections" className="-my-0.5 flex gap-4 text-[13px]">
          {HANDBOOK.map((sec) => (
            <a key={sec.id} href={`#${sec.id}`} onClick={(e) => { e.preventDefault(); jump(pane.current, sec.id); }}
              aria-current={sec.id === 'first-week' ? 'location' : undefined} className={`inline-flex min-h-6 items-center ${sec.id === 'first-week' ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'}`}>{sec.title}</a>
          ))}
        </nav>
      </header>
      <div className="flex flex-col gap-6 px-5 pt-5 pb-48">
        {HANDBOOK.map((sec) => (
          <section key={sec.id} className="flex flex-col gap-1.5">
            <h3 id={sec.id} data-target={sec.id === 'first-week' || undefined} className="text-[15px] font-medium">{sec.title}</h3>
            <p className="text-sm leading-relaxed text-ink-muted">{sec.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
Handbook.stage = true;
Handbook.names = ['No scroll margin', 'Scroll margin'];
Handbook.lesson = {
  why: 'A jump to #first-week scrolls the heading to the very top of the scrolling area, and a sticky header lives at the very top too. So every link in the header lands you on a section with its title underneath the header.',
  habit: 'Give anchor targets scroll-margin-top the height of the sticky header (scroll-mt-*), or set scroll-padding-top on what scrolls.',
};
// What the eye sees after the jump: the header's bottom edge and the heading you jumped to. The hatch is the part of
// the heading under the header; the pill is how much of it is hidden, in px.
Handbook.measure = (root) => {
  const pane = root?.querySelector('[data-pane]'), header = pane?.querySelector('[data-header]'), target = pane?.querySelector('[data-target]');
  if (!target) return null;
  jump(pane, target.id);
  const hr = header.getBoundingClientRect(), tr = target.getBoundingClientRect(), k = hr.width / header.offsetWidth || 1;
  const hidden = Math.max(0, Math.round((hr.bottom - tr.top) / k));
  return {
    lines: [],
    rules: [{ key: 'header', y: hr.bottom, left: hr.left, right: hr.right }, { key: 'heading', y: tr.top, left: tr.left, right: tr.left + 140 * k }],
    bands: [{ key: 'hidden', left: tr.left, right: tr.left + 140 * k, top: Math.min(tr.top, hr.bottom), bottom: hr.bottom, pattern: 'hatch' }],
    pills: [{ key: 'hidden', x: tr.left + 170 * k, y: hr.bottom, text: String(hidden * k), ok: hidden === 0 }],
    off: hidden > 0,
    cut: { left: hr.left, right: hr.right, top: hr.top, bottom: Math.max(tr.bottom, hr.bottom) + 30 * k, r: 10 * k },
    subject: { left: hr.left - 20 * k, right: hr.right + 20 * k, top: hr.top - 30 * k, bottom: Math.max(tr.bottom, hr.bottom) + 70 * k },
  };
};

// #74 isolation instead of z-index wars. A projects grid: each cover zooms a little on hover, which lifted it over the
// card's "Live" badge, so someone gave the badge z-[999]. Now the badge beats everything on the page, including the
// app's own Sort menu (z-50): open the menu over the grid and the badge pokes through it. plumber brings the badge
// back to a small number; it only needs to beat its own cover.
const PROJECTS = [
  { name: 'Lakeside cabins', cover: lake, live: true, when: 'Edited 2h ago' },
  { name: 'Valley trail map', cover: valley, when: 'Edited yesterday' },
  { name: 'Summit guide', cover: peak, live: true, when: 'Edited Mon' },
];
function Projects() {
  // Slate's primitives, with dithered icons and real photos
  return (
    <article className="relative w-full max-w-[32rem] rounded-card bg-surface p-4 shadow-card">
      <header className="flex items-center justify-between pb-3">
        <button type="button" aria-expanded="true" className="inline-flex h-8 items-center gap-1.5 rounded-control px-2.5 text-[13px] font-medium ring-1 ring-line ring-inset">Sort: Recent <span aria-hidden="true" className="text-ink-muted">▾</span></button>
        <span className="text-[13px] text-ink-muted">3 projects</span>
      </header>
      {/* the app's menu, open over the grid */}
      <div data-menu role="menu" className="absolute top-14 left-4 z-50 flex w-44 flex-col rounded-card bg-surface p-1 shadow-popover">
        {['Recent', 'Name', 'Created', 'Owner'].map((o) => (
          <button key={o} type="button" role="menuitem" className={`flex h-8 items-center rounded-control px-2.5 text-left text-[13px] ${o === 'Recent' ? 'bg-sunken font-medium' : 'hover:bg-sunken'}`}>{o}</button>
        ))}
      </div>
      <ul className="grid grid-cols-3 gap-3">
        {PROJECTS.map((p, i) => (
          <li key={p.name} className="flex flex-col gap-2">
            <span className="relative block overflow-hidden rounded-control">
              <img src={p.cover} alt="" width="160" height="120" className="aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-105" />
              {p.live ? <span data-badge={i === 0 || undefined} className="absolute top-2 left-2 z-[999] rounded-chip bg-surface px-1.5 py-0.5 text-[11px] font-medium text-positive">Live</span> : null}
            </span>
            <span className="flex flex-col px-0.5">
              <span className="truncate text-[13px] font-medium">{p.name}</span>
              <span className="truncate text-xs text-ink-muted">{p.when}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
Projects.stage = true;
Projects.names = ['z-[999]', 'z-10'];
Projects.lesson = {
  why: 'A z-index isn’t local. The badge only had to sit above its own cover, but 999 puts it above everything that shares its stacking context: the app’s menus, popovers and toasts at 50 lose to a status label.',
  habit: 'Give a component its own stacking context (isolation: isolate) and keep the numbers inside it small: 1, 10. Save high layers for the app’s overlays.',
};
// What the eye sees: the open menu and the badge under it. The hatch is the badge where it shows through the menu;
// the pill is the badge's z-index against the menu's 50.
Projects.measure = (root) => {
  const badge = root?.querySelector('[data-badge]'), menu = root?.querySelector('[data-menu]');
  if (!badge || !menu) return null;
  const b = badge.getBoundingClientRect(), m = menu.getBoundingClientRect(), k = m.width / menu.offsetWidth || 1;
  const z = parseInt(getComputedStyle(badge).zIndex, 10) || 0, through = z > 50;
  return {
    lines: [],
    bands: through ? [{ key: 'through', left: b.left, right: b.right, top: b.top, bottom: b.bottom, pattern: 'hatch' }] : [],
    // on the menu's own edge, level with the badge: outside the shade, beside what it pokes through
    pills: [{ key: 'z', x: m.right + 22 * k, y: b.top + b.height / 2, text: String(z * k), ok: !through }],
    off: through,
    cut: { left: m.left, right: m.right, top: m.top, bottom: m.bottom, r: 10 * k },
    subject: { left: m.left - 30 * k, right: m.right + 60 * k, top: m.top - 30 * k, bottom: m.bottom + 30 * k },
  };
};

// #75 scroll shadows. A share dialog lists the people with access in a box of fixed height. On a Mac (and on phones)
// the scrollbar only appears while you scroll, so at rest the list looks complete: four people, cut off at a row edge
// that reads as the end. plumber draws a soft shadow at the bottom while more are hidden, gone once you reach the end.
const PEOPLE = [
  ['Anika Rao', 'Owner'], ['Jonas Weber', 'Can edit'], ['Priya Nair', 'Can edit'], ['Theo Lambert', 'Can view'],
  ['Mira Okafor', 'Can view'], ['Sana Iqbal', 'Can edit'], ['Leo Brandt', 'Can view'], ['Ines Duarte', 'Can view'],
];
function ShareAccess() {
  // Slate's primitives, with dithered icons
  return (
    <article className="flex w-full max-w-[24rem] flex-col gap-3 rounded-sheet bg-surface p-5 shadow-popover">
      <span className="flex items-center gap-2 text-[15px] leading-none font-medium"><UserIcon size={16} texture="dither" className="text-ink-muted" />Share “Q3 plan”</span>
      <input type="text" aria-label="Add people" placeholder="Add people by name or email" className="h-9 rounded-control bg-transparent px-3 text-base ring-1 md:text-[13px] ring-line outline-none ring-inset placeholder:text-ink-subtle focus-visible:ring-2 focus-visible:ring-accent" />
      <span className="pt-1 text-xs font-medium text-ink-muted">People with access</span>
      <ul data-list className="-mx-2 flex h-48 flex-col overflow-y-auto">
        {PEOPLE.map(([name, role]) => (
          <li key={name} className="flex h-12 shrink-0 items-center gap-3 rounded-control px-2 hover:bg-sunken">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-medium text-accent-deep">{name.split(' ').map((w) => w[0]).join('')}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
            <span className="text-[13px] text-ink-muted">{role}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
ShareAccess.stage = true;
ShareAccess.names = ['No cue', 'Scroll shadows'];
ShareAccess.lesson = {
  why: 'Where scrollbars only appear while you scroll (macOS, phones), a list that ends on a row edge looks finished. Four people show; four more are below, and nothing says so.',
  habit: 'Give every scrolling box a cue at the edge where more is hidden: scroll shadows (background-attachment: local) or a fade, gone at the end.',
};
// What the eye sees: the list's bottom edge, where it cuts off. The hatch is the edge; the pill is how many people are
// below it.
ShareAccess.measure = (root) => {
  const list = root?.querySelector('[data-list]');
  if (!list) return null;
  const r = list.getBoundingClientRect(), k = r.width / list.offsetWidth || 1;
  const hidden = [...list.children].filter((li) => li.getBoundingClientRect().top >= r.bottom - 1).length;
  const cue = /local/.test(getComputedStyle(list).backgroundAttachment) || /gradient/.test(getComputedStyle(list).maskImage);
  return {
    lines: [],
    rules: [{ key: 'edge', y: r.bottom, left: r.left, right: r.right }],
    // the cut-off edge, hatched while nothing says there's more; it closes when the scroll shadow takes its place
    bands: [{ key: 'edge', left: r.left, right: r.right, top: cue ? r.bottom : r.bottom - 14 * k, bottom: r.bottom, pattern: 'hatch' }],
    pills: [{ key: 'hidden', x: r.right - 24 * k, y: r.bottom + 14 * k, text: String(hidden * k), ok: cue }],
    off: !cue,
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, r: 6 * k },
    subject: { left: r.left - 20 * k, right: r.right + 20 * k, top: r.bottom - 120 * k, bottom: r.bottom + 40 * k },
  };
};

// #68 exits faster than entrances. A calendar's event preview opens and closes on one transition: 300ms both ways.
// Coming in, 300ms reads as the popover arriving. Going out, you've already decided (you clicked away, pressed Esc),
// and the same 300ms holds the popover in front of what you want next. plumber gives the close its own, shorter time.
function EventPreview() {
  // Slate's primitives, with dithered icons
  const [open, setOpen] = useState(true);
  return (
    <article className="relative h-[22rem] w-full max-w-[26rem] rounded-card bg-surface shadow-card">
      <header className="flex items-baseline justify-between px-5 pt-4 pb-3">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Thursday</span>
        <span className="text-[13px] text-ink-muted">6 November</span>
      </header>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="mx-5 flex w-[calc(100%-2.5rem)] items-baseline gap-3 rounded-control bg-accent-soft px-3 py-2 text-left">
        <span className="text-[13px] text-accent-deep tabular-nums">9:00</span>
        <span className="text-sm font-medium text-accent-deep">Design crit</span>
      </button>
      <div data-popover data-state={open ? 'open' : 'closed'} role="dialog" aria-label="Design crit"
        className="absolute top-[6.5rem] left-10 flex w-64 origin-top-left flex-col gap-3 rounded-card bg-surface p-4 shadow-popover transition-[opacity,scale] duration-300 ease-arrive data-[state=closed]:pointer-events-none data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100">
        <span className="flex flex-col gap-1">
          <span className="text-[15px] font-medium">Design crit</span>
          <span className="text-[13px] text-ink-muted tabular-nums">9:00 – 9:30 · Studio 2</span>
        </span>
        <span className="text-[13px] text-pretty text-ink-muted">Bring the onboarding flows. We’ll go through the empty states first.</span>
        <span className="flex gap-2">
          <button type="button" className="h-8 rounded-control bg-accent px-3 text-[13px] font-medium text-accent-ink hover:bg-accent-deep">Join</button>
          <button type="button" onClick={() => setOpen(false)} className="h-8 rounded-control px-3 text-[13px] font-medium ring-1 ring-line ring-inset hover:bg-sunken">Close</button>
        </span>
      </div>
    </article>
  );
}
EventPreview.stage = true;
EventPreview.names = ['Same both ways', 'Faster out'];
EventPreview.lesson = {
  why: 'Opening and closing aren’t the same moment. Coming in, 300ms reads as the popover arriving. Going out, you’ve already decided, and the same 300ms keeps it in front of what you want to do next: it feels slow to leave.',
  habit: 'Give the exit its own, shorter duration: about 70% of the entrance (data-[state=closed]:duration-200 against a 300 in).',
};
// What the eye sees: how long the popover takes to arrive and to leave, drawn to scale under it (a bar per 100ms is a
// third of its width). The pill is the exit, in ms.
EventPreview.measure = (root) => {
  const pop = root?.querySelector('[data-popover]');
  if (!pop) return null;
  const r = pop.getBoundingClientRect(), k = r.width / pop.offsetWidth || 1;
  const enter = parseFloat(getComputedStyle(pop).transitionDuration) * 1000;
  const exit = Number(/(?:^|\s)data-\[state=closed\]:duration-(\d+)(?:\s|$)/.exec(pop.className)?.[1] ?? enter);
  const per = (r.width * 0.9) / 300, y0 = r.bottom + 14 * k;
  return {
    lines: [],
    bands: [
      { key: 'in', left: r.left, right: r.left + enter * per, top: y0, bottom: y0 + 6 * k, pattern: 'dots' },
      { key: 'out', left: r.left, right: r.left + exit * per, top: y0 + 14 * k, bottom: y0 + 20 * k, pattern: 'hatch' },
    ],
    pills: [{ key: 'exit', x: r.left + exit * per + 26 * k, y: y0 + 17 * k, text: String(exit * k), ok: exit <= enter * 0.8 }],
    off: exit > enter * 0.8,
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, r: 10 * k },
    subject: { left: r.left - 20 * k, right: r.right + 60 * k, top: r.top - 20 * k, bottom: y0 + 40 * k },
  };
};

// #50 icon strokes keep their weight. A notes app's search: the field's magnifier is a 16px stroked icon, and the empty
// state below draws the same icon at 48px for "no results". A stroke is drawn in the icon's own 24-unit box, so tripling
// the icon triples the line: 4px against the 1.3px of the one in the field, a heavy outline that shouts over the words
// it illustrates. plumber keeps the stroke at the width it's drawn, whatever the size.
function Magnifier({ size, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...rest}>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5 21 21" />
    </svg>
  );
}
function NoNotes() {
  // Slate's primitives, with a stroked icon set (the principle is about strokes)
  return (
    <article className="flex w-full max-w-[24rem] flex-col rounded-card bg-surface shadow-card">
      <label className="m-4 mb-0 flex h-9 items-center gap-2 rounded-control px-3 text-ink-muted ring-1 ring-line ring-inset">
        {/* the set draws its stroke at one width whatever the size (as absoluteStrokeWidth does): 2px here too */}
        <Magnifier size={16} className="[&_*]:[vector-effect:non-scaling-stroke]" />
        <input type="search" defaultValue="offsite budget" aria-label="Search notes" className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none md:text-sm" />
      </label>
      <div data-empty className="flex flex-col items-center gap-3 px-8 pt-10 pb-12 text-center">
        <Magnifier size={48} className="text-ink-subtle" />
        <span className="flex flex-col gap-1">
          <span className="text-[15px] font-medium">No notes match “offsite budget”</span>
          <span className="text-[13px] text-pretty text-ink-muted">Try fewer words, or search in all folders.</span>
        </span>
      </div>
    </article>
  );
}
NoNotes.stage = true;
NoNotes.names = ['Stroke scales', 'Stroke stays'];
NoNotes.lesson = {
  why: 'An icon’s stroke is drawn in its own 24-unit box, so drawing it three times bigger draws the line three times thicker: 4px here, against 1.3px for the same icon in the field. The big one stops matching its set and outweighs the words it sits above.',
  habit: 'Keep the stroke width fixed as icons grow: vector-effect: non-scaling-stroke, or your icon set’s absoluteStrokeWidth.',
};
// What the eye sees: the big magnifier's ring. The band is the stroke's width on the ring's left side; the pill is that
// width in px.
NoNotes.measure = (root) => {
  const svg = root?.querySelector('[data-empty] svg'), ring = svg?.querySelector('circle');
  if (!ring) return null;
  const r = svg.getBoundingClientRect(), k = r.width / svg.clientWidth || 1, cs = getComputedStyle(ring);
  const w = cs.vectorEffect === 'non-scaling-stroke' ? parseFloat(cs.strokeWidth) : parseFloat(cs.strokeWidth) * (svg.clientWidth / 24);
  const c = ring.getBoundingClientRect(), mid = c.top + c.height / 2;
  return {
    lines: [{ key: 'out', x: c.left, top: mid - 14 * k, bottom: mid + 14 * k }, { key: 'in', x: c.left + w * k, top: mid - 14 * k, bottom: mid + 14 * k }],
    bands: [{ key: 'stroke', left: c.left, right: c.left + w * k, top: mid - 14 * k, bottom: mid + 14 * k, pattern: 'hatch' }],
    pills: [{ key: 'stroke', x: c.left - 24 * k, y: mid, text: (w * k).toFixed(1), ok: w <= 2.5 }],
    off: w > 2.5,
    cut: { left: r.left - 6 * k, right: r.right + 6 * k, top: r.top - 6 * k, bottom: r.bottom + 6 * k, r: 10 * k },
    subject: { left: r.left - 70 * k, right: r.right + 50 * k, top: r.top - 40 * k, bottom: r.bottom + 40 * k },
  };
};

// #63 never scale from 0. A docs editor's Insert menu opens from the + beside an empty line, with an entrance written
// the modern way: a transition from its starting style, starting:scale-0. From 0 the menu grows out of a single point:
// for the first frames it's a speck, then a smear of shrunken words, and it reads as appearing from nowhere rather than
// opening from the button. plumber starts it at 95%: it fades in at nearly its size, from the + it belongs to.
const INSERT = [['Heading', FileIcon], ['Table', LayersIcon], ['Chart', ChartIcon], ['Code block', CodeIcon]];
function InsertMenu() {
  // Slate's primitives, with dithered icons
  return (
    <article className="relative h-[19rem] w-full max-w-[26rem] rounded-card bg-surface px-6 pt-5 shadow-card">
      <span className="text-[22px] leading-7 font-medium tracking-[-0.015em]">Offsite plan</span>
      <p className="pt-2 text-sm leading-relaxed text-ink-muted">Two days in Lisbon, the second week of March. The budget covers travel, rooms and one team dinner.</p>
      <span className="flex items-center gap-2 pt-3">
        <button type="button" aria-label="Insert" aria-expanded="true" className="grid size-6 place-items-center rounded-chip text-ink-muted ring-1 ring-line ring-inset hover:bg-sunken"><PlusIcon size={14} texture="solid" /></button>
        <span className="text-sm text-ink-subtle">Type / for blocks</span>
      </span>
      <div data-menu role="menu" className="absolute top-[10.25rem] left-6 flex w-48 origin-top-left flex-col rounded-card bg-surface p-1 shadow-popover transition-[scale,opacity] duration-200 starting:scale-0 starting:opacity-0">
        {INSERT.map(([label, Icon]) => (
          <button key={label} type="button" role="menuitem" className="flex h-8 items-center gap-2.5 rounded-control px-2 text-left text-[13px] hover:bg-sunken"><Icon size={14} texture="dither" className="text-ink-muted" />{label}</button>
        ))}
      </div>
    </article>
  );
}
InsertMenu.stage = true;
InsertMenu.names = ['From 0', 'From 95%'];
InsertMenu.lesson = {
  why: 'Something that grows from scale 0 starts as a point: for its first frames it’s a speck, then a smear of tiny words. Nothing real grows out of nothing, so it reads as appearing from nowhere instead of opening from the button that asked for it.',
  habit: 'Start entrances at 0.9–0.97 with opacity 0, with transform-origin at the trigger. It opens; it doesn’t inflate.',
};
// What the eye sees: the menu, and the box it starts from (drawn from its corner at the +). The hatch is the ground it
// has to grow across; the pill is how much it grows, in percent of its size.
InsertMenu.measure = (root) => {
  const menu = root?.querySelector('[data-menu]');
  if (!menu) return null;
  const r = menu.getBoundingClientRect(), k = r.width / menu.offsetWidth || 1;
  const from = Number(/(?:^|\s)starting:scale-(\d+)(?:\s|$)/.exec(menu.className)?.[1] ?? 100) / 100, grow = Math.round((1 - from) * 100);
  return {
    lines: [],
    rules: [{ key: 'start', y: r.top + r.height * from, left: r.left, right: r.left + r.width * from }],
    bands: [{ key: 'grow', left: r.left + r.width * from, right: r.right, top: r.top, bottom: r.bottom, pattern: 'hatch' }],
    pills: [{ key: 'grow', x: r.right + 26 * k, y: r.top + 14 * k, text: String(grow * k), ok: grow <= 10 }],
    off: grow > 10,
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, r: 10 * k },
    subject: { left: r.left - 30 * k, right: r.right + 60 * k, top: r.top - 40 * k, bottom: r.bottom + 30 * k },
  };
};

// #59 safe triangle for submenus. A design tool's layer menu: ⋯ on the selected layer opens it, Arrange opens a
// submenu to the right. Two sides, two components (the fix is a change of component, not a class):
//   broken  a hand-rolled menu: the submenu closes the moment the pointer enters another item, so the straight way to
//           it, across Group, loses it
//   fixed   Radix's DropdownMenu: a safe triangle from where the pointer left Arrange holds the submenu open
// Both are probed by plumber for real (src/craft-probe.ts, the submenu gesture), and the stage plays back what it did.
const ROWS = [['Rename', '⌘R'], ['Arrange', null], ['Group', '⌘G'], ['Hide', '⇧⌘H'], ['Delete', '⌫']];
const ORDER = ['Bring to front', 'Bring forward', 'Send backward', 'Send to back'];
const menuBox = 'z-10 flex w-42 flex-col rounded-card bg-surface p-1 text-[13px] font-normal text-ink shadow-popover outline-none';
const itemBox = 'flex h-[30px] cursor-default items-center justify-between rounded-control px-2.5 outline-none select-none';
function LayerTool({ children }) {
  return (
    <article data-tool className="relative h-[21rem] w-[40rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex h-10 items-center gap-2 border-b-hairline border-line px-4 text-[13px]"><span className="text-ink-muted">Spring launch /</span><span>Hero</span><span className="ml-auto text-ink-muted tabular-nums">100%</span></header>
      <div className="grid h-[calc(100%-2.5rem)] grid-cols-[11rem_1fr]">
        <div className="flex flex-col gap-px border-r-hairline border-line px-2 py-2.5 text-[13px]">
          <span className="px-2 pb-1.5 text-[11px] font-medium text-ink-subtle">Layers</span>
          <span className="rounded-control px-2 py-1 text-ink-muted">Background</span>
          <span className="flex items-center justify-between rounded-control bg-accent-soft py-1 pr-0.5 pl-2 font-medium text-accent-deep">Hero card{children}</span>
          <span className="rounded-control px-2 py-1 text-ink-muted">Headline</span>
          <span className="rounded-control px-2 py-1 text-ink-muted">Button</span>
        </div>
        <div className="relative bg-sunken">
          <span className="absolute top-10 left-[17rem] h-32 w-36 rounded-[12px] bg-accent outline-[1.5px] outline-offset-[3px] outline-accent" />
        </div>
      </div>
    </article>
  );
}
const MoreButton = (props) => <button type="button" aria-label="More" {...props} className="grid size-6 place-items-center rounded-chip text-accent-deep hover:bg-accent/10 active:bg-accent/15 data-[state=open]:bg-accent/10"><span aria-hidden="true" className="text-[15px] leading-none">⋯</span></button>;

// the broken side: a menu written by hand, the way they usually are
function HandRolledMenu() {
  const [open, setOpen] = useState(true), [sub, setSub] = useState(true), [hot, setHot] = useState(1);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') { setSub(false); setOpen(false); } };
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, []);
  return (
    <span className="relative">
      {/* it opens on the press, as a menu should (#61): this side is wrong in one way, its submenu */}
      <MoreButton aria-haspopup="menu" aria-expanded={open} data-state={open ? 'open' : 'closed'}
        onPointerDown={(e) => { if (e.button === 0) { e.preventDefault(); setOpen((o) => !o); setSub(false); setHot(-1); } }}
        onClick={(e) => { if (e.detail === 0) { setOpen((o) => !o); setSub(false); setHot(-1); } }} />
      {open ? (
        <div role="menu" aria-label="Hero card" className={`${menuBox} absolute top-0 left-[calc(100%+0.5rem)]`}>
          {ROWS.map(([label, key], i) => (
            <div key={label} role="menuitem" tabIndex={-1} aria-haspopup={key === null ? 'menu' : undefined} aria-expanded={key === null ? sub : undefined}
              onPointerEnter={() => { setHot(i); setSub(key === null); }} className={`${itemBox} ${hot === i ? 'bg-sunken' : ''}`}>
              {label}{key === null ? <span aria-hidden="true" className="text-[11px] text-ink-muted">▸</span> : <kbd className="font-sans text-[11.5px] text-ink-muted">{key}</kbd>}
            </div>
          ))}
          {sub ? (
            <div role="menu" aria-label="Arrange" className={`${menuBox} absolute top-[26px] left-[calc(100%-4px)]`}>
              {ORDER.map((label) => <div key={label} role="menuitem" tabIndex={-1} className={`${itemBox} hover:bg-sunken`}>{label}</div>)}
            </div>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}

// the fixed side: Radix's DropdownMenu, the same look; its submenu keeps a safe triangle from where you left Arrange
function RadixMenu() {
  // open at rest like the other side: the menu, and Arrange's submenu
  const [sub, setSub] = useState(true);
  return (
    <Menu.Root defaultOpen modal={false}>
      <Menu.Trigger asChild><MoreButton /></Menu.Trigger>
      <Menu.Content side="right" align="start" sideOffset={8} className={menuBox} aria-label="Hero card">
        {ROWS.map(([label, key]) => key === null ? (
          <Menu.Sub key={label} open={sub} onOpenChange={setSub}>
            <Menu.SubTrigger className={`${itemBox} data-[highlighted]:bg-sunken data-[state=open]:bg-sunken`}>{label}<span aria-hidden="true" className="text-[11px] text-ink-muted">▸</span></Menu.SubTrigger>
            <Menu.SubContent sideOffset={0} alignOffset={-4} className={menuBox} aria-label="Arrange">
              {ORDER.map((o) => <Menu.Item key={o} className={`${itemBox} data-[highlighted]:bg-sunken`}>{o}</Menu.Item>)}
            </Menu.SubContent>
          </Menu.Sub>
        ) : (
          <Menu.Item key={label} className={`${itemBox} data-[highlighted]:bg-sunken`}>{label}<kbd className="font-sans text-[11.5px] text-ink-muted">{key}</kbd></Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}
function LayerMenu({ side = 'broken' }) {
  // Slate's primitives; the two sides differ only in the menu component
  return <LayerTool>{side === 'fixed' ? <RadixMenu /> : <HandRolledMenu />}</LayerTool>;
}
LayerMenu.probe = 'submenu';
LayerMenu.names = ['Hand-rolled menu', 'Radix menu'];
LayerMenu.lesson = {
  why: 'A submenu that closes the moment the pointer touches another item can’t be reached on a diagonal: the straight way there cuts across the item below. You have to steer right, then down, every time.',
  habit: 'Use a menu with a safe triangle (Radix, Base UI, React Aria): from where the pointer left the item to the submenu’s near edge, it holds the submenu open while you head for it.',
};

// #20 one light source. A sprint board: every card rests with the theme's raised shadow, falling straight down. The card
// being dragged gets a bigger, layered shadow to lift it, copied from a shot where the light came from the top left:
// 8px right, 10px down. Now the board has two lights, and the dragged card looks pasted on rather than picked up. plumber reads the
// page's own light from its shadows and turns this one to fall the same way, at the same length.
const COLUMNS = [
  { name: 'To do', cards: [['Pricing page copy', 'AO'], ['Press list, EU', 'LR']] },
  { name: 'In progress', cards: [['Launch film, cut 4', 'JB'], ['Onboarding empty states', 'SP']], drag: 1 },
  { name: 'Done', cards: [['Brand guidelines', 'AO'], ['Keynote outline', 'LR']] },
];
function SprintBoard() {
  // Slate's primitives, with dithered icons
  return (
    <article className="flex w-full max-w-[40rem] flex-col gap-3 rounded-card bg-sunken p-4">
      <header className="flex items-baseline justify-between px-1">
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Sprint 14</span>
        <span className="text-[13px] text-ink-muted">Ends Friday</span>
      </header>
      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map((col) => (
          <section key={col.name} className="flex flex-col gap-2">
            <span className="px-1 text-xs font-medium text-ink-muted">{col.name} <span className="text-ink-subtle tabular-nums">{col.cards.length}</span></span>
            {col.cards.map(([title, who], i) => (
              <div key={title} data-dragged={col.drag === i || undefined}
                className={'flex flex-col gap-2 rounded-control bg-surface px-3 pt-1.5 pb-3 ' + (col.drag === i ? '-translate-y-1 shadow-[2px_3px_6px_rgb(18_35_61/0.12),8px_10px_24px_rgb(18_35_61/0.16)] ring-1 ring-accent/40' : 'shadow-raised')}>
                <span className="text-[13px] leading-5 text-pretty">{title}</span>
                <span className="grid size-5 place-items-center self-end rounded-full bg-accent-soft text-[9px] font-medium text-accent-deep">{who}</span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
SprintBoard.stage = true;
SprintBoard.names = ['A second light', 'One light'];
SprintBoard.lesson = {
  why: 'A shadow says where the light is. Every card on the board casts straight down; the dragged one casts down and to the right, as if a second lamp stood beside it. The eye reads it as pasted on, not lifted.',
  habit: 'Give every shadow on a page the same direction (usually straight down) and change only its size: a lifted thing casts further, not sideways.',
};
// What the eye sees: the dragged card's shadow spilling out to its right side and none on its left. The hatch is that
// spill; the pill is how far the shadow's direction is from the page's light, in degrees.
SprintBoard.measure = (root) => {
  const card = root?.querySelector('[data-dragged]');
  if (!card) return null;
  const r = card.getBoundingClientRect(), k = r.width / card.offsetWidth || 1;
  const cast = getComputedStyle(card).boxShadow.split(/,(?![^(]*\))/).map((l) => (l.replace(/rgba?\([^)]*\)|oklch\([^)]*\)/g, '').match(/-?[\d.]+px/g) ?? []).map(parseFloat)).filter((n) => n.length >= 3 && (n[0] || n[1])).sort((a, b) => Math.hypot(b[0], b[1]) - Math.hypot(a[0], a[1]))[0] ?? [0, 0];
  const angle = Math.round(Math.abs((Math.atan2(cast[0], cast[1]) * 180) / Math.PI)), spill = Math.max(0, cast[0]);
  return {
    lines: [{ key: 'left', x: r.left, top: r.top + 8 * k, bottom: r.bottom + 6 * k }, { key: 'right', x: r.right, top: r.top + 8 * k, bottom: r.bottom + 6 * k }],
    bands: [{ key: 'spill', left: r.right, right: r.right + Math.max(2, spill + 6) * k, top: r.top + 8 * k, bottom: r.bottom + 10 * k, pattern: 'hatch' }],
    pills: [{ key: 'angle', x: r.right + 30 * k, y: r.top - 10 * k, text: String(Math.max(angle, 0.01) * k), ok: angle <= 10 }],
    off: angle > 10,
    cut: { left: r.left - 4 * k, right: r.right + 22 * k, top: r.top - 4 * k, bottom: r.bottom + 26 * k, r: 8 * k },
    subject: { left: r.left - 40 * k, right: r.right + 70 * k, top: r.top - 40 * k, bottom: r.bottom + 50 * k },
  };
};

export const EXAMPLES = { 8: RecentlyPlayed, 1: ClientProfile, 2: InvoiceWalkthrough, 3: Whiteboard, 4: DriveActivity, 5: ChatThread, 6: FitnessToday, 15: IssueTable, 16: Timesheet, 18: NewsFront, 45: LongRead, 46: BoardingPass, 21: Recipe, 25: FeatureCard, 20: SprintBoard, 37: ReadersChart, 38: Agenda, 39: GlazeBoard, 40: Widgets, 42: ProjectTabs, 50: NoNotes, 63: InsertMenu, 73: Handbook, 68: EventPreview, 74: Projects, 75: ShareAccess, 57: Inbox, 59: LayerMenu, 23: ShareMenu, 51: DeleteDialog, 55: Forecast, 56: Destination };

