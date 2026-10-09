# Review brief: overlay layer 1 engine (edits + apply + createHandler)

You are Astra, reviewing an uncommitted change. Read `docs/briefs/overlay-1-edits.md` (the brief) and the working-tree diff
(`git diff` plus untracked `src/surfaces/edits.ts`, `e2e/edits.test.mjs`). Judge three things, by default, not as options:

1. **Correct.** Edits land on exactly the authored text; ids are stable; stale/unknown/overlapping refusals are airtight;
   apply can only write the named tracked source (no config, `.plumb/**`, theme stylesheet, symlink, hard link, traversal);
   the session sees its own write (no race with the watcher, no double rebuild, revision/hash consistent); the token-less
   handler cannot be driven cross-origin (DNS rebinding via Host, missing Origin on POST, `Sec-Fetch-Site`, CORS preflight).
   Multi-byte text, CRLF, JSX attribute variants (`className={"..."}`, `cn(...)`, template literals), CSS files.
2. **Performant.** No full rescans or worker restarts on apply when an incremental refresh works; `edits` reuses the warm
   report; no O(files) work per request; apply of N edits writes once.
3. **Extendable.** The edit model should take new families/rules and new syntaxes (CSS declarations, inline styles, `@apply`)
   without changing transports; `createHandler` must be mountable by Vite middleware and a Next App Router route (Web
   Request/Response) without duplicating dispatch. Name the seams that are missing.

Do not edit source. Write findings to `docs/briefs/overlay-1-review.result.md`, ranked most severe first, each with: file:line,
the concrete failing input or scenario, and the smallest fix. Verify each claim by reading code or running a quick script or
the existing tests (`npm run build && node --test e2e/edits.test.mjs`); mark unverified ones PLAUSIBLE. End with a verdict:
ship / ship after fixes / rework.
