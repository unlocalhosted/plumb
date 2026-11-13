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

Everything shared or found that shaped the work: what it is, why, what it changed, and where it was used.

| Date | What | Shared by | Why | What it changed / where used |
|---|---|---|---|---|
| 2026-11-05 | [aidenybai/bippy](https://github.com/aidenybai/bippy/) — the library React Plumber uses to read React's internals | the owner | "check it out and see if i can fork and utilise anything which will make react-fork even more powerful" | Researched; not forked. Its main branch's path cleanup is the useful part (`docs/research/bippy-branches.md`); led to "find the line" being fixed in our own locator (Chapter 1) |
| 2026-11-05 | [tailwindlabs/tailwindcss.com](https://github.com/tailwindlabs/tailwindcss.com) @ 7f92c22 | found by us | a real, mostly server-component Next 16 + Tailwind v4 app (source licensed for education only; no code committed) | locate bench corpus; README numbers (Chapter 1) |
| 2026-11-05 | [magicuidesign/magicui](https://github.com/magicuidesign/magicui) `apps/www` @ 37ce829 | found by us | a real Next 15 monorepo app full of library-drawn animation components | locate bench corpus; found the monorepo `components/` miss and Next's per-route cost (Chapter 1) |
| 2026-11-05 | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) `apps/v4` @ 8a35366 | found by us | the largest real Next 16 UI surface | measured once on Turbopack; dropped after it used ~10 GB (Chapter 1) |
| 2026-11-05 | Debuggers and devtools (gdb/lldb line tables, Ghidra, source maps and Sentry debug IDs, Istanbul, React DevTools, LocatorJS) | found by us | patterns for mapping running code back to source | `docs/research/meta-tool-patterns.md`; the "Patterns we hold to" section of `docs/briefs/stamping-everywhere.md` |

Everything shared or found as a reference for React Plumber: what it is, why, what it changed, where it was used.

## 2026-11-10 · BoardUI's token spec pages · shared by the owner

- **What:** two documentation pages of the BoardUI component kit:
  [Color](https://www.boardui.com/components/color) and [Typography](https://www.boardui.com/components/typography).
- **Why they shared it:** "i like this kit part also please borrow this kind of spec". They wanted our design system
  written down the same way before any more work, so the language doesn't drift.
- **What the format is:** each page opens with "How the system works" (the layers, the naming rule, why parts only use
  the top layer), then a short card on theming with three numbered rules, then one section per role with a table of
  token, class, light value and dark value. Typography shows each style with its size and line height, what it is for,
  and a specimen per weight beside the class that sets it.
- **What it changed here:** the kit got spec pages in that shape, read from our own token file so they can't drift:
  `overlay/demo/kit-color.html` and `overlay/demo/kit-type.html`, with `overlay/demo/kit-tokens.js` doing the reading.
  Ours adds two things theirs doesn't have: what each hue *means* (the toy language's table) and a "what is still
  open" list at the end of each page.
- **Where it was used:** journey, Chapter 3.

## 2026-11-10 · The burst when a fix lands · found by us (the owner pointed at it)

- **What:** the pieces that fly out of the fix panel when a write lands (`overlay/src/fixpanel.js`, `#burst`): a hatched
  green square, purple stripes, an orange dotted circle.
- **Why:** the owner, on the first grey icon proposals: "i wanted colorfull you already created few good ones with
  different colors and solid like for marging padding spacing the ones which appears when we apply the fixes".
- **What it changed here:** it became the source of the visual language (`docs/design/visual-language.md`) and of the
  toy icon set (`overlay/demo/toys.js`).

## 2026-11-10 · Bricolage Grotesque and Instrument Sans · found by us

- **What:** two open typefaces from Google Fonts: [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque)
  and [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans).
- **Why:** the owner, on the raised key with rounded lettering: "isn't these like overused to hell and like look like
  just every other playful product. we don't have any unique identity here similar to what we have in terms of our
  icons." Three candidates were put side by side on the design site's identity page.
- **What it changed here:** tried across the whole site, then made heavier, then kept ("Keep Bricolage"). Fredoka and
  Nunito are gone from the site.
- **Where it was used:** `web/app/layout.jsx`; journey, Chapter 3, entry 9.

## 2026-11-10 · A drag slider with a rolling number · shared by the owner

- **What:** a short clip of a pill slider ("2 days" … "7 days"): a dark fill stretches as you drag, the number in it
  rolls with a blur as it changes, the drag keeps working with the pointer well below the control, and the fill
  gives a little past the end. `~/Downloads/twitter_media_harvest/nitishkmrk-2119695845679665608-01.mp4`
  (https://x.com/nitishkmrk/status/2119695845679665608).
- **Why they shared it:** "the drag control should allow me to drag all over, and the drag should feel like an
  interface in itself, it should give me feedback and change values like a slider." Then: keep the dropdown, but
  dragging gets "a drag mode", "going across the value in a vertical manner... rolling updates in the field... going
  up and down across the options".
- **What it changed here:** the token picker's value became a reel: press and drag anywhere, the options roll past
  in the field with a blur at speed, neighbours open above and below, it gives past either end and settles on
  release. Journey, Chapter 3, entry 11.

## 2026-11-10 · BoardUI colour spec (shared by the owner)
- **What:** https://www.boardui.com/components/color: a two-tier colour system (primitives, then semantic tokens named
  `--color-<group>-<role>-<state>`), tables of Token / class / Light / Dark per group (Foreground, Text, Background,
  Border, Graphs, State).
- **Why shared:** "can we write our color spec similar to … it would be better if we state all possible state tokens
  like background and what not".
- **What it changed:** our token file gained a role-and-state tier (`--pl-text-*`, `--pl-icon-*`, `--pl-bg-*`,
  `--pl-border-*`, `--pl-action-*`, `--pl-done-*`, `--pl-danger-*`, `--pl-quiet-*`, `--pl-state-*`, `--pl-mark-*`), and
  the Colour page shows it as Token / What it is for / Light / Dark tables above the palette. Journey chapter 21.

## 2026-11-13 · transitions.dev (shared by the owner, by name)
- **What:** https://transitions.dev, Jakub Antalik's library of crafted UI transitions (CSS/React snippets, a CLI, a skill).
- **Why the owner shared it:** "make the DOM thing guardrails appear transition in and transition out slowly ... use transition.dev library".
- **What it changed:** the homepage examples' marks use its Panel reveal recipe (fade, cross-blur, a small rise, ease 0.22 1 0.36 1) and its Number subtle change idea, their tokens slowed (in 900ms, out 1000ms); copied as snippets, nothing installed. Used in homepage/src/sections/insights.css (the --t-* tokens). Journey: chapter 25+, "slow on purpose".

## 2026-11-13 · "Abstract warm orange orb on blue gradient background" by mymind on Unsplash (found by us, at the owner's ask)
- **What:** https://unsplash.com/photos/XUlsF9LYeVk, a free photo under the Unsplash License, hotlinked from images.unsplash.com as Unsplash asks.
- **Why:** the owner: "use image from Unsplash to have like a good abstract art ... to really sell the illusion of the card".
- **Where used:** the album example's cover ("Low Tide"), homepage/src/sections/insights.css.

## 2026-11-13 · Four more Unsplash photos for the homepage examples (found by us, at the owner's ask)
All free under the Unsplash License, hotlinked from images.unsplash.com as Unsplash asks; used in homepage/src/sections/insights.css.
- **A lake among green mountains:** https://unsplash.com/photos/z_f2JrBRbOg, the optical-centre card's video still.
- **A white building with blue glass:** https://images.unsplash.com/photo-1523274158540-2aa98c15ec26, the widow card's news photo.
- **A table with a pink cake and macarons:** https://unsplash.com/photos/7wqE3mKvkm0, the coloured surface under the tinted-shadow card.
- **A white vase on a white table:** https://unsplash.com/photos/aFvxASlms2A, the pale photo in the inner-outline card.
- **Why:** the owner: "use image from Unsplash ... to really sell the illusion of the card".


## 2026-11-13 · Apple's iPhone Duo page, "Get the highlights" carousel (shared by the owner, a screenshot)
- **What:** https://www.apple.com/in/iphone-duo/, the highlights carousel: one large card at a time, a two-line headline above a big visual, the next card peeking from the right, a pill of dots under it (the current one a progress bar) and a play/pause button; it advances on its own.
- **Why shared:** "I still don't like them, can we make them like a carousel like this?" (about the homepage's nine examples in a bento grid).
- **What it changed:** the examples became that carousel (journey, "the examples as a carousel"); homepage/src/sections/Insights.jsx and insights.css.

## 2026-11-13 · Modern Web Guidance, the source repo (shared by the owner)
- What: [GoogleChrome/modern-web-guidance-src](https://github.com/GoogleChrome/modern-web-guidance-src): guides for coding agents on what the web platform now does natively, each tied to browser-support (Baseline) data; a scanner that finds legacy patterns in source; stewarded, by its README, by the Chrome, Edge, Firefox and MDN teams. Apache-2.0.
- Why: the owner's words: "please plan on architecture level how can we bring these things into plumber".
- What it changed: a design for a third way plumber looks, beside drift and craft: "you built by hand what the browser now gives you". Their guides are the ground, their Baseline data gates every suggestion that uses a modern feature (existing craft suggestions too), and plumber checks their source hits against the running page. Nothing built yet.
- Used in: docs/briefs/platform-guidance-lld.md; journey entry "A third way of looking: what the browser does now".
