# QA results: the element card, the text card, layout and spacing, effects, tidy

Pass of 2026-11-03, run against `docs/qa/element-card-plan.md`. Nothing was fixed in this pass.

**How it was run.** Playwright scripts drove the headless shell (`chromium_headless_shell-1243`), one browser at a time.
They ran against crafting-ui on :5180 and against a copy of `overlay/demo` with a few extra elements, served on
127.0.0.1:5191 with the plumb vite plugin. That copy (`fixtures/.qa-ec`, now deleted) added:

- `Box({className})`: renders `<div className={className}>` and is used twice, so its classes come from the usage.
- `Panel`: a template literal that adds the usage's className to its own classes.
- `#qa-built`: a className built from an array with `.join`.
- `#qa-default`: Tailwind's default `p-4 gap-3`.
- A dark section.
- `#qa-grid`: `grid-cols-[120px_1fr_auto]`.
- `#qa-dyn`: words whose className is built in code.
- `#qa-semi`: a semibold heading.

Every Alt+click sent an Alt keydown first, then a click with Alt held. The one exception is F4-01, which tests the
click without the keydown.

**What was written where.**
- On crafting-ui, every write path into a shared component was blocked at the network: a route on
  `/__plumb/{swaps,set,prop,apply*,recipes/apply}` recorded the POST body and answered 409. The raw bodies quoted below
  come from that route.
- One real write went to crafting-ui, in a page file: weight 400 → 500 on `src/pages/home/Hero.tsx:96`. It was then
  undone, and the file came back exact.
- All the other real writes went to the fixture, and each one was undone. Every undo left the file byte-exact.

**Safety.**
- Before the first write, `crafting-ui/src` was saved to `<scratchpad>/crafting-src-qa.tar`.
- At the end, `diff -r <untarred>/src crafting-ui/src` printed nothing and exited 0, so crafting-ui/src is unchanged.
- No git checkout, restore or stash was run in crafting-ui.
- The fixture's dev server was started and stopped through `~/.claude/bin/dev-server`, and its folder was deleted.
- `overlay/src`, `src/` and `e2e/` were not touched.

**What was not run.** I did not run the e2e suite (`e2e/element-*.test.mjs`): swap was at 11.7 of 12 GB when I checked
(`vm.swapusage`). Its write, resume and undo paths were checked by hand on the fixture instead (F-pass rows in the
coverage table).

Scripts are in `<scratchpad>/qa/` (lib.mjs, probe/sweep, p01–p11 on crafting-ui, f1–f8 on the fixture).
Screenshots are in `docs/qa/shots/`.

## Summary

| Severity | Count |
|---|---|
| blocker | 1 |
| major | 20 |
| minor | 15 |
| polish | 4 |
| **total** | **40** |

| Cause group | Count | IDs |
|---|---|---|
| 1 Writes land on the shared component, not on the usage that passes the classes | 4 | F1-01 to F1-04 |
| 2 Spacing scale ignores Tailwind v4's `--spacing` | 1 | F2-01 |
| 3 Surfaces fight | 6 | F3-01 to F3-06 |
| 4 Reaching an element | 8 | F4-01 to F4-08 |
| 5 Polish | 3 | F5-01 to F5-03 |
| new 6: Text card reads or edits a value wrong | 9 | F6-01 to F6-09 |
| new 7: Tidy changes things that are fine | 4 | F7-01 to F7-04 |
| new 8: Motion, Layout, performance, counts | 5 | F8-01 to F8-05 |

How the quick pass of 2026-11-03 held up:

- **Confirmed:** 1, 2, 3 (card with a held cause, card over the fix panel, lingering bubble, "only shadow-1 visible"),
  4 (all four), and 5 (Semibold truncated, the glow hiding words, "beside").
- **Not reproduced:** the shadow strip being see-through over the page. Its background is opaque: `oklch(0.987 0 0)`
  on crafting-ui and `rgb(243,244,246)` on the fixture.
- **Not reproduced:** the fix panel's empty white body. With the card shown and the panel open, the content ends 19px
  short of the panel's bottom (224px tall, content to 205px).

---

## Group 1: Writes land on the shared component, not on the usage that passes the classes

### F1-01 · major · Layout writes a class swap to `router.tsx:43`, which has no className
- **Page and element:** crafting-ui `/motion`, a row in Lessons:
  `a[href^="/motion/moments/"]`, stamped `src/lib/router.tsx:43:5`. Its classes are passed in at
  `src/pages/MotionIndexPage.tsx:79` (`group/m grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[10rem_1fr_auto]`).
- **Steps:** Alt+click the row's top right. Open Layout ›, pick the second layout (`l:row`), then Write it.
- **Expected:** the swap is written where `grid` is written, at MotionIndexPage.tsx:79. The card says "40 like it"
  before writing.
- **Actual:** Writes shows `Link / a / - grid / + flex flex-wrap` with no file name. Write it POSTs to the wrong file:
  `{"url":"/__plumb/swaps","body":{"file":".../crafting-ui/src/lib/router.tsx","edits":[{"line":43,"column":5,"from":"grid","to":"flex flex-wrap"}]}}`
  router.tsx:43 is `<a href={to} … {...props} />`, which has no `grid` to swap.
- **Evidence:** `docs/qa/shots/p06-row-layout-picked.png`, `p06-row-layout-refused.png`. The same thing shows on the
  nav Link on `/`: `p05-link-layout-grid.png` ("- flex + grid grid-cols-[auto_1fr_auto_auto]").

### F1-02 · major · Spacing, Shadow and Layout refuse an element whose classes come from its usage; Tidy writes the same element at the usage
- **Page and element:** fixture `Box` (`App.jsx:74`: `<div className={className}>`), used at `App.jsx:80`
  with `className="flex flex-col gap-[10px] p-[14px] …"`.
- **Steps:**
  1. Alt+click just outside `#qa-box-a`, which lands on the Box.
  2. Point at the Box's left edge and scroll one notch down.
  3. Separately, open Shadow › and pick the second option.
- **Expected:** the edit goes to the usage line 80, the way Tidy writes it.
- **Actual:** both say "The change could not be written: className is built at runtime (a variable); set the class by
  hand." Tidy on the same card wrote `80: <Box className="… shadow-rest p-s4" …>` and undid exactly.
- **Evidence:** `f1-box-usage-write.png`, `f2-box-shadow.png`, `f3-tidy-qa-box-a-written.png`.

### F1-03 · major · Layout's Writes shows a diff that can't be written (Panel template literal)
- **Page and element:** fixture `Panel` (`App.jsx:71`:
  ``<div className={`rounded-card bg-surface shadow-rest ${className}`}>``), used with `className="p-4 flex gap-2"`.
- **Steps:** Alt+click just outside `#qa-panel-a`. Open Layout › and choose Grid. Read Writes, then click Write it.
- **Expected:** either the swap is written at the usage, where `flex` is, or Writes says it can't be written before
  anything is clicked.
- **Actual:** Writes shows `Panel / div / - flex / + grid grid-cols-2`. Write it then says: "The change could not be
  written: flex is not written on this element; read it again." Reading it again can't help, and nothing was written.
- **Evidence:** `f2-panel-layout.png`, `f3-panel-layout-write.png`.

### F1-04 · major · Shadow and Motion on a shared Link refuse even though every usage passes a plain string className
- **Page and element:** crafting-ui `/`, nav `a[href="/motion"]` (router.tsx:43, `<a … {...props}>`).
  Its usage is SiteHeader.tsx:54.
- **Steps:** Alt+click, open Shadow ›, pick `y:2`. Do the same in Motion ›.
- **Expected:** the edit is written at the usage that passes the className (SiteHeader.tsx:54), or the card offers it.
- **Actual:** both drills show Writes: "This element spreads props, which may carry className; change the class by
  hand." Write it stays disabled.
- **Evidence:** `p05-link-shadow-picked.png`, `p05-link-motion-picked.png`.

## Group 2: The spacing scale ignores Tailwind v4's `--spacing` multiplier

### F2-01 · blocker · On crafting-ui the spacing scale is `[0]`, so the spacing grammar can't change anything
- **Page and element:**
  - crafting-ui `/motion` hero column `[data-plumb-source^="src/pages/MotionIndexPage.tsx:42:"]` (`grid content-center gap-6`).
  - `/motion` Lessons row (py-4).
  - `/` nav Link (px-2.5).
- **Steps:**
  1. Alt+click the column between two children, then point into the gap.
  2. Scroll one notch (deltaY −100).
  3. Send 8 small trackpad deltas (−6px each).
  4. Drag 30px across the gap.
- **Expected:** the bubble reads `24 · s6 gap`, with the theme's steps around it. A notch moves one step and writes
  when the hand stops.
- **Actual:**
  - The bubbles read `24 gap 0 Between: at least the space inside (0).`, `16 padding top 0` and `10 padding left 0`.
    The scale window holds only `0`, struck through, and the value is coral (off the scale).
  - The notch, the trackpad deltas and the drag leave the gap at 24px.
  - No write is ever POSTed (the network log is empty).
- **Cause:** crafting-ui defines `--spacing: 0.25rem` (`src/index.css:118`) and
  `--spacing: calc(0.25rem * var(--z))` (`src/styles/craft.css:56`).
- **Contrast:** on the fixture, where the theme defines `--spacing-s1…s6`, `p-4` reads as `16 · s4` and a notch writes
  `pl-s6` (exact undo).
- **Evidence:** `p06-gap-point.png`, `p06-gap-notch.png`, `p06-gap-drag.png`, `p05-link-spacing-wheel.png`,
  `p06-row-spacing.png`. The working fixture case is `f1-default-p4-bubble.png`.

## Group 3: Surfaces fight

### F3-01 · major · The card and the fix panel are both on screen, and the card covers the panel
- **Page and element:**
  - crafting-ui `/`, Phone `blueprint.tsx:107`. The card is at 733,427 276×301. The panel is at 460,590 520×238, and
    its preview "150ms dur-quick" and its header are cut.
  - `/icons`, `IconsPage.tsx:69`. The card covers the bar's Fix button.
  - `/`, Hero `p`. The text card covers "3 problems · Fix ↵".
- **Steps:** Alt+click the element.
- **Expected:** one surface at a time, or the card placed clear of the bar.
- **Actual:** `cardOverFx: true` on 6 of about 45 opens in the sweep, at both 1440 and 820 widths.
- **Evidence:** `s-home-container.png`, `s-icons-large.png`, `p03-text-size-right.png`, `s-narrow-container.png`.

### F3-02 · major · The strip clips its options and gives no way to scroll to them
- **Page and element:**
  - crafting-ui `/` nav Link, Shadow ›: 9 options, 4 visible. All 5 pack options ("Raised … Sunken") are below the
    strip's bottom (`overflow:hidden`, scrollHeight equals clientHeight).
  - Fixture `#relative`, Shadow ›: 6 options, 1.5 visible.
  - Fixture `#relative`, Motion ›: `p:press` is clipped.
- **Steps:** open a drill.
- **Expected:** every option can be seen and pointed at.
- **Actual:** the clipped options can only be reached with ↓ (pointing previews and restores correctly).
- **Evidence:** `p05-link-shadow-strip.png`, `f2-shadow-strip.png`, `f4-motion-strip.png`.

### F3-03 · minor · The strip sits above the element, and the copy says "beside"
- **Page and element:** fixture `#relative`, Shadow ›.
- **Actual:**
  - The strip's rect is y 185–400. The element is at y 418, so the strip is above it, yet the strip's `data-side` is
    `below`.
  - The copy reads "Pick a shadow in the strip beside your element." (`words.js:431`).
  - The strip also covers the page above the element.
- **Evidence:** `f2-shadow-strip.png`.

### F3-04 · minor · The spacing bubble covers the card's own rows, and shows while pointing at the fix bar
- **Page and element:**
  - crafting-ui `/` nav Link: pointing at its left padding draws the bubble over the card's Shadow and Motion rows.
  - `/motion`, with a card open on `main`: Alt+click on the fix bar shows `.sp-bub`.
- **Note:** on the fixture, moving the pointer away hides the bubble, and closing the card leaves no bands (pass).
- **Evidence:** `p05-link-spacing-wheel.png`, `p11-under-bar.png`.

### F3-05 · polish · Three surfaces stack at the bottom right
- **Actual:** the fix bar, the hint "Click anything to fix it · ← → next fix · hold Space to use the page / Got it" and
  the toast "2 setup steps left … Review" are all shown at once.
- **Evidence:** `p02-navlink.png`, `p08-scrolled.png`.

### F3-06 · polish · Esc Esc closes the card but leaves the fix panel open
- **Actual:** a third Esc closes the panel. In Blueprint the panel goes on the third Esc.
- **Evidence:** p02 log (`after Esc Esc [".fx"]`), p07 step 6.

## Group 4: Reaching an element

### F4-01 · major · Alt+click with no Alt keydown before it does nothing
- **Page and element:** crafting-ui `/`, `p.font-read`.
- **Steps:** dispatch pointer, mouse and click events with `altKey:true`, with no keydown before them.
- **Actual:** no surface opens.
- **Evidence:** `p07-no-keydown.png`.

### F4-02 · major · Alt held down before the page loaded makes Alt+click do nothing
- **Steps:** keyboard.down('Alt'), then load `/`, then click with Alt still held.
- **Actual:** nothing opens until Alt is released and pressed again.
- **Evidence:** p07 step 2.

### F4-03 · major · Containers filled by their children can't be reached with a click; the only way is an undiscoverable Alt+wheel
- **Page and element:**
  - `/` `Hero.tsx:94`: a click 4px inside lands on `P Hero.tsx:96`.
  - `/motion` `section#moments`: a click at its corner lands on `H2 MotionIndexPage.tsx:73`.
  - `/` large `Hero.tsx:87`: the click lands on the sticky header over it.
  - Rounded corners hit-test to the parent: the fixture `#qa-grid` corner opened `section App.jsx:79`.
- **What works:** holding Alt and scrolling walks up the tree, and the tag shows the path
  (`p → …›div›section›div›div›… → …›HomePage›Hero›div›section›…`). Clicking then opens the card for the level reached
  (`Hero.tsx:88`).
- **What's missing:** nothing in the card or the tag tells you this.
- **Evidence:** `p07-alt-wheel.png`, `p07-alt-wheel-pinned.png`, the sweep logs (the `hit` field).

### F4-04 · major · No way up to the parent from an open card
- **Steps:** with the card open on `Hero.tsx:88`, press Alt+↑.
- **Actual:** the card stays on the same element. The card's controls are only its fields and Show.
- **Evidence:** p07 step 4.

### F4-05 · major · In Blueprint, Alt+scroll scrolls the page instead of walking the tree
- **Steps:** Alt+B, hold Alt, point at the paragraph, scroll 240.
- **Actual:** scrollY goes from 0 to 240. The tag shows the path, but the page has moved.
- **Evidence:** `p07-blueprint-altwheel.png`.

### F4-06 · major · In Blueprint, Alt+click on words opens no card
- **Steps:** Alt+B, then Alt+click on the Hero paragraph.
- **Actual:** no card opens. The fix panel jumps to that element's cause (`max-lg:text-[1.0625rem] ‹ 12 of 60 ›`).
- **Expected:** the brief and the plan say Alt+click opens the element's card in any mode.
- **Evidence:** `p07-blueprint-altclick.png`.

### F4-07 · minor · Alt+click on an SVG icon opens a card for its inner `rect` or `text`, not the `<svg>`
- **Page and element:**
  - crafting-ui nav icons: the card is "rect marks.tsx:16" and offers Shadow, which `box-shadow` can't paint on an SVG
    child.
  - Fixture `#icon`: a text card opens on the SVG `<text>` (8px, set by the `fontSize` attribute).
- **Evidence:** `s-home-svg.png`, `f8-svg.png`.

### F4-08 · minor · Buttons and links whose label is a direct text node open only the text card
- **Page and element:** `/` "you" button `Hero.tsx:195`, `/icons` `IconsPage.tsx:52`, fixture `#nested-button`.
- **Actual:** there is no way to reach their Shadow, Layout or Spacing with a click (only by Alt+wheel).
- **Evidence:** `s-home-button.png`, `s-icons-button.png`.

## Group 5: Polish

### F5-01 · minor · The weight field cuts off "600 Semibold"
- **Page and element:** crafting-ui `/motion` "Saar Oz" (`MotionIndexPage.tsx:80`) and fixture `#qa-semi`.
- **Actual:** the `.val` holding "600" has scrollWidth greater than clientWidth.
- **Evidence:** `f6-saar-textcard.png`, `f6-semi-textcard.png`.

### F5-02 · major · The drift glow hides the words
- **Page and element:** crafting-ui `/` in Blueprint.
- **Actual:**
  - The Hero paragraph is drawn as solid pink bars and can't be read.
  - With a card open on a big element, the headings, "Saar Oz" and the list are glowed over.
  - On the Hero section card, the glow sits on the headline.
- **Evidence:** `p07-blueprint-altclick.png`, `p09-big-strip.png`, `p02-notif.png`.

### F5-03 · polish · The colour field shows unrounded CSS colours
- **Actual:** it shows `oklab(0.130405 -0.0000282313 -0.00031021)` (`/motion` "large") and `rgb(21, 24, 27)` (fixture)
  where it could show the token or a short form.
- **Evidence:** the s-motion log, `f5-dark-text.png`.

## New group 6: The text card reads or edits a value wrong

### F6-01 · major · The colour menu's swatches are 0×0, so nothing can be clicked
- **Page and element:** crafting-ui `/` `p.font-read`, colour ▾.
- **Actual:**
  - The listbox is one 26px row. Its 25 `button.ch` (named accent, accent-hover, bg…) each have a rect of `0×0`.
  - The keys still work: ↓ → previews `oklch(0.57 0.2 28)`, and Esc puts it back.
- **Evidence:** `p03-text-menu-color.png`, `p04-color-keys.png`.

### F6-02 · major · The colour field shows a font-size value
- **Page and element:** crafting-ui `/patterns/swipe-to-dismiss`, h1 `PatternPage.tsx:184` (class `text-[clamp(2rem,3.4vw,2.75rem)]`).
- **Actual:** the colour chip reads `clamp(2rem,3.4vw,2.75rem) ▾`.
- **Evidence:** `s-lesson-large.png`.

### F6-03 · minor · Leading shows a stale value while a size is previewed
- **Page and element:** crafting-ui `/` Hero p.
- **Steps:** ↓, then → (14 → 16px).
- **Actual:** the leading field reads `1.31`, which is 21px/16. The element's computed line-height is 24px (1.5).
- **Evidence:** `p03-text-size-right.png`.

### F6-04 · major · Words with a className built in code get no refusal and no lock; edits do nothing, silently
- **Page and element:** fixture `#qa-dyn` (`App.jsx:86` `className={'text-body font-semibold ' + tone}`).
- **Steps:** Alt+click, then ↓ → Enter.
- **Expected:** the fields are locked, or a plain reason is shown.
- **Actual:** the fields look editable. Nothing is previewed, written or said.
- **Evidence:** `f6-dyn-refused.png`.

### F6-05 · minor · Typed digits aren't previewed, and the hierarchy sentence contradicts itself
- **Page and element:** fixture `#prose` (14px, scale 12/14).
- **Steps:** type `16` with the size field in hand. Then click the field and type `16` again.
- **Actual:**
  - The first typing is ignored.
  - The second shows `16` in the field, but the element stays 14px.
  - The sentence reads "Fits as the subtitle, below the title (14px) and above the body (12px)."
- **Evidence:** `f6-typed.png`.

### F6-06 · minor · The Style field says "Body", but the values aren't Body's
- **Page and element:** crafting-ui `/` Hero.tsx:96 (`type-body-large`).
- **Actual:** Style reads `Body`, while the element measures 14px/1.5. The menu lists Body as `16 / 1.6`. Nothing marks
  the difference.
- **Evidence:** `p02-para.png`, `p03-text-menu-style.png`.

### F6-07 · minor · On a short scale a drag has to be very long; the body step is struck through
- **Page and element:** fixture `#prose` (steps 12 and 14).
- **Actual:**
  - Dragging 60px left changes nothing. It takes 220px to reach 12px, while the ← key gets there at once.
  - The 12px step is drawn struck through as breaking the hierarchy, though 12px is the body size.
- **Evidence:** `f6-fixture-drag-mid.png`, f6f and f6g logs.

### F6-08 · polish · The value pill is cut off at the end of the track
- **Actual:** while dragging past 56, the pill shows only "5".
- **Evidence:** `p03-text-drag-band.png`.

### F6-09 · minor · Accessibility: focus stays on the page, and the spinbuttons can't be reached with Tab
- **Actual:**
  - After Alt+click, `document.activeElement` is BODY and the shadow root has no active element.
  - The size, leading, tracking and weight fields have `role=spinbutton`, `tabindex=-1` and no `aria-valuenow`.
  - The element card's drills can be reached with Tab: shadow, motion, layout, show, then back to the page.
- **Evidence:** f5 log, p03 log.

## New group 7: Tidy changes things that are fine

### F7-01 · major · Tidy reads `rounded-full` as 33554400px and squares the avatar
- **Page and element:** fixture SyncRow `App.jsx:5` (`size-8 rounded-full`).
- **Actual:** the list says "Corner of span 33554400px → 0px". The write is `rounded-[0px]` (exact undo).
- **Evidence:** `f3-tidy-sync-row.png`, `f3-tidy-sync-row-written.png`.

### F7-02 · major · The nested-corner rule flattens controls to `rounded-[0px]`
- **Page and element:** "Run now" (8px → 0px) in SyncRow, and `#nested-button` (11px → 0px) in `#wrapper`.
- **Actual:** the rule writes an arbitrary `rounded-[0px]`, not a theme step or `rounded-none`.
- **Evidence:** `f3-tidy-wrapper.png`, `f3-tidy-wrapper-written.png`.

### F7-03 · minor · Tidy changes padding it doesn't list
- **Page and element:** SyncRow.
- **Actual:** the list says "Padding of the card 10px → 12px". The write replaces `py-[10px] px-[14px]` with `p-s3`,
  so the horizontal padding also goes from 14 to 12.

### F7-04 · minor · "Like the same line in the cards beside it" raises 12px to an arbitrary 16px
- **Page and element:** `Box` usages A and B: "detail A" and "detail B" are both `text-small` (12px).
- **Actual:** Tidy lists "Size of 'detail A' 12px → 16px" and writes `text-[16px]`, which is off the scale.
- **Evidence:** `f3-tidy-qa-box-a.png`. Box B gives the same result (f7 log).

## New group 8: Motion, Layout, performance, counts

### F8-01 · major · Dragging a curve handle doesn't change what Writes shows
- **Page and element:** fixture `#relative`, Motion › Lift.
- **Steps:** drag the second curve handle 40px above the top line.
- **Actual:** the card says "overshoots", but Writes still shows
  `transition-transform duration-150 ease-in-out hover:-translate-y-0.5`.
- **Contrast:** the travel ghost does change Writes: −6px gives `hover:-translate-y-1.5`.
- **Evidence:** `f4-motion-overshoot.png`.

### F8-02 · minor · Layout reads a responsive grid's columns wrong
- **Page and element:** crafting-ui `/motion` Lessons row (`sm:grid-cols-[10rem_1fr_auto]`).
- **Actual:** the chips read `1fr 1fr 1fr`.
- **Evidence:** `p06-row-layout-picked.png`.

### F8-03 · minor · An entrance writes an exit variant nothing triggers, with no note
- **Page and element:** fixture `#relative`, Entrance › Fade and rise.
- **Actual:** it writes `animate-fade-rise data-[state=closed]:animate-fade-rise-out`, but nothing sets `data-state`
  on the element. No entrance-only note is shown (notes `[]`).
- **Evidence:** `f4-motion-enter.png`.

### F8-04 · major · On a very large element, Shadow freezes the page for about 1.8s and the strip is unusable
- **Page and element:** crafting-ui `/motion`, walked up to `main` (MotionIndexPage.tsx:38, 1234 nodes).
- **Actual:**
  - Shadow › takes 1928ms to show its strip, including one 1807ms long task. It clones 9 copies of 1234 nodes each.
  - Pointing at a copy causes a 106ms long task.
  - The strip shows a crop of one copy, and the back button is cut to "‹ Moti".
- **Contrast:** a text-size drag keeps 60fps (median 16.7ms, no frame over 33ms, no long tasks).
- **Evidence:** `p09-big-strip.png`.

### F8-05 · minor · The fix panel gives two different counts for one cause
- **Page and element:** crafting-ui `/icons` (Show from the IconsPage.tsx:69 card).
- **Actual:** the cause `fr` says "1 place in your code · 60 on the page" and also "The same code draws 854 other
  places on this page".
- **Evidence:** `p10-show-fix.png`.

---

## Coverage

"passed" means the behaviour was seen working. "failed" names the finding. "not reachable" means the cell couldn't be
reached through the UI. "not run" means the cell wasn't tested.

### Pages × element kinds (does Alt+click open the right card?)

| Element kind | `/` | `/motion` | lesson `/patterns/swipe-to-dismiss` | `/icons` | `/how-its-made` | fixture |
|---|---|---|---|---|---|---|
| words | passed | passed | passed | passed | passed | passed |
| container with padding | passed (Phone) | passed (Plate) | passed (Phone) | passed (Sheet button) | not reachable (F4-03) | passed |
| grid or list | failed F4-03 (hit a child) | failed F4-03 | passed | passed | passed (via a Link) | passed |
| image | (none on page) | (none) | (none) | passed | (none) | passed |
| SVG or icon | failed F4-07 | failed F4-07 | failed F4-07 | failed F4-07 | failed F4-07 | failed F4-07 |
| button | text card only, F4-08 | text card only | hit an SVG rect, F4-07 | text card only | (none) | text card only |
| input | (none) | passed (element card, no Layout) | (none) | (none) | (none) | passed |
| shared component (Link, SiteHeader) | passed to open, writes failed F1-01/F1-04 | passed to open, writes failed F1-01 | passed to open | passed to open | passed to open | Box/Panel failed F1-02/F1-03 |
| className built in code | n/a | n/a | n/a | n/a | n/a | refusal passed for spacing; text failed F6-04 |
| inside something closed (details) | (none) | (none) | (none) | (none) | (none) | not reachable (folded body; summary opens a text card) |
| under the fix bar | — | not reachable (the bar takes the click) | — | — | — | — |
| very large element | failed F4-03 (header over it) | failed F8-04 (perf) | passed to open | passed to open (F3-01) | — | — |

### Features × states

| Feature | rest | hover / point | focus (keys) | open | dragging | writing → written (said + Undo) | undone (exact) | reload (resume) | refused | error | empty |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Text card: style menu | passed | — | passed (← cycles style) | passed | — | not run | — | — | — | — | — |
| Text card: size | passed | — | passed | passed | passed (Esc mid-drag restores, rubber band) | passed (crafting-ui weight write) | passed | — | failed F6-04 | — | — |
| Text card: leading | failed F6-03 | — | passed | passed | not run | not run | — | — | — | — | — |
| Text card: tracking | passed | — | not run | not run | not run | not run | — | — | — | — | — |
| Text card: weight | failed F5-01 | — | passed | passed | — | passed (Hero.tsx:96 400→500, `font-medium`) | passed (exact) | — | — | — | — |
| Text card: case | passed | passed (hover previews) | — | — | — | passed (fixture UPPER) | passed | passed (page reloads after undo) | — | — | — |
| Text card: colour menu | failed F5-03, F6-02 | — | passed (keys preview) | failed F6-01 | — | not run | — | — | — | — | — |
| Text card: typing, Enter, Esc | — | — | failed F6-05 | — | — | — | — | — | — | — | — |
| Text card: scale, hierarchy marks, sentence | passed (crafting-ui), failed F6-05/F6-07 (fixture) | — | — | — | — | — | — | — | — | — | — |
| "Same code draws N other places" | passed | — | — | — | — | — | — | — | — | — | — |
| Element card at rest: header, reach line, fields per kind | passed | — | passed (↑↓ data-at, Tab through drills) | passed | — | — | — | — | — | — | — |
| Placement (beside, below, above), follows scroll and resize, caret and ring | passed (in view on 45 opens; follows scroll; above after resize) | — | — | — | — | — | — | — | — | — | — |
| Shadow › strip, verdicts, preview and restore | failed F3-02, F3-03 | passed (exact restore, no inline style left) | passed (↓ steps) | passed | — | passed (fixture Raised) | passed | passed (reload says it with Undo) | failed F1-02/F1-04 | — | passed ("Nothing to write") |
| Shadow light pad (sun keys, halo) | passed | — | passed (←→ 0°→6°) | — | passed (halo softness 1→1.53) | — | — | — | — | — | — |
| Shadow choices | not reached: no "close" verdict exists in this theme | — | — | — | — | add one / change everywhere passed (Writes changes) | — | — | — | — | — |
| Motion › tabs, strip loops, cursor | passed | — | — | passed | — | passed (fixture Lift, Enter) | passed | — | refused passed on Link | — | — |
| Motion curve handles, overshoot | failed F8-01 | — | — | — | failed F8-01 | — | — | — | — | — | — |
| Motion timeline, travel ghost, R replay | passed (ghost −6px), passed (R plays) | — | passed (R) | — | passed | — | — | — | — | — | — |
| Motion: motion/react marking, entrance-only note | failed F8-03 (no note) | — | — | — | — | — | — | — | — | — | — |
| Layout › Flex/Grid, direction, wrap | passed | passed (strip previews and restores) | — | passed | — | passed (fixture `#qa-grid`) | passed | — | failed F1-01/F1-03 | — | — |
| Layout track chips cycle, + and − | passed (120px→auto), failed F8-02 | — | — | — | not run (column-line drag; selector missed) | — | — | — | — | — | — |
| Layout subgrid | not run (covered by e2e/element-layout, not re-run) | | | | | | | | | | |
| Spacing bands (pad, mar, gap), edit-through to a child | passed (fixture) | passed | — | — | — | — | — | — | — | — | — |
| Spacing: wheel notch, trackpad, drag | failed F2-01 (crafting-ui), passed (fixture notch and 6×8px trackpad) | — | — | — | failed F2-01 | passed (fixture p-4 → pl-s6) | passed | — | passed (`#qa-built`, "built at runtime (an expression)") | — | — |
| Spacing ⇧ pair, ⌘ all | passed (2 and 4 bands relit) | — | — | — | — | passed (⌘ Enter → `p-s4`) | passed | — | — | — | — |
| Spacing bubble (value, step name, coral, window, rule) | passed (fixture), failed F2-01 (crafting-ui) | failed F3-04 | — | — | — | — | — | — | — | — | — |
| Spacing: Esc puts back, page doesn't scroll | passed (Esc 16→13, scrollY +0) | — | — | — | — | — | — | — | — | — | — |
| Tidy: shown for the right elements, plain words | passed (no rule ids leak) | — | — | passed | — | passed (one batch, said "Tidied … N changes") | passed (one Undo, exact) | — | — | — | passed ("Nothing to tidy") |
| Tidy: what it changes | failed F7-01 to F7-04 | — | — | — | — | — | — | — | — | — | — |
| Tidy: Space shows it as it was | passed (padding back to 10px 14px while held) | — | — | — | — | — | — | — | — | — | — |

### Cross-cutting

| Cell | Result |
|---|---|
| One surface at a time | failed F3-01, F3-04, F3-05 |
| Narrow viewport (820×900) | passed (every card in view, side right or left); F3-01 still happens |
| Dark ground | passed (strip ground `rgb(21,24,27)`, the copies on it) |
| prefers-reduced-motion | passed (no card or body animations, no loops in copies, R doesn't play) |
| Keyboard only | partial: drills reachable with Tab, ↑↓ Enter Esc work; fails F6-09, F4-04 |
| Accessible names and roles | card `role=dialog`, named "Edit X"; drills are buttons; strip `role=listbox` "Shadows"; fails F6-09 |
| Console and page errors | no page errors; console shows 400/409 "Failed to load resource" on every refusal (polish, not counted) |
| Performance | failed F8-04 on a very large element; text drag passed (60fps) |
| Resume after a write's reload | passed (shadow theme write: 1 reload, said line and Undo come back, Undo reloads, files exact) |
| Alt+B and Esc transitions | failed F4-05, F4-06, F3-06 |
| Alt+click without a keydown, Alt held before focus | failed F4-01, F4-02 |

## Final crafting-ui diff

`diff -r <scratchpad>/qa-untar/src /Users/vijaysingh/unlocalhosted/crafting-ui/src` printed nothing and exited 0.
crafting-ui/src matches the backup taken before the first write.
