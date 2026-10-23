// The board: one column per status, one IssueCard per issue. Every card comes from the same line of source, so in
// React Plumber a fix to one card is a fix to all of them (one stamp, many elements).
import { CalendarDays, MessageSquare, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { issues, statuses } from '@/data';
import { cn } from '@/lib/utils';
import { PersonAvatar } from '@/app/PersonAvatar';
import { PriorityBars, StatusDot } from '@/app/Status';

function LabelChip({ label }) {
  // A label's colour is the workspace's choice, read from data: computed at runtime.
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs text-muted-foreground">
      <span className="size-2 rounded-full" style={{ background: `oklch(0.66 0.14 ${label.hue})` }} />
      {label.name}
    </span>
  );
}

function SubProgress({ done, total }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground" title={`${done} of ${total} sub-issues done`}>
      <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeOpacity=".3" strokeWidth="2" />
        <circle cx="6" cy="6" r="5" fill="none" stroke="var(--primary)" strokeWidth="2" strokeDasharray={`${(done / total) * 31.4} 31.4`} transform="rotate(-90 6 6)" />
      </svg>
      {done}/{total}
    </span>
  );
}

export function IssueCard({ issue }) {
  return (
    <a href={`#/board/${issue.key}`}
      className="group flex flex-col gap-2 rounded-lg border bg-card p-[10px] shadow-[0_1px_3px_rgba(0,0,0,.12)] transition-shadow duration-[250ms] hover:border-input hover:shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium tabular-nums">{issue.key}</span>
        <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"><MoreHorizontal className="size-4" /></span>
        {issue.assignee && <PersonAvatar person={issue.assignee} className="size-5" />}
      </div>
      <div className="flex items-start gap-2">
        <StatusDot status={issue.status} className="mt-1" />
        <span className="text-sm font-medium text-card-foreground">{issue.title}</span>
      </div>
      {issue.labels.length > 0 && <div className="flex flex-wrap gap-1">{issue.labels.map((l) => <LabelChip key={l.name} label={l} />)}</div>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <PriorityBars priority={issue.priority} />
        {issue.estimate != null && <span className="tabular-nums">{issue.estimate} pt</span>}
        {issue.sub && <SubProgress done={issue.sub[0]} total={issue.sub[1]} />}
        {issue.comments > 0 && <span className="inline-flex items-center gap-1 tabular-nums"><MessageSquare className="size-3.5" />{issue.comments}</span>}
        {issue.due && (
          <span className={cn('ml-auto inline-flex items-center gap-1', issue.overdue && 'font-medium text-[#d23a3a]')}>
            <CalendarDays className="size-3.5" />{issue.due}
          </span>
        )}
      </div>
    </a>
  );
}

function Column({ status, items }) {
  return (
    <section className={cn('flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted/60 p-2', status.id === 'review' && 'rounded-[10px]')} aria-label={status.name}>
      <header className="flex h-8 items-center gap-2 px-1">
        <StatusDot status={status.id} />
        <h2 className="text-sm font-medium">{status.name}</h2>
        <span className="rounded-sm bg-[#e9ebef] px-1.5 text-xs tabular-nums text-muted-foreground">{items.length}</span>
        <Button variant="ghost" size="icon" className="ml-auto size-6" aria-label={`Add to ${status.name}`}><Plus /></Button>
      </header>
      <div className="flex flex-col gap-2">
        {items.map((issue) => <IssueCard key={issue.key} issue={issue} />)}
      </div>
    </section>
  );
}

export function Board() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-4">
        <Button variant="secondary" size="sm">All issues</Button>
        <Button variant="ghost" size="sm">Active</Button>
        <Button variant="ghost" size="sm">Backlog</Button>
        <span className="ml-auto text-xs text-muted-foreground">{issues.length} issues · grouped by status</span>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
        {statuses.map((s) => <Column key={s.id} status={s} items={issues.filter((i) => i.status === s.id)} />)}
      </div>
    </div>
  );
}
