# Release setup result

Implemented `plumb install --overlay --write`; the default remains print-only. Oxc positions and MagicString preserve authored config bytes and comments. Vite gets Plumb first (including moving an existing call and preserving its options). Next gets a wrapped config, the encoded development route, and an overlay inside the root layout body, respecting `src/app`. Reinstallation changes nothing. Ambiguous/dynamic configs and escaping or dangling symlinks refuse before writes and print manual wiring on separate lines. No package installation occurs in the installer.

Added `e2e/setup.test.mjs`: installer integration checks plus a fresh Vite/React/Tailwind app that installs an actual `npm pack` tarball. The browser walkthrough proves advisory drift, init/baseline, green check, idempotent wiring, JSX stamps, Alt-hover/pin, token preview, and exactly one source edit. The fixed source site disappears from check; unrelated drift remains. Config and ledger stay byte-identical. Paying down debt leaves the expected stale-ledger warning, with check still green.

The walkthrough exposed that Session edits excluded baseline debt. Session writes now offer debt fixes while preserving accepted exceptions and keeping automatic agent suggestions limited to new findings.

Checks passed:

- `npm run build`
- `npm run typecheck`
- `node --test e2e/setup.test.mjs` — 2 passed, no skips; Chromium walkthrough included.
- `node --test e2e/adoption.test.mjs` — 16 passed, no skips (also passed in the combined serial run).
- Scoped `git diff --check`.

Browser runs used `PLUMB_CHROMIUM=/Users/vijaysingh/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`. Test commands used `TMPDIR=$PWD/fixtures` and `GIT_CEILING_DIRECTORIES=$PWD` to keep adoption fixtures inside Plumb without inheriting its Git repository. The setup test keeps npm cache and browser temporary files inside Plumb and removes its disposable projects after closing the browser/server.

No full suite, commits, pushes, worktrees or global installs. No edits by this task to README, frozen-verification files, benchmark verifier, or the four application repositories.
