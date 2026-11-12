---
name: craft-rule
description: Use when creating, changing or demonstrating a React Plumber craft rule (overlay/src/craft-rules.js, craft-headless.js) or its example in the showcase (overlay/showcase). Covers how to pick the case a rule must catch, how to build an example that shows it honestly, how to make plumber's fix one you can take, and how to prove both. Use it before writing a rule, a rule's suggestion, or a showcase example.
---

# Creating a craft rule, and showing it

A craft rule exists to catch a mistake people really make. Its showcase example (overlay/showcase, one principle per
screen, `/rule/N`) exists to show that mistake, plumber finding it, and plumber's own fix. Both fail the same way: by
being built to fit each other instead of the real world. These rules come from that failing, more than once.

## Before anything: what a craft rule is (docs/PRINCIPLES.md)

A craft rule is an experienced design engineer's eye, baked in: the 10–15 things they would say after one look at a
design ("the icons are not aligned, the content is not aligned"). It is a specialised way of seeing, not a value
snapped to a scale. Plumber is not a linter: it is suggestive and opinionated, and it judges.

So a rule starts from a way of seeing and the principle behind it, grounded in something real (code evidence, a talk,
documentation, industry practice). A count of instances is a signal at most, never the reason. A number picked while
coding because it looked sensible is not a rule. And another tool's caution (a linter that only acts on an exact
match) is not a rule for plumber.

## 0. Only insights get a screen

A principle earns a showcase screen only if it is the kind of craft knowledge people share online as an insight:
obvious once shown, missed by everyone who hasn't been shown (the safe triangle for submenus, tabular numbers,
concentric corners, overshoot). Hygiene that any reviewer would catch, or a mistake nobody really ships, gets no
screen; plumber keeps checking it. Owner, 2026-11-04, on #9 and #10: "they aren't even real mistakes"; "it's trivial,
easy to spot, people won't do it"; "the rules should be something obvious but which people miss". Never invent a
mistake to give a rule a screen.

**The craft list is a senior's tacit knowledge, not the tutorials.** A craft rule (a number in docs/craft/rules.md, a
screen in the showcase) is something a specialised design engineer tells a junior after years of doing it: a hidden
gem. A tip that hundreds of tutorials already teach (defensive CSS: `object-fit: cover`, `min-width: 0` on a flex item,
a colour behind words on a picture) is not one, however useful. It may still be a check in plumber's engine, with
`number: []`, no row in the list and no screen. Ask before numbering anything: *would a senior be surprised a junior
didn't know this, or surprised a junior did?* Only the second is a craft rule. Owner, 2026-11-12, on #78–#80: "these
are not just obvious examples regurgitated online in 100s of tutorials but like real hidden gems"; "maybe this rule
doesn't belong here". A screen that needs a staged product and a staged failure to make its point is the sign.

## 1. Start from the mistake people make, not from the rule

Before writing a check or an example, write one sentence: *how does this go wrong in a shipped product, and why did
the person who shipped it think it was fine?* If you can't name the natural cause, you don't know the rule yet.

- Overshoot (#3): people draw every logo in one box at one size; the circles then read smaller. Not "a circle 1px
  smaller than a square" (nobody does that).
- Content alignment (#1): two or three sections down a page line up by their boxes, so a filled panel's words sit in
  by its padding. Not "one nav row padded and the others not" (no sidebar ships that).
- Trim leading (#5): a banner or button built with `text-sm/6 py-2` (Tailwind UI's own default), whose line height
  makes the padding look larger. Not an oversized chip.

**The mistake's side is the one that passed review.** At rest the screen looks right: it is what a careful team
ships, and a design review would wave it through. If the broken side looks broken at a glance (a button hanging off
its card), nobody ships it and the screen teaches nothing. For a slip that only bites later (a longer name, a narrower
screen), the card rests at the width and content it was built with, the viewer's hand brings the change that breaks it
(§3½), and plumber's rule finds it at rest, before it breaks: the rule reads the cause (text set to cut off inside a
box that can't shrink), not the damage. A rule that fires only once the damage shows is a rule nobody needs.

## 2. Never bend the example to fit the rule

If the natural case doesn't trigger the rule (it falls in a grey band, misses a condition, needs a size nobody uses),
**the rule is wrong, not the example. Fix the rule.** Shrinking a circle, padding one row, picking odd numbers so a
check fires is forging evidence: the showcase then proves a rule that misses the real mistake.

Examples: overshoot treated "same size" as grey, so the real case went unmarked; the fix was to make it a sure finding.
Content alignment's fix had no `sets`, so it could not be previewed; the fix was in the rule.
When the same thing fails on several screens, it's the system, not the examples: four colour screens (#21 #23 #25 #51)
lost their finding because a craft mark on a stock class (`shadow-lg`, `bg-black`) was folded under the theme's drift
mark and the craft read dropped it. Adding theme tokens to dodge that was bending the example; the fix was the read
(verdict.js `craftUnder`). Examples use the classes people really write.
A `measure` that tells the story must be measured, not assumed: #57's first lesson ("opacity drops the contrast on a
tinted row") measured the other way round (4.1 broken, 3.7 fixed), so the lesson changed to what's true (the faded
@mention). Paint colours on a canvas to read what the browser shows; never parse `oklch()` as rgb.
Headless Chromium computes a 0.5px border as 1px even at deviceScaleFactor 2, so a device-pixel rule (#38) can't be
proved in `screen.mjs`: read it with `DPR=2`, and prove its fix in a real browser (the app's pane).
Measure the harm on real pixels before building a rendering screen. #37's rule marked half a pixel across too, but a
screenshot of the letters (the share of grey fringe pixels) showed Chrome places words across at sub-pixel precision:
only a fraction down blurs (0.44 → 0.60 at 1×). The rule changed to match what was measured.
A probe screen (#59) plays plumber's real recording (`--record-probe`, served at `/__showcase/probe/:n?side=`): the
example is two components (`Example.probe`, a `side` prop), and each side is probed for real, so the broken side
must hold exactly its principle's finding and the fixed side none, like any screen. Frames are 2× snapshots of
`[data-example]`; the stage layers them over the example and the marks over them explicitly (the example's own
menus sit at z-10). Hold on what the gesture is about to lose before it moves, and on the frame after it's lost.

## 3. The example is real software, built well everywhere else

- A convincing piece of a product (a billing page, an integrations panel, an invoice table), with real content, real
  hierarchy and real detail. Not a fixture: no coloured squares standing in for logos, no empty boxes.
- It is wrong in **one** way, its principle's, and wrong **everywhere that slip would really recur**: every row, every
  icon beside text, every number column, at least three places spread across the card. One rule, many instances, so
  Fixed visibly changes the whole card, not one pixel in one corner (owner, 2026-11-05: a single tiny slip makes the
  demo fall flat). Rules that are a pixel by nature (#2, #37, #38, #39) repeat the same way and lean on the stage's
  camera moment to zoom into one instance. Everything else follows good UI: type hierarchy (a chip's text is
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
- **Motion is earned, never required.** A screen is live only when the principle is about change: figures that tick
  (tabular figures), hover, a width that changes, loading. Every other principle gets a still, real screen where the
  mistake is the one people naturally ship. Never invent a mistake so that something can move (#1 once became a
  command menu whose highlight alone had padding: "why would any UI have extra padding"). The camera moment still
  runs on plumber's fix either way.
- **The switch names the technique, never "Broken / Fixed"**: "Proportional / Tabular", "Line box / Trimmed",
  "Same radius / Concentric". It sits under the component, small, a segmented control. Default is the mistake; the
  other side is plumber's own fix (`suggest`, taken with `inplace.js` `swapPreview`), and back gives it back exactly.
- **plumber's read is a camera moment.** On switching: the camera eases in to the subject, plumber's measurements
  are drawn from the geometry itself (glyph columns, edges, curves) with the measured number in red pills; the fix
  glides in and the pills turn to blue checks; the camera eases back out and the stage is clean. Nothing is drawn at
  rest. Detection is still `window.__plumb.craft({ scope: '[data-example]', hidden: true })`; nothing on the screen
  states a finding plumber didn't make.
- **A benchmark is a source of qualities, never a template.** Take from it what it does and why (the flaw shown
  live, a camera moment, the figures as the hero, room to breathe), then design our own component from our own
  domain: its own layout, columns, labels, data and copy. Never reuse its numbers, strings, column set or structure
  (#16's first ledger reused the video's figures, deltas and table shape: copying, not inspiration). Before showing
  anything, diff it against the benchmark for copied data, words and layout.
- **Motion is authored before it's built, and judged moving.** Measure the benchmark frame by frame (`ffmpeg -vf
  fps=10,tile=6x5`): every duration, the order, the zoom depth, when marks appear, how colour changes. Write the
  storyboard (interface-craft: named TIMING, one stage integer, springs in config) and the look in
  docs/craft/stage-brief.md, and get the owner's sign-off before code. Judge it by recording ours and comparing it
  side by side with the benchmark, never from stills (a hidden pane freezes transitions). The world freezes for the
  moment: settle, camera in, marks, hold, fix (pills count to zero, red → blue), hold, marks out, camera out, then
  life resumes.
- **Quarry has designed primitives, and examples use only them.** Palette, surfaces, card, type ramp, status language,
  client marks and notes come from the chosen direction (/primitives, overlay/showcase/src/primitives), never from
  a colour picked inside one example (a violet initials tile, a butter note, saturated pills read cheap). The bar is
  Mercury / Stripe: calm finance software, one brand colour, soft status, a client shown by its own mark.
- **Each principle lives in the product where it naturally bites,** not in one product's world: a Shapes picker on a
  whiteboard (#3), not another invoice. All of them share Slate, so the showcase still reads as one family. One app
  for everything turned every screen into money ("all the examples are becoming money theme").
- **Media is real:** photos, covers and pictures come from free-licensed stock (Unsplash, searched in the browser),
  saved small (480px) under overlay/showcase/src/media and credited in its CREDITS.md. Never drawn stand-ins, and never
  real album covers or brand art (copyrighted). Real photos bring real edges: give them an inner hairline.
- **Icons come from dithered.dev** (`@unlocalhosted/dither-icons`, the owner's own MIT set: `<LayersIcon size texture="dither" />`),
  never hand-drawn, for a screen's own controls. Shapes that are the subject (a triangle in a play button, a picker's
  shapes) stay drawn, since the principle is about their geometry.
- **#16 is the bar** (Quarry's running timer, commit ce37e8a): every screen is held to it.
- **plumber's read is drawn with plumber's own primitives,** imported from overlay/src/tokens.css and the blueprint
  marks, never invented: coral (`--pl-off`) for off, mint (`--pl-on`) once fixed, 1px lines with the white halo, the
  blueprint tag as the value pill (mono, white on the hue), heat dots where it's off, the blueprint shade over the rest,
  `--pl-spring-pop` for marks appearing. Owner: "follow the same primitives we have created for plumber, not just
  these orange and blue lines".
- **The read covers every place the slip is, not one.** When a slip recurs across the card (§3), the example's
  `measure` hands over marks for every instance (keyed lines, rules, bands and a pill each), the shade is cut around
  all of them, and the camera stays on the whole card (`Example.camera = false`). The fix then lands on every
  instance together, a beat apart down the card. Zooming into one "lead" instance is only for a slip too small to see
  at 1× (a pixel, a hairline), and even then the others are marked when the camera is back out.
- **The marks draw what is true, so the eye can check the picture against them.** Not a box round the subject with a
  number: the guide is the real thing the lesson turns on (a stretched photo's own shape inside its box, with the
  stretch dotted), and it moves to where the fix puts it.
- **Every instance glides, even when CSS snaps.** A fix on a property the browser can't transition (`object-fit`,
  `display`, a keyword) still has to be seen arriving: the stage animates the same pixels the fix will draw and lands
  the fix as the glide ends (Principle.jsx `glideFit`). A fix that snaps on six rows reads as a page reload. Add the
  glide to the stage, never to the example.
- **A defensive rule puts the uncontrolled thing in the viewer's hand.** A rule about what you don't control (the
  screen's width, a photo's shape, a longer name) is shown on one card the viewer changes themselves: #78's card has
  an edge to drag, so the cover's box changes shape under a real hand, and the photo is pulled out of shape on one
  side of the switch and holds on the other. The subject is big and one whose shape the eye knows (a building, a
  circle, a face), with the fixed side still showing it at every size (pick the photo for the crop too). Small
  thumbnails of landscapes don't show a stretch. The same slip recurs smaller on the card (§3). Never make content
  arrive by itself to show this: #78's rows stepping down read as noise (owner: "really confusing"). One hint line
  under the switch says what to try (`Example.hint`); the drag follows §3¾'s rules for ending a gesture.
- **Teaching sits off the stage**, below it, read after watching: what plumber sees, why it happens, the habit,
  plumber's fix in words (§5).
- **Fit every width.** Lay out against the stage (container queries); check 1440, 1024 and a ~300px pane.
- **The card and its switch are always in the window.** A card taller or wider than the room rests scaled to fit
  (Principle.jsx, the fit); build the card at its real size, never shrink it for the stage. plumber measures pixels and
  a scaled card reads wrong (targets look small, edges fall between pixels), so the card lifts to 1× whenever plumber
  reads it, while the blueprint or inspector is on, and from the camera's way out until plumber has asked again.
  Anything that reads from outside asks for the page as it is (`?side=`, never scaled); `scripts/screen.mjs` does.

## 3¾. Hands-on demos: the viewer's hand is the probe

Some mistakes only exist while something happens, and are felt in the hand: a wait, a jump, a wall. For those, the
viewer does the gesture and plumber's marks draw what happened, live. The approved reference is the live section of
docs/design/prototypes/probe-marks.html (#59, owner: "feels right"); the sketches tooltip-warmup.html (#60),
interrupt-marks.html (#64) and rubber-band.html (#65) follow it, and docs/craft/tactile-demos.md ranks the rest.

- **Earn it three ways, or don't build it.** The mistake happens only during the gesture; it's felt, not just seen;
  and plumber's probe (src/craft-probe.ts) records the very number the marks draw. A look (#63 scale from 0, #68 exit
  speed) is slowed playback, not a demo. A mistake at rest stays a still screen.
- **The component really behaves that way.** Real pointer, key and touch events, real timers, real CSS. Never
  synthesize the viewer's input, and never imitate what a desktop browser can't do (iOS zoom on focus, half-pixel
  blur): those are out. A slowed speed or a held reply is labelled ("¼ speed", a reply-speed dial) and applies to
  both sides of the switch equally.
- **Marks are a vocabulary, not a kit.** Each mark draws one number plumber's probe records and the lesson turns on;
  a demo uses only the ones its own quantity needs. Sky measures, coral is broken, mint is fixed, always.
  - *Trail* (a dot per move, a ring every fourth, older ones fainter): only when the path is the lesson (#59: the
    pointer's route crosses the next item). Not for a wait, a pull or a press.
  - *Contact ring*: where the gesture starts, when where matters (where you left the item, where you pressed).
  - *Time ruler*: when time is the lesson (a wait, a delay, how long something stayed), with the rule's thresholds on it.
  - *Hatch, dashed ghost, pill*: what was lost, what went or moved, and by how much, held where it went wrong.
  - *Mint*: where the fix carries the same input through.
  Thresholds are the rule's (craft-spec.js), never the demo's own.
- **The switch names the technique, and the same input runs on both sides.** Going back to the start, or leaving the
  frame, is a fresh try. One hint line says what to try, then what just happened, with its number.
- **A gesture ends however the hand ends it.** Capture the pointer, follow moves on `window`, and let go on
  `pointerup`, `pointercancel`, `lostpointercapture`, a `window` `pointerup`, `blur`, and a mouse move with
  `buttons === 0`. A release outside the pane sends no `pointerup` to the element, and the drawer stays stuck.
- **Measure from style, not layout, for what can hide.** A hidden element's `offsetWidth` is 0; marks held after it
  hides collapse unless its size comes from its style.
- **Check every state with a real hand**: each side, mid-gesture and held, a fast and a slow try, and for a drag a
  release outside the frame.

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

The card is a lesson: **what plumber sees** (its finding, with the number), **why it matters** (`matters`: what goes wrong
for the product and why nobody catches it, so the reader knows why the rule exists before how it works), **why it happens** (the mechanism, one or
two sentences), **the habit** to carry to the next screen, then **plumber's fix** in words with the class small under
it. Write `Example.lesson = { matters, why, habit }` for every example; a card that only shows the final CSS teaches nothing.

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
- 2026-11-04 · "you just copied the example, be inspired but don't copy": #16 reused the benchmark's figures
  (48,210 · 39,120 …), deltas (+87.0%, +16.8%) and table shape. → §3½ a benchmark gives qualities, never a template.
- 2026-11-04 · "follow the same primitives we have created for plumber, not just these orange and blue lines": the
  stage drew its own magenta/blue marks. → §3½ plumber's read is drawn with plumber's primitives, imported.
- 2026-11-04 · "the first example is meaningless, why would any UI have extra padding, you don't have to make an
  animated card all the time but something real": the brief's "flaw happens live" forced motion onto #1. → §3½ motion
  is earned; #1 is sections down a page lined up by their boxes (the owner's own definition).
- 2026-11-04 · "the card and the colors you chose look cheap and not up to the taste bar": every example picked its
  own colours, card and type inside the example. → §3½ Quarry primitives first, picked by the owner on /primitives.
- 2026-11-04 · "all the examples are becoming money theme"; "incorporate icons and all, dithered.dev": every screen
  was set in one invoicing app, with hand-drawn icons. → §3½ each principle in its natural product; dither icons.
- 2026-11-04 · "use real media just search on internet": #8's covers were drawn compositions. → §3½ media is real,
  free-licensed and credited.
- 2026-11-04 · "most of the rules you are showing is just changing padding … not the insightful stuff, the tacit
  knowledge"; #9 and #10 "aren't real mistakes". → §0 only insights get a screen; the rest are off the showcase.
- 2026-11-04 · "this is trash, black opaque items really? put some craft behind": the probe-stage prototype drew its
  hatch and triangle with `color-mix()` in SVG attributes (they render black), and was built as a whole moment with no
  designed marks and no look before showing. Benchmark for gesture marks: a sampled dotted trail, a translucent
  triangle with dashed edges, rings on the samples. → A new kind of mark (time, a gesture) gets a marks sheet first,
  every state side by side, reviewed before any moment uses it. Look at the render before showing anything. In SVG,
  colours go through CSS (classes, `style`), never CSS functions in presentation attributes.
- 2026-11-04 · "feels right" (probe-marks.html's live section: your pointer is the probe); then "if i drag out of the
  container and then let my hand go … the drawer stays stuck" (rubber-band.html heard only its own pointerup). → §3¾
  hands-on demos, and a gesture ends however the hand ends it.
- 2026-11-04 · "a lot of examples are really poor in terms of fidelity, delivery and overall taste"; "everything feels like
  a high fidelity wireframe and like just filled with text only"; cause (owner): no design pass. Every screen was a white
  card of text rows, built to plumber-correctness alone. → Before code, every screen gets a design pass:
  docs/craft/taste-checklist.md (a named product, a studied reference, the screen in its world, life, visual design,
  delivery), a comp critiqued in writing and compared side by side with #16, owner sign-off. Pilots: #16, #59, #57.
- 2026-11-04 · after the pilots were built as app windows: "lets revert i dont like these they are distracting … go back
  to individual thing we have before but may make them more rich and dense and up their quality". Cause (confirmed):
  the screen's unit became the whole app, so sidebars, toolbars and chrome competed with the lesson's subject. → A
  screen is the one component the lesson lives in, no app around it. Its richness goes inside it: real data drawn as
  data, faces and photos, more rows and density. The design pass still runs (reference, comp, critique, sign-off), on
  the component alone.
- 2026-11-05 · #16 at 2× was flagged for a hairline after the fix. Cause: Chrome (156) draws every border at least one
  whole CSS pixel, so the 0.5px border plumber suggested for #38, and every `border-*-hairline` in the showcase, drew two
  device pixels. → A fix is proved by what the screen draws, not by the value written: count the device pixels in a 2×
  screenshot. Hairlines are a half-pixel inset shadow (showcase utilities, rule #38's border fix) or a 0.5px-tall box.
- 2026-11-05 · Stray findings on #4, #59, #60, #64, #65. Three were rules reading a new idiom wrongly (a one-side inset
  shadow taken for a box with corners; a white ring taken for a grey shadow; Lc 59.7 printed as "60, needs 60"), one was
  plumber's reads overlapping (the stage's own read and the checker's scoped one: the first to finish turned the whole
  page back on under the other), the rest were real slips in the screens. → When a screen shows a stray, ask first
  whether the rule misreads how the screen draws it; when a scoped read names something outside its scope, suspect two
  reads at once. Reads now run one at a time (craft-run.js).
- 2026-11-05 · "Point errors in more than one place … not a one-pixel change in the whole card, then the demo falls."
  Cause: "wrong in one way" was read as one place, so rich cards carried a single small slip and Fixed changed
  nothing you could see. → One rule, planted at every natural recurrence (≥3, spread across the card); tiny rules
  repeat too and the camera zooms into one (§3).
- 2026-11-05 · Owner chose "Scale to fit" for cards taller or wider than the window (21 put the switch below an
  800px window, 10 ran off a phone). Cause: the stage set a fixed-size card above the switch and left the window to
  scroll. → The stage fits the card; plumber always reads it at 1× (§3½).
- 2026-11-12 · #78 (stretched pictures): "the demo technique is really bad, we dont show any guardrails, we dont show
  transition across all elements we focus on one and that too is so bad". Cause: the stage's contract was one lead
  element (one cut, one pill, the camera on it), so five of six photos were unmarked and snapped; the mark was a box
  with a percent, not the picture's true shape; and a rule about content you don't control was shown on a still list.
  Owner chose: guides on every photo and new shapes arriving, and every photo glides. → §3½: the read covers every
  place; marks draw what is true; every instance glides; a defensive rule is shown defending.
- 2026-11-12 · #78 again: "remove this moving animation … everything moving from second place but the first piece
  getting place, really confusing"; "i dont see the significance here why do we need this rule, please add relevant
  text". Cause: life was added to show the rule defending, and the lesson explained the mechanism without saying what
  it costs a product. → §3½ a defensive rule stays a still screen; §5 the lesson opens with `matters`.
- 2026-11-12 · The owner took plumber's fix on #78 with the overlay, which wrote `object-cover` into the screen's
  file, so the mistake's side was already fixed and the demo had nothing to find. → When a screen shows no finding
  on its broken side, check `git diff` on its file first and put it back.
- 2026-11-12 · #78, third round, with the reference's own demo (defensivecss.dev: one photo in a box you resize, a
  "Toggle Defensive" checkbox): "we dont see the issue clearly in this component … you will also see the value if you
  stretch the card itself". Cause: six 96 by 72 thumbnails of landscapes; a stretch on a small picture of a hill
  doesn't read, and nothing let the viewer change the box. Taken from the reference: a big subject with a known
  shape, and the box in the viewer's hand. Ours: a trip-day card with a draggable edge, plumber's switch and marks.
  → §3½ a defensive rule puts the uncontrolled thing in the viewer's hand.
- 2026-11-12 · (own review) #79's first check fired on the whole card, not the column that holds the name: every box
  the text spills out of is also a flex item with overflowing content, and the outermost one won. plumber's fix then
  landed on nothing, and the switch showed "fixed" over a broken card. → A rule about overflow names the innermost
  box that causes it (the one that grew to fit its own content), never one the content merely spills from. After the
  switch, read the finding's file and line: it must be the element the fix belongs on.
- 2026-11-12 · #79's first screen rested with three role menus already pushed off the card: "this example isn't apt
  as the default state is clearly broken and no one will ship ui like this broken, we show examples which will be a
  miss in a normal design review". Cause: the rule fired only on a row already overflowing, so the screen had to be
  broken at rest for plumber to find anything. → §1: the mistake's side is the one that passed review; the rule finds
  the cause before the damage. #79 now rests with every name fitting and breaks when the card is dragged narrower.
- 2026-11-12 · (own review) #78's finding "before it stretches" was first written at confidence 0.72 and never showed:
  the engine drops anything under 0.8 (craft.js FLOOR). → A finding about a cause, not visible damage, must earn 0.8
  by narrowing what it reads (photo-sized pictures only, not icons), never by raising the number alone.
- 2026-11-12 · (own review, building #80) The uncontrolled thing isn't always a width: for words over a picture it is
  the network, so the hand is a switch that makes the photos really fail to load (kit `usePhotos` + `<Signal>`), not
  a drag. → §3½: pick the hand from what the rule doesn't control (screen → edge to drag, network → a switch).
- 2026-11-12 · (own review, building #80) The new screen made #79 fire on its card: truncated names inside a card with
  its own width, in the stage's row. A second finding on a well-built screen is the rule's noise, not the screen's:
  #79 now stays quiet about an item that has its own width until the row really runs over.
- 2026-11-12 · "these examples look very contextual ... these looks ass"; "maybe this rule doesn't belong here"; the
  craft list is "tacit knowledge, years of experience ... real hidden gems", not tutorial tips. → §0. Screens 78–80
  (defensive CSS tips) were removed; the three checks stay in the engine without a number. The §3½ notes about a
  defensive rule's screen no longer have a screen to apply to.
- 2026-11-12 · "dont create these rules out of your ass … there has to be a principle behind the suggestion": a suggestion built on made-up counts (two places, more than half). → Before anything, docs/PRINCIPLES.md.
- 2026-11-12 · "I'm not creating a linter, this would be suggestive, this would be opinionated": plumber judged against lint tools and told to stop choosing. → Before anything, docs/PRINCIPLES.md.
