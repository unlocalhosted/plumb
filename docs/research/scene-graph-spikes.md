# Scene-graph spikes: can every DOM element carry a stable id, and can Plumber drive React from outside?

Date 2026-11-05. Research only: no product code changed (`git status --short` in the worktree printed nothing).
Fixtures live outside the repo: `S=/private/tmp/claude-501/-Users-vijaysingh-unlocalhosted-plumb/a21368d1-7ee2-44a7-b576-1a8fd06d7064/scratchpad/sg`
(`$S/next-app`, `$S/vite-app`, `$S/next-export`, `$S/b7`; scripts `stamp.mjs loader.cjs rehype-sg.mjs collect.mjs ctl.mjs ids.mjs hmr.mjs order.mjs b8.mjs`).
Servers were started only with `~/.claude/bin/dev-server` and stopped with `--stop` (final `--list | grep -c scratchpad` printed `0`).

## Versions actually run

| Thing | Version | Source |
| --- | --- | --- |
| next | 16.4.5 | `npm i next@16.4.5` in `$S` |
| react / react-dom installed | 19.3.1 | `$S/node_modules/react-dom/cjs/react-dom-client.development.js:31115` (`version: "19.3.1"`) |
| react-dom that Next's App Router actually runs | `19.3.0-canary-278794d7-20261002` (vendored in `next/dist/compiled/react-dom`) | hook output below |
| react-dom that Next's Pages router runs | 19.3.1 (the installed one) | hook output below |
| vite / @vitejs/plugin-react | 8.3.6 / 6.2.1 | `npm ls` |
| babel-plugin-react-compiler | 1.0.0 | `$S/node_modules/babel-plugin-react-compiler/package.json` |
| @babel/core | 8.1.0 in `$S`, 7.x in `$S/b7` | `npm ls @babel/core` |
| oxc-transform-react (Rust compiler) | installed, used by `react({compiler:true})` | `$S/node_modules` |
| @next/mdx, @mdx-js/rollup | 16.4.5, 3.x | `$S/package.json` |

React 18 was not exercised (UNVERIFIED). The repo's own `fixtures/react18` would be the place.

## The stamp used in the spike

`$S/stamp.mjs` is a copy of the repo's idea (`src/hosts/source-stamping.ts:15` `stampJSX`: oxc-parser + MagicString, append a prop to each opening tag),
reduced to lowercase (DOM) tags and `data-sg="<8 char id>"`. Three id schemes, selected by env `SG_SCHEME`:
`pos` = hash(path, file content hash, line:col); `line` = hash(path, line:col); `struct` = hash(path, enclosing function name, tag, ordinal of that tag inside the function).
It also appends one line per element to a manifest (`.sg-manifest.jsonl`, 77 rows for the Next app).

---

## 1. Stamp survival

### 1a. Static HTML, per toolchain (Next production builds, `next build`, then `node collect.mjs <dir>/server`)

Command and raw result (webpack, no compiler):
```
SG_DIST=.next-wp next build --webpack ; node ../collect.mjs .next-wp/server
server/app/client.html     stamps  12 mdx-src 0 dom-tags 25 idhash c138caac
server/app/index.html      stamps  18 mdx-src 0 dom-tags 31 idhash 0847e977
server/app/mdx.html        stamps   9 mdx-src 6 dom-tags 23 idhash 928f19af
server/pages/pages-ssg.html stamps 10 mdx-src 0 dom-tags 26 idhash 6b407927
```
`dom-tags` includes `<script>/<link>` that Next itself emits, so it is not "elements minus stamps". `idhash` is a hash of the ordered id list.

The same four lines (same counts, same `idhash`) came back from all of:
- webpack + React Compiler (`SG_COMPILER=1`, `.next-wpc`)
- Turbopack (`SG_BUNDLER=turbopack`, `.next-tp`, 77 manifest rows again)
- Turbopack + React Compiler (`.next-tpc`)
- Turbopack + `output:'export'` (`$S/next-export/out/*.html`)

So the id list is identical across webpack, Turbopack, with/without compiler, with/without export, and across two different project directories (`next-app` vs `next-export`),
because the `struct` id uses only the repo-relative path.

Server components: `app/index.html` (the RSC page) holds `<p id="server-badge" class="badge" data-sg="be1ER_jv">` from the server-only function `ServerBadge`, and `<main id="rsc-main" data-sg=...>`.
Client components prerendered on the server (`Panel`) are stamped in the same HTML: `<section id="panel" class="p-8" data-sg="JUBdC_Nc">`.

### 1b. Live DOM and hydration (Playwright, headless chromium 1248, `node ctl.mjs <url> <label>`)

`hydrationWarnings` counts console messages matching /hydrat|did not match|mismatch/; `otherLogs` is every other console error/warning (empty list = none).
The detector was not positively controlled with a deliberately mismatching page: treat "0" as "no warning seen" (UNVERIFIED as a proof of absence).

```
next-webpack-dev     /client      stampedDom 12 hydrationWarnings 0   (probe.mjs)
next-webpack-dev     /            stampedDom 18 hydrationWarnings 0   (RSC page)
next-turbopack-dev+compiler /     stampedDom 18 hydrationWarnings 0 otherLogs []
next-turbopack-dev+compiler /client      12 / 0
next-turbopack-dev+compiler /pages-ssr   10 / 0
next-webpack-PROD    /  /client /pages-ssg   18 / 12 / 10 stamps, 0 warnings, otherLogs []
static-export        index client pages-ssg mdx .html   18 / 12 / 10 / 9 stamps, 0 warnings, otherLogs []
vite-dev (SPA)       stampedDom 26, distinctIds 17, 0 warnings
```
Surprise: `distinctIds` < `stampedDom` everywhere (e.g. Vite 26 stamped, 17 distinct; Next `/` 18 vs 15). A stamp is **per JSX site, not per rendered element**.
Three `<li>` from one `.map` carry the same `data-sg="JcuASS0Y"` (seen in `.next-wp/server/app/index.html`). "One short stable id per DOM element" needs an instance part at runtime
(site id + key path or fiber index); the build-time id is a site id.

Next dev and prod also showed: `app/client.html` (a `'use client'` page) has 12 stamps in server-rendered HTML and the same 12 after hydration.

### 1c. Plugin order with React Compiler

What I ran (`$S/b7/order.mjs`, Babel 7 + babel-plugin-react-compiler 1.0.0 on `components/Panel.tsx`; compiler logs `CompileSuccess Panel`):
```
--- A stamp-text-before-compiler: compiled=true stamps=8   KJnHGx44 _APerX3l QsfY-hs9 WCF-Nm3x SKHpKAPo 1XWJPkV4 JUBdC_Nc gIZ5p7AD
--- B compiler-then-stamp-plugin: compiled=true stamps=8   h2@8:7 button@9:7 span@10:7 ul@11:7 em@12:20 i@12:46 section@7:5 li@11:27
--- C stamp-plugin-then-compiler: compiled=true stamps=8   (same list as B)
```
- All three orders keep all 8 stamps. Before-compiler (text-level, as the repo does in Vite with `enforce:'pre'`) is the simplest: it needs no AST rewrite and no loc.
- After the compiler (a Babel plugin) still sees `node.loc` of the original JSX (the `@8:7` values equal the source positions), so line:col stamping after the compiler also works in Babel.
- The compiler **re-orders** emission (`h2` first, `section` last, `li` outlined) but each element keeps its stamp.
- What the stamp attaches to under the compiler: elements are cached in the memo array and `.map` callbacks are outlined to module level. Raw output from the webpack+compiler client chunk
  (`.next-wpc/static/chunks/app/page-8e3975f5459ebbc8.js`):
  `u=(0,r.jsxs)("section",{id:"panel",className:N,"data-sg":"JUBdC_Nc",children:[t,i,d,o,l]}),h[9]=N,...,u=h[14]` and `function c(e){return(0,r.jsx)("li",{"data-sg":"gIZ5p7AD",children:e},e)}`.
  A constant prop stays a constant inside the cached element; it does not become a dependency, so stamping cannot reduce compiler memoisation.
  Not measured (UNVERIFIED): whether `_debugOwner`/`_debugStack` of fully hoisted constant elements points at the first render's owner.

Surprises from the compiler:
1. Next's `reactCompiler: true` compiles only the **browser** bundle. Server-side output of client components has no cache: `grep -c memo_cache .next-wpc/server/app/client/page.js` printed `0`; the Turbopack equivalent (`grep -c memo_cache_sentinel` on the chunk with `JUBdC_Nc` under `.next-tpc/server`) printed `0`, under `.next-tpc/static` it printed `1`.
   So SSR HTML and the client render come from differently compiled code; constant stamps are identical in both.
2. **Babel 8 breaks the compiler silently.** With `@babel/core@8.1.0`, `babel-plugin-react-compiler@1.0.0` throws/skips components that destructure with a default value:
   ```
   $S/b8.mjs (Babel 8):  default-param destructuring -> compiled: false events: CompileError:(BuildHIR::lowerAssignment) Expected object property value to be an LVal ...
                         plain props -> compiled: true events: CompileSuccess
   $S/b7/b8.mjs (Babel 7): both -> compiled: true
   ```
   In Vite, `@vitejs/plugin-react` 6 + `@rolldown/plugin-babel` + `reactCompilerPreset()` pulled Babel 8: the shared `Panel({title, tone='plain'})` was **not compiled** (`curl .../Panel.tsx | grep -c compiler-runtime` = 0, no error shown). After removing the default value from a local copy, it compiled (`grep -c compiler-runtime` = 1). A stamp is not affected, but any "is the compiler on" check must test the output, not the config.
3. Vite's native compiler `react({compiler:true})` (oxc-transform-react) compiled `Panel` including the default param (`const $ = _c(15);`, `"data-sg": "KJnHGx44"` lines in the served module).

### 1d. Verdict for question 1
A constant `data-*` on DOM tags survives to server HTML, SSG/export HTML, the live DOM, and production bundles (`vite build` output: `grep -o '"data-sg"' dist-b/assets/*.js | wc -l` = 21) in every cell I ran. Hydration showed no warning in dev for RSC, client and Pages pages. Stamp before the compiler is the proven default; after also works at Babel level.
Component tags must not get the prop (already the rule in `docs/briefs/stamping-everywhere.md`); I stamped only lowercase tags.

---

## 2. Where a stamp can be added, and what the repo has

| Toolchain | Mechanism | Ran here | In repo today | New work |
| --- | --- | --- | --- | --- |
| Vite (dev) | Vite plugin, `enforce:'pre'`, `transform` | yes, `$S/vite-app/vite.config.mjs` | yes: `src/hosts/source-stamping.ts:44-72`, mounted `src/hosts/vite.ts:44,107,124`; turns itself off when a react plugin precedes it (`source-stamping.ts:58`) | none for plain stamps |
| Vite (prod build) | same plugin | yes, `vite build` kept 21 stamps | only behind `demo` (`source-stamping.ts` `apply`) | opt-in |
| Next, webpack | webpack rule `enforce:'pre'` with a loader, added in `webpack(config)` | yes, `$S/loader.cjs`, `$S/next-app/next.config.mjs` | **no**: `src/hosts/next-config.ts:10` returns `pageExtensions`/`serverExternalPackages` only | a loader (reuse `stampJSX`) + merge into the user's `webpack` function |
| Next, Turbopack | `turbopack.rules['*.{tsx,jsx}'] = {loaders:[path]}` | yes; the loader ran before SWC: stamps in RSC server HTML | **no** | rule merged with the app's own `turbopack.rules`; loader must be a plain CJS/ESM file path (it was) |
| Next, SWC plugin (`experimental.swcPlugins`) | WASM SWC plugin | UNVERIFIED: type exists (`config-shared.d.ts:559`), nothing built (needs a Rust/wasm toolchain, plugin ABI must match Next's SWC) | no | not needed if loaders work |
| Next, Babel (`.babelrc`) | would disable SWC and Next's compiler pipeline | not tried | no | avoid |
| MDX | rehype plugin, or `mdxJsx*` attribute push | yes (section 4) | no | new |

Both bundler paths used the same loader file, so one implementation covers webpack + Turbopack. Next 16 `turbopack.rules` is typed at `next/dist/server/config-shared.d.ts:178`.
Not covered: Next with a custom Babel config, `transpilePackages` and workspace packages (rows 4 and 5 of the brief), pnpm/PnP shapes.

---

## 3. Runtime control in dev

Method: `page.addInitScript` installs a minimal `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` (`supportsFiber`, `renderers` Map, `inject(r)` stores the renderer interface, `onCommitFiberRoot` etc. no-ops) **before any script**. Fibers are found from a DOM node's `__reactFiber$...` key (`ctl.mjs`), or from commit roots (`probe.mjs`).

### 3a. What react-dom hands to the hook
Source (dev build `react-dom-client.development.js:31120-31140`): `internals.overrideHookState, overrideHookStateDeletePath, overrideHookStateRenamePath, overrideProps, overridePropsDeletePath, overridePropsRenamePath, scheduleUpdate, scheduleRetry, setErrorHandler, setSuspenseHandler, scheduleRefresh, scheduleRoot, setRefreshHandler, getCurrentFiber`.
`grep -n "overrideProps" react-dom-client.production.js` printed nothing: **production react-dom exposes none of them** (live: `.../bundleType0/overrideProps:undefined` in every PROD and export run). `findFiberByHostInstance` is **not** present in React 19.3 internals (`"findFiberByHostInstance": "MISSING"`), so fiber lookup goes through the DOM expando or commit roots.

Raw, Vite dev: `"renderers": ["react-dom@19.3.1/bundleType1/overrideProps:function"], "surface": "overrideProps:function overrideHookState:function setSuspenseHandler:function setErrorHandler:function scheduleUpdate:function"`.
Raw, Next App Router dev: two renderers register, `react-dom@19.3.0-canary-.../bundleType1/overrideProps:function` and `.../bundleType0/overrideProps:undefined` (a production-flavoured react-dom, apparently for Next's own dev UI). A tool must pick the renderer that has `overrideProps` **and** whose root owns the fiber (`onCommitFiberRoot(rendererId, root)` gives that mapping). In Pages router dev the order is reversed (19.3.1 dev first). Calling the wrong renderer on a fiber silently does nothing.

### 3b. Forced behaviour on a mounted `Panel` (client component, under `Suspense` under a class `Boundary`)
Results from `ctl.mjs` (JSON, one line each, abridged to the fields that matter):

| Cell | overrideHookState (count) | Suspense forced (fallback shown, panel `display`) | Error boundary forced | overrideProps direct on Panel |
| --- | --- | --- | --- | --- |
| Vite dev, no compiler | `9` | `fallback:true, panelDisplay:"none"`, then released `fallback:false, block, count 9` (state kept) | `caught: Simulated error coming from DevTools` | **no effect** ("vite" stays) |
| Vite dev, native compiler (`oxc-transform-react`, `_c(15)` in served module) | `9` | same | same | no effect |
| Vite dev, Babel compiler (local copy without default param, `compiler-runtime` count 1) | `9` | same | same | no effect |
| Next webpack dev `/client` (no compiler) | `7` | same | same | no effect |
| Next webpack dev `/` (RSC page, Panel under a server component) | `7` | same | same | no effect |
| Next Turbopack dev + compiler `/client`, `/pages-ssr` | `9` | same | same | no effect |
| Next Turbopack dev + compiler `/` | `"0"` in the full sequence, `5` and `8` when run alone (`ovr2.mjs`) | same | same | no effect |

Details and limits found:
- **`overrideProps` on a component under a `Suspense` does nothing.** Same component outside Suspense works (`ovr`-style test on `<div id="bare"><Panel title="bare"/></div>`: `"h2":"V1"`). Raw from `dbg.mjs`: for the Suspense-wrapped one `afterRender` shows the new alternate with `pend:"V1"` but `memo:"vite"`, parents `["22:","13:","1:Boundary","5:main"]` (Offscreen, Suspense). The Suspense re-renders its primary children from its own `children` prop and discards the patched `pendingProps`.
  Workaround that worked: override on the **Suspense fiber** along the element path: `overrideProps(suspenseFiber, ['children','props','title'], 'x')` changed the text (`"overridePropsViaSuspenseChildren":"viaSuspenseChildren"`) and a later direct override then also showed it. In an RSC page that path **throws** (`TypeError: Cannot read properties of undefined (reading 'title')`, `childrenType=Symbol(react.lazy)`), because `children` is a Flight lazy node. So prop forcing for components under Suspense in RSC pages has no working route in my tests.
- **Error forcing only works on class components.** `shouldErrorImpl` is consulted in the class path (`react-dom-client.development.js:10626`, creates `Error("Simulated error coming from DevTools")`). Forcing an error on the function component `Panel` did nothing: `"errorOnFunctionComponent":{"boundary":null,"panelStill":true}`. So "force error state" means "force this boundary into its error state", which requires a class boundary (Error boundaries in libraries such as react-error-boundary are classes, fine; function-only trees have none).
- **Suspense forcing** uses `shouldSuspendImpl(workInProgress)` in `updateSuspenseComponent` (`:11217`): `setSuspenseHandler(f => f===s||f===s.alternate); scheduleUpdate(s)` shows the fallback and hides the content with `display:none` (state kept), releasing returns the content with `count` intact. Verified on every dev row above.
- `overrideHookState(fiber, 0, [], 9)` sets `useState` hook 0 on compiled and uncompiled components alike (the compiler's memo cache is not in the hook list).
- Stale fiber risk: `el.__reactFiber$` can be the non-current alternate. In one Turbopack+compiler RSC sequence (overrideProps direct, then a path attempt that threw, then hook state) the hook-state call had no effect 3 of 3 times, while running hook state alone on the same page worked (`ovr2.mjs`: `5`, `afterClick 6`, `8`). Cause not isolated (UNVERIFIED); resolve the current fiber from the commit root, like DevTools' `findCurrentFiberUsingSlowPath`, before each call.

### 3c. Server components have no fiber
Raw (Next webpack dev `/`, `r-wp-rsc.txt`; Turbopack gives the same):
```
"fiberWithTypeServerBadge": false
serverBadge: [ "p owner=ServerBadge/Server debugInfo=[ServerBadge/Server]",
               "main owner=Page/Server debugInfo=[Page/Server]",
               "SegmentViewNode owner=null debugInfo=[]" ]
```
No fiber has `type.name === 'ServerBadge'`. What is visible instead: the host fiber's `_debugOwner` is a plain object `{name:'ServerBadge', env:'Server', owner, stack, props, debugTask, debugStack}` (not a fiber, `isFiber:false`) and `_debugInfo` entries on the fiber (ReactComponentInfo, with `props`, plus `{time}` entries). So Plumber can read the server component's **name, its props as serialized at render, and a creation stack** from the host fiber, but cannot override, suspend or error it: those APIs take fibers. Forcing a server-component state means re-running the server (refresh/route) or substituting a client wrapper.

### 3d. Dev only
Production react-dom has no `overrideProps`, no `setSuspenseHandler`, no `setErrorHandler` (grep above; live `overrideProps:undefined` in `next start` and static export). Hook injection itself still works in prod (renderer registers with `bundleType0`), so read-only fiber walking is possible there; control is not.

---

## 4. MDX

`$S/rehype-sg.mjs` adds `data-sg` and `data-sg-src="<file>:<line>:<col>"` from `node.position` to hast `element` nodes and to `mdxJsxFlowElement/mdxJsxTextElement` (lowercase names).

- `@next/mdx` + webpack, `@next/mdx` + Turbopack (plugin passed as an absolute path string, as Turbopack requires), `@mdx-js/rollup` in Vite: all produced stamps.
  Static HTML (`collect.mjs`): `app/mdx.html stamps 9 mdx-src 6` on every Next cell. Live DOM from Vite (`dom.mjs http://localhost:4510/ "h1, [data-sg-src]"`):
  ```
  <p  data-sg="xgkRhV2B" data-sg-src="src/doc.mdx:3:1">   ownerChain: p < MDXContent < App
  <em data-sg="dTS58e9x" data-sg-src="src/doc.mdx:3:6">
  <li data-sg="dqwUCPhy" data-sg-src="src/doc.mdx:5:1"> / <li ... "src/doc.mdx:6:1">
  <div id="jsx-in-mdx" class="x" data-sg="nBuRq-N6" data-sg-src="src/doc.mdx:8:1">
  ```
- JSX written inside MDX is **not** visited by a plain rehype `element` walk: first run stamped nothing on `<div id="jsx-in-mdx">` (Next HTML had `<div id="jsx-in-mdx" class="x">` with no stamp). Handling `mdxJsxFlowElement` (the code in `rehype-sg.mjs`) fixed it.
- Mapped components: with `components={{h1: Heading}}` (Vite) or `mdx-components.tsx` (Next) the owner chain is `h1 < Heading < MDXContent < App` (from `_debugOwner`).
  **Surprise:** the MDX line is lost from the DOM for mapped elements. Rendered tag: `<h1 class="mdx-h1" data-sg="qVdZcF7L">`; that id comes from `Heading.tsx`'s own `<h1>`, because `Heading` does not spread props, so the `data-sg`/`data-sg-src` that MDX passed to `<Heading>` are dropped. The data is not gone: the `Heading` **fiber's `memoizedProps` has `data-sg,data-sg-src,children` with `data-sg-src` = `src/doc.mdx:1:1`**. A reader of fibers recovers it; a DOM-only reader cannot. In Next static HTML, `mdx-src` count 6 = p, em, ul, li, li, div; the `h1` is the missing seventh.
- Not covered: remark-level stamping of fenced code, `.md` files, `@mdx-js/loader` outside Next, MDX in server vs client component trees beyond the static HTML.

---

## 5. Id stability: server vs client, rebuilds, edits

Server vs client: ids are string constants in the JSX, so the id in server HTML equals the id after hydration by construction. Measured: `stampedDom` after hydration equals the stamped count in the HTML for the same page (`/client`: 12 in `client.html`, 12 live; `/`: 18 and 18; `pages-ssg`: 10 and 10), with no mismatch message in dev.
Server vs client with the compiler: the server bundle is uncompiled, the browser bundle compiled (1c.1); ids still equal.

Builds and edits (`node ids.mjs`, three schemes over all 29 DOM elements of the Next app, two independent runs each, then edits to `components/Panel.tsx`, 8 elements):

```
scheme pos    (path, content hash, line:col)  two builds identical: true (29 distinct ids)
  E1 comment line above everything        unchanged 0 / changed 8
  E2 insert <hr/> mid-file                unchanged 0 / changed 8 / new 1
  E3 change a class string only           unchanged 0 / changed 7 / new 1*
  E4 add <h3> before <h2>                 unchanged 0 / changed 8 / new 1
  E5 add a <span> before the <span>       unchanged 0 / changed 8 / new 1
scheme line   (path, line:col)           two builds identical: true
  E1 comment line above                   unchanged 0 / changed 8
  E2 <hr/> mid-file                       unchanged 2 / changed 6 / new 1
  E3 class string only                    unchanged 7 / changed 0 / new 1*
  E4 <h3> before <h2>                     unchanged 1 / changed 7 / new 1
  E5 <span> before <span>                 unchanged 3 / changed 5 / new 1
scheme struct (path, enclosing fn, tag, ordinal of tag in fn)  two builds identical: true
  E1 comment line above                   unchanged 8 / changed 0
  E2 <hr/> mid-file                       unchanged 8 / changed 0 / new 1
  E3 class string only                    unchanged 7 / changed 0 / new 1*
  E4 <h3> before <h2>                     unchanged 8 / changed 0 / new 1
  E5 <span> before <span>                 unchanged 7 / changed 1 / new 1
```
`*` E3 "new 1" is a measuring artefact: the test matches elements by the text of their opening line, and the edit rewrote the line of `<section>`; nothing else changed. Edits to other files change no id in `Panel.tsx` and vice versa (an id depends only on its own file). 0 id collisions among the 29 distinct sites in any scheme (the three `<li>` of one `.map` share one id by design).

Which is more stable: `struct` clearly. Anything that includes the **content hash** (`pos`) invalidates every id in a file on every keystroke-save (E3: a class change changed 7 of 8 ids), so it cannot serve as an identity for annotations that should survive edits; it is right for "is this stamp stale" (the repo's `#hash`), not for identity. Position-only (`line`) survives class edits but breaks for everything below an insert (E2, E4, E5, and E1 changes all 8). `struct` survives comments, inserts of other tags and class edits; it changes only when a same-tag element is inserted **before** another of the same tag in the same function (E5: 1 id), and it breaks on renaming the enclosing function or splitting a component (not tested). Cross-bundler: webpack, Turbopack and export builds produced the same id list (equal `idhash`, 1a). Vite ids for the same source use the same function, but its `rel` path was `src/LocalPanel.tsx` for the local copy, so they differ by path only (e.g. `x7AJYmyl` for that file's `<section>`, `JUBdC_Nc` for the shared `components/Panel.tsx`).

Live HMR (Vite dev, `hmr.mjs`): inserted two comment lines above `LocalPanel.tsx`, waited 2s:
`{"before":16,"identical":true,"noFullReload":true,"stateKeptCount":"1"}` (ids unchanged, the page marker survived so no full reload, the clicked counter kept its state). Next HMR/Fast Refresh was not measured (UNVERIFIED), but both loaders re-run the same function on the changed file only.

Recommended identity if "one short stable id per element" is wanted: `siteId = hash(repo-relative path, enclosing component name, tag, ordinal)`; a per-instance id adds the React key path or fiber `index` chain at runtime; the content hash stays as a separate staleness witness, never in the id. Expect collisions on duplicated function names in one file; add a tie-break ordinal.

---

## Matrix

PASS means I ran it and saw the result. "Runtime force" is dev only; PROD cells say FAIL (not available), not a defect.

| Cell | Stamp survives | Compiler-compatible | Runtime force possible |
| --- | --- | --- | --- |
| Next App Router RSC, webpack, dev | PASS (HTML+DOM, 0 warnings) | UNVERIFIED (compiler on webpack: build HTML PASS; dev run not done) | PASS for client components (state, Suspense, class error); FAIL for server components (no fiber; `_debugInfo` read only); overrideProps FAIL under Suspense |
| Next App Router RSC, webpack, prod build/start | PASS | PASS (`.next-wpc` HTML identical) | FAIL (no override APIs in prod react-dom) |
| Next App Router RSC, Turbopack, dev | PASS (loader before SWC) | PASS (dev + compiler, 0 warnings) | same as webpack dev; one unexplained hook-state failure sequence (3b) |
| Next App Router RSC, Turbopack, prod | PASS | PASS (`.next-tpc`) | FAIL (prod) |
| Next Pages SSR, webpack dev | PASS (`dbg.mjs` run, stamped DOM seen; count not printed) | UNVERIFIED | PASS (uses installed react-dom 19.3.1) |
| Next Pages SSR, Turbopack dev + compiler | PASS (10 / 0 warnings) | PASS | PASS (state, Suspense, class error) |
| Next Pages SSG, webpack and Turbopack builds + `next start` | PASS (10 / 0) | PASS (`.next-wpc`, `.next-tpc`) | FAIL (prod) |
| Next static export (Turbopack) | PASS (served `out/`, 4 pages, 0 errors) | UNVERIFIED (export built without compiler); webpack export UNVERIFIED | FAIL (prod) |
| Vite SPA, dev, no compiler | PASS (26/17 distinct) | n/a | PASS (state, Suspense, class error); overrideProps FAIL under Suspense |
| Vite SPA, native compiler | PASS | PASS | PASS (same) |
| Vite SPA, Babel compiler | PASS | PASS only for components Babel 8 can compile (default-param destructuring silently skipped) | PASS (same) |
| Vite production build | PASS (21 stamps in bundle) | PASS (`compiler-runtime` present) | FAIL (prod) |
| MDX `@next/mdx` webpack | PASS (6 stamps + `.mdx:line:col`, after adding `mdxJsx*` handling) | PASS (same HTML as compiler builds) | n/a |
| MDX `@next/mdx` Turbopack | PASS (rehype plugin as absolute path string) | PASS | n/a |
| MDX `@mdx-js/rollup` (Vite) | PASS (live DOM with `data-sg-src`) | PASS | owner chain via `_debugOwner` PASS; mapped component drops line from DOM, kept in fiber props |

## Surprises (short)
1. A stamp is per site; `.map` output shares one id. Per-element ids need a runtime instance part.
2. Next's App Router runs a **vendored canary react-dom** (`19.3.0-canary-278794d7-20261002`), not the installed 19.3.1; Pages router uses the installed one; two renderers register on one page and only the dev one has overrides.
3. `overrideProps` is dead for anything below a `Suspense`; the `children.props` route works in plain SPAs and throws on RSC (lazy children).
4. Error forcing needs a class boundary; function components ignore it.
5. Next's React Compiler skips the server bundle; stamps stay identical regardless.
6. Babel 8 + babel-plugin-react-compiler 1.0.0 silently skips components with default-valued destructured props; `@vitejs/plugin-react` 6's Babel path pulls Babel 8.
7. MDX: raw JSX inside MDX needs `mdxJsx*` handling; elements mapped to a component lose their `.mdx` stamp in the DOM unless the component spreads props, but the fiber keeps it.
8. Server components are visible only as `{name, env:'Server', props, stack}` records (`_debugOwner`/`_debugInfo`), never as fibers.
9. The repo's Next host stamps nothing today (`src/hosts/next-config.ts:10`); a single loader file worked for both webpack and Turbopack in the spike.

## Not run (UNVERIFIED)
React 18 hook surface; Next SWC plugin; webpack dev with compiler at runtime; webpack `output:'export'`; Next HMR id stability; `transpilePackages`/workspace/PnP shapes; a positive control for the hydration-warning detector; owner/stack contents of hoisted constant elements under the compiler; `_debugStack` source-map fidelity through the compiler.
