# One bar: Blueprint's first surface

Owner, 2026-11-04, on the first thing Blueprint shows: "the first pop up is broken… where we show what to press";
"overall it looks very bad". Confirmed: it wraps and the keys float, there are too many pieces, and the hint says the
wrong things. Direction chosen: **one bar, each key on the action it presses**. This un-parks the one-surface plan of
2026-10-29 (memory: one-surface-overlay-parked): never more than one surface; the dock becomes the Blueprint bar.

## Problems, as seen on crafting-ui `/sloppy/issues` (1440×900)

1. **Three surfaces at once.** The fix panel (`.fx`, fixpanel.js), the hint pill (`.bp-hint`, blueprint-marks.js) and
   the dock (`.dock`, widget.js) each place themselves; they sit side by side at the bottom edge and don't line up.
2. **Nothing fits.** "54 problems · 19 fixes · 6 notes · 1 element can't be checked" wraps to two lines, "Clean up this
   page" wraps to two lines, its key `c` floats loose to the right of the label, `Fix ↵` is the only one that holds.
3. **The hint tells another flow.** "Click anything to fix it · ← → next fix · hold Space to use the page · Got it"
   explains clicking and arrows while the buttons beside it want C and Enter.
4. **Too many words at rest.** Four counts in one sentence; "Checking this page…" fills a card wider than the content.

## The primitive first: a key on its action

The design system's Action (`.pl-act`, language.js) has no way to show its key. Added, as part of Action:

- `<kbd>` inside a `.pl-act`, after the label: **one key**, the one this action answers to (`C`, `↵`, `Esc`).
- Cap: height 18px, min-width 18px, padding 0 5px, radius `--pl-radius-mark` + 2 (4px), font 600 11px/18px
  `--pl-mono`, centred.
- Colour follows the action: on the pink action, the key cap is `--pl-pink-ink` at 12% fill with the ink at 70%; on a
  quiet action, `--pl-paper-2` fill, `--pl-rule` hairline, `--pl-ink-3` text. Never a second colour family.
- Gap 8px from the label (the action's own gap is 6px; the key reads as a suffix, not a second word).
- Never wraps: the action is `white-space: nowrap` already; the bar decides what to drop before an action breaks.
- Hidden on touch (`pointer: coarse`): there is no key to press.
- `aria-keyshortcuts` on the button carries the same key for assistive tech; the cap is `aria-hidden`.

## The component: the bar

One card at the bottom centre (Card recipe: `--pl-paper`, `--pl-radius-card`, `--pl-shadow-card`), one line, 48px
tall, `width: min(720px, 100vw - 32px)`. Anatomy, left to right:

| Part | Content | Rule |
| --- | --- | --- |
| Status | a 8px dot in the verdict colour (coral: problems; mint: clean) and **one count**: "54 problems" | The other counts (fixes, notes, can't check) move into the readout on hover/focus of the count; never in the line |
| Actions | quiet **Clean up page** `C` · pink **Fix** `↵` | Labels never wrap; under 560px the quiet label shortens to "Clean up" |
| Tools | the dock's tools as icon buttons: history, help, grid, inspect | Same buttons, same order as today's dock; 32px targets, tooltips name them |
| Close | `Esc` as a key cap with the word "Close" on hover | Replaces "Alt+B to close" |

The hint pill is retired. What it said moves where it's true: "Click anything to fix it" becomes the help button's first
line and the empty-state line; arrows and Space are shown by the surfaces that use them (the fix card shows `← →`;
the clean-up preview already shows "Hold Space to compare").

## Every state

| State | The bar shows | Motion |
| --- | --- | --- |
| **Off** | Nothing on the page (today's dock at rest stays as it is: un-parking "nothing until Alt" is a later step) | — |
| **Opening** (Alt+B) | The dock pill grows into the bar: width, height and radius on `--pl-spring-pop`, 260ms; the dock's tools stay where they are and slide to the bar's right end | One surface morphing, never a second one appearing |
| **Checking** | "Checking this page…" in `--pl-ink-3`, actions present but disabled, a 2px progress hairline along the bar's bottom edge | Content crossfades in 120ms (`--pl-dur-feedback`) |
| **Ready** | dot + "54 problems" · Clean up page `C` · Fix `↵` · tools · Close `Esc` | Counts roll in (the show's odometer) |
| **Clean** | mint dot + "Nothing to fix here" · Clean up page `C` · tools · Close | — |
| **Count pointed at** | a readout above the count: "19 fixes · 6 notes · 1 element can't be checked" | `pl-pop` |
| **Setup notice** | a quiet line inside the bar's start: "2 setup steps left" with Review; never a separate toast | — |
| **A cause in hand** (Fix) | the bar grows upward into the fix card (today's `.fx` content), same surface | height on `--pl-spring-pop` |
| **Clean-up running** | the bar grows upward into the clean-up card; while previewing it shrinks back to one line: chips · Hold `Space` to compare · Cancel `Esc` · Apply `↵` | same |
| **Writing / error** | the line says it ("Saving 15 changes…" / the error and Retry) | — |
| **Closing** (Esc / Alt+B) | the reverse of opening: the bar shrinks into the dock | 180ms, ease-out (exits quicker than entries) |

Reduced motion: every duration is zero (the design system's rule); states change in place.

## Accessibility

`role="toolbar"`, `aria-label="Blueprint"`, arrow keys move between its buttons (roving tabindex), each action carries
`aria-keyshortcuts`; the count is a button that opens its readout; contrast: the key caps' text meets 4.5:1 on their fill.

## What is retired

- `.bp-hint` (the "Click anything to fix it…" pill) and its "Got it".
- The dock as a separate surface while Blueprint is on (its tools live in the bar).
- The readiness toast while Blueprint is on (it's the bar's setup notice).

## Proof

A prototype (`docs/design/prototypes/one-bar.html`) built from the real `tokens.css` and Action CSS shows every state
above at 1440 and 375 wide, light and dark, for the owner's review before any overlay code changes. Then: the key cap
lands in language.js, the bar in fixpanel.js/widget.js, the hint and the separate dock are removed, and an e2e test
proves one surface, no wrapping at 1440 and 375, and every key working.

## Decided (owner, 2026-11-04, while building)

"Initially I don't like why do we showcase so many icons, it just looks ugly": the same system as the pop-up, every
tool showing itself all the time. Replaced by one rule for the dock and the bar: **tools stay out of sight until asked
for, then appear in place** (no popover).

- **At rest**: the Plumber mark alone. Hover or focus it and its tools (history, help, Blueprint, inspect) slide out
  beside it; they fold back when the pointer leaves, unless one of them is open.
- **In the bar**: count · Clean up `C` · Fix `↵` · `···` · Close `Esc`. `···` reveals history, help and inspect inline
  in the bar (the bar grows by their width); pressing it again, or Esc, folds them away.
