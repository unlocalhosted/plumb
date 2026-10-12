# Slice 0a: Vite source stamping

Implemented the review's attribute-only identity path.

- `src/hosts/source-stamping.ts`, mounted by `plumb()`, runs before React in dev. React-first configurations refuse with a diagnostic naming the plugin. Oxc finds openings; MagicString appends the prop after authored attributes/spreads and preserves every authored position in a high-resolution map. Stamps use encoded project-relative paths, original 1-based opening positions, and 12 hexadecimal characters from the existing `sourceHash`.
- Builds, Vitest, dependencies, virtual modules, untracked sources and external symlink targets are skipped. Authored attributes win per opening; shorthand and named/member Fragments stay untouched. Source files are not rewritten by the transform.
- `resolveSource` confirms stamped evidence against disk: exact opening start, host tag and hash prefix. Component openings are confirmed as usage links. Mismatches return `source-mismatch`; encoded stamp paths resolve against the project root, preserving literal delimiters.
- `locate` reads the committed host fiber's `memoizedProps`, confirms the stamp, and retains owner-stack navigation. Forwarded usage links are marked `usage: true` without changing the default selection. Missing/refused stamps use the existing fallback. No birth helpers, manifests or generations were added.
- Existing locate fixtures explicitly disable the transform to keep testing the unstamped fallback; their assertions remain unchanged.

## Checks

All browser runs used the requested `PLUMB_CHROMIUM`. Test temp/profile files and subsequent npm caches were directed inside Plumb.

| Command | Output |
| --- | --- |
| `npm run build` | Exit 0; 0 TypeScript diagnostics |
| `npm run typecheck` | Exit 0; 0 TypeScript diagnostics |
| `node --test --test-concurrency=1 e2e/stamp.test.mjs e2e/locate.test.mjs e2e/owner-locate.test.mjs` | 24 tests: 24 passed, 0 failed, 0 skipped |
| Final `node --test --test-concurrency=1 e2e/stamp.test.mjs` after adding delimiter coverage | 11 tests: 11 passed, 0 failed, 0 skipped |
| `git diff --check` | Exit 0; 0 whitespace errors |

The new fixture covers host proof without stacks, forwarded library usage, spread precedence, authored attributes, all three Fragment forms, every authored map position, DOM tampering, exact-start/tag/hash refusals, tracked-source exclusions, encoded paths, stale disk evidence, React plugin order, Vitest exclusion and production output. The regression run includes both React versions and both Next bundlers.

## Limits and deferrals

No full suite, benchmark verifier, app-repository edits, installs, commits, pushes or worktrees. Concurrent changes to `bench/apps/verify.mjs`, `docs/briefs/verify-frozen.*` and unrelated work were left alone. Broader live-editor layers remain deferred as the brief requires.

Vite's own filename restrictions remain in force: the Vite pipeline exercises `&` encoding; literal `:`, `#`, `?` and `%` preservation is checked through the real resolver against tracked files. No Vite filesystem checks were bypassed.

Execution caveat: the initial build used npm's default log/cache settings before subsequent commands redirected npm cache and `TMPDIR` into Plumb.
