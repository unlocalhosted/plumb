# Engine review 2: class-site, the pinned writers, batch undo, recipes

Review only (2026-11-03). Nothing changed, nothing committed. Scope: the engine commits since b159ac8 (the previous review,
docs/research/engine-review.md): 31fb116 (review fixes), 3d05c20 (spacing `own`, `text-[clamp()]`), 2e3451e (class-site,
`at` pins, recipe mapping, dark values, idioms, batch undo, readSpacing). Line numbers are from the tree as read today.

Severity: **bug** (wrong write, wrong read, or a refusal that should not happen), **risk** (right today, wrong under a
likely input or timing), **design** (shape or boundary that will cost more later), **nit** (small, safe).

Proof: every finding marked *run* was reproduced with a throwaway e2e repro against the built dist,
`/private/tmp/claude-501/-Users-vijaysingh--claude-spares-spare-vzhCpS/f8e9839e-2f17-48c8-a49a-ffeae6eeae2f/scratchpad/review2.test.mjs`,
run as `node review2.test.mjs` from that directory (it serves a project made under `fixtures/.review2-*`, removed after).
The fixture's App.tsx is quoted inline where it matters. Findings marked *reasoned* were not run.

## The five concerns asked about

| | verdict | finding |
|---|---|---|
| (a) identifier keys of `clsx({ hidden: x })` skipped | **confirmed, missed site** | B5 |
| (b) `memo(function Inner)` names the component `Inner` | **confirmed, and it mis-places the add** | B2 |
| (c) `styles={{ root: 'p-4' }}` read as `styles.root` reports keys as classes | **confirmed** (string-literal keys) | B4 |
| (d) `{ className, ...rest }` + `{...rest}` still followed to the usage's className | **confirmed, wrong write** | B1 |
| (e) `undoBatch` checks outside `serialize` | **confirmed race, bounded damage** | R1 |

---

## Bugs

### B1 · class-site.ts:122, :190–196 a rest spread is followed to a prop the component kept — **bug (wrong write)** *run*
`binds()` answers `{ key: null }` for `...rest`, which `follow()` reads as "the whole props object, so `className` is in
it". It is not when a sibling of the rest pattern took it. With

```jsx
function Row({ className, ...rest }) { return <div className={className}><a {...rest} /></div>; }
<Row id="row" href="/one" className="flex gap-2 p-3">row</Row>
```

GET class-site for the `<a {...rest}>` with the `<Row>` usage in `chain` reports `flex gap-2 p-3` as the `<a>`'s classes,
written at the usage, and `add` points there too. The write then lands on the wrapper `<div>`'s classes while the card
shows the `<a>`:

```
(d) classes reported for <a {...rest}>: [ 'flex', 'gap-2', 'p-3' ] add: {"kind":"usage","prop":"className",...}
(d) write status 200 ["swap:12:7"]
(d) file now has:       <Row id="row" href="/one" className="flex gap-2 p-s4">row</Row>
```

*Fix:* `binds()` returns the sibling keys with a rest binding (`{ key: null, except: ['className'] }`), `Binding` carries
them, and `follow()` stops when the prop it wants is in `except` (push it to `unfollowed` so the refusal still says
"it comes in through `className`"). Same for `const { className, ...rest } = props` in `bindingOf()` (:215–219).

### B2 · class-site.ts:237–246 the inner function's name beats the declarator's — **bug (refusal, then a wrong add)** *run*
`componentOf` takes `fn.id.name` first and only fills the declarator's name when there is none (`name ??=`). For
`const Panel = memo(function Inner({ className }) …)` the component is `Inner`, `usesComponent` never matches `<Panel>`,
and the class is refused as built in code. Worse, `add` then falls through to the component's own string, so "add a class
to this Panel" writes into every Panel:

```
(b) p-4: {"class":"p-4","sites":[],"refused":"p-4 is built in code, so it can't be changed here (it comes in through `className`)."}
    add: {"kind":"own","element":{"tag":"div","line":4},"string":{"text":"rounded-card "}}
```

*Fix:* `Component` carries every name the function answers to (`names: string[]`: the inner id, the declarator, the
default export) and `usesComponent` matches any. For the add: when the element reads a prop that the chain did not reach
(`unfollowed` non-empty), do not fall back to the component's own string silently; set `addRefused` ("the class comes in
through `className`; the usage was not found") or at least mark the add `shared: true`.

### B3 · props.ts:216, :333, :414 a class in one branch of a ternary is read as worn, and set in that branch — **bug (wrong read, write in one case)** *run*
Before 2e3451e a `className={tone ? … : …}` was `dynamic` and the card said so. Now `classNameOf` takes every branch
string via `stringsIn`, `elementProps` builds `present` from all of them without the branch, and `setProp` writes into the
one string that holds the property:

```
(g) padding prop on tone ? "flex gap-s2 p-s3" : "grid": {"value":"12px","token":"s3","source":"class","class":"p-s3"}
(g) set status 200 ["set:padding"]
(g) file now has:       <div id="tern" className={tone ? 'flex gap-s2 p-s4' : 'grid'}>x</div>
(g) padding prop on tone ? "p-s3" : "p-s2": {"value":"12px","token":"s3","source":"class","class":"p-s3"}
```

The card shows 12px padding on an element that, with `tone` false, has none; the write changes the other case. (The
both-branches case is refused correctly by `severalCases`: `400 This is written in more than one place here (once for each case of `tone`)`.)
The same reading feeds `classNamesOf` (props.ts:540), which `src/recipes/plan.ts:149, :177, :302` use: `describeElement`
reports a `hover ? 'shadow-lg' : 'shadow-sm'` as resting `shadow-lg`, and `existingAll` (:319, :380) drops a wanted class
that is only in the other branch from `to`, the very mistake `swapClasses` stopped making for itself (*reasoned*).

*Fix:* carry `branch` through `classes()` into `Prop` (`{ source: 'class', class, branch }`), and in `elementProps` treat
a branch class as `computed`/`none` for the value (the page's `computed` says what applies) while listing it as "set when
`tone`". `setProp` refuses a branch class without a pin (same words as `severalCases`). `classNamesOf` gains
`branches` or filters to unconditional strings for the recipes' reading.

### B4 · props.ts:183–189 object keys are classes for every attribute, not only for a class helper — **bug (wrong read)** *run*
`classSources` turns the string-literal keys of any `ObjectExpression` into classes. It is applied to every attribute at a
usage (`elementSources`, :560), so a component that reads `styles.root` and a usage that passes
`styles={{ 'root': 'p-4 flex' }}` reports `root` as the class, under the condition `'p-4 flex'`:

```
(c) classes reported: [{"class":"root","sites":[["usage","styles","root",{"condition":"'p-4 flex'","which":"then"}]]}] add: null
```

The ref's `property` (`root`) is dropped in `follow()` (:102, `binding.prop ?? ref.property` keeps it only when the whole
props object was bound), so the real string `p-4 flex` is never found. With an identifier key (`{ root: 'p-4' }`) nothing
is reported, which is at least honest.

*Fix:* objects are class holders only as an argument of a class helper (move the `ObjectExpression` case under the
`CallExpression` branch, keyed by helper). A `MemberExpression` ref keeps `property` as a path (`['styles','root']`);
at the usage, `follow` walks the attribute's object by that path and takes the value there as the string.

### B5 · props.ts:185 identifier keys of a class-helper object are skipped — **bug (missed site)** *run*
`clsx('flex', { hidden: !open, 'text-red': bad })` reports `flex` and `text-red`; `hidden` has no site and is refused as
built in code. Identifier keys are the common spelling (`{ active, hidden, block }`):

```
(a) classes reported: [ 'flex', 'text-red' ] add: flex
```

This is the other half of B4: once objects count only inside a helper, both key kinds are safe to read there (`cva`'s
config object is then not visited at all, which is right: its keys are variant names). Note an identifier key has no
quotes, so `stringAtOffset` would not find it for a pin: the site needs `string.quote` absent and `rewriteString` must
re-quote when the new name is not an identifier (`hidden` → `'text-red-500'`).

### B6 · props.ts:436–440, engine.ts:1164, :1321 the pinned write trusts `at` whole — **bug (wrong write from a stale or wrong pin)** *run*
With `at`, `swapClasses` rewrites whatever plain string holds the offset: it does not check that the string is a class
string (a `className`/`class` value, a helper argument, a variable a className reads), nor that it belongs to the element
at `line, column`, nor (for an add, `from: ''`) that it is unconditional. All three are only promised by the client:

```
(i) add into else-branch status 200 ["swap:16:7"]
(i) file now has:       <div id="tern" className={tone ? 'flex gap-s2 p-s3' : 'grid pt-2'}>x</div>
(j) add pinned into href status 200 ["swap:12:7"]
(j) file now has:       <Row id="row" href="/one pt-2" className="flex gap-2 p-3">row</Row>
```

The file hash guards staleness of the file, not of the pin: a client that computed `at` from an earlier answer of another
element, or an off-by-one column, writes into the wrong string and `applied` still names the element. Every other writer
here re-derives its target from the source ("never trust a client range"); the pin path does not.

*Fix:* the pin path asks `classSites({ element, chain: [] })` (or `elementSources` + `bindingOf`) for the strings the
element can reach in its own file and accepts the pin only when it is one of them, with its `branch`; an add
(`from` empty) into a string with a branch is refused with `ADD_UNDER_CONDITION`. Then the `at` is an index into a known
set, not a free offset.

---

## Risks

### R1 · engine.ts:1537–1543 `undoBatch` checks every file, then undoes each member in its own `serialize` — **risk (half-undone batch)** *reasoned*
The hash checks run outside the queue, then `undo(member)` is queued once per member. Between two members any write
queued by another caller (a dial tick writing the theme, a swap on the element file) runs. Then the second member refuses
("changed since this write") while the first is already back: one file restored, one not, the batch id still in history
with one member, and the caller gets the second file's error only. The promise in the comment ("every file is checked
before any is written") holds only without concurrency. Damage is bounded: nothing of the user's is overwritten, the
refusal is honest, and a second undo of the same id finishes the job.

*Fix:* one `serialize` around the whole batch: split `undo()` into the queued shell and an `undoOne(entry)` that assumes
the lock, and have `undoBatch` call `undoOne` for each member inside a single `serialize`. Also restore in one go per file
and `reconcile` once at the end.

### R2 · engine.ts:1462 history eviction can split a batch — **risk (silent partial undo)** *reasoned*
`record` keeps the last 20 writes by count. A recipe batch is two or three adjacent entries; after 18 more writes its
oldest member is spliced away. `undo(batchId)` then finds the remaining member(s), undoes them, and answers
`{ undone: batchId }` as if whole: the theme token stays changed while the class is gone. `history()` does show
`files: [one file]`, but nothing says the batch lost a member.

*Fix:* evict whole batches (when the oldest entry has a `batch`, drop every entry of that batch), or refuse to undo a batch
whose member count is less than recorded (`batch.size`).

### R3 · class-site.ts:144–147 a variable shared by several elements is "the narrowest string that always applies" — **risk (a write that changes other elements)** *run*
When the element's only unconditional string is a variable (`className={look}`, or `cn(look, on && 'x')`), `add` points
into the variable, and the write changes every element that reads it:

```
(f) add: {"kind":"variable","variable":"look","string":{"text":"px-2.5 py-1 rounded","line":3}}
(f) file now has: const look = 'px-2.5 py-1 rounded pl-3';
```

Changing a class in a variable is already by design (N-02) and the site says `kind: 'variable'` so a card can warn; the
add does not say "this changes N elements". *Fix:* count the variable's readers in the file (`Identifier` references with
the same binding) and put `readers: n` on the site and the add; the add prefers a non-variable string, and a card refuses
or warns when `readers > 1`.

### R4 · class-site.ts:252–253 a usage matches by tag name before its import — **risk (wrong usage on a same-name component)** *reasoned*
`usesComponent` answers true as soon as the tag's last segment equals the component's name, without looking at the
import. Two components named `Card` in different files, both on the ancestor chain (a list's `Card` wrapping a
`ui/Card`), resolve to the nearest usage named `Card`, whichever file it came from. The chain is real ancestors, so this
needs two same-named components nested, which design systems do produce (`Card` wrapping `Card` from `@/ui`).

*Fix:* when the usage file imports the tag, require the import's source to name the component's file (the resolver has
both `file` strings: compare the import specifier's basename with the element file's basename, or let the caller pass a
resolved module path per link). Fall back to the name only when there is no import (same file).

### R5 · class-site.ts:107 a usage that spreads its props is "does not pass it" — **risk (silent refusal)** *reasoned*
`<Panel {...props}>` has no `className` attribute, so `follow` returns without pushing to `unfollowed`; the class is
refused as "built in code" with no "comes in through" hint, and the chain above (where `props` came from) is never
walked. *Fix:* when the usage has a spread and no attribute, follow the spread the same way the element's own spread is
followed (`elementSources(...).spreads` → `bindingOf` → next link).

### R6 · recipes/plan.ts:149–151, :319, :380 the recipe plan reads and writes classes without class-site — **risk, and the design claim is not yet true** *reasoned*
class-site.ts says it is "the one resolver both cards and the recipe plan ask". No caller in `src/recipes` or `overlay/src`
calls it yet (grep: only `engine.ts` and the e2e). The plan still uses `classNamesOf` + `swapClasses` with no chain and no
branch (see B3 for what that reads wrong), so a recipe on a `<Button>`'s inner element writes nowhere or into the
component. Until the plan takes `{ element, chain }` and asks `classSites` for `add`/sites, two resolvers exist again.

---

## Design

### D1 · class-site is a pure data module: good. One parse per file would make it cheap — **design**
`classSites` takes texts and answers plain data, and nothing in it does I/O (engine.classSite reads the files). Right
shape. But a file is parsed four times per call: `open()` (oxc), `jsxLocation` (own parse), `elementSources` →
`findOpening` (parse again), and on the write `stringAtOffset` parses once more. For a chain of three links that is
twelve parses of real files per card open. *Fix:* `elementSources` and `stringAtOffset` take a `Parsed` (program + text)
instead of `(file, text)`; `jsxLocation` can take the program too.

### D2 · props.ts:103 `wrappers` and the object rule are two idioms in one function — **design (open/closed)**
`classSources` knows a fixed set of helper names and one rule for objects. `cva`, `tv` (tailwind-variants), `cx` from
`class-variance-authority`, and `clsx` hold classes in different places (first argument; `variants` values; keys). A
table `helper → { args: 'all' | 'first', objects: 'keys' | 'values' | 'none' }` makes a new helper one row and lets B4/B5
be fixed per helper rather than globally. `src/recipes/project.ts:310` already has a second list of the same helpers
(`helpers`), with a third spelling in `Idioms.classes`; one table shared by both would be the data-oriented shape.

### D3 · `ClassRef.property` is a one-level string; the usage side ignores it — **design**
`{ name, property }` fits `props.className` and nothing else. `styles.root`, `props.classNames.root`, `theme.card` all
need a path, and `follow` needs to walk the usage's value by it. Make it `path: string[]` (B4's fix) and the shape stops
lying.

### D4 · engine.ts:1503 a batch id and a write id share one namespace and one `undo` entry point — **design**
`undo(id)` first looks for members of a batch, then for a write; a member can still be undone alone by its own id
(history never shows it, so only a client that kept the handles from `recipesApply.undo` before `asOneWrite` could). Fine
today; when `undoChanges` (:1600) meets a batch it will need the same two-level lookup. Keep one `Recorded` per file, but
give the batch its own list (`batches: Map<id, { label, members }>`) instead of a back-pointer on each member, so
eviction (R2), history and undo all read one structure.

### D5 · methods.ts `class-site` is `read: true` and reads files outside the queue — **design (nit-level today)**
`classSite` reads the element file and each chain file with `readFile` directly, not through the worker or `serialize`.
In a read cohort with a write queued, the element file and a chain file can come from different generations; the
per-file `hashes` make the later write refuse, so nothing wrong lands. Worth a one-line comment, or `serializeRead`.

### D6 · recipes/project.ts `isDark` and `writeDark` pick a block by regex — **design**
`isDark` (`stylesheet.ts:57`) matches `dark\b` after a separator: `.dark`, `[data-theme="dark"]`, `@variant dark`,
`@custom-variant dark (…)`, `.dark-mode`. A `@custom-variant dark` block has no custom decls so it is harmless, and
`[data-theme="darkblue"]` is correctly not dark. But a project whose dark selector is `[data-mode="night"]` or
`.theme-contrast` gets "no dark block" and its dark value is silently a note. The project's own dark selector is readable
from its `@custom-variant dark (…)` or `@variant` line; read it once into `Idioms` (with `evidence`, like the others) and
let `isDark` take it.

---

## Nits

- **class-site.ts:116–121** `ownProp` falls back to `className` when the element has `class` only in Preact; the spread
  ref hard-codes `property: 'className'` (:563). Use `ownProp` there.
- **class-site.ts:93** `maxDepth = 8` guards `follow` and `bindingOf` separately; a self-referencing `const a = cn(a)`
  is caught by depth, not by a seen-set. A `Set<offset>` is cheaper and gives a clear refusal.
- **engine.ts:170–176** `offsetOf` accepts a column past the line's end and lands on the next line; with B6 fixed this
  stops mattering, until then clamp to the line.
- **props.ts:206** `classNameOf`'s "dynamic" reasons still say "a condition" for a ternary that now has static strings;
  the message is unreachable for that case and the comment above (:201) still describes the old rule.
- **e2e/class-site.test.mjs** covers `Row({ to, ...props })` (correct) but not `Row({ className, ...rest })` (B1), nor
  `memo(function Inner)` (B2), nor an element whose only string is a shared variable (R3). The repro file above has all
  three and can be moved into the suite once the fixes land (as e2e, against the server, as the brief asks).
- **31fb116 / 3d05c20** (recipeContext cache keyed by `size:mtimeMs` + generation; `own` on the spacing base;
  `text-[clamp()]` as a size): read, nothing wrong found. The cache misses an external edit that keeps size and mtime
  within the same millisecond, which is not a real input.

## Suggested order
1. B6 (the pin is validated against the element's reachable strings) — it turns B1, B3's write and R3 from wrong writes
   into refusals even before their reads are fixed.
2. B1, B2 (rest-exclusion and component names) with their e2e cases.
3. B3 (branch on `Prop`, `setProp` refuses a branch class without a pin, `classNamesOf` filters for the recipes).
4. B4 + B5 + D2 + D3 together (one helper table, objects only inside helpers, `path` on refs).
5. R1 + R2 + D4 (one lock around a batch, whole-batch eviction).
6. R6 (the plan asks class-site), then R3, R4, R5.
