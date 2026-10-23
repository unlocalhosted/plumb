// Relay's primitives on one page, for review before any screen is built: colour roles, status and priority, type,
// radius, elevation, and the shadcn primitives drawn from them. Toggle dark to check both themes.
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const roles = ['background', 'foreground', 'card', 'primary', 'secondary', 'muted', 'muted-foreground', 'accent', 'destructive', 'border', 'input', 'ring', 'sidebar'];
const statuses = [['backlog', 'Backlog'], ['todo', 'Todo'], ['progress', 'In progress'], ['review', 'In review'], ['done', 'Done'], ['canceled', 'Canceled']];
const priorities = [['urgent', 'Urgent'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low']];
const type = [['text-2xl', 'Page title · 24'], ['text-xl', 'Section · 20'], ['text-lg', 'Panel title · 16'], ['text-base', 'Emphasis · 14'], ['text-sm', 'Working text · 13'], ['text-xs', 'Meta and labels · 12']];

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function Specimen() {
  const [dark, setDark] = useState(false);
  return (
    <div className={dark ? 'dark' : ''}>
      <main className="min-h-screen bg-background px-8 py-8 text-foreground">
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
          <header className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold">Relay primitives</h1>
              <p className="text-sm text-muted-foreground">shadcn/ui tokens with Relay's values. Every screen is built from these.</p>
            </div>
            <Button variant="outline" onClick={() => setDark((d) => !d)}>{dark ? 'Light' : 'Dark'}</Button>
          </header>

          <Section title="Colour roles">
            <div className="grid grid-cols-7 gap-2">
              {roles.map((r) => (
                <div key={r} className="flex flex-col gap-1">
                  <div className="h-10 rounded-md border" style={{ background: `var(--${r})` }} />
                  <span className="text-xs text-muted-foreground">{r}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Status and priority">
            <div className="flex flex-wrap gap-4">
              {statuses.map(([k, label]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: `var(--status-${k})` }} />{label}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              {priorities.map(([k, label]) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-sm">
                  <span className="inline-flex h-3 items-end gap-px">{[1, 2, 3].map((b) => <span key={b} className="w-1 rounded-sm" style={{ height: `${b * 4}px`, background: `var(--priority-${k})` }} />)}</span>{label}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Type">
            <div className="flex flex-col gap-2">
              {type.map(([cls, label]) => <span key={cls} className={cls}>{label} — Ship the onboarding checklist</span>)}
            </div>
          </Section>

          <Section title="Radius and elevation">
            <div className="flex flex-wrap gap-4">
              {['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl'].map((r) => <div key={r} className={`flex h-14 w-24 items-center justify-center border bg-card text-xs text-muted-foreground ${r}`}>{r}</div>)}
              {['shadow-xs', 'shadow-sm', 'shadow-lg'].map((s) => <div key={s} className={`flex h-14 w-24 items-center justify-center rounded-lg bg-card text-xs text-muted-foreground ${s}`}>{s}</div>)}
            </div>
          </Section>

          <Section title="Primitives">
            <div className="flex flex-wrap items-center gap-2">
              <Button>Create issue</Button>
              <Button variant="outline">Filter</Button>
              <Button variant="secondary">Assign</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="destructive">Delete</Button>
              <Button size="sm">Small</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Default</Badge><Badge variant="secondary">Bug</Badge><Badge variant="outline">Frontend</Badge><Badge variant="destructive">Blocked</Badge>
              <Avatar><AvatarFallback>AL</AvatarFallback></Avatar>
              <Avatar className="size-8"><AvatarFallback>GH</AvatarFallback></Avatar>
            </div>
            <Card className="max-w-sm">
              <CardHeader><CardTitle>Onboarding checklist</CardTitle><CardDescription>REL-142 · Updated 2h ago</CardDescription></CardHeader>
              <CardContent className="text-sm">Ship the first-run checklist behind the onboarding flag.</CardContent>
            </Card>
          </Section>
        </div>
      </main>
    </div>
  );
}
