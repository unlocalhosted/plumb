import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Each person's colour comes from their record, so it's computed at runtime (React Plumber can't judge it).
export function PersonAvatar({ person, className }) {
  return (
    <Avatar className={className} title={person.name}>
      <AvatarFallback className="text-[10px] font-semibold text-white" style={{ background: `oklch(0.62 0.12 ${person.hue})` }}>
        {person.initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function AvatarStack({ people, max = 4, className }) {
  const shown = people.slice(0, max), rest = people.length - shown.length;
  return (
    <div className={cn('flex -space-x-1.5', className)}>
      {shown.map((p) => <PersonAvatar key={p.id} person={p} className="ring-2 ring-[#fff]" />)}
      {rest > 0 && <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground ring-2 ring-[#fff]">+{rest}</span>}
    </div>
  );
}
