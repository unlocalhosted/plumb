# Plumber's token spec: colour and type

Status: **signed off by the owner** (2026-11-12). The rework in §6 is built: type roles from the code with weight on its own, colour roles and states in our names, rename only on request. Not built: surface levels and states read from usage (§3.3).

This is plumber's own spec, improved with the parts of BoardUI's system that are objectively better
([typography](https://www.boardui.com/components/typography), [colour](https://www.boardui.com/components/color),
shared by the owner). It is not a copy of BoardUI. Each idea taken from it is marked **(from BoardUI)** with why it is
better; everything else is ours and stays: roles are worked out from each project's own code
(docs/research/type-roles.md, docs/research/colour-system.md), and our names stay.

> A first version of this file copied BoardUI 1:1 (its 13 fixed sizes, its names, renaming every project's tokens).
> That was a mistake: the owner meant the reference as evidence to improve our spec, not a system to replace it.

---

## 0. The idea in one paragraph

Plumber reads what each element *does* and proposes the smallest system that covers the code. Every token names a
job, never a value. **(from BoardUI)** Tokens come in layers: raw ramps that nothing uses directly, roles that point at
them, and components that use only roles. Type works the same way: a role is a size with its line-height and tracking;
weight is a separate choice, and colour is never part of a text style. States use a fixed vocabulary of suffixes.
Dark mode is one block of re-pointed roles. A brand is one colour.

## 1. What we take from BoardUI, and what stays ours

| Idea | Take it? | Why |
| --- | --- | --- |
| Weight is its own axis: one class per size × weight | **Take** | Today a bold body needs a new role; teams then invent `title-medium-bold` and roles stop meaning anything. Separating weight keeps roles few |
| One class sets the whole bundle (size, leading, tracking, weight) | Already ours | Plumber's `type-<role>` classes do this |
| Colour is never part of a text style | **Take** | A style with a colour baked in forks for every colour; a colour token beside it does not |
| Three layers: raw ramps → roles → components | **Take** | Retheming moves a ramp or re-points a role; no component changes. Today plumber's roles hold raw values, so a rebrand means editing each |
| A fixed set of state words | **Take** | Without it every token invents its own (`-hover`, `-hovered`, `-on-hover`, `pressed`, `down`) |
| Surface levels | **Take** (as levels on our words) | Nested surfaces (a card in a panel) need a step without a new name each time |
| One brand colour → its whole ramp | **Take** | A rebrand is one input; the readable text on it is checked, not trusted |
| Dark mode in one block, never `dark:` in components | **Take** | Dark changes stay in one place |
| 13 fixed text sizes for every project | **Not taken** | Plumber derives roles from the project's code; a fixed scale would move most of a project's text to sizes it never chose |
| BoardUI's names (`title-2`, `body-2`; `text-text-primary`, `background-primary-hover`) | **Not taken** | Ours are shorter and already in use; doubled names read badly |
| Renaming a project's tokens to plumber's names | **Not taken as a default** | Plumber reads any naming; it renames only when the person asks (§5) |

## 2. Type

### 2.1 Roles come from the code (ours)

As in docs/research/type-roles.md: every text element is read with its context (tag, landmark, content shape, how
often it repeats) and clustered into the roles the code is reaching for. Roles are named on our Material-style scheme,
`display | headline | title | body | label` × `large | medium | small`, and a project uses only the ones its code
needs (crafting-ui: 8). A role's size, line-height and tracking come from its members' own values (the owner's decision,
else the theme's step within 1px, else the most common), and up the scale every role must be larger than the one below.

### 2.2 Weight is separate **(from BoardUI)**

- A role is a size, a line-height and a tracking. It has a usual weight: the one most of its places use.
- A place that uses another weight takes the role plus Tailwind's own weight class, never a new role:
  `type-title-medium` (its usual weight) or `type-title-medium font-semibold`. The role class sets
  `font-weight: var(--tw-font-weight, <usual>)`, so the weight class wins in any class order.
  (Changed while building, 2026-11-12: the signed-off `type-<role>-<weight>` class collides with our size words, as in
  `type-title-medium-medium`; Tailwind's weight classes carry the same idea with no new classes.)
- Weights are `regular` 400 (`font-normal`), `medium` 500, `semibold` 600, `bold` 700; a place's weight snaps to the
  nearest.

### 2.3 Colour is never in a text style **(from BoardUI)**

A style sets no colour. A muted caption is `type-label-small` beside `text-muted`. A role whose places all share one
colour does not take that colour into its bundle.

### 2.4 Reading text and titles (ours, kept)

- **Reading text keeps its leading.** Paragraph places whose code sets a line-height of 1.45 or more, at 20px or
  smaller, not uppercase, not code, take their role plus `leading-prose`: one shared value (the owner's
  `system.type.roles.prose.lineHeight`, else the most common in the code). The role classes read
  `line-height: var(--tw-leading, var(--text-<role>--line-height))`, so `leading-prose` wins in any class order.
- **Uppercase labels** keep their tracking (the label roles already carry it).
- **Fluid sizes** (`clamp(…)`) are kept only where the code writes them; a role whose places use several keeps the one
  most places use, a tie going to the larger.

### 2.5 Class names

`type-<role>`, with `font-<weight>` beside it for another weight. The `type-` prefix (ours) also avoids BoardUI's own documented trap: with a
`text-` prefix, Tailwind's class merging can drop a type class merged with a text colour.

## 3. Colour

### 3.1 Three layers **(from BoardUI)**

| Layer | What it holds | Who uses it |
| --- | --- | --- |
| Ramps | raw colours, 50–950 in OKLCH: a neutral ramp, the brand ramp, the four status ramps | only roles |
| Roles | our role names (§3.2), each pointing at a ramp step | components |
| Component tokens (rare) | only for a component whose colours repeat in 3+ places and fit no role | that component |

A project that already holds raw values in its roles (crafting-ui does) keeps working; plumber proposes the ramps only
when it writes a new system or the person asks.

### 3.2 Roles (ours, from colour-system.md §2.2)

| Family | Roles |
| --- | --- |
| Ground | `ground` (the page), `surface` (raised: card, popover), `sunken` (inset: field, well, sidebar) |
| Text | `fg`, `muted`, `faint`, `on-accent` |
| Line | `line`, `line-strong` |
| Accent | `accent`, `accent-soft` (its tint) |
| Second ink | only when the project names one (crafting-ui `draw`); plumber calls the role `ink2` internally and keeps the project's name |
| Status | `success`, `warning`, `danger`, `info` |

### 3.3 States and levels **(from BoardUI)**

- **Fixed state suffixes**, on any role that has the state: `-hover`, `-active`, `-disabled`. (Our old `pressed` becomes
  `active`, the CSS word.) So `surface-hover`, `surface-active`, `accent-hover`, `accent-active`, `accent-disabled`.
  Plumber never invents another state word.
- **Surface levels**: a surface on a surface is `surface-2`, then `surface-3`. Three levels at most; a fourth is listed.
- A state is read from where the colour is set: `:hover` / `hover:`, `:active`, `[disabled]` / `disabled:`. No
  evidence, no state.

### 3.4 The brand **(from BoardUI)**

- One colour in; plumber puts it at 500 and builds the other ten steps (built: overlay/src/ramp.js).
- Its words (`on-accent`) must reach APCA Lc 60. White when it reads; else the ramp's darkest step; else a near-black of
  the same hue. Only a mid-tone neither reads on moves its lightness, the shorter way, and plumber says how much (ours,
  owner 2026-11-10: keep the brand, change the text).
- Status hues are fixed, so meaning never follows the brand. Plumber warns when the brand sits within 25° of hue of the
  warning or danger colour (greys excepted) and says what to do: move the hue, or give that status an icon and words
  (built: `brandHint` in overlay/src/colour-system.js, shown on overlay/demo/colour-system.html).

### 3.5 Dark mode **(from BoardUI)**

Roles are re-pointed for dark in one block (`.dark`, or the project's own selector). A `dark:` class in a component is
reported. Dark surfaces may use alpha over the page, compared composited as plumber already does. A project that says
it has no dark mode (crafting-ui) gets none.

### 3.6 Reading any naming (ours, kept)

Plumber reads a project's tokens whatever they are called: flat words (`fg`, `muted`), shadcn (`primary-foreground`),
or category paths like BoardUI's (`text-secondary`, `background-primary-hover`). Role wins over distance; contrast is
checked with APCA for text and WCAG 3:1 for control borders (colour-system.md §9).

## 4. What plumber writes

- **Type:** the role tokens (`--text-<role>`, `--line-height`, `--letter-spacing`), one `type-<role>` class per role, `--leading-prose` when reading text exists, then the class swaps.
- **Colour, for a project with no system or on request:** ramps, roles pointing at them (light), a dark block only if
  the project has or wants dark mode.
- **Colour, for a project with a system:** nothing new by default; it folds stray colours onto the project's own roles
  (the colour pass, unchanged).

## 5. Renaming a project's tokens: only when asked

Plumber does not suggest renaming. When the person asks (a command or a menu item, not the colour step's default
view), it shows the plan (each token, its new name, those that keep theirs and why) and writes it in one go with one
Undo (built: the rename write, one transaction, about 7–13 s to undo 101 files). The target names are §3's roles, not
BoardUI's paths.

## 6. Rework, after sign-off (one layer at a time)

| Built | Becomes |
| --- | --- |
| Fixed 13-size ladder, BoardUI step names | Derived roles again (type-roles.md), plus the weight axis (`font-<weight>` beside the role) |
| `leading-prose`, title and clamp rules | Kept; rules restated on derived roles (§2.4) |
| Colour generator writing `text-primary`, `background-*` paths | Writes our roles plus the state suffixes and levels (§3.2–3.3) |
| Rename plan targeting BoardUI paths | Targets our roles; for a project using `pressed` it proposes `active` |
| Rename section in the colour step | Removed from the default view; offered on request |
| Path-name reader, accent ramp, readable brand text, rename write, fast undo, reload-safe panel | Kept as they are |
| crafting-ui side copy (`../crafting-ui-type`) holding BoardUI-named writes | Discarded |

## 7. Decisions for the owner

1. `pressed` → `active` for the press state (recommended: `active`, the CSS word).
2. Surface levels as `surface-2`, `surface-3` (recommended) or as words (`raised`, `overlay`).
3. Where "Rename my colours" lives when asked: a command, or a menu item in the colour step (recommended: the menu).
