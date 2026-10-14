# CI-green result

Completed locally on 2026-10-14, Node v25.9.0, macOS. Required command exited **0**:

```sh
PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
```

| Stage | Tests | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: | ---: |
| All e2e files, native watch | 400 | 399 | 0 | 1 |
| serve.test.mjs, polling | 26 | 25 | 0 | 1 |
| serve.test.mjs, watch off | 26 | 23 | 0 | 3 |
| Combined invocations | **452** | **447** | **0** | **5** |

No cancellations. Totals repeat the serve scenarios across watch modes; they are not 452 unique scenarios. All skips are existing mode-specific guards: forced polling, native watching, and native watcher hints when that mode is disabled. Native watching passed; no EMFILE or browser-launch skips occurred. Full receipt: `/tmp/plumb-ci-green-full.log`.

The four requested files also passed focused checks after building: stamp **11/11**, setup **2/2**, site-text **1/1**, site-replay **1/1**. Setup additionally passed with `FORCE_COLOR=1`, exercising colored Vite output. After refreshing the recording, both site files passed together serially. `npm run typecheck`, `actionlint .github/workflows/ci.yml`, and `git diff --check` passed.

Fixes and evidence:

- **Stamp:** browser console location identified `/favicon.ico` as the 404. The fixture now supplies an inline SVG favicon. Fragment, disk-integrity, source-map, and browser-error assertions remain intact.
- **Setup:** replaced stale reason-text selection with the existing `/s2/` ladder pattern, and waits for `gap-s2`. Retains the 8px preview, exact disk edit, untouched config/baseline, ledger, and unrelated-drift assertions.
- **Site config:** Vite `build()` leaves `NODE_ENV=production` in its API caller. The subsequent dev server emitted development JSX while optimizing React's production JSX runtime, which exports `jsxDEV = undefined`. A fresh-cache probe still showed `isProduction: true` alongside `jsx.development: true`; cache isolation alone could not fix it. Config now aligns NODE_ENV with the command and gives each process its own dependency cache, avoiding collisions with the separate port-4327 server. Lazy loading and page content are unchanged.
- **Site text/replay:** repaired stale harness expectations exposed once the homepage rendered. Text hash expectations now edit JSX class attributes rather than the earlier explanatory comments. Replay selects accessible ladder labels, dismisses the dev tuner normally, centers controls below the fixed header, and clicks each visible nut without forcing clicks. Exact CSS assertions reflect the current theme. Alternate coverage uses actually offered card `rounded-md` and padding `p-5`, alongside alternate gap/button padding. Six writes, four corrected readings, three static orders, untouched source, error checks, and zero static API traffic remain asserted.
- **Static harness:** reads files before sending success headers, allowing missing files to return 404 without `ERR_HTTP_HEADERS_SENT`. Closes the browser before servers so an error cannot hang teardown. Temporary tracing was removed.

**Required UI exception:** `site/src/hero/Hero.jsx` received only `pointer-events-none` on the decorative “Tokens written” receipt. It physically covered the corrected first nut and prevented reopening its reading. This fixes the actual click obstruction without changing appearance. No overlay source was edited. Refreshed `replay.json` through the existing isolated recorder so owner stamps match current source: 72 stamped hosts/owners, 21 states, 265 responses; card source and offered group choices stayed unchanged.

CI retains the Node **22/24** matrix, typecheck, and **`npm test`**. Checkout now fetches full history for the frozen-checkout `HEAD^` scenario. Both root and site lockfiles participate in npm caching; both dependency trees are installed. `npx playwright install --with-deps chromium` provisions the browser and Linux libraries following [Playwright's CI instructions](https://playwright.dev/docs/ci). Setup readiness strips ANSI controls from accumulated logs before matching the URL, including escapes split across output chunks. Hosted CI was not triggered; this report proves local success and workflow lint, not a completed GitHub run.

Atomic fix commits, each ending with the requested co-author trailer:

- `c2169cd` — fixture favicon
- `7ade1df` — aligned site runtimes and isolated caches
- `8822771` — JSX-only text replay expectations
- `0af2524` — setup ladder selection
- `0235693` — CI provisioning and ANSI-safe readiness
- `aae5cf3` — receipt click obstruction and refreshed recording
- `077a59f` — replay walkthrough harness

This result is committed separately. Unrelated WIP, `docs/briefs/establish-design-system.plan.md`, and `../algorecall` were left untouched.
