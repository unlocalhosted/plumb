/* ─────────────────────────────────────────────────────────
 * SHEET 5 · EVERYWHERE — STORYBOARD
 *
 *  scroll-scrubbed
 *  0.00   ProfileCard alone in the middle, fixed (✓)
 *  0.12   the other eight arrive around it (0.12 → 0.40, staggered by index)
 *  0.40   each gets its balloon: ✕ gap: 10px
 *  0.52   the dial unlocks; the finding is listed in the text column
 *  0.74   Toolbar and Modal are singled out: a copy and an override
 *  0.86   if nobody turned the dial, it settles on gap-3
 *
 *  visitor
 *  drag the dial    it snaps to the spacing scale; all nine redraw at once
 * ───────────────────────────────────────────────────────── */
import { useState } from 'react';
import { motion, useMotionValueEvent, useTransform } from 'motion/react';
import { THUMBS } from '../parts/thumbs.jsx';
import { Balloon } from '../site/Balloon.jsx';
import { SPRING, span } from '../site/motion.js';

const TIMING = {
  arrive: [0.12, 0.4], // the eight arrive
  balloons: 0.4, // verdicts on each
  dial: 0.52, // dial unlocks
  copies: 0.74, // copies and overrides singled out
  auto: 0.86, // dial settles on gap-3 if untouched
};

const DIAL = { min: 4, max: 24, start: 10, settle: 12, step: 4 };
const onScale = (v) => v % DIAL.step === 0;
const name = (v) => `gap-${v / 4}`;

export function EverywhereFigure({ progress }) {
  const [p, setP] = useState(0);
  const [value, setValue] = useState(DIAL.start);
  const [touched, setTouched] = useState(false);
  useMotionValueEvent(progress, 'change', (v) => {
    setP(v);
    if (v >= TIMING.auto && !touched && value === DIAL.start) setValue(DIAL.settle);
  });
  const balloons = p >= TIMING.balloons;
  const copies = p >= TIMING.copies;
  const dialOn = p >= TIMING.dial;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      <div className="grid w-full max-w-2xl grid-cols-3 gap-x-6 gap-y-8 max-sm:gap-x-3 max-sm:gap-y-4" style={{ '--demo-gap': `${value}px` }}>
        {THUMBS.map((t, i) => {
          const order = i < 4 ? i : i - 1; // ProfileCard is already there
          const arrive = t.hero ? 1 : span(p, TIMING.arrive[0] + order * 0.03, TIMING.arrive[0] + order * 0.03 + 0.12);
          const flagged = copies && t.copy;
          const verdict = t.hero ? 'on' : flagged ? 'near' : onScale(value) ? 'on' : 'off';
          return (
            <figure
              key={t.name}
              className="relative flex flex-col gap-2"
              style={{ opacity: arrive, transform: `translateY(${(1 - arrive) * 16}px) scale(${0.96 + arrive * 0.04})` }}
            >
              <figcaption className="flex items-baseline justify-between gap-2 font-mono text-xs">
                <span className={t.hero ? 'text-primary' : 'text-foreground'}>{t.name}</span>
                <span className="shrink-0 text-faint max-sm:hidden">:{t.site.split(':')[1]}</span>
              </figcaption>
              {t.draw()}
              <span className={`truncate font-mono text-xs transition-colors max-sm:hidden ${flagged ? 'text-warning' : 'text-muted-foreground'}`}>
                {flagged ? t.copyNote : t.hero ? t.wrote : onScale(value) ? `→ ${name(value)}` : t.wrote}
              </span>
              <Balloon n={i + 1} verdict={verdict} shown={t.hero || balloons} delay={order * 0.04} className="-right-3 top-3" />
            </figure>
          );
        })}
      </div>

      <Dial value={value} setValue={(v) => (setTouched(true), setValue(v))} on={dialOn} />
      <span className="self-start text-xs font-semibold text-faint">An example product; the components and files are illustrative</span>
    </div>
  );
}

function Dial({ value, setValue, on }) {
  const pct = (v) => `${((v - DIAL.min) / (DIAL.max - DIAL.min)) * 100}%`;
  const marks = [];
  for (let v = DIAL.min; v <= DIAL.max; v += DIAL.step) marks.push(v);
  return (
    <motion.div initial={false} animate={{ opacity: on ? 1 : 0.25 }} transition={SPRING.settle} className="flex w-full max-w-2xl items-center gap-6">
      <span className="flex w-40 shrink-0 flex-col whitespace-nowrap">
        <span className="text-xs font-semibold text-faint">The decision</span>
        <span className={`font-mono text-sm ${onScale(value) ? 'text-success' : 'text-destructive'}`}>
          {onScale(value) ? name(value) : 'gap-[10px]'} · {value}px
        </span>
      </span>
      <div className="relative h-12 flex-1">
        <div className="absolute inset-x-0 top-5 h-px bg-primary" />
        {marks.map((v) => (
          <span key={v} className="absolute top-5 flex -translate-x-1/2 flex-col items-center" style={{ left: pct(v) }}>
            <span className="h-2 w-px bg-primary" />
            <span className={`font-mono text-xs ${v === value ? 'text-primary' : 'text-faint'}`}>{name(v).slice(4)}</span>
          </span>
        ))}
        <motion.span className="pointer-events-none absolute top-0 -ml-2" initial={false} animate={{ left: pct(value) }} transition={SPRING.settle} aria-hidden="true">
          <svg width="16" height="20" viewBox="0 0 16 20">
            <path d="M1 0 L15 0 L8 18 z" className={onScale(value) ? 'fill-success' : 'fill-destructive'} />
          </svg>
        </motion.span>
        <input
          type="range"
          min={DIAL.min}
          max={DIAL.max}
          step={2}
          value={value}
          disabled={!on}
          aria-label="Spacing decision for all nine components"
          aria-valuetext={`${value}px, ${onScale(value) ? name(value) : 'off the scale'}`}
          onChange={(e) => {
            const v = Number(e.target.value);
            setValue(Math.round(v / DIAL.step) * DIAL.step);
          }}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
    </motion.div>
  );
}

export const everywhereBeats = [
  { at: 0, body: <p>ProfileCard is fixed. But the 10px gap was never only in ProfileCard.</p> },
  { at: TIMING.arrive[0], body: <p>Run <code>npx plumb</code> on the project and it’s in <b>eight more components</b>, written by different people in different months, spelled three different ways.</p> },
  {
    at: TIMING.dial,
    body: (
      <div className="flex flex-col gap-3">
        <p>Plumb reports them as <b>one finding with one answer</b>, because they compile to the same declaration. Drag the decision: every site moves with it.</p>
        <pre className="font-mono text-xs text-foreground">
          {`gap: 10px · 8 sites · answer: gap-3
SettingsRow.jsx:14  gap-[10px]
Toolbar.jsx:22      style gap: 10
toast.css:8         .toast gap: 10px
… 5 more`}
        </pre>
      </div>
    ),
  },
  { at: TIMING.copies, body: <p>It knows your components, too. <b>Toolbar</b> builds its own button out of a <code>div</code> instead of using Button. <b>Modal</b> overrides Button’s background, which Button owns. A class-name linter sees neither.</p> },
];
