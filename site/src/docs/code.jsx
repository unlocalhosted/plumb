/* ─────────────────────────────────────────────────────────
 * CODE — every block of code in the docs (site/DOCS.md §3.2, §3.3)
 *
 *  header    what the block is: "Terminal" for shell, the language otherwise; Copy, always visible
 *  terminal  one command per row behind a "$" that can't be selected; a trailing "# comment" moves above its
 *            command, muted, so nothing runs off the edge. Copy takes the commands only.
 *  source    coloured by a small tokenizer: keywords, strings, comments, numbers, called functions. Long lines
 *            scroll sideways inside the block; the page never does.
 *  copy      a morphing icon: see CopyButton's storyboard; keyboard reachable
 * ───────────────────────────────────────────────────────── */
import { Fragment, isValidElement, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SPRING } from '../site/motion.js';

const SHELL = ['sh', 'bash', 'shell', 'zsh', 'console'];
const LABEL = { ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX', json: 'JSON', css: 'CSS', md: 'Markdown', yaml: 'YAML', yml: 'YAML', text: 'Text' };

/* COPY — what copying does: a duplicate is made, and the original stays where it is.
 *
 *  rest      one sheet with two lines on it: this block
 *  copy      0ms    a duplicate peels off the sheet and settles up and to the right, behind it, on `pop`:
 *                   the icon becomes the copy glyph because a copy now exists. The original never moves.
 *            0ms    in the block, a green line draws under exactly the text that went to the clipboard, left to
 *                   right (240ms); on a terminal block that's the commands, not the "$" or the comments
 *            40ms   "Copy" → "Copied", crossfaded in a slot as wide as the longer word
 *            1.6s   the line fades and the duplicate fades out where it is (the clipboard still holds the copy)
 *  failed    the duplicate starts to peel and snaps back to the sheet; the label reads "Not copied"
 *  reduced motion: the duplicate and the line appear and go without travel
 */
export function CopyButton({ text, onCopied, className = '' }) {
  const [state, setState] = useState('rest'); // rest | copied | failed
  const reduce = useReducedMotion();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      onCopied?.();
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('rest'), 1600);
  };
  const done = state === 'copied';
  const label = done ? 'Copied' : state === 'failed' ? 'Not copied' : 'Copy';
  // the duplicate: behind the original until a copy exists, then offset up and to the right
  const dup = done ? { x: 3, y: -3, opacity: 1 } : state === 'failed' ? { x: [0, 2, 0], y: [0, -2, 0], opacity: [0, 1, 0] } : { x: 0, y: 0, opacity: 0 };
  const sheet = (
    <>
      <rect x="1.5" y="4.5" width="10" height="10" rx="2" />
      <path d="M4.5 8.5 H8.5 M4.5 11.5 H7" />
    </>
  );
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={done ? 'Copied' : 'Copy to clipboard'}
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-code-keyword ${done ? 'text-code-string' : state === 'failed' ? 'text-code-flag' : 'text-code-comment hover:bg-code-foreground/10 hover:text-code-foreground'} ${className}`}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 overflow-visible" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <motion.g initial={false} animate={dup} transition={reduce ? { duration: 0 } : state === 'failed' ? { duration: 0.32 } : done ? SPRING.pop : { duration: 0.2 }}>
          {sheet}
        </motion.g>
        {/* the original: filled with the code ground so the duplicate sits behind it; it never moves */}
        <g className="fill-code">{sheet}</g>
      </svg>
      {/* one slot as wide as the longest word, so the button keeps its width */}
      <span className="grid">
        <span className="invisible col-start-1 row-start-1">Not copied</span>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={label}
            className="col-start-1 row-start-1 text-right"
            initial={{ opacity: 0, y: reduce ? 0 : 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.16, delay: reduce ? 0 : 0.04 } }}
            exit={{ opacity: 0, y: reduce ? 0 : -4, transition: { duration: reduce ? 0 : 0.12 } }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}

// A line drawn under exactly the text that was copied: draws in left to right, holds, fades. No box over the code.
function Copied({ on, block = false, children }) {
  const reduce = useReducedMotion();
  return (
    <span className={`relative ${block ? 'block' : ''}`}>
      {children}
      <motion.span
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-0.5 h-px origin-left rounded-full bg-code-string"
        initial={false}
        animate={on ? { scaleX: 1, opacity: 1 } : { scaleX: reduce ? 1 : 0, opacity: 0 }}
        transition={on ? (reduce ? { duration: 0 } : { scaleX: { duration: 0.24, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.05 } }) : { duration: reduce ? 0 : 0.3 }}
      />
    </span>
  );
}

// The block MDX hands us: <pre><code className="language-x">text</code></pre>
export function CodeBlock({ children }) {
  const code = isValidElement(children) ? children : null;
  const lang = (code?.props.className ?? '').replace(/^language-/, '') || 'text';
  const text = String(code?.props.children ?? children ?? '').replace(/\n$/, '');
  const shell = SHELL.includes(lang);
  const rows = shell ? text.split('\n').filter((l) => l.trim()).map(splitComment) : null;
  const copy = shell ? rows.map((r) => r.cmd).join('\n') : text;
  const [flash, setFlash] = useState(false);
  const copied = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 1600);
  };
  return (
    <figure className="my-6 overflow-hidden rounded-md bg-code text-code-foreground shadow-plate">
      <figcaption className="flex h-10 items-center justify-between border-b border-code-foreground/10 pr-2 pl-4">
        <span className="text-xs font-semibold text-code-comment">{shell ? 'Terminal' : (LABEL[lang] ?? lang.toUpperCase())}</span>
        <CopyButton text={copy} onCopied={copied} />
      </figcaption>
      {shell ? (
        <div className="flex flex-col gap-3 overflow-x-auto px-4 py-4 font-mono text-sm">
          {rows.map((r, i) => (
            <div key={i} className="flex flex-col gap-1">
              {r.comment && <span className="font-sans text-xs text-code-comment">{r.comment}</span>}
              <span className="whitespace-pre">
                <span className="text-code-comment select-none" aria-hidden="true">
                  ${' '}
                </span>
                <Copied on={flash}>{paint(shellTokens(r.cmd))}</Copied>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <pre className="overflow-x-auto px-4 py-4 font-mono text-sm">
          <code>
            <Copied on={flash} block>
              {paint(sourceTokens(text))}
            </Copied>
          </code>
        </pre>
      )}
    </figure>
  );
}

// "npx plumb install   # print the wiring" → { cmd, comment }. A # inside quotes is not a comment.
function splitComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) q = c === q ? null : q;
    else if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return { cmd: line.slice(0, i).trimEnd(), comment: line.slice(i + 1).trim() };
  }
  return { cmd: line.trimEnd(), comment: '' };
}

const INK = { keyword: 'text-code-keyword', string: 'text-code-string', comment: 'text-code-comment', flag: 'text-code-flag', number: 'text-code-flag', fn: 'font-semibold', command: 'font-semibold text-code-keyword', plain: '' };
const paint = (tokens) => tokens.map(([kind, t], i) => (kind === 'plain' ? <Fragment key={i}>{t}</Fragment> : <span key={i} className={INK[kind]}>{t}</span>));

// Shell: the program in the keyword ink, flags in the warm ink, quoted strings green.
function shellTokens(cmd) {
  const out = [];
  const re = /("[^"]*"|'[^']*')|(\s+)|(--?[\w-]+=?)|(&&|\|\||[|;])|([^\s"']+)/g;
  let m;
  let first = true;
  while ((m = re.exec(cmd))) {
    if (m[1]) out.push(['string', m[1]]);
    else if (m[2]) out.push(['plain', m[2]]);
    else if (m[3]) out.push(['flag', m[3]]);
    else if (m[4]) (out.push(['comment', m[4]]), (first = true));
    else (out.push([first ? 'command' : 'plain', m[5]]), (first = false));
  }
  return out;
}

// JS, TS, JSX and JSON, well enough for docs: comments, strings, keywords, numbers, called functions.
const KEYWORDS = new Set('import from export default const let var function return if else new await async type interface extends as of in for while true false null undefined class'.split(' '));
function sourceTokens(src) {
  const out = [];
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)|([\s\S])/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) out.push(['comment', m[1]]);
    else if (m[2]) out.push(['string', m[2]]);
    else if (m[3]) out.push(['number', m[3]]);
    else if (m[4]) out.push([KEYWORDS.has(m[4]) ? 'keyword' : 'fn', m[4]]);
    else if (m[5]) out.push([KEYWORDS.has(m[5]) ? 'keyword' : 'plain', m[5]]);
    else {
      const last = out.at(-1);
      if (last?.[0] === 'plain') last[1] += m[6];
      else out.push(['plain', m[6]]);
    }
  }
  return out;
}

// Inline code in running text: a quiet chip that never breaks inside a flag or a path.
export const InlineCode = (p) => <code className="rounded-sm border border-border bg-muted px-1.5 py-px font-mono text-sm whitespace-nowrap text-foreground" {...p} />;
