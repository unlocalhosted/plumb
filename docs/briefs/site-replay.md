# Brief: Plumb's real overlay on the deployed homepage, replayed

Owner request, 2026-10-13. The homepage (`site/`, Vite + React + Tailwind v4, run with `npx vite --config site/vite.config.mjs`, port 4327) opens with a drifted card (`site/src/hero/DriftedCard.jsx`) and asks the visitor to fix it with Plumb's real overlay: hold Alt and click, or use the dock. In development the overlay talks to the dev server. On the deployed (static) site there is no server, so the overlay must be answered from a recording, and its writes must apply to the live page only.

## What to build

1. **Stamped production build of the site.** `npx vite build --config site/vite.config.mjs` must produce a static site where:
   - JSX elements carry the same `data-plumb-source` stamps the dev server adds (see `src/hosts/source-stamping.ts`, `src/hosts/vite.ts`). This is for the site only. Do not change the default that production builds of user apps carry nothing; add an explicit, documented option such as `plumb({ demo: { replay: '<fixture path>' } })`.
   - The overlay client (`overlay/client.js`, `overlay/src/*.js`) is bundled and mounted, exactly as in dev.

2. **Recorder.** A script, `site/scripts/record-replay.mjs`, that starts the real dev server for `site/` and records every overlay request the hero needs: `health`, `resolve`, `site`, `edits` and `classes` for every stamped element in `DriftedCard.jsx` and its owners. Use `window.__plumb` in Playwright (already a devDependency), or call the endpoints directly. Record answers in two kinds of state:
   - as authored (all six drifts);
   - after each `apply`, meaning the source with that edit applied. Never edit the real file: copy `site/` to a temp dir, or apply and then restore. Fixes happen in any order, so record per-element answers keyed by the element's current class string, or record each drift's before/after independently, as long as replay can answer every order.
   Write the fixture to `site/src/hero/replay.json`.

3. **Replay shim.** `site/src/hero/replay.js`, loaded only in the production build, before the overlay client. It intercepts the overlay's `fetch` calls to `/__plumb/*` (see `overlay/src/api.js`: `request(method, params)` is a GET with query params, and `post(method, body)` is a POST; writes go through `post('apply', { file, hash, edits })` in `overlay/src/widget.js:956`). It answers from the fixture. On `apply`:
   - apply the edit to the live DOM. Find the element(s) whose `data-plumb-source` matches the edited site and replace the old class token with the new one in `className`. This is the contract the hero relies on: it counts the six `bad` classes in `HERO_DRIFTS` still present in the DOM;
   - return the same response shape the real server returns;
   - from then on, answer that element as fixed, so the reading turns green and the overlay behaves as it does after a real dev-server reload;
   - dispatch `window.dispatchEvent(new CustomEvent('plumb:demo-applied', { detail: { file, line, before, after } }))`.
   Anything not in the fixture answers like the real server does for an untracked element, so the overlay explains it, never crashes.

4. **Guard in development.** In dev, a Write on `DriftedCard.jsx` must not change the file either: the demo would be gone after one try. Use the same shim in dev for that one file, behind a flag the site's vite config sets.

5. **Tailwind classes.** The fixed classes (`rounded-lg p-6 gap-3 text-base bg-primary px-3`) must exist in the built CSS. Add `@source inline(...)` in `site/src/styles.css` if they aren't already generated.

## Rules (the owner's)

- No unit tests. Write one e2e test under `e2e/` that builds the site, serves `dist` statically, opens it in Playwright, uses the overlay to fix all six drifts, and asserts the six `bad` classes are gone from the DOM, the source file is unchanged, and the overlay shows each element on the scale.
- Don't touch the site's UI files beyond what wiring requires: `site/src/hero/*.jsx` and the sheets are owned by the UI work. Wiring is a script tag, a vite config option, or an import in `site/src/entry.jsx`.
- Write a short `site/REPLAY.md`: how to re-record after changing the hero, and what the shim does.
- Report what you built, how you verified it, and anything you could not make exact.
