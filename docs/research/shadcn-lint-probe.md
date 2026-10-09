# MetalUI: raw @shadcn/lint measurement

Probe date: 2026-10-09. Source root: `/Users/vijaysingh/unlocalhosted/metalui`. All probe artifacts are written beside this report. MetalUI was read only. No source fixes, builds, browser checks, installs, or cache writes were performed in MetalUI.

**4,218 error diagnostics across 333 TSX files:** docs 3,288; package blocks 334; component internals 596. These are raw tool findings, not 4,218 confirmed design-system violations. Setup passed; large parts of the result measure missing ownership contracts, CSS import visibility, and documentation illustration behavior.

## Configuration and reproducibility

Installed versions: Node v25.9.0, ESLint 9.39.5, @shadcn/lint 0.2.0, @typescript-eslint/parser 8.71.1; repository Tailwind 4.3.3.

[eslint.config.mjs](eslint.config.mjs) enables all six rules as errors with their defaults. No docs or internals override; no allowances or contracts. `--no-inline-config` also prevents source comments from suppressing findings. `no-restyle` defaults to allowing **no classes**, including layout; this is a major policy mismatch, deliberately retained for the raw measurement.

Actual AST import inventory, excluding strings in example code:

- Docs: 186 import declarations from `@unlocalhosted/metalui`, 75 from `@unlocalhosted/metalui/icons`, 10 from `@unlocalhosted/metalui/icons/life`. Three component-related relative imports target `../../../../../packages/metalui/src/components/rename-editor/edit-request` (helper, not a rendered component).
- Package blocks: relative imports such as `../../components/surface/surface`, `../../components/label/label`, `../../components/button/button`.
- Internals: sibling imports such as `../button/button`, `../field/field`, `../well/well`. The config recognizes matching directory/file names with a regex backreference, so internal composition is also measured. Native DOM elements are not design-system components; vocabulary and inline-style rules still inspect them.

Package regex includes icon subpaths; their currentColor classes consequently need a separate ownership contract. Relative regexes exclude `?raw` source-string imports. No alias import was needed for actual scanned JSX; `@/components/metalui/...` occurs in copyable examples, not AST import declarations.

Run from this directory:

```sh
node run-probe.mjs
node verify-setup.mjs
node analyze.mjs
node write-report.mjs
```

The runner executes each area separately, with MetalUI as cwd:

```sh
node /absolute/probe/node_modules/eslint/bin/eslint.js 'apps/docs/src/**/*.tsx' \
  --config /absolute/probe/eslint.config.mjs --no-cache --no-inline-config --format json
```

The other two globs are `packages/metalui/src/blocks/**/*.tsx` and `packages/metalui/src/components/**/*.tsx`. An alternate flat config evaluates relative file patterns against cwd; running with the probe as cwd would exclude these external files. All commands and timings are recorded in [runs.json](runs.json). [source-snapshot.json](source-snapshot.json) records source HEAD, worktree status, and SHA-256 fingerprints of 395 relevant source/policy files; unrelated existing source WIP was preserved. Each exit code is 1 because findings exist; there are **0 fatal/parse errors and 0 ignored-file diagnostics**. File totals equal a separate recursive TSX inventory: 234, 14, 85. The initial control scan lacked sibling recognition; only that area was rerun after adding the sibling pattern. This report and JSON use the final scan.

Raw JSON: [docs.json](docs.json), [blocks.json](blocks.json), [components.json](components.json). Counts include repeated emissions when a shared class constant is used at several component sites: 4,017 distinct tuples of area/file/line/column/rule/message, versus 4,218 raw diagnostics. Cross-rule findings are not deduplicated.

## Setup verification

The installed README and bundled source were read directly; no remote/latest-version assumptions. Implementation pointers are in `node_modules/@shadcn/lint/dist/index.js`: `projectFor`, `discoverThemeFile`, `readTheme`, `themeFileFor`, `tailwindEntryFor`, `withSettings`, and `classSiteVisitors`. Oracle loading is in `dist/tailwind-worker.js` (`loadTailwind`, `build`, `query`).

**Theme discovery:** no theme-path setting is supported in `settings.shadcn`. Without an ancestor `components.json`, the nearest package.json defines the search root. The plugin scans CSS up to depth 5, selects a sheet importing Tailwind with the most color tokens, then shallower depth, following CSS imports recursively. A supplied `components.json` could use `tailwind.css`, but none was written to the source tree.

- Docs discovery selects `apps/docs/src/styles.css`, following `@unlocalhosted/metalui/tokens.css` and `theme.css` to actual source.
- Both package areas select `packages/metalui/styles.input.css`, which imports Tailwind theme/utilities, `src/components/tokens.css`, and `theme.css`.
- All three resolve **269 declared color tokens**, including `ink`, `ink2`, `s`, named recipe inks, and colorway tokens. Theme-aware diagnostics list these tokens and the selected CSS path; this is not a generic fallback.

**Component recognition:** existing `apps/docs/src/pages/components/Button.tsx:209` produces `no-restyle` for `bg-s!` and `shadow-none!`; block `code-card.tsx:18` produces it on `GlassFaceRoot`; internals produce 152 findings after sibling recognition. In-memory ESLint integration probes using the same config also reject `bg-ink` on `Button` through both package and relative imports and identify `packages/metalui/src/components/button/button.tsx`. No fixture was written to MetalUI.

**Tailwind oracle:** the plugin's actual worker returns `ok: true`, generation 1 for docs and generation 2 for the package (reused for internals), `hasModules: false` (no @plugin/@config modules needed). In all areas it accepts `mu-stack`, `mu-cluster`, `gap-mu-space-12`, `p-mu-space-24`, `type-doc-prose`, `max-w-measure`, `pointer-hover:bg-ink`, and `data-[disabled]:opacity-50`; rejects the deliberately nonexistent `bg-probe-undeclared` and `probe-nonexistent-class`. ESLint's own in-memory probe reports the undeclared color and nonexistent class and leaves those legitimate classes alone on a native element. This demonstrates the loaded oracle beyond absence of warnings.

**Setup warnings verbatim:** none. `docs.stderr.txt`, `blocks.stderr.txt`, `components.stderr.txt`, `verification.stderr.txt`, and `setup-verification.json.warnings` are empty. No theme fallback or worker warning occurred in the lint runs. A later auxiliary triage query initially exceeded its self-imposed 20-second timeout when requesting suggestions for every unknown class; narrowing it to the grammar-unclassified component classes succeeded. That auxiliary timeout did not affect scans or their worker setup.

Full evidence: [setup-verification.json](setup-verification.json).

## Counts per rule and area

| Rule | Docs (234 files) | Blocks (14 files) | Internals (85 files) | Total |
| --- | --- | --- | --- | --- |
| no-restyle | 319 | 264 | 152 | 735 |
| no-raw-colors | 6 | 0 | 2 | 8 |
| no-arbitrary-values | 209 | 0 | 0 | 209 |
| no-inline-styles | 1805 | 12 | 104 | 1921 |
| no-unknown-classes | 938 | 52 | 333 | 1323 |
| require-static-classes | 11 | 6 | 5 | 22 |
| Total | 3288 | 334 | 596 | 4218 |

## Top 15 files by raw findings

| Rank | Area | File | Findings |
| --- | --- | --- | --- |
| 1 | docs | `apps/docs/src/ui/FolderUnfold.tsx` | 130 |
| 2 | docs | `apps/docs/src/ui/xray/ToolbarSpecimens.tsx` | 80 |
| 3 | docs | `apps/docs/src/ui/xray/SwitcherSpecimens.tsx` | 68 |
| 4 | docs | `apps/docs/src/pages/components/ButtonSmartControls.tsx` | 67 |
| 5 | docs | `apps/docs/src/ui/xray/LinkCardSpecimens.tsx` | 63 |
| 6 | docs | `apps/docs/src/ui/xray/ToastSpecimens.tsx` | 60 |
| 7 | docs | `apps/docs/src/pages/components/Slider.tsx` | 59 |
| 8 | docs | `apps/docs/src/ui/xray/ButtonXray.tsx` | 59 |
| 9 | docs | `apps/docs/src/ui/xray/PaletteSpecimens.tsx` | 59 |
| 10 | docs | `apps/docs/src/ui/xray/ToolbarXray.tsx` | 57 |
| 11 | docs | `apps/docs/src/ui/xray/SliderSpecimens.tsx` | 55 |
| 12 | docs | `apps/docs/src/ui/xray/StatusSpecimens.tsx` | 55 |
| 13 | docs | `apps/docs/src/ui/xray/SwitcherXray.tsx` | 55 |
| 14 | blocks | `packages/metalui/src/blocks/region/region.tsx` | 55 |
| 15 | docs | `apps/docs/src/ui/xray/DialogXray.tsx` | 52 |

Ties retain scan order. X-ray/illustration files dominate, chiefly through individual inline style properties rather than failing theme discovery.

## Representative findings

Paths are relative to source root. Messages below are verbatim. Inline/style-expression findings have no concrete class; the property or expression is shown instead.

### no-restyle

- `apps/docs/src/pages/components/Button.tsx:209` — `bg-s!`

  > "bg-s!" is not allowed on <Button>: <Button> owns its color. Add a variant in packages/metalui/src/components/button/button.tsx only if the design explicitly calls for this treatment.

- `apps/docs/src/blocks/ai-composer/ai-composer.tsx:324` — `pt-mu-space-12`

  > "pt-mu-space-12" is not allowed on <ScrollArea>: the grammar does not recognize it. Fix the spelling, or use a class Tailwind generates.

- `packages/metalui/src/blocks/code-card/code-card.tsx:18` — `min-w-code-card-min-width`

  > "min-w-code-card-min-width" is not allowed on <GlassFaceRoot>: the grammar does not recognize it. Fix the spelling, or use a class Tailwind generates.

- `packages/metalui/src/blocks/region/region.tsx:27` — `data-dim:opacity-region-dim`

  > "data-dim:opacity-region-dim" is not allowed on <Surface>: your CSS declares it, and the grammar cannot tell what it changes. Use a variant, or put it on a parent element.

### no-raw-colors

- `apps/docs/src/pages/components/ScrollArea.tsx:69` — `text-ink-dim`

  > "text-ink-dim" is not a declared theme color. Use one of: avatar-ring-ink, brush-edge-ink, brush-eraser-ink, brush-ring-ink, button-destructive-ink, button-graphite-ink, button-link-ink, button-primary-ink, button-strip-danger-ink, button-strip-ink, button-strip-ink-hover, checkbox-tick-color (+257 more). To add a color, declare --color-<name> in apps/docs/src/styles.css first.

- `packages/metalui/src/components/sparkline/sparkline.tsx:32` — `fill-none`

  > "fill-none" is not a declared theme color. Use one of: avatar-ring-ink, brush-edge-ink, brush-eraser-ink, brush-ring-ink, button-destructive-ink, button-graphite-ink, button-link-ink, button-primary-ink, button-strip-danger-ink, button-strip-ink, button-strip-ink-hover, checkbox-tick-color (+257 more). To add a color, declare --color-<name> in packages/metalui/styles.input.css first.

- `apps/docs/src/ui/LayerSorter.tsx:51` — `undefined (inline property; no class)`

  > fill="#F5BF55" hardcodes a color. Use currentColor with a text color class, or the nearest theme token: var(--color-folder-region-ring-amber).

### no-arbitrary-values

- `apps/docs/src/blocks/availability-picker/availability-picker.tsx:300` — `@4xl/block:grid-cols-[minmax(0,17rem)_auto_12rem]`

  > "@4xl/block:grid-cols-[minmax(0,17rem)_auto_12rem]" hardcodes an off-token value. Use a theme token or scale value instead.

- `apps/docs/src/blocks/settings/settings.tsx:341` — `pb-[5.5rem]`

  > "pb-[5.5rem]" hardcodes an off-token value. Use a theme token or scale value instead.

- `apps/docs/src/blocks/ai-composer/ai-composer.tsx:342` — `transition-[opacity,translate]`

  > "transition-[opacity,translate]" hardcodes an off-token value. Use a theme token or scale value instead.

- `apps/docs/src/blocks/availability-picker/availability-picker.tsx:313` — `max-w-[40ch]`

  > "max-w-[40ch]" hardcodes an off-token value. Use a theme token or scale value instead.

### no-inline-styles

- `apps/docs/src/blocks/ai-composer/ai-composer.tsx:317` — `height (inline property; no class)`

  > Inline style sets height. Style through classes; use CSS custom properties for dynamic values.

- `packages/metalui/src/blocks/tool-strip/tool-strip.tsx:141` — `position (inline property; no class)`

  > Inline style sets position. Style through classes; use CSS custom properties for dynamic values.

- `packages/metalui/src/components/dial/dial.tsx:216` — `width (inline property; no class)`

  > Inline style sets width. Style through classes; use CSS custom properties for dynamic values.

- `apps/docs/src/ui/FolderUnfold.tsx:283` — `dynamic style object (no class)`

  > Dynamic style object cannot be checked. Build it from CSS custom properties only.

### no-unknown-classes

- `apps/docs/src/app/Shell.tsx:154` — `library-shell`

  > "library-shell" is not a class this project's Tailwind knows, so no CSS is generated for it. Fix the spelling, or declare it with @utility in apps/docs/src/styles.css.

- `apps/docs/src/pages/components/Link.tsx:49` — `ed-readouts`

  > "ed-readouts" is not a class this project's Tailwind knows, so no CSS is generated for it. Fix the spelling, or declare it with @utility in apps/docs/src/styles.css.

- `packages/metalui/src/blocks/code-card/code-card.tsx:18` — `mu-codecard`

  > "mu-codecard" is not a class this project's Tailwind knows, so no CSS is generated for it. Fix the spelling, or declare it with @utility in packages/metalui/styles.input.css.

- `apps/docs/src/pages/components/ColourCue.tsx:22` — `rounded-field`

  > "rounded-field" is not a class this project's Tailwind knows, so no CSS is generated for it. Fix the spelling, or declare it with @utility in apps/docs/src/styles.css.

- `packages/metalui/src/components/numeric-cue/numeric-cue.tsx:221` — `font-inherit`

  > "font-inherit" is not a class this project's Tailwind knows, so no CSS is generated for it. Fix the spelling, or declare it with @utility in packages/metalui/styles.input.css.

### require-static-classes

- `apps/docs/src/pages/components/Button.tsx:533` — ``${PRESSED[cap]} translate-y-button-travel``

  > Dynamically built className on <Button> cannot be checked. Use static class strings.

- `packages/metalui/src/blocks/weather/weather.tsx:409` — `ROOT[size] + forwarded className`

  > Dynamically built className on <Surface> cannot be checked. Use static class strings.

- `packages/metalui/src/components/field/field.tsx:48` — ``${FRAME} ${SIZES[size]}``

  > Dynamically built className on <Well> cannot be checked. Use static class strings.

- `apps/docs/src/ui/xray/TooltipSpecimens.tsx:96` — `useTipClass(): generated ed-tip-<useId>`

  > Dynamically built className on <Tooltip> cannot be checked. Use static class strings.

## Triage: estimates, not adjudicated error counts

Read against `docs/CSS_SYSTEM.md`, `docs/CSS_HABITS.md`, source CSS, and representative JSX. Those documents require named spacing/layout, preserve recipe-specific dimensions, use editorial `type-doc-*` in docs, and require `pointer-hover:`. They do not impose a blanket prohibition on any inline geometry or all className props. Component internals are the control and own their appearance.

The following is an **exhaustive, reproducible heuristic allocation of diagnostic occurrences**, not a statistically sampled or manually approved classification. Counts are exact for that heuristic; their meaning is estimated. Class (i) includes unresolved candidates and can overstate real drift. Class (ii) combines confirmed tool limitations with probable contract/ownership mismatches. Class (iii) is inferred docs purpose, not owner approval of each style. Some diagnostics have multiple causes; precedence assigns exactly one category.

| Area | (i) Drift candidates | (ii) Tool/policy mismatch | (iii) Intentional docs styling | Total |
| --- | --- | --- | --- | --- |
| docs | 121 | 1148 | 2019 | 3288 |
| blocks | 10 | 324 | 0 | 334 |
| components | 1 | 595 | 0 | 596 |
| Total | 132 | 2067 | 2019 | 4218 |

Method is encoded in [analyze.mjs](analyze.mjs); every diagnostic has category, reason, confidence, class, source-selector evidence, and applicable oracle verdict in [diagnostics-triage.json](diagnostics-triage.json). [analysis-summary.json](analysis-summary.json) aggregates these reasons. Steps:

1. Join all raw diagnostics. Parse base classes while preserving bracket/parenthesis variants. Scan all CSS under docs/src and package/src for explicit class selectors; this tests declaration presence, not whole-app reachability. CSS-selector matching is lexical, so an incidental selector mention could be misclassified; cited examples were checked directly.
2. Query the actual worker for grammar-unclassified restyle tokens that are not already source selectors or mu-* hooks. Accepting a class proves validity, not that a particular component should allow its appearance.
3. Put layout rejected by default closed contracts, valid named classes rejected by grammar, source CSS missed by theme-only discovery, finite class maps/helper forwarding, and component-owned styling into (ii). `mu-*`/`block-*` without a CSS selector are **probable hooks**, marked low confidence; no CSS generated for a marker is not necessarily a visual bug.
4. Put docs files outside `apps/docs/src/blocks/` into inferred illustration/editorial (iii) for inline appearance and arbitrary values. Put SVG art and generated tooltip portal styles there too. This broad path heuristic may conceal real drift in docs helpers and ordinary demos. Keep unknown/undeclared utilities as (i) candidates even in editorial files.
5. Keep off-token values, application-like docs-block overrides/inline styles, and unresolved non-marker classes in (i). Exempt explicit transition property lists as likely tool policy noise; animation correctness still requires review. Do not claim every geometry style is a real breach.

### (i) Real drift supported by MetalUI rules; unresolved candidates separately

Confirmed stale-token example: `ScrollArea.tsx:69` uses `text-ink-dim`, while the current theme declares `ink2`/`ink3` and no `ink-dim`. Other oracle-rejected candidate utilities include `rounded-field` (7), `max-w-mu-measure` (2), `rounded-mu-space-3` (3), `recipe-surface` (3), `type-doc-body` (5), and `font-inherit` in internals (1). These 21 unknown-class occurrences plus the undeclared color are strong stale-name evidence; which current token replaces each still requires semantic review. The remainder of the unresolved-class bucket includes class hooks with no declaration and should not be treated as confirmed drift.

The 25 off-token findings in docs blocks include `pb-[5.5rem]`, custom grid dimensions, and max-width values. Source-owned constraints should use approved named utilities/tokens under CSS_SYSTEM; structural grid syntax and token-referencing animation strings need individual review before promotion to a token. Appearance overrides on actual controls (e.g. `FieldInput text-ink2`, `IconButton aria-pressed:text-success`) warrant a variant/contract decision. The 21 inline-consumer candidates include measured positions in studio-week and departing tool-strip keys, so many may be legitimate physical geometry rather than drift; this estimate deliberately retains uncertainty.

The six shadcn rules do **not** enforce named spacing adoption, `mu-stack`/`mu-cluster` use, hover gating, focus outlines, logical sides, motion-token provenance, named z-index, overscroll containment, or layout/container semantics. Numeric utilities such as `gap-12` can pass: docs deliberately sets `--spacing: 1px`, but the library's named ladder is independent of the host scale. Zero findings in a rule is not proof of CSS_HABITS compliance.

### (ii) False positives and contract/analysis gaps

- **888 unknown-class occurrences have a matching source CSS selector** (docs 856, blocks 6, internals 26). Examples: `library-shell` is declared in `apps/docs/src/pages/library.css`, imported by actual pages; `ed-readouts` is declared in `ui/edit/edit.css`, imported by `ui/edit/index.tsx`. Theme discovery follows CSS @imports, not the application's TSX side-effect CSS graph. One additional unknown-class false positive is `naive-cap`, declared by a JSX style element in Button.tsx:351.
- **425 diagnostic occurrences are probable structural hooks** across unknown-class and restyle rules, not confirmed missing styling. `mu-codecard` is beside real generated `min-w-code-card-min-width` and recipe classes; `mu-palette-eng` is similarly beside `palette-eng` in the implementation. Blanket `mu-*` allowance would also mask genuinely stale names, so hook registration is preferable.
- **214 restyle findings are valid classes that its bundled grammar cannot categorize** (31 docs, 113 blocks, 70 internals). Oracle and grammar disagree on named MetalUI dimensions and spacing. `pt-mu-space-12` and `min-w-code-card-min-width` are concrete examples. This is not a failed oracle.
- **271 layout findings come from the default no-class contract** (152/71/48). Surface/Well/GlassFace are composition hosts; consumer layout and approved part composition need explicit contracts. Another 42 appearance findings in blocks/internals are provisionally assigned to missing part-composition contracts, not established violations.
- **19 static-class findings are finite maps, helpers, or forwarding limits** (8/6/5). Weather's ROOT/SKY and Field's SIZES are literal maps, unlike `bg-${color}`. The analyzer's limited resolution does not prove those classes are unavailable to Tailwind. Imported recipe maps may require cross-file support. Tooltip's three dynamic-class findings belong to intentional generated docs styling instead.
- **2 `fill-none` findings are confirmed raw-color false positives**: SVG no-fill is not a hardcoded palette color. Oracle accepts it. **33 dynamic-style findings** outside inferred docs illustrations are low-confidence helper/forwarding gaps (12/2/19); some may contain real appearance styles. **85 explicit internals style properties** are provisionally component-owned geometry, not consumer drift; inspect token provenance before exempting them.

Data variants are not inherently broken: the worker accepts `data-[disabled]:opacity-50` and `pointer-hover:bg-ink`. Restyle may still reject `data-dim:opacity-region-dim` because its grammar/contract cannot classify the base generated utility or ownership. Do not blanket-allow all data variants; inspect the property they change.

### (iii) Intentional docs-only styling

The heuristic assigns 2019 occurrences here. The largest subgroup is 1,782 inline illustration/geometry diagnostics outside docs block source; other subgroups are 181 local arbitrary measurements/art values, 47 component-illustration overrides, 5 SVG art colors, 3 tooltip generated-class diagnostics, and 1 documented negative-example class override.

Concrete documented intention: Button.tsx:209 explicitly contrasts a flat fill against the cap recipe using `bg-s! shadow-none!`; Button.tsx:533 freezes pressed states; TooltipSpecimens.tsx:46–55 emits an instance-specific style rule for a portalled tooltip using `ed-tip-<useId>`. These are demonstrations, not ordinary production component consumption. Their source may still contain performance or token debt; intention alone does not approve every value.

`type-doc-prose`, other valid editorial `type-doc-*` roles, and `max-w-measure` are already accepted by this theme/oracle. **No finding is attributed to those valid example classes**. `type-doc-body` and `max-w-mu-measure` are different, rejected spellings and remain drift candidates. Do not explain all docs findings as editorial typography.

## What a MetalUI-specific policy needs

1. **Keep recognition; improve import/CSS visibility.** Retain exact package/relative component sources and sibling recognition. Register reachable TSX-imported CSS and intentional hook classes; preferably derive hooks/recipes from generated manifests. Importing a combined lint-only CSS graph outside MetalUI can make declarations visible, but must not pollute actual runtime CSS or change source-scan scope. Never broadly whitelist `mu-*`, `ed-*`, or `recipe-*` without validating entries.
2. **Make ownership explicit per API.** Add `no-restyle allow: ['layout']` as a considered starting point, then contracts for Surface/Well/GlassFace hosts and their parts. Permit reviewed named composition dimensions, part spacing, and contextual layout; keep padding/color/material changes on actual Button/Field/Select controls closed unless their variant API permits them. Icons need currentColor/theme-ink permission. Base categories alone will not fix grammar-unclassified generated dimensions: add audited exact classes or narrow patterns, or extend the classifier.
3. **Use generated vocabulary.** Derive allowed spacing steps, semantic gaps, type roles, recipes, dimensions and data/custom variants from theme.css/tokens.json. Recognize `*-mu-space-N`, named component dimensions and `type-*` as meaningful categories. Allow SVG `fill-none`. Validate variants through loaded Tailwind, then enforce property ownership independently. Do not convert accepted data variants into blanket exceptions.
4. **Distinguish complete static maps from partial class construction.** Resolve typed finite maps, imported exported recipe constants, standard joins and registered merge helpers. Current `mergeFunctions`/`variantFunctions` settings help supported helpers but do not automatically solve arbitrary object lookup or generated stylesheet hooks. Keep actual partial classes such as `gap-mu-space-${size}` forbidden. Document portal-instance CSS as a narrow generated-style exception.
5. **Express geometry and illustration contracts narrowly.** `no-inline-styles` accepts CSS custom properties by default; use them for dynamic numeric inputs with named classes. Where geometry is genuinely owned by a component, allow reviewed properties/contract patterns and preserve timing/token checks. Docs comparison/frozen-state/X-ray roles need explicit permissions attached to known demonstrations or wrappers, not an entire docs rule-off override. Broad path-based triage in this report is not a proposed production policy.
6. **Add checks the generic tool cannot express.** Preserve MetalUI's existing check:utilities/lint:habits and approved baselines; add source-aware enforcement for named layout spacing, pointer-hover gating, named transition properties, motion tokens, outline focus, logical inline sides and named z-layers. Review recipe-specific exceptions and host-safe behavior independently of grammar validity.

Recommended next measurement: add one ownership-contract layer and source-CSS/hook registration, rerun the same three areas, and compare reductions against this raw snapshot. Keep confirmed stale-token candidates visible; do not adopt these heuristic category totals as a suppression baseline.

