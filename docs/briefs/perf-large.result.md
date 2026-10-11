# Large-project performance result

Measured 2026-10-10, Node v25.9.0, macOS. Baseline is `291d2a88de8f3019b25257c6bda471ede2b51a55`, built and run from this checkout against the same source/config paths. Cold means fresh Plumb caches, not flushed OS caches. AlgoRecall and MetalUI source worktrees stayed read-only. No commit made.

## Timings and limits

One complete unprofiled run passed every target. Later cache-admission, receipt-deduplication and stream changes preserved results. The latest complete run passes both AlgoRecall targets but misses MetalUI's 2 s gate. **Current final-tree performance is not fully certified.** Keep all receipts; do not present the earlier passing run as the final run.

| Measurement | Baseline | Passing run | Latest final-tree run | Target |
| --- | ---: | ---: | ---: | --- |
| AlgoRecall CLI cold | 28,859.04 ms | 22,121.78 ms | 84,662.59 ms | Reference |
| AlgoRecall CLI warm | 11,633.96 ms | 681.20 ms | 1,831.42 ms | <= 3,000 ms: pass |
| Session cold | 109,220.26 ms* | 21,118.20 ms | 59,497.01 ms | <= CLI cold: pass |
| MetalUI warm maximum | 1,249.90 ms | 1,216.75 ms | 2,921.68 ms | <= 2,000 ms: fail |

*Baseline Session has inspector overhead; compare profiler runs separately below. Latest `report()` took 4,687.54 ms; passing run took 2,485.02 ms. MetalUI maximum includes three API runs and text/JSON CLI runs, retaining the existing pinned all-rules gate. Machine load during the final benchmark measured 13.4 across eight CPUs, with 0.65 GiB free memory. Slowdown affects both projects; contention is a possible explanation, not proven causation or grounds to waive limits.

Latest MetalUI API runs were 2,729–2,755 ms with zero parse/compiler misses. Repeated stylesheet work took 385–394 ms, decisions 287–302 ms, provenance 539–554 ms, habits about 255 ms and ownership 168–174 ms. Its all-rules config imports other executable modules and spreads their values, so it correctly bypasses the literal-config report cache. Further work or a controlled rerun is needed to certify that gate; admission was not broadened to arbitrary executable configs to force a passing result.

Receipts and complete JSON evidence:

- Baseline: `/private/tmp/plumb-large-yD0uK9`.
- Passing unprofiled run: `/private/tmp/plumb-large-wMqqcI`.
- Latest final-tree run: `/private/tmp/plumb-large-V3l7PR` (nonzero exit on MetalUI, timing assertions retained).
- Earlier final-tree rerun: `/private/tmp/plumb-large-Jii3ws` (Session 60,590.20 ms vs CLI 56,316.75 ms; MetalUI 4,126.68 ms; identical hashes).
- Optimized worker profiles: `/private/tmp/plumb-large-final-profiles-YtArcR`.

## Profile evidence

CLI profiles use `--cpu-prof`; Session profiles use inspector in coordinator and analysis workers. Values below are sampled inclusive time, so nested rows must not be added.

- Baseline coordinator was 96.7% idle; `scan` consumed about 53 ms. The bottleneck was in analysis, not two coordinators independently parsing the project.
- Baseline analysis: incremental provenance 46,983 ms (43%); component graph 19,982 ms (18.3%); class collection 10,366 ms. Per-file provenance repeatedly built project-wide variable/decision registries. Component shards repeatedly discovered imported identities and traversed dependency closures.
- Optimized inspector Session: 21,794.88 ms cold. Coordinator remained 95.9% idle. Analysis provenance fell to 3,162 ms; component graph to 3,380 ms; class collection to 4,919 ms. Profiles are `session-1.cpuprofile` and `session-2.cpuprofile` in the optimized directory.
- Baseline warm CLI still spent about 2,801 ms in provenance and 2,933 ms in report emission despite parse cache hits. Optimized warm profile was 720 ms: receipt validation 377 ms inclusive, stat 61 ms self, stream writes 102 ms self, with no repeated provenance or AST analysis. This profile precedes the final receipt deduplication/1 MiB streaming refinement.
- Baseline cold CLI repeated AST transfer: computed-module work about 5,766 ms inclusive and parser JSON conversion 2,250 ms self. Collection and component discovery now share parsed programs within the analysis batch.

## Changes and correctness

Reviewed and retained interrupted changes, then completed their invalidation and Session behavior:

- Share collection programs, import specifiers, source text, component identities and root/fingerprint analysis. Keep snippet overrides isolated. Retain direct dependency adjacency; memoize closures and request query dependencies only when needed.
- Share immutable provenance resolution/decision/attribution registries across family and per-file judgement. Compress union-find paths, skip empty family clusters, and use sets for edit/site deduplication. Preserve the initial incremental provenance state so later edits stay local.
- Use V8 serialization for source/component receipts. Replace whole-report ledger cloning with copies of mutable presentation fields; copy finding sites before regrouping. Raw authored evidence remains unchanged across ordinary/strict views.
- Add validated complete-report reuse for literal CSS-only configs. Revalidate source inventory, content identities/hashes, imported bytes, import resolution, component directories, compiler graph, ledger, build/V8 identity and Tailwind metadata. Ignore stale phase receipts when publishing a new result; deduplicate identical resolution receipts. CLI streams compact cached evidence in 1 MiB chunks with current timing; API deserializes V8 evidence.
- Admit deterministic root-local shadcn contracts. Bypass executable configs/package presets, external or ignored shadcn directories, Tailwind JavaScript plugins/configs, strict-ledger and git-scoped checks. Admission reads preset metadata without executing decision callbacks twice. Dynamic configurations retain the ordinary pipeline.

Eight integration tests cover cold/warm CLI/API parity, source/membership/theme/ledger changes, executable config/preset behavior, shadcn contract edits, compiler metadata, same-size/mtime external helper edits, changed import resolution/removal, and raw Session evidence after ledger presentation. No unit tests added. Existing Session locality, watcher and burst scenarios provide feature-level coverage.

The final concurrent suite exposed two runner issues: a native-watch probe rejected while its write was pending, and unrelated test-file load exhausted the burst read queue. Attach the probe rejection handler immediately while retaining its awaited error/skip handling. Run test files serially so latency assertions measure the feature; the 300 overlapping reads, 50 ms health and 5 s queue/burst limits remain unchanged.

## Identical results

Before/after and CLI cold/warm comparisons hash the entire parsed report, preserving field/array order. Only `timing` and `moduleGraph.{cacheHits,cacheMisses,parseMs,totalMs}` are removed. Every comparison passed, including latest timing-failing run. CLI and Session each match their own baseline:

```text
AlgoRecall CLI  83723d1843b4c3518d23b549203edfc556238a15e234893bd59fb26055162732
Session         63f4491f9d018f2f8c8452de4e71fa1c1170d017a8fbfeb82116cd931d313942
MetalUI         bbf02302e3862e55fc872530396173910c082a9fd1fc0bba2964e7a94819a65c
```

MetalUI uses snapshot `faa2036e4634e4f6c8d49feaa2dac87a77559501` through the existing archive fixture. The harness restores tracked `bench/metalui/final-before.json` in `finally`.

## Reproduction and validation

```sh
npm run build
node bench/apps/large.mjs --compare=/private/tmp/plumb-large-yD0uK9
# Add --profile for CLI and both Session worker profiles; overhead affects timing.
npm test
npm run typecheck
```

The harness records all four timers and fingerprints in its temporary `result.json`, then asserts targets. Reports are fingerprinted in separate processes to avoid retaining hundreds of megabytes before Session startup.

Validation: explicit `npm run build` passed before tests; `npm test` passed all three modes (main: 306 passed / 22 skipped; polling: 25 passed / 1 skipped; no-watch: 23 passed / 3 skipped; zero failures). The 1,000-file / 300-overlapping-read integration test completed in 2,195.93 ms. Chromium-dependent cases were skipped because Chromium is absent; native-watch probe reported EMFILE, so native OS coverage is unavailable. `npm run typecheck` and `git diff --check` passed. Logs: `/private/tmp/plumb-perf-{build,tests,typecheck}-final.log`.
