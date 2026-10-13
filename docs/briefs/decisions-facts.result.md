# Decisions: code facts and recording

## 1. Model, by family

A decision is a named token record: `family`, `name`, authored `value`, identity `refs`, `origin` (`project`, `framework`, `inferred`), `tier` (`primitive`, `semantic`), `why`, source file/line, optional static `resolved` and `exported`. Same-family aliases become semantic unless tier is explicit; literals default to primitive. Reasons are metadata, not an admission requirement. (`src/report.ts:53-68`, `src/decisions/record.ts:7-13`, `src/decisions/index.ts:125-134`)

Automatic CSS namespaces and the properties judged against them:

- **Spacing:** `--spacing-*`; padding, margin, gap, inset/position, scroll padding/margin. Bare `--spacing` is a special numeric unit, excluded from decision records. (`src/decisions/index.ts:26,54`, `src/rules/families.ts:9-14`, `src/decisions/spacing.ts:10-21`)
- **Colour** (`color` in code/config): `--color-*`; text, backgrounds, borders, outlines, decoration, fill/stroke, caret/accent, and colours inside shadows/rings. (`src/decisions/index.ts:27`, `src/rules/families.ts:15-16`)
- **Radius:** `--radius-*`; border radius and corners. (`src/decisions/index.ts:28`, `src/rules/families.ts:17`)
- **Type:** `--text-*`, `--font-*`, `--leading-*`, `--tracking-*`, `--default-font-*`, `--default-mono-font-*`; font family/size/weight, line height, tracking. Type-role companion declarations are separate records, not one combined ramp. (`src/decisions/index.ts:29,79-83`, `src/rules/families.ts:18`, `site/src/styles.css:223-249`)
- **Motion:** `--ease-*`, `--animate-*`, `--duration-*`, `--default-transition-*`; transition/animation duration, delay and easing. Additional named variables can be inferred from single time/easing values in eligible theme scopes, in the entry's import closure; arbitrary component recipes are excluded from that inference. (`src/decisions/index.ts:30,113-118`, `src/rules/families.ts:19`, `src/decisions/motion.ts:6-23`)
- **Elevation:** `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`; elevation judgement examines `box-shadow`. Recognition does not imply every shadow namespace has an elevation property check. (`src/decisions/index.ts:31`, `src/rules/families.ts:20`)
- **Z:** `--z-*`; `z-index`. Recognition by Plumb does not guarantee a named Tailwind utility compiles. (`src/decisions/index.ts:32`, `src/rules/families.ts:21`, `scripts/docs/record-decisions.mjs:45-50`)

`size` and `opacity` also exist in inventory/config, but are outside the seven judged families above. (`src/report.ts:9`, `src/decisions/index.ts:33-34`, `src/rules/families.ts:7`)

## 2. Sources, precedence, defaults

- **Compiler theme:** Plumb loads the project's Tailwind v4 installation and reads its resolved theme entries; source CSS supplies origin, reason and location. It does not ship a separate Plumb scale. (`src/lower/tailwind.ts:92-94,150,184`, `src/decisions/index.ts:79-83`)
- **CSS outside `@theme`:** recognized project `:root`/`html` variables are selected automatically when that family has no config entry; configured selectors can select them too. Additional eligible motion variables use the inference described above. (`src/decisions/css.ts:69-71`, `src/decisions/index.ts:85-90,113-118`)
- **`decisions.<family>.from`:** string/string array selectors: `theme:--name-*`, CSS path globs (optional `css:` prefix), optional `#--token-*` fragment, or `dtcg:path/glob.json`. Alternatively, an async/sync callback returns complete decision records; `defineDecisions` supplies default origin/tier/refs/why. CSS selectors filter the collected stylesheet graph; they do not themselves import new files. (`src/config.ts:14-24`, `src/decisions/index.ts:66-102`, `src/decisions/record.ts:7-13`, `src/index.ts:102-104`)
- **DTCG:** `$value`/`$type` become token records; `$description` supplies reason and `$extensions.plumb.tier` can override tier. Only the requested family is read. (`src/decisions/dtcg.ts:8,61-76`)
- **Presets:** auto-discovered shadcn/component and package presets, plus explicitly configured presets. Preset token sources support CSS, DTCG, records/callbacks; `theme:` is rejected for preset sources. Package/preset tokens can be published (`exported`). (`src/presets/index.ts:133-164,203-245`)
- **Resolution order:** preset records, compiler-theme records, project root CSS records, configured callbacks/DTCG, then eligible motion inference. Last record with the same `family:name` wins, except published preset records resist framework/external replacement; explicit project callback/DTCG overrides can replace them. Project policy overrides merged preset policy. (`src/decisions/index.ts:53-65,79-118`, `src/presets/index.ts:248-254`)
- **Other family keys:** `identity` chooses reference/value equality (default value for spacing/radius/type except font family, reference otherwise); `origins` defaults to `['project']`; `callers` can allow primitive/semantic explicitly (otherwise primitives with intent aliases are discouraged); `suggest` limits suggestion/value-match candidates; `byValue` defaults to grouped warnings (`each` or verbose separates them); `exported` exempts unused tokens from dead-token findings. `inferred` is validated and emitted by init as metadata; using it alone to infer a scale is **not supported**. Family-level `why` is **not supported**. (`src/config.ts:129-139`, `src/rules/provenance.ts:110-145,369`, `src/decisions/callers.ts:14-28`, `src/rules/dead.ts:29-30`, `src/adoption/init.ts:43-57`)
- **No config:** config loading falls back to presets plus automatic token selection above; source globs default to `src/` and `app/` JS/TS/JSX/TSX/CSS. Literal-use proposals require `plumb init`, which writes inferred sources and acceptance/debt; they are not a silent zero-config scale. (`src/config.ts:178-193`, `src/project.ts:14,96-97`, `src/adoption/init.ts:35-36,84-110`)
- **Tailwind defaults:** custom tokens do not automatically erase surviving framework entries. Compiler namespace resets remove defaults from the compiler theme; this site explicitly resets colour, font/text/weights, shadows, easings and radii. Surviving defaults remain `origin: framework`, generally outside project-authorized decisions; framework usage is flagged, or an ungoverned family reports that it cannot be checked. (`src/lower/tailwind.ts:184`, `site/src/styles.css:155-162`, `src/decisions/index.ts:79-83`, `src/rules/provenance.ts:112,218-220,341-349`)
- **Numeric spacing exception:** without replacement, the bare Tailwind unit supplies a numeric ladder. A project reset or any eligible primitive project spacing step at 0–64px (strictly positive, excluding layout-role names) replaces it; config here supplies a finite ladder. (`src/decisions/spacing.ts:9-27`, `src/rules/provenance.ts:110,176-178`, `site/plumb.config.mjs:4-10`)

## 3. Reasons

- Write a leading `/* why: … */` immediately before the custom-property declaration, in `@theme` or selected root CSS. The last preceding comment is read; optional `tier: primitive|semantic` is stripped from its reason. Inferred motion variables additionally accept same-line trailing comments, used verbatim. Backing-variable reasons are **not inherited** by a theme alias: `--primary` has a reason, `--color-primary` does not. (`src/decisions/css.ts:48-51,82-88`, `src/decisions/index.ts:82,87,116`, `site/src/styles.css:31-32,170`)
- Callback token records can supply `why`; family config cannot. DTCG uses `$description`. (`src/report.ts:62`, `src/decisions/index.ts:55-57,93-98`, `src/config.ts:129`, `src/decisions/dtcg.ts:75`)
- Resolver reasons are shortened to one relevant sentence, maximum 100 characters. An identical reason shared by more than three distinct tokens moves to `groupWhy` and leaves each token's `why` empty; group reasons are not displayed as individual reasons. (`src/messages.ts:59-73`, `src/report.ts:63-64`)
- CLI finding choices show a shortened reason (maximum 72 characters); `decisions` prints `why: (none)` when absent. Overlay ladder's line shows hovered/selected choice reason, falling back to `from your scale`; the full-scale quiet rungs do not each show a reason. (`src/report.ts:148-157,169-181`, `src/cli.ts:301-304`, `overlay/src/widget.js:1061-1076`)
- A reasonless token remains a decision. Requiring every token to have a reason is **not supported**; the missing-reason ledger error applies to exceptions, not decisions. (`src/decisions/record.ts:8`, `src/messages.ts:64-66`, `src/ledger/check.ts:33-34`, `src/ledger/commands.ts:22-32,89-93`)

## 4. Acceptance

`node dist/cli.js accept-decisions --root site --why "Reviewed the site's scale"` snapshots **all current non-framework decisions**, including project theme inventory excluded from `from`, into `site/.plumb/ledger.jsonl`. Keys are `decision:<family>:<name>`; entries contain value, refs, origin, tier, optional resolved, date, optional Git user name, and reason. The supplied reason replaces every current decision's ledger reason; it does not write CSS/config reasons. Without `--why`, token reasons are used and unchanged accepted attribution is preserved. `--why` is optional for this command. (`src/cli.ts:130-135,270-281`, `src/ledger/keys.ts:12-19`, `src/ledger/commands.ts:18-32,89-93,138`, `src/ledger/store.ts:6`)

Needed after adding/changing decisions when a ledger exists: missing/different value, origin, tier or refs produces `decisions/unaccepted` error. Changes only to reason, source location or resolved backing value do not trigger that comparison. First `baseline` automatically accepts current decisions; absent ledger alone does not require acceptance. Removed decisions warn (`decisions/vanished`); `ledger --prune` removes their entries after review. (`src/ledger/check.ts:43-53,128`, `src/ledger/commands.ts:80-91,129-135`)

## 5. Ledger / CI

- `ledger/config growth` counts ledger entries changed/added versus a Git base, plus added config lines under `--strict-ledger`. For debt, only increased counts are growth; for decisions/exceptions, any changed serialized field counts, even acceptance date/reason. It is not a count of token definitions or drift sites. (`src/ledger/check.ts:17-22,109-128`)
- `node dist/cli.js check --root site --base HEAD`: ledger debt growth errors; other ledger growth is informational. `node dist/cli.js check --root site --strict-ledger`: all ledger growth against HEAD errors, plus unmatched nonempty trimmed lines added to default/explicit Plumb config files. Config detection is textual, including comments; it is not semantic policy analysis. (`src/ledger/check.ts:109-124`, `src/ledger/git.ts:36-53`)
- CLI check exits 1 for errors, except its initial no-config/no-ledger mode exits 0. The GitHub Action runs a base comparison and gates ledger growth on configured approver author/review; debt errors still fail independently. Merely accepting changed tokens does not bypass that review gate. (`src/cli.ts:184`, `scripts/action/run.mjs:19-26,54-63`, `scripts/action/approval.mjs:5-15`, `action.yml:12-15`)

## 6. Inspect resolved decisions

Exact repo invocations, from repo root:

```sh
node dist/cli.js decisions --root site
node dist/cli.js decisions --root site --json
node dist/cli.js decisions --root site --family spacing --config plumb.config.mjs --json
```

These print `report.decisions` with authored/static-resolved values, origins, tiers, reasons, refs and source; they do not apply ledger acceptance. They do not include a precomputed utility-key list or convert every length to px. (`src/cli.ts:100,248-253,301-304`, `src/config.ts:178-179`)

Overlay requests `GET /__plumb/decisions` through its API base, with the injected `x-plumb-token`; the server returns current resolver decisions. Ladder lengths are measured on the live page rather than assuming static resolver px. (`overlay/src/api.js:1-9`, `src/hosts/vite.ts:56`, `src/session/server.ts:74,124-125`, `src/session/worker.ts:318`, `overlay/src/widget.js:1015,1023-1036`)

## Recording and verification

Output: `site/src/docs/recordings/decisions.json`. Regenerate from repo root:

```sh
npm run build
node scripts/docs/record-decisions.mjs
```

Uses built `readDecisions`, config/project discovery, stylesheet collection and the project's real Tailwind compiler. Each family has token name, compiler-proved base `classKeys`, authored value, static resolved value, reason/null, group reason, origin/tier/refs/source. Scalar lengths use Plumb's `pixels` conversion (`rem = 16px`); dynamic/unresolved values remain null. No browser light/dark value is fabricated. (`scripts/docs/record-decisions.mjs:5-22,24-77`, `src/decisions/resolve.ts:4-11`, `src/decisions/index.ts:120-134`)

Class keys cover compiler-listed base utilities, including zero on proved spacing roots; variants, slash modifiers and unbounded arbitrary syntax are excluded. Inline token identities are traced through the compiler's real theme lookups; this hook fails if the installed compiler's theme map changes. Empty keys do not mean an unusable CSS variable: the site's `--z-*` and custom motion variables can be used directly in CSS. (`scripts/docs/record-decisions.mjs:24-76`, `site/src/styles.css:106-109,259-265`)

Recorded 169 tokens: spacing 16, colour 34, radius 4, type 48, motion 19, elevation 12, z 4, size 32, opacity 0; 33 unresolved values and 131 absent individual reasons. Counts derive from the emitted family arrays/reason/null fields. (`scripts/docs/record-decisions.mjs:74-100`, `site/src/docs/recordings/decisions.json:7`)

Three spot checks, all passed:

- `--spacing-6`: `p-6`, `24px`, `card padding`. Config defines `calc(var(--spacing) * 6)` and `6 * 4px`; CSS imports Tailwind's unit, resolver folds to `1.5rem`, recorder converts to 24px. (`site/plumb.config.mjs:5-9`, `site/src/styles.css:1`, `src/decisions/resolve.ts:10,100-107`)
- `--radius-md`: `rounded-md`, `8px`, `controls and inputs`; alias resolves through root `--radius: 8px`. (`site/src/styles.css:94,201-202`)
- `--text-base`: `text-base`, `17px`, `reading text, a long measure set loose`. Its separate 27px line-height companion has no reason. (`site/src/styles.css:228-230`)

Verification: build passed; independent `decisions --root site --json` matched all 169 recorded token values/resolved values/reasons/group reasons after px normalization; the three checks above and compiler keys for `p-1`, `ring-primary`, `border-t-primary`, `inset-shadow-sm`, and `text-base`'s line-height companion passed. Regeneration was byte-identical; `p-0` mapped to zero spacing, `duration-0` did not. Resolver/CLI paths and recording projection: `src/cli.ts:248,301-304`, `scripts/docs/record-decisions.mjs:20-21,45-100`. This task made no UI edits or commits.
