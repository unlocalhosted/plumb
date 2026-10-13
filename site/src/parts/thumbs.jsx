// Nine small components from the same imaginary product. Every one spaces its parts with the same decision,
// read from --demo-gap, so a single dial on sheet 5 really redraws them all. Each records how it spelled the gap.
const gap = { gap: 'var(--demo-gap)', transition: 'gap var(--dur-move) var(--ease-spring)' };
const bar = (w, tone = 'bg-tint-3') => <span className={`block h-1.5 rounded-full ${tone}`} style={{ width: w }} />;
const face = 'rounded-md bg-card p-3 shadow-plate';

export const THUMBS = [
  {
    name: 'SettingsRow',
    site: 'SettingsRow.jsx:14',
    wrote: 'className="gap-[10px]"',
    draw: () => (
      <div className={`${face} flex items-center justify-between`} style={gap}>
        <span className="flex flex-col" style={gap}>
          {bar(64, 'bg-foreground/70')}
          {bar(92)}
        </span>
        <span className="flex h-4 w-7 items-center justify-end rounded-full bg-primary px-0.5">
          <span className="size-3 rounded-full bg-card" />
        </span>
      </div>
    ),
  },
  {
    name: 'Toolbar',
    site: 'Toolbar.jsx:22',
    wrote: 'style={{ gap: 10 }}',
    copy: 'imitation',
    copyNote: '<div role="button"> rebuilds Button',
    draw: () => (
      <div className={`${face} flex items-center`} style={gap}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-6 rounded-sm border border-border bg-background" />
        ))}
        <span className="ml-auto h-6 w-12 rounded-sm bg-primary" />
      </div>
    ),
  },
  {
    name: 'Toast',
    site: 'toast.css:8',
    wrote: '.toast { gap: 10px }',
    draw: () => (
      <div className={`${face} flex items-center`} style={gap}>
        <span className="size-5 shrink-0 rounded-full bg-tint-2" />
        <span className="flex flex-1 flex-col" style={gap}>
          {bar('80%', 'bg-foreground/70')}
          {bar('55%')}
        </span>
        <span className="font-mono text-xs text-primary">UNDO</span>
      </div>
    ),
  },
  {
    name: 'PricingTier',
    site: 'PricingTier.jsx:31',
    wrote: 'className="gap-[10px]"',
    draw: () => (
      <div className={`${face} flex flex-col`} style={gap}>
        {bar(48, 'bg-foreground/70')}
        <span className="font-mono text-sm text-foreground">$12</span>
        {bar('90%')}
        {bar('70%')}
      </div>
    ),
  },
  {
    name: 'ProfileCard',
    site: 'ProfileCard.jsx:9',
    wrote: 'gap-3, fixed on sheet 4',
    hero: true,
    draw: () => (
      <div className={`${face} flex flex-col`} style={gap}>
        <span className="flex items-center" style={gap}>
          <span className="size-6 shrink-0 rounded-full bg-tint-2" />
          <span className="flex flex-col gap-1">
            {bar(70, 'bg-foreground/70')}
            {bar(50)}
          </span>
        </span>
        <span className="flex" style={gap}>
          <span className="h-4 w-12 rounded-sm bg-primary" />
          <span className="h-4 w-10 rounded-sm border border-border" />
        </span>
      </div>
    ),
  },
  {
    name: 'Nav',
    site: 'Nav.jsx:6',
    wrote: 'style={{ gap: 10 }}',
    draw: () => (
      <div className={`${face} flex items-center`} style={gap}>
        <span className="size-4 rounded-sm bg-primary" />
        {[40, 30, 46].map((w, i) => (
          <span key={i}>{bar(w, i === 0 ? 'bg-foreground/70' : 'bg-tint-3')}</span>
        ))}
      </div>
    ),
  },
  {
    name: 'EmptyState',
    site: 'EmptyState.jsx:17',
    wrote: 'className="gap-[10px]"',
    draw: () => (
      <div className={`${face} flex flex-col items-center`} style={gap}>
        <span className="size-5 rounded-sm border border-dashed border-primary" />
        {bar(80, 'bg-foreground/70')}
        <span className="h-4 w-14 rounded-sm bg-primary" />
      </div>
    ),
  },
  {
    name: 'AvatarStack',
    site: 'AvatarStack.jsx:4',
    wrote: '.stack { gap: 10px }',
    draw: () => (
      <div className={`${face} flex items-center`} style={gap}>
        {['bg-tint-2', 'bg-tint-3', 'bg-tint-4', 'bg-tint-2'].map((t, i) => (
          <span key={i} className={`size-6 rounded-full ${t}`} />
        ))}
      </div>
    ),
  },
  {
    name: 'Modal',
    site: 'Modal.jsx:31',
    wrote: 'className="gap-[10px]"',
    copy: 'ownership',
    copyNote: '<Button className="bg-red-500">',
    draw: () => (
      <div className={`${face} flex flex-col`} style={gap}>
        {bar(70, 'bg-foreground/70')}
        {bar('85%')}
        <span className="flex justify-end" style={gap}>
          <span className="h-4 w-10 rounded-sm border border-border" />
          <span className="h-4 w-12 rounded-sm bg-destructive" />
        </span>
      </div>
    ),
  },
];
