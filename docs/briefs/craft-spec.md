# The craft spec: one standard, one recommendation engine, one config

Status: design, 2026-10-27. Builds on docs/briefs/craft-engine.md (the engine, facts, the rule API),
docs/briefs/craft-hierarchy.md (facets, tiers, the verdict), docs/briefs/craft-hard-rules.md (census, metrics, pairs,
probes, structure, judge) and docs/craft/rules.md (the catalogue, 77 rules).
Code it concerns: overlay/src/craft-rules.js (52 rules), overlay/src/craft-headless.js (14 rules), overlay/src/craft.js
(`Facts`, `Theme`, `Craft`), overlay/src/verdict.js (`verify`), overlay/src/craft-facets.js (`TIER`), src/habits/index.ts
(15 source habits), src/config.ts, src/cli.ts, src/session/engine.ts (`swap`, `swaps`, `prop`), src/onboarding/write.ts.

## The problem, and the system behind it

Every craft rule carries its own notion of good, and its own way of saying what to do about it:

- **Thresholds** live on the rule (`threshold: { max: 90, chars: 240 }`), one object per rule, 60 of them, no two alike.
- **Targets** are inline: "a text button is about twice as wide in padding as it is tall" (`b.pt * 2`), "small capitals
  want 0.05em more" (`fs * 0.05`), "about 65 characters a line" (`max-w-prose`), "line height 1.25 for big text, 1.5 for
  body" (`leading-tight`, `leading-normal`), APCA 60/50/45, hit target 24, icon side 4px less, concentric R − p.
- **Suggestions** are per-rule ad hoc: `space()` takes the theme step within 0.5px else a numeric step; `trackingStep()`
  tries `wider, wide, widest`; `leading` names Tailwind's `leading-tight` and lets the verdict withdraw it; `text-opacity`
  asks `nearestColor` within 32; `rhythm` asks `nearest` within 0.5; `concentric-radius` within `tolerance`.
- **When the theme has no fitting token the rule gives up**: "Your theme has no letter-spacing step for this. Add one,
  then use it here." The person is told to go and invent a token, by hand, with no value and no name.
- **Nothing is tunable.** A team that wants 44px hit targets, 70ch measures, or no advice about squircles edits the
  package.

Each of these is a symptom of one missing thing: **there is no standard**. The rules are the standard, smeared across
60 objects and 2000 lines. So the fix is structural, in three parts, each a layer:

1. **The spec** (the standard as data): what we care about, grouped by principle with a priority; per rule, the facts it
   reads, the thresholds it fires on, and the values it wants. One module, read by the server, the CLI and the overlay.
2. **The config** (`craft` in `plumber.config.*`): presets, per-rule on/off and tier, per-principle values, a token
   policy. Merged over the standard; `plumber spec` prints what is in effect and where each value came from.
3. **The recommendation engine**: one function that turns "this element wants 0.05–0.1em of tracking" plus the project's
   theme into ranked candidates: an existing token, a value the app already uses, a new token (named and valued) with
   the class that uses it, or advice. Every rule that suggests a value calls it; the verdict verifies the candidate.

## 1. What we care about

A principle is a reason, with a priority. The priority is the tier of docs/briefs/craft-hierarchy.md: when two findings
meet on one facet of one element, the lower number wins, and a fix is withdrawn if it would wake a rule of a lower
number. Tiers stay as they are in overlay/src/craft-facets.js: `access 0 · legibility 1 · theme 2 · craft 3 · advisory 4`.

| Principle | Tier | Why it matters | Rules (docs/craft/rules.md numbers) |
|---|---|---|---|
| **access** | 0 | People must be able to read it and hit it, on every device. Never traded for looks. | contrast 24, disabled-contrast 26, hit-target 27, input-zoom 70, touch-manipulation 71; habits hover-gate, focus-outline, reduced-motion-fade, viewport-dynamic, safe-area-fallback, logical-inline |
| **legibility** | 1 | Text that reads without effort: measure, leading, tracking, figures, line breaks, baselines, what is cut off. | measure 13, leading 14, tracking 15, tabular-nums 16, heading-widow 18, text-wrap-role 48, baseline-align 6, truncate-intent 35, middle-truncate 76, bold-hover 42, scrollbar-gutter 36, anchor-offset 73, scroll-cue 75, skeleton-match 77, submenu-path 59; habits font-metrics, real-quotes |
| **theme** | 2 | The project's own decisions: its tokens are the allowed answers. (The drift rules, src/rules; a craft fix must land on them.) | provenance/*, spacing, radius, color, type, elevation, z, motion; habits transition-named, no-ease-in, composited-motion, tracking-em, color-scheme, overflow-clip, overscroll-contain |
| **rhythm & spacing** | 3 (craft) | Space says what belongs together. | inner-outer-spacing 7, button-padding 9, icon-side 10, rhythm 12, content-align 1, trim-leading 5 |
| **shape** | 3 | Corners and edges that agree with each other. | concentric-radius 8/41, hairline 38, border-on-shadow 23, image-outline 39, content-size 33, media-size 34 |
| **depth** | 3 | Light comes from one place; elevation reads the same in light and dark. | layered-shadow 51/53, one-light 20, tinted-shadow 21/52, dark-elevation 54 |
| **colour** | 3 | Colour is chosen, never faded into. | text-opacity 57, grey-levels 17, gradient-space 55, eased-scrim 56, pure-black-white 25 |
| **hierarchy** | 3 | Two or three levels of anything; every extra one weakens the rest. | weight-levels 17, caps-case 46, optical-sizing 49, stroke-weight 50, hanging-quote 45 |
| **alignment** | 3 | The eye lines up letters and weight, not boxes. | icon-cap 4, optical-centre 2, half-pixel 37, z-index-war 74 |
| **motion** | 3 | Motion answers the hand, leaves quicker than it came, and never surprises. | scale-from-zero 63, press-feedback 31, exit-faster 68, interruptible 64 (advisory), menu-pointerdown 61, tooltip-delay 60, palette-motion 62, spinner-timing 66 |
| **taste** | 4 (advisory) | Judgements a person may disagree with: shown softly, never failing a run. | continuous-corners 40, overshoot 3, dark-weight 44, overdrag 65 |

A rule names its principle; the principle gives the rule its default tier. Three rules keep their own tier because
their principle's would be wrong for them: `interruptible` (motion, advisory), `dark-weight` (taste), `pure-black-white`
(colour; advisory when the theme has no tinted surface, as today).

## 2. What we look for

Per rule, the spec records **what it reads** (the facts: `rect`, `style`, `kids`, `text`, `ground`, `metrics`, `census`,
`ink`, `stroke`, `other:<pair>`, `probe:<gesture>`, `source`), **when it fires** (its thresholds) and **what it wants**
(the target and range a suggestion is built from). Thresholds and wants are the same object, so a tuned threshold moves
the suggestion with it. Every number that is in a rule today moves here, under the rule's short name, under its
principle. The full table is the module itself (overlay/src/craft-spec.js, `STANDARD`); this is its shape and the
entries the engine's suggestions depend on most:

```js
legibility: {
  measure:  { chars: 240, max: 90,  want: { min: 45, max: 75, target: 65 } },        // characters a line
  leading:  { large: 30, loose: 1.4, small: 18, tight: 1.3, want: { body: { min: 1.4, max: 1.6, target: 1.5 }, display: { min: 1.1, max: 1.3, target: 1.25 } } },
  tracking: { caps: 14, large: 36, want: { caps: { min: 0.05, max: 0.1, target: 0.06, unit: 'em' }, display: { min: -0.04, max: -0.01, target: -0.025, unit: 'em' } } },
  'tabular-nums': { rows: 3 }, 'heading-widow': { words: 3 }, 'text-wrap-role': { width: 300 }, 'scrollbar-gutter': { width: 280, height: 200 }, 'baseline-align': { off: 1 }, …
},
access: {
  contrast: { small: 60, bold: 50, large: 45 },                                        // APCA Lc
  'hit-target': { min: 24, long: 64 }, 'input-zoom': { min: 16 }, 'disabled-contrast': { min: 45 },
},
rhythm: {
  'button-padding': { ratio: 1.5, maxHeight: 56, want: { ratio: 2 } },                 // sides = top × want.ratio
  'icon-side': { min: 8, less: 2, want: { less: 4 } },                                  // the icon side gives this back
  'inner-outer-spacing': { min: 0.5 }, rhythm: { sample: 6, off: 2, majority: 0.6 }, 'content-align': { min: 4, siblings: 2 }, 'trim-leading': { leading: 3, share: 0.25 },
},
shape: { 'concentric-radius': { tolerance: 1.5, minParentRadius: 4 }, hairline: { minDpr: 2 }, … },
…
```

The server's habits (src/habits/index.ts) are source rules; they have no numeric thresholds today and keep their own
table. The spec covers them for **enable and severity** only (`rules['habits/tracking-em']: false`, `{ severity: 'warn' }`),
so a person turns everything on and off in one place. Their tiers (overlay/src/craft-facets.js `TIERS`) move into the
spec's principle table above; `tierOf(rule)` reads the spec.

## 3. How a rule works

Every rule follows one shape. Nothing in it is a number:

```js
export const tracking = {
  id: 'craft/tracking', number: [15], principle: 'legibility',
  owns: ['letter-spacing'], once: 'ancestor', reads: ['style', 'text'],
  check({ el, facts }, theme) {
    const T = theme.spec(this.id);                        // 1. the standard, as configured for this project
    …measure the facts…                                   // 2. read facts (never the DOM), say nothing when unsure
    if (!(caps || large)) return [];                      // 3. compare against T
    const want = caps ? T.want.caps : T.want.display;     // 4. what the spec wants here, as a range with a target
    return [{ ...say(this.id, { caps, size: fs }), key, text, props, value, n, evidence, confidence,
      suggest: recommend({ facts, theme, el, rule: this,  // 5. one engine turns the want into ranked candidates
        family: 'tracking', prefix: 'tracking', job: caps ? 'caps' : 'display', from: cls,
        want: { ...want, of: fs }, sets: (v) => ({ letterSpacing: v * fs }) }),
    }];
  },
};
```

1. `theme.spec(id)` is the resolved entry for the rule (standard → preset → project), the same object in the live
   overlay and the headless run. Until the project's spec has loaded, it is the standard, and the page is judged again
   when it lands (the way the theme's decisions already re-judge everything, `Craft.onFacts`).
2. Facts only. A rule that would need to guess says nothing (unchanged).
3. Thresholds come from `T`; `tier` comes from the rule's principle unless the spec says otherwise; a rule the spec
   disables is not run at all (`Craft` filters `rules` by the spec, so the hierarchy never sees it).
4. The *want* is a range `{ min, max, target }` in the rule's unit (`em`, `px`, a ratio, `Lc`), not a class name.
5. The suggestion comes from the recommendation engine (section 4). The rule describes the job; it never chooses a
   token, a class name or a Tailwind default itself. The verdict (overlay/src/verdict.js) then tries the candidate on
   the page as it already does, and withdraws it only when the page says no.

A finding keeps its shape (evidence, confidence, words from words.js). Severity for the CLI stays: tier advisory →
`info` (a note), anything else → `error`. A spec `tier` override on a rule changes both its rank in the verdict and its
severity.

## 4. How we suggest improvement: the recommendation engine

One module, overlay/src/craft-recommend.js, one function:

```
recommend({ family, prefix, job, want: { min, max, target, unit?, of? }, from, sets, round, facts, theme, el, rule })
  → suggest   (the best candidate, in the finding's existing shape)
```

`family` is what kind of value it is (`spacing`, `radius`, `tracking`, `leading`, `text`, `weight`, `color`);
`prefix` the utility that sets it (`px`, `gap`, `rounded`, `tracking`, `leading`, `text`, `font`); `job` what it is for,
in a word (`caps`, `display`, `body`, `control`, `card`, `muted`); `want` the spec's range (`of` the font size when the
unit is `em`, so a token's `em` can be compared with the page's px); `from` the class it replaces; `sets` what the
candidate would set on the page (for the verdict's trial); `round` the direction when snapping (`up` for "at least",
`down` for "less", else nearest).

The candidates, in rank order. The first that exists is the suggestion; the rest are kept on it as `alternatives`
(so a UI can offer them, and `plumber craft --json` shows the reasoning):

| Rank | Candidate | When | Suggestion |
|---|---|---|---|
| a | **A token of the theme** | the project's own theme (never a framework default) names a step of this family whose measured value lies in `[min, max]`; nearest to `target` wins, in the `round` direction when two tie | `{ kind: 'class', from, to: 'tracking-wide', why: 'wide is 0.05em, in the 0.05–0.1em small capitals need', sets }` |
| b | **A value the app already uses for this job** | the census (`Facts.census`) shows a value in range that this page already uses for the same job, or the project's numeric scale (`--spacing`) divides the value and the theme names no steps of the family | spacing: `{ kind: 'class', to: 'px-5' }` (as today's `numeric()`); other families: the value feeds (c), and the why says "0.06em, which this page already uses on N labels" |
| c | **A new token** | nothing in the theme fits, token creation is allowed (`tokens.create`, default on), and the project has a theme file to put it in | `{ kind: 'token', family: 'tracking', name: '--tracking-caps', value: '0.06em', file: 'src/styles.css', hash, why, then: { from, to: 'tracking-caps' }, text, sets }` |
| d | **Advice** | nothing is safe: no theme file, creation forbidden, or the value has no utility (a box-shadow stack, a colour-mix) | `{ kind: 'advice', text }` with the numbers |

Rules for the new token (c):

- **Value**: `want.target`, snapped to the family's grain (em to 0.005, px to 1, ratios to 0.05), preferring a value the
  app already uses (b) when one is in range. The why names the range: "0.06em, inside the 0.05–0.1em small capitals need".
- **Name**: the theme's own convention, read from the names it already has in that family (`--spacing-s1…s6` → `s7`
  only when the value extends a numbered ladder; `--radius-tag/control/card` → a role word). The default template is
  `--{family}-{job}` (`--tracking-caps`, `--leading-display`, `--radius-pill`); the config can set `tokens.name` to a
  template (`'{family}-{job}'`, `'{family}-{value}'`) or a map per family. A name already taken by a different value
  gets a `-2`. Tailwind's namespace rules decide the class: `--tracking-caps` → `tracking-caps`, `--text-caption` → `text-caption`.
- **File**: the theme target the onboarding writer already chooses (src/onboarding/propose.ts: the `@theme` block of the
  Tailwind entry, `@theme inline` for shadcn, else `:root` in `theme.css`), overridable by `tokens.file`. The server
  resolves it once and hands it to the overlay in the spec (`tokens.file`, `tokens.shape`, `tokens.hash`); the overlay
  never chooses a file.
- **Write**: `POST token { file, hash, name, value, why, then: { file, hash, line, column, from, to } }` on the session
  API (src/session/engine.ts `token`). Same guards as `swaps`: the theme file's hash must match, the write is one
  serialized guarded write through the onboarding writer (`put` into the existing block, `/* why */` comment kept), then
  the class swap through the existing `swap` guards (stale hash refused, `parsesAsBefore`); if the swap is refused the
  theme write is undone. One history entry per file, both undoable. A token whose name the theme already declares with
  the same value is not written twice; the swap alone runs.
- **Verdict**: a `token` candidate carries `sets`, so `verify` tries it on the page like a class (`quiet`, `above`). It
  needs no "on the theme" rewrite: it *is* the theme, after the write. The mark keeps `whyNot: 'no-step'` (true today;
  the current UI draws its hollow bar there) and `suggest.kind === 'token'` says what fills the gap.

Candidates (a) and (b) are what the rules do today for the cases that work (`space`, `numeric`, `nearest`,
`nearestColor`, `trackingStep`); the engine makes them one path with one why. The verdict's own snapping (`stepFor`,
`round`) stays as the last check: a class the engine writes still has to be on the theme.

Colour is the one family where "a token in range" is a distance, not an interval: `want` carries `{ rgb, within }` and
(a) is `theme.nearestColor`; (c) is never offered for colour (a new colour is a design decision, not a derivation);
(d) says the hex.

## 5. The config

The spec lives under one key of the existing config, `plumber.config.{ts,mts,mjs,js}` (src/config.ts, `craft`). It
rides on everything the config already has: discovery, `--config`, data-only parsing, presets, validation with
`Set craft.… to …` errors, the JSON schema (schema/config.schema.json), `plumber doctor`.

```js
// plumber.config.mjs
export default {
  craft: {
    preset: 'balanced',                       // strict | balanced (default) | relaxed
    values: {                                 // per principle, per rule: thresholds and wants, merged over the preset
      legibility: { measure: { max: 70, want: { max: 70 } }, tracking: { want: { caps: { target: 0.08 } } } },
      access: { 'hit-target': { min: 44 } },
    },
    rules: {                                  // per rule (craft/* and habits/*): on/off, tier (severity)
      'craft/hairline': false,
      'craft/continuous-corners': { tier: 'craft' },     // promote a taste rule to a finding
      'craft/measure': { tier: 'advisory' },             // demote to a note
      'habits/real-quotes': { severity: 'info' },        // habits keep error|warn|info
    },
    tokens: {                                 // token creation policy (candidate c)
      create: true,                           // false: never propose a new token (advice instead)
      name: '{family}-{job}',                 // or { tracking: 'track-{job}', radius: 'r-{job}' }
      file: 'src/styles.css',                 // where tokens go; default: the theme the onboarding writer targets
    },
  },
};
```

- **Presets**: named value sets, merged over the standard before the project's values. `balanced` is the standard
  itself (nothing). `strict`: measure max 75 (want max 70), hit target 44 (WCAG 2.5.5 AAA), contrast small 75 / bold 60 /
  large 60 (APCA's fluent-text floor), leading loose 1.35 / tight 1.4, input zoom 16, every advisory rule at tier craft.
  `relaxed`: measure max 100, contrast small 45 / bold 40 / large 35 (APCA's minimum for body text), hit target 20, the
  taste rules off, hairline off. A preset is a plain object in the module; a house style is the same thing written in
  the project's config under `values`. A dependency preset (src/presets, `presets:` in the config) may carry `craft`
  too, merged after the named preset and before the project's own values, so a design-system package ships its standard.
- **Merge order**: standard → named preset → dependency presets (in order) → `values` → `rules[id]` (tier/enabled only).
  Deep merge on plain objects; a leaf replaces a leaf. Every leaf remembers its source.
- **Validation**: unknown principle, rule or key → `Set craft.values.legibility.measure.max to a number` /
  `Remove unknown key craft.values.legibilty; principles: access, legibility, …` / `Unknown rule craft/measurr; did you
  mean craft/measure?`. A value must be the same kind as the standard's (number for number, string from an enum for
  tier). `tier` takes the tier names; `severity` takes error|warn|info for habits.
- **Seeing what is in effect**: `plumber spec [--rule <id>] [--json] [--root] [--config]` prints the resolved spec, by
  principle, each value with where it came from:

  ```
  legibility · tier 1
    craft/measure                 on   tier legibility
      chars 240          standard
      max   70           plumber.config.mjs values.legibility.measure.max
      want  45–70 (65)   max: plumber.config.mjs · min, target: standard
    craft/tracking                on
      …
  tokens  create yes · name {family}-{job} · file src/styles.css (@theme)
  ```

  `--json` prints `{ preset, principles: [{ id, tier, rules: [{ id, enabled, tier, values: { key: { value, from } } }] }], tokens }`.
  The same object is what the server's `spec` route returns to the overlay and what `plumber craft --json` includes
  under `spec` (so a report says which standard it was judged against).

- **Where it reaches**: the server session reads it with the config (src/session/state.ts loads the config; the worker
  answers `spec`); a config edit reloads it like any config change. The overlay asks `request('spec')` once per page
  (craft.js), judges with the standard until it arrives, then re-judges. The headless run goes through the same overlay,
  so `plumber craft` honours the project's config with no new flag; `plumber craft --root <dir>` already names the
  project.

## 6. Layers

1. **Spec data** (`feat(craft): the spec, layer 1`): overlay/src/craft-spec.js (`STANDARD`, `PRESETS`, `resolveSpec`,
   `validateCraft` helpers shared by server and browser; a `.d.ts` beside it for TypeScript), `craft` in src/config.ts +
   schema, `spec` on the session (engine, worker, index, server route, allowlist), `plumber spec`, `Theme.spec(id)` in
   craft.js fetching `spec` and re-judging on arrival. Proof: `plumber spec` through the real CLI (default, a preset, a
   project value, a disabled rule, provenance), the route answers in the real overlay.
2. **Rules read the spec** (`layer 2`): every `threshold` moves into `STANDARD`; rules read `theme.spec(this.id)`;
   `Craft` skips disabled rules and takes tiers from the spec; `tierOf` for habits reads the spec; the server's habits
   honour `rules['habits/*']`. Behaviour with the default config is identical: the existing wave tests are the proof.
3. **The recommendation engine** (`layer 3`): overlay/src/craft-recommend.js; the value-suggesting rules call it
   (button-padding, icon-side, inner-outer-spacing, concentric-radius, content-align, rhythm, media-size, anchor-offset,
   tracking, leading, measure, text-opacity, grey-levels, pure-black-white, weight-levels); `verify` accepts `token`
   candidates; `POST token` on the server through src/onboarding/write.ts; `spec.tokens` carries file, shape and hash.
   Proof: the tracking/caps case on the demo theme yields `{ kind: 'token', name: '--tracking-caps', value: '0.06em',
   then: { to: 'tracking-caps' } }` through `plumber craft --json`; posting it writes the token into `@theme` and swaps
   the class; the page comes back quiet; a stale hash is refused and nothing is written.
4. **User tuning** (`layer 4`): a project config that sets measure max 70, hit target 44, turns hairline off and forbids
   token creation changes the findings and suggestions through the real CLI and the real overlay.

## 7. What the UI needs (for the session redesigning the fix panel)

- A `suggest.kind === 'token'` mark: draw it where the hollow bar is today (`whyNot: 'no-step'` is still set), with the
  token's name and value (`--tracking-caps: 0.06em`) and the class it then uses (`tracking-caps`). Enter should
  `post('token', { file, hash, name, value, why, then: { file, hash, line, column, from, to } })` (api.js `post`); the
  result carries two undo handles. `suggest.text` is the sentence for `i`.
- `suggest.alternatives` (the lower-ranked candidates) can be offered as the other steps of the stair.
- `plumber spec` is the place to send a person who asks "why 24px?": each value says where it came from.
