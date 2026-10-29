# Dogfood bugs: result

Five bugs found running plumb on /Users/vijaysingh/unlocalhosted/crafting-ui. One commit each, fixed at the system.
Commands run from crafting-ui with `./node_modules/.bin/plumber`.

## 1. Readiness contradicts itself across entry points

Commit: 2198aa2

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
