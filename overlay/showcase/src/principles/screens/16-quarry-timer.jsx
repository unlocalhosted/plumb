import { useEffect, useRef, useState } from 'react';
import tomi from '../../media/people/person-09.jpg';
import arlo from '../../media/people/person-06.jpg';
import ines from '../../media/people/person-01.jpg';
import walt from '../../media/people/person-04.jpg';
import remy from '../../media/people/person-08.jpg';
import spotifyLogo from '../../media/logos/spotify.svg';
import stripeLogo from '../../media/logos/stripe.svg';
import figmaLogo from '../../media/logos/figma.svg';
import notionLogo from '../../media/logos/notion.svg';
import mailchimpLogo from '../../media/logos/mailchimp.svg';

export const n = 16;


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
        <span className="size-[9px]" style={{ background: b.glyph ?? '#fff', mask: `url("${b.logo}") center / contain no-repeat` }} />
      </span>
    </span>
  );
}

export default function Timesheet({ live = true }) {
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

