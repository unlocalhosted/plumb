# QA retest: the element card, the text card, layout and spacing, effects, tidy

Retest of 2026-11-03 after the fixes `51a0ffa`, `cc1df9c`, `4db4ff6`, `3ccc0a1`, `676e000`, `31fb116`, `3a0aa2e`,
`10e5e32` and `3d05c20`. It follows `docs/qa/element-card-plan.md` and re-runs the 40 findings in
`docs/qa/element-card-results.md`. Nothing was fixed in this pass.

**How it was run**
- Playwright drove the headless shell (`chromium_headless_shell-1243`), one browser at a time. It ran against
  crafting-ui on :5180, the server that was already running.
- It also ran against a fresh copy of `overlay/demo`, `fixtures/.qa-ec`, served on 127.0.0.1:5191 with the plumb vite
  plugin through `~/.claude/bin/dev-server`. The copy was stopped and deleted at the end.
- The fixture has the same QA additions as the first pass (`Box`, `Panel`, `#qa-built`, `#qa-default`, a dark
  section, `#qa-grid`, `#qa-dyn`, `#qa-semi`), plus three new elements:
  - `#qa-fluid`: `text-[clamp(1.5rem,3vw,2rem)]`
  - `#qa-tern`: `className={tone ? '…' : 'grid'}`, a ternary of plain strings
  - `#qa-tpl`: a template literal in its own file, with plain classes and one `${…}`
- Every Alt+click sends an Alt keydown first, except the check for F4-01.
- The scripts are in `<scratchpad>/qa2/`: `lib.mjs`, `sweep.mjs`, `r1`–`r10` on crafting-ui and `f1`–`f8`/`r6` on the
  fixture. Their logs sit beside them. Screenshots are in `docs/qa/shots-retest/`.

**Writes and safety**
- Before the first write, `crafting-ui/src` was saved to `<scratchpad>/qa2/crafting-src-retest.tar`.
- Writes into shared components on crafting-ui were blocked at the network. A route on every write endpoint recorded
  the POST body and answered 409. Those endpoints are `swap(s)`, `set`, `prop`, `token`, `accept`, `apply*`,
  `recipes/apply`, `undo*` and `readiness/fix`.
- Real writes went only to crafting-ui page files, and each was undone through the overlay's Undo:
  - weight on `Hero.tsx:96`
  - layout, gap and padding on `MotionIndexPage.tsx:42` and `:79`
  - Undo left each file byte-exact (`r4b.log`, `r7.log`).
- Every fixture write was undone, and each Undo left the file exact.
- `overlay/src`, `src/` and `e2e/` were not touched. No git checkout, restore or stash was run in crafting-ui.
- **Final check:** `diff -r <scratchpad>/qa2/untar/src /Users/vijaysingh/unlocalhosted/crafting-ui/src` printed
  nothing and exited 0.

## Summary

| | Count |
|---|---|
| Fixed | 32 |
| Still failing | 8 (F3-04, F3-05, F3-06, F5-01, F5-03, F6-01, F6-05, F8-05) |
| Regressed | 0 |
| New findings | 13: 5 major, 4 minor, 4 polish |

Most new findings come from three of the fixes:
- **The class-site resolver** (N-02, N-03, N-04, N-05).
- **The recipe verdict** (N-01, N-13).
- **The text card's fluid-size lock**, which doesn't engage (N-06).

## The 40, retested

| ID | Was | Now | Evidence |
|---|---|---|---|
| F1-01 | major | **fixed**: the row reads `Link · a MotionIndexPage.tsx:79`, "draws 3 other places". The Layout write went to :79 (`grid sm:grid-cols-[…]` → `flex flex-wrap`, real write) and was undone exactly | `r1b.log`, `r7.log`, `r1b-row-layout-picked.png`, `r7-row-layout-written.png` |
| F1-02 | major | **fixed**: on Box, the spacing write goes to the usage at line 80 (`gap-[10px]` → `gap-s2`). Shadow's Writes targets line 80 | `f1.log`, `f2.log` |
| F1-03 | major | **fixed**: on Panel, Layout → Grid writes the usage at line 82 (`p-4 grid grid-cols-2 gap-2`), undone exactly. The location label is wrong, see N-03 | `f3.log` |
| F1-04 | major | **fixed**: Write it is enabled. The POST is `recipes/apply` with `forwards:true` to `SiteHeader.tsx:54` (blocked: shared). See N-01 and N-13 | `r1.log`, `r1-link-shadow.png`, `r1-link-motion.png` |
| F2-01 | blocker | **fixed**: the bubble reads `24 · 6 gap` on the window 14–36. A notch gives 28px and a real write of `gap-6` → `gap-7` at :42, undone exactly. 8×6px trackpad gives 20px. A 30px drag gives `gap-9`. Link padding reads `10 · 2.5` | `r1.log`, `r7.log`, `r1-gap-point.png`, `r1-gap-notch.png` |
| F3-01 | major | **fixed**: `cardOverFx:false` on every open in the sweeps of 5 pages at 1440px and 2 pages at 820px. With a cause held, the panel goes back to its one line when the card opens | `s-*.log`, `r2-phone-card-over-fx.png` |
| F3-02 | major | **fixed**: the strip's `.reel` scrolls (`overflow:auto`). The wheel reaches the last option: Sunken on crafting-ui's Link (scrollTop 10 → 365) and on fixture `#relative` (scrollLeft 20 → 2307) | `r2.log`, `r6.log`, `r2-link-shadow-strip-wheeled.png`, `r6-relative-strip-wheeled.png` |
| F3-03 | minor | **fixed**: `data-side` matches the geometry (fixture: "below", strip top 500 under the element's bottom 482; crafting-ui: "beside"). The copy is now "Pick a shadow in the strip." | `r6.log`, `r2.log` |
| F3-04 | minor | **still failing**, in part. The bubble no longer covers the card (bubble x 124–330, card x 338–614). With a card on `main`, pointing at the fix bar still shows `.sp-bub` "40 · 10 padding left" and lights main's left padding band | `r2b.log`, `r10-altclick-bar-main.png` |
| F3-05 | polish | **still failing**: at 1440 the dock, the setup callout and the Alt tip no longer overlap. At 820 the fix bar covers the tip ("…double-click text to edit it / Got it") and the callout sits on top of both | `s-narrow-home-words.png` (overlap `fx x tip`) |
| F3-06 | polish | **still failing in Blueprint**. Outside Blueprint: Esc 1 closes the card (bar on one line), Esc 2 closes the bar (fixed). In Blueprint: Esc 1 closes the card, Esc 2 changes nothing, Esc 3 leaves | `r2.log`, `r3b.log` |
| F4-01 | major | **fixed**: a click carrying altKey with no keydown opens the text card on Hero.tsx:96 | `r3.log`, `r3-no-keydown.png` |
| F4-02 | major | **fixed**: Alt held before the load, then a click: the card opens | `r3.log`, `r3-alt-before-load.png` |
| F4-03 | major | **fixed**: the Alt tip says "two-finger scroll walks up and down". Alt+wheel walks p → … → div#root. The card names the levels above as buttons. Alt+↑ from Hero.tsx:96 reaches div Hero.tsx:94 | `r3.log`, `r3b.log`, `r3-alt-wheel.png` |
| F4-04 | major | **fixed**: Alt+↑ and Alt+↓ climb and come back, and clicking `up[1]` opens the parent | `r3.log`, `r3b.log`, `r3b-textcard-up1.png` |
| F4-05 | major | **fixed**: in Blueprint, Alt+wheel leaves scrollY at 0 → 0 and walks the tag | `r3.log`, `r3-blueprint-altwheel.png` |
| F4-06 | major | **fixed**: in Blueprint, Alt+click on words opens the text card | `r3.log`, `r3-blueprint-altclick.png` |
| F4-07 | minor | **fixed**: the nav icon opens `Icon · svg SiteHeader.tsx:48`. Fixture `#icon` opens `svg App.jsx:30`, and Alt+↑ goes to the button | `s-home.log`, `r3-icon.png`, `r6.log` |
| F4-08 | minor | **fixed, by keyboard only**: from the text card of "Who" (Hero.tsx:195) or `#nested-button`, Alt+↑ opens that same element's box card (Shadow, Motion, Spacing). No click gets there, see N-09 | `r6.log`, `r3b.log` |
| F5-01 | minor | **still failing**: the weight field shows "6… Semibold" (`.val` scrollWidth 23 > clientWidth 19) on fixture `#qa-semi` and on crafting-ui "Saar Oz" | `r6-semi-weight.png`, `r4-saar-textcard.png` |
| F5-02 | major | **fixed**: in Blueprint the drift glow is a light wash under the words, and the hero paragraph, headline and lesson rows are readable | `r3-blueprint-altclick.png`, `r10-altclick-bar-main.png` |
| F5-03 | polish | **still failing**: tokens show where one matches (`fg`), but `oklab(0.136087 -0.00042401 -0.0046591)` still shows on `/motion` Link MotionIndexPage.tsx:115 and `oklab(0.0454757 0 0 / 0.526905)` on `/icons` IconsPage.tsx:52 | `s-motion.log`, `s-icons.log` |
| F6-01 | major | **still failing**: the swatches are now 24×24, but they stack in one column inside a 26px-tall menu. Only the first ("accent") hit-tests to itself; the other 24 sit under the card's lower rows. The keys still preview, and Esc restores | `r4b.log` (`hit` false for 7 of 8), `r4-color-menu.png` |
| F6-02 | major | **fixed** (colour): the PatternPage.tsx:184 h1 colour reads `oklch(0.13 0 0)`. The fluid size isn't locked, see N-06 | `r4.log`, `r4-lesson-h1.png` |
| F6-03 | minor | **fixed**: after 14 → 16px the leading reads 1.5 and the computed value is 24/16 | `r4.log`, `r4-size-right.png` |
| F6-04 | major | **fixed**: `#qa-dyn` shows "Its classes are built in code…" at rest. ↓ → Enter writes nothing | `f6-text.log` |
| F6-05 | minor | **still failing**, in part. The sentence no longer contradicts itself ("Fits as the title, above the body (12px)"). Typing `16` into the focused size field shows 16 but doesn't preview: the element stays 14px | `r6.log`, `r6-typed16.png` |
| F6-06 | minor | **fixed**: Style reads "Body 14px here" in coral | `r4.log`, `r3-blueprint-altclick.png` |
| F6-07 | minor | **fixed**: a 20px drag left reaches 12px (was 220px), and no step is struck | `r6.log`, `r6-drag-left.png` |
| F6-08 | polish | **fixed**: the pill reads "56px", whole | `r4.log`, `r4-drag-band.png` |
| F6-09 | minor | **fixed**: focus moves into the card on open (the style field). Tab walks size, leading, tracking, weight, case, colour and Show. The spinbuttons have `tabindex=0` and `aria-valuenow` | `r4.log`, `f5-cross.log` |
| F7-01 | major | **fixed**: SyncRow Tidy lists only "Padding 10px → 12px". No corner change | `f3.log` |
| F7-02 | major | **fixed**: `#wrapper` Tidy lists only padding. No `rounded-[0px]` | `f3.log` |
| F7-03 | minor | **fixed**: the write is `py-s3 px-[14px]`, so only the listed sides change | `f3.log` |
| F7-04 | minor | **fixed**: Box A lists only "Padding 14px → 16px" and writes `p-s4`. The detail text size isn't touched | `f3.log` |
| F8-01 | major | **fixed**: the dragged curve writes `--ease-lift: cubic-bezier(0.4, 0, 0.2, 1.5)` and `ease-lift` | `f4.log` |
| F8-02 | minor | **fixed**: the chips read `10rem 1fr auto` at 1440. The column-line drag writes `sm:grid-cols-[200px_1fr_auto]` | `r1b.log`, `r8.log`, `r8-col-drag.png` |
| F8-03 | minor | **fixed**: the note reads "Its exit plays when something sets data-state="closed" on it. Nothing does yet…" | `f4b.log` |
| F8-04 | major | **fixed**: Shadow on `main` opens its strip in 331ms with one long task of 254ms. Copies are capped at 305 nodes (was 1928ms). A text drag keeps a 16.7ms median | `r5-perf.log`, `r5-big-strip.png` |
| F8-05 | minor | **still failing**: the cause `fr` says "1 place in your code · 60 here" and also "The same code draws 854 other places on this page." | `r5-fx.log`, `r5-show-fix.png` |

## New findings

### N-01 · major · Picking shadow-2 shows `shadow-1` in Writes. The engine calls them "the same"
- **Page and element:** crafting-ui `/`, nav `a[href="/motion"]` (written at SiteHeader.tsx:54).
- **Steps:** Alt+click the element, open Shadow ›, then pick the second option, `y:2`.
- **Expected:** Writes shows `shadow-2`, the shadow the element shows in the preview.
- **Actual:**
  - The element previews shadow-2 (`oklch(0 0 0 / 0.32) 0 0 0 1px`).
  - Writes shows `+ … focus-visible:outline-offset-[-4px] shadow-1 …`.
  - Write it POSTs `{"recipe":"--shadow-2","forwards":true}`.
  - `recipes/preview` for `--shadow-2` answers `"class":"shadow-2"` but `"verdict":{"kind":"same","text":"same as your shadow-1"}`.
  - The two tokens differ only in colour: `var(--line)` against `var(--line-strong)`.
- **Evidence:** `r2b.log` (both preview bodies), `r2b-link-shadow-y2-writes.png`, `r2.log` (`pick 1 y:2 writes+ ["shadow-1"] POST recipe ["--shadow-2"]`).
- **Cause:** new. The recipe verdict ignores the colour token when it compares shadows, so "use yours" picks the
  nearest shadow.

### N-02 · major · A spacing notch on a template-literal usage writes into a ternary branch, beside the padding it means to change
- **Page and element:** crafting-ui `/`, nav Link.
  - Its padding is `px-2.5`, inside the `look` variable at SiteHeader.tsx:44.
  - Its className at :54 is `` `${look} … ${on ? '' : 'hover:… active:bg-surface-pressed'}` ``.
- **Steps:** Alt+click the Link. Point at its left padding (the bubble reads `10 · 2.5 padding left`), then scroll one
  notch.
- **Expected:**
  - `px-2.5` is changed where it's written, or the edit is refused.
  - If it is appended, it goes where every tab gets it, since the card says "The same code draws 3 other places… A
    change here changes them too."
- **Actual:**
  - The POST is `{"file":"src/components/SiteHeader.tsx","edits":[{"line":54,"column":11,"from":"active:bg-surface-pressed","to":"active:bg-surface-pressed pl-3"}]}`.
  - So `pl-3` lands inside the `on ? '' : '…'` false branch. The current tab wouldn't change, and `px-2.5` stays
    alongside `pl-3`.
  - The write was blocked, because SiteHeader is shared.
- **Evidence:** `r1.log` ("link spacing POST"), `r1-link-spacing.png`.
- **Cause:** new, from the class-site resolver (cc1df9c). The usage's last plain-string token is treated as the place to
  append.

### N-03 · minor · Panel's card and Writes name App.jsx:71, but the layout write lands at App.jsx:82
- **Page and element:** fixture `Panel`.
  - Its definition is at line 71: ``rounded-card bg-surface shadow-rest ${className}``.
  - Its usage is at line 82: `p-4 flex gap-2`.
- **Steps:** Alt+click just outside `#qa-panel-a`. Open Layout › and choose Grid, then Write it.
- **Expected:** the header and Writes name the line that will be written.
- **Actual:**
  - The header reads `Panel · div App.jsx:71`. Writes reads `Panel / App.jsx:71 / - flex / + grid grid-cols-2`.
  - The write lands on line 82, and afterwards the header reads `App.jsx:82`.
  - Shadow on the same card writes line 71 (`shadow-raised` into the component, so every Panel changes), with no
    "N like it" warning.
- **Evidence:** `f2.log` ("panel card", "panel shadow writes"), `f3.log` ("panel layout after Write it").
- **Cause:** new, from the class-site resolver. Each field resolves its own site, but the header and Writes show the
  first one.

### N-04 · major · Plain-string classNames under a ternary or template are locked as "built in code", and the lock is inconsistent
- **Page and element:**
  - Fixture `#qa-tern`: `className={tone ? 'flex gap-s2 p-s3 rounded-card bg-surface' : 'grid'}`.
  - crafting-ui SiteHeader.tsx:81 (the header): a ternary whose branch is a template.
  - SwipeToDismissDemo.tsx:495: `desktop ? '…grid w-80 gap-2' : 'grid h-full …'`.
  - Sheet.tsx:128: `` `group/cell relative flex … px-2 pt-5 pb-4 outline-none ${here ? 'text-draw' : 'text-faint'}` ``.
- **Steps:** Alt+click each element.
- **Expected:** commit cc1df9c says "classes built in code with no plain string anywhere are refused". Each of these has
  plain strings.
- **Actual:**
  - All four show "Shadow Set in code / Motion Set in code / Layout Set in code. Its classes are built in code, so
    they can't be changed here."
  - Yet fixture `#qa-tpl`, a template with `${…}` in its own file and the same shape as Sheet.tsx:128, is writable:
    a notch wrote `pl-s4` inside the template and undid exactly.
  - SiteHeader.tsx:54, also a template, is writable too.
- **Evidence:** `r6.log`, `r6-qa-tern.png`, `r6-qa-tpl.png`, `s-lesson.log`, `s-icons.log`, `s-home.log` ("large").
- **Cause:** new, from the class-site resolver's refusal rule.

### N-05 · minor · On a locked card the spacing grammar still takes the wheel, then writes and says nothing
- **Page and element:** fixture `#qa-tern` and `#qa-built`, whose cards are locked.
- **Steps:** point at the left padding, then scroll one notch.
- **Expected:** no bands on a locked element, or the refusal said when the wheel is used.
- **Actual:**
  - The bands light and the bubble shows `12 · s3 padding left` with its scale.
  - The notch is taken, but nothing is written (diff empty) and nothing is said (`.said` empty).
- **Evidence:** `r6.log`.
- **Cause:** new. The lock covers the drills but not the spacing layer.

### N-06 · major · Fluid sizes (`text-[clamp()]`) are neither locked nor said; stepping replaces the clamp with a fixed size
- **Page and element:** crafting-ui `/patterns/swipe-to-dismiss` h1 PatternPage.tsx:184
  (`text-[clamp(2rem,3.4vw,2.75rem)]`), and fixture `#qa-fluid`.
- **Steps:** Alt+click the element, ↓ to the size field, press →, then Enter.
- **Expected:** commit 3a0aa2e says "a fluid size (clamp) is read as the size it is now, said plainly and locked".
- **Actual:**
  - On crafting-ui:
    - There is no lock and no note.
    - → previews 44 → 56px.
    - Enter POSTs `{"url":"/__plumb/set","body":{…"PatternPage.tsx","line":184,"key":"font-size","token":"5xl"}}`
      (blocked), which would replace the fluid size with `text-5xl`.
  - On the fixture:
    - → (bigger) takes 32px to 14px, the top of a 12/14 scale.
    - Enter wrote `className="text-body font-semibold"` over the clamp. The write was undone, and the file came back
      exact.
- **Evidence:** `r4.log`, `r6.log`, `r4-lesson-h1.png`, `r6-fluid.png`.
- **Cause:** new. The fluid read in the text card doesn't engage for `text-[clamp(...)]`.

### N-07 · major · Tidy on crafting-ui's Phone lists one no-op change ten times and would write it five times
- **Page and element:** crafting-ui `/`, Phone (blueprint.tsx:107).
- **Steps:** Alt+click the Phone, then choose Tidy this card.
- **Expected:** each change listed once, and only real changes.
- **Actual:**
  - The list is "10 CHANGES", all the same line: "Weight of 'Dismiss' Regular → Light. A step below the line above
    it…"
  - The "Dismiss" labels already compute `font-weight: 300` through their `label` class.
  - Write it reads "Reading what it writes…" (disabled) for about 6s.
  - It then POSTs five identical edits to `SwipeToDismissDemo.tsx` (`{"line":517,"column":42,"from":"","to":"font-light"}` ×5). The write was blocked.
- **Evidence:** `r8c-phone-tidy.png`, `r8c.log`.
- **Cause:** new 7 (Tidy). Proposals aren't de-duplicated across copies drawn by the same code, and the weight is read
  from classes, not from the computed style.

### N-08 · minor · "N problems here" for one element changes with the mode
- **Page and element:** crafting-ui `/`, Hero.tsx:96 paragraph.
- **Steps:** open the text card outside Blueprint, then open it again in Blueprint.
- **Expected:** one count for one element.
- **Actual:** outside Blueprint it says "3 problems here". In Blueprint it says "60 problems here", which is the
  page-wide place count of the cause `max-lg:text-[1.0625rem]`.
- **Evidence:** `r4-color-menu.png` (3), `r3-blueprint-altclick.png` (60).
- **Cause:** new, the same kind as F8-05 (counts).

### N-09 · polish · ⌥↑ from a text card opens the same element's box card, while the up buttons beside the hint go to the parent
- **Page and element:** crafting-ui `/`, Hero.tsx:96 paragraph.
- **Steps:** open the text card, then press Alt+↑.
- **Expected:** ⌥↑ and the up buttons go to the same place.
- **Actual:**
  - Alt+↑ gives the box card of `p Hero.tsx:96`, and a second Alt+↑ gives `div Hero.tsx:94`.
  - `up[1]` gives `div Hero.tsx:94` straight away.
  - For about 0.5s after the first Alt+↑, the card shows only "⌥↑ p 3 problems here", with no fields.
- **Note:** this is also the only way to reach a button's own box (F4-08), and nothing says so.
- **Evidence:** `r3b.log`, `r3b-textcard-climb.png`.
- **Cause:** new, from parent climbing.

### N-10 · polish · Text card values: unrounded and blank
- **Actual:**
  - At 820px wide, the size of Hero.tsx:150 reads `27.06 px`.
  - On fixture `#qa-semi` (`text-title font-semibold`, where `text-title` isn't in the theme), the colour field is
    blank: just "▾".
- **Evidence:** `s-narrow-home-words.png`, `r6.log` ("semi colour field ▾").
- **Cause:** 5 (Polish).

### N-11 · polish · Blueprint's fix pill sits under the open card and the spacing bubble
- **Page and element:** crafting-ui nav Link, with the card open and its padding pointed at.
- **Actual:** the pill "px-2.5 → pl-1.5 pr-2.5" (at 244,63 to 408,87) is covered by both, and a sliver of it shows
  between them.
- **Note:** the sweep reports `bp-hint pill x ec` on all 5 pages, plus the input pill on `/motion`.
- **Evidence:** `r2b-link-bubble.png`, `s-*.log`.
- **Cause:** 3. The one-owner and placement rule doesn't include Blueprint's pills.

### N-12 · polish · The Motion strip offers the same option twice
- **Page and element:** crafting-ui nav Link, Motion ›.
- **Actual:** the strip's keys are `y:ease-out, y:ease-out, y:ease-in, …`. The first two are the same option.
- **Evidence:** `r1.log` ("motion shots").
- **Cause:** new (recipes).

### N-13 · minor · A motion pick replaces the project's duration token with a raw value
- **Page and element:** crafting-ui nav Link (SiteHeader.tsx:54 has `transition-colors duration-fast`).
- **Steps:** open Motion › and pick the second option.
- **Expected:** keep `duration-fast`, or say the token is replaced.
- **Actual:** Writes shows `- transition-colors duration-fast` and `+ transition duration-150 ease-out`. The project's
  token is replaced by Tailwind's default, and nothing says so.
- **Evidence:** `r1.log` ("F1-04 motion writes").
- **Cause:** new (recipes).

### Observations not counted
- **The `main` card on `/motion` was once slow to fill in.** In one of two runs, its fields hadn't appeared 2.5s after
  the click, and the Shadow strip never opened within 30s. The other run opened it in 331ms. Swap was at 11 GB, so
  this isn't confirmed (`r5-perf.log`, second run).
- **Console noise on the fixture:** a few "Failed to load resource: 400" errors during refusals (`f1.log`, `f3.log`).
  They didn't reproduce in a targeted run (`r9`).
- **Alt+click on the fix bar opens the page element under it** (`main`), so "an element under the fix bar" can now be
  reached (`r10.log`).

## Coverage

"passed": the behaviour was seen working. "failed" names the finding. "not run": the cell wasn't tested this pass.

### Pages × element kinds (does Alt+click open the right card, clear of the other surfaces?)

| Element kind | `/` | `/motion` | `/patterns/swipe-to-dismiss` | `/icons` | `/how-its-made` | fixture |
|---|---|---|---|---|---|---|
| words | passed | passed | passed | passed | passed | passed |
| container with padding | passed (Phone) | passed (Plate) | passed (Phone) | locked, N-04 (Sheet button) | (hit a Link) | passed |
| grid or list | passed (climb to Hero.tsx:94) | passed (row, :42 column) | locked, N-04 (demo grid) | passed (Bench figure) | passed (Link grid) | passed |
| image | (none) | (none) | (none) | passed (Appendix img) | (none) | passed |
| SVG or icon | passed (svg) | passed | passed (SeenIn svg) | passed | passed | passed |
| button | text card, box by ⌥↑ (F4-08 and N-09) | text card | svg in button | text card | (none) | text card, then ⌥↑ |
| input | (none) | passed (no Layout) | (none) | (none) | (none) | passed |
| shared component (Link, SiteHeader) | opens at the usage; writes blocked; N-01, N-02, N-13 | passed (writes real at :79) | passed | passed | passed | Box and Panel passed; N-03 |
| className built in code | header locked (N-04) | n/a | demo grid locked (N-04) | Sheet locked (N-04) | n/a | `#qa-dyn` and `#qa-built` locked (pass); `#qa-tern` locked (N-04) |
| inside something closed (details) | (none) | (none) | (none) | (none) | (none) | summary opens the text card; the body can't be reached (as before) |
| under the fix bar | — | passed (Alt+click goes through to `main`) | — | — | — | — |
| very large element | header locked (N-04) | passed (F8-04 fixed) | passed | passed (2.0s to open; overlaps the dock) | — | — |

### Features × states

| Feature | rest | hover / point | focus (keys) | open | dragging | written + Undo | undone (exact) | reload (resume) | refused | error | empty |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Text card: style menu | passed (F6-06) | — | passed | not run | — | not run | — | — | — | — | — |
| Text card: size | passed | — | passed | passed | passed (geared, Esc restores) | passed (fixture) | passed | — | failed N-06 (fluid not locked) | — | — |
| Text card: leading | passed (F6-03) | — | passed | passed | not run | not run | — | — | — | — | — |
| Text card: tracking | passed | — | passed (Tab) | not run | not run | not run | — | — | — | — | — |
| Text card: weight | failed F5-01 | — | passed | passed | — | passed (crafting-ui Hero.tsx:96, real) | passed (exact) | — | — | — | — |
| Text card: case | passed | passed | passed (Tab) | — | — | passed (fixture UPPER) | passed | — | — | — | — |
| Text card: colour menu | failed F5-03, N-10 | failed F6-01 | passed (keys preview, Esc restores) | failed F6-01 | — | not run | — | — | — | — | — |
| Text card: typing, Enter, Esc | — | — | failed F6-05 (no preview) | — | — | — | — | — | — | — | — |
| Text card: scale, marks, sentence | passed | — | — | — | — | — | — | — | — | — | — |
| Text card: built in code | — | — | — | — | — | — | — | — | passed (F6-04) | — | — |
| Element card at rest: header, ups, reach line, fields | passed; N-03 | — | passed (Tab: ups, drills) | passed | — | — | — | — | passed (lock said); N-04 | — | — |
| Climbing (ups, ⌥↑ ⌥↓, Alt+wheel) | passed | passed | passed; N-09 | — | — | — | — | — | passed (div#root "Can't reach") | — | — |
| Placement, scroll, resize, caret and ring | passed (sweeps; resize puts it above) | — | — | — | — | — | — | — | — | — | — |
| Shadow › strip, verdicts, preview and restore | passed (F3-02, F3-03) | passed (exact restore) | passed (↓) | passed | — | passed (fixture Raised, styles.css + App.jsx) | passed | passed (1 reload, said + Undo back) | passed (blocked shows reason) | — | passed ("Nothing to write") |
| Shadow: Writes = engine | failed N-01 | — | — | — | — | — | — | — | — | — | — |
| Shadow light pad (sun, halo) | passed | — | passed (→→ 6°) | — | passed (softness 1 → 1.53) | — | — | — | — | — | — |
| Shadow choices (add one / change everywhere) | passed (Writes changes) | — | — | — | — | — | — | — | — | — | — |
| Motion › tabs, strip, cursor | passed; N-12 | — | — | passed | — | passed (fixture Lift) | passed | — | — | — | — |
| Motion curve handles, overshoot | passed (F8-01) | — | — | — | passed | — | — | — | — | — | — |
| Motion timeline, ghost, R | passed | — | passed (R) | — | passed (−6px) | — | — | — | — | — | — |
| Motion entrance-only note, tokens | passed (F8-03); failed N-13 | — | — | — | — | — | — | — | — | — | — |
| Layout › Flex/Grid, direction, wrap | passed | passed | — | passed | — | passed (crafting-ui :79 real; fixture `#qa-grid`, Panel) | passed | — | — | — | — |
| Layout track chips, + and − | passed (F8-02) | — | — | — | passed (column line 160 → 200px) | passed (fixture) | passed | — | — | — | — |
| Layout subgrid | not run (switch not found by the script) | | | | | | | | | | |
| Spacing bands, edit-through | passed (child band through the parent card) | failed F3-04 (bubble over the bar) | — | — | — | — | — | — | failed N-05 | — | — |
| Spacing: notch, trackpad, drag | passed (crafting-ui and fixture) | — | — | — | passed | passed (crafting-ui :42 and :79 real; fixture) | passed | — | passed (`#qa-built`) | — | — |
| Spacing: where it writes | failed N-02 (ternary branch) | — | — | — | — | — | — | — | — | — | — |
| Spacing ⇧ and ⌘ | passed (2 and 4 bands) | — | — | — | — | passed (⌘ Enter `p-s4`) | passed | — | — | — | — |
| Spacing bubble | passed | — | — | — | — | — | — | — | — | — | — |
| Spacing: Esc puts back, page stays put | passed (scrollY +0) | — | — | — | — | — | — | — | — | — | — |
| Tidy: offered, plain words, Space | passed (no rule ids) | — | — | passed | — | passed (fixture, one batch) | passed (one Undo) | — | — | — | passed ("Nothing to tidy", crafting-ui row) |
| Tidy: what it changes | passed on the fixture (F7-01 to F7-04); failed N-07 on crafting-ui | — | — | — | — | — | — | — | — | — | — |

### Cross-cutting

| Cell | Result |
|---|---|
| One surface at a time | passed at 1440 (card and bar, bubble and card). Failed: F3-04 (bubble over the bar), F3-05 (820: tip under the bar), N-11 (pills) |
| Narrow viewport (820×900) | cards in view, sides left, right and below, no `cardOverFx`; fails F3-05 |
| Dark ground (fixture) | passed (strip ground `rgb(21,24,27)`) |
| prefers-reduced-motion (fixture) | passed (no card or strip animations; R doesn't play) |
| Keyboard only | passed: focus in the card, Tab through the fields, ⌥↑ ⌥↓, ↑↓ Enter Esc |
| Accessible names and roles | passed: dialog "Edit X", spinbuttons with value now, listbox "Shadows", ups group |
| Console and page errors | no page errors on any run; 409 on blocked writes (expected) |
| Performance | passed (F8-04): strip on `main` in 331ms; text drag median 16.7ms. One run slow, not confirmed |
| Resume after a write's reload | passed (fixture shadow theme write: 1 reload, Undo back, exact) |
| Alt+B and Esc | F4-05 and F4-06 fixed; F3-06 still in Blueprint |
| Alt+click with no keydown, Alt held before focus | passed (F4-01, F4-02) |

## Final crafting-ui diff

`diff -r <scratchpad>/qa2/untar/src /Users/vijaysingh/unlocalhosted/crafting-ui/src` printed nothing and exited 0. The
backup was taken before the first write and is
`/private/tmp/claude-501/-Users-vijaysingh--claude-spares-spare-vzhCpS/f8e9839e-2f17-48c8-a49a-ffeae6eeae2f/scratchpad/qa2/crafting-src-retest.tar`.
