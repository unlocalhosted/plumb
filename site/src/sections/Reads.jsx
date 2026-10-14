/* ─────────────────────────────────────────────────────────
 * IT READS YOUR SYSTEM (site/HOMEPAGE.md §4.2) — paper section
 *
 *  load      the ruler's steps grow from the baseline (40ms apart); the handle drops onto 13px; the chips fan out
 *            from a stack on `pop`, 50ms apart
 *  drag      the handle detents onto your steps (see Ruler); the readout gives the step's name and its reason
 *  toggle    "Tailwind's defaults" ↔ "This site's theme": the steps change under the handle. On the defaults 13px
 *            sits between 3 and 3.5, steps nobody chose; on the theme it sits between 3 and 4, each with a reason.
 * ───────────────────────────────────────────────────────── */
import { useState } from 'react';
import { motion } from 'motion/react';
import { Section } from './Section.jsx';
import { Ruler } from './Ruler.jsx';
import { CHIPS, DEFAULTS, THEME } from './scales.js';
import { SPRING } from '../site/motion.js';

const TIMING = { chips: 0.05 }; // s between chips fanning out

export function Reads() {
  const [ours, setOurs] = useState(true);
  return (
    <Section
      id="reads"
      n={0}
      title="It reads your system."
      lead="Plumber doesn't bring a scale of its own. It reads the one in your theme, with the reason you gave each step, and measures every value against it."
    >
      <div className="plate flex flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">Spacing, 0 to 40px</span>
            <span className="text-sm text-muted-foreground">Drag the handle. It sticks to steps that exist.</span>
          </div>
          <div role="radiogroup" aria-label="Which scale" className="inline-flex rounded-md bg-muted p-1 text-sm font-semibold">
            {[
              [true, "This site's theme"],
              [false, "Tailwind's defaults"],
            ].map(([value, label]) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={ours === value}
                onClick={() => setOurs(value)}
                className={`relative rounded-sm px-3 py-1.5 transition-colors ${ours === value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {ours === value && <motion.span layoutId="reads-scale" transition={SPRING.snap} className="absolute inset-0 rounded-sm bg-card shadow-plate" />}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <Ruler steps={ours ? THEME : DEFAULTS} start={13} prefix="gap" />
        <p className="text-sm text-muted-foreground">
          {ours
            ? 'Eleven steps up to 40px, three with a reason written beside them. 13px lands between 3 and 4: Plumber offers both and says why each exists.'
            : "Fifteen steps, none with a reason. 13px lands between 3 and 3.5, and a linter would happily suggest a step your team never chose."}
        </p>
      </div>

      {/* the rest of the system, with its reasons */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CHIPS.map((c, i) => (
          <motion.li
            key={c.name}
            initial={{ y: -12, rotate: (i % 2 ? 1 : -1) * 3, opacity: 0 }}
            whileInView={{ y: 0, rotate: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ ...SPRING.pop, delay: i * TIMING.chips }}
            className="plate flex items-center gap-4 p-4"
          >
            <Specimen draw={c.draw} />
            <span className="flex min-w-0 flex-col">
              <span className="font-mono text-sm font-semibold">
                {c.name} <span className="font-normal text-muted-foreground">{c.value}</span>
              </span>
              <span className="text-sm text-muted-foreground">{c.why}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </Section>
  );
}

// Each decision drawn the way it's seen: a corner, the type itself, a lifted plate.
function Specimen({ draw }) {
  if (draw.radius !== undefined) return <span className="size-11 shrink-0 border-2 border-primary bg-tint-2" style={{ borderRadius: draw.radius }} />;
  if (draw.size !== undefined)
    return (
      <span className="grid size-11 shrink-0 place-items-center font-semibold text-primary" style={{ fontSize: draw.size }}>
        Ag
      </span>
    );
  return <span className={`size-11 shrink-0 rounded-md bg-card ${draw.shadow === 'lift' ? 'shadow-lift' : 'shadow-plate'}`} />;
}
