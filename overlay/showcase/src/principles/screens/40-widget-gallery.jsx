// #40 continuous corners. A phone's widget gallery, Small picked, four suggestions: Lisbon's weather with the day's
// curve, Thursday's next two events, a photo from this day last year, today's activity rings. The sheet, its search
// field and its Add button already ease their corners in (corner-shape: squircle), but every widget tile is drawn with
// rounded-[22px] alone: a quarter circle, bending at full strength from its very first point. At 182px the eye
// catches the kink where each tile's edge turns, four times, right beside the system's smooth shapes. plumber keeps
// the radius and changes the curve.
import tram from '../../media/s40-lisbon-tram.jpg';

export const n = 40;

// one tile of the gallery, square, with the system's widget corner
const Tile = ({ className = '', children, ...rest }) => (
  <div {...rest} className={'relative flex aspect-square flex-col justify-between overflow-hidden rounded-[22px] px-3.5 pt-2.5 pb-3.5 ' + className}>{children}</div>
);
const Widget = ({ label, children }) => (
  <li className="flex flex-col gap-1.5">
    {children}
    <span className="text-center text-xs text-ink-muted">{label}</span>
  </li>
);
// today's activity: move, exercise, stand (done of goal), each a ring
// each ring in its colour; its figure in a lighter tint of it, to read on the dark tile
const RINGS = [['Move', 412, 530, 'cal', '#fa114f', '#ff7a98'], ['Exercise', 24, 30, 'min', '#92e82a', '#a8f04f'], ['Stand', 9, 12, 'h', '#1eeaef', '#5ef0f3']];

export default function WidgetGallery() {
  return (
    <section aria-label="Add a widget" className="w-full max-w-[26.25rem] rounded-[32px] bg-sunken px-5 pt-2 pb-5 shadow-window ring-[0.5px] ring-line [corner-shape:squircle]">
      <span className="mx-auto mb-3 block h-[5px] w-9 rounded-full bg-[rgb(18_35_61/0.16)]" />
      <header className="flex items-center justify-between">
        <h2 className="text-xl leading-7 font-semibold tracking-[-0.015em]">Add a widget</h2>
        <button type="button" aria-label="Close" className="grid size-[30px] place-items-center rounded-full bg-[rgb(18_35_61/0.07)] text-ink-muted hover:text-ink">
          <svg viewBox="0 0 12 12" className="size-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" /></svg>
        </button>
      </header>
      <label className="mt-3 flex h-[38px] items-center gap-2 rounded-xl bg-surface px-3 text-base text-ink-subtle ring-[0.5px] ring-line [corner-shape:squircle]">
        <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" /></svg>
        <input placeholder="Search widgets" className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-subtle" />
      </label>
      <div role="radiogroup" aria-label="Size" className="mt-3 grid grid-cols-3 gap-0.5 rounded-[10px] bg-[rgb(18_35_61/0.06)] p-0.5 [corner-shape:squircle]">
        {['Small', 'Medium', 'Large'].map((s, i) => (
          <button key={s} type="button" role="radio" aria-checked={i === 0} className={'h-7 rounded-[8px] text-[13px] font-medium ' + (i === 0 ? 'bg-surface text-ink shadow-raised' : 'text-ink-muted hover:text-ink')}>{s}</button>
        ))}
      </div>
      <p className="mx-1 mt-[18px] mb-2 flex justify-between text-xs font-medium text-ink-subtle"><span>Suggested</span><span className="tabular-nums">4 of 23</span></p>

      <ul className="grid grid-cols-2 gap-4">
        <Widget label="Weather">
          {/* Lisbon now, the day's curve to tonight, high and low */}
          <Tile data-widget className="bg-[#2a5cb8] bg-[linear-gradient(in_oklch_170deg,#4b8fe0,#2a5cb8)] text-white">
            <span className="flex items-center justify-between text-[13px] leading-4 font-semibold">
              Lisbon
              <svg viewBox="0 0 18 18" className="size-[18px] fill-[#ffd66b] stroke-[#ffd66b]" aria-hidden="true"><circle cx="9" cy="9" r="4" stroke="none" /><path strokeWidth="1.6" strokeLinecap="round" d="M9 1.5v1.8M9 14.7v1.8M1.5 9h1.8M14.7 9h1.8M3.7 3.7l1.3 1.3M13 13l1.3 1.3M3.7 14.3 5 13M13 5l1.3-1.3" /></svg>
            </span>
            <span>
              <span className="block text-[42px] leading-none font-normal tracking-[-0.03em] tabular-nums">21°</span>
              <span className="mt-1 block text-xs font-medium text-[#dfeafb]">Clear until 6pm · <span className="tabular-nums">23° 14°</span></span>
              <svg viewBox="0 0 154 28" className="mt-1.5 block h-7 w-full" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 22 C20 20 34 10 52 7 S88 4 104 9 S136 22 154 24" fill="none" className="stroke-white/85" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                <circle cx="52" cy="7" r="3.5" className="fill-white" />
              </svg>
            </span>
          </Tile>
        </Widget>
        <Widget label="Calendar">
          <Tile className="bg-surface shadow-raised">
            <span>
              <span className="caps block text-[11px] font-semibold text-negative">Thursday</span>
              <span className="mt-0.5 block text-[40px] leading-none font-normal tracking-[-0.03em] tabular-nums">6</span>
            </span>
            <span className="flex flex-col gap-2.5 text-xs leading-[15px]">
              {[['Config talk run-through', '15:00 – 15:30', 'bg-accent'], ['Release review', '16:00 – 17:00', 'bg-[#1f9d6b]']].map(([what, when, c]) => (
                <span key={what} className="grid grid-cols-[3px_1fr] gap-1.5">
                  <i className={'rounded-[2px] ' + c} />
                  <span className="min-w-0"><span className="block truncate font-medium">{what}</span><span className="text-ink-muted tabular-nums">{when}</span></span>
                </span>
              ))}
            </span>
          </Tile>
        </Widget>
        <Widget label="Photos">
          <Tile className="justify-end bg-sunken text-white">
            <img src={tram} alt="" className="absolute inset-0 size-full object-cover outline-1 -outline-offset-1 outline-black/10" />
            <span className="scrim-eased absolute inset-x-0 bottom-0 h-3/5" />
            <span className="relative">
              <span className="caps block text-[11px] font-semibold text-[#e8edf5]">On this day</span>
              <span className="block text-[15px] leading-[19px] font-semibold">Lisbon, 2024</span>
            </span>
          </Tile>
        </Widget>
        <Widget label="Activity">
          <Tile className="flex-row items-center justify-start gap-3 bg-[#10151f] text-white">
            {/* the rings are a chart, drawn by conic fills under a mask, not an icon */}
            <span aria-hidden="true" className="relative size-[76px] shrink-0">
              {RINGS.map(([what, done, goal, , c], i) => (
                <span key={what} className="absolute rounded-full [mask:radial-gradient(farthest-side,transparent_calc(100%-8px),#000_calc(100%-7.5px))]"
                  style={{ inset: i * 10, background: `conic-gradient(${c} ${(done / goal) * 360}deg, color-mix(in oklab, ${c} 22%, #10151f) 0)` }} />
              ))}
            </span>
            <span className="flex flex-col gap-1.5">
              {RINGS.map(([what, done, goal, unit, , ink]) => (
                <span key={what} aria-label={`${what}: ${done} of ${goal} ${unit}`} className="text-[15px] leading-[18px] font-semibold tabular-nums" style={{ color: ink }}>
                  {done}<span className="text-[11px] font-medium text-[#b8bfcc]">/{goal}</span>
                </span>
              ))}
            </span>
          </Tile>
        </Widget>
      </ul>

      <footer className="mt-[18px] flex flex-col items-center gap-3.5">
        <span className="flex gap-1.5">{[0, 1, 2, 3].map((i) => <i key={i} className={'size-1.5 rounded-full ' + (i ? 'bg-[rgb(18_35_61/0.2)]' : 'bg-ink')} />)}</span>
        <button type="button" className="h-12 w-full rounded-2xl bg-accent text-base font-semibold text-accent-ink shadow-[0_1px_2px_rgb(54_49_166/0.3),inset_0_1px_0_rgb(255_255_255/0.18)] [corner-shape:squircle] hover:bg-accent-deep">Add widget</button>
      </footer>
    </section>
  );
}
WidgetGallery.stage = true;
WidgetGallery.names = ['Round', 'Continuous'];
WidgetGallery.lesson = {
  why: 'border-radius draws a quarter circle, and a circle bends at full strength from its very first point: straight, then suddenly curved. On a small button nobody sees it; at widget size the eye catches the kink where every tile’s edge turns, and beside the sheet’s smooth corners the tiles look stamped out rather than shaped.',
  habit: 'For large rounded surfaces, ease the curve in: corner-shape: squircle (continuous corners), at the same radius.',
};
// What the eye sees at the first widget's top-left corner: where the straight edge ends and the curve begins. The pill
// is how hard the curve bends at that join, as a share of its tightest bend: a circle starts at full bend (100), a
// squircle at none.
WidgetGallery.measure = (root) => {
  const w = root?.querySelector('[data-widget]');
  if (!w) return null;
  const r = w.getBoundingClientRect(), k = r.width / w.offsetWidth || 1, s = getComputedStyle(w);
  const rad = parseFloat(s.borderTopLeftRadius) * k, round = /^(round|superellipse\(1\))?$/.test(s.getPropertyValue('corner-shape').trim());
  const kink = round ? 100 : 0;
  return {
    lines: [{ key: 'join-x', x: r.left + rad, top: r.top - 10 * k, bottom: r.top + 10 * k }],
    rules: [{ key: 'join-y', y: r.top + rad, left: r.left - 10 * k, right: r.left + 10 * k }],
    bands: [{ key: 'corner', left: r.left, right: r.left + rad, top: r.top, bottom: r.top + rad, pattern: 'hatch' }],
    // left of the tile, clear of the words above it (Suggested) and in it (Lisbon)
    pills: [{ key: 'kink', x: r.left - 30 * k, y: r.top + rad + 16 * k, text: String(Math.max(kink, 0) * k), ok: !round }],
    off: round,
    // clear of the corner, so a round hole never fights the squircle it frames
    cut: { left: r.left - 10 * k, right: r.right + 10 * k, top: r.top - 10 * k, bottom: r.bottom + 10 * k, r: rad + 10 * k },
    subject: { left: r.left - 60 * k, right: r.left + 100 * k, top: r.top - 30 * k, bottom: r.top + 90 * k },
  };
};
