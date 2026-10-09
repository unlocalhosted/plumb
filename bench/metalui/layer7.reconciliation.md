## Layer 7: ownership

Built ownership only. Pinned MetalUI commit **faa2036e4634e4f6c8d49feaa2dac87a77559501**, source snapshot extracted into this layer's cache. The live repo was read only; another run changed/committed Dial while the first measurement was running, so this retained run uses an immutable Git archive. Consumer TS paths resolve package identity to that snapshot's actual source; installed dependencies remain read-only links. Preset token/theme inputs are byte-checked against the archive. Snapshot declaration/component source SHA-256: `a69d30120e1f7e84af5e73c3ac54e82d98750d53a7e0cdfeffcd2ddc4c896ef6`. No packages installed, commits made, or text-view functions changed.

Config: [ownership.config.ts](bench/metalui/ownership.config.ts), retaining the previous decision preset and adding `components.from: package:@unlocalhosted/metalui`. [COMPOSITION.md](../metalui/docs/COMPOSITION.md) identifies Surface, Well and GlassFace as Parts; their own source and agent docs determine the actual host boundary. Surface/Well allow content padding, typography and foreground color while retaining material, radius and elevation. Surface also allows host focus outlines: its documented API has no focus of its own. GlassFace retains bezel padding; GlassFace.Screen allows content padding and screen background/background-color/background-image, explicitly documented as caller fill under its glare. SlidingIndicator's source explicitly delegates material and shape through className, so its contract allows paint, radius and elevation. These are named contracts in the benchmark, with no MetalUI mapping in src/.

**39 grouped ownership findings / 50 property-site rows**, comprising **45 direct failing declaration contexts** and **5 heuristic contexts**. Every row has a verdict below; [reconciliation JSON](bench/metalui/layer7.reconciliation.json) retains finding keys, compiled values, conditions, component source and real variant metadata. Accepted specimen intent is review, not suppression: Layer 7 creates no ledger exceptions and emits those findings.

The Button flat-fill x-ray at Button.tsx:209 emits **background-color from bg-s! and box-shadow from shadow-none!**. Both name Button's real cap (standard, primary, destructive, link, graphite, strip, strip-danger), size (default, compact), state (idle, waiting, done, error), and button.tsx source. DESIGN's old one-finding page estimate is superseded by per-property ownership: two properties at that specimen, plus additional intentional anatomy, negative-example and static-state overrides elsewhere on the page. Layout-only properties there remain allowed.

### Caller declarations by family

Counts are compiled property contexts, including padding longhand expansion and direct CSS class matches; compiler-defined recipes are included because ownership governs their properties too. Allowed + findings = total for every family. **215 pure layout contexts** (margin, size, flex/grid/alignment and positioning) yield **zero ownership findings**. The remaining unowned properties include display/visibility, transforms and infrastructure; they also yield zero. Class spelling never determines that pass.

| Family | Total | Allowed | Findings |
| --- | ---: | ---: | ---: |
| size | 77 | 77 | 0 |
| layout | 72 | 72 | 0 |
| padding | 65 | 56 | 9 |
| other | 139 | 139 | 0 |
| paint | 27 | 8 | 19 |
| elevation | 8 | 3 | 5 |
| position | 63 | 63 | 0 |
| margin | 3 | 3 | 0 |
| custom-property | 18 | 18 | 0 |
| radius | 7 | 3 | 4 |
| type | 14 | 6 | 8 |

Caller contexts total **493**, with **448 allowed / 45 failing**. Descendant warnings are separate from that denominator. `sr-only` is an instructive mixed utility: its positioning/size/visibility declarations pass, but its four emitted zero-padding longhands hit Label's default padding contract. It is recorded as a valid accessibility pattern needing a contract decision, never mislabeled a layout-only false positive.

### Every ownership finding, with verdict

Paths below are relative to apps/docs/src. Each row is one property/site pair; shared finding keys group equal component/property/value evidence. Warnings use observed JSX ancestry and component root tags/classes; they do not prove runtime cascade or state.

| Rule | Property (owned family) | Severity | Site | Verdict |
| --- | --- | --- | --- | --- |
| ownership/Avatar | font (type) | error | pages/components/CueRecognition.tsx:37 · mark-person | contract review: Person glyph adds badge type to Avatar. Use its size API or explicitly approve this compact glyph typography. |
| ownership/Avatar | font (type) | error | pages/components/CueRecognition.tsx:80 · mark-person | contract review: Person glyph adds badge type to Avatar. Use its size API or explicitly approve this compact glyph typography. |
| ownership/Button | letter-spacing (type) | error | kds.css:666 · letter-spacing: -.005em | debt: Landing CTA overrides Button tracking; move this cap typography into a component variant. |
| ownership/Button | padding-inline-end (padding) | error | pages/components/Button.tsx:262 · px-0! | accepted specimen intent: Enlarged anatomy fixes cap width and zeroes horizontal padding to expose its construction. Proposed specimen exception. |
| ownership/Button | text-shadow (paint) | error | kds.css:667 · text-shadow: 0 -1px 0 rgba(90, 10, 0, .35) | debt: Landing CTA adds engraved ink shadow; it belongs to a cap variant or an explicit product exception. |
| ownership/Button | background-color (paint) | error | pages/components/Button.tsx:209 · bg-s! | accepted specimen intent: Flat-fill x-ray intentionally removes cap paint and elevation to contrast the cap recipe. Proposed reasoned exception; still emitted. |
| ownership/Button | padding-inline-start (padding) | error | pages/components/Button.tsx:262 · px-0! | accepted specimen intent: Enlarged anatomy fixes cap width and zeroes horizontal padding to expose its construction. Proposed specimen exception. |
| ownership/Button | padding-block-start (padding) | error | pages/components/Button.tsx:502 · py-6 | accepted negative example: The wraps specimen deliberately demonstrates the rejected multiline button; padding is part of that broken example. |
| ownership/Button | outline-color (paint) | error | pages/components/Button.tsx:532 · outline-green-deep | accepted specimen intent: State gallery forces focus-ring ink for a static focus specimen. Proposed specimen exception. |
| ownership/Button | border-radius (radius) | error | ui/xray/WordmarkXray.tsx:56 · borderRadius: '999px' | debt: X-ray launcher replaces link-cap radius with 999px. Use a supported cap geometry or a dedicated launcher contract. |
| ownership/Button | font-weight (type) | error | kds.css:665 · font-weight: 600 | debt: Landing CTA overrides Button weight; move this cap typography into a component variant. |
| ownership/Button | box-shadow (elevation) | error | pages/components/Button.tsx:209 · shadow-none! | accepted specimen intent: Flat-fill x-ray intentionally removes cap paint and elevation to contrast the cap recipe. Proposed reasoned exception; still emitted. |
| ownership/Button | color (paint) | error | pages/components/Button.tsx:531 · text-ink! | accepted specimen intent: State gallery forces rest ink for a hover specimen without user interaction. Proposed specimen exception. |
| ownership/Button | box-shadow (elevation) | error | blocks/availability-picker/availability-picker.tsx:392 · data-held:recipe-button-primary-pressed | debt: Booking action forces primary pressed fill/shadow through caller recipe. Component state/variant should own this held phase. |
| ownership/Button | padding-block-end (padding) | error | pages/components/Button.tsx:502 · py-6 | accepted negative example: The wraps specimen deliberately demonstrates the rejected multiline button; padding is part of that broken example. |
| ownership/Button | background (paint) | error | blocks/availability-picker/availability-picker.tsx:392 · data-held:recipe-button-primary-pressed | debt: Booking action forces primary pressed fill/shadow through caller recipe. Component state/variant should own this held phase. |
| ownership/Field.Input | color (paint) | error | blocks/share-panel/share-panel.tsx:373 · text-ink2 | debt: Read-only share URL mutes Field.Input ink. Use a field tone/state decision rather than caller paint. |
| ownership/FormField.Label | padding-bottom (padding) | error | blocks/share-panel/share-panel.tsx:310 · sr-only | contract review: Valid visually hidden label; sr-only also emits four zero padding longhands. It is a mixed utility, not a layout-only pass. Label needs a hidden API or an explicit padding contract. |
| ownership/FormField.Label | padding-left (padding) | error | blocks/share-panel/share-panel.tsx:310 · sr-only | contract review: Valid visually hidden label; sr-only also emits four zero padding longhands. It is a mixed utility, not a layout-only pass. Label needs a hidden API or an explicit padding contract. |
| ownership/FormField.Label | padding-right (padding) | error | blocks/share-panel/share-panel.tsx:310 · sr-only | contract review: Valid visually hidden label; sr-only also emits four zero padding longhands. It is a mixed utility, not a layout-only pass. Label needs a hidden API or an explicit padding contract. |
| ownership/FormField.Label | padding-top (padding) | error | blocks/share-panel/share-panel.tsx:310 · sr-only | contract review: Valid visually hidden label; sr-only also emits four zero padding longhands. It is a mixed utility, not a layout-only pass. Label needs a hidden API or an explicit padding contract. |
| ownership/Icon | color (paint) | warn | pages/library.css:16 · color: var(--ink2) | reviewed heuristic: Section-entry SVG ink can reach Icon roots beneath this ancestor. Deliberate muted navigation glyphs; approve inherited glyph ink or style the host. |
| ownership/Icon | color (paint) | warn | pages/library.css:29 · color: var(--ink2) | reviewed heuristic: Place-card SVG ink can reach Icon roots beneath this ancestor. Deliberate muted navigation glyphs; approve inherited glyph ink or style the host. |
| ownership/Icon | color (paint) | error | pages/foundations/Sizing.tsx:63 · text-ink2 | contract review: Sizing specimen gives Icon muted host ink. Glyph foreground contract needs explicit adoption; default ownership still catches it. |
| ownership/Icon | color (paint) | error | pages/foundations/Spacing.tsx:81 · text-ink2 | contract review: Spacing specimens give Icon muted host ink. Glyph foreground contract needs explicit adoption; default ownership still catches it. |
| ownership/Icon | color (paint) | error | pages/foundations/Spacing.tsx:91 · text-ink2 | contract review: Spacing specimens give Icon muted host ink. Glyph foreground contract needs explicit adoption; default ownership still catches it. |
| ownership/IconButton | color (paint) | error | blocks/task-inbox/task-inbox.tsx:609 · aria-pressed:text-success | debt: Pressed completion action repaints IconButton success ink. Put this semantic state in its component variant. |
| ownership/Kbd | box-shadow (elevation) | warn | ui/edit/edit.css:68 · box-shadow: 0 0 0 1.5px var(--mu-presence-guide-dark) | reviewed heuristic: Held tag key adds a presence-guide shadow to Kbd. Intentional editor interaction cue; approve a reasoned exception or expose held state on Kbd. |
| ownership/Link | outline (paint) | error | pages/components/Link.tsx:20 · focus-ring | accepted specimen intent: Link state gallery forces its focus ring for comparison. Proposed static-state specimen exception. |
| ownership/MarkLine | font (type) | error | pages/components/DateCue.tsx:28 · type-content | debt: MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract. |
| ownership/MarkLine | font (type) | error | pages/components/NumericCue.tsx:48 · type-content | debt: MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract. |
| ownership/MarkLine | color (paint) | error | pages/components/DateCue.tsx:28 · text-ink | debt: MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract. |
| ownership/MarkLine | color (paint) | error | pages/components/NumericCue.tsx:48 · text-ink | debt: MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract. |
| ownership/MarkLine | color (paint) | error | ui/cues/ProvenanceDocument.tsx:119 · text-ink | debt: Reading presentation already selects MarkLine policy; caller additionally overrides its ink. Remove redundant ink or make it an explicit line decision. |
| ownership/MarkLine | letter-spacing (type) | error | pages/components/DateCue.tsx:28 · type-content | debt: MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract. |
| ownership/MarkLine | letter-spacing (type) | error | pages/components/NumericCue.tsx:48 · type-content | debt: MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract. |
| ownership/Row | background (paint) | error | pages/components/Spinner.tsx:98 · recipe-well-field | debt: Upload row replaces panel material with the field-well recipe. Use Row variant or compose a documented well host. |
| ownership/Row | box-shadow (elevation) | error | pages/components/Spinner.tsx:98 · recipe-well-field | debt: Upload row replaces panel material with the field-well recipe. Use Row variant or compose a documented well host. |
| ownership/Row.Text | color (paint) | warn | ui/edit/edit.css:148 · color: var(--ink3) | reviewed heuristic: Off layer dims Row.Text through descendant selector. Intentional editor state, but needs Row tone/state or a reasoned exception. |
| ownership/Row.Text | color (paint) | error | pages/components/Spinner.tsx:99 · text-ink | debt: Upload row manually recolors Row.Text by pending state. Source component should own pending tone. |
| ownership/Row.Text | color (paint) | error | pages/components/Spinner.tsx:99 · text-ink2 | debt: Upload row manually recolors Row.Text by pending state. Source component should own pending tone. |
| ownership/ScrollArea | background (paint) | error | pages/components/ScrollArea.tsx:23 · recipe-well-field | debt: ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract. |
| ownership/ScrollArea | background (paint) | error | pages/components/ScrollArea.tsx:57 · recipe-well-field | debt: ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract. |
| ownership/ScrollArea | box-shadow (elevation) | error | pages/components/ScrollArea.tsx:23 · recipe-well-field | debt: ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract. |
| ownership/ScrollArea | box-shadow (elevation) | error | pages/components/ScrollArea.tsx:57 · recipe-well-field | debt: ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract. |
| ownership/ScrollArea | padding-top (padding) | error | blocks/ai-composer/ai-composer.tsx:324 · pt-mu-space-12 | debt: Conversation pads ScrollArea root. Pad its content child or explicitly approve root padding. |
| ownership/ScrollArea | border-radius (radius) | error | pages/components/ScrollArea.tsx:23 · rounded-card | debt: ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract. |
| ownership/ScrollArea | border-radius (radius) | error | pages/components/ScrollArea.tsx:57 · rounded-card | debt: ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract. |
| ownership/Skeleton.Text | color (paint) | warn | pages/library.css:37 · color: var(--ink2) | reviewed heuristic: Place-note direct spans include Skeleton.Text roots. Inherited muted copy ink is intentional; approve skeleton foreground contract or keep ink on the host. |
| ownership/Surface | border-radius (radius) | error | ui/LayerSorter.tsx:45 · borderRadius: 7 | accepted specimen intent: Tiny illustrated blocks deliberately replace Surface card radius with 7px. Proposed diagram-art exception; production material radius remains owned. |

### Timing and verification

| Measurement | Cold | Warm |
| --- | ---: | ---: |
| Full CLI process, including JSON | 4787.0 ms | 2187.1 ms |
| Report total | 4542.8 ms | 2012.1 ms |
| Ownership discovery + judging | 871.7 ms | 681.8 ms |

Warm compiler **1302 hits / 0 misses**; module graph **1303 hits / 0 misses**. Cold/warm declarations, decisions, coverage and all findings are deeply equal. This is one local process pair, not a latency guarantee; warm full CLI is above two seconds. Full phase receipt: [layer7.run.json](bench/metalui/layer7.run.json). Reproduce: `npm run build`, `node bench/metalui/measure-layer7.mjs`, `node bench/metalui/reconcile-layer7.mjs`; the cache is exactly `PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/layer7`.

Final validation: **75 CLI integration/e2e tests green**, typecheck and whitespace check green. Core covers discovery precedence, aliases/barrels/namespaces/default exports, forwarding wrappers, compound parts, both render-prop directions, dynamic inline properties, compiled/static/arbitrary classes, per-property/family allow/deny, source-glob boundary, root-selector warnings, cva/tv and prop unions (including adjacent declaration files for published JS). Known static limits: opaque whole style objects/spreads and unlowered template holes have no invented properties; no runtime identity or cascade analysis; selector functions/siblings/IDs and ancestry across independently rendered files remain unknown. `PRESSED[cap]` inside Button.tsx:533's template is an existing opaque class-reader boundary, while the literal pressed recipe in availability-picker is lowered and caught. Details: [Layer 7 notes](docs/layers/7-ownership.md).
