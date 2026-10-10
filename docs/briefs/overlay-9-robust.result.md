# Overlay 9 result

Unreadable candidates and source files no longer abort project checks or Session startup. Candidate compilation keeps the normal batch path and retries individual candidates when the batch throws. Candidate parsing, AST compilation, CSS lowering, hover probes and completion lookup isolate failures. Failed candidates retain their parser/compiler message and produce no judged declarations or replacement suggestions. Cached failures remain visible on warm checks.

Source collection, imported-module discovery and component discovery skip malformed files while retaining valid siblings. Stylesheet collection isolates unreadable imports/files; CSS recovery skips invalid rules while preserving valid rules and source positions. Embedded stylesheets receive the same treatment. Custom-utility materialization retries failures individually with fresh compiler state, preserving base declarations without duplicates. Session refreshes retain cold-report parity and recover when broken sources/stylesheets are repaired.

Each skipped candidate/file produces one informational `config/unreadable` finding with its source/candidate and parser message. Diagnostics are deduplicated and ordered consistently across cold checks, warm caches and Sessions. Default text shows a quiet skipped-item count; `--verbose` and JSON show details. These diagnostics do not change the CLI exit status. Existing invalid-config and invalid explicit `try` input validation remains in place.

Zero-config discovery now follows HTML module scripts, inline module imports, stylesheet links and static Vite/Rollup/webpack inputs through runtime imports, re-exports, literal dynamic imports and local CSS imports. Discovery does not execute bundler configuration. A sole reached Tailwind entry wins. When several are reached, the entry associated with the unique largest source graph wins, with an informational `config/tailwind-entry` finding explaining the choice. Ties or undecidable graphs still request explicit `css`. Sessions track discovery inputs so HTML/module/config changes can change the selected entry.

Read AlgoRecall's HTML, Vite configuration, application/route entries and app/landing CSS without modifying that project. `fixtures/overlay-robust` preserves the relevant shapes: an HTML module entry, dynamic application import, separate app and `source(none)` landing Tailwind stylesheets, and `[&_.bg-error/5]:hidden` beside valid classes.

Seven integration scenarios in `e2e/overlay-robust.test.mjs` cover real Tailwind candidate failures; zero-config app selection; cold/warm diagnostic retention; unchanged configured exit status; quiet/verbose text; Session startup and repair; malformed project/imported sources and stylesheet rules; candidate/probe/completion/utility compiler failures; embedded CSS; largest-graph selection and HTML invalidation; and static bundler inputs versus genuine ambiguity. Existing watch/recovery integration tests now expect report diagnostics instead of aborted runs. No unit tests added.

Validation:

- `npm run build`: passed before tests.
- `npm run typecheck`: passed.
- `npm test`: passed, exit 0. Main suite: **268 passed, 13 skipped**. Polling: **25 passed, 1 skipped**. Watch-disabled: **23 passed, 3 skipped**. **316 passed, 17 skipped, zero failures** overall.
- All seven new integration scenarios passed in the final main suite. Skips cover missing Playwright Chromium, unavailable native recursive watching (`EMFILE`) and existing conditional/mode checks; browser/native-watch proof remains unavailable in this environment.
- `git diff --check`: passed.

No commit created. Original brief and pre-existing untracked `node_modules` preserved.
