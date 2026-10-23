# Readiness 1b result

Implemented the four requirements in `readiness-1b.md`. No changes to
`overlay/src` or `site/src`; the owner's existing `site/src/hero/Hero.jsx` change
is preserved. No push. Focused checks passed; the full-suite gate remains red
on the React 18 locator navigation assertion documented in the layer-1 result.

## Behavior

- `locate.order` checks Plumber against imported JSX/TSX transformers, including
  official React, Preact and Babel plugins. Tailwind and MDX before Plumber do
  not create an order gap. Opaque plugin arrays remain unknown. An applicable
  order diff moves the existing Plumber call before the earliest JSX transformer,
  preserving preceding unrelated plugins and the call's arguments.
- Readiness offers config diffs through the existing consent, hash, dirty-file
  and own-config checks. It never offers an editor command as a fix. Installed
  React Fast Refresh packages get an import and a call immediately after Plumber,
  even when Plumber follows Tailwind. Missing packages get the lockfile's package
  manager command plus an instruction to rerun doctor for the diff. Package
  resolution is fresh on each check: a live route sees a completed installation
  without requiring its process to restart. HMR diffs remove `hmr: false`;
  polling diffs set `usePolling: true`, `interval: 100` and `awaitWriteFinish`,
  preserving other watcher options.
- `preview.locate`, `write.locate`, `blueprint.locate` and `system.blueprint`
  retain their statuses and gain `derived: true`. Blocked checks also gain
  `cause`, pointing to the underlying requirement, including across dependency
  chains. A missing cause takes priority over an earlier unknown check. Satisfied
  derived requirements omit `cause`. Doctor lists and counts original causes.
- The system capability and both requirements remain in JSON. Its capability
  has `available: false`; its status still describes its prerequisites. Doctor
  prints `unavailable System panel`, omits its requirements, and excludes them
  from setup-gap counts and exit status. Unknown active requirements still do
  not fail doctor. `schemaVersion` remains 1.

`docs/MESSAGES.md` records the additive model and CLI wording changes. Existing
transport authentication, consent and refusal behavior remain in force.

## Verification

Only integration/end-to-end tests were added. `e2e/readiness.test.mjs` exercises
route JSON and `plumber doctor` for each requirement, applies fixes through the
consent-gated route or CLI, then loads the actual written config with Vite,
starts its server, compiles TSX and requests its live readiness route.

Coverage includes Tailwind-first versus React-first, Babel versus MDX pre,
all four package-manager lockfiles, package-absent/install-completed transitions
in one route process, React import binding collisions, missing/empty/disabled
watcher settings, preserving watcher exclusions, explicit polling intervals,
HMR removal, derived cause priority and doctor exit 0 despite absent system
prerequisites. Existing stale-hash, consent, dirty-file and symlink refusal
checks are retained. Install transitions link existing real packages into an
isolated fixture's `node_modules`; no package manager is executed by readiness
or these tests.

Final focused checks passed:

- Order/live Vite: 3 tests, `/tmp/plumb-readiness-1b-order-live.log`.
- Fix flows/config startup: 15 tests,
  `/tmp/plumb-readiness-1b-fixes-final.log`.
- Metadata/order/doctor: 10 tests, `/tmp/plumb-readiness-1b-metadata.log`.
- Missing cause ahead of unknown dependencies: 1 test,
  `/tmp/plumb-readiness-1b-causes.log`.

Early focused attempts exposed cached package absence and fixture cleanup that
could trigger a config restart. Two hanging diagnostic runs were interrupted;
the final helper closes Vite before deleting watched files, and the final
focused runs exited normally. No assertion or timing limit was weakened.

Full suite started once after implementation:

```sh
PLUMBER_CHROMIUM='/Users/vijaysingh/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' npm test
```

The full command exited 1 after its native group: **478 passed, 1 failed,
1 skipped**, 480 total, 800.4 seconds. All readiness checks passed in that run.
The failure was `Vite React 18: real fibers locate exact JSX sites`,
`e2e/locate.test.mjs:272`: `dependency optimization must not reload the document
during locate`, actual 2 navigations versus expected 1. This is the same
intermittent assertion recorded in `readiness-1.result.md`; its underlying cause
remains unconfirmed. Full log: `/tmp/plumb-readiness-1b-full.log`.

The runner stops after a failing group, so the remaining groups ran separately
once, with the same Node flags and environment settings as `scripts/test.mjs`:

- Bounded burst: 4 passed, no failures or skips; its 8 MiB semispace cap and
  latency assertions are unchanged.
- Polling serve: 25 passed, 1 mode-specific skip, no failures.
- Watch-disabled serve: 23 passed, 3 mode-specific skips, no failures.
- One isolated React 18 locator rerun: 1 passed, no failures or skips.

Supplemental log: `/tmp/plumb-readiness-1b-remaining.log`. All remaining groups
exited 0. The isolated pass does not erase the full-run failure or establish its
cause. No second full-suite run; no locator, overlay source, assertion or timing
limit changes.

## Commits

- `ac23e27` — JSX-relative plugin order and integration coverage.
- `153e67e` — consented diff offers, polling interval and post-install rechecks.
- `43a9294` — derived causes, unavailable system capability and doctor behavior.

Every commit ends with the requested co-author trailer. This result document is
committed separately after the final verification result is recorded.
