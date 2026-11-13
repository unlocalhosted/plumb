// A principle as a marketing film for React Plumber: one 16:9 stage (1600 × 900, scaled to the window), nothing of the
// showcase around it. Signed as a piece of craft: the principle's number and name, top left, in the toy face; React
// Plumber's mark, bottom right, quiet, on every frame (the plumb bob on its line, the site's own mark: web/site/Bar.jsx).
//
// THE FRAME (ms)
//      0   OPENING   the desk, empty
//    250             the principle's number, then its name, large in the middle of the stage (rise on the spring)
//   1800             the name travels up to its corner and becomes the signature; the card rises in beneath it
//   2600             the film plays (Film.jsx: feel it, measure it, why it holds, payoff)
//    end   CLOSING   the card and the signature step back; the mark travels from its corner to the middle and grows;
//                    the plumb bob swings and settles on its line (true, as the name says); under it, the site's line
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

const Bob = ({ swing }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" style={{ overflow: 'visible' }}>
    <g style={{ transformOrigin: '12px 1.5px', animation: swing ? 'film-swing 1600ms cubic-bezier(0.3, 0, 0.2, 1) both' : 'none' }}>
      <path d="M12 1.5v6" fill="none" stroke="var(--pl-ink)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6.2 8.8h11.6L12 22z" fill="var(--pl-pink)" stroke="var(--pl-pink)" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="12" cy="12.4" r="1.7" fill="#fff" />
    </g>
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
      <style>{'plumb-overlay { display: none !important; } @keyframes film-swing { 0% { rotate: -22deg } 30% { rotate: 13deg } 55% { rotate: -6deg } 78% { rotate: 2.5deg } 100% { rotate: 0deg } }'}</style>
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
          <Bob swing={marked} />
          <span style={{ font: 'var(--pl-round-w, 750) 21px/1 var(--pl-round)', letterSpacing: '-0.005em' }}>React Plumber</span>
        </div>
        <p style={{ position: 'absolute', left: 0, right: 0, top: STAGE.h / 2 + 34, margin: 0, textAlign: 'center', font: '400 22px/30px var(--pl-sans)', color: 'var(--pl-ink-2)',
          opacity: phase === 'line' ? 1 : 0, transform: `translateY(${phase === 'line' ? 0 : 8}px)`, transition: 'opacity 600ms ease, transform 700ms var(--pl-spring)' }}>{LINE}</p>
      </div>
    </div>
  );
}
