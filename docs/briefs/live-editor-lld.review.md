# Review: live editor LLD

Review of [live-editor-lld.result.md](live-editor-lld.result.md) against [VISION.md](../VISION.md), the brief, and the code it cites. Read-only; nothing was run. Findings are ranked most severe first. Line references are to the current working tree.

## Blockers

### B1. The birth wrapper is a second identity mechanism, and the first one already suffices

**Section:** §1 item 1, §4.2, §4.6, §18 open decision 1.

**What the LLD does.** Besides the `data-plumb-source` attribute, the pre transform wraps every JSX expression in `__plumbBirth(<jsx/>, {stamp, siteId, generation})`, adds a helper import to every module, keeps weak maps from element and props objects to "birth records", registers module manifests with the session, and makes `locate` corroborate the attribute against those records. SSR, RSC and hydration then need "a versioned server creation receipt tied to the emitted Flight/HTML element and a verified transfer into the client instance", which the LLD calls research and uses to make RSC output read-only.

**Why it is wrong.** The owner chose one mechanism, the attribute, hash-checked. The wrapper is a second mechanism stacked on it, and it is the expensive one: it rewrites every JSX expression in every tracked module, puts a call around every element (which `babel-plugin-react-compiler` treats as an unknown call), has to be kept correct for nested JSX, spreads, and evaluation order, and cannot cross the Flight boundary at all.

The proof the wrapper exists to supply is already in React. React sets a host element's DOM attributes from `fiber.memoizedProps`, and `memoizedProps` is the element's props object. `locate.js:32` already relies on exactly this identity (`elementStacks.get(fiber.memoizedProps)`). So the check is:

1. Take the committed host fiber (`hostOf` + `currentFiber`, `locate.js:78-99`).
2. Read `fiber.memoizedProps['data-plumb-source']`. Not the DOM attribute: React does not patch attribute mismatches on hydration, and `innerHTML`, cloned nodes and hand-written DOM have no fiber of their own, so `hostOf` lands on an ancestor whose props do not carry the copied value.
3. Send the stamp to `resolve` with `hash`. `resolveSource` already rereads disk and compares (`engine.ts:408-410`), and `jsxLocation` canonicalises; add the one check the LLD itself names in §2, equality with `opening.start`, plus `tag` equality with `fiber.type` for host fibers.

That covers every case the wrapper was for. A `cloneElement`/`asChild` copy still has the stamp in its fiber's props, and the stamp still names the JSX that authored those props, which is the right edit target. A component stamp forwarded onto a library host (`<Button {...props}>` → `<button {...props}>` in an untracked file) is the usage link the owner wants; the host fiber's `_debugOwner` chain gives every enclosing usage stamp with no source maps and no stacks. RSC host elements work too (see M2). Retained memoized elements carry the old hash and are refused by the disk compare (§4.3's requirement, met for free).

**Fix.** Delete §4.2 and the manifest/registration/generation machinery in §4.3 and §4.4. Identity is: attribute in props, read from the fiber, hash-checked by `resolveSource`. Keep the owner-stack path only as the fallback the vision names, and do not grow the `Object.defineProperty` interception (`locate.js:22-31`).

### B2. The namespaced candidate module graph and realms are the second copy of the UI the vision forbids

**Section:** §1 item 4, §6.3 ("Isolation must include the compiler graph"), §6.4, §9, §10.1, §11.2-11.3, §13.

**What the LLD does.** For effectful or remounting previews, the Vite adapter serves "an authorized, versioned candidate namespace" in which module identity is `{draftId, version, canonicalOriginalId}`, internal imports are rewritten into that namespace by a parser-backed resolver, and the result runs in an iframe realm with its own globals, storage and stubbed effects. States (§10), replay (§11) and variations (§13) all run on this.

**Why it is wrong.** VISION "Source is the truth": "Every change is a minimal edit to the authored file, applied through the dev server's normal reload. Plumb keeps no hidden layer of overrides or second copy of the UI." A rewritten module graph executing in a separate realm is a second copy of the app, however it is labelled. It is also the largest single piece of work in the document (resolver, alias and transform-order preservation, source-map composition, SSR exclusion, lease management), and nothing in layers 0-3 needs it. The LLD half-admits this: "Until the namespaced graph passes equivalence/isolation acceptance, host-wide compiled preview is limited to declared reversible, effect-safe slices".

**Fix.** For layers 0-3 there are exactly two preview mechanisms, both of which are the dev server's normal path:

- Style edits: a transient Plumb stylesheet (M1).
- Prop, text and structure edits: serve the candidate bytes for that one module from the Vite `load` hook and call `server.reloadModule` (Vite 5+). That is the "normal reload" the vision names; React Fast Refresh keeps hook state when the hook signature is unchanged (a literal edit never changes it), and effects re-run exactly as they would after a save. Disclose that in the preview banner. Detect the one case Fast Refresh cannot handle before previewing (M7).

Remove the namespace/realm design from layers 2-4 entirely. Reserve it for the layer 5-7 briefs, where the vision already says "these need a model of application state. Decide ... before building either".

### B3. The server-side draft, receipt, lease and transaction machinery adds state without adding proof

**Section:** §3 "Proposed HTTP contract", §6.2, §7, §14.

**What the LLD does.** Seven new routes (`targets`, `draft`, `preview`, `preview-receipt`, `draft-history`, `apply-draft`, `discard-draft`, `transaction`), server-held drafts with versions, parents and history cursors, preview leases, receipts that "acknowledge a displayed version", a project advisory write lease, same-directory staging with atomic rename, and a cross-file recovery journal.

**Why it is wrong.** Preview-before-write is a rule about what the person saw. The server cannot know that; the LLD says so itself ("Receipt is authorization for this UI workflow, not a security guarantee"). The overlay already enforces it: Write sends only previewed marks (`widget.js:817`, `#writable`). Moving the draft to the server therefore buys nothing on exactness and costs a state machine that has to survive HMR, tab close, lost connections and server restart, plus the coordinator/host classification work in §2. The atomic-rename writer, the advisory lease and the cross-file journal solve problems layers 0-3 do not have: every edit through layer 3 is single-file, and `Session.apply` already holds the descriptor, compares the hash through it and writes once (`engine.ts:468-487`).

**Fix.** Three additions to the existing API, all stateless except one slot:

- `GET targets?file&line&column` (read, batched like `edits`): the editable literals under one opening, each with `{id, kind, start, end, from, domain, decisions, scope, instances}` where `id = sourceHash([file, hash, start, end, from])`, the same scheme `structuredEdits` uses (`edits.ts:75`).
- `POST apply` extended to accept `edits: [{id, to?}]`. Today `apply` re-derives `to` from decisions; for a literal the person typed or dragged, the server re-derives `from` from the id and range, validates `to` against the target's domain (number, unit, class token the project compiles, string escaping), and writes through the existing gates. No client bytes are ever spliced unvalidated.
- `POST preview {file, hash, edits}` / `DELETE preview`: at most one candidate per session, served by the Vite `load` hook until released, dropped on any disk change to that file. This is the only server-held draft state and it exists only because compiled preview needs the dev server to see the candidate.

Undo/redo history, Before, and coalescing of pointer moves live in the overlay, as they do today (`widget.js:779-810`). Cross-file edits, rename-based writing and the journal move to the layer 4 brief, where wrap/insert first needs an import.

## Major

### M1. Inline-style projection is not exact under an app re-render; a transient stylesheet is

**Section:** §6.3 "Fast style projection", §6.4.

**Evidence.** `#preview` writes `el.style.setProperty(prop, value, 'important')` on the pinned element and `#restore` puts the remembered value back (`widget.js:761-777`). If the app re-renders with a new inline `style` prop while the preview is up, React assigns the changed property directly, replacing Plumb's value; `#restore` then writes the pre-preview value over the app's new one. The LLD knows this and proposes observers, ownership tracking, "suppress the observer for Plumb-owned writes and record generation", and stopping the fast path when ownership cannot be determined.

**Fix.** Do not touch the element. Put the preview in a Plumb-owned constructed `CSSStyleSheet` in `document.adoptedStyleSheets`, with one rule per pending edit: `[data-plumb-source="<stamp>"] { padding-inline: 24px !important }`. The element's own inline style is never written, so React's writes and Plumb's never collide; Before and Undo toggle or drop the rule, which is exact by construction; there is no residue (`#restore`'s empty-attribute dance at `widget.js:776` goes away); and the rule applies to every instance of the stamped opening, which §3 says a definition-level edit must do and which the current per-element preview does not. The one case it loses is an inline `!important` on the element, which `getComputedStyle` reveals after applying; fall back to compiled preview there. This is the "transient, visible change backed by the pending diff" that §1 allows; it is not the durable override sheet §1 rejects, because it exists only while a draft is pending and is dropped on Write, Undo, close and `pagehide`.

Two checks still have to be stated concretely, which §6.3 does not: a token with a variant chain (`md:`, `dark:`) is projected only when the condition currently matches (`matchMedia`, the project's dark selector); and after applying, `getComputedStyle(el)[prop]` must equal the expected resolved value, otherwise the projection is masked and the draft compiles.

### M2. RSC host elements are exact today and the LLD marks them read-only research

**Section:** §4.6, §17 slice 0b.

**Evidence.** A server component's JSX is serialised to the Flight payload with its props, including `data-plumb-source`; the client creates a host fiber whose `memoizedProps` carries it, and sets the DOM attribute from it. With the B1 check (prop on the committed fiber, hash compared to disk by `resolveSource`), that is the same proof as for a client component. What RSC lacks is the component usage chain (no `_debugOwner` for server components), so the chain stops at the host; that is a reading limitation, not a write refusal. The LLD's "server creation receipt ... verified transfer into the client instance" exists only because the birth wrapper's weak maps live in the server process.

**Fix.** Remove the RSC-is-research paragraph. State: RSC host JSX in tracked files is editable; its usage chain is unavailable; pre-hydration DOM (no fiber yet) is hints only, as the LLD already says.

### M3. Plugin order and skipped openings are not stated concretely

**Section:** §4.1 items 2-3, §4.4.

**Evidence.** `@vitejs/plugin-react` 6.1.2 declares `enforce: "pre"` on its JSX transform (`node_modules/@vitejs/plugin-react/dist/index.js`, `vite:react-babel`). Two `pre` plugins run in the order the user lists them, so `plumb()` after `react()` receives JavaScript with `jsxDEV(...)` calls, finds no JSX openings and stamps nothing, silently. `src/hosts/vite.ts` currently has no transform and no ordering guard.

Also: `<Fragment>` and `<React.Fragment>` must be skipped, not only `<>`; React warns on any Fragment prop other than `key`/`children`. The LLD skips only the shorthand.

**Fix.** In `configResolved`, refuse (with a diagnostic naming the plugin) if any `vite:react-*` transform precedes `plumb`, or reorder with a `config` hook. Skip Fragment in all three spellings and any member expression resolving to it. Add a fixture to slice 0a with `react()` listed first, asserting the diagnostic.

### M4. The collision rule disables stamping for a whole module over one authored attribute

**Section:** §4.1 item 5.

**Evidence.** `e2e/locate.test.mjs:32` already authors `<aside id="explicit" data-plumb-source="src/App.jsx:19:5">` in a fixture. Under the LLD's rule that module loses stamping entirely and every element in it falls to the fallback.

**Fix.** Skip only that element. Its authored value has no hash and fails `resolve` as malformed, which is the right answer for that one element; the rest of the module stays exact.

### M5. Rebase after an external save is a heuristic

**Section:** §6.2 "External save".

**Evidence.** "A narrowly disjoint change may be offered for explicit rebase review if a byte-diff map proves every old range and lexical dependency unchanged and reparsing confirms the same binding". A diff map proves bytes moved, not that the person's draft still means what it meant; that is the "nearest text" class of reasoning §1's table rejects.

**Fix.** Cut it. External save while a draft is pending: drop the draft, show "file changed; reselect". That is what `apply` does today (`staleFile`, `engine.ts:458-462`) and it is exact.

### M6. Layer 1 does not say how the overlay shows a target that has no finding

**Section:** §5, §2 "Read, preview and write".

**Evidence.** The overlay's reading is finding-driven end to end: `reading()` builds one mark per finding site (`model.js:42-71`), `#drawDiagram` places pins from `s.marks` (`widget.js:590-635`), and an element whose declarations are all on the scale renders "Everything this element sets uses your tokens" with no marks and the Sync button disabled (`widget.js:699-703`). Layer 3 handles need a target for `padding` whether or not it is off the scale. §5 says "Findings remain attached judgements; they are not the inventory of editable things" but never says what replaces them in the widget.

**Fix.** Specify the model change: `reading()` builds marks from `targets` (one per authored declaration/literal/prop), attaches findings to the mark they judge, and keeps `regionFor(el, props)` as the mark-to-geometry map (it already takes a prop list). Marks without findings render quiet. Count badges and ledger status keep their current meaning. This is the first thing layer 1 has to build and verify, before any handle.

### M7. Compiled preview needs the Fast Refresh boundary check named, not described

**Section:** §6.3 "General compiled preview", §6.4.

**Evidence.** "If any affected module requires full reload, say so before preview" gives no mechanism. plugin-react accepts an HMR update only when every export of the module is a React component (its refresh-boundary rule); otherwise Vite falls back to a full page reload and the app's state is gone, so Before cannot restore it. The same rule decides whether a candidate module is previewable at all.

**Fix.** The server's `targets` reply includes `preview: 'style' | 'module' | 'reload'` per target, decided by parsing the module's exports with the oxc snapshot already in `source-location.ts`. `module` previews run; `reload` targets preview only after the person accepts state loss, and never during a drag. Say in the banner that effects re-run.

### M8. The after-write receipt is one check, not three

**Section:** §6.4 last paragraph.

**Evidence.** Today `#reread` waits for the element's `class` attribute to change, then for the reading's hash to change (`widget.js:880-884`), which fails for prop-only writes. The LLD replaces it with `{new disk hash, host generation, committed disk-backed birth}` plus stylesheet acknowledgement.

**Fix.** With stamps the criterion is: the pinned element's committed fiber carries a stamp whose hash equals the hash `apply` returned. One read, exact, prop-only safe. Stylesheet generation (Tailwind producing a class that did not exist before the write) is a separate, visible "class not yet compiled" state detected by `getComputedStyle`, not part of the write receipt.

### M9. Time travel is designed around an adapter no project has; the first real slice is observation

**Section:** §11.1-11.3, §17 slices 6a-6b.

**Evidence.** Replay requires a "project adapter [that] exposes versioned state codecs/checkpoints, ordered domain actions, dependency/effect handlers, a virtual scheduler and a scenario mount". None of the four apps has one; the AlgoRecall scene named (`src/lld/problems/07-chess/Sc1SwitchWall.tsx`, exists) would need audio, auth and provider stubs written first. "Edit at n and recompute the suffix" is therefore unreachable in the first release, and the LLD's table of stop conditions is a list of reasons it will stop. It also does not ground commit observation in what is already vendored: bippy's `instrument`/`onCommitFiberRoot` hook composition (`node_modules/bippy/dist/core.js`, served via `overlay/vendor/bippy/core.js`) is exactly the "compatible observer ... compose with an existing DevTools hook" §11.1 asks for.

**Fix.** Split layer 6A. Build first: commit observation only, through bippy's hook, for the selected subtree: per commit, props/state/hook values as bounded descriptors plus a serialised clone of the subtree's DOM, shown as a scrubbable strip labelled "recorded appearance". That is sound, needs no adapter, and is what the talk looks like. Keep the replay contract as the layer 6 brief's input, with the fixture game as its proof; drop the AlgoRecall replay gate from the first release. Causality (§11.4) follows replay, not observation; move it after 6b.

### M10. Motion seeking depends on layer 5 forcing, and the Motion library claim is incomplete

**Section:** §12.2-12.3, §12.6, §17 slice 6c.

**Evidence.** A CSS transition exists only while it runs; seeking a hover transition requires the hover state to be forced first (§10.1's `:hover` to attribute stylesheet transform). The LLD lists 6c independently of 5a. For Motion, "declarative `motion` components ... do not provide one universal publicly seekable handle" is half right: Motion 11+ runs transform and opacity animations on WAAPI when it can, and those are visible through `element.getAnimations()` and seekable like any CSS animation; only JS-driven (layout, non-accelerated) tracks are recorded-only. The §12.1 adapter should say which `motion` tracks it can seek instead of treating the library as one case.

**Fix.** Order 5a before 6c. In §12.3, state the WAAPI-backed case as seekable through the CSS/WAAPI adapter and the JS-driven case as recorded-only. The stylesheet transform for forced pseudo states should be stated as a dev-only Vite CSS transform under an explicit query flag, applied to the project's own CSS and Tailwind output, so it is one mechanism rather than a per-rule rewrite in the browser.

### M11. Code-to-page needs no reverse index

**Section:** §10.2.

**Evidence.** "Code-to-page uses a reverse index from target ID to known dependent stamped sites and mounted instance IDs."

**Fix.** The stamped DOM is the index. A target's opening is `file:line:col`; `querySelectorAll('[data-plumb-source^="file:line:col#"]')` returns every mounted instance of that opening, and a definition-level literal (a constant used by a component) maps to the openings inside that definition's file via the server's AST, then to the DOM the same way. Unknown consumers (a constant exported and used in untracked files) are disclosed exactly as the LLD says.

### M12. Slices 0a and 2b are each several atomic layers

**Section:** §17.

**Evidence.** 0a covers host and component stamping, spreads, duplicates, loops, memo/forwardRef, Slot/clones, portals, injected HTML, encodings, forged/copied/stale stamps and the production/Vitest absence in one slice, plus the MetalUI gate. 2b covers same-file and cross-file composition, overlap, concurrent editor saves, crash/timeout recovery, formatting, live re-render ownership and reload receipts.

**Fix.** 0a: the transform, the fiber-prop check, the `resolve` stamp branch, one fixture with host, component, spread and loop cases, the MetalUI Button page. 0b: retained elements, external edit, HMR line shifts, non-ASCII/BOM/CRLF, injected and cloned DOM, Vitest and build absence. 0c: SSR hydration and RSC. 0d: Next webpack. 0e: Next Turbopack or an explicit refusal. 2b shrinks to single-file composition, overlap, external save, the write receipt; cross-file, crash recovery and the journal move to layer 4.

## Minor

- **m1. Server route lists.** New POST methods must be added to `expected` and `known` in `server.ts:122-123` and excluded from the `json` read path at `server.ts:184`, as well as the coordinator's `read` list (`coordinator.ts:10`) the LLD does mention. Omitting the server lists makes a new mutation a 405 or a JSON-serialised read.
- **m2. Hash size.** 64 hex characters on every element is fine in dev but should be stated as a known DOM cost (roughly 100 bytes per element). Do not shorten it; `resolveSource` compares the full hash and the attribute is the only carrier.
- **m3. Encoding claim.** §3 says ranges are UTF-16 and asks for fixtures to prove it. `e2e/edits.test.mjs:64-65` already proves astral characters and CRLF through `edits` and `apply`; cite it and extend it to `targets` instead of re-proving.
- **m4. Ledger observation.** §5's new unaccepted-observation record is right in intent and consistent with `applyLedger`/`writeLedger` (`src/ledger/check.ts:23`, `store.ts:32`). It should be its own slice after 2a, with the schema, not a paragraph inside reading.
- **m5. `EditorPreset.handles[].geometry`** (§15) is an untyped string. Name the enum (`edge`, `corner`, `glyph`, `gap`, `swatch`, `axis`) or drop the field until layer 3 needs it.
- **m6. Budgets vs. cold cost.** §14's 100 ms warm locate omits that `edits` may run a focused `analyze` on first read of a file (`worker.ts:178-191`) and `resolveSource` with a hash rereads disk per file (`engine.ts:408`). State cold numbers separately and measure on MetalUI, as §14 asks for warm.
- **m7. Prior art.** §16 is accurate and does not copy; it can be shortened to the invariant each tool fails, which is what the brief asked for.
- **m8. Touch and keyboard** (§8) are good and match MetalUI's rules; keep the note that cancellation is not acceptance (MetalUI's shared `onUp` is a known gap there).

## What holds

Stated so the next engineer does not re-derive it: the layer order 0 → 1 → 2 → 3 is right and matches the vision; the choice to generalise `structuredEdits`-style ids and `Session.apply`'s gates rather than build a second writer is right; refusing to write to token definition files through layer 3 is right; "no sliders, steps snap, highlight only what is pointed at" is carried over faithfully from `EDITING_LAYER.md`; the motion data model (§12.1) and the spring equation are fine; recording off by default is right.

## Verdict

**Build first, exactly:** layer 0a as a pure transform. A Vite `enforce:'pre'` plugin listed before `react()` that parses tracked `.jsx/.tsx` with the oxc snapshot already in `source-location.ts`, inserts ` data-plumb-source="<path>:<line>:<col>#<sha256 of the incoming code>"` last on every non-Fragment opening with a composed source map, and returns the code; no helper import, no manifest, no session call in the transform. In `locate.js`, before the owner-stack path, read the stamp from the committed host fiber's `memoizedProps` and its `_debugOwner` chain, and send each to `resolve` with `hash`. In `resolveSource`, add the `opening.start` equality and tag check. Fixture `live-editor-identity` with host, component, spread, loop and a hand-authored attribute; the real-app gate is MetalUI's Button page from its monorepo root. Then 0b (retained elements, external save, encodings, Vitest/build absence), then layer 1 as the target-driven reading model (M6), then `targets` + extended `apply` + the transient stylesheet preview for one class token on MetalUI, then one spacing handle.

**Change in the LLD before building:** delete §4.2 and the manifest/generation parts of §4.3-4.4 (B1); replace §6.3's compiled-preview isolation with single-module `reloadModule` preview plus the Fast Refresh boundary check (B2, M7); collapse §3's HTTP contract and §7's transaction design to `targets`, extended `apply` and one `preview` slot, with history in the overlay (B3); replace inline-style projection with the transient stylesheet (M1); mark RSC host JSX editable (M2); add the plugin-order guard and Fragment rule (M3); make the collision rule per element (M4); cut rebase review (M5); rewrite §11 as observation first with replay deferred to the layer 6 brief (M9); order 5a before 6c (M10); resize the slices (M12).
