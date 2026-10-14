/* ─────────────────────────────────────────────────────────
 * CI KEEPS IT TRUE (site/HOMEPAGE.md §4.4) — paper section
 *
 *  scroll    a conveyor of pull requests rolls right to left through the CI gate, driven by scroll across at most
 *            1.5 viewports. A PR that has passed the gate shows its verdict.
 *  verdict   with the baseline on: a PR that adds new drift is stamped BLOCKED (`pop`, rotate −3°, a 2-frame squash);
 *            the rest pass, including PRs that touch old drift. A PR that fixes old drift rolls the meter down.
 *            Baseline off: every PR in a repo with old drift is blocked. That is why teams turn linters off.
 *  meter     "baseline: N known · M new", counting down as fixes pass. Numbers are illustrative, and labelled so.
 * ───────────────────────────────────────────────────────── */
import { useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { Section } from './Section.jsx';
import { SPRING } from '../site/motion.js';

const KNOWN = 312; // illustrative

// Each PR: what it changes, the new drift it adds, and the old drift it fixes.
const PRS = [
  { n: 481, title: 'Pricing page', adds: 0, fixes: 0, note: 'touches 4 files with old drift' },
  { n: 482, title: 'Checkout banner', adds: 2, fixes: 0, note: 'adds gap-[13px], text-[15px]' },
  { n: 483, title: 'Tidy settings spacing', adds: 0, fixes: 3, note: 'fixes 3 known sites' },
  { n: 484, title: 'Bump dependencies', adds: 0, fixes: 0, note: 'no styling changes' },
  { n: 485, title: 'New empty state', adds: 1, fixes: 0, note: 'adds rounded-[10px]' },
  { n: 486, title: 'Card radius pass', adds: 0, fixes: 6, note: 'fixes 6 known sites' },
];

const GATE = 0.42; // where the gate stands, as a fraction of the track
const CARD = 248; // px: card width plus gap

export function KeptTrue() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const [baseline, setBaseline] = useState(true);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.35'] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -(PRS.length - 1) * CARD]);
  const [passed, setPassed] = useState(0); // how many PRs have gone through the gate
  useMotionValueEvent(scrollYProgress, 'change', (p) => setPassed(Math.min(PRS.length, Math.floor(p * PRS.length + 0.5))));
  const shown = reduce ? PRS.length : passed;
  const fixed = PRS.slice(0, shown).reduce((a, pr) => a + pr.fixes, 0);
  const added = baseline ? 0 : 0; // new drift never lands: it is blocked at the gate
  return (
    <Section
      id="kept-true"
      n={2}
      title="CI keeps it true."
      lead="Turn Plumber on in CI today, on a repo full of old drift. The baseline remembers what's already there, so only drift a pull request adds can fail it, and every fix shrinks the debt."
    >
      <div ref={ref} className="plate flex flex-col gap-6 overflow-hidden p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Meter known={KNOWN - fixed} added={added} />
          <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-semibold">
            <span>Baseline</span>
            <button
              type="button"
              role="switch"
              aria-checked={baseline}
              onClick={() => setBaseline((b) => !b)}
              className={`relative h-6 w-11 rounded-full transition-colors ${baseline ? 'bg-primary' : 'bg-muted'}`}
            >
              <motion.span layout transition={SPRING.snap} className={`absolute top-1 size-4 rounded-full bg-card shadow-plate ${baseline ? 'right-1' : 'left-1'}`} />
            </button>
            <span className="w-8 text-muted-foreground">{baseline ? 'on' : 'off'}</span>
          </label>
        </div>

        {/* the conveyor */}
        <div className="relative h-52">
          {/* the gate */}
          <div className="pointer-events-none absolute inset-y-0 z-(--z-raised) flex flex-col items-center" style={{ left: `${GATE * 100}%` }}>
            <span className="rounded-full bg-foreground px-3 py-0.5 font-mono text-xs font-semibold text-background">plumber check</span>
            <span className="w-0.5 flex-1 bg-foreground/20" />
          </div>
          <motion.ol className="absolute top-8 flex gap-4" style={{ x: reduce ? -(PRS.length - 1) * CARD : x, left: `calc(${GATE * 100}% + 24px)` }}>
            {PRS.map((pr, i) => (
              <Pr key={pr.n} pr={pr} through={i < shown} blocked={baseline ? pr.adds > 0 : true} />
            ))}
          </motion.ol>
        </div>
        <p className="text-sm text-muted-foreground">
          {baseline
            ? 'With the baseline, only the two PRs that add drift are blocked. The rest merge, and the two that fix old drift take it off the books.'
            : 'Without it, every PR in a repo with old drift is blocked, so the check gets switched off within a week.'}{' '}
          <span className="opacity-75">Numbers are illustrative.</span>
        </p>
      </div>
    </Section>
  );
}

function Pr({ pr, through, blocked }) {
  return (
    <li className="relative flex w-58 shrink-0 flex-col gap-2 rounded-md bg-card p-4 shadow-plate">
      <span className="font-mono text-xs text-muted-foreground">#{pr.n}</span>
      <span className="text-base font-semibold">{pr.title}</span>
      <span className="text-sm text-muted-foreground">{pr.note}</span>
      <span className={`mt-auto font-mono text-xs font-semibold ${pr.adds ? 'text-destructive' : pr.fixes ? 'text-success' : 'text-muted-foreground'}`}>
        {pr.adds ? `+${pr.adds} new` : pr.fixes ? `−${pr.fixes} known` : '0 new'}
      </span>
      <AnimatePresence>
        {through && (
          <motion.span
            key={blocked ? 'blocked' : 'passed'}
            initial={{ scale: 1.6, opacity: 0, rotate: 0 }}
            animate={{ scaleX: [1.6, 1.08, 1], scaleY: [1.6, 0.9, 1], opacity: 1, rotate: blocked ? -3 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, times: [0, 0.6, 1] }}
            className={`absolute right-3 bottom-3 rounded-sm border-2 px-1.5 font-mono text-xs font-semibold ${blocked ? 'border-destructive text-destructive' : 'border-success text-success'}`}
          >
            {blocked ? 'BLOCKED' : 'PASSED'}
          </motion.span>
        )}
      </AnimatePresence>
    </li>
  );
}

// The meter: known drift rolls down like an odometer as fixes pass the gate.
function Meter({ known, added }) {
  return (
    <span className="inline-flex items-center gap-3 rounded-md bg-muted px-4 py-2 font-mono text-sm" aria-live="polite">
      <span className="text-muted-foreground">baseline:</span>
      <Roll value={known} /> <span className="text-muted-foreground">known ·</span>
      <b className="font-semibold text-success">{added}</b> <span className="text-muted-foreground">new</span>
    </span>
  );
}

function Roll({ value }) {
  return (
    <span className="relative inline-flex h-5 overflow-hidden font-semibold tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={SPRING.snap}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
