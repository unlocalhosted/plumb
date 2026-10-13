// The close: the page has made its case, so it hands over the four commands and the one invitation that matters,
// that this page is itself the demo.
import { Copy } from '../site/Copy.jsx';
import { Wrench } from '../system/Wrench.jsx';

const STEPS = [
  { cmd: 'npx @unlocalhosted/plumb', say: 'Report the drift. No config, exits 0.' },
  { cmd: 'npx plumb init', say: 'Write plumb.config.ts and record today’s findings as debt.' },
  { cmd: 'npx plumb install --overlay --write', say: 'Wire the overlay into Vite or Next.js, and show the diff.' },
  { cmd: 'npx plumb install --ci', say: 'Add the GitHub Action. From here, only new drift fails.' },
];

export function Close() {
  return (
    <section id="install" className="mx-auto flex max-w-6xl scroll-mt-14 flex-col gap-16 px-6 pt-32 pb-16 md:px-12">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-4">
          <span className="text-xs font-semibold text-primary">Install · four commands</span>
          <h2 className="text-5xl font-semibold text-balance">Hang a plumb line in your project.</h2>
          <p className="text-muted-foreground">React with Tailwind v4 or plain CSS, on Node 22.18 or newer. Plumb reads the decisions already in your theme. You don’t write a new one.</p>
        </div>
        <ol className="flex flex-col gap-6 lg:col-span-7 lg:col-start-6">
          {STEPS.map((s, i) => (
            <li key={s.cmd} className="grid grid-cols-[32px_1fr] items-baseline gap-2">
              <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, '0')}</span>
              <div className="flex flex-col gap-2">
                <Copy text={s.cmd} />
                <span className="text-sm text-muted-foreground">{s.say}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="max-w-2xl text-lg text-muted-foreground">
        Everything on this page was drawn with its own design system, and Plumb is running on it now. Hold <kbd className="rounded-sm border border-border bg-card px-1.5 font-mono text-xs text-foreground">Alt</kbd> and point at any part of it to see the JSX that drew it.
      </p>

      <footer className="flex flex-col gap-3 border-t border-border pt-6 text-xs font-semibold text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-3">
          <Wrench scale={0.6} compact />
          Plumb · MIT
        </span>
        <span>Set in Newsreader and JetBrains Mono · drawn in one ink · checked by Plumb</span>
      </footer>
    </section>
  );
}
