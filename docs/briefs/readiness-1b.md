# Brief: readiness engine fixes found by using the overlay panel

Layer 1 (docs/briefs/readiness-1.result.md) is the base. Seen on overlay/demo (`plugins: [tailwindcss(), plumb()]`):

1. **False alarm: `locate.order`.** It reports "React Plumber must be first in the plugin list" because `tailwindcss()`
   comes before `plumb()`, and turns Locate, Preview, Write and Blueprint off. Locate works on that config (the
   overlay e2e suite runs it). Order matters only relative to plugins that transform JSX/TSX before plumb sees it:
   `@vitejs/plugin-react`, `@vitejs/plugin-react-swc`, babel-based JSX plugins, MDX with `enforce: 'pre'` is not one
   of them for .jsx/.tsx. Report `locate.order` missing only when such a plugin precedes `plumb()`. E2E: tailwind first
   → ok; react() first → missing.
2. **Fixes should be diffs where Plumber can write them** (owner decision: write with consent). Today:
   - `locate.order` offers `${EDITOR:-vi} "vite.config.mjs"`. Offer a diff that moves `plumb()` before the JSX plugin.
   - `write.refresh` offers only `npm install -D @vitejs/plugin-react`. When the package is installed, offer a diff that
     imports it and adds `react()` right after `plumb()`; when it isn't, keep the install step (package manager from the
     lockfile) and say the diff comes after it. After the install, readiness re-run offers the diff.
   - `write.hmr` (`server.hmr: false`): a diff that removes it.
   - `write.watcher` polling: a diff adding `server.watch` with `usePolling`, `interval: 100`, `awaitWriteFinish`.
   Never offer an `$EDITOR` command as a fix.
3. **Mark derived requirements.** Add `derived: true` (and `cause: '<requirement id>'` where known) to requirements
   that only restate another capability being off (`preview.locate`, `write.locate`, `blueprint.locate`,
   `system.blueprint`), so clients list causes, not repeats. Keep the field additive (schemaVersion stays 1).
4. **`system` capability**: the system panel doesn't exist yet. Keep it in the report but mark it `available: false`
   so clients and `plumber doctor` don't present it as a setup gap.

E2E for each through the route and `plumber doctor`; applied diffs leave a config that builds (start Vite on it).
Don't touch overlay/src or site/src. Focused tests per item; the full suite once at the end. Atomic commits ending with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push. Write docs/briefs/readiness-1b.result.md.
