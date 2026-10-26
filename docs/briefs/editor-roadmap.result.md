# Editor roadmap: result

## 1. Fast Refresh readiness

Status: the requirement `write.refresh` (capability `write`) already existed with the full consent model (detect, step with install command, diff once the plugin is installed, `POST /__plumb/readiness/fix`, `plumber fix write.refresh`, `plumber doctor`). What was missing and is now built:

- The diff no longer waits for Plumber to be in the config. Before, a Vite config with no `plumb()` or no `plugins` at all got only a step. Now, once `@vitejs/plugin-react`, `-swc` or `-oxc` is installed, the fix is a reviewed diff in every literal-config shape: after `plumb()` when present; appended to the `plugins` array when `plumb()` is absent; a new `plugins: [react()]` when there is no `plugins` key. Applying `locate.plugin` afterwards puts `plumb()` in front (order stays ok).
- The explanation now says what is lost: "Every write reloads the whole page and loses its state, instead of swapping the component in place." (`docs/MESSAGES.md` updated.)
- Package not installed: unchanged and deliberate. The fix is `{ kind: 'step', instruction, command }` where command is the install command for the project's package manager (`npm install -D @vitejs/plugin-react`, `pnpm add -D ...`, `yarn add -D ...`, `bun add -D ...`). The readiness model never runs a shell or edits package.json; after the user installs, the next read returns the diff.
- Next is always met (webpack and Turbopack have Fast Refresh).

Shape the overlay relies on (`GET /__plumb/readiness`, `requirements[]`):

```json
{ "id": "write.refresh", "capability": "write", "status": "missing", "title": "React Fast Refresh is not established",
  "loses": "Every write reloads the whole page and loses its state, instead of swapping the component in place.",
  "fix": { "kind": "step", "instruction": "Install the React Fast Refresh plugin, then rerun plumber doctor to review the config diff.", "command": "npm install -D @vitejs/plugin-react" } }
```
or, once installed, `"fix": { "kind": "diff", "file": "vite.config.ts", "hash": "<sha256>", "diff": "<unified diff>", "dirty": false }`, applied with `POST /__plumb/readiness/fix { id: "write.refresh", hash, confirm: true, allowDirty? }`.

Files: `src/readiness/config.ts`, `src/readiness/index.ts`, `docs/MESSAGES.md`, `e2e/readiness.test.mjs` (one new test: no-plugins config gets an independent refresh diff, applying it, then plumb goes in front).
Tests: `node --test e2e/readiness.test.mjs`: 52 pass.

Other gaps that make the editor less smooth (listed, not built):
- Fast Refresh boundaries: a component file that also exports non-components (constants, hooks mixed in) makes Vite fully reload on edit. Not detected.
- `server.watch.ignored` that covers source or the CSS entry silently drops writes; not checked (only `watch: null` and polling are).
- `server.hmr` as an object with a wrong `host`/`port`/`clientPort` (proxies, containers) breaks the socket although `hmr` is "on"; only `hmr: false` is detected.
- Native network mounts and VMs need polling but cannot be detected without `PLUMBER_WATCH_ENV`.
- No check that the Tailwind plugin (`@tailwindcss/vite`) is in the Vite config, so token CSS edits may need a restart; CSS entry not imported from JS gets no CSS HMR.
- Next: no check for `reactStrictMode` double-render effects, or that `next dev` runs with the webpack/turbopack setting the adapter was verified for.
- Composed configs (spreads, `mergeConfig`, function configs) stay `unknown` with no diff; a runtime-observed value is the only way past this.

## 2. Write history and undo

Built server-side, in the session engine (`src/session/engine.ts`), routed through `index.ts`, `coordinator.ts`, `worker.ts` and `server.ts` (GET/POST split, known methods, JSON-RPC allowlist `plumb.undo`, `plumb.history`).

- Every successful `POST /__plumb/apply`, `apply-text` and `apply-text-at` now returns an `undo` handle in the existing result. Readiness fixes are out of scope.
- The session keeps the last 20 writes: `{ id, file, line, label, at, before-content, hashAfter }` (the whole previous file text; no patch format).
- `POST /__plumb/undo { id }` restores the file as it was before that write if its current hash still equals the write's `hashAfter`. Otherwise 400 `The file changed since this write. Undo the newer writes first, or edit it by hand.` It runs in the same serialized queue and uses the same identity guards as writes (regular file, no hard links, same inode, reconcile, hash check before and after). A handle works once; undoing writes on one file must go newest first. An unknown, used or aged-out id returns 400 `That write is not in the history; only the last 20 writes can be undone, and each only once.`
- The undo is not itself recorded (no redo).

Shapes:
```json
// apply / apply-text / apply-text-at response (existing fields unchanged, `file` is still the absolute path)
{ "revision": 3, "file": "/abs/src/App.tsx", "hash": "…", "applied": ["…"], "remaining": [], "undo": { "id": "w2", "file": "src/App.tsx", "label": "“Welcome back” → “Hello again”" } }
// GET /__plumb/history  (newest first)
{ "writes": [ { "id": "w2", "file": "src/App.tsx", "line": 3, "label": "py-[10px] → py-s2", "at": "2026-10-27T10:00:00.000Z" } ] }
// POST /__plumb/undo { "id": "w2" }
{ "revision": 4, "file": "/abs/src/App.tsx", "hash": "…", "undone": "w2", "remaining": [] }
```
`label` for text writes is `“from” → “to”` (each cut at 40 characters); for token writes the edits as `from → to`, comma separated. `line` is the first written site's line. ids are `w1`, `w2`, … per session.

Files: `src/session/{engine,index,coordinator,worker,server}.ts`, `e2e/history.test.mjs` (3 tests: handles, newest-first listing, undo order and once-only; token write undo with a hand edit refusing it; 20-entry bound). Tests: history 3 pass; edits, text-at, text-edit(s), verify-writes (with Chrome), serve, hosts pass.

## 3. Inline style / set-in-code engine

What turned out to exist: `provenance/opaque-inline` is only the truly dynamic inline values (`padding: \`${w}px\``, `GAP[size]`, calls). Static inline values were already judged and given edits by the inline collector (`src/collect/inline.ts`: literals, constants, bindings, conditionals, steps), and `replacement()` already writes `padding: "var(--spacing-s2)"` for them. The overlay's "Set in code" list (`/opaque-inline|^config\//`) is runtime values plus `config/*` setup diagnostics (unreadable config, Tailwind entry), neither of which is a value to edit.

Gaps found and built:
1. Inline colours (and any "token copy" / `by-value` finding) produced no edits: grouped copies carry `choices: []` and keep their matching token per site in `edits`. `structuredEdits` now takes the site's matching token for these (`src/surfaces/edits.ts`, `siteChoices`; agent output untouched). `style={{ background: 'oklch(0.6 0.2 250)' }}` now offers `background: "var(--color-brand)"`, and likewise for `color: '#111'`.
2. Sites with no edit now say why. `GET /__plumb/edits` (and `edits` over JSON-RPC) adds `refused`:
```json
{ "revision": 0, "file": "…", "hash": "…", "edits": [], "refused": [
  { "rule": "provenance/opaque-inline", "file": "/abs/src/App.tsx", "line": 8, "column": 19, "text": "padding: `${w}px`", "reason": "Computed at runtime, so it cannot be edited here. Pass the number through a CSS variable and set padding from a class or stylesheet." } ] }
```
Reasons: runtime value (as above); `Written in a shared style object or imported value, not at this element; change it where it is defined.` (`style={BOX}`); `No token is close to …` (no fit); otherwise a generic hand-edit reason. `refused` covers only `provenance/*` sites in the requested scope.
3. Config values: not editable. `config/*` findings are setup problems, handled by the readiness model (consented fixes); they already report file:line. Nothing built.

Not done: editing a shared style object from the element that uses it (`style={BOX}`) is refused rather than rewritten, because the object may be shared by other elements; a later layer could offer the edit at the definition with a count of users.
Files: `src/surfaces/edits.ts`, `src/session/{worker,engine}.ts`, `e2e/inline-edits.test.mjs` (2 tests). Pre-existing failure unrelated: `e2e/cli-findings.test.mjs` "site read-only human reports fit real 80/140-column PTYs" fails identically without my changes.
