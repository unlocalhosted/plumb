# Roadmap 2: serve

Implemented a warm Session, authenticated local HTTP, newline JSON-RPC, watch clients and daemon-backed snippet checks. No packages installed. No commits made. Rule message strings and the protected report/agent formatters are unchanged.

## Use

```sh
plumb serve --root ./project --port 0
plumb serve --root ./project --stdio
plumb check --root ./project --watch --json
printf '<div className="gap-[13px]" />' | plumb try --root ./project --json
```

HTTP listens only on `127.0.0.1`. Port 0 chooses a free port. `.plumb/serve.json` contains `protocol`, `root`, `config`, `port`, `pid` and a random 256-bit `token`; the file has mode 0600. Send that token as `x-plumb-token` on every request, including health. No CORS permission is granted. Shutdown removes only the discovery file this daemon owns. A live daemon's discovery file is never overwritten.

| Method | Endpoint | Inputs |
| --- | --- | --- |
| GET | `/report` | Optional `base`, `changed`, `strictLedger` |
| GET | `/site` | `file`, positive `line`, optional positive `column` |
| POST | `/try` | JSON `{code, lang?, as?}`; `lang` is `tsx` or `css`; 1 MiB limit |
| GET | `/decisions` | None |
| GET | `/why` | `file`, positive `line` |
| GET | `/health` | None |

JSON-RPC uses one JSON object per line on stdin/stdout. Methods are `report`, `site`, `try`, `decisions`, `why`, `health`; `plumb.` prefixes also work. Parameters match HTTP. Request ids are preserved, notifications produce no response, and parse/request/method/parameter errors use JSON-RPC error codes. Stdio writes no discovery file and closes its Session on EOF. This is JSON-RPC transport, not an MCP server or LSP framing.

`check --watch` and `try` read discovery automatically. Root, config and protocol must match. Missing, stale, disconnected or unauthorized discovery falls back to local analysis. Watch can move between a daemon and a local Session. It reports invalid input once per distinct error and continues when the source becomes valid.

## Warm state and invalidation

`Session.create()` owns a worker containing the Tailwind design system, candidate CSS, module parses and import edges, per-file source evidence and lowered declarations, component graphs, token record, rule results and ledger snapshot. The worker serializes updates and queries; HTTP stays responsive while analysis runs.

Source collection caches each file and its direct literal-import dependencies. Component discovery shares parsed modules and tracks transitive static imports/re-exports. A TSX change invalidates the changed source and relevant dependents. Stable evidence retains object identity, so unchanged declarations and family judgements are reused. Provenance groups files by their custom-property dependencies; a definition's consumers are judged together, retaining attribution and consumer counts. Candidate spelling rankings are invalidated only when a changed hint could enter the ranking.

Native recursive `fs.watch` batches events. Local reads also check the requested file directly, so a query immediately after a save sees that save. A polling scan, default 250 ms, checks external dependencies and provides the fallback on platforms without recursive watching. `polling: true` forces that fallback in the Session API. Content hashes follow changed stat stamps, including inode and ctime for atomic saves. Full reports scan all tracked inputs before returning.

CSS, theme, config, package/tsconfig changes and source additions/deletions conservatively replace the worker. This reloads executable config modules without stale Node import state and invalidates the compiler and token record together. External config imports, DTCG source globs (including empty sources) and Tailwind stylesheet/plugin/config files are tracked. Ledger-only edits reload and reclassify the ledger without rebuilding source evidence. Invalid source does not produce a successful stale report; a corrected save recovers the Session.

Local `/site` reads judge the requested line and the companion classes in its expression against the shared project context. They defer whole-project fix-group assembly, coverage and dead-token reachability until `/report` or `/why`. Queries for source-defined custom properties use the full report so their consumer counts remain complete. `/try` uses an in-memory overlay and reuses parsed context; it does not write source files or ledger allowances. Imported literal maps and component dependents see the overlay without replacing base caches. A valid overlay can repair its own invalid on-disk source for that query while retaining the disk diagnostic. Snippet graph/count mutations cannot modify the retained project report.

Candidate caches reset after 4096 entries; hint indexes retain two root sets; local query judgement caches retain at most 64 files. Other per-file rule caches keep only live file/cluster entries. Weak caches do not retain old edits. The daemon reads existing disk caches and keeps new analysis state in memory.

## Verification

`e2e/serve.test.mjs` drives the real CLI over copied fixtures with `node:test`:

- Deep equality with cold CLI reports after TSX, CSS, theme, config and ledger edits in sequence, then source rename/deletion.
- Dependent literal imports update; unrelated TSX files are neither collected nor rejudged. Forced polling and invalid-source recovery are covered.
- Local queries return fresh declarations before full report assembly; successive local reads preserve later cold parity and stylesheet imitation context.
- Every HTTP route requires the token; permissions, request validation, loopback binding and discovery cleanup are covered.
- Stdio covers all six methods, ids, notifications, protocol errors and EOF cleanup.
- Daemon snippet clients match cold snippet checks, preserve project files and leave the full report intact; imported overlays and invalid-target repair are covered. Stale discovery falls back.
- Both watch paths emit edits and recover from syntax errors.
- Attribution, ownership, imitation and custom habits fixtures retain their full cold semantics.

Parity compares every semantic report field. It removes only elapsed timing and module-cache telemetry (`cacheHits`, `cacheMisses`, `parseMs`, `totalMs`), which necessarily differ between independent warm and cold executions.

`npm test`: 154 integration/e2e tests pass, including all 16 daemon tests. `npm run typecheck` and `git diff --check` pass.

## MetalUI benchmark

Run:

```sh
PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/2-serve node bench/metalui/serve.mjs
```

The harness archives pinned MetalUI source into that cache directory, copies its tokens and rewrites the benchmark config to the copy. Installed third-party dependencies are read through links; the workspace MetalUI package points at its copied source. The live MetalUI worktree is never edited. No installation is needed.

An exported native element is added to the copied `Fan.tsx`. After five warm-up edits, twenty measured edits each replace its one class with a new arbitrary gap value. Timing includes the file write, HTTP request and JSON response; every response must contain that new value. Snippet timing uses twenty authenticated HTTP requests after a separate snippet warm-up. Cold parity is checked before edits, after the first edit and after the soak. The soak makes 600 edits, one per second, queries each edit and records process RSS and cache sizes every 30 seconds.

Results on Node v25.9.0, MetalUI commit `e0a0b31349a371e48ad38f0cc8099be5fc1b2be5`:

| Query | Median | p95 | Maximum | Samples |
| --- | --- | --- | --- | --- |
| File edit plus `/site` | 72.65 ms | 82.40 ms | 85.60 ms | 20 |
| `/try` | 62.92 ms | 73.55 ms | 76.44 ms | 20 |

Every measured request is below 100 ms. The incremental receipt identifies only `Fan.tsx` as collected and rejudged. All three full-report parity comparisons pass.

The soak lasts 600.097 seconds and completes 600 edits. RSS starts at 995.6 MiB after the large warm-up reports, falls as those buffers are collected, ranges from 493.8 to 995.6 MiB and ends at 600.2 MiB. Cache counts stay identical at every sample: 258 source files, 1333 candidates, 393 parsed modules, 258 component shards and one local query view. There is no observed memory growth over the run.

[Structured receipt](../../bench/metalui/2-serve.run.json) includes every latency and all 21 RSS samples. These are measured local results. The roadmap's 24-hour soak remains outside this task's requested 10-minute acceptance run.

After the final snippet-overlay fix, a five-sample calibration passes initial and edited cold parity again. File edit plus `/site` has a 69.19 ms median and 80.32 ms maximum; `/try` has a 63.69 ms median and 74.67 ms maximum. This shorter recheck has no soak and writes a separate [calibration receipt](../../bench/metalui/2-serve.calibration.json), preserving the complete 10-minute receipt above.
