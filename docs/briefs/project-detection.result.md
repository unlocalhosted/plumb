# Project detection: result

Implements docs/briefs/project-detection-design.md in layers. Each entry: the layer, its commit, what changed, which
matrix rows and test files ran, and the counts.

## L0b: nested checkouts leave membership

- `src/project-facts/checkouts.ts`: `scanCheckouts(root)` walks the tree under the root (depth 6, skipping the
  static ignore folders) for `.git` entries; a file is a worktree (or a submodule when `.gitmodules` or the
  `gitdir:` line says so), a directory is a vendored clone. `.gitmodules#path` adds declared submodules.
  `projectIgnore(root)` = the static ignore list + `<checkout>/**`. Memoised per root; the session's `refresh()`
  forgets it so a long-running host sees new worktrees.
- `src/project.ts` `matchProjectFiles` and `src/cli-project.ts` `workspaceApps` glob with `projectIgnore(root)`.
- Rows: `nested-worktrees`, `submodule-app`, `vendored-clone` in `e2e/project-layouts.test.mjs` (real
  `git worktree add` / `git submodule add`): 3/3 pass. Existing `e2e/cli-setup.test.mjs` + `e2e/onboarding-state.test.mjs`: 25/25.
- Against ../crafting-ui: `plumber state` now names one Tailwind entry and no `split` flag (was five entries).

## L1: `ProjectFacts` with root, boundary, repo, workspace, apps, packageManager, checkouts

- `src/project-facts/facts.ts`: `Source`, `Evidence`, `Claim`, `Fact`, `resolveFact` (override > observed >
  declared > inferred; registry order within a source; disagreeing losers kept in `conflicts`; unknown never wins).
- `src/project-facts/detector.ts`: `Detector { id, reads, detect(ctx) }`, a per-pass read cache (`read`, `exists`,
  `manifest`, `dependencies`), `runRegistry`. Reads are sync so `boundaryOf` and `packageManagerOf` can serve the
  hot sync callers (`sourceBoundary`, `packageManager`) without a rewrite.
- `src/project-facts/project/`: `workspace.manifest`, `workspace.pnpm` (settings-only file = declared null),
  `pm.manifest` (`package.json#packageManager`), `pm.lockfile` (nearest lockfile up to home; bun and deno too).
- `src/project-facts/index.ts`: `projectFacts(start, overrides)` memoised per `(start, overrides)`;
  `forgetProjectFacts()` from the session's `refresh()`. `findRoot`, `boundaryOf`, `repoOf`, `packageManagerOf`,
  `manifestAt`. `repo` is its own fact (owner decision 5).
- Thin wrappers, no caller text changes: `cliProject`/`workspaceApps` (`src/cli-project.ts`), `sourceBoundary`
  (`src/source-boundary.ts`), `packageManager` (`src/setup-messages.ts`), the CI install line (`src/adoption/install.ts`,
  now also bun and deno). `pnpmDeclaresPackages` moved into the pnpm detector. The inferred two-sibling-apps
  workspace stays in the wrapper for this layer and leaves in L2 with its test.
- Ran: `e2e/cli-setup.test.mjs`, `e2e/onboarding-state.test.mjs`, `e2e/project-layouts.test.mjs` (28/28),
  `e2e/adoption.test.mjs`, `e2e/readiness.test.mjs` (72/72), `e2e/shared-source.test.mjs` (5/5 with
  `PLUMBER_CHROMIUM` pointing at the installed headless shell; Playwright's default revision is not downloaded here).

## L2: failure behaviour and overrides

- R4: `--root X` where X has a package.json is an override (`root.source = 'override'`); the workspace refusal
  does not apply. `--root src/deep` without a package.json still walks up as before (the pinned "Using the project
  at" notice) and is not an override.
- R7: a declared workspace with no React app under its patterns exits 2 with
  `Workspace (pnpm, apps/*) with no React app under those patterns: pnpm-workspace.yaml:1, packages: apps/*.`
  and never "0 apps. Pick one:" (owner decision 3).
- R2: a `pnpm-workspace.yaml` whose `packages:` cannot be read is unknown; the folder runs as one project with one
  stderr notice naming the file, line and reason (today it threw).
- R1: two sibling React apps with nothing declared are no longer a workspace (owner decision 2);
  `e2e/cli-setup.test.mjs` "implicit" case changed in this commit.
- A submodule under a workspace pattern is listed as an app (apps glob skips only the static folders).
- Rows added: `workspace-pnpm-empty`, `workspace-pnpm-unparsable`, `override-wins` (CLI part; the Vite
  `plumb({ root })` part lands with the readiness `project` block in L5), `lockfile-vs-packageManager` (through the
  install hint), `checkout-as-app`. `e2e/project-layouts.test.mjs` 8/8, `e2e/cli-setup.test.mjs` +
  `e2e/onboarding-state.test.mjs` 25/25.

## L3: `host` fact

- Detectors `host.config` (vite.config.* / next.config.*, declared; both present → vite first, next kept in
  `conflicts`), `host.manifest` (deps next/vite, then scripts naming vite, next, react-scripts, parcel, astro,
  remix/react-router, rsbuild, webpack, expo; inferred). A running plugin's `Runtime.host` becomes an `observed`
  claim through `projectFacts(root, { observed: { host } })` and beats every file (owner decision 4).
- Consumers: `hostConfig()` (`src/readiness/config.ts`) parses the fact's file and no longer chooses it;
  `locate.host` (`src/readiness/index.ts`) reads the fact and shows the conflict in its evidence
  (`vite.config.ts:1 vite.config.ts; also next.config.js, ignored`); `installOverlay` (`src/adoption/install.ts`)
  takes the host from the fact; `appsOf` labels apps with `hostOf(folder)`; `src/collect/entries.ts` asks
  `bundlerConfigFiles(root)` instead of probing config names itself (R6 covers it, owner decision 7).
- Memo keyed by the mtimes of the folder and its package.json (plus a 2 s bound for the checkout scan), so a host
  process whose watcher lives in the worker still sees a new config file or lockfile at once.
- `e2e/hosts.test.mjs` "install --overlay … missing package.json" changed: with inferred workspaces gone, the walk
  from a fixture without package.json lands on this repo as a single project; the assertion is now the walk notice
  and no writes.
- Rows: `two-host-configs` (doctor). `e2e/project-layouts.test.mjs`, `e2e/readiness.test.mjs`, `e2e/hosts.test.mjs`:
  71/71 (with `PLUMBER_CHROMIUM`).

## L4: `styling`, `react` and `libraries` facts, with the support model

Owner direction (mid-task) reshaped this layer: three detection systems on one foundation, each detected thing
carrying a support level declared by its detector.

- `src/project-facts/support.ts`: `Support = supported | partial | unsupported`; `Detected { id, label, support,
  judged?, skipped?, next?, source, evidence, detail? }`; `describeDetected()` gives the one-line form
  (`styled-components (src/Button.tsx:3); not judged yet. …`).
- `src/project-facts/styling/`: registry with `styling.tailwind` (one `require.resolve`, memoised; installed beats
  declared for the major, owner decision 1; v4 supported, v3 and declared-not-installed `unsupported` with the step
  out) and `styling.plain` (React without Tailwind, supported). `tokens.ts` names the token source: shadcn
  `@theme inline` (with `components.json`), `@theme`, `:root` custom properties, or a JS theme object. The styling
  context carries a bounded list of stylesheets under the source folders (membership applied).
- `src/project-facts/libraries/`: one registry entry per family (`libraryFamilies`): Radix, Base UI
  (`@base-ui-components/*`), Headless UI, MUI, Chakra, Emotion, Mantine, styled-components, daisyUI,
  tailwind-variants, CVA, each with a support note. The remaining families (`@base-ui/react`, React Aria, Ark,
  shadcn, tailwind-merge, clsx) land one per commit in L6.
- `src/project-facts/project/react.ts`: `react` fact (`installed`, `declared`) from one resolve.
- Consumers: `resolvedTailwind`, `tailwindSetupProblem`, `checkingPlainCss`, `overlaySetupNotice`
  (`src/setup-messages.ts`), `tailwindVersion` (`src/project.ts`), `locate.react-dev` (`src/readiness/index.ts`),
  `readState` major precedence and `libraries` (`src/onboarding/state.ts`; the regex at line 82 is gone).
- `fixtures/onboard-v3/node_modules/tailwindcss/package.json` (3.4.17) added so the v3 fixture's installed version
  is v3; without it the resolve walked up to this repo's Tailwind 4 and installed-beats-declared flipped the rung.
- Deviation: the Tailwind CSS *entry* is still chosen by `discoverProject` (it needs the full membership glob and
  the app-entry tie-break); the styling fact records the first importing stylesheet as evidence only.
- Rows: `tailwind-declared-not-installed`, `plain-css-react`. Ran `e2e/cli-setup.test.mjs`,
  `e2e/onboarding-state.test.mjs`, `e2e/project-layouts.test.mjs`, `e2e/adoption.test.mjs` (53/53);
  `e2e/readiness.test.mjs`, `e2e/hosts.test.mjs`, `e2e/next-install.test.mjs` (79/79 with layouts).

## L5: facts are public

- `publicFacts()` (`src/project-facts/index.ts`): the facts with `root`, `boundary`, `repo` relative to the root
  (`.`/`../..`), `experimental: true` (owner decision 6; one release), everything else as detected.
- `plumber state --json` gains `facts` (the check header's sentence path does not compute it);
  `/__plumb/readiness` gains `project`; `plumber doctor` prints a `Project` table between Readiness and
  Diagnostics: one row per fact with value, source and the first evidence line (`Checkouts: 2 nested, excluded
  .claude/worktrees/a (worktree, .claude/worktrees/a/.git:1), …`).
- Hosts pass `rootOverride` (`plumb({ root })`, `withPlumb`/route `root`) through `readinessProject` on both the
  warm and the diagnostic dispatch paths, so the readiness `project.root.source` is `override` only when asked.
- R6 guard in `e2e/release-guards.test.mjs`: a presence check (`existsSync`/`statSync`/`accessSync`) or a version
  probe (`resolve('tailwindcss/package.json')`, `resolve('react')`) on a project-identity name outside
  `src/project-facts/` fails the suite. To get there: `components.json` probes in `craft-spec.ts`, `propose.ts`
  and `init.ts` go through `hasShadcnConfig()`; `check-cache.ts` takes the compiler package path from
  `tailwindInstall()`; `collect/entries.ts` already went through `bundlerConfigFiles()` in L3.
- Cross-cutting checks in `e2e/project-layouts.test.mjs`: (a) `state --json#facts` equals the readiness `project`
  block from a real Vite dev server (host source aside: observed there, inferred in the CLI; root source aside when
  overridden); (b) every known fact has evidence and every evidence file exists; (c) the snapshot check runs on every
  `run()`. Rows: `nested-worktrees` (now also facts, doctor, Vite readiness `locate.source` free of worktree files,
  and inside a worktree boundary/repo are `.`), `override-wins` through Vite.
- `e2e/fixtures/onboarding-state.json` regenerated by the CLI; verified that nothing beyond the new `facts` key
  changed.
- Ran: `e2e/project-layouts.test.mjs` 13/13; `e2e/readiness.test.mjs`, `e2e/hosts.test.mjs`, `e2e/adoption.test.mjs`,
  `e2e/cli-findings.test.mjs`, `e2e/readiness-panel.test.mjs`, `e2e/state-publication.test.mjs`,
  `e2e/cli-setup.test.mjs` 102/102; `e2e/onboarding-state.test.mjs` + `e2e/check-cache.test.mjs` 24/24;
  the R6 guard 1/1.
