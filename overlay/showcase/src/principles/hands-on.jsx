// Hands-on examples (docs/craft/tactile-demos.md, .claude/skills/craft-rule §3¾): for a principle whose mistake only
// exists while someone does something, the viewer's own hand is the probe. Each example is one component with two
// sides (`side`: 'broken' | 'fixed', as the probe stage's are): the real component, which really behaves that way, and
// plumber's marks drawn live from what the viewer just did. Marks are a vocabulary, not a kit: each draws one number
// plumber's rule measures and the lesson turns on, and nothing else (no trail unless the path is the lesson).
//
// The marks live in a shadow root with plumber's tokens (overlay/src/tokens.css), as the stage's PlumbLayer does, so
// plumber reading [data-example] never reads them. Each example says what just happened through `onStatus`.
//
// HANDS_ON[n] = Component, with .names (the switch, naming the technique) and .lesson ({ why, habit }).
// /hands-on/:n shows one alone with its switch (a viewer for building them; the stage wires them in).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FolderIcon, PlusIcon } from '@unlocalhosted/dither-icons';

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

// plumber's marks, as the stage draws them (Principle.jsx Marks): 1px lines at 55%, hatch at 45°, the blueprint tag
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

// ── #42 Bold on hover must not shift layout ─────────────────────────────────
// A project's views as tabs. Broken: hover:font-semibold, the habit plumber flags (ProjectTabs). Semibold letters are
// wider, so the tab under the pointer grows and every tab after it slides. Fixed: plumber's fix, darker on hover.
// The marks: only what moved and by how much. Each later tab's resting edge (a dashed line), the ground it slid across
// (hatch), the tab that grew (an outline), and the shift in px, read from the real tabs against where they rest.
// No trail, no ruler: the route and the time aren't the lesson.
const VIEWS = ['Overview', 'Board', 'Timeline', 'Files', 'Settings'];
const TASKS = [
  ['Brief the press list', 'LR', 'Thu', true],
  ['Final cut of the launch film', 'JB', 'Fri', true],
  ['Pricing page copy', 'AO', '12 Mar', false],
];
function BoldHover({ side = 'broken', onStatus }) {
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
    const name = VIEWS[read.i], n = read.after.length;
    onStatus?.(read.shift >= 0.5
      ? `${name} turned semibold and grew ${read.shift.toFixed(1)}px, so the ${n} tab${n === 1 ? '' : 's'} after it slid over by that much. Every tab you cross does it again.`
      : `${name} darkened and kept its width: nothing after it moved.`);
  }, [read, onStatus]);

  const off = read && read.shift >= 0.5;
  return (
    <article ref={root} onPointerMove={look} onPointerOver={look} className="relative w-[30rem] max-w-full rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-2 px-5 pt-4 pb-3">
        <FolderIcon size={16} texture="dither" className="text-ink-muted" />
        <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Spring launch</span>
        <span className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-control pr-2.5 pl-2 text-[13px] font-medium text-ink-muted ring-1 ring-line ring-inset"><PlusIcon size={14} texture="solid" />New task</span>
      </header>
      <nav ref={nav} aria-label="Views" className="flex gap-5 border-b-hairline border-line px-5">
        {VIEWS.map((v, i) => (
          <a key={v} href={`#${v.toLowerCase()}`} onClick={(e) => e.preventDefault()} aria-current={i === 0 ? 'page' : undefined}
            className={i === 0 ? '-mb-px border-b-2 border-ink py-2.5 text-sm font-semibold' : `border-b-2 border-transparent py-2.5 text-sm text-ink-muted ${hover}`}>{v}</a>
        ))}
      </nav>
      <ul className="px-3 py-2">
        {TASKS.map(([task, who, due, soon]) => (
          <li key={task} className="flex h-10 items-center gap-3 px-2 text-[13px]">
            <span className="size-3.5 shrink-0 rounded-full ring-[1.25px] ring-ink/25 ring-inset" />
            <span className="min-w-0 flex-1 truncate">{task}</span>
            <span className="grid size-6 place-items-center rounded-full bg-sunken text-[10px] font-medium text-ink-muted ring-1 ring-line ring-inset">{who}</span>
            <span className={'w-14 rounded-chip px-1.5 py-1 text-center text-[11px] font-medium ' + (soon ? 'bg-caution-soft text-caution' : 'text-ink-subtle')}>{due}</span>
          </li>
        ))}
      </ul>
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
BoldHover.names = ['Bold on hover', 'Darker on hover'];
BoldHover.lesson = {
  why: 'Bold letters are wider than regular ones. When a tab turns semibold under the pointer it grows a few pixels, and every tab after it slides over: move along the row and the whole row jitters under your cursor.',
  habit: 'Show hover with colour, not weight. If a hover must be bold, reserve the bold width first (a hidden bold copy of the label).',
};

export const HANDS_ON = { 42: BoldHover };

// ── /hands-on/:n, a viewer for building them ───────────────────────────────
export function HandsOnPage({ n }) {
  const Example = HANDS_ON[n];
  const [side, setSide] = useState('broken');
  const [status, setStatus] = useState('');
  if (!Example) return <p className="p-10 text-sm text-ink-muted">No hands-on example for №{n}.</p>;
  const seg = 'inline-flex h-7 items-center rounded-[6px] px-3 text-[13px] whitespace-nowrap';
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-board bg-[radial-gradient(var(--color-board-dot)_1px,transparent_1px)] bg-size-[16px_16px] p-10">
      <section data-example aria-label="Example" className="w-fit"><Example key={side} side={side} onStatus={setStatus} /></section>
      <div role="group" aria-label="Technique" className="flex items-center gap-0.5 rounded-control bg-sunken p-0.5 ring-1 ring-line">
        {Example.names.map((name, i) => {
          const s = i ? 'fixed' : 'broken';
          return <button key={s} type="button" aria-pressed={side === s} onClick={() => setSide(s)} className={seg + (side === s ? ' bg-surface text-ink shadow-raised' : ' text-ink-muted hover:text-ink')}>{name}</button>;
        })}
      </div>
      <p className="h-10 max-w-md text-center text-[13px] text-ink-muted text-pretty">{status}</p>
    </main>
  );
}
