// A command you can copy. The command is the page's primary action, so it reads as one.
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function Copy({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {}
  };
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-code py-1.5 pr-1.5 pl-4 text-code-foreground shadow-plate">
      <code className="truncate font-mono text-sm">
        <span className="select-none opacity-50">$ </span>
        {text}
      </code>
      <Button size="sm" onClick={copy} aria-label={`Copy ${text}`} className="rounded-sm">
        <span aria-live="polite">{done ? 'Copied' : 'Copy'}</span>
      </Button>
    </div>
  );
}
