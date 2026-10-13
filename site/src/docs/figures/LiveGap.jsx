/* ─────────────────────────────────────────────────────────
 * LIVE GAP — one real value, judged the way Plumb judges it (site/DOCS.md, "What Plumb is")
 *
 * The specimen is the homepage hero's own card header, written `gap-[13px]` in hero/DriftedCard.jsx. The scale is
 * this site's spacing scale with the reasons from plumb.config. Nothing here is a metaphor: the card, the source
 * line, the compiled value and the ruler are four views of one number, and they move together in every frame.
 *
 *  rest      13px between the avatar and the name, measured on the card in the drift colour; the source reads
 *            gap-[13px]; it compiles to gap: 13px; the ruler's handle sits between 12 and 16
 *  drag      the handle drives the real gap: the card opens and closes, the measurement follows, the source's
 *            arbitrary value counts along (gap-[14.5px]), the finding names the steps either side
 *  on a step the handle springs onto it (detent); the measurement turns primary; the source's class swaps to the
 *            token (gap-3), popping in on `snap`; the finding becomes the step's reason
 *  keys      ← → on the handle step through the scale
 *  reduced motion: the swap and the detent are immediate
 * ───────────────────────────────────────────────────────── */
import { useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'motion/react';
import { Ruler } from '../../sections/Ruler.jsx';
import { THEME } from '../../sections/scales.js';
import { SPRING } from '../../site/motion.js';

const START = 13;
const SOURCE = { file: 'hero/DriftedCard.jsx', line: 25 };

const neighbours = (px) => {
  const below = [...THEME].reverse().find((s) => s.v < px);
  const above = THEME.find((s) => s.v > px);
  return [below, above].filter(Boolean);
};

export function LiveGap() {
  const reduce = useReducedMotion();
  const v = useMotionValue(START);
  const gap = useTransform(v, (x) => `${x}px`); // motion writes column-gap without a unit otherwise
  const [px, setPx] = useState(START);
  const [on, setOn] = useState(null);
  useMotionValueEvent(v, 'change', (x) => setPx(Math.round(x * 2) / 2));

  const cls = on ? `gap-${on.key}` : `gap-[${px}px]`;
  const swap = reduce ? { duration: 0 } : SPRING.snap;
  const mark = on ? 'bg-primary' : 'bg-destructive';

  return (
    <figure className="my-10">
      <div className="overflow-hidden rounded-lg bg-card shadow-plate">
        <div className="flex items-center justify-between px-5 pt-4 font-mono text-xs text-muted-foreground">
          <span>Fig 1</span>
          <span className="uppercase">One value, one verdict</span>
        </div>

        {/* the specimen: the hero card's header, its gap driven by the ruler */}
        <div className="grid place-items-center px-5 pt-12 pb-8">
          <div className="w-full max-w-80 rounded-lg bg-background p-5 shadow-plate">
            <motion.header className="relative flex items-center" style={{ columnGap: gap }}>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-tint-2 font-mono text-sm text-primary">AL</span>
              {/* the measurement: the real space between the avatar and the name, drawn where it is */}
              <motion.span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-12" style={{ width: v }}>
                <span className={`absolute inset-0 opacity-15 transition-colors ${mark}`} />
                <span className={`absolute inset-x-0 -top-3 h-px transition-colors ${mark}`} />
                <span className={`absolute -top-4 left-0 h-2 w-px transition-colors ${mark}`} />
                <span className={`absolute -top-4 right-0 h-2 w-px transition-colors ${mark}`} />
                <span className={`absolute -top-10 left-1/2 -translate-x-1/2 rounded-sm px-1.5 font-mono text-xs font-semibold whitespace-nowrap tabular-nums text-primary-foreground transition-colors ${mark}`}>
                  {px}px
                </span>
              </motion.span>
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium">Ada Lovelace</span>
                  <span className="rounded-sm bg-primary px-1.5 text-xs font-semibold text-primary-foreground">Pro</span>
                </span>
                <span className="text-sm text-muted-foreground">Analyst, Engine No. 1</span>
              </div>
            </motion.header>
          </div>
        </div>

        {/* the source, what it compiles to, and what Plumb says about it */}
        <div className="bg-code px-5 py-4 font-mono text-sm text-code-foreground">
          <div className="mb-3 font-sans text-xs font-semibold text-code-comment">
            {SOURCE.file}:{SOURCE.line}
          </div>
          <div className="overflow-x-auto whitespace-nowrap">
            <span className="text-code-comment">&lt;</span>
            <span className="text-code-keyword">header</span> className=<span className="text-code-string">"flex items-center </span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={on ? on.key : 'off'}
                className={`inline-block rounded-sm px-1 tabular-nums ${on ? 'bg-code-string/15 text-code-string' : 'bg-destructive/25 text-code-flag'}`}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={swap}
              >
                {cls}
              </motion.span>
            </AnimatePresence>
            <span className="text-code-string">"</span>
            <span className="text-code-comment">&gt;</span>
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-sans text-xs text-code-comment">compiles to</span>
            <span className="tabular-nums">
              gap: <span className="text-code-flag">{px}px</span>;
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-1 border-t border-code-foreground/10 pt-3 font-sans text-xs" aria-live="polite">
            {on ? (
              <span>
                <span className="font-semibold text-code-string">On your scale.</span> <span className="font-mono">gap-{on.key}</span>: {on.why}
              </span>
            ) : (
              <>
                <span>
                  <span className="font-semibold text-code-flag">Drift.</span> {px}px isn't a step of your spacing. The steps either side:
                </span>
                {neighbours(px).map((s) => (
                  <span key={s.key} className="text-code-comment">
                    <span className="font-mono text-code-foreground">gap-{s.key}</span> {s.v}px · {s.why}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>

        {/* the site's spacing scale: drag the value along it */}
        <div className="px-5 pt-5 pb-4">
          <div className="mb-1 font-mono text-xs text-muted-foreground">this site's spacing scale</div>
          <Ruler steps={THEME} start={START} value={v} readout={false} onSettle={(step) => setOn(step)} />
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        The header of the card on this site's homepage, written <code className="font-mono">gap-[13px]</code>. Drag the handle and the real gap
        changes; land on a step and the source takes that step's token.
      </figcaption>
    </figure>
  );
}
