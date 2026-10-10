# Overlay 12 result

Implemented server-side computed-class attribution. No commits. `overlay/src/widget.js` and the MetalUI reference repository were not changed.

## API

`Session.classes(file, line, column, classes)` and authenticated `GET /__plumb/classes?file=…&line=…&column=…&classes=…` accept an authored JSX location and the whitespace-separated rendered class list. The shared Node, Fetch, daemon and JSON-RPC transports expose the method.

The response contains `revision`, the requested `file`/`line`/`column`, `classes`, `unattributed`, and `limited`. Each attributed entry has a `token`, `ambiguous`, and candidate `sites`. Each site has its file, line, column, source hash, declarations, findings, and structured edits. Submit that site's `file`, `hash`, and selected edit IDs to the existing `apply` method.

Attribution prioritizes the className expression's static path, then collected literal sites in the same file, then its import graph. Equal candidates are retained and marked ambiguous. Fallback never searches unrelated project files or arbitrary strings. Collector usage aliases are excluded from authored candidates, even when an identifier has the same spelling as a class.

## Analysis and edit behavior

The static tracer follows lexical bindings, template parts, conditional branches, helper returns, arguments and defaults, object-map members, imported/re-exported helpers and export-star barrels, namespaces, className callbacks, class joins, and cn/cva/tv recipe literals. Runtime string concatenation and glued template fragments are not synthesized or executed.

Traversal has a 50 ms budget, 20,000 operation limit, six import hops, ten helper-call depth, and a sixteen-level expression limit. A limit is exposed through `limited`; incomplete traversal cannot trigger guessed fallback attribution. Parsed modules, literal tables and declaration indexes are retained for warm reads, with source/dependency reconciliation before subsequent reads and writes.

Proven helper literals join normal collection and judgement, including helpers outside the source glob. Their exact existing structured-edit IDs remain valid through `edits` and `apply`; writes still enforce source hashes, root containment, regular-file identity and non-overlapping edits. Unrelated imported files do not become editable merely because they were parsed.

## Fixtures and verification

Read MetalUI's `packages/metalui/src/components/button/button.tsx` and `scripts/lib/recipes.mjs` as read-only reference. `fixtures/computed/src/Button.tsx` copies its BODY/RING/FRAME/PRESS/REGULAR/CAPS/COMPACT constants, buttonClasses helper, pressed/square branches and own template. One documented fixture-only padding drift provides an edit target. Separate fixtures cover recipes, conditionals and imported helpers.

`e2e/computed.test.mjs` contains integration coverage for those shapes, Node literal-only edits, imported/re-exported helpers, helpers outside source globs, callbacks, namespaces, lexical shadowing, conditional joins, fallback precedence, ambiguity, runtime strings, depth limits, warm reads, stale hashes and HTTP/Fetch validation. Its browser test uses real Vite/React, locates the rendered element, requests classes, applies from Node and checks the resulting CSS.

Validation:

- `npm run build`: passed before tests.
- `npm run typecheck`: passed.
- `npm test`: passed; 344 test executions across the standard, polling and no-watch runs: 324 passed, 20 skipped, zero failures.
- `node --test e2e/computed.test.mjs`: 13 passed, one browser test skipped because the configured Playwright Chromium executable is absent.
- A separately supplied headless Chromium could not launch inside the macOS sandbox (`bootstrap_check_in … Permission denied`). The equivalent browser flow passed in connected Chrome against a disposable fixture: React locate, GET classes using the actual DOM class list, exact Node apply, unchanged consuming JSX, and computed padding changing from 10px to 8px. Vite polling was used for source-change delivery in this environment.
- `git diff --check`: passed. No temporary fixture servers or proof tabs were retained.

The remaining automated skips are existing browser-executable/native-watcher availability checks and watcher-mode-specific exclusions.


## Follow-up: nullable ASTs, shared helpers and real-project smoke (2026-10-10)

The reported MetalUI command reproduced `Cannot read properties of null (reading 'type')`. The original frames identified `ComputedClasses.module`'s parameter walker: array destructuring leaves null entries in ESTree child arrays. Generic computed traversal now filters omitted children. Both evaluators accept absent nodes; parameter/default traversal, absent function bodies and argument inspection are guarded. Sparse class arrays, null/undefined helper arguments, declaration-only functions, bare returns and empty JSX expressions remain safe without becoming class evidence.

Unexpected CLI failures print their stack. The worker sends the original stack and usage-error classification across its boundary; Session preserves the worker frames, and failed-startup health diagnostics print them. Expected CLI usage/config errors retain their one-line format. Integration coverage injects a startup failure through a real decision provider and checks Session, CLI `serve --stdio`, and the health diagnostic.

### Shared helper registry

`src/collect/class-helpers.ts` is the single registry for `cn`, `clsx`, `cx`, `classNames`, `twMerge`, `twJoin`, `cva` and `tv`. Both collectors consume its argument and config-key modes. The Session worker also receives the loaded config's helper contracts; custom helpers no longer disappear from `Session.classes`.

`classHelpers` accepts legacy strings or descriptors. `args` is `classes` or `config`; `configKeys` selects the config properties containing class payloads. Other keys are metadata. For mixed signatures, optional `configFrom` is the zero-based first config argument (`cva` uses 1). Project entries extend or override helpers by name. Config validation, the public TypeScript types and JSON schema support the same shape. Collection cache version is bumped so previous semantics cannot leak into warm reads.

```ts
classHelpers: [
  'joinStyles',
  { name: 'makeRecipe', args: 'config', configKeys: ['classes', 'variants', 'compoundVariants', 'className'] },
  { name: 'mixedRecipe', args: 'classes', configFrom: 1, configKeys: ['classes'] },
]
```

Fixture integration checks cover opaque custom implementations, imported aliases, mixed arguments, legacy joins, recipe metadata exclusion, exact literal attribution and literal-only edits. No unit tests were added.

### Additional real-project blocker

AlgoRecall's `src/problems/content/course-schedule/phases/BuildDetectors.tsx:277` contains `'[&_.bg-error\/5]:hidden'`. JavaScript consumes that slash escape; Tailwind sees `[&_.bg-error/5]:hidden` and emits a selector Lightning CSS rejects with `Unexpected token Delim('/')`. The lowerer now retains a `Could not lower …` diagnostic for candidate CSS syntax errors and continues with valid candidates. It emits no declarations or edits for failed candidates and does not cache failed lowering as success. Other unexpected lowering failures still abort. The real source was not changed.

`fixtures/computed/src/Nullable.tsx`, `HelperShapes.tsx` and `InvalidSelector.tsx` reproduce these real shapes. The invalid-selector test checks whole-project analysis, Session attribution, the diagnostic, absence of invented declarations/edits, and a valid neighboring literal edit.

### MetalUI Button attribution

Called `Session.classes('packages/metalui/src/components/button/button.tsx', 171, 5, renderedClasses)` using the exact rendered list from the follow-up. Result: **36 distinct rendered tokens; 34 attributed; 2 unattributed; 6 ambiguous; `limited: false`**. Ambiguous tokens are included in the 34 attributed tokens. The query took approximately 125 ms, including candidate analysis.

Unattributed: `mt-4`, `shrink-0`. They enter through runtime consumer `className`; this component's static path/import graph cannot prove their authorship.

All candidate sites below are in `packages/metalui/src/components/button/button.tsx`:

| Ambiguous token | Authored candidates (line:column) |
| --- | --- |
| `gap-button-compact-gap` | 74:25, 65:18 |
| `h-button-compact-height` | 74:48, 65:41 |
| `px-button-compact-pad` | 74:72, 65:65 |
| `rounded-pill` | 74:94, 65:87, 54:63, 61:111 |
| `type-button-compact` | 74:107, 65:100 |
| `[&>svg]:size-button-compact-glyph` | 74:127, 65:201, 60:25, 61:14, 62:11, 63:20 |

The runtime cap/size branches leave several literal candidates, so all candidates remain visible. Every other attributed token has one authored candidate.

Findings: only `not-data-disabled:active:ease-linear`, at line 53 column 114, has a finding: `provenance/motion` (error), “transition-timing-function linear isn't one of your motion tokens”. No rendered token has a structured edit. The other 33 attributed tokens have no findings. No real-project edits were applied.


### Read-only CLI smoke

All four checks completed with valid JSON reports and empty stderr. Every command used `PLUMB_CACHE_DIR=/private/tmp/plumb-l12-cache`. No project files, config, ledger, or browser build caches were written. No `apply` was called against a real project; before/after git status snapshots for all four repositories were identical.

| Project | Exit | TSX files | Unique classes | Findings | Error findings |
| --- | ---: | ---: | ---: | ---: | ---: |
| MetalUI | 1 | 342 | 2884 | 1383 | 1298 |
| Kamui web | 0 | 38 | 135 | 116 | 95 |
| Crafting Attention app | 0 | 668 | 3127 | 1054 | 820 |
| AlgoRecall | 1 | 2606 | 3188 | 2670 | 916 |

Exit 1 is the normal findings status, not a startup failure. Kamui and Crafting Attention have inferred config, so their initial checks remain advisory and exit 0 despite findings.

Commands:

```sh
PLUMB_CACHE_DIR=/private/tmp/plumb-l12-cache node dist/cli.js check --root /Users/vijaysingh/unlocalhosted/metalui --config /Users/vijaysingh/unlocalhosted/plumb/bench/metalui/overlay.plumb.config.ts --json
PLUMB_CACHE_DIR=/private/tmp/plumb-l12-cache node dist/cli.js check --root /Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui --json
PLUMB_CACHE_DIR=/private/tmp/plumb-l12-cache node dist/cli.js check --root /Users/vijaysingh/unlocalhosted/craftingattention/app --json
PLUMB_CACHE_DIR=/private/tmp/plumb-l12-cache node dist/cli.js check --root /Users/vijaysingh/unlocalhosted/algorecall --config /Users/vijaysingh/unlocalhosted/plumb/bench/apps/algorecall.plumb.config.ts --json
```

AlgoRecall's only failed-lowering note is the malformed arbitrary selector documented above. That candidate remains attributable to its literal, but cannot supply compiled declarations or edits.


### Final validation

- `npm test`: passed after the final lowerer change; 353 executions across standard, polling and no-watch runs, 333 passed, 20 skipped, zero failures.
- `npm run typecheck`: passed.
- Four targeted new regression scenarios (nullable syntax, shared helper shapes, startup stacks, AlgoRecall invalid selector): all passed.
- The computed browser regression remains skipped because the configured Playwright Chromium executable is absent. Other skips are existing browser/native-watcher availability and watcher-mode exclusions.
- `git diff --check`: passed.
- Final real-project status snapshots still match their originals. Existing uncommitted work remains; no commits were created.
