# Recipe pack format (v1)

Companion to `recipe-pack.schema.json` (JSON Schema 2020-12) and `packs/first.json` (the first pack, validated
against it). Research and sources: `recipes.md`. Status: proposal for the owner to confirm; no UI or overlay code
depends on it yet.

## What a pack is

A pack is one JSON file: a named, versioned, licensed list of recipes. A recipe is a shadow or a motion that lives
in the user's theme as CSS custom properties written once and used by name. Any source (Open Props, Tailwind,
Material, Radix, Vaul, a company's own design tokens) is converted into this shape once; the card's Shadow and
Motion editors read only this shape, so they do not care where a recipe came from.

```
pack ── id, namespace, name, version, licence, notices[], recipes[]
recipe ── id, name, kind, summary, source{}, uses[], tokens[], variables{}, dials[], apply[], requires, reducedMotion, preview
```

## Pack header

| Field | Meaning |
|---|---|
| `format` | Always `plumb-recipe-pack/1`. A reader refuses other majors. |
| `id` | Globally unique, `publisher.pack`, e.g. `plumb.first`. Identity for updates and for "this recipe came from pack X". |
| `namespace` | Short slug that prefixes everything the pack writes: `--<namespace>-<token>` and `.<namespace>-<class>`. |
| `version` | Semver of the pack. Patch: value fixes. Minor: new recipes or dials. Major: a token or class is renamed or removed (the installer then asks before rewriting the user's theme). |
| `licence` | Licence of what the pack's author wrote: structure, formulas, original values (SPDX id or `LicenseRef-...`). |
| `notices[]` | One entry per distinct upstream licence: holders, URL, text. The installer writes these as a comment block next to the tokens it emits, which is what MIT ("include the copyright notice") and Apache-2.0 ("retain notices") ask for. |
| `requiresPlumb` | Semver range of the reader the pack needs, so a new field never silently breaks an old reader. |

### Licence handling, per recipe

Each recipe's `source` says where the values came from and what we did with them:

- `licence`: SPDX id of the source, or `none` for original values.
- `copied`: `values` (as published), `adapted` (published values reshaped into dials; at default dials the output
  equals the source, which the checker confirms), or `original` (authored here; the source only names a technique).
- `verified`: true only if the value was read from the source file or page and the licence from its licence file.
- `attribution`: the exact credit line the installer writes into the theme.

A pack may contain recipes under different licences; the pack licence never overrides a recipe's. A recipe with a
licence the user's policy rejects (for example non-OSI) is skipped at install with a message naming it.

## Tokens and collision avoidance

A token is `name` (local) plus a value, optionally `{light, dark}` when dark differs. It is written as
`--<namespace>-<name>`. Rules:

1. Names inside a pack are unique (`shadow-raised` appears once). A recipe prefixes its tokens with the part it
   owns: `shadow-`, `lift-`, `rise-`, `toast-`, so two recipes in a pack do not collide.
2. Between packs, the namespace is the guard. The installer keeps a register of namespaces in the theme file
   (`/* plumb-pack: plumb.first ns=plumb-first v0.1.0 */`). Installing a pack whose namespace is already taken by a
   different pack id is refused; the user can choose another namespace at install and every `{var:...}` reference
   is rewritten, because packs never hard-code a prefix.
3. Packs never write unprefixed names or Tailwind names directly. Tailwind utilities come through the optional
   `tailwind` alias (e.g. `--shadow-raised`), which is itself checked for clashes with the project's `@theme`
   before it is written; the alias is dropped (the prefixed token still works) if it is taken.
4. The user names what they use. A theme alias such as `--shadow-card: var(--plumb-first-shadow-raised)` is the
   user's own layer; packs never write it.

Light and dark: `value` is a string (same in both) or `{ "light": "...", "dark": "..." }`. The installer emits the
light value on `:root` and the dark value under the project's dark selector (`.dark`, `[data-theme=dark]`, or
`@media (prefers-color-scheme: dark)`, detected, not assumed).

## Templates

Any string that ends up in CSS is a template:

- `{{ formula }}` inserts a number (3 decimals at most).
- `{var:token}` becomes `var(--<ns>-token)`; `{prop:token}` becomes `--<ns>-token`; `{class:name}` becomes
  `<ns>-name` (also used for `@keyframes` names).
- In `motion-props`, a string leaf that is exactly one `{{ }}` becomes a number.

A recipe may only reference its own tokens and those of recipes listed in `uses`.

## Dials

A dial is `{ id, label, min, max, step, default, unit, drives }`. The mapping from dial to tokens is written as
formulas in `variables` (named intermediate values) and inside `{{ }}` in token and apply templates; `drives` lists
which variables or tokens read the dial, and the reader verifies the list. Formula language (no other syntax is
evaluated): numbers, `+ - * / %`, parentheses, dial and variable names, and `min max clamp(x,lo,hi) round(x,step)
abs sin(deg) cos(deg) pow sqrt mix(a,b,t)`.

Rule: at the default dials, every recipe whose `copied` is `values` or `adapted` renders exactly the source value.
The dials are then a continuous way to leave the library value, and "reset" returns to it.

Standard dials (so editors can reuse one control and the user learns them once):

| Dial | Used by | Formula idea |
|---|---|---|
| Height (0-3, default 1) | shadow ladder | per layer: `y = Y0*height`, `blur = B0*height*softness`, `spread = S0*height`, `alpha = A0*(0.6+0.4*height)` |
| Softness (0.5-2) | shadows | multiplies blur only |
| Light direction (-60..60 deg, 0 = overhead) | shadows | `x = -sin(light)*Y0*height`, `y = cos(light)*Y0*height`: one light for every layer, offsets keep their ratio |
| Speed (0.5-2) | all motion | durations `T0/speed`; springs: stiffness `K0*speed^2`, damping `C0*speed` (keeps the damping ratio) |
| Bounce (0-0.5) | spring-like motion | motion props: `bounce`; CSS: second bezier control point `1 + bounce*1.5` (overshoot) |
| Distance / Start size | enter-exit | translate in px / start scale |

Dark-mode shadow alpha for Tailwind-derived layers is `min(0.9, 3*A0*(0.6+0.4*height))`: ours, because Tailwind
publishes no dark values. Not yet checked by eye.

## apply

An array; each entry says how to use the recipe and what it needs:

| `type` | Output | `requires` |
|---|---|---|
| `class` | `.<ns>-<name> { declarations }` plus the equivalent Tailwind utilities in `tailwind` | none |
| `css` | whole rules: states, `@keyframes`, `@starting-style`, `::view-transition-*`, media queries | none (or motion) |
| `motion-props` | an object of `motion/react` props (`initial`, `animate`, `exit`, `whileHover`, `whileTap`, `layout`, `layoutId`, `transition`) | motion |

Recipe-level `requires` is `none` when at least one apply entry works with plain CSS, `motion` when all need the
library. The reader checks this. Every recipe states `reducedMotion` (shadows: `unchanged`); CSS entries include the
`prefers-reduced-motion` rule themselves.

## Preview

`preview.description` is what the card's recipe tile shows in words; `preview.states` lists the states the tile
must demonstrate (`rest`, `hover`, `pressed`, `focus`, `entering`, `leaving`, `before`, `after`). The reader draws
the tile from the tokens and the `css`, so there is no separate image to keep in sync.

## Converting a source into a pack

1. Take the file named in `source.url`; copy the value as published into a token at default dials.
2. Factor it into per-layer numbers and write the dial formulas so the default renders the same string (the
   checker script in the report does this comparison).
3. Fill `source` (url, licence from its licence file, attribution, `verified`).
4. Add `reducedMotion` and a one-line `preview`.
5. Validate: schema, then the semantic check (unknown tokens, unused dials, `drives` mismatches, duplicate
   names, default = source).

## Validation in this repo

Schema: `ajv-cli@5` with `--spec=draft2020 -c ajv-formats`, run from a temp directory so nothing is added to the repo
(command and output are in the research report). The semantic checks are a ~90-line Node script; if the format is
adopted it should move into Plumb's own pack reader as its first integration test.

## Open questions for the owner

See the end of `recipes.md`.
