# Implicit state machines in `src/` (Node side)

Scope: `src/` only (overlay, site, homepage, bench, examples, tests ignored). Read-only audit; no source file was changed.
Paths are relative to `src/`. "L" numbers are line numbers in the file named in the section header unless prefixed.
Layering to keep in mind (it explains most of the findings): **host `Session`** (`session/index.ts`, main thread) -> **coordinator** worker thread (`session/coordinator.ts`) which runs the **engine `Session`** (`session/engine.ts`) -> which spawns the **analysis worker** (`session/worker.ts`). Three nested lifecycles, each with its own `closed`/`failure`/`pending` bookkeeping.

## Summary (sorted by risk)

| # | Machine | File | #states | Worst risk | Conf. |
|---|---|---|---|---|---|
| 1 | Write attribution: `tag` / `undoing` / `transaction` shared fields | session/engine.ts:256-257,933 | ~6 combos | Session-global fields held across `await` without the lock: a concurrent write is recorded as part of someone else's undo/trace group | VERIFIED |
| 2 | Engine analysis-worker lifecycle (`worker`, `closed`, `failure`, `pending`) | session/engine.ts:208-324,477-487 | 6 | Worker dies after ready: `this.worker` is never replaced, later `request()` posts to a dead worker and waits forever; `failure` is sticky until some file changes | VERIFIED |
| 3 | Host `Session` + route/registry (`closed`, `failure`, `current`, `diagnostic`, vite `registry`, next `shared.handler`) | session/index.ts:24-25,65; session/server.ts:258-259; hosts/vite.ts:18,135-141; hosts/next.ts:17 | 5 | A failed host Session is terminal for the process and is never evicted from the Vite registry or the Next singleton; every request then fails until the dev server is killed | VERIFIED |
| 4 | applyAll transaction flag + Vite hot-update hold (`transaction`, `held`, `held.ending`, `released`) | session/engine.ts:925-935; hosts/vite.ts:48-98 | 6 | `transaction` is one boolean, `applyAll` is not serialized: overlapping applies clear each other's flag; reload can fire mid-write | VERIFIED |
| 5 | Reconciliation loop (`refreshing`, `events`, `native`, `inventoryDirty`, `patternsDirty`, `batchRead`, `directories`) | session/engine.ts:236,259-261,413-535 | ~8 | `batchRead` is a session-global flag that turns the mutex off; `refresh(true)` silently downgraded to an in-flight non-full refresh | VERIFIED |
| 6 | Census reader pool (`taken`, `routes`, `queue`) | census.ts:58-85 | 4 | If one reader throws, the other polls forever (`taken - routes.length > 0` never reaches 0): process hangs after the error | VERIFIED |
| 7 | Generation-keyed caches (`pageCache`, `unitKept`, `recipeProject`, `pageGeneration`) | session/engine.ts:214-220,607-656,1793 | per-entry 3 | `page()` runs 3 separate locked cohorts, then caches the combined answer under the *latest* generation/hash | VERIFIED |
| 8 | Ledger entry lifecycle (`kind`: debt / exception / decision / declined; `.baseline-pending`; derived new/debt/exception/stale) | ledger/types.ts:5; ledger/store.ts; ledger/commands.ts:83-141; onboarding/decline.ts:14-28 | 4 persisted + 4 derived | Unlocked read-modify-write of the whole ledger by 4 writers (lost update); `.baseline-pending` is read but never created anywhere in `src/` | PARTIAL |
| 9 | Write history + batches (`written`, `batches`, `writes`, evict, undoBatch) | session/engine.ts:249-251,1573-1690 | per-entry 4 | Eviction/undo-by-id vs undo-by-trace share ids and two stores; history is memory-only (lost on worker restart / `close`) | PARTIAL |
| 10 | Analysis worker dirty flags (`dirty`, `sharedDirty`, `metadataDirty`, `metadataFull`, `localReports`, `classified`) | session/worker.ts:34-42,67-95,213-226 | 5 reachable + 1 only on throw | `sharedDirty` can be set while `dirty` is false if `prepare` throws; read paths then serve a stale `raw` (masked only because the engine restarts the worker) | VERIFIED |
| 11 | Serve daemon + `serve.json` discovery | session/server.ts:405-455; session/discovery.ts; session/client.ts | 5 | `--page` mode writes no `serve.json`, so several daemons can share one project and the change log; liveness is only `kill(pid,0)` (PID reuse) | PARTIAL |
| 12 | Coordinator admission queue (`queue`, `running`, deadlines, `pending` timers) | session/coordinator.ts:9-66; session/index.ts:70-84 | 4 | Once a call is `started` the host timer is cleared; a hung engine call holds every later call until its 5 s deadline, then they all fail Busy | PARTIAL |
| 13 | Change trace states (`live` / `undone` / `changed`, `ChangeLog`) | session/changes.ts:109-175 | 3 derived | Ids (`c<n>`, `g<n>`) are allocated from an in-memory counter loaded once; two processes appending to the same `changes.jsonl` collide | PARTIAL |
| 14 | Setup/adoption ladder (`setupGaps` triple, `initProject` multi-write, rung classifier) | onboarding/path.ts:121-196; adoption/init.ts:66-168; onboarding/state.ts:23 | 8 + 5 | `initProject` writes theme -> config -> ledger with compensating undo only in-process; a kill between steps leaves a half-adopted project that `setupGaps` reports as a different "level" | PARTIAL |
| 15 | CheckCache receipt (`inputs.json` + generation files) | check-cache.ts:40-215 | 4 | Four non-atomic renames; old generations and old `checked/<key>` dirs are never deleted (unbounded disk growth) | PARTIAL |
| 16 | Vite source-stamping plugin (`config`, `disabled`) | hosts/source-stamping.ts:42-44,57-74 | 3 | `config ??= loadConfig()` caches a rejected promise (and a stale config) for the whole dev session | VERIFIED |
| 17 | `watchReports` client loop (`local`, `revision`, `lastError`) | session/client.ts:44-71 | 3 | Flips daemon<->local silently; re-creates a full local Session each time the daemon vanishes | PARTIAL |
| 18 | TTL memo caches (project-facts `contexts`/`facts`, `checkouts` memo) | project-facts/index.ts:79-92,207-216; project-facts/checkouts.ts:18,45-48 | 3 | 2 s TTL + mtime stamp: a change inside a nested folder is invisible for up to 2 s; maps grow with distinct roots/overrides | PARTIAL |
| 19 | CLI progress display (`worker`, `complete`, `visible`, `activePhase`, `percent`) | cli-progress.ts:26-197 | 4 | `process.exit(130)` from the SIGINT handler skips `await exited` (benign), progress worker errors swallowed | VERIFIED |
| 20 | Craft/probe browser sessions (`armed`, `hold`, route handlers) | craft-probe.ts:23-47; craft-run.ts:139-175; craft-page.ts:17-40 | 3 | Browser is closed in `finally`; retry loop in `open()` capped at 3. Low risk | PARTIAL |
| 21 | Readiness fix mutex (`applying`) | readiness/index.ts:254-278 | 2 | Process-local only; two CLIs can apply the same fix (guarded by the content hash, so safe) | VERIFIED |

Explicit machines found (labelled, not risks): see "Explicit machines" at the end.

---

## 1. Write attribution: `tag`, `undoing`, `transaction`  (VERIFIED)
**State lives:** `session/engine.ts:256` (`tag`), `:257` (`undoing`), `:933` (`transaction`), `:253-255` (`changeLog`, `nonce`).
**Variables:** `this.tag: {group, meta?} | undefined`, `this.undoing: ChangeRecord[] | undefined`, `this.transaction: boolean`.
**States:** (tag,undoing,transaction) = idle (U,U,F); traced write (T,U,F); undoChanges in progress (T,targets,F); applyAll (U,U,T); applyAll + traced write (T,U,T); undoChanges nested inside traced (T,targets,F with outer tag restored later).
**Transitions:**
- `traced()` entry -> `tag = {group,meta}` (engine.ts:1698-1699); exit -> `tag = previous` in `finally` (1701).
- `undoChanges()` entry -> `tag = {previous group...}` (1767-1768), `undoing = targets` (1769); error -> `undoing = undefined` (1784) then compensating `this.undo(...)` calls; exit -> `undoing = undefined; tag = previous` (1787).
- `record()` reads both: `group: this.tag?.group ?? this.log.group()`, `...(this.undoing ? {undoing: this.undoing} : {})` (1582).
- `applyAll()` -> `transaction = true` (929), `false` in `finally` (931). `progress()` emits only while `transaction` (935).
**Risks:**
- These are *instance* fields set before awaits and restored after. `undoChanges` and `traced` are **not** wrapped in `serialize()` (only the inner `rewrite()` takes the lock, engine.ts:850). Any write that slips in between two `rewrite()` calls of an in-progress undo (a second HTTP request, a timer-driven apply) is recorded with `undoing` set, so its changes get `undoes: [...]` and the trace reports the wrong changes as `undone`. Two overlapping `traced()` calls overwrite each other's `tag`, and the first to finish restores `previous` over the second's tag (LIFO assumption on non-LIFO async).
- `applyAll()` is not serialized (the guard is only inside each item), and `transaction` is a boolean, not a counter: apply A finishing sets `false` while apply B is still writing, so B's progress heartbeats stop and the Vite host's 5 s silence timer can release the page mid-write (see 4).
- The coordinator currently feeds engine methods one at a time (`drain`, coordinator.ts:27-62), which hides this; any other entry point (library `Session` from `engine.ts`, `many()` cohorts that call writes) exposes it.

## 2. Engine analysis-worker lifecycle  (VERIFIED)
**State lives:** `session/engine.ts:208` (`worker`), `:209` (`pending`), `:234` (`closed`), `:239-240` (`failure`, `failurePaths`), `:236`.
**Variables:** `worker`, `pending`, `id`, `closed`, `failure`, `failurePaths`, `healthSnapshot` (1831 `status: failure ? 'invalid' : 'ready'`).
**States:** CREATED (no worker) -> STARTING (worker spawned, `ready` not yet) -> READY -> RESTARTING (terminate then start) -> READY | INVALID(failure set) ; any -> CLOSED. Implied: READY-but-worker-dead (see risks).
**Transitions:**
- `create()` (259-272): `start()` -> `scan(true)` -> `request('inventory')` -> `observe()`; error -> `close()`.
- `start()` (284-317): throws if `closed` (285); spawns worker (287); `message.ready` populates sets and resolves (291-297); `message.startupError` rejects (306); `worker.on('error')` rejects ready AND rejects all pending (315); `exit` code!=0 rejects ready and, if not closed, pending (316).
- `scan()` restart branch (476-477): `broad || this.failure` -> `worker.terminate()`, `rejectPending`, `start()`; success -> `failure = undefined` (485); failure -> `failure = error; failurePaths = changed; throw` (487). No-change scan while `failure` set rethrows it (471).
- `close()` (1864-1868): `closed = true`, clear timer + debounce, close watchers, reject pending, terminate worker, `removeAllListeners`.
**Risks:**
- **Dead worker, no replacement.** After READY, a non-zero `exit` or `error` only calls `rejectPending` (315-316). `this.worker` stays the dead handle, `failure` stays undefined, health says `ready`, and the next `request()` (318-324) does `postMessage` to a terminated worker: the promise is never settled. Engine has no per-request timeout (only the host Session has one, and `patientMethods` are exempt, index.ts:73). Recovery needs a file change that also happens to be "broad".
- **Sticky `failure` without a retry trigger.** A restart that failed for a transient reason (OOM, EMFILE) leaves `failure` set; the next scan only retries when `changed.length`, otherwise it rethrows the old error (471). `refresh(true)` does not clear it.
- **close() vs restart.** `close()` while `scan` is between `terminate()` and `start()`: `start()` throws "Session is closed" (285), which is then stored as `failure` (487). Harmless but the error masks the real state. `close()` does not wait on `this.queue`, so in-flight serialized work continues until its next `request()` rejects.
- `rejectPending` on restart rejects requests that were legitimately started on the old worker with the message "Session inputs changed" (477) — callers see a spurious error rather than a retry.
- Leak: `message` listeners are added per `start()` on each new Worker (fine, worker is garbage) but `pending` is a single shared map across workers: a late message from a terminated worker whose id matches a *new* pending id would resolve the wrong request (ids are monotonic `++this.id`, so only if old messages are still in flight; low probability).

## 3. Host Session, HTTP route and framework registries  (VERIFIED)
**State lives:** `session/index.ts:24-25` (`closed`, `failure`), `:65-69` (`fail`), `session/server.ts:258` (`current`, `diagnostic`), `hosts/vite.ts:18` (`registry`), `hosts/next-state.ts` + `hosts/next.ts:17` (`shared.handler`).
**States (host Session):** STARTING (`snapshot.status='starting'`, index.ts:30) -> READY (`ready` message, 38-48) -> FAILED (`failure` set) | CLOSED.
**States (route, server.ts:258-322):** `current=undefined,diagnostic=undefined` = starting (503 `{status:'starting'}`); `current` set = serving; `diagnostic` set = failed-start (503 `failed` + readiness endpoints still answer, 320-323).
**Transitions:**
- `fail(error)` (index.ts:65-69): `failure = error`, rejects and clears every pending. Called from worker `error` (57) and from `exit` when not closed (58-60) and from `close()` (151).
- `call()` (73-): rejects immediately if `closed || failure` (74).
- Vite: `configureServer` creates an Entry once per option-signature (135-141); a **startup** failure deletes it (141); `dispose()` (19-25) closes when `owners.size==0 && restarting==0`; restart bookkeeping `restarting++/--` (155,158).
- Next: `shared.handler ??= import(...).then(handler)`; on import/start failure `delete shared.handler` (17-18).
**Risks:**
- A host Session that fails *after* startup (coordinator thread crash) is permanent: `failure` is never cleared, no restart exists. Vite's registry only evicts failed *startup* (141); the dead entry is handed to every later `configureServer` with the same options (135-136), including after `server.restart()`. Next never evicts after startup (the stored promise stays resolved). The overlay shows "failed" until the process is killed.
- In `createRoute`, `current` is never reset: a Session that has since failed still takes the "serving" branch and returns 500s from `call()`, never the readiness-only branch that would show the diagnostic.
- `Session.create` registers `exit` handler that calls `reject` after the promise has settled (no-op) — fine. `close()` is idempotent via `closed`.
- Next: the Session is never closed (no hook), so each dev server process leaks one coordinator + worker thread until exit; Next HMR re-evaluation relies on the `Symbol.for` global to avoid duplicates (next-state.ts).

## 4. applyAll transaction and Vite hot-update hold  (VERIFIED)
**State lives:** `hosts/vite.ts:48-98` (closure vars `held`, `released`, `hotServer`, `restarts`, `release`); engine side `session/engine.ts:925-935`.
**Variables:** `held: {files, modules, full, timer, ending?:{expected,timer}} | undefined`, `released: Map<file,{hash,until}>`, `engine.transaction`.
**States:** IDLE (held undefined) -> HOLDING (held, timer 5 s) -> ENDING (held.ending, timer 2 s) -> RELEASED (held undefined, `released` entries live 2 s as "echo" filters) -> IDLE. Event type is an explicit union `Transaction = start | progress | end` (vite.ts:11) but there is no table.
**Transitions:**
- `start` -> `releaseHeld()` then new `held` + 5 s timer (vite.ts:84).
- `progress` -> `alive()` resets 5 s timer only when `held && !held.ending` (82-83).
- `end` -> sends `plumb:applied` over HMR, creates `held.ending` with 2 s timer (88-93); releases at once if all expected files already seen (94).
- `hold()` (as file watcher events arrive): adds file/module; `held.full` if CSS theme (vite.ts:~97); releases when all expected seen.
- `releaseHeld()` (58-76): clears both timers, records `released[file]`, sends full-reload or per-module reload.
- Timer expiry -> `releaseHeld()`.
**Risks:**
- Overlapping applies (see 1): the 2nd `start` releases the 1st's held updates (reloads the page) and replaces `held`; the 1st's later `end` finds the 2nd's `held` and attaches `ending` to it, so the 2nd transaction is ended by the 1st's file list and released early while still writing.
- `end` arriving twice on one `held` overwrites `held.ending` without clearing the previous timer (leaks one 2 s timer; harmless).
- `released` map is only pruned when a file is looked up again (vite.ts:72-79), so it grows with every distinct released file.
- Transaction listener registration is async (`owned.session.then(s => s.on(...))`, vite.ts:143) and removal is async (`relinquish`, 145-146): during a server restart both the old and the new plugin closure can receive the same `end` and each send `plumb:applied`.
- If the host Session is FAILED (machine 3), no `end` ever arrives; the 5 s timer is then the only release path.

## 5. Reconciliation loop (watcher / poll / read barrier)  (VERIFIED)
**State lives:** `session/engine.ts:228-261`: `watchers`, `timer`, `debounce`, `refreshing`, `batchRead`, `reconciliations`, `queue`, `stamps`, `directories`, `directoryFiles`, `directoryChildren`, `patternRoots`, `patternsDirty`, `native`, `events`, `inventoryDirty`, `hashes`, `patternFiles`.
**States:** WATCH-NONE (watch:false) / WATCH-NATIVE (`native=true`) / WATCH-POLL-ONLY (native failed or `polling`), crossed with IDLE / REFRESHING (`refreshing` promise) / IN-BATCH (`batchRead=true`) / DIRTY (`events`/`inventoryDirty` pending).
**Transitions:**
- `observe()` (493-506): native `watch(root,{recursive})` sets `native=true` (502); the handler adds to `events`, resets a 5 ms `debounce` and calls `refresh()`; watcher `error` -> `native=false; inventoryDirty=true; watchers[0].close()` (503). A 250 ms `setInterval` always calls `refresh()` (506) in addition.
- `refresh(full)` (518): single-flight via `refreshing`, cleared in `finally`.
- `reconcile()` (508-517): loops `while (query===undefined && native && (inventoryDirty || events.size))`.
- `scan()` (413-488): reads `events`, clears them at start (420), does a full inventory when `initial || full || inventoryDirty` (421-424), else targeted.
- `batch()` (522-526): under `serialize`, `reconcile(query)` then `batchRead = true` ... `finally batchRead=false`. `serializeRead` (519) bypasses the lock when `batchRead` is true.
- `many()` (661-671) saves/restores `wasBatch` locally.
**Risks:**
- `batchRead` is session-global and disables mutual exclusion for *anyone* who calls `serializeRead` while it is true. Safe today only because the coordinator drains one cohort at a time.
- `refresh(full=true)` while a non-full refresh is in flight returns the in-flight promise (518), dropping the "explicit recovery" request; no queued follow-up.
- After the native watcher errors it is never re-created (503): the machine degrades permanently to poll mode, `watchers[0]` stays in the array (closed again at 1867, idempotent).
- Events are "never evidence" (comment at 441) so a missed event is recovered by the 250 ms poll; but when `polling` is off AND native fails to start (`catch {}` at 504) `native` stays `false` while the poll timer still runs: OK. When `options.watch === false` there is *no* timer, so `failure`/restart only happen on explicit reads.
- `close()` clears `timer` and `debounce` but does not await an in-flight `refreshing`; a refresh finishing after close calls `this.emit('change')` on a session whose listeners were removed (harmless).

## 6. Census reader pool  (VERIFIED)
**State lives:** `census.ts:58` (`taken`), `:53` (`queue`, `seen`), `routes`/`entries` arrays, two concurrent `reader()` coroutines (85).
**States per reader:** FETCH-ROUTE -> LOADING -> EXTRACTING -> (loop) | WAITING (queue empty but other reader busy) | DONE (`taken >= max` or queue empty and `taken == routes.length`).
**Transitions:** `taken++` before navigation (66); on goto failure `routes.push` then continue (67); on success `routes.push` after `evaluate(readPage)` (72); empty queue -> sleep 200 ms while `taken - routes.length > 0` (64).
**Risks:**
- Any throw between `taken++` (66) and `routes.push` (72) (e.g. `page.evaluate` rejecting because the page crashed or navigated) skips the `routes.push`. The throwing reader exits via `finally page.close()`; `Promise.all` rejects and `browser.close()` runs (85), but the *other* reader is in the 200 ms sleep loop (64), never touches the browser, and `taken - routes.length` is permanently > 0: an unref'd-less timer loop keeps the Node process alive after the error is reported.
- `queue.unshift(route); return` on `taken >= max` (65) leaves that route unread but not counted in `left` accurately if both readers race on the same boundary (PARTIAL: not traced further).

## 7. Generation-keyed caches in the engine  (VERIFIED)
**State lives:** `session/engine.ts:214-215` (`pageCache`, `pageGeneration`), `:218` (`unitKept`), `:220` (`recipeProject`), `revision` (247).
**States per entry:** ABSENT -> FRESH (generation == current and file hash == stored) -> STALE (generation moved or hash moved) -> evicted.
**Transitions:** `scan()` success bumps `revision++` and `pageGeneration++` (486); `page()` reads (622) / writes (651); `rewrite()` sets `recipeProject = undefined` (867); `recipeContext` keeps/compares (820-835); `spacingUnit()` stores with the generation captured *before* the read (1793-1795).
**Risks:**
- `page()` is not serialized. It issues three separate cohorts: `resolveSource` (627), `site` (636), `classes` (637). A refresh/write can run between cohorts. The entry is then stored at 651 with `generation: this.pageGeneration` and `hash: this.hashes.get(path)` read at store time, i.e. the *newest* values, although `site`/`classes` data came from older cohorts: a stale answer is cached as fresh. The comment at 626 ("every item sees one revision") is only true within one cohort.
- `pageCache` eviction (653) drops the oldest 4096 insertion-ordered entries when over 16384, not LRU.
- `spacingUnit()` is correct (captures generation first) — contrast with `page()`.
- `recipeProject` is a single slot: alternating requests for two different files thrash it (index rebuilt each time, counted in `recipeIndexes`).

## 8. Ledger entry lifecycle  (PARTIAL)
**State lives:** persisted `.plumber/ledger.jsonl` (`ledger/store.ts:7-31`), entry field `kind` (`ledger/types.ts:5`: `'debt' | 'exception' | 'decision' | 'declined'`), marker file `.baseline-pending` (`ledger/commands.ts:83`), derived per-site `ledger.status` `'new'|'debt'|'exception'` (`ledger/check.ts:61`), `stale`/`growth` counters.
**Writers:** `ledgerCommand` (baseline / accept / accept-decisions / ledger --rebase/--ratchet/--prune) `ledger/commands.ts:85-142`; `declineValues` `onboarding/decline.ts:12-28`; `initProject` `adoption/init.ts:156-162`; engine `accept` (`session/engine.ts:909-914`).
**Transitions:**
- (absent) -> debt: `baseline` (`commands.ts:85-92`), `init` (init.ts:143-153, approx.).
- debt -> exception: `accept` replaces by key with `kind:'exception', why` (`commands.ts:103`).
- (absent) -> decision: `acceptSet` (`commands.ts:23-37`, `init.ts:131-132`); decision unchanged -> skip (32).
- (absent) -> declined: `declineValues` (`decline.ts:24-25`).
- debt -> (removed) via `--ratchet` when count drops to 0 (`commands.ts:134-137`); any -> removed via `--prune` (139); key renamed via `--rebase` (`commands.ts:119-132`).
- Derived: debt entry with fewer sites than recorded -> `ledger/stale` warning (`check.ts:35-39`); more sites than allowed -> extra sites `new`; exception w/o `why` -> `ledger/no-why` error (`check.ts:34`).
- `readLedger().exists` is `false` for a ledger containing only `declined` entries (store.ts:30), i.e. a hidden fifth state "declined-only = no baseline".
**Risks:**
- **Lost update.** Every writer does read-all -> modify -> `writeLedger(all)`. `atomicWrite` makes the *file* atomic, not the sequence. The engine `accept` loop runs `ledgerCommand` once per key (`engine.ts:910-912`) under the engine lock, but `plumber propose --decline`, `plumber baseline`, or `init` in another process can interleave and overwrite.
- **Marker never created.** `.baseline-pending` is read in `baseline` (`commands.ts:88`) and removed by `baseline` (141) and `init` (init.ts:162), but nothing in `src/` writes it. Either an external tool creates it (not found in `overlay/src`), or the "pending baseline" state is dead code and the "refuses debt growth" guard cannot be bypassed on a first adoption except by `--force`. I could not find the creator.
- `entry.inferred` and `kind` on disk: a ledger written by a future version with another `kind` value makes `parseLedger` throw (`store.ts:20-21`) and every consumer (session startup in `worker.ts:355`, doctor) fails hard. No migration path.
- `ledger/check.ts` growth detection (~L18-19, not re-verified) compares `kind` between HEAD and working tree: a `debt` -> `exception` flip is "grew" for strict mode (confidence PARTIAL; did not read all of check.ts).

## 9. Write history, batches and undo  (PARTIAL)
**State lives:** `session/engine.ts:249-251` (`written`, `batches`, `writes`), `:253-258` change log.
**Variables:** `written: Recorded[]`, `batches: Map<id,{label,members}>`, `writes` counter, `historyLimit` (20).
**States per write:** RECORDED -> (in batch) BATCHED -> UNDONE (removed) | EVICTED. Per batch: whole -> partial (after failed member undo) -> removed.
**Transitions:** `record()` (1573-1585) pushes and evicts; `evict()` (1588-1596) drops oldest including its whole batch; `asOneWrite()` (1603-1608) creates batch and may evict; `undoOne()` (1642-1672) refuses unless on-disk hash == `hashAfter`, writes `before`, removes from `written`, drops trace records; `undoBatch()` (1675-1690) pre-checks every file, undoes newest-first, keeps unreached members in `finally`.
**Risks:**
- History is in memory in the engine only: lost on any engine/worker restart or `close()`; undo by id then says "not in the history" while the on-disk trace (machine 13) still lists the change. Two parallel undo mechanisms (`undo(id)` vs `undoChanges(ids)`) with different stores and different ids.
- `evict()` can drop a batch's members while the newest write handle returned to the caller (`asOneWrite`) was already evicted by its own `evict()` call (1607) if the batch itself is older than 20 writes: the returned undo handle is dead on arrival (low probability).
- `undoOne()` calls `reconcile([file])` twice around the write (1645, 1667) and the final `snapshot.hash !== this.hashes.get(file)` check can throw after the file was already restored: state (disk restored, `written` already filtered at 1665, trace dropped) is consistent but the caller sees an error.

## 10. Analysis worker dirty flags  (VERIFIED)
**State lives:** `session/worker.ts:34-42,64`: `raw`, `classified`, `revision`, `dirty`, `sharedDirty`, `metadataDirty`, `metadataFull`, `localReports`, `ledger`, `queryChanges`.
**States:** CLEAN (dirty F, shared F) | LOCAL-DIRTY (T,F) | SHARED-DIRTY (T,T) | LEDGER-ONLY (classified cleared, dirty unchanged) | impossible-but-reachable (F,T) if `state.prepare` throws between lines 76 and 79.
**Transitions:**
- `update(paths)` (worker.ts:67-91): ledger path -> reload ledger (69); other paths -> `sharedDirty ||= touches sharedInputs` (76), `prepare()` then `dirty = true` (79), `metadataDirty = true` (80), `sharedDirty ||= changedSharedStyles || signature changed` (82); always `classified = undefined; revision++` (89).
- `current()` (91-94): if `dirty` -> full `analyze`, then `dirty=false; sharedDirty=false; localReports.clear(); metadataDirty=metadataFull=true` (92).
- `localReport(file)` (213-226): returns full report when `!dirty || sharedDirty` (214); else per-file Focus analysis cached in `localReports`.
- message loop (352-366) serialises through `queue`, resets `metadataDirty/metadataFull/queryChanges` only after a successful post (363).
**Risks:**
- `(dirty=false, sharedDirty=true)` is reachable when `prepare` throws (line 79 after 76); `decisions`/`spacingUnit`/`spec` (325-335) take the `sharedDirty ? current() : raw` branch, and `current()` is a no-op because `dirty` is false, so they would return a stale `raw`. Masked because the engine marks `failure` and restarts the whole worker (engine.ts:477), but nothing in the worker enforces it.
- `metadataDirty` is cleared only after a successful `postMessage`; an erroring call leaves it set, so the next success carries the union — fine. `queryChanges` can grow unbounded across long error streaks.
- `classified = undefined` on every update, including ledger-only (89): cheap but means ledger view is rebuilt per update (intended).
- `fullReports`/`localAnalyses` counters are global; health reports them (362).

## 11. Serve daemon and discovery file  (PARTIAL)
**State lives:** `session/server.ts:405-455` (`serve()`), `serve.json` under `.plumber/` (`session/discovery.ts:3-19`), closure `closed` (448).
**States:** NO-DAEMON -> STARTING (Session.create) -> LISTENING (port bound, `serve.json` written via `atomicWrite(... exclusive)` 446) -> CLOSING (`closed=true`, connections closed, server.close, session.close) -> NO-DAEMON (discovery removed only if token matches 452).
**Transitions:** startup guard reads `serve.json`, if pid alive -> refuse (412-414), else `rm` stale (415); port search loop (436-438); stdio mode `serveStdio` (457-479) with `lines.close()` in `finally`.
**Risks:**
- Liveness is `process.kill(pid, 0)`: a recycled PID keeps a stale `serve.json` alive-looking forever ("already running") until the user deletes it; EPERM is treated as alive.
- `options.page` skips both the guard and the discovery file (409, 444-445): any number of page daemons can run on one project, each with its own warm Session, all appending to the same `changes.jsonl` and `ledger.jsonl` (machines 8 and 13).
- `close()` ordering: `closeAllConnections` -> `server.close` -> `session.close()` -> remove discovery; if `session.close()` throws, the discovery file is never removed (stale file for a dead pid; next start cleans it).
- SIGINT/SIGTERM handlers added in `cli.ts:400` and removed inside `stop`; with `--watch` `cli.ts:379-380` removes them in `finally`. OK.

## 12. Coordinator admission queue  (PARTIAL)
**State lives:** `session/coordinator.ts:9-10,27-66` (`queue`, `running`), host `session/index.ts:20,70-84` (`pending` with timers).
**States per call:** QUEUED-HOST (timer armed) -> QUEUED-COORDINATOR -> STARTED (host timer cleared on `started`, index.ts:51) -> DONE | BUSY (deadline passed, either side).
**Risks:**
- After `started`, there is no timeout: a hung engine method blocks `drain` (one `running` flag) and every later call waits until its own 5 s deadline, then is answered `busy`. Recovery depends on machine 2.
- The host timer deletes `pending[id]` on expiry (78) but the call stays in the coordinator queue; it is dropped there by the deadline check (`execute` L19 / `drain` filter) — correct, but the coordinator replies `busy` to an id the host no longer knows (ignored, index.ts:50).
- `drain` re-entrancy: guarded by `running`; `setImmediate` per message (66) can schedule many no-op drains.
- Queue cap 512 on both sides (index.ts:75, coordinator.ts:65): a burst of 512 hover reads starves a write (no priority).

## 13. Change trace states  (PARTIAL)
**State lives:** persisted `changes.jsonl` (`session/changes.ts` `ChangeLog`, `records`, `next`, `groups`); derived `ChangeState = 'live'|'undone'|'changed'` (changes.ts:30, computed in `trace()` 152-).
**Transitions:** `add()` appends records (~123-141; rewrite when > `LIMIT` 2000, line 139); `drop()` removes records of a file-level undo (~143-148); `trace()` (152-) classifies newest-first: undone if a later non-undone record `undoes` it, live if `locate()` still finds it, else changed.
**Risks:**
- Ids `c<n>` and groups `g<n>` come from counters initialised once from the file (`all()` ~114-119) and incremented in memory. Two sessions (see 11) or a worker restart racing another process produce duplicate ids; `appendFileSync` has no lock.
- `LIMIT` trimming (128) drops oldest records, which can turn an `undone` change into `live`/`changed` (its undoer is gone) or orphan an `undoes` reference.
- `undone` is recursive on the undoer's state (`states.get(u.id)?.state !== 'undone'`): re-undo of an undo is supported; cycles impossible because ids ascend.

## 14. Setup / adoption ladder  (PARTIAL)
**State lives:** derived, no stored enum: `setupGaps` (`onboarding/path.ts` ~129-137), `ProjectState.rung` (`onboarding/state.ts:23`, R0..R4, computed at 248/371), `initProject` locals `undoTheme`, `written` (`adoption/init.ts:66-168`), `readiness` capabilities (`readiness/index.ts:245-250`).
**Setup triple states:** (devConfig, config, state) each boolean gap -> 8 combos; `isSetUp` requires all clear (path.ts:138). Reachable partial: dev config without config; config without ledger ("state" gap) is handled specially in `setUp` (path.ts:174-195).
**Transitions (init):** `loadConfig` guard (68) -> scratch config -> optional `applyTheme` (theme written; `undoTheme` captured 118) -> write config (`writeFile 'wx'`/`'w'`, 158) -> `writeLedger` (159; on error restore/remove config 160) -> `undoTheme = undefined` (161), remove `.baseline-pending` (162). Outer `catch` runs `undoTheme` (168).
**Risks:**
- Compensation exists only in-process. A kill after theme write and before ledger write leaves a changed theme (tokens "proposed") with no config and no ledger: `setupGaps` reports `config: true, state: true` gaps, and a re-run proposes the same tokens again but `planTheme` filters already-declared names (`write.ts:99`), so it quietly yields a smaller plan.
- `terminalAsker` (`onboarding/ask.ts:17-35`) holds `lines`, `waiting`, `ended`; `ask()` after `ended` returns `''` = "yes" (Enter semantics), so a closed stdin accepts every default silently (intended for CI, but it is also what a dropped pipe does).
- `readState` is a pure function of evidence; rung "R0" is returned from an error path (248) — nothing persists it, so no migration risk.

## 15. CheckCache receipt  (PARTIAL)
**State lives:** `check-cache.ts:40-45` (`generation`, `selected`), on disk `checked/<key>/inputs.json` + `<generation>.v8|.json|.status.json`.
**States:** NOT-ADMITTED (`create` returns undefined for non-data configs / git scope, 53-58) -> ADMITTED (key from build id + config text + options, 77-79) -> MISS / HIT (`hit()` 100-127 sets `generation`) -> SAVED (`save()` 129-215).
**Transitions:** `save()` aborts silently when `before != after` snapshot (133) or any stamp changed mid-save (186); publishes via 4 sequential `rename`s ending with `inputs.json` (211-214).
**Risks:** crash between renames leaves generation files without a receipt (harmless) but `.tmp-` dirs may remain; old generation files and old `checked/<key>` dirs (key includes `buildId()`, so every rebuild orphans a dir) are never pruned.

## 16. Vite source-stamping plugin  (VERIFIED)
`hosts/source-stamping.ts:42-44` `config`, `disabled`. `configResolved` resets `config = undefined` and computes `disabled` (46-54); `transform` does `await (config ??= loadConfig(...))` (68). A rejected `loadConfig` promise is cached forever (every later transform rethrows) and a config edited during the dev session is never re-read (reset only on `configResolved`, i.e. a Vite restart).

## 17. `watchReports` client loop  (PARTIAL)
`session/client.ts:44-71`: `local`, `revision`, `lastError`. Modes DAEMON (health answered) / LOCAL (own Session) / ERROR. Switching DAEMON -> LOCAL when the daemon disappears builds a full `Session.create` per watch (cold start each time the daemon restarts); LOCAL -> DAEMON closes the local Session (62). `lastError` dedups messages only. Cancellation via `AbortSignal`, local Session closed in `finally` (69).

## 18. TTL memo caches (project-facts)  (PARTIAL)
`project-facts/index.ts:79` `contexts` (stamp = mtimes of folder and `package.json`), `:88` `facts` (also `ttl = 2000`, `:207-216`), `project-facts/checkouts.ts:18,45-48`. Invalidation by `forgetProjectFacts()` which the engine calls from `refresh()` (engine.ts:518). A rejected promise is deleted (`entry.pending.catch(() => facts.delete(key))`). Maps are unbounded across roots/override signatures; stamp only sees the folder's own mtime, not nested edits, so nested changes can be missed for the 2 s TTL.

## 19. CLI progress display  (VERIFIED)
`cli-progress.ts`: `withCliProgress` creates a worker lazily on the first progress event (46); `active` is a SharedArrayBuffer flag set to 0 on stop/interrupt. States: DISABLED (non-TTY/CI/json) / ARMED / DRAWING / STOPPED. `percent` is monotonic (`Math.max`, L155) and gated by `activePhase`. Cleanup: `finally` posts `{stop,complete}`, awaits `exited`, removes SIGINT handler. SIGINT handler writes erase sequence synchronously and `process.exit(130)` (cli-progress.ts:53-57) — no graceful shutdown of anything else.

## 20. Craft/probe browser sessions  (PARTIAL)
`craft-probe.ts:23-47` per-session `state {armed, hold, fetches}`: NOT-ARMED (page open, navigation allowed) -> ARMED (navigations and non-GET fetches aborted). `craft-run.ts` opens one browser, one page per route, closes both in `finally` (203). `craft-page.ts:open()` retries up to 3 on "context destroyed". No leaks found; the pair/probe pages are in contexts closed by `finally`.

## 21. Readiness fix mutex  (VERIFIED)
`readiness/index.ts:254-278`: module-level `Set<root>`; add before work, delete in `finally`. Prevents in-process double apply; cross-process safety comes from comparing the file hash before the write (L267-273) and `atomicWrite`.

---

## Explicit machines found (for reference; labelled as explicit)
- **Rung ladder** `Rung = 'R0'..'R4'` plus `Flag` union and `rungNames` table (`onboarding/state.ts:23-25`). Explicit enum, derived each call, not persisted.
- **Ledger kind** `'debt' | 'exception' | 'decision' | 'declined'` (`ledger/types.ts:5`), validated on read (`ledger/store.ts:20`). Explicit state set, implicit transition table (spread over `commands.ts`).
- **Per-site ledger status** `'new' | 'debt' | 'exception'` (`report.ts:26`, assigned `ledger/check.ts:61`). Explicit, derived.
- **Change state** `'live' | 'undone' | 'changed'` (`session/changes.ts`), derived by `ChangeLog.trace`.
- **Transaction events** `Transaction = start | progress | end` (`hosts/vite.ts:11`). Explicit event type, implicit state.
- **Health status** `'starting' | 'ready' | 'invalid' | 'failed'` (`session/index.ts:30,146`, `session/engine.ts:1832`, `session/worker.ts` `health`), strings spread over three layers; no shared type.
- **Progress phase table** `steps: Record<phase,[from,to]>` and the `switch (message.phase)` (`cli-progress.ts:83-196`). Explicit lookup table.
- **Capability status** `'full' | 'degraded' | 'off' | 'unknown'` and requirement status ok/missing/unknown (`readiness/index.ts:42,245-250`). Explicit, derived.
- **Worker message protocol** (`ready`, `startupError`, `started`, `busy`, `error`, `result`, `event`) in `session/index.ts:38-56` and `session/coordinator.ts`: explicit message kinds, no declared state diagram.

## Not examined in depth (PARTIAL coverage disclosed)
Only lifecycle-bearing fields were traced in the 1871-line `session/engine.ts`; the individual write planners (`session/props.ts`, `class-site.ts`, `text-at.ts`, `recipes/*`) were not read line by line. `ownership/cache.ts`, `collect/modules.ts` (`modules/*.json` receipts, last-writer-wins `atomicWrite` at L129) and `lower/tailwind.ts` (`TailwindMemory`, cleared past 4096 entries at `session/state.ts` `phase('tailwind')`) are persisted/process caches in the same family as CheckCache but their invalidation was not audited.
