// One principle, one example (docs/craft/showcase.md, .claude/skills/craft-rule §3½), all of it plumber's: the example
// lives on the board, plumber reads it scoped, and the switch takes plumber's own fix in place with plumber's own
// glide (inplace.js: swapPreview and its GLIDE) during a camera moment, and puts it back the same way.
import { useEffect, useRef, useState } from 'react';
import { Taken } from './taken.js';
import { createPortal } from 'react-dom';
import { PRINCIPLES as ALL } from './catalogue.js';
import { MERGED, shown } from './curation.js';

// the principles the showcase stages; the others are reached by their number and say why they have no screen
const PRINCIPLES = ALL.filter((p) => shown(p.n));
import { EXAMPLES } from './examples.jsx';
import { Chevron } from '../icons.jsx';

const SCOPE = '[data-example]';
const plumber = async () => {
  for (let i = 0; i < 80 && !window.__plumb?.craft; i++) await new Promise((r) => setTimeout(r, 100));
  if (!window.__plumb?.craft) throw new Error('The React Plumber overlay isn’t on this page.');
  return window.__plumb;
};
// plumber's own in-place primitives, as the overlay serves them
const INPLACE = '/__plumb/src/inplace.js'; // served by the overlay at runtime, not bundled with the app
const inplace = () => import(/* @vite-ignore */ INPLACE);
// what plumber finds in the example, read without drawing (the blueprint then draws it, scoped)
const ask = async () => (await (await plumber()).craft({ scope: SCOPE, timeout: 30000, hidden: true })).findings;
const sitesOf = (f) => [...document.querySelectorAll(`${SCOPE} [data-plumb-source]`)].filter((e) => e.getAttribute('data-plumb-source').startsWith(`${f.file}:${f.line}:${f.column}#`));
// plumber's sets as style declarations: camelCase to kebab, a bare number in pixels (as its rules hand them over)
const kebab = (o = {}) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), typeof v === 'number' ? `${v}px` : v]));

// The example's life: plumber reads it, the blueprint opens on it, and the switch takes plumber's fix or gives it back.
// A live example that re-renders its classes takes plumber's fix as a source edit (taken.js), with plumber's own class
// edit (inplace.js applied()); the others take it in place with swapPreview.
// plumber reads a still page: a live example holds still while it's read, long enough for its own transitions to end
const STILL_FOR_READ = 450; // ms
function usePlumber(Example) {
  const [state, setState] = useState({ phase: 'asking' });
  const [reading, setReading] = useState(false);
  const read = async () => {
    setReading(true);
    await new Promise((r) => setTimeout(r, STILL_FOR_READ));
    try { return await ask(); } finally { setReading(false); }
  };
  const taken = useRef([]);
  const [edits, setEdits] = useState([]);
  const [apply, setApply] = useState(null);
  useEffect(() => { inplace().then((m) => setApply(() => m.applied)); }, []);
  const rewrite = (cls) => {
    if (!apply || !edits.length) return cls;
    let list = cls.split(/\s+/).filter(Boolean);
    for (const e of edits) if (list.includes(e.on)) list = apply(list, e);
    return list.join(' ');
  };
  useEffect(() => {
    let live = true;
    (async () => {
      const found = await read();
      if (live) setState({ phase: 'broken', found });
    })().catch((e) => live && setState({ phase: 'error', error: e.message }));
    return () => { live = false; };
  }, []);
  const fix = async () => {
    const { swapPreview, GLIDE } = await inplace();
    taken.current = [];
    if (Example?.takes) {
      setEdits(state.found.filter((f) => f.suggest?.kind === 'class').map((f) => ({ on: f.text, from: f.suggest.from, to: f.suggest.to })));
      setState((s) => ({ ...s, phase: 'fixing' }));
      return GLIDE.ms;
    }
    for (const f of state.found) {
      if (f.suggest?.kind !== 'class') continue;
      for (const el of sitesOf(f)) {
        // the class lands on the element; what it stands for lands where it reaches (its target), or on the element
        const memo = {}, styles = kebab(f.suggest.sets), on = f.suggest.target ? [...el.querySelectorAll(f.suggest.target)] : [];
        swapPreview(el, { from: f.suggest.from, to: f.suggest.to }, true, memo, on.length ? {} : styles);
        taken.current.push({ el, memo });
        for (const child of on) { const m = {}; swapPreview(child, { from: '', to: '' }, true, m, styles); taken.current.push({ el: child, memo: m }); }
      }
    }
    setState((s) => ({ ...s, phase: 'fixing' }));
    return GLIDE.ms;
  };
  // asked again once the fix is in and the camera is back at rest
  const again = async () => {
    const after = await read();
    setState((s) => ({ ...s, phase: 'fixed', after, applied: taken.current.length }));
  };
  const undo = async () => {
    const { swapPreview } = await inplace();
    for (const { el, memo } of taken.current) swapPreview(el, null, false, memo);
    taken.current = [];
    setEdits([]);
    setState((s) => ({ ...s, phase: 'broken', after: null }));
  };
  return { state, fix, undo, ask: again, rewrite, reading };
}

/* ─────────────────────────────────────────────────────────
 * THE MOMENT  (docs/craft/stage-brief.md, timings measured from the benchmark video)
 *
 * Read top-to-bottom. Each value is ms after the click on plumber's side of the switch.
 *
 *    0ms   the example's figures decelerate and land; the lesson fades back
 *  400ms   camera eases in on what plumber measures (up to 2.4×)
 * 1400ms   marks fade in: stripes, then pills (40ms later)
 * 1600ms   hold on what's wrong
 * 2800ms   plumber's fix lands; pills count to 0, magenta → blue, then ✓; stripes converge (400ms)
 * 3200ms   hold on right
 * 4500ms   marks fade out, checks first
 * 4800ms   camera eases out to rest
 * 5700ms   the example comes alive again; plumber is asked again at rest
 *  back    to the mistake: no camera; the fix glides back and the example stays alive
 * ───────────────────────────────────────────────────────── */
const TIMING = {
  cameraIn:  400,   // figures have landed; the camera starts in
  marksIn:   1400,  // camera has landed; marks fade in
  fix:       2800,  // plumber's fix lands, marks converge
  marksOut:  4500,  // marks fade out
  cameraOut: 4800,  // camera eases back to rest
  resume:    5700,  // the example lives again; plumber asked again
};
const STAGE = { rest: 0, settle: 1, cameraIn: 2, marks: 3, fix: 4, marksOut: 5, cameraOut: 6 };

/* The camera */
const CAMERA = {
  maxZoom: 2.4,                                   // never closer than this
  fill:    0.92,                                  // the subject fills this much of the column's width
  above:   20,                                    // px between the subject and the bar, and the switch
  below:   28,                                    // px the frame reaches under the component at rest (the switch is 40px down)
  in:  'transform 1000ms cubic-bezier(0.7, 0, 0.3, 1)',  // slow start, slow finish (as measured)
  out: 'transform 900ms cubic-bezier(0.7, 0, 0.3, 1)',
};

/* The marks */
const MARKS = {
  fade:     200,  // ms, lines and the shade in
  pillLag:  40,   // ms, pills after lines
  out:      300,  // ms, all out (checks first)
  converge: 400,  // ms, the fix's count-down and line glide
  stripe:   1,    // px on screen, at any zoom (plumber's --pl-line)
  pill:     22,   // px tall on screen, at any zoom (plumber's tag)
  pop:      0.6,  // pills appear from this scale on plumber's --pl-spring-pop
  cut:      6,    // px the shade's cut-out clears the measured column by
  off:      'var(--pl-off)',  // plumber's coral: off
  on:       'var(--pl-on)',   // plumber's mint: on your scale, fixed
};

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => 1 - (1 - t) ** 3;

// An example's measure, in the camera's own (unscaled) pixels, so the marks scale with it. New examples hand over
// keyed glyph edges and one pill per place; older ones hand over ticks, read as lines with one pill.
function marksOf(m, cam) {
  if (!m || !cam) return null;
  const r = cam.getBoundingClientRect(), k = r.width / cam.offsetWidth || 1;
  const X = (x) => (x - r.left) / k, Y = (y) => (y - r.top) / k;
  if (m.pills) {
    const settled = m.pills.every((p) => p.ok || (Number(p.text) || 0) / k < 0.5);
    return {
      off: m.off && !settled,
      lines: m.lines.map((l, i) => ({ key: l.key ?? i, x: X(l.x), top: Y(l.top), bottom: Y(l.bottom) })),
      // horizontal guides: an edge running across, for a size or a baseline
      rules: (m.rules ?? []).map((l, i) => ({ key: l.key ?? i, y: Y(l.y), left: X(l.left), right: X(l.right) })),
      bands: (m.bands ?? []).map((b, i) => ({ key: b.key ?? i, pattern: b.pattern, left: X(b.left), right: X(b.right), top: Y(b.top), bottom: Y(b.bottom) })),
      // a pill's number is measured on screen; in the component's own pixels it doesn't grow with the camera
      pills: m.pills.map((p, i) => { const value = (Number(p.text) || 0) / k; return { key: p.key ?? i, x: X(p.x), y: Y(p.y), value, ok: p.ok || value < 0.5 }; }),
      subject: { left: X(m.subject.left), right: X(m.subject.right), top: Y(m.subject.top), bottom: Y(m.subject.bottom) },
      // what the shade leaves clear: the example's own choice, else the measured bands
      cut: m.cut ? { key: 'cut', left: X(m.cut.left), right: X(m.cut.right), top: Y(m.cut.top), bottom: Y(m.cut.bottom), r: (m.cut.r ?? 0) / k } : null,
    };
  }
  const v = m.ticks.filter((t) => t.y === undefined), a = m.around?.getBoundingClientRect?.();
  const xs = [...v.map((t) => t.x), ...(a ? [a.left, a.right] : [])], ys = [...v.flatMap((t) => [t.top, t.bottom]), ...(a ? [a.top, a.bottom] : [])];
  const subject = { left: X(Math.min(...xs)), right: X(Math.max(...xs)), top: Y(Math.min(...ys)), bottom: Y(Math.max(...ys)) };
  return {
    off: m.off, bands: [], subject,
    lines: v.map((t, i) => ({ key: i, x: X(t.x), top: Y(t.top), bottom: Y(t.bottom) })),
    pills: [{ key: 0, x: (subject.left + subject.right) / 2, y: subject.top, value: parseFloat(m.broken?.match(/[\d.]+/)?.[0]) || 0, ok: !m.off }],
  };
}

// Where the camera goes (as measured): the subject fills the column's width and sits between the bar and the
// switch; the rest of the component runs off the window's edges, like a camera's frame.
function shot(subject, cam, view) {
  const r = cam.getBoundingClientRect();
  const w = subject.right - subject.left, h = subject.bottom - subject.top;
  const k = Math.max(1, Math.min(CAMERA.maxZoom, (view.width * CAMERA.fill) / w, (view.bottom - view.top) / h));
  const cx = (subject.left + subject.right) / 2, cy = (subject.top + subject.bottom) / 2; // camera pixels
  return { k, x: view.left + view.width / 2 - r.left - cx * k, y: (view.top + view.bottom) / 2 - r.top - cy * k };
}

// plumber's read, drawn with plumber's own primitives: its tokens (overlay/src/tokens.css, served by the overlay and
// scoped to a shadow root's :host, exactly as the overlay uses them), so the moment looks like plumber on a real page.
const TOKENS = '/__plumb/src/tokens.css';
function PlumbLayer({ children }) {
  const host = useRef(null);
  const [root, setRoot] = useState(null);
  useEffect(() => {
    const r = host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' });
    r.innerHTML = `<link rel="stylesheet" href="${TOKENS}"><style>:host { position: absolute; inset: 0; pointer-events: none; }</style>`;
    setRoot(r);
  }, []);
  // the board is light, so plumber's light values (its night values are for dark pages)
  return <div ref={host} data-scheme="light" aria-hidden="true" className="pointer-events-none absolute inset-0">{root ? createPortal(children, root) : null}</div>;
}

// The marks, as blueprint draws drift: the page under the scrim and gone grey so colour means drift, the measured
// column cut out of it at full colour; 1px lines on the glyphs' own edges; heat dots
// where it's off; and a blueprint tag per place with plumber's number, white on coral. During the fix (t from 0 to 1)
// the edges glide to where they are, the number counts down and coral turns mint, then ✓.
function Marks({ from, to, t, k, shown, pills, card }) {
  if (!from) return null;
  const at = (list, key) => to?.[list].find((x) => x.key === key);
  const e = ease(t), done = t >= 1 && to && !to.off;
  const hue = `color-mix(in oklab, ${MARKS.on} ${Math.round(e * (to && !to.off ? 100 : 0))}%, ${MARKS.off})`;
  const fade = (on, ms) => ({ opacity: on ? 1 : 0, transition: `opacity ${ms}ms var(--pl-ease-out)` });
  // the lines skip plumber's white halo: it lets one line show over any page, but side by side on every glyph edge it
  // whites the digits out, and inside the cut-out the ground is already white. The tag keeps its halo.
  // the shade over the card, with the measured columns cut out (even-odd: the holes stay clear)
  // each hole follows its element's shape: a rounded rectangle with the element's own corner (a circle for a round button)
  const holes = (from.cut ? [from.cut] : from.bands).map((b) => {
    const n = (b.key === 'cut' ? to?.cut : at('bands', b.key)) ?? b, c = MARKS.cut;
    // the hole follows its element while the fix lands (a trimmed bubble shrinks and the thread reflows under it)
    const l = lerp(b.left, n.left, e) - c - card.left, r = lerp(b.right, n.right, e) + c - card.left, t = lerp(b.top, n.top, e) - c - card.top, btm = lerp(b.bottom, n.bottom, e) + c - card.top;
    const q = Math.min((b.r ?? 0) + c, (r - l) / 2, (btm - t) / 2);
    return `M${l + q} ${t}H${r - q}A${q} ${q} 0 0 1 ${r} ${t + q}V${btm - q}A${q} ${q} 0 0 1 ${r - q} ${btm}H${l + q}A${q} ${q} 0 0 1 ${l} ${btm - q}V${t + q}A${q} ${q} 0 0 1 ${l + q} ${t}Z`;
  }).join('');
  return (
    <PlumbLayer>
      {card ? <div style={{ position: 'absolute', left: card.left, top: card.top, width: card.right - card.left, height: card.bottom - card.top, borderRadius: card.radius,
        background: 'var(--pl-scrim)', backdropFilter: 'var(--pl-dim-filter)', WebkitBackdropFilter: 'var(--pl-dim-filter)',
        clipPath: `path(evenodd, "M0 0H${card.right - card.left}V${card.bottom - card.top}H0Z${holes}")`, ...fade(shown, shown ? 160 : MARKS.out) }} /> : null}
      <div style={{ position: 'absolute', inset: 0, ...fade(shown, shown ? MARKS.fade : MARKS.out) }}>
        {from.bands.map((b) => { const n = at('bands', b.key) ?? b; return (
          <span key={'b' + b.key} style={{ position: 'absolute', left: lerp(b.left, n.left, e), top: lerp(b.top, n.top, e), width: lerp(b.right - b.left, n.right - n.left, e), height: lerp(b.bottom - b.top, n.bottom - n.top, e), opacity: b.pattern === 'hatch' ? 0.55 : 0.4,
            // plumber's patterns: hatch is padding, dots are where it's off
            ...(b.pattern === 'hatch'
              ? { backgroundImage: `repeating-linear-gradient(45deg, ${hue} 0 ${1 / k}px, transparent ${1 / k}px ${4 / k}px)` }
              : { backgroundImage: `radial-gradient(circle, ${hue} ${0.95 / k}px, transparent ${1.25 / k}px)`, backgroundSize: `${3.5 / k}px ${3.5 / k}px` }) }} />
        ); })}
        {(from.rules ?? []).map((l) => { const n = to?.rules?.find((x) => x.key === l.key) ?? l; return (
          <span key={'h' + l.key} style={{ position: 'absolute', top: lerp(l.y, n.y, e), left: lerp(l.left, n.left, e), width: lerp(l.right - l.left, n.right - n.left, e), height: MARKS.stripe / k, background: hue, opacity: 0.55 }} />
        ); })}
        {from.lines.map((l) => { const n = at('lines', l.key) ?? l; return (
          <span key={'l' + l.key} style={{ position: 'absolute', left: lerp(l.x, n.x, e), top: l.top, height: l.bottom - l.top, width: MARKS.stripe / k, background: hue, opacity: 0.55 }} />
        ); })}
      </div>
      {from.pills.map((p) => { const n = at('pills', p.key) ?? p; return (
        <span key={'p' + p.key} style={{ position: 'absolute', left: lerp(p.x, n.x, e), top: p.y, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
          height: MARKS.pill, minWidth: MARKS.pill * 1.6, padding: '0 var(--pl-space-3)', borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums',
          color: 'var(--pl-on-accent)', background: hue, boxShadow: '0 0 0 1px var(--pl-halo)',
          transform: `translate(-50%, -50%) scale(${(pills ? 1 : MARKS.pop) / k})`, opacity: pills ? 1 : 0,
          transition: `transform 320ms var(--pl-spring-pop) ${pills ? MARKS.pillLag : 0}ms, opacity ${pills ? MARKS.fade : MARKS.out / 2}ms var(--pl-ease-out) ${pills ? MARKS.pillLag : 0}ms` }}>
          {done ? '✓' : lerp(p.value, to ? n.value * (n.ok ? 0 : 1) : p.value, e).toFixed(1)}
        </span>
      ); })}
    </PlumbLayer>
  );
}

// plumber's read as one authored moment, driven by a single stage.
function useMoment(Example, plumb, view) {
  const cam = useRef(null);
  const [stage, setStage] = useState(STAGE.rest);
  const [lens, setLens] = useState({ k: 1, x: 0, y: 0 });
  const [marks, setMarks] = useState({ from: null, to: null });
  const [t, setT] = useState(0);
  const [live, setLive] = useState(true);
  const timers = useRef([]);
  const following = useRef(false);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const measure = () => (Example?.measure ? marksOf(Example.measure(document.querySelector(SCOPE)), cam.current) : null);
  // the card under the shade, in camera pixels (the component the example draws)
  const cardOf = () => {
    const el = document.querySelector(SCOPE)?.firstElementChild, c = cam.current;
    if (!el || !c) return null;
    const r = el.getBoundingClientRect(), o = c.getBoundingClientRect(), k = o.width / c.offsetWidth || 1;
    return { left: (r.left - o.left) / k, top: (r.top - o.top) / k, right: (r.right - o.left) / k, bottom: (r.bottom - o.top) / k, radius: getComputedStyle(el).borderTopLeftRadius };
  };
  const [card, setCard] = useState(null);
  // each frame re-measures where things are now: a fix that glides in CSS is followed, one that snaps is eased
  const tween = (each, ms = MARKS.converge) => new Promise((done) => {
    const start = performance.now();
    const tick = (now) => { const p = Math.min(1, (now - start) / (still() ? 1 : ms)); each?.(p); setT(p); p < 1 ? requestAnimationFrame(tick) : done(); };
    requestAnimationFrame(tick);
  });
  const take = () => {
    if (stage !== STAGE.rest) return;
    const at = (ms, fn) => timers.current.push(setTimeout(fn, still() ? Math.min(ms, 600) : ms));
    setT(0); setMarks({ from: null, to: null });
    setStage(STAGE.settle); setLive(false);
    at(TIMING.cameraIn, () => {
      const from = measure();
      setMarks({ from, to: null }); setCard(cardOf());
      if (from && cam.current && view.current && !still()) setLens(shot(from.subject, cam.current, view.current()));
      setStage(STAGE.cameraIn);
    });
    at(TIMING.marksIn, () => setStage(STAGE.marks));
    at(TIMING.fix, async () => {
      const glide = await plumb.fix();
      setStage(STAGE.fix);
      // the count-down runs as long as plumber's own glide; after it, the marks keep reading the page through the hold,
      // so they always end where the fix came to rest, however slow the page is
      // the card can grow or shrink as the fix lands (narrower lines run taller): the shade follows it too
      const read = () => { setMarks((m) => ({ ...m, to: measure() })); setCard(cardOf()); };
      await tween(read, Math.max(MARKS.converge, glide + 120));
      following.current = true;
      const follow = () => { if (!following.current) return; read(); requestAnimationFrame(follow); };
      follow();
    });
    at(TIMING.marksOut, () => { following.current = false; setStage(STAGE.marksOut); });
    at(TIMING.cameraOut, () => { setLens({ k: 1, x: 0, y: 0 }); setStage(STAGE.cameraOut); });
    at(TIMING.resume, async () => {
      setStage(STAGE.rest); setLive(true); setMarks({ from: null, to: null });
      // plumber measures pixels: ask only once the camera is truly back at 1×, never mid-ease
      for (let i = 0; i < 40 && cam.current && cam.current.getBoundingClientRect().width / cam.current.offsetWidth > 1.001; i++) await new Promise((r) => setTimeout(r, 50));
      plumb.ask();
    });
  };
  const give = async () => { if (stage === STAGE.rest) await plumb.undo(); };
  const style = { transform: `translate(${lens.x}px, ${lens.y}px) scale(${lens.k})`, transformOrigin: '0 0', transition: still() ? 'none' : lens.k > 1 ? CAMERA.in : CAMERA.out };
  const shown = stage >= STAGE.marks && stage < STAGE.marksOut;
  const frame = stage !== STAGE.rest ? { clipPath: `inset(-200vh -200vw -${CAMERA.below}px -200vw)` } : undefined;
  return { cam, style, frame, stage, live, take, give, marks: <Marks from={marks.from} to={marks.to} t={t} k={lens.k} shown={shown} pills={shown} card={card} /> };
}

const chip = (to, from) => { const t = `${from ? `${from} → ` : '+ '}${to}`; return <code title={t} className="rounded-chip bg-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">{t}</code>; };

// The teaching, quiet and off the stage: plumber's finding, why, the habit, its fix. Plain paragraphs, no labels.
function Lesson({ state, lesson, away }) {
  const f = state.found?.[0], fixed = state.phase === 'fixed';
  return (
    <section aria-label="What plumber finds" className="flex w-full max-w-xl flex-col gap-3 text-sm transition-opacity duration-500" style={{ opacity: away ? 0 : 1 }}>
      {state.phase === 'asking' ? (
        <div aria-label="Asking plumber about this example" className="flex flex-col gap-2">
          <span className="h-3.5 w-3/4 animate-pulse rounded-chip bg-sunken" /><span className="h-3.5 w-1/2 animate-pulse rounded-chip bg-sunken" />
        </div>
      ) : state.phase === 'error' ? <p className="text-negative">{state.error}</p>
        : !f ? <p className="text-ink-muted">plumber has no finding on this example.</p> : (
          <>
            <p className="font-medium text-pretty">{fixed ? (state.after?.length ? `Asked again: ${state.after[0].title}` : 'Asked again, plumber finds nothing.') : f.title}</p>
            <p className="text-ink-muted text-pretty">{lesson?.why ?? f.because} {lesson?.habit}</p>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-ink-muted text-pretty">
              <span>plumber’s fix: {f.suggest?.why ?? f.action}.</span>
              {f.suggest?.kind === 'class' ? chip(f.suggest.to, f.suggest.from) : null}
            </p>
            <p className="font-mono text-[11px] text-ink-subtle">{f.rule} · {f.file.split('/').pop()}:{f.line}{f.count > 1 ? ` · ${f.count} places` : ''}</p>
          </>
        )}
    </section>
  );
}

// The switch names the two techniques. Its thumb slides between them.
function Switch({ names, fixed, ready, onBack, onFix }) {
  const track = useRef(null);
  const [thumb, setThumb] = useState(null);
  useEffect(() => {
    const on = track.current?.querySelector('[aria-pressed="true"]');
    if (on) setThumb({ left: on.offsetLeft, width: on.offsetWidth });
  }, [fixed, names]);
  const tab = 'relative z-10 inline-flex h-7 items-center rounded-[6px] px-3 text-[13px] whitespace-nowrap transition-colors duration-200 disabled:cursor-default ' + RING;
  return (
    <div ref={track} role="group" aria-label="Technique" className="relative flex items-center rounded-control bg-sunken p-0.5 ring-1 ring-line">
      {thumb ? <span aria-hidden="true" className="absolute top-0.5 bottom-0.5 rounded-[6px] bg-surface shadow-raised transition-[left,width] duration-300 ease-(--ease-arrive)" style={thumb} /> : null}
      <button type="button" aria-pressed={!fixed} disabled={!ready} onClick={onBack} title={`${names[0]} (B)`} className={tab + (fixed ? ' text-ink-muted hover:text-ink' : ' text-ink')}>{names[0]}</button>
      <button type="button" aria-pressed={fixed} disabled={!ready} onClick={onFix} title={`${names[1]}, plumber’s fix (F)`} className={tab + (fixed ? ' text-ink' : ' text-ink-muted hover:text-ink')}>{names[1]}</button>
    </div>
  );
}

const FOUND = {
  probe: 'plumber craft finds it by using the page: pressing, hovering, dragging, or reading it dark, on touch or on a slow reply.',
  habit: 'plumber finds it in the source: run plumber check in the project.',
};

const RING = 'outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent';
const step = 'grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-sunken active:bg-line ' + RING;

// The page: one live component alone on the board, the switch under it naming the two techniques, the lesson below.
// Taking plumber's side is the moment above; the whole page is the camera's frame (the bar and the list float over).
export function Principle({ n }) {
  const p = ALL.find((x) => x.n === n);
  const Example = shown(n) ? EXAMPLES[n] : null;
  const plumb = usePlumber(Example);
  const { state } = plumb;
  const bar = useRef(null), sw = useRef(null), main = useRef(null);
  // the camera's frame: the column's width, from under the bar to just above the switch
  const view = useRef(() => {
    const m = main.current.getBoundingClientRect();
    // a component taller than the window pushes the switch below the fold: the window's edge is the frame then
    return { left: m.left + 16, width: m.width - 32, top: bar.current.getBoundingClientRect().bottom + CAMERA.above, bottom: Math.min(sw.current.getBoundingClientRect().top, innerHeight) - CAMERA.above };
  });
  const moment = useMoment(Example, plumb, view);
  // previous and next walk the staged principles only
  const at = PRINCIPLES.findIndex((x) => x.n >= n), here = PRINCIPLES[at]?.n === n;
  const prev = (here ? PRINCIPLES[at - 1] : PRINCIPLES[at - 1])?.n ?? null, next = (here ? PRINCIPLES[at + 1] : PRINCIPLES[at])?.n ?? null;
  const staged = shown(n);
  const fixed = state.phase === 'fixing' || state.phase === 'fixed', ready = (state.phase === 'broken' || state.phase === 'fixed') && moment.stage === STAGE.rest;
  const live = Example && p.how === 'live';
  const names = Example?.names ?? ['As built', 'plumber’s fix'];
  useEffect(() => { document.title = `${n} · ${p.title} · plumber`; }, [n, p.title]);
  useEffect(() => {
    const key = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.localName)) return;
      if (e.key === 'ArrowLeft' && prev) location.href = `/rule/${prev}`;
      else if (e.key === 'ArrowRight' && next) location.href = `/rule/${next}`;
      else if (live && ready && e.key === 'f' && !fixed) moment.take();
      else if (live && ready && e.key === 'b' && fixed) moment.give();
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  });
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex justify-center px-4 pt-4">
        <nav ref={bar} aria-label="Principle" className="flex w-full max-w-3xl items-center gap-2 rounded-full border border-line bg-surface/85 py-1.5 pr-1.5 pl-4 shadow-raised backdrop-blur">
          <a href="/" aria-label={`Principle ${n}: all principles`} className={'shrink-0 rounded-full text-sm font-medium tabular-nums sm:hidden ' + RING}>№ {n}</a>
          <span className="hidden min-w-0 flex-1 truncate text-sm text-ink-muted sm:inline" title={`${p.section}: ${p.title}`}>{p.section} · <span className="tabular-nums">{n}</span> · <span className="text-ink">{p.title}</span></span>
          <span className="flex-1 sm:hidden" />
          {prev ? <a href={`/rule/${prev}`} aria-label={'Principle ' + prev} title="Previous (←)" className={step}><Chevron className="rotate-180" /></a> : null}
          {next ? <a href={`/rule/${next}`} aria-label={'Principle ' + next} title="Next (→)" className={step}><Chevron /></a> : null}
        </nav>
      </header>
      <main ref={main} className="@container flex flex-1 flex-col items-center gap-12 px-4 pb-16">
        {staged ? (
        <div className="flex min-h-[calc(100dvh-4.5rem)] w-full max-w-3xl flex-col items-center justify-center gap-10 pt-6 pb-10">
          {/* the camera: the example and its marks move together; nothing clips it but the page */}
          {/* the camera's frame: while the moment runs, its bottom edge sits just above the switch (the sides and top
              run off the window); at rest nothing is clipped, so the component keeps its shadow */}
          <div className="relative w-full" style={moment.frame}>
          <div ref={moment.cam} className="relative flex w-full justify-center" style={moment.style}>
            <section data-example aria-label="Example" className={Example?.stage ? 'flex w-full min-w-0 justify-center' : 'flex w-full max-w-2xl min-w-0 justify-center overflow-hidden rounded-sheet corner-squircle bg-surface shadow-window ' + (Example?.framed ? 'ring-1 ring-line' : 'border border-line px-4 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6')}>
              <Taken.Provider value={plumb.rewrite}>{Example ? <Example broken live={moment.live && !plumb.reading} /> : <p className="text-sm text-ink-muted">This example isn’t built yet.</p>}</Taken.Provider>
            </section>
            {moment.marks}
          </div>
          </div>
          <div ref={sw} className="relative z-10">
            {live ? <Switch names={names} fixed={fixed} ready={ready} onBack={() => fixed && moment.give()} onFix={() => !fixed && moment.take()} /> : null}
          </div>
        </div>
        ) : <div className="h-24" />}
        {live ? <Lesson state={state} lesson={Example?.lesson} away={moment.stage !== STAGE.rest} />
          : !staged ? (
            <p className="max-w-sm text-center text-sm text-ink-muted text-pretty">
              {MERGED[n] ? <>Shown with <a href={`/rule/${MERGED[n]}`} className={'font-medium text-accent ' + RING}>№ {MERGED[n]}</a>, the same insight.</>
                : 'Not staged here: plumber still checks it on every page, but it’s hygiene a review catches, not an insight to show.'}
            </p>
          ) : <p className="max-w-72 text-sm text-ink-muted">{FOUND[p.how] ?? ''}</p>}
      </main>
    </div>
  );
}

// The 77, grouped by catalogue section; the open one is filled and its fill bleeds out by its padding (#1), so every
// row's words share one edge.
// the open principle is brought into the list's view once, when the page opens, not on every render
const intoView = (el) => { if (el && !el.dataset.shown) { el.dataset.shown = '1'; el.scrollIntoView({ block: 'center' }); } };
function List({ current }) {
  const sections = [...new Set(PRINCIPLES.map((p) => p.section))];
  return (
    <nav aria-label="All principles" className="flex flex-col gap-6">
      {sections.map((s) => (
        <section key={s} className="flex flex-col gap-1">
          <h2 className="text-xs font-medium text-ink-muted">{s}</h2>
          <ol className="flex flex-col">
            {PRINCIPLES.filter((p) => p.section === s).map((p) => (
              <li key={p.n} className="flex">
                <a href={`/rule/${p.n}`} aria-current={p.n === current ? 'page' : undefined} ref={p.n === current ? intoView : undefined}
                  className={'-mx-2 flex min-w-0 flex-1 items-baseline gap-2 rounded-chip px-2 py-1 text-sm hover:bg-sunken active:bg-line ' + RING + ' ' + (p.n === current ? 'bg-sunken font-medium text-ink' : EXAMPLES[p.n] ? 'text-ink' : 'text-ink-muted')}>
                  <span className="w-5 shrink-0 text-right text-ink-muted tabular-nums">{p.n}</span>
                  <span className="truncate" title={p.title}>{p.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </nav>
  );
}

// Two columns from 768px: the list on the left, scrolling on its own; the principle on the right. Narrower, the list
// is its own page (/), and each principle links back to it.
export function Layout({ current, children }) {
  return (
    <div className="board min-h-dvh overflow-x-clip md:pl-72">
      <aside className="z-30 hidden md:fixed md:inset-y-4 md:left-4 md:block md:w-64 md:overflow-y-auto md:overscroll-contain md:rounded-card md:border md:border-line md:bg-surface/80 md:px-4 md:py-5 md:shadow-overlay md:backdrop-blur md:gutter-stable">
        <List current={current} />
      </aside>
      {children}
    </div>
  );
}

export function Index() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Craft principles, one at a time</h1>
        <p className="max-w-measure text-sm text-ink-muted">Each opens one example from a real app, broken and fixed. Press Alt+B on an example to see what React Plumber marks.</p>
      </header>
      <List />
    </main>
  );
}
