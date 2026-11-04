/* ─────────────────────────────────────────────────────────
 * START ON THE REPO YOU HAVE. The doubt it answers: "my app is a mess; this will fail on everything." It won't:
 * Plumber writes down today's problems and leaves them be; only new ones fail. Told as one short play on its own
 * field, with the CLI's own words (src/cli-report.ts) and the homepage's own count (94, from `plumber check` here).
 *
 * STORYBOARD (starts when the field scrolls into view; "Again" replays it; reduced motion shows the end)
 *      0ms   the jar fills: today's 94 problems, written down. The check passes.
 *   1600ms   a pull request slides in, its three lines one after another
 *   3000ms   the third line is off the theme: it turns coral, the check fails, "1 new finding"
 *   4800ms   the line fixes itself in the diff (px-[13px] → px-control); the check passes again
 *   6400ms   one old problem gets fixed on the way: a dot leaves the jar, mint, and 94 becomes 93
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import './ledger.css';

const DEBT = 94; // the homepage's own known debt, from `plumber check` on this repo
const TIMING = [0, 1600, 3000, 4800, 6400];
const LINES = [
  { code: '<Dialog className="p-card gap-related">' },
  { code: '<Avatar className="size-avatar" />' },
  { code: <>{'<Button className="'}<mark>px-[13px]</mark>{'">Invite</Button>'}</>, fixed: <>{'<Button className="'}<mark>px-control</mark>{'">Invite</Button>'}</> },
];
const CAPTION = [
  <>Day one: today’s <b>94 problems</b> are written down. Nothing fails.</>,
  <>Then a pull request comes in.</>,
  <>One new value isn’t on your theme. <b>Only that fails.</b></>,
  <>Fixed in the same pull request. It passes.</>,
  <>Fix an old one while you’re there, and the list gets shorter.</>,
];

export function Ledger() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const field = useRef(null);
  const [run, setRun] = useState(reduced ? 1 : 0); // 0 waiting to be seen; each replay counts up, to restart
  const [stage, setStage] = useState(reduced ? TIMING.length - 1 : 0);

  useEffect(() => {
    if (reduced) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(1); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(field.current);
    return () => io.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!run || reduced) return;
    setStage(0);
    const timers = TIMING.slice(1).map((t, i) => setTimeout(() => setStage(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, [run, reduced]);

  const failing = stage === 2;
  const debt = stage >= 4 ? DEBT - 1 : DEBT;

  return (
    <section className="ledger" aria-labelledby="ledger-title">
      <div className="ledger-head">
        <h2 id="ledger-title" className="m-0">Start on the repo you have.</h2>
        <p>Plumber writes down today’s problems and leaves them be. From then on, only new ones fail.</p>
      </div>

      <div ref={field} className="ledger-field pl-light" data-run={run} data-stage={stage}>
        <div className="field-glow" aria-hidden="true"><i /></div>

        {/* the jar: what was there on day one, kept, not failed */}
        <figure className="ledger-jar" aria-label={`Known problems: ${debt}`}>
          <figcaption><span className="ledger-tag">known</span><b className="tabular" key={debt}>{debt}</b></figcaption>
          <div className="ledger-dots" aria-hidden="true">
            {Array.from({ length: DEBT }, (_, i) => <i key={i} style={{ '--i': i }} data-out={stage >= 4 && i === 37} />)}
          </div>
        </figure>

        {/* the pull request: three new lines, one of them off the theme */}
        <div className="ledger-pr" data-shown={stage >= 1}>
          <header><span className="ledger-branch">invite-people</span><span className="tabular">+3</span></header>
          <ol>
            {LINES.map((l, i) => {
              const off = l.fixed && stage === 2, done = l.fixed && stage >= 3;
              return (
                <li key={i} style={{ '--i': i }} data-off={off} data-done={done}>
                  <span className="ledger-sign" aria-hidden="true">+</span>
                  <code>{done ? l.fixed : l.code}</code>
                  {off && <em className="ledger-flag">13px · not on your theme</em>}
                </li>
              );
            })}
          </ol>
          {/* the check's verdict, as a stamp on the pull request */}
          {stage >= 2 && (
            <span key={`${run}-${stage}`} className="ledger-stamp" data-pass={!failing}>{failing ? '✕ fails' : '✓ passes'}</span>
          )}
        </div>

        {/* the check, in its own words */}
        <pre className="ledger-term tabular" aria-label="What plumber check prints">
          <span>$ plumber check</span>
          {failing ? <span className="ledger-term-off">1 new finding</span> : <span>Nothing new since your baseline.</span>}
          <span>Known debt: {debt} places, unchanged</span>
        </pre>
      </div>

      <div className="ledger-foot">
        <p className="ledger-caption" aria-live="polite">{CAPTION[stage]}</p>
        <button type="button" className="ledger-again" onClick={() => setRun(r => r + 1)} disabled={reduced}>↺ Again</button>
      </div>
    </section>
  );
}
