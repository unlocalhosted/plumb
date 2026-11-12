# References

## 2026-11-10 · BoardUI typography and colour (shared by the owner)
- What: [BoardUI typography](https://www.boardui.com/components/typography), [BoardUI colour](https://www.boardui.com/components/color).
- Why: the owner felt it is "much better and scalable system for large scale" than the token system plumber suggests today.
- What it changed (corrected 2026-11-12: it is evidence to improve our spec, not a template): plumber's own token spec takes its weight axis, colour-out-of-type, three layers, fixed state words, surface levels, one-colour brand and one dark block; our derived roles and names stay. First pass wrongly moved to three layers (primitives → `category/role/state` semantic tokens → components), a named type ladder crossed with weight, colour kept out of type, one accent ramp from one colour.
- Used in: docs/design/token-spec.md, journey entry "Token spec follows BoardUI".

## 2026-11-12 · Defensive CSS tips (shared by the owner)
- What: [defensivecss.dev/tips](https://defensivecss.dev/tips/), 25 tips for CSS that survives content you don't control.
- Why: "lets improve our engine to bring these tips as suggestions".
- What it changed: each tip is weighed as a plumber rule, one at a time. First: Image distortion, now principle 78 (a picture is cropped to its box, never stretched).
- Used in: journey entry "Defensive CSS tips become suggestions: stretched pictures first".

## 2026-11-12 · Defensive CSS "Image distortion" demo (shared by the owner, two screenshots)
- What: the tip's own demo on defensivecss.dev: one photo of round pastries in a box with a "Resize me" edge and a "Toggle Defensive" checkbox; off, the pastries are pulled thin; on, they are cropped and round.
- Why: "we dont see the issue clearly in this component … in this before and after you can see the value … if you stretch the card itself to show how stretch to fill doesn't look good on small cards".
- What it changed: principle 78's demo screen. Taken: a large subject whose shape the eye knows, and a box the viewer resizes. Kept ours: a real product card (a trip day), plumber's switch, marks and fix. Not copied: its photo, layout, checkbox or words.
- Used in: overlay/showcase/src/principles/screens/78-detour-saved.jsx; journey entry "Rule 78's demo: a card you resize".

## 2026-11-12 · How design-system teams' tools decide a suggestion (found by us)
- What: the lint tools and docs of teams that run design systems, read for how they choose a fix: [ESLint's rules for fixes and suggestions](https://eslint.org/docs/latest/extend/custom-rules), [Atlassian's token rule](https://atlassian.design/components/eslint-plugin-design-system/ensure-design-token-usage/usage) and [token guidance](https://atlassian.design/foundations/tokens/design-tokens), [IBM Carbon's stylelint plugin](https://github.com/carbon-design-system/stylelint-plugin-carbon-tokens/blob/main/README.md), GitHub Primer's [stylelint plugins](https://github.com/primer/stylelint-config/blob/main/plugins/README.md), [colour usage](https://primer.style/product/getting-started/foundations/color-usage/) and [token names](https://primer.style/product/primitives/token-names), [Mozilla's spacing token rule](https://firefox-source-docs.mozilla.org/code-quality/lint/linters/stylelint-plugin-mozilla/rules/use-design-tokens/space.html), [Linode's token guide](https://linode.github.io/manager/development-guide/16-design-tokens.html), [Tailwind's ESLint plugin](https://github.com/francoismassart/eslint-plugin-tailwindcss/blob/master/docs/rules/no-unnecessary-arbitrary-value.md).
- Why: the owner: "there has to be some sort of industry practice and some sort of data by real engineers working on design system … this has to be the driving force."
- What it changed: nothing in code yet. It showed two of plumber's suggestion decisions go against practice (choosing one answer when several fit; choosing a colour by its value) and two have no source.
- Used in: docs/research/suggestion-sources.md; journey entry "The suggestion engine, checked against practice".

## 2026-11-12 · What a text style's role is, by the people who define them (found by us)
- What: [material-web's typography doc](https://github.com/material-components/material-web/blob/main/docs/theming/typography.md) (styles "are organized into roles that describe their purpose"), [MDN's HTML elements reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements) (what each tag says the text is), and Material's per-role wording read only second-hand (m3.material.io and Apple's typography page would not load).
- Why: to ground what plumber should read when it decides which text style a place is, after the owner's "there has to be a principle behind the suggestion".
- What it changed: nothing in code. It grounds the principle "a text style names a job; the size belongs to the job".
- Used in: docs/research/text-role-signals.md; journey entry "Text is folded by size alone".

## 2026-11-12 · Atlassian's radius tokens, named for jobs (found by us)
- What: [Atlassian Design System, Radius](https://atlassian.design/foundations/radius): each radius token is tied to a kind of element: "Supporting elements: labels, lozenges, timestamps, tags", "Interactive elements: buttons, inputs, text areas, selects, navigation items", "Containment elements: cards, in-page containers, floating UI".
- Why: to ground a radius decided by what the element is, after the owner's "there has to be a principle behind the suggestion".
- What it changed: plumber's new radius reading sorts elements into tag, control and card and gives each the theme's step for that job.
- Used in: overlay/src/radius.js; journey entry "Radius by job".

## 2026-11-12 · Control sizes as tokens, and one height per row (found by us)
- What: [Primer, size primitives](https://primer.style/product/primitives/size): one fixed height per control size (`--control-xsmall-size` 24px, small 28px, medium 32px, large 40px, xlarge 48px), read first-hand. Second-hand, from a search summary (the pages were not read; Nathan Curtis's "Size in Design Systems" returned an error): several systems' form-sizing guidance says controls in one row share a height.
- Why: the owner picked control sizes as the next primitive after text, spacing, colour, icons and corners.
- What it changed: plumber reads controls' heights and decides them against the project's spacing unit.
- Used in: overlay/src/control-size.js; journey entry "Control sizes".

## 2026-11-12 · Atlassian's elevation levels, named for what sits on them (found by us)
- What: [Atlassian Design System, Elevation](https://atlassian.design/foundations/elevation): raised is for cards; overlay "is reserved for a UI that sits over another UI": modals, dialogs, dropdown menus, floating toolbars; each level has its own shadow token.
- Why: to ground a shadow decided by what casts it, the next primitive after corners and control sizes.
- What it changed: plumber reads a shadow's caster as a card or something that floats, and gives it the theme's shadow for that.
- Used in: overlay/src/elevation.js; journey entry "Shadows by job".

