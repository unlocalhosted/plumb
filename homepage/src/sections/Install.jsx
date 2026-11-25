/* ─────────────────────────────────────────────────────────
 * INSTALL (page-plan.html, section 4; the owner's pick, comp A "three lines"). Medium: type. The README's Quick start
 * as three large command lines, each with what it does beside it, then "Run your dev server. Hold Alt." Every command
 * and requirement is the README's own: install; `plumber init` writes the theme and config and records today's
 * findings as the baseline; `plumber install --overlay --write` wires Vite or Next.js; `install --hooks` for agents.
 *
 * The one motion: the Alt keycap presses down every few seconds, and while it's held the element beside it is outlined
 * with its component and how many values are off the scale, as the overlay does (README "Reading"). It runs only while
 * on screen; reduced motion shows the outline, still.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import './install.css';
import { useReduced } from '../reduced.js';

const LINES = [
  { cmd: 'npm install -D @unlocalhosted/react-plumber', bold: '@unlocalhosted/react-plumber', what: 'adds React Plumber to your dev dependencies', vis: 'pkg' },
  { cmd: 'npx plumber init', bold: 'init', what: 'asks for your rules, writes your config and records today’s problems as the baseline', vis: 'init' },
  { cmd: 'npx plumber install --overlay --write', bold: 'install --overlay --write', what: 'wires the overlay into Vite or Next.js, and shows the diff', vis: 'vite' },
];
// what a person pastes into their agent (Claude Code, Cursor, Codex). It goes further than the three commands,
// because nobody is watching: find the right folder first, check what each step wrote, get the overlay on the running
// page, and report. Every command, file name and message in it is the README's own
const FOR_AGENTS = `Set up React Plumber in this project, all the way to its overlay showing on my running page. Check each step before the next one, and tell me about anything that doesn't match.

BEFORE YOU START
- Find the app to set up. In a monorepo that is the package with the Vite or Next.js config and its own package.json, not the repository root. Run every command from that folder, with this project's package manager (pnpm exec, yarn or bunx in place of npx).
- Check it can run here: Node 22.18 or newer, Vite or Next.js, and Tailwind v4 or plain CSS. If one is missing, stop and tell me. With Tailwind v3, CSS Modules or CSS-in-JS it still sets up, but not everything is judged; "npx plumber doctor" says what is supported.
- Find where the source lies: the folder with the JSX, the CSS file the app loads first, and where the design tokens are (@theme, :root or a theme file). You will check what init wrote against these.

SET UP
1. npm install -D @unlocalhosted/react-plumber
2. npx plumber init --yes
   It takes every suggested rule, writes plumber.config.ts and records today's problems as the baseline. Read the config it wrote. The token sources must be the files you found. Don't add "source" unless it read the wrong code.
3. npx plumber install --overlay --write
   It wires the overlay into Vite or Next.js and prints the diff. Read the diff.
   - Vite: plumb() is in plugins before react(), and react() is still there.
   - Next.js: the config is wrapped in withPlumb, <PlumbOverlay /> is inside <body> in the root layout, and the route file keeps its .plumb.ts name.
4. npx plumber install
   It writes React Plumber's instructions for you and, in Claude Code or Cursor, a hook that checks each of your edits.
5. npx plumber doctor
   It lists what is set up, with one command for each thing that isn't. Go through every line it flags. Ask me before "plumber fix <id>" changes a file.

SEE IT ON THE PAGE
6. Start the dev server the way this project does. A small bar should sit in a corner of the page. If you can open a browser, load the page and look for it. If you can't, give me the URL and ask me to hold Alt over something.
7. If the bar is missing, or says setup isn't finished, read what it says and fix that.
   - "Source stamping isn't running": plumb() is not before the plugin that compiles JSX, or the page's HTML was made outside the dev server.
   - "Turn on React Fast Refresh": the Vite config has no React plugin.
   - The dev server stops and names a line to move: move it.

FINISH
8. Run "npx plumber check --agent". Then tell me which folder you set up, the rules init chose, the files that changed, whether you saw the overlay, and what the check found.

Never change the config, the ledger or the theme to make a check pass. Leave the problems it finds for me to choose.`;
const HOLD = { every: 3200, held: 1700 };

export function Install() {
  const reduced = useReduced();
  const hold = useRef(null);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (reduced) { setHeld(true); return; }
    let timers = [], interval = 0;
    const press = () => { setHeld(true); timers.push(setTimeout(() => setHeld(false), HOLD.held)); };
    const io = new IntersectionObserver(([e]) => {
      clearInterval(interval); timers.forEach(clearTimeout); timers = [];
      if (e.isIntersecting) { timers.push(setTimeout(press, 600)); interval = setInterval(press, HOLD.every); } else setHeld(false);
    }, { threshold: 0.5 });
    io.observe(hold.current);
    return () => { io.disconnect(); clearInterval(interval); timers.forEach(clearTimeout); };
  }, [reduced]);

  return (
    <section className="ins" aria-labelledby="ins-title">
      <ForAgents><h2 id="ins-title" className="title">Set up in three commands</h2></ForAgents>
      <ol className="ins-lines">
        {LINES.map(l => (
          <li key={l.cmd}>
            <span className="ins-prompt" aria-hidden="true">$</span>
            <code className="ins-cmd">{l.cmd.slice(0, l.cmd.length - l.bold.length)}<b>{l.bold}</b></code>
            <span className="ins-meta"><Copy text={l.cmd} /><span className="ins-what">{l.what}</span></span>
            <span className="ins-vis" aria-hidden="true"><Visual kind={l.vis} /></span>
          </li>
        ))}
      </ol>

      <div ref={hold} className="ins-then">
        <p className="display">Run your dev server.<br />Hold <span className="ins-alt" data-held={held}>Alt</span>.</p>
        <span className="ins-vis ins-vis-hold" aria-hidden="true"><Visual kind="hold" held={held} /></span>
      </div>
      <p className="ins-agent">Working with an agent? <code>npx plumber install --hooks</code> checks each edit in Claude Code or Cursor.</p>
      <p className="ins-req">Vite and Next.js · Tailwind v4 or plain CSS · Node 22.18+</p>
    </section>
  );
}

/* Copy one command. States: rest, hover, focus, pressed, copied (1.6s), couldn't copy (the command is selected). */
function Copy({ text }) {
  const [state, setState] = useState('rest');
  const timer = useRef(0), btn = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    clearTimeout(timer.current);
    let next = 'copied';
    try { await navigator.clipboard.writeText(text); }
    catch {
      const code = btn.current.closest('li').querySelector('.ins-cmd');
      const range = document.createRange(); range.selectNodeContents(code);
      getSelection().removeAllRanges(); getSelection().addRange(range); next = 'failed';
    }
    setState(next);
    timer.current = setTimeout(() => setState('rest'), next === 'failed' ? 4000 : 1600);
  };
  return (
    <>
      <button ref={btn} type="button" className="ins-copy" data-state={state} onClick={copy} aria-label={`Copy: ${text}`}>
        <i className="ins-word" key={state}>{state === 'copied' ? 'Copied' : state === 'failed' ? 'Press ⌘C' : 'Copy'}</i>
      </button>
      <span className="sr-only" role="status" aria-live="polite">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Couldn’t copy. The command is selected.' : ''}</span>
    </>
  );
}

/* The other way in: hand the whole set-up to an agent. One action (the site's soft block, as on the hero's command),
 * with what it does said beside it and the prompt itself there to read before it is copied.
 * It sits beside the section's heading. The label changes with a small roll (the new word rises in out of a blur).
 * States: rest, hover, focus, pressed, copied (mint, and the line beside it says what to do next, 4s), couldn't copy
 * (the prompt opens with its text selected and the button says Press ⌘C). */
function ForAgents({ children }) {
  const [state, setState] = useState('rest');
  const timer = useRef(0), read = useRef(null), words = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    clearTimeout(timer.current);
    let next = 'copied';
    try { await navigator.clipboard.writeText(FOR_AGENTS); }
    catch {
      read.current.open = true;
      const range = document.createRange(); range.selectNodeContents(words.current);
      getSelection().removeAllRanges(); getSelection().addRange(range); next = 'failed';
    }
    setState(next);
    timer.current = setTimeout(() => setState('rest'), 4000);
  };
  return (
    <div className="ins-hand" data-state={state}>
      <div className="ins-hand-row">
        {children}
        <button type="button" className="ins-hand-copy s-btn" data-state={state} onClick={copy}>
          <span><i className="ins-word" key={state}>{state === 'copied' ? 'Copied' : state === 'failed' ? 'Press ⌘C' : 'Copy the prompt'}</i></span>
        </button>
      </div>
      <div>
        <p className="ins-hand-say" role="status">
          {state === 'copied' ? <b>Now paste it into your agent.</b>
            : state === 'failed' ? <b>Couldn’t copy. The prompt is selected below.</b>
            : <><b>Or let your agent do it.</b> One prompt for Claude Code, Cursor or Codex. It finds the right folder, sets up the overlay, checks each step and tells you what it found.</>}
        </p>
      </div>
      <details ref={read} className="ins-hand-read">
        <summary>Read the prompt first</summary>
        <pre ref={words} tabIndex={0}>{FOR_AGENTS}</pre>
      </details>
    </div>
  );
}

/* What each step does, drawn small and true to the README. */
function Visual({ kind, held }) {
  if (kind === 'pkg') return (
    <div className="v"><p className="v-name">package.json</p>
      <pre><span className="v-p">"devDependencies": {'{'}</span><span className="v-add">+  "@unlocalhosted/react-plumber": "^0.6.0"</span><span className="v-p">{'}'}</span></pre></div>
  );
  if (kind === 'init') return (
    <div className="v"><p className="v-name">written by init</p>
      <ul className="v-tree">
                <li><i className="v-ico v-ts" />plumber.config.ts</li>
        <li><i className="v-ico v-dir" />.plumber/ledger.jsonl <small>today’s baseline</small></li>
      </ul></div>
  );
  if (kind === 'vite') return (
    <div className="v"><p className="v-name">vite.config.ts</p>
      <pre><span className="v-del">-  plugins: [react()]</span><span className="v-add">+  plugins: [plumb(), react()]</span></pre></div>
  );
  return (
    <div className="v v-hold" data-held={held}>
      <div className="v-card"><span className="v-outline" /><b>Members</b><span className="v-row" /><span className="v-row" />
        <span className="v-tag"><code>&lt;MembersCard&gt;</code> · 2 off your tokens</span></div>
      <svg className="v-ptr" viewBox="0 0 16 22"><path d="M1 1v17l4.5-4.2 3 7 2.6-1.1-3-6.8H14z" /></svg>
    </div>
  );
}
