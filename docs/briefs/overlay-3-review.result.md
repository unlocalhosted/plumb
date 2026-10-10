# Overlay layer 3 review

Reviewed the layer brief, complete working-tree diff, new browser modules, resolver, tests, and React 18 fixture. Findings ranked by severity. All six findings below are **VERIFIED** through code and the specified probes; browser evidence came from connected Chrome against disposable fixtures.

## 1. P1 — Runtime filtering can confidently locate the wrong element

**Location:** `overlay/src/locate.js:24`, `overlay/src/locate.js:47`, `src/session/source-location.ts:43`.

**Failing scenario:** An authored module named `src/react-dom-helper.jsx` exports:

```jsx
export function renderLeaf() {
  return <span id="helper-leaf" className="gap-[13px]">leaf</span>;
}
```

A different module renders it through an expression in an opening tag:

```jsx
function App() {
  return <section className="py-[10px]" children={renderLeaf()} />;
}
```

The filter matches `react-dom` anywhere in the complete stack-frame string, discards `renderLeaf`'s authored frame, and selects `App`'s caller frame. The resolver accepts that expression as belonging to the section's opening tag. **Real React 19 browser result:** selecting the span returned `src/helper-entry.jsx:1:143`, `tag: "span"`; that source position is the **section**, and `site(span)` returned `py-[10px]` instead of the leaf's `gap-[13px]`. This directly violates the no-guessing requirement. Filenames/component names containing other filter substrings have the same classification weakness.

**Smallest fix:** Parse frames first and classify runtime frames by actual package/module paths and exact runtime symbols, rather than substring matches against authored filenames. Retain the first authored frame; refuse when it cannot be mapped. Include the expected host tag in server anchor validation so a span cannot silently resolve to a section. Add this complete helper-rendering scenario as an integration/browser regression.

## 2. P1 — Permanent URL caches can return stale, valid-looking locations after HMR

**Location:** `overlay/src/sourcemap.js:36`, `overlay/src/sourcemap.js:40`, `overlay/src/sourcemap.js:49`, `overlay/src/sourcemap.js:109`; `src/session/index.ts:302`.

**Failing scenario:** A script/map keeps its URL while an HMR update changes its mappings or source ordering. All three cache layers retain the first result indefinitely, including cached failures. The resolver parses the current file but receives no map/source version and merely checks whether the old coordinate lies in *some* current JSX opening/closing tag.

**Verification:** Real HTTP fixture `/bundle.js` initially mapped its first frame to `src/App.tsx:1:26` (`mappings: "AAAyB"`). Changing the served map to line 2 (`"AACyB"`) and calling `mapFrame` again returned **line 1**; the script fetch count remained **1**. `Session.resolveSource` accepted that stale coordinate although the updated map identified the button on line 2 and line 1 identified a different div. Cached `null` also prevents recovery after a temporary missing map. This is especially relevant to stable webpack virtual module URLs; Vite timestamped script URLs do not solve stable external-map URLs or unbounded retention.

**Smallest fix:** Give script/map caches an explicit host HMR invalidation/version boundary; clear script text, map data, decoded script entries, and cached failures together. Bind resolution to a source snapshot/hash or verified `sourcesContent` and refuse a mismatched snapshot rather than correcting an obsolete position against current JSX. Bound cache lifetime/size.

## 3. P1 — Parent site selection includes JSX nested inside its props

**Location:** `src/session/source-location.ts:58`, `src/session/source-location.ts:66`; `src/session/worker.ts:71`.

**Failing input:**

```jsx
export const App = () => <div id="parent" children={<span id="child" className="gap-[13px]" />} className="py-[10px]" />;
```

The parent's opening-tag range contains the entire nested span expression. Testing declaration offsets against that range therefore includes the child, despite the promised descendant exclusion.

**Verification:** Real Session queries returned `src/App.tsx:1:26` for the div and declarations **`["gap-[13px]", "py-[10px]"]`**. Querying the span at column 53 correctly returned only `gap-[13px]`. Parent selection thus presents another element's findings as its own. Ordinary nested children outside the opening tag pass the existing tests and do not cover this case.

**Smallest fix:** Associate each declaration with its nearest owning JSX opening element, or subtract nested JSX opening ranges from parent attribute ranges. Share this ownership selector across site and edit queries. Preserve the null/no-choice behavior for forwarded `className` values whose text belongs to a caller.

## 4. P2 — Located element coordinates cannot retrieve its edit choices

**Location:** `src/session/worker.ts:123`, `src/session/worker.ts:164`; `src/session/source-location.ts:58`.

**Failing scenario:** Call `resolve`/`locate`, then pass its `{file,line,column}` to `edits`. `site` understands opening-tag coordinates through `jsxSiteMatcher`; `edits` instead uses the old exact declaration-column index. Styling tokens start later than `<`, often on another line.

**Verification:** For `export const App = () => <div id="a" className="py-[10px]" ...`, resolve returned column **26**, site returned `py-[10px]`, but edits at column **26** returned **zero choices**. Requesting the token's own column returned **two**. Dropping the column would combine same-line siblings and does not preserve element identity.

**Smallest fix:** Use the same owning-element selector for opening-tag edit queries, while retaining exact-token and line-only query behavior. This requires no transport change. Cover locate-to-site-to-edits-to-apply as one integration feature slice.

## 5. P2 — Every resolve/edit request performs O(project files) filesystem work

**Location:** `src/session/index.ts:201`, `src/session/index.ts:208`, `src/session/index.ts:212`, `src/session/index.ts:296`, `src/session/index.ts:280`.

**Failing scenario:** Repeatedly point at elements on a large project. `resolveSource` calls reconciliation, which constructs a set containing every retained hash and stats every known file plus retained directories. The following site/edit request reconciles again. This remains project-wide work even when no glob, parsing, or worker restart occurs.

**Verification:** With 200 extra source files and **204 retained files**, one unchanged resolve produced **210 `lstat` calls**; one unchanged edit read also produced **210**. The small fixture produced 10. Code explicitly states that every known file is checked on every read. Consequently warm-report reuse does not satisfy the brief's “no O(files) work per request” requirement. Resolve also rereads/reparses the target's complete JSX each time.

**Smallest fix:** Separate background inventory/stat recovery from request reconciliation. In a healthy watcher mode, drain queued events and validate only the target plus its known query/config dependencies; retain explicit/background full reconciliation for recovery and polling. Reuse the target snapshot's cached AST/anchor ownership table. Define the freshness policy for watch-disabled operation instead of paying a global scan on every pointer request.

## 6. P2 — Source-map preparation blocks the browser; webpack discovery repeatedly scans chunks

**Location:** `overlay/src/sourcemap.js:22`, `overlay/src/sourcemap.js:59`, `overlay/src/sourcemap.js:75`, `overlay/src/sourcemap.js:79`, `overlay/src/sourcemap.js:97`.

**Failing scenario:** First locate on a large Next page fetches whole scripts/maps and eagerly allocates every decoded segment on the main thread. Index maps prepare all sections, including unrelated ones. For each previously unseen webpack virtual module URL, discovery again scans the page's script list and JSON-decodes eval bodies until it finds that module. Script text is cached, but the virtual-module lookup index is not. Lookup within a row is a reverse linear scan.

**Verification:** In real Chrome, a synthetic HTTP source map with **300,000 segments** (about **1.5 MB** JSON) took **294.9 ms** for cold `mapFrame` and emitted a **103 ms browser long task**. A warm lookup took **2.8 ms**; these are one-machine fixture measurements, not a production Next benchmark. Actual webpack and Turbopack location probes passed on a small page, which does not establish large-page responsiveness. Code inspection confirms repeated webpack eval scanning and eager section preparation.

**Smallest fix:** Index virtual modules once per fetched chunk/version, lazily load/decode only the requested index section/row, and use binary search for generated columns. Move unavoidable large parsing/decoding into a worker or bounded yielding work. Add version-aware eviction and cancellation so pointer movement does not queue expensive obsolete work.

## Checks and limits

- Built the disposable working-tree copy with `npm run build`: **passed**. Ran the requested locate test command with only the copied test's Chromium launch path changed: **2 HTTP/map tests passed, 4 browser tests failed at launch**, not assertions. The supplied executable failed with `MachPortRendezvousServer ... Permission denied (1100)`; no failures were converted to skips.
- Used connected Chrome as browser fallback. Real Vite React **19** and isolated React **18** fixtures located authored host elements correctly for helper components/HOCs, memo, forwardRef, portals, lazy children, StrictMode, module-level reused JSX, and ordinary nested elements. An imperative child returned null; forwarded class props yielded no borrowed caller declarations. The separate React 19 Suspense fallback and resolved lazy child located to their respective authored tags. The runtime-filter failure above is a separate verified counterexample.
- Real installed Next **16** webpack and Turbopack fixtures passed nine explicit/nested/list/fragment/forwarded/multiline location-and-site probes each. Server-rendered App Router `article#rsc` returned **null** in both hosts, rather than claiming the nearby client element's location. This is safe refusal, not server-component editing support.
- `node --test e2e/edits.test.mjs e2e/hosts.test.mjs`: **31 passed, 0 failed**. Covers stable IDs, UTF-16/CRLF, stale/unknown/overlapping/duplicate refusals, concurrent requests and save/symlink races, named-file protection, tracked CSS edits, theme/config/`.plumb`/traversal/symlink/hard-link refusal, incremental refresh, and Node/Web transport parity.
- Additional feature-slice probe applied `className={"py-[10px]"}`, `cn("py-[10px]")`, and a static template literal in one file with café/emoji and CRLF. All three offered exact authored ranges, applied correctly, and preserved CRLF. A separate two-edit apply made **one `writeFile`**, **one worker refresh**, revision **1**, and matching apply/health/edit hashes. Warm unchanged edit reads did not increase full-report, full-index, or local-analysis counters. These passing cases do not remove the global-stat cost above.
- Token-less checks reject DNS-rebinding Host, mismatched/missing POST Origin, cross-site/same-site `Sec-Fetch-Site`, and foreign preflight; token/CORS behavior and shared Web adapter checks passed. No new cross-origin write bypass found.
- Outside-root resolve probes against an existing and nonexistent absolute file both returned **400**, the identical generic refusal, and **zero `lstat` calls**. `sourcePath` rejects escape before reconciliation or filesystem access. No outside-file existence oracle found in that route.
- Inline base64/percent maps, relative URLs, `sourceRoot`, nested section maps/section URLs, unmapped spans, malformed maps, and missing maps passed the real HTTP integration checks. Real webpack exercised eval maps; Turbopack exercised its emitted maps.
- **PLAUSIBLE / unverified compatibility limits:** no real React Compiler-generated fixture or third-party CSS-in-JS/pre-bundled component fixture was executed. Runtime/dependency-only stacks should safely return null, but source-map provenance collisions and compiler call-site mappings need actual transformed-host regression fixtures before claiming support. The existing six locate tests do not cover these cases or the confirmed wrong-element/stale-map scenarios. Dynamic template/conditional values beyond statically evidenced occurrences were not claimed editable.

## Extension seams

The transport seam is already present: `createHandler` and `createWebHandler` share `createRoute` and `dispatch`; Vite and Next use those adapters. No duplicate dispatch or additional framework transport rewrite is needed.

The missing seams are an owning-element **target selector shared by site and edits**, a **versioned source/AST snapshot** to validate coordinates, and a **host-aware map store** with invalidation, virtual-module indexing, and lazy/worker decoding. `StructuredEdit`'s exact `{start,end,from,to}` and stable IDs already let apply remain syntax-independent. `replacement` centralizes existing class/inline/CSS/`@apply` spelling; adding rule families or syntax-specific builders can stay behind that boundary without changing HTTP/Web/stdio contracts. Snapshot/ownership validation must precede expanding syntax coverage.

No source edited; no commit created, as instructed by the layer brief. Temporary test copies and servers removed after review. Compared original `src`, `overlay`, package/TypeScript configuration and focused committed tests against the initial disposable copy: unchanged.

**Verdict: ship after fixes.** Findings 1–3 block reliable element identity; findings 4–6 block the intended edit flow and request-cost requirements.
