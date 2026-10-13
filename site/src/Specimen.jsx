// The primitives sheet: every token on one page, drawn in the language the homepage will use. For review only;
// the homepage replaces it once the primitives are agreed.
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const C30 = Math.cos(Math.PI / 6);
const S30 = 0.5;
// isometric projection: x runs down-right, y runs down-left, z runs up
const iso = (x, y, z = 0) => [(x - y) * C30, (x + y) * S30 - z];
const pts = (...ps) => ps.map((p) => p.join(',')).join(' ');

function Slab({ w, d, t, fill }) {
  const top = [iso(0, 0, t), iso(w, 0, t), iso(w, d, t), iso(0, d, t)];
  const right = [iso(w, 0, t), iso(w, d, t), iso(w, d, 0), iso(w, 0, 0)];
  const left = [iso(0, d, t), iso(w, d, t), iso(w, d, 0), iso(0, d, 0)];
  return (
    <g>
      <polygon points={pts(...left)} className="draw-line fill-tint-1" />
      <polygon points={pts(...right)} className="draw-line fill-tint-2" />
      <polygon points={pts(...top)} className={`draw-line ${fill}`} />
    </g>
  );
}

function Section({ n, title, children }) {
  return (
    <section className="grid gap-6 border-t border-border pt-10 md:grid-cols-[180px_1fr] md:gap-10">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-faint">§{n}</span>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </header>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}

const Label = ({ children, className = '' }) => (
  <span className={`text-xs font-semibold text-primary ${className}`}>{children}</span>
);

const colours = [
  ['background', 'bg-background', 'the page'],
  ['card', 'bg-card', 'plates, cards'],
  ['muted', 'bg-muted', 'code, quiet bands'],
  ['border', 'bg-border', 'hairlines'],
  ['input', 'bg-input', 'field edges'],
  ['grid', 'bg-grid', 'dot grid'],
  ['foreground', 'bg-foreground', 'reading'],
  ['muted-foreground', 'bg-muted-foreground', 'secondary'],
  ['faint', 'bg-faint', 'fig marks'],
  ['primary', 'bg-primary', 'every line'],
  ['secondary', 'bg-secondary', 'quiet control'],
  ['accent', 'bg-accent', 'hovered row'],
  ['tint-1', 'bg-tint-1', 'away face'],
  ['tint-2', 'bg-tint-2', 'half light'],
  ['tint-3', 'bg-tint-3', 'lit face'],
  ['tint-4', 'bg-tint-4', 'the subject'],
  ['success', 'bg-success', 'verdict: on'],
  ['destructive', 'bg-destructive', 'verdict: off'],
  ['warning', 'bg-warning', 'verdict: near'],
];

const type = [
  ['5xl', 'text-5xl font-semibold', 'Every pixel has a plumb line.'],
  ['2xl', 'text-2xl font-semibold', 'Primitives come first'],
  ['lg', 'text-lg text-muted-foreground', 'A design system is a set of decisions, and a page either uses them or drifts.'],
  ['base', 'text-base', 'Because every value compiles to a declaration, Plumb can judge a class, a stylesheet and an inline style by one rule. Pretty neat.'],
  ['sm', 'text-sm text-muted-foreground', 'Fig. 4 — the declaration a class compiles to, beside the token it should have used.'],
  ['xs', 'text-xs font-semibold text-primary', 'Top shell · dust liner · hub'],
];

function Explode() {
  const [apart, setApart] = useState(false);
  const layers = [
    ['Page', 'fill-tint-4'],
    ['Components', 'fill-tint-3'],
    ['Primitives', 'fill-tint-2'],
  ];
  return (
    <div className="plate rounded-md p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs font-semibold text-faint">Fig_001</span>
        <Button variant="outline" size="sm" onClick={() => setApart((a) => !a)} aria-pressed={apart}>
          {apart ? 'Assemble' : 'Take apart'}
        </Button>
      </div>
      <svg viewBox="-200 -150 520 330" className="mx-auto block w-full max-w-xl" role="img" aria-label="Three layers: primitives at the base, components on them, the page on top">
        {layers.map(([name, fill], i) => {
          const rise = (layers.length - 1 - i) * 18;
          const lift = apart ? (layers.length - 1 - i) * 56 : 0;
          const delay = apart ? (layers.length - 1 - i) * 60 : i * 60;
          return (
            <g
              key={name}
              style={{
                transform: `translateY(${-rise - lift}px)`,
                transition: `transform var(--dur-explode) var(--ease-out) ${delay}ms`,
              }}
            >
              <Slab w={150} d={150} t={14} fill={fill} />
              <line x1={135} y1={60} x2={210} y2={60} className="draw-leader" style={{ opacity: apart ? 1 : 0, transition: `opacity var(--dur-move) var(--ease-out) ${delay}ms` }} />
              <text x={218} y={64} className="fill-primary text-xs font-semibold" style={{ opacity: apart ? 1 : 0, transition: `opacity var(--dur-move) var(--ease-out) ${delay}ms` }}>
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Specimen() {
  const flip = () => {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-16 md:px-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label>Plumb · primitives sheet · rev 2 · shadcn</Label>
          <Button variant="ghost" size="sm" onClick={flip}>
            Day / night
          </Button>
        </div>
        <h1 className="text-5xl font-semibold">The foundations, before anything is built on them.</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          One blue ink on drafting paper. Tints of that ink are the only fills. A book serif to read, a mono to point. Hold Alt over anything on this sheet and Plumb will tell you which of these decisions it came from.
        </p>
      </header>

      <Section n="1" title="Colour">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colours.map(([name, bg, role]) => (
            <figure key={name} className="flex flex-col gap-2">
              <div className={`h-16 rounded-md border border-border ${bg}`} />
              <figcaption className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">{name}</span>
                <span className="text-sm text-muted-foreground">{role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section n="2" title="Type">
        <div className="flex flex-col gap-6">
          {type.map(([name, cls, sample]) => (
            <div key={name} className="grid gap-1 sm:grid-cols-[96px_1fr] sm:items-baseline sm:gap-6">
              <span className="text-xs font-semibold text-faint">{name}</span>
              <p className={cls}>{sample}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section n="3" title="Line">
        <div className="plate rounded-md p-6">
          <svg viewBox="0 0 560 210" className="block w-full" role="img" aria-label="Line weights and dash patterns">
            {[
              ['draw-hair', 'Hair · grid, plate edge'],
              ['draw-line', 'Line · object outline'],
              ['draw-bold', 'Bold · the subject'],
              ['draw-leader', 'Leader · callouts, explode axis'],
              ['draw-hidden', 'Hidden · edge behind a face'],
            ].map(([cls, name], i) => (
              <g key={cls} transform={`translate(0 ${24 + i * 38})`}>
                <line x1={0} y1={0} x2={260} y2={0} className={cls} />
                <text x={290} y={4} className="fill-primary text-xs font-semibold">{name}</text>
              </g>
            ))}
          </svg>
        </div>
      </Section>

      <Section n="4" title="Plate, corners, depth">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="plate flex h-36 flex-col justify-between rounded-md p-4">
            <span className="text-xs font-semibold text-faint">Plate · rounded-md</span>
            <span className="text-sm text-muted-foreground">Figures sit on the dot grid, 12px pitch.</span>
          </div>
          <div className="flex h-36 flex-col justify-between rounded-md bg-card p-4 shadow-lift">
            <span className="text-xs font-semibold text-faint">Lift</span>
            <span className="text-sm text-muted-foreground">The only shadow: a card held over the page.</span>
          </div>
          <div className="flex h-36 flex-col justify-between rounded-md border border-border p-4">
            <span className="text-xs font-semibold text-faint">Marks</span>
            <div className="flex items-center gap-3">
              <span className="rounded-sm border border-primary px-2 text-xs font-semibold text-primary">Alt</span>
              <span className="size-3 rounded-full bg-primary" />
              <span className="rounded-sm bg-tint-1 px-2 font-mono text-xs text-primary">gap-3</span>
            </div>
          </div>
        </div>
      </Section>

      <Section n="5" title="Components inherit">
        <p className="max-w-2xl text-muted-foreground">
          shadcn's Button on Base UI, added with the CLI and not touched. It draws in the blue ink on drafting paper because its names now carry our values.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'].map((v) => (
            <Button key={v} variant={v}>{v}</Button>
          ))}
          <Button disabled>disabled</Button>
        </div>
      </Section>

      <Section n="6" title="Motion">
        <p className="max-w-2xl text-muted-foreground">
          One authored moment: a figure comes apart along its axis and settles back. Parts leave top first and return bottom first, 60ms apart, on a fast-start ease. Reduced motion skips the travel.
        </p>
        <Explode />
      </Section>
    </main>
  );
}
