// One adapter per library part the generator may place in algorecall's review stack: the slot it fills, what it does,
// and how a slab's lateness, or the rest of the queue, becomes its props.
import { Badge } from '../vendor/arc/badge/badge.tsx';
import { AnimatedBadge } from '../vendor/beui/components/animated-badge.tsx';
import { ExpandableChip } from '../vendor/beui/components/expandable-control.tsx';
import { ChevronDown } from 'lucide-react';

export const ADAPTERS = {
  'arc/badge': { slot: 'status', does: 'how late each slab is, as a small pill', why: 'Lateness is the one thing that differs from slab to slab. On a pill it reads as the slab’s state rather than part of its name.',
    render: (c) => <Badge size="sm" pill tone="neutral" className="shrink-0">{c.m.long}</Badge> },
  'beui/animated-badge': { slot: 'status', does: 'how late each slab is, as a badge with a mark beside the words', why: 'A mark beside the words lets you scan the stack for what is late without reading every line.',
    render: (c) => <AnimatedBadge size="sm" status="neutral" className="shrink-0">{c.m.long}</AnimatedBadge> },
  'beui/expandable-control': { slot: 'navigation', does: 'the rest of the queue as a chip that opens to offer the whole list, instead of a dashed place', why: 'The dashed place tells you there is more and gives you nothing to do about it. A chip you can open answers the question it raises.',
    render: (c) => <li className="mt-1 flex"><ExpandableChip label={`+${c.rest} more`} actionIcon={<ChevronDown className="size-3.5" />} actionLabel="Show all" /></li> },
};
