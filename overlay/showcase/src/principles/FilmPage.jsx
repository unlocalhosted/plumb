// A principle as a marketing film for React Plumber: one 16:9 stage (1600 × 900, scaled to the window), nothing of the
// showcase around it. Signed as a piece of craft: the principle's number and name, top left, in the toy face; React
// Plumber's mark, bottom right, quiet, on every frame (the turning-sides P, chosen 2026-11-13).
//
// THE FRAME (ms)
//      0   OPENING   the desk, empty
//    250             the principle's number, then its name, large in the middle of the stage (rise on the spring)
//   1800             the name travels up to its corner and becomes the signature; the card rises in beneath it
//   2600             the film plays (Film.jsx: feel it, measure it, why it holds, payoff)
//    end   CLOSING   the card and the signature step back; the mark travels from its corner to the middle and grows;
//                    the mark's guardrails draw themselves on (the gap's guides, the 4 it measures); under it, the site's line
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PRINCIPLES } from './catalogue.js';
import { Film } from './Film.jsx';
import { ensureLook } from './look.js';

ensureLook();
const SCREENS = Object.fromEntries(Object.entries(import.meta.glob('./screens/[0-9]*.jsx', { eager: true })).map(([, m]) => [m.n, m]));
const STAGE = { w: 1600, h: 900, edge: 56 };
const TIMING = {
  name:     250,   // the number and the name rise in, in the middle
  travel:  1800,   // the name goes to its corner
  clear:    650,   // ...and the card rises in once the name has left the middle (nothing crosses it)
  film:    3100,   // the film begins
  back:     300,   // closing: after the film, the card and signature step back
  mark:     700,   // the mark travels to the middle
  line:    1500,   // the site's line under it
};
const MOVE = 'cubic-bezier(0.7, 0, 0.3, 1)';      // the camera's curve: slow start, slow finish
const LINE = 'A design review on every screen.';   // the site's hero line (homepage/src/hero)

// React Plumber's mark (owner's pick, 2026-11-13; docs/design/comps/logo-guides.html, "the turning sides, one gradient"):
// four sides of padding turning round the content make a P, cut from one pink-to-violet gradient, the content in butter,
// lit from the top; every gap exactly 4 on a 120 grid. With `guards`, plumber's own guardrails draw themselves on: the
// guides the stem, cap and foot sit on, and the 4 it keeps between the sides.
const GUARD = '#2f86dc';
// a box with its own corner radii, scaled down together when they don't fit (as CSS scales border-radius)
const box = (x, y, w, h, r) => {
  const f = Math.min(1, w / (r[0] + r[1] || 1), w / (r[3] + r[2] || 1), h / (r[0] + r[3] || 1), h / (r[1] + r[2] || 1)), [a, b, c, d] = r.map((v) => v * f);
  return `M${x + a} ${y}H${x + w - b}${b ? `A${b} ${b} 0 0 1 ${x + w} ${y + b}` : ''}V${y + h - c}${c ? `A${c} ${c} 0 0 1 ${x + w - c} ${y + h}` : ''}H${x + d}${d ? `A${d} ${d} 0 0 1 ${x} ${y + h - d}` : ''}V${y + a}${a ? `A${a} ${a} 0 0 1 ${x + a} ${y}` : ''}Z`;
};
const SIDES = [box(24, 18, 48, 20, [24, 5, 5, 5]), box(76, 18, 20, 38, [5, 24, 5, 5]), box(48, 60, 48, 20, [5, 5, 24, 5]), box(24, 42, 20, 60, [5, 5, 10, 10])];
const CONTENT = box(48, 42, 24, 14, [5, 5, 5, 5]);
const Mark = ({ size, guards = false }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" style={{ overflow: 'visible' }}>
    <defs>
      <linearGradient id="mk-sweep" gradientUnits="userSpaceOnUse" x1="24" y1="18" x2="96" y2="102"><stop offset="0" stopColor="#ff7ac0" /><stop offset=".5" stopColor="#e84aa8" /><stop offset="1" stopColor="#6a4ae6" /></linearGradient>
      <linearGradient id="mk-butter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd24d" /><stop offset=".55" stopColor="#ffbf1a" /><stop offset="1" stopColor="#eaa800" /></linearGradient>
      <linearGradient id="mk-lit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".42" /><stop offset=".25" stopColor="#fff" stopOpacity="0" /></linearGradient>
    </defs>
    {guards ? (
      <g stroke={GUARD} strokeWidth=".8" strokeDasharray="2.4 2" strokeLinecap="round" fill="none" style={{ animation: 'mk-guide 700ms ease 900ms both' }}>
        <path d="M24 4V116" /><path d="M4 18H116" /><path d="M4 102H40" />
      </g>
    ) : null}
    {SIDES.map((d) => <g key={d}><path d={d} fill="url(#mk-sweep)" /><path d={d} fill="url(#mk-lit)" style={{ mixBlendMode: 'soft-light' }} /></g>)}
    <path d={CONTENT} fill="url(#mk-butter)" /><path d={CONTENT} fill="url(#mk-lit)" style={{ mixBlendMode: 'soft-light' }} />
    {guards ? (
      <g style={{ animation: 'mk-pill 420ms cubic-bezier(.3, 1.5, .5, 1) 1500ms both', transformOrigin: '74px 8px' }}>
        <path d="M72 12H76M72 9.4V14.6M76 9.4V14.6" stroke={GUARD} strokeWidth=".9" strokeLinecap="round" />
        <rect x="68" y="0.3" width="12" height="8.4" rx="3" fill={GUARD} />
        <text x="74" y="7" textAnchor="middle" fontFamily="ui-monospace, Menlo" fontSize="6.4" fontWeight="700" fill="#fff">4</text>
      </g>
    ) : null}
  </svg>
);

export function FilmPage({ n }) {
  const p = PRINCIPLES.find((x) => x.n === n), screen = SCREENS[n], Example = screen?.default;
  const [k, setK] = useState(1);
  const [phase, setPhase] = useState('empty');     // empty · name · film · playing · back · mark · line
  const sig = useRef(null), mark = useRef(null);
  const [to, setTo] = useState(null);              // where the name and the mark travel from / to: their centred transforms
  useEffect(() => {
    document.title = `${n} · ${p?.title ?? ''} · React Plumber`;
    document.body.style.background = 'var(--pl-desk, #fff)';
    const fit = () => setK(Math.min(innerWidth / STAGE.w, innerHeight / STAGE.h));
    fit(); addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, [n]);
  // the centre of the stage, as a move from each one's own corner (measured in the stage's own pixels, once the faces are in)
  useLayoutEffect(() => {
    let gone = false;
    // the two faces themselves, not just whatever was loading: a name measured in the fallback face lands off centre
    const faces = document.fonts ? Promise.all(['750 34px "Bricolage Grotesque"', '800 15px "Bricolage Grotesque"', '400 22px "Instrument Sans"'].map((f) => document.fonts.load(f))).then(() => document.fonts.ready) : Promise.resolve();
    faces.then(() => {
      if (gone || !sig.current || !mark.current) return;
      // centred by what is drawn, not by the box: a wrapped name's box is as wide as it may grow, wider than its lines
      const drawn = (el) => {
        // the text runs themselves (a range over the element would give its children's boxes, each as wide as the column)
        const r = document.createRange(), walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), ink = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
        for (let node = walk.nextNode(); node; node = walk.nextNode()) { r.selectNodeContents(node); for (const q of r.getClientRects()) { ink.left = Math.min(ink.left, q.left); ink.top = Math.min(ink.top, q.top); ink.right = Math.max(ink.right, q.right); ink.bottom = Math.max(ink.bottom, q.bottom); } }
        ink.width = ink.right - ink.left; ink.height = ink.bottom - ink.top;
        const box = el.getBoundingClientRect(), s = box.width / el.offsetWidth || 1;
        return { x: el.offsetLeft + (ink.left - box.left) / s, y: el.offsetTop + (ink.top - box.top) / s, w: ink.width / s, h: ink.height / s };
      };
      const at = (el, s, y) => { const d = drawn(el), ox = el.offsetLeft + el.offsetWidth / 2, oy = el.offsetTop + el.offsetHeight / 2;
        // the scale is about the box's centre, so the drawn centre moves with it: move that point to the stage's centre
        const cx = d.x + d.w / 2, cy = d.y + d.h / 2, sx = ox + (cx - ox) * s, sy = oy + (cy - oy) * s;
        return `translate(${STAGE.w / 2 - sx}px, ${y - sy}px) scale(${s})`; };
      setTo({ name: at(sig.current, 1.6, STAGE.h / 2), mark: at(mark.current, 2.4, STAGE.h / 2 - 30) });
    });
    return () => { gone = true; };
  }, []);
  useEffect(() => {
    if (!to) return;
    const t = [setTimeout(() => setPhase('name'), TIMING.name), setTimeout(() => setPhase('film'), TIMING.travel), setTimeout(() => setPhase('playing'), TIMING.film)];
    return () => t.forEach(clearTimeout);
  }, [to]);
  const done = () => {
    setTimeout(() => setPhase('back'), TIMING.back);
    setTimeout(() => setPhase('mark'), TIMING.back + TIMING.mark);
    setTimeout(() => setPhase('line'), TIMING.back + TIMING.line);
  };
  if (!Example?.film) return <p style={{ padding: 40 }}>No film for № {n} yet.</p>;
  const centred = phase === 'empty' || phase === 'name', shown = phase !== 'empty';
  const closing = phase === 'back' || phase === 'mark' || phase === 'line', marked = phase === 'mark' || phase === 'line';
  return (
    <div className="pl-light" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', overflow: 'hidden', background: 'var(--pl-desk)' }}>
      {/* plumber's own overlay (its toasts, its Alt pill) runs on this dev page; it is not part of the film */}
      <style>{'plumb-overlay { display: none !important; } @keyframes mk-guide { from { opacity: 0; stroke-dashoffset: 40 } to { opacity: 1; stroke-dashoffset: 0 } } @keyframes mk-pill { from { opacity: 0; transform: scale(.6) } to { opacity: 1; transform: scale(1) } }'}</style>
      <div style={{ position: 'relative', width: STAGE.w, height: STAGE.h, flex: 'none', transform: `scale(${k})`, background: 'var(--pl-desk)', color: 'var(--pl-ink)', visibility: to ? 'visible' : 'hidden' }}>
        {/* the signature: which piece of craft this is; it opens the film large in the middle, then takes its corner */}
        <div ref={sig} style={{ position: 'absolute', left: STAGE.edge, top: STAGE.edge - 8, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420,
          transform: centred && to ? to.name : 'none', opacity: shown && !closing ? 1 : 0,
          transition: `transform 1000ms ${MOVE}, opacity ${closing ? 500 : 600}ms ease` }}>
          <span style={{ font: 'var(--pl-round-w2, 800) 15px/1 var(--pl-round)', color: 'var(--pl-ink-2)', letterSpacing: '0.01em' }}>Craft № {n}</span>
          <span style={{ font: 'var(--pl-round-w, 750) 34px/38px var(--pl-round)', letterSpacing: '-0.015em', textWrap: 'balance' }}>{p.title}</span>
        </div>
        {/* the film itself, in the middle of the stage; it rises in as the name leaves, and steps back at the end */}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', paddingBottom: 40,
          opacity: (phase === 'film' || phase === 'playing') ? 1 : 0, transform: `translateY(${phase === 'film' || phase === 'playing' ? 0 : closing ? 0 : 18}px) scale(${closing ? 0.97 : 1})`,
          transition: `opacity 600ms ease ${phase === 'film' ? TIMING.clear : 0}ms, transform 800ms var(--pl-spring) ${phase === 'film' ? TIMING.clear : 0}ms` }}>
          <Film Example={Example} names={Example.names} chrome={false} start={phase === 'playing'} onDone={done} />
        </div>
        {/* the mark, on every frame; at the end it comes to the middle, and the bob settles on its line */}
        <div ref={mark} style={{ position: 'absolute', right: STAGE.edge, bottom: STAGE.edge - 12, display: 'flex', alignItems: 'center', gap: 9,
          opacity: shown ? 0.92 : 0, transform: marked && to ? to.mark : 'none', transition: `transform 1000ms ${MOVE}, opacity 600ms ease` }}>
          <Mark size={38} guards={marked} />
          <span style={{ font: '650 22px/1 var(--pl-sans)', letterSpacing: '-0.035em' }}>React Plumber</span>
        </div>
        <p style={{ position: 'absolute', left: 0, right: 0, top: STAGE.h / 2 + 34, margin: 0, textAlign: 'center', font: '400 22px/30px var(--pl-sans)', color: 'var(--pl-ink-2)',
          opacity: phase === 'line' ? 1 : 0, transform: `translateY(${phase === 'line' ? 0 : 8}px)`, transition: 'opacity 600ms ease, transform 700ms var(--pl-spring)' }}>{LINE}</p>
      </div>
    </div>
  );
}
