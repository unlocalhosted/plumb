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
 * THE CLIP (#60, hover cards while selecting), about 17 s, loops
 *    0.0s   wide: the pointer rests by a line, about to select a phrase
 *    1.0s   it drags across "the scar before the tide turned": each link's card opens mid-selection, over the words
 *    4.2s   camera in on the line; the same selection again, each card marked in pink
 *    8.7s   camera out; the pointer presses "Warm-up"
 *   10.0s   camera in; the same selection: nothing opens (a held button is selecting, not looking)
 *   12.6s   it stops on "the scar" to look: the warm-up fills, then its card (mint)
 *   14.9s   camera out; back to "At once", the first frame again
 * owner, 2026-11-18: the toolbar sweep read as intentional; selecting is where an eager card gets in the way
 * ───────────────────────────────────────────────────────── */
const REST = 1.25;           // the editor's scale at rest (600 × 682 → 750 × 853)
const TOP = 300, ROOM = 810; // the camera's room, between the caption and the switch; the editor fades at its edges
const EASE = 'cubic-bezier(.65, 0, .35, 1)';
const CAM_MS = 900;

// what the clip says, one line a side, in big type above the editor; and the switch in plain words (owner, 2026-11-18)
const WORDS = {
  60: { broken: 'Hover that opens instantly fights with text selection.', fixed: 'A short warm-up makes hover intentional.', names: ['Opens instantly', 'Waits for a pause'],
    // the fix as code, shown once the switch is on the fixed side (owner, 2026-11-18): the warm-up in one property
    fix: { fault: 'transition-delay: 0ms', fix: 'transition-delay: 500ms' } },
  // two places, two right timings, no wrong side (owner, 2026-11-18, answering "what delay do you land on?"): the switch
  // picks the place; the editor plays its fixed side with the toolbar's own first wait
  '60-timing': { names: ['Toolbar', 'In text'], side: 'fixed', timing: { tool: 250, card: 500 },
    scenes: [
      { say: 'On a toolbar, wait 250ms. Then show the rest instantly.', code: 'transition-delay: 250ms',
        why: 'People reach for a toolbar on purpose. Once one tooltip is open, they are reading.' },
      { say: 'In text, wait 500ms. People pass through and select.', code: 'transition-delay: 500ms',
        why: 'The pointer crosses links on the way elsewhere. A longer pause filters that out.' },
    ] },
};

const CLIPS = {
  // the toolbar: the first waits a quarter second, the next ones come at once; then the text: half a second
  '60-timing': async ({ p, at, go, sweep, wait, camera, press }) => {
    const REST = [470, 610], TOOLS = { x0: 30, x1: 420, yc: 24, ya: 0.16 }, TEXT = { x0: 150, x1: 604, yc: 380 }, SCAR = [256, 336];
    beat('1 · wide: the editor at rest');
    go(p(...REST)); await wait(500);
    beat('2 · camera in on the toolbar');
    await camera(TOOLS);
    beat('3 · the first tooltip waits a quarter second');
    await sweep(null, at(1, 0.55), 650); await wait(1000);
    beat('4 · the next ones come at once');
    for (const i of [2, 3, 5]) { await sweep(null, at(i, 0.55), 300); await wait(750); }
    await sweep(null, p(330, 160), 350);
    beat('5 · camera out, to the text');
    await camera(null);
    await press(1);
    await camera(TEXT);
    beat('6 · in text, half a second');
    await sweep(null, p(205, 352), 500); await wait(200);
    await sweep(null, p(...SCAR), 600); await wait(1500);
    await sweep(null, p(205, 360), 400); await wait(300);
    beat('7 · camera out, back to the start');
    await camera(null);
    await press(0);
    await sweep(null, p(...REST), 700); await wait(300);
    beat('frame: line');
  },
  // the reader selects a phrase across two links: without a warm-up each card opens mid-selection, over the words
  60: async ({ p, go, sweep, select, wait, camera, press }) => {
    const REST = [205, 352], FROM = [224, 336], TO = [454, 336], SCAR = [256, 336], NEAR = { x0: 150, x1: 604, yc: 380 };
    beat('1 · wide: about to select a phrase');
    go(p(...REST)); await wait(600);
    beat('2 · selecting: every card opens over the line');
    await sweep(null, p(...FROM), 400);
    await select(p(...FROM), p(...TO), 1900); await wait(800);
    beat('3 · camera in on the line');
    await sweep(null, p(...REST), 500);
    await camera(NEAR);
    beat('4 · up close: selecting again, each card marked');
    await sweep(null, p(...FROM), 400);
    await select(p(...FROM), p(...TO), 1900); await wait(1300);
    beat('5 · camera out, the switch');
    await camera(null);
    await press(1);
    beat('6 · camera in: selecting opens nothing');
    await camera(NEAR);
    await sweep(null, p(...FROM), 600);
    await select(p(...FROM), p(...TO), 1900); await wait(700);
    beat('7 · stop on a word to look: it opens after a beat');
    await sweep(null, p(...SCAR), 650); await wait(1700);
    beat('8 · camera out, back to the start');
    await camera(null);
    await press(0);
    await sweep(null, p(...REST), 700); await wait(300);
    beat('frame: line'); // the recorders stop here
  },
};

// the pointer: macOS's arrow, white with a dark rim
const Arrow = ({ down }) => (
  <svg width="30" height="42" viewBox="0 0 15 21" style={{ transform: `scale(${down ? 0.86 : 1})`, transformOrigin: '2px 2px', transition: 'transform 120ms ease', filter: 'drop-shadow(0 2px 3px rgb(0 0 0 / .25))' }}>
    <path d="M1 1 L1 16.5 L4.8 12.9 L7.3 18.8 L9.9 17.7 L7.4 11.9 L12.6 11.9 Z" fill="#fff" stroke="#111" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);

export function ClipPage({ id }) {
  const n = parseInt(id, 10), mod = SCREENS[n], Example = mod?.default, clip = CLIPS[id], words = WORDS[id];
  const scene = (s) => words?.scenes?.[s === 'fixed' ? 1 : 0];
  const stage = useRef(null), card = useRef(null), sw = useRef(null);
  const [fit, setFit] = useState(1);
  const [side, setSide] = useState('broken');
  const [round, setRound] = useState(0);
  const [cam, setCam] = useState(null);       // null: at rest; else the transform up close
  const [rest, setRest] = useState(null);     // the editor's place at rest
  const [ptr, setPtr] = useState({ x: 980, y: 700, down: false });
  const over = useRef(null), pos = useRef({ x: 980, y: 700 }), held = useRef(0);

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
      setRest({ x: (W - w) / 2, y: (ROOM - h) / 2 });
    }));
    return () => { gone = true; };
  }, [Example]);

  // the clip asks the screen for its plain marks (a ring and a verdict in words, no measurements; owner, 2026-11-18);
  // wrong is plumber's pink in the films, and the marks' shadow roots set --pl-off on :host, so say it there
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
      const b = held.current;
      if (was) { was.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: el, pointerType: 'mouse', buttons: b })); was.closest('button')?.removeAttribute('data-clip-hover'); }
      if (el) { el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, relatedTarget: was, pointerType: 'mouse', buttons: b })); el.closest('[data-tool]')?.setAttribute('data-clip-hover', ''); }
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
    // press at a, drag to b with the button held, release: the page's real text selection follows the pointer
    const caret = (q) => { const o = stage.current.getBoundingClientRect(); return document.caretRangeFromPoint(o.left + q.x * fit, o.top + q.y * fit); };
    const select = async (a, b, ms) => {
      const sel = getSelection(); sel.removeAllRanges();
      setPtr((x) => ({ ...x, down: true })); held.current = 1;
      const from = caret(a); hit(a);
      const steps = Math.max(1, Math.round(ms / 16));
      for (let i = 1; i <= steps && !gone; i++) {
        const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2, q = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
        go(q);
        const to = caret(q); if (from && to) sel.setBaseAndExtent(from.startContainer, from.startOffset, to.startContainer, to.startOffset);
        await wait(16);
      }
      held.current = 0; setPtr((x) => ({ ...x, down: false }));
    };
    // camera in on a stretch of the editor (x0..x1 of its 600px fill the frame's width), or back to rest
    const camera = async (span) => {
      if (!span) { setCam(null); await wait(CAM_MS); return; }
      const { x0, x1, yc, ya = 0.5 } = span, k = (W - 60) / (x1 - x0);   // x0..x1 fill the width; yc sits ya down the room
      setCam({ k, x: 30 - x0 * k, y: ROOM * ya - yc * k });
      await wait(CAM_MS);
    };
    // the pointer goes to a side of the switch and presses it
    const press = async (i) => {
      const b = sw.current.querySelectorAll('button')[i];
      await sweep(null, at(b, 0.5), 650);
      setPtr((x) => ({ ...x, down: true })); await wait(140);
      getSelection().removeAllRanges(); setSide(i ? 'fixed' : 'broken'); setRound((r) => r + 1);
      setPtr((x) => ({ ...x, down: false })); await wait(260);
    };
    (async () => {
      await document.fonts?.ready; await wait(300);
      const t = (el) => (typeof el === 'number' ? tools()[el] : el);
      await clip({ p, select, at: (el, u) => at(t(el), u), go, sweep, wait, camera, press, tools });
    })();
    return () => { gone = true; };
  }, [rest, clip]);

  if (!Example) return <p style={{ padding: 40 }}>No screen № {n}.</p>;
  const tf = cam ? `translate(${cam.x}px, ${cam.y}px) scale(${cam.k})` : rest ? `translate(${rest.x}px, ${rest.y}px) scale(${REST})` : `scale(${REST})`;
  return (
    <div className="pl-light" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#111', overflow: 'hidden', '--pl-off': 'var(--pl-pink)', '--pl-off-bg': 'var(--pl-pink-soft)' }}>
      <div style={{ position: 'relative', width: W * fit, height: H * fit, overflow: 'hidden' }}>
      <style>{'plumb-overlay { display: none !important; } [data-clip-hover] { background: var(--color-sunken); color: var(--color-ink); } [data-example] ::selection { background: rgb(64 132 255 / .28); } @keyframes clip-say { from { opacity: 0; transform: translateY(14px); filter: blur(6px) } to { opacity: 1; transform: none; filter: none } } body { margin: 0; }'}</style>
      <div ref={stage} style={{ width: W, height: H, position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `scale(${fit})`, overflow: 'hidden', cursor: 'none',
        background: '#f5f4f0', backgroundImage: 'radial-gradient(circle, rgb(28 27 25 / .11) 1.3px, transparent 1.6px)', backgroundSize: '26px 26px' }}>
        <p key={side} style={{ position: 'absolute', left: 90, right: 90, top: 0, height: TOP, margin: 0, display: 'grid', placeItems: 'center', textAlign: 'center', textWrap: 'balance',
          font: '700 54px/1.12 "Bricolage Grotesque", var(--pl-round)', letterSpacing: '-0.02em', color: '#1c1b19', animation: 'clip-say 520ms cubic-bezier(.2, .8, .2, 1) both' }}>
          <span>{scene(side)?.say ?? words?.[side]}
            {scene(side)?.why ? <span style={{ display: 'block', margin: '18px auto 0', maxWidth: 760, font: '500 28px/1.3 var(--pl-round, system-ui)', letterSpacing: '-0.005em', color: 'rgb(28 27 25 / .62)' }}>{scene(side).why}</span> : null}
          </span>
        </p>
        <div style={{ position: 'absolute', left: 0, top: TOP, right: 0, height: ROOM, overflow: 'hidden', maskImage: 'linear-gradient(transparent, #000 5%, #000 93%, transparent)' }}>
        <div ref={card} data-example style={{ position: 'absolute', left: 0, top: 0, width: 600, transformOrigin: '0 0', transform: tf, transition: `transform ${CAM_MS}ms ${EASE}`, visibility: rest ? 'visible' : 'hidden' }}>
          <Example key={side + round} side={words?.side ?? side} timing={words?.timing} clip />
        </div>
        </div>
        <div ref={sw} style={{ position: 'absolute', left: '50%', bottom: 78 / 2.1, transform: 'translateX(-50%)', zoom: 2.1 }}>
          <TechniqueSwitch names={words?.names ?? Example.names} fixed={side === 'fixed'} ready={false} onBack={() => {}} onFix={() => {}} />
        </div>
        {scene(side) ? (
          <div key={'code-' + side} style={{ position: 'absolute', left: 0, right: 0, top: TOP + ROOM + 6, display: 'flex', justifyContent: 'center',
            font: '600 25px/1 ui-monospace, Menlo, monospace', animation: 'clip-say 520ms cubic-bezier(.2, .8, .2, 1) 200ms both' }}>
            <code style={{ padding: '10px 14px', borderRadius: 10, color: '#fff', background: '#1a9460' }}>{scene(side).code}</code>
          </div>
        ) : side === 'fixed' && words?.fix ? (
          <div key={round} style={{ position: 'absolute', left: 0, right: 0, top: TOP + ROOM + 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14,
            font: '600 25px/1 ui-monospace, Menlo, monospace', animation: 'clip-say 520ms cubic-bezier(.2, .8, .2, 1) 200ms both' }}>
            <code style={{ padding: '10px 14px', borderRadius: 10, color: '#fff', background: 'var(--pl-pink)', opacity: 0.6, textDecoration: 'line-through' }}>{words.fix.fault}</code>
            <span style={{ color: 'rgb(28 27 25 / .45)', font: '600 26px/1 var(--pl-round)' }}>→</span>
            <code style={{ padding: '10px 14px', borderRadius: 10, color: '#fff', background: '#1a9460' }}>{words.fix.fix}</code>
          </div>
        ) : null}
        <span style={{ position: 'absolute', right: 40, bottom: 36, display: 'flex', alignItems: 'center', gap: 10, font: '750 22px/1 "Bricolage Grotesque", var(--pl-round)', color: 'rgb(28 27 25 / .55)' }}>
          <Mark size={28} />React Plumber
        </span>
        <span style={{ position: 'absolute', left: ptr.x - 3, top: ptr.y - 3, pointerEvents: 'none', zIndex: 5 }}><Arrow down={ptr.down} /></span>
      </div>
      </div>
    </div>
  );
}
