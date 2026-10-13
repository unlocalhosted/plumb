// The hero's card, drifted on purpose. Every value marked below is off this page's design system in its real
// source, so Plumb's overlay finds it, reads it and offers the fix. Visitors fix it themselves; on the deployed
// site the overlay's writes apply to the live page only (see site/REPLAY.md). Each drift is recorded in the ledger.
//
// The six drifts, and the fixes Plumb's overlay really offers for them (checked against the running overlay):
//   card     rounded-[10px]  → rounded-lg                 radius
//   card     p-[21px]        → p-5 or p-6                 spacing
//   header   gap-[13px]      → gap-3 or gap-4             spacing
//   name     text-[15px]     → text-sm or text-base       type
//   button   px-[15px]       → px-3 or px-4               spacing
//   button   rounded-[3px]   → rounded-sm or rounded-md   radius
// Colour and shadow drift are left out: the overlay can't write those yet, so the card could never be finished.
export const HERO_DRIFTS = [
  { id: 'radius', part: 'card', bad: 'rounded-[10px]', fix: 'rounded-lg', family: 'radius' },
  { id: 'pad', part: 'card', bad: 'p-[21px]', fix: 'p-5 · p-6', family: 'spacing' },
  { id: 'gap', part: 'header', bad: 'gap-[13px]', fix: 'gap-3 · gap-4', family: 'spacing' },
  { id: 'type', part: 'name', bad: 'text-[15px]', fix: 'text-sm · text-base', family: 'type' },
  { id: 'button', part: 'button', bad: 'px-[15px]', fix: 'px-3 · px-4', family: 'spacing' },
  { id: 'corner', part: 'button', bad: 'rounded-[3px]', fix: 'rounded-sm · rounded-md', family: 'radius' },
];

export function DriftedCard() {
  return (
    <article data-drift="card" className="flex w-full flex-col gap-4 rounded-[10px] bg-card p-[21px] shadow-lift">
      <header data-drift="header" className="flex items-center gap-[13px]">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-tint-2 font-mono text-sm text-primary">AL</span>
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2">
            <span data-drift="name" className="text-[15px] font-medium">
              Ada Lovelace
            </span>
            <span data-drift="badge" className="rounded-sm bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              Pro
            </span>
          </span>
          <span className="text-sm text-muted-foreground">Analyst, Engine No. 1</span>
        </div>
      </header>
      <p className="text-sm text-muted-foreground">Writes the notes that turn a machine for numbers into a machine for anything.</p>
      <div className="flex items-center gap-2">
        <button data-drift="button" type="button" className="inline-flex h-8 items-center rounded-[3px] bg-primary px-[15px] text-xs font-semibold text-primary-foreground">
          Message
        </button>
        <button type="button" className="inline-flex h-8 items-center rounded-sm border border-border px-3 text-xs font-semibold text-muted-foreground">
          Follow
        </button>
      </div>
    </article>
  );
}
