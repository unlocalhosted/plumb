// #42 bold on hover must not shift layout (hands-on: the viewer's pointer is the probe). Tandem, a project tracker: a
// studio's "Spring campaign site" for Duolingo, week 8 of 14. The client's mark and the team, the project's views as
// tabs, the road to launch with today's line, this week's tasks with their status, owner and due day, the budget
// burnt. Every view tab other than the current one darkens and turns semibold on hover. Bold letters are wider, so the
// tab under the pointer grows and every tab after it slides: run the pointer along the row and each tab you cross
// shoves the rest. plumber keeps the hover as a colour: darker, the same width.
//
// The marks (drawn live from what the viewer's pointer just did, in a shadow root with plumber's tokens, so plumber
// reading [data-example] never reads them): each later tab's resting edge, the ground it slid across, the tab that
// grew, and the shift in px, read from the real tabs against where they rest. Nothing is drawn at rest.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon } from '@unlocalhosted/dither-icons';
import duolingoLogo from '../../media/logos/duolingo.svg';
import ines from '../../media/people/person-05.jpg';
import theo from '../../media/people/person-08.jpg';
import ama from '../../media/people/person-03.jpg';
import arlo from '../../media/people/person-06.jpg';

export const n = 42;
export const handsOn = true;

// plumber's marks: a shadow root with plumber's tokens
const TOKENS = '/__plumb/src/tokens.css';
function MarksLayer({ children }) {
  const host = useRef(null);
  const [root, setRoot] = useState(null);
  useEffect(() => {
    const r = host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' });
    r.innerHTML = `<link rel="stylesheet" href="${TOKENS}"><style>:host { position: absolute; inset: 0; pointer-events: none; overflow: visible; }</style>`;
    setRoot(r);
  }, []);
  return <div ref={host} data-scheme="light" aria-hidden="true" className="pointer-events-none absolute inset-0">{root ? createPortal(children, root) : null}</div>;
}
const hue = (off) => (off ? 'var(--pl-off)' : 'var(--pl-on)');
const Line = ({ x, y, h, off, dashed }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: 0, height: h, borderLeft: `1px ${dashed ? 'dashed' : 'solid'} ${hue(off)}`, opacity: dashed ? 0.8 : 0.55 }} />
);
const Hatch = ({ x, y, w, h }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: 0.55, backgroundImage: 'repeating-linear-gradient(45deg, var(--pl-off) 0 1px, transparent 1px 4px)' }} />
);
const Outline = ({ x, y, w, h, off, r = 4 }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, boxShadow: `inset 0 0 0 1px ${hue(off)}`, opacity: 0.7 }} />
);
const Tag = ({ x, y, off, children }) => (
  <span style={{ position: 'absolute', left: x, top: y, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: hue(off), boxShadow: '0 0 0 1px var(--pl-halo)', animation: 'none' }}>{children}</span>
);
// a box in the example's own pixels, whatever the stage's camera does to it (a scale on an ancestor)
function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}

const VIEWS = ['Overview', 'Board', 'Timeline', 'Files', 'Settings'];
// kickoff to launch: where each milestone falls on the 14 weeks, done or ahead; today is in week 8
const ROAD = [['Kickoff', '15 Sep', 0, true], ['Designs signed', '20 Oct', 45, true], ['Copy freeze', '1 Dec', 80], ['Launch', '19 Dec', 100]];
const TODAY = 55;
// status: done, half, a quarter, not started
const STATUS = {
  done: <><circle cx="8" cy="8" r="6.5" fill="none" className="stroke-[#1f9d6b]" strokeWidth="1.5" /><path d="M5 8.2l2 2 4-4.2" fill="none" className="stroke-[#1f9d6b]" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></>,
  half: <><circle cx="8" cy="8" r="6.5" fill="none" className="stroke-accent" strokeWidth="1.5" /><path d="M8 3.5a4.5 4.5 0 0 1 0 9z" className="fill-accent" /></>,
  quarter: <><circle cx="8" cy="8" r="6.5" fill="none" className="stroke-accent" strokeWidth="1.5" /><path d="M8 3.5a4.5 4.5 0 0 1 4.5 4.5H8z" className="fill-accent" /></>,
  todo: <circle cx="8" cy="8" r="6.5" fill="none" className="stroke-[#a3acb9] [stroke-dasharray:2.2_2]" strokeWidth="1.5" />,
};
const TASKS = [
  ['Hero animation, final cut', 'Motion', theo, 'Mon', 'done'],
  ['Streak calculator, mobile layout', 'Build', ines, 'Today', 'half', true],
  ['Localise the pricing page, 9 languages', 'Content', ama, 'Fri', 'quarter', true],
  ['Accessibility pass on the quiz', 'QA', arlo, 'Fri', 'todo'],
];

export default function TandemTabs({ side = 'broken', onStatus }) {
  const root = useRef(null), nav = useRef(null);
  const [rest, setRest] = useState(null);
  const [read, setRead] = useState(null); // the last hover read: held after the pointer leaves, until the next one
  const hover = side === 'broken' ? 'hover:font-semibold hover:text-ink' : 'hover:text-ink';
  const tabs = () => [...(nav.current?.querySelectorAll('a') ?? [])];
  // where each tab rests, read with nothing hovered: on mount, on each side, once the font is in, on resize
  const measure = () => { if (!root.current || tabs().some((t) => t.matches(':hover'))) return; const at = local(root.current); setRest(tabs().map(at)); };
  useLayoutEffect(() => { measure(); setRead(null); }, [side]);
  useEffect(() => {
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(() => measure());
    ro.observe(root.current);
    return () => ro.disconnect();
  }, []);
  // read on the next frame: the pointer's events arrive before the browser has moved :hover (and the weight with it)
  const look = () => requestAnimationFrame(readHover);
  const readHover = () => {
    if (!rest || !root.current) return;
    const list = tabs(), i = list.findIndex((t) => t.matches(':hover'));
    if (i <= 0) return; // nothing, or the current view (it's already semibold)
    const at = local(root.current), now = list.map(at);
    const after = now.map((_, j) => j).filter((j) => j > i);
    const shift = Math.max(0, ...after.map((j) => now[j].x - rest[j].x));
    setRead({ i, now, after, shift });
  };
  useEffect(() => {
    if (!read) return onStatus?.('Run your pointer along the tabs, slowly.');
    const name = VIEWS[read.i], k = read.after.length;
    onStatus?.(read.shift >= 0.5
      ? `${name} turned semibold and grew ${read.shift.toFixed(1)}px, so the ${k} tab${k === 1 ? '' : 's'} after it slid over by that much. Every tab you cross does it again.`
      : `${name} darkened and kept its width: nothing after it moved.`);
  }, [read, onStatus]);
  const off = read && read.shift >= 0.5;

  return (
    <article ref={root} onPointerMove={look} onPointerOver={look} className="relative w-[min(32.5rem,calc(100vw-2rem))] rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-3 px-5 pt-[18px] pb-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-[#58cc02]"><span className="size-5 bg-white" style={{ mask: `url("${duolingoLogo}") center / contain no-repeat` }} /></span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[17px] leading-6 font-medium tracking-[-0.01em]">Spring campaign site</span>
          <span className="text-[13px] text-ink-muted">Duolingo · week <span className="tabular-nums">8</span> of <span className="tabular-nums">14</span></span>
        </span>
        <span className="ml-auto flex">
          {[ines, theo, ama, arlo].map((src, i) => <img key={i} src={src} alt="" className={'block size-[26px] rounded-full object-cover ring-2 ring-surface outline-1 -outline-offset-1 outline-black/10 ' + (i ? '-ml-1.5' : '')} />)}
        </span>
        <button type="button" className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-control pr-2.5 pl-2 text-[13px] font-medium text-ink-muted ring-1 ring-line ring-inset hover:bg-sunken hover:text-ink"><PlusIcon size={14} texture="solid" />New task</button>
      </header>

      <nav ref={nav} aria-label="Views" className="flex gap-5 border-b-hairline border-line px-5">
        {VIEWS.map((v, i) => (
          <a key={v} href={`#${v.toLowerCase()}`} onClick={(e) => e.preventDefault()} aria-current={i === 0 ? 'page' : undefined}
            className={i === 0 ? 'border-b-2 border-ink py-2.5 text-sm font-semibold' : `border-b-2 border-transparent py-2.5 text-sm text-ink-muted ${hover}`}>{v}</a>
        ))}
      </nav>

      {/* kickoff to launch: done milestones filled, today's line, launch ahead */}
      <section className="px-5 pt-[18px] pb-4">
        <h3 className="flex justify-between text-xs font-medium text-ink-subtle"><span>Road to launch</span><span><span className="tabular-nums">58%</span> · on track</span></h3>
        <span className="relative mx-1.5 mt-5 block h-1.5 rounded-full bg-sunken">
          <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${TODAY}%` }} />
          {ROAD.map(([what, , at, done]) => (
            <span key={what} className={'absolute top-0 -mt-[3px] -ml-1.5 size-3 rounded-full ' + (done ? 'bg-accent ring-2 ring-surface' : 'bg-surface shadow-[inset_0_0_0_2px_#c7cdd8]')} style={{ left: `${at}%` }} />
          ))}
          <span aria-label="Today" className="absolute -inset-y-2 -ml-px w-0.5 rounded-full bg-ink" style={{ left: `${TODAY}%` }} />
        </span>
        <span className="relative mx-1.5 mt-2.5 block h-[34px] text-xs leading-4 text-ink-muted">
          {ROAD.map(([what, date, at], i) => (
            <span key={what} className={'absolute whitespace-nowrap ' + (i === 0 ? 'text-left' : i === ROAD.length - 1 ? '-translate-x-full text-right' : '-translate-x-1/2 text-center')} style={{ left: `${at}%` }}>
              <span className="block font-medium text-ink">{what}</span><span className="tabular-nums">{date}</span>
            </span>
          ))}
        </span>
      </section>

      <section className="border-t-hairline border-line px-5 pt-1 pb-2">
        <h3 className="flex justify-between pt-3 pb-1 text-xs font-medium text-ink-subtle"><span>Due this week</span><span><span className="tabular-nums">4</span> of <span className="tabular-nums">12</span> open</span></h3>
        <ul>
          {TASKS.map(([task, label, face, due, status, soon]) => (
            <li key={task} className="grid h-11 grid-cols-[1rem_1fr_auto_1.5rem_3.5rem] items-center gap-3 border-b-hairline border-line last:hairline-none">
              <svg viewBox="0 0 16 16" className="size-4" aria-label={status}>{STATUS[status]}</svg>
              <span className={'truncate text-sm ' + (status === 'done' ? 'text-ink-muted line-through decoration-ink/30' : '')}>{task}</span>
              <span className="inline-grid h-5 place-items-center rounded-chip bg-sunken px-1.5 text-[11.5px] font-medium text-ink-muted">{label}</span>
              <img src={face} alt="" className="size-6 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
              <span className={'grid h-[22px] place-items-center rounded-chip text-xs font-medium tabular-nums ' + (soon ? 'bg-caution-soft text-caution' : 'text-ink-subtle')}>{due}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="flex items-center gap-3.5 rounded-b-card border-t-hairline border-line bg-sunken px-5 pt-3.5 pb-4">
        <span className="flex flex-col">
          <span className="text-xs font-medium text-ink-subtle">Budget used</span>
          <span className="text-[15px] font-semibold tabular-nums">182h <span className="text-[12.5px] font-normal text-ink-muted">of 300h</span></span>
        </span>
        <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-[rgb(18_35_61/0.07)]"><i className="h-full rounded-full bg-accent" style={{ width: '61%' }} /></span>
        <span className="text-xs font-medium text-ink-subtle tabular-nums">61%</span>
      </footer>

      <MarksLayer>
        {read && rest ? (
          <>
            {off ? <Outline {...read.now[read.i]} y={read.now[read.i].y + 6} h={read.now[read.i].h - 12} off /> : null}
            {read.after.map((j) => (
              <span key={j}>
                <Line x={rest[j].x} y={rest[j].y + 6} h={rest[j].h - 12} off={off} dashed={off} />
                {off ? <Hatch x={rest[j].x} y={rest[j].y + 10} w={read.now[j].x - rest[j].x} h={rest[j].h - 20} /> : null}
              </span>
            ))}
            {(() => { const last = read.now.at(-1); return <Tag x={last.x + last.w + 10} y={last.y + last.h / 2} off={off}>{off ? `+${read.shift.toFixed(1)}px · ${read.after.length} slid` : '0px ✓'}</Tag>; })()}
          </>
        ) : null}
      </MarksLayer>
    </article>
  );
}
TandemTabs.names = ['Bold on hover', 'Darker on hover'];
TandemTabs.lesson = {
  why: 'Bold letters are wider than regular ones. When a tab turns semibold under the pointer it grows a few pixels, and every tab after it slides over: move along the row and the whole row jitters under your cursor.',
  habit: 'Show hover with colour, not weight; if a hover must be bold, reserve the bold width first.',
};
