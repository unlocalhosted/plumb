// The title strip, as on a drawing: name, which sheet you are on, and the one action. A plumb bob hangs from
// the name and swings with how fast you scroll, then settles plumb. Once the visitor writes the fix on sheet 4,
// the bob reads true.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Wrench } from '../system/Wrench.jsx';
import { Button } from '@/components/ui/button';
import { SHEETS, usePage } from './Sheet.jsx';
import { SPRING } from './motion.js';

const REPO = 'https://github.com/unlocalhosted/plumb';

// The install pill takes the nav's place once the hero (and its own install command) has scrolled away.
function InstallPill() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) return setShown(true); // a page without a hero has no install of its own
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting), { rootMargin: '-56px 0px 0px 0px' });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {}
  };
  return (
    <AnimatePresence>
      {shown && (
        <motion.button
          type="button"
          onClick={copy}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={SPRING.settle}
          aria-label={`Copy ${INSTALL}`}
          className="hidden h-9 items-center gap-3 rounded-full bg-code pr-1 pl-4 font-mono text-sm text-code-foreground shadow-plate md:inline-flex"
        >
          {INSTALL}
          <span className="rounded-full bg-primary px-3 py-1 font-sans text-xs font-semibold text-primary-foreground" aria-live="polite">
            {done ? 'Copied ✓' : 'Copy'}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

const INSTALL = 'npm i -D @unlocalhosted/plumb';

export function TitleStrip() {
  const { sheet, drift, cheer } = usePage();
  const mood = drift === null ? 'idle' : drift > 0 ? 'worried' : 'content';
  const flip = () => {
    const dark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {}
  };
  return (
    <header className="fixed inset-x-0 top-0 z-(--z-bar) border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6 md:px-12">
        <a href="#top" className="flex h-full items-center gap-2 pr-6 text-lg font-semibold">
          Plumb
          <Wrench mood={mood} cheer={cheer} scale={0.72} compact />
        </a>
        <nav aria-label="Sheets" className="hidden items-center gap-4 lg:flex">
          {SHEETS.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={i === sheet ? 'true' : undefined}
              className="text-xs font-semibold text-faint transition-colors hover:text-primary aria-[current]:text-primary"
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <InstallPill />
          <Button variant="ghost" size="sm" render={<a href={REPO} />} nativeButton={false} className="max-sm:hidden">
            GitHub
          </Button>
          <Button variant="ghost" size="sm" onClick={flip} aria-label="Switch day and night">
            Day / Night
          </Button>
          <Button size="sm" render={<a href="#install" />} nativeButton={false}>
            Install
          </Button>
        </div>
      </div>
    </header>
  );
}
