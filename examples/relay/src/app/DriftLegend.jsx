// A demo aid, not part of Relay: what's planted on this screen (src/drift.js), what's wrong with it, the rule that
// should catch it and the fix React Plumber should offer. Lets anyone check that Plumber finds all of it and nothing
// else. Built from Relay's own tokens, so it adds no drift of its own.
import { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { planted } from '@/drift';
import { cn } from '@/lib/utils';

export function DriftLegend({ screen, drawer }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const here = planted.filter((p) => p.screen === 'shell' || p.screen === screen || (drawer && p.screen === 'drawer'));
  const items = all ? planted : here;
  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2">
      {open && (
        <section aria-label="Planted drift" className="flex max-h-[60vh] w-96 flex-col overflow-hidden rounded-lg border border-dashed border-input bg-popover text-popover-foreground shadow-lg">
          <header className="flex items-center gap-2 border-b px-3 py-2">
            <FlaskConical className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Planted drift</span>
            <span className="text-xs text-muted-foreground">demo aid</span>
            <Button variant="ghost" size="icon" className="ml-auto size-6" aria-label="Close" onClick={() => setOpen(false)}><X /></Button>
          </header>
          <div className="flex items-center gap-1 border-b px-3 py-1.5">
            <Button variant={all ? 'ghost' : 'secondary'} size="sm" onClick={() => setAll(false)}>This screen · {here.length}</Button>
            <Button variant={all ? 'secondary' : 'ghost'} size="sm" onClick={() => setAll(true)}>All · {planted.length}</Button>
          </div>
          <ol className="flex flex-col overflow-y-auto">
            {items.map((p) => (
              <li key={p.screen + p.what} className="flex flex-col gap-1 border-b px-3 py-2 last:border-b-0">
                <span className="flex items-baseline gap-2">
                  <code className="min-w-0 flex-1 font-mono text-xs break-words">{p.what}</code>
                  {all && <span className="shrink-0 text-xs text-muted-foreground">{p.screen}</span>}
                </span>
                <span className="text-xs text-muted-foreground">{p.wrong}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-xs">
                  <span className="text-muted-foreground">{p.rule}</span>
                  <span className="text-primary">→ {p.fix}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-input bg-popover px-3 text-xs font-medium text-popover-foreground shadow-sm transition-colors hover:bg-accent',
          open && 'bg-accent')}>
        <FlaskConical className="size-3.5 text-muted-foreground" />Planted drift<span className="tabular-nums text-muted-foreground">{here.length}</span>
      </button>
    </div>
  );
}
