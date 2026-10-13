/* ─────────────────────────────────────────────────────────
 * SCALES — STORYBOARD (scroll-scrubbed)
 *
 * A spec plate of this page's own design system: spacing, type, corners, elevation, colour.
 *
 *  0.00   the plate draws in, one panel after another (0.02 → 0.40)
 *  0.42   ProfileCard's drifted values land on it, one by one (60ms apart in scroll):
 *         each scale opens a gap between the two steps the value falls between,
 *         and the value sits there as a dashed red ghost
 *  0.74   the answer: the steps that fit light up, and each ghost names its fix
 * ───────────────────────────────────────────────────────── */
import { useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent } from 'motion/react';
import { COLOUR, ELEVATION, RADIUS, SPACING, TYPE } from '../parts/system.js';
import { SPRING, span } from '../site/motion.js';
import { useNarrow } from '../site/useNarrow.js';

const TIMING = {
  panels: [0.02, 0.4], // the plate draws in
  ghosts: 0.42, // first ghost lands
  ghostStep: 0.06, // scroll between ghosts
  answer: 0.74, // the fitting steps light up
};

const DRAW = {
  spacing: 1.5, // the spacing scale is drawn at 1.5×
  radius: 5, // corners are drawn at 5× so 2px reads
};

// ProfileCard's drifts, where each lands, and what fits.
const GHOSTS = [
  { id: 'gap', family: 'spacing', after: '2', px: 10, wrote: 'gap-[10px]', fits: ['2', '3'], fix: 'gap-3' },
  { id: 'pad', family: 'spacing', after: '3', px: 14, wrote: 'px-[14px]', fits: ['3', '4'], fix: 'px-3' },
  { id: 'radius', family: 'radius', after: 'md', px: 5, wrote: 'rounded-[5px]', fits: ['md', 'lg'], fix: 'rounded-md' },
  { id: 'shadow', family: 'elevation', after: 'lift', wrote: 'shadow-[0_2px_8px…]', fits: ['lift'], fix: 'shadow-lift' },
  { id: 'badge', family: 'colour', after: 'primary', wrote: 'bg-[#2b4fe6]', fits: ['primary'], fix: 'bg-primary' },
];

function usePlate(progress) {
  const [p, setP] = useState(0);
  useMotionValueEvent(progress, 'change', setP);
  const panel = (i) => span(p, TIMING.panels[0] + i * 0.07, TIMING.panels[0] + i * 0.07 + 0.12);
  const landed = (id) => p >= TIMING.ghosts + GHOSTS.findIndex((g) => g.id === id) * TIMING.ghostStep;
  const answer = p >= TIMING.answer;
  return { panel, landed, answer };
}

function Panel({ title, note, t, className = '', children }) {
  return (
    <section className={`plate flex min-w-0 flex-col gap-2 px-4 py-3 max-sm:gap-1 ${className}`} style={{ opacity: t, transform: `translateY(${(1 - t) * 12}px)` }}>
      <header className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{note}</span>
      </header>
      {children}
    </section>
  );
}

// A value that isn't a step pushes the steps apart to fit.
function Ghost({ g, on, answer, children, label = 'top', raise = false }) {
  return (
    <AnimatePresence initial={false}>
      {on && (
        <motion.div
          key={g.id}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 'auto', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={SPRING.settle}
          className="relative flex shrink-0 flex-col items-center justify-end overflow-visible"
        >
          {children}
          <span className={`absolute ${label === 'top' ? (raise ? 'bottom-full mb-6' : 'bottom-full mb-1.5') : 'top-full mt-1.5'} left-1/2 -translate-x-1/2 font-mono text-xs whitespace-nowrap ${answer ? 'text-success' : 'text-destructive'}`}>
            {answer ? `→ ${g.fix}` : g.wrote}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const ghostLine = 'rounded-sm border-2 border-dashed border-destructive bg-destructive/10';

export function ScalesFigure({ progress }) {
  const { panel, landed, answer } = usePlate(progress);
  const k = useNarrow() ? 1 : DRAW.spacing; // phones draw spacing at 1×
  const fits = (family, name) => answer && GHOSTS.some((g) => g.family === family && g.fits.includes(name));
  const ghostAfter = (family, name) => GHOSTS.find((g) => g.family === family && g.after === name);

  return (
    <div className="flex h-full flex-col justify-center gap-4 max-sm:gap-3">
      {/* spacing */}
      <Panel title="Spacing" note={`--spacing × n · drawn ×${k}`} t={panel(0)}>
        <div className="flex items-end gap-3 pt-10 max-sm:gap-1.5 max-sm:pt-8">
          {SPACING.map((s) => {
            const g = ghostAfter('spacing', s.name);
            return [
              <div key={s.name} className="flex shrink-0 flex-col items-center gap-2">
                <span
                  className={`rounded-sm transition-colors ${fits('spacing', s.name) ? 'bg-primary' : 'bg-tint-2'}`}
                  style={{ width: s.px * k, height: s.px * k }}
                />
                <span className="font-mono text-xs font-semibold text-foreground">{s.name}</span>
                <span className="font-mono text-xs text-muted-foreground max-sm:hidden">{s.px}</span>
              </div>,
              g && (
                <Ghost key={g.id} g={g} on={landed(g.id)} answer={answer} raise={g.id === 'pad'}>
                  <div className="flex flex-col items-center gap-2 pb-12 max-sm:pb-6">
                    <span className={ghostLine} style={{ width: g.px * k, height: g.px * k }} />
                  </div>
                  <span className="absolute bottom-0 font-mono text-xs text-destructive max-sm:hidden">{g.px}</span>
                </Ghost>
              ),
            ];
          })}
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-[1.25fr_1fr] max-sm:gap-3">
        {/* type */}
        <Panel title="Type" note="size / leading" t={panel(1)} className="max-sm:hidden">
          <ol className="flex flex-col">
            {TYPE.filter((ty) => !['lg', '5xl'].includes(ty.name)).map((ty) => (
              <li key={ty.name} className="grid grid-cols-[72px_1fr] items-end gap-3 border-b border-border last:border-0 max-sm:hidden [&:nth-child(n+3)]:max-sm:grid">
                <span className="flex flex-col pb-1">
                  <span className="font-mono text-xs font-semibold text-foreground">{ty.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {ty.size}/{ty.lead}
                  </span>
                </span>
                <span className="flex items-baseline justify-between gap-2 overflow-hidden">
                  <span className={`truncate ${ty.cls}`}>{ty.size >= 60 ? 'Aa' : ty.role}</span>
                  {ty.card && <span className="shrink-0 font-mono text-xs text-success">✓ card</span>}
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="flex flex-col gap-4 max-sm:gap-3">
          {/* corners */}
          <Panel title="Corners" note={`drawn ×${DRAW.radius}`} t={panel(2)}>
            <div className="flex items-end gap-4 pt-6 max-sm:pt-5">
              {RADIUS.map((r) => {
                const g = ghostAfter('radius', r.name);
                return [
                  <div key={r.name} className="flex shrink-0 flex-col items-center gap-2">
                    <span
                      className={`size-10 transition-colors ${fits('radius', r.name) ? 'bg-primary' : 'bg-tint-2'}`}
                      style={{ borderTopLeftRadius: r.px * DRAW.radius }}
                    />
                    <span className="font-mono text-xs font-semibold text-foreground">{r.name}</span>
                  </div>,
                  g && (
                    <Ghost key={g.id} g={g} on={landed(g.id)} answer={answer}>
                      <span className="mb-6 size-10 border-2 border-dashed border-destructive bg-destructive/10" style={{ borderTopLeftRadius: g.px * DRAW.radius }} />
                    </Ghost>
                  ),
                ];
              })}
            </div>
          </Panel>

          {/* elevation */}
          <Panel title="Elevation" note="held things lift" t={panel(3)} className="max-sm:hidden">
            <div className="flex items-end gap-4 pt-6">
              {ELEVATION.map((e) => {
                const g = ghostAfter('elevation', e.name);
                return [
                  <div key={e.name} className="flex shrink-0 flex-col items-center gap-2">
                    <span className={`h-8 w-12 rounded-md bg-card ${e.cls} ${!e.cls ? 'border border-primary/40' : ''} ${fits('elevation', e.name) ? 'ring-2 ring-tint-3' : ''}`} />
                    <span className="font-mono text-xs font-semibold text-foreground">{e.name}</span>
                  </div>,
                  g && (
                    <Ghost key={g.id} g={g} on={landed(g.id)} answer={answer}>
                      <span className="mb-6 h-8 w-12 rounded-md border border-dashed border-destructive bg-card" style={{ boxShadow: '0 2px 8px rgb(0 0 0 / 0.12)' }} />
                    </Ghost>
                  ),
                ];
              })}
            </div>
          </Panel>
        </div>
      </div>

      {/* colour */}
      <Panel title="Colour" note="one ink, its tints, two for text" t={panel(4)}>
        <div className="flex items-end gap-2 pt-6 max-sm:pt-5">
          {COLOUR.map((c) => {
            const g = ghostAfter('colour', c.name);
            return [
              <div key={c.name} className="flex min-w-0 flex-1 flex-col gap-2">
                <span className={`h-9 rounded-md ${c.cls} ${fits('colour', c.name) ? 'ring-2 ring-success ring-offset-2 ring-offset-background' : ''}`} />
                <span className="truncate font-mono text-xs font-semibold text-foreground">{c.name}</span>
              </div>,
              g && (
                <Ghost key={g.id} g={g} on={landed(g.id)} answer={answer}>
                  <span className="mb-6 h-8 w-12 rounded-sm border border-dashed border-destructive" style={{ background: '#2b4fe6' }} />
                </Ghost>
              ),
            ];
          })}
        </div>
      </Panel>
    </div>
  );
}

export const scalesBeats = [
  { at: 0, body: <p>Your theme already is a design system. Plumb reads it as you wrote it: <b>the spacing scale, the type ladder, the corners, the shadows, the colours</b>, each with the reason in its comment. This plate is this page’s own.</p> },
  { at: TIMING.ghosts, body: <p>Then it compiles every value in your code with your own Tailwind and puts each one on its scale. ProfileCard’s five drifts <b>don’t land on a step</b>: the scale has to open a gap to fit them.</p> },
  { at: TIMING.answer, body: <p>So each one comes back with the steps that fit: <code>10px</code> → gap-2 or gap-3, <code>5px</code> → rounded-md or rounded-lg, a hand-typed shadow → <code>shadow-lift</code>, <code>#2b4fe6</code> → primary. <b>Off the scale, with the answer.</b></p> },
];
