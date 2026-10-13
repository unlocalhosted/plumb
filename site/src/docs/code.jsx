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

const SHELL = ['sh', 'bash', 'shell', 'zsh', 'console'];
const LABEL = { ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX', json: 'JSON', css: 'CSS', md: 'Markdown', yaml: 'YAML', yml: 'YAML', text: 'Text' };

/* COPY — STORYBOARD
 *    rest    two stacked sheets, "Copy"
 *    copy    0ms    the back sheet slides onto the front one (120ms)
 *            80ms   the sheet's outline draws away while a check draws in (220ms); "Copy" → "Copied" crossfades
 *                   in place, in a slot as wide as the longer word, so the button never changes width
 *            1.2s   it all runs back
 *    failed  (no clipboard) the sheets shake once, 2px
 *    reduced motion: the icon and label swap without movement
 */
export function CopyButton({ text, className = '' }) {
  const [state, setState] = useState('rest'); // rest | copied | failed
  const reduce = useReducedMotion();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('rest'), 1200);
  };
  const done = state === 'copied';
  const t = (d = 0, dur = 0.22) => (reduce ? { duration: 0 } : { duration: dur, delay: d, ease: [0.4, 0, 0.2, 1] });
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={done ? 'Copied' : 'Copy to clipboard'}
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-code-keyword ${done ? 'bg-code-string/15 text-code-string' : 'text-code-comment hover:bg-code-foreground/10 hover:text-code-foreground'} ${className}`}
    >
      <motion.svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 overflow-visible" animate={state === 'failed' && !reduce ? { x: [0, -2, 2, -1, 0] } : { x: 0 }} transition={{ duration: 0.3 }}>
        {/* the back sheet: slides onto the front one */}
        <motion.rect x="5.5" y="1.5" width="9" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" initial={false} animate={done ? { x: -4, y: 3, opacity: 0 } : { x: 0, y: 0, opacity: 1 }} transition={t(0, 0.12)} />
        {/* the front sheet: its outline draws away */}
        <motion.rect x="1.5" y="4.5" width="9" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" initial={false} animate={{ pathLength: done ? 0 : 1, opacity: done ? 0 : 1 }} transition={t(done ? 0.08 : 0)} />
        {/* the check: draws in */}
        <motion.path d="M3 8.6 L6.4 12 L13 4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }} transition={t(done ? 0.08 : 0)} />
      </motion.svg>
      {/* one slot as wide as "Copied", so the button keeps its width */}
      <span className="grid">
        <span className="invisible col-start-1 row-start-1">Copied</span>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={done ? 'done' : 'copy'} className="col-start-1 row-start-1" initial={{ opacity: 0, y: reduce ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -4 }} transition={t(0, 0.16)}>
            {done ? 'Copied' : 'Copy'}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
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
  return (
    <figure className="my-6 overflow-hidden rounded-md bg-code text-code-foreground shadow-plate">
      <figcaption className="flex h-10 items-center justify-between border-b border-code-foreground/10 pr-2 pl-4">
        <span className="text-xs font-semibold text-code-comment">{shell ? 'Terminal' : (LABEL[lang] ?? lang.toUpperCase())}</span>
        <CopyButton text={copy} />
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
                {paint(shellTokens(r.cmd))}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <pre className="overflow-x-auto px-4 py-4 font-mono text-sm">
          <code>{paint(sourceTokens(text))}</code>
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
