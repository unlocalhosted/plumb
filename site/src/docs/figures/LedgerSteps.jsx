/* ─────────────────────────────────────────────────────────
 * LEDGER STEPS — a repo's history with Plumb, one recorded step at a time (site/DOCS.md §4.3)
 *
 * Each step is a real command (or a file edit) run on a copy of fixtures/docs-judged, with its exit code, the
 * CLI's summary lines and the ledger's entries counted by kind (docs/recordings/ledger.json).
 *
 *  rest      step 1, the baseline
 *  step      pick a step, or ← →: the panel shows what was done and what Plumb said; the ledger below keeps one
 *            mark per entry, and marks arrive (pop) or leave (shrink) as the count changes, so you see debt fall and
 *            an exception join
 *  exit      0 in the quiet ink, 1 in the drift colour: the check that fails is the one with new drift
 *  reduced motion: marks appear and go without scale
 * ───────────────────────────────────────────────────────── */
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SPRING } from '../../site/motion.js';
import recording from '../recordings/ledger.json';

const SAY = {
  baseline: 'Record today’s drift as debt',
  'check-baseline': 'Check: nothing new',
  'add-new-drift': 'Someone adds gap-[14px]',
  'check-new-drift': 'Check: the new drift fails',
  'fix-old-drift': 'Fix the old gap-[13px]',
  'check-debt-falls': 'Check: debt falls, the new drift still fails',
  ratchet: 'Lock the progress in',
  'accept-new-drift': 'Accept the 14px, with a reason',
  'check-after-accept': 'Check: green',
};
// the recording keeps each edit's whole file: show only the lines that changed
function changedLines({ before = '', after = '' }) {
  const was = before.split('\n');
  const now = after.split('\n');
  return [...was.filter((l) => l.trim() && !now.includes(l)).map((l) => ['-', l]), ...now.filter((l) => l.trim() && !was.includes(l)).map((l) => ['+', l])];
}

const STEPS = recording.steps.filter((s) => SAY[s.id]);
const KINDS = [
  { kind: 'debt', name: ['debt', 'debt'], tone: 'bg-muted-foreground' },
  { kind: 'exception', name: ['exception', 'exceptions'], tone: 'bg-primary' },
  { kind: 'decision', name: ['decision', 'decisions'], tone: 'bg-family-elevation' },
];

export function LedgerSteps() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const s = STEPS[i];
  const go = (n) => setI(Math.max(0, Math.min(STEPS.length - 1, n)));

  return (
    <figure className="my-10">
      <div
        className="overflow-hidden rounded-lg bg-card shadow-plate"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') (e.preventDefault(), go(i + 1));
          if (e.key === 'ArrowLeft') (e.preventDefault(), go(i - 1));
        }}
      >
        <div className="flex items-center justify-between px-5 pt-4 font-mono text-xs text-muted-foreground">
          <span>Fig 1</span>
          <span className="uppercase">
            Step {i + 1} of {STEPS.length}
          </span>
        </div>

        {/* the steps */}
        <ol role="tablist" aria-label="Steps" className="flex gap-1 overflow-x-auto px-5 pt-4">
          {STEPS.map((st, n) => (
            <li key={st.id} className="flex-1">
              <button
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={`${n + 1}. ${SAY[st.id]}`}
                tabIndex={n === i ? 0 : -1}
                onClick={() => go(n)}
                className="group flex w-full flex-col gap-1.5 py-2 outline-none"
              >
                <span
                  className={`h-1 w-full rounded-full transition-colors duration-(--dur-quick) group-focus-visible:outline-2 group-focus-visible:outline-primary ${n === i ? 'bg-primary' : n < i ? 'bg-tint-3' : 'bg-muted group-hover:bg-tint-2'}`}
                />
                <span className={`font-mono text-xs tabular-nums ${n === i ? 'text-primary' : 'text-muted-foreground'}`}>{n + 1}</span>
              </button>
            </li>
          ))}
        </ol>

        {/* what happened */}
        <div className="px-5 pt-2 pb-5" role="tabpanel" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold">{SAY[s.id]}</h3>
            {s.command && (
              <span className={`font-mono text-xs ${s.exitCode === 0 ? 'text-muted-foreground' : 'font-semibold text-destructive'}`}>exit {s.exitCode}</span>
            )}
          </div>
          <div className="mt-3 overflow-x-auto rounded-md bg-code px-4 py-3 font-mono text-sm text-code-foreground">
            {s.command ? (
              <div className="whitespace-pre">
                <span className="text-code-comment select-none">$ </span>
                {s.command}
              </div>
            ) : s.edit ? (
              <div className="flex flex-col gap-0.5 whitespace-pre">
                <span className="font-sans text-xs text-code-comment">edit {s.edit.file}</span>
                {changedLines(s.edit).map(([sign, line], n) => (
                  <span key={n} className={sign === '-' ? 'text-code-flag' : 'text-code-string'}>
                    {sign} {line.trim()}
                  </span>
                ))}
              </div>
            ) : null}
            {s.summaryLines?.length > 0 && (
              <div className="mt-3 flex flex-col whitespace-pre text-code-foreground/80">
                {s.summaryLines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* the ledger: one mark per entry */}
        <div className="border-t border-border bg-muted/50 px-5 py-4">
          <div className="mb-3 font-mono text-xs text-muted-foreground">.plumb/ledger.jsonl</div>
          <div className="flex flex-col gap-2">
            {KINDS.map(({ kind, name, tone }) => {
              const n = s.entryCounts?.[kind] ?? 0;
              return (
                <div key={kind} className="grid grid-cols-[6rem_1fr] items-center gap-4">
                  <span className="text-sm">
                    <span className="font-mono tabular-nums">{n}</span> <span className="text-muted-foreground">{name[n === 1 ? 0 : 1]}</span>
                  </span>
                  <span className="flex min-h-3 flex-wrap gap-1">
                    <AnimatePresence initial={false}>
                      {Array.from({ length: n }, (_, k) => (
                        <motion.span
                          key={k}
                          className={`size-3 rounded-sm ${tone}`}
                          initial={reduce ? false : { scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={reduce ? { opacity: 0 } : { scale: 0 }}
                          transition={SPRING.pop}
                        />
                      ))}
                    </AnimatePresence>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between border-t border-border px-5 py-3">
          <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="text-sm font-semibold text-primary disabled:text-muted-foreground">
            ← Back
          </button>
          <button type="button" onClick={() => go(i + 1)} disabled={i === STEPS.length - 1} className="text-sm font-semibold text-primary disabled:text-muted-foreground">
            Next →
          </button>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        Recorded from the real CLI on a copy of a small fixture project. The marks are the ledger's entries, one each.
      </figcaption>
    </figure>
  );
}
