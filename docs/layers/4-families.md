# Layer 4: family provenance and variable existence

Layer 4 extends the Layer 3 decision engine to color, radius, type, motion, elevation and z. Spacing remains one family of that engine, with its prior acceptance boundary, arithmetic, nearest ladder steps, grouping and integration tests preserved. Size and opacity decisions remain inspectable but are deliberately **not judged**. No habits, ownership, ledger, installation or commit was added. MetalUI was read only; its mapping lives under `bench/metalui/`.

`src/report.ts` changed only declaration/report types. `brief`, `formatFinding`, `formatText` and all text-view code were verified unchanged. New family coverage is available in JSON for the owner's text-view adaptation.

## Shared primitives and policy

`src/rules/families.ts` defines property membership, balanced CSS tokens, var/fallback parsing, color argument extraction, font shorthand decomposition and OKLab conversion. `src/rules/provenance.ts` applies identity, origin, tiers, nearest alternatives and grouping once per family. `spacingProvenance` and `isJudgedSpacing` remain available for the existing benchmark.

| Family | Judged properties / parts | Default identity | Neutral authored values |
| --- | --- | --- | --- |
| spacing | Existing physical/logical margin, padding, inset/sides, gap, scroll spacing | value | Existing zero, percentages, auto, normal and CSS-wide keywords; negatives match the positive ladder |
| color | color, background-color, border physical/logical color forms, outline-color, text-decoration-color, fill, stroke, caret-color, accent-color, column-rule-color; color parts of border/outline/background/shadow/text-decoration/column-rule shorthands; gradient stops in background-image/background | reference | currentColor, transparent, inherit, initial, unset, none, revert/revert-layer |
| radius | border-radius and physical/logical corner longhands; slash-separated elliptical components | value | zero and CSS-wide keywords |
| type | font-size, line-height, font-weight, letter-spacing, font-family; literal font shorthand parts and whole referenced type roles | value for numeric knobs; reference for font-family | CSS-wide keywords and normal |
| motion | duration, delay and timing-function for transition/animation; those parts of their shorthands, including calculated times | reference | 0s/0ms and CSS-wide keywords |
| elevation | Whole box-shadow stacks, including comma-separated layers | reference | none and CSS-wide keywords |
| z | z-index | reference | auto, 0, 1, -1 and CSS-wide keywords |

A declaration can belong to two families: box-shadow has color components and whole-value elevation. Coverage counts each family's judgement independently. Shorthands preserve authored sites; literal font shorthands expose their size, family, leading and weight as separate type judgements. Original report declarations remain available alongside the finding's particular font property.

Reference checks enforce origin before tier. Framework refs retain the framework name, plus project decisions with the same resolvable value. Package CSS custom properties outside `@theme` also carry framework provenance; internal `--tw-*` variables and the spacing multiplier remain infrastructure. A framework token is evidence in the finding, never a proposed approved replacement unless its origin was explicitly adopted.

Callers default to both tiers until a family has a semantic decision, then default to semantic only. Primitives remain legal inside decision sources. Value matching chooses primitives before equal semantic aliases, even if the semantic name sorts first; a coincident literal therefore cannot bypass the tier rule. Tier alternatives name the allowed semantic references/equivalent values, with source reasons. Explicit `callers` and `origins` retain their Layer 3 meaning.

Under reference identity an equal literal/nondecision resolved value is `/by-value`, severity warn, and names the matching decision. Other literals are errors. Color equality includes alpha; nearest color choices use Euclidean OKLab distance, top two resolvable decisions, preferring allowed tiers. Lightning CSS validates named/hex/rgb/hsl/hwb colors; Lab/LCH/OKLab/OKLCH and predefined RGB/XYZ spaces convert without clamping the gamut. Alpha affects equality but not the perceptual nearest ranking. Conversion matrices follow the CSS Color 4 sample conversions. Gradients, color-mix, light-dark and relative colors judge each color argument without treating channels, stop positions, interpolation spaces or image URLs as colors. Functions containing both an approved reference and a literal color still fail on the literal.

Spacing retains its neighboring ladder steps; other comparable numeric families suggest two closest values. Every suggested decision has `use: { class?, css }`, appropriate to its property family. Failed bracket declarations use `provenance/arbitrary` with their family retained; origin/tier diagnoses keep their more specific rules, matching spacing's existing behavior. Successful brackets are accepted; this is provenance rather than a spelling ban. Group keys are `(rule, family, normalized static amount)` and physical sites deduplicate. Known dynamic properties warn as `provenance/opaque-inline` per family. Fully opaque objects/spreads stay inline counts without invented property coverage.

## Compiler identity and definition boundary

Project `@utility` calls are judged at the utility definition, including unused definitions, rather than at every class use. The Layer 3 authored-value signal remains the boundary for class judgement. This prevents compiler-defined/static recipe geometry from becoming call-site drift.

Tailwind sometimes inlines shadow and font-weight theme keys. `decisionRefs` records the actual compiling named candidate's selected theme key before that rewrite; arbitrary values receive no such shortcut. Tailwind `@property` initial values fill missing same-rule infrastructure while preserving assigned shadow colors/fallbacks. Transparent empty shadow slots generated by the compiler are infrastructure, not authored literal elevation decisions. A numeric duration equal to a framework timing is reported as framework timing, including `duration-150`.

Source maps also retain `authoredCss` for compiled stylesheet properties. Compatibility fallbacks generated for color functions are judged against their authored reference-bearing expression, preventing a compiler-generated literal fallback from creating false by-value debt. Raw compiled values remain in `value`; source/config changes rerun judgement. Candidate and stylesheet cache revisions invalidate old lowering metadata. Cold/warm reports are checked for equal findings, decisions, coverage and declarations.

## Variable existence

`existence/dead-var` inspects references in every judged declaration inside the configured source globs. Its registry includes effective theme keys of every origin, custom properties at any selector in the stylesheet graph (including package CSS), `@property`, embedded JSX CSS, compiler utility assignments/registrations, inline custom properties, `style.setProperty` with a static name, custom-property maps and indexed JS map assignments. Maps permit variables supplied through spreads, returned models or memoized look objects to prove existence without evaluating their values. Strings mentioning a variable, comments, or ordinary `var()` reads are not definitions.

The registry is intentionally syntactic/global: a declared map proves a potential definition, not that a runtime branch runs or the property reaches the particular element. It does not compute the cascade, scope, registration inheritance or runtime reachability. The integration slice covers maps/spreads, indexed assignments, JS setters, inline properties, scoped CSS, package CSS and registration.

Missing variables group by name. A missing reference with fallback warns; without fallback it errors. A group escalates to error if any site lacks a fallback. The fallback is independently judged by its property's family, so an invalid fallback does not become accepted because the variable warning is softer. Nested fallbacks are inspected too. Close names reuse dead-class ranking and two-suggestion limits, with variable namespaces; broad unnamespaced names cannot displace a one-letter typo of `--color-brand`.

`coverage.existence.deadVars` counts physical missing-variable sites per grouped name, matching the existing dead-class site-count convention. A site with two missing names contributes to both groups.

## Coverage and validation

JSON/schema expose `{ fromDecisions, total, findings }` for spacing, color, radius, type, motion, elevation and z. `fromDecisions + findings = total` in each family. Neutral authored values count as accepted, so the field is accepted coverage rather than a claim that every accepted site explicitly references a token. Dead-var findings are independent of family coverage.

Real CLI fixture slices cover all requested tailwind-min examples, reversed-name tier defaults for every family, identities, framework names, perceptual nearest color, gradient/function argument checking, type utility definition sites, arbitrary family labels, fallback severity, all registry sources, effective theme resets and warm parity. The benchmark also verifies calculated shorthand delays. Existing Layer 3 spacing tests remain unchanged.

```sh
npm test
npm run typecheck
node bench/metalui/measure.mjs layer4
node bench/metalui/reconcile-layer4.mjs
node bench/metalui/decision-manifest.mjs
```

The final suite has **65 integration/e2e tests**, with no unit tests, failures or skips. Typecheck and whitespace checks pass. [BENCHMARK.md](../../BENCHMARK.md) records final per-family coverage, cold/warm timings, all grep hits, project mapping choices/exclusions, additional findings and dead-var verdicts. The source-text color audit is deliberately broader than the historical 75-hit claim; it records artwork/content and reader limitations rather than manufacturing an exact historical list.
