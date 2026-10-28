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
