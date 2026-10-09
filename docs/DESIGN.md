# Plumb: design

Status: design, 2026-10-09. No code exists. Plumb checks that UI code uses the design decisions a team has made. The name comes from the builder's line that shows whether a wall is vertical.

Sources: `docs/research/orbit-shadcn-lint.md` (Orbit, `@shadcn/lint`), `docs/research/react-doctor-landscape.md` (react.doctor and the landscape), `docs/research/shadcn-lint-probe.md` (a raw `@shadcn/lint` run over MetalUI: 4,218 findings, roughly 95% noise), and an earlier draft that this file replaces. The draft's engine idea is kept; its reliance on MetalUI's own files is dropped.

## 0. Summary

Plumb is a standalone CLI for Tailwind v4, CSS and React projects. It lowers every styling choice in a codebase (a utility class, an arbitrary value, a stylesheet rule, an `@apply`, an inline `style` object) to the CSS declaration it actually produces, using the project's own Tailwind compiler and CSS parser, and judges those declarations against the team's decisions: the token ladders in the theme, the properties each component owns, and the habits the team has written down. Exceptions and new decisions go through one reviewable ledger with a reason each; there are no inline suppressions. Output is for humans, CI, and agents in the same shape: the site, what it compiles to, the decision to use instead, and the reason recorded with that decision. It does not prove that anything looks right.

Compared with Orbit, Plumb reads decisions from the project's own sources instead of three hand-kept places that disagree, and judges ownership per CSS property instead of banning tags or attributes. Compared with `@shadcn/lint`, judging the compiled declaration instead of the class spelling puts plain CSS, `@apply`, named utilities and inline styles under one set of rules. Because the stylesheet graph is lowered too, 88% of the probe's unknown-class findings (classes declared in project CSS that the theme reader never saw) go away. From react.doctor it takes the CLI-first UX, baselines, change-scoped gates and agent handoff, but not its score.

## 1. Using Plumb

This section walks through each place Plumb runs: the first run, a local check, CI, the editor, and agent loops.

Every sample of output, config and ledger in this document is illustrative. The counts, timings and `why` sentences in them are invented to show the shape; the only measured numbers are the MetalUI benchmark figures in section 9, and section 9 says which of those were hand-verified.

### 1.1 First run on an existing repo: `npx plumb`

Zero config. Plumb finds the Tailwind v4 entry CSS (the stylesheet that `@import "tailwindcss"`, nearest to the package root; if there are several it lists them and asks), loads the theme through Tailwind, discovers components (see 2.3), lowers everything under `src/` and `app/`, and prints a report. The first run always exits 0. It reports findings and proposes a config.

```
$ npx plumb
plumb 0.1  apps/docs  tailwind 4.3.3  theme apps/docs/src/styles.css (+3 imports)
lowered 234 tsx, 21 css  →  18,402 declarations   1.9s

no plumb.config.ts yet: judging against the keys this project's CSS declares
(Tailwind's 300 default keys found and set aside as framework defaults; see 2.5)

spacing     585 of 669 from the ladder   84 off it in 39 files
colour      1,912 of 1,987 from tokens   75 literals (hex/rgb) in tsx   40 framework palette uses
existence   19 classes compile to nothing
inline      219 style={{ }} sites with literal values
habits      none enabled   (`plumb init` proposes the built-ins it can see breaks for)

Run `plumb init` to write what Plumb found as decisions you can edit,
then `plumb baseline` to record today's debt so CI only fails on new drift.
```

Zero config runs provenance, existence and inline lowering only; no habit runs until the config names it, because a habit is a team rule and Plumb shouldn't assume one. `plumb init` writes `plumb.config.ts` with every decision source it inferred, each marked `inferred: true` so a reader knows a human has not yet looked at it, and lists the built-in habits with the number of breaks each would report, commented out. `plumb baseline` records all current findings as debt in the ledger (section 5). After those two commands, `plumb check` is green and stays green until someone adds drift.

Plumb asks for a written config after the first run instead of inferring decisions forever, because inference only describes what the code does today. A ladder inferred from the theme changes silently when an agent adds `--spacing-13`. The config names the source (`theme:--spacing-*`) and the ledger records the accepted set, so a new key is visible as a decision change (5.3).

### 1.2 The report, locally

`plumb check` prints findings grouped by fix, not by file. One off-ladder value used at twelve sites is one entry with twelve locations, because it has one answer. Each entry quotes the decision to use and the reason the decision carries.

```
provenance/spacing  gap: 10px is not a spacing decision
  nearest  8px  --mu-space-8
           12px --mu-space-12  "between related parts: a label and its control"
  apps/docs/src/pages/components/Fan.tsx:41        className="gap-10"           → gap-mu-space-12
  apps/docs/src/pages/foundations/Type.tsx:88      style={{ gap: 10 }}          → className="gap-mu-space-12"
  apps/docs/src/pages/library.css:120              .library-row { gap: 10px }   → gap: var(--mu-space-12)
  … 9 more   plumb show provenance/spacing "gap: 10px"
```

The three sites use three syntaxes for the same declaration, so Plumb reports them as one finding.

### 1.3 CI and the pull request

`plumb check --base origin/main` (the GitHub Action does this by default) fails on findings introduced by the branch, reports pre-existing debt separately, and never fails on debt alone. It also fails when the ledger grew without a reason, or grew at all if the repository asks for reviewer approval of ledger changes (5.4). Output: annotations on the changed lines, one sticky comment with the per-family coverage delta, and a SARIF file for code scanning.

```
plumb  +3 new  −7 fixed  312 debt (−7)   ledger +1 exception (needs review from @design)
spacing 87% → 88%   colour 96%   hover 0% → 12%   existence 19 → 12
```

### 1.4 The editor

v1 ships no editor plugin. `plumb check --changed --watch` prints as files change. An ESLint/Oxlint plugin that surfaces Plumb's cached findings as squiggles is v2 (7.2).

### 1.5 Agents

Agents are the main users of the fix loop. Plumb gives them three things.

1. `plumb agent-docs` writes `PLUMB.md` (and a block for `AGENTS.md`/`CLAUDE.md`) from the decision record: every ladder with its values and whys, every component with what callers may set, every habit with its reason, and the loop below. Docs and enforcement come from one record so they cannot disagree, which is the gap research/orbit-shadcn-lint.md found in Orbit (docs permit `className` on Box; the lint rejects it).
2. `plumb check --changed --agent` prints findings as fix instructions, one per decision, with the exact edit and a terminal state the agent may legitimately reach:

```
## 1 of 4  provenance/spacing  gap: 10px
Sites: apps/docs/src/pages/components/Fan.tsx:41, …
Compiles to: gap: 10px (via class `gap-10`, theme --spacing: 1px)
Decisions: 8px (--mu-space-8), 12px (--mu-space-12, "between related parts: a label and its control")
Edit: replace `gap-10` with `gap-mu-space-12`, or `gap-mu-space-8` if the items are one group.
If neither fits, do not invent a value: stop and report NEEDS-DECISION with the sites and the value you wanted.

Rules for this loop
- Do not edit plumb.config.ts, .plumb/ledger.jsonl, or the theme to make a finding pass.
- Run `plumb check --changed --agent` after editing; stop when it prints "0 new".
- Reporting NEEDS-DECISION is fine. Never add a token.
```

3. A hook (`plumb install --hooks`, modelled on react.doctor) runs `plumb check --changed --agent --strict-ledger` after agent edits in Claude Code and Cursor. `--strict-ledger` treats any ledger or config growth in the working tree as a failure, so an agent can't pass by adding an exception, and the failure message tells it so.

The prompt alone can't stop an agent from adding exceptions to pass, so Plumb relies on mechanics. Exceptions live in one file that CI treats as a decision change (5.4), Plumb has no inline suppression syntax, and the hook fails when the ledger grows.

## 2. Where decisions come from

A decision is a named value, or a named rule, with a reason. Plumb reads decisions from the sources a project already has, one source per fact, and only ever asks for a config to say *which* source holds which family and what the team intends by it.

### 2.1 Families

Every declaration belongs to a family by its property: spacing (margin, padding, gap, inset, top/right/bottom/left and logical forms), colour (color, background-color, border-color, fill, stroke, outline-color, box-shadow colour components, gradient stops), radius, type (font-family, font-size, line-height, font-weight, letter-spacing), motion (transition-duration, transition-timing-function, animation-duration, animation-timing-function), elevation (box-shadow), size (width, height, min/max forms), z-index, opacity. Families are fixed in the core; a config can add a property to a family but not invent families (so presets stay comparable).

### 2.2 Sources

| Source | How Plumb reads it | Carries a why? |
|---|---|---|
| Tailwind v4 `@theme` / `@theme inline` | Through the loaded design system, namespaced keys (`--spacing-*`, `--color-*`, `--radius-*`, `--ease-*`, `--shadow-*`, `--font-*`, `--text-*`, `--leading-*`) | A CSS comment immediately above the declaration starting `why:` |
| CSS custom properties outside `@theme` (`:root { --space-3: 12px }`) | postcss parse of the named file(s); nesting resolved | Same comment convention |
| DTCG token files (`*.tokens.json`) | `$type` picks the family; `$value`; references resolved | `$description` |
| A project's own token source (MetalUI's `tokens.json`) | A preset function in the config returns decisions (`defineDecisions()`), so the mapping stays in the project | Whatever the format has (`$use` in MetalUI) |
| Component source: `cva`/`tv` variants, string-union props | AST read, shadcn-style; the variant names are the decisions callers may pick | JSDoc on the variant key |
| Named utilities (`@utility type-doc-prose { … }`) | Through the design system; a utility whose declarations are all decisions is itself a decision ("a type role") | Comment above the `@utility` |

A decision record entry looks like this inside Plumb, whatever the source:

```json
{ "family": "spacing", "name": "--mu-space-12", "value": "12px",
  "refs": ["var(--mu-space-12)", "var(--spacing-mu-space-12)"],
  "origin": "project", "tier": "primitive",
  "why": "between related parts: a label and its control",
  "source": "tokens/tokens.json#foundations.space.12" }
```

`refs` is what counts as *referencing* the decision in a lowered declaration (section 3.4); `origin` and `tier` are the two axes of 2.5 and 2.6. A decision without a why is a warning in `plumb check --decisions`, never an error: a team that imports a theme with 269 colours cannot write 269 sentences on day one, and the reason belongs with the value, not in Plumb's config.

### 2.3 Components

A component is also a decision, because it decides its own paint. Discovery, in order: the config's `components.from` (a package name, an import prefix, a directory); otherwise `components.json` (shadcn convention) or `src/components/ui`; otherwise exported React components under `src/components`. Identity follows the resolved import, including re-exports and forwarding wrappers (docs/research/orbit-shadcn-lint.md, shadcn's strongest mechanism; taken as is). A caller's `<Button className="…">` is judged by the properties those classes compile to, against the component's ownership contract (4.4).

### 2.4 Intent

Inference can't tell Plumb what the team intends, so the config states it. The config has four kinds of statement:

```ts
// plumb.config.ts
import { defineConfig } from 'plumb'

export default defineConfig({
  css: 'apps/docs/src/styles.css',                  // the Tailwind entry; inferred, written down so it is explicit
  source: ['apps/docs/src/**/*.{tsx,css}'],

  decisions: {
    spacing: { from: 'theme:--spacing-mu-*', identity: 'value' },   // a literal equal to a step passes
    color:   { from: 'theme:--color-*',      identity: 'reference', callers: ['semantic'] }, // var() to an intent token only
    radius:  { from: 'theme:--radius-*' },
    motion:  { from: ['theme:--mu-ease-*', 'theme:--mu-spring-*'] },  // project keys, not Tailwind's --ease-*
    type:    { from: 'utility:type-*' },             // a type role is the decision; font-size alone is not
    z:       { from: 'theme:--z-*' },
  },

  components: {
    from: 'package:@unlocalhosted/metalui',
    own: ['paint', 'type', 'radius', 'elevation', 'padding'],       // callers may set the rest (layout)
    contracts: { Surface: { allow: ['padding'] } },                 // a host part lets callers pad it
  },

  habits: ['hover-gate', 'focus-outline', 'transition-named', 'no-ease-in',
           'logical-inline', 'viewport-dynamic', 'overflow-clip', 'z-named'],

  imitation: {
    Textarea: { elements: ['textarea'], fingerprint: ['material-well', 'var(--mu-r-well-'] },
  },
})
```

`identity` is the one judgement call per family: `reference` means a declaration must *point at* the decision (`var(--color-ink)`), `value` means a literal that equals a step is accepted. Default is `reference` for colour and motion (a hex that equals today's token loses the link the moment the token changes) and `value` for spacing (numeric Tailwind utilities are the idiom, and MetalUI's own benchmark counts `gap-12` as on-ladder). The landscape's "token identity, not raw-value coincidence" principle (Lapidist `strictReference`) is right, and teams should be able to turn it on per family.

Inference for a project with no tokens at all: `plumb init` proposes a ladder per family from usage (values used at three or more sites), writes it under `decisions.spacing.inferred` with every value, and marks it. The report says "inferred ladder, 0 of 9 values have a why" until someone moves them into a theme. Inferred values stay proposals until someone accepts them.

### 2.5 Framework defaults are not decisions

`@import "tailwindcss"` brings several hundred theme keys with it: the whole palette (`--color-red-500`), `--spacing`, `--radius-*`, `--ease-*`, `--shadow-*`, `--text-*`. If those counted, `bg-red-500` would pass provenance because it references a theme variable, and Plumb would be certifying Tailwind's palette as the team's decisions. So every decision carries an `origin`:

- `project`: declared in CSS, token files or component source that the project owns (outside `node_modules`, inside `source`). Only these are decisions by default.
- `framework`: declared by Tailwind's default theme or by a package's stylesheet. Read and remembered so messages can name them ("`--color-red-500` is Tailwind's default palette, not a decision of this project"), but a call site referencing one fails with `provenance/<family>/framework`.
- `inferred`: proposed by `plumb init` from usage; a decision until a human replaces it, and marked in every message.

A family can opt framework keys in (`origins: ['project', 'framework']`) for a project that adopts Tailwind's scale as its own; the report then says so in the coverage header. A `--color-*: initial` or `--*: initial` reset in `@theme` is recognised and removes the matching framework keys entirely, so a project that has reset the palette sees no framework tier for that family at all. Tailwind's `--spacing` multiplier is a unit, never a decision in any origin: a numeric utility (`gap-10`) always resolves through it to a length and is judged by that length against the project ladder (3.4), so a project that sets `--spacing: 1px` is not thereby declaring 1px as a step.

Zero config does the same: the project/framework split needs no config because it is decided by which file declares the key. The `tailwind-min` fixture asserts it: `bg-red-500` and `rounded-lg` are findings there, `bg-brand` (declared in the fixture's `@theme`) is not.

### 2.6 Tiers: primitives and semantics

Orbit's core idea is two tiers: value tokens (`gray-100`) and intent tokens (`text-muted`) that reference them, and components consume intent. Plumb models it on every decision as `tier`:

- `primitive`: a decision whose value is a literal (`--color-gray-100: oklch(…)`, `--mu-space-12: 12px`).
- `semantic`: a decision whose value references another decision of the same family (`--color-text-muted: var(--color-gray-100)`; in DTCG, a `$value` that is a reference).

This is inferred. A source can override it with `tier:` in the `why:` comment line or a DTCG `$extensions.plumb.tier`, for a family whose literal-valued tokens are already intent-named. Each family then says which tiers a call site may reference:

```ts
color: { from: 'theme:--color-*', identity: 'reference', callers: ['semantic'] },
```

A declaration that references a primitive where callers may use only semantics is `provenance/color/tier`: "`--color-gray-100` is a primitive; the semantic decisions whose value it is are `--color-text-muted` ('secondary text, 4.5:1 on surface') and `--color-border-subtle`". Primitives remain legal inside decision sources (one token's value naming another) because that is what they are for. Spacing and radius ladders are usually one flat tier of primitives and set `callers: ['primitive', 'semantic']`, which is the default when a family has no semantic decisions at all; the default flips to `['semantic']` as soon as a family has any, and `plumb check --decisions` says which families flipped.

Tiers combine with the identity rules as follows. A reference passes when the referenced decision exists in the family, has an allowed origin, and has an allowed tier, in that order, so a message names the first thing wrong. A literal under `identity: 'value'` matches a primitive's value and then goes through the same tier check, so a team that wants intent names cannot be satisfied by a hex that equals one.

## 3. The engine

### 3.1 Judging declarations

Plumb judges the CSS declaration a site produces, not how the class is spelled. `gap-10`, `gap-[10px]`, `style={{ gap: 10 }}`, `.row { gap: 10px }` and `@apply gap-10` all lower to `{ prop: gap, value: 10px }` and get one finding with one fix. Spelling-based tools (shadcn's grammar from the `cn` package) could not categorise 214 valid MetalUI classes and could not see 21 stylesheets at all.

Four readers feed one list of declarations:

```
class sites (tsx)  ──► project Tailwind: candidatesToCss ──► CSS text ─┐
stylesheets (css)  ──► postcss (nesting, @apply via Tailwind) ─────────┼──► declarations
inline style (tsx) ──► AST: static keys/values; React px rule ──────────┤   { prop, value, resolved, when[], site, owner, origin }
cva/tv/const maps  ──► enumerated branches ──────────────────────────────┘
```

A declaration:

```ts
type Declaration = {
  prop: string                       // longhand after shorthand expansion for judged families
  value: string                      // as compiled: "calc(var(--spacing) * 10)" or "var(--mu-space-12)"
  resolved?: string                  // one hop through the theme, calc folded: "10px"
  refs: string[]                     // custom properties the value references
  when: Condition[]                  // media, pseudo, selector, container, supports, branch
  site: { file, range, text }        // the class string, style property or CSS declaration
  owner: { kind: 'element' | 'component', name }   // <div>, <Button> (resolved import)
  origin: 'class' | 'arbitrary' | 'stylesheet' | 'apply' | 'inline' | 'custom-property'
  opaque?: 'dynamic-value' | 'dynamic-class' | 'spread'
}
```

### 3.2 Classes

Collect class sites by AST (oxc-parser): `className` literals, template literals (static parts kept, holes recorded), `cn`/`clsx`/`cva`/`tv`/`twMerge` and configured helpers, object keys in clsx form, conditional and logical branches (each branch a `branch` condition), and constant maps. Improvement over shadcn: constant maps are followed across files when the import resolves to an exported `const` of string literals, so `SIZES[size]` is enumerated rather than reported as unreadable. A dynamic fragment (`gap-mu-space-${size}`) is an opaque site reported by `existence/dynamic-class`, because Tailwind cannot generate it either.

Every unique candidate string is compiled once per project with `__unstable__loadDesignSystem(...).candidatesToCss([...])`, as shadcn's oracle does, but in-process and async (a CLI has no synchronous rule callback to satisfy, so the worker and shared-memory signalling go away). The CSS text comes back with nesting for variants (`&:hover`, `@media (hover: hover)`); postcss resolves it into declarations with conditions. A candidate that compiles to nothing is `existence/dead-class`. Utilities that set `--tw-*` properties and read them back in the same rule (`shadow-*`, `ring-*`, `translate-*`) are folded inside that rule so the judged declaration is `box-shadow: …`, not `--tw-shadow: …`.

### 3.3 Stylesheets

Which stylesheets: the Tailwind entry and its `@import` graph, plus every CSS file reached by a side-effect import from scanned TSX (`import './library.css'`), plus `source` globs. The probe's single largest false-positive class (888 "unknown" classes that project CSS declares) came from reading only the import graph; following TSX side-effect imports closes it. Files in the Tailwind graph are compiled through Tailwind (so `@apply`, `@utility`, `@custom-variant` and theme functions become real declarations); other files go through postcss with nesting resolved, as `lint-css-habits.mjs` already does. A class selector seen in a stylesheet registers that class as existing.

### 3.4 Values and resolution

The compiled value is kept verbatim and resolved one hop: `var(--x)` substituted from the theme and `:root` declarations when the variable has one static value, `calc()` folded when it is purely numeric with compatible units, `light-dark()` and media-dependent variables left unresolved with `resolved` absent. Provenance then judges in this order: a value whose `refs` name a decision of the family passes if that decision's origin and tier are allowed for callers (2.5, 2.6), and fails with `provenance/<family>/framework` or `/tier` otherwise; a literal whose `resolved` equals a project decision's value passes under `identity: 'value'` (subject to the same tier check) and warns under `identity: 'reference'`; anything else fails with the nearest decisions named. A ref to something that is not a decision of the family (Tailwind's `--spacing` multiplier, a component's own `--tw-*` or recipe variable) does not count as a reference; the value is resolved through it and judged as a literal. Only `resolved` is compared, so `gap-10` in a project where `--spacing` is 1px is 10px and in a default project is 40px, and both are judged by their real length.

Shorthands are expanded into longhands for the judged families only (margin, padding, inset, border-radius, gap, font, transition, animation, border, outline, background colour component). Nothing else is expanded; a declaration Plumb does not understand is kept with `prop` as written and only the habit rules that match it by name see it.

### 3.5 Inline styles

`style={{ gap: 10, color: '#f00', '--x': v }}`: static keys and literal values are lowered (numbers get `px` by React's rule, unitless properties excepted). A value that is an expression is an opaque declaration with the prop known and the value `dynamic-value`; ownership can still judge it (a caller setting `background` on `<Button>` is wrong whatever the value) and provenance reports it under `provenance/opaque-inline` with the fix "pass the measured number through a custom property and style from CSS", the only accepted way to style runtime geometry. A custom-property assignment with a literal value (`'--x': '13px'`) is a `custom-property` declaration and is judged like any other.

### 3.6 Conditions

`when` carries everything that scopes a declaration: `media` (query text, parsed for hover/pointer/width), `pseudo` (`:hover`, `:focus-visible`), `selector` (the full resolved selector for stylesheet rules, including descendant and `[&_button]` forms), `container`, `supports`, `branch` (the JS condition text for a conditional class). Habit rules are written against `when` (4.3). Precedence between sites is not modelled: Plumb judges declarations one at a time and does not compute the cascade. It reports whether each declaration is a decision, not which declaration wins.

### 3.7 Performance and incrementality

Parsers: oxc-parser for TS/TSX (Rust; shadcn and react.doctor both use it), oxc-resolver for imports, and lightningcss for CSS parsing and nesting. Classes are compiled by Tailwind's own compiler, which exists only in JavaScript; a Rust reimplementation would fall out of step with Tailwind's output. Measured on MetalUI (341 TSX files, 2026-10-09, one run): TypeScript's parser took 272 ms, loading the design system 68 ms, and `candidatesToCss` 725 ms for 8,645 regex-found candidates, then 1,301 ms for the same list again, so Tailwind keeps no cache between calls. The design system loads once per project per run (hundreds of milliseconds); candidate compilation is memoised project-wide and cached on disk keyed by candidate plus theme hash. Per-file lowering is cached by content hash plus theme hash under `node_modules/.cache/plumb`. Judgement is recomputed each run (it is cheap) so a changed config or ledger never needs a cache flush. `--changed` lowers only files changed against the base and judges them against the full decision record; whole-project rules (dead decisions, component discovery) need a full pass and say so when skipped. Target on MetalUI: under 2 s warm, under 10 s cold for 333 TSX and 21 CSS files. These are targets for layer 1 to measure.

### 3.8 Scope beyond React and Tailwind

Readers are an interface: `{ collectClassSites(ast), collectInlineStyles(ast), collectStylesheetImports(ast) }`. v1 ships the React/JSX reader and the CSS reader. A project without Tailwind will work if its styling is CSS files plus custom properties: the Tailwind reader is one lowering source, not a requirement. Vue, Svelte and Astro readers are possible later because nothing after lowering knows where a declaration came from. CSS-in-JS (styled-components, Emotion, StyleX, Panda) is out of v1 (8). Tailwind v3 is out: no `candidatesToCss`, no `@theme`.

## 4. Rule families

A rule sees declarations and the decision record, nothing else. Each finding names the rule, the declaration, the decision to use, and the decision's why.

### 4.1 Provenance (v1)

A value in a judged family must come from a decision (3.4). Sub-findings: `provenance/<family>` (off-ladder literal), `provenance/<family>/by-value` (equals a step without referencing it; warn or error per `identity`), `provenance/<family>/framework` (references a framework default, 2.5), `provenance/<family>/tier` (references a primitive where callers must use semantics, 2.6), `provenance/arbitrary` (a bracket value: the same judgement, named separately so a team can count them), `provenance/opaque-inline`. MetalUI benchmark: 84 off-ladder spacing uses in 39 files, 75 hex/rgb colours in TSX, 218 arbitrary values each accounted for, 219 literal inline styles.

Plumb won't suggest `p-3.25` for `p-[13px]`, as shadcn does. The nearest *decision* is suggested, never the nearest syntax; if no decision is near, the finding says so and names NEEDS-DECISION.

### 4.2 Existence (v1)

`existence/dead-class` (compiles to nothing and no stylesheet declares it), `existence/dead-var` (`var(--x)` that nothing defines, after the theme, `:root`, `@property` and component-scoped custom properties are collected), `existence/dynamic-class`. Benchmark: exactly 19 dead classes in the docs, and none of the 888 CSS-declared ones.

### 4.3 Habits (v1, as a DSL plus built-ins)

A habit is a team rule about declarations and their conditions. Built-ins, each with its reason (taken from MetalUI's `CSS_HABITS.md`, the most complete written set of these rules among the sources reviewed, and general enough to ship): `hover-gate` (a declaration conditioned on `:hover` must also be conditioned on `(hover: hover) and (pointer: fine)`; a hover inside `:not()` is the rest state and is exempt), `focus-outline` (a `:focus-visible` rule sets `outline`, not only `box-shadow`; `outline: none` needs an outline back on focus in the same component), `transition-named` (no `all`), `no-ease-in`, `logical-inline`, `viewport-dynamic` (`dvh`/`svh`, not `vh`), `safe-area-fallback`, `z-named` (integer z-index above 1 must be a decision), `overflow-clip`, `overscroll-contain`, `motion-tokens` (a duration or curve must be a motion decision; this is provenance for the motion family and is listed here because teams think of it as a habit).

Custom habits in the config:

```ts
habits: [
  'hover-gate',
  { id: 'no-fixed-heights-on-text', when: { prop: 'height', ownerElements: ['p', 'span', 'h1', 'h2', 'h3'] },
    message: 'Text sets its own height through line-height; a fixed height clips the second line.' },
]
```

The predicate vocabulary is small and closed: `prop` (glob), `value` (regex), `when` (has/lacks media, pseudo, selector regex), `owner`, `origin`. No JavaScript callbacks in v1. Habits stay declarative so an agent can read them from `PLUMB.md` and a reviewer can read them in the config.

Fix for the hover gate in Tailwind: Plumb asks the oracle whether `pointer-hover:` exists in the project (`candidatesToCss(['pointer-hover:bg-ink'])`); if it does, the fix is the rename; if not, the fix is the `@custom-variant` declaration to add. Benchmark: 21 stylesheets and 30 `hover:` class sites.

### 4.4 Ownership (v1)

On a design-system component, a caller may set only properties outside the component's owned families. Default owned: paint (colour, background, border colour, fill, stroke), type, radius, elevation, padding. Default allowed: everything else (margin, size constraints, flex and grid participation, position, alignment, order, grid-area, visibility). Per-component contracts add or remove families or single properties. Judged per compiled property, so a named utility, an arbitrary value and an inline style are all caught, and a utility that only arranges is never flagged whatever its spelling. This removes the 271 layout findings shadcn's default no-class contract produced on MetalUI and the 214 "grammar cannot classify" findings. Findings name the component's real variant axes (read from `cva`/`tv`/prop unions) and its source file, as shadcn's messages do.

Base UI `render` props and forwarding wrappers transfer ownership as in shadcn. Descendant selectors from a stylesheet (`.page button { background: … }`) that would paint inside a component are matched by selector shape against the component's root element and classes; this is a heuristic and is reported at `warn`.

### 4.5 Imitation (v1 with explicit fingerprints; inference later)

A raw element that draws on a component's identity is a hand-built copy. v1: the config declares fingerprints per component (classes or variable prefixes); an element whose declarations or classes carry the fingerprint and that is not the component itself, nor inside the component's own source, is `imitation/<Component>` with the fix "use `<Textarea>`; it already owns this well". Benchmark: 8 docs pages with `<textarea className="material-well …">`. Later: fingerprints inferred from a component's root declarations (the set of custom properties only it references), which is what the earlier draft proposed; it needs the ownership layer to be stable first.

### 4.6 Dead decisions (v1, report only)

A decision no lowered declaration references: `dead/<family> --mu-space-6`. Never fails CI by default; a public design-system package exports tokens for consumers Plumb cannot see, so the finding is information with an `exported: true` escape in the config, following the Amsterdam pattern.

### 4.7 Parity with a design source (not v1)

Plumb can check that two token sources agree (a DTCG export from Figma and the theme), which is a token-level parity check and a useful one. It cannot check that rendered UI matches a design. Nothing in the landscape does that deterministically either (docs/research/react-doctor-landscape.md, Knapsack and Supernova entries), and Plumb will not claim it.

### 4.8 Not rules

Not in Plumb: React correctness, accessibility of behaviour, class ordering, taste rules ("no purple gradients"). react.doctor has 870 of those. Plumb checks design decisions only.

## 5. Exceptions and approval

Neither Orbit nor shadcn stops someone from adding a token, a contract allowance or a disable comment to make the diff green, and neither can tell that apart from a real decision.

### 5.1 One ledger, no inline suppressions

All exceptions and all accepted debt live in `.plumb/ledger.jsonl`, one entry per line, sorted by key, so merges are line-wise. There is no `// plumb-disable` syntax. An inline comment puts a violation and its excuse in the same diff, where a reviewer reading 400 lines is unlikely to notice it. One file that CODEOWNERS can route to the design owners is reviewable; a hundred comments are not. Trade-off accepted: moving an exception out of the file it excuses costs the reader a jump; `plumb show <key>` and the editor plugin (v2) close that distance.

```jsonl
{"key":"ownership:Button:background-color:bg-s!@apps/docs/src/pages/components/Button.tsx#FlatFill","kind":"exception","why":"the x-ray contrasts a flat fill against the cap recipe on purpose","by":"vijay","on":"2026-10-09","resolved":"var(--color-s)"}
{"key":"provenance/spacing:gap:gap-10@apps/docs/src/pages/components/Fan.tsx#FanPage","kind":"debt","on":"2026-10-09","resolved":"10px"}
```

### 5.2 Keys that survive refactors

A key is `rule : owner : prop : authored @ path # anchor`. `authored` is the normalised source form of the site, not its resolved value: the class token (`gap-10`, `bg-s!`), the inline property text (`gap: 10`), or the CSS declaration (`gap: 10px`), whitespace collapsed and quotes stripped. The resolved value is stored beside the key as data. Reason: a key built on the resolved value re-keys every debt entry the day `--spacing` or a token value changes, and that change is already visible as its own decision change (5.3); the ledger excuses *sites*, so the key should move only when the site's text moves. Trade-off: two syntaxes for one value in one anchor are two keys, which is correct, since fixing one does not fix the other. The anchor is the nearest enclosing named thing: the exported or local component function for TSX, the resolved selector for CSS. No line numbers (they rot on every edit above the site). Pure text keys re-key when a file or component is renamed; Plumb handles this the way react.doctor handles baselines: `plumb ledger --rebase` matches an orphaned entry whose path or anchor vanished to a new finding identical in every other field, and rewrites the key, printing the moves for review. Two identical declarations in one anchor share a key with a count, as `lint-css-habits.allow.json` does today.

### 5.3 Decisions are ledger entries too

The ledger also holds the accepted decision set: one line per decision name, written by `plumb accept-decisions --why "…"` (or `plumb init` on first run, marked `inferred`). On every run, decisions read from the sources are compared with the accepted set. A decision in the source and not in the ledger is `decisions/unaccepted` (error in CI); a decision in the ledger and not in the source is `decisions/vanished` (warn). Adding `--spacing-13` to the theme therefore cannot make a finding pass; it adds a finding until a reviewed ledger line accepts it with a reason. This is the mechanism Orbit's article asks for ("missing token coverage should prompt extending the system") and does not have.

### 5.4 Growth is a finding

`plumb check --base <ref>` reports ledger growth as `ledger/grew` with each new line. Locally it is information. In the Action, `ledger-approvers: ['@org/design']` turns it into a required review: the check fails until someone in the list approves the PR. Debt entries may only shrink (`--ratchet` after fixes; stale debt is `ledger/stale`, warn, pruned with `plumb ledger --prune`). Exceptions may grow with a reason; `why` is required by the CLI and a missing one is `ledger/no-why`, error. `by` is the git author; it is for the reviewer, not a security control. Plumb does not stop a human from editing the ledger by hand; it makes every edit visible in one place.

### 5.5 Baselines versus change scope

These are two mechanisms with different names, so nobody confuses them (react.doctor exposes both and the research notes say to keep them distinct): the ledger's debt is a baseline (these sites are known); `--base <ref>` is a change scope (judge only what this branch touched). CI uses both: fail on new findings in changed files, fail on debt growth, report everything else.

## 6. Reporting

### 6.1 No score

react.doctor's 0–100 is computed on a server with an unpublished formula; Deslint has a local one. A single number here would be gameable in three ways that all look like improvement (add exceptions, delete the offending page, lower a ladder's `identity`) and would hide a family with no governance behind one with a lot. Plumb reports coverage per family, Polaris-style, and a drift delta per change.

```
family      from decisions   findings   debt   exceptions
spacing     585 / 669 (87%)     84         84        0
colour    1,912 / 1,987 (96%)   75         75        0
motion       41 /    52 (79%)   11         11        0
hover          0 /   51  (0%)   51         51        0     habit enabled, nothing gated yet
existence                       19         19        0
ownership                        3          2        1
imitation                        8          8        0
```

Coverage counts declarations, not sites, and only families with a decision source; a family with no source shows "no decisions" rather than 100%.

### 6.2 Formats

`plumb check` text as above; `--json` (schema with stable finding keys, the lowered declaration, decision candidates, why, fix text, family coverage, timing, skipped checks); `--sarif` for GitHub code scanning; `--agent` (section 1.5); `--format github` for annotations inside the Action. `plumb explain <file>` prints every lowered declaration for a file with its origin and conditions, which is also how layers 1 and 2 are verified by hand. `plumb show <rule or key>` lists all sites of one finding. `plumb why <file>:<line>` says which rule, decision and ledger line apply at a site.

## 7. Packaging

### 7.1 Standalone CLI first

Plumb needs an async compiler, a stylesheet graph, whole-project passes and a ledger. None of that fits the single-file synchronous rule model of ESLint or Oxlint (shadcn pays for that with a worker and shared-memory signalling; react.doctor runs its own oxlint host for the same reason). So Plumb is a CLI with a programmatic API (`import { check } from 'plumb'`), and the lint plugins come second as thin readers of Plumb's cache.

Plumb complements existing tools. ESLint/Oxlint keep React correctness and `@shadcn/lint` if a team uses it; Prettier orders classes; Stylelint checks CSS syntax; react.doctor audits React. Plumb has one subject, design decisions, and reports it in a shape the others do not (compiled declaration, decision, why).

Install: `npx plumb` for a look; `npm i -D plumb && npx plumb init && npx plumb baseline` to adopt; `plumb ci install` writes the Action; `plumb install --hooks` wires agents. Node ≥ 20.19, Tailwind ≥ 4.0 as a peer when present. MIT licence (react.doctor's source-available licence with an AI-training clause would be a problem for a tool whose users are agents).

### 7.2 Later

A `plumb/eslint` and `plumb/oxlint` plugin that reads `node_modules/.cache/plumb` and reports findings for the open file, re-running Plumb for that file when the cache is stale. A `plumb try` command (Deslint's `verify_before_write`): lower and judge a snippet from stdin against the project's decisions before it is written. Vue/Svelte readers.

### 7.3 Name

Decided (2026-10-09): keep Plumb, ship as `@unlocalhosted/plumb` with `bin: plumb`, and dispute the abandoned `plumb` package. On npm, `plumb` is taken by an abandoned package ("functional composition sugar", 0.1.0, last published 2022-06), and `plumbline` by an Angular testing utility; `plumb-cli` is also taken. Free: `@plumb/cli` (the scope `plumb` would have to be registered as an org), `plumbr`, `plumblint`, `straightedge`, `truewall`, `chalk-line`. Recommendation: file an npm name dispute for `plumb` (abandoned packages with no downloads are routinely transferred) and in parallel publish under the owner's existing scope with `bin: plumb`, so the command is `plumb` either way. The MetalUI preset later ships as `@unlocalhosted/metalui/plumb`.

## 8. Limits

- It does not prove anything looks right: contrast, hierarchy, fit, motion feel, behaviour, accessibility. Those stay with rendered tests. A green Plumb run means the code chose among decisions.
- It does not compute the cascade. Each declaration is judged alone; a later override that undoes a decision is not seen as such.
- It cannot read runtime-computed styles. It can require that they pass through a custom property.
- It judges one hop of variable resolution. Deeply chained or media-dependent variables are judged by reference, not by value.
- Shorthand expansion covers the judged families only. A declaration it does not understand is passed through to habits by name and otherwise ignored.
- Descendant-selector ownership is a heuristic and is reported as such.
- Component discovery follows static imports. A component rendered through a dynamic element identity is a plain element to Plumb.
- CSS-in-JS, Vue, Svelte, Astro, Tailwind v3 are out of v1. A Tailwind v4 project whose theme loads through `@config` works because the real compiler loads it; Plumb reads no JS config itself.
- The ledger is a review mechanism, not a security boundary. It makes every exception and every new decision a visible, attributed, reasoned line in one file; it cannot stop someone with commit rights from writing that line.
- Plumb quotes each why as written; their quality is up to the team.

## 9. v1 scope and build layers

Owner's rules applied: primitives first; one layer at a time; each finished and verified before the next; tests are integration or end-to-end only, meaning the real CLI is run over fixture projects and its JSON output is checked, never a unit test of a function. MetalUI's docs site is the acceptance benchmark where the numbers apply, run read-only against a pinned commit.

**The benchmark is reconciled hit by hit.** The MetalUI figures (84 off-ladder of 669 spacing uses, 75 hex/rgb colours, 218 arbitrary values, 219 literal inline styles, 21 stylesheets and 30 class sites with ungated hover) came from greps and one heuristic triage; some hits will turn out legitimate, and the tool will find cases the greps missed (a stylesheet `gap: 10px`, a `style={{ gap: 10 }}`). Only two figures were hand-verified: the 19 classes that compile to nothing and the 8 pages that hand-build a field. So a layer's acceptance is: every grep hit is either a Plumb finding or a recorded, reasoned pass (a line in `BENCHMARK.md` saying why it is fine), and every finding the greps did not have is reviewed and explained there too. Where the table below says "accounted for", it means that. The two hand-verified figures are the only exact ones.

Fixtures: `fixtures/tailwind-min` (a ten-file Tailwind v4 app whose `@theme` declares `--color-brand`, `--color-text-muted: var(--color-brand)` and a four-step spacing ladder, with a sibling variant that resets `--color-*: initial`), `fixtures/plain-css` (no Tailwind, custom properties in `:root`), `fixtures/dtcg` (a `.tokens.json` source), and MetalUI itself behind an environment variable for the benchmark runs.

| Layer | What is built | Acceptance (the CLI's output on fixtures, plus the benchmark) |
|---|---|---|
| 0 Harness | `plumb` binary, config loading, `--json`, the e2e runner that executes the CLI over a fixture and compares JSON | `plumb --json` on `tailwind-min` returns the schema with zero findings and the theme path it found |
| 1 Class lowering | Tailwind design-system load, candidate collection (literals, helpers, branches, cross-file const maps), `candidatesToCss`, conditions, `plumb explain` | `plumb explain` on fixtures shows every class site as declarations with `when`; on MetalUI docs `existence/dead-class` is exactly the 19 hand-verified classes and no class declared in project CSS is among them |
| 2 Stylesheet and inline lowering | TSX side-effect CSS discovery, postcss nesting, `@apply` through Tailwind, inline style objects, custom-property declarations, opaque markers | On MetalUI docs `plumb explain` lists declarations from the 21 stylesheets and the 219 grep-found inline sites are accounted for; the `plain-css` fixture lowers with no Tailwind installed |
| 3 Decision record and spacing provenance | Theme, `:root`, DTCG and preset readers; origin and tier; `refs`; `why` capture; resolution and calc folding; `provenance/spacing` with `identity` | `tailwind-min`: `bg-red-500` and `rounded-lg` fail as framework, `bg-brand` passes, `--color-*: initial` removes the palette; MetalUI docs with the preset: the 84 grep-found off-ladder uses and 585 on-ladder uses are accounted for, nearest steps named with their `$use` sentence |
| 4 Provenance, all families, and existence of vars | colour, radius, type, motion, elevation, z; tiers (`provenance/<family>/tier`); `existence/dead-var`; `provenance/arbitrary` | `tailwind-min`: a call site using a primitive where the colour family says `callers: ['semantic']` fails naming the semantic token; MetalUI docs: the 75 colours and 218 arbitrary values accounted for; `dead-var` on a fixture with a misspelled variable |
| 5 Habits | The predicate DSL, the built-ins, oracle-backed fixes (`pointer-hover:` discovery) | The 21 stylesheets and 30 class sites for `hover-gate` accounted for; `lint-css-habits.mjs` and Plumb agree on the package CSS for every habit both implement |
| 6 Ledger | `baseline`, `accept`, `accept-decisions`, keys and anchors, `--rebase`, `--ratchet`, `--prune`, `--base`, `ledger/grew`, `--strict-ledger` | MetalUI docs: `baseline` then `check` is green; add one `gap-10` → red with one finding; add a ledger line without `why` → red; add `--spacing-13` to the theme → `decisions/unaccepted`; rename a file → `--rebase` moves the entries and reports them |
| 7 Ownership | Component discovery, import resolution and wrappers, per-property contracts, variant-naming messages | Fixture: `<Button className="mt-4">` passes, `<Button className="bg-brand">` fails naming the variant axis; MetalUI docs: the Button x-ray's `bg-s!` is the only ownership finding on that page and is accepted with a why; every ownership finding on docs reviewed in `BENCHMARK.md`, with layout-only overrides expected to be zero |
| 8 Imitation | Explicit fingerprints | Exactly the 8 hand-verified docs pages caught by the `Textarea` fingerprint, none of the component's own source |
| 9 Surfaces | `--agent`, `PLUMB.md` generation, SARIF, the GitHub Action with annotations and sticky comment, `install --hooks` | Action runs on a fixture PR and posts the delta; `--agent` output for a fixture is used by an agent run (Codex or Claude) that reaches "0 new" without touching the ledger, recorded as an e2e |
| 10 Dead decisions and `try` | `dead/<family>`, `plumb try` from stdin | A fixture with an unused token reports it and `exported: true` silences it |

Each layer ends with the fixture e2e green, the benchmark number recorded in the repository's `BENCHMARK.md` with the MetalUI commit it was measured on, and a review. The MetalUI preset (`defineDecisions` over `tokens.json`, the `mu-*` hook classes, the `type-*` roles, component contracts for Surface, Well and GlassFace as hosts) is written inside the MetalUI repo at layer 3 and grows with each layer; nothing MetalUI-specific enters Plumb's core, and `fixtures/tailwind-min` must pass every layer with no preset.

## 10. Open questions for the owner

1. **Name and npm.** Decided: yes. Keep "Plumb" and ship scoped (`@unlocalhosted/plumb`, `bin: plumb`) while disputing the abandoned `plumb` package? Recommended: yes; the command name is what people type.
2. **Inline suppressions.** None at all (recommended), or allowed with a mandatory reason and counted as ledger growth? Recommended: none in v1; add later only if the ledger's distance from the site proves to be a real cost.
3. **`identity` defaults.** `value` for spacing and `reference` for colour and motion (recommended), or `reference` everywhere? MetalUI's benchmark assumes `value` for spacing.
4. **Ledger growth in CI.** Block until a listed approver reviews (recommended for the Action's default), or report only?
5. **Decision acceptance.** Should every theme key need a ledger line (recommended: yes, it is the only mechanism that makes "add a token" a reviewed act), or only keys added after `init`? The second is the same thing: `init` accepts what exists.
6. **A score.** None, per-family coverage instead (recommended). If a single number is wanted for a dashboard, derive it outside Plumb from the JSON.
7. **Editor plugin in v1.** No (recommended); `--watch` and the agent hook cover the loop until the cache-reading plugin is built.
8. **Where the MetalUI preset lives.** In the MetalUI repo from layer 3, published later as `@unlocalhosted/metalui/plumb` (recommended), not in Plumb's repo.
9. **Frameworks.** React and CSS only in v1 (recommended); Vue/Svelte readers when someone asks with a repo.
10. **Licence.** MIT (recommended).
11. **Who builds it.** Per the global rules, the engine, readers, ledger and CLI are non-UI work for Codex (`gpt-6.1-sol`) one layer at a time with review before commit; the report's typography and the Action's comment layout are the only UI surfaces. Confirm this split.
12. **Where Plumb lives, and how MetalUI runs it before publish.** Decided: its own repo. Recommended detail: its own public repository, `unlocalhosted/plumb`, as beatboard was split out, with its fixtures and `BENCHMARK.md` inside it; MetalUI consumes it as a devDependency from layer 3 and keeps only `plumb.config.ts`, the preset and its ledger. Before the first npm release, pin a git dependency to a commit (`"plumb": "github:unlocalhosted/plumb#<sha>"`, with a `prepare` build so CI installs it reproducibly) and use a local `npm link` while iterating on a layer; publish `0.x` prereleases to npm from layer 6, once the ledger exists and the CLI's surface stops moving. A workspace link alone is rejected because it would make MetalUI's CI depend on a sibling checkout.
