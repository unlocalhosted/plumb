/* ─────────────────────────────────────────────────────────
 * THE INSIGHTS (STORY.md, the lead; the owner, 2026-11-04: "we look for far more patterns, design engineering
 * patterns"). Plumber knows 77 principles in 7 families (docs/craft/rules.md); the showcase stages 48 of them. Nine are
 * shown here, each borrowed from the showcase's example (overlay/showcase/src/principles/examples.jsx) and redrawn in
 * the homepage's foundations: a small real scene, wrong in exactly the principle's way.
 *
 * Every card plays the showcase's moment (docs/craft/stage-brief.md), scaled to a card: the camera eases in on what
 * Plumber measures, guides draw on the measured edges with one pill carrying the measured number, the fix glides in
 * while the pill counts to its right value and a check lands, then the guides lift and the camera eases out. The
 * number is read from the scene every frame, so it moves because the scene moves. Motion tricks borrowed from
 * transitions.dev: its ease (0.22, 1, 0.36, 1), blurred text swaps, the copy-to-check swap, stroke-drawn lines, a
 * blurred pop-in, an overshooting switch thumb.
 *
 * STORYBOARD (each card on its own clock, staggered; the loop holds while pointed at)
 *      0ms   the scene as written, alive
 *    600ms   camera eases in on the subject (1000ms, slow start, slow finish)
 *   1600ms   guides draw in (300ms), the pill pops in 40ms after
 *   1900ms   hold on what's wrong
 *   3000ms   the fix glides in; the pill counts to the right value, coral to green, then its check
 *   4500ms   guides and pill lift (300ms, blurred)
 *   4800ms   camera eases out (900ms)
 *   5700ms   alive again, fixed
 *   7600ms   back to the mistake: no camera, the fix glides back
 *   9000ms   again
 * The switch: Fixed plays the moment from the camera; Broken glides back with no camera; either holds the card.
 * Reduced motion: no camera, no guides; every card shows Fixed, and the switch still works.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './insights.css';
import { toyOf } from '../../../overlay/src/toys.js'; // each principle wears its property's toy

const FAMILIES = [['Interaction feel', 16], ['Typography', 15], ['Colour and light', 15], ['Layout and platform', 13], ['Alignment and balance', 6], ['Spacing and rhythm', 6], ['Rendering and pixels', 6]];
const T = { cameraIn: 600, marks: 1600, fix: 3000, marksOut: 4500, cameraOut: 4800, alive: 5700, back: 7600, loop: 9000 };
const STEP = { rest: 0, camera: 1, marks: 2, fix: 3, out: 4, home: 5 };

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
      <div ref={grid} className="ins-x-grid">
        {CARDS.map((c, i) => <Card key={c.n} card={c} live={live} reduced={reduced} offset={i * 700} />)}
      </div>
    </section>
  );
}

/* One insight and its moment. */
function Card({ card, live, reduced, offset }) {
  const stage = useRef(null), scene = useRef(null);
  const [fixed, setFixed] = useState(reduced);
  const [step, setStep] = useState(STEP.rest);
  const [cam, setCam] = useState(null);        // the camera's transform, or null at rest
  const [marks, setMarks] = useState(null);    // the guides and the pill, in the stage's pixels
  const [held, setHeld] = useState(false), [paused, setPaused] = useState(false);
  const timers = useRef([]), shown = useRef(null);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const at = (ms, fn) => timers.current.push(setTimeout(fn, ms));

  // the camera: the subject fills most of the stage's width, centred, never closer than 1.9×
  const aim = () => {
    const s = stage.current.getBoundingClientRect(), f = card.measure(scene.current, false).focus.getBoundingClientRect();
    const fx = f.left - s.left + f.width / 2, fy = f.top - s.top + f.height / 2;
    const k = Math.max(1, Math.min(1.9, (s.width * 0.6) / f.width, (s.height * 0.5) / f.height));
    return { k, x: s.width / 2 - k * fx, y: s.height / 2 + 6 - k * fy };
  };

  // the moment, from the camera: in, guides, fix, guides out, camera out
  const moment = (base = 0) => {
    at(base, () => { setStep(STEP.camera); setCam(aim()); });
    at(base + T.marks - T.cameraIn, () => setStep(STEP.marks));
    at(base + T.fix - T.cameraIn, () => { setFixed(true); setStep(STEP.fix); });
    at(base + T.marksOut - T.cameraIn, () => setStep(STEP.out));
    at(base + T.cameraOut - T.cameraIn, () => setCam(null));
    at(base + T.alive - T.cameraIn, () => setStep(STEP.home));
  };

  useEffect(() => {
    clear();
    if (reduced || !live || held || paused) return;
    const loop = (first) => {
      setFixed(false); setStep(STEP.rest); setCam(null);
      moment(first + T.cameraIn);
      at(first + T.back, () => { setFixed(false); setStep(STEP.rest); });
      at(first + T.loop, () => loop(0));
    };
    loop(offset);
    return clear;
  }, [live, held, paused, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  // while the guides are up, they're read from the scene every frame something moves (the fix gliding, the number
  // settling, a scene that is motion itself); once still, they stop being read, so idle cards cost nothing
  useLayoutEffect(() => {
    if (step < STEP.marks || step > STEP.out) { if (step === STEP.rest || step === STEP.home) { setMarks(null); shown.current = null; } return; }
    let raf = 0;
    const until = performance.now() + 700;
    const read = () => {
      const s = stage.current.getBoundingClientRect(), m = card.measure(scene.current, fixed);
      const k = cam?.k ?? 1;
      // the pill's number eases toward what's measured, so a value that jumps in the scene still counts
      shown.current = shown.current == null ? m.value : shown.current + (m.value - shown.current) * 0.16;
      if (Math.abs(shown.current - m.value) < 0.005) shown.current = m.value;
      setMarks({ ...m, value: shown.current, s, k, focus: undefined, box: m.focus.getBoundingClientRect() });
      if (card.moving || performance.now() < until || shown.current !== m.value) raf = requestAnimationFrame(read);
    };
    read();
    return () => cancelAnimationFrame(raf);
  }, [step, fixed, cam]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = wantFixed => {
    clear(); setHeld(true);
    if (reduced) { setFixed(wantFixed); return; }
    if (wantFixed) { setFixed(false); setCam(null); setStep(STEP.rest); moment(0); }
    else { setStep(STEP.rest); setCam(null); setFixed(false); } // back to the mistake: no camera
  };

  const { Scene } = card;
  const showMarks = marks && step >= STEP.marks && step <= STEP.out;
  return (
    <article className="ins-card" data-hue={card.hue} data-size={card.size || undefined} style={{ gridArea: card.area }} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} aria-label={`${card.n}. ${card.title}`}>
      <div ref={stage} className="ins-stage">
        <div ref={scene} className="ins-cam" style={cam ? { transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.k})` } : undefined} data-moving={!!cam}>
          <Scene fixed={fixed} live={live && !reduced && (card.moving || step === STEP.rest || step === STEP.home)} />
        </div>
        {showMarks && <Marks marks={marks} fixed={fixed} out={step === STEP.out} card={card} />}
        <span className="ins-state" data-fixed={fixed} aria-hidden="true"><i className="ins-toy" dangerouslySetInnerHTML={{ __html: toyOf(card.toy) }} /><span key={fixed ? 'f' : 'b'} className="ins-swap">{card.states[fixed ? 1 : 0]}</span></span>
        <div className="ins-switch" role="group" aria-label="Show it" data-fixed={fixed}>
          <span className="ins-thumb" aria-hidden="true" />
          {['Broken', 'Fixed'].map((label, k) => (
            <button key={label} type="button" aria-pressed={fixed === !!k} onClick={() => choose(!!k)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="ins-foot">
        <span className="ins-n tabular">{card.n}</span>
        <span className="ins-text"><b>{card.title}</b><span>{card.why}</span></span>
      </div>
    </article>
  );
}

/* The guides and the pill, drawn over the scene in the stage's own pixels (so they stay crisp through the camera). */
function Marks({ marks, fixed, out, card }) {
  const { s, lines = [], arcs = [], rects = [], dots = [], value, box } = marks;
  const done = fixed && card.done(value);
  const rel = (x, y) => [x - s.left, y - s.top];
  const [px, py] = rel(box.left + box.width / 2, card.pill === 'below' ? box.bottom : box.top);
  return (
    <div className="ins-marks" data-out={out} data-on={done} aria-hidden="true">
      <svg width={s.width} height={s.height}>
        {lines.map(([x1, y1, x2, y2], i) => { const [a, b] = rel(x1, y1), [c, d] = rel(x2, y2); return <line key={`l${i}`} className="ins-guide" x1={a} y1={b} x2={c} y2={d} pathLength="1" style={{ animationDelay: `${i * 40}ms` }} />; })}
        {rects.map(([x, y, w, h], i) => { const [a, b] = rel(x, y); return <rect key={`r${i}`} className="ins-guide" x={a} y={b} width={w} height={h} rx={3} pathLength="1" />; })}
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
      <div className="sc-video"><span className="sc-play-btn"><svg viewBox="0 0 24 24"><path d="M7 4.5v15L19 12z" /></svg></span><small>Walkthrough · 1:24</small></div>
    </div>
  );
}
Play.measure = (root) => {
  const btn = root.querySelector('.sc-play-btn'), svg = root.querySelector('.sc-play-btn svg'), b = R(btn), v = R(svg);
  // the triangle spans x 7–19 of its 24 (box centre 13) and its weight sits at x 11: centred by box, it reads left
  const cx = b.left + b.width / 2, wx = v.left + v.width * (11 / 24), k = b.width / 58;
  return { focus: btn, value: Math.abs(cx - wx) / k, lines: [[cx, b.top - 10, cx, b.bottom + 10], [wx, v.top - 4, wx, v.bottom + 4]] };
};

// #8 an album tile: the cover's corner as round as the tile's pinches
function Album({ fixed }) {
  return (
    <div className="sc sc-album" data-fixed={fixed}>
      <div className="sc-tile"><div className="sc-cover" /><b>Low Tide</b><small>Mara Ellis · 9 songs</small></div>
    </div>
  );
}
Album.measure = (root) => {
  const tile = root.querySelector('.sc-tile'), cover = root.querySelector('.sc-cover'), t = R(tile), c = R(cover), k = t.width / tile.offsetWidth;
  const r = parseFloat(getComputedStyle(cover).borderTopLeftRadius), outer = parseFloat(getComputedStyle(tile).borderTopLeftRadius);
  return { focus: tile, value: r, arcs: [[t.left, t.top, outer * k], [c.left, c.top, r * k]] };
};

// #16 a time tracker: the day's entries, in proportional or tabular figures; their colons don't line up
function Timer({ fixed, live }) {
  const [t, setT] = useState(6157);
  useEffect(() => { if (!live) return; const id = setInterval(() => setT(v => v + 1), 1000); return () => clearInterval(id); }, [live]);
  const clock = s => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className="sc sc-timer" data-fixed={fixed}>
      <div className="sc-clock"><small>Moodboard review</small><b>{clock(t)}</b></div>
      <ul><li><span>Wireframes</span><b>{clock(7578)}</b></li><li><span>Kickoff call</span><b>{clock(2885)}</b></li></ul>
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
      <small>Business · 4 min read</small>
      <h4>Northwind closes its seed round to build calmer team tools</h4>
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
      <div className="sc-recipe"><small>Dinner · 35 min</small><b>Saffron risotto</b><span>Carnaroli rice · saffron · stock</span></div>
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
      {days.map(([d, a, b]) => <div key={d} className="sc-day"><span>{d}</span><i><b style={{ left: `${a}%`, right: `${100 - b}%` }}><em /></b></i></div>)}
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
      <div className="sc-pin"><div className="sc-glaze" /><b>Celadon test 4</b><small>cone 6 · reduction</small></div>
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
      <div className="sc-tabs-body" />
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
      <span className="sc-share">Share</span>
      <div className="sc-pop"><span>Copy link</span><span>Invite people</span><span>Export PDF</span></div>
    </div>
  );
}
Menu.measure = (root) => {
  const pop = root.querySelector('.sc-pop'), share = root.querySelector('.sc-share'), p = R(pop), s = R(share), kept = root.querySelector('.sc-menu').dataset.fixed === 'true';
  // where it grows from: its own centre, or the top edge under the trigger
  const ox = p.left + p.width / 2, oy = kept ? p.top : p.top + p.height / 2;
  return { focus: root.querySelector('.sc-menu'), value: kept ? 0.96 : 0, dots: [[ox, oy]], lines: [[s.left + s.width / 2, s.bottom, ox, oy]] };
};

const CARDS = [
  { n: 2, area: 'play', size: 'big', toy: 'alignment', hue: 'sky', title: 'Optical centre beats geometric centre', why: 'The eye centres by weight, not by the box.', states: ['Box centred', 'Weight centred'], Scene: Play, measure: Play.measure, fmt: v => (v < 0.1 ? '0px' : `${v.toFixed(1)}px`), done: v => v < 0.1 },
  { n: 8, area: 'album', size: '', toy: 'corner', hue: 'pink', title: 'Nested radius = outer − padding', why: 'Equal radii pinch the corner; concentric ones don’t.', states: ['Same radius', 'Concentric'], Scene: Album, measure: Album.measure, fmt: v => `r ${Math.round(v)}`, done: v => Math.round(v) === 12 },
  { n: 16, area: 'timer', size: '', toy: 'type', hue: 'mint', title: 'Tabular figures for numbers that change', why: 'Proportional digits jitter as they tick and never stack.', states: ['Proportional', 'Tabular'], Scene: Timer, measure: Timer.measure, pill: 'below', fmt: v => (v < 0.1 ? '0px' : `${v.toFixed(1)}px`), done: v => v < 0.1 },
  { n: 18, area: 'news', size: '', toy: 'wrap', hue: 'lilac', title: 'No widows in headings', why: 'One word alone on the last line looks broken.', states: ['Widow', 'Balanced'], Scene: Headline, measure: Headline.measure, fmt: v => `${Math.round(v)} word${Math.round(v) === 1 ? '' : 's'}`, done: v => Math.round(v) >= 2 },
  { n: 21, area: 'shadow', size: 'wide', toy: 'shadow', hue: 'pink', title: 'Shadows are tinted, not grey', why: 'A grey shadow on a coloured ground looks dirty.', states: ['Grey shadow', 'Tinted'], Scene: Shadow, measure: Shadow.measure, fmt: v => `C ${v.toFixed(2)}`, done: v => v > 0.06 },
  { n: 55, area: 'forecast', size: 'wide', toy: 'fill', hue: 'sky', title: 'Gradients mix in OKLCH', why: 'sRGB goes grey between two saturated colours.', states: ['sRGB', 'OKLCH'], Scene: Forecast, measure: Forecast.measure, fmt: v => `C ${v.toFixed(2)}`, done: v => v > MID_OKLCH - 0.005 },
  { n: 39, area: 'photo', size: '', toy: 'border', hue: 'butter', title: 'Images get an inner outline', why: 'A pale photo bleeds into a pale card without one.', states: ['No outline', 'Inner outline'], Scene: Photo, measure: Photo.measure, fmt: v => `${v.toFixed(1)}px edge`, done: v => v > 0.95 },
  { n: 42, area: 'tabs', size: '', toy: 'weight', hue: 'lilac', title: 'Bold on hover must not shift layout', why: 'Weight changes width, and the whole row jumps.', states: ['Bold shifts', 'Width kept'], Scene: Tabs, measure: Tabs.measure, moving: true, fmt: v => (v < 0.1 ? '0px' : `${v.toFixed(1)}px`), done: v => v < 0.1 },
  { n: 63, area: 'menu', size: 'wide', toy: 'motion', hue: 'mint', title: 'Never scale from 0', why: 'From 0 it appears from nowhere; from the trigger it grows out of it.', states: ['From 0', 'From the trigger'], Scene: Menu, measure: Menu.measure, moving: true, fmt: v => `scale ${v === 0 ? '0' : v.toFixed(2)}`, done: v => v > 0.9 },
];
