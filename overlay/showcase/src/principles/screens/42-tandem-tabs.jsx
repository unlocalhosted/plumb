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
import { toyOf } from '../../../../src/toys.js';
import { ensureLook } from '../look.js';

ensureLook();
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
const TASKS = [
  ['Hero animation, final cut', 'Motion', 'lilac', theo, 'Mon', 'done'],
  ['Streak calculator, mobile layout', 'Build', 'sky', ines, 'Today', 'half', true],
  ['Localise the pricing page, 9 languages', 'Content', 'pink', ama, 'Fri', 'quarter', true],
  ['Accessibility pass on the quiz', 'QA', 'mint', arlo, 'Fri', 'todo'],
];

// React Plumber's own language (docs/design/visual-language.md, overlay/src/tokens.css): paper and rule, the card's
// shadow, the toy face for what a toy has printed on it (names, labels, buttons), Instrument Sans for words, pastel
// chips lettered in their own ink, toys for status. The tabs keep the classes plumber reads (hover:font-semibold).
const TT_CSS = `
.tt { width: min(33rem, calc(100vw - 2rem)); background: var(--pl-paper); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card);
  color: var(--pl-ink); font: 400 14px/20px var(--pl-sans); -webkit-font-smoothing: antialiased; }
.tt-num { font-variant-numeric: tabular-nums; }
.tt-head { display: flex; align-items: center; gap: 12px; padding: 18px 20px 14px; }
.tt-mark { display: block; width: 36px; height: 36px; flex: none; }
.tt-mark svg { display: block; width: 100%; height: 100%; }
.tt-title { display: flex; flex-direction: column; min-width: 0; }
.tt-name { font: var(--pl-round-w, 700) 18px/24px var(--pl-round); letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tt-meta { font-size: 13px; line-height: 18px; color: var(--pl-ink-2); }
.tt-faces { margin-left: auto; display: flex; }
.tt-faces img { display: block; width: 26px; height: 26px; border-radius: 99px; object-fit: cover; box-shadow: 0 0 0 2px var(--pl-paper); }
.tt-faces img + img { margin-left: -6px; }
.tt-new { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border: 0; border-radius: 10px; cursor: pointer;
  font: var(--pl-round-w, 700) 13px/1 var(--pl-round); color: var(--pl-pink-block-on, #fff); background: var(--pl-pink-block, var(--pl-pink));
  box-shadow: inset 0 -2px 0 rgb(0 0 0 / 0.14), 0 1px 2px rgb(0 0 0 / 0.08); }
.tt-tabs { display: flex; gap: 20px; padding: 0 20px; box-shadow: inset 0 -1px 0 var(--pl-rule); }
.tt-tab { padding: 10px 0; font-size: 14px; line-height: 20px; color: var(--pl-ink-2); text-decoration: none; border-bottom: 2px solid transparent; }
.tt-tab:hover, .tt-tab[data-film] { color: var(--pl-ink); }
.tt-tab[aria-current="page"] { color: var(--pl-ink); border-bottom-color: var(--pl-ink); }
.tt-label { display: flex; justify-content: space-between; margin: 0; font: var(--pl-round-w2, 700) 12px/16px var(--pl-round); color: var(--pl-ink-2); }
.tt-quiet { font: 400 12px/16px var(--pl-sans); color: var(--pl-ink-2); }
.tt-road { padding: 18px 20px 16px; }
.tt-track { position: relative; display: block; height: 6px; margin: 20px 6px 0; border-radius: 99px; background: var(--pl-paper-2); }
.tt-fill { position: absolute; inset: 0 auto 0 0; border-radius: 99px; background: var(--pl-mint); }
.tt-stop { position: absolute; top: -3px; width: 12px; height: 12px; margin-left: -6px; border-radius: 99px; background: var(--pl-paper); box-shadow: inset 0 0 0 2px var(--pl-ink-3); }
.tt-stop.done { background: var(--pl-mint); box-shadow: 0 0 0 2px var(--pl-paper); }
.tt-today { position: absolute; top: -8px; bottom: -8px; width: 2px; margin-left: -1px; border-radius: 2px; background: var(--pl-ink); }
.tt-stops { position: relative; display: block; height: 34px; margin: 10px 6px 0; font-size: 12px; line-height: 16px; color: var(--pl-ink-2); }
.tt-at { position: absolute; display: flex; flex-direction: column; white-space: nowrap; transform: translateX(-50%); text-align: center; }
.tt-at.first { transform: none; text-align: left; } .tt-at.last { transform: translateX(-100%); text-align: right; }
.tt-at b { font: var(--pl-round-w2, 700) 12px/16px var(--pl-round); color: var(--pl-ink); }
.tt-week { padding: 4px 20px 8px; box-shadow: inset 0 1px 0 var(--pl-rule); }
.tt-week .tt-label { padding: 12px 0 4px; }
.tt-week ul { margin: 0; padding: 0; list-style: none; }
.tt-week li { display: grid; grid-template-columns: 18px 1fr auto 24px 52px; align-items: center; gap: 12px; height: 44px; box-shadow: inset 0 -1px 0 var(--pl-rule); }
.tt-week li:last-child { box-shadow: none; }
.tt-status { display: block; width: 18px; height: 18px; border-radius: 6px; }
.tt-status svg { display: block; width: 100%; height: 100%; }
.tt-status.half, .tt-status.quarter { border-radius: 99px; padding: 4px; box-shadow: inset 0 0 0 2px var(--pl-sky); background-clip: content-box; }
.tt-status.half { background-image: conic-gradient(var(--pl-sky) 0 50%, transparent 0); }
.tt-status.quarter { background-image: conic-gradient(var(--pl-sky) 0 25%, transparent 0); }
.tt-status.todo { border-radius: 99px; box-shadow: inset 0 0 0 2px var(--pl-ink-3); }
.tt-task { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tt-task.done { color: var(--pl-ink-2); text-decoration: line-through; text-decoration-color: var(--pl-ink-3); }
.tt-chip { display: inline-grid; place-items: center; height: 22px; padding: 0 8px; border-radius: var(--pl-radius-tag); font: var(--pl-round-w2, 700) 11.5px/1 var(--pl-round); }
.tt-face { display: block; width: 24px; height: 24px; border-radius: 99px; object-fit: cover; }
.tt-due { display: grid; place-items: center; height: 22px; border-radius: var(--pl-radius-tag); font-size: 12px; color: var(--pl-ink-2); }
.tt-due.soon { background: var(--pl-butter-soft); color: var(--pl-butter-ink); font-weight: 600; }
.tt-foot { display: flex; align-items: center; gap: 14px; padding: 14px 20px 16px; border-radius: 0 0 var(--pl-radius-card) var(--pl-radius-card); background: var(--pl-paper-2); }
.tt-budget { display: flex; flex-direction: column; }
.tt-label-s { font: var(--pl-round-w2, 700) 12px/16px var(--pl-round); color: var(--pl-ink-2); }
.tt-budget b { font: var(--pl-round-w, 700) 16px/22px var(--pl-round); }
.tt-budget b span { font: 400 12.5px/1 var(--pl-sans); color: var(--pl-ink-2); }
.tt-bar { flex: 1; height: 8px; overflow: hidden; border-radius: 99px; background: rgb(28 27 25 / 0.07); }
.tt-bar i { display: block; height: 100%; border-radius: 99px; background: var(--pl-pink); }
`;

export default function TandemTabs({ side = 'broken', onStatus }) {
  const root = useRef(null), nav = useRef(null);
  const [rest, setRest] = useState(null);
  const [read, setRead] = useState(null); // the last hover read: held after the pointer leaves, until the next one
  // the film plays the hover with data-film (Film.jsx): the same look as the pointer's
  const hover = side === 'broken' ? 'hover:font-semibold hover:text-ink data-[film]:font-semibold data-[film]:text-ink' : 'hover:text-ink data-[film]:text-ink';
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
    <article ref={root} onPointerMove={look} onPointerOver={look} className="tt pl-light relative">
      <style>{TT_CSS}</style>
      <header className="tt-head">
        <span className="tt-mark" dangerouslySetInnerHTML={{ __html: toyOf('grid') }} />
        <span className="tt-title">
          <span className="tt-name">Spring campaign site</span>
          <span className="tt-meta">Duolingo · week <span className="tt-num">8</span> of <span className="tt-num">14</span></span>
        </span>
        <span className="tt-faces">{[ines, theo, ama, arlo].map((src, i) => <img key={i} src={src} alt="" />)}</span>
        <button type="button" className="tt-new"><span aria-hidden="true">+</span> New task</button>
      </header>

      <nav ref={nav} aria-label="Views" className="tt-tabs">
        {VIEWS.map((v, i) => (
          <a key={v} href={`#${v.toLowerCase()}`} onClick={(e) => e.preventDefault()} aria-current={i === 0 ? 'page' : undefined}
            className={i === 0 ? 'tt-tab font-semibold' : `tt-tab ${hover}`}>{v}</a>
        ))}
      </nav>

      {/* kickoff to launch: done milestones filled, today's line, launch ahead */}
      <section className="tt-road">
        <h3 className="tt-label"><span>Road to launch</span><span className="tt-quiet"><span className="tt-num">58%</span> · on track</span></h3>
        <span className="tt-track">
          <span className="tt-fill" style={{ width: `${TODAY}%` }} />
          {ROAD.map(([what, , at, done]) => <span key={what} className={'tt-stop' + (done ? ' done' : '')} style={{ left: `${at}%` }} />)}
          <span aria-label="Today" className="tt-today" style={{ left: `${TODAY}%` }} />
        </span>
        <span className="tt-stops">
          {ROAD.map(([what, date, at], i) => (
            <span key={what} className={'tt-at ' + (i === 0 ? 'first' : i === ROAD.length - 1 ? 'last' : '')} style={{ left: `${at}%` }}>
              <b>{what}</b><span className="tt-num">{date}</span>
            </span>
          ))}
        </span>
      </section>

      <section className="tt-week">
        <h3 className="tt-label"><span>Due this week</span><span className="tt-quiet"><span className="tt-num">4</span> of <span className="tt-num">12</span> open</span></h3>
        <ul>
          {TASKS.map(([task, label, hue, face, due, status, soon]) => (
            <li key={task}>
              <span className={'tt-status ' + status} dangerouslySetInnerHTML={{ __html: status === 'done' ? toyOf('checkbox') : '' }} />
              <span className={'tt-task' + (status === 'done' ? ' done' : '')}>{task}</span>
              <span className="tt-chip" style={{ background: `var(--pl-${hue}-soft)`, color: `var(--pl-${hue}-ink)` }}>{label}</span>
              <img src={face} alt="" className="tt-face" />
              <span className={'tt-due tt-num' + (soon ? ' soon' : '')}>{due}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="tt-foot">
        <span className="tt-budget"><span className="tt-label-s">Budget used</span><b className="tt-num">182h <span>of 300h</span></b></span>
        <span className="tt-bar"><i style={{ width: '61%' }} /></span>
        <span className="tt-quiet tt-num">61%</span>
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

// The film (Film.jsx), in plumber's language. The places: every view tab but the current one, already semibold. What
// is measured, from the real tabs: the hovered tab's content width (plumber's size pill), where each tab after it
// belonged and how far it was pushed, and the cause as plumber's typography pill names it, its weight. On the fixed
// side the weight stays and the hover is a colour: plumber names the ink it uses.
const fmt = (v) => Math.round(v * 10) / 10;
TandemTabs.film = {
  instances: (root) => [...root.querySelectorAll('nav a')].slice(1),
  frame: (root) => [...root.querySelectorAll('nav a')],
  set: (el, on) => (on ? el.setAttribute('data-film', '') : el.removeAttribute('data-film')),
  lead: 1,
  // the sauce: the class that sets the weight on hover, and plumber's fix (craft-rules.js boldHover: the hover's colour, the same width)
  code: { fault: { cls: 'hover:font-semibold', prop: 'font-weight: 600' }, fix: { cls: 'hover:text-ink', prop: 'color: ink' } },
  read(root, i, rest) {
    const at = local(root), tabs = [...root.querySelectorAll('nav a')].slice(1), now = tabs.map(at), s = getComputedStyle(tabs[i]);
    const weight = parseInt(s.fontWeight, 10) || 400;
    return {
      box: now[i], now,
      size: { icon: 'c', pre: 'W ', from: fmt(rest[i].w), to: fmt(now[i].w) },
      tags: [{ icon: 'line', pre: 'Aa sm · ', from: 400, to: weight }], // the colour the fix uses is said once, in the change card
      pushed: tabs.map((_, j) => j).filter((j) => j > i).map((j) => ({ x0: rest[j].x, x1: now[j].x, y: now[j].y, h: now[j].h })),
    };
  },
  say: 'Run your pointer along the tabs.',
  // the words on screen, approved by the owner 2026-11-16
  teach: { fault: 'font-weight: 600', fix: 'color: var(--ink)' },
  script: [
    { at: 'rest', text: 'Run your pointer along these tabs, and the whole row *jitters*.' },
    { at: 'measure', text: 'These tabs turn bold on hover. Bold letters are wider, so the rest get pushed.' },
    { at: 'fix', text: 'Show the hover with a darker colour instead.' },
    { at: 'payoff', text: 'Now the row stays *still* under your hand.' },
  ],
};
TandemTabs.lesson = {
  why: 'Bold letters are wider than regular ones. When a tab turns semibold under the pointer it grows a few pixels, and every tab after it slides over: move along the row and the whole row jitters under your cursor.',
  habit: 'Show hover with colour, not weight; if a hover must be bold, reserve the bold width first.',
};
