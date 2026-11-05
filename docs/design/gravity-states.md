# Gravity, state by state (onboarding layer 4)

Gravity is the page's centrepiece, chosen 2026-11-03 (docs/design/onboarding.md, "The page"). Layer 4 takes it
through every state on crafting-ui's real numbers before the Specimen is built below it. Audited 2026-11-05 on
overlay/demo/project.html, day and night, 1280px and 390px.

## Problems found

1. **A tap never pulled a step.** A click acted on whatever the last pointer move had pointed at. A tap has no move
   before it, so on a phone nothing happened, and a mouse click on a step right after pointing at a cluster did
   nothing either.
2. **A click left a step lit.** Clicking the plot focuses it, and focus picked the busiest step (sm) and kept it
   pointed at after the mouse had gone, with every other place faded.
3. **The hint always said "Click".** With the keyboard it should say Enter; on a phone, Tap.
4. **The empty plot kept its key.** "No scale to draw yet" and "Every text size uses your scale" still showed the
   legend, the "Each dot…" line and a 320px blank plot.
5. **Step names collided on a phone.** At 390px, 2xs, xs, sm, md and lg sit within 90px and their names overlapped.
6. **The top bar wrapped on a phone.** "React Plumber" and "417 files read" broke onto two lines.
7. The explainer said "Each dot" while the places are now three shapes.

## What changed

1. Clicks and taps hit-test where they land (one `point()` for moving, clicking and tapping).
2. A step takes focus only from the keyboard (`:focus-visible`); a mouse click focuses the plot without lighting one.
3. The hint follows the input: Click, Tap, or Enter.
4. An empty plot is 160px with its message, and no key or explainer.
5. A name that would touch a busier step's name is hidden at rest and shows while that step is pointed at.
6. Below 720px the top bar keeps the name on one line and drops the file count.
7. "Each mark is a place…".

## Checked

| State | Result |
| --- | --- |
| Arrival | steps fade in 40ms apart, places fall when the plot is first on screen |
| Point a step | its value pill, its places forward, readout with the hint |
| Point a cluster | readout with how it's written and the nearest step, dashed guide to it |
| Click a step | pulls its places in as mint discs, count rolls (sm: 131, md: 135) |
| Tap a step | the same, hint says Tap |
| Snap all, Let go | 621, then back to 45 |
| Keyboard | Tab to the plot, arrows walk steps, Enter pulls, hint says Enter |
| Mouse focus | no step lit after the mouse leaves |
| Empty: no scale, nothing by hand | short plot, message only |
| 390px | names don't overlap, top bar on one line |
| Night | unchanged from layer 3 |

Not checked in the browser: reduced motion (the pane can't emulate it). Its path is code-only: places sit at their
spots, pulling moves them at once, and the stagger and arrival tokens are 0.
