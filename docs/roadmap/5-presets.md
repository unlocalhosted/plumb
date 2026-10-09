# Roadmap 5: presets

Implemented dependency presets, the shadcn preset, and `plumb presets`. Package components are judged using their resolved sources, contracts, and static variants. Preset tokens are published by default, so consumers do not receive unused-token findings for them.

## API and discovery

The package exports `definePreset`, `Preset`, `PresetSelection`, and `PresetSummary`.

```js
import { definePreset } from '@unlocalhosted/plumb';

export default definePreset({
  name: '@example/ui',
  decisions: [
    { family: 'color', name: '--color-ink', value: '#223344',
      source: { file: 'src/theme.css', line: 2 } },
  ],
  components: {
    from: 'package:@example/ui',
    contracts: { Surface: { allow: ['padding'] } },
  },
  imitation: { Textarea: { elements: ['textarea'], fingerprint: ['ui-field'] } },
  habits: ['hover-gate'],
  markers: ['ui-button'],
  exported: true,
});
```

`decisions` accepts token records, a synchronous or asynchronous function returning records, or the existing family-source form. Family sources can return records from a function or read package-relative CSS paths and `dtcg:` paths. Consumer-theme selectors are not preset sources. Family policies such as `identity`, `callers`, and `origins` are inherited when using the family-source form. Relative token locations and component directories resolve from the exporting package root. Explicit relative preset modules resolve from the project root; their token locations resolve from the module directory. Direct inline presets resolve from the project root.

For each installed direct dependency in `dependencies`, `devDependencies`, and `peerDependencies`, Plumb reads its manifest without importing its application entry point. Discovery supports:

- A `plumb` manifest field naming a module.
- A `plumb` condition in the export map, including nested conditional exports.
- A dedicated `./plumb` export, including conditional targets.

The manifest field takes priority, followed by the export condition, then `./plumb`. Preset modules use a default export. Missing uninstalled dependencies are skipped. A declared preset that cannot load fails with usage exit 2 and names its module. A package's own preset also loads during library analysis. Symlinked packages and export maps that hide `package.json` are supported. No package installation occurs.

```js
// Add presets while retaining dependency autoload.
export default { presets: ['./team-preset.mjs', '@another/ui/plumb'] };

// Disable a dependency before importing its preset.
export default { presets: { '@example/ui': false } };

// Disable within an additions array.
export default { presets: [{ '@example/ui': false }, './team-preset.mjs'] };
```

An empty presets array retains autoload. Object entries can also enable a package with `true`, select a module string, or provide an inline preset. Array inline presets require a name. A disabled name or package takes priority over additions.

## Merge and conflicts

Order: built-in shadcn, dependencies sorted by package name, the package's own preset, explicit array entries in array order (object entries in insertion order), project config. A later preset with the same name replaces the earlier preset.

Token records merge by `(family, name)`. Later presets win that conflict; authored project theme tokens and explicit project token sources win over presets. Dependency stylesheet metadata and Tailwind defaults do not replace published preset records. Family policy fields merge separately, with project fields last. Project token sources add or replace records without deleting unrelated inherited tokens.

Component discovery combines preset sources with project sources, retaining the normal local discovery fallback when no project source is configured. Each preset's contracts apply only to resolved components within that package or its configured directories. Same-name components from different packages retain different identities. Ownership applies each matching preset contract in order, then the project's contracts; the project can allow a property denied by a preset. Base component contracts precede compound-part contracts; deny wins over allow within the same contract. Existing default ownership remains paint, type, radius, elevation, and padding, allowing callers to arrange components.

Imitation fingerprints retain their package scopes, including when multiple packages export the same component name. A project fingerprint with the same name replaces the inherited fingerprints for that name. Existing source exclusions and import/wrapper resolution remain in use. Habit entries merge by habit ID; project entries replace matching IDs. An explicit project `habits: []` disables all inherited habits. Marker arrays form a deduplicated union.

Token publication is per record, not a family-wide exemption: unrelated unused project tokens remain reportable. A library can opt out with preset `exported: false`, select published names with an array, or mark individual records. Dependency consumers always treat inherited records as published. Project family publication settings and export globs still work.

## shadcn

When `components.json` exists, Plumb loads `shadcn` without config. It resolves `aliases.ui` (or `aliases.components`) through the project's tsconfig, discovers the UI component exports, and gives each the default ownership contract. The existing AST reader obtains variant names from the component's actual cva/tv recipes and prop unions. `presets: { shadcn: false }` disables this discovery; explicit project component sources remain usable.

`fixtures/shadcn-preset` uses `@/design`, an aliased cva import, and a renamed Button import. `bg-red-500` produces Button ownership with `variant = default | destructive | ghost` and `size = default | sm`; `mt-4` produces no ownership finding.

## Inspection and shared-file boundaries

`plumb presets` exits 0 and lists each loaded preset's token/publication counts, component sources, contracts, fingerprints, habit IDs, and markers. `--json` returns structured contributions. The normal report has an optional `presets` array; token records have optional `exported` metadata. The report schema adds those fields.

Shared config, CLI, index, and report changes are limited to validation, exports, loading, the inspection command, and additive report fields. Rule message strings, `formatText`, `formatFinding`, `brief`, and `formatAgent` are unchanged. No other roadmap surface was built.

## MetalUI conversion

`bench/metalui/preset/index.mjs` is a directly loadable `definePreset` module. Its portable snapshot converts the current `bench/metalui/*.config.ts` mapping: 1,095 tokens, all published; five contract refinements; two fingerprints; nine habits; ten markers; and the existing family policies. Source evidence is copied alongside the preset, with package-relative locations and no absolute dependency on the original checkout.

The snapshot reflects MetalUI commit `e0a0b31349a371e48ad38f0cc8099be5fc1b2be5`, package 0.4.1. It is a snapshot, not a live token generator. Regenerate after changing the existing benchmark mapping:

```sh
npm run build
node bench/metalui/build-preset.mjs
```

Later, copy `bench/metalui/preset/` to MetalUI's `packages/metalui/plumb/`, include `plumb` in published package files, and export `./plumb` as `./plumb/index.mjs` (or set the `plumb` manifest field). That move and publication have not been performed.

`fixtures/metalui-package` contains actual copied Button and Surface sources plus the imported WaitingState source; it is an analysis fixture, not a runnable React package. The fixture consumer imports those components and receives the converted preset through a file link. Its Button override reports the real cap and size axes; Surface padding is allowed; all 1,095 tokens are published and there are zero dead-token findings.

The separate benchmark copies the complete current MetalUI package, adds the preset only to the copy, and judges the consumer through its existing published JS export. That proves package resolution and zero dead-token noise in the published lane. Static variant axes are absent in that compiled bundle's ownership metadata; the source fixture proves the cap and size axes. No component-reader changes were made for that existing compiled-metadata limitation.

```sh
PLUMB_CACHE_DIR=$PWD/bench/metalui/.cache/5-presets node bench/metalui/presets.mjs
```

Results are in `bench/metalui/presets.run.json`. The benchmark checks Button ownership, Surface padding allowance, cold/warm ownership equivalence, 1,095 published tokens, and zero dead-token findings. It verifies that MetalUI's Git status is unchanged and removes its temporary copies. All benchmark caches stay under the specified item directory.

## Verification

`e2e/presets.test.mjs` runs the real compiled CLI over copied fixtures with local dependency links. It covers dependency conditions, manifest fields, dedicated exports, all three dependency sections, zero config, contributions, disabling, explicit additions, same-name package isolation, project overrides, shadcn aliases and disabling, cold/warm equivalence, library publication, inline callbacks, malformed modules, unused local tokens, and the MetalUI fixture. No unit tests were added.

Final checks: `npm test` passes 148 integration/e2e tests; `npm run typecheck` and `git diff --check` pass. No packages installed, no commits made, and no MetalUI files edited.
