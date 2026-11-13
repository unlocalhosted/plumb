# Warm start: the server answers from what it knew, then checks itself

Status: signed off by the owner, 2026-11-13. Layers 0 and 1 are done: the table is measured and kept, and nothing reads it back yet.
Stands on [engine-scaling.md](engine-scaling.md), "The cold start".

## Measured (2026-11-13, layer 0)

On the laptop, which was short of memory throughout (5.9 of 7.2 GB of swap in use, another agent's tests running).

| | crafting-ui (622 source files) | algorecall (2,411 files with something in them) |
|---|---|---|
| Cold start today | 4.8–5.7 s | 41–44 s |
| **Two cold starts, same inputs: reading tables equal?** | **Yes, byte for byte** (16.1 MB each, same hash) | **Yes, byte for byte** (254.6 MB each, same hash), run on vm-agent |
| Checking the receipt (the check's own validation) | 0.25 s | 0.9 s |
| Reading table, as plain objects | 16.1 MB (13.5 MB packed) | 257 MB (195 MB packed) |
| Loading it | 0.04 s, 30 MB | 0.72 s, 329 MB |
| Findings / declarations in it | 1,665 / 22,486 | 2,984 / 304,350 |

What it says:

1. **The warm path is short.** On algorecall: 0.9 s to check the receipt plus 0.7 s to load, against 41 s. The 8 s
   target was timid; 2–3 s to a first answer is the honest expectation, before a worker's start-up is counted.
2. **The receipt check is not the risk** the design feared: under a second, not three.
3. **The table must be tables.** As plain objects algorecall's is 257 MB and 329 MB in memory, over the budget. But
   of its 304,350 declarations only 32,797 are distinct once their place is set aside: nine in ten are the same
   declaration at another place. Stored once and pointed at, with each of 2,414 file paths stored once, it should
   be a few tens of MB. That is rule 4 of the data-oriented rules, and here it is not optional.
4. **Equality holds on both apps.** Two cold starts on the same inputs gave tables identical to the byte: 16.1 MB on
   crafting-ui, 254.6 MB on algorecall (3,663 files asked, 304,400 declarations). The analysis has no order that
   depends on timing, so the self-check in 3.5 will not cry wolf for that reason.
5. **crafting-ui gains little** (5 s cold). This is for large projects.

**Layer 0 is complete.** algorecall's run was done on vm-agent from a copy of the working tree (uncommitted
changes included) with its dependencies installed there; the copy was removed afterwards. On that slower machine
one cold start that also answers every file's places took 120–135 s and 5.1–5.5 GB, most of the memory being the
255 MB table held twice by the measuring script.

### Layer 1 built: the table is kept (2026-11-13)

About five seconds after the server last had something new to say, it writes the reading table and a receipt
under the project's cache folder. Nothing reads them back yet. The server's health says what was kept, how big and
how long it took; a table kept by another build of plumber is removed.

| | crafting-ui (laptop) | algorecall (vm-agent) |
|---|---|---|
| Files with something in them | 238 | 2,411 |
| Declarations / distinct once the place is set aside | 22,486 / 7,440 | 304,400 / 32,836 |
| Table on disk | 9.5 MB (16.1 MB as plain objects) | 116 MB (257 MB as plain objects) |
| Receipt on disk | 0.4 MB: 1,415 files, 666 directories | 2.6 MB: 14,830 files, 1,182 directories |
| Time to build and write it | 0.07 s | 5.7 s (4.9 s building) |
| Time to load it back | 0.05 s | 0.83 s |
| Read back from disk, every file compared with the server's own answer | 237 the same, 1 differs (below) | 2,411 the same, 0 differ |

What it says:

1. **It is lossless.** Every declaration matches on both apps. Findings match once the one field the ledger
   rewrites when it answers (a finding's severity) is set aside: the table holds the view before the ledger, as
   designed.
2. **My size prediction was wrong.** I said "a few tens of MB" for algorecall; it is 116 MB. Storing each
   declaration once took out more than half, but the places themselves (304,400 of them, each with its line,
   column and text) and the findings (20,032 file entries, each carrying its decisions list) are the rest. More
   to take out: a finding's decisions stored once, places as columns.
3. **Writing it holds the server's one worker for 5.7 s on algorecall** (on vm-agent, a slower machine). That
   breaks the budget "never delays an answer": a question arriving in that window waits. It is asked for only
   after five quiet seconds, but it is not interruptible. To fix before layer 3: build it in pieces, or in the
   second worker the design already has.
4. **One file differs on crafting-ui, and it matters for layer 3.** For the theme stylesheet the server answers 60
   findings where the table holds 29: the ledger step regroups findings when it answers, and today it does that
   over the whole report. Answering from the table needs that step run over the table. Not a fault in what is
   kept; a job for the layer that answers.
5. **The receipt is the server's own evidence, not yet the check's.** It lists every file the server knows with
   its hash and every directory it lists with its stamp, plus the table's hash so the two cannot be mismatched.
   It does not yet record what each import resolved to.

Not run: the full test suite. Four server test files nearest the change pass (27 of 27, 1 skipped). No test of the
kept table itself yet; the comparison above was a script.

### Layer 1, second pass: a third the size, and built between answers (2026-11-13)

The two faults of the first pass, fixed.

**Size.** Taking the first table apart showed where it went: findings were three quarters of it, because each
finding repeated in full the declarations it is about, and 20,000 findings carried 200 distinct lists of decisions
between them. Now places are columns of numbers; a finding points at the file's own declarations; every text and
every list that repeats is stored once.

**The hold.** The worker builds the table in slices of about 30 ms, each one a separate step through the same
queue the reads use, so a question asked meanwhile is answered between slices. One real fault found on the way: a
finding with thousands of places in hundreds of files was searched through again for each file, which made one
slice 0.7 s; its places are now sorted by file once.

| | crafting-ui (laptop) | algorecall (vm-agent) |
|---|---|---|
| Table on disk | 9.5 MB → 3.5 MB | 116 MB → 20.9 MB |
| Time to load it back | 0.05 s → 0.008 s | 0.83 s → 0.17 s |
| Longest the worker is held | 0.07 s → 0.03 s | 5.7 s → 0.07 s |
| Work to build it | 0.06 s | 4.9 s → 2.2 s, in 64 slices |
| An answer asked for while it is built | median 0.02 s, slowest 0.03 s | median 0.30 s, slowest 0.67 s |
| Read back from disk and compared with the server's answers | 237 the same, 1 differs (the ledger regrouping, as before) | 2,411 the same, 0 differ |

Budgets: loading (under 2 s, under 300 MB) is met with room. "Never delays an answer" is met as far as the
worker goes: 0.07 s at most.

**Not established:** whether algorecall's 0.30 s per answer during the build is the build. No baseline was taken
with the build off. The likelier cause is the one found earlier today: every read first re-checks the project's
14,830 files, which costs about that on vm-agent whatever else is happening. To measure next, not to assume.

Not run: the full test suite, and no test of the kept table yet.

## 1. What we are doing

After a dev server restart, plumber says "still reading your project" until its server has analysed everything
again: 41–44 s on algorecall (3,588 source files, 10,565 dependency files), even when nobody has touched the
project. The one-off `plumber check` on the same project takes 43 s the first time and 6.8 s the second, because it
keeps its result on disk and hands it back when every input is unchanged.

The server should do the same: on start, if nothing has changed since it last finished, **answer from what it
knew**, and build its own working state behind that. When the fresh analysis lands it **compares the two**, so
every warm start is checked a little later by the cold one it replaced.

Target: answers within a few seconds of a restart instead of 41 s (measured below: 0.9 s to check, 0.7 s to load).

## 2. Why the server cannot simply read the check's kept result

Read from the code (`src/check-cache.ts`, `src/session/worker.ts`):

- **They are different reports.** The check keeps its result with the ledger applied (which findings are known debt,
  which are new). The server holds the result *without* the ledger and applies it per question, so a ledger edit
  never needs a new analysis. The check's cache is not even created when the ledger is off.
- **The check's result is one 230 MB object** (algorecall: 2,984 findings, 304,350 declarations). Loading all of it
  to answer "what is at this line" repeats the mistake found on the wire today: sending everything to whoever asks.
- **The server needs more than a report to work.** Applying a fix, or re-reading one changed file in milliseconds,
  uses its incremental state (per-file component shards, source slices). That state is not on disk and is what the
  41 s builds.

So the server keeps its own thing, shaped for what it is asked.

## 3. The design

### 3.1 What is kept: a reading table, not a report

When the server finishes a full analysis it writes, in idle time:

- **the reading table:** per source file, the declarations and findings at each place in it; plus the few
  project-wide answers (decisions, the spec, readiness, places). Flat tables that point at each other by number, a
  file path stored once. This is exactly what a page and the Alt card ask for. No edits lists, no ledger state;
- **the receipt:** every input the analysis depended on, as the check's receipt records them: each file with its
  stamp and hash, each directory's listing, each import and what it resolved to, the Tailwind graph's hash; and
  the key (plumber's build, the config's text, the Node version).

Both go under the project's existing cache folder. A plumber upgrade or a config change means a new key: one cold
start, then warm again.

### 3.2 When it may be used: the check's own rule

The kept table is used only if **every** line of the receipt still holds, by the same validation `plumber check`
already trusts to gate CI: same set of files, each file's stamp unchanged or else its hash, same directory
listings, every import still resolving to the same file, same Tailwind graph. Anything else, or anything the check
itself refuses to cache (executable presets, untracked preset inputs), is a cold start, as today.

Nothing new is trusted. The bar is the one already in use.

### 3.3 Three states instead of two

| State | Reads (page, places, the card) | Writes (apply, undo) | How long |
|---|---|---|---|
| **starting** | wait, as today | wait | until the receipt is checked: seconds |
| **kept** | answered from the reading table | wait for ready | while the fresh analysis runs: about 35 s on algorecall |
| **ready** | answered from the server's own state | allowed | from then on |

- In **kept**, the overlay behaves as if ready for everything it draws. Only a person who applies a fix in the
  first half-minute after a restart waits, with the "still reading your project" line that exists today.
- A class trace (an element whose classes are written elsewhere) needs the working state; in **kept** it answers
  "still being read", which the overlay already handles by asking again.
- **A file changes before ready:** the kept table is dropped at once and the server is **starting** again. No
  attempt to patch a kept table: its whole claim is "nothing changed".

### 3.4 Two workers, so answering never waits behind analysing

Today one worker thread does everything, so a read asked during the analysis waits for it. In **kept**:

- a light worker loads the reading table and answers reads;
- the analysis worker starts at the same time and builds the real state;
- when it is ready, reads move to it and the light worker is let go.

### 3.5 Every warm start is checked by the cold one

When the fresh analysis lands, its reading table is compared with the kept one.

- **Same:** nothing happens. The page was right all along.
- **Different:** the receipt's validation missed something. The server tells the overlay the page changed (it
  re-reads, as after any edit), records what differed, and `plumber doctor` says so. The kept table is replaced.

So a wrong warm start is wrong for at most the length of one analysis, is corrected without anyone doing
anything, and leaves evidence. That is a stronger position than the one-off check has, which trusts its cache with
nothing checking behind it.

### 3.6 The data-oriented rules it follows

Hot and cold apart (the table holds what is drawn; edits and the working state stay cold). Tables, not trees.
Once per distinct input (a file's hash is kept while the file is unchanged, done today). A budget per stage, below.

## 4. Order

One layer at a time, each seen on algorecall and crafting-ui, each timed. No tests until the behaviour has settled.

| # | Layer | What can be seen |
|---|---|---|
| 0 | **Done.** Measure, build nothing | How long the receipt check takes on algorecall; the reading table's size and load time; the memory of a second worker. And the proof the rest stands on: a cold server's reading table equals one rebuilt from a second cold start, byte for byte, on both apps |
| 1 | **Done**, both passes (see above). Keep: write the table and receipt after a full analysis, in idle time | The files on disk; their size and write time in the server's health |
| 2 | Check only: on start, load and validate the kept table but do not answer from it; compare when the fresh analysis lands | A line per start: matched or not, and what differed. Left running through normal work for a few days: the evidence before any answer is trusted |
| 3 | Answer from it: the kept state, the light worker, writes waiting | After a restart with nothing changed, the overlay draws in seconds |
| 4 | A change before ready drops the table | Edit a file 5 s after a restart: the page waits for the real analysis, never shows the old file's findings |
| 5 | Tests | The behaviours in 3.3 and 3.5 through the real server |

Layer 2 is the gate. If warm and cold ever differ there, layer 3 does not start until the cause is known.

## 5. Budgets

| Stage | Budget on algorecall |
|---|---|
| Checking the receipt | under 3 s (measured: 0.9 s) |
| Loading the reading table | under 2 s, under 300 MB (measured as plain objects: 0.7 s, 329 MB; as tables: to be measured) |
| First answer after a restart | under 8 s |
| Writing the table after an analysis | idle time only; never delays an answer |

Guesses until layer 0. The receipt check re-resolves every import and re-lists every directory; that is the part
most likely to be over.

## 6. Decided here, and why (change any at sign-off)

- **The server keeps its own table rather than reading the check's.** They differ on the ledger, and the check's
  is the wrong shape and size for the questions.
- **Check-only first, for days, before any answer comes from it.** A wrong finding shown confidently is worse than
  a 41 s wait. The evidence is cheap to collect and the layer is small.
- **Writes wait for ready.** A write needs the real state, and writing against a table that might be about to be
  replaced is how files get damaged.
- **Any change before ready drops the table whole.** Patching it would need the very machinery the table exists to
  avoid waiting for.
- **Two workers for half a minute.** Memory for responsiveness, briefly. If layer 0 shows the laptop cannot afford
  it, the fallback is one worker that answers from the table between phases of the analysis.

## 7. Not known

- The server's own warm number. 6.8 s is the check's, and includes writing 230 MB of JSON to a pipe.
- Whether two cold starts on the same inputs give the same reading table byte for byte. If the analysis has any
  ordering that depends on timing, the comparison in 3.5 would cry wolf; layer 0 finds out.
- Memory. The server already holds about 2 GB for algorecall.
- How often a dev server restart really has unchanged inputs. A restart after `git pull` or a branch switch is
  cold whatever we do; this helps the restart after a crash, a config tweak elsewhere, or a morning.
