# Journey

## Token spec follows BoardUI (2026-11-10)
- **The itch:** the owner wanted to "overhaul how plumber suggests and looks for tokens"; the system it proposes today does not scale to large apps.
- **How we found it:** the owner shared BoardUI's typography and colour pages (docs/references.md).
- **The system behind it:** plumber names type roles Material-style with weight baked into each role, and colour roles as flat short names (`fg`, `muted`, `surface`) with no room for states, levels, charts or a rebrand-by-one-colour.
- **What we chose and why:** keep plumber's reading of a page into roles; change what it lands on. Type: 13 named steps × 4 weights, one class per pair, colour separate. Colour: primitives, semantic `--color-{category}-{role}-{state}`, optional component tokens, dark mode in one block, accent ramp from one colour. Our own rules stay (APCA guard, one accent, status keeps meaning).
- **The fix and the proof:** spec only so far: docs/design/token-spec.md. Nothing built.
- **Media hooks:** a before/after of crafting-ui's text sizes snapped onto the ladder, once layer 1 is built.

## Type ladder, layer 1 (2026-11-10)
- **The itch:** plumber's text styles used Material names with weight baked in ("title-medium"), which do not scale; the owner chose BoardUI's ladder (token spec, entry above).
- **How we found it:** building layer 1 of docs/design/token-spec.md and running it on crafting-ui's measured text.
- **The system behind it:** snapping each text element to the nearest of 13 fixed sizes and 4 weights makes every rare size × weight its own style: 31 styles on crafting-ui's 403 measured places, where the old engine gave 8.
- **What we chose and why:** a style needs 3 places to stand alone; fewer joins the nearest kept style (a weight step costs 1, a size step 2). A fluid hero keeps its clamp only when most of its places are fluid. Line-height and tracking come from the ladder, not the code.
- **The fix and the proof:** live on crafting-ui (`POST /__plumb/system`, project scope): 21 styles, text sizes 35 → 9, weights 6 → 4, 423 places, 12 rare styles folded. On the same 403 measured places as the old dry run: 20 styles, sizes 34 → 11 (old: 8 roles, 34 → 8).
- **What it costs:** 98 places are "low confidence" (old engine: 39), mostly prose whose line-height (1.5–1.6) the ladder's UI leading (16/22 = 1.375) would tighten by more than 3px, and lead paragraphs at 18–20px.
- **Media hooks:** the clean-up text panel listing "Headline", "Title 3 semibold", "Caption 2 caps" with the before → after sizes.

## Prose keeps its leading (2026-11-10)
- **The itch:** the ladder would squeeze crafting-ui's reading paragraphs from 1.5–1.6 line-height to the ladder's UI leading (about 1.375); 98 places were "low confidence".
- **What we chose and why:** the owner picked a prose modifier over loosening the ladder: the ladder stays exact for UI text, and reading text gets one extra class, `leading-prose`, with one shared value. A place is prose when its code sets a line-height of 1.45 or more, at 20px or smaller, not caps.
- **The fix and the proof:** live on crafting-ui (`POST /__plumb/system`): 137 places marked prose at 1.5 (the most common value in the code); low-confidence places 98 → 34, the rest now being display headings whose size moves more than 2px. Example swap: `text-[1.1875rem] leading-[1.6]` → `text-title-2-regular leading-prose`.
- **Owner's call:** prose reads at 1.6, not the code's 1.5; written in crafting-ui's plumber config (`prose: { lineHeight: 1.6 }`), replacing its old Material-named decisions. Low-confidence places 34 → 32.

## First real write of the type ladder (2026-11-10)
- **The itch:** the new text styles had only been proposed, never written into an app.
- **How we found it:** applied plumber's write to a side copy of crafting-ui (a git worktree on port 5181, so the main checkout's uncommitted work stayed untouched), then read computed styles on /motion/standards and compared screenshots.
- **What broke first:** applied straight from source (no measured page), uppercase labels lost their letter-spacing (0.88px → 0.2px). The cause: reading only the classes on an element misses uppercase and tracking inherited from a parent, so a caps label looked like plain caption text, and its new class overrode the inherited spacing.
- **What we chose:** write only from a measured census (`plumber census --url …`, then the project-scope proposal), which reads computed values and so sees inheritance. That is how the product's own clean-up flow already works. Also: code blocks (`pre`, `code`, `kbd`) never count as prose.
- **The fix and the proof:** census of 60 routes → 22 styles, sizes 34 → 12, 163 caps places, 101 prose places at 1.6. Write: 28 tokens, one CSS block, 279 swaps in 34 files. Computed on /motion/standards: caps labels 11px / 0.88px uppercase; prose 20px/32px, 16px/25.6px, 14px/22.4px; headings 18px/24px semibold.
- **Media hooks:** before/after screenshots of / and /motion/standards on the side copy.

## Big files refused the write (2026-11-10)
- **The itch:** 3 of crafting-ui's 34 files refused the type write with "Replacement text must be at most 500 characters."
- **The system behind it:** all of a file's class swaps are written as one change, and its history label joins every new class name; a limit meant for text a person types fired on that label, not on any code change.
- **The fix and the proof:** the label lists each distinct value once and is cut to fit (`… (N in all)`). Re-applied on the side copy: 78 swaps in the 3 files, 0 refused; nothing left pending for the project.

## Page titles: tight and up to 48px (2026-11-10)
- **The itch:** 46 places would change a lot under the ladder, mostly page titles.
- **How we found it:** listing every title-sized place with its current values: the titles were flagged for line-height more than size. crafting-ui sets them tight (about 1.04); BoardUI's display leading (about 1.33–1.375) would open a 46px title by about 13px per line. Page titles also used two fluid sizes, topping out at 44px (11 pages) and 48px (8 pages).
- **What the owner chose:** a tight ladder (display steps 32px and up at about 1.1: 64/70, 56/62, 48/53, 40/44, 32/36) over a heading modifier or BoardUI's numbers; and fluid titles up to 48px. The second became a rule, not a setting: a fluid style keeps the clamp whose top is nearest its ladder size (48px is exactly Display 2).
- **The fix and the proof:** re-written on the side copy: 22 styles, sizes 34 → 12, low-confidence places 46 → 20, 74 writes with none refused. /motion/standards at 1280 wide: the h1 is `text-display-2-medium`, 46.08px on 50.9px lines.

## Plumber reads colour tokens named by job (2026-11-10)
- **The itch:** a project that follows the new colour spec (BoardUI-style names) would be misread: plumber matched words anywhere in a name, so `text-primary`, `background-primary-default` and `foreground-icon-primary` all read as the accent, `background-secondary-default` as the page, and chart and status-hue colours as accents it could fold onto.
- **How we found it:** ran plumber's token-name reader over 30 BoardUI-style names: 14 read wrong.
- **The system behind it:** the reader was built for flat names (`fg`, `muted`, `surface`), where a word like "primary" means the brand colour. In a path name the first word is the category and decides the family.
- **The fix and the proof:** a path reader runs first: category, then role, then state. All 30 names now read right; the 14 flat names crafting-ui-style projects use and 12 shadcn names read exactly as before (same output before and after). crafting-ui has no path-style names, so its colour pass is unchanged.

## One brand colour builds the accent ramp (2026-11-10)
- **The itch:** the token spec says a person picks one brand colour and gets its whole 50–950 ramp, checked for readable white text; nothing did that.
- **What we chose and why:** the chosen colour lands on 500 exactly; the other ten stops follow the lightness curve of Tailwind's OKLCH ramps, stretched so the curve passes through the chosen colour, at its own hue, with chroma tapered toward both ends the same way. Stops outside sRGB lose chroma, never lightness or hue. Guard: white text on 500 must reach APCA Lc 60; a colour that misses is darkened in small steps until it passes, and plumber says so.
- **The fix and the proof:** `overlay/src/ramp.js`, with a live page at `overlay/demo/ramp.html` (colour picker). crafting-ui's accent (Lc 77.9), its draw blue (85.7) and violet #7c3aed (82.8) are kept as chosen; teal #14b8a6 is darkened 70.4% → 66.4% lightness (Lc 53.4 → 60.1); yellow #facc15 from 86.1% to 68.1% (Lc 27.6 → 60.3).
- **Media hooks:** docs/media/accent-ramps-2026-11-10.jpg, five ramps side by side.

## Keep the brand, change the text (2026-11-10)
- **The itch:** the ramp's guard darkened a yellow brand to mustard so white text could sit on it; the owner chose "dark text instead".
- **What we chose:** the words on the accent are white when they read (APCA Lc 60), else the ramp's own darkest step, else a near-black of the same hue. Only mid-tones neither reads on move, the shorter way (lighter under dark text, darker under white).
- **The fix and the proof:** yellow #facc15 and lime #84cc16 keep their colour with dark text (Lc 75.2, 61.6), where yellow moved 18 lightness points before. Mid-tones move at most 3.5 points: teal 70.4% → 73.9% and green 72.3% → 73.3% for dark text; sky 68.5% → 67% and orange 70.5% → 69.5% for white. crafting-ui's accent, its draw blue and violet are unchanged with white text. The ramp now also writes `--color-text-on-accent`.
- **Media hooks:** docs/media/accent-ramps-dark-text-2026-11-10.jpg.

## One brand colour → the whole colour system (2026-11-10)
- **The itch:** the token spec's colour layers (raw ramps, job-named tokens, one dark block) existed only on paper.
- **What we built:** `overlay/src/colour-system.js`: one brand colour (and an optional grey tint) in; out come 68 raw colours (a neutral ramp on Tailwind's neutral curve, the brand ramp, four fixed status ramps so meaning never follows the brand) and 36 job-named tokens, written once for light in `:root` and once for dark in `.dark`. Dark surfaces and soft fills use alpha over the canvas.
- **The proof:** `overlay/demo/colour-system.html`: a sample screen (nav, card, field, three button kinds, status badges, an alert) that uses only the job-named tokens, light and dark side by side, with a brand picker and a grey-tint slider. Red brand: white button text (Lc 70.9). Yellow brand with warm greys: dark button text (Lc 75.2), brand kept.
- **Media hooks:** docs/media/colour-system-red-2026-11-10.jpg, docs/media/colour-system-yellow-2026-11-10.jpg.

## crafting-ui's colours, renamed by job (2026-11-11)
- **The itch:** the colour system could be generated and shown, but never written into a real project.
- **What we chose and why:** crafting-ui says "one print, no dark mode" in its own stylesheet, so this write is a rename, not a recolour: every value stays, only names move to the job-named paths, and no dark block is written. `renameMap` (overlay/src/colour-system.js) gives each token its new name from its role; a token whose role has no new name, or whose new name a plainer token already took, keeps its own name and says why.
- **The fix and the proof:** on the side copy (`../crafting-ui-type`), 18 tokens renamed (`fg` → `text-primary`, `surface` → `background-primary-default`, `line` → `border-default`, `draw` → `ink2-default` …), 3 kept (`scrim`: not a UI role; `draw-line`: `border-default` is `line`; `draw-tint`: `ink2-soft` is `draw-soft`). 1,684 class uses in 101 files. Every element's computed text, background, border, fill and stroke colour on 5 pages (6,121 elements) recorded before and after: 0 differ. No old class names left on the page.
- **Dead ends:** the rename was applied by a script outside plumber; plumber has no project-wide rename write yet.

## Plumber renames colour tokens itself (2026-11-11)
- **The itch:** the colour rename had been applied by a script outside plumber.
- **What we built:** a `rename` write (`POST /__plumb/rename { map: { old: new } }`): every source file and the theme, the `--color-<old>` declarations and every utility class that uses them (variants, sides and opacity kept; a name matched whole, so `line` never touches `line-strong`), as one transaction that holds hot reloads, with one undo per file. Refused whole, before anything is written, when a new name is already a token (it would merge two colours). The text rule is pure (src/rules/colour-rename.ts).
- **The fix and the proof:** on a fresh copy of crafting-ui, plumber's rename wrote 101 files, 1,703 renames (the 1,684 class uses plus the theme's 19 names), none refused, 101 undo handles. Every element's computed colours on 5 pages (6,121 elements): 0 differ. Renaming `scrim` onto `text-primary` was refused with nothing written.

## A rename button in the colour step (2026-11-11)
- **The itch:** plumber could rename colour tokens by job, but only through a server call; nothing a person could press.
- **What we built:** a section under the clean-up's colour step, shown only when plumber has a rename plan: "18 of your colour names don't say what they're for", an example (`fg` becomes `text-primary`), then the full list with a swatch per name and what it was, the names that keep theirs, "Rename everywhere" / "Not now", a working state, a done line ("Every colour looks the same") with Undo, and an error with Try again. No second dark button: Apply stays the step's one main action. One undo group takes the whole rename back.
- **What broke on the way:** the colour step imports the new colour-system module, which plumber's dev host did not serve, so the whole overlay failed to load (on the test copy and on the main crafting-ui server, which loads plumber from this checkout). Fixed by serving it and the ramp module; both servers restarted and serve them (HTTP 200).
- **Not yet seen:** the section was not looked at in the browser; the owner was using the pane.

## Rename button, tried for real (2026-11-11)
- **How we found it:** drove the clean-up on a fresh crafting-ui copy: Alt+B, C, skip to Colour, open the names, Rename everywhere, Undo.
- **What broke and why:**
  - The rename reloads the page (101 files change), and the panel came back without its done line or Undo: the rename went straight to the server instead of through the overlay's write path, which notes the write and reopens the overlay after a reload. Now it goes through that path (like the text styles' write), and the panel resumes on the colour step with "Renamed 18 colour names in 101 files" and Undo.
  - After Undo the plan shrank (14, then 2 names): the dev stylesheet still holds utility classes for names it saw before the undo, and the panel worked out its plan while the server was still re-reading the theme. The plan now reads only the tokens the theme declares (from the server), waits until the undone names are gone, and is worked out after that, not during the undo's redraws.
  - Plumber could not read its own `ink2-*` names (read `ink2-soft` as a surface), so after a rename it suggested folding `draw-tint` into it. `ink2` is now a category it reads.
  - A token already named for its job now keeps that name; no other token takes it.
  - Looks: rows grouped by job (text, background, border, accent, states), roomier, and the section's buttons have a resting fill so they read as buttons.
- **The proof:** last run: 18 names listed (scrim, draw-line, draw-tint kept), Rename → reload → panel back with Undo; Undo → files back (no diff) → section offers the same 18 again. The home headline renders with `text-text-primary` (its blank moment after each reload is its own entrance animation).
- **Media hooks:** docs/media/colour-rename-list-2026-11-11.jpg, docs/media/colour-rename-done-2026-11-11.jpg.

## Undo of a rename: one update, not 101 (2026-11-11)
- **The itch:** undoing the colour rename took about 30 seconds (timed by eye in the panel), and the page showed black borders while files went back one at a time.
- **The system behind it:** undo wrote each file on its own, re-analysed the project after every file, and did not hold the page's live updates, so the page repainted 101 times against a half-restored theme. The rename itself also re-analysed after every file.
- **The fix:** a many-file write (the rename, any undo) now holds live updates until the last file is written (one page update) and re-analyses the written files once at the end.
- **The proof:** on a fresh crafting-ui copy, through the server: rename 6.2 s; undo 6.8 s and 12.8 s on two runs (709 recorded changes in 101 files), files back with no diff, page renders normally. The old 30 s is an eyeballed panel time, not the same measurement.

## The spec was meant to be improved, not replaced (2026-11-12)
- **The itch:** the owner, on seeing plumber propose BoardUI's names and sizes: "I don't say move to 1:1 mapping, I wanted to improve our spec as I felt Board's was objectively better."
- **The system behind it:** I took the reference as a template and built from it directly, without first splitting what in it is better from what our own direction already decided. So the fixed 13-size ladder replaced roles derived from each project's code, BoardUI's names replaced ours, and renaming every project's tokens became a default suggestion.
- **What we chose:** asked the owner four questions first. Type roles stay derived from the code, in BoardUI's shape (weight as its own axis, colour out of text styles); our names stay, plus fixed state suffixes (`-hover`, `-active`, `-disabled`) and surface levels; renaming only when asked; spec first, then rework. docs/design/token-spec.md is rewritten that way, each borrowed idea marked with why it is better, and a table of what is not taken.
- **What stays from the last two days:** the accent ramp, readable brand text, the reader for path-style names, the rename write and its fast undo, the reload-safe panel. The fixed ladder, BoardUI names and the default rename suggestion are to be reworked after sign-off.

## Text roles from the code again, weight on its own (2026-11-12)
- **What changed:** the fixed 13-size ladder is gone; roles are worked out from each project's code again (docs/research/type-roles.md), with our Material-style names. From BoardUI's shape: a role is decided by size alone (a 17px title is one role at any weight), and a place at another weight takes Tailwind's weight class beside its role (`type-title-medium font-semibold`). Reading text keeps `leading-prose`; code is never prose; a tie between fluid sizes goes to the larger.
- **One change from the signed-off spec:** the spec said `type-<role>-<weight>`, which collides with our size words (`type-title-medium-medium`). The role class reads `var(--tw-font-weight, …)` instead, so `font-semibold` beside it wins in any order; spec §2.2 says so.
- **The proof:** crafting-ui side copy (census of 60 routes): 8 roles, sizes 34 → 8, 511 places, 29 low-confidence (the ladder had 20), 94 prose places at 1.6; 279 swaps written, 0 refused. On /motion/standards: `type-title-medium font-semibold` 18px weight 600; `type-body-large leading-prose` 16px on 25.6px; `type-label-small` 11px uppercase 1.1px tracking.

## Defensive CSS tips become suggestions: stretched pictures first (2026-11-12)
- **The itch:** the owner: "lets improve our engine to bring these tips as suggestions", pointing at defensivecss.dev's 25 tips ([reference](references.md)).
- **How we found it:** set the 25 tips beside plumber's rules. About five were already read (scrollbar room, iPhone input zoom, image inner outline, cut-off text, scroll chaining as a source habit). The rest were not.
- **The system behind it:** plumber's rules came from craft insight lists; defensive CSS is about content you don't control (a longer name, a taller photo), which those lists rarely cover.
- **What we chose:** one tip at a time, starting with the one a page can prove by itself: a picture in a box of another shape, pulled to fill it. Tried first on a real app by injecting a test picture; that page's own layout hid it, so the proof moved to the rule demo.
- **The fix and the proof:** a new rule (principle 78) marks an image drawn in a box of another shape with nothing said about fit, and offers `object-cover`. Its demo screen (a trip planner's six saved places, real photos, tall and square ones in a 96 by 72 box): plumber scoped to it finds this rule only; after plumber's fix all six are cropped and it finds nothing. Not yet done: the camera moment was not watched, no test written.
- **Media hooks:** the demo screen at /rule/78, switch "Stretch to fill / Crop to cover" (before/after clip).

## Colour back on our names, rename only when asked (2026-11-12)
- **What changed:** the colour generator writes our roles (`ground`, `surface`, `surface-hover`, `surface-active`, `surface-2`, `sunken`, `fg`, `muted`, `faint`, `fg-disabled`, `on-accent`, `line`, `line-strong`, `accent`, `accent-hover`, `accent-active`, `accent-soft`, `accent-disabled`, and each status with its `-soft`): 26 roles over the same ramps. The reader takes `-active` as the press state (old `pressed` still read) and `-disabled` as not a fold target. The rename plan targets our role names, a second ink keeps the project's own name, and the colour step shows only a quiet "Rename my colours…" entry.
- **The proof:** crafting-ui's plan is now 2 renames, `bg` → `ground` and `surface-pressed` → `surface-active`; its `draw` family keeps its names. A BoardUI-named project maps onto ours (`text-primary` → `fg`, `background-primary-default` → `surface`). The sample screen renders from the 26 roles in light and dark. The crafting-ui side copy holding the old writes is discarded.
- **Media hooks:** docs/media/colour-rename-our-names-2026-11-12.jpg.

## The stretched-picture demo, rebuilt on the whole card (2026-11-12)
- **The itch:** the owner on the first screen for principle 78: "the demo technique is really bad, we dont show any guardrails, we dont show transition across all elements we focus on one and that too is so bad".
- **How we found it:** the owner watched the screen; asked what "guardrails" and "transition" meant, they chose both guide lines and the fix holding under new content, and every photo gliding.
- **The system behind it:** the demo stage took one "lead" element from an example: one hole in the shade, one number, the camera on it. A slip on six rows was drawn on one, and a fix the browser cannot animate (how a picture fits its box) snapped on all six.
- **What we chose:** change the stage, not just this screen. The stage can now keep its camera on the whole card, and glides a crop itself (it scales the still-stretched picture out to its own shape, clipped to its box, then lands the fix). Zooming one then all was the option not taken.
- **The fix and the proof:** every photo carries its own guide (the picture's true shape as lines, the stretch as dotted strips, the percent in a pill); a friend saves a new place every 3.2 s with a photo of another shape, so the stretched side keeps breaking and the cropped side holds. Seen in the pane: marks on all rows with 13 to 100 percent, arrivals stepping the list down, all six cropped after the fix. Not seen: one clean run of the moment after the camera change, and the glide in motion (judged only from stills).
- **Media hooks:** /rule/78, a screen recording of the switch on both sides with two arrivals each.

## Rule 78's demo: still again, and it says why it matters (2026-11-12)
- **The itch:** the owner: "remove this moving animation … everything moving from second place but the first piece getting place, really confusing", and "i dont see the significance here why do we need this rule".
- **How we found it:** the owner watched the live list; they had also taken plumber's fix with the overlay, which wrote the fix into the demo's own file and left the broken side with nothing to find.
- **The system behind it:** the screen tried to show the rule defending by making new places arrive, and its lesson gave the mechanism but not the cost.
- **What we chose:** the list is still; the six photos already differ in shape. The lesson now opens with what goes wrong for a product and why testing misses it. The demo file was put back.
- **The fix and the proof:** seen in the pane: six still rows, plumber's finding on six places, the new paragraph above the mechanism.

## Rule 78's demo: a card you resize (2026-11-12)
- **The itch:** the owner, with two screenshots of the tip's own demo ([reference](references.md)): "we dont see the issue clearly in this component … you will also see the value if you stretch the card itself".
- **How we found it:** side by side, the reference's one big photo of round pastries going thin was obvious; our six small thumbnails of hills were not.
- **The system behind it:** the screen showed the slip at a size and on subjects where a stretch doesn't read, and nothing let the viewer change the box, which is what the rule guards against.
- **What we tried, what we chose:** first lead photo was a round well (the clearest stretch), but cropped to a wide box it showed only wall, so the fixed side looked worse; the lead is now the Pena Palace, centred in a wide photo, which survives the crop at any width. The well stays as a small stop.
- **The fix and the proof:** one trip-day card with a cover and three stops, and an edge to drag from 200 to 560px. Seen in the pane: at 480px the palace is drawn 77% wider than it is and plumber finds this rule only, on four pictures; after the fix it keeps its shape, and dragging narrower keeps it cropped. Not seen in motion: the glide.
- **Media hooks:** /rule/78: a recording of dragging the edge on each side of the switch.

## Open gaps
- Defensive CSS tips still without a rule: flex items that cannot shrink or wrap, scrollbars shown when nothing scrolls, text over an image with no colour behind it, hover styles on touch screens, repeated backgrounds, fixed heights on text, sticky items in a grid, and the source-only ones (variable fallbacks, vendor selectors, vertical media queries).
- Not built from the signed-off spec: a hint when the brand sits in the warning or danger hue band; reading surface levels and states from usage.
- Undo of a 101-file rename still takes 7–13 s; where the rest goes (parsing each file, recording 709 changes) is not measured.
- The clean-up's pass names are not clickable, and the text step's error screen (no census) has no skip.
- Code samples shown as text on crafting-ui pages may have been renamed too; not checked.
- A yellow or amber brand sits next to the warning status hue; plumber does not yet warn when the brand and a status colour are too close.
- crafting-ui's draw blue is a wide-gamut (P3) colour; the ramp keeps it in sRGB, so its 500 loses a little chroma (0.289 → 0.278).
- Token spec layers 2–6 not built; four owner decisions open (§6).
- e2e/type-roles.test.mjs still expects the old Material names; rewrite when the owner calls for tests.
- The clean-up text panel with the new names was not looked at in the browser.
- Writing from source without a census gets inherited caps wrong; the no-census proposal should refuse to write, or read ancestors.
- 20 low-confidence places left: one-off sizes (28–33px, 22px) that move more than 2px onto the ladder.
- The tailwind-merge trap is untested: crafting-ui does not use it.

## Shipped · 2026-W46
- (nothing shipped yet; the token spec is a plan)
