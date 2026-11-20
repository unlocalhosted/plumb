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
- Shared again 2026-11-13, as the answer to "where are you bringing these rules from?": "i hope they are coming from here". It is now the source of every rule in plumber's new packs: the published package (modern-web-guidance 1.0.0) read for the accessibility pack, whose first rule cites its accessibility guide section by section (docs/briefs/rule-packs.md, journey entry "Kinds of rule as packs; the first one from Chrome's guides").

- **2026-11-13 · maybepratikk, bold-on-hover tabs video** (~/Downloads/twitter_media_harvest/maybepratikk-2121151672756138484-01.mp4) · *shared by the owner*.
  Why: "our showcase is being rushed … we don't show the problem very well, we rush the fix and don't have good payoff … understand the demo delivery from there how to showcase a rule fix and please bring it."
  What it changed: the stage's storyboard v2 in docs/craft/stage-brief.md: the fault seen live first, measured with the gesture repeated and the cause in words, the fix's working drawn, then the same gesture on every instance reading zero.

## 2026-11-14 · tla-ts, a TLA+ model checker in TypeScript (shared by the owner)
- What: [aidenybai/tla-ts](https://github.com/aidenybai/tla-ts) (MIT): runs TLA+ specs and checks invariants over every reachable state, in Node or the browser; also compiles a small subset of TypeScript (variables as state, exported functions as actions, boolean functions as invariants) to a spec and checks it. Read: its README only.
- Why: shared while the checks' correctness was being measured. The owner's words: "whether this package can be used for enforcing correctness accuracy and truthfulness in the rules across the rules and in the system".
- What we took from it (ours, not a copy): a model checker proves things about a model with a small state space. In plumber that is the state logic: two processes writing the ledger, two Applies at once, the kept analysis and its start-up check, one verdict per element. It cannot say whether a check is true of a real page: the checks read a real browser's layout, which no model holds. For the checks, the same idea is applied to the real code instead: every small combination generated and the properties checked (asked by kind equals asked everywhere; a near miss is quiet; taking a check's advice silences it and wakes no other).
- Used in: journey entries "Are the checks right, and does the engine keep what they find?" and "The lock, put to a model checker"; specs/lock/ holds the two models. First run found a way for two processes to hold the ledger's lock at once.


## 2026-11-15 · Lovable's sidebar redesign, marked up by a critic (shared by the owner)
- What: a screenshot of Lovable's "Nobody likes a messy sidebar" post (before and after of their sidebar) with a designer's red notes on the "After": 1. uneven side padding (the rows sit closer to the right edge than the left); 2. the left edge gets messy because the project icons are bigger and placed differently from the other icons; 3. "Projects" and "See all projects" look like the same destination, and "See all projects" is the only clickable thing in light text, so it reads as a section heading. Image: docs/references-media/2026-11-15-lovable-sidebar-critique.webp.
- Why: the owner's words: "how can i add this kind of taste judgement in plumber ?"
- What it changed: nothing built yet. The reading: all three notes are one kind of judgement plumber has little of today, "a group that should agree, and one member that doesn't" (the rows of one list, the clickable things of one panel), where today's craft checks mostly judge one element against a number. Proposed: a group-agreement way of looking with four checks (even side insets, one text edge and one icon slot per list, one look per role, two doors to one place).
- Used in: not yet.

## 2026-11-15 · Chris Frantz on GitHub's new pull-request page, with guides drawn (shared by the owner)
- What: a post by @frantzfries (2026-11-12): "new GitHub PR ui is stressing me out, nothing is aligned to anything". The screenshot has thin blue vertical guides drawn through the page's top bar, the review toolbar, the row under it and the side column: about seven guides, most touched by one thing only, several a few pixels apart. Image: docs/references-media/2026-11-15-github-pr-guides.png.
- Why: the owner's words: "one more post for example", after asking whether plumber should have "a concept of guardrails to see the alignment vertically about different things" and "how a ux expert think about these things, what is the tacit knowledge he applies".
- What it changed: nothing built yet. With the Lovable sidebar critique above, it is the second case for guides as the first piece of plumber's picture of a page. What this one adds: the lines that matter run across separate bars and regions, not inside one list; right edges count as much as left ones; and the verdict for a whole screen can be read from the guides alone (many guides, each with one member, close together).
- Used in: not yet.

## 2026-11-15 · Karri Saarinen on rhythm, with Linear's sidebar and its guides (shared by the owner)
- What: a reply by @karrisaarinen (Linear's co-founder, 2026-11-08), read only as far as the screenshot shows (it is cut at "Show more"): "there should be vertical/horizontal rhythm. Either be left-right positioning, or centering. So first top bar should be aligned or vertically centered with the traffic lights. the left side panel should have padding and either left icons aligned or centered". Below it, Linear's sidebar with four red dashed vertical guides: the window buttons, the row icons and the section headings start on one line, the labels on the next, the trailing things (search, compose, the count) end on one at the right. Image: docs/references-media/2026-11-15-karri-linear-sidebar-guides.png.
- Why: the owner's words: "one more", the third example for guides.
- What it changed: nothing built yet. It is the good case beside the two bad ones (Lovable's sidebar, GitHub's pull-request page), and a practitioner's own statement of the principle, so a first source for it. What it adds: a thing may relate to a guide in two ways, its edge on it or its centre on it, and a screen picks one; guides run both ways (the top bar is centred on the window buttons' row); a nested level gets its own guide, one step in.
- Used in: not yet.

## 2026-11-15 · The replies under the three alignment posts (found by us, at the owner's ask)
- What: about 260 replies read under Karri Saarinen's critique of a vibe-coded app (https://x.com/karrisaarinen/status/2119319835759046847, with his full follow-up and his own redraw), Chris Frantz's GitHub post (https://x.com/frantzfries/status/2120585982185799935) and Lovable's sidebar post (https://x.com/Lovable/status/2120579105683026214).
- Why: the owner's words: "read through the discourse and understand what people needs and how they think about it".
- What it changed: six needs, written up with the quotes behind each in docs/research/alignment-discourse.md: people feel misalignment before they can name it and the drawn lines name it; they want it found for them and fixed by their agent; the fault sits between parts that are each fine; the public now reads misalignment as the mark of AI-written UI; a guide must be defensible (why these things relate, other window widths, things anchored on purpose); alignment is the way in to deeper complaints about purpose and duplication. Saarinen's full post also names Apple's Human Interface Guidelines as his source.
- Used in: docs/research/alignment-discourse.md.

## 2026-11-15 · lintapple, a UI linter for rendered pages (found by us in the replies, then shared by the owner)
- What: [gholtzap/lintapple](https://github.com/gholtzap/lintapple) (MIT, 600 stars, first commit 2026-10-07): "It should be impossible for AI to make a bad UI." A command and a Playwright helper that open a running page and check it against a fixed policy file. Recommended in a reply under Karri Saarinen's critique (69 likes). Read: its README, its list of 31 rules, its default policy, its instructions for agents, and its source: the page checker, the visibility, report, entry and accessibility files in full; the interaction file in part; the menu-and-tabs, tooltip-scan and SVG-contrast files only skimmed. Not installed, not run, at the owner's word ("no dont run read the source code"). What plumber lacks beside it is listed in docs/backlog.md under "Seeing a screen whole".
- Why: the owner's words: "you can see what does lint tool does is it better than plumber in any way and we can bring any of such capabilities". The owner then sent its link directly (after first pasting an unrelated skills repository by mistake).
- What we took from it (ours, not a copy): it is the linter plumber says it is not: fixed numbers in a policy file (8px minimum gaps, a list of allowed text sizes), and its alignment check only works on groups a person has marked by hand in the markup, so it would not have found any of the three screens above. Plumber's own headless run already reads a page at desktop and phone size, in dark, across a sweep of widths and under recorded gestures, and has a command with output for agents, so those are not gaps. Where lintapple is ahead, from a skim of plumber's side: named states reached by a written plan (click this, type that, then check the screen that results, such as an open dialog or an error); keyboard behaviour (a tooltip opens on focus and closes on Escape, a dialog holds focus and gives it back, tabs and menus answer the arrow keys); what it could not measure is counted and listed apart from what passed, everywhere; one problem seen at several sizes and states is reported once with the places it occurred; and a short contract for coding agents (run it on every changed screen, never loosen the policy to pass).
- Used in: not yet.

## 2026-11-18 · A frontend CI under two minutes (shared by the owner)
- What: a post the owner pasted, no link: a team's frontend CI cut to under 2 minutes by moving tsc to bun check,
  oxlint with every rule on, shards filled by recorded test time, PRs running only the tests the diff can reach, and
  lint, typecheck, build and tests running in parallel.
- Why: the owner's words: "can we expedite our vm agent test suite as well ? also do you run all tests again and
  again as well ?" Asked while the full suite was running on vm-agent (215 files, about 35 minutes).
- What it changes for us: our runner already runs files side by side inside a core and memory budget, but it orders
  them by cost tier, not recorded time, builds before testing instead of alongside, and runs every file every time.
  The two that would matter most here: running only the tests a change can reach, and scheduling by recorded time.
- Used in: proposed, not built (docs/backlog.md).
## 2026-11-15 · "Three ways to break a screen before your users do" (shared by the owner)
- What: a short post, pasted as text without its author or link: double the length of every label; turn the system text size all the way up; make the main action fail.
- Why: the owner's words: "Where can we adapt this system in plumber and what's the most intuitive ux to bring this".
- What it changed: nothing built yet. The first toy, Longer words, is built (Alt+S); the rest are written up in docs/backlog.md under "Breaking a screen on purpose".
- Used in: overlay/src/breakit.js; journey entry "Breaking the screen on purpose: longer words".
- **2026-11-13 · A type-design construction view ("Aero")** (docs/design/refs/construction-view-aero.png) · *shared by the owner*.
  Why: "one polish add this kind of effect to p". The glyphs drawn as a type designer sees them: a hairline outline,
  every on-curve point a small black square, the curve handles as lines ending in dots, a fine vertical hatch for the
  fill, and the metric lines (cap height, baseline, side bearings) running edge to edge.
  What it changed: React Plumber's P gets a construction view (docs/design/comps/logo-construct.html), the mark drawn
  the way plumber sees a page: by its points, edges and guides.

## 2026-11-15 · declauding v0.13.0, a skill that takes the LLM tics out of prose (shared by the owner)

- **What:** https://github.com/oaustegard/claude-skills/releases/tag/declauding-v0.13.0, by oaustegard. It lists the constructions that mark prose as model-written (staged reveals, verdict headers, aphoristic closers, "it's not X, it's Y", forced triads, noun stacks) and rewrites them as plain prose. It comes with a linter and a diff that checks no claim was lost.
- **Why the owner shared it:** after the film words read like a robot ("fills 78.5% of its box"): "fucking use this for anytime you are asked to write".
- **What it changed:** it is installed globally (~/.claude/skills/declauding, without its stop hook, which needs subagents), and ~/.claude/CLAUDE.md now says every written piece goes through it, film scripts and on-screen words included.
## 2026-11-18 · landmines, lint rules against AI-written test shortcuts (shared by the owner)
- What: [interfere-inc/landmines](https://github.com/interfere-inc/landmines) (MIT, by Interfere): ten rules for the
  oxlint linter aimed at code written by coding agents. Five are about tests (no mocks or stubs, no fixed sleeps, no
  retries or raised time limits, no polling a spy, strict network mocking), one bans prose comments, three are about
  where tests live and what they are called, and one bans written return types. Installed with npm into a scratch
  folder (oxlint 1.81.0 and the package at its published 0.0.0; the repository says 0.1.0), nothing added to the
  project, and run on the roast branch at 022a5b5b.
- Why: the owner's words: "install this and see what trash we have".
- What it found: 12,068 findings over 1,016 files in 3 seconds. Almost all is a clash of house style, not trash:
  10,183 are comments (prose explaining why; a grep found no commented-out code) and 1,416 are written return types
  in the engine. 415 are per-test time limits in 144 end-to-end files; Node's test runner has no limit by default,
  so these are caps against a hung browser, not raised limits, though 32 tests allow ten minutes. The useful part is
  small: 45 fixed sleeps in end-to-end tests (about ten are waits with no signal behind them, such as sleeping 2.2
  seconds because the overlay keeps an index for two), a hand-written retry loop in five clean-up tests that swallows
  navigation errors up to four times, and one real fake (a test replaces `fs.watch`). Full sorting in the journey entry "landmines and anti-slop on our code".
- Used in: journey entry "landmines and anti-slop on our code". Nothing fixed yet.

## 2026-11-18 · anti-slop, lint rules against weak TypeScript evidence (shared by the owner)
- What: [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) (MIT, by Dillon Mulroy, read at 13909c9):
  eighteen oxlint rules plus five for the Effect library, which plumber does not use. They reject types that claim
  more than the code knows (`as unknown as X`, `unknown` in and out of functions, open `Record<string, unknown>`),
  `typeof` checks in place of parsing at the edge, mocked modules, filter-then-map, and missing blank lines. It ships
  no npm package and asks to be copied into the project; we did not copy it. We cloned it into a scratch folder,
  installed oxlint 1.81.0 and its plugin API beside it, and pointed oxlint at the clone, with the README's rule list.
- Why: the owner's words: "also this as well", after landmines.
- What it found: 26,214 findings over 1,016 files in 3 seconds. 23,528 are blank-line spacing, which conflicts with
  our dense one-line style. Then 828 type assertions without a written reason, 596 `typeof` checks, 468 conditional
  `{}` spreads (our usual way to leave out an optional field), 181 names containing "shape". The real part: 75
  double casts through `unknown` in 37 engine files, most of them to read a syntax tree node as an open record;
  one passes `undefined` as a whole project report (guarded at runtime, but the type lies); 28 functions that return
  `unknown`; 3 lists rebuilt by spreading inside a loop. Sorted in the same journey entry.
- Used in: journey entry "landmines and anti-slop on our code". Nothing fixed yet.

## 2026-11-19 · unslop-ui, rules for the marks of a generated interface (shared by the owner)
- What: [felipebasurto/unslop-ui](https://github.com/felipebasurto/unslop-ui) (MIT, by Felipe Basurto, read at main
  on 2026-11-19): an agent skill with 20 rules (U1 to U20) for cutting generated-looking copy and decoration, a
  regex counter over source files, and eval fixtures with expected answers. It carries the pstack unslop writing rules
  (Lauren Tan, MIT).
- Why: the owner asked whether its checks could move into plumber deterministically, and whether a model could take
  the cases that need reading.
- What it changed: plumber's `tells` pack, 17 rules read off the drawn page, with its real-state test applied to the
  source line ([journey](journey.md#tells-marks-of-a-generated-screen-read-off-the-page-2026-11-19)). Its example
  screens became `bench/tells/App.jsx`. Nothing of its text was copied.

## 2026-11-19 · local-evidence, the owner's model service on vm-agent (pointed at by the owner)
- What: a FastAPI server in web-absorb (`~/projects/web-absorb/infra/local-evidence/app.py` on vm-agent, version
  1.2.0), on the private docker network at port 8080. `/embed` returns all-MiniLM-L6-v2 vectors (384 numbers, unit
  length) for up to 32 texts. `/evidence` tags text with GLiNER2 small (fastino/gliner2.5-small-v1) against a fixed
  list of page labels (navigation, advertisement, signup and others).
- Why: the owner said a model endpoint was already on vm-agent, to use for the tells that need reading.
- What it changed: the subtitle check in the tells pack scores heading and subtitle pairs with `/embed`
  ([journey](journey.md#subtitles-that-repeat-the-heading-a-model-on-vm-agent-judges-them-2026-11-19)).

## 2026-11-20 · Dead Cells, procedural levels from authored rooms (shared by the owner)
- What: the game Dead Cells (Motion Twin), named by the owner in words; its levels are hand-made rooms arranged by a
  generator to fill a hand-made graph of what a level must hold.
- Why: "like how in games they create procedural stages like dead cells", for a generator that shows one card many
  ways with a reason behind each.
- What it changed: the organism generator brief is built on the same split: authored specimens, a job graph, and a
  generator that only arranges them under rules from a seed
  ([brief](briefs/organism-generator.md), [journey](journey.md#36-an-organism-generator-that-borrows-taste-and-draws-in-ours-2026-11-20-a-brief)).

## 2026-11-20 · Picbreeder, choosing to steer generation (found by us)
- What: Picbreeder (Secretan, Stanley and others), where people breed images by picking the ones they like.
- Why: a model for how the owner's keep and never picks should steer the generator over time.
- What it changed: the keep and never weights in the organism generator brief. Nothing built.

## 2026-11-20 · beui.dev, uiarc.dev and bencho.dev, component sites to learn taste from (shared by the owner)
- What: [beui.dev](https://beui.dev/), [uiarc.dev](https://uiarc.dev/) and [bencho.dev](https://bencho.dev/), three component sites
  the owner pointed at while the first pricing-card specimens were being collected.
- Why: the owner's words: "you could look into" and "few more suggestions", as sources for the organism generator's
  shelf of references.
- What it changed: all three are mostly animated and interaction components (beUI: "Animated components for React
  and React Native", MIT; Bencho: "micro-interactions"), so they belong to the later motion brief. Their own pricing
  pages gave two of the first five specimens (Arc's lifetime and Free cards, Bencho's Forever card)
  ([journey](journey.md#37-five-real-pricing-cards-written-down-as-specimens-2026-11-20-organism-generator-layer-1)).

## 2026-11-20 · Linear and Supabase pricing pages (found by us)
- What: [linear.app/pricing](https://linear.app/pricing) (Basic plan) and [supabase.com/pricing](https://supabase.com/pricing)
  (Pro plan), read on 2026-11-20 at 1280×900.
- Why: two pricing cards with structures unlike the others: a name-led card with no box, and a card that puts its
  button before its price.
- What it changed: two of the first five specimens (`generator/specimens/pricing-card/`).

## 2026-11-20 · Interface Craft's design critique (asked for by the owner)
- **What:** the Design Critique method in the interface-craft skill (Josh Puckett), `~/.claude/skills/interface-craft/design-critique.md`.
- **Why:** the owner asked for it on Blueprint's open UX calls ("please ask /interface-craft about the ux thing").
- **What it changed:** its read put one count first: the bar counted places (197) while Fix stepped through fixes (49), so the number could not be worked through and did not drop. The owner chose its ranked list: count fixes, roll the count as fixes land, room under the page for the bar, a Space hint at the moment a click lands on a note. Used in [the fifth batch](journey.md#the-fifth-batch-one-count-room-for-the-bar-2026-11-20).

## 2026-11-20 · libraries.dev effects, by Jakub Antalik (shared by the owner)
- **What:** [libraries.dev/metal](https://libraries.dev/metal) and its siblings: Metal (liquid chrome on buttons, icons,
  text; a cursor that bends it; reflections on neighbours), Border beam (a glow riding the border, rotate or pulse),
  Gooey (pieces that merge like goo and morph like jelly, text stays crisp), Distortion waves (a wave that carries one
  screen into the next from the touched button), Thinking orbs (nine waiting states), Image FX (a pixel mosaic that
  dissolves into the result), Magnetic UI (a phone's magnetometer as input). All on npm under MIT: `metal-fx`,
  `border-beam`, `liquid-gooey`, `distortion-waves`, `thinking-orbs`, `img-fx`.
- **Why:** the owner: "we can also inherit a lot of primitives which we can apply to a different buttons from here …
  metal, distortion, magnetic ui, gooey, border beam … applied and composed in variety of ways and can also be used
  individually but again the taste lies where you put it with what motion and all".
- **What it changed:** the recommendations get effects as primitives with a meaning each (a material, an edge, a
  response, a hand-off, a wait), composed by rules of where they belong: [docs/briefs/effect-primitives.md](briefs/effect-primitives.md).

## 2026-11-20 · Design slop indicators (shared by the owner)
- **What:** the owner's own list of marks on generated pages: tags, italicized words, Instrument Serif and negative
  kerning, over-the-top detailed UI, dividers, many colour shades and opacities, containers with borders, diagrams
  (the more detailed, the worse), code breadcrumbs, section numbering, all caps on subtitles, eyebrows.
- **Why:** "this a list of ai slop item i found"; then "see if we have them anywhere or we can put them in anti ai slop".
- **What it changed:** three were already checked (eyebrows, section numbering, flavour badges); eleven new
  Anti-slop checks cover the rest, with this list as their source. Used in
  [entry 56](journey.md#56-the-owners-slop-list-becomes-eleven-anti-slop-checks-2026-11-20).
