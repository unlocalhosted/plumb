# Shadow and motion recipes: sources, licences, first pack

Date: 2026-11-02. Brief: `docs/briefs/recipes.md`. Package format: `recipe-pack.md` + `recipe-pack.schema.json`.
First pack: `packs/first.json` (7 shadows, 11 motion recipes).

Convention: **verified** = the value was read from the source file or page on 2026-11-02 and the licence from its
licence file. **Unverified** is stated wherever it applies.

## 1. Sources

### libraries.dev

What it is (https://libraries.dev, read 2026-11-02): "Libraries and models for next-gen UI", meant to be pasted as
a prompt into a coding agent. Ten listings, all UI effects for AI interfaces: Border beam, Thinking orbs, Gooey,
Voice, Voice ring, Magnetic UI, Voice direction, Bot avatars, Liquid Metal, Image generation (loader that turns
into the image). Five core packages (border-beam, thinking-orbs, liquid-gooey, metal-fx, img-fx) are stated to be
MIT on npm; they need React 18+. A Pro tier unlocks a Studio.

Finding: **it lists no shadow scales, no easings, no springs and no state/enter/exit motion recipes.** The page says
nothing about shadows or spring physics. It is a source of *effects* (a glow that rides a border, liquid metal),
not of tokens. Worth a later pack kind ("effect") but nothing to copy into this first pack. Licence per package not
individually checked (only the page's "MIT" statement): unverified.

### Josh W. Comeau, designing shadows

https://www.joshwcomeau.com/css/designing-shadows/ (read). Approach: one light source, so every layer keeps the same
x:y ratio (vertical offset about twice the horizontal); as an element rises, offset and blur grow and opacity drops;
use three tiers of 1, 3 and 5 layers; colour the shadow with the background's hue (`hsl(220deg 60% 50%)` as the
example) instead of grey black. Concrete values on the page include `0 1px 1px / 0 2px 2px / 0 4px 4px / 0 8px 8px
/ 0 16px 16px` at 0.075 and the three elevation tiers.
Licence: page footer "© 2018-present Joshua Comeau. All Rights Reserved."; no open licence stated.
Copy values? **No.** We use the technique (layered, one light, hue-matched), which is an idea, and author our own
numbers (recipe "Tinted"; the dials implement the one-light rule). He credits the layering technique to Tobias Ahlin
(https://tobiasahlin.com/blog/layered-smooth-box-shadows/, URL responds 200; its licence was not checked) and the
tool idea to Philipp Brumm.

### Material 3 (elevation and motion)

Motion tokens: read from Google's Material Web repo, `tokens/versions/v0_192/_md-sys-motion.scss`
(https://raw.githubusercontent.com/material-components/material-web/main/tokens/versions/v0_192/_md-sys-motion.scss).
Licence: Apache-2.0 (file header `SPDX-License-Identifier: Apache-2.0`; LICENSE at
https://raw.githubusercontent.com/material-components/material-web/main/LICENSE). May copy with attribution and
the Apache notice retained: yes (we copy small numeric tokens; we do not claim the Material trademark or imagery).
Values (verified):

| Token | Value |
|---|---|
| easing-standard | cubic-bezier(0.2, 0, 0, 1) |
| easing-standard-decelerate | cubic-bezier(0, 0, 0, 1) |
| easing-standard-accelerate | cubic-bezier(0.3, 0, 1, 1) |
| easing-emphasized | cubic-bezier(0.2, 0, 0, 1) in this file (the M3 site describes emphasized as a path curve; the file carries a cubic fallback) |
| easing-emphasized-decelerate | cubic-bezier(0.05, 0.7, 0.1, 1) |
| easing-emphasized-accelerate | cubic-bezier(0.3, 0, 0.8, 0.15) |
| easing-legacy | cubic-bezier(0.4, 0, 0.2, 1) (+ decelerate (0,0,0.2,1), accelerate (0.4,0,1,1)) |
| durations | short1-4: 50, 100, 150, 200ms; medium1-4: 250, 300, 350, 400ms; long1-4: 450, 500, 550, 600ms; extra-long1-4: 700, 800, 900, 1000ms |

Elevation: `elevation/internal/_elevation.scss` draws two shadows (a key shadow and an ambient one, each at opacity
0.3) and documents levels 0-5 as `0 0 0 0`, `0 1px 2px`, `0 1px 2px`, `0 1px 3px`, `0 2px 3px`, `0 4px 4px` for the
key layer (comment in the file; verified), the ambient layer was not read. Not used in the first pack: Material's
ladder is built on a shadow colour token plus tonal surface colour, so shadow alone does not reproduce it.
The M3 website pages (m3.material.io/styles/motion/easing-and-duration/tokens-specs, /styles/elevation/tokens) render
with JavaScript and returned only titles to my fetch; I therefore did not use the website as a source for values.

### Apple Human Interface Guidelines, motion

https://developer.apple.com/design/human-interface-guidelines/motion: my fetch returned the title only (page is
JavaScript-rendered), so **nothing here is verified from the page.** From general knowledge only (unverified):
purposeful motion, brief and unobtrusive, physics-like springs, respect Reduce Motion. Apple documentation is
under Apple's own terms; the HIG text is not licensed for copying. We take no values; the ideas (reduced-motion
fallback on every recipe, springs with a damping ratio) are covered by other sources. If we want Apple's spring
feel, the SwiftUI/UIKit parameterisation (duration + bounce) is the same shape as Motion's duration + bounce, which
is why the dials use it.

### Open Props

https://github.com/argyleink/open-props, licence MIT, "Copyright (c) 2021 Adam Argyle"
(https://raw.githubusercontent.com/argyleink/open-props/main/LICENSE). Copying with attribution: yes (MIT: keep the
notice). Verified from `src/props.shadows.css`: `--shadow-1..6` (1 to 7 layers, negative spreads, colour
`--shadow-color: 220 3% 15%` light / `220 40% 2%` dark, `--shadow-strength` 1% light / 25% dark), five
`--inner-shadow-*` with a highlight pair (`inset 0 -.5px 0 0 #fff, inset 0 .5px 0 0 #0001`, dark `#fff1`/`#0007`),
and `--text-shadow-*`. Example (verified): `--shadow-2: 0 3px 5px -2px hsl(var(--shadow-color) / 4%), 0 7px 14px -5px
hsl(var(--shadow-color) / 6%)`.
Easings from `src/props.easing.css` (verified lines): `--ease-out-1..5` = cubic-bezier(0,0,.75,1), (0,0,.5,1),
(0,0,.3,1), (0,0,.1,1), (0,0,0,1); `--ease-in-1..5` = (.25,0,1,1), (.5,0,1,1), (.7,0,1,1), (.9,0,1,1), (1,0,1,1);
`--ease-in-out-1..5` = (.1,0,.9,1), (.3,0,.7,1), (.5,0,.5,1), (.7,0,.3,1), (.9,0,.1,1);
`--ease-elastic-out-3: cubic-bezier(.5, 1.25, .75, 1.25)`; and `--ease-spring-1..5` and `--ease-bounce-1..5` as
`linear()` lists, e.g. spring-3 starts `linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%, 0.938 16.7%, 1.017, ...
1)`. `linear()` is how a real spring becomes CSS without a library; baseline status of `linear()` not checked
(unverified).
In the pack: "Soft" and "Sunken" (both read directly).

### Radix Themes / Radix Colors

Radix Themes MIT, "Copyright (c) 2023 WorkOS" (https://raw.githubusercontent.com/radix-ui/themes/main/LICENSE);
Radix Primitives MIT, 2022 WorkOS; Radix Colors MIT, "Copyright (c) 2021-2022 Modulz"
(https://raw.githubusercontent.com/radix-ui/colors/main/LICENSE). Copying with attribution: yes.
Shadows (verified, `src/styles/tokens/shadow.css`): six levels built from hairline rings plus soft layers using the
theme's alpha scales, e.g. `--shadow-3: 0 0 0 1px var(--gray-a3), 0 2px 3px -2px var(--gray-a3), 0 3px 12px -4px
var(--black-a2), 0 4px 16px -8px var(--black-a2)`; `--shadow-1` is inset; separate dark values exist. They depend on
`--gray-a*` / `--black-a*` (Radix Colors alpha scales), so they only make sense in a theme that has those tokens;
not in the first pack (a decision below: a Radix-flavoured pack for projects that use Radix Themes).
Motion (verified): `components/animations.css` keyframes `rt-slide-from-top` = `translateY(4px) scale(0.97)` to none
plus `rt-fade-in`; `tooltip.css`: `animation-duration: 140ms; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1)`.
Origin-aware popovers: Radix Popover sets `--radix-popover-content-transform-origin` (`popover.tsx` line 511) and
`popover.css` uses `transform-origin: var(--radix-popover-content-transform-origin)`.
In the pack: "Pop in", "Grow from trigger".

### Tailwind CSS v4 scale

MIT, "Copyright (c) Tailwind Labs, Inc." (https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/LICENSE).
Verified from `packages/tailwindcss/theme.css` (main):

| Token | Value |
|---|---|
| shadow-2xs | 0 1px rgb(0 0 0 / 0.05) |
| shadow-xs | 0 1px 2px 0 rgb(0 0 0 / 0.05) |
| shadow-sm | 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1) |
| shadow-md | 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) |
| shadow-lg | 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) |
| shadow-xl | 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) |
| shadow-2xl | 0 25px 50px -12px rgb(0 0 0 / 0.25) |
| inset-shadow-2xs / xs / sm | inset 0 1px rgb(0 0 0 / 0.05) / inset 0 1px 1px ... 0.05 / inset 0 2px 4px ... 0.05 |
| ease-in / out / in-out | cubic-bezier(0.4,0,1,1) / (0,0,0.2,1) / (0.4,0,0.2,1) |
| default transition | 150ms, cubic-bezier(0.4, 0, 0.2, 1) |
| animate-ping / pulse | `1s cubic-bezier(0, 0, 0.2, 1) infinite` / `2s cubic-bezier(0.4, 0, 0.6, 1) infinite` |

In the pack: "Raised" (sm), "Floating" (lg), "Overlay" (2xl), and the default easing/duration for "Lift on hover"
and "Press down". Tailwind v4.3 docs (https://tailwindcss.com/docs/hover-focus-and-other-states) document a
`starting:` variant for `@starting-style` and `motion-safe:` / `motion-reduce:` (read); `transition-discrete` is
`transition-behavior: allow-discrete` (https://tailwindcss.com/docs/transition-behavior, read).

### Motion (Framer Motion) springs

MIT, "Copyright (c) 2024 Motion B.V." (https://raw.githubusercontent.com/motiondivision/motion/main/LICENSE.md).
Read from the published package `motion-dom@14.9.0` (`dist/motion-dom.dev.js`, line numbers from that file):
physical spring defaults **stiffness 100, damping 10, mass 1** (lines 834-836); duration-based defaults
**duration 800ms, bounce 0.3** (lines 838-839); an "under-damped" spring `stiffness 500, damping 25, restSpeed 10`
(line ~4780) and a "critically damped" one `stiffness 550, damping 30` (or `2*sqrt(550)` when target is 0)
(line ~4789). Which properties Motion applies these to by default was not checked.
The docs page https://motion.dev/docs/react-transitions was fetched but my tool summarised it as "stiffness: 1,
bounce 0.25, duration 0.3"; that **disagrees with the source file** (stiffness 100, bounce 0.3, 800ms). I trust the
source file over the summary; treat the docs numbers as unverified.
API shape used in `motion-props` (docs, https://motion.dev/docs/react-transitions): `transition={{ type: "spring",
duration, bounce }}` where bounce ranges -1..1 and 0 is no overshoot; setting stiffness/damping/mass switches to
the physical form.

### react-spring presets

MIT, "Copyright (c) 2018-present Paul Henschel, react-spring, all contributors". Verified from
`packages/core/src/constants.ts`: `default {tension 170, friction 26}`, `gentle {120, 14}`, `wobbly {180, 12}`,
`stiff {210, 20}`, `slow {280, 60}`, `molasses {280, 120}` (mass 1). Copying with attribution: yes. Not in the first
pack (the pack uses Motion's presets and duration+bounce dials); ready to convert as a "Springs" recipe set if the
owner wants named feels (Gentle, Snappy, Wobbly). Rough mapping for the dials: tension = stiffness, friction =
damping, so `bounce = 1 - friction / (2 * sqrt(tension))` (e.g. default: 1 - 26/26.1 = 0.004, nearly critical;
wobbly: 1 - 12/26.8 = 0.55). My derivation, not from the library docs.

### GSAP eases

GSAP 3.15.0 on npm declares the licence "Standard 'no charge' license: https://gsap.com/standard-license"; the page
(https://gsap.com/standard-license/, read) says GSAP is free for everyone including commercial use unless end users are
charged a fee to use your product (then a Business membership is required). That is a custom licence, not
OSI/SPDX. Eases are named functions inside the library: `power1..4`, `back`, `bounce`, `circ`, `elastic`, `expo`,
`sine`, `steps`, default `power1.out` (https://gsap.com/docs/v3/Eases/, read). CustomEase/CustomBounce are paid
extras per that page. Copy values? **No**: the ease names map to the standard Penner curves (which Open Props and
Tailwind already provide under MIT), and copying GSAP code would bring its licence into a user's theme. Needs the GSAP
library at runtime. Not in the pack.

### animations.dev and Emil Kowalski

animations.dev (https://animations.dev, read) is a paid course by Emil Kowalski; its custom easing curves are in the
paid course, not on the page, and no reuse terms are stated: **do not copy course content.** His article
https://emilkowal.ski/ui/you-dont-need-animations (read) gives guidance only (UI animation generally under 300ms;
a 180ms dropdown feels more responsive than 400ms; do not animate keyboard-initiated actions; a tooltip that opens
after another has just opened should open instantly); no licence stated; ideas only.
His open-source libraries are MIT and carry real values, all read from source:
- Vaul (`src/constants.ts`, MIT "Copyright (c) 2023 Emil Kowalski"): `TRANSITIONS = { DURATION: 0.5, EASE: [0.32, 0.72, 0, 1] }`, `VELOCITY_THRESHOLD 0.4`, `CLOSE_THRESHOLD 0.25`, `NESTED_DISPLACEMENT 16`, `BORDER_RADIUS 8`.
- Sonner (`src/styles.css`, MIT 2023 Emil Kowalski): toast starts `opacity: 0; transform: translateY(100%)`, `transition: transform 400ms, opacity 400ms, height 400ms, box-shadow 200ms`, mounted state `translateY(0); opacity: 1`; no timing function set (CSS default `ease`); icon `sonner-fade-in 300ms ease` from `scale(0.8)`.
In the pack: "Slide-up sheet" (Vaul, copied as published) and "Toast slide" (Sonner).

### Others worth knowing

- Open Props `linear()` springs (above): the best library-free spring.
- easings.net (https://easings.net, responds 200): the Penner cheat sheet; licence not checked, so unverified; our "bounce" dial raises the second bezier control point, which is the easeOutBack idea.
- MDN, `@starting-style`: Baseline 2024, newly available (https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style, read). `interpolate-size`: **not Baseline**, experimental (https://developer.mozilla.org/en-US/docs/Web/CSS/interpolate-size, read; Chromium-only from memory, unverified). View Transitions: MDN page loaded without its compatibility tables, so version numbers are recalled (Chrome/Edge 111, Safari 18, Firefox 144) and **unverified**.
- Radix and Base UI both expose a popup transform-origin as a CSS variable (Radix verified; Base UI unverified).

## 2. What is in the first pack

Seven shadows (all CSS-only, light + dark values, three dials: Height, Softness, Light direction unless noted):

| Name | Source | Licence | Notes |
|---|---|---|---|
| Raised | Tailwind shadow-sm | MIT | default dials = source exactly |
| Floating | Tailwind shadow-lg | MIT | exact |
| Overlay | Tailwind shadow-2xl | MIT | exact |
| Soft | Open Props shadow-2 | MIT | light and dark both from source |
| Sunken (inset) | Open Props inner-shadow-2 | MIT | dials Depth, Softness |
| Focus glow | original | none | gap + ring + glow; dials Ring width, Glow |
| Tinted | original (technique: layering, hue-matched) | none | four doubling layers; colour is a token |

Eleven motion recipes:

| Kind | Name | Source | Needs |
|---|---|---|---|
| state | Lift on hover | Tailwind default easing/150ms; lift 2px ours | CSS |
| state | Press down | Motion under-damped spring 500/25; scale 0.97 ours | CSS, or motion |
| state | Focus ring | original (+ Focus glow) | CSS |
| enter/exit | Fade and rise | Material 3 emphasized curves, 300/200ms | CSS (+ `@starting-style`), or motion |
| enter/exit | Pop in | Radix Themes tooltip: 140ms, (0.16,1,0.3,1), 0.97 | CSS, or motion |
| enter/exit | Grow from trigger | Radix popover origin variable | CSS, or motion |
| enter/exit | Toast slide | Sonner | CSS, or motion |
| enter/exit | Slide-up sheet | Vaul | CSS, or motion |
| layout | Smooth height | Material 3 standard curve, 300ms | CSS (grid rows), or motion |
| layout | Reorder | Motion 500/25 spring | **motion only** |
| layout | Shared element | Material 3 emphasized curve, 350ms | CSS view transition, or motion `layoutId` |

Values marked "ours" (2px lift, 0.97 press scale, 8px rise, exit durations of Pop in) are not from any source and are
marked in each recipe's `source.notes`.

Not yet looked at by eye: every dark-mode shadow alpha we derived (3x), Focus glow and Tinted, and the whole pack in
a browser. This is research and a format, not a built UI.

## 3. How each kind is applied (React + Tailwind v4)

**Shadows.** Tokens go in `@theme` as `--shadow-<name>` so utilities `shadow-raised` etc. exist, or as plain custom
properties plus a class. Dark values go under the project's dark selector. No library.

**Interaction states.**
- Hover/press: CSS `transition` on `transform`/`box-shadow` with `:hover` (wrapped in `@media (hover: hover)` so touch
  does not stick) and `:active`. Tailwind: `transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5
  hover:shadow-floating active:scale-[0.97]`; wrap in `motion-safe:` for reduced motion (documented, read).
- Focus: `:focus-visible` plus box-shadow, with a transparent `outline` so Windows forced-colours still shows a ring.
- With a library: `whileHover`, `whileTap`, `whileFocus` props on a `motion.*` element. Needed only if the state must
  interrupt and spring mid-flight with velocity.

**Enter / exit.**
- Enter without a library: `@keyframes` + `animation: ... both`, or `@starting-style` (Baseline 2024) for elements
  that go from `display: none`, together with `transition-behavior: allow-discrete` and `overlay`/`display` in the
  transition list, so the exit also animates. Tailwind: `starting:opacity-0 transition-discrete` (v4.3 docs).
- Exit of a React-unmounted element needs help: the common route is a Radix/Base UI `data-state="closed"` hook that
  keeps the node mounted until `animationend`; that already exists in Radix Primitives, which is why the CSS
  recipes key off `[data-state]`. A plain conditional render cannot animate out by CSS alone.
- With a library: `initial`/`animate`/`exit` props inside `<AnimatePresence>`. Needed for: exits of conditionally
  rendered elements without Radix, springs with real velocity, gesture-driven sheets.
- Needs a library: drag-to-dismiss sheets (velocity thresholds), Sonner-style stacked toasts (use Sonner itself).

**Layout / morph.**
- Height: `grid-template-rows: 0fr` to `1fr` transition (no library, widely supported); or `interpolate-size:
  allow-keywords` + `height: auto` transition (Chromium only, progressive enhancement).
- Shared element: View Transitions (`document.startViewTransition`, `view-transition-name`; version support
  unverified, see above) for CSS-only; `layoutId` in Motion for cross-browser and interruptible morphs.
- Reorder: a library (`layout` prop or `Reorder`), or a hand-written FLIP routine. Needs a library for a good result.

| Needs a library | Doesn't |
|---|---|
| Reorder; drag/gesture-driven sheets; exit of un-keyed conditional renders; interruptible springs with velocity | shadows; hover/press/focus; fade-rise, pop, grow, toast, sheet enter/exit (CSS, with `data-state` or `@starting-style`); height; shared element (View Transitions, with browser-support caveat) |

## 4. Decisions for the owner

1. **Licence policy.** Pack values come only from MIT and Apache-2.0 sources, no copying from Comeau (all rights
   reserved), animations.dev (paid), Apple (unreadable and Apple's terms) or GSAP (custom licence). Confirm. Also:
   do we write the full MIT/Apache text into the user's theme (what the licences literally ask for when copying a
   substantial portion) or just a credit line plus URL? The pack holds a short notice; I lean to a credit comment
   plus a `LICENSES` block only when the user installs a recipe.
2. **Pack format.** Confirm the shape: `drives` + `variables` formulas for dials, `{var:}`/`{class:}` placeholders,
   namespaced tokens, apply = class | css | motion-props. Alternative: a smaller format with dials as parameters of
   named generator functions instead of formulas (simpler to read, less portable).
3. **Namespace and Tailwind aliases.** Is `--plumb-first-*` acceptable as the written prefix, or should the user's
   chosen role names (the "roles, not values" direction) sit on top (`--shadow-card: var(--plumb-first-shadow-raised)`)
   and be the only thing code uses? Do we emit Tailwind `@theme` aliases at all, or only plain custom properties?
4. **Dark-mode shadows.** For Tailwind-derived shadows the dark values are ours (alpha x3, capped 0.9) and not yet
   judged by eye. Accept, or use Open Props' two-colour approach for the whole ladder?
5. **Motion library dependency.** Without a library we cover everything except Reorder and real springs; Do we offer
   "requires motion" recipes at all in the card, or hide them when the project has no `motion` dependency (the pack
   says `requires`; the card decides)?
6. **Exit animations** need `data-state` (Radix/Base UI) or a library. Do we accept that recipes offer exit only for
   those cases and say so on the card?
7. **View Transitions** for shared elements: browser support figures are unverified; do we ship it as CSS-only anyway
   or require `layoutId`?
8. **Next sources.** Add a Radix-flavoured shadow pack (needs the host to have Radix Colors alpha tokens), react-spring
   named springs, Open Props `linear()` spring curves, and libraries.dev's effect libraries (Border beam etc., a
   different kind than shadow/motion). Which first?
9. **Values that are ours** (2px lift, 0.97 press, 8px rise, 100ms exits, 1.6x slower hover return, focus ring
   colours): accept as defaults or replace with a source?
