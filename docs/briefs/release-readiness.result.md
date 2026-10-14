# Release-readiness audit — @unlocalhosted/plumb

## Executive summary

**Not ready for a first public release: 3 blockers, 9 majors, 10 minors (22 distinct findings).**

The blockers are **T1: red release CI**, **W1: an unresolved release tree**, and **C1: no publicly installable npm release or demonstrated release procedure**. These are release gates, not three proven engine defects. In particular, all 37 failures in this audit's local suite occur when launching Chromium, before browser assertions; the environment prevents that verification.

The packed CLI and overlay have useful positive evidence: a real tarball installs into a new Vite/React/Tailwind v4 project; first run, init, baseline check, automatic overlay wiring and repeat installation work. The installed overlay loads in the connected Chrome browser, reads the exact stamped JSX, and draws blueprint marks. All four public entrypoints import on Node 22.18.0; all 18 served overlay modules return HTTP 200. Site production build passes. See receipts R1–R3 and R6.

Audit date: 2026-10-14. Checkout: homepage-react-plumber at f39504513e5b9a427c2ec984b9c82e0bfc504297, with pre-existing changes. Local runtime: Node v25.9.0, npm 11.12.1, macOS arm64. Minimum-runtime probe: Node v22.18.0. The branch is exactly 29 commits ahead and zero behind local main; remote main was checked and matches local main. Evidence: R7.

Research only. No source/config edits, commits, pushes, merges or root Git-state changes. Builds generated ignored output; scratch installations and audit logs live under /tmp/plumb-release-audit and /tmp/plumb-release-*. The only requested repository artifact is this report. Initial and post-check git status were identical before writing it. Evidence: R7 and the complete status below.

Effort: **S** = a focused change/check, **M** = a feature or release slice with integration verification, **L** = substantial implementation or cross-platform work. Findings are ordered by severity within each area; final work order prioritizes dependencies.

## 1. Package

Metadata is coherent: name @unlocalhosted/plumb, version 0.1.0, MIT, ESM, plumb binary, four exports with declaration files, Node >=22.18, optional React ^18.2.0 or ^19.0.0 and Vite ^6/^7/^8 peers, GitHub repository/homepage/issues, nine keywords and public publish access. Evidence: package.json:2–26, package.json:40–47, package.json:77–110. Next has no declared peer/version range; actual Next coverage is specified in area 6 rather than assuming every App Router release works.

The pack allowlist includes dist, raw overlay JS/CSS, optional overlay/dist, schemas, action.yml, LICENSE, README and the agent skill (package.json:28–38). Current dry-run has 207 entries, 319,223 packed bytes and 1,205,308 unpacked bytes. All 24 expected bin/export/raw-overlay paths exist, including choices.js and all four blueprint*.js files. No fixtures, benchmarks, site source, developer settings, caches, tarballs or credential files matched the inspected pack inventory. Bippy is installed as a dependency, then served from that dependency; it need not be copied into the Plumb tarball (package.json:69; src/hosts/client.ts:5–18). Evidence: R1.

| Item | Severity | Evidence | Suggested fix | Effort |
| --- | --- | --- | --- | --- |
| P1. Local pack contains obsolete compiled host files; packing does not ensure a fresh build | minor | R1: dist/hosts/next-loader.cjs and dist/hosts/source-attributes.js, with their declarations, have no corresponding current source. Build is only tsc; there is no prepack hook (package.json:43–47). | Build/package from a fresh release checkout, check output against current sources, and gate the exact artifact. Avoid publishing stale local dist. | S |
| P2. Packed README links to omitted repository docs | minor | README.md:103 and README.md:206 link to docs/roadmap/1-adoption.md and docs/layers/9-surfaces.md. Both exist in checkout but neither is in the pack (R1). | Use full repository documentation URLs or include the intended files. Verify npm-rendered links after publication; this audit confirms artifact absence, not npm's link-rewriting behavior. | S |

### Packed-consumer result: exactly what worked

A new app in /tmp/plumb-release-audit/app installed the actual unlocalhosted-plumb-0.1.0.tgz through npm, plus React/React DOM 19.3.0, Vite 8.3.4, plugin-react 6.1.2, Tailwind and its Vite plugin 4.3.3. It had two intentional arbitrary values, padding 13px and radius 7px, with nearby theme tokens. No repository symlink supplied Plumb. Evidence: R1–R2.

| Operation | Observed result |
| --- | --- |
| npm install tarball | Exit 0; 53 packages added. |
| npx --no-install plumb | Exit 0; two off-scale findings and the init next step. |
| npx --no-install plumb init | Exit 0; config, six debt locations and four accepted inferred tokens. |
| npx --no-install plumb check | Exit 0; zero new, six debt, zero exception sites. |
| install --overlay --write | Exit 0; inserted Plumb import and first plugin before react(). |
| Repeat overlay installer | Exit 0; “Overlay already set up; no files changed.” |
| Vite dev server | Started in 756 ms at 127.0.0.1:4339; installed package supplied middleware/client. |
| Connected Chrome client | Plumb toolbar appears; Select opens “Plumb reading for button in App”; source src/App.jsx:1:38, known debt, 13px/7px, and p-sm/p-md choices. |
| Blueprint toggle | Two recorded drift marks appear, for p-[13px] and rounded-[7px]. |
| HTTP overlay resources | All 18 allowlisted modules return 200, including bippy, source-map worker, choices, blueprint and CSS. |
| Node 22.18.0 imports | Root, /vite, /next and /next/config all import successfully. |
| Node 22.18.0 CLI check | Exit 0; parses generated TypeScript config and reports no new findings. |
| install --ci | Writes workflow and agent instructions; warns that Action revision is main. See C2. |

The app source was not edited through Write during the manual browser probe. This proves loading, source reading and blueprint module availability, not a complete packed preview/write/reload flow or browser behavior on Node 22. The repository setup E2E attempts that complete flow but failed at Chromium launch here (R4). Initial Alt-click also triggered the user's existing LocatorJS extension; reloading and using Plumb's Select control avoided that interference. Vite emitted pre-transform warnings about /__plumb modules despite successful middleware responses and client rendering; these warnings are not evidence of a missing packed asset (R3).

## 2. Tests

Command run exactly as requested:

~~~sh
PLUMB_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
~~~

Its initial build passed. The serial all-file stage finished with **377 tests: 338 pass, 37 fail, 2 skip, 0 cancelled**, in 319,314 ms; npm test exited 1. The chained polling and no-watch stages therefore did not run as part of npm test. They were subsequently run separately with the same environment settings: polling **25 pass / 0 fail / 1 skip**, watch off **23 pass / 0 fail / 3 skip**. Combined executed invocations: **429 tests, 386 pass, 37 fail, 6 skip**; this repeats serve tests across modes and is not 429 unique scenarios. Evidence: package.json:46; R4.

| Item | Severity | Evidence | Suggested fix | Effort |
| --- | --- | --- | --- | --- |
| T1. Main CI is red and does not exercise the browser release gate reliably | blocker | R5: latest main run has 333 pass / 3 fail / 24 skip on Node 24; Node 22 job cancelled. Missing Chromium fails stamp and skips other browser tests; ANSI-colored Vite URL defeats setup readiness regex; shallow checkout defeats HEAD^ in frozen test. .github/workflows/ci.yml:13–20 has neither browser installation nor fetch-depth override. | Install Chromium with required Linux dependencies, provide required history, and make readiness parsing ANSI-safe. Require the packed walkthrough and browser slices to run, then get green Node 22/24 CI on the actual release SHA. | M |
| T2. This local environment cannot certify browser and native-watch behavior | major | Every one of 37 local failures is browserType.launch with SIGABRT; 31 also log kill EPERM. Native watcher probe skips for EMFILE; second skip is the polling-only scenario in native mode. R4 and full failure inventory below. | Run the existing browser suite in a working browser-test environment and verify native watch separately. Do not waive failures or claim engine regressions from launch failures. | M |

**Every local failure and cause** is listed in the appendix. No local assertion failure in application behavior was observed among these 37 failures. That does not establish that their assertions would pass.

**Flakiness:** no test was proven flaky by this single full run. CI's colored URL and shallow-history failures have concrete harness causes, not evidence of random product flakiness. Native watch availability and timing budgets are environment-sensitive; the historical performance result also records timing variability (docs/briefs/perf-large.result.md:7–18). Prior “passed” claims in release-setup.result.md:9–17 are historical evidence, not a current green browser run.

## 3. Working tree and merging

Initial status had **11 modified tracked files and 29 untracked status entries**. The full inventory follows. Tracked diffs are 116 additions and 25 deletions in 11 files (R7).

| Item | Severity | Evidence | Suggested fix | Effort |
| --- | --- | --- | --- | --- |
| W1. There is no single reviewed, committed release tree corresponding to the audited artifact | blocker | R7/status: dead-spacing changes span src/index.ts, rules/dead.ts, rules/provenance.ts, session/judgement.ts and session/state.ts, plus untracked e2e/dead-spacing-ladder.test.mjs. Separate benchmark write-verification and site opening work are also uncommitted. | Decide each slice: land source plus its integration proof together, or exclude it from the release. Freeze and package a clean, identified commit. This audit must not make that decision or commit it. | M |
| W2. Scratch evidence and local tooling are mixed with candidate release work | minor | Status contains .claude/, .impeccable/question files, bench/reading caches/logs/before-dist/wip, and fixtures/.setup-Vw7OYU/. These are absent from npm pack (R1/R7). | Keep useful reports deliberately; exclude generated runs and personal tooling from the release commit. Review rather than delete unknown WIP. | S |

The numeric-spacing slice changes dead-token reachability to include numerically compiled ladder uses, passing the resulting names through both CLI and Session judgement (src/rules/provenance.ts:245–256; src/rules/dead.ts:12–31; src/index.ts:158; src/session/judgement.ts). Its integration scenario passed in this run (“numeric utilities and compiled spacing expressions keep only used configured ladder steps alive”; R4). It looks like coherent pending work, not debris to discard blindly.

Benchmark edits add frozen source-write verification; bench/apps/write.mjs and e2e/verify-writes.test.mjs are untracked while their supporting frozen/verifier edits are tracked modifications. The browser write test failed at launch, so that slice lacks fresh full proof here (R4/status). Site edits add the #opening route and dependencies/styles plus an untracked opening/ implementation (site/src/entry.jsx:7–12; status); they must land together or be excluded. Documentation briefs and docs/verification/ are evidence candidates requiring deliberate review.

**Merge mechanics:** git rev-list --left-right --count main...HEAD returned 0 29; git merge-base main HEAD equals main at 4d7c0d0372347e7e163f64008f106aa57a8ee988. gh api checked remote main at the same SHA. Thus the committed branch can currently fast-forward main without textual merge conflicts. This says nothing about uncommitted slices or future movement of main. gh run list for homepage-react-plumber returned []; current workflow runs on main pushes or PRs (.github/workflows/ci.yml:2–5). A PR/release candidate must earn green checks, including site/pack coverage, before merging. No merge, fetch, or merge-state mutation was performed.

### Complete initial git status

~~~text
 M bench/apps/frozen.mjs
 M bench/apps/verify.mjs
 M site/package-lock.json
 M site/package.json
 M site/src/entry.jsx
 M site/src/styles.css
 M src/index.ts
 M src/rules/dead.ts
 M src/rules/provenance.ts
 M src/session/judgement.ts
 M src/session/state.ts
?? .claude/
?? .impeccable/questions/2cc927b5.log
?? .impeccable/questions/2cc927b5.state.json
?? bench/apps/write.mjs
?? bench/reading/.cache/
?? bench/reading/after-cache.bodies.json
?? bench/reading/after-cache.log
?? bench/reading/after.bodies.json
?? bench/reading/before-cache.bodies.json
?? bench/reading/before-cache.log
?? bench/reading/before-dist/
?? bench/reading/before.sample.txt
?? bench/reading/cache-checks.log
?? bench/reading/checks.log
?? bench/reading/final-cache-checks.log
?? bench/reading/final-checks.log
?? bench/reading/metalui-check.log
?? bench/reading/numeric-edits-check.log
?? bench/reading/part1-checks.log
?? bench/reading/recheck.log
?? bench/reading/wip/
?? docs/briefs/dead-spacing-numeric.md
?? docs/briefs/release-readiness.md
?? docs/briefs/verify-writes.result.md
?? docs/verification/
?? e2e/dead-spacing-ladder.test.mjs
?? e2e/verify-writes.test.mjs
?? fixtures/.setup-Vw7OYU/
?? site/src/opening/
~~~

## 4. CI and release automation

Only .github/workflows/ci.yml exists. It runs npm ci, typecheck and npm test on Ubuntu with Node 22/24; it does not build the site or explicitly audit a tarball. Evidence: workflow:8–20 and R5.

The composite Action installs its own checkout using npm ci --ignore-scripts and builds it, then runs scripts/action/run.mjs (action.yml:27–38). Its dependencies are lockfile-resolved when the Action revision is pinned; it does not fetch “latest Plumb” from npm. The README correctly recommends a reviewed Action SHA and full consumer history (README.md:190–206). Local fixture Action execution and approval tests passed (R4); that is not a hosted consumer PR proof, as README.md:206 explicitly acknowledges.

| Item | Severity | Evidence | Suggested fix | Effort |
| --- | --- | --- | --- | --- |
| C1. Public npm delivery and a versioned release procedure remain undone | blocker | R5: unauthenticated npm view @unlocalhosted/plumb version returns E404. Only ci.yml exists; git tag --list is empty; no changelog/versioning/release configuration was found in tracked inventory. package.json:3 stays 0.1.0, with prepublishOnly but no publish/provenance workflow (package.json:43–47). | Document or automate a reviewed release: clean SHA, version/changelog, tests, exact pack audit, npm public publication with provenance, immutable tag/release and post-publish consumer install. Prove scope publication access. E404 alone does not prove whether a private package or authorization problem exists. | M |
| C2. The actual packed install generates a mutable Action pin | major | Packed install --ci says “Action revision: main” and writes unlocalhosted/plumb@main (R2). src/adoption/install.ts:70–83 uses checkout HEAD or metadata.gitHead, then falls back to main; this tarball has no gitHead. Action's setup-node also uses mutable @v4 (action.yml:27). | Tie published metadata to a trusted released commit and verify install --ci from that published artifact emits its exact SHA. Require an explicit reviewed SHA when metadata is absent. Consider pinning nested third-party Actions by SHA too. | S |

The npm tarball contains action.yml but omits scripts/action/run.mjs and package-lock.json (R1; action.yml:31–38). Therefore it is **not a standalone GitHub Action distribution**. The supported Action lane is the GitHub repository checkout, as README.md:195 demonstrates; do not instruct users to execute the tarball's action.yml directly.

docs/briefs/release-setup.md:5–28 requested automatic overlay wiring plus a packed walkthrough, and release-setup.result.md:3–17 reports their implementation. Both now exist. They establish setup scope, not a publish workflow, version tagging, registry proof or current green CI.

## 5. Docs and message truth

CLI --help from the packed artifact matches src/cli.ts:29–63, including overlay --write and exit code descriptions. The root README's first-run/init/check path matched the scratch commands (R2), while the generated web CLI flag tables do not match validation.

| Item | Severity | Evidence | Suggested fix | Effort |
| --- | --- | --- | --- | --- |
| D3. Generated CLI reference advertises flags the CLI rejects | major | site/src/docs/recordings/reference/cli.json:1 lists --family on all 19 non-decisions commands and --json on doctor/install. Renderer prints those tables (site/src/docs/reference.jsx:133–136). Generator treats flags missing from restriction map as universal (scripts/docs/gen-reference.mjs:187–197, 359–364), missing special guards in src/cli.ts:100 and 124. R8 reproduces rejection. | Generate from complete command constraints, including special validations; regenerate recordings and check representative documented commands end to end. | M |
| D1. README names the wrong two default habits | minor | README.md:77 says viewport-dynamic and overscroll-contain. Actual defaults are transition-named and no-ease-in (src/adoption/init.ts:18). MESSAGES.md:140 and site/src/docs/pages/habits.mdx:9–30 already agree with code. | Correct README and keep one source for published default names. | S |
| D2. Reason truncation specification is wrong | minor | docs/MESSAGES.md:36 says at most 100 characters; src/report.ts:146–157 caps text at 72 including ellipsis. | Update the specification to 72, or deliberately change behavior and its feature expectations. | S |
| D4. Historical roadmap presents implemented and dropped work as pending | minor | docs/ROADMAP.md:2 drops MCP, yet :292, :418 and :443–444 still describe its installation/order; :381 and :449 claim no daemon/watch/overlay and first run exits 1. Current CLI has serve/watch (src/cli.ts:32–33), and packed first run exits 0 with an overlay available (R2–R3). | Clearly mark the memo as historical, mark completed items, and remove contradictory MCP delivery claims. Do not implement the explicitly dropped MCP server. | S |
| D5. New blueprint interaction is not covered by user guides | minor | README.md:39–45 and site/src/docs/pages/overlay.mdx describe selecting/pinning and fixing; rg for Blueprint/Alt+B/blueprint in both returns no matches. New behavior is implemented and tested in e2e/blueprint.test.mjs:1–2. | Explain toggle/Alt+B, marks, punch list, multiple picks, keyboard flow and leaving/undo semantics in the overlay guide. | S |

README.md:103 already labels editor behavior unverified; README.md:206 already labels Action verification fixture-based. Those limits should survive publication, rather than being rewritten as live editor or hosted GitHub guarantees.

## 6. Product gaps and support limits

Real Next verification is **not absent altogether**: the actual Next dev/production/static-export host test passed in this audit, as did a Next monorepo HTTP source-write slice (e2e/hosts.test.mjs:289–335; R4). Browser fiber tests exist for Next 16 webpack and Turbopack, but failed at Chromium launch here (e2e/locate.test.mjs:261; R4). The new blueprint suite uses Vite exclusively (e2e/blueprint.test.mjs:9–11, 27–36).

| Item | Severity | Evidence | Suggested fix | Effort |
| --- | --- | --- | --- | --- |
| G1. Blueprint's user flow has no Next host proof | major | Blueprint fixture creates a Vite server only; Next tests cover host/API/source attribution, not blueprint marks/chooser/punch-list writes (e2e/blueprint.test.mjs:27–36; e2e/hosts.test.mjs:289–335; R4). | Add one real packed Next feature E2E: toggle, locate mark, preview, write, reload/re-read, leave cleanly. Exercise both supported bundlers or state the verified one. | M |
| G2. Windows installer containment guard uses POSIX separators | major | src/adoption/overlay.ts:23–24 checks relative realpath with startsWith('../') but does not normalize backslashes. R8's node:path.win32 probe gives ..\\outside\\vite.config.mjs and refusal=false. Other Session paths explicitly normalize separators (src/session/engine.ts:167–168, 378–379). CI has no Windows job (ci.yml:8). This is a static/path-model proof, not an executed Windows symlink exploit. | Use a separator-safe shared containment primitive and exercise outside-root symlinks/junctions in a Windows integration slice. Gate/limit Windows support until that is verified. | M |
| G3. Final-tree large-repo performance has an unresolved gate | major | docs/briefs/perf-large.result.md:7–18 explicitly says final-tree performance is not fully certified: latest MetalUI warm maximum 2,921.68 ms vs 2,000 ms gate; AlgoRecall cold CLI 84,662.59 ms and Session cold 59,497.01 ms. Earlier passing run is not the final measurement. BENCHMARK.md:32 labels smaller-repo timings individual local measurements. | Repeat the existing large-repo harness on the frozen release SHA under controlled load, preserve result parity, then fix the failing phase or publish honest limits. These are recorded historical results; no fresh large-repo benchmark was run in this read-only audit. | M |
| G4. Common unsupported setup errors are correct but too internal | minor | Scratch missing-Tailwind run exits 2 with Cannot find module/Require stack; v3 run exits 2 with “Layer 1 requires the project’s Tailwind v4 installation” (R8; src/lower/tailwind.ts:92–94). doctor gives a clear Tailwind 4 fix (src/adoption/doctor.ts:42–48). Overlay installer does not validate React (src/adoption/install.ts:95–128). | Give direct install/version guidance in primary errors. Explain that plain CSS CLI works without React, but React source reading/writes need a React dev host; avoid silently presenting a React overlay setup as universally supported. | S |

**Support evidence:** Node 22.18.0 handles the installed CLI, generated .ts config and all adapter imports; Node 25.9.0 builds and runs non-browser local scenarios (R2/R4). CI declares 22/24, but latest Node 24 run failed and Node 22 was cancelled (R5). No full green minimum-Node suite, Windows run, Linux packed browser walkthrough, or Vite 6/7 packed host was established here. React 18 integration scenarios exist but cannot pass browser launch here. Metadata ranges are declarations, not this audit's verification matrix (package.json:40–41, 77–87).

**Misconfigurations:** no Tailwind entry is a supported plain-CSS mode, not automatically an error. The scratch no-React/plain-CSS case exits 0 in advisory mode, reports a dead utility and two missing-token config hints; doctor exits 1 because config/ledger are absent. A CSS entry importing uninstalled Tailwind exits 2; explicit Tailwind v3 also exits 2; doctor explains the required upgrade. No crash was observed in these CLI cases (R8). Missing/bad config errors are covered by passing integration scenarios (R4).

## 7. Site/docs

npm run build in site/ passed in 1.37 s, transforming 1,156 modules. It emitted module-directive and large-chunk warnings, not build failures (R6). All 15 manifest page modules exist and compile; a focused scan found 14 literal /docs/ links across MDX/JS/JSX and no missing slug. Footer docs targets exist. Evidence: site/src/docs/manifest.js:1–39; site/src/sections/Footer.jsx:15–18; R6. This is static route/link evidence, not a full deployed-browser crawl or external-link availability guarantee.

| Item | Severity | Evidence | Suggested fix | Effort |
| --- | --- | --- | --- | --- |
| S1. Public hosting and deep-link behavior have no delivery proof | major | Client selects docs by pathname (site/src/entry.jsx:12; Docs.jsx:19–35). Build emits index.html and assets, with no docs/ HTML tree, redirect/fallback configuration or site deployment workflow (R6; ci.yml). Internal /docs links are absolute. | Deploy at the intended origin root with SPA fallback to index.html for /docs/*, while preserving asset 404s. Verify direct loads, reload/back navigation and lazy MDX on the deployed site. If using a subpath, configure assets and routes accordingly. | M |
| S3. Site artifact has a substantial unverified download/render cost | major | R6: main JS 908.57 kB (159.99 gzip), CSS 1,298.20 kB (68.35 gzip), shader chunk 2,567.75 kB (712.75 gzip). entry.jsx:3–10 imports homepage, specimens, mascots, opening, docs and DialKit eagerly. Field's lazy shader mounts whenever motion is allowed, without a viewport gate (Field.jsx:49, 78–85). | Inspect production network/CPU on a representative phone and slower connection; remove/dev-gate playground imports and unused CSS, split by route and defer decorative shader work. Sizes establish risk, not measured device slowness. | M |
| S2. Hero headline remains placeholder-quality copy | minor | site/src/hero/Hero.jsx:190 says “plumber help prevent design system drift”; supporting paragraph at :203–204 is already product-specific. | Replace headline with final Plumb naming and grammatical copy; review before launch. | S |
| S4. Invalid docs paths silently show Quick start | minor | site/src/docs/manifest.js:42 falls back to first page; Docs.jsx:19–23 keeps unknown URL slug. | Give unknown docs paths a clear not-found view and useful navigation; keep /docs root's intended default separately. | S |

The npm footer link is not ready to serve users until C1 is resolved (Footer.jsx:18; npm E404 in R5). The static demo intentionally replays recorded responses and guards source writes (site/vite.config.mjs:11–12; site/src/hero/replay.js:1–7); Hero.jsx:211 explains that writes in a user's app edit real source. The replay should remain clearly distinguished from a server editing production files.

## 8. Legal and hygiene

Plumb's own MIT license is present in source and tarball, with 2026 Vijay Singh attribution (LICENSE:1–13; R1). Bippy 0.7.3 is a dependency, not a checked-in vendor copy; its installed package contains its full MIT LICENSE (node_modules/bippy/LICENSE:1–7). Served source/core/hook files retain their @license header, which points to the upstream source tree's LICENSE (node_modules/bippy/dist/source.js:1–8; src/hosts/client.ts:5–14).

| Item | Severity | Evidence | Suggested fix | Effort |
| --- | --- | --- | --- | --- |
| L1. Standalone site/served-vendor distributions lack a collected third-party license artifact | major | No NOTICE/THIRD_PARTY/LICENSE collection in the site output inventory; the built bippy-containing client bundle also has no Aiden Bai copyright, @license bippy header or full MIT permission text (R9). Served bippy modules retain a header pointing to an upstream root LICENSE, but overlayModules does not serve that license (src/hosts/client.ts:6–14). Bippy's permission text requires copyright and permission notice with copies (node_modules/bippy/LICENSE:3–5); Plumb's own MIT notice is not that text. | Include dependency license/attribution text with standalone static distribution and browser vendor assets, and verify bundler preservation for bippy and other bundled dependencies. This is a distribution-notice gap, not a legal conclusion that ordinary npm dependency installation violates its license. | S |

Pattern scans of the packed source/data allowlist and all current docs/hero recordings found no local home/tmp path or listed credential marker matches (R9). The tarball inventory excludes .claude/, benchmark recordings, scratch fixture trees and package-lock.json. The author field and LICENSE attribution are intentional public identity, not accidentally leaked local paths (package.json:97; LICENSE:3). This bounded scan does not prove absence of every possible secret. Historical audit reports can contain local paths; they are not in the npm tarball (package.json:28–38; R1).

## Command receipts and failure inventory

These excerpts preserve the decisive output in this report; full logs remain in /tmp/plumb-release-*. They are local audit evidence, not committed release artifacts.

### R1 — Package inventory and actual tarball

~~~text
node --version: v25.9.0
npm --version: 11.12.1
npm pack --dry-run --json --cache /tmp/plumb-release-npm-cache
name @unlocalhosted/plumb; version 0.1.0
size 319223; unpackedSize 1205308; entryCount 207
expected bin/export/raw-overlay paths checked: 24
missing expected paths: []
unexpected fixture/bench/site/settings/cache/credential paths: []
npm pack --json --pack-destination /tmp/plumb-release-audit
filename unlocalhosted-plumb-0.1.0.tgz
shasum 37b62aef9a5fa6492cff49ea9fb43937239cd7f6
orphan JS: dist/hosts/next-loader.cjs, dist/hosts/source-attributes.js
their corresponding declarations are also packed
~~~

The no-unexpected-path result applies to the source/data allowlist; P1 separately identifies unwanted obsolete files inside dist. All four blueprint files, choices.js, sourcemap-worker.js and tokens.css are included.

### R2 — Packed consumer CLI and minimum runtime

~~~text
npm install --prefix /tmp/plumb-release-audit/app --cache /tmp/plumb-release-npm-cache \
  --no-audit --no-fund /tmp/plumb-release-audit/unlocalhosted-plumb-0.1.0.tgz
added 53 packages in 21s; exit 0

npx --no-install plumb: exit 0
p-[13px] hardcodes 13px; rounded-[7px] hardcodes 7px
2 findings: 2 values off your tokens
Next: run plumb init ...

npx --no-install plumb init: exit 0
Wrote plumb.config.ts with inferred token sources.
Baseline: 6 debt entries (6 locations) in .plumb/ledger.jsonl.
Accepted 4 tokens as inferred.

npx --no-install plumb check: exit 0
no new findings
ledger 0 new, 6 debt, 0 exception sites; 0 stale, 0 ledger/config growth.

install --overlay --write: exit 0; Plumb import/plugin inserted first
repeat: Overlay already set up; no files changed.
install --ci: exit 0
Action revision: main. Pin it to a reviewed Plumb commit ...

Node v22.18.0: packed check exit 0, no new findings
Node v22.18.0: root, /vite, /next, /next/config imports all succeeded
~~~

CLI transcripts: /tmp/plumb-release-audit/cli-results.log; minimum-runtime output: /tmp/plumb-release-node22-check.log. The minimum Node executable was installed locally in the scratch directory, not globally.

### R3 — Installed overlay loading and reading

~~~text
VITE v8.3.4 ready in 756 ms
http://127.0.0.1:4339/
Chrome AX:
  toolbar Plumb
  container Plumb reading for button in App
  App.jsx:1; help: src/App.jsx:1:38
  known debt
  p-[13px] hardcodes 13px
  rounded-[7px] hardcodes 7px
  p-sm, 12px / p-md, 16px
Blueprint enabled:
  Recorded: p-[13px] hardcodes 13px. Choose a token.
  Recorded: rounded-[7px] hardcodes 7px. Choose a token.

GET /__plumb/<module>: 18 checked, 18 HTTP 200, missing []
~~~

The 18 names are those in src/hosts/client.ts:9, including three bippy resources. Full response inventory: /tmp/plumb-release-artifact-runtime.json. The connected browser tab was closed after verification. Headless Chromium launch remains blocked as described in R4.

### R4 — Local tests, skips and every failure

~~~text
npm test: exit 1
initial tsc build: exit 0
serial e2e stage:
  tests 377; pass 338; fail 37; cancelled 0; skipped 2
  duration_ms 319314.263375

separate PLUMB_WATCH=1 PLUMB_POLLING=1 node --test e2e/serve.test.mjs:
  exit 0; tests 26; pass 25; fail 0; skipped 1; duration_ms 38277.202792
separate PLUMB_WATCH=0 PLUMB_POLLING=0 node --test e2e/serve.test.mjs:
  exit 0; tests 26; pass 23; fail 0; skipped 3; duration_ms 35486.811458
~~~

Skip reasons:
- Native all-file run: native recursive fs.watch unavailable, EMFILE; polling-forces-session scenario intentionally skipped in native mode.
- Polling run: native-only watcher scenario intentionally skipped.
- No-watch run: native-only watcher, polling-only scenario and native-hints recovery scenario intentionally skipped.

All **37** failures below share this immediate cause: **browserType.launch: Target page, context or browser has been closed**, with child exit **SIGABRT**. Thirty-one also report **kill EPERM** during cleanup. Launch logs do not establish the precise underlying OS rejection; no affected feature assertion was reached. Full log: /tmp/plumb-release-test.log.

| Test location | Failed scenario | Cause |
| --- | --- | --- |
| e2e/blueprint.test.mjs:66:1 | Alt+B draws every drift in view where it lives, and the dock counts them | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/blueprint.test.mjs:102:1 | Leaving puts the page back exactly, and nothing keeps listening | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/blueprint.test.mjs:143:1 | A mark opens its chooser; a pick previews on the page; Write puts it in source and the mark goes | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/blueprint.test.mjs:189:1 | Several drifts are picked from their marks and written together, one apply per file | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/blueprint.test.mjs:221:1 | Undo lifts every pick; a pressed step unpicks; leaving blueprint leaves nothing previewed | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/blueprint.test.mjs:256:1 | A write the server refuses as stale is said so; Read again recovers the pick and writes | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/blueprint.test.mjs:288:1 | Keyboard only: Tab reaches a mark, Enter opens its chooser, a digit picks, Enter writes, Esc returns to the mark | Chromium launch / SIGABRT |
| e2e/blueprint.test.mjs:323:1 | The punch list: every drift in view in rows; arrows move, Enter opens that chooser, Backspace unpicks | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/blueprint.test.mjs:372:1 | The field shows on a page that paints both html and body, and both come back after | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/blueprint.test.mjs:396:1 | With motion: turning around mid-sweep and removing the overlay both leave nothing behind | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/computed.test.mjs:211:1 | real Chromium rendered classes resolve through GET classes; Node apply updates only helper literal and browser CSS | Chromium launch / SIGABRT |
| e2e/dock.test.mjs:45:1 | the dock says Plumb is ready, folds away, and Select picks an element without Alt | Chromium launch / SIGABRT |
| e2e/dock.test.mjs:97:1 | the dock reads on dark pages and is still under reduced motion | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/isolation.test.mjs:127:3 | isolation credentialless: concurrent locates preserve authored evidence | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/isolation.test.mjs:127:3 | isolation require-corp: concurrent locates preserve authored evidence | Chromium launch / SIGABRT |
| e2e/isolation.test.mjs:127:3 | isolation credentialless csp: concurrent locates preserve authored evidence | Chromium launch / SIGABRT |
| e2e/isolation.test.mjs:127:3 | isolation require-corp error: concurrent locates preserve authored evidence | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/isolation.test.mjs:127:3 | isolation credentialless throw: concurrent locates preserve authored evidence | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/isolation.test.mjs:127:3 | isolation credentialless unavailable: concurrent locates preserve authored evidence | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/linked-locate.test.mjs:117:3 | file-linked sibling library: real Base UI owners locate and Node applies the authored edit | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/linked-locate.test.mjs:117:3 | tracked workspace library: real Base UI owners locate and Node applies the authored edit | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/locate.test.mjs:244:33 | Vite React 19: real fibers locate exact JSX sites | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/locate.test.mjs:244:33 | Vite React 18: real fibers locate exact JSX sites | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/locate.test.mjs:261:49 | Next 16 webpack: installed route.plumb.ts locates exact JSX sites | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/locate.test.mjs:261:49 | Next 16 turbopack: installed route.plumb.ts locates exact JSX sites | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/overlay.test.mjs:42:1 | Alt-hover reads an element, a click pins it, a pick previews it, Write puts it in source | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/overlay.test.mjs:102:1 | Undo lifts every preview; closing never leaves a preview behind; unplaced elements say so | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/owner-locate.test.mjs:181:3 | Vite React 19 plugin-react: library owners locate, read and edit authored JSX | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/owner-locate.test.mjs:181:3 | Vite React 19 oxc: library owners locate, read and edit authored JSX | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/owner-locate.test.mjs:181:3 | Vite React 18 oxc: library owners locate, read and edit authored JSX | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/served-root.test.mjs:205:3 | Vite apps/web: browser fibers locate served JSX and Node applies exact edit | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/served-root.test.mjs:205:3 | Next apps/site webpack: browser fibers locate served JSX and Node applies exact edit | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/setup.test.mjs:126:1 | packed setup: advisory drift, init baseline, install, stamped Alt-hover and a written token fix | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/site-replay.test.mjs:13:1 | homepage guards dev writes and replays static overlay fixes in any order | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/site-text.test.mjs:14:1 | homepage text replay writes only DOM, validates refusals and commutes with class fixes | Chromium launch / SIGABRT |
| e2e/stamp.test.mjs:71:1 | Vite stamps prove exact host JSX, preserve usage and refuse stale evidence | Chromium launch / SIGABRT; cleanup EPERM |
| e2e/verify-writes.test.mjs:15:1 | frozen overlay Write proves exact source, automatic reload, current reading, CLI and original integrity | Chromium launch / SIGABRT; cleanup EPERM |

Positive scenarios included numeric dead-spacing, startup responsiveness, Next installed dev/production/static-export wiring, Next monorepo HTTP source edits, Action/approval fixtures and frozen dirty/untracked-source isolation. The complete browser write scenarios are still among the launch failures above.

### R5 — Live CI and registry status

~~~text
gh run list --limit 6 --json headBranch,headSha,status,conclusion,url:
  latest six main runs: completed/failure
latest main SHA: 4d7c0d0372347e7e163f64008f106aa57a8ee988
gh run list --branch homepage-react-plumber ...: []
gh api latest run jobs:
  test (22): cancelled
  test (24): failure at Run npm test

Node 24 log:
  tests 360; pass 333; fail 3; skipped 24
failures:
  e2e/setup.test.mjs:126 — Fixture dev server timed out
    Vite ready, but ANSI escapes split the http://127.0.0.1:<port>/ string
  e2e/stamp.test.mjs:71 — Chromium executable doesn't exist
  e2e/verify-frozen.test.mjs:12 — rev-parse HEAD^ fails, history too shallow

npm view @unlocalhosted/plumb version --cache /tmp/plumb-release-npm-cache:
  E404 Not Found; package not publicly discoverable in this probe

git tag --list: no output
rg --files .github/workflows: .github/workflows/ci.yml only
~~~

Hosted evidence: [main CI run 38350813233](https://github.com/unlocalhosted/plumb/actions/runs/38350813233). Full failed log: /tmp/plumb-release-ci-failed.log. Relevant source: setup readiness regex at e2e/setup.test.mjs:210–214; direct launch at e2e/stamp.test.mjs:79; HEAD^ at e2e/verify-frozen.test.mjs:65; checkout config at ci.yml:13. Main CI predates the branch changes and new untracked tests; do not substitute its counts for this audit's 377-test stage.

### R6 — Site build and route/link inventory

~~~text
cd site && npm run build: exit 0
1156 modules transformed; built in 1.37s
main JS 908.57 kB / gzip 159.99 kB
main CSS 1298.20 kB / gzip 68.35 kB
FieldLive shader JS 2567.75 kB / gzip 712.75 kB
warnings: module-level "use client" directives; chunks over 500 kB

manifest pages: 15
focused literal /docs/ links checked: 14
missing slugs: []
site/dist/docs directory: absent
fallback/404/hosting configuration files in dist: []
~~~

Build log: /tmp/plumb-release-site-build.log. Source-route scan covered current site/src MDX, JSX and JS. Dynamic links and external sites were not exhaustively crawled; the known npm link issue is in C1.

### R7 — Branch and working tree

~~~text
git branch --show-current: homepage-react-plumber
git log -1: f39504513e5b9a427c2ec984b9c82e0bfc504297
git rev-list --left-right --count main...HEAD: 0 29
git merge-base main HEAD: 4d7c0d0372347e7e163f64008f106aa57a8ee988
local main and remote main API: same 4d7c0d0372347e7e163f64008f106aa57a8ee988
git diff --stat: 11 files, 116 insertions, 25 deletions
initial vs post-check status diff: no output
~~~

The complete initial status is in area 3. The status comparison precedes creating this report, which adds its own untracked entry.

### R8 — Misconfigurations, rejected documented flags and Windows path model

~~~text
plain CSS, no React and no Tailwind entry:
  plumb: exit 0; dead utility plus spacing/radius config hints
  doctor: exit 1; missing config/ledger, Tailwind not used
  install --overlay: exit 0; generic script wiring, no React warning

CSS importing missing Tailwind:
  plumb: exit 2, "Cannot find module 'tailwindcss' Require stack ..."
  doctor: exit 1, "Use Tailwind 4 in the project containing the CSS entry."

explicit Tailwind 3.4.19 CSS:
  plumb: exit 2, "Layer 1 requires the project’s Tailwind v4 installation"
  doctor: exit 1, "Use Tailwind 4 in the project containing the CSS entry."

packed CLI check --family spacing: exit 2
  --family requires plumb decisions and a known family.
packed CLI doctor --json: exit 2
  plumb doctor prints text; remove --json.
generated reference:
  invalid --family on 19 non-decisions commands
  doctor --json documented: true
  install --json documented: true

node:path.win32.relative('C:\\app', 'C:\\outside\\vite.config.mjs'):
  '..\\outside\\vite.config.mjs'
guard path==='..' || path.startsWith('../') || win32.isAbsolute(path):
  false
~~~

Scratch setup/error transcripts: /tmp/plumb-release-misconfig.log. These used the installed tarball's CLI, not source imports. The Windows result evaluates the path predicate without modifying any symlink or file outside the scratch apps.

### R9 — Hygiene and license inventory

~~~text
packed source/data + docs/hero recording scan for:
  /Users/, /home/, /private/, /var/folders/, Windows user-home spellings
  private-key headers, ghp_, github_pat_, AWS access-key IDs, sk- token patterns
result: no matches

site/dist filename scan for LICENSE/LEGAL/NOTICE artifacts: no matches
site/dist/assets/client-DRsvRwrm.js contains bippy code:
  Aiden Bai copyright: absent; @license bippy: absent; MIT permission text: absent
bippy dependency: 0.7.3, MIT, full LICENSE installed
served bippy modules: @license/copyright header retained
overlay allowlist: no license-text resource
~~~

The scan does not inspect arbitrary personal tooling/credentials outside the shipped inventory or guarantee that every secret format is detected.

## Proposed order of work

1. **Freeze the candidate tree (W1/W2).** Review dead-spacing, frozen write verification and site opening as separate coherent slices; land or exclude each with its own evidence. Identify the exact SHA.
2. **Repair CI and its real browser gate (T1/T2).** Browser installation, history and ANSI-safe server detection first; run the existing feature suite on Node 22/24, including all three watch modes. Keep failures visible.
3. **Close unsafe/unsupported behavior and misleading instructions (G2, D3, D1/D2, G4).** Fix Windows containment or gate that platform; correct generated flags and defaults before asking first users to follow them.
4. **Prove Next blueprint and final performance (G1/G3).** Add only feature-level integration/E2E coverage for the missing host slice; rerun the existing performance harness on the frozen release tree. Publish a verified host/runtime/platform matrix.
5. **Prepare the actual distributable (P1/P2/L1/C2).** Fresh dist, exact pack inventory, third-party notices, valid documentation URLs and a verifiable Action SHA from the installed artifact.
6. **Finish and deploy site/docs (S1/S2/S3/S4, D4/D5).** Final copy, honest roadmap/blueprint instructions, production payload review and root-origin SPA hosting; verify deployed /docs deep links and the replay flow.
7. **Publish and verify delivery (C1).** Release version/changelog/tag plus provenance-enabled publication; install from the public registry into fresh Vite and Next consumers, and exercise the released Action SHA on a hosted fixture PR. Point site/npm/GitHub links at those verified releases.

