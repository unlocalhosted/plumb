// An issue, opened over the current screen in a sheet (Radix Dialog via shadcn): a portal, a focus trap and an
// overlay. Properties, a description, sub-issues, activity and a comment box.
import { Calendar, CheckCircle2, Circle, CircleDot, Hash, Link2, RefreshCw, SignalHigh, Tag, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { issues, people, statuses } from '@/data';
import { PersonAvatar } from '@/app/PersonAvatar';
import { PriorityBars, StatusDot } from '@/app/Status';
import { closeIssue } from '@/app/router';

function Property({ icon: Icon, label, children }) {
  return (
    <>
      <dt className="flex h-7 items-center gap-2 text-[12.5px] text-muted-foreground"><Icon className="size-3.5" />{label}</dt>
      <dd className="flex h-7 min-w-0 items-center gap-1.5 text-sm">{children}</dd>
    </>
  );
}

const subIssues = [
  { title: 'Persist position on drop', done: true },
  { title: 'Reconcile with server order on refresh', done: true },
  { title: 'Regression test for reordering across columns', done: false },
];

function Activity({ issue }) {
  const [a, b] = [people[1], people[2]];
  return (
    <ol className="flex flex-col gap-4">
      <li className="flex items-center gap-2 text-xs text-muted-foreground">
        <PersonAvatar person={a} className="size-5" /><span><span className="font-medium text-foreground">{a.name}</span> created the issue · 3d ago</span>
      </li>
      <li className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="mx-0.5 size-4" /><span>Status changed from Todo to In progress · 2d ago</span>
      </li>
      <li className="flex gap-2">
        <PersonAvatar person={b} className="size-6" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-[6px] border bg-card px-3 py-2 shadow-xs">
          <span className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{b.name}</span> · 1d ago</span>
          <p className="text-sm">Repro: drag {issue.key} into In review, refresh, and it's back in the old column. The optimistic update never gets the server's order.</p>
        </div>
      </li>
      <li className="flex gap-2">
        <PersonAvatar person={issue.assignee ?? a} className="size-6" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-[6px] border bg-card px-3 py-2 shadow-xs">
          <span className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{(issue.assignee ?? a).name}</span> · 4h ago</span>
          <p className="text-sm">Fix is up: we now reconcile with <code className="rounded-sm bg-[#f3f4f6] px-1 font-mono text-xs">position</code> from the response before clearing the optimistic state.</p>
        </div>
      </li>
    </ol>
  );
}

export function IssueDrawer({ issueKey, screen }) {
  const issue = issues.find((i) => i.key === issueKey);
  const status = statuses.find((s) => s.id === issue?.status);
  return (
    <Sheet open={!!issue} onOpenChange={(open) => { if (!open) closeIssue(screen); }}>
      {issue && (
        <SheetContent>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-[22px] pr-12">
            <span className="text-xs font-medium tabular-nums text-muted-foreground">{issue.key}</span>
            <Button variant="ghost" size="icon" className="size-7" aria-label="Copy link"><Link2 /></Button>
          </header>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-[22px] py-5">
            <div className="flex flex-col gap-1">
              <SheetTitle className="text-xl">{issue.title}</SheetTitle>
              <SheetDescription>In Web · Cycle 14</SheetDescription>
            </div>

            <dl className="grid grid-cols-[120px_1fr] gap-x-4">
              <Property icon={CircleDot} label="Status"><StatusDot status={issue.status} />{status.name}</Property>
              <Property icon={SignalHigh} label="Priority"><PriorityBars priority={issue.priority} /><span className="capitalize">{issue.priority}</span></Property>
              <Property icon={UserRound} label="Assignee">{issue.assignee ? <><PersonAvatar person={issue.assignee} className="size-5" />{issue.assignee.name}</> : <span className="text-muted-foreground">Unassigned</span>}</Property>
              <Property icon={Tag} label="Labels">{issue.labels.map((l) => <Badge key={l.name} variant="outline" className="font-normal">{l.name}</Badge>)}</Property>
              <Property icon={Hash} label="Points"><span className="tabular-nums">{issue.estimate ?? '–'}</span></Property>
              <Property icon={Calendar} label="Due"><span className={issue.overdue ? 'font-medium text-destructive' : ''}>{issue.due ?? 'No date'}</span></Property>
            </dl>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Description</h3>
              <div className="flex flex-col gap-2 text-sm text-foreground/90">
                <p>Dragging a card to another column works until the page refreshes; then the card returns to its old column because we never reconcile with the server's <code className="rounded-sm bg-[#f3f4f6] px-1 font-mono text-xs">position</code>.</p>
                <ul className="list-disc pl-5">
                  <li>Keep the optimistic move until the server answers.</li>
                  <li>On success, take the server's order for the whole column.</li>
                  <li>On failure, roll back and show a toast.</li>
                </ul>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Sub-issues <span className="font-normal text-muted-foreground">· {subIssues.filter((s) => s.done).length}/{subIssues.length}</span></h3>
              <ul className="flex flex-col rounded-lg border">
                {subIssues.map((s) => (
                  <li key={s.title} className="flex h-9 items-center gap-2 border-b px-3 text-sm last:border-b-0">
                    {s.done ? <CheckCircle2 className="size-4 text-status-done" /> : <Circle className="size-4 text-muted-foreground" />}
                    <span className={s.done ? 'text-muted-foreground line-through' : ''}>{s.title}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Activity</h3>
              <Activity issue={issue} />
            </section>
          </div>
          <footer className="flex shrink-0 flex-col gap-2 border-t px-[22px] py-3">
            <textarea rows={2} placeholder="Leave a comment…" aria-label="Comment"
              className="w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[#12805c]/30" />
            <div className="flex justify-end"><Button size="sm">Comment</Button></div>
          </footer>
        </SheetContent>
      )}
    </Sheet>
  );
}
