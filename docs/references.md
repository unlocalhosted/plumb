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

## 2026-11-12 · Screenshot: labels printed over each other on crafting-ui's hero (shared by the owner)
- What: a screenshot of crafting-ui's home page in a narrow window with the pointer on the headline: the guide labels "cap height" and "x-height" overlap, and the readout "… Geist medium" runs straight into the hint "Grab a letter and pull…". Shared in chat; no file kept.
- Why: the owner's words: "can you see this overlap , how come plumber couldn't detect it ?"
- What it changed: plumber had no check for words meeting words. It has one now. It also showed that plumber only judges the state and width the page is in when read.
- Used in: overlay/src/craft-rules.js (craft/text-collision); e2e/craft-collision.test.mjs; journey entry "Words that run into other words".

## 2026-11-12 · Material 3 duration tokens; the Weber fraction for time intervals (found by us)
- What: [Material Design 3, easing and duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs): durations as named short, medium and long steps. Grondin, "From physical time to the first and second moments of psychological time", Psychological Bulletin 127(1), 2001 (and Getty 1975): people tell two time intervals apart only when they differ by about 5–20%.
- Why: to ground a timings pass: durations are a system's named decisions, and two within a fifth of each other are one speed to anyone watching.
- What it changed: the timings pass folds a hand-written duration into the named speed within a fifth, and leaves anything further.
- Used in: overlay/src/speeds.js; docs/briefs/pass-motion.md; journey entry "Timings: the eighth clean-up pass".

## 2026-11-12 · Material 3 interaction states: disabled at 38% (found by us)
- What: [Material Design 3, interaction states](https://m3.material.io/foundations/interaction/states): disabled content at 38% opacity; hover and pressed as state layers over the content colour.
- Why: to ground one disabled look for an app whose theme names none.
- What it changed: the disabled-look pass puts every disabled opacity on the theme's value or on 40% (Material's 38% on the nearest framework step).
- Used in: overlay/src/states.js; docs/briefs/pass-states.md; journey entry "The disabled look: the ninth clean-up pass".


## 2026-11-13 · Modern Web Guidance, the source repo (shared by the owner)
- What: [GoogleChrome/modern-web-guidance-src](https://github.com/GoogleChrome/modern-web-guidance-src): guides for coding agents on what the web platform now does natively, each tied to browser-support (Baseline) data; a scanner that finds legacy patterns in source; stewarded, by its README, by the Chrome, Edge, Firefox and MDN teams. Apache-2.0.
- Why: the owner's words: "please plan on architecture level how can we bring these things into plumber".
- What it changed: a design for a third way plumber looks, beside drift and craft: "you built by hand what the browser now gives you". Their guides are the ground, their Baseline data gates every suggestion that uses a modern feature (existing craft suggestions too), and plumber checks their source hits against the running page. Nothing built yet.
- Used in: docs/briefs/platform-guidance-lld.md; journey entry "A third way of looking: what the browser does now".
- Shared again 2026-11-13, as the answer to "where are you bringing these rules from?": "i hope they are coming from here". It is now the source of every rule in plumber's new packs: the published package (modern-web-guidance 1.0.0) read for the accessibility pack, whose first rule cites its accessibility guide section by section (docs/briefs/rule-packs.md, journey entry "Kinds of rule as packs; the first one from Chrome's guides").

- **2026-11-13 · maybepratikk, bold-on-hover tabs video** (~/Downloads/twitter_media_harvest/maybepratikk-2121151672756138484-01.mp4) · *shared by the owner*.
  Why: "our showcase is being rushed … we don't show the problem very well, we rush the fix and don't have good payoff … understand the demo delivery from there how to showcase a rule fix and please bring it."
  What it changed: the stage's storyboard v2 in docs/craft/stage-brief.md: the fault seen live first, measured with the gesture repeated and the cause in words, the fix's working drawn, then the same gesture on every instance reading zero.

## 2026-11-14 · tla-ts, a TLA+ model checker in TypeScript (shared by the owner)
- What: [aidenybai/tla-ts](https://github.com/aidenybai/tla-ts) (MIT): runs TLA+ specs and checks invariants over every reachable state, in Node or the browser; also compiles a small subset of TypeScript (variables as state, exported functions as actions, boolean functions as invariants) to a spec and checks it. Read: its README only.
- Why: shared while the checks' correctness was being measured. The owner's words: "whether this package can be used for enforcing correctness accuracy and truthfulness in the rules across the rules and in the system".
- What we took from it (ours, not a copy): a model checker proves things about a model with a small state space. In plumber that is the state logic: two processes writing the ledger, two Applies at once, the kept analysis and its start-up check, one verdict per element. It cannot say whether a check is true of a real page: the checks read a real browser's layout, which no model holds. For the checks, the same idea is applied to the real code instead: every small combination generated and the properties checked (asked by kind equals asked everywhere; a near miss is quiet; taking a check's advice silences it and wakes no other).
- Used in: journey entries "Are the checks right, and does the engine keep what they find?" and "The lock, put to a model checker"; specs/lock/ holds the two models. First run found a way for two processes to hold the ledger's lock at once.

