# Locate anchoring: low-level design

## Decision

Recover an element's **creation call**, then prove its relation to an authored JSX opening. A valid opening somewhere in the right file is necessary, but insufficient. Neither a unique-looking DOM signature, an owner name, a nearby map segment nor a fifth `jsxDEV` argument establishes that relation alone.

Recommended order:

1. Define creation evidence and preserve a proven inner chain when an optional outer frame has a broken map.
2. Recover the exact generated call and its source literal, with source-version and coordinate provenance checks.
3. Add conservative authored/generated structural matching for compiler output without usable source coordinates. Reuse content anchoring as candidate filtering within this proof.
4. Measure strict map reading in shadow mode; make strictness depend on call boundaries rather than an arbitrary character distance.
5. Add a bounded, optional project-pipeline probe to adoption.
6. Offer explicit development-only stamping where the preceding layers cannot recover identity.

Plain DOM content anchoring is not an automatic write-capable fallback. It cannot meet the requested soundness guarantee for general React programs. A compiler adapter supports a finite set of transformations and refuses everything else. Source stamping provides the strongest independent identity for opt-in projects.

This document describes future implementation and tests. Only this document was written. No browser, app server, verification harness or test suite was run. Transform observations below came from small in-memory Node calls with configuration discovery disabled, not from served modules.

## 1. Grounded baseline

### Current data path

- `overlay/src/locate.js`: `hostOf` finds the nearest React host fiber; `currentFiber` follows committed root children through React's alternate buffers. The selected DOM descendant can belong to an ancestor fiber when markup was injected. New recovery must target that fiber, never invent JSX for an injected descendant.
- `stackOf` prefers `elementStacks.get(fiber.memoizedProps)` over `fiber._debugStack`. An `Object.defineProperty` interception records React 19 element `_debugStack` values against their props. `creationEvidence`, `ownerEvidence`, `committedStacks`, `elementStacks` and `stackHashes` are weak caches.
- `creationFrame`/`readCreationFrame` read the first non-runtime creation frame, call `mapFrame`, and retain its raw `URL:line:column` plus optional original-content `hash`. A failed raw creation frame is different from having no frame.
- `framesOf`/`readFrames` combine bippy `getOwnerStack(fiber, false)` and `getRawOwnerStack(fiber)`. Raw frames supply module URLs; mapped columns are zero-based. React 17/18 use `_debugSource` records instead.
- `locate` uses `tryFrame` and per-locate `asked`/`seen` maps to confirm positions through `request('resolve', ...)`. `tryFrame` currently does not pass the selected host tag. It collects unique `{file,line,column,component}` links.
- `tryFrame` treats `not-jsx:call` as `no-jsx`; the owner-stack loop can skip that on later caller frames. `outside`, `hook` and `other` become `map` and abort the entire locate, including an already populated chain. An element's own authored non-JSX creation remains a boundary.
- The current loop can replace Plumb's mapped line/column with bippy's result for the same raw frame using `Object.assign(own, ...)`, retaining Plumb's hash. These are two readings of one map, not independent proof. Future evidence must record which source each coordinate and hash describe.
- Public result is `{file,line,column,component,tag,via:'owner-stack',chain,index}`. `index` chooses the first non-shared file using `shared`; the chain itself stays innermost first. `overlay/src/model.js` retains it; `overlay/src/widget.js` reads a selected link in `#readAt`/`#step` and supports Alt+Up/Down. Preserve that contract.

`overlay/src/sourcemap.js`:

- `SourceMapStore.script` fetches module text; `scripts`, `maps`, `modules` and `decoded` cache promises with a 64-entry limit and 60-second lifetime.
- `moduleIndex` JSON-decodes supported webpack eval bodies and indexes them by `sourceURL`; `forScript` finds those bodies in page chunks and recent hot-update resources. It does not execute them.
- `row` decodes VLQ segments with checkpoints and yields after roughly 4 ms. A one-field segment has no original source and blocks mapping until a later mapped segment.
- `original` uses the greatest preceding segment **on the requested generated row**, not a segment from a preceding row. Indexed-map section offsets are handled recursively. Returned authored positions and exported `mapFrame` arguments are one-based.
- `original` hashes `sourcesContent` using SHA-256 over UTF-8 text. `mapFrame` has a special Next `?id=` path through `/__nextjs_original-stack-frames`; this response supplies coordinates but no original-content bytes.
- `invalidateSourceMaps`, worker messages, in-flight deduplication and per-caller aborts already define invalidation behavior. Failed or obsolete evidence must not be remapped through a new generation.

Server boundary:

- `src/session/server.ts` dispatches GET `resolve` to `Session.resolveSource`, accepting `source`, `line`, `column`, `tag`, `component`, `hash`, `snapshot` and `owner`. Existing token/origin/loopback protections apply before dispatch.
- `src/session/engine.ts` `resolveFile` applies `sourcePaths`, served-root precedence, root containment, ignored-directory filtering, JS/TS extension checks and realpath checks. An untracked project file is distinguishable from an external library.
- `resolveSource` reconciles the target, checks `sourceFiles`, reads `sourceTexts` or disk, and checks `expected.hash`. Hash-bearing queries and snapshot queries reread disk. It delegates to `jsxLocation`, returning canonical opening coordinates, or `not-jsx` with `positionKind` for unrestricted opening queries.
- `src/session/source-location.ts` `snapshot` caches at most 64 file texts and their oxc AST, `anchors`, line `starts` and `calls`. Anchors contain opening span, canonical line/column, tag, `nameEnd` and optional closing span. Calls contain span and callee name. Parse errors produce no anchors.
- `jsxLocation` can accept positions within an opening, and host-mode calls can accept a closing. Default resolve with no `tag`/`component` selects `'any'`, which restricts the position to the opening-name span. A recovery proof must add an explicit exact-opening check; `tag` alone does not enforce exact opening coordinates.
- `jsxAuthoredOwner` proves a local lexical component binding at a component usage, including some wrapper arguments. It returns a boolean, not a function-body identity. `src/collect/source.ts` `namedAnchors` supplies named spans for collectors, but names and spans are not sufficient lexical binding proof for this feature.
- `Session.apply` already rejects stale source hashes and re-derives edits. Recovery must feed the existing site/edit path; it must not create a parallel writer.

### Evidence strength and numeric baseline

The read snapshot of `docs/verification/verify.algorecall.json` has 150 samples, 8 detached, 93 `bothMatched`, 47 `grabOnly`, 1 `neither`, 0 disagreements, 94 placed readings, and 20/20 opening checks. One additional placement is accounted for by `oracleNotJsx`, so 93 matches is not the complete placement count. Reports may be replaced by the timing run; these are observed inputs, not a fresh acceptance result.

The stored first 20 misses include six with at least one preceding `considered` answer of `jsx` before a later `map` refusal: samples 22–26 and 34. This supports investigating a proven inner prefix. It does not prove those six JSX links are the right creator; that requires the strengthened checks below. Many other misses, including repeated `laminate.tsx` rect/text elements, have no proven prefix.

The inspected MetalUI, Kamui and Crafting Attention JSON snapshots have zero `grabOnly`, zero disagreements and 20/20 opening checks. MetalUI's report has a failed status despite successful location checks. Coverage and performance acceptance are separate. The brief's statement that correctly mapped projects place every sample should be interpreted as preserving their currently eligible placements, excluding detached/runtime-only cases.

`bench/apps/verify.mjs` `inspectRows` checks every chain link through resolve, but disk exactness checks stop after 20 placements and only check that `<` begins an opening. Oracle agreement can be file-level regardless of line, and tag presence can excuse a disagreement. None of those proves element-to-opening identity. New fallback acceptance must check exact expected creators for every newly placed element, not merely repeat these metrics.

## 2. Proof primitives and common contract

### Soundness boundary

There is no algorithm that can promise zero wrong positions for arbitrary incorrect source maps and arbitrary React code using only file/name/tag/DOM literals. Two programs can expose identical runtime observations while constructing the element from different sites. Incorrect coordinates can also land on another valid JSX opening. Exact map segments can themselves be wrong.

The guarantee here is conditional on React's creation record identifying the actual executed call, captured generated text identifying that execution version, and a supported transformation preserving the recorded authored relation. Plumb checks these conditions and refuses when they cannot be established. Host tooling is trusted to implement its declared transformation semantics; an arbitrary plugin that forges source metadata or rewrites identity outside the adapter is unsupported. “One candidate looks right” is not a proof condition.

Existing map-based behavior remains a baseline under that trust model. This design cannot retroactively prove every existing map answer correct. It prevents the new fallbacks from increasing the kinds of guesses accepted and adds adversarial checks for maps that land on valid but wrong JSX.

### Internal records: proposed, not existing fields

`CreationEvidence` is immutable and belongs to an element's creation Error, or a React 17/18 source record:

- `raw`: original URL, one-based generated line/column, stack identity and owner depth. Keep this before map lookup, including failed lookups.
- `module`: executed module identity, generation, generated-text SHA-256, client/SSR mode and host adapter version. URL query parameters are part of identity.
- `source`: canonical tracked file and authored SHA-256. Never replace this hash after a mismatch.
- `call`: exact generated call span, imported runtime binding, generated enclosing function identity and recovered type.
- `proof`: `react-source`, `map-call`, `jsxdev-source`, `structural-call` or `stamp`; mapping interval/offset and source-literal provenance where relevant.
- `opening`: canonical `{file,line,column,start,tag}` returned by server validation.

Component display names remain labels. Generated cache indices, DOM order, class similarity, sibling ordinals and component names never become identity keys.

Keep existing public `via:'owner-stack'` and result shape during initial layers. Expose proof and truncated-chain detail only under `options.explain`; retain immutable evidence internally for HMR checks. An owner/component chain link may have a different tag from the selected host. Validate host evidence against its host fiber type, component evidence against its recovered component binding. Do not pass `element.localName` for every link.

### Coordinates and exact confirmation

Maintain three explicit conventions: browser stack positions one-based; bippy `columnNumber` zero-based; server/authored positions one-based. Convert once at adapter entry. Fifth-argument `columnNumber` is one-based in the observed Oxc/SWC/Babel outputs. Parse raw URL positions before stripping query strings for authored path resolution.

New `confirmOpening` behavior inside the source-location module must require supplied position to equal an anchor's canonical `line` and `column`, with expected tag/binding checks and authored hash. Reusing `jsxLocation` as a selector is allowed, but equality to its returned opening is mandatory. Do not permit closing-tag or attribute-interior recovery. This avoids accepting compiler-output coordinates merely because they fall somewhere inside an opening.

Use oxc offsets and `lineStarts`/`sourceSite` consistently. The installed parser's small non-ASCII probe returned UTF-16-compatible JS string offsets. Integration tests must still cover astral Unicode, CRLF, BOM and non-ASCII before the tag, particularly SWC coordinate differences. No whitespace, newline or BOM normalization when comparing SHA-256 source text.

### Source and generated version binding

Original-content hash alone proves freshness of an authored file, not which generated module created an old element. A snapshot fetched at locate time cannot prove an element's birth version. Do not extend `stackHashes`' first-observation heuristic into a stronger guarantee.

Recovery requires one of:

1. An immutable module URL/version whose text remains available, plus original content bound to that version.
2. A host-captured module record from before invalidation, already bound to this creation Error.
3. A trusted stamp/source record carrying the authored version at creation.

For first observation of an unversioned stable URL after any possible HMR, absent old module evidence, refuse recovery. TTL expiration is not permission to fetch the same URL and associate new bytes with an old Error. A Vite `?t=` URL is usable only if the captured record or returned bytes correspond to that exact request, not a server that ignores the query and returns the latest transform.

Proposed Vite `ModuleEvidenceStore` in the host adapter retains records of the module responses actually served, with effective root/served root, pre-transform source bytes/hash, final generated bytes/hash, environment, URL and generation. Capture response bytes at the HTTP response boundary; a plain `enforce:'post'` transform can still precede Vite import-analysis and is not sufficient by itself. Associate input/output through the host's module request and invalidation lifecycle. Record only identity when body limits are exceeded. Detect input changes during transformation and discard incomplete records.

Use at most 64 retained modules and an 8 MiB aggregate generated-body budget, retiring unreferenced generations. Eviction makes unavailable proof refuse; it cannot trigger reassociation to current text. Stable-URL generations without a creation-time association remain unsupported. Implementation must validate this host interception on the pinned Vite versions before depending on it; immutable module capture is a prerequisite, not an assumed feature of today's Plumb plugin.

### Fallback HTTP boundary

Keep GET `/__plumb/resolve` compatible. Add authenticated POST `/__plumb/resolve-evidence` for generated/text evidence too large for query strings, with the same origin/token checks as existing writes but read-only semantics. Suggested request fields: `raw`, `moduleId`, `generatedHash`, `sourceHash`, `expectedType`, optional bounded primitive `observations`. Vite uses the module store; a generic browser-text adapter may include generated text only with independently established module-version identity.

Server computes hashes, parses text and derives candidates itself. It does not trust a client-supplied candidate list or claimed proof. No server-side fetching of arbitrary submitted URLs. Limit body to 1 MiB, observations to 32 primitives/4 KiB, AST nodes to 100,000 and lexical/dataflow expansion to 64 edges. Start with same-origin client modules; cross-origin dependencies remain library evidence. Never execute getters, app functions, eval bodies or dynamic expressions while resolving.

Response is an existing-shaped confirmed link plus evidence id, or `{refused,detail}`. Explain substeps include `unmapped-call`, `ambiguous-call`, `source-provenance`, `owner-unproven`, `ambiguous-anchor`, `unsupported-shape`, `module-unavailable` and `budget`. Preserve public refusal categories `map`, `no-jsx`, `source-mismatch`, `resolve-refusal`; no protocol guessing by exception-message text.

Reuse `serializeRead`, `readQuery`, `resolveFile` and target reconciliation. Recheck the bound source hash before returning and before edits. A failed/startup Session preserves its existing 503 behavior. Do not block ordinary map locates or host readiness on recovery indexing.

## 3. Approach A: content anchoring

### Required data

Authored `snapshot.program`, anchors and source hash from server; actual host fiber type, `memoizedProps` and `key` from `hostOf`/`currentFiber`; raw generated creation call and binding identity where available. DOM attributes/text are only corroboration: animation, effects, form state, browser normalization and cloning can change them independently of JSX.

Extend the snapshot with lexical scopes/bindings and a per-function opening index. Each opening stores effective JSX attributes in order, spreads, children, lexical creator, direct/delayed creation context and any non-JSX factory paths. Index all potential candidates, including dynamically attributed candidates; do not index only literal-rich JSX.

### Owner body selection

1. Locate the exact generated enclosing function of the raw creation call, not the owner's component-usage frame.
2. Relate its binding to an authored function using verified transformation lineage, or a uniquely resolved authored function-definition position with correct source version. A frame at `<BrandSigil />` identifies a usage, not `BrandSigil`'s body.
3. Resolve lexical declarations and shadowing. Support named functions, directly bound arrows/functions, local export aliases and explicitly recognized React `memo`/`forwardRef` wrappers. Verify wrapper imports resolve to React; a function accepting another function is not automatically a transparent wrapper.
4. Anonymous default exports use a verified function span, not the runtime name `default`. Class `render`, helpers, render props, `.map` callbacks and hoisted compiler callbacks each retain a distinct lexical creation scope.
5. If only `nameOf(fiber)`/stack `functionName`/`displayName` is available, use it for diagnostics and search hints only. Duplicate names, HOCs, arbitrary factories, imports or a definition inferred from an owned child do not prove the body.

`jsxAuthoredOwner` can supply an early local/import boundary but must not be enlarged into “arbitrary call argument proves body.” `namedAnchors` can accelerate searches without deciding them.

### Match relation

For each possible opening use a three-valued relation: `equal`, `different`, `unknown`. A candidate is excluded only by a **proven difference**. Unknown candidates remain in the possible set. The opening can be accepted only when that set has exactly one member and the candidate universe is complete for the actual creation context.

- **Tag:** exact authored host tag versus actual fiber string type, preserving JSX spelling and namespace/case rules. HTML `localName` case-folding cannot establish SVG identity. Member component tags require binding proof.
- **Literal attributes:** decoded JSX strings, boolean shorthand and primitive expression literals can be compared with corresponding React props. Use exact strings for `className`, `id`, `aria-*`, `data-*`; no class subset, token sorting, whitespace collapse, computed-style comparison or CSS equivalence. Numeric/boolean comparisons use typed values, not DOM serialization.
- **Duplicate attributes/spreads:** compute effective values left-to-right. A spread before a final explicit literal does not override that literal. A later unknown spread makes the property unknown; it may also introduce children or reserved fields. Optionally expand a local immutable literal object with no getters/methods/spreads and proven no mutation/escape. Never evaluate a variable to discover spread keys.
- **Dynamic attributes:** `className={cn(...)}`, templates with expressions, CSS modules, conditional values, `style`, animation props, object members and dynamic values provide no runtime literal proof. Unknown is not a mismatch. Structural expression matching belongs to Approach E and can distinguish these without evaluating them.
- **Key:** compare a literal key with the creation element's key only when React's string conversion and context escaping are known. `key` is not a DOM attribute and is not in `memoizedProps`. Ignore unknown/generated/escaped keys as discriminators. A `.map` instance key identifies an instance, not a different authored opening.
- **Text:** only closed literal children, with a tested JSX whitespace/entity lowering rule, against immediate React children. Nested elements, `dangerouslySetInnerHTML`, localization, numbers from expressions, arrays and aggregated DOM `textContent` are unknown. MDX and fragment lowering require their own adapter.
- **Missing property:** a proven absent property can differ from a present literal only in a closed prop construction. Controlled DOM state and dropped unsupported attributes cannot prove absence from JSX.

### Algorithm and proof

1. Establish a source-version-bound creator scope.
2. Enumerate every possible authored creation origin in that scope, including reachable helpers/factories. If completeness cannot be established, refuse.
3. Filter with proven tag/literal differences. Unknown attributes, spreads and dynamic children remain compatible.
4. Require exactly one possible opening. Multiple runtime instances of that one opening are allowed; two authored `.map` openings with identical literals are ambiguous.
5. Establish that the raw call is a recognized JSX lowering, rather than authored `createElement` or a helper producing matching DOM. Otherwise refuse `no-jsx` or `owner-unproven`.
6. Confirm exact opening, tracked membership and hash on the server. Insert it at its creation depth; build outer links only from independent evidence.

Proof: the established creation origin belongs to the complete candidate set. Every elimination is incompatible with an immutable observation or supported lowering semantics. Therefore a singleton is that origin. Removing steps 1, 2 or 5 invalidates the proof. A body containing `<div className="x"/>` and `createElement('div',{className:'x'})` is a counterexample to ordinary unique-literal search.

`BrandMark.tsx`'s two rect openings both have `rx={0.8}` and dynamic geometry/style. Content literals alone leave two candidates. Repeated slabs do not make them less ambiguous. Refuse this case unless Approach E distinguishes the exact generated expression or stamping supplies identity.

### Cost and fit

Cold snapshot parse/index: O(S+A+B), where S is authored text size, A openings and B bindings. Cache by canonical file **and hash**, retaining the existing 64-snapshot bound. Warm candidate scan: O(KP), K openings in proven scope, P observed properties; cap P at 32. Reachable helper analysis is bounded at 64 edges; exceeding it refuses. One evidence HTTP request, followed by canonical site/edit reads. No DOM subtree walk per candidate. Candidate matches never enter `chain` until confirmed.

Rank: low as a standalone fallback; useful as a conservative filter within exact generated-call recovery. Do not launch broad DOM-only anchoring before creator identity exists.

## 4. Approach B: strict map reading

### Required data and semantics

Use `SourceMapStore.row` decoded segments, indexed-map offsets, exact raw generated position, generated call/callee span and current map/source identity. Expose mapping interval metadata without changing existing map callers initially.

An exact-only policy accepts `segment.generated === requestedColumn0`; a generated one-field segment or absent segment stays unmapped. A distance policy accepts a preceding segment within N columns. Neither proves correctness: stack engines point at different tokens, valid maps are sparse, and a bad map can be wrong at distance zero.

### Algorithm

1. Decode the selected row/section as today. Retain `generated`, next segment boundary, source index, original coordinates and whether the segment is unmapped.
2. Compute three shadow results: legacy greatest-lower-bound, exact-only, and call-bounded.
3. Call-bounded accepts a segment only if the requested frame is uniquely associated with a recognized creation call and both segment position and requested position belong to that call's callee/invocation region. A preceding sibling, prior statement, hook, prop factory or ancestor call is not eligible.
4. Respect explicit unmapped segments even inside a call. Never carry a prior mapped source across them.
5. Resolve original coordinates, verify source hash and exact opening/type. Conflicting independent source-literal/structural evidence refuses rather than selecting whichever resolves.
6. If strict selection lacks evidence, invoke Approach E at that same raw frame. Do not jump to a caller's JSX to compensate.

Nested calls require a rule: stack positions within a child invocation select that child; a parent callee token selects the parent. An arbitrary position in the parent's argument span containing multiple creation calls is ambiguous. No “nearest call.”

### Proof and refusal

Strictness prevents borrowing unrelated segments; it does not repair a false segment. Under the supported map trust contract, a segment bound to the actual creation call and confirmed original opening proves the relation. Without that contract or when structural evidence conflicts, refuse. Numeric N is not a proof primitive and must never grant write permission.

Refuse absent mappings, explicit unmapped spans, malformed rows, wrong file/hash, ambiguous nested calls, offsets outside module text, call boundaries not recoverable and unsupported source-map sections. Keep own `createElement`/hook classification semantics. A `hook` result can be recovered only by independently proving the raw generated call was JSX and the map coordinate was corrupt; never skip the hook frame to an owner.

### Measure coverage loss without inventing results

No strictness measurement was run during this task. After the timing run, extend the real browser feature slice to record each placement's raw call, old segment, gap in generated columns, strict answers and exact authored expected opening. Reuse the same DOM references and source revisions for all policies.

Per app and pipeline report: old eligible placements; retained exact positions; exact-only losses; call-bounded losses; recovered losses through Approach E; conflicting positions; cold/warm locate p50/p95; extra HTTP/bytes; health latency. Separate detached/library/runtime-only samples. The inspected baseline placed counts are MetalUI 149/149/145 across its three pages, Kamui 117 and Crafting Attention 98; these are read snapshots, not permanent denominators.

Acceptance for default call-bounded behavior: **zero loss of baseline eligible placements, zero changed expected positions, zero new wrong creators** across MetalUI, Kamui, Crafting Attention and existing Vite/Next/React 18 fixtures. Exact-only stays diagnostic if it loses legitimate placements. Recovery may replace a lossy map answer only with stronger evidence.

### Cost and fit

Existing row decoding cost remains O(segments traversed from checkpoint), with O(log R) segment selection on cached row R. Exact-only metadata adds O(1) comparison. Call-bounded needs O(G) cold generated parsing and indexed interval lookup O(log C) warm, G generated text and C calls. Reuse Approach E's index and current worker yielding; do not decode whole large maps just to gather telemetry. Rank: essential guardrail, not a coverage improvement by itself.

## 5. Approach C: install-time/project-pipeline probe

### Placement in adoption

`src/adoption/init.ts` `initProject` currently infers token/component configuration, validates it, writes config and ledger. It does not create a Vite environment. `src/adoption/doctor.ts` reports installation, ledger and cache status. Introduce an optional `plumb init --probe-maps` subtask and a repeatable `plumb doctor --probe-maps` path after the probe is proven; default init remains fast and does not unexpectedly execute arbitrary Vite config.

Running user Vite config can create files, start plugins or contact services even without listening. The probe must advertise that behavior and run as explicit opt-in in an isolated process. It is not intrinsically read-only. Never run it against these four live repositories during a read-only task. For repeatable downstream validation, use scratch copies with writes redirected there as the existing harness does.

### Inputs, sampling and algorithm

1. Discover effective Vite root/config through the same project-owned resolution principle as `bench/apps/overlay.vite.config.mjs`, preserving `SessionOptions.root` versus `server.config.root` from `src/hosts/vite.ts`. Record Vite, React, JSX/compiler plugin versions and ordered plugin names/enforcement phases.
2. Inventory tracked JSX/TSX files using project source selection; record original bytes and hash. Deterministically sample at most 8 files and 64 authored openings: two small, two median and two large files when available, plus two containing map callbacks, repeated same-tag siblings, memo/forwardRef or compiler directives. Break ties by sorted relative path; distribute openings across functions and file positions. Keep seed/sample manifest.
3. In a child process load the project's own config and a client development Vite environment. Disable listening/opening and place optimizer/plugin caches in scratch. Request selected modules through the environment transform pipeline; do not substitute plain esbuild/Oxc for the project pipeline. There is no browser in the probe.
4. Compare pre-transform authored anchors to recognized final JSX calls using exact source literals with provenance or the validated structural adapter. Build a call-to-authored relation independent of the map being scored. Calls without independent expected origins are `unscorable`, not assumed correct. Optimized-away openings are reported separately.
5. Decode call-site mappings, recording exact, borrowed, explicit-unmapped, wrong-opening, outside/hook/other, content mismatch and absent metadata. Report `exact/independentlyScorable` plus scorable coverage of all sampled calls/openings. A 100% score on 1/64 calls is not a clean bill of health.
6. Attribute causes conservatively. A React Compiler plugin in the list plus `$[n]` cache code and broken mappings is “consistent with compiler transformation.” To name it as a demonstrated cause, compare the same source through an isolated second pipeline omitting just that compiler, with unchanged remaining transforms. Only do this within budget and where plugin reconstruction is supported. Otherwise say “cause unconfirmed.” Do not repeat the brief's proven compiler diagnosis as a generic inference rule.
7. Return structured output and close/kill the child. No change to app plugin order, JSX settings or source files. Do not enable stamps automatically.

### Budget and output

Hard wall budget 5 seconds after child launch, one transform at a time, 1 MiB per module and 8 MiB total. Stop scheduling after 4 seconds; reserve 1 second for disposal, then terminate a stuck child. Startup can consume the entire budget: return `incomplete`, with counts from finished modules, rather than lengthening init. Duration and counts are part of the output, not inferred percentages.

Example output format, **illustrative numbers, not a measured result**:

> Locate maps: 37/52 independently scorable calls exact; 52/64 sampled calls scorable; 8 missing, 7 wrong.
>
> Pipeline: plugin-react 6.0.1, Babel React Compiler 1.0.0. Cause: compiler suspected; differential probe incomplete.
>
> Plumb confirms JSX and source versions. Supported generated-call recovery will run when maps fail. Ambiguous calls remain unplaced. Optional development stamping requires explicit configuration.

Save a report only when requested, e.g. `.plumb/locate-map-probe.json`, outside the ledger/config transaction. Bind report to config contents, dependency versions, environment and sample hashes. Stale reports are labeled stale, never silently reused.

### Proof, runtime behavior and cost

Probe is diagnostic, so it returns no edit position and needs no per-element placement proof. Sampling cannot prove a module or project safe. Its result must not weaken any runtime check, globally distrust all JSX in a project, or bypass source-mismatch. At most it supplies diagnostics or a cache-warming hint after validating its config/version key; per-call runtime evidence always decides.

Cost is bounded project startup plus O(total sampled text/segments/calls) within 5 seconds; **zero per-locate cost** if runtime ignores the report. Rank: adoption clarity after runtime behavior exists, not prerequisite for recovering AlgoRecall.

## 6. Approach D: opt-in source stamping

### Transform and record

Proposed separate development-only Vite plugin, explicitly enabled through host options such as `locate: { sourceStamp: true }`; these options do not exist today. Run before JSX/compiler transforms and before any earlier plugin that moves authored JSX. `enforce:'pre'` alone does not establish that ordering: inspect resolved order and compare incoming bytes with the tracked original source. If they differ, refuse stamping that module.

For each authored host opening, allocate an opaque id bound to `{canonicalFile,sourceHash,openingStart,line,column,tag,sessionNonce}` in a host manifest. Use `data-plumb-source` with that id rather than a bare forgeable `file:line:col`. The requested literal spelling can be exposed in diagnostics; source hash and manifest authority are mandatory for actual acceptance.

Algorithm:

1. Parse untouched authored JSX and inventory host openings. Skip fragments, component tags, dependency/outside-root code and modules with parse errors.
2. Insert stamp as the final explicit attribute, after spreads, while returning a composable map. If the author already declares `data-plumb-source`, diagnose collision and do not silently overwrite it. Bounded manifests track source identity before compiler expansion.
3. Register emitted ids against the exact module generation and served response. Production build emits neither ids nor manifests. Ordinary SSR/client consumers share the same authored hash/id algorithm, excluding random client-only ids.
4. Read stamp from the actual committed fiber's `memoizedProps` and compare with DOM only as corroboration. A manually added DOM attribute is not proof. Check id is bound to the selected host type and actual stamped creation record/module.
5. Server verifies manifest, hash, exact opening/type and membership through the common confirmation path. Cache against creation evidence; stale id returns `source-mismatch`.

### Soundness caveats

Even an authentic DOM stamp can be copied by spread or clone. Thus **DOM attribute alone is not sound**, even with a signed/opaque token. For guaranteed identity, the opt-in transform must retain a creation-time side table associating the stamped JSX runtime result/props with its manifest id. A supported development runtime wrapper records that association without changing React's return value; it must compose with `stackOf`'s props/Error recording and preserve old evidence under cloning.

If that wrapper is unavailable, accept stamps only in a closed construction context with no stamp forwarding/cloning and explicit supported semantics; otherwise treat them as hints. General copying needs refusal, not a bigger token. This is why a non-DOM source side table is a better eventual opt-in implementation than a public attribute alone.

### SSR, hydration, components and snapshots

- Client-only stamping on server-rendered host markup can cause hydration mismatches. Default refuse SSR-enabled stamping unless both paths share deterministic stamps, or use the non-DOM creation side table. `suppressHydrationWarning` is not a fix.
- Development SSR HTML exposes attributes/paths if literal stamps are used; opaque ids reduce path disclosure. Never include a random nonce in HTML that differs between server and client; put authority in the host manifest.
- Snapshot/DOM tests see new attributes; make the mode explicit and provide a test serializer only as a user choice. Do not silently rewrite snapshots or claim production parity while stamping changes markup.
- A `data-plumb-source` prop on `<Button>` can reach an unrelated host through `{...props}` and can overwrite host provenance. Do not stamp component tags with DOM attributes. Source side-table metadata attached to the component's actual JSX result can cover its **usage opening** as an owner link, not prove where its rendered `<button>` was authored.
- Fragments have no DOM attributes. Portals need creation records; DOM parentage is insufficient. `asChild`/Slot/clone behavior must preserve or explicitly distinguish source identities; an overwritten/copy-derived id cannot replace the real host creator.
- SVG/custom-element string host tags are eligible only after namespace tests. Stamps in `dangerouslySetInnerHTML` or copied HTML refuse.
- React Compiler output must be tested to preserve wrapper/stamp identity through memoization. Cache hits reuse birth evidence; they do not create a new source version.

### Cost and fit

Transform: O(S+A), plus O(A) injected bytes/manifest records. Creation-side recording adds O(1) per JSX result; locate is O(1) lookup plus one confirmation request, independent of map size. Server hash/disk recheck remains O(S) when required. Extra DOM attributes affect development HTML and compiler output, so this is opt-in. Chain integration uses stamped host as inner link and independently stamped component usages as outer links.

Rank: strongest supported identity under explicit runtime instrumentation; larger adoption/SSR cost. Ship after automatic narrow recovery, unless AlgoRecall opts in to obtain deterministic full coverage sooner.

## 7. Approach E: reverse engineering the executed module

### Pipeline evidence: presence is not provenance

| Pipeline | Evidence read or produced here | Source-literal conclusion |
| --- | --- | --- |
| Vite plugin-react with Oxc | Installed Plumb plugin-react 6.1.2 sets automatic JSX in `dist/index.js`; Vite `getModifiedOxcTransformOptions` defaults JSX development from `isProduction`. Direct `rolldown/utils.transformSync` on original JSX emits six-argument `jsxDEV`, including one-based source fields. MetalUI uses `react()` then Tailwind; Kamui uses plugin-react 6.1.1; Crafting Attention uses 6.0.1. | Present for the tested pure development transform. Full served output of these apps was not fetched. Later transforms may move coordinates or change calls. |
| Babel automatic development JSX | Installed Next 16.4.0 bundled Babel, called directly with `next/babel`, `caller.isDev:true` and automatic JSX, emitted source object with original `1:34` opening. | Present for this pinned transform. Modern Babel documentation makes `sourceSelf` optional/default false; do not assume every Babel version emits fifth/sixth arguments. [Babel documentation](https://babeljs.io/docs/babel-plugin-transform-react-jsx-development/). |
| plugin-react-swc | Not installed in the four inspected project dependency roots and no existing Plumb SWC locate fixture. Upstream plugin enables automatic/development React transformation; SWC JSX implementation constructs source fields. | Source-derived expectation, not local served proof. Add pinned SWC fixture; inspect whether source metadata is enabled/preserved in that version. [Plugin source](https://raw.githubusercontent.com/vitejs/vite-plugin-react/main/packages/plugin-react-swc/src/index.ts), [SWC JSX source](https://raw.githubusercontent.com/swc-project/swc/main/crates/swc_ecma_transforms_react/src/jsx/mod.rs). |
| AlgoRecall React Compiler | App config runs `babel({presets:[reactCompilerPreset()]})`; installed `@rolldown/plugin-babel` 0.2.3 itself has `enforce:'pre'`, despite appearing after `react()` in config. Its compiler is `babel-plugin-react-compiler` 1.0.0. Direct compiler-then-Oxc probe of authored `BrandMark.tsx` emitted both rect calls and fifth arguments. | Literals survive but name compiler-output lines **124 and 126**, not authored rect lines **70 and 71**. Both are past the 95-line file. Do not treat preservation as correctness. This probe is not the app's complete Vite result; brief's own Vite experiment separately establishes missing mappings. |
| JSX lowered before Babel Compiler | Direct Oxc-then-compiler synthetic probe retained original source literals. Compiler did not introduce cache slots for that lowered example. | Demonstrates preservation for this sample, not an app configuration fix or general Compiler guarantee. |
| plugin-react 6.1.2 native compiler option | Local `createReactCompilerPlugin` imports optional `oxc-transform-react` and integrates JSX/compiler transformation. Apps inspected use the separate Babel preset, not this path. | Separate pipeline; unproven here. Cannot infer it behaves like Babel 1.0.0. Add fixture before declaring support. |
| Next webpack | Existing `e2e/locate.test.mjs` Next webpack slice and `next-frames-diag.log` show webpack-internal creation URLs. Local Next native SWC direct development transform emits original source fields at `1:34`; SWC options set automatic/development. | Present at the tested native transform stage, not yet established in final webpack eval bodies for every config. Babel/classic and custom loaders differ. |
| Next Turbopack | Existing Next fixture and `turbo-map-id-diag.log` show direct chunks plus retained stable URLs/HMR stacks. Same direct native SWC probe supports initial JSX metadata generation. | Final initial/HMR body retention not established here. `?id=` tracing response alone contains no source literal or bytes. Recovery unavailable for non-fetchable HMR bodies until explicit host capture exists. |
| MDX 3.1.1 | Direct `@mdx-js/mdx.compile` with `development:true` emitted source fields for explicit `<rect>` and generated heading; wrapper calls had fileName without coordinates. AlgoRecall and Crafting Attention put MDX before React. | Metadata present, but heading line 1 is Markdown, not JSX. `resolveFile` currently rejects `.mdx`; oxc's JSX index cannot parse MDX. All MDX positions refuse under current authored-JSX policy. [MDX development/runtime documentation](https://mdxjs.com/packages/mdx/). |

The direct compiler probe preserved `y: s.y - slabs.h / 2 + 1`/`fill: s.edge` for the first rect and `y: s.y - slabs.h / 2`/`fill: s.face` for the second. These differences can support a structural correspondence even though literal `rx` cannot. This is the concrete automatic recovery opportunity for BrandSigil.

### Obtaining the exact executed text

1. Retain the raw creation frame before calling `mapFrame`. It is generated evidence even when the map fails.
2. For ordinary Vite HTTP modules fetch the exact same URL, preserving query/base; reuse `SourceMapStore.script` cache only for proven execution generation. Prefer the host module store's final served bytes and original input hash. A new GET of a mutable URL is not proof of what ran.
3. For webpack-internal URLs reuse supported `moduleIndex` extraction from actual page chunks and reversed hot-update resource URLs. Select exact `sourceURL`, JSON-decode string payload, preserve virtual-module coordinate basis. Unsupported eval quoting/wrappers or unavailable old update body refuse. No eval execution, no regex search for a likely JSX call.
4. For ordinary Turbopack HTTP chunks parse that exact chunk's text with its module wrapper. Indexed maps may help identify the authored module but cannot establish call provenance alone.
5. For Turbopack eval/HMR `?id=` module identities, a fetched base chunk is a different module. Existing Next trace endpoint is useful only for map coordinates. If exact inline-map body cannot be fetched/captured, return `module-unavailable`; do not parse the base chunk at the HMR offset or infer literals from a formatted code frame.
6. Skip RSC `about://React/Server/...` frames as current `runtime` logic does. Client evidence cannot prove server JSX without a separately designed server lane.

Parsing uses oxc on the server; no new browser parser package is needed for first implementation. Existing worker retains fetching/index work and 4 ms yielding where applicable. The browser may supply a body under the bounded evidence protocol, but version identity must be independently established. No app config or arbitrary code runs during locate.

### Exact call extraction

Build a generated index containing line starts, lexical bindings/imports, functions and call intervals. Resolve callee aliases to `react/jsx-dev-runtime`'s `jsxDEV`, or supported namespace wrappers such as `(0, runtime.jsxDEV)(...)`. Local functions merely named `jsxDEV` do not qualify. Support `jsx`/`jsxs` and classic lowering only through adapters with independent authored-JSX provenance; authored `createElement` remains a `no-jsx` boundary.

Select a call only when raw frame offset is at its callee/invocation region under tested stack-engine semantics. Parent call argument spans and enclosing function spans do not suffice. Nested-call ambiguity refuses. A stack frame on a memo-cache read or helper invocation does not identify the call that originally created a cached element; only the retained birth Error can.

Extract arguments without execution:

- Type: host string or bound component reference.
- Props: literal object entries and bounded immutable aliases, preserving spreads/duplicates and child structure.
- Key: third argument where applicable, retaining unknown values.
- Source: fifth argument if present. Permit a closed object and an immutable filename binding such as generated `var _jsxFileName = "..."`; require no other writes or escapes. Getters, computed access, missing line/column, nonintegers or unsupported aliases refuse this lane.
- Enclosing generated function/binding, not runtime display name.

### Source-literal lane

1. Establish exact call and birth module/version.
2. Recover source object and its **coordinate space**. When JSX was lowered from untouched original AST, supported adapter can declare authored space. When JSX lowering followed compiler-expanded text, coordinates are intermediate; literal values are not authored positions.
3. For intermediate coordinates, use a retained independently verified pre-JSX transformation relation to recover the original opening. Do not map them through the same faulty final map being bypassed. Without that relation, proceed to structural matching or refuse.
4. Require canonical file/type relation, authored hash equality, exact opening equality and supported runtime binding. If a forged/intermediate literal happens to point at another valid same-tag opening, the provenance check still fails.
5. Add recovered link at the same owner depth as its raw creation frame. Never append it as an ancestor just because its file matches a stack name.

Proof: React identifies executed creation call; module record identifies its code version; the adapter's coordinate relation identifies its original AST opening; server verifies current tracked original bytes and opening. JSX confirmation alone would prove only the last step.

### Structural lane when metadata is absent or intermediate

Use a narrow relational matcher, not general decompilation:

1. Bind generated module to its tracked original input using the host record. Relate functions by lexical binding lineage and supported whole-body transformations; if no function relation survives, compare all compatible original functions and require a unique relation. Names can reduce diagnostics, never eliminate compatible functions. No file chosen solely from a borrowed map segment or a matching component name.
2. Lower each candidate authored opening into a symbolic descriptor of runtime/tag, ordered effective props, key and children. Literals keep decoded values; dynamic expressions retain AST identity, bindings and evaluation order.
3. Normalize only supported generated rewrites: alpha-renamed local bindings; transparent parentheses/type erasure; generated JSX runtime import aliases; immutable hoists; direct temporaries; and verified React Compiler cache branches.
4. Compiler cache adapter recognizes `$ = _c(n)` through the imported compiler runtime, bounded slot accesses and branches with a unique birth assignment plus cache store/load. A slot number is local to its module/function generation. Reject multiple birth assignments, mutation/escape, custom cache helpers and unresolved branch joins. Do not compare `$[17]` with an authored sibling ordinal.
5. Trace compiler-generated callback temporaries to their lexical captures and unique original callback context. Preserve `.map` structure and distinct same-tag siblings. Compare `s.edge` versus `s.face`, and `y + 1` versus `y`, without computing either value. Inline only pure, single-definition aliases whose binding and evaluation semantics are proven; stop on getters, calls, mutation or unsupported expression rewrites.
6. Require a unique correspondence for the raw call over a complete set of compatible originals. For one-to-one lowerings, build a bipartite compatibility graph with unknown pairs retained as edges. Find a complete matching; no complete matching means unsupported shape. Take the selected call's matched opening, remove that edge and ask whether another complete matching exists. Accept only if none does: **every admissible correspondence** assigns this call to the same opening. Use augmenting-path matching, bounded to 256 calls/openings and the recovery deadline. Reordering is allowed; arbitrary duplication is initially refused. A later duplication adapter must first prove an equivalence class of birth calls from one opening before matching those classes. A singleton after discarding unknown candidates is unsound.
7. If both rect expressions survive as observed, first generated rect corresponds to authored line 70 and second to line 71. If compiler erases the distinguishing expression or unsupported optimization changes it, both remain possible and refuse.
8. Confirm exact server opening, hash and type. Runtime literal observations may eliminate proven differences but never resolve an otherwise ambiguous structural relation by score/order.

Refresh registration/wrappers are transport scaffolding, not creator functions. Recognize their import/binding roles and offsets; do not search for `$RefreshReg$` name strings as identity. Compiler memoization preserves the original element Error; retained cached elements after source changes fail hash checks.

Proof: each accepted normalization is semantics-preserving for a documented finite shape and preserves its original binding relation. The actual original opening stays in the complete compatible set. Universal uniqueness of that call's assignment therefore identifies the opening. For arbitrary compiler optimizations there is no such proof; adapter support must remain conservative and versioned.

Refuse missing birth text, mutable/unknown generation, non-fetchable modules, duplicate source bindings, ambiguous call spans, no authored snapshot, stale hashes, explicit non-JSX creation, incomplete creator scope, unsupported hoists/cache/Refresh wrappers, lost structural distinction and budgets. Never fall back to nearest JSX or owner usage after refusing the actual creator.

### Cost and fit

Let G be generated text, C calls, S authored text, K candidate originals and E dataflow edges. Cold text acquisition costs its HTTP bytes; parsing/indexing O(G+C+S). Warm exact lookup O(log C), source literal O(1), local structural comparisons O(KP+E) within bounds. Whole-function correspondence has at most O(K squared) compatibility edges, O(K cubed) worst-case augmenting-path work for each of the two matching checks, and O(K squared) relation storage. Cache its result, cap creator scope at 256 calls/openings and refuse on deadline rather than doing unbounded graph work. Generated bodies above 1 MiB require lazy host-module slicing with proven offsets or refusal.

Cache by generated digest, authored digest, mode and adapter version, not filename/type name. Cache confirmed call-to-opening relations for repeated slabs: many instances of the same two rect calls need two structural proofs, not repeated full scans. Max 64 entries/8 MiB; yield or offload parsing/index work so `/health` remains responsive. One evidence request per missing raw call, deduplicated within locate; avoid a second script fetch already performed by map lookup.

Set a single 250 ms additional recovery deadline per locate, at most 2 new module fetches total and 1 evidence request per raw creator within that deadline; optional ancestors share the remaining budget. Cancellation stays per caller, and obsolete results are discarded. These are design limits, not measured timings. Cache hits should add no generated fetch and one hash-bound confirmation; measure actual p95 before shipping.

## 8. Better adjacent layer: keep only a proven inner prefix

Today's optional outer `map` failure discards confirmed inner links. Recovering that prefix can increase coverage without inventing a new position, provided the first retained link is independently proven to belong to the selected host or the permitted library-owner boundary.

Algorithm:

1. Record whether a link proves the actual selected creator or a permitted usage site reached through classified library code. Arbitrary prior `jsx` answers are not enough.
2. Confirm source/hash/type and preserve raw call relation before declaring the prefix usable.
3. On a later distinct outer frame's `map`/unmapped-call failure, stop extending the chain at that boundary. Do not skip it and resume at still higher owners.
4. Return already proven prefix with unchanged order and normal shared-file ranking within that prefix. In explain mode include `chainTruncated` and failing raw/source details. The selected default must be one of those proven links.
5. An own-frame failure, explicit authored `createElement`, source-version mismatch affecting a retained link, Session failure or untracked creator does not qualify. Validate hashes for every retained source after collection; any mismatch invalidates the answer. Never return a partial result based on cancellation.

Proof: dropping optional ancestor links cannot change identity of an independently proven inner link. It changes chain completeness only. A corrupted own frame still cannot adopt `<Hero />` at `HomePage.tsx:42`.

Cost: O(chain length) existing validation, at most the 32-owner bound, and potentially fewer HTTP requests. Avoid starting resolve requests for all higher ancestors after a boundary; current eager prefetch needs a bounded window. Cache remains evidence-based. Rank: first coverage slice, because six stored miss examples expose this pattern; no claim all six will pass strengthened proof.

## 9. Atomic implementation layers and acceptance slices

All proposed tests are integration/E2E feature slices. No unit tests. Do not run these while the current timing run is active. Every layer is separately reviewable and should be a coherent future commit; this document-only task creates no commit.

### Layer 1 — proof schema and recovery fixtures

Add a dedicated `fixtures/locate-compiler` with pinned AlgoRecall versions: plugin-react 6.0.1, `@rolldown/plugin-babel` 0.2.3, Compiler 1.0.0, compatible Vite/Oxc. Include a faithful small BrandSigil reproduction with two same-tag rects, dynamic member props and identical `rx`; preserve authored line positions in expected data. Use the project's actual plugin order/enforcement. No artificial line offset is acceptable as the sole compiler regression.

New `e2e/locate-anchoring.test.mjs` launches this fixture only during later authorized validation. Through HTTP fetch its final served module/map; assert the second rect's invocation lacks an independently correct authored mapping, while first rect has its known mapping as in the brief. Inspect final source-literal coordinates. If a newer dependency fixes the regression, keep pinned reproduction and add newer coverage separately.

The browser locates each actual rect, reads `/__plumb/site` and `/__plumb/edits`, applies one real editable property to a scratch fixture and verifies only the intended authored opening changed and the other rect stayed unchanged. Dynamic geometry/style may have no offered edit; add a separate uniquely editable sibling for the full write path rather than changing the ambiguous rect's literals to make the locator easier.

Add counterexample routes: source literal pointing at valid wrong same-tag JSX; missing map segment after correct prior segment; hook mapping plus `<Hero/>` caller; authored `createElement` with same props as unique JSX; unknown spread matching a literal candidate; duplicate owner names/shadowing; identical `.map` openings. Expect null with precise refusal. Adapt existing `e2e/locate.test.mjs` HTTP map fixture and React 19 source-mismatch/HMR slices; preserve exact-position assertions.

### Layer 2 — proven-prefix retention

Extend the compiler fixture with a correctly mapped host inside a component whose outer usage maps past its file. Real DOM locate must return the exact inner opening and a chain stopping before the bad usage. Site/read/edit/apply must target that inner opening; chain navigation cannot reach an unproven outer link.

Paired negative: own host frame maps to `useEffect` while an ancestor `<Hero/>` resolves. Expect refusal. Add an outer stale-source case, shared-UI ranking, library/memo/forwardRef owner traversal and cancellation. Run focused existing `e2e/owner-locate.test.mjs` and `e2e/linked-locate.test.mjs` slices when permitted; libraries may produce a usage link but authored factories must refuse.

### Layer 3 — versioned executed-call and source-literal recovery

Add module response capture/evidence endpoint and exact opening confirmation as one boundary-focused layer. Test real HTTP headers/authentication, served-root path, source hash race, body/node limits, unknown URL, absent/expired module generation, source literal at valid wrong JSX and stable URL replacement.

Browser slice on plain original Oxc JSX with deliberately missing final map must recover exact host via source literal; reading/editing changes only that opening. Compiler-before-Oxc source literal at intermediate line must refuse unless structural lineage is available. Compare React 18 direct source records unchanged. Extend existing Next webpack fixture for eval module extraction and hot-update birth evidence; original cached old Error must remain stale after edit.

Add `fixtures/locate-babel` and `fixtures/locate-swc` with pinned automatic dev runtimes. Each captures final HTTP text and validates metadata presence/absence, multiline/nested calls, namespace aliases and Unicode/CRLF coordinates. No claims of pipeline support until these real served slices pass.

### Layer 4 — structural compiler correspondence

Recover the two BrandSigil rects via surviving expression structure, proving exact line 70 versus 71 in the faithful fixture. Both repeated instances from each `.map` opening must resolve to their single authored site. Cache-hit rerender, new birth after dependency change and old cached element after HMR exercise distinct evidence lifetimes.

Negative routes: identical expressions at two openings; overwritten props after spread; mutated hoist; shadowed compiler runtime import; slot reused across functions; branch with two creators; arbitrary helper factory; unrecognized optimization. Every negative must refuse, and no site/edit response may be requested for a guessed link.

Real browser plus evidence HTTP tests cover memo/forwardRef, hoisted callbacks, props containing JSX, children passed across components, injected markup and portals. Existing `fixtures/computed`, `fixtures/linked-package`, dynamic projects in `e2e/locate.test.mjs` and `e2e/owner-locate.test.mjs` cover downstream reads and writes. Restrict changes to this feature, not class attribution.

### Layer 5 — strict map shadow results, then default guard

Extend the existing real HTTP inline/relative/sourceRoot/index/unmapped-span test in `e2e/locate.test.mjs` and browser fixtures with sparse legitimate segments and missing sibling mapping. Record exact-only and call-bounded decisions. Browser output/edit target remains unchanged during shadow mode.

After timing run, run four-app parity in isolated writable scratch workspaces, using the actual app pipelines and the same stable sample references. No writes in source repositories. Make call-bounded default only after zero coverage loss/zero creator changes on correctly mapped apps and the existing Next webpack/Turbopack/React 18 slices. Unsupported Turbopack HMR bodies remain `map`, not an accidental default regression disguised as recovery.

### Layer 6 — adoption probe

Add feature slices in `e2e/adoption.test.mjs`: explicit probe against compiler fixture reports sampled/scorable/unmapped counts and action; clean fixture reports exact origins; expensive config times out and disposes; unsupported custom plugin reports unscorable; report source/config hashes become stale after edits. Verify no listening socket and output confined to scratch/requested report. Check existing config/ledger inference behavior remains intact.

### Layer 7 — optional stamping

Add `fixtures/locate-stamp` client and SSR variants. Browser proves exact host identity and full edit/undo cycle with missing maps; real SSR/hydration verifies deterministic metadata without mismatch. Test production output contains no stamps/runtime recording, author attribute collision, before/after spreads, custom elements/SVG, DOM-manual copying, Slot/clone forwarding and component usage versus host creator. Snapshot impact is visible and opt-in. Missing creation-side association must refuse copied stamps.

MDX is a separate future slice: explicit JSX requires a proper MDX AST/index and membership policy; generated Markdown tags have no authored JSX opening and must remain unplaced. Do not bundle MDX parser adoption into the Compiler fix.

## 10. Numeric delivery target and ranking

Target the same AlgoRecall landing-page eligible cohort represented by the supplied 93 matches/47 oracle-only misses. Recover **at least 24 of those 47 misses** with independently checked creators: matches at least **117**, remaining oracle-only at most **23**, disagreements **0**. That is 83.6% of the 140 match-or-miss cohort versus 66.4% now. Preserve the existing 94 placed readings and gain at least 24, giving at least **118 placements** when the cohort is unchanged.

This is a release target, not a predicted measurement. Reports expose only 20 summarized misses, and the actual scorable Compiler shapes/metadata have not been exhaustively classified. Detached/replaced nodes must not be used to manufacture a gain. If the exact cohort changes, publish old/new eligible counts and recovered opening identities rather than compare percentages across different samples.

Require **100% exact creator acceptance for every new placement**, not just 20/20 opening checks; zero wrong creations in all negative fixtures; zero loss or changed exact positions among existing eligible MetalUI/Kamui/Crafting Attention placements. Preserve the existing 20/20 checks as additional smoke evidence. Oracle-only placements at non-JSX positions are not ground truth and need not be recovered.

Likely contributors: proven-prefix retention for a subset of outer-map failures; source-literal recovery only where literals have authored provenance; structural matching for distinct compiler-preserved expressions. The BrandSigil second rect is the minimum named regression to recover, but cannot alone satisfy the 24-element target. Explicit stamping is the fallback route to higher coverage if supported structural cases cannot meet target; ambiguity still refuses.

Priority by expected value/cost:

| Rank | Layer | Placement effect | Main limit |
| --- | --- | --- | --- |
| 1 | Proven inner prefix | Retains real answers lost to optional ancestors | Inner creator must be independently proven |
| 2 | Exact call/source literal | Recovers map holes with preserved authored metadata | Metadata may be absent or intermediate |
| 3 | Compiler structural relation plus content filtering | Recovers metadata-poor distinct calls, including rect pair | Finite adapter; erased distinction refuses |
| 4 | Call-bounded strict map policy | Prevents borrowing; preserves coverage through stronger fallback | Must measure sparse-map losses |
| 5 | Bounded adoption probe | Explains limitations and likely causes | Sampling/config execution; no runtime permission |
| 6 | Opt-in creation stamping/side table | Strong independent identity, potentially broad coverage | Runtime/SSR/snapshot adoption cost |

Performance acceptance: recovery is lazy and does not increase time to first HTML or delay Session startup. Warm fallback should reuse module/call indexes, stay within current per-app locate p95 plus 10% on comparable samples, and keep health under the existing 100 ms harness threshold. Investigate existing health failures separately; do not label them repaired by this feature. Cold fallback must respect 250 ms extra work budget and return refusal on exhaustion. These thresholds need actual later measurements.

## 11. Risks and open questions

1. **Transformation completeness:** generic reverse compilation is undecidable. Exact supported shapes/versions and unknown-preserving candidate sets are hard boundaries. Does Babel Compiler 1.0.0 preserve enough expression/binding lineage across all 47 misses? Read-only probes establish only the rect opportunity.
2. **Executed bytes:** response interception and source hashing must match the bytes executed after Vite wrappers/import-analysis. Stable URLs and old eval bodies are unresolved without birth records. If capture cannot be proven, first-observed stale elements must refuse; a current file hash is insufficient.
3. **Current proof strength:** server confirmation and tag presence do not themselves prove creation. Prefix retention must not expose old valid-but-wrong map hits. Independent fixture expected origins and source-provenance checks are required.
4. **Owner semantics:** cloned elements, child props, library render/asChild, portals and helper callbacks make `_debugOwner` different from lexical creator. Do not expand body selection based on display names. React 19 owner-stack sampling limits can yield `UnknownOwner`; no invented frames.
5. **Next transport:** exact Turbopack HMR eval text remains unavailable through existing tracing. Support stays limited until a versioned host/runtime capture design is verified. Do not weaken source-mismatch checks to improve coverage.
6. **Metadata evolution:** modern Babel can omit source arguments; native compiler integrations differ from separate Babel transforms. Pipeline presence checks are per version/environment. Installed transform output outranks an assumption from tool name.
7. **MDX policy:** authored Markdown-generated hosts have no JSX opening; current source-file membership excludes MDX. Supporting explicit MDX JSX needs its own parser/edit contract, not a filename exception.
8. **Parsing/performance:** generated chunks can be huge; Session work shares process resources. Offload/cache bounded indexes and preserve yielding/cancellation. Larger chunks may remain unplaced; never trade health responsiveness for exhaustive recovery.
9. **Stamp propagation:** authentic attributes can be copied, hydration can diverge and compiler optimizations can retain old objects. Creation-side association is mandatory for general stamp soundness. Decide whether non-DOM side-table instrumentation should replace attributes before shipping opt-in mode.
10. **Acceptance corpus:** stored four-app reports are samples and are being regenerated. Current 20-position exactness is limited. Later acceptance needs all new creators, identical cohort comparison and full read/edit boundaries in scratch, while preserving unrelated timing work.

The completion condition is measurable extra AlgoRecall placements with exact creation provenance and unchanged eligible positions elsewhere. Unsupported or ambiguous elements remain refusals.
