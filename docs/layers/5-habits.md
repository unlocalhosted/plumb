# Layer 5: habits

Built the closed declarative predicate DSL, nine built-ins, compiler-backed hover fixes, and `plumb habits`. No installs, commits, MetalUI writes, ledger, ownership, imitation or init implementation. Shared config/CLI/report/schema changes are confined to wiring, types, strict habit validation and additive report fields. `formatText`, `formatFinding`, `brief` and the entire text-view suffix of `src/report.ts` match HEAD byte for byte.

## Rule model

`habits` is opt-in. Zero config and absent/empty habits run no habit predicates. `plumb habits` evaluates all nine built-ins for inspection, lists reasons, severity, enabled state and declaration-context break counts, and exits 0 even when the project has findings. Ordinary checks retain the existing severity-based exit behavior. Report `habits` summaries use `breaks: null` for disabled, unevaluated rules; `timing.phases.habits` measures the new judgement phase. Existing finding fields carry `habits/<id>`, reason, fix and source sites. Z and motion compatibility names are accepted but delegate entirely to existing provenance; no duplicate habit findings or built-in listings.

Custom envelope:

```ts
{ id: 'text-height',
  when: {
    prop: 'height', value: '^12px$',
    owner: { kind: 'element', name: 'p' },
    origin: ['inline', 'stylesheet'],
    when: { has: { selector: 'text' }, lacks: { media: 'print' } },
  },
  message: 'Text must grow with its content.', severity: 'warn' }
```

Every supplied predicate is ANDed. `prop` and owner `name` are globs; `value` and condition strings are regular-expression sources, without slash delimiters/flags. `when.has` requires at least one matching condition for each supplied media/pseudo/selector kind; `when.lacks` requires none. `owner` may be a name glob or `{ kind?, name? }`; DESIGN's `ownerElements` example is retained as an exact element-name array. `origin` is one declaration origin or an array. Severity defaults to error; info/warn/error are accepted. Unknown keys/names, duplicate IDs, reserved built-in IDs, bad regexes, callbacks and nondeclarative objects fail with usage exit 2. Custom predicates may explicitly address source keyframes; opaque placeholders are never treated as actual values.

All rule inputs are the existing declaration set filtered to source globs. Import-graph declarations outside those globs establish existence only. No framework/project-specific strings or token mapping entered core. Static utility declarations and their actual class uses retain the lowered condition model; there is no spelling-only habit scan or cascade simulation.

## Built-ins and contextual proof

- Hover: remove balanced `:not()` spans before looking for positive hover; escaped class spellings and quoted attribute text cannot invent it. Every comma-separated media branch must require the relevant capability. `not`/`or` queries are conservatively insufficient; separate nested hover/pointer queries work. Selector siblings remain separate. CSS fixes split/gate the hover branch.
- Focus: outline removal requires outline restoration at the same source target on focus-visible/within. Restoration must cover the declaration's branch/media/container/supports conditions; a forced-colors outline may restore high-contrast accessibility. Shadow-only focus on the element flags, while before/after shadows are exempt. Primitive outline utility definitions are checked at class sites, matching the native oracle's utility exemption.
- Transition and easing: exact CSS keyword tokens flag `all` in transition/transition-property and `ease-in` in transition/animation properties, case-insensitively. Ease-in-out, variable names and quoted examples pass.
- Logical inline: physical sides, inline scroll spacing, border sides/corners and left/right text-align/float/clear flag. Asymmetric four-value margin/padding/inset flag. Center-origin positioning passes, matching the reference lint's centering exception. Physical corner longhands extend the native side regex because logical corner equivalents exist.
- Viewport: numeric vh/vw lengths flag; dvh/svh/lvh and corresponding width units pass. CSS strings/comments are masked.
- Safe area: balanced env calls require a fallback, including an env inside another function/fallback. Arbitrary unrelated env variables are not flagged.
- Clip: warn only with decoration evidence (radius, clip-path/mask or a decorative pseudo-element). Scrolling axes, truncation, resizing/scroll properties, height/block-size/grid-row transitions and opaque contextual values prevent a recommendation. Truncate/sr-only stay exempt. Unknown measurement/BFC requirements remain review territory.
- Containment: auto/scroll checks every scrolling axis for contain/none, including paired physical longhands and logical axes in a known vertical writing mode. Companions must belong to the same expression/element or CSS target and cover its branch, pseudo and media conditions. Generated overflow utilities are checked where used, matching native lint's definition exemption. Warnings do not fail a check on their own.

Class collection now retains a small expression/element context identifier. Habit analysis uses that identifier in a private map; declaration schema and Site remain unchanged. Inline attributes similarly use their existing declaration group. This prevents an adjacent element or a mutually exclusive branch from supplying an outline/overscroll companion.

## Hover oracle and lowering repair

The project's loaded design system, not Plumb's Tailwind, compiles probe candidates. Custom names come from imported CSS and compiler variants, including plugins; comparing the same compiler's empty design system distinguishes native defaults. `pointer-hover` is preferred. Equivalent custom hover variants work; a pointer-only custom variant is proven as `variant:hover` (or `variant:group-hover`/peer). Compound/named group and peer forms are separately compiled. Without proof, the fix supplies valid block-form `@custom-variant pointer-hover` syntax. Arbitrary selector hovers receive a media prefix that preserves their target. Oracle results are cached under compiler/version/complete CSS dependency identity and refreshed on custom-variant edits.

Package acceptance exposed a pre-existing lowering failure on declarations after a nested rule (`toast-deck`). Lightning's nested declaration location points at the first value, not its property. Both candidate and stylesheet lowering now recover the property by scanning backward over whitespace/name characters. This fixes the package crash and an omitted `library.css:65:93` hover color; cache revisions invalidate earlier metadata. The repair has no project-specific special case and is exercised through CLI fixtures.

## Verification and benchmark

`npm test`: 74 integration/e2e tests passed, no unit tests/failures/skips. Typecheck and whitespace checks passed. New fixture and CLI slices cover every built-in, custom DSL combinations/severities, zero config, listing, invalid grammar, source boundaries, nested/media/negated selectors, nested declaration runs, group/peer fixes, custom/plugin compiler discovery, cold/warm equivalence and invalidation, conditional focus restoration, and per-axis containment.

MetalUI measurement and complete reconciliation are appended to [BENCHMARK.md](../../BENCHMARK.md). The current read-only checkout is `9cb04dc818ac84d981f8215352237d5c5ab2f85b`, rather than Layer 2's older commit. Docs still account for 22 ungated stylesheets and exactly 30 reproducible unprefixed hover grep hits, plus six reused class locations. The native script runs without ratcheting, compiles its shipped package CSS to a temp directory, and exits 0 with 23 allowlisted breaks. Source and emitted-bundle lanes are measured separately so utility definition/call-site and separately imported icon CSS differences remain explicit.

Reproduce after building:

```sh
node bench/metalui/measure-layer5.mjs
node bench/metalui/reconcile-layer5.mjs
```

All caches and emitted parity CSS live under `bench/metalui/.cache/layer5*`; benchmark scripts never modify MetalUI. Cold runs clear only their own docs/package measurement caches. Warm timing includes all earlier layers and JSON output; the habit phase is measured separately. Detailed artifacts include every native CSS key, every difference, each source finding, all stylesheet hover contexts, and all grep/class locations.

## Limits

No computed cascade, runtime scrolling/measurement proof, media SAT solver or JavaScript callbacks. Boolean media expressions outside the proven conjunction subset remain ungated. Compound class composition across separate helper invocations, imported definition/use contexts, or a separately authored CSS selector cannot universally establish element identity; rules prefer an explicit local companion. Built-ins inspect static element declarations, while keyframe-specific team rules can use the custom origin predicate. A clip warning is a review request, never an unconditional automatic edit.
