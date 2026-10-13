// The page's motion grammar, in one place (site/HOMEPAGE.md §3.4). A visitor's own actions move on these springs;
// scroll starts each section's intro once; only the CI conveyor follows the scroll.

export const SPRING = {
  snap: { type: 'spring', stiffness: 500, damping: 30 }, // a token snapping into place: the satisfying click
  detent: { type: 'spring', stiffness: 600, damping: 35 }, // the magnet pulling a value onto a step
  settle: { type: 'spring', stiffness: 300, damping: 30 }, // a part arriving where it belongs
  pop: { type: 'spring', stiffness: 500, damping: 22 }, // stickers, checks, verdicts appearing
  turn: { type: 'spring', stiffness: 260, damping: 21 }, // the wrench turning a nut: weight, one small overshoot
};

export const STAGGER = 0.04; // seconds between parts that move together
