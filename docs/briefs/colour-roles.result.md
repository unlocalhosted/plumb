# Colour roles: result

Branch colour-roles (worktree plumb-roles). Not committed. Files changed: `overlay/src/colours.js`, `e2e/colour-read.test.mjs`. `cleanup.js`, `show.js`, `colour-pass.js` untouched: the exported shapes held.

## What changed
- Palette tokens carry a `kind` (the spec role: ground, surface, sunken, hover, pressed, fg, muted, faint, on-accent, line, line-strong, accent, accent-hover, accent-soft, ink2, ink2-hover, ink2-soft, success, warning, danger, info) beside the old coarse `role`. A second hued family the theme names (crafting-ui's `draw`) is `ink2`.
- `readRoles(places)` (new export) reads each place into its role by usage: property, element (control, field, link, heading, status hint), painted area. `readColours` now records `ctx`, `area`, `top` on each place, the gradient's stops, and `places.docArea`.
- `proposeColours` resolves among tokens of the colour's own role (role wins over distance), at `scope` `keep` (default) or `refine`. Every move has `rule` (the §5 row id), `law`, `role` (the kind of the token it moves to). Kept hues and refused entries carry `role`, `rule`, `law`.
- Rule ids changed from the old names: `arbitrary-fold` is now `near-copy`, `grey-levels` is `extra-grey`, `text-opacity` is `faded-text`. Nothing else read them; the two e2e assertions that did were updated.
- Reach: keep fold 0.03, grey 0.12, status 0.03. Refine fold 0.05, grey 0.18, status 0.12, stray hue 40 degrees.

## §5 row to code (overlay/src/colours.js, function `proposeColours` unless noted)
| Row id | Where |
| --- | --- |
| near-copy | the `nearest(e, use.kinds)` fold after the `status` branch; `REACH.*.fold` |
| extra-grey | the two `prop === 'text' && use.role === 'text'` grey branches (theme's own levels, and page-statistic levels); `REACH.*.grey` |
| faded-text | the `e.drop` branch before the on-token check; `FADED` |
| pure-black-white | the `pure` block |
| stray-hue | refine: hue-gap block (accent/ink2 within 40 degrees) and the neutral-fallback for meaningless fills/lines |
| tinted-surface | keep: `e.why` branch lists it (`rule: 'tinted-surface'`); refine: stops within 0.10 of one surface-role token or accent tint |
| second-accent | keep: listed (`rowFor`); refine: control fill becomes `accent` by role (the second ink only if the app already uses it on buttons) |
| no-meaning-text | keep: listed; refine: fg for headings, else muted |
| status-hue | `use.role === 'status'` branch: only the same-band status token, never the accent; status needs a hue band (§4.2) AND a usage hint (`ctxOf`) |
| line-too-faint | the `prop === 'border'` WCAG 3:1 block: keep reports (refused entry), refine moves to line-strong |
| scheme | by construction: `paletteOf` probes tokens in the page's current scheme, so a dark page resolves against dark tokens only |
Role reader: `kindOf`, `assignInks` (palette; §2, §4.1, §4.2, §9.2), `readRoles` (places; §4.3), `ctxOf`/`areaOf` (evidence). Guard (§5 Guard) unchanged.

## Tests
`PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node --test e2e/colour-read.test.mjs` (after `npm run build`):
```
  ✔ 8 role wins over distance: the page ground is bg, not sunken; the purple button and gradient card are kept and listed (921ms)
ℹ tests 9
ℹ pass 9
ℹ fail 0
```
`node --test e2e/cleanup-colour.test.mjs`:
```
ℹ tests 2
ℹ pass 2
ℹ fail 0
```
New test 8 is the §6.2 page: #666666 text goes to `text-muted`; a #f5f5f5 page ground goes to `bg-bg` (role ground); the #7c3aed button is kept and listed (role accent, rule second-accent); the gradient card is listed (`a gradient`, rule tinted-surface). At refine the button becomes `bg-accent`.

## Proof it fails on old code
Scratch copy of the worktree (outside the repo) with `git show main:overlay/src/colours.js`, rebuilt, same test file:
```
✖ 8 role wins over distance ...
  AssertionError: the page ground is bg, not the sunken surface it matches exactly
  + actual 'bg-sunken'   - expected 'bg-bg'
```
(Tests 1 and 2 also fail there on the renamed rule ids, as expected; 3 to 7 pass.) Scratch copy deleted.

## Not implemented, or judgment calls
- §4.4 "derived system" report (clusters of greys and the accent for an app with no tokens): not built. With no tokens nothing folds and everything is listed in `kept.hues` with its role; the derived-system summary and "make these tokens" action are not there.
- Hover/pressed roles are never assigned by usage (no usage evidence in the spec), so a colour is never folded to them.
- The ground is the largest neutral opaque background straight on the page covering at least half the document. A page whose ground is only on `body`/`html` has no place for it (the reader only sees elements with a source stamp).
- Refine's tinted-surface move has `from.cls` null (gradient classes are not a single colour class), so `colour-pass.js` skips it. Refine is not called by the panel today; the `refine` rows are covered by the e2e for second-accent only. Stray-hue, no-meaning-text, line-too-faint at refine and tinted-surface at refine are implemented but not exercised by a test.
- Dark-mode proof: only the by-construction argument, no dark-scheme test.
- Panel wording ("APCA", "WCAG 3:1", "our visibility threshold", "convention") is only in code comments and the `why` of the line-too-faint report; the panel copy lives outside this change.
