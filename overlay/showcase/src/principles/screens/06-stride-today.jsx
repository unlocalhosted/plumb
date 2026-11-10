// #6 text of different sizes side by side shares a baseline. Stride's Today, Thursday at 4 pm, after a morning run:
// the step count, steps by the hour, three readings with their week, the run on a map. Every figure with its unit is
// one component (a reading), in a row centred the default way (items-center). Centring lines up the middles of the two
// boxes, and boxes of different sizes keep their baselines at different heights, so every unit floats above its
// figure's baseline. plumber's fix sets them on one baseline, in every reading at once.
import { BoltIcon, HeartIcon, PathIcon } from '@unlocalhosted/dither-icons';

export const n = 6;

// a figure and its unit: one place in the code, at two sizes
const Reading = ({ value, unit, big }) => (
  <span data-reading className="flex items-center gap-1">
    <span className={big ? 'text-[44px] leading-none font-medium tracking-[-0.025em] tabular-nums' : 'text-[22px] leading-7 font-medium tracking-[-0.01em] tabular-nums'}>{value}</span>
    <span className="text-[13px] leading-5 text-ink-muted">{unit}</span>
  </span>
);

// steps by the hour from 6 am, as a share of the run's hour; the rest of the day is still to come
const HOURS = [6, 100, 42, 18, 12, 22, 48, 30, 14, 26, 9];
const LATER = 7;
const STATS = [
  { Icon: BoltIcon, label: 'Active', value: '46', unit: 'min', week: '0,16 16,12 33,18 50,9 66,14 83,11 100,4', note: 'Best this week' },
  { Icon: PathIcon, label: 'Distance', value: '6.2', unit: 'km', week: '0,12 16,15 33,8 50,13 66,17 83,10 100,7', note: 'Avg 5.4 km' },
  { Icon: HeartIcon, label: 'Resting', value: '58', unit: 'bpm', week: '0,8 16,10 33,9 50,12 66,11 83,13 100,14', note: 'Down 2 this week', tone: 'var(--color-negative)' },
];
const RUN = [['5.1 km', 'distance'], ['27:42', 'time'], ['5:26 /km', 'pace'], ['148 bpm', 'average']];
// heart-rate zones, minutes in each: the run's own colours, cool to hot
const ZONES = [[8, '#c9d6ea'], [22, '#8fb0e0'], [46, '#5550d8'], [18, '#e9973a'], [6, '#b02a3a']];
const ROUTE = 'M70 92C90 70 120 58 150 60s70 2 110-8 40-30 60-30 30 24 20 44-60 40-120 42-110 4-150-16z';

export default function Today() {
  return (
    <article className="w-full max-w-[27.5rem] rounded-card bg-surface shadow-card">
      <div className="flex flex-col gap-5 p-6">
        <header className="flex items-baseline justify-between">
          <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Today</span>
          <span className="text-[13px] text-ink-muted">Thursday, 5 November</span>
        </header>

        <section className="flex flex-col gap-3.5">
          <Reading value="8,421" unit="steps" big />
          <div className="flex flex-col gap-1.5">
            <div className="relative grid h-16 grid-cols-[repeat(18,1fr)] items-end gap-[3px]" role="img" aria-label="Steps by the hour, 6 am to midnight: the most at 7 am, during the run">
              {HOURS.map((h, i) => <i key={i} className={'block rounded-[2px] ' + (i === 1 ? 'bg-accent-deep' : 'bg-accent')} style={{ height: `${h}%` }} />)}
              {Array.from({ length: LATER }, (_, i) => <i key={'l' + i} className="block h-1 rounded-[2px] bg-sunken" />)}
              <span aria-hidden="true" className="absolute inset-x-0 bottom-[34%] h-px bg-[repeating-linear-gradient(90deg,rgb(18_35_61/0.3)_0_3px,transparent_3px_6px)]" />
              <span aria-hidden="true" className="absolute right-0 bottom-[calc(34%+3px)] bg-surface pl-1 text-[11px] leading-[14px] text-ink-subtle">your usual pace</span>
            </div>
            <div className="flex justify-between text-[11px] leading-[14px] text-ink-subtle"><span>6 am</span><span>noon</span><span>6 pm</span><span>midnight</span></div>
          </div>
          <p className="text-[13px] text-ink-muted"><b className="font-medium text-ink">84%</b> of your 10,000 goal · 1,579 to go, about 15 minutes’ walk</p>
        </section>

        <ul className="grid grid-cols-3 gap-3 border-t-hairline border-line pt-4">
          {STATS.map(({ Icon, label, value, unit, week, note, tone }) => (
            <li key={label} className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted"><Icon size={14} texture="dither" />{label}</span>
              <Reading value={value} unit={unit} />
              <svg aria-hidden="true" viewBox="0 0 100 22" preserveAspectRatio="none" className="mt-0.5 h-[22px] w-full overflow-visible">
                <polyline points={week} fill="none" stroke={tone ?? 'var(--color-accent)'} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              <span className="text-[11.5px] leading-[14px] text-ink-subtle">{note}</span>
            </li>
          ))}
        </ul>

        <section className="flex flex-col gap-3 border-t-hairline border-line pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Morning run</span>
            <span className="text-[12.5px] text-ink-muted">7:02 am · Riverside loop</span>
          </div>
          <div className="h-[136px] overflow-hidden rounded-control shadow-[inset_0_0_0_0.5px_rgb(18_35_61/0.14)]">
            <svg aria-label="The route: a loop from the park, along the river and back" viewBox="0 0 392 136" preserveAspectRatio="xMidYMid slice" className="block size-full">
              <rect width="392" height="136" fill="#f1f2ee" />
              <path d="M150 0h120v60c-20 10-60 14-120 6z" fill="#dfeedd" />
              <path d="M-10 108C60 92 110 118 180 104S300 70 402 86v20C300 92 250 128 180 124S60 112-10 128z" fill="#cfe0f3" />
              <path d="M0 18h392M200 0v70M95 40v60M230 78v30" stroke="#fff" strokeWidth="2.5" vectorEffect="non-scaling-stroke" fill="none" />
              <path d="M0 40h392M0 78h392M60 0v136M130 0l20 136M290 0v136M350 0l-30 136" stroke="#fff" strokeWidth="5" vectorEffect="non-scaling-stroke" fill="none" strokeLinecap="round" />
              <path d={ROUTE} fill="none" stroke="#fff" strokeWidth="7" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
              <path d={ROUTE} fill="none" stroke="#5550d8" strokeWidth="3.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
              <circle cx="70" cy="92" r="6" fill="#0f6f58" stroke="#fff" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
              <circle cx="330" cy="48" r="4" fill="#fff" stroke="#5550d8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {RUN.map(([v, l]) => <span key={l} className="flex flex-col text-sm font-medium tabular-nums">{v}<span className="text-xs font-normal text-ink-muted">{l}</span></span>)}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex h-1.5 gap-0.5" role="img" aria-label="Heart rate zones: mostly hard, 46 minutes">
              {ZONES.map(([m, c]) => <i key={c} className="rounded-[2px]" style={{ flex: m, background: c }} />)}
            </div>
            <div className="flex justify-between text-[11px] leading-[14px] text-ink-subtle"><span>Easy</span><span>Steady, 13 min</span><span>Hard</span></div>
          </div>
        </section>
      </div>
    </article>
  );
}
Today.stage = true;
Today.names = ['Centred', 'Baseline'];
Today.lesson = {
  why: 'items-center lines up the middles of two boxes. A 44px figure and a 13px unit keep their baselines at very different heights in boxes that size, so the unit floats beside the figure instead of sitting on its line, in every reading.',
  habit: 'Text of different sizes side by side sits on one baseline: items-baseline. Centre boxes, not words.',
};
// What the eye sees on every reading: the figure's baseline and the unit's, carried across; the hatch is the gap.
// The pill is the big reading's gap, in px.
let ctx;
Today.measure = (root) => {
  const rows = [...(root?.querySelectorAll('[data-reading]') ?? [])];
  if (!rows.length) return null;
  const k = rows[0].getBoundingClientRect().width / rows[0].offsetWidth || 1;
  const base = (el) => {
    const s = getComputedStyle(el), r = document.createRange(); r.selectNodeContents(el); const q = r.getClientRects()[0];
    ctx ??= document.createElement('canvas').getContext('2d');
    ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const m = ctx.measureText('H');
    return { y: q.top + ((q.height / k - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent) * k, left: q.left, right: q.right };
  };
  const rules = [], bands = [];
  let big = null;
  rows.forEach((row, i) => {
    const [fig, unit] = [...row.children].map(base);
    rules.push({ key: `fig${i}`, y: fig.y, left: fig.left - 8 * k, right: unit.right + 10 * k }, { key: `unit${i}`, y: unit.y, left: unit.left - 4 * k, right: unit.right + 10 * k });
    bands.push({ key: `gap${i}`, left: unit.left, right: unit.right, top: Math.min(fig.y, unit.y), bottom: Math.max(fig.y, unit.y), pattern: 'hatch' });
    big ??= { fig, unit, off: (fig.y - unit.y) / k, row };
  });
  const { fig, unit, off, row } = big, r = row.getBoundingClientRect();
  return {
    lines: [], rules, bands, off: Math.abs(off) > 1,
    pills: [{ key: 'off', x: unit.right + 26 * k, y: (fig.y + unit.y) / 2, text: (Math.abs(off) * k).toFixed(1), ok: Math.abs(off) <= 1 }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, r: 4 * k },
    subject: { left: fig.left - 30 * k, right: unit.right + 70 * k, top: fig.y - 70 * k, bottom: fig.y + 40 * k },
  };
};
