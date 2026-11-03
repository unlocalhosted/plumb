# Icon system and the icon pass

Spec for the fourth clean-up pass. Replaces the open parts of `docs/briefs/pass-icons.md` (the LLD stays for the
algorithm skeleton; this file settles the system it serves). Nothing here is built.

**Citation key.** `[F]` = fetched this session. `[S]` = search result, secondary. `[K]` = from the set's published
docs as I know them, not re-fetched (the fetches for Lucide's design guide, Material 3 and Apple HIG pages returned
404 or empty): verify before it becomes a hard-coded number. `[C]` = read from code in this repo or crafting-ui.
`[D]` = derived by us, a proposal, not a published rule.

Sources:
- Heroicons README, <https://github.com/tailwindlabs/heroicons> [F]: 24 outline, 24 solid, 20 solid, 16 solid; `currentColor`.
- Google Fonts, Material Symbols, <https://developers.google.com/fonts/docs/material_symbols> [F]: axes FILL 0–1, wght 100–700, GRAD −50–200, opsz 20–48.
- WCAG 2.2 SC 2.5.8, <https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html> [F]: 24×24 CSS px target, or a 24px circle clear of other targets.
- NN/g, Icon usability, <https://www.nngroup.com/articles/icon-usability/> [F]: icons carry meaning first; few are universal (home, print, search); keep visible labels.
- Laws of UX, Jakob's law, <https://lawsofux.com/jakobs-law/> [F].
- Apple SF Symbols, WWDC 2019 s.206 / WWDC 2020 s.10207, HIG "SF Symbols" [S]: nine weights matched to San Francisco's weights; three scales defined from cap height (small about 20% under medium, large about 30% over); weight compensated across scales; symbols centred on cap height beside text.
- Hecht et al., ICWSM 2016, <https://www.brenthecht.com/publications/ICWSM2016_emoji.pdf> [S]: the same emoji reads differently on Apple and Google renderings. Unicode fixes the code point, not the picture (UTS #51) [S].
- Lucide design guide, <https://lucide.dev/icons/> docs [K]: 24×24 canvas, 2px padding, 2px stroke, round caps and joins, keyline shapes (20 square, 20 circle, 16×20 and 20×16 rectangles), `absoluteStrokeWidth` keeps the stroke constant as size changes.
- Phosphor [K]: 256 grid, six weights (thin, light, regular, bold, fill, duotone). Tabler [K]: 24 grid, stroke 1–2. Radix Icons [K]: 15 grid. Heroicons outline stroke is 1.5 in the package [K]; the README example shows 2 [F], so read it from the installed SVGs, never from memory.
- Apple HIG hit region 44pt, Material 48dp [K].
- This repo: `overlay/src/craft-rules.js` (`icon-side` #10 l.533, `media-size` #34 l.817, `icon-cap` #4 l.1301, `optical-centre` l.1536, `stroke-weight` #50 l.1612), `craft-spec.js:108–113`, `laws.js` [C].
- crafting-ui: `src/language/Icon.tsx`, `src/language/ink.ts`, `src/frosted-icons/` [C].

---

## 1. Primitives

### 1.1 One family

A family is one answer to six questions. Two icons are from one family when all six agree; the pass reads them.

| Property | What makes it one | Read from |
| --- | --- | --- |
| Grid | Same `viewBox` (16, 20, 24 …) and live area | `viewBox` |
| Keylines | Same square/circle/rectangle footprints so a circle and a box weigh the same (Lucide: 20 sq, 20 circle, 16×20, 20×16 on 24 [K]) | not readable from code; inferred from origin |
| Stroke | One width on the grid | computed `stroke-width` × scale |
| Terminals and corners | Round or square caps, round or miter joins, one corner radius | `stroke-linecap`, `stroke-linejoin`, `rx` |
| Fill vs outline | Line, solid or duotone; never mixed in a row | `fill` vs `stroke` on shapes |
| Ink | `currentColor`, no baked colours | `fill`/`stroke` values |

Why one: similarity. Things that look alike read as one kind (`laws.js: similarity`). A solid among lines reads as
"selected" or "different", whether you meant it or not. [D]

Fill is a state, not a family. Material makes it an axis (FILL 0–1) [F]; Heroicons ships outline and solid as two
sets [F]. Rule: fill may mark selected, never the rest state of some icons only.

### 1.2 Size steps tied to text

Sets are drawn for a few sizes: Heroicons 16/20/24 [F], Material opsz 20–48 [F], Lucide 24 scaled [K]. Steps follow the text beside the icon:

| Text size | Icon | Reason |
| --- | --- | --- |
| 11–13 | 14 or 16 | glyph about the text's cap-to-descender height plus a little [D] |
| 14–15 | 16 | matches a 16 grid exactly: no resampling [F: Heroicons 16] |
| 16–18 | 20 | cap height 11–13px; a 20 glyph's live area (about 16) sits in 1.3× cap height [D] |
| 20–24 | 24 | the set's native grid |
| 28+ | 32, 40 (title/empty states) | stroke goes absolute here, see 1.3 |

The ladder is 16 / 20 / 24 plus 14 and 32 as ends. It matches direction.md §2.6 (label 14–16, body 16–20,
title 20–24) [C] and SF Symbols, which scales from cap height, not from the em [S]. Inside one list, one size:
`craft/media-size` already enforces it [C].

Why not `1em` everywhere: an em-sized glyph with 2px padding is about 0.83em of ink, which is slightly under
cap height at 16px (cap about 0.72em in typical sans). It works for compact UI, which is why 16px text with a 16px
icon is acceptable; 20 is the "icon leads" size. [D]

### 1.3 Stroke relative to size and to the text's stem

Two rules, both from "icon weight follows text weight" (SF Symbols matches nine weights [S]; Material has `wght` [F]).

1. **Stroke is absolute on screen across sizes in one family.** A 24-grid stroke of 2 drawn at 16px is 1.33px; at 20
   it is 1.67. Lucide's `absoluteStrokeWidth` exists to hold it constant [K]; SF Symbols compensates weight across
   scales [S]. Target in px on screen, not in user units.
2. **Stroke tracks the text's stem.** A regular-weight sans has stems of roughly 0.08–0.09em (about 1.3–1.5px at
   16px) [D, measure before hard-coding]. So Regular text pairs with a 1.5px icon; Medium 1.75; Semibold and
   Bold 2. This is the table already in direction.md §2.6 [C], with contrast ±0.25.

Large icons (≥32px): keep the small-size stroke (`craft/stroke-weight` flags stroke > 3 at ≥ 40px, `craft-spec.js:108`) [C].

### 1.4 Optical against geometric centring

- Box-centred is geometric. A play triangle, a chevron or a "send" arrow is lighter on one side; the eye wants the
  ink's weight centre. `craft/optical-centre` nudges toward the weight (lean 0.06) [C]; SF Symbols and Material
  draw it into the glyph [S, K]. Rule: nudge only icon-only controls, and only by ≤ 1px at 20px.
- Round shapes read smaller than squares: draw circles about 6% bigger (`craft/…` ink rule at l.1569) [C]. Keylines are the set's way of doing this [K].

### 1.5 Colour

`currentColor` always [F: Heroicons; C: Icon.tsx `stroke="currentColor"`]. The icon takes the text's colour, so it
is also on the same contrast and state ladder. Which level:

| Case | Colour |
| --- | --- |
| Icon + label in a control | the label's colour (one object) |
| Leading icon of a list row, label strong | one level quieter than the label (secondary text) [D] |
| Icon-only control | secondary text at rest, primary on hover/selected |
| Status | the status hue, plus a dot or shape, never colour alone (emoji's colour is replaced by a dot, see §4) |

Non-text contrast: an icon that carries meaning needs 3:1 (WCAG 1.4.11) [K]. Decorative icon beside a label needs none.

### 1.6 Gap, and vertical alignment to text

- **Gap** scales with the icon: gap ≈ 0.4–0.5× the icon (16 → 6–8px, 20 → 8px, 24 → 8–12px), snapped to the app's
  spacing scale (4/6/8…). One gap per icon size. [D] The edge nearest the icon takes less padding
  (`craft/icon-side`, #10) [C].
- **Vertical alignment.** SF Symbols centre on cap height [S]; Plumber already measures it:
  `craft/icon-cap` compares the icon's middle with `baseline − capHeight/2` and flags > 1px [C]. For text that is
  mixed-case, cap-height centring looks right in nav and buttons (label starts with a capital or sits on x-height);
  for all-lowercase labels x-height centring is closer. We use cap height.
- **Two CSS routes** to get it right by construction (what the pass writes):
  1. `items-center` on a flex row plus an icon whose height is `1lh` / the line box: the box is centred on the line
     box, which is off from the cap middle by a font-dependent 0.5–1.5px. Fine for ≥ 20px text, flagged by icon-cap below.
  2. Size the icon in `em` (`size-[1.25em]`, `align-[-0.125em]` inline): moves with the text. Use for inline icons in
     running text; never in controls where a step on the ladder is wanted.
  Order: ladder step first (1.2), then `items-center`, then a `translate-y-[±px]` only if icon-cap still flags.

---

## 2. The laws and the rule each one drives

| Law | Rule in the pass | Existing rule |
| --- | --- | --- |
| Similarity | One family, one stroke, one size per list; fill not mixed | `craft/stroke-weight`, `craft/media-size` |
| Recognition over recall | An icon alone only when the metaphor is conventional; otherwise the label stays. The pass never removes a label | new: `icons/unlabelled` (list only) |
| Fitts | The hit region, not the glyph, is the target: ≥ 24px (WCAG 2.5.8 [F]), 44pt/48dp where the host allows [K]. The glyph stays 16–24; padding makes the target | `craft/hit-target` |
| Jakob | Map emoji to the metaphor users know from other products (house = home, gear = settings, magnifier = search) and refuse the ones with no convention; NN/g: only a few icons are universal [F] | the emoji table below |
| Aesthetic-usability | A consistent set reads as better made, and so as easier | the measure "N → 1 styles" |

Why emoji read as inconsistent: (1) platform rendering, each vendor draws its own and Unicode fixes only the code
point [S]; the same emoji is read differently on different platforms [S]. (2) colour: full-colour glyphs ignore
`currentColor`, dark mode and state. (3) size and ink: an emoji's visual box is set by the font, ignores your grid,
and aligns to the font's metrics, not the cap height. (4) they do not take a stroke, so they cannot follow text weight.
(5) screen readers read the name aloud unless hidden. All five are removed by moving to the family.

---

## 3. Reading an app's icon system

Run once per project (census v2 `icons`, as in pass-icons.md), on every route. Output is the app's *dialect*.

| Question | How it is read |
| --- | --- |
| Which family | Rank candidates by instance count: (a) imports at the stamp's file: `lucide-react`, `@heroicons/react/{24,20,16}/{outline,solid}`, `@phosphor-icons/react`, `@tabler/icons-react`, `react-icons/*`, `@radix-ui/react-icons`, `@mui/icons-material`; (b) sprite ids: `<use href="#icon-…">`, `/sprite.svg#…`; (c) inline svg signatures: `class="lucide lucide-bell"`, `data-icon`, `data-slot="icon"`, `viewBox 0 0 24 24 + stroke-width 2 + round caps` (Lucide-like), `0 0 15 15` (Radix), `0 0 256 256` (Phosphor), `0 0 20 20 solid` (Heroicons mini); (d) a local renderer component (crafting-ui `Icon`): its count by file |
| Sizes in use | Distribution of drawn px (width), per host text size → the app's modal size per text size; those become the ladder |
| Stroke in use | Computed `stroke-width` × (drawn / viewBox) in px, 0.25 grain, per host weight band (existing `strokePairs`, `craft-rules.js:1597`) |
| Gap | Distance from the icon's edge to the label's text box, per icon size; modal value |
| Style | share of line / solid / duotone among the family's icons |
| Caps/joins | modal `stroke-linecap`, `stroke-linejoin` |
| Emoji | text nodes that are only emoji/dingbats (`\p{Extended_Pictographic}`, with VS16), counted per route and per file |

The **main family** is the one with the most instances among icons in controls, links, rows and labels, excluding
content (> 48px, > 12 shapes, excluded paths). Under 60% share it is "mixed" and the pass lists instead of swapping
(same share threshold `strokeWeight` uses for "usual", 0.6, `craft-rules.js`) [C]. If no family exists (the app is
all emoji), the pass asks for the family in the direction (`icons.set`); with none chosen it only lists.

---

## 4. Resolving, rule by rule

Every rule: threshold, law, write, and what it refuses. Scopes as in direction.md §4: **keep** and **refine** change
only toward the app's own values; **new** may bring in a set. Each rule is one proposal, one `write`, group
`cleanup-icons-<n>`.

| # | Finds | Threshold | Law | Written in code | Refused |
| --- | --- | --- | --- | --- | --- |
| I1 stray stroke | stroke off the cell for its (weight, size) by ≥ 0.25px (existing `off` is 0.4, tune to 0.25 for the pass) | modal ≥ 60% of the weight band, ≥ 8 samples | similarity | class `[stroke-width:1.5]` on the svg **only** when child shapes inherit stroke; else advice "set it in the renderer"; a renderer prop (`strokeWidth={1.5}`) when prop edits exist | stroke baked in path data (filled outlines); a renderer that forbids per-mark stroke (crafting-ui warns, `Icon.tsx:43`) |
| I2 stray size | icon size ≠ list mode, or off the ladder step for its text by > 2px | list of ≥ 3 peers, mode ≥ 50% (`media-size`) | similarity | `size-5` etc.; or the library prop `size={20}` | an icon the layout depends on (absolute positioned art) |
| I3 big icon stroke | ≥ 32px with stroke > 2 | any | similarity | `[stroke-width:1.5]` / `absoluteStrokeWidth` | none |
| I4 misaligned icon + label | centre off the cap middle by > 1px (`icon-cap`) | row is one line | aesthetic-usability | `items-center`, else `translate-y-[Npx]` | multi-line labels; vertical `column` layouts |
| I5 gap | gap ≠ the modal gap for that size, or off the spacing scale | ≥ 4 peers | similarity | `gap-2` on the row, or `mr-*` on the svg (nearest scale step; no new values at keep) | a gap the app uses for another reason (justify-between rows) |
| I6 second library | icons whose origin ≠ main family, in a list with the main one | name map has a hit for every icon in the instance; family share ≥ 60% | similarity | change the import and the component: `import { Bell } from 'lucide-react'`, `<BellIcon/>` → `<Bell/>` (package already in `package.json`) | any icon with no mapping (listed); a set not installed ("Install X first") |
| I7 style mix | solid among lines (or the reverse) in one row | ≥ 3 peers | similarity | the set's counterpart by name (Heroicons outline ↔ solid) | selected state (fill marks selection) |
| I8 emoji | emoji in a control, link, row or nav label | one in the mapping table; the host is a control, not prose | similarity, Jakob, aesthetic-usability | the icon swap (below), plus `aria-hidden` on it when a label is present | emoji inside content (a user's message, a reaction, a name), emoji with no table entry, emoji that is the only content with no label (listed: needs an `aria-label`) |
| I9 icon-only hit region | target < 24px | WCAG 2.5.8 [F] | Fitts | padding on the control (existing `hit-target`) | a control inside dense text |

**Refused categories (and why).** Decorative illustrations and brand logos: they are art, drawn at a fixed shape with
fixed colour, a stroke or size change distorts them; `> 48px`, `> 12 shapes`, `<img>`, or the excluded paths mean
content. Icons inside drawings or charts: content, not UI. Anything where the write cannot be located exactly.

### 4.1 What the swap writes (I6, I8)

```tsx
// before
<a className="flex items-center gap-2"><span>🏠</span> Home</a>
// after
import { House } from 'lucide-react'
<a className="flex items-center gap-2"><House className="size-5 shrink-0" aria-hidden /> Home</a>
```

- Element swap plus one import (the only pass that adds an import): through the session's `swap` path, shown in the
  proposal as "adds `import { House } from 'lucide-react'`". The icon takes the ladder size for the host's text and
  the class/prop that keeps the app's stroke. Requires the package installed; otherwise refused with "Install it first".
- An app whose icons come from its own renderer (crafting-ui `Icon`) is swapped to a `mark` only if that mark exists;
  else listed.
- Emoji that carried a category colour become line icon + a 6px status dot (the reference video's move) [D, from pass-icons.md].

### 4.2 Mapping meaning: emoji to icon

Order of evidence, strongest first: (1) the table entry for the emoji; (2) `aria-label` / `title` / adjacent text
(`Settings` next to ⚙️ confirms; a conflict, like 📥 next to "Archive", picks the label's meaning: archive); (3) the
host role (nav item, button, status). No table hit and no label means refuse. Names are Lucide's [K]; Heroicons and
Phosphor names differ and are mapped by the same key (the table's left column is our canonical key, not the
set's). Verify each name against the installed package at runtime; skip a name the set lacks.

| Group | Emoji → icon |
| --- | --- |
| Navigation | 🏠 house · 🔍🔎 search · ⚙️ settings · 🔔 bell · 🔕 bell-off · 👤 user · 👥 users · 🧑‍💼 user-round · 📥 inbox · 📤 send/upload · 📧✉️ mail · 💬 message-square · 🗨️ message-circle · ☰ menu · 🏷️ tag · 🔖 bookmark · ⭐🌟 star · ❤️ heart · 🔗 link · 📎 paperclip · 🧭 compass · 🗺️ map · 📍 map-pin · 🌐 globe · 🧩 puzzle |
| Files | 📁 folder · 📂 folder-open · 📄 file-text · 📃 file · 📝 square-pen · ✏️ pencil · 🖊️ pen · 📋 clipboard · 📌 pin · 🗂️ folders · 🗃️ archive · 🗄️ database · 💾 save · 🖼️ image · 📷 camera · 🎥 video · 🎬 clapperboard · 🎵 music · 🎤 mic · 🔊 volume-2 · 🔇 volume-x · 📚 library · 📖 book-open · 📕 book · 🧾 receipt · 📰 newspaper |
| Data | 📊 bar-chart-3 · 📈 trending-up · 📉 trending-down · 🧮 calculator · 💹 chart-line · 🗓️📅 calendar · ⏰⏱️ clock/timer · ⌛⏳ hourglass · 🕐 clock · 🔢 hash · 📦 package · 🚚 truck · 🏢 building-2 · 🏦 landmark · 🛒 shopping-cart · 🛍️ shopping-bag |
| Money | 💰 wallet · 💵💲 dollar-sign · 💳 credit-card · 🪙 coins · 🎁 gift · 🏆 trophy · 🎯 target · 🏅 medal · 💎 gem |
| Actions | ➕ plus · ➖ minus · ✖️❌ x · ✔️✅ check · ☑️ square-check · ✓ check · 🗑️ trash-2 · 📋 copy · ♻️ recycle · 🔄 refresh-cw · 🔁 repeat · ↩️ undo-2 · ↪️ redo-2 · ⬆️ arrow-up · ⬇️ arrow-down · ⬅️ arrow-left · ➡️ arrow-right · ↗️ arrow-up-right · 📤 upload · 📥 download (when label says Download) · 🖨️ printer · ✂️ scissors · 🔧🛠️ wrench · 🔨 hammer · 🔑 key · 🔒 lock · 🔓 lock-open · 🛡️ shield · 👁️ eye · 🙈 eye-off · 🚀 rocket · ⚡ zap · 🔥 flame · 💡 lightbulb · ✨ sparkles · 🪄 wand-sparkles · 🧪 flask-conical · 🔬 microscope · 🤖 bot · 🧠 brain · 💻 laptop · 🖥️ monitor · 📱 smartphone · ⌨️ keyboard · 🖱️ mouse-pointer · 🔌 plug · 🔋 battery · 📡 radio · ☁️ cloud · 🌙 moon · ☀️ sun · 🌍 earth |
| Status | ⚠️ triangle-alert · ❗❕ circle-alert · ❓❔ circle-help · ℹ️ info · 🚫 ban · ⛔ octagon-x · 🛑 octagon · 🔴🟠🟡🟢🔵🟣 dot in the status hue (not an icon) · ⏸️ pause · ▶️ play · ⏹️ square · ⏭️ skip-forward · ⏮️ skip-back · 🔁 repeat · 🎉 party-popper · 👍 thumbs-up · 👎 thumbs-down · 🚩 flag · 🐛 bug · 🆕 sparkles (with "New") · 💤 moon · 👀 eye |
| People | 👋 hand · 🙋 hand · 🤝 handshake · 👪 users · 🎓 graduation-cap · 💼 briefcase · 🧑‍💻 code · 🏳️ flag |

About 150 entries once the paired forms are counted. Emoji never mapped: faces, hands, animals, food, flags, and
anything that carries emotion or identity (reactions, avatars). A face emoji is content.

Variation selector and skin tone are stripped before lookup; ZWJ sequences are looked up whole and refused if absent.

---

## 5. Worked example: crafting-ui

**Its system, read out** [C]:

| Question | Answer |
| --- | --- |
| Family | its own renderer, `src/language/Icon.tsx`, 81 instances; no icon package in `package.json`; `lucide`, heroicons and others absent |
| Grid | 20×20, live area 2.5–17.5, closed boxes 3.5–16.5, max radius 1.5, half-pixel snapping (`ink.ts`) |
| Stroke | 1.5 on every `Icon` (`stroke.icon`), `currentColor` via `text-draw`, **square caps, miter joins** (pass-icons.md says round caps: that is wrong) |
| Sizes | `size-5` (20px) default; 14px for dense roles; the probe found 20×20 ×67, 14×14 ×38, 30×30 ×36, 10×10 ×30 |
| Edges | Hero ×2 and `stickers.tsx` at 1.6, `Timeline` at 1.3, FilmTransport 1.8; one emoji on `/` |
| Frosted Icons | `src/frosted-icons`: a second family on purpose, content (the gallery's subject), 24px default; excluded |
| Gap | `gap-2`-class rows; modal read by the census |

**Case A, the app as it is (keep):** the pass reports "1 stroke, 2 sizes in 2 roles, nothing to do" except the Hero
pair (1.6 is 0.1 off, below the 0.25 threshold) and the emoji on `/`, listed as "emoji: 1 place, no table
entry in a control" if it is prose. It must say nothing-to-do and prove it.

**Case B, a page using 🏠 📥 🚀 👥 🧾 📊 🔍 ⚙️ 🔔 in a side nav plus a stray second library (new):**

1. Family: `Icon` renderer (main, 81 of 81 in UI routes). Its marks are *data*, so a swap needs a mark of that
   meaning; the renderer has none for most of these. Two choices, set in the direction: (a) `icons.set = lucide-react`
   (adds a dependency; the swap writes the Lucide import and the renderer's stroke/size), (b) the app's own marks
   only, and the pass lists the nine as "no mark yet". Default (b) at keep/refine, (a) only at new with the package present.
2. Mapping (case a), label-checked: 🏠 `House` · 📥 `Inbox` · 🚀 `Rocket` · 👥 `Users` · 🧾 `Receipt` · 📊 `ChartColumn`
   (Lucide's bar-chart-3) · 🔍 `Search` · ⚙️ `Settings` · 🔔 `Bell`. Each in `size-5 text-…`, `gap-2`, `aria-hidden`.
3. Stray library, say three `@heroicons/react/24/solid` icons beside Lucide: I6 maps by name (`BellIcon` → `Bell`,
   `Cog6ToothIcon` → `Settings`, `UserGroupIcon` → `Users`), all three have hits so the "use Lucide for all" offer
   shows; a fourth with none (`ScaleIcon`) keeps it listed only.
4. Then I1–I5 on the result: stroke to the weight cell (400 text: 1.5, i.e. `[stroke-width:1.5]` for Lucide's 2),
   sizes to `size-5`, the gap to `gap-2`, icon-cap if the nav row is off.
5. Measure shown: "**3 → 1** icon styles · **9** emoji become icons · **2 → 1** sizes in the nav".

---

## 6. The show, and previewing a swap

Reference video: emoji turn into line icons behind a light sweep. Spec:

- **Order on the page:** a sweep (one soft band, left to right, 600–900ms, ease-out, over the nav, one pass) reveals
  each swapped icon as it crosses it: emoji fades and scales down 0.9 → 0.8 as the line icon fades up 0.9 → 1
  from the same centre; 120ms overlap, 40ms stagger down the list. No one-by-one pop, no bounce (calm motion).
  `prefers-reduced-motion`: crossfade only, 150ms.
- **Strokes and sizes** (I1–I3) show as a quick uniform settle: the stray one eases to the family value (no sweep;
  the change is small and a flash is enough). A coloured dot appears last, scale 0 → 1 over 160ms.
- **Preview before writing.** Nothing touches source until Apply:
  - emoji → icon: replace the text node in the live DOM with the set's SVG markup, sized/stroked per the pass,
    fetched once from the session (server reads the package's svg files in `node_modules`); a **Before / After**
    hold on one key (the pass's existing compare) restores the emoji;
  - stroke and size: inline `stroke-width`/`width`/`height` on the touched svgs;
  - gap and alignment: inline `gap`/`transform`;
  - the proposal row shows the emoji and the icon side by side with the label, the name ("House"), and for a label
    mismatch a warning ("📥 next to 'Archive'").
  - The preview is the same code path as the write's result: if the preview cannot be produced (name missing in the
    installed package) the row is refused, never half-shown.
- The Apply writes the import and the JSX swap as one step with one Undo.

---

## 7. Open questions for the owner

1. **Where does the family come from when the app has none?** Recommended: the direction's `icons.set` picks one,
   default **Lucide** (largest, 24 grid, stroke is a number we set; round caps; React package), chosen at scope new
   only; at keep and refine an app with no family is listed, never swapped.
2. **May the pass add a dependency?** Recommended: no. It requires the package already in `package.json` and
   says "Install lucide-react first" otherwise (one line the owner can run). Adding installs is outside what Plumber writes.
3. **Emoji that carry colour:** keep the colour as a dot, or drop it? Recommended: a dot only when the emoji sat in a
   status or category role; otherwise the icon takes the text colour. (Matches the video.)
4. **Stroke tuning (0.25 vs the rule's 0.4):** recommended: the pass uses 0.25 (it is a systemic pass, and 1.5 vs 1.75
   is visible), `craft/stroke-weight` stays 0.4 as a per-element hint.
5. **Apps with their own renderer (crafting-ui):** swap emoji only if a matching mark exists, otherwise list them as
   "no mark yet"? Recommended: yes, list; the pass never invents marks. A mark library gets its own task.

---

## 8. Corrections to carry back

- `pass-icons.md` says crafting-ui uses round caps; `Icon.tsx` uses `strokeLinecap="square"`, `strokeLinejoin="miter"`.
- pass-icons.md's prop edits are deferred; I1 and I2 therefore write classes first, and the renderer-prop advice.
- Verify [K] numbers before coding them (Lucide guide, Material 3, Apple HIG pages were not retrievable this session).

## 9. Decided (owner, 2026-11-03)

1. **Never invent a mark.** In an app with its own renderer (crafting-ui `Icon`), an emoji with no matching mark is
   listed "no mark yet"; drawing marks is its own task.
2. **No new dependency.** The pass swaps only to a set already installed; otherwise it says "Install lucide-react
   first".
3. Open questions 3 and 4 take their recommended answers: a colour dot only where the emoji carried a status or
   category; the pass's stroke threshold is 0.25px while craft/stroke-weight keeps 0.4.
4. Claims marked [K] (Lucide, Material 3, Apple HIG numbers) are checked against the installed packages or primary
   pages before they reach code.
5. **I3 narrowed** (owner, 2026-11-03): an icon sized to large text (a heading's icon) keeps a stroke that follows the
   text's weight; the thin-stroke rule for big icons applies only to icons not sized to text (crafting-ui's hero pair,
   34px at 3.38px beside its headline, stays).
