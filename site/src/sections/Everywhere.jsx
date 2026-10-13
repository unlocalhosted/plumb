/* ─────────────────────────────────────────────────────────
 * ONE FIX, EVERY SITE (site/HOMEPAGE.md §4.3) — blue stage
 *
 *  rest      nine everyday components on the field, each spaced with the same hand-written 10px, each wearing a
 *            red "10px" chip. The ruler from the section above sits under them, its handle on 10px.
 *  decide    drag the handle onto a step: one decision. It ripples out from the centre tile, ring by ring, 50ms per
 *            ring: each tile's spacing springs to the step on `snap`, its chip flips to ✓ with the step's name, and
 *            the counter rolls up to "9 sites · 1 decision".
 *  undecide  drag off the steps: the tiles return to 10px and their chips to red, in the same ripple
 * ───────────────────────────────────────────────────────── */
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Section } from './Section.jsx';
import { Ruler } from './Ruler.jsx';
import { THEME } from './scales.js';
import { Field } from '../system/Field.jsx';
import { SPRING } from '../site/motion.js';

const TIMING = { ring: 0.05 }; // s per ring of the ripple
const START = 10; // px: the value every tile was written with
const RING = [2, 1, 2, 1, 0, 1, 2, 1, 2]; // distance from the centre of the 3 × 3 grid

export function Everywhere() {
  const [step, setStep] = useState(null);
  const gap = step ? step.v : START;
  const reduce = useReducedMotion();
  const tile = (i) => ({ gap, delay: reduce ? 0 : RING[i] * TIMING.ring, fixed: Boolean(step), name: step && `gap-${step.key}` });
  return (
    <Section
      id="everywhere"
      n={1}
      stage
      title="One fix, every site."
      lead="The same off-scale 10px sits in nine components across your app. You don't fix nine places. You make one decision, and Plumb finds every site it applies to."
    >
      <div className="relative overflow-hidden rounded-lg bg-stage p-6 text-stage-foreground shadow-lift md:p-8">
        <Field turbulence={step ? 0 : 1} />
        <div className="relative flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-stage-foreground/15 px-3 py-1 font-mono text-sm">9 components, one value: 10px</span>
            <Counter fixed={step ? 9 : 0} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-foreground sm:gap-4 lg:grid-cols-3">
            {PARTS.map((Part, i) => (
              <Tile key={i} {...tile(i)}>
                {(g) => <Part gap={g} />}
              </Tile>
            ))}
          </div>
          <div className="rounded-md bg-stage-foreground/10 px-4 pt-2">
            <Ruler steps={THEME} start={START} prefix="gap" tone="stage" onSettle={(s) => setStep(s)} />
          </div>
        </div>
      </div>
    </Section>
  );
}

// A tile: the component, and the chip that says what its spacing is.
function Tile({ gap, delay, fixed, name, children }) {
  return (
    <div className="relative flex min-h-24 items-center justify-center overflow-hidden rounded-md bg-card px-3 pt-8 pb-4 shadow-plate sm:p-5">
      <motion.div className="flex w-full justify-center" animate={{ '--g': `${gap}px` }} transition={{ ...SPRING.snap, delay }} style={{ '--g': `${START}px` }}>
        {children('var(--g)')}
      </motion.div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={fixed ? name : 'off'}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: -90, opacity: 0 }}
          transition={{ duration: 0.16, delay }}
          className={`absolute top-2 right-2 rounded-sm px-1.5 font-mono text-xs font-semibold ${fixed ? 'bg-success/15 text-success' : 'bg-destructive/12 text-destructive'}`}
        >
          {fixed ? `✓ ${name}` : '10px'}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function Counter({ fixed }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-sm font-semibold text-foreground tabular-nums" aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={fixed} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={SPRING.snap} className={fixed ? 'text-success' : 'text-destructive'}>
          {fixed}
        </motion.span>
      </AnimatePresence>
      <span>{fixed ? 'sites · 1 decision' : 'of 9 sites on the scale'}</span>
    </span>
  );
}

// The nine: each spaced by one value, the gap between its parts.
const bar = (w, tone = 'bg-muted') => <span className={`block h-2 rounded-full ${tone}`} style={{ width: w }} />;
const PARTS = [
  ({ gap }) => (
    <span className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground" style={{ gap }}>
      <span className="size-3.5 rounded-sm border-2 border-current" /> Save
    </span>
  ),
  ({ gap }) => (
    <span className="flex items-center text-sm" style={{ gap }}>
      <span className="font-semibold">Email</span>
      <span className="h-8 w-16 rounded-md border border-border bg-background sm:w-32" />
    </span>
  ),
  ({ gap }) => (
    <span className="flex w-full max-w-44 flex-col rounded-md border border-border p-3" style={{ gap }}>
      <span className="text-sm font-semibold">Quarterly report</span>
      {bar('100%')}
      {bar('70%')}
    </span>
  ),
  ({ gap }) => (
    <span className="flex w-full max-w-40 flex-col" style={{ gap }}>
      {[0, 1, 2].map((r) => (
        <span key={r} className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" />
          {bar(r === 1 ? '60%' : '80%')}
        </span>
      ))}
    </span>
  ),
  ({ gap }) => (
    <span className="flex items-center rounded-md bg-foreground px-3 py-2 text-xs text-background sm:text-sm" style={{ gap }}>
      <span className="grid size-4 place-items-center rounded-full bg-success text-xs text-primary-foreground">✓</span> Saved to drafts
    </span>
  ),
  ({ gap }) => (
    <span className="flex items-center text-xs font-semibold sm:text-sm" style={{ gap }}>
      <span className="text-primary">Home</span>
      <span className="text-muted-foreground">Docs</span>
      <span className="text-muted-foreground">Pricing</span>
    </span>
  ),
  ({ gap }) => (
    <span className="flex w-full max-w-44 flex-col rounded-md border border-border p-3 shadow-lift" style={{ gap }}>
      <span className="text-sm font-semibold">Delete file?</span>
      {bar('90%')}
      <span className="flex justify-end" style={{ gap }}>
        <span className="h-6 w-12 rounded-sm border border-border" />
        <span className="h-6 w-12 rounded-sm bg-destructive" />
      </span>
    </span>
  ),
  ({ gap }) => (
    <span className="flex items-end border-b border-border text-xs font-semibold sm:text-sm" style={{ gap }}>
      <span className="border-b-2 border-primary pb-1.5 text-primary">Info</span>
      <span className="pb-1.5 text-muted-foreground">Activity</span>
      <span className="pb-1.5 text-muted-foreground">Team</span>
    </span>
  ),
  ({ gap }) => (
    <span className="flex items-center" style={{ gap }}>
      {['AL', 'GH', 'MK', 'RS'].map((n) => (
        <span key={n} className="grid size-6 place-items-center rounded-full bg-tint-2 font-mono text-xs text-primary sm:size-8">
          {n}
        </span>
      ))}
    </span>
  ),
];
