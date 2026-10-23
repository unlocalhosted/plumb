// The issues table: filters, sortable columns, row selection and a bulk-action bar. Dense and tabular, the screen
// where type rhythm, alignment and tabular numbers matter most.
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, CircleDot, ListFilter, SignalHigh, Tag, Trash2, UserRound, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { issues, statuses } from '@/data';
import { cn } from '@/lib/utils';
import { PersonAvatar } from '@/app/PersonAvatar';
import { PriorityBars, StatusDot } from '@/app/Status';

const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 };
const statusRank = Object.fromEntries(statuses.map((s, i) => [s.id, i]));
const updated = ['2m ago', '14m ago', '1h ago', '3h ago', 'Yesterday', '2d ago', '4d ago', 'Oct 12'];

const columns = [
  { id: 'priority', label: 'Priority', sort: (a, b) => priorityRank[a.priority] - priorityRank[b.priority] },
  { id: 'key', label: 'ID', sort: (a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }) },
  { id: 'status', label: 'Status', sort: (a, b) => statusRank[a.status] - statusRank[b.status] },
  { id: 'title', label: 'Title', sort: (a, b) => a.title.localeCompare(b.title) },
  { id: 'assignee', label: 'Assignee', sort: (a, b) => (a.assignee?.name ?? '').localeCompare(b.assignee?.name ?? '') },
  { id: 'estimate', label: 'Points', sort: (a, b) => (a.estimate ?? 0) - (b.estimate ?? 0), numeric: true },
  { id: 'due', label: 'Due', sort: (a, b) => (a.due ?? '~').localeCompare(b.due ?? '~') },
  { id: 'updated', label: 'Updated' },
];

function FilterChip({ icon: Icon, label, value }) {
  return (
    <Button variant="outline" size="sm" className="gap-1.5">
      <Icon />{label}{value && <span className="text-muted-foreground">· {value}</span>}
    </Button>
  );
}

function SortHead({ column, sort, onSort }) {
  const active = sort.id === column.id;
  const Arrow = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('text-[11px] tracking-[.06em] uppercase', column.numeric && 'text-right')}>
      {column.sort ? (
        <button type="button" onClick={() => onSort(column.id)} className={cn('inline-flex items-center gap-1 rounded-sm uppercase hover:text-foreground', active && 'text-foreground')}>
          {column.label}<Arrow className="size-3" />
        </button>
      ) : column.label}
    </TableHead>
  );
}

function BulkBar({ count, onClear }) {
  return (
    <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto flex w-fit items-center gap-2 rounded-[12px] border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
      <span className="text-sm font-medium tabular-nums">{count} selected</span>
      <span className="h-4 w-px bg-border" />
      <Button variant="ghost" size="sm"><UserRound />Assign</Button>
      <Button variant="ghost" size="sm"><CircleDot />Status</Button>
      <Button variant="ghost" size="sm"><Tag />Label</Button>
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 />Delete</Button>
      <Button variant="ghost" size="icon" aria-label="Clear selection" onClick={onClear}><X /></Button>
    </div>
  );
}

export function Issues() {
  const [sort, setSort] = useState({ id: 'priority', dir: 'asc' });
  const [selected, setSelected] = useState(() => new Set(['WEB-185', 'WEB-201']));
  const rows = useMemo(() => {
    const col = columns.find((c) => c.id === sort.id);
    const out = [...issues].sort(col.sort);
    return sort.dir === 'asc' ? out : out.reverse();
  }, [sort]);
  const onSort = (id) => setSort((s) => ({ id, dir: s.id === id && s.dir === 'asc' ? 'desc' : 'asc' }));
  const toggle = (key) => setSelected((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const all = selected.size === rows.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-4">
        <FilterChip icon={CircleDot} label="Status" value="Not done" />
        <FilterChip icon={SignalHigh} label="Priority" />
        <FilterChip icon={UserRound} label="Assignee" />
        <FilterChip icon={Tag} label="Label" />
        <Button variant="ghost" size="sm"><ListFilter />More filters</Button>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{rows.length} issues</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pl-4">
                <input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.key)))} className="size-3.5 accent-primary" />
              </TableHead>
              {columns.map((c) => <SortHead key={c.id} column={c} sort={sort} onSort={onSort} />)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((issue, i) => {
              const on = selected.has(issue.key);
              return (
                <TableRow key={issue.key} data-state={on ? 'selected' : undefined} onClick={(e) => { if (!e.target.closest('input')) location.hash = `#/issues/${issue.key}`; }} className={cn('cursor-pointer', on && 'bg-[#eaf6f1] hover:bg-[#eaf6f1]')}>
                  <TableCell className="pl-4">
                    <input type="checkbox" aria-label={`Select ${issue.key}`} checked={on} onChange={() => toggle(issue.key)} className="size-3.5 accent-primary" />
                  </TableCell>
                  <TableCell><PriorityBars priority={issue.priority} /></TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">{issue.key}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><StatusDot status={issue.status} />{statuses.find((s) => s.id === issue.status).name}</span>
                  </TableCell>
                  <TableCell className="max-w-0 w-full">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{issue.title}</span>
                      {issue.labels.slice(0, 2).map((l) => <Badge key={l.name} variant="outline" className="font-normal text-muted-foreground">{l.name}</Badge>)}
                    </span>
                  </TableCell>
                  <TableCell>{issue.assignee && <span className="inline-flex items-center gap-2"><PersonAvatar person={issue.assignee} className="size-5" /><span className="text-xs">{issue.assignee.name.split(' ')[0]}</span></span>}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums" style={{ paddingRight: 14 }}>{issue.estimate ?? '–'}</TableCell>
                  <TableCell className={cn('text-xs tabular-nums', issue.overdue ? 'font-medium text-destructive' : 'text-muted-foreground')}>{issue.due ?? '–'}</TableCell>
                  <TableCell className="pr-4 text-xs text-[#8a8f99]">{updated[i % updated.length]}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {selected.size > 0 && <BulkBar count={selected.size} onClear={() => setSelected(new Set())} />}
    </div>
  );
}
