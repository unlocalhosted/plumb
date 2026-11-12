/* ─────────────────────────────────────────────────────────
 * THE REVIEW (the hero, comp B with C's moment; the owner's pick, 2026-11-04). One team's home page, as written with
 * five real mistakes from Plumber's patterns: a widowed heading (#18), a made-up gap, a play icon centred by its box
 * (#2), figures that don't line up (#16) and a grey shadow on a coloured card (#21). Plumber pins each one like a design
 * review, with its pattern's name. Then, one pin at a time, the camera eases in on what it measures, guides draw on the
 * measured edges, a pill carries the measured number, the fix lands while the number counts to its right value, and
 * the camera eases out. Everything drawn is read from the screen as rendered, never typed in.
 *
 * STORYBOARD (on load, while the hero is in view; a pin plays its own moment when you press it, and the tour stops)
 *      0ms   the screen as written
 *    500ms   the boxes and pins pop in, 90ms apart; the count reads "5 found"
 *   1700ms   the tour, each pin in turn, 3700ms apart:
 *              +0      the pins lift; the camera eases in on the mistake (900ms, slow start, slow finish)
 *              +900    guides draw on the measured edges; the pill pops in with the number, in coral
 *              +1900   the fix lands; guides follow it, the number counts to its fixed value, green, a check
 *              +3000   guides and pill lift; the camera eases out; the pin comes back green
 *   after five: hold 3200ms, then the screen goes back to as written and the tour plays again
 * Reduced motion: no tour; pressing a pin cuts to its moment with no travel.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toyOf } from '../../../overlay/src/toys.js'; // each mistake wears its property's toy

const W = 1040, H = 470; // the screen is drawn at this size and scaled to fit
const T = { pinsIn: 500, pinGap: 90, tour: 1700, guides: 900, fix: 1900, out: 3000, done: 3600, next: 3700, hold: 3200 };
const EASE = t => 1 - (1 - t) ** 3;
const half = v => (Math.round(v * 2) / 2).toFixed(1); // read off a scaled screen, a length is good to half a pixel

// what each mistake is called, in the overlay's words where it has them (overlay/src/words.js)
const ISSUES = [
  { id: '18', toy: 'wrap', name: 'One word alone', rule: 'No widows in headings', said: 'A widow', done: 'No widow', num: v => Math.round(v), unit: v => (Math.round(v) === 1 ? ' word on the last line' : ' words on the last line') },
  { id: 'space', toy: 'gap', name: 'gap-[13px] hardcodes 13px', rule: 'Spacing on your theme', done: 'gap-4, a step of your theme', num: v => Math.round(v), unit: () => 'px gap' },
  { id: '2', toy: 'alignment', name: 'Icon looks off-centre', rule: 'Optical centre beats geometric centre', done: 'Optically centred', num: v => half(v), unit: () => 'px off centre' },
  { id: '16', toy: 'type', name: 'Figures don’t line up', rule: 'Tabular figures', done: 'Tabular figures', pre: 'colons ', num: v => half(v), unit: () => 'px apart' },
  { id: '21', toy: 'shadow', name: 'Grey shadow on colour', rule: 'Shadows are tinted, not grey', done: 'Tinted with the card’s colour', pre: 'chroma ', num: v => v.toFixed(2), unit: () => '' },
];

export function Review() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const area = useRef(null), screen = useRef(null), twin = useRef(null), timers = useRef({ tour: [], pin: [] });
  const [fit, setFit] = useState(1);
  const [titleW, setTitleW] = useState(640);
  const [geo, setGeo] = useState(null);           // each mistake measured, as written and fixed, in the screen's units
  const [shown, setShown] = useState(reduced);    // the boxes and pins
  const [fixed, setFixed] = useState(() => new Set());
  const [moment, setMoment] = useState(null);     // { id, step: 1 camera, 2 guides, 3 fixed, 4 out }
  const [touring, setTouring] = useState(!reduced);
  const [visible, setVisible] = useState(true);
  const [loop, setLoop] = useState(0);

  // the screen fits the space the hero leaves it: its width always; on a wide window its height too (one viewport)
  useLayoutEffect(() => {
    const wide = matchMedia('(min-width: 48rem)');
    const measure = () => {
      const w = area.current.clientWidth, h = area.current.clientHeight;
      setFit(Math.min(1, w / W, wide.matches && h > 0 ? h / H : Infinity));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(area.current);
    wide.addEventListener('change', measure);
    return () => { ro.disconnect(); wide.removeEventListener('change', measure); };
  }, []);

  // the heading must really be widowed as written: narrow it until one word sits alone on its last line; then read
  // every mistake from the screen as written and from its fixed twin
  useEffect(() => {
    let on = true;
    document.fonts.ready.then(() => requestAnimationFrame(() => {
      if (!on) return;
      const h = screen.current.querySelector('.rv-title');
      let w = 640;
      for (; w > 380; w -= 4) { h.style.width = `${w}px`; if (lastLine(h).length === 1) break; }
      h.style.width = '';
      setTitleW(w);
      requestAnimationFrame(() => on && setGeo({ messy: read(screen.current), clean: read(twin.current) }));
    }));
    return () => { on = false; };
  }, []);

  // the tour runs only while the hero is on screen
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(area.current);
    return () => io.disconnect();
  }, []);

  // the tour's timers and a pressed pin's are kept apart, so ending the tour never cancels the pin you pressed
  const clear = (...lists) => { for (const n of lists.length ? lists : ['tour', 'pin']) { timers.current[n].forEach(clearTimeout); timers.current[n] = []; } };
  const play = (list, t0, id) => {
    const at = (t, f) => timers.current[list].push(setTimeout(f, t));
    at(t0, () => { setMoment({ id, step: 1 }); setFixed(s => { const n = new Set(s); n.delete(id); return n; }); });
    at(t0 + T.guides, () => setMoment({ id, step: 2 }));
    at(t0 + T.fix, () => { setMoment({ id, step: 3 }); setFixed(s => new Set(s).add(id)); });
    at(t0 + T.out, () => setMoment({ id, step: 4 }));
    at(t0 + T.done, () => setMoment(null));
  };

  useEffect(() => {
    if (!geo || !touring || !visible) return;
    setFixed(new Set()); setMoment(null); setShown(false);
    const at = (t, f) => timers.current.tour.push(setTimeout(f, t));
    at(T.pinsIn, () => setShown(true));
    ISSUES.forEach((s, i) => play('tour', T.tour + i * T.next, s.id));
    at(T.tour + ISSUES.length * T.next + T.hold, () => setLoop(n => n + 1));
    return () => clear('tour');
  }, [geo, touring, visible, loop]);

  // a pin you press plays its own moment, and the tour is over
  const press = id => { setTouring(false); clear(); setShown(true); setMoment(null); play('pin', 0, id); };
  useEffect(() => () => clear(), []);
  const stop = () => { clear(); setMoment(null); };
  useEffect(() => {
    if (!moment) return;
    const key = e => { if (e.key === 'Escape') { stop(); setFixed(s => new Set(s).add(moment.id)); } };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [moment]);
  const pause = () => { if (touring) { setTouring(false); stop(); setShown(true); } else { setTouring(true); setLoop(n => n + 1); } };

  // the camera: in on the mistake's box, kept inside the screen
  const cam = (() => {
    if (!geo || !moment || moment.step === 4) return { k: 1, x: 0, y: 0 };
    const b = geo.messy[moment.id].box;
    // the mistake sits a little below the middle, leaving the pill room above it
    const k = Math.max(1.1, Math.min(3, (0.6 * W) / b.w, (0.62 * H) / b.h));
    const x = Math.min(0, Math.max(W - k * W, W / 2 - k * (b.x + b.w / 2)));
    const y = Math.min(0, Math.max(H - k * H, H * 0.56 - k * (b.y + b.h / 2)));
    return { k, x, y };
  })();
  const found = ISSUES.length - fixed.size;

  return (
    <figure ref={area} className="review" aria-label="A team’s home page with five craft mistakes, which Plumber finds, names and fixes">
      <div className="rv-stage">
      <div className="rv-frame surface" style={{ width: W * fit, height: H * fit }} data-moment={!!moment} data-reduced={reduced}>
        <div className="rv-fit" style={{ width: W, height: H, transform: `scale(${fit})` }} aria-hidden="true">
          <div className="rv-cam" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.k})` }}>
            <Screen ref={screen} fixed={fixed} titleW={titleW} />
          </div>
          <div className="rv-twin"><Screen ref={twin} fixed={ALL} titleW={titleW} /></div>
        </div>

        {geo && (
          <div className="rv-pins" data-shown={shown}>
            {ISSUES.map((s, i) => <Pin key={s.id} issue={s} n={i + 1} g={geo[fixed.has(s.id) ? 'clean' : 'messy'][s.id]} fit={fit} fixed={fixed.has(s.id)} onPress={() => press(s.id)} i={i} />)}
          </div>
        )}
        {geo && moment && <Moment key={moment.id} issue={ISSUES.find(s => s.id === moment.id)} step={moment.step} geo={geo} cam={cam} fit={fit} />}
      </div>

        <div className="rv-count">
          {found > 0 && <span className="chip chip-off"><i />{found} found</span>}
          {fixed.size > 0 && <span className="chip chip-on"><i />{fixed.size} fixed</span>}
          <span className="rv-count-of">77 patterns checked</span>
          <button type="button" className="rv-pause" onClick={pause} aria-label={touring ? 'Pause the tour' : 'Play the tour'} disabled={reduced}>
            <svg viewBox="0 0 16 16" aria-hidden="true">{touring ? <path d="M5.5 3.5v9M10.5 3.5v9" /> : <path d="M5 3.5v9l7.5-4.5z" />}</svg>
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{moment?.step === 3 ? (() => { const s = ISSUES.find(x => x.id === moment.id); return `${s.name}. Fixed: ${s.done}.`; })() : ''}</p>
    </figure>
  );
}
const ALL = new Set(ISSUES.map(s => s.id));

/* A pin: the mistake's box, a numbered dot and its name with the pattern it breaks. Green with a check once fixed.
 * States: rest, hover (the dot grows a little, the label lifts to the next ground), focus (accent ring), pressed
 * (scale 0.97), fixed (green, check), hidden (during a moment and before the tour). */
function Pin({ issue, n, g, fit, fixed, onPress, i }) {
  const b = g.box, f = v => v * fit;
  // where each pin sits, so no label covers the page's text: the gap's on the grid's bottom-left corner, the play
  // icon's centred under the button, the shadow's under the card opening left, the rest on the top-right
  const at = { space: ['', f(b.x) - 10, f(b.y + b.h) - 8], 2: [' rv-pin-under', f(b.x + b.w / 2), f(b.y + b.h) + 6], 21: [' rv-pin-left', f(b.x + b.w) - 8, f(b.y + b.h) + 4] };
  const [kind, left, top] = at[issue.id] ?? ['', f(b.x + b.w) - 8, f(b.y) - 10];
  return (
    <>
      <span className="rv-box" data-fixed={fixed} style={{ left: f(b.x) - 3, top: f(b.y) - 3, width: f(b.w) + 6, height: f(b.h) + 6, '--i': i }} />
      <button type="button" className={`rv-pin${kind}`} data-fixed={fixed}
        style={{ left, top, '--i': i }} onClick={onPress} aria-label={`${n}. ${issue.name}. ${issue.rule}. Show the fix.`}>
        <b>{fixed ? <svg viewBox="0 0 16 16"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg> : n}</b>
        <span key={fixed ? 'd' : 'n'}><i className="rv-toy" aria-hidden="true" dangerouslySetInnerHTML={{ __html: toyOf(issue.toy) }} />{fixed ? issue.done : issue.name}</span>
      </button>
    </>
  );
}

/* One mistake at full size: guides on the measured edges and the pill with the number, drawn over the zoomed screen
 * (in page pixels, so they stay sharp and readable at any zoom). */
function Moment({ issue, step, geo, cam, fit }) {
  const num = useRef(null), pill = useRef(null);
  const a = geo.messy[issue.id], z = geo.clean[issue.id], g = step >= 3 ? z : a;
  const X = x => fit * (cam.x + cam.k * x), Y = y => fit * (cam.y + cam.k * y), S = v => fit * cam.k * v;

  // the number counts from as written to fixed, eased, written straight to the page
  useEffect(() => {
    if (step !== 3 || !num.current) return;
    const t0 = performance.now(); let id;
    const tick = now => {
      const t = Math.min(1, (now - t0) / 700), v = a.value + (z.value - a.value) * EASE(t);
      num.current.textContent = issue.num(v);
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [step]);

  // the pill sits above the mistake when there's room, else under it, and always inside the frame
  const fH = H * fit, top = Y(a.box.y), px = X(a.box.x + a.box.w / 2);
  const py = Math.min(fH - 44, top > 52 ? top - 44 : Y(a.box.y + a.box.h) + 12);
  useLayoutEffect(() => {
    const el = pill.current; if (!el) return;
    const half = el.offsetWidth / 2 + 8;
    el.style.left = `${Math.min(W * fit - half, Math.max(half, px))}px`;
  });
  return (
    <div className="rv-moment" data-step={step} aria-hidden="true">
      {step >= 2 && g.guides.map((l, i) => (
        <span key={i} className={`rv-guide rv-guide-${l.kind}`} style={{ '--i': i, transform: `translate(${X(l.x)}px, ${Y(l.y)}px)`, width: Math.max(1, S(l.w)), height: S(l.h) }} />
      ))}
      {step >= 2 && (
        <span ref={pill} className="rv-pill" data-fixed={step >= 3} style={{ left: px, top: py }}>
          <i className="rv-toy" aria-hidden="true" dangerouslySetInnerHTML={{ __html: toyOf(issue.toy) }} />
          {a.swatch && <i className="rv-swatch" style={{ background: g.swatch }} />}
          <span>{issue.pre}<b ref={num}>{issue.num(step >= 3 ? z.value : a.value)}</b>{issue.unit(step >= 3 ? z.value : a.value)}</span>
          <span className="rv-pill-sep">·</span>
          <span key={step >= 3 ? 'd' : 'n'} className="rv-pill-name">{step >= 3 ? issue.done : issue.said ?? issue.name}</span>
          {step >= 3 && <svg className="rv-check" viewBox="0 0 16 16"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>}
        </span>
      )}
    </div>
  );
}

/* The team's home page. Each mistake sits on the element that carries it (data-issue); data-fixed puts Plumber's fix
 * on it. */
const NAV = [['Home', 'navigation'], ['Projects', 'grid'], ['Members', 'avatar'], ['Settings', 'switch']];
const toy = (name, cls = 'rv-ty') => <i className={cls} aria-hidden="true" dangerouslySetInnerHTML={{ __html: toyOf(name) }} />;
const Screen = ({ ref, fixed, titleW }) => {
  const fx = id => (fixed.has(id) ? '' : undefined);
  return (
    <div ref={ref} className="rv-scr">
      <aside className="rv-side">
        <span className="rv-brand">{toy('chart', 'rv-brand-mark')}Northwind</span>
        {NAV.map(([n, t]) => <span key={n} className={n === 'Home' ? 'on' : undefined}>{toy(t)}{n}</span>)}
        <span className="rv-side-foot"><i className="rv-av" style={{ '--a': 'var(--pl-pink)' }}>M</i>Maya Ortiz</span>
      </aside>
      <main className="rv-main">
        <h3 className="rv-title" data-issue="18" data-fixed={fx('18')} style={{ width: titleW }}>Good morning, Maya. Here’s what moved in your workspace this week</h3>
        <div className="rv-grid" data-issue="space" data-fixed={fx('space')}>
          <section className="rv-video">
            <span className="rv-float f1">{toy('fill')}</span><span className="rv-float f2">{toy('corner')}</span><span className="rv-float f3">{toy('type')}</span><span className="rv-float f4">{toy('padding')}</span>
            <span className="rv-play" data-issue="2" data-fixed={fx('2')}><svg viewBox="0 0 24 24"><path d="M7 4.5v15L19 12z" /></svg></span>
            <small>Welcome tour · 1:24</small>
          </section>
          <section className="rv-figs" data-issue="16" data-fixed={fx('16')}>
            <small>{toy('motion')}Time this week</small>
            {[['Design', '12:06:18', 'pink'], ['Reviews', '4:48:05', 'sky'], ['Meetings', '7:11:40', 'mint']].map(([l, v, h]) => <div key={l}><span><i className="rv-dot" style={{ '--d': `var(--pl-${h})` }} />{l}</span><b>{v}</b></div>)}
          </section>
          <section className="rv-promo">
            <div className="rv-promo-card" data-issue="21" data-fixed={fx('21')}>
              <span className="rv-avs">{[['A', 'sky'], ['J', 'mint'], ['K', 'butter']].map(([c, h]) => <i key={c} className="rv-av" style={{ '--a': `var(--pl-${h})` }}>{c}</i>)}</span>
              <b>Invite your team</b><span>Three seats left on your plan</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

/* ── reading the screen ── */

// the words on a heading's last line, by where each word's box sits
function lastLine(h) {
  const t = h.firstChild, r = document.createRange(), words = []; let i = 0;
  for (const w of h.textContent.split(' ')) { r.setStart(t, i); r.setEnd(t, i + w.length); words.push({ i, n: w.length, top: Math.round(r.getBoundingClientRect().top) }); i += w.length + 1; }
  return words.filter(w => w.top === words.at(-1).top);
}

// every mistake's box, its measured value and its guides, in the screen's own units (before scaling)
function read(root) {
  const b = root.getBoundingClientRect(), k = b.width / W;
  const box = r => ({ x: (r.left - b.left) / k, y: (r.top - b.top) / k, w: r.width / k, h: r.height / k });
  const q = s => root.querySelector(`[data-issue="${s}"]`), out = {};

  // #18: how many words sit on the heading's last line, boxed
  const h = q('18'), last = lastLine(h), r = document.createRange();
  r.setStart(h.firstChild, last[0].i); r.setEnd(h.firstChild, last.at(-1).i + last.at(-1).n);
  const lb = box(r.getBoundingClientRect());
  out['18'] = { box: box(h.getBoundingClientRect()), value: last.length, guides: [{ kind: 'box', x: lb.x - 4, y: lb.y - 2, w: lb.w + 8, h: lb.h + 4 }] };

  // the gap: the grid's column gap, hatched between the cards
  const grid = q('space'), kids = [...grid.children].map(c => box(c.getBoundingClientRect())), gb = box(grid.getBoundingClientRect());
  out.space = { box: gb, value: parseFloat(getComputedStyle(grid).columnGap), guides: kids.slice(1).map((c, i) => ({ kind: 'hatch', x: kids[i].x + kids[i].w, y: gb.y, w: c.x - kids[i].x - kids[i].w, h: gb.h })) };

  // #2: the button's centre against the triangle's weight (its centroid sits at x 11 of 24)
  const btn = q('2'), bb = box(btn.getBoundingClientRect()), vb = box(btn.querySelector('svg').getBoundingClientRect());
  const cx = bb.x + bb.w / 2, wx = vb.x + vb.w * (11 / 24), ext = { y: bb.y - 14, h: bb.h + 28 };
  out['2'] = { box: bb, value: Math.abs(cx - wx), guides: [{ kind: 'line', x: cx, w: 0, ...ext }, { kind: 'dash', x: wx, w: 0, ...ext }] };

  // #16: where each row's last colon sits; proportional figures put them at different places
  const figs = q('16'), xs = [...figs.querySelectorAll('b')].map(el => {
    const t = el.firstChild, c = t.textContent.lastIndexOf(':'), cr = document.createRange(); cr.setStart(t, c); cr.setEnd(t, c + 1);
    const rb = box(cr.getBoundingClientRect()); return { x: rb.x + rb.w / 2, y: rb.y - 3, h: rb.h + 6 };
  });
  out['16'] = { box: box(figs.getBoundingClientRect()), value: Math.max(...xs.map(c => c.x)) - Math.min(...xs.map(c => c.x)), guides: xs.map(c => ({ kind: 'line', x: c.x, y: c.y, w: 0, h: c.h })) };

  // #21: the shadow's chroma, and its colour for the swatch
  const card = q('21'), sh = getComputedStyle(card).boxShadow;
  out['21'] = { box: box(card.getBoundingClientRect()), value: chromaOf(sh), swatch: sh.match(/(oklch|rgba?)\([^)]*\)/)?.[0], guides: [] };
  return out;
}

/* ── a colour's chroma: sRGB → OKLab ── */
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function chroma([r, g, b]) {
  [r, g, b] = [r, g, b].map(v => lin(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return Math.hypot(1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s);
}
// browsers hand back oklch() as it was written, rgb() otherwise
const chromaOf = str => { const o = str.match(/oklch\(\s*[\d.]+%?\s+([\d.]+)/); return o ? +o[1] : chroma(str.match(/rgba?\(([^)]+)\)/)?.[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).map(Number) ?? [0, 0, 0]); };
