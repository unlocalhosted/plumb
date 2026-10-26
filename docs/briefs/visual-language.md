# Visual language: a toy you can trust

Status: design, 2026-10-27. Owner: "our primitives look really bad … I want this kind of colour scheme … pastel colours
which look delightful … a visual language which evokes creativity, whimsy, joy, exploration, like the old Mac". The
reference: a measurement overlay on soft charcoal with sky-blue selection, hatched padding, number pills (`12` in
blue, `0` and `2` in red), dashed guides, a name tag with an icon, and pastel pink/mint/butter/sky data. Decisions:
everything changes (cards, controls and the marks on the page); sky = selected, coral = off, mint = on, butter =
soft, pink = actions; follows light and dark.

## The system behind "looks really bad"
The overlay's primitives were an *instrument* palette: warm neutrals, one blue accent, verdict colours used only as
text. Every surface was paper and ink, so every control read as a form. The language that replaces it: **precise like
an instrument, friendly like a toy**. Lines stay crisp (1px, snapped to device pixels, one meaning per colour); fills
become soft pastels; the things you touch are pills; the old Mac lends its fill patterns, its marching-ants selection
and its rainbow, each used for one thing only.

## Principles
1. **One colour, one meaning, everywhere.** Sky is what you've selected and its measurements, and focus. Coral is
   off the system. Mint is on the system, and written. Butter is softer trouble (a Tailwind default, the wrong tier).
   Pink is what you can do (Write, Fix all, the primary button). Lilac names things (component tags, the element's
   name). Nothing else gets colour.
2. **Pastel fills, inked words.** A pill or chip is filled with its pastel and lettered in the same hue's deep ink,
   never white on pastel; in dark mode the pastel itself is bright enough to carry dark ink.
3. **Patterns from the old Mac.** Padding is a 45° hatch in sky (the reference's hatch, MacPaint's pattern); margin is
   a 50% dot dither; a transparent fill is a checkerboard. Patterns are 1px lines at 6px pitch, drawn by the overlay,
   never by the page.
4. **Marching ants for what's picked.** A picked-but-unwritten element wears the MacPaint selection: a 1px dashed
   outline whose dashes march (4px on, 4px off, 600ms a lap). Written, it settles to a solid mint line.
5. **The rainbow once.** Pink, mint, butter, sky as one striped band, used in exactly one place: the dock's mark (and
   its loading shimmer). It says "this is the playful tool" without colouring anything else.
6. **Friendly shapes.** Cards round to 12px, pills to 7px, tags to 6px; hairlines inside dark cards
   (rgb(255 255 255 / .06)) instead of borders; shadows soft and low.
7. **Motion with a little bounce.** Things that appear (pills, tags, the chooser) pop from 0.92 with a spring that
   overshoots ~4% and settles in 260ms; selections slide on the same spring; nothing loops except the marching ants
   and the loading shimmer. Under reduced motion: no pop, no march, no shimmer; states change at once.
8. **Numbers are monospaced and tabular.** Measurements, counts and tokens set in the system mono; prose in the
   system sans. The overlay still never fetches a font.

## Primitives (tokens.css), dark / light
| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--pl-paper` | `#1c1c1e` | `#fdfcf8` | card ground |
| `--pl-paper-2` | `#26262a` | `#f4f1ea` | inset, hover, pressed |
| `--pl-rule` | `#323236` | `#e6e1d6` | dividers |
| `--pl-ink` / `-2` / `-3` | `#f4f3ef` / `#a8a6a0` / `#5f5d58` | `#1d1b17` / `#6b665c` / `#b3ad9f` | words |
| `--pl-sky` / `-soft` / `-ink` | `#7cc4fa` / `#7cc4fa` / `#08263d` | `#2f8fe0` / `#c5e6fd` / `#0b3554` | selected, measure, focus |
| `--pl-coral` … | `#ff7a6b` / `#ff7a6b` / `#3a0b06` | `#e5503f` / `#ffd3cd` / `#5c160e` | off the system |
| `--pl-mint` … | `#7ee0b0` / `#7ee0b0` / `#06301d` | `#1f9e64` / `#c9f2dd` / `#0b3d26` | on the system, written |
| `--pl-butter` … | `#ffd166` / `#ffd166` / `#3a2a00` | `#c48a00` / `#ffeab0` / `#4a3400` | soft trouble |
| `--pl-pink` … | `#ff6ec7` / `#ff6ec7` / `#3d0629` | `#e0369f` / `#ffd0ec` / `#5a0d3c` | actions |
| `--pl-lilac` … | `#b9a6ff` / `#b9a6ff` / `#1d1240` | `#7a5cf0` / `#e3dcff` / `#2b1a6b` | names |

The existing semantic tokens map onto these: `--pl-accent` and `--pl-instrument` → sky (selection, focus, the
reticle); a new `--pl-action` → pink; `--pl-off` → coral; `--pl-on` → mint; `--pl-soft` → butter. Components keep
using the semantic names, so the change lands everywhere at once.

## Layers
1. Tokens and patterns, shown on the primitives gallery (`overlay/demo/primitives.html`, a new "Language" card:
   palette, pills, tags, hatch, dither, checker, marching ants, the rainbow band, the pop). Owner review.
2. The primitives (stepper, swatches, radius, segments, align, shadows) restyled in the language. Owner review.
3. The overlay's own surfaces: dock (with the rainbow mark), cards, chooser, panel, toasts, sheet.
4. The marks on the page: sky selection and measurement pills with hatched padding (the reference), coral drift
   outlines and labels, marching ants for picks, mint for written.
