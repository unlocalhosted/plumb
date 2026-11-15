// #3 round shapes are drawn a touch larger than square ones. Easel, a team whiteboard: Moss & Fern's spring launch
// board mid-session, three people on it, the Shapes picker open over the toolbar. Every row of the picker (basic
// shapes, flowchart, stickers) draws each shape in the same 20px box. A circle fills about 78% of its box and a square
// nearly all of it, so in every row the round one reads smaller than the square beside it. plumber's fix draws the
// round ones a few percent larger (overshoot), in every row at once.
import { LayersIcon, MessageIcon, PathIcon, SparklesIcon } from '@unlocalhosted/dither-icons';
import { local } from '../Film.jsx';
import ceramic from '../../media/ceramic.jpg';
import mira from '../../media/people/person-05.jpg';
import theo from '../../media/people/person-02.jpg';
import sana from '../../media/people/person-03.jpg';

export const n = 3;

// each row of the picker: what it draws, the round one second (as these sets usually run: square, then circle)
const SETS = [
  { name: 'Basic', shapes: [
    { name: 'Square', d: <rect x="2" y="2" width="20" height="20" rx="1" /> },
    { name: 'Circle', d: <circle cx="12" cy="12" r="10" /> },
    { name: 'Triangle', d: <path d="M12 2.5 22 21H2z" /> },
    { name: 'Diamond', d: <path d="M12 1.5 22.5 12 12 22.5 1.5 12z" /> },
  ] },
  { name: 'Flowchart', shapes: [
    { name: 'Document', d: <path d="M3 2h18a1 1 0 0 1 1 1v17c-3.3-1.6-6.7-1.6-10 0s-6.7 1.6-10 0V3a1 1 0 0 1 1-1z" /> },
    { name: 'Connector', d: <circle cx="12" cy="12" r="10" /> },
    { name: 'Decision', d: <path d="M12 1.5 22.5 12 12 22.5 1.5 12z" /> },
    { name: 'Data', d: <path d="M7 4h15l-5 16H2z" /> },
  ] },
  { name: 'Stickers', shapes: [
    { name: 'Sticky note', d: <path d="M3 2h18a1 1 0 0 1 1 1v13l-6 6H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" /> },
    { name: 'Vote dot', d: <circle cx="12" cy="12" r="10" /> },
    { name: 'Star', d: <path d="M12 2.4 14.59 9.24 21.89 9.59 16.18 14.16 18.11 21.21 12 17.2 5.89 21.21 7.82 14.16 2.11 9.59 9.41 9.24Z" /> },
    { name: 'Speech bubble', d: <path d="M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-5 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /> },
  ] },
];
const FILLS = [['Ink', '#12233d'], ['Glaze blue', '#3f63a8'], ['Mustard', '#e9b93c'], ['Fern', '#2f6b4f'], ['Kiln pink', '#d0457a']];
const TOOLS = [['Layers', LayersIcon], ['Draw', PathIcon], ['Comment', MessageIcon]];
// the colours people wear on the board: theirs alone, like a brand's
const THEO = '#d0457a', SANA = '#0f6f58';

const Cursor = ({ who, color, className }) => (
  <span aria-hidden="true" className={'absolute ' + className}>
    <svg viewBox="0 0 14 18" className="block h-[18px] w-3.5"><path d="M1 1v14l3.8-3.6L7.6 17l2.4-1-2.7-5.4H13z" fill={color} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" /></svg>
    <span className="absolute top-3 left-3 flex h-5 items-center rounded-full px-[7px] text-[11px] font-medium text-white" style={{ background: color }}>{who}</span>
  </span>
);
const Floating = 'rounded-card bg-surface shadow-[var(--shadow-raised),0_0_0_0.5px_var(--color-line)]';

export default function LaunchBoard({ side = 'broken' }) {
  return (
    <article className="relative h-[37.5rem] w-[40rem] max-w-full overflow-hidden rounded-card bg-canvas shadow-card [background-image:radial-gradient(rgb(18_35_61/0.13)_1px,transparent_1px)] [background-size:16px_16px]">
      {/* the board's own top: what it is, who's here */}
      <div className={'absolute top-4 left-4 flex h-9 items-center gap-2.5 pr-3 pl-1.5 ' + Floating}>
        <span className="grid size-6 place-items-center rounded-control bg-[#2f6b4f] text-[11px] font-semibold text-white">MF</span>
        <span className="text-[13px] font-medium">Spring launch</span>
        <span className="text-xs text-ink-muted">Moss & Fern</span>
      </div>
      <div className={'absolute top-4 right-4 flex h-9 items-center gap-2 pr-1.5 pl-2.5 ' + Floating}>
        <span className="flex -space-x-1.5" aria-label="Mira, Theo and Sana are here">
          {[mira, theo, sana].map((f) => <img key={f} src={f} alt="" className="size-6 rounded-full object-cover ring-2 ring-surface" />)}
        </span>
        <button type="button" className="h-6 rounded-control bg-accent px-2.5 text-xs font-medium text-accent-ink hover:bg-accent-deep">Share</button>
      </div>

      {/* the moodboard: the hero photo, its palette pulled as swatches */}
      <figure className="absolute top-[72px] left-10 w-[152px] -rotate-2 rounded-[4px] bg-white px-1.5 pt-1.5 pb-2 shadow-[0_1px_2px_rgb(18_35_61/0.08),0_4px_10px_rgb(18_35_61/0.08)]">
        <img src={ceramic} alt="Two stacked handmade mugs, blue over yellow" className="block h-28 w-full rounded-[2px] object-cover outline-1 -outline-offset-1 outline-black/10" />
        <figcaption className="mt-1.5 text-[11px] leading-[14px] text-ink-muted">Hero: the stacked mugs</figcaption>
        <span className="mt-1.5 flex gap-1">
          {FILLS.slice(1).map(([name, c]) => <i key={name} className="size-3.5 rounded-[3px] shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.12)]" style={{ background: c }} />)}
        </span>
      </figure>

      {/* the notes, signed */}
      <div className="absolute top-[74px] left-[214px] w-[132px] rotate-[1.5deg] rounded-[4px] bg-[#fbedc6] px-3 pt-2.5 pb-3 text-[12.5px] leading-[17px] text-[#4a3204] shadow-[0_1px_2px_rgb(150_90_3/0.12),0_4px_10px_rgb(150_90_3/0.1)]">
        Landing page copy by Friday, Mira writes, Theo edits
        <span className="mt-2 flex items-center gap-1.5 text-[11px] leading-[14px]"><img src={mira} alt="" className="size-4 rounded-full object-cover" />Mira</span>
      </div>
      <div className="absolute top-[88px] left-[368px] w-[132px] -rotate-1 rounded-[4px] bg-[#e4e2fb] px-3 pt-2.5 pb-3 text-[12.5px] leading-[17px] text-[#2a2680] shadow-[0_1px_2px_rgb(54_49_166/0.12),0_4px_10px_rgb(54_49_166/0.1)]">
        Ask Sana for the location shots before the 14th
        <span className="mt-2 flex items-center gap-1.5 text-[11px] leading-[14px]"><img src={theo} alt="" className="size-4 rounded-full object-cover" />Theo · now</span>
      </div>
      {/* Theo's selection on his note */}
      <span aria-hidden="true" className="absolute top-20 left-[360px] h-[102px] w-[148px]" style={{ boxShadow: `0 0 0 1px ${THEO}` }}>
        {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-right-1 -bottom-1'].map((at) => <i key={at} className={'absolute size-[7px] bg-white ' + at} style={{ boxShadow: `inset 0 0 0 1px ${THEO}` }} />)}
      </span>

      {/* the launch flow, drawn in the board's own shapes */}
      <svg aria-hidden="true" className="absolute top-[76px] left-[528px] h-[210px] w-24" viewBox="0 0 96 210" fill="none">
        <rect x="9" y="1" width="78" height="34" rx="3" fill="#fff" stroke="rgb(18 35 61 / 0.45)" strokeWidth="1.5" />
        <text x="48" y="22" textAnchor="middle" className="fill-ink-muted text-[11px] font-medium">Brief</text>
        <path d="M48 36v20m-4-5 4 6 4-6" stroke="rgb(18 35 61 / 0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M48 59l31 31-31 31-31-31z" fill="#fff" stroke="rgb(18 35 61 / 0.45)" strokeWidth="1.5" />
        <text x="48" y="94" textAnchor="middle" className="fill-ink-muted text-[11px] font-medium">Shoot</text>
        <path d="M48 122v20m-4-5 4 6 4-6" stroke="rgb(18 35 61 / 0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="48" cy="166" rx="46" ry="22" fill="#fff" stroke="rgb(18 35 61 / 0.45)" strokeWidth="1.5" />
        <text x="48" y="170" textAnchor="middle" className="fill-ink-muted text-[11px] font-medium">Launch, 2 Mar</text>
      </svg>

      <Cursor who="Theo" color={THEO} className="top-[168px] left-[476px]" />
      <Cursor who="Sana" color={SANA} className="top-[236px] left-[150px]" />

      {/* a comment pinned on the board */}
      <div className="absolute top-[318px] left-6 flex w-[164px] items-start gap-2">
        <img src={sana} alt="" className="size-7 shrink-0 rounded-[50%_50%_50%_4px] object-cover shadow-[0_0_0_2px_#fff,var(--shadow-raised)]" />
        <p className={'px-2.5 py-2 text-xs leading-4 text-ink-muted ' + Floating}>
          <b className="block font-medium text-ink">Sana</b>Mugs on linen, not on wood? It reads warmer.
          <span className="mt-1 block font-medium text-accent-deep">2 replies</span>
        </p>
      </div>

      {/* the Shapes picker, open above the toolbar */}
      <div className="absolute bottom-[72px] left-1/2 flex w-[232px] -translate-x-1/2 flex-col gap-2 rounded-card bg-surface p-2.5 shadow-[var(--shadow-popover),0_0_0_0.5px_var(--color-line)]">
        <span className="flex justify-between px-1 text-xs font-medium text-ink-muted">Shapes<kbd className="font-sans font-normal text-ink-subtle">S</kbd></span>
        {SETS.map((set) => (
          <section key={set.name} aria-label={set.name} className="flex flex-col gap-1">
            <span className="px-1 text-[11px] leading-4 text-ink-subtle">{set.name}</span>
            <div data-shapes className={'grid grid-cols-4 gap-1' + (side === 'fixed' ? ' [&>:nth-child(2)>svg]:scale-[1.04]' : '')}>
              {set.shapes.map((s, i) => (
                <button key={s.name} type="button" aria-label={s.name} aria-pressed={set.name === 'Basic' && i === 0}
                  className={'grid h-10 place-items-center rounded-control hover:bg-sunken aria-pressed:bg-accent-soft aria-pressed:text-accent-deep ' + (set.name === 'Basic' && i === 0 ? '' : 'text-ink')}>
                  <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">{s.d}</svg>
                </button>
              ))}
            </div>
          </section>
        ))}
        <div className="flex items-center justify-between border-t-hairline border-line px-1 pt-2">
          <span className="flex gap-0.5">
            {FILLS.map(([name, c], i) => (
              <button key={name} type="button" aria-label={name} aria-pressed={i === 0} className="group grid size-6 place-items-center rounded-full">
                <i className="size-[18px] rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] group-aria-pressed:shadow-[0_0_0_2px_var(--color-surface),0_0_0_3.5px_var(--color-accent)]" style={{ background: c }} />
              </button>
            ))}
          </span>
          <span className="text-xs text-ink-subtle">Fill</span>
        </div>
      </div>

      {/* the toolbar */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-card bg-surface p-1.5 shadow-[var(--shadow-overlay),0_0_0_0.5px_var(--color-line)]">
        {TOOLS.map(([name, Icon]) => (
          <button key={name} type="button" aria-label={name} className="grid size-9 place-items-center rounded-chip text-ink-muted hover:bg-sunken hover:text-ink"><Icon size={20} texture="dither" /></button>
        ))}
        <span aria-hidden="true" className="mx-1 h-5 w-hairline bg-line" />
        <button type="button" aria-label="Shapes" aria-expanded="true" className="grid size-9 place-items-center rounded-chip bg-accent-soft text-accent-deep">
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="1" /><circle cx="16" cy="16" r="5.5" /></svg>
        </button>
        <button type="button" aria-label="Ideas" className="grid size-9 place-items-center rounded-chip text-ink-muted hover:bg-sunken hover:text-ink"><SparklesIcon size={20} texture="dither" /></button>
      </div>
      <span className={'absolute right-4 bottom-4 flex h-7 items-center rounded-control px-2.5 text-xs text-ink-muted tabular-nums ' + Floating}>84%</span>
    </article>
  );
}
LaunchBoard.stage = true;
LaunchBoard.names = ['Same box', 'Overshoot'];
// The film (Film.jsx, a still film that dives into a construction drawing). The places: the round shape of every row;
// the lead is the Basic row's circle. What is measured, from the real shapes: the circle's width, and how much of the
// square's box it fills. The dive draws the Basic row's square and circle as a type designer would: the square's top
// and bottom carried across as guides; broken, the corners the circle leaves empty hatched in coral; fixed, the circle
// passing the guides, the overshoot in mint.
const pct = (v) => Math.round(v * 1000) / 10;
const shapesOf = (root) => [...root.querySelectorAll('[data-shapes]')];
const inkOf = (root, el) => local(root)(el);
const fillOf = (root, row) => { const sq = inkOf(root, row.children[0].querySelector('svg > *')), ci = inkOf(root, row.children[1].querySelector('svg > *')); return { sq, ci, fill: (Math.PI * (ci.w / 2) ** 2) / (sq.w * sq.h) }; };
LaunchBoard.film = {
  still: true,
  instances: (root) => shapesOf(root).map((row) => row.children[1].querySelector('svg')),
  frame: (root) => shapesOf(root).flatMap((row) => [row.children[0], row.children[1]]),
  lead: 0,
  code: { fault: { cls: 'size-6', prop: 'one box for every shape' }, fix: { cls: '[&>:nth-child(2)>svg]:scale-[1.04]', prop: 'scale: 1.04' } },
  read(root, el) {
    const row = el.closest('[data-shapes]'), { ci, sq, fill } = fillOf(root, row), short = Math.max(0, sq.h * 1.04 - ci.h);
    return { off: short > 0.3 ? 1 : 0, size: { icon: null, toy: 'size', pre: '', from: 0, to: Math.round(ci.w * 10) / 10, post: 'px' }, tags: [{ icon: null, toy: 'size', pre: 'fills ', text: `${pct(fill)}% of its box` }] };
  },
  // the Basic row's square and circle, drawn as a type designer would; the rest of the card dimmed so only they are bright
  dive(root, side) {
    const rows = shapesOf(root).slice(0, 1).map((row) => fillOf(root, row)), W = root.offsetWidth, H = root.offsetHeight; // one row, close: three rows at once made the dive too shallow to see
    const L = Math.min(...rows.map((r) => r.sq.x)) - 12, R = Math.max(...rows.map((r) => r.ci.x + r.ci.w / 2 + r.sq.w / 2)) + 12;
    const T = Math.min(...rows.map((r) => r.sq.y)) - 24, B = Math.max(...rows.map((r) => r.sq.y + r.sq.h)) + 14;
    const K = Math.min(6, (W * 0.84) / (R - L), (H * 0.84) / (B - T)), u = (v) => +(v / K).toFixed(3); // drawn at the dive's zoom
    const hatch = `<defs><pattern id="ov-h" width="${u(5)}" height="${u(5)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${u(1.6)}" height="${u(5)}" fill="#f24a9f"/></pattern></defs>`;
    const holes = rows.map((r) => { const x = r.sq.x - 8, y = r.sq.y - 7, w = r.ci.x + r.ci.w / 2 + r.sq.w / 2 + 8 - x, h = r.sq.h + 14; return `M${x} ${y}h${w}v${h}h${-w}Z`; }).join('');
    const shade = `<path fill-rule="evenodd" d="M-2000 -2000h${W + 4000}v${H + 4000}h${-(W + 4000)}Z ${holes}" fill="#f7f6f3" fill-opacity=".82"/>`;
    const pair = ({ sq, ci, fill }, i) => {
      const cx = ci.x + ci.w / 2, cy = ci.y + ci.h / 2, r = ci.w / 2, r0 = sq.w / 2, top = sq.y, bot = sq.y + sq.h, left = sq.x - 6, right = cx + sq.w / 2 + 6;
      const box = { x: cx - sq.w / 2, y: sq.y, w: sq.w, h: sq.h }, ring = (rr) => `M${cx - rr} ${cy}a${rr} ${rr} 0 1 0 ${2 * rr} 0a${rr} ${rr} 0 1 0 ${-2 * rr} 0`;
      const guides = `<path d="M${left} ${top}H${right}M${left} ${bot}H${right}" fill="none" stroke="#2f86dc" stroke-width="${u(1.5)}" stroke-dasharray="${u(7)} ${u(5)}"/>`
        + `<rect x="${sq.x}" y="${sq.y}" width="${sq.w}" height="${sq.h}" rx="1" fill="none" stroke="#2f86dc" stroke-width="${u(2)}"/>`;
      return side === 'fixed'
        // the overshoot zones past each guide, the circle reaching into them, and the old circle as a dashed coral ghost
        ? `<rect x="${left}" y="${cy - r}" width="${right - left}" height="${top - (cy - r)}" fill="#1fa774" fill-opacity=".35"/><rect x="${left}" y="${bot}" width="${right - left}" height="${cy + r - bot}" fill="#1fa774" fill-opacity=".35"/>${guides}`
          + `<path d="${ring(r)}" fill="none" stroke="#1fa774" stroke-width="${u(2.5)}"/><path d="${ring(r0)}" fill="none" stroke="#f9a3cf" stroke-width="${u(1.5)}" stroke-dasharray="${u(4)} ${u(3)}"/>`
        : `${guides}<path fill-rule="evenodd" d="M${box.x} ${box.y}h${box.w}v${box.h}h${-box.w}Z ${ring(r)}" fill="url(#ov-h)"/><path d="${ring(r)}" fill="none" stroke="#f24a9f" stroke-width="${u(2.5)}"/>`;
    };
    const first = rows[0], fcx = first.ci.x + first.ci.w / 2;
    const pills = side === 'fixed'
      ? [{ x: fcx, y: first.sq.y - 1.5, tone: 'on', toy: 'size', text: `+${Math.round((first.ci.h / first.sq.h - 1) * 100)}%, past the line` }]
      : [{ x: first.sq.x + first.sq.w / 2, y: first.sq.y - 1.5, tone: 'sky', toy: 'size', text: `${pct(first.fill === 0 ? 0 : (first.sq.w * first.sq.h - (4 - Math.PI)) / (first.sq.w * first.sq.h))}%` },
         { x: fcx, y: first.sq.y - 1.5, tone: 'off', toy: 'size', text: `${pct(first.fill)}% of the same box` }];
    return { focus: { x: (L + R) / 2, y: (T + B) / 2 }, k: K, svg: `${hatch}${shade}${rows.map(pair).join('')}`, pills };
  },
  say: 'Compare the circle with the square beside it.',
  // the words on screen, approved by the owner 2026-11-15; `at` is the film's moment for each line
  teach: { fault: 'scale: 1', fix: 'scale: 1.04' },   // the film's change card: the one idea
  script: [
    { at: 'rest', text: 'These two shapes are the same size.' },
    { at: 'measure', text: 'But people see the circle as *smaller*.' },
    { at: 'dive', text: 'Its corners are empty, so there\'s less of it.' },
    { at: 'fix', text: 'Draw it a little bigger, just past the lines.' },
    { at: 'payoff', text: 'Now they look *equal*.' },
    { at: 'end', text: 'It\'s why an O is drawn taller than an H.' },
  ],
};
LaunchBoard.lesson = {
  why: 'A circle fills about 78% of its box, a square nearly all of it. Drawn in the same box, the circle carries less ink, so in every row it reads smaller than the square beside it.',
  habit: 'In one set, draw round shapes a few percent larger than square ones. Type designers call it overshoot: an O is taller than an H.',
};
// What the eye sees in each row: the square's top and bottom edges carried across to the circle, which falls short of
// them. The pill, on the first row, is how much larger the circle has to be (to the square's size and the 4% past it).
LaunchBoard.measure = (root) => {
  const rows = [...(root?.querySelectorAll('[data-shapes]') ?? [])];
  if (!rows.length) return null;
  const k = rows[0].getBoundingClientRect().width / rows[0].offsetWidth || 1;
  const rules = [], bands = [], pills = [];
  let short0 = 0;
  rows.forEach((row, i) => {
    const [sq, ci] = [row.children[0], row.children[1]].map((b) => b.querySelector('svg > *').getBoundingClientRect());
    const short = (sq.height * 1.04 - ci.height) / k, left = sq.left - 6 * k, right = ci.right + 6 * k;
    rules.push({ key: `sq-top${i}`, y: sq.top, left, right }, { key: `sq-bottom${i}`, y: sq.bottom, left, right },
      { key: `ci-top${i}`, y: ci.top, left: ci.left, right: ci.right }, { key: `ci-bottom${i}`, y: ci.bottom, left: ci.left, right: ci.right });
    bands.push({ key: `short${i}`, left: ci.left, right: ci.right, top: sq.top, bottom: ci.top, pattern: 'hatch' });
    if (i === 0) { short0 = short; pills.push({ key: 'short', x: (ci.left + ci.right) / 2, y: sq.top - 12 * k, text: (Math.max(0, short) * k).toFixed(1), ok: short < 0.3 }); }
  });
  const a = rows[0].getBoundingClientRect(), z = rows[rows.length - 1].getBoundingClientRect();
  return {
    lines: [], rules, bands, pills, off: short0 >= 0.3,
    cut: { left: a.left, right: a.left + a.width / 2, top: a.top, bottom: z.bottom, r: 6 * k },
    subject: { left: a.left - 30 * k, right: a.left + a.width / 2 + 30 * k, top: a.top - 30 * k, bottom: z.bottom + 20 * k },
  };
};
