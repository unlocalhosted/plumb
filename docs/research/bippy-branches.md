# bippy branches: should React Plumber fork it?

Researched 2026-11-05. Source: clone of https://github.com/aidenybai/bippy (main = fbafc407, 2026-10-12), `gh api`, `npm view`. No bippy code was run. Cloned data lives in the session scratchpad (`.../scratchpad/bippy`, `.../scratchpad/branches.txt`).

## Recommendation (one line)

Do not fork. Keep `bippy` as a dependency, and trial the already-published prerelease `bippy@0.7.3-dev.fbafc40` (= main fbafc407) behind Plumb's own locate tests. Pin it exactly if it passes, move to the next stable release when it ships. Send any bippy fix upstream as a small PR against main. Nearly all the branch activity is a different product (a static analyzer, "realize") and gives Plumb nothing.

## 1. What Plumb uses from bippy today

- Declared `"bippy": "^0.7.3"` (package.json:84). Installed: 0.7.3, MIT (node_modules/bippy/package.json).
- Runtime imports are only `getOwnerStack`, `getRawOwnerStack`, `isSourceFile` from `bippy/source` (overlay/src/locate.js:9). Used at locate.js:168 (`getRawOwnerStack`), :178 (`getOwnerStack(fiber, true)`), :447 and :499 (`isSourceFile`).
- Plumb does its own fiber lookup (`__reactFiber$` key, locate.js:101), its own `_debugStack` / `_debugSource` / `_debugOwner` walking (locate.js:42-58, 159-164, 223, 457-514) and its own source-map reader (overlay/src/sourcemap.js, header comment line 1).
- Three bippy dist files are served as-is to the page: `source.js`, `core.js`, `rdt-hook.js` (src/hosts/client.ts:6; vite alias at src/hosts/vite.ts:114). Plumb's own comment says bippy "flattens embedded dependencies" (client.ts:17).
- So Plumb uses roughly 5% of bippy: owner-stack symbolication and file filtering. It does not use `instrument`, `getFiberFromHostInstance`, props/state or hook inspection, or render tracking.

## 2. npm / main versus 0.7.3

- npm `latest` = 0.7.3 (published 2026-08-22, release `bippy@0.7.3`). npm also has a `dev` tag `0.7.3-dev.fbafc40`, published 2026-10-13, which matches main (`npm view bippy dist-tags`).
- main package.json version is still 0.7.3, so main is 0.7.3 plus unreleased commits (`git log bippy@0.7.3..origin/main -- packages/bippy`):
  - 65d7336e (#143, 2026-09-22) "Improve bundler path and source map resolution". New `source/normalize-file-name.ts` (416 lines). It handles Vite `/@fs/`, `/@id/`, webpack `_N_E/`, Turbopack `[project]/` and `__TURBOPACK__` identifiers, Next layers `(rsc)`, `(ssr)`, `(app-pages-browser)`, `rsc://React/...`, Windows paths and virtual module ids. Source-map `./` and `../` sources resolve against the map URL. Source-content lookup tries an exact match first, and returns nothing for an ambiguous alias. PR body: https://github.com/aidenybai/bippy/pull/143. `isSourceFile` now lives in this file (normalize-file-name.ts:409) and is still exported from `source/index.ts:10`.
  - e6929e3e (#137) React 19.3 stable and DevTools 8.0.
  - 0ac832d6 (#111), 0c7e5049 (#108), e2b879b4: runtime and `useFiber` hardening.
  - 8b940faf (#152): tests moved, TypeScript 7. 9f2850ba (#155): e2e bump.
  - Also unreleased: `current-fiber.ts` (new), a core.ts refactor of 506 lines, and rdt-hook.ts changes (`git diff --stat bippy@0.7.3 origin/main -- packages/bippy/src`: 22 files, +1290/-691).
- The 0.7.3 changelog (packages/bippy/CHANGELOG.md) added target-aware instrumentation, stable reverse fiber-id lookup, standalone hook inspection, and RSC/server frame format and debug-location alignment. Plumb already has these in its installed version but does not use them.
- Latest tags: 0.7.3, 0.7.2, 0.7.1, 0.7.0 (all August 2026), 0.6.1 (2026-07-23). Release cadence is fast.

## 3. Branches with activity in the last ~3 months

183 remote branches. About 115 have a commit since 2026-08-05 (from `branches.txt`). By content:

### A. Analyzer / "realize" family (about 100 branches). Not relevant to Plumb.

- Examples: bump-tla-ts (9b4d9cb0, 2026-11-04), render-pass-hits (744c3842), ambient-global-stand-ins (871730bb), discarded-render-hits, realize (2273e6ac), label-function-names, tla-*, tlc-*, viewer-*, claims, cross-component-links, plus about 60 `devin/17889*` / `devin/17890*` "corpus" branches (2026-09/10).
- They are 1060 to 1091 commits ahead of main and 0 behind, but touch no `packages/bippy`. `git diff origin/main...origin/bump-tla-ts -- packages/bippy` is empty.
- What they add is a new private package `packages/realize` (version 0.0.0, `"private": true`, packages/realize/package.json on bump-tla-ts). Its README says it "builds a model of every state a React component can be in by reading its source, checks it as a TLA+ spec with tla-ts, and checks the model against real renders". It uses the TypeScript 7 checker and the React Compiler's source, plus Playwright and Vite. It uses bippy only as a test harness (the verifier loads bippy before React).
- Same family: aiden/parser-static-fiber-b46e (52caaf16, 2026-09-06, PR #116), devin/1788659752-parser-package (ef75c4c9, PR #115), engine262-* (PRs #146, #147, #149), aiden/*-compat*. Open PRs #512, #608, #610, #620, #621, #635 to #640 are all `fix/refactor(analyzer|verifier|conformance|model|interpret)`.
- Finish: active daily, unfinished by its own README ("viewer still reads the old state report and needs porting"). Fit for Plumb: none for DOM to source. It is a static component-state model, not a locator. The only conceivable overlap is Plumb's drift checks, and that would be a separate integration project.

### B. Core library branches (the ones that matter)

Ahead and behind are against main fbafc407. "Unique" means commits not patch-equivalent to anything on main (`git cherry`).

| Branch (tip, date) | Ahead / behind | What it adds | Finish / status |
|---|---|---|---|
| codex/cross-platform-source-maps (fab0519e, 2026-08-12) | 15 / 45; 14 unique | Source-map handling for React Native, Metro, extensions. Skips native debug frames, resolves native components by source-map name (c83a73da, bfc72c65, d2cd9064). Changes symbolication.ts by about 270 lines. | No PR found. Stale: main moved the same files after (#143 touches symbolication.ts). Mostly React Native and browser-extension oriented. Low value for Plumb. |
| codex/interactive-fiber-inspector (dbf94e12, 2026-08-15) | 14 / 36 | A website inspector UI (mobile divider, palette). Only 1 file in `packages/bippy/src`. | Website/demo work. Irrelevant. |
| codex/react-internals-cleanup (8a4f30d6, 2026-08-09) | 1 / 50; 0 unique | Already in main by patch equivalence. | Dead. |
| codex/refactor-bippy-happy-path (5c4845a9, 2026-08-12) | 2 / 44; 1 unique | Restructures core.ts rendered-fiber traversal (+160/-192). Open PR #93. | Open for about 3 months and now behind a core.ts refactor on main. It would conflict. Refactor only, no new capability. |
| feat/bippy-react-devtools (fc9f3ccf, 2026-08-21) | 5 / 26; 4 unique | Hook-inspection grouping, root registration, "harden source tooling against cross-realm, caching, and packaging issues" (cff1fbdc), a DevTools parity fixture. Touches core, rdt-hook, source/* (+564/-220). | No open PR. Partly overtaken by main's hardening commits. The cross-realm and caching fixes are worth reading as input for a later upstream PR. UNVERIFIED whether any is not already on main. |
| fix/react-refresh-and-root-commit-regressions (ed576e65, 2026-08-17) | 5 / 34; 5 unique | Fixes Fast Refresh activation and root commit tracking, legacy experimental work tags, and a synthetic frame for fileName-less component frames (505a8d80). | The 0.7.1 changelog already describes these exact fixes as shipped. The branch looks like the pre-merge original. Treat as released. UNVERIFIED line by line. |
| fix/runtime-resilience, perf/source-hot-paths, perf/benchmark-public-api, fix/use-fiber-capture-risks (Sept 4-6) | 2 to 7 ahead | Hook-inspection and `getSource` lookup speedups, `useFiber` hardening, benchmarks. | Merged to main as #108, #111, #113 (commit list `bippy@0.7.3..main`). Branches are leftovers. |
| devin/1787903202-lightweight-reconciler-nil (5d74d609, 2026-08-28) | 4 / 21 | A lightweight react-reconciler clone and a react-nil clone (+1706 lines). Open PR #107. | Unrelated to locating. |
| agent/resolve-custom-renderer-host-instances (1c8fc219, 2026-07-22) | 3 / 63 | Fallback in `getFiberFromHostInstance` for custom renderers without `findFiberByHostInstance` (a 9-line core.ts diff). | Small, stale. Irrelevant for DOM. |
| bun-stack (23e15172, 2026-10-13) | 11 / 0; open PR #156 | Moves the toolchain from pnpm and vite-plus to bun and tsdown. | Active. Matters only as a risk (below). |
| move-tests, refactor/simplicity-cleanup(-round-2), fold-writing-guidelines, pr-writing, dependabot/*, codex/website-redirect, codex/repo-cleanup | small | Housekeeping. | No value. |
| Older (cursor/* Apr 2026; PRs #46 to #59: time travel, state history, storybook prototype; feat/rewind, feat/diagram, garden, extension, inspect-port, hydration-hack) | stale | Experiments and demos. | Not product-grade. |

Note: no open bippy PR or branch targets Next.js/RSC source locations or React 19 `_debugStack` beyond what is already on main. I found none by title or by file diff (grep of `packages/bippy/src/source` on main shows RSC handling only in normalize-file-name.ts, owner-stack.ts:368 and :403-409, constants.ts:12 and :21).

## 4. Fit for React Plumber, feature by feature

1. Better source locations (the real prize): main's `normalize-file-name.ts` (65d7336e). It would improve `isSourceFile` and the frame normalisation feeding locate.js:168-178, 447 and 499. Plumb currently has its own workarounds for Turbopack chunk frames (locate.js:490) and webpack-eval or memo/forwardRef frames (locate.js:512). It could also remove some of Plumb's own path cleanup. What could break: `isSourceFile` is stricter or different on main (it moved files). Plumb's existing tests for Turbopack, webpack eval and Windows paths must be re-run. UNVERIFIED because I did not run Plumb against it.
2. Next.js / RSC: main normalises `rsc://React/Server/...`, `(rsc)/(ssr)/(app-pages-browser)` layers and "client reference proxy" suffixes. Plumb's locate.js has no explicit RSC handling that I found. This could help server-component frames. A DOM node is rendered by a fiber that owns client output, but server-component owners appear in `_debugStack` as `rsc://` frames. UNVERIFIED on a real Next 15 or 16 app.
3. React 19.3: e6929e3e adds the new work tags. Plumb reads `_debugStack` directly, so it is mostly unaffected unless bippy's `getOwnerStack` walks the wrong fiber kinds on 19.3.
4. DOM to fiber / fiber to DOM, props/state, render tracking, `instrument`: Plumb does not use them (locate.js:101 is hand-rolled). The branches add nothing here that Plumb needs. The one relevant branch (agent/resolve-custom-renderer-host-instances) is for non-DOM renderers.
5. HMR resilience: the 0.7.1/0.7.2 changelog covers Fast Refresh e2e (Vite/Next). Plumb does not use `instrument`, so these fixes do not reach it. Plumb's HMR handling lives in sourcemap.js.
6. Performance: perf/source-hot-paths and main (#113: hook-inspection and `getSource` speedups, binary search of source maps already in 0.6.x). Plumb bypasses bippy's source-map reader, so little gain.
7. Analyzer/realize: separate product. See section 3A.

Net: the only thing worth having is on main, not on a branch. No branch contains an unmerged capability that Plumb needs.

## 5. Licence

bippy is MIT, Copyright 2024-present Aiden Bai (LICENSE at repo root, `gh api repos/aidenybai/bippy` spdx = MIT, packages/bippy/package.json:18). Forking is allowed. Plumb already ships bippy's code (client.ts:5-17 and THIRD_PARTY_NOTICES). A fork would need the notice kept; the tsdown build adds a `@license bippy` banner (bun-stack tsdown.config.ts). The `realize` package's licence was not checked and is private anyway (UNVERIFIED).

## 6. Fork vs pin vs wait vs upstream

- Fork: costs a build toolchain (pnpm/vite-plus today, moving to bun/tsdown in #156), React-version conformance tests that Plumb does not have, and tracking a repo that gets about 10 merges a day on unrelated analyzer work. Gain: nothing, since the wanted code is on main. Reject.
- Pin a git commit: bippy is a pnpm monorepo with a build step (`prepack`, generated react-internals), so a `github:` dependency does not install a usable package. Reject. The npm dev tag gives a pinned, built artifact instead.
- Wait for a release: main has 11 commits in `packages/bippy` after the 0.7.3 tag (tag commit 8ba07054, 2026-08-21; first later commit a6ed02c1, 2026-08-22; last 9f2850ba, 2026-10-12), and nothing has been released in the 3+ weeks since. Release timing is unknown. Waiting is free but uncertain.
- Recommended: use `bippy@0.7.3-dev.fbafc40` in a branch; run Plumb's locate suite (Turbopack, webpack eval, Vite, Windows, forwardRef/memo); pin that exact version if green (not a caret range, dev tags are unstable), and switch to the next stable when released. Upstream any Plumb-found bug as a PR against main. Before any bump, check that the dist files `source.js`, `core.js`, `rdt-hook.js` still exist, since client.ts:6 hard-codes them. bun-stack's tsdown config (entries: index, source, install-hook-only) has no `core` or `rdt-hook` entry, and `hash: false` suggests names stay stable, but if #156 merges the vendor map may break. UNVERIFIED: I did not build bun-stack.

## 7. Unverified list

- Whether main's `isSourceFile` / `getOwnerStack` behave better or worse than 0.7.3 on Plumb's actual fixtures (not run).
- Real Next.js RSC behaviour of main's normaliser (read the code, did not run it).
- Whether feat/bippy-react-devtools holds fixes not already on main.
- Whether the dev tag 0.7.3-dev.fbafc40 dist layout matches 0.7.3 (not downloaded).
- Licence of packages/realize (private).
