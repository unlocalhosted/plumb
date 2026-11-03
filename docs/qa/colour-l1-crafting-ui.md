# Colour pass, layer 1: what the reader proposes on crafting-ui

Command: `node .colour-probe.mjs <routes>` (a Playwright script, not kept) loads each route of the running crafting-ui dev server (`http://localhost:5180`, read-only), serves this worktree's `overlay/src/colours.js` (+ `craft-rules.js`, `craft-headless.js`) over the page's own copies, awaits `loadPalette()`, then runs `readColours()` and `proposeColours(places, palette, { scope: 'keep' })`. Raw output is the JSON this file is cut from. Nothing was written to crafting-ui.

## The four routes of the brief

### `/motion/standards`

- places read: 655 in 22 ms; content skipped: 28
- measure (distinct composited colours, before → after): text 6 → 6, backgrounds 7 → 7, borders 5 → 5
- moves: none
- kept: 503 places already on a token, 134 follow the page's base colour or the text colour; most used: `text-muted` ×128, `border-line` ×110, `bg-fg` ×61, `text-faint` ×51, `border-line-strong` ×46
- kept, no colour of yours near it:
  - text `text-draw/75` (#4568fe) ×10, nearest `draw` at ΔE 0.101
  - border `border-fg/45` (#8d8d8d) ×4, nearest `line-strong` at ΔE 0.096
- refused: 89 (text set by a stylesheet, not a class here ×69; bg a background image ×20)

### `/`

- places read: 101 in 9 ms; content skipped: 44
- measure (distinct composited colours, before → after): text 3 → 3, backgrounds 10 → 10, borders 6 → 6
- moves: none
- kept: 76 places already on a token, 13 follow the page's base colour or the text colour; most used: `text-faint` ×18, `text-fg` ×10, `bg-bg` ×8, `bg-surface` ×8, `bg-fg` ×6
- kept, no colour of yours near it:
  - border `border-fg/70` (#515151) ×1, nearest `line-strong` at ΔE 0.312
  - bg `bg-fg/15` (#dadada) ×1, nearest `surface-pressed` at ΔE 0.068
  - border `border-fg/50` (#717171) ×1, nearest `line-strong` at ΔE 0.119
  - bg `bg-fg/80` (#393939) ×1, nearest `surface-pressed` at ΔE 0.609
- refused: 18 (bg it follows the text colour (currentColor) ×10; bg a background image ×5; text set by a stylesheet, not a class here ×2; bg set by a stylesheet, not a class here ×1)

### `/stickers`

- places read: 197 in 38 ms; content skipped: 0
- measure (distinct composited colours, before → after): text 4 → 4, backgrounds 2 → 2, borders 3 → 3
- moves: none
- kept: 52 places already on a token, 11 follow the page's base colour or the text colour; most used: `text-muted` ×23, `text-faint` ×15, `text-fg` ×6, `border-line-strong` ×4, `border-fg` ×2
- kept, no colour of yours near it:
  - bg `bg-bg/95` (#fbfbfb) ×1, nearest `bg` at ΔE 0
- refused: 193 (text set by an inline style ×72; bg set by an inline style ×64; border the class does not set this colour here (a stylesheet rule wins, or the class is not in your stylesheet) ×56; text set by a stylesheet, not a class here ×1)

### `/icons`

- places read: 483 in 139 ms; content skipped: 0
- measure (distinct composited colours, before → after): text 7 → 7, backgrounds 4 → 4, borders 6 → 6
- moves: none
- kept: 307 places already on a token, 5 follow the page's base colour or the text colour; most used: `text-faint` ×191, `border-draw-line` ×60, `text-fg` ×12, `border-line-strong` ×10, `border-line` ×10
- kept, no colour of yours near it:
  - text `text-fg/70` (#494a4b) ×17, nearest `muted` at ΔE 0.049
- refused: 192 (bg a gradient ×133; border set by a stylesheet, not a class here ×23; bg set by an inline style ×22; bg a background image ×10; border set by an inline style ×4)

Union over the four routes (distinct composited colours, ΔE 0.01, inline-style and variable colours left out): text 9, backgrounds 13, borders 12. After the moves: no change (0 moves on these four routes).

## Seven more routes, to find the arbitrary tail

### `/motion/entries/offset-and-delay`

- places read: 210 in 13 ms; content skipped: 15
- measure (distinct composited colours, before → after): text 8 → 7, backgrounds 7 → 7, borders 6 → 6
- moves:
  - text: `text-fg/75` (oklab(0.13 0 0 / 0.75)) → `text-muted`, ΔE 0.1, rule grey-levels, ×1
- kept: 196 places already on a token, 39 follow the page's base colour or the text colour; most used: `text-faint` ×44, `text-muted` ×32, `border-line` ×30, `border-line-strong` ×20, `text-fg` ×19
- kept, no colour of yours near it:
  - text `text-draw/75` (#4568fe) ×4, nearest `draw` at ΔE 0.101
  - border `border-fg/45` (#8d8d8d) ×1, nearest `line-strong` at ΔE 0.096
- refused: 6 (bg a background image ×6)

### `/motion/entries/the-pop`

- places read: 249 in 18 ms; content skipped: 16
- measure (distinct composited colours, before → after): text 8 → 7, backgrounds 8 → 8, borders 7 → 7
- moves:
  - text: `text-fg/75` (oklab(0.13 0 0 / 0.75)) → `text-muted`, ΔE 0.1, rule grey-levels, ×1
- kept: 238 places already on a token, 46 follow the page's base colour or the text colour; most used: `text-faint` ×49, `border-line` ×36, `text-muted` ×36, `border-line-strong` ×22, `text-draw` ×22
- kept, no colour of yours near it:
  - text `text-draw/75` (#4568fe) ×9, nearest `draw` at ΔE 0.101
  - border `border-fg/45` (#8d8d8d) ×1, nearest `line-strong` at ΔE 0.096
- refused: 6 (bg a background image ×6)

### `/motion/entries/the-settle`

- places read: 258 in 16 ms; content skipped: 15
- measure (distinct composited colours, before → after): text 7 → 6, backgrounds 7 → 7, borders 7 → 7
- moves:
  - text: `text-fg/75` (oklab(0.13 0 0 / 0.75)) → `text-muted`, ΔE 0.1, rule grey-levels, ×1
- kept: 243 places already on a token, 46 follow the page's base colour or the text colour; most used: `text-faint` ×54, `text-muted` ×42, `border-line` ×33, `text-draw` ×28, `border-line-strong` ×22
- kept, no colour of yours near it:
  - text `text-draw/75` (#4568fe) ×6, nearest `draw` at ΔE 0.101
  - border `border-fg/45` (#8d8d8d) ×1, nearest `line-strong` at ΔE 0.096
- refused: 6 (bg a background image ×6)

### `/primitives`

- places read: 253 in 11 ms; content skipped: 6
- measure (distinct composited colours, before → after): text 5 → 5, backgrounds 8 → 8, borders 2 → 2
- moves: none
- kept: 189 places already on a token, 29 follow the page's base colour or the text colour; most used: `text-faint` ×64, `text-muted` ×25, `border-line` ×23, `bg-accent` ×20, `bg-surface` ×17
- kept, no colour of yours near it:
  - bg `bg-fg/8` (#ececec) ×1, nearest `surface-pressed` at ΔE 0.016
- refused: 61 (text set by a stylesheet, not a class here ×21; bg a background image ×15; bg set by an inline style ×13; bg set by a stylesheet, not a class here ×8; bg the class does not set this colour here (a stylesheet rule wins, or the class is not in your stylesheet) ×2; bg a gradient ×1)

### `/motion/moments/apple-intention`

- places read: 748 in 23 ms; content skipped: 24
- measure (distinct composited colours, before → after): text 6 → 6, backgrounds 8 → 8, borders 7 → 7
- moves: none
- kept: 454 places already on a token, 74 follow the page's base colour or the text colour; most used: `text-draw` ×120, `text-fg` ×101, `text-faint` ×57, `text-muted` ×48, `border-line` ×45
- kept, no colour of yours near it:
  - bg `bg-[#141418]` (#141418) ×1, nearest `surface-pressed` at ΔE 0.762
  - border `border-accent/70` (#e06d68) ×1, nearest `warning` at ΔE 0.108
  - border `border-accent/50` (#e79793) ×1, nearest `warning` at ΔE 0.115
- refused: 337 (bg set by an inline style ×133; text set by an inline style ×110; border set by an inline style ×69; text set by a stylesheet, not a class here ×20; bg a gradient ×2; border the class does not set this colour here (a stylesheet rule wins, or the class is not in your stylesheet) ×2)

### `/motion/moments/webflow-ecommerce`

- places read: 495 in 12 ms; content skipped: 0
- measure (distinct composited colours, before → after): text 6 → 6, backgrounds 5 → 5, borders 7 → 7
- moves: none
- kept: 263 places already on a token, 34 follow the page's base colour or the text colour; most used: `text-draw` ×94, `text-fg` ×65, `text-faint` ×27, `border-line` ×22, `border-draw` ×21
- kept, no colour of yours near it:
  - bg `bg-[#141418]` (#141418) ×1, nearest `surface-pressed` at ΔE 0.762
  - border `border-accent/70` (#e06d68) ×1, nearest `warning` at ΔE 0.108
  - border `border-accent/50` (#e79793) ×1, nearest `warning` at ΔE 0.115
- refused: 278 (bg set by an inline style ×125; text set by an inline style ×98; border set by an inline style ×50; bg a gradient ×2; border the class does not set this colour here (a stylesheet rule wins, or the class is not in your stylesheet) ×2; text the class does not set this colour here (a stylesheet rule wins, or the class is not in your stylesheet) ×1)

### `/patterns/bottom-sheet-detents`

- places read: 278 in 14 ms; content skipped: 4
- measure (distinct composited colours, before → after): text 5 → 5, backgrounds 11 → 11, borders 7 → 7
- moves: none
- kept: 250 places already on a token, 50 follow the page's base colour or the text colour; most used: `text-faint` ×75, `border-line` ×33, `text-muted` ×29, `border-line-strong` ×22, `text-fg` ×22
- kept, no colour of yours near it:
  - text `text-faint/50` (#c6c6c6) ×1, nearest `faint` at ΔE 0.169
  - border `border-fg/70` (#515151) ×1, nearest `line-strong` at ΔE 0.312
  - bg `bg-fg/15` (#dadada) ×1, nearest `surface-pressed` at ΔE 0.068
  - border `border-fg/50` (#717171) ×1, nearest `line-strong` at ΔE 0.119
  - bg `bg-scrim` (#070707) ×1, nearest `surface-pressed` at ΔE 0.827
  - bg `bg-fg/80` (#393939) ×1, nearest `surface-pressed` at ΔE 0.609
- refused: 7 (bg a background image ×7)

Union over all 11 routes read: text 13, backgrounds 19, borders 15.

## Against docs/briefs/pass-colour.md's numbers

| pass-colour.md says | The reader says | Why they differ |
| --- | --- | --- |
| `/motion/standards`: 7 text colours, 7 backgrounds, 4 borders, all tokens | text 6, backgrounds 7, borders 5; 0 moves | The 7th text colour in the probe is the hidden tooltip text (`opacity-0`, 25 spans on that route): the reader skips text that is not shown (opacity under 0.05). The 5th border is `border-fg/45`, listed under "no colour of yours is near it" (ΔE 0.096 from `line-strong`): composited it is a colour of its own. |
| site: 19 text colours over 12 routes | 13 text colours over the 11 routes read (the four above plus seven more), ΔE 0.01 merge | The 19 counts `rgb(31,58,95)` ×481 and `rgb(47,100,240)` ×255 from the sticker palettes, which are inline styles. The reader lists those as refused ("set by an inline style") and leaves them out of the measure (`data: true` on the census row), so the site number is the app's own colours. Raw computed strings that differ by less than ΔE 0.01 (`oklab(0.13 0 0 / 0.75)` and its neighbours) are one colour here. |
| the `bg-[#ffffff]` ×18, `text-[#55555C]` ×2, `bg-[#F4F4F6]` ×2 tail folds | 0 such places on these 11 routes | The classes are in `src/motion/examples/stage-shell.tsx`, the harness apps and similar demo files. On the routes read, `bg-white`/`bg-white/N` paint nothing (this theme sets `--color-*: initial`, so those classes do not exist and the element is transparent), and the examples with `bg-[#F4F4F6]`/`text-[#55555C]` are not drawn at load. I did not find a route that draws them; the e2e fixture uses the same classes. |
| second blue `#2F64F0` kept at keep | not seen as a class on these routes | In `/stickers` it is drawn by an inline style (72 text + 64 background places refused as inline). The class form (`text-[#2F64F0]`) is proved in e2e/colour-read.test.mjs test 3. |
| sticker palettes are content | refused, not skipped as content | They are `style={{ background }}` on HTML elements, not inside `<svg>`. The reader treats an inline style as "listed, not written" (pass-colour.md "Refuse, don't guess") and keeps it out of the measure. Elements inside svg/canvas/img/video are the `content` count (28 on `/motion/standards`, 44 on `/`). |
| 0 gradients on UI routes, 133 on `/icons` | `/icons`: 133 backgrounds refused as "a gradient" | Same number. |

One result the document did not predict: on `/motion/entries/offset-and-delay`, `the-pop` and `the-settle` the reader proposes `text-fg/75` → `text-muted` (rule grey-levels, ΔE 0.1, text 8 → 7 or 7 → 6). It is the only move on all 11 routes. See the open questions in docs/briefs/colour-l1.result.md.
