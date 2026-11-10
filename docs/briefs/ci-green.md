# Brief: a green suite and green CI (release blockers T1, T2)

Repo: this one. React Plumber (`@unlocalhosted/react-plumber`, CLI `plumber`). Read docs/briefs/release-readiness.result.md for T1/T2.

## 1. Four e2e files fail on main today (they failed before the rename too; verified at 5ccbffc)
Run each with `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node --test e2e/<f>.test.mjs` after `npm run build`.
- `e2e/stamp.test.mjs` "author wins only its opening; fragments remain untouched; disk unchanged" and "Vite stamps prove exact host JSX…": a browser console error `Failed to load resource: 404`. Find which resource 404s and why; fix the cause (not the assertion) unless the 404 is a harmless favicon the test page never had, in which case give the fixture page one.
- `e2e/setup.test.mjs` "packed setup…": waits for an option 'compact related items' in the reading card. That label is stale since the overlay's spacing choices became a ladder; e2e/overlay.test.mjs already moved to picking `/s2/` (see how it filters `reading.filter({hasText:/gap-s2/})`). Update the expectation the same way, keeping what the test proves (a written token fix).
- `e2e/site-text.test.mjs` and `e2e/site-replay.test.mjs`: the homepage under the test's Vite dev server throws `TypeError: _jsxDEV is not a function` at site/src/entry.jsx (pages are now lazy-loaded via dynamic import). Find the real cause (dep optimisation / react jsx-dev-runtime resolution with lazy chunks, or a cacheDir shared with a running dev server on port 4327) and fix it in config so a fresh dev server and the static build both render the homepage. Do not change what the site renders.
Do not weaken assertions. Do not touch overlay/src or site/src UI code beyond what the root cause strictly needs; say so in the result if you must.

## 2. CI (T1)
.github/workflows: install the Playwright browser CI needs (or set PLUMBER_CHROMIUM from a setup step), fetch full history where tests need git history, and fix the ANSI regex issue from the audit. CI must run `npm test`.

## Done when
`npm test` passes in full locally with PLUMBER_CHROMIUM set (report the counts), and the workflow change is explained. Make atomic commits per fix ending with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. If git is not writable, leave the changes and list the intended commits. Write the result to docs/briefs/ci-green.result.md.
Rules: integration/e2e tests only, never unit tests.
