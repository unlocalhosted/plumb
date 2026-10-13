/* ─────────────────────────────────────────────────────────
 * CODE — every block of code in the docs (site/DOCS.md §3.2, §3.3)
 *
 *  header    what the block is: "Terminal" for shell, the language otherwise; Copy, always visible
 *  terminal  one command per row behind a "$" that can't be selected; a trailing "# comment" moves above its
 *            command, muted, so nothing runs off the edge. Copy takes the commands only.
 *  source    coloured by a small tokenizer: keywords, strings, comments, numbers, called functions. Long lines
 *            scroll sideways inside the block; the page never does.
 *  copy      "Copy" → "Copied" for 1.2s; keyboard reachable
 * ───────────────────────────────────────────────────────── */
import { Fragment, isValidElement, useState } from 'react';

const SHELL = ['sh', 'bash', 'shell', 'zsh', 'console'];
const LABEL = { ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX', json: 'JSON', css: 'CSS', md: 'Markdown', yaml: 'YAML', yml: 'YAML', text: 'Text' };

export function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      className={`rounded-sm px-2 py-0.5 text-xs font-semibold transition-colors ${copied ? 'bg-success/20 text-code-string' : 'text-code-comment hover:bg-code-foreground/10 hover:text-code-foreground'} ${className}`}
    >
      {copied ? 'Copied' : 'Copy'}
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
