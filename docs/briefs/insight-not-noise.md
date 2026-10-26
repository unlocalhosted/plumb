# Insight, not noise: one verdict per element, fixed in place

Status: design, 2026-10-27. No code. Owner: "nothing in the demo works for real" and "i don't like the popover cards,
it all reads like noise instead of insight and fix". Written against the main checkout after reading the blueprint,
craft, chooser, box-model, scrub, changes and session code, and after driving the demo (`/?craft` and `/`) with
Playwright, blueprint on, chooser open, exactly as the owner sees it.

## 0. The system behind the symptoms

What the owner met, and what produced it:

| Symptom | What is actually true in the code |
| --- | --- |
| Pressed Write on `text-[11px] → text-small` on the STATUS label; "nothing happened" | The write landed (`swap`), the drift mark left, but the craft mark on the same element (`craft/tracking`, letter-spacing) stayed. Two engines, two marks, one element; nothing owns the element |
| Clicking the element does nothing | Only a 14px `.hit` rect or a `.lbl` pill opens anything (`blueprint-marks.js` `pick`). The glass makes the element itself inert; `#point` only lights breaks |
| The "good" column of `/?craft` is covered in coral | The fixture's correct answers are off the theme (`pl-5`, `text-[40px]`, `text-[11px]`); craft's suggestion `pl-5` (`space()` in `craft-rules.js`, review H5) is not on the project's `s1…s6` scale, so drift flags the fix. Fixes are never tried against the theme before they are offered (hierarchy layer 3 is unbuilt) |
| The card reads as noise | `blueprint-fix.js #render` prints, for one finding: title sentence, strike-through `from → choose below`, `12px`, a hint sentence, a grey `Change … to …` note repeating the title, a `yours` pill, the option pill, the option's why, a `because` paragraph, `also/with` lines, `Reading · 1 of 38 · Write`, and a five-item key legend. Eleven things to say one |
| The Bret Victor pieces exist but never appear | `boxmodel.js`, `scrub.js`, `changes.js`, `editor-primitives.js` are imported only by `overlay/demo/primitives.html`. The live overlay (`widget.js`, `blueprint*.js`) does not import any of them. Two interfaces were built; the page got the one made of words |

One gap under all five: **the overlay has no unit that is the element.** Marks are per finding, picks are per mark,
writes are per pick, verification is per nothing. So a finding can be "fixed" while its element stays loud, the only
clickable things are the findings' own 14px boxes, and the only place a finding can explain itself is a card of
sentences beside it.

The replacement, in one sentence: **one element, one verdict, drawn and fixed in place.** The verdict merges every
engine's claims per facet, carries only fixes that have been tried and found quiet, is shown as a drawing on the
element (band, ghost, staircase, reason glyph), is accepted by a drag or one key, becomes a pending change in the
Changes sidebar beside hand edits, and after the write the element is read again and must be quiet, or the sidebar
says it is not. Words exist, on demand, one line.

## 1. The unit: one element, one verdict

### 1.1 Shape

```js
// overlay/src/verdict.js (new; absorbs craft-arbitrate.js and model.js's "first mark per site wins")
Verdict {
  el, name,                       // the element and its lilac tag (component or tag name)
  site: { file, line, column, hash } | null,   // from locate() + props; null when no line can be tied
  siblings: [el…],                // every DOM element drawn by the same JSX site (rows of one line)
  facets: Map<facet, Claim>,      // facet vocabulary from craft-facets.js; one Claim per facet
  quiet: boolean,                 // facets.size === 0
}
Claim {
  facet,                          // 'padding-x', 'letter-spacing', 'color', …
  kept: Finding,                  // highest (tier, confidence) after refines; family drift | craft | habit
  also: [Finding…],               // folded, for the one-line why on demand only
  prop, value,                    // the live CSS property and px/rgb the band and ghost draw from
  fix: Fix | null,                // a verified edit, or null
  whyNot: 'no-step' | 'higher-tier' | 'dynamic' | 'no-site' | 'library' | 'untriable' | null,
}
Fix {
  kind: 'class' | 'inline' | 'stylesheet',   // which server verb: swap / set, set, apply(replacement)
  from, to,                       // classes or value text
  sets: { paddingLeft: 12, … },   // what it does to computed style, for the ghost and the virtual re-run
  step: { token, n } | null,      // the scale step it lands on (the staircase's target)
  proof: { theme: 'on' | 'rewritten', above: 'clear', after: 'clear' },  // what was tried, see 1.3
}
```

The verdict is pure over `{ marks (server), craft findings, facts, theme, site }`. It runs where `Craft.enrich`
runs today (the reader's `enrich` callback in `blueprint.js`), replacing `arbitrate()` and the ancestor dedupe, and
also for an Alt-inspected element outside blueprint, so there is one law on both paths.

### 1.2 Merge, per facet (what the hierarchy brief already decided, now for every family)

1. Annotate every finding on the element with `tier`, `facets`, `once` (`craft-facets.js`; server marks via `TIERS`
   until the server writes its own). A drift mark's facet is `facetOfClass(mark.text)`; a habit's is from its props.
2. Fold `refines`, then rank by `(tier asc, confidence desc)`; one kept finding per facet, the rest `also`.
3. Compose on the kept one: `after` rules re-run on `facts.with` (exists in `craft.js`), disjoint classes merged.
4. **Cross-facet re-run (new).** A fix on facet A changes computed style; every rule on the element is re-run on the
   virtual facts of A's fix. A rule that *starts* firing becomes a claim on its facet marked `after: A`; a rule that
   *stops* firing retracts its claim. This is the STATUS case: `text-[11px] → text-small` changes font-size; tracking
   is re-run on 12px uppercase, still fires, so the verdict holds two facets, both shown, and "applied" is only when
   both are written. It is also the inner-outer case the other way round: fixing the outer gap can quiet the inner.
5. Dedupe by `once` (`ancestor | group | page`) across elements, as the hierarchy brief says.

### 1.3 Fix-of-fix: a fix is offered only after it has been tried

`verify(claim, el, facts, theme)` runs before any fix reaches a drawing:

| Check | How | Fail → |
| --- | --- | --- |
| **Triable** | `theme.styleOf(to)` resolves every class to px/rgb: the probe (`Theme#measure` pattern: set the class on a hidden `<i>` and read computed style), else the scale tables | `whyNot: 'untriable'` |
| **On the theme** | for each facet the fix sets, `theme.tokenOf(family, px)` names a step (the overlay's mirror of `provenance.ts`'s identity rule; numeric Tailwind steps only when `theme.unit()` resolves and the project allows them) | rewrite to the nearest step **in the kept rule's direction** (`ceil` for input-zoom and hit-target, `floor` for inner-outer, nearest for concentric) and re-check the kept rule; no step → `whyNot: 'no-step'` |
| **No higher tier fires** | every rule with `tier ≤ kept.tier` over `facts.with(el, fix.sets)` | `whyNot: 'higher-tier'` (the fix would make it less readable or less reachable) |
| **No drift on the result** | the on-theme check above covers classes; for `kind: 'inline'` the value must be `var(--token)` | as on-theme |
| **Writable** | `site` exists; the className is static (`props.dynamic` absent); the opening is not a component usage (`locate.usage`, review H2); `from` is on the element's authored class list (not a variant) | `whyNot: 'no-site' | 'dynamic' | 'library'` |

`proof` records what passed so the drawing can show "rewritten" (the staircase's target is one step from where
craft first pointed, with a short tick where it pointed). The fixture bug (`pl-5`) ends here: craft points at 20px,
the theme has `s5 = 20px`? then `pl-s5`; else the nearest allowed step toward 2:1, and if none, `no-step`.

### 1.4 When no verified fix exists

The claim still exists and the facet is still drawn coral; what changes is the affordance. Each `whyNot` has one
visual, no sentence:

```
 no-step      the staircase is drawn with a gap where the step would be: ▮ ▮ ▮ ▯ ▮   (hollow bar at the missing step)
 higher-tier  the target bar is drawn, then struck by a coral tick, and the tier glyph (eye = access, Aa = legibility) sits on it
 dynamic      the facet band is cross-hatched (the "set in code" pattern) instead of flat; no staircase
 no-site      the lilac name tag has no file dot (a filled dot = located); the band is drawn, nothing is draggable
 library      the band is drawn; the name tag shows the wrapper's name with ▸ (fix lives one level up: Alt+↑ goes there)
 untriable    the band is drawn; the staircase is replaced by a single "?" rung
```

Pointing at the band for 600ms (or pressing `i`) gives the one line of words for that case (section 2.5).

## 2. Replacing the card: the fix drawn on the element

The chooser card (`blueprint-fix.js #render`, `choices.js` forms) goes. In its place, one on-element component,
`fix-in-place.js`, built from pieces that already exist and were proven in the gallery:

| Piece | From | Role here |
| --- | --- | --- |
| element ring + name tag | `boxmodel.js` (content outline, `pl-tag`) | the element is selected; the only words at rest are its name |
| facet band | `boxmodel.js` bands (`m`, `p`, `g`, `b`, `line`), hue from verdict | the claimed facet lit coral; other bands drawn sky, faint |
| ghost | new, drawn by `boxmodel.js` from `fix.sets` | the element as the fix leaves it: a dashed sky edge where the band's inner edge will be, a second arc for radius, a second line box for type |
| staircase | `editor-primitives.js stepper` | the scale along the band's axis, on the element: current value a coral notch, target a sky ringed bar |
| drag | `scrub.js` | grab the band, pointer locks, movement snaps through the steps; letting go on the target accepts |
| reason glyph | new, `reason.js`, one small SVG per rule family | why, as a drawing (2.4) |
| value pill | `language.js .pl-pill` | one pill, only for what is pointed at (`pointAt`) |

### 2.1 States of one facet on one element (spacing, the most common)

```
 rest (blueprint on, not selected)      the element cut out of the dim, outlined coral (as today); no breaks, no words

 pointed                                the coral outline thickens; the claimed band tints; one pill at the pointer:
                                            ┌──────────────┐
                                            │▒▒│ ● Save    │        ▒ = padding-left band, coral hatch
                                            └──────────────┘  ⟨pl · s3 · 12⟩

 selected (click anywhere on it, or Tab/J)  ring in sky, name tag above, the facet band coral, the ghost dashed:
                                            Button
                                            ┌──────────────────┐
                                            │▒▒┆ ● Save        │     ┆ = ghost edge where pl will be (16px in)
                                            └──────────────────┘
                                              ▁▂▃▅▇              staircase under the band's axis: bars s1…s6,
                                              ▁▂▃●▇              ● = target (s4) ringed sky, the coral notch at s3
                                            ⟨◔⟩                 reason glyph at the band's end (2:1 bracket)

 target pointed / focused               the page previews the fix (classes swapped on the element, as `#set` does now);
                                        the ghost becomes solid; the pill names the step: ⟨pl · s4 · 16⟩

 dragging (pointer lock)                the grip glyph where the press was; the band's inner edge follows the step;
                                        the pill moves with it; Esc puts it back

 accepted (Enter, Space on the target, or release on it)
                                        the ring turns to marching ants (picked, not written); the band mint;
                                        the row appears in Changes (section 4); the next facet of the element
                                        becomes current (2.3) or, when there is none, the next element

 written                                ants settle to a solid mint line (visual-language §4); the element is read
                                        again; quiet → the ring fades and the dim closes over it

 still loud after write                 the ring stays, in coral, with the remaining facet's band lit; Changes keeps
                                        the row with a coral band (4.3)

 no verified fix                        the band and ring as selected; the staircase in its whyNot form (1.4)

 disabled (health failed / file stale)  the ring is drawn hollow grey; nothing previews; the dock says why (it does)

 loading (verdict not in yet)           the ring in sky with the shimmer; no band yet; Tab can still select it

 error (write refused)                  the ants stop and turn coral for one beat; the row in Changes carries the
                                        reason as its one line; the preview stays
```

Per family, the band and ghost are the box model's own drawing (visual-language "DOM's building blocks"): padding
hatch, margin dither, gap stripes, radius arc, line box with dashed baseline, a border band. Colour has no band: the
fix is a swatch pair on the element's corner (now | then) with the ghost being the text itself repainted on preview.
Shadow: the ghost is the shadow previewed, the staircase is the `shadows` tiles. Font size: the second line box, and
the `Ag` ladder along the line.

### 2.2 Motion and physics

- Ring, tag, staircase pop in on `--pl-spring-pop` (260ms, overshoot ~4%), staggered 0 / 40 / 80ms. Leaving: fade 120ms.
- Staircase target slides on `--pl-spring` (`place()` in editor-primitives already does this for the fill).
- Drag: STEP = 22px per step (scrub.js). The band's edge animates between steps with the same spring, 120ms, so a
  fast drag still reads as stepping, never sliding; the pill pops once per step (`data-moved`).
- Ants march 600ms per lap; written settles over 240ms as the dashes close into a line.
- Preview on hover is instant (the page itself changes); nothing in the overlay animates then.
- Reduced motion: no pop, no march, no slide; states change at once.

### 2.3 Several facets on one element

The staircase and glyph show one facet at a time; the other claimed bands stay lit coral so the eye knows there is
more. A small facet rail sits in the name tag: one dot per facet, the current one filled (`Button ●○`). `.` / `,`
(or `→ ←` when nothing in the staircase has focus) cycle; accepting a facet moves to the next; `Shift+Enter` accepts
every facet that has a verified fix at once. Pointing at a different band of the same element makes it current.

### 2.4 Why, as a drawing (reason.js)

One glyph per *kind of evidence*, 16×16 on the page, 48×48 when pointed at. Rules share glyphs by what they
measured, so 32 rules need about ten drawings:

| Evidence | Glyph | Rules |
| --- | --- | --- |
| a ratio of two lengths | two bars with the ratio bracket `2:1` as lengths, not digits | button-padding, icon-side, inner-outer |
| two arcs that should be concentric | the parent's arc and the child's arc, offset | concentric-radius |
| contrast | two swatches, text on ground, and a short bar whose length is Lc | contrast, disabled-contrast, text-opacity |
| a minimum size | a 24px square drawn at true size over the element's box | hit-target, input-zoom (16px glyph) |
| a measure | a ruler of 45–75 ch over the paragraph's first line | measure, heading-widow |
| off the pixel grid | a 1px stripe pattern with a half-pixel seam | half-pixel, hairline |
| a light source | one arrow for where light comes from, the shadow drawn under | one-light, layered-shadow, border-on-shadow |
| a scale | the staircase itself, the value notched off a step | every drift rule |
| the same thing, different | three avatars with one bigger | media-size, caps-case, tabular-nums |
| time | a short timeline with a jump | bold-hover, scale-from-zero, reduced motion habits |

The glyph is the only new drawing work per rule; a rule declares `evidence.kind` and the numbers, `reason.js` draws.

### 2.5 Where words are allowed

- At rest: the name tag. Nothing else.
- Pointed: one pill, one value (`pl · s3 · 12`), the token and number only.
- On demand (hold on the reason glyph 600ms, or `i` with an element selected): **one line**, ≤ 72 characters, in a
  pill under the staircase: the kept finding's `what` (the short form that already exists: "icon side padded like the
  text side"), then `· also n` when folded claims exist. A second `i` cycles to the folded ones. Never a paragraph; the
  `because` text and the full reading move to the pinned card (`Reading` already exists for that).
- Changes sidebar: the per-element rows (section 4), which are tokens and arrows, not sentences, plus the one-line
  refusal when a write fails.
- The dock: counts and verbs as today.

## 3. The element is the target

### 3.1 Pointing and clicking

The glass (`blueprint-glass.js`) keeps the page inert; `Blueprint#point` already finds the page element under the
pointer through `elementsFromPoint`. What changes: the glass's `click` selects the **innermost element with a
verdict** under the pointer (walk up from the hit until `verdicts.has(el)`), not a 14px rect. The `.hit` rects stay
only as the Tab stops for accessibility and shrink to the bands' own boxes. A click on a quiet element selects it too
(ring in sky, all bands faint, no staircase): editing by hand starts the same way as fixing (section 4). A second
click on the selected element cycles facets; a click on empty page deselects.

### 3.2 Keyboard

```
 Tab / Shift+Tab   next / previous element with a verdict, document order (the .hit stops, one per element now)
 J / K             next / previous cause in the panel (unchanged); the cause's first element becomes selected
 . ,  (→ ←)        next / previous facet on the selected element
 ↑ ↓               move the target one step on the staircase (previews)
 Enter             accept the current facet's target     Shift+Enter  accept every verified facet of the element
 Backspace         un-accept the current facet (drops its row from Changes)
 i                 the one line of why (hold or toggle)
 Space (hold)      the page is live (unchanged)          Esc  deselect, then leave blueprint
 B                 before (unchanged)                    L    the Changes sidebar (replaces the punch list)
```

### 3.3 One cause, many places

A `site` (`file:line:column`) drawn N times (list rows) is one verdict with N `siblings`: selecting any row rings all
of them (the others in a thinner ring), the ghost is drawn on every one, the staircase on the one that was clicked,
and the name tag carries `×12`. Accepting makes one Change with one `swap`/`set`; the write is sent once and every
row is re-read (review M1 is closed by construction). A cause spanning several sites (the panel's row, `Fix all ↵`)
accepts the same step at every site whose verdict offers that step, each site its own Change; sites whose verdict
differs (another step verified, or no fix) are left and the panel row says `9 of 12` with the three outlined coral.

## 4. Fixing and editing: one model, one sidebar

### 4.1 A Change

```js
Change { el, siblings, site, facet, prop, from: { token, n, text }, to: { token, n, text }, origin: 'fix' | 'hand',
         fix: Fix | null /* origin fix */, verb: 'swap' | 'set' | 'apply', state: 'pending' | 'writing' | 'written' | 'refused' | 'loud', why?: string }
```

Three producers, one consumer (`changes.js`, already per element, already with select / discard / accept):

- accepting a facet's verified fix (`origin: 'fix'`, `verb` from `Fix.kind`: class → `swap`, inline → `set`, a
  stylesheet declaration → `apply` with the server edit id);
- releasing a drag on a band (`scrub.js onDone`), on any element, loud or quiet (`origin: 'hand'`, `verb: 'set'` with
  the facet's `props` key, e.g. `padding-x`); a hand edit on a claimed facet that lands on the verdict's target becomes
  `origin: 'fix'` (the proof is attached), and one that lands elsewhere is tried the same way (1.3) before it is
  queued: the staircase refuses to rest on a step a higher tier would flag (the bar is struck, the drag skips it);
- the panel's `Fix all` (3.3).

`blueprint-fix.js`'s pick queue, list and `write()` collapse into this: the Fixer becomes the writer behind
`Changes.accept`.

### 4.2 Accept and write

`Changes.accept` (Accept all, or Enter on one row) groups pending changes by file, newest `hash` per file (from the
verdict's `site`, read when the element was selected, so staleness is caught: review H3), and writes in order through
the server: `swap` per class change, `set` per hand edit, one `apply` per file for edit ids. Every result carries an
`undo` handle; `history.js` toasts it and lists it as today. Discard per element lifts the previews (classes
un-swapped, inline styles restored) and drops the rows. `B` still shows the page as source has it.

### 4.3 After the write: proven quiet, or said

For each written element: `invalidate({ file })`, wait for the class attribute to change or the `LIFT` ladder to run
out (as `#liftWhenReloaded` does), read the element again (`host.read(el, true)`), rebuild its verdict.

- **quiet**: the row turns mint and leaves after 1.2s; the ring fades; the dim closes over the element.
- **still loud, expected** (a second facet the person skipped): the row stays, its written line mint, the remaining
  facet's line coral; the element stays selected on that facet. No words.
- **still loud, unexpected** (the fix did not do what it promised: the class did not compile, a variant overrode it,
  HMR did not reload): `state: 'loud'`, the row keeps the written line with a coral strike, the one line says what the
  re-read found (`pl still 12px`), and Undo is offered on the row. This is the honest end of "applied".
- **refused**: `state: 'refused'`, the server's message as the row's one line, the preview stays, the row stays.

## 5. Robustness

| Case | Detection | What the person sees | Mechanism |
| --- | --- | --- | --- |
| File changed since read | server `staleFile` on `swap`/`set`/`apply` | the row's line: "changed since read"; the element's ring hollow until re-read | re-read that file's elements (`reread()` today), rebuild verdicts, keep changes whose `from` still exists |
| HMR reload after a write | class attribute changes / `LIFT` ladder | the written element keeps its preview until the page carries it, then the preview lets go | as today, but per element not per pick; on a full reload the Changes list survives in `sessionStorage` as pending-written and is reconciled on resume (`History#resume` pattern) |
| Rows from one JSX line | `locate` stamps share `file:line:column` | one ring set, `×n`, one write | siblings on the verdict (3.3) |
| Dynamic className | `props.dynamic` / `classes()` refusal | cross-hatched band, no staircase; `i` says "set in code" | `whyNot: 'dynamic'`; a hand drag on it is refused at press (cursor `not-allowed`) |
| Component / library host | `locate.usage`, `via: 'stamp-usage'`, `isComponentJSX` | name tag `Dialog ▸ Content`; the fix is drawn on the host but written where the class lives; inserts on a usage site are never offered (H2) | the verdict's `site` is the class string's site, found by walking the owner chain for the frame whose JSX carries the class |
| `cva` variants | `readClassRecipes` knows the branch | the name tag adds the variant chip `destructive` | the swap targets that branch's string; never `base` |
| No source line | `locate` null | tag without the file dot; drawn, not draggable | `whyNot: 'no-site'` |
| Two engines disagree on one facet | both claim it | one claim shown, the folded one in `also` | tier then confidence (1.2); never two marks |
| Theme lacks a step | `tokenOf` null in the fix's direction | hollow bar in the staircase | `whyNot: 'no-step'`; `Shift+i` copies the `plumb accept` line for the ledger |
| Tailwind numeric steps | `theme.unit()` null | craft never emits `pl-5`; the fix is rewritten to a named step or `[20px]` | fix-of-fix on-theme check (H5) |
| Quote / escape in class strings | server: raw-range edit + parse guard (`parsesAsBefore`, exists) | a refusal says "would not parse"; nothing written | C1/C2 fixes in `props.ts` (token ranges, not rebuilt strings) remain the server's job and are prerequisites |
| Inserted class loses to an existing one | Tailwind property order | the preview shows no change → the fix is **not offered** | the verify step compares `facts.with` against the real preview: a fix whose preview leaves computed style unchanged is `untriable` (H6, caught at verification) |
| Element covered / off view | `visibleBox` null | not drawn, not selectable, but Tab skips it and the Changes row scrolls to it | unchanged |
| Health failed / starting | `host.health` | blueprint refused as today; a selected element shows the loading ring | unchanged |

Every write is proven safe by the server (`parsesAsBefore` and the identity guards) and proven *right* by the overlay
(the element re-read quiet, 4.3). Those are two different proofs and both are needed.

## 6. The guided walkthrough, and how "works for real" is proven

### 6.1 First use on a real app

Triggered once per project (localStorage, like `help.js` hints) the first time blueprint is turned on. It is not a
tour of the UI; it is one real fix, chosen so it cannot dead-end:

```
 choose      the first verdict in document order that is: in view, one facet, origin drift or craft with a
             verified fix (proof all clear), static className, located site, not a sibling set, whose file is clean
             (no pending changes). None → the walkthrough says one line "Nothing here to fix in one step; drag any band"
             and ends; it never picks a weaker candidate
 1 find      the page dims; that element alone is cut out and its ring pulses twice; one line above the dock:
             "This one is off your scale · click it"           (Tab also works; everything else is still usable)
 2 see why   selected: band, ghost, staircase, reason glyph pop in; the line: "the drawing is why · ↵ takes the step"
 3 fix       Enter: ants, the Changes row appears; the line: "it's a change, not written · Accept writes it"
 4 written   Accept: toast with Undo; the element is read again
 5 quiet     the ring fades, the dim closes; the line: "quiet. That's the loop · Alt+B any time"; the walkthrough ends
```

Any step can be left (Esc or doing something else); the next blueprint keeps the hint off. The walkthrough draws
nothing new: it sequences the real components and adds one line of words per step above the dock.

### 6.2 Proof through the real boundary

A new fixture, `fixtures/realistic-app/`: a small but real product page (a settings page with a header, a nav, a
list drawn from one `map`, a table, a form with `cn()`-built buttons, a `cva` button component, one Radix-style
wrapper, one dynamic className, a `style={{}}` value), styled from the demo's theme with a handful of honest mistakes
in it: one off-scale gap, one 11px uppercase label without tracking, one button with square padding, one faint text,
one `pl-5` on the scale's edge. Not bad/good pairs. `e2e/insight.test.mjs`, real Vite + the plugin + real Chromium,
blueprint on, through pointer and keyboard only (no `evaluate` to reach internals except to read the shadow DOM):

| Test | Asserts |
| --- | --- |
| click the element itself opens its verdict | clicking inside the label's box (not a 14px hit) draws the ring, the band, the staircase; `.pl-tag` says the name; no `.ch` card exists |
| one element, two facets, one accept | the STATUS label shows two dots; `Shift+Enter` queues one Change row with two lines; Accept writes `text-small tracking-wider`; after reload the element has **no mark of any family** |
| a fix that would drift is never offered | the square button's staircase target is a named step; the written class is on the theme; after reload no drift mark on it |
| no verified fix is drawn, not worded | the dynamic-className element shows the cross-hatch band and no staircase; `i` shows one line ≤ 72 chars |
| drag is a change | pointer down on the gap band, move 44px, up: the Changes row reads `gap s2 → s4`; Accept writes `gap-s4`; reload quiet |
| one line, many rows | selecting row 3 rings all rows; Accept sends one `swap` (server log) and every row re-reads quiet |
| stale file | editing the file on disk between select and Accept → the row says changed since read, nothing written, re-read keeps the change |
| write that does not quiet | a fixture class that compiles to nothing → the row ends `loud` with its line and Undo; the source is restored by Undo |
| walkthrough | fresh localStorage: the five steps in order by keyboard, the source changed, the element quiet, the hint never returns |
| noise | the realistic app has no mark on its honest elements; counts match the fixture's planted mistakes exactly |
| words budget | at rest the overlay's shadow root contains no text nodes besides the dock, the panel header and name tags |

Every test ends with the same assertion the hierarchy brief asked for: **after Accept and reload, the element the
change touched carries no mark of any family.**

## 7. Build order: primitives first, one component at a time

Each layer is an atomic change with its own e2e, proven before the next starts; UI layers by Opus, the pure/server
ones by a background Sonnet agent (per memory). The review's C1, C2, H2, H3, H5 are prerequisites of layer 3 and go
first on the server side.

| # | Layer | What is built | Every state | Proof |
| --- | --- | --- | --- | --- |
| 0 | **Verdict (the primitive)** | `verdict.js`: merge per element and facet across drift, craft and habits; cross-facet re-run; `verify()` with `theme.styleOf`, `tokenOf`, higher-tier re-run; `whyNot` kinds. `craft-arbitrate.js` and `model.js`'s first-wins fold into it. No drawing changes yet except: one mark per facet, and the mark's label says the verified `to` | n/a (pure) | existing craft/hierarchy/blueprint tests unchanged; new: STATUS has two marks both saying their verified fix; `pl-5` never appears in any offered `to`; the demo's good column loses its coral once its fixture uses scale tokens |
| 1 | **Select the element** | the glass click selects the innermost verdict element; `boxmodel.js` wired into blueprint for the selected element (ring, tag, bands with verdict hue); `pointAt` pill; Tab per element; facet dots on the tag | rest, pointed, selected, focused (keyboard ring), loading (shimmer), disabled (hollow), deselect | click inside an element's box selects it; pill text; Tab order; no `.ch` opens |
| 2 | **Fix in place, spacing** | `fix-in-place.js`: ghost edge, `stepper` staircase along the band, preview on point/focus, ↑↓, Enter accept → `Changes.set` (origin fix); `scrub.js` drag on the band → `Changes.set` (origin hand); ants on accept. The chooser card no longer opens for spacing | all of 2.1 for padding, margin, gap | drag, keyboard and click each queue one Change; Backspace drops it; preview lifts on deselect |
| 3 | **Accept writes, re-read proves** | `Changes.accept` → `swap`/`set`/`apply` by verb, hash per file; `history` toast; re-read per element; quiet / loud / refused row states; siblings written once | pending, writing, written, refused, loud, discarded | the source changes; the element is quiet after reload; the loud case; the stale case |
| 4 | **The other families** | radius (arc ghost + `radius` rungs), type (line-box ghost + `Ag`), colour (swatch pair + `swatches`), shadow (`shadows` tiles), border; one family per commit | as 2.1 per family | one e2e per family on the realistic fixture |
| 5 | **Reason glyphs and the one line** | `reason.js`, ten glyphs; `i`; the 72-char budget; `whyNot` drawings (1.4) | glyph rest / pointed / enlarged; line shown / cycling | the words-budget test; each `whyNot` kind on the fixture |
| 6 | **Causes and groups** | the panel's `Fix all` through verdicts (3.3), `×n` tag, partial `9 of 12`, the punch list retired (L opens Changes) | row pointed / selected / partial | one line many rows; a cause across sites |
| 7 | **Walkthrough** | the chooser of a safe first element; five lines; once per project | each step, left early, no candidate | the walkthrough test; the no-candidate line |
| 8 | **Remove the card** | `blueprint-fix.js` chooser and list code deleted; `choices.js` kept only for the pinned reading card | — | the suite green; no `.ch` in any blueprint test |

Nothing in layers 1–7 depends on the demo's craft page; the realistic fixture is built in layer 0 alongside the
verdict so every later layer is proven on it. The `/?craft` showcase stays as the rule gallery and gets its good
column rewritten onto the theme's steps when layer 0 lands.

## In short

**System:** one element, one verdict. Every engine's findings are merged per element and facet through the tiers,
re-run across facets, and a fix is offered only after it has been tried: on the theme, quiet for every higher tier,
writable at a located static site. What cannot be fixed is still drawn, with a drawing that says why not.

**What replaces the card:** the fix drawn on the element: the facet's box-model band lit, a ghost of the result, the
scale as a staircase along the band with the target ringed, a drag or Enter to take it, a glyph for the evidence.
Words only on demand, one line. Fixes and hand edits are the same pending Change per element in the sidebar;
Accept writes through the server and the element is read again and must come back quiet, or the row says it did not.

**First layer:** `verdict.js`, the element-and-facet primitive with `verify()`, replacing `craft-arbitrate.js` and
`model.js`'s first-wins, proven by the existing suites plus the STATUS two-facet case and the `pl-5` never-offered
case on a new realistic fixture.
