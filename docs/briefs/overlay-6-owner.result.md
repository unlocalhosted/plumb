# Overlay 6 result

Implemented library-owner attribution in `overlay/src/locate.js`. Direct authored host JSX and explicit source metadata retain priority. Only runtime-only/missing creation evidence enables owner fallback; an authored mapping, source-hash or resolver failure refuses immediately instead of trying a caller or later owner.

Owner lookup shares React 19 stack mapping, package-path runtime classification, retained-stack evidence, source hashes and server opening-tag resolution with direct lookup. React 17/18 owners use `_debugSource` and the same runtime-path filtering. Results use `via: 'owner'`, the selected owner's component name, `rendered` for the host tag, and retain `tag` for existing overlay consumers. `site()` and existing edits/apply requests consequently read and change the attributes at that owner's JSX.

The walk stops after 12 owners, detects cycles and requires the same nearest HostPortal/HostRoot boundary. An authored component inside a portal remains locatable; ownership outside that portal cannot substitute. The resolver accepts `component=1` for owner requests, validating component JSX at its opening name rather than a host tag or a runtime factory expression inside another element's props. This permits aliases such as `<MetalButton>` and member expressions such as `<Popover.Trigger>` without comparing them to runtime display names.

Added dev dependencies `@base-ui/react` **^1.8.0** (lockfile installs **1.8.0**), `@radix-ui/react-slot`, `@radix-ui/react-primitive` and `@vitejs/plugin-react`.

`e2e/owner-locate.test.mjs` adds real Chromium/Vite slices for React 19 with plugin-react and plain oxc, plus React 18 with oxc. Each checks exact authored file/line/column, owner/component/rendered metadata, isolated site declarations and an actual source write. Fixtures cover Base UI Button/Popover trigger, forwarding, nested render JSX, Radix Slot/Primitive/asChild, direct JSX precedence, ownership inside/across portals, excessive depth, missing owners and runtime factories inside host/component props. A browser-independent real HTTP slice checks component anchors, nested declaration isolation, exact edits and stale-hash refusal. No unit tests.

Validation:

- Final `npm test`: **exit 0**. Main: **257 passed, 11 skipped**; polling: **25 passed, 1 skipped**; watch-disabled: **23 passed, 3 skipped**. No failures. Nine main skips are missing-default-Chromium browser cases; other skips are existing native-watch/environment/mode checks.
- `npm run typecheck`: passed. Final focused locate/owner integration run: **7 passed, 7 skipped, 0 failed**; skips are the missing-default-Playwright-Chromium cases. Browser-module syntax and `git diff --check` passed.
- Explicit `PLUMB_CHROMIUM` launch of installed Chrome fails with `SIGABRT` before assertions in this managed environment. The browser test fails, rather than converting that launch failure to a skip. Exact automated Chromium assertions remain unverified.
- Connected Chrome, through ordinary Alt-click overlay interaction, verified Button and Popover attribution, wrapper-local attributes, nested render JSX, Radix Slot/Primitive/asChild, direct authored JSX, portal/depth/missing-owner refusals, and runtime-factory refusal. React 18 owner and direct JSX readings and plain-oxc React 19 Button readings also worked. An actual overlay Write changed only the temporary fixture's authored Button `className` from `gap-[13px]` to `gap-s3`.
- Raw CDP inspection was rejected by automatic approval review because permission was declined. No alternative programmatic browser inspection was attempted; UI verification does not establish every exact automated metadata assertion.
- One full-suite attempt encountered an unrelated native CLI `SIGSEGV` in `dead-try.test.mjs`; its entire feature suite passed on immediate isolated rerun (**10 passed**).

No commit created, as requested by the brief. Original owner brief preserved; disposable fixtures, servers and browser tab removed.

## Follow-up: unproven owners and cold-start timing (2026-10-10)

Owner fallback now requires runtime-only creation-stack evidence at every step before walking to the next owner. An empty/unparseable creation stack refuses too. React 17/18 `_debugSource` identifies the JSX that instantiated a component, not the source of that component's render function. The current locator has no trustworthy function-provenance inventory, so these versions conservatively return `null` instead of borrowing an owner's JSX; `explain` reports `owner-unproven` with `missing-creation-stack`. Direct authored host `_debugSource` and explicit metadata still work. This supersedes the React 17/18 owner-fallback behavior described above; no function-name or missing-metadata heuristics were added.

React 18 library-owner cases now assert `null`, `owner-unproven` and no site declarations. The existing `no-jsx` and `no-jsx-component` cases still require `null`. Added the reported shape explicitly: `App` creates a host button with `React.createElement`, while `App` itself is instantiated by the `<App />` in `src/entry.jsx`. A second authored component returns a host via `createElement`; it must not borrow its caller's JSX either. Both remain null on React 19 as well. React 18's exact direct-JSX location, declarations and real edit/apply flow are retained; its edit targets the direct button rather than an unproven library owner. No unit tests added.

The existing browser cases already awaited `window.__plumb.ready()`, so initial Session startup alone does not establish the cause of the reported one-off React 19 oxc failure. That readiness promise does not cover Vite's dependency optimizer. Local Vite code shows that late dependency discovery can change common chunks, invalidate the module graph and send a full reload while the source-map worker is reading a stack. The fixture now fixes the optimizer dependency set with `noDiscovery: true`, including React, React DOM/client and both JSX runtimes alongside the libraries. Browser cases also hold Session configuration behind a file gate, assert it is still starting after the DOM/client exists, start `window.__plumb.ready()`, release the gate, and await that exact promise before any locate/site call. Cleanup releases the gate even after failures. The real HTTP slice exercises the same starting/503/release/ready boundary.

This removes the dependency-discovery timing path and makes slow Session startup an explicit fixture state, without retrying attribution failures or relaxing source-map/hash checks. The historical browser race was not reproduced here; its exact root cause and Chromium determinism remain unverified in this managed environment.

Follow-up validation:

- `npm test`: passed, exit 0. Main: **257 passed, 11 skipped**; polling: **25 passed, 1 skipped**; watch-disabled: **23 passed, 3 skipped**. Zero failures in all three phases. Main skips include the nine Chromium cases and the existing native-watch/environment checks; native recursive watching reported `EMFILE` and skipped.
- `npm run typecheck`: passed.
- `node --check overlay/src/locate.js`, `node --check e2e/owner-locate.test.mjs` and `git diff --check`: passed.
- Ran the complete `e2e/owner-locate.test.mjs` file five consecutive times: each exited 0 with **1 passed, 3 skipped, 0 failed**. The real HTTP/startup/resolve/site/edit slice passed on all five runs. All three Chromium cases skipped because the default Playwright executable is missing. These runs do **not** prove the React 19 oxc browser case deterministic; the five real Chromium runs still need the host with `PLUMB_CHROMIUM` set.

No commit created. Existing uncommitted work, including concurrently changing overlay/MetalUI work outside this follow-up, preserved.
