# Brief: release correctness (G2, D3, D1, D2, G4)

Repo: this one (React Plumber, `@unlocalhosted/react-plumber`, CLI `plumber`). Full evidence for each item is in
docs/briefs/release-readiness.result.md (rows G2, D3, D1, D2, G4). Fix them in this order, one atomic commit each,
each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

1. **G2 (major)** Windows containment: src/adoption/overlay.ts:23–24 checks `startsWith('../')` without normalising
   separators. Normalise the way src/session/engine.ts already does, and audit the rest of src/ for the same
   pattern (`startsWith('../')`, `'/'`-joined containment) and fix every instance. Prove it with an integration test
   that drives the real installer through a boundary that exercises `path.win32` semantics (or an e2e that runs on a
   Windows CI job if you add one: add a `windows-latest` job to .github/workflows/ci.yml running at least the
   adoption/install suites, if it can be made green; say in the result what runs there).
2. **D3 (major)** The generated CLI reference lists flags commands reject. Fix the generator
   (scripts/docs/gen-reference.mjs) so flags come from the CLI's own per-command acceptance, not a restriction map
   with a universal fallback; regenerate site/src/docs/recordings/reference/cli.json; add/extend an e2e that, for
   every command in the reference, runs the real CLI with each listed flag and asserts it is not rejected as unknown.
3. **D1** README.md default habits: correct to the names in src/adoption/init.ts. Make one source: README text must
   match what `plumber init` actually writes (an e2e asserting the README's listed defaults equal init's output is fine).
4. **D2** docs/MESSAGES.md says reasons truncate at 100 chars; code caps at 72. Update the spec to 72.
5. **G4** Common unsupported setups (no Tailwind installed; Tailwind v3; overlay install without React) should give
   the same clear, user-level message `plumber doctor` gives (src/adoption/doctor.ts), exit code unchanged, no stack
   traces. Draft the messages in the voice of docs/MESSAGES.md. Prove each with an e2e on a scratch fixture.

Rules: integration/e2e tests only, never unit tests; test what a user observes through the CLI. Don't touch
overlay/src or site/src UI code. Run `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`
at the end; it must pass in full. Write docs/briefs/release-correctness.result.md (what changed, counts, commits)
and commit it. Do not touch ../algorecall.
