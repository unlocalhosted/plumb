# The file lock, as a model

`src/write/lock.ts` keeps two plumber processes from writing the ledger or the change log at once. These are models of
it in TLA+, checked with [tla-ts](https://github.com/aidenybai/tla-ts) (MIT), which tries every order in which a few
processes can take their steps, die, and have their files go stale.

| File | What it is | Result (2026-11-14, tla-ts 0.0.10) |
|---|---|---|
| `Lock.tla` | the lock as written on main, one file operation per step | **fails** `OneWriter` with 4 processes and 2 deaths, in 31 steps; passes with 3 processes and 1 death (1,151 states) |
| `LockKeyed.tla` | a candidate fix: guard files named for the lock they are for, never removed while stale | passes `OneWriter` and `NotStuck` with 4 processes and 2 deaths (195,504 states). 5 processes and 3 deaths ran out of memory after 22 million states with no error found: not finished |

Run one:

```bash
npx -y tla-ts@0.0.10 specs/lock/Lock.tla -config specs/lock/Lock.cfg
```

`OneWriter`: never two live processes inside the work at once. `NotStuck`: while a live process still wants in, something can still happen.

What the models assume: only what a dead process left goes stale (`Slow = FALSE`). The sync form cannot touch its lock
while it works, so a sync holder that works longer than the stale time is taken over while still inside; `Slow = TRUE`
in `Lock.tla` shows that, and the code's own comment says it.

A model is a reading of the code, made by hand. Nothing ties these files to `lock.ts` but that reading: when the lock
changes, the model has to be changed with it.
