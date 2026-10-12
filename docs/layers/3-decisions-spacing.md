# Layer 3: decision record and spacing provenance

Built Layer 3 only. Decision readers and resolution live in `src/decisions/`; spacing judgement lives in `src/rules/provenance.ts`. No packages installed, no commits, no MetalUI writes. Project-specific token mapping stays in `bench/metalui/plumb.config.ts`.

## Record and readers

There is one `Decision` type: `family`, `name`, `value`, optional `resolved`, `refs`, `origin`, `tier`, `why`, and `source: { file, line }`. Reports expose `decisions`; finding alternatives use the same records. Source paths and lines identify the declaration, including unused theme keys and duplicate DTCG token names in different groups.

- Tailwind's loaded design-system key set is authoritative. The compiler supplies effective values and honours namespace/all-theme resets; the CSS reader attaches declaring-file origin, line, adjacent why and tier override. Theme keys survive even when no class candidates exist. `--spacing` is retained only as a resolution unit. Default fonts map to type; other built-in dimensional namespaces map to size. Records are collected for all families, but only spacing provenance runs in this layer.
- Project `:root` and `html` declarations outside `@theme` supply decisions in known namespaces and variables for resolution. `css:<file glob>` (or a bare file glob) selects an explicitly named file's custom properties for a family, including nonstandard namespaces such as `--space-small`. Properties belonging to another recognized family are excluded. Workspace CSS independently reached through project CSS remains project-origin; node_modules and external package reaches remain framework-origin.
- `dtcg:<glob>` reads DTCG `$type` (including inherited group type), `$value`, `$description`, references, and `$extensions.plumb.tier`. Dimension values support string and `{ value, unit }` forms. DTCG references can cross matching files. Colors, durations, fonts, cubic Béziers and composite records are inspectable; enforcement of their properties belongs to later layers.
- Preset functions return the same records. Public `defineDecisions()` supplies project origin, default reference, empty why and inferred tier; explicit fields override defaults. Returned records are validated and copied before analysis. A preset's source file and line remain visible. No project token format is built into core.

Family config accepts optional `from` (string, string array or function), `identity`, `origins`, and `callers`; malformed shapes, origins, tiers and identities are rejected. An identity/caller override need not repeat the inferred source. Other layers' pre-existing config fields retain their old validation, without gaining execution semantics here.

## Resolution and policy

Resolution follows static theme/root/preset/DTCG references with a cycle guard and an **eight-hop cap**. DESIGN 3.4 proposed one hop; this layer deliberately goes further because theme keys routinely alias root tokens which themselves alias primitives. Two-hop CSS and DTCG fixtures prove the result. Missing references, cycles, conditional or conflicting root definitions, `light-dark()`, `env()`, and incompatible calc units retain no `resolved` value. Compatible arithmetic, nested calc, parentheses and scalar multiplication/division fold. Absolute CSS lengths compare in px; rem uses the CSS initial 16px root size. This is static analysis, without a computed cascade or runtime root-size measurement.

A semantic record references another decision of the same family; a CSS `tier:` annotation, DTCG extension or preset field can override inference. Default callers allow both tiers when there are no semantics and switch to semantics when any exist. Explicit callers override that rule.

Spacing properties include physical/logical padding, margin, inset and sides, row/column gap, scroll padding/margin, and margins emitted by space-x/y. Every component of a spacing shorthand is checked, including mixed literals and references. Original lowered declarations and authored shorthand sites remain intact; coverage counts declarations, without multiplying one shorthand into four synthetic sites.

Judgement order:

1. Direct refs naming spacing decisions check origin, then tier. A restricted origin yields `provenance/spacing/framework`; a restricted tier yields `/tier` and semantic alternatives.
2. Refs naming units, compiler infrastructure or recipe variables resolve through to literals. Same-context `--tw-*` definitions may resolve, but do not themselves become decisions.
3. Spacing defaults to identity `value`: literal px equality with a project step passes, subject to tier. Identity `reference` reports equal literals under `/by-value`, severity warn.
4. Zero, auto, percentages, CSS-wide keywords and negatives of accepted amounts pass. Other literals yield `provenance/spacing`; failed bracket values use `provenance/arbitrary`. Nearest approved values below/above include source reasons and a theme utility or CSS variable. Equivalent-value aliases with a reason are preferred for recommendations.
5. Only known spacing properties with dynamic values use `provenance/opaque-inline`, severity warn. Fully opaque inline objects/spreads/computed properties (`prop: "*"`) and dynamic nonspacing properties contribute no spacing findings or spacing coverage. All remain visible in inline reporting: `opaque` counts all opaque declarations, `fullyOpaque` counts unknown-property declarations, and `spreads` retains its existing count. Text output names the fully opaque count.

The shared declaration set in `src/index.ts` is filtered by site-file membership in the configured source globs before any provenance or later judging rule runs. Stylesheets and modules reached outside those globs remain existence proof and decision-resolution inputs; their declarations are excluded from judgement and reported declaration coverage. The e2e slice proves an imported project-owned outside stylesheet with `margin: 13px` has no spacing finding while the same declaration in a source stylesheet does.

Keyframes, custom-property definitions and framework/package-origin declarations are excluded. Classes authored by the project remain project sites even when their compiler definitions come from a package, but spacing is judged only when the compiled candidate has an authored value. Tailwind's `parseCandidate` distinguishes static candidates, functional candidates with null values, functional values (theme keys, numeric/fractional segments and arbitrary values), and arbitrary properties. A value-bearing parse must also compile through `compileAstNodes`: names such as `mt-auto` can parse both as a static utility and an invalid functional interpretation. The resulting `authoredValue` signal is cached with compiled candidate CSS; a new cache key invalidates prior entries. Static framework declarations such as `sr-only`'s -1px margin are excluded without a hardcoded utility list or a ladder exception. Project static `@utility` definitions are materialized through Tailwind and source maps, including unused definitions, then judged at their stylesheet source rather than each class use. Duplicate materialized contexts are deduplicated; ordinary CSS and apply sites retain their origins. Grouping uses `(rule, spacing property family, normalized static value)` and deduplicates physical sites. Thus inline `padding: 10` and stylesheet `margin: 10px` share one finding, with fixes appropriate to both properties. This grouping key is not the future ledger's authored-site identity; no ledger is implemented.

`coverage.spacing = { fromDecisions, total, findings }` counts judged declarations. `findings` counts failing/warning declarations, not grouped report entries; `fromDecisions + findings = total`. Neutral authored values are counted as accepted coverage. The shared `isJudgedSpacing` boundary also drives benchmark reconciliation, preventing excluded class/inline declarations from reappearing as spacing debt. Report timings now include decision reading and provenance. Cached effective theme values share the candidate compiler graph hash; source, config and token metadata are reread for judgement, so warm runs do not hide edits.

## Inspection and verification

```sh
npm test
npm run typecheck
node dist/cli.js decisions --root fixtures/tailwind-min
node dist/cli.js decisions --root fixtures/tailwind-min --family color --json
node dist/cli.js decisions --root fixtures/tailwind-reset --json
node dist/cli.js check --root fixtures/spacing --json
node dist/cli.js decisions --root fixtures/dtcg --json
node dist/cli.js check --root fixtures/preset --json
```

`decisions` prints records and exits 0 as an inspection command; `--family` validates the family name. Check retains the existing 0/1/2 exit contract. JSON schema includes records, source objects, spacing coverage and timing phases.

CLI integration/e2e covers project/framework color records, semantic color aliases, both reset forms, package theme origin, empty-candidate inspection, nearest 12px/16px with adjacent why comments, numeric ladder equality, negative/neutral values, space-x, logical/scroll spacing, CSS/inline grouping, apply tier failures, identity/origin/caller changes on warm runs, cycles, media and light-dark opacity, two-hop aliases, DTCG descriptions and overrides, and custom preset reasons. Existing plain-CSS fixture now explicitly selects its nonstandard spacing properties.

Benchmark reconciliation uncovered three class-reader gaps that would have hidden real spacing: JSX inside props, arrays joined with a literal space, and standalone bounded template/const branches. These paths now lower through the existing reader; an e2e slice verifies them. No spelling-based spacing verdict or MetalUI exception was added.

Final verification: `npm test` **58 passed, zero failures/skips**; `npm run typecheck` and `git diff --check` pass. New fixture slices prove that `sr-only`, variants, static project utility uses and successful no-value candidates produce no spacing findings; `mt-[13px]`, `mt-13` and arbitrary properties still fail; theme values/fractions pass; project utility definitions (including unused ones) are judged at their source; fully opaque inline values contribute zero spacing coverage while known dynamic spacing warns. Cold/warm declarations and findings match.

MetalUI rerun: **1,608 accepted / 2,183 judged**, **575 failing/warning contexts**, **124 grouped findings / 568 physical sites**. Static class spacing exclusions: **335**; fully opaque inline entries retained outside spacing: **177**; known dynamic spacing warnings: **170**. Cold report/process: **3142.2 / 3247.3 ms**; warm report/process: **966.9 / 1069.2 ms**. Numeric reconciliation remains **109 findings**, with **466 additional contexts** summing to 575. Source-site filtering removes 206 previously judged outside contexts (143 accepted, 63 failing), including the package theme; existence findings remain unchanged. Full benchmark measurements, current grep reconciliation, recipe treatment, additional findings and retained limits are in [BENCHMARK.md](../../BENCHMARK.md). Reproduce with `node bench/metalui/measure.mjs layer3` and `node bench/metalui/reconcile-layer3.mjs`.

## Scope

Color/radius/type/motion/elevation/size/z/opacity records are inspectable; their declaration provenance is Layer 4. No dead-variable rule, new habit, ownership contract, ledger, inferred usage ladder, component decision extraction or named-utility decision synthesis was added. CSS resolution does not evaluate component-scoped custom-property cascades, relative em/ch/viewport geometry, min/max/clamp or mixed percentage/length calculations. Such spacing remains an explicit finding, rather than a guessed pass. Composite DTCG values are retained for inspection; this layer's operative equality is scalar spacing.

## Numeric Tailwind spacing when no ladder replaces it

`--spacing` stays a resolution unit, not an enumerated token. A positive, statically resolved effective Tailwind unit supplies the numeric scale unless the theme replaces it. Replacement means either a project `@theme` reset (`--spacing: initial`, `--spacing-*: initial`, or `--*: initial`, including a later reintroduced unit), or at least one positive length up to 64px among project primitive spacing decisions. Semantic aliases and layout-role names containing page, rail, content, reader, safe, tab, sidebar, header, footer, panel, shell, viewport, screen, container, width, height, max or min do not count. Large layout dimensions such as a 220px rail or a 56rem content maximum do not count. Detection uses effective resolved decisions and source reset declarations, not utility usage frequency. Explicit decision readers can supply a ladder too.

Without replacement, `calc(var(--spacing) * n)`, reversed multiplication and the unit itself are accepted for spacing, including negative and fractional factors, whether the unit is Tailwind's default or a project value. Other arithmetic mentioning the unit still requires normal judgement. Off-scale lengths receive adjacent half-step choices, expressed as the property's numeric utility (`gap-3`, `gap-3.5`, `p-4`) and valid CSS `calc(var(--spacing) * n)`. Numeric choices are synthetic records for findings only, so inspection does not pretend `--spacing-3` is a declared CSS variable. Existing named tokens still match normally.

With a replacement ladder, numeric utilities retain existing project-token judgement and nearest named alternatives; the numeric fallback adds no decisions or coverage. MetalUI defines `mu-space-*` rather than resetting its host's unit: its theme explicitly preserves host `--spacing`, and its exported small primitive ladder establishes replacement.

Numeric choices use the shared structured edit transport: class variants, importance and negative signs are retained, while inline and stylesheet values receive the actual `calc(var(--spacing) * n)` expression. Synthetic step names are edit identifiers, never an instruction to write an undeclared `var(--spacing-n)`.
