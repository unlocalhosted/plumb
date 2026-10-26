# Craft rules: what a great mentor would teach you

The habits that separate a UI that feels right from one that is merely correct. Most developers never hear them,
because they are learned at a senior designer's shoulder. Each rule says what to do, why, and how React Plumber can
check it on the rendered page.

**Detect:** ✓ measurable on the rendered page or in source · ~ partly (a heuristic) · ✗ taste, taught, not checked.
Rules React Plumber already enforces are marked *(rule today)*.

Status: catalogue, 2026-10-27. The order of what gets built is at the end.

---

## 1. Alignment and balance

| # | Rule | Why | Detect | How |
|---|---|---|---|---|
| 1 | **Align content, not boxes.** Text and icons in a column share one left edge; a highlighted row bleeds out by its padding (`-mx-3 px-3`) so its background escapes the column and its text stays on the line. | The eye follows letters, not invisible boxes. A padded row sitting flush pushes its words in by its padding. | ✓ | Per container, each child's *content edge* (first text or icon rect); the shared edge is the guide; flag a child whose box aligns but content doesn't, or content a few px off. Fix: the bleed pair. |
| 2 | **Optical centre beats geometric centre.** A play triangle, an arrow or a chevron centred by its box looks off; nudge it toward its heavy side (a play icon ~1–2px right). | Visual mass, not bounding box, is what the eye centres. | ~ | Rasterise the icon, compare its mass centroid with its box centre inside a centred container. |
| 3 | **Optical overshoot.** Round shapes must be a touch larger than square ones to look the same size. | A circle covers less of its box than a square. | ~ | Icons of one set side by side: compare filled area, not box size. |
| 4 | **Centre icons on cap height, not the line box.** | Line boxes include room for descenders, so line-box centring sits icons low. | ✓ | Icon centre vs the adjacent text's cap-height middle (font metrics). |
| 5 | **Trim text's leading.** Padding of 16 around text looks like 20+ at the top; use `text-box-trim` or compensate. | A text box carries invisible half-leading above and below the letters. | ✓ | Padding next to a text-only child vs its half-leading. |
| 6 | **Baseline alignment across columns.** Label and value side by side share a baseline, not a top edge, at different sizes most of all. | Tops of different sizes don't line up visually; baselines do. | ✓ | Siblings in a row with text: compare baselines. |

## 2. Spacing and rhythm

| # | Rule | Why | Detect | How |
|---|---|---|---|---|
| 7 | **Inner spacing ≤ outer spacing.** The gap inside a group is smaller than the gap between groups. | Proximity is how people read grouping. | ✓ | Nested containers: child gap vs parent gap. |
| 8 | **Nested radius = outer radius − padding**, at every level, never below 0. | Otherwise the curves aren't concentric and the corner looks pinched or bulged. | ✓ | Rounded child inside rounded parent: R − p vs r. |
| 9 | **Equal padding isn't equal.** Text buttons want ~2:1 horizontal to vertical; icon buttons want equal. | Words are wide and short; a square box around them looks cramped. | ✓ | Button padding ratio by content. |
| 10 | **The icon side gets less padding.** A button with a leading icon takes 2–4px off that side. | An icon's whitespace is built into its glyph box. | ✓ | Button with icon child: compare side paddings. |
| 11 | **Use few spacing values.** 4, 8, 16, 24 reads intentional; 4, 5, 7, 10, 13 reads noisy. | Repetition is what makes spacing feel designed. | ✓ | *(rule today: spacing family)* |
| 12 | **Vertical rhythm.** Stacked sections space from a few repeated steps, consistently down the page. | Rhythm lets the eye predict and rest. | ✓ | Section gaps down the page: distinct values and their order. |

## 3. Typography

| # | Rule | Why | Detect | How |
|---|---|---|---|---|
| 13 | **45–75 characters per line** for reading text. | Longer lines lose the return sweep; shorter ones chop the thought. | ✓ | Paragraph width ÷ average glyph width. |
| 14 | **Line height shrinks as size grows.** Body ~1.5, headings ~1.1–1.25. | Big text with loose leading looks like separate lines. | ✓ | line-height ÷ font-size by size. |
| 15 | **Tighten tracking on large text, loosen it on small caps and labels.** Headings −0.01 to −0.03em; uppercase labels +0.04 to +0.08em. | Large letters look loose; small capitals look cramped. | ✓ | letter-spacing by size and text-transform. |
| 16 | **Tabular numbers for numbers that change or line up.** | Proportional digits jitter in counters and misalign in tables. | ✓ | Numeric text in tables, counters, timers without `tabular-nums`. |
| 17 | **2–3 weights, 2–3 text colours.** Hierarchy from contrast between few levels, not many levels. | Every extra level weakens the others. | ~ | Distinct weights and text colours in view. |
| 18 | **No widows in headings.** Balance lines with `text-wrap: balance`. | One word alone on the last line looks broken. | ✓ | Headings whose last line is one word. |
| 19 | **Real quotes, apostrophes, dashes, ellipses.** ’ “ ” – … | Straight quotes and three dots read as unfinished. | ✓ | Source strings. |
| 43 | **Fallback-font metric overrides.** `size-adjust`, `ascent-override` on the fallback `@font-face`. | The font swap then moves nothing: zero layout shift. | ✓ | Web fonts without metric-matched fallbacks. |
| 44 | **Light text on dark looks bolder.** Drop variable-font weight ~25–50 or add tracking in dark mode; antialiased smoothing for light-on-dark only. | Irradiation: light glows into dark. | ~ | Same text style in both schemes. |
| 45 | **Hanging punctuation.** Opening quotes and bullets hang outside the text edge. | So letters, not marks, align with the column (optical alignment for prose). | ✓ | Blockquotes and lists: first glyph vs column edge. |
| 46 | **`case` feature for all-caps.** | Hyphens, parentheses and @ sit too low among capitals. | ✓ | Uppercase text without it. |
| 47 | **Tracking in `em`, never `px`.** | So it scales with size. | ✓ | letter-spacing units in source. |
| 48 | **`text-wrap: pretty` for paragraphs, `balance` for headings.** | Different jobs: avoid orphans vs even lines. | ✓ | By element role. |
| 49 | **Optical sizing on.** `font-optical-sizing: auto` with an `opsz` axis. | Small text gets sturdier shapes, large text finer ones. | ✓ | Variable fonts with opsz and it off. |
| 50 | **Icon stroke follows text weight,** and thins in proportion as the icon grows. | Icons beside bold text look faint; big icons with small-icon strokes look heavy. | ~ | Icon stroke-width vs adjacent font-weight and icon size. |

## 4. Colour and light

| # | Rule | Why | Detect | How |
|---|---|---|---|---|
| 20 | **One light source.** All shadows fall the same way, usually down. | Mixed offsets look like a collage. | ✓ | Shadow offsets' directions in view. |
| 21 | **Shadows are tinted, not grey.** | A black shadow on a coloured ground looks dirty. | ~ | Shadow colour vs the ground's hue. |
| 22 | **An elevation ladder.** Higher means bigger and softer, in even steps. | Inconsistent steps break the sense of depth. | ✓ | Shadow sizes vs a ladder. |
| 23 | **Translucent borders on elevated surfaces.** | A solid grey border fights the shadow. | ✓ | Opaque border + shadow on the same element. |
| 24 | **Perceptual contrast (APCA) for small text.** | WCAG 2 ratios mislead, most of all on dark themes. | ✓ | APCA Lc by size and weight. |
| 25 | **No pure black or white for large areas.** | Harsh; tinted neutrals read better. | ~ | Large surfaces at #000 / #fff. |
| 26 | **Disabled isn't just lower opacity.** | 40% text on a coloured button fails contrast and looks broken. | ✓ | Disabled controls' contrast. |
| 51 | **Layered shadows** (Josh W. Comeau's shadows work): 3–5 stacked shadows, blur and offset growing, opacity falling. | One big blur is a smudge; layers read as ambient plus direct light. | ✓ | Single-layer large shadows. |
| 52 | **Colour-matched shadows.** Tint with the surface hue, lower lightness, raise saturation. | Grey shadows muddy colour. | ~ | Shadow vs ground hue. |
| 53 | **Offset scales with elevation,** y-offset and blur together, one ratio across the ladder. | A constant ratio is what makes a ladder feel physical. | ✓ | offset ÷ blur across shadows. |
| 54 | **Dark mode elevates with light, not shadow.** Lighter raised surfaces, plus a 1px inset top highlight at low alpha. | Shadows barely show on dark. | ✓ | Dark scheme: elevation by shadow only. |
| 55 | **Interpolate gradients in OKLCH/OKLab.** `linear-gradient(in oklch, …)`. | sRGB interpolation goes grey between saturated colours. | ✓ | Gradients between saturated stops in sRGB. |
| 56 | **Eased gradients for scrims;** noise on large dark gradients. | Linear fades show a hard edge; dark gradients band. | ~ | Two-stop black-to-transparent overlays. |
| 57 | **`color-mix` instead of `opacity` for text colour.** | Opacity varies with the ground and composites a layer. | ✓ | Text with opacity < 1. |
| 58 | **Set `color-scheme`** (and `accent-color`). | Otherwise scrollbars, controls and autofill stay light in a dark UI. | ✓ | Dark theme without it. |

## 5. Rendering and pixels

| # | Rule | Why | Detect | How |
|---|---|---|---|---|
| 37 | **Never land on half pixels.** | Fractional transforms blur text and 1px lines. | ✓ | Element rects and transforms at fractional device pixels. |
| 38 | **Hairlines are 0.5px on retina.** | A 1px grey line is twice as heavy as meant on 2× screens. | ✓ | 1px dividers at DPR ≥ 2. |
| 39 | **Images get an inner outline** (1px inset, ~6–10%). | Stops light images bleeding into light pages, dark into dark. | ✓ | img / avatar without one, by luminance at its edge. |
| 40 | **Continuous corners (squircles).** | Curvature that eases in feels softer at the same radius. | ~ | Large radii on large surfaces; `corner-shape` where supported. |
| 41 | **Concentric corners at every nesting level.** | (see 8) | ✓ | Walk the nesting. |
| 42 | **Bold on hover must not shift layout.** Reserve the bold width (a hidden bold copy in `::after`). | Weight changes width; the row jumps. | ✓ | Hover styles that change font-weight. |

## 6. Interaction feel

| # | Rule | Why | Detect | How |
|---|---|---|---|---|
| 27 | **Hit targets ≥ 24px (44 on touch),** even when the visual is smaller. | Small targets miss. | ✓ | Interactive element rects. |
| 28 | **Hover only where hover exists** (`@media (hover: hover)`). | Hover sticks on touch. | ✓ | *(rule today: hover-gate)* |
| 29 | **A focus ring with an offset;** never `outline: none` without a replacement. | Keyboard users get lost. | ✓ | *(rule today: focus-outline)* |
| 30 | **Ease-out to enter, ease-in to leave, never ease-in for input responses;** 100–300ms. | Ease-in on a response feels sluggish. | ✓ | *(partly rule today: no-ease-in)* |
| 31 | **Press feedback within 100ms** (scale ~0.97 or darken). | Without it a press feels missed. | ✓ | `:active` styles on controls. |
| 32 | **Animate transform and opacity, not layout.** | Width/top animations re-lay out every frame. | ✓ | Transitions on layout properties. |
| 59 | **Safe triangle for submenus.** Keep a submenu open while the pointer travels diagonally toward it. | Otherwise crossing the next item closes it. | ✓ | Nested menus without it (behavioural check). |
| 60 | **Tooltip warm-up and cool-down.** First waits ~500ms; neighbours then open instantly until the pointer is away ~300ms. | Exploring a toolbar shouldn't wait each time. | ✓ | Tooltip delays. |
| 61 | **Menus open on pointerdown, with press-drag-release selection.** | Click-to-open feels slow. | ✓ | Menu triggers on click. |
| 62 | **Don't animate frequent keyboard actions** (Emil Kowalski). | A command palette opened 50 times a day should be instant. | ~ | Keyboard-triggered surfaces with entrance animations. |
| 63 | **Never scale from 0;** start at 0.9–0.97 with opacity, `transform-origin` at the trigger. | From 0 it appears from nowhere; from the trigger it grows out of the button. | ✓ | Keyframes and transitions from scale(0); origin vs trigger. |
| 64 | **Interruptible motion.** Transitions or springs that keep velocity when reversed. | A restarting keyframe on reverse feels broken. | ✓ | Keyframe animations on toggled UI. |
| 65 | **Rubber-band at limits;** keep flick velocity (Vaul-style drawers). | A dead stop feels like a wall. | ~ | Draggable surfaces without resistance. |
| 66 | **Spinners: delay ~150–300ms, then hold ≥ ~500ms.** | Fast loads shouldn't flash a spinner. | ✓ | Loading states without both. |
| 67 | **Reduced motion means a fade, not nothing.** | The state change must still be seen. | ✓ | `prefers-reduced-motion` that removes all feedback. |
| 68 | **Exits faster than entrances** (~70% of the duration). | The user has already moved on. | ✓ | Enter vs exit durations. |

## 7. Layout and platform

| # | Rule | Why | Detect | How |
|---|---|---|---|---|
| 33 | **Content-driven sizes.** Buttons hug, columns fill, fixed widths only where things must align. | Fixed sizes break with real content and translations. | ✓ | The Fill/Hug/fixed readout. |
| 34 | **One avatar and icon size per list.** | 32 next to 36 looks like a mistake. | ✓ | Sibling repeats with differing media sizes. |
| 35 | **Truncate with intent:** `min-width: 0`, ellipsis, the full value on hover. | Overflowing names break layouts or hide silently. | ✓ | Overflowing text without the trio. |
| 36 | **`scrollbar-gutter: stable`.** | Layout shouldn't jump when a scrollbar appears. | ✓ | Scroll containers whose width changes. |
| 69 | **`100dvh`, not `100vh`, on mobile;** `env(safe-area-inset-*)` for notches. | `vh` hides content under browser bars. | ✓ | Source. |
| 70 | **Inputs ≥ 16px on iOS.** | Safari zooms the page on focus otherwise. | ✓ | Input font sizes. |
| 71 | **`touch-action: manipulation`** and transparent tap highlights on custom buttons. | Removes the double-tap delay and grey flashes. | ✓ | Custom interactive elements. |
| 72 | **`overscroll-behavior: contain` on modals and panels.** | Scrolling to their end shouldn't scroll the page behind. | ✓ | Scrollable overlays. |
| 73 | **`scroll-margin-top` on anchor targets.** | A sticky header covers the heading you jumped to. | ✓ | Anchor targets under a sticky header. |
| 74 | **`isolation: isolate` instead of z-index wars.** | Components get their own stacking context. | ✓ | z-index values escalating. |
| 75 | **Scroll shadows** where content is hidden (Lea Verou's `background-attachment: local` trick). | Shows there's more without a scrollbar. | ✓ | Scroll containers without an edge cue. |
| 76 | **Truncate in the middle for paths and IDs.** | The ends carry the meaning. | ✓ | Path-like strings truncated at the end. |
| 77 | **Skeletons match the final layout exactly.** | Nothing jumps when content lands. | ✓ | Skeleton vs loaded rects. |

---

## How these join React Plumber
Each ✓ rule becomes a **craft rule** read on the rendered page (the reader already measures every element in view),
drawn in the visual language (docs/briefs/visual-language.md): pattern and colour at rest, one value when pointed at,
and, where there's a fix, a drag that snaps to the right answer. In blueprint they group by cause like drift does.

**First wave** (high value, cheap to measure): 1 content alignment, 8/41 concentric corners, 7 inner ≤ outer spacing,
37 half pixels, 38 hairlines, 39 image outlines, 42 bold-on-hover shift, 51/53 shadows, 57 opacity text, 63 scale-from-0,
74 z-index wars.
