# Brief: CLI experience, layer 1 — wrong paths and errors

Design: docs/briefs/cli-dx.md (read all of it; build only section 5 and layer 1 of section 6, with the owner decisions
at the end). Sections 3–4 (the report layout) are later layers: do not change the report.

## Build
1. **Project discovery.** Before analysis:
   - Walk up from the working directory (or `--root`) to the nearest `package.json`, the way npm does; if it isn't the
     starting folder, print one line on stderr: `Using the project at ../.. (site, package.json).` and run there.
   - No `package.json` here or above (stop at the filesystem root or a home directory): the "No project here" error.
   - A workspace root (`workspaces` in package.json, `pnpm-workspace.yaml`, or several app folders with their own
     package.json and a React dependency) with no app chosen: list each app with what it is (Next.js / Vite / library,
     Tailwind version) and the `--root` command for it, exit 2. Running inside one app of a workspace works as today.
   - Zero source files read after config resolution: the "Found no .tsx, .jsx or .css files" error naming where it looked
     (the configured `source` globs), exit 2. Never `no findings` when nothing was read.
2. **Install and version problems.** Tailwind declared but not resolvable: `npm install` with the package manager
   detected from the lockfile (package-lock → npm, pnpm-lock → pnpm, yarn.lock → yarn, bun.lock/bun.lockb → bun).
   Tailwind 3: the upgrade message with `npx @tailwindcss/upgrade` and the upgrade-guide URL. React app, no Tailwind,
   Tailwind-looking classes: the `!` advisory listing up to three example classes and the count, then continue with
   plain-CSS checks (and don't report those classes as "does nothing" in that case).
3. **Errors.** One format everywhere a user error is printed: `✗ what happened` then, only when useful, an indented
   line with why, then `  → command to copy`. No stack traces, no raw errno text (`ENOENT … stat '…'`), no Node
   parseArgs prose. Did-you-mean for unknown commands and flags (edit distance over the real command/flag list from
   src/cli-flags.ts; offer only a close match). `--root` that doesn't exist: `✗ --root <arg>: no such folder (from <cwd>).`
   Audit every user-facing error path in src/ (cli.ts, setup-messages.ts, adoption/*, lower/tailwind.ts, config
   loading) and move them to the format. Keep exit codes as they are today unless section 5 says otherwise.
4. Record every new message in docs/MESSAGES.md in the product voice.

## Rules
- Only stderr changes for these cases; `--json`/`--agent` keep their shapes (an error in `--json` mode is still the
  existing JSON error shape, with the new text as its message).
- Integration/e2e only, never unit tests: one e2e per mockup in section 5 on scratch fixtures, asserting exact stderr,
  exit code, and that nothing was written. Plus: running from a subfolder of a fixture produces the same report as
  from its root.
- You are working in a separate worktree on branch `cli-dx-1`; another job is changing src/cli-progress.ts,
  src/profile.ts and src/index.ts on main right now. Keep your edits out of those files where you can; if you must
  touch them, keep the change minimal so the merge is easy, and say so in the result.
- Atomic commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't touch overlay/src or
  site/src. `PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test` passes in full.
- Write docs/briefs/cli-dx-1-setup.result.md with a transcript of every case in section 5, and commit it.
