/* ─────────────────────────────────────────────────────────
 * THE INSIGHTS (STORY.md, the lead; the owner, 2026-11-04: "we look for far more patterns, design engineering
 * patterns"). Plumber knows 77 principles in 7 families (docs/craft/rules.md); the showcase stages 48 of them. Nine are
 * shown here, each borrowed from the showcase's example (overlay/showcase/src/principles/examples.jsx) and redrawn in
 * the homepage's foundations: a small real scene, wrong in exactly the principle's way.
 *
 * Every card plays the showcase's moment in place, never moving the scene (the owner, 2026-11-13: a scripted camera
 * "shifts the layout and it's confused what is happening"): guides draw on the measured edges in the overlay's own
 * language (a haloed line, space hatched) with one pill carrying the measured number; the fix glides in while the
 * pill counts to its right value and a check lands; then the guides lift. The number is read from the scene every
 * frame, so it moves because the scene moves. Motion tricks borrowed from transitions.dev: its ease
 * (0.22, 1, 0.36, 1), blurred text swaps, stroke-drawn lines, a blurred pop-in, an overshooting switch thumb.
 *
 * STORYBOARD (each card on its own clock, staggered; the loop holds while pointed at)
 *      0ms   the scene as written, alive
 *   1600ms   guides draw in (300ms), the pill pops in 40ms after
 *   1900ms   hold on what's wrong
 *   3000ms   the fix glides in; the pill counts to the right value, coral to mint, then its check
 *   4500ms   guides and pill lift (300ms, blurred)
 *   5700ms   alive again, fixed
 *   7600ms   back to the mistake: the fix glides back
 *   9000ms   again
 * The switch is direct (interaction principle 26b): the scene and its measure change at once, the card holds what was
 * chosen, and Replay hands it back to the tour.
 * Reduced motion: no camera, no guides; every card shows Fixed, and the switch still works.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './insights.css';
import { toyOf } from '../../../overlay/src/toys.js'; // each principle wears its property's toy
import { burst } from '../../../overlay/src/burst.js'; // a fix landing, in pieces of the visual language

const FAMILIES = [['Interaction feel', 16], ['Typography', 15], ['Colour and light', 15], ['Layout and platform', 13], ['Alignment and balance', 6], ['Spacing and rhythm', 6], ['Rendering and pixels', 6]];
// slow on purpose (the owner: "let the user feel it ... bring things slowly, take them out slowly"): the problem is named
// for 1.8s, the fix takes 1.6s on the scene, it holds a second, then the marks take 0.8s to leave
const T = { cameraIn: 600, marks: 1600, fix: 3400, marksOut: 6000, cameraOut: 6000, alive: 7000, back: 9000, loop: 10500 };
const STEP = { rest: 0, camera: 1, marks: 2, fix: 3, out: 4, home: 5 };
const FEEL = 2000;
const TURN_MS = FEEL + (7000 - 600) + 700; // one example's whole review, for its dot to fill over // the broken scene alone, before anything is marked: a moment to feel that something's off

export function Insights() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const grid = useRef(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.15 });
    io.observe(grid.current);
    return () => io.disconnect();
  }, [reduced]);

  // a carousel, after Apple's highlights: one example at a time, large, the next peeking in; it plays its fix, then
  // the track moves on. Dots say where you are (the current one fills as its review plays); play/pause holds it. A
  // press on an example pauses the carousel there, so what you chose stays; play hands it back.
  const [turn, setTurn] = useState(0), [playing, setPlaying] = useState(true);
  const track = useRef(null);
  const next = () => setTurn(t => (t + 1) % CARDS.length);
  const place = () => { const t = track.current, el = t?.children[turn]; if (el) t.style.transform = `translateX(${-el.offsetLeft}px)`; };
  useLayoutEffect(place, [turn]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { addEventListener('resize', place); return () => removeEventListener('resize', place); }, [turn]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="ins-x" aria-labelledby="insights-title">
      <header className="ins-x-head">
        <span className="ins-x-eyebrow">77 patterns</span>
        <h2 id="insights-title" className="title">It sees what design engineers see.</h2>
        <p className="lead">Plumber checks your running app for the details experienced people catch and most interfaces ship anyway. <b>It marks them on the page and, where it can, writes the fix.</b> Nine of the 77:</p>
        <ul className="ins-x-families" aria-label="The seven families">
          {FAMILIES.map(([name, n]) => <li key={name}>{name} <span className="tabular">{n}</span></li>)}
        </ul>
      </header>
      <div ref={grid} className="ins-x-viewport" data-live={live && !reduced}>
        <div ref={track} className="ins-x-track">
          {CARDS.map((x, i) => (
            <Card key={x.n} card={x} live={live} reduced={reduced} active={i === turn} playing={playing} turn={live && playing && turn === i}
              onDone={next} onHold={() => setPlaying(false)} onPick={() => setTurn(i)} onReplay={() => setPlaying(true)} />
          ))}
        </div>
      </div>
      <div className="ins-x-controls">
        <div className="ins-x-dots" role="tablist" aria-label="Examples">
          {CARDS.map((x, i) => (
            <button key={x.n} type="button" role="tab" aria-selected={i === turn} aria-label={x.title} data-on={i === turn} onClick={() => setTurn(i)}>
              {i === turn && <i key={`${turn}-${playing}`} className="ins-x-fill" data-playing={live && playing} style={{ '--turn': `${TURN_MS}ms` }} />}
            </button>
          ))}
        </div>
        <button type="button" className="ins-x-play" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause' : 'Play'}>
          <svg viewBox="0 0 16 16" aria-hidden="true">{playing ? <path d="M5.5 3.5v9M10.5 3.5v9" /> : <path d="M5 3.5v9l7.5-4.5z" />}</svg>
        </button>
      </div>
    </section>
  );
}

/* One insight and its moment. */
function Card({ card, live, reduced, active, playing, turn, onDone, onHold, onPick, onReplay }) {
  const stage = useRef(null), scene = useRef(null);
  const [fixed, setFixed] = useState(reduced);
  const [step, setStep] = useState(STEP.rest);
  const [cam, setCam] = useState(null);        // the camera's transform, or null at rest
  const [marks, setMarks] = useState(null);    // the guides and the pill, in the stage's pixels
  const [held, setHeld] = useState(false), [paused, setPaused] = useState(false);
  const timers = useRef([]), shown = useRef(null), again = useRef(false), lift = useRef([]);
  // each scene is scaled to fill its tile: its own drawn size (all its parts, at scale 1) against the stage, with a
  // little margin, up to 130%; the big tile fills its own
  const [fit, setFit] = useState(1);
  useLayoutEffect(() => {
    const el = stage.current;
    // layout boxes (offsets), which ignore the scene's current scale and a menu's closed scale of 0
    const measure = () => {
      const sc = el.querySelector('.sc'); if (!sc) return;
      let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
      for (const c of sc.children) { if (!c.offsetWidth) continue; l = Math.min(l, c.offsetLeft); t = Math.min(t, c.offsetTop); r = Math.max(r, c.offsetLeft + c.offsetWidth); b = Math.max(b, c.offsetTop + c.offsetHeight); }
      const w = r - l, h = b - t;
      if (w > 0 && h > 0) setFit(Math.min(2.2, (el.clientWidth - 80) / w, (el.clientHeight - 56) / h)); // a margin wide enough for a tab going bold
    };
    const ro = new ResizeObserver(measure); ro.observe(el);
    const sc = el.querySelector('.sc'); if (sc) for (const c of sc.children) ro.observe(c);
    requestAnimationFrame(measure); document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const at = (ms, fn) => timers.current.push(setTimeout(fn, ms));



  // the moment, in place: guides, the fix, guides out
  const moment = (base = 0) => {
    at(base, () => setStep(STEP.camera)); // no camera: the scene stays where it is; the guides and the pill explain it in place
    at(base + T.marks - T.cameraIn, () => setStep(STEP.marks));
    at(base + T.fix - T.cameraIn, () => { setFixed(true); setStep(STEP.fix); });
    at(base + T.marksOut - T.cameraIn, () => setStep(STEP.out));
    at(base + T.alive - T.cameraIn, () => setStep(STEP.home));
  };

  // its turn: back to the mistake, the moment in place, a beat holding the fix, then the next card's turn. A card you
  // pressed hands its turn straight on; pointing at the card on turn holds it, and leaving starts its turn again.
  useEffect(() => {
    clear();
    if (reduced || !turn) return;
    if (held) return;
    if (paused) return;
    setFixed(false); setStep(STEP.rest); setCam(null); setMarks(null); shown.current = null;
    moment(FEEL);
    at(FEEL + (T.alive - T.cameraIn) + 700, onDone);
    return clear;
  }, [turn, held, paused, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  // the fix lands: its check bursts into pieces of the visual language
  useEffect(() => {
    if (step !== STEP.fix || !fixed || reduced) return;
    const id = setTimeout(() => {
      const el = stage.current?.querySelector('.ins-check[data-on="true"]');
      if (!el) return;
      const r = el.getBoundingClientRect();
      burst(document.body, r.left + r.width / 2, r.top + r.height / 2, { pieces: 26 });
    }, 1700);
    return () => clearTimeout(id);
  }, [step, fixed]); // eslint-disable-line react-hooks/exhaustive-deps

  // while the guides are up, they're read from the scene every frame something moves (the fix gliding, the number
  // settling, a scene that is motion itself); once still, they stop being read, so idle cards cost nothing
  useLayoutEffect(() => {
    if (step < STEP.marks || step > STEP.out) { if (step === STEP.rest || step === STEP.home) { setMarks(null); shown.current = null; } return; }
    let raf = 0;
    const until = performance.now() + 1900;
    const read = () => {
      const s = stage.current.getBoundingClientRect(), m = card.measure(scene.current, fixed);
      const k = cam?.k ?? 1;
      // the pill's number eases toward what's measured, so a value that jumps in the scene still counts
      shown.current = shown.current == null ? m.value : shown.current + (m.value - shown.current) * 0.06;
      if (Math.abs(shown.current - m.value) < 0.005) shown.current = m.value;
      setMarks({ ...m, value: shown.current, s, k, focus: undefined, box: m.focus.getBoundingClientRect() });
      if (card.moving || performance.now() < until || shown.current !== m.value) raf = requestAnimationFrame(read);
    };
    read();
    return () => cancelAnimationFrame(raf);
  }, [step, fixed, cam]); // eslint-disable-line react-hooks/exhaustive-deps

  // the switch is a direct control, not a cue for the tour: a press stops this card's tour, and the scene changes at
  // once (the fix glides in, or the mistake glides back), with its guides and measured pill up the moment you press,
  // the number counting to the new value; no camera. The card holds what you chose until Replay hands it back.
  const choose = wantFixed => {
    clear(); setHeld(true); setCam(null); onHold?.();
    setFixed(wantFixed);
    if (reduced) return;
    // the marks are up only while the change is happening; then the card is a normal card again
    setStep(wantFixed ? STEP.fix : STEP.marks);
    // its own timers: the tour's are cleared the moment a press holds the card
    lift.current.forEach(clearTimeout);
    lift.current = [setTimeout(() => setStep(STEP.out), 3200), setTimeout(() => setStep(STEP.home), 4300)];
  };
  useEffect(() => () => lift.current.forEach(clearTimeout), []);
  // play hands a held example back to the tour, from the start of its review
  useEffect(() => { if (playing && held) { lift.current.forEach(clearTimeout); setStep(STEP.rest); setMarks(null); shown.current = null; setHeld(false); } }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
  const replay = () => { onReplay?.(); lift.current.forEach(clearTimeout); again.current = true; setStep(STEP.rest); setMarks(null); shown.current = null; setHeld(false); };

  const { Scene } = card;
  const showMarks = marks && step >= STEP.marks && step <= STEP.out;
  return (
    <article className="ins-card" data-hue={card.hue} data-active={active || undefined} onClick={active ? undefined : onPick} data-turn={turn || held || undefined} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} aria-label={`${card.n}. ${card.title}`}>
      <div ref={stage} className="ins-stage" data-inspect={showMarks || undefined} style={{ '--fit': fit }}>
        <div ref={scene} className="ins-cam" style={cam ? { transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.k})` } : undefined} data-moving={!!cam}>
          <Scene fixed={fixed} live={live && !reduced && (turn || held) && (card.moving || step === STEP.rest || step === STEP.home)} />
        </div>
        {showMarks && <Marks marks={marks} fixed={fixed} out={step === STEP.out} card={card} />}
      </div>
      {/* the stage holds only the example; its controls sit with its words */}
      <div className="ins-foot">
        <span className="ins-n tabular">{card.n}</span>
        <span className="ins-text"><b>{card.title}</b><span>{card.why}</span></span>
        <span className="ins-ctl">
        {held && !reduced && <button type="button" className="ins-replay" onClick={replay} aria-label="Play the tour again"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8a4.5 4.5 0 1 0 1.3-3.2M3.5 2.8v2.4h2.4" /></svg></button>}
        <div className="ins-switch" role="group" aria-label="Show it" data-fixed={fixed}>
          <span className="ins-thumb" aria-hidden="true" />
          {['Broken', 'Fixed'].map((label, k) => (
            <button key={label} type="button" aria-pressed={fixed === !!k} onClick={() => choose(!!k)}>{label}</button>
          ))}
          </div>
        </span>
      </div>
    </article>
  );
}

/* The guides and the pill, drawn over the scene in the stage's own pixels (so they stay crisp through the camera). */
// a rounded rectangle as a path, for cutting one box out of another
const rr = (x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`; };
function Marks({ marks, fixed, out, card }) {
  const { s, lines = [], arcs = [], rects = [], dots = [], frames = [], value, box } = marks;
  const done = fixed && card.done(value);
  const rel = (x, y) => [x - s.left, y - s.top];
  const [px, py] = rel(box.left + box.width / 2, card.pill === 'below' ? box.bottom : box.top);
  return (
    <div className="ins-marks" data-out={out} data-on={done} aria-hidden="true">
      <svg width={s.width} height={s.height}>
        {frames.length > 0 && <defs><pattern id={`ins-pad-${card.n}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" style={{ fill: 'color-mix(in oklab, var(--pl-mark-padding) 14%, transparent)' }} /><line x1="0" y1="0" x2="0" y2="5" style={{ stroke: 'var(--pl-mark-padding)', strokeWidth: 1.5, opacity: 0.75 }} /></pattern></defs>}
        {/* padding, the way the overlay marks it: the band between a box's edge and what it holds, hatched */}
        {frames.map(([ox, oy, ow, oh, or, ix, iy, iw, ih, ir], i) => { const [a, b] = rel(ox, oy), [c, d] = rel(ix, iy); return <path key={`f${i}`} className="ins-pad" fillRule="evenodd" d={rr(a, b, ow, oh, or) + rr(c, d, iw, ih, ir)} style={{ fill: `url(#ins-pad-${card.n})` }} />; })}
        {card.hatch && <defs><pattern id={`ins-hatch-${card.n}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" style={{ stroke: 'var(--mk)', strokeWidth: 1.5, opacity: 0.6 }} /></pattern></defs>}
        {lines.map(([x1, y1, x2, y2], i) => { const [a, b] = rel(x1, y1), [c, d] = rel(x2, y2); return <line key={`l${i}`} className="ins-guide" x1={a} y1={b} x2={c} y2={d} pathLength="1" style={{ animationDelay: `${i * 40}ms` }} />; })}
        {rects.map(([x, y, w, h], i) => { const [a, b] = rel(x, y); return <rect key={`r${i}`} className={`ins-guide${card.hatch ? ' ins-hatch' : ''}`} x={a} y={b} width={w} height={h} rx={3} pathLength="1" style={card.hatch ? { '--hatch': `url(#ins-hatch-${card.n})` } : undefined} />; })}
        {arcs.map(([x, y, r], i) => { const [a, b] = rel(x, y); return <path key={`a${i}`} className="ins-guide" d={`M${a} ${b + r} A ${r} ${r} 0 0 1 ${a + r} ${b}`} pathLength="1" />; })}
        {dots.map(([x, y], i) => { const [a, b] = rel(x, y); return <g key={`d${i}`} className="ins-cross"><line x1={a - 7} y1={b} x2={a + 7} y2={b} /><line x1={a} y1={b - 7} x2={a} y2={b + 7} /></g>; })}
      </svg>
      <span className="ins-pill" style={{ left: px, top: card.pill === 'below' ? py + 12 : Math.max(8, py - 34) }}>
        <Digits text={card.fmt(value)} />
        <span className="ins-check" data-on={done}><svg viewBox="0 0 16 16"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg></span>
      </span>
    </div>
  );
}

/* A number that changes a character at a time: each changed character flips in with a blur (transitions.dev's digit
 * flip), the unchanged ones stay put. */
function Digits({ text }) {
  return <span className="ins-digits tabular">{[...text].map((ch, i) => <span key={`${i}${ch}`} className="ins-digit">{ch === ' ' ? '\u00a0' : ch}</span>)}</span>;
}

/* ── colour, for the two colour principles: sRGB ↔ OKLab, and a colour's chroma ── */
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function oklab([r, g, b]) {
  [r, g, b] = [r, g, b].map(v => lin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const chroma = rgb => { const [, a, b] = oklab(rgb); return Math.hypot(a, b); };
const rgbOf = str => (str.match(/rgba?\(([^)]+)\)/)?.[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).map(Number)) ?? [0, 0, 0];
// a computed colour's chroma: browsers hand back oklch() as it was written, rgb() otherwise
const chromaOf = str => { const o = str.match(/oklch\(\s*[\d.]+%?\s+([\d.]+)/); return o ? +o[1] : chroma(rgbOf(str)); };
const COLD = [0x2f, 0x6f, 0xe4], WARM = [0xf5, 0xa5, 0x24];
const MID_SRGB = chroma(COLD.map((c, i) => (c + WARM[i]) / 2));
// mixed in OKLCH, the chroma is carried round the hue wheel: halfway, it's the average of the two ends' chroma
const MID_OKLCH = (chroma(COLD) + chroma(WARM)) / 2;

/* ── the scenes, each wrong in exactly one way, each with its measure ── */
const R = (el) => el.getBoundingClientRect();

// #2 a video's play button: the triangle centred by its box sits left of centre
function Play({ fixed }) {
  return (
    <div className="sc sc-play" data-fixed={fixed}>
      <div className="sc-video">
        <span className="sc-vid-title">Walkthrough</span>
        <span className="sc-play-btn"><svg viewBox="0 0 24 24"><path d="M7 4.5v15L19 12z" /></svg></span>
        <span className="sc-vid-bar"><small>1:24</small><i><b /></i><small>4:10</small></span>
      </div>
    </div>
  );
}
Play.measure = (root) => {
  const btn = root.querySelector('.sc-play-btn'), svg = root.querySelector('.sc-play-btn svg'), b = R(btn), v = R(svg);
  // the triangle spans x 7–19 of its 24 (box centre 13) and its weight sits at x 11: centred by box, it reads left
  const cx = b.left + b.width / 2, wx = v.left + v.width * (11 / 24), k = b.width / 58;
  return { focus: btn, value: Math.abs(cx - wx) / k, lines: [[cx, b.top - 10, cx, b.bottom + 10], [wx, v.top - 4, wx, v.bottom + 4]] };
};

// #8 a music player's album tile: the cover's corner as round as the tile's pinches; drawn with real detail (cover art,
// the track, a progress bar), on a paper canvas, not a flat colour
function Album({ fixed }) {
  return (
    <div className="sc sc-album" data-fixed={fixed}>
      <div className="sc-tile">
        <div className="sc-cover" role="img" aria-label="Album cover: a warm orange orb on blue" />
        <div className="sc-meta">
          <div className="sc-track"><span><b>Low Tide</b><small>Mara Ellis · Shoreline</small></span><svg className="sc-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg></div>
          <div className="sc-prog"><i /></div>
          <div className="sc-times"><span>1:24</span><span>3:42</span></div>
        </div>
      </div>
    </div>
  );
}
Album.measure = (root) => {
  const tile = root.querySelector('.sc-tile'), cover = root.querySelector('.sc-cover'), t = R(tile), c = R(cover), k = t.width / tile.offsetWidth;
  const r = parseFloat(getComputedStyle(cover).borderTopLeftRadius), outer = parseFloat(getComputedStyle(tile).borderTopLeftRadius), pad = parseFloat(getComputedStyle(tile).paddingLeft) * k;
  return { focus: tile, value: r, arcs: [[t.left, t.top, outer * k], [c.left, c.top, r * k]],
    frames: [[c.left - pad, c.top - pad, c.width + 2 * pad, c.height + 2 * pad, outer * k, c.left, c.top, c.width, c.height, r * k]] };
};

// #16 a time tracker: the day's entries, in proportional or tabular figures; their colons don't line up
function Timer({ fixed, live }) {
  const [t, setT] = useState(6157);
  useEffect(() => { if (!live) return; const id = setInterval(() => setT(v => v + 1), 1000); return () => clearInterval(id); }, [live]);
  const clock = s => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className="sc sc-timer" data-fixed={fixed}>
      <div className="sc-clock"><small><i className="sc-rec" />Moodboard review</small><b>{clock(t)}</b></div>
      <ul><li><span><i className="sc-proj" style={{ '--c': 'var(--pl-lilac)' }} />Wireframes</span><b>{clock(7578)}</b></li><li><span><i className="sc-proj" style={{ '--c': 'var(--pl-sky)' }} />Kickoff call</span><b>{clock(2885)}</b></li></ul>
    </div>
  );
}
Timer.measure = (root) => {
  const list = root.querySelector('.sc-timer ul'), k = R(list).width / list.offsetWidth;
  const colons = [...root.querySelectorAll('.sc-timer li b')].map(b => { const r = document.createRange(), i = b.textContent.lastIndexOf(':'); r.setStart(b.firstChild, i); r.setEnd(b.firstChild, i + 1); const q = r.getBoundingClientRect(); return [q.left + q.width / 2, q.top, q.bottom]; });
  const xs = colons.map(c => c[0]);
  return { focus: list, value: (Math.max(...xs) - Math.min(...xs)) / k, lines: colons.map(([x, t, b]) => [x, t - 3, x, b + 3]) };
};

// #18 a news front's headline: wrapped where it ran out of room, or balanced
function Headline({ fixed }) {
  return (
    <div className="sc sc-news" data-fixed={fixed}>
      <div className="sc-news-card">
        <div className="sc-news-photo" role="img" aria-label="A white building with blue glass" />
        <small>Business</small>
        <h4>Northwind closes its seed round to build calmer team tools</h4>
        <span className="sc-byline"><i>M</i>Mara Ellis · 4 min read</span>
      </div>
    </div>
  );
}
Headline.measure = (root) => {
  const h = root.querySelector('.sc-news h4'), text = h.firstChild, words = h.textContent.split(' '), r = document.createRange();
  const boxes = []; let i = 0;
  for (const w of words) { r.setStart(text, i); r.setEnd(text, i + w.length); boxes.push(r.getBoundingClientRect()); i += w.length + 1; }
  const rows = [];
  for (const b of boxes) { const row = rows.find(x => Math.abs(x.top - b.top) < 4); row ? (row.right = Math.max(row.right, b.right), row.n++) : rows.push({ top: b.top, bottom: b.bottom, left: b.left, right: b.right, n: 1 }); }
  return { focus: h, value: rows.at(-1).n, lines: rows.map(x => [x.left, x.bottom + 2, x.right, x.bottom + 2]) };
};

// #21 a recipe card on its saffron page: a grey shadow, or one tinted by the ground it falls on
function Shadow({ fixed }) {
  return (
    <div className="sc sc-shadow" data-fixed={fixed}>
      <div className="sc-recipe"><small>Dessert · 35 min</small><b>Raspberry pavlova</b><span>Meringue · cream · raspberries</span><span className="sc-rmeta"><i>4 servings</i><i>Easy</i></span></div>
    </div>
  );
}
Shadow.measure = (root) => {
  const card = root.querySelector('.sc-recipe'), c = R(card), layers = getComputedStyle(card).boxShadow.split(/,(?![^(]*\))/);
  return { focus: card, value: chromaOf(layers.at(-1)), rects: [[c.left - 6, c.bottom - 8, c.width + 12, 28]] };
};

// #55 a forecast's temperature bars, cold blue to warm amber, mixed in sRGB or OKLCH
function Forecast({ fixed }) {
  const days = [['Mon', 10, 70], ['Tue', 22, 88], ['Wed', 4, 62], ['Thu', 16, 80]];
  return (
    <div className="sc sc-forecast" data-fixed={fixed}>
      <span className="sc-fc-head"><b>Lisbon</b><small>This week</small></span>
      {days.map(([d, a, b]) => <div key={d} className="sc-day"><span>{d}</span><small>{Math.round(8 + a / 5)}°</small><i><b style={{ left: `${a}%`, right: `${100 - b}%` }}><em /></b></i><small>{Math.round(8 + b / 5)}°</small></div>)}
    </div>
  );
}
Forecast.measure = (root) => {
  const bar = root.querySelectorAll('.sc-day b')[1], b = R(bar), ok = parseFloat(getComputedStyle(bar.firstChild).opacity); // the OKLCH bar fades over the sRGB one
  const mid = b.left + b.width / 2;
  return { focus: root.querySelector('.sc-forecast'), value: MID_SRGB + (MID_OKLCH - MID_SRGB) * ok, lines: [[mid, b.top - 12, mid, b.bottom + 12]] };
};

// #39 a moodboard pin: a pale glaze photo on a pale card, with or without its faint inner outline
function Photo({ fixed }) {
  return (
    <div className="sc sc-photo" data-fixed={fixed}>
      <div className="sc-pin"><div className="sc-glaze" role="img" aria-label="A pale white vase on a white table" /><span className="sc-pin-meta"><b>Celadon test 4</b><small>cone 6 · reduction</small><span className="sc-pin-tags"><i>glaze</i><i>white</i></span></span></div>
    </div>
  );
}
Photo.measure = (root) => {
  const g = root.querySelector('.sc-glaze'), r = R(g);
  return { focus: g, value: parseFloat(getComputedStyle(g, '::after').opacity), rects: [[r.left - 4, r.top - 4, r.width + 8, r.height + 8]] };
};

// #42 a project's view tabs: the pointed one goes semibold; without its bold width kept, every tab after it jumps
function Tabs({ fixed, live }) {
  const tabs = ['Overview', 'Board', 'Timeline', 'Files'];
  const [hover, setHover] = useState(1);
  useEffect(() => { if (!live) return; const id = setInterval(() => setHover(h => (h === 1 ? -1 : 1)), 700); return () => clearInterval(id); }, [live]);
  return (
    <div className="sc sc-tabs" data-fixed={fixed}>
      <nav>{tabs.map((t, i) => <span key={t} data-label={t} data-hover={i === hover}>{t}</span>)}</nav>
      <div className="sc-tabs-body">{[['Homepage hero', 'lilac', 'M'], ['Pricing copy', 'mint', 'J'], ['Logo pass', 'pink', 'K']].map(([t, c, a]) => <span key={t} className="sc-task" style={{ '--c': `var(--pl-${c})` }}><i />{t}<b>{a}</b></span>)}</div>
    </div>
  );
}
// how far the tabs after "Board" move when it goes bold: its width at 600 minus at 400. Measured once, while the
// browser is idle after the fonts load, never in the middle of a moment (a first canvas costs a frame or more).
let BOLD = 0;
const measureBold = () => { const c = document.createElement('canvas').getContext('2d'), f = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'Inter'; c.font = `600 13px ${f}`; const w6 = c.measureText('Board').width; c.font = `400 13px ${f}`; BOLD = w6 - c.measureText('Board').width; };
if (typeof document !== 'undefined') document.fonts.ready.then(() => (window.requestIdleCallback ?? setTimeout)(measureBold));
Tabs.measure = (root) => {
  const spans = root.querySelectorAll('.sc-tabs nav span'), nav = root.querySelector('.sc-tabs nav'), k = R(nav).width / nav.offsetWidth;
  const kept = root.querySelector('.sc-tabs').dataset.fixed === 'true';
  return { focus: nav, value: kept ? 0 : BOLD, lines: [2, 3].map(i => { const r = R(spans[i]); return [r.left, r.top - 8, r.left, r.bottom + 8]; }) };
};

// #63 a Share menu opening from its button: from scale 0 at its centre, or from almost-there at the trigger
function Menu({ fixed, live }) {
  const [open, setOpen] = useState(true);
  useEffect(() => { if (!live) return; const id = setInterval(() => setOpen(o => !o), 1100); return () => clearInterval(id); }, [live]);
  return (
    <div className="sc sc-menu" data-fixed={fixed} data-open={open}>
      <span className="sc-doc"><b>Q4 plan</b><span className="sc-faces"><i style={{ '--c': 'var(--pl-sky)' }}>A</i><i style={{ '--c': 'var(--pl-mint)' }}>J</i></span><span className="sc-share">Share</span></span>
      <div className="sc-pop">{[['link', 'Copy link'], ['avatar', 'Invite people'], ['upload', 'Export PDF']].map(([t, l]) => <span key={l}><i dangerouslySetInnerHTML={{ __html: toyOf(t) }} />{l}</span>)}</div>
    </div>
  );
}
Menu.measure = (root) => {
  const pop = root.querySelector('.sc-pop'), share = root.querySelector('.sc-share'), p = R(pop), s = R(share), kept = root.querySelector('.sc-menu').dataset.fixed === 'true';
  // where it grows from: its own centre, or the top edge under the trigger
  const ox = kept ? p.right - 22 : p.left + p.width / 2, oy = kept ? p.top : p.top + p.height / 2;
  return { focus: root.querySelector('.sc-menu'), value: kept ? 0.96 : 0, dots: [[ox, oy]], lines: [[s.left + s.width / 2, s.bottom, ox, oy]] };
};

const CARDS = [
  { n: 2, feel: 'Look at the play button. Does the arrow sit in the middle?', after: 'Now it looks centred: it’s centred by its weight, not its box.', area: 'play', size: 'big', toy: 'alignment', hue: 'sky', title: 'Optical centre beats geometric centre', why: 'The eye centres by weight, not by the box.', states: ['Box centred', 'Weight centred'], Scene: Play, measure: Play.measure, fmt: v => (v < 0.1 ? '0px' : `${v.toFixed(1)}px`), done: v => v < 0.1 },
  { n: 8, feel: 'Look at the cover’s corner against the tile around it.', after: 'Now the corners run parallel, so the tile reads as one piece.', area: 'album', size: '', toy: 'corner', hue: 'pink', title: 'Nested radius = outer − padding', why: 'Equal radii pinch the corner; concentric ones don’t.', states: ['Same radius', 'Concentric'], Scene: Album, measure: Album.measure, fmt: v => `r ${Math.round(v)}`, done: v => Math.round(v) === 12 },
  { n: 16, feel: 'Watch the colons in the list. Do they line up?', after: 'Now every digit is the same width, so the times stack and stop jittering.', area: 'timer', size: '', toy: 'type', hue: 'mint', title: 'Tabular figures for numbers that change', why: 'Proportional digits jitter as they tick and never stack.', states: ['Proportional', 'Tabular'], Scene: Timer, measure: Timer.measure, pill: 'below', fmt: v => (v < 0.1 ? '0px' : `${v.toFixed(1)}px`), done: v => v < 0.1 },
  { n: 18, feel: 'Read the headline. Does the last line look finished?', after: 'Now the lines are balanced; no word hangs on its own.', area: 'news', size: '', toy: 'wrap', hue: 'lilac', title: 'No widows in headings', why: 'One word alone on the last line looks broken.', states: ['Widow', 'Balanced'], Scene: Headline, measure: Headline.measure, fmt: v => `${Math.round(v)} word${Math.round(v) === 1 ? '' : 's'}`, done: v => Math.round(v) >= 2 },
  { n: 21, feel: 'Look under the card. Does that shadow belong on pink?', after: 'Now the shadow takes the plate’s colour, so it looks lit, not dirty.', hatch: true, area: 'shadow', size: 'wide', toy: 'shadow', hue: 'pink', title: 'Shadows are tinted, not grey', why: 'A grey shadow on a coloured ground looks dirty.', states: ['Grey shadow', 'Tinted'], Scene: Shadow, measure: Shadow.measure, fmt: v => `C ${v.toFixed(2)}`, done: v => v > 0.06 },
  { n: 55, feel: 'Look at the middle of each bar.', after: 'Now the colour stays bright all the way across.', area: 'forecast', size: 'wide', toy: 'fill', hue: 'sky', title: 'Gradients mix in OKLCH', why: 'sRGB goes grey between two saturated colours.', states: ['sRGB', 'OKLCH'], Scene: Forecast, measure: Forecast.measure, fmt: v => `C ${v.toFixed(2)}`, done: v => v > MID_OKLCH - 0.005 },
  { n: 39, feel: 'Where does the photo end and the card begin?', after: 'Now the photo has an edge, so it doesn’t bleed into the card.', area: 'photo', size: '', toy: 'border', hue: 'butter', title: 'Images get an inner outline', why: 'A pale photo bleeds into a pale card without one.', states: ['No outline', 'Inner outline'], Scene: Photo, measure: Photo.measure, fmt: v => `${v.toFixed(1)}px edge`, done: v => v > 0.95 },
  { n: 42, feel: 'Watch the tabs after Board when it’s pointed at.', after: 'Now nothing moves when Board goes bold.', area: 'tabs', size: '', toy: 'weight', hue: 'lilac', title: 'Bold on hover must not shift layout', why: 'Weight changes width, and the whole row jumps.', states: ['Bold shifts', 'Width kept'], Scene: Tabs, measure: Tabs.measure, moving: true, fmt: v => (v < 0.1 ? '0px' : `${v.toFixed(1)}px`), done: v => v < 0.1 },
  { n: 63, feel: 'Watch where the menu comes from.', after: 'Now it grows out of the button, so you can see where it came from.', area: 'menu', size: 'wide', toy: 'motion', hue: 'mint', title: 'Never scale from 0', why: 'From 0 it appears from nowhere; from the trigger it grows out of it.', states: ['From 0', 'From the trigger'], Scene: Menu, measure: Menu.measure, moving: true, fmt: v => `scale ${v === 0 ? '0' : v.toFixed(2)}`, done: v => v > 0.9 },
];
