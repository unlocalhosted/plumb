/* ─────────────────────────────────────────────────────────
 * HERO — fix it yourself (site/HOMEPAGE.md §4.1). One card that drifted, held on a blue stage. The visitor fixes it
 * with Plumber's real overlay. Drift is a loose nut: each one is marked with a red hex nut that tightens to green.
 *
 * STORYBOARD — load
 *      0ms   stage and field (restless: six drifts)
 *    120ms   headline rises 12px → 0 on `settle`
 *    300ms   card drops 16px, rotate −1.5° → 0, on `settle`
 *    560ms   six nuts pop onto the drifted parts, 60ms apart; the seal and the "off by 2px" sticker slap on
 *
 * STORYBOARD — reading a part (Plumber's reading opens on a part of the card)
 *      0ms   the page dims 8% around the stage (200ms); the part lifts 2px on `settle`
 *   close    the page comes back; the part settles
 *
 * STORYBOARD — each fix (the visitor clicks a nut, or holds Alt and clicks a part; Plumber's reading opens; they pick
 * a token and Write)
 *      0ms   that nut turns 60° and goes green, ✓; the seal's count steps down; the field calms one step (300ms);
 *            the wrench in the title strip fits and turns a nut of his own
 *   radius   the "off by 2px" sticker flips to its green back: ✓ rounded-lg
 *
 * STORYBOARD — zero (the last drift fixed)
 *      0ms   the card settles; the install takes over on the left
 *    150ms   the receipt: each token written drops in under the seal as a chip, 50ms apart, on `settle`
 *    400ms   the field goes still; the caption reads "0 off · still"
 *    600ms   the closing line wipes in under the headline (clip-path, left to right)
 *    900ms   the diff opens: every edit Plumber wrote to the file, line by line, − before / + after
 *
 * The count is read from the page itself: a drift is fixed when its class is gone from the DOM, however it went.
 * ───────────────────────────────────────────────────────── */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DriftedCard, HERO_DRIFTS } from './DriftedCard.jsx';
import { NutMark } from '../site/NutMark.jsx';
import { Field } from '../system/Field.jsx';
import { OffBy, Seal } from '../system/Sticker.jsx';
import { Copy } from '../site/Copy.jsx';
import { usePage } from '../site/Sheet.jsx';
import { SPRING } from '../site/motion.js';
import { useNarrow } from '../site/useNarrow.js';

const TIMING = {
  zero: { receipt: 150, chip: 50, still: 400, line: 600, diff: 900 }, // ms after the last fix
  headline: 120, // ms: the headline rises
  card: 300, // the card drops onto the stage
  nuts: 560, // the nuts pop on
  stagger: 60, // between nuts
};


// Where each balloon sits: outside its part, never over its text. Two parts carry two drifts each.
const PLACE = {
  radius: (p) => ({ x: p.right + 8, y: p.top - 12 }),
  pad: (p) => ({ x: p.left - 30, y: p.bottom - 34 }),
  gap: (p) => ({ x: p.left - 30, y: p.top + p.height / 2 - 10 }),
  type: (p) => ({ x: p.left + p.width / 2 - 10, y: p.top - 28 }),
  button: (p) => ({ x: p.left - 4, y: p.bottom + 8 }),
  corner: (p) => ({ x: p.right - 10, y: p.bottom + 8 }),
};

function useDrifts(root) {
  const [fixed, setFixed] = useState(() => new Set());
  useEffect(() => {
    const read = () => {
      const now = new Set();
      for (const d of HERO_DRIFTS) {
        const el = root.current?.querySelector(`[data-drift="${d.part}"]`);
        if (el && !el.classList.contains(d.bad)) now.add(d.id);
      }
      setFixed((prev) => (prev.size === now.size && [...now].every((x) => prev.has(x)) ? prev : now));
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(root.current, { attributes: true, attributeFilter: ['class'], subtree: true });
    return () => mo.disconnect();
  }, [root]);
  return fixed;
}

// The part Plumber's reading is open on, if it's on this card (the overlay says when it pins and unpins).
function useReading(box) {
  const [part, setPart] = useState(null);
  useEffect(() => {
    const pin = (e) => setPart(box.current?.contains(e.detail.element) ? e.detail.element : null);
    const unpin = () => setPart(null);
    addEventListener('plumb:pin', pin);
    addEventListener('plumb:unpin', unpin);
    return () => (removeEventListener('plumb:pin', pin), removeEventListener('plumb:unpin', unpin));
  }, [box]);
  // the part lifts while it's read; the lift is a translate, so it never fights the overlay's style previews
  useEffect(() => {
    if (!part) return;
    part.style.transition = 'translate 300ms cubic-bezier(.2,.8,.2,1)';
    part.style.translate = '0 -2px';
    return () => (part.style.translate = '');
  }, [part]);
  return part;
}

function useParts(box, deps) {
  const [rects, setRects] = useState({});
  useLayoutEffect(() => {
    const measure = () => {
      const b = box.current.getBoundingClientRect();
      const out = {};
      box.current.querySelectorAll('[data-drift]').forEach((el) => {
        const r = el.getBoundingClientRect();
        out[el.dataset.drift] = { left: r.left - b.left, top: r.top - b.top, right: r.right - b.left, bottom: r.bottom - b.top, width: r.width, height: r.height };
      });
      setRects(out);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box.current);
    return () => ro.disconnect();
  }, deps);
  return rects;
}

// Every edit Plumber writes to the card, as the replay reports it: the receipt and the diff are made of these, so they
// show what was actually written, never a script.
function useWritten() {
  const [written, setWritten] = useState([]);
  useEffect(() => {
    const on = (e) => setWritten((w) => [...w, e.detail]);
    addEventListener('plumb:demo-applied', on);
    return () => removeEventListener('plumb:demo-applied', on);
  }, []);
  return written;
}

// The at-zero beats, as one stage number: 0 not yet, 1 receipt, 2 still, 3 closing line, 4 diff.
function useZero(done) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!done) return setStage(0);
    const z = TIMING.zero;
    const timers = [z.receipt, z.still, z.line, z.diff].map((ms, i) => setTimeout(() => setStage(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [done]);
  return stage;
}

// Opens Plumber's own reading on a part, the same as Alt-clicking it.
function inspect(el) {
  document.querySelector('plumb-overlay')?.pin?.(el);
}

export function Hero() {
  const page = usePage();
  const box = useRef(null);
  const fixed = useDrifts(box);
  const reading = useReading(box);
  const rects = useParts(box, [fixed.size]);
  const [shown, setShown] = useState(false);
  const narrow = useNarrow();
  const left = HERO_DRIFTS.length - fixed.size;
  const done = left === 0;
  const written = useWritten();
  const zero = useZero(done);
  const tokens = written.filter((w) => w.kind === 'class').map((w) => w.after);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), TIMING.nuts);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (done) page.setFixed(true);
  }, [done]);
  // The wrench reads the card: worried while there's drift, a nut turned on every fix, content at zero.
  useEffect(() => {
    if (page.drift !== null && left < page.drift) page.cheerOnce();
    page.setDrift(left);
  }, [left]);

  return (
    <section id="hero" aria-labelledby="hero-title" className="mx-auto grid min-h-svh max-w-7xl items-center gap-12 px-6 pt-24 pb-16 md:px-12 lg:grid-cols-12 lg:gap-16">
      {/* the offer */}
      <div className="flex flex-col gap-8 lg:col-span-5">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          React Plumber, for Tailwind and CSS
        </span>
        <motion.h1
          id="hero-title"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...SPRING.settle, delay: TIMING.headline / 1000 }}
          className="text-7xl font-semibold text-balance max-lg:text-5xl max-sm:text-2xl"
        >
          plumber help prevent design system drift
        </motion.h1>
        {/* the closing line: wiped in at zero */}
        {zero >= 3 && (
          <motion.p
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
            className="-mt-4 text-4xl font-semibold text-success max-sm:text-lg"
          >
            Six fixed. Zero drift.
          </motion.p>
        )}
        <p className="max-w-lg text-lg text-muted-foreground max-sm:text-base">
          Plumber finds where your UI drifts from its design system, and fixes it from the page. The card here has drifted in six places. <b className="font-semibold text-foreground">Fix it.</b>
        </p>

        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.settle} className="flex max-w-lg flex-col gap-4">
              <p className="text-base">
                <b className="font-semibold text-success">That was Plumber.</b> In your app, Write edits the source file and your dev server reloads.
              </p>
              <Diff written={written} open={zero >= 4} />
              <Copy text="npx @unlocalhosted/react-plumber" />
            </motion.div>
          ) : (
            <motion.div key="try" exit={{ opacity: 0, y: -8 }} transition={SPRING.settle} className="flex max-w-lg flex-col gap-5">
              <ol className="flex flex-wrap gap-2">
                {(narrow ? ['Tap a number', 'Pick a token', 'Write'] : ['Click a number', 'Pick a token', 'Press Write']).map((s, i) => (
                  <li key={s} className="inline-flex items-center gap-2 rounded-full bg-card py-1.5 pr-4 pl-1.5 text-sm font-semibold shadow-plate">
                    <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
              {!narrow && <p className="text-sm text-muted-foreground">Or hold Alt and click any part, the way you would in your own app.</p>}
              <Copy text="npx @unlocalhosted/react-plumber" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* while Plumber reads a part, the page dims around the stage */}
      <AnimatePresence>
        {reading && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-(--z-dim) bg-foreground/8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* the stage: the drifted card, held on a blue panel, the field breathing inside it */}
      <div className={`relative flex min-h-130 ${reading ? 'z-(--z-bar)' : ''} flex-col overflow-hidden rounded-lg bg-stage p-6 text-stage-foreground shadow-lift lg:col-span-7 max-sm:min-h-105`}>
        <Field turbulence={zero >= 2 ? 0 : Math.max(left / HERO_DRIFTS.length, done ? 1 / HERO_DRIFTS.length : 0)} />
        <div className="relative z-(--z-raised) flex items-center gap-3">
          <span className="rounded-full bg-stage-foreground/15 px-3 py-1 font-mono text-sm">DriftedCard.jsx</span>
          {/* the count, for screen readers; the seal shows it */}
          <span className="sr-only" aria-live="polite">
            {left ? `${left} of ${HERO_DRIFTS.length} values off the scale` : 'All values on the scale'}
          </span>
        </div>
        <Seal count={left} rest={8} delay={0.62} className="absolute top-4 right-4 z-(--z-sticker) max-sm:hidden" />
        {/* the receipt: the tokens written, stacked under the seal */}
        <div className="absolute top-32 right-6 z-(--z-sticker) flex flex-col items-end gap-1.5 max-sm:hidden" aria-label="Tokens written">
          <AnimatePresence>
            {zero >= 1 &&
              tokens.map((t, i) => (
                <motion.code
                  key={t + i}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ ...SPRING.settle, delay: (i * TIMING.zero.chip) / 1000 }}
                  className="rounded-sm bg-card px-2 py-0.5 font-mono text-xs text-success shadow-plate"
                >
                  {t}
                </motion.code>
              ))}
          </AnimatePresence>
        </div>
        <div className="relative grid flex-1 place-items-center py-10">
          <motion.div
            ref={box}
            initial={{ y: -16, rotate: -1.5, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            transition={{ ...SPRING.settle, delay: TIMING.card / 1000 }}
            className="relative w-full max-w-md text-foreground"
          >
            <DriftedCard />
            {HERO_DRIFTS.map((d, i) => {
              const r = rects[d.part];
              if (!r) return null;
              const at = PLACE[d.id](r);
              return (
                <NutMark
                  key={d.id}
                  n={i + 1}
                  fixed={fixed.has(d.id)}
                  shown={shown}
                  delay={(i * TIMING.stagger) / 1000}
                  label={`${d.bad} → ${d.fix}`}
                  onClick={() => inspect(box.current.querySelector(`[data-drift="${d.part}"]`))}
                  style={{ left: at.x, top: at.y }}
                />
              );
            })}
            {/* a true sticker: the card's corner is rounded-[10px], 2px off rounded-lg */}
            <OffBy px={2} fix={written.find((w) => w.before === 'rounded-[10px]')?.after ?? 'rounded-lg'} flipped={fixed.has('radius')} rest={5} delay={0.66} className="absolute -right-10 -bottom-16 z-(--z-sticker) max-sm:hidden" />
          </motion.div>
        </div>
        <p className="relative z-(--z-raised) text-sm text-stage-foreground/85">{zero >= 2 ? '0 off · still. Every value on this card now comes from a decision.' : 'Each nut is a value off this page’s scale. Click one to open Plumber’s reading.'}</p>
      </div>
    </section>
  );
}

// The diff: every edit Plumber wrote to the card's file, grouped by line, − before / + after. Built from the writes the
// page saw, so it is exactly what happened (fixed some by hand in devtools? those don't appear: Plumber didn't write them).
function Diff({ written, open }) {
  if (!written.length) return null;
  const file = written[0].file;
  const lines = [...new Set(written.map((w) => w.line))].sort((a, b) => a - b);
  return (
    <AnimatePresence>
      {open && (
        <motion.figure
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={SPRING.settle}
          className="overflow-hidden rounded-md bg-code text-code-foreground shadow-plate"
        >
          <figcaption className="flex items-center justify-between gap-3 border-b border-code-foreground/15 px-4 py-2 font-mono text-xs">
            <span>{file}</span>
            <span className="shrink-0 opacity-70">{written.length} edits by Plumber</span>
          </figcaption>
          <div className="flex flex-col py-2 font-mono text-xs leading-5">
            {lines.map((line) => (
              <div key={line} className="flex flex-col">
                {written
                  .filter((w) => w.line === line)
                  .map((w, i) => (
                    <div key={i} className="grid grid-cols-[3rem_1fr]">
                      <span className="pr-3 text-right opacity-50">{i === 0 ? line : ''}</span>
                      <span>
                        <span className="text-destructive">− {w.before}</span> <span className="text-success">+ {w.after}</span>
                      </span>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </motion.figure>
      )}
    </AnimatePresence>
  );
}
