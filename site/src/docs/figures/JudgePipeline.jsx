/* ─────────────────────────────────────────────────────────
 * THE PIPELINE — how one value is judged (docs: What Plumb is)
 *
 * The claim it proves: Plumb judges the CSS a value compiles to, not how it was written. Three ways of writing 13px
 * get one answer; the token gets the other.
 *
 * STORYBOARD (each time a way of writing is picked, and once when the figure scrolls into view)
 *      0ms   stage 1  "You write": the authored line appears in its own syntax
 *    380ms   stage 2  "Plumb compiles": the connector fills; the declaration it compiles to appears, `gap: 13px`
 *    760ms   stage 3  "Your scale": the connector fills; a marker drops onto the ruler on `detent`, landing between
 *                     12 and 16, or exactly on 12
 *   1140ms   stage 4  "Verdict": the connector fills; the nut pops in. Off the scale it stays red and loose; on the
 *                     scale it turns 60° and goes green (the same nut the homepage tightens)
 *
 *  keys      ← → step through the ways of writing (they're a radio group)
 *  reduced motion: every stage appears at once, nothing travels
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { SPRING } from '../../site/motion.js';

const TIMING = { step: 0.38 }; // s between stages

// An example theme's spacing scale, with the reasons a team wrote for it.
const SCALE = [
  { px: 8, name: 'gap-2', why: 'parts of one control' },
  { px: 12, name: 'gap-3', why: 'related parts' },
  { px: 16, name: 'gap-4', why: 'groups in a section' },
  { px: 20, name: 'gap-5', why: 'between sections' },
];

const WAYS = [
  { id: 'class', label: 'Tailwind class', lang: 'JSX', code: [['plain', '<div className="flex '], ['hot', 'gap-[13px]'], ['plain', '">']], px: 13 },
  { id: 'apply', label: '@apply', lang: 'CSS', code: [['plain', '.row { @apply flex '], ['hot', 'gap-[13px]'], ['plain', '; }']], px: 13 },
  { id: 'inline', label: 'Inline style', lang: 'JSX', code: [['plain', '<div style={{ '], ['hot', 'gap: 13'], ['plain', ' }}>']], px: 13 },
  { id: 'token', label: 'A token', lang: 'JSX', code: [['plain', '<div className="flex '], ['hot', 'gap-3'], ['plain', '">']], px: 12 },
];

const LO = 6;
const HI = 22.5; // the ruler's px range: room for the last label
const at = (px) => `${((px - LO) / (HI - LO)) * 100}%`;

export function JudgePipeline() {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  const [way, setWay] = useState(WAYS[0]);
  const [stage, setStage] = useState(0);
  const [run, setRun] = useState(0);

  // play the stages each time a way is picked (and the first time the figure is seen)
  useEffect(() => {
    if (!seen) return;
    if (reduce) return setStage(4);
    setStage(1);
    const timers = [2, 3, 4].map((s, i) => setTimeout(() => setStage(s), (i + 1) * TIMING.step * 1000));
    return () => timers.forEach(clearTimeout);
  }, [seen, run, reduce]);

  const pick = (w) => {
    setWay(w);
    setRun((r) => r + 1);
  };
  const on = SCALE.find((s) => s.px === way.px);
  const near = SCALE.reduce((a, s) => (Math.abs(s.px - way.px) < Math.abs(a.px - way.px) ? s : a));
  const decl = `gap: ${way.px}px`;

  return (
    <figure ref={ref} className="my-10 flex flex-col gap-5 rounded-lg bg-stage p-5 text-stage-foreground shadow-lift sm:p-6">
      {/* the ways of writing it */}
      <div role="radiogroup" aria-label="How the value is written" className="flex flex-wrap gap-2">
        {WAYS.map((w, i) => (
          <button
            key={w.id}
            type="button"
            role="radio"
            aria-checked={w.id === way.id}
            tabIndex={w.id === way.id ? 0 : -1}
            onClick={() => pick(w)}
            onKeyDown={(e) => {
              const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
              if (!d) return;
              e.preventDefault();
              const next = WAYS[(i + d + WAYS.length) % WAYS.length];
              pick(next);
              e.currentTarget.parentElement.children[WAYS.indexOf(next)].focus();
            }}
            className={`relative rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${w.id === way.id ? 'text-foreground' : 'text-stage-foreground/85 hover:text-stage-foreground'}`}
          >
            {w.id === way.id && <motion.span layoutId="judge-way" transition={SPRING.snap} className="absolute inset-0 rounded-full bg-card" />}
            <span className="relative">{w.label}</span>
          </button>
        ))}
      </div>

      {/* the four stations */}
      <ol className="flex flex-col gap-3">
        <Station n={1} title="You write" lit={stage >= 1} first>
                    <AnimatePresence mode="wait" initial={false}>
            <motion.code key={way.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="font-mono text-sm break-words">
              {way.code.map(([k, t], i) => (
                <span key={i} className={k === 'hot' ? 'rounded-sm bg-tint-2 px-0.5 font-semibold text-primary' : 'text-muted-foreground'}>
                  {t}
                </span>
              ))}
            </motion.code>
          </AnimatePresence>
        </Station>

        <Station n={2} title="Plumb compiles it" lit={stage >= 2}>
                    <AnimatePresence mode="wait" initial={false}>
            {stage >= 2 && (
              <motion.code key={decl + run} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING.pop} className="w-fit rounded-sm bg-muted px-2 py-1 font-mono text-sm font-semibold">
                {decl}
              </motion.code>
            )}
          </AnimatePresence>
        </Station>

        <Station n={3} title="Against your scale" lit={stage >= 3}>
                    <div className="relative h-10">
            <span className="absolute inset-x-0 top-4 h-px bg-border" />
            {SCALE.map((s) => (
              <span key={s.px} className="absolute top-2 flex -translate-x-1/2 flex-col items-center gap-1" style={{ left: at(s.px) }}>
                <span className={`h-3 w-1 rounded-full transition-colors ${stage >= 3 && s === (on ?? null) ? 'bg-success' : 'bg-muted-foreground/50'}`} />
                <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">{s.name}</span>
              </span>
            ))}
            {stage >= 3 && (
              <motion.span
                key={`m${run}`}
                className={`absolute -top-1 size-3 -translate-x-1/2 rotate-45 ${on ? 'bg-success' : 'bg-destructive'}`}
                style={{ left: at(way.px) }}
                initial={reduce ? false : { y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={SPRING.detent}
              />
            )}
          </div>
        </Station>

        <Station n={4} title="Verdict" lit={stage >= 4}>
          <AnimatePresence mode="wait" initial={false}>
            {stage >= 4 && (
              <motion.div key={`v${run}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.settle} className="flex flex-col gap-1">
                <span className="flex items-center gap-2">
                  <Nut tight={Boolean(on)} />
                  <span className={`text-sm font-semibold ${on ? 'text-success' : 'text-destructive'}`}>{on ? 'On your scale' : 'Off your scale'}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {on ? (
                    <>
                      <code className="font-mono text-foreground">{on.name}</code>: {on.why}.
                    </>
                  ) : (
                    <>
                      {way.px}px sits between 12 and 16. The nearest step is <code className="font-mono text-foreground">{near.name}</code>: {near.why}.
                    </>
                  )}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Station>
      </ol>

      <figcaption className="text-sm text-stage-foreground/85">
        {way.id === 'token'
          ? 'Written with the token, the value is on the scale, and Plumb says which decision it uses.'
          : 'However 13px is written, it compiles to the same declaration, so it gets the same answer.'}{' '}
        <span className="opacity-75">An example theme.</span>
      </figcaption>
    </figure>
  );
}

// A station: a card with its number and title, lit when the value reaches it; a connector fills toward the next.
function Station({ n, title, lit, first, children }) {
  const reduce = useReducedMotion();
  return (
    <li className="relative">
      {!first && (
        <motion.span
          aria-hidden="true"
          className="absolute -top-3 left-6 h-3 w-0.5 origin-top bg-stage-foreground"
          initial={false}
          animate={{ scaleY: lit ? 1 : 0.0001, opacity: lit ? 1 : 0.3 }}
          transition={reduce ? { duration: 0 } : { duration: 0.24 }}
        />
      )}
      <motion.div
        animate={{ opacity: lit ? 1 : 0.55 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
        className="grid min-h-16 items-center gap-x-4 gap-y-2 rounded-md bg-card px-4 py-3 text-foreground shadow-plate sm:grid-cols-[10rem_minmax(0,1fr)]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className={`grid size-5 shrink-0 place-items-center rounded-full text-xs transition-colors ${lit ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{n}</span>
          {title}
        </span>
        <div className="flex min-w-0 flex-col gap-1">{children}</div>
      </motion.div>
    </li>
  );
}

// The nut from the homepage: red and loose off the scale; on the scale it turns one flat and goes green.
function Nut({ tight }) {
  const reduce = useReducedMotion();
  return (
    <motion.svg viewBox="0 0 24 24" className="size-6" initial={reduce ? false : { scale: 0.4, rotate: 0 }} animate={{ scale: 1, rotate: tight && !reduce ? 60 : 0 }} transition={SPRING.turn} aria-hidden="true">
      <path d="M12 1.5 L21.1 6.75 L21.1 17.25 L12 22.5 L2.9 17.25 L2.9 6.75 Z" className={tight ? 'fill-success' : 'fill-destructive'} />
      <circle cx="12" cy="12" r="3.4" className="fill-card" />
    </motion.svg>
  );
}
