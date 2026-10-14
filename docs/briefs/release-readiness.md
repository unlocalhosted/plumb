# Brief: release-readiness audit for @unlocalhosted/plumb (research only, no code changes)

Goal: a ranked, evidence-backed list of everything that stands between this repo and a first public release
(npm package @unlocalhosted/plumb, the GitHub Action, and the site/docs at site/). Do NOT change code, config or git
state; do not commit. You may run read-only commands, the build (`npm run build`) and the test suite.
Write the result to docs/briefs/release-readiness.result.md.

Audit, citing file:line or command output for every claim:
1. Package: package.json (name, version, files, exports, bin, engines, peer deps, license, repository, keywords),
   whether `npm pack --dry-run` contains everything the CLI, the Vite/Next hosts and the overlay need (overlay/src/*.js
   includes blueprint*.js, choices.js) and nothing it shouldn't (fixtures, temp dirs, secrets, local paths). Install the
   packed tarball into a scratch Vite + React + Tailwind v4 app in a temp dir and confirm `npx plumb`, `plumb init`,
   `plumb check`, and the overlay client load. Report exactly what works.
2. Tests: run `npm test` as defined in package.json (set PLUMB_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   if Playwright's Chromium is missing). Report pass/fail/skip counts and every failure with its cause. Note flaky ones.
3. Working tree: list uncommitted and untracked changes (git status) and say which look like unfinished work that
   must land or be dropped before release (e.g. the dead-spacing work in src/rules/*, src/session/*, e2e/*). The branch
   is homepage-react-plumber, 29 commits ahead of main: say what merging to main involves (conflicts? CI?).
4. CI and release automation: .github/workflows/*, action.yml, docs/briefs/release-setup*.md. Is there a publish
   workflow, provenance, a changelog, versioning, tags? Is the Action's install pinning sound for users?
5. Docs and messages truth: README, docs/MESSAGES.md, docs/ROADMAP.md, CLI --help vs the actual behaviour. Known
   suspects: README naming the wrong default habits; MESSAGES.md saying token reasons are cut at 100 chars while the
   CLI cuts at 72. Find others.
6. Product gaps that would embarrass a first release: features documented but not working, Next.js host and the new
   overlay blueprint mode never exercised on Next, Windows path handling, Node version support, performance on a big
   repo (bench/ results if any), error messages on common misconfigurations (no Tailwind, Tailwind v3, no React).
7. Site/docs (site/): does `npm run build` in site/ pass; any page linking to something missing; hosting needs
   (SPA fallback for /docs/* paths); the homepage hero still has placeholder copy.
8. Legal/hygiene: LICENSE, third-party notices for vendored code (bippy etc.), no credentials or personal paths in
   shipped files or recordings.

Output format: an executive summary (blockers count, majors, minors), then a table per area: item, severity
(blocker / major / minor), evidence, suggested fix and rough effort (S/M/L). End with a proposed order of work.
