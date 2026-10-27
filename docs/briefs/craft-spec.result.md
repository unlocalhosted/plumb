# The craft spec: result

Built on `main`, one commit per layer, after the design (docs/briefs/craft-spec.md, `4de38b4`). Everything is proved
through the real boundaries: the CLI binary (`node dist/cli.js spec`, `… craft --json`), real config files, a Vite dev
server with the plugin, and the real overlay in Chromium. No unit tests. No overlay UI file was touched (blueprint*.js,
select.js, inplace.js, changes.js, widget.js, walkthrough.js, help.js, readiness.js, scrub.js, overlay/demo/*).

## Layer 1: the spec as data, the config key, `plumber spec`, the spec on the page (`196a88b`)

- **overlay/src/craft-spec.js** (served to the overlay, imported by the server and the CLI through
  overlay/src/craft-spec.d.ts): `PRINCIPLES` (eleven, each with a tier and a why), `STANDARD` (per principle, per rule
  short name, the rule's thresholds and its `want`: a range with a target, in the rule's unit), `PRESETS`
  (`strict`, `balanced`, `relaxed`), `TOKENS` (the policy), `resolveSpec(craft, layers)` (standard → named preset →
  dependency presets → project `values` → project `rules`, every leaf remembering where it came from), `specFor`,
  `specRules`, `validateCraft`. The 15 source habits are entries too (`habit: true`, a severity), so they are turned on
  and off and re-graded in the same place.
- **The config**: `craft` in `plumber.config.*` (src/config.ts, schema/config.schema.json). A dependency preset may
  carry `craft` (src/presets/index.ts → `craftLayers`), merged after the named preset and before the project's own.
  Validation names the key to set and what it could have meant: `Set craft.values.legibility.measure.max to a number.`,
  `Move craft.values.access.measure to craft.values.legibility.measure.`, `Unknown rule "craft/measurr" in craft.rules.
  Did you mean craft/measure?`.
- **The server**: `spec` on the session (src/craft-spec.ts `projectSpec`: the resolved spec plus the token target: the
  config's `tokens.file`, else the Tailwind entry, with its shape `theme | shadcn | root` and the file's hash), a `GET
  spec` route (and JSON-RPC method), served to the overlay. `plumber spec [--rule <id>] [--json]` prints it by
  principle, each rule's on/off and tier (or severity for a habit), each value with its source.
- **The page**: craft.js asks `spec` once per page and judges with the standard until it lands, then re-judges (the
  `onFacts` path the ink layer already uses). `plumber craft --json` carries `spec` at the top level, so a report says
  which standard it was judged against.
- Test: e2e/craft-spec.test.mjs (4): the standard, a tuned config with provenance and `--rule`, seven wrong configs and
  their messages, the route in the real overlay and the spec in the craft JSON.

```js
// plumber.config.mjs
export default {
  craft: {
    preset: 'strict',
    values: { legibility: { measure: { max: 70, want: { max: 70 } } }, access: { 'hit-target': { min: 40 } } },
    rules: { 'craft/hairline': false, 'craft/continuous-corners': { tier: 'advisory' }, 'habits/real-quotes': { severity: 'info' } },
    tokens: { create: false, name: '{family}-{job}' },
  },
};
```

```
$ plumber spec --rule craft/measure
React Plumber craft spec: preset strict, 5 rules tuned (plumber.config.mjs)

legibility · tier 1 legibility
  Text that reads without effort: measure, leading, tracking, figures, line breaks, baselines, what is cut off.
  craft/measure                   on · tier legibility
      chars                      240  standard
      max                         70  plumber.config.mjs
      want.min                    45  standard
      want.max                    70  plumber.config.mjs
      want.target                 65  standard
```

## Layer 2: every rule reads the spec (`146e8c7`)

- No rule holds a `threshold`, a `tier` or an inline target any more. Each reads `const T = theme.spec(this.id)`
  (`SPEC.rule(id)` in craft-read.js, shared with craft-facets.js so `tierOf` reads the spec for habits too). The inline
  numbers became spec values: `want.ratio` 2 (button sides), `want.less` 4 (icon side), `want.caps` 0.05–0.1em target
  0.06, `want.display` −0.04–−0.01em target −0.025, leading wants 1.1–1.3 (1.25) and 1.4–1.6 (1.5), measure 45–75 (65),
  APCA's size and weight bands (`largeAt` 24, `boldLargeAt` 18, `boldAt` 14, `boldWeight` 600), text-wrap's `uneven`
  0.5 and `orphan` 0.15, exit-faster's `instant`/`ratio`/`measuredRatio`/`want.ratio`, tooltip-delay's `want.first`
  500 and `want.skip` 300, grey-levels and pure-black-white's colour distance `within`.
- `Craft.rules` are the rules as the spec has them: a rule turned off is never run (not in the hierarchy either); a
  tier the spec sets is the rule's in the verdict and in the CLI's severity (advisory → `info`). The rules that set
  their own finding tier (continuous-corners, dark-weight, overdrag, pure-black-white) take `T.tier`.
- The server's habits honour `craft.rules['habits/*']` (`habitOverrides` in src/habits/index.ts): off, or another
  severity, in `plumber check` and in the session.
- Proof: behaviour with the default config is unchanged; the wave 2–7, hierarchy, verdict, run, pairs, probes,
  structure, judge and habits tests pass as they were.

## Layer 3: the recommendation engine, the token suggestion, the token write (`e3e50eb`)

- **overlay/src/craft-recommend.js**: `recommend({ family, prefix, job, want, from, sets, round, theme, label, token, advice })`
  → the best candidate, with the rest as `alternatives`. Ranked:
  a. a step of the theme in `[want.min, want.max]`, nearest `want.target` (the rule's direction breaks a tie); failing
     that, for px families, the nearest step the rule's way (`round: up | down | nearest`), which the verdict proves;
  b. the app's own value: Tailwind's numeric scale when the theme names no spacing steps (`px-5`);
  c. a new token, when the rule asked for one (`token !== false`), the policy allows (`tokens.create`) and the server
     named a file: `{ kind: 'token', family, name, value, file, hash, shape, then: { from, to }, why, text, sets }`.
     Value: `want.target` snapped to the family's grain (em to 0.005, ratios to 0.05, px to 1). Name: the policy's
     template (`{family}-{job}`, or a map per family), in the family's prefix, `-2` when taken. Class: Tailwind's
     namespace (`--tracking-caps` → `tracking-caps`).
  d. advice, with the numbers (the rule's own sentence when it has one).
  Type steps must be the project's own (a framework default is refused by the verdict); spacing and radius keep the
  scale as the theme has it (as before). `recommendColour` is the colour family's one safe answer (a theme token within
  a distance, else advice: a new colour is a design decision, never derived).
- **Rules that go through it**: concentric-radius, inner-outer-spacing, content-align, button-padding, icon-side,
  rhythm, media-size, anchor-offset (spacing and radius; no tokens, the verdict's snapping is the last check, as
  before), tracking and leading (tokens on), weight-levels, text-opacity, grey-levels (colour). `space()`, `numeric()`
  and `trackingStep()` are gone. Theme measures `--tracking-*`, `--leading-*`, `--text-*` and `--font-weight-*` steps
  too (at 100px, so a relative value reads back as its em and a unitless line height as its ratio), and marks which
  steps are the project's own.
- **The verdict** tries a `token` candidate by what it sets (`verifyToken`: quiet, nothing above wakes), then keeps it
  with `whyNot: 'no-step'` (true: the theme has no step there; the current UI draws its hollow bar) and `action =
  suggest.text`, `proof: { theme: 'new', quiet, above }`.
- **The write**: `POST token { file, hash, name, value, why?, then?: { file, hash, line, column, from, to } }`
  (src/session/engine.ts `token`). The server only writes to the file its own spec names, in the shape the file has
  (`addToken` in src/onboarding/write.ts: `@theme`, `@theme inline`, or `:root`, with the `/* why */` comment the
  onboarding writer uses); stale hash refused; the same open/`O_NOFOLLOW`/identity/hash guards as `swaps`; the
  stylesheet's last guard is its block count and the declaration's presence. Then the class swap through `swap`'s
  guards; a refused swap undoes the theme write. A token already declared with the same value is not written twice.
  Result: `{ written, applied: ['token:--tracking-caps'], undo, then: ApplyResult }`.
- The tracking/caps case on the demo theme (no `--tracking-*`): `plumber craft --json` offers
  `--tracking-caps: 0.06em` + `tracking-caps` (`why: 0.06em, in the 0.05em–0.1em small capitals need`), the human report
  says `→ Add --tracking-caps: 0.06em to your theme, then use tracking-caps here.`, the post writes both files, the
  page comes back quiet. The loose heading gets `--leading-display: 1.25` the same way.
- Test: e2e/craft-token.test.mjs (2). One select-UI assertion changed with the behaviour it encoded: where the theme has
  no letter-spacing step, `i` now shows the finding's line (the advice sentence is gone; the suggestion is a token).

## Layer 4: user tuning (`073730c`)

- e2e/craft-tuning.test.mjs (2): one page judged against the standard and against a config (measure max 70, hit target
  44, `craft/leading` off, `tokens.create: false`). Through `plumber craft --json`: the 80-character paragraph and the
  32px button are quiet by the standard and found by the config; the loose heading's leading finding is gone; the
  capitals get advice instead of a token; the report's `spec` says `hit-target.min` came from the config. Through the
  real overlay: the marks on the page follow the same config.

## Deviations from the design, and why

- `measure` keeps `max-w-prose` (65ch) as its one class; the engine has no `container` family yet, and the fix was never
  withdrawn by the verdict (max-width is not a theme step). Its why reads the spec's target.
- Candidate (b) for em families ("a value the page already uses in range feeds the new token's value") is not built:
  the token's value is the spec's target. A `tracking` census is the natural next step.
- A rule's tier default comes from its principle, except the three the design names; the engine applies the spec's tier
  through `Object.create(rule)` views, so the rule objects stay plain and shared.
- Presets are small on purpose: `strict` and `relaxed` move the numbers people argue about (measure, contrast, hit
  target, leading) and the taste rules; a house style is the same thing under `values`.
- `plumber spec` resolves the token file without a project read (the Tailwind entry by import); the server, which has
  the report, also knows the `theme.css` fallback and whether the file is new.
- `token` is a write in the coordinator's eyes (serialized like `swaps`); the first run deadlocked because it was
  queued as a read inside a batch.

## What the overlay UI needs to show token suggestions

1. A mark whose `craft.suggest.kind === 'token'`: draw it where the hollow bar is (`whyNot: 'no-step'` is still set),
   with `suggest.name: suggest.value` and the class `suggest.then.to`; `suggest.text` is the sentence for `i`
   (select.js appends `suggest.text` only for `advice` today). `suggest.why` says the range it was chosen from.
2. Enter / Apply: `post('token', { file: s.file, hash: s.hash, name: s.name, value: s.value, why: s.why,
   then: { file, hash, line, column, from: s.then.from, to: s.then.to } })` (api.js `post`), where the JSX site comes
   from `locate` as for a swap. The result has `undo` (the theme file) and `then.undo` (the class). After a write, ask
   `spec` again: the theme file's hash changed, and the next token's `hash` must be the new one (craft.js exports
   `spec.load`; a reload after a write is the UI's call for now).
3. `suggest.alternatives` can be the other steps of the stair (a class candidate the verdict did not try, or the
   advice).
4. `plumber spec` is where to send "why 24px?": every value names its source.

## Tests

8 new end-to-end tests, all through the real CLI, config files, server and overlay: craft-spec (4: the standard, a tuned
config with provenance and `--rule`, seven wrong configs, the route and the craft JSON), craft-token (2: the token
suggestion through `plumber craft --json`, the write with its guards and the quiet page; the mark in the live overlay),
craft-tuning (2: the CLI and the overlay judged by a project config). The gate after the last layer, one job at a time
(`node --test --test-concurrency=1`, Chrome via `PLUMBER_CHROMIUM`): craft (its Noise test), craft-wave2 to 7,
craft-hierarchy, verdict, craft-run, craft-pairs, craft-probes, craft-structure, craft-judge, craft-spec, craft-token,
craft-tuning, select, inplace, habits, presets, cli, docs-cli, packaging, serve: 154 tests, 153 pass, 1 skipped (the
polling skip that was there). `npm run typecheck` is clean. Nothing was left running; no demo file was changed.
