// ⌘K: jump to an issue, a screen or an action from anywhere. A popover over everything, keyboard-first (cmdk).
import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Bot, CircleDot, KanbanSquare, ListTodo, Plus, Settings, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { issues } from '@/data';
import { StatusDot } from './Status';

const go = (hash) => { location.hash = hash; };

function Item({ icon: Icon, children, shortcut, onSelect, value }) {
  return (
    <Command.Item value={value} onSelect={onSelect}
      className="flex h-9 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-none select-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground">
      {Icon && <Icon className="size-4 text-muted-foreground" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut && <kbd className="font-sans text-xs text-muted-foreground">{shortcut}</kbd>}
    </Command.Item>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); } };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, []);
  return [open, setOpen];
}

export function CommandPalette({ open, onOpenChange }) {
  const run = (fn) => () => { onOpenChange(false); fn(); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[22%] max-w-lg translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search or jump to</DialogTitle>
        <Command label="Search or jump to" className="flex flex-col">
          <Command.Input autoFocus placeholder="Search issues, screens and actions…"
            className="h-11 border-b bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground" />
          <Command.List className="max-h-80 overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing matches.</Command.Empty>
            <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              <Item icon={Plus} shortcut="C" onSelect={run(() => {})}>Create issue</Item>
              <Item icon={UserPlus} shortcut="I" onSelect={run(() => go('#/settings'))}>Invite a teammate</Item>
            </Command.Group>
            <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              <Item icon={KanbanSquare} shortcut="G B" onSelect={run(() => go('#/board'))}>Board</Item>
              <Item icon={ListTodo} shortcut="G I" onSelect={run(() => go('#/issues'))}>Issues</Item>
              <Item icon={Bot} shortcut="G A" onSelect={run(() => go('#/automations'))}>Automations</Item>
              <Item icon={Settings} shortcut="G S" onSelect={run(() => go('#/settings'))}>Settings</Item>
            </Command.Group>
            <Command.Group heading="Issues" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              {issues.slice(0, 12).map((i) => (
                <Item key={i.key} icon={CircleDot} value={`${i.key} ${i.title}`} onSelect={run(() => go(`#/issues/${i.key}`))}>
                  <span className="inline-flex items-center gap-2"><StatusDot status={i.status} /><span className="w-14 text-xs tabular-nums text-muted-foreground">{i.key}</span>{i.title}</span>
                </Item>
              ))}
            </Command.Group>
          </Command.List>
          <div className="flex h-9 items-center gap-3 border-t px-3 text-xs text-muted-foreground">
            <span><kbd className="font-sans">↑↓</kbd> to move</span><span><kbd className="font-sans">↵</kbd> to open</span><span className="ml-auto"><kbd className="font-sans">esc</kbd> to close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
