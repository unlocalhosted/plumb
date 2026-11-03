# Icon pass, layer 1, on crafting-ui (read-only)

Reader: `overlay/src/icons.js` (`readIcons`, `familyOf`, `proposeIcons` at keep), run in the page on
`http://localhost:5180` (crafting-ui is served by an older Plumber, so the module was loaded into the page as a blob with its
imports pointed at the served `/__plumb/src/*`). The family is read from the union of the five routes' rows, as the census would
give it (a real `plumber census` writes into the project's cache, so it was not run on crafting-ui). Nothing in crafting-ui was
edited. Script: the session scratchpad `run-crafting.mjs`; raw result `crafting.json` beside it.

## Its family, read out

| Question | Read | Spec §5 said |
| --- | --- | --- |
| Family | `app:Icon` (the renderer, `src/language/Icon.tsx`), 16 of 18 icons across the five routes = 89%; the other 2 are inline svgs | `Icon`, 81 instances |
| Grid | 20 (viewBox 0 0 20 20) | 20 |
| Stroke | 1.5px on screen (scale 1), 16 of 16 | 1.5 |
| Caps, joins | square, miter | square, miter (§8 correction confirmed) |
| Size per text size | 20px (`size-5`) beside 11px labels, 16 of 16 | `size-5` default |
| Gap | 8px at 20px, 16 of 16 (the class is the row's gap) | `gap-2`-class rows |
| Alignment | icon middle 0.15px from the label's cap middle on all four | not stated |
| Style | **duotone**: line plus a 10% tint fill on a shape (`fill-draw-soft`, `src/site/marks.tsx:16`, `:22`) | "line" implied |
| Marks known | 4, seen in use: `section-interfaces`, `-motion`, `-assets`, `-making` | marks are data in `src/site/marks.tsx` |
| Installed icon sets | none (no icon package in `package.json`) | none |

## What keep proposes, per route

| Route | Icons read | Moves | Listed | Refused (by reason) |
| --- | --- | --- | --- | --- |
| `/` | 6: 4 `Icon` (header), 2 inline svgs in the hero buttons | 0 | 0 | 5 illustrations (> 48px); 2 I3 refusals on the hero pair (below) |
| `/motion/standards` | 4 (header) | 0 | 0 | 10 illustrations (> 48px), 28 markers under 12px (Timeline glyphs) |
| `/icons` | 4 (header) | 0 | 0 | 72 over 48px, 196 over 12 shapes, 663 drawn in their own colours (frosted icons, the gallery's subject), 1 marker |
| `/stickers` | 4 (header) | 0 | 0 | 75 over 48px (sticker art) |
| `/sloppy/issues` | 0 | 0 | 0 | none: the page draws no svg and has no emoji |

Measure on every route: 1 size, 1 stroke, 1 style, 0 emoji, before and after. The only multiple on `/` is 2 sizes, 2 strokes, 2 styles,
counting the two hero icons (34px, 3.38px, line).

Result: **nothing to do on any of the five routes**, which is the spec's Case A answer, and the page proves it: `kept.onSystem` is 4 on four routes.

## Comparison with §5, every disagreement explained

1. **Style is duotone, not line.** Sixteen of sixteen. The marks put a `fill-draw-soft` tint under a line. The reader treats a fill as duotone
   only when its box is over a tenth of the grid (so a 3x1.5 arrowhead filled with currentColor stays "line"); the tint rects are 15x9 and 9x5 on 20x20. §1.1
   says never mix line and solid in a row: here every icon is duotone, so the row is consistent.
2. **The hero pair.** §5 reads the stroke as 1.6 in user units ("0.1 off, below 0.25"). The icons are `size-[0.8em]` in 42px text, so on screen
   they are 33.8px with a 3.38px stroke (1.6 x 2.11). I3 (>= 32px, stroke > 2) would fire. It does not move them: the reader refuses with
   "sized to its 42px text, so its stroke follows the text's stem (§1.3 rule 2)". Same outcome as §5 (nothing to do), different reason. This is a narrowing
   of I3 that the spec does not state; §1.3 rule 2 says it, I3's row does not. Needs the owner's yes.
3. **Instance count.** §5 counts 81 `Icon`. Each of these routes shows 4, the same header nav. The 81 are across the site (and the 20x20 x67, 14x14 x38, 30x30 x36
   figures from the probe include routes not read here). Not a disagreement about the family, only about scope.
4. **The emoji on `/`.** None found on any of the five routes (a text-node scan for `\p{Extended_Pictographic}` returns nothing on all five). The spec's emoji is gone or
   on another route; there is nothing to list.
5. **Sizes 14, 30 and 10.** The 10px ones are the Timeline transport glyphs (play, pause, step, replay), now refused as "a marker, not a sized icon" (under 12px, the
   same floor `craft/media-size` uses). 14 and 30 do not occur on these routes.
6. **Frosted icons "excluded as content".** Matches in effect (859 refused), but the reason the reader gives for 663 of them is "carries its own colours (a logo or art)",
   category `logo`: right outcome, imprecise label. They are the gallery's subject, not logos.
7. **Round caps** in `pass-icons.md`: confirmed wrong; square and miter are read from the computed style.

## Findings from running it that changed the module

- Pooling icons of different origins in one text-size band made the 10px glyphs the "mode" and proposed shrinking the nav icons to `size-2.5`. Peers are now
  taken within one origin, and markers under 12px are left out.
- The transport glyphs (`PlayGlyph`, `StepGlyph`...) each counted as an origin of their own and dropped `Icon` to 34% ("mixed"). With the 12px floor the family is `app:Icon` at 89%.
- A label on another line (the timeline's "0:00 Line in..." readout) gave an icon a cap-middle offset of -35px. A label now counts for gap and offset only when it is on the icon's line.

## Limits seen

- "Marks known" is what is drawn on the page. An emoji whose mark exists in `src/site/marks.tsx` but is not on the routes read would be listed "no mark yet". The census across
  every route narrows it; reading the renderer's own mark list is a later layer.
- The write for a swap into a renderer family is `{ component: 'Icon', prop: { name } }`; the mark's own import (`MARKS.x`) is not resolved.
