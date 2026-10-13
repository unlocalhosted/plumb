# Brief: the four-app check proves one real write per app

`bench/apps/verify.mjs` runs each app on a frozen copy, cloned into scratch by `bench/apps/frozen.mjs`, and proves locating, reading, preview, Before and Undo. It never writes, because it used to run on the real app checkouts. Now that it runs on copies, a write is safe there and should be proven.

## Add, per app, after the existing interaction checks

1. Choose one placed element whose reading has a mark with an exact edit: a single fitting token, `edit` present. Prefer one whose choice changes the computed style; any exact edit will do if none does.
2. Through the real overlay in the page, pick the token and press **Write** (`/__plumb/apply` through the overlay's own request, not a direct HTTP call from Node). Today's `context.route` guard blocks every write request. Allow exactly this one apply, to the frozen copy's server.
3. Assert:
   - **The source:** the edited file in the **copy** differs from before by exactly the edit's `from → to`, with every other byte identical.
   - **The page:** the dev server reloads or hot-updates, and the reading comes back current: that site is gone from the reading, and the element's computed value equals the previewed one.
   - **The check:** `plumb check --json` on the copy no longer reports that site.
   - **The original:** the app's real repository is unchanged. The existing working-tree guard must still pass.
4. Record the file, line, `from → to`, and the time from Write to a current reading, in the report and in `docs/verification/overlay-e2e.md`, as a "Write" column or section.

If an app has no element with an exact edit on its sampled pages, record that as information with the reason. Don't fake a write.

## Checks

- `npm run build` and `npm run typecheck`.
- `node bench/apps/verify.mjs`, all four apps in one run, with `PLUMB_CHROMIUM` set as before.
- `e2e/verify-frozen.test.mjs`.

Write the result, with the four-app table and the write per app, to `docs/briefs/verify-writes.result.md`.

## Limits

- Only modify files inside `/Users/vijaysingh/unlocalhosted/plumb`. Never write inside `metalui`, `kamui`, `craftingattention` or `algorecall`. The write goes only to the frozen copy in scratch, and the guard proves that.
- Other work is editing `overlay/`, `e2e/dock.test.mjs` and `site/`. Don't touch those.
- No commits, pushes, worktrees or global installs.
