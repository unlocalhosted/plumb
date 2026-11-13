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
import { useEffect, useRef, useState } from 'react';
import { PlumbLayer } from './Principle.jsx';
import { ensureLook } from './look.js';

ensureLook();

// the technique switch, in plumber's language: a sunk track, a lit thumb that slides on the spring, names in the toy face
function TechniqueSwitch({ names, fixed, ready, onBack, onFix }) {
  const track = useRef(null);
  const [thumb, setThumb] = useState(null);
  useEffect(() => { const on = track.current?.querySelector('[aria-pressed="true"]'); if (on) setThumb({ left: on.offsetLeft, width: on.offsetWidth }); }, [fixed, names]);
  const tab = (on) => ({ position: 'relative', zIndex: 1, height: 30, padding: '0 14px', border: 0, background: 'none', cursor: ready ? 'pointer' : 'default',
    font: 'var(--pl-round-w2, 700) 13px/1 var(--pl-round)', color: on ? 'var(--pl-ink)' : 'var(--pl-ink-2)', transition: 'color 200ms ease', whiteSpace: 'nowrap' });
  return (
    <div ref={track} role="group" aria-label="Technique" style={{ position: 'relative', display: 'flex', padding: 3, borderRadius: 11, background: 'var(--pl-paper-2)', boxShadow: 'inset 0 1px 2px rgb(28 27 25 / 0.08), inset 0 0 0 1px var(--pl-rule)' }}>
      {thumb ? <span aria-hidden="true" style={{ position: 'absolute', top: 3, bottom: 3, left: thumb.left, width: thumb.width, borderRadius: 8, background: 'var(--pl-paper)',
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
  count:     420,   // a pill's number counts this long
};
const CAMERA = { max: 1.8, fill: 0.92, at: 0.38, curve: 'cubic-bezier(0.7, 0, 0.3, 1)' };
const PILL = { h: 20, gap: 6 };                       // px on screen, at any zoom
// the burst's pieces, as plumber's fix panel throws them (overlay/src/fixpanel.js #burst): padding's hatched square,
// the gap's stripes, margin's dots, a check
const BURST = { pieces: 34, speed: [300, 620], spread: 1.1, gravity: 1000, spin: 9, life: 1500, size: [7, 11] };
const BURST_HUES = { pad: '#1a9e62', gap: '#7a5cf0', mar: '#e2800a', ink: '#1c1b19' };

const BOXMODEL = '/__plumb/src/boxmodel.js'; // served by the overlay at runtime, not bundled with the showcase
const sleep = (ms, live) => new Promise((ok) => { live.timers.push(setTimeout(() => live.on && ok(), ms)); });
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}
const hues = { sky: ['var(--pl-sky)', 'var(--pl-sky-soft)', 'var(--pl-sky-ink)'], off: ['var(--pl-coral)', 'var(--pl-coral-soft)', 'var(--pl-coral-ink)'], on: ['var(--pl-mint)', 'var(--pl-mint-soft)', 'var(--pl-mint-ink)'] };

// a number that counts to its value, the way plumber's chips show a value arriving
function Count({ from, to, ms = TIMING.count }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    let raf, t0;
    const step = (now) => { t0 ??= now; const t = Math.min(1, (now - t0) / ms), e = 1 - (1 - t) ** 3; setV(from + (to - from) * e); if (t < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  const r = Math.round(v * 10) / 10;
  return <>{Number.isInteger(to) && Number.isInteger(from) ? Math.round(v) : Number.isInteger(r) ? r : r.toFixed(1)}</>;
}

// plumber's pill: pastel fill, inked mono, the property's icon in its line hue; never scaled by the camera
function Pill({ x, y, k, tone, icon, icons, up, flow, children }) {
  const [line, soft, ink] = hues[tone];
  return (
    <span style={{ ...(flow ? {} : { position: 'absolute', left: x, top: y, transform: `translate(-50%, ${up ? '-100%' : '0'}) scale(${1 / k})`, transformOrigin: up ? '50% 100%' : '50% 0' }),
      display: 'flex', alignItems: 'center', gap: 5, height: PILL.h, padding: '0 7px 0 5px', borderRadius: 7, whiteSpace: 'nowrap',
      font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', color: ink, background: soft, boxShadow: `0 0 0 1px var(--pl-halo), inset 0 0 0 1px color-mix(in oklab, ${line} 30%, transparent)`,
      transition: 'background-color 450ms ease, color 450ms ease', animation: 'film-pop 260ms var(--pl-spring-pop) both' }}>
      {icon && icons?.[icon] ? <span style={{ display: 'grid', width: 12, height: 12, color: line }} dangerouslySetInnerHTML={{ __html: icons[icon] }} /> : null}
      {children}
    </span>
  );
}

// plumber's change, as its cards show it (overlay/src/widget.js .change): the class at fault in coral, then struck as
// the class that fixes it arrives in mint; under each, the property it sets. The sauce, said as code.
function Change({ code, fixed, done }) {
  const chip = (tone) => ({ padding: '2px 7px', borderRadius: 5, font: 'var(--pl-card-code)', fontSize: 13, color: `var(--pl-${tone})`, background: `color-mix(in oklab, var(--pl-${tone}) ${tone === 'off' ? 9 : 11}%, transparent)` });
  const cap = { font: 'var(--pl-card-meta)', fontSize: 11.5, color: 'var(--pl-ink-2)', textAlign: 'center' };
  return (
    <span style={{ position: 'absolute', left: '50%', top: 'calc(100% + 16px)', transform: 'translateX(-50%)', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px 9px',
      borderRadius: 12, background: 'var(--pl-paper)', color: 'var(--pl-ink)', boxShadow: '0 0 0 1px rgb(0 0 0 / 0.06), 0 8px 24px -8px rgb(0 0 0 / 0.18)', whiteSpace: 'nowrap',
      animation: 'film-pop 300ms var(--pl-spring-pop) both' }}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <code style={{ ...chip('off'), textDecorationLine: fixed ? 'line-through' : 'none', textDecorationThickness: 1, transition: 'opacity 300ms ease', opacity: fixed ? 0.75 : 1 }}>{code.fault.cls}</code>
        <span style={cap}>{code.fault.prop}</span>
      </span>
      {/* the fix's part opens from nothing to its own width on the spring, then shows: the card grows to take it,
          centred on the switch, never jumping and never holding an empty place */}
      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10, overflow: 'hidden', interpolateSize: 'allow-keywords', width: fixed ? 'auto' : 0, marginLeft: fixed ? 0 : -10, transition: 'width 460ms var(--pl-spring), margin-left 460ms var(--pl-spring)' }}>
        <span style={{ color: 'var(--pl-ink-3)', font: 'var(--pl-card-code)', paddingTop: 3, opacity: fixed ? 1 : 0, transition: 'opacity 200ms ease 160ms' }}>→</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, whiteSpace: 'nowrap', opacity: fixed ? 1 : 0, transform: `translateY(${fixed ? 0 : 3}px)`, transition: 'opacity 260ms ease 220ms, transform 420ms var(--pl-spring-pop) 220ms' }}>
          <code style={chip('on')}>{code.fix.cls}</code>
          <span style={cap}>{code.fix.prop}</span>
        </span>
      </span>
      {/* written, and it holds everywhere: plumber's check, drawn where the fix is; the burst comes from here */}
      <svg data-done viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" style={{ marginTop: 3, flex: 'none', width: done ? 20 : 0, marginLeft: done ? 0 : -10, opacity: done ? 1 : 0, transform: `scale(${done ? 1 : 0.6})`, transition: 'width 360ms var(--pl-spring), margin-left 360ms var(--pl-spring), opacity 200ms ease 120ms, transform 360ms var(--pl-spring-pop) 120ms' }}>
        <circle cx="10" cy="10" r="10" fill="var(--pl-mint)" />
        <path d="M5.8 10.4l2.7 2.7 5.6-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14" strokeDashoffset={done ? 0 : 14} style={{ transition: 'stroke-dashoffset 300ms ease 120ms' }} />
      </svg>
    </span>
  );
}

function burst(canvas, ox, oy) {
  const dpr = devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight, cr = canvas.getBoundingClientRect(), pr = canvas.parentElement.getBoundingClientRect();
  ox += pr.left - cr.left; oy += pr.top - cr.top; // the burst's origin is given in the film's box; the canvas reaches past it
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

export function Film({ Example, names, onSaid, chrome = true, start = true, onDone }) {
  const spec = Example.film;
  const [side, setSide] = useState('broken');
  const [playing, setPlaying] = useState(false);
  const [cam, setCam] = useState({ k: 1, x: 0, y: 0 });
  const [m, setM] = useState(null);                 // { tone, boxes, lead, read, cause, fading }
  const [ptr, setPtr] = useState(null);             // { x, y, down, gone } in the film's own box
  const [icons, setIcons] = useState(null);
  const [change, setChange] = useState(0);
  const [frame, setFrame] = useState(null);         // the card's own box, while the camera works inside it: { radius, shadow }         // plumber's change card: 0 none · 1 the fault · 2 the fix
  const [run, setRun] = useState(0);
  const box = useRef(null), camRef = useRef(null), sw = useRef(null), fx = useRef(null);
  const example = () => camRef.current?.firstElementChild;
  const toward = (el, dy = 0) => { const o = box.current.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2 + dy }; };

  // plumber's property icons, from the overlay itself (served by its dev server), never redrawn
  useEffect(() => { import(/* @vite-ignore */ BOXMODEL).then((mod) => setIcons(mod.BLOCK_ICONS)).catch(() => {}); }, []);

  useEffect(() => {
    if (!start) return; // a frame around the film (FilmPage's opening) says when it begins
    if (still()) { onSaid?.(spec.say); onDone?.(); return; }
    const live = { on: true, timers: [] };
    const all = () => spec.instances(example());
    const boxes = () => { const at = local(example()); return all().map(at); };
    (async () => {
      setPlaying(true); setSide('broken'); setM(null); setChange(0); setFrame(null); setCam({ k: 1, x: 0, y: 0 }); onSaid?.('');
      await sleep(TIMING.lead, live); await document.fonts?.ready;
      // FEEL IT: the gesture on every place, nothing drawn
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
      setCam({ k, x: clamp(W / 2 - k * (f.x + f.w / 2), W - k * W), y: clamp(H * CAMERA.at - k * (f.y + f.h / 2), H - k * H) });
      await sleep(TIMING.camera, live);
      // MEASURE IT: every place outlined in sky; the gesture on the lead twice, the cause named the second time
      const rest = boxes(), lead = () => all()[spec.lead];
      setM({ tone: 'sky', boxes: rest });
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
      setSide('fixed'); setPtr((p) => ({ ...p, down: false }));
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
        setChange(3); await sleep(TIMING.check, live);
        const host = sw.current?.querySelector('div[aria-hidden="true"]'), check = host?.shadowRoot?.querySelector('[data-done]')?.getBoundingClientRect(), o = box.current.getBoundingClientRect();
        if (fx.current && check) burst(fx.current, check.left - o.left + check.width / 2, check.top - o.top + check.height / 2);
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
  const toneOf = (i) => (tone === 'sky' && m?.lead === i && pushed ? 'off' : tone);
  const tagTone = tone === 'on' ? 'on' : 'off';
  return (
    <div ref={box} className="pl-light relative flex flex-col items-center gap-10">
      <style>{'@keyframes film-pop { from { opacity: 0; scale: 0.92 } to { opacity: 1; scale: 1 } }'}</style>
      <div className="relative" style={frame ? { overflow: 'clip', borderRadius: frame.radius, boxShadow: frame.shadow, isolation: 'isolate' } : undefined}>
        <div ref={camRef} className="relative" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${k})`, transformOrigin: '0 0', transition: `transform ${k > 1 ? TIMING.camera : TIMING.out}ms ${CAMERA.curve}`, pointerEvents: playing ? 'none' : undefined }}>
          <Example key={side} side={side} onStatus={playing ? undefined : onSaid} />
          <PlumbLayer>
            {m ? (
              <div style={{ position: 'absolute', inset: 0, opacity: m.fading ? 0 : 1, transition: `opacity ${TIMING.fade}ms ease` }}>
                {/* every place's content box, where it is now: plumber's 1px outline with its halo */}
                {m.boxes.map((b, i) => {
                  const at = r?.now?.[i] ?? b;
                  return <span key={i} style={{ position: 'absolute', left: at.x, top: at.y, width: at.w, height: at.h, borderRadius: 3,
                    boxShadow: `0 0 0 ${1 / k}px ${hues[toneOf(i)][0]}, 0 0 0 ${2 / k}px var(--pl-halo)`, transition: 'box-shadow 450ms ease', animation: 'film-pop 260ms ease both' }} />;
                })}
                {/* where each pushed place belonged: a dashed guide; the ground it was pushed across, tinted */}
                {/* only where something moved: a guide on an edge that stayed put would only double its outline */}
                {r?.pushed?.filter((p) => p.x1 - p.x0 > 0.5).map((p, i) => (
                  <span key={i}>
                    <span style={{ position: 'absolute', left: p.x0, top: p.y - 6, height: p.h + 12, width: 0, borderLeft: `${1 / k}px dashed var(--pl-sky)` }} />
                    {p.x1 - p.x0 > 0.5 ? <span style={{ position: 'absolute', left: p.x0, top: p.y, height: p.h, width: p.x1 - p.x0, background: 'var(--pl-off-bg)', boxShadow: `inset ${-1 / k}px 0 0 var(--pl-coral)` }} /> : null}
                  </span>
                ))}
                {/* a value only where the pointer is: the size, counting, under the place */}
                {r ? <Pill key={`s${m.lead}${tone}`} x={r.box.x + r.box.w / 2} y={r.box.y + r.box.h + PILL.gap / k} k={k} tone={toneOf(m.lead) === 'sky' ? 'on' : toneOf(m.lead)} icon={r.size.icon} icons={icons}>{r.size.pre}<Count from={r.size.from} to={r.size.to} /></Pill> : null}
                {/* the cause, as plumber names it: its own pills, above the place */}
                {/* side by side in one row, so they never climb onto the words above */}
                {r && m.cause ? (
                  <span style={{ position: 'absolute', left: r.box.x + r.box.w / 2, top: r.box.y - PILL.gap / k, display: 'flex', gap: 4, transform: `translate(-50%, -100%) scale(${1 / k})`, transformOrigin: '50% 100%' }}>
                    {r.tags.map((g, i) => (
                      <Pill key={`t${i}${tone}`} flow k={k} tone={tagTone} icon={g.icon} icons={icons}>
                        {g.swatch ? <span style={{ width: 9, height: 9, borderRadius: 3, background: g.swatch, boxShadow: '0 0 0 1px rgb(0 0 0 / 0.12)' }} /> : null}
                        {g.pre}{g.text ?? <Count from={g.from} to={g.to} />}
                      </Pill>
                    ))}
                  </span>
                ) : null}
              </div>
            ) : null}
          </PlumbLayer>
        </div>
      </div>
      <div ref={sw} className="relative z-10 flex flex-col items-center">
        {change && spec.code ? <PlumbLayer><Change code={spec.code} fixed={change >= 2} done={change === 3} /></PlumbLayer> : null}
        <TechniqueSwitch names={names} fixed={side === 'fixed'} ready={!playing} onBack={() => setSide('broken')} onFix={() => setSide('fixed')} />
      </div>
      {chrome ? (!playing ? <button type="button" onClick={() => setRun((x) => x + 1)} style={{ marginTop: -28, border: 0, background: 'none', cursor: 'pointer', font: 'var(--pl-round-w2, 700) 13px/20px var(--pl-round)', color: 'var(--pl-ink-2)' }}>Replay</button> : <span style={{ marginTop: -28, height: 20 }} />) : null}
      <canvas ref={fx} aria-hidden="true" className="pointer-events-none absolute z-30" style={{ left: -160, top: -80, width: 'calc(100% + 320px)', height: 'calc(100% + 160px)' }} />
      {ptr ? (
        <svg aria-hidden="true" width="18" height="22" viewBox="0 0 18 22" style={{ position: 'absolute', left: 0, top: 0, zIndex: 40, pointerEvents: 'none',
          transform: `translate(${ptr.x - 3}px, ${ptr.y - 2}px) scale(${ptr.down ? 0.86 : 1})`, opacity: ptr.gone ? 0 : 1,
          transition: 'transform 420ms cubic-bezier(0.3, 0, 0.2, 1), opacity 250ms ease', filter: 'drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.25))' }}>
          <path d="M2 1.5v16.2l4.1-3.9 2.6 6.2 3-1.3-2.6-6h5.7z" fill="#111" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
}
