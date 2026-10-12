# Shadcn theme shape result

## Layer 1: source definitions are not uses

Fixture and Layer 1 only. Layers 2 and 3 were not started. No commit, as requested by the brief.

### Files changed

- `fixtures/shadcn-theme/components.json`: snapshot of `site/components.json`.
- `fixtures/shadcn-theme/src/styles.css`: snapshot of `site/src/styles.css`, with Layer 1 scope/alias probes, an unrelated raw-colour recipe, `@apply`, and a raw 333ms transition appended. Only `tailwindcss` resolves from this fixture. Imports for `tw-animate-css`, `shadcn/tailwind.css`, and both fontsource packages were dropped; no packages were vendored.
- `fixtures/shadcn-theme/package.json`, `src/App.jsx`, `src/Motion.jsx`: minimal module package and utility/inline-style consumers, including raw `#ff0000`, `p-[13px]`, and motion through `var(--dur-explode)`.
- `src/decisions/theme-sources.ts`: reference graph over effective theme keys, all scoped definitions, variables, and decisions. Traversal handles aliases and cycles without choosing a scoped value.
- `src/decisions/index.ts`: different or conditional backing values leave theme aliases unresolved, including overrides outside bare `:root`.
- `src/rules/attribution.ts`: theme backing properties are source definitions, not nondecision recipes to judge at their declaration sites.
- `src/rules/provenance.ts`: backing references retain theme decision identity. Direct theme references take precedence over transitive ones. Fix choices that reach the declared custom property are removed before messages and source edits are generated.
- `docs/DESIGN.md` section 3.4: documents source definitions, scope handling, unresolved values, and circular-fix prevention.
- `e2e/shadcn-theme.test.mjs`: three built-CLI tests.
- This result file.

Existing unrelated hunks were preserved, including shadow ownership, the same-family tier guard, numeric spacing, and the dynamic-class/undefined-variable work named in the brief.

### Rule as built

A custom property reachable from an effective `@theme` or `@theme inline` token is a source definition. This includes transitive aliases and every selector or at-rule scope. Its declarations are not judged as consumer uses. References to backing values retain the corresponding theme decision for provenance and coverage. Unrelated properties remain judged at their definitions when consumed.

The graph retains all definitions rather than resolving them to one value. Light/dark differences and conditional overrides leave `resolved` absent. A separate guard rejects replacement tokens whose reference chains reach the custom property being declared, directly or through aliases. This guard also covers configured decisions outside the theme.

### E2E tests added

All tests spawn `node dist/cli.js --root <fixture> --json`; the fix test also uses `--verbose` to inspect individual by-value findings.

1. No finding on theme backing definition lines; no circular suggested fix; colour utilities and `@apply` count as decision uses; raw JSX colour, unrelated root recipe colour, arbitrary spacing, and 333ms motion still produce findings. Multi-valued theme decisions have no `resolved`.
2. Static and multi-valued backing uses and aliases count as decisions across `:root`, `.dark`, class selectors, `[data-theme]`, `:root[...]`, `html.dark`, colour-scheme/reduced-motion media queries, `@supports`, and `@layer`.
3. Configured non-theme decisions cannot propose a fix back to the declaration being fixed, either directly or through two aliases. The findings remain, with no circular choice or edit.

### Before and after

Measured on the same fixture using `node dist/cli.js --root fixtures/shadcn-theme` and its `--json` report. Counts describe this fixture, not the changing `site/` tree.

| User-visible count | Before | After |
|---|---:|---:|
| Text report findings, excluding unused-token information | 25 | 21 |
| JSON finding groups, including unused-token information | 30 | 26 |
| Non-dead finding sites | 30 | 24 |
| Colour declarations from decisions | 19 / 27 | 25 / 27 |
| Colour finding occurrences | 8 | 2 |
| Type finding occurrences | 19 | 19 |
| Motion finding occurrences | 2 | 2 |
| Spacing finding occurrences | 1 | 1 |

The two remaining colour findings are deliberate raw JSX colour and the unrelated `--orphan-ink` recipe. Type-tier findings remain for Layer 2. The `--dur-explode` source finding remains for Layer 3. No motion decisions were inferred from `--dur-*` in this layer.

### Validation

- `npm run build`: passed.
- New Layer 1 tests: 3 passed.
- Final focused run: all 17 tests passed across shadcn theme, attribution, false positives, and families. This includes static backing colours and shorthand motion references.
- `git diff --check`: passed.
- Whole-suite `npm test`: 308 passed, 18 failed, 22 skipped (348 tests). All 18 failures also occurred in the baseline; no new failures. The baseline noise timeout passed on this run. Because the main suite failed, npm short-circuited the two remaining serve modes; they were run separately.
- Polling serve mode (`PLUMB_WATCH=1 PLUMB_POLLING=1`): 25 passed, 1 skipped, 0 failed.
- Watch-disabled serve mode (`PLUMB_WATCH=0 PLUMB_POLLING=0`): 23 passed, 3 skipped, 0 failed.

Layer 1 checks are green. The whole-suite-green requirement cannot be claimed while these existing failures and missing-browser checks remain. No unrelated tests or assertions were changed to obtain a green result.

The baseline `npm test` run had 304 passes, 19 failures, and 22 skips before the final Layer 1 suite. The failures were already present in that run; they were not repaired because they are outside this layer. Most ledger/surface failures assert numeric `gap-10` debt that the existing spacing work no longer reports. The noise test timed out. Setup and stamp failed because Playwright Chromium is missing. Browser checks also account for many skips. The baseline failure list is:

- `e2e/ledger.test.mjs:111:1`: baseline records sorted authored keys, exact properties, nearest anchors and counts; check green.
- `e2e/ledger.test.mjs:133:1`: one extra gap-10 yields exactly one new site; baseline refuses debt growth without force.
- `e2e/ledger.test.mjs:153:1`: accept requires why; exception count is bounded; handwritten missing why fails globally.
- `e2e/ledger.test.mjs:177:1`: rule/site acceptance, show and why expose current rules, decisions and ledger lines.
- `e2e/ledger.test.mjs:216:1`: authored keys survive line shifts and spacing multiplier changes.
- `e2e/ledger.test.mjs:230:1`: ratchet shrinks identical counts and drops fixes; prune removes stale exceptions.
- `e2e/ledger.test.mjs:244:1`: rebase moves renamed file/function entries and prints every move; ambiguous moves retained.
- `e2e/ledger.test.mjs:265:1`: base scopes files, reports every added ledger line, and debt growth fails.
- `e2e/ledger.test.mjs:336:1`: empty baseline still refuses later debt growth; rebase cannot transfer fixed sites in a retained anchor.
- `e2e/noise.test.mjs:82:1`: outline suppression accepts visible focus-visible/focus-within and same-element ring utilities, but requires branch/media/element coverage.
- `e2e/setup.test.mjs:126:1`: packed setup: advisory drift, init baseline, install, stamped Alt-hover and a written token fix.
- `e2e/stamp.test.mjs:71:1`: Vite stamps prove exact host JSX, preserve usage and refuse stale evidence.
- `e2e/surfaces.test.mjs:32:1`: SARIF 2.1.0 has required fields, rule help and per-site baseline/fingerprints.
- `e2e/surfaces.test.mjs:64:1`: GitHub annotates new drift and touched debt, writes summary sections and compares base coverage.
- `e2e/surfaces.test.mjs:82:1`: GitHub annotation properties and messages escape authored filenames and reasons.
- `e2e/surfaces.test.mjs:97:1`: summary fixed count and positive coverage delta come from actual base declarations.
- `e2e/surfaces.test.mjs:104:1`: scripted agent applies exact new gap-10 edit, reaches 0 new and preserves ledger.
- `e2e/surfaces.test.mjs:123:1`: agent excludes debt, preserves variants, and does not choose among multiple decisions.
- `e2e/surfaces.test.mjs:215:1`: Action runs real CLI against fixture PR, creates then updates sticky comment and gates ledger approval.

## Layer 1 follow-up

Fixed the backing-variable ownership regression. Layers 2 and 3 remain untouched. No commit, per the brief's ground rules.

### Files changed

- `src/rules/provenance.ts`: a theme decision adds a backing reference only when its entire value is a direct `var(--name)` alias, without a fallback. Existing explicit decision references keep their identity. Project aliases are considered before framework aliases. Removed both the arbitrary-reference scan and transitive source-graph mapping from this index. The broader graph still identifies source definitions and prevents circular fixes.
- `src/lower/tailwind.ts`: retain `--default-transition-duration` and `--default-transition-timing-function` as decision references on compiling transition utilities. This is needed because this installation's Tailwind 4.3.3 substitutes `@theme inline` values into `var(--tw-duration, 140ms)` and `var(--tw-ease, cubic-bezier(...))`. Plain `@theme` keeps the nested default-key references. The compiled fallback must match the actual theme key or its value; arbitrary literals do not gain decision identity. Bumped the lowering cache key so warm reports receive this metadata.
- `fixtures/shadcn-theme/src/App.jsx`: added `transition-all` and `transition-opacity` consumers.
- `fixtures/shadcn-theme/src/styles.css`: added a why comment for the default timing function; both transition defaults now have whys.
- `e2e/shadcn-theme.test.mjs`: added built-CLI assertions for inline/plain theme defaults, transition coverage, an equal literal that still warns by value, and real framework animation references that must not claim unrelated uses. Updated the previous transitive-backing-use expectation: `var(--source-ink)` is not owned by a token whose value is only `var(--source-alias)`. Direct backing uses and source-definition suppression still pass.
- `docs/DESIGN.md` 3.4: documented direct backing ownership and transition-default identity through inline compilation.
- This result file.

The protected shadow, same-family tier and numeric-spacing hunks remain intact. No changes to the collectors, existence rule, false-positive fixture/test, caller-tier inference or motion-decision inference.

### Fixture reproduction and outcome

The framework e2e test resolves real installed `tw-animate-css` and `shadcn/tailwind.css` using their CSS/style exports. Here they resolve from the existing `site/node_modules` installation and are imported into a temporary copy of the fixture. All assertions inspect the built CLI's fixture report, never a `site/` report. No package was installed, fabricated or vendored. When those real dependencies cannot resolve from either installation, only this framework-specific test skips with an explicit reason; the transition-default assertions always run. The framework test did not skip here.

A separate immutable CLI snapshot restored the pre-follow-up backing index and lowerer while retaining the unrelated working-tree changes. On the updated fixture without framework imports it produced the original by-value transition warning. With the real framework imports it reproduced two `provenance/motion/framework` groups naming `--animate-accordion-down`, covering duration and timing-function declarations at both transition utility sites. The fixed CLI produces no motion finding at either utility. A CSS use of `var(--tw-duration, 333ms)` still produces ordinary motion drift even with those animation tokens imported.

Before/after counts use the same updated fixture through `node dist/cli.js --root fixtures/shadcn-theme`, with the pre-follow-up snapshot providing the before report:

| User-visible count | Before | After |
|---|---:|---:|
| Text report findings, excluding unused-token information | 22 | 21 |
| JSON finding groups, including unused-token information | 27 | 26 |
| Non-dead finding sites | 26 | 24 |
| Motion declarations from decisions | 3 / 9 | 7 / 9 |
| Motion finding occurrences | 6 | 2 |
| Motion findings at transition utility sites | 1 by-value group | 0 |

With framework imports, the same transition sites changed from two framework groups (four longhand occurrences) to zero. Deliberate raw colour, arbitrary spacing and 333ms motion findings survive. Existing type-tier and `--dur-explode` findings remain for their later layers.

The requested `npm run build && node dist/cli.js --root site` reproduction now has no motion finding for `button.jsx:6 transition-all` or `Exploded.jsx:107 transition-opacity`. The command still reports the site's other drift; it is not a clean-site claim.

### Validation

- `npm run build`: passed.
- Final focused e2e run (shadcn theme, attribution, false positives, families): 19 passed, zero failures or skips. Five are the Layer 1 fixture tests.
- `npm test`: main suite 310 passed, 18 failed, 22 skipped, 350 total. All 18 failures are the existing failures listed above, excluding the old intermittent noise timeout. The two extra tests passed. No unrelated assertion was changed.
- Rechecked the 16 failing ledger/surface cases against the immutable pre-follow-up CLI: all 16 also fail there. The remaining packed-setup and stamp failures still require the missing Playwright Chromium installation. The initial whole-suite run overlapped rebuilds, so its extra transient installer/module-export failure is not treated as a baseline defect; the installer passes against the immutable snapshot and in the final suite.
- Because `npm test` stops after the failing main suite, ran both remaining serve modes separately: polling mode 25 passed, 1 skipped; watch-disabled mode 23 passed, 3 skipped; zero failures in either.
- `git diff --check`: passed.

Layer 1 follow-up is complete. The whole-suite-green requirement remains blocked by existing out-of-scope failures. Stopped here.

## Layer 2

Implemented only the caller-tier policy and its docs. Layer 1 behaviour is preserved. Layer 3 was not started. No commit, per the brief's ground rules.

### Files changed

- `src/decisions/callers.ts`: shared per-primitive caller policy. It indexes semantic references to primitives of the same family, including CSS and DTCG references. Font slots and `--default-*` aliases are excluded from inferred intent.
- `src/rules/provenance.ts`: use that policy for reference and literal tier checks, nearest choices and suggested fixes. Inferred tier findings suggest the semantic decisions that actually reference the primitive. Explicit caller tiers keep their strict behaviour.
- `src/surfaces/docs.ts`: report the inferred per-primitive policy and list restricted primitives with their caller aliases. Explicit config still prints its configured caller tiers.
- `docs/DESIGN.md` section 2.6: describe per-primitive inference, framework wiring and explicit caller overrides.
- `e2e/shadcn-theme.test.mjs`: three built-CLI feature tests added. Existing tests and their assertions were not changed.
- This result file.

The protected project-shadow attribution/index hunks, numeric-spacing hunks and `decision.family === family` guard in `wrongTier` remain intact. No edits to the protected collectors, existence rule or false-positive fixture/test. The fixture snapshot and `site/` source were not edited.

### Rule as built

Without configured `callers`, a primitive needs a semantic name only when an allowed-origin semantic decision of the same family references it. Other primitives pass, even when their family contains semantic decisions. An equal resolved value alone does not establish that relationship. Tier findings name the actual aliases and offer their utility when available.

Aliases into `--font-sans`, `--font-serif`, `--font-mono`, `--font-heading`, `--font-body` and `--default-*` are wiring. They retain their recorded semantic tier but do not restrict their primitive targets under inference. Explicit `callers: ['semantic']` still restricts every primitive, including font slots and text keys with no intent alias.

Decision inspection retains the existing decision records and tiers. Generated docs no longer claim that the whole family flipped to semantic callers.

### E2E tests added

All provenance assertions inspect `node dist/cli.js --root <fixture> --json`. Docs assertions also run the built `agent-docs` command in a temporary fixture copy and inspect its generated `PLUMB.md`.

1. The snapshot and a temp copy have no type provenance findings for `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-2xl`, `text-5xl`, `font-mono`, `font-serif` or `font-medium`. Every compiled type declaration counts as using decisions. The temp copy adds a direct `text-base` consumer and more font/default wiring aliases. Deliberate colour, spacing and motion drift survives; `--dur-explode` remains a Layer 3 finding.
2. Adding `--text-caption: var(--text-xs)` makes only the `text-xs` size a `/tier` finding. Its fix names `--text-caption` with `use.class === 'text-caption'`. Other type keys still pass. Removing the alias restores passing coverage on a warm check.
3. Explicit semantic callers still produce tier findings for primitive type utilities. Decision inspection keeps font wiring's semantic tier. Generated docs show the inferred alias restriction or the explicit semantic-only policy, as configured.

### Before and after

Measured on the unchanged snapshot with `node dist/cli.js --root fixtures/shadcn-theme` and its JSON report. Before uses the built CLI from before the Layer 2 source change.

| User-visible count | Before | After |
|---|---:|---:|
| Text report findings, excluding unused-token information | 21 | 5 |
| JSON finding groups, including unused-token information | 26 | 10 |
| Non-dead finding sites | 24 | 5 |
| Type provenance finding groups | 16 | 0 |
| Type declarations from decisions | 0 / 19 | 19 / 19 |
| Type finding occurrences | 19 | 0 |
| Colour declarations from decisions | 25 / 27 | 25 / 27 |
| Colour finding occurrences | 2 | 2 |
| Motion declarations from decisions | 7 / 9 | 7 / 9 |
| Motion finding occurrences | 2 | 2 |
| Spacing finding occurrences | 1 | 1 |

A full JSON comparison confirmed that decision records, every non-type fixture finding and all other provenance-family coverage are unchanged. This includes Layer 1 source suppression, backing ownership and transition-default identity.

### Site verification

Ran the requested `npm run build && node dist/cli.js --root site`, followed by the JSON report. There are zero `provenance/type/*` findings anywhere in that report, including all nine requested utilities. Type coverage changed from 0 / 107 to 107 / 107. The pre-change report had 104 target utility sites in type findings. Other site drift remains, including motion custom properties and the authored 400ms delay; this is not a clean-site claim.

### Validation

- `npm run build`: passed.
- Focused CLI e2e run (shadcn theme, families, attribution, decisions-spacing and false positives): 31 passed, zero failures or skips. The required existing family-tier, attribution-tier and spacing-policy tests passed unchanged. All five Layer 1 tests passed.
- Pre-change CLI whole-suite run: 310 passed, 21 failed, 22 skipped, 353 total. The three new Layer 2 regression tests were added while this run used the old built CLI and failed as expected. The remaining 18 failures are the existing baseline failures documented above.
- Final `npm test`: 313 passed, 18 failed, 22 skipped, 353 total. Compared failure names against the pre-change CLI run: the same 18 existing failures, no new failures. Sixteen are ledger/surface cases; packed setup and stamp fail because Playwright Chromium is missing. No unrelated assertion was changed to obtain a green result.
- Because the main suite short-circuits the remaining modes, ran them separately: polling mode 25 passed, 1 skipped; watch-disabled mode 23 passed, 3 skipped; zero failures in either.
- `git diff --check`: passed.

Layer 2 checks are green. The whole-suite-green requirement remains blocked by the same existing out-of-scope failures. Stopped before Layer 3.

## Layer 3

Implemented only motion decision inference. Layer 1 backing ownership and Layer 2 caller policy are preserved. No commit, per the brief. The fixture snapshot and `site/` source were not edited.

### Files changed

- `src/decisions/css.ts`: one shared theme-scope model and separate trailing-comment metadata. Existing root detection and `why:` parsing keep their behaviour for other families.
- `src/decisions/motion.ts`: small motion-only reader. It selects single duration or timing-function values from project theme scopes in the Tailwind entry's import closure.
- `src/decisions/index.ts`: register those motion decisions through the existing source-selection, origin, tier and resolution rules. Keep theme-referenced backing variables under their existing theme identity. Scoped and conditional overrides leave inferred motion values unresolved.
- `docs/DESIGN.md` sections 2.2 and 3.4: document motion inference, trailing reasons, definition ownership and literal delays.
- `e2e/shadcn-theme.test.mjs`: three built-CLI feature tests. Replaced the earlier Layer 2 test's temporary “Layer 3 stays untouched” assertion with its deliberate 333ms drift assertion; all type-policy assertions remain unchanged.
- `e2e/attribution.test.mjs`: update only the obsolete expectation that root `--time: 123ms` is a nondecision. Assert it is a project motion decision and its two consumers count as using decisions. Existing attribution tier checks remain unchanged.
- This result file.

No edits to the protected collectors, existence rule, provenance hunks, false-positive fixture/test, theme-source graph or caller-policy module. Project-shadow ownership, the same-family tier guard and numeric-spacing work remain intact.

### Rule as built

A project custom property with one duration or timing function is a motion decision when declared in `:root`, `html`, a class theme scope or `[data-theme]` in the Tailwind entry graph. Media, supports and layer wrappers retain those scopes. Timing functions include `cubic-bezier()`, `linear()`, `steps()` and timing keywords. Names and missing reasons do not control recognition. The reason uses the preceding `why:` comment first, then a trailing same-line comment.

Definitions are not consumer drift. References retain motion identity even when reduced-motion or other scoped overrides make a decision unresolved. Theme backing variables do not gain a second motion decision, so their Layer 1 reference ownership stays intact. Configured source selection and caller tiers still apply. Other families, stylesheets outside the entry import closure and composite recipes are not widened by this inference. Literal 333ms durations and the literal 400ms delay still produce provenance findings.

Unused motion decisions remain ordinary `dead/motion` information. For example, the site's unreferenced `--dur-quick` and `--stagger` appear in unused-token inventory; their declarations have no motion provenance finding. The default text report prints the unused count without source-line findings.

### E2E tests added

All new tests run `node dist/cli.js --root <fixture> --json`.

1. Root duration definitions have no motion provenance findings. Records carry project origin, inferred tier and trailing-comment reasons. Reduced-motion overrides remain unresolved. The fixture's raw 333ms duration and a temporary JSX transition's literal 400ms delay still fail. Theme-backed `--source-time` keeps its original identity.
2. Project imports cover root, class, attribute, root-attribute and `html.dark` scopes, plus colour-scheme media, supports and layer wrappers. Duration and timing-function references pass. Preceding reasons take priority; missing reasons still allow inference. Unrelated stylesheets, composite recipes, value lists and raw colours keep their existing boundaries.
3. Explicit motion sources can exclude inferred root values. CSS sources can select them, and explicit semantic callers still reject primitive references.

### Before and after

Measured with the built CLI on the unchanged fixture snapshot.

| User-visible count | Before | After |
|---|---:|---:|
| Text report findings, excluding unused-token information | 5 | 4 |
| JSON finding groups, including unused-token information | 10 | 9 |
| Non-dead finding sites | 5 | 4 |
| Motion declarations from decisions | 7 / 9 | 6 / 7 |
| Motion finding occurrences | 2 | 1 |
| Type declarations from decisions | 19 / 19 | 19 / 19 |
| Colour declarations from decisions | 25 / 27 | 25 / 27 |

The remaining fixture motion finding is the deliberate 333ms transition. Motion coverage totals change because inferred definitions stop contributing nondecision recipe debt. Full JSON comparisons on both the fixture and `site/` confirmed every pre-existing decision record is unchanged; only `--dur-explode`, `--dur-move`, `--dur-quick` and `--stagger` were added. Every non-motion finding and coverage family is unchanged.

### Site verification

Ran `npm run build && node dist/cli.js --root site`, then its JSON report. There is no motion provenance finding at any `site/src/styles.css` `--dur-*` or `--stagger` declaration, including reduced-motion overrides. The literal `400ms` remains `provenance/motion` at `site/src/figures/Exploded.jsx:187`, with title `transition 400ms isn't one of your motion tokens`. Motion provenance occurrences changed from 8 to 6; the remaining six are that literal delay and five existing opaque runtime transitions. The default text report changed from four visible finding groups to two.

Final site report summary lines:

```text
classes     372 classes read, 0 do nothing
spacing      50 of  50 use your tokens (100%) 0 don't
color       104 of 104 use your tokens (100%) 0 don't
radius       10 of  10 use your tokens (100%) 0 don't
type        107 of 107 use your tokens (100%) 0 don't
motion        7 of  13 use your tokens (54%)  6 don't
elevation     2 of   4 use your tokens (50%)  2 don't
inline      3 of 9 style attributes have literal values
unused      7 colour, 3 motion, 1 radius, 12 type tokens are never used in your source; if other apps use them, set decisions.<family>.exported
runtime     5 styles in 2 files are computed at runtime and can't be checked (--verbose lists them)
2 findings: 2 values off your tokens
```

### Validation

- `npm run build`: passed.
- All 11 shadcn-theme CLI tests passed in the final suite, including the three new motion feature tests and all Layer 1/2 tests. All 34 checks across shadcn theme, attribution, families, decisions-spacing and false positives passed in that run. The initial focused run exposed only the obsolete root-motion attribution expectation documented above; it was updated for Layer 3, without changing any tier assertion.
- Pre-change built CLI whole-suite run: 314 passed, 20 failed, 22 skipped, 356 total. The two new inference regression tests were added while this run used the old CLI and failed as expected. The third new config-boundary test already passed. The other 18 failures were the existing failures documented in Layers 1 and 2.
- Final `npm test`: 316 passed, 18 failed, 22 skipped, 356 total. Compared failure names against the pre-change CLI run: exactly the same 18 pre-existing failures after excluding the two new red tests. Sixteen are the existing ledger/surface cases; packed setup and stamp still fail because Playwright Chromium is missing. No new failure remains.
- Since the main suite stops before the other serve modes, ran both separately: polling mode 25 passed, 1 skipped; watch-disabled mode 23 passed, 3 skipped; zero failures in either.
- Built-CLI site and fixture JSON assertions: passed. Every pre-existing decision record and every non-motion finding/coverage family is unchanged. Site root-motion declaration checks and the literal 400ms delay check passed.
- `git diff --check`: passed.

Layer 3 is complete. The whole-suite-green requirement remains blocked by the same existing out-of-scope failures. Stopped here.
