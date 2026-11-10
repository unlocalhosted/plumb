# Engine owners under the state oracle (layer 6, config-bound)

2026-11-07, branch `state-oracle`. Nothing under `src/` was edited: another session owns `src/session/engine.ts` and
`src/hosts/vite.ts`. The engine's machines are declared as **sidecars** (`.state/machines/*.json`, oracle spec §13, §14)
and `.state/config.json` says `"mode": "both"`. The oracle reads the code's own writes where they stand.

Audit rows this covers: `engine.md` #2 (analysis-worker lifecycle) and #4 (apply-all transaction and the Vite hold).

Second pass (oracle `0.3.0`, spec §14): the one product table `engine-session` of the first pass is now **three
machines**, two on `Session` and one on the Vite host's `plumb()` closure, which the oracle could not bind before.

## What is declared

### `engine-worker`: the analysis-worker lifecycle, flag form on `Session`

| flag | kind | line | meaning |
|---|---|---|---|
| `lost` | nullable | 259 | set once the current worker exited while the Session was open |
| `starting` | nullable | 260 | the shared promise of a worker boot in flight |
| `closed` | boolean | 253 | `close()` ran |

| state | lost | starting | closed | events |
|---|---|---|---|---|
| `running` (initial) | null | null | false | `request → running`, `exited → lost`, `inputsChanged → lost`, `close → closed` |
| `starting` | null | set | false | `booted → running`, `exited → lost`, `close → closed` |
| `lost` | set | null | false | `request → starting`, `inputsChanged → starting`, `close → closed` |
| `closed` | null | null | true | final |

`cancel: ["close"]`.

### `engine-transaction`: the apply-all transaction, flag form on `Session`

| flag | kind | line | meaning |
|---|---|---|---|
| `transaction` | boolean | 958 | an apply-all is writing (the host holds hot updates meanwhile) |

| state | transaction | events |
|---|---|---|
| `idle` (initial) | false | `apply → applying` |
| `applying` | true | `applied → idle`, `failed → idle`, **`apply → applying`** |

The self-row `applying.on.apply → applying` is deliberate: it is what `applyAll` (947–957) does today when called while
one runs (finding 2 below). The table says what the code does; the row is the place a fix would change.

### `vite-hold`: the hot-update hold, flag form on `plumb()`'s closure variable `held`

| binding | | |
|---|---|---|
| `binding.function` | `plumb` | the factory in `src/hosts/vite.ts:37`; its `let`s are the fields (spec 14.2) |
| flag `held` | nullable | `vite.ts:52`: `undefined` between transactions, a `Held` while one apply-all writes |

| state | held | events |
|---|---|---|
| `idle` (initial) | null | `start → holding`; ignores `end`, `progress`, `seen`, `silence`, `relinquish` |
| `holding` | set | `start → holding`, `progress → holding`, `seen → holding`, `end → idle`, `silence → idle`, `relinquish → idle` |

`cancel: ["relinquish"]` (the server closing or restarting; `relinquish` at `vite.ts:132` releases whatever is held).
Events in code: `start`/`progress`/`end` are the engine's `transaction` phases (`onTransaction`, 83–95); `seen` is a
watcher report of a held file (`hold`, 96–106); `silence` is the five-second timer (82, 84).

`held.ending` (the "writes are done, waiting for the watcher" sub-state) is a depth-two write the oracle does not read
(spec 13.4), so `holding` covers both halves. Honest limit, not a gap in the table.

## The check

```
$ npm run sm -- check            # whole repo, baseline applied
summary: { error: 0, advice: 2 }, suppressed: 20, exit 0
advice  .state/machines/engine-transaction.json:4  sm/machine-token-missing  `Session` has async work but no flight token.
advice  .state/machines/vite-hold.json:4           sm/machine-token-missing  `plumb()` has async work but no flight token.
$ npm run sm -- check --no-baseline --no-cache     → 20 errors, exactly the baseline's 20 keys; 2 advice
$ npm run sm -- gaps                               → findings: []
$ npm run sm -- list                               → cleanup, engine-transaction, engine-worker, fix-panel, text-edit, vite-hold (function: plumb); invalid: []
$ npm run sm -- on engine-transaction applying apply   → to applying
$ npm run sm -- on vite-hold holding start             → to holding
$ npm run sm -- on vite-hold holding silence           → to idle
$ npm run sm -- on vite-hold idle end                  → ignored
$ npm run sm -- paths vite-hold holding                → [start: idle → holding]
```

One token advice per **owner** (spec 14.1), not per sidecar: `Session`'s two machines share one note.

Timing (`/usr/bin/time -p node ../oracle/src/bin.mjs check <file> --no-log`, one run each, load average about 6):
`src/session/engine.ts` 0.06 s warm, 0.17 s `--no-cache`; `src/hosts/vite.ts` 0.05 s warm, 0.07 s `--no-cache`; whole
repo (260 files + 3 sidecars) 0.08 s warm. Cached, `--no-cache`, and cached-again `check` outputs are byte-identical
(`cmp`).

**Positive controls** on temp copies of the real files (so a clean answer means something):

- `vite.ts` with `let held` hoisted out of `plumb()` to the module: `` error .state/machines/vite-hold.json:4
  sm/machine-field-missing — `plumb()` has no field `held` ``. The binding is to the function's own scope; a same-named
  `let` outside it is another variable.
- `engine.ts` with `close()` also setting `this.lost = new Error(…)`: `` advice src/session/engine.ts:1848
  sm/flags-combination engine-worker — After this write the flags are `lost = set`, `closed = true`, a combination no
  state of `engine-worker` has. `` The walk over `Session` happens, and the finding names the machine whose fields moved.
- `engine.ts` with `close()` also setting `this.transaction = true` (the first pass's control): **nothing reported**.
  The product table had no row for `closed = true, transaction = true`; the split tables are each a projection of one
  concern, and a one-flag table fits any value of its flag. The split trades that cross-concern check for two tables
  that say what each concern does. Accepted, and written here so nobody reads the silence as proof.

## Findings and verdicts

### 1. The dead worker (audit #2): fixed by `0d6e39f`; `engine-worker` matches the code

Unchanged from the first pass, now on its own table. The same sidecar against `git show 0d6e39f^:src/session/engine.ts`
fails to bind (`` `Session` has no field `lost` ``, `` no field `starting` ``): before the fix the class had no field
that could hold "the worker is gone", which is the bug itself. At HEAD every write to the three flags fits a state.
`sm paths engine-worker starting` → `exited: running → lost`, `inputsChanged: lost → starting`.

Verdict: **not a bug**; the fix holds.

### 2. Overlapping applies (audit #4): reachable at the engine API, unreachable through every host; now a row in two tables

`applyAll` (947–957) is not wrapped in `serialize()` (361) and does not read `transaction` before writing it. The
transaction table says so: `sm on engine-transaction applying apply → to applying`. On the Vite side the hold table
says what that second `start` does: `sm on vite-hold holding start → to holding`, and the code behind the row
(`onTransaction`, 84) is `releaseHeld(); held = {…}`: the first apply's held files are released, and the page reloads,
while that apply is still writing; the first `finally` (956) then sets `transaction = false` under the second, which
silences `progress()` so the five-second timer (82) can release the second mid-write too.

Why no host can trigger it: every shipped path (HTTP route, MCP, CLI, the Vite plugin's owned session) goes through the
host `Session` (`src/session/index.ts:122`) and the coordinator, which executes a non-read call alone (`await
execute(call)`, `src/session/coordinator.ts:32`); `apply-all` is `post: true` (`src/session/methods.ts:57`). Only a
direct `import { Session } from 'dist/session/engine.js'` caller (tests, library users) can overlap two applies.

What the oracle says: the two rows above, both reachable (`gaps` is clean because the tables close; the overlap is a
legal transition, not a gap). What it cannot say: that the row is *wrong*. The flag form checks combinations, never a
write's source state, and `transaction = true` with nothing else known fits `applying`. Seeing this one as an error
needs either a guard the oracle can read (`if (this.transaction) throw …`, which would make `applying.on.apply` a
refusal and the self-row would go) or the field form on a phase field.

Verdict: **real, low severity, not fixed here** (`src/` is the other session's). The fix belongs in the engine: either
`applyAll` runs under `serialize()` like every other write, or it refuses a second apply while `transaction` is set.
Either edit removes the `apply → applying` self-row from `engine-transaction` and leaves `vite-hold`'s `start →
holding` reachable only from `idle`. Audit #4's other notes (a second `end` on one `held` leaks a 2 s timer; `released`
grows until a file is looked up again) are unchanged and outside a sidecar's reach.

### 3. A reload mid-write by silence (audit #4): reachable by design, bounded

`sm on vite-hold holding silence → to idle`: after five seconds without a `progress` or `seen`, `releaseHeld()` fires
(82, 84) and the page reloads with whatever was held. The code comment (45–50) says why: the engine reports progress at
every item and every write (`progress()`, 960, called from `applyEach`), so a *healthy* long apply never goes silent;
the timer is for a transaction that died without its `end`. The gap between the two: one item whose own work takes over
five seconds with no write inside it (a very large file's rename-and-verify, a stalled disk) releases the hold mid-apply.
The engine's `end` still arrives afterwards and finds `held` undefined (`if (!held) return`, 90), so nothing breaks; the
page just reloads once more than it should.

Verdict: **not a bug**; a documented trade-off whose edge is now a named row. If it ever bites, the lever is the engine
sending `progress` on a timer during a long item, not the host's timeout.

### 4. `sm/machine-token-missing` (advice, two owners): sidecar limit, not a bug

`Session` awaits in many methods and matches results by `pending` id; `plumb()`'s `hold` and `echo` are async and keep
nothing to compare a late result to. Neither has one field a result compares itself to, so neither names a `token`.
Advice, exit 0, says what is not checked. Left as is.

## Baseline

Unchanged (20 keys). The two new findings are advice; `baseline write` keeps error-level keys only (oracle build note
32). Finding 2 is not an oracle error (a legal row, by the code), so it is not in the baseline either: it lives here, as
a row for the engine's owner.

## Tests

Not run. `node --test e2e/worker-crash.test.mjs` and the three `e2e/apply-all-*.test.mjs` need `dist/` and more free
memory than the machine had (about 2.5 GB unused with 2.1 GB of swap in use). `src/` is unchanged by this layer, so they
are a sanity check only; `0d6e39f`'s own message records them green one file at a time.

## Limits found in the oracle (first pass), and what became of them

- *A sidecar cannot bind closure state.* Lifted: `binding.function` (oracle spec 14.2); `vite-hold` is the proof.
- *One machine per owner means two concerns on one class share a table.* Lifted: an owner holds any number of machines,
  each on its own fields (spec 14.1); what two machines may not share is a field, a send, or a token name. Cost seen
  above (controls): the product table's cross-concern combination check is gone with the product table.
- *The flag form cannot say "this write has no guard".* Still true (finding 2). The field form can; the engine has no
  phase field to bind it to.
