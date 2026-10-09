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

# Layer 2 benchmark

Measured 2026-10-09 against the same MetalUI HEAD `ca465732b94e7ba654a05b69fd5bc7615788d4b6`, Tailwind **4.3.3**, Node **25.9.0**, macOS arm64. MetalUI stayed read-only; its scanned docs/package source has no tracked changes. Source globs remain docs-only. The bench config removes only the obsolete `naive-cap` marker; no broad markers or extra CSS globs hide the narrowed registry's results.

## Reproduce Layer 2

```sh
npm run build
node bench/metalui/measure.mjs layer2
node bench/metalui/reconcile-layer2.mjs
```

The measure script redirects all caches into Plumb, uses a fresh directory for cold then repeats for warm, and accepts the deliberate exit **1**. The reconciliation script reads the real CLI report, uses the same source collector to identify inline attributes, and records every grep match/additional literal site's location, text and lowered properties. Full artifacts: [cold](bench/metalui/layer2.cold.json), [warm](bench/metalui/layer2.warm.json), [timings](bench/metalui/layer2.run.json), [reconciliation evidence](bench/metalui/layer2.reconciliation.json).

## Layer 2 counts and timing

Still 234 TSX, 24 TS/JS, 33 source CSS, 6,726 static class sites, 1,244 unique candidates and 144 opaque class expressions/holes. The stylesheet graph has **47 CSS files** (40 project, seven framework/package), plus **two static JSX stylesheets**. Runtime declarations are retained as **24,211 declaration contexts**, including 6,675 framework/package contexts. Origins describe syntax; sourceOrigin/package retain package provenance. Independent JS/CSS import roots can emit the same authored declaration again; comma selectors also produce distinct contexts. These are not unique source-line counts.

| Declaration origin | Count |
| --- | ---: |
| class | 7,072 |
| arbitrary | 225 |
| stylesheet | 8,375 |
| apply | 54 |
| inline | 1,737 |
| custom-property | 3,389 |
| keyframes | 3,359 |

| Stylesheet reached by | Files/embedded blocks |
| --- | ---: |
| entry | 1 |
| import | 8 |
| reference | 1 |
| side-effect | 39 |
| module (importer outside source globs) | 4 |
| source | 33 |
| jsx-style | 2 |

Reach categories overlap: one file can be an entry, a side-effect import and a source-glob match. Reference reaches register/hash definitions without treating reference-only CSS as emitted paint. Inline coverage: **746 style attributes, 238 containing literal declarations, 1,361 opaque declarations**, including **177 fully opaque objects/spreads/keys**.

| Measurement | Cold | Warm |
| --- | ---: | ---: |
| Process wall, including startup/JSON | 2462.3 ms | 964.0 ms |
| Report total | 2326.3 ms | 849.2 ms |
| discover | 5.9 ms | 6.0 ms |
| parse | 76.5 ms | 72.3 ms |
| collect | 48.9 ms | 46.9 ms |
| load | 128.0 ms | 31.4 ms |
| compile | 129.1 ms | 0.0 ms |
| stylesheets (including module graph) | 1302.4 ms | 140.3 ms |
| inline | 59.3 ms | 60.7 ms |
| Module graph, within stylesheets | 359.8 ms | 46.9 ms |
| External module import-record parsing, within graph | 105.3 ms | 0.0 ms |
| External module cache hits / misses | 0 / 1,303 | 1,303 / 0 |
| Candidate cache hits / misses | 0 / 1,244 | 1,244 / 0 |

**Warm report total 849.2 ms is under 1.2 s; process wall 964.0 ms also meets it.** Class parse + collect is 119.1 ms warm, still below Layer 1's 150 ms target. Inline extraction is a separate phase sharing the existing parses. Stylesheets includes module/CSS graph I/O, dependency hashing and cached declaration/selector loading; compiler/CSS parsing are skipped on stylesheet cache hits. External module warm hits avoid source reads/parses, while fresh Oxc resolution revalidates cached edges against tsconfig/package metadata. Cold/warm refers to Plumb caches, not OS cache eviction. Measurements are individual local runs, not latency guarantees.

## Dead-class delta from Layer 1

Layer 2 now has exactly **39 grouped dead names at 65 sites**, plus the same **two dynamic findings**. Every finding key and site equals the Layer 1 report. `mu-icon-trigger` and `mu-life` are protected by the CSS their component modules import; their former 28 dead sites were false positives caused by stopping discovery at source globs.

| Name | Protected sites | Reached declaration file | Existence proof |
| --- | ---: | --- | --- |
| mu-icon-trigger | 27 | packages/metalui/src/icons/icons.generated.css | Scanned imports reach the icons module and Icon.tsx:5, which imports this CSS. |
| mu-life | 1 | packages/metalui/src/icons/life/icons-life.generated.css | Scanned imports reach the life icons module and LifeIcon.tsx:4, which imports this CSS. |

The graph follows **1,303 modules outside source globs**, **1,560 runtime modules in total**, and reaches **four CSS files through external modules**. The two generated icon stylesheets are framework provenance with package `@unlocalhosted/metalui`; their declarations remain inspectable without becoming project sites. The other two files, `date-cue.css` and `numeric-cue.css`, also have direct scanned-source imports and therefore retain project provenance. All module/CSS reaches retain importer and specifier. No graph limit is reached, no markers were added and the docs-only source globs are unchanged.

External import-record parsing uses Oxc's `.module` getter without deserializing `.program`: **105.3 ms for 1,303 modules cold**, and **zero external parses warm**. Complete module discovery takes **359.8 ms cold / 46.9 ms warm**, including resolution, stat checks and graph cache I/O. Cached records/edges use mtime and size; resolution is revalidated every run against tsconfig paths and import/browser/default package exports. The CLI report and timing artifact record module counts, CSS counts and cache hits/misses. `measure.mjs layer2` asserts exact Layer 1 finding equality, the absence of both icon false positives and warm report total below 1.2 s.

`fixtures/module-css` and the real CLI e2e reproduce a local `ui-kit` index importing `.kit-btn` CSS, with export-from/dynamic imports, cycles and both workspace/node_modules resolution. `kit-btn` survives; `kit-unused`, declared only in an unimported stylesheet, remains dead. Module/CSS edits and independent tsconfig/package-export changes refresh reachability on warm runs. `npm test` passes **49 tests**; `npm run typecheck` passes.

**naive-cap now has real CSS proof** from the static JSX style in pages/components/Button.tsx:351. Its exact marker was removed; it remains non-dead. The JSX keyframes are recorded as keyframes, not element paint. The old root-wide matplotlib/.venv CSS warning disappears because that unrelated file is outside the reachable graph; no new ignore directory was added.

### Hover stylesheet reconciliation

All 22 source-glob docs stylesheets with positive ':hover' declaration conditions are below. Counts are declaration/selector contexts, not unique physical declarations: a comma selector produces separate contexts. No habit judgement runs in Layer 2.

| Docs stylesheet (under apps/docs/src) | Hover declarations | With (hover: hover) | With (pointer: fine) | With both | With neither | Crude grep says ungated |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| kds.css | 37 | 5 | 5 | 5 | 32 | no |
| pages/icon-detail.css | 2 | 0 | 0 | 0 | 2 | yes |
| pages/icon-library.css | 1 | 0 | 0 | 0 | 1 | yes |
| pages/library.css | 11 | 0 | 0 | 0 | 11 | yes |
| ui/edit/edit.css | 4 | 0 | 0 | 0 | 4 | yes |
| ui/icon-cell.css | 3 | 0 | 0 | 0 | 3 | yes |
| ui/xray/checkbox-specimens.css | 2 | 0 | 0 | 0 | 2 | yes |
| ui/xray/chip-specimens.css | 2 | 0 | 0 | 0 | 2 | yes |
| ui/xray/dialog-specimens.css | 1 | 0 | 0 | 0 | 1 | yes |
| ui/xray/folder-specimens.css | 4 | 0 | 0 | 0 | 4 | yes |
| ui/xray/icon-button-specimens.css | 1 | 0 | 0 | 0 | 1 | yes |
| ui/xray/kbd-specimens.css | 2 | 0 | 0 | 0 | 2 | yes |
| ui/xray/lasso-specimens.css | 5 | 0 | 0 | 0 | 5 | yes |
| ui/xray/link-card-specimens.css | 7 | 0 | 0 | 0 | 7 | yes |
| ui/xray/menu-specimens.css | 2 | 0 | 0 | 0 | 2 | yes |
| ui/xray/palette-specimens.css | 2 | 0 | 0 | 0 | 2 | yes |
| ui/xray/snap-guides-specimens.css | 6 | 0 | 0 | 0 | 6 | yes |
| ui/xray/status-specimens.css | 3 | 0 | 0 | 0 | 3 | yes |
| ui/xray/swatch-specimens.css | 3 | 0 | 0 | 0 | 3 | yes |
| ui/xray/switcher-specimens.css | 10 | 0 | 0 | 0 | 10 | yes |
| ui/xray/toast-specimens.css | 4 | 0 | 0 | 0 | 4 | yes |
| ui/xray/tooltip-specimens.css | 4 | 0 | 0 | 0 | 4 | yes |

File-level grep reproduces **21 ungated stylesheets**. Declaration conditions identify **22 stylesheets with ungated hover**. The difference is 'kds.css': it contains gated rules and therefore passes the crude file test, while 32 hover declaration contexts have neither gate. Its 5 other hover contexts have both gates. There are no hover-only or pointer-only cases in this snapshot. All other 21 files agree with the crude claim.

### Inline literal reconciliation

Re-run grep equivalent (one line; numeric spelling or hex marker inside the simple object match):

```sh
rg -n 'style=\{\{[^}]*[0-9#][^}]*\}\}' apps/docs/src -g '*.{tsx,jsx,ts,js}'
```

Current pinned snapshot produces **236 matching lines containing 247 object matches**, rather than the historical **219**. Eleven additional matches share lines with other matched style attributes. The original exact expression/hit list was not saved, so the 17-line historical delta cannot honestly be assigned to individual old lines. A looser 'style={{.*[0-9#].*}}' matches 369 lines here because digits after the object also qualify; grep syntax materially affects the count. Neither figure measures literal values. The AST records **238 sites with at least one literal declaration on 231 physical lines**, out of 746 style attributes; 1361 declarations are opaque, including 177 fully opaque objects/spreads/keys.

| Category | Sites/matches | Layer 2 treatment |
| --- | ---: | --- |
| grep hit: runtime expression/call/index, opaque value | 58 | Known property retained with dynamic-value, or fully opaque object; later rules deferred. |
| grep hit: literal declaration lowered | 183 | Literal declarations retained; provenance/habits deferred. |
| grep hit: opaque object/spread/computed key | 6 | Known property retained with dynamic-value, or fully opaque object; later rules deferred. |
| literal missed by grep: multiline object | 5 | Literal declarations retained; provenance/habits deferred. |
| literal missed by grep: strings without numbers/hex | 22 | Literal declarations retained; provenance/habits deferred. |
| literal missed by grep: nested braces, casts or alternate spacing | 26 | Literal declarations retained; provenance/habits deferred. |
| literal missed by grep: one-hop const | 2 | Literal declarations retained; provenance/habits deferred. |

Every grep hit and every additional literal site is classified below. Locations include the style attribute column, so multiple attributes on one line remain distinct. Full text and lowered properties: [reconciliation JSON](bench/metalui/layer2.reconciliation.json). A Layer 2 pass here means the declaration was read, not that a future provenance rule accepts it.

#### grep hit: runtime expression/call/index, opaque value

- apps/docs/src/blocks/availability-picker/availability-picker.tsx: 371:9
- apps/docs/src/pages/components/ButtonSmartControls.tsx: 79:47, 80:46, 81:50, 81:184, 118:297
- apps/docs/src/pages/foundations/Motion.tsx: 269:77, 270:79
- apps/docs/src/pages/foundations/Radius.tsx: 71:9, 150:96, 151:96
- apps/docs/src/ui/LayerSorter.tsx: 184:13
- apps/docs/src/ui/doc.tsx: 154:108, 269:118
- apps/docs/src/ui/xray/ButtonSpecimens.tsx: 120:90, 316:52, 317:16
- apps/docs/src/ui/xray/CheckboxSpecimens.tsx: 84:84
- apps/docs/src/ui/xray/ChipXray.tsx: 157:38
- apps/docs/src/ui/xray/DialogSpecimens.tsx: 273:117
- apps/docs/src/ui/xray/DialogXray.tsx: 257:53, 258:48
- apps/docs/src/ui/xray/FieldSpecimens.tsx: 125:45, 129:85, 130:90
- apps/docs/src/ui/xray/FolderSpecimens.tsx: 143:13, 236:13, 282:13
- apps/docs/src/ui/xray/IconButtonSpecimens.tsx: 115:42, 116:27, 204:86
- apps/docs/src/ui/xray/KbdSpecimens.tsx: 50:355, 50:1353
- apps/docs/src/ui/xray/LassoSpecimens.tsx: 64:13
- apps/docs/src/ui/xray/LassoXray.tsx: 50:37
- apps/docs/src/ui/xray/LinkCardSpecimens.tsx: 142:52, 143:18, 188:51, 344:46, 345:52
- apps/docs/src/ui/xray/MenuSpecimens.tsx: 218:89
- apps/docs/src/ui/xray/PaletteSpecimens.tsx: 414:99
- apps/docs/src/ui/xray/PaletteXray.tsx: 137:52
- apps/docs/src/ui/xray/SliderSpecimens.tsx: 105:45
- apps/docs/src/ui/xray/SnapGuidesSpecimens.tsx: 115:58
- apps/docs/src/ui/xray/StatusSpecimens.tsx: 147:83, 150:146, 304:17
- apps/docs/src/ui/xray/SwatchSpecimens.tsx: 47:651, 97:355
- apps/docs/src/ui/xray/SwitchSpecimens.tsx: 150:84, 151:77
- apps/docs/src/ui/xray/SwitcherSpecimens.tsx: 112:50, 118:51, 120:66
- apps/docs/src/ui/xray/ToolbarSpecimens.tsx: 303:141, 377:48
- apps/docs/src/ui/xray/TooltipSpecimens.tsx: 278:84

#### grep hit: literal declaration lowered

- apps/docs/src/pages/Home.tsx: 46:17, 52:16, 56:17, 62:16
- apps/docs/src/pages/components/Button.tsx: 254:102, 261:44
- apps/docs/src/pages/components/Checkbox.tsx: 58:90, 77:49
- apps/docs/src/pages/components/CheckboxGroup.tsx: 43:84, 52:46
- apps/docs/src/pages/components/Fan.tsx: 47:80
- apps/docs/src/pages/components/Field.tsx: 19:62, 20:20
- apps/docs/src/pages/components/Folder.tsx: 39:34, 41:49, 43:34, 110:9, 124:14, 154:65
- apps/docs/src/pages/components/IconButton.tsx: 18:53
- apps/docs/src/pages/components/Kbd.tsx: 53:55
- apps/docs/src/pages/components/LineHandles.tsx: 22:7, 27:33
- apps/docs/src/pages/components/NumberField.tsx: 41:74, 54:73
- apps/docs/src/pages/components/PerfectPreview.tsx: 213:7, 224:33
- apps/docs/src/pages/components/Radio.tsx: 46:42, 61:60
- apps/docs/src/pages/components/Region.tsx: 152:9
- apps/docs/src/pages/components/Select.tsx: 16:34, 43:78
- apps/docs/src/pages/components/SelectionFrame.tsx: 81:9
- apps/docs/src/pages/components/Settings.tsx: 13:10
- apps/docs/src/pages/components/Spinner.tsx: 110:38, 111:50, 133:48
- apps/docs/src/pages/components/Swatch.tsx: 17:18, 18:146
- apps/docs/src/pages/components/Switch.tsx: 16:51
- apps/docs/src/pages/components/Toggle.tsx: 36:75, 70:59
- apps/docs/src/pages/foundations/Materials.tsx: 15:41
- apps/docs/src/ui/AssistLab.tsx: 344:46
- apps/docs/src/ui/ConnectorLab.tsx: 53:46
- apps/docs/src/ui/FarCanvas.tsx: 32:66, 55:12, 85:42, 86:42
- apps/docs/src/ui/FolderUnfold.tsx: 87:34, 89:49, 91:34, 247:56, 251:53, 254:75, 258:16, 264:26, 272:16, 273:65, 275:16, 276:16, 277:41, 283:28, 291:14, 294:20, 295:69, 298:18, 300:44, 310:31
- apps/docs/src/ui/InstrumentSpecimen.tsx: 23:90, 24:39, 26:82, 26:178, 27:72
- apps/docs/src/ui/LayerSorter.tsx: 45:64, 50:63, 71:52, 76:31, 82:31, 88:31
- apps/docs/src/ui/LetterPad.tsx: 79:9, 88:31
- apps/docs/src/ui/ObjectSpecimen.tsx: 20:72, 22:117, 22:193, 22:276, 23:31, 25:59, 25:124, 25:216, 29:31
- apps/docs/src/ui/PartSpecimen.tsx: 24:65, 25:81
- apps/docs/src/ui/SurfaceFieldDemo.tsx: 162:11
- apps/docs/src/ui/Wordmark.tsx: 72:46
- apps/docs/src/ui/doc.tsx: 44:25, 104:13, 115:43, 132:10, 133:57, 134:46, 134:92, 150:51, 267:75, 276:95
- apps/docs/src/ui/floating.tsx: 41:10, 72:33, 125:14
- apps/docs/src/ui/xray/ButtonSpecimens.tsx: 118:101, 119:90
- apps/docs/src/ui/xray/ButtonXray.tsx: 231:86
- apps/docs/src/ui/xray/CheckboxSpecimens.tsx: 83:95
- apps/docs/src/ui/xray/CheckboxXray.tsx: 212:48, 222:110
- apps/docs/src/ui/xray/ChipSpecimens.tsx: 267:86, 268:100
- apps/docs/src/ui/xray/ChipXray.tsx: 158:46, 166:108, 196:110
- apps/docs/src/ui/xray/DialogXray.tsx: 250:110
- apps/docs/src/ui/xray/FieldXray.tsx: 144:57, 222:45, 274:85
- apps/docs/src/ui/xray/FolderSpecimens.tsx: 91:57, 93:42
- apps/docs/src/ui/xray/FolderXray.tsx: 211:110
- apps/docs/src/ui/xray/IconButtonSpecimens.tsx: 203:86
- apps/docs/src/ui/xray/IconButtonXray.tsx: 108:60, 113:60, 159:21
- apps/docs/src/ui/xray/KbdSpecimens.tsx: 50:834, 50:1096
- apps/docs/src/ui/xray/KbdXray.tsx: 241:82
- apps/docs/src/ui/xray/LassoXray.tsx: 54:35, 75:56
- apps/docs/src/ui/xray/LinkCardXray.tsx: 169:110, 184:61, 185:61, 186:61
- apps/docs/src/ui/xray/MenuXray.tsx: 196:35, 200:32, 202:46, 229:110
- apps/docs/src/ui/xray/PaletteXray.tsx: 129:105, 143:85, 147:58
- apps/docs/src/ui/xray/SliderSpecimens.tsx: 107:54
- apps/docs/src/ui/xray/SliderXray.tsx: 220:45, 242:68, 259:82
- apps/docs/src/ui/xray/SnapGuidesSpecimens.tsx: 233:123, 268:130
- apps/docs/src/ui/xray/SnapGuidesXray.tsx: 60:58, 64:59, 68:45, 86:56
- apps/docs/src/ui/xray/StatusSpecimens.tsx: 180:34, 301:93, 302:91
- apps/docs/src/ui/xray/StatusXray.tsx: 203:34, 211:42, 237:110
- apps/docs/src/ui/xray/SwatchSpecimens.tsx: 47:412
- apps/docs/src/ui/xray/SwatchXray.tsx: 181:110, 190:67
- apps/docs/src/ui/xray/SwitchSpecimens.tsx: 153:78, 154:76
- apps/docs/src/ui/xray/SwitchXray.tsx: 87:132, 101:17
- apps/docs/src/ui/xray/SwitcherXray.tsx: 252:82
- apps/docs/src/ui/xray/ToastSpecimens.tsx: 154:45, 260:88, 261:100
- apps/docs/src/ui/xray/ToastXray.tsx: 238:110, 277:82
- apps/docs/src/ui/xray/ToolbarXray.tsx: 128:45, 140:58, 195:82
- apps/docs/src/ui/xray/TooltipXray.tsx: 214:18
- apps/docs/src/ui/xray/WordmarkXray.tsx: 56:95, 111:62, 119:68
- apps/docs/src/ui/xray/kit.tsx: 274:40

#### grep hit: opaque object/spread/computed key

- apps/docs/src/ui/xray/SliderXray.tsx: 232:73
- apps/docs/src/ui/xray/SwitcherSpecimens.tsx: 105:229
- apps/docs/src/ui/xray/ToastXray.tsx: 257:75, 268:105
- apps/docs/src/ui/xray/ToolbarXray.tsx: 152:76, 173:73

#### literal missed by grep: multiline object

- apps/docs/src/pages/components/Folder.tsx: 141:15
- apps/docs/src/pages/components/SelectionFrame.tsx: 86:11
- apps/docs/src/pages/foundations/Radius.tsx: 123:15
- apps/docs/src/pages/foundations/Sizing.tsx: 54:21
- apps/docs/src/ui/Wordmark.tsx: 55:7

#### literal missed by grep: strings without numbers/hex

- apps/docs/src/pages/components/LineHandles.tsx: 29:96
- apps/docs/src/pages/components/Spinner.tsx: 130:175
- apps/docs/src/pages/foundations/Spacing.tsx: 99:103
- apps/docs/src/ui/AssistLab.tsx: 345:37
- apps/docs/src/ui/ConnectorLab.tsx: 55:87
- apps/docs/src/ui/FolderUnfold.tsx: 259:127, 266:81
- apps/docs/src/ui/InkCanvas.tsx: 79:37
- apps/docs/src/ui/SnapCanvas.tsx: 98:7
- apps/docs/src/ui/floating.tsx: 207:30, 309:59
- apps/docs/src/ui/xray/IconButtonXray.tsx: 103:17, 115:39
- apps/docs/src/ui/xray/KbdXray.tsx: 201:110
- apps/docs/src/ui/xray/LinkCardSpecimens.tsx: 77:54, 378:28
- apps/docs/src/ui/xray/PaletteSpecimens.tsx: 171:31
- apps/docs/src/ui/xray/StatusSpecimens.tsx: 52:57
- apps/docs/src/ui/xray/ToolbarSpecimens.tsx: 244:37, 376:37
- apps/docs/src/ui/xray/TooltipXray.tsx: 234:27, 243:45

#### literal missed by grep: nested braces, casts or alternate spacing

- apps/docs/src/pages/components/Spinner.tsx: 62:5
- apps/docs/src/pages/components/Textarea.tsx: 65:10
- apps/docs/src/pages/components/ToolStrip.tsx: 49:66
- apps/docs/src/pages/components/Weather.tsx: 136:5
- apps/docs/src/pages/foundations/Elevation.tsx: 109:13
- apps/docs/src/ui/FolderUnfold.tsx: 270:48, 292:50, 293:18
- apps/docs/src/ui/Wordmark.tsx: 42:11
- apps/docs/src/ui/xray/ButtonXray.tsx: 239:91
- apps/docs/src/ui/xray/CheckboxXray.tsx: 247:82
- apps/docs/src/ui/xray/ChipXray.tsx: 168:74
- apps/docs/src/ui/xray/FieldXray.tsx: 259:82
- apps/docs/src/ui/xray/FolderSpecimens.tsx: 188:13
- apps/docs/src/ui/xray/IconButtonXray.tsx: 101:60, 119:74
- apps/docs/src/ui/xray/KbdXray.tsx: 227:82
- apps/docs/src/ui/xray/LassoXray.tsx: 55:52
- apps/docs/src/ui/xray/MenuXray.tsx: 198:17
- apps/docs/src/ui/xray/SliderSpecimens.tsx: 45:43
- apps/docs/src/ui/xray/SliderXray.tsx: 244:55
- apps/docs/src/ui/xray/StatusXray.tsx: 213:74
- apps/docs/src/ui/xray/SwatchXray.tsx: 189:67, 207:82
- apps/docs/src/ui/xray/SwitcherXray.tsx: 229:82
- apps/docs/src/ui/xray/ToolbarXray.tsx: 183:82

#### literal missed by grep: one-hop const

- apps/docs/src/pages/foundations/Elevation.tsx: 86:71
- apps/docs/src/ui/xray/PaletteSpecimens.tsx: 162:76

# Layer 3: decisions and spacing

Measured 2026-10-09 against current MetalUI HEAD **`9cb04dc818ac84d981f8215352237d5c5ab2f85b`**, Tailwind **4.3.3**. The scanned docs source, theme and tokens are unchanged relative to the earlier pinned `ca465732…` commit (`git diff ca465732… HEAD -- apps/docs/src packages/metalui/src/components/theme.css tokens/tokens.json` is empty). Existing dirty captures/AGENTS/.claude files were preserved. MetalUI remains read-only; all caches and artifacts are under Plumb.

```sh
npm run build
node bench/metalui/measure.mjs layer3
node bench/metalui/reconcile-layer3.mjs
node dist/cli.js decisions --root /Users/vijaysingh/unlocalhosted/metalui \
  --config "$PWD/bench/metalui/plumb.config.ts" --family spacing --json
```

Reports: [cold](bench/metalui/layer3.cold.json), [warm](bench/metalui/layer3.warm.json), [timings](bench/metalui/layer3.run.json). Every current textual grep hit, its lowered declarations/finding keys or explicit pass reason, and every additional failing declaration: [reconciliation JSON](bench/metalui/layer3.reconciliation.json). All non-emitted source-text passes are also [listed by location](bench/metalui/layer3.reconciliation.md). Reconciliation asserts that every emitted off-ladder length hit has a finding, emitted percentage positioning passes, and every emitted ladder hit passes; an uncollected hit must be one of the reviewed grid-placement matches or the one documentation string. It also asserts that judged declaration counts match spacing coverage and all failing contexts reconcile with numeric plus additional contexts.

## Decision boundary and whys

The benchmark preset reads **`foundations.space`** and **`foundations.layout.gap`** from MetalUI's actual `tokens/tokens.json`, exposing exactly **17 spacing records**: the 14-step `0,2,4,6,8,12,16,20,24,32,40,48,64,80` ladder as `--spacing-mu-space-N`, and `--spacing-mu-related/group/section`. Each record includes both theme and underlying root-var references. Origin is project; primitive/semantic tiers are explicit; identity is value and callers may use both tiers.

MetalUI's source contains **no per-step `$use` sentences** on `foundations.space`: it is an array of numbers. The preset leaves those whys empty. Semantic gap records inherit the actual `foundations.layout.$use`:

> Rules for arranging content, never control geometry or materials. Gap roles reference entries in foundations.space. Related content uses 12, distinct groups 24, sections 48. Auto-grid tracks aim for 240 points, clamped to their container when narrower. Layout has no motion and preserves DOM order.

Recommendations prefer an equivalent named gap carrying this reason where one exists. A 10px finding therefore names 8px `--spacing-mu-space-8` and 12px `--spacing-mu-related`, including the source sentence for related. For steps with no recorded reason the report retains an empty why; Plumb does not invent one.

**Recipe spacing keys are not global layout decisions.** `--spacing-field-*`, toast, folder and other component geometry do not enlarge the shared ladder. CSS_SYSTEM explicitly distinguishes control recipes from layout relationships. A ref to a recipe key resolves to its amount and passes only if that amount is already a shared step; `gap-toast-undo-gap` resolves to **7px** and fails, while a recipe resolving to **8px** passes by value. Component ownership/approved recipe decisions belong to later layers; this layer cannot automatically excuse them. Including every recipe's pad/height/radius in a global spacing family would silently approve values such as 7px/11px everywhere and make the layout ladder meaningless.

## Counts and timing

Spacing coverage: **1,608 accepted of 2,183 judged declarations**, **575 failing/warning declarations**. These form **124 grouped spacing findings** at **568 physical sites**: 111 `provenance/spacing`, 12 `provenance/arbitrary`, one `provenance/opaque-inline`. Selector contexts can repeat a physical declaration, hence coverage and site counts differ. Keyframes, custom-property definitions and package-origin paint are excluded. Shorthands count once while every value component is checked; neutral authored values count as accepted coverage.

Class uses count only when Tailwind parses a compiling candidate with an authored value: a theme key, numeric/fractional segment or arbitrary value. Static utilities and functional candidates with no value are excluded; parsing alone can also yield invalid alternate interpretations, so Plumb checks `compileAstNodes` before recording `authoredValue`. The cached signal survives warm runs. This excludes **335 static class spacing declarations**, including `sr-only`, `mu-stack`, and `folder-card`. Project `@utility` definitions are materialized with source maps and judged at their stylesheet definitions, including unused utilities, when those sites are inside the configured source globs. The shared declaration-gathering boundary now excludes all sites outside those globs before provenance or later judging rules run. Imported stylesheets and modules outside source remain existence proof and decision-resolution inputs. This removes **206 out-of-scope spacing contexts** (143 accepted, 63 failing) from the previous run: `2,389 - 206 = 2,183`; `638 - 63 = 575`. In particular, `packages/metalui/src/components/theme.css` remains in the import graph but has no provenance findings.

Inline reporting retains **1,361 opaque declarations**, including **177 fully opaque objects/spreads/computed properties** (`coverage.inline.fullyOpaque` and `spreads`); these 177 contribute no spacing coverage or findings. Only the **170 known spacing properties with dynamic values** warn under `provenance/opaque-inline`.

| Measurement | Cold | Warm |
| --- | ---: | ---: |
| Process wall, startup and JSON included | 3247.3 ms | 1069.2 ms |
| Report total | 3142.2 ms | 966.9 ms |
| discover | 6.9 ms | 6.0 ms |
| parse | 82.6 ms | 72.0 ms |
| collect | 56.3 ms | 53.9 ms |
| load | 138.8 ms | 32.8 ms |
| compile | 104.2 ms | 0.0 ms |
| stylesheets, including module graph | 2008.2 ms | 150.2 ms |
| inline | 59.7 ms | 56.6 ms |
| decisions | 61.6 ms | 58.8 ms |
| provenance | 25.2 ms | 24.0 ms |
| Candidate cache hits / misses | 0 / 1,302 | 1,302 / 0 |
| Module graph | 413.1 ms | 51.0 ms |
| External module cache hits / misses | 0 / 1,303 | 1,303 / 0 |

**Warm report 966.9 ms and process wall 1069.2 ms both meet 1.2 s.** Parse + collect is 125.9 ms warm. Cold and warm findings, decisions, declarations and coverage are asserted equal. Initial decision metadata recovery repeatedly counted lines from the beginning of each stylesheet, taking 274 ms; indexed source locations reduce this to 60 ms. Warm effective theme values reuse the compiler graph cache without loading the compiler. Config/token/source judgement is recomputed. Cold means a fresh Plumb cache, not OS cache eviction; timings are individual measured processes.

## Numeric grep: historical 585/84 versus reproducible current evidence

The old **585 on-ladder / 84 off-ladder in 39 files** expression and location list were not preserved in the design/research files. DESIGN 9 explicitly calls those greps heuristic rather than hand-verified. Re-running current source cannot honestly establish which historical individual hit disappeared or whether its regex excluded side properties/variants. No source delta explains it relative to Layer 2, since the scanned files are unchanged. We therefore retain the old claim as historical, and provide a larger fully reconciled current set rather than manufacture an exact 669-hit list.

Reproducible TSX text pattern for padding/margin/gap/inset (both definitions and usages; physical, logical and axis suffixes):

```regex
\b(?:p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|inset(?:-[xy])?)-(\d+)(?![\w.-])
```

This yields **751 hits: 652 ladder, 99 off-ladder in 40 files**. **All 99 off-ladder hits are Plumb findings.** Of 652 ladder hits, **651 are emitted passes**, and the `gap-12` at `pages/components/Skeleton.tsx:76` is a usage-documentation string, so it is a recorded source-text pass. Every hit has a row in reconciliation JSON. A narrower axis-only pattern excluding per-side padding/margin gives 593/86, illustrating why exact regex matters.

Extending the pattern with `top|right|bottom|left|start|end` covers every amount in the owner's historical off-ladder value list. It produces **816 hits: 689 ladder, 127 nominally off-ladder**, with **109 findings, 678 emitted passes and 29 source-text passes**. Of the 29, **28 are substring matches inside grid `row-start`/`col-start` utilities**, which do not set spacing, and one is the Skeleton documentation string. The remaining nominal off-ladder pass is `top-1/2` at `pages/foundations/Sound.tsx:66`: it resolves to 50%, which is explicitly allowed, while the grep matches its numerator `1`.

All historical values are represented below; four additional current values are marked. Counts are textual matches in the broader pattern, not grouped findings or longhands.

| Value | Hits | Finding hits | Reasoned passes |
| --- | ---: | ---: | ---: |
| 1 | 18 | 3 | 15 (14 grid placement, one 50% positioning) |
| 3 | 4 | 1 | 3 (grid placement) |
| 5 | 2 | 2 | 0 |
| 7 | 2 | 2 | 0 |
| 9 (additional) | 1 | 1 | 0 |
| 10 | 40 | 40 | 0 |
| 13 | 6 | 6 | 0 |
| 14 | 27 | 27 | 0 |
| 15 | 7 | 7 | 0 |
| 17 | 1 | 1 | 0 |
| 18 (additional) | 2 | 2 | 0 |
| 21 (additional) | 1 | 1 | 0 |
| 22 (additional) | 1 | 1 | 0 |
| 25 | 2 | 2 | 0 |
| 27 | 1 | 1 | 0 |
| 28 | 5 | 5 | 0 |
| 35 | 1 | 1 | 0 |
| 44 | 1 | 1 | 0 |
| 56 | 2 | 2 | 0 |
| 60 | 1 | 1 | 0 |
| 72 | 2 | 2 | 0 |

The spacing reader gaps found during reconciliation were fixed, not treated as passes: JSX nested in props/object slots, arrays joined with a literal space, and standalone bounded template/one-hop const branches. These changes increase candidates from 1,244 to **1,302** and static class sites to **7,258**; opaque class expressions fall from 144 to **126**. Source-only snippet text is still not treated as an emitted class.

## Additional spacing findings missed by numeric grep

Counts below are additional failing declaration contexts, physical sites and distinct grouped keys touching each category. Group keys overlap across categories: one 10px fix can have a CSS site and inline/class sites. Every additional context is listed with rule, key, property, value and source in reconciliation JSON.

| Category | Declarations | Sites | Grouped keys | Examples / judgement |
| --- | ---: | ---: | ---: | --- |
| Stylesheet | 237 | 230 | 99 | `kds.css:73` scroll-padding-top 88px; `kds.css:104` top -60px and padding `8px 15px`: scalar/shorthand off-ladder spacing. |
| Static inline | 31 | 31 | 12 | `pages/Home.tsx:46` margin `6px 0 10px`; `pages/components/Folder.tsx:124` top 110; `ui/xray/SliderSpecimens.tsx:107` bottom -3: values not in the shared ladder. |
| Opaque inline | 170 | 170 | 1 | Known dynamic spacing only, e.g. `blocks/studio-week/studio-week.tsx:267` computed left. Fully opaque objects/spreads remain inline report counts, without spacing findings or coverage. |
| Arbitrary class | 12 | 12 | 12 | `blocks/settings/settings.tsx:341` `pb-[5.5rem]` = 88px; `pages/components/CueFamily.tsx:67` `top-[2.5px]`: `provenance/arbitrary` with the same spacing judgement. |
| Other named class | 8 | 8 | 5 | Value-bearing theme candidates: `gap-toast-undo-gap` 7px and `pl-toast-undo-pad-left` 11px. Static `sr-only` is excluded; static recipe definitions outside source globs are existence proof only. |
| Numeric const/branch usage beyond text hit | 8 | 8 | 2 | Referencing a complete numeric class through a const creates a usage site as well as its definition; e.g. `blocks/task-inbox/task-inbox.tsx:587` gap-x-10 and `pages/components/Slider.tsx:60` px-28. |
| @apply | 0 | 0 | 0 | The benchmark has 54 source-site apply declarations, all nonspacing, including apply declarations exposed while materializing project utilities. Apply spacing is proved in the fixture e2e. |

Total additional declaration contexts: **466**; the broader numeric grep accounts for the other **109**, matching **575** failing/warning spacing declarations. Stylesheet review divides into **158 scalar**, **68 shorthand/composite**, and **11 unresolved expression** contexts. Static `10px` amounts from all syntaxes share a fix; mixed shorthands retain their authored tuple. Unresolved CSS/recipe geometry is explicit debt to review, not a guessed length. `sr-only` has no authored value segment, so its compiler-defined -1px margin is excluded by the candidate boundary, without a spacing-ladder exception. Static utility geometry remains reviewable at its definition only when that stylesheet is inside source globs; the imported `folder-card` definition in the package theme is outside benchmark judgement.

Collection fixes additionally expose **`ed-dlg-pull`** at `ui/xray/DialogSpecimens.tsx:153` (dead class) and **`on-${surface}`** at `ui/doc.tsx:109` (un-generatable dynamic fragment). Final existence is **40 dead names / 66 sites**, plus three dynamic-class groups. The previous 39 dead names/65 sites remain, and both icon CSS false positives remain absent. These are collector completeness changes, not new provenance families.

Final checks: **58 CLI integration/e2e tests passed**, zero failures/skips; `npm run typecheck` and `git diff --check` passed. No unit tests, installations or commits. Color/radius provenance, dead variables, ownership, habits and ledger remain later layers.

# Layer 4 benchmark: all judged families and dead variables

Measured read-only against the same MetalUI commit `9cb04dc818ac84d981f8215352237d5c5ab2f85b`, Tailwind 4.3.3, apps/docs source globs and source tree as Layer 3. No MetalUI source, CSS, tokens or cache was written. Plumb caches/reports stay here. Reproduce with `PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/layer4 node bench/metalui/measure.mjs layer4` (fresh directory for cold), then `node bench/metalui/reconcile-layer4.mjs` and `node bench/metalui/decision-manifest.mjs`. Reports: [cold](bench/metalui/layer4.cold.json), [warm](bench/metalui/layer4.warm.json), [timing](bench/metalui/layer4.run.json). Both CLI runs exit 1 because real debt remains. Cold/warm findings, declarations, decisions and coverage are asserted equal.

## Decision choices and exclusions

The mapping is in [plumb.config.ts](bench/metalui/plumb.config.ts) and [families.ts](bench/metalui/families.ts), outside core. It reads MetalUI's project-generated theme/token CSS, the docs' own font aliases, and tokens.json reasons. [CSS_SYSTEM.md](../metalui/docs/CSS_SYSTEM.md) says type roles stay whole and recipe geometry belongs to controls; [CSS_HABITS.md](../metalui/docs/CSS_HABITS.md) says durations/curves come from shared springs or authored recipe timing; [STATUS-COLORS.md](../metalui/docs/STATUS-COLORS.md) explains status inks, words and controlled ground. These guide the following choices.

Every selected record and every excluded key in those project CSS inputs has an explicit classification in [layer4.decisions.json](bench/metalui/layer4.decisions.json): 1,097 chosen records (including spacing and record-only families), 2,018 excluded variable names. The manifest carries values, source locations, whys and missing-reason status. The rules below explain each classification; source reasons are retained rather than invented for keys without one.

- **Color:** adopt project paint theme aliases and scalar/gradient paint outputs, including colorway ink/surfaces, syntax ink, signal/status ink, material and recipe colors. These are approved token outputs, not a new palette inferred from docs literals. Full gradients are paint decisions; compound shadows belong to elevation. Dynamic colorway values remain unresolved for nearest comparison but valid by reference. No docs illustration literal is promoted to a token.
- **Radius:** adopt foundations.radius, corresponding project theme keys/aliases and exposed recipe radius keys. These are actual approved radii, not all dimensional props containing a convenient number. Use value identity and both tiers for the flat vocabulary. Relative units/elliptical forms must still match an actual decision.
- **Type:** adopt complete foundations/editorial type-role outputs, their tracking and project font-family/weight theme keys. Do not synthesize independent size, weight or leading decisions from each role's JSON ingredients: CSS_SYSTEM says they are one role, not freely recombinable knobs. Exclude font-stretch and other unjudged type properties. Static project role uses are judged at their definitions; those package definitions remain outside this benchmark's source globs. Legacy kds font shorthands are judged here.
- **Motion:** adopt project ease aliases and generated durations/curves from springs, gestures, waiting and recipe timing. Exclude stiffness, damping, zeta, travel, animation names/keyframe contents, and geometry because those are not CSS times/easings. Named whole animation tokens may carry their timing; literal keyword easings remain literals. Zero reduced-motion duration/delay is a neutral, not an added token.
- **Elevation:** adopt project shadow aliases and whole authored offset/blur/spread/color stacks from token outputs, including material/colorway/recipe shadows. Exclude isolated offset, blur, spread, tint knobs and gradients: none defines a whole box-shadow choice. Nondecision legacy aliases now follow authored definitions: local literals are checked once there, outside-source literals are excluded, and references reaching approved elevation decisions pass.
- **Z:** adopt named integer recipe stacking planes ending in z/z-index and any project z theme keys. No general-purpose numeric z scale is inferred. Auto/0/1/-1 pass; coincident higher integers warn by value and other integers error.
- **Spacing policy stays Layer 3:** only the shared ladder and three relationship gaps. Nondecision recipe literals outside the docs source globs are now excluded at their consumers. Recipe spacing, control heights and arbitrary geometry remain excluded from that ladder. **Size/opacity are record-only**; layout dimensions, fractions and opacity brackets are reasoned passes for this layer.

The benchmark explicitly allows both primitive and semantic callers in each adopted family. MetalUI's output uses one intent-named vocabulary plus recipe/foundation primitives; its docs do not impose a universal two-tier caller contract. This is an explicit project policy, not a weakening of the core default. The fixture proves the core default flips to semantic in every family and that literals cannot bypass it. Framework defaults stay excluded. Some selected tokens have no recorded why: color 98/656, radius 15/98, type 51/90, motion 10/123, elevation 55/100, z 0/11. These gaps are reported honestly; a source-wide description is used only where it actually describes the colorway/material family.

## Family coverage

Counts are judged declaration contexts, including opaque warnings; grouped findings/sites are separate. Neutral values count as accepted. A box-shadow can contribute to color and elevation. A literal font shorthand contributes separate type property judgements.

| Family | Accepted | Judged | Failing/warning contexts | Grouped findings | Physical sites in family |
| --- | ---: | ---: | ---: | ---: | ---: |
| spacing | 1601 | 2168 | 567 | 124 | 560 |
| color | 1046 | 1268 | 222 | 110 | 211 |
| radius | 358 | 447 | 89 | 6 | 89 |
| type | 171 | 567 | 396 | 69 | 214 |
| motion | 230 | 401 | 171 | 48 | 132 |
| elevation | 34 | 220 | 186 | 99 | 153 |
| z | 26 | 87 | 61 | 17 | 61 |

Spacing now has **1,601 / 2,168 accepted**, with **567** failing/warning contexts and **124 groups / 560 sites**. The numeric grep still accounts for 109 failing contexts; the other 458 remain outside that grep. Eight prior recipe-use failures belonged to definitions outside source; direct numeric ladder checks are unchanged. Layer 3 numbers above are historical. Existence remains **40 dead class names / 66 class sites**, plus the existing dynamic classes. Dead variables now add **2 names / 3 name-site pairs**, described below. Fully opaque inline entries remain **177**, without fabricated family coverage; all **1,361** opaque inline declarations remain visible.

## Top findings and verdicts

[Reconciliation JSON](bench/metalui/layer4.reconciliation.json) lists every grouped new-family finding, all sites, value, rule and verdict, including findings beyond the greps. These remain debt/warnings, not automatically excused artwork. Below are the three largest groups in each new family. A site may contribute multiple font-property findings or both shadow families.

| Family | Rule / amount | Sites | Example | Verdict |
| --- | --- | ---: | --- | --- |
| color | provenance/opaque-inline: dynamic-value | 76 | apps/docs/src/pages/components/ButtonSmartControls.tsx:110 | Known runtime property; warn, value unknown. |
| color | provenance/color/by-value: #fff | 7 | apps/docs/src/kds.css:143 | Equal authored literal; reference identity warning. |
| color | provenance/color: ring-1 | 5 | apps/docs/src/pages/components/IconButton.tsx:21 | Unapproved authored value or unresolved expression; debt. |
| radius | provenance/opaque-inline: dynamic-value | 74 | apps/docs/src/pages/components/ButtonSmartControls.tsx:80 | Known runtime property; warn, value unknown. |
| radius | provenance/radius: calc(infinity * 1px) | 9 | apps/docs/src/pages/Icons.tsx:224 | Unapproved authored value or unresolved expression; debt. |
| radius | provenance/radius/framework: var(--radius-xl) | 2 | apps/docs/src/pages/components/Status.tsx:50 | Unadopted framework default; error. |
| type | provenance/type: 500 | 63 | apps/docs/src/kds.css:104 | Unapproved authored value or unresolved expression; debt. |
| type | provenance/type: 400 | 41 | apps/docs/src/kds.css:76 | Unapproved authored value or unresolved expression; debt. |
| type | provenance/type: 12.5px | 27 | apps/docs/src/kds.css:104 | Unapproved authored value or unresolved expression; debt. |
| motion | provenance/opaque-inline: dynamic-value | 41 | apps/docs/src/pages/components/Folder.tsx:146 | Known runtime property; warn, value unknown. |
| motion | provenance/motion/framework: var(--tw-duration, var(--default-transition-duration)) | 24 | apps/docs/src/blocks/ai-composer/ai-composer.tsx:342 | Unadopted framework default; error. |
| motion | provenance/motion/framework: var(--tw-ease, var(--default-transition-timing-function)) | 19 | apps/docs/src/blocks/ai-composer/ai-composer.tsx:342 | Unadopted framework default; error. |
| elevation | provenance/opaque-inline: dynamic-value | 15 | apps/docs/src/pages/components/ButtonSmartControls.tsx:110 | Known runtime property; warn, value unknown. |
| elevation | provenance/elevation: 0 0 0 .9px var(--mu-presence-guide) | 7 | apps/docs/src/ui/edit/edit.css:95 | Unapproved authored value or unresolved expression; debt. |
| elevation | provenance/elevation: 0 0 0 .5px transparent | 6 | apps/docs/src/ui/edit/edit.css:93 | Unapproved authored value or unresolved expression; debt. |
| z | provenance/z/by-value: 2 | 26 | apps/docs/src/kds.css:171 | Equal authored literal; reference identity warning. |
| z | provenance/z: 3 | 8 | apps/docs/src/kds.css:763 | Unapproved authored value or unresolved expression; debt. |
| z | provenance/z: 10 | 4 | apps/docs/src/blocks/settings/settings.tsx:451 | Unapproved authored value or unresolved expression; debt. |

Radius `rounded-full` becomes `calc(infinity * 1px)`, not the finite 999px pill decision, so the nine contexts remain unresolved/off-decision debt. The two `rounded-xl` contexts name Tailwind's framework radius. Type's 500/400 weights and scalar sizes remain findings because adopting complete type roles does not approve arbitrary recombinations of their constituent values. Legacy `--sans` / `--mono` aliases reach approved font decisions at their definitions, so their consumers no longer create repeated by-value warnings. The docs' `--well` / `--btn-sh` definitions reference `--mu-*` package tokens; those color literals are outside source globs and no longer create use-site findings. Direct decision origin/tier checks remain at consumers. Literal/dynamic paint in x-ray renderers remains reported when it reaches a known CSS property.

## Every grep hit reconciled

[Hit-by-hit Markdown](bench/metalui/layer4.reconciliation.md) has one row per hit with finding keys or a reasoned/manual pass; [JSON](bench/metalui/layer4.reconciliation.json) retains its complete source-line context. No unreviewed category remains.

**Colors: historical 75 versus current reproducible superset.** The original 75-hit regex/location list was not preserved in DESIGN/research, so we cannot honestly label exactly 75 current locations as that historical list. The explicit conservative TSX pattern `#[\da-fA-F]{3,8}\b|rgba?\([^)]*\)` yields **206 textual hits on 107 lines**, including non-color hashtags and partial runtime function strings. Every one is recorded. This broader audit covers the claimed category without inventing a historical hit list.

| Color category | Hits | Verdict |
| --- | ---: | --- |
| finding | 38 | Linked exact-site color provenance finding. |
| thumbnail artwork | 47 | Manual pass: document cover/thumbnail content in Layers/Folder/FolderUnfold/FolderXray. |
| SVG media artwork | 22 | Manual pass: encoded portrait/cover/link/status sample imagery, not status-state UI ink. |
| authored color content | 29 | Manual pass: editable color/swatches, cue content and textual samples. |
| unjudged property | 3 | Three filter/drop-shadow color components; filter is outside the specified color/elevation properties. |
| runtime paint warning | 6 | Linked warning at dot(c), where folder content colors reach CSS. |
| grep false positive | 1 | #cafe is a Unicode hashtag fixture. |
| interactive specimen data | 11 | Manual pass: documented optical/motion/content experiments; runtime strings/whole opaque objects are reader limits, not certified token paint. |
| SVG sticker artwork | 5 | Manual pass: smiling-star sticker face/outline in LayerSorter. |
| wordmark artwork | 16 | Manual pass: documented chrome/enamel logo illustration; spread/parameter-driven paint stays opaque. |
| x-ray cut-wall artwork | 28 | Manual pass: exploded physical-model cut-wall/rim art and arithmetic; known renderer paint warnings remain in report. |

SVG artwork is legitimate media in these categories; it is not silently excluded from the audit. Presentation attributes and values passed through renderer props/data are not lowered as CSS declarations by the current React reader. Whole conditional/spread objects are retained as opaque counts. These are explicit manual passes/limits: Plumb has no art exemption and would judge those values if authored in a known CSS property. This distinction also prevents treating a Swatch's editable hex or a ColourCue's text as a design-token violation.

**Arbitrary: exactly 218 hits**, using the requested `[a-z-]+-\[[^]]+\]` TSX pattern. **30** link findings, **25** are accepted judged values, **161** are unjudged properties (size, transforms, grid, border width, etc.), **1** is the height in Slider's NAME_TOP composition (size outside Layer 4; no emitted declaration at that const definition), and **1** is Usage's `--[a-z]` RegExp fragment, not a class. Successful values are not failed merely for brackets: decision equality, named refs and neutrals still apply. No arbitrary hit is missing a verdict.

**Duration: exactly 13 non-kds docs CSS lines** have times in transition/animation lines without `var(--mu`, reconciling the owner's count. **8** link motion findings; **5** pass: one zero reduced-motion override and four shared-spring alias/fallback uses in palette/toast/tooltip specimens. The reference `kds.css` adds **38** such lines: **37** findings and **1** shared-spring pass, for a broader **51-line audit (45 findings / 6 passes)**. The calculated stagger delay at kds:733 remains a motion finding; it is not hidden by the shorthand reader. Grep can see a fallback duration even when a registered shared spring supplies the active time; those passes say so per line.

## Dead variables

- **`--c`**: error at kds.css:508 and :509. Confirmed stale rx-tint hook: no theme, CSS, registration, inline/map assignment or setter defines it anywhere scanned. The second location is the nested fallback of `--c-g`.
- **`--c-g`**: warn at kds.css:509 because a fallback exists. Confirmed undefined optional graphite tint hook; fallback `--c` is itself dead and errors. Grouping gives two names and three name-site pairs.

The initial run falsely marked four `--ed-status-*-bg/shadow` keys dead. Read-only source review found them in StatusXray's lampVars map returned through a memoized look and spread into style. Registry collection was fixed generically for custom-property maps/indexed assignments; all four now prove existence. This change is covered by the CLI fixture and contains no StatusXray/MetalUI names in core.

## Cold/warm timing

| Measurement | Cold | Warm |
| --- | ---: | ---: |
| Process wall, startup + JSON included | 3827.6 ms | 1469.4 ms |
| Report total | 3643.6 ms | 1319.6 ms |
| discover | 7.6 ms | 6.0 ms |
| parse | 96.7 ms | 78.3 ms |
| collect | 72.1 ms | 56.8 ms |
| load | 110.1 ms | 33.1 ms |
| compile | 133.4 ms | 0.0 ms |
| stylesheets | 2114.7 ms | 152.0 ms |
| inline | 82.3 ms | 74.5 ms |
| decisions | 117.6 ms | 118.4 ms |
| provenance | 243.9 ms | 256.9 ms |

Warm **report total 1319.6 ms misses 1.3 s by 19.6 ms**. Full process is **1469.4 ms**, including startup and full JSON output. The benchmark's existing 1.3 s assertion remains enabled; measured cold/warm reports and timing are now written before that assertion so a failed target cannot leave stale artifacts. Cold/warm semantic parity passed. Provenance is 256.9 ms warm; definition metadata is indexed once for all families and repeated static-resolution maps are reused. Candidate cache: 1,302 hits / 0 misses; module cache: 1,303 / 0. Cold uses a fresh Plumb cache, not OS eviction. These are individual measurements, not latency guarantees.

Final verification: **69 CLI integration/e2e tests**, no failures/skips/unit tests; typecheck and whitespace check green. Protected text functions are unchanged. No installs, commits, MetalUI writes or project-specific core mapping. Details: [Layer 4](docs/layers/4-families.md).

## Layer 4 attribution correction (2026-10-09)

Nondecision custom properties retain their authored declaration site. Static literal parts reaching judged properties are checked once per definition and family; findings carry `variable: { name, useCount }`, and consumer sites are omitted. Counts deduplicate physical consumers, include transitive alias uses, and do not multiply comma selectors, property kinds or repeated import contexts. Definitions outside source globs remain existence/resolution inputs, without consumer provenance debt. Decision refs retain consumer origin/tier checks; compiler `--tw-*` infrastructure and the `--spacing` unit retain their prior treatment. Cycles, over-cap chains and runtime values retain unresolved consumer diagnostics when no statically authored literal is reached. Mixed declarations still judge their own literal parts.

MetalUI's example is the outside-source case: `kds.css:59 --well: var(--mu-well)` reaches generated package tokens, including the color literal once reported at 32 shadow consumers. None of those 32 consumers now has a color/elevation finding for `var(--well)`. Likewise `--btn-sh` no longer repeats its imported literals. No MetalUI file or token mapping was changed.

Local definition debts:

| Family | Variable | Definition | Distinct uses |
| --- | --- | --- | ---: |
| color | --lamp | apps/docs/src/kds.css:89:19 | 1 |
| color | --lamp | apps/docs/src/kds.css:90:47 | 1 |
| color | --syn-case | apps/docs/src/kds.css:51:3 | 1 |
| color | --mu-r-button-primary-shadow | apps/docs/src/kds.css:670:3 | 2 |

Overall grouped findings fall from **541 to 518**. Per-family failing contexts change from spacing 575 to 567, color 314 to 222, type 507 to 396, and elevation 267 to 186; radius 89, motion 171 and z 61 remain unchanged. Existence remains 40 dead classes / 66 class sites and two dead variables / three name-site pairs. Raw source declarations, inline coverage and decision records are retained; accepted/total family coverage now counts attribution obligations rather than duplicating variable consumers. Color/218-arbitrary/duration grep results remain exactly 206/218/51 hits with the prior verdict counts; reconciliation JSON now includes variable use-count metadata on definition findings.

Four added real-CLI fixture e2e slices cover local/source versus outside/package definitions, all seven families, direct decision tiers, transitive counts, comma-selector deduplication, mixed literals, compiled arbitrary classes, inline/embedded CSS, scoped/conditional definitions and warm source/source-glob edits. The prior spacing fixture now accepts both on-ladder media-variable definitions at their authored sites while retaining cycle/runtime diagnostics. `npm test`: 69 passed, no failures/skips; `npm run typecheck` and whitespace checks green. The benchmark performance target failed as recorded above; semantic checks and hit-by-hit reconciliation passed. No commits or package installs; protected text functions unchanged.

## Layer 6: ledger baseline and gates

Measured 2026-10-09 on a temporary **copy** of MetalUI's docs tree at HEAD `9cb04dc818ac84d981f8215352237d5c5ab2f85b`, with the existing benchmark preset. MetalUI remained read-only: copied docs were mutated; existing installed dependencies and library sources were linked only for reads. No packages installed, no Plumb worktree commits. This is a newer MetalUI snapshot than the earlier layer tables, so differences in raw findings are not attributed to ledger code.

Reproduce after building:

```sh
PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/layer6 node bench/metalui/ledger.mjs
```

The script also sets that exact cache path for every CLI child and deletes its temporary project in `finally`. Structured results: [layer6.run.json](bench/metalui/layer6.run.json).

Baseline: **3,214 entries**, comprising **1,268 debt** at **1,355 physical sites**, **0 exceptions**, and **1,946 accepted decisions**, marked inferred on first adoption. Counted sites collapse compiler/condition duplicates. Debt keys retain authored text, owner, property, relative path and stable anchor. Accepted decisions include configured presets plus project theme keys outside those selected ladders; framework defaults are not implicitly accepted.

| Debt rule | Entries |
| --- | ---: |
| `existence/dead-class` | 64 |
| `existence/dynamic-class` | 3 |
| `provenance/arbitrary` | 23 |
| `provenance/color` | 90 |
| `provenance/color/by-value` | 5 |
| `provenance/color/framework` | 2 |
| `provenance/elevation` | 114 |
| `provenance/elevation/by-value` | 48 |
| `provenance/motion` | 5 |
| `provenance/motion/by-value` | 23 |
| `provenance/motion/framework` | 41 |
| `provenance/opaque-inline` | 327 |
| `provenance/radius` | 8 |
| `provenance/radius/framework` | 1 |
| `provenance/spacing` | 245 |
| `provenance/type` | 178 |
| `provenance/type/by-value` | 43 |
| `provenance/type/framework` | 4 |
| `provenance/z` | 16 |
| `provenance/z/by-value` | 28 |

Accepted decision entries by family: color 656, elevation 100, motion 123, radius 98, size 2, spacing 866, type 90, z 11.

| Run | Process wall | Report total | Exit |
| --- | ---: | ---: | ---: |
| Baseline (fresh temporary root) | 3593.4 ms | not recorded by mutation command | 0 |
| First ledger check | 1348.1 ms | 1203.3 ms | 0 |
| Repeated ledger check | 1349.2 ms | 1202.4 ms | 0 |

Both ledger checks report **0 new, 1,355 debt sites, 0 exceptions, 0 stale**, with 1,302 candidate cache hits and no compilation. These are individual local measurements, not latency guarantees; the copy has a new absolute root and the layer cache can already contain dependency data. An initial implementation performed one Git-author lookup per entry and took 24,005.2 ms to baseline; the final implementation looks up attribution once per operation and the recorded baseline takes 3,593.4 ms.

Acceptance on the copied docs:

- Baseline followed by check exits **0**.
- Add one new TSX `gap-10`: exit **1**, **exactly one new error finding at one site**.
- Append a handwritten exception without why: exit **1**, `ledger/no-why`.
- Add `--spacing-13: 13px` to the copied theme: exit **1**, exactly one `decisions/unaccepted`, even though the existing preset excludes that new key.
- Rename `apps/docs/src/pages/components/ButtonSmartControls.tsx`: rebase prints **12 moves**, and the subsequent check exits **0**.
- Disposable Git fixture: `check --base HEAD` emits `ledger/grew` for each added ledger line, with new debt growth failing; reasoned exception growth is informational. Changed-file scope includes untracked files. Strict ledger/config growth fails versus HEAD; debt shrinkage passes.

Final verification: `npm test` **79 integration/e2e tests pass, zero failures/skips**; `npm run typecheck` and `git diff --check` pass. Ledger notes: [docs/layers/6-ledger.md](docs/layers/6-ledger.md). Text-view functions in `src/report.ts` remain untouched; its additions are types only.
Final verification: **65 CLI integration/e2e tests**, no failures/skips/unit tests; typecheck and whitespace check green. Protected text functions are unchanged. No installs, commits, MetalUI writes or project-specific core mapping. Details: [Layer 4](docs/layers/4-families.md).

## Layer 7: ownership

Built ownership only. Pinned MetalUI commit **faa2036e4634e4f6c8d49feaa2dac87a77559501**, source snapshot extracted into this layer's cache. The live repo was read only; another run changed/committed Dial while the first measurement was running, so this retained run uses an immutable Git archive. Consumer TS paths resolve package identity to that snapshot's actual source; installed dependencies remain read-only links. Preset token/theme inputs are byte-checked against the archive. Snapshot declaration/component source SHA-256: `a69d30120e1f7e84af5e73c3ac54e82d98750d53a7e0cdfeffcd2ddc4c896ef6`. No packages installed, commits made, or text-view functions changed.

Config: [ownership.config.ts](bench/metalui/ownership.config.ts), retaining the previous decision preset and adding `components.from: package:@unlocalhosted/metalui`. [COMPOSITION.md](../metalui/docs/COMPOSITION.md) identifies Surface, Well and GlassFace as Parts; their own source and agent docs determine the actual host boundary. Surface/Well allow content padding, typography and foreground color while retaining material, radius and elevation. Surface also allows host focus outlines: its documented API has no focus of its own. GlassFace retains bezel padding; GlassFace.Screen allows content padding and screen background/background-color/background-image, explicitly documented as caller fill under its glare. SlidingIndicator's source explicitly delegates material and shape through className, so its contract allows paint, radius and elevation. These are named contracts in the benchmark, with no MetalUI mapping in src/.

**39 grouped ownership findings / 50 property-site rows**, comprising **45 direct failing declaration contexts** and **5 heuristic contexts**. Every row has a verdict below; [reconciliation JSON](bench/metalui/layer7.reconciliation.json) retains finding keys, compiled values, conditions, component source and real variant metadata. Accepted specimen intent is review, not suppression: Layer 7 creates no ledger exceptions and emits those findings.

The Button flat-fill x-ray at Button.tsx:209 emits **background-color from bg-s! and box-shadow from shadow-none!**. Both name Button's real cap (standard, primary, destructive, link, graphite, strip, strip-danger), size (default, compact), state (idle, waiting, done, error), and button.tsx source. DESIGN's old one-finding page estimate is superseded by per-property ownership: two properties at that specimen, plus additional intentional anatomy, negative-example and static-state overrides elsewhere on the page. Layout-only properties there remain allowed.

### Caller declarations by family

Counts are compiled property contexts, including padding longhand expansion and direct CSS class matches; compiler-defined recipes are included because ownership governs their properties too. Allowed + findings = total for every family. **215 pure layout contexts** (margin, size, flex/grid/alignment and positioning) yield **zero ownership findings**. The remaining unowned properties include display/visibility, transforms and infrastructure; they also yield zero. Class spelling never determines that pass.

| Family | Total | Allowed | Findings |
| --- | ---: | ---: | ---: |
| size | 77 | 77 | 0 |
| layout | 72 | 72 | 0 |
| padding | 65 | 56 | 9 |
| other | 139 | 139 | 0 |
| paint | 27 | 8 | 19 |
| elevation | 8 | 3 | 5 |
| position | 63 | 63 | 0 |
| margin | 3 | 3 | 0 |
| custom-property | 18 | 18 | 0 |
| radius | 7 | 3 | 4 |
| type | 14 | 6 | 8 |

Caller contexts total **493**, with **448 allowed / 45 failing**. Descendant warnings are separate from that denominator. `sr-only` is an instructive mixed utility: its positioning/size/visibility declarations pass, but its four emitted zero-padding longhands hit Label's default padding contract. It is recorded as a valid accessibility pattern needing a contract decision, never mislabeled a layout-only false positive.

### Every ownership finding, with verdict

Paths below are relative to apps/docs/src. Each row is one property/site pair; shared finding keys group equal component/property/value evidence. Warnings use observed JSX ancestry and component root tags/classes; they do not prove runtime cascade or state.

| Rule | Property (owned family) | Severity | Site | Verdict |
| --- | --- | --- | --- | --- |
| ownership/Avatar | font (type) | error | pages/components/CueRecognition.tsx:37 · mark-person | contract review: Person glyph adds badge type to Avatar. Use its size API or explicitly approve this compact glyph typography. |
| ownership/Avatar | font (type) | error | pages/components/CueRecognition.tsx:80 · mark-person | contract review: Person glyph adds badge type to Avatar. Use its size API or explicitly approve this compact glyph typography. |
| ownership/Button | letter-spacing (type) | error | kds.css:666 · letter-spacing: -.005em | debt: Landing CTA overrides Button tracking; move this cap typography into a component variant. |
| ownership/Button | padding-inline-end (padding) | error | pages/components/Button.tsx:262 · px-0! | accepted specimen intent: Enlarged anatomy fixes cap width and zeroes horizontal padding to expose its construction. Proposed specimen exception. |
| ownership/Button | text-shadow (paint) | error | kds.css:667 · text-shadow: 0 -1px 0 rgba(90, 10, 0, .35) | debt: Landing CTA adds engraved ink shadow; it belongs to a cap variant or an explicit product exception. |
| ownership/Button | background-color (paint) | error | pages/components/Button.tsx:209 · bg-s! | accepted specimen intent: Flat-fill x-ray intentionally removes cap paint and elevation to contrast the cap recipe. Proposed reasoned exception; still emitted. |
| ownership/Button | padding-inline-start (padding) | error | pages/components/Button.tsx:262 · px-0! | accepted specimen intent: Enlarged anatomy fixes cap width and zeroes horizontal padding to expose its construction. Proposed specimen exception. |
| ownership/Button | padding-block-start (padding) | error | pages/components/Button.tsx:502 · py-6 | accepted negative example: The wraps specimen deliberately demonstrates the rejected multiline button; padding is part of that broken example. |
| ownership/Button | outline-color (paint) | error | pages/components/Button.tsx:532 · outline-green-deep | accepted specimen intent: State gallery forces focus-ring ink for a static focus specimen. Proposed specimen exception. |
| ownership/Button | border-radius (radius) | error | ui/xray/WordmarkXray.tsx:56 · borderRadius: '999px' | debt: X-ray launcher replaces link-cap radius with 999px. Use a supported cap geometry or a dedicated launcher contract. |
| ownership/Button | font-weight (type) | error | kds.css:665 · font-weight: 600 | debt: Landing CTA overrides Button weight; move this cap typography into a component variant. |
| ownership/Button | box-shadow (elevation) | error | pages/components/Button.tsx:209 · shadow-none! | accepted specimen intent: Flat-fill x-ray intentionally removes cap paint and elevation to contrast the cap recipe. Proposed reasoned exception; still emitted. |
| ownership/Button | color (paint) | error | pages/components/Button.tsx:531 · text-ink! | accepted specimen intent: State gallery forces rest ink for a hover specimen without user interaction. Proposed specimen exception. |
| ownership/Button | box-shadow (elevation) | error | blocks/availability-picker/availability-picker.tsx:392 · data-held:recipe-button-primary-pressed | debt: Booking action forces primary pressed fill/shadow through caller recipe. Component state/variant should own this held phase. |
| ownership/Button | padding-block-end (padding) | error | pages/components/Button.tsx:502 · py-6 | accepted negative example: The wraps specimen deliberately demonstrates the rejected multiline button; padding is part of that broken example. |
| ownership/Button | background (paint) | error | blocks/availability-picker/availability-picker.tsx:392 · data-held:recipe-button-primary-pressed | debt: Booking action forces primary pressed fill/shadow through caller recipe. Component state/variant should own this held phase. |
| ownership/Field.Input | color (paint) | error | blocks/share-panel/share-panel.tsx:373 · text-ink2 | debt: Read-only share URL mutes Field.Input ink. Use a field tone/state decision rather than caller paint. |
| ownership/FormField.Label | padding-bottom (padding) | error | blocks/share-panel/share-panel.tsx:310 · sr-only | contract review: Valid visually hidden label; sr-only also emits four zero padding longhands. It is a mixed utility, not a layout-only pass. Label needs a hidden API or an explicit padding contract. |
| ownership/FormField.Label | padding-left (padding) | error | blocks/share-panel/share-panel.tsx:310 · sr-only | contract review: Valid visually hidden label; sr-only also emits four zero padding longhands. It is a mixed utility, not a layout-only pass. Label needs a hidden API or an explicit padding contract. |
| ownership/FormField.Label | padding-right (padding) | error | blocks/share-panel/share-panel.tsx:310 · sr-only | contract review: Valid visually hidden label; sr-only also emits four zero padding longhands. It is a mixed utility, not a layout-only pass. Label needs a hidden API or an explicit padding contract. |
| ownership/FormField.Label | padding-top (padding) | error | blocks/share-panel/share-panel.tsx:310 · sr-only | contract review: Valid visually hidden label; sr-only also emits four zero padding longhands. It is a mixed utility, not a layout-only pass. Label needs a hidden API or an explicit padding contract. |
| ownership/Icon | color (paint) | warn | pages/library.css:16 · color: var(--ink2) | reviewed heuristic: Section-entry SVG ink can reach Icon roots beneath this ancestor. Deliberate muted navigation glyphs; approve inherited glyph ink or style the host. |
| ownership/Icon | color (paint) | warn | pages/library.css:29 · color: var(--ink2) | reviewed heuristic: Place-card SVG ink can reach Icon roots beneath this ancestor. Deliberate muted navigation glyphs; approve inherited glyph ink or style the host. |
| ownership/Icon | color (paint) | error | pages/foundations/Sizing.tsx:63 · text-ink2 | contract review: Sizing specimen gives Icon muted host ink. Glyph foreground contract needs explicit adoption; default ownership still catches it. |
| ownership/Icon | color (paint) | error | pages/foundations/Spacing.tsx:81 · text-ink2 | contract review: Spacing specimens give Icon muted host ink. Glyph foreground contract needs explicit adoption; default ownership still catches it. |
| ownership/Icon | color (paint) | error | pages/foundations/Spacing.tsx:91 · text-ink2 | contract review: Spacing specimens give Icon muted host ink. Glyph foreground contract needs explicit adoption; default ownership still catches it. |
| ownership/IconButton | color (paint) | error | blocks/task-inbox/task-inbox.tsx:609 · aria-pressed:text-success | debt: Pressed completion action repaints IconButton success ink. Put this semantic state in its component variant. |
| ownership/Kbd | box-shadow (elevation) | warn | ui/edit/edit.css:68 · box-shadow: 0 0 0 1.5px var(--mu-presence-guide-dark) | reviewed heuristic: Held tag key adds a presence-guide shadow to Kbd. Intentional editor interaction cue; approve a reasoned exception or expose held state on Kbd. |
| ownership/Link | outline (paint) | error | pages/components/Link.tsx:20 · focus-ring | accepted specimen intent: Link state gallery forces its focus ring for comparison. Proposed static-state specimen exception. |
| ownership/MarkLine | font (type) | error | pages/components/DateCue.tsx:28 · type-content | debt: MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract. |
| ownership/MarkLine | font (type) | error | pages/components/NumericCue.tsx:48 · type-content | debt: MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract. |
| ownership/MarkLine | color (paint) | error | pages/components/DateCue.tsx:28 · text-ink | debt: MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract. |
| ownership/MarkLine | color (paint) | error | pages/components/NumericCue.tsx:48 · text-ink | debt: MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract. |
| ownership/MarkLine | color (paint) | error | ui/cues/ProvenanceDocument.tsx:119 · text-ink | debt: Reading presentation already selects MarkLine policy; caller additionally overrides its ink. Remove redundant ink or make it an explicit line decision. |
| ownership/MarkLine | letter-spacing (type) | error | pages/components/DateCue.tsx:28 · type-content | debt: MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract. |
| ownership/MarkLine | letter-spacing (type) | error | pages/components/NumericCue.tsx:48 · type-content | debt: MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract. |
| ownership/Row | background (paint) | error | pages/components/Spinner.tsx:98 · recipe-well-field | debt: Upload row replaces panel material with the field-well recipe. Use Row variant or compose a documented well host. |
| ownership/Row | box-shadow (elevation) | error | pages/components/Spinner.tsx:98 · recipe-well-field | debt: Upload row replaces panel material with the field-well recipe. Use Row variant or compose a documented well host. |
| ownership/Row.Text | color (paint) | warn | ui/edit/edit.css:148 · color: var(--ink3) | reviewed heuristic: Off layer dims Row.Text through descendant selector. Intentional editor state, but needs Row tone/state or a reasoned exception. |
| ownership/Row.Text | color (paint) | error | pages/components/Spinner.tsx:99 · text-ink | debt: Upload row manually recolors Row.Text by pending state. Source component should own pending tone. |
| ownership/Row.Text | color (paint) | error | pages/components/Spinner.tsx:99 · text-ink2 | debt: Upload row manually recolors Row.Text by pending state. Source component should own pending tone. |
| ownership/ScrollArea | background (paint) | error | pages/components/ScrollArea.tsx:23 · recipe-well-field | debt: ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract. |
| ownership/ScrollArea | background (paint) | error | pages/components/ScrollArea.tsx:57 · recipe-well-field | debt: ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract. |
| ownership/ScrollArea | box-shadow (elevation) | error | pages/components/ScrollArea.tsx:23 · recipe-well-field | debt: ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract. |
| ownership/ScrollArea | box-shadow (elevation) | error | pages/components/ScrollArea.tsx:57 · recipe-well-field | debt: ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract. |
| ownership/ScrollArea | padding-top (padding) | error | blocks/ai-composer/ai-composer.tsx:324 · pt-mu-space-12 | debt: Conversation pads ScrollArea root. Pad its content child or explicitly approve root padding. |
| ownership/ScrollArea | border-radius (radius) | error | pages/components/ScrollArea.tsx:23 · rounded-card | debt: ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract. |
| ownership/ScrollArea | border-radius (radius) | error | pages/components/ScrollArea.tsx:57 · rounded-card | debt: ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract. |
| ownership/Skeleton.Text | color (paint) | warn | pages/library.css:37 · color: var(--ink2) | reviewed heuristic: Place-note direct spans include Skeleton.Text roots. Inherited muted copy ink is intentional; approve skeleton foreground contract or keep ink on the host. |
| ownership/Surface | border-radius (radius) | error | ui/LayerSorter.tsx:45 · borderRadius: 7 | accepted specimen intent: Tiny illustrated blocks deliberately replace Surface card radius with 7px. Proposed diagram-art exception; production material radius remains owned. |

### Timing and verification

| Measurement | Cold | Warm |
| --- | ---: | ---: |
| Full CLI process, including JSON | 4787.0 ms | 2187.1 ms |
| Report total | 4542.8 ms | 2012.1 ms |
| Ownership discovery + judging | 871.7 ms | 681.8 ms |

Warm compiler **1302 hits / 0 misses**; module graph **1303 hits / 0 misses**. Cold/warm declarations, decisions, coverage and all findings are deeply equal. This is one local process pair, not a latency guarantee; warm full CLI is above two seconds. Full phase receipt: [layer7.run.json](bench/metalui/layer7.run.json). Reproduce: `npm run build`, `node bench/metalui/measure-layer7.mjs`, `node bench/metalui/reconcile-layer7.mjs`; the cache is exactly `PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/layer7`.

Final validation: **75 CLI integration/e2e tests green**, typecheck and whitespace check green. Core covers discovery precedence, aliases/barrels/namespaces/default exports, forwarding wrappers, compound parts, both render-prop directions, dynamic inline properties, compiled/static/arbitrary classes, per-property/family allow/deny, source-glob boundary, root-selector warnings, cva/tv and prop unions (including adjacent declaration files for published JS). Known static limits: opaque whole style objects/spreads and unlowered template holes have no invented properties; no runtime identity or cascade analysis; selector functions/siblings/IDs and ancestry across independently rendered files remain unknown. `PRESSED[cap]` inside Button.tsx:533's template is an existing opaque class-reader boundary, while the literal pressed recipe in availability-picker is lowered and caught. Details: [Layer 7 notes](docs/layers/7-ownership.md).
