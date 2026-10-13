# Brief: finish the site replay (continuation of site-replay.md)

The previous run of `docs/briefs/site-replay.md` stopped partway (model capacity). Read that brief first; it still stands. What exists now: changes to `src/hosts/vite.ts` (a `demo` option, a `virtual:plumb-demo` entry), `site/vite.config.mjs` (sets `demo: { replay: 'src/hero/replay.js', guard: true }`), `site/scripts/record-replay.mjs`, `site/src/hero/replay.js` and `site/src/hero/replay.json`. No result report, no e2e test, no `site/REPLAY.md`.

Finish it:

1. **The dev server is broken now.** Loading `http://localhost:4327/` shows Vite's error: `Failed to resolve import "/__plumb/client.js" from "\0plumb:demo"`. The demo entry's `await import('/__plumb/client.js')` goes through Vite's import analysis. Fix it so dev loads cleanly, with the overlay mounted and the guard active. Verify by loading the page in Playwright: no error overlay, `window.__plumb` defined, `document.querySelector('plumb-overlay')` present. `npm run build` first if the site imports from `dist/`; the dev server on 4327 is run by the owner's app, so start your own on another port to test.
2. **The hero changed after you recorded.** `site/src/hero/DriftedCard.jsx` now has six different drifts (see the comment at its top and `HERO_DRIFTS`). Re-record `replay.json` against the current file, in every fix order the brief requires.
3. Do steps 3–5 of the original brief if any are unfinished, and write the e2e test it asks for: build, serve `dist` statically, fix all six drifts through the overlay, assert the six `bad` classes are gone from the DOM, `DriftedCard.jsx` is unchanged on disk, and the overlay reads each element as on the scale.
4. Write `site/REPLAY.md` and the report `docs/briefs/site-replay.result.md`: what you built, how you verified it (paste the command output), and what is not exact.

Don't edit `overlay/src/widget.js` or `site/src/card/*`: the reading card is being redesigned in parallel. Same owner rules as before: e2e only, no unit tests.
