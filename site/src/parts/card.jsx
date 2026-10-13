// The story's component: a ProfileCard someone shipped. It renders from a set of values so the same card can be
// shown as designed, as shipped, or halfway through being fixed. The drifted values are data, not classes, so
// the site's own source stays on its design system.
import { forwardRef } from 'react';

// The five places this card left the system, in the order the story fixes them.
export const drifts = [
  {
    id: 'radius',
    fix: 'rounded-md',
    part: 'card',
    family: 'radius',
    prop: 'border-radius',
    line: 8,
    wrote: 'rounded-[5px]',
    shipped: '5px',
    verdict: 'off',
    options: [
      { cls: 'rounded-md', value: '4px' },
      { cls: 'rounded-lg', value: '6px' },
    ],
  },
  {
    id: 'shadow',
    fix: 'shadow-lift',
    part: 'card',
    family: 'elevation',
    prop: 'box-shadow',
    line: 8,
    wrote: 'shadow-[0_2px_8px_rgb(0_0_0/.12)]',
    shipped: '0 2px 8px rgb(0 0 0 / 0.12)',
    verdict: 'off',
    options: [{ cls: 'shadow-lift', value: 'var(--shadow-lift)' }],
  },
  {
    id: 'gap',
    fix: 'gap-3',
    part: 'header',
    family: 'spacing',
    prop: 'gap',
    line: 9,
    wrote: 'gap-[10px]',
    shipped: '10px',
    verdict: 'off',
    options: [
      { cls: 'gap-2', value: '8px' },
      { cls: 'gap-3', value: '12px' },
    ],
  },
  {
    id: 'badge',
    fix: 'bg-primary',
    part: 'badge',
    family: 'colour',
    prop: 'background-color',
    line: 13,
    wrote: 'bg-[#2b4fe6]',
    shipped: '#2b4fe6',
    verdict: 'near',
    options: [{ cls: 'bg-primary', value: 'var(--primary)' }],
  },
  {
    id: 'pad',
    fix: 'px-3',
    part: 'button',
    family: 'spacing',
    prop: 'padding-inline',
    line: 17,
    wrote: 'px-[14px]',
    shipped: '14px',
    verdict: 'off',
    options: [
      { cls: 'px-3', value: '12px' },
      { cls: 'px-4', value: '16px' },
    ],
  },
];

export const designed = { radius: '4px', shadow: 'var(--shadow-lift)', gap: '12px', badge: 'var(--primary)', pad: '12px' };
export const shipped = Object.fromEntries(drifts.map((d) => [d.id, d.shipped]));

// Which part of the card each JSX line draws, and the classes on it that were on the system all along.
export const parts = {
  card: { name: 'ProfileCard', tag: 'article', line: 8, keep: 'flex flex-col gap-4 bg-card p-6' },
  header: { name: 'header', tag: 'header', line: 9, keep: 'flex items-center' },
  badge: { name: 'Badge', tag: 'span', line: 13, keep: 'rounded-sm px-1.5 text-xs font-semibold text-primary-foreground' },
  button: { name: 'button', tag: 'button', line: 17, keep: 'h-8 rounded-sm bg-primary text-xs font-semibold text-primary-foreground' },
};

export const ProfileCard = forwardRef(function ProfileCard({ v, onPick, picked, instant = false, className = '' }, ref) {
  // mark(part) returns props that let a figure point at a part: data attributes, handlers, focus.
  const m = (part) => (onPick ? { 'data-part': part, tabIndex: 0, onClick: (e) => (e.stopPropagation(), onPick(part)), onFocus: () => onPick(part), 'aria-pressed': picked === part } : { 'data-part': part });
  // scrubbed by scroll: no easing of its own, or it lags the hand
  const ease = instant ? 'none' : 'all var(--dur-explode) var(--ease-spring)';
  return (
    <article
      ref={ref}
      {...m('card')}
      className={`flex w-full max-w-sm flex-col gap-4 bg-card p-6 outline-none ${className}`}
      style={{ borderRadius: v.radius, boxShadow: v.shadow, transition: ease }}
    >
      <header {...m('header')} className="flex items-center outline-none" style={{ gap: v.gap, transition: ease }}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tint-2 font-mono text-sm text-primary">AL</span>
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2 text-base font-medium">
            Ada Lovelace
            <span {...m('badge')} className="rounded-sm px-1.5 text-xs font-semibold text-primary-foreground outline-none" style={{ background: v.badge, transition: ease }}>
              Pro
            </span>
          </span>
          <span className="text-sm text-muted-foreground">Analyst, Engine No. 1</span>
        </div>
      </header>
      <p className="text-sm text-muted-foreground">Writes the notes that turn a machine for numbers into a machine for anything.</p>
      <div className="flex items-center gap-2">
        <span {...m('button')} role={onPick ? 'button' : undefined} className="inline-flex h-8 items-center rounded-sm bg-primary text-xs font-semibold text-primary-foreground outline-none" style={{ paddingInline: v.pad, transition: ease }}>
          Message
        </span>
        <span className="inline-flex h-8 items-center rounded-sm border border-border px-3 text-xs font-semibold text-muted-foreground">Follow</span>
      </div>
    </article>
  );
});
