# Overlay layer 1: structured edits and a safe apply

The browser overlay has a "Sync to system" button. It previews each finding's chosen token on the live element, then
"Write N edits" puts the same fixes into source. This layer is the engine half only: no browser code, no Vite, no Next.

## What to build

1. **Structured edits.** Today `src/surfaces/agent.ts` `edit()` returns a sentence ("replace `py-[10px]` with `py-mu-space-8`").
   Move the logic into one function that returns data, and have `formatAgent` render its sentence from that data (text output
   must stay byte-identical; the existing tests prove it):
   `{ id, findingKey, rule, family, file, line, column, start, end, from, to, token }` where `start`/`end` are UTF-16 offsets
   of `from` in the file at the current revision, and `id` is stable for the same site + token (hash of file, offsets, from, to).
   One edit per (site, choice) where an exact edit exists. A site with no close token has no edits (it stays NEEDS-DECISION).
2. **Session methods** (in `src/session/index.ts` + worker):
   - `edits(file, line, column?)` returns `{ revision, file, hash, edits[] }` for the element site (same lookup as `site()`),
     where `hash` is the file's content hash at that revision.
   - `apply({ file, hash, edits: [{ id }] })` re-derives edits from the current source, refuses with a UsageError when the hash no
     longer matches ("The file changed since the overlay read it. Read it again.") or when an id is unknown, refuses two edits
     on overlapping ranges, writes the file once (edits applied from the end backwards), waits for the session to see the
     change, and returns `{ revision, file, hash, applied: [ids], remaining: findings at that site }`.
   - It must only ever write the source file named in the request, which must be inside the root, a tracked source file, and
     never `plumb.config.*`, `.plumb/**`, or any stylesheet that defines the theme. Never touch the ledger.
3. **Transports.** Add `edits` (GET) and `apply` (POST, JSON body, same 1 MiB limit) to `dispatch`, the HTTP server and stdio.
   Export a framework-free request handler, `createHandler(session, { token? })`, returning
   `(request: IncomingMessage, response: ServerResponse, next?: () => void) => void` that serves these routes under a prefix
   (default `/__plumb/`): `report`, `site`, `edits`, `apply`, `decisions`, `health`. `serve()` should use it, so a later Vite
   plugin and Next route can mount the same thing. When `token` is omitted the handler requires a same-origin request
   (reject when `Origin` is present and its host differs from `Host`, and reject non-loopback remote addresses).
4. Export the new types and `createHandler` from `src/index.ts`.

## Tests (integration only, `e2e/edits.test.mjs`, in the style of `e2e/serve.test.mjs`)

Through the real Session and through `plumb serve` HTTP, on a copied fixture:
- `edits` for a site with an off-scale class returns an exact edit; applying it rewrites the source, and `site` then reports
  fewer findings; running `plumb check --json` cold agrees.
- a stale `hash` is refused and the file is unchanged; an unknown id is refused; overlapping edits are refused.
- apply never changes `.plumb/ledger.jsonl`, the config or the theme stylesheet (compare bytes).
- a request with a foreign `Origin` to the token-less handler is refused.

No unit tests. Run `npm test` and `npm run typecheck`; both must pass. Do not commit. Write a short summary of what changed to
`docs/briefs/overlay-1-edits.result.md`.
