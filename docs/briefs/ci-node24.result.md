# Node 24 CI failure results

Scope: failures from `47a9c44`, CI run `38892444012`.

## Discovery and shared state

`serve.json` is written completely to a private file beside its destination, with mode `0600`. Publication uses `link`, which atomically exposes the complete file and refuses an existing destination. The private name is removed on success or failure. A competing daemon cannot replace the published owner.

CLI clients, installation advice, and server discovery reads share a parser that treats incomplete JSON, JSON primitives, and invalid connection records as no connection. CLI commands use their existing cold fallback. An invalid file is not deleted merely because it cannot identify an owner; exclusive publication still protects it from replacement.

The state-file audit found:

| State | Finding and change |
| --- | --- |
| Daemon discovery | Exclusive direct write exposed empty/partial bytes. Replaced with complete private write and exclusive atomic link. |
| Ledger | Already renamed complete files, but concurrent calls shared a PID-only temporary name. Uses unique private files with cleanup. |
| Class collection receipts, module graph, stylesheet results, suggestion rankings | Already renamed complete files; overlapping calls could share temporary names. Use unique private files with cleanup. |
| Tailwind candidates, suggestions, theme, hover variants | Candidates used a shared temporary name; the other three wrote published paths directly. All now publish complete files with atomic rename. |
| Complete-result cache | Files were already renamed before publishing the input receipt, but concurrent writers shared the staging directory. Each writer now owns a unique directory, removed in `finally`; the receipt remains last. |
| Ownership receipts | Already synchronous write/rename, but worker threads share a PID. Uses unique exclusive temporary files with cleanup. |
| Trend report/history | Already prepared both files before renaming each. Uses a unique staging directory with cleanup. Each file is atomic; this does not introduce a transaction across both files. |
| Agent hook settings | Already private exclusive write followed by atomic rename; no partial published settings. No change needed. |

Project source/configuration edits and generated documentation are not machine-state caches or discovery records and were left outside this fix. Atomic publication does not add merge semantics for concurrent ledger/history edits.

The new integration tests exercise six daemon startups while a separate process continuously parses discovery, a second daemon's refusal and preservation of the live connection, simultaneous startup ownership, malformed-discovery CLI/install fallback, four concurrent cold checks with warm-cache reuse, and four concurrent worker checks with ownership evidence preserved.

Before the fix, the startup reader failed with `SyntaxError: Unexpected end of JSON input`; installation advice failed on empty discovery; concurrent checks failed renaming a shared class-receipt temporary file (`ENOENT`). These were reproduced through the real CLI/API pipeline.

## Blueprint unpick race

The unpick click rebuilds the chooser beneath the pointer. Chromium can deliver `pointerenter` to the new step on a subsequent frame. The dock correctly counts zero queued picks while that hovered step still previews on the page. The previous test assumed that zero picks also meant no hover preview, so its style-cleanup wait depended on pointer/frame ordering.

The unmodified test passed ten local Node 24 runs. A controlled pointer probe reproduced the exact five-second cleanup timeout with:

```text
dock: Blueprint · 20 off in view · Alt+B
pressed steps: 0
inline style: gap: 8px !important;
computed gap: 8px
```

This is the documented hover-preview behavior, not an incorrect picked state shown to the user. Moving away restores the original style. The test now deliberately exercises the unpicked hover preview, verifies the step is unpressed, moves the pointer off the chooser, then waits for the actual cleanup condition. The timeout was not increased. The updated test passed **10 consecutive Node 24 runs** in real Chrome.

No `overlay/src` or `site/src` changes were made. The pre-existing unstaged `site/src/hero/Hero.jsx` edit and unrelated work remain untouched.

## Validation

- Node 24: `v24.22.0`.
- Focused publication/cache checks: passed, including the startup hammer and concurrent writer regressions.
- `npm run typecheck`: passed.
- Blueprint unpick: 10/10 consecutive updated-test runs passed.
- Full Node 24 main test matrix: **450 passed, 1 failed, 1 skipped** (452 tests, 732.9 seconds). Both original failures and all new publication regressions passed. The sole failure was the packed-setup subprocess inheriting the outer runner's `npm_config_call` from `npx -c`, causing nested `npx --no-install plumber` to reject its invocation with `EUSAGE`.
- Packed setup rerun with the same Node 24 executable on `PATH`, without the outer `npx -c` environment: **1/1 passed**, including installation, stamped Alt-hover, preview and exact source write. No product or test change was needed for this runner issue.
- Node 24 polling variant: **25 passed, 1 skipped**, zero failures (77.6 seconds).
- Node 24 no-watch variant: **23 passed, 3 skipped**, zero failures (54.4 seconds).
- Node 22 compatibility (`v22.23.3`): **13/13** final publication/cache integration checks and **1/1** blueprint unpick check passed. The full Node 22 suite was not repeated: the Node 24 main matrix alone took over twelve minutes, so a second full run was not quick.

One early full-suite attempt was explicitly interrupted to complete the ownership-worker audit. Its cancellation output is not a completed-suite result. The completed full-suite attempt used:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npx -y -p node@24 -c 'node --version && npm test'
```

The failing setup slice was rerun directly with that Node 24 installation first on `PATH` and `PLUMBER_WATCH=1 PLUMBER_POLLING=0`. Since `npm test` stops after a failed main matrix, its polling and no-watch commands were then run separately with the same clean environment. The full main matrix was not repeated. This is completed slice coverage after an environment-only retry, not a claim that the original `npm test` invocation exited successfully.

Commits: `3be487f` (atomic state/discovery), `e56a0b5` (blueprint test), `9c138fc` (ownership writer isolation). No push performed. The supplied `ci-node24.log` is removed in the result commit.
