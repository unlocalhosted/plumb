# Plumb live editor: low-level design

Design dated 2026-10-12. Implements the direction in [VISION.md](../VISION.md); describes future work, not features already shipped. Source review and primary-source web research only. No browser, app server, test suite or timing harness was run. All downstream app inspection was read-only.

## 1. Decisions and binding contracts

Build one editor around **versioned authored ranges**, with one pending source transaction and one writer. Runtime observations select source; they never replace source. Every preview must carry the exact pending diff that will produce it. Runtime state exploration and captured images are visibly labelled observations, not writable source changes.

1. **Identity:** dev source stamping is layer 0 and the primary exact mechanism. Emit `data-plumb-source="file:line:col#hash"` on tracked host **and component** JSX, last on each opening. Bind stamps to JSX creation records; copied DOM attributes cannot establish identity. Retain the current owner chain only as fallback. Do not implement the competing content-matching, generated-call recovery or map-distance approaches in the earlier [locate-anchoring design](locate-anchoring-lld.result.md). Its copying, SSR and version warnings remain relevant; its priority order, opaque-attribute recommendation and host-only restriction are superseded by this brief.
2. **Reading:** show authored values and their provenance, including valid values. Findings remain attached judgements; they are not the inventory of editable things.
3. **Writing:** generalize the existing exact-range engine. Client submits typed intent against a server-issued target; server derives bytes. No arbitrary filesystem patch endpoint.
4. **Preview:** use temporary DOM styles only where they faithfully represent a source edit. Otherwise compile the pending authored diff through the project's dev pipeline in memory. No DOM surgery, durable override stylesheet, duplicate implementation of a component or automatic save on drag.
5. **State:** DevTools-style inspection is an observation lane. Replay uses a recorded action/effect session with explicit project adapters in an isolated realm. Restoring fiber fields is rejected as replay.
6. **Motion:** seek actual runtime animations where supported; source mapping and source writes still require authored evidence. A plausible spring curve alone is not proof of the component's motion.
7. **Delivery:** finish identity, reading, source writing, then each handle separately. Layers 4–7 share the same contracts, but have explicit capability gates and research boundaries.

### Invariant checks

| Contract | Enforcement | Rejected shortcut |
| --- | --- | --- |
| Exact positions only | Tracked real path, creation provenance, full source hash, exact opening, AST target, original range bytes; all rechecked before Write | Closest line, unique text, nearest owner or DOM signature as write proof |
| Source is the truth | Pending operations materialize into a visible minimal source diff; compiled previews consume that diff; removing the draft restores source execution | Persistent runtime prop/state overrides; exporting a second UI model |
| Preview before write | Only a currently displayed, acknowledged draft version can be written; Before and Undo are always available until writing starts | Disk writes used to obtain the preview; writing a diff newer than the displayed preview |
| Design system leads | Resolve project decisions/contracts first; snap by token identity; off-scale changes remain marked and enter normal ledger analysis | Inventing a scale or variant; silently replacing semantic tokens by equal-valued primitives |
| Dev only | Build-time exclusion in every adapter, runtime production refusal, test-mode exclusion, no instrumentation saved to source | Production no-op code that still imports the editor or exposes routes |

The preview exception is narrow: transient, visible changes backed by the pending authored diff. Inspection overrides such as a forced hover or replay checkpoint are labelled separately and cannot be written unless converted into an explicit, previewed source operation.

## 2. Current code and gaps

### Locate, maps and exact confirmation

- [overlay/src/locate.js](../../overlay/src/locate.js): `hostOf` finds the nearest React-owned host, so an injected SVG descendant belongs to its containing authored host. `currentFiber` follows committed root children through alternates. `stackOf` and the `Object.defineProperty` interception associate React 19 element `_debugStack` records with props; `creationFrame`, `framesOf`/`readFrames`, `stackHashes` and `locate` retain and confirm evidence. `locate` asks `resolve`, returns an innermost-first chain and defaults to a non-shared usage file. Existing map/owner evidence must not be silently promoted into stamp evidence.
- [overlay/src/sourcemap.js](../../overlay/src/sourcemap.js): `SourceMapStore.original` resolves the preceding segment on the requested generated row, hashes `sourcesContent`, and handles indexed maps. `moduleIndex` decodes webpack eval strings without execution. Caches have a 64-entry/60-second bound; decoding yields near 4 ms. `mapFrame` delegates to the worker with a yielding fallback; `invalidateSourceMaps` changes generations. Next hot-update tracing can return coordinates without original bytes. Stamping removes these map costs from the primary locate path, not from fallback diagnostics.
- [src/session/source-location.ts](../../src/session/source-location.ts): `sourcePaths` normalizes host spellings; `snapshot` caches parsed oxc ASTs, anchors, calls and line starts for 64 texts. `jsxLocation` may canonicalize a position inside an opening; host mode may accept a closing. **Stamp resolve must additionally require equality with `opening.start`, not merely successful canonicalization.** `jsxSiteMatcher` scopes current site/edit reads to the exact opening; `jsxAuthoredOwner` proves some lexical local component bindings, not arbitrary dataflow.
- [src/session/engine.ts](../../src/session/engine.ts): `resolveFile` and `resolveSource` enforce tracked membership, containment and real paths. Hash-bearing resolve rereads disk; stale hashes refuse. Reuse those gates for stamps and targets.

### Read, preview and write

- [overlay/src/widget.js](../../overlay/src/widget.js): `pin` retains element, initial style attribute and pending UI state; `#readAt` fetches `site` and `edits`, then `classes` for computed classes. `#computedReading` refuses ambiguous class origins and points to other files. `#step` switches owner links and lifts the previous preview. `#preview` applies chosen values as inline `!important`, retaining value and priority; `#restore` removes residue, including Chromium's lazily serialized empty style attribute. `#flip` implements Before; `#undo` clears previews. `#write` posts file/hash/edit IDs; `#reread` waits for class/hash change and can retain a preview with a reload message. These assumptions do not cover prop-only writes, text, replacement nodes or simultaneous app style updates.
- [overlay/src/model.js](../../overlay/src/model.js): `reading` turns findings into marks, attaches matching exact edit IDs and chooses only a single unambiguous choice. It retains chain/index/hash. Extend the model without changing the meaning of findings or manufacturing choices.
- [src/surfaces/edits.ts](../../src/surfaces/edits.ts): `replacement` preserves supported utility variants/importance and converts inline/CSS values to decision uses. `structuredEdits` verifies `source.slice(start,end) === from`; its ID hashes file/range/from/to. It handles only supported findings, not all literals. It preserves stylesheet comments/importance by replacing the value range.
- [src/session/worker.ts](../../src/session/worker.ts): `index`, `scoped`, `localReport` and `dispatch('edits')` scope analysis, derive edits and protect configuration/theme files. Class tracing returns `ambiguous`, `unattributed` and hard-limit information. These remain explicit refusals, not confidence scores.
- `engine.Session.edits` checks worker hash against the session. `Session.apply` rereads disk, re-derives IDs, rejects overlap, checks regular-file identity/no hard links, opens with `O_NOFOLLOW`, verifies bytes through the held descriptor, writes replacements in reverse order, truncates and reconciles. Preserve its gates. It is currently single-file, in-place and not crash-atomic; holding a descriptor does not lock out another editor.

### Session and hosts

- [src/session/index.ts](../../src/session/index.ts): the public host `Session` owns admission, messaging and a cached health snapshot. `call` caps pending requests at 512, gives reads a default 5-second admission deadline and removes the timer on `started`. `apply`/`refresh` have no admission expiry. `health` does not invoke the analysis pipeline.
- [src/session/coordinator.ts](../../src/session/coordinator.ts): `drain` groups adjacent reads under `engine.Session.batch`; mutations form barriers. `execute` serializes HTTP read bodies before messaging the host. Add draft mutations to this classification explicitly; otherwise a new mutating method would accidentally be treated as a read.
- The engine owns reconciliation and its analysis worker; [worker.ts](../../src/session/worker.ts) owns collection/judgement/target parsing. Keep AST walks, diffs, serialization and replay analysis out of the dev-server main thread.
- [src/session/server.ts](../../src/session/server.ts): `dispatchRequest`, `createRoute`, `createHandler` and `createWebHandler` share validation, loopback/origin/token protection, a 1 MiB POST bound, startup/failed responses and busy `503` with `Retry-After: 1`. New routes must use these boundaries.
- [src/hosts/vite.ts](../../src/hosts/vite.ts): `plumb` currently installs middleware and HTML scripts only; it has no JSX transform. It retains a warm session across restarts and resolves explicit project root separately from Vite's served root. Preserve that distinction for MetalUI's monorepo.
- [src/hosts/next-config.ts](../../src/hosts/next-config.ts): `withPlumb` currently changes dev page extensions/external packages, not compilation. [next.ts](../../src/hosts/next.ts) exports dev-only `createPlumbRoute`/`PlumbOverlay`; [next-dev.ts](../../src/hosts/next-dev.ts) creates the lazy handler. Stamping and draft invalidation are new host capabilities.
- [health-burst.result.md](health-burst.result.md) requires HTTP reads to remain serialized strings through the host, with unchanged queue/deadline/busy semantics. Its three overlapping health probes target less than 100 ms under the 300-read burst. Its recorded results do not establish new editor performance or downstream browser acceptance.

### MetalUI interaction source

Read-only references: [EDITING_LAYER.md](/Users/vijaysingh/unlocalhosted/metalui/docs/EDITING_LAYER.md), [edit/index.tsx](/Users/vijaysingh/unlocalhosted/metalui/apps/docs/src/ui/edit/index.tsx), [edit/edit.css](/Users/vijaysingh/unlocalhosted/metalui/apps/docs/src/ui/edit/edit.css).

Bring over the rules and geometry, not the React implementation wholesale. `useHandle` supplies pointer capture, zoom-aware deltas, arrows and external hint placement; `STEP_AT = 7` supplies discrete lean/snap distance. `snapTo`, `Readout`, `summon`, `Outline`, `CornerArc`, `useOnLand` and `blip` explain catching, focus transfer and restrained highlighting. `useStepMotion` uses project part/release springs. Its per-move rAF scheduling, `Readout`'s repeated `flushSync` and layout-property transitions need different performance treatment in a general overlay. Never stretch a discrete-size component between variants.

## 3. Shared data model and module boundaries

Proposed files below do not exist yet. Keep `source-location.ts` responsible for source identity; add `src/editor/targets.ts`, `operations.ts`, `drafts.ts`, `writer.ts` and a pure `patches.ts`. Host-specific stamping/compile adapters belong under `src/hosts/`. Browser selection/handles/receipts belong under `overlay/src/editor/`. Replay and motion adapters are separate capabilities, not methods bolted onto the locator.

```ts
type FileVersion = {
  file: string;              // canonical project-relative POSIX path
  hash: string;              // full SHA-256 of authored UTF-8 text
  generation: number;        // host compile generation; not the session revision
  basis: 'disk' | 'draft';
  draftId?: string;
  draftVersion?: number;
};
type AstStep = { field: string; index?: number };
type SourceAnchor = {
  version: FileVersion;
  stamp: string;             // encoded file:1-based-line:1-based-col#hash
  openingStart: number;
  openingEnd: number;
  tag: string;
  path: AstStep[];           // exact AST path in this hash only
  nodeHash: string;          // hash of exact node bytes, including trivia
};
type EditableTarget = {
  id: string;
  anchor: SourceAnchor;
  kind: 'literal' | 'class-token' | 'prop' | 'text' | 'jsx-node';
  path: AstStep[];           // relative to anchor, or proven definition binding
  range: { start: number; end: number; fromHash: string };
  sourceSpelling: string;
  value: unknown;
  domain: { family?: string; unit?: string; min?: number; max?: number };
  decisionRefs: string[];
  semanticBinding?: string;  // exact resolved lexical/import binding
  effects: 'style' | 'render' | 'structure' | 'unknown';
  scope: 'site' | 'definition';
  dependentSites: string[];  // known users, plus explicit unknown-coverage flag
  proofId: string;
  capabilities: string[];
};
type EditIntent = {
  targetId: string;
  operation: 'replace-literal' | 'replace-class' | 'set-prop' |
             'set-text' | 'insert' | 'remove' | 'wrap' | 'move';
  value?: unknown;
  decisionId?: string;
  choiceId?: string;
};
type Draft = {
  id: string;
  version: number;
  parent?: { id: string; version: number };
  base: FileVersion[];
  dependencyHashes: { file: string; hash: string }[];
  operations: EditIntent[];
  patches: { file: string; start: number; end: number; from: string; to: string }[];
  candidateHashes: { file: string; hash: string }[];
  decisionsHash: string;
  historyCursor: number;
  status: 'pending' | 'compiling' | 'displayed' | 'conflict' |
          'writing' | 'written-awaiting-reload' | 'complete' | 'failed';
};
type PreviewReceipt = {
  id: string;
  draftId: string;
  draftVersion: number;
  candidateHashes: { file: string; hash: string }[];
  decisionHash: string;
  realmId: string;
  rootId: string;
  instanceId: string;
  environmentHash: string;  // theme, viewport, forced state, reduced-motion mode
  mode: 'fast-equivalent' | 'compiled';
  observedCommit: number;
  before: boolean;
};
```

Ranges and columns use the current source pipeline's UTF-16 string indexing, 1-based lines/columns and half-open offsets. Hashing uses `sourceHash` from [src/collect/cache.ts](../../src/collect/cache.ts), over untouched UTF-8 text with BOM and CRLF preserved. Each parser adapter must expose UTF-16 positions; if a parser supplies byte spans, build a byte-to-UTF-16 table once. Non-ASCII, astral characters, CRLF and BOM fixtures must prove this at HTTP and browser boundaries. Never add one twice to bippy's zero-based columns.

Target identity is `SHA256(schemaVersion, canonicalFile, fileHash, openingStart, path, kind, exactRangeBytes)`. AST path aids resolution, not durability. After an arbitrary editor save, the old target is stale even if its path still exists and its bytes look identical. Only Plumb's own verified patch map may carry an unchanged node into a new candidate version; ambiguous duplication, deletion or replacement requires reselection.

Runtime instances are separate: `{realmId, rendererId, rootId, mountId, commitId}`. A single stamped JSX in a loop produces many instances. A source edit applies to that authored site or definition, never silently to only the clicked list item. Show known affected instances and definition scope before preview. Portals use React ownership, not DOM ancestry. Keys assist instance continuity, but keys alone are not source identity.

### Proposed HTTP contract

All payloads are versioned and use the existing authentication/origin/body-bound path.

- `GET targets?stamp=...&proof=...`: return target inventory, decision version, read-only observations and refusal reasons. Bounded response scoped to one opening, with pagination for large trees.
- `POST draft`: `{base, intents, expectedDraftVersion?}`; server validates target IDs, derives patches and returns draft version, exact diff, candidate hashes and preview plan. Mutation barrier.
- `POST preview`: `{draftId, version, mode}`; acquires preview lease and activates the validated candidate. Mutation barrier; compilation work runs outside the HTTP host.
- `POST preview-receipt`: validated same-session acknowledgement of a displayed version. Receipt is authorization for this UI workflow, not a security guarantee against the trusted local developer forging their own browser.
- `POST draft-history`: undo/redo/branch activation with expected version. Mutation barrier. Changes preview, never disk.
- `POST apply-draft`: `{draftId, version, receiptId, transactionId}`. Re-derive operations against current source/decisions, compare hashes and candidate digest, then use the common writer. Idempotent transaction ID; no automatic repeat on timeout.
- `POST discard-draft`: deactivate preview first, restore baseline, then release draft memory.
- `GET transaction?id=...`: recover status after lost connection; distinguish no write, complete write, partial write and awaiting reload.

Existing `site`, `classes`, `edits`, `apply` stay compatible. The old `apply` still re-derives its existing edit IDs; both writers share file/range validation. Do not let either public API route around new protected-definition rules. GET target reads use `readJSON`; new mutation/receipt bodies must also be serialized in the coordinator if potentially large. Host parses only bounded request envelopes and writes response strings unchanged.

## 4. Layer 0: source stamping, fully specified

### 4.1 Transform

Expose an explicitly enabled dev identity option, then make it the recommended live-editor configuration. Share one pure transform across Vite and Next.

1. Gate on development **serve**, not preview/build. Skip Vitest (`config` test mode and Vitest environment), production, dependencies, Plumb itself, virtual IDs, generated output, untracked files, aliases escaping root and hard-linked/symlinked edit targets. A tracked local package under the canonical project root is eligible even when served from a monorepo subroot. Membership comes from the same project inventory as `resolveSource`; publish a bounded membership snapshot to the transform instead of synchronously calling the full session per module.
2. Normalize only the module identifier/query for membership. Read the original file snapshot; require incoming transform bytes to match that snapshot exactly before instrumentation. `enforce: 'pre'` is necessary but insufficient: validate ordering against other pre transforms. If another transform moved JSX first, refuse stamping and report that compiler boundary. Generated MDX is unsupported until an adapter proves authored correspondence.
3. Parse JSX once. For every `JSXOpeningElement`, including member/namespaced/custom tags, use the **original** opening `<` position. Fragment shorthand has no attribute and is handled through its children/owner; do not invent a DOM anchor.
4. Encode the canonical project-relative path with percent escapes for delimiters (`:`, `#`, `%`, quotes, control characters), preserving `/`. Append the 1-based original line/column and full lowercase SHA-256: `src/Card.tsx:18:5#<64 hex digits>`. Decode strictly on resolve; reject malformed or noncanonical spellings. No absolute user-directory path in HTML.
5. Insert ` data-plumb-source="..."` immediately before `>` or `/>`, after every authored attribute/spread. Both `<button {...props}>` and `<Button {...props}>` get stamps. An authored occurrence of the reserved attribute is a collision: disable stamping that module with a diagnostic; never silently rewrite the author or produce duplicate explicit attributes.
6. Record `{fileHash, original opening range, AST path, tag, output generation, transform schema}` in a bounded manifest. Apply insertions from right to left, preserve comments/directives and emit a high-resolution composable map with untouched authored `sourcesContent`. Instrumentation ranges are unmapped; they must not point to nearby author text.
7. Establish creation provenance as described next. Return transformed code only; source disk remains untouched. Parse failure leaves code to the host's ordinary error overlay and disables editing for that module.

Use the host's parser mode from file extension and preserve JSX runtime settings. Avoid selecting Babel merely because JSX exists; the current oxc AST already provides openings. A localized string editor/source-map generator is enough for inserted ranges; validate the chosen dependency in the first stamping slice. Vite documents `enforce` ordering and source-map composition in its [Plugin API](https://vite.dev/guide/api-plugin). This design additionally requires original-byte validation.

### 4.2 A stamp must prove its birth

The literal attribute is the owner's required interface, not a secret or a proof by itself. A component can forward its stamp onto a library host; `cloneElement`, Slot/asChild, copied HTML and manual DOM mutation can copy it. Hashing proves the snapshot, not which JSX created the selected host.

At the same pre-transform boundary, wrap authored JSX expressions with a unique imported dev helper, conceptually:

```tsx
__plumbBirth(<Button size="small" data-plumb-source="src/A.tsx:8:3#..." />,
             { stamp: "src/A.tsx:8:3#...", siteId: "...", generation: 17 });
```

The real output must preserve evaluation order and nested JSX semantics. A range-aware recursive emitter places wrappers around complete `JSXElement` expressions without overlapping insertions. Wrapping an element does not change its type, key, ref or props. Put the helper import after directive prologues, choose a collision-free local name, and do not add hooks. The helper returns the original React element and records weak associations for **element identity and props identity**, with its original JSX type and manifest site. Module registration authorizes those manifest entries for the session. Old births retain old generations; no strong retention of props/elements.

`locate` obtains the committed host fiber, reads `memoizedProps` birth metadata and corroborates its own stamp. For a host record, original JSX type must equal the fiber's host type and exact manifest opening tag. For a component record, the original type/binding identifies a usage link; it cannot prove that component's returned host was authored there. A library host with a forwarded component stamp therefore yields a labelled exact **usage** link, not a host-creator claim. Multiple provenance records for one props object are ambiguous and refuse.

Clones with fresh props lack birth metadata and cannot adopt a copied attribute as creator evidence. A supported clone/Slot adapter may retain an explicit relation to the original element and distinguish original host creation from wrapper usage; otherwise use the independent owner-chain fallback or refuse. For a stamped element with stale/mismatched birth, do not use its invalid stamp to select a convenient owner. The fallback must establish its own valid exact evidence and clearly identify its scope.

This is one stamping mechanism with integrity checks, not a stack of guessing strategies. The weaker DOM-only alternative is rejected. The helper also replaces the need to grow the global `Object.defineProperty` interception for identity; keep current interception only for fallback until its migration is independently verified.

Component stamps alter dev props and may affect components that enumerate all props or forward them to strict custom elements. Diagnose unsupported component contracts; do not silently claim production parity. Explicit final host stamps prevent tracked host spreads from overwriting host provenance. Weak birth metadata prevents untracked forwarded props from borrowing it.

### 4.3 Server confirmation and HMR

Extend resolve with a stamp-specific method/validation branch. It verifies canonical inventory membership, manifest registration, file hash, original exact opening start/type and target node hash. Disk-backed stamps always compare current disk bytes, even if session stat caches say unchanged. Preview-backed stamps compare their candidate hash plus draft base/dependency hashes; their `basis:'draft'` proof is never accepted as disk identity on Write.

Every host module compile has a generation. A new source hash gets a new manifest generation; a repeated compile of identical bytes may reuse immutable source records but cannot replace old births. Cache by session/file/hash/site/generation. Keep records for active previews and outstanding locates; evict unused versions by memory bound. Expired evidence returns `evidence-expired`, never rereads a new map into old evidence.

HMR sequence: freeze active gestures; mark receipts obsolete; invalidate target/read caches for changed hashes; compile/stamp new bytes; await actual committed new births; repin only through a verified source patch map and surviving instance. On external changes, show conflict and require fresh selection. A retained memoized element with the old stamp refuses even if its coordinates still land on JSX. `vite:afterUpdate` alone is not a commit receipt.

### 4.4 Vite

Add an early identity plugin (`apply:'serve'`, `enforce:'pre'`) alongside the existing middleware/HTML plugin; validate resolved order in `configResolved`. Preserve the current effective project root, warm-session ownership and nonblocking host startup. Registration is an incremental manifest message, not a synchronous full report. If membership is still starting, the module is unstamped/read-only until invalidated for a later compile; do not block Vite startup on analysis.

For SSR-enabled Vite, run exactly the same original-byte transform on both client and SSR module graphs with deterministic stamps. The birth helper is environment-neutral and performs no network or DOM work during server evaluation. Its weak records are local to the server process; they do not magically transfer to client hydration.

### 4.5 Next webpack and Turbopack

`withPlumb` must preserve user configuration and install adapters only when Next reports development. Add package exports for loader/runtime in a future implementation, never write adapter code into an app automatically.

- **Webpack:** append a development `enforce:'pre'` rule for tracked JS/TS/JSX/TSX, using the shared loader and Next's `dev`/server compiler information. Loader validates original bytes, returns code/map through `this.callback` and declares exact file dependencies/cache keys. Run before SWC/React compilation in client, server and RSC graphs; preserve custom user `webpack` callbacks by invoking them and validating the final effective ordering. Fail with a capability diagnostic if a loader already transformed the original. Do not patch generated chunks. [webpack loader interface](https://webpack.js.org/api/loaders/), [Next webpack configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/webpack).
- **Turbopack:** install development `turbopack.rules` for the same extensions using a plain-options webpack-compatible loader. Do not assume the webpack callback affects Turbopack. Loader needs only input text, supported read access and code/map output; no `emitFile`, `loadModule`, custom plugin objects or webpack compilation hooks. Configure canonical tracked-root rules and verify execution before SWC. Membership data is bounded immutable configuration plus worker-side validation, not a live coordinator function serialized in loader options. Turbopack supports only a subset of the loader API; returning stamped JSX for downstream JS compilation must be proven on each supported Next version, including cache invalidation and maps. If rule chaining cannot guarantee untouched input, mark stamping unsupported instead of claiming it works. [Next Turbopack rules and restrictions](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack).

Identity can be sound through a supported loader even when general compiled-draft invalidation is unavailable. Expose these as separate capabilities. Pin supported Next/compiler versions in the adapter manifest; an undocumented hot-reloader interface is never treated as stable public API.

### 4.6 SSR, RSC, hydration and production

Identical server/client bytes generate identical stamps, regardless of build graph or helper import paths. Server/client snapshot disagreement causes refusal until reload; do not use `suppressHydrationWarning`. Streaming/Suspense chunks keep the hash of the source that produced them.

Before hydration, DOM stamps are **hints only**: Plumb has no client birth proof and cannot distinguish injected/copied markup. Hydration of ordinary client-rendered JSX produces client birth associations and enables exact editing. RSC-only output may never execute JSX in the client. Full write-capable RSC provenance needs a versioned server creation receipt tied to the emitted Flight/HTML element and a verified transfer into the client instance. That transport binding is research; server manifest plus a DOM attribute alone is insufficient. Until proven, RSC-only nodes are read-only with exact source candidates labelled unconfirmed. Their independently proven client component usage links remain usable.

Production adapters return untouched input and omit helper imports, manifests, overlay scripts, routes and preview storage. A production runtime request refuses as defense in depth. Vitest runs also return untouched input; future Playwright feature fixtures explicitly run dev stamping. Snapshot serializers are optional project choices, never silently installed. Production and test absence are acceptance checks, not claims established by this design run.

Cost: O(file bytes + openings) per cold transform, O(1) weak birth recording per executed JSX, O(owner depth) stamped-chain lookup, one batched resolve for the selected chain. Attribute bytes grow with path/hash length; cap manifest memory rather than dropping the full hash. No full-project parse on hover.

## 5. Layer 1: a coherent reading

Return one hash-coherent target snapshot containing authored class tokens, inline style members, literal props, literal text and JSX child structure, with source spellings and offsets. Attach resolved decisions, usage/definition scope, current component chain and cascade observations. Merge `site`/`edits` only when their hashes/revisions agree; the current parallel fetch alone does not ensure that.

Cascade rows separate **authored declaration**, **runtime match**, **computed result** and **override reason**. Browser observation includes active media/container conditions, specificity/importance/layer, inheritance, shorthand expansion and pseudo-element. Mapping a CSS rule back to a file requires exact stylesheet AST provenance or a supported CSS-module adapter; matching a computed color to a unique token is not attribution. Cross-origin/unavailable rules stay visible as untraceable. Do not claim a complete cascade where access is blocked.

Computed classes retain current ambiguity semantics. A class helper's literal can be edited at its definition when exact binding/range is proved; selecting it means changing all users of that definition. If a live branch is not known, offer the proven candidate branches with source labels; no automatic choice. Fonts, unit conversion, theme and responsive scope are part of the reading. Equal numeric values with different semantic roles remain separate choices.

Show legal/off-scale/unknown-scale separately. With no project scale, mark `scale missing`; do not manufacture Tailwind defaults as accepted decisions. Off-scale source choices are represented as literal targets and appear in the normal ledger after Write; pending deviations appear as pending ledger observations. Do not auto-accept an off-scale value or write an acceptance into `.plumb/ledger.jsonl`.

Persisting that observation needs an explicit ledger extension: today `src/ledger/check.ts` `applyLedger` derives `new`/`debt`/`exception` status, and `src/ledger/store.ts` `writeLedger` saves reviewed entries; it does not automatically record every new finding. Add an unaccepted observation record keyed by source target, resulting file hash, rule and transaction ID, carrying value, decision context and origin `live-editor`. Include this metadata in the Write review and recovery journal. It must not increase accepted allowance, suppress findings or become baseline debt. Repeated writes update the observation idempotently; reverting source marks it resolved. If durable observation recording fails after a source write, report incomplete transaction and recover it before another off-scale Write. No ledger write on drag, Before or Undo; no implicit `accept`/`baseline` command.

## 6. Layer 2: edit semantics and composition

### 6.1 Exact operations, choices and refusals

| Target | Exact operation | Choice or refusal |
| --- | --- | --- |
| Numeric/string/boolean literal | Replace exact literal node, preserving enclosing expression and expected type; signed numbers include their unary sign | No nonfinite numbers, lossy bigint conversions or unknown units; no algebraic inversion of a computed result |
| Literal class token | Replace only that token substring; retain supported variant chain, negative sign and importance using `replacement` semantics | Repeated tokens have distinct ranges; ambiguous helper branch needs a choice; dynamic interpolation/unsupported modifiers refuse |
| JSX prop | Replace literal value; add/delete explicit attribute only when source precedence is proven | A later spread can override it: edit proven spread origin or explicitly choose adding after it; unknown precedence refuses; no duplicate props |
| Inline style member | Replace literal member value using exact property binding; serialize JS string or number according to React/CSS semantics | Shorthands, writing mode, computed keys and spreads need a proven member/choice; no arbitrary `!important` written to React style |
| Text node/string expression | Replace exact JSXText or literal string with correct escaping and whitespace semantics | Mixed nodes, translations, concatenations, formatted numbers and CMS values need explicit source selection; never write `textContent` back as guessed JSX |
| JSX node | Move/remove/wrap/insert exact structural span with ownership/trivia checks | Dynamic lists/branches/portals require source-tree selection; DOM sibling order is not authored order |
| Constant/recipe/token binding | Follow exact lexical/import definition and select its literal; disclose shared scope | Imported dependency outside tracked root is read-only; cyclic/computed/opaque bindings refuse |

Domain/schema checks precede rendering. Changing `size={16}` to `24` is exact only when 16 is that prop's literal and its type/domain allows 24; changing DOM width to 24 cannot infer that `size` caused width. Literal operands of arbitrary arithmetic remain exact source targets if explicitly selected in code, but their page effect is unknown until compiled preview. Never solve backward for a convenient operand.

Preserve numeric radix/notation where representable; otherwise show the changed spelling in the diff. Preserve string quote style and escapes where possible. For raw JSX text, encode `&`, `<`, `{` as needed and verify rendered whitespace; use a string expression only as an explicit operation when raw text cannot express the requested content exactly. Do not flatten sibling expressions.

Adding a token reference may require an import or a local CSS utility. Resolve the real symbol and avoid collisions; include every required import in the same draft. Never invent a token class that the project's compiler does not generate. A class preview using inline styles is provisional until the compiled utility is shown.

### 6.2 Draft composition

All operations refer to immutable base targets. Server builds a candidate tree/text in memory, then derives final patches against the base text. A gesture produces one history command; coalesced pointer moves replace its current value instead of appending thousands of operations.

- Two replacements of one target collapse to the latest value. Undo restores its previous draft value, not always the disk value.
- Disjoint ranges compose. At one insertion offset, use an explicit ordered insertion group, not arbitrary sorting.
- Changes to a node and its child compose only through an explicit structural operation that regenerates the selected subtree and retains child target mapping. Delete-plus-edit, independent ancestor/descendant patches and contradictory moves conflict.
- Cross-file drafts include every base hash and required import/dependency hash. Re-evaluate only touched source and declared dependents; no full-project collection per drag.
- Undo/redo move a command cursor and regenerate the displayed draft. A new gesture after Undo drops the redo suffix. Write seals that history epoch; post-write Undo is a **new inverse source draft**, shown and hash-checked before a second Write.
- Before toggles the whole active transaction, across files. It does not pop history. Undo/redo during Before updates history but keeps baseline displayed until Before is released.

External save: suspend fast preview, revoke receipts, drop compiled candidate execution, read fresh source and show changed ranges. No automatic rebinding by AST path, text or name. A narrowly disjoint change may be offered for **explicit rebase review** if a byte-diff map proves every old range and lexical dependency unchanged and reparsing confirms the same binding; generate new targets/hash/diff and preview again. Otherwise require reselection. A token/preset/type change also invalidates relevant decisions, gestures and receipts even when the edited file is unchanged.

### 6.3 Preview pipeline

The draft is the sole preview input. A server preview plan identifies target instance/site, candidate hashes, supported fast adapter and required compiled confirmation.

**Fast style projection:** apply only the exact properties affected by the selected authored declaration, only to proven affected instances. Preserve old per-property value/priority and absent-versus-empty style attribute. Do not use a free width transform when the intended source edit is a size variant. Reject masked projections: an important cascade winner, ancestor inheritance, pseudoelement, complex shorthand or responsive condition may make the inline projection unlike the candidate source. In those cases compile first. `!important` remains a temporary visualization aid only when the compiled candidate has been shown to produce the same effect.

**General compiled preview:** host reads candidate source bytes from a dev-only in-memory `DraftSourceStore`, then runs the project's existing transforms. It is a source diff, not a virtual component model. Stamp candidate source with its candidate hash/basis and retain a base-to-candidate range map. Imports, CSS, literal props, text, recipe definitions and JSX structure execute through real React. No `innerHTML`, fake event listeners or mutated `fiber.memoizedProps`.

For Vite, candidate lookup occurs before stamping; invalidate affected module nodes and their real importers using the supported module graph/HMR mechanisms. Validate incoming candidate bytes against the draft store rather than disk. Emit a draft-version event, but grant a receipt only after committed births and candidate modules agree. One preview lease per host prevents simultaneous compiler overlays. Every subscribed tab gets a visible host-wide preview banner; tab-specific compiled caches are rejected until a separate host implementation proves them. If any affected module requires full reload, say so before preview and require an isolated replay/scenario realm or explicit state-loss acknowledgement. No promise that Fast Refresh preserves all application state.

Isolation must include the **compiler graph**, not just an iframe. For effectful/remounting previews, the Vite adapter serves an authorized, versioned candidate namespace: module identity includes `{draftId, version, canonicalOriginalId}`; internal imports/dynamic imports are resolved into that namespace by a parser-backed resolver, while normal module IDs continue reading disk. Preserve the project's transform order, aliases and source maps. The candidate entry imports the actual app/component source with its declared scenario adapter; it is generated execution plumbing, not a copied UI. Baseline modules receive no candidate HMR. Browser realms get independent globals, storage and stubbed effect inputs. Unknown dynamic resolution, singleton/shared worker access or SSR graph propagation disables this capability. Until the namespaced graph passes equivalence/isolation acceptance, host-wide compiled preview is limited to declared reversible, effect-safe slices; arbitrary props/structure cannot use it. Side-by-side source variations later reuse this namespace with separate realms. A reload acknowledgement may acknowledge state loss, but never authorize undeclared network/storage effects or override the app-state isolation rule.

For Next, the same loader can consume an approved candidate, but invalidating client/server/RSC caches without touching source is a separate version-specific adapter. A supported webpack adapter may expose an in-memory virtual input dependency and invalidate the appropriate compiler. Turbopack's loader API alone provides no public arbitrary candidate-update/HMR control: compiled drafts are research until an adapter proves cache-key invalidation and client/server generation coherence. If unavailable, allow exact fast style previews and read-only identity, but refuse prop/text/structure **Write** whose required preview cannot be displayed. Do not secretly write temporary files to wake Next.

**Fast literal/prop bridge:** optional future dev transform registers source literal sites and a component-local preview revision subscription, then reads a draft literal cell at that exact site. This is acceptable only for supported component forms where the subscription preserves hook ordering, memoization and render semantics; class components need their own adapter. Cells are ephemeral, visible, derived from the same source diff and disabled outside preview. A cell cannot affect only one repeated instance when the literal affects all. Numeric props are still writable through compiled preview before this exists. Do not advertise one-frame numeric-prop drags until this bridge is proven equivalent to compiled source; generic component rerender/HMR is not a one-frame mechanism.

Compilation failure preserves the last acknowledged preview with its older version clearly labelled, and disables Write for the failed candidate. Never acknowledge an unseen draft because a handle's readout changed.

### 6.4 Rerenders, restoration and reload receipts

Fast previews listen to committed target instances, not just DOM mutations. If React writes a touched property while preview is active, update baseline from the app's current authored execution before reapplying; suppress the observer for Plumb-owned writes and record generation. If this ownership cannot be determined, stop fast preview and compile. A detached/replaced node receives no old inline property map; find the new instance through verified source/instance continuity or require reselection.

Before deactivates the candidate compile store and removes fast projections. Once baseline source has committed, acknowledge Before. Undo changes the draft then follows the same pipeline. Source restoration is exact; live state restoration is exact only under the scenario/replay adapter contract. For arbitrary effectful structure/prop previews, use the isolated realm because React remounts/effects cannot be undone by restoring styles. The product must say `baseline source restored; scenario reset` rather than claim it restored an unknowable app state.

Restoring an inline projection compares property ownership before replacing it, preserving app changes to unrelated properties. Never restore a stale whole `style` string. When the original attribute was absent and the restored declaration block is empty, retain `#restore`'s final serialization/read/remove behavior. Close, Escape, pagehide and lease expiry all deactivate preview; an expired compiled lease invalidates affected host modules back to disk source. A failed cleanup shows a recovery banner until baseline commit is observed.

After Write, keep the current displayed candidate only while waiting for disk-backed recompilation. Success requires `{new disk hash, host generation, committed disk-backed birth}` for each affected rendered module, plus stylesheet-generation acknowledgement where applicable. A class change is no longer the reload criterion. For unmounted definitions, require compiler module acknowledgement and mark `not currently rendered`. Prop-only changes must complete without a class mutation. If reload fails, show `source written; reload pending`, retain only the visibly labelled temporary preview and provide its discard/reload controls. Do not mark the operation fully complete.

## 7. Write path, minimal diffs and transaction limits

The writer extends, rather than bypasses, `Session.apply` and `structuredEdits`.

1. Validate receipt matches current active draft/version, is After rather than Before, and covers the required compiled/fast-equivalent preview. Freeze editing and reserve the coordinator mutation barrier.
2. Reread all touched files and proof dependencies, recheck decisions/types/protected files, canonical paths and regular-file identities. Re-derive operations from targets/intents; compare exact candidate hashes and diff digest. Client-provided replacement bytes are never authoritative.
3. Parse candidate files; validate domain/import/JSX constraints and nonoverlapping final patches. Recheck `from` at every range. Apply patches backward to original source, preserving untouched bytes.
4. Prepare output for all files before modifying any source. Preserve encoding/newline/trailing-newline/mode. Do not run a whole-file formatter. For insertions, infer local indentation/quote style and format only newly inserted syntax; ambiguous attached comments need a user choice or refusal.
5. Commit through the common checked filesystem writer; emit changed paths/hashes once, reconcile once, then release ordinary host reload. Query final disk bytes and expose transaction status separately from reload status.

For a literal change, the diff is the literal's span. For class replacement, it is the token span. For prop insertion, it is the opening insertion point. Wrapping/reordering uses explicit moved text segments with unchanged trivia; stable comments travel with a node only when their ownership is clear. Avoid full AST pretty-printing: it erases the exact minimal-diff contract.

### Filesystem concurrency and multiple files

There is no portable compare-and-swap for arbitrary source files, and no atomic multi-path rename. The current descriptor/hash checks narrow the race but do not prevent another editor writing between the final check and write. Do not claim absolute concurrent-write safety or ACID filesystem transactions.

Use a project advisory write lease for cooperating Plumb clients and supported editor extensions. Under that lease, stage same-directory temporary outputs, fsync as needed, recheck source hash/identity and rename each staged file atomically. Replace-in-place remains available only as the existing compatibility writer until the rename/watcher/hardlink checks pass. Revalidate parent directories and refuse symlink/hardlink targets. Preserve file mode; inode replacement is expected and must be accepted by the host's watcher path.

For **single-file** edits, atomic rename prevents torn content; a noncooperating external writer is still a race. If conflict detection finds foreign bytes, stop and preserve both the staged intended diff and observed source for explicit review, never silently overwrite/revert the foreign edit. Strict editing sessions that need a guarantee require a cooperating editor lease; otherwise disclose optimistic concurrency as a limitation.

The stronger live-editor guarantee is conditional on exclusive/cooperative source access during the final check-and-replace interval. A known competing noncooperating writer, or an adapter unable to establish that precondition, makes new editor Write unavailable; preview remains available. The legacy optimistic `apply` behavior is a current limitation, not evidence that this stronger guarantee already exists. Do not enable a new unsafe write path merely by displaying a warning. Proving the selected range is exact in one snapshot does not authorize replacing a different concurrent snapshot.

For **cross-file** writes, prepare the entire bundle, record a recovery journal `{transactionId, base hashes, candidate hashes, per-file status}`, then commit with dev invalidation held until the bundle finishes. This makes one review/Write action recoverable, not physically all-or-nothing. On error, roll back only files that still equal Plumb's candidate bytes; foreign changes stop rollback. After a crash, recover journal status before accepting another write. HTTP timeout is resolved by `GET transaction`, not blind retry. Report partial writes explicitly.

If a project requires strict all-or-nothing cross-file visibility to every external reader, refuse the bundle until it supplies a transactional/cooperative workspace adapter. Do not solve this by maintaining a permanent shadow project. Prototyping keep/discard is atomic in the pending operation graph; filesystem publication has the above declared recovery boundary. This distinction is a release gate, not a footnote.

Token definition files are protected today. In layers 0–3, changing a token means changing the usage reference. Layer 6 may introduce an explicit `edit-project-decision` capability that targets a tracked project-owned definition, enumerates impact and previews every required consumer/scenario. It must be a narrow extension shared by old/new writer validation, not removal of `protectedFiles`. Config, dependency tokens and unsupported theme syntax stay read-only. No token file is modified merely because a spring handle was dragged.

## 8. Layer 3: direct manipulation

Review Plumb primitives before handles: reuse [overlay/src/tokens.css](../../overlay/src/tokens.css) for instrument ink, contrast, spacing, typography, radii/elevation and the existing `--pl-spring`. Add named part/release/focus/reduced-motion roles only when missing. Project token resolution supplies **specimen** motion; Plumb tokens supply **tool chrome** motion. Never import MetalUI's visual theme into an unrelated app.

Each handle exists only with an exact writable target and an eligible preview adapter. Geometry is measured on the actual selected component; CSS writing mode/transform/zoom are resolved at gesture start. Noninvertible transforms or layout constraints make an axis read-only. Source scope and affected instances are fixed for the gesture.

| Handle | Gesture on the real component | Source operation and snapping |
| --- | --- | --- |
| Spacing | Pull inner padding edge, outer margin boundary or line between actual flex/grid items along its axis; readout scrubs vertically | Exact padding/margin/gap token/member; distinguish logical sides and shorthand. Tunable catches project spacing tokens; discrete contract options step only. Margin collapse, distributed `space-between`, missing gap ownership or ambiguous shorthand refuses |
| Size | Pull top/right actual edge; axis lock available; discrete size builds a guide lean then snaps | Exact width/height literal/token or true component `size` prop. `auto`, min/max, aspect ratio and variant constraints remain explicit; never stretch a pill/compact variant through fake sizes |
| Radius | Pull the existing corner arc along its diagonal; square corner uses bracket | Exact radius member/token or genuine variant. Elliptical/percentage/per-corner values need explicit selected axis/corner; circular/pill contract has no free radius handle |
| Type | Drag actual glyph horizontally for tracking and vertically for font size; baseline readout steps line-height; weight steps real supported weights | Exact type class/prop/style binding. Use project type roles, font metrics and unit rules. Compound type token requires role selection, not silently splitting it. Never add padding to imitate tracking |
| Colour | Point at actual fill/stroke/glyph, activate anchored palette, select semantic swatch; editable color readout permits explicit off-scale value | Exact color token/reference/literal with alpha retained. Match semantic role and theme; equal colors do not collapse roles. Palette is not a generic slider panel; eyedropper observations do not prove source |
| Layout | Drag real child toward valid insertion/axis guide; point at alignment indicator to step actual flex/grid choices | Exact flex-direction, alignment or grid literal; DOM reorder requires layer 4 tree proof. Distributed layout does not turn into absolute positioning. Unknown CSS constraints disable the handle |

Only the hovered/focused/held handle highlights. Primary top/right/corner guides remain faint; mirror handles stay operable without drawing the full outline. Hint sits above the component, clamped to viewport and never covering its label. Readout click focuses its handle; readout hover lights that handle. Keep one name across handle/tag/readout. Token name belongs in `aria-valuetext` and source detail, not a row of on-canvas token badges. Off-scale readout has an unlit indicator plus textual/audible off-scale status; missing scale is different.

### Gesture state machine and snapping

`idle -> focused/hovered -> grabbed -> previewing -> released`, with `cancelled`, `conflict` and `preview-failed` exits. Pointerdown stores base value, draft version, coordinate matrix, selected scale and scope; pointer capture keeps the gesture local. Lost capture/pointercancel/Escape cancels the gesture and restores its pre-gesture draft command. Unlike MetalUI's shared `onUp`, cancellation is not treated as acceptance.

One rAF callback consumes the latest pointer sample. Convert screen deltas through inverse element transform and page zoom; do not copy MetalUI's fixed 2× magnification into the overlay. Tunables move directly without spring lag, with sticky capture/release hysteresis expressed in source units. Catch only within a declared scale's threshold; off-scale movement stays allowed and labelled. Equal-valued tokens require retaining the existing semantic identity or an explicit choice. A token readout step may deliberately pass a token rather than being recaught.

Discrete options use `STEP_AT = 7` component units as the initial reviewed threshold, fixed per option rather than proportional to numeric differences. Residual drag accumulates; component stays at a valid option until crossing. Lean affects tool guide, not specimen geometry. Direction reversal unwinds residual lean. Step shows actual variant through a source-equivalent fast adapter or already compiled scenario; if neither can respond within one frame, disable that drag handle and offer explicit compiled selection until the adapter exists.

Project part spring can animate the visual snap; release spring returns the tool guide. Capture current velocity for interruptible tool motion. No spring interpolation of the editable value while held. Keyboard updates are immediate. Layout-changing values naturally require layout; do not hide their performance behind an unrelated scale animation. Optional FLIP of the guide must not falsify the specimen's layout.

### Keyboard, touch and accessibility

Handles are focusable with names, current value/unit, scope and instructions. Continuous or ordered discrete handles may use `role="slider"` and valid `aria-valuemin/max/now/valuetext` **without rendering slider widgets**. Unordered variants use buttons/listbox; layout reorder uses keyboard move commands and an announced destination. Arrow changes one step, Shift four, Home/End bounds where meaningful, Enter opens the exact value editor, Escape cancels. No implicit off-scale keyboard wrapping.

Readout offers a non-drag value input. Focus stays in tool UI rather than stealing app focus during movement. Hit regions target at least 44 CSS px where practical, with nonoverlapping priority on tiny components; a nearby readout supplies an accessible alternative when geometry cannot fit all handles. Coarse-pointer first tap selects, second manipulates. Touch scrolling remains enabled outside an active capture. Announce snapped/off-scale values on changes or release, throttled instead of speaking each pointermove.

Reduced motion: direct changes and keyboard remain instant, snap/release translation and rolling digits become static updates, decorative blips disappear. No autoplay strips/trails. Brief opacity feedback may remain only where useful. If the project's reduced-motion variant is missing, show the gap; do not silently invent source policy. Test focus, screen-reader names, coarse input, 375 px width, high zoom, dark/light host themes and reduced motion in the future feature slices.

## 9. Layer 4: structure without a second UI

Source AST children are the structural authority. A selected DOM instance highlights its exact source node; list/repeated/conditional output states the shared scope. Eligible operations:

- Reorder static sibling JSX nodes under one proven parent by moving original text slices; keep explicit keys and attached trivia. CSS `order` is a separate style edit, not JSX reorder.
- Remove exact JSX plus only owned whitespace/comments. Removing an expression or hook boundary requires explicit source selection; never remove unrelated imports automatically.
- Wrap selected contiguous static children with a chosen real design-system component/host tag; include exact import and required props. Preserve return shape and JSX comments.
- Insert real registered components from the project's catalog using declared required inputs and legal parent/child constraints. No generated stand-in component that only looks similar.

Refuse cross-branch moves, state-dependent list item reorder, unknown children/render props, unresolved portal moves, invalid nesting and ambiguous comment attachment. Moving a keyed node can preserve React state; wrapping usually remounts it. Describe that consequence before compiled preview. Use a scenario realm for effectful/remounting changes, with source-backed candidate execution and Before restoring the baseline scenario. Structural preview on the live app is available only under a declared reversible state/effect adapter.

Cost: O(touched file) parsing/diffing in worker, normal host compile cost, no per-pixel tree walks. Smallest slice: reorder two static labelled siblings in `fixtures/live-editor-structure`, preview via HTTP draft/real React HMR, Before/Undo/Write and exact comments preserved; then one static sibling pair from MetalUI docs in an isolated disposable checkout. No source-tree behavior is inferred from a screenshot.

## 10. Layer 5: states, variants and live values

### 10.1 State model and safe forcing

```ts
type Scenario = {
  id: string;
  sourceAnchor: SourceAnchor;
  componentBinding: string;
  propsSource: string;       // validated literal expressions, not arbitrary eval
  providerRecipeId?: string;
  eventRecipeId?: string;
  pseudoStates: string[];
  viewport: { width: number; height: number };
  theme: string;
  reducedMotion: boolean;
  origin: 'authored' | 'forced' | 'recorded';
  adapterVersion: string;
};
```

Infer literal unions, enums, booleans, optional props and documented contracts from exact project TypeScript bindings in a worker. Schema inference does not execute getters or constructors. Generics, conditional types, polymorphic components and runtime constraints require project annotations; type legality is not proof a variant is semantically valid.

States such as loading/disabled/error are props only where the actual component exposes them. Hover/focus/pressed are different channels. Do not invoke live click events merely to force them: that can submit a form or mutate app state. Browser pseudo forcing through a browser-extension/CDP adapter is exact for CSS but unavailable to a plain page overlay. The portable alternative is a scenario-only stylesheet transform that translates the selected supported pseudo selector to a tool-owned forced-state attribute, preserving selector semantics/specificity. This previews appearance, **not** the app's event behavior; label `forced appearance`. Unsupported compound selectors refuse. Interaction behavior uses recorded scenario events in the isolated realm.

Never change `fiber.memoizedState`, reducer queues, live controlled input state or context providers to force a variant. DevTools override capabilities mutate the application and may run effects; they are read-only inspection tools here. Mount the real component from the same compiled source in an isolated scenario realm with declared providers, sample inputs and effect stubs. The live app keeps its own focus/store/timers. If required providers/side effects are unknown, offer observation rather than unsafe forcing.

Side-by-side states use a strip of virtualized scenario frames, each with independent store/provider state, viewport/theme and visible forced label. Frames render the same component source; they are temporary execution surfaces, not maintained copies of its UI. Initial maximum four active realms, with parked image thumbnails for inactive scenarios. Avoid multiple React roots sharing singleton module state in one realm. A plain component import is not isolation if its module mutates global state or makes network calls.

Sample/provider recipes are explicit source-backed dev modules or ephemeral generated source fragments shown in the diff view. Discard removes them. Keeping a scenario requires choosing its authored dev fixture/story destination and previewing the added source. Do not persist scenario values as a separate hidden truth. Storybook's [Controls](https://storybook.js.org/docs/essentials/controls) provide a useful precedent for type-informed arguments, but a controls arg change alone is not a Plumb source edit.

Sound now: isolated props/variants with known provider/effect contracts, static state comparison, observation of current state. Research: recovering every arbitrary app state and reversible live pseudo/event forcing without a browser adapter. Smallest slice: MetalUI Button's actual kind/size/disabled options, with no fabricated compact primary variant, plus HTTP refusal for invalid combinations and Before preserving the live app's counter/focus.

### 10.2 Live values in source, in both directions

An overlay source excerpt and future editor extension speak the same target protocol. Editor decorations identify literal ranges by document content hash plus AST target ID. Unsaved editor buffers have their own explicit buffer version: either import them as a visible source draft with editor cooperation or refuse until saved; never map an unsaved offset onto disk.

Page-to-code uses stamped host/usage plus proven attribute/class/style binding. Code-to-page uses a reverse index from target ID to known dependent stamped sites and mounted instance IDs. A literal shared through a constant highlights all known consumers; unknown consumers are disclosed. A computed property points to its expression with selectable literals, not a supposedly unique numeric cause.

Dragging a code literal starts one source draft command. Style-equivalent sites use one-frame projection; safe literal-cell instrumentation can later provide the same for render props. Everything else shows the actual compiled page after debounced candidate compile, with `compiling` rather than fabricated instantaneous effect. Editor and overlay display the same draft/version/decision snap. Write is owned by one transaction even if multiple clients manipulate it. Editor uses explicit commands for starting/ending scrub; it does not intercept every numeric keystroke globally.

Instrumentation: versioned AST literal inventory, lexical/import dependency graph, dev site execution registration for dynamic branches and optional source-equivalent literal cells. Cost: one parse per changed hash, reverse-index updates for affected bindings, O(selected known consumers) preview. First slice: `<Icon size={16}>` and one literal spacing class; select page, reveal the exact two targets, scrub each, show real effect, Before/Undo, then Write only the selected span. On MetalUI choose a supported literal prop at a stamped usage and disclose shared versus local scope.

## 11. Layer 6A: commits, time travel and causality

### 11.1 Observation is not replay

React DevTools reads fiber props/state/context and hooks and receives renderer capabilities such as `overrideProps` and `overrideHookState`; its backend imports `inspectHooksOfFiber`. These are private, version-dependent facilities, not a public state snapshot/restore API. Hook inspection can re-execute a render under a debug dispatcher, so do not run it for every commit. [React DevTools backend source](https://github.com/facebook/react/blob/main/packages/react-devtools-shared/src/backend/fiber/renderer.js), [React debug hook inspection](https://github.com/facebook/react/blob/main/packages/react-debug-tools/src/ReactDebugHooks.js).

Install a compatible observer before renderer injection, compose with an existing DevTools hook, and never replace the user's hook/DevTools. Subscribe to committed roots and unmounts via a versioned renderer adapter. Unsupported renderer version means no commit inspection. Initial selected-subtree capture records props, class state, known state/reducer hook slots, context dependencies and external-store adapter snapshots. Refs, closures, subscriptions, memo caches and browser resources are opaque handles, not JSON state.

Inspect hook names/types once on demand after a quiet commit; tie results to function/source hash and hook-order signature. Serialize plain safe values using bounded descriptors without invoking getters, `toJSON` or arbitrary iterators. Represent functions/DOM/cycles/proxies/large blobs as opaque/truncated entries. Such a commit is still inspectable, but not automatically restorable. No full-tree deep clone on every commit.

```ts
type ValueRecord = { codec: string; digest: string; data?: unknown;
                     opaque?: string; truncated?: boolean };
type CommitRecord = {
  id: number;
  rootId: string;
  parentCommit?: number;
  sourceVersions: FileVersion[];
  logicalTime: number;
  instances: { instanceId: string; siteId: string; parentId?: string;
    props: ValueRecord; state: ValueRecord; hooks: ValueRecord[];
    hookSignature: string; contexts: ValueRecord[] }[];
  causeIds: string[];
  actionRange: [number, number];
  effectRange: [number, number];
  checkpointId?: string;
  frameCaptureId?: string;
  mode: 'observation' | 'recorded' | 'replayable';
  gaps: string[];
};
type ActionRecord = {
  id: string; source?: SourceAnchor; instanceId?: string;
  logicalTime: number; kind: string; payload: ValueRecord;
  schedulerOrder: number; parentCauseId?: string;
};
type EffectRecord = {
  id: string; actionId?: string; kind: string; requestDigest: string;
  result?: ValueRecord; logicalTime: number; order: number;
  error?: ValueRecord; reversible: boolean;
};
type TimelineBranch = {
  id: string; parent?: { branchId: string; commitId: number };
  sourceDraftId?: string; initialCheckpointId: string;
  actionOverrides: ActionRecord[]; stateFork?: ValueRecord;
  contractHash: string; replayStatus: 'exact' | 'observed' | 'diverged' | 'blocked';
};
```

Fiber commit capture establishes **what was visible**, not how it happened. Action instrumentation establishes causality and supplies replay inputs. Record commits, not speculative/concurrent renders; Strict Mode render/effect retries remain separate execution attempts. Root commits are separate clocks unless an adapter declares synchronization. HMR starts a new source epoch; remounted instance IDs do not inherit arbitrary old hook slots.

### 11.2 Deterministic replay contract

Project adapter exposes versioned state codecs/checkpoints, ordered domain actions, dependency/effect handlers, a virtual scheduler and a scenario mount. For pure reducers, dev instrumentation wraps the actual dispatch to record actions and surrounds the reducer to associate source/version with results, without changing identity/order semantics. Known external stores expose immutable snapshots and action subscriptions; React's [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) describes the rendering contract, but subscribing to a store does not reveal its action log by itself.

Replay creates a new isolated realm from the branch's candidate source, restores a declared checkpoint, then dispatches recorded actions/effect deliveries in logical order. No calls to real network/server actions, auth writes, audio/hardware or shared storage. Stateful hooks can participate through a validated dev transform/adapter that logs setter actions and has a safe initialization/checkpoint scheme; generic hook-field restoration is not accepted. Remount-from-start and action replay is slower but sound for supported apps; keep opaque hook sessions as observation-only.

| Nondeterministic input | Required record/stub | Stop condition |
| --- | --- | --- |
| Effects and subscriptions | Registration, cleanup, delivery order and returned data through declared adapters; simulate external effects in replay | Unknown irreversible effect, global mutation, uninstrumented callback or resource |
| Timers/rAF | Creation/cancellation/firing with virtual time and stable IDs; simulate scheduling in replay realm | Untracked scheduler or ordering divergence |
| Network/WebSocket/server actions | Request identity, response/error/body and delivery order; replay stub matches semantic requests | New/mismatched request, missing stream chunk or real mutation attempt |
| Randomness/UUIDs | Seeded project RNG or exact recorded calls through an adapter | Crypto/security randomness needed, divergent call sequence or module-captured unstubbed RNG |
| Dates/performance time | Explicit wall-clock origin and logical clock reads, locale/timezone | Unrecorded time read or environment mismatch |
| Layout/media/fonts/scroll | Viewport, DPR, theme, font readiness, reduced-motion, observer deliveries and relevant measured inputs | Layout digest mismatch, missing font/browser input |
| Storage/router/workers | Isolated snapshot, recorded read/write/navigation/message protocol | Access to live singleton state or uninstrumented process |
| React scheduling | Stable adapter/runtime versions, action batching/flush boundaries and commit checkpoints | Unsupported React version, changed hook order or unexplained commit/state divergence |

Stubbing happens before app modules load in the isolated realm; global patches to the live page are rejected. Even then arbitrary Web APIs, captured closures, multi-thread races and server computation cannot be made deterministic by patching `fetch`, `Date` and `Math.random` alone. The recorder lists declared coverage and observed gaps. `exact` means replay matches recorded state/DOM digests under that specified environment, not bit-identical pixels across browsers.

### 11.3 Scrub, edit at n, replay suffix, fork

Scrub selects a commit. Observation-only sessions show the captured image/state excerpt with `recorded appearance; not interactive`. Replayable sessions restore nearest compatible checkpoint and replay to the chosen action boundary, then present the real UI in the replay realm. A checkpoint is valid only for its code/runtime/adapter hashes; source changes may require replay from the initial checkpoint. Cache neighbouring commit renders and cancel obsolete scrubs; never inject historical state into the live app.

At commit n there are two distinct edits:

- **Source literal edit:** create the ordinary pending source draft, compile it in the replay realm, replay the prefix to n, then recompute the suffix from recorded actions. This shows changed code's effect at every later moment. Preserve original branch. Code generally applies to the whole run; do not pretend that a global literal changed only after n. If prefix compatibility cannot be established, replay from start or report divergence.
- **State value fork:** apply a supported adapter checkpoint override at n and recompute later actions. Label it a forced runtime experiment. It is not writable source until the user selects an exact initial-state/reducer/fixture literal operation that expresses the intended change; preview that source separately. Persisting fiber state as code is refused.

Never replay later recorded state snapshots as if they were recomputed output: they would overwrite the consequences of the edit. Replay **inputs**, compare outputs for unchanged branches, and flag changed branches as counterfactual. If new code changes action legality, hook order, network request identities or effect call counts, stop at the first divergence and show its source/action. Do not fabricate the remainder. Branches form a DAG of prefix references plus overrides/source drafts, not complete UI copies.

Cost: selected-subtree commit observation O(changed captured values), action/effect logging O(payload), replay O(actions since compatible checkpoint + render cost). Start with checkpoints every 20 domain actions or 1 second of logical time, capped by memory. Recording defaults off, has a visible indicator and stops before ring eviction removes dependencies needed by a retained checkpoint.

Smallest serious proof: a reducer-driven React game fixture with movement, seeded RNG, timer and one recorded network result. Record ten actions, scrub every commit, change movement literal at n, show recalculated later positions, fork and compare, deliberately introduce an unmatched request and show divergence. Then adapt AlgoRecall's read-only-inspected `src/lld/problems/07-chess/Sc1SwitchWall.tsx`, which uses `useReducer`, project springs and timers, in a disposable checkout. Its audio/auth/provider effects require stubs; fixture success alone is not permission to call the real app replayable.

### 11.4 Click a pixel: a bounded causal chain

Pixel hit identifies the painted element/pseudo/canvas owner, not necessarily a React value. Begin with a hit-test stack and stamped committed instance. Link to exact JSX and authored style/prop targets; then traverse a **proven** lexical dependency graph for supported assignments, destructuring, imports and reducer selectors. Dynamic helpers require execution provenance from the dev transform/project adapter.

Event instrumentation records handler registration source, invocation ID, target instance, action/dispatch IDs, async parent token and resulting commits. Prefer wrapping known dispatches/event boundaries through the compiler; do not globally replace all DOM/React events. Batched/concurrent updates may have many causes; show a set, not a false singular event. Async context propagates only through supported adapters; missing propagation yields `cause unknown`.

Graph nodes: `{source target, runtime value observation, event/action, effect delivery, commit, painted owner}`. Edges carry `{kind, evidence, sourceHash, commitId, certainty:'proven'|'observed'|'unknown'}`. Only proven source-target nodes authorize editing. Canvas/WebGL pixels require a renderer adapter; absent one, show the canvas owner and stop. Text spans use DOM range observations; pseudo-elements keep a CSS-owner node; inherited values include the ancestor chain.

Do not say React internals expose complete dataflow: props and state values do not tell which state fed a prop. Correlated changes are observations. Full arbitrary JavaScript dynamic slicing is research; supported reducer/selector instrumentation is sound. Cost: graph built on recording/changed source, query bounded to 100 nodes with expansion on request. First slice: click score text, show its exact JSX prop/expression, reducer field and recorded button event; deliberately add a computed opaque helper and terminate the chain truthfully. Prove on AlgoRecall's reducer slice after its replay adapter passes.

## 12. Layer 6B: motion, every frame and reduced motion

### 12.1 Motion data and adapter interface

```ts
type MotionTrack = {
  id: string; instanceId: string; sourceVersions: FileVersion[];
  sourceTargets: string[];
  engine: 'css-transition' | 'css-animation' | 'waapi' | 'view-transition' | 'motion';
  startCommit: number; endCommit?: number;
  properties: string[];
  timing: { delayMs: number; durationMs?: number; iterations: number;
            direction: string; easing?: string };
  spring?: { stiffness: number; damping: number; mass: number;
             initialVelocity: number; restSpeed: number; restDelta: number };
  endpoints: ValueRecord[];
  frames: { timeMs: number; progress?: number; transform?: number[];
            rect?: number[]; opacity?: number; captureId?: string }[];
  mode: 'seekable' | 'recorded' | 'model-only';
  gaps: string[];
};
interface MotionAdapter {
  discover(instanceId: string): Promise<MotionTrack[]>;
  capture(trackId: string, times: number[]): Promise<MotionTrack>;
  seek(trackId: string, timeMs: number): Promise<void>;
  restore(trackId: string): Promise<void>;
  sourceParameters(trackId: string): Promise<EditableTarget[]>;
}
```

Runtime motion identity is distinct from its source origin. CSS discovery can identify an animation without proving which declaration supplied duration; dynamic `animate()` arguments need instrumentation. Such a track is scrubbable/observable but its unknown parameters are read-only.

Use actual timing, delay, iteration/direction/fill/composition and current progress; negative delay, `auto` duration and infinite loops are explicit. Infinite motion capture requires a chosen finite window/iteration. Progress and wall time are separate axes. Spring settling time changes when parameters change; preserve the selected axis rather than silently changing frame meaning.

### 12.2 CSS transitions/animations and WAAPI

Discover selected-element animations, including descendants/pseudoelements only when requested. CSS animations/transitions participate in the animation model; pause and seek actual `Animation` objects after readiness. `currentTime` is a seek mechanism, not evidence of authored timing. Capture original playback state/time/rate; use an isolated scenario for any pause/finish that can fire callbacks or change application behavior. Supported live inspection must restore relative clock/playback state and disclose that elapsed real time continues. The [Web Animations specification](https://drafts.csswg.org/web-animations-1/) defines these controls and effect timing; browser support is verified per adapter.

CSS parameter targets come from proven stylesheet rules/custom-property definitions, preserving cascade and animation-name binding. WAAPI parameter targets come from exact authored keyframe/options literals with dev call-site instrumentation that records returned animation object and its source IDs. Never globally monkeypatch every `Element.animate` on the live page by default.

Edit duration/delay/easing as source-backed drafts; regenerate the actual animation in the scenario and seek the same selected time/progress. `updateTiming` can supply a fast-equivalent preview only when source binding and resulting timing are validated; compiled source confirmation follows. Do not write sampled keyframes to replace a project spring token. Scroll/view timelines require their own seekable input adapter; otherwise show recorded frames, not pretend document time controls them.

### 12.3 Motion (framer-motion)

Crafting Attention and AlgoRecall currently import `motion/react`; package manifests inspected contain Motion 12, while MetalUI docs contain Motion 13. Version-specific adapters are required. The project token sources inspected are [Crafting Attention src/lib/motion.ts](/Users/vijaysingh/unlocalhosted/craftingattention/app/src/lib/motion.ts) (`SPRINGS`, `DURATIONS`, `EASINGS`) and [AlgoRecall platform/motion/springs.ts](/Users/vijaysingh/unlocalhosted/algorecall/src/platform/motion/springs.ts) (`SPRING`, `DRAG`, `STAGGER`). Treat these bindings as project decisions, not license to overwrite them automatically.

Capture imperative playback controls where Motion exposes them; intercept only instrumented authored calls or a declared component motion adapter. Declarative `motion` components, layout projections and `AnimatePresence` do not provide one universal publicly seekable handle. A scenario adapter drives recorded variant/gesture inputs and captures output; unsupported layout/gesture tracks remain recorded-only. Motion documents physics versus duration/bounce configuration in [transitions](https://motion.dev/docs/react-transitions) and spring generation in [spring](https://motion.dev/docs/spring). Never mix those parameterizations by inventing a conversion the library does not define.

For known physics springs, worker computes displacement/velocity samples from `m*x'' + c*x' + k*(x-target) = 0`, retaining initial velocity, endpoints and rest thresholds. Under/critical/over-damping are distinct. Curve is labelled **model** until the adapter compares it with real runtime samples. Prefer the matching library generator/version over a hand-integrated approximation. Track repeats, stagger, per-property transitions and interruption velocity separately. Layout spring's target changes with measured geometry; editing stiffness does not turn layout projection into a simple fixed-endpoint spring.

Scrub parameters by dragging their numeric code/readouts while the real transition specimen is paused; curve marker follows current time, with position/velocity and overshoot visible. A changed spring recompiles/regenerates and re-seeks; no autoplay restart under the pointer. Valid bounds: mass/stiffness positive, damping nonnegative, finite values and project constraints. Duration-based spring stays duration-based unless the user explicitly selects a conversion source edit.

Writing uses the project's existing motion token reference. Choosing another token edits the usage. Tuning a shared token definition requires the explicit protected-definition capability, impact preview and exact definition hash. If no token exists, offer a visible draft to create a project-owned named motion decision at an approved source location and update the usage/import; requires cross-file transaction support. Otherwise keep tuning preview-only or explicitly off-scale under project rules. Never scatter new inline spring numbers while claiming token compliance.

### 12.4 View Transitions

Capture transition invocation, participating names, before/after source/state commits and generated animation tracks after transition readiness. Generated pseudo snapshots represent captured rendering, not editable DOM nodes. Seek supported pseudo-element animations in an isolated scenario; edit the authored `::view-transition-*` rule, named transition binding or project token only when exact provenance exists. Actual callback/route/state change is replayed input and never rerun on the live app to scrub.

Cross-document transitions, transient snapshot lifetimes, browser-dependent animation exposure and recapture across source edits need separate capability tests. When snapshot objects expire, recapture a supported scenario or show recorded frames. There is no general pixel-to-JSX mapping inside a transition snapshot; link to its recorded participants. This follows the snapshot/pseudo-element architecture of the [CSS View Transitions draft specification](https://drafts.csswg.org/css-view-transitions-1/); mark draft-dependent behavior and feature-detect.

### 12.5 Seeing all frames: onion skins, trails and strips

Create one `MotionCapture` bound to track/source/environment hashes and a stated sample interval. For a finite transition, sample every **displayed frame** at the chosen capture rate, then allow a lower-density view of that complete sampled set. Do not call 12 sampled silhouettes “every frame” of a 300 ms/60 Hz transition. Store timestamps and identify dropped frames; continuous-time motion has no finite set of all possible frames.

For pure transform/opacity motion, store local geometry and transform matrices per frame. Draw onion skins in Plumb's noninteractive canvas/SVG layer at original coordinates, with explicit endpoints and selected frame; draw a trail of a chosen material point (center/corner/baseline), not only bounding-box centers. Layout/deformation/clipping/text changes require per-frame geometry or image capture. Never duplicate live React DOM with event handlers to make ghosts.

A plain page overlay cannot reliably screenshot arbitrary DOM, canvas, video or cross-origin content. Use a user-enabled browser capture adapter or bounded geometry-only representation; label missing surfaces. HTML-to-canvas approximation is rejected as faithful evidence. Strip tiles carry timestamp/state/commit labels and use captured images or isolated scenario renders of the same source; selecting a tile seeks the main scenario. Images are read-only observations and disappear when the source/environment hash changes.

Capture lives off the live app in the seekable scenario. Sample at actual elapsed time for recordings; model-generated positions remain labelled. Offer overlay-at-once and laid-out frame strip; retain time scale so overshoot/pauses are visible. Trails have no hit targets in the app. Keyboard can step a frame, jump start/end and read numeric position/velocity; a text table supplies an accessible equivalent. Reduced motion uses static skins/strip and no autoplay.

Cost: geometry capture O(frames * selected elements), rendering O(visible samples), image capture dominated by browser readback. Initial limit one selected component, 120 sampled frames/track, 12 visible thumbnails and 16 MiB image cache. Longer transitions can page through complete frame blocks; show decimation/drop markers and never silently lose frames. No full-page continuous recording by default.

### 12.6 Reduced motion and first proofs

Respect the actual media preference and project policy in all default scenarios. Motion's [useReducedMotion](https://motion.dev/docs/react-use-reduced-motion) is a project runtime input, not something Plumb should override invisibly. Compare standard/reduced variants only in clearly labelled separate scenario realms with media inputs supplied before mount. If media emulation is unavailable, adapter-provided variants or separate test browser contexts are required; changing a CSS class cannot emulate all JS media reads.

Tool motion uses instant seek/keyboard updates, static rolling numbers and no decorative movement. Recorded autoplay is opt-in, pauseable and never enabled under reduced motion by default. A Write changes motion token usage/definition only; it must not accidentally remove the app's reduced-motion branch.

Smallest proofs, individually:

1. CSS transform/opacity transition fixture: seek real frames at 0/25/50/100%, edit duration, observe curve/trail/strip, Before/Undo, Write exact CSS span and restore animation ownership.
2. Instrumented WAAPI fixture: exact options literal, cancellation/finish event safety and unrelated animation unaffected.
3. Crafting Attention scenario with one actual `SPRINGS` usage: compare generated curve to captured motion, tune/choose token, preserve reduced-motion variant. Definition edits remain gated.
4. AlgoRecall's `DRAG.settle` or `SPRING.snappy` scenario: interruption velocity and source token identity survive re-seek. Its layout/gesture motion is not accepted on pure spring math alone.
5. View Transition fixture with stable named element: captured source participants, supported pseudo-animation seek and truthful refusal after expired/unsupported snapshot.

## 13. Layer 7: variations, sample data and whole branches

Reuse `Draft.parent` and `TimelineBranch`: a variation is a persistent operation-graph branch against explicit base source hashes, with optional scenario inputs and replay prefix. It is not a copied React tree. Fork by sharing immutable prefix, activate one source candidate at a time on the host, and compare branches in isolated scenario frames under the same environment.

Sample data is typed literal input to an exact component usage or an explicitly chosen authored dev fixture/provider recipe. Validate schema and prevent live network/storage writes. Do not invent empty/loading/error states for components lacking those semantics. A changed runtime checkpoint remains a forced experiment until translated into a valid source operation.

Keep means: select a branch, materialize its complete source diff including imports/fixture/sample declarations, preview that exact candidate, then Write one transaction. Discard means: restore baseline execution, drop branch operations/captures, preserve live app state under the scenario contract. No branch keeps half its operations because only one file was visible. Cross-file publication follows the declared journal/cooperative-writer limits, and partial publication is never labelled successful keep.

Optional saved experiments serialize source operations/base hashes into a project-owned dev file only after explicit user Write. They do not become production component overrides. Git branches/worktrees may be project-provided destinations, but Plumb never silently creates a forked app as its primary source of truth.

Cost: O(branch changed ranges), prefix sharing, bounded scenario count. Smallest slice: two source-backed button variations with sample label data, one branch spanning usage/import; compare, discard one with zero disk change, keep the other through HTTP with one visible transaction and recovery status. Verify on MetalUI in a disposable checkout, then repeat prototype reading/preview support on Kamui's Vite web app, Crafting Attention and AlgoRecall before claiming general coverage.

## 14. Performance, health and resource budgets

These are implementation acceptance targets, not measurements from this run. Measure in a fixed browser/viewport on warm fixtures and chosen real app pages; report p50/p95 and worst long task. Startup, source proof latency, preview latency and disk-to-commit latency are separate.

| Interaction | Budget and lane | Degradation rule |
| --- | --- | --- |
| Handle pointer sample to visible supported fast preview | Next paint, <=16.7 ms at 60 Hz; overlay JS <=2 ms, geometry read <=2 ms, remaining layout/paint budget shared with app | If the real target cannot meet it, disable continuous handle; no fake transform substituted for source semantics |
| Selection chrome | <=1 frame, cached geometry, no network prerequisite for reticle | Exact reading may remain loading; never enable Write before proof |
| Warm stamped locate + target read | <=100 ms p95 local HTTP, one bounded batch; hashes/AST in workers | Busy/starting badge, retain selection; no fallback guesses |
| Literal draft preparation | <=50 ms p95 warm touched file under 100 KiB, worker | Larger file explicitly compiling; pointer path does not await it |
| Fast candidate confirmation | Gesture release; target <=250 ms p95 warm Vite compile/commit | Show actual compiling/last displayed version and revoke Write until receipt |
| Prop/text/structure compiled preview | Target <=300 ms warm fixture, real-app measured separately | No one-frame claim for general HMR; missing adapter refuses Write |
| Commit observation | <=1 ms synchronous selected-subtree snapshot budget; larger serialization off-thread, <=4 ms yielding chunks | Capture gap/truncation marker; session becomes observation-only as needed |
| Replay seek | Cached frame <=1 paint; checkpoint replay <=100 ms p95 small supported slice | Cancel obsolete jobs; show replaying; no fabricated historical state |
| Curve/trail recompute | <=16 ms worker for one <=120-frame track; <=2 ms overlay drawing | Render bounded/virtualized samples; full capture deferred until explicit action |
| State strip | Four active realms maximum, thumbnail scrolling <=1 frame | Park inactive realms; disclose parked state |
| Write | Worker derivation and disk checks; target <=200 ms single small file excluding host reload | Report transaction phase; no timeout implying cancellation once writing started |
| Health under burst and editor work | Existing overlapping probes <100 ms; no host AST/diff/stringify graph work | Drop/coalesce preview work before read admission/health availability degrades |

One outstanding drag preparation per client, one latest replacement queued, one compiled preview lease per host. New writes never overtake earlier queued mutations. Do not raise the 512 cap or reset the 5-second read admission clock to hide slow editor work. Fast previews are local and send at most a latest-value preparation per animation frame, normally less through coalescing. Expensive trace/replay jobs have separate bounded workers and cancellation, not coordinator queues that block every source read. Process recording is never sent over HTTP per pointer frame.

Proposed memory caps: target ASTs reuse the current 64-snapshot bound; dev manifest 32 MiB per host; draft candidates 16 MiB/100 operations before explicit split; recording 32 MiB/500 commits including dependency closure; image cache 16 MiB. Exceeding a cap produces a visible limit, not incomplete proof. Replay worker has at most one active job per inspected branch, global two; scenario realms share a four-active cap. Expired leases purge candidates and schedule baseline invalidation. Expose queue/compile/recording counters through cached health snapshots without serializing recordings.

## 15. Extensibility: project decisions stay in charge

[src/presets/index.ts](../../src/presets/index.ts) currently provides `definePreset`, `loadPresets`, `records`, `presetDecisions`, `componentConfigs` and scoped component contracts. `definePreset` rejects unknown keys; new editor metadata requires a deliberate schema/version change, not an undocumented `editor` key that already works.

Add an optional versioned editor descriptor to presets/config:

```ts
type EditorPreset = {
  version: 1;
  scales: { id: string; family: string; decisions: string[];
            role?: string; domain: 'discrete' | 'tunable' }[];
  handles: { componentBinding: string; property: string; geometry: string;
             scaleId: string; operationRuleId: string }[];
  motionRoles?: { part: string; release: string; reduced: string };
  scenarios?: { componentBinding: string; recipeModule: string }[];
  adapters?: { kind: 'store' | 'motion' | 'capture'; module: string; version: string }[];
};
```

Descriptors reference current decision IDs and exact component bindings, with project overrides taking precedence over scoped package presets. A handle rule maps an exact target/domain to a permitted operation and preview capability; it cannot supply arbitrary file offsets. Server validates every target/range/hash regardless of preset. Browser geometry adapters have no disk authority. Trusted executable project modules are already comparable to preset `from` functions; load explicitly, pin versions and keep them out of production. Never evaluate code downloaded from a selected page as an edit rule.

Adapters declare dependency hashes, instance/source scope, accepted syntax, effects, reversible state contract, reduced-motion behavior, deterministic inputs and e2e acceptance IDs. Missing adapter means missing capability, not guessed behavior. Presets can register actual size/weight/variant options; they cannot create unsupported variants. No design system: exact literals remain editable and marked `scale missing`, with no invented snapping policy.

## 16. Prior art: lessons and invariant failures

The evaluations below are design conclusions from the linked primary sources, not claims that those tools promise Plumb's invariants.

- **Bret Victor, Inventing on Principle:** immediate manipulation, temporal inspection and seeing the trajectory motivate this design. The talk's controlled demos are the requested benchmark for experience; they are not a documented arbitrary-React replay algorithm. Reproduce the value/time connection using recorded inputs, not a misleading state-slider façade. [Author's talk link](https://worrydream.com/InventingOnPrinciple/).
- **Learnable Programming:** show values, flow and intermediate states; make source vocabulary explorable in context. Fast final-output refresh alone does not explain execution. Its custom programming environments do not establish exact source identity, concurrent filesystem writes or React effects. Use its visibility principles, retain Plumb's source proof and refusal boundary. [Victor's essay](https://worrydream.com/LearnableProgramming/).
- **React DevTools:** renderer inspection is the strongest reference for observing props/state/hooks and renderer capabilities. Those facilities can mutate runtime state independently of source and do not provide complete event causality or deterministic replay. Use read-only adapters; reject private fiber mutation as a writer or state-restoration mechanism. [Backend](https://github.com/facebook/react/blob/main/packages/react-devtools-shared/src/backend/fiber/renderer.js), [hook inspector](https://github.com/facebook/react/blob/main/packages/react-debug-tools/src/ReactDebugHooks.js).
- **Storybook:** authored scenarios and argument/type-informed controls make component states concrete. Its Controls arg exploration is useful, but changing an arg does not by itself edit the component's authored usage and does not recover arbitrary live-app context/history. Reuse actual stories/provider recipes when compatible; do not make a separate story model the editor's persistent truth. [Controls documentation](https://storybook.js.org/docs/essentials/controls).
- **Onlook:** its open-source architecture describes indexing/instrumenting code, showing the real app in an iframe, editing DOM then code, branching and checkpoints. This supports source-backed visual editing; it does **not** establish Plumb's full-hash creator proof, mandatory explicit Write or design-token restrictions. Do not assert it inherently violates source-as-truth; instead reject its described DOM-then-code path as sufficient proof of equivalence, and any immediate disk-save policy. [Repository architecture](https://github.com/onlook-dev/onlook#how-it-works).
- **Builder.io:** registering real code components and rendering the actual site in an iframe are useful integration ideas. Builder Content stores block/component options as content JSON consumed by its renderer; in that mode the visual content model is an independent authority rather than minimal edits to arbitrary authored JSX. That mode breaks Plumb's source-truth rule. This criticism is scoped to Builder Content, not every Builder product. [Technical architecture](https://www.builder.io/c/docs/how-builder-works-technical), [Write API data model](https://www.builder.io/c/docs/write-api).
- **Plasmic:** code-component integration and generated design artifacts connect visual work to React. Loader mode fetches designs; codegen emits Studio-managed components. Even checked-in generated code can be subordinate to the Studio model and regenerated. Neither is the chosen arbitrary-authored-file edit contract. Learn component contracts; reject a Studio model/generated subtree as Plumb's canonical UI. [Codegen guide](https://docs.plasmic.app/learn/codegen-guide/), [loader versus codegen](https://docs.plasmic.app/learn/loader-vs-codegen/).
- **Webflow:** direct layout controls and coherent styling are useful interaction references. Exported HTML/CSS/JS is an output of its site model, with CMS/runtime export constraints, rather than an exact JSX edit in an existing React app. Import/export round trips cannot be our source authority. [Official code export documentation](https://help.webflow.com/hc/en-us/articles/33961386739347-How-do-I-export-my-Webflow-site-code).
- **Figma:** handle the object, make layout relationships visible and keep manipulation reversible. Auto layout's canvas model is useful for handle semantics, but its geometry and component model are separate from React's runtime/cascade/state. A Figma rectangle does not establish which authored CSS or JSX range caused a pixel. Adopt manipulation clarity, reject reconstruction from a design document as source proof. [Figma auto layout guide](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma).

## 17. Atomic build order and feature acceptance

Future verification only. Do not run these during the present timing run. Never write into the four real app repositories: use read-only inspection and disposable copies/worktrees under an explicitly writable QA location, with isolated ports/processes after the timing run is over. No unit tests. Every slice crosses real browser plus authenticated HTTP boundary and asserts observable behavior/source diff, not internal helper outputs. Commit one coherent implementation slice only after its bounded acceptance passes.

| Slice | Fixture and acceptance through real UI/HTTP | Real-app gate |
| --- | --- | --- |
| 0a: Vite stamping | `live-editor-identity`: host/component JSX, last stamp after spreads, duplicate text/sites, loops, memo/forwardRef, Slot/clones, portals, injected HTML, non-ASCII/BOM/CRLF; every eligible click resolves exact expected creator or explicit usage/refusal. Forged/copied/stale stamps cannot write. Vitest/production build output has no instrumentation | MetalUI Button page, explicit monorepo root; no source modified in original app |
| 0b: identity HMR/SSR | Retained memoized elements refuse old hash; source line shifts, module errors/recovery, SSR/client equal hashes and hydration; pre-hydration/RSC-only write refusal | AlgoRecall SSR/client path; then all four app locate selections with predetermined expected creators, not just valid `<` checks |
| 0c: Next identity | Separate webpack/Turbopack dev fixtures, supported version matrix, loader order/cache tests, production absence; Next without draft adapter advertises identity only | Four apps are currently Vite-based in inspected web lanes; validate real-app preservation on Kamui plus genuine Next fixture rather than pretending Kamui proves Next |
| 1: reading targets | `live-editor-reading`: valid/off-scale literals, class helpers, repeated branches, CSS cascade/themes/responsive units; one coherent hash snapshot, ambiguous/untracked refused | MetalUI usage/recipe split and Crafting Attention token/source readings |
| 2a: class/numeric prop | `live-editor-values`: exact class and prop literal, compiled prop-only preview, Before/Undo/Write, unknown ID/tampered hash/foreign origin rejected, no unpreviewed Write | MetalUI actual usage in disposable checkout; no invented variant |
| 2b: draft lifecycle/writer | Same/cross-file composition, overlap/conflict, concurrent editor save, crash/timeout recovery, minimal quotes/comments/newlines, live rerender style ownership, disk-backed reload receipt | AlgoRecall repeated instance and Kamui web source update; journal/partial-write UI tested before cross-file release |
| 2c: text/style | Whitespace/escaping, conditional text refusal, logical side/shorthand ownership, class compile generation, re-render and replacement nodes | Crafting Attention actual literal text/spacing, preserving theme/reduced-motion behavior |
| 3a: primitives and spacing only | Review tokens and gesture/focus/Before primitives first; then one spacing handle: real gap/padding, snapped/off-scale/scale-missing, pointer cancel, arrows, frame budget, 375 px/zoom/reduced motion | MetalUI Button spacing handle |
| 3b: radius only | Correct arc/axis/token, pill/no-option refusal, keyboard and cancellation, no full-outline highlight | MetalUI radius-capable cap |
| 3c: type only | Glyph tracking/size and type-role constraints, genuine weights, no control panel, exact source writes | Crafting Attention actual typographic primitive |
| 3d–f: size, colour, layout separately | One component/handle at a time, all legal options and states, no fake stretch/absolute layout; each gets its own bounded slice | MetalUI size; AlgoRecall semantic color; Kamui real flex/grid layout |
| 4: static structure | `live-editor-structure`: reorder/wrap/remove/insert, attached comments, import collision, remount/effect safety, Before scenario restoration, dynamic-list refusal | One static MetalUI docs group |
| 5a: scenario states | `live-editor-states`: actual prop unions and required providers, forced labels, independent realm state, invalid option refusal, unchanged live focus/store, pseudo appearance versus event behavior | MetalUI Button real options |
| 5b: code literal connection | `live-editor-live-values`: page/code round trip, shared users, unsaved-buffer refusal, literal-cell bridge equivalence if enabled | MetalUI literal prop, AlgoRecall shared constant |
| 6a: observation/causality | `live-editor-history`: commit props/state/hooks/context, batching/Strict Mode, unknown values/gaps, exact event/reducer chain without inferred edge | AlgoRecall reducer game with declared adapter |
| 6b: replay/forks | Seeded game/timer/network fixture: every commit scrub, edit at n, recomputed suffix, independent fork, mismatched request/digest stops, live effects untouched | AlgoRecall `Sc1SwitchWall` scenario; no whole-app deterministic claim |
| 6c: CSS motion/trails | `live-editor-motion-css`: real animation seek, duration token, complete finite sampled frames, strip/trail, restored ownership and reduced-motion comparison | One supported MetalUI CSS transition |
| 6d–f: WAAPI, Motion, View Transitions separately | One engine at a time; version/source target proof, event safety, runtime versus model curve, unsupported track/refusal and capture gaps | Crafting Attention `SPRINGS`; AlgoRecall `DRAG`/`SPRING`; genuine View Transition fixture plus supported app scenario if present |
| 7: branch keep/discard | `live-editor-prototypes`: two complete source branches/sample inputs, compare/discard zero disk change, keep exact displayed bundle, lost connection/crash/foreign edit recovery | MetalUI; then capability/preview regression checks across Kamui, Crafting Attention, AlgoRecall |

After each slice run its bounded e2e feature spec and necessary type/build checks; do not rerun the entire suite for cosmetic iterations. Broader integration gates occur at completed layers. Before claiming support for any layer, run its appropriate capability/regression selection on **all four** real apps; unsupported features must remain explicit refusals and reduce the advertised scope. None of these checks is claimed completed here.

Health acceptance is shared: while preview preparation/recording/compile jobs are active, replay the existing HTTP burst and confirm the same admission/deadline/busy bodies and overlapping health threshold. Track cold versus warm separately. Browser frame-budget acceptance measures the exact visible handle, actual target paint and source candidate, not a nearby control or the tool readout alone.

## 18. Risks, unresolved questions and cuts

**Sound mechanisms worth building first:** untouched-source stamping with weak birth evidence; versioned AST targets; literal/class edits; explicit source drafts; Vite candidate compilation; supported style-equivalent handles; isolated scenarios with declared props/providers; recording/seek of supported animation objects; reducer/store replay under declared effect contracts.

**Research with architectural room reserved:** arbitrary React hook checkpointing, RSC receipt transfer, Turbopack in-memory draft invalidation, private-renderer version resilience, arbitrary JavaScript causal slicing, Motion layout/gesture seeking, faithful in-page bitmap capture, cross-document View Transition replay and cooperative cross-file publication. Each has an explicit capability/refusal; none may weaken identity or write proof to gain apparent coverage.

Open decisions to resolve at the relevant slice:

1. Which React/compiler/runtime versions preserve JSX birth wrappers, memoized props and clone semantics? Acceptance must include React Compiler and shared props; disable unsupported combinations.
2. Can supported Next versions provide a cache-keyed source overlay and deterministic baseline invalidation without touching authored files? Loader identity can ship first; compiled editing cannot be advertised before proof.
3. Which editor integrations can cooperate with write leases and unsaved buffers? Without cooperation, optimistic filesystem races remain explicitly limited; no claim of universal atomic writes.
4. How should project motion tokens expose JS object decisions to existing preset analysis? Preserve binding/source ownership and protected-definition semantics; CSS tokens alone are insufficient for `SPRINGS` objects.
5. What exact provider/effect surface is needed by the first AlgoRecall replay scenario? Audit its timers/audio and data providers before enabling replay, rather than assuming `useReducer` implies purity.
6. Which capture surface is available to a plain overlay versus a user-enabled browser adapter? Geometry-only trails can ship independently of bitmap capture.

Cut from first release: freeform DOM editing, auto-save drags, AI-generated refactors, automatic token-definition mutation, fake arbitrary variants, generic fiber restore, full-app recording, universal pixel causality, indefinite media capture, collaborative CRDT editing, production embedding and automatic project rewrites during adoption. Keep the first release narrow: Vite identity, coherent reading, exact class/numeric literal drafts and one spacing handle. Finish that real-app slice before radius/type, then earn every later capability with its stated proof.
