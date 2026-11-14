------------------------------- MODULE Lock -------------------------------
(* The file lock of src/write/lock.ts, one file operation per step, as the code does them.                    *)
(* lock: the <file>.lock file, 0 when absent, else the process whose token it holds. lockStale: its mtime is  *)
(* older than the stale time. guard: <file>.lock.takeover, the same way.                                       *)
EXTENDS Naturals, FiniteSets
CONSTANTS N, MaxDeaths, Slow
VARIABLES lock, lockStale, guard, guardStale, pc, alive, mine, deaths

Procs == 1..N
vars == <<lock, lockStale, guard, guardStale, pc, alive, mine, deaths>>

Init == /\ lock = 0 /\ lockStale = FALSE /\ guard = 0 /\ guardStale = FALSE
        /\ pc = [p \in Procs |-> "try"] /\ alive = [p \in Procs |-> TRUE]
        /\ mine = [p \in Procs |-> FALSE] /\ deaths = 0

(* writeFile(lock, mine, wx) *)
Try(p) == /\ pc[p] = "try"
          /\ IF lock = 0 THEN /\ lock' = p /\ lockStale' = FALSE /\ pc' = [pc EXCEPT ![p] = "work"]
                         ELSE /\ pc' = [pc EXCEPT ![p] = "to1"] /\ UNCHANGED <<lock, lockStale>>
          /\ UNCHANGED <<guard, guardStale, alive, mine, deaths>>
(* takeOver: stat(lock) *)
To1(p) == /\ pc[p] = "to1"
          /\ pc' = [pc EXCEPT ![p] = IF lock # 0 /\ lockStale THEN "to2" ELSE "try"]
          /\ UNCHANGED <<lock, lockStale, guard, guardStale, alive, mine, deaths>>
(* writeFile(guard, wx); on EEXIST, stat(guard) *)
To2(p) == /\ pc[p] = "to2"
          /\ IF guard = 0 THEN /\ guard' = p /\ guardStale' = FALSE /\ pc' = [pc EXCEPT ![p] = "to3"]
                          ELSE /\ pc' = [pc EXCEPT ![p] = IF guardStale THEN "to2rm" ELSE "try"] /\ UNCHANGED <<guard, guardStale>>
          /\ UNCHANGED <<lock, lockStale, alive, mine, deaths>>
(* rm(guard, force) after seeing it old *)
To2rm(p) == /\ pc[p] = "to2rm" /\ guard' = 0 /\ guardStale' = FALSE /\ pc' = [pc EXCEPT ![p] = "try"]
            /\ UNCHANGED <<lock, lockStale, alive, mine, deaths>>
(* under the guard: stat(lock) again *)
To3(p) == /\ pc[p] = "to3"
          /\ pc' = [pc EXCEPT ![p] = IF lock # 0 /\ lockStale THEN "to4" ELSE "to5"]
          /\ UNCHANGED <<lock, lockStale, guard, guardStale, alive, mine, deaths>>
(* rm(lock, force) *)
To4(p) == /\ pc[p] = "to4" /\ lock' = 0 /\ lockStale' = FALSE /\ pc' = [pc EXCEPT ![p] = "to5"]
          /\ UNCHANGED <<guard, guardStale, alive, mine, deaths>>
(* finally: rm(guard, force) *)
To5(p) == /\ pc[p] = "to5" /\ guard' = 0 /\ guardStale' = FALSE /\ pc' = [pc EXCEPT ![p] = "try"]
          /\ UNCHANGED <<lock, lockStale, alive, mine, deaths>>
(* the work ends *)
Work(p) == /\ pc[p] = "work" /\ pc' = [pc EXCEPT ![p] = "rel1"]
           /\ UNCHANGED <<lock, lockStale, guard, guardStale, alive, mine, deaths>>
(* finally: readFile(lock) === mine *)
Rel1(p) == /\ pc[p] = "rel1" /\ mine' = [mine EXCEPT ![p] = (lock = p)] /\ pc' = [pc EXCEPT ![p] = "rel2"]
           /\ UNCHANGED <<lock, lockStale, guard, guardStale, alive, deaths>>
(* rm(lock, force), if it was mine when read *)
Rel2(p) == /\ pc[p] = "rel2" /\ pc' = [pc EXCEPT ![p] = "done"]
           /\ IF mine[p] THEN lock' = 0 /\ lockStale' = FALSE ELSE UNCHANGED <<lock, lockStale>>
           /\ UNCHANGED <<guard, guardStale, alive, mine, deaths>>

Step(p) == Try(p) \/ To1(p) \/ To2(p) \/ To2rm(p) \/ To3(p) \/ To4(p) \/ To5(p) \/ Work(p) \/ Rel1(p) \/ Rel2(p)

Die(p) == /\ alive[p] /\ pc[p] # "done" /\ deaths < MaxDeaths
          /\ alive' = [alive EXCEPT ![p] = FALSE] /\ deaths' = deaths + 1
          /\ UNCHANGED <<lock, lockStale, guard, guardStale, pc, mine>>

(* Time passes. A lock goes stale when nothing touches it: its holder is dead, or (Slow) it is the sync form, *)
(* which cannot touch its lock while it works. A guard goes stale the same way.                                *)
LockAges == /\ lock # 0 /\ ~lockStale /\ (~alive[lock] \/ Slow)
            /\ lockStale' = TRUE /\ UNCHANGED <<lock, guard, guardStale, pc, alive, mine, deaths>>
GuardAges == /\ guard # 0 /\ ~guardStale /\ (~alive[guard] \/ Slow)
             /\ guardStale' = TRUE /\ UNCHANGED <<lock, lockStale, guard, pc, alive, mine, deaths>>

Next == (\E p \in Procs : alive[p] /\ Step(p)) \/ (\E p \in Procs : Die(p)) \/ LockAges \/ GuardAges
Spec == Init /\ [][Next]_vars

(* Never two live processes inside the work at once. *)
OneWriter == Cardinality({p \in Procs : alive[p] /\ pc[p] = "work"}) <= 1
=============================================================================
