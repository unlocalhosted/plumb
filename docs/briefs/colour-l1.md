# Brief: colour pass, layer 1 (read and propose, at scope keep)

The design is docs/briefs/pass-colour.md: read all of it first. This brief is its "Build first" cut **minus the show
and the write**, which the owner's other session builds on top of your module (overlay/src/colour-pass.js, cleanup.js:
don't create or touch those). Model the code on the spacing pass's reader, which is the same shape one family over:
overlay/src/stacks.js (readStacks, proposeSpacing), src/census.ts gaps, src/session/engine.ts `rhythm()` (line ~1702),
the `rhythm` method in src/session/methods.ts and server.ts.

## What to build

1. **`overlay/src/colours.js`** (new, plain ES module like stacks.js; reuse craft-headless.js `toRgb`/oklab, and
   craft-rules.js `colourClass` where it fits; export what you need from them rather than copying):
   - `readColours(root = document.body)` → every in-system place's colours: for each stamped element (`[data-plumb-source]`,
     not inside `plumb-overlay`, not inside `svg`/`canvas`/`img`/`video`, not under `config.system.exclude` if the
     overlay knows it): `color` (only on elements that draw text directly), `background-color`, border colour (only
     where a border is drawn), each with the class at the usage that sets it (or null), its value composited over the
     element's painted ground, as oklab.
   - `paletteOf()` → the theme's colour tokens from the page (`--color-*` on `:root`/`html`, as computed), each with its
     role inferred by name first, value second (pass-colour.md "Theme"), its utility name (`bg-surface`, `text-muted`,
     `border-line`), and its oklab.
   - `proposeColours(places, palette, { scope: 'keep' })` → `{ moves, kept, refused, content, measure }`:
     - `moves: [{ el, prop: 'text'|'bg'|'border', from: { cls, css }, to: { token, cls, css }, de, rule }]`: an
       arbitrary or default-palette class whose composited colour is within ΔE_ok 0.03 of a token of the right role
       family for its property (pass-colour.md step 3–5, keep only); a fourth grey level (craft/grey-levels' logic);
       text faded by opacity → the matching grey token (craft/text-opacity); pure black/white → the off-black/off-white
       token. `rule` names which.
     - `kept`: places already on a token (count is enough, plus a few examples), and hues no token is near ("no colour
       of yours is near it", with the nearest token and its ΔE).
     - `refused: [{ el, prop, why }]`: colour from a stylesheet, inline style, a `var()` the app computes, a gradient.
     - `content`: how many places were skipped as content.
     - `measure: { text: [before, after], bg: [...], border: [...] }`: distinct composited colours (rounded to ΔE 0.01)
       among the pass's own population, before and after the moves.
   - Every move goes through the contrast guard (pass-colour.md step 7; craft/contrast's APCA in craft-rules.js): a move
     that lowers contrast below the rule's threshold is refused with the reason.
2. **Site palette from the census**: `src/census.ts` reads the same places' colours on every route (as it reads gaps),
   cached the same way; the engine gets `palette()` → `{ colours: [{ prop, oklab, cls, route }], routes }`, served as
   the `palette` method (methods.ts, server.ts, session index) like `rhythm`. The overlay will use it for the site's
   before → after ("19 → 11 on the site").
3. **Add `src/colours.js` to `overlayModules`** in src/hosts/client.ts.

## Proof

- **Real app first** (the owner's rule): run your reader on crafting-ui (`~/unlocalhosted/crafting-ui`, read-only; its
  dev server may already run on 5180, check `~/.claude/bin/dev-server --list`; never start a second one; if none
  runs, start it with `~/.claude/bin/dev-server ~/unlocalhosted/crafting-ui npm run dev` and stop it when done) in
  headless Chrome on `/motion/standards`, `/`, `/stickers`, `/icons`, and write what it proposes to
  `docs/qa/colour-l1-crafting-ui.md`: per route, moves (from → to, ΔE, rule), kept, refused with reasons, content
  count, measure. Compare to pass-colour.md's numbers (19 text colours on the site; `/motion/standards` 7, all tokens;
  the `bg-[#ffffff]`/`text-[#55555C]` tail; the second blue `#2F64F0` kept at keep; sticker palettes as content). Every
  disagreement explained or fixed.
- **E2E tests**, `e2e/colour-read.test.mjs`, from pass-colour.md's table, the keep rows only: arbitrary white folds;
  a fourth grey folds (APCA not lower); the second blue is kept; content left alone; a gradient on a surface is
  refused, not moved; nothing to do on a page already on tokens. Through the real CLI (`plumber census`), Vite,
  Tailwind and Chromium, like e2e/cleanup-spacing-proofs.test.mjs. Since there's no panel for colour yet, call the
  module in the page (`page.evaluate(() => import('/__plumb/overlay/src/colours.js'))` or however the overlay's modules
  are served: find it in src/hosts) and assert on its answer, and assert `palette` over HTTP for the site part.

## Rules (the owner's, binding)

- End-to-end/integration tests only; no unit tests. Run one Chromium suite at a time; `top -l 1 -o mem -n 5` first.
- Don't touch cleanup.js, show.js, spacing-pass.js, fixpanel.js; don't create colour-pass.js.
- Build with `npm run build` in this worktree before e2e runs. Don't commit.
- Report in `docs/briefs/colour-l1.result.md`: what was built (files), the crafting-ui table's summary, each test with
  its command and raw tail, open questions. Claims with proof: every number from a command you quote.
