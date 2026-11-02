# Engine review: recipes, spacing scale, class sites, hierarchy

Review only (2026-11-03). Nothing changed, nothing committed. Scope: `src/recipes/*` and its server wiring (3ade9d8, 4db4ff6),
the spacing-scale change (51a0ffa), `overlay/src/locate.js` classSiteOf/siteMates + `overlay/src/elementcard.js` #classWrite
(cc1df9c), and `overlay/src/hierarchy.js` + `overlay/src/tidycard.js` (uncommitted). Line numbers are from the tree as read today.

Severity: **bug** (wrong result or data loss), **design** (wrong shape or boundary; will cost more later), **nit** (small, safe).

## Top 5 to do first

1. **Three resolvers of "where are this element's classes written"** (`overlay/src/locate.js:265 classSiteOf`,
   `overlay/src/tidycard.js:107 writes()`, server `src/recipes/plan.ts:170–178 + forwards`). Make one: a server endpoint
   `GET class-site { file, line, column, need[] }` built on what GET classes/structure already know, and both overlay cards
   and the recipe plan call it. (D1, D2, D3)
2. **Every recipes call re-reads the whole project** (`src/session/engine.ts recipeContext`: glob of up to 1500 files, each
   read and parsed; `indexProject` scans all CSS every time). A dial drag is a preview per tick. Cache the index by
   `buildId()` + file hashes like `page` does. (D4)
3. **`parseBoxShadow` rejects rem/em/calc lengths and invents an empty colour** (`src/recipes/css.ts:19, :66`). A project
   whose shadows are in rem is read as having none; a bare `0 4px` custom property is read as a shadow. Keep the unit
   (`{ value, unit }`) or convert rem at the root size; require a colour or three lengths before calling it a shadow. (B1, B2)
4. **Hidden state `codePaths` WeakMap** (`src/recipes/service.ts:34, :73`, `src/recipes/plan.ts:208`) carries the file list
   from service to plan through the index object's identity. Put `paths` on `ProjectIndex` (or on `PlanInput`). (D5)
5. **Four hand-kept method lists in `src/session/server.ts:233, :234, :295, :402`** plus the `Method` union in
   `src/session/index.ts:9–10` and the `read` list in `coordinator.ts:10`. One table `{ name, verb, json, read }` drives
   all of them; adding `recipes/*` touched six places. (D6)

---

## 1. Recipe engine (`src/recipes/*`, server wiring)

### B1 · `css.ts:19` box-shadow lengths must be px — **bug**
`^(-?(?:\d+\.?\d*|\.\d+))(?:px)?$` makes `parseBoxShadow` return `null` for `0 0.25rem 0.5rem …`, `0 1em 2em`, or any
`calc()`. `readTheme` (`readers.ts:93`) then reads a rem-based theme as having no shadows, and `describeElement` says
"none" for an element that wears one. *Why it matters:* the recipes view, the mapping verdicts and the element card are
all wrong for every non-px project, silently. *Change:* parse `(px|rem|em)` and store `{ value, unit }` on `ShadowLayer`
(or convert rem/em at 16px with a `note`), and let `formatBoxShadow` write the unit back. Add a fixture with rem shadows
to `e2e/recipes.test.mjs`.

### B2 · `css.ts:66` a missing colour becomes `{ token: '' }` — **bug**
A layer with no colour gets a token with an empty name, which `formatBoxShadow` writes as `var()` (or nothing), and
`mapping.ts:14 alphaOf` scores as alpha 1. Together with `readers.ts:94` (`!theme && layers.some(l => l.x || l.y || l.blur)`)
any `:root` custom property that parses as 2–4 lengths — `--offset: 0 4px`, `--inset: 0 8px 0 0` — is read as a project
shadow and offered as "yours". *Change:* `parseBoxShadow` returns `null` when a layer has neither a colour nor ≥3 lengths
and a colour is required outside `@theme`; `color` becomes `Color | null` with `currentColor` semantics on format.

### B3 · `readers.ts:136` variants split on every `:` — **bug (edge)**
`cls.split(':')` breaks arbitrary variants: `[&:hover]:shadow-md` → variant none, utility `shadow-md`, so it is read as
the element's resting shadow. `plan.ts:102 variantOf` already handles `[…]:`; the reader does not. *Change:* share one
`splitVariants(cls)` that respects brackets (the one in `props.ts` or `variantOf`) and use it in both.

### B4 · `plan.ts:476–481` the shift assumes earlier edits sit before the element — **bug (edge)**
`shift = text0.length - el.text.length` is applied to `el.start`. It holds for an import inserted at the top, but when
the presets file *is* the element's file (`index.idioms.motion.presets.file === el.file`, presets declared below the
component) the "add preset" edit lands after the element and the shifted `start` points past the real opening;
`findOpening` then fails or finds another tag. *Change:* re-find the opening by the element's `line/column` in `text0`
(`jsxLocation`) instead of shifting an offset, or apply the element edit first and the import/preset edits after.

### B5 · `readers.ts:148` `duration-[…]` reads ms only — **nit**
`duration-[0.3s]`, `duration-[300]` are dropped; `parseDuration` already understands both. Use it.

### B6 · `readers.ts:159` a hover shadow becomes `var(--shadow-[…])` — **nit**
`hover:shadow-[0_1px_2px_#0003]` yields `to: 'var(--shadow-[0_1px_2px_#0003])'`. Parse arbitrary values the same way
line 141 does, or carry the class name and let the renderer resolve it.

### B7 · `pack.ts:106–111` only the first token of a shadow recipe is read, light only — **design**
`break` after the first parseable token; `dark` is never read. Fine for today's pack, but the pack format documents
light/dark pairs. Keep `dark` on the Recipe (`model: { light, dark? }`) or state in the pack doc that dark is ignored.

### B8 · `pack.ts:86–89` motion ease names fall back to ease-in-out — **nit**
`parseEasing` knows `easeOut`, `circIn` … (`css.ts:90`), so most names resolve; anything unknown becomes `[0.42,0,0.58,1]`
silently. Return `null` and let `timingFromTransition` refuse, or carry the name as a string easing.

### D4 · `engine.ts recipeContext` re-reads the project per call — **design (perf)**
Glob, `stat` and `readFile` of up to 1500 files, then `indexProject` (regex over every file, `scanStylesheet` of every
CSS) on every `recipes`, `recipes/preview`, `recipes/apply`. The dials preview is called per drag tick. On the 16 GB
machine this is the kind of load that swaps. *Change:* cache `{ index, texts, paths }` by `buildId()` and the hash set
of files it read (the `page` endpoint already keys readings this way); invalidate from the watcher. Keep the element's
own text fresh (it is already re-read in `elementFacts`).

### D5 · `service.ts:34, :73` + `plan.ts:208` `codePaths` WeakMap — **design**
Plan functions reach for a list the service stashed on the index's identity. A plan built from an index the service did
not touch (tests, a future CLI) silently counts zero users and never finds an alias import. *Change:* `ProjectIndex.paths:
string[]` set by `indexProject`, or `PlanInput.paths`; delete the WeakMap. `plan.ts:191` then loses its dead ternary
(`[…themes, …allCodeFiles(i)].length ? … : 1` is always the first branch) and `allCodeFiles` (a stub returning
`[el.file]`).

### D7 · `service.ts:48–61` `resolveRecipe` is an if/else over request shapes — **design**
Each new source (DTCG, transition, boxShadow, recipe id, model) is another `else if` with its own validation inline.
*Change:* a reader table `[{ when: p => …, read: p => Recipe | null, says: '…' }]` in `readers.ts` next to the readers
themselves; `resolveRecipe` picks the first that matches. The refusal text at line 62 then lists the shapes from the table.

### D8 · `service.ts:32` one pack, by import — **design**
`packRecipes = () => readPack(firstPack)`; `resolveRecipe` matches `${firstPack.id}:${r.id}`. Several packs (the
research doc's premise) need a list and ids that carry the pack. Make `packs: Pack[]` the input of `recipesView` and
`resolveRecipe` (today `[firstPack]`).

### D9 · `project.ts` idioms by regex counts — **design**
`tailwind`, `cn`, `motion`, `dataState` are detected by counting matches across files. `motion.installed` from
`dependencies` is right; "which file is the presets file" and "does this project use data-state" from counts can pick a
vendored example or a comment. Acceptable as a first pass; say so in the module header and expose `evidence` (file,
count) on `idioms` so the card can show why.

### N1 · `stylesheet.ts:13–14` `lineAt` is O(n) per declaration — **nit (perf)**
Every decl's line is found by rescanning from 0 (`O(n²)` over a large stylesheet); `line` is tracked and then `void`ed.
Use the tracked counter.

### N2 · `render.ts:14–16` settle scan is 1000 evaluations per spring — **nit (perf)**
Called per preview and per pack recipe in `recipesView`. Closed form: for `zeta < 1`, settle ≈ `-ln(0.002)/(zeta·w0)`;
else Newton on the critically damped form. Or scan coarse (0.05) then refine.

### N3 · `mapping.ts:22, :68` unexplained weights — **nit**
`blur×0.5`, `alpha×20`, `inset 4`, thresholds `.005/.3` and `.02/.6`. Name them (`const WEIGHT = { blur: .5, alpha: 20,
inset: 4 }`) with one line each on why (alpha 0.05 ≈ 1px of offset, …), and put the verdict boundaries in the one place
the card copy reads them from.

### N4 · dead code kept alive with `void` — **nit**
`readers.ts:161 void easing` (the local is assigned and never read), `readers.ts:243 void round`, `pack.ts:137 void
parseDuration`, `plan.ts:479–480 fresh`, `plan.ts:491–493 wantTransition`, `plan.ts:531 void dirname; void relative;
…`. Remove the imports/locals instead of silencing lint.

### N5 · `engine.ts recipesApply` rollback leaves history entries — **nit**
A write that fails mid-batch is undone with `this.undo(handle.id)`, so the history shows a write and its undo for a
batch that reported an error. Either record the batch as one history entry (one Undo for all files, as the client is
told anyway) or label the rollback entries. The per-file `hashes` guard is good; note the element `hash` is optional on
apply (`params.hash !== undefined`) — the overlay should always send it.

### N6 · `pack.ts:13–49` formula evaluator — ok
Precedence, unary minus, functions, `%` (`:44`) all check out; `round(a, b)` with `b = 0` falls to `Math.round(a)`.
Undefined names and trailing tokens fail with a UsageError naming the formula. No change.

## 2. Spacing scale (51a0ffa)

### B9 · `src/session/props.ts:210` one named `--spacing-*` removes the whole multiplier ladder — **bug (design)**
The multiples are added only when no project `--spacing-*` decision exists. A Tailwind v4 project that keeps `--spacing`
and adds one alias (`--spacing-card: 1.5rem`) is back to "every padding off the scale" (the exact F2-01 symptom). In v4
both coexist: `p-4` and `p-card` are both valid. *Change:* always add the multiples when `--spacing` resolves; the named
steps come after them; only `--spacing-*: initial` (the v4 way to drop the ladder) turns them off.

### D10 · two readers of `--spacing` — **design**
`numericSpacing` (declines on a second definition or a variable base) and the new `spacingBase` (`src/decisions/spacing.ts:52`,
reads the last definition, variables at 1) are two paths that `worker.ts spacingUnit` merges with an if/else on
`numeric.replaced`. One reader returning `{ px, text, note?, replaced }` with the note carrying the guesses keeps the
rule in one place. Also `findLast(d => d.theme || d.root)` is file order, not cascade order (an imported file's `@theme`
after a local `:root`).

### N7 · `worker.ts spacingUnit` is computed on every `props` call — **nit (perf)**
`elementFacts` awaits `spacingUnit()`, which walks every declaration with a regex, per element card open. Cache per
generation beside `decisions`.

### N8 · `props.ts:206` `trim(n * unit.px)` vs computed px — **nit**
A base of `0.3rem` gives steps like `7.2px`; the overlay (`tidycard.js:23 near < 0.5`) and `set` match by value text.
Fine today; worth one test with a non-quarter base (`--spacing: 0.3rem`) so a rounding drift shows up as a failing
test, not a card that cannot find its own step.

Test gap: `e2e/props-spacing-scale.test.mjs` covers three themes, all `0.25rem`-based and none with a named step
alongside `--spacing` (B9) or `--spacing-*: initial`.

## 3. Class sites (`locate.js`, `elementcard.js`, cc1df9c)

### D1 · `classSiteOf` is a client-side resolver over three server reads — **design**
It calls `locate` (chain), GET `classes`, up to six GET `structure`, and GET `props`, then decides with heuristics the
server does not know about: a class with one site "within 6 lines above" a chain link (`locate.js:286`), file identity by
`endsWith('/' + b)` (`:264`), "most classes written here wins" (`:311`). The server already attributes every class to its
string (`GET classes` sites) and knows each usage's props (`structure`). *Change:* one server method `class-site` taking
`{ file, line, column, chain: [{file,line,column}], wears: [...], need: [...] }` and answering the same `{ file, line,
column, hash, usage, prop, classes, anchor } | { refused }`; the overlay keeps only the DOM half (fiber chain, `wears`
from `memoizedProps`). The heuristics then live where they can be tested with the fixtures in `e2e/element-site.test.mjs`
without Chromium.

### D2 · `#classWrite` resolves the site once per edit — **design (perf)**
`elementcard.js:370` calls `classSiteOf(e.el, names(e.from))` for every edit; the same element is resolved N times
(each ≈ 8 requests). Resolve per element with all its `need`s at once, or cache within the write.

### N9 · `elementcard.js:384–389` the prop rewrite drops duplicates and order — **nit**
`new Set([...kept.slice(0, cut), ...to, ...kept.slice(cut)])` reorders a class that was already present later in the
string. Harmless for Tailwind; just note it in the comment, or keep the string's own order and replace in place.

### N10 · `siteMates` walks 64 fibers per sibling — **nit**
`locate.js:343` walks up to 64 parents for every element with the same stamp. On a long list (hundreds of rows) this is
per card open. Memoise `there(stamp)` per fiber in the walk.

## 4. Hierarchy (`hierarchy.js`, `tidycard.js`)

### D3 · `tidycard.js:107 writes()` is a second class-site resolver — **design**
It re-implements "own line when className is a plain string, else the nearest usage prop holding the classes" with its
own `locate` + `structure` walk, and skips `GET classes`, so it cannot follow a class through `cn()`/template strings
the way `classSiteOf` can. The two also disagree: an added class (`fromOne` empty) is written on the own line (`:116`)
but never at a usage (`:126` skips when `!fromOne.length`). *Change:* `Tidy.writes()` builds `[{ el, from, to }]` and
hands them to the host's `#classWrite` (one batch, one Undo, same refusals), as the comment at the top of the file
already promises.

### D11 · `tidycard.js:54–63` the class for a value is rebuilt from the token — **design**
`#scale()` keeps only `{ px, token }` and `#classFor` re-spells `text-${t}`, `rounded-${t}`, `p-${t}`, and for the
multiplier reads `--spacing` from `getComputedStyle(documentElement)` and re-derives the quarter-step rule. The server's
`props.steps[]` already carry `class` (and the multiplier steps carry `css`). Keep `class` on the scale entries and look
it up; drop the `--spacing` read. (`rounded-${t}` with the default radius token is one place this can go wrong.)

### N11 · `tidycard.js:67` spacing scale merges gap and padding steps — **nit**
Both families come from the same ladder, so the union is the ladder twice; dedupe by px before passing to `tidy`, which
sorts and searches neighbours.

### N12 · `hierarchy.js` is a pure engine with a browser-only test — **test gap**
`e2e/hierarchy.test.mjs` runs it through Chromium against `fixtures/hierarchy`. `contextOf`/`tidy` take DOM elements,
but the rules (T1–T3, S1–S3, L2–L3) are decisions over numbers; a thin `{ role, px }` input would let the rule table be
checked across the decided questions (Q1–Q4 in `docs/research/hierarchy.md`) without a browser, and keep the browser test
for the fixture. Not urgent; the owner's rule is e2e first.

## 5. Tests: gaps worth a case each

- `e2e/recipes.test.mjs`: rem/em shadow theme (B1); a `:root` with a non-shadow 2-length property (B2); an arbitrary
  variant on the element (B3); presets declared in the element's own file (B4); a multi-file apply where the second
  write fails (atomicity + rollback, N5) and a stale `hashes[file]` on apply; `@theme inline`.
- `e2e/recipes-forwards.test.mjs`: good; add "forwards but the usage already has a shadow class" (replace, not add).
- `e2e/props-spacing-scale.test.mjs`: `--spacing` plus one named `--spacing-*` (B9); `--spacing-*: initial`; a
  non-quarter base (N8).
- `e2e/element-site.test.mjs`: covers F1-01..04 through the GUI, which is right; the server half of D1 would get its own
  fixture-level test without Chromium.
- No test exercises `tidycard.writes()` at all (hierarchy.test stops at `tidy()`); D3 removes the need.
