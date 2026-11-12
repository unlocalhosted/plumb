# Where each suggestion decision comes from

2026-11-12. First pass of the work `docs/PRINCIPLES.md` asks for: each decision the craft suggestion engine makes
(`overlay/src/craft-recommend.js`, design in `docs/briefs/craft-spec.md` §4), set against how teams that run design
systems decide the same thing in their own tools and docs. Research only; no code was changed.

**Corrected the same day.** This pass compared plumber with lint tools. The owner: "I'm not creating a linter";
plumber judges a single decision from many signals and applies it (`docs/PRINCIPLES.md`). So a source here is useful
for *which signals make a decision right*, not for *whether plumber may decide*. Decision 2's verdict is withdrawn on
that ground; the others are re-read below where it matters.

Every quote below was read on the linked page on 2026-11-12. Where a page did not say something, this says so.

**Verdicts:** *backed* (a source says the same) · *partly* (the idea is backed, a detail is not) · *against* (sources
say otherwise) · *no source* (nothing read; today it is a guess).

## Summary

| # | What plumber does today | Verdict |
|---|---|---|
| 1 | The project's own tokens are the allowed answers | backed |
| 2 | Picks one answer for the person even when several steps fit | ~~against~~ withdrawn: choosing is the product |
| 3 | Uses the plain numeric class when it equals the value | backed |
| 4 | Offers the nearest step when the value is not on the scale | partly |
| 5 | Picks a colour token by how close its value is | **against**: the role is the missing signal |
| 6 | Proposes a new token, named by its job, when nothing fits | partly |
| 7 | Falls back to advice when no edit is safe | backed |
| 8 | Not looked at yet: which finding wins, the confidence floor, the unsure band, trying a fix first | — |

## 1. The project's own tokens are the allowed answers — backed

- **Principle:** a design system is a set of decisions; a value outside it is the thing to fix, and the fix is one of
  its tokens.
- **Sources (tooling of four teams, all define a violation the same way):**
  - Atlassian: "Using anything other than design tokens such as hardcoded values or legacy theme colors will be
    considered violations." ([ensure-design-token-usage](https://atlassian.design/components/eslint-plugin-design-system/ensure-design-token-usage/usage))
  - IBM Carbon: `margin: 16px` and `color: #0f62fe` are violations; `$spacing-05` and `$link-primary` pass.
    ([stylelint-plugin-carbon-tokens](https://github.com/carbon-design-system/stylelint-plugin-carbon-tokens/blob/main/README.md))
  - GitHub Primer: "Enforces the use of spacing variables for margin and padding." ([stylelint-config](https://github.com/primer/stylelint-config/blob/main/README.md))
  - Mozilla Firefox: spacing declarations use "design token variables instead of hardcoded values".
    ([use-design-tokens/space](https://firefox-source-docs.mozilla.org/code-quality/lint/linters/stylelint-plugin-mozilla/rules/use-design-tokens/space.html))
- **Detail with no source:** plumber refuses a framework's default step (Tailwind's `tracking-wide`) as an answer for
  type. Nothing read speaks to this.

## 2. Picking one answer when several fit — withdrawn

**Withdrawn.** The sources below describe tools that cannot judge, so they act only on an exact match. Plumber is
built to judge. What does carry over: the pick is only as good as its signals. Today the craft side picks by "nearest
to the standard's number" alone; the role of the element and where it sits are not read. That is the gap, not the
picking.


- **What plumber does:** when more than one theme step lies in the wanted range, it takes the one nearest the target
  and shows only that. The others are kept in the data and never shown.
- **Principle the sources share:** *a tool chooses for you only when there is exactly one right answer; when there are
  several, it shows them and the person chooses.*
- **Sources:**
  - ESLint, on when a rule may fix by itself versus only suggest: suggestions are for when "a fix potentially changes
    functionality or if there are multiple valid ways to fix a rule." ([custom rules](https://eslint.org/docs/latest/extend/custom-rules))
  - Tailwind's ESLint plugin: "If there is exactly one equivalent regular classname, this rule will fix the issue for
    you." With several, you "manually perform the replacement."
    ([no-unnecessary-arbitrary-value](https://github.com/francoismassart/eslint-plugin-tailwindcss/blob/master/docs/rules/no-unnecessary-arbitrary-value.md))
  - Primer keeps an explicit list of values that "can safely be replaced via `stylelint --fix`"; everything else is
    reported, not chosen. ([plugins](https://github.com/primer/stylelint-config/blob/main/plugins/README.md))
- **Plumber already holds this principle elsewhere:** `docs/VISION.md`, on writing: "write when exactly one edit fits;
  otherwise show the choices." The drift side follows it (it shows the fitting steps on a ladder). The craft side
  does not.
- **What it implies (corrected):** keep choosing; choose from more than nearness. The number used to break a tie
  (the standard's target) is still unsourced.

## 3. The plain numeric class when it equals the value — backed

- **Principle:** if the project's scale already has a name for exactly this value, use the name.
- **Source:** Tailwind's ESLint plugin: "stick to regular classnames defined in the Tailwind CSS config file";
  `m-[-1.25rem]` becomes `-m-5`. ([same page](https://github.com/francoismassart/eslint-plugin-tailwindcss/blob/master/docs/rules/no-unnecessary-arbitrary-value.md))
- Plumber offers `px-5` only when the value divides the project's spacing unit exactly, which is the same bar.

## 4. The nearest step when the value is off the scale — partly

- **Principle:** an off-scale value is usually a near miss of a step, so the nearest step is the likely intent; but
  it changes how the page looks, so it is offered, never applied silently.
- **Sources:**
  - Akamai/Linode's spacing helper (code): "For values that don't exactly match a token, the function rounds to the
    nearest available token." ([design tokens guide](https://linode.github.io/manager/development-guide/16-design-tokens.html))
  - Carbon auto-fixes spacing and motion values that are on its scale (`16px` → `$spacing-05`); Mozilla auto-fixes
    "common pixel values". Neither page says a non-matching value is rounded for you.
  - ESLint: "Avoid any fixes that could change the runtime behavior of code." A rounded value changes what is drawn,
    so by this rule it is a suggestion.
- **Backed:** offering the nearest step as a suggestion the person takes.
- **No source:** rounding *up* for a minimum and *down* for a maximum. It follows from the rule's own limit (a 24px
  minimum is not met by rounding down), which is logic, not practice. Marked ours.
- **No source:** the half-pixel slack for "this step is the value".

## 5. A colour token chosen by how close its value is — against

- **What plumber does:** the craft side takes the theme colour nearest in RGB, within a fixed distance of 32.
- **Principle the sources share:** *a colour token is chosen by what it is for (text, border, surface; default,
  muted, danger), not by what it looks like today.* Two tokens can share a value in one theme and differ in another.
- **Sources:**
  - Atlassian: "Choose tokens based on meaning where applicable, not specific values." And: "Don't use a token just
    because the colors appear to match. This can break the experience in other themes."
    ([design tokens](https://atlassian.design/foundations/tokens/design-tokens))
  - Primer: "Base color tokens don't respect color modes and should never be used directly in code or design."
    Functional tokens "represent global UI patterns such as text, borders, shadows, and backgrounds."
    ([color usage](https://primer.style/product/getting-started/foundations/color-usage/)) Its lint rule expects a
    text token on `color` and a background token on `background-color`.
    ([plugins](https://github.com/primer/stylelint-config/blob/main/plugins/README.md))
  - Carbon keeps colour auto-fix off by default: "Color auto-fix is experimental because colors can be ambiguous."
    ([README](https://github.com/carbon-design-system/stylelint-plugin-carbon-tokens/blob/main/README.md))
  - Linode: global tokens "shouldn't be used directly in application code"; semantic ones are "the correct choice for
    theme-aware color". (same guide as above)
- **What it implies:** read the job first (the property being set, and the token's role), then compare values. This
  is the owner's own model for a single decision: role, where it sits, nearest token. The distance of 32, and plain RGB
  as the measure, have no source.
- **Not checked:** the drift side on the server already filters tokens by where they may be used; how far that
  matches this principle was not read.

## 6. A new token, named by its job, when nothing fits — partly

- **Backed, the naming:** tokens are named for purpose, in a fixed structure. Primer: names are built from blocks
  (namespace, pattern, variant, property, scale) and "the property value is always required".
  ([token names](https://primer.style/product/primitives/token-names)) Plumber's `--tracking-caps` (family, then job)
  fits that shape.
- **No source:** *when* a value deserves to become a token, and that its value should be the standard's target.
  The page most likely to answer it (Nathan Curtis, "Tokens in Design Systems") could not be opened (403). Until a
  source is read this is a guess, and it is the decision this morning's removed changes were trying to make.

## 7. Advice when no edit is safe — backed

- **Principle:** a tool that cannot make a safe edit says what it sees and leaves the change to the person.
- **Source:** ESLint: "In some cases fixes aren't appropriate to be automatically applied." Carbon and Primer report
  without a fix for the same reason (see 2 and 5).

## 8. Not looked at yet

How one finding wins over another on the same element, the confidence floor (0.8), the unsure band (0.7), and trying
a fix before offering it. One note for that pass: ESLint says "Only make one fix per message" and "Make fixes as
small as possible"; plumber stacks two rules' edits into one.

## Pages that could not be read

- Salesforce's linter rule reference (403). Its README mentions "deterministic and semi-deterministic" tiers of
  colour fixes without defining them; worth reading for decision 5.
- Nathan Curtis, "Tokens in Design Systems" (403), for decision 6.
- Material 3's token page (404 at the address tried).
- Atlassian's "use tokens in code" page came back empty.
