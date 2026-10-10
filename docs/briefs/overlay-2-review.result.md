# Overlay layer 2 review

Reviewed working-tree diff, untracked host adapters/client/tests, and layer-1 edit/session code required by this brief. Findings ranked by severity. No source changes or commit. Builds, fixtures, scripts and installed Next ran under `/private/tmp`; only this result file changed in the repository.

## Findings

### 1. P1 — Windows containment guard accepts traversal (PLAUSIBLE end-to-end)

**Location:** `src/session/index.ts:230–239` (inherited layer 1).

**Scenario:** On Windows, root `C:\project\app` plus request file `..\shared\Other.tsx` produces relative path `..\shared\Other.tsx`. Checking `inside.startsWith('../')` misses it; `isAbsolute(inside)` is false. The later realpath comparison also accepts the outside path because `resolve(root, '../shared/Other.tsx')` resolves there. With configured source glob `../shared/**/*.tsx`, the worker can offer legitimate edit IDs for that outside file, satisfying its tracked-source check.

**Evidence:** Quick script using `node:path.win32` returned `windowsGuardRejects: false` and `windowsEditablePathComparison: true`. Real Session with sibling-source glob offered two outside-file edits; POSIX public API correctly refused that same target. Full Windows filesystem apply was not run, so outside-file write remains **PLAUSIBLE**, not demonstrated.

**Smallest fix:** Reject `inside === '..'` and `inside.startsWith('..' + sep)` using native path semantics, alongside absolute/empty checks. Repeat containment enforcement in `editableFile` before trusting realpath identity. Add one Windows integration scenario with a configured sibling source.

### 2. P1 — Printed Next wiring cannot compile under ordinary webpack configuration (VERIFIED)

**Location:** `src/hosts/next.ts:4`, `src/hosts/client.ts:5`, `src/adoption/install.ts:96–107`; worker asset dependency originates at `src/session/index.ts:62`.

**Scenario:** Follow printed App Router/layout instructions in Next 16.4.0, without extra bundler configuration. `next dev --webpack` returns HTTP 500. A fresh `next build --webpack` fails on native `resolver.darwin-arm64.node` reached through the worker dependency, and on missing `../../overlay/dist/client.js`. Runtime ENOENT fallback cannot intercept webpack's static resolution of `new URL(...)`.

**Evidence:** Tested compiled package copied into actual `node_modules/@unlocalhosted/plumb`, not only a linked source checkout. Fresh default build reported both errors. Adding `serverExternalPackages: ['@unlocalhosted/plumb']` let real dev HTML, `/__plumb/client.js`, authenticated health, edits/apply and production compilation succeed. Direct Request tests never exercise this compilation path. [Next documents externalization for packages using Node-specific features](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages).

**Smallest fix:** Include required package externalization in printed Next setup and README; verify that exact setup with a real Next integration test. Keep optional client-file discovery inside external Node code, or use a resource loader whose optional path is not a statically resolved bundler asset. Production removal is a separate requirement below.

### 3. P1 — Installing overlay route breaks static-export builds (VERIFIED)

**Location:** `src/adoption/install.ts:97–101`, `src/hosts/next.ts:17–19`.

**Scenario:** Add printed catch-all route to an app with `output: 'export'`. Even after externalizing Plumb, Next rejects `/__plumb/[...path]` during page-data collection: `export const dynamic = "force-static"/export const revalidate not configured ... with "output: export"`. Returning 404 inside the production handler happens after Next has validated route eligibility.

**Evidence:** Real Next 16.4.0 `next build --webpack` with `output: 'export'` failed with that error. [Static export only supports compatible static route handlers](https://nextjs.org/docs/app/guides/static-exports).

**Smallest fix:** Provide development-only route discovery/wiring so this route is absent during production/export builds. Do not present an always-present catch-all route as universally compatible. Merely adding `force-static` is insufficient to meet the separate zero-Plumb-artifacts requirement.

### 4. P2 — Production guards disable behavior, but retain Plumb code in deployment (VERIFIED)

**Location:** `src/hosts/next.ts:4–6,19,31`, `src/adoption/install.ts:99–106`.

**Scenario:** Normal production build with working externalization still includes Plumb imports from layout and route. `NODE_ENV` guards prevent rendering and Session creation, but cannot remove an external package imported unconditionally.

**Evidence:** Successful isolated Next production build had Plumb references in server page, not-found page and overlay route. `.next-production-review/server/app/__plumb/[...path]/route.js.nft.json` traced **62 Plumb files**, including `dist/session/index.js` and `dist/session/worker.js`. Prerendered home HTML contained no `data-plumb-token`; existing production tests correctly return 404/null without initializing singleton state. Those behavioral passes do not establish zero code shipped.

**Smallest fix:** Split dev implementation from production-safe wiring and exclude overlay route/imports from production build discovery. Check both server bundles and deployment traces. Moving Session to a dynamic import alone does not guarantee bundlers/tracers omit its chunk.

### 5. P2 — Apply remains proportional to whole project inside warm worker (VERIFIED by code)

**Location:** `src/session/state.ts:58–59`, `src/session/collection.ts:43–79`, `src/session/worker.ts:108–112,115–121,73–98` (inherited layer 1).

**Scenario:** Apply two edits to one file in a project with thousands of source files. Filesystem scan is targeted and parser reuse works, but refresh calls `prepare()` with every collection slice. Collection walks all files and merges all cached sites. Refresh also rebuilds/returns every file's query dependencies. Subsequent dirty report/classification and edit indexing rebuild project-wide views. Thus apply has O(project) CPU/allocation work despite keeping the worker alive.

**Evidence:** Direct call chain: `Session.apply` targeted scan sends `refresh`; worker `update` calls `state.prepare`; collection iterates all slices/sites; `queryInputs` enumerates the complete slice map; `report()` and `index()` replace global views after changes. No timing or scaling benchmark claimed. Existing tests prove no inventory/restart, not bounded worker-side work.

**Smallest fix:** Refresh changed slices plus affected import consumers; retain aggregate contributions and edit indexes by file. Return dependency deltas instead of the entire query map on each refresh. Update local edit/remaining views without forcing full-report materialization; retain full materialization for explicit report requests.

### 6. P2 — Read routes perform avoidable full filesystem inventory (VERIFIED)

**Location:** `src/session/index.ts:142–146` (inherited layer 1).

**Scenario:** Repeated `/__plumb/decisions` requests call `read('decisions')`, which passes no query to `scan`; every request globs and stats complete inventory before using warm worker. Default timer independently performs same full inventory every 250 ms. Timer is unconditional even when `native` is true, as code inspection shows.

**Evidence:** Real Session instrumentation recorded two idle inventories in 650 ms and one additional inventory for one `decisions()` call. Native recursive watcher was unavailable in this sandbox (`native: false`); successful-native-watcher behavior was established by reading unconditional timer, not by a live native-event test.

**Smallest fix:** With healthy native watching, reconcile queued event paths and shared inputs; reserve whole inventory for startup, watcher recovery and polling fallback. Decisions read should inspect its bounded dependency set or consume known invalidations, rather than inventory every source file.

### 7. P2 — Vite restart discards process's warm Session (VERIFIED)

**Location:** `src/hosts/vite.ts:8,13–15,22`.

**Scenario:** `await server.restart()` in same dev process closes old Session and creates another. This loses revision and analysis caches; state is held in plugin closure rather than process registry. Does not satisfy review's explicit reuse-across-Vite-restarts check, although closing Session on server close follows original host brief.

**Evidence:** Real Vite 8.3.4 restart probe counted one new `Session.create` and confirmed previous Session closed, for both `/` and `/app/` bases. No leaked old worker demonstrated. Middleware-mode `server.close()` also correctly closed Session.

**Smallest fix:** Add process-owned Session registry keyed by root/config with explicit restart handoff and final shutdown disposal. Reuse Session for unchanged options; rebuild only when options/inputs require it. Keep server middleware ownership separate from Session lifetime.

## Checks that passed, and limits

- Temporary-copy `npm run build && node --test e2e/hosts.test.mjs e2e/edits.test.mjs`: **27 passed, 0 failed**. Full repository suite was not run.
- Exact source slices and stable IDs; emoji/UTF-16 offsets, CRLF, `className={"..."}`, `cn(...)`, mixed template literals, inline styles and tracked CSS. Existing integrations cover escaped literals, stale hashes, unknown IDs, overlapping choices/duplicate IDs, concurrent applies, theme/config/`.plumb` protection, hard links, symlinks and atomic saves.
- Two edits applied with **one write, one incremental refresh**, matching apply/health revisions after several polling ticks. Warm worker retained. Native filesystem-event race was not exercised; serialization and hash checks were inspected.
- Token-less transport refused hostile Host, foreign/missing POST Origin, cross-site/same-site Fetch Metadata and cross-origin preflight. Node and Web adapters share `createRoute` and `dispatch`; no duplicated dispatch seam needed.
- Generic overlay CORS remained exact-origin: foreign/null origins refused, unsupported preflight headers/methods refused, no wildcard or credential permission emitted. Public client contained no token. Installation did not modify consumer files.
- Real Vite dev served client/health with custom `/app/` base; middleware-mode cleanup passed; Vite build assets omitted overlay reference. Root-relative script currently works because Plumb middleware runs before Vite base rewriting.
- After Next externalization workaround, `%5F_plumb` really mapped to `/__plumb/` on Next 16.4.0; real route recompile retained rendered token and post-apply revision. [Current folder convention](https://nextjs.org/docs/app/getting-started/project-structure#private-folders) and installed normalizer both support encoded underscore.
- Workaround-enabled Next HTML and RSC responses used `Cache-Control: no-store`; foreign-Origin RSC response carried no CORS read permission. Token was present in RSC payload, as expected for rendered attribute, and absent from public client and prerendered production HTML. No cross-origin readable token leak demonstrated under default host headers. Hosts that add permissive page/RSC CORS headers need an explicit token-delivery policy; component itself controls neither those headers nor their caching.
- Windows installation output contains fixed App Router paths and browser URLs, with no filesystem root interpolated into JavaScript. Actual Windows installation/hosting was not run; containment issue above remains separate.

## Extendability and missing seams

`StructuredEdit` is already transport-independent: opaque ID, exact source range, replacement, rule/family metadata; server rederives edits instead of trusting client replacement text. New families/syntax should keep existing transports.

Missing explicit extension seams: **decision replacement policy** (`useFor`, currently hard-coded family switches), **authored-syntax encoder** (`replacement`/`structuredEdits`, currently origin branches and colon/string parsing), and **dev Session ownership** (host/process lifecycle and build-phase exclusion). Separate semantic choice from authored encoding so CSS values, JSX properties and `@apply` retain their own spelling/escaping rules. No need to generalize HTTP dispatch.

**Verdict: ship after fixes.** Core edit/auth transports have strong bounded evidence; Next delivery/build wiring and containment must be corrected, and explicit performance/lifecycle requirements remain unmet.
