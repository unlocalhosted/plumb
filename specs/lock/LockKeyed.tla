----------------------------- MODULE LockKeyed -----------------------------
(* A candidate fix for src/write/lock.ts, checked before it is written.                                        *)
(* Two changes. (1) A guard file is named for the one lock it is for and a level: <file>.lock.takeover.<token>.<k>. *)
(* A stale guard is never removed by a waiter: the waiter goes to the next level. (2) Under its guard a taker    *)
(* removes the lock only if it still holds the token the guard is for. Guards of a lock go when the lock goes.   *)
EXTENDS Naturals, FiniteSets
CONSTANTS N, MaxDeaths
VARIABLES lock, lockStale, guards, gstale, pc, alive, mine, deaths, tx, tk

Procs == 1..N
vars == <<lock, lockStale, guards, gstale, pc, alive, mine, deaths, tx, tk>>
Held(x, k) == \E h \in Procs : <<x, k, h>> \in guards

Init == /\ lock = 0 /\ lockStale = FALSE /\ guards = {} /\ gstale = {}
        /\ pc = [p \in Procs |-> "try"] /\ alive = [p \in Procs |-> TRUE]
        /\ mine = [p \in Procs |-> FALSE] /\ deaths = 0
        /\ tx = [p \in Procs |-> 0] /\ tk = [p \in Procs |-> 1]

Try(p) == /\ pc[p] = "try"
          /\ IF lock = 0 THEN /\ lock' = p /\ lockStale' = FALSE /\ pc' = [pc EXCEPT ![p] = "work"]
                         ELSE /\ pc' = [pc EXCEPT ![p] = "to1"] /\ UNCHANGED <<lock, lockStale>>
          /\ UNCHANGED <<guards, gstale, alive, mine, deaths, tx, tk>>
(* read the lock: its token and its age *)
To1(p) == /\ pc[p] = "to1"
          /\ IF lock # 0 /\ lockStale
               THEN /\ tx' = [tx EXCEPT ![p] = lock] /\ tk' = [tk EXCEPT ![p] = 1] /\ pc' = [pc EXCEPT ![p] = "to2"]
               ELSE /\ pc' = [pc EXCEPT ![p] = "try"] /\ UNCHANGED <<tx, tk>>
          /\ UNCHANGED <<lock, lockStale, guards, gstale, alive, mine, deaths>>
(* create the guard for that token at this level; a stale one sends the waiter up a level, a live one back to wait *)
To2(p) == /\ pc[p] = "to2"
          /\ IF ~Held(tx[p], tk[p])
               THEN /\ guards' = guards \cup {<<tx[p], tk[p], p>>} /\ pc' = [pc EXCEPT ![p] = "to3"] /\ UNCHANGED tk
               ELSE /\ UNCHANGED guards
                    /\ IF <<tx[p], tk[p]>> \in gstale /\ tk[p] < N
                         THEN /\ tk' = [tk EXCEPT ![p] = tk[p] + 1] /\ UNCHANGED pc
                         ELSE /\ pc' = [pc EXCEPT ![p] = "try"] /\ UNCHANGED tk
          /\ UNCHANGED <<lock, lockStale, gstale, alive, mine, deaths, tx>>
(* under the guard: read the lock's token again *)
To3(p) == /\ pc[p] = "to3"
          /\ pc' = [pc EXCEPT ![p] = IF lock = tx[p] THEN "to4" ELSE "to5"]
          /\ UNCHANGED <<lock, lockStale, guards, gstale, alive, mine, deaths, tx, tk>>
(* rm(lock) *)
To4(p) == /\ pc[p] = "to4" /\ lock' = 0 /\ lockStale' = FALSE /\ pc' = [pc EXCEPT ![p] = "to5"]
          /\ UNCHANGED <<guards, gstale, alive, mine, deaths, tx, tk>>
(* remove this lock's guards (one step here; in code a loop: each removal is safe once the lock is gone or is not that token) *)
To5(p) == /\ pc[p] = "to5"
          /\ guards' = {g \in guards : g[1] # tx[p] \/ (lock = tx[p] /\ g[3] # p)}
          /\ gstale' = {s \in gstale : s[1] # tx[p] \/ lock = tx[p]}
          /\ pc' = [pc EXCEPT ![p] = "try"]
          /\ UNCHANGED <<lock, lockStale, alive, mine, deaths, tx, tk>>
Work(p) == /\ pc[p] = "work" /\ pc' = [pc EXCEPT ![p] = "rel1"]
           /\ UNCHANGED <<lock, lockStale, guards, gstale, alive, mine, deaths, tx, tk>>
Rel1(p) == /\ pc[p] = "rel1" /\ mine' = [mine EXCEPT ![p] = (lock = p)] /\ pc' = [pc EXCEPT ![p] = "rel2"]
           /\ UNCHANGED <<lock, lockStale, guards, gstale, alive, deaths, tx, tk>>
Rel2(p) == /\ pc[p] = "rel2" /\ pc' = [pc EXCEPT ![p] = "done"]
           /\ IF mine[p] THEN lock' = 0 /\ lockStale' = FALSE ELSE UNCHANGED <<lock, lockStale>>
           /\ UNCHANGED <<guards, gstale, alive, mine, deaths, tx, tk>>

Step(p) == Try(p) \/ To1(p) \/ To2(p) \/ To3(p) \/ To4(p) \/ To5(p) \/ Work(p) \/ Rel1(p) \/ Rel2(p)
Die(p) == /\ alive[p] /\ pc[p] # "done" /\ deaths < MaxDeaths
          /\ alive' = [alive EXCEPT ![p] = FALSE] /\ deaths' = deaths + 1
          /\ UNCHANGED <<lock, lockStale, guards, gstale, pc, mine, tx, tk>>
(* only what a dead process left goes stale: a working holder touches its lock, a taker is in its guard for an instant *)
LockAges == /\ lock # 0 /\ ~lockStale /\ ~alive[lock]
            /\ lockStale' = TRUE /\ UNCHANGED <<lock, guards, gstale, pc, alive, mine, deaths, tx, tk>>
GuardAges == \E g \in guards : /\ ~alive[g[3]] /\ <<g[1], g[2]>> \notin gstale
                               /\ gstale' = gstale \cup {<<g[1], g[2]>>}
                               /\ UNCHANGED <<lock, lockStale, guards, pc, alive, mine, deaths, tx, tk>>

Next == (\E p \in Procs : alive[p] /\ Step(p)) \/ (\E p \in Procs : Die(p)) \/ LockAges \/ GuardAges
OneWriter == Cardinality({p \in Procs : alive[p] /\ pc[p] = "work"}) <= 1
(* a dead holder's lock does not block everyone for ever: if a live process still wants in, something can still happen *)
NotStuck == (\E p \in Procs : alive[p] /\ pc[p] # "done") => ENABLED Next
=============================================================================
