# Frozen four-app verification

Passed all four apps in one uninterrupted run: `plumb-verify-nuAaBC`.

Run: 2026-10-12T14:23:50.594Z to 2026-10-12T14:45:59.371Z. Browser: `/Users/vijaysingh/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`.

## Single-run results

| App | Result | Page ms | Ready ms | Sample | Detached | Oracle library | Match | Plumb only | Grab only | Disagree | JSX exact | Locate p95 ms | Health max ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| metalui | passed | 777 | 13598 | 450 | 3 | 74 | 371 | 0 | 0 | 0 | 20/20 | 79.6 | 8.3 |
| kamui | passed | 609 | 5601 | 118 | 0 | 88 | 29 | 0 | 0 | 0 | 20/20 | 732.8 | 1.62 |
| craftingattention | passed | 713 | 11955 | 150 | 45 | 83 | 21 | 0 | 0 | 0 | 20/20 | 197.79 | 2.19 |
| algorecall | passed | 1990 | 34743 | 150 | 25 | 1 | 122 | 0 | 0 | 0 | 20/20 | 268 | 2.3 |

## Snapshots

| App | Original repository | HEAD | Copied files | Method | Snapshot ms | Unchanged / removed |
| --- | --- | --- | ---: | --- | ---: | --- |
| metalui | `/Users/vijaysingh/unlocalhosted/plumb/fixtures/.verify-frozen/proof-X10jQg/bootstrap/source` | `16b7e566d9662e39689aac35225764f5b5f8b6bb` | 4066 | clone (cp -c) | 4390.91 | true / true |
| kamui | `/Users/vijaysingh/unlocalhosted/kamui` | `a72f589bfa7c449cf7a9287664bb389becbee50b` | 7399 | clone (cp -c) | 7300.1 | true / true |
| craftingattention | `/Users/vijaysingh/unlocalhosted/craftingattention` | `41405ee60d39a3ac71d5ea3007c9064a72218b98` | 2595 | clone (cp -c) | 2359.24 | true / true |
| algorecall | `/Users/vijaysingh/unlocalhosted/algorecall` | `0c99512ffd202a5380bd5835087bfd90417884d2` | 4714 | clone (cp -c) | 4464.17 | true / true |

File manifests, deleted tracked inputs, ignored inputs, linked repositories, clone/copy counters, and before/after integrity digests are recorded in each app JSON. Installed dependencies remain read-only links or facades; copied source, explicit runtime inputs, and frozen configuration are hashed. Only node_modules and generated .wrangler/.tanstack state are excluded from source integrity.

## Mutation proof

`bench/apps/prove-frozen.mjs` populated a disposable MetalUI working-tree clone from `/Users/vijaysingh/unlocalhosted/metalui`, then invoked `bench/apps/verify.mjs` with no app filter. After the MetalUI snapshot was sealed, it appended comments to tracked `apps/docs/src/pages/Landing.tsx` 992 times and moved the scratch HEAD from `16b7e566d9662e39689aac35225764f5b5f8b6bb` to existing parent `f4874ad006339937afdb20396763731eb304ce13`. No new commits were created. The verifier retained an identical copy, passed, and recorded original movement as information. The scratch original and every verification copy were removed.

[Mutation evidence](../verification/verify-frozen.proof.json). [Combined evidence](../verification/overlay-e2e.md).

## Runtime and ignored inputs

- MetalUI: packages/metalui/dist, required by the package export map when Kamui imports its linked package. Docs source aliases and tracked public assets are otherwise served as authored.
- Kamui: web/packages/medium-core/pkg, selected by mediumCore() in vite.config.ts; web/vendor/metalui, imported by src/medium/mood.ts; web/vendor/metalui-source.css, imported by src/styles/index.css. The vendor link points to a separate frozen MetalUI repository. The CSS bridge’s absolute @source is rebased to that copy. The ignored routeTree.gen.ts is regenerated into scratch and resolved there, including extensionless imports.
- CraftingAttention and AlgoRecall: no additional ignored runtime inputs required.
- Every relevant root/workspace node_modules is linked. Facades keep workspace links and Vite config/dependency caches in the copy; ordinary packages use the installed store. Vite resolution is verified from the copy, including pnpm’s relative links. Ignored capture/build trees and nested worktrees are pruned from dependency discovery.
- Benchmark configs and their imports are copied. MetalUI’s families.ts and plumb.config.ts read frozen token/CSS inputs, rather than the live repository. Plumb’s built runtime, overlay, oracle, and config helpers are frozen once for all four apps.
- Plumb runs before React transforms. CraftingAttention’s Vitest-only test field is removed from the dev-host configuration so the Plumb plugin applies. Native Cloudflare state lives physically in the disposable copy. A preload guard rejects writes outside each app scratch directory, including paths resolving through dependency symlinks.
- Read-only validation honors only 503 busy recovery, records every attempt, and requires healthy responses below 100 ms. Identical validation queries are reused against immutable source; both sampling passes, fresh readings, source-map invalidation, and each 300-read burst remain fully exercised. Independent warmed Node probes measure endpoint response time without page-animation or load-generator event-loop delay. The 100 ms limit is unchanged.

## npm test

The live Plumb checkout acquired unrelated concurrent spacing work during this task. To preserve it, tests ran in a disposable checkout of committed `6b73b19c30cb3766796345ed51fbe0dc5b208429` plus this task’s changes, entirely under Plumb. Installed dependencies were APFS-cloned locally for Turbopack/React 18, and the source checkout retained two commits for the HEAD-movement integration test. The same tested build supplied the four-app runtime snapshot.

| Stage | Tests | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: | ---: |
| Main integration/E2E | 345 | 344 | 0 | 1 |
| Polling serve | 26 | 25 | 0 | 1 |
| No-watch serve | 26 | 23 | 0 | 3 |

Temp files, npm cache, browser profiles, and compile caches stayed in Plumb. bench/apps/test-local.mjs isolates adoption’s Git discovery and the deliberately Tailwind-free fixture without external temp writes. Existing owner-stack browser fixtures explicitly disable stamps, preserving their fallback coverage while stamp.test.mjs covers stamped hosts.

[Passing npm test log](../verification/verify-frozen.npm-test.isolated.log). [Concurrent live-checkout failure log](../verification/verify-frozen.npm-test.log).

## Scope incident

An early aborted loader attempt imported the verifier before installing its filesystem guard. Vite briefly wrote its config temporary through MetalUI’s ignored apps/docs/node_modules/.vite-temp, changing that directory’s timestamp. This was corrected by an independent preload and physical cache facades. No original app source or .git metadata was edited. No commits, pushes, worktrees, or global installs were performed by this job. docs/briefs/live-editor-lld.result.md was left untouched.

Earlier failed-run evidence is retained under docs/verification/verify-frozen.previous; the table above uses only the final passing run.
