# Craft review: commits 0eb31fc^..HEAD

Scope: the `swap` write path (server and overlay), the real-quotes habit edits, the craft engine and its 32 rules, the headless run, and the e2e tests. Review only; nothing was changed. Reproductions were run against `dist/` (built from HEAD) with `oxc-parser` and `dist/session/props.js`.

Status key: CONFIRMED = reproduced or traced line by line; PLAUSIBLE = traced to the code path, not reproduced end to end.

Totals: 2 critical, 6 high, 7 medium, 4 low.

---

## Critical: can corrupt user source

### C1. `swapClasses` rebuilds the className string from oxc's *cooked* value and never re-escapes it for the enclosing quote — CONFIRMED

`src/session/props.ts:118-124` (`staticText`) returns `value.value` (the decoded string) with `start/end` of the raw source between the quotes. `swapClasses` (`props.ts:334-337`) then replaces the whole raw range with `lead + next + trail`, where `next` is built from the cooked tokens. Any escape in the original is written back raw.

Reproduced (`dist/session/props.js`, result parsed with oxc):

```
<div className={'before:content-[\'→\'] px-4'} />   swap px-4 → px-6
→ <div className={'before:content-['→'] px-6'} />     1 parse error (file no longer compiles)

<div className={"aA px-4"} />                   → className={"aA px-4"}   (escape cooked away, silent)
```

Tailwind arbitrary values with quotes (`content-['…']`, `font-feature-settings`, `[--var:'x']`) are common in single-quoted `cn()`/`clsx()` strings under Prettier `singleQuote`. Any craft swap on such an element writes a file that Vite cannot compile. The server has no post-write parse check, so the broken file is committed to disk and `remaining` is computed on it.

Fix (two layers):
1. Do not rebuild the string. Replace only the raw ranges of the `from` tokens (found in `source.slice(string.start, string.end)`, not in `text`), and insert `to` at the first one's raw position. Refuse (`UsageError`) when `raw !== cooked` for the string, as `setProp` should too (same `classes()` helper, same bug, pre-existing).
2. Parse the result before `handle.writeFile` in `writeText` (`engine.ts:632`): `parseSync(file, next).errors.length` → refuse with "The change would not parse". One oxc parse per write is cheap and is the only guard that holds for every finder.

### C2. The caps-case suggestion carries a single quote; written into any single-quoted string it breaks the file — CONFIRMED

`overlay/src/craft-rules.js:926` suggests `to: "[font-feature-settings:'case']"` with `from: ''`. `swapClasses` inserts it verbatim.

```
<div className={cn('text-xs uppercase', x)} />   insert [font-feature-settings:'case']
→ className={cn('text-xs uppercase [font-feature-settings:'case']', x)}   1 parse error
```

In a double-quoted JSX attribute it is fine, which is the only form the tests use. Fix: in `swapClasses`, when `to` contains the string's delimiter, flip the quote kind inside `[...]` (`'case'` → `"case"`, both valid CSS strings and Tailwind keeps them) and refuse if it still conflicts or contains a backslash. The C1 parse guard catches what slips through.

---

## High: wrong edit or wrong finding shipped

### H1. `real-quotes` turns HTML entities into straight quotes and ships that as the edit — CONFIRMED

`src/habits/quotes.ts:16-17` decodes `&quot;`/`&apos;` first; the pairing rules only re-typeset *pairs*. A lone entity becomes a straight quote, which is both a typographic regression and, inside an attribute, broken JSX.

```
typeset('5&quot; tall')      → '5" tall'      <img alt="5&quot; tall">  →  alt="5" tall"   (invalid JSX)
typeset('&apos;tis the season') → "'tis the season"   alt='&apos;tis'  →  alt=''tis'
typeset('&quot;')            → '"'
```

The finding's `edits[0].text` and `action` ("Write it as `5" tall`") go to `--json`, `--agent`, MCP `site`/`report` and the overlay card; agents apply `edits[].text` verbatim (`docs/MESSAGES.md:11`). Plumber itself does not auto-apply these (`structuredEdits` only uses `decisions`), so this is a shipped wrong edit, not an automatic corruption.

Fix: decode entities only in a shadow copy used for matching; for every straight quote left after typesetting, write it back as the entity it came from (or `″`/`′` for inch/foot marks after a digit); for attributes, refuse any result containing the attribute's own delimiter; and never report when the only change is entity → straight quote.

### H2. `from: ''` inserts are written to component usage sites — swapClasses CONFIRMED, locate path PLAUSIBLE

Eleven rules insert a class (`tabular-nums`, `text-balance`, `scroll-mt-N`, `max-w-prose`, `leading-*`, `tracking-*`, `[scrollbar-gutter:stable]`, `outline …`, `-mx-*`, `border-black/10`, `text-base md:text-sm`). `elementFacts` resolves the position with `jsxLocation(…, 'any')` (`engine.ts:557`), which accepts component openings, and `locate()` returns a component usage site for library-drawn hosts (`overlay/src/locate.js:224-230`, `via: 'stamp-owner'`, and `'stamp-usage'` at 239-243). `swapClasses` with `className.kind === 'none'` then adds the attribute:

```
<Foo.Bar id="x" />   insert tabular-nums   →   <Foo.Bar className="tabular-nums" id="x" />
```

For a component that does not take `className` this is a type error or a no-op; for one that forwards it to a different element than the one measured, it is the wrong element. `set` has the same hole, but craft makes inserts common.

Fix: in `swap` (and `set`), refuse inserts when the opening is a component (`isComponentJSX`) or when the overlay's `locate` result has `usage: true`; offer the advice text instead.

### H3. The overlay's craft write sends a hash it just read, so the server's staleness guard never fires — CONFIRMED

`overlay/src/blueprint-fix.js:495-500`: `write()` calls `locate`, then `request('props')`, then posts `props.hash`. The hash captured at pick time (`p.hash`) is not used for craft picks (`open()` at 157-165 leaves `this.#open.hash = null`). A file edited between the finding and the Write is written anyway; the only remaining check is that `from` still exists on that line. Scenario: a person moves `px-4` from the measured element to a sibling on the same line; the swap replaces it there. Fix: read `props` when the chooser opens (as the non-craft path does), store `hash` on the pick, send that; a stale answer then flows into the existing `stale` → `reread()` path.

### H4. `input-zoom` matches colour classes as sizes — CONFIRMED (regex)

`craft-rules.js:964`: `/^text-(?:xs|sm|\[\d)/` is unanchored, so `text-smoke`, `text-sm-ink`, `text-xsky` match. The suggestion becomes `from: text-smoke → to: text-base md:text-smoke`: the colour is removed on phones. Fix: `/^text-(?:xs|sm)$|^text-\[\d/`, or use `facetOfClass(c) === 'font-size'`.

### H5. Numeric Tailwind steps assume `--spacing: 0.25rem` at 16px — PLAUSIBLE

`space()` (`craft-rules.js:430`), `mediaSize` (`:802`, `mode / 4`) and `anchorOffset` (`:1003`, `scroll-mt-${ceil(h/4)}`) emit `pl-5`, `size-9`, `scroll-mt-17`. A project with `--spacing: 0.2rem`, a different root size, or `--spacing: initial` (common with a named scale like this repo's `s1…s6`) gets a different size or a class that generates no CSS. The preview (`classList.add`) shows nothing, the Write still succeeds. Fix: measure `calc(var(--spacing) * 1)` once in `Theme`; emit numeric steps only when it resolves to 4px (or scale by the measured value), otherwise `[20px]`.

### H6. A suggested class can lose to one already on the element — PLAUSIBLE

`text-opacity` adds `text-ink-muted` beside an existing `text-zinc-900`; `measure` adds `max-w-prose` beside `max-w-none`?—no, that one swaps—but `leading`, `tracking`, `border-on-shadow` (`border-black/10` beside `border-zinc-200`) all insert while `from: ''`. Tailwind v4 orders same-property utilities deterministically by name, not by source order, so the new class may not take effect; the preview shows the same ambiguity. Fix: let these rules name the class to replace via `utility(el, prefix)`/`colourClass(el, prefix)` (they already have the helper) and set `from` to it.

---

## Medium

### M1. One JSX line rendered N times → one write, N−1 "refused" — CONFIRMED (trace)

Every row of a list gets its own craft mark and pick; `write()` runs a swap per pick. After the first succeeds, the rest fail with "px-4 is not written on this element" or "Nothing to change" (`props.ts:325,330`), stay `picked`, and the dock shows "App.jsx refused: …" on every Write. `craft-run.js` dedupes by site; `blueprint-fix.js` does not. Fix: dedupe craft picks by `(file, line, column, from, to)` after `locate`, mark the siblings written.

### M2. Multi-line and template className strings are collapsed — CONFIRMED

```
className={`\n  px-4\n  py-2\n`}  swap px-4→px-6  →  className={`\n  px-6 py-2\n`}
```

Inner newlines and indentation are lost (only the string's leading/trailing whitespace is kept, `props.ts:336`). Same fix as C1: edit token ranges, not the string.

### M3. `compose` stacks a second edit when the kept rule declares no `sets` — PLAUSIBLE

`craft-arbitrate.js:70-83`: a folded rule with `after` is re-run on `Facts.with(el, { sets })`. If the kept suggestion has no `sets`, the computed style is unchanged, the folded rule fires again, and `applied()` appends its `to` (its `from` is already gone) → `px-s4 pl-5 pr-s6`. Today only `icon-side` declares `after`, and `button-padding` declares `sets`, so it is latent. Fix: skip composition when the kept edit has no `sets`.

### M4. `plumber craft` can hang — PLAUSIBLE

`src/craft-run.ts:48`: `page.evaluate(() => __plumb.ready())` has no timeout and `ready()` (`overlay/client.js:19-25`) polls forever while health is `starting`. CI with a slow first read waits indefinitely (the browser is closed in `finally` only once something throws). Fix: `Promise.race` with `options.timeout` inside the evaluate, or `page.evaluate` wrapped in a timer.

### M5. `real-quotes` rewrites arithmetic and ranges — CONFIRMED

`typeset('10 - 2 = 8')` → `10 – 2 = 8`; `A - B` → `A – B`. A minus between numbers is not a dash. Fix: exempt `\d - \d`.

### M6. Preview `#lift` restores the whole saved `class` attribute — PLAUSIBLE

`blueprint-fix.js:357-360`: `el.setAttribute('class', p.classAttr)` reverts any class React changed in between (a `data-state` toggle, a hover class). After a write, `pv.classAttr = undefined` (`:506`) so a later lift for a second pick on the same element has nothing to restore. Fix: on lift, remove `to` and re-add `from` (the inverse of `#set`), never replace the attribute.

### M7. Per-element work that scans the page — PLAUSIBLE

`contrast` calls `n.getAnimations()` for every ancestor of every text element (`craft-rules.js:706`); `tabular-nums` runs `table.querySelectorAll('tr')` per cell (`:572`); `Facts.with` creates a fresh facts object so `stickyHeader`'s WeakMap memo misses during composition. Fine on the demo; a 500-row table is 2,500 `querySelectorAll` calls per pass. Memoise per `facts` (as `stickyHeader` already does) and read animations once per ancestor chain.

---

## Low

- **L1.** `applied()` (`craft-arbitrate.js:30-35`) and `at0` (`props.ts:327`) index into the unfiltered list; when another `from` class precedes `from[0]`, the insert lands one slot late. Cosmetic.
- **L2.** `Craft.#marksFor` caches by own + parent class only (`craft.js:197`); an inline-style, text or size change without a class change keeps stale findings until a resize or write.
- **L3.** `utility()` keeps the `!` on `from` but `to` drops it (`button-padding`, `media-size`): an important class becomes a non-important one.
- **L4.** Circular imports `craft.js ↔ craft-rules.js ↔ craft-arbitrate.js` are safe today because every shared binding is used only inside functions (no top-level reads of `RULES`, `utility`, `classesOf`). Any future top-level use breaks module evaluation order silently. Move `rgb`/`utility`/`classesOf`/`VIRTUAL` into their own module.

Verified and sound: the `swap` engine path mirrors `set` (hash check before and inside the serialized write, `O_NOFOLLOW`, inode identity, hard-link refusal, `reconcile`, undo `record(before)`); `this.file()` keeps paths inside the root; the server route lists `swap` as POST and as a write for the coordinator queue; `from` in a variant (`hover:px-4`) is refused rather than swapped; a `from` that is not on the element is refused; `to` duplicates already present are not written twice.

---

## Tests

- `e2e/craft.test.mjs:286` (write) exercises one double-quoted attribute, one class in, one out. It would pass with C1, C2, M2, H2 and H3 all present. Add a fixture with `className={cn('…', x)}` (single quotes) carrying a `content-['…']` class and a caps-case element, and assert the file still parses after Write (read it back through `parseSync`, or just assert the dev server does not report a compile error).
- No test writes an insert (`from: ''`), writes on a list (three rows from one line → one write, no "refused"), or writes after the file changed (expect `stale`).
- `e2e/habits.test.mjs:220` (real-quotes) uses only double-quoted attributes with apostrophes; add `alt="5&quot; tall"` and `<p>10 - 2 = 8</p>` and assert no finding (or a valid one).
- `e2e/craft-run.test.mjs` proves the exit codes (1 with findings, 0 clean, 2 unreachable) and SARIF lines against real source lines: good. It does not cover a page where the overlay never becomes ready (M4).
- `e2e/craft-hierarchy.test.mjs:164` proves the composed `pl-5 pr-s6` edit end to end; good, but on a theme where `pl-5` happens to equal 20px (H5).
