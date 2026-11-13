# Warm start: the server answers from what it knew, then checks itself

Status: design, 2026-11-13. Nothing built. Waiting for the owner's sign-off.
Stands on [engine-scaling.md](engine-scaling.md), "The cold start".

## 1. What we are doing

After a dev server restart, plumber says "still reading your project" until its server has analysed everything
again: 41–44 s on algorecall (3,588 source files, 10,565 dependency files), even when nobody has touched the
project. The one-off `plumber check` on the same project takes 43 s the first time and 6.8 s the second, because it
keeps its result on disk and hands it back when every input is unchanged.

The server should do the same: on start, if nothing has changed since it last finished, **answer from what it
knew**, and build its own working state behind that. When the fresh analysis lands it **compares the two**, so
every warm start is checked a little later by the cold one it replaced.

Target: answers about 7 s after a restart instead of 41 s. The 7 s is the one-off check's second run; the server's
own number is not measured yet (layer 0).

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
| 0 | Measure, build nothing | How long the receipt check takes on algorecall; the reading table's size and load time; the memory of a second worker. And the proof the rest stands on: a cold server's reading table equals one rebuilt from a second cold start, byte for byte, on both apps |
| 1 | Keep: write the table and receipt after a full analysis, in idle time | The files on disk; their size and write time in the server's health |
| 2 | Check only: on start, load and validate the kept table but do not answer from it; compare when the fresh analysis lands | A line per start: matched or not, and what differed. Left running through normal work for a few days: the evidence before any answer is trusted |
| 3 | Answer from it: the kept state, the light worker, writes waiting | After a restart with nothing changed, the overlay draws in seconds |
| 4 | A change before ready drops the table | Edit a file 5 s after a restart: the page waits for the real analysis, never shows the old file's findings |
| 5 | Tests | The behaviours in 3.3 and 3.5 through the real server |

Layer 2 is the gate. If warm and cold ever differ there, layer 3 does not start until the cause is known.

## 5. Budgets

| Stage | Budget on algorecall |
|---|---|
| Checking the receipt | under 3 s |
| Loading the reading table | under 2 s, under 300 MB |
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
