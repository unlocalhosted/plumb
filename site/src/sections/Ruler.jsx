/* ─────────────────────────────────────────────────────────
 * RULER — a spacing scale you can drag a value along, with a magnet on every step (site/HOMEPAGE.md §4.2)
 *
 *  load      the steps grow from the baseline, 40ms apart, on `settle`; the handle drops onto its start value
 *  drag      the handle follows the pointer exactly until it comes within 8px of a step; then it springs onto the
 *            step on `detent` and that step pulses (1 → 1.15 → 1, 100ms). Leaving a step takes 12px of pull.
 *  readout   "13px · off the scale", or "12px · gap-3 · related parts and compact controls"
 *  keys      ← → move the handle to the previous or next step
 *  steps     change (Tailwind's defaults ↔ your theme): steps that leave shrink away, new ones grow in, labels stay put
 * ───────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'motion/react';
import { SPRING } from '../site/motion.js';

export const RULER = { magnet: 8, release: 12, stagger: 0.04 };

/**
 * @param steps    [{ v: px, key: '3', why }]
 * @param max      px at the right end
 * @param start    px the handle starts on
 * @param prefix   utility prefix for the readout, e.g. 'gap'
 * @param onSettle (step | null, px) whenever the handle lands on a step or leaves one
 * @param value    optional motion value to drive, so a figure can follow the handle without re-rendering
 * @param readout  false to leave the readout line to the caller
 */
export function Ruler({ steps, max = 40, start = 13, prefix = 'gap', onSettle, value, readout = true, tone = 'paper', className = '' }) {
  const reduce = useReducedMotion();
  const track = useRef(null);
  const own = useMotionValue(start);
  const v = value ?? own;
  const left = useTransform(v, (x) => `${(x / max) * 100}%`);
  const [on, setOn] = useState(null); // the step the handle sits on
  const [px, setPx] = useState(start);
  const [pulse, setPulse] = useState(0);
  const held = useRef(false);
  // the label reads the value itself, so it agrees with the handle in every frame (the drop-in, the detent)
  useMotionValueEvent(v, 'change', (x) => setPx(Math.round(x * 2) / 2));

  // the handle drops onto its start value once, after the steps have grown
  useEffect(() => {
    if (reduce) return;
    v.set(start + 6);
    animate(v, start, { ...SPRING.pop, delay: steps.length * RULER.stagger + 0.15 });
  }, []);
  // when the steps change under it, a handle on a step that no longer exists lets go
  // and one still on a step takes that step's meaning in the new scale (its reason, or the lack of one)
  useEffect(() => {
    if (!on) return;
    const same = steps.find((s) => s.v === on.v);
    settle(same ?? null, v.get());
  }, [steps]);

  const settle = (step, x) => {
    setOn(step);
    setPx(step ? step.v : Math.round(x * 2) / 2);
    onSettle?.(step, step ? step.v : x);
  };

  const pull = (clientX) => {
    const r = track.current.getBoundingClientRect();
    const per = r.width / max;
    const raw = Math.max(0, Math.min(max, (clientX - r.left) / per));
    if (on && Math.abs(raw - on.v) * per <= RULER.release) return; // still held by the magnet
    const near = steps.reduce((a, s) => (Math.abs(s.v - raw) < Math.abs(a.v - raw) ? s : a), steps[0]);
    if (Math.abs(near.v - raw) * per <= RULER.magnet) {
      if (on?.v !== near.v) {
        animate(v, near.v, reduce ? { duration: 0 } : SPRING.detent);
        setPulse((p) => p + 1);
        settle(near);
      }
      return;
    }
    v.set(raw);
    if (on) settle(null, raw);
    else setPx(Math.round(raw * 2) / 2);
  };

  const step = (dir) => {
    const ordered = [...steps].sort((a, b) => a.v - b.v);
    const here = v.get();
    const next = dir > 0 ? ordered.find((s) => s.v > here + 0.01) : [...ordered].reverse().find((s) => s.v < here - 0.01);
    if (!next) return;
    animate(v, next.v, reduce ? { duration: 0 } : SPRING.detent);
    setPulse((p) => p + 1);
    settle(next);
  };

  const ink = tone === 'stage' ? 'text-stage-foreground' : 'text-foreground';
  const sayPx = `${px}px`;
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div
        ref={track}
        className={`relative h-24 touch-none select-none ${ink}`}
        onPointerDown={(e) => {
          held.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          pull(e.clientX);
        }}
        onPointerMove={(e) => held.current && pull(e.clientX)}
        onPointerUp={() => (held.current = false)}
        onPointerCancel={() => (held.current = false)}
      >
        {/* the baseline */}
        <span className="absolute inset-x-0 top-14 h-px bg-current opacity-25" />
        {/* the steps: a bar per token, height by value, growing from the baseline */}
        <AnimatePresence initial={!reduce}>
          {steps.map((s, i) => {
            const here = on?.v === s.v;
            return (
              <motion.span
                key={s.key}
                className="absolute inset-y-0 w-0"
                style={{ left: `${(s.v / max) * 100}%` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* the bar stands on the baseline (56px down), its height by value */}
                <motion.span
                  key={here ? `on${pulse}` : 'off'}
                  className={`absolute bottom-10 left-0 block w-1 -translate-x-1/2 origin-bottom rounded-full ${here ? 'bg-primary' : 'bg-current opacity-45'}`}
                  style={{ height: 10 + s.v * 0.6 }}
                  initial={here ? { scaleY: 1, scaleX: 1 } : { scaleY: 0 }}
                  animate={here ? { scaleX: [1, 1.6, 1], scaleY: [1, 1.15, 1] } : { scaleY: 1 }}
                  transition={here ? { duration: 0.1 } : { ...SPRING.settle, delay: i * RULER.stagger }}
                />
                {/* every label on one line under the baseline */}
                <span className={`absolute top-16 left-0 -translate-x-1/2 font-mono text-xs tabular-nums ${here ? 'font-semibold text-primary' : 'opacity-60'}`}>{s.key}</span>
              </motion.span>
            );
          })}
        </AnimatePresence>
        {/* the handle */}
        <motion.button
          type="button"
          role="slider"
          aria-label={`${prefix} value`}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={px}
          aria-valuetext={on ? `${sayPx}, ${prefix}-${on.key}` : `${sayPx}, off the scale`}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') (e.preventDefault(), step(1));
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') (e.preventDefault(), step(-1));
          }}
          style={{ left }}
          className="absolute top-10 z-(--z-raised) -ml-4 grid size-8 cursor-grab place-items-center rounded-full outline-none active:cursor-grabbing"
        >
          <span className={`size-5 rounded-full border-2 shadow-plate transition-colors ${on ? 'border-primary bg-primary' : 'border-destructive bg-card'}`} />
          <span className={`absolute -top-6 rounded-sm px-1.5 font-mono text-xs font-semibold tabular-nums whitespace-nowrap ${on ? 'bg-primary text-primary-foreground' : 'bg-destructive text-primary-foreground'}`}>
            {sayPx}
          </span>
        </motion.button>
      </div>
      {/* the readout */}
      {readout && (
      <p className={`min-h-6 font-mono text-sm ${ink}`} aria-live="polite">
        {on ? (
          <>
            <b className={`font-semibold ${tone === 'stage' ? 'underline decoration-2 underline-offset-4' : 'text-primary'}`}>{sayPx}</b> · {prefix}-{on.key} · <span className="font-sans opacity-75">{on.why}</span>
          </>
        ) : (
          <>
            <b className={`rounded-sm px-1 font-semibold ${tone === 'stage' ? 'bg-destructive text-primary-foreground' : 'text-destructive'}`}>{sayPx}</b> · off the scale
          </>
        )}
      </p>
      )}
    </div>
  );
}
