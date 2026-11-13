# Locate baseline

How well the overlay finds an element's source, per host. Measured 2026-11-05 on 660de50 with `node bench/locate/run.mjs`. Raw rows: `locate-baseline.json`.

## How it was measured

- Each sampled element is located with the overlay's own `window.__plumb.locate(element, { explain: true })` (the call `e2e/locate.test.mjs`, `e2e/owner-locate.test.mjs` and `e2e/stamp.test.mjs` make), one after another in a fresh page per screen.
- **Cold** is each element's first locate in that fresh page (source maps and resolve answers not yet fetched, so early elements pay for the maps later ones reuse). **Warm** is a second pass over the same elements straight after. **First call** is the very first locate of each page.
- **Sample:** every host element under the screen's root when it has at most 150; otherwise the elements whose DOM-path key hashes to 0 modulo ceil(N/150) (FNV-1a), so every host samples the same elements. Real apps: every element under `<body>` outside the overlay, same rule, page `/`.
- **Ground truth:** the stamp the overlay reads on the stamped Vite host (`data-plumb-source` on the host fiber: file, line, column of the JSX opening that made the element). Other hosts are matched to it by screen + DOM path (`tag:index/…` from the screen root), and the tag must agree. It is read from the stamp itself, not from locate's answer; locate's answer there only says whether the stamp is the element's own JSX (`host`) or a component's usage forwarded onto it (`usage`).
- **Verdicts** (over judged elements, which sum to 100 %): exact = file+line+column; line-only = same file and line, other column; file-only = same file, other line; wrong-file = another file, split into *ancestor/shared* (a file that holds the JSX of an element above it or of a component that owns it) and *other*; refused = no location.
- Screens source: this tree, 40 screens + kit.jsx, content hash f4699cd7e82c. Run with Chrome 156.0.8078.80, Next 16.4.0, node v25.9.0.

## Showcase screens

40 screen files (plus the shared `kit.jsx`, not a screen) in `overlay/showcase/src/principles/screens`; each rendered alone on its host with default props.

| host | elements | found % | judged | exact % | line-only % | file-only % | wrong-file % (ancestor / other) | refused % | cold p50 / p95 / max ms | warm p50 / p95 / max ms |
|---|---|---|---|---|---|---|---|---|---|---|
| vite-stamped | 4204 | 100 | 3145 | 99.9 | 0 | 0.1 | 0 (0 / 0) | 0 | 1.9 / 4 / 182.3 | 1.8 / 3 / 7 |
| vite-unstamped | 4204 | 100 | 3145 | 99.9 | 0 | 0.1 | 0 (0 / 0) | 0 | 3.1 / 5.6 / 122.6 | 2.8 / 4.3 / 23.1 |
| next-webpack | 4167 | 78.5 | 3108 | 79.2 | 0 | 0 | 0 (0 / 0) | 20.8 | 11.8 / 22 / 1529.2 | 11.2 / 21.4 / 175 |
| next-turbopack | 4204 | 92.2 | 3145 | 92.8 | 0 | 0.1 | 0 (0 / 0) | 7.1 | 16.5 / 31.4 / 476.4 | 15.3 / 28 / 585.4 |

First locate of each page (ms), and what answered:

| host | first call p50 / p95 / max | answered by |
|---|---|---|
| vite-stamped | 4.6 / 6.3 / 65.5 | stamp 3145, owner-stack 1058 |
| vite-unstamped | 15.9 / 18.8 / 68.9 | owner-stack 4203 |
| next-webpack | 393 / 591 / 1529.2 | owner-stack 3270 |
| next-turbopack | 74 / 238.8 / 475.6 | owner-stack 3878 |

Elements whose stamp is a component usage (a library drew the host; the right answer is the usage site) are judged apart: vite-stamped 0/0, vite-unstamped 0/0, next-webpack 0/0, next-turbopack 0/0 matched.

### Refusals by reason / step

**vite-stamped**: resolve-refusal ×1

**vite-unstamped**: resolve-refusal ×1

**next-webpack**: no-fiber ×897

**next-turbopack**: map / position-not-a-call ×199; runtime-only-frames / no-project-frame ×126; resolve-refusal ×1

### Per screen

found % / exact % / wrong-file % / cold p95 ms, per host (judged elements only for the last two percentages).

| screen | elements | vite-stamped | vite-unstamped | next-webpack | next-turbopack |
|---|---|---|---|---|---|
| 01 quarry-client | 130 | 100 / 100 / 0 / 2.6 | 100 / 100 / 0 / 15.6 | 100 / 100 / 0 / 22.4 | 100 / 100 / 0 / 35.1 |
| 02 quarry-invoice | 87 | 100 / 100 / 0 / 2.3 | 100 / 100 / 0 / 5.6 | 100 / 100 / 0 / 24.9 | 100 / 100 / 0 / 28 |
| 03 easel-board | 114 | 100 / 100 / 0 / 4.7 | 100 / 100 / 0 / 4.1 | 100 / 100 / 0 / 35.1 | 100 / 100 / 0 / 27.5 |
| 04 satchel-activity | 111 | 100 / 100 / 0 / 3 | 100 / 100 / 0 / 3.8 | 100 / 100 / 0 / 29.6 | 100 / 100 / 0 / 27.3 |
| 05 kite-chat | 146 | 100 / 100 / 0 / 14.7 | 100 / 100 / 0 / 3.8 | 100 / 100 / 0 / 24.4 | 100 / 100 / 0 / 22.4 |
| 06 stride-today | 82 | 100 / 100 / 0 / 3.6 | 100 / 100 / 0 / 4.1 | 100 / 100 / 0 / 22.6 | 100 / 100 / 0 / 37.5 |
| 08 sonder-recent | 78 | 100 / 100 / 0 / 2.8 | 100 / 100 / 0 / 5 | 100 / 100 / 0 / 23.9 | 100 / 100 / 0 / 32.9 |
| 15 burrow-issues | 126 | 100 / 100 / 0 / 3.5 | 100 / 100 / 0 / 4.5 | 100 / 100 / 0 / 22.5 | 0 / 0 / 0 / 0.4 |
| 16 quarry-timer | 113 | 100 / 100 / 0 / 2.1 | 100 / 100 / 0 / 4.5 | 100 / 100 / 0 / 21.3 | 100 / 100 / 0 / 29.7 |
| 18 dispatch-front | 126 | 100 / 100 / 0 / 2.3 | 100 / 100 / 0 / 3.5 | 100 / 100 / 0 / 21.9 | 100 / 100 / 0 / 27.2 |
| 20 cadence-board | 88 | 100 / 100 / 0 / 2 | 100 / 100 / 0 / 5.1 | 100 / 100 / 0 / 34 | 100 / 100 / 0 / 33.9 |
| 21 larder-recipe | 120 | 100 / 100 / 0 / 2.7 | 100 / 100 / 0 / 3.9 | 100 / 100 / 0 / 24.4 | 100 / 100 / 0 / 28.8 |
| 23 lumen-share | 112 | 100 / 100 / 0 / 4.4 | 100 / 100 / 0 / 3.3 | 100 / 100 / 0 / 21.1 | 100 / 100 / 0 / 21.1 |
| 25 inkwell-feature | 52 | 100 / 100 / 0 / 2.1 | 100 / 100 / 0 / 3.6 | 100 / 100 / 0 / 21.7 | 100 / 100 / 0 / 26.1 |
| 36 thread-channels | 74 | 100 / 100 / 0 / 2.5 | 100 / 100 / 0 / 5.4 | 100 / 100 / 0 / 22.5 | 100 / 100 / 0 / 30.9 |
| 37 margin-readers | 122 | 100 / 100 / 0 / 2.3 | 100 / 100 / 0 / 4.2 | 0 / 0 / 0 / 0.1 | 100 / 100 / 0 / 29.1 |
| 38 daybook-agenda | 86 | 100 / 100 / 0 / 2.4 | 100 / 100 / 0 / 4.2 | 100 / 100 / 0 / 20.4 | 100 / 100 / 0 / 27.9 |
| 39 tack-glaze | 105 | 100 / 100 / 0 / 2.7 | 100 / 100 / 0 / 3.9 | 100 / 100 / 0 / 20.8 | 100 / 100 / 0 / 24 |
| 40 widget-gallery | 80 | 100 / 100 / 0 / 2.3 | 100 / 100 / 0 / 3.9 | 0 / 0 / 0 / 0 | 100 / 100 / 0 / 27.6 |
| 42 tandem-tabs | 117 | 100 / 100 / 0 / 2.5 | 100 / 100 / 0 / 4.7 | 100 / 100 / 0 / 22 | 0 / 0 / 0 / 13.7 |
| 45 longread | 130 | 100 / 100 / 0 / 2.8 | 100 / 100 / 0 / 4.8 | 100 / 100 / 0 / 18.6 | 100 / 100 / 0 / 24.9 |
| 46 boardingpass | 75 | 100 / 100 / 0 / 2.2 | 100 / 100 / 0 / 5 | 0 / 0 / 0 / 0 | 100 / 100 / 0 / 40.5 |
| 50 nonotes | 113 | 100 / 100 / 0 / 2.3 | 100 / 100 / 0 / 4.4 | 100 / 100 / 0 / 21.8 | 91.2 / 91.2 / 0 / 28.7 |
| 51 deletedialog | 113 | 100 / 100 / 0 / 3.3 | 100 / 100 / 0 / 4.8 | 0 / 0 / 0 / 0 | 100 / 100 / 0 / 28.6 |
| 55 forecast | 91 | 100 / 100 / 0 / 2.3 | 100 / 100 / 0 / 5.3 | 100 / 100 / 0 / 21.2 | 100 / 100 / 0 / 33.6 |
| 56 destination | 109 | 100 / 100 / 0 / 2.3 | 100 / 100 / 0 / 4.3 | 100 / 100 / 0 / 20.8 | 100 / 100 / 0 / 31.3 |
| 57 relay-inbox | 118 | 100 / 100 / 0 / 2.4 | 100 / 100 / 0 / 5.4 | 100 / 100 / 0 / 26.4 | 100 / 100 / 0 / 33.1 |
| 59 plate-layers | 125 | 100 / 100 / 0 / 6.3 | 100 / 100 / 0 / 5.9 | 0 / 0 / 0 / 0 | 100 / 100 / 0 / 39.5 |
| 60 folio-editor | 110 | 100 / 100 / 0 / 7.2 | 100 / 100 / 0 / 9.1 | 100 / 100 / 0 / 17.6 | 38.2 / 93.9 / 0 / 52.5 |
| 61 stowe-drive | 143 | 99.3 / 100 / 0 / 4.1 | 99.3 / 100 / 0 / 4.5 | 0 / 0 / 0 / 0.1 | 99.3 / 100 / 0 / 34.3 |
| 63 commonplace-page | 118 | 100 / 100 / 0 / 2.5 | 100 / 100 / 0 / 4.2 | 100 / 100 / 0 / 19.7 | 100 / 100 / 0 / 25 |
| 64 negative-album | 107 | 100 / 100 / 0 / 4.8 | 100 / 100 / 0 / 4.6 | 100 / 100 / 0 / 21.5 | 100 / 100 / 0 / 39.7 |
| 65 wayfare-sheet | 97 | 100 / 100 / 0 / 2.6 | 100 / 100 / 0 / 35.3 | 100 / 100 / 0 / 19.2 | 95.9 / 95.9 / 0 / 26.7 |
| 66 tally-feed | 114 | 100 / 100 / 0 / 3.4 | 100 / 100 / 0 / 5.7 | 0 / 0 / 0 / 0 | 100 / 100 / 0 / 29.5 |
| 68 almanac-day | 107 | 100 / 100 / 0 / 2.1 | 100 / 100 / 0 / 4.7 | 100 / 100 / 0 / 23.4 | 100 / 100 / 0 / 34 |
| 73 commons-handbook | 105 | 100 / 100 / 0 / 2.1 | 100 / 100 / 0 / 5.3 | 100 / 100 / 0 / 21.7 | 100 / 100 / 0 / 27.8 |
| 74 plinth-sites | 76 | 100 / 100 / 0 / 1.8 | 100 / 100 / 0 / 6.2 | 100 / 100 / 0 / 33.8 | 100 / 100 / 0 / 25.4 |
| 75 outline-share | 88 | 100 / 100 / 0 / 2.2 | 100 / 100 / 0 / 5.5 | 0 / 0 / 0 / 0.1 | 100 / 100 / 0 / 32.9 |
| 76 seam-files | 122 | 100 / 100 / 0 / 3.2 | 100 / 100 / 0 / 4.4 | 100 / 100 / 0 / 22.3 | 100 / 100 / 0 / 27.1 |
| 77 spool-activity | 74 | 100 / 94.6 / 0 / 4.3 | 100 / 94.6 / 0 / 4.8 | 0 / 0 / 0 / 0.1 | 100 / 94.6 / 0 / 31.6 |

## Real apps (Vite only, read only)

Each app is frozen into a scratch copy (git-visible files including uncommitted edits) and served from there; the originals were fingerprinted before and after: algorecall unchanged, craftingattention unchanged. Page `/`; the unstamped host is judged against the stamped host's stamps, matched by DOM path, so elements that differ between the two loads (async data, animation) are unjudged.

| app | host | elements | found % | judged | exact % | line-only % | file-only % | wrong-file % | refused % | cold p50 / p95 / max ms | warm p50 / p95 / max ms |
|---|---|---|---|---|---|---|---|---|---|---|---|
| craftingattention | vite-stamped | 128 | 51.6 | 65 | 100 | 0 | 0 | 0 | 0 | 6.7 / 230.8 / 668 | 6.4 / 77.1 / 103.2 |
| craftingattention | vite-unstamped | 128 | 51.6 | 65 | 98.5 | 0 | 0 | 1.5 | 0 | 38 / 122.6 / 1264.7 | 33.4 / 90.1 / 101.1 |

**craftingattention vite-stamped** answered by stamp 65, owner-stack 1; refusals: resolve-refusal ×62

**craftingattention vite-unstamped** answered by owner-stack 66; refusals: resolve-refusal ×62

## The 10 worst misses

Wrong answers first (wrong file, then wrong line, then wrong column), then refusals; across the hosts that have a ground truth to differ from.

| # | host | screen | element (DOM path) | expected | got | via | reason / step |
|---|---|---|---|---|---|---|---|
| 1 | vite-unstamped | craftingattention | `span` `div:0/div:1/div:0/header:0/div:0/button:0/span:0/span:0` | src/components/ui/Wordmark.tsx:41:5 | src/components/home/HomeLogoToggle.tsx:13:54 | owner-stack | wrong-file-ancestor |
| 2 | next-turbopack | 77 | `li` `div:0/article:0/ul:1/li:0` | src/principles/screens/77-spool-activity.jsx:144:15 | src/principles/screens/77-spool-activity.jsx:147:15 | owner-stack | file-only |
| 3 | next-turbopack | 77 | `li` `div:0/article:0/ul:1/li:1` | src/principles/screens/77-spool-activity.jsx:144:15 | src/principles/screens/77-spool-activity.jsx:147:15 | owner-stack | file-only |
| 4 | next-turbopack | 77 | `li` `div:0/article:0/ul:1/li:2` | src/principles/screens/77-spool-activity.jsx:144:15 | src/principles/screens/77-spool-activity.jsx:147:15 | owner-stack | file-only |
| 5 | vite-unstamped | 77 | `li` `div:0/article:0/ul:1/li:0` | src/principles/screens/77-spool-activity.jsx:144:15 | src/principles/screens/77-spool-activity.jsx:147:15 | owner-stack | file-only |
| 6 | vite-unstamped | 77 | `li` `div:0/article:0/ul:1/li:1` | src/principles/screens/77-spool-activity.jsx:144:15 | src/principles/screens/77-spool-activity.jsx:147:15 | owner-stack | file-only |
| 7 | vite-unstamped | 77 | `li` `div:0/article:0/ul:1/li:2` | src/principles/screens/77-spool-activity.jsx:144:15 | src/principles/screens/77-spool-activity.jsx:147:15 | owner-stack | file-only |
| 8 | next-turbopack | 15 | `span` `article:0/header:0/span:0` | src/principles/screens/15-burrow-issues.jsx:59:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 9 | next-turbopack | 15 | `span` `article:0/header:0/span:1/span:0` | src/principles/screens/15-burrow-issues.jsx:61:11 | – | – | refused · runtime-only-frames / no-project-frame |
| 10 | next-turbopack | 15 | `span` `article:0/header:0/span:2` | src/principles/screens/15-burrow-issues.jsx:64:9 | – | – | refused · runtime-only-frames / no-project-frame |

## What the ground truth cannot judge

- Elements with no stamp of their own (a library drew them: icon paths, primitives' inner nodes). The stamp-less host answers with the nearest owner's usage site or the owner stack, and nothing says what the right answer is. They count in found % and timing, not in exact %.
- Elements whose stamp is a forwarded component usage: judged apart (usage-match), since the stamp is the usage, not a JSX opening.
- Elements the stamp could not confirm on the stamped host (locate did not answer `stamp` there), and elements whose tag differs at the same DOM path between hosts.
- Elements outside the screen root (portals into `document.body`, menus open only after a click): not sampled.
- A stamp proves which JSX opening created the element, not which one a person would call the cause (for a component the right place can be its definition or its usage); this bench measures only the first.
- The Next hosts import images as objects, not URLs, so a screen's `<img src>` is `[object Object]` there; the DOM is the same, the pictures are not.
- `broken.css` is not loaded on any host (it needs the showcase's font files); `theme.css` is.

## Not covered

- plumber serve: it attaches the overlay to a dev server the user already runs (`serve --overlay --origin <url>`; e2e/served-root.test.mjs drives it over Vite and Next), so it is not a host of its own and would repeat a host measured here. Not run.

## Screens that did not render or measure

| host | screen | why |
|---|---|---|
| algorecall vite-stamped | / | algorecall exited (1): vite.config.ts (1:578) [33m[UNRESOLVED_IMPORT] Warning:[0m Could not resolve '@unlocalhosted/react-plumber/vite' in vite.config.ts    [38;5;246m╭[0m[38;5;246m─[0m[38;5;246m[[0m vite.config.ts:1:579 [38;5;246m][0m    [38;5;246m│[0m  [38;5;246m1 │[0m [38;5;249mc[0m[38;5;249mo[0m[38;5;249mn[0m[38;5;249ms[0m[38;5;249mt[0m[38;5;249m [0m[38;5;249m_[0m[38;5;249m_[0m[38;5;249mv[0m[38;5;249mi[0m[38;5;249mt[0m[38;5;249me[0m[38;5;249m_[0m[38;5;249mi[0m[38;5;249mn[0m[38;5;249mj[0m[38;5;249me[0m[38;5;249mc[0m[38;5;249mt[0m[38;5;249 |
| algorecall vite-unstamped | / | algorecall exited (1): vite.config.ts (1:578) [33m[UNRESOLVED_IMPORT] Warning:[0m Could not resolve '@unlocalhosted/react-plumber/vite' in vite.config.ts    [38;5;246m╭[0m[38;5;246m─[0m[38;5;246m[[0m vite.config.ts:1:579 [38;5;246m][0m    [38;5;246m│[0m  [38;5;246m1 │[0m [38;5;249mc[0m[38;5;249mo[0m[38;5;249mn[0m[38;5;249ms[0m[38;5;249mt[0m[38;5;249m [0m[38;5;249m_[0m[38;5;249m_[0m[38;5;249mv[0m[38;5;249mi[0m[38;5;249mt[0m[38;5;249me[0m[38;5;249m_[0m[38;5;249mi[0m[38;5;249mn[0m[38;5;249mj[0m[38;5;249me[0m[38;5;249mc[0m[38;5;249mt[0m[38;5;249 |

## Seen while measuring

_Nothing recorded._
