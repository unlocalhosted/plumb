/* ─────────────────────────────────────────────────────────
 * CALLOUT — an aside to the main text, in three kinds (site/DOCS.md §3.2)
 *
 *  note      blue, an info mark: something worth knowing on the way
 *  careful   amber, a warning mark: this step writes to your repo. Title defaults to saying so.
 *  why       the reasoning behind a design choice. Most readers don't need it to follow the steps, so it folds:
 *            one line, "Why: <title>", that opens to the full reasoning on `settle` (the caret turns), and closes
 *            the same way. Closed by default: the summary line already carries the claim.
 *
 *  layout    the mark sits in a column of its own; title and text share one column, with no gap from paragraph
 *            margins (the body's paragraphs are reset inside a callout)
 * ───────────────────────────────────────────────────────── */
import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Info } from '@phosphor-icons/react/dist/icons/Info';
import { WarningCircle } from '@phosphor-icons/react/dist/icons/WarningCircle';
import { Lightbulb } from '@phosphor-icons/react/dist/icons/Lightbulb';
import { CaretDown } from '@phosphor-icons/react/dist/icons/CaretDown';
import { SPRING } from '../site/motion.js';

const KIND = {
  note: { Mark: Info, title: 'Note', ground: 'bg-tint-2', ink: 'text-primary' },
  careful: { Mark: WarningCircle, title: 'This writes to your repo', ground: 'bg-warning/12', ink: 'text-warning' },
  why: { Mark: Lightbulb, title: 'Why it works this way', ground: 'bg-card shadow-plate', ink: 'text-primary' },
};

// paragraphs inside a callout lose their page margins; consecutive ones keep a small gap
const body = 'flex flex-col gap-2 text-base text-foreground *:my-0';

export function Callout({ kind = 'note', title, children }) {
  const k = KIND[kind];
  if (kind === 'why') return <Why title={title ?? k.title}>{children}</Why>;
  return (
    <aside className={`my-6 grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 rounded-md px-4 py-4 ${k.ground}`}>
      <k.Mark aria-hidden="true" weight="fill" className={`mt-0.5 size-5 ${k.ink}`} />
      <div className="flex flex-col gap-1">
        <span className={`text-sm font-semibold ${k.ink}`}>{title ?? k.title}</span>
        <div className={body}>{children}</div>
      </div>
    </aside>
  );
}

function Why({ title, children }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const id = useId();
  return (
    <aside className="my-6 overflow-hidden rounded-md bg-card shadow-plate">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_1rem] items-center gap-x-3 px-4 py-3 text-left transition-colors hover:bg-muted"
      >
        <Lightbulb aria-hidden="true" weight="fill" className="size-5 text-primary" />
        <span className="text-base">
          <span className="font-semibold text-primary">Why: </span>
          {title}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={reduce ? { duration: 0 } : SPRING.settle} className="text-muted-foreground">
          <CaretDown aria-hidden="true" className="size-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : SPRING.settle}
          >
            <div className={`${body} border-t border-border px-4 pt-3 pb-4 pl-12`}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
