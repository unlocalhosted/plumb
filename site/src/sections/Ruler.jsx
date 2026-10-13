/* ─────────────────────────────────────────────────────────
 * RULER — a spacing scale drawn as a ladder: every step at its true length, your value one more bar
 *
 * Meaning: a spacing step is a distance, so each one is drawn as that distance; the reason written beside it sits in
 * the same row. Your value is the bar on top. A hairline guide falls from its end through every row, so you read
 * at a glance which step it meets, or which two it falls between.
 *
 *  rest       your bar grows from 0 to its value once, on `settle`, when the ladder comes into view
 *  drag       anywhere over the bars; the value follows the pointer exactly until it comes within MAGNET px of a
 *             step, then springs onto it (`detent`). Leaving a step takes RELEASE px of pull.
 *  on a step  that row's token turns primary and a contact dot pops at the end of its bar, where the guide meets
 *             it; your bar and its handle turn primary; the class reads gap-3
 *  between    the two steps either side lift to full ink and show how far you are from each (−1, +3); your bar's
 *             end and handle carry the drift colour; the class reads gap-[13px]
 *  click      a row seats your value on that step
 *  keys       ← → (and ↑ ↓) step through the scale; Home and End go to its ends
 *  steps      change (Tailwind's defaults ↔ your theme): rows that leave fold away, new ones unfold, the rest stay
 *  reduced motion: no growth, no detent travel, no folding; the dot appears without the pop
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'motion/react';
import { SPRING } from '../site/motion.js';

export const RULER = { magnet: 8, release: 12 };

const ROW = 'grid grid-cols-[6rem_minmax(0,1fr)_3.5rem] items-center gap-x-4 sm:grid-cols-[7rem_minmax(0,1.3fr)_4rem_minmax(0,1fr)]';
const fmt = (n) => `${Math.round(n * 2) / 2}`;

/**
 * @param steps    [{ v: px, key: '3', why: string | null }]
 * @param max      px at the right end of the bars
 * @param start    px your value starts on
 * @param prefix   utility prefix, e.g. 'gap'
 * @param onSettle (step | null, px) whenever your value lands on a step or leaves one
 * @param value    optional motion value to drive, so a figure can follow without re-rendering
 * @param readout  false to leave the summary line to the caller
 */
export function Ruler({ steps, max = 40, start = 13, prefix = 'gap', onSettle, value, readout = true, className = '' }) {
  const reduce = useReducedMotion();
  const own = useMotionValue(reduce ? start : 0);
  const v = value ?? own;
  const width = useTransform(v, (x) => `${(Math.min(x, max) / max) * 100}%`);
  const [px, setPx] = useState(v.get());
  const [on, setOn] = useState(null);
  const [held, setHeld] = useState(false);
  const track = useRef(null);
  const root = useRef(null);
  const seen = useInView(root, { once: true, amount: 0.4 });
  useMotionValueEvent(v, 'change', (x) => setPx(Math.round(x * 2) / 2));

  // your bar grows to its value once, when the ladder is first seen
  useEffect(() => {
    if (!seen || reduce || value) return;
    animate(v, start, SPRING.settle);
  }, [seen]);
  // when the steps change under it, a value on a step that no longer exists lets go
  useEffect(() => {
    if (!on) return;
    const same = steps.find((s) => s.v === on.v);
    land(same ?? null, v.get());
  }, [steps]);

  const land = (step, x) => {
    setOn(step);
    onSettle?.(step, step ? step.v : x);
  };
  const seat = (step) => {
    animate(v, step.v, reduce ? { duration: 0 } : SPRING.detent);
    land(step);
  };
  const pull = (clientX) => {
    const r = track.current.getBoundingClientRect();
    const per = r.width / max;
    const raw = Math.max(0, Math.min(max, (clientX - r.left) / per));
    if (on && Math.abs(raw - on.v) * per <= RULER.release) return; // still held by the magnet
    const near = steps.reduce((a, s) => (Math.abs(s.v - raw) < Math.abs(a.v - raw) ? s : a), steps[0]);
    if (Math.abs(near.v - raw) * per <= RULER.magnet) {
      if (on?.v !== near.v) seat(near);
      return;
    }
    v.set(raw);
    if (on) land(null, raw);
  };
  const sorted = [...steps].sort((a, b) => a.v - b.v);
  const stepBy = (dir) => {
    const here = v.get();
    const next = dir > 0 ? sorted.find((s) => s.v > here + 0.01) : [...sorted].reverse().find((s) => s.v < here - 0.01);
    if (next) seat(next);
  };
  const below = on ? null : [...sorted].reverse().find((s) => s.v < px);
  const above = on ? null : sorted.find((s) => s.v > px);
  const near = (s) => s === below || s === above;
  const cls = on ? `${prefix}-${on.key}` : `${prefix}-[${fmt(px)}px]`;

  const drag = {
    onPointerDown: (e) => {
      if (!e.target.closest('[data-track]')) return;
      setHeld(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      pull(e.clientX);
    },
    onPointerMove: (e) => held && pull(e.clientX),
    onPointerUp: () => setHeld(false),
    onPointerCancel: () => setHeld(false),
  };

  return (
    <div ref={root} className={`flex flex-col gap-3 ${className}`}>
      <div {...drag} className="flex touch-none flex-col select-none">
        {/* yours */}
        <div className={`${ROW} pb-3`}>
          <code className={`truncate font-mono text-sm font-medium transition-colors ${on ? 'text-primary' : 'text-destructive'}`}>{cls}</code>
          <div ref={track} data-track className="relative h-8 cursor-ew-resize">
            <motion.span className={`absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full transition-colors ${on ? 'bg-primary' : 'bg-foreground/70'}`} style={{ width }} />
            <motion.button
              type="button"
              role="slider"
              aria-label={`${prefix} value`}
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={px}
              aria-valuetext={on ? `${px}px, ${prefix}-${on.key}` : `${px}px, off the scale`}
              onKeyDown={(e) => {
                const k = e.key;
                if (k === 'ArrowRight' || k === 'ArrowUp') (e.preventDefault(), stepBy(1));
                if (k === 'ArrowLeft' || k === 'ArrowDown') (e.preventDefault(), stepBy(-1));
                if (k === 'Home') (e.preventDefault(), seat(sorted[0]));
                if (k === 'End') (e.preventDefault(), seat(sorted.at(-1)));
              }}
              className="absolute top-1/2 grid size-6 -translate-1/2 cursor-grab place-items-center rounded-full outline-none active:cursor-grabbing"
              style={{ left: width }}
              animate={{ scale: held ? 1.15 : 1 }}
              transition={SPRING.snap}
            >
              <span className={`size-3.5 rounded-full border-2 bg-card shadow-plate transition-colors ${on ? 'border-primary' : 'border-destructive'}`} />
              <span className="pointer-events-none absolute inset-0 rounded-full [button:focus-visible>&]:ring-2 [button:focus-visible>&]:ring-primary" />
            </motion.button>
          </div>
          <span className={`text-right font-mono text-sm font-medium tabular-nums transition-colors ${on ? 'text-primary' : 'text-foreground'}`}>{fmt(px)}px</span>
          <span className="hidden truncate text-sm text-muted-foreground sm:block">{on ? (on.why ?? 'no reason written') : 'off the scale'}</span>
        </div>

        {/* the scale, a row per step */}
        <div className="border-t border-border pt-2">
          <AnimatePresence initial={false}>
            {sorted.map((s) => {
              const here = on?.v === s.v;
              const side = near(s);
              const delta = side ? s.v - px : null;
              return (
                <motion.div
                  key={s.key}
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={SPRING.settle}
                  className="overflow-hidden"
                >
                  <div className={`${ROW} h-7 cursor-pointer`} onClick={() => seat(s)}>
                    <code className={`font-mono text-sm transition-colors ${here ? 'font-medium text-primary' : side ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {prefix}-{s.key}
                    </code>
                    <div data-track className="relative h-full cursor-ew-resize">
                      <span
                        className={`absolute top-1/2 left-0 h-0.5 -translate-y-1/2 rounded-full transition-colors duration-(--dur-quick) ${here ? 'bg-primary' : side ? 'bg-foreground/45' : 'bg-foreground/15'}`}
                        style={{ width: `${(Math.min(s.v, max) / max) * 100}%` }}
                      />
                      {/* the contact: where your value meets this step */}
                      <AnimatePresence>
                        {here && (
                          <motion.span
                            className="absolute top-1/2 size-1.5 -translate-1/2 rounded-full bg-primary"
                            style={{ left: `${(Math.min(s.v, max) / max) * 100}%` }}
                            initial={reduce ? false : { scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={SPRING.pop}
                          />
                        )}
                      </AnimatePresence>
                      {/* the guide, a hairline from your value's end through every row */}
                      <motion.span className={`pointer-events-none absolute inset-y-0 w-px transition-colors ${on ? 'bg-primary/40' : 'bg-foreground/20'}`} style={{ left: width }} />
                    </div>
                    <span className="flex items-baseline justify-end gap-1 font-mono text-xs tabular-nums">
                      {delta !== null && <span className="text-muted-foreground">{delta > 0 ? `+${fmt(delta)}` : `−${fmt(-delta)}`}</span>}
                      <span className={here ? 'text-primary' : side ? 'text-foreground' : 'text-muted-foreground'}>{s.v}px</span>
                    </span>
                    <span className={`hidden truncate text-sm transition-colors sm:block ${here || side ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>{s.why ?? ''}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* the readout: what Plumb would say */}
      {readout && (
        <p className="min-h-6 text-sm" aria-live="polite">
          {on ? (
            <>
              <code className="font-mono font-medium text-primary">{cls}</code> <span className="text-muted-foreground">is a step of this scale{on.why ? `: ${on.why}` : ', with no reason written'}.</span>
            </>
          ) : (
            <>
              <code className="font-mono font-medium text-destructive">{cls}</code>{' '}
              <span className="text-muted-foreground">
                is off this scale.{' '}
                {[below, above]
                  .filter(Boolean)
                  .map((s) => `${prefix}-${s.key}`)
                  .join(' or ')}{' '}
                {below && above ? 'either side.' : 'is nearest.'}
              </span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
