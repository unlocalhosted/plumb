# pnpm settings-only pnpm-workspace.yaml

## Changed
- `src/cli-project.ts`: `explicit` is now `workspaces !== undefined || pnpmPackages`; a pnpm-workspace.yaml counts only when it has a `packages:` key (block or inline). Settings-only file means a single project.
- `src/source-boundary.ts`: new `pnpmDeclaresPackages(yaml)` (shared by both); `sourceBoundary` uses it.
- `e2e/cli-setup.test.mjs`: new case, a React+Vite app with the pnpm 11 settings yaml runs `--json` and `--json --root .` with exit 0 and no "This is a workspace" message. It fails without the fix (verified). The existing `pnpm` case in the workspace test still proves `packages:` is a workspace.

## Test
`npm run build && node --test e2e/cli-setup.test.mjs`: 10 pass, 0 fail.

## source-boundary answer
It was wrong for this case, so it is changed. A settings-only file inside a subfolder of a Git checkout made that subfolder the boundary, hiding shared source outside the app that the Git root would allow. Now only a yaml with `packages:` bounds the repo; otherwise it falls through to package.json `workspaces`, then `.git`. When the yaml sits at the project root, behavior is unchanged.
