import type { ReactNode } from 'react';

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4 text-foreground">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}
