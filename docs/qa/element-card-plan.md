# QA plan: the element card, the text card, layout and spacing, effects, tidy

Owner (2026-11-03): "much more thorough testing before we move to fix". No fixes in this pass: find, reproduce,
record. Results go to `docs/qa/element-card-results.md`.

## Under test (all committed on main, pushed)
- Alt+click reads one element (`1a10557`); words → the text card (overlay/src/texteditor.js) with the spring drag and
  the hierarchy marks; any other element → the element card (overlay/src/elementcard.js, `d1158fb`): Shadow ›,
  Motion › on the recipe engine (src/recipes, `3ade9d8`); Layout › and the spacing grammar (overlay/src/
  layoutcard.js, `9ff1113`); Tidy this card (overlay/src/tidycard.js, `6a60a0d`).
- Designs and decisions: docs/design/text-editor.md, docs/design/prototypes/*.html, docs/briefs/element-card-overlay.md,
  docs/research/hierarchy.md, docs/briefs/recipe-engine.md.

## Already found (quick pass, 2026-11-03) — confirm, then look for more of the same kind
1. Writes target the shared component's line (crafting-ui `router.tsx:43` Link: "41 like it") instead of the usage
   that passes the classes in (Tidy does it right; spacing/layout/shadow writes may not).
2. Tailwind v4 `--spacing` multiplier not understood: the spacing scale is [0]; 16px reads off-scale.
3. Surfaces: the card and a held cause at once; the fix panel's empty white body ("11 problems · 9 fixes"); the card
   covering the fix panel line; the spacing bubble lingering; the shadow strip see-through over the page, above the
   element, only "shadow-1" visible.
4. Reaching: Alt+click needs a prior Alt keydown (Alt held before focus → nothing); containers filled by children
   can't be reached; Alt+scroll walks the page, not the tree, in Blueprint; no step up to the parent from a card.
5. Polish: weight "6… Semibold" truncated; the drift glow hides "Saar Oz"; drill copy says "beside" when the strip is
   above.

## The matrix
Pages (crafting-ui, http://localhost:5180): `/`, `/motion`, one lesson page (follow a lesson link), `/icons`, the
"How it's made" page, any page with forms or images. Element kinds on each: words (p/h/span/li text), a container
row/card with padding, a grid/list, an image, an SVG/icon, a button, an input, an element from a shared component
(Link, Button…), an element whose className is built in code (cn/template/prop), an element inside something closed
(menu/dialog/details), an element under the fix bar, a very large element (whole section).

For each kind, every feature that applies, every state: rest, hover, focus (keyboard), open, dragging, writing,
written (said line + Undo), undone (file exact), reload (resume), refused (plain reason), error, empty.
- Text card: every field (style menu, size, leading, tracking, weight, case, colour menu), drag (detent, rubber band,
  Esc mid-drag), ← → / typing / Enter / Esc, the scale + hierarchy marks and the sentence, writes + undo, refusal on
  dynamic className, "the same code draws N other places".
- Element card at rest: header, reach line, fields shown for the kind, Tidy shown when it should be, keys ↑ ↓ Enter
  Esc, placement beside/below/above, following scroll and resize, caret and ring.
- Shadow ›: strip (yours first, packs, verdict tags), pointing previews and restores exactly, pick, light pad (sun,
  halo, keys), choice controls (use yours / add anyway; add one / change everywhere), Writes = engine preview,
  Write it + Undo, refusal.
- Motion ›: tabs, strip loops with cursor, curve handles + overshoot, timeline, travel ghost, R replay, requires
  motion/react marking, entrance-only note, Writes, Write it + Undo.
- Layout ›: Flex | Grid, direction/wrap, track chips cycle + / −, column-line drag, subgrid switch, strip, Writes,
  Write it + Undo, refusal when the className is built in code.
- Spacing grammar: padding/margin/gap bands where pointed, edit-through to a child, wheel notch = one step,
  trackpad deltas accumulate (dispatch small deltaY), drag a step per 10px, ⇧ pair, ⌘ all (bands relight), bubble
  (value, step name, coral off-scale, scale window, hierarchy marks, rule), writes on idle/Enter, Esc puts back,
  page doesn't scroll under a band.
- Tidy: shown for the right elements, list in plain words (no rule ids), preview all, Space = as it was, Write it one
  batch, one Undo, "Nothing to tidy".
- Cross-cutting: one surface at a time (card / fix panel / bubble / strip never fight or overlap), narrow viewport
  (≤ 900px wide), dark ground (find or force a dark section), prefers-reduced-motion, keyboard only, accessible
  names/roles, console errors and page errors, performance (strip copies of a large element: time to open, frame
  drops while dragging), resume after a write's reload, Alt+B / Esc transitions.

## Safety rules (hard)
- crafting-ui has uncommitted changes of its own: NEVER git checkout/restore/stash there. Before the first write,
  `tar -cf <scratchpad>/crafting-src-qa.tar src` in /Users/vijaysingh/unlocalhosted/crafting-ui; after every write
  use the overlay's Undo; at the end `diff -r` src against the tar and restore any differing file from the tar only.
  Report the final diff (must be empty).
- Writes into shared components on crafting-ui: do not write them (record the finding from the preview/"Writes"
  text). Prefer plumb's fixtures for write paths that need a known shape.
- crafting-ui's dev server is running on 5180 (started via ~/.claude/bin/dev-server); don't start another; if it must
  be restarted use `~/.claude/bin/dev-server /Users/vijaysingh/unlocalhosted/crafting-ui npx vite --port 5180
  --strictPort`.
- The machine swaps: one browser at a time; headless shell
  `$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`.
- Alt+click in scripts: send a keydown of Alt first, then the click with altKey (that is how a person's keyboard
  arrives); also record what happens without the keydown (finding 1 of group 4).

## Results format (`docs/qa/element-card-results.md`)
One entry per finding: id, page + element (selector and source line), steps, expected, actual, evidence
(screenshot path under docs/qa/shots/, or raw values), severity (blocker / major / minor / polish), cause group
(1–5 above, or new). Then a coverage table: matrix cell → passed / failed / not reachable, so gaps are visible.
