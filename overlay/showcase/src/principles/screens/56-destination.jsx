// #56 eased gradients for scrims. A trip planner's featured card for a December break in Los Angeles: the Getty's white
// stone, December's nightly prices, and three more places nearby, each name set on its photo. Every scrim under those
// words is a straight two-stop fade, the way it's usually written; a linear fade stops dead where it ends, so on pale
// stone and sky its top edge shows as a grey band across the photo. plumber eases each one: dark under the words, a
// long soft tail.
import { HeartIcon } from '@unlocalhosted/dither-icons';
import getty from '../../media/s56-getty.jpg';
import griffith from '../../media/s56-griffith.jpg';
import venice from '../../media/s56-venice.jpg';
import broad from '../../media/s56-broad.jpg';
import tomi from '../../media/people/person-09.jpg';
import walt from '../../media/people/person-04.jpg';
import theo from '../../media/people/person-08.jpg';

export const n = 56;

// Wayfare's warm terracotta, for the chosen nights and the button
const BRAND = '#c4572e';
// nightly prices in December: weekends dearer, the holidays dearest; the chosen nights are the 11th to the 14th
const PRICES = [192, 205, 214, 188, 176, 181, 198, 168, 162, 170, 166, 174, 182, 196, 171, 178, 190, 224, 238, 252, 246, 260, 288, 302, 296, 284, 270, 262, 276, 310, 318];
const FROM = 10, NIGHTS = 4, FLOOR = 110, MAX = 330;
const NEARBY = [
  { src: griffith, name: 'Griffith Observatory', far: '25 min' },
  { src: venice, name: 'Venice Beach', far: '20 min' },
  { src: broad, name: 'The Broad', far: '30 min' },
];
// the fade under words on a photo, as it's usually written: two stops, black to clear
const SCRIM = 'bg-linear-to-t from-black/70 to-transparent';
const TILE_SCRIM = 'bg-linear-to-t from-black/60 to-transparent';

export default function Destination() {
  return (
    <article className="w-full max-w-[24rem] overflow-hidden rounded-card bg-surface shadow-card">
      <div className="relative aspect-[6/7]">
        <img src={getty} alt="The Getty's white stone, curving against the sky" className="absolute inset-0 size-full object-cover" />
        <div data-scrim className={'absolute inset-x-0 bottom-0 h-2/3 ' + SCRIM} />
        <span className="absolute top-3 left-3 inline-flex h-[26px] items-center gap-1.5 rounded-full bg-white/92 pr-2.5 pl-2 text-xs font-medium shadow-raised">
          <span className="size-1.5 rounded-full" style={{ background: BRAND }} />Editors’ pick
        </span>
        <span className="absolute top-3.5 right-[50px] h-[22px] rounded-full bg-ink/50 px-[7px] text-[11px] leading-[22px] font-medium text-white tabular-nums">1 / 24</span>
        <button type="button" aria-label="Saved" aria-pressed="true" className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-white/92 text-[#e5484d] shadow-raised"><HeartIcon size={16} texture="solid" /></button>
        <div className="absolute inset-x-0 bottom-0 flex flex-col p-5 text-white">
          <span className="case-forms text-xs font-medium tracking-caps uppercase">Los Angeles · 4 nights</span>
          <span className="mt-1.5 text-[26px] leading-[31px] font-semibold tracking-[-0.02em] text-balance">Light and stone at the Getty</span>
          <span className="mt-3 flex items-center gap-2 text-[13px]">
            <span className="flex">{[tomi, walt, theo].map((src, i) => <img key={src} src={src} alt="" className={'size-[22px] rounded-full object-cover ring-[1.5px] ring-white/90 ' + (i ? '-ml-1.5' : '')} />)}</span>
            <span className="tabular-nums">Saved by Tomi and 1,311 travellers</span>
          </span>
        </div>
      </div>

      <div className="px-5 pt-3.5 pb-[18px]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[13px] text-ink-muted">
            <svg viewBox="0 0 16 16" className="size-3.5 self-center" fill="#e8a317" aria-hidden="true"><path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6Z" /></svg>
            <b className="font-semibold text-ink tabular-nums">4.8</b><span className="tabular-nums">212 reviews · Brentwood</span>
          </span>
          <span className="shrink-0 text-[13px] text-ink-muted">from <b className="text-[17px] font-semibold tracking-[-0.01em] text-ink tabular-nums">$162</b> a night</span>
        </div>

        {/* the price a night across December, a bar a night; the chosen four in the brand on a tint */}
        <div className="mt-3.5">
          <span className="flex justify-between text-xs text-ink-muted">A night in December<b className="font-medium text-ink tabular-nums">Dec 11–15 · $173 avg</b></span>
          <span className="relative isolate mt-2.5 grid h-11 grid-cols-[repeat(31,1fr)] items-end gap-0.5">
            <span className="absolute -inset-y-1 -z-10 rounded-[4px] bg-[#fbece5]" style={{ left: `calc(${FROM} / 31 * (100% + 2px))`, width: `calc(${NIGHTS} / 31 * (100% + 2px) - 2px)` }} />
            {PRICES.map((p, i) => <span key={i} className={'rounded-[1.5px] ' + (i >= FROM && i < FROM + NIGHTS ? '' : 'bg-ink/14')} style={{ height: `${((p - FLOOR) / (MAX - FLOOR)) * 100}%`, background: i >= FROM && i < FROM + NIGHTS ? BRAND : undefined }} />)}
          </span>
          <span className="relative mt-1.5 block h-3.5 text-[11px] leading-[14px] text-ink-subtle tabular-nums">
            {[1, 8, 15, 22, 29].map((d) => <span key={d} className="absolute -translate-x-1/2" style={{ left: `${((d - 0.5) / 31) * 100}%` }}>{d}</span>)}
          </span>
        </div>

        {/* more nearby, each name on its photo */}
        <div className="mt-4">
          <span className="flex justify-between text-xs text-ink-muted">Also near the Getty<span className="tabular-nums">by car</span></span>
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {NEARBY.map((p) => (
              <li key={p.name} className="relative aspect-[4/5] overflow-hidden rounded-control">
                <img src={p.src} alt="" className="absolute inset-0 size-full object-cover" />
                <div data-tile-scrim className={'absolute inset-x-0 bottom-0 h-2/3 ' + TILE_SCRIM} />
                <span className="absolute inset-x-0 bottom-0 flex flex-col p-2 text-white">
                  <span className="text-[13px] leading-4 font-semibold text-balance">{p.name}</span>
                  <span className="mt-0.5 text-[11px] leading-[14px] tabular-nums">{p.far}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t-hairline border-line pt-3.5">
          <span className="flex flex-col text-[13px] tabular-nums">Thu, Dec 11 – Mon, Dec 15<span className="text-xs text-ink-muted">2 guests · $692 for 4 nights</span></span>
          <button type="button" className="h-9 shrink-0 rounded-control px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(156_63_28/0.3),inset_0_1px_0_rgb(255_255_255/0.16)]" style={{ background: BRAND }}>Plan this trip</button>
        </div>
      </div>
    </article>
  );
}
Destination.stage = true;
Destination.names = ['Linear', 'Eased'];
Destination.lesson = {
  why: 'A two-stop fade changes darkness at a constant rate, then stops dead where it ends. The eye catches that sudden stop as an edge, so the Getty’s pale stone, and each photo below it, looks cut by a grey band well above the words.',
  habit: 'Ease a scrim: several stops on a curve, dark near the words and a long soft tail, so its end has no edge.',
};
// What the eye sees: where each fade ends (the hatch is its last tenth, where a linear fade still darkens as much as
// anywhere). The pill is how much darkness the big photo's last tenth holds, in hundredths.
const fade = (el) => {
  const bg = getComputedStyle(el).backgroundImage;
  const stops = [...bg.matchAll(/rgba?\(([^)]+)\)\s*([\d.]+%)?/g)].map((m) => ({ a: parseFloat(m[1].split(/[ ,/]+/).filter(Boolean)[3] ?? 1), at: m[2] ? parseFloat(m[2]) / 100 : null }));
  stops.forEach((s, i) => { s.at ??= i / Math.max(1, stops.length - 1); });
  return (t) => { for (let i = 1; i < stops.length; i++) if (t <= stops[i].at) { const p = stops[i - 1], q = stops[i]; return p.a + (q.a - p.a) * ((t - p.at) / (q.at - p.at || 1)); } return stops.at(-1)?.a ?? 0; };
};
Destination.measure = (root) => {
  const el = root?.querySelector('[data-scrim]');
  if (!el) return null;
  const r = el.getBoundingClientRect(), k = r.width / el.offsetWidth || 1, a = fade(el);
  const tail = a(0.9) - a(1); // to top: t runs from the bottom (0) to the top (1)
  const all = [el, ...root.querySelectorAll('[data-tile-scrim]')];
  const rules = [], bands = [];
  all.forEach((s, i) => {
    const q = s.getBoundingClientRect(), y = (t) => q.bottom - q.height * t;
    rules.push({ key: 'end' + i, y: y(1), left: q.left, right: q.right });
    bands.push({ key: 'tail' + i, left: q.left, right: q.right, top: y(1), bottom: y(0.9), pattern: 'hatch' });
  });
  const top = r.bottom - r.height;
  return {
    lines: [], off: tail > 0.04, rules, bands,
    pills: [{ key: 'tail', x: r.right - 30 * k, y: top - 12 * k, text: String(Math.round(tail * 100) * k), ok: tail <= 0.04 }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
    subject: { left: r.left - 10 * k, right: r.right + 10 * k, top: top - 50 * k, bottom: r.bottom },
  };
};
