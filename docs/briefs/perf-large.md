# Large projects: Session cold start and warm checks

Measured on AlgoRecall (/Users/vijaysingh/unlocalhosted/algorecall: 2,606 TSX, 7 CSS, 920 other files; read-only, never
write inside it; use PLUMB_CACHE_DIR under /private/tmp; config /Users/vijaysingh/unlocalhosted/plumb/bench/apps/algorecall.plumb.config.ts):
- `plumb check --json` cold: 34 s; warm (same cache): 11.5 s.
- `Session.create({ root, config, watch: false })` cold: 74 s (twice the CLI's cold time for the same analysis);
  after that, `report()` 3.9 s then 2.8 s.
MetalUI's warm check is ~1.3 s (bench/metalui/final-pass.mjs gate 2 s), so per-file cost on AlgoRecall is the outlier.

Profile with --cpu-prof (CLI) and the inspector on the Session coordinator/analysis workers. Find why the Session's cold
start is ~2x the CLI (duplicate work between coordinator and analysis worker? both parsing every file? serial vs
parallel? cache not shared between them?) and why a warm CLI run on 2,606 files takes 11.5 s (cache misses? per-file work
that should be per-project? JSON (de)serialisation of large caches?). Fix the causes, keeping results identical (compare
the JSON report before/after on AlgoRecall and MetalUI). Targets: Session cold start <= CLI cold; warm CLI on AlgoRecall
<= 3 s; MetalUI gate still passes. Add a bench script bench/apps/large.mjs that records these four numbers and fails over
the targets. No unit tests. npm test and typecheck pass. Do not commit. Summary with profile evidence to
docs/briefs/perf-large.result.md.
