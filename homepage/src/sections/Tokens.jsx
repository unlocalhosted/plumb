/* ─────────────────────────────────────────────────────────
 * SAVE TOKENS ON ITERATION (STORY.md, pillar 3; page-plan.html, section 3; the owner's pick, illustration A "two
 * routes", with a real element at both ends and the prompt being written at the start). Medium: illustration. No code,
 * no token numbers; the prompt's route is "a typical loop", not a measurement.
 *
 * The drawing is one stage, 1104 × 400, scaled to fit:
 *   left    the prompt you'd write to an agent, and under it the real element: Members rows, loose, gaps marked off
 *   middle  two routes to the same place: from the prompt, the long way through your files, your theme, an edit and
 *           back to you, twice; from the element, three keys straight across
 *   right   the same element, fixed: rows on the related step, gaps marked on
 *
 * STORYBOARD (plays while on screen, holds, loops; reduced motion shows the end)
 *      0ms   the prompt box is empty; the rows are loose
 *    200ms   the prompt types itself
 *   1600ms   sent; both dots leave
 *   1700ms   the page's dot crosses in 1.4s, tapping Alt B, ↑ ↓, A; on arrival the element on the right settles
 *   1700ms   the prompt's dot walks every stop, lighting each; it arrives at 9.7s: "by prompt", the same result
 * ───────────────────────────────────────────────────────── */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './tokens.css';

const W = 1104, H = 400;
const PROMPT = 'The rows in Members feel loose. Tighten them a little?';
// the prompt's route: a wave whose every crest and trough is a stop, so each label sits clear of the line
const LONG = 'M262 66 C 290 30, 290 30, 316 30 C 352 30, 352 196, 388 196 C 424 196, 424 30, 460 30 C 496 30, 496 196, 532 196 '
  + 'C 568 196, 568 30, 604 30 C 640 30, 640 196, 676 196 C 712 196, 712 30, 748 30 C 778 30, 778 196, 808 196 C 828 196, 830 172, 842 172';
const SHORT = 'M262 286 L 842 286';
const STOPS = [ // label, where it sits (a crest or a trough), which side its label goes
  ['search for Members', [316, 30], 'above'], ['read the file', [388, 196], 'below'], ['read your theme', [460, 30], 'above'], ['edit', [532, 196], 'below'],
  ['you: “closer, but tighter”', [604, 30], 'above', true], ['read again', [676, 196], 'below'], ['edit again', [748, 30], 'above'], ['you check', [808, 196], 'below', true],
];
const KEYS = [['Alt B', 0.29], ['↑ ↓', 0.5], ['A', 0.71]];
const T = { type: 200, typeEnd: 1500, send: 1600, go: 1700, short: 1400, long: 8000, hold: 2600 };
const END = T.go + T.long;
const PEOPLE = [['Maya Okafor', 'Owner', 330], ['Daniel Reyes', 'Admin', 230], ['Priya Nair', 'Member', 80]];

const clamp = v => Math.max(0, Math.min(1, v));
const easeOut = v => 1 - (1 - v) ** 3;

export function Tokens() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const area = useRef(null), longRef = useRef(null), shortRef = useRef(null);
  const [fit, setFit] = useState(1);
  const [t, setT] = useState(reduced ? END : 0);
  const [geo, setGeo] = useState(null); // lengths and stop positions, read from the drawn paths

  useLayoutEffect(() => {
    const measure = () => setFit(Math.min(1, area.current.clientWidth / W));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(area.current);
    const L = longRef.current.getTotalLength(), S = shortRef.current.getTotalLength();
    // how far along the route each stop is: the sampled point nearest its crest or trough
    const samples = Array.from({ length: 600 }, (_, i) => ({ f: i / 599, pt: longRef.current.getPointAtLength((L * i) / 599) }));
    setGeo({ L, S, at: STOPS.map(([, [x, y]]) => samples.reduce((b, s) => (Math.hypot(s.pt.x - x, s.pt.y - y) < Math.hypot(b.pt.x - x, b.pt.y - y) ? s : b)).f) });
    return () => ro.disconnect();
  }, []);

  // one clock while on screen
  useEffect(() => {
    if (reduced) return;
    let raf = 0, start = 0;
    const tick = now => {
      start ||= now;
      const e = now - start;
      setT(Math.min(e, END));
      if (e > END + T.hold) start = now;
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([en]) => { cancelAnimationFrame(raf); if (en.isIntersecting) { start = 0; raf = requestAnimationFrame(tick); } }, { threshold: 0.4 });
    io.observe(area.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [reduced]);

  const typed = PROMPT.slice(0, Math.round(PROMPT.length * clamp((t - T.type) / (T.typeEnd - T.type))));
  const sent = t >= T.send;
  const p = easeOut(clamp((t - T.go) / T.short)), q = clamp((t - T.go) / T.long);
  const fixed = p >= 1, longHome = q >= 1;
  const pt = (ref, len, f) => (geo ? ref.current.getPointAtLength(len * f) : { x: 262, y: f ? 0 : 0 });
  const shortDot = geo && pt(shortRef, geo.S, p), longDot = geo && pt(longRef, geo.L, q);

  return (
    <section className="tok" aria-labelledby="tok-title">
      <header className="tok-head">
        <span className="tok-eyebrow">Save tokens</span>
        <h2 id="tok-title" className="title">A 2px change shouldn’t cost a prompt.</h2>
        <p className="lead">Ask an agent and it goes the long way: through your files, your theme, an edit, and back to you to check. <b>On the page it’s three keys and no model.</b></p>
      </header>

      <div ref={area} className="tok-area" style={{ height: H * fit }}>
        <div className="tok-stage" style={{ width: W, height: H, transform: `scale(${fit})` }} aria-hidden="true">
          {/* left: the prompt, and the element as it is */}
          <div className="tok-prompt" data-sent={sent}>
            <span className="tok-prompt-label">Ask your agent</span>
            <p>{typed}{!sent && <i className="tok-caret" />}</p>
            <span className="tok-send"><svg viewBox="0 0 16 16"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" /></svg></span>
          </div>
          <Element className="tok-before" label="as it is" tight={false} />

          {/* middle: the two routes */}
          <svg className="tok-routes" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <path ref={longRef} className="tok-long" d={LONG} />
            {geo && <path className="tok-trail" d={LONG} style={{ strokeDasharray: geo.L, strokeDashoffset: geo.L * (1 - q) }} />}
            <path ref={shortRef} className="tok-short-base" d={SHORT} />
            {geo && <path className="tok-short" d={SHORT} style={{ strokeDasharray: geo.S, strokeDashoffset: geo.S * (1 - p) }} />}
            {geo && STOPS.map(([label, [x, y], side, you], i) => (
              <g key={label} className={`tok-stop${you ? ' tok-stop-you' : ''}`} data-lit={q >= geo.at[i]}>
                <circle cx={x} cy={y} r={you ? 6 : 5} />
                <text x={x} y={y + (side === 'below' ? 30 : -16)} textAnchor="middle">{label}</text>
              </g>
            ))}
            {KEYS.map(([k, at]) => {
              const x = 262 + 580 * at;
              return (
                <g key={k} className="tok-key" data-on={p >= at}>
                  <rect x={x - 34} y={272} width={68} height={28} rx={7} /><text x={x} y={291} textAnchor="middle">{k}</text>
                </g>
              );
            })}
            {geo && sent && !longHome && <circle className="tok-dot-long" cx={longDot.x} cy={longDot.y} r={5} />}
            {geo && sent && !fixed && <circle className="tok-dot-short" cx={shortDot.x} cy={shortDot.y} r={6} />}
            <text className="tok-route-name" x={276} y={322}>on the page · no model</text>
          </svg>

          {/* right: the same element, fixed when the page's route arrives */}
          <Element className="tok-after" label="fixed" tight={fixed} lit={fixed} />
          <span className="tok-badge tok-badge-short" data-shown={fixed}>on the page</span>
          <span className="tok-badge tok-badge-long" data-shown={longHome}>by prompt, the same result</span>
        </div>
      </div>
      <p className="tok-legend"><span><i className="tok-sw-long" />by prompt, a typical loop</span><span><i className="tok-sw-short" />on the page, no model</span></p>
      <p className="sr-only">Two ways to tighten the Members rows. By prompt, the agent searches for the file, reads it, reads your theme, edits, you ask again, it reads and edits again, and you check. On the page, three keys: Alt B, an arrow to try the step, A to apply. Both end with the same rows on your theme’s related step.</p>
    </section>
  );
}

/* The real element at both ends: a Members card whose rows are loose (gaps off the scale, coral) or fixed (on the
 * related step, green). The gap between rows is the thing that changes. */
function Element({ className, label, tight, lit }) {
  return (
    <div className={`tok-el ${className}`} data-tight={tight} data-lit={lit}>
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
