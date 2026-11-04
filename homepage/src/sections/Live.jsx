/* ─────────────────────────────────────────────────────────
 * LIVE EDITING (STORY.md, pillar 2; the owner's pick: comps A and B combined). The doubt: "changing the UI means
 * describing it to an agent or hunting for the class by hand." The proof: two edits on a running Members page, and the
 * same lines changing in the file beside it. Every gesture is the overlay's own (README "Reading" and "Blueprint:
 * fixing"): double-click words, type, Enter writes the source string; Alt+B, try an option, Enter takes it, A applies
 * it in one guarded write per file, undoable.
 *
 * STORYBOARD (starts when the pair scrolls into view; "Replay" plays it again; reduced motion shows the end)
 *      0ms   the page as written: "Members", rows 10px apart
 *    500ms   double-click: the heading is outlined and its words selected
 *   1100ms   typing: "Your team", a letter at a time
 *   2100ms   Enter: the heading's line in Members.jsx changes
 *   3300ms   Alt+B: the fix panel rises; the rows' 10px gaps are drawn
 *   4100ms   ↓ tries 12px: every row moves to it, live
 *   4800ms   ↑ tries 8px: every row moves again
 *   5500ms   Enter takes 8px
 *   6100ms   A applies: the row's line in Members.jsx changes; "2 lines written · Undo"
 * A keycap in the corner names each gesture as it happens.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import './live.css';

const TIMING = [0, 500, 1100, 2100, 3300, 4100, 4800, 5500, 6100];
const DONE = TIMING.length - 1;
const KEY = [null, 'Double-click', 'Type', 'Enter', 'Alt B', '↓', '↑', 'Enter', 'A'];
const TITLE = 'Your team';
const TYPE_MS = 80;
const OPTIONS = [
  { cls: 'gap-related', px: 8, note: '8px' },
  { cls: 'gap-[10px]', px: 10, note: 'now' },
  { cls: 'gap-control', px: 12, note: '12px' },
];
const SAID = [
  'A Members page, and its file Members.jsx beside it.',
  'You double-click the heading, Members.',
  'You type Your team.',
  'You press Enter. Line 15 of Members.jsx now says Your team.',
  'You press Alt+B. Plumber shows that the rows’ 10px gap isn’t on your spacing scale, with two options from your theme.',
  'You try 12px. Every row moves to it on the page.',
  'You try 8px. Every row moves again.',
  'You take 8px.',
  'You press A. Line 19 of Members.jsx now uses gap-related. Two lines written, and you can undo them.',
];
const PEOPLE = [
  { name: 'Ada Okafor', mail: 'ada@northwind.studio', role: 'Owner', h: 330 },
  { name: 'Ravi Menon', mail: 'ravi@northwind.studio', role: 'Editor', h: 230 },
  { name: 'Lena Brandt', mail: 'lena@northwind.studio', role: 'Viewer', h: 80 },
];

export function Live() {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pair = useRef(null);
  const [run, setRun] = useState(reduced ? 1 : 0);
  const [stage, setStage] = useState(reduced ? DONE : 0);
  const [typed, setTyped] = useState(reduced ? TITLE.length : 0);

  useEffect(() => {
    if (reduced) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(1); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(pair.current);
    return () => io.disconnect();
  }, [reduced]);
  useEffect(() => {
    if (!run || reduced) return;
    setStage(0); setTyped(0);
    const timers = TIMING.slice(1).map((t, i) => setTimeout(() => setStage(i + 1), t));
    for (let k = 1; k <= TITLE.length; k++) timers.push(setTimeout(() => setTyped(k), TIMING[2] + k * TYPE_MS));
    return () => timers.forEach(clearTimeout);
  }, [run, reduced]);

  const heading = stage < 2 ? 'Members' : TITLE.slice(0, typed);
  const headingWritten = stage >= 3;
  const gap = stage === 5 ? 12 : stage >= 6 ? 8 : 10;
  const pointed = stage === 4 ? 1 : stage === 5 ? 2 : stage >= 6 ? 0 : -1;
  const gapWritten = stage >= 8;

  return (
    <section className="live" aria-labelledby="live-title">
      <header className="live-head">
        <span className="live-eyebrow">Live editing</span>
        <h2 id="live-title" className="title">Change it on the page.<br />It’s changed in your code.</h2>
        <p className="lead">Retype a heading or try a space on your running app. Plumber writes <b>the exact words or class into the exact line of JSX</b> that made it. No prompt, no hunting for the file.</p>
      </header>

      <div ref={pair} className="live-pair" data-stage={stage}>
        {/* the running app */}
        <div className="live-browser surface">
          <div className="live-bar"><i /><i /><i /><span>localhost:5173/settings/members</span>
            <button type="button" className="live-replay" onClick={() => setRun(r => r + 1)} disabled={reduced}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8a4.5 4.5 0 1 0 1.4-3.3M3.5 2.5v2.4h2.4" /></svg>Replay
            </button>
          </div>
          <div className="live-page" aria-hidden="true">
            <div className="live-card">
              <h3>
                <span className="live-title" data-editing={stage >= 1 && stage < 3} data-selected={stage === 1}>
                  {heading}{stage === 2 && <i className="live-caret" />}
                </span>
              </h3>
              <p className="live-sub">3 of 5 seats · Northwind Studio</p>
              <ul className="live-people" style={{ '--gap': `${gap}px` }} data-drawn={stage >= 4 && stage < 8}>
                {PEOPLE.map(p => (
                  <li key={p.name}>
                    <i className="live-av" style={{ '--h': p.h }}>{p.name[0]}</i>
                    <span className="live-who"><b>{p.name}</b><small>{p.mail}</small></span>
                    <span className="live-role">{p.role}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* the reading the double-click opens: which component, which line */}
            <p className="live-reading" data-shown={stage >= 1 && stage < 3}><code>&lt;CardTitle&gt;</code><span>Members.jsx:15</span></p>
          </div>

          {/* the fix panel, Alt+B */}
          <div className="live-fix" data-shown={stage >= 4} aria-hidden="true">
            {/* at rest, the overlay's quiet dock; Alt+B turns it into the fix panel */}
            <p className="live-dock"><span><i />Plumber</span><span>Hold <kbd>Alt</kbd> to inspect · <kbd>Alt</kbd><kbd>B</kbd> to fix</span></p>
            <p className="live-cause">{gapWritten ? <><span className="chip chip-on"><i />Applied</span><span>1 file · undoable from the dock</span></> : <><code>gap-[10px]</code><span>isn’t on your spacing scale · 3 places</span></>}</p>
            <div className="live-options">
              {OPTIONS.map((o, i) => (
                <span key={o.cls} className="live-opt" data-pointed={pointed === i} data-taken={i === 0 && stage >= 7} data-now={i === 1}>
                  <i className="live-hatch" style={{ width: o.px * 1.4 }} />
                  <code>{i === 1 ? <s>{o.cls}</s> : o.cls}</code>
                  <small>{i === 0 && stage >= 7 ? 'taken' : o.note}</small>
                </span>
              ))}
            </div>
          </div>

          {/* the gesture, named as it happens */}
          {KEY[stage] && <span key={stage} className="live-key" aria-hidden="true"><kbd>{KEY[stage]}</kbd></span>}
        </div>

        {/* the file */}
        <div className="live-file code surface" aria-hidden="true">
          <header><span>src/Members.jsx</span><span className="live-written" data-shown={headingWritten}>{gapWritten ? '2 lines written' : '1 line written'} · <u>Undo</u></span></header>
          <ol>
            <Line n={12}><span className="t">export function</span> Members<span className="p">({'{'}</span> people <span className="p">{'}'})</span> <span className="p">{'{'}</span></Line>
            <Line n={13}>  <span className="t">return</span> <span className="p">(</span></Line>
            <Line n={14}>    <span className="p">&lt;</span><span className="t">Card</span><span className="p">&gt;</span></Line>
            <Diff n={15} on={headingWritten}
              was={<>      <span className="p">&lt;</span><span className="t">CardTitle</span><span className="p">&gt;</span><mark>Members</mark><span className="p">&lt;/</span><span className="t">CardTitle</span><span className="p">&gt;</span></>}
              now={<>      <span className="p">&lt;</span><span className="t">CardTitle</span><span className="p">&gt;</span><mark>Your team</mark><span className="p">&lt;/</span><span className="t">CardTitle</span><span className="p">&gt;</span></>} />
            <Line n={16}>      <span className="p">&lt;</span><span className="t">p</span> <span className="a">className</span><span className="p">=</span><span className="s">"text-ink-2"</span><span className="p">&gt;</span>3 of 5 seats<span className="p">&lt;/</span><span className="t">p</span><span className="p">&gt;</span></Line>
            <Line n={17}>      <span className="p">&lt;</span><span className="t">ul</span> <span className="a">className</span><span className="p">=</span><span className="s">"divide-y"</span><span className="p">&gt;</span></Line>
            <Line n={18}>        <span className="p">{'{'}</span>people.map<span className="p">(</span>p <span className="p">=&gt;</span> <span className="p">(</span></Line>
            <Diff n={19} on={gapWritten}
              was={<>          <span className="p">&lt;</span><span className="t">li</span> <span className="a">className</span><span className="p">=</span><span className="s">"flex <mark>gap-[10px]</mark> py-3"</span><span className="p">&gt;</span></>}
              now={<>          <span className="p">&lt;</span><span className="t">li</span> <span className="a">className</span><span className="p">=</span><span className="s">"flex <mark>gap-related</mark> py-3"</span><span className="p">&gt;</span></>} />
            <Line n={20}>            <span className="p">&lt;</span><span className="t">Avatar</span> <span className="a">person</span><span className="p">={'{'}</span>p<span className="p">{'}'}</span> <span className="p">/&gt;</span></Line>
          </ol>
        </div>
        <p className="sr-only" aria-live="polite">{SAID[stage]}</p>
      </div>

      <ul className="live-steps">
        <li><span><kbd>Double-click</kbd></span><b>Edit words</b><span>Type over them. Enter writes the string in your source.</span></li>
        <li><span><kbd>Alt</kbd><kbd>B</kbd></span><b>Try a space live</b><span>Every place moves as you choose between your theme’s steps.</span></li>
        <li><span><kbd>A</kbd></span><b>Apply</b><span>One guarded write per file, hot-reloaded, undoable.</span></li>
      </ul>
    </section>
  );
}

const Line = ({ n, children }) => <li style={{ '--n': `"${n}"` }}><span className="sign"> </span><span>{children}</span></li>;

/* A line as written, and once it's written over, the line it was and the line it is, the way a diff shows them. The
 * new row opens under the old one; the file keeps room for it from the start, so nothing outside it moves. */
function Diff({ n, on, was, now }) {
  return (
    <>
      <li style={{ '--n': `"${n}"` }} data-d={on ? '-' : undefined} className="live-was"><span className="sign">{on ? '−' : ' '}</span><span>{was}</span></li>
      <li style={{ '--n': `"${n}"` }} data-d="+" className="live-now" data-shown={on}><span className="sign">+</span><span key={String(on)}>{now}</span></li>
    </>
  );
}
