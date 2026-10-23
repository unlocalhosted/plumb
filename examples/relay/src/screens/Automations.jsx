// The automation builder: a workflow drawn on a canvas. Node positions, sizes and type colours come from the
// automation's data, so they're computed at runtime: the "set in code, can't be fixed here" case for React Plumber.
import { useState } from 'react';
import { Bell, Bot, GitBranch, MessageSquare, Plus, SignalHigh, UserPlus, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const automations = [
  { id: 'triage', name: 'Triage urgent bugs', runs: 128, on: true },
  { id: 'review', name: 'Ping reviewers after 24h', runs: 54, on: true },
  { id: 'release', name: 'Close issues on release', runs: 9, on: false },
  { id: 'weekly', name: 'Weekly digest to #web', runs: 31, on: true },
];

// Each node type has a colour of its own, read from this map at runtime.
const kinds = {
  trigger: { label: 'Trigger', icon: Zap, hue: 152 },
  condition: { label: 'Condition', icon: GitBranch, hue: 262 },
  action: { label: 'Action', icon: Bot, hue: 205 },
};

const nodes = [
  { id: 'n1', kind: 'trigger', title: 'Issue created', detail: 'In team Web', x: 0, y: 0, icon: Zap },
  { id: 'n2', kind: 'condition', title: 'Label is Bug and priority is Urgent', detail: 'Both must match', x: 0, y: 150, icon: GitBranch },
  { id: 'n3', kind: 'action', title: 'Assign to on-call', detail: 'Rotation: Web on-call', x: 300, y: 20, icon: UserPlus },
  { id: 'n4', kind: 'action', title: 'Post to #web-alerts', detail: 'Slack · with issue link', x: 300, y: 150, icon: MessageSquare },
  { id: 'n5', kind: 'action', title: 'Notify the reporter', detail: 'Email and in-app', x: 300, y: 280, icon: Bell },
];
const edges = [['n1', 'n2'], ['n2', 'n3'], ['n2', 'n4'], ['n2', 'n5']];
const NODE = { w: 236, h: 76 };
const CANVAS = { w: 536, h: 356 };

// A step below its source joins bottom to top; a step beside it joins side to side.
function Connector({ from, to }) {
  const below = to.y >= from.y + NODE.h && Math.abs(to.x - from.x) < NODE.w;
  const a = below ? { x: from.x + NODE.w / 2, y: from.y + NODE.h } : { x: from.x + NODE.w, y: from.y + NODE.h / 2 };
  const b = below ? { x: to.x + NODE.w / 2, y: to.y } : { x: to.x, y: to.y + NODE.h / 2 };
  const d = below
    ? `M ${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`
    : `M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`;
  return <path d={d} className="fill-none stroke-[#9aa0ac]" strokeWidth="1.5" />;
}

function Node({ node, selected, onSelect }) {
  const kind = kinds[node.kind], Icon = node.icon;
  return (
    <button type="button" onClick={() => onSelect(node.id)}
      className={cn('absolute flex flex-col gap-1.5 rounded-[14px] border bg-card px-[14px] py-3 text-left shadow-sm transition-shadow hover:shadow-lg',
        selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background')}
      style={{ left: node.x, top: node.y, width: NODE.w, minHeight: NODE.h }}>
      <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase" style={{ color: `oklch(0.55 0.13 ${kind.hue})` }}>
        <Icon className="size-3.5" />{kind.label}
      </span>
      <span className="text-sm font-medium">{node.title}</span>
      <span className="text-xs text-muted-foreground">{node.detail}</span>
    </button>
  );
}

function Inspector({ node }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 border-l bg-card p-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{kinds[node.kind].label}</span>
        <h2 className="text-base font-semibold">{node.title}</h2>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Name</span>
        <Input defaultValue={node.title} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Details</span>
        <Input defaultValue={node.detail} />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Runs when</span>
        <div className="flex flex-wrap gap-1"><Badge variant="secondary"><SignalHigh />Urgent</Badge><Badge variant="secondary">Bug</Badge><Badge variant="outline">Team Web</Badge></div>
      </div>
      <div className="mt-auto flex gap-2">
        <Button variant="outline" className="flex-1">Test run</Button>
        <Button className="flex-1">Save</Button>
      </div>
    </aside>
  );
}

export function Automations() {
  const [active, setActive] = useState('triage');
  const [selected, setSelected] = useState('n2');
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <div className="flex min-h-0 flex-1">
      <nav className="flex w-56 shrink-0 flex-col gap-1 border-r p-2" aria-label="Automations">
        <div className="flex h-8 items-center justify-between px-2 text-xs font-medium text-muted-foreground">
          Automations<Button variant="ghost" size="icon" className="size-6" aria-label="New automation"><Plus /></Button>
        </div>
        {automations.map((a) => (
          <button key={a.id} type="button" onClick={() => setActive(a.id)}
            className={cn('flex flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-accent', active === a.id && 'bg-accent')}>
            <span className="flex w-full items-center gap-2 text-sm font-medium">
              <span className={cn('size-1.5 rounded-full', a.on ? 'bg-status-done' : 'bg-status-canceled')} />{a.name}
            </span>
            <span className="pl-3.5 text-xs tabular-nums text-muted-foreground">{a.runs} runs this week</span>
          </button>
        ))}
      </nav>
      <div className="relative min-w-0 flex-1 overflow-auto bg-[radial-gradient(#d9dce3_1px,transparent_1px)] bg-size-[16px_16px]">
        <div className="relative" style={{ width: CANVAS.w, height: CANVAS.h, margin: 24 }}>
          <svg className="absolute inset-0" width={CANVAS.w} height={CANVAS.h} aria-hidden="true">
            {edges.map(([a, b]) => <Connector key={a + b} from={byId[a]} to={byId[b]} />)}
          </svg>
          {nodes.map((n) => <Node key={n.id} node={n} selected={selected === n.id} onSelect={setSelected} />)}
        </div>
      </div>
      <Inspector node={byId[selected]} />
    </div>
  );
}
