# Layer 1 benchmark

Measured 2026-10-09 against MetalUI HEAD `ca465732b94e7ba654a05b69fd5bc7615788d4b6`, using its installed Tailwind `4.3.3`. No MetalUI files were written. Its existing dirty files include AGENTS.md, screenshots, Swift WIP, and .claude metadata; the scanned source/CSS had no tracked modifications. The cache lives under Plumb, not MetalUI.

## Reproduce

```sh
npm run build
export PLUMB_CACHE_DIR="$PWD/bench/metalui/.cache/verified"
node dist/cli.js --root /Users/vijaysingh/unlocalhosted/metalui \
  --config "$PWD/bench/metalui/plumb.config.ts" --json > bench/metalui/layer1.json
```

Use a fresh cache directory for a cold run, then repeat with that directory for a warm run. Both runs exit **1** because errors exist, including on the first run. Full reports: [cold](bench/metalui/layer1.cold.json), [warm](bench/metalui/layer1.json); process measurements: [run.json](bench/metalui/run.json).

## Counts and timing

Scope: `apps/docs/src/**/*.{tsx,jsx,ts,js,css}`; entry `apps/docs/src/styles.css`. Found 234 TSX, 24 TS/JS, 33 CSS source files. Collected 6,726 static class sites, 1,244 distinct candidates, and 144 opaque expressions/holes. Definition and usage sites are both included; branch contexts can produce distinct collected sites at one authored location. Findings deduplicate physical locations per class token.

| Measurement | Cold | Warm |
| --- | ---: | ---: |
| Wall time, including Node startup and JSON output | 1,226.6 ms | 834.6 ms |
| Report total, excluding CLI formatting | 1,157.9 ms | 762.9 ms |
| discover | 8.5 ms | 6.3 ms |
| parse (native + AST deserialisation) | 89.5 ms | 87.2 ms |
| collect (including source I/O and import resolution) | 65.8 ms | 54.3 ms |
| **parse + collect** | **155.3 ms** | **141.6 ms** |
| load | 155.5 ms | 25.6 ms |
| compile | 105.8 ms | 0.0 ms |
| Cache hits / misses | 0 / 1,244 | 1,244 / 0 |

Compilation timing includes parsing candidate CSS and folding local --tw-* assignments. Remaining total includes CSS selector registration, theme hint indexing/ranking, cache I/O, existence judgement and attaching sites. Cold/warm refer to Plumb's candidate cache, not flushing the OS filesystem cache. The warm parse+collect target is met in the final run: **141.6 ms**, versus **503.2 ms** in a fresh pre-review warm run. End-to-end remains under 10 seconds cold and 2 seconds warm. These are individual local measurements, not latency guarantees; intermediate pre-pruning warm trials ranged from 144.7 to 165.1 ms.

Before the review fixes, wall time was 1,733.0 ms cold and 859.0 ms warm; the intermediate comparison reports were not kept.

Final report: **39 grouped dead-class findings at 65 sites**, plus **2 dynamic-class findings at 2 sites**. Of those dead sites, 18 match the hand-verified baseline and 47 are additional inert or stale names. A separate registry reconciliation found **486 distinct uncompiled candidates declared in project CSS**, all protected from dead-class findings; the root-wide registry contains 1,143 class names. There are zero CSS-declared dead-class findings.

## Review fixes: parser approaches and suggestion acceptance

Environment: Node **v25.9.0**, macOS arm64, oxc-parser **0.153.0**, `availableParallelism()` **8**. All benchmark caches and temporary instrumentation live in Plumb; MetalUI remains read-only.

The installed `node_modules/oxc-parser/README.md` describes `parseSync` but omits raw-transfer options. Its shipped `src-js/index.js` dispatches **`experimentalRawTransfer: true`** to synchronous eager raw transfer. `rawTransferSupported()` returns **true** here. The package's `.d.ts` omits that experimental option; production keeps it in an options object alongside the documented `preserveParens` field. Unsupported platforms retain JSON transfer. Raw transfer is experimental and must be rechecked when upgrading Oxc.

The old `parse` phase combined native parsing/transfer and JS AST deserialisation. Initial instrumentation on the original collector measured **52.3 ms native/JSON transfer + 201.4 ms deserialisation**, with **247.3 ms collection/I/O**. Oxc was fast in Rust; materialising the AST was the dominant parser cost. The 258 configured files originally caused 280 parses because every component/library import was also parsed for possible exports.

| Approach | Parse | Collect / I/O | Combined or pool wall | Outcome |
| --- | ---: | ---: | ---: | --- |
| Fresh pre-review warm CLI, JSON transfer | 252.9 ms | 250.3 ms | 503.2 ms | Baseline |
| Raw transfer, original collector profile | 91.8 ms | 233.4 ms | 325.1 ms | Identical sites; transfer alone insufficient |
| Raw transfer + line index/simple traversal/synchronous reads | 92.1 ms | 103.0 ms | 195.1 ms | Identical sites; intermediate profile |
| Raw transfer + prefetched reads/direct walk, warm CLI | 92.7 ms | 84.4 ms | 177.0 ms | Further reduction |
| Final collector with JSON transfer, instrumented | 246.9 ms | 63.4 ms | 310.3 ms | Identical sites; fallback comparison |
| Final collector with raw transfer, instrumented | 68.3 ms | 49.4 ms | 117.6 ms | Identical sites; profiler excludes public raw-module dispatch setup |
| **Final raw-transfer CLI, warm** | **87.2 ms** | **54.3 ms** | **141.6 ms** | **Kept; all 45 e2e tests pass** |
| Final collector, 2-worker pool | — | — | 182.3 ms | Slower; rejected |
| Final collector, 4-worker pool | — | — | 159.2 ms | Slower; rejected |
| Final collector, 8-worker pool (available parallelism) | — | — | 196.0 ms | Slower; rejected |

Pool timings include worker startup, duplicated imported-map work, structured cloning, and deterministic site merging. Earlier pools before the final collector optimisations took 268.2/209.1/371.9 ms for 2/4/8 workers. Worker CPU times are not summed into a serial phase. The root thread creates worker_threads, not agent delegates.

Final raw instrumentation separates **22.8 ms native/raw transfer**, **45.5 ms AST deserialisation**, and **36.1 ms walking/evaluation**, with collection's remainder covering file reads, export indexing and setup. Eager raw deserialisation occurs *inside* `parseSync`; timing `result.program` alone would incorrectly report it as zero. `profile.mjs` times Oxc's raw deserializer callback separately. This diagnostic bypasses the public dispatch module's initial lazy-loading work, so the complete CLI measurement above is the acceptance number.

Production prefetches source texts, resolves imported literals only when used as class values, records line offsets once, walks visitor keys without temporary child arrays/type-only edges, and skips function bodies with no class/helper spelling. Backslashes disable that shortcut to preserve escaped helper identifiers. Exported literal nodes survive while unrelated completed ASTs are released. Only **259** ASTs now materialise. No AST/content disk cache is involved. The original, raw, JSON-fallback and worker results share the exact sites/opaque SHA-256 `48c5de8a70031e3f636a26dc3b50b9a67a8c689014196f68daebb6b0ba24d5a4`.

Additional rejected options: `experimentalLazy` exposes a different AST API (`node.params is not iterable` with the existing walker); forcing `astType: 'js'` changed opaque coverage from 144 to 143. Neither was kept. Raw comparison data, intermediate CLI timings and pool results: [approaches.json](bench/metalui/approaches.json).

Re-run diagnostics after building:

```sh
node bench/metalui/profile.mjs json
node bench/metalui/profile.mjs raw
node bench/metalui/profile-workers.mjs 8
node bench/metalui/measure.mjs review
```

`measure.mjs` runs the exact CLI arguments shown above in two fresh Node processes, with one new cache directory shared by cold and warm runs, and records wall time/output/exit codes. Profilers write and remove temporary collector copies under `dist/collect`; no installed package is modified.

Suggestions now require a shared utility prefix or Levenshtein distance divided by the longer **base utility** name <= **0.34**. Variants are preserved. Shared-prefix hints rank first, then authored theme keys/utilities, with suffix and shared-leading-spelling tie-breaks before distance. Up to two qualifying names are printed; no qualifying name means no “Did you mean”. Single-segment custom namespaces do not imply a value family; a static/functional utility-root ambiguity needs existing functional usage before generating value hints.

The previous 145,709-name `getClassList()` expansion/cap has been replaced by authored `@utility` names and compiler completions matching non-default theme keys for relevant utility roots. This run caches **33,501** such hints. Suggestions are keyed by candidate set as well as the stylesheet/compiler cache identity, so a new source slice can refresh hints while reusing compiled CSS. Ranking uses prefix/theme ordering to avoid unnecessary edit-distance calculations.

| MetalUI input | Actual first suggestion |
| --- | --- |
| `text-ink-dim` | `text-ink or text-ink2` |
| `group-data-checked:recipe-status-led-live` | `group-data-checked:recipe-status-lamp` (lamp-live is absent in this theme) |
| `mu-palette-eng` | `palette-eng` |
| Six `block-*` identities | No suggestion |

All 39 grouped dead findings, their 65 physical sites, both dynamic findings, coverage and opaque counts match the pre-review report exactly; only suggestion text changes. CLI fixtures also prove close/distant matching, never-collected theme-key preference, variant retention, lamp-live selection when declared, source-subset cache reuse, earlier-file exports and escaped helpers.

Internal lowering/CSS notes are hidden in ordinary check and explain text. **`--verbose`** prints them; JSON retains the report/site `notes` arrays unchanged. Final verification: `npm test` **45 passed, zero skips**, `npm run typecheck` passed, and `git diff --check` clean. No installs or commits.

## Hand-verified 19: reconciliation

All paths below are relative to MetalUI. JSON contains every location and column.

| Class | Expected | Found | Sites |
| --- | ---: | ---: | --- |
| `text-ink-dim` | 1 | 1 | apps/docs/src/pages/components/ScrollArea.tsx:69 |
| `rounded-field` | 7 | 7 | apps/docs/src/pages/components/ColourCue.tsx:22, apps/docs/src/pages/components/CueDocumentProof.tsx:24, apps/docs/src/pages/components/CueRecognition.tsx:46, apps/docs/src/pages/components/EnumCue.tsx:32, apps/docs/src/pages/components/LinkCue.tsx:21, apps/docs/src/pages/components/PersonCue.tsx:29, apps/docs/src/pages/components/TagCue.tsx:27 |
| `type-doc-body` | 5 | 5 | apps/docs/src/pages/components/Status.tsx:48, apps/docs/src/pages/components/Status.tsx:70, apps/docs/src/pages/components/Status.tsx:89, apps/docs/src/pages/components/Status.tsx:99, apps/docs/src/pages/components/Toast.tsx:128 |
| `rounded-mu-space-3` | 3 | 3 | apps/docs/src/pages/components/Menu.tsx:48, apps/docs/src/pages/components/Popover.tsx:48, apps/docs/src/pages/components/Select.tsx:60 |
| `max-w-mu-measure` | 2 | 2 | apps/docs/src/pages/components/Link.tsx:14, apps/docs/src/pages/components/Progress.tsx:26 |
| `font-inherit` | 1 | Out of scope | packages/metalui/src/components/numeric-cue/numeric-cue.tsx:221 is outside apps/docs/src; its component body is not traversed by this run. |

**18/18 in-scope sites found; the nineteenth is explicitly outside this source scope.** No baseline class was configured as a marker.

## Every additional dead-class finding

A name can be real dead-class drift without causing a visible defect: an unused wrapper identity can simply be removed. We checked exact names across project CSS and JS/TS sources/tests; CSS-owned sibling names and screenshot filenames do not establish a consumer for the missing name. Only independently verified selector hooks were exempted. The following 34 additional grouped findings remain (47 sites):

| Class | Sites | Verdict |
| --- | ---: | --- |
| `block-ai-composer` | 1 | Real drift: inert block identity on the section; no CSS rule or selector consumer. |
| `block-availability-picker` | 1 | Real drift: inert block identity on the section; no CSS rule or selector consumer. |
| `block-settings` | 1 | Real drift: inert block identity on the section; no CSS rule or selector consumer. |
| `block-share-panel` | 1 | Real drift: inert block identity on the section; no CSS rule or selector consumer. |
| `block-studio-week` | 1 | Real drift: inert block identity on the section; no CSS rule or selector consumer. |
| `block-task-inbox` | 1 | Real drift: inert block identity on the section; no CSS rule or selector consumer. |
| `bw-label-field` | 1 | Real drift: label already uses .bw-field; this additional name has no CSS or selector consumer. |
| `bw-light` | 1 | Real drift: instrument wrapper uses .bw-instrument; only .bw-light-diagram has styles. |
| `bw-shadow` | 1 | Real drift: instrument wrapper uses .bw-instrument; this name has no CSS or selector consumer. |
| `bw-shape` | 1 | Real drift: wrapper uses .bw-instrument; the diagram/outline/object classes supply its styles. |
| `bw-type` | 1 | Real drift: wrapper uses .bw-instrument; .bw-type-sample supplies the preview styles. |
| `ed-field` | 1 | Real drift: FieldXray instrument wrapper has no matching rule or selector consumer. |
| `ed-lasso-specimen` | 1 | Real drift: extra specimen wrapper name; lasso-specimens.css styles its children. |
| `ed-lc-well` | 1 | Real drift: well already uses .ed-specimen; this extra well name has no consumer. |
| `ed-pal-still` | 1 | Real drift: readable conditional class has no rule; PaletteFor sets the still geometry inline. |
| `ed-tb-well` | 1 | Real drift: well already uses .ed-specimen; this extra well name has no consumer. |
| `ed-toast-well` | 6 | Real drift: six wells already use .ed-specimen; the extra well name has no consumer. |
| `fold-demo` | 1 | Real drift: unreferenced FolderUnfold wrapper name; no selector or CSS declaration. |
| `fold-region` | 1 | Real drift: unreferenced FolderUnfold region name; no selector or CSS declaration. |
| `group-data-checked:recipe-status-led-live` | 1 | Real drift: the theme provides recipe-status-lamp, not recipe-status-led-live. |
| `icon-hero-stage` | 1 | Real drift: hero layout uses mu-stack/gap; this additional name is undeclared. |
| `icon-library` | 1 | Real drift: wrapper already uses .library; icon-library.css has no .icon-library selector. |
| `icon-morph` | 1 | Real drift: only the stage/keys/readout classes have rules; outer name has no consumer. |
| `icon-search` | 1 | Real drift: field uses .library-search; only .icon-search-count is declared and tested. |
| `is-contact` | 1 | Real drift: shadow geometry is inline; unlike is-drop/is-flat, this identity has no selector consumer. |
| `library-discovery` | 1 | Real drift: discovery wrapper has no rule or JS/test selector consumer. |
| `meta` | 3 | Real drift: stale typography class on three scoped hosts; the theme declares type-meta. |
| `mu-palette-empty` | 2 | Real drift: redundant identity on two empty notes; complete type/spacing utilities provide their styles. |
| `mu-palette-eng` | 3 | Real drift: stale typography utility spelling; the theme defines palette-eng. |
| `mu-palette-group` | 1 | Real drift: grouping wrapper has no CSS rule or JS/test selector consumer. |
| `recipe-status-led-off` | 1 | Real drift: the theme defines recipe-status-lamp-off, not recipe-status-led-off. |
| `recipe-surface` | 3 | Real drift: bare recipe no longer exists; the theme defines specific recipe-surface-* utilities. |
| `xr-menubtn` | 1 | Real drift: menu control wrapper uses inline opacity/transition; no rule or selector consumer. |
| `xr-tip-solid` | 2 | Real drift: two Tooltip overrides name a missing solid recipe; no CSS or selector consumer. |

## Exact marker configuration and excluded extra findings

The config has 11 exact patterns. They are literal names with glob semantics, not broad prefix exemptions; `mu-*`, `ed-*`, `xr-*`, `block-*` and `is-*` would hide genuine drift above. Each excluded initial extra finding is reconciled here:

| Pattern | Initial sites | Verdict and evidence |
| --- | ---: | --- |
| `mu-tooltip` | 1 | Marker that should be configured: tooltip.spec.ts:17,26 and TooltipXray.tsx:164 select the tooltip identity; paint comes from its utility classes. |
| `mu-tooltip-key` | 2 | Marker that should be configured: tooltip.spec.ts:47 and xray-tooltip-handoff.spec.ts:67,96 select the shortcut span. |
| `mu-dialog-title` | 1 | Marker that should be configured: xray-dialog-handoff.spec.ts:90,120,133 selects the title; typography is supplied separately. |
| `mu-palette-status` | 2 | Marker that should be configured: xray-palette-code.spec.ts:273 reads the footer status by this selector. |
| `is-flat` | 5 | Marker that should be configured: xray-switch-editing.spec.ts:97,100 reads the inline-painted flat face. |
| `is-drop` | 4 | Marker that should be configured: xray-switcher-editing.spec.ts:105 and xray-editing.spec.ts:102,106 select the drop-shadow plane. |
| `library-card-label` | 1 | Marker that should be configured: component-catalog-transitions.spec.ts:38 extracts labels using this selector. |
| `part-dot-display` | 1 | Marker that should be configured: apps/docs/src/app/catalog-transition.ts:26 uses it to locate the real specimen. |
| `xr-ib-glyph` | 1 | Marker that should be configured: xray-icon-button-editing.spec.ts:93,98 locates its SVG width. |
| `xr-slider-vars` | 1 | Marker that should be configured: xray-slider-handoff.spec.ts:135 locates the inline-variable host. |
| `naive-cap` | 1 | Marker that should be configured for Layer 1: Button.tsx:351 declares its active override in a JSX `<style>` string, outside this layer's .css registry. This exact exemption does not exempt other inline-style names. |

## Dynamic fragments and corrected tool bugs

- `mu-frost-${f}` (Materials.tsx:66): real dynamic-class fragment; use a map of complete classes for the frost choices.
- `mu-tint-${tint}` (FeelingsComposer.tsx:72): real dynamic-class fragment inside a readable conditional template; use complete tint classes.
- Tool bug, fixed: `ed-specimen${light ? ' is-light' : ''}` (five sites) was initially called a dynamic fragment. Its readable hole introduces a token boundary; the collector now preserves `ed-specimen`, collects the branch and counts the hole as opaque without reporting a fragment.
- Tool bug, fixed: SectionIndex.tsx:42 and PaletteSpecimens.tsx:162 have the same readable boundary pattern. Their static prefixes are retained; `ed-pal-still` is now correctly judged as a complete missing class rather than hiding inside a false fragment.
- Tool bug, fixed: the outer `mu-life` template in FeelingsComposer is a complete class. Only its inner `mu-tint-${tint}` fragment is reported.
- Tool bug, fixed: Lightning CSS rejects imports after @theme as browser CSS, although Tailwind accepts them. Graph hashing reads import/reference specifiers independently; selector registration removes imports, which declare no class names.
- Tool bug, fixed: Lightning CSS's JS AST return visitor cannot round-trip optional null fields or infinity values such as rounded-full. Selectors/queries are serialized with absent fields omitted; declaration text is read from validated AST locations so `calc(infinity * 1px)` and quoted punctuation survive unchanged.

CSS recovery produced one note from an unrelated Python virtualenv: apps/launch-video/music/.venv/lib/python3.12/site-packages/matplotlib/backends/web_backend/css/boilerplate.css, `Unexpected token Semicolon`. The file was scanned with recovery, rather than expanding the specified ignore list. Standard Tailwind preprocessing directives are recognized as expected during selector registration, not reported as unknown-CSS warnings.

No MetalUI code or CSS was repaired to improve these numbers. All project-specific exemptions live in the benchmark config; src/ contains none.
