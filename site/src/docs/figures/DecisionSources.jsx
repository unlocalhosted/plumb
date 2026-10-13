/* ─────────────────────────────────────────────────────────
 * DECISION SOURCES — where a step and its reason come from, and where the reason comes back (site/DOCS.md §4.4)
 *
 * The source is this site's real styles.css: the base --radius at line 94 and the four radius tokens at 199–206,
 * each with the `why:` written above it. The values, reasons and lines match the resolver's recording
 * (docs/recordings/decisions.json). The drift at the bottom is the hero card's real rounded-[10px].
 *
 *  rest      the source on the left, the four corners on the right, drawn at their resolved radius
 *  link      hover or focus a corner and its two source lines light; hover a source line and its corner lights
 *  base      change --radius (type, or ↑ ↓): every calc() resolves again and the corners re-round on `settle`;
 *            the offer for rounded-[10px] re-sorts to the new nearest steps
 *  reason    edit a why: the reason under its corner and in the offer change as you type. Empty it and the
 *            token stays on the scale with nothing to say for itself, in the corner and in the offer
 *  reduced motion: corners change radius without travel
 * ───────────────────────────────────────────────────────── */
import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SPRING } from '../../site/motion.js';

const BASE = { line: 94, value: 8 };
const TOKENS = [
  { key: 'sm', line: 200, expr: 'calc(var(--radius) - 3px)', of: (r) => r - 3, why: 'chips, keys, small controls' },
  { key: 'md', line: 202, expr: 'var(--radius)', of: (r) => r, why: 'controls and inputs' },
  { key: 'lg', line: 204, expr: 'calc(var(--radius) + 4px)', of: (r) => r + 4, why: 'cards and panels you hold' },
  { key: 'full', line: 206, expr: '9999px', of: () => 9999, why: 'a switch, an avatar, round things that are round' },
];
const DRIFT = { file: 'hero/DriftedCard.jsx', line: 24, cls: 'rounded-[10px]', px: 10 };

// the steps Plumb offers for a value: the nearest by distance, ties to the larger, two of them
const offersFor = (px, steps) =>
  [...steps]
    .filter((s) => s.px < 1000)
    .sort((a, b) => Math.abs(a.px - px) - Math.abs(b.px - px) || b.px - a.px)
    .slice(0, 2);

function Reason({ why }) {
  return why.trim() ? <span>{why}</span> : <span className="italic opacity-60">no reason written</span>;
}

export function DecisionSources() {
  const reduce = useReducedMotion();
  const [base, setBase] = useState(BASE.value);
  const [whys, setWhys] = useState(() => TOKENS.map((t) => t.why));
  const [hot, setHot] = useState(null); // the token whose corner and lines are lit

  const steps = TOKENS.map((t, i) => ({ ...t, px: Math.max(0, t.of(base)), why: whys[i] }));
  const offers = offersFor(DRIFT.px, steps);
  const lit = (key) => (hot === key ? 'border-code-keyword bg-code-foreground/10' : 'border-transparent');
  const link = (key) => ({ onPointerEnter: () => setHot(key), onPointerLeave: () => setHot(null), onFocus: () => setHot(key), onBlur: () => setHot(null) });

  return (
    <figure className="my-10">
      <div className="overflow-hidden rounded-lg bg-card shadow-plate">
        <div className="flex items-center justify-between px-5 pt-4 font-mono text-xs text-muted-foreground">
          <span>Fig 1</span>
          <span className="uppercase">A step and its reason</span>
        </div>

        <div className="flex flex-col gap-6 p-5">
          {/* the source: styles.css as it is, with the base and the reasons editable in place */}
          <div className="overflow-hidden rounded-md bg-code font-mono text-sm text-code-foreground">
            <div className="border-b border-code-foreground/10 px-4 py-2 font-sans text-xs font-semibold text-code-comment">src/styles.css</div>
            <div className="flex flex-col overflow-x-auto py-2">
              <Line n={BASE.line}>
                --radius:{' '}
                <input
                  type="number"
                  min={3}
                  max={24}
                  value={base}
                  onChange={(e) => setBase(Math.max(3, Math.min(24, Number(e.target.value) || 0)))}
                  aria-label="Base radius in px"
                  className="w-[4ch] rounded-sm bg-code-foreground/10 text-center text-code-flag tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-code-keyword [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-code-flag">px</span>;
              </Line>
              <div className="px-4 py-1 text-code-comment" aria-hidden="true">
                ⋮
              </div>
              {steps.map((s, i) => (
                <div key={s.key} className={`border-l-2 transition-colors ${lit(s.key)}`} {...link(s.key)}>
                  <Line n={s.line - 1}>
                    <span className="text-code-comment">/* why: </span>
                    <input
                      value={s.why}
                      onChange={(e) => setWhys((w) => w.map((x, j) => (j === i ? e.target.value : x)))}
                      aria-label={`Reason for --radius-${s.key}`}
                      spellCheck={false}
                      style={{ width: `${Math.max(s.why.length, 1) + 1}ch` }}
                      className="max-w-full rounded-sm border-b border-dashed border-code-string/40 bg-transparent text-code-string outline-none hover:bg-code-foreground/10 focus-visible:bg-code-foreground/10 focus-visible:outline-2 focus-visible:outline-code-keyword"
                    />
                    <span className="text-code-comment">*/</span>
                  </Line>
                  <Line n={s.line}>
                    --radius-{s.key}: <span className="text-code-keyword">{s.expr}</span>;
                  </Line>
                </div>
              ))}
            </div>
          </div>

          {/* the scale they make: each step drawn at its resolved radius */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            {steps.map((s) => (
              <div key={s.key} tabIndex={0} {...link(s.key)} className="group flex flex-col gap-2 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-primary">
                <motion.div
                  className={`h-14 w-full border-2 bg-tint-1 transition-colors ${hot === s.key ? 'border-primary' : 'border-border'}`}
                  initial={false}
                  animate={{ borderRadius: Math.min(s.px, 28) }}
                  transition={reduce ? { duration: 0 } : SPRING.settle}
                />
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="font-mono">
                    rounded-{s.key} <span className="text-muted-foreground tabular-nums">{s.px >= 1000 ? '9999px' : `${s.px}px`}</span>
                  </span>
                  <span className="text-muted-foreground">
                    <Reason why={s.why} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* where the reason comes back: Plumb's offer at a drifted value */}
        <div className="border-t border-border bg-muted/50 px-5 py-4 text-sm" aria-live="polite">
          <div className="mb-2 font-mono text-xs text-muted-foreground">
            {DRIFT.file}:{DRIFT.line} · <span className="font-semibold text-destructive">{DRIFT.cls}</span> is off your radius scale. Plumb offers:
          </div>
          <ul className="flex flex-col gap-1">
            {offers.map((s) => (
              <li key={s.key} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono font-semibold text-primary">rounded-{s.key}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{s.px}px</span>
                <span className="text-muted-foreground">
                  <Reason why={s.why} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        This site's radius tokens, from its real <code className="font-mono">styles.css</code>. Change <code className="font-mono">--radius</code> or
        rewrite a reason: the scale and Plumb's offer for the homepage card's <code className="font-mono">rounded-[10px]</code> follow.
      </figcaption>
    </figure>
  );
}

function Line({ n, children, className = '' }) {
  return (
    <div className={`flex gap-4 px-4 py-0.5 whitespace-nowrap ${className}`}>
      <span className="w-[3ch] shrink-0 text-right text-code-comment select-none tabular-nums" aria-hidden="true">
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
