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
