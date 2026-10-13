/* ─────────────────────────────────────────────────────────
 * SHEET 6 · KEPT TRUE — STORYBOARD
 *
 *  scroll-scrubbed
 *  0.00   the track: eight pull requests, none checked yet
 *  0.06   no baseline: the car runs the track (0.06 → 0.42); every station it passes fails
 *  0.48   the baseline switches on (unless the visitor already chose)
 *  0.54   the car runs again (0.54 → 0.90); only stations that added drift fail,
 *         and the debt counter falls with every fix
 *
 *  visitor
 *  baseline switch   re-judges every station already passed
 * ───────────────────────────────────────────────────────── */
import { useState } from 'react';
import { motion, useMotionValueEvent } from 'motion/react';
import { SPRING, span } from '../site/motion.js';

const TIMING = {
  runOff: [0.06, 0.42], // first run, no baseline
  baselineOn: 0.48, // the baseline switches on
  runOn: [0.54, 0.9], // second run, with the baseline
};

const DEBT = 312; // findings recorded on day one (illustrative)
const STATIONS = [
  { pr: 'search', add: 0, fix: 0 },
  { pr: 'fix gaps', add: 0, fix: 7 },
  { pr: 'modal', add: 3, fix: 0 },
  { pr: 'fix modal', add: 0, fix: 3 },
  { pr: 'cart', add: 0, fix: 0 },
  { pr: 'tokens', add: 0, fix: 21 },
  { pr: 'toast', add: 1, fix: 0 },
  { pr: 'pricing', add: 0, fix: 4 },
];

export function KeptFigure({ progress }) {
  const [p, setP] = useState(0);
  const [choice, setChoice] = useState(null); // the visitor's own switch, once touched
  useMotionValueEvent(progress, 'change', setP);

  const baseline = choice ?? p >= TIMING.baselineOn;
  const car = baseline ? span(p, ...TIMING.runOn) : span(p, ...TIMING.runOff);
  const reached = Math.floor(car * STATIONS.length + 0.0001);
  let debt = DEBT;
  const rows = STATIONS.map((s, i) => {
    const passed = i < reached || car === 1;
    if (baseline && passed) debt += s.add - s.fix;
    return { ...s, passed, fails: passed && (baseline ? s.add > 0 : true) };
  });
  const failing = rows.filter((r) => r.fails).length;
  const x = (i) => `${((i + 0.5) / STATIONS.length) * 100}%`;

  return (
    <div className="flex h-full items-center">
    <div className="plate flex w-full flex-col gap-8 p-6">
      <div className="flex items-center justify-between gap-6">
        <button
          type="button"
          role="switch"
          aria-checked={baseline}
          onClick={() => setChoice(!baseline)}
          className="flex items-center gap-3 text-xs font-semibold text-foreground"
        >
          <span className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${baseline ? 'justify-end bg-primary' : 'justify-start bg-input'}`}>
            <motion.span layout transition={SPRING.settle} className="size-4 rounded-full bg-card" />
          </span>
          Baseline {baseline ? 'on' : 'off'}
        </button>
        <span className="flex flex-col items-end">
          <span className="text-xs font-semibold text-faint">{baseline ? 'Debt, paying down' : 'Findings on every PR'}</span>
          <motion.span key={baseline ? debt : 'all'} initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={SPRING.pop} className="font-mono text-2xl text-foreground">
            {baseline ? debt : DEBT}
          </motion.span>
        </span>
      </div>

      {/* the track */}
      <div className="relative h-36">
        <div className="absolute inset-x-0 top-12 h-px bg-primary" />
        <div className="absolute inset-x-0 top-12 h-2" style={{ backgroundImage: 'repeating-linear-gradient(90deg, var(--primary) 0 1px, transparent 1px 12px)', opacity: 0.35 }} />
        {rows.map((r, i) => (
          <div key={r.pr} className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-2" style={{ left: x(i) }}>
            <span className={`h-5 font-mono text-xs ${r.add ? 'text-destructive' : r.fix ? 'text-success' : 'text-faint'}`}>{r.add ? `+${r.add} new` : r.fix ? `−${r.fix}` : '·'}</span>
            <motion.span
              initial={false}
              animate={{ scale: r.passed ? 1 : 0.7 }}
              transition={SPRING.pop}
              className={`grid size-6 place-items-center rounded-full border-2 font-mono text-xs transition-colors ${!r.passed ? 'border-primary bg-background text-primary' : r.fails ? 'border-destructive bg-destructive text-background' : 'border-success bg-success text-background'}`}
            >
              {r.passed ? (r.fails ? '✕' : '✓') : ''}
            </motion.span>
            <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">{r.pr}</span>
          </div>
        ))}
        {/* the car: the pull request being checked */}
        <motion.span
          aria-hidden="true"
          className="absolute top-8 -ml-5 grid h-7 w-10 place-items-center rounded-sm bg-foreground font-mono text-xs text-background"
          style={{ left: `${car * 100}%`, opacity: car > 0 && car < 1 ? 1 : 0 }}
        >
          PR
        </motion.span>
      </div>

      <span className="text-xs font-semibold text-faint">An example project; the counts are illustrative</span>
      <p className={`text-xs font-semibold ${baseline ? 'text-success' : 'text-destructive'}`} aria-live="polite">
        {baseline ? `${failing} of ${rows.filter((r) => r.passed).length || 8} checked PRs fail · each one added drift` : `${failing} of ${rows.filter((r) => r.passed).length || 8} checked PRs fail · on drift none of them wrote`}
      </p>
    </div>
    </div>
  );
}

export const keptBeats = [
  { at: 0, body: <p>Every codebase already drifts. Point a strict linter at one and every pull request fails, on findings nobody in that pull request wrote. <b>Within a week, someone turns it off.</b></p> },
  { at: TIMING.baselineOn, body: <p><code>plumb init</code> records today’s findings as debt in a ledger. From then on, <b>CI fails only on drift a branch adds</b>, and every fix pays the debt down.</p> },
  {
    at: TIMING.runOn[0] + 0.12,
    body: (
      <div className="flex flex-col gap-3">
        <p>When a value is off the scale on purpose, it goes in the ledger <b>with its reason</b>, where a reviewer sees it. There are no inline suppressions.</p>
        <pre className="font-mono text-xs text-foreground">{`exception  Hero.jsx:12  gap: 10px
  why: the hero art is drawn
       on a 10px grid`}</pre>
      </div>
    ),
  },
];
