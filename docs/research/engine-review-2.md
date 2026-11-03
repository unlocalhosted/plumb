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

## Re-review (3d5a28b, fc0f9a9)

Read as `git show` of the two commits (the working tree's engine.ts carries another session's hunks, not reviewed). The
three touched suites run one at a time against the current dist: `node --test e2e/class-site.test.mjs` 20/20,
`node --test e2e/recipes.test.mjs` 14/14, `node --test e2e/props.test.mjs` 4/4. New probes are in the scratchpad,
`/private/tmp/claude-501/-Users-vijaysingh--claude-spares-spare-vzhCpS/f8e9839e-2f17-48c8-a49a-ffeae6eeae2f/scratchpad/rereview2.test.mjs`
(cases 1–10) and `rereview2b.test.mjs` (offsetOf), run as `node --test <file>` from that directory; the fixture files are
quoted inline where a result depends on them.

### The findings

| | verdict | proof |
|---|---|---|
| B1 rest spread keeps className | **fixed** | `binds()` returns `except` for a rest pattern; `bindingOf` merges `except` through `const { a, ...rest } = props` chains; `follow` returns when the prop is in `except`. e2e "B1" asserts `classes: []` and `add.kind !== 'usage'` for both `Row({ className, ...rest })` and `const { className, ...rest } = props`. |
| B2 `memo(function Inner)` | **fixed (server), partly (overlay)** | `componentOf` returns `names` (declarator first, then the inner id); e2e "B2" finds `p-4` at the `<Panel>` usage and, without the chain, `add.shared === true`. The overlay never reads `add.shared` (`grep -n shared overlay/src/locate.js` matches only the design-system path filter), so an add on a component element with no chain still goes into the component's own string silently. See N6. |
| B3 branch read as worn | **fixed** | `elementProps` builds the value from `always` only and lists a branch class as `{ class, branch, at }`; `setProp` refuses without a pin (`oneCase`), takes the pin into the branch. e2e "B3" (class-site), props test "set writes into cn(...)" (now refuses `font-medium` under `on &&` unpinned, 200 with `at`), recipes "B3 in the recipes". |
| B4 object keys as classes | **fixed** | `classSources` visits an `ObjectExpression` only under a helper with `objects: 'keys'`; refs carry `path`, `classSourcesAt` walks the usage value by it. e2e "B4 + D3" reads `styles={{ 'root': 'p-4 flex' }}` as `p-4 flex` at prop `styles`, writes `p-4 → p-6` there with `of`. |
| B5 identifier keys skipped | **fixed** | identifier and shorthand keys are strings with `key: 'identifier' \| 'shorthand'`; `rewriteString` re-quotes. e2e "B5": `hidden` under `!open`, `hidden → sr-only` writes `'sr-only': !open`, `active → is-active` writes `'is-active': active`. |
| B6 pin trusted whole | **fixed** | `Session.pinned` → `pinnedString` resolves the element (or `of`) and takes the pin only when it is a string found for the written holder; an add into a branch or a shared variable is refused there. e2e "B6": add into the else branch 400 (/condition/), pin into `href` 400, pin into `#both`'s string sent with `#tern` 400, the single `swap` the same, the right pin 200. `set` keeps its own check against the element's own strings (`NOT_ITS_STRING`), which is all `elementProps` can hand out. |
| R1 undoBatch outside the lock | **fixed** | `undo()` enters `serialize` first, then `undoBatch` → `undoOne` per member; a member that fails leaves the rest in `batches` for a second undo. e2e "R1" races an undo against a token write six rounds and asserts both files back or neither. |
| R2 eviction splits a batch | **fixed** | `evict()` drops a batch whole when its oldest member is the oldest entry; `undoBatch` refuses when a member is missing. e2e "R2": 19 writes after a two-file recipe, the batch id gone from history, undo 400, files unchanged. |
| R3 add into a shared variable | **fixed (server), bypassed (overlay)** | `readers()` on the site and add; `classSites.add` skips a variable with `readers > 1` (`addRefused` names it), `pinnedString` refuses an add there. e2e "R3": `add: null`, `readers: 2`, add 400, change 200. The overlay's "kin" rule sends the add as a swap, which the server accepts into the variable: N5. |
| R4 usage by name before import | **partly** | an imported tag must resolve to the component's file (`sameModule`); e2e "R4" proves the skipped-chain case. The fallback `component.names.includes(last)` still fires for a tag not imported in a *different* file (N2), and `sameModule` equates a scoped package with a local basename (N3). And the file check now refuses barrel imports (N1). |
| R5 usage that spreads | **fixed** | `follow` walks `usage.spreads` with `path: [prop, ...rest]`; e2e "R5" finds `p-2` at `<Outer className>` through `<Panel {...props}>`. Nit: a spread that leads nowhere (`<Panel {...local} />`) returns without pushing to `unfollowed`, so the refusal loses its "comes in through" hint. |
| R6 plan without class-site | **fixed (server), partly (product)** | `plan.ts` reads through `wornBy` → `classSites` and writes through `pinnedString`; `recipeContext` reads chain files fresh; e2e "R6" changes `shadow-sm` at the `<Tile>` usage. But the overlay sends no `chain` to `recipes`, `recipes/preview` or `recipes/apply` (`elementcard.js:349`, `:451`, `blueprint.js:531`), so from the product every recipe still runs chainless: N6, N7. |
| D2 helper table | **fixed** | one `knownHelpers` table with `objects`/`idiom`; `project.ts` reads `idiom` rows; `cva`'s config is not visited. |
| D3 `property` → `path` | **fixed** | `ClassRef.path: string[]`, `classSourcesAt`. |
| D4 batch map | **fixed** | `Session.batches`; `history`, `evict`, `undo` read it; a member id alone is refused ("undo that one, whole"). |
| nit ownProp on the spread ref | **fixed** | `follow({ ...ref, path: [ownProp] })`. |
| nit depth limit | **fixed** | `seen` sets in `follow` and `bindingOf`. |
| nit offsetOf past the line | **fixed** | `rereview2b`: `at: { line: 2, column: 200 }` → `400 That column is past the end of its line.`, file unchanged. No e2e case in the suite. |
| nit classNameOf wording | **fixed** | "a condition between values set elsewhere". |
| nit missing e2e cases | **fixed** | B1, B2, R3 are in `e2e/class-site.test.mjs`. |
| D1, D5, D6 | unchanged, not claimed. | |

### New findings

#### N1 · class-site.ts `usesComponent`/`sameModule` a usage that imports through a barrel is not the usage — **bug (refusal, then a shared add)** *run*
`sameModule` equates a specifier with the component's file only when it resolves to that file or its folder's index.
An index that *re-exports* (`src/ui/index.ts: export { Card } from './card'`, the common `@/components/ui` shape) resolves
to `src/ui`, which is not `src/ui/card`, so the usage is refused and the add falls to the component's own string:

```
src/ui/card.tsx   export function Card({ className, children }) { return <div className={`border ${className}`}>{children}</div>; }
src/ui/index.ts   export { Card } from './card';
src/Barrel.tsx    import { Card } from './ui';  export const B = () => <Card className="p-6">b</Card>;

(1) barrel: 200 [{"class":"border",...},{"class":"p-6","sites":[],"refused":"p-6 is built in code, so it can't be changed here (it comes in through `className`)."}]
    add: {"file":"src/ui/card.tsx","kind":"own",...,"string":{"text":"border "},"shared":true}
```

Before 3d5a28b this matched by name. The overlay ignores `shared` (B2 row), so a class added to this `<Card>` lands in
every Card. *Fix:* the resolver takes a `resolveModule(from, specifier) → file | undefined` from the engine (it can
`stat`); when the import lands on a file other than the component's, parse that file's `export { X } from` /
`export * from` once and follow the one hop (barrels are one level deep in practice; a seen-set ends cycles). When the
specifier resolves to nothing readable (a package, an alias the engine cannot map), fall back to the name, as N3 says.

#### N2 · class-site.ts `usesComponent` the name fallback fires across files — **risk (wrong usage)** *run*
A tag that is not imported matches `component.names` whatever file the usage is in. A component declared locally in the
usage file with the same name is taken as the usage of the element's component:

```
src/Local.tsx   function Card({ children }) { return <div>{children}</div>; }  export const L = () => <Card className="p-9">l</Card>;
(2) local same-name: 200 [{"class":"border",...},{"class":"p-9","sites":[["usage","className","src/Local.tsx","Card"]]}]
```

`p-9` is reported as written for `ui/card`'s `<div>`, and a write there changes `Local.tsx`'s `<Card>` for nothing. It
needs the real usage to be missing from the chain (sliced at 8 links, or rendered through a render prop), so risk, not
bug. *Fix:* the name fallback only when `usage.path === component.file`; in another file a tag must be imported.

#### N3 · class-site.ts `sameModule` a scoped package with the file's basename is the file — **risk (wrong usage)** *run*
`@scope/pkg` drops `@scope` and `pkg` matches `…/pkg`: `import { Card } from '@acme/card'` is taken as `src/ui/card.tsx`:

```
src/Scoped.tsx   import { Card } from '@acme/card';  export const S = () => <Card className="p-7">s</Card>;
(3) scoped @acme/card: 200 [... {"class":"p-7","sites":[["usage","className","src/Scoped.tsx","Card"]]}]
```

Same precondition as N2 (the real usage not on the chain). *Fix:* treat `@x/…` as a package (an alias is `@/`, `~/`,
`#…`: one character before the slash); a bare package name (`card`, `ui`) the same when it is not in tsconfig `paths`.
With N1's `resolveModule`, both become "resolves to nothing readable".

#### N4 · class-site.ts `componentOf` `export default memo(Card)` is not a default export — **risk (refusal)** *run*
`isDefault` accepts `export default <Identifier>` and a function written inside the export; a wrapped name is neither:

```
src/ui/dcard.tsx   function Card({ className }) { return <div className={className}>x</div>; }  export default memo(Card);
src/Deflt.tsx      import Card from './ui/dcard';  export const D = () => <Card className="p-5">d</Card>;
(4) default memo(Card): 200 [{"class":"p-5","sites":[],"refused":"p-5 is built in code ... (it comes in through `className`)."}]  add: null
```

*Fix:* in the `isDefault` scan, unwrap the declaration through `CallExpression` arguments (`memo(Card)`,
`forwardRef(Card)`, `memo(forwardRef(Card))`) and `export { Card as default }` specifiers.

#### N5 · overlay/src/locate.js:325–328 the "kin" rule turns an add into a swap, past the server's add checks — **risk (write into a shared variable or a branch)** *reasoned, not run*
`classEditsOf` with no `from`: when a class of the same family is already written (`px-2.5` for an added `pl-3`), it sends
`from: 'px-2.5', to: 'px-2.5 pl-3'` at *every* site of that class. That is a swap to the server, so `pinnedString(…,
adding = false)` skips both the branch and the `readers > 1` checks (class-site.ts `pinnedString`: both guards are under
`adding`). With `const look = 'px-2.5 py-1 rounded'` read by `#v1` and `#v2`, the card's "add pl-3" on `#v1` writes `pl-3`
into `look` and changes `#v2`, the write R3 was closed against; with `tone ? 'px-2.5' : 'grid'` it writes into the branch.
The branch half is arguably wanted (the override stays with what it overrides); the shared-variable half is not. *Fix:*
the kin rule skips sites with `readers > 1` (and says so), falling back to `answer.add`; or the server's swaps take an
`adds: true` hint and apply the add checks when `to` ⊇ `from`.

#### N6 · recipes/plan.ts `swap` writes into a variable other elements read, and says nothing — **risk (a write that changes other elements)** *run*
Before 3d5a28b the plan read `className={look}` as dynamic and refused. Now class-site hands it the variable's string
with `readers: 2`, and `swap` takes every unconditional string that holds `from` without looking at `readers`:

```
src/App.tsx   const look = 'shadow-sm rounded';
              <div id="v1" className={look}>1</div><div id="v2" className={look}>2</div>
(8) view shadow: {"source":"class","class":"shadow-sm",...}
(8) apply: 200 {"applied":["element:src/App.tsx"],"notes":[]}
(8) look now: const look = 'shadow-md rounded';
```

The class-site card would show `readers: 2`; the recipe card has no such field. Likewise the plan ignores `add.shared`:
a recipe on a component's inner element without a chain adds into the component (case 10: `cn('rounded-lg p-4
shadow-md', className)` for every `<Tile>`), which is what happened before too, but now the resolver says `shared` and the
plan drops it. *Fix:* in `swap`, refuse a target site with `readers > 1` ("written in `look`, which 2 places read") and
an `add.shared` target unless `i.forwards`; put `readers`/`shared` into `describeElement`'s answer so the card can say it.

#### N7 · overlay: no `chain` on `recipes`, `recipes/preview`, `recipes/apply` — **design (R6 half done)** *reasoned*
`elementcard.js:349` asks `recipes` with `{ file, line, column }` only, `:451` and `blueprint.js:531` the same for preview
and apply, while `readSites` sends `chain` for class-site. So from the product every recipe is chainless: a class passed
in from a usage reads as `source: 'none'` (case 10 above) and the add goes into the component. *Fix:* send the same
`chain` (`at.chain.slice(1, 9)`) and the `hashes` the class-site answer carries, so `recipesApply`'s per-file hash check
covers the usage file.

#### N8 · class-site.ts `isReference` a shorthand property counts twice — **nit** *run*
`{ look }` has a key node and a value node; `isReference` skips the key only when `!shorthand`, so both count:

```
const look = 'a b'; const o = { look };  <div id="rd" className={look}>
(5) readers of look (expect 2): [... "readers": 3]  addRefused: "...which 3 places read..."
```

Off by one, in the safe direction. *Fix:* skip the key of a shorthand property (count the value).

#### N9 · class-site.ts `bindingOf` a key taken out of a rest is still read from it — **nit** *run*
`function Row3({ className: c, ...rest }) { const { className } = rest; <a className={className}> }`: `bound.key` is
`className`, `outer.except` holds it, and the branch `bound.key === null ? … : { kind: 'prop', prop: bound.key }` ignores
`except`:

```
(6) Row3: 200 [{"class":"p-8","sites":[["usage","className","src/App.tsx","Row3"]]}]
```

The code is nonsense at runtime (`className` is always undefined), so nobody writes it on purpose. *Fix:* return
`undefined` when `outer.except?.includes(bound.key)`.

### Checked and sound
- `pinnedString` without `of` (`usageProps`): a pin from a usage into its own `className` or `gapClass` is accepted
  (case 7: both 200, file `<Panel className="p-5 flex" gapClass="gap-3" />`); a pin into `href` is refused (e2e B6). With
  `of`, the written element must be a holder the resolution of `of` reached, so a client cannot name a string that is not a
  class string of an element `of` reads. No legitimate overlay write is refused: the overlay sends `of` as the element and
  chain it read, and the server resolves the same.
- `swaps` with several pins in one file: changes sorted by start descending and applied from the end; offsets hold.
- `readers()`: a shadowing declaration in an inner block resolves to its own init and is not counted; a self-read
  (`const a = cn(a)`) counts, which only makes `readers` one too high.
- `evict`/`asOneWrite`: a batch registered after both members are recorded cannot lose a member to the per-record
  eviction (the members are the newest entries); `historyLimit` ≥ batch size.
- `undoBatch` mid-failure: a member that throws before its write leaves itself and the older members in `batches`
  (the `finally`), so a second undo of the id finishes; a member that throws after its write (the `remaining` snapshot)
  has already restored the file and dropped its entry, as `undo` did before.
- Recipe through a chain in another file (case 9): the usage file is written and its hash returned; the component file
  untouched.
- `except` through `const { a, ...rest } = props; const { b, ...rest2 } = rest` chains: merged (`[...outer.except, ...bound.except]`).

### Order
1. N1 (barrel imports) — a refusal on the most common import shape, and the add it falls to is shared.
2. N6 + N7 together (the plan honours `readers` and `shared`; the overlay sends the chain) — R6 is then true end to end.
3. N5 (the kin rule) — closes the R3 bypass.
4. N2, N3, N4 with N1's resolver.
5. N8, N9.
