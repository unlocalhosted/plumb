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
