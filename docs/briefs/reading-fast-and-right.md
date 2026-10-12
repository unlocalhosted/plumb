# Brief: a reading opens fast, and Tailwind's numeric scale counts as the scale

Two engine changes, made in this order. Each is checked with quick sanity checks only; the owner asked for that, not the full suite.

## 1. Tailwind's numeric spacing is the scale when the project hasn't replaced it

**Observed on AlgoRecall** (`/Users/vijaysingh/unlocalhosted/algorecall`, read-only; config `bench/apps/algorecall.plumb.config.ts`). `src/pages/problems/ProblemList.tsx:248` has `className="… gap-3 … px-3 py-2 …"`. The overlay reports "0.75rem isn't on your spacing scale" and "No token is close". `plumb decisions --family spacing` lists only eight named layout tokens (`--spacing-page-x`, `--spacing-rail-w` and so on). Tailwind's `--spacing: 0.25rem` (from `node_modules/tailwindcss/theme.css`) is excluded on purpose: `src/decisions/index.ts:50`, `:122`, `:125`, and `src/rules/attribution.ts:20`. So `gap-3`, which compiles to `calc(var(--spacing) * 3)`, resolves to a bare 0.75rem that matches nothing. In a project that uses Tailwind's numeric scale as its spacing system, nearly every spacing class becomes a false "off".

**Rule to implement:**

- When the project **has not defined its own spacing ladder**, a value written as `--spacing` × n (Tailwind's numeric utilities, and any `calc(var(--spacing) * n)`) is **on the scale**. That holds whether `--spacing` is Tailwind's default or set by the project. Choices for an off-scale value then include the nearest numeric steps, named the way the person writes them (`gap-3`, `p-4`).
- When the project **has its own ladder**, keep today's behaviour: numeric steps are `provenance/spacing/framework`, soft, with the project's own nearest tokens named. MetalUI is that case. It resets Tailwind's numeric scale in favour of `mu-space-*`; check its theme, `/Users/vijaysingh/unlocalhosted/metalui/packages/metalui/src/components/theme.css` and the docs CSS, read-only.
- Define "has its own spacing ladder" precisely, from the project's theme: for example, three or more `--spacing-*` tokens with distinct small lengths, or `--spacing: initial` or `--spacing-*: initial`. Explain the rule in `docs/layers/3-decisions-spacing.md`. Layout tokens such as `--spacing-rail-w: 220px` or `--spacing-content-max: 56rem` are not a ladder.
- Messages follow `src/messages.ts` and the existing tone.

**Done when:**
- An e2e fixture shows both cases: a default-Tailwind project where `gap-3` is on the scale and `gap-[13px]` gets `gap-3` and `gap-3.5` as nearest; and a project with its own ladder where today's results are unchanged.
- `bench/metalui/` MetalUI measurements don't change. Run whatever MetalUI benchmark or measure script exists, read-only against MetalUI, and report before and after.
- AlgoRecall's spacing findings drop accordingly. Report before and after counts.

## 2. Reading an element answers fast

**Observed on AlgoRecall** (3,527 files) through the overlay's own HTTP calls: `site` plus `edits` for one element takes **800–900 ms** warm, and `classes` about 150 ms. Health shows `localViews: 0`. The overlay waits for these before it shows a pinned reading, so opening takes about a second. The target is **under 100 ms warm** for `site` plus `edits` on a file Plumb has already judged, and under 300 ms cold for one file.

- Profile first. Find where the 850 ms goes in `src/session/engine.ts` (`site`, `edits`), the coordinator and the worker: re-judging the whole file, re-running provenance, re-reading, or serialising large results.
- Then cache per file and revision, or whatever the profile shows is right, so repeated reads of one file, or of several elements in it, are cheap. Invalidate exactly when the file or its dependencies change; correctness first. Keep the health, busy and deadline behaviour and response bodies identical.
- Report the before and after timings, measured the same way: real HTTP against a session on AlgoRecall, read-only.

## Checks

- `npm run build` and `npm run typecheck`.
- The new or changed e2e files for part 1, plus `e2e/decisions-spacing.test.mjs`, `e2e/families.test.mjs`, `e2e/session-burst.test.mjs` and `e2e/serve.test.mjs`.
- Write the result to `docs/briefs/reading-fast-and-right.result.md`: what changed, the numbers, and the checks you ran.

## Limits

- Only modify files inside `/Users/vijaysingh/unlocalhosted/plumb`. Never write inside `metalui`, `kamui`, `craftingattention` or `algorecall`.
- Other jobs are editing `bench/apps/verify.mjs`, `bench/apps/frozen*.mjs`, `src/adoption/`, `e2e/setup.test.mjs`, `overlay/` and `README.md`. Don't touch those.
- No commits, pushes, worktrees or global installs.

## Resume notes (2026-10-12, after the first run stopped on a model capacity error)

- **Part 1 is in the tree, uncommitted:** `src/decisions/spacing.ts`, `src/decisions/index.ts`, `src/rules/provenance.ts`, `e2e/numeric-spacing.test.mjs` and test edits. AlgoRecall's spacing findings went from 38,058 to 1,024 sites. MetalUI is identical before and after: 1,383 findings, `provenance/spacing` 522, `dead/spacing` 616, coverage 2,204/2,932. Keep that.
- **Part 1 regression to fix first:** 17 tests fail in `e2e/computed.test.mjs`, plus `e2e/locate.test.mjs` "review 5". Example: in the computed fixture (`--spacing: 1px`), the finding for `p-[10px]` says "Replace `p-[10px]` with `p-10`", but `/__plumb/edits` returns `edits: []` for that site, so the overlay can't offer the fix. The new numeric-step decisions (`--spacing-10`) likely aren't accepted by the structured edit builder (`structuredEdits` and `decisionNames`). Make numeric steps produce structured edits, keep the existing assertions where they still describe correct behaviour, and update only those that described the old, wrong scale.
- **Part 2 work in progress was set aside**, because it failed its own checks: health blocked 214 ms in `e2e/session-burst.test.mjs`, and the cache test failed a deep-equality check. The patch is at `bench/reading/wip/reading-cache-wip.patch` and its test at `bench/reading/wip/reading-cache.test.mjs`. `src/session/worker.ts` is back at HEAD. Reuse what's sound in it; the health and burst behaviour must stay as it was.
