// Step 1 of the build (site/HOMEPAGE.md §5): every shared system in every state, for review before any section is
// built on them. Development-only page at #systems.
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Field } from './Field.jsx';
import { OffBy, Seal, Shipping, Badge } from './Sticker.jsx';
import { Wrench } from './Wrench.jsx';
import { Button } from '@/components/ui/button';
import { SPRING } from '../site/motion.js';
import { PageState, usePageState } from '../site/Sheet.jsx';
import { TitleStrip } from '../site/TitleStrip.jsx';

function Block({ title, note, children }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="max-w-2xl text-muted-foreground">{note}</p>
      </div>
      {children}
    </section>
  );
}

export function Systems() {
  const page = usePageState();
  return (
    <PageState.Provider value={page}>
      <TitleStrip />
      <SystemsBody />
    </PageState.Provider>
  );
}

function SystemsBody() {
  const [drift, setDrift] = useState(6);
  const [flipped, setFlipped] = useState(false);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-24 px-6 py-24 md:px-12">
      <header className="flex flex-col gap-4">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">Build step 1 · shared systems</span>
        <h1 className="text-5xl font-semibold">The parts every section is built from.</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">Tune them live in the panel (top right, development only). Nothing here ships as a section; the hero is built on these next.</p>
      </header>

      <Block title="The field" note="Inside the blue stage only, never full-bleed. Drift is turbulence: each fix calms it within 300ms. Blues plus one warm accent. A static gradient paints first and is the fallback without WebGPU or with reduced motion.">
        <div className="relative grid h-96 place-items-center overflow-hidden rounded-lg bg-stage text-stage-foreground shadow-lift">
          <Field turbulence={drift / 6} />
          <div className="relative flex flex-col items-center gap-4">
            <span className="text-4xl font-semibold tabular-nums">{drift} off</span>
            <span className="text-sm font-semibold opacity-80">{drift ? 'restless' : 'still'}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setDrift((d) => Math.max(0, d - 1))} disabled={!drift}>
            Fix one
          </Button>
          <Button variant="ghost" onClick={() => setDrift(6)}>
            Reset to 6
          </Button>
        </div>
      </Block>

      <Block title="Section titles" note="A new 40px step between the 32px sub-head and the 52px headline, so sections neither shout nor go flat.">
        <div className="plate flex flex-col gap-3 p-6">
          <span className="text-4xl font-semibold">It reads your system.</span>
          <span className="text-lg text-muted-foreground">Section lead, 20/30, muted.</span>
          <span className="font-mono text-sm tabular-nums">Counters are tabular: 0 1 2 3 4 5 6 7 8 9 · 312 → 305</span>
        </div>
      </Block>

      <Block title="Stickers" note="Die-cut vinyl, drawn in SVG. Each shape carries its message: a callout tag pointing at the drifted part, an inspection seal ringed with the scale, a parcel tag for what ships, the CI badge from a README. Hover near a corner and it peels; drag one and let go; click the red tag to flip it.">
        <div className="relative flex flex-wrap items-center gap-14 overflow-hidden rounded-lg bg-stage p-12 shadow-lift">
          <button type="button" onClick={() => setFlipped((f) => !f)} className="cursor-pointer" aria-label="Flip the sticker">
            <OffBy flipped={flipped} />
          </button>
          <Seal delay={0.08} />
          <Shipping delay={0.16} />
          <Badge delay={0.24} />
        </div>
        <div className="plate flex flex-wrap items-center gap-14 p-12">
          <OffBy rest={4} delay={0.32} />
          <Seal rest={-8} delay={0.4} />
          <Shipping rest={5} delay={0.48} />
          <Badge rest={-4} delay={0.56} />
        </div>
      </Block>

      <Block title="Wrench buddy" note="The React Plumber's buddy: an adjustable wrench. Idle, he stands still and watches you; hover and he opens his jaw to say hello. While there's a leak he watches it and sizes it up with his jaw. Each fix, he ratchets twice. The last fix, he flips and lands. Click him to ratchet.">
        <Dowsing />
      </Block>

      <Block title="Springs" note="The page's whole motion vocabulary. Each button moves a chip on that spring.">
        <Springs />
      </Block>

      <Block title="Install, always in reach" note="Once the hero scrolls away, the title strip carries the install command with Copy. On this page it's showing because there's no hero.">
        <div className="plate p-6 text-muted-foreground">See the title strip, top centre.</div>
      </Block>
    </main>
  );
}

// Four drifted parts scattered round the plate: the leaks he watches, one by one.
const DRIFTS = [
  { label: 'gap-[13px]', at: 'left-[66%] top-[74%]' },
  { label: 'p-[21px]', at: 'left-[18%] top-[82%]' },
  { label: 'text-[15px]', at: 'left-[78%] top-[58%]' },
  { label: 'rounded-[3px]', at: 'left-[34%] top-[70%]' },
];

function Dowsing() {
  const [fixed, setFixed] = useState(0);
  const [known, setKnown] = useState(true);
  const [cheer, setCheer] = useState(0);
  const parts = useRef([]);
  const [target, setTarget] = useState(null);
  useEffect(() => setTarget(known && fixed < DRIFTS.length ? parts.current[fixed] : null), [fixed, known]);
  const mood = !known ? 'idle' : fixed < DRIFTS.length ? 'worried' : 'content';
  // a fresh start: remount so the flip can play again
  const [run, setRun] = useState(0);
  return (
    <div className="plate relative h-[30rem] p-10">
      <div className="absolute top-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        <Wrench key={run} target={target} mood={mood} cheer={cheer} scale={4} />
        <span className="text-sm font-semibold">{mood}</span>
      </div>
      {DRIFTS.map((d, i) => (
        <span
          key={d.label}
          ref={(el) => (parts.current[i] = el)}
          className={`absolute ${d.at} rounded-md px-2 py-1 font-mono text-sm font-semibold transition-colors duration-300 ${i < fixed ? 'bg-success/15 text-success' : 'bg-destructive/12 text-destructive'}`}
        >
          {i < fixed ? '✓' : d.label}
        </span>
      ))}
      <div className="absolute top-6 left-6 flex flex-col items-start gap-2">
        <Button variant="outline" disabled={!known || fixed >= DRIFTS.length} onClick={() => (setFixed((f) => f + 1), setCheer((c) => c + 1))}>
          Fix one
        </Button>
        <Button variant="ghost" onClick={() => (setFixed(0), setKnown(true), setRun((r) => r + 1))}>
          Reset
        </Button>
        <Button variant="ghost" onClick={() => setKnown((k) => !k)}>
          {known ? 'No drift known (idle)' : 'Find drift'}
        </Button>
      </div>
    </div>
  );
}

function Springs() {
  const [on, setOn] = useState({});
  return (
    <div className="plate flex flex-col gap-3 p-6">
      {Object.entries(SPRING).map(([name, s]) => (
          <div key={name} className="grid grid-cols-[120px_1fr] items-center gap-4">
            <button type="button" onClick={() => setOn((o) => ({ ...o, [name]: !o[name] }))} className="rounded-md bg-secondary px-3 py-1.5 text-left text-sm font-semibold text-secondary-foreground">
              {name}
            </button>
            <div className="relative h-8 rounded-md bg-muted">
              <SpringChip on={on[name]} spring={s} />
            </div>
          </div>
        ))}
    </div>
  );
}

function SpringChip({ on, spring }) {
  return <motion.span className="absolute top-1 left-1 h-6 w-16 rounded-sm bg-primary" animate={{ x: on ? 400 : 0 }} transition={{ type: 'spring', ...spring }} />;
}
