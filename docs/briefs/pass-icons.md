# Pass: icons

LLD for the clean-up runner's fourth pass, parameterized by the direction (docs/research/direction.md §2.6, §4).
Nothing here is built. Numbers from crafting-ui: `scratchpad/measure/probe.mjs` (12 routes, read-only) and greps of
its source, quoted with each.

## What it does, in one sentence

Makes every icon on the page one style at one stroke that follows the text beside it, one size per list, and (at scope
new) swaps emoji and stray sets for the chosen set with the video's coloured dots where a category needs a colour.

## Lessons it carries

| Lesson | Applied |
| --- | --- |
| Project-wide | The stroke the app pairs with each weight is learnt over the project (craft/stroke-weight learns it per pass today, `craft-rules.js:1520–1528`; census v2 `icons` makes it the project's) |
| Writes must land | A stroke is written where it is set: the renderer's prop or variable when one exists (crafting-ui routes every icon's stroke through `src/language/Icon.tsx:67` `strokeWidth={stroke.icon}` and warns if a mark sets its own, `:43`), else a `[stroke-width:1.5]` class on the svg at its usage; a stroke baked into path data (filled outlines) cannot be written and is refused |
| Refuse, don't guess | An emoji is swapped only through an explicit mapping table (emoji → icon name in the chosen set) and only when the set is installed; a glyph with no mapping is listed |
| Content is not UI | svgs that are drawings (crafting-ui's figures: `stickers.tsx`, `Timeline.tsx` marks, anything > 48px or inside `config.system.exclude`) are not icons |
| No new values at keep | The target stroke and size are the app's own modes; a pass that adds a stroke width is not offered |
| One step, laws tagged | One `write`, laws `similarity`, `fitts` (hit size), `cognitive-load` |

## What counts as an icon

An `<svg>` (or `<img>`, or a text node that is only emoji/dingbats) at most 48×48 as drawn, inside or beside text in a
control, link, list item, heading or label, or alone in a control of at most 48×48. Not an icon: inside another svg,
larger than 48px, under an excluded path, an `<img>` with a photo aspect, a decorative figure with > 12 shapes.

## Inputs

### Page

Per icon: drawn size, `viewBox`, the shapes' computed `stroke-width` (in user units × the drawn scale → px on screen),
fill vs stroke kind (line, solid, mixed, duotone = two fills at two opacities), `stroke-linecap`/`linejoin`, colour
(for the colour pass), the host's text weight and size, the host's role (button, link, list row, label), the icon's
origin (class `lucide`, an import path at the stamp's file, the renderer component), siblings in the same list (for
one-size-per-list, craft/media-size).

### Project (census v2 `icons`)

Per stamp: `{ stamp, size, viewBox, strokes, kind, hostWeight, hostSize, origin, route }`, read on every route.

### Direction

`icons.style`, `icons.set`, `contrast` → the stroke table (direction.md §2.6), `scope`.

## Measured on crafting-ui (12 routes)

```
== svgs ≤48px (all 12 routes): 1046, of which 850 on /icons (the Frosted Icons gallery: content)
== svgs ≤48px without /icons: 196
 sizes:      20×20 67 · 14×14 38 · 30×30 36 · 10×10 30 · 32×32 14 · 11×13 5 · 34×34 2 · 25×25 2
 viewBoxes:  0 0 20 20 82 · 0 0 16 16 40 · -3 -3 26 26 36 · 0 0 10 10 30 · 0 0 11 13 5
 stroke widths (computed px over shapes): 1.5 280 · 1.6 70 · 1.3 12 · 6 4 · 2.4 3 · 1.8 2 · 1.4 2 · 6.3 1
 kinds:      mixed 103 · stroke 61 · fill 32
 by file:    src/language/Icon.tsx 81 · src/motion/stickers.tsx 36 · src/motion/Timeline.tsx 35 · src/pages/VocabularyPage.tsx 34 · FilmTransport 3 · PrinciplePage 3 · Hero 2 …
 file → strokes: Icon.tsx {1.5} 81 · VocabularyPage {1.5} 34 · stickers.tsx {1.6} 33 · Timeline {} 30, {1.3} 5 · Hero {1.6} 2 · FilmTransport {1.8} 2
 host weight → strokes (icons inline with text): (400, 1.5) 92 … every host is weight 400
emoji text nodes: 1 (on /); 11 source files contain an emoji character
img icons: 0
```

Source: no icon package in `package.json` (`grep -rn "lucide\|heroicons\|phosphor\|tabler\|radix-ui/react-icons" package.json`
→ nothing); 159 inline `<svg>` in 103 `.tsx` files; `strokeWidth={…}` literals: 1 ×61, 2 ×60, 1.5 ×42, 1.2 ×38,
1.8 ×26, 0.8 ×24, 3 ×23, 1.6 ×17, 0.6 ×17, 1.4 ×16 (ten distinct; almost all in `src/frosted-icons`, figures and
drawings, which are content). The app's own icon language is `src/language/Icon.tsx`: one renderer, one stroke
(1.5), 20px grid (`viewBox 0 0 20 20` ×82), round caps, hosts at weight 400.

What that says: on crafting-ui **the icon system is one renderer and already consistent**: 1.5 on 81 of 81 `Icon`
instances. The drift is at the edges: `Hero.tsx` ×2 and `stickers.tsx` at 1.6 (0.1 off, below craft/stroke-weight's
`off` threshold and invisible), `Timeline.tsx` at 1.3 (the timeline's own marks, arguably a figure), one emoji on `/`.
The video's case (a dozen emoji in a nav, two icon sets) does not occur here; the fixture plants it. The honest
"before → after" on `/motion/standards`: **1 → 1** stroke, **2 → 2** sizes (20 and 14, two roles). The pass must say
"nothing to do" there, and prove it on the fixture where there is.

## The proposal algorithm

1. **Collect** the page's icons (definition above); drop content.
2. **Learn the pairing** from the project census: for each host weight band (≤ 400, 500, ≥ 600) the modal stroke in
   px at the modal size (crafting-ui: 400 → 1.5 at 20px). This is the app's own table; the direction's table
   (§2.6) is the target at refine/new, the app's own at keep.
3. **Propose**, per icon:
   - stroke off the target for its (weight, size) cell by ≥ 0.25px (craft/stroke-weight's `off`) → the cell's value;
     for the same source (one file, one renderer) all instances move together (it is one write);
   - size off the list's modal size (craft/media-size, `craft-rules.js:807`) → the modal size (the `size` prop or
     `size-5` class at the usage);
   - a large icon whose stroke scaled with it (≥ 32px and stroke > 2) → absolute stroke (Lucide `absoluteStrokeWidth`,
     or the renderer's rule);
   - style off the direction's (a solid among lines, a line among solids) → refine: listed; new: the set's
     counterpart by name when the set has one (Heroicons outline ↔ solid, Phosphor weights, Material FILL axis);
   - emoji in a control or nav item → new: the mapped icon from the set at the host's text size, plus a coloured dot
     (a 6px `rounded-full` span in the category's status/accent hue) when the emoji was carrying a category colour
     (the video's move: emoji → line icon + dot); keep/refine: listed as "emoji: 7 places";
   - a second set among the first (origin differs) → new: listed with the count and a one-click "use <set> for all"
     only when every icon has a mapped name; else listed only;
   - hit size: an icon-only control under 24px → craft/hit-target's existing suggestion (padding), tagged here.
4. **Locate the write**: the renderer prop (`stroke.icon` in a module → a `token`-like write to that constant is out
   of scope; the pass writes at usages only, and says "your icons set their stroke in `Icon.tsx`: change `stroke.icon`
   there" as advice when the renderer owns it), the `strokeWidth` attribute at the usage (a JSX prop edit, supported
   only when the write path can locate a prop: today it locates classes and text; **prop edits are deferred**), or a
   class: `[stroke-width:1.5]` on the svg (Tailwind v4 arbitrary property, writes `stroke-width: 1.5` on the svg, which
   wins over a `stroke-width` attribute but **not** over a presentation attribute on child paths; so the class is
   written only when the paths inherit stroke from the svg, checked by reading the shapes' own attributes). Nothing
   locatable → refused with the reason.
5. **Measure**: distinct stroke widths (px, 0.25 grain), distinct icon sizes, number of sets, emoji count, on the page
   and the site, before → after. Keep: after ≤ before or not offered.

## What is written

- Class swaps and (new) element swaps at places, one `write`, group `cleanup-icons-<n>`, `step: 'Icons'`, laws
  `['similarity', 'fitts']`.
- An element swap (emoji → `<Icon name="…" />`) is a text edit of the JSX at the usage plus an import; it is the only
  pass that adds an import, so it is done through the session's `swap` path with an explicit "adds `import { Bell }
  from 'lucide-react'`" line in the proposal, and only when the package is in `package.json`. Otherwise the proposal
  says "Install lucide-react first" and refuses.

## Preview

Stroke and size changes preview as inline `stroke-width`/`width`/`height` on the touched svgs. Emoji → icon previews
by swapping the text node for the set's svg markup fetched once from the session (the server reads the set's svg
files from `node_modules`), so the page shows the real glyph before anything is written. Dots preview as a span.

## Laws

`similarity` (one stroke, one size, one style: icons read as one family), `fitts` (hit size), `cognitive-load`
(emoji carry many colours and shapes; one set carries one).

## The measure the panel shows

"**3 → 1** icon styles on this page · **7** emoji become icons · **2 → 1** sizes in the nav". On crafting-ui's UI routes:
"Your icons already match: nothing to do."

## Pragmatic cut

**Build first:** the stroke-and-size pass at scope keep (steps 1–3 for stroke and size, step 4's class write, step 5)
*and* the emoji → icon swap at new with the dot, because the swap is the single most visible move in the video's
third row and the one no other tool does on a running page. Mapping tables: start with the 60 most common UI emoji
(bell, home, inbox, folder, users, file, chart, settings, search, star, bolt, lock, calendar, clock, mail, flag, pin,
tag, trash, pencil …) for Lucide and Heroicons.

**Deferred:** prop edits (`strokeWidth={…}` at a usage) until the write path locates props; set-to-set conversion
(Heroicons → Lucide by name) beyond listing; duotone and Material's variable axes; icon colour (the colour pass);
`absoluteStrokeWidth` as a prop (same prop-edit dependency: the advice is written instead).

## E2E tests (each from crafting-ui's code or the video's case, through the real CLI and Chromium)

| Test | Fixture | Asserts |
| --- | --- | --- |
| One renderer, one stroke: nothing to do | `src/language/Icon.tsx`'s pattern: a renderer setting `strokeWidth` on every icon, hosts at 400 | the pass reports 1 stroke, offers nothing; no write |
| A stray stroke among the renderer's | the same plus an inline svg at `strokeWidth={2}` beside 400 text (Hero.tsx's shape) | proposal `2 → 1.5` on that svg as `[stroke-width:1.5]`; computed stroke after = 1.5px; the renderer's icons untouched |
| Paths own their stroke: refused | an svg whose paths each carry `stroke-width="2"` | listed "the paths set their own stroke", nothing written |
| One size per list | a nav of five rows at `size-5` and one at `size-4` (craft/media-size's case) | the odd one → `size-5`; distinct sizes 2 → 1 |
| Emoji → icon with a dot (the video) | a nav with 🔥 📥 📁 👥 🧾 📊 items, `lucide-react` installed, direction new, style line | each emoji replaced by the mapped `<Flame/>` … at 16px, stroke 1.5, plus a dot in the status hue where the fixture marks a category; the import is added once; History shows one "Icons" step with law of similarity; Undo step restores the file |
| Set not installed: refused | the same nav without `lucide-react` | "Install lucide-react first" and no write |
| Content is not icons | 36 sticker drawings from `stickers.tsx` at 1.6 | 0 proposals; the measure excludes them |
