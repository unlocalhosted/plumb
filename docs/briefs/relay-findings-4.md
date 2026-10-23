# Brief: source outside the project root is misattributed and read as "all true" (found by Relay on Next.js)

examples/relay/next is a Next 16 app whose screens live outside its root, in examples/relay/src (the monorepo shape:
an app rendering shared packages). With `next dev` on port 4321 and blueprint mode on, the overlay reads 260
elements and says **"all true in view"** with zero marks, while the same screens on Vite (examples/relay, root
includes src/) show 71 drifts. `window.__plumb.locate(card, { explain: true })` on a board card returns
`{ file: 'app/page.jsx', line: 8, component: 'Shell', via: 'owner-stack' }`: every element is tied to the `<Shell/>`
call, the only owner-stack frame inside the root, and that line has no drift.

Fix, in this order, each with integration/e2e proof (a Next fixture and a Vite fixture whose components live outside
the app root; copy shapes from Relay, don't import from examples/):

1. **Never attribute an element to an ancestor because its own source is outside the analysed root.** When the
   element's authored location is outside the project (or outside `source`), the reading is "not checked" with the
   real file: "Written in ../src/screens/Board.jsx, outside this project's source. Add it to `source` to check it."
   Same for the Alt card, blueprint and the CLI's locate/explain.
2. **"Not checked" is never "true".** Blueprint's dock and title block, the Alt tag and the reader's counts: elements
   that weren't judged are counted as not checked ("212 not checked · outside source"), never as on system; "all true
   in view" only when everything in view was actually judged.
3. **Shared source outside the root.** Let `source` include globs outside the root (e.g. `'../src/**'`), contained to
   the repository/workspace root (git root or the nearest workspace manifest), refusing anything beyond it. Reads,
   edits and Apply must work on those files with the same containment guarantees (including Windows paths).
4. **Readiness:** a requirement `locate.source` that is missing when rendered elements resolve to files outside
   `source`, with a consent diff adding the glob to plumber.config (`source: ['app/**', '../src/**']`), and the
   evidence (an example element's file).

After the fixes, set examples/relay/next/plumber.config.ts `source` accordingly (you may edit that one file) and show,
in the result, Relay on Next in blueprint reporting the same drift count as Vite for the board (use the demo's
`#/board` and the reader's progress). Also measure and report how long blueprint takes to read the board on Next
(no source stamps) vs Vite, and say what dominates; don't optimise in this brief.

Don't modify overlay/src unless the "not checked" display needs a client change; if it does, keep it minimal and say
so (Claude owns the overlay UI and will refine it). Don't modify site/src. Focused tests, then the full suite once:
`PLUMBER_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test`. Atomic commits ending
with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Don't push. Write docs/briefs/relay-findings-4.result.md.
