// #55 gradients mix in OKLCH. Isobar, a weather app's Lisbon card on a Thursday afternoon: now, the next twelve hours,
// and ten days, each day's range a bar on one shared 7–24° scale, running from a cool blue to a warm orange. The bars
// are a plain CSS gradient, as design tools export it, so they mix in sRGB, and a blue and an orange pass through
// grey on the way: every one of the ten sags into a dull middle. plumber mixes them in OKLCH.
import { local } from '../Film.jsx';

export const n = 55;

// Isobar's ramp ends; its own accent is the cold end, deepened for words and the curve
const COLD = '#1b9fd0', WARM = '#f28c28', BRAND = '#0b6b91', RAIN = '#2a78c8', SUN = '#f5b324', CLOUD = '#b8c2cf';
const SCALE = { low: 7, high: 24 };

// the weather, drawn: filled shapes in the sky's own colours (a picture of the day, not a control)
// drawn bigger (the sun beside the temperature), the rays stay a little lighter than the picture grows
const Sky = ({ kind, size = 20, ray = size > 20 ? 1.4 : 1.6 }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" className="shrink-0">
    {kind === 'sun' ? <><circle cx="10" cy="10" r="4" fill={SUN} /><path d="M10 1.8v1.6M10 16.6v1.6M1.8 10h1.6M16.6 10h1.6M4.2 4.2l1.1 1.1M14.7 14.7l1.1 1.1M4.2 15.8l1.1-1.1M14.7 5.3l1.1-1.1" stroke={SUN} strokeWidth={ray} strokeLinecap="round" /></> : null}
    {kind === 'part' ? <><circle cx="8" cy="8" r="3.6" fill={SUN} /><path d="M8 1.5v1.3M1.5 8h1.3M3.4 3.4l.9.9M12.6 3.4l-.9.9" stroke={SUN} strokeWidth="1.5" strokeLinecap="round" /><path d="M6.5 17h8.2a3 3 0 0 0 .3-6 4.2 4.2 0 0 0-8 .9A2.6 2.6 0 0 0 6.5 17Z" fill={CLOUD} stroke="#fff" strokeWidth="1" /></> : null}
    {kind === 'cloud' ? <path d="M5.5 15.5h9.4a3.2 3.2 0 0 0 .3-6.4 4.6 4.6 0 0 0-8.8 1A2.8 2.8 0 0 0 5.5 15.5Z" fill={CLOUD} /> : null}
    {kind === 'rain' ? <><path d="M5.5 12h9.4a3.2 3.2 0 0 0 .3-6.4 4.6 4.6 0 0 0-8.8 1A2.6 2.6 0 0 0 5.5 12Z" fill={CLOUD} /><path d="M7 14.5l-.8 2M10.5 14.5l-.8 2M14 14.5l-.8 2" stroke={RAIN} strokeWidth="1.6" strokeLinecap="round" /></> : null}
  </svg>
);

// the next twelve hours, every two
const HOURS = [{ at: 'Now', t: 19 }, { at: '18', t: 18 }, { at: '20', t: 16 }, { at: '22', t: 14 }, { at: '00', t: 13, rain: 10 }, { at: '02', t: 12, rain: 20 }, { at: '04', t: 13, rain: 20 }];
const W = 392, H = 76, top = 14, bottom = 63;
const hx = (i) => 28 + i * 56, hy = (t) => top + ((19 - t) / 7) * (bottom - top);
// a smooth curve through the hours (Catmull-Rom as cubic Béziers)
const curve = (() => {
  const p = HOURS.map((h, i) => [hx(i), hy(h.t)]);
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const [a, b, c, e] = [p[i - 1] ?? p[i], p[i], p[i + 1], p[i + 2] ?? p[i + 1]];
    d += ` C ${(b[0] + (c[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (c[1] - a[1]) / 6).toFixed(1)}, ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)} ${(c[1] - (e[1] - b[1]) / 6).toFixed(1)}, ${c[0]} ${c[1]}`;
  }
  return d;
})();

const DAYS = [
  { day: 'Today', sky: 'sun', low: 12, high: 21, now: 19 },
  { day: 'Fri', sky: 'part', low: 13, high: 22 },
  { day: 'Sat', sky: 'cloud', rain: 40, low: 12, high: 19 },
  { day: 'Sun', sky: 'rain', rain: 90, low: 9, high: 16 },
  { day: 'Mon', sky: 'rain', rain: 60, low: 7, high: 15 },
  { day: 'Tue', sky: 'part', rain: 10, low: 8, high: 18 },
  { day: 'Wed', sky: 'sun', low: 10, high: 20 },
  { day: 'Thu', sky: 'sun', low: 13, high: 23 },
  { day: 'Fri', sky: 'sun', low: 14, high: 24 },
  { day: 'Sat', sky: 'part', low: 13, high: 22 },
];
const at = (t) => (t - SCALE.low) / (SCALE.high - SCALE.low);
const pct = (x) => `${(x * 100).toFixed(1)}%`;
// plumber's fix (craft-rules.js gradient-space): the same gradient, mixed in OKLCH
const FIXED = `linear-gradient(90deg in oklch, ${COLD}, ${WARM})`;

export default function Forecast({ side = 'broken' }) {
  return (
    <article className="w-full max-w-[27rem] overflow-hidden rounded-card bg-surface shadow-card">
      <header className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 pt-[18px] pb-1.5">
        <span className="flex flex-col">
          <span className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em]">
            <svg viewBox="0 0 16 16" className="size-3" fill={BRAND} aria-hidden="true"><path d="M14.4 1.6 1.9 6.9c-.5.2-.4.9.1 1l5.1 1 1 5.1c.1.5.8.6 1 .1l5.3-12.5Z" /></svg>
            Lisbon
          </span>
          <span className="text-xs text-ink-muted tabular-nums">Thursday, 15:40 · updated 4 min ago</span>
        </span>
        <span className="col-start-2 row-span-2 flex items-center gap-2.5">
          <span className="grid place-items-center"><Sky kind="sun" size={40} /></span>
          <span className="text-[52px] leading-none font-normal tracking-[-0.04em] tabular-nums">19°</span>
        </span>
        <span className="mt-1.5 text-[13px] text-ink-muted"><b className="font-medium text-ink">Clear</b> · feels like 18° · <span className="tabular-nums">H 21° L 12°</span></span>
        <span role="note" className="col-span-2 mt-2.5 flex items-center gap-2 rounded-control bg-caution-soft px-2.5 py-[7px] text-[12.5px] leading-[17px] text-caution">
          <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="currentColor" aria-hidden="true"><path d="M8 1.5c.4 0 .7.2.9.5l5.9 10.6c.4.7-.1 1.4-.9 1.4H2.1c-.8 0-1.3-.7-.9-1.4L7.1 2c.2-.3.5-.5.9-.5Zm0 4c-.4 0-.7.3-.7.7v3c0 .4.3.7.7.7s.7-.3.7-.7v-3c0-.4-.3-.7-.7-.7Zm0 6.8a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Z" /></svg>
          Heavy rain from Saturday night, up to 18 mm by Sunday
        </span>
      </header>

      {/* the next twelve hours, a curve through the temperatures */}
      <section aria-label="Next 12 hours" className="relative px-5 pt-2 pb-3.5">
        <span className="relative block h-[76px]">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
            <path d={`${curve} L ${hx(6)} ${H} L ${hx(0)} ${H} Z`} fill="rgb(27 159 208 / 0.08)" />
            <path d={curve} fill="none" stroke={BRAND} strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {HOURS.map((h, i) => (
            <span key={h.at} className="absolute -translate-x-1/2 text-[11px] font-semibold tabular-nums" style={{ left: pct(hx(i) / W), top: `${hy(h.t) - 19}px` }}>{h.t}°</span>
          ))}
          <span className="absolute -mt-[3.5px] -ml-[3.5px] size-[7px] rounded-full bg-surface" style={{ left: pct(hx(0) / W), top: `${hy(19)}px`, boxShadow: `0 0 0 1.75px ${BRAND}` }} />
        </span>
        <span className="mt-1 grid grid-cols-7 text-center text-[11px] leading-[14px] text-ink-subtle tabular-nums">
          {HOURS.map((h, i) => <span key={h.at} className={i ? '' : 'font-semibold text-ink'}>{h.at}</span>)}
        </span>
        <span className="mt-0.5 grid h-3.5 grid-cols-7 text-center text-[10px] leading-[14px] font-medium tabular-nums" style={{ color: RAIN }}>
          {HOURS.map((h) => <span key={h.at}>{h.rain ? `${h.rain}%` : ''}</span>)}
        </span>
      </section>

      <section aria-label="10 days" className="border-t-hairline border-line px-5 pt-1 pb-1.5">
        <h3 className="flex justify-between pt-3 pb-1 text-xs font-medium text-ink-muted">10 days<span className="tabular-nums">{SCALE.low}° to {SCALE.high}°</span></h3>
        <ul>
          {DAYS.map((d, i) => (
            <li key={d.day + i} className="grid h-[38px] grid-cols-[44px_22px_30px_28px_1fr_28px] items-center gap-2.5 border-b-hairline border-line text-sm last:hairline-none">
              <span className="font-medium">{d.day}</span>
              <Sky kind={d.sky} />
              <span className="text-[11px] font-medium tabular-nums" style={{ color: RAIN }}>{d.rain ? `${d.rain}%` : ''}</span>
              <span className="text-right text-ink-muted tabular-nums">{d.low}°</span>
              <span className="relative h-1.5 rounded-[3px] bg-sunken">
                {/* the range on the shared scale, its gradient as a design tool exports it */}
                <span data-range className="absolute inset-y-0 rounded-[3px] bg-[linear-gradient(90deg,#1b9fd0,#f28c28)]" style={{ left: pct(at(d.low)), right: pct(1 - at(d.high)), ...(side === 'fixed' ? { backgroundImage: FIXED } : null) }} />
                {d.now ? <span className="absolute top-1/2 -mt-[5px] -ml-[5px] size-2.5 rounded-full bg-surface shadow-[0_0_0_1.5px_var(--color-ink),0_1px_2px_rgb(18_35_61/0.3)]" style={{ left: pct(at(d.now)) }} /> : null}
              </span>
              <span className="font-medium tabular-nums">{d.high}°</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="grid grid-cols-3 divide-x-hairline border-t-hairline border-line bg-sunken">
        <span className="flex flex-col pt-2.5 pr-3.5 pb-3 pl-5">
          <span className="text-[11px] font-medium text-ink-subtle">Sunset</span>
          <span className="mt-0.5 text-sm font-medium tabular-nums">17:31 <span className="text-xs font-normal text-ink-muted">· 1h 51m</span></span>
        </span>
        <span className="flex flex-col px-3.5 pt-2.5 pb-3">
          <span className="text-[11px] font-medium text-ink-subtle">UV index</span>
          <span className="mt-0.5 text-sm font-medium tabular-nums">3 <span className="text-xs font-normal text-ink-muted">moderate</span></span>
          <span aria-hidden="true" className="mt-[5px] flex gap-0.5">{Array.from({ length: 11 }, (_, i) => <span key={i} className={'h-1 flex-1 rounded-[1px] ' + (i < 3 ? '' : 'bg-ink/10')} style={i < 3 ? { background: SUN } : undefined} />)}</span>
        </span>
        <span className="flex flex-col px-3.5 pt-2.5 pb-3">
          <span className="text-[11px] font-medium text-ink-subtle">Wind</span>
          <span className="mt-0.5 text-sm font-medium tabular-nums">14 <span className="text-xs font-normal text-ink-muted">km/h NW</span></span>
        </span>
      </footer>
    </article>
  );
}
Forecast.stage = true;
Forecast.names = ['sRGB', 'OKLCH'];
Forecast.lesson = {
  why: 'sRGB mixes the red, green and blue channels separately, so the path from a blue to an orange runs straight through grey: all ten bars go muddy in the middle. OKLCH mixes lightness, chroma and hue the way the eye sees them, so the colour stays vivid all the way across, through teal, green and yellow.',
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
  const all = [...(root?.querySelectorAll('[data-range]') ?? [])], bar = all[0];
  if (!bar) return null;
  const r = bar.getBoundingClientRect(), k = r.width / bar.offsetWidth || 1, oklch = /in oklch/.test(getComputedStyle(bar).backgroundImage);
  const [a, b] = [hex2rgb(COLD), hex2rgb(WARM)], [A, B] = [toLab(a), toLab(b)], ends = Math.min(chromaOf(A), chromaOf(B));
  const c = (t) => (oklch ? chromaOf(A) + (chromaOf(B) - chromaOf(A)) * t : chromaOf(toLab(a.map((x, i) => x + (b[i] - x) * t))));
  let low = Infinity, dull = null;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, v = c(t);
    low = Math.min(low, v);
    if (v < ends * 0.5) dull = dull ? { from: dull.from, to: t } : { from: t, to: t };
  }
  const loss = Math.max(0, 1 - low / ends);
  // the dull stretch, on every bar (each repeats the whole ramp)
  const bands = all.slice(0, 5).map((el, i) => {
    const q = el.getBoundingClientRect(), x = (t) => q.left + q.width * t;
    return { key: 'dull' + i, left: x(dull?.from ?? 0.5), right: x(dull?.to ?? 0.5), top: q.top - 3 * k, bottom: q.bottom + 3 * k, pattern: 'hatch' };
  });
  // the window: the shared scale (the track) across the first five days
  const t0 = bar.parentElement.getBoundingClientRect(), last = all[4].parentElement.getBoundingClientRect();
  return {
    lines: [], off: loss > 0.3, bands,
    pills: [{ key: 'loss', x: r.left + r.width / 2, y: r.top - 16 * k, text: String(Math.round(loss * 100) * k), ok: loss <= 0.3 }],
    cut: { left: t0.left - 6 * k, right: t0.right + 6 * k, top: t0.top - 8 * k, bottom: last.bottom + 8 * k, r: 6 * k },
    subject: { left: t0.left - 30 * k, right: t0.right + 30 * k, top: t0.top - 50 * k, bottom: last.bottom + 30 * k },
  };
};

// The film (Film.jsx, a still film: the fault is at rest, so the camera goes down into one bar). The places: the ten
// days' bars. Up close, under the first bar, nine swatches of its own colour along its length, mixed the way the
// browser mixes them: in sRGB the middle ones are grey, in OKLCH they stay coloured.
const oklabToRgb = ([L, a, b]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s2 = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s2, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s2, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s2];
  return lin.map((c) => { c = Math.min(1, Math.max(0, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; });
};
// the colour at t along the bar, as the browser mixes it on each side
const mixAt = (t, oklch) => {
  const [a, b] = [hex2rgb(COLD), hex2rgb(WARM)];
  if (!oklch) return { rgb: a.map((x, i) => x + (b[i] - x) * t), lab: toLab(a.map((x, i) => x + (b[i] - x) * t)) };
  const [A, B] = [toLab(a), toLab(b)], lch = ([L, x, y]) => [L, Math.hypot(x, y), Math.atan2(y, x)];
  const [P, Q] = [lch(A), lch(B)];
  let dh = Q[2] - P[2]; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI; // the shorter way round
  const L = P[0] + (Q[0] - P[0]) * t, C = P[1] + (Q[1] - P[1]) * t, h = P[2] + dh * t, lab = [L, C * Math.cos(h), C * Math.sin(h)];
  return { rgb: oklabToRgb(lab), lab };
};
const hexOf = (rgb) => '#' + rgb.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
const bars = (root) => [...root.querySelectorAll('[data-range]')];
const ENDS = Math.min(chromaOf(toLab(hex2rgb(COLD))), chromaOf(toLab(hex2rgb(WARM)))); // how colourful the bar's two ends are
Forecast.film = {
  still: true,
  instances: bars,
  frame: (root) => [root.querySelector('section[aria-label="10 days"] ul')],
  payoff: 350, // ten bars: half the usual time on each, so the payoff stays about 4 s
  lead: 4, // Monday: a long bar in the middle of the list, with no 'now' dot on it
  code: { fault: { cls: 'bg-[linear-gradient(90deg,#1b9fd0,#f28c28)]', prop: 'mixed in sRGB' }, fix: { cls: 'bg-[linear-gradient(90deg_in_oklch,#1b9fd0,#f28c28)]', prop: 'mixed in OKLCH' } },
  // the ring goes round the part of each bar that goes grey (below half its ends' colour); fixed, round the whole bar
  ring(root, el) {
    const b = local(root)(el), oklch = /in oklch/.test(getComputedStyle(el).backgroundImage);
    const dull = Array.from({ length: 41 }, (_, i) => i / 40).filter((t) => chromaOf(mixAt(t, oklch).lab) < ENDS * 0.5);
    return oklch || !dull.length ? b : { x: b.x + b.w * dull[0], y: b.y, w: b.w * (dull.at(-1) - dull[0]), h: b.h };
  },
  read(root, el) {
    const oklch = /in oklch/.test(getComputedStyle(el).backgroundImage);
    const kept = Math.min(...Array.from({ length: 21 }, (_, i) => chromaOf(mixAt(i / 20, oklch).lab))) / ENDS;
    // one pill, in the empty track right of the bar, in the bar's own row; the caption says "grey", so no second tag
    const at = local(root), b = at(el), track = at(el.parentElement), left = b.x - track.x > track.x + track.w - (b.x + b.w); // the side with more empty track
    return { off: kept < 0.5 ? 1 : 0, pin: left ? { x: b.x, y: b.y + b.h / 2, side: 'left' } : { x: b.x + b.w, y: b.y + b.h / 2 }, size: { toy: 'fill', pre: '', from: 100, to: Math.round(Math.min(1, kept) * 100), post: '%' }, tags: [] };
  },
  // one bar, close: under it, seven swatches of its colour along its length, each with how colourful it is; the grey
  // ones ringed coral. Fixed, the same swatches in OKLCH. The rest of the card dimmed
  dive(root, side) {
    const at = local(root), bar = at(bars(root)[Forecast.film.lead]), W = root.offsetWidth, H = root.offsetHeight, oklch = side === 'fixed';
    const N = 7, gap = bar.w * 0.04, sw = (bar.w - gap * (N - 1)) / N, top = bar.y + bar.h + gap * 2.2;
    const L = bar.x - 10, R = bar.x + bar.w + 10, T = bar.y - 16, B = top + sw + sw * 0.75;
    const K = Math.min(9, (W * 0.84) / (R - L), (H * 0.6) / (B - T)), u = (v) => +(v / K).toFixed(3);
    const shade = `<path fill-rule="evenodd" d="M-2000 -2000h${W + 4000}v${H + 4000}h${-(W + 4000)}Z M${L} ${T}h${R - L}v${B - T}h${L - R}Z" fill="#ffffff" fill-opacity=".88"/>`;
    const swatches = Array.from({ length: N }, (_, i) => {
      const c = mixAt(i / (N - 1), oklch), x = bar.x + i * (sw + gap), score = Math.round(Math.min(1, chromaOf(c.lab) / ENDS) * 100), dull = score < 50, d = u(3.5);
      return `<rect x="${x}" y="${top}" width="${sw}" height="${sw}" rx="${sw * 0.28}" fill="${hexOf(c.rgb)}" style="transition:fill 600ms ease ${i * 60}ms"/>`
        + (dull ? `<rect x="${x - d}" y="${top - d}" width="${sw + 2 * d}" height="${sw + 2 * d}" rx="${sw * 0.28 + d}" fill="none" stroke="#f24a9f" stroke-width="${u(1.5)}" stroke-dasharray="${u(4)} ${u(3)}"/>` : '')
        + `<text x="${x + sw / 2}" y="${top + sw + sw * 0.5}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-weight="600" font-size="${u(11)}" fill="${dull ? '#c2186f' : '#6b6b6b'}">${score}</text>`;
    }).join('');
    const pills = [{ x: bar.x + bar.w / 2, y: bar.y - u(6), tone: oklch ? 'on' : 'off', toy: 'fill', text: oklch ? 'Stays bright' : 'Goes grey' }];
    return { focus: { x: (L + R) / 2, y: (T + B) / 2 }, k: K, svg: `${shade}${swatches}`, pills };
  },
  say: 'Look at the middle of each day\'s bar.',
  // the words on screen, approved by the owner 2026-11-15; `at` is the film's moment for each line
  teach: { fault: 'linear-gradient(blue, orange)', fix: 'linear-gradient(in oklch, …)' },   // the film's change card: the one idea, short enough for the column
  script: [
    { at: 'rest', text: 'Blue for cool, orange for warm.' },
    { at: 'measure', text: 'But in the middle, every bar turns *grey*.' },
    { at: 'dive', text: 'Design tools export gradients that mix red, green and blue separately.' },
    { at: 'smear', text: 'Halfway from blue to orange, that mix lands on grey.' },
    { at: 'fix', text: 'Mix the colours the way eyes see them instead.' },
    { at: 'payoff', text: 'Now every bar stays *bright* all the way across.' },
  ],
};

// for the marks prototype (principles/proto/MarksProto.jsx): the bar's colour along its length, and how colourful
export const film = {
  lead: Forecast.film.lead,
  gradient: (oklch) => (oklch ? FIXED : `linear-gradient(90deg, ${COLD}, ${WARM})`),
  samples: (oklch) => ({ ends: ENDS, points: Array.from({ length: 41 }, (_, i) => { const m = mixAt(i / 40, oklch); return { t: i / 40, c: chromaOf(m.lab), hex: hexOf(m.rgb) }; }) }),
};
