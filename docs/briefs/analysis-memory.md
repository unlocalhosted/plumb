# What the analysis keeps in memory

Status: proposed 2026-11-17, waiting for the owner's sign-off. No code until then.

## The problem

On algorecall (about 3,650 source files), plumber's analysis worker rests at about 2.7 GB, and grew past node's 4 GB limit
during start-up until the 2026-11-17 cap. A person runs plumber next to their own dev server, a browser and an editor
on a 16 GB laptop. Gigabytes for remembering facts about a few thousand files is the wrong order of magnitude: the
facts plumber reads are kilobytes per file.

The cap (keep the parsed code of the 400 most recently used files, parse again when needed) made start-up work. It
does not change the design that made the memory big, and the next feature that keeps something per file will grow it
again.

## Measured

One heap profile of the analysis worker at rest on algorecall, on vm-agent, 2026-11-17, before the cap: 2.17 GB live.

| MB | Allocated in | What it is |
|---|---|---|
| 781 | `collect/classes.ts` `source()` | parsed code (oxc trees as JavaScript objects), about 210 KB per file |
| 234 | `ownership/components.ts` `local()` | component identities and what they point at in those trees |
| 119 | `session/collection.ts` `read()` | file texts |
| 118 | `session/state.ts` `sync()` | per-file maps and sets |
| 92 | judgement | findings |
| 74 | provenance | where a class came from |
| 68 | worker index | lookup maps |
| 66 | ledger | finding groups |

Separately, the write path held one "everything this file reaches" set per file, about 13 million paths in all.
Writes now walk the links when asked (commit ef95361c) and that cost is gone; the per-file reach cache in
`WorkerState.reachable()` still exists for other questions.

What is not measured: the size each step below would reach. Every number in "Expected" is a guess until the step is
built and profiled the same way.

## Where the memory comes from

Three habits, each sensible alone:

1. **Parsed code is kept so later questions can walk it.** `collectClasses` keeps each file's tree in
   `shared.programs` for the component pass; `discoverComponents` keeps a `Module` per file with its tree, and its
   `bindings` and `types` maps hold nodes inside that tree. Questions asked later (what does this component render,
   which class list sits at this position, what tokens does this file use) walk the tree again. So the tree stays,
   and a node kept in a map keeps the whole tree alive even after `ast` is set to null.
2. **Paths are the keys everywhere.** Every map and set is keyed by an absolute path string. The import graph, the
   component graph, consumers, dependencies and the reach cache each hold their own references, and sets of paths per
   file grow with files × files.
3. **Everything is analysed up front.** All of algorecall's files are parsed and judged at start-up, whether or not the open
   page uses them.

## The design

The rule: **after a file is read, plumber keeps facts, not code.** A fact is something a question needs, in a flat
shape, pointing at the source by position. When a question needs more than the facts, the file is parsed again; oxc
parses a typical file in a few milliseconds.

### 1. Per-file facts instead of trees

One pass over a freshly parsed file fills a small record, then the tree is dropped:

- **imports and exports:** specifier, imported name, local name, as small numbers into a string table;
- **class sites:** start and end in the text, the attribute or helper it belongs to, the literal classes when they
  are static, and a flag when they are computed;
- **JSX elements:** start, end, tag, parent element, the component they sit in;
- **components:** name, where the function starts and ends, exported as what, the root elements it returns;
- **bindings the component pass follows:** name and the position of its value, never the node.

Questions that today walk a kept tree (`functionNode`, `values`, `implementation`, the token inventory in
`discoverComponents`) either read these facts or parse that one file again. The test for whether something belongs
in the facts is whether a question asks for it on every file; the rest is parsed on demand.

This is where most of the memory is: the 781 MB of trees and much of the 234 MB that points into them.

### 2. File numbers instead of paths

Each file gets a number the first time plumber sees it. Paths live once, in one table. Every graph, map and finding
stores the number. Results sent to the page turn numbers back into paths at the edge.

### 3. Links in flat arrays

The import graph and the component graph are each stored once, in both directions, as two number arrays per
direction (where each file's list starts, and the lists end to end). "What does this file reach" and "who depends on
this file" are a walk over those arrays with a bitset of files seen, done when asked. Nothing stores a set per file.
The walk is linear in the links; on algorecall that is a fraction of a millisecond per question.

### 4. Columns for sites and findings

Class sites, elements and findings are rows in tables: one typed array per field (file number, start, end, kind,
rule), with text as a position in the file, never a copy. This is rule 4 and rule 7 of engine-scaling 2b, applied to
the analysis instead of the page.

### 5. One copy of each text

A file's text is held once, by the session, and everything else refers to it. Today it is held by the collection
reader, the component pass and the engine's `sourceTexts`. Unchanged files whose facts are fresh could drop their
text entirely and read it from disk when a write needs it.

### 6. Open page first

Start-up analyses what the open page imports, then the rest in the background at low priority, or only when a
question asks for it. The person sees findings for their page sooner, and a project-wide question (the problems list)
is the thing that pays for reading everything.

### 7. Only changed rows between threads

The worker sends the main thread what changed, by number, instead of whole structures. The first start-up crash died
while decoding one such copy.

## Step 1, measured (2026-11-17)

The component pass now keeps an index per file (imports, exports, and where each declaration sits) and parses the
file again when a question needs its code. The parsed code lives for one build of the graph. Building it this way
found a second holder: each file's finished graph kept a reference to every lookup table its build used, and the
server keeps one graph per file. Those tables are now emptied when a build ends.

Same heap profile of the analysis worker at rest on algorecall, on vm-agent:

| | Before the cap | After step 1 |
|---|---|---|
| live heap | 2.17 GB | 1.26 GB |
| parsed code (oxc) | 781 MB | 56 MB |
| lookup keys in the component pass | 163 MB | not in the top eight |
| whole process at rest (default heap limit) | did not start | 2.46 GB (2.7 GB with the cap alone) |

The component graph is byte-identical before and after, on algorecall (342 components, 108,286 elements) and
crafting-ui (37, 8,856), built in one call and file by file. The file-by-file build takes 10.1 s against 9.2 s before.

What is left at the top of the heap: per-file maps in `sync` (110 MB), provenance (81 MB), file texts read twice
(74 MB and 56 MB), the worker's lookup index (66 MB). Text and maps are steps 3 and 4.

## Step 2, measured (2026-11-17)

Collection shared every parsed file through start-up, so a file imported by many others was parsed once and the
component pass could reuse them all. That meant every file's tree was in memory at the same moment (3,649 on
algorecall). The shared store now keeps the 256 most recently used; the component pass parses again what was dropped.

Resident memory moves by about 250 MB between identical starts, so it cannot show this. The measure used instead is
the smallest heap limit plumber starts under on algorecall, on vm-agent:

| | Starts at | Fails at |
|---|---|---|
| before step 2 | 1.8 GB | 1.6 GB |
| after step 2 | 1.4 GB | 1.25 GB |

Collection results and the component graph, built the way the server builds them, are byte-identical on algorecall
(228,484 class sites) and crafting-ui. Start-up is about 66 s before and after; building the graph alone takes 9.4 s
against 6.5 s, the parses the store no longer saves.

This is a cap, not facts: collection still builds whole trees and drops them. Per-file facts for collection wait
until a profile shows the parse work, not the memory, is the cost.

## Before step 3: what holds the rest (2026-11-17)

Step 3 was planned against the per-file sets that broke writes. Those are gone at rest (writes walk the links when
asked), so before building it, the live heap after steps 1 and 2 was charged to the plumber function that allocated
each surviving object and its caller (sampling heap profile, algorecall, vm-agent; 1.32 GB live). A full heap
snapshot was tried first and was killed at an 11 GB cap while writing.

| MB | What it is |
|---|---|
| 206 | file texts and line tables, read by collection (127) and the class collector's sources (79) |
| about 270 | judgement: orders (94), provenance (93) and family provenance (75 over four call sites) |
| 133 | the worker's lookup index of findings and declarations |
| 95 | ledger finding groups (53) and the location key cached for every site (42) |
| 93 | the component graph's elements and usages |
| 53 + 18 | report assembly in the analysis entry point |

Files as numbers would shorten the location keys and the ledger's group keys, where the path is about half of each
string: tens of MB, an estimate from the table, not a measurement. The links between files do not appear. Almost
everything else scales with how much of the app is analysed: every class site (228,484), element (108,286) and
judgement for all 3,649 files.

Decision: step 3 is not built as written. The lever that reaches the rows above together is step 6, analysing the
open page's files first and the rest only when asked, which changes what the person sees (a project-wide list fills
in later) and so waits for the owner. Steps 4 (one copy of each text, up to about 200 MB here) and 5 (columns for
sites and findings) remain the order otherwise.

## Step 4, tried and undone (2026-11-17)

The table above read 206 MB of texts as the source held about three times. It is held once. algorecall's source is
63 million characters, and 3,264 of its 3,818 files contain a character outside Latin-1, so V8 stores the whole file
at two bytes a character: about 125 MB for one copy.

The change tried: one store of texts for the session, read through by collection and the component pass. Results
stayed byte-identical, but nothing moved: the heap at rest was 1.35 GB against 1.32 GB, and plumber still failed to
start under a 1.25 GB heap. Emptying the store after start-up freed nothing; emptying the component pass's copies as
well freed 31 MB. The texts are kept alive by the results themselves: a string cut from a file's text (a class
list, an authored value) can keep the whole file alive in V8. The change was undone, since it added a store to keep
in step with file changes for no measured gain.

What would free the texts: results that hold their own short strings instead of pieces of the file, and nothing
else holding a file's text at rest (a write reads the file from disk, as it already does to check it is current).
The ceiling is the 125 MB above; not measured until built.

## Results own their strings (2026-11-17)

Measured first: after start-up, every file's text was alive through two holders. The component index kept the text so
a file could be parsed again (118 MB on algorecall, two bytes a character), and collection's style results held pieces
cut from the text, each of which keeps the whole text alive in V8.

The fix, in two parts:
- the component index keeps a hash of the text instead of the text, and reads the file from disk when a question
  needs its code; a file that no longer matches the hash reads as empty until its change event indexes it again;
- when collection finishes a file, its results are given their own strings, one copy of each distinct string per
  file.

| On algorecall, vm-agent | Before | After |
|---|---|---|
| collection plus component graph, held after a forced collection | 582 MB | 380 MB |
| analysis worker at rest (sampled under a 1.5 GB limit) | 1.31 GB | 1.24 GB |
| smallest heap plumber starts under | 1.25 to 1.4 GB | 1.1 to 1.25 GB |

Collection results and the component graph are byte-identical on algorecall and crafting-ui. Collection takes 12.9 s
against 12.6 s.

The resting profiles were also re-taken under a 1.5 GB limit, to rule out garbage counted as live under the 8 GB limit
used before; the total came out the same, so the earlier tables stand.

## Where data-oriented design would pay (measured 2026-11-17)

The owner asked how far data-oriented design could push this. Measured on algorecall, vm-agent, with collection and
the component graph built the way the server builds them (380 MB held after a forced collection):

- **The row tables are small.** Class sites (228,484 rows), style declarations, style sites, elements (108,286),
  usages and mounts come to about 50 MB as objects and about the same as columns, by a model of V8's layout (4 bytes
  a field with pointer compression, the same as a column cell). Columns for these tables alone would save little.
- **The cost is around the rows, not in them.** Building the graph adds 219 MB; dropping the graph objects frees
  140 MB, for about 10 MB of rows. The per-file index is 27 MB of that.
- **Names pin whole texts.** The parser's names and values are pieces of the file's text, and a kept piece keeps the
  text alive. A heap snapshot of the full state counts 247,216 sliced strings over 142,500 parents totalling 154 MB,
  about 40% of what is held; 2,173 strings over 20 KB (whole file texts) total 97 MB.
- **A module-level table pins texts for good.** The resolver's record of every import answer (`collect/resolved.ts`)
  keys each answer by file and specifier; it held 75 MB, mostly file texts, after everything else was released.
- **3.1 million objects** for the 380 MB, about 120 bytes each.

So the data-oriented moves that would pay, in order:
1. **One string table at the parser boundary.** Every name, specifier, tag and class value plumber keeps is an id into
   one table (or at least its own copy), never a piece of the file. This frees the pinned texts everywhere at once,
   including the resolver record.
2. **One graph table, not a graph per file.** Elements, usages and mounts for all files in shared columns with a file
   column, instead of a graph object per file with its own maps and closures.
3. **The same check on the judgement side** (judgement, the lookup index, finding groups: about 700 MB of the worker
   at rest), which this harness does not run. Not measured.

## One string table (2026-11-17)

Built: `src/collect/strings.ts` keeps one copy of every string the analysis holds past a parse, and hands the same copy
to every caller. The component index (its names and the map keys), each graph build's results, collection's results,
the import specifiers, the component lookup keys and the resolver's record of import answers go through it. Ids
(numbers) instead of copies are left for when tables become columns; the copies alone stop the pinning.

Found while building: an export that maps to a local name stored that name as a map value, which the first pass missed
and the holder attribution caught.

| On algorecall, vm-agent | Before | After |
|---|---|---|
| collection plus component graph, held after a forced collection | 382 MB | 234 MB |
| whole file texts kept alive by pieces of them | 97 MB | 1 MB |
| analysis worker at rest (sampled under a 1.5 GB limit) | 1.24 GB | 1.09 GB |
| smallest heap plumber starts under | 1.1 to 1.25 GB | 0.95 to 1.1 GB |

Collection results and the component graph are byte-identical on algorecall and crafting-ui; start-up stays at 65 to
70 s. The table grows by distinct strings only and is never emptied; a name removed from the code stays in it.

Next in this order: one graph table instead of a graph per file (the graph still adds about 130 MB for about 10 MB of
rows), then the judgement side (judgement, lookup index, finding groups), which has not been measured this way.

## The graph per file, measured and trimmed (2026-11-17)

Before building one graph table, a heap snapshot labelled every object by the graph or index field it hangs from
(collection plus graph, algorecall, vm-agent). The 3,650 graph objects' own fields came to about 8 MB, so merging them
into one table would save little. The cost was inside:

- each graph mapped every file its build touched to that file's line table, and a build touches every file of the
  component folders: 26 MB of maps. A graph only converts positions in the files it scanned; it now maps only those;
- the component index kept line tables as plain arrays; they are now packed, four bytes a line;
- elements cost about 300 bytes each (32 MB for 108,286): an object, a site object and one object per styling range,
  in arrays with spare capacity. Mounts copy their ancestor lists (9 MB). Packing these would save about 10 to 15 MB
  and changes the graph cache's format, so it is left.

| On algorecall, vm-agent | Before | After |
|---|---|---|
| collection plus component graph, held after a forced collection | 234 MB | 194 MB |
| analysis worker at rest (sampled under a 1.5 GB limit) | 1.09 GB | 1.04 GB |
| smallest heap plumber starts under | 0.95 to 1.1 GB | unchanged |

Collection results and the component graph are byte-identical on algorecall and crafting-ui.

What is left at rest is mostly the judgement side: the report assembled in the analysis entry point, judgement orders
and provenance, the worker's lookup index, and finding groups. It has not been measured field by field yet; that is
the next step.

## The judgement side, first pass (2026-11-17)

A full snapshot of algorecall's analysis worker needs more than 9.5 GB to write, so two other measures were used:
a snapshot of crafting-ui's worker (622 files, 103 MB live), labelled by owning field and variable; and, on
algorecall, a walk inside the worker after a forced collection that charges every object it can reach to the first
field reaching it (a size model; it reaches about 200 MB of the 1 GB, the rest sits in closures and object-keyed
tables).

crafting-ui by owner: the last report 18%, two per-site location-key tables 9%, the findings indexes by file, line and
column 6.5%, the per-site cache 6%, the provenance cache 5.5%, node's own code and built-ins about 25%.

Fixed:
- **One site key, not two.** Judgement and the ledger each built a string per site from its file, line, column and
  text, in two spellings. Judgement now uses the ledger's. The ledger's spelling stays as it is: it is part of the
  SARIF fingerprints that code-scanning services keep.
- **The provenance cache keeps what is read.** It kept each group's findings, which judgement never reads (it builds
  them again from the merged entries), so every provenance finding was held twice.

| algorecall, live heap of the analysis worker after a forced collection | |
|---|---|
| before | 1,015 MB |
| after | 924 MB |

Findings are identical: 2,935 before and after, with the same fingerprint over each finding's key, rule, message,
severity and every site with its ledger key and status.

Next: the provenance cache still holds 1.2 million objects on algorecall, its entries; and the findings indexes.

## The judgement side, second pass (2026-11-17)

Retained sizes (a dominator tree over crafting-ui's worker snapshot) changed the reading of the first pass: no single
holder keeps much alive alone. The session state retains 31 MB of 96; the rest is the same rows (declarations, sites,
findings) reached from the report, the classified report, the indexes and judgement at once, plus about 25 MB of
node's own code. The provenance cache's apparent size was mostly shared declarations and the decision record; its own
part is about 38,600 copied token choices, left for now.

What was a real copy: the findings index built three copies of every finding for the whole app at each index, one per
file, one per line and one per column, each with its own site lists. Only the per-file copy is read app-wide. A file's
line and column views are now built the first time that file is asked about at a line.

| algorecall, live heap of the analysis worker after a forced collection | |
|---|---|
| before | 924 MB |
| after | 811 MB |

Checked identical: the findings (2,935, same fingerprint) and every file's line and column views (2,277 files, hashed
in full in a fixed order, eager before and built on demand after).

## Open page first: design for sign-off (2026-11-17)

Status: proposed. The owner chose this direction; the layers below wait for sign-off because they change what the
analysis does at start-up and what a person sees while it fills in.

### Why

At 811 MB live on algorecall, what is left is mostly rows: declarations, sites and findings for all 3,649 files,
shared by the report, the classified report, the indexes and judgement. Collection plus the component graph is about
194 MB of it (measured outside the worker); the judgement and report side is most of the rest. A page shows a few
dozen files. Holding the judged rows for every file while a person looks at one page is the cost.

### What exists

- A per-file path: after a change, `localReport(file)` analyses one file with `Focus` (src/session/focus.ts) and is
  how a single edit stays fast.
- It is not independent. `Focus` reads products the full analysis built: the module and component graphs, the
  decision record, the unreachable-token set, the Tailwind compiler (compiled from every class in the app) and the
  shared custom-property definitions. Its own comment: "A local read uses the warm global compiler, module graph and
  token record."
- Start-up runs the full analysis, builds the classified report and indexes every finding before it says ready.
- The overlay's first requests: `decisions` (the record, from CSS), and per place `edits`, which today builds the full
  report. The reading table kept for the next start (`keep`) also builds the full report.

### What is app-wide and what is per file

| Product | Needs every file? | Plan |
|---|---|---|
| project discovery, Tailwind entry, config | no | stays at start-up |
| decision record (the theme's tokens) | no, CSS and config | stays at start-up |
| module import graph | imports of every file, cheap | stays at start-up |
| custom-property definitions written in source | every file's `--` declarations | stays at start-up (layer 2 makes it a pre-pass) |
| class sites (collection) | per file | layer 2: per page |
| component graph shards | per file | layer 2: per page |
| Tailwind compiler candidates | every class in the app | layer 2: grows as pages open |
| judgement, findings, report, indexes | per file, plus project-wide sums | layer 1: per page |
| problems list, dead tokens, coverage, the kept reading table | every file | built when asked, then let go |

### Layer 1: judge on demand

Start-up collects and builds the app-wide products as it does now, but stops before judging every file. Page
requests (`edits`, `site`, `index`, `class-site`, `text`, `props`) judge the page's files through the per-file path.
Project-wide requests (the problems list, `report`, `why`, `keep`) build the full report when asked; it is dropped
after a quiet period, so memory comes back down.

What a person sees: the page's findings as now, a little sooner; the problems list and other project-wide counts are
built the first time they are opened (on algorecall, start to ready is about 66 s today, most of it this analysis).

Proof required before it ships: for every file, the findings from the per-file path equal the full report's findings
for that file (a fingerprint per file, as used in the passes above), apart from the project-wide ones (dead tokens,
coverage), which are listed. Then the live heap after opening one page, against 811 MB.

Expected (a guess): most of the judgement and report side, several hundred MB, while no project-wide view is open.

### Layer 2: collect on demand

Collection and component shards for the page's files and what they import; the Tailwind compiler compiled for the
classes seen so far and grown as pages open; source-defined custom properties found by a pre-pass that reads only
`--` declarations. Expected (a guess): most of the 194 MB of collection and graph. Riskier: the compiler's output
for a class must not depend on which other classes were compiled with it, which is checked first.

### Order

Layer 1 first, measured and proven, then layer 2. Each is one commit with its proof.

## Layer 1, first finding: the per-file path was slow for a reason outside judgement (2026-11-17)

Before building layer 1, the per-file path was compared with the full report on algorecall: for 127 sampled files,
126 give the same findings for that file. The one difference is two ownership findings on a `Button` in
`src/pages/home/hero-legacy/HeroStudio.tsx`, which the per-file path misses; it is the same path every single-file
edit takes today, so the miss exists today after an edit to that file.

It took 2.6 s a file, 2.3 s of it in one call: the library detection (`projectFacts`) is cached for two seconds, and
each per-file read outlived the cache and scanned the project again. The analysis now holds those facts in the
session's own memory (a `libraries` phase), dropped when the session restarts; a change to `package.json` restarts
it. A per-file read is 0.3 s, which also makes every single-file edit about 2.3 s faster on algorecall today.

Full-report findings and line and column views are unchanged (same fingerprints, 2,935 findings, 2,277 files).

## Layer 1, built: the whole-app report is let go (2026-11-17)

Built differently from the design above, for a reason: start-up still runs the full analysis once (it warms the
app-wide products the per-file path reads), then lets go of the judged rows after a quiet period (60 s,
`PLUMBER_RELEASE_MS`). The same release follows any project-wide read, so one mechanism covers both. Skipping the
judging at start-up, which would also cut the start-up peak and time, is left for later.

What release drops: the full and classified reports, the findings indexes, the judgement caches, every site's
expanded declarations and the merged component graph. What it keeps: the collected files, the component shards, the
app-wide phases (compile, graphs, token record), and a summary for whole-app answers (decisions, spacing in use,
stylesheets, the files the rows came from, so the session watches the same files).

After release, page reads judge a file alone. Three causes of disagreement with the full report were found and fixed
on the way, each a bug that already showed after an edit:

- the session's file-by-file ownership judge was called without the class lookup the whole-app judge gets, so after
  the first report some component-ownership findings changed;
- judging one file recompiled Tailwind with only that file's classes, so a component's own root classes (in another
  file) had no props and ownership conflicts went unseen; it also replaced the app-wide compile. A file now reads the
  app-wide compile when it has all the file's classes;
- a file whose class strings are used only where other files import them was not judged alone at all (the full report
  was rebuilt); it is now judged from its own slice plus the collections of the files that import it.

A stylesheet is still answered by the full report when nothing has changed: its variables and colours are judged
against every file that uses them. Asking about one rebuilds the report, held until the next quiet period
(in the proof run, a stylesheet in the sample took the worker back to 1,148 MB until its release).

The reading table kept for the next start is written while a full report exists and skipped otherwise.

| algorecall, live heap of the analysis worker after a forced collection | |
|---|---|
| with the full report | 866 MB |
| released | 556 MB |
| released, after judging 456 files one at a time | 638 MB |

A file judged alone takes 39 ms on average (2.6 s before the session held library facts and reused the compile).
Proof: for all 456 sampled files, the findings judged alone equal the full report's findings for that file (fingerprint
over key, rule, message, severity, status and every site with its ledger key and status).

## Judge each input once: design for sign-off (2026-11-17)

Status: proposed. The owner picked this from four larger directions (judge each input once, one query engine, a
content-addressed fact store, a native core).

### Measured on algorecall (vm-agent, one full analysis)

| What | Count |
|---|---|
| judged declarations | 304,612 (256,863 from classes, 36,131 inline, the rest from stylesheets) |
| class sites | 255,132 |
| distinct (class as written, variant conditions) | 26,419, about 11 times fewer |
| distinct (property, value, conditions, origin) | 22,396, about 14 times fewer |
| distinct, adding the owning component's name | 32,819, about 9 times fewer |
| findings | 2,935 over 75,063 sites; provenance is about 95% of the sites |

Full-analysis time by phase (the same run): component discovery 13.4 s, provenance 8.6 s, project discovery 3.6 s,
class existence 3.5 s, expanding class sites into declarations 3.5 s, stylesheets 2.3 s, habits 2.1 s. Start to
ready is about 66 s.

### What a verdict depends on

A provenance verdict (src/rules/provenance.ts) reads: the family, the property, the value, the origin, whether it is
opaque or a runtime step, the class as written (some titles quote it), the decision record and the project's
definitions (both app-wide), and the Tailwind variables set locally on the same element (`variablesFor`: only
`--tw-*` declarations in the same file, owner and conditions; usually none). Nothing else about the site. So two sites
with the same class, conditions and local variables get the same verdict, and the site only decides where the
finding is drawn.

### The design

1. **A verdict table per rule family.** The key is exactly the inputs above, with the local-variable scope as a
   signature. Judging a declaration is a table lookup; a miss judges it once. The site keeps a pointer to its verdict,
   and a finding is a verdict with its list of sites, which is the shape findings already have (grouped by key).
   Provenance first: it is 8.6 s and 95% of the finding sites.
2. **Expansion once per class.** Today each class site copies every declaration of its class with the site's own
   fields (256,863 objects). A site becomes a pair (site, class's declarations) and the copy is made only when a
   reader needs the object.
3. **Existence once per class.** Whether a class exists is a property of the class and the compile, not the site.
4. **The same rule for component discovery (13.4 s).** The graph is built file by file, and each file resolves again
   the components it shares with thousands of others. Resolutions and identities already outlive one file; the
   rest of the per-file work would be keyed by the component, not the importing file. This needs its own reading
   before a design.

### Proof required

The full report's findings, fingerprinted as in the passes above (every finding and site, with ledger key and
status), identical before and after, on algorecall and crafting-ui; and the per-file proof (456 files) still equal.

### Judge each input once, provenance built (2026-11-17)

Built: provenance's per-declaration judgement is a function of its true inputs, kept in a table per family for the
run (in the resolution context every cluster shares). A declaration builds its key, reuses the verdict or judges once,
and replays its own effects (its resolved value, the numeric spacing it uses, the coverage counts).

Measured, and the estimate was wrong. The phase went from 8.6 s to 7.0 s, not to about 1 s. A CPU profile of
start-up showed why: once verdicts are judged once, judging them is 0.24 s; the rest of provenance is per-declaration
bookkeeping around them: string keys built with JSON for every declaration (the verdict key, the variable scope, the
site location), linking each declaration to its definitions (0.49 s), grouping findings (0.5 s), and ordering
declarations (0.45 s). Two of those were cut here: the variable scope is built only in files that set `--tw-*`
variables on an element, and the verdict key is joined, not serialised. The rest is the same lesson as the memory
work: rows described by strings, one at a time. Numbers for sites and contexts, not strings, is where the remaining
time is.

Proof: algorecall's full report (2,935 findings) and crafting-ui's (927), fingerprinted over every finding and site,
identical before and after; algorecall's line and column views identical; all 456 sampled files still give the same
findings judged alone.

## Component discovery, first pass (2026-11-17)

A CPU profile of start-up on algorecall: 10.6 s under the component graph build. 4.1 s was resolving the exports of
every module in the component folders, again for each of the 3,649 per-file builds (each answer cached, but asked
millions of times through fresh string keys); 2.0 s parsing files again and 0.8 s reading them; 0.7 s putting each
graph's results through the string table, mostly the same component identities in every graph.

Built: within one build of the graph, each component module's enumeration is recorded once (the identities it found
and the re-exports it followed) and replayed for every later file, taking a replayed identity's root ranges and
fingerprint classes from the session's cache exactly as the cached path does. Identities go through the string table
once, when they are made.

Found on the way, left as it is: a component's root class ranges reach the session's cache only from a build that
keeps the component in its graph. A component first found while building a file that does not keep it is, in every
later file's graph, missing its root ranges; which components that happens to depends on the order files are built.
A first replay that recorded the ranges at discovery changed 77 ownership findings on algorecall, so it was not kept;
the order-dependence is in the backlog.

Proof: the component graph, whole and file by file, byte-identical to this morning's baseline on algorecall and
crafting-ui; full-report findings identical (2,935 and 927). Component discovery: 13.4 s to 9.5 s.

## Component discovery, second pass (2026-11-17)

After the first pass, a profile put 7.5 s under the graph build: scanning each file's JSX and resolving each
element's component 3.2 s, parsing files again about 2.5 s, reading them 0.8 s, the rest spread thin. The parsing and
reading existed because shards were built after collection had let go of each file's parsed code.

Built: a whole-app collection builds each file's component shard right after collecting it, reading the file's text
and parsed code from what collection still holds; the graph build then only builds shards that are missing (after an
edit). Shards are built in the same order as before.

Proof: on algorecall and crafting-ui, the session's merged component graph (components, used, elements, mounts,
usages, fingerprinted), the full-report findings and the line and column views are identical before and after; 127
sampled files judged alone match the full report.

Measured, start to ready on algorecall: 60 and 63 s before, 58, 59 and 60 s after. About 2 s, close to the
run-to-run spread; less than the 3 s of parsing and reading the profile showed, because part of that work moved into
collection rather than going away. What is left in component discovery is mostly resolving each JSX element's
component (about 3 s).

## The page after a quiet minute (2026-11-18)

The moments bench (bench/moments) found the cost of layer 1: on algorecall the first page read after the report was
let go took 19.3 s. Four of the home page's ten files set CSS variables inline (`--face`, `--busy-lap`), and `site`
answered such a file from the whole-app report, which after a release meant rebuilding it (16 to 18 s each).

Judged alone, 109 of 111 such files already matched the full report; two lost colour findings. The cause was what a
file judged alone could see, not which files share variables (a first rule built on that was wrong and was removed):

- where a variable is defined: `DueStack.tsx` reads `var(--lit-ink)`, defined in `today.css`, the app's own
  stylesheet; judged alone, the project's own files were only the one file, so that definition did not count. The
  per-file runtime now gives provenance the project's full file list (`projectFiles`);
- what reads a variable the file sets: `AchievementCard.tsx` sets `--track-hex`, which `card-effects.css` reads in a
  background; that reading makes it a colour. The per-file runtime now brings stylesheet declarations that read the
  file's own variables, and judges them with it (`alsoJudged`).

`site` now reads such a file alone after a release; stylesheets and files that define the theme's decisions still
read the whole-app report.

Proof: all 111 variable-setting files on algorecall, findings and declarations, identical judged alone; a 456-file
sample identical; full reports on algorecall and crafting-ui unchanged (findings, component graph, line and column
views).

Bench, two rounds, this morning's build against this: algorecall page after a quiet minute 19.3 s to 1.5 s, memory
there 1,971 MB to 1,509 MB (this morning's build still runs out of memory at start). crafting-ui as before: edit
0.77 s to 0.11 s, memory after a quiet minute 921 MB to 513 MB. Not explained: algorecall's page right after start
read 1.5 s in this run against 1.0 s in the first, through code this change does not touch; the next run will say
whether that is the machine.

## Expected (guesses until measured)

Provenance from 8.6 s to about 1 s, expansion and existence from 7 s to about 1 s: about 13 s off start-up and off
every full report. Memory: fewer copied declaration objects; the size is not measured.

### Order

Provenance's verdict table first, measured and proven, then expansion, then existence; component discovery after its
own reading.

## Judge each input once, provenance built (2026-11-17)

Built: provenance's per-declaration judgement is a function of its true inputs, kept in a table per family for the
run (in the resolution context every cluster shares). A declaration builds its key, reuses the verdict or judges once,
and replays its own effects (its resolved value, the numeric spacing it uses, the coverage counts).

Measured, and the estimate was wrong. The phase went from 8.6 s to 7.0 s, not to about 1 s. A CPU profile of
start-up showed why: once verdicts are judged once, judging them is 0.24 s; the rest of provenance is per-declaration
bookkeeping around them: string keys built with JSON for every declaration (the verdict key, the variable scope, the
site location), linking each declaration to its definitions (0.49 s), grouping findings (0.5 s), and ordering
declarations (0.45 s). Two of those were cut here: the variable scope is built only in files that set `--tw-*`
variables on an element, and the verdict key is joined, not serialised. The rest is the same lesson as the memory
work: rows described by strings, one at a time. Numbers for sites and contexts, not strings, is where the remaining
time is.

Proof: algorecall's full report (2,935 findings) and crafting-ui's (927), fingerprinted over every finding and site,
identical before and after; algorecall's line and column views identical; all 456 sampled files still give the same
findings judged alone.

## Component discovery, first pass (2026-11-17)

A CPU profile of start-up on algorecall: 10.6 s under the component graph build. 4.1 s was resolving the exports of
every module in the component folders, again for each of the 3,649 per-file builds (each answer cached, but asked
millions of times through fresh string keys); 2.0 s parsing files again and 0.8 s reading them; 0.7 s putting each
graph's results through the string table, mostly the same component identities in every graph.

Built: within one build of the graph, each component module's enumeration is recorded once (the identities it found
and the re-exports it followed) and replayed for every later file, taking a replayed identity's root ranges and
fingerprint classes from the session's cache exactly as the cached path does. Identities go through the string table
once, when they are made.

Found on the way, left as it is: a component's root class ranges reach the session's cache only from a build that
keeps the component in its graph. A component first found while building a file that does not keep it is, in every
later file's graph, missing its root ranges; which components that happens to depends on the order files are built.
A first replay that recorded the ranges at discovery changed 77 ownership findings on algorecall, so it was not kept;
the order-dependence is in the backlog.

Proof: the component graph, whole and file by file, byte-identical to this morning's baseline on algorecall and
crafting-ui; full-report findings identical (2,935 and 927). Component discovery: 13.4 s to 9.5 s.

## Component discovery, second pass (2026-11-17)

After the first pass, a profile put 7.5 s under the graph build: scanning each file's JSX and resolving each
element's component 3.2 s, parsing files again about 2.5 s, reading them 0.8 s, the rest spread thin. The parsing and
reading existed because shards were built after collection had let go of each file's parsed code.

Built: a whole-app collection builds each file's component shard right after collecting it, reading the file's text
and parsed code from what collection still holds; the graph build then only builds shards that are missing (after an
edit). Shards are built in the same order as before.

Proof: on algorecall and crafting-ui, the session's merged component graph (components, used, elements, mounts,
usages, fingerprinted), the full-report findings and the line and column views are identical before and after; 127
sampled files judged alone match the full report.

Measured, start to ready on algorecall: 60 and 63 s before, 58, 59 and 60 s after. About 2 s, close to the
run-to-run spread; less than the 3 s of parsing and reading the profile showed, because part of that work moved into
collection rather than going away. What is left in component discovery is mostly resolving each JSX element's
component (about 3 s).

## The page after a quiet minute (2026-11-18)

The moments bench (bench/moments) found the cost of layer 1: on algorecall the first page read after the report was
let go took 19.3 s. Four of the home page's ten files set CSS variables inline (`--face`, `--busy-lap`), and `site`
answered such a file from the whole-app report, which after a release meant rebuilding it (16 to 18 s each).

Judged alone, 109 of 111 such files already matched the full report; two lost colour findings. The cause was what a
file judged alone could see, not which files share variables (a first rule built on that was wrong and was removed):

- where a variable is defined: `DueStack.tsx` reads `var(--lit-ink)`, defined in `today.css`, the app's own
  stylesheet; judged alone, the project's own files were only the one file, so that definition did not count. The
  per-file runtime now gives provenance the project's full file list (`projectFiles`);
- what reads a variable the file sets: `AchievementCard.tsx` sets `--track-hex`, which `card-effects.css` reads in a
  background; that reading makes it a colour. The per-file runtime now brings stylesheet declarations that read the
  file's own variables, and judges them with it (`alsoJudged`).

`site` now reads such a file alone after a release; stylesheets and files that define the theme's decisions still
read the whole-app report.

Proof: all 111 variable-setting files on algorecall, findings and declarations, identical judged alone; a 456-file
sample identical; full reports on algorecall and crafting-ui unchanged (findings, component graph, line and column
views).

Bench, two rounds, this morning's build against this: algorecall page after a quiet minute 19.3 s to 1.5 s, memory
there 1,971 MB to 1,509 MB (this morning's build still runs out of memory at start). crafting-ui as before: edit
0.77 s to 0.11 s, memory after a quiet minute 921 MB to 513 MB. Not explained: algorecall's page right after start
read 1.5 s in this run against 1.0 s in the first, through code this change does not touch; the next run will say
whether that is the machine.

## Expected (guesses until measured)

- Step 1 removes most of the 781 MB of trees and a share of the 234 MB that points into them.
- Steps 2 and 3 remove the per-file sets and most repeated path strings.
- Taken together, an app of algorecall's size resting in the hundreds of megabytes looks realistic. That claim needs
  the same heap profile, on vm-agent, after each step.

## Order

Each step is one layer, measured before and after on algorecall on vm-agent with the same heap profile, and committed
on its own:

1. Per-file facts for the component pass (the largest share).
2. Per-file facts for class collection, so `shared.programs` goes away.
3. File numbers and flat links; the reach cache goes away.
4. The text once.
5. Columns for sites and findings.
6. The open page first.
7. Changes between threads.

Steps 1 to 3 are the memory. Steps 4 to 7 are smaller or change behaviour the person sees (6), and each waits for a
profile that says it is worth doing.

## Risks

- **Questions that need the tree come back slower.** Parsing a file again costs milliseconds; a question that touches
  hundreds of files would pay that hundreds of times. Each step lists the questions it moves to parse-on-demand, with a
  timing on algorecall.
- **Facts go stale.** A fact is valid for one text of one file. The file's hash keys its facts, as it keys the cache
  today.
- **The component pass is subtle.** It follows bindings, re-exports and stars across files. Step 1 must keep its
  results identical; the check is the component graph on algorecall and crafting-ui before and after, compared
  whole.

## Not known

- How much of the 234 MB is held only through tree nodes, and how much is identities that stay. The profile after
  step 1 says.
- Whether oxc's raw transfer (reading the parser's buffer without building JavaScript objects) is fast enough to fill
  the facts directly. If it is, step 1 never builds the trees at all.
- How many questions need more than the facts. Counted while writing step 1.
