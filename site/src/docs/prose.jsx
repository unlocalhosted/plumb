/* ─────────────────────────────────────────────────────────
 * PROSE — the docs' reading primitives, handed to every MDX page (site/DOCS.md §3.2)
 *
 *  headings   h2 and h3 carry an id and a "#" that appears on hover/focus and copies the link
 *  text       17/27 on a ~70ch measure; inline code in mono on a muted chip
 *  code       fenced blocks in the code ink with a Copy that confirms (the command block with recordings is next)
 *  tables     ruled rows, header in the label weight; scroll sideways on a phone, never squash
 *  callouts   note (blue), careful (amber: it writes to disk), why (the reasoning behind a choice)
 * ───────────────────────────────────────────────────────── */
import { Children, isValidElement, useState } from 'react';

const slugOf = (children) =>
  Children.toArray(children)
    .map((c) => (typeof c === 'string' ? c : isValidElement(c) ? slugOf(c.props.children) : ''))
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function Heading({ as: Tag, className, children }) {
  const id = slugOf(children);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    history.replaceState(null, '', `#${id}`);
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <Tag id={id} className={`group scroll-mt-24 font-semibold text-balance ${className}`}>
      {children}
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy a link to ${typeof children === 'string' ? children : 'this section'}`}
        className="ml-2 align-middle text-base font-normal text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? 'link copied' : '#'}
      </button>
    </Tag>
  );
}

function CodeBlock({ children }) {
  const code = isValidElement(children) ? children.props.children : children;
  const text = String(code ?? '').replace(/\n$/, '');
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative my-6 overflow-hidden rounded-md bg-code text-code-foreground shadow-plate">
      <pre className="overflow-x-auto px-5 py-4 font-mono text-sm">
        <code>{text}</code>
      </pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          } catch {}
        }}
        className="absolute top-3 right-3 rounded-sm bg-code-foreground/10 px-2 py-0.5 text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

const TONE = {
  note: { label: 'Note', ring: 'bg-tint-2', ink: 'text-primary' },
  careful: { label: 'Careful', ring: 'bg-warning/12', ink: 'text-warning' },
  why: { label: 'Why', ring: 'bg-muted', ink: 'text-foreground' },
};

export function Callout({ kind = 'note', title, children }) {
  const t = TONE[kind];
  return (
    <aside className={`my-6 flex flex-col gap-1 rounded-md px-5 py-4 ${t.ring}`}>
      <span className={`text-sm font-semibold ${t.ink}`}>{title ?? t.label}</span>
      <div className="text-base text-foreground [&>p]:my-0">{children}</div>
    </aside>
  );
}

export const prose = {
  h2: (p) => <Heading as="h2" className="mt-14 mb-4 text-2xl" {...p} />,
  h3: (p) => <Heading as="h3" className="mt-10 mb-3 text-lg" {...p} />,
  p: (p) => <p className="my-4 text-base text-foreground" {...p} />,
  a: (p) => <a className="font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary" {...p} />,
  ul: (p) => <ul className="my-4 flex list-disc flex-col gap-2 pl-6 text-base marker:text-muted-foreground" {...p} />,
  ol: (p) => <ol className="my-4 flex list-decimal flex-col gap-2 pl-6 text-base marker:text-muted-foreground" {...p} />,
  strong: (p) => <strong className="font-semibold" {...p} />,
  code: (p) => <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-sm" {...p} />,
  pre: CodeBlock,
  table: (p) => (
    <div className="my-6 overflow-x-auto rounded-md shadow-plate">
      <table className="w-full border-collapse bg-card text-left text-sm" {...p} />
    </div>
  ),
  th: (p) => <th className="border-b border-border bg-muted px-4 py-2 font-semibold" {...p} />,
  td: (p) => <td className="border-b border-border px-4 py-3 align-top [tr:last-child_&]:border-0" {...p} />,
  Callout,
};
