/* ─────────────────────────────────────────────────────────
 * START ON THE REPO YOU HAVE. The doubt it answers: "my app is a mess; this will fail on everything." It won't:
 * Plumber writes down today's problems and leaves them be; only new ones fail. Told as an art piece with almost no
 * words (owner's pick, concept A "the day you start", docs: src/ledger-concepts): a line in time. Before it, today's
 * problems, frosted over and left alone. After it, the one new problem stands out. 94 is this homepage's own known
 * debt, from `plumber check` on this repo.
 *
 * STORYBOARD (starts when the field scrolls into view; "Again" replays it; reduced motion shows the end)
 *      0ms   today's 94 problems, scattered, lively
 *    700ms   the line draws down from the top: "today"
 *   1500ms   frost wipes over everything before it; the problems quiet down: "94 kept"
 *   2700ms   one new problem drops in after the line, lands with a small bounce, and sends out rings: "1 new"
 *   4600ms   it's fixed: it turns mint, the rings stop: "on your theme"
 *   6200ms   one old problem is fixed on the way: it drifts across the line, turns mint and goes; 94 becomes 93
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import './ledger.css';

const DEBT = 94;
const TIMING = [0, 700, 1500, 2700, 4600, 6200];
const SAID = [ // for screen readers, one line per stage
  'Today’s 94 problems.',
  'The day you start Plumber.',
  'Everything before it is kept as it is: 94 problems, not failing.',
  'One new problem after it. Only that one fails.',
  'It’s fixed. It passes.',
  'An old one is fixed on the way: 93 kept.',
];
const rand = i => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); }; // the same scatter every time
const LINE = 56; // % across the field where today is
const PAST = Array.from({ length: DEBT }, (_, i) => ({ x: 4 + rand(i + 1) * 88, y: 10 + rand(i + 501) * 80, s: rand(i + 901) }));
// the old problem fixed on the way: the one nearest the line, so its trip across is short and easy to follow
const LEAVER = PAST.reduce((b, p, i) => (p.x > PAST[b].x && p.y > 30 && p.y < 70 ? i : b), 0);

export function Ledger() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const field = useRef(null);
  const [run, setRun] = useState(reduced ? 1 : 0); // 0 waiting to be seen; each replay counts up, to restart
  const [stage, setStage] = useState(reduced ? TIMING.length - 1 : 0);

  useEffect(() => {
    if (reduced) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(1); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(field.current);
    return () => io.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!run || reduced) return;
    setStage(0);
    const timers = TIMING.slice(1).map((t, i) => setTimeout(() => setStage(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, [run, reduced]);

  const kept = stage >= 5 ? DEBT - 1 : DEBT;

  return (
    <section className="ledger" aria-labelledby="ledger-title">
      <div className="ledger-head">
        <h2 id="ledger-title" className="m-0">Start on the repo you have.</h2>
        <p>Plumber writes down today’s problems and leaves them be. From then on, only new ones fail.</p>
      </div>

      <div ref={field} className="ledger-art pl-light" data-run={run} data-stage={stage} style={{ '--line': `${LINE}%` }}>
        <div className="field-glow" aria-hidden="true"><i /></div>
        <div className="ledger-after" aria-hidden="true" />

        {/* before the line: today's problems */}
        <div className="ledger-past" aria-hidden="true">
          {PAST.map((p, i) => (
            <i key={i} data-leaver={i === LEAVER} style={{ left: `${p.x}%`, top: `${p.y}%`, '--s': 7 + p.s * 13, '--i': i,
              '--to': `${70 - p.x * LINE / 100}cqw` }} />
          ))}
        </div>
        <div className="ledger-frost" aria-hidden="true" />
        <span className="ledger-tag ledger-tag-kept tabular" key={`k${kept}`}>{kept} kept</span>

        {/* today */}
        <div className="ledger-line" aria-hidden="true"><span className="ledger-tag">today</span></div>

        {/* after the line: the one new problem */}
        <div className="ledger-new" aria-hidden="true" data-fixed={stage >= 4}>
          <i /><i /><i />
          <b />
          <span key={stage >= 4 ? 'f' : 'n'} className="ledger-tag ledger-tag-new">{stage >= 4 ? 'on your theme' : '1 new'}</span>
        </div>

        <p className="sr-only" aria-live="polite">{SAID[stage]}</p>
      </div>

      <div className="ledger-foot">
        <button type="button" className="ledger-again" onClick={() => setRun(r => r + 1)} disabled={reduced}>↺ Again</button>
      </div>
    </section>
  );
}
