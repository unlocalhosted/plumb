# Readiness: React Plumber tells you what your setup costs you, and fixes it with your consent

Status: design, 2026-10-23. Owner decisions in section 6.

## 1. The system being replaced

React Plumber treats the user's project as a given and degrades silently when it isn't favourable. The user meets
symptoms, never causes:

| Symptom the owner saw | Cause nobody named |
| --- | --- |
| Every Write reloads the page (AlgoRecall; our own site until 2026-10-16) | `server.hmr: false`, or no React Fast Refresh plugin |
| A pile of overlapping "dynamic-value" labels on AlgoRecall's hero | Values computed at runtime, which nothing on the page can fix, drawn like fixable drift |
| "Reading your project…" for 40 s, every time | A config the whole-report cache doesn't accept (anything but `export default { css }`) |
| Blueprint "might" work on Next.js | No proof, no check that says whether this host is supported |
| Writes not picked up under WSL / Docker | Native file watching doesn't reach the dev server; polling is needed |

Each was found by accident and patched locally, if at all. Nothing in the tool knows what it needs from a project.

## 2. The replacement: a readiness model

**Capabilities** are what a user gets. **Requirements** are what each capability needs from the project. Plumber
checks the requirements, says plainly which capabilities are full, degraded or off and why, and offers the fix.

| Capability | What the user gets | Requires |
| --- | --- | --- |
| Read | the CLI judges drift | Tailwind 4 resolvable (or plain CSS); a theme with tokens for the families it judges |
| Remember | only new drift fails | a ledger baseline |
| Fast | warm runs reuse the whole report | a cache-eligible config (see 2.3) |
| Locate | click an element, get its source line | the `plumb()` dev plugin, first in the plugin list; React dev build (fibers); a supported host (Vite, Next.js webpack, Next.js Turbopack) |
| Preview | see a token on the page before writing | Locate |
| Write in place | Write swaps the component without a reload | Locate; React Fast Refresh plugin present; `server.hmr` not `false`; a working file watcher (polling under WSL2 / Docker / network drives) |
| Blueprint | Alt+B, every drift in view | Locate; a supported host |
| System panel | review and fill a preset on the page | Blueprint; a preset chosen (presets plan) |

### 2.1 One check, one result
A single readiness check in the engine produces, per requirement: `ok | missing | unknown`, the capability it gates,
the evidence (file:line where it's set, e.g. `vite.config.ts:19 server.hmr: false`), what the user loses, and a fix:
either a **diff** Plumber can apply, or a **step** the user must do (with the command to copy).

### 2.2 Fixes are written only with consent
Owner decision: show the exact diff, apply on a yes. Fixes Plumber can write: add `react()` (or the right Fast
Refresh plugin) after `plumb()`, remove `server.hmr: false`, move `plumb()` first, add `server.watch` polling with
`awaitWriteFinish`, run `plumber baseline`. Never silent, never outside the project's own config files, refused on a
dirty config file unless the user confirms.

### 2.3 Fast for real projects
Make the whole-report cache accept any config whose default export is plain data (no imports, calls or functions),
which is what `plumber init` writes. Then "Fast" is met by default for new projects.

### 2.4 Where it shows
- **The overlay, first** (owner decision): on first open in a running app, the dock shows readiness as a short
  checklist; anything degraded keeps a small note in the dock ("Writes reload the page: hot updates are off").
  One click shows the diff; Apply writes it.
- **The CLI**: `plumber doctor` prints the same list; `init` and `install --overlay` offer the same fixes.
- Same model, same words, both places.

### 2.5 Unfixable stays quiet
Values the page can't fix (computed at runtime, built in code) are not drawn as labels. The dock and blueprint title
block show one count, "42 values set in code; can't be fixed here", which lists them on request. Only drift a person
can act on is drawn.

## 3. Out of scope here
- "Accept as exception" from the chooser: owner decision 1 of the presets plan (2026-10-14) says the page writes
  decisions only, never exceptions. Not built unless the owner reverses it.
- Previewing elements that share one source line: a chooser feature; after readiness.
- The system panel itself: the presets plan, layer 6.

## 4. Layers (one at a time, each verified before the next; e2e only)

| # | Layer | Who | Proof |
| --- | --- | --- | --- |
| 1 | **Readiness engine**: the requirement checks, the result shape, `plumber doctor` output, a read-only `/__plumb/readiness` route, and consent-gated fixes (`plumber fix <id>` / a POST route that applies one diff). Cache-eligible data configs (2.3). | Codex | Fixtures for each requirement, met and unmet (hmr false, no react plugin, plumb not first, no baseline, executable vs data config, WSL-style polling need simulated by env); doctor output, route JSON and applied diffs asserted; a data config hits the whole-report cache. |
| 2 | **The dock's readiness** (one component, every state): first-open checklist, degraded note, diff preview, Apply, applied, refused, unknown. | Claude | Playwright on the overlay demo seeded with each unmet requirement; Apply changes the file; the note clears. |
| 3 | **Unfixable stays quiet** in blueprint and the Alt card. | Claude | AlgoRecall-shaped fixture: no dynamic-value labels drawn; the count lists them. |
| 4 | **Next.js proven** against the readiness model: Locate, Preview, Write in place and Blueprint on Next webpack and Turbopack. | Codex | Packed Next e2e covering blueprint marks, chooser, write. |

## 5. Open questions
None blocking layer 1.

## 6. Owner decisions (2026-10-23)
1. Fixes to the user's setup are written with consent: show the diff, apply on a yes.
2. First contact is in the overlay; the CLI shows the same model.
3. Values the page can't fix become one quiet count, not labels.
