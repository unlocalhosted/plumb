# Review brief: overlay layer 2 host adapters (Vite, Next, serve --overlay, install --overlay)

You are Astra, reviewing an uncommitted change. Read `docs/briefs/overlay-2-hosts.md` (the brief) and the working-tree diff
(`git diff` plus untracked `src/hosts/*`, `overlay/client.js`, `e2e/hosts.test.mjs`). Judge three things, by default, not as options:

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

Do not edit source. Write findings to `docs/briefs/overlay-2-review.result.md`, ranked most severe first, each with: file:line,
the concrete failing input or scenario, and the smallest fix. Verify each claim by reading code or running a quick script or
the existing tests (`npm run build && node --test e2e/hosts.test.mjs`); mark unverified ones PLAUSIBLE. End with a verdict:
ship / ship after fixes / rework.

Layer-specific checks: the Next token never reaches a cross-origin reader (cacheable responses, RSC payload, static export,
`client.js` itself); production and `next build`/`vite build` carry zero Plumb code or Session; one Session per dev process
across HMR, Vite restarts and Next route recompiles (no leaked workers or watchers); CORS for `serve --overlay` cannot be
widened (null origin, credentials, wildcard); the `%5F_plumb` folder really maps to `/__plumb/` in current Next; Vite
middleware mode and custom `base`; Windows paths in install output.
