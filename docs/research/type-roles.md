# Type roles for crafting-ui: what the code is reaching for, and the system that names it

Layer 1: data and a design (2026-10-31). No engine code. The only code is the measurement in
`bench/type-roles/` (`measure.mjs`, `analyze.mjs`, `roles.mjs`); every number below is traced to it in the appendix.

## 1. What was measured

Real Chromium (Playwright, 1280×900, reduced motion) over crafting-ui's live dev server (:5180), 40 routes: the
router's 18 paths plus every internal link found on the way (`/motion/entries/*`, `/motion/principles/*`,
`/motion/techniques/*`, `/motion/moments/*`, `/patterns/swipe-to-dismiss`); 37 rendered, 3 `/motion/moments/*`
pages timed out loading video. On each page every `<details>` was opened, every `[aria-expanded="false"]` control
clicked (up to 40), and the page scrolled through so sections that mount on view did.

For every element with its own text (a direct text node with a letter or digit), visible: computed font-size,
line-height, letter-spacing, weight, text-transform, colour, family; tag, ARIA role, landmark ancestors (header,
footer, nav, main, aside, article, section, li, button, a, dt/dd, figure…), nearest card/list item; the text, its
length and shape (sentence, phrase, number, all caps); its size relative to its siblings' median and its parent; its
class bundle; its source place (`data-plumb-source`, the element's own stamp or its nearest stamped ancestor).

**8733 text elements, all stamped, on 37 routes → 686 places** (deduped by source stamp) in 78 files. 194 distinct
value bundles (size | line-height ratio | letter-spacing em | weight | transform). **61 distinct font sizes** on the
page; the in-system places alone use 28: 10, 10.5, 11, 11.5, 12, 13, 14, 14.4, 15, 16, 17, 18, 19, 20, 21, 22, 24, 28,
30, 31.2, 32, 33, 38.4, 39.68, 40, 42.24, 43.52, 46.08 px. Families: Geist 327 places, Geist Mono 320, then the demo
pages' Source Sans 3 (21), Nunito (8), Caveat, Helvetica Neue, system-ui, Iowan Old Style.

## 2. The roles the code is reaching for

Clustered on the bundle *and* its context (tag, landmark, content shape, repeats), not on size alone. Nine roles
fall out; the owner expected 5–8, and one of the nine (body-medium) is the merge decision in §3.

| Role (M3 name) | Places | Elements | Files | What its members are | Members' bundles (most common first) |
| --- | --- | --- | --- | --- | --- |
| **display-large** | 25 | 84 | 16 | Page `<h1>` in `<header>` (12), the home hero's `<h1>`/spans/buttons (Hero.tsx 91–197), two `<h2>` in headers | `text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] font-medium` ×7 (46.08 px at 1280), `clamp(2rem,3.4vw,2.75rem)/1.05` ×7 (43.52), `clamp(1.5rem,3.3vw,2.875rem)/1.12` ×5 (42.24, Hero), 39.68/1.42 ×4 (MultiplaneBuilder); weight 500 ×23; tracking -0.025em ×14 |
| **headline-small** | 21 | 187 | 17 | Section `<h2>` (8) and `<h3>` in lists, the "Lessons / Principles / Register" headings | `text-[1.5rem] font-medium tracking-[-0.02em]` ×9 (24/1.5), 22/1.5 ×7, one-offs 28, 31.2, 32, 33 px |
| **title-large** | 50 | 398 | 22 | The lead paragraph under a page title (`p in header` ×16), intro paragraphs in sections (10), a few `h2`/`h3` | 17/1.6/400 ×16, `text-[1.1875rem] leading-[1.5]` 19 px ×15, 20 px ×12, `text-[1.3125rem] leading-[1.45] tracking-[-0.01em]` 21 px ×6 |
| **title-medium** | 29 | 446 | 15 | Card and list titles (`span in a` ×6: "Saar Oz", "Multiplane occlusion"), section `<h2>` ×10 | `text-[1.0625rem] font-semibold leading-snug` 17/1.375/600 ×12-ish, 17/1.5/600 ×13, `text-[1.125rem] font-semibold tracking-[-0.012em]` 18 px ×11; weight 600 ×18, 500 ×11 |
| **body-large** | 67 | 1010 | 15 | Prose: `p in section` ×38, `type-body` paragraphs and `<dd>` definitions (16/1.65/-0.004 ×30 carry the one existing role class, `type-body`) | 16/1.65 ×31, 16/1.5 ×14, 16/1.375 ×12, 16/1.55 ×5 |
| **body-medium** | 54 | 607 | 19 | The list body: `span in li` and `p in li` (26 of 54 in a list item), card descriptions ("A thing arriving at its place…") | `font-read text-[0.9375rem] leading-snug text-muted` 15/1.375 ×20, 15/1.625 (`leading-relaxed`) ×15, 15/1.5 ×14, 15/1.55 ×4 |
| **body-small** | 40 | 938 | 17 | Small readouts and notes in Geist Mono (`measure text-[13px]`): "000", "9 f per word + 30 f", small `<p>` captions at 14 px | 13/1.5/0 ×22, 14/1.5 ×17 (`text-sm`, `text-[0.875rem]`) |
| **label-medium** | 178 | 2350 | 25 | The caps label: `span in section/header/li/aside`, `<dt>` ×11, figcaptions, nav items. `label` class ×28 (12/1.3/0.08em), the rest hand-written | 12/1.5/0.08em/400/uppercase ×86, 12/1.3/0.08 ×28 (`label`), 12/1.5/0.1 ×20, 12/1.5/0/none ×13 (mono numbers), 13/1.5/0.1 ×10 |
| **label-small** | 86 | 1581 | 28 | The same caps label one step down: toolbar words ("Play", "Frame", "Copy"), list numbers ("01", "16"), `<kbd>` | 11/1.5/0.1/uppercase ×22, 11/1.5/0.08 ×18, 11/1.5/0/none ×12 (mono numbers), 10 px ×11, 10.5 ×6 |

**The unnamed caps-label style is the biggest fact in the data.** 217 in-system places are `uppercase`; 205 of them
carry letter-spacing ≥ 0.06em; `tracking-[0.1em]` appears at 41 places, 41 of them `uppercase`, 40 with `measure`,
at 10–13 px. Two roles (label-medium, label-small) cover 264 places, 48 % of the system, written today as
`measure text-[12px] tracking-[0.1em] uppercase`, `text-[11px] tracking-[0.08em] uppercase`, `label`, or a
`text-fg`/`text-draw` colour with the size in a parent.

Contexts per role are in `roles.mjs`'s output (appendix §A3): display is `h1 in header`; title-large is `p in
header`/`p in section`; title-medium is `h2 in section` and `span in a`; body-medium is `span in li`/`p in li`;
labels are `span in section/header/li/aside`, `dt in li`, `span in button`.

## 3. The proposed scale

Bundles chosen from the members' own values: the most common value of each property unless the cluster plainly
centres elsewhere (said where).

| Role | font-size | line-height | letter-spacing | weight | Why these |
| --- | --- | --- | --- | --- | --- |
| display-large | `clamp(2rem, 3.6vw, 3rem)` (≈44 px at 1280) | 1.05 | -0.025em | 500 | the two page-title clamps (×7 and ×7, 6 % apart at 1280) merge into the larger; 1.04/1.05 ×14; -0.025em ×14; 500 ×23 |
| headline-small | 24 px (1.5rem) | 1.5 | -0.02em | 500 | 24 ×9 most common (22 ×7 is one step too close to title-large and merges up); 1.5 ×9; -0.02 ×10; 500 ×20 |
| title-large | 19 px (1.1875rem) | 1.5 | -0.01em | 400 | members at 17 (×16), 19 (×15), 20 (×12), 21 (×6): the cluster centres on 19; 1.5 ×23; tracking 0 ×32 vs -0.01/-0.012 ×16 — chosen -0.01em because every member above 18 px has it and the ladder's larger steps all tighten |
| title-medium | 17 px (1.0625rem) | 1.5 | -0.01em | 600 | 17 ×18 vs 18 ×11; 1.5 ×13 vs 1.375 ×12 (near tie: 1.5 keeps the ladder's body rhythm); -0.01 ×14; 600 ×18 |
| body-large | 16 px | 1.6 | 0 | 400 | 16 ×67; line-height splits 1.65 (`type-body`, ×31) / 1.5 (×14) / 1.375 (×12): 1.6 sits in the centre and within 1 px of 1.65 at 16 px |
| body-medium | 15 px (0.9375rem) | 1.4 | 0 | 400 | 15 ×54, 26 in list items; line-heights 1.375 ×20 / 1.625 ×15 / 1.5 ×14 split in two; 1.4 serves the list body, see the merge note |
| body-small | 14 px (0.875rem) | 1.5 | 0 | 400 | 14 ×17 and 13 ×22 (mono readouts): 14 chosen as the existing `--text-sm`; the 13 px readouts move +1 px (22 places) — or keep 13 as a mono readout role (Q3) |
| label-medium | 12 px | 1.5 | 0.08em | 400 | 12 ×163; 1.5 ×146 (the `label` class's 1.3 ×24 moves +2.4 px); 0.08em ×111 vs 0.1em ×33 |
| label-small | 11 px | 1.5 | 0.08em | 400 | 11 ×69, 10/10.5 ×17 move up (nothing under 12 px is the theme's own rule; 11 is already below it: Q4); 0.08 ×26 vs 0.1 ×24 near tie, kept equal to label-medium so the two labels differ by size alone |

**The ladder**: 11 → 12 (×1.09) → 14 (×1.17) → 15 (×1.07) → 16 (×1.07) → 17 (×1.06) → 19 (×1.12) → 24 (×1.26) →
44 (×1.83). The 14–15–16–17 run is too dense to be a design: four sizes within 3 px. That is where the code's own
usage disagrees with a scale, and where the owner decides:

- **Merge body-medium into body-large** (variant A, eight roles): 54 places move +1 px and their line-heights move
  to 1.6 (the list body gets looser). Ladder 11, 12, 14, 16, 17, 19, 24, 44.
- **Merge title-medium's size into body-large's 16 or title-large's 19**: title-medium is semibold, so it differs
  by weight already; at 17 px it is 1 px from body. Making it 16/600 would drop a size (ladder 11, 12, 14, 16, 19, 24,
  44: seven sizes) at the cost of 29 places moving -1 px (18 of them) or -2 px (11).
- 22 px headings (×7) merging into headline-small 24: +2 px at 7 places; or into title-large 19: -3 px.

## 4. The map and its cost (variant B, nine roles)

Every place's role, bundle, and movement is in `bench/type-roles/measurements.roles.json` (one row per place with
`dSize`, `dLh` (px), `dLs` (px), `dWeight`, `removed`). Summary over the 550 in-system places:

| Property | moves 0 | ≤ 1 px | ≤ 2 px | more |
| --- | --- | --- | --- | --- |
| font-size | 412 | 86 | 34 | 18 |
| line-height (px) | 312 | 77 | 50 | 111 |
| letter-spacing (px) | 314 | 230 (≤ 0.5 px: 179, ≤ 1 px: 51) | — | 6 |
| weight | 506 | 38 (one step) | — | 6 (two steps) |

Variant A (eight roles): font-size 358 / 140 / 34 / 18; line-height 312 / 76 / 50 / 112.

- **Distinct font sizes**: 61 on the page today (28 among in-system places) → 9 role sizes (8 in variant A); the 50
  sizes outside the system (SVG drawing text at 50.3–210 px, demo imitation, `var(--z)`-scaled text) stay as they are.
- **Classes removed**: 845 type classes over 550 places (mean 1.54 per place: `text-[…]`, `leading-…`,
  `tracking-…`, `font-medium|semibold`, `uppercase`), each place replaced by one role class (`uppercase` stays where
  it is a label's caps, see §6 on whether caps belongs to the role).
- **The 18 places that move more than 2 px in size** are all the `clamp()`/poster headings measured at 1280 and
  compared to 44 px: the seven `clamp(2rem,3.6vw,3rem)` titles (46.08 → the same clamp, 0 real movement), the
  `clamp(2rem,3.4vw,2.75rem)` titles (43.52 → 46.08 at 1280, +2.5 px), MultiplaneBuilder's 39.68 px titles ×4 (+4),
  and the one-off section headings at 28, 30, 31.2, 32, 33 px → 24 (−4 to −9 px: `blueprint.tsx:121` "9:41",
  `TechniquesPage.tsx:32`, `StickersPage.tsx:68`, `CraftRulesPage.tsx:16`, `LessonEnding.tsx:57`). Those five are
  worth a person's eye: they may be a tenth role (headline-medium ≈ 30 px) or deliberate one-offs.
- **Line-height is where the system costs most**: 111 places move more than 2 px. Three sources: the `label` class
  (12/1.3 → 1.5: +2.4 px, 24 places), `leading-relaxed` 15 px list bodies (1.625 → 1.4: −3.4 px, 15 places), and
  `leading-snug` 16 px prose (1.375 → 1.6: +3.6 px, 12 places). Each is a real decision the owner should see
  (Q2), not noise.

## 5. Low confidence and outside the system

**Outside (136 places), by rule in `roles.mjs` `outside()`:**
- Drawing text in SVG (`<text>`, `<tspan>`): 48 places, 50.3–210 px, in the motion examples' drawings. Not type
  roles; they scale with the drawing.
- Specimen and demo content under `src/specimen`, `src/motion/harness`, `src/motion/examples`, `src/demos`,
  `src/craft-rules`: 61 places. These pages show other products' type on purpose (specimen chips at 13/1/500,
  demo buttons); judged against crafting-ui's roles they would all be "wrong".
- Brand imitation by family (Source Sans 3 ×4 in-system, Nunito, Caveat, Helvetica Neue, system-ui, -apple-system,
  Iowan Old Style, ui-rounded): 14 places. Handled as the taxonomy doc proposes: a note ("imitates …"), never a
  swap.
- Runtime-scaled drawing text (`text-[length:calc(var(--z)*14px)]` and kin): 9 places. The factor is a scale
  decision (14 px = `--text-sm`, now body-small); the role class cannot carry the `var(--z)` multiplier, so these
  take the taxonomy's inner edit (`calc(var(--z) * var(--text-sm))`), not a role.
- Poster sizes ≥ 60 px outside SVG: 4 places (120 px / 96 px display numerals on the stickers and multiplane pages).

**Low confidence (72 places, `confidence: 'low'`: size moves > 2 px, weight moves two steps, or line-height moves
> 3 px):** the five one-off headings above; `VocabularySheet.tsx:61` and `VocabularyPage.tsx:242` (20 px / 600 →
title-large 400: a semibold lead or a small headline?); `StopNotes.tsx:24,108` spans at 15 px weights 500/600 inside
body prose (emphasis, not a role: keep `font-medium` as a modifier); `Timeline.tsx:212` 10 px/1.8 caption; the
`label`-class `<dt>`s whose 1.3 line-height was chosen for stacked definition lists. The full list is the
`low confidence` block in appendix §A3.

## 6. Engine design: role inference inside plumber's reading

**Signals and where they come from.**

| Signal | Source | Server or DOM |
| --- | --- | --- |
| The place, its file, JSX tag, class bundle, the literal sizes/leading/tracking/weight the classes compile to | the report (`declarations` at the site; Tailwind lowering gives each class's property and value) | server |
| Repeats of a bundle across places and files | the report | server |
| Landmark ancestry in the *source* (the JSX tree: `<header>`, `<li>`, `<dt>`), heading tags | `structure`/the JSX index (`src/structure`) | server |
| Computed values after inheritance and cascade (a size set on a parent, `measure` from a stylesheet), text content and shape, siblings' sizes, what actually rendered | the DOM | DOM only |
| Which places render on this page | stamps (the reader's pool) | DOM |

Role inference is therefore a server decision over source-derived bundles, **confirmed** by the DOM: the server can
cluster `text-[12px] tracking-[0.1em] uppercase` without a browser; the DOM tells it that `Fig. GST-001 · A` inherits
12 px from a parent and is a caps phrase in a `<figcaption>`, and that the cluster centres on 12/1.5/0.08.

**Deterministic.** Clustering is a pure function of (the report's places and their lowered bundles) + (an optional
DOM census keyed by stamp). Same source + same census → same roles, in the same order (sorted by size then
weight), with stable names (M3 scheme assigned by rank: the largest display, the heading sizes, titles by weight,
bodies, labels by caps). The census is cached per route like the reader's readings; roles are recomputed when a file
changes. No wall-clock, no viewport dependence: the census is of every stamped element, as the reader already is.

**Where it lives.** A new rule family `system/type` in `src/rules/` (beside `provenance`), producing one finding
per *proposal* (not per place): `rule: 'system/type-roles'`, with

```
{ kind: 'system', family: 'type',
  roles: [{ name: 'label-medium', bundle: { size: '12px', lineHeight: 1.5, letterSpacing: '0.08em', weight: 400 },
            members: [{ site, current: {…}, delta: { size, lineHeight, letterSpacing, weight } }], places, elements, files,
            contexts: [...], confidence }],
  outside: [{ site, why }],
  low: [{ site, role, why }],
  cost: { places, moves: { size: {0, 1, 2, more}, lineHeight: {…} }, classesRemoved },
  write: { theme: [{ name: '--text-label-medium', value: '0.75rem' }, { name: '--text-label-medium--line-height', value: '1.5' }, …],
           utilities: [{ name: 'type-label-medium', css: '@utility type-label-medium { font-size: var(--text-label-medium); line-height: …; letter-spacing: …; font-weight: … }' }],
           swaps: [{ cause-like: every member place, from its type classes, to 'type-label-medium' }] } }
```
The panel reads `roles` (the table above), `cost`, and takes `write` as one apply-all: tokens (the theme pairs,
already the `--text-*`/`--text-*--line-height`/`--letter-spacing` shape crafting-ui uses) → one `@utility` block per
role appended to the theme stylesheet (`src/index.css` has `@utility` support under Tailwind v4; the write is the
`token` path's sibling: one declaration block, guarded by hash, parsed afterwards, undoable) → whole-cause swaps for
every member (the existing `swapCause` path with the type classes as `from` and the role class as `to`, hash-guarded
per file, one history entry per file). Per-place findings for type then narrow to what is left: members already on
a role class are `copy`, the outside list stays as notes, and the taxonomy's per-kind rules (formula, fluid, alpha…)
handle the rest. The value taxonomy sits underneath: a role's bundle is built from `literal`/`unitless`/`em` kinds
only; a `formula` or `fluid` member keeps its multiplier and takes an inner edit instead of the class.

**crafting-ui specifics.** Its theme already pairs `--text-<name>` with `--text-<name>--line-height` and
`--letter-spacing`; the roles reuse that shape (`--text-label-medium`, `--text-label-medium--line-height: 1.5`,
`--text-label-medium--letter-spacing: 0.08em`) and add a weight variable, so `text-label-medium` works as a Tailwind
size utility too, while `type-label-medium` sets the bundle. Caps: `uppercase` is kept on the place as a modifier
(the label roles do not force it, because 25 label-medium places are lowercase mono numbers), or the owner decides
that `label-*` means caps (Q5).

## 7. Decisions for the owner

- **Q1 Eight roles or nine**: merge body-medium (15 px, the list body, 54 places) into body-large (16/1.6), or keep
  it. Merging makes the ladder 11, 12, 14, 16, 17, 19, 24, 44.
- **Q2 Line-heights**: body prose at 1.6 (centre of 1.375/1.5/1.65), or two body leadings (snug 1.375 for lists,
  relaxed 1.6 for prose) as the code has them. This is the single largest visual change (111 places > 2 px).
- **Q3 13 px mono readouts** (22 places, `measure text-[13px]`): move to body-small 14 px, or a mono readout role
  (`label-large`?) at 13.
- **Q4 Sizes under 12 px**: the theme says nothing under 12 px; 86 label-small places sit at 10–11 px. Keep label-small
  at 11, or raise it to 12 and make label-medium 13.
- **Q5 Caps in the role**: does `label-*` mean uppercase + tracked (then the 37 lowercase label places are a
  different role), or is `uppercase` a modifier kept at the place.
- **Q6 title-medium at 17 or 16**: 17 keeps 29 places still; 16 drops a size from a crowded ladder.
- **Q7 The five one-off headings (28–33 px)**: a tenth role (headline-medium ≈ 30) or deliberate exceptions.
- **Q8 Scope**: exclude `src/specimen`, `src/motion/harness`, `src/motion/examples`, `src/demos`, `src/craft-rules`
  from type roles (61 places), by config (`source` exclusions or an `imitation` mark).

## 8. E2E test plan (feature-level, real Vite + Chromium)

1. **Roles from a fixture**: a page with 30 caps labels at `text-[12px] tracking-[0.08em] uppercase`, 12 prose
   paragraphs at 16/1.6, 6 list bodies at 15/1.375, 4 headings at 24/500, 2 page titles with a clamp, and 3 SVG
   `<text>`. The `system/type-roles` finding names exactly those roles (M3 names by rank), with members, counts and
   contexts; SVG text is in `outside`; the proposal is identical across two openings, a 400 px and a 1200 px window,
   and a hidden tab (the determinism harness).
2. **The write**: taking the proposal writes the theme pairs and one `@utility` per role into the theme stylesheet
   (parsed afterwards, one history entry), then swaps every member's type classes for the role class, one write per
   file; the page re-renders with every member's computed size/leading/tracking/weight equal to its role's bundle
   (asserted on the DOM), `uppercase` kept where it was; Undo restores every file.
3. **What is left**: after the write, type findings on the page are only the `outside` notes and the
   `calc(var(--z) * 14px)` inner edit; `progress.drift` for type is 0 for member places.
4. **Cost agrees with the page**: for each member the finding's `delta` equals the measured change (role bundle minus
   the computed value before the write), within 0.1 px.
5. **Low confidence is honest**: a 31 px one-off heading is listed under `low` with its nearest role and the px
   delta, and is not swapped by default.
6. **Determinism of names**: adding one more label place does not rename any role; adding a new 30 px cluster adds
   `headline-medium` without changing the others.

## Appendix: commands and raw output

A1. Measure (`bench/type-roles/measure.mjs`, the dev server listed by `~/.claude/bin/dev-server --list`: pid 80527,
`npx vite --port 5180 --strictPort`):
```
PLUMBER_CHROMIUM=$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell \
  node bench/type-roles/measure.mjs > bench/type-roles/measurements.json
routes 40, text elements 8733, with a stamp 8733
/:93  /motion:500  /icons:239  /how-its-made:37  /assets:23  /icons/concepts:1  /interfaces:538  /motion/primitives:202
/motion/skills:52  /motion/standards:503  /motion/techniques:49  /motion/techniques/multiplane-occlusion/vocabulary:135
/motion/vocabulary:1251  /primitives:159  /standards:239  /stickers:540  /workshop:35  /workshop/craft-rules:56
/motion/entries/offset-and-delay:179  /motion/moments/openai-refreshed:568  /motion/principles/*:193,151,174
/motion/techniques/*:305,165,151,163,166,203,141  /motion/entries/*:216,224,221,211,222,216  /patterns/swipe-to-dismiss:212
(/motion/moments/saar-nobody-tells-this-to-beginners, apple-intention, webflow-ecommerce: page.goto timeout, video)
```
A2. Places and bundles (`node bench/type-roles/analyze.mjs bench/type-roles/measurements.json`):
```
places 686 (elements 8733) · routes 37 · places whose size varies between elements 2
font sizes (px → places): 10:14 10.5:12 11:76 11.5:5 12:173 13:48 14:27 14.4:1 15:57 16:72 16.12:1 17:35 18:17 19:17 20:12 21:7
  22:9 24:9 26:3 28:1 28.8:5 30:3 31.2:3 32:3 33:1 33.6:2 36:4 38:1 38.4:1 39.68:4 40:2 40.8:2 42.24:5 43.52:7 44:2 45.83:1 46.08:7
  47.3:1 48:1 48.1:1 48.24:1 48.4:2 49.4:1 50.1:1 50.2:1 50.3:6 50.4:3 50.8:1 52:1 53.06:1 56:1 56.68:1 63.92:1 64:3 72:1 86.83:1 92:1 96:3 101.3:1 120:2 210:1
families: Geist:327 Geist Mono:320 Source Sans 3 Variable:21 Nunito:8 ui-rounded:2 Caveat:2 Helvetica Neue:2 system-ui:1 -apple-system:1 Iowan Old Style:1 sans-serif:1
bundles (size|lh|lsEm|weight|transform): 194
12|1.5|0.08|400|uppercase   places 86 el 1154 files 16 | tags span:82 figcaption:2 a:1 | shape phrase:71 number:10 | in section:29 header:20
16|1.65|-0.004|400|none     places 30 el  487 files  4 | tags p:12 span:11 li:3 | sentence:27 | in li:19 section:11 | classes type-body:19
12|1.3|0.08|400|uppercase   places 28 el  311 files  8 | tags dt:13 span:12 h2:2 | phrase:28 | in li:16 | classes label:28
11|1.5|0.1|400|uppercase    places 22 el  230 files 12 | tags span:16 button:5 | classes measure:18 text-[11px]:18 tracking-[0.1em]:18 uppercase:18
13|1.5|0|400|none           places 22 el  528 files 10 | tags span:16 li:3 button:2 | phrase:15 number:7 | classes measure:17 text-[13px]:9
12|1.5|0.1|400|uppercase    places 20 el  192 files  8 | tags span:10 h3:4 button:3 | classes measure:13 text-[12px]:13 tracking-[0.1em]:13 uppercase:13
11|1.5|0.08|400|uppercase   places 18 el  345 files  8 | classes text-[11px]:13 measure:12 tracking-[0.08em]:12 uppercase:12
15|1.375|0|400|none         places 17 el  202 files  8 | tags span:11 p:3 | in li:7 | classes font-read:11 text-[0.9375rem]:11 leading-snug:11
15|1.625|0|400|none         places 15 el  155 files  9 | classes font-read:15 text-[0.9375rem]:15 leading-relaxed:15 text-muted:15
16|1.5|0|400|none           places 14 el   50 files  7 | tags p:11 | classes font-read:12 text-[1rem]:11
14|1.5|0|400|none           places 14 el  233 files 11 | classes text-muted:8 font-read:4 text-[0.875rem]:4 text-sm:4
… (194 bundles; the first 60 are in the script's output)
```
A3. Roles and cost (`VARIANT=B node bench/type-roles/roles.mjs bench/type-roles/measurements.places.json`;
`VARIANT=A` for eight roles):
```
places 686: in the system 550, outside 136
display-large 25 places · headline-small 21 · title-large 50 · title-medium 29 · body-large 67 · body-medium 54 · body-small 40 · label-medium 178 · label-small 86
movement (places): size {"0":412,"1":86,"2":34,">2":18} line-height(px) {"0":312,"1":77,"2":50,">2":111}
  letter-spacing(px) {"0":314,"1":51,"0.5":179,">1":6} weight {"0":506,"100":38,">100":6}
distinct font sizes: before 61 (in-system places: 28) → after 9 roles + outside 50
type classes removed: 845 over 550 places (mean 1.54), replaced by one role class each (+ uppercase where kept)
low confidence (72)
outside the system: runtime-scaled drawing text (var(--z)) ×9 · specimen / demo content ×61 · drawing text (SVG) ×48 · poster size ×4 · brand imitation ×14
VARIANT=A: body-large 121 places; movement size {"0":358,"1":140,"2":34,">2":18} line-height {"0":312,"1":76,"2":50,">2":112}; low confidence 76
```
A4. The caps label and the 15 px list body:
```
uppercase places in system: 217, of which letter-spacing ≥ 0.06em: 205; sizes 12×141 11×52 13×10 10×7 10.5×4 11.5×2 22×1
tracking-[0.1em] places: 41; uppercase: 41; with measure: 40; sizes 11×18 12×14 13×4 10.5×3 11.5×1 10×1
15px places: 54; in a list item: 26; line-heights 1.375×20 1.625×15 1.5×14 1.55×4 1.25×1
size moves > 2 px (18): the clamp titles at 1280 (46.08/43.52/39.68 → 44) and the one-off headings 28/30/31.2/32/33 → 24
```
