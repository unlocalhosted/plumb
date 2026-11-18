// A social clip (2026-11-18): one principle as a short loop for a feed, after the lesson films got no likes. Modelled on
// the clip the owner holds as the bar (maybepratikk's tabular figures): the component and its switch fill a 4:5 frame
// on a plain canvas, the fault moves from the first second, the camera goes in for plumber's marks and back out, and
// nothing else is on screen: no title, no words panel, no closing card. The lesson goes in the post's text. The logo
// sits small in a corner.
//
// The pointer is drawn here and moves on a script; where it is, the page gets the same pointerover/pointerout events a
// real mouse sends, so the component's own code (its timers, its marks) runs exactly as under a hand.
//
//   /clip/60   1080 × 1350 (scaled to fit a smaller window); film-render.mjs 60 out.mp4 --clip
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TechniqueSwitch, beat } from './Film.jsx';
import { Mark } from './FilmPage.jsx';
import { ensureLook } from './look.js';

const SCREENS = Object.fromEntries(Object.entries(import.meta.glob('./screens/[0-9]*.jsx', { eager: true })).map(([, m]) => [m.n, m]));
const W = 1080, H = 1350;

/* ─────────────────────────────────────────────────────────
 * THE CLIP (#60, hover cards on the line), about 15 s, loops
 *    0.0s   wide: the pointer rests at the start of a line, reading
 *    0.7s   it heads for the comment in the margin: each link it crosses opens its card over the words
 *    2.7s   camera in on the line; back, and across again: pink ghosts where each card flashed
 *    7.0s   camera out; the pointer presses "Warm-up"
 *    8.5s   camera in; across to the comment: nothing opens
 *   11.0s   back to "the scar", and it stops: the warm-up fills, then its card (mint)
 *   13.3s   camera out; back to "At once", the first frame again
 * owner, 2026-11-18: "on the top it is kind of intentional that user is going there", so the toolbar sweep didn't land
 * ───────────────────────────────────────────────────────── */
const REST = 1.45;           // the editor's scale at rest (600 × 682 → 870 × 989 of 1080 × 1350)
const ROOM = 1150;           // the camera's room: everything above the switch; the editor fades out at its foot
const EASE = 'cubic-bezier(.65, 0, .35, 1)';
const CAM_MS = 900;

const CLIPS = {
  // the reader crosses the line on the way to the comment in the margin: every link's card opens over the words
  60: async ({ p, go, sweep, wait, camera, press }) => {
    const READ = [70, 338], BUBBLE = [562, 318], SCAR = [255, 335], NEAR = { x0: 150, x1: 604, yc: 378 };
    beat('1 · wide: reading the line');
    go(p(...READ)); await wait(700);
    beat('2 · on the way to the comment: every card opens');
    await sweep(p(...READ), p(...BUBBLE), 2100); await wait(450);
    beat('3 · camera in on the line');
    await camera(NEAR);
    await sweep(null, p(170, 340), 700); await wait(250);
    beat('4 · up close: a ghost where each one flashed');
    await sweep(null, p(...BUBBLE), 1900); await wait(1200);
    beat('5 · camera out, the switch');
    await camera(null);
    await press(1);
    beat('6 · camera in: crossing opens nothing');
    await camera(NEAR);
    await sweep(null, p(170, 340), 650); await wait(200);
    await sweep(null, p(...BUBBLE), 1900); await wait(700);
    beat('7 · stop on a word: it opens after a beat');
    await sweep(null, p(...SCAR), 650); await wait(1700);
    beat('8 · camera out, back to the start');
    await camera(null);
    await press(0);
    await sweep(null, p(...READ), 750); await wait(300);
    beat('frame: line'); // the recorders stop here
  },
};

// the pointer: macOS's arrow, white with a dark rim
const Arrow = ({ down }) => (
  <svg width="30" height="42" viewBox="0 0 15 21" style={{ transform: `scale(${down ? 0.86 : 1})`, transformOrigin: '2px 2px', transition: 'transform 120ms ease', filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / .25))' }}>
    <path d="M1 1 L1 16.5 L4.8 12.9 L7.3 18.8 L9.9 17.7 L7.4 11.9 L12.6 11.9 Z" fill="#fff" stroke="#111" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);

export function ClipPage({ n }) {
  const mod = SCREENS[n], Example = mod?.default, clip = CLIPS[n];
  const stage = useRef(null), card = useRef(null), sw = useRef(null);
  const [fit, setFit] = useState(1);
  const [side, setSide] = useState('broken');
  const [round, setRound] = useState(0);
  const [cam, setCam] = useState(null);       // null: at rest; else the transform up close
  const [rest, setRest] = useState(null);     // the editor's place at rest
  const [ptr, setPtr] = useState({ x: 980, y: 700, down: false });
  const over = useRef(null), pos = useRef({ x: 980, y: 700 });

  useEffect(() => { ensureLook(); window.__filmSpec = {}; }, []);
  useLayoutEffect(() => {
    const put = () => setFit(Math.min(1, innerWidth / W, innerHeight / H));
    put(); addEventListener('resize', put); return () => removeEventListener('resize', put);
  }, []);
  // the editor at rest: centred above the switch
  // measured once the fonts are in, so the first frame and the last (the loop's seam) put it in the same place
  useEffect(() => {
    let gone = false;
    document.fonts.ready.then(() => requestAnimationFrame(() => {
      const el = card.current?.firstElementChild; if (!el || gone) return;
      const h = el.offsetHeight * REST, w = 600 * REST;
      setRest({ x: (W - w) / 2, y: Math.max(48, (ROOM - h) / 2) });
    }));
    return () => { gone = true; };
  }, [Example]);

  // wrong is plumber's pink in the films (owner, 2026-11-15): the marks' shadow roots set --pl-off on :host, so say it there
  useEffect(() => {
    for (const h of card.current?.querySelectorAll('*') ?? []) {
      if (h.shadowRoot && !h.shadowRoot.querySelector('style[data-clip]')) { const st = document.createElement('style'); st.dataset.clip = ''; st.textContent = ':host { --pl-off: var(--pl-pink) !important; --pl-off-bg: var(--pl-pink-soft) !important; }'; h.shadowRoot.append(st); }
    }
  }, [side, round, rest]);

  useEffect(() => {
    if (!rest || !clip) return;
    // the clip's clock is the page's Date: the render pauses it and moves it one frame at a time
    const T0 = Date.now(); performance.now = () => Date.now() - T0;
    let gone = false;
    const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const toStage = (r) => { const o = stage.current.getBoundingClientRect(); return { x: (r.left - o.left) / fit, y: (r.top - o.top) / fit, w: r.width / fit, h: r.height / fit }; };
    const tools = () => [...card.current.querySelectorAll('[data-tool]')];
    // a point in the editor's own pixels (600 wide), in stage pixels wherever the camera is
    const p = (x, y) => { const c = toStage(card.current.getBoundingClientRect()), k = c.w / 600; return { x: c.x + x * k, y: c.y + y * k }; };
    // a point on a control, in stage pixels: across it by u (0 its left edge, 1 its right), at its middle
    const at = (el, u = 0.5) => { const b = toStage(el.getBoundingClientRect()); return { x: b.x + b.w * u, y: b.y + b.h * 0.55 }; };
    // what a mouse at this point would be over: the events a real pointer sends when that changes
    const hit = (p) => {
      const o = stage.current.getBoundingClientRect();
      const el = document.elementFromPoint(o.left + p.x * fit, o.top + p.y * fit), was = over.current;
      if (el === was) return;
      if (was) { was.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: el, pointerType: 'mouse' })); was.closest('button')?.removeAttribute('data-clip-hover'); }
      if (el) { el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, relatedTarget: was, pointerType: 'mouse' })); el.closest('[data-tool]')?.setAttribute('data-clip-hover', ''); }
      over.current = el;
    };
    const go = (p) => { pos.current = p; setPtr((x) => ({ ...x, ...p })); hit(p); };
    // the pointer travels from a to b in ms, eased, one step a frame
    const sweep = async (a, b, ms) => {
      a ??= pos.current; const steps = Math.max(1, Math.round(ms / 16));
      for (let i = 1; i <= steps && !gone; i++) {
        const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        go({ x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e }); await wait(16);
      }
    };
    // camera in on a stretch of the editor (x0..x1 of its 600px fill the frame's width), or back to rest
    const camera = async (span) => {
      if (!span) { setCam(null); await wait(CAM_MS); return; }
      const { x0, x1, yc } = span, k = (W - 60) / (x1 - x0);   // x0..x1 fill the width; yc sits at the room's middle
      setCam({ k, x: 30 - x0 * k, y: ROOM * 0.45 - yc * k });
      await wait(CAM_MS);
    };
    // the pointer goes to a side of the switch and presses it
    const press = async (i) => {
      const b = sw.current.querySelectorAll('button')[i];
      await sweep(null, at(b, 0.5), 650);
      setPtr((x) => ({ ...x, down: true })); await wait(140);
      setSide(i ? 'fixed' : 'broken'); setRound((r) => r + 1);
      setPtr((x) => ({ ...x, down: false })); await wait(260);
    };
    (async () => {
      await document.fonts?.ready; await wait(300);
      const t = (el) => (typeof el === 'number' ? tools()[el] : el);
      await clip({ p, at: (el, u) => at(t(el), u), go, sweep, wait, camera, press, tools });
    })();
    return () => { gone = true; };
  }, [rest, clip]);

  if (!Example) return <p style={{ padding: 40 }}>No screen № {n}.</p>;
  const tf = cam ? `translate(${cam.x}px, ${cam.y}px) scale(${cam.k})` : rest ? `translate(${rest.x}px, ${rest.y}px) scale(${REST})` : `scale(${REST})`;
  return (
    <div className="pl-light" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#111', overflow: 'hidden', '--pl-off': 'var(--pl-pink)', '--pl-off-bg': 'var(--pl-pink-soft)' }}>
      <div style={{ position: 'relative', width: W * fit, height: H * fit, overflow: 'hidden' }}>
      <style>{'plumb-overlay { display: none !important; } [data-clip-hover] { background: var(--color-sunken); color: var(--color-ink); } body { margin: 0; }'}</style>
      <div ref={stage} style={{ width: W, height: H, position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `scale(${fit})`, overflow: 'hidden', cursor: 'none',
        background: '#f5f4f0', backgroundImage: 'radial-gradient(circle, rgb(28 27 25 / .11) 1.3px, transparent 1.6px)', backgroundSize: '26px 26px' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: ROOM, overflow: 'hidden', maskImage: 'linear-gradient(#000 92%, transparent)' }}>
        <div ref={card} data-example style={{ position: 'absolute', left: 0, top: 0, width: 600, transformOrigin: '0 0', transform: tf, transition: `transform ${CAM_MS}ms ${EASE}`, visibility: rest ? 'visible' : 'hidden' }}>
          <Example key={side + round} side={side} />
        </div>
        </div>
        <div ref={sw} style={{ position: 'absolute', left: '50%', bottom: 110 / 2.1, transform: 'translateX(-50%)', zoom: 2.1 }}>
          <TechniqueSwitch names={Example.names} fixed={side === 'fixed'} ready={false} onBack={() => {}} onFix={() => {}} />
        </div>
        <span style={{ position: 'absolute', right: 40, bottom: 36, display: 'flex', alignItems: 'center', gap: 10, font: '750 22px/1 "Bricolage Grotesque", var(--pl-round)', color: 'rgb(28 27 25 / .55)' }}>
          <Mark size={28} />React Plumber
        </span>
        <span style={{ position: 'absolute', left: ptr.x - 3, top: ptr.y - 3, pointerEvents: 'none', zIndex: 5 }}><Arrow down={ptr.down} /></span>
      </div>
      </div>
    </div>
  );
}
