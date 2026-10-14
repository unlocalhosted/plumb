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
- Title: `` Your theme has no {family} tokens, so {n} {property} values can't be checked ``
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
