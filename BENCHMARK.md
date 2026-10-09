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
