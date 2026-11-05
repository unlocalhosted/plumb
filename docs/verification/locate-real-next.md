# Locate on real Next apps

Measured 2026-11-05 on ba6c140 with `node bench/locate/run.mjs --corpus nextapps --apps shadcn --cap 250 --merge`. Chrome 156.0.8078.4, node v25.9.0, apps run on their own pinned Next versions. Raw rows: `locate-real-next.json`.

## How it was measured

- Three real open-source Next apps, cloned shallow at pinned commits into `bench/locate/.corpus` (not committed), installed with pnpm (`--ignore-scripts` unless noted below). Each app is copied into a scratch folder and run with `next dev` on port 0.
- Each app runs on its own bundler and the other one. On each bundler there are two runs of the same routes: **stamped** = `withPlumb(config, { stamp: true })` (the new loader writes `data-plumb-source` on every JSX opening of the app's own `.jsx`/`.tsx`), and **plain** = `withPlumb(config, { stamp: false })`, which is what a user gets today (owner-stack reconstruction).
- **Ground truth** is the stamp the stamped run writes on the element (`data-plumb-source`, read in the page). It says which JSX opening made the element. Plain-run elements are matched to stamped-run elements by route + DOM path from `<body>` + tag. Elements with no counterpart are counted as **unmatched** and left out of the plain numbers; elements whose stamp is a forwarded component usage are judged apart, and elements with no stamp (a library drew them) are in found % and timing but not in exact %.
- **stamped (proposed)** is the stamped run's own locate answers: what users would get if stamping were the default. Its exact % is against its own stamps, so it shows only whether locate reads them.
- Sample: every element under `<body>` outside the overlay when a page has at most 250; otherwise those whose DOM-path key hashes to 0 modulo ceil(N/250). Each is located with the overlay's own `window.__plumb.locate(el, { explain: true })`. Cold = first locate of the element in a fresh page; warm = second pass; first call = the first locate of each page.
- **Server vs client**: from the stamped run, by the element's React owner: an owner that is a fiber is a client component; an owner that is not a fiber (React's server component debug info) is a server component; no owner is `unknown`. Plain-run elements take the kind of their matched stamped element.

## Edits to the apps (copies only; the clones are untouched)

**shadcn/ui (apps/v4)** @ 8a35366, Next 16.4.2, own bundler turbopack. Needs generated styles/. `pnpm registry:build --style all` ends in `bun run ./scripts/build-registry.mts`, which fails under the installed bun 1.1.30 (SyntaxError: Export named EnvHttpProxyAgent not found in module undici). The packages it builds first (@shadcn/react, @shadcn/helpers, shadcn) built; the script itself was then run with `pnpm exec tsx ./scripts/build-registry.mts --style all` under node 25 with `globalThis.React` preloaded (without it: ReferenceError: React is not defined at registry/styles.tsx:7). Installed with pnpm 11.14 (cached), which ran the pinned pnpm 10.33.4: `install --frozen-lockfile --ignore-scripts --filter v4...`. `fumadocs-mdx` (the app postinstall) was run by hand. The bench runs `next dev` directly (the dev script also starts icons:dev).

- apps/v4/next.config.mjs: renamed to next.config.orig.mjs; a bench wrapper imports it, calls withPlumb(config, { stamp }) and sets turbopack.root
- apps/v4/app/layout.tsx: one import line added at the top and <PlumbOverlay /> before </body>
- app/%5F_plumb/[...path]/route.plumb.ts: added (serves /__plumb)

**magicui** @ 37ce829, Next 15.5.28, own bundler webpack. next.config sets experimental.inlineCss: true.

- apps/www/next.config.mjs: renamed to next.config.orig.mjs; a bench wrapper imports it, calls withPlumb(config, { stamp }) and sets turbopack.root
- apps/www/app/layout.tsx: one import line added at the top and <PlumbOverlay /> before </body>
- app/%5F_plumb/[...path]/route.plumb.ts: added (serves /__plumb)

**tailwindcss.com** @ 7f92c22, Next 16.2.6, own bundler turbopack. Licence is education-only: no code from this app is committed, only numbers. /blog is not measured: the unmodified app's own dev server runs out of heap there (6 GB, in JSON.parse), with or without Plumber; /partners replaces it.

- next.config.ts: renamed to next.config.orig.ts; a bench wrapper imports it, calls withPlumb(config, { stamp }) and sets turbopack.root
- src/app/layout.tsx: one import line added at the top and <PlumbOverlay /> before </body>
- src/app/%5F_plumb/[...path]/route.plumb.ts: added (serves /__plumb)

## Results

Plain = today. Stamped = proposed default. Cells: elements matched and judged, found %, exact %, wrong-file %. Timings are ms, p50 / p95.

| app | bundler | run | elements | found % | exact % | line-only % | wrong-file % (ancestor / other) | refused % | first call | warm | answered via stamp % |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tailwindcss | turbopack | plain (today) | 1081 | 40.5 | 38.7 | 0 | 0 (0 / 0) | 61.3 | 97.5 / 478.1 | 10.7 / 55.7 | 0 |
| tailwindcss | turbopack | stamped, DOM tags only (truth; full stamping did not render) | 1086 | 97.5 | 100 | 0 | 0 (0 / 0) | 0 | 26.2 / 54.4 | 9.2 / 20.5 | 86.9 |
| tailwindcss | webpack | plain (today) | 1083 | 15.1 | 17.5 | 0 | 0 (0 / 0) | 82.5 | 407.9 / 1212.7 | 0.3 / 16.8 | 0 |
| tailwindcss | webpack | stamped, DOM tags only (truth; full stamping did not render) | 1087 | 88.8 | 98.8 | 0 | 0 (0 / 0) | 0 | 15 / 20.3 | 7 / 11.9 | 86.9 |
| magicui | turbopack | plain (today) | 1076 | 0 | 0 | 0 | 0 (0 / 0) | 100 | 2264 / 3744 | 274.1 / 540.8 | 0 |
| magicui | turbopack | stamped (proposed) | 1076 | 20.2 | 100 | 0 | 0 (0 / 0) | 0 | 2090.4 / 2554.7 | 509.4 / 749.6 | 18.5 |
| magicui | webpack | plain (today) | 846 | 0 | 0 | 0 | 0 (0 / 0) | 100 | 892.4 / 2602.4 | 0.6 / 261.9 | 0 |
| magicui | webpack | stamped (proposed) | 1076 | 18.5 | 100 | 0 | 0 (0 / 0) | 0 | 1211 / 1957.3 | 231.6 / 468.4 | 18.5 |
| shadcn | turbopack | plain (today) | 731 | 13.7 | 23.3 | 0 | 1.7 (0 / 1.7) | 75 | 165.5 / 343.6 | 10.4 / 104.3 | 0 |
| shadcn | turbopack | stamped (proposed) | 947 | 23.1 | 100 | 0 | 0 (0 / 0) | 0 | 130 / 1248 | 28.1 / 111.7 | 12.5 |

### Full stamping (every JSX opening, components included): did the app render?

- **shadcn/ui (apps/v4) turbopack**: 4 of 5 routes rendered. Failures: `/charts/area` page.goto: Timeout 150000ms exceeded. Call log:   - navigating to "http://127.0.0.1:58958/charts/area", waiting until "domcontentloaded" 
- **magicui webpack**: 5 of 5 routes rendered
- **magicui turbopack**: 5 of 5 routes rendered
- **tailwindcss.com turbopack**: 0 of 3 routes rendered. Failures: `/` HTTP 500: dev server log: ⨯ Error: Passing props on "Fragment"! The current component <Menu /> is rendering a "Fragment". However we need to passthrough the following props:; `/docs/padding` HTTP 500: dev server log: ⨯ Error: Passing props on "Fragment"! The current component <Menu /> is rendering a "Fragment". However we need to passthrough the following props:; `/docs/installation/using-vite` HTTP 500: dev server log: ⨯ Error: Passing props on "Fragment"! The current component <Menu /> is rendering a "Fragment". However we need to passthrough the following props:
- **tailwindcss.com webpack**: 0 of 3 routes rendered. Failures: `/` HTTP 500: dev server log: ⨯ Error: Passing props on "Fragment"! The current component <Menu /> is rendering a "Fragment". However we need to passthrough the following props:; `/docs/padding` HTTP 500: dev server log: ⨯ Error: Passing props on "Fragment"! The current component <Menu /> is rendering a "Fragment". However we need to passthrough the following props:; `/docs/installation/using-vite` HTTP 500: dev server log: ⨯ Error: Passing props on "Fragment"! The current component <Menu /> is rendering a "Fragment". However we need to passthrough the following props:

### Server vs client components

Per kind of component that drew the element: elements, found %, exact %, wrong-file %, and the share answered via `stamp`.

| app | bundler | run | server | client | unknown |
|---|---|---|---|---|---|
| tailwindcss | turbopack | plain | 517: found 0 %, exact 0 %, wrong 0 %, via stamp 0 % | 450: found 97.3 %, exact 100 %, wrong 0 %, via stamp 0 % | 114: found 0 %, exact 0 %, wrong 0 %, via stamp 0 % |
| tailwindcss | turbopack | stamped | 522: found 97.3 %, exact 100 %, wrong 0 %, via stamp 97.3 % | 450: found 97.1 %, exact 100 %, wrong 0 %, via stamp 71.6 % | 114: found 100 %, exact 100 %, wrong 0 %, via stamp 100 % |
| tailwindcss | webpack | plain | 519: found 0 %, exact 0 %, wrong 0 %, via stamp 0 % | 450: found 36.4 %, exact 45.3 %, wrong 0 %, via stamp 0 % | 114: found 0 %, exact 0 %, wrong 0 %, via stamp 0 % |
| tailwindcss | webpack | stamped | 523: found 97.3 %, exact 98 %, wrong 0 %, via stamp 97.3 % | 450: found 76 %, exact 100 %, wrong 0 %, via stamp 71.6 % | 114: found 100 %, exact 100 %, wrong 0 %, via stamp 100 % |
| magicui | turbopack | plain | 566: found 0 %, exact 0 %, wrong 0 %, via stamp 0 % | 391: found 0 %, exact – %, wrong – %, via stamp 0 % | 119: found 0 %, exact – %, wrong – %, via stamp 0 % |
| magicui | turbopack | stamped | 566: found 35.2 %, exact 100 %, wrong 0 %, via stamp 35.2 % | 391: found 4.6 %, exact – %, wrong – %, via stamp 0 % | 119: found 0 %, exact – %, wrong – %, via stamp 0 % |
| magicui | webpack | plain | 412: found 0 %, exact 0 %, wrong 0 %, via stamp 0 % | 318: found 0 %, exact – %, wrong – %, via stamp 0 % | 116: found 0 %, exact – %, wrong – %, via stamp 0 % |
| magicui | webpack | stamped | 566: found 35.2 %, exact 100 %, wrong 0 %, via stamp 35.2 % | 391: found 0 %, exact – %, wrong – %, via stamp 0 % | 119: found 0 %, exact – %, wrong – %, via stamp 0 % |
| shadcn | turbopack | plain | 271: found 0 %, exact 0 %, wrong 0 %, via stamp 0 % | 422: found 23.7 %, exact 87.1 %, wrong 6.5 %, via stamp 0 % | 38: found 0 %, exact – %, wrong – %, via stamp 0 % |
| shadcn | turbopack | stamped | 276: found 33.3 %, exact 100 %, wrong 0 %, via stamp 30.8 % | 430: found 29.5 %, exact 100 %, wrong 0 %, via stamp 7.7 % | 241: found 0 %, exact – %, wrong – %, via stamp 0 % |

### Do server-component stamps reach the DOM and does the overlay read them?

| app | bundler | server elements | with a stamp in the DOM | client elements | with a stamp in the DOM |
|---|---|---|---|---|---|
| tailwindcss | turbopack | 522 | 508 | 450 | 322 |
| tailwindcss | webpack | 523 | 509 | 450 | 322 |
| magicui | turbopack | 566 | 525 | 391 | 371 |
| magicui | webpack | 566 | 525 | 391 | 371 |
| shadcn | turbopack | 276 | 232 | 430 | 340 |

The overlay reads them when locate answers `stamp`: see "via stamp %" per kind in the table above.

### Matching between the two runs

| app | bundler | stamped elements | plain elements | matched | plain unmatched | stamped unmatched | plain judged |
|---|---|---|---|---|---|---|---|
| tailwindcss | turbopack | 1086 | 1089 | 1081 | 8 | 5 | 832 |
| tailwindcss | webpack | 1087 | 1089 | 1083 | 6 | 4 | 834 |
| magicui | turbopack | 1076 | 1076 | 1076 | 0 | 0 | 199 |
| magicui | webpack | 1076 | 846 | 846 | 0 | 230 | 199 |
| shadcn | turbopack | 947 | 732 | 731 | 1 | 216 | 116 |

### Refusals by reason / step

**tailwindcss turbopack plain**: runtime-only-frames / no-project-frame ×636; map / position-not-a-call ×7. Answered by owner-stack 438.

**tailwindcss turbopack stamped**: runtime-only-frames / no-project-frame ×27. Answered by stamp 944, owner-stack 115.

**tailwindcss webpack plain**: runtime-only-frames / no-project-frame ×616; no-fiber ×214; resolve-refusal ×89. Answered by owner-stack 164.

**tailwindcss webpack stamped**: resolve-refusal ×108; runtime-only-frames / no-project-frame ×14. Answered by stamp 945, owner-stack 20.

**magicui turbopack plain**: runtime-only-frames / no-project-frame ×811; resolve-refusal ×265. Answered by –.

**magicui turbopack stamped**: runtime-only-frames / no-project-frame ×539; resolve-refusal ×320. Answered by stamp 199, stamp-usage 18.

**magicui webpack plain**: runtime-only-frames / no-project-frame ×528; resolve-refusal ×295; script-fetch ×23. Answered by –.

**magicui webpack stamped**: runtime-only-frames / no-project-frame ×643; resolve-refusal ×229; script-fetch ×5. Answered by stamp 199.

**shadcn turbopack plain**: runtime-only-frames / no-project-frame ×263; no-fiber ×255; resolve-refusal ×113. Answered by owner-stack 100.

**shadcn turbopack stamped**: runtime-only-frames / no-project-frame ×379; no-fiber ×213; resolve-refusal ×136. Answered by stamp 118, owner-stack 93, stamp-usage 8.

### Per route (elements sampled, stamped / plain)

**tailwindcss turbopack**: `/` 252 / 255; `/docs/padding` 205 / 205; `/docs/installation/using-vite` 236 / 236; `/showcase` 214 / 214; `/partners` 179 / 179

**tailwindcss webpack**: `/` 253 / 255; `/docs/padding` 205 / 205; `/docs/installation/using-vite` 236 / 236; `/showcase` 214 / 214; `/partners` 179 / 179

**magicui turbopack**: `/` 230 / 230; `/docs` 191 / 191; `/docs/components/marquee` 257 / 257; `/blog` 247 / 247; `/showcase` 151 / 151

**magicui webpack**: `/` 230 / 0; `/docs` 191 / 191; `/docs/components/marquee` 257 / 257; `/blog` 247 / 247; `/showcase` 151 / 151

**shadcn turbopack**: `/` 236 / 236; `/examples/dashboard` 240 / 240; `/docs/components/button` 258 / 256; `/blocks` 213 / 0


## The 15 worst misses per app and bundler (plain run)

Wrong answers first (wrong file, then wrong line, then wrong column), then refusals.

### tailwindcss turbopack

| # | route | kind | element (DOM path) | expected | got | via | verdict / reason |
|---|---|---|---|---|---|---|---|
| 1 | `/` | server | `div` `div:1` | src/app/layout.tsx:175:13 | – | – | refused · runtime-only-frames / no-project-frame |
| 2 | `/` | server | `div` `div:1/div:0/div:1/div:1/div:1/div:2` | src/components/grid-container.tsx:30:5 | – | – | refused · runtime-only-frames / no-project-frame |
| 3 | `/` | server | `h2` `div:1/div:0/div:1/div:1/div:1/div:2/h2:0` | src/components/home/partners-section.tsx:22:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 4 | `/` | server | `div` `div:1/div:0/div:1/div:1/div:1/div:5/div:0` | src/components/home/partners-section.tsx:43:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 5 | `/` | server | `div` `div:1/div:0/div:1/div:1/div:1/section:6/div:0` | src/components/home/partners-section.tsx:57:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 6 | `/` | server | `ul` `div:1/div:0/div:1/div:1/div:1/section:6/div:0/ul:1` | src/components/home/partners-section.tsx:64:11 | – | – | refused · runtime-only-frames / no-project-frame |
| 7 | `/` | server | `path` `…div:1/div:1/div:1/section:6/div:0/ul:1/li:0/a:0/svg:0/path:0` | src/app/partners/sponsors.tsx:938:11 | – | – | refused · runtime-only-frames / no-project-frame |
| 8 | `/` | server | `li` `div:1/div:0/div:1/div:1/div:1/section:6/div:0/ul:1/li:5` | src/components/home/partners-section.tsx:66:15 | – | – | refused · runtime-only-frames / no-project-frame |
| 9 | `/` | server | `a` `div:1/div:0/div:1/div:1/div:1/section:6/div:0/ul:1/li:6/a:0` | src/components/home/partners-section.tsx:67:17 | – | – | refused · runtime-only-frames / no-project-frame |
| 10 | `/` | server | `svg` `…/div:0/div:1/div:1/div:1/section:6/div:0/ul:1/li:7/a:0/svg:0` | src/app/partners/sponsors.tsx:493:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 11 | `/` | server | `path` `…div:1/div:1/div:1/section:6/div:0/ul:1/li:7/a:0/svg:0/path:0` | src/app/partners/sponsors.tsx:494:11 | – | – | refused · runtime-only-frames / no-project-frame |
| 12 | `/` | server | `a` `div:1/div:0/div:1/div:1/div:1/section:6/div:0/ul:1/li:9/a:0` | src/components/home/partners-section.tsx:67:17 | – | – | refused · runtime-only-frames / no-project-frame |
| 13 | `/` | server | `svg` `…/div:0/div:1/div:1/div:1/section:6/div:0/ul:1/li:9/a:0/svg:0` | src/app/partners/sponsors.tsx:970:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 14 | `/` | server | `li` `div:1/div:0/div:1/div:1/div:1/section:6/div:0/ul:1/li:13` | src/components/home/partners-section.tsx:66:15 | – | – | refused · runtime-only-frames / no-project-frame |
| 15 | `/` | server | `path` `…iv:1/div:1/div:1/section:6/div:0/ul:1/li:15/a:0/svg:0/path:0` | src/app/partners/sponsors.tsx:599:11 | – | – | refused · runtime-only-frames / no-project-frame |

### tailwindcss webpack

| # | route | kind | element (DOM path) | expected | got | via | verdict / reason |
|---|---|---|---|---|---|---|---|
| 1 | `/` | server | `div` `div:1` | src/app/layout.tsx:175:13 | – | – | refused · runtime-only-frames / no-project-frame |
| 2 | `/` | server | `div` `div:1/div:0/div:1/div:1/div:1/div:2` | src/components/grid-container.tsx:30:5 | – | – | refused · runtime-only-frames / no-project-frame |
| 3 | `/` | server | `h2` `div:1/div:0/div:1/div:1/div:1/div:2/h2:0` | src/components/home/partners-section.tsx:22:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 4 | `/` | server | `div` `div:1/div:0/div:1/div:1/div:1/div:5/div:0` | src/components/home/partners-section.tsx:43:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 5 | `/` | server | `div` `div:1/div:0/div:1/div:1/div:1/section:6/div:0` | src/components/home/partners-section.tsx:57:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 6 | `/` | server | `ul` `div:1/div:0/div:1/div:1/div:1/section:6/div:0/ul:1` | src/components/home/partners-section.tsx:64:11 | – | – | refused · runtime-only-frames / no-project-frame |
| 7 | `/` | server | `path` `…div:1/div:1/div:1/section:6/div:0/ul:1/li:0/a:0/svg:0/path:0` | src/app/partners/sponsors.tsx:1155:11 | – | – | refused · runtime-only-frames / no-project-frame |
| 8 | `/` | server | `path` `…div:1/div:1/div:1/section:6/div:0/ul:1/li:3/a:0/svg:0/path:4` | src/app/partners/sponsors.tsx:772:11 | – | – | refused · runtime-only-frames / no-project-frame |
| 9 | `/` | server | `li` `div:1/div:0/div:1/div:1/div:1/section:6/div:0/ul:1/li:5` | src/components/home/partners-section.tsx:66:15 | – | – | refused · runtime-only-frames / no-project-frame |
| 10 | `/` | server | `a` `div:1/div:0/div:1/div:1/div:1/section:6/div:0/ul:1/li:6/a:0` | src/components/home/partners-section.tsx:67:17 | – | – | refused · runtime-only-frames / no-project-frame |
| 11 | `/` | server | `svg` `…/div:0/div:1/div:1/div:1/section:6/div:0/ul:1/li:7/a:0/svg:0` | src/app/partners/sponsors.tsx:598:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 12 | `/` | server | `path` `…div:1/div:1/div:1/section:6/div:0/ul:1/li:7/a:0/svg:0/path:0` | src/app/partners/sponsors.tsx:599:11 | – | – | refused · runtime-only-frames / no-project-frame |
| 13 | `/` | server | `a` `div:1/div:0/div:1/div:1/div:1/section:6/div:0/ul:1/li:9/a:0` | src/components/home/partners-section.tsx:67:17 | – | – | refused · runtime-only-frames / no-project-frame |
| 14 | `/` | server | `svg` `…/div:0/div:1/div:1/div:1/section:6/div:0/ul:1/li:9/a:0/svg:0` | src/app/partners/sponsors.tsx:129:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 15 | `/` | server | `li` `div:1/div:0/div:1/div:1/div:1/section:6/div:0/ul:1/li:13` | src/components/home/partners-section.tsx:66:15 | – | – | refused · runtime-only-frames / no-project-frame |

### magicui turbopack

| # | route | kind | element (DOM path) | expected | got | via | verdict / reason |
|---|---|---|---|---|---|---|---|
| 1 | `/blog` | server | `header` `main:2/main:0/header:0` | app/(blog)/blog/page.tsx:131:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 2 | `/blog` | server | `span` `main:2/main:0/div:1/article:0/a:0/div:1/div:1/span:1` | app/(blog)/blog/page.tsx:234:52 | – | – | refused · runtime-only-frames / no-project-frame |
| 3 | `/blog` | server | `article` `main:2/main:0/div:1/article:1` | app/(blog)/blog/page.tsx:199:17 | – | – | refused · runtime-only-frames / no-project-frame |
| 4 | `/blog` | server | `img` `main:2/main:0/div:1/article:1/a:0/div:0/img:0` | app/(blog)/blog/page.tsx:206:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 5 | `/blog` | server | `h2` `main:2/main:0/div:1/article:1/a:0/div:1/div:0/h2:0` | app/(blog)/blog/page.tsx:218:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 6 | `/blog` | server | `span` `main:2/main:0/div:1/article:1/a:0/div:1/div:1/span:2` | app/(blog)/blog/page.tsx:235:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 7 | `/blog` | server | `span` `main:2/main:0/div:1/article:2/a:0/div:1/div:1/span:2` | app/(blog)/blog/page.tsx:235:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 8 | `/blog` | server | `span` `main:2/main:0/div:1/article:3/a:0/div:1/div:1/span:2` | app/(blog)/blog/page.tsx:235:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 9 | `/blog` | server | `div` `main:2/main:0/div:1/article:3/a:0/div:1/div:2` | app/(blog)/blog/page.tsx:241:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 10 | `/blog` | server | `p` `main:2/main:0/div:1/article:4/a:0/div:1/div:0/p:1` | app/(blog)/blog/page.tsx:222:27 | – | – | refused · runtime-only-frames / no-project-frame |
| 11 | `/blog` | server | `time` `main:2/main:0/div:1/article:5/a:0/div:1/div:1/time:0` | app/(blog)/blog/page.tsx:230:27 | – | – | refused · runtime-only-frames / no-project-frame |
| 12 | `/blog` | server | `span` `main:2/main:0/div:1/article:5/a:0/div:1/div:1/span:1` | app/(blog)/blog/page.tsx:234:52 | – | – | refused · runtime-only-frames / no-project-frame |
| 13 | `/blog` | server | `span` `main:2/main:0/div:1/article:6/a:0/div:1/div:1/span:1` | app/(blog)/blog/page.tsx:234:52 | – | – | refused · runtime-only-frames / no-project-frame |
| 14 | `/blog` | server | `img` `main:2/main:0/div:1/article:7/a:0/div:0/img:0` | app/(blog)/blog/page.tsx:206:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 15 | `/blog` | server | `div` `main:2/main:0/div:1/article:9/a:0/div:1/div:1` | app/(blog)/blog/page.tsx:228:23 | – | – | refused · runtime-only-frames / no-project-frame |

### magicui webpack

| # | route | kind | element (DOM path) | expected | got | via | verdict / reason |
|---|---|---|---|---|---|---|---|
| 1 | `/blog` | server | `header` `main:2/main:0/header:0` | app/(blog)/blog/page.tsx:131:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 2 | `/blog` | server | `span` `main:2/main:0/div:1/article:0/a:0/div:1/div:1/span:1` | app/(blog)/blog/page.tsx:234:52 | – | – | refused · runtime-only-frames / no-project-frame |
| 3 | `/blog` | server | `article` `main:2/main:0/div:1/article:1` | app/(blog)/blog/page.tsx:199:17 | – | – | refused · runtime-only-frames / no-project-frame |
| 4 | `/blog` | server | `img` `main:2/main:0/div:1/article:1/a:0/div:0/img:0` | app/(blog)/blog/page.tsx:206:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 5 | `/blog` | server | `h2` `main:2/main:0/div:1/article:1/a:0/div:1/div:0/h2:0` | app/(blog)/blog/page.tsx:218:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 6 | `/blog` | server | `span` `main:2/main:0/div:1/article:1/a:0/div:1/div:1/span:2` | app/(blog)/blog/page.tsx:235:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 7 | `/blog` | server | `span` `main:2/main:0/div:1/article:2/a:0/div:1/div:1/span:2` | app/(blog)/blog/page.tsx:235:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 8 | `/blog` | server | `span` `main:2/main:0/div:1/article:3/a:0/div:1/div:1/span:2` | app/(blog)/blog/page.tsx:235:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 9 | `/blog` | server | `div` `main:2/main:0/div:1/article:3/a:0/div:1/div:2` | app/(blog)/blog/page.tsx:241:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 10 | `/blog` | server | `p` `main:2/main:0/div:1/article:4/a:0/div:1/div:0/p:1` | app/(blog)/blog/page.tsx:222:27 | – | – | refused · runtime-only-frames / no-project-frame |
| 11 | `/blog` | server | `time` `main:2/main:0/div:1/article:5/a:0/div:1/div:1/time:0` | app/(blog)/blog/page.tsx:230:27 | – | – | refused · runtime-only-frames / no-project-frame |
| 12 | `/blog` | server | `span` `main:2/main:0/div:1/article:5/a:0/div:1/div:1/span:1` | app/(blog)/blog/page.tsx:234:52 | – | – | refused · runtime-only-frames / no-project-frame |
| 13 | `/blog` | server | `span` `main:2/main:0/div:1/article:6/a:0/div:1/div:1/span:1` | app/(blog)/blog/page.tsx:234:52 | – | – | refused · runtime-only-frames / no-project-frame |
| 14 | `/blog` | server | `img` `main:2/main:0/div:1/article:7/a:0/div:0/img:0` | app/(blog)/blog/page.tsx:206:25 | – | – | refused · runtime-only-frames / no-project-frame |
| 15 | `/blog` | server | `div` `main:2/main:0/div:1/article:9/a:0/div:1/div:1` | app/(blog)/blog/page.tsx:228:23 | – | – | refused · runtime-only-frames / no-project-frame |

### shadcn turbopack

| # | route | kind | element (DOM path) | expected | got | via | verdict / reason |
|---|---|---|---|---|---|---|---|
| 1 | `/examples/dashboard` | client | `span` `…iv:1/main:1/div:1/div:0/div:0/div:1/div:0/div:0/div:1/span:0` | app/(app)/examples/dashboard/components/chart-area-interactive.tsx:166:11 | app/(app)/examples/dashboard/components/nav-documents.tsx:53:17 | owner-stack | wrong-file-other |
| 2 | `/examples/dashboard` | client | `stop` `…div:0/div:0/div:0/div:0/svg:1/defs:5/linearGradient:0/stop:0` | app/(app)/examples/dashboard/components/chart-area-interactive.tsx:213:17 | app/(app)/examples/dashboard/components/nav-documents.tsx:53:17 | owner-stack | wrong-file-other |
| 3 | `/` | client | `span` `div:1/header:0/div:0/div:0/div:2/div:5/a:1/span:0` | app/(app)/(create)/components/v0-button.tsx:53:7 | – | – | refused · runtime-only-frames / no-project-frame |
| 4 | `/` | client | `a` `div:1/header:0/div:0/div:0/div:2/div:6/a:1` | app/(app)/(create)/components/v0-button.tsx:47:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 5 | `/` | server | `main` `div:1/main:1` | app/(app)/layout.tsx:11:7 | – | – | refused · runtime-only-frames / no-project-frame |
| 6 | `/` | server | `section` `div:1/main:1/div:0/div:1/div:0/section:1` | app/(app)/(root)/page.tsx:114:11 | – | – | refused · runtime-only-frames / no-project-frame |
| 7 | `/` | server | `div` `…:1/div:0/section:1/div:0/div:0/div:0/div:0/div:1/div:1/div:0` | app/(app)/(root)/cards/skeleton/claimable-balance.tsx:18:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 8 | `/` | server | `div` `…:0/section:1/div:0/div:0/div:0/div:0/div:1/div:1/div:0/div:0` | app/(app)/(root)/cards/skeleton/claimable-balance.tsx:19:11 | – | – | refused · runtime-only-frames / no-project-frame |
| 9 | `/` | server | `div` `…tion:1/div:0/div:0/div:0/div:0/div:2/div:1/div:0/div:0/div:1` | app/(app)/(root)/cards/skeleton/dividend-income.tsx:33:15 | – | – | refused · runtime-only-frames / no-project-frame |
| 10 | `/` | server | `div` `…:0/section:1/div:0/div:0/div:0/div:0/div:2/div:1/div:0/div:1` | app/(app)/(root)/cards/skeleton/dividend-income.tsx:25:13 | – | – | refused · runtime-only-frames / no-project-frame |
| 11 | `/` | server | `div` `…tion:1/div:0/div:0/div:0/div:0/div:2/div:1/div:0/div:2/div:1` | app/(app)/(root)/cards/skeleton/dividend-income.tsx:33:15 | – | – | refused · runtime-only-frames / no-project-frame |
| 12 | `/` | server | `div` `…tion:1/div:0/div:0/div:0/div:0/div:2/div:1/div:0/div:3/div:0` | app/(app)/(root)/cards/skeleton/dividend-income.tsx:29:15 | – | – | refused · runtime-only-frames / no-project-frame |
| 13 | `/` | server | `div` `…:1/div:0/section:1/div:0/div:0/div:0/div:0/div:3/div:1/div:2` | app/(app)/(root)/cards/skeleton/payout-threshold.tsx:33:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 14 | `/` | server | `div` `…:1/div:0/section:1/div:0/div:0/div:0/div:1/div:3/div:1/div:1` | app/(app)/(root)/cards/skeleton/payout-threshold.tsx:22:9 | – | – | refused · runtime-only-frames / no-project-frame |
| 15 | `/` | server | `div` `…:0/section:1/div:0/div:0/div:0/div:1/div:3/div:1/div:1/div:2` | app/(app)/(root)/cards/skeleton/payout-threshold.tsx:28:11 | – | – | refused · runtime-only-frames / no-project-frame |

## Limits of this report

- Stopped by the owner: shadcn/ui was killed after one run used about 10 GB (dev server 8 GB, Chromium 2.5 GB). Its numbers below are from that run (Turbopack only; /charts/area and /blocks did not measure on every run). Webpack on shadcn: not measured, see What did not run. No further shadcn run was made.
- tailwindcss.com was measured before the browser was restricted to localhost (its pages loaded remote images and the analytics script); a rerun under the restriction and the 4 GB memory cap was started twice and was killed from outside both times (Chrome closed under the run), so the earlier numbers stand. No run stopped on the 4 GB cap.
- Rows kept from earlier runs of the same file lack their owner-file lists, so their wrong-file split between ancestor and other can read "other"; the wrong-file total is not affected.

## What did not run

- **shadcn/ui (apps/v4)** webpack: Next 16.4.2 + webpack: the first two routes never reported ready (page.waitForFunction timed out after 150 s, twice per route, on / and /examples/dashboard); the dev server dropped client chunk requests (ERR_EMPTY_RESPONSE, then ERR_CONNECTION_REFUSED) and a manual load of / did not reach domcontentloaded in 200 s. The server log showed no error line. Not measured.

### Routes that did not render or measure

| run | route | why |
|---|---|---|
| shadcn turbopack-stamped full | /charts/area | page.goto: Timeout 150000ms exceeded. Call log:   - navigating to "http://127.0.0.1:58958/charts/area", waiting until "domcontentloaded"  |
| shadcn turbopack-plain plain | /charts/area | page.waitForFunction: Timeout 150000ms exceeded. |
| shadcn turbopack-plain plain | /blocks | page.waitForFunction: Target page, context or browser has been closed |
| magicui webpack-plain plain | / | no answer: fetch failed |
| tailwindcss turbopack-stamped full | / | HTTP 500: dev server log: ⨯ Error: Passing props on "Fragment"! The current component <Menu /> is rendering a "Fragment". However we need to passthrough the following props: |
| tailwindcss turbopack-stamped full | /docs/padding | HTTP 500: dev server log: ⨯ Error: Passing props on "Fragment"! The current component <Menu /> is rendering a "Fragment". However we need to passthrough the following props: |
| tailwindcss turbopack-stamped full | /docs/installation/using-vite | HTTP 500: dev server log: ⨯ Error: Passing props on "Fragment"! The current component <Menu /> is rendering a "Fragment". However we need to passthrough the following props: |
| tailwindcss turbopack-stamped full | /showcase | skipped: the 3 routes before it failed on this run |
| tailwindcss turbopack-stamped full | /partners | skipped: the 3 routes before it failed on this run |
| tailwindcss webpack-stamped full | / | HTTP 500: dev server log: ⨯ Error: Passing props on "Fragment"! The current component <Menu /> is rendering a "Fragment". However we need to passthrough the following props: |
| tailwindcss webpack-stamped full | /docs/padding | HTTP 500: dev server log: ⨯ Error: Passing props on "Fragment"! The current component <Menu /> is rendering a "Fragment". However we need to passthrough the following props: |
| tailwindcss webpack-stamped full | /docs/installation/using-vite | HTTP 500: dev server log: ⨯ Error: Passing props on "Fragment"! The current component <Menu /> is rendering a "Fragment". However we need to passthrough the following props: |
| tailwindcss webpack-stamped full | /showcase | skipped: the 3 routes before it failed on this run |
| tailwindcss webpack-stamped full | /partners | skipped: the 3 routes before it failed on this run |

## Seen while measuring

Not fixed here; found while running the nextapps corpus.

- `overlay/src/locate.js:524` refuses with `runtime-only-frames / no-project-frame` for essentially every server-component element on a plain run (tailwindcss.com: 0 % found on server elements, about 96 % on client elements). Owner-stack reconstruction has nothing to read there; only stamps answer.
- `src/hosts/source-stamping.ts:21` (`stampJSX`) stamps component usages as well as DOM tags. Headless UI's `<Menu>` renders a Fragment and throws "Passing props on Fragment" on the extra `data-plumb-source` prop, so full stamping returns HTTP 500 on every route of tailwindcss.com (both bundlers). The Vite host has the same stamper. `hostOnly` (added here, off by default) avoids it; truth for that app is host-tags-only stamps.
- `src/hosts/next-config.ts:35-36` sets `PLUMBER_NEXT_DIST_DIR` and `PLUMBER_NEXT_SERVER_MODULE` in the process that loads the config. On Next 15.5.28 + webpack (magicui) the process that serves `/__plumb` does not have them, so `src/hosts/next.ts:17` falls back to `./next-dev.js`, which does not exist in `.next/server/app/...`, and `/__plumb/client.js` answers 500. The bench sets both variables in the dev server's environment for Next 15.
- The same stamper on Turbopack and webpack worked on magicui (Next 15.5) and shadcn/ui (Next 16.4, Turbopack) with full stamping.
- On monorepo apps (magicui `apps/www`, shadcn `apps/v4`) the stamps reach the DOM but locate mostly does not answer from them: DOM stamps are relative to the app folder (`components/site-header.tsx:15:9#…`, the loader's root is `process.cwd()`), and locate answers `resolve-refusal` or `runtime-only-frames / no-project-frame` for most of them (magicui: stamp answers 199 of about 1,076 elements per run). Only the Vite-style single-root case (tailwindcss.com, repo root = app) answers `stamp` at 87 to 97 %. Likely the overlay resolves stamp paths against the workspace root, not the app root; not investigated (`overlay/src/locate.js`, the stamp branch near line 244).
