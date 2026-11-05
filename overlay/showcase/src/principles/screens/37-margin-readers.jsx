// #37 never land on half pixels. Margin, a newsletter platform: Walter Brandt's "Low Water", its readers this week.
// Three figures, the readers drawn as a chart on whole pixels, the pointer resting on Tuesday's spike (the day the post
// went out), the week's posts with their open rates, where the readers came from. Everything pinned to a point on the
// chart (the tooltip, and each y-axis label on its gridline) is centred on it the usual way: top-1/2 -translate-y-1/2,
// half its own height up. Half of 46.375px or 16.5px isn't a whole pixel, so their words land between pixel rows and
// each letter smears across two. plumber centres them by layout, which lands on whole pixels.
import { useLayoutEffect, useRef, useState } from 'react';
import causeway from '../../media/s37-causeway.jpg';
import harbour from '../../media/s37-harbour.jpg';
import blueskyLogo from '../../media/logos/bluesky.svg';
import googleLogo from '../../media/logos/google.svg';
import redditLogo from '../../media/logos/reddit.svg';

export const n = 37;

// readers a day, Fri 31 Oct to Thu 6 Nov; the pointer rests on Tuesday, the day the post went out
const READERS = [820, 910, 880, 1040, 1284, 1190, 1120];
const DAYS = ['Fri 31', 'Sat 1', 'Sun 2', 'Mon 3', 'Tue 4', 'Wed 5', 'Thu 6'];
const AT = 4, MAX = 1400, H = 140, LEFT = 44;
const KPIS = [['Readers', '7,244', '+18%', true], ['Open rate', '61.4%', '+2.1'], ['New subscribers', '132', '+40']];
const POSTS = [
  { title: 'The Roman road at spring tide', when: 'Tue 4 Nov', sent: '4,790', open: 68, cover: causeway },
  { title: 'The harbour after dark', when: 'Sat 1 Nov', sent: '4,761', open: 57, cover: harbour },
  { title: 'Reader mail: your tide tables', when: 'Fri 31 Oct', sent: '4,744', open: 49 },
];
const ENVELOPE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M1 3h14v10H1z M1 3l7 5.5L15 3" fill="none" stroke="black" stroke-width="1.8" stroke-linejoin="round"/></svg>');
const SOURCES = [['Email', 64, 'var(--color-accent)', ENVELOPE], ['Bluesky', 14, '#0085ff', blueskyLogo], ['Google', 9, '#34a853', googleLogo], ['Reddit', 6, '#ff4500', redditLogo], ['Direct', 7, '#c3cad5']];

// a label pinned to a point on the chart: a zero-height anchor at the point, the label centred on it
const Pin = ({ x, y, className = '', children, ...rest }) => (
  <span className="absolute h-0" style={{ left: x, top: y }}>
    <span {...rest} className={'absolute top-1/2 -translate-y-1/2 ' + className}>{children}</span>
  </span>
);
// a smooth line through the points, flat at each one
const curve = (p) => p.map(([a, b], i) => {
  if (!i) return `M${a},${b}`;
  const [pa, pb] = p[i - 1], c = (a - pa) / 2;
  return `C${pa + c},${pb} ${a - c},${b} ${a},${b}`;
}).join(' ');

function Chart() {
  const box = useRef(null);
  const [w, setW] = useState(452);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  // whole pixels everywhere: the points, the gridlines, the anchors
  const x = (i) => LEFT + 12 + Math.round((i / (READERS.length - 1)) * (w - LEFT - 36));
  const y = (v) => Math.round(H - (v / MAX) * H);
  const pts = READERS.map((v, i) => [x(i), y(v)]);
  return (
    <div ref={box} className="relative mx-6 h-[196px] pt-8">
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} className="absolute top-8 left-0 overflow-visible" aria-hidden="true">
        <defs><linearGradient id="readers-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#5550d8" stopOpacity="0.16" /><stop offset="1" stopColor="#5550d8" stopOpacity="0" /></linearGradient></defs>
        {[0, 500, 1000].map((v) => <line key={v} x1={LEFT} x2={w} y1={y(v) + 0.5} y2={y(v) + 0.5} className="stroke-[rgb(18_35_61/0.08)] [stroke-dasharray:2_3]" />)}
        <path d={`${curve(pts)} L${pts.at(-1)[0]},${H} L${pts[0][0]},${H} Z`} fill="url(#readers-fill)" />
        <line x1={x(AT) + 0.5} x2={x(AT) + 0.5} y1={y(READERS[AT])} y2={H} className="stroke-[rgb(18_35_61/0.22)] [stroke-dasharray:2_3]" />
        <path d={curve(pts)} fill="none" className="stroke-accent" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="absolute top-8 left-0 h-[140px] w-8">
        {[0, 500, 1000].map((v) => <Pin key={v} x={0} y={y(v)} className="left-0 w-8 text-right text-[11px] text-ink-subtle tabular-nums">{v.toLocaleString('en')}</Pin>)}
      </span>
      <span className="absolute top-8 right-0 left-0 h-[140px]">
        <span className="absolute -mt-1.5 -ml-1.5 size-3 rounded-full bg-accent shadow-[0_0_0_2.5px_var(--color-surface),0_0_0_6px_rgb(85_80_216/0.18)]" style={{ left: x(AT), top: y(READERS[AT]) }} />
        {/* the tooltip, pinned to the point, on its left (on its right it would run off the card) */}
        <Pin x={x(AT)} y={y(READERS[AT])} data-tip className="right-3.5 flex flex-col rounded-control bg-ink px-2.5 py-1.5 whitespace-nowrap text-white shadow-[0_2px_4px_rgb(18_35_61/0.08),0_6px_16px_rgb(18_35_61/0.16)]">
          <span className="text-xs leading-snug text-[#b9c2d0]">Tue 4 Nov · post sent</span>
          <span className="text-[13px] leading-snug font-medium tabular-nums">1,284 readers<span className="ml-1 text-[#8fe0bd]">+23%</span></span>
        </Pin>
      </span>
      {/* the day the post went out, on the axis */}
      <span aria-label="Post sent" className="absolute top-[162px] -ml-2.5 grid size-5 place-items-center rounded-full bg-surface text-accent shadow-[0_0_0_1px_rgb(85_80_216/0.3)]" style={{ left: x(AT) }}>
        <svg viewBox="0 0 16 16" className="size-[11px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 3.5h13v9h-13z M1.5 3.5 8 8.5l6.5-5" /></svg>
      </span>
      <span className="absolute top-[178px] right-0 left-0 h-4 text-[11px] leading-4 text-ink-subtle">
        {DAYS.map((d, i) => <span key={d} className={'absolute -translate-x-1/2 whitespace-nowrap ' + (i === AT ? 'font-semibold text-ink' : '')} style={{ left: x(i) }}>{d}</span>)}
      </span>
    </div>
  );
}

const Mark = ({ className }) => <span className={'grid shrink-0 place-items-center bg-[#1d2a3a] font-serif font-semibold text-[#f3eee4] ' + className}>L</span>;

export default function MarginReaders() {
  return (
    <article className="w-full max-w-[31.25rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-3 px-6 pt-5">
        <Mark className="size-9 rounded-[8px] text-[21px] leading-none" />
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] leading-5 font-medium tracking-[-0.01em]">Low Water</span>
          <span className="text-[13px] whitespace-nowrap text-ink-muted">Walter Brandt · <span className="tabular-nums">4,812</span> subscribers</span>
        </span>
        <span role="group" aria-label="Period" className="ml-auto flex shrink-0 gap-0.5 rounded-control bg-sunken p-0.5">
          {['7 days', '30 days', '90 days'].map((p, i) => (
            <button key={p} type="button" aria-pressed={i === 0} className={'h-6 rounded-chip px-2 text-xs font-medium whitespace-nowrap ' + (i === 0 ? 'bg-surface text-ink shadow-raised' : 'text-ink-muted hover:text-ink')}>{p}</button>
          ))}
        </span>
      </header>

      {/* three figures; Readers is the one the chart draws */}
      <dl className="mx-6 mt-[18px] grid grid-cols-3 border-b-hairline border-line">
        {KPIS.map(([label, value, delta, on], i) => (
          <div key={label} className={'relative pb-3 ' + (i ? 'pl-4' : '')}>
            <dt className="text-xs font-medium text-ink-subtle">{label}</dt>
            <dd className="mt-0.5 flex items-baseline gap-1.5 text-[22px] leading-7 font-semibold tracking-[-0.015em] tabular-nums">
              {value}<span className="text-xs font-medium tracking-normal text-positive">{delta}</span>
            </dd>
            {on ? <span className="absolute right-4 bottom-0 left-0 h-0.5 rounded-full bg-accent" /> : null}
          </div>
        ))}
      </dl>

      <Chart />

      <section className="border-t-hairline border-line px-6 pt-3.5 pb-1">
        <h3 className="flex justify-between pb-1 text-xs font-medium text-ink-subtle"><span>Posts this week</span><span>Opened</span></h3>
        <ul>
          {POSTS.map((p) => (
            <li key={p.title} className="grid grid-cols-[2.5rem_1fr_6rem_2.75rem] items-center gap-3 border-b-hairline border-line py-2 last:hairline-none">
              {p.cover ? <img src={p.cover} alt="" className="block size-10 rounded-control object-cover outline-1 -outline-offset-1 outline-black/10" />
                : <Mark className="size-10 rounded-control text-lg leading-none" />}
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{p.title}</span>
                <span className="truncate text-[12.5px] text-ink-muted">{p.when} · sent to <span className="tabular-nums">{p.sent}</span></span>
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-sunken"><span className="block h-full rounded-full bg-accent" style={{ width: `${p.open}%` }} /></span>
              <span className="text-right text-[13px] font-medium tabular-nums">{p.open}%</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t-hairline border-line bg-sunken px-6 pt-3.5 pb-[18px]">
        <h3 className="flex justify-between text-xs font-medium text-ink-subtle"><span>Where readers came from</span><span><span className="tabular-nums">7%</span> came direct</span></h3>
        <span className="my-2 mb-3 flex h-2.5 gap-0.5">{SOURCES.map(([s, pct, c]) => <i key={s} className="h-full rounded-[3px]" style={{ flex: pct, background: c }} />)}</span>
        <ul className="flex flex-wrap justify-between gap-x-3 gap-y-1.5 text-xs text-ink-muted">
          {SOURCES.filter((s) => s[3]).map(([s, pct, c, logo]) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className="grid size-4 place-items-center rounded-chip" style={{ background: c }}><span className="size-[9px] bg-white" style={{ mask: `url("${logo}") center / contain no-repeat` }} /></span>
              {s} <span className="font-medium text-ink tabular-nums">{pct}%</span>
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
}
MarginReaders.stage = true;
MarginReaders.names = ['Centred by transform', 'Centred by layout'];
MarginReaders.lesson = {
  why: 'translate moves a box by exactly what you ask, fractions included, and a fraction of a pixel down is a place no pixel row is. Half of the 46.4px tooltip is 23.19px, half of each 16.5px axis label 8.25px, so their words sit between rows and every letter smears across two: soft, beside the sharp figures around them.',
  habit: 'Centre with layout (inset-y-0 my-auto, flex or grid), which lands on whole pixels; translate by whole pixels only.',
};
// What the eye sees: the tooltip's words and the pixel rows they fall between. The pill is how far off the nearest row
// the tooltip sits, in hundredths of a pixel.
MarginReaders.measure = (root) => {
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
