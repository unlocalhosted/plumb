# Plumber's token spec: colour and type

Status: spec; type layers 1–2 built and written on crafting-ui (side copy); colour name reading built (2026-11-10). Owner direction: move plumber's own idea of a "good token system" to the
shape BoardUI uses (references below), because it scales to large apps better than what plumber proposes today.
This replaces the *naming and layering* plumber suggests. It does not replace how plumber reads a page into roles
(docs/research/type-roles.md, docs/research/colour-system.md): that reading stays, it just lands on new names.

References (shared by the owner): [BoardUI typography](https://www.boardui.com/components/typography),
[BoardUI colour](https://www.boardui.com/components/color).

---

## 0. The idea in one paragraph

A token system has three layers and each layer has one job. **Primitives** are raw ramps (grey 50–950, blue 50–950)
and nobody uses them in components. **Semantic tokens** name a *job*, written as a path
`category / role / state` (`background / primary / hover`), and point at a primitive. **Components** use only
semantic tokens. Type works the same way: a short **ladder of named sizes**, each a fixed size + line-height pair,
crossed with **weight** as its own axis, and **colour kept out of the type style** entirely. You retheme by moving a
primitive or re-pointing a semantic token; no component changes. Dark mode is one block of re-pointed tokens, never
`dark:` in components.

## 1. Why change what plumber suggests today

| Today | The problem at scale | New |
| --- | --- | --- |
| Type roles named like Material 3: display/headline/title/body/label × large/medium/small, each a bundle with its weight baked in | "title-medium" says nothing about the size, and a bold body needs a new role. Teams invent `title-medium-bold` and the names stop meaning anything | 13 named steps × 4 weights: `text-body-medium`. Size comes from the step, weight from the suffix, nothing else |
| Colour roles are flat short names: `fg`, `muted`, `faint`, `surface`, `sunken`, `line`, `accent`, `accent-hover` | No room for states (hover, active, disabled, error) except by inventing suffixes per token; no levels past two surfaces; nothing for charts or components | Path names `--color-{category}-{role}-{state}` with fixed categories and fixed state words |
| One accent token plus hand-made hover/soft | A rebrand means editing every derived value | One accent **ramp** (50–950) derived from one chosen colour at 500 |
| Primitives and roles mixed in one `:root` | Can't tell "the grey" from "the text colour" | Primitives file, semantic file, optional component file |

What does not change: role wins over distance, one accent unless the theme names a second ink, status keeps its
meaning, content colours are never touched, the APCA guard on every text move (colour-system.md §9).

## 2. Type

### 2.1 The ladder

Plumber's default ladder. Sizes are BoardUI's, and its line-heights from Title 1 down; the display steps (32px and up) are
set tight, about 1.1, because page titles are set that way (owner, 2026-11-10); the tracking for steps BoardUI leaves unstated is
ours (marked *ours*), from the usual optical rule that large text tightens and small text opens.

| Step | Name in code | Size / line-height | Tracking | Job |
| --- | --- | --- | --- | --- |
| Large title | `large-title` | 64 / 70 | -0.025em *ours* | hero numbers, marketing |
| Display 1 | `display-1` | 56 / 62 | -0.025em *ours* | full-page hero |
| Display 2 | `display-2` | 48 / 53 | -0.02em *ours* | section hero |
| Display 3 | `display-3` | 40 / 44 | -0.02em *ours* | page hero, big stats |
| Display 4 | `display-4` | 32 / 36 | -0.015em *ours* | page title, the largest in an app shell |
| Title 1 | `title-1` | 24 / 34 | -0.01em *ours* | headline figures on cards |
| Title 2 | `title-2` | 20 / 26 | -0.005em *ours* | section headings |
| Title 3 | `title-3` | 18 / 24 | 0 | sub-section headings |
| Headline | `headline` | 16 / 22 | 0 | lead paragraph, emphasised body |
| Body | `body` | 14 / 20 | 0 | default UI text: labels, cells, nav |
| Body 2 | `body-2` | 13 / 18 | 0 | dense tables, secondary text |
| Caption 1 | `caption-1` | 12 / 16 | 0.15px | timestamps, units, axis labels |
| Caption 2 | `caption-2` | 11 / 15 | 0.2px | fine print, the smallest legible |

Weights: `regular` 400, `medium` 500, `semibold` 600, `bold` 700.

### 2.2 The rules

1. **One class sets the whole bundle**: `text-{step}-{weight}` sets size, line-height, tracking and weight together.
   Hand-combining `text-sm font-medium leading-5` is drift, and plumber reports it as such.
2. **Colour is never part of a type style.** It comes from a text colour token beside it:
   `text-body-medium text-text-secondary`.
3. **A project uses a subset.** Plumber proposes only the steps and weights the code actually reaches for. 13 × 4 is
   the space, not the deliverable; a typical app lands on 6–8 steps and 2–3 weights. Success is still fewer distinct
   values (roles-not-values direction).
4. **Uppercase labels** (crafting-ui's biggest unnamed style) are a caption step plus a transform, written as their
   own class `text-caption-1-medium-caps` only when the code repeats it; tracking for caps is 0.08em *ours*.
5. **Fluid sizes**: the ladder is fixed px. A fluid hero (`clamp(...)`) maps to the display step it reaches at the
   widest breakpoint, and plumber keeps the clamp only if the project already uses one (listed, not invented). When a
   style's places use several clamps, it keeps the one whose largest value is nearest the step's size.
6. **Font family is a separate token** (`--font-sans`, `--font-mono`); a step never fixes the family. Mono numbers
   are `body-2` or `caption-1` with `--font-mono`.

7. **Reading text keeps its leading.** The ladder's line-heights suit UI text. A place whose code sets a line-height of
   1.45 or more, at 20px or smaller and not caps, is prose: it takes its style plus `leading-prose`, one shared value
   (`--leading-prose`, the most common prose leading in the code to 0.05, or the owner's `system.type.roles.prose.lineHeight`).
   The style classes read `line-height: var(--tw-leading, var(--text-<step>--line-height))`, so `leading-prose` wins
   whatever the class order.

### 2.3 How plumber reads a page onto the ladder

The reading in type-roles.md §6 stays (bundle + context clustering). Only the landing changes:

1. Cluster text by size and context as today.
2. Snap each cluster's size to the nearest ladder step within ±1px (scope keep) or ±2px (refine). Outside that, the
   cluster is listed, not forced.
3. Read weight separately: each cluster's most common weight, snapped to 400/500/600/700.
4. Line-height and tracking come from the step, not the cluster, except reading text (§2.2 rule 7).
5. Mapping from today's role names, so existing proposals translate:

| Today (M3) | Ladder |
| --- | --- |
| display-large | display-3 or display-4 (by size) |
| headline-small | title-1 |
| title-large | title-2 / headline |
| title-medium | title-3, weight semibold |
| body-large | headline |
| body-medium | body |
| body-small | body-2 |
| label-medium | caption-1 (+ caps) |
| label-small | caption-2 (+ caps) |

### 2.4 One trap to warn about

In Tailwind, `text-body-medium` and `text-text-primary` share the `text-` prefix. Without telling tailwind-merge that
`text-{step}-{weight}` is a font-size utility, merging a colour class can silently drop the type class. Plumber's
written setup must register the type classes with the project's merge helper (or say there isn't one).

## 3. Colour

### 3.1 The three layers

| Layer | What it holds | Who uses it |
| --- | --- | --- |
| Primitives | ramps 50–950 in OKLCH (neutral, the accent hue, status hues); Tailwind's defaults when the project is Tailwind | only semantic tokens |
| Semantic | `--color-{category}-{role}-{state}`, each pointing at a primitive (or a primitive with alpha) | components |
| Component (optional) | `--color-{component}-{part}` for the handful of components with needs no category covers (segmented control, avatar, notification) | that component |

Token names mirror the design-tool path: `text/primary` ↔ `--color-text-primary` ↔ class `text-text-primary`. The
doubled word is intended: the first is the utility, the rest is the token.

### 3.2 Categories, roles, states

Fixed words. Plumber never invents a new state word.

| Category | Roles | States | Job |
| --- | --- | --- | --- |
| `text` | `primary`, `secondary`, `tertiary`, `placeholder`, `on-accent`, `error` | `disabled` | words |
| `foreground` | `icon-primary`, `icon-secondary`, `icon-tertiary`, `full` | `hover`, `disabled`, `error` | icons and marks on a surface |
| `background` | `full` (the page canvas), `primary`, `secondary`, `tertiary`, `quaternary` (levels, each a step deeper or raised) | `default`, `hover`, `active`, `disabled`, `error` | surfaces and controls |
| `border` | `default`, `strong`, `separator`, `focus-ring`, `input` | `hover`, `active`, `error` | lines |
| `accent` | ramp `50`–`950` | (stops serve as states: 500 rest, 600 hover, 700 pressed, 100 soft) | the one action colour |
| `state` | `success`, `warning`, `danger`, `info` | `text`, `base`, `background` | meaning only |
| `status` (optional) | named hues for tags and badges: `lime`, `yellow`, `rose`, `cyan`, `blue`, `purple` | `background`, `text` | labels that are categories, not states |
| `chart` | `1`–`8`, `track`, `cursor`, `neutral` | `active` (one stop darker) | data |

### 3.3 Mapping from plumber's current roles

| Today (`kind`) | New token |
| --- | --- |
| `ground` | `background-full` |
| `surface` | `background-primary-default` |
| `sunken` | `background-secondary-default` |
| `hover`, `pressed` | `background-{level}-hover`, `-active` |
| `fg`, `muted`, `faint` | `text-primary`, `text-secondary`, `text-tertiary` |
| `on-accent` | `text-on-accent` |
| `line`, `line-strong` | `border-default`, `border-strong` |
| `accent`, `accent-hover`, `accent-soft` | `accent-500`, `accent-600`, `accent-100` |
| `ink2` (second ink) | a second ramp `ink2-50`–`950`, only when the theme names one (budget rule unchanged) |
| `success` … `info` | `state-{name}-base` (+ `-text`, `-background`) |

### 3.4 Rules

1. **Components use semantic tokens only.** A primitive or a raw value in a component is drift.
2. **Dark mode lives in one place**: light values in `:root`, dark in `.dark` (or the project's own selector). Every
   semantic token is re-pointed there. A `dark:` class in a component is reported.
3. **Dark values may use alpha** over the canvas (`neutral-800 / 60%`) so layered surfaces stay distinct; plumber
   compares them composited over their ground, as it does today.
4. **The accent is one input.** The person picks one colour; plumber puts it at 500 and derives the other ten stops
   in OKLCH (same hue, lightness spread like Tailwind's ramps, chroma tapered at the ends). The words on it
   (`text-on-accent`) must pass APCA Lc 60 (body). Keep the brand, change the text (owner, 2026-11-10): white when it
   reads; else the ramp's own 950; else a near-black of the same hue. Only a mid-tone neither reads on (teal, sky,
   orange, green) moves its lightness, the shorter way, and plumber says by how much.
5. **Focus ring is its own token**, the same in both schemes unless the person changes it.
6. **Contrast is checked, not trusted.** BoardUI states no contrast rule; ours stays: APCA for text against its
   ground, WCAG 3:1 for control borders (colour-system.md).

### 3.4b How plumber reads a project's token names (built 2026-11-10)

A name whose first word is a category (`text`, `foreground`, `background`, `border`, `separator`, `accent-<stop>`,
`state`, `status`, `chart`) is read as a path: the category decides the family, the rest the role and state
(`text-primary` → first grey, `background-secondary-default` → sunken, `background-primary-hover` → hover,
`accent-600` → accent hover, `state-success-text` → success). Focus rings, disabled backgrounds, accent stops other than
50/100/500/600, status hues and chart colours are not UI roles: plumber never folds a colour onto them. Any other name
(`fg`, `muted`, shadcn's `primary-foreground`) is read by its words, as before.

### 3.5 How plumber reads a usage into a token

Same reading as `readRoles` today (property, element, area), plus two axes:

- **Category** from the property and element: text colour on words → `text`; fill/stroke of an icon → `foreground`;
  background → `background` (or `accent` when it is a control's fill); border/outline → `border`; chart marks → `chart`
  (content: counted, not rewritten, unless the project already has chart tokens).
- **Level** for backgrounds from nesting: the page canvas is `full`, the first raised or inset surface is `primary`,
  one inside it `secondary`, and so on. Four levels max; a fifth is listed.
- **State** from where the value is set: `:hover`/`hover:` → `hover`, `:active` → `active`, `[disabled]`/`disabled:`
  → `disabled`, `aria-invalid` or an error class → `error`. No evidence, no state.

## 4. What plumber writes

Three files (or three sections of the project's one CSS entry, if it keeps one):

```css
/* primitives.css: raw ramps. Nothing outside the semantic layer reads these. */
@theme { --color-neutral-50: oklch(0.985 0 0); /* … */ --color-accent-500: oklch(0.55 0.2 260); /* … */ }

/* theme.css: semantic tokens, light then dark. */
:root { --color-text-primary: var(--color-neutral-950); --color-background-primary-default: var(--color-neutral-0); /* … */ }
.dark { --color-text-primary: var(--color-neutral-50); --color-background-primary-default: oklch(from var(--color-neutral-800) l c h / 0.6); /* … */ }

/* typography.css: one class per step × weight the project uses. */
.text-body-medium { font-size: 14px; line-height: 20px; letter-spacing: 0; font-weight: 500; }
```

Then the class swaps at places, as today (one write, one trace group per pass). Tailwind v4 projects get the tokens
in `@theme` so `bg-background-primary-default` exists as a utility; vanilla CSS projects get custom properties and
the same class names.

## 5. What plumber says to someone adopting a design system

This is the suggestion text, shown when a project has no token system or a flat one (the "establish a design system"
journey, docs/briefs/establish-design-system.plan.md). Plain words, in plumber's voice.

> **Name colours by their job, in three layers.** Keep raw ramps (grey 50–950, your brand 50–950) in one file and
> never use them in components. Give every job a name like `background / primary / hover` or `text / secondary`, and
> point it at a ramp. Your components use only those names. To rebrand, change one ramp. For dark mode, re-point the
> names in one block.
>
> **Pick one brand colour.** We put it at 500 and build the rest of its ramp for you, then check white text on it is
> readable.
>
> **Give type a ladder, not a list.** A handful of named sizes, each with its line-height, and weight as a separate
> choice: `body-medium`, `title-2-semibold`. Colour stays out of it. We found N sizes in your code; M steps cover X%.
>
> **States have fixed words.** default, hover, active, disabled, error. If a colour only appears on hover, it is the
> hover state of something, not a new colour.
>
> **Start small.** You don't need all 13 steps or every category. We propose only what your code already reaches for.

## 6. Decisions for the owner

1. **Step names.** BoardUI's (`display-1`, `title-2`, `body-2`) read well and are numbered; Apple-like names are
   familiar. Recommend BoardUI's as written above.
2. **Should the ladder be fixed or fitted?** Recommend: the default ladder is fixed; at scope `refine` and `new` plumber
   may shift a step by ≤1px to match a project's dominant value, and says so.
3. **Background levels.** BoardUI uses primary → quaternary. Our reading has ground/surface/sunken. Recommend the
   level names (they scale), with `full` as the canvas.
4. **Component tokens.** Recommend: plumber proposes none by default; it suggests one only when a component's colours
   repeat across 3+ places and fit no category.

## 7. Layers to build (one at a time)

1. Type ladder: snap the existing role clusters to steps × weights; text pass shows the new names. Proof on
   crafting-ui: distinct sizes before → after.
2. Type write: `typography.css` + class swaps + merge-helper registration.
3. Colour names: map current `kind`s onto `category-role-state`; reader adds level and state.
4. Accent ramp: one colour in, eleven stops out, APCA guard.
5. Colour write: primitives / semantic / dark block.
6. The adoption suggestion (§5) in the establish journey.
