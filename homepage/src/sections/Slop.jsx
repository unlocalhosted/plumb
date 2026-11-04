/* ─────────────────────────────────────────────────────────
 * KEEP AI SLOP OUT OF YOUR APP (STORY.md, section 2; the owner's pick, comp A; revised for the insights lead). The
 * doubt: "my agent writes UI fast, and it makes up values and misses the details." The proof is an agent session that
 * shows what Plumber really does today, each check where it really runs:
 *   - the edit hook (`plumber install --hooks`) runs `plumber check --changed --agent`, which reads source: it catches
 *     the values the agent made up, in its own words ("`x` hardcodes 13px", src/rules/provenance.ts);
 *   - `plumber craft --url` reads the running page the way the overlay does: it catches the craft the agent missed, in
 *     the overlay's own words (overlay/src/words.js: "Grey shadow on colour", "Icon looks off-centre").
 * Set in the homepage's foundations.
 *
 * STORYBOARD (starts when the session scrolls into view; "Replay" plays it again; reduced motion shows the end)
 *      0ms   your prompt
 *    500ms   the agent's edit arrives a line at a time; what's wrong in it is marked
 *   1500ms   the hook runs check: 2 new, made-up values, each with the class from your theme
 *   2700ms   the agent runs craft on the page: 2 findings, a grey shadow and a box-centred icon
 *   4000ms   the agent applies all four: in its edit, each wrong thing turns into its fix, one at a time
 *   5300ms   both run again: 0 new, 0 findings
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import './slop.css';

const TIMING = [0, 500, 1500, 1900, 2700, 3100, 4000, 5300];
// the agent's edit: four things wrong, two in the code's values, two only visible on the page
const FIXES = [
  { slop: 'gap-[13px]', fix: 'gap-stack' },
  { slop: 'bg-[#3b78d8]', fix: 'bg-accent' },
  { slop: 'shadow-lg', fix: 'shadow-[0_10px_15px_-3px_#7a541f4d]' },
  { slop: '<PlayIcon />', fix: '<PlayIcon className="translate-x-[2px]" />' },
];
const CHECK = [
  { what: '`gap-[13px]` hardcodes 13px', fix: 'replace with gap-stack · 24px · between groups' },
  { what: '`bg-[#3b78d8]` hardcodes #3b78d8', fix: 'replace with bg-accent · what you can do' },
];
const CRAFT = [
  { what: 'Grey shadow on colour', line: 'A grey shadow on #f0c98a looks dirty. Tint it with that colour.' },
  { what: 'Icon looks off-centre', line: 'Centred by its box, the icon looks off. Move it 2px right.' },
];
const SAID = [
  'You ask the agent to add an invite row and a welcome video to the Members card.',
  'The agent edits Members.jsx.',
  'After the edit, Plumber’s hook checks the code.',
  'Two made-up values, each with the class to use from your theme.',
  'The agent runs plumber craft on the running page.',
  'Two craft problems: a grey shadow on a coloured card, and a play icon centred by its box.',
  'The agent applies all four fixes.',
  'Both checks run again: nothing new, no findings.',
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

  const applied = stage >= 6;
  const code = (s, k) => s.split('`').map((part, i) => (i % 2 ? <code key={`${k}${i}`} className="slop-off">{part}</code> : part));

  return (
    <section className="slop" aria-labelledby="slop-title">
      <header className="slop-head">
        <span className="slop-eyebrow">Guardrails for agents</span>
        <h2 id="slop-title" className="title">Your agent writes the UI. Plumber keeps it yours.</h2>
        <p className="lead">Agents make up values and miss the details: a grey shadow on a coloured card, an icon centred by its box. <b>Plumber catches both, with the exact fix</b>, so the agent corrects itself before you ever see it.</p>
        <ul className="slop-facts">
          <li><b>The code, after every edit</b><span>A hook in Claude Code or Cursor runs <code>plumber check</code>: <code>plumber install --hooks</code>.</span></li>
          <li><b>The page, like a design engineer</b><span><code>plumber craft</code> reads the running page the way the overlay does.</span></li>
          <li><b>Only what’s new</b><span>Today’s debt is recorded once and left alone.</span></li>
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
          <p className="turn-you"><span>You</span>Add an invite row and a welcome video to the Members card.</p>

          <div className="step" data-shown={stage >= 1}>
            <p className="turn-line"><i />Edited <code>src/Members.jsx</code> <span className="delta"><b>+5</b> <b>−1</b></span></p>
            <div className="code mini">
              <ol style={{ counterReset: 'ln 21' }}>
                <li data-d="+" style={{ '--k': 0 }}><span className="sign">+</span><span><span className="p">&lt;</span><span className="t">form</span> <span className="a">className</span><span className="p">=</span><span className="s">"flex <Val i={0} applied={applied} />"</span><span className="p">&gt;</span></span></li>
                <li data-d="+" style={{ '--k': 1 }}><span className="sign">+</span><span>  <span className="p">&lt;</span><span className="t">button</span> <span className="a">className</span><span className="p">=</span><span className="s">"<Val i={1} applied={applied} />"</span><span className="p">&gt;</span>Invite<span className="p">&lt;/</span><span className="t">button</span><span className="p">&gt;</span></span></li>
                <li data-d="+" style={{ '--k': 2 }}><span className="sign">+</span><span><span className="p">&lt;</span><span className="t">div</span> <span className="a">className</span><span className="p">=</span><span className="s">"bg-saffron-100 <Val i={2} applied={applied} />"</span><span className="p">&gt;</span></span></li>
                <li data-d="+" style={{ '--k': 3 }}><span className="sign">+</span><span>  <span className="p">&lt;</span><span className="t">button</span> <span className="a">aria-label</span><span className="p">=</span><span className="s">"Play welcome"</span><span className="p">&gt;</span><Val i={3} applied={applied} code /><span className="p">&lt;/</span><span className="t">button</span><span className="p">&gt;</span></span></li>
              </ol>
            </div>
          </div>

          <div className="hook step" data-shown={stage >= 2}>
            <p className="hook-head">
              <span>After edit</span><code>plumber check --changed --agent</code>
              {stage < 3 ? <span className="hook-busy">checking</span> : <span className="chip chip-off hook-count"><i />2 new</span>}
            </p>
            <ol className="hook-findings" data-shown={stage >= 3}>
              {CHECK.map((f, i) => <li key={f.what} style={{ '--k': i }} data-done={applied}>{code(f.what, 'c')}<span>{f.fix}</span></li>)}
            </ol>
          </div>

          <div className="hook step" data-shown={stage >= 4}>
            <p className="hook-head">
              <span>Agent ran</span><code>plumber craft --url localhost:5173/members</code>
              {stage < 5 ? <span className="hook-busy">reading the page</span> : <span className="chip chip-off hook-count"><i />2 findings</span>}
            </p>
            <ol className="hook-findings" data-shown={stage >= 5}>
              {CRAFT.map((f, i) => <li key={f.what} style={{ '--k': i }} data-done={applied}><b className="slop-craft">{f.what}</b><span>{f.line}</span></li>)}
            </ol>
          </div>

          <div className="step" data-shown={stage >= 6}>
            <p className="turn-line"><i />Applied all 4 fixes to <code>src/Members.jsx</code></p>
          </div>

          <div className="hook hook-clean step" data-shown={stage >= 7}>
            <p className="hook-head"><span>Again</span><code>check · craft</code><span className="chip chip-on hook-count"><i />0 new · 0 findings</span></p>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">{SAID[stage]}</p>
      </div>
    </section>
  );
}

/* One wrong thing in the agent's edit, then (once applied) its fix, each a beat after the last. Defined out here so a
 * new stage never remounts it and replays its swap. */
function Val({ i, applied, code }) {
  const text = applied ? FIXES[i].fix : FIXES[i].slop;
  return (
    <mark key={applied ? 'f' : 's'} className="slop-val" data-on={applied} data-code={!!code} style={{ animationDelay: applied ? `${i * 140}ms` : undefined }}>
      {text}
    </mark>
  );
}
