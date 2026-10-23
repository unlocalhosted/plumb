# Brief: readiness engine, three fixes seen by using the panel, plus the React 18 flake

Reproduce with fixtures/.apply-live-style projects (a vite.config.mjs next to the overlay demo's src/ and index.html).

1. **`locate.order` false alarm with no React plugin.** `plugins: [plumb(), tailwindcss()]` with Vite's built-in oxc
   JSX transform still reports "React Plumber must precede JSX transforms". plumb() is first; Vite's own transform is
   not a plugin before it. Only a JSX-transforming plugin listed before plumb() makes this missing.
2. **Diffs leave debris.** Removing `hmr: false` from `server: { host: '127.0.0.1', port: 0, hmr: false }` leaves
   `port: 0  }` (two spaces). An applied fix must produce what a person would have typed: no double spaces, no
   dangling commas, no blank-line litter, for removals at the start, middle and end of an object and on their own line.
   e2e/readiness-panel.test.mjs "Apply writes the ticked change…" asserts nothing else in the config moved; it must pass.
3. **`write.refresh` falls back to "this config needs manual review"** when the config imports plumb from a path
   (`import { plumb } from '../../dist/hosts/vite.js'`) or alias. Recognise the plumb() call in the plugins array by
   the call and its position, whatever the import specifier, and offer the diff (import react from
   '@vitejs/plugin-react', add react() right after plumb()) when the package resolves from the project.
4. **The React 18 flake** (`e2e/locate.test.mjs` "Vite React 18: real fibers locate exact JSX sites", the assertion
   "dependency optimization must not reload the document during locate", 2 navigations vs 1) has failed three full
   runs (readiness-1, readiness-1b, earlier loose-ends). Find the real cause: which request triggers Vite's optimizer
   to reload (a dep discovered late? the overlay's own module graph? the source-map worker?) with Vite's debug logs
   (`DEBUG=vite:deps`) across 20 cold runs, and fix it at the cause. No retries, no relaxing the assertion.

Integration/e2e only. Don't touch overlay/src or site/src. Focused tests per item; the full suite once at the end with
`PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`. Atomic commits ending with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push. Write docs/briefs/readiness-1c.result.md.
