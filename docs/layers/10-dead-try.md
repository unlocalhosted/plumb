# Layer 10: dead decisions and `plumb try`

Built DESIGN 4.6, 7.2 and row 10 only. No installs, commits or MetalUI writes. `formatText`, `formatFinding` and `brief` in `src/report.ts` remain unchanged; its only addition is an optional summary-data field.

## Dead decisions

`dead/<family>` is an informational finding grouping unused project-origin decisions by family. It cannot itself fail a check. The record combines adopted decisions and the existing project-theme inventory, so a theme key outside a preset's judging ladder remains visible. Framework/inferred records are not reported as dead.

Usage starts at lowered declarations inside the configured source globs and follows named references, compiler-selected decision keys, decision values and custom-property aliases transitively. CSS and DTCG references use the same reachability graph. Cycles terminate; multiple records sharing an explicit reference retain their identities. A used semantic decision keeps its primitive dependencies alive. Decision definitions are graph edges rather than usage roots: an unused semantic alias does not keep its primitive alive. Equal literals do not prove reference usage, including under `identity: 'value'`. Imported definitions outside source can connect a source consumer to a decision, but outside-source consumers do not establish usage.

Tailwind-selected keys survive inline theme rewriting for JSX utilities and `@apply`, including colors, spacing, radius, typography, motion and shadows. Applied candidates are judged by the project's compiler, not by guessed class spellings. Lowering-cache revisions invalidate older metadata.

Two explicit publication declarations silence dead findings:

```ts
export default {
  decisions: { color: { exported: true } }, // the entire color family
  exported: ['--spacing-public-*', 'tokens/**/*.tokens.json'], // names/ref aliases or relative source paths
}
```

Published semantics also keep their dependencies alive. These declarations affect unused-token reporting only; provenance rules and ledger acceptance still apply. Export marking has priority over the `used` count, so the counts form a disjoint partition: `total = used + exported + dead`.

`Report.deadDecisions` supplies per-family counts to JSON and text-summary consumers. The CLI appends those counts after the existing formatter. Each grouped finding retains the dead records, source sites and exact synthetic declaration occurrences for the existing ledger. Informational groups remain informational before and after baseline.

## Snippet checking

```sh
printf '<div className="gap-10" />' | plumb try --json
printf '<div className="gap-s3" />' | plumb try --agent
printf '.row { gap: var(--spacing-s3); }' | plumb try --lang css --as src/new.css
```

Stdin is an in-memory source overlay. `--as` defaults to `src/__plumb_try__.tsx` and must match the project's source globs, including exclusions, inside the project root. An existing source path can be overlaid for inspection without replacing its file; the Tailwind entry is rejected because it supplies the project's judging context. `--lang tsx|css` controls lowering. Without it, an explicit CSS/JSX path supplies the language; otherwise a TSX parse distinguishes TSX from CSS. CSS may use the default `.tsx` virtual identity when no path was supplied.

The normal collectors, import graph, class registry, compiler, decisions, existence rules, provenance rules, ownership and habits supply context. Relative TSX imports and CSS imports resolve from `--as`. Ownership discovery reads the same in-memory TSX overlay; CSS overlays are excluded from component parsing even when the virtual path ends in `.tsx`. TSX style objects, embedded CSS, CSS nesting and `@apply` keep their existing lowering behavior. Only the virtual source's declarations/findings are judged and emitted; surrounding source definitions still supply resolution/existence context. Existing debt never excuses an invalid snippet. Whole-project dead checks are skipped explicitly in report notes.

Output supports text, `--json`, or the shared Layer 9 `formatAgent` surface with locations, compiled values, nearest decisions, reasons and one instruction per site. A clean agent result starts with `0 new`, followed by the shared loop rules. Exit codes: 0 without errors, 1 with any error, 2 for usage/config/parser failures. Language/path flags are restricted to `try`; `--json` and `--agent` are mutually exclusive. Both check and try use the same agent formatter.

`try` reads existing lowering/module caches but never creates, updates or deletes cache/source/config/ledger files. All three persistence points have additive read-only parameters, defaulting to normal check behavior. Cold, warm, passing and failing CLI runs are checked against complete file/directory snapshots. Plumb config functions and project compiler plugins remain user-supplied executable code; this guarantee concerns Plumb's own persistence.

## Integration and verification

The real-CLI `node:test` slice in `e2e/dead-try.test.mjs` covers unused tokens; family/name/source exports; primitive survival; orphan aliases; equal literals; inline compiler keys; named `@apply`; aliases crossing source boundaries; outside-source consumers; virtual locations; nearest decisions; passing spacing; CSS inference/imports/`@apply`; imported TSX constants; agent/text output; baseline bypass; cold/warm no-write snapshots; invalid flags/paths/syntax; and duplicate CSS import contexts.

The benchmark exposed a pre-existing dead-variable site deduplication problem: comparing complete objects via `JSON.stringify` treated equal sites with different property insertion order as distinct. Ledger classification then lacked a key for one duplicate. A one-line physical-location comparison fixes that integration boundary, with a real-CLI regression. Existing layer tests only change assertions where informational dead groups are newly expected; their provenance expectations remain enforced.

The merged CLI integration fixture verifies shared agent output with instructions at both sites of a grouped finding, compiler-proven hover suggestions and ownership findings, on cold and warm runs with complete file/directory snapshots unchanged. Surface fixtures retain provenance checks and also assert informational dead-decision SARIF results and GitHub notices.

Run `npm test`, `npm run typecheck` and `git diff --check`. No unit tests were added. Final results and measured benchmark latency are recorded in the appended Layer 10 section of [BENCHMARK.md](../../BENCHMARK.md).

## MetalUI benchmark

`PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/layer10 node bench/metalui/dead-try.mjs` runs the real CLI against read-only MetalUI. It verifies stable whole-project counts, publication marking, three warm named-gap snippets and one invalid snippet naming the nearest spacing decisions. It records the pinned MetalUI HEAD and refuses a HEAD change during the run. Source, config and caches remain in their proper repositories.

[Structured evidence](../../bench/metalui/layer10.run.json) lists every unused decision with its value, references, tier and source. [Publication config](../../bench/metalui/dead-try.config.ts) marks only the published token/theme sources, leaving future docs-only decisions visible. Family-wide `exported: true` is an alternative when every decision in that family is intentionally public. Unused in docs is not evidence that a published library token can be deleted.

The snippet checker currently reads the full project context rather than maintaining a separate editor daemon. Warm latency includes process startup, context collection and decision extraction. These measurements are individual local runs, not latency guarantees or a claim of visual correctness.
