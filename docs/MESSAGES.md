# Messages

Every finding is read by someone deciding what to change: a person in a terminal or PR, or an agent. It has to say what is wrong with this code, why that matters, and exactly what to do, in words the reader already uses. This file is the contract for what every rule says. Rule ids stay in JSON and in `--verbose`; people read titles.

## The four parts of a finding

| Part | Field | Rule |
|---|---|---|
| Title | `title` | One line, under 80 characters. Names the authored code or amount and what is wrong with it. Specific to this finding. |
| Because | `because` | One sentence on why it matters. Stable per rule; never a restatement of the title. |
| Do | `choices` + per-site edits, or `action` | The tokens to use with their amounts, or one plain instruction. Exact edit per site when one choice fits. |
| If intended | `accept` | The command that records it as a reasoned exception: `plumber accept <key> --why "…"`. Shown once per finding. |

`why` and `fix` stay in JSON for compatibility: `why` = `because`, `fix` = the action text.

## Vocabulary

Readers know tokens, scales and Tailwind. They do not know React Plumber's internals.

| Internal | Say |
|---|---|
| decision | token (a spacing step is a token on your spacing scale) |
| family | spacing scale, radius scale, type scale, colour tokens, shadow tokens, motion tokens, z-index layers |
| framework origin | Tailwind's default (palette, radius, weight…) |
| project origin | your theme |
| primitive / semantic tier | raw token / named token |
| identity reference, by-value | matches a token but doesn't use it |
| provenance | (not said) |
| site | (not said; show `file:line:col`) |
| NEEDS-DECISION | no token fits: pick one with the design owner, or add one |

Paths are relative to the project root, everywhere, including ownership sources. Amounts are shown as compiled (`10px`), with the authored form beside them (`gap-10`).

Count-bearing messages use singular nouns and verbs for exactly one, and plural forms for zero or more than one. This applies to findings, summaries, ledger commands, setup, presets, parity and PR output: `1 colour value can't be checked`, `1 spacing token is never used`, `1 ledger entry`, `0 entries`, `2 entries`. Use the shared `count` and `plural` helpers in `src/messages.ts`; leave numeric table labels neutral.

## CLI analysis progress

One live line on stderr, erased before the report (also on Ctrl+C and errors):

```
━━━━━━━━━━━━━━────────────────  48%  Reading stylesheets: 2 of 4 stylesheets
━━━━━━━━━━━━━━━━━━━━━━━━──────  81%  Checking unused tokens · 9s
```

Use the existing analysis phases in their actual execution order. Before counts are
known, say `Reading your project` or `Reading styles`. Step labels include
`Reading styles: 812 of 1,748 files`, `Compiling Tailwind from src/index.css`,
`Tracing computed classes: 448 of 1,748 files`,
`Tracing stylesheet imports: 512 modules`, `Following stylesheet imports`,
`Checking 292,104 values against your tokens`, `Checking tokens: 3 of 7 rule families`,
`Matching components: 812 of 1,748 files`, `Checking component styles: 256 of 1,024 values`,
`Checking unused tokens`, `Checking habits and component copies`, `Checking ledger`,
`Checking project files for cache`, `Validating source cache`, `Validating component cache`,
`Validating module cache`, `Validating cache inputs: 256 of 1,748 files`,
`Saving analysis cache`, `Saving report cache`, `Writing report cache`, `Finishing cache`,
`Reading cached report`, and `Done`.
Source walking and computed-class tracing use distinct labels for their file passes;
a label's count never restarts. Cache validation counts verified file identities.
Stylesheet import tracing counts visited modules without a denominator, since its
graph grows during traversal. Report cache serialization and disk writes have
separate steps. Matching counts scanned caller files; component-style checks count declarations matched
against the component graph. Format counts with comma separators and show
project-relative paths. At 3 seconds, append whole elapsed seconds (`· 3s`), updating
once per second even during synchronous analysis. Redraw at most once per 70 ms;
completion renders 100% immediately, then clears. Brief phases may be coalesced.
Only successful completion earns 100%; findings still count as a completed check.

Only show progress when stderr is a TTY, after 300 ms. Hide it for `--json`, `--agent`,
`--sarif`, `--format github`, any set `CI` value, piped stderr, and serve/watch paths.
Use dim text unless `NO_COLOR` is set, no spinner. The bar uses 24–36 cells at normal
terminal widths. Truncate the label first, preserving the percentage and clock;
reserve the last terminal cell to prevent wrapping. Below 31 columns the bar itself
must shrink to fit. `NO_COLOR` or a locale without UTF-8 uses `#`/`-` and `|` instead
of box drawing and `·`. Locale precedence is `LC_ALL`, `LC_CTYPE`, then `LANG`.
Percentages never decrease; skipped/cache-hit steps grant their weight immediately
when the next step starts. Step weights and calibration are in
`docs/briefs/cli-progress-bar-fixups.result.md`.

For a cold (absent or empty) cache, after 5 seconds print once on its own line:
`First run builds a cache in .plumber/cache; later runs are faster.` Substitute the
actual project-relative cache path, including legacy `.plumb/cache` and
`PLUMBER_CACHE_DIR` overrides. Keep this line after clearing the live status.

E2E-only timing overrides: `PLUMBER_TEST_PROGRESS_DELAY_MS` replaces 300 ms and
`PLUMBER_TEST_CACHE_NOTICE_MS` replaces 5,000 ms. These are test hooks, not user settings.

## CLI setup and errors

Setup errors go to stderr and exit 2. Start with `✗ what happened`; keep useful context on an indented line, then a copyable next step with `  →`. No stack traces, filesystem errno text, or Node argument-parser prose. Unknown commands/options suggest only a close accepted spelling, using the vocabulary in `src/cli-flags.ts`.

Project discovery:

```text
✗ No project here. React Plumber reads a React app: a folder with package.json.
  → cd into your app, or: npx plumber --root path/to/app
Using the project at ../.. (site, package.json).
This is a workspace with 3 apps. Pick one:
  npx plumber --root apps/docs    Vite · Tailwind 4
  npx plumber --root apps/web    Next.js · Tailwind 4
  npx plumber --root packages/ui    library · Tailwind 4
✗ Found no .tsx, .jsx or .css files under src/. Is this the right folder?
  Looked in: src/** (from plumber.config.ts `source`)
  → change `source`, or run in your app's folder
✗ --root does-not-exist: no such folder (from {cwd}).
✗ --root package.json: not a folder (from {cwd}).
```

Use the actual relative path, project-folder name, source globs and selected config filename. With no config, say `default source globs`; for an empty list, say `(empty source list)`. Workspace rows say Next.js, Vite or library and the Tailwind major version, or `no Tailwind`. Quote paths containing spaces for the shell. An empty workspace still offers `npx plumber --root path/to/app`. Count apps with the singular for one.

Install and version problems:

```text
✗ Tailwind 4 is in package.json but not installed.
  → npm install
✗ Tailwind is not installed.
  → npm install
✗ React Plumber needs Tailwind 4; this project has 3.4.17.
  → upgrade: npx @tailwindcss/upgrade   (https://tailwindcss.com/docs/upgrade-guide)
! These classes look like Tailwind, but Tailwind isn't set up: p-[13px], flex, gap-4 (+41 more).
  → npm install tailwindcss @tailwindcss/vite, then @import "tailwindcss"; in your CSS entry
  Checking plain CSS only for now.
```

Use the declared major in the missing-installation message, and the resolved full version in the upgrade message. Detect npm, pnpm, yarn or bun from the nearest lockfile (including workspace parents); installation guidance never runs the package manager. The advisory lists up to three distinct authored utility classes, then the remaining count, and continues checking CSS. For pnpm/yarn/bun the advisory uses `add`. Do not report those utility classes as dead when Tailwind is absent. Unknown CSS class names still get normal existence checks. `doctor` keeps its diagnostic report and exit codes, with the same install/upgrade command and clean file errors.

Arguments:

```text
✗ Unknown command chek. Did you mean check?
✗ Unknown option --jsno. Did you mean --json?
✗ Unknown command {name}.
  → plumber --help
✗ Unknown option {flag}.
  → plumber --help
✗ Option --root needs a value.
  → plumber --help
✗ Option {flag} needs a valid value.
  → plumber --help
✗ Could not read these options.
  → plumber --help
✗ Unexpected arguments for plumber {command}.
  → plumber --help
```

Other usage errors keep their explanation below, prefixed with `✗`, followed by the listed command:

| Explanation | Next command |
| --- | --- |
| --family requires plumber decisions and a known family. | plumber decisions --help |
| plumber {command} prints text; remove --json. | plumber {command} |
| Serve uses JSON responses. Omit --json and --verbose. | plumber serve |
| --{flag} requires plumber {accepted commands}. | plumber {first accepted command} --help |
| --format supports dtcg for plumber parity. | plumber parity tokens.json --format dtcg |
| --format supports github. | plumber check --format github |
| Choose one of --json, --sarif, --agent, or --format github. | plumber check --json |
| Choose --json or --markdown. | plumber report --markdown |
| Provide a non-empty Git ref for --since. | plumber report --since HEAD |
| Provide a token export path for plumber parity. | plumber parity tokens.json |
| Choose --changed (HEAD) or --base. | plumber check --changed |
| --write requires install --overlay; omit --list. | plumber install --overlay --write |
| Install --overlay sets up host wiring only; omit --hooks, --ci and --agent. | plumber install --overlay |
| Use install --agent for selected agents and their hooks; --hooks installs both hooks only. | plumber install --hooks |
| Choose install --hooks for hooks only, or install --ci for agents, docs and CI. | plumber install --ci |
| Use plumber imitation --suggest to report candidate fingerprints. | plumber imitation --suggest |
| Provide a non-empty Git ref for --base. | plumber check --base HEAD |
| Provide a non-empty path for --{root/config/served-root}. | plumber --help |
| Choose --stdio or --port. | plumber serve --stdio |
| --served-root requires serve --overlay. | plumber serve --overlay |
| Serve --overlay requires HTTP; omit --stdio. | plumber serve --overlay |
| Port must be an integer from 0 to 65535. | plumber serve --port 0 |
| --lang must be tsx or css. | plumber try --lang tsx |
| Provide a non-empty path for --as. | plumber try --help |

Config, project files and adoption:

- `✗ Fix or create config {path}: {reason}` or `✗ Fix config {path}: {reason}`, then `→ ${EDITOR:-vi} "{path}"`. Preserve config validation explanations (invalid type, unknown key, allowed keys), but remove loader/errno prose.
- `✗ Set css to a readable .css file in plumber.config.ts: {path}.`, then an indented `{reason}`, then `→ ${EDITOR:-vi} plumber.config.ts`.
- `✗ Multiple Tailwind entry files: {files}; set css in plumber.config.ts to one of them.`, then the same editor command.
- `✗ Could not read package.json at {root}.`, then `The file is not valid JSON.` or a readable reason, then `→ plumber doctor --root "{root}"`.
- `✗ Could not read pnpm-workspace.yaml: {reason}`, then `→ ${EDITOR:-vi} pnpm-workspace.yaml`.
- `✗ Tailwind package.json has no version.`, then `→ {package manager} install`.
- `✗ Could not load project Tailwind from {folder}: {reason}`, then `→ plumber doctor`.
- `✗ Config already exists: {path}.`, then `Review the diff before replacing it.`, then `→ plumber init --force`.
- `✗ Init refuses new debt in an existing ledger.`, then `Fix new findings, or review them before recording debt.`, then `→ plumber baseline --force`.
- `✗ Unknown agent "{name}"; choose claude, cursor, codex, copilot, gemini, windsurf, generic.`, then `→ plumber install --list`.
- `✗ Invalid React Plumber markers in {file}; no install files changed.`, then `→ ${EDITOR:-vi} "{file}"`.
- Overlay refusal starts `✗ Overlay setup refused: {specific reason}`. Indent `No install files changed. Add this wiring manually:` and preserve the manual host-wiring code's line breaks.
- Other errors use the same `✗` boundary. Missing paths say `{path}: no such file or folder.`; permissions say `{path}: permission denied.`; a directory used as a file says `{path} is a folder; choose a file.`. Nested filesystem failures say `{path}: could not read this file or folder`; missing imports say `Could not load '{module}'`. Read-only files say `{path} is on a read-only filesystem.`; a full disk says `There is no disk space left to write this file.`; file limits say `Too many files are open. Close unused processes and try again.`; occupied ports say `The port is already in use.` then `→ plumber serve --port 0`. Keep frames out of CLI diagnostics; retain existing internal worker and health crash diagnostics.

Overlay installation's existing advisory is unchanged: `React is not installed. Add React to this development project to read and write source with the overlay. Plain CSS checks work without React.`

## Reasons quoted from tokens

A token's reason is shown only when it is about that token. A reason string attached to more than three tokens is a group description (MetalUI's `$use` is one per recipe), not a reason for this value: keep it in JSON as `groupWhy`, do not show it. Shown reasons are cut to the sentence that mentions the token or its amount, at most 72 characters.

## Suggestions

- Suggest a token only when using it would be right, not merely equal. Tokens a config marks as component-scoped (`decisions.<family>.suggest` globs; MetalUI excludes `--mu-r-*`) are never suggested to code outside that component, and an equal value that is only a component token is judged as a plain off-scale value.
- Suggest names (dead class, dead variable) only when they are close: same prefix, or normalised edit distance at most 0.34, and never for names under 4 characters.
- When nothing fits, say so and stop. Never suggest the nearest syntax.

## Per rule

`{…}` are values from the finding. Each title is a template; the examples are what MetalUI's docs produce.

### Existence

**existence/dead-class**
- Title: `` `{class}` does nothing: no CSS is generated for it ``
- Because: The style it was meant to apply is missing, and nothing warns you.
- Action: `` Did you mean `{a}` or `{b}`? `` when close names exist; else `` Remove it, or define `.{class}` in a stylesheet. ``
- Variant: declared only in a stylesheet nothing imports: `` `{class}` is defined in {file}, but nothing imports that file ``, action `` Import {file} where `{class}` is used, or move the rule. ``
- Example: `` `rounded-field` does nothing: no CSS is generated for it `` / ``Did you mean `rounded-field-regular-radius`?``

**existence/dead-var**
- Title: `` `var({name})` is never defined `` (with fallback: `` `var({name})` is never defined, so it always uses `{fallback}` ``)
- Because: The browser drops a declaration whose variable is undefined, so this {property} is not applied.
- Action: close names as above; else `` Define {name}, or use a token instead. ``

**existence/dynamic-class**
- Title: `` `{fragment}` is assembled at runtime, so Tailwind never generates it ``
- Because: Tailwind only generates classes it can read as complete strings in your source.
- Action: `` Map each value to a complete class, e.g. { a: '{prefix}a', b: '{prefix}b' }. ``

### Token families

Scale names: spacing scale, radius scale, type scale, motion tokens, shadow tokens, z-index layers, colour tokens.

**provenance/{family}** (value on no token)
- Title: `` {property} {amount} isn't on your {scale} `` for the scale families (spacing, radius, type), `` {property} {amount} isn't one of your {tokens} `` for the rest (motion tokens, shadow tokens, z-index layers), and `` `{value}` is a raw colour, not one of your colour tokens `` for colour. The property is the CSS property in plain form (`font-weight 500`, `z-index 2`, `transition .15s`); spacing amounts with units may drop it when the finding spans several properties (`10px isn't on your spacing scale`).
  A value that is a constant times a runtime number (`k * 13`, `` `${k * STAGGER}ms` ``) is judged by its step: `` {property} steps by {amount} × {multiplier}, and {amount} isn't on your {scale} ``, because "The step is the decision; the multiplier is runtime. A multiple of a token stays on the scale." Its fix writes the token as the step: `` `calc(var(--spacing-s3) * ${k})` ``.
- Because, by family:
  - spacing: Off-scale spacing makes layouts drift apart and can't be changed from the theme.
  - radius: Off-scale corners make surfaces look unrelated and can't be changed from the theme.
  - type: Sizes and weights off the type scale break the reading rhythm and can't be changed from the theme.
  - color: A raw colour won't follow theme or colour-scheme changes.
  - motion: A one-off duration or curve makes motion feel inconsistent and ignores the team's timing.
  - elevation: A hand-written shadow won't match the other surfaces or follow theme changes.
  - z: A raw z-index competes with every other layer; named layers keep stacking predictable.
- Do: choices (nearest tokens below and above, with amount and reason), per-site edit.
- Examples: `10px isn't on your spacing scale`, `font-weight 500 isn't on your type scale`, `z-index 2 isn't one of your z-index layers`.
- Choices: at most one token per amount (prefer the one with a utility), nearest below and above.

**provenance/{family}/by-value**
- Default severity: warn. Group once per family; title: `` {n} values in your {family} match tokens but don't use them `` (`n` is the physical-site count).
- List every site with its matching token and edit. Keep occurrences and authored ledger identities intact. Family token metadata is an inventory, not a choice list that can be applied to any site.
- `--verbose` or `decisions.<family>.byValue: 'each'` restores per-value findings, with title: `` {value} matches `{token}` but doesn't use it ``. `--agent` also expands them so each edit has its own matching token. Equal arbitrary literals use this rule too.
- Because: If the token changes, this copy stays behind.
- Do: `` Use `{utility}` or `var({token})`. ``

**provenance/{family}/framework**
- Title: `` `{class}` uses Tailwind's default {thing} (`{token}`), not your theme ``
- Because: Your theme defines its own {scale}; Tailwind's defaults sit outside it.
- Do: nearest project tokens, or the no-fit line.

**provenance/{family}/tier**
- Title: `` `{token}` is a raw {family} token; use a named one ``
- Because: A named token says what a value is for, so it changes with the design; a raw one doesn't.
- Do: the named tokens built on it, with their reasons.

**provenance/arbitrary**
- Title: `` `{class}` hardcodes {amount} `` followed by the family judgement in Because ("…isn't on your spacing scale").
- Because: as the family.

**provenance/opaque-inline** (info)
- Title: `` This {property} is computed at runtime, so it can't be checked ``
- Because: React Plumber reads source, not running values.
- Action: Pass the number through a CSS variable and set {property} from a class or stylesheet.
- Grouped per file: one finding per file with a site count, not one per property.

**No tokens in a family** (config gap, replaces per-value findings)
- Rule: `config/no-tokens`, severity warn, one finding per family.
- Title: `` Your theme has no {family} tokens, so {n} {property} value(s) can't be checked ``
- Because: React Plumber judges values against the tokens your theme declares.
- Action: Add {family} tokens to your theme, or point `decisions.{family}.from` in plumber.config.ts at where they live.

**No token fits** (a family has tokens, none near)
- Do line: `` No token is close to {amount}. Pick one with the design owner, or add one to the theme. ``
- Elevation with no semantic shadow tier: `` No tokens fit: your theme has no named shadow tokens. Pick one with the design owner, or add one to the theme. `` Show once per finding; no repeated NEEDS-DECISION wording.
- Type context: explain that individual type values are checked and give a supported `decisions.type.from` selector. The planned `utility:type-*` reader is not implemented; do not suggest it as a working fix.

### Habits

Title names the code and the effect; Because is the habit's reason; Do is the habit's fix.

- hover-gate: `` `{class or selector}` also applies on touch screens `` · Touch can leave a hover style stuck after a tap. · `` Use `pointer-hover:` (or wrap the rule in @media (hover: hover) and (pointer: fine)). ``
- focus-outline: `` `{class}` removes the focus outline on {owner} `` · Keyboard users lose track of focus, and forced-colors mode shows nothing. · Restore an outline on :focus-visible.
- logical-inline: `` `{class or property}` is a physical side `` · It doesn't mirror in right-to-left layouts. · `` Use `{logical}`. ``
- viewport-dynamic: `` `{value}` uses vh, which jumps on mobile `` · Mobile toolbars change the viewport height. · Use dvh for a changing viewport, svh for the smallest, lvh for the largest.
- overflow-clip: `` `overflow-hidden` on {owner} creates a scroll container `` · It breaks position: sticky inside and still allows script scrolling. · Use overflow-clip if nothing scrolls it.
- overscroll-contain: `` {owner} scrolls, and its scroll leaks to the page `` · Reaching its edge scrolls the page behind it. · Add overscroll-contain.
- transition-named, no-ease-in, safe-area-fallback: same shape from the habit's reason.
- Custom habits: Title = `` `{site}` breaks {habit id} ``, Because = the habit's message.

Focus-outline judges actual outline suppression. A visible focus-visible/focus-within ring, or a ring utility on the same element, is a valid companion. Zero/transparent rings, pseudo-elements, other elements, conditional branches and narrower media do not certify the base. Setting box-shadow alone does not remove an outline.

Logical-inline judges physical sides that would change under RTL. Equal left/right companions under the same element/state/media are symmetric and pass, including px/mx/inset-x. Positive direction-specific selectors pass; negated, descendant or unrestricted alternative direction selectors do not prove direction. Asymmetric sides, left/right text-align, float and clear remain checked.

`init` proposes only hover-gate, focus-outline, transition-named and no-ease-in. Other habits remain explicit opt-ins.

### Components

**ownership/{Component}**
- Title: `` `{class}` changes {Component}'s {property} `` for class and inline sites, `` `{selector}` sets {Component}'s {property} `` for stylesheet sites
- Because: {Component} controls its {family name: colour, type, corners, shadow, padding}; outside overrides break when its design changes.
- Do: `` Use a variant: {axis} = {values}; {axis} = {values}. `` or, with no variants, `` {Component} has no variant for this. Ask for one, or wrap it in an element you style. `` Then `` Defined in {relative path}:{line}. ``
- Heuristic descendant selectors: Title ends with "(may apply)", severity warn.

**imitation/{Component}**
- Title: `` This <{tag}> rebuilds {Component} by hand (`{fingerprint}`) ``
- Because: A copy misses {Component}'s states, focus ring and future fixes.
- Do: `` Use <{Component}> from {import source}. ``

### Dead tokens (info)

**dead/{family}**
- Title: `` {n} {family} tokens are never used in your source `` (name the source globs only in `--verbose`)
- Because: Unused tokens make the theme harder to choose from.
- Action: `` If other apps use them, mark them published: decisions.{family}.exported: true. Otherwise remove them. ``

### Ledger and decisions

- ledger/no-why: `` Exception `{key}` has no reason `` · Every exception needs a reason a reviewer can check. · `` plumber accept {key} --why "…" ``
- ledger/grew: `` This change adds {n} ledger entries `` · New exceptions and tokens are design decisions and need review.
- decisions/unaccepted: `` `{token}` is new in your theme and not yet accepted `` · New tokens change what everyone may use. · `` plumber accept-decisions --why "…" `` (an agent reports it instead).

## Text layout

```
10px isn't on your spacing scale                           70 sites
  Off-scale spacing makes layouts drift apart and can't be changed from the theme.
  use  8px   mu-space-8   var(--spacing-mu-space-8)
       12px  mu-related   var(--spacing-mu-related)   Related content uses 12
  apps/docs/src/blocks/ai-composer/ai-composer.tsx:119:76  py-10
  …
  intended? plumber accept 3fa9… --why "…"
```

The rule id is shown with `--verbose`. Findings are ordered errors first, then by site count.
