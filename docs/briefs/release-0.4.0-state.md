# Release 0.4.0: where it stands (2026-11-10)

Branch `integrate-0.4.0` = `main` + `release-0.4.0` + the work of 2026-11-10. Nothing is pushed, tagged or published.
npm's latest is 0.2.0.

## The numbers

| Tree | Where | Passed | Failed |
|---|---|---|---|
| `main` (e058256) | GitHub CI, Node 24 | 981 | 49 |
| `integrate-0.4.0` (394f89c) | vm-agent, 4 cores, 35.6 min | 1,017 | 30 |

The joined tree fails fewer tests than `main`, but 22 of its 30 are not on `main`'s list. Three of those were a
regression of mine, fixed in a52f887. The rest are below, sorted by running `main` on the same machine for the same
files.

## Fails on `main` too, on the same machine: not the release

| Test | Why |
|---|---|
| `hosts`: install --overlay detects hosts | The test expects the checkout folder to be named `plumb`; on vm-agent it is `plumb-ci`. |
| `cli-findings`: reports fit 80/140-column terminals | Fails on `main` there as well. Not looked into. |
| `session-burst` (3 tests) | A latency gate; another suite was running beside it. Needs a quiet run. |
| `locate-bench` | `overlay/showcase` has its own dependencies and nothing installs them on vm-agent. |
| `site-text`, `site-replay` | The same for `site/`. CI installs it (`npm ci --prefix site`); the remote script does not yet. |

## Passes on `main`, fails on the joined tree: the release's own

Each of these is a difference in behaviour that 0.4.0 introduced. For each, either the new behaviour is intended and
the test is out of date, or it is a bug. That is a decision about the product, so they are listed with what happens
now, not fixed.

| # | Test | What `main` does | What 0.4.0 does | Likely cause |
|---|---|---|---|---|
| 1 | `decisions-spacing`: spacing policies | A stylesheet at the project root that nothing imports is not part of the theme; with tokens only from a package, the finding is "no tokens of your own". | That stray stylesheet's `@theme` counts as the project's theme, so there is no finding. Reproduced by hand, cold. | With no `source` in the config, everything that is yours is tracked, so every stylesheet in the project is read. |
| 2 | `serve` (3 modes): startup inventory | A file in a dotted folder (`src/.hidden/Probe.tsx`) is read. | It is left out. | The "yours" rule treats a tool's dotted folder as generated. |
| 3 | `stylesheets-inline`: CSS proof across workspace and package | Reports the class a kit leaves unused. | Reports two raw values instead. | What counts as yours across a workspace boundary. |
| 4 | `onboarding-state`: two Tailwind entries and a workspace root | `check` refuses and asks for one app (2 messages). | It does not refuse (0). | Project detection when the project sits inside a larger repository. |
| 5 | `shared-source` (Vite and Next) | An element from a file of yours outside the configured source says "outside this project's source". | It answers with the line where you used the component. | Usage answers for anything not stamped. The signed-off stamping spec reads as if this is intended. |
| 6 | `served-root`: Next apps/site on webpack | The answer comes from React's owner stack. | The answer comes from the stamp, marked partial. | Stamping is always on now; the expectation looks out of date. |
| 7 | `timeline-real`: a class written where a component is used | The outline is on the element that changed. | The outline is on a different element. | Usage-site logic. Not diagnosed. |
| 8 | `blueprint-late-mount` | Blueprint opened before the app mounts is sampled while not done. | Nothing is sampled before the mount, on vm-agent only. | "Ready" now waits for the page to hydrate; the test waits for ready first. |
| 9 | `bare-page`: opens the page on a real terminal | With `--no-open` or CI it does not open. | It opened. | Not diagnosed. |
| 10 | `hosts`: Next responds during startup | Passes. | Crashes with an uncaught assertion. | Not diagnosed. |
| 11 | `next-install`: Next 16 linked install | (test is new on the release) | A subtest fails. | Not diagnosed. |

Rows 1 to 5 look like one family: 0.4.0 changed what "your code" means (inside the repository, not installed, not
generated) and made that the default when no `source` is configured. The tests that fail are the ones that check the
edges of the old meaning.

## After the owner's answer (same day)

The owner confirmed that tracking everything that is yours by default is intended, and said to update the tests.

| # | Outcome |
|---|---|
| 1 `decisions-spacing` | Test updated: a stylesheet of yours at the root is part of your theme; without it, a package's tokens alone leave "no tokens of your own". Passes. |
| 2 `serve` | Test updated: a dotted folder is a tool's until the app imports it. Passes. |
| 3 `stylesheets-inline` | Test updated: it names `src/` as the source, because it is about a package that is not your source. Passes. |
| 4 `onboarding-state` | Test updated to the design's rule R4: a folder named with `--root` runs. Passes by name. |
| 5 `shared-source` | **Not a stale test: a bug, fixed in the product (573f72e).** A file of yours that `source` leaves out was answered with the usage around it. It says "outside this project's source" again, with the file, and setup offers to add it. The Vite test passes unchanged; the Next one runs on vm-agent. |
| 6 `served-root` | Test updated: its Next host is unstamped on purpose, through the internal switch. Passes. |
| 7, 9, 10, 11 | Still not diagnosed. |
| 8 `blueprint-late-mount` | Not touched: passes locally, fails on vm-agent only. |

## What publishing needs

1. A decision on rows 1 to 6: intended, or bug. Intended ones get their tests updated; bugs get fixed.
2. Rows 7, 9, 10, 11 diagnosed.
3. `npm publish` runs `prepublishOnly`, which runs the whole suite and stops on any failure. Either the suite is green,
   or the publish is done with `--ignore-scripts` after a deliberate decision about what is left red.
4. Push `integrate-0.4.0`, open the pull request into `main`, tag `v0.4.0`. 0.3.0 was tagged and never published.

## What is new in this tree since `release-0.4.0`

- `main`'s 41 commits: one guarded write path, a code on every refusal, request schemas, declared state machines.
- The project's text styles are the same from every page (census fix).
- A stamp is one module on each side; the copy count in a monorepo is right.
- Applying fixes does not reload the page (Vite); Next measured, nothing to fix; the demo runs Fast Refresh.
- The test runner: side by side inside core and memory budgets; `scripts/test-remote.sh` for vm-agent.
- `release-guards` passes in full.
