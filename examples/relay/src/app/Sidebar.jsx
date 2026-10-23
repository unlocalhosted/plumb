import { useState } from 'react';
import { Bot, ChevronDown, ChevronRight, Inbox, KanbanSquare, Layers, ListTodo, Plus, Settings, UserRound } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { teams, views, workspace } from '@/data';

function NavItem({ href, icon: Icon, label, count, active, inset = false }) {
  return (
    <a href={href} aria-current={active ? 'page' : undefined}
      className={cn('flex h-7 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
        active && 'bg-sidebar-accent font-medium text-sidebar-foreground', inset && 'pl-7')}>
      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null && <span className="text-xs tabular-nums text-muted-foreground">{count}</span>}
    </a>
  );
}

function SectionLabel({ children, action }) {
  return (
    <div className="flex h-7 items-center justify-between px-2 text-xs font-medium text-muted-foreground">
      {children}
      {action}
    </div>
  );
}

function Team({ team, route }) {
  const [open, setOpen] = useState(team.id === 'web');
  return (
    <div className="flex flex-col">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex h-7 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent">
        {open ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        <span className="flex size-5 items-center justify-center rounded-sm bg-primary/15 text-xs font-semibold text-primary">{team.key[0]}</span>
        <span className="flex-1 text-left">{team.name}</span>
      </button>
      {open && (
        <div className="flex flex-col">
          <NavItem href="#/board" icon={KanbanSquare} label="Board" active={route === 'board'} inset />
          <NavItem href="#/issues" icon={ListTodo} label="Issues" count={team.open} active={route === 'issues'} inset />
          <NavItem href="#/automations" icon={Bot} label="Automations" active={route === 'automations'} inset />
        </div>
      )}
    </div>
  );
}

export function Sidebar({ route }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-[18px] border-r border-sidebar-border bg-sidebar px-2 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-8 items-center gap-2 rounded-md px-2 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/40">
          <span className="flex size-5 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">N</span>
          <span className="flex-1 truncate text-sm font-semibold">{workspace.name}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuItem>{workspace.name}<DropdownMenuShortcut>{workspace.plan}</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem>Acme Labs</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem><Plus />Create workspace</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="flex flex-col" aria-label="Personal">
        <NavItem href="#/inbox" icon={Inbox} label="Inbox" count={3} active={route === 'inbox'} />
        <NavItem href="#/issues" icon={UserRound} label="My issues" count={7} />
      </nav>

      <nav className="flex flex-col" aria-label="Views">
        <SectionLabel>Views</SectionLabel>
        {views.map((v) => <NavItem key={v.id} href="#/issues" icon={Layers} label={v.name} count={v.count} />)}
      </nav>

      <nav className="flex flex-col" aria-label="Teams">
        <SectionLabel action={<button type="button" aria-label="New team" className="flex size-5 items-center justify-center rounded-sm hover:bg-sidebar-accent"><Plus className="size-3.5" /></button>}>Teams</SectionLabel>
        {teams.map((t) => <Team key={t.id} team={t} route={route} />)}
      </nav>

      <div className="mt-auto flex flex-col">
        <NavItem href="#/settings" icon={Settings} label="Settings" active={route === 'settings'} />
      </div>
    </aside>
  );
}
