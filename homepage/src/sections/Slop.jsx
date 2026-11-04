/* ─────────────────────────────────────────────────────────
 * KEEP AI SLOP OUT OF YOUR APP (STORY.md, pillar 1; the owner's pick, comp A). The doubt: "my agent writes UI fast,
 * and it makes up values everywhere." The proof is an agent session: the agent writes an invite row with values it
 * made up, Plumber's hook catches each one with the fix from the theme, the agent applies them, the next check is
 * clean. Plumber's words are its own: "`x` hardcodes 13px" (src/rules/provenance.ts), "N new", the --agent format's
 * "replace with". Set in the homepage's foundations (src/foundations/foundations.css).
 *
 * STORYBOARD (starts when the session scrolls into view; "Replay" plays it again; reduced motion shows the end)
 *      0ms   your prompt
 *    500ms   the agent's edit: its three lines arrive one after another, the made-up values marked
 *   1500ms   the hook runs: "checking", then "4 new"; the four findings arrive one after another
 *   3400ms   the agent applies them: in its edit, each made-up value turns into the theme's class, one at a time
 *   4600ms   the hook runs again: 0 new
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import './slop.css';

const TIMING = [0, 500, 1500, 2100, 3400, 4600];
const FIXES = [
  { slop: 'gap-[13px]', value: '13px', fix: 'gap-stack', px: '24px', why: 'between groups' },
  { slop: 'px-[9px]', value: '9px', fix: 'px-control', px: '12px', why: 'a control’s padding' },
  { slop: 'text-[15px]', value: '15px', fix: 'text-body', px: '16px', why: 'body text' },
  { slop: 'bg-[#3b78d8]', value: '#3b78d8', fix: 'bg-accent', px: '', why: 'what you can do' },
];
const SAID = [
  'You ask the agent to add an invite row to the Members card.',
  'The agent edits Members.jsx, with four values it made up: gap 13px, padding 9px, text 15px, and the colour #3b78d8.',
  'Plumber checks the change.',
  'Four new findings, each with the class to use from your theme.',
  'The agent applies all four fixes.',
  'Plumber checks again: nothing new.',
];

export function Slop() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const session = useRef(null);
  const [run, setRun] = useState(reduced ? 1 : 0);
  const [stage, setStage] = useState(reduced ? TIMING.length - 1 : 0);

  useEffect(() => {
    if (reduced) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(1); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(session.current);
    return () => io.disconnect();
  }, [reduced]);
  useEffect(() => {
    if (!run || reduced) return;
    setStage(0);
    const timers = TIMING.slice(1).map((t, i) => setTimeout(() => setStage(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, [run, reduced]);

  const applied = stage >= 4;
  return (
    <section className="slop" aria-labelledby="slop-title">
      <header className="slop-head">
        <span className="slop-eyebrow">Guardrails for agents</span>
        <h2 id="slop-title" className="title">Write directly to your src file.</h2>
        <p className="lead">After every edit, Plumber checks what changed against your theme. <b>Every hardcoded value comes back with the exact fix</b>, so the agent changes corrects itself before you ever see it.</p>
        <ul className="slop-facts">
          <li><b>Runs on every edit</b><span>A hook in Claude Code or Cursor, set up by <code>plumber install --hooks</code>.</span></li>
          <li><b>Exact fixes, not advice</b><span>The file, the line, the class to write.</span></li>
          <li><b>Only what’s new</b><span>Adopt plumber without adding breaking your old code</span></li>
        </ul>
      </header>

      <div ref={session} className="session surface" data-stage={stage}>
        <header className="session-head">
          <span><i aria-hidden="true" />Agent session</span>
          <button type="button" className="session-replay" onClick={() => setRun(r => r + 1)} disabled={reduced}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 2.5v2.4h2.4" /></svg>Replay
          </button>
        </header>
        <div className="session-body" aria-hidden="true">
          <p className="turn-you"><span>You</span>Add an invite row to the Members card.</p>

          <div className="step" data-shown={stage >= 1}>
            <p className="turn-line"><i />Edited <code>src/Members.jsx</code> <span className="delta"><b>+4</b> <b>−1</b></span></p>
            <div className="code mini">
              <ol style={{ counterReset: 'ln 21' }}>
                <li data-d="+" style={{ '--k': 0 }}><span className="sign">+</span><span><span className="p">&lt;</span><span className="t">form</span> <span className="a">className</span><span className="p">=</span><span className="s">"flex <Val i={0} applied={applied} />"</span><span className="p">&gt;</span></span></li>
                <li data-d="+" style={{ '--k': 1 }}><span className="sign">+</span><span>  <span className="p">&lt;</span><span className="t">input</span> <span className="a">className</span><span className="p">=</span><span className="s">"<Val i={1} applied={applied} /> <Val i={2} applied={applied} />"</span> <span className="p">/&gt;</span></span></li>
                <li data-d="+" style={{ '--k': 2 }}><span className="sign">+</span><span>  <span className="p">&lt;</span><span className="t">button</span> <span className="a">className</span><span className="p">=</span><span className="s">"<Val i={3} applied={applied} />"</span><span className="p">&gt;</span>Invite<span className="p">&lt;/</span><span className="t">button</span><span className="p">&gt;</span></span></li>
              </ol>
            </div>
          </div>

          <div className="hook step" data-shown={stage >= 2}>
            <p className="hook-head">
              <span>After edit</span><code>plumber check --changed --agent</code>
              {stage < 3 ? <span className="hook-busy">checking</span> : <span className="chip chip-off hook-count"><i />4 new</span>}
            </p>
            <ol className="hook-findings" data-shown={stage >= 3}>
              {FIXES.map((f, i) => (
                <li key={f.slop} style={{ '--k': i }} data-done={applied}>
                  <code>{f.slop}</code> hardcodes {f.value}
                  <span>replace with <code className="fix">{f.fix}</code>{f.px && ` ${f.px}`} · {f.why}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="step" data-shown={stage >= 4}>
            <p className="turn-line"><i />Applied Plumber’s 4 fixes to <code>src/Members.jsx</code></p>
          </div>

          <div className="hook hook-clean step" data-shown={stage >= 5}>
            <p className="hook-head"><span>After edit</span><code>plumber check --changed --agent</code><span className="chip chip-on hook-count"><i />0 new</span></p>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">{SAID[stage]}</p>
      </div>
    </section>
  );
}

/* One value in the agent's edit: made up, then (once applied) the theme's class, each a beat after the last. Defined
 * out here so a new stage never remounts it and replays its swap. */
function Val({ i, applied }) {
  return (
    <mark key={applied ? 'f' : 's'} className="slop-val" data-on={applied} style={{ animationDelay: applied ? `${i * 140}ms` : undefined }}>
      {applied ? FIXES[i].fix : FIXES[i].slop}
    </mark>
  );
}
