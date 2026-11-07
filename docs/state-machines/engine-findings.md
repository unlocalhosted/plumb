# Engine owners under the state oracle (layer 6, config-bound)

2026-11-07, branch `state-oracle` at `fa9ae7c` (which carries `0d6e39f`, the merge of the four engine fixes).
Nothing under `src/` was edited: another session owns `src/session/engine.ts` and `src/hosts/vite.ts` on
`explicit-machines`. The engine's machine is declared as a **sidecar** (`.state/machines/engine-session.json`, oracle
spec §13) and `.state/config.json` now says `"mode": "both"`. The oracle reads the code's own writes where they stand.

Audit rows this covers: `engine.md` #2 (analysis-worker lifecycle) and #4 (apply-all transaction and the Vite hold).

## What is declared

One sidecar, `engine-session`, flag form, bound to `Session` in `src/session/engine.ts`:

| flag | kind | line | meaning |
|---|---|---|---|
| `lost` | nullable | 259 | set once the current worker exited while the Session was open |
| `starting` | nullable | 260 | the shared promise of a worker boot in flight |
| `closed` | boolean | 253 | `close()` ran |
| `transaction` | boolean | 958 | an apply-all is writing (the host holds hot updates meanwhile) |

Five states (every write in the class fits one):

| state | lost | starting | closed | transaction | events |
|---|---|---|---|---|---|
| `running` (initial) | null | null | false | false | `request → running`, `exited → lost`, `inputsChanged → lost`, `apply → applying`, `close → closed` |
| `starting` | null | set | false | false | `booted → running`, `exited → lost`, `close → closed` |
| `lost` | set | null | false | false | `request → starting`, `inputsChanged → starting`, `close → closed` |
| `applying` | null | null | false | true | `applied → running`, `failed → running`, `exited → lost`, `close → closed` |
| `closed` | null | null | true | false | final |

`cancel: ["close"]`. `sm gaps engine-session` → no findings (every state handles `close`; every state has a way home).

**Why one machine, not two.** The brief asked for two: the worker lifecycle and the apply-all hold. The oracle allows one
machine per owner (spec 1.3, `sm/machine-owner-duplicate`), and both live on `Session`. The hold's own state (`held`,
`held.ending`, `released`) sits in closure variables inside `plumb()` in `src/hosts/vite.ts:52`, and a sidecar binds a
class field or a module-level `let` only (spec 2.5, 13.2), so the Vite side cannot be declared without a code change.
The engine's `transaction` flag is the one projection of the hold the oracle can reach, so it joined the lifecycle
table as the `applying` state. The flags are a projection: `applying` while the worker is `lost` (a crash mid-apply,
`transaction = true` until `applyAll`'s `finally`) is a passing moment the table has no row for, and the oracle does not
report it because the exit handler writes `lost` alone and knows nothing of `transaction` (spec 13.5's stated limit).

## The check

```
$ npm run sm -- check            # whole repo, baseline applied
summary: { error: 0, advice: 1 }, suppressed: 20, exit 0
advice  .state/machines/engine-session.json:4  sm/machine-token-missing
        `Session` has async work but no flight token.
$ npm run sm -- gaps engine-session   → findings: []
```

Timing for the engine file (`node ../oracle/src/bin.mjs check src/session/engine.ts`, `/usr/bin/time`): 0.05 s warm,
three runs; 0.11 s `--no-cache`. Whole-repo `check` (260 files plus the sidecar): 0.38 s warm.

**Positive control** (so a clean answer means something): a temp copy of HEAD with one line changed in `close()`,
`this.closed = true; this.transaction = true;`, reports

```
advice  src/session/engine.ts:1848  sm/flags-combination
        After this write the flags are `closed = true`, `transaction = true`, a combination no state of `engine-session` has.
```

so the oracle does walk `Session`'s writes (TypeScript `private` fields included) and judges them against the table.

## Findings and verdicts

### 1. The dead worker (audit #2): fixed by `0d6e39f`; the table matches the code

**Before/after proof.** The same sidecar against a temp copy of `git show 0d6e39f^:src/session/engine.ts` (the
engine before the fix):

```
$ node ../oracle/src/bin.mjs --root <copy of 0d6e39f^> check --no-baseline --no-cache     → exit 1
error  .state/machines/engine-session.json:4  sm/machine-field-missing  `Session` has no field `lost`.
error  .state/machines/engine-session.json:4  sm/machine-field-missing  `Session` has no field `starting`.
advice .state/machines/engine-session.json:4  sm/machine-token-missing
$ node ../oracle/src/bin.mjs --root <copy of HEAD> check --no-baseline --no-cache           → exit 0
advice .state/machines/engine-session.json:4  sm/machine-token-missing
```

What this proves, and what it does not: before the fix the class had **no field that could hold "the worker is gone"**;
its exit handler (`0d6e39f^` line 334) only rejected what was pending when `code !== 0`, `this.worker` kept the dead
handle, and `request()` posted into it and waited forever (the audit's row). The declared `lost` state had no
representation, which is exactly the bug: a dead worker was indistinguishable from a running one. At HEAD the table
binds and every write to the four flags fits a declared state. The oracle checks writes, not their absence, so it
cannot show the old code "missing a transition"; what it shows is that the lifecycle the fix introduced could not even
be stated against the old code.

**Behaviour read against the table** (HEAD):
- `exited`: `worker.on('exit')` (342–346) sets `lost` for any exit code while the Session is open, and rejects what was
  pending. `running → lost`, `starting → lost`. Matches.
- `request` in `lost`: `request()` (354–360) awaits `restart()` (350–352), which shares one `start()` between every
  caller through `starting ??=` and clears `starting` in its `finally`; `start()` (307–348) clears `lost` as soon as the
  new `Worker` exists. `lost → starting → running`. Matches. `e2e/worker-crash.test.mjs` is the runtime proof of this
  row (not run here; see below).
- `inputsChanged`: `scan()` (513) terminates the worker, which fires `exit` with `this.worker === worker`, so the engine
  passes through `lost` before `restart()`. `running → lost → starting`. Matches the table (two rows). Note, not a
  bug: the pending requests are rejected by the exit handler with "Analysis worker exited with code 1" before `scan`'s
  own "Session inputs changed." reaches them; the same order held before the fix.
- First boot: `create()` (287–296) calls `start()` directly, not `restart()`, so `starting` is never set while the first
  worker boots and the flags read `running`. Unobservable: nobody holds the Session until `create()` returns. Noted
  as a projection limit, not a finding.
- `close` while `starting`: the terminated worker's `exit` sees `closed = true` and leaves `lost` null; the boot
  rejects and `starting` clears. Lands in `closed`. Matches.

Verdict: **not a bug**; the fix holds, the table says what the code does.

### 2. Overlapping applies (audit #4): still possible at the engine API, unreachable through every host

`applyAll` (947–957) is not wrapped in `serialize()` (361) and does not read `transaction` before writing it: a second
call while one runs emits a second `transaction: start`. On the Vite side `onTransaction` (83–95) answers `start` by
releasing whatever is held (84): the first apply's files reload the page while it is still writing, the second one's
`held` is then ended by whichever `end` arrives first, and the first `finally` (956) sets `transaction = false` under
the second, which silences `progress()` so the host's five-second silence timer (82) can release mid-write.

Why no host can trigger it: every shipped path (HTTP route, MCP, CLI, the Vite plugin's owned session) goes through
the host `Session` (`src/session/index.ts:122`) and the coordinator, which executes a non-read call alone,
`await execute(call)` before taking the next (`src/session/coordinator.ts:32`); `apply-all` is `post: true`
(`src/session/methods.ts:57`), so it is never in a read cohort. Only a direct `import { Session } from
'dist/session/engine.js'` caller (tests, library users) can overlap two applies.

What the oracle says: nothing. The flag form checks combinations after a write group, never a write's source state
(spec 13.5 is advice-only and has no `write-transition`), and `transaction = true` with every other flag unknown fits
`applying`. Seeing this one needs either the field form on a phase field (`write-transition`/`source-unknown`) or a
guard (`if (this.transaction) throw …`) that the oracle could read. Neither is a sidecar change.

Verdict: **real, low severity, not fixed here** (`src/` is the other session's). The fix belongs in the engine: either
`applyAll` runs under `serialize()` like every other write, or it refuses a second apply while `transaction` is set.
Either makes the table's `applying.on.apply` an explicit row (`→ applying` with a refusal, or a queue). Audit #4's
other notes (a second `end` on one `held` leaks a 2 s timer; `released` grows until a file is looked up again) are
unchanged and outside a sidecar's reach.

### 3. `sm/machine-token-missing` (advice): sidecar limit, not a bug

`Session` awaits in many methods, and the sidecar names no `token`: the engine has no single field that a result
compares itself to (requests are matched by `pending` id). Advice, exit 0, says what is not checked. Left as is.

## Baseline

Unchanged. The one new finding is advice; `baseline write` keeps error-level keys only (oracle build note 32), so there
was nothing to add and nothing to hide. Real finding 2 is not an oracle error (the flag form cannot see it), so it is
not in the baseline either: it lives here, as a row for the engine's owner.

## Tests

Not run. `node --test e2e/worker-crash.test.mjs` and the three `e2e/apply-all-*.test.mjs` need `dist/` (built here,
`npm run build`, clean) and the bar set for this layer was about 1.5 GB unused memory; the machine read
`PhysMem: … 975M unused`, `vm.swapusage: used = 2159M` at the time. `src/` is unchanged by this layer, so they are a
sanity check only; `0d6e39f`'s own message records them green one file at a time.

## Limits found in the oracle while doing this (recorded, not changed)

- A sidecar cannot bind closure state (`let held` inside `plumb()`), so a hold whose state lives in a factory function
  is out of reach without hoisting it. A possible later form: `binding.owner` naming a top-level function, with its
  `let`s as fields.
- One machine per owner means two concerns on one class share a table. Right for the oracle (one `#send`, one phase);
  a cost in the flag form, where unrelated flags make a product table.
- The flag form cannot say "this write has no guard" (finding 2). The field form can; the flag form was chosen because
  the engine has no phase field.
