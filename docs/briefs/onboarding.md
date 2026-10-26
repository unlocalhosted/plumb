# Onboarding: from any React project to a seam and a system

Status: design, 2026-10-27. No code. Written against the main checkout after reading the adoption, readiness,
presets, craft and design-system briefs, `src/project.ts`, `src/config.ts`, `src/decisions/*`, `src/presets/index.ts`,
`src/adoption/*`, `src/readiness/*`, `src/ledger/*`, `src/setup-messages.ts`, `src/ownership/components.ts`,
`src/imitation/index.ts`, `overlay/src/readiness.js`, `overlay/src/help.js`, and running the built CLI over
`fixtures/plain-css`, `fixtures/shadcn-theme`, `fixtures/two-entries`, `fixtures/tailwind-reset` and a scratch
project with no system at all.

Owner's ask: design how Plumber meets every kind of project (a full design system, a partial one, none, broken CSS),
and deterministically builds a **seam** (where the old code stops being judged and the new code is held) and a
**system** (the tokens) out of it. Tailwind v3 and v4, @theme, config files, plugins, prefixes, arbitrary values,
component libraries, CSS modules, CSS-in-JS. And how all of it is said to the person.

Earlier owner decisions this brief keeps (establish-design-system.plan.md, 2026-10-14): do not invent a bespoke system
first; a preset supplies the structure, the project supplies the values; `init` prompts for the preset with the detected
stack preselected; drafted whys count; the page writes decisions only; Tailwind v3 is out as a judged target.

## 0. The system being replaced

What a person meets today, in the order they meet it:

| Starting point | What happens (observed) | Cause |
| --- | --- | --- |
| A plain-CSS app with no tokens (scratch project, 7 rules, 5 inline styles) | `npx plumber` prints six `setup gap` lines and bars at 0%. `plumber init` writes `decisions: {}`, "Accepted 0 tokens", and records **34 debt entries that are all `config/no-tokens`**. `check` is then green with nothing to do. | `usageProposals` (`src/adoption/init.ts`) needs the *same literal* at three sites; near-values (`12px`/`13px`/`14px`, `#666`/`#676767`) never meet. Setup gaps are baselined as if they were drift. |
| Two Tailwind entries (`fixtures/two-entries`) | `✗ Multiple Tailwind entry files … set css in plumber.config.ts`, exit 2. | `entryCss` (`src/project.ts`) throws when `appTailwindEntry` cannot pick one. The person is told to edit a config that does not exist yet. |
| Tailwind v3 | `React Plumber needs Tailwind 4; this project has 3.x → npx @tailwindcss/upgrade`. | `tailwindSetupProblem` (`src/setup-messages.ts`). Correct, but it is the whole experience. |
| shadcn half in use (AlgoRecall-shaped) | 40,222 `provenance/type/framework` sites, 17,107 colour sites off tokens; `init` baselines all of it. | Nothing names the state ("shadcn's vocabulary is installed, the code drifts around it") or offers the move. |
| The overlay on first open | The readiness callout ("2 setup gaps · Writes reload the page") and a `?` sheet. Nothing about the project's system. | `overlay/src/readiness.js` speaks only about Plumber's own capabilities; `system.preset` is `available: false`. |

All five are one gap: **Plumber has no model of the project's starting state.** It has a model of its own needs
(readiness) and a model of values against tokens (decisions), but nothing that says *what kind of project this is*,
and therefore nothing that chooses a path. Every message is a symptom message. The replacement is a **state reader**
that names the state from evidence, and one **onboarding path per state** that ends, for every state, in the same two
artefacts: a proposed system the person accepts step by step, and a seam the ledger and CI hold.

## 1. The taxonomy of starting states

Two axes, both read from evidence the engine already collects. The **system axis** says how much of a system exists.
The **health flags** say what is wrong with what exists. A project's state is one rung plus zero or more flags, and
every rung has one path (section 2); a flag changes a step inside that path, never the path.

### 1.1 Signals (all deterministic, all from existing readers)

| Signal | Read by | Threshold used below |
| --- | --- | --- |
| Tailwind entry and version | `discoverProject` → `tailwind.entry`, `tailwind.version`; `tailwindGraph` for `@config`/`@plugin`; `system.theme.prefix` | present / absent; `4.x` / `3.x` / other; prefix string |
| Project tokens per family | `readDecisions` → `decisions` with `origin: 'project'`, `familyFor`; `projectDecision` (`src/decisions/availability.ts`) | a family is **tokened** when it has ≥ 1 project decision (numeric `--spacing` counts, as 1d decided) |
| Families in use | `report.coverage[family].total` | a family is **used** when total > 0 |
| Coverage per family | `report.coverage[family]` (from decisions / total) | ≥ 90% clean, 50–90% partial, < 50% off |
| Framework-only use | `provenance/*/framework` site counts; `frameworkVariables` | share of judged sites that are framework keys |
| Semantic layer present | decisions with `tier: 'semantic'`; `@theme inline` bridge (`themeSourceGraph`) | ≥ 1 semantic decision in colour |
| shadcn | `components.json` (`loadPresets`); `aliases.ui` directory; `cva`/`cn` in `class-helpers` | present / absent; component count |
| Package presets | `package.json` deps with a `plumb` manifest field or export (`moduleTarget`) | present / absent |
| Component libraries | `package.json` deps: `@radix-ui/*`, `@base-ui-components/react`, `@headlessui/react`, `@mui/*`, `@chakra-ui/*`, `styled-components`, `@emotion/*`, `daisyui`, `@mantine/*`, `tailwind-variants`, `class-variance-authority`; import specifiers already read by `moduleImports` | present / absent, and which |
| Arbitrary ratio | `ClassSite`s whose lowered declaration has `origin: 'arbitrary'` over all judged class declarations | ≥ 10% noisy, ≥ 25% very noisy |
| Inline literal ratio | `inline` coverage line ("5 of 5 style attributes have literal values") | ≥ 40% noisy |
| Near-values per family | the harvest (section 2.3): distinct values that fall into a cluster of ≥ 2 members within tolerance, over distinct values | ≥ 30% noisy |
| Dead tokens | `dead/<family>` counts over project decisions | ≥ 50% of declared tokens unused |
| Multiple Tailwind entries | `entryCss` candidates > 1 and `appTailwindEntry` undecided | flag |
| Conflicting theme | `CssVariable` with `root && !dark` defined twice with different values in different files, or a `@theme` key redefined after reset | flag |
| Dark split | `.dark` / `[data-theme]` / `prefers-color-scheme` definitions exist for some but not all colour tokens | flag |
| Unreadable | `diagnostics` from `unreadable`, lightningcss parse errors in `lowerCss`, unresolved `@import` in `collectStylesheets` | flag, with the file list |
| CSS-in-JS | deps above, or tagged templates `styled.x\`…\``/`css\`…\`` seen by `collectInline` | flag |
| Monorepo | `package.json#workspaces` (`packageMetadata`), `pnpm-workspace.yaml`, several `vite.config.*`/`next.config.*` below root | flag, with the app list |

### 1.2 The rungs (system axis)

| Rung | Name | Evidence | What it means |
| --- | --- | --- | --- |
| R4 | **Clean** | every used family is tokened; coverage ≥ 90% in each; arbitrary ratio < 2%; one entry | A system exists and the code mostly speaks it. Sub-kinds: `preset` (components.json or a package preset), `own` (a hand-written @theme / :root). |
| R3 | **Partial** | ≥ 1 used family tokened and ≥ 1 used family not; or any tokened family with coverage 50–90%; or a semantic colour layer exists while ≥ 30% of colour sites are framework keys (`text-gray-500` beside `--muted-foreground`) | The system is installed, not inhabited. The AlgoRecall shape. |
| R2 | **Framework** | Tailwind 4 resolves; no used family is tokened (only `frameworkVariables`); numeric `--spacing` base intact | The scale is Tailwind's, not the project's. Healthy code, no decisions of its own. |
| R1 | **Bare** | no Tailwind; < 3 custom properties on `:root`/`html` across all families | Plain CSS and inline styles, literals everywhere. |
| R0 | **Blocked** | no `src`/`app` source files; or Tailwind 3; or every stylesheet unreadable; or CSS-in-JS only | Plumber cannot judge yet. One named step out. |

A project's rung is the **lowest** rule that matches in the order R0, R1, R2, R3, R4 (Blocked wins over everything;
Bare before Framework; Partial before Clean). Ties cannot occur because each test is a predicate on the same numbers.

### 1.3 The flags (health axis)

`noisy` (arbitrary ≥ 10% or inline ≥ 40% or near-values ≥ 30%), `dead` (dead tokens ≥ 50%), `split` (several entries
or several apps), `dark-split`, `conflicting`, `unreadable`, `styled-in-js`, `prefixed` (Tailwind prefix set),
`v3` (R0 reason), `tokens-from-package` (decisions `exported: true` dominate), `dtcg` (a `*.tokens.json` or
`decisions.*.from: 'dtcg:…'`). Flags are reported as a set, sorted, so the same project always prints the same line.

**Chaos** is not a rung. It is R1–R3 with two or more of `noisy`, `dead`, `split`, `conflicting`. The word is used in
this brief, never to the person; they see the rung and the flags.

### 1.4 Where it lives

`src/onboarding/state.ts`: `readState(report, project, packageMetadata) → ProjectState { rung, kind, flags, numbers,
evidence }`, pure over a `Report` and the discovery result, so `check`, `init`, `doctor`, the Session's readiness
route and the overlay all read one state. `plumber state --json` prints it; the check header (`cli-report.ts`) gets
one line from it; `readiness()` gains a `system.state` requirement whose title is the sentence in section 5.

## 2. The path per state

Every path ends in the same place: a `plumber.config.ts`, a theme file in the project's own format with the proposed
tokens, a ledger baseline of the drift that remains, and the seam (section 3). The paths differ in what is read, what
is proposed, and how many questions are asked. One question at a time; Enter keeps the recommended answer; `--yes`
answers every question with its default for agents and CI.

### 2.1 R4 Clean

Reads: the theme, components, presets (as `init` does today). Infers: nothing new. Asks: **one question**, "Hold new
code to these tokens from today? (Enter: yes)". Writes: config (as today), baseline, and the seam set to *everything
held* (`held: ['**']`, section 3.2) because there is nothing to leave behind. First screen: the state line, the bars,
and the one question. Flags change one step: `dead` adds "`plumber decisions --unused` lists 43 tokens nobody uses;
`ledger --prune` later"; `dark-split` lists the colour tokens with no dark value.

### 2.2 R3 Partial

Reads: as Clean, plus the harvest (2.3) over the *untokened* families and over framework-key use in tokened ones.
Infers: for each untokened family a proposed ladder (2.4); for colour with a semantic layer, the **absorb map**
(`text-gray-500 → text-muted-foreground`) the design-system plan's morph already specifies. Asks, in order:

1. the preset when none is chosen and `components.json` exists ("Treat the 14 components under src/components/ui as
   your system? Enter: yes");
2. one question per untokened family, "Type: 6 sizes in use snap to 5 steps. Keep as your type scale? (Enter: yes ·
   `plumber propose --family type` to see each)";
3. the seam question (3.3).

Writes: config with `presets`, the theme additions in the project's shape (shadcn's `:root` + `@theme inline` when
that shape is present; otherwise `@theme` keys), baseline, seam. Nothing is rewritten in code at onboarding; the morph
is a later command the first screen names.

### 2.3 R2 Framework and R1 Bare: the harvest

This is the chaos → system mechanism. It is one pass and three steps, all deterministic.

**Harvest.** One pass over `report.declarations` (every lowered declaration from classes, stylesheets, `@apply`,
inline, with `prop`, `resolved`, `refs`, `when`, `site`, `owner`, `origin`). Per judged family (`judgedFamilies`,
`src/rules/families.ts`), every declaration where `isJudged` holds and the value is a literal with a `resolved`
amount, or a framework key (`refs` naming a `frameworkVariables` entry). Parts split with `partsFor`, so `margin: 0
0 8px` yields `8px` and `transition: background 150ms ease-out` yields `150ms` and `ease-out`. Skipped exactly as
provenance skips them: `0`, `auto`, percentages, `inherit`, `currentColor`, `transparent`. Opaque declarations are
counted ("42 set in code") and never clustered. Per value the harvest keeps: sites, files, props, owners, `when`
conditions, three example `file:line`. **Order is fixed**: declarations sorted by `(file, line, column)` before
anything else, so counts and examples never depend on read order.

**Cluster.** Values are grouped within a per-family tolerance, by single-linkage over the sorted list (sort by
resolved amount; a new cluster starts when the gap to the previous value exceeds the tolerance). Tolerances:

| Family | Measure | Merge within | Report as "near" within |
| --- | --- | --- | --- |
| spacing | px | 1px | 2px |
| radius | px | 1px | 2px |
| type size | px | 0.5px | 1px |
| line-height | unitless ratio | 0.05 | 0.1 |
| letter-spacing | em | 0.01em | 0.02em |
| motion duration | ms | 20ms | 50ms |
| motion easing | function text | exact | the same family of curve (`ease-out` vs `cubic-bezier(0,0,.2,1)`) |
| colour | OKLab distance (`oklab` in `families.ts`) | 0.02 | 0.06 |
| elevation | layer count, then total blur px | same layer count and blur within 2px | same layer count |
| z-index | integer | exact | — |

A cluster's **representative** is its mode by site count; ties go to the smaller value, then the first site path.
Merges are always reported ("merged `#666` and `#676767` (1 site)"), "near" pairs are never merged, they become
alternatives.

**Snap to a ladder.** For spacing, radius and type size the clusters are fitted to candidate ladders; the ladder with
the smallest **weighted snap distance** (Σ sites × |value − step|) wins, ties broken by fewer steps, then by ladder
name. Candidates: Tailwind's numeric scale (`--spacing: 4px` × n, which `numericSpacing` already understands), the 4px
grid as explicit steps, the 8pt grid, and the project's own clusters as they stand (no snap). A step is **kept** when
it absorbs ≥ 2% of the family's sites or ≥ 3 sites, whichever is smaller; the rest are listed under "becomes
off-ladder" with their sites. Colour is not snapped to a ladder; its clusters fill **roles** (the slot heuristics in
the design-system plan §4.3: page surface, text, interactive fill, line, focus) and the rest are kept as named
primitives. Elevation keeps its clusters as steps ordered by blur. Motion keeps durations as steps and easings as named
curves.

**Name.** Names are deterministic and never clever. Spacing steps in Tailwind's numeric scale keep their number
(`--spacing-3`). Explicit ladders are named by rank in t-shirt sizes when ≤ 7 steps (`xs sm md lg xl 2xl 3xl` centred
on the mode), else by their pixel value (`--spacing-12`). Radius the same. Type sizes `--text-xs … --text-2xl`
centred on the body size (the mode on `p`/`body` owners). Colours: a role name when a role rule met (`--primary`,
`--muted-foreground`), else `--color-<hue>-<rank>` where hue is the nearest of twelve OKLCH hue names and rank orders
lightness. Shadows `--shadow-sm/md/lg` by blur rank. Durations `--duration-fast/base/slow` by rank around the mode.
Each token's drafted why is a factual sentence from evidence ("padding on 212 controls in 31 files"), marked
`(drafted)` as decided on 2026-10-14.

**Determinism contract.** Same files → same proposal, byte for byte: fixed sort keys everywhere, no `Date`, no
`Math.random`, no dependence on filesystem order (`matchProjectFiles` already sorts), and the proposal carries a
`hash` of its inputs (the `Report` declarations' sites and values) in the written theme as a comment, so a second run
can say "unchanged" or "3 steps moved since the proposal". `plumber propose --json` twice must be equal; that is the
first e2e.

**Reviewable.** `plumber propose` prints one table per family: step, value, sites, files, example, what it absorbs,
what becomes off-ladder. `plumber propose --write` writes the theme as a diff first (the project's shape: `@theme` for
Framework, `:root` for Bare; Open Props when the preset is chosen), then `plumber accept-decisions` records the
tokens, family by family (`--family spacing`), with the drafted whys. A step the person removes from the written theme
is simply not a token; a cluster they decline as "not a token" is a ledger line `{"kind":"declined"}` so it is never
proposed again (the plan's §4.4). The page's system panel (plan §8.2) is the same review with pointing: a row lights
every element it absorbs.

**Adopt without a flood.** Order matters and `init` today has it backwards: it baselines, then has no tokens. The new
order is **propose → write theme → baseline → seam**. The baseline then records `provenance/*` debt against real
tokens, and `config/no-tokens` is never written as debt (it is a readiness requirement, `read.tokens.<family>`, and a
step, not a finding to carry). On the scratch project this turns 34 meaningless debt lines into roughly 12 real ones
(the values the ladder does not absorb), a ledger a person can read and pay down.

### 2.4 R2 Framework specifically

Tailwind's defaults are the ladder. The proposal is the **adopt** move from the plan §4.3: the framework keys in use
per family become project keys with the same names and values inside `@theme` (`--text-sm`, `--radius-lg`,
`--shadow-md`), so every `text-sm` becomes a project-token use with no code edit, and `numericSpacing.replaced`
stays false so the numeric ruler stays open. Arbitrary values (`p-[13px]`) snap to the nearest adopted key the way
`closest` in `provenance.ts` already finds them and are listed as morph edits, not written at onboarding. One question
per family: "Adopt Tailwind's 6 type sizes you use as yours? (Enter: yes)". Colour is the exception: palette keys
(`bg-blue-600`) are harvested for the shadcn role fill when `components.json` exists, otherwise adopted as named
primitives (`--color-blue-600` becomes the project's) with the role fill offered as the next step.

### 2.5 R0 Blocked

One sentence, one step, exit 2 only when there is nothing at all to read:

- Tailwind 3: "This project uses Tailwind 3.4. Plumber judges Tailwind 4. `npx @tailwindcss/upgrade` moves the config
  into CSS; run `npx plumber` after." Nothing else is read or judged (owner decision 4). The state reader still reads
  `tailwind.config.*` **statically** (oxc, no execution; `theme.extend` object literals only) to say how many tokens
  the upgrade will carry, so the sentence can add "your 31 theme values come with it".
- Unreadable CSS: the files, the first parse error of each, and "fix these, or exclude them with `source`
  (`!src/legacy/**`)". Everything readable is still judged, so the person sees bars plus a `fix` row.
- CSS-in-JS only: "Styles live in styled-components (14 files). Plumber reads stylesheets, Tailwind classes and inline
  `style`; see Libraries." plus the static-template path in 4.3 when it exists.
- No source: "No React source under src/ or app/. Set `source` in plumber.config.ts."

## 3. The seam

The seam is the line between code that is **held** to the system (any drift fails) and code that is **carried** (its
drift is debt; only new drift fails). It needs to be true in CI, honest over time, and visible on the page.

### 3.1 The primitive: git change, by line

This exists: `applyLedger` with `--base <ref>` / `--changed` marks sites outside changed files `outOfScope`
(`src/ledger/check.ts`), and `changedLines` (`src/surfaces/changed-lines.ts`) knows the added lines. The seam's first
rule is the one the ledger already enforces: **a finding on a changed line that the ledger does not cover fails**.
Nothing is new here except saying it plainly: the git diff is the seam's finest grain, and it is why adoption never
floods.

### 3.2 The declared boundary: held paths

Config gains one key, validated in `validateConfig`:

```ts
seam: {
  held: ['src/components/ui/**', 'src/features/billing/**'],  // any drift here fails, debt or not
  carried: ['src/legacy/**'],                                  // optional: debt here is never a warning when stale
}
```

Semantics in `applyLedger`: a site inside a `held` glob is `new` even when a debt entry covers it; `ledger --ratchet`
drops debt inside held paths. `baseline` refuses to record debt inside held paths and says which. `held` defaults to
`[]` on R1–R3 and `['**']` on R4. Directory is the grain because that is how teams move ("the design-system folder is
held; `features/` is carried"), and because `componentConfigs`/`presetComponentMatches` already scope by directory.

### 3.3 Graduation: components cross the seam

A component (from `discoverComponents`) whose own root ranges carry zero debt sites after a `check` is **graduated**:
`ledger --ratchet` writes `{"kind":"held","component":"Button","path":"src/components/ui/button.tsx"}` and from then on
the component's file is held. The seam moves by itself as the debt is paid, one component at a time, and the ledger
is the record of where it stands. `plumber check` prints the count: "held: 14 of 61 components · 3 of 12 folders".

The onboarding question (asked once, after the theme): "Hold new code to the system from today? (Enter: yes). Hold a
folder too? (Enter: none · e.g. src/components/ui)". Two defaults that are safe: changed lines always, folders only
when the person names one.

### 3.4 CI

`plumber check --base <PR base>` already fails only new sites in changed files; with `held`, it fails any site under a
held path, and `ledger/grew` already blocks debt growth. The GitHub Action summary gains one line, the seam position
("held 23% of files, +2 components this PR"). `--strict-ledger` in agent hooks treats a `held` line growing as growth
(it may only grow by graduation from `ledger --ratchet`, which a hook never runs).

### 3.5 On the page

Visual, not words (visual-language.md). In blueprint, elements inside held code are drawn at full ink; elements in
carried code are dimmed one step and their drift marks are hollow (outline only), so the eye sees the system's edge
without a label. The title block's cause list already ranks causes; it gains a single toggle glyph "carried / all",
default carried hidden in view-count ("12 off in view · 40 carried") so a person working in new code is not shown the
old debt. Pointing at the dimmed region says, once, "carried code: drift here is recorded debt; `L` lists it".

## 4. Library support

What each library means for **detection** (which rung, which flags), for **where the style lives** (so the harvest
reads the right thing), for **locate/edit** in the overlay, and for the **craft rules**.

### 4.1 Support matrix

| Library / approach | Detection | Where style lives | Locate + edit today | Craft rules | Status | Needed for the next cell |
| --- | --- | --- | --- | --- | --- | --- |
| Tailwind v4, @theme in CSS | `tailwind.entry`, `version 4.x` | `@theme`, `:root`, classes | yes: `candidatesToCss`, `set`/`apply` edit class tokens | yes | **supported** | — |
| Tailwind v4 with `@config`/`@plugin` (JS theme, daisyUI, plugins) | `tailwindGraph` visits them | JS config theme + plugin utilities | compile works through the project's Tailwind; **unverified** that plugin utilities compile | yes | **partial** | a fixture with `@plugin "daisyui"` proving `candidatesToCss` returns CSS; theme keys from `@config` read via `system.theme.entries()` (already consumed) |
| Tailwind v4 with a prefix (`@import "tailwindcss" prefix(tw)`) | `system.theme.prefix` | as above | suggestions already prefixed (`lower/tailwind.ts:276`); class recipes and `looksLikeTailwind` do **not** strip a prefix | yes | **partial** | strip `prefix:` in `readClassRecipes`, `looksLikeTailwind`, the facet table's utility matching (`craft-facets.js`); one `fixtures/onboard-prefixed` |
| Tailwind v3 | `version 3.x` | `tailwind.config.js` theme + classes | none | none | **named, not judged** (owner decision) | state reader reads `theme.extend` statically for the sentence only |
| Arbitrary values everywhere (`p-[13px]`, `bg-[#2563eb]`) | `origin: 'arbitrary'` ratio | the class string | yes, `provenance/arbitrary` with `closest` | yes | **supported** | the `noisy` flag and the snap list in `propose` |
| shadcn/ui | `components.json`, `cva`, `cn` | project files under `aliases.ui`; `:root`/`.dark` + `@theme inline` | yes: `readClassRecipes` reads `cva` variants; ownership contracts; theme shape proven (`shadcn-theme`) | yes | **supported** | edits in **variants**: when a drift site is inside a `cva` `variants` object, the chooser must say which variant it edits (`variant=destructive`) and never touch `base`; today `set` edits the token in place, which is right, but the words do not say "in variant destructive" |
| class-variance-authority / tailwind-variants (`cva`, `tv`) | imports | recipe objects | yes (`class-helpers.ts`) | yes | **supported** | `slots` in `tv` are listed in `recipeKeys` but not read as per-slot recipes: a slot's classes are judged as one bag |
| Radix UI primitives | `@radix-ui/*` deps | **unstyled**: style is in the project's wrapper (`className` on `Dialog.Content`), `data-state` variants (`data-[state=open]:…`) | locate lands on the wrapper JSX through the owner stack (bippy); `data-[state=open]:` compiles as any variant; `highlightAttribute` in habits knows `data-state`; **portals** render outside `#root` | craft reads rendered DOM, so portal content is read only when the reader walks `document.body`, not the app root | **partial** | confirm the blueprint reader includes portal containers (`[data-radix-portal]`, `body > div` after root); treat `asChild`/`Slot` as "style on the child": the owner frame is the wrapper, the element is the child, the class string is on the child's JSX, which is what locate finds already; one fixture `onboard-radix` |
| Base UI (`@base-ui-components/react`) | dep | unstyled; `render` prop instead of `asChild`; state in `data-popup-open`, `data-pressed`, `data-disabled`; `className` may be a **function of state** | function `className` is `existence/dynamic-class` (opaque) today | as Radix | **partial** | read `className={(state) => cn('…', state.open && '…')}` as a recipe with the function's literal branches (`readClassRecipes` already handles conditionals and `&&`; it needs the arrow-function case); portals as Radix |
| Headless UI (`@headlessui/react`) | dep | unstyled; `data-headlessui-state="open active"`; render-prop children `({ open }) => …`; `className` function | same as Base UI | same | **partial** | same function-`className` reading; `data-[headlessui-state~=active]:` is a plain variant |
| CSS Modules (`*.module.css`) | file names, `styles.x` imports | the module file | stylesheet reader lowers the file (`fixtures/module-css`); the **class on the element is hashed at runtime** so the overlay's reading cannot match `styles.card` to `.card_x1y2` | craft reads computed style, unaffected | **partial** | the Vite plugin exposes the module's name map (Vite's CSS modules JSON) to the Session so locate can map `card_x1y2 → card`; edits are stylesheet edits (`replacement` on the declaration), already supported |
| Plain CSS | no Tailwind | stylesheets, inline | yes (`plain-css`) | yes | **supported** | — |
| styled-components / Emotion `css` tag | deps, tagged templates | template literals in TS | not read (`DESIGN §3.8`) | computed style read; no source | **not yet** | a static reader: `styled.div\`…\`` and `css\`…\`` with **no interpolations** lowered through `lowerCss` as an embedded stylesheet (`EmbeddedStylesheet` in `collect/inline.ts` is the shape); interpolated declarations become `opaque`; edits are text edits inside the template at the declaration's offset |
| MUI (`sx`, `theme` object), Chakra (style props) | deps | JS objects and props | not read | computed only | **not yet** | `sx={{ p: 2 }}` is an inline object with a theme-multiplier unit: read as inline with a resolver that maps `2 → 16px` from the MUI theme spacing; Chakra `p="4"` the same. Judge against **their** theme (a package preset that exports `theme.spacing` as decisions). Out until a real app asks. |
| Mantine, vanilla-extract, Panda | deps | hashed modules / build-time | not read | computed only | **not yet** | nothing planned |
| daisyUI | `@plugin "daisyui"` | theme block in CSS; components are classes | plan layer 7 | yes | **planned** | see plan §2.2 |
| Open Props | `open-props` dep | `:root` primitives from the package | plan layer 8; `records` can read package CSS | yes | **planned** | see plan §2.3 |
| Tokens from a package (`exported`) | `moduleTarget`, `exported: true` records | the package | yes (`ds-package`/`ds-consumer`) | yes | **supported** | the state reader flags `tokens-from-package` and the sentence says whose |
| DTCG / Figma tokens JSON | `*.tokens.json`, `dtcg:` sources | the JSON (`readDtcg`) | yes, decisions with `$description` as why | yes | **supported** for reading; **not** as a write target | `propose --write` never writes DTCG (owner: not the primary store); it writes CSS and says the JSON is the source when `dtcg:` is configured |

### 4.2 Rules for the unstyled libraries (Radix, Base UI, Headless UI)

One rule covers all three: **the element is the project's; the library is a behaviour.** Detection puts the project
on the rung its own CSS and classes earn; the library adds no flag. The harvest reads the wrapper's classes exactly as
any element's. Locate uses the owner stack as it does (`locate.js`: "the first frame in feature code, with shared UI
ranked after it"), which already lands on the wrapper under `components/ui`, and `Alt+↑` walks to the caller. Edits
land on the class string that carries the value, whether on the wrapper or an `asChild` child. The one new reading is
the function `className` (Base UI, Headless UI, and Radix users who write `className={({ ... }) => …}` themselves):
`readClassRecipes` gains an `ArrowFunctionExpression`/`FunctionExpression` case whose body is read as a recipe with the
parameter names as variant axes. State attributes are variants, not findings: `data-[state=open]:bg-accent` is judged
like `hover:bg-accent` (its `when` carries the selector condition already).

### 4.3 Where edits belong, per library

| Site | The edit | Said as |
| --- | --- | --- |
| a plain class string | replace the token (`set`) | "`p-3` → `p-4`" |
| inside `cva` `base` | replace in base | "in Button's base" |
| inside `cva` `variants.variant.destructive` | replace in that branch | "in Button, variant destructive" |
| inside `compoundVariants` | replace in that entry | "in Button, when variant=outline and size=sm" |
| a stylesheet declaration (plain, module, `@apply`) | replace the value (`replacement`) | "`styles.css:12` `gap: 10px` → `var(--spacing-3)`" |
| `style={{ padding: 12 }}` | replace the literal, quoted when a unit appears | "`padding: 12` → `\"var(--spacing-3)\"`" |
| a static `styled`/`css` template (later) | replace inside the template at its offset | "in `Card`'s styles" |
| anything interpolated or computed | no edit | "set in code: 42 values can't be fixed here" (readiness §2.5) |

## 5. Communication: the words and the order

Principles: one state sentence, then bars, then one question. Never a list of everything. Confidence is said once,
as a count of evidence, never as a percentage of belief. Every proposal is visible before it is written. Nothing is
written without Enter or `--yes`. Vocabulary per MESSAGES: token, scale, your theme, held, carried; never rung, slot,
cluster, provenance, decision.

### 5.1 CLI first run, per state

Header line (exists) gains the state after the stack:

```
React Plumber  my-app · Tailwind 4.1 · theme src/index.css · 214 files · 2.3s
A system, half in use: shadcn's tokens are installed; 61% of colour and 2% of type still use Tailwind's keys.
```

Then the bars (exist), then **Fix first** (exists), then the one next step:

| State | Sentence (the only new line) | Next step offered |
| --- | --- | --- |
| R4 Clean | "A system, in use: every value family has your tokens and 94% of values use them." | `plumber init` · holds new code to your tokens from today |
| R3 Partial | "A system, half in use: shadcn's tokens are installed; 61% of colour … still use Tailwind's keys." | `plumber init` · adopts the system and proposes the missing scales from this code |
| R2 Framework | "Tailwind's scale, no decisions of your own: 6 type sizes, 11 spacing steps, 14 colours in use." | `plumber init` · makes the ones you use yours, and proposes a system |
| R1 Bare | "No system yet: 212 values in 2 files, 31 of them near-duplicates." | `plumber init` · proposes a scale from these values, step by step |
| R0 v3 | "Tailwind 3.4: Plumber judges Tailwind 4. Your 31 theme values come with the upgrade." | `npx @tailwindcss/upgrade` |
| R0 unreadable | "3 stylesheets can't be read; 11 can." + the three with their first error | fix or exclude with `source` |
| flags | one clause appended, comma-separated: "two Tailwind entries", "28 tokens unused", "dark values for 12 of 27 colours" | the flag's own step appears in Fix first |

### 5.2 `plumber init`, one question at a time

```
$ npx plumber init
A system, half in use (shadcn, 14 components under src/components/ui).

1/4  Treat shadcn's tokens and components as your system?            Enter: yes
2/4  Type has no tokens. 6 sizes in use snap to 5 steps (text-xs…2xl). Keep?   Enter: yes  · s shows each step
3/4  Spacing: Tailwind's numeric scale, 11 steps in use. Make it yours?         Enter: yes
4/4  Hold new code to the system from today?                                    Enter: yes  · a folder too: src/components/ui

Wrote plumber.config.ts (presets shadcn, 4 habits, seam: changed lines + src/components/ui).
Wrote 5 type tokens to src/index.css (@theme), proposed.          plumber decisions --family type
Baseline: 1,204 debt entries in .plumber/ledger.jsonl.             plumber check --debt
Next: plumber accept-decisions --family type   then   plumber install --ci
```

`s` on a question opens that family's table (the `propose` output) and returns to the question. `--yes` answers all
with Enter. `--preset`, `--family <f>=keep|skip`, `--hold <glob>` answer a specific one. An answer of `n` to a family
question skips it: the family stays a readiness gap, named in `doctor`, not debt.

### 5.3 The overlay's first open

The dock already has the readiness callout and the `?` sheet (`readiness.js`, `help.js`), both once per project. The
system's first open is the same shape and the same budget: **one card, one time**, above the dock, that replaces words
with the bars. Layout: the state sentence as the title; one row per family: the family name, a bar in mint for the
share on tokens and coral for off, and the count as a tabular number (the "On your tokens" block drawn, not
lettered); one primary pill: `Propose a system` (R1–R3) or `Hold new code` (R4); one quiet link `Not now`. No
checklist, no chips, no file paths on this card; those live in the readiness panel. Pointing at a family row lights
every element in view that is off in that family (the `MarkLayer` knows), which is the one thing the CLI cannot do
and the reason this card exists on the page. `Propose a system` opens the system panel (plan §8.2) on the first
family with the most sites; each row there is a proposed step, Enter accepts it, and the Write writes the theme
through the Session. The `system` capability in `readiness()` becomes `available: true` when this ships, and its
`system.state` requirement carries the sentence so the CLI, `doctor` and the card say the same thing.

Hints (help.js) gain one: the first time the system panel opens, "↵ keeps a step · ⌫ declines it · point at a row to
see where it's used".

## 6. Failure modes

| Failure | Detected by | What the person sees | Path |
| --- | --- | --- | --- |
| Broken CSS (parse error) | `lowerCss` / lightningcss error → `diagnostics` | the state line counts it; Fix first has a `✗` row naming file:line and the error | judged without that file; `source: ['!…']` offered; never exit 2 while anything is readable |
| Unparseable TSX/JSX | oxc `diagnostic` on the module (`components.ts`, `classes.ts`) | "2 files couldn't be parsed" with the first error each | same |
| Unresolved `@import` or module | `collectStylesheets` imports without `file`; `resolver` failures | "`@import "./tokens.css"` not found at styles.css:3" | the readiness `locate.source` pattern: evidence + step |
| Two Tailwind entries, one app | `entryCss` candidates > 1, `appTailwindEntry` undecided | state flag `split`; **a question, not an error**: "Two Tailwind entries. Judge against: 1 src/index.css (imported by main.tsx) 2 src/admin.css · Enter: 1" | `init` writes `css`; `check` without config judges the one `appTailwindEntry` ranks first and says so |
| Monorepo / several apps | `workspaces`, several host configs | "3 apps: apps/web, apps/admin, packages/ui. Run in one: `--root apps/web`" | `plumber init --root <app>` per app; a shared `packages/ui` with a `plumb` export becomes the preset the apps inherit (`loadPresets` dependency path); the state reader never merges apps |
| CSS that can't be resolved (`var()` chains to dynamic, `light-dark()`, `env()`) | `resolveValue` returns undefined; `dynamic` variables | counted once: "19 values depend on runtime; not judged" | never a finding; the harvest skips them |
| Conflicting themes (same token, two values, neither dark) | `readCssVariables` duplicates on `root && !dark` across files | flag `conflicting`; Fix first row: "`--radius` is 6px in tokens.css:4 and 8px in legacy.css:9" | `propose` uses the later definition (cascade order from the graph) and says so; the row's step is "remove one" |
| Dark mode variants | `dark` on `CssVariable`; `resolvedModes` | flag `dark-split` when partial; harvest clusters light and dark separately (`when` conditions) | proposals carry both scopes when dark evidence exists; when not, the theme is written light-only and the sentence says "no dark values found" (never invented) |
| Runtime-only styles (`style={{ x: value }}`, template classes) | `opaque`, `existence/dynamic-class` | one count, "42 set in code", never labels (readiness §2.5) | listed by `--rule provenance/opaque-inline`; the morph's "pass through a custom property" advice |
| Tokens exported from a package | `exported: true`, `tokens-from-package` flag | "Tokens come from @acme/ui (1,095). Your own: 0." | R4 `preset`; `propose` proposes nothing for families the package covers |
| Figma / DTCG tokens | `dtcg:` source or `*.tokens.json` present but unconfigured | "design.tokens.json has 84 tokens; not read yet" + the config line | `init` writes `decisions.<family>.from: ['dtcg:design.tokens.json']` when the person says yes; CSS stays the write target |
| Tailwind prefix | `theme.prefix` | flag `prefixed`; everything else unchanged once 4.1's gaps close | — |
| Huge projects | `report.declarations` > 100k | tables cap at the top 8 steps per family and "+n more" (`--json` has all); the harvest is one pass (bounded by the existing collection) | — |
| No git | `gitContext` throws | seam by changed lines unavailable: "No git: the seam holds folders only" | `held` globs still work; `--changed` says it needs git |

## 7. Layered build plan

Owner's rules: primitives first; one layer per agent; finish and verify before the next; integration and e2e tests
only, through the real boundary (the built CLI on fixtures; real Chromium for the overlay); no unit tests. Non-UI
layers go to a background Sonnet agent; UI layers (the card, the panel) to Opus.

### 7.1 Fixtures (created in layer 1, grown later)

| Fixture | Shape | Expected state |
| --- | --- | --- |
| `fixtures/onboard-clean` | shadcn init output + three components using `bg-primary`, `text-sm`, `rounded-md`; one `p-[13px]` | R4 `preset`, no flags |
| `fixtures/onboard-partial` | shadcn `:root`/`@theme inline` for colour only; code uses `text-gray-500` beside `--muted-foreground`; no type or motion tokens | R3, flags: none (or `dead` if `.dark` tokens unused) |
| `fixtures/onboard-framework` | `@import "tailwindcss"`, no `@theme`; `text-sm`, `gap-3`, `rounded-lg`, `bg-blue-600`, `p-[13px]` | R2 |
| `fixtures/onboard-bare` | the scratch project above: plain CSS, inline styles, near-values | R1, flag `noisy` |
| `fixtures/onboard-chaos` | onboard-partial + two Tailwind entries + a second `--radius` in `legacy.css` + 40% arbitrary + 20 unused tokens + a `.dark` block for half the colours | R3, flags `noisy dead split conflicting dark-split` |
| `fixtures/onboard-v3` | `tailwind.config.js` with `theme.extend`, `@tailwind base;` CSS, tailwindcss 3 in package.json (not installed) | R0 `v3`, "31 theme values come with the upgrade" |
| `fixtures/onboard-monorepo` | `workspaces: ['apps/*', 'packages/*']`; `apps/web` (R2), `apps/admin` (R1), `packages/ui` with a `plumb` export | root: "3 apps"; `--root apps/web`: R2 with `tokens-from-package` |
| `fixtures/onboard-radix` (layer 6) | `@radix-ui/react-dialog` wrapper with `data-[state=open]:` classes, `asChild` trigger, a portal | R3, locate lands on the wrapper, portal content read |
| `fixtures/onboard-prefixed` (layer 6) | `@import "tailwindcss" prefix(tw)` | R2, flag `prefixed`, `tw:p-[13px]` snaps to `tw:p-3` |

### 7.2 Layers

| # | Layer | What is built (files) | Proof (e2e through the real boundary) | Who |
| --- | --- | --- | --- | --- |
| 1 | **The state reader** (the primitive) | `src/onboarding/state.ts` (`readState`), `plumber state --json`, the sentence in `cli-report.ts`'s header, the `system.state` requirement in `readiness/index.ts`; the seven fixtures | `node dist/cli.js state --root <fixture> --json` equals a committed expectation for each fixture (rung, kind, sorted flags, numbers); the check header prints the sentence; two runs are byte-equal; `two-entries` no longer exits 2 without config | Sonnet |
| 2 | **Harvest, cluster, ladder** | `src/onboarding/harvest.ts`, `cluster.ts`, `ladder.ts`, `names.ts`; `plumber propose [--family] [--json]` | `propose --json` on `onboard-bare` equals a committed proposal (steps, sites, absorbs, off-ladder, drafted whys, input hash); run twice, equal; shuffling file read order (a test helper that renames files to change glob order) changes nothing; `onboard-framework` proposes the adopt keys; `onboard-chaos` reports merges and near pairs and uses the later `--radius` | Sonnet |
| 3 | **Write and the new `init` order** | `propose --write` (theme writers: `@theme`, `:root`, shadcn shape, `@theme inline` bridge), `init` reordered to propose → write → baseline, questions with Enter/`--yes`/`--family`/`--preset`, `config/no-tokens` never baselined, `declined` ledger kind | on `onboard-bare`: `init --yes` writes `src/theme.css` equal to the committed theme, a ledger with zero `config/no-tokens` lines, `check` green, `decisions --json` lists the proposed tokens as `inferred`; `init` with `--family type=skip` leaves type as a `read.tokens.type` gap in `doctor`; on `onboard-partial` the shadcn shape is extended in place and existing `--primary` untouched | Sonnet |
| 4 | **The seam** | `seam.held`/`carried` in `config.ts`; `applyLedger` held-path rule; `baseline` refusal; `ratchet` graduation (`kind: 'held'`); the "held n of m" line; the Action summary line | on a git-initialised copy of `onboard-partial`: a debt site under `held` fails `check`; a new site in a carried file fails only with `--changed`/`--base`; fixing a component's drift then `ledger --ratchet` writes its `held` line and the next `check` counts it; `--strict-ledger` fails when a `held` line is hand-added | Sonnet |
| 5 | **The first-open card** (UI) | one component in `overlay/src/system-card.js`: title sentence, family bars, primary pill, Not now; once per project; readiness `system` becomes available | Playwright on the overlay demo seeded from `onboard-bare` and `onboard-clean`: the card shows the right sentence and pill; pointing at a family row lights the off elements in view; Not now hides it and it does not return; Esc, focus, reduced motion as the readiness panel | Opus |
| 6 | **Library adapters** | prefix stripping in `class-recipes.ts`, `setup-messages.ts`, `craft-facets.js`; function `className` recipes; portal containers in the blueprint reader; variant-aware edit words ("in Button, variant destructive") | `onboard-prefixed`: `tw:p-[13px]` is `provenance/arbitrary` with fix `tw:p-3`; `onboard-radix`: Alt+click on the dialog content locates the wrapper line, blueprint draws the portal's drift, a `className={(s) => …}` site is judged not opaque; the chooser's words name the variant | Sonnet (reader) + Opus (words) |
| 7 | **CSS modules locate; static CSS-in-JS reading** | the Vite plugin's module name map on the Session; `styled`/`css` templates without interpolations as `EmbeddedStylesheet` | `fixtures/module-css` + overlay: Alt+click an element with a hashed class locates the module declaration and Write edits it; a `styled-components` fixture's static template is judged and edited, its interpolated one counted as set in code | Sonnet |
| 8 | **Monorepo** | root run lists apps; `--root <app>` per app; shared `packages/ui` as the inherited preset | `onboard-monorepo`: root prints the three apps and exits 0; `--root apps/web` is R2 with `tokens-from-package`; `init` in `apps/web` writes nothing outside it | Sonnet |

Each layer ends with its e2e green, `npm run typecheck`, a `docs/briefs/onboarding-<n>.result.md`, and a read-only
run on a real app (AlgoRecall, cache redirected) recorded in the note. Layer 1 is the primitive everything else
reads; it is reviewed before layer 2 starts.

## 8. Open questions for the owner

1. **Held by default on R4?** This brief says yes (`held: ['**']` when everything is clean). The alternative is
   changed-lines only everywhere, and a person opts into folders. Recommendation: yes on R4, because there is no debt
   to carry and the seam has nothing to divide.
2. **Ladder candidates.** Tailwind numeric, 4px, 8pt, and "as found". Should a brand ladder (a person types `4 8 12
   16 24 32 48 64`) be a fifth candidate at `init`, or only later in `propose --ladder`? Recommendation: later.
3. **Colour roles without shadcn.** On R1/R2 with no `components.json`, propose roles (`--primary`,
   `--muted-foreground`) or hue-rank primitives (`--color-blue-6`)? Recommendation: primitives first, roles offered as
   the next step; roles are a judgement, primitives are a fact.
4. **Function `className` as variants.** Reading `(state) => cn(…)` as a recipe with the parameter's property names as
   axes is an inference. Acceptable, or list them as a separate "state class" kind? Recommendation: recipe; the
   existing conditional handling already does this for ternaries.
