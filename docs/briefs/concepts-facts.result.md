## Findings

Recordings use the existing CLI build: `node dist/cli.js check --root fixtures/docs-judged` and the same command with `--json`, both exit 1. The recorded case is `provenance/arbitrary`, authored `gap-[13px]` at `src/Judged.tsx:6:23`. Evidence: `site/src/docs/recordings/finding.json:5-17`, `site/src/docs/recordings/finding.json:53-68`; fixture: `fixtures/docs-judged/src/Judged.tsx:6`.

### Printed parts and their JSON fields

| Part | Text behavior | JSON behind it | Evidence |
|---|---|---|---|
| Title | Title, physical-site count; `--verbose` adds `[rule]`. Falls back to `why` without a trailing period when title is empty. | `title`, `sites.length`, `rule`, fallback `why` | `src/report.ts:163-166` |
| Because | Indented reason, omitted when empty or identical to title. | `because`; compatibility `why` is normalized to `because`. | `src/report.ts:167-168`, `src/messages.ts:40-45` |
| Fix choices | One row per token: resolved amount (or raw value), utility suffix, CSS value/reference, shortened token reason. First row begins `use`. | `choices`, falling back to `decisions` only when absent; each token has `resolved`, `value`, `name`, `use.class`, `use.css`, `why`. | `src/report.ts:169-181` |
| Fix instruction | When there are no choices, prints the plain action instead. | `action`, falling back to compatibility `fix`. | `src/report.ts:182-185` |
| Edit | Separate edit rows in ordinary text: **not supported**. This recording has two exact replacement instructions in JSON, one for each choice. Grouped by-value findings are an exception: their action embeds per-site edit lines. | `edits[]`: `site`, `text`, optional `token`. | `src/report.ts:163-194`, `src/rules/provenance.ts:323-329`, `src/rules/provenance.ts:398-405` |
| Site | Relative `file:line:column`, followed by authored text. At most five sites, then a remainder line directing readers to `--json`. | `sites[]`: `file`, `line`, `column`, `text`; optional `anchor`, `inScope`, `ledger`. | `src/report.ts:13-24`, `src/report.ts:186-189` |
| Accept | `intended?` followed by the reasoned exception command. Omitted for info findings or empty acceptance commands. Multi-site findings use `<file:line>` as the site placeholder. | `accept`, `severity`, `sites.length`; ordinary commands are generated from rule and first site. Config findings have no accept command. | `src/report.ts:190-193`, `src/messages.ts:47-50` |

The JSON finding also retains its fix-group `key`, `family`, `severity`, representative `declaration`, token metadata `decisions`, exact grouped `occurrences`, optional `variable`/`component`, overall `status`, and authored `ledgerKeys`. A report's fix-group key is different from a site's authored acceptance key. Evidence: `src/report.ts:70-95`, `src/ledger/keys.ts:49-73`.

`why` is the reason; `fix` is action text when present, otherwise initially assembled choice text. `choices` represents usable alternatives; `decisions` can retain metadata that is not a choice list. Evidence: `src/messages.ts:16-20`, `src/messages.ts:40-46`, `src/report.ts:75-78`, `src/rules/provenance.ts:398-405`.

The message contract specifies four parts and token vocabulary. One measurable discrepancy: token reasons are documented as at most 100 characters, but the current formatter caps them at 72, chooses one relevant sentence, and removes its trailing period. Evidence: `docs/MESSAGES.md:5-14`, `docs/MESSAGES.md:18-36`, `src/report.ts:146-157`.

### Exact recorded finding

The following block is extracted from real CLI stdout; it is not reconstructed from JSON. `finding.json` stores the same substring including its final newline, one numbered mapping per printed line (`title`, `because`, `fix`, `site`, `accept`), `unprintedParts: ["edit"]`, and the unchanged JSON finding object, including absolute file paths. ANSI/control escapes alone are stripped. Evidence: `scripts/docs/record-finding.mjs:17-44`, `site/src/docs/recordings/finding.json:17-53`.

```text
`gap-[13px]` hardcodes 13px  1 site
  Off-scale spacing makes layouts drift apart and can't be changed from the theme.
  use  12px  3  var(--spacing-3)  Separate a label from its control
       16px  4  var(--spacing-4)  Give a group breathing room
  src/Judged.tsx:6:23  gap-[13px]
  intended?  plumb accept --rule provenance/arbitrary --site src/Judged.tsx:6 --why "…"
```

Regenerate using `node scripts/docs/record-finding.mjs`; the script runs both CLI modes with an isolated temporary cache and validates the extracted text before writing the recording. Evidence: `scripts/docs/record-finding.mjs:1-26`, `scripts/docs/record-finding.mjs:28-47`.

### Severity, grouping, verbose, status

- Severities are `error`, `warn`, `info`. Adopted/configured `check` exits 1 if any resulting finding is error, otherwise 0; warning and informational findings alone do not fail. First-run `check` with neither config nor ledger exits 0 even when findings include errors. CLI usage/runtime failures exit 2. Evidence: `src/report.ts:82`, `src/cli.ts:181-184`, `src/cli.ts:309-314`.
- Provenance groups matching rule/family/amount, with additional property identity for off-scale families other than spacing/color, and definition identity for custom-property findings. It retains every occurrence, deduplicates physical sites and choice/site edits, and can combine spacing properties at the same amount. Grouping every equal amount across all rules is **not supported**. Evidence: `src/rules/provenance.ts:274-276`, `src/rules/provenance.ts:303-338`.
- Default by-value presentation combines matches into one warning per family, retains per-site matching tokens and edits, and explicitly exposes `choices: []`. `--verbose`, `--agent`, or `decisions.<family>.byValue: 'each'` expands these into individual value findings. Evidence: `src/rules/provenance.ts:358-369`, `src/rules/provenance.ts:394-405`, `src/cli.ts:130-132`.
- Normal text hides fully recorded findings, dead-token findings and opaque runtime-inline findings, showing summary lines instead. `--verbose` shows these, parser/entry diagnostics, rule IDs, declaration/stylesheet/module/cache/timing details and notes. It still shows only five sites per finding; “verbose prints every site/edit” is **not supported**. Findings sort by severity, descending site count, then rule ID. Evidence: `src/report.ts:186-189`, `src/report.ts:203-251`.
- Site ledger statuses are `new`, `debt`, `exception`, with a saved `why` on covered sites. Overall finding status is `new` if any site is new, otherwise `debt` if any is debt, otherwise `exception`; fully covered or entirely out-of-scope new groups become info. Mixed acceptance does not split the fix group. The type permits `out-of-scope` as a finding status, but this check implementation does not assign it: scope is `site.inScope` plus `ledger.outOfScope`. Evidence: `src/report.ts:23`, `src/report.ts:92`, `src/ledger/check.ts:54-99`.

## The ledger

### Entries and keys

`.plumb/ledger.jsonl` is one JSON entry per nonblank line, with unique nonempty `key` and `kind: 'debt' | 'exception' | 'decision'`. “baseline” is a command, **not supported** as an entry kind. A present `count` must be a positive safe integer; omitted count means one. Writes sort by key, validate, then atomically rename a temporary file over the ledger. Evidence: `src/ledger/types.ts:3-23`, `src/ledger/store.ts:6-25`, `src/ledger/store.ts:32-41`.

| Kind | Recorded content | Evidence |
|---|---|---|
| Debt | Existing finding identity plus allowed physical-site `count`, resolved value, rule, family, owner, property, normalized authored text, relative path, anchor; CLI attribution adds `on` and optional Git `by`. | `src/ledger/keys.ts:49-71`, `src/ledger/commands.ts:18-20`, `src/ledger/commands.ts:80-88` |
| Exception | Same current finding identity/count, kind changed to exception, required nonblank `why`, date and optional author. | `src/ledger/commands.ts:92-102` |
| Decision | `decision:<family>:<name>` snapshot with family, value, refs, origin, tier, optional resolved value, attribution/reason and optional `inferred`. Framework decisions are excluded from acceptance. | `src/ledger/keys.ts:12-19`, `src/ledger/commands.ts:22-32` |

Authored finding keys are `<rule>:<owner>:<property>:<normalized authored text>@<relative path>#<anchor>`. Normalization removes quote/backtick characters, collapses whitespace and trims. Missing anchor becomes `<module>`. Line/column changes alone do not change this key; file, anchor, owner, property and authored text do. Physical occurrences sharing it are counted, so another matching occurrence can exceed the allowance. Evidence: `src/ledger/keys.ts:5`, `src/ledger/keys.ts:49-71`, `src/ledger/check.ts:56-67`.

### Baseline, check, acceptance and ratchet

- First `baseline` records current finding groups as debt and accepts current non-framework decisions with `inferred: true`. Subsequent baseline retains exceptions, replaces remaining debt with current counts and refuses new/larger debt unless `--force` is supplied (apart from the initial pending-baseline allowance). Evidence: `src/ledger/commands.ts:80-88`, `src/ledger/commands.ts:22-32`.
- `init` infers token sources, proposes configuration and four default habits, validates it, records existing findings as debt, and accepts decisions as inferred. Existing config requires `init --force`; even then, an existing ledger rejects new/increased debt. This is more than an empty-ledger initializer. Evidence: `src/adoption/init.ts:18`, `src/adoption/init.ts:68-85`, `src/adoption/init.ts:104-129`.
- `check` compares current authored groups with recorded keys and counts. Covered sites become debt or exceptions; missing keys and count overflow remain new. Known groups become informational; new in-scope sites keep the rule's severity. “known” is a terminal presentation category, **not supported** as a separate ledger kind/status. Evidence: `src/ledger/check.ts:56-99`, `src/report.ts:208-228`.
- Decision snapshots compare value, origin, tier and refs. New/changed unaccepted decisions produce error `decisions/unaccepted`; removed accepted decisions produce warning `decisions/vanished`. Exception entries lacking a nonblank reason produce error `ledger/no-why`. Evidence: `src/ledger/check.ts:33-52`.
- `check` computes current debt but does not rewrite stored allowances. `ledger --ratchet` lowers each debt count to `min(old, current)` and removes zero-count debt; exceptions and decisions stay intact. “Debt can only fall” describes this operation and ordinary baseline adoption, not an absolute ban on manual edits or `baseline --force`. Growth enforcement additionally requires Git comparison. Evidence: `src/ledger/check.ts:23-30`, `src/ledger/check.ts:128-134`, `src/ledger/commands.ts:80-88`, `src/ledger/commands.ts:129-139`.
- `accept --rule <rule> --site <file:line> --why "reason"` uses a one-based line and selects current authored key groups matching that rule/site; `<key>` is an alternative. Both forms together are invalid. Acceptance writes the whole selected group's count, not merely the clicked physical occurrence, and replaces matching debt with an exception. Blank reasons or unmatched selectors fail as usage errors. On first adoption it also snapshots decisions. Evidence: `src/ledger/commands.ts:34-37`, `src/ledger/commands.ts:92-102`, `src/cli.ts:309-314`.
- `ledger --prune` removes nondecision entries whose keys no longer match any current finding, and decision entries whose decision keys disappeared. It does not reduce a surviving entry's excess count; use `--ratchet` for that. Stale debt produces warning `ledger/stale` and increments stale by missing sites. Vanished decisions have their separate warning; missing exceptions are prunable but do not contribute to the current `stale` counter. Evidence: `src/ledger/commands.ts:129-135`, `src/ledger/check.ts:33-52`.

### Git scope and CI growth gating

- `check --base <ref>` scopes new-site failure to changed files (including uncommitted and untracked files), not changed lines. Other sites remain in JSON and fix groups; uncovered sites outside scope count in `ledger.outOfScope`, and groups without new in-scope sites become info. Evidence: `src/ledger/git.ts:15-34`, `src/ledger/check.ts:29`, `src/ledger/check.ts:56-99`.
- Base comparison reads the committed ledger at that ref. A new key or changed kind is growth; larger debt counts are growth; exception/decision entries compare all their sorted fields, so metadata changes can count. Debt growth is error; exception/decision growth is info for later review gating. Shrink/removal does not count as growth. Evidence: `src/ledger/git.ts:26-28`, `src/ledger/check.ts:17-21`, `src/ledger/check.ts:109-118`.
- `check --strict-ledger` compares ledger against `HEAD` and makes every growth diagnostic error. It also checks added nonblank trimmed config lines against a multiset of HEAD lines; this is textual growth detection, not semantic configuration comparison. Ordinary drift scope remains project-wide unless a base/changed scope is also supplied. Evidence: `src/ledger/check.ts:29`, `src/ledger/check.ts:109-124`, `src/ledger/git.ts:36-53`.
- The GitHub Action invokes `check --base`, renders GitHub output and obtains JSON. When ledger/config growth is reported on a PR, the approval gate accepts a configured approver author or a configured approver's latest decisive approval. Later dismissal/changes-requested cancels that approval; comments do not. Missing approval fails CI. Approval does not override error findings/debt-growth failure. No growth needs no approval. Evidence: `scripts/action/run.mjs:15-31`, `scripts/action/run.mjs:53-63`, `scripts/action/approval.mjs:5-15`, `action.yml:12-15`.

### Real copy-only sequence

`scripts/docs/record-ledger.mjs` copies `fixtures/docs-judged` into a temporary directory, links existing dependencies, initializes Git without commits and runs the existing CLI with an isolated cache. It records exact commands, exit codes, stdout/stderr, extracted summary lines, stored entry counts by kind, stored site allowances and ledger snapshots. It cleans up the copy afterward. Evidence: `scripts/docs/record-ledger.mjs:11-43`, `scripts/docs/record-ledger.mjs:44-75`.

The table is projected from those actual runs. Entry counts mean stored rows; check summary numbers mean currently matched sites. Seven initial debt entries include the off-token findings and dead-token findings, not only visible error findings. Fixing the old arbitrary site leaves the new error unresolved, so that check still exits 1; `--ratchet` persists the reduction before reasoned acceptance. Evidence: `site/src/docs/recordings/ledger.json:48-67`, `site/src/docs/recordings/ledger.json:1005-1025`, `site/src/docs/recordings/ledger.json:1198-1216`, `src/ledger/keys.ts:31-32`.

| Step | Exit | Stored entries: debt / exception / decision | Exact CLI summary lines | Evidence |
|---|---:|---|---|---|
| git-init | 0 | 0 / 0 / 0 | No summary output | `site/src/docs/recordings/ledger.json:10` |
| git-author | 0 | 0 / 0 / 0 | No summary output | `site/src/docs/recordings/ledger.json:29` |
| baseline | 0 | 7 / 0 / 4 | `Baseline recorded 7 debt entries (7 sites).` | `site/src/docs/recordings/ledger.json:48` |
| check-baseline | 0 | 7 / 0 / 4 | `no new findings`<br>`known       3 findings at 7 sites are recorded in the ledger (--verbose lists them)`<br>`ledger  0 new, 7 debt, 0 exception sites; 0 stale, 0 ledger/config growth.` | `site/src/docs/recordings/ledger.json:239` |
| add-new-drift | 0 | 7 / 0 / 4 | No summary output | `site/src/docs/recordings/ledger.json:432` |
| check-new-drift | 1 | 7 / 0 / 4 | `known       3 findings at 7 sites are recorded in the ledger (--verbose lists them)`<br>`1 finding: 1 value off your tokens`<br>`ledger  1 new, 7 debt, 0 exception sites; 0 stale, 0 ledger/config growth.` | `site/src/docs/recordings/ledger.json:622` |
| fix-old-drift | 0 | 7 / 0 / 4 | No summary output | `site/src/docs/recordings/ledger.json:815` |
| check-debt-falls | 1 | 7 / 0 / 4 | `known       2 findings at 6 sites are recorded in the ledger (--verbose lists them)`<br>`2 findings: 1 value off your tokens, 1 ledger or token change`<br>`ledger  1 new, 6 debt, 0 exception sites; 1 stale, 0 ledger/config growth.` | `site/src/docs/recordings/ledger.json:1005` |
| ratchet | 0 | 6 / 0 / 4 | `Ledger has 10 entries.` | `site/src/docs/recordings/ledger.json:1198` |
| accept-new-drift | 0 | 6 / 1 / 4 | `Accepted 1 exception entries: provenance/arbitrary:div:gap:gap-[14px]@src/Judged.tsx#NewDrift.` | `site/src/docs/recordings/ledger.json:1374` |
| check-after-accept | 0 | 6 / 1 / 4 | `no new findings`<br>`known       3 findings at 7 sites are recorded in the ledger (--verbose lists them)`<br>`ledger  0 new, 6 debt, 1 exception sites; 0 stale, 0 ledger/config growth.` | `site/src/docs/recordings/ledger.json:1566` |

Regenerate with `node scripts/docs/record-ledger.mjs`; the final recorded check exits 0 with zero new sites, six debt sites and one exception site. Evidence: `scripts/docs/record-ledger.mjs:1`, `site/src/docs/recordings/ledger.json:1566-1585`.

## Habits

Habits judge how declarations are written and conditioned, rather than whether their amounts belong to a token scale. They run on collected source-glob declarations and their element/selector/condition context, not the computed browser cascade. Built-ins skip opaque declarations and keyframes; custom predicates skip opaque declarations but may target keyframes. Evidence: `src/index.ts:139-142`, `src/index.ts:173-178`, `src/habits/index.ts:55-68`, `src/habits/index.ts:100-180`, `src/habits/index.ts:184`.

### Existing IDs, configuration and defaults

Each built-in is enabled by its string ID in `habits: [...]`; emitted rules use `habits/<id>`. Built-in severity/message overrides through an object with the same ID are **not supported**: those IDs are reserved. With no habits and no preset contribution, checks run no habit predicates; an empty project array explicitly disables preset habits. `init` proposes only `hover-gate`, `focus-outline`, `transition-named`, `no-ease-in`; all others require opt-in. Evidence: `src/config.ts:47`, `src/habits/index.ts:26-35`, `src/habits/index.ts:56-59`, `src/habits/index.ts:97`, `src/presets/index.ts:259-262`, `src/adoption/init.ts:18`, `docs/MESSAGES.md:140`.

| Config ID / emitted rule suffix | Severity | What triggers it | Evidence |
|---|---|---|---|
| `hover-gate` | error | Positive hover without a media gate proving both hover capability and fine pointer. Class edits use a compiler-proven gated variant or supply custom-variant syntax. | `src/habits/index.ts:13`, `src/habits/index.ts:112-122` |
| `focus-outline` | error | Outline suppression without a qualifying visible outline/ring companion on the same target/context. | `src/habits/index.ts:14`, `src/habits/index.ts:71-82`, `src/habits/index.ts:124-131` |
| `transition-named` | error | `all` in transition or transition-property. | `src/habits/index.ts:15`, `src/habits/index.ts:134` |
| `no-ease-in` | error | `ease-in` in transition/animation properties, including shorthands. | `src/habits/index.ts:16`, `src/habits/index.ts:135` |
| `logical-inline` | error | Physical sides, left/right alignment or asymmetric four-side shorthands; centered positions, equal side companions and proven directional selectors have exemptions. | `src/habits/index.ts:17`, `src/habits/index.ts:136-153` |
| `viewport-dynamic` | error | Numeric `vh` or `vw` in authored values. | `src/habits/index.ts:18`, `src/habits/index.ts:155` |
| `safe-area-fallback` | error | Safe-area `env()` call without a fallback. | `src/habits/index.ts:19`, `src/habits/index.ts:156` |
| `overflow-clip` | warn | Decorative overflow-hidden with a radius/clip/mask/pseudo-element indication, without detected scrolling/truncation/layout-animation/opaque semantics. It does not flag every overflow-hidden. | `src/habits/index.ts:20`, `src/habits/index.ts:157-162` |
| `overscroll-contain` | warn | Auto/scroll overflow without contain/none on every scrolling axis; considers logical axes and writing mode. | `src/habits/index.ts:21`, `src/habits/index.ts:164-176` |

`z-named` and `motion-tokens` are accepted reserved compatibility strings, but standalone `habits/z-named` and `habits/motion-tokens` findings, messages, severities and listing entries are **not supported**. They are excluded from the active habit set and are not in the nine built-in definitions. Z and motion value checks belong to provenance, independent of these strings. Evidence: `src/habits/index.ts:12-22`, `src/habits/index.ts:32-33`, `src/habits/index.ts:58`, `src/habits/index.ts:185`, `src/rules/provenance.ts:364-369`.

Custom IDs are open-ended lowercase strings matching `^[a-z][a-z0-9_-]*$`, unique within the config and distinct from reserved built-ins. Configure `{ id, when, message, severity? }`; default severity is error. Predicates combine property glob, value regex source, origin(s), owner glob/object or ownerElements, and nested `when.has`/`when.lacks` regexes for media/pseudo/selector. Callbacks and unknown fields are rejected. Fixture-only IDs are `no-fixed-heights-on-text` (warn) and `pseudo-media` (info), not additional built-ins. Evidence: `src/habits/predicates.ts:5-16`, `src/habits/predicates.ts:20-71`, `src/habits/index.ts:26-35`, `src/habits/index.ts:184-186`, `fixtures/habits/plumb.config.ts:3-5`.

`plumb habits` evaluates all nine built-ins for inspection, reports ID/break-count/severity/enabled/reason and exits 0 without an error-based exit assignment. It does not evaluate custom predicates in listing mode. Normal report summaries use `breaks: null` for unevaluated disabled built-ins; custom evaluated summaries are appended. Evidence: `src/habits/index.ts:56-59`, `src/habits/index.ts:84`, `src/habits/index.ts:185-186`, `src/cli.ts:248-249`, `src/cli.ts:265-267`.

### Messages and real examples

The contract says title names authored code/effect, because supplies the habit reason, and action supplies the fix; it defines specific templates for hover, focus, logical sides, viewport, overflow and overscroll, plus the generic custom template. Actual reason/fix definitions and emitted message templates are in the implementation. Evidence: `docs/MESSAGES.md:123-140`, `src/habits/index.ts:12-22`, `src/habits/index.ts:200-212`.

Below, one complete finding per implemented built-in and each fixture custom ID was extracted from real `node dist/cli.js check --root fixtures/habits` stdout (exit 1), paired with that run's `--json` finding by rule/title/site. Blocks retain the actual title, because, action, site and acceptance line (info omits acceptance). Source configuration and message behavior: `fixtures/habits/plumb.config.ts:1-6`, `src/habits/index.ts:87-98`, `src/habits/index.ts:200-212`, `src/report.ts:163-194`, `src/cli.ts:181-184`.

#### `habits/hover-gate`

Fixture: `fixtures/habits/src/styles.css:1`; rule/message: `src/habits/index.ts:12-22`, `src/habits/index.ts:200-212`.

```text
`.ungated:hover` also applies on touch screens  1 site
  Touch can leave a hover style stuck after a tap.
  Use `pointer-hover:` (or wrap the rule in @media (hover: hover) and (pointer: fine)).
  src/styles.css:1:18  color: red
  intended?  plumb accept --rule habits/hover-gate --site src/styles.css:1 --why "…"
```

#### `habits/focus-outline`

Fixture: `fixtures/habits/src/styles.css:15`; rule/message: `src/habits/index.ts:12-22`, `src/habits/index.ts:200-212`.

```text
`outline` removes the focus outline on .removed  1 site
  Keyboard users lose track of focus, and forced-colors mode shows nothing.
  Restore an outline on :focus-visible.
  src/styles.css:15:12  outline: none
  intended?  plumb accept --rule habits/focus-outline --site src/styles.css:15 --why "…"
```

#### `habits/transition-named`

Fixture: `fixtures/habits/src/styles.css:21`; rule/message: `src/habits/index.ts:12-22`, `src/habits/index.ts:200-212`.

```text
`.transitions` transitions every property  1 site
  Name the properties that transition so an unrelated change does not start animating.
  Replace all with the specific properties that should transition.
  src/styles.css:21:16  transition: all 1s ease-in
  intended?  plumb accept --rule habits/transition-named --site src/styles.css:21 --why "…"
```

#### `habits/no-ease-in`

Fixture: `fixtures/habits/src/styles.css:21`; rule/message: `src/habits/index.ts:12-22`, `src/habits/index.ts:200-212`.

```text
`.transitions` starts feedback slowly with ease-in  1 site
  Feedback to a person’s hand should begin immediately, without a slow start.
  Use the project’s responsive easing decision instead of ease-in.
  src/styles.css:21:16  transition: all 1s ease-in
  intended?  plumb accept --rule habits/no-ease-in --site src/styles.css:21 --why "…"
```

#### `habits/logical-inline`

Fixture: `fixtures/habits/src/styles.css:23`; rule/message: `src/habits/index.ts:12-22`, `src/habits/index.ts:200-212`.

```text
`left` is a physical side  1 site
  It doesn't mirror in right-to-left layouts.
  Use `inset-inline-start`.
  src/styles.css:23:13  left: 10px
  intended?  plumb accept --rule habits/logical-inline --site src/styles.css:23 --why "…"
```

#### `habits/viewport-dynamic`

Fixture: `fixtures/habits/src/styles.css:25`; rule/message: `src/habits/index.ts:12-22`, `src/habits/index.ts:200-212`.

```text
`calc(100vh - 2px)` uses vh, which jumps on mobile  1 site
  Mobile toolbars change the viewport height.
  Use dvh for a changing viewport, svh for the smallest, lvh for the largest.
  src/styles.css:25:13  height: calc(100vh - 2px)
  intended?  plumb accept --rule habits/viewport-dynamic --site src/styles.css:25 --why "…"
```

#### `habits/safe-area-fallback`

Fixture: `fixtures/habits/src/styles.css:27`; rule/message: `src/habits/index.ts:12-22`, `src/habits/index.ts:200-212`.

```text
`env(safe-area-inset-top)` has no safe-area fallback  1 site
  A safe-area environment variable needs a fallback so unavailable insets cannot invalidate the declaration.
  Add a fallback: env(safe-area-inset-*, 0px), alongside the element’s own spacing.
  src/styles.css:27:9  padding: env(safe-area-inset-top)
  intended?  plumb accept --rule habits/safe-area-fallback --site src/styles.css:27 --why "…"
```

#### `habits/overflow-clip`

Fixture: `fixtures/habits/src/styles.css:29`; rule/message: `src/habits/index.ts:12-22`, `src/habits/index.ts:200-212`.

```text
`overflow-hidden` on .decor creates a scroll container  1 site
  It breaks position: sticky inside and still allows script scrolling.
  Use overflow-clip if nothing scrolls it.
  src/styles.css:29:10  overflow: hidden
  intended?  plumb accept --rule habits/overflow-clip --site src/styles.css:29 --why "…"
```

#### `habits/overscroll-contain`

Fixture: `fixtures/habits/src/styles.css:30`; rule/message: `src/habits/index.ts:12-22`, `src/habits/index.ts:200-212`.

```text
.scroll scrolls, and its scroll leaks to the page  1 site
  Reaching its edge scrolls the page behind it.
  Add overscroll-contain.
  src/styles.css:30:11  overflow-y: auto
  intended?  plumb accept --rule habits/overscroll-contain --site src/styles.css:30 --why "…"
```

#### `habits/no-fixed-heights-on-text`

Fixture: `fixtures/habits/src/App.tsx:1`; rule/message: `src/habits/index.ts:12-22`, `src/habits/index.ts:200-212`; custom config: `fixtures/habits/plumb.config.ts:4-5`.

```text
`height: '12px'` breaks no-fixed-heights-on-text  1 site
  Text must grow with its content.
  Text must grow with its content.
  src/App.tsx:1:13  height: '12px'
  intended?  plumb accept --rule habits/no-fixed-heights-on-text --site src/App.tsx:1 --why "…"
```

#### `habits/pseudo-media`

Fixture: `fixtures/habits/src/styles.css:1`; rule/message: `src/habits/index.ts:12-22`, `src/habits/index.ts:200-212`; custom config: `fixtures/habits/plumb.config.ts:4-5`.

```text
`color: red` breaks pseudo-media  1 site
  Custom predicate matched.
  Custom predicate matched.
  src/styles.css:1:18  color: red
```
