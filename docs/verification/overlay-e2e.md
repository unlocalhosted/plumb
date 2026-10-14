# Plumb overlay end-to-end verification

Run: 2026-10-13T06:05:08.989Z

Command: `PLUMB_CHROMIUM=/path/to/chromium node bench/apps/verify.mjs [app ...]`

Reports use docs/verification/. App servers run sequentially against frozen git-visible working-tree copies, including uncommitted edits and explicit ignored runtime inputs. Git reads original HEAD and file lists; originals remain read-only.

Startup is measured from child launch to the first successful HTML response. Plumb initialization is held until that response and a starting health response are observed. Ready time includes the gate and browser loading; it is not an ungated startup benchmark.

Up to 150 visible React elements per page are sampled twice using the same DOM references and fresh overlay readings on the second pass. Detached or re-rendered samples are excluded; a page with >30% of its sampled nodes detached across the two passes is resampled once after up to 10 seconds waiting for 500 ms without DOM mutations and two quiet frames. Dependency oracle answers are counted as oracle-library. Exactness checks cover up to 20 placed elements per app.

Busy responses in server checks and bursts retain request, status, body, and retry evidence. Only 503 busy answers recovered on retry with health <100 ms throughout are accepted. Interaction search covers every sampled page and up to 400 extra rendered elements per app; no choices is informational. Chain stepping and no-preview Undo are tested independently. Unexplained disagreements, failed server checks, unstable results, errors, failed interactions, and health >=100 ms fail the run.

Write permits one exact overlay apply request per app. Source bytes, automatic dev reload/HMR, current overlay reading without preview, CLI findings before/after and original working-tree hashes are checked. The proven edit is restored after the server stops, then the existing whole-copy integrity guard runs.

Write-phase browser 503 responses retain their bodies, same-URL read-only retries and health in interaction.write.busyReads. They are accepted only after the overlay returns current and both health responses are ready below 100 ms. Their console messages remain in recoveredBusyConsoleErrors; all other Plumb console errors still fail.

| App | Result | Page ms | Ready ms | Sample | Detached | Oracle library | Match | Plumb only | Grab only | Disagree | JSX exact | Locate p95 ms | Health max ms | Write |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | --- |
| metalui | passed | 1374 | 14289 | 450 | 3 | 74 | 371 | 0 | 0 | 0 | 20/20 | 86.6 | 3.74 | info |
| kamui | passed | 614 | 6391 | 113 | 0 | 88 | 24 | 0 | 0 | 0 | 20/20 | 751.1 | 3.58 | info |
| craftingattention | passed | 1144 | 13325 | 150 | 44 | 83 | 22 | 0 | 0 | 0 | 20/20 | 97.16 | 4.52 | passed |
| algorecall | passed | 2285 | 28376 | 150 | 40 | 0 | 108 | 0 | 0 | 0 | 20/20 | 117.3 | 2.43 | passed |

## metalui

[Full evidence](verify.metalui.json)

Snapshot: /Users/vijaysingh/unlocalhosted/metalui; HEAD 16b7e566d9662e39689aac35225764f5b5f8b6bb; 4066 files; clone; 3888.35 ms; unchanged true; removed true.

- Dependency facade at apps/docs/node_modules: workspace links resolve to frozen inputs; native-loadable Vite config bundles stay in the copy. Registry dependencies remain symlinked to the installed original store.
- Dependency facade at node_modules: workspace links resolve to frozen inputs. Registry dependencies remain symlinked to the installed original store.
- Frozen workspace dependency @metalui/docs: /Users/vijaysingh/unlocalhosted/metalui/apps/docs => /Users/vijaysingh/unlocalhosted/plumb/fixtures/.verify-frozen/plumb-verify-11xqLR/metalui/source/apps/docs.
- Frozen workspace dependency @metalui/launch-video: /Users/vijaysingh/unlocalhosted/metalui/apps/launch-video => /Users/vijaysingh/unlocalhosted/plumb/fixtures/.verify-frozen/plumb-verify-11xqLR/metalui/source/apps/launch-video.
- Frozen workspace dependency @unlocalhosted/metalui: /Users/vijaysingh/unlocalhosted/metalui/packages/metalui => /Users/vijaysingh/unlocalhosted/plumb/fixtures/.verify-frozen/plumb-verify-11xqLR/metalui/source/packages/metalui.
- Verified Vite resolution from the copy against the original installed store (including pnpm relative symlinks).
- Frozen benchmark configuration and its imports; MetalUI token/CSS providers resolve into the frozen repository, and helper imports use the frozen Plumb build.
- Cloudflare .wrangler and TanStack .tanstack generated state stays in the disposable app; integrity excludes only these dev outputs and node_modules, and covers copied runtime artifacts.
- Plumb source stamping runs before application React transforms.
- Vite serves installed dependency directories read-only through the copy's symlinks.
- INFO: Write: no sampled placed element has a mark with one fitting token and an exact edit.

### Write

info: Write: no sampled placed element has a mark with one fitting token and an exact edit.

### /components/button

Reading: 149/149 ready; 101 computed; 20 with marks; 2 with writable edits.

Computed levels: 110; 66 attributed, 3 unattributed, 76 ambiguous classes.

Parity: 29 oracle-library; 0 detached; 0 disagreements. Missing oracle placements (up to 20) and full answers are in JSON.

Reliability: repeat identical; source-map invalidation identical.

### /foundations/motion

Reading: 149/149 ready; 125 computed; 20 with marks; 3 with writable edits.

Computed levels: 131; 54 attributed, 3 unattributed, 63 ambiguous classes.

Parity: 27 oracle-library; 0 detached; 0 disagreements. Missing oracle placements (up to 20) and full answers are in JSON.

Reliability: repeat identical; source-map invalidation identical.

### /

Reading: 147/147 ready; 43 computed; 62 with marks; 3 with writable edits.

Computed levels: 108; 510 attributed, 140 unattributed, 300 ambiguous classes.

Parity: 18 oracle-library; 3 detached; 0 disagreements. Missing oracle placements (up to 20) and full answers are in JSON.

Reliability: repeat identical; source-map invalidation identical.

## kamui

[Full evidence](verify.kamui.json)

Snapshot: /Users/vijaysingh/unlocalhosted/kamui; HEAD bec4f3d8b7db3a032e4aa774cd7a33ca2a8abbbb; 7906 files; clone; 9537.57 ms; unchanged true; removed true.

- Dependency facade at backend/node_modules: workspace links resolve to frozen inputs. Registry dependencies remain symlinked to the installed original store.
- Dependency facade at kamui-widgets/node_modules: workspace links resolve to frozen inputs. Registry dependencies remain symlinked to the installed original store.
- Dependency facade at web/apps/kamui/node_modules: workspace links resolve to frozen inputs; native-loadable Vite config bundles stay in the copy. Registry dependencies remain symlinked to the installed original store.
- Dependency facade at node_modules: workspace links resolve to frozen inputs. Registry dependencies remain symlinked to the installed original store.
- Frozen workspace dependency @kamui/replica-protocol: /Users/vijaysingh/unlocalhosted/kamui/packages/replica-protocol => /Users/vijaysingh/unlocalhosted/plumb/fixtures/.verify-frozen/plumb-verify-11xqLR/kamui/source/packages/replica-protocol.
- Frozen workspace dependency @kamui-widgets/motion: /Users/vijaysingh/unlocalhosted/kamui/kamui-widgets/packages/motion => /Users/vijaysingh/unlocalhosted/plumb/fixtures/.verify-frozen/plumb-verify-11xqLR/kamui/source/kamui-widgets/packages/motion.
- Frozen workspace dependency @kamui/medium-core: /Users/vijaysingh/unlocalhosted/kamui/web/packages/medium-core => /Users/vijaysingh/unlocalhosted/plumb/fixtures/.verify-frozen/plumb-verify-11xqLR/kamui/source/web/packages/medium-core.
- Frozen workspace dependency @kamui/replica: /Users/vijaysingh/unlocalhosted/kamui/web/packages/replica => /Users/vijaysingh/unlocalhosted/plumb/fixtures/.verify-frozen/plumb-verify-11xqLR/kamui/source/web/packages/replica.
- Frozen workspace dependency @unlocalhosted/metalui: /Users/vijaysingh/unlocalhosted/metalui/packages/metalui => /Users/vijaysingh/unlocalhosted/plumb/fixtures/.verify-frozen/plumb-verify-11xqLR/kamui/linked/1/packages/metalui.
- Frozen workspace dependency @metalui/docs: /Users/vijaysingh/unlocalhosted/metalui/apps/docs => /Users/vijaysingh/unlocalhosted/plumb/fixtures/.verify-frozen/plumb-verify-11xqLR/kamui/linked/1/apps/docs.
- Frozen workspace dependency @metalui/launch-video: /Users/vijaysingh/unlocalhosted/metalui/apps/launch-video => /Users/vijaysingh/unlocalhosted/plumb/fixtures/.verify-frozen/plumb-verify-11xqLR/kamui/linked/1/apps/launch-video.
- Frozen workspace dependency @unlocalhosted/metalui: /Users/vijaysingh/unlocalhosted/metalui/packages/metalui => /Users/vijaysingh/unlocalhosted/plumb/fixtures/.verify-frozen/plumb-verify-11xqLR/kamui/linked/1/packages/metalui.
- Rebased ignored MetalUI CSS bridge @source onto the frozen linked MetalUI input; absolute generator output otherwise scans live source.
- Verified Vite resolution from the copy against the original installed store (including pnpm relative symlinks).
- Cloudflare .wrangler and TanStack .tanstack generated state stays in the disposable app; integrity excludes only these dev outputs and node_modules, and covers copied runtime artifacts.
- TanStack route tree generated into scratch (the app's is untracked and stale); route transforms retained.
- Plumb source stamping runs before application React transforms.
- Vite serves installed dependency directories read-only through the copy's symlinks.
- INFO: interaction: no element with choices on these pages
- INFO: Write: no sampled placed element has a mark with one fitting token and an exact edit.

### Write

info: Write: no sampled placed element has a mark with one fitting token and an exact edit.

### /

Reading: 112/112 ready; 109 computed; 2 with marks; 0 with writable edits.

Computed levels: 340; 0 attributed, 3 unattributed, 0 ambiguous classes.

Parity: 88 oracle-library; 0 detached; 0 disagreements. Missing oracle placements (up to 20) and full answers are in JSON.

Reliability: repeat identical; source-map invalidation identical.

## craftingattention

[Full evidence](verify.craftingattention.json)

Snapshot: /Users/vijaysingh/unlocalhosted/craftingattention; HEAD 41405ee60d39a3ac71d5ea3007c9064a72218b98; 2595 files; clone; 2958.43 ms; unchanged true; removed true.

- Dependency facade at app/node_modules: workspace links resolve to frozen inputs; native-loadable Vite config bundles stay in the copy. Registry dependencies remain symlinked to the installed original store.
- Verified Vite resolution from the copy against the original installed store (including pnpm relative symlinks).
- Cloudflare .wrangler and TanStack .tanstack generated state stays in the disposable app; integrity excludes only these dev outputs and node_modules, and covers copied runtime artifacts.
- Removed Vitest-only test configuration from the dev host so Plumb applies; application plugins are retained.
- Disabled TanStack route generation; uses the tracked route tree, retains route transforms.
- Plumb source stamping runs before application React transforms.
- Vite serves installed dependency directories read-only through the copy's symlinks.
- INFO: interaction: every choice resolves to the value already shown

### Write

passed: src/components/home/LandingPage.tsx:179:143; `duration-150` → `duration-quick`; Write to current reading 17912.22 ms; source exact true; CLI site 1 before / 0 after; originals unchanged true.

### /

Reading: 105/105 ready; 102 computed; 1 with marks; 1 with writable edits.

Computed levels: 110; 22 attributed, 6 unattributed, 8 ambiguous classes.

Parity: 83 oracle-library; 44 detached; 0 disagreements. Missing oracle placements (up to 20) and full answers are in JSON.

Reliability: repeat identical; source-map invalidation identical.

## algorecall

[Full evidence](verify.algorecall.json)

Snapshot: /Users/vijaysingh/unlocalhosted/algorecall; HEAD 0c99512ffd202a5380bd5835087bfd90417884d2; 4714 files; clone; 4516.49 ms; unchanged true; removed true.

- Dependency facade at node_modules: workspace links resolve to frozen inputs; native-loadable Vite config bundles stay in the copy; writable dependency cache stays in the copy. Registry dependencies remain symlinked to the installed original store.
- Live non-repository symlink retained: /Users/vijaysingh/unlocalhosted/algorecall/.claude/skills/lesson-audit; target /Users/v0s06lr/SideProject/skills.sh/skills/lesson-audit is outside git inputs.
- Live non-repository symlink retained: /Users/vijaysingh/unlocalhosted/algorecall/.claude/skills/technical-writing; target /Users/v0s06lr/SideProject/skills.sh/skills/technical-writing is outside git inputs.
- Verified Vite resolution from the copy against the original installed store (including pnpm relative symlinks).
- Frozen benchmark configuration and its imports; MetalUI token/CSS providers resolve into the frozen repository, and helper imports use the frozen Plumb build.
- Cloudflare .wrangler and TanStack .tanstack generated state stays in the disposable app; integrity excludes only these dev outputs and node_modules, and covers copied runtime artifacts.
- Enabled Vite HMR only in the frozen verification host: the app disables it, so source writes otherwise require a manual reload.
- Vite dependency cache inside the project (node_modules/.vite-plumb-verify): a cache outside breaks its CommonJS interop.
- Plumb source stamping runs before application React transforms.
- Vite serves installed dependency directories read-only through the copy's symlinks.

### Write

passed: src/pages/home/figure/laminate.tsx:192:26; `font-mono` → `font-numeric`; Write to current reading 48914.28 ms; source exact true; CLI site 1 before / 0 after; originals unchanged true.

### /

Reading: 109/109 ready; 55 computed; 37 with marks; 4 with writable edits.

Computed levels: 65; 24 attributed, 0 unattributed, 39 ambiguous classes.

Parity: 0 oracle-library; 40 detached; 0 disagreements. Missing oracle placements (up to 20) and full answers are in JSON.

Reliability: repeat identical; source-map invalidation identical.
