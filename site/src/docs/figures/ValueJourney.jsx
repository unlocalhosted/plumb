/* ─────────────────────────────────────────────────────────
 * VALUE JOURNEY — one value, written five ways, through Plumb's real stages (site/DOCS.md §4.1)
 *
 * Every stage shows the recorded output of the real CLI on fixtures/docs-judged (docs/recordings/judged.json):
 * the authored text and its line, the compiled declaration, the resolved value, the steps it's measured against
 * and the finding. Nothing is reconstructed; where the code has no stage (inline styles aren't compiled) the row
 * says so.
 *
 *  rest      the class gap-[13px], all five stages filled
 *  pick      choose another spelling: the value travels down the rail, stage by stage (STAGGER apart). A row
 *            whose content changes swaps in place and flashes once; a row that comes out the same stays still.
 *            That stillness is the argument: 13px reads, resolves and measures the same however it's written.
 *  differ    the two honest differences stay visible: an inline style skips the compile stage, and only the
 *            arbitrary class gets provenance/arbitrary (its fix rewrites the class); the rest share one finding
 *  on scale  gap-3 resolves to 12px, lands on its step, and there's no finding
 *  keys      ← → move through the spellings
 *  reduced motion: rows swap without travel or flash
 * ───────────────────────────────────────────────────────── */
import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SPRING, STAGGER } from '../../site/motion.js';
import recording from '../recordings/judged.json';

// the fixture's spacing scale, fixtures/docs-judged/src/styles.css lines 3–12
const SCALE = [
  { px: 8, name: '--spacing-2' },
  { px: 12, name: '--spacing-3' },
  { px: 16, name: '--spacing-4' },
  { px: 20, name: '--spacing-5' },
];
const LABEL = { 'arbitrary-class': 'gap-[13px]', apply: '@apply', inline: 'style={{}}', 'plain-css': 'CSS', 'on-scale': 'gap-3' };
const CASES = recording.cases.map((c) => ({ ...c, label: LABEL[c.id] ?? c.id }));
const px = (v) => Number.parseFloat(v);

function stagesOf(c) {
  const compiled = c.compiledDeclarations?.[0];
  const f = c.finding;
  // a grouped finding holds an edit per site: show the one for this spelling's own line
  const edit = f?.edits?.find((e) => e.site.file === c.authored.file && e.site.line === c.authored.line) ?? f?.edits?.[0];
  return [
    { id: 'read', title: 'Read', key: `${c.authored.file}:${c.authored.line}`, body: <Read c={c} /> },
    {
      id: 'compile',
      title: 'Compile',
      key: compiled ? `${compiled.when?.[0]?.text} ${compiled.prop}:${compiled.value}` : 'none',
      body: compiled ? (
        <code className="font-mono text-sm">
          <span className="text-muted-foreground">{compiled.when?.[0]?.text?.replace(/\\/g, '')} {'{'} </span>
          {compiled.prop}: <span className="text-primary">{compiled.value}</span>
          <span className="text-muted-foreground">; {'}'}</span>
        </code>
      ) : (
        <span className="text-sm text-muted-foreground">
          No compile step: an inline style is read as written, so <code className="font-mono text-foreground">13</code> becomes <code className="font-mono text-foreground">13px</code>.
        </span>
      ),
    },
    {
      id: 'resolve',
      title: 'Resolve',
      key: c.resolved,
      body: (
        <span className="font-mono text-sm">
          {compiled && compiled.value !== c.resolved && <span className="text-muted-foreground">{compiled.value} → </span>}
          <span className="font-semibold">{c.resolved}</span>
        </span>
      ),
    },
    { id: 'match', title: 'Measure', key: c.resolved, body: <Measure value={px(c.resolved)} choices={f?.choices ?? []} /> },
    {
      id: 'verdict',
      title: 'Verdict',
      key: f ? `${f.rule} ${edit?.text}` : 'pass',
      body: f ? (
        <div className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm bg-destructive px-1.5 font-mono text-xs font-semibold text-primary-foreground">{f.severity}</span>
            <code className="font-mono text-sm font-semibold">{f.rule}</code>
          </span>
          <span className="text-sm text-muted-foreground">
            <Ticked text={edit?.text ?? ''} />
          </span>
        </div>
      ) : (
        <span className="text-sm">
          <span className="font-semibold text-primary">No finding.</span> <span className="text-muted-foreground">It's a step of the scale.</span>
        </span>
      ),
    },
  ];
}

// a finding's text marks code with backticks, as the terminal shows it: render those spans as code
function Ticked({ text }) {
  return text.split(/(`[^`]+`)/).map((part, n) =>
    part.startsWith('`') ? (
      <code key={n} className="font-mono text-foreground">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

function Read({ c }) {
  return (
    <div className="flex flex-col gap-0.5">
      <code className="font-mono text-sm">{c.authored.text}</code>
      <span className="font-mono text-xs text-muted-foreground">
        {c.authored.file}:{c.authored.line}
      </span>
    </div>
  );
}

// the fixture's steps on a line, the value marked where it falls; the steps either side carry their reasons
function Measure({ value, choices }) {
  const lo = 6;
  const hi = 22;
  const at = (v) => `${((v - lo) / (hi - lo)) * 100}%`;
  const on = SCALE.find((s) => s.px === value);
  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-2 mt-6 mb-5 h-px bg-border">
        {SCALE.map((s) => (
          <span key={s.px} className="absolute top-0 -translate-x-1/2" style={{ left: at(s.px) }}>
            <span className={`block h-2 w-px -translate-y-1/2 ${on?.px === s.px ? 'bg-primary' : 'bg-muted-foreground'}`} />
            <span className="absolute top-2 left-1/2 -translate-x-1/2 font-mono text-xs text-muted-foreground tabular-nums">{s.px}</span>
          </span>
        ))}
        <motion.span className="absolute top-0" initial={false} animate={{ left: at(value) }} transition={SPRING.settle}>
          <span className={`absolute -top-6 left-0 -translate-x-1/2 rounded-sm px-1.5 font-mono text-xs font-semibold whitespace-nowrap text-primary-foreground ${on ? 'bg-primary' : 'bg-destructive'}`}>
            {value}px
          </span>
          <span className={`absolute top-0 left-0 size-2 -translate-1/2 rounded-full ${on ? 'bg-primary' : 'bg-destructive'}`} />
        </motion.span>
      </div>
      {on ? (
        <span className="text-sm text-muted-foreground">
          Exactly <code className="font-mono text-foreground">{on.name}</code>.
        </span>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {choices.map((ch) => (
            <li key={ch.name} className="flex flex-wrap items-baseline gap-x-2">
              <code className="font-mono font-semibold text-primary">{ch.use?.class}</code>
              <span className="font-mono text-xs text-muted-foreground">{ch.resolved}</span>
              <span className="text-muted-foreground">{ch.why}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ValueJourney() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [pass, setPass] = useState(0); // counts picks, so each pick replays the travel
  const prev = useRef(stagesOf(CASES[0]).map((s) => s.key));
  const stages = stagesOf(CASES[i]);
  const changed = stages.map((s, k) => s.key !== prev.current[k]);

  const pick = (n) => {
    if (n === i) return;
    prev.current = stages.map((s) => s.key);
    setI(n);
    setPass((p) => p + 1);
  };

  return (
    <figure className="my-10">
      <div className="overflow-hidden rounded-lg bg-card shadow-plate">
        <div className="flex items-center justify-between px-5 pt-4 font-mono text-xs text-muted-foreground">
          <span>Fig 1</span>
          <span className="uppercase">13px, five ways</span>
        </div>

        {/* the spellings */}
        <div
          role="radiogroup"
          aria-label="How the value is written"
          className="flex flex-wrap gap-2 px-5 pt-4 pb-5"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') (e.preventDefault(), pick((i + 1) % CASES.length));
            if (e.key === 'ArrowLeft') (e.preventDefault(), pick((i - 1 + CASES.length) % CASES.length));
          }}
        >
          {CASES.map((c, n) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={n === i}
              tabIndex={n === i ? 0 : -1}
              onClick={() => pick(n)}
              className={`rounded-md px-3 py-1 font-mono text-sm transition-colors duration-(--dur-quick) focus-visible:outline-2 focus-visible:outline-primary ${n === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-tint-2'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* the stages, on a rail the value travels down */}
        <ol className="relative flex flex-col px-5 pb-5">
          <span className="absolute top-2 bottom-8 left-8 w-px bg-border" aria-hidden="true" />
          <motion.span
            key={pass}
            aria-hidden="true"
            className="absolute top-2 bottom-8 left-8 w-px origin-top bg-primary"
            initial={{ scaleY: reduce || pass === 0 ? 1 : 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: reduce ? 0 : STAGGER * 2 * stages.length, ease: 'easeOut' }}
          />
          {stages.map((s, k) => (
            <li key={s.id} className="relative grid grid-cols-[1.5rem_1fr] gap-x-4 py-3">
              <motion.span
                key={`${s.id}-${pass}`}
                aria-hidden="true"
                className="relative z-(--z-raised) mt-1 size-3 justify-self-center rounded-full border-2 border-primary bg-card"
                initial={reduce || pass === 0 ? false : { scale: 0.6, backgroundColor: 'var(--card)' }}
                animate={{ scale: 1, backgroundColor: ['var(--card)', 'var(--primary)', 'var(--card)'] }}
                transition={{ delay: reduce ? 0 : k * STAGGER * 2, duration: 0.3 }}
              />
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase">{s.title}</span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={s.key}
                    className={`-mx-2 rounded-md px-2 py-1 ${changed[k] && pass > 0 && !reduce ? 'animate-[journey-flash_var(--dur-explode)_var(--ease-out)]' : ''}`}
                    style={{ animationDelay: `${k * STAGGER * 2}s` }}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ ...SPRING.settle, delay: reduce ? 0 : k * STAGGER * 2 }}
                  >
                    {s.body}
                  </motion.div>
                </AnimatePresence>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        Recorded from the real CLI on a small fixture whose spacing scale is 8, 12, 16 and 20px. Pick a spelling: the rows that come out the same don't
        move.
      </figcaption>
    </figure>
  );
}
