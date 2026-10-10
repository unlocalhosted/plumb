# Verification harness: Plumb on four real apps, end to end

Write `bench/apps/verify.mjs` (new file only; touch nothing else). It runs each app's own Vite dev server with Plumb's
plugin AND react-grab loaded together (react-grab as the correctness oracle), drives real Chromium with Playwright, and
writes `bench/apps/verify.<app>.json` plus a combined `docs/verification/overlay-e2e.md`.

Apps (all read-only: never write tracked files inside them; Plumb's cache via PLUMB_CACHE_DIR under /private/tmp):
- metalui: Vite config /Users/vijaysingh/unlocalhosted/metalui/apps/docs/vite.config.ts, Plumb root the repo, config
  /Users/vijaysingh/unlocalhosted/plumb/bench/metalui/overlay.plumb.config.ts, pages /components/button, /foundations/motion, /
- kamui: app /Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui (root = app), pages /
- craftingattention: app /Users/vijaysingh/unlocalhosted/craftingattention/app, pages /
- algorecall: app /Users/vijaysingh/unlocalhosted/algorecall, config /Users/vijaysingh/unlocalhosted/plumb/bench/apps/algorecall.plumb.config.ts, pages /
Reuse the loading pattern of bench/apps/overlay.vite.config.mjs and bench/metalui/react-grab.vite.config.mjs (react-grab
from /Users/vijaysingh/unlocalhosted/algorecall/node_modules/react-grab/dist/index.global.js, head-prepend). Start each
server programmatically (vite createServer from the app's own vite, cwd = app dir), one at a time, on a free port.
Chromium: `chromium.launch({ executablePath: process.env.PLUMB_CHROMIUM })`.

Per app, measure and record:
1. Startup: ms until the page responds (must not wait on Plumb); ms until `window.__plumb.ready()`.
2. Correctness vs react-grab, on a sample of up to 150 visible elements per page (skip overlay's own nodes): for each,
   `window.__plumb.locate(el, { explain: true })` and `window.__REACT_GRAB__.getSource(el)`. Count: both placed and
   Plumb's chain contains react-grab's file (match by path suffix) and component name; Plumb placed but react-grab not;
   react-grab placed but Plumb not (list up to 20 with Plumb's refusal reason and react-grab's answer); disagreements.
   For 20 placed elements, verify the reported line in the source file actually contains a JSX opening tag (`<` at
   that line/column, read from disk) — the exactness check.
3. Reading: for each placed element, `overlay.read(el)`; counts of ready / computed / with marks / with writable edits.
   For "computed here" levels, call GET /__plumb/classes with the element's class list and count attributed /
   unattributed / ambiguous classes.
4. Performance: locate latency p50/p95/max; site+edits latency p50/p95; during a burst of 300 concurrent reads,
   `/__plumb/health` latency (must stay < 100 ms) and the Vite page still serving.
5. Reliability: run the sampling twice; results identical; no page errors; no console errors from Plumb; after an HMR
   touch (append a comment to a temp copy? NO: do not write into the apps — instead call invalidateSourceMaps and re-run
   10 locates) results unchanged; Plumb never returns a location whose server check failed.
6. Interaction (no writes): pin one element with marks, pick a choice, assert the element's computed style changed,
   Before restores it, Undo leaves no style attribute; Alt+ArrowUp/Down steps the chain and the header file changes.
Exit non-zero if any hard criterion fails (startup waits on Plumb, health >= 100 ms under burst, any wrong-line in the
exactness check, Plumb located a file react-grab disagrees with at the same chain level without a server-verified reason,
page errors). Print a compact table. Do not run it yourself if Chromium cannot launch in your sandbox; make it correct by
reading the existing e2e tests' patterns. Do not commit.
