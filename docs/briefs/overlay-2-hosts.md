# Overlay layer 2: host adapters (Vite, Next.js, script tag)

Layer 1 (commit a274654) added `createHandler` (Node middleware), `createWebHandler` (Web Request/Response) over one core, and the `edits` / `apply` Session methods. Reuse them; never copy dispatch or auth. This layer mounts them in a
host's dev server and loads the overlay client into the page in development only. No overlay UI here: the client file is
`overlay/dist/client.js`, which a later layer builds; for now ship a stub at `overlay/client.js` that only does
`console.debug('[plumb] overlay connected', await (await fetch(base + 'health')).json())` so the wiring is testable.

## Subpath exports (package.json "exports"), each in its own file so one import ships one adapter

1. `@unlocalhosted/plumb/vite` → `plumb(options?: SessionOptions): Plugin`.
   - `apply: 'serve'` only. On `configureServer`, create one Session for `server.config.root` (no extra port, no extra
     process), mount `createHandler(session)` as middleware under `/__plumb/`, close the session on server close.
   - Serve the client at `/__plumb/client.js`; inject `<script type="module" src="/__plumb/client.js"></script>` with
     `transformIndexHtml`. Never in `vite build`.
   - Vite is a peer dependency, optional; never imported at runtime (types only).
2. `@unlocalhosted/plumb/next` → two things:
   - `createPlumbRoute(options?)` returning `{ GET, POST }` App Router handlers for `app/__plumb/[...path]/route.ts`. They
     adapt Web `Request`/`Response` to the same dispatch as `createHandler`. One Session per process, kept on `globalThis`
     so hot reloads reuse it. Return 404 when `process.env.NODE_ENV === 'production'`. Export `runtime = 'nodejs'`.
   - `PlumbOverlay` (a tiny React server component, no client state) that renders the module script tag pointing at
     `/__plumb/client.js` in development and nothing in production. It renders the process token into a `data-plumb-token`
     attribute on that tag (server-rendered, so a cross-origin page cannot read it); the client sends it as `x-plumb-token`. React is an optional peer dependency.
3. Generic hosts: `plumb serve` (exists) gains `--overlay`, which also serves `client.js` and the handler routes with CORS
   limited to the origin given by `--origin <url>`; `plumb install --overlay` prints the one script tag to paste.
4. `plumb install --overlay` detects the host from package.json (vite, next, otherwise generic) and prints the exact lines
   to add for that host. It must not edit the user's files.

## Tests (integration, `e2e/hosts.test.mjs`)

- Vite: start a real Vite dev server programmatically on a temp copy of a fixture (add `vite` as a devDependency),
  fetch `/` and assert the script tag is injected; fetch `/__plumb/health` and `/__plumb/site?...` and get JSON; `edits`
  then `apply` through the middleware changes the source; a foreign `Origin` is refused; `vite build` output has no
  `__plumb` reference.
- Next: call the exported `GET`/`POST` with real `Request` objects against a fixture root (no Next install needed);
  production env returns 404; a request without the token, or with a wrong one, is refused; `PlumbOverlay` rendered with `react-dom/server` carries the same token the route accepts.
- `plumb serve --overlay --origin http://localhost:5555`: CORS allows that origin only.

No unit tests. `npm test` and `npm run typecheck` must pass. Do not commit. Summary to `docs/briefs/overlay-2-hosts.result.md`.
