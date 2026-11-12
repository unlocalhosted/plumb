# Clean-up pass: motion (timings)

Status: decided by Claude on 2026-11-12, under the owner's standing instruction to decide like a principal design
engineer and keep going. Code: `overlay/src/speeds.js` (read and propose), `overlay/src/speeds-pass.js` (the panel).

## What goes wrong

LLM-written UI picks a duration per element: `duration-150` here, `duration-200` there, `duration-[420ms]` in a
third place, while the theme already names its speeds (`duration-fast`, `duration-base`, `duration-slow`). Nothing
breaks, but the app moves at a dozen speeds where its design system named five. On crafting-ui: five named speeds, and
about sixty places that use a raw number instead.

## The principle

A design system names a handful of durations and every transition takes one of them. Material 3 ships duration
tokens in four short, four medium and four long steps, and describes the short ones as being for "small utility-focused
transitions" (m3.material.io/styles/motion/easing-and-duration/tokens-specs). A duration is a decision of the system,
like a colour or a radius.

## The ground for "close enough to be the same speed"

People cannot tell two durations apart when they differ by less than about a fifth. The Weber fraction for time
intervals in the range of interface motion (tens of milliseconds to about a second) is reported between about 5% and
20% (Grondin, "From physical time to the first and second moments of psychological time", Psychological Bulletin
2001; Getty 1975). So a duration within 20% of a named speed is that speed written by hand: folding it changes nothing
anyone sees, and the app gains one fewer speed.

A duration further than that from every named speed is a deliberate one (a slow reveal, a demo replaying another
app's timing). It is left as it is and said, never forced onto a step.

## Signals and decision

1. **The theme's speeds.** The named duration utilities the stylesheet defines (`.duration-fast { transition-duration:
   140ms }`). A name with no digits is a step of the system; a number (`duration-150`) or a bracket
   (`duration-[420ms]`) is a size written by hand. With no named speeds there is no scale, and nothing is proposed: the
   design system leads; plumber does not invent one.
2. **The place.** Every stamped element whose class sets a duration by hand, with its computed duration.
3. **The decision.** The nearest named speed, when it is within 20% of the place's duration. Equally near two speeds:
   the faster one for a control (feedback should feel immediate: the short end of Material's scale), the slower for
   something that sits over the page (it travels further).
4. **Never moved:** `duration-0` (no motion is a decision), a duration set in a variant (`hover:`, `md:`), one set by a
   variable the app computes, one inside an excluded path.

## What it says when it does not move something

- "Your theme names no speeds": no named duration utilities.
- "Its own speed": further than 20% from every named speed.
- Two scales: when the theme also defines duration variables (`--dur-fast: 250ms`) whose names repeat a utility's
  (`duration-fast` at 140ms) at a different value, the pass says so once. That is the theme disagreeing with itself,
  and only the owner of the theme can settle it.

## Not in this pass

Easing (which curve), delays and staggers, and keyframe animations. Easing has its own craft rules (an ease-in on an
entrance); a pass for it comes after this one shows its worth.
