# Craft hard rules: making the 31 "uncheckable" rules checkable

Status: design, 2026-10-27. Builds on docs/briefs/craft-engine.md (the engine, `Facts`, `Theme`, the rule API) and
docs/briefs/craft-hierarchy.md (tiers, facets, `arbitrate`; layer 1 is built: overlay/src/craft-facets.js,
overlay/src/craft-arbitrate.js). Code it concerns: overlay/src/craft.js (`Facts`, `Theme`, `Craft.enrich`),
overlay/src/craft-rules.js (32 rules), overlay/src/craft-run.js + src/craft-run.ts (`plumber craft --url`),
src/habits/index.ts + src/habits/quotes.ts (source rules), src/collect/computed.ts (the oxc class tracer).
Catalogue: docs/craft/rules.md. The 31 rules not yet encoded: 2 3 4 5 6 12 17 21 22 25 31 33 40 44 48 49 50 52 54 56
59 60 61 62 64 65 66 68 71 75 77.

## The problem, and the system behind it

The 31 were left out for five stated reasons: behaviour over time, glyph and pixel analysis, page-wide statistics,
comparing states, and judgement. Those are five symptoms of one gap: **the engine has exactly one kind of fact.**
`Facts` (craft.js) answers `rect`, `style`, `kids`, `text`, `box`, `ground`: a still, computed, per-element reading of
the page *as it is now, in this one state, by itself*. Every rule that needs a glyph's ink, the page's habit, the page
under another condition, the page a moment later, or an eye, has nothing to read and so was marked ~ or left.

The fix is not 31 clever checks. It is five more kinds of fact, each a primitive in the style of `Facts` (memoised per
pass, read-only, asked for through `reads`, prepared once, shared by every rule), and one honesty mechanism (an
advisory tier and a cached judge) so that a rule which cannot be certain can still speak without lying. With those in
place each of the 31 becomes a short pure `check(facts, theme)` like the 32 that exist.

| Fact kind | Primitive | Where it can exist | Unlocks |
|---|---|---|---|
| glyph geometry | **metrics** `facts.metrics(el)` | live, headless | 4 5 6 (sharpens 13 14) |
| rendered ink | **ink** `facts.ink(el)` | live (inline SVG), headless (any clip) | 2 3 50 75 |
| the page's own habit | **census** `facts.census(name)` | live (in view + read), headless (whole route), CLI (all routes) | 12 17 22 25 50 and the *suggestions* of 31 40 75 |
| the page under another condition | **pairs** `facts.other(cond)` | headless | 44 54 75 77 66 |
| the page a moment after a gesture | **probes** `facts.probe(el)` | headless | 31 59 60 61 62 64 65 66 68 |
| what the source says the element is | **structure** `facts.source(el)` | server, read by both | 50 59 60 61 62 65 66 71 77, prop edits |
| an eye, when measurement is in the grey band | **judge** | opt-in, cached, never blocks | the taste half of 2 3 21 25 40 44 56 |

Seven of the 31 need none of this: they were waiting only for a decision about noise (48 40 49 21/52 56 25 33). They
are layer 0.

Two principles run through every rule below:

1. **Judge against the app, not the universe.** Where a rule's number is a matter of taste (how many weights, how
   tinted a shadow, squircle or round), the engine first asks the census what *this app* does. The outlier against the
   app's own majority is a craft finding; the same value in an app that does it everywhere is a decision, and the
   engine is quiet. A taste rule becomes a consistency rule the moment the app has chosen.
2. **Say how sure, and in which tier.** A rule that measured something exact speaks at its tier with confidence ≥ 0.8
   as today. A rule whose evidence is real but whose conclusion is a judgement speaks in a new **advisory** tier
   (`TIER.advisory = 4`): drawn soft, never counted in the dock, SARIF level `note`, never part of the exit code. The
   same rule can lift itself to tier 3 on the finding (`tier` on the finding overrides the rule's) when the census says
   the app contradicts the element.

## The hierarchy additions

- `TIER.advisory = 4` in craft-facets.js. `markOf` sets `soft: true` for tier 4 (the field exists, always `false` today).
  `craftFindings` (src/craft-run.ts) maps tier 4 to severity `note`; the exit code ignores it. The dock's "N off in
  view" skips soft marks. `annotate` in craft-arbitrate.js reads `m.tier ?? r.tier`, so a finding may carry its own.
- New facets in the table (`TABLE`, craft-facets.js): `motion` (transition-*, animation-*, `animate`, `duration`,
  `ease`, `delay`, `transition`), `align` (align-items, justify-*, align-self: `items`, `justify`, `self`, `place`),
  `interaction` (touch-action, -webkit-tap-highlight-color, user-select: `touch`, `select`), `text-box` (text-box-trim,
  text-box-edge). `radius` gains `corner-shape` and `corner`; `font-features` gains `font-optical-sizing`; `font-weight`
  gains `-webkit-font-smoothing`, `antialiased`, `subpixel-antialiased` (smoothing changes apparent weight: the same
  reasoning that put opacity under `color`).
- A third suggestion kind, **`prop`**: `{ kind: 'prop', component, name, from, to, why }` (`<Tooltip.Provider
  delayDuration={700}>` → `500`). It is written through a new server endpoint beside `set` (src/session/props.ts) that
  edits a JSX attribute at the site structure knows. Until that endpoint exists, `markOf` renders a prop suggestion
  as advice with the exact text, so no rule waits on the write.
- `reads` on a rule now names fact kinds the engine must **prepare**: `'metrics'` (sync, cheap), `'ink'` (async),
  `'census'` (one pass over all items before rules run), `'other:dark'`, `'probe:press'`, `'source'`. The engine runs
  rules whose kinds are ready and leaves the others for the next pass; a prepared fact arriving invalidates its
  element, exactly as late decisions do today ("the theme's decisions arrive late and judge everything again",
  craft-run.js). A rule's `scope({ el, facts })` (already in craft.js for `refines`) also names its candidates, so
  nothing expensive is prepared for an element no rule wants.

## The primitives

### metrics: `facts.metrics(el)` → `{ capHeight, xHeight, ascent, descent, halfLeading, baseline(line = 0) }`

One `OffscreenCanvas` 2D context per pass. `ctx.font = style.font`; `measureText('H').actualBoundingBoxAscent` is the
cap height, `measureText('x').actualBoundingBoxAscent` the x-height, `fontBoundingBoxAscent/Descent` the content
area; `halfLeading = (lineHeight − (ascent + descent)) / 2`. `baseline(0)`: the first text node's `Range` rect top +
`halfLeading + ascent`. Memoised per font string (`style.font` + `fontKerning`), so a page with four text styles
measures four times. Guard: `document.fonts.check(style.font)` false → the metric is `null` and every rule reading it
returns `[]` (a fallback font's metrics are not the page's). The web font arriving (`document.fonts.ready`) invalidates
the engine. Live and headless alike; no write to the page.

### ink: `facts.ink(el)` → `{ bbox, centroid, area, fill, strokePx }` or `null` while preparing

Inline `<svg>`: `XMLSerializer` → `data:` URL → `Image` → `OffscreenCanvas` at 4× the rendered size (sub-pixel
centroids) → `getImageData`. From the alpha channel: ink bounding box, alpha-weighted centroid, ink area, `fill =
area / (bbox.w · bbox.h)`. `strokePx` is not from pixels: it is `getComputedStyle(path).strokeWidth` in user units ×
(rendered width / viewBox width), read for the first stroked path. Cached by hash of the serialised SVG + rendered
size (one icon used forty times rasterises once). `<img>` icons and icon fonts: live says `null` (a tainted canvas
cannot be read); headless uses a CDP `Page.captureScreenshot` clip at `deviceScaleFactor` 2 via a `prepare` step in
src/craft-run.ts and hands the pixels in through `window.__plumb.craft.ink(id, pngBase64)`. Candidates: elements an
ink rule's `scope` names (icons ≤ 48px inside a control or a flex row with text; scroll containers for #75). Live
overlay: prepared in idle time (`requestIdleCallback`), elements invalidated as results land; blueprint-performance
rules hold (no read between writes; the canvas is off-DOM).

### census: `facts.census(name)` → `{ sample, clusters: [{ value, count, members }], majority, minority }`

Computed once per pass over every item the reader handed on (CAP in view + PAGE off-screen), before rules run, from
the same memoised `style`/`rect` reads; the headless run therefore sees the whole route, and the CLI can merge
censuses across routes (same cluster key). Values cluster with a tolerance per census (lengths 1px, colours ΔE OKLab
4, weights exact after folding 400/450); `majority` is the clusters covering ≥ 60% of the sample, `minority` the
clusters ≤ 10%. Censuses: `gaps` (vertical distance between consecutive stacked siblings of column-flow containers, per
container depth), `weights` and `textColors` (over text-owning elements; colours composited through opacity on their
ground, chroma recorded so semantic colours can be excluded), `shadows` (each distinct `box-shadow` parsed to layers:
total blur, max y, alpha sum, hue), `surfaces` (large painted backgrounds), `strokes` (icon `strokePx` paired with the
adjacent text's weight, from ink), `active` (what the stylesheets do under `:active`: `scale`, `brightness`, `bg`,
nothing; read once from the CSSOM), `corners` (`corner-shape` values on large rounded surfaces), `scrollCues` (the
app's own scroll-shadow utility, if any). A census speaks only above `threshold.sample` (per rule, ≥ 6 to ≥ 20). A
census rule flags the minority against the majority, never a value against a universal number, and is `once: 'page'`
with members as its places.

### pairs: `facts.other(condition)` → a `Facts` view of the same route rendered under another condition

Headless only (the live overlay reads the page as it is; flipping a scheme is a write). `craftRun` (src/craft-run.ts)
opens a second page for each condition a loaded rule asks for, lets the reader run dry, and keys every element by its
source site (`locate` → file:line:column, plus index among siblings for list rows), the one id stable across renders.
The pair arrives in the first page as plain JSON (`style` subset, `rect`, per site) through
`window.__plumb.craft.pair(condition, records)`; `facts.other('dark').style(el)` looks the element up by its site.
Conditions: `dark` (`page.emulateMedia({ colorScheme: 'dark' })`), `motion` (`reducedMotion: 'no-preference'`; note
src/craft-run.ts:38 loads with `'reduce'` today, which hides every animation from every rule: the default load must
become no-preference, with reduce as a *pair* for #67), `touch` (`hasTouch`, `isMobile`, 390×844: overlay scrollbars,
hover absent), `held` (API responses paused by `page.route(pattern)`: the page in its loading state), `scrolled`
(each scroll container at its end).

### probes: `facts.probe(el)` → the recorded timeline of one gesture on one element

Headless only, a `probe` phase in src/craft-run.ts after the still pass. A probe is `{ gesture, target, timeline }`
where the recorder, started just before the gesture, keeps: a `MutationObserver` (subtree, attributes `data-state
aria-expanded hidden class style`, with `performance.now()` stamps), `document.getAnimations()` snapshots (new
animations with `effect.getComputedTiming()`: duration, delay, easing, progress) at each rAF, an rAF sampler of
`transform`/`opacity` on nodes that appeared, and a `PerformanceObserver({ type: 'layout-shift', buffered: true })`.
Gestures (Playwright): `press(el)` (`mouse.down`, hold 150ms, `up`), `hover(el, ms)`, `path(from, to, steps, ms)`,
`key(combo)`, `drag(el, dx, dy, ms)` with a release velocity, `scroll(el, to)`, `release(pattern)` (lets held
responses through). Candidates come from structure + ARIA (`[aria-haspopup]`, `[role=menu]`, `[data-state]`,
`[cmdk-root]`, `[data-vaul-drawer]`, controls). Safety and determinism: buttons inside a `<form>`, `type=submit`, and
links with an `href` are never pressed (hovered only); document navigations are blocked for the probe page
(`page.route` on `request.isNavigationRequest()`); the page is reloaded after each gesture family so no probe colours
a later reading; candidates are taken in document order up to `--probe-budget` (default 24 per rule); every timing is
compared with a ±1 frame (16.7ms) tolerance. Probes are on by default in `plumber craft` only when a loaded rule reads
one; `--no-probe` turns them off.

### structure: `facts.source(el)` → `{ component, library, role, props, handlers }`

Server side, a small index built by walking each file's AST with oxc (the tracer in src/collect/computed.ts already
parses every module and resolves imports): for each JSX element, the component's import source and the literal props.
A library table maps `(import source, export name)` to a **role**: `menu`, `submenu`, `tooltip`, `tooltip-provider`,
`dialog`, `popover`, `drawer`, `palette`, `skeleton`, `spinner`, `icon`, `motion`. First entries: @radix-ui/*, @base-ui/react,
@headlessui/react, shadcn/ui components by file name (`components/ui/tooltip.tsx`), vaul, cmdk, @floating-ui/react,
lucide-react, @heroicons/react, react-icons, motion/react. Handlers: which `on*` props an element has, and keyboard
listeners registered in effects (`addEventListener('keydown'` in the same component: the combos it tests, read from
`e.key`/`metaKey` literals). Served with the element's reading (the overlay already asks the server for an element's
site and classes: this rides on the same response), so `facts.source(el)` is sync once the reading is in, `null`
before. Headless gets the same through `locate`. Structure is also how a `prop` suggestion knows its site.

### judge: an eye, cached, advisory, opt-in

For rules marked `judge: true` whose measured evidence lands in the grey band (confidence 0.6–0.8, under `FLOOR`),
`plumber craft --judge` crops the element with one neighbour of context (CDP clip, 2×), sends the crop, the rule's text
from docs/craft/rules.md and the evidence numbers to a vision model, and reads back `{ verdict, sentence }`. The answer
is cached in `.plumber/judge/<sha256 of rule + crop + evidence>.json`, committed with the project. In CI no model is
ever called: a cached yes lifts the finding to `FLOOR` with `judged: true` at tier advisory; no cache means silence.
The live overlay never judges. Determinism is the cache; honesty is the tier; cost is the opt-in.

## The 31 rules

Format: method · where · tier/facets · noise and its control · fix. Confidence floor stays 0.8.

### Layer 0: no new primitive, only a decision about noise

**48 `text-wrap` by role.** Computed `textWrap`/`textWrapStyle` is `wrap` on a heading (h1–h4, or font-size ≥ 1.5×
body) that renders on ≥ 2 lines (Range rect height / line-height) → `balance`; on a text block ≥ 3 lines and ≥ 300px
wide → `pretty`. Live+headless. Tier 1 legibility, facet `text-flow`; `heading-widow` (#18) gets `refines:
['craft/text-wrap-role']`. Noise: single-line headings and short blocks are skipped (nothing changes visibly);
`nowrap`/`balance`/`pretty` already set → quiet. Fix: class edit `text-balance` / `text-pretty`.

**40 continuous corners.** Only when `CSS.supports('corner-shape', 'squircle')`. A painted surface ≥ 160px on both
sides with radius ≥ 16px and `corner-shape: round`. Tier **advisory** by default; tier 3 when the `corners` census
shows the app uses `squircle` on ≥ 60% of such surfaces (consistency, not taste). Facet `radius` (so it arbitrates with
concentric-radius and radius drift on one corner). Fix: class edit `[corner-shape:squircle]`, or the app's own utility
when the census names one.

**49 optical sizing.** Text with computed `font-optical-sizing: none`, or `font-variation-settings` fixing `"opsz"`,
in a family that has the axis. The axis is found by the one write the engine allows (the `Theme` probe, before reads):
two hidden spans in the family at `'opsz' 8` and `'opsz' 144`; different widths → the axis exists (`Theme.axes(family)`,
memoised per family). Server half (habits): `font-optical-sizing: none` or fixed `opsz` in CSS, same rule id. Tier 3,
facet `font-features`. Noise: no axis → silence. Fix: class edit removing the `[font-optical-sizing:none]` /
`[font-variation-settings:…]` utility; advice when it is in CSS.

**21 + 52 tinted, colour-matched shadows** (one rule, `craft/tinted-shadow`, number [21, 52]). Parse the shadow
colours (the `shadows()` helper exists in craft-rules.js) to OKLab; the ground is `facts.ground(el.parentElement)`.
Flag when the ground's chroma > 0.03 (a coloured ground) and the shadow's chroma < 0.01 with alpha > 0.1. On a neutral
ground a grey shadow is right: quiet. Tier 3, facet `shadow` (arbitrates with layered-shadow). Noise: the chroma gates;
`inset` layers ignored. Fix: advice with the computed colour: the ground's hue, L ≈ 0.3, chroma × 1.2, the shadow's
alpha, as `oklch(…)` in the same layer list; class edit when the theme has a shadow token with that hue.

**56 eased scrims.** Computed `backgroundImage` is one `linear-gradient` with exactly two stops, one transparent and
one dark (L < 0.2, alpha ≥ 0.5), on an element ≥ 80px along the gradient axis positioned over media (absolute, and an
`img`/`video`/`picture` sibling or ancestor it overlaps by ≥ 50%). Tier 3, facet `background`. Noise: light gradients,
small ones, and gradients not over media are skipped. Fix: advice with a five-stop ease-out list for the same two
colours (`… 0%, 50% at 30%, 20% at 60%, 0 at 100%`) as a `bg-[linear-gradient(…)]` class. The second half (noise on
large dark gradients: two stops both L < 0.25 spanning ≥ 400px) is **advisory**, `judge: true`, advice only.

**25 no pure black or white large areas.** A painted background of exactly `#000`/`#fff` on an element covering ≥ 25%
of the viewport or ≥ 200,000px². `#000`: tier 3. `#fff`: tier 3 only when the `surfaces` census or the colour tokens
show the app has a tinted neutral surface (`--color-surface` ≠ #fff) and this one escaped it; otherwise **advisory**
(white pages are a decision many good sites make). Facet `background`. Fix: class edit to the nearest surface token
(`theme.nearestColor`, as text-opacity does); advice to tint by 2–3% toward the brand hue when none.

**33 content-driven sizes.** A text-owning control or cell with an explicit `width` in px (not `auto`, `%`, `fit-content`,
not a flex/grid-track result: compare `style.width` with the authored utility `w-[…]`/`w-N`) whose text, measured by
Range, leaves < 20% slack or overflows → "fixed where it should hug"; a list of siblings sharing one fixed width with
texts of different lengths and one truncated → the same, once per group. Tier 3, facet `size`. Noise: inputs, table
cells, grid children, images skipped; slack between 20% and 60% says nothing. Fix: class edit `w-auto` with `min-w-*`
at the theme's nearest step when alignment needs it; advice otherwise.

### metrics (layer 1)

**6 baseline alignment across columns.** A row container (flex-row, grid row, or inline siblings) with `align-items`
not `baseline`, where ≥ 2 children own single-line text at different font sizes: compare `metrics(child).baseline(0)`;
a difference > 1px → flag the parent. Live+headless. Tier 1 legibility (the eye reads the misalignment as sloppiness
in the words), facet `align`. Noise: any child with ≥ 2 lines, icons, equal font sizes (centre and baseline coincide),
children with their own vertical padding that *intends* an offset (a badge) when the difference ≤ padding delta.
Fix: class edit `items-center` → `items-baseline` (or add it when unset).

**4 icons centred on cap height.** A flex row with `align-items: center` holding an `svg` (≤ 32px) and single-line text:
`iconCentre = rect(svg).top + h/2`; `capCentre = baseline(0) − capHeight/2`. `|iconCentre − capCentre| > 1px` → flag
the icon. Tier 3, facet `transform`. Noise: multi-line text, icons taller than the line box, `align-items: baseline`
rows (handled by #6), text whose font is not yet loaded (`metrics` null). Fix: class edit `translate-y-[Npx]` only
when N rounds to a whole device pixel (fix-of-fix with `half-pixel` #37 would otherwise mark it); else advice: "the
icon sits 1.4px low; size it to the cap height (`size-[1em]`) or nudge by 1px".

**5 trim text's leading.** A painted (fill or border) box whose only content is one line of text, `halfLeading ≥ 2px`,
padding-top P: the visible gap above the letters is `P + halfLeading + (ascent − capHeight)`; flag when the invisible
part is ≥ 25% of P (16px padding reads as 21+). Tier 3, facet `text-box`. Noise: multi-line text (the leading belongs
between lines), inputs and textareas, boxes whose siblings are icon-only controls of the same height (equal heights
were the intent). Fix: class edit `[text-box:trim-both_cap_alphabetic]` when `CSS.supports('text-box-trim',
'trim-both')`; else advice with the two numbers to take off top and bottom.

### census (layer 2)

**12 vertical rhythm.** `census('gaps')` per container depth of the main column; the rhythm is the majority clusters
that sit on the spacing scale. A gap in the minority, off every majority step by > 2px, between two ordinary sections
→ one page finding naming the places. Tier 3, facet `gap` or `margin-y` (whichever utility sets it). Noise: `sample
≥ 6`; the first and last gap of a container are skipped (hero and footer breathe on purpose); gaps that contain an
`<hr>`/divider skip; gaps < 8px are inner spacing (#7). Fix: class edit to the nearest rhythm step (`gap-s6`, `mt-s8`:
on scale by construction).

**17 2–3 weights, 2–3 text colours.** `census('weights')` and `census('textColors')` with chroma < 0.04 (neutral text;
links, danger, accent are semantic and not counted). More than 3 weight clusters or more than 3 neutral text colours
with `sample ≥ 20` → one page finding whose places are the minority clusters (the extra levels). Tier 3, facets
`font-weight` / `color`. Noise: the chroma gate; marketing pages are judged the same (a fourth grey is a fourth grey);
dark-scheme pages are a separate census (`other:dark`). Fix: class edit of each minority use to the nearest majority
token (`text-[#6b7280]` → `text-muted`; `font-[450]` → `font-medium`).

**22 elevation ladder** (completes 51/53). `census('shadows')` sorted by blur: a ladder is monotonic in blur and y with
one y/blur ratio. When the theme has elevation tokens, drift (tier 2) already owns an off-token shadow; this rule
judges the *ladder itself*: a token whose ratio departs from the median by > 50%, or whose blur step is < 1.3× or >
3× its neighbour's → one page finding on the ladder. Without tokens it is **advisory**. Facet `shadow`. Noise:
`sample ≥ 3` distinct shadows; inset layers excluded. Fix: advice with a fitted geometric ladder (blur_n = blur_1·k^n, y
= blur/2) in the theme's own token names.

**50 icon stroke follows text weight.** `ink(svg).strokePx` beside text: `census('strokes')` learns this app's pairing
(e.g. 1.5px with 400–500, 2px with 600+). An icon whose stroke is in the minority for its text weight by ≥ 0.4px, or a
≥ 40px icon whose scaled stroke exceeds 3px, → flag. Tier 3, facet `border` (the table gains `stroke-width` and the
`stroke-*` utilities under it: a stroke is the icon's border). Noise: filled icons (no stroke) skip; `sample ≥ 8`;
icon fonts skip. Fix: `prop` edit `strokeWidth={1.5}` when `source(el).library` is lucide-react (or
`absoluteStrokeWidth` for the big icon); class edit `[stroke-width:1.5]` otherwise.

### ink (layer 3)

**2 optical centre.** An icon-only control (one `svg` child, no text) that centres it (flex/grid centre, equal
padding): `ink(svg)`. Asymmetry `a = (centroid − bboxCentre) / bbox.w` (and the y axis). Only shapes with `|a| ≥ 0.06`
(play, chevron, arrow, pin) are candidates; the optical target is the midpoint of bbox centre and centroid; the
correction `c = targetOffset × rendered size`. `|c| ≥ 1px` → flag. Tier 3, facet `transform`. Noise: symmetric
shapes never speak; icons > 32px (the nudge is < 3% and the raster ratio dominates) skip; a control that already
nudges (`translate` set) is judged on its nudged position. Fix: class edit `translate-x-px` / `-translate-x-px` when `|c|`
rounds to 1 whole pixel; advice with the number otherwise. `judge: true` for 1.0–1.4px.

**3 optical overshoot.** Siblings in one set (≥ 3 icons sharing a size class in a toolbar/list): `ink()` each.
Circularity: `fill` within 0.05 of π/4 and bbox square → round; `fill ≥ 0.9` → square. A round icon whose ink bbox is
not ≥ 4% larger than the square ones' → it reads smaller. Tier **advisory** (stroke icons' ink is a soft notion), tier
3 when the set comes from one library the census shows elsewhere overshooting (a mixed set). Facet `size`. Noise: sets
< 3; libraries that already overshoot (Lucide draws circles at 20/24 against 18/24 squares) come out quiet by
measurement, not by name. Fix: advice `scale-[1.06]` on the round one, or the library's larger size step.

**75 scroll shadows** (static half here, raster half in pairs). A scroll container (`overflow` auto/scroll,
`scrollHeight > clientHeight + 4`) whose scrollbar takes no width (`offsetWidth − clientWidth − borders = 0`: overlay
scrollbars, `scrollbar-width: none`, hidden `::-webkit-scrollbar`) and that has no edge cue: no `mask-image` fade, no
`background-attachment: local` layer, no `::before/::after` gradient of the container or its wrapper overlapping its
edge. Tier 1 legibility, facet `scroll`. Static confidence 0.8; the `scrolled` pair raises or clears it (below).
Fix: class edit to the app's own utility when `census('scrollCues')` names one; else advice with the
`background-attachment: local` four-layer recipe as a utility to add.

### pairs (layer 4)

**54 dark mode elevates with light.** In `other('dark')` (or the live page when `matchMedia('(prefers-color-scheme:
dark)')` matches and the page is dark): an element with a shadow of blur ≥ 4 whose background L (OKLab) ≤ ground L +
0.03 and no inset top highlight (an `inset` layer, y ≥ 1, light colour, alpha ≤ 0.15) → flag. Tier 3, facets
`background`, `shadow`. Noise: the dark scheme must actually be dark (`body` ground L < 0.3); fixed overlays skip.
Fix: class edit `dark:bg-<raised token>` when the theme has a surface token ≥ 0.04 L above the ground; the inset
highlight as `dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/.06)]` appended to the existing shadow class; advice
otherwise.

**44 light-on-dark weight compensation.** Pair `dark` vs the light page, elements matched by site: text with L > 0.8
on ground L < 0.3, font-weight ≥ 500, size < 20px, with the same weight and letter-spacing in both schemes and
`-webkit-font-smoothing` not `antialiased` → flag. Tier **advisory** (irradiation is real; how much to compensate is
taste). Facet `font-weight`. Fix: class edit `dark:antialiased` on the page root (once: page) is always safe; `dark:font-[450]`
only when `Theme.axes(family)` shows a `wght` axis (variable font) and the theme allows arbitrary weights (fix-of-fix
decides).

**77 skeletons match the final layout.** Pair `held` → release. In the held page, skeleton regions are found by
structure (`role: skeleton`), ARIA (`aria-busy="true"`), or class (`animate-pulse`, `skeleton`); their container's
children rects are recorded. `release(pattern)` lets responses through; the recorder's `layout-shift` entries with
`sources[].node` inside the container give exactly what moved and by how much (`previousRect`/`currentRect`); the
container's children rects are recorded again. Shift score attributable to the container > 0.01, or a height delta
> 4px between skeleton and loaded container → flag the skeleton. Tier 1 legibility (content jumps), facet `size`.
Noise: shifts during `document.fonts.ready` belong to #43 (font-metrics) and are attributed there by time; no held
response, no skeleton → silence; transforms do not count as shifts (the API excludes them). Fix: advice with the two
heights and the row count ("the skeleton is 120px, the card lands at 164px: three lines, not two"); class edit on the
skeleton's `h-*`/`min-h-*` to the loaded height when it is a spacing step.

**75 scroll shadows** (raster half). Pair `scrolled`: for each candidate scroll container, a CDP clip of its bottom
12px band at `scrollTop = 0` and at the end, and of its top band the other way round. Identical bands in both states →
no cue, confidence 0.9; a band that changes (a shadow fades out at the end) → clear the static finding. Headless
only; the `touch` pair is used so scrollbars are overlay and the judgement matches phones and Macs.

**66 spinners** (network half; see probes for the rest). Pair `held` with two delays on the same route: 50ms and
2000ms. With 50ms, a spinner (`[role=status]`, `aria-busy`, `animate-spin`, structure `role: spinner`) that appears
and disappears within 200ms → "flashes on fast loads"; with 2000ms, a spinner visible for < 400ms before the content
lands → "held too short". Tier 3, facet `motion`. Noise: only responses the probe held are judged; a page that fetches
nothing says nothing. Fix: advice naming `spin-delay` (`delay: 200, minDuration: 500`) or the equivalent two timers.

### probes (layer 5)

**68 exits faster than entrances.** On a toggled surface (menu, popover, dialog, tooltip, accordion from structure or
`[data-state]`): open it, read `getAnimations()` on the new subtree → entrance duration from `getComputedTiming()`;
close (Escape or the trigger) → exit duration the same way. Ratio exit/enter > 0.9 → flag. Static fallback (live): both
`data-[state=open]:` and `data-[state=closed]:` utilities with one `duration-*`, confidence 0.8; the probe raises it to
0.92. Tier 3, facet `motion`. Noise: the frame tolerance; animations under 80ms are instant and skipped. Fix: class
edit adding `data-[state=closed]:duration-<step>` at the theme's motion token nearest 0.7× the entrance (`theme.scale('motion')`
exists); advice when no step is under 0.8×.

**31 press feedback within 100ms.** Static (live+headless): the CSSOM has a rule with `:active` whose selector, with
`:active` removed, matches the control (Tailwind `active:` compiles to `.active\:scale-95:active`); or the fiber's
`onPointerDown` sets a pressed state (structure: a handler exists). None → flag. Probe: `press(el)`, sample computed
`transform`, `backgroundColor`, `opacity`, `boxShadow`, `color`, `filter` at 0, 50, 100ms after `mouse.down`; no
change by 100ms → confirmed; a change whose transition has `delay > 0` or `duration > 250ms` on the active property →
"feedback starts late". Tier 3, facet `motion`. Noise: links (navigate) and submit buttons are only read statically;
disabled controls skip; toggles whose `aria-pressed` changes count as feedback. Fix: class edit adding the app's own
press idiom from `census('active')` (`active:scale-[.97]`, `active:brightness-95`, `active:bg-…`), so the engine never
imports a style the app does not use.

**61 menus open on pointerdown.** Trigger from structure (`role: menu` trigger) or `[aria-haspopup="menu"]`. Probe:
`mouse.down` without `up`, wait 150ms: is a `[role=menu]`/`[data-state=open]` visible? No → opens on click. Known
libraries that open on pointerdown (Radix DropdownMenu, Base UI Menu) are quiet by structure without a probe; Headless
UI's Menu (click) will flag. Tier 3, facet `interaction`. Noise: `aria-haspopup="dialog"`/`listbox` are not menus;
touch is not probed (pointerdown-open is a mouse idiom). Press-drag-release selection is reported as a sentence in the
advice, not measured (what "selected" did cannot be known in general). Fix: advice per library.

**60 tooltip warm-up and cool-down.** Candidates: structure `tooltip-provider` props (`delayDuration`,
`skipDelayDuration`, Base UI `delay`/`closeDelay`), else probe: hover trigger A; `t1` = time to a `[role=tooltip]`
appearing; move to neighbour B, `t2`; leave for 100ms, return to B, `t3`. Flag `t1 < 200` (flickers on pass-over),
`t1 > 1000` (waits), `t2 > 150` (no skip-delay), `t3 > 150` (cool-down too short). Tier 3, facet `motion`. Noise:
±1 frame; tooltips that open on focus only skip; a provider's props, when present, settle the finding without a probe.
Fix: `prop` edit `delayDuration={500} skipDelayDuration={300}` on the provider; advice for custom tooltips.

**62 don't animate frequent keyboard actions.** Structure finds the shortcut (`keydown` effects testing `metaKey &&
key === 'k'`, `cmdk`), else the probe tries the common palette keys (⌘K, ⌘/, `/`, `?`) in order. When a surface
appears (`[cmdk-root]`, `[role=dialog]`), `getAnimations()` on it: any entrance ≥ 100ms → flag "the palette animates
in". Tier 3, facet `motion`. Noise: surfaces opened by pointer in the same run are not judged by this rule; a fade ≤
80ms is tolerated. Fix: class edit removing `animate-in …` utilities on that surface (a `class` suggestion whose `to` is
the class list without them); advice for Motion variants.

**64 interruptible motion.** Toggled surface: open; at 40% of the entrance duration (known from `getComputedTiming`)
send the close; sample `transform`/`opacity` each rAF. A jump between consecutive frames (opacity Δ > 0.15, scale Δ >
0.1) at the reversal → the exit restarted from its first keyframe. Static fallback: both states use `animation`
(keyframes) rather than `transition` → 0.8; probe → 0.9. Tier 3, facet `motion`. Noise: frame tolerance; surfaces
whose exit is `display: none` with no animation are instant and fine. Fix: advice (transition-driven state classes, or
Motion `animate` on state) — no class edit, the change is structural.

**59 safe triangle for submenus.** Structure: `submenu` role from Radix/Base UI → quiet (they ship safe polygons);
custom nested menus (`[role=menu] [aria-haspopup=menu]`) → probe: hover the item until its submenu opens, then
`path()` from the item's centre diagonally to the submenu's far corner across the next item in 10 steps over 250ms;
submenu gone before arrival → flag. Tier 1 legibility (people lose the menu), facet `interaction`. Noise: submenus that
open on click only (no hover-open) skip; the path crosses at least one sibling item or it is not a test. Fix: advice
(library sub-menu, or a pointer polygon with a 300ms grace).

**65 rubber-band at limits.** Structure: Vaul (`data-vaul-drawer`) and Motion `drag` with `dragElastic` → quiet;
custom draggables (`touch-action: none` + pointer handlers) → probe, headless, `--probe drag` only (drags can close
things): `drag()` 80px past the open limit, sample `transform`: displacement 0 → dead stop; 10–60px → rubber-band;
~80px → unbounded. Release at speed: no movement after `mouse.up` → no flick. Tier **advisory**, facet `motion`.
Fix: advice (Vaul; Motion `dragElastic`; or `x = limit + overdrag × 0.3`).

**66 spinners** (timing half). On a press that triggers a held response: the spinner's first paint minus the press
`< 150ms` → "no delay" (it would flash on fast loads); together with the network half above, one rule
`craft/spinner-timing`.

### structure (layer 6)

**71 `touch-action: manipulation` and tap highlight.** Custom controls: non-native elements with a `click`/`pointer`
handler (fiber props live, CDP `DOMDebugger.getEventListeners` headless, structure `handlers` server-side) or
`role=button`. Computed `-webkit-tap-highlight-color` not transparent → flag (the grey flash is real on Android and
iOS WebKit). `touch-action: auto` matters only when the page has no `<meta name=viewport content="width=device-width">`
(browsers dropped the 300ms delay with it): then one page finding says to add the meta. Draggable custom elements
(pointermove handlers) without `touch-action: none/pan-*` → flag (the page scrolls under the drag). Tier 0 access
(touch users), facet `interaction`. Noise: native `button`/`a`/`input` have the browser's behaviour; one finding per
component (once: group by site). Fix: class edit `touch-manipulation` (`touch-none` for draggables) and
`[-webkit-tap-highlight-color:transparent]` on the root, once.

Structure also upgrades earlier rules from advice to edits: 50 (`strokeWidth`), 60 (`delayDuration`), 62 (which
surface is the palette), 66 (which render is the spinner), 77 (which component is the skeleton), 59/61/65 (which
libraries are already right, so no probe is spent on them).

### judge (layer 7)

Rules marked `judge: true`: 2 (1.0–1.4px corrections), 3, 21/52 (the tint's amount), 25 (`#fff`), 40, 44, 56 (noise).
The judge never creates a finding a rule did not measure; it only decides the grey band, and only to advisory.

## Where each rule runs

| Where | Rules |
|---|---|
| live overlay and headless (still facts, metrics, ink of inline SVG, census of what is read) | 48 40 49 21/52 56 25 33 · 6 4 5 · 12 17 22 50 · 2 3 · 75 (static) · 31 (static) · 68 (static) · 64 (static) · 71 (fiber handlers) · 54 (when the page is dark) |
| headless only (pairs, probes, CDP) | 44 54 77 66 75 (raster) · 31 61 60 62 64 59 65 68 (probe halves) |
| server (habits + structure) | 49 (CSS half) · 71 (handlers) · 50 60 (prop edits) · the library table for 59 60 61 62 65 66 77 |
| opt-in judge | the grey bands of 2 3 21 25 40 44 56 |

## Proof: through the real boundary only

No unit tests. Every layer is proved as craft.test.mjs and craft-run.test.mjs do: a Vite dev server with the plugin
on a fixture copied from overlay/demo, real Chromium, and either blueprint on (the mark's aria-label names the rule, the
panel row, the chooser's words, the source after Write) or the real CLI binary (`node dist/cli.js craft --url … --json`,
the finding's rule and line, the exit code). Each test has the breaking element, a correct element beside it that must
stay quiet, and the noise assertion that the well-built page and the demo gain no finding. Headless-only rules are
proved only through `plumber craft`. Pairs and probes get a fixture App that *does* the thing: a Radix tooltip with the
wrong delay beside a right one; a Headless UI menu beside a Radix one; a card list behind a `fetch` the test server
answers after a delay, with a skeleton two lines short beside one that matches.

## Layers, in order (one primitive per layer; the next starts when the last is proved)

0. **Noise decisions, no primitive.** `TIER.advisory`, `soft` marks, `note` severity in the CLI, finding-level `tier`;
   the new facets. Rules 48, 40, 49 (browser half), 21/52, 56, 25, 33. Proof: e2e/craft-wave4.test.mjs, one test per
   rule plus noise; `plumber craft` exit 0 on a page with only advisory findings.
1. **metrics.** `facts.metrics(el)` with the font-loaded guard; rule 6, then 4, then 5 (each its own small layer with
   its own fixture: two columns at two sizes; an icon row; a padded label). Proof: the mark on the misaligned row, none
   on the `items-baseline` row; Write of `items-baseline` leaves no mark on reload.
2. **census.** `facts.census(name)` computed before rules, `once: 'page'` findings with members as places, the CLI
   merging censuses across `--routes`. Rule 12, then 17, 22, 50 (50 waits for ink). Proof: a page with five section
   gaps on two steps and one off; the finding lists the one place; a page with four greys names the fourth.
3. **ink.** `facts.ink(el)` for inline SVG with idle-time preparation and element invalidation on arrival; the headless
   CDP clip path. Rule 2, then 3, then 50, then the static half of 75. Proof: a play button beside a square icon
   button: one mark, `translate-x-px` offered; after Write, quiet.
4. **pairs.** `craftRun` loads with motion on (fixing the `reduce` default), opens pair pages, keys by site, hands
   records in. Rule 54, then 44, 77, 75 (raster), 66 (network). Proof: `plumber craft` on a fixture whose dark scheme
   keeps grey shadows; a skeleton two lines short, with the test server delaying its response.
5. **probes.** The recorder and the gesture catalogue, the safety rules, `--probe-budget`, `--no-probe`. Rule 68 first
   (pure `getAnimations`, the least noisy), then 31, 61, 60, 62, 64, 59, 65. Proof: `plumber craft` on fixtures that
   do the thing; the run never navigates and never submits (a form in the fixture with a counter the test asserts at 0).
6. **structure.** The server's component index and library table, `facts.source(el)` riding on the element's reading,
   the `prop` suggestion kind and its write endpoint. Rule 71, then the upgrades of 50, 60, 62, 66, 77, and the quiet
   paths for 59, 61, 65. Proof: the Tooltip.Provider fixture, Write → `delayDuration={500}` in source, no mark on reload.
7. **judge.** `--judge`, the crop, the cache under `.plumber/judge`, the advisory lift. Proof: with no cache and no flag
   the run is byte-identical to layer 6; with a seeded cache file the advisory finding appears at `note`.

## In short

**Why they were hard:** the engine knows one kind of fact: a still, computed reading of one element in one state.
**What changes:** five more fact kinds as shared primitives (metrics, ink, census, pairs, probes) plus structure from
the server and an opt-in cached judge; an advisory tier and finding-level tiers so a judgement rule can be honest;
the principle that taste is judged against the app's own majority, not a universal number.
**Which rules each unlocks:** none needed: 48 40 49 21/52 56 25 33 · metrics: 6 4 5 · census: 12 17 22 50 · ink: 2 3
50 75 · pairs: 54 44 77 75 66 · probes: 68 31 61 60 62 64 59 65 66 · structure: 71 and the prop edits · judge: the
grey bands.
**First layer:** layer 0: `TIER.advisory`, soft marks, finding-level tier, the new facets, and the seven rules that
needed only a decision about noise, proved by one e2e fixture per rule and an exit-0 run on an advisory-only page.
