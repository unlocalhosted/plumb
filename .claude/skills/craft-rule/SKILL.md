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

## 5. Prove it

1. In the showcase: Broken → plumber finds exactly this rule; Fixed by plumber → its fix applied, and plumber asked
   again finds nothing. Check both directions, at a wide window and in a narrow pane.
2. In e2e (feature slices only, never unit tests): the bad case is marked, the good case is not, nothing else on the
   page is marked, and the test fails when the rule is broken (break it once to see).
3. Run the noise test (`e2e/craft.test.mjs`, a well-built page yields no finding) whenever a rule gets stricter.
4. New showcase files are invisible to the overlay until the dev server restarts (a known bug): restart after adding
   one.
