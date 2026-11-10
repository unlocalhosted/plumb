// #64 interruptible motion. Negative, a photo library: an album from three days in the Highlands. Everything on it
// that slides is built the same way: the Info panel, the Comments panel, and the bar that comes up while photos are
// selected.
//   broken  the entrance and the exit are two keyframe animations (tailwindcss-animate's slide-in / slide-out): change
//           your mind on the way in and the exit starts from its own first frame, fully open, so the panel snaps out to
//           the edge before it leaves
//   fixed   one transition on the panel's position, which the browser turns around from wherever it is
// plumber's toggle probe (src/craft-probe.ts) does what you do: opens, closes partway, and reads the panel every frame.
// The marks are that reading: where the edge was when you changed your mind, the ground it snapped across, and the
// openness over time as a trace, where a snap is a cliff. Slowed to ¼ so a hand can catch it.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, CloseIcon, DownloadIcon, HeartIcon, MessageIcon, SendIcon } from '@unlocalhosted/dither-icons';
import ridge from '../../media/s64-ridge.jpg';
import storr from '../../media/s64-storr.jpg';
import cattle from '../../media/s64-cattle.jpg';
import road from '../../media/s64-road.jpg';
import stones from '../../media/s64-stones.jpg';
import sheep from '../../media/s64-sheep.jpg';
import bluebells from '../../media/s64-bluebells.jpg';
import path from '../../media/s64-path.jpg';
import river from '../../media/s64-river.jpg';
import walt from '../../media/people/person-04.jpg';
import tomi from '../../media/people/person-09.jpg';
import ines from '../../media/people/person-01.jpg';

export const n = 64;
export const handsOn = true;

// plumber's marks layer (as the stage's PlumbLayer), and the marks this demo uses
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
const Tag = ({ x, y, off, children }) => (
  <span style={{ position: 'absolute', left: x, top: y, transform: 'translate(-100%, -50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: hue(off), boxShadow: '0 0 0 1px var(--pl-halo)' }}>{children}</span>
);
// an edge: up and down for a panel that slides sideways, across for one that slides up
const Edge = ({ at, from, to, vertical, off, dashed }) => (
  <span style={{ position: 'absolute', ...(vertical ? { left: at, top: from, height: to - from, width: 0, borderLeft: `1px ${dashed ? 'dashed' : 'solid'} ${hue(off)}` } : { top: at, left: from, width: to - from, height: 0, borderTop: `1px ${dashed ? 'dashed' : 'solid'} ${hue(off)}` }), opacity: dashed ? 0.8 : 0.55 }} />
);
const Hatch = ({ x, y, w, h }) => <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: 0.55, backgroundImage: 'repeating-linear-gradient(45deg, var(--pl-off) 0 1px, transparent 1px 4px)' }} />;
function useTicking(on) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!on) return;
    let id = requestAnimationFrame(function f() { tick((x) => x + 1); id = requestAnimationFrame(f); });
    return () => cancelAnimationFrame(id);
  }, [on]);
}

/* ─────────────────────────────────────────────────────────
 * THE PANELS
 *   info, comments  264px wide, from the right edge
 *   bar             the selection bar, 48px tall, up from 16px under the bottom edge
 *   320ms each way, ¼ speed by default
 * ───────────────────────────────────────────────────────── */
const BASE_MS = 320, SIDE_W = 264, BAR_H = 48, BAR_GAP = 16;
const PANELS = { info: { name: 'Info', axis: 'x', size: SIDE_W }, comments: { name: 'Comments', axis: 'x', size: SIDE_W }, bar: { name: 'The selection bar', axis: 'y', size: BAR_H + BAR_GAP } };

const DAYS = [
  { day: 'Tue 14 May', place: 'Trotternish', count: 32, rows: [[['ridge', ridge, 1.5, 'fav'], ['storr', storr, 1.2], ['cattle', cattle, 1.3]], [['road', road, 1.6], ['stones', stones, 0.8], ['sheep', sheep, 1.4]]], h: 'h-[8.25rem]' },
  { day: 'Wed 15 May', place: 'into the woods', count: 41, rows: [[['bluebells', bluebells, 1.4], ['path', path, 0.8], ['river', river, 0.9]]], h: 'h-24' },
];
const COMMENTS = [
  [tomi, 'Tomi', '07:58', 'The light on the Storr here. This is the cover.'],
  [walt, 'Walt', '08:12', 'Agreed. I’ll pull the one at 07:42 too, it’s sharper.'],
  [ines, 'Ines', '09:30', 'Can we get it printed at A2 for the studio?'],
];

export default function NegativeAlbum({ side = 'broken', onStatus }) {
  const root = useRef(null), card = useRef(null), refs = useRef({});
  const keyframes = side === 'broken';
  const [slow, setSlow] = useState(true);
  const [run, setRun] = useState(null); // { panel, samples: [{ t, v }], presses: [{ t, v }], done }
  const [picked, setPicked] = useState(['storr']);
  const [, redraw] = useState(0);
  const open = useRef({ info: false, comments: false, bar: true }), live = useRef(null);
  const dur = BASE_MS * (slow ? 4 : 1);
  useTicking(!!run && !run.done);
  // a panel's openness, read from where it is on screen: 0 tucked away, 1 all the way in
  const openness = (id) => {
    const p = refs.current[id], c = card.current;
    if (!p || !c || p.hidden) return 0;
    const o = c.getBoundingClientRect(), r = p.getBoundingClientRect(), k = o.width / c.offsetWidth || 1, { axis, size } = PANELS[id];
    return Math.max(0, Math.min(1, axis === 'x' ? (o.right - r.left) / k / size : (o.bottom - r.top) / k / size));
  };
  const place = (id, on) => {
    const p = refs.current[id];
    if (!p) return;
    p.classList.remove('np-in', 'np-out', 'np-open', 'np-rest');
    p.hidden = !on;
    if (on) p.classList.add('np-rest');
    open.current[id] = on;
  };
  // at rest: one photo picked, so its bar is up; the panels are away
  const reset = () => { live.current = null; setRun(null); setPicked(['storr']); place('info', false); place('comments', false); place('bar', true); redraw((x) => x + 1); };
  useEffect(reset, [side, slow]);

  // every panel is driven here, the same way
  const toggle = (id, to = !open.current[id]) => {
    const p = refs.current[id];
    if (!p || to === open.current[id]) return;
    // Info and Comments share the side: opening one puts the other away at once (a fresh try)
    const other = id === 'info' ? 'comments' : id === 'comments' ? 'info' : null;
    if (to && other && open.current[other]) place(other, false);
    const t0 = performance.now(), v = openness(id);
    if (!live.current || live.current.done || live.current.panel !== id) live.current = { panel: id, t0, samples: [{ t: 0, v }], presses: [], done: false, quiet: t0 };
    live.current.presses.push({ t: t0 - live.current.t0, v });
    open.current[id] = to;
    p.classList.remove('np-rest');
    if (keyframes) {
      // two animations: the exit replaces the entrance and starts from its own first frame
      if (to) { p.hidden = false; p.classList.remove('np-out'); p.classList.add('np-in'); }
      else { p.classList.remove('np-in'); p.classList.add('np-out'); }
    } else {
      // one transition: a new target, from wherever it is
      if (to && p.hidden) { p.hidden = false; p.classList.remove('np-open'); }
      p.getBoundingClientRect();
      p.classList.toggle('np-open', to);
    }
    redraw((x) => x + 1);
  };
  const pick = (id) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    setPicked(next);
    if (!!next.length !== !!picked.length) toggle('bar', next.length > 0);
  };
  // plumber's reading: every frame, until the panel has rested for 400ms
  useEffect(() => {
    let id;
    const tick = () => {
      const r = live.current;
      if (r && !r.done) {
        const now = performance.now(), v = openness(r.panel), last = r.samples.at(-1);
        r.samples.push({ t: now - r.t0, v });
        if (Math.abs(v - last.v) > 0.001) r.quiet = now;
        if (now - r.quiet > 400 || now - r.t0 > dur * 3) r.done = true;
        setRun({ panel: r.panel, samples: [...r.samples], presses: [...r.presses], done: r.done });
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [dur]);
  const ended = (id) => (e) => {
    if (e.target !== e.currentTarget || open.current[id]) return;
    if (e.animationName === 'np-out-x' || e.animationName === 'np-out-y' || e.type === 'transitionend') { e.currentTarget.hidden = true; e.currentTarget.classList.remove('np-out'); }
  };

  // a step of over 20% within a frame or two of a press mid-motion is a snap; a press mid-motion without one, a turn
  const snaps = [], turns = [];
  if (run) {
    const s = run.samples;
    for (let i = 1; i < s.length; i++) if (Math.abs(s[i].v - s[i - 1].v) > 0.2 && run.presses.some((q, k) => k > 0 && s[i].t - q.t >= 0 && s[i].t - q.t < 60)) snaps.push({ from: s[i - 1], to: s[i] });
    run.presses.forEach((q, k) => { if (k > 0 && q.v > 0.02 && q.v < 0.98 && !snaps.some((j) => Math.abs(j.from.t - q.t) < 60)) turns.push(q); });
  }
  const snap = snaps.at(-1), turn = turns.at(-1), pct = (v) => `${Math.round(v * 100)}%`, said = run ? PANELS[run.panel].name : '';
  useEffect(() => {
    onStatus?.(!run ? `Open Info or Comments, or pick a photo, then do it again while it’s still sliding${slow ? '' : ' (¼× gives you time)'}.`
      : snap ? `${said}: you changed your mind at ${pct(snap.from.v)}; the ${snap.to.v > snap.from.v ? 'exit' : 'entrance'} started from its own first frame, so it snapped to ${pct(snap.to.v)} first.`
      : turn ? `${said} turned around at ${pct(turn.v)}, from where it was. Nothing snapped.`
      : run.presses.length === 1 && !run.done ? 'Now press it again before it settles.' : 'Press it again while it’s moving.');
  }, [run?.panel, run?.presses.length, !!snap, !!turn, run?.done, slow, onStatus]);

  // the marks, in the card's pixels
  const W = card.current?.offsetWidth ?? 680, H = card.current?.offsetHeight ?? 536, top = 60;
  const axis = run ? PANELS[run.panel].axis : 'x', size = run ? PANELS[run.panel].size : SIDE_W;
  const edge = (v) => (axis === 'x' ? W - size * v : H - size * v);
  const TW = W, TH = 52, span = dur * 3, tx = (t) => (Math.min(span, t) / span) * TW, ty = (v) => 8 + TH - v * TH;
  const seg = 'h-[26px] rounded-[5px] px-2.5 text-[13px] active:bg-line';
  const headBtn = (on) => 'inline-flex h-8 items-center gap-1.5 rounded-control pr-2.5 pl-2 text-[13px] font-medium ring-1 ring-inset ' + (on ? 'bg-accent-soft text-accent-deep ring-accent/20 active:bg-accent/15' : 'text-ink ring-line hover:bg-sunken active:bg-line');
  return (
    <div ref={root} className="relative w-[42.5rem] max-w-full pb-28">
      <style>{`@keyframes np-in-x { from { translate: 100% 0 } to { translate: 0 0 } } @keyframes np-out-x { from { translate: 0 0 } to { translate: 100% 0 } }
        @keyframes np-in-y { from { translate: 0 calc(100% + ${BAR_GAP}px) } to { translate: 0 0 } } @keyframes np-out-y { from { translate: 0 0 } to { translate: 0 calc(100% + ${BAR_GAP}px) } }
        .np-x { translate: 100% 0; } .np-y { translate: 0 calc(100% + ${BAR_GAP}px); } .np-rest { translate: 0 0; }
        .np-x.np-in { animation: np-in-x ${dur}ms var(--ease-arrive) both; } .np-x.np-out { animation: np-out-x ${dur}ms var(--ease-arrive) both; }
        .np-y.np-in { animation: np-in-y ${dur}ms var(--ease-arrive) both; } .np-y.np-out { animation: np-out-y ${dur}ms var(--ease-arrive) both; }
        .np-t .np-x, .np-t .np-y { transition: translate ${dur}ms var(--ease-arrive); } .np-t .np-open { translate: 0 0; }`}</style>
      <article ref={card} className={'relative h-[33.5rem] overflow-hidden rounded-sheet bg-surface shadow-window ' + (keyframes ? '' : 'np-t')}>
        <header className="flex h-[60px] items-center gap-3 border-b-hairline border-line pr-4 pl-5">
          <span className="flex flex-col">
            <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Highlands, May</span>
            <span className="text-[13px] text-ink-muted tabular-nums">86 photos · 14–16 May</span>
          </span>
          <span className="ml-1 flex">{[walt, tomi].map((f, i) => <img key={i} src={f} alt="" className={'size-6 rounded-full object-cover ring-2 ring-surface ' + (i ? '-ml-1.5' : '')} />)}</span>
          <span role="group" aria-label="Layout" className="ml-auto flex gap-0.5 rounded-control bg-sunken p-0.5 ring-1 ring-line ring-inset">
            <button type="button" aria-pressed="true" className={seg + ' bg-surface text-ink shadow-raised'}>Grid</button>
            <button type="button" aria-pressed="false" className={seg + ' text-ink-muted hover:text-ink'}>Map</button>
          </span>
          <button type="button" aria-expanded={open.current.comments} onClick={() => toggle('comments')} className={headBtn(open.current.comments)}>
            <MessageIcon size={14} texture="solid" /><span className="tabular-nums">3</span>
          </button>
          <button type="button" aria-expanded={open.current.info} onClick={() => toggle('info')} className={headBtn(open.current.info)}>
            <span aria-hidden="true" className="flex h-3.5 w-3.5 rounded-[3px] ring-[1.5px] ring-current ring-inset"><span className="ml-auto h-full w-[1.5px] -translate-x-[3px] bg-current" /></span>Info
          </button>
        </header>
        <section aria-label="Photos" className="px-5 pt-1 pb-5">
          {DAYS.map((d) => (
            <div key={d.day}>
              <span className="flex items-baseline gap-2 pt-3.5 pb-2 text-[13px]">
                <span className="font-medium">{d.day}</span><span className="text-ink-muted">{d.place}</span>
                <span className="ml-auto text-xs text-ink-subtle tabular-nums">{d.count} photos</span>
              </span>
              <span className="flex flex-col gap-1">
                {d.rows.map((row, i) => (
                  <span key={i} className={'flex gap-1 ' + d.h}>
                    {row.map(([id, src, grow, fav]) => {
                      const on = picked.includes(id);
                      return (
                        <button key={id} type="button" aria-pressed={on} aria-label={`Photo ${id}`} onClick={() => pick(id)} style={{ flexGrow: grow, flexBasis: 0 }}
                          className={'relative min-w-0 overflow-hidden rounded-chip active:brightness-90 ' + (on ? 'shadow-[0_0_0_2px_var(--color-surface),0_0_0_4px_var(--color-accent)]' : '')}>
                          <img src={src} alt="" className="size-full object-cover" />
                          {fav ? <span className="absolute bottom-1.5 left-1.5 grid size-5 place-items-center rounded-full bg-black/35 text-white"><HeartIcon size={12} texture="solid" /></span> : null}
                          {on ? <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-accent text-accent-ink ring-[1.5px] ring-white"><CheckIcon size={12} texture="solid" /></span> : null}
                        </button>
                      );
                    })}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </section>

        <aside ref={(el) => { refs.current.info = el; }} aria-label="Info" hidden onAnimationEnd={ended('info')} onTransitionEnd={ended('info')}
          className="np-x absolute top-[60px] right-0 bottom-0 flex w-[264px] flex-col gap-3.5 bg-surface p-4 shadow-[inset_0.5px_0_0_var(--color-line)]">
          <img src={storr} alt="" className="block h-[148px] w-full rounded-control object-cover outline-1 -outline-offset-1 outline-black/10" />
          <span className="flex items-baseline justify-between text-[13px]"><span className="font-medium">DSC_0418.ARW</span><span className="text-xs text-ink-subtle tabular-nums">61 MP · 24.6 MB</span></span>
          {/* the histogram: the photo's tones, shadows to highlights, each channel in its own colour */}
          <span className="block h-14 overflow-hidden rounded-control bg-sunken">
            <svg viewBox="0 0 232 56" preserveAspectRatio="none" className="block size-full" aria-label="Histogram">
              <path d="M0 56 L0 50 C14 46 22 30 34 28 C46 26 52 40 64 36 C80 30 88 12 104 10 C120 8 128 26 142 30 C158 34 168 22 182 24 C198 26 210 44 222 50 L232 54 L232 56Z" style={{ fill: 'rgb(31 157 107 / 0.3)' }} />
              <path d="M0 56 L0 52 C16 50 24 40 38 38 C52 36 60 44 74 40 C92 34 100 22 116 20 C130 18 140 32 152 34 C168 36 176 30 190 32 C204 34 214 46 232 52 L232 56Z" style={{ fill: 'rgb(47 111 228 / 0.28)' }} />
              <path d="M0 56 L0 54 C18 52 28 46 44 44 C58 42 70 48 86 44 C102 40 110 30 126 30 C142 30 150 40 164 42 C180 44 190 38 204 40 C216 42 224 50 232 54 L232 56Z" style={{ fill: 'rgb(208 70 59 / 0.26)' }} />
            </svg>
          </span>
          <span className="grid grid-cols-4 divide-x-hairline rounded-control ring-1 ring-line ring-inset">
            {[['ƒ/8', 'aperture'], ['1/250', 'shutter'], ['100', 'ISO'], ['24mm', 'lens']].map(([v, l]) => (
              <span key={l} className="flex flex-col items-center pt-[7px] pb-1.5 text-[13px] font-medium tabular-nums">{v}<span className="text-[11px] font-normal text-ink-subtle">{l}</span></span>
            ))}
          </span>
          <dl className="grid grid-cols-[4rem_1fr] gap-y-1.5 text-[12.5px]">
            <dt className="text-ink-subtle">Taken</dt><dd className="tabular-nums">Tue 14 May, 07:42</dd>
            <dt className="text-ink-subtle">Camera</dt><dd>Sony A7R IV</dd>
            <dt className="text-ink-subtle">By</dt><dd className="flex items-center gap-1.5"><img src={walt} alt="" className="size-[18px] rounded-full object-cover" />Walt Okoro</dd>
          </dl>
        </aside>

        <aside ref={(el) => { refs.current.comments = el; }} aria-label="Comments" hidden onAnimationEnd={ended('comments')} onTransitionEnd={ended('comments')}
          className="np-x absolute top-[60px] right-0 bottom-0 flex w-[264px] flex-col bg-surface p-4 shadow-[inset_0.5px_0_0_var(--color-line)]">
          <span className="text-[13px] font-medium">On the Storr at dawn</span>
          <ul className="mt-3 flex flex-col gap-3.5">
            {COMMENTS.map(([face, who, at, said]) => (
              <li key={at} className="grid grid-cols-[1.5rem_1fr] gap-2.5 text-[13px]">
                <img src={face} alt="" className="size-6 rounded-full object-cover" />
                <span className="flex flex-col gap-0.5"><span className="flex items-baseline gap-1.5"><span className="font-medium">{who}</span><span className="text-xs text-ink-subtle tabular-nums">{at}</span></span><span className="text-pretty text-ink-muted">{said}</span></span>
              </li>
            ))}
          </ul>
          <span className="mt-auto flex h-9 items-center gap-2 rounded-control pr-1 pl-3 text-[13px] text-ink-subtle ring-1 ring-line ring-inset">
            Reply to the thread
            <button type="button" aria-label="Send" className="ml-auto grid size-7 place-items-center rounded-[4px] text-accent-deep hover:bg-accent-soft active:bg-accent/15"><SendIcon size={14} texture="solid" /></button>
          </span>
        </aside>

        <div ref={(el) => { refs.current.bar = el; }} role="toolbar" aria-label="Selection" onAnimationEnd={ended('bar')} onTransitionEnd={ended('bar')}
          className="np-y np-rest absolute bottom-4 left-1/2 -ml-[9.5rem] flex h-12 w-[19rem] items-center gap-2 rounded-card bg-ink pr-1.5 pl-4 text-[13px] text-surface shadow-popover">
          <span className="tabular-nums">{picked.length || 1} selected</span>
          <button type="button" className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-control pr-2.5 pl-2 font-medium hover:bg-white/10 active:bg-white/15"><DownloadIcon size={14} texture="solid" />Download</button>
          <button type="button" aria-label="Clear the selection" onClick={() => { setPicked([]); toggle('bar', false); }} className="grid size-9 place-items-center rounded-control hover:bg-white/10 active:bg-white/15"><CloseIcon size={14} texture="solid" /></button>
        </div>
      </article>
      <div className="absolute right-0 bottom-0 flex items-center gap-2 text-xs text-ink-muted">
        Speed
        <span role="group" aria-label="Speed" className="flex gap-0.5 rounded-control bg-sunken p-0.5 ring-1 ring-line">
          {[[true, '¼×'], [false, '1×']].map(([v, l]) => <button key={l} type="button" aria-pressed={slow === v} onClick={() => setSlow(v)} className={'h-6 rounded-[5px] px-2 active:bg-line ' + (slow === v ? 'bg-surface text-ink shadow-raised' : 'hover:text-ink')}>{l}</button>)}
        </span>
      </div>
      <MarksLayer>
        {snaps.map((j, i) => {
          const a = edge(j.from.v), b = edge(j.to.v);
          return axis === 'x' ? (
            <span key={i}><Hatch x={Math.min(a, b)} y={top + 6} w={Math.abs(a - b)} h={H - top - 12} /><Edge vertical at={a} from={top} to={H} off dashed /></span>
          ) : (
            <span key={i}><Hatch x={W / 2 - 160} y={Math.min(a, b)} w={320} h={Math.abs(a - b)} /><Edge at={a - BAR_GAP} from={W / 2 - 170} to={W / 2 + 170} off dashed /></span>
          );
        })}
        {turns.map((q, i) => (axis === 'x' ? <Edge key={'t' + i} vertical at={edge(q.v)} from={top} to={H} off={false} /> : <Edge key={'t' + i} at={edge(q.v) - BAR_GAP} from={W / 2 - 170} to={W / 2 + 170} off={false} />))}
        {snap ? <Tag x={axis === 'x' ? Math.min(edge(snap.from.v), edge(snap.to.v)) - 8 : W / 2 - 176} y={axis === 'x' ? top + 30 : edge(snap.from.v) - BAR_GAP} off>jumped {pct(snap.from.v)} → {pct(snap.to.v)}</Tag>
          : turn ? <Tag x={axis === 'x' ? edge(turn.v) - 8 : W / 2 - 176} y={axis === 'x' ? top + 30 : edge(turn.v) - BAR_GAP} off={false}>turned back at {pct(turn.v)} ✓</Tag> : null}
        {/* openness over time, as plumber samples it: a snap is a cliff */}
        <svg width={TW} height={TH + 26} style={{ position: 'absolute', left: 0, top: H + 14, overflow: 'visible' }}>
          <line x1="0" y1={ty(1)} x2={TW} y2={ty(1)} style={{ stroke: 'var(--pl-ink-3)', strokeDasharray: '2 3' }} />
          <text x="0" y={ty(1) - 4} style={{ font: '600 10.5px var(--pl-sans)', fill: 'var(--pl-ink-2)' }}>{run ? `${said}, open` : 'open'}</text>
          <text x={TW} y={ty(1) - 4} textAnchor="end" style={{ font: '600 10.5px var(--pl-sans)', fill: 'var(--pl-ink-2)' }}>{slow ? '¼ speed' : 'live'}</text>
          <line x1="0" y1={ty(0)} x2={TW} y2={ty(0)} style={{ stroke: 'var(--pl-ink-3)' }} />
          {run ? <polyline points={run.samples.map((q) => `${tx(q.t).toFixed(1)},${ty(q.v).toFixed(1)}`).join(' ')} style={{ fill: 'none', stroke: 'var(--pl-sky)', strokeWidth: 1.5, strokeLinejoin: 'round' }} /> : null}
          {snaps.map((j, i) => <line key={i} x1={tx(j.from.t)} y1={ty(j.from.v)} x2={tx(j.to.t)} y2={ty(j.to.v)} style={{ stroke: 'var(--pl-off)', strokeWidth: 2.5 }} />)}
          {run?.presses.map((q, i) => <circle key={i} cx={tx(q.t)} cy={ty(q.v)} r={i && turns.includes(q) ? 4 : 3} style={{ fill: i && turns.includes(q) ? 'var(--pl-on)' : '#fff', stroke: i && turns.includes(q) ? '#fff' : 'var(--pl-sky)', strokeWidth: 1.5 }} />)}
        </svg>
      </MarksLayer>
    </div>
  );
}
NegativeAlbum.names = ['Keyframes', 'Transition'];
NegativeAlbum.lesson = {
  why: 'An entrance and an exit written as two keyframe animations don’t know about each other. Change your mind halfway in and the exit starts from its own first frame, fully open: the panel snaps to the edge, then leaves. Here that’s everything that slides: Info, Comments, and the selection bar.',
  habit: 'Drive open and closed with one transition on the state (or a spring), so a close midway turns around from where it is.',
};
