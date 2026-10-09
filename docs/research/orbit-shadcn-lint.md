# Research: Orbit and shadcn-ui/lint

Research date: **2026-10-09**. Actual article/page fetches, public Git checkouts, documentation and implementation inspection; npm metadata and the published tarball were also fetched. Repository links pin inspected commits. Article claims, implemented behavior, source-derived inferences and unverified operational claims are distinguished. No application, CI run, benchmark or paid agent eval was executed.

Requested primary sources: [Polar article](https://polar.sh/blog/orbit-llm-safe-design-system) and [shadcn-ui/lint](https://github.com/shadcn-ui/lint). Relevant linked design-system/framework/host-linter docs were followed; unrelated site navigation and social links were excluded.

## A. Orbit: core idea, mechanisms, limits

### Article position

Polar's June 16, 2026 article describes an early design-system migration, rather than a completed guarantee. Its central distinction is between selecting arbitrary CSS values and selecting decisions already made by the design team. Intent-named tokens, typed component props, restricted raw HTML, and CI rules should make off-system choices fail mechanically. StyleX is their current implementation vehicle; Shopify Restyle inspired the API. Documentation alone is considered insufficient. Authors may generate any code, but only code satisfying the checks should merge. Missing token coverage should prompt extending the system; exceptions weaken the guarantee. The article acknowledges small token sets, weekly additions, substantial legacy Tailwind, gradual migration, and auditing `oxlint-disable` usage. Its short formulation is “Docs are a suggestion. CI is a contract.” These are **article claims**; the repository reveals narrower enforcement. [Polar article](https://polar.sh/blog/orbit-llm-safe-design-system)

### Independently verified implementation

Checked the public `polarsource/polar` README, source tree, Orbit package, documentation app, agent instructions, custom lint rules, configs, and CI at commit [`4a4544545f058c901d9602462513ad982ccbe5e6`](https://github.com/polarsource/polar/tree/4a4544545f058c901d9602462513ad982ccbe5e6). The main README describes Polar, not Orbit; no Orbit-package README was present. Orbit is an internal, private workspace package named `@polar-sh/orbit`, version `0.1.0`, Apache-2.0. [Main README](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/README.md), [Orbit manifest](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/package.json)

1. **Decisions occupy two explicit token tiers.** `value.stylex.ts` holds literal palette, font, spacing, radius, shadow, breakpoint and motion primitives; `semantics.stylex.ts` maps intent names onto them. A public theme barrel re-exports both. Primitive palette comments instruct components to consume semantic decisions instead. Color decisions distinguish background, text, and border namespaces. Typography roles centrally bind family, size, line height, weight, and sometimes breakpoint behavior. Thus a semantic color or text-role update changes its consumers without searching every numeric value. [Value tokens](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/tokens/value.stylex.ts), [Semantic tokens](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/tokens/semantics.stylex.ts), [Theme barrel](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/tokens/tokens.stylex.ts)

2. **Types derive from token keys, rather than duplicating approved strings.** `StyleXTokenKeys<typeof ...>` excludes StyleX metadata and produces the allowed token unions. Positive spacing is `none`, `xs`, `s`, `m`, `l`, `xl`, `2xl` through `5xl`; negative spacing is generated as a template-literal type. Padding/gap accept only positive tokens; margin also accepts negative tokens and `auto`. Radius is `none/s/m/l/xl/full`; shadow is `none/s/m/l/xl`. Durations and easings form closed sets. This is TypeScript inference, **not a verified token-to-component code generator**. [Value-token types](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/tokens/value.stylex.ts)

3. **Props are the styling API.** `BoxStyleProps` composes spacing, color, border, shadow, layout, flex, grid, positioning, motion and visual interfaces. `backgroundColor`, `color` and `borderColor` accept separate semantic token types, preventing a border token from being passed as a text token. Responsive values use `base/sm/md/lg/xl`; pseudo-state keys are `hover/focus/active/focusVisible/focusWithin`. Transition properties are curated presets. Important qualification: width/height, grid strings, transforms, offsets, z-index and several other props accept arbitrary strings or numbers; border widths accept arbitrary numbers. Closed design vocabulary therefore applies to selected concerns, not all CSS. [Prop types](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/utils/types.ts)

4. **Polymorphism preserves HTML through a constrained primitive.** `Box`'s `as` union contains `div/span/section/article/aside/main/nav/header/footer/form/fieldset/label/ul/ol/li`; chosen-element DOM props are typed and forwarded. It defaults to flex except `span`, `label`, and `li`, which retain native display. However, `Box` explicitly accepts `className`, inherits DOM `style`, and merges caller style after resolved styles. Its type surface alone does not eliminate escape hatches. [Box implementation](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/components/Box.tsx)

5. **Compiler plus resolver implement the API.** StyleX Babel compilation uses `runtimeInjection: false`; predeclared token style maps become generated CSS. `resolveBoxStyles` selects these maps for token props. Arbitrary values become inline styles; responsive and pseudo-state values generate scoped CSS strings at render time, inserted by `Box` in a `<style>` element. A `Record<keyof BoxStyleProps, true>` requires the style-prop separation map to track interface additions/removals. Consequently the broad docs claim that all Box styles compile at build time is an overstatement of the current implementation. [Babel config](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/babel.config.js), [Resolver](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/utils/resolvers.ts), [Style maps](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/utils/box-styles.ts)

6. **Themed colors carry both schemes.** Semantic colors use `light-dark()` with primitive references. Global CSS supplies `color-scheme` and `.dark`-controlled LightningCSS compatibility variables, including explicit embed-theme handling. Authors selecting these tokens need not manually duplicate dark classes. This does not prove arbitrary foreground/background combinations have adequate contrast. StyleX's linked recipe also notes color-only scope and older-browser limitations. [Semantic colors](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/tokens/semantics.stylex.ts), [Global theme wiring](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/src/styles/globals.css), [StyleX light/dark recipe](https://stylexjs.com/docs/learn/recipes/light-dark-themes/)

7. **Components capture coordinated choices.** `Text` has closed role, color, alignment, wrapping and leading unions; roles select heading tags and wrapping defaults. It owns truncation, numeric-formatting presets, monospace and loading display rather than asking consumers to recreate CSS. `Alert` exposes meaning (`info/warning/danger/success`) and behavior/content props, selects icon/accent internally, and exposes no `className` styling prop. `ButtonGroup` constrains action count to one or two, with primary/ghost treatment. These are concrete examples of props encoding more than individual token values. [Text primitive](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/primitives/createText.tsx), [Alert](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/components/Alert.tsx), [ButtonGroup](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/components/ButtonGroup.tsx)

8. **Violations are caught by JSX AST lint rules plus TypeScript.** `polar/no-raw-html-layout` flags the same 15 intrinsic tags supported by Box. `no-classname-box` and `no-style-box` reject explicit attributes on JSX literally named `Box`. `no-classname-text` and `no-style-text` track Orbit named-import aliases and namespace `Text`; the style rule also recognizes the deep import. These rules report errors and show replacement instructions; none supplies an autofix. [Raw HTML rule](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/oxlint-plugins/no-raw-html-layout.mjs), [Box class rule](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/oxlint-plugins/no-classname-box.mjs), [Box style rule](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/oxlint-plugins/no-style-box.mjs), [Text class rule](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/oxlint-plugins/no-classname-text.mjs), [Text style rule](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/oxlint-plugins/no-style-text.mjs)

9. **CI runs the contract, but scope matters.** The web config enables Box/Text class/style bans for all `**/*.tsx`, while raw-layout prohibition is enabled **only for onboarding routes/components**. Client CI runs lint, TypeScript checks, tests and a build when client-related paths change. Repository branch-protection settings making those checks mandatory were **UNVERIFIED**. The Orbit package and showcase use shared React/Next lint configs, without the web app's custom Orbit restrictions. [Web config](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/.oxlintrc.json), [Client CI](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/.github/workflows/test_client.yaml), [Package lint config](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/.oxlintrc.json), [Showcase lint config](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/orbit/.oxlintrc.json)

10. **Agents receive concrete authoring documentation.** `clients/CLAUDE.md` delegates to `AGENTS.md`, which specifies Box/Text imports, token tables, allowed tags, responsive/pseudo APIs, common recipes, migration policy and source paths. Missing properties should extend `BoxStyleProps` and be flagged in the PR. It permits Tailwind for third-party APIs, unsupported animations and migration glue; Box `className/style` escape hatches are described for unmodeled concerns. Additional agent skills review conventions and search existing Orbit components before allowing reinvention. This is repository agent guidance, not proof every agent follows it. No dedicated Orbit `llms.txt` or agent-MCP interface was found in the inspected tree (**UNVERIFIED outside that tree**). [Agent guide](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/AGENTS.md), [Claude pointer](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/CLAUDE.md), [Conventions skill](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/.agents/skills/conventions-check/SKILL.md), [Reuse skill](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/.agents/skills/reuse-check/SKILL.md)

11. **Docs partially derive from the real API.** The showcase contains six foundation areas and 22 component pages with live examples, code and source links. `extract-props.mjs` uses `ts-morph`/TypeScript call signatures to extract prop names, types, requiredness, JSDoc descriptions/defaults, and source locations into `src/generated/props.json`. Curated page descriptions remain hand-authored. `gen:props` is a manual package command, not included in the inspected build or CI workflow; automatic freshness enforcement is **UNVERIFIED**. This is verified **documentation codegen**, not component codegen. [Docs registry](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/orbit/src/lib/registry.ts), [Extractor](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/orbit/scripts/extract-props.mjs), [Docs accessor](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/orbit/src/lib/props-data.ts), [Showcase commands](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/orbit/package.json)

12. **Linked inspiration was checked separately.** Restyle's docs explain semantic themes, TypeScript-enforced token props, spacing scales and multi-prop variants; Restyle itself permits overrides, so its guarantees must not be attributed to Orbit. StyleX documents atomic CSS compilation and type-safe APIs, but its general API also allows raw values. Its separately published LLM reference files cover installation, style authoring and theming; **UNVERIFIED** whether Polar uses them. [Restyle overview](https://shopify.github.io/restyle/), [Theme definitions](https://shopify.github.io/restyle/fundamentals/defining-your-theme/), [Semantic colors](https://shopify.github.io/restyle/fundamentals/colors/), [Spacing](https://shopify.github.io/restyle/fundamentals/spacing/), [Variants](https://shopify.github.io/restyle/fundamentals/variants/), [StyleX overview](https://stylexjs.com/docs/learn/), [StyleX agent references](https://stylexjs.com/docs/llm-resources)

13. **Migration has an AST codemod.** `p-span-to-text.mjs` uses the TypeScript parser to replace `<p>` with `<Text>` and `<span>` with `<Text as="span">`, and add/update Orbit imports. It supports glob scoping and dry-run. Existing attributes stay in place, so this migrates element selection rather than translating arbitrary classes into semantic props; follow-up lint/type fixes are still needed. [Codemod](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/codemods/p-span-to-text.mjs)

### Weaknesses / gaps observed

- **Coverage is narrower than the aspiration:** raw containers remain legal outside onboarding; the package itself is exempt from the web-specific rules. Global ban claims must not be treated as deployed repository-wide policy. [Web config](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/.oxlintrc.json)
- **Enforcement has syntactic bypasses:** Box aliases/member expressions are not recognized; explicit-attribute checks ignore JSX spreads. Text import tracking is stronger but still does not inspect spreads/re-exports. This is source-derived reasoning, not a demonstrated exploit test. [Box style rule](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/oxlint-plugins/no-style-box.mjs), [Text style rule](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/oxlint-plugins/no-style-text.mjs)
- **Components are unevenly closed:** Button remains a shadcn wrapper using Tailwind `cva` and `twMerge`, inherited `className` and extra `wrapperClassNames`; internal loading markup still contains raw layout tags and dark classes. Text loading skeletons also contain legacy Tailwind. [Button source](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/components/Button.tsx), [Text source](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/primitives/createText.tsx)
- **Docs and checks disagree on escape hatches:** docs permit Box class/style for unmodeled concerns, while web rules reject every explicit Box class/style attribute, without inspecting the property. Generated prop docs also depend on manual regeneration. [Box docs](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/orbit/src/app/components/box/page.tsx), [Box class rule](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/oxlint-plugins/no-classname-box.mjs)
- **Article examples are not the current API:** its Text colors are `text-primary/text-secondary`; current Text uses aliases such as `default/muted`, while Box retains the semantic names. [Article example](https://polar.sh/blog/orbit-llm-safe-design-system), [Text API](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/primitives/createText.tsx)
- **Token provenance is partly duplicated:** value-token comments require manually keeping neutral ramps aligned with the web Tailwind `@theme`; no generated single-source synchronization mechanism was verified. Also, permitted token membership cannot decide whether the chosen semantic role fits a specific component, or whether combinations produce good hierarchy/contrast. [Value tokens](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/tokens/value.stylex.ts)
- **Safety claims have practical limits:** no verified rules here prove accessible interaction, correct heading outline in context, responsive composition, valid arbitrary CSS, visual quality, or behavior. `Text` chooses heading tags from visual variants unless overridden; callers must still maintain a meaningful outline. No measured comparative drift-reduction benchmark was found in the inspected sources (**UNVERIFIED**). [Text primitive](https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/primitives/createText.tsx)

## B. shadcn-ui/lint

### What it is and how it runs

`@shadcn/lint` is a configurable design-system policy plugin for Tailwind v4. It works with custom component systems; shadcn/ui is optional. It exports an ESLint-compatible `plugin` as named/default export; Oxlint loads the default through `jsPlugins`. **No standalone lint CLI, executable `bin`, recommended preset, or automatic rule activation exists.** Run `eslint` or `oxlint`, explicitly enable rules, and wire that command into CI. Sources: [README][L-readme], [exports][L-index], [plugin][L-plugin], [package manifest][L-package].

Requirements: Node ≥20.19, ESLint ≥9.30 or Oxlint ≥1.80. React JSX works under both. Vue/Svelte templates require ESLint with their framework parsers; Oxlint checks script blocks only and emits a warning. Astro `class:list` collection exists, but the published framework support claims are React/Vue/Svelte, not blanket Astro support. [React docs][L-react], [Vue docs][L-vue], [Svelte docs][L-svelte], [collector][L-collect].

### Source tree and analysis pipeline

The pnpm workspace contains `packages/lint` (published implementation) and `packages/evals` (unpublished eval, rendering, registry-corpus and benchmark tooling). Core tree:

```text
packages/lint/src/
  index.ts, plugin.ts     exports and the complete rule registry
  sites/collect.ts        class sites, static values, ownership
  sites/readers/          JSX, Vue and Svelte AST adapters
  grammar/               class splitting, groups, categories, values
  project/               imports, components, variants, wrappers, theme
  tailwind/              compiler oracle, worker and synchronous client
  rules/                 six rules, contracts, messages and suggestions
packages/lint/test/       rule, project, framework and Oxlint fixtures/checks
packages/evals/           agent runs, fidelity rendering, corpus and benchmarks
docs/                    setup, mechanisms, policy, rules, frameworks, evals
```

[Contributing guide][L-contributing], [source tree][L-tree].

**AST plus class-string grammar, not regex-only linting.** The host linter supplies an ESTree-like AST. Collectors visit class attributes, helper calls, readable spreads and framework-specific nodes. Static resolution reads complete string literals, safe template pieces, conditional/logical branches, arrays, object entries, and same-file immutable values one hop deep. Unreadable pieces remain recorded. Cross-file component parsing uses optional `oxc-parser`, falling back to `@typescript-eslint/parser`; same-file wrapper analysis can reuse the host AST. This is syntactic analysis, not TypeScript checker/type-aware program analysis. [Collector][L-collect], [project parser][L-parser], [reader adapters][L-readers].

Strings split on whitespace; variant parsing tracks bracket/parenthesis depth so colons inside arbitrary variants remain intact. Classification uses a trie built from the `cn` package's class groups and validators, then maps groups to layout, color, typography, spacing, shape, effects, motion, or unclassified. It distinguishes `text-sm`, `text-primary`, and `text-center`. Margin/width/transforms count as layout; padding/gap count as spacing. Unknown custom classes require explicit allowances for component restyling. **The `cn` grammar dependency is distinct from an application's helper also named `cn()`.** [String parser][L-classes], [classifier][L-classifier], [category mapping][L-categories].

**Import-aware component ownership.** `components.json` supplies the UI alias/directory; fallback discovery uses the nearest package and conventional `components/ui` or `src/components/ui`. Custom import prefixes/regexes extend recognition. Resolution follows TypeScript paths, package imports/exports, barrels, renamed/default exports and namespace imports. Forwarding wrappers across files inherit the underlying component's contract; a readable Base UI `render` prop can transfer ownership to its rendered component. Arbitrary components with familiar names do not become design-system components when their imports resolve elsewhere. Unresolvable imports can trigger name fallback and warnings. [Component index][L-components], [import tracker][L-collect], [wrapper resolver][L-wrappers], [module resolver][L-resolve].

**Variant guidance comes from source.** The linter discovers `cva`/`tv` axes, React string-union props, same-file type aliases/interfaces, and `keyof typeof` lookup keys. A union of prop shapes yields only values shared by all members. Vue/Svelte variant factories can be read from their scripts or adjacent barrels. Diagnostics list actual variants/sizes and source paths; this does not generate or type-check new component APIs. [Variant reader][L-variants].

### Complete rule list: six

Names below use the `shadcn/` namespace; the registry contains exactly these six. [Registry][L-plugin].

| Rule | One-line behavior |
| --- | --- |
| [`no-restyle`][L-restyle] | Rejects class overrides on recognized design-system components except categories/groups/classes allowed by their configured contracts; directs callers to variants/sizes. |
| [`no-raw-colors`][L-colors] | Rejects raw palette classes, undeclared theme-color names and literal intrinsic SVG color attributes; offers theme-token guidance. |
| [`no-arbitrary-values`][L-arbitrary] | Rejects bracketed utility values and arbitrary properties unless exempted, including values equal to existing scale steps; suggests token/scale replacements. |
| [`no-inline-styles`][L-inline] | Rejects ordinary inline CSS properties, unreadable style objects and JSX `<style>` elements; custom properties pass unless carrying detected raw colors. |
| [`no-unknown-classes`][L-unknown] | Checks whether the project's Tailwind generates a class, with exceptions for known selectors/markers/arbitrary properties and configurable external classes. |
| [`require-static-classes`][L-static] | Rejects unreadable class values on recognized components/wrappers; permits complete conditional classes and received class-prop forwarding. |

Important details:

- `no-raw-colors` accepts `white`, `black`, `transparent`, `current`, `inherit`, and explicitly declared palette-like token names. Arbitrary hex classes belong to `no-arbitrary-values`. SVG checks cover literal `fill`, `stroke`, `color`, `stopColor`, `floodColor`, `lightingColor` on intrinsic elements, not dynamic expressions or component enum props. [Rule source][L-colors-source].
- `bg-(--brand)` and arbitrary selector/state variants are not arbitrary *values*. Neither token rule proves that a referenced CSS variable exists. [Class parser][L-classes], [arbitrary-value docs][L-arbitrary].
- `no-inline-styles` permits dynamic and non-color hardcoded custom-property values, received `style` forwarding, and configured property exceptions. An allowed property bypasses its color inspection too. Its contracts match component spelling, not wrapper-resolved identity. Opaque whole-props spreads are outside reliable inspection. [Inline-style source][L-inline-source].
- `no-unknown-classes` is not independently sufficient for color errors: its source delegates undeclared/misspelled color-token cases to `no-raw-colors`. Enable both. [Unknown-class source][L-unknown-source].

### Configuration format

ESLint flat config example, written for this brief:

```js
// eslint.config.mjs
import { plugin as shadcn } from "@shadcn/lint"
import tsParser from "@typescript-eslint/parser"

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { shadcn },
    settings: {
      shadcn: {
        ui: "@/design-system",
        componentImports: ["^@example/ui(/|$)"],
        ignoreImports: ["^@example/ui/internal(/|$)"],
        mergeFunctions: ["combineClasses"],
        variantFunctions: ["makeVariants"],
        note: "See DESIGN.md for approved decisions.",
      },
    },
    rules: {
      "shadcn/no-restyle": ["error", {
        allow: ["layout"],
        contracts: [{
          pattern: "^Button$",
          allow: ["mt-*", "mb-*", "w-full"],
          message: {
            spacing: "Use size: {{sizes|none defined}}.",
            default: "Use variants in {{file}}.",
          },
        }],
      }],
      "shadcn/no-raw-colors": "error",
      "shadcn/no-arbitrary-values": "error",
      "shadcn/no-inline-styles": "error",
      "shadcn/no-unknown-classes": "error",
      "shadcn/require-static-classes": "error",
    },
  },
  {
    files: ["src/design-system/**"],
    rules: {
      "shadcn/no-restyle": "off",
      "shadcn/no-arbitrary-values": "off",
      "shadcn/require-static-classes": "off",
    },
  },
]
```

The component-directory override follows documented adoption guidance: implementations own appearance and can need structural arbitrary values; color/inline-style/unknown-class checks remain enabled. Removing that override gives a stricter policy, with additional implementation findings. This example is an illustration, not an installation performed here. [Adoption docs][L-adoption], [option schema/types][L-index].

Oxlint uses JSON and the same rule options:

```json
{
  "jsPlugins": ["@shadcn/lint"],
  "settings": { "shadcn": { "ui": "@/design-system" } },
  "rules": {
    "shadcn/no-restyle": ["error", { "allow": ["layout"] }],
    "shadcn/no-raw-colors": "error"
  },
  "overrides": [{
    "files": ["src/design-system/**"],
    "rules": { "shadcn/no-restyle": "off" }
  }]
}
```

A reusable JSON policy can hold `rules` and `overrides`: Oxlint consumes it through `extends`; ESLint imports it and spreads those fields. Oxlint shared `settings` must stay in the root config; these are not inherited through `extends`. [Policy-sharing docs][L-design].

Configuration semantics, verified against schemas/contracts:

- Every rule accepts `message`; all except `require-static-classes` accept `allow`, `deny`, `contracts`.
- Contract `pattern` is a component-name regex. **Last matching contract wins**; it inherits omitted keys from top-level policy, not earlier contracts. `no-inline-styles` uses spelling instead of resolved identity.
- Class entries accept categories, class groups or exact/glob class names. Entries without `:` match normalized base names, ignoring variants, important markers, negative prefixes and opacity. Entries containing `:` match the full string. Matching is by spelling/group, not equivalent CSS effects.
- `deny` subtracts from allowances. **`deny` without `allow` exempts everything else**; on token/existence rules it narrows what is checked, not a universal blacklist. `deny` cannot turn a declared token into a raw color or a valid class into an unknown class.
- Shared recognition settings accept strings or string arrays; rule-level recognition options accept arrays and override corresponding shared options. Helper lists extend built-ins. `ignoreImports` wins; `ui` prefixes always supplement recognition. `note` appends guidance to every rule.
- `scanAllStrings` exists only for color/arbitrary-value rules, default false. It scans string literals outside class sites too, risking findings in prose/examples.
- `no-restyle` supports per-category messages; other rules use strings. Templates interpolate component/variant/size/token/file/suggestion data, with fallback syntax such as `{{sizes|none defined}}`. Messages are limited to 500 characters.

[Policy schemas][L-schema], [contract compiler][L-contracts], [shared settings][L-settings], [message formatter][L-messages], [rule-option docs][L-rules].

### How it reads design tokens; Tailwind config and v4 support

There are **three separate readers**, with different capabilities:

1. **CSS token/value reader.** The entry comes from `components.json`'s `tailwind.css`, else CSS discovery near the nearest package. Discovery selects a Tailwind-importing stylesheet, preferring more color tokens, then proximity to root; a missing configured file warns/falls back. It follows imports and reads declarations inside `@theme`/`@theme inline`, including wildcard/single-token `initial` resets. `--color-*` supplies color names; utility-specific namespaces such as `--background-color-*`, `--text-color-*`, `--border-color-*` grant tokens only to corresponding utilities. Imported installed packages contribute utility/selector names, but their token declarations are excluded; real workspace files can contribute tokens. Values resolve through light-mode custom properties and simple variable/calculation handling. Suggestions compare supported colors in OKLab and use text/radius/spacing scales. Dark blocks are skipped for value suggestions. This reader is a lightweight CSS scanner, not full CSS computed-style analysis. [Theme reader][L-theme], [color parsing][L-color-parser], [length parsing][L-lengths].

2. **Classification scale reader, current `main`.** It reads CSS `@theme` names into the `cn` grammar, including named spacing/radius/text/animation and other scales plus reset handling. It follows relative CSS imports; this reader explicitly does not follow package imports. Project `cn` ≥0.4.0 supplies grammar, else bundled 0.4.0 is used. This capability is newer than the published 0.2.0 tarball, which bundles 0.3.2 and lacks `themeScalesFromCss`/`themedCnConfig`. [Scale reader][L-scales], [classifier][L-classifier], [published tarball][L-tarball].

3. **Tailwind compiler oracle.** `no-unknown-classes` resolves the project's installed Tailwind v4, calls `__unstable__loadDesignSystem`, loads stylesheets and `@plugin`/`@config` modules, and asks `candidatesToCss` about classes. It handles project variants, custom utilities, prefix, plugins and config through Tailwind. Async loading runs in a worker; synchronous rule calls use shared-memory signalling/caching. Missing Tailwind/theme causes warnings and weaker grammar fallback; misspelled variant prefixes can pass fallback. Remote/data stylesheet imports load as empty content. [Oracle][L-oracle], [client][L-client], [worker][L-worker], [unknown-class docs][L-unknown].

**`tailwind.config.js` awareness is qualified:** the compiler oracle loads configuration referenced from CSS `@config`; the CSS token reader does not independently translate JS config values into its declared-token whitelist. Thus class existence and token approval are separate checks. General Tailwind v3 support is **UNVERIFIED/not claimed**; compatibility recognition of some old utility names inside a v4 project does not establish v3-project support. [Oracle][L-oracle], [theme reader][L-theme], [classifier][L-classifier].

### `cn()`, `cva()`, `clsx()` handling

Built-in class helpers: `cn`, `cx`, `clsx`, `cva`, `tv`, `twMerge`, `twJoin`, `classNames`; variant helpers: `cva`, `tv`. The collector recognizes direct callee identifiers and reads their arguments; **it does not execute helpers or simulate the final merged output**. With clsx-like objects it reads keys as classes; with cva/tv configuration it reads class values in base/slots/variants and class/className in compound variants/slots, excluding default-variant labels and condition selectors. Complete branches are checked even when only one runs. [Collector][L-collect].

Renamed/custom helpers can be registered through `mergeFunctions`/`variantFunctions`; arbitrary import alias inference and member-call helper recognition are not implemented in the direct `CallExpression` path. A cva factory definition is readable, but `buttonVariants()` at a component call site is opaque to `require-static-classes`. Imported class values are not followed across files. Forwarded received `className` is permitted; locally authored defaults remain checked. [Static-class rule][L-static], [collector][L-collect], [settings][L-settings].

### Autofix and extensibility

**No automatic ESLint `--fix` transformations are declared.** No rule declares `meta.fixable` or a report-level automatic fix. `no-raw-colors`, `no-arbitrary-values`, `no-unknown-classes` declare `hasSuggestions` and attach editor-selected replacement fixes. Remaining rules provide diagnostics only. Literal replacements preserve formatting and class modifiers where supported; unsafe/nonliteral/escaped-source replacements can yield no suggestion. Raw SVG color findings provide textual guidance rather than an attached replacement fix. Oxlint's host API supports editor suggestions as well. ESLint explicitly distinguishes suggestions from automatic fixes. [Replacement code][L-fixes], [color rule][L-colors-source], [arbitrary rule][L-arbitrary-source], [unknown rule][L-unknown-source], [Oxlint API][L-oxlint], [ESLint suggestion API](https://eslint.org/docs/latest/extend/custom-rules#providing-suggestions).

Extensibility means configurable policies, component contracts, custom messages/notes, import/helper recognition, and shareable configs. **No documented public `defineRule`, rule-registration DSL, exported collector/classifier, or custom-rule callback API exists.** Additional AST rules can live in ordinary ESLint/Oxlint plugins. Exported `project` is experimental and exposes `projectFor`, `themeFileFor`, `colorTokensFor`, `componentsFor`, `variantDefinitionsOf`, `variantNamesFor`; it can assist external tooling/rules, but shapes may change before 1.0. Internal grammar/category/collector/cache APIs are not public exports. [Public API docs][L-api], [exports][L-index], [Oxlint API][L-oxlint].

### Agent workflow, maturity and limitations

`SETUP.md` instructs agents to preserve existing configuration and **install/register without enabling new rules**; policy choice remains separate. Adoption docs add the project's lint command to `AGENTS.md`, ratchet warning counts or use ESLint bulk suppressions, and require review of new tokens, variants and exceptions. Installation alone therefore does not establish enforcement. [Setup guide][L-setup], [adoption][L-adoption], [ESLint suppressions][L-eslint-suppressions].

Observed **2026-10-09**:

| Measure | Verified observation |
| --- | --- |
| Stars | **3,141**, exact `stargazerCount` from fetched GitHub page; display rounds to 3.1k. [Repository][L-repo] |
| Latest main commit | `ee9391038b5dc025f01777d8dbd0f72d5b885ab4`, **2026-10-05 07:58:16 UTC**; adds CSS theme-scale classification, PR #52. [Commit][L-commit] |
| Source manifest version | **0.2.0** at inspected main commit. [Manifest][L-package] |
| npm latest | **0.2.0**, published **2026-09-22 11:02:19 UTC**; first 0.1.0 publication September 14. [Registry metadata][L-npm] |
| Main vs release | Main's 0.4.0 `cn`/CSS grammar-scale reader is newer than npm's 0.3.2 bundle despite unchanged manifest version. [Classifier][L-classifier], [tarball][L-tarball] |
| License | **MIT**, verified actual `LICENSE` and npm manifest. README's `LICENSE.md` target differs from actual filename. [License][L-license] |
| Development stage | Pre-1.0, recently published, experimental project API; Oxlint JS-plugin host remains alpha. [Changelog][L-changelog], [API][L-api], [Oxlint docs][L-oxlint] |

GitHub REST API was rate-limited; stars were read from GitHub page data, commit from the fetched Git clone, release/version/date from npm's actual metadata/tarball. Stars can change. No cached search snippets were used for these figures.

Additional linked upstream material fetched/read: [Oxlint Vue support issue #15761](https://github.com/oxc-project/oxc/issues/15761), [embedded-framework language-plugin RFC](https://github.com/oxc-project/oxc/discussions/21936), [Vue prototype PR #19133](https://github.com/oxc-project/oxc/pull/19133), [directive-description rule](https://eslint-community.github.io/eslint-plugin-eslint-comments/rules/require-description.html), and [Changesets](https://github.com/changesets/changesets). These document upstream work or optional workflow tools; they do not establish features shipped by this lint snapshot.

CI configuration covers Linux Node 20/22/24 plus Windows Node 22 and includes lint/format/type/build/tests and a pinned registry corpus ratchet. This verifies configured checks, **not current CI pass status**, which is **UNVERIFIED**. Published eval docs claim >150 task runs, mostly one correction round, plus bounded red-team/fidelity results; raw run outputs are untracked and experiments were not rerun here, so independent reproduction/performance/generalization is **UNVERIFIED**. The docs themselves distinguish lint success from design approval. [CI][L-ci], [eval methodology][L-evals], [eval harness][L-eval-tree].

Verified coverage gaps:

- Plain stylesheets, `@apply`, and Vue/Svelte `<style>` contents are outside policy checking. A recognized CSS selector can pass class-existence checks while containing off-system declarations. [Theme parsing][L-theme], [Vue][L-vue], [Svelte][L-svelte].
- `no-restyle` does not trace parent selectors such as `[&_button]:...`, `*:` or `**:` to descendants; token rules still inspect readable classes. Local reimplementations and dynamic element identities evade component contracts. [Mechanism limits][L-how], [restyle docs][L-restyle].
- Imported/dynamic class values, unknown helpers and opaque whole-props spreads limit visibility; `require-static-classes` closes only identifiable unreadable class sites on recognized components, not all plain HTML. [Static-class docs][L-static], [collector][L-collect].
- New theme tokens, variants, allowed custom utilities and suppressions can expand/bypass policy without proving design approval. Custom properties/variable references retain escape paths. [Design review guidance][L-design], [color/inline sources][L-colors-source], [inline source][L-inline-source].
- Syntax normalization can turn any quarter-step-compatible pixel spacing into numeric Tailwind spacing: `p-[13px]` suggests `p-3.25` with 4px base. That is **not an approved finite spacing-role vocabulary**. [Arbitrary-value source][L-arbitrary-source].
- Warning-only/theme fallback runs can appear green in a CI setup that ignores warnings. External ESLint cache may skip consumers after token/component changes; long-running caches and transitive JS plugin/config imports have documented refresh limits. [Troubleshooting][L-troubleshooting].
- **Source inference:** `colorTokensFor` returns `null` when the global color-token set is empty, and `no-raw-colors` then skips general undeclared-token checks while still checking raw palette classes; an empty/reset theme is not equivalent to enforcing an empty allowlist. This path was inspected, not runtime-probed. [Theme reader][L-theme], [color rule][L-colors-source].
- **Docs/source discrepancy:** inline-style docs say `deny` can report otherwise accepted custom properties. The source's `judge` still reports custom properties only when their values carry detected raw colors; `deny` removes an exemption but does not independently emit a non-color custom-property violation. Runtime behavior for this case is **UNVERIFIED**; source inspection indicates `deny: ["--*"]` is not a blanket custom-property ban. [Inline-style docs][L-inline], [source][L-inline-source].

[L-readme]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/README.md
[L-index]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/index.ts
[L-plugin]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/plugin.ts
[L-package]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/package.json
[L-react]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/react.md
[L-vue]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/vue.md
[L-svelte]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/svelte.md
[L-collect]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/sites/collect.ts
[L-contributing]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/CONTRIBUTING.md
[L-tree]: https://github.com/shadcn-ui/lint/tree/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src
[L-parser]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/project/parser.ts
[L-readers]: https://github.com/shadcn-ui/lint/tree/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/sites/readers
[L-classes]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/grammar/classes.ts
[L-classifier]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/grammar/classifier.ts
[L-categories]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/grammar/categories.ts
[L-components]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/project/components.ts
[L-wrappers]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/project/wrappers.ts
[L-resolve]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/project/resolve.ts
[L-variants]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/project/variants.ts
[L-restyle]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/rules/no-restyle.md
[L-colors]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/rules/no-raw-colors.md
[L-arbitrary]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/rules/no-arbitrary-values.md
[L-inline]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/rules/no-inline-styles.md
[L-unknown]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/rules/no-unknown-classes.md
[L-static]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/rules/require-static-classes.md
[L-colors-source]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/rules/no-raw-colors.ts
[L-inline-source]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/rules/no-inline-styles.ts
[L-unknown-source]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/rules/no-unknown-classes.ts
[L-arbitrary-source]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/rules/no-arbitrary-values.ts
[L-adoption]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/adoption.md
[L-design]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/design-systems.md
[L-schema]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/rules/policy-schema.ts
[L-contracts]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/rules/contracts.ts
[L-settings]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/rules/settings.ts
[L-messages]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/rules/messages.ts
[L-rules]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/rules.md
[L-theme]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/project/theme.ts
[L-color-parser]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/grammar/colors.ts
[L-lengths]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/grammar/lengths.ts
[L-scales]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/project/theme-scales.ts
[L-oracle]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/tailwind/oracle.ts
[L-client]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/tailwind/client.ts
[L-worker]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/tailwind/worker.ts
[L-fixes]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/src/rules/fixes.ts
[L-oxlint]: https://oxc.rs/docs/guide/usage/linter/js-plugins
[L-api]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/api.md
[L-setup]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/SETUP.md
[L-eslint-suppressions]: https://eslint.org/docs/latest/use/suppressions
[L-repo]: https://github.com/shadcn-ui/lint
[L-commit]: https://github.com/shadcn-ui/lint/commit/ee9391038b5dc025f01777d8dbd0f72d5b885ab4
[L-npm]: https://registry.npmjs.org/@shadcn/lint
[L-tarball]: https://registry.npmjs.org/@shadcn/lint/-/lint-0.2.0.tgz
[L-license]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/LICENSE
[L-changelog]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/lint/CHANGELOG.md
[L-ci]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/.github/workflows/ci.yml
[L-evals]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/evals.md
[L-eval-tree]: https://github.com/shadcn-ui/lint/tree/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/packages/evals
[L-how]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/how-it-works.md
[L-troubleshooting]: https://github.com/shadcn-ui/lint/blob/ee9391038b5dc025f01777d8dbd0f72d5b885ab4/docs/troubleshooting.md

## C. Overlap and gaps between the two

The following is **analysis from the inspected implementations**, not a claim that Polar already uses `@shadcn/lint`. Orbit changes the authoring vocabulary and adds project-specific AST bans; shadcn lint retains Tailwind strings/component APIs and constrains their use through configurable policy. Both seek mechanically checkable design decisions and actionable feedback. The strongest common ground is approved tokens, component ownership and CI checks. [Orbit types][O-types], [Orbit config][O-config], [lint contracts][L-contracts], [lint design-system guidance][L-design].

### What shadcn lint can enforce from Orbit's intent

| Orbit requirement | shadcn lint coverage | Qualification |
| --- | --- | --- |
| Use approved colors rather than neighboring palette shades | `no-raw-colors` checks CSS-declared token names and literal SVG colors; `no-arbitrary-values` covers bracketed colors. | Requires translating vocabulary into Tailwind `@theme`; it does not consume StyleX token modules. Variable shorthands/custom utilities and newly declared tokens remain exceptions. |
| Avoid raw spacing/radius/appearance literals | `no-arbitrary-values` rejects bracketed values; component contracts can restrict available classes/groups. | Numeric spacing such as `p-3.25` can remain valid. Matching named CSS scales is not equivalent to enforcing Orbit's finite role set everywhere. |
| Components own appearance; pages use approved APIs | `no-restyle` rejects consumer color/padding/shape/typography overrides and points to real variants/sizes. | Only recognized component class sites; plain elements, local replacements and parent selectors remain paths around ownership. |
| Remove inline-style escape hatches | `no-inline-styles` rejects ordinary inline properties, raw colors in custom properties, and JSX `<style>`. | Dynamic/non-color custom properties and received style forwarding remain permitted. It does not duplicate Orbit's absolute explicit-`style` ban on Box/Text. |
| Catch misspellings before visual review | `no-unknown-classes` queries Tailwind; token rules identify undeclared token names. | This is lint feedback, not Orbit's token-prop TypeScript errors/autocomplete. Compiler fallback and missing-token discovery weaken coverage. |
| Keep generated classes statically checkable | `require-static-classes` rejects unreadable component classes. | Covers recognized components, not every plain DOM class or opaque spread. This is an extra safeguard beyond Orbit's simple Box attribute visitors. |
| Capture permitted decisions as deterministic contracts | Configurable `allow`/`deny`, regex contracts, custom diagnostics and shared policies. | Checks encoded rules; neither plugin proves a new token or policy exception was approved. |
| Tell agents what to do and verify changes in CI | Messages interpolate actual components, variants, sizes, theme/source paths; agent setup/adoption docs integrate lint. | Users must enable rules and make CI mandatory. Setup intentionally adds no new rules. Branch-protection enforcement was not verified. |

Table sources: [color rule][L-colors-source], [arbitrary rule][L-arbitrary-source], [restyle rule][L-restyle], [inline source][L-inline-source], [unknown source][L-unknown-source], [static-class rule][L-static], [collector][L-collect], [setup][L-setup].

### Orbit mechanisms that shadcn lint does not supply

- **A typed primitive API:** no generated `BoxStyleProps`, token-key TypeScript unions, background/text/border-specific prop types, or polymorphic semantic-element API. shadcn lint can police existing class usage but does not create Orbit's API. [Orbit types][O-types], [public lint exports][L-index].
- **Mandatory primitive use:** none of its six rules bans bare `div`, `section`, `nav`, etc. A separate AST rule is needed. Orbit's deployed raw-layout rule currently covers onboarding only. [Orbit raw-layout rule][O-raw], [Orbit config][O-config], [lint registry][L-plugin].
- **Automatic theme pairing:** shadcn lint neither requires every color to have a dark counterpart nor installs native `light-dark()`/`color-scheme` wiring. Theme tokens can hide pairing, but lint does not prove it. Orbit centrally supplies pairing for its semantic colors. [Orbit semantic tokens][O-semantic], [Orbit global CSS][O-globals], [lint theme parser][L-theme].
- **Intent-specific semantics:** a declared token called `gray-100` is still an accepted token; lint does not require role naming, nor infer that a specific surface must use `background-card`. Component contracts can approximate approved class use, but meaning must be encoded by the design-system author. [Color-rule membership check][L-colors-source], [Orbit semantic tokens][O-semantic].
- **Build/runtime styling implementation:** no StyleX compilation, responsive/pseudo prop resolver, component scaffolding, prop-table generation, or Orbit migration codemod. lint discovers existing components/variants; it does not generate them. [Orbit resolver][O-resolver], [Orbit docs extractor][O-extractor], [Orbit codemod][O-codemod], [lint exports][L-index].

Applying shadcn lint directly to Orbit is therefore not equivalent enforcement. It can help the remaining Tailwind components and consumer classes, but its token reader expects Tailwind CSS declarations, and Orbit's own implementation emits inline styles/scoped `<style>` blocks. Strict class-only checks across Orbit internals would conflict with that renderer unless scoped appropriately. [Orbit Box][O-box], [lint theme reader][L-theme], [inline-style rule][L-inline-source].

### What neither establishes

1. **Design approval/provenance:** no observed machinery distinguishes an approved new token/variant/exception from one added to make a diff pass. Both need governance over vocabulary and policy changes. A reference to a review guide is not approval evidence. [Orbit agent guide][O-agents], [lint review guidance][L-design].
2. **Correct semantic selection and combinations:** token membership does not prove suitable hierarchy, tone, color contrast, foreground/background pairing, spacing relationships or visual composition. Typed enums constrain choices, not their appropriateness. [Orbit types][O-types], [lint contracts][L-contracts].
3. **Rendered behavior/accessibility:** these mechanisms do not establish keyboard/focus behavior, screen-reader semantics in context, headings, responsive/overflow behavior, loading/error correctness, touch targets or reduced-motion compliance. Specific Orbit components implement some behavior, but that is not a system-wide proof. Rendered integration/accessibility checks remain separate. [Orbit Text][O-text], [lint rule registry][L-plugin].
4. **A closed universe of authoring paths:** Orbit's aliases/spreads, permissive props, legacy Tailwind and scoped enforcement remain gaps; lint's CSS, descendant selectors, variable references, dynamic/plain-DOM paths and suppressions remain gaps. Neither inspected approach enforces repository-wide impossibility of off-system CSS. [Orbit Box rule][O-box-rule], [Orbit Box][O-box], [lint analysis limits][L-how].
5. **Fresh, mandatory verification:** checking a configured CI workflow does not prove required merge checks, lint coverage for every file, fresh editor/cache results, or generated-doc synchronization. Those need separately verified delivery rules. [Orbit CI][O-ci], [lint CI][L-ci], [troubleshooting][L-troubleshooting], [Orbit extractor][O-extractor].
6. **Universal empirical benefit:** Orbit's qualitative observations and lint's small-project agent evals do not demonstrate zero drift, correct design, or cost savings across arbitrary teams/models/projects. Orbit comparative measurements and independent reproduction of lint evals remain **UNVERIFIED**. [Polar article](https://polar.sh/blog/orbit-llm-safe-design-system), [lint eval limitations][L-evals].

[O-types]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/utils/types.ts
[O-config]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/.oxlintrc.json
[O-raw]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/oxlint-plugins/no-raw-html-layout.mjs
[O-semantic]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/tokens/semantics.stylex.ts
[O-globals]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/src/styles/globals.css
[O-resolver]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/utils/resolvers.ts
[O-extractor]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/orbit/scripts/extract-props.mjs
[O-codemod]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/codemods/p-span-to-text.mjs
[O-box]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/components/Box.tsx
[O-agents]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/AGENTS.md
[O-text]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/packages/orbit/src/primitives/createText.tsx
[O-box-rule]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/clients/apps/web/oxlint-plugins/no-style-box.mjs
[O-ci]: https://github.com/polarsource/polar/blob/4a4544545f058c901d9602462513ad982ccbe5e6/.github/workflows/test_client.yaml
