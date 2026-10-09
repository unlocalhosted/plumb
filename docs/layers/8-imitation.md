# Layer 8: imitation

Imitation only, against DESIGN 4.5 and section 9 row 8, reusing layer 7's component identity. No installation, commit, MetalUI write or ledger change. `formatText`, `formatFinding` and `brief` are unchanged. Project-specific configuration and receipts remain in `bench/metalui/`.

## Explicit fingerprints

```ts
imitation: {
  Textarea: { fingerprint: ['kit-well', 'var(--kit-well-'] },
  Field: { elements: ['input'], fingerprint: ['kit-field-*'] },
}
```

`elements` is optional and defaults to any native tag; an explicit empty array selects none. Entries are OR evidence: one matching fingerprint is enough. Class names match whole collected candidates; globs support `*` and `?`. A `var(--prefix` entry matches that substring in lowered declaration values, including inline styles and compiler-produced recipes. A complete `var(--name)` matches that exact variable, including whitespace/fallback syntax. Declaration `authoredCss` preserves variable evidence through compiler fallbacks. Opaque values do not invent evidence.

Only native JSX elements can fail. Layer 7 identities exclude imported aliases, namespace/compound components, forwarding wrappers and render targets. The target component's own source file is exempt, including its local helper markup; a raw child at a consuming call site is still a raw element. Configured component names are resolved even when callers never mount the component, and discovery directories can lie outside caller source globs. Dependency sources are identity/inference inputs, never additional project callers.

`src/imitation/index.ts` creates `imitation/<Component>` errors grouped by component source and matched fingerprint set. Each physical element appears once per configured component, regardless of how many classes/declarations match. The fix says `use <Component>; it already owns …` and names the matched classes/globs or variable prefixes. Findings retain component metadata and exact occurrence declarations. Element locations carry the actual matched evidence in their text; wildcard class/value changes therefore receive new ledger keys rather than inheriting old debt.

Plain stylesheet class rules also supply lowered evidence when an element explicitly uses their class hook. This is limited to direct positive class selectors, optionally qualified by a tag or simple pseudo. Descendants, functional pseudos, attributes, sibling selectors and runtime cascade/ancestry are not inferred. Class constants retain their use-site identity; constant definitions and strings in unrelated JSX attributes do not become raw elements.

## Report-only inference

`plumb imitation --suggest [--json]` reports one proposal per discovered component, with canonical component/source metadata, `fingerprint`, and `rawElements`. It exits 0 even when the normal rule report contains errors. It never edits config or enables suggestions. Normal checks do not compute proposals.

The component graph exposes returned root styling ranges and statically identifiable root classes. Root class expressions follow local constants, variant maps, templates and recognized class helpers; tests/variant keys and child markup are excluded. The existing class/inline collectors and the project's own Tailwind compiler supply additional root declaration evidence. Exact variable references and custom-property assignments become complete `var(--name)` candidates, excluding compiler infrastructure `--tw-*`.

Exclusivity compares each root candidate against every other discovered component's source, including unused exported components, child declarations and source string/template evidence. Sharing a source file conservatively prevents exclusive fingerprints between its components. Properties reached through compiled classes participate in the comparison. Imported static class maps can be supplied by the existing collector; opaque expressions and unrecognized runtime helpers remain limits. Returned provider wrappers are not flattened: Field's provider root consequently has no inferred fingerprint. Caller counts reuse the explicit matcher, with no tag restriction, deduplicate physical elements, and exclude identified components and the candidate's own source.

The compiler has a small additive, inference-only `reportOnly` mode. Unsupported compiled CSS retains raw compiler text/reference inventory without fabricated declarations, emits a note for affected root proposals, and is never cached as successfully lowered. Normal lowering still fails exactly as before. This keeps source exclusivity conservative without changing the earlier judging layers.

## Shared integration

- `config.ts`: optional, validated tag filters; nonempty fingerprint arrays.
- `ownership/components.ts`: additive element/root/source evidence and opt-in unused export discovery; existing caller/ownership semantics remain intact.
- `index.ts`: one explicit imitation pass; opt-in proposal attachment.
- `cli.ts`: `imitation --suggest`, JSON/text output and command validation.
- `report.ts`/schema: one optional proposal field; protected formatters unchanged.
- `lower/tailwind.ts`: optional inference-only recovery; failed results do not enter the shared cache.

## Validation and MetalUI

Six real CLI integration/e2e slices in `e2e/imitation.test.mjs` cover class/glob/inline/CSS/compiled evidence, OR/tag/source boundaries, aliases/wrappers/render identities, own-source exclusion, unused discovery outside caller globs, exclusive root suggestions, deduplicated counts, fallback references, config/command failures, report-only behavior, and ledger wildcard changes. No unit tests.

Final `npm test`: **100 passed, zero failures/skips**. Typecheck and `git diff --check`: green.

MetalUI is pinned to **faa2036e4634e4f6c8d49feaa2dac87a77559501**, the layer 7 revision, archived inside `bench/metalui/.cache/layer8/input/`. Existing installations are linked read only. Inherited preset inputs are byte-checked against that archive. `PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/layer8`; no other layer's cache is touched. The benchmark script accepts explicit `METALUI_ROOT`/`METALUI_COMMIT` overrides.

`Textarea` uses `recipe-well-field`; `Field.Root` composes `Well`, whose field variant supplies the same recipe. The legacy `material-well` utility supplies the well gradient/shadow; current `recipe-well-*` values reference `--mu-r-well-*`. These are shared material, not exclusive component identities, so the explicit benchmark deliberately limits Textarea to `textarea` and Field to `input`. No hardcoded project fingerprints appear in `src/`.

Result: **8/8 hand-verified pages**, exactly one matched native control each: seven Textarea sites and TagCue's one Field input. Two additional true imitation sites are reviewed separately: CueRecognition's legacy material-well textarea and ProvenanceDocument's recipe-well-field textarea. Total **3 groups / 10 elements**, zero own-source findings. Full location/verdict reconciliation and five component proposal summaries are appended once at the end of `BENCHMARK.md`.

Pinned MetalUI's inherited default CLI check crashes in layer 6 at `applyLedger`, because dead-var compiler fallback sites share a file/line/column/text and one duplicate never receives a ledger key. Reproduced with the ownership-only config, without imitation enabled. The benchmark therefore measures `check({ ledger: false })` in fresh processes; it does **not** claim a successful default MetalUI CLI check. Fixture checks, including imitation baseline/check, and the real MetalUI `imitation --suggest` CLI pass. Layer 6 is untouched.

Cold/warm complete rule reports are deeply equal for findings, declarations, decisions and coverage. Cold process/report: **4468.3 / 4296.8 ms**; warm **2180.3 / 2004.6 ms**; real CLI `--suggest`: **5948.8 ms**. These are one local process pair, not latency guarantees.

Reproduce after build: `PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/layer8 node bench/metalui/measure-layer8.mjs`. The script clears only layer 8 compiler/module receipts, keeps its immutable input, verifies all eight baseline sites and own-source exclusion, compares cold/warm output, and writes `layer8.imitation.json`, `layer8.suggestions.json` and `layer8.run.json`.
