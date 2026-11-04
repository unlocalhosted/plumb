---
name: craft-rule
description: Use when creating, changing or demonstrating a React Plumber craft rule (overlay/src/craft-rules.js, craft-headless.js) or its example in the showcase (overlay/showcase). Covers how to pick the case a rule must catch, how to build an example that shows it honestly, how to make plumber's fix one you can take, and how to prove both. Use it before writing a rule, a rule's suggestion, or a showcase example.
---

# Creating a craft rule, and showing it

A craft rule exists to catch a mistake people really make. Its showcase example (overlay/showcase, one principle per
screen, `/rule/N`) exists to show that mistake, plumber finding it, and plumber's own fix. Both fail the same way: by
being built to fit each other instead of the real world. These rules come from that failing, more than once.

## 1. Start from the mistake people make, not from the rule

Before writing a check or an example, write one sentence: *how does this go wrong in a shipped product, and why did
the person who shipped it think it was fine?* If you can't name the natural cause, you don't know the rule yet.

- Overshoot (#3): people draw every logo in one box at one size; the circles then read smaller. Not "a circle 1px
  smaller than a square" (nobody does that).
- Content alignment (#1): two or three sections down a page line up by their boxes, so a filled panel's words sit in
  by its padding. Not "one nav row padded and the others not" (no sidebar ships that).
- Trim leading (#5): a banner or button built with `text-sm/6 py-2` (Tailwind UI's own default), whose line height
  makes the padding look larger. Not an oversized chip.

## 2. Never bend the example to fit the rule

If the natural case doesn't trigger the rule (it falls in a grey band, misses a condition, needs a size nobody uses),
**the rule is wrong, not the example. Fix the rule.** Shrinking a circle, padding one row, picking odd numbers so a
check fires is forging evidence: the showcase then proves a rule that misses the real mistake.

Examples: overshoot treated "same size" as grey, so the real case went unmarked; the fix was to make it a sure finding.
Content alignment's fix had no `sets`, so it could not be previewed; the fix was in the rule.

## 3. The example is real software, built well everywhere else

- A convincing piece of a product (a billing page, an integrations panel, an invoice table), with real content, real
  hierarchy and real detail. Not a fixture: no coloured squares standing in for logos, no empty boxes.
- It is wrong in **one** way, its principle's. Everything else follows good UI: type hierarchy (a chip's text is
  smaller than the label beside it), tap targets ≥24px, padding trimmed on top, tabular figures in columns, contrast.
  Prove it: plumber scoped to the example (`window.__plumb.craft({ scope: '[data-example]' })`) finds exactly one
  rule. A second finding means the example is broken in another way; fix the example, not the second rule.
- The harm must be visible to the eye. Give the example a `measure` that draws where the eye sees the problem
  (dashed guides, a measured pill: "commas drift 9.4px"), and for sub-pixel fixes a loupe. If you can't see the
  difference between broken and fixed, the example hasn't shown anything.

## 3½. The stage: a staged moment, not an illustrated explanation (overlay/showcase/src/principles)

The benchmark is ~/Downloads/twitter_media_harvest/maybepratikk-2117890135945822554-01.mp4 (an analytics table whose
numbers tick live; a "Proportional / Tabular" switch; on switching the camera zooms into the columns, stripes drawn
from the glyphs and pink pills with the drift turn to blue checks, then it zooms out). Watch it before building a
screen. Ours used to be a teaching page with a still picture in it; that system is retired.

- **One principle, one screen** (`/rule/N`), the list of 77 on the left. Never a page carrying many problems.
- **The stage is one dense, real component**, alone on the board: no app frame, no title block on the stage, no side
  card. Richness comes from the content: real photos, a real brand, tags, deltas, metadata, density. Not chrome.
- **The flaw happens live.** Every example has a driver that provokes its own mistake while you watch: numbers that
  tick (tabular figures), text typing in (balance, widows), a width that breathes (fit, clamp), a hover that travels.
  If the mistake only shows in a still frame, find the moment when it hurts and stage that.
- **The switch names the technique, never "Broken / Fixed"**: "Proportional / Tabular", "Line box / Trimmed",
  "Same radius / Concentric". It sits under the component, small, a segmented control. Default is the mistake; the
  other side is plumber's own fix (`suggest`, taken with `inplace.js` `swapPreview`), and back gives it back exactly.
- **plumber's read is a camera moment.** On switching: the camera eases in to the subject, plumber's measurements
  are drawn from the geometry itself (glyph columns, edges, curves) with the measured number in red pills; the fix
  glides in and the pills turn to blue checks; the camera eases back out and the stage is clean. Nothing is drawn at
  rest. Detection is still `window.__plumb.craft({ scope: '[data-example]', hidden: true })`; nothing on the screen
  states a finding plumber didn't make.
- **Motion is authored before it's built, and judged moving.** Measure the benchmark frame by frame (`ffmpeg -vf
  fps=10,tile=6x5`): every duration, the order, the zoom depth, when marks appear, how colour changes. Write the
  storyboard (interface-craft: named TIMING, one stage integer, springs in config) and the look in
  docs/craft/stage-brief.md, and get the owner's sign-off before code. Judge it by recording ours and comparing it
  side by side with the benchmark, never from stills (a hidden pane freezes transitions). The world freezes for the
  moment: settle, camera in, marks, hold, fix (pills count to zero, red → blue), hold, marks out, camera out, then
  life resumes.
- **Teaching sits off the stage**, below it, read after watching: what plumber sees, why it happens, the habit,
  plumber's fix in words (§5).
- **Fit every width.** Lay out against the stage (container queries); check 1440, 1024 and a ~300px pane.

## 4. plumber's fix is one you can take

`suggest` is `{ kind: 'class', from, to, why, sets }`, not advice text, whenever a class can say it:

- `sets`: the style values the class stands for (numbers are pixels), so a preview shows it even where Tailwind hasn't
  generated the class.
- `target`: when the change belongs to a child (an icon inside a control), put the class on the element with an
  arbitrary variant (`[&>svg]:translate-x-px`) and name the child (`':scope > svg'`).
- `moves: true`: when the fix reflows layout (a bleed's negative margin). The verdict's trial can't reflow its virtual
  page, so such a fix, and a `target` one, is left untried there instead of withdrawn, and proved by asking again.
- Size the fix from what was measured (overshoot's scale is computed, not a fixed 6%). A fix that doesn't satisfy
  its own rule when applied is a bug.
- `why` reads as the fix in words ("pull the panel out by its 16px padding"); the showcase leads with it.
- **The fix expresses the principle, not the threshold.** A fix that only lands on the line the check draws teaches
  the wrong thing: inner-outer once fixed 12px-inside-8px-between to 8px and 8px, which passes the rule and leaves
  each label floating halfway between two inputs. Aim where the principle points (inside clearly tighter: half the
  outer gap), and keep the ceiling just under the line.
- **Its words never do false arithmetic.** When the nearest step differs from the exact answer, say so ("4px, your
  nearest step to 12px minus 9px (3px)"), not "4px: 12px minus 9px". And the example's lesson counts what the rule
  counts (the 1px border is part of the distance between the curves).

## 5. Teach, don't just diff

The card is a lesson: **what plumber sees** (its finding, with the number), **why it happens** (the mechanism, one or
two sentences), **the habit** to carry to the next screen, then **plumber's fix** in words with the class small under
it. Write `Example.lesson = { why, habit }` for every example; a card that only shows the final CSS teaches nothing.

## 6. Review the screenshots yourself before showing anyone

Numbers passing (one finding, nothing after the fix, tests green) is not a review. Look at every screen, Broken and
Fixed, at a wide window and in a narrow pane, and check:

- nothing clipped, overflowing, or wrapping where it shouldn't (a price unit under its price, a banner cut at the top);
- annotations sit on the subject and never on the example's words: guides are quiet dashed hairlines on the thing;
  the measured pill is a tab on plumber's card; the leader leaves from the window's edge, never across content;
- the broken version is visibly broken and the fixed version visibly better (if the fix looks worse, the example or
  the rule is wrong: see §1–2);
- the example obeys good UI everywhere else (hierarchy, sizes, consistency: one brand, one logo shape).

The browser pane may be hidden, which pauses transitions: inject `*{transition:none!important;animation:none!important}`
for the screenshot pass so end states are true, and say what motion you did not watch.

## 7. Prove it

1. In the showcase: Broken → plumber finds exactly this rule; Fixed by plumber → its fix applied, and plumber asked
   again finds nothing. Check both directions, at a wide window and in a narrow pane.
2. In e2e (feature slices only, never unit tests): the bad case is marked, the good case is not, nothing else on the
   page is marked, and the test fails when the rule is broken (break it once to see).
3. Run the noise test (`e2e/craft.test.mjs`, a well-built page yields no finding) whenever a rule gets stricter.
4. New showcase files are invisible to the overlay until the dev server restarts (a known bug): restart after adding
   one.

## Feedback this skill came from (add to it every time)

Each line is something the owner had to say once; the sections above exist so they never have to say it again.

- 2026-11-04 · "nobody ships UI like this": a sidebar where one row is padded and the others aren't. → §1, §2.
- 2026-11-04 · "why would someone create a 21px square and a 20px circle?": an example bent to fit a rule. → §1, §2.
- 2026-11-04 · "a pill font larger than the label beside it": an example breaking hierarchy to show another rule. → §3.
- 2026-11-04 · "wtf are these": coloured squares for logos, an empty gradient for a video. → §3.
- 2026-11-04 · "I can't judge 50 problems at once": one workspace carrying every mistake. → §3½.
- 2026-11-04 · "flickering, reloading, I can't see the transition": Broken and Fixed as two routes. → §3½.
- 2026-11-04 · "the solid lines are too attention seeking"; "why highlight the time when I'm looking at the icon". → §3½.
- 2026-11-04 · "the fixes are just the final CSS, they aren't teaching anything". → §5.
- 2026-11-04 · "5 and 6 are totally broken, do a post-review step before coming to me". → §6.
- 2026-11-04 · "I don't see any difference between broken and fixed" (a 1.5px nudge). → §3 (loupe), §6.
- 2026-11-04 · "this example doesn't look classy and tasteful" (three bordered pricing boxes). → §3½ restraint, width.
- 2026-11-04 · "neither 5, 4, 3 … being rich and real is what sells the illusion": components alone in a window. → §3½
  product screen.
- 2026-11-04 · (own review) at a 1024px pane the window and the card overflowed sideways. → §3½ fit every width.
- 2026-11-04 · (own review) #7's fix equalised inner and outer; #8's card said "4px: 12px minus 9px" and its lesson
  said 8px where plumber measured 9px. → §4 the fix expresses the principle; no false arithmetic.
- 2026-11-04 · "look how bad our examples are and how good they can be" (the maybepratikk table video): a teaching
  page with a still example. → §3½ rewritten: one dense live component, a switch naming the technique, a camera
  moment for plumber's read, the teaching below the stage. Supersedes "a product screen inside AppFrame".
- 2026-11-04 · "the motion of the ui is so ass, the look and feel just feels awful": motion improvised with scattered
  sleeps and judged from three stills. → §3½ motion authored first (measured benchmark, storyboard, sign-off),
  judged moving.
