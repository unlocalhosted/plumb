# Causes model, layer 1: result

Branch `worktree-agent-a0f8b3ff570463aa8`. Spec: `docs/design/onboarding.md`, layer 1. (That file is untracked in the
main checkout, so it is not in this worktree; I read it from there.)

## 1. What existed, what changed

**Existed.** Three things called "cause" or grouping findings, none of them the model:
- `src/session/engine.ts` `Cause = { rule, text, choice }` and `swapCause`: the overlay's "Fix all". One cause there is
  one (rule, class text) pair and one chosen token. It is the apply request, not a grouping.
- `src/cli-findings.ts` `findingLines`: the CLI's human grouping, per rule family and per subject text.
- `src/rules/provenance.ts` `groupByValue`: folds `by-value` findings of one family into one finding.
- `e2e/causes.test.mjs` covers the apply side (Keep it, Make it yours, Add to theme), not grouping.

Nothing grouped across rules. White was three findings under `existence/dead-class`, `provenance/color/by-value`
(and `provenance/color`).

**Built on it, not beside it.** `Cause.fixes` is a list of the existing `{ rule, text, choice }` requests, so the
existing `apply-all` + `swapCause` takes a whole cause with no new write path.

Files (commit `7f9a7bb`, layer 1: model and CLI shape):
- `src/causes.ts` (new): the one implementation, `causesOf(report)`.
- `src/index.ts`: `check()` sets `report.causes`; exports `causesOf` and the types.
- `src/report.ts`: `Report.causes?`.
- `schema/report.schema.json`: `causes` and `$defs/cause` (the schema has `additionalProperties: false`).
- `e2e/causes-model.test.mjs`, `e2e/helpers/causes-project.mjs`.

Files (commit `39de495`, layer 2: server):
- `src/session/worker.ts`: the `report` read returns the report with `causes`, as a copy (the shared cached report
  never carries causes). This is what keeps the session report equal to a cold check; `e2e/serve.test.mjs` asserts that.
- `src/session/index.ts`, `src/session/server.ts`: `Session.causes()` and `GET /__plumb/causes` (in the HTTP and
  JSON-RPC method lists).
- `src/messages.ts`: a bug I found and fixed (see section 5).
- `e2e/causes-session.test.mjs`.

I did not touch `overlay/src/*` or the project page.

## 2. The cause shape (crafting-ui, white; places trimmed to 2 of 90, fixes to 3 of 20)

```json
{
 "id": "value:color:#ffffff",
 "kind": "value",
 "family": "color",
 "value": "#ffffff",
 "label": "white",
 "count": 90,
 "rendersNothing": 22,
 "spellings": [ { "text": "#ffffff", "count": 49 }, { "text": "white", "count": 22 }, { "text": "in code", "count": 18 }, { "text": "#fff", "count": 1 } ],
 "rules": [ "existence/dead-class", "provenance/color", "provenance/color/by-value" ],
 "status": { "new": 90, "debt": 0, "exception": 0 },
 "suggestion": { "token": "--color-on-accent", "name": "on-accent", "exact": true, "alternatives": [ "--color-surface" ] },
 "places": [
  { "file": "src/motion/examples/BeatCutExample.tsx", "line": 70, "column": 64, "text": "background: ground", "rule": "provenance/color/by-value", "spelling": "in code", "rendersNothing": false },
  { "file": "src/motion/examples/BeatCutExample.tsx", "line": 75, "column": 31, "text": "fill: ink", "rule": "provenance/color/by-value", "spelling": "in code", "rendersNothing": false }
 ],
 "fixes": [
  { "rule": "existence/dead-class", "text": "bg-white", "choice": "bg-on-accent" },
  { "rule": "existence/dead-class", "text": "border-white", "choice": "border-on-accent" },
  { "rule": "existence/dead-class", "text": "focus-visible:ring-white", "choice": "focus-visible:ring-on-accent" }
 ]
}
```
(`places[].file` is absolute in the real output, like the findings' sites; shortened here. A dead-class place also
carries `to`, e.g. `"to": "bg-on-accent"`.)

How a cause is made: every finding that puts a value on a place (a `provenance/*` finding's occurrences, plus a dead
class that names `white` or `black`) is keyed by its resolved value. Colours are keyed by sRGB hex plus alpha, so
`white`, `#fff`, `#FFFFFF` and `oklch(100% 0 0)` meet; white at 15% is its own cause. Other families are keyed by one
number with its unit (`0.9375rem` and `15px` are one cause, `value:type:font-size:15px`). Sorted by place count.

## 3. The proof

Fresh copy of crafting-ui (working tree, minus `.git`, `node_modules` (symlinked), `.claude`, `dist`, tests) at
`fixtures/.causes-proof-crafting` in this worktree. The original was not touched.

```
node dist/cli.js check --root ./fixtures/.causes-proof-crafting --json | node <scratchpad>/causes-l1/show.mjs
```
(`show.mjs` only prints `causes.find(c => c.id === 'value:color:#ffffff')` with places trimmed.) Raw output is the
JSON in section 2, plus:

```
places by rule+text: [["provenance/color/by-value bg-[#ffffff]",23],["provenance/color/by-value text-[#ffffff]",15],["provenance/color/by-value background: '#FFFFFF'",6],["existence/dead-class bg-white",6],["existence/dead-class text-white",5],["existence/dead-class focus-visible:ring-white",5],["existence/dead-class border-white",5],["provenance/color/by-value fill: ink",4]]
total causes 458 | top 3: value:type:font-weight:500 159 ; value:color:#ffffff 90 ; value:type:font-weight:600 85
```

**Real numbers: 90 places, 22 render nothing, not 39 and 6.** Why:
- The spec's 39 and 6 count three findings: `bg-white` 6, `bg-[#ffffff]` 18, `text-[#ffffff]` 15. Today the same
  three are 6, **23** and 15 (crafting-ui's working tree has moved since the spec's run, which came from commits
  `88f9672`/`bc01704`). So the 6 renders-nothing for `bg-white` is exact; the 23 is a real change.
- White is also written in ways those three findings do not include: `text-white` 5, `border-white` 5,
  `focus-visible:ring-white` 5, `hover:border-white` 1 (all render nothing: that is the other 16 of the 22), more
  `[#ffffff]` copies (`border-`), inline styles (`'#FFFFFF'`, `'#fff'`), and 18 places where a variable or ternary
  carries white (`fill: ink`, `background: ground`). A cause is what the author meant, so they belong to it. I did not
  trim the model to hit 39.
- The suggestion is `on-accent` (`exact: true`; `--color-surface` is the one alternative) and `bg-warning` appears
  nowhere in the cause. The old dead-class finding still lists `bg-warning` first; the cause does not use it.
- White is not the biggest cause: font-weight 500 (159 places, mostly Tailwind's `font-medium`) is. So a terminal that
  shows "the biggest 3" would not lead with white on this project. That is a decision for layer 2 of the spec (ranking),
  not for the grouping.

## 4. Tests, and how each fails on the old code

Integration only, through the real boundary: the CLI's `--json` and the session server's HTTP API. The fixture is
crafting-ui's white in small (`e2e/helpers/causes-project.mjs`): a theme with `--color-*: initial`, `--color-on-accent:
#ffffff` and `--color-warning`, so `bg-white` renders nothing and the old finding offers `bg-warning`.

`e2e/causes-model.test.mjs` (CLI `--json`):
1. white is one cause across three rules: 6 places, 2 render nothing, spellings `{white 2, #fff 1, #ffffff 3}`,
   suggestion `on-accent` exact, `to` per place, one apply request per spelling, no `warning` anywhere in the cause.
   It also asserts the old state that makes it meaningful (the same white sits under dead-class and by-value, and the
   dead-class finding's first choice is `bg-warning`).
2. white at 15% is its own cause, keeps its alpha in `to` (`text-on-accent/15`), and its suggestion is not exact.
3. `15px` and `0.9375rem` are one cause (`value:type:font-size:15px`), with no exact answer and no fixes.
4. causes are sorted biggest first, and every place is a place some finding reported.

`e2e/causes-session.test.mjs` (HTTP):
5. `GET /__plumb/causes` returns the white cause and equals the CLI's causes (ids, counts, renders-nothing, suggestion,
   fixes).
6. A cause's `fixes` posted to `apply-all` as `swaps` rewrites `bg-white` to `bg-on-accent`, and the three copies,
   in the file; every swap is ok; the cause then has 0 renders-nothing and only the inline style left.

**Failing on old code, shown in a scratch copy** (`git archive HEAD` of the pre-change commit `6a60a0d`, built with
the same `node_modules`, tests copied in; not by reverting shared source):
```
cd <scratchpad>/causes-l1/old && node --test e2e/causes-model.test.mjs e2e/causes-session.test.mjs
```
- Tests 1-4: fail, `AssertionError: the report carries causes` (test 1 passes its first two assertions first: the
  three-rule split and `bg-warning` are real on old code). Tests 2-4 fail on the missing `causes`.
- Test 5: fails, `{"error":"Endpoint not found."}`. Test 6: fails, `body.find is not a function`.
- Test 6 also needs the `src/messages.ts` fix. Shown separately: a copy of the final tree with only `messages.ts`
  reverted to HEAD fails test 6 with the dead class refused: `"reason":"This spelling cannot be rewritten
  automatically; change it by hand."`.

Regression runs (targeted, one process at a time, after `npm run build`): `serve` 25/25, `causes` (existing) + `messages`
+ `edits` + `edits-places` + `inline-edits` 57/57, `cli` 45/45, `ledger` 17/17, `check-cache`, `noise`, `docs-cli`,
`apply-all-hot`, `cli-build-cache`, `causes-model` 4/4, `causes-session` 2/2. Three failures exist and are **not
mine**: `cli-findings` "site read-only human reports fit real 80/140-column PTYs", and `report` "large first-run
summary…" and "ledger default shows only new sites…". I ran all three on the pre-change build; they fail identically.
Not run: the full suite, and the browser tests (`blueprint*`, `overlay*`, `fixpanel`, etc.), on purpose (memory).

## 5. Not done, not sure

- **Only `kind: "value"` causes.** The spec also names "a component" and "a scale step". Not built. `places`, `fixes`
  and `suggestion` are kind-neutral, so they can be added without changing the shape; `kind` is a literal today.
- **Not every finding is in a cause.** Gradients, `var()`/`calc()` values, font stacks, shadows, `font:` shorthands,
  z-index lists, ownership, habits, `config/*` and `dead/*` findings stay findings only. Non-colour families need one
  plain number; `rem` is converted at 16px, `em` and `%` are kept as written.
- **Only colours get an exact suggestion.** For other families the suggestion is the nearest step the findings
  already name (`15px` gives `md`, `exact: false`), by vote over the places. The vote is shallow: I saw `font-weight`
  causes with no suggestion because the framework rule gives an `adopt`, not a choice. A "Make it yours" suggestion
  for those is not exposed.
- **`value:type` keys by property only for font-size, line-height, font-weight, letter-spacing.** Other families key by
  value alone, so a 15px gap and a 15px radius are different families but a 15px `padding-left` and a 15px `gap` are
  one cause. Probably what you want for a scale; not checked with you.
- **Inline-style places have no fix.** `background: '#FFFFFF'` is a place of the cause, but the engine edits it as a
  property, not a class swap, so `fixes` leaves it out (apply-all refuses it). Fixing it needs the property edit
  path, which is not a class swap.
- **Alpha causes** (`white at 15%`) have a suggestion with `exact: false` and fixes only for dead classes
  (`text-on-accent/15` says it exactly); by-value alpha copies get none.
- **Ledger status is per place** (`status` counts new/debt/exception); `fixes` do not skip excepted places.
- `spelling: "in code"` hides what a variable or ternary is; the place's `text` still has it.
- **A bug I found and fixed on the way (`src/messages.ts`, `classEdit`):** swapping a dead class to a class whose name
  contains a hyphen (`bg-white` to `bg-on-accent`) was refused, because `utilityValue` reads `bg-on-accent` as utility
  `bg-on`. Fix: same utility if `use.class` starts with `<utility>-`. This changes any single swap or apply-all of
  that shape, not only causes. Covered by test 6.
- The causes are recomputed on every `report` read in the worker (not cached); on crafting-ui I did not measure the
  cost. `check()` computes it once per run.
- `fixtures/.causes-proof-crafting` (81 MB, untracked, not committed) is left in the worktree for review; delete it
  with the worktree.
- `docs/design/onboarding.md` is untracked in the main checkout; if it should be in git, that is a separate step.
