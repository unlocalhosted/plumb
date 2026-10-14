# Establishing a design system with React Plumber: selectable presets and a morph

Status: plan, 2026-10-14. No code. Written against the tree at `5ccbffc` (branch `homepage-react-plumber`), after reading VISION, DESIGN, ROADMAP, MESSAGES, the README, `src/` (presets, decisions, adoption/init, imitation, ownership, rules, the Session apply engine), `overlay/src` (blueprint, blueprint-fix, choices, widget), the fixtures (`shadcn-theme`, `shadcn-preset`, `preset`, `plain-css`, `tailwind-min`, `tailwind-reset`, `imitation`), and three runs of the built CLI: the fixtures, a scratch plain-CSS project with no tokens, and AlgoRecall read-only (cache redirected with `PLUMBER_CACHE_DIR`; nothing written there).

Owner's direction (2026-10-14): do not derive a bespoke system from usage. Offer two or three proven presets the person picks at `plumber init`; the preset supplies the structure (which tokens exist, their roles, their relations), the project supplies the values (harvested from what the code already uses), a person reviews each slot, React Plumber writes the theme in the preset's format and morphs the code onto it with the exact-edit engine, points hand-built elements at the preset's components, and says what cannot be mapped. After that the preset is the judged system. Tuning the preset to a brand (deriving custom ladders) is a later, optional layer.

## 0. The gap, in one run

React Plumber judges code against tokens the project already has. A project with none gets this (scratch project, eight CSS rules, two inline styles, no custom properties):

```
Your theme has no spacing tokens, so 11 spacing values can't be checked   11 sites
Your theme has no colour tokens, so 10 colour values can't be checked     10 sites
…
spacing 0 of 11 use your tokens (0%)   color 0 of 10   radius 0 of 5   type 0 of 7
```

`plumber init` then writes inferred records for values used at three or more sites (`src/adoption/init.ts`, `usageProposals`): inline in the config as `inferred:spacing:12px`, `refs: []`, so nothing can reference them, no file declares them, and nothing moves the code onto them.

The other common start is the half-used system. AlgoRecall has `components.json`, 87 files under `src/platform/ui`, a shadcn `@theme inline` block, and still 40,222 sites of `provenance/type/framework` (`text-sm`, `font-medium`), 4,566 arbitrary values, 17,107 colour sites off tokens and 367 component overrides. That is what v0, Lovable and Bolt output looks like a few months in: shadcn's vocabulary is installed, the code drifts around it.

So React Plumber's job here is not invention. It is: detect what the app already half-uses, offer the matching starting system, fill its slots from the values in use with evidence, let a person review, write the theme in that system's format, morph the chaos onto it, and judge against it from then on.

## 1. Who this is for, and the journey

The person owns a vibe-coded React app and wants it to stop drifting: a solo builder, a product engineer who inherited it, or an agent running after `plumber install`. They do not know what a tier is. They know "these buttons don't match" and "I keep typing `#2563eb`".

Stations, each something the person can see:

| Station | What is true | What they see |
| --- | --- | --- |
| A. Start | A stack, maybe a half-used system, no judged tokens | `npx plumber`: the config-gap lines, plus `This looks like Tailwind v4 with shadcn/ui half in use (components.json, 14 components under src/components/ui). Run plumber init to pick a system and fill it from this code.` |
| B. Preset picked | `plumber init --preset shadcn` (or daisyui, open-props); config written with the preset; the fill proposed, read-only | Each slot with its proposed value, evidence, contrast check and alternatives. Nothing written to the theme yet. |
| C. Slots reviewed and written | `plumber fill --write` (after edits on the CLI or the page) writes the theme in the preset's format; the baseline records today's debt; tokens accepted in the ledger | `check` reports coverage against real tokens; `decisions/unaccepted` until accepted with a why. |
| D. Code morphed | `plumber morph --write`: literals and framework keys rewritten to the slots, file by file | A diff per file, counts, the leftovers named with why they need a hand; coverage goes up. |
| E. Atoms pointed at the preset | Hand-built buttons, inputs, cards become `imitation/Button` etc.; callers' overrides become `ownership/Button` naming the real variants; missing components get their install line | `plumber morph --components`: the list; an agent or person installs and replaces; the rules keep it true. |
| F. Judged | The preset is the system. `check`, the ledger, the blueprint and the agent loop work as they do today | Nothing new. |
| G. Later: tuned | The person replaces a preset value with a brand value, or derives a ladder from usage | A later layer; the slot model makes it a value change, not a structure change. |

Where React Plumber proposes and where a person decides:

| | React Plumber proposes | A person decides |
| --- | --- | --- |
| The preset | the one the stack points at (`components.json` → shadcn; `@plugin "daisyui"` → daisyUI; no Tailwind → Open Props) | which one; `--preset` overrides |
| Slot values | one value per slot from evidence, with confidence and two alternatives; the preset default when there is no evidence | keep, pick an alternative, type a brand value, leave the default |
| Pairs and relations | `--primary-foreground` from the text on primary elements, checked for contrast; `--radius-*` derived from `--radius` | override a pair, accept a failing contrast with a why |
| Whys | a factual sentence from evidence ("the fill of 214 buttons across 31 files") | rewrite or accept |
| Morph | every exact single-candidate edit, grouped by file | which files, when; the multi-candidate sites one by one on the page or through the agent |
| Components | which raw elements rebuild which preset component | install it, replace the sites (agent or hand) |

Agents are a first-class path, through the CLI only (ROADMAP: no MCP). `plumber init --preset shadcn --yes` runs non-interactively, `fill --agent` and `morph --agent` print the same proposals as instructions, and `skills/plumber/SKILL.md` gets a section "Adopting a system" that an agent follows only when the person asks. The existing rule stands for everything else: an agent never adds a token to pass a check, and the post-edit hook with `--strict-ledger` is untouched, because `fill --write` and `morph --write` are commands a person runs or explicitly asks for.

## 2. The presets

Three, selected by the stack. All three ride on `src/presets/index.ts` as it exists: `definePreset`, `loadPresets`, `records`, `componentConfigs`, `presetImitation`. What is added is a `slots` section (section 3) and a `write` section (how the theme file is laid out), both read by `fill`; nothing about how presets judge changes.

### 2.1 shadcn/ui (Tailwind v4): the default for Tailwind projects

Why first: most vibe-coded apps already carry it. The built-in preset today (`loadPresets`, the `components.json` branch) discovers the UI directory through the alias and gives every component the default ownership contract; `fixtures/shadcn-preset` proves `bg-red-500` on `Button` names `variant = default | destructive | ghost`. The engine already treats shadcn's theme shape correctly: raw values in `:root` and `.dark`, `@theme inline { --color-primary: var(--primary) }` as the bridge to utilities, backing definitions as source and not as uses (the `shadcn-theme-shape` layer, `src/decisions/theme-sources.ts`), so `bg-primary` judges as a project token and `text-gray-500` as a framework use.

What the preset supplies: the semantic colour slots and their pairs (`background/foreground`, `card/card-foreground`, `popover/popover-foreground`, `primary/primary-foreground`, `secondary/…`, `muted/muted-foreground`, `accent/…`, `destructive/destructive-foreground`, `border`, `input`, `ring`, `chart-1..5`, the `sidebar-*` set), `--radius` with its derived `--radius-sm/md/lg/xl` (`calc(var(--radius) ± n)` in `@theme inline`), Tailwind's own spacing, type, shadow and motion scales adopted as the project's (the `adopt` move, section 4.4), and the copied-in components as atoms and molecules (Button, Input, Textarea, Label, Badge, Card, Dialog, Sheet, Popover, DropdownMenu, Select, Tabs, Alert, Separator, Skeleton, Table), each with its install line (`npx shadcn@latest add button`), import (`@/components/ui/button`), the tags it replaces, and its variant axes read from the installed `cva` call (`ownership/components.ts` already does this).

### 2.2 daisyUI (Tailwind v4): theme-first, no owned component code

For projects that use daisyUI's classes (`btn`, `card`, `input`) or want colours as a theme and no component files. Detected by `@plugin "daisyui"` in the entry CSS or `daisyui` in dependencies. Slots: `--color-base-100/200/300`, `--color-base-content`, `--color-primary/secondary/accent/neutral` each with `-content`, `--color-info/success/warning/error` each with `-content`, `--radius-selector/field/box`, `--size-selector/field`, `--border`, `--depth`, `--noise`. Written as `@plugin "daisyui/theme" { name: "…"; default: true; … }` in the entry CSS. Atoms are classes, not files: `btn`, `btn-primary`, `input`, `card`; the preset's "components" are class fingerprints for imitation (a raw `<button class="rounded px-3 bg-primary">` → "use `btn btn-primary`") and there is nothing to own, so ownership contracts are empty. Assumption to verify in its layer: daisyUI's classes compile through `candidatesToCss` when the plugin is loaded by the project's Tailwind (they are plugin utilities, so they should; `fixtures/` has no daisyUI yet).

### 2.3 Open Props (vanilla CSS): custom properties in `:root`

For projects without Tailwind. Open Props is a `:root` of fixed-value primitives (`--size-1..15`, `--radius-1..6`, `--shadow-1..6`, `--font-size-0..8`, `--font-weight-1..9`, `--ease-*`, hue scales `--gray-0..12`, `--blue-0..12`, …) plus `open-props/normalize` which adds the semantic roles (`--surface-1..4`, `--text-1`, `--text-2`, `--brand`, `--link`, `--link-visited`). Two kinds of slot, then: the primitives have fixed values and the project's values **snap** to them (12px → `--size-3`, 6px → `--radius-2`, `0 1px 2px …` → `--shadow-1`); the roles are **filled** from the harvest (`--brand` from the primary heuristic, `--text-1`/`--text-2` from foreground/muted-foreground, `--surface-1..3` from background/card/muted). The preset's token records come from the installed package's CSS through the family-source form `records` already supports (`css:` paths resolved from the package root), so `decisions.<family>.from` is set by the preset and `fixtures/plain-css`'s manual config is not needed. Written as `src/theme.css` with `@import "open-props/style"`, `@import "open-props/normalize"` and a `:root { --brand: …; --text-1: … }` block, imported first from the main stylesheet. Atoms: none shipped; `morph --components` proposes nothing for Open Props beyond what the project's own class rules already are (section 6).

### 2.4 Considered and not in scope

| System | Why not now |
| --- | --- |
| HeroUI (NextUI) | A React component package with its own Tailwind plugin and semantic layer. Fits the dependency-preset path (`@heroui/*` would ship a `plumb` export) rather than a built-in; later, by its maintainers or as a contributed preset once the slot format is stable. |
| Radix Themes | Strong semantics (`--accent-9`, `--gray-1..12`) and owned components, but its own CSS and props model, not Tailwind utilities; the morph targets would be props, which is VISION layer 4 (structure edits). Later. |
| MUI | JS theme object and Emotion; the engine does not read CSS-in-JS (DESIGN §3.8). Out. |
| Mantine | JS theme plus `--mantine-*` variables and CSS Modules with hashed names; the stylesheet side is partly readable, the module side is not. Out until CSS Modules are. |
| Tailwind v3 projects | No `candidatesToCss`; the engine cannot judge or morph them. Out (open question 4). |

## 3. Slots: the preset data format

Extend `Preset` in `src/presets/index.ts` with two sections. Validation goes in `definePreset` beside the existing key check; `loadPresets` keeps them on the loaded entry; `fill` reads them.

```ts
slots: {
  // shadcn, abridged
  background:  { family: 'color', role: 'surface',       scope: 'page',        pairs: 'foreground', default: 'oklch(1 0 0)' },
  foreground:  { family: 'color', role: 'text',          on: 'background',     default: 'oklch(0.145 0 0)' },
  primary:     { family: 'color', role: 'interactive-bg', pairs: 'primary-foreground', chroma: 'high' },
  'primary-foreground': { family: 'color', role: 'text', on: 'primary' },
  secondary:   { family: 'color', role: 'interactive-bg', chroma: 'low', pairs: 'secondary-foreground' },
  muted:       { family: 'color', role: 'surface',       scope: 'quiet',       pairs: 'muted-foreground' },
  'muted-foreground': { family: 'color', role: 'text',   on: 'background', rank: 2 },
  accent:      { family: 'color', role: 'interactive-bg', when: 'hover',        pairs: 'accent-foreground', fallback: 'secondary' },
  destructive: { family: 'color', role: 'interactive-bg', hue: [10, 40],        pairs: 'destructive-foreground' },
  card:        { family: 'color', role: 'surface',       scope: 'raised',      pairs: 'card-foreground', fallback: 'background' },
  popover:     { family: 'color', role: 'surface',       scope: 'floating',    pairs: 'popover-foreground', fallback: 'card' },
  border:      { family: 'color', role: 'line' },
  input:       { family: 'color', role: 'line',          scope: 'field',       fallback: 'border' },
  ring:        { family: 'color', role: 'focus',         fallback: 'primary' },
  radius:      { family: 'radius', role: 'radius',       scope: 'control' },
  'radius-sm': { family: 'radius', derive: 'calc(var(--radius) - 4px)' },  // written, never filled
},
write: {
  format: 'shadcn',            // 'shadcn' | 'daisyui' | 'open-props'; each has one writer
  file: 'css entry',           // or a path for open-props
  scopes: [':root', '.dark'],  // where filled values go; '@theme inline' bridge written by the format
  adopt: ['type', 'radius', 'elevation', 'motion', 'spacing'],  // families whose framework keys become the project's
},
components: {                  // as today, plus the install vocabulary
  from: 'directory:<alias>',
  catalog: { Button: { tags: ['button', 'a[role=button]', 'input[type=submit]'], add: 'npx shadcn@latest add button', import: '@/components/ui/button' }, … },
},
```

`role` is the closed vocabulary the fill heuristics understand: `surface`, `text`, `interactive-bg`, `line`, `focus`, `radius`, `size`, `shadow`, `brand`. `scope`, `chroma`, `hue`, `when`, `rank`, `on`, `pairs`, `fallback`, `default`, `derive` and `snap` (Open Props: `{ snap: ['--size-1', … ] }`) are the only qualifiers. A preset that needs a heuristic the vocabulary lacks gets the vocabulary extended, not a callback: the format stays declarative so a person can read it and the three presets stay comparable.

The fill's output is one record per slot, serialised by `--json` and shown by the CLI and the page:

```json
{ "slot": "primary", "family": "color", "value": "#2563eb", "confidence": "evidence",
  "evidence": { "sites": 214, "files": 31, "props": { "background-color": 198, "border-color": 16 }, "owners": { "button": 171, "a": 27, "Button": 16 }, "examples": ["src/pages/Home.tsx:48", "…"] },
  "pair": { "slot": "primary-foreground", "value": "#ffffff", "contrast": 4.63, "ok": true },
  "alternatives": [{ "value": "#1d4ed8", "sites": 31, "note": "only under :hover" }, { "value": "#7c3aed", "sites": 12 }],
  "absorbs": [{ "from": "#2563eb", "sites": 198, "exact": true }, { "from": "bg-blue-600", "sites": 16, "exact": true }, { "from": "#2a63ea", "sites": 2, "delta": 0.011 }],
  "why": "the fill of 214 buttons and links across 31 files (drafted)" }
```

## 4. Filling the slots

### 4.1 Harvest

One pass over `report.declarations`, which already carries every lowered declaration from the four readers with `prop`, `resolved`, `refs`, `when`, `site`, `owner`, `origin`. Per judged family (`familiesFor` in `src/rules/families.ts`) it takes every declaration where `isJudged` holds and the value is a literal with a `resolved` amount, or references a framework token (`bg-gray-100`, `text-sm`, `rounded-lg`: `refs` naming a decision in `record.frameworkVariables`). Parts are split with the existing `partsFor` (so `margin: 0 0 8px` contributes `8px`, a gradient its stops, `transition: background 150ms ease-out` its time and curve). Zero, `auto`, percentages, `inherit`, neutral colours are skipped as provenance skips them. Opaque declarations are counted and never clustered.

Per raw value the harvest keeps: sites, files, the properties, the owners (tag or component name), the conditions from `when` (`:hover`, `:focus-visible`, `.dark`, `prefers-color-scheme`, media), and three example `file:line`. The owner's ancestry is not available from the report (the cascade is not computed); where a heuristic says "on body-level containers" it uses the owner tag and selector text, nothing deeper.

### 4.2 Colour clustering

Parse every part with the existing `oklab`; merge parts within OKLab distance 0.02 into one cluster (the merge is reported: "merged `#666` and `#676767` (1 site)"); distance 0.02–0.06 is reported as "near" and offered as an alternative, never merged silently. A cluster is split by scope: light (no dark condition) and dark (`.dark`, `[data-theme=dark]`, `prefers-color-scheme: dark`, which `when` already carries). Each cluster's sites are then split by property class:

- text: `color`, `fill`, `stroke`, `caret-color`, `text-decoration-color`
- surface: `background-color`, `background`, gradient stops
- line: `border*-color`, `outline-color`, `column-rule-color`
- focus: `--tw-ring-color`, `outline-color` or `box-shadow` colour under `:focus-visible`/`:focus`
- shadow: `box-shadow` colour components (kept with the shadow, not a slot)

and by owner class: interactive (`button`, `a`, `[role=button]`, `input[type=submit]`, `summary`, and discovered components named `*Button*`, `*Link*`, `Tab*`, `Toggle*`), field (`input`, `textarea`, `select`), page (`body`, `html`, `#root`, `main`, `.app`, selectors matching them), raised (owners that also carry a `box-shadow` or a `border` plus `border-radius` in the same rule or class string), floating (`[role=dialog|menu|listbox|tooltip]`, `dialog`, `DialogContent`, `PopoverContent`, `DropdownMenuContent`, `TooltipContent`), list (`li`, `tr`, `[role=option|menuitem|row]`), other.

### 4.3 Slot heuristics (shadcn names; daisyUI and Open Props map onto the same roles)

Ranks are by site count, light scope unless said otherwise; "contrast" is WCAG against the filled pair or `background`. Each slot records its confidence: `evidence` (a cluster met the rule), `fallback` (another slot's value, as the preset defines), `default` (the preset's value, no evidence).

| Slot | Rule | Pair / check |
| --- | --- | --- |
| `background` | surface on page owners; else the most used surface with L > 0.9 | — |
| `foreground` | most used text with contrast ≥ 4.5 on `background` and not under hover | contrast ≥ 4.5 |
| `primary` | most used high-chroma (C > 0.08) surface on interactive owners, not under hover | `primary-foreground`: most used text on those same owners; else white or near-black by contrast; contrast ≥ 4.5, warn at 3–4.5 |
| `secondary` | most used low-chroma surface on interactive owners that is not `primary` | `secondary-foreground` the same way |
| `muted` | most used low-chroma surface on non-interactive, non-page owners (sections, `pre`, `code`, list rows at rest) | `muted-foreground`: the second most used text on `background`, contrast between 4.5 and the foreground's |
| `accent` | a surface that appears only under `:hover`/`:focus-visible`/`[data-state=open]`/`aria-selected` on interactive or list owners | `accent-foreground` from the text under the same condition; fallback `secondary` |
| `destructive` | most used chromatic surface or text with OKLCH hue 10–40 on interactive or `[role=alert]` owners | `destructive-foreground` from the text on it |
| `card` | most used surface on raised owners; fallback `background` | `card-foreground` from text on raised owners; fallback `foreground` |
| `popover` | most used surface on floating owners; fallback `card` | likewise |
| `border` | most used line colour on non-field owners | — |
| `input` | most used line colour on field owners; fallback `border` | — |
| `ring` | most used focus colour; fallback `primary` | — |
| `chart-1..5` | the five most used chromatic `fill`/`stroke` on `svg`/`path`/`rect` owners, by rank; `default` when fewer | — |
| `sidebar-*` | filled only when an owner matches `aside`, `nav`, `Sidebar*`; else each takes its non-sidebar twin as fallback | — |
| `radius` | the mode of `border-radius` on interactive and field owners; `rounded-full`/`999px`/`50%` excluded | derived `radius-sm/md/lg/xl` are written from it; off-mode radii are reported with the derived step they snap to |
| dark scope | the same rules over the dark clusters; a slot with no dark evidence takes the preset's dark default and says so | contrast rerun per scope |

Ties and doubts are not hidden: a slot whose top two candidates are within 20% of each other's site count is marked `close` and both are shown. A pair that fails contrast is written anyway with a `warn` line and no why, so the person decides (the page shows the pair as the swatch chip on its surface, the chooser's existing plate form).

Spacing, type, shadow and motion in a Tailwind preset are not filled: they are **adopted**. The fill lists the framework keys in use per family (`text-sm` 4,120 sites, `font-medium` 2,900, `rounded-lg` 980, `shadow-md` 211, `ease-out` 40) and writes them as project keys with the same names and values; every site becomes a project-token use with no code edit. Literals and arbitrary values in those families snap to the nearest adopted key the same way `closest` in `rules/provenance.ts` already finds them (`gap-[13px]` → `gap-3`), and unused numeric spacing steps stay available because the adopted spacing scale is the whole numeric ruler (no explicit `--spacing-*` keys are written, so `numericSpacing.replaced` stays false; a declared ladder is the later tuning layer, section 10).

Open Props: the primitives snap (nearest `--size-*` within the same `close` tolerance, nearest `--radius-*`, nearest `--shadow-*` by layer count then blur, nearest `--font-size-*`, nearest `--ease-*` by function text), and `--brand`, `--text-1`, `--text-2`, `--surface-1..3`, `--link` fill by the `primary`, `foreground`, `muted-foreground`, `background`/`card`/`muted`, and link-text rules above. daisyUI: `base-100/200/300` ← `background`/`muted`/`border`-level surfaces, `base-content` ← `foreground`, `primary/secondary/accent/neutral` and their `-content` as above with `neutral` ← the most used dark low-chroma surface, `info/success/warning/error` by hue bands (blue 230–270, green 130–170, amber 60–100, red 10–40), `radius-field` ← the control radius, `radius-box` ← the raised-owner radius, `radius-selector` ← badge/checkbox radius, `size-field` ← the mode of control height when a literal, `border` ← the mode of border width.

### 4.4 What `fill --write` writes

The theme, in the preset's format, in the project's own files, after printing the diff:

- **shadcn:** `:root { … }` and `.dark { … }` with one line per filled slot, `/* why: … (drafted) */` and `/* evidence: 214 sites · 31 files · e.g. Home.tsx:48 */` comments above each, the `@theme inline` bridge for every slot (`--color-primary: var(--primary)`, `--radius-sm: calc(var(--radius) - 4px)`), and the adopted keys (`--text-sm`, `--text-sm--line-height`, `--font-weight-medium`, `--radius-lg`, `--shadow-md`, `--ease-out`) inside `@theme`. If the entry already has a `:root`/`.dark`/`@theme inline` block from an earlier `shadcn init`, the writer fills only the slots that are missing or still at shadcn's defaults, and lists the ones it left alone ("`--primary` is already set to `#2c50e8`; the code uses `#2563eb` at 214 sites: keep, or `fill --slot primary --write` to replace").
- **daisyUI:** a `@plugin "daisyui/theme" { name: "app"; default: true; … }` block in the entry CSS, one line per slot; `prefersdark` and a dark theme only when dark evidence exists.
- **Open Props:** `src/theme.css` with the two imports and the `:root` role block; `plumber.config.ts` gains nothing because the preset carries `decisions.<family>.from`.

Nothing is accepted yet; the ordinary mechanism carries the state: a token in the source without a ledger line is `decisions/unaccepted` (MESSAGES: "`{token}` is new in your theme and not yet accepted"). `plumber baseline` (or `init`'s baseline step) records today's debt and accepts the written tokens as `inferred`; `plumber accept-decisions --family color --why "…"` or the page's Accept records the reasons. `init`'s inline inferred records are retired in the first layer so there is one mechanism.

Rejected proposals are remembered: a slot the person sets to `default` or a value they type is recorded by the write itself (the file is the truth); a cluster the person declines as "not a token, leave it" is a ledger line `{"key":"fill:color:#7c3aed","kind":"declined","why":"…"}` so it is not offered again, reviewable like any other line.

## 5. The morph

`plumber morph [--family …] [--file <glob>] [--components] [--write] [--agent]`. Dry run by default: what would change, grouped by file, and the leftovers. `--write` applies.

It is built on what exists, not beside it. Once the slots are in the theme, the ordinary report already contains the edits: `provenance/color/framework` findings with the nearest project token for `bg-blue-600` → `bg-primary` (OKLab distance 0 after the fill, so one candidate), `provenance/color/tier` for `text-gray-500` when the fill made `--muted-foreground: var(--color-gray-500)`-style aliases (shadcn writes literals, so this path is the `framework` one), `provenance/<family>/by-value` for a literal equal to a slot (when `identity` is `reference`), `provenance/<family>` with one nearest adopted key for `gap-[13px]` → `gap-3` and `rounded-[6px]` → `rounded-md`. `structuredEdits` (`src/surfaces/edits.ts`) turns each into an exact `{start, end, from, to}` only when the authored text at the reported position matches, keeping variants and importance (`hover:bg-blue-700` → `hover:bg-primary/90` is **not** produced; it becomes a two-candidate site, see leftovers), replacing only the value in a stylesheet declaration (`background: #2563eb` → `background: var(--primary)`), and quoting inline values (`color: '#2563eb'` → `color: "var(--primary)"`). `morph` selects the edits where **exactly one** candidate fits (the rule `--agent` already uses) and writes them through `Session.apply` per file: hash-checked, re-derived from current source, refusing overlaps, links, and files outside the root. One apply per file in path order, so a refusal names its file and the rest still land.

Spacing and radius default to `identity: 'value'`, so an equal literal passes and produces no edit. `morph` runs its own report with `identity: 'reference'` for the requested families (a report option, not a config change), so every by-value site becomes an edit; the config is untouched.

Multi-candidate sites are not written. They are listed with their choices and reasons; the blueprint chooser (`blueprint-fix.js`) is where a person picks them one by one, and `morph --agent` prints them in the `--agent` shape for an agent.

What cannot be rewritten exactly, and what is said:

| Case | Why not | What `morph` prints |
| --- | --- | --- |
| `style={{ background: color }}`, `` `bg-${tone}` `` | opaque (`provenance/opaque-inline`, `existence/dynamic-class`) | `computed at runtime: pass it through a custom property, or map each value to a complete class` |
| `margin: 0 0 8px`, `border: 1px solid #e5e7eb` | shorthand with several parts; `replacement` refuses because the fix is a longhand | `shorthand: write border: 1px solid var(--border) by hand` |
| `bg-gray-100/50`, `text-blue-600/80` | modifiers after `/`; `replacement` refuses `/` | `has a modifier: bg-muted/50 (check it still reads right)` |
| `hover:bg-blue-700` where `#1d4ed8` is only a hover shade | the fill did not make it a slot (shadcn has no `primary-hover`); nearest is `primary` at a distance | `two readings: bg-primary/90 (shadcn's hover idiom) or keep; pick on the page` |
| a colour between two slots (`#64748b` between `muted-foreground` and `foreground`) | two candidates | listed with both and their whys |
| a value declined in the ledger | by the person | counted under "left by decision" |

Reversible: every write is a plain source edit shown as a diff first, in a git tree; `morph --write` refuses to write into files with unstaged changes unless `--force`, so the diff it leaves is exactly its own, and it ends with `git diff --stat` for the files it wrote. It keeps no undo stack; git is the undo. After writing it runs `check` on the written files and prints the coverage delta per family (`colour 31% → 88%`) and the leftovers count, the same numbers `check` prints.

## 6. Atoms and molecules: pointing at the preset's components

The preset's catalog says which elements its components replace. `morph --components` lists, per catalog component, the raw elements whose declarations match its root recipe:

- **Installed component** (`src/components/ui/button.tsx` exists): `imitation --suggest` already derives the exclusive root classes and variables of an existing component (`suggestImitation`, `src/imitation/index.ts`); the preset enables that fingerprint for every installed catalog component, so a raw `<button className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium …">` is `imitation/Button` ("This <button> rebuilds Button by hand … Use <Button> from @/components/ui/button"), and a caller's `<Button className="bg-red-500">` is `ownership/Button` naming `variant = default | destructive | …` from the real `cva` call. This is `fixtures/imitation` and `fixtures/shadcn-preset` combined, driven by the catalog instead of a hand-written config.
- **Not installed** (`Card` in the catalog, no `card.tsx`): raw elements are matched against the catalog's tag list and a recipe signature per component (for Card: a raised owner with `rounded-*`, `border`, `bg-card|background`, `shadow-*`, padding; for Input: a field owner with `rounded-*`, `border`, `h-*`, `px-*`, `focus-visible:ring*`). Matches print the install line and the sites: `Card  11 <div> in 4 files look like Card.  npx shadcn@latest add card, then replace: Home.tsx:22, …`.

React Plumber does not write the component or the replacement JSX: replacing `<button className="…">` with `<Button variant="ghost" size="sm">` is a JSX structure edit (VISION layer 4, not built), and an exact-edit engine that only replaces attribute tokens must not fake it. The handoff is `morph --components --agent`: per component, the install line, the import, the sites, the axis values inferred from the differences between the matched elements (colour differences → `variant`, spacing and type differences → `size`), and the loop rules; the agent installs, replaces, runs `plumber check --changed --agent` until `0 new`. A person can do the same from the text output. Once the component is installed, the rules above keep it true without any further step, because the catalog fingerprint is live.

Molecules are the catalog's composite components (Dialog, Sheet, DropdownMenu, Tabs, Alert, Form fields): the same matching over structure (a floating owner with a heading, a body and a row of buttons → Dialog; a Label above an Input → the Field pattern). They come after atoms have run on a real app, as their own layer, because the match is only as good as the atom identities it reads.

daisyUI's atoms are classes: the catalog maps `btn`, `input`, `card`, `badge`, `alert` to recipe signatures and the fix is a class string ("use `btn btn-primary`"), which `replacement` cannot write as one exact edit (several tokens replace several tokens), so these go to the agent or the hand. Open Props has no atoms; a project's own `.btn` rules remain its atoms and `imitation` fingerprints on stylesheet classes (`classRule`) keep them true once configured.

## 7. The vanilla-CSS story

No Tailwind: the stylesheet reader lowers every rule with nesting resolved, inline styles are read, and `fixtures/plain-css` already passes with a `css:` decision source. With this plan:

- `init` proposes Open Props. The preset's `decisions.<family>.from` reads `node_modules/open-props/open-props.min.css` (the family-source form in `records`), so `--size-*`, `--radius-*`, `--shadow-*`, `--font-size-*`, `--ease-*` and the hue scales are decisions on day one, origin `project` as preset records are, published so `dead/*` stays quiet.
- `fill` snaps primitives and fills the normalize roles; `fill --write` writes `src/theme.css` and the import.
- `morph` rewrites `padding: 12px` → `padding: var(--size-3)`, `color: #666` → `color: var(--text-2)`, inline `padding: 12` → `padding: "var(--size-3)"`; shorthands are the common leftover and the list says so.
- Dark mode arrives as `@media (prefers-color-scheme: dark)` or `.dark`; a role with dark evidence gets both definitions, otherwise Open Props' own `color-scheme` handling stays as the person left it.
- Atoms stay the project's class rules; `morph --components` prints nothing for Open Props and says so.
- Out: CSS Modules with hashed names, CSS-in-JS, cascade-aware matching (the cascade is observed only in the overlay's computed route).

## 8. UX surfaces

### 8.1 CLI

Vocabulary per MESSAGES: token, scale, your theme, raw and named tokens; never "decision", "provenance", "slot" (say "token" and the preset's name for it).

`npx plumber` on AlgoRecall-like input adds, after the config-gap and framework lines:

```
This looks like Tailwind v4 with shadcn/ui half in use: components.json, 14 components under src/components/ui, no :root tokens.
Next: plumber init to pick a system (shadcn/ui, daisyUI, or Open Props) and fill it from this code.
```

`plumber init` (interactive; `--preset <name> --yes` for agents):

```
Pick a system for this project.  Enter keeps the recommended one.
  1. shadcn/ui    recommended: components.json and 14 components found   semantic colour tokens + owned components
  2. daisyUI      theme-first colours, components as classes, no component files
  3. Open Props   for projects without Tailwind (this one has Tailwind v4)
> 1

Wrote plumber.config.ts: presets shadcn, 14 components, 4 habits.
Filling shadcn/ui's tokens from 49,170 colour values and 5,937 corners:
```

followed by the fill, which is also `plumber fill`:

```
colour  light                                   evidence                                       pair
  --background      #ffffff                     body, 3 sites                                  --foreground 14.9:1 ok
  --foreground      #111827                     text, 6,120 sites in 212 files                 
  --primary         #2563eb                     fill of 214 buttons and links in 31 files      --primary-foreground #ffffff 4.6:1 ok
                    close: #1d4ed8 (31 sites, only under :hover) · #7c3aed (12 sites, Pricing.tsx)
  --secondary       #f3f4f6                     fill of 88 quiet buttons                       --secondary-foreground #111827 13.1:1 ok
  --muted           #f9fafb                     behind code and captions, 402 sites            --muted-foreground #6b7280 4.8:1 ok
  --accent          #eff6ff                     hovered rows and menu items, 77 sites          --accent-foreground #111827 ok
  --destructive     #dc2626                     31 delete buttons                              --destructive-foreground #ffffff 4.5:1 ok
  --card            #ffffff  = background       no raised surface differs from the page
  --popover         #ffffff  = card
  --border          #e5e7eb                     borders, 1,904 sites
  --input           #d1d5db                     field borders, 140 sites
  --ring            #2563eb  = primary          no focus colour of its own
  --chart-1..5      shadcn defaults             no svg fills found
colour  dark                                    no dark evidence: shadcn's neutral dark defaults, marked default
corners
  --radius          6px                         rounded-md on 1,180 controls; rounded-lg (402) → --radius-lg, rounded-[6px] (14) → rounded-md
adopted as yours, no code changes
  type      text-xs text-sm text-base text-lg text-xl text-2xl · font-medium font-semibold font-bold     40,222 sites
  spacing   Tailwind's numeric scale                                                                    39,184 sites
  shadow    shadow-sm shadow-md shadow-lg                                                               2,720 sites
  motion    ease-out, duration-150/200/300                                                              68 sites

Nothing written. Change a token with plumber fill --slot primary --value "#1e40af", or on the page (Alt+B, S).
  plumber fill --write      writes :root, .dark and @theme inline into src/index.css, as a diff first
```

`plumber fill --write`:

```
Wrote 27 tokens to src/index.css (:root, .dark, @theme inline) and 11 adopted keys to @theme.
They are proposed, not accepted: plumber check lists them as new in your theme.
Next: plumber baseline to record today's drift, then plumber morph to move the code onto them.
```

`plumber morph`:

```
morph (dry run)  colour, corners   identity: reference for this run

src/pages/Home.tsx        23 edits   bg-blue-600 → bg-primary ×6 · text-white → text-primary-foreground ×6 · text-gray-500 → text-muted-foreground ×8 · border-gray-200 → border-border ×2 · rounded-[6px] → rounded-md
src/pages/Pricing.tsx     14 edits   …
src/styles/legacy.css      9 edits   background: #2563eb → var(--primary) ×3 · color: #6b7280 → var(--muted-foreground) ×4 · …
… 29 more files

needs a hand (61)
  src/pages/Home.tsx:48     hover:bg-blue-700        two readings: hover:bg-primary/90 or keep; pick on the page (Alt+B) or plumber morph --agent
  src/styles/legacy.css:12  border: 1px solid #e5e7eb  shorthand: write border: 1px solid var(--border)
  src/App.tsx:71            bg-gray-100/50           has a modifier: bg-muted/50
  src/Chart.tsx:30          style={{ fill: color }}  computed at runtime: pass it through a custom property
  … 57 more

would move 1,912 of 2,011 colour and corner sites in 33 files.   colour 65% → 93%   corners 97% → 99%
Run plumber morph --write to apply. The working tree is clean for these files.
```

`plumber morph --components`:

```
Button    installed   61 raw <button>/<a> rebuild it   →  <Button variant="default|secondary|ghost|destructive" size="sm|default">   Home.tsx:22, …
Input     installed   19 raw <input>                   →  <Input>                                                                 Login.tsx:40, …
Card      not installed   11 <div> in 4 files look like Card   npx shadcn@latest add card, then replace: Home.tsx:22, …
Badge     not installed   7 <span> look like Badge             npx shadcn@latest add badge
Replacing elements is a structure edit React Plumber does not make. plumber morph --components --agent hands it to an agent.
```

### 8.2 The blueprint

The blueprint already draws every drift in view where it lives and fixes it from a chooser (`blueprint.js`, `blueprint-fix.js`, the ladder and swatch forms in `choices.js`). The fill review is the same picture with one panel and one more ink.

- **The system panel** (dock button, `S`): one tab per family of the chosen preset. Colour shows each slot as a row: the swatch on its pair (the chooser's existing plate form), the name, the value, the evidence count, the contrast figure, and the alternatives as chips. Pointing at a row lights every element in view that the slot absorbs (the `MarkLayer` already knows which element carries which value); pointing at an alternative chip lights its elements instead. That is how a person checks that `--primary` is one thing and `#7c3aed` on the pricing page is not it. On a row: pick an alternative, type a value, set to default, edit the why. Corners shows the radius ladder with the mode marked. Adopted families show their keys and counts, read-only.
- **Proposed ink.** With a fill in hand (fetched from a new read-only `fill` route on the Session), a mark on a raw value reads `#2563eb → primary (proposed)` in a dashed amber, the "not yet real" of the three inks (amber off, white current, mint picked).
- **Write tokens** under the panel shows the theme diff and writes it (through the Session, hash-checked, the same refusal on a changed file). **Accept** per family takes a why and writes the ledger lines (open question 1). Then the ordinary chooser takes over for multi-candidate sites, and the punch list's Write runs the morph for the files in view through the same `apply`.
- Reduced motion, contrast on the paper, keyboard: as the blueprint already does (every row a button, `1–9` picks, Esc closes).

## 8.5 Why the first layer is shadcn, colour and radius

Every family reaches the preset by one of three paths, and only one of them needs new machinery.

| Path | Families | What Plumber does | Code edits |
| --- | --- | --- | --- |
| **Filled from evidence** | colour, radius | Harvests every value in use, infers which one is `--primary`, `--muted-foreground`, `--border`, `--radius`, writes the theme, rewrites the code | yes |
| **Adopted** | type, spacing, shadow, motion | `text-sm`, `gap-3`, `shadow-md` are already a scale; Plumber writes them as the project's own keys | none |
| **Built on tokens** | atoms and molecules (Button, Input, Card) | Points hand-built elements at the preset's components | structural, via an agent |

So the first layer is colour and radius because:

1. **Colour is the hard part, and the payoff.** It is the one family where Plumber must infer meaning: which blue is the brand, which grey is muted text, which is a border. If that inference holds on a real app, everything after it is easier. AlgoRecall alone has 17,107 colour sites off any token.
2. **Radius is the simplest slot.** One value (the most common corner on controls) with `sm`/`md`/`lg` derived from it. It proves the "one value, a ladder derived from it" shape at almost no extra cost.
3. **Together they run the whole loop once.** `init → fill → fill --write → morph --write → check`. Every new piece (harvest, clustering, slot rules, the theme writer, the morph) is built once, on one fixture, closed by one end-to-end test. Later layers add slots and families to a loop that already works.
4. **Adopted families can't prove the morph.** They change no code, so a slice made of them would ship without proving the part users care about: their code moving onto a system.
5. **Components need the tokens first.** A shadcn `Button` is `bg-primary`, `rounded-md`; pointing raw buttons at it before those tokens exist means nothing.
6. **Small enough to be right.** Smaller proves nothing end to end; bigger mixes three kinds of work and is hard to verify.

### Worked example: one card through layer 1

Example values, shaped like the run on AlgoRecall.

**The app today** (a vibe-coded pricing card):

```jsx
<div className="rounded-[6px] border border-gray-200 bg-white p-5">
  <p className="text-gray-500 text-sm">Everything in Free, plus unlimited projects.</p>
  <div className="bg-gray-50 rounded-md text-xs text-gray-500">Billed yearly.</div>
  <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-[6px]">Upgrade</button>
  <button className="bg-gray-100 text-gray-900 rounded-md">Compare plans</button>
</div>
```

**1. Pick.** `npx plumber init` recommends shadcn/ui because `components.json` exists; Enter keeps it (`--preset shadcn --yes` for CI and agents).

**2. Harvest.** Every colour and corner in use, grouped (near-identical colours merge), each group remembering how it is used:

| Value | Used as | Sites |
| --- | --- | ---: |
| `#2563eb` | fill on buttons and links | 214 |
| `#111827` | text | 6,120 |
| `#6b7280` | secondary text | 1,388 |
| `#e5e7eb` | borders | 1,904 |
| `#f3f4f6` | fill on quiet buttons | 88 |
| `#f9fafb` | behind captions and code | 402 |
| `#1d4ed8` | fill, only under `:hover` | 31 |
| `6px` | corners on controls | 1,180 |

**3. Fill.** Each shadcn token gets a value with its evidence and a contrast check; close candidates are offered as alternatives, never merged silently:

| Token | Proposed | Evidence | Check |
| --- | --- | --- | --- |
| `--primary` | `#2563eb` | fill of 214 buttons and links in 31 files; alternatives `#1d4ed8` (hover only), `#7c3aed` (12 sites, Pricing.tsx) | white on it 5.2:1 |
| `--foreground` | `#111827` | text, 6,120 sites | 14.9:1 |
| `--muted-foreground` | `#6b7280` | second text colour | 4.8:1 |
| `--muted` | `#f9fafb` | behind captions, 402 | |
| `--secondary` | `#f3f4f6` | quiet buttons, 88 | 13.1:1 |
| `--border` | `#e5e7eb` | borders, 1,904 | |
| `--ring` | = primary | no focus colour of its own (fallback) | |
| `--radius` | `6px` | `rounded-md` on 1,180 controls | |

The person keeps each value, picks an alternative, or types a brand colour. Nothing is written yet.

**4. Write.** `plumber fill --write` shows the diff, then writes the theme in shadcn's format:

```css
:root {
  /* why: the fill of 214 buttons and links (drafted) */
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --foreground: #111827;
  --muted: #f9fafb;
  --muted-foreground: #6b7280;
  --secondary: #f3f4f6;
  --border: #e5e7eb;
  --radius: 6px;
}
@theme inline {
  --color-primary: var(--primary);
  --radius-md: var(--radius);
  /* … */
}
```

The tokens are proposed, not accepted: `plumber baseline` records today's drift, and accepting a token takes a reason (drafted reasons count, marked as drafted).

**5. Morph.** `plumber morph --write` rewrites every site with exactly one fitting token, file by file. The app looks the same; the code now speaks the system:

```jsx
<div className="rounded-md border border-border bg-card p-5">
  <p className="text-muted-foreground text-sm">…</p>
  <div className="bg-muted rounded-md text-xs text-muted-foreground">…</div>
  <button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md">Upgrade</button>
  <button className="bg-secondary text-secondary-foreground rounded-md">Compare plans</button>
</div>
```

`hover:bg-blue-700` becomes `hover:bg-primary/90` by the shadcn preset's hover rule (owner decision 3). What can't be rewritten exactly is listed, never guessed:

| Site | Why it needs a hand |
| --- | --- |
| `bg-gray-100/50` | has a modifier: check `bg-muted/50` still reads right |
| `style={{ fill: color }}` | computed at runtime: pass it through a custom property |
| `border: 1px solid #e5e7eb` | shorthand: write `border: 1px solid var(--border)` |

It ends with the coverage change, the same numbers `check` prints: `colour 65% → 93% on tokens`.

## 9. Layers

Owner's rules applied: one layer at a time, finished and verified before the next; integration and e2e tests only, through the real CLI on fixtures and real Chromium for the overlay; no unit tests. Engine, CLI and preset layers are Codex work (`gpt-6.1-sol`); the blueprint layer is Claude. Each layer ends with its e2e green, a `docs/layers/` note, and a read-only run on AlgoRecall recorded in the note (cache redirected; its untracked `.plumber/` and `plumber.config.ts` are never written).

| # | Layer | What is built | E2E proof that closes it | Fixtures | Size |
| --- | --- | --- | --- | --- | --- |
| 1 | The slice: shadcn, colour and corners, end to end | `slots`/`write`/`catalog` on `Preset`; the built-in shadcn preset gains colour and `radius` slots; the harvest and the colour heuristics for `background`, `foreground`, `primary(+fg)`, `secondary(+fg)`, `muted(+fg)`, `border`, `input`, `ring`, `radius` (light only; the rest `default`/`fallback`); `init --preset shadcn [--yes]` writes the config and prints the fill; `fill`, `fill --write` (shadcn format, `:root` + `@theme inline`); `morph` dry run and `--write` for class sites with one candidate; `init`'s inline inferred records retired | On `fixtures/morph-shadcn`: `init --preset shadcn --yes` writes `presets: ['shadcn']`; `fill --json` equals the committed expectation (values, evidence counts, pair contrast); `fill --write` leaves `src/styles.css` equal to the committed theme; `check` lists the written tokens as unaccepted and colour coverage above 0; `morph --write` rewrites `bg-blue-600`→`bg-primary`, `text-gray-500`→`text-muted-foreground`, `border-gray-200`→`border-border`, `rounded-[6px]`→`rounded-md`, leaves `hover:bg-blue-700` and `bg-gray-100/50` listed, and the files equal the committed after-state; `baseline` then `check` is green; a second `morph` writes nothing | `fixtures/morph-shadcn`: Tailwind v4, `components.json`, `button.tsx` installed, raw buttons and inputs, palette classes, `rounded-[6px]`, a hover shade, a `/50` modifier, one literal in a `.css`, one dynamic inline | M |
| 2 | The rest of shadcn's slots, and dark | `card`, `popover`, `accent`, `destructive`, `chart-*`, `sidebar-*`, the dark scope, the `close`/`warn`/contrast lines, declined clusters in the ledger, `fill --slot <name> --value`, filling into an existing shadcn `:root` without clobbering | Fixture gains a `.dark` block, a raised card, a dialog, a delete button, a hover-only surface: `fill --json` fills each from evidence with the expected confidence; a pre-set `--primary` is left alone and reported; a failing pair prints `warn`; `fill --slot primary --value` rewrites one line | 1 + additions | M |
| 3 | Morph widening | stylesheet and inline sites, `--family`, `--file`, reference-identity run, clean-tree refusal, `git diff --stat`, the leftover table with every reason, coverage delta, the adopt write for type/radius/shadow/motion and `gap-[13px]`-style snaps | Fixture CSS and inline sites rewritten; shorthand, modifier, dynamic, two-candidate each appear exactly once in the leftovers with their reason; `text-sm` sites go from framework to project with no code edit; a dirty file is refused by name; the printed delta equals `check`'s | 1 | M |
| 4 | Components | the catalog on the shadcn preset; installed components get live fingerprints; recipe matching for uninstalled ones; `morph --components` and `--agent` | Fixture: raw buttons are `imitation/Button` after `init`, a caller's `bg-red-500` on `Button` is `ownership/Button` naming `variant`; the Card look-alikes print the install line and sites; a committed `card.tsx` dropped in flips them to `imitation/Card` with no config change | 1 + `card.tsx` | M |
| 5 | Agent path | `init --yes`, `fill --agent`, `morph --agent`, `morph --components --agent`, the SKILL section, the `npx plumber` next-step line | A recorded agent run (Codex or Claude) on the fixture: asked to adopt shadcn, it runs `init --preset shadcn --yes`, reports the fill for the person, is told to write, runs `fill --write`, `morph --write`, resolves the two-candidate sites by reason, installs Card from the printed line, replaces the sites, ends at `0 new` without editing the ledger; the transcript is the snapshot | 1 | S |
| 6 | Blueprint: the system panel | the panel, proposed ink, pointing lights elements, alternatives, type a value, Write tokens through the Session, Accept with a why, punch-list morph for the view (Claude) | Playwright on the overlay demo seeded from the fixture: `Alt+B`, `S` shows the colour tab with `--primary #2563eb 214`; pointing at it lights the buttons; picking the alternative changes the value; Write tokens changes `src/styles.css` to the picked value; Accept writes the ledger line; the punch list's Write rewrites the sites in view; the host-page footprint is empty after leaving, as `blueprint.test.mjs` already checks | overlay demo + 1 | L |
| 7 | daisyUI preset | slots, the `@plugin "daisyui/theme"` writer, class-fingerprint atoms, detection by `@plugin "daisyui"`; first proof that plugin classes compile through `candidatesToCss` | `fixtures/morph-daisyui`: `init` recommends daisyUI; `fill --write` writes the theme block; `bg-blue-600` → `bg-primary`; a raw button matches `btn` and prints the class fix for the agent | new | M |
| 8 | Open Props preset | the package-CSS decision source, snap slots, normalize roles, the `theme.css` writer, `init` recommending it when Tailwind is absent | `fixtures/morph-open-props` (vanilla, `open-props` installed): `--size-*` are decisions after `init`; `fill` snaps 12px → `--size-3` and fills `--brand`; `morph --write` rewrites rules and inline styles; shorthands are the leftovers | new | M |
| 9 | Tune to brand (optional, later) | per-slot brand overrides are already a value edit; this layer adds deriving a project ladder from usage for spacing/type (the explicit `--spacing-*` keys that flip `numericSpacing.replaced`), with the "becomes off-ladder" list | its own brief when a real app asks | | M |
| 10 | Molecules | catalog composites matched by structure (Dialog, Field, Tabs) | its own brief after 4 has run on a real app | | M |

## 10. Risks, open questions, what not to build

### Risks

- **The heuristics name the wrong thing.** A marketing page's purple CTA can outvote the app's blue. Mitigation: `close` is shown, alternatives are one click, and pointing at a row on the page lights the elements, which is the check a person actually makes.
- **No dark evidence.** Most vibe-coded apps have none; shadcn's defaults go in marked `default`, and the proposal says so rather than lightening or darkening values itself.
- **Filling into an existing shadcn theme.** AlgoRecall already has `:root` values; a writer that overwrites them breaks the app. Rule: never replace a set value without `--slot … --write`; list the differences.
- **The `@theme inline` bridge and the engine.** Proven for colour by `fixtures/shadcn-theme` and the theme-sources layer; `--radius-*` derivations through `calc(var(--radius) - 4px)` resolve by `resolveValue`'s `calc` folding only when `--radius` is static (it is, in `:root`); confirm in layer 1 that `rounded-md` judges as a project token after the write.
- **daisyUI classes through `candidatesToCss`.** Plugin utilities should compile when the project's Tailwind loads the plugin; unverified, so layer 7 begins with that check and stops if it fails.
- **Big apps.** AlgoRecall has 292,214 declarations; the harvest is one pass over the report, but the CLI must group hard (top owners and three examples per slot; `--json` for everything) or the fill is unreadable.
- **Two write paths.** `apply` (hash-checked, re-derived) and `fill --write` (a theme block) are different writes; the page's Write tokens must go through the Session so the "file changed since" refusal holds. `e2e/edits.test.mjs` asserts `apply` never touches `src/styles.css`; the new write is a separate route and that test stays.
- **`identity: 'reference'` for the morph run** makes every equal literal an edit on purpose; a person who wants CI to keep accepting equal literals is unaffected because the config is not changed.

### Open questions for the owner

1. **May the page write the ledger?** `blueprint-fix-ux.md` §5 decided acceptance has no server endpoint. Accepting tokens from the system panel wants what `accept-decisions --why` does, with the why typed on the page and `by` from git. Recommendation: allow it for decision entries only, never exceptions, through a Session route that refuses an empty why; otherwise the panel copies the command and the person leaves the page at the moment the live editor is most useful.
2. **Drafted whys.** Is a factual sentence from evidence ("the fill of 214 buttons across 31 files") acceptable as the recorded why when the person accepts without rewriting? Recommendation: yes, marked `drafted` in the comment, with `check --decisions` still warning until it is rewritten.
3. **shadcn's hover idiom.** The morph cannot turn `hover:bg-blue-700` into `hover:bg-primary/90` as one exact edit without inventing the `/90`. Offer it as the two-candidate choice (recommended), or add a preset rule that writes the idiom?
4. **Tailwind v3.** Out (recommended): the engine cannot judge or morph it, so a written `theme.extend` would be a token file with no judge behind it.
5. **Interactive `init`.** The pick-a-system prompt is the first interactive step in the CLI (`init` is non-interactive today). Prompt by default with `--preset`/`--yes` to skip (recommended), or always require `--preset`?

### What not to build

- Deriving a bespoke system from usage as the first path. It is layer 9, optional, after a preset is in place.
- Component code generation or JSX replacement. The catalog's install line and the agent handoff are the honest path until VISION layer 4 exists.
- Automatic dark-mode generation; a token editor of its own; a hosted page; DTCG as the primary store.
- Cascade-aware matching, or any claim that a fill "looks right".
- A score for "how systematised" the app is; coverage per family already says it.
- HeroUI, Radix Themes, MUI, Mantine presets (section 2.4), Tailwind v3, CSS-in-JS, CSS Modules with hashed names, Vue and Svelte.

## Owner decisions (2026-10-14)

1. The blueprint page may write **decisions only** (with a typed why), never exceptions.
2. Drafted factual whys **count as the recorded why** when accepted unedited, marked as drafted.
3. shadcn hover shades: a **preset rewrite rule** (a darker hover shade becomes `hover:bg-primary/90`), not a per-site choice.
4. Tailwind v3 is out.
5. `plumber init` **prompts** for the preset with the detected stack preselected; `--preset` or `--yes` skips the prompt.
