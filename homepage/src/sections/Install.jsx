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
// what a person pastes into their agent (Claude Code, Cursor, Codex): the same three commands, with init taking its
// suggested answers because nobody is at the keyboard, then the hooks and a first check. Every line is the README's
const FOR_AGENTS = `Set up React Plumber in this project. It needs Vite or Next.js, Tailwind v4 or plain CSS, and Node 22.18 or newer.

Run these in order, with this project's package manager:
1. npm install -D @unlocalhosted/react-plumber
2. npx plumber init --yes
   (takes every suggested rule, writes plumber.config.ts and records today's problems as the baseline)
3. npx plumber install --overlay --write
   (wires the overlay into Vite or Next.js and prints the diff)
4. npx plumber install --hooks
   (checks each of your edits from now on)

Then run "npx plumber check --agent" and tell me what it found. Show me the rules init chose so I can correct them. Never change the config, the ledger or the theme to make a check pass.`;
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
      <h2 id="ins-title" className="title">Set up in three commands</h2>
      <p className="ins-hand"><Copy text={FOR_AGENTS} label="Copy for agents" name="the set-up prompt for your agent" /><span className="ins-what">or paste one prompt into Claude Code, Cursor or Codex and it runs all of this</span></p>
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
function Copy({ text, label = 'Copy', name = text }) {
  const [state, setState] = useState('rest');
  const timer = useRef(0), btn = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    clearTimeout(timer.current);
    let next = 'copied';
    try { await navigator.clipboard.writeText(text); }
    catch {
      // a command is selected for ⌘C; the prompt has no text on the page to select, so its button just says it failed
      const code = btn.current.closest('li')?.querySelector('.ins-cmd');
      if (code) { const range = document.createRange(); range.selectNodeContents(code); getSelection().removeAllRanges(); getSelection().addRange(range); }
      next = code ? 'failed' : 'blocked';
    }
    setState(next);
    timer.current = setTimeout(() => setState('rest'), next === 'copied' ? 1600 : 4000);
  };
  return (
    <>
      <button ref={btn} type="button" className="ins-copy" data-state={state} onClick={copy} aria-label={`Copy: ${name}`}>
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Press ⌘C' : state === 'blocked' ? 'Couldn’t copy' : label}
      </button>
      <span className="sr-only" role="status" aria-live="polite">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Couldn’t copy. The command is selected.' : state === 'blocked' ? 'Couldn’t copy.' : ''}</span>
    </>
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
