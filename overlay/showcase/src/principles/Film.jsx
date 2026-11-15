// The film: a principle told in four beats (craft-rule skill §3⅝), drawn in plumber's own language
// (docs/briefs/visual-language.md, overlay/src/tokens.css, boxmodel.js): a content box is a 1px outline with plumber's
// halo, sky while measured, coral when off, mint once fixed; where a thing belonged, a dashed guide; a value only where
// the pointer is, in plumber's pill (pastel fill, inked mono, its property's icon) counting to its number; the cause as
// plumber's own typography pill ("Aa sm · 600"); and when everything holds, the toy burst plumber plays when a fix lands.
// From the owner's references only the principles are taken (feel it first, measure as it happens, cause after
// evidence, show why the fix holds, the same test pays off, time where understanding is built), never their marks.
//
// THE FILM (ms; beats follow the number of places)
//      0   FEEL IT        the broken side at rest size, nothing drawn; the pointer plays the gesture on each place
//          camera in      to the set the fault moves through
//          MEASURE IT     every place outlined in sky; the gesture on the lead place, twice: it turns coral, its size
//                         counts under it, every place it pushed shows a dashed guide where it belonged and the
//                         ground it was pushed across; on the second, the cause above it as plumber names it
//          WHY IT HOLDS   the pointer takes the other side; outlines turn mint; the same gesture on the lead: the size
//                         doesn't count, the cause reads its fixed value, and what the fix uses instead is named
//          PAYOFF         the same gesture on every place: size pill still, guides on the edges, nothing pushed; then
//                         the burst, marks out, camera out, and the example is the viewer's (Replay plays it again)
//
// What a screen supplies (Example.film):
//   instances(root) → elements, in order          set(el, on) → plays the gesture's state on one place
//   frame(root) → the elements the camera frames   lead → which place the measure is shown on
//   code → { fault: { cls, prop }, fix: { cls, prop } }: the class at fault and the one that fixes it, with the property each sets
//   read(root, i, rest) → { box, now, size: { icon, pre, from, to }, tags: [{ icon, pre, from, to } | { swatch, pre, text }],
//                           pushed: [{ x0, x1, y, h }] }   (example-local px)          say → the hint after
//
// A STILL FILM (Example.film.still: the fault is at rest, nothing to gesture; #37 half pixels): the pointer comes to rest
// on the subject; camera in; the places outlined, the lead coral with how far it is moved and how far off the grid that
// leaves it; then the camera goes on down into the lead's pixels (a loupe: the element redrawn sharp from its own words,
// fonts and colours, then placed exactly as far between pixel rows as it is), the words smeared across two rows; the
// fix lands and the same pixels snap onto the rows; back out, every place mint, the burst.
//   still: true    pixels(root) → the element the loupe looks into    read(root, el) → { ty, off, size, tags }
import { createContext, useContext, useEffect, useRef, useState } from 'react';

// the size plumber's own marks are drawn at: 1 in the showcase, larger in a film, which is watched smaller than it is
// made (FilmPage passes its own; the film's reviewers check it can be read at the size people watch)
const UI = createContext(1);
import { PlumbLayer } from './Principle.jsx';
import { ensureLook } from './look.js';
import { TOY_DEFS, toyOf } from '../../../src/toys.js';

ensureLook();

// the technique switch, in plumber's language: a sunk track, a lit thumb that slides on the spring, names in the toy face
function TechniqueSwitch({ names, fixed, ready, onBack, onFix }) {
  const s = useContext(UI);
  const track = useRef(null);
  const [thumb, setThumb] = useState(null);
  useEffect(() => { const on = track.current?.querySelector('[aria-pressed="true"]'); if (on) setThumb({ left: on.offsetLeft, width: on.offsetWidth }); }, [fixed, names]);
  const tab = (on) => ({ position: 'relative', zIndex: 1, height: 30 * s, padding: `0 ${14 * s}px`, border: 0, background: 'none', cursor: ready ? 'pointer' : 'default',
    font: `var(--pl-round-w2, 700) ${13 * s}px/1 var(--pl-round)`, color: on ? 'var(--pl-ink)' : 'var(--pl-ink-2)', transition: 'color 200ms ease', whiteSpace: 'nowrap' });
  return (
    <div ref={track} role="group" aria-label="Technique" style={{ position: 'relative', display: 'flex', padding: 3 * s, borderRadius: 11 * s, background: 'var(--pl-paper-2)', boxShadow: 'inset 0 1px 2px rgb(28 27 25 / 0.08), inset 0 0 0 1px var(--pl-rule)' }}>
      {thumb ? <span aria-hidden="true" style={{ position: 'absolute', top: 3 * s, bottom: 3 * s, left: thumb.left, width: thumb.width, borderRadius: 8 * s, background: 'var(--pl-paper)',
        boxShadow: '0 1px 2px rgb(28 27 25 / 0.12), 0 0 0 1px var(--pl-rule)', transition: 'left 420ms var(--pl-spring), width 420ms var(--pl-spring)' }} /> : null}
      <button type="button" aria-pressed={!fixed} disabled={!ready} onClick={onBack} style={tab(!fixed)}>{names[0]}</button>
      <button type="button" aria-pressed={fixed} disabled={!ready} onClick={onFix} style={tab(fixed)}>{names[1]}</button>
    </div>
  );
}

const TIMING = {
  lead:      700,   // the stage settles before the pointer moves
  move:      320,   // the pointer travels to a place
  feel:      650,   // feel it: the gesture held on each place
  camera:   1000,   // camera in (out: 900)
  outline:   450,   // measure it: the places outlined before the first gesture
  measure:  1600,   // measure it: the gesture held, its size counting
  between:   550,   // measure it: released, before the next
  cause:    2200,   // measure it: the second time, held with the cause named
  fade:      300,   // marks fade
  toSwitch:  650,   // the pointer travels to the switch
  press:     160,   // the press
  turn:      500,   // outlines sky → mint
  holds:    2400,   // why it holds: the gesture on the lead, the fixed values named
  payoff:    700,   // payoff: each place
  check:     420,   // plumber's check draws on the change card before it bursts
  clear:    1300,   // the burst plays
  out:       900,   // camera out
  rest:     1700,   // still: the pointer rests on the subject, nothing drawn
  dive:     1600,   // still: the camera goes down into the pixels
  smear:    2600,   // still: held on the smeared rows
  snap:     2800,   // still: held on the sharp rows, once fixed
  rise:     1300,   // still: back up out of the pixels
  count:     420,   // a pill's number counts this long
};
const CAMERA = { max: 1.8, fill: 0.92, at: 0.38, curve: 'cubic-bezier(0.7, 0, 0.3, 1)', pixels: 15 };
const LOUPE = { pad: 10, n: 16 };                     // the loupe's margin round the element (px), and its pixels' size when drawn

// The loupe: the element redrawn from its own words, fonts and colours on a 1× pixel grid, sharp, then placed `dy` (the
// fraction of a pixel its translate leaves) between the rows, the way the browser blends a box placed between rows;
// blown up so each pixel is a square, with the grid between them. Example-local px.
function pixelsOf(root, el, dy) {
  const at = local(root), b = at(el), o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  const x0 = Math.floor(b.x) - LOUPE.pad, y0 = Math.round(b.y - dy) - LOUPE.pad, w = Math.ceil(b.w) + 2 * LOUPE.pad, h = Math.ceil(b.h) + 2 * LOUPE.pad;
  const sharp = Object.assign(document.createElement('canvas'), { width: w, height: h }), c = sharp.getContext('2d');
  const ground = getComputedStyle(root).backgroundColor, es = getComputedStyle(el);
  c.fillStyle = ground; c.fillRect(0, 0, w, h);
  c.fillStyle = es.backgroundColor; c.beginPath(); c.roundRect(Math.round(b.x) - x0, LOUPE.pad, Math.round(b.w), Math.round(b.h), parseFloat(es.borderTopLeftRadius) || 0); c.fill();
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), range = document.createRange(), runs = [];
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    if (!node.textContent.trim()) continue;
    range.selectNodeContents(node); const r = range.getClientRects()[0]; if (!r) continue;
    const s = getComputedStyle(node.parentElement);
    c.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`; c.letterSpacing = s.letterSpacing === 'normal' ? '0px' : s.letterSpacing; c.fillStyle = s.color;
    const m = c.measureText(node.textContent), left = (r.left - o.left) / k, top = (r.top - o.top) / k - dy, hgt = r.height / k;
    const base = Math.round(top + (hgt - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 + m.fontBoundingBoxAscent);
    c.fillText(node.textContent, left - x0, base - y0);
    runs.push({ x: left, y: top + dy, w: r.width / k, h: hgt });
  }
  const placed = Object.assign(document.createElement('canvas'), { width: w, height: h }), p = placed.getContext('2d');
  p.fillStyle = ground; p.fillRect(0, 0, w, h); p.imageSmoothingEnabled = true; p.drawImage(sharp, 0, dy);
  const N = LOUPE.n, big = Object.assign(document.createElement('canvas'), { width: w * N, height: h * N }), g = big.getContext('2d');
  g.imageSmoothingEnabled = false; g.drawImage(placed, 0, 0, w * N, h * N);
  g.strokeStyle = 'rgb(128 128 128 / 0.22)'; g.lineWidth = 1; g.beginPath();
  for (let i = 0; i <= w; i++) { g.moveTo(i * N + 0.5, 0); g.lineTo(i * N + 0.5, h * N); }
  for (let j = 0; j <= h; j++) { g.moveTo(0, j * N + 0.5); g.lineTo(w * N, j * N + 0.5); }
  g.stroke();
  // the smear, marked: every pixel the fraction changed from the sharp drawing, in plumber's coral (none once on the rows)
  const A = c.getImageData(0, 0, w, h).data, B = p.getImageData(0, 0, w, h).data, luma = (d, i) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
  g.strokeStyle = 'rgb(242 74 159 / 0.95)'; g.lineWidth = 2; g.fillStyle = 'rgb(242 74 159 / 0.28)'; // plumber's pink
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const q = (j * w + i) * 4;
    if (Math.abs(luma(A, q) - luma(B, q)) > 14) { g.fillRect(i * N + 1, j * N + 1, N - 1, N - 1); g.strokeRect(i * N + 2, j * N + 2, N - 3, N - 3); }
  }
  const line = runs[1] ?? runs[0];
  return { x: x0, y: y0, w, h, url: big.toDataURL(), focus: { x: line.x + 16, y: line.y + line.h / 2, top: line.y } };
}
const PILL = { h: 20, gap: 6 };                       // px on screen, at any zoom
// the burst's pieces, as plumber's fix panel throws them (overlay/src/fixpanel.js #burst): padding's hatched square,
// the gap's stripes, margin's dots, a check
const BURST = { pieces: 34, speed: [300, 620], spread: 1.1, gravity: 1000, spin: 9, life: 1500, size: [7, 11] };
const BURST_HUES = { pad: '#1a9e62', gap: '#7a5cf0', mar: '#e2800a', ink: '#1c1b19' };

const BOXMODEL = '/__plumb/src/boxmodel.js'; // served by the overlay at runtime, not bundled with the showcase
// each beat, as it starts, for the film's reviewers (the story and camera reviews read a draft by its beats; see the
// film-draft script): window.__filmBeat, when the draft recorder listens, and window.__filmBeats always
export const beat = (name) => { const t = Math.round(performance.now()); (window.__filmBeats ??= []).push({ name, t }); window.__filmBeat?.(name, t); };
const sleep = (ms, live) => new Promise((ok) => { live.timers.push(setTimeout(() => live.on && ok(), ms)); });
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}
// the example lifted off the film's canvas: a crisp edge and a soft, slightly lilac light under it, not a grey smudge
const FILM_SHADOW = '0 0 0 1px rgb(18 35 61 / 0.07), 0 2px 4px rgb(18 35 61 / 0.05), 0 24px 48px -16px rgb(76 52 170 / 0.22)';
// in a film, "wrong" is plumber's pink, solid (owner, 2026-11-15, picked over the coral as brighter: the coral read muddy)
const hues = { sky: ['var(--pl-sky)', 'var(--pl-sky-soft)', 'var(--pl-sky-ink)'], off: ['var(--pl-pink)', 'var(--pl-pink-soft)', 'var(--pl-pink-ink)'], on: ['var(--pl-mint)', 'var(--pl-mint-soft)', 'var(--pl-mint-ink)'] };

// a number that counts to its value, the way plumber's chips show a value arriving
function Count({ from, to, ms = TIMING.count }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    let raf, t0;
    const step = (now) => { t0 ??= now; const t = Math.min(1, (now - t0) / ms), e = 1 - (1 - t) ** 3; setV(from + (to - from) * e); if (t < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  const places = Math.min(2, (String(to).split('.')[1] ?? '').length), r = Math.round(v * 10 ** places) / 10 ** places;
  return <>{Number.isInteger(to) && Number.isInteger(from) ? Math.round(v) : places === 2 ? r.toFixed(2) : Number.isInteger(r) ? r : r.toFixed(1)}</>;
}

// plumber's pill: pastel fill, inked mono, the property's icon in its line hue; never scaled by the camera
function Pill({ x, y, k, tone, icon, icons, toy, up, right, flow, mono = false, children }) {
  const s = useContext(UI) * 0.8; // a mark is never bigger than the words of the screen it sits on
  const [line, soft, ink] = hues[tone];
  return (
    <span style={{ ...(flow ? {} : right ? { position: 'absolute', left: x, top: y, transform: `translate(${right === 'left' ? '-100%' : '0'}, -50%) scale(${1 / k})`, transformOrigin: right === 'left' ? '100% 50%' : '0 50%' } : { position: 'absolute', left: x, top: y, transform: `translate(-50%, ${up ? '-100%' : '0'}) scale(${1 / k})`, transformOrigin: up ? '50% 100%' : '50% 0' }),
      display: 'flex', alignItems: 'center', gap: 5 * s, height: PILL.h * s, padding: `0 ${7 * s}px 0 ${(icon ? 5 : 7) * s}px`, borderRadius: 7 * s, whiteSpace: 'nowrap',
      font: mono ? `600 ${11 * s}px/1 var(--pl-mono)` : `600 ${12 * s}px/1 var(--pl-sans)`, fontVariantNumeric: 'tabular-nums', color: '#fff', background: line, boxShadow: '0 0 0 1px var(--pl-halo), 0 1px 2px rgb(0 0 0 / 0.18)', // plumber's pill: the hue, solid, lettered in white
      transition: 'background-color 450ms ease, color 450ms ease', animation: 'film-tag 520ms var(--pl-spring-pop) both' }}>
      {toy ? <span style={{ display: 'grid', width: 13 * s, height: 13 * s, flex: 'none', filter: 'brightness(0) invert(1)' }} dangerouslySetInnerHTML={{ __html: toyOf(toy).replace('<svg ', '<svg width="100%" height="100%" ') }} /> : null}
      {icon && icons?.[icon] ? <span style={{ display: 'grid', width: 12 * s, height: 12 * s, color: line }} dangerouslySetInnerHTML={{ __html: icons[icon] }} /> : null}
      {children}
    </span>
  );
}

// plumber's change, as its cards show it (overlay/src/widget.js .change): the class at fault in coral, then struck as
// the class that fixes it arrives in mint; under each, the property it sets. The sauce, said as code.
function Change({ code, fixed, done, inline = false }) {
  const s = useContext(UI);
  const chip = (t) => { const tone = t === 'off' ? 'pink' : t; return ({ padding: `${2 * s}px ${7 * s}px`, borderRadius: 5 * s, font: 'var(--pl-card-code)', fontSize: 13 * s, color: `var(--pl-${tone})`, background: `color-mix(in oklab, var(--pl-${tone}) ${tone === 'pink' ? 9 : 11}%, transparent)` }); }; // "wrong" is pink in a film
  const cap = { font: 'var(--pl-card-meta)', fontSize: 11.5 * s, color: 'var(--pl-ink-2)', textAlign: 'center' };
  // a long fault and fix (a gradient) don't fit side by side in the film's column: the fix opens under the fault instead
  const stack = inline && code.fault.cls.length + code.fix.cls.length > 40;
  return (
    <span style={{ position: 'absolute', ...(inline ? { left: 0, top: 0 } : { left: '50%', top: `calc(100% + ${12 * s}px)`, transform: 'translateX(-50%)' }), display: 'flex', alignItems: 'flex-start', gap: 10 * s, padding: `${10 * s}px ${14 * s}px ${9 * s}px`,
      borderRadius: 12 * s, background: 'var(--pl-paper)', color: 'var(--pl-ink)', boxShadow: '0 0 0 1px rgb(0 0 0 / 0.06), 0 8px 24px -8px rgb(0 0 0 / 0.18)', whiteSpace: 'nowrap',
      animation: 'film-pop 300ms var(--pl-spring-pop) both' }}>
      <span style={{ display: 'flex', flexDirection: stack ? 'column' : 'row', alignItems: 'flex-start', gap: stack ? 0 : 10 * s }}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4 * s }}>
        <code style={{ ...chip('off'), textDecorationLine: fixed ? 'line-through' : 'none', textDecorationThickness: 1, transition: 'opacity 300ms ease', opacity: fixed ? 0.75 : 1 }}>{code.fault.cls}</code>
        {code.fault.prop ? <span style={cap}>{code.fault.prop}</span> : null}
      </span>
      {/* the fix's part opens from nothing to its own width on the spring, then shows: the card grows to take it,
          centred on the switch, never jumping and never holding an empty place */}
      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10, overflow: 'hidden', interpolateSize: 'allow-keywords',
        ...(stack ? { height: fixed ? 'auto' : 0, marginTop: fixed ? 6 * s : 0, transition: 'height 460ms var(--pl-spring), margin-top 460ms var(--pl-spring)' }
          : { width: fixed ? 'auto' : 0, marginLeft: fixed ? 0 : -10, transition: 'width 460ms var(--pl-spring), margin-left 460ms var(--pl-spring)' }) }}>
        <span style={{ color: 'var(--pl-ink-3)', font: 'var(--pl-card-code)', paddingTop: 3, opacity: fixed ? 1 : 0, transition: 'opacity 200ms ease 160ms' }}>→</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, whiteSpace: 'nowrap', opacity: fixed ? 1 : 0, transform: `translateY(${fixed ? 0 : 3}px)`, transition: 'opacity 260ms ease 220ms, transform 420ms var(--pl-spring-pop) 220ms' }}>
          <code style={chip('on')}>{code.fix.cls}</code>
          {code.fix.prop ? <span style={cap}>{code.fix.prop}</span> : null}
        </span>
      </span>
      </span>
      {/* written, and it holds everywhere: plumber's check, drawn where the fix is; the burst comes from here */}
      <svg data-done viewBox="0 0 20 20" width={20 * s} height={20 * s} aria-hidden="true" style={{ marginTop: 3 * s, flex: 'none', width: done ? 20 * s : 0, marginLeft: done ? 0 : -10, opacity: done ? 1 : 0, transform: `scale(${done ? 1 : 0.6})`, transition: 'width 360ms var(--pl-spring), margin-left 360ms var(--pl-spring), opacity 200ms ease 120ms, transform 360ms var(--pl-spring-pop) 120ms' }}>
        <circle cx="10" cy="10" r="10" fill="var(--pl-mint)" />
        <path d="M5.8 10.4l2.7 2.7 5.6-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14" strokeDashoffset={done ? 0 : 14} style={{ transition: 'stroke-dashoffset 300ms ease 120ms' }} />
      </svg>
    </span>
  );
}

// the camera's framing of a screen's subject (its film.frame): as close as fits, inside the card's own box (the magnified
// card always covers it); `at` is where the subject sits in the frame's height (0.5 the middle)
function framing(spec, root, at) {
  const lc = local(root), W = root.offsetWidth, H = root.offsetHeight;
  const parts = [spec.frame(root)].flat().map(lc), l = Math.min(...parts.map((b) => b.x)), t = Math.min(...parts.map((b) => b.y));
  const f = { x: l, y: t, w: Math.max(...parts.map((b) => b.x + b.w)) - l, h: Math.max(...parts.map((b) => b.y + b.h)) - t };
  const k = Math.max(1, Math.min(CAMERA.max, (W * CAMERA.fill) / f.w)), clamp = (v, lo) => Math.min(0, Math.max(lo, v));
  return { k, x: clamp(W / 2 - k * (f.x + f.w / 2), W - k * W), y: clamp(H * at - k * (f.y + f.h / 2), H - k * H) };
}

function burst(canvas, ox, oy) {
  const dpr = devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight, cr = canvas.getBoundingClientRect(), pr = canvas.parentElement.getBoundingClientRect();
  const ks = pr.width / canvas.parentElement.offsetWidth || 1; // the film may be drawn scaled (the stage fits the window)
  ox += (pr.left - cr.left) / ks; oy += (pr.top - cr.top) / ks; // the burst's origin is given in the film's box; the canvas reaches past it
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const rand = (a, b) => a + Math.random() * (b - a), kinds = ['pad', 'pad', 'gap', 'gap', 'mar', 'mar', 'ink'];
  const parts = Array.from({ length: BURST.pieces }, (_, i) => { const a = -Math.PI / 2 + rand(-BURST.spread, BURST.spread), v = rand(...BURST.speed); return { kind: kinds[i % kinds.length], x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rand(0, 6.3), vr: rand(-BURST.spin, BURST.spin), size: rand(...BURST.size), wobble: rand(0, 6) }; });
  const paint = (p, alpha) => {
    const s = p.size, c = BURST_HUES[p.kind];
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = alpha; ctx.scale(1, Math.abs(Math.cos(p.r * 0.6 + p.wobble)) * 0.6 + 0.4);
    if (p.kind === 'pad') { ctx.fillStyle = '#fff'; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.strokeRect(-s / 2, -s / 2, s, s); ctx.beginPath(); for (let q = -s; q < s; q += 2.6) { ctx.moveTo(q - s / 2, s / 2); ctx.lineTo(q + s / 2, -s / 2); } ctx.save(); ctx.rect(-s / 2, -s / 2, s, s); ctx.clip(); ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
    else if (p.kind === 'gap') { const w = s * 1.5, h = s * 0.62; ctx.fillStyle = c; for (let q = 0; q < 3; q++) ctx.fillRect(-w / 2, -h / 2 + q * (h / 2.5), w, h / 5); }
    else if (p.kind === 'mar') { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, 6.3); ctx.globalAlpha = alpha * 0.25; ctx.fill(); ctx.globalAlpha = alpha; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) { ctx.beginPath(); ctx.arc(dx * s * 0.2, dy * s * 0.2, 1, 0, 6.3); ctx.fill(); } }
    else { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-s * 0.4, 0); ctx.lineTo(-s * 0.1, s * 0.3); ctx.lineTo(s * 0.45, -s * 0.35); ctx.stroke(); }
    ctx.restore();
  };
  let last = performance.now(); const t0 = last;
  const tick = (now) => {
    const dt = Math.min(0.033, (now - last) / 1000), t = now - t0; last = now;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) { p.vy += BURST.gravity * dt; p.vx *= 0.992; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; paint(p, Math.max(0, Math.min(1, (BURST.life - t) / (BURST.life / 3)))); }
    if (t < BURST.life) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(tick);
}

export function Film({ Example, names, onSaid, chrome = true, start = true, onDone, ui = 1, openIn = false, onLine, onBurst, aside = null }) {
  const spec = Example.film;
  // a film with a script (spec.script, the owner-approved words, one line a moment) says its story in those words, set
  // under the stage by FilmPage; plumber's own marks (pills, the change card, the check and burst) all stay as they are
  const words = !!(onLine && spec.script);
  const say = (at) => { const l = spec.script?.find((x) => x.at === at); if (l && onLine) onLine(l.text, at); };
  const has = (at) => !!spec.script?.some((x) => x.at === at);
  // a scripted film teaches one thing: the change card shows the one property that changes (spec.teach), not the classes
  const teach = words && spec.teach ? { fault: { cls: spec.teach.fault }, fix: { cls: spec.teach.fix } } : spec.code;
  const [side, setSide] = useState('broken');
  const [playing, setPlaying] = useState(false);
  const [cam, setCam] = useState({ k: 1, x: 0, y: 0 });
  const [m, setM] = useState(null);                 // { tone, boxes, lead, read, cause, fading }
  const [ptr, setPtr] = useState(null);             // { x, y, down, gone } in the film's own box
  const [icons, setIcons] = useState(null);
  const [change, setChange] = useState(0);
  const [frame, setFrame] = useState(null);         // the card's own box, while the camera works inside it: { radius, shadow }         // plumber's change card: 0 none · 1 the fault · 2 the fix
  const [run, setRun] = useState(0);
  const [loupe, setLoupe] = useState(null);          // still films: the pixels, { x, y, w, h, url, focus, on }
  const [px, setPx] = useState(null);                // still films: the pills over the dive, [{ x, y, tone, text }]
  const [drawing, setDrawing] = useState(null);      // still films that dive into a construction: { svg, on }
  const box = useRef(null), camRef = useRef(null), sw = useRef(null), fx = useRef(null);
  const example = () => camRef.current?.firstElementChild;
  // in the film's own px, whatever scale it is drawn at (screen px would put the pointer off when the stage is scaled)
  const toward = (el, dy = 0) => { const b = local(box.current)(el); return { x: b.x + b.w / 2, y: b.y + b.h / 2 + dy }; };

  // plumber's property icons, from the overlay itself (served by its dev server), never redrawn
  useEffect(() => { import(/* @vite-ignore */ BOXMODEL).then((mod) => setIcons(mod.BLOCK_ICONS)).catch(() => {}); }, []);

  // a film that opens on its subject: the camera is already in when the first frame is seen, so the problem is on screen
  // from the start (the story review's first check), and the film's own camera-in has nowhere to go
  useEffect(() => {
    if (!openIn) return;
    let gone = false;
    (document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(() => {
      const root = example(); if (gone || !root) return;
      const cs = getComputedStyle(root);
      setFrame({ radius: cs.borderRadius, shadow: cs.boxShadow });
      setCam({ ...framing(spec, root, spec.still ? 0.5 : CAMERA.at), ms: 0 });
    }));
    return () => { gone = true; };
  }, [openIn]);

  useEffect(() => {
    if (!start) return; // a frame around the film (FilmPage's opening) says when it begins
    if (still()) { onSaid?.(spec.say); onDone?.(); return; }
    const live = { on: true, timers: [] };
    const all = () => spec.instances(example());
    const boxes = () => { const at = local(example()); return all().map((el) => (spec.ring ? spec.ring(example(), el) : at(el))); }; // spec.ring: the part of a place the fault is in
    (async () => {
      setPlaying(true); setSide('broken'); setM(null); setChange(0); if (!openIn) { setFrame(null); setCam({ k: 1, x: 0, y: 0 }); } onSaid?.(''); if (spec.still) say('rest');
      await sleep(TIMING.lead, live); await document.fonts?.ready;
      if (spec.still) {
        const lead = () => all()[spec.lead];
        // FEEL IT: the pointer comes to rest on the subject; nothing drawn, the words just soft
        beat('1 · it happens: the pointer rests, nothing drawn');
        { const b = local(box.current)(lead()); setPtr({ x: b.x + b.w + 16, y: b.y + b.h / 2 + 2 }); }
        await sleep(TIMING.rest + (words ? 700 : 0), live);
        // camera in on the subject
        const root = example(), at = local(root), W = root.offsetWidth, H = root.offsetHeight;
        const parts = [spec.frame(root)].flat().map(at), l = Math.min(...parts.map((b) => b.x)), t = Math.min(...parts.map((b) => b.y));
        const f = { x: l, y: t, w: Math.max(...parts.map((b) => b.x + b.w)) - l, h: Math.max(...parts.map((b) => b.y + b.h)) - t };
        const k = Math.max(1, Math.min(CAMERA.max, (W * CAMERA.fill) / f.w)), clamp = (v, lo) => Math.min(0, Math.max(lo, v));
        const cs = getComputedStyle(root);
        setFrame({ radius: cs.borderRadius, shadow: cs.boxShadow });
        setPtr((p) => p && { ...p, gone: true });
        const near = framing(spec, root, 0.5);
        if (!openIn) { beat('camera in on the subject'); setCam(near); await sleep(TIMING.camera, live); } // opened in: already there
        // MEASURE IT: the places outlined; the lead coral, how far it is moved, then how far off the grid that leaves it
        const rest = boxes();
        setM({ tone: 'sky', boxes: rest }); await sleep(TIMING.outline, live);
        const read = { ...spec.read(example(), lead()), box: rest[spec.lead] };
        beat('2 · measure it: the lead in coral, its numbers'); say('measure'); setM({ tone: 'sky', boxes: rest, lead: spec.lead, read }); await sleep(TIMING.measure, live);
        beat('2 · the cause named, the class at fault'); setM({ tone: 'sky', boxes: rest, lead: spec.lead, read, cause: true }); if (spec.code) setChange(1);
        await sleep(TIMING.cause, live);
        setM((x) => x && { ...x, fading: true }); await sleep(TIMING.fade, live); setM(null);
        // down into the pixels: the words between two rows
        const frac = (v) => v - Math.round(v);
        const dive = (lp) => { const K = CAMERA.pixels; return { k: K, x: clamp(W / 2 - K * lp.focus.x, W - K * W), y: clamp(H / 2 - K * lp.focus.y, H - K * H), ms: TIMING.dive }; };
        let lp; beat('the dive: down into the detail');
        if (spec.pixels) {
          lp = pixelsOf(example(), spec.pixels(example()), frac(read.ty));
          setLoupe({ ...lp, on: false }); await sleep(30, live); setLoupe({ ...lp, on: true });
          setCam(dive(lp)); await sleep(TIMING.dive, live);
          setPx([{ x: lp.focus.x, y: lp.focus.top - 1.5, tone: 'off', toy: 'position', text: `${read.off.toFixed(2)}px between two rows` }]);
        } else {
          lp = spec.dive(example(), 'broken');
          const K = lp.k ?? CAMERA.pixels;
          setDrawing({ svg: lp.svg, on: false }); await sleep(30, live); setDrawing({ svg: lp.svg, on: true });
          setCam({ k: K, x: clamp(W / 2 - K * lp.focus.x, W - K * W), y: clamp(H / 2 - K * lp.focus.y, H - K * H), ms: TIMING.dive }); await sleep(TIMING.dive, live);
          setPx(lp.pills);
        }
        beat('the dive arrives: the fault drawn up close'); say('dive');
        if (words && has('smear')) { await sleep(3600, live); beat('the dive: why it is soft'); say('smear'); await sleep(2800, live); }
        else await sleep(words ? 3200 : TIMING.smear, live);
        // the fix lands: the same pixels, on the rows
        const fixBtn = sw.current?.querySelectorAll('button')[1];
        if (fixBtn) { setPtr(toward(fixBtn)); await sleep(TIMING.toSwitch, live); setPtr((p) => ({ ...p, down: true })); await sleep(TIMING.press, live); }
        setSide('fixed'); setPtr((p) => ({ ...p, down: false })); say('fix'); if (spec.code) setChange(2);
        beat('3 · the fix lands, up close'); await sleep(80, live);
        if (spec.pixels) {
          const fixedRead = spec.read(example(), lead()), lf = pixelsOf(example(), spec.pixels(example()), frac(fixedRead.ty));
          setLoupe({ ...lp, url: lf.url, on: true });
          setPx([{ x: lp.focus.x, y: lp.focus.top - 1.5, tone: 'on', toy: 'position', text: `${fixedRead.off.toFixed(2)}px · on the rows` }]);
        } else {
          const lf = spec.dive(example(), 'fixed');
          setDrawing({ svg: lf.svg, on: true }); setPx(lf.pills);
        }
        setPtr((p) => p && { ...p, gone: true });
        await sleep(TIMING.snap, live);
        // back up; every place holds
        beat('back up out of the detail'); setPx(null); setLoupe((x) => x && { ...x, on: false }); setDrawing((x) => x && { ...x, on: false }); setCam({ ...near, ms: TIMING.rise }); await sleep(TIMING.rise, live); setLoupe(null); setDrawing(null);
        const fixedRest = boxes();
        beat('4 · payoff: every place mint'); say('payoff'); setM({ tone: 'on', boxes: fixedRest }); await sleep(TIMING.turn, live);
        for (let i = 0; i < all().length; i++) {
          setM({ tone: 'on', boxes: fixedRest, lead: i, read: { ...spec.read(example(), all()[i]), box: fixedRest[i] }, cause: i === spec.lead });
          const each = spec.payoff ?? TIMING.payoff; await sleep(i === spec.lead ? each * 2 : each, live); // a film with many places walks them faster
        }
        setM({ tone: 'on', boxes: fixedRest });
        if (spec.code) {
          beat('the check and the burst'); say('end'); setChange(3); await sleep(TIMING.check, live);
          const host = sw.current?.querySelector('div[aria-hidden="true"]'), check = host?.shadowRoot?.querySelector('[data-done]')?.getBoundingClientRect(), o = box.current.getBoundingClientRect();
          if (fx.current && check) { const ks = o.width / box.current.offsetWidth || 1; burst(fx.current, (check.left - o.left + check.width / 2) / ks, (check.top - o.top + check.height / 2) / ks); }
          onBurst?.(); if (has('end')) await sleep(1800, live);
        }
        await sleep(TIMING.clear, live);
        setM((x) => x && { ...x, fading: true }); await sleep(TIMING.fade, live);
        setM(null); setChange(0); setCam({ k: 1, x: 0, y: 0 });
        await sleep(TIMING.out + 40, live);
        setFrame(null); setPtr(null); setPlaying(false); onSaid?.(spec.say); onDone?.();
        return;
      }
      // FEEL IT: the gesture on every place, nothing drawn
      beat('1 · it happens: the gesture on every place, nothing drawn');
      for (const el of all()) { setPtr(toward(el, 5)); await sleep(TIMING.move, live); spec.set(el, true); await sleep(TIMING.feel, live); spec.set(el, false); }
      // camera in on the set
      const root = example(), at = local(root), W = root.offsetWidth, H = root.offsetHeight;
      const parts = [spec.frame(root)].flat().map(at), l = Math.min(...parts.map((b) => b.x)), t = Math.min(...parts.map((b) => b.y));
      const f = { x: l, y: t, w: Math.max(...parts.map((b) => b.x + b.w)) - l, h: Math.max(...parts.map((b) => b.y + b.h)) - t };
      const k = Math.max(1, Math.min(CAMERA.max, (W * CAMERA.fill) / f.w));
      // the camera works inside the card's own box: it keeps its size, corners and shadow on the board, and the
      // magnified card always covers it (never a gap at an edge), so nothing on the stage is ever crossed
      const cs = getComputedStyle(root), clamp = (v, lo) => Math.min(0, Math.max(lo, v));
      setFrame({ radius: cs.borderRadius, shadow: cs.boxShadow });
      setPtr((p) => p && { ...p, gone: true });
      setCam(framing(spec, root, CAMERA.at));
      if (!openIn) await sleep(TIMING.camera, live);
      // MEASURE IT: every place outlined in sky; the gesture on the lead twice, the cause named the second time
      const rest = boxes(), lead = () => all()[spec.lead];
      beat('2 · measure it: every place outlined'); setM({ tone: 'sky', boxes: rest });
      await sleep(TIMING.outline, live);
      for (let rep = 0; rep < 2; rep++) {
        setPtr(toward(lead(), 5)); await sleep(TIMING.move, live);
        spec.set(lead(), true);
        setM({ tone: 'sky', boxes: rest, lead: spec.lead, read: spec.read(example(), spec.lead, rest), cause: rep === 1 });
        if (rep === 1 && spec.code) setChange(1); // the cause named: the class at fault, and the property it sets
        await sleep(rep === 1 ? TIMING.cause : TIMING.measure, live);
        spec.set(lead(), false);
        setM({ tone: 'sky', boxes: rest });
        setPtr((p) => ({ ...p, y: p.y + 30 }));
        await sleep(TIMING.between, live);
      }
      // WHY IT HOLDS: the other side; outlines mint; the same gesture on the lead names what the fix uses instead
      const fixBtn = sw.current?.querySelectorAll('button')[1];
      if (fixBtn) { setPtr(toward(fixBtn)); await sleep(TIMING.toSwitch, live); setPtr((p) => ({ ...p, down: true })); await sleep(TIMING.press, live); }
      setSide('fixed'); setPtr((p) => ({ ...p, down: false })); beat('3 · the fix lands');
      if (spec.code) setChange(2); // the fix lands: struck, and the class that holds arrives
      await sleep(60, live);
      const fixedRest = boxes();
      setM({ tone: 'on', boxes: fixedRest });
      await sleep(TIMING.turn, live);
      setPtr(toward(lead(), 5)); await sleep(TIMING.move, live);
      spec.set(lead(), true);
      setM({ tone: 'on', boxes: fixedRest, lead: spec.lead, read: spec.read(example(), spec.lead, fixedRest), cause: true });
      await sleep(TIMING.holds, live);
      spec.set(lead(), false);
      setM({ tone: 'on', boxes: fixedRest });
      // PAYOFF: the same gesture on every place
      beat('4 · payoff: the same gesture on every place');
      for (let i = 0; i < all().length; i++) {
        setPtr(toward(all()[i], 5)); await sleep(TIMING.move, live);
        spec.set(all()[i], true);
        setM({ tone: 'on', boxes: fixedRest, lead: i, read: spec.read(example(), i, fixedRest) });
        await sleep(TIMING.payoff - TIMING.move, live);
        spec.set(all()[i], false);
      }
      setM({ tone: 'on', boxes: fixedRest }); setPtr((p) => p && { ...p, gone: true });
      // every place holds: plumber's check draws where the fix was written, and bursts from there (as its fix panel does)
      if (spec.code) {
        beat('the check and the burst'); setChange(3); await sleep(TIMING.check, live);
        const host = sw.current?.querySelector('div[aria-hidden="true"]'), check = host?.shadowRoot?.querySelector('[data-done]')?.getBoundingClientRect(), o = box.current.getBoundingClientRect();
        if (fx.current && check) { const ks = o.width / box.current.offsetWidth || 1; burst(fx.current, (check.left - o.left + check.width / 2) / ks, (check.top - o.top + check.height / 2) / ks); }
      }
      await sleep(TIMING.clear, live);
      setM((x) => x && { ...x, fading: true }); await sleep(TIMING.fade, live);
      setM(null); setChange(0); setCam({ k: 1, x: 0, y: 0 });
      await sleep(TIMING.out + 40, live);
      setFrame(null); // only once the camera is fully back
      setPtr(null); setPlaying(false); onSaid?.(spec.say); onDone?.();
    })();
    return () => { live.on = false; live.timers.forEach(clearTimeout); try { all().forEach((el) => spec.set(el, false)); } catch {} };
  }, [run, start]);

  const k = cam.k, r = m?.read, tone = m?.tone, pushed = tone === 'sky' && r?.pushed?.some((p) => p.x1 - p.x0 > 0.5);
  // the lead place turns coral while it pushes; mint once it holds
  const toneOf = (i) => (tone === 'sky' && m?.lead === i && (pushed || r?.off > 0.05) ? 'off' : tone);
  const tagTone = tone === 'on' ? 'on' : 'off';
  return (
    <UI.Provider value={ui}>
    <div ref={box} className="pl-light relative flex flex-col items-center gap-10" style={{ '--pl-off': 'var(--pl-pink)', '--pl-off-bg': 'var(--pl-pink-soft)', '--shadow-card': FILM_SHADOW }}>
      <style>{'@keyframes film-pop { from { opacity: 0; scale: 0.92 } to { opacity: 1; scale: 1 } } @keyframes film-ring { from { opacity: 0; scale: 1.25 } to { opacity: 1; scale: 1 } } @keyframes film-tag { from { opacity: 0; scale: 0.6; translate: 0 6px } to { opacity: 1; scale: 1; translate: 0 0 } }'}</style>
      <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: TOY_DEFS }} />
      <div className="relative" style={frame ? { overflow: 'clip', borderRadius: frame.radius, boxShadow: frame.shadow, isolation: 'isolate' } : undefined}>
        <div ref={camRef} className="relative" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${k})`, transformOrigin: '0 0', transition: `transform ${cam.ms ?? (k > 1 ? TIMING.camera : TIMING.out)}ms ${CAMERA.curve}`, pointerEvents: playing ? 'none' : undefined }}>
          <Example key={side} side={side} onStatus={playing ? undefined : onSaid} />
          {/* still films: the pixels, laid exactly over the element they show */}
          {loupe ? <img alt="" src={loupe.url} style={{ position: 'absolute', left: loupe.x, top: loupe.y, width: loupe.w, height: loupe.h, imageRendering: 'pixelated', maxWidth: 'none',
            opacity: loupe.on ? 1 : 0, transition: loupe.on ? 'opacity 500ms ease 350ms' : 'opacity 250ms ease 800ms' }} /> : null}
          {/* still films that dive into a construction: the drawing, in the example's own px, its lines a constant width */}
          {drawing ? <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: drawing.on ? 1 : 0, transition: drawing.on ? 'opacity 450ms ease 500ms' : 'opacity 250ms ease' }}
            dangerouslySetInnerHTML={{ __html: `<svg width="100%" height="100%" style="position:absolute;inset:0;overflow:visible">${drawing.svg}</svg>` }} /> : null}
          <PlumbLayer>
            {m ? (
              <div style={{ position: 'absolute', inset: 0, opacity: m.fading ? 0 : 1, transition: `opacity ${TIMING.fade}ms ease` }}>
                {/* every place, ringed as plumber rings what it judges (show.js .sh-mark.ink): a dashed ring, never a fill,
                    so what is under it is what's judged; the rings land one after another, each with a small spring */}
                {m.boxes.map((b, i) => {
                  const at = r?.now?.[i] ?? b, pad = 4 / k, hue = hues[spec.ring && tone === 'sky' ? 'off' : toneOf(i)][0];
                  return <span key={i} style={{ position: 'absolute', left: at.x - pad, top: at.y - pad, width: at.w + 2 * pad, height: at.h + 2 * pad, borderRadius: 7 / k, boxSizing: 'border-box',
                    border: `${1.5 / k}px dashed ${hue}`, boxShadow: `0 0 0 ${1 / k}px var(--pl-halo), inset 0 0 0 ${1 / k}px var(--pl-halo)`, transition: 'border-color 450ms ease',
                    animation: `film-ring 480ms var(--pl-spring-pop) ${Math.min(i, 12) * 55}ms both` }} />;
                })}
                {/* where each pushed place belonged: a dashed guide; the ground it was pushed across, tinted */}
                {/* only where something moved: a guide on an edge that stayed put would only double its outline */}
                {r?.pushed?.filter((p) => p.x1 - p.x0 > 0.5).map((p, i) => (
                  <span key={i}>
                    <span style={{ position: 'absolute', left: p.x0, top: p.y - 6, height: p.h + 12, width: 0, borderLeft: `${1 / k}px dashed var(--pl-sky)` }} />
                    {p.x1 - p.x0 > 0.5 ? <span style={{ position: 'absolute', left: p.x0, top: p.y, height: p.h, width: p.x1 - p.x0, background: 'var(--pl-off-bg)', boxShadow: `inset ${-1 / k}px 0 0 var(--pl-pink)` }} /> : null}
                  </span>
                ))}
                {/* a value only where the pointer is: the size, counting, under the place */}
                {/* a screen can pin the value beside its place, in the place's own row (spec.read's `pin`), so it never covers a neighbour */}
                {r ? <Pill key={`s${m.lead}${tone}`} right={r.pin ? r.pin.side ?? true : false} x={r.pin ? r.pin.x + (r.pin.side === 'left' ? -1 : 1) * (PILL.gap * ui) / k : r.box.x + r.box.w / 2} y={r.pin ? r.pin.y : r.box.y + r.box.h + (PILL.gap * ui) / k} k={k} tone={toneOf(m.lead) === 'sky' ? 'on' : toneOf(m.lead)} icon={r.size.icon} icons={icons} toy={r.size.toy} mono>{r.size.pre}<Count from={r.size.from} to={r.size.to} />{r.size.post}</Pill> : null}
                {/* the cause, as plumber names it: its own pills, above the place */}
                {/* side by side in one row, so they never climb onto the words above */}
                {r && m.cause && r.tags?.length ? (
                  <span style={{ position: 'absolute', left: r.box.x + r.box.w / 2, top: r.box.y - (PILL.gap * ui) / k, display: 'flex', gap: 4 * ui, transform: `translate(-50%, -100%) scale(${1 / k})`, transformOrigin: '50% 100%' }}>
                    {r.tags.map((g, i) => (
                      <Pill key={`t${i}${tone}`} flow k={k} tone={tagTone} icon={g.icon} icons={icons} toy={g.toy}>
                        {g.swatch ? <span style={{ width: 9, height: 9, borderRadius: 3, background: g.swatch, boxShadow: '0 0 0 1px rgb(0 0 0 / 0.12)' }} /> : null}
                        {g.pre}{g.text ?? <Count from={g.from} to={g.to} />}
                      </Pill>
                    ))}
                  </span>
                ) : null}
              </div>
            ) : null}
            {px ? px.map((q, i) => <Pill key={`${q.tone}${i}`} x={q.x} y={q.y} k={k} tone={q.tone} toy={q.toy} up>{q.text}</Pill>) : null}
          </PlumbLayer>
        </div>
      </div>
      {/* aside: the words, the switch and the change card in a column to the right of the card, so the card can take the whole height */}
      <div ref={sw} className={aside ? 'z-10 flex flex-col items-start' : 'relative z-10 flex flex-col items-center'} style={aside ? { position: 'absolute', left: 'calc(100% + 56px)', top: '50%', translate: '0 -50%', width: 380, gap: 28 } : undefined}>
        {aside}
        {aside ? (
          // beside the demo: the change card in its own row, its room kept so the switch under it never jumps
          <div style={{ position: 'relative', width: '100%', height: 44 * ui }}>{change && spec.code ? <PlumbLayer><Change code={teach} fixed={change >= 2} done={change === 3} inline /></PlumbLayer> : null}</div>
        ) : change && spec.code ? <PlumbLayer><Change code={spec.code} fixed={change >= 2} done={change === 3} /></PlumbLayer> : null}
        {/* in a scripted film the switch is chrome, a step under the story's words: smaller than plumber's film-size marks */}
        <UI.Provider value={words ? Math.min(ui, 1.4 / 0.95) : ui}><TechniqueSwitch names={names} fixed={side === 'fixed'} ready={!playing} onBack={() => setSide('broken')} onFix={() => setSide('fixed')} /></UI.Provider>
      </div>
      {chrome ? (!playing ? <button type="button" onClick={() => setRun((x) => x + 1)} style={{ marginTop: -28, border: 0, background: 'none', cursor: 'pointer', font: 'var(--pl-round-w2, 700) 13px/20px var(--pl-round)', color: 'var(--pl-ink-2)' }}>Replay</button> : <span style={{ marginTop: -28, height: 20 }} />) : null}
      <canvas ref={fx} aria-hidden="true" className="pointer-events-none absolute z-30" style={{ left: -160, top: -80, width: 'calc(100% + 320px)', height: 'calc(100% + 160px)' }} />
      {ptr ? (
        <svg aria-hidden="true" width="18" height="22" viewBox="0 0 18 22" style={{ position: 'absolute', left: 0, top: 0, zIndex: 40, pointerEvents: 'none',
          transform: `translate(${ptr.x - 3}px, ${ptr.y - 2}px) scale(${(ptr.down ? 0.86 : 1) * Math.max(1, ui * 0.75)})`, transformOrigin: '3px 2px', opacity: ptr.gone ? 0 : 1,
          transition: 'transform 420ms cubic-bezier(0.3, 0, 0.2, 1), opacity 250ms ease', filter: 'drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.25))' }}>
          <path d="M2 1.5v16.2l4.1-3.9 2.6 6.2 3-1.3-2.6-6h5.7z" fill="#111" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
    </UI.Provider>
  );
}
