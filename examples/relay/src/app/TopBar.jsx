import { Bell, ChevronRight, ListFilter, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { people, workspace } from '@/data';
import { AvatarStack } from './PersonAvatar';

export function TopBar({ title, onCommand }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
        <span className="text-muted-foreground">{workspace.name}</span>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Web</span>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <span className="truncate font-medium">{title}</span>
      </nav>

      <button type="button" onClick={onCommand}
        className="ml-auto flex h-8 w-64 items-center gap-2 rounded-md border border-input bg-card px-2.5 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent">
        <Search className="size-4" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="rounded-sm border px-1 font-sans text-xs">⌘K</kbd>
      </button>

      <Button variant="ghost" size="icon" aria-label="Filter"><ListFilter /></Button>
      <Tooltip>
        <TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button></TooltipTrigger>
        <TooltipContent>3 unread</TooltipContent>
      </Tooltip>

      <AvatarStack people={people} />

      {/* A hand-rolled button that looks like <Button>, with its own padding and corners. */}
      <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-primary px-[13px] text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90">
        <Plus className="size-4" />New issue
      </button>
    </header>
  );
}
