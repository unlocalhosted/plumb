# Brief: the four-app check runs on frozen copies

## Why

`bench/apps/verify.mjs` runs each app's own dev server in place. Other agents edit these apps continuously. During the last run, MetalUI took two commits to `apps/docs/src/pages/Landing.tsx` mid-run, and AlgoRecall took a commit plus many uncommitted edits. The check's guard reported "The app working tree changed during verification", and every location failure pointed into a file that had changed. A run can't be reproducible while its inputs move.

## What to build

A snapshot step, on by default, that `verify.mjs` runs before each app:

1. Take the app repository's top level (`git -C <app.root> rev-parse --show-toplevel`). Record its `HEAD` and the list of git-visible files: `git ls-files -co --exclude-standard -z`, tracked plus untracked-but-not-ignored. This captures the working tree as it is at that moment, uncommitted edits included.
2. Copy those files into the run's scratch directory, preserving relative paths. Use APFS clones (`cp -c`, or `fs.copyFile` with `COPYFILE_FICLONE`) so the copy is near-instant and takes no disk space. Fall back to a normal copy where clones aren't supported.
3. Link every `node_modules` directory of the original (root and workspace packages, found without descending into `node_modules`) into the same relative place in the copy, as symlinks. pnpm (Kamui) relies on relative symlinks inside `node_modules`, so verify that resolution still works from the copy.
4. Build outputs that are ignored but needed have to be handled deliberately. Kamui's `src/routeTree.gen.ts` is already generated into scratch by the check. For each app, find any other ignored file the dev server needs, using the app's own config and errors as evidence, and list it explicitly per app in the `apps` table, copied (cloned) as well. Don't copy ignored trees wholesale: MetalUI and Kamui hold gigabytes of captures and build output.
5. Point the app entry's `app` and `root` at the copy, so the dev server, Plumb's `root` and the server checks all read the copy. Workspace packages that resolve through a `node_modules` symlink back into the original repo (MetalUI's own packages, MetalUI linked into Kamui) would read live files. Detect that, and either resolve them to the copy or record it in the report's adaptations, with the reason.
6. The "working tree changed" guard compares the copy before and after the run. Also compare the original's `HEAD` before and after, but report a change there as information ("the original moved on during the run; the result is for <sha>"), not as a failure.
7. Remove the copy after the run. Never write inside the original repositories. That includes `.git`, so no `git worktree add`: it writes worktree metadata into `.git`.

Record the snapshot in each report: the original path, `HEAD`, the file count, clone or copy, and the time taken.

## Done when

- `PLUMB_CHROMIUM=<path> node bench/apps/verify.mjs` passes all four apps in **one run**, while the originals change. Prove it by running a small script that touches a tracked file in a scratch clone of one app during the run. Don't touch the real originals.
- Snapshot time is reported per app and stays under 30 seconds.
- `npm test` passes.
- Write the result, with the four-app table from the single run, to `docs/briefs/verify-frozen.result.md`.

## Limits

- Only modify files inside `/Users/vijaysingh/unlocalhosted/plumb`. Never write inside `metalui`, `kamui`, `craftingattention` or `algorecall`.
- Another Codex job is writing `docs/briefs/live-editor-lld.result.md` read-only. Don't touch that file.
- No commits, no pushes, no global installs.
