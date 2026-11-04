/* ─────────────────────────────────────────────────────────
 * IT READS YOUR THEME, told as a scene. The words stay pinned on the left; the scene on the right moves with them as
 * you scroll. Every dot is one place in a real app's code; nothing is boxed. Motion follows the animations.dev
 * rules: transform and opacity only, custom ease-out curves, hover only where there is hover, reduced motion shows
 * the end.
 *
 * BEATS (one per stretch of scroll)
 *   0  a real app's spaces float at their true sizes, coral; a few carry their value as a pill
 *   1  the theme's steps draw up from the floor, left to right, each with its name and reason
 *   2  a thread draws from each place to the step its job belongs to
 *   3  the places fall into columns on their steps (steep curve, small landing bounce, left to right) and turn mint;
 *      each column counts its places up as they land
 *   4  the count: 23 → 5
 *
 * MICRO-INTERACTIONS (each with a job)
 *   point at a dot      a card pops from it: the place, its value, and (once settled) the step it's on
 *   point at a column   the step appears at its real size, with its reason
 *   the rail            five points beside the words: where you are; click one to go there
 * ───────────────────────────────────────────────────────── */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './settle.css';

const STEPS = [
  { name: 'tight', px: 4, why: 'inside a group' },
  { name: 'related', px: 8, why: 'related parts' },
  { name: 'control', px: 12, why: 'a control’s padding' },
  { name: 'card', px: 16, why: 'card padding' },
  { name: 'stack', px: 24, why: 'between groups' },
];
// A real app's spaces as written, with how many places use each (an app three months in, written by many hands).
const WRITTEN = [[3, 3], [4, 5], [5, 2], [6, 4], [7, 2], [8, 6], [9, 2], [10, 4], [11, 2], [12, 6], [13, 3], [14, 3],
  [15, 2], [16, 5], [17, 1], [18, 3], [19, 1], [20, 3], [21, 1], [22, 2], [24, 2], [26, 1], [28, 1]];
// Where those spaces live, so each dot is a place you can name.
const WHERE = ['Toolbar gap', 'Card padding', 'Invite button', 'Avatar row', 'Modal padding', 'List row', 'Tab padding',
  'Toast padding', 'Search field', 'Badge padding', 'Sidebar gap', 'Menu item', 'Table cell', 'Dialog footer', 'Chip gap', 'Header gap'];
const MAX = 30; // px at the right edge of the scene
const FLOOR = 0.74; // how far down the scene the floor is
const DOT = 9; // px between dots in a settled column

const nearest = px => STEPS.reduce((b, s) => (Math.abs(s.px - px) <= Math.abs(b.px - px) ? s : b));
const rand = i => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }; // the same scatter every time
const PLACES = WRITTEN.flatMap(([px, n]) => Array.from({ length: n }, (_, k) => ({ px, k })))
  .map((p, i) => ({ ...p, i, where: WHERE[(i * 7) % WHERE.length], step: nearest(p.px) }));
{ const row = {}; for (const p of PLACES) p.row = (row[p.step.name] = (row[p.step.name] ?? 0) + 1) - 1; }
const TOTALS = Object.fromEntries(STEPS.map(s => [s.name, PLACES.filter(p => p.step === s).length]));
const PILLED = new Set([2, 9, 17, 26, 31, 40, 47, 55]); // a few places show their value at rest

const BEATS = [
  { glyph: 'scatter', text: <>A real app, three months in. Its spaces were picked one at a time: <b>{WRITTEN.length} different values</b> across <b>{PLACES.length} places</b>.</> },
  { glyph: 'steps', text: <>Your theme already decided <b>five steps</b>, and wrote down why each one exists.</> },
  { glyph: 'threads', text: <>Plumber reads what each space does, and finds the step your own reason gives it.</> },
  { glyph: 'columns', text: <>Then it puts each one there. Every place, on one of your steps.</> },
  { glyph: 'count', text: <><b>{WRITTEN.length} values became 5.</b> Nothing new was invented: every space is one you had already decided.</> },
];

export function Settle() {
  const scroller = useRef(null), scene = useRef(null);
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [beat, setBeat] = useState(reduced ? BEATS.length - 1 : 0);
  // null until the scene has measured itself: the marks are drawn only then, so none is first placed for a guessed
  // width and then sent flying (or left hanging past a phone's edge) when the real one arrives
  const [size, setSize] = useState(null);
  const [dot, setDot] = useState(null);      // the place being pointed at
  const [column, setColumn] = useState(null); // the step being pointed at

  useEffect(() => {
    if (reduced) return;
    const on = () => {
      const r = scroller.current.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      setBeat(Math.min(BEATS.length - 1, Math.floor(t * BEATS.length)));
    };
    on();
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, [reduced]);

  useLayoutEffect(() => {
    const measure = () => setSize({ w: scene.current.clientWidth, h: scene.current.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scene.current);
    return () => ro.disconnect();
  }, []);

  // the rail: go to a beat by scrolling to its stretch
  const go = k => {
    const r = scroller.current.getBoundingClientRect();
    const run = r.height - innerHeight;
    scrollTo({ top: scrollY + r.top + run * (k + 0.5) / BEATS.length, behavior: reduced ? 'auto' : 'smooth' });
  };

  const { w, h } = size ?? { w: 0, h: 0 };
  const X = px => (px / MAX) * w;
  const floor = h * FLOOR;
  const free = p => ({ x: X(p.px) + (rand(p.i) - 0.5) * 10, y: h * (0.06 + rand(p.i + 99) * 0.46) });
  const settled = p => ({ x: X(p.step.px), y: floor - 6 - p.row * DOT });
  const landed = beat >= 3;

  return (
    <section ref={scroller} className="settle" style={{ '--beats': BEATS.length }} aria-labelledby="settle-title">
      <div className="settle-pin">
        <div className="settle-words">
          <h2 id="settle-title" className="m-0 text-title font-strong">It reads your theme.</h2>
          {/* the narration: each line carries its own point on the rail, and a small drawing of what happens in it */}
          <ol className="settle-beats" aria-label="The story, a part at a time">
            {BEATS.map((b, i) => {
              const state = i < beat ? 'past' : i === beat ? 'now' : 'next';
              return (
                <li key={i} data-state={state} aria-current={i === beat}>
                  <button type="button" className="settle-node" data-state={state} aria-label={`Go to part ${i + 1} of ${BEATS.length}`} onClick={() => go(i)} />
                  <span className="settle-beat"><Glyph kind={b.glyph} /><span>{b.text}</span></span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="settle-field pl-light">
        <div className="field-glow" aria-hidden="true"><i /></div>
        <div ref={scene} className="settle-scene" data-beat={beat} style={{ '--floor': `${floor}px` }}>
          <div className="settle-floor" aria-hidden="true" />

          {size && <>
          {STEPS.map((s, k) => (
            <div key={s.name} className="settle-step" style={{ transform: `translateX(${X(s.px)}px)`, '--k': k }}
              onPointerEnter={() => setColumn(s.name)} onPointerLeave={() => setColumn(null)}>
              <i className="settle-line" aria-hidden="true" />
              <span className="settle-label">
                <b>{s.name}</b> <span className="tabular">{s.px}px</span>
                <small>{s.why}</small>
                <em className="tabular" data-shown={landed}><Count to={TOTALS[s.name]} on={landed} delay={k * 120} /> places</em>
              </span>
              {column === s.name && (
                <span className="settle-specimen" aria-hidden="true"><i /><span style={{ width: s.px * 2 }} /><i /><small>{s.px}px, {s.why}</small></span>
              )}
            </div>
          ))}

          <svg className="settle-threads" data-shown={beat === 2} width={w} height={h} aria-hidden="true">
            {PLACES.map(p => {
              const a = free(p);
              return <line key={p.i} x1={a.x} y1={a.y} x2={X(p.step.px)} y2={floor} pathLength="1" style={{ transitionDelay: `${beat === 2 ? p.px * 14 : 0}ms` }} />;
            })}
          </svg>

          {PLACES.map(p => {
            const at = landed ? settled(p) : free(p);
            const pointed = dot === p.i;
            return (
              <span key={p.i} className="settle-dot" data-on={landed} data-pointed={pointed}
                style={{ transform: `translate(${at.x}px, ${at.y}px)`, transitionDelay: `${landed ? p.px * 22 + p.k * 14 : (p.i % 9) * 8}ms`, '--d': p.i * 70 }}
                onPointerEnter={() => setDot(p.i)} onPointerLeave={() => setDot(null)}>
                <i aria-hidden="true" />
                {!landed && beat < 2 && PILLED.has(p.i) && <em className="settle-pill tabular">{p.px}px</em>}
                {pointed && (
                  <span className="settle-card" role="tooltip">
                    <b>{p.where}</b>
                    <span className="tabular">{landed ? <>{p.px}px → <strong>{p.step.name}</strong>, {p.step.px}px</> : <>{p.px}px, written by hand</>}</span>
                  </span>
                )}
              </span>
            );
          })}

          </>}

          <p className="settle-count tabular" data-shown={beat >= 4} aria-hidden={beat < 4}>
            <b>{WRITTEN.length}</b><span>→</span><b>5</b>
          </p>
        </div>
        </div>
      </div>
    </section>
  );
}

/* A number that counts up once its column has landed (it starts after the column's dots have fallen). */
function Count({ to, on, delay }) {
  const [n, setN] = useState(on ? to : 0);
  useEffect(() => {
    if (!on) { setN(0); return; }
    let raf, start;
    const t = setTimeout(() => {
      const step = now => { start ??= now; const k = Math.min(1, (now - start) / 600); setN(Math.round(to * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }, 300 + delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [on, to, delay]);
  return n;
}

/* Each beat's small drawing: what happens in it, at a glance. */
function Glyph({ kind }) {
  const d = {
    scatter: <><circle cx="4" cy="6" r="1.6" /><circle cx="11" cy="3.5" r="1.6" /><circle cx="16" cy="9" r="1.6" /><circle cx="7" cy="13" r="1.6" /><circle cx="14" cy="15" r="1.6" /></>,
    steps: <><path d="M3 17V7M8 17V4M13 17V9M18 17V6" /><path d="M1.5 17h18" /></>,
    threads: <><circle cx="4" cy="4" r="1.6" /><circle cx="16" cy="5" r="1.6" /><path d="M4 4l5 13M16 5l-7 12" /><path d="M1.5 17h18" /></>,
    columns: <><circle cx="5" cy="15" r="1.6" /><circle cx="5" cy="11" r="1.6" /><circle cx="10" cy="15" r="1.6" /><circle cx="10" cy="11" r="1.6" /><circle cx="10" cy="7" r="1.6" /><circle cx="15" cy="15" r="1.6" /><path d="M1.5 17.5h18" /></>,
    count: <><path d="M3 6h5M3 10h5M3 14h5" /><path d="M11 10h4M13.5 7.5 16 10l-2.5 2.5" /></>,
  }[kind];
  return <svg className={`settle-glyph settle-glyph-${kind}`} viewBox="0 0 21 20" aria-hidden="true">{d}</svg>;
}
