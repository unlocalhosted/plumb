// A sheet of the manual: a full viewport pinned while its scroll range plays. The figure owns the sheet; the text
// column steps through numbered beats. Scroll progress (0..1) is handed to the figure to scrub its motion.
import { createContext, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { SPRING } from './motion.js';

export const SHEETS = ['Anatomy', 'Drift', 'Scales', 'Everywhere', 'Kept true'];

export const PageState = createContext(null);
export const usePage = () => useContext(PageState);

export function usePageState() {
  const [sheet, setSheet] = useState(-1); // -1: the hero, before any sheet
  const [fixed, setFixed] = useState(false); // the visitor finished the hero
  const [drift, setDrift] = useState(null); // drifts left on the hero card; null until it reports
  const [cheer, setCheer] = useState(0); // bumps once per fix, so the wrench turns a nut
  return { sheet, setSheet, fixed, setFixed, drift, setDrift, cheer, cheerOnce: () => setCheer((c) => c + 1) };
}

// beats: [{ at, body }] — `at` is the progress where that beat takes over.
export function Sheet({ n, vh, title, beats = [{ at: 0, body: null }], figure, kicker, aside }) {
  const ref = useRef(null);
  const page = usePage();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [beat, setBeat] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (p > 0 && p < 1 && page.sheet !== n) page.setSheet(n);
    let b = 0;
    beats.forEach((bt, i) => p >= bt.at && (b = i));
    if (b !== beat) setBeat(b);
  });

  return (
    <section ref={ref} id={SHEETS[n].toLowerCase().replace(' ', '-')} aria-labelledby={`sheet-${n}`} style={{ height: `${vh}vh` }} className="relative">
      <div className="sticky top-0 flex h-svh flex-col overflow-hidden pt-14">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-8 md:px-12 lg:grid lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] lg:gap-12 lg:pb-12">
          <div className="order-2 flex flex-col gap-4 lg:order-1 lg:col-span-4 lg:self-center">
            {aside ? aside(scrollYProgress) : (<>
            {kicker && <span className="text-xs font-semibold text-primary">{kicker}</span>}
            <h2 id={`sheet-${n}`} className="text-2xl font-semibold text-balance max-sm:text-lg">
              {title}
            </h2>
            <div className="relative min-h-36 max-sm:min-h-24 max-sm:text-sm">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={beat}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="text-muted-foreground [&_b]:font-medium [&_b]:text-foreground [&_code]:font-mono [&_code]:text-sm [&_code]:text-foreground"
                >
                  {beats[beat].body}
                </motion.div>
              </AnimatePresence>
            </div>
            {beats.length > 1 && (
              <ol className="flex gap-1.5" aria-label="Steps on this sheet">
                {beats.map((_, i) => (
                  <li key={i} aria-current={i === beat ? 'step' : undefined} className="h-0.5 w-6 bg-border">
                    <motion.span className="block h-full origin-left bg-primary" initial={false} animate={{ scaleX: i <= beat ? 1 : 0 }} transition={SPRING.settle} />
                  </li>
                ))}
              </ol>
            )}
            </>)}
          </div>
          <div className="relative order-1 min-h-0 flex-1 lg:order-2 lg:col-span-8 lg:self-stretch">{figure(scrollYProgress, beat)}</div>
        </div>
      </div>
    </section>
  );
}
