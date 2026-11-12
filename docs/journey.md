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

## Second defensive tip: a long name pushes the row out (2026-11-12)
- **The itch:** the owner, after rule 78: "noice move to next". Next of the defensivecss.dev tips ([reference](references.md)): minimum content size in flexbox, the "truncate does nothing" slip.
- **How we found it:** picked as the most common of the remaining tips in shipped apps, with a one-class fix.
- **The system behind it:** a flex item is never narrower than its longest unbroken line unless told it may be, so a column holding a name set to cut off never shrinks, and whatever follows it leaves the card.
- **What we tried, what we chose:** the first check named the whole card (the outermost box the text spilled from), so plumber's fix landed nowhere; it now names only the part that grew to fit its own text. The stage also learned to ease a fix that moves layout (each part of the row slides from where it was).
- **The fix and the proof:** a new rule (principle 79) and its screen: a members list with three long names, on a card whose edge you drag. Seen in the pane at 400px: plumber finds this rule only, on 3 rows (roles pushed up to 129px off the card); after `min-w-0` the names are cut off, every role is on the card, and plumber asked again finds nothing. Not seen: the slide in motion, the drag on this screen, no test written.
- **Media hooks:** /rule/79, a recording of the switch and of dragging the edge on each side.

## Rule 79 finds it before it breaks (2026-11-12)
- **The itch:** the owner on 79's first screen: "the default state is clearly broken and no one will ship ui like this broken, we show examples which will be a miss in a normal design review".
- **How we found it:** the screen rested with three role menus hanging off the card.
- **The system behind it:** the rule fired only on a row that was already overflowing, so the screen had to be broken at rest for plumber to say anything, and plumber would only have told people what they could already see.
- **What we chose:** the rule now reads the cause, not the damage: text set to cut off, inside a box that can't shrink, is the slip whether or not today's names fit. The screen rests with six ordinary names that all fit.
- **The fix and the proof:** seen in the pane: at rest the card looks right and plumber finds the slip on 6 rows ("set to cut off, but its box can't shrink, so it never will"); dragged narrower, roles are pushed off the card one by one; after the fix the names are cut off, every role stays on, and plumber asked again finds nothing.
- **Media hooks:** /rule/79: drag the edge in on each side of the switch.

## Tests for the token spec (2026-11-12)
- **What they cover, each through the real server, overlay and Chromium:** text roles from the code, one per size, a 13px code block landing on the theme's own 14px step; a 17px title and lead as one role with `font-semibold` beside the title; paragraphs on `leading-prose` at the owner's 1.6 while lists keep the role's 1.4; no colour in any style; caps labels keep 0.96px; the excluded specimen untouched; undo restores every file (e2e/type-roles.test.mjs, rewritten). Colour (e2e/colour-names.test.mjs, new): the rename waits behind "Rename my colours…", lists `ground was bg` and `surface-active was surface-pressed`, keeps `draw`, writes every file through a reload with colours painting as before, and Undo puts every file back; a BoardUI-named theme is read by role (a hand-written white folds onto `background-primary-default`, "primary" is not the accent); one brand colour paints as chosen, yellow keeps its colour with dark words, red takes white, `.dark` re-points the surface.
- **Laptop run:** 4 of 4 pass. Two first failures were the tests' own (a colour step heading the wait did not know; Chrome reporting OKLCH), one was the product behaving as designed (the theme's own step wins within 1px), now asserted.
- **Not done:** proving each test fails on the code before this work.

## Rule 78 finds it before it stretches (2026-11-12)
- **The itch:** the same as rule 79's: the screen rested with the palace already squat, which nobody ships. The owner: "Yes, fix 78 too".
- **The system behind it:** the rule fired only once a picture was visibly stretched, so the screen had to be broken at rest.
- **What we tried, what we chose:** the early finding was first given a confidence under the engine's noise floor (0.8) and was dropped, rightly, as written: a box set on both sides is also true of icons and logos. It now reads only photo-sized pictures (64px or more on the short side, not an svg) whose height and width both come from classes, and clears the floor at 0.82.
- **The fix and the proof:** the card rests at 300px, where the cover's box is exactly the photo's 3:2. Seen in the pane: at rest it looks right and plumber finds the slip on the cover and the three faces ("fits its box today"); dragged to 442px the palace is drawn 49% wider than it is; after the fix it is cropped and plumber asked again finds nothing. Not checked: how often the early finding fires on real apps.
- **Media hooks:** /rule/78: drag the edge out on each side of the switch.

## The full suite on vm-agent (2026-11-12)
- **First full run** (side-by-side runner, 183 runs, 17.4 min on 7 cores): 926 tests passed, 54 failed in 29 files.
- **Two were mine, both fixed:** the text-styles test (e2e/props-text) broke because I had edited the shared text-roles fixture it relies on (its config and a code block); the fixture is back as it was and the text-roles test now makes those changes in its own copy. The text-roles test lost a server call to the reload a theme write causes; it now calls the server from the test, not through the page. Both pass.
- **The other 27 files, run on the code before this work and on today's** (same machine, same runner): 26 fail the same way on both, so they were failing before this work. The text editor's test failed once only on today's code; run three times on each, it failed 2 of 3 on the earlier code and 0 of 3 on today's: an existing flake on that machine. Nothing in the suite fails because of this work.

## A brand too close to "error" (2026-11-12)
- **The itch:** one brand colour builds the whole system, but a red brand made "Send invite" the same red as a "Removed" badge and the error alert; a main button read as a delete. The signed-off spec (§3.4) asked for a warning; it was the last unbuilt part of it besides reading states from usage.
- **The system behind it:** status colours are fixed so meaning never follows the brand, but nothing checked that the brand itself stays clear of them.
- **The fix:** when the brand's hue sits within 25° of the error red or the warning amber (greys excepted), plumber says so in plain words and what to do: move the hue, or keep it and always give that status an icon and words. Built in the colour system (`brandHint`, overlay/src/colour-system.js) and shown on the colour-system demo page.
- **The proof:** red, rose and orange get the error hint, amber the warning one, blue, green, violet and grey none (checked in the browser on the demo page, switching the brand).
- **Media hooks:** the demo page with a red brand: the hint above, the red "Send invite" next to the red "Removed" badge; then switch to blue and the hint goes.

## Hover colours read from the code, not the name (2026-11-12)
- **The itch:** the spec says a state is read from where a colour is used, but plumber read it only from the name. A shadcn project names its grey hover background `accent`, so plumber took it for the brand colour, and a rename would have called it `accent`.
- **How we found it:** a small page with the real shadcn theme (fixtures/shadcn-system) and shadcn's own button and menu classes; plumber's reading of each colour, before and after.
- **The system behind it:** roles came from token names and values only; the code's own evidence (which state each colour is painted in) was never read.
- **The fix:** plumber reads, from the page's stylesheets, which colours are used as fills, text or borders, at rest or on hover, press or disabled. A background used in only one state takes that state. A colour also used at rest, used as text, or never seen keeps what its name says. A first try also flipped `accent-foreground` (text shown on hover); only fills count now.
- **The proof:** on the shadcn page, `accent` reads as the hover surface (filled only on hover, focus and open). On crafting-ui every colour reads as before: its names already matched its use.
- **Media hooks:** the shadcn page's "Cancel" and "More" buttons and the role menu hovered, beside plumber's reading of `accent` before (brand) and after (hover surface).

## Third defensive tip: words that need their picture (2026-11-12)
- **The itch:** the owner picked "Text over an image" as the next defensivecss.dev tip ([reference](references.md)), after asking that every demo rest in a state that "will be a miss in a normal design review".
- **How we found it:** the tip itself: white words over a photo are only readable while the photo is there.
- **The system behind it:** the photo is the one part of a tile that comes over the network; the words' colour was chosen against it, and nothing is behind them when it is late or its link dies.
- **What we tried, what we chose and why:** plumber's contrast rule says nothing about words on a picture (it can't know the pixels). The new rule 80 reads the picture as if it were missing and judges the words over it against what is left, counting scrims and chips painted in between. The finding lands on the picture, where one background colour holds every line.
- **The fix and the proof:** on the new screen (a stargazing app's "Tonight" card, three night photos with white names) plumber finds rule 80 only, in 3 places, while every photo is there. A switch makes the photos fail to load: the tiles go blank. After plumber's fix (`bg-neutral-800` on each picture) the names stay, and asked again plumber finds nothing. Seen in the browser as stills; no tests yet.
- **A dead end that helped:** the new screen made rule 79 (text in a row may shrink) fire on the card itself. A box with its own width is never held wider than that width, so 79 now stays quiet there until the row really runs over.
- **Media hooks:** `/rule/80`: photos on, photos off, then the fix with photos still off.

## The defensive tips leave the craft list (2026-11-12)
- **The itch:** the owner, on the three new screens: "these examples look like very contextual ... these looks ass", then "maybe this rule doesn't belong here", then the reason: the craft list is what "a specialised craftsmen design engineer [tells] his junior ... tacit knowledge years of experience, these are not just obvious examples regurgitated online in 100s of tutorials but like real hidden gems".
- **How we found it:** the screens themselves. Each needed an invented product and a staged failure (drag the card, switch the photos off) to show anything, and rule 80 looked identical before and after its fix.
- **The system behind it:** every defensive CSS tip was given a craft number and a screen, as if "plumber can check it" meant "it belongs on the list". The list has a higher bar than the engine: hidden gems only.
- **What we chose and why:** the three checks (a stretched picture, text in a row that can't shrink, words that need their picture) stay in plumber as plain suggestions, with no number. Their screens and list rows are gone. The remaining tips will be engine checks only.
- **The fix and the proof:** the showcase list ends at 77 again; the engine still carries the three checks (read in the browser). The bar is written into the craft-rule skill and into the rules list itself.
- **Media hooks:** none; this is a subtraction.

## Do the three defensive checks cry wolf? (2026-11-12)
- **The itch:** the three checks fire before anything breaks, so the risk is noise on pages where nothing is wrong. The owner: "Check noise first".
- **How we found it:** plumber's read, asked in the browser on every page that would load: 7 pages of crafting-ui and algorecall's home page.
- **The proof:** 0 findings from the three checks on all 8 pages (plumber found 111 other things on them). The pages do hold what the checks look at: 11 lines set to cut off, all inside a box that may shrink; 5 pictures, all cropped to cover; 8 background pictures with no words lost over them.
- **What it doesn't show:** neither app makes these mistakes, so this proves the checks stay quiet on good code, not that they catch real slips outside our own demos. algorecall's inner pages never loaded (stuck on "Loading the page…", its backend was not running), so the largest page was not read.
- **Noticed on the way:** plumber's whole read took 12 s on algorecall's home (715 elements) and 8 s on a 1,400-element crafting-ui page. Whether the three checks add to that is not measured.
- **Measured after (same day):** each check was timed inside one read of the 1,400-element crafting-ui page. The read took 7.9 s. All 75-odd checks together took 1.1 s of it, and the three defensive checks 28 ms (2 ms, 5 ms and 21 ms). They are not the cost. Half of the checks' time is the text-contrast check alone (0.5 s), and about 6.8 s is spent outside the checks, where is not yet known.

## Suggestions use what the page already does (2026-11-12)
- **Taken out the same day:** its numbers and tie-breaks were invented, with no principle or source behind them ([entry](#a-suggestion-needs-a-principle-and-a-source-2026-11-12)).
- **The itch:** the owner asked how plumber decides what to suggest. Reading the code showed a signed-off part of the design that was never built: a suggested value should be one the app already uses for the same job.
- **How we found it:** comparing the design (docs/briefs/craft-spec.md §4, candidate b) with the recommender's code: it never looked at the page, so every new token and every piece of advice carried the standard's number (0.06em for small capitals) whatever the app did.
- **The system behind it:** the recommender was handed the theme but not the page; a rule had no way to say "here is what the other labels on this page use".
- **What we chose and why:** a rule now hands over the values the page's other elements use for the same job (other small capitals, other big headings, other paragraphs). The value in range used most, on two places or more, replaces the standard's target in a new token and in advice; the reason says how many places use it. A theme step in range still wins over it: the theme is the project's decision. Only letter spacing and line height so far, the two rules that may propose a new token from a range.
- **The fix and the proof:** on crafting-ui's home page (49 small-capital labels: 41 at 0.1em, 8 at 0.08em), one label with its spacing removed was told "Add --tracking-caps: 0.06em" before; now "0.1em, which this page already uses on 41 labels". Read from `window.__plumb.craft()` on the running app; no test written yet.
- **Media hooks:** before/after of the suggestion line on a crafting-ui label.

## The page's own class turned out to be a hardcoded value (2026-11-12)
- **Taken out the same day:** its numbers and tie-breaks were invented, with no principle or source behind them ([entry](#a-suggestion-needs-a-principle-and-a-source-2026-11-12)).
- **The itch:** after suggestions learned the page's usual value, plumber still proposed a new token on crafting-ui although 41 labels already carry 0.1em. The owner chose to make the first answer "the class the page's other places use".
- **How we found it:** reading the 49 small-capital labels on crafting-ui's home page in the browser: 35 write the spacing as `tracking-[0.1em]`, the rest inherit it from a parent that does.
- **The system behind it:** the shared class is a hardcoded value copied 35 times, the very thing plumber flags elsewhere. Offering it as the answer would spread the copy; a named class in range would already have won as a theme step. So "use the page's class" has no sound case of its own.
- **What we chose and why:** the new token stays the first answer, and its reason now says how the page writes the value today: "0.1em, which this page already uses on 41 labels (35 write it as tracking-[0.1em])". The person sees that one token answers this label and the 35 copies.
- **The fix and the proof:** read from `window.__plumb.craft()` on crafting-ui with one label's spacing zeroed in the browser; the line above is its output. Not looked at in the panel; no test.
- **Not understood:** taking the class off a label (instead of zeroing its spacing) gave no finding on one try; cause not looked into.

## Plumber's read: 8 seconds, 5 of them asking one question at a time (2026-11-12)
- **The itch:** plumber's full read of a page took about 8 s on a 1,400-element crafting-ui page and 12 s on algorecall's home. The owner, once the new checks were cleared: "Yes, find it".
- **How we found it:** timed in the browser. The checks were 1.1 s. A timeline of the read showed the page fully read and settled by 2.4 s, then 5 s with nothing running on the page. Counting requests in that gap gave 363 round trips to the dev server, one question each, about 13 ms apart.
- **The system behind it:** after the read, plumber asks where each finding was written. Questions asked in the same moment travel as one request; these were asked in a loop that waited for each answer before asking the next, so every one travelled alone.
- **The fix and the proof:** the questions are now asked together. Same page: 7.9 s → 2.7 s (3.1 s on a second run), requests 431 → 91, every finding still has its file and line. Old and new run back to back on the assets page gave the identical list of findings.
- **What is left:** about 1.7 s reading the page, then a fixed 0.6 s wait to be sure nothing more arrives. The text-contrast check is half of all check time (0.5 s). algorecall was not re-timed.
- **Noticed:** two pages report 2 fewer findings than this morning with the old code too, so something else changed in between (the app or another session's work), not this fix.
- **Media hooks:** a before/after bar: 7.9 s vs 2.7 s, with the 5 s of single questions drawn as 363 ticks.

## A suggestion needs a principle and a source (2026-11-12)
- **The itch:** the owner, on the two changes above: "dont create these rules out of your ass, there has to be some sort of industry practice and some sort of data by real engineers working on design system and how frontend processes works, this has to be the driving force." And: "we dont just say hey do this because so many instance, there has to be a principle behind the suggestion, some way of percieving things, some concept which leads to a suggestion."
- **How we found it:** the changes said "use 0.1em because 41 labels do", with "two places or more", "more than half" and "nearest wins" typed in while coding.
- **The system behind it:** the design for how plumber suggests names no source for any ranking or number, so a vague line could only be filled with a guess. The craft rules are tied to laws of UX, which explains why a rule exists but not where its numbers or its suggestion come from.
- **What we chose and why:** every suggestion walks one chain: a way of seeing, the principle, its source, the measure, the suggestion, the proof. A source can be pragmatic (the owner: "based on code evidence, based on some talk, based on documentation, based on industry practice"). A count is evidence at most. This reaches the standard's numbers too, not only the suggestion logic.
- **The fix and the proof:** both changes taken out (the three engine files are as they were this morning). The philosophy is written in docs/PRINCIPLES.md and at the top of the craft-rule skill. Nothing in the engine has been traced to sources yet.

## Plumber's read, second pass: judged three times, and a search repeated for every line (2026-11-12)
- **The itch:** after the first speed-up the read was still about 2.7 s, and the owner said "Speed up more".
- **How we found it:** counting, in the browser, how often each check ran and what threw its kept answers away. Every element was judged at least twice on a page's first read, and the text-contrast check alone was half of all check time.
- **The system behind it:** two things. The theme's settings arrive from the dev server after the read has begun, and each arrival throws away every judgement so the whole page is judged again. And the contrast check, for each line of text, searched every box above it for pictures, so the page's outer boxes were searched hundreds of times for the same answer.
- **The fix and the proof:** a read now asks for the theme's settings before it starts (waiting 2 s at most), and the pictures inside a box are found once per read. Contrast went from 548 ms to 137 ms in one read while the other checks ran about twice as slow as before on a busy laptop. First read of the 1,400-element crafting-ui page: 1.8 s (5.1 s just before these two changes, 7.9 s this morning); a second read 2.4 s. The same 33 findings each time, all with file and line.
- **What is honest about the numbers:** the laptop was under load (load average 4) and single runs swing by a second, so the first read coming out faster than the second is noise. The direction is clear, the exact figures are not.
- **What is left:** a late answer about where a clickable element was written still judges the page again once; the read ends with a fixed 0.6 s wait; algorecall was not re-timed.

## The suggestion engine, checked against practice (2026-11-12)
- **The itch:** after the owner's "there has to be a principle behind the suggestion", nothing in how plumber chooses a suggestion could name where it came from.
- **How we found it:** listed the seven decisions the craft suggestion engine makes and read how design-system teams' own tools and docs decide each one (ESLint, Atlassian, Carbon, Primer, Mozilla, Linode, Tailwind's lint plugin; [references](references.md)).
- **What it showed:** three decisions are backed (the project's tokens are the answers; the plain numeric class when equal; advice when no edit is safe). Two are partly backed (nearest step, new token). Two go against practice: plumber picks one step for the person when several fit, where every tool read picks only when exactly one fits; and it picks a colour token by how close its value is, where Atlassian says "Don't use a token just because the colors appear to match" and Carbon keeps colour fixes off by default "because colors can be ambiguous".
- **The system behind it:** the craft side was designed around "the first candidate that exists wins". The drift side and the vision already say "write when exactly one edit fits; otherwise show the choices"; the craft side never took that on.
- **The fix and the proof:** none yet; this is the written result, docs/research/suggestion-sources.md, with each quote and its page. Four pages could not be opened and are listed there.

## A correctness round for the three defensive checks: found on the right line, written to the right line (2026-11-12)
- **The itch:** the owner: "do a round of right correctness and right ... reaching the source file without any issue."
- **How we found it:** a temporary page with each slip written several ways and a correct twin beside each (12 marked elements: 7 slips, 5 twins). plumber read it; each fix was then written through plumber's own write to the dev server, and the file was read afterwards. The page was deleted after the run.
- **The proof, finding:** all 7 slips were found at the exact line and column of the element in the file, including a picture inside a small component used twice (found once, at the component's own line, counted as 2). None of the 5 correct twins was marked by the three checks.
- **The proof, writing:** 6 of 7 fixes landed on the right element's class list and nowhere else, and each finding was gone when plumber asked again. The component's fix was written once and fixed both uses.
- **What did not write:** a picture whose classes are built in code (a string joined with a condition) was refused with "className is built at runtime (an expression); set the class by hand." Nothing wrong was written, but plumber offers a fix it then can't take.
- **What else showed up:** giving a box a background colour made two other checks speak about it as a card (its text alignment and padding), and a picture given a dark background was then asked for an outline. The page reloaded after a write to this page. And a read taken while the browser window has no size (a hidden pane) silently gives wrong answers: every picture measures 0 wide, the picture checks say nothing and the contrast check marks words that sit on a photo.
- **Media hooks:** none kept; the temporary page is gone.

## Plumber is an expert's judgement, not a linter (2026-11-12)
- **The itch:** the research above told the owner plumber should stop choosing when several answers fit, because lint tools do. The owner: "No, I think the idea with plumber is a bit different." And: "I'm not creating a linter, this would be suggestive, this would be opinionated."
- **How we found it:** the owner laid the picture out. A design system is defined; LLMs write the UI and drift from it; plumber "will tighten the things up, and tidy up". Old tools "were dumb"; "this probabilistic nature is a feature, not a bug".
- **The system behind it:** two ways of looking. Single decisions (a font size, a radius, a colour) are "one decision only", taken confidently from many signals (the role, where it sits, the nearest token) and applied: 20 text styles from an LLM fold into the spec's 9. Craft rules are an experienced design engineer's eye: the 10–15 things they would say after one look. Laws of UX are universal and worth baking in too. Any means are fair: new algorithms, probability, LLMs.
- **What we chose and why:** the principles page is rewritten around this picture. The research keeps its quotes, but "picks one answer when several fit" is withdrawn as a fault; what the sources are for is finding which signals make a decision right. The colour finding stands, because its fix is the owner's own model: role first, then value.
- **The fix and the proof:** docs/PRINCIPLES.md, the top of the craft-rule skill, and the corrected docs/research/suggestion-sources.md. No engine code changed.

## A round on writes: do they land in the right place, and how long do they take (2026-11-12)
- **The itch:** the owner: "write correctness i meant, write performance".
- **How we found it:** two runs through plumber's own write to the dev server, read back from the file each time. Speed: one class added to a list row on crafting-ui and undone, 4 times. Correctness: a temporary page with 15 ways a class list is written, one class added to each (one replaced), then the file compared with a copy taken before. The page was deleted after.
- **Speed, on crafting-ui:** finding the line 10 to 80 ms, reading the element 60 to 90 ms, the write itself about 450 ms (725 ms the first time), and the change is on the page about 350 ms after the write is sent, without a reload. Undo answers in about 300 ms but the page only shows it after about 900 ms. On the small showcase project the same write takes 50 to 66 ms.
- **Correctness, 15 forms:** 10 were written on exactly their own element and nothing else in the file changed: a plain string, a braced string, a template with and without an expression, a cn() call, two elements on one line (each got its own), a row in a list (written once, all rows changed), a class list across several lines, and a replace in the middle of a list.
- **Refused, 5 forms, nothing wrong written:** a ternary of two strings, a variable, a joined string, and a class passed through a wrapper component (both when the wrapper takes className and when it spreads props). Each refusal says why in plain words.
- **The gap that matters:** the wrapper case. On crafting-ui every link is drawn by one small Link component, so a link's classes, written where the link is used, cannot be written at all: plumber finds the component's own line and stops there. Whether the overlay's own fix flow gets further than this direct call was not checked.
- **Also seen:** 1 of 11 writes on the showcase page reloaded the whole page (after several writes in quick succession). Both crafting-ui files are as they were (git shows no change).

## A fix on a link now reaches the line where the link is used (2026-11-12)
- **The itch:** the write round found that a class passed through a wrapper component could not be written; on crafting-ui that is every link. The owner chose it first: "Wrapper components".
- **A correction first:** the round's report said plumber cannot do this at all. It can. The element card, Tidy and the text editor already follow a class to the usage that passes it in. The round called the write directly, without telling the server which usages sit above the element, and that call is refused by design.
- **The system behind it:** one flow did not use that shared path: taking a fix on the page itself. It wrote at the element's own line, so any fix on something drawn by a component (a Link, a Button) was refused. It also treated every element drawn by one component as the same place, so several links with the same fix would have been written once and all marked done.
- **The fix:** that flow now asks where the classes are written the same way every card does, and groups fixes by that place: each link's own usage is written, and rows of one list still share one write.
- **The proof:** on crafting-ui, a class added to a link drawn by the shared Link component landed in the page that uses it, inside the fixed part of its class template; all 4 links of that list wore it; undo put the file back exactly (git shows no change). This used the same two calls the changed flow makes.
- **Not proven:** the flow was not driven by hand on the page (enter the blueprint, pick a fix, write). The overlay loads with the change and shows no errors, which is all that was seen of it running.

## Text is folded by size alone (2026-11-12)
- **The itch:** the owner's model for a single decision is "the role, where the text is, the nearest token". For text, plumber reads only the size and whether it is capitals.
- **How we found it:** ran today's rule over the 550 text places measured on crafting-ui on 2026-10-31, which carry each place's tag, what it sits inside, the shape of its words and its line count (`node bench/type-roles/signals.mjs bench/type-roles/measurements.roles.json`).
- **What it showed:** size alone calls 37 of 106 paragraphs a heading kind, 8 of 66 headings a label or body, and 29 of 80 controls and captions something other than a label. At 17px a card's name, a section heading and an eight-line paragraph all get one role. 295 of the 550 places are a plain span, so the tag alone cannot carry it either.
- **The system behind it:** the signed-off design says text is read "with its context (tag, landmark, content shape, how often it repeats)". The earlier research said its roles were clustered on context, but its script assigned by size and only printed the context beside it. The engine was built from the script.
- **What we chose and why:** nothing built. The written piece (docs/research/text-role-signals.md) states the principle, "a text style names a job; the size belongs to the job", grounded in how Material and HTML define text, and lists the signals an experienced person reads. It sets no numbers.
- **Media hooks:** the 17px row: four places, four jobs, one role today.

## Clicked through by hand: the fix card was the path that mattered, and it was still broken (2026-11-12)
- **The itch:** the wrapper fix had only been proven one level below the flow people use. The owner: "Yes, click it through".
- **How we found it:** on crafting-ui, by hand: Blueprint on, Fix, and "Use" on the first problem, a too-heavy divider on the three header links, which are drawn through the shared Link component. The card answered "The change could not be written: This element spreads props, which may carry className; change the class by hand." The file was untouched.
- **The system behind it:** there are two on-page write paths, and the earlier fix changed the other one. The fix card's write found each element's own line and wrote there, so for anything drawn through a component it reached the component and was refused.
- **The fix:** the fix card's write now asks where the classes are written, the same way the cards do, and sends one edit per place (rows drawn by one line share it).
- **The proof, by hand:** the same three clicks again. The card said "Changed … at 1 place", and the two classes were in the header file on the line where the links are used, inside the fixed part of their class template; the Link component's file was untouched. plumber's own Undo then said "Undone. Your code is back as it was." and the file was byte-for-byte what it was before (same checksum).
- **Still not clicked:** the other on-page path changed earlier (picking fixes in the chooser and writing them together), and a third place that still writes at the element's own line (a follow-up class written after a token change).
- **Noticed:** the card's line reads "Changed border-line-strong to border-r-0 …" although border-line-strong is still there; and plumber's read reports this finding at the Link component's line, not where the link is used.

## The two remaining write paths: one did not exist, the other is fixed at its root (2026-11-12)
- **The itch:** two write paths were still unclicked after the fix card was proven. The owner: "Yes, both".
- **A correction first:** the path changed two entries ago ("picking several fixes and writing them together") is not on the page at all. Clicking a mark in the blueprint opens the same fix card; the module that held that path is imported by nothing. The edit made there did nothing and has been taken back.
- **How we found it:** by clicking a mark by hand and getting the fix card, then searching for what loads the old module: nothing does.
- **The system behind it:** every on-page write that is not the fix card gets its place from one small function, which answered with the element's own line. That is the wrapper component's line for a link or a button, where a write is refused. Two things use it: a fix taken on the element itself, and the follow-up class written after a new theme token.
- **The fix:** that function now answers with the place the element's classes are written (the usage, for a wrapped element), and falls back to the element's own line when that can't be found.
- **The proof, by hand:** the fix card was run again on crafting-ui after this change: same result, two classes on the line where the header links are used, the Link component's file untouched, and plumber's Undo put the file back byte for byte.
- **Not proven:** the two users of that function were not driven by hand. No page offered a fix that adds a theme token, and taking a fix on the element itself was not tried.
- **Noticed:** an unused module of about 750 lines (the old chooser and punch list) is still in the overlay's source.

## Text styles: the job first, then the size (2026-11-12)
- **The itch:** plumber folded text by size alone, so a 19px intro paragraph became "title large" and the style was shaped by paragraphs, not titles. The owner added: "on the front page we might have bigger titles, hero sections, and I think all those things are not really we are suggesting right now."
- **How we found it:** the old and the new code run over crafting-ui's 554 measured text places (`node bench/type-roles/before-after.mjs <old build>/rules/type-roles.js <new build>/rules/type-roles.js`).
- **The system behind it:** one ladder of size bands for all text; anything 60px and up left out as "poster size"; and a rule that folds two styles at one size together, which on this data folded 88 small plain-text places into the capitals label style.
- **What we chose and why:** a place's job is read where it says so itself: h1–h6 is a heading, a paragraph, a definition, a quotation or words that are a sentence are reading text (grounded in HTML's own definitions and Material's "roles that describe their purpose", docs/research/text-role-signals.md). The job picks the kind, the size picks the step inside it, on the size bands the code already had. Each job has its own ladder, so a large paragraph and a small heading may cross. A heading of 60px or more is the hero; anything else that large is still left out. A place that says nothing (a span) goes by size, as before. A sentence inside a button is not reading text.
- **Tried and dropped:** one "lead" step for all reading text of 17px and up: it pulled the 19px intro paragraphs down to 17px. Reading text now steps on the same bands as before (18.5, 17, 14.5).
- **The fix and the proof (crafting-ui, measured data, not yet seen in the panel):** 7 styles → 12. Left out: 4 → 2 (the two 64px page titles are now "display hero"). "Title large": was 19px regular, 20 paragraphs and 12 headings; now 20px medium, headings only; the paragraphs are "body lead", 19px regular. The 88 small plain-text places are their own small body style, no longer in the capitals label. Places needing a weight class beside their style: 61 → 38. Low confidence: 35 → 36. 119 places only change name (the 16px body style is now "body medium").
- **Not done:** not looked at in the running clean-up panel; the panel's plain names for the new styles are untouched; the text-role test still names the old styles and was not run; labels inside controls are still not a job of their own (label styles force capitals).
- **Media hooks:** the before/after table of styles; the 17px row.

## The old chooser module is gone (2026-11-12)
- **The itch:** an unused module of 758 lines (the old chooser card and punch list) was still in the overlay's source, and it had already cost one fix made in the wrong place. The owner: "Yes, remove it".
- **How we found it:** searching for anything that loads it: nothing in the overlay, the server, the tests or the demos. Earlier notes in the repo had already marked it retired.
- **The fix and the proof:** the file is deleted, its name is off the server's list of files it will hand to a page, and the one comment that pointed to it is corrected. The server's code type-checks, and on crafting-ui the overlay loads and reads the page as before (7 findings on the same page).
- **Left as it is:** older briefs and reviews in docs still name the file; they are a record of their time. The server's built copy was not rebuilt, so it still lists the name until the next build; nothing asks for it.

## The slow undo was the stopwatch, not plumber (2026-11-12)
- **The itch:** the write round reported that an undo shows on the page about 0.6 s later than a write. The owner picked it: "Slow undo".
- **A correction:** that figure was wrong. The round timed "is it on the page yet" with a timer that only ticks when the browser paints, and the browser pane was not always painting; the timer was slow, not the undo.
- **How we found it:** reading the server showed a write and an undo put the file on disk the same way, so there was nothing to make one slower. Timed again on crafting-ui by watching the page for the change itself, with 0, 1 and 3 seconds between the write and the undo.
- **The numbers:** a write is on the page 256 to 338 ms after it is sent; an undo 145 to 312 ms. Undo is as fast as a write or faster.
- **What is real:** the server answers a write about 490 ms after it is sent, some 200 ms after the change is already on the page. The page shows the fix before plumber's card can say it was written. Where that 200 ms goes is not measured.
- **A slip on the way:** the stalled timer left the test class in a crafting-ui file for about a minute. It was taken out with plumber's own undo, found through its history; the file is as it was (git shows no change).

## A grey fold must not flatten a row (2026-11-12)
- **The itch:** the owner asked for the other primitives to be gone through after text: "if you find still any gaps, and scope for improvement".
- **How we found it:** ran the colour, spacing and icon decisions on crafting-ui's running pages in the browser (`proposeColours`, `proposeSpacing`, `proposeIcons` on /interfaces, /, /motion, /standards) and read what each wanted to change.
- **What it showed:** on /interfaces, plumber wanted 105 changes, all the same one: each row's title (19px, medium, `text-fg/75`) folded to `text-muted`, the exact grey of the description under it. Title and description would read the same.
- **The system behind it:** a spare grey went to the nearest of the three text levels. The only guard was legibility (contrast). Nothing looked at the words beside it. The spacing pass already refuses a move that "would flatten the page's hierarchy"; colour had no such rule.
- **What we chose and why:** words that sit together keep their order. A grey folds to the nearest level in reach that still leaves it visibly apart from the words it stands apart from now; if none does, it is left and plumber says why. "Visibly" is the pass's existing visibility threshold; "together" is the smallest part of the page holding that text and at least one other. No new number.
- **The fix and the proof:** /interfaces: 105 changes → 0, with 105 places listed as left, each saying "as muted it would read the same as the words beside it, which it stands apart from now". Home and /standards: 0 changes before and after. Read in the browser from the running app; not seen in the clean-up panel; no test.
- **Not improved, and why:** spacing made 2 changes across four pages and icons none, so there was nothing to judge on this app. Radius has no clean-up pass at all.

## Where a write's answer spends its time (2026-11-12)
- **The itch:** the server answers a write about 200 ms after the change is already on the page, so the fix card says "written" late. The owner: "Write's late answer".
- **How we found it:** a private copy of crafting-ui and a private build of the server with timers in it, so nothing running was touched. One class written to one file and undone, four times.
- **The numbers (warm, on the copy):** a write takes about 225 ms and an undo about 190 ms. After the file is on disk the server does two things before it answers: it tells its analysis worker the file changed (about 115 ms) and asks what problems are left on that line (about 65 ms).
- **The system behind it:** the 115 ms is almost all bookkeeping, not analysis. Re-reading the changed file takes 7 ms. But one edited file marks 1,225 of the project's files as "ask again", and for each of them the worker works out what it depends on (24 ms), does much of that a second time for the same answer (11 ms), and ships the lot back to the server (about 40 ms to send, the rest to receive). The "what is left" question pays a smaller version of the same toll.
- **What we chose:** nothing is changed yet. The saving is real but small for the person (the page already shows the fix at about 300 ms), and the bigger fix changes how the engine decides what one edit invalidates, which is what keeps its answers right.
- **Why the live server is slower than the copy:** about 490 ms against 225 ms. Not measured; the live one also watches files and serves other sessions.

## A messy page to judge on; spacing follows the theme, icons compare with their row (2026-11-12)
- **The itch:** crafting-ui is too tidy to show what spacing and icons decide, so their decisions could not be judged. The owner: "Make one."
- **How we found it:** a dashboard ("Tally") written the way an LLM writes one over several prompts, in a project with its own theme it only half follows (`bench/messy/`, port 4313). Ran the spacing and icon decisions on it in the browser. Caveat: Claude wrote the page knowing what plumber checks; it is LLM-written, but not blind.
- **What it showed, spacing:** the theme names six steps (4, 8, 12, 16, 24, 32). Four hand-written 14px gaps and one 20px gap were left alone. The pass never looked at the theme: it read a scale off the gaps the code happens to use, and counted 14 as a "half step" because the page used it.
- **What it showed, icons:** a nav of five items, four icons at 18px and one at 16px, was not caught. Peers were all icons on the page beside text of one size, not the icons in the same row slot. A header bell was moved from 20px to 18px to match the "more" dots in the task rows, which it has nothing to do with.
- **What we chose and why:** spacing: when the theme names its steps, they are the scale (docs/VISION.md: "The design system leads. Values snap to the project's decisions"); a scale is read off the code only when the theme names none; the write uses the theme's own name (`gap-s4`). Icons: peers are first the icons in the same slot of repeated rows (same tags and positions under one container), because where an icon sits says what it is (craft rule 34: one icon size per list); an icon with no such rows is compared page-wide as before. No new number in either.
- **Tried and dropped:** slots by tag alone: a checkbox tick was compared with the clock in the same row. Position in the row is part of the slot now.
- **The fix and the proof (messy page):** spacing 0 changes → 5 (14→16 four times, 20→24 once; 3 writes; the 2px label gaps are still left as a level of their own). Icons: the wrong bell move is gone; the nav's 16px icon → 18px. crafting-ui /motion and /interfaces: the same before and after (its theme names no spacing steps). Also fixed: the spacing pass failed outright on a project with no site-wide measurements.
- **Not done:** radius still has no clean-up pass. On the messy page a card wears the control's radius (8px): right by value, wrong by role. Not seen in the clean-up panel; no tests.
- **Media hooks:** bench/messy before/after of the activity card's gaps and the nav icons.

## Radius by job (2026-11-12)
- **The itch:** radius had no clean-up pass at all, and the only radius suggestion plumber makes is the nearest token by value. On the messy page a card wears 8px: exactly the control's token, so nothing was said.
- **How we found it:** the messy dashboard (bench/messy), whose theme names three radii for jobs: tag 6, control 8, card 12.
- **The system behind it:** a radius was only ever a number to match. Nothing read what the rounded thing is.
- **What we chose and why:** a corner's radius says what kind of thing it is. Atlassian's radius tokens are assigned the same way, to "supporting", "interactive" and "containment" elements ([reference](references.md)). So plumber reads what the element is (a control: something you press or type in, or the box round controls only; a tag: a phrase-level element holding only its own words; a card: a painted box holding things with words) and gives it the step the theme names for that job. A theme whose radii are named by size (sm, md, lg) names no jobs, so nothing is proposed there. Left alone: pills and circles, a child in a rounded parent's corner (the concentric rule's), anything that does not say what it is (an icon tile).
- **Tried and dropped:** telling a tag by "drawn inline": a chip inside a flex row is no longer inline. It is told by being a phrase-level element instead.
- **The fix and the proof (messy page, engine output in the browser):** 11 changes: two buttons 6 → 8 and one 10 → 8; five priority chips 4 → 6; the hero 16 → 12, the activity card 14 → 12, and the team card 8 → 12 (the one a value match could never catch). Distinct radii on the page: 7 → 4. crafting-ui: nothing proposed (its radii are named xs to xl).
- **Not done:** it is a reading and a decision only: not a step in the clean-up panel, nothing is written to source. The file is added to the list the server hands the page, but that needs a build; here it was loaded straight from disk, and its own fetch of the theme was not exercised (the theme was handed in). No tests.

## The small trim: a write's bookkeeping, done once (2026-11-12)
- **The itch:** after every write the server worked out the dependency lists of 1,225 files twice and sent both copies across. The owner chose the safe option: "Small safe trim".
- **The system behind it:** a refresh answers with those lists, and the envelope every answer travels in worked out and carried the same lists again. The server stored both into the same table, one after the other.
- **The fix:** on a refresh the envelope reuses the lists the answer already holds and carries none of its own. What the engine decides to re-check is untouched.
- **The proof:** old and new servers run side by side on a private copy of crafting-ui, six writes and undos each. Median write 228 ms → 149 ms, the refresh step 127 ms → 66 ms, undo 181 ms → 129 ms. Both ended with the same table (1,225 entries, same checksum), the same 1,330 tracked files, the same file hashes and the same "nothing left" answer.
- **Not done:** the engine's own test suite was not run, and the running dev servers still use the old build until the server is next built.
- **Still open:** the larger cause is unchanged: one edit marks 1,225 files as changed.

## Corners become the clean-up's fifth pass (2026-11-12)
- **The itch:** radius by job was a decision nobody could see or apply.
- **What we built:** a fifth pass, "Corners", in the clean-up panel, in the same shape as the colour and icon passes: one row per job (tags, controls, cards) with a corner drawn at the size it has now, a preview that eases each corner to the theme's step, and a write of the class where it is.
- **The fix and the proof (bench/messy, in the running panel):** the panel reads "This page uses 7 corner sizes. After this, 4." with three rows: Tags 4px → 6px (5 places), Controls 6px → 8px (3), Cards 16px → 12px (3). Preview showed the three steps as chips (6, 8, 12). Apply wrote 7 lines in one file (`rounded-md` and `rounded-[10px]` → `rounded-control`, `rounded-2xl`, `rounded-lg` and `rounded-[14px]` → `rounded-card`, `rounded` → `rounded-tag`) and said "11 corners in 1 file now use your corner sizes". The file was put back afterwards.
- **Found on the way, text:** the messy page puts everything in a `<p>`, so a stat's "142" at 30px was read as reading text ("body lead"). A paragraph tag whose measured words are not a sentence now says nothing, and size stands in as before. crafting-ui's text comparison after this: 12 styles, weight classes beside a style 61 → 35, low confidence 35 → 35.
- **Found on the way, panel:** the icons pass shows 0 on the messy page although one icon should change: its size is set by a prop, and the pass only writes classes.
- **Not done:** undo of the corners write was not tried; a theme named by size shows an explanation instead of rows, but that screen was not looked at; no tests. The server code was rebuilt in place (dist) so the page could load the new files.

## The icons pass writes a size passed as a prop (2026-11-12)
- **The itch:** on the messy page the panel showed 0 icon changes, though one nav icon was 16px among four at 18px. The decision was made and then dropped: the size is a prop (`<Chart size={16} />`) and the pass only wrote classes.
- **The system behind it:** the clean-up's writes were class swaps only. The server could already set a literal prop on a JSX element, but nothing told it which element: the icon's svg is drawn two components down from where the number is written.
- **What we chose and why:** the number is changed where a person would change it, at the usage. React says which components wrap this icon alone and were handed the prop; the outermost of them is the one whose usage holds the number, and the icon's own chain of usages gives its line. A prop that is computed, or only spread in, is refused by the server with its reason. Prop writes go first and swaps in the same file follow with the file's new hash, all under one undo.
- **The fix and the proof (bench/messy, in the running panel):** the Icons step now reads "1 icon is off your icon system. Size 16px → 18px". Apply wrote one line, `<Chart size={16} stroke={1.5} />` → `<Chart size={18} stroke={1.5} />`, and all five nav icons drew at 18. Undo in the panel put the 16 back and the file was clean.
- **Noticed:** the panel's count read "10 → 10 icon sizes and strokes": one size fewer, one stroke more, because a line icon drawn larger has a thicker stroke on screen. True, but it reads as if nothing changed.
- **Not done:** a stroke passed as a prop goes through the same path and was not tried; an icon set whose size prop is spread through more layers was not tried; no tests.

## Tests for the day's changes, and what they caught (2026-11-12)
- **The itch:** the owner, once the behaviour had settled: "Yes, write tests."
- **What was written:** one new test on the messy page (`e2e/cleanup-messy.test.mjs`): real Vite, the real CLI and a real browser drive the clean-up panel by its keys and read every write back from the source file. It checks the four decisions plumber got wrong before today: the 14px gaps go to the theme's step and are written by its name; a row's title is left apart from its description, with the reason; the nav's 16px icon is seen among its peers and its prop is changed at the usage, while the header bell is left; corners go to the theme's step by job, a card at the control's size included, and Undo takes only the corners back. The text-role test now says a 17px card title and a 17px lead paragraph are two styles.
- **What the existing tests caught, twice:**
  - The 16px body style had been renamed "body medium". That name ("body large") is used in project configs and in the element card. The name is back; larger reading text steps above it as "body xlarge" (17px) and "body lead" (18.5px and up).
  - The spacing test moved every 20px space to 24px. Its page is a crafting-ui page drawn on the demo's theme, which names five spacing steps; crafting-ui names none. Two changes came from it: the theme's named steps are the scale only when they themselves form a grid or a ratio by plumber's own detector (two named layout sizes, a sidebar and a header, are not a scale), and the test's page now runs on a theme with no named steps, like the app it copies. The panel also says "Your theme names its spacing steps" when that is the scale.
- **The proof:** run one file at a time on the laptop: the new test passes (24 s), the text-role test passes, both spacing tests pass; the element-card text test, the clean-up test, the icon test and the colour test showed no failures.
- **Not done:** the new test was not run against yesterday's code to see it fail there; the full suite was not run (it runs on vm-agent, and was not asked for).

## The full suite on vm-agent again, and the first round of fixes (2026-11-12)
- **The itch:** the owner, after the day's tests: "Yes, run it", then "fix the breaking", then "fix all".
- **How we found it:** the whole suite on vm-agent, side by side on 6 cores while another session's run used the rest (184 runs, 19.9 min): 926 tests passed, 55 failed in 29 files. This morning's run had 54 failed in 29 files.
- **What today's work had broken (4 files), and the cause of each:**
  - Colour: a spare grey beside its twin was left alone. The new "keep the order" rule compared it with every text beside it; two texts of one size and weight do the same job, so their difference is drift to fold. The order is now kept only against text of another size or weight (a title and its description).
  - Text style names: with more body styles, two were both called "Body smaller". The page's hero and the larger reading text are now named apart ("Hero", "Lead"), so "Body" and "Display" keep their meaning.
  - Two more test pages were a crafting-ui page drawn on the demo's theme with its named spacing steps; they now run on a theme like crafting-ui's.
  - A missing import in my own fix to a test.
- **Older failures fixed on the way (8 files):** the report schema did not name two fields the report prints; three checks were stale against wording or code that had changed; one check depended on the checkout's folder name; the 18px base font never reached the headless browser; the report test's child output was over Node's 1 MB default; a habit's reason folds in its column; the text editor's waits threw while the overlay reloaded; the selection test's card tripped a craft check added after it was written, and its walk stopped at another cause's note.
- **The proof:** rerun on vm-agent: colour-read, cleanup-spacing-proofs, cleanup-spacing, cleanup-colour, cleanup-messy, type-roles, units, cli, locate, project-layouts, hosts, report, report-nits, text-editor pass. The selection test passes on the laptop (6 of 6), not yet rerun on vm-agent.
- **Not fixed (17 files):** blueprint-corners (8 tests), blueprint (3), fixpanel (4), rename (8), readiness-panel (2), text-edit (2), and one each in blueprint-determinism, cleanup-site, craft, craft-token, one-bar, site-replay, timeline, verify-writes, verify-frozen, packaging, blueprint-next-performance. Most wait for a piece of the panel that has since been redesigned. readiness-panel and text-edit have another session's uncommitted changes in this checkout. The timeline test (qa-fixes-2) passed once and failed once on the same commit: a flake, not from today's work.

## Old and repeated tests removed (2026-11-12)
- **The itch:** seventeen test files still failed after the first round of fixes. The owner: "no remove redundant and old ones."
- **How we sorted them:** reran the failing files on vm-agent with their logs kept and read what each test was waiting for.
- **Removed (27 tests, 849 lines):** blueprint-corners (8 tests, every one waiting for the dock's old line "problems in view / nothing to fix"); site-replay and verify-writes (waiting for the popover card, retired); three blueprint tests and four fix-panel tests (the dock's Blueprint button, the old "N problems · N fixes" line); one clean-up site test (a button in the bar that is gone); and the eight config-extension variants of one rename check, since accepting decisions is covered by the ledger, adoption, surfaces and messages tests.
- **Kept and fixed:** the packaging test now accepts the JSON packs the package ships.
- **The proof:** the whole suite on vm-agent: 944 tests passed, 11 failed in 9 files (16.2 min on 7 cores). Before today's rounds: 55 failed in 29 files.
- **Still failing, all about live behaviour (9 files):** the same page giving different problems at different sizes (blueprint-determinism); a new finding on the demo the noise check does not expect (craft); the one bar not fitting with its tools out (one-bar); a new token test that loses the page to a reload (craft-token); a Next performance wait (blueprint-next-performance); the timeline undo check, which is flaky; a frozen-server test that fails only when run beside other tests; and readiness-panel and text-edit (4 tests), which another session is changing in this checkout.

## Control sizes (2026-11-12)
- **The itch:** the owner asked which primitives are missing beside the five the clean-up covers, and picked control sizes first. Plumber collected sizes and never judged them.
- **How we found it:** the messy dashboard at 1440 wide: nine boxed controls at five heights (27.5, 28, 34, 36, 42px).
- **The system behind it:** a button's height fell out of its padding, its line height and its border, so each small slip made a new height: a border added to one button of a pair (40 → 42, and its neighbour stretched with it), a border on a 32px button (34), a 19.5px line (27.5).
- **What we chose and why:** a control's height is a decision of the system: Primer names one fixed height per control size, all on a 4px unit ([reference](references.md)). So a control's height sits on the project's spacing unit. One off the unit goes to its height without its border when that is on the unit (the border was added on top), else to the nearer step; a tie is said, not moved; a control only stretched to an off-unit neighbour needs no change. In a row whose controls differ, the one height on the unit is the row's; with none or several, plumber says the row is uneven and proposes nothing. No number of its own.
- **Tried and dropped:** judging only rows. At desktop width the pair of hero buttons are the same 42px, because a flex row stretches them; the slip is the height itself, not a mismatch.
- **The fix and the proof (messy page, engine output in the browser at 1440 wide):** 5 changes: "View sprint board" 42 → 40 (its neighbour follows), the three tab buttons 27.5 → 28, "Manage team" 34 → 32. Heights: 5 → 4 (28, 32, 36, 40).
- **Not done:** a reading and a decision only: not a pass in the clean-up panel, writes nothing. At a narrow width button labels wrap and the heights are the wrapped ones; a wrapped control should be left out. A theme that names its own control sizes is not read yet. No tests.

## Decided: the principle is grounded, the mechanism may be invented (2026-11-12)
- **The question:** one line in docs/PRINCIPLES.md was Claude's reading, not the owner's words: the principle behind a suggestion must be real and grounded, while the mechanism that carries it out may be invented, with its numbers tuned on real apps.
- **The owner's answer:** yes. The line stands as the owner's.

## Decided: text styles are named for their job (2026-11-12)
- **The question:** the four new text styles had names Claude made up; two say a job ("hero", "lead") where the older ones say a size ("large", "medium").
- **The owner's answer:** "I think we should follow the most semantically relevant naming convention."
- **What changed:** the job names stay (`display-hero`, `body-lead`), and the one new name that only said a size, `body-xlarge`, is now `body-lead-small`: lead text, one step down. The panel shows "Hero", "Lead" and "Lead small". Existing styles keep their names, because project configs and code already use them.
- **The proof:** the text-role test passes with the new name.
- **Also decided:** the older styles keep their size names (`title-medium`, `body-large` and the rest). Asked whether to rename them by job too, the owner: "No, leave them."

## Text and fill colours read from the code (2026-11-12)
- **The itch:** shadcn's colour names misled plumber: `primary-foreground` (the words on the main button) was read as the brand, `popover-foreground` as a surface, `secondary` (a button's fill) as muted text.
- **How we found it:** the same shadcn test page as the hover work, reading every colour.
- **The fix:** a colour the code uses only for words is text, and one it only fills with is a surface, whatever its name says. Words named after a fill (`X-foreground`) are the words on it: on the brand they are `on-accent`, otherwise the main text, unless the fill's own name is a quieter level (`muted-foreground` stays muted). States are read first, so the words on shadcn's hover `accent` are not mistaken for words on the brand.
- **The proof:** all 14 shadcn colours on the page now read right, and the rename plan maps `primary → accent`, `accent → surface-hover`, `primary-foreground → on-accent`, `background → ground`, `destructive → danger`. crafting-ui: no colour reads differently.
- **Media hooks:** a before/after table of the 14 shadcn colours and what plumber called each.

## The full suite after the write trim: nothing fails because of this session's changes (2026-11-12)
- **The itch:** the trim to the server's bookkeeping is engine code; the owner: "Yes, run it".
- **How we found it:** the whole suite on vm-agent at the commit with the trim: 954 passed, 58 failed in 29 files, in 59 minutes. It ran with this branch's one-file-at-a-time runner by mistake; the side-by-side runner would have taken about 17. The runner stops at the first group that fails, so the burst test and the server test in two modes did not run.
- **Sorting:** 23 of the 29 files were already failing in the morning's run. The other six (spacing clean-up twice, colour read, text styles, text roles, source stamping) plus two suspects were then run on that commit and on the same commit with this session's four changed engine and overlay files put back as they were.
- **The proof:** every test that failed with the changes also failed without them (13 on both sides). One more, the stamping test, failed only without them, which on one run is a flake, not a fix. Nothing fails because of the write trim, the read speed-ups or the write-path fixes.
- **Not covered:** the three new checks themselves were not put back in that comparison; the "well-built page yields no finding" test does fail, on five other checks, and none of the three new ones is in its output.

## Which colour gets the surface name (2026-11-12)
- **The itch:** in a shadcn rename plan the `surface` name went to `input` (a field's colour) instead of `popover` (the real raised background), only because `input` is a shorter word.
- **The system behind it:** four shadcn fills (`popover`, `muted`, `secondary`, `input`) all read as "surface", and the tie was broken by name length. Plumber never compared a fill with the page, and never asked whether a colour does only that job.
- **The fix:** a fill darker than the page is set into it (sunken: a well, a field, a tab track); one as light as the page or lighter sits on it (surface). A fill whose name already says surface, card, panel or popover is not moved. When two colours still compete for a name, the one the code uses only for that job wins (`input` is also a border).
- **The proof:** the shadcn plan now gives `popover → surface`, `muted → sunken`, `accent → surface-hover`, `primary → accent`, `primary-foreground → on-accent`; `secondary` and `input` keep their names (sunken is taken). crafting-ui: no colour reads differently.

## Three small checks from the backlog's "now" list (2026-11-12)
- **Wrapped controls:** a button whose words wrap onto a second line is no longer read as a tall control. At a narrow window the messy page's control sizes now propose only the three tab buttons; at 1440 wide the same five changes as before.
- **Undo of the corners write:** applied the 11 corner changes from the panel, pressed Undo, and the source file was back as it was.
- **Text styles in the running panel (messy page):** the panel reads "Your site uses 14 text sizes. These 8 styles cover them", with the new names showing as "Lead" and "Title small". Two things it showed that the data run had not: the four stat figures (30px) are folded into the 24px headline style, and 37 places of 12px text go up to 14px. Both are in the backlog.

## A big number is a figure, not a heading (2026-11-12)
- **The itch:** in the running panel, the messy dashboard's four stat figures ("142", 30px) were folded into the 24px headline style with a section title: they would have shrunk by 6px. The owner: "Yes, its own job."
- **The system behind it:** a `<p>` holding a number is not a sentence, so it went by size alone, into whatever heading style had that size.
- **What we chose and why:** a place whose own words are a number (digits with their signs, a currency or percent mark, at most a two-letter unit) and that is drawn at heading size, 22px and up, is a figure with its own style, `display-figure`, shown as "Figure". Material groups numerals with display text ("short, important text or numerals"; read second-hand). A small number, a count in a row or a table cell, goes by size like other text. A heading tag still wins.
- **The fix and the proof:** the messy-page test now checks the panel shows "Figure 30px" and no "30px → 24px"; it passes, and so does the text-role test. On crafting-ui's measured text three places become figures.
- **What it does not do:** one figure style for all figures, so differently sized numbers fold together (crafting-ui's 31px "9:41" would go to 22px, where it went to 24px before). Logged in the backlog.

## Decide, don't ask (2026-11-12)
- **The itch:** the owner: "bruh dont ask me for everything take an educated opinion and intuition on what would a principle design engineer would do."
- **The system behind it:** every turn ended with a question, and the backlog held thirteen "open questions" that were ordinary design-engineering calls.
- **What replaces it:** Claude decides such calls the way a principal design engineer would, from a principle, does the work, and writes the decision with its reason where the owner can overturn it (docs/backlog.md, "Decided by Claude"). Only destructive, outward-facing or paid actions, and taste the owner has reserved, are asked first.
- **Decided at once:** the eleven remaining questions (the table in the backlog) and the order of work.

## The 16 uncovered defensive tips, sorted by principle; the first check built (2026-11-12)
- **The itch:** the owner asked "all tips encoded?" (9 of 25 were), then: "Yes, go through them", under the day's rule that nothing becomes a check without a principle and a ground.
- **How we found it:** each of the 16 tip pages read at the source, then walked through the chain in docs/PRINCIPLES.md. Written up in [docs/research/defensive-tips.md](research/defensive-tips.md).
- **The sorting:** 11 tips hold and become 9 checks; 4 do not hold (a design choice, a caution against token practice, a stylesheet lint, something Tailwind's reset already does); 1 waits on a decision (a button's least width is a number with no ground yet).
- **The first check: a sticky thing that can never stick.** A sticky side column in a grid or a flex row is stretched to its row's full height, so it has no room to move and scrolls away. Plumber reads it from what is measured (sticky, in such a row, nothing setting its alignment or height, its box taller than its own content) with no threshold of its own, and offers `self-start`.
- **The proof so far:** on a page we wrote: 2 stretched columns found on the right lines, 3 correctly built ones left alone, nothing else marked; after the fix was written both columns were their own height (48 and 20 px in a 384 px row) and plumber found nothing.
- **Not proven on a real app:** crafting-ui has two sticky side columns with no alignment and one built right, but the overlay does not load on its running dev server (started before another session added a module; it answers 404 for it). The before and after from a real app is still owed.

## Caption text keeps its size (2026-11-12)
- **The itch:** in the running panel the messy page's 37 places of 12px text were pulled up to a 14px "Body small".
- **The system behind it:** everything under 14.5px that was not a capital label was one style, so its most common size won.
- **Decided by Claude, as a design engineer would:** 12px and under is caption text (a timestamp, a hint), a job of its own; 13 and 14px are small body. The cut sits halfway between 12 and 13, like the other cuts in the ladder. Named `body-caption`, shown as "Caption".
- **The proof:** on crafting-ui's measured text: small body 13px (40 places), caption 12px (48 places), low-confidence places 35 → 34. The text-role and messy-page tests pass.

## Padding and gaps in rows are read (2026-11-12)
- **The itch:** the spacing pass only saw the space between stacked things. On the messy page a card with 18px padding, cells at 20px and icon gaps at 10px were never looked at.
- **Decided by Claude:** they are spacing like any other, so they sit on the same scale: the theme's steps when it names a scale. A size off the scale goes to the nearest step when one is within a quarter of it, the stack pass's own rule; further than that it is a size of its own and stays. A control's top and bottom padding is left alone, because its height is the control's size.
- **The fix and the proof (messy page at 1440 wide, engine output in the browser):** 145 padding and gap classes read; 33 change: 20px → 24px on 23 places (cards and table cells), 10px → 12px on 7, 14px and 18px → 16px on 3. Distinct sizes among them: 12 → 8. Left as their own: the 2px chip padding and two 6px sizes.
- **Not done:** not in the panel's Spacing step, so nothing is shown or written. No tests.

## The sticky check on a real app: crafting-ui's skill pages (2026-11-12)
- **The itch:** the sticky check had only been seen on a page we wrote; the before and after from a real app was owed. The owner allowed the restart of crafting-ui's dev server that it needed.
- **How we found it:** plumber's read of crafting-ui after the restart, then the fix taken by hand through the fix card.
- **Before:** on every skill page the side column (what it was learned on, what changed, the group's other skills) is set to stick. It was 1,603 px tall, the full height of its row, around 454 px of content. Scrolled 900 px down, its top was 740 px above the window: gone. Plumber said: "This is set to stay in view as the page scrolls, but it is stretched 1149px past its own content, to the full height of its row, so it has nowhere to move." and offered `self-start`.
- **After the fix, taken with one click:** the class was written on the line where the column is, the column was 454 px tall in the same 1,603 px row, and scrolled 900 px down it sat 32 px from the top of the window, beside the text. Plumber asked again found nothing for it.
- **Left as found:** the fix was undone with plumber's Undo; the file is byte for byte what it was. It is a real bug the owner can take with one click.
- **A guess that was wrong:** the pattern pages' sticky column was expected to be a second case. It is not: its parent is an ordinary block much taller than it, so it has room, and plumber rightly said nothing.
- **What the fix revealed:** with the column back in view, a long line of code in the main text runs under it. That is the next check on the list (text in a grid cell may shrink), with a real case waiting.
- **Media hooks:** the same page scrolled 900 px, before (column gone) and after (column beside the text); the fix card reading "Set to stick, but can't".

## Padding, row gaps and control sizes reach the panel (2026-11-12)
- **The itch:** both were decisions nobody could see or apply.
- **What changed:** the Spacing step now lists padding and gaps in rows as their own rows beside the stacks' ("Padding 20px → 24px, 22 places", "Gap in a row 10px → 12px"), previews them and writes them. A sixth step, "Controls", lists control heights ("Height 42px → 40px"), previews them and writes a height class on the control.
- **The proof (messy page, in the running panel, through the test):** Spacing reads "This page has 12 different spaces between things. After this, 8." Apply writes `p-[18px]` → `p-s4`, `gap-[10px]` → `gap-s3`, `px-5` → `px-s6`, and leaves a button's `py-2.5` and a chip's `py-0.5`. Controls: Apply adds `h-10` to the bordered button of the hero's pair and `h-s8` to the bordered 34px one; the button that was only stretched gets nothing; Undo takes the height classes back and leaves the earlier steps written. The messy-page test passes with all of it.
- **What the older spacing tests caught, on a crafting-ui page:** three things the padding reader got wrong, each now a rule. With no scale named in the theme, the framework's own steps are the system, so `px-2.5` is fine and only a hand-written size is judged. A padding on one side alone (`pt-[5px]`, lining a label up with the text beside it) is an adjustment, not the box's spacing, and is left. A size in a relative unit or a formula (`gap-[1cqw]`) is worked out by the page and is never rewritten. All spacing tests pass again.

## The second check from the tips: a grid cell held open by what should scroll (2026-11-12)
- **The itch:** the owner kept the sticky fix in crafting-ui ("Yes, keep the fix"). With the side column in view, a line of code in the main text ran under it.
- **How we found it:** measuring the page: the numbered list is a grid 704 px wide, and the item holding the code block was 802 px. The code block is set to scroll sideways, but it was 798 px wide and scrolling nothing.
- **The system behind it:** a grid cell, like a flex item, is never narrower than what it holds unless told it may be. The scrolling block inside holds the cell open, so the block grows instead of scrolling.
- **The fix in plumber:** the existing "text in a row may shrink" check now reads grid cells too, and counts a part set to scroll sideways as something meant to give way. It stays quiet where the column is written to go down to nothing, which is what Tailwind's numbered columns mean.
- **Before, on crafting-ui:** plumber said "This runs 122px past its column." on the list item's line in the markdown component and offered `min-w-0`.
- **After:** the item was 680 px, inside its column; the code block was 676 px wide with 796 px of code, so it scrolls; nothing ran under the side column; plumber found nothing.
- **Kept:** first put back with plumber's undo, then written again when the owner said "Yes, keep it too". Both fixes are in crafting-ui, uncommitted there.
- **What got in the way:** the overlay stopped loading on crafting-ui three times in twenty minutes. Each time another session had added a file to the overlay; a dev server only hands out the files it knew when it started, so it needs a restart for each new one.
- **Media hooks:** the skill page scrolled to "How": before, the code line running under the side column; after, the code block inside its column with a scrollbar.

## The third check from the tips: a set height on a box that holds text (2026-11-12)
- **The itch:** next on the sorted list; the owner: "Yes, next check".
- **The principle and its ground:** a box that holds text sets its least height, not its exact height, because text grows downward. Re-read at the source when built: the tip's page and MDN's min-height page. The vertical-media-queries tip's case (a full-screen-height box holding content) is the same thing and is covered by it.
- **How plumber reads it:** a height class on a box where a line of words already runs to a second line, nothing said about overflow, and not a control, a picture or a scroll area. No threshold: "wraps" is measured. It offers the same height as the least: `h-40` becomes `min-h-40`.
- **The proof, on a page we wrote:** a box whose text spills ("The text here runs 20px past this box’s set height.") and one that only fits today were both found; five correct ones (a least height, a button, a scroll area, a one-line bar, a clipped box) were left alone. After plumber wrote the swap, the box grew from 80 to 112 px and held its text.
- **On real apps: nothing changed.** crafting-ui's seven pages hold 619 height classes and none is this mistake; plumber said nothing, which is right. algorecall's home has none either, at desktop or phone width. So there is no before and after from a real app for this check.
- **What got in the way:** plumber's full read does not finish on algorecall while the browser pane is hidden (it timed out at 45 s), so only its home page was checked, by running the one check directly.

## The fourth check from the tips: a scrollbar with nothing to scroll (2026-11-12)
- **The itch:** next on the sorted list; the owner: "Yes, next check".
- **The principle and its ground:** a scrollbar says "there is more". MDN's overflow page: `scroll` draws scrollbars "whether overflowing or not"; `auto` only "when overflowing". On Windows, or a Mac set to always show them, an empty track sits beside short content.
- **How plumber reads it:** `overflow: scroll` on either axis of anything but the page itself; it says "nothing to scroll" when that is so today, and offers the same class ending in `auto`.
- **The proof, on a page we wrote:** both boxes with an empty scrollbar were found on their lines (one axis, and both axes); the two correct ones were left alone; after plumber wrote `overflow-y-auto`, that box was found no more.
- **On real apps: nothing changed.** No app here writes `overflow-scroll`, so there is nothing for it to find. The browser pane hides scrollbars (macOS), so the empty track itself was not seen.
- **Noticed:** on a box that always scrolls and already overflows, the existing "nothing shows it scrolls" finding outranks this one on the same element, so only one is said.

## The words on a button are a label (2026-11-12)
- **The itch:** a button's text went by size alone, into a body or title style, because plumber's label styles force capitals.
- **Decided by Claude:** the words on something you press are its label: Material's label styles are for "text inside components", and its buttons use one. Two plain-case styles, `label-control` (13.5px and up) and `label-control-small`, shown as "Button" and "Button small". A control drawn at title size or larger (a hero's call to action) goes by size like any large text. The page reader now says whether a place is, or sits inside, a button, a tab, a menu item, a summary or a form label.
- **The proof:** on crafting-ui's measured text, 20 places become button labels (15px ×7, 13px ×13), where 13 of them had been put in the capitals label style. The text-role and messy-page tests pass; the messy-page test checks the panel lists a Button style.
- **What it costs:** low-confidence places 34 → 37: a button label's line height comes from the most common one among buttons.

## The fifth check from the tips: parts of a row kept apart only by left-over space (2026-11-12)
- **The itch:** next on the sorted list; the owner: "Yes, next check".
- **The principle:** the distance between neighbours is a decision. A title and its actions kept apart only by `justify-between` and no gap close to nothing with a longer title, a translation or a narrower screen. Ground: the two tips (component spacing, using space-between).
- **First version, read on crafting-ui:** 8 findings on 4 pages. Three were wrong in ways that changed the check: a phone status bar drawn inside a mock-up (decorative, hidden from readers: now skipped); gaps measured between wrappers instead of what they draw (a label that grows to fill its row read as "touching": now measured between words and icons); and suggested gaps like `gap-[67px]` taken from padding (padding is an inset, not a distance between neighbours: dropped).
- **The gap, now:** at least the gap inside its own parts (a group sits further from its neighbour than its items sit from each other), else the layout around it, else half the row's text size (invented, tuned once here), on the theme's scale. On crafting-ui that gives `gap-3` beside its own `gap-3` groups, `gap-5` inside a 20 px layout.
- **What it finds on crafting-ui now:** 5 places, all the tip's own pattern (a header and what sits at its end). At desktop width they are 123 to 185 px apart, which is left-over space and nothing else.
- **Before and after, and what it did not fix:** in the bottom-sheet demo at phone width, "Nearby workshops" and "6 open" touch. Plumber said "These parts touch: nothing but left-over space keeps them apart, and there is none left." and offered `gap-4`. Written, they were 16 px apart and plumber found nothing; but the count was pushed past the card's edge, because that mock-up is 106 px wide at phone width. The gap is right and the layout is still not: plumber does not name the second problem. The fix was put back; the file is as it was.
- **Not built:** the second form (three or more like items spread by `justify-between`).

## Tests for reading colours from the code (2026-11-12)
- **What they cover** (e2e/colour-names.test.mjs, real Vite, Tailwind, overlay and browser): a page built from shadcn's own theme and component classes, through the clean-up panel's rename plan: `accent` (only filled on hover, focus, an open menu) is the hover surface; `primary` the accent; `primary-foreground` the words on it; `popover` the surface; `muted` sunken (darker than the page); `input` and the other `-foreground` colours never take a name meant for another job. The brand test now also checks the hint: red is told it sits by the error colour, yellow by the warning, blue nothing.
- **A bug the first run caught:** an accent used only for words (crafting-ui-style `draw`, a link colour) was turned into plain text, so the second ink lost its role and `draw-soft` would have been renamed `accent-soft`. Only a colour named as a surface, or named `X-foreground`, now moves to text. The existing rename test caught it.
- **A test mistake:** the shadcn page first carried the demo's other screens, whose code really does use `bg-accent` at rest, so plumber rightly kept `accent` as the brand. The shadcn test now serves only its own screen.
- **Run:** 4 of 4 pass on the laptop. Dark mode: the palette is read with the theme's light values even when the page is dark, so sunken or raised is decided in light (the rule wanted).

## Two "real bug" tests, looked at (2026-11-12)
- **"The same page gives the same problems at every window size":** not a bug. The test failed on its first sanity check, which assumed one problem per place; a place can now carry two (a value off the scale and a craft finding: 151 problems on 150 places). With that check loosened, the comparison itself passes: the page gives the same problems at every size.
- **"The bar fits with its tools out":** passes on the Mac and fails on vm-agent, where the close button falls off the bar at 1440 wide. The bar's fit depends on how wide the system font is. Not fixed; in the backlog.

## The sixth check from the tips: a list in a row that cannot wrap (2026-11-12)
- **The itch:** next on the sorted list; the owner: "Next check".
- **The principle:** a list of unknown length needs somewhere to go when its row is full; a flex row does not wrap unless told. Ground: the tip ("those child items won’t wrap into a new line by default").
- **The judgement:** telling a list from a fixed set (tabs, a toolbar). A list is what one line of code draws many times; plumber reads that from each part's source stamp.
- **First version, read on crafting-ui: 16 findings, all wrong.** Three reasons, each now fixed: a spec value was missing on the running server, so rows of one part passed (now defaults to three); every Link carries the Link component's own line, so any links looked like one list (now read by the line that uses the component, from React's tree); and the header's joined, bordered navigation is one control, not a list (parts set edge to edge are now left alone). The page's section links, written with `flex-nowrap` and hidden on narrow screens, were the author's decision (now respected).
- **Now:** one finding on crafting-ui, the three figures on the templates page, drawn from a three-item list written in the code. At phone width it fits (358 of 358 px). It is a fixed set the check cannot yet tell from a list; noted, not fixed. No before and after from a real app.
- **Seen on the way:** the motion vocabulary page (7,274 elements) closed the browser tab during plumber's read.

## The new text styles written into crafting-ui: three problems (2026-11-12)
- **The itch:** the reworked spec had only been proven on test pages; crafting-ui is the real check.
- **How:** a copy of crafting-ui on its own branch (`plumber-text-roles`, at ../crafting-ui-roles, from its last commit; the main crafting-ui folder holds someone's uncommitted work and was not touched). Plumber read all 120 pages, proposed 15 text styles for 35 sizes, and wrote them across the site: 39 files, 297 class swaps; one letter-spacing value and one swap refused.
- **What went wrong, seen on the craft page** (docs/media/crafting-ui-roles-craft-before.jpg, -after.jpg):
  1. Page headings shrink: "Craft" (an h1 at 33px) became the 22px headline style. 37 places move 2px or more; the largest are 28–33px headings landing on 22px, and 9px text going to 12px.
  2. A class that is not about type was dropped: `first-letter:uppercase` on the rule titles, so "A play button that looks centred" now reads "a play button…".
  3. `leading-prose` landed on headings (the group names, h2), not only on reading text.
- **Not fixed here:** the text-style code was being changed by another session at the same time (four commits this afternoon); fixing it underneath them would collide. The trial stays on its branch, committed, not merged.
- **Media hooks:** the craft page before and after, side by side.

## crafting-ui's vocabulary page: live examples mount only near the screen (2026-11-12)
- **The itch:** the owner: "also make the vocabulary page performant pls". Plumber's read had closed the browser tab on it.
- **How we found it:** measured in the browser: 9,474 elements, one 589 ms task before anything showed, first paint at 1.45 s. 34 of its 36 term cards carry a live example, and those examples were 7,467 of the 9,474 elements, all mounted at once.
- **The fix (in crafting-ui, not committed there):** each card's live example mounts when it comes within 1,000 px of the screen. Until then a quiet box of a typical example's height holds its place in the card's grid rows. The larger view a card opens is unchanged.
- **After:** 2,007 elements at load, no long task seen, and plumber's whole read of the page finished (3.7 s, 985 elements read) where it had closed the tab. Scrolled to the end, the examples mounted as they came near.
- **Not right yet:** the timings were taken with the browser pane hidden, which can skew them; the element counts are firm. The box is one height while examples run from 369 to 884 px, so the page grows by about 130 px as they mount, out of sight. On a fast fling an example can show its empty box for a moment.

## The three text-write problems fixed (2026-11-12)
- **The fix, one per problem:**
  1. Headings get three headline steps (Material 3's 32 / 28 / 24 split at 30 and 26px), not one 22–36px role: "Craft" goes 33 → 30px, not 22px. 2px-or-more moves across the site: 37 → 33, the 6–11px heading shrinks gone.
  2. A class behind a variant (`first-letter:uppercase`, `md:text-lg`, `hover:font-medium`) is not the element's own type at rest: it is neither read nor swapped. The rule titles keep their capital.
  3. Reading-text leading never goes on a heading, a control's words or a figure.
- **The proof:** the crafting-ui branch rewritten from its last commit (39 files, 307 swaps, one refused): the craft page looks as it did (docs/media/crafting-ui-roles-craft-fixed.jpg beside -before.jpg). The two text-style test files pass, 3 of 3.
- **Left:** heading-size figures still share one 22px style; the large-headline tie goes to the smaller size.
- **The test** (e2e/type-roles.test.mjs, "a page title keeps its own headline step…"): a 33px h1, a 22px h2, a 16px h3 with 1.6 leading and a title with `first-letter:uppercase`, through the real server and browser. It passes now, and fails on the code before the fix (run in a separate copy): there the 33px title went to the 22px headline style and the variant class was in the swap.

## The whole suite after padding, controls and button labels (2026-11-12)
- **The run:** 181 runs, 16.8 min on vm-agent: 939 tests passed, 16 failed in 14 files.
- **Sorted:** six of the fourteen files pass when run by themselves on the same machine (21 tests, 0 failed): five fail only under the full run's load, and the sixth was the determinism test, fixed after the run started. The other eight are the ones already known: a finding the noise check does not expect, a new-token test that loses the page, the bar on Linux fonts, a Next performance wait, the flaky timeline check, a frozen-server test that fails beside others, and the two files another session is changing.
- **So:** nothing in the suite fails because of the padding, control-size or button-label work.

## A craft colour suggestion keeps to the job (2026-11-12)
- **The itch:** craft suggested the colour token nearest in value, whatever it was for. The clean-up already picks by job first.
- **How we found it:** on the messy page, a title faded to 25% draws as #c5c5c6. The nearest token by value is `line-strong`, a border colour, 6 away; the nearest text colour is far off.
- **The system behind it:** the craft side asked the theme for "the nearest colour" with no idea what each token is for. The source read earlier says the opposite: "Don't use a token just because the colors appear to match" (Atlassian).
- **What changed:** the theme now knows each colour token's job (text, surface, line, accent, status), read the way the clean-up reads it. A craft colour suggestion keeps to the tokens for the job the utility sets (`text-` → text colours) and only then compares values. When the theme's names say no jobs, value decides as before.
- **The proof:** same element, same run: before, `line-strong` (a border colour, for text); after, no text colour is close enough, so plumber gives advice with the colour it draws as. The four craft tests that cover faded text and grey levels pass.
- **Also:** the noise check accepted a new finding on the demo. It turned out the demo gives one extra finding on Linux (two text sizes centred, baselines 1.8px apart) and a different one on a Mac (rows held apart only by leftover space). Both are real on that page and depend on the machine's fonts; the check now allows either. That the same page reads differently by machine is in the backlog.

## A step suggestion takes the step named for the job (2026-11-12)
- **The itch:** when two of the theme's steps fit, craft took the one nearest the standard's number. Small capitals with no letter spacing, in a theme with `--tracking-wide: 0.05em` and `--tracking-caps: 0.08em`, were offered `tracking-wide`, because 0.05 is nearer the standard's 0.06.
- **Decided by Claude:** a step the project named for the job is its own decision for that job, and outranks a step that is merely nearer in value: the role, then the value, as the clean-up decides. The reason says "your step for this".
- **The proof:** the messy page now has those two steps and a capitals label with no spacing; its test checks craft offers `tracking-caps` with that reason, and passes. With only `wide` in the theme, `tracking-wide` is still offered. The craft, selection, new-token and spec tests pass.
- **What it does not do:** it goes by the words in the token's name; a theme that names steps another way is decided by value, as before.

## The bar on Linux, and a test that lost its page (2026-11-12)
- **The bar:** with its tools out at 1440 wide the close button fell off the bar on vm-agent, and not on the Mac: Linux's system font is wider. The resting panel is now never narrower than the bar's one line of content (the window is still the limit). A first try, letting the whole panel grow to its narrowest content, did nothing: a line of buttons that never wrap is wider than its narrowest form. The bar test passes on vm-agent and on the Mac.
- **The new-token test** sent its write through the page; the theme write reloads the page, and on a slower machine the reload cut the request off. It now sends the write from the test itself, as the text-roles test does. Passes on both machines.
- **Also passing on vm-agent now:** the noise check and the messy-page test (its first run on Linux).

## Shadows by job (2026-11-12)
- **The itch:** shadows were flagged as drift one value at a time and never tidied; nothing asked what casts the shadow.
- **Decided by Claude:** a shadow says how far a thing sits above the page, so it is decided by what casts it. Atlassian's elevation is named this way: raised for cards, overlay for "a UI that sits over another UI" ([reference](references.md)). A card takes the shadow the theme names for cards (rest, raised, card); a menu, a dialog or anything fixed takes the one for things that float. A control's shadow is its own state and is left. A card with no shadow is not given one: adding depth is a design change, not a tidy-up. Shadows went ahead of padding-by-job because, once padding is on the scale, sibling cards on the messy page already agree.
- **The fix and the proof (messy page, in the running panel, through the test):** a seventh step, "Shadows", lists "Cards sm → rest": the four stat cards cast the framework's `shadow-sm` while the theme names `shadow-rest` for a resting surface. Apply writes `shadow-rest`; the pressed tab keeps its own `shadow-sm`; Undo takes back only the shadows. The messy-page test passes with it, and the clean-up and icon tests pass.
- **Not done:** nothing that floats was on the page, so that half is untried; themes that name shadows by size get no answer.
- **Seen once:** the colour clean-up test failed in two seconds on one run and passed on the next: a flake at start-up.

## Big text no longer shrinks to fit small text; the dark page checked (2026-11-12)
- **The itch:** after the first fixes, the crafting-ui trial still shrank 6 places: five large numbers shared one 22px style (a 33px number lost 11px), and the "Craft" page title went 33 → 30px because its style's two places (30 and 33px) tied.
- **The system behind it:** a style's size was the size most of its places use, and a tie went to the smaller one, so a style with no shared size fell to its smallest place.
- **The fix:** large numbers get two steps, like headings (26px and up, 22–26px). When a style's places share no size, it takes the theme's own size nearest their middle, else the middle (the upper of two).
- **The proof:** no place on crafting-ui shrinks more than 2px now (31 moves of 2px or more, all ±2–5px); "Craft" keeps 33px. The cost: a 28px struck-out price grows to 33px, still well under the sale price beside it (docs/media/crafting-ui-roles-price-after.jpg), and a 30px lesson title to 33px. The text-style test files pass, 4 of 4.
- **The dark page:** with shadcn's page in dark mode, the colour pass proposes nothing for a hand-written dark colour, so it cannot write a wrong one; it does not tidy dark colours either (the palette holds light values). A near-white panel in light folds onto `muted` because plumber reads a small box in the page as inset; the two are within the pass's invisible-difference threshold.

## The new passes on a real app: quiet where they should be (2026-11-12)
- **The itch:** padding, control sizes, corners and shadows had only been proven on a page Claude wrote. A pass that is right on a messy page can still cry wolf on a good one.
- **How we checked:** ran the padding, control-size and corner readers on four of crafting-ui's running pages at 1440 wide (/interfaces, /motion, /primitives, /stickers).
- **What it showed:** 1,253 padding and row-gap classes read, 13 controls, no theme roles for corners: nothing proposed anywhere. One thing was wrong: on /primitives, a row showing three button sizes side by side (32, 36, 40px) was called uneven. Several heights that are each on the unit are a set of sizes shown on purpose; plumber now leaves such a row without a word.
- **Not checked:** shadows (crafting-ui's running server does not hand out that file yet); a real app with drift in it.
- **Also fixed, from the backlog's "now" list:** a read in a window with no size (a tab never shown) measured everything as zero and reported it without a word. It now refuses: "This window has no size, so nothing on the page can be measured."

## Words that run into other words (2026-11-12)
- **The itch:** the owner sent a screenshot of crafting-ui's hero with two labels printed over each other and asked: "can you see this overlap , how come plumber couldn't detect it ?"
- **How we found it:** reproduced it: the window about 800px wide, the pointer on the headline. "cap height" and "x-height" sat 9px apart; the readout ended 0.7px before the hint beside it, so the two read as one sentence.
- **The system behind it:** three reasons. Plumber had no check at all for text meeting text; every check looked at one element or at a parent and its children. The labels are invisible until the headline is hovered, and plumber reads the page as it rests. And it only happens in a narrow band of window widths.
- **What we tried, what we chose and why:** a check that compares the drawn letters (cap top to baseline) of every pair of visible texts. The first version shouted at the parts of one number ("0:00" and ".00") and at stacked toasts. So: texts on different painted surfaces are layers, not a collision; two pieces the layout placed in one parent are one thing; two pieces placed by hand (absolute) can collide. The ground is the law of proximity: things that touch are read as one.
- **The fix and the proof:** before, nothing was reported. After, with the page in that state: "This sits so close to “cap height” that their letters meet." and "This runs straight into “· Geist medium”, with no space between them." Quiet at rest on the home, motion and interfaces pages. A test holds both cases and four look-alikes that must stay quiet (e2e/craft-collision.test.mjs).
- **Also fixed:** the shadows pass, added earlier today, stopped the whole overlay loading on a dev server started before it existed. It now loads late and the overlay works without it.
- **Not done:** plumber still only sees the state and width the page is in when it is read (see backlog).
- **Media hooks:** the owner's screenshot beside the same hero with plumber's two findings drawn on it.
- References: [the owner's screenshot](references.md).

## Plumber reads the page at four widths and under the pointer (2026-11-12)
- **The itch:** after the words-meet-words check, plumber still could not find the owner's overlap by itself: it only saw the page at one width, at rest.
- **The system behind it:** the command-line read opened each page once, 1280px wide, and never moved the pointer over anything that was not a button.
- **What we chose and why:** after the main read, the page is opened at four widths (1280, 1024, 768, 390: desktop, small laptop, tablet upright, phone), side by side. At each width the pointer is put over up to six things that listen for it (a React pointer handler, or a Tailwind `group`), and the words-meet-words check is run in every state. A hover presses nothing, so it is safe everywhere. Only this one check is run in these states for now: it is the one that changes most with width and hover, and a full read per state would take minutes. A finding says when it is true: "Seen in a window 768px wide, with the pointer over it."
- **Dead end:** the first run reported three overlaps in crafting-ui's header on a phone. They were words kept for screen readers, cut to a 1px box. Words that are clipped out of sight are now skipped.
- **The fix and the proof:** `plumber craft` on crafting-ui's home page, with nobody touching it. Before: 19 findings, none about the hero. After: 21, the two new ones being the owner's two overlaps (MatHero.tsx:202 and Play.tsx:92), each marked with the width it was seen at.
- **Not done:** no test of its own yet; other width-sensitive checks (overflow, clipped text, tap targets) are not run in these states; the run takes about 90 seconds on this page, most of it the older gesture probes.
- References: [the owner's screenshot](references.md).

## Open gaps
Moved to [backlog.md](backlog.md) on 2026-11-12, at the owner's request: one list of what plumber does not do yet and the questions waiting for a decision. Add new gaps there, not here.

## Shipped · 2026-W46
- Plumber's text styles write into crafting-ui without shrinking headings or large numbers, keep classes that only apply to part of the text, and keep paragraph leading off headings ([entry](#big-text-no-longer-shrinks-to-fit-small-text-the-dark-page-checked-2026-11-12)).
- crafting-ui's vocabulary page loads about four times lighter (9,474 → 2,007 elements): each live example mounts only as it comes near the screen. [entry](#crafting-uis-vocabulary-page-live-examples-mount-only-near-the-screen-2026-11-12)
- plumber finds a side column that is set to stick but can't, and fixes it with one class: on crafting-ui's skill pages the column now stays beside the text where it used to scroll away. [entry](#the-sticky-check-on-a-real-app-crafting-uis-skill-pages-2026-11-12)
- `plumber craft` reads each page at four window widths and with the pointer over things, so an overlap that only shows on a tablet or on hover is found without anyone setting the page up ([entry](#plumber-reads-the-page-at-four-widths-and-under-the-pointer-2026-11-12)).
- plumber says when words run into other words: two labels whose letters meet, or a readout that ends where the next text begins ([entry](#words-that-run-into-other-words-2026-11-12)).
- In a rename plan, the raised background gets the surface name and recessed fills get sunken, judged against the page colour ([entry](#which-colour-gets-the-surface-name-2026-11-12)).
- Plumber tells text colours from fill colours by how the code uses them, so shadcn's `-foreground` colours read as the words they are ([entry](#text-and-fill-colours-read-from-the-code-2026-11-12)).
- The server answers a write about a third sooner (228 ms → 149 ms on a copy of crafting-ui): it no longer works out and sends the same dependency lists twice. [entry](#the-small-trim-a-writes-bookkeeping-done-once-2026-11-12)
- A fix taken on the page now works on links, buttons and anything else drawn through a component: it is written where that element is used. [entry](#a-fix-on-a-link-now-reaches-the-line-where-the-link-is-used-2026-11-12)
- plumber's full read of a page is about four times faster (7.9 s → about 2 s on a 1,400-element page): it asks where every finding lives in one go instead of 363 separate questions, waits for the theme before judging, and looks for a page's pictures once. [entry](#plumbers-read-8-seconds-5-of-them-asking-one-question-at-a-time-2026-11-12)
- plumber flags words over a picture that can only be read while the picture shows, before it ever fails to load, and offers the one class that holds them (a plain check, not a craft rule). [entry](#third-defensive-tip-words-that-need-their-picture-2026-11-12)
- Plumber reads a hover or press colour from where the code uses it, so shadcn's grey `accent` is no longer taken for the brand ([entry](#hover-colours-read-from-the-code-not-the-name-2026-11-12)).
- A brand colour too close to the error red or warning amber now gets a plain warning and what to do about it ([entry](#a-brand-too-close-to-error-2026-11-12)).
