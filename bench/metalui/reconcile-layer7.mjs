import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const report = JSON.parse(readFileSync('bench/metalui/layer7.ownership.json','utf8'));
const measurements = JSON.parse(readFileSync('bench/metalui/layer7.run.json','utf8'));
const verdicts = {
 'pages/components/CueRecognition.tsx': ['contract review','Person glyph adds badge type to Avatar. Use its size API or explicitly approve this compact glyph typography.'],
 'kds.css:665': ['debt','Landing CTA overrides Button weight; move this cap typography into a component variant.'],
 'kds.css:666': ['debt','Landing CTA overrides Button tracking; move this cap typography into a component variant.'],
 'kds.css:667': ['debt','Landing CTA adds engraved ink shadow; it belongs to a cap variant or an explicit product exception.'],
 'pages/components/Button.tsx:209': ['accepted specimen intent','Flat-fill x-ray intentionally removes cap paint and elevation to contrast the cap recipe. Proposed reasoned exception; still emitted.'],
 'pages/components/Button.tsx:262': ['accepted specimen intent','Enlarged anatomy fixes cap width and zeroes horizontal padding to expose its construction. Proposed specimen exception.'],
 'pages/components/Button.tsx:502': ['accepted negative example','The wraps specimen deliberately demonstrates the rejected multiline button; padding is part of that broken example.'],
 'pages/components/Button.tsx:531': ['accepted specimen intent','State gallery forces rest ink for a hover specimen without user interaction. Proposed specimen exception.'],
 'pages/components/Button.tsx:532': ['accepted specimen intent','State gallery forces focus-ring ink for a static focus specimen. Proposed specimen exception.'],
 'ui/xray/WordmarkXray.tsx': ['debt','X-ray launcher replaces link-cap radius with 999px. Use a supported cap geometry or a dedicated launcher contract.'],
 'blocks/availability-picker/availability-picker.tsx': ['debt','Booking action forces primary pressed fill/shadow through caller recipe. Component state/variant should own this held phase.'],
 'blocks/share-panel/share-panel.tsx:310': ['contract review','Valid visually hidden label; sr-only also emits four zero padding longhands. It is a mixed utility, not a layout-only pass. Label needs a hidden API or an explicit padding contract.'],
 'blocks/share-panel/share-panel.tsx:373': ['debt','Read-only share URL mutes Field.Input ink. Use a field tone/state decision rather than caller paint.'],
 'pages/library.css:16': ['reviewed heuristic','Section-entry SVG ink can reach Icon roots beneath this ancestor. Deliberate muted navigation glyphs; approve inherited glyph ink or style the host.'],
 'pages/library.css:29': ['reviewed heuristic','Place-card SVG ink can reach Icon roots beneath this ancestor. Deliberate muted navigation glyphs; approve inherited glyph ink or style the host.'],
 'pages/foundations/Sizing.tsx': ['contract review','Sizing specimen gives Icon muted host ink. Glyph foreground contract needs explicit adoption; default ownership still catches it.'],
 'pages/foundations/Spacing.tsx': ['contract review','Spacing specimens give Icon muted host ink. Glyph foreground contract needs explicit adoption; default ownership still catches it.'],
 'blocks/task-inbox/task-inbox.tsx': ['debt','Pressed completion action repaints IconButton success ink. Put this semantic state in its component variant.'],
 'ui/edit/edit.css:68': ['reviewed heuristic','Held tag key adds a presence-guide shadow to Kbd. Intentional editor interaction cue; approve a reasoned exception or expose held state on Kbd.'],
 'pages/components/Link.tsx': ['accepted specimen intent','Link state gallery forces its focus ring for comparison. Proposed static-state specimen exception.'],
 'pages/components/DateCue.tsx': ['debt','MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract.'],
 'pages/components/NumericCue.tsx': ['debt','MarkLine owns sentence typography/baseline; caller substitutes type-content and ink. Choose presentation or extend the line contract.'],
 'ui/cues/ProvenanceDocument.tsx': ['debt','Reading presentation already selects MarkLine policy; caller additionally overrides its ink. Remove redundant ink or make it an explicit line decision.'],
 'pages/components/Spinner.tsx:98': ['debt','Upload row replaces panel material with the field-well recipe. Use Row variant or compose a documented well host.'],
 'pages/components/Spinner.tsx:99': ['debt','Upload row manually recolors Row.Text by pending state. Source component should own pending tone.'],
 'ui/edit/edit.css:148': ['reviewed heuristic','Off layer dims Row.Text through descendant selector. Intentional editor state, but needs Row tone/state or a reasoned exception.'],
 'pages/components/ScrollArea.tsx': ['debt','ScrollArea specimens add well paint/shadow and card radius. Height/width pass; material needs a surrounding Well or an explicit host contract.'],
 'blocks/ai-composer/ai-composer.tsx': ['debt','Conversation pads ScrollArea root. Pad its content child or explicitly approve root padding.'],
 'pages/library.css:37': ['reviewed heuristic','Place-note direct spans include Skeleton.Text roots. Inherited muted copy ink is intentional; approve skeleton foreground contract or keep ink on the host.'],
 'ui/LayerSorter.tsx': ['accepted specimen intent','Tiny illustrated blocks deliberately replace Surface card radius with 7px. Proposed diagram-art exception; production material radius remains owned.'],
};
const escape = value => String(value).replaceAll('|','\\|').replaceAll('\n',' ');
const rows = [];
const reconciled = report.findings.map(finding => ({ ...finding, sites: finding.sites.map(site => {
 const file = site.file.slice(report.root.length+1).replace(/^apps\/docs\/src\//,'');
 const verdict = verdicts[`${file}:${site.line}`] ?? verdicts[file];
 assert.ok(verdict,`Missing verdict: ${file}:${site.line} ${finding.declaration.prop}`);
 rows.push(`| ${escape(finding.rule)} | ${escape(finding.declaration.prop)} (${finding.family}) | ${finding.severity} | ${escape(file)}:${site.line} · ${escape(site.text)} | ${escape(verdict[0])}: ${escape(verdict[1])} |`);
 return {...site, verdict:verdict[0], reason:verdict[1]};
 }) }));
assert.equal(rows.length,report.findings.reduce((n,f)=>n+f.sites.length,0));
writeFileSync('bench/metalui/layer7.reconciliation.json',JSON.stringify({...report,findings:reconciled},null,2)+'\n');
const coverageRows = Object.entries(report.coverage.byFamily).map(([family,c])=>`| ${family} | ${c.total} | ${c.allowed} | ${c.findings} |`).join('\n');
const section = `
## Layer 7: ownership

Built ownership only. Pinned MetalUI commit **${report.commit}**, source snapshot extracted into this layer's cache. The live repo was read only; another run changed/committed Dial while the first measurement was running, so this retained run uses an immutable Git archive. Consumer TS paths resolve package identity to that snapshot's actual source; installed dependencies remain read-only links. Preset token/theme inputs are byte-checked against the archive. Snapshot declaration/component source SHA-256: \`${report.sourceSha256}\`. No packages installed, commits made, or text-view functions changed.

Config: [ownership.config.ts](bench/metalui/ownership.config.ts), retaining the previous decision preset and adding \`components.from: package:@unlocalhosted/metalui\`. [COMPOSITION.md](../metalui/docs/COMPOSITION.md) identifies Surface, Well and GlassFace as Parts; their own source and agent docs determine the actual host boundary. Surface/Well allow content padding, typography and foreground color while retaining material, radius and elevation. Surface also allows host focus outlines: its documented API has no focus of its own. GlassFace retains bezel padding; GlassFace.Screen allows content padding and screen background/background-color/background-image, explicitly documented as caller fill under its glare. SlidingIndicator's source explicitly delegates material and shape through className, so its contract allows paint, radius and elevation. These are named contracts in the benchmark, with no MetalUI mapping in src/.

**${report.findings.length} grouped ownership findings / ${rows.length} property-site rows**, comprising **${report.coverage.findings} direct failing declaration contexts** and **${report.coverage.heuristicFindings} heuristic contexts**. Every row has a verdict below; [reconciliation JSON](bench/metalui/layer7.reconciliation.json) retains finding keys, compiled values, conditions, component source and real variant metadata. Accepted specimen intent is review, not suppression: Layer 7 creates no ledger exceptions and emits those findings.

The Button flat-fill x-ray at Button.tsx:209 emits **background-color from bg-s! and box-shadow from shadow-none!**. Both name Button's real cap (standard, primary, destructive, link, graphite, strip, strip-danger), size (default, compact), state (idle, waiting, done, error), and button.tsx source. DESIGN's old one-finding page estimate is superseded by per-property ownership: two properties at that specimen, plus additional intentional anatomy, negative-example and static-state overrides elsewhere on the page. Layout-only properties there remain allowed.

### Caller declarations by family

Counts are compiled property contexts, including padding longhand expansion and direct CSS class matches; compiler-defined recipes are included because ownership governs their properties too. Allowed + findings = total for every family. **${['margin','size','layout','position'].reduce((n,f)=>n+report.coverage.byFamily[f].total,0)} pure layout contexts** (margin, size, flex/grid/alignment and positioning) yield **zero ownership findings**. The remaining unowned properties include display/visibility, transforms and infrastructure; they also yield zero. Class spelling never determines that pass.

| Family | Total | Allowed | Findings |
| --- | ---: | ---: | ---: |
${coverageRows}

Caller contexts total **${report.coverage.callerDeclarations}**, with **${report.coverage.callerDeclarations-report.coverage.findings} allowed / ${report.coverage.findings} failing**. Descendant warnings are separate from that denominator. \`sr-only\` is an instructive mixed utility: its positioning/size/visibility declarations pass, but its four emitted zero-padding longhands hit Label's default padding contract. It is recorded as a valid accessibility pattern needing a contract decision, never mislabeled a layout-only false positive.

### Every ownership finding, with verdict

Paths below are relative to apps/docs/src. Each row is one property/site pair; shared finding keys group equal component/property/value evidence. Warnings use observed JSX ancestry and component root tags/classes; they do not prove runtime cascade or state.

| Rule | Property (owned family) | Severity | Site | Verdict |
| --- | --- | --- | --- | --- |
${rows.join('\n')}

### Timing and verification

| Measurement | Cold | Warm |
| --- | ---: | ---: |
| Full CLI process, including JSON | ${measurements.cold.wallMs.toFixed(1)} ms | ${measurements.warm.wallMs.toFixed(1)} ms |
| Report total | ${measurements.cold.timing.totalMs.toFixed(1)} ms | ${measurements.warm.timing.totalMs.toFixed(1)} ms |
| Ownership discovery + judging | ${measurements.cold.timing.phases.ownership.toFixed(1)} ms | ${measurements.warm.timing.phases.ownership.toFixed(1)} ms |

Warm compiler **${measurements.warm.timing.cacheHits} hits / ${measurements.warm.timing.cacheMisses} misses**; module graph **${measurements.warm.moduleGraph.cacheHits} hits / ${measurements.warm.moduleGraph.cacheMisses} misses**. Cold/warm declarations, decisions, coverage and all findings are deeply equal. This is one local process pair, not a latency guarantee; warm full CLI is above two seconds. Full phase receipt: [layer7.run.json](bench/metalui/layer7.run.json). Reproduce: \`npm run build\`, \`node bench/metalui/measure-layer7.mjs\`, \`node bench/metalui/reconcile-layer7.mjs\`; the cache is exactly \`PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/layer7\`.

Final validation: **75 CLI integration/e2e tests green**, typecheck and whitespace check green. Core covers discovery precedence, aliases/barrels/namespaces/default exports, forwarding wrappers, compound parts, both render-prop directions, dynamic inline properties, compiled/static/arbitrary classes, per-property/family allow/deny, source-glob boundary, root-selector warnings, cva/tv and prop unions (including adjacent declaration files for published JS). Known static limits: opaque whole style objects/spreads and unlowered template holes have no invented properties; no runtime identity or cascade analysis; selector functions/siblings/IDs and ancestry across independently rendered files remain unknown. \`PRESSED[cap]\` inside Button.tsx:533's template is an existing opaque class-reader boundary, while the literal pressed recipe in availability-picker is lowered and caught. Details: [Layer 7 notes](docs/layers/7-ownership.md).
`;
writeFileSync('bench/metalui/layer7.reconciliation.md',section.trimStart());
const benchmark = readFileSync('BENCHMARK.md','utf8');
if(!benchmark.includes('\n## Layer 7: ownership\n')) writeFileSync('BENCHMARK.md',benchmark+section);
console.log(JSON.stringify({groups:report.findings.length,rows:rows.length,layoutContexts:['margin','size','layout','position'].reduce((n,f)=>n+report.coverage.byFamily[f].total,0)}));
