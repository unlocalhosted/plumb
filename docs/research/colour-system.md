# Colour system for "Clean up this page"

Spec for the colour pass. It answers the owner's two questions: is the pass backed by science and laws, and how does a colour on the page become a token. Docs only; no code changed.

How to read the sources. Each claim has a link. "Checked" means I opened the page this session. "Not checked" means the page would not render for my fetcher (Material 3 and Apple HIG are JavaScript pages), so the claim rests on prior knowledge and is marked so. A number I computed myself is marked "computed".

## 0. The answer in one paragraph

Today's resolver (`overlay/src/colours.js`) is a nearest-neighbour snap: it takes a colour, finds the closest token, and moves it if the distance is small enough. It never asks what job the colour does, and it trusts that the theme's tokens already are a good system. The fix is to put a **role system** first (section 2), **read** every colour on the page into a role by name, value and usage (section 4), and only then **resolve** per role with a stated threshold and reason for each kind of drift (section 5). Distance still decides "is this the same colour as that token". Role decides "which token should this be".

## 1. The science (short)

**1.1 OKLab is a working yardstick, not a measured JND scale.**
- Oklab was built so that distances predict perceived lightness, chroma and hue well. Ottosson reports lightness error 0.20 RMS against 1.70 for CIELAB, and the best chroma error of the spaces compared. His test data came from the CAM16 model, not from new human experiments, and the post gives no just-noticeable-difference (JND) number ([Ottosson, A perceptual color space for image processing](https://bottosson.github.io/posts/oklab/); checked).
- The "JND is about 0.02 in ΔE_ok" figure is folklore: it is the CIEDE2000 JND (about 2) divided by 100 because Oklab distances come out roughly 1/100 of ΔE00 ([Cirkel, too much color](https://www.keithcirkel.co.uk/too-much-color); search snippet) and a self-test page that offers no evidence ([Cirkel, What's my ΔEOK JND](https://www.keithcirkel.co.uk/whats-my-jnd/); checked). CSS Color 4 itself defines the ΔE_ok formula but I found no spec text giving 0.02 ([W3C CSSWG thread on the ΔEOK update](https://lists.w3.org/Archives/Public/public-css-archive/2024Mar/0390.html); not read in full).
- Consequence for Plumber: treat **0.02 as "just visible side by side, in a lab"** and say so. Our fold thresholds are design choices built on it (section 5), not measured facts.

**1.2 APCA says more than WCAG 2 about text.**
- WCAG 2's ratio is not perceptually uniform: it overstates contrast near black, so 4.5:1 can be unreadable with a near-black colour, and it cannot guide dark mode ([APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html); checked).
- APCA's lightness-contrast (Lc) steps, same page:

| Lc | Use |
| --- | --- |
| 90 | preferred for body text (14px/400 at the least) |
| 75 | minimum for columns of body text (18px/400, 16px/500, 14px/700) |
| 60 | minimum for other content text (24px/400, 18px/600) |
| 45 | large or heavy text, headlines (36px/400 or 24px/700) |
| 30 | placeholder and disabled text, large solid icons |
| 15 | non-text that must be seen (dividers, thick focus outlines); below 15 is invisible to many users |

- WCAG 2.2 still sets two rules APCA does not replace: UI component borders and state indicators need 3:1 ([SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html); checked), and colour may not be the only way meaning is carried ([SC 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html); checked).

**1.3 How many greys people tell apart, and why three text levels.**
- Honest finding: there is no study giving "N text greys in UI". Miller's 7±2 is about items held in memory, and Laws of UX itself warns it is not a limit on interface elements ([Laws of UX, Miller's law](https://lawsofux.com/millers-law/); checked).
- What the evidence does give: the contrast scale itself has about five usable text tiers (Lc 90 / 75 / 60 / 45 / 30, table above), and mature systems expose far fewer. Radix gives two text steps (11 at Lc 60, 12 at Lc 90, both guaranteed on a step-2 ground) ([Radix, Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale); checked). Apple has label / secondary / tertiary / quaternary ([Apple HIG, Color](https://developer.apple.com/design/human-interface-guidelines/color); not checked). Material 2 fades text to 87 / 60 / 38 percent ([Material 2 dark theme](https://m2.material.io/design/color/dark-theme.html); not checked).
- Reasoned convention, not a law: **three text levels** (primary, secondary, tertiary) is the smallest set that covers body, supporting text and metadata, and each level can sit in its own APCA band. A fourth level is separated from the third by less than a step people can name, so it adds effort without adding meaning. Say "convention" in the UI, not "science".

**1.4 Chroma and lightness by scheme.**
- Material's HCT keeps tone (lightness) as the contrast carrier and assigns separate tones to light and dark schemes; colour roles name the use, not the hue ("on-primary", not "on-blue") ([Android, Color](https://developer.android.com/design/ui/mobile/guides/styles/color); checked).
- Available chroma depends on hue and tone: yellow has little chroma at low tone, blue loses chroma capacity at light tones (same page, Figure 4 text). So "same chroma across hues" is not possible, and a purple at L 0.54 and a yellow at L 0.85 are both "full strength".
- Dark mode: Radix warns that saturated grey backgrounds clash with coloured components, especially in dark mode ([Radix, Composing a palette](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette); checked). Material's dark theme desaturates accents and lifts surfaces by elevation (not checked). Plumber rule: **never fold across schemes**; resolve each scheme against its own tokens.

## 2. The roles a UI colour system needs

**2.1 What mature systems do.**

| System | Neutrals | Text | Lines | Accent | Status | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Radix Colors (12 steps per scale) | 1 app background, 2 subtle background (cards, sidebars), 3 element, 4 hovered, 5 active/selected | 11 low-contrast text, 12 high-contrast text | 6 subtle border, 7 element border and focus ring, 8 hovered border | 9 solid, 10 hovered solid | red / green / yellow-amber / blue scales | [Radix, Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale); [Composing a palette](https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette) (checked) |
| Material 3 | surface family, neutral and neutral-variant key colours | on-surface, on-surface-variant, on-* pairs | outline | primary, secondary, tertiary (+ container / on-container) | error (+ custom semantic colours) | [Android, Color](https://developer.android.com/design/ui/mobile/guides/styles/color) (checked: key colours, accent / semantic / surface split, pairs); role list on [m3.material.io](https://m3.material.io/styles/color/roles) (not checked) |
| Apple HIG | systemBackground, secondary, tertiary (grouped, elevated) | label, secondaryLabel, tertiaryLabel, quaternaryLabel | separator | tint | systemRed, Green, Orange | [Apple HIG, Color](https://developer.apple.com/design/human-interface-guidelines/color) (not checked) |
| Tailwind default | 9 neutral families, 11 steps (50 to 950), defined in OKLCH | by step | by step | 17 hues, same 11 steps | by hue | [Tailwind, Colors](https://tailwindcss.com/docs/colors) (checked) |
| Refactoring UI | 8 to 10 greys | | | 1 primary (maybe 2), 5 to 10 shades each | accents for semantic states, used sparingly; avoid pure black | [Refactoring UI, Building your color palette](https://www.refactoringui.com/previews/building-your-color-palette) (checked) |

Three patterns repeat. Neutrals carry most of the page: Android says surface colours "represent the majority of your app's colors" ([Android, Color](https://developer.android.com/design/ui/mobile/guides/styles/color)). Roles are named by use and come in pairs (container and the text on it). Status is a separate small family, and Android adds that semantic colours must keep one meaning everywhere ("if you establish purple for membership, use it for all instances"; same page).

**2.2 Recommended Plumber role set.** Seventeen roles, in five families. Everything on a page maps to one; if it cannot, it is reported, not forced.

| Family | Roles | Job | Radix step it echoes |
| --- | --- | --- | --- |
| Ground | `ground`, `surface`, `sunken` | page; raised container (card, popover); well (input, code, sidebar) | 1, 2 to 3, 2 |
| State of a surface | `hover`, `pressed` (derived, not free) | surface under pointer or press | 4, 5 |
| Text | `fg`, `muted`, `faint`, `on-accent` | primary; supporting; metadata and placeholder; words on the accent | 12, 11, (none), (pair) |
| Line | `line`, `line-strong` | separators and card edges; input and control borders (3:1 rule) | 6, 7 |
| Accent | `accent`, `accent-hover`, `accent-soft` | the one action colour; its hover; its tint (selected row, focus halo) | 9, 10, 3 |
| Status | `success`, `warning`, `danger`, `info` | meaning, never decoration | green / amber / red / blue 9 |

Not roles, never touched: content colour (images, charts, brand logos, user data), scrims and shadows.

Why `faint` is its own level and `ground` is not `surface`: the APCA table gives a distinct tier for metadata (Lc 45 to 60) and for placeholder text (Lc 30); and layered neutrals are how dark and light schemes separate regions without borders (Radix steps 1 to 3; Apple's three background tiers, not checked).

**2.3 Second ink and data hues.** A product may have a second hued role (crafting-ui's blue "draw" ink beside the red accent). Recommend the **budget** from `direction.md` §2.4: 1 hued role besides status by default. A second ink is allowed only when the theme already names it. Data and category hues (chart series, tags) are content: not rewritten, only counted.

## 3. The laws that govern colour decisions

Each row says what we can cite, and the rule it produces. Nothing below is claimed beyond its source.

| Law | What the source supports | Rule for the pass |
| --- | --- | --- |
| Similarity | Things that look alike read as the same kind ([Plumb's own table](../../overlay/src/laws.js)); Android: same meaning, same colour everywhere ([Android, Color](https://developer.android.com/design/ui/mobile/guides/styles/color)) | Same job gets the same token. Two near-identical greys doing one job fold into one. Two jobs never share a colour that only differs by accident |
| Von Restorff (isolation) | The one item that differs is remembered; use emphasis sparingly or highlights compete ([Laws of UX](https://lawsofux.com/von-restorff-effect/); checked). Origin: von Restorff 1933 (same page) | One accent. A second saturated hue near the first lowers both |
| Preattentive processing | A hue difference makes a target pop out before attention is spent, e.g. a red target among blue ([Healey and Enns, 2012 survey](https://www.csc2.ncsu.edu/faculty/healey/download/tvcg.12a.pdf); via search excerpt, PDF would not open) | Accent works because most of the page is neutral. Every extra hue on the page weakens the pop-out. Android says the eye is "particularly drawn to vibrant colors" ([Android, Color](https://developer.android.com/design/ui/mobile/guides/styles/color)) |
| Cognitive load and Hick | More, and more complex, choices take longer to decide ([Laws of UX, Hick's law](https://lawsofux.com/hicks-law/); checked). Android: too many semantic colours confuse, too many decorative ones overwhelm (same Android page) | Fewer distinct colours. Report distinct colour count before and after. Hick's law is about choice time, so it supports this for controls and status, and is only an analogy for greys |
| 60-30-10 | An interior-design rule of thumb. I found **no primary or empirical UX source**. Do not cite it as a law | Use it only as a **display** (area share bar: neutral / accent / other). Never enforce it. Replace with Android's "surfaces are the majority" for neutrals, and Von Restorff for the accent |
| Colour carries meaning vs decoration | Colour may not be the only carrier of meaning, and a lightness difference of 3:1 counts as a second cue ([WCAG SC 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html); checked); Von Restorff page repeats it | A status hue must keep one meaning and have a word, icon or shape beside it. Coloured text with no meaning (not a link, not status, not on an accent) is decoration and is the first to go |
| Contrast floor | APCA Lc bands, WCAG 3:1 for control edges (section 1.2) | Every move passes the guard. A line that carries a control edge needs 3:1, a divider needs Lc 15 |

## 4. Reading an app's colours into roles

Three evidence sources, in this order. Earlier beats later when they disagree, and the disagreement is shown, not hidden.

**4.1 Name** (tokens only). `--color-fg`, `muted`, `surface`, `line`, `accent`, `danger` and kin. This is what `roleOf()` does today. Add: a token named `primary`/`brand`/`draw`/`link`/`ink` is `accent` only if it is chromatic; a Tailwind default name (`gray-500`, `blue-600`) says nothing about role.

**4.2 Value.** On the colour over its ground, in OKLab:
- chroma below 0.03: neutral. Above 0.06: hued.
- neutral and opaque, L above 0.95: a ground. Neutral with alpha and low L: a text level or a line.
- hued, hue 130 to 165 green, 20 to 40 red, 60 to 100 amber, 230 to 265 blue: status candidates, **only if usage (4.3) agrees**. A hue is never status by value alone.

**4.3 Usage** (what the page shows; the only source for apps with no tokens). For every place: which property (`color`, `background-color`, `border-color`), which element (control, link, badge, body text, container), and **area** (rect area for backgrounds, text length times size for text, as `pass-colour.md` already specifies).

| Evidence on the page | Role |
| --- | --- |
| Largest-area neutral background, usually on `body` or a root | `ground` |
| Neutral backgrounds on containers that sit on the ground, lighter or darker by a step | `surface` (raised) or `sunken` (inset, inputs) |
| Neutral text colours, ranked by words drawn | top three clusters become `fg`, `muted`, `faint` by lightness order |
| Neutral border colours | `line` (many, light), `line-strong` (on form controls) |
| Chromatic fill on buttons and links, ranked by area times interactivity | highest wins `accent` |
| Chromatic on text beside "error", "failed", "saved", on badges, toasts, banners | `status` by hue band (4.2) |
| Chromatic on a card, hero, gradient, with no control or message role | decoration, a candidate for draining |
| Colour inside svg, canvas, img, excluded paths | content, skipped |

**4.4 Apps with no tokens (hex everywhere).** No names exist, so build the system from the page:
1. Merge colours closer than ΔE_ok 0.01 into one (the existing `MERGE`).
2. Cluster the neutrals by L at the rungs above: at most three text levels, three grounds, two lines are the *proposed* system.
3. The most used hued colour on controls is the accent; hues near it (within about 30 degrees of hue) are variants of it.
4. Output this as a **derived system**: "your page already has these 3 greys and 1 accent". At scope keep nothing is rewritten (no tokens exist to move onto, and keep never adds values). Offer **refine**: write those clusters as tokens, then swap usages. This is the honest answer for "move the app onto its own system".

## 5. Resolving, rule by rule

How to read the tables: **keep** uses only the app's existing tokens and never adds a value. **Refine** may merge toward the system and may adjust token values. Distance is ΔE_ok over the colour's ground (what is seen), so `#666` and `rgba(0,0,0,.6)` compare as painted.

**Step order for every colour.** (1) Is it content or unlocatable? Skip and list. (2) Which role does its usage say? (3) Among tokens of that role, is one within the fold distance? Fold. (4) Otherwise apply the drift rule below. (5) Run the contrast guard. (6) Write, or refuse with the reason.

The key change from today: step 2 comes before step 3. Today the nearest token wins from any role family allowed by the property.

| Drift | Keep | Refine | Threshold and why | Law |
| --- | --- | --- | --- | --- |
| **Near-copy** (`#F4F4F6` where `sunken` is `#f5f5f5`) | Fold to the token **of its role** if ΔE_ok at most 0.03 | same, at 0.05 | 0.02 is about one JND (section 1.1), so 0.03 is a visible-only-side-by-side difference: nothing a user would notice is lost. 0.05 is about 2.5 JND: still the same colour in a different light, still a design choice | similarity |
| **Extra grey level** (a 4th text grey) | Move to the nearest of the three text levels if ΔE_ok at most 0.12 and APCA stays in or above its band | at most 0.18 | Greys are far apart in a three-tier system (computed: fg to muted 0.38, muted to faint 0.17), so a grey 0.12 from a level is closer to it than half the gap. Over that it may be a deliberate fourth tier: kept and said | similarity, cognitive load |
| **Faded text** (`text-fg opacity-60`) | Swap to the level it composites to, drop the opacity, if ΔE at most 0.03 | same | Opacity makes a colour depend on the ground, so on a tinted card it drifts. A named level does not | similarity |
| **Pure black or white** | To `fg` / `ground` if one is within 0.20 | same | Refactoring UI says pure black looks unnatural; crafting-ui is off-black and off-white by decision ([Refactoring UI](https://www.refactoringui.com/previews/building-your-color-palette)) | aesthetic-usability |
| **Stray hue** (a one-off blue, a teal border) | Kept and listed, with its nearest token and distance | Fold into the accent if used on a control or link and within 40 degrees of accent hue; otherwise to the nearest neutral if it carries no meaning | Hue sits on a circle: 40 degrees is about where a viewer still names it the same colour family (computed on the examples in section 6, 28 degrees apart). A hue far from the accent is a different meaning, not a typo | Von Restorff |
| **Tinted or gradient surface** (card, panel) | Kept and listed ("a gradient, contrast cannot be measured") | To the `surface` token **if both stops are within 0.10 of one surface-role token or one accent tint** | A gradient has no single ground, so contrast cannot be measured; keep refuses. Refine folds only when the gradient is a surface, not a figure | Von Restorff, preattentive |
| **Second accent** (a second saturated fill on controls) | Kept and listed | Becomes `accent` (by role, **not by distance**) when the theme's budget is 1 | Role by usage: a primary button is the accent, whatever its distance. Distance would leave a purple button purple and call it "different". Von Restorff says two competing accents weaken both | Von Restorff |
| **Coloured text with no meaning** (green heading) | Kept and listed | To `fg` (headings) or `muted` | Not a link, not status, not on an accent control: colour here adds a choice without a meaning | cognitive load |
| **Status hue** | Never changed in hue; folded only to the same status token | Retuned to the status token of the same hue band; never merged into the accent | Colour must keep one meaning (Android, section 3), and meaning needs a second cue (SC 1.4.1) | colour carries meaning |
| **Line too faint** (a control border under 3:1) | Reported only | Raised to `line-strong` | WCAG SC 1.4.11, 3:1 for control edges; dividers need only Lc 15 | contrast |
| **Different scheme** (a dark-mode colour) | Resolved against dark tokens only | same | Tone ranges differ per scheme (section 1.4) | |

**Guard** (existing, keep it): the move is refused if it takes the text below its Lc floor (45 / 50 / 60 by size and weight) and lowers contrast by more than 0.5 Lc. The floors match the APCA table (60 for ordinary content, 45 for large). Raise the floor for body text to 75 as a **report**, not a refusal, because the APCA table sets 75 as the minimum for columns of body text.

**Plain-words version for a designer.** The pass first asks "what is this colour *for*?" (page, card, body text, quiet text, line, the main action, a warning). Then it looks in your own tokens for that job. If your colour is practically the same as the token (a difference you could hardly see side by side), it swaps it for the token. If it is a different colour doing a job you already have a token for, it swaps only when you ask for refine. If it is doing a job you have no token for, it leaves it and tells you.

## 6. Worked example

### 6.1 crafting-ui's own theme read into the role set

Source: `/Users/vijaysingh/unlocalhosted/crafting-ui/src/index.css`, lines 15 to 80. Lc values computed on white with the APCA formula, so they are approximations.

| Token | Value | Role | Note |
| --- | --- | --- | --- |
| `bg` | L 98.7% neutral | `ground` | |
| `sunken` | L 97% neutral | `sunken` | |
| `surface` | white | `surface` | L 1.0 against `ground` 0.987: a 0.013 step, under the 0.02 JND, so it does not separate from the ground without a line |
| `surface-hover`, `surface-pressed` | faint cool tint (C 0.004 and 0.008, hue 265) | `hover`, `pressed` | the only tinted neutrals; fine as states |
| `fg` | L 13% | `fg` | computed Lc about 105 |
| `muted` | black at 62% | `muted` | computed Lc about 81 (body-text band) |
| `faint` | black at 42% | `faint` | computed Lc about 57 (content text band) |
| `line` | black at 12% | `line` | computed Lc about 16, just above the Lc 15 floor |
| `line-strong` | black at 32% | `line-strong` | computed Lc about 44; **does not reach 3:1 as a control edge** (WCAG 1.4.11); gap |
| `accent` + hover / soft | red, L 57% C 0.20 hue 28 | `accent` | redline: "the one thing that matters" |
| `on-accent` | white | `on-accent` | |
| `draw` + hover / soft / tint / line | blue, L 50.6% C 0.289 hue 265 | **second ink** | doubles the accent; allowed because the theme names it and the budget (section 2.3) is 2 |
| `success`, `warning`, `info` | green, amber, `info = draw` | `status` | **gaps:** no `danger` (the accent red does the job: a double, so "error" and "the one important thing" share a colour); `info` is the draw blue, not a status colour of its own |
| `scrim`, `shadow-ink` | L 13% | not roles | |

Findings: (1) a clean three-level text system, pass; (2) two inks (red, blue) and no `danger`: red is accent and error, which breaks "same meaning, same colour" in the other direction; (3) `line-strong` is under the 3:1 control-edge rule; (4) `ground` and `surface` differ by 0.013: effectively one layer, so cards separate by line, which is the stated design.

### 6.2 A page with `#666666` text, `#f5f5f5` background, a `#7c3aed` button and a purple gradient card

Numbers computed in OKLab against crafting-ui's tokens, on white.

| Colour | Role by usage | Nearest tokens (computed ΔE_ok) | Keep | Refine |
| --- | --- | --- | --- | --- |
| `#666666` text | text | `muted` 0.018, `faint` 0.156, `fg` 0.380 | Fold to `muted`. APCA: `#666` is about Lc 79, `muted` about Lc 81, so contrast does not fall | same |
| `#f5f5f5` page background | `ground` | `sunken` 0.000, `bg` 0.017, `surface` 0.030 | Fold to **`bg`**. It is the page ground, and `bg` is inside 0.03. The old resolver would pick `sunken` (exact) and a page ground would become a well | same |
| `#7c3aed` button | `accent` (a control fill, large area on interactive) | `draw` 0.141, `accent` (red) 0.332; hue 293 against draw 265 (28 degrees) and accent 28 | **Kept and listed**: "no colour of yours is near it". White text on it is about Lc 83, which passes | Becomes `bg-accent` or `bg-draw`. Which one: whichever the theme calls the primary-action ink. Recommended: `accent`; if the theme has two inks, `draw` only when the app uses `draw` for buttons already |
| Purple gradient card | decoration on a `surface` | both stops chromatic; not within 0.10 of any surface token (`draw-tint` is 0.41 from `#7c3aed`) | **Kept and listed**: "a gradient: contrast cannot be measured" | Becomes `bg-surface` with the words on it re-checked; the gradient is called out as the reason the page had two competing purples (hero and button) |

Before and after, as the panel should say it. Keep: `#666` joins `muted` and `#f5f5f5` joins `bg`, so two off-system colours go; one hue and one gradient are listed. Refine: the purple is gone; accent covers one role. The panel states what changed and what was left.

## 7. Open questions for the owner (max 5)

1. **Hue budget default.** Allow one hued role besides status (accent only), or two (crafting-ui's red + blue)? Recommended: **one** by default; two only when the theme already names a second ink. It is the only way the "second accent" rule has a stable answer.
2. **When no token exists, what does keep do?** Today it only reports. Recommended: report the derived system (section 4.4) and offer "make these tokens" as a refine action; never invent values at keep.
3. **Role beats distance for the page ground and the accent?** Recommended: **yes**. A `#f5f5f5` page folds to `bg`, not `sunken`, and a purple button becomes the accent at refine whatever its distance. It changes today's nearest-token behaviour, so confirm.
4. **Should the pass touch status colours at all at refine?** Recommended: only to snap a near-duplicate to the same status token. Never recolour a status, and never merge status into the accent. Also fix crafting-ui's gap: add `danger` apart from the redline accent.
5. **Which numbers do we call "science"?** Recommended: say "APCA bands" and "WCAG 3:1 for control edges" (published), call ΔE_ok 0.02/0.03 "our visibility threshold" (a design choice on a folklore JND), and call 3 text levels and 60-30-10 "convention". The panel never says "proven".

## 8. Sources not opened

Apple HIG, `m3.material.io` role pages and Material 2 dark theme returned only a title (JavaScript pages). Healey and Enns' PDF 404'd; I used the search excerpt. Anything marked "not checked" should be re-read by a person before being quoted in the product.

## 9. Decided (owner, 2026-11-03)

1. **Role wins over distance.** A colour is read into its role first; it folds to that role's token, not the nearest
   value (`#f5f5f5` as the page ground → `bg`, not `sunken`; a purple button → the accent at refine).
2. **Hue budget: one accent, unless the theme names a second ink** (crafting-ui's `draw` stays a role).
3. Open questions 2, 4, 5 take their recommended answers: keep reports a missing token system and offers tokens at
   refine; status colours are only snapped to their own token, never recoloured or merged into the accent; the panel
   says "APCA", "WCAG 3:1", "our visibility threshold" and "convention", never "proven".
