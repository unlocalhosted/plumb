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
 * THE CLIP (#60, tooltip warm-up), about 12 s, loops
 *    0.0s   wide: the whole editor, the switch on "At once"
 *    0.5s   the pointer sweeps the toolbar: every tooltip flashes
 *    2.7s   camera in on the toolbar's left half
 *    3.6s   the slow sweep again, up close: pink ghosts where each one flashed
 *    5.9s   camera out; the pointer presses "Warm-up"
 *    7.0s   camera in; the pointer stops on Bold: the warm-up fills, then its tooltip
 *    8.4s   on to Italic and Underline: at once, warm (mint)
 *   10.0s   camera out; back to "At once", the first frame again
 * ───────────────────────────────────────────────────────── */
const REST = 1.45;           // the editor's scale at rest (600 × 682 → 870 × 989 of 1080 × 1350)
const ROOM = 1150;           // the camera's room: everything above the switch; the editor fades out at its foot
const EASE = 'cubic-bezier(.65, 0, .35, 1)';
const CAM_MS = 900;

const CLIPS = {
  60: async ({ at, go, sweep, wait, camera, press }) => {
    const style = 0, bold = 1, italic = 2, under = 3, numbered = 7, ai = 11; // by place: each switch remounts the editor
    beat('1 · wide: the editor at rest');
    go({ x: 980, y: 700 }); await wait(500);
    beat('2 · the sweep: every tooltip flashes');
    await sweep(at(style, -0.4), at(ai, 0.5), 1900);
    await sweep(at(ai, 0.5), { x: 1000, y: 620 }, 300);
    beat('3 · camera in on the toolbar');
    await camera({ from: style, to: numbered }); await wait(150);
    beat('4 · up close: a ghost where each one flashed');
    await sweep(at(style, -0.6), at(numbered, 0.5), 1500);
    await wait(1100);
    beat('5 · camera out, the switch');
    await sweep(at(numbered, 0.5), { x: at(numbered).x, y: 420 }, 260);
    await camera(null);
    await press(1);
    beat('6 · camera in: the first one waits');
    await camera({ from: style, to: numbered }); await wait(100);
    await sweep(at(style, -0.6), at(bold, 0.55), 520);
    await wait(1250);
    beat('7 · the next ones come at once');
    await sweep(at(bold, 0.55), at(italic, 0.5), 260); await wait(650);
    await sweep(at(italic, 0.5), at(under, 0.5), 260); await wait(900);
    beat('8 · camera out, back to the start');
    await sweep(at(under, 0.5), { x: at(under).x + 40, y: 420 }, 300);
    await camera(null);
    await press(0);
    await sweep(null, { x: 980, y: 700 }, 700);
    await wait(250);
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
  useLayoutEffect(() => {
    const el = card.current?.firstElementChild; if (!el) return;
    const h = el.offsetHeight * REST, w = 600 * REST;
    setRest({ x: (W - w) / 2, y: Math.max(48, (ROOM - h) / 2) });
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
    // camera in on a run of tools (their row and the tooltips under it fill the frame's width), or back to rest
    const camera = async (span) => {
      if (!span) { setCam(null); await wait(CAM_MS); return; }
      const all = tools(), from = all[span.from] ?? span.from, to = all[span.to] ?? span.to;
      const x0 = from.offsetLeft - 14, x1 = to.offsetLeft + to.offsetWidth + 14, k = (W - 80) / (x1 - x0);
      setCam({ k, x: 40 - x0 * k, y: 470 - 40 * k });
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
      await clip({ at: (el, u) => at(t(el), u), go, sweep, wait, camera, press, tools });
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
