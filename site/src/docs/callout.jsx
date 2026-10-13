/* ─────────────────────────────────────────────────────────
 * CALLOUT — every aside in the docs, one anatomy in three kinds (site/DOCS.md §3.2)
 *
 *  anatomy   [mark] [title] (in one row, centred on each other), the body under the title. Flat and tinted to be
 *            read; raised (on a card) when it can be operated. Paragraph margins are reset inside.
 *  kinds     note      blue, "i": something worth knowing on the way
 *            careful   amber, "!": this step writes to your repo
 *            why       raised, a bulb: the reasoning behind a choice, folded to its claim; opens on demand
 *
 * STORYBOARD — the mark arrives (once, as the callout scrolls into view)
 *      0ms   the round ground pops in, 0.6 → 1 on `pop`
 *    120ms   the glyph draws: note's stem grows up from its dot; careful's stroke drops, then its dot lands;
 *            why's bulb outline traces
 *
 * STORYBOARD — why opens / closes
 *      0ms   the caret's two strokes pivot (down ↔ up) on `settle`; the bulb fills and its three rays draw out
 *            (closing: the rays retract, the bulb empties)
 *     40ms   the body opens to its height on `settle`; its text rises 4px and fades in
 *  hover     the raised header warms (muted ground); press sinks it 1%
 *  reduced motion: marks and the caret appear in their final state; the body opens without movement
 * ───────────────────────────────────────────────────────── */
import { useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { SPRING } from '../site/motion.js';

const TIMING = { glyph: 0.12, draw: 0.24, body: 0.04 }; // s

const KIND = {
  note: { title: 'Good to know', ground: 'bg-tint-2', ink: 'text-primary' },
  careful: { title: 'This writes to your repo', ground: 'bg-warning/12', ink: 'text-warning' },
  why: { title: 'Why it works this way', ground: 'bg-card shadow-plate', ink: 'text-primary' },
};

const body = 'flex flex-col gap-2 text-base text-foreground [&>*]:my-0';

export function Callout({ kind = 'note', title, children }) {
  if (kind === 'why') return <Why title={title ?? KIND.why.title}>{children}</Why>;
  return (
    <Plain kind={kind} title={title}>
      {children}
    </Plain>
  );
}

function Plain({ kind, title, children }) {
  const k = KIND[kind];
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  return (
    <aside ref={ref} className={`my-6 flex flex-col gap-1 rounded-md px-4 py-3 ${k.ground}`}>
      <span className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-x-2">
        <Mark kind={kind} on={seen} className={k.ink} />
        <span className={`text-sm font-semibold ${k.ink}`}>{title ?? k.title}</span>
      </span>
      <div className={`${body} pl-8`}>{children}</div>
    </aside>
  );
}

function Why({ title, children }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const id = useId();
  return (
    <aside ref={ref} className={`my-6 overflow-hidden rounded-md ${KIND.why.ground}`}>
      <motion.button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        whileTap={reduce ? undefined : { scale: 0.99 }}
        className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_1rem] items-center gap-x-2 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Mark kind="why" on={seen} lit={open} className="text-primary" />
        <span className="text-base">
          <span className="font-semibold text-primary">Why: </span>
          {title}
        </span>
        <Caret open={open} />
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={reduce ? { duration: 0 } : { ...SPRING.settle, delay: TIMING.body }}
          >
            <motion.div
              initial={{ y: reduce ? 0 : 4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              className={`${body} border-t border-border px-4 pt-3 pb-4 pl-12`}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

/* ── the marks: drawn here so they can morph ───────────── */
const BULB = 'M10 4.6 C7.2 4.6 5.4 6.6 5.4 9 C5.4 10.8 6.4 11.9 7.3 12.8 C7.8 13.3 8 13.8 8 14.4 H12 C12 13.8 12.2 13.3 12.7 12.8 C13.6 11.9 14.6 10.8 14.6 9 C14.6 6.6 12.8 4.6 10 4.6 Z';
// 20 × 20, a filled round ground in the kind's ink with the glyph knocked out in the page's ground colour.
function Mark({ kind, on, lit = false, className = '' }) {
  const reduce = useReducedMotion();
  const ready = reduce || on;
  const draw = (delay = 0) => ({
    initial: { pathLength: reduce ? 1 : 0 },
    animate: { pathLength: ready ? 1 : 0 },
    transition: { duration: reduce ? 0 : TIMING.draw, delay: reduce ? 0 : TIMING.glyph + delay, ease: [0.4, 0, 0.2, 1] },
  });
  const knock = 'stroke-background';
  return (
    <motion.svg viewBox="0 0 20 20" aria-hidden="true" className={`size-5 overflow-visible ${className}`} initial={false}>
      {kind === 'why' ? (
        <>
          {/* rays: drawn out when the reasoning is open */}
          {[
            'M10 1.2 V2.6',
            'M3.6 3.8 L4.6 4.8',
            'M16.4 3.8 L15.4 4.8',
          ].map((d, i) => (
            <motion.path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" initial={false} animate={{ pathLength: lit ? 1 : 0, opacity: lit ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.2, delay: reduce ? 0 : i * 0.04 }} />
          ))}
          {/* the bulb: traced in; when lit, it fills */}
          <motion.path d={BULB} fill="currentColor" initial={false} animate={{ opacity: lit ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.2 }} />
          <motion.path d={BULB} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" {...draw()} />
          <motion.path d="M8.2 16.6 H11.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...draw(0.1)} />
        </>
      ) : (
        <>
          <motion.circle cx="10" cy="10" r="9" fill="currentColor" initial={{ scale: reduce ? 1 : 0.6, opacity: reduce ? 1 : 0 }} animate={{ scale: ready ? 1 : 0.6, opacity: ready ? 1 : 0 }} transition={reduce ? { duration: 0 } : SPRING.pop} style={{ transformOrigin: '10px 10px' }} />
          {kind === 'note' ? (
            <>
              {/* "i": the dot first, then the stem grows up into it */}
              <motion.circle cx="10" cy="6" r="1.15" className="fill-background" initial={{ scale: reduce ? 1 : 0 }} animate={{ scale: ready ? 1 : 0 }} transition={reduce ? { duration: 0 } : { ...SPRING.pop, delay: TIMING.glyph }} style={{ transformOrigin: '10px 6px' }} />
              <motion.path d="M10 14.4 V9" className={knock} strokeWidth="2" strokeLinecap="round" {...draw(0.06)} />
            </>
          ) : (
            <>
              {/* "!": the stroke drops, then the dot lands */}
              <motion.path d="M10 5.4 V10.6" className={knock} strokeWidth="2" strokeLinecap="round" {...draw()} />
              <motion.circle cx="10" cy="14" r="1.15" className="fill-background" initial={{ scale: reduce ? 1 : 0 }} animate={{ scale: ready ? 1 : 0 }} transition={reduce ? { duration: 0 } : { ...SPRING.pop, delay: TIMING.glyph + TIMING.draw }} style={{ transformOrigin: '10px 14px' }} />
            </>
          )}
        </>
      )}
    </motion.svg>
  );
}

// Two strokes that pivot about the centre: a chevron pointing down when closed, up when open.
function Caret({ open }) {
  const reduce = useReducedMotion();
  const t = reduce ? { duration: 0 } : SPRING.settle;
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 overflow-visible text-muted-foreground">
      <motion.path d="M3 8 H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" initial={false} animate={{ rotate: open ? -35 : 35 }} transition={t} style={{ transformOrigin: '8px 8px' }} />
      <motion.path d="M8 8 H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" initial={false} animate={{ rotate: open ? 35 : -35 }} transition={t} style={{ transformOrigin: '8px 8px' }} />
    </svg>
  );
}
