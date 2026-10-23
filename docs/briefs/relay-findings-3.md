# Brief: two packaging bugs found by running Relay on Next.js

1. **React Plumber in Next.js from a linked install bundles its own server code.** examples/relay/next depends on
   `"@unlocalhosted/react-plumber": "file:../../.."` (a symlink to the repo, like any `npm link`/`file:` install, the
   way AlgoRecall is installed too). `plumber install --overlay --write` wired it correctly (withPlumb, route.plumb.ts,
   <PlumbOverlay/>), but `next dev` (Turbopack, and `--webpack` too) fails: the import trace runs
   layout.jsx → dist/hosts/next.js → next-dev.js → session/server.js → readiness → index.js, and the bundler tries to
   bundle lightningcss, oxc-parser and oxc-resolver native bindings ("Module not found", "Unexpected character").
   `withPlumb` adds the package to serverExternalPackages by name, but a symlinked package resolves to its real path
   outside node_modules, so the name never matches. Also: why does <PlumbOverlay/> (rendered in the layout) pull the
   whole session server into the module graph at all? The client component should import nothing server-side; the
   route file owns the server. Fix both: keep the overlay component's import graph to client code, and make the server
   externals hold for linked/real-path installs (Turbopack and webpack). E2E: a Next 16 fixture that installs the
   package as `file:` (symlink) and as a packed tarball; `next dev` serves the page with the overlay and the
   /__plumb/health route, on Turbopack and webpack. The existing packed-install Next e2e must still pass.
2. **`plumber` loses its executable bit after a build.** `npm run build` cleans and recreates dist/, so dist/cli.js is
   written without +x; `node_modules/.bin/plumber` in any linked install (and in this repo after a rebuild) fails with
   "Permission denied". Make the build leave dist/cli.js executable (and keep the shebang). E2E: after `npm run build`,
   the linked bin runs.

Don't modify examples/ (Relay is the reference; you may read it), overlay/src or site/src. Note: another job may be
rebuilding dist/; coordinate by waiting for it, don't race it. Focused tests, then the full suite once:
`PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`. Atomic commits ending with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push. Write docs/briefs/relay-findings-3.result.md.
