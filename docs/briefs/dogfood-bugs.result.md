# Dogfood bugs: result

Five bugs found running plumb on /Users/vijaysingh/unlocalhosted/crafting-ui. One commit each, fixed at the system.
Commands run from crafting-ui with `./node_modules/.bin/plumber`.

## 1. Readiness contradicts itself across entry points

Commit: a44343d (amended hash may differ; subject: fix(readiness): one definition of a setup gap)

System: "setup gap", "off" and "degraded" were defined three times (the `check` summary counted config findings and hints,
doctor counted every missing requirement, the capability roll-up treated any missing `read.*` as "off"), and the CLI
treated "cannot observe a running host" as a defect. Now: `setupGapFamilies(report)` (src/report.ts) is the one definition
(a family with values and no tokens); `plumber` and doctor both use it. Read is off only when styles are unreadable; a
missing token family degrades it. Without a live host, `locate.react-dev` and `write.watcher` stay `unknown` and a
capability whose only open checks are those reads `verify in dev` (JSON `unknown`). Doctor exits 1 only when a capability
is off, or Node/config/Tailwind/ledger-file are broken; a missing config, ledger, token family or baseline exits 0.
Other missing requirements are counted as "other fixes", not gaps.

Tests: e2e/readiness.test.mjs 53 pass / 0 fail (new case: one missing token family; pinned exit codes and the header
changed where behaviour changed). e2e/onboarding-write.test.mjs 8/0. Also run, 0 failing: adoption, cli-findings, cli-setup,
cli-progress, docs-cli, library-adapters, messages, project-layouts, report, surfaces, styling-detection.

Before (`plumber doctor`, then `plumber`):

    Readiness: 3 setup gaps · 2 checks need verification
      off          Read
      degraded     Remember
      degraded     Fast
      degraded     Locate
      degraded     Preview
      degraded     Write in place
      degraded     Blueprint
      unavailable  System panel
    ...
    exit 1
    plumber:   ! 2 setup gaps                    type roles not set               plumber check --rule config
    /__plumb/readiness (Vite): Locate, Preview, Blueprint all `full`

After:

    Readiness: 1 setup gap · 2 other fixes · 2 checks need verification
      degraded       Read
      degraded       Remember
      degraded       Fast
      verify in dev  Locate
      verify in dev  Preview
      verify in dev  Write in place
      verify in dev  Blueprint
      unavailable    System panel
    exit 0
    plumber:   ! 1 setup gap                    tokens missing                   plumber check --rule config

Decision for the owner: type roles ("Type roles aren't configured") were counted as a gap by `plumber` but doctor calls a
type family with tokens "ready"; I made type roles advice (still shown under Setup), not a gap. Say if you want it a gap.
The /__plumb/readiness live check was not re-run against crafting-ui's dev server (unverified; covered by the new e2e).

## Bugs 2 to 5 (one batch, one build, one test run, per the owner's correction)

Commit: e31f38c (subject: fix(check): hooks are not broken; suggestions by value; negative steps; plain words in state)

### 2. Hook classes reported as broken
System: "does this class have CSS" was the only question asked of a class; whether the project's own code *selects* it
(a hook) was never asked. New src/collect/selector-hooks.ts: a class that appears as `.name` in a string literal,
template text or JSX `<style>` text of the project's source (querySelector, closest, `{ sel: '.x' }`, inline sheets) is a
hook and is dropped from `existence/dead-class`. A name only in a comment still counts as broken.
Before (`plumber check --broken`): `fr-glass  no CSS; browser applies nothing  4 sites in 1 file` and `st-shadow  ... 3 sites in 3 files`.
After: both lines absent; `bg-white  no CSS; browser applies nothing  6 sites in 2 files` still reported (genuinely broken, `--color-*: initial`).

### 3. Suggestions by value
System: the dead-class ranker is name-only (prefix, edit distance), so a colour or spacing class was matched by spelling.
New src/rules/value-suggestions.ts: for colour utilities with a knowable colour (`white`, `black`, any CSS name) it ranks the
project's colour tokens by OKLab distance; for numeric spacing utilities (`p-4` = 16px on the default step) by px distance;
same family only; opacity and variants kept; name ranking remains the fallback. The fix text is shared by CLI and overlay data.
Before: `bg-white -> Did you mean bg-warning or bg-current?` (also text-white -> text-warning or text-2xl, border-white -> border-warning or border-2).
After (crafting-ui):
    ✗  bg-white      -> Did you mean bg-on-accent or bg-surface?
    ✗  border-white  -> Did you mean border-on-accent or border-surface?
    ✗  text-white    -> Did you mean text-on-accent or text-surface?

### 4. `--z--10`
System: names were built by gluing `compact(amount)` onto a prefix in each family, so any negative gave `--prefix--N`.
One normalising pass in src/onboarding/ladder.ts now writes a negative step as `n` (the convention tracking already used:
`--tracking-n40`), for every family. `propose --write` writes `--z-n10: -10;` (checked in the e2e: it round-trips).
Before: reported in the brief as `--z--10` (not re-run here: unverified).
After (`plumber propose`, crafting-ui): `Layers: 15 layers in use snap to 10 steps (n10…50).` and `--z-n10             -10                2     1  src/pages/MultiplaneB…`

### 5. Insider jargon
System: the human renderer printed the machine record (rung code, kind id, flag ids). New `describeState` (src/onboarding/state.ts)
is the one place that turns them into words, used by `plumber state` and the readiness evidence; codes stay in `--json`.
`plumber spec` printed `access · tier 0 access`; it now prints the principle name only. (Rule ids like `provenance/spacing` stay: they are what `--rule` and `accept` take.)
Before: `R3 Partial · own · noisy`
After:  `A system, half in use · your own tokens · many one-off values`

### Tests (single run after one build)
e2e/classes.test.mjs (2 new cases), onboarding-write.test.mjs (1 new), onboarding-state.test.mjs (1 new), craft-spec.test.mjs (1 pin changed),
plus onboarding-propose, false-positives, cli-findings, report, messages, readiness: 129 pass, 1 fail.
The 1 fail is "the page judges against the project's spec" in craft-spec.test.mjs, which drives the overlay in a browser and hangs here;
it did not reach any assertion I touched. Unverified whether it fails without my change (overlay is mid-edit by the lead).
Red-first was not run for the new cases (no checkout of the old build); the "before" lines above are the proof of the old behaviour.
