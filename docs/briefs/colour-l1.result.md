# Result: colour pass, layer 1 (read and propose, at scope keep)

Not committed. Worktree `plumb-colour`, branch `colour-pass`.

## Built

| File | What |
| --- | --- |
| `overlay/src/colours.js` (new) | `readColours()`, `paletteOf()`, `loadPalette()`, `proposeColours()`, `colourRows()`, `roleOf()` |
| `overlay/src/craft-headless.js`, `overlay/src/craft-rules.js` | `export` added to `oklab`, `colourClass`, `apca` (three words, no logic change) |
| `src/census.ts` | reads the same places on every route (`colours` in census.json, stale-filtered by stamp hash like gaps) |
| `src/session/engine.ts`, `methods.ts`, `server.ts`, `index.ts` | the `palette` method: `{ colours: [{ prop, oklab, cls, route, data? }], routes }` |
| `src/hosts/client.ts` | `src/colours.js` in `overlayModules`; also `src/colour-pass.js`, because `npm run build` fails without it (cleanup.js imports it, `scripts/third-party-notices.mjs` refuses an unlisted module) |
| `e2e/colour-read.test.mjs` | 7 tests |
| `docs/qa/colour-l1-crafting-ui.md` | the real-app proof |

Shapes, as colour-pass.js reads them: `readColours()` → `[{ el, colours: { text?, bg?, border? } }]` with `cls`, `css`, `oklab` on each (plus `rgb`, `under`, `why`, `data`, `drop`/`set`); the array also carries `.content`. `proposeColours()` → `{ moves, kept, refused, content, measure }`; a move is `{ el, prop, from: { cls, css }, to: { token, cls, css }, de, rule }`, `to.css` is the token's computed colour (not `var(--color-…)`: with `@theme inline` that variable does not exist on the page). `kept` is `{ count, onToken, inherited, examples, hues }`.

Decisions worth knowing:
- Tokens come from the server's decisions (`loadPalette()`), then the page's `--color-*` variables and `.bg-x` rules. crafting-ui's `@theme inline` leaves no per-token variable on the page (probed: `--color-surface` is empty), so `paletteOf()` alone misses unused tokens. colours.js starts `loadPalette()` on import; colour-pass.js calls `paletteOf()` after `await request('palette')`, so the decisions are normally in by then. Safer: have colour-pass call `await loadPalette()`.
- Rules: `arbitrary-fold` (ΔE ≤ 0.03), `grey-levels` (neutral text within 0.04 of a text token, or a minority level, reach 0.12), `text-opacity`, `pure-black-white`.
- A translucent colour only folds into a translucent token (and the reverse), a grey never into a tint: `bg-bg/95` on a sticky header is not made opaque.
- Contrast guard: APCA with craft/contrast's floors (60/50/45 by size and weight); refused when the result is below the floor and lower than before. For a background move, the words on it are checked too. Text on a gradient or image is refused for every rule but the exact fold.
- `text-opacity` moves have `from.cls = null` and carry `set` (the colour class) and `drop` (the `opacity-*` class): swapping only the colour class would leave the fade on. colour-pass.js skips them (`!m.from?.cls`).
- Colour set by an inline style or a `var()` the app computes is refused and marked `data: true`; it is left out of `measure` and out of the site's palette count.

## crafting-ui (docs/qa/colour-l1-crafting-ui.md)

- `/motion/standards`: 0 moves; text 6 → 6, bg 7 → 7, border 5 → 5; 637 places kept; 89 refused; 28 content.
- `/`: 0 moves; text 3 → 3, bg 10 → 10, border 6 → 6; `/stickers`: 0 moves (72 text and 64 bg places refused as inline style); `/icons`: 0 moves (133 gradients refused).
- 7 more routes: 3 moves in all (`text-fg/75` → `text-muted`, grey-levels, ΔE 0.1); text 8 → 7 on those pages.
- Union over the four routes: text 9, bg 13, border 12; over the eleven read: text 13, bg 19, border 15.
- The arbitrary tail (`bg-[#ffffff]` ×18 …) was not found drawn on any of the eleven routes; the doc explains each disagreement with pass-colour.md.

## Tests

Command: `PLUMBER_CHROMIUM=<playwright chromium 1243 headless shell> node --test e2e/colour-read.test.mjs` (this machine's playwright wants build 1248, which is not installed).

```
  ✔ 1 an arbitrary white folds into the surface token, and what is shown does not change
  ✔ 2 a fourth grey folds into the nearest of the three, and its contrast stays above the floor
  ✔ 3 the second blue is kept, and the page says no colour of yours is near it
  ✔ 4 content is left alone: a drawing and inline-styled swatches are not proposed or measured
  ✔ 5 a gradient on a surface is refused, not moved
  ✔ 6 a page already on tokens has nothing to do
  ✔ 7 the site palette is served over HTTP from the census, every route, with the class at each place
ℹ tests 8 / pass 8 / fail 0   duration_ms 9858
```
`e2e/census.test.mjs` (census.ts changed): pass 2, fail 0.

## Open questions

1. `text-fg/75` → `text-muted` at ΔE 0.1 is a visible change, allowed by the grey-levels reach (0.12). Keep that reach at scope keep, or limit grey-levels to 0.04?
2. Test 2 asserts contrast is above the small-text floor, not "not lower": `#55555C` is darker than muted (62% black), so any fold to muted lowers APCA (about 76 to 64) while staying above 60. The brief's "APCA not lower" cannot hold for that pair.
3. Test 1 uses `#F0F0F0`, not `#F4F4F6`: `#F4F4F6` is within ΔE 0.01 of `--bg-sunken`, so the measure already counts it as the same colour and folding it changes no count. The fixture theme also drops `surface-hover/pressed`, which were nearer to the grey.
4. `text-opacity` writes need the writer to drop the opacity class as well (`set`/`drop` on the move).
5. The negative checks (each test failing against the old behaviour) were not run; only the passing runs are above.
