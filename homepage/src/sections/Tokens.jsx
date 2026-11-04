/* ─────────────────────────────────────────────────────────
 * SAVE TOKENS ON ITERATION (STORY.md, pillar 3; page-plan.html, section 3; the owner's pick, illustration A "two
 * routes", with a real element at both ends and the prompt being written at the start). Medium: illustration. No code,
 * no token numbers; the prompt's route is "a typical loop", not a measurement.
 *
 * The drawing is one stage, 1104 × 412, scaled to fit:
 *   left    the prompt you'd write to an agent, and under it the real element: Members rows, loose, gaps marked off
 *   middle  two routes to the same place: from the prompt, the long way through your files, your theme, an edit and
 *           back to you, twice; from the element, three keys straight across
 *   right   the same element, as it is until the page's route lands; then fixed: rows on the related step
 *
 * STORYBOARD (plays while on screen, holds, fades and loops; reduced motion shows the end)
 *      0ms   the prompt box is empty; both cards are loose
 *    200ms   the prompt types itself
 *   1600ms   sent; the left card's rows are outlined, as Alt outlines them; both dots leave
 *   1700ms   the page's dot crosses in 1.4s, tapping Alt B, ↑ ↓, A
 *   3100ms   it lands: the right card's rows spring together, their gaps turn from off to on, one soft pulse
 *   1700ms   the prompt's dot walks every stop, lighting each; at each "you" stop it waits for you (your dot pulses)
 *  11500ms   it lands: "by prompt, the same result"
 *
 * SMOOTHNESS: the moving parts (two dots, two trails, the typed prompt) are written straight to the drawing each frame
 * from paths sampled once at load; React renders only when a step changes (a key lights, a stop is reached, the fix
 * lands), a handful of times a loop.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './tokens.css';

const W = 1104, H = 412;
const PROMPT = 'The rows in Members feel loose. Tighten them a little?';
// the prompt's route: a wave whose every crest and trough is a stop, so each label sits clear of the line
const LONG = 'M262 66 C 290 30, 290 30, 316 30 C 352 30, 352 196, 388 196 C 424 196, 424 30, 460 30 C 496 30, 496 196, 532 196 '
  + 'C 568 196, 568 30, 604 30 C 640 30, 640 196, 676 196 C 712 196, 712 30, 748 30 C 778 30, 778 196, 808 196 C 828 196, 830 172, 842 172';
const SHORT = 'M262 286 L 842 286';
const STOPS = [ // label, where it sits (a crest or a trough), which side its label goes, whether it's you
  ['search for Members', [316, 30], 'above'], ['read the file', [388, 196], 'below'], ['read your theme', [460, 30], 'above'], ['edit', [532, 196], 'below'],
  ['you: “closer, but tighter”', [604, 30], 'above', true], ['read again', [676, 196], 'below'], ['edit again', [748, 30], 'above'], ['you check', [808, 196], 'below', true],
];
const KEYS = [['Alt B', 0.29], ['↑ ↓', 0.5], ['A', 0.71]];
const T = { type: 200, typeEnd: 1500, send: 1600, go: 1700, short: 1400, walk: 8000, wait: 900, hold: 2400, fade: 350 };
const END = T.go + T.walk + T.wait * STOPS.filter(s => s[3]).length;
const SAMPLES = 480;
const PEOPLE = [['Maya Okafor', 'Owner', 330], ['Daniel Reyes', 'Admin', 230], ['Priya Nair', 'Member', 80]];

const clamp = v => Math.max(0, Math.min(1, v));

// A route's points at SAMPLES + 1 even steps along its length, and its length. The routes are only M, L and C commands
// (absolute), so each piece is walked finely in arithmetic, then the walk is resampled at even lengths.
function route(d) {
  const nums = d.match(/[MLC]|-?[\d.]+/g), walk = [];
  let x = 0, y = 0, cmd = '';
  for (let i = 0; i < nums.length;) {
    if (/[MLC]/.test(nums[i])) cmd = nums[i++];
    const n = () => +nums[i++];
    if (cmd === 'M') { x = n(); y = n(); walk.push({ x, y }); }
    else if (cmd === 'L') { const x1 = n(), y1 = n(); for (let k = 1; k <= 40; k++) walk.push({ x: x + (x1 - x) * k / 40, y: y + (y1 - y) * k / 40 }); x = x1; y = y1; }
    else { const [a, b, c, e, f, g] = [n(), n(), n(), n(), n(), n()];
      for (let k = 1; k <= 40; k++) { const t = k / 40, u = 1 - t;
        walk.push({ x: u * u * u * x + 3 * u * u * t * a + 3 * u * t * t * c + t * t * t * f, y: u * u * u * y + 3 * u * u * t * b + 3 * u * t * t * e + t * t * t * g }); }
      x = f; y = g; }
  }
  const acc = [0];
  for (let i = 1; i < walk.length; i++) acc.push(acc[i - 1] + Math.hypot(walk[i].x - walk[i - 1].x, walk[i].y - walk[i - 1].y));
  const len = acc.at(-1), pts = [];
  for (let k = 0, j = 1; k <= SAMPLES; k++) {
    const want = (len * k) / SAMPLES;
    while (j < acc.length - 1 && acc[j] < want) j++;
    const r = (want - acc[j - 1]) / (acc[j] - acc[j - 1] || 1);
    pts.push({ x: walk[j - 1].x + (walk[j].x - walk[j - 1].x) * r, y: walk[j - 1].y + (walk[j].y - walk[j - 1].y) * r });
  }
  return [pts, len];
}
const easeOut = v => 1 - (1 - v) ** 3;

// the prompt's progress at a given moment: a steady walk, standing still for T.wait at each stop where it waits for you
function walk(e, youAt) {
  let t = e - T.go, f = 0, waiting = -1;
  if (t <= 0) return { f: 0, waiting };
  for (const [i, at] of youAt) {
    const reach = (at - f) * T.walk;
    if (t < reach) return { f: f + t / T.walk, waiting };
    t -= reach; f = at;
    if (t < T.wait) return { f, waiting: i };
    t -= T.wait;
  }
  return { f: clamp(f + t / T.walk), waiting };
}

export function Tokens() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const area = useRef(null), longRef = useRef(null), shortRef = useRef(null);
  const trail = useRef(null), shortLine = useRef(null), longDot = useRef(null), shortDot = useRef(null), typedRef = useRef(null);
  const [fit, setFit] = useState(1);
  const [geo, setGeo] = useState(null);
  // the steps, as one small object: React renders only when one of these changes
  const [s, setS] = useState(() => step(reduced ? END : 0, null));

  useLayoutEffect(() => {
    // on a phone the drawing keeps a readable size and the strip swipes sideways, rather than shrinking to specks
    const phone = matchMedia('(max-width: 40rem)');
    const measure = () => setFit(phone.matches ? 0.62 : Math.min(1, area.current.clientWidth / W));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(area.current);
    // both routes sampled once, in plain arithmetic (the browser's path measuring costs ~0.17ms a call, 80ms a route);
    // every frame after reads these points instead of measuring the path again
    const [longPts, L] = route(LONG), [shortPts, S] = route(SHORT);
    const at = STOPS.map(([, [x, y]]) => longPts.reduce((b, p, i) => (Math.hypot(p.x - x, p.y - y) < b.d ? { d: Math.hypot(p.x - x, p.y - y), f: i / SAMPLES } : b), { d: Infinity, f: 0 }).f);
    const youAt = STOPS.map((st, i) => [i, at[i], st[3]]).filter(x => x[2]).map(([i, f]) => [i, f]);
    setGeo({ L, S, longPts, shortPts, at, youAt });
    return () => ro.disconnect();
  }, []);

  // one clock while on screen: moving parts written directly, steps set only when they change
  useEffect(() => {
    if (!geo) return;
    const paint = e => {
      const { f: q } = walk(e, geo.youAt), p = easeOut(clamp((e - T.go) / T.short));
      const lp = geo.longPts[Math.round(q * SAMPLES)], sp = geo.shortPts[Math.round(p * SAMPLES)];
      longDot.current.setAttribute('transform', `translate(${lp.x} ${lp.y})`);
      shortDot.current.setAttribute('transform', `translate(${sp.x} ${sp.y})`);
      trail.current.style.strokeDashoffset = `${geo.L * (1 - q)}`;
      shortLine.current.style.strokeDashoffset = `${geo.S * (1 - p)}`;
      const n = Math.round(PROMPT.length * clamp((e - T.type) / (T.typeEnd - T.type)));
      if (typedRef.current.dataset.n !== String(n)) { typedRef.current.textContent = PROMPT.slice(0, n); typedRef.current.dataset.n = n; }
    };
    if (reduced) { paint(END); setS(step(END, geo)); return; }
    let raf = 0, start = 0, last = '';
    const tick = now => {
      start ||= now;
      const e = now - start;
      const clock = Math.min(e, END);
      paint(clock);
      const next = step(clock, geo, e > END + T.hold - T.fade);
      const key = JSON.stringify(next);
      if (key !== last) { last = key; setS(next); }
      if (e > END + T.hold) start = now;
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([en]) => { cancelAnimationFrame(raf); if (en.isIntersecting) { start = 0; raf = requestAnimationFrame(tick); } }, { threshold: 0.4 });
    io.observe(area.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [geo, reduced]);

  // on a phone the strip follows the story: across to the fixed card when the page's route lands, back at the start
  // of each loop; once you swipe it yourself, it's yours and stays put
  const swiped = useRef(false);
  useEffect(() => {
    const el = area.current;
    if (!el || swiped.current || el.scrollWidth <= el.clientWidth + 1) return;
    el.scrollTo({ left: s.fixed ? el.scrollWidth - el.clientWidth : 0, behavior: reduced ? 'auto' : 'smooth' });
  }, [s.fixed, s.sent, reduced]);

  return (
    <section className="tok" aria-labelledby="tok-title">
      <header className="tok-head">
        <span className="tok-eyebrow">Save tokens</span>
        <h2 id="tok-title" className="title">A 2px change shouldn’t cost a prompt.</h2>
        <p className="lead">Ask an agent and it goes the long way: through your files, your theme, an edit, and back to you to check. <b>On the page it’s three keys and no model.</b></p>
      </header>

      <div ref={area} className="tok-area" style={{ height: H * fit, '--stage-w': `${W * fit}px` }} onPointerDown={() => { swiped.current = true; }} onWheel={() => { swiped.current = true; }}>
        <div className="tok-stage" data-fading={s.fading} style={{ width: W, height: H, transform: `scale(${fit})` }} aria-hidden="true">
          {/* left: the prompt, and the element as it is */}
          <div className="tok-prompt" data-sent={s.sent}>
            <span className="tok-prompt-label">Ask your agent</span>
            <p><span ref={typedRef} />{!s.sent && <i className="tok-caret" />}</p>
            <span className="tok-send"><svg viewBox="0 0 16 16"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" /></svg></span>
          </div>
          <Element className="tok-before" label="as it is" picked={s.picked} />

          {/* middle: the two routes */}
          <svg className="tok-routes" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <path ref={longRef} className="tok-long" d={LONG} />
            <path ref={trail} className="tok-trail" d={LONG} style={geo ? { strokeDasharray: geo.L, strokeDashoffset: geo.L } : { opacity: 0 }} />
            <path ref={shortRef} className="tok-short-base" d={SHORT} />
            <path ref={shortLine} className="tok-short" d={SHORT} style={geo ? { strokeDasharray: geo.S, strokeDashoffset: geo.S } : { opacity: 0 }} />
            {geo && STOPS.map(([label, [x, y], side, you], i) => (
              <g key={label} className={`tok-stop${you ? ' tok-stop-you' : ''}`} data-lit={s.lit > i}>
                <circle cx={x} cy={y} r={you ? 6 : 5} />
                <text x={x} y={y + (side === 'below' ? 30 : -16)} textAnchor="middle">{label}</text>
                {/* the agent waits for you: your dot pulses while it stands still */}
                {you && <circle className="tok-wait" cx={x} cy={y} r={6} data-shown={s.waiting === i} />}
              </g>
            ))}
            {KEYS.map(([k, at], i) => {
              const x = 262 + 580 * at;
              return (
                <g key={k} className="tok-key" data-on={s.keys > i}>
                  <rect x={x - 34} y={272} width={68} height={28} rx={7} /><text x={x} y={291} textAnchor="middle">{k}</text>
                </g>
              );
            })}
            <circle ref={longDot} className="tok-dot-long" r={5} data-shown={s.sent && !s.longHome} transform="translate(262 66)" />
            <circle ref={shortDot} className="tok-dot-short" r={6} data-shown={s.sent && !s.fixed} transform="translate(262 286)" />
            <text className="tok-route-name" x={276} y={322}>on the page · no model</text>
          </svg>

          {/* right: the same element, fixed when the page's route lands */}
          <Element className="tok-after" label={s.fixed ? 'fixed' : 'as it is'} tight={s.fixed} />
          <span className="tok-badge tok-badge-short" data-shown={s.fixed}>on the page</span>
          <span className="tok-badge tok-badge-long" data-shown={s.longHome}>by prompt, the same result</span>
        </div>
      </div>
      <p className="tok-legend"><span><i className="tok-sw-long" />by prompt, a typical loop</span><span><i className="tok-sw-short" />on the page, no model</span></p>
      <p className="sr-only">Two ways to tighten the Members rows. By prompt, the agent searches for the file, reads it, reads your theme, edits, waits for you, reads and edits again, and waits for you to check. On the page, three keys: Alt B, an arrow to try the step, A to apply. Both end with the same rows on your theme’s related step.</p>
    </section>
  );
}

// The discrete steps at a moment: what's lit, what's shown. Small and comparable, so React renders only on a change.
function step(e, geo, fading = false) {
  const p = clamp((e - T.go) / T.short);
  const { f: q, waiting } = geo ? walk(e, geo.youAt) : { f: e >= END ? 1 : 0, waiting: -1 };
  return {
    sent: e >= T.send,
    picked: e >= T.send && p < 1,
    keys: KEYS.filter(([, at]) => easeOut(p) >= at).length,
    fixed: p >= 1,
    lit: geo ? geo.at.filter(at => q >= at).length : (e >= END ? STOPS.length : 0),
    waiting,
    longHome: q >= 1,
    fading,
  };
}

/* The real element at both ends: a Members card whose rows are loose (gaps off the scale, coral) or fixed (on the
 * related step, green). The gap between rows is the thing that changes. */
function Element({ className, label, tight, picked }) {
  return (
    <div className={`tok-el ${className}`} data-tight={!!tight} data-picked={!!picked}>
      <span className="tok-el-label">{label}</span>
      <div className="tok-card">
        <b>Members</b>
        <ul>
          {PEOPLE.map(([name, role, h]) => (
            <li key={name}><i style={{ '--h': h }}>{name[0]}</i><span>{name}</span><small>{role}</small></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
