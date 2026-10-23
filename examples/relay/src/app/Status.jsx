// An issue's status and priority, each in its token colour (styles.css: --status-*, --priority-*).
import { cn } from '@/lib/utils';

const statusClass = {
  backlog: 'border-status-backlog border-dashed',
  todo: 'border-status-todo',
  progress: 'border-status-progress bg-[conic-gradient(var(--status-progress)_0_50%,transparent_0)]',
  review: 'border-status-review bg-[conic-gradient(var(--status-review)_0_75%,transparent_0)]',
  done: 'border-status-done bg-status-done',
  canceled: 'border-status-canceled bg-status-canceled',
};

export function StatusDot({ status, className }) {
  return <span className={cn('inline-block size-3 shrink-0 rounded-full border-2', statusClass[status], className)} aria-hidden="true" />;
}

const priorityLevel = { urgent: 3, high: 3, medium: 2, low: 1 };
const priorityClass = { urgent: 'bg-priority-urgent', high: 'bg-priority-high', medium: 'bg-priority-medium', low: 'bg-priority-low' };

export function PriorityBars({ priority }) {
  const level = priorityLevel[priority];
  return (
    <span className="inline-flex h-3 items-end gap-px" title={`${priority[0].toUpperCase()}${priority.slice(1)} priority`}>
      {[1, 2, 3].map((b) => <span key={b} className={cn('w-1 rounded-sm', b <= level ? priorityClass[priority] : 'bg-border')} style={{ height: `${b * 4}px` }} />)}
    </span>
  );
}
