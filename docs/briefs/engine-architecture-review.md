# Engine architecture review (2026-11-10)

> **Correction, the same day.** This review was read from the `release-0.4.0` branch. `main` was 41 commits ahead of
> it in other directions and had already built much of what is proposed below: error codes on every refusal with an
> API contract (step 2), one guarded write path in `src/write/source-file.ts` (step 3), request schemas in
> `src/session/schema.ts` (step 6), and several lifecycles as declared machines (step 4), all acting on the three
> audits this review calls "not yet acted on". My own step 2 was a duplicate and was reverted when the branches were
> joined (`integrate-0.4.0`). What this review still adds: the Stamp module (step 1, built), the snapshot split
> (step 5), one value resolver (step 7). Read the counts below as the release branch's, not the merged tree's.

Asked by the owner: can the engine be made more extensible, reliable and adaptable, and better to work with for
people and for agents; and would functional patterns, XState or state machines help?

Status (2026-11-10, later the same day): the owner chose "Stamp module first".
- Step 1 is built on both sides: `src/stamp.ts` (aa72337) and `overlay/src/stamp.js` (634eca2), each with a guard test.
- Step 2 has its first slice (761f1a0): six codes, carried across threads and HTTP; the overlay's 14 text matches
  are gone. About 420 errors still have no code.
- Steps 3 to 8 are not started.

## How this was read

Honest scope: I read the engine's outline (every field and method of `Session`), the method table, the error
module, the census path end to end (one bug traced and fixed), and counted patterns across `src/` and
`overlay/src`. I leaned on three audits already in the main checkout, written 2026-11-07 and not yet acted on:
`docs/state-machines/engine.md` (21 implicit machines), `docs/invariants/engine.md` (20 invariants) and
`docs/invariants/boundaries.md`. I did not read every file, and I did not run anything under load.

## What is already good (keep)

- Every engine write checks a content hash and the file's identity before and after, refuses symlinks, refuses an
  edit that makes a file parse worse, and re-reads after writing.
- `src/session/methods.ts`: every method the session answers is one row in one table. Six hand-kept lists became one.
- The overlay's verdict (`overlay/src/verdict.js`): findings merge by what they change, rank by tier, and a fix is
  tried before it is offered.
- Few dependencies (seven), no framework.

The problems below are not bad design. They are what a system looks like when it grew feature by feature with no
one owning the seams between features.

## The three root causes

### 1. Values that cross a seam are bare strings, taken apart by hand

| Evidence | Number |
|---|---|
| Files that parse a stamp (`file:line:col#hash`) themselves | 23, about 57 places |
| `new UsageError("…")` with no code, only a sentence | 431 |
| Error classes in the whole engine | 2 (`UsageError`, `BusyError`) |
| Type casts (`as X`) in `src/` | 402 |
| Schema or validation library | none |
| Responses the overlay checks before using | none (boundaries audit) |

What it costs, shown today: commit `cc8314c` changed a stamp's path to mean "from the repository root". The census
(`src/census.ts`) still read it as "from the project root". Nothing failed to compile. In any project that is not
the repository root, every kept reading counted as stale and the project's type ladder silently fell back to the
page's own. Three tests failed and the release stalled. The fix was one line (788a11d). The cause was that "a
stamp" is not a thing in the code, only a habit.

The same shape, waiting: errors are sentences, so tests assert exact strings, the overlay cannot react to a kind of
failure, and an agent cannot tell "file changed, retry" from "this will never work".

### 2. Lifecycles are flags on one object

`Session` (`src/session/engine.ts`) is 1,916 lines, about 55 mutable fields and about 80 methods. It is the file
watcher, the analysis cache, the query layer, six write paths, the undo log and the health report at once.
Its lifecycles are spread over `closed`, `refreshing`, `failure`, `transaction`, `undoing`, `tag`, `batchRead`,
`native`, `patternsDirty`, `inventoryDirty`.

From the state-machines audit, verified there:
- `tag`, `undoing` and `transaction` are set before an `await` and restored after, without the lock: a write that
  slips in between is recorded in someone else's undo group.
- If the analysis worker dies after it was ready, it is never replaced; the next request waits forever.
- `transaction` is one boolean and `applyAll` is not serialized: two applies clear each other's flag.
- A read caches its answer under the newest generation, though it was computed across three.

### 3. The same decision is made in many places

- Two rule engines: the Node side (`src/rules`, `src/decisions`, `src/habits`) and the page side (70 craft rules).
- "Which value should this be" is answered in about 20 files.
- Six places write a file as "write, then truncate", each by hand; the repository has `atomicWrite` and uses it
  elsewhere (invariant 2).
- 132 `catch {}` and 35 `.catch(() => {})`: a failed roll-back is swallowed and reported as "nothing written"
  (invariant 3).

## What to bring in, and what not to

| Technique | Verdict | Why |
|---|---|---|
| **Parse, don't validate**: one module per seam value (`Stamp`, `FileHash`, `ClassEdit`), with `parse`, `format` and a branded type | Yes, first | Removes the class of bug that stalled the release. Mechanical. No dependency. |
| **Errors as data**: `{ code, message, hint, where }` with a closed list of codes | Yes, first | Tests assert codes, the overlay branches on them, agents know what to do next. Messages stay free to improve. |
| **Functional core, imperative shell**: reads are pure functions of an immutable snapshot of one revision; writes are `plan()` (pure) then one `commit()` | Yes | Makes batched reads safe by construction, removes the generation-cache bug, gives every write a dry run for free. |
| **Explicit state machines as typed reducers**: `transition(state, event) → [state, effects]`, states as a discriminated union | Yes, for three machines | Worker lifecycle, write transaction, reconcile loop. A dead worker becomes a state with a defined exit, not a hang. |
| **Result type** for failures that are expected (`{ ok: false, code }`), exceptions for bugs | Yes, at seams | Ends silent `catch {}`: a failure is either returned or thrown, never dropped. |
| **Schemas on the method table** (valibot or hand-written guards), client types generated from it | Yes, after codes | One row then gives the route, the validation, the overlay's types, the docs and an agent's tool list. |
| **XState in the Node engine** | No | The three machines are small and sequential. A reducer is 40 lines, has no dependency, and anyone can read it. XState adds a library idiom to the most safety-critical code. |
| **XState in the overlay** | Try on one machine | The overlay has real statecharts: modes (blueprint, pinned card, preview, page in use), timers, parallel regions. The overlay audit lists them. Trial it on the mode machine and measure bundle size before deciding. |
| **Effect, fp-ts, a full FP library** | No | It is a whole-codebase idiom. It would raise the bar for every contributor and every agent for gains the plain patterns above already give. |
| **A big rewrite** | No | Every step below is a slice that ships alone and is proven by the existing tests through the same boundary. |

## Proposed order

Each is one layer: finished, proven and committed before the next. The test system (`docs/briefs/test-system.md`)
comes first in time, because none of these can be proven while a full run takes an hour.

1. **`Stamp` as one module.** Done. What it turned up beyond the census bug: three overlay callers compared a
   stamp's file with the server's in three different ways, and the fix panel's version never matched in a project
   below its repository's root (the copy count came out NaN; `F8-05` passes now). Also found: the overlay modules a
   host serves are a hand-kept list in `src/hosts/client.ts`; a new file is a 404 and a blank overlay until it is
   added. That list should be read from the folder.
2. **Error codes.** First slice done: the six kinds the overlay already told apart by matching sentences. Next
   slices, each small: the refusals `locate` distinguishes (`source-mismatch`, `not-jsx`, already half-coded as
   `refused`/`reason`), then "not a project source", then the CLI's `--json`. Proof so far: the codes asserted
   through HTTP in `write-races`, `change-trace` and `text-edits`.
3. **One `commit` for every write.** Atomic, the same guards for all six paths, and a roll-back that reports what
   it could not restore. Proof: a kill between write and truncate leaves the old or the new file, never a mix.
4. **Three machines as reducers:** worker lifecycle, write transaction (replacing `tag`/`undoing`/`transaction`),
   reconcile. Proof: kill the worker mid-session and the next read answers or fails with a code inside a deadline.
5. **Snapshot and queries.** Split `Session` into inventory, analysis, writes and pure queries over a snapshot.
   Proof: the "session matches cold CLI" tests, unchanged.
6. **Schemas on the method table,** generated client types, a protocol number on `health`.
7. **One value resolver** for both rule engines (the recommendation question from the release thread).
8. **Overlay mode machine,** XState trial.

## What each gives

| | Extensible | Reliable | Adaptable | Developer | Agent |
|---|---|---|---|---|---|
| Stamp module | new stamp fields in one place | no silent mismatch | hosts can differ behind it | one import, typed | |
| Error codes | | tests stop breaking on wording | messages can be rewritten freely | search a code, find the cause | knows retry from refuse |
| One commit | a new write is a plan | no half-written file | | one place to read | dry run of any write |
| Machines | a new state is a new case | no hang, no crossed undo groups | | the lifecycle is readable | health says the state by name |
| Snapshot | a new query is a function | reads can never see half a refresh | | small files | stable `--json` |
| Schemas | one row per method | bad input refused at the door | versioned protocol | generated types | tool list from the table |

## Open questions for the owner

1. Is the order right, or does the value resolver (7) matter more to you than the write safety steps (3, 4)?
2. May the overlay take a dependency for its mode machine, if the trial shows it earns its size?
3. The three audits sit untracked in the main checkout. Should they be committed as the record this builds on?
