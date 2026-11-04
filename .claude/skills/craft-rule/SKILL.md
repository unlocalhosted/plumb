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

## 3½. The screen it lives on (overlay/showcase/src/principles)

- **One principle, one example, one screen** (`/rule/N`). Never a page carrying many problems: nobody can judge 50 at
  once. The list of 77 sits at the left; the board (warm grey, faint dot grid) is the page; the example floats on it
  in a window.
- **Broken ↔ Fixed is a switch in place**, never a reload. Fixed is plumber's own fix taken with plumber's own
  primitives (`inplace.js` `swapPreview` and its `GLIDE`), and Broken gives it back exactly. The change must be
  watchable: what can move glides; what moves a pixel gets the loupe.
- **Everything is plumber's.** Detection is `window.__plumb.craft({ scope: '[data-example]', hidden: true })`: scoped to
  the example (the frame never pollutes it), hidden so asking doesn't flash the overlay. The fix is its `suggest`.
  Nothing on the screen states a finding plumber didn't make.
- **Quiet annotation, like the reference video.** Guides are thin dashed lines in a softened colour, on the subject
  only, never solid and never on something else (a time stamp beside the icon). The one bold thing is the measured
  pill, a tab on plumber's card. The leader leaves from the window's edge. On Fixed the rest of the example fades
  back and red turns blue with a check.
- **Rich, soothing, tasteful.** The example and the page around it get the same care: real content, calm colour,
  soft depth, generous space, the type hierarchy a good product has.

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
