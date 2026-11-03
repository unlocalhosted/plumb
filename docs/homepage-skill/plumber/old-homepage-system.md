# React Plumber homepage: design system and brand-world inventory

Facts only, read from the repo on 2026-11-03. Every entry ends with its source as `path:line`. Paths are relative to the repo root unless they start with `src/` (that is `site/src/`).

Scope read: `site/src/styles.css`, `site/components.json`, `site/index.html`, `site/vite.config.mjs`, `site/plumber.config.mjs`, `site/src/{site,system,hero,sections,opening,components/ui,lib}`, `site/HOMEPAGE.md`, `site/DOCS.md`, `site/REPLAY.md`, `docs/copy/voice.md`, `docs/design/system-proposal.md`, and the overlay CSS in `overlay/src`. Not read, as instructed: `prototypes/homepage-trial`, `docs/homepage-skill/trial`. `docs/DESIGN.md` has no visual rules (it is the CLI/engine design; its only presentation rules are the terminal coverage table and "no score", `docs/DESIGN.md:357-376`).

Counting convention in the tables: `home / all`. "home" is the homepage tree (`src/site`, `src/hero`, `src/sections`, `src/system/{Field,Sticker,Wrench}`, `src/components`, `src/Home.jsx`). "all" is everything under `src/` (adds the docs, `Opening`, `Specimen`, `Systems`, `Mascots`; excludes recordings and `replay.json`). Counts are string occurrences of the utility or `var()` in `.jsx/.js/.mdx/.css` (excluding `styles.css`), not rendered nodes.

How the theme is wired: raw values live in `:root` and `.dark`; `@theme inline` turns them into utilities and first wipes Tailwind's defaults for colour, font, text, font-weight, shadow, ease and radius (`src/styles.css:192-199`). Spacing is NOT wiped: Tailwind's default `--spacing` ladder is live (no `--spacing-*: initial`). Dark mode is a `.dark` class on `<html>` (`@custom-variant dark`, `src/styles.css:7`), chosen before paint from `localStorage.theme` else `prefers-color-scheme` (`index.html:6-10`).

---

## 1. Tokens

### 1.1 Colour: paper, ink, surfaces

| Token (utility) | Light | Dark | Role (the file's own "why") | Used (home / all) | Source |
|---|---|---|---|---|---|
| `--background` (`bg-background`) | `#f2f4f8` | `#121314` | the page, soft cool grey so white surfaces sit on it | bg 4 / 7 | `src/styles.css:22`, dark `:144` |
| `--foreground` (`text-foreground`, `bg-foreground`) | `#161d2b` | `#e8e9eb` | reading text (claims 15.8:1) | text 17 / 37; bg 8 / 10 | `src/styles.css:24`, `:145` |
| `--card` (`bg-card`) | `#ffffff` | `#17181a` | a surface you hold: cards, panels | 11 / 29 | `src/styles.css:26`, `:146` |
| `--card-foreground` | `#161d2b` | `#e8e9eb` | text on card | 0 direct | `src/styles.css:27`, `:147` |
| `--popover` / `--popover-foreground` | `#ffffff` / `#161d2b` | `#17181a` / `#e8e9eb` | shadcn slot | 0 / 0 (Plumber reports dead) | `src/styles.css:28-29`, `:148-149` |
| `--secondary` (`bg-secondary`) | `#e8eeff` | `color-mix(in oklab, var(--primary) 10%, var(--background))` | quiet control, chip; lightest ink tint | 3 / 8 | `src/styles.css:38`, `:152` |
| `--secondary-foreground` | `#2448c4` | `#8ba3ff` | text on secondary | 3 / 7 | `src/styles.css:39`, `:153` |
| `--muted` (`bg-muted`) | `#eaeef4` | `#1c1d20` | subdued band behind code and captions, toggle track | 9 / 23 | `src/styles.css:41`, `:154` |
| `--muted-foreground` | `#525d70` | `#a0a3a9` | secondary text, captions (claims 7.2:1) | 35 / 121 | `src/styles.css:43`, `:155` |
| `--accent` (`bg-accent`) | `#dfe7ff` | `color-mix(... primary 22% ...)` | hovered row; also `::selection` | 0 / 1 (`::selection` only) | `src/styles.css:45`, `:156`, `:357-359` |
| `--accent-foreground` | `#161d2b` | `#e8e9eb` | text on accent | 0 / 0 | `src/styles.css:46`, `:157` |
| `--border` (`border-border`) | `#e1e6ee` | `#26282c` | hairline edge, divider; also the default border colour of every element (`* { @apply border-border }`) | 10 / 28 | `src/styles.css:50`, `:158`, `:344` |
| `--input` | `#cdd4e0` | `#33363b` | field edge, one step stronger than divider | 1 / 1 | `src/styles.css:52`, `:159` |
| `--ring` | `#2f5be0` | `#8ba3ff` | focus ring in the ink; base layer sets `outline-ring/50` on everything | 2 / 2 | `src/styles.css:54`, `:160`, `:344` |

### 1.2 Colour: the blue ink, verdicts, drawing marks

| Token | Light | Dark | Role | Used (home / all) | Source |
|---|---|---|---|---|---|
| `--primary` (`bg-primary`, `text-primary`, `border-primary`) | `#2f5be0` | `#8ba3ff` | the one blue ink: every line, callout, link, primary action (claims 5.9:1 on page) | bg 15 / 29; text 15 / 42; border 3 / 6 | `src/styles.css:33`, `:150` |
| `--primary-foreground` | `#ffffff` | `#121314` | text on primary | via `text-primary-foreground` | `src/styles.css:34`, `:151` |
| `--destructive` (`text-/bg-/border-destructive`) | `#c8394a` | `#ec8592` | off the scale, broken | text 8 / 17; bg 6 / 17; border 5 / 5 | `src/styles.css:58`, `:161` |
| `--success` | `#1f845a` | `#6fc39a` | uses a decision, fixed | text 10 / 11; bg 3 / 5; border 1 / 1 | `src/styles.css:60`, `:162` |
| `--warning` | `#a86a12` | `#d9ab69` | near a decision, a framework default | 0 / 1 text, 0 / 2 bg (docs callout only) | `src/styles.css:62`, `:163`; use `src/docs/callout.jsx:30` |
| `--faint` (`text-faint`) | `#7d879a` | `#6c7078` | figure numbers, plate marks; "3.6:1, large or decorative only" | 1 / 7 | `src/styles.css:66`, `:164` |
| `--grid` (`bg-grid`) | `#e4e9f1` | `#2a2c31` | rules inside a surface | 0 / 1 | `src/styles.css:68`, `:165` |
| `--tint-1` | `#edf2ff` | `color-mix(primary 10%, background)` | lightest ink fill, away face | 0 / 11 | `src/styles.css:70`, `:166` |
| `--tint-2` | `#d6e1ff` | `color-mix(primary 22%, background)` | soft fill, hovered part; avatar fill, note callout ground, `journey-flash` | 3 / 15 | `src/styles.css:72`, `:167` |
| `--tint-3` | `#a9bcfb` | `color-mix(primary 42%, background)` | lit fill, selected part | 0 / 4 | `src/styles.css:74`, `:168` |
| `--tint-4` | `#6b8cf2` | `color-mix(primary 68%, background)` | the one part a figure is about | 0 / 3 | `src/styles.css:76`, `:169` |

### 1.3 Colour: stages, code, families, blueprint

| Token | Light | Dark | Role | Used (home / all) | Source |
|---|---|---|---|---|---|
| `--stage` (`bg-stage`) | `#2f5be0` | `#26408f` | the hero's blue field; white on it reads 6.0:1 | 3 / 5 | `src/styles.css:80`, `:170` |
| `--stage-foreground` | `#ffffff` | `#ffffff` | text on stage | text 4 / 5; `bg-stage-foreground/10,/15` 3 / 3 | `src/styles.css:81`, `:171` |
| `--code` (`bg-code`) | `#161d2b` | `#0b0c0e` | commands and code blocks, dark in both themes | 4 / 12 | `src/styles.css:83`, `:172` |
| `--code-foreground` | `#e9edf5` | `#e9edf5` | text on code | 4 / 17 | `src/styles.css:84`, `:173` |
| `--code-keyword` | `#9fb4ff` | none | syntax: language words | 0 / 9 | `src/styles.css:86` |
| `--code-string` | `#9fe3b8` | none | syntax: strings | 0 / 11 | `src/styles.css:88` |
| `--code-flag` | `#ffcf8a` | none | syntax: flags and numbers | 0 / 11 | `src/styles.css:90` |
| `--code-comment` | `#8a96ad` | none | syntax: comments, prompts | 0 / 20 | `src/styles.css:92` |
| `--family-spacing` | `#0f8f9c` teal | `#5fd0da` | mark for the spacing family (docs only) | 0 / 2 | `src/styles.css:96`, `:175` |
| `--family-colour` | `#d1407f` pink | `#f28bbd` | colour family | 0 / 3 | `src/styles.css:98`, `:176` |
| `--family-radius` | `#7650d4` violet | `#b49cf5` | radius family | 0 / 2 | `src/styles.css:100`, `:177` |
| `--family-type` | `#2f62d6` blue | `#8fb0ff` | type family (a near-miss of `--primary`, not equal) | 0 / 3 | `src/styles.css:102`, `:178` |
| `--family-motion` | `#b87806` amber | `#f2c25e` | motion family | 0 / 3 | `src/styles.css:104`, `:179` |
| `--family-elevation` | `#2a9160` green | `#79d6a1` | elevation family | 0 / 3 | `src/styles.css:106`, `:180` |
| `--family-z` | `#d4572a` orange | `#f59a72` | z family | 0 / 2 | `src/styles.css:108`, `:181` |
| `--blueprint` (`bg-blueprint`) | `#2f5be0` | none | the Opening's blueprint field | 0 / 1 | `src/styles.css:112` |
| `--trace` | `color-mix(in oklab, #2f5be0 10%, transparent)` | none | measuring line on the built page | 0 / 2 | `src/styles.css:114` |
| `--blueprint-ink` | `#ffffff` | none | blueprint linework | 0 / 10 | `src/styles.css:116` |
| `--blueprint-line` | `color-mix(in oklab, #ffffff 62%, transparent)` | none | blueprint secondary lines | 0 / 4 | `src/styles.css:118` |
| `--blueprint-redline` | `#ffe1db` | none | drift on the blueprint (claims 4.6:1) | 0 / 3 | `src/styles.css:120` |

The nine colours with no dark value are exactly the `--code-keyword/-string/-flag/-comment` and the five `--blueprint*`/`--trace`; Plumber reports "dark values for 37 of 46 colours" (section 9). Blueprint mode re-points surface tokens (`--background`, `--card`, `--foreground`, `--muted-foreground`, `--border`, `--primary`, `--primary-foreground`, `--destructive`, `--tint-1`, `--tint-2`, `--trace`) under `[data-mode='blueprint']` (`src/opening/opening.css:4-16`).

Hard-coded colours in homepage-tree components (not tokens): `src/system/Field.jsx:25-29` (five mesh stops `#16309c`, `#2f5be0`, `#6b8cf2`, `#dfe6ff`, `#ffb36b`); `src/system/Wrench.jsx:61-62` (`INK` `#16309c/#2f5be0/#a6b9ff/#8e9ab3`, `NUT_INK` loose `#e5484d`, tight `#22a35a`); `src/system/Sticker.jsx:90,120-123,149,305,348` (`#fff`, `#c9d0dc/#eef1f6/#e3e8f0` curl, `#101828`, `#161d2b`, badge ground `#3a4357`, seal ticks `#9aa5b8` at `:298`); `src/site/NutMark.jsx:31,37,39` (`rgb(16_24_40/.3)`, `#000`, `#fff`).

### 1.4 Type tokens

See section 2 for the scale in use. Definitions:

| Token | Value | Source |
|---|---|---|
| `--font-display` | `'Instrument Sans Variable', system-ui, ...` | `src/styles.css:203` |
| `--font-sans` | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | `src/styles.css:272` |
| `--font-mono` | `"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, monospace` | `src/styles.css:274` |
| `--font-heading` | `var(--font-sans)` (unused) | `src/styles.css:276` |
| `--font-weight-normal / medium / semibold` | 400 / 500 / 650 (no bold; `font-bold` is not generated) | `src/styles.css:279,281,283` |
| `--text-2xs` | 10px / 12px | `src/styles.css:286-287` |
| `--text-xs` | 12.5px / 18px | `src/styles.css:289-290` |
| `--text-sm` | 14px / 21px | `src/styles.css:292-293` |
| `--text-base` | 17px / 27px | `src/styles.css:295-296` |
| `--text-lg` | 20px / 30px | `src/styles.css:298-299` |
| `--text-2xl` | 32px / 38px, tracking -0.022em | `src/styles.css:301-303` |
| `--text-4xl` | 40px / 44px, tracking -0.03em | `src/styles.css:309-311` |
| `--text-5xl` | 52px / 56px, tracking -0.035em | `src/styles.css:313-315` |
| `--text-7xl` | 76px / 76px, tracking -0.045em | `src/styles.css:305-307` |

### 1.5 Spacing

There is no spacing token in `styles.css`. The site's "decisions" for spacing are declared in config as 16 steps of Tailwind's `--spacing` (0.25rem): `0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 24, 32` = 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 96, 128px (`plumber.config.mjs:4-10`). Reasons written for six steps: 3 "related parts and compact controls" (12px), 6 "card padding" (24px), 10 "between a figure and its text" (40px), 16 "the sheet margin" (64px), 24 "between sections" (96px), 32 "before the close" (128px) (`plumber.config.mjs:8`). The ruler section shows only the first eleven (to 40px) with reasons on 3, 6, 10 (`src/sections/scales.js:3-13`); it also lists Tailwind's 15 default steps (`src/sections/scales.js:14`).

Spacing as authored on the homepage (Tailwind classes, from the files): section shell `mx-auto max-w-6xl px-6 py-24 md:px-12 gap-10` (`src/sections/Section.jsx:17`); hero `max-w-7xl gap-12 px-6 pt-24 pb-16 md:px-12 lg:gap-16` (`src/hero/Hero.jsx:176`); title strip `h-14 max-w-6xl px-6 md:px-12` (`src/site/TitleStrip.jsx:67`); plate content `p-6 md:p-8` (`src/sections/Reads.jsx:28`); chip cards `p-4` (`src/sections/Reads.jsx:70`); proof cards `p-5` (`src/sections/Install.jsx:43`); stage `p-6 md:p-8` (`src/sections/Everywhere.jsx:36`). Hero stage `p-6` (`src/hero/Hero.jsx:248`).

### 1.6 Radius

| Token | Value | Role | Used (home / all) | Source |
|---|---|---|---|---|
| `--radius` | `8px` | base | `var(--radius)` 0 / 3 | `src/styles.css:123` |
| `--radius-sm` (`rounded-sm`) | `calc(var(--radius) - 3px)` = 5px | chips, keys, small controls | 16 / 36 | `src/styles.css:263` |
| `--radius-md` | `var(--radius)` = 8px | controls, inputs | 16 / 47 | `src/styles.css:265` |
| `--radius-lg` | `calc(var(--radius) + 4px)` = 12px | cards and panels you hold | 10 / 19 | `src/styles.css:267` |
| `--radius-full` | `9999px` | round things | 26 / 38 | `src/styles.css:269` |

`rounded-xl`, `rounded-2xl` etc. do not exist (defaults wiped, `src/styles.css:199`). The shadcn Button's base class is `rounded-none` (5 uses of `rounded-none` in `src/components/ui/button.jsx`), so unmodified Buttons are square (`src/components/ui/button.jsx:6`).

### 1.7 Shadow and elevation

| Token | Value | Role | Used (home / all) | Source |
|---|---|---|---|---|
| `--shadow-plate` | `0 0 0 1px var(--border), 0 1px 2px rgb(16 24 40 / 0.04), 0 10px 30px -14px rgb(16 24 40 / 0.16)` | plate hairline edge, drawn inside | 14 / 29 | `src/styles.css:318` |
| `--shadow-sticker` | `0 1px 0 rgb(0 0 0 / 0.08), 0 6px 14px -6px rgb(16 24 40 / 0.35)` | die-cut sticker | 0 / 0 (Plumber: unused) | `src/styles.css:320` |
| `--shadow-lift` | `0 0 0 1px var(--border), 0 2px 4px rgb(16 24 40 / 0.05), 0 20px 44px -18px rgb(16 24 40 / 0.28)` | a card held over the page | 7 / 13 | `src/styles.css:322` |

Shadow values are the same in dark mode (no `.dark` override); the `rgb(16 24 40)` shadow ink is hard-coded. Other shadow values in code: sticker `drop-shadow()` strings (`src/system/Sticker.jsx:32-33`), NutMark `drop-shadow-[0_1px_1px_rgb(16_24_40/.3)]` (`src/site/NutMark.jsx:31`), Opening scan-line glow `shadow-[0_0_24px_4px_rgb(255_255_255/0.6)]` (`src/opening/Opening.jsx:96`), blueprint-mode `.shadow-lift` swapped to an inset hairline (`src/opening/opening.css:32-34`). The `plate` utility = `--card` bg + `--radius-lg` + `--shadow-plate` (`src/styles.css:363-367`; used 7 / 19 as the bare word).

### 1.8 Motion tokens

| Token | Value | Role | Used (home / all) | Source |
|---|---|---|---|---|
| `--dur-quick` | 140ms | hover, press | 3 / 7 | `src/styles.css:135` |
| `--dur-move` | 240ms | a callout travels, a label swaps | 2 / 12 | `src/styles.css:136` |
| `--dur-explode` | 620ms | a figure comes apart / together | 1 / 4 | `src/styles.css:137` |
| `--stagger` | 60ms | between successive parts | 0 / 0 | `src/styles.css:138` |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | things arriving; long settle | 0 / 6 (all in `opening.css`/docs) | `src/styles.css:334` |
| `--ease-spring` | `linear(0, 0.21 6%, 0.62 15%, 0.9 25%, 1.01 36%, 1.02 46%, 1 60%, 1)` | settle, under 2% overshoot | 0 / 0 | `src/styles.css:336` |
| `--default-transition-duration` | 140ms | default for every `transition-*` utility | implicit | `src/styles.css:338` |
| `--default-transition-timing-function` | `cubic-bezier(0.16, 1, 0.3, 1)` | same | implicit | `src/styles.css:339` |

Reduced motion zeroes `--dur-move`, `--dur-explode`, `--stagger` (not `--dur-quick`) (`src/styles.css:184-190`).

### 1.9 Z-index

| Token | Value | Role | Used (home / all) | Source |
|---|---|---|---|---|
| `--z-raised` | 10 | a part over neighbours (nuts, gate, install steps' sticker, hero stage content) | 5 / 6 | `src/styles.css:325` |
| `--z-sticker` | 20 | stickers over the stage; receipt | 3 / 3 | `src/styles.css:327` |
| `--z-dim` | 30 | the page dimmed while Plumber reads a part | 1 / 1 | `src/styles.css:329` |
| `--z-bar` | 40 | title strip; the stage lifted over the dim | 2 / 3 | `src/styles.css:331` |

### 1.10 Other tokens (drawing geometry, utilities, keyframes)

| Token / utility | Value | Used | Source |
|---|---|---|---|
| `--stroke-hair / -line / -bold` | 1px / 1.25px / 2px | only through the `draw-*` utilities | `src/styles.css:126-128` |
| `--dash-leader`, `--dash-hidden` | `5 5`, `2 4` | only through `draw-leader`, `draw-hidden` | `src/styles.css:129-130` |
| `--grid-step` | 12px "dot grid pitch" | 0 uses anywhere | `src/styles.css:131` |
| `--explode` | 56px | 0 uses anywhere | `src/styles.css:132` |
| `@utility draw-line/-bold/-hair/-leader/-hidden` | stroke in `--primary`, `non-scaling-stroke` (hidden: opacity .6) | `Specimen.jsx` only (dev page) | `src/styles.css:370-374`; `src/Specimen.jsx:18-20,101,163-167` |
| `@utility plate` | see 1.7 | 7 / 19 | `src/styles.css:363-367` |
| `@keyframes family-draw` | dashoffset 1 → 0 | `docs/family.jsx` | `src/styles.css:378-385` |
| `@keyframes journey-flash` | bg `--tint-2` → transparent | `docs/figures/ValueJourney.jsx:232` | `src/styles.css:388-395` |
| `@source inline("rounded-lg rounded-md rounded-sm p-4 p-6 gap-3 gap-4 text-sm text-base px-3 px-4")` | safelist for the hero's post-fix classes | n/a | `src/styles.css:10` |
| base layer | `* {border-border outline-ring/50}`, body `bg-background font-sans text-base text-foreground`, antialiased, `optimizeLegibility`, `::selection` = `bg-accent` | global | `src/styles.css:342-360` |

---

## 2. Type

### Fonts loaded

| Face | Loaded by | Used where | Source |
|---|---|---|---|
| JetBrains Mono Variable | `@import "@fontsource-variable/jetbrains-mono"` | `font-mono`: commands, chips, class names, file names, ruler rows, PR numbers (26 home / 105 all) | `src/styles.css:4`, `:274` |
| Instrument Sans Variable | `@import "@fontsource-variable/instrument-sans"` | `font-display`, applied only by the Opening dev page (`#opening`, 2 uses); the homepage does not use it | `src/styles.css:5`, `:203`; `src/opening/Opening.jsx:89,446` |
| system-ui stack | `--font-sans`; body default | everything that is not mono (homepage headings included) | `src/styles.css:272,353` |
| Newsreader Variable | listed in `package.json` dependencies, never imported | nowhere (comment still says "a book serif for reading") | `site/package.json` (dependencies); `src/styles.css:13` |
| Phosphor icons | `components.json` `iconLibrary: "phosphor"`, `@phosphor-icons/react` in deps | no imports anywhere in `src/` | `site/components.json:13`; `site/package.json` |

Sticker SVG text hard-codes its own stacks (`SANS`, `MONO`) and weights 700/800 (`src/system/Sticker.jsx:233-234,262,300,354`). shadcn style is `base-lyra`, Base UI primitives, `tsx: false` (`site/components.json:3,7`).

### Scale in use

| Step (size / line, tracking) | Weight | Elements (source) | Count home / all |
|---|---|---|---|
| `text-7xl` 76/76, -0.045em | 650 | hero `h1` "plumber prevent your design system drift" (`src/hero/Hero.jsx:188`) | 2 / 2 |
| `text-5xl` 52/56, -0.035em | 650 | hero `h1` below `lg`; Opening `h1` (`src/hero/Hero.jsx:188`; `src/opening/Opening.jsx:105`) | 1 / 6 |
| `text-4xl` 40/44, -0.03em | 650 | every section `h2` (`src/sections/Section.jsx:25`); hero closing line "Six fixed. Zero drift." (`src/hero/Hero.jsx:198`) | 3 / 6 |
| `text-2xl` 32/38, -0.022em | 650 | phone size of `h1`/`h2` (`max-sm:text-2xl`); Specimen/Systems block titles (`src/hero/Hero.jsx:188`; `src/system/Systems.jsx:18`) | 2 / 10 |
| `text-lg` 20/30 | 400 / 650 | section lead (`src/sections/Section.jsx:28`); hero lead (`src/hero/Hero.jsx:203`); title-strip brand, 650 (`src/site/TitleStrip.jsx:68`); check glyph (`src/sections/Install.jsx:88`) | 5 / 17 |
| `text-base` 17/27 | 400 / 650 | body default (`src/styles.css:353`); "That was Plumber." line (`src/hero/Hero.jsx:210`); proof/step titles (`src/sections/Install.jsx:44,89`); PR titles (`src/sections/KeptTrue.jsx:95`); `Section` CTA link, 650 (`src/sections/Section.jsx:32`); ledgers | 10 / 23 |
| `text-sm` 14/21 | 400 / 500 / 650 | the working size: lead-ins, captions, buttons, commands, chips, footer links, ruler rows, nav toggles | 45 / 112 |
| `text-xs` 12.5/18 | 600 | nut numeral, tags, chips, `Pro` badge, nav links in title strip, PR chips, `BLOCKED` stamp, diff lines | 24 / 81 |
| `text-2xs` 10/12 | | Opening ruler lettering only | 0 / 8 |
| Off-scale literals | | `text-[15px]` on the drifted name (`src/hero/DriftedCard.jsx:29`, intentional); footer wordmark `text-[11rem]` (`src/sections/Footer.jsx:34`, with `max-sm:text-7xl`) | n/a |

Weight use: `font-semibold` (650) 42 / 129; `font-medium` (500) 6 / 8; `font-normal` 1 / 3 (`DriftedCard` name uses 500, `src/hero/DriftedCard.jsx:29`). Tabular figures: `tabular-nums` 4 / 25 on counters and ruler values (`src/sections/Ruler.jsx:139`; `src/sections/Everywhere.jsx:84`; `src/sections/KeptTrue.jsx:131`). Headlines carry `text-balance` (`src/sections/Section.jsx:25`; `src/hero/Hero.jsx:188`). Headings are not given an element-level style; every heading class is set at the call site (hero and section titles: 650 weight, scale token tracking baked into the token).

---

## 3. Motion grammar

### 3.1 Named springs (motion/react), the only shared motion constants

| Name | Spring | Meaning | Used by | Source |
|---|---|---|---|---|
| `snap` | stiffness 500, damping 30 | a token snapping into place | ruler handle (`src/sections/Ruler.jsx:133`), Reads toggle indicator (`src/sections/Reads.jsx:47`), Everywhere tile gap and counter (`src/sections/Everywhere.jsx:63,86`), KeptTrue switch thumb and odometer (`src/sections/KeptTrue.jsx:61,133`) | `src/site/motion.js:5` |
| `detent` | 600 / 35 | the magnet pulling a value onto a step | ruler on a step (`src/sections/Ruler.jsx:68`) | `src/site/motion.js:6` |
| `settle` | 300 / 30 | a part arriving where it belongs | section header (`src/sections/Section.jsx:22`), hero headline, card, receipt, done panel, diff (`src/hero/Hero.jsx:187,209,217,267,280,323`), install pill (`src/site/TitleStrip.jsx:40`), ruler grow and row fold (`src/sections/Ruler.jsx:54,156`), sticker fold and drag tilt (`src/system/Sticker.jsx:173,184`) | `src/site/motion.js:7` |
| `pop` | 500 / 22 | stickers, checks, verdicts appearing | NutMark appear (`src/site/NutMark.jsx:24`), Reads chips (`src/sections/Reads.jsx:69`), ruler contact dot (`src/sections/Ruler.jsx:177`), sticker snap-home (`src/system/Sticker.jsx:170,204`) | `src/site/motion.js:8` |
| `turn` | 260 / 21 | the wrench turning a nut: weight, one small overshoot | NutMark 60° (`src/site/NutMark.jsx:34`), Wrench config (`src/system/Wrench.jsx:48`) | `src/site/motion.js:9` |
| `STAGGER` | 0.04 s | between parts that move together | only `docs/figures/ValueJourney.jsx:21` imports it | `src/site/motion.js:12` |

Other springs not in `motion.js`: sticker sheen `{stiffness 200, damping 30}` (`src/system/Sticker.jsx:174`); Mascots `SPRINGY {320, 20}` and `LAND {420, 24}` (`src/system/Mascots.jsx:38-39`).

### 3.2 Durations and easings in use outside the tokens

| Value | For | Source |
|---|---|---|
| 0.2 s | page dim fade | `src/hero/Hero.jsx:242` |
| 0.6 s, `[0.65, 0, 0.35, 1]` | hero closing line clip-path wipe | `src/hero/Hero.jsx:197` |
| 300ms, `cubic-bezier(.2,.8,.2,1)` | the read part lifts 2px (inline style, `translate`) | `src/hero/Hero.jsx:92` |
| 0.3 s, `[0.16, 1, 0.3, 1]` | field turbulence lerp ("each fix felt within 300ms") | `src/system/Field.jsx:38,72` |
| 0.42 s, keyframes `[1.35, 1.08, 0.98, 1]` x / `[1.35, 0.9, 1.02, 1]` y, times `[0,.55,.8,1]`, `easeOut` | sticker slap-on | `src/system/Sticker.jsx:28,223-224` |
| 0.32 s, `[0.16, 1, 0.3, 1]` | sticker flip (rotateY 180) | `src/system/Sticker.jsx:31,257` |
| 0.32 s, `[0.4, 0, 0.2, 1]` | Install step card flip, perspective 900px | `src/sections/Install.jsx:16,69` |
| 0.28 s, times `[0, .6, 1]` | `BLOCKED/PASSED` stamp: scale 1.6 → 1.08/0.9 → 1, rotate -3° when blocked | `src/sections/KeptTrue.jsx:104-107` |
| 0.16 s + delay | Everywhere chip rotateY flip | `src/sections/Everywhere.jsx:72` |
| 700ms (SWEEP), `[0.45, 0, 0.55, 1]` | Opening scan line | `src/opening/Opening.jsx:48,83` |
| `--dur-move` + `--ease-out` + per-element `--develop` delay | blueprint re-inking | `src/opening/opening.css:18-24` |
| Wrench: 0.12 / 0.14 / 0.16 / 0.24 / 0.28 s mixtures; detent click 55ms (30ms when opening wide); torque 6°; turn 60° | wrench verbs | `src/system/Wrench.jsx:38-52,191-213` |

### 3.3 Storyboard and TIMING conventions

Convention (HOMEPAGE.md §3.4): one integer `stage` per section, a `TIMING` table, config objects, and a storyboard comment at the top of each file (`site/HOMEPAGE.md:79`). As built:

- Storyboard header comment in: Hero, Reads, Everywhere, KeptTrue, Install, Footer, Ruler, Sticker, Wrench, Field, NutMark, Opening, Mascots, docs Callout/Code/Family (`src/hero/Hero.jsx:1-29` etc.).
- `TIMING` tables: Hero `{ zero: {receipt 150, chip 50, still 400, line 600, diff 900}, headline 120, card 300, nuts 560, stagger 60 }` (`src/hero/Hero.jsx:41-47`); Reads `{ chips: 0.05 }` (`src/sections/Reads.jsx:17`); Everywhere `{ ring: 0.05 }` (`src/sections/Everywhere.jsx:19`); Install `{ flip: 0.32 }` (`src/sections/Install.jsx:16`); Mascots `{ notice 700, fix 1500, dry 2900, rest 5200, loop 6200 }` (`src/system/Mascots.jsx:24`); fix panel (overlay) `TIMING = { open 260, next 180, click 60, clickGap 45, breath 480, check 600, fold 2300 }` (`overlay/src/fixpanel.js:42`).
- Config objects: `FIELD` (`src/system/Field.jsx:21-39`), `STICKER` (`src/system/Sticker.jsx:25-34`), `WRENCH` (`src/system/Wrench.jsx:38-52`), `RULER = { magnet: 8, release: 12 }` (`src/sections/Ruler.jsx:24`).
- The hero's stage is derived (`useZero`) as 0 not yet, 1 receipt, 2 still, 3 closing line, 4 diff (`src/hero/Hero.jsx:131-141`).
- Triggers: scroll-into-view starts each section intro once (`viewport once`, `src/sections/Section.jsx:20-21`; Reads chips `src/sections/Reads.jsx:67-68`); the visitor's own actions run on springs; the CI conveyor is scroll-scrubbed (`useScroll`, offset `['start 0.85','end 0.35']`, `src/sections/KeptTrue.jsx:35`); the page-level "stage" is not a global integer: `Sheet.jsx` holds `sheet` (-1 hero, 0..3), `fixed`, `drift`, `cheer` (`src/site/Sheet.jsx:15-20`).
- Rolls and counters: odometers by `AnimatePresence mode="popLayout"` with y ±10/14 on `snap` (`src/sections/Everywhere.jsx:85-89`; `src/sections/KeptTrue.jsx:129-138`).

### 3.4 Reduced-motion handling

| Where | Behaviour | Source |
|---|---|---|
| Tokens | `--dur-move`, `--dur-explode`, `--stagger` → 0ms | `src/styles.css:184-190` |
| Field | no shader mounted (`!reduce`), static gradient + grain only | `src/system/Field.jsx:80` |
| Sticker | no slap (`initial=false`, duration 0), no peel, no tilt; still draggable | `src/system/Sticker.jsx:173,182,222,224,256` |
| Wrench | no clicking or turning; nut shown seated and green; eyes still act | `src/system/Wrench.jsx:180,226,249,253` |
| NutMark | rotation skipped; the `pop` scale/opacity spring is NOT gated (header says "no turn or pop") | `src/site/NutMark.jsx:6,33` vs `:23-24` |
| Ruler | starts at its value, `duration: 0` settle | `src/sections/Ruler.jsx:44,68` |
| Install | flip duration 0 | `src/sections/Install.jsx:69` |
| Everywhere | ripple delay 0 | `src/sections/Everywhere.jsx:27` |
| KeptTrue | all PRs shown, conveyor at its end position | `src/sections/KeptTrue.jsx:36,39` |
| Docs (callout, code, figures) | `useReducedMotion` / `motion-safe:` | `src/docs/callout.jsx`, `src/docs/code.jsx`, `src/docs/family.jsx:27,50` |
| Not handled | Hero (headline rise, card drop, closing wipe, receipt, diff), Section header reveal, Reads chip fan, TitleStrip pill, Footer: use `motion` without a reduced-motion check; no `MotionConfig` anywhere | `src/hero/Hero.jsx`, `src/sections/Section.jsx`, `src/sections/Reads.jsx`, `src/site/TitleStrip.jsx` (grep: no `MotionConfig`, `useReducedMotion` absent from these files) |

`prefers-reduced-transparency` (promised for the blur, HOMEPAGE §3.1) is not referenced anywhere in `src/`. `will-change` (HOMEPAGE §3.4 "only during a spring") is not referenced anywhere in `src/`.

### 3.5 Tuning panels

None are left. `useTune(name, config)` is a stub that returns each config's defaults (`[default, min, max]` → default) and is called in Field, Sticker, Wrench (`src/site/tune.js:4-14`; `src/system/Field.jsx:54`, `src/system/Sticker.jsx:170`, `src/system/Wrench.jsx:78`). There is no DialKit dependency (`site/package.json`) and no dial UI in `src/`.

---

## 4. Components

Dev-only pages are reachable by hash: `#primitives` (Specimen), `#systems` (Systems), `#mascots` (Mascots), `#opening` (Opening); docs live at `/docs/*` (`src/entry.jsx:5-11`). The homepage composes `TitleStrip`, `Hero`, `Reads`, `Everywhere`, `KeptTrue`, `Install`, `Footer` inside `PageState` (`src/Home.jsx:13-28`).

Legend for states: R rest, H hover, F focus, P pressed, D disabled, L loading, E error, M empty, S selected. "-" means not handled in code.

### 4.1 Primitives and shared

| Component | What it is and props | States handled | Used by | Gaps | Source |
|---|---|---|---|---|---|
| `Button` (+`buttonVariants`) | shadcn Base UI button via cva. Props: `variant` default/outline/secondary/ghost/destructive/link; `size` default (h-8), xs (h-6), sm (h-7), lg (h-9), icon, icon-xs, icon-sm, icon-lg; `className`, passthrough (`render`, `nativeButton`) | R, H (bg tint per variant), F (`border-ring` + `ring-1 ring-ring/50`), P (`translate-y-px`), D (`opacity-50`, no pointer events), E (`aria-invalid`), S (`aria-expanded` for outline/secondary/ghost) | TitleStrip ×3, Copy, Install step card, Systems, Mascots, Specimen | no loading state; base `rounded-none` (square) so callers add `rounded-sm` (Copy, Install do); no icon-only usage anywhere | `src/components/ui/button.jsx:5-53` |
| `cn` | re-export of the `cn` package | n/a | button, utility | n/a | `src/lib/utils.js:1` |
| `Copy({ text })` | a dark command bar with a Copy button, `bg-code`, `rounded-md`, `shadow-plate`, `$ ` prefix | R, copied for 1.4 s (`aria-live` label), E silently swallowed | Hero (twice) | no failure message; no reduced-motion need | `src/site/Copy.jsx:5-25` |
| `NutMark({ n, fixed, label, open, shown, delay, onClick, style })` | a drift marked as a 24px hex nut on the part, number inside; absolutely positioned by the caller | loose (red), fixed (green, ✓, turns 60° on `turn`), appear/disappear (scale+opacity on `pop`), H/F reveal label (`group-hover`, `group-focus-visible`), `open` forces label, F ring-2 | Hero ×6 | no pressed or disabled style; reduced motion does not stop the pop (see 3.4) | `src/site/NutMark.jsx:15-49` |
| `TitleStrip` (+`InstallPill`) | fixed 56px header: brand + wrench, sheet nav (`lg+`), install pill (`md+`, after hero leaves view), GitHub (`sm+`), Day/Night, Install | nav `aria-current` (text-primary), pill enter/exit on `settle`, pill copied `Copied ✓` (1.4 s), H on nav and buttons | Home, Systems | Day/Night is a plain Button with a constant label (no pressed/aria state); pill failure silent; header comment still describes a plumb bob ("swings with how fast you scroll") that the code does not have | `src/site/TitleStrip.jsx:14-99` |
| `PageState` / `usePageState` / `SHEETS` | context: `sheet` (-1 hero, 0-3), `fixed`, `drift`, `cheer` + `cheerOnce` | n/a | Hero, Sections, TitleStrip, Install | n/a | `src/site/Sheet.jsx:5-21` |
| `useNarrow` | `(max-width: 639px)` boolean | n/a | Hero (phone step labels, hides tip) | initial value read synchronously (`matchMedia` at first render) | `src/site/useNarrow.js:4-15` |
| `SPRING`, `STAGGER` | see 3.1 | n/a | 17 importers | `STAGGER` used once (docs) | `src/site/motion.js` |
| `useTune` | stub | n/a | Field, Sticker, Wrench | no panel | `src/site/tune.js` |
| `iso`, `C30`, `pts`, `PLANE` | isometric helpers | n/a | Specimen | docs/homepage do not use them | `src/iso.js:1-6` |

### 4.2 Sections

| Component | What it is and props | States handled | Gaps | Source |
|---|---|---|---|---|
| `Section({ id, n, title, lead, children, cta, stage, className })` | shared frame: `h2` 40/44, lead 20/30, children, last-line CTA "`{cta} →`" pointing to `#install`; marks the sheet in the nav on 35% view | enter once (y 12 → 0, opacity, `settle`); CTA H underline | `stage ? 'text-primary' : 'text-primary'` (both branches identical, `:32`); default CTA "Run it on your repo"; `py-24` top and bottom | `src/sections/Section.jsx:9-38` |
| `Hero` | section 1: copy column + blue stage with `Field`, `DriftedCard`, six `NutMark`s, `Seal`, `OffBy`, receipt chips, `Diff`; hooks `useDrifts`, `useReading`, `useParts`, `useWritten`, `useZero` | load (headline, card, nuts), reading (page dim, stage lifts to `--z-bar`, part lifts 2px), per-fix, zero (receipt, closing line, diff, `Copy`), phone variant | no error state if the overlay is absent (nuts call `plumb-overlay.pin?.`); drift count read from DOM class mutation; "Press Write" copy vs voice rules (section 8) | `src/hero/Hero.jsx:148-308`, `Diff` `:313-349` |
| `DriftedCard` + `HERO_DRIFTS` | the six deliberate drifts: `rounded-[10px]`, `p-[21px]`, `gap-[13px]`, `text-[15px]`, `px-[15px]`, `rounded-[3px]` | static | by design the only intended drift on the homepage; Plumber reports them (section 9) | `src/hero/DriftedCard.jsx:13-50` |
| `Reads` (+`Specimen`) | ruler plate with a two-option radiogroup ("This site's theme" / "Tailwind's defaults") and six chips (radius, type, elevation) | toggle R/S (`layoutId` indicator on `snap`); chips fan in on `pop` | radio buttons have no focus-visible style and no arrow-key roving despite `role="radio"` | `src/sections/Reads.jsx:19-96` |
| `Ruler({ steps, max=40, start=13, prefix='gap', onSettle, value, readout, className })` | draggable ladder; magnet 8px, release 12px; keyboard ←/→/↑/↓/Home/End | rest, drag (held), on-step (primary), between (drift colour, ±delta), click-seat, steps change (rows fold), F ring on handle, reduced | `Everywhere` passes `tone="stage"`, which `Ruler` never reads; magnet/release differ from HOMEPAGE.md (6/10) | `src/sections/Ruler.jsx:24-221` |
| `Everywhere` (+`Tile`, `Counter`, `PARTS`) | blue stage with nine recognisable parts (button, form row, card, list, toast, nav, modal, tabs, avatars), each with a chip `10px` → `✓ gap-N`; ripple by ring | off / fixed; ripple 50ms per ring; counter 0 → 9 | parts use hard-coded sizes (`max-w-44`, `size-8`); modal "Delete file?" etc. are static illustrations | `src/sections/Everywhere.jsx:23-164` |
| `KeptTrue` (+`Pr`, `Meter`, `Roll`) | scroll-scrubbed conveyor of six PRs through a "plumber check" gate; baseline switch; illustrative meter (312 known) | baseline on/off, PR through/not, `BLOCKED`/`PASSED` stamps, reduced | the switch button has no focus-visible style; `added = baseline ? 0 : 0` (`:41`); numbers labelled illustrative | `src/sections/KeptTrue.jsx:31-139` |
| `Install` (+`StepCard`) | four proof cards (static facts), four flip-cards each with a command and Copy; step 3 carries `Shipping` sticker | front/back flip on copy, last copy triggers the wrench's nut (`cheerOnce`), aria-hidden on hidden face | copy failure is swallowed but still marks the step done (`src/sections/Install.jsx:60-65`); no way to un-copy | `src/sections/Install.jsx:32-96` |
| `Footer` | stage band with calm `Field`, huge "Plumber" wordmark in the page ground colour, standing wrench (button), three link columns, bottom row with `Badge`, Day/Night, Back to top | wrench click adds a nut; links H | wordmark is `aria-hidden`; theme toggle duplicated from TitleStrip | `src/sections/Footer.jsx:21-69` |

### 4.3 System components

| Component | What it is and props | States handled | Used by | Gaps | Source |
|---|---|---|---|---|---|
| `Field({ turbulence=1, className })` | the stage gradient: static CSS gradient, lazy `shaders/react` MeshGradient, deep-blue pool, SVG grain; turbulence 1 (restless) → 0 (still) eased | R, no-WebGPU fallback (`onUnavailable`), reduced motion (no shader), live (fades in over `--dur-explode`) | Hero, Everywhere, Footer, Systems | not paused off-screen (no IntersectionObserver; HOMEPAGE says it is); no `prefers-reduced-transparency`; mesh stops hard-coded | `src/system/Field.jsx:51-111`, `src/system/FieldLive.jsx:4-15` |
| `OffBy({ px=3, fix='gap-3', flipped, rest=-5, delay, className })` | callout-tag sticker, red → flips (rotateY) to green `✓ fix` | slap-on, hover peel, drag, flip, reduced | Hero (px=2), Systems | `px` default 3 vs hero 2 | `src/system/Sticker.jsx:240-279` |
| `Seal({ count=6, rest=6, ... })` | inspection seal (white disc, 48 ticks, one out of line, count, "OFF THE SCALE" on a curved path) | same minus flip; count text red | Hero | stays red even at count 0 (colour is `var(--destructive)` regardless) | `src/system/Sticker.jsx:282-313` |
| `Shipping({ rest=-3, ... })` | parcel tag, blue, "SHIPS TO PRODUCTION / 0 bytes" | same | Install | wording differs from HOMEPAGE "Ships 0 bytes to prod" | `src/system/Sticker.jsx:316-335` |
| `Badge({ label='plumber', value='0 new drift', rest=3 })` | README-style CI badge with a wrench glyph; green right half | same | Footer | label "plumber" vs doc "plumb" | `src/system/Sticker.jsx:340-361` |
| `Wrench({ mood, cheer, target, scale, compact, className })` | the buddy; moods `idle/worried/content`, `cheer` bump = fit and turn a nut, `compact` for the title strip | idle, hover (jaw opens 3 detents), worried (measures every 2.6-4.2 s), content, cheer, reduced | TitleStrip, Footer, Docs, Systems | `target` prop unused by callers; colours hard-coded | `src/system/Wrench.jsx:74-344` |
| `Mascots` | four prototype characters (Wrench, Elbow, Plumber, Valve) on one 6.2 s loop; dev page | five stages | `#mascots` only | prototype; carries its own `C` palette (`#22a35a`, `#58a8ff`, ...) | `src/system/Mascots.jsx:1-489` |
| `Systems` | review page: every shared system in every state (`Dowsing`, `Springs`) | n/a | `#systems` only | n/a | `src/system/Systems.jsx:25-173` |
| `Specimen` | primitives sheet: colours, isometric figure, drawing strokes, plates | n/a | `#primitives` only | still documents "a book serif" and `draw-*` that no page uses | `src/Specimen.jsx:113-219` |
| `Opening` (+`ModeSwitch`, `TopRuler`, `SideRulers`, `Reading`, `Card`, `Dot`) | a page that flips between Site and a Blueprint view with a scan line, rulers and per-part readings, from the recorded resolver output | site/blueprint, sweep, reduced motion (instant) | `#opening` only | uses `font-display`, literal `z-30`, `-z-10` and `fill: ink` colours (Plumber flags them); not on the homepage | `src/opening/Opening.jsx:50-569`, `src/opening/opening.css` |

### 4.4 Docs components (same site, `/docs`)

`Docs` shell (header, section nav, ~70ch article, "On this page" outline) `src/docs/Docs.jsx:21-195`; `Callout` kinds note (blue "i"), careful (amber "!"), why (raised, folds) `src/docs/callout.jsx:36`; `CodeBlock`, `Recorded`, `CopyButton` (peeling duplicate), `InlineCode` `src/docs/code.jsx:28-222`; `Family` tile for the seven families `src/docs/family.jsx:88`; prose map `src/docs/prose.jsx:49`; reference tables with filter `src/docs/reference.jsx:115-294`; five figures `src/docs/figures/{FindingAnatomy,DecisionSources,LedgerSteps,LiveGap,ValueJourney}.jsx`. Docs build on the same tokens, `SPRING`, `Wrench` and `plate`.

---

## 5. The world

The metaphor: the design system is the pipework, a hard-coded value is a leak, a drift is a loose nut, a fix tightens the joint (`site/HOMEPAGE.md:67`; `src/system/Mascots.jsx:3`). The product name on the page is "React Plumber".

| Thing | What it is, how it looks and moves | Where |
|---|---|---|
| Wrench buddy | adjustable wrench standing on its handle: fixed jaw, movable jaw on a knurled worm (jaw moves in 0.5-unit detents), I-beam handle with a hang hole; two white dot eyes, no mouth, no limbs; blue metal gradient with `#16309c` ink. Verbs: measure (jaw opens 4 detents, holds 300ms), fit, turn (60° on `turn`), release, torque (+6° on the last fix). Idle: still, eyes follow the pointer, blinks every 4-7 s. Hover: jaw opens 3 detents. Click: fits a nut. Content: eyes as happy arcs. Compact build for the title strip (handle 30 vs 50, eyes 1.4x). | `src/system/Wrench.jsx:1-344` (consts `:38-62`); mood driven by `drift`/`cheer` in `src/site/Sheet.jsx:17-19`; used `src/site/TitleStrip.jsx:70`, `src/sections/Footer.jsx:38` |
| Nut mark | a 24px hex nut (flats left/right), red `fill-destructive` with the drift's number; fixed: turns 60° (one flat) while going green (`fill-success`), number becomes ✓; label blooms out beside it on hover/focus | `src/site/NutMark.jsx:13-49` |
| Wrench's nut | separate hex nut inside the wrench's jaw with its own red/green (`#e5484d` / `#22a35a`) | `src/system/Wrench.jsx:62,302` |
| Stickers | four die-cut vinyl SVGs with a 4px white border (`STICKER.cut`), tilt at rest (rest angles -5, 6, -3, 3, -2 in code), shadow via `drop-shadow()`. Enter: scale 1.35 → squash (1.08 x / 0.9 y) → 1 over 0.42 s. Hover: sheen follows the pointer, nearest corner folds back across a crease with curl shading (peel 18px base; 22-44px per sticker). Drag: lifts to 1.06, tilts with velocity (max ±14°), snaps home on `pop`. `OffBy` flips to a green back "✓ gap-3". | `src/system/Sticker.jsx:1-363` |
| Shader field and blue stages | the stage is a rounded-lg (12px) `bg-stage` panel with `shadow-lift` that holds `Field`. Field layers: static CSS gradient (radial warm point upper-right `#ffb36b` 70%, core `#6b8cf2`... edge `#16309c`, base `#2f5be0`), lazy MeshGradient (5 stops, 5 points, smoothness 2.6, seed 3, oklab), a deep-blue radial pool (45%), SVG fractal-noise grain (opacity 0.4, `overlay`). Restless `{speed 3, drift .75, swirl .35}` → still `{speed .6, drift .25, swirl 0}` | `src/system/Field.jsx:21-111`; stage panels at `src/hero/Hero.jsx:248`, `src/sections/Everywhere.jsx:36`, `src/sections/Footer.jsx:32` |
| Receipt and diff | each token Plumber wrote drops in as a mono chip under the seal; then a dark `bg-code` figure lists "− before + after" per line, red and green | `src/hero/Hero.jsx:259-274,313-349` |
| Ruler | a spacing ladder drawn as bars of true length with a draggable handle and a hairline guide | `src/sections/Ruler.jsx:1-221` |
| Plate | white card with the layered hairline shadow; the surface of every figure | `src/styles.css:363-367` |
| Day / Night | graphite night mode ("a neutral grey with no cast, so the blue ink stays the only colour") | `src/styles.css:141-143` |
| Mascots (rejected prototypes) | Elbow, Plumber, Valve beside the Wrench; HOMEPAGE decision: wrench buddy replaces "Bob the plumb bob" | `src/system/Mascots.jsx:17-21`; `site/HOMEPAGE.md:218` |
| Isometric drawing | `iso()` helpers used by the primitives sheet; no homepage figure uses them | `src/iso.js:1-6`; `src/Specimen.jsx:5-10` |

---

## 6. The quality bar

### 6.1 What HOMEPAGE.md says

- Bar: "the overlay's reading card. It has solid surfaces, real type weight, colour as fill, and one clear action. Every section is held to it." (`site/HOMEPAGE.md:19`)
- Feeling: "Oh, that's satisfying." with "The snap of a token into place, a sticker flipping to ✓, a wrench seating a nut." (`site/HOMEPAGE.md:15`)
- Colour: "blue as fill and action; verdicts as 10-12% tints, never solid." (`site/HOMEPAGE.md:96`)
- "Not used: decorative hairlines, dot paper, drafting frames, confetti." (`site/HOMEPAGE.md:98`)
- Performance: "animate transform and opacity only, never `box-shadow`". (`site/HOMEPAGE.md:87`)
- Process: "Build one section at a time, each reviewed before the next starts." (`site/HOMEPAGE.md:3`)
- Stickers: "at most 2 per viewport, and never over text". (`site/HOMEPAGE.md:60`)
- Rhythm: "Spacing is 96-128px between sections, 24 between cards, and 8/12/16 inside cards." (`site/HOMEPAGE.md:34`)

### 6.2 The reading card as built (`overlay/src/widget.js`, tokens in `overlay/src/tokens.css`)

Markup: `.card[role=dialog]` containing `.top` (head), optional `.chain`, `.diagram`, `.txt`, `.read`, `.notes`, `.synced`, `.foot` (`overlay/src/widget.js:1117-1133`).

- **Surface:** `background var(--pl-paper)` `#fdfcf8` warm off-white (dark `#1c1c1e`); `border-radius var(--pl-radius-card)` 12px; `box-shadow var(--pl-shadow-card)` = `0 0 0 1px var(--pl-rule), 0 1px 2px rgb(28 27 25 / .06), 0 14px 32px -14px rgb(28 27 25 / .28)` (dark: `0 0 0 1px rule, 0 1px 1px rgb(0 0 0/.3), 0 14px 32px -14px rgb(0 0 0/.8)`); `overflow: clip`. (`overlay/src/widget.js:159-160`; `overlay/src/tokens.css:8,85,88,130`)
- **Width:** `clamp(360, element width + 24, 480)` px set inline (`overlay/src/widget.js:1114,1119`; `--pl-card-w: 360px` declared at `overlay/src/tokens.css:75`, not read by this card).
- **Type:** head label `600 11px/14px` sans (`--pl-text-label`); reading title `600 13px/18px` sans with `text-wrap: pretty` (`.read .t`); change row `500 12px/17px` mono (`--pl-card-code`); body `400 13px/19px` (`--pl-card-body`); meta `400 12px/17px` (`--pl-card-meta`); "because" `400 12px/17px`, clamped to 2 lines; ledger tag `11px` caps `.04em`. Faces are system-only; the overlay fetches no fonts (`overlay/src/tokens.css:43-53`; `overlay/src/widget.js:207-263`).
- **Colour:** ink `#1d1b17`, supporting ink `#6b665c`, ticks `#b3ad9f` (never text), rule `#e6e1d6`, inset `#f4f1ea` (`overlay/src/tokens.css:8-13`). Verdicts as tints on transparent: from = coral text on 9% coral, struck through; to = mint text on 11% mint (`overlay/src/widget.js:253-260`).
- **Regions and spacing:** head 32px tall with a 1px `--pl-rule` bottom border, padding-inline `12 6`; `.read` is a grid with `gap: 8px`, padding `10px 12px 12px`; footer padding `6px 6px 6px 8px`; status row padding `8px 12px 0` with a top rule. Comment states the system: "4 inside a group, 8 between parts, 12 between rows, 16 between sections" (`overlay/src/widget.js:155-157,176-182,236,276-283`).
- **Radius inside:** change chips 4px, buttons 6px, head buttons 5px, zoom buttons 3px, pill 7px (`--pl-radius-pill`), tags 6px (`--pl-radius-tag`) (`overlay/src/widget.js:187,260,286`; `overlay/src/tokens.css:81-85`).
- **The one action:** `.btn.primary.write` in the foot, label from `words.js` ("Apply changes" per voice.md), 28px high, `font 500 12.5px`, `radius 6px`, text `--pl-on-action` (pink ink `#5a0d3c`) on `--pl-action-soft` (pink soft `#ffd0ec`), `box-shadow 0 1px 0 rgb(0 0 0/.08)`; hover mixes 15% `--pl-action` pink (`#e0369f`) in; active `translateY(1px)`; disabled = transparent with an inset 1px `--pl-ink-3` outline; `.done` = mint text on 12% mint; busy = 11px spinner. Siblings are `.btn.plain` ("Before", "Undo", "Copy for agent"; 28px, ink-2 text, paper-2 on hover). Enter does the primary action (`overlay/src/widget.js:1157`). (`overlay/src/widget.js:282-300,1131-1132`; `overlay/src/tokens.css:21,28-30`)
- **Motion:** opens from `opacity 0, translateY(-4px) scale(.985)` over `--pl-dur-card` 180ms `--pl-ease-out`; `.top .n.won` pops 0.9 → 1.1 → 1 in 600ms; `.change .to` slides in 4px over 200ms; focus ring `2px solid --pl-instrument` (sky `#2a7fd0`), offset 2px (`overlay/src/widget.js:161-164,172-173,260-263`).
- **Accessibility:** `role="dialog"`, `aria-label`, `aria-live` on `.read`, `role="status"` on status, focus on the card on open, keys 1-9 / Enter / E / arrows (`overlay/src/widget.js:1131,1139,1157`).

Site-vs-card: the card is warm (`#fdfcf8` paper, `#1d1b17` ink), the page is cool (`#f2f4f8` / `#161d2b`); the card's actions are pink, the page's actions are blue.

### 6.3 The fix panel as built (`overlay/src/fixpanel.js`)

The panel that shows "Apply changes" on a blueprint cause is a separate surface with its own, hard-coded values (it does not read `--pl-*` for colour):

- Frosted glass, bottom-centre: `position: fixed; left: 50%; bottom: 72px; width: 520px; max-width: calc(100vw - 32px)`, `background rgb(255 255 255 / .82)`, `backdrop-filter blur(22px) saturate(1.6)`, `border-radius: 18px`, ink `#1c1b19`, `font 13px/1.35` sans, hairline `0 0 0 .5px rgb(0 0 0/.09)` plus two long soft shadows and an inset top highlight (`overlay/src/fixpanel.js:50-53`). Dark: `rgb(30 30 33 / .82)`, ink `#f1f0ec` (`:121`).
- Rest line: 46px, a 7px pink dot `#ff1f8f` with a 3px halo, count in weight 550, and the primary button: 32px high, `radius 11px`, ink `#1c1b19` fill, white text (dark: `#f1f0ec` fill), inset top highlight, `scale(.97)` on press (`:57-61`).
- Specimens (the options as drawn things): `flex 1 1 0` tiles, max 104px, `radius 12px`, space drawn in the property's own pattern; picked = white tile, `0 0 0 1.5px #1c1b19` ring; the current off value greyed and struck through at 45% opacity (`:78-93`).
- Fields: 34px high, `radius 10px`, white, inset 1px `rgb(0 0 0/.12)`; focus inset 1.5px ink; invalid `#c2304f` (`:96-103`).
- Motion: height `260ms` on `cubic-bezier(.3, 1.35, .5, 1)`; body slides in 180ms on `cubic-bezier(.2,.8,.2,1)`; check draws after 600ms; confetti burst of 40 canvas pieces (`overlay/src/fixpanel.js:42-46,70,108-114`).
- Element card (Alt+click on non-text): `.ec`, 276px wide, glass `rgb(255 255 255 / .9)` blur 22px, `radius 16px`, own locals `--sky #2f6bff`, `--coral #e2533a`, `--ink-2 #55544f`, `--ink-3 #8b8a85`, pop `280ms cubic-bezier(.2, .9, .25, 1.15)` (`overlay/src/elementcard.js:59-67`).
- Retired surface: `.bpp, .cg, .sel { display: none !important }` hides the old side panel (`overlay/src/fixpanel.js:49`); `PANEL_CSS` (300px, paper, 12px radius) still ships (`overlay/src/blueprint-panel.js:34-47`).

Three overlay surface vocabularies therefore coexist: the `--pl-*` paper card, the glass `.fx`/`.ec` panels with literal hexes, and the page-level drawing layer in section 7.

---

## 7. Overlay visual language

### 7.1 Palette (`overlay/src/tokens.css`)

| Hue | Line | Soft fill | Deep ink | Meaning (file comment) | Source |
|---|---|---|---|---|---|
| sky | `#2a7fd0` | `#c5e6fd` | `#0b3554` | selected, measure, focus; `--pl-instrument`/`--pl-accent` | `:17,25-26` |
| coral | `#e5503f` | `#ffd3cd` | `#5c160e` | off the system; `--pl-off` | `:18,36` |
| mint | `#1f9e64` | `#c9f2dd` | `#0b3d26` | on the system, written; `--pl-on` | `:19,35` |
| butter | `#c48a00` | `#ffeab0` | `#4a3400` | softer trouble (Tailwind default, wrong tier); `--pl-soft` | `:20,37` |
| pink | `#e0369f` | `#ffd0ec` | `#5a0d3c` | actions (Write/Apply, Fix all); `--pl-action` | `:21,28-30` |
| lilac | `#7a5cf0` | `#e3dcff` | `#2b1a6b` | names (element/component tags) | `:22` |
| unknown | `#75736d` | n/a | n/a | computed at runtime, can't tell yet; `--pl-unknown` | `:38` |

Verdict grounds: `--pl-on-bg`, `--pl-off-bg`, `--pl-soft-bg` = 12 / 10 / 12% of the hue mixed into paper (`:39-41`). Dark: soft fills equal the line colour, e.g. coral `#ff7a6b`, mint `#7ee0b0`, butter `#ffd166`, sky `#7cc4fa`, pink `#ff6ec7`, lilac `#b9a6ff` (`:121-126`). Neutrals: paper `#fdfcf8` / `#1c1c1e`, paper-2 `#f4f1ea` / `#26262a`, rule `#e6e1d6` / `#323236`, ink `#1d1b17` / `#f4f3ef`, ink-2 `#6b665c` / `#a8a6a0`, ink-3 `#b3ad9f` / `#5f5d58` (`:8-13,115-120`). The halo: `rgb(255 255 255 / .9)` (dark `rgb(10 10 12 / .85)`), a 1px knockout around every instrument line (`:31,128`).

Overlay type: five steps (card title 600 14/20, body 400 13/19, meta 400 12/17, code 500 12/17 mono, label 600 11/14), tracking label 0.02em, caps 0.05em (`:47-53`). Space ladder `--pl-space-1..8` = 2, 4, 6, 8, 12, 16, 20, 24 (`:60-67`). Geometry: line 1px, tick 8px, drop 16px, tag height 22px, row 40px, card width 360px, pad 16px, choice 48px, gap 12px (`:70-78`). Radii: mark 2, tag 6, pill 7, row 8, card 12 (`:81-85`). Shadows: card (above), tag `0 0 0 1px rule, 0 2px 6px -2px rgb(28 27 25 / .24)` (`:89`). Motion: ease-out `cubic-bezier(0.16, 1, 0.3, 1)`, spring = the same `linear()` as the site's `--ease-spring`, pop spring `linear(0, 0.25 7%, 0.68 17%, 0.96 28%, 1.04 40%, 1.03 52%, 1.005 68%, 1)` (~4% overshoot), durations travel 220 / drop 140 / card 180 / feedback 120 / dim 160 / undim 120ms; reduced-motion zeroes travel, drop, card and feedback (`:92-98,104-105,158-164`). Scrim `rgb(20 20 22 / 0.46)` with `grayscale(1)` backdrop filter (`:102-103`). Z `2147483647` (`:108`).

### 7.2 Drawing encodings

| Encoding | Meaning | Values | Source |
|---|---|---|---|
| Padding hatch | padding: the old-Mac 45° pattern | `.pl-hatch`: `repeating-linear-gradient(45deg, hue 55% 0 1px, transparent 1px 6px)`. In the fix panel's specimens: pattern 3x3 rotated 45°, bar 1.1px, hue `26 158 98` (green) | `overlay/src/language.js:34`; `overlay/src/fixpanel.js:157-159,80` |
| Margin dots | margin: 50% dot dither | `.pl-dither`: dots r 0.75px at 3x3 pitch, hue 60%. Fix-panel specimen: circle r .8, pitch 3, hue `226 128 10` (orange) | `overlay/src/language.js:35`; `overlay/src/fixpanel.js:157,80` |
| Gap stripes | gap: horizontal stripes | pattern 4 x 2.5 with a 1px bar; hue `122 92 240` (purple) | `overlay/src/fixpanel.js:158,80` |
| Checker | a transparent fill | 8px conic checker in `--pl-paper-2` | `overlay/src/language.js:36` |
| Ants | picked but not written: marching selection | 1px dashes, 8px period, 600ms linear march, still under reduced motion | `overlay/src/language.js:38-43` |
| Rainbow | the dock's mark, nowhere else | pink / mint / butter / sky quarters | `overlay/src/language.js:45` |
| Pill | a measurement, count or token | 20px, radius 7px, mono 600 11px tabular; pastel soft fill + deep ink, six hues via `data-hue` | `overlay/src/language.js:22-29` |
| Tag | a name | 22px, radius 6px, sans 600 12px; lilac by default | `overlay/src/language.js:30-32` |
| Pop | anything appearing | 260ms `--pl-spring-pop`, from opacity 0 scale .92 | `overlay/src/language.js:47-48` |
| Glyphs | eleven drafting-pen icons: spacing, radius, type, color, shadow, z, motion, habit, ownership, imitation, craft, existence | 24-unit artboard, 1px non-scaling stroke, square caps, miter joins, fills only where solid by meaning | `overlay/src/glyphs.js:1-53` |
| Heat (blueprint, at rest) | what is off glows, as much as it is off; the page is never boxed | colour `--pl-heat` `#ff1f8f` magenta (dark `#ff4fa7`); Gaussian blur std 2.4 → 4.2 over five levels; `HEAT = { min .3, gain 2.2, rest .62, lit .28, quiet .1, blur [2.4, 4.2], thin 1.5, pulse 700, arrival 2, stagger 60 }`; arrival: two pulses per zone, worst first | `overlay/src/blueprint-marks.js:72,162-169,327-328` |
| Missing-space dots (blueprint) | space the system wants that is missing | cyan `--pl-sys` `#00a3ff` (dark `#2bb8ff`) dots, pattern 3.5px, r .95, white .6 stroke | `overlay/src/blueprint-marks.js:72,329` |
| All-clear marks | page is clear | four registration marks in `#00a3ff` (dark `#2bb8ff`), 1.5px, spring to the corners | `overlay/src/blueprint-marks.js:75-77` |
| Zone labels | class → token on the page | 18px, radius 6px, mono 500 11px, white text on coral; soft on butter; picked on mint; halo ring | `overlay/src/blueprint-marks.js:58-62` |
| Pointed pill | one pill by the pointer | 24px, dark `#1c1b19`, mono 600 11.5px, from `#ff7ab8`, to `#6fd0ff` | `overlay/src/blueprint-marks.js:83-87` |
| Dim | page held under the instrument | `--pl-scrim` + grayscale(1) backdrop; fade-in 160ms, out 120ms; reduced motion none | `overlay/src/blueprint-marks.js:35-40` |
| Mark kinds | k-off coral, k-soft butter, k-debt `--pl-ink-3`, k-current accent sky, k-picked mint | stroke and text | `overlay/src/blueprint-marks.js:48-52` |
| Lit place | hatching over the exact region a mark is about | -45°, 1px lines at 4px pitch, 55% hue, inset 1px outline in the hue; `.ok` outline only | `overlay/src/widget.js:146-152` |
| Card skeleton | the element at real proportions, findings hatched in it | outline stroke `--pl-ink-2` 55%, 1px non-scaling; `.reg` hatch pattern 5px, 1.4px bars, -45°, opacity .35 (1 when active); hatches for off / soft / ok / quiet | `overlay/src/widget.js:222-229,1250` |
| Dimension chips | numeric value on the skeleton | mono 600 10px/14px, paper text on hue fill, radius 3px | `overlay/src/widget.js:216-219` |
| Reticle | what the pointer is on | four 8px corner arms in `--pl-instrument`, 1px, with halo; travels 220ms on the spring | `overlay/src/widget.js:131-134` |
| Box model bands | the DOM's blocks as drawn tints | margin 9%, padding 20%, gap 30% of sky; off-scale = coral at 22 / 38 / 42%; border = sky band; content = 1px sky outline; line boxes = lilac 12% with dashed lilac baseline; per-block 12px icon | `overlay/src/boxmodel.js:29-48` |
| Scale ruler | the steps that fit as ticks, yours as a mark between | 58px tall; tick 1px ink-2, hovered 18px sky, picked 3px x 22px sky with a dot; yours = coral `em` with a coral triangle; gap = coral 35% bar | `overlay/src/choices.js:123-140` |
| Ladder | the theme's scale in order | grid of rungs 52px, picked tint = 12% sky in paper, dashed coral notch for yours | `overlay/src/choices.js:145-165` |
| Ledger tags | new / debt / exception | uppercase 11px; new coral on 10%; debt ink-2 on paper-2; exception mint on 10% | `overlay/src/widget.js:240-243` |

Verdict mapping used everywhere: coral = off, mint = on or written, butter = softer (framework default, wrong tier), unknown grey, sky = selection and focus, pink = the action (`overlay/src/tokens.css:17-38`). The page-level heat deliberately uses magenta and cyan rather than these hues (`overlay/src/blueprint-marks.js:72`); amber (butter) is used for the softer label and mark kinds, not for heat.

---

## 8. Copy voice (`docs/copy/voice.md`)

Governs the words on the page (pills, tags, rows), findings, and the overlay's chrome. CLI and docs "follow later" (`docs/copy/voice.md:7-8`).

Rules in brief (`docs/copy/voice.md:10-43`): say what is wrong the way a person would say it aloud; lead with the thing they can see; one idea per sentence, two sentences at most; real numbers; name the CSS property then the token in brackets (`right padding 12 (s3)`); talk to the person about their code ("your scale"), never about the product; errors say what happened and what to do next; no colons chaining clauses, no middle-dot sentences, no em dashes as glue (a middle dot only separates values in a pill); sentence case, no period on labels and pills; counts read as English ("3 problems", "1 problem", "Nothing to fix on this screen"); length budgets: pill ≤ 28, row label ≤ 32, finding first line ≤ 72, reason ≤ 90, toast ≤ 48 characters, enforced by a test (`:42-43`).

Banned internal words and their replacements (`docs/copy/voice.md:24-34`):

| Inside | Person sees |
|---|---|
| drift, off the scale | not on your scale / not in your theme |
| cause | one fix (that covers N places) |
| finding, mark, claim, verdict | problem (or nothing: the drawing says it) |
| facet | the property's name: right padding, corners, text size |
| craft rule, tier, confidence | nothing |
| write, save | apply |
| refused | couldn't apply |
| read again, reading | checking |
| locate, site, source line | where it is in your code |

Decided (`docs/copy/voice.md:110-119`): the button is "Apply changes" and the toast "Applied"; "problems" not "issues"; "Blueprint" stays as the mode's name (Alt+B) and no sentence starts with it; unreachable code says "Can't reach this in your code"; every string is checked against the better-writing skill (jakub.kr); fix-panel words live in `overlay/src/words.js` (`FIX`), never inline; verbs first (Use md, Add to theme, Keep as is, Skip, Apply changes); status is parallel ("Applying 3 changes…" → "3 changes applied"). All overlay strings belong in `overlay/src/words.js`, grouped `pill / label / line / reason / chrome`, with one test for the budgets (`:121-125`).

The retired type proposal (`docs/design/system-proposal.md`, retired 2026-11-03, `:5-7`) kept the plain-word style names Display, Headline, Title, Title small, Body, Body small, Label, Label small (`:17-19`) and its ladder rows ("Ag" drawn at true size capped at 28px) (`:35-41`).

---

## 9. Plumber on its own site

Command: `node dist/cli.js --root site` and `--json` from the repo root. Both ran (the text run took ~1.4 s). Exit code 1 (findings exist). Nothing in `site/` was written by the run beyond what was already modified (`site/src/hero/Hero.jsx` was already modified before; `git status` shows only that and an untracked `site/src/project/crafting-ui.json`).

Header: "React Plumber site · Tailwind 4.3 · theme src/styles.css · 45 files · 1.0s". Summary line: "A system, half in use: shadcn's tokens are installed; 97% of values use them, dark values for 37 of 46 colours, 42% of inline styles are literals." JSON: tool `react-plumber` 0.2.0, Tailwind 4.3.3, files 35 jsx + 2 css + 8 other, 614 unique classes (95 opaque), 4,286 declarations (3,871 class, 96 arbitrary, 46 stylesheet, 9 apply, 140 inline, 120 custom-property, 4 keyframes), inline: 71 sites, 30 literal, 61 opaque.

On your tokens (share of values from decisions; findings off):

| Family | From tokens | Off | Source (JSON coverage) |
|---|---|---|---|
| z | 72% | 5 | 13 / 18 |
| radius | 94% | 6 | 92 / 98 |
| elevation | 94% | 3 | 46 / 49 |
| motion | 95% | 7 | 134 / 141 |
| spacing | 95% | 32 | 626 / 658 |
| color | 99% | 11 | 728 / 739 |
| type | 100% | 4 | 796 / 800 |

Ledger (`site/.plumber/ledger.jsonl`, 135 entries): 59 new, 0 debt, 28 exception sites, 0 stale (`JSON ledger`). The JSON holds 31 findings (11 error, 20 info): 9 `provenance/arbitrary`, 9 `provenance/opaque-inline`, 3 `provenance/color`, 2 `provenance/elevation`, 1 each of `provenance/spacing`, `provenance/motion`, `provenance/z`, `provenance/z/by-value`, and 4 `dead/*` (color 8 tokens, type 14, motion 2, elevation 1).

Top problems the text run prints ("10 new findings", "18 values off your tokens, most in spacing"):
1. `fill: ink` raw colour, 6 sites in `src/opening/Opening.jsx` (317, 323, 328, 341, +2): suggests `--color-grid` / `--color-muted`.
2. The six hero drifts, reported as designed: `p-[21px]` and `rounded-[10px]` (`src/hero/DriftedCard.jsx:24`), `gap-[13px]` (`:25`), `text-[15px]` (`:29`), `rounded-[3px]` and `px-[15px]` (`:41`).
3. `fill: nutTight ? NUT_INK.tight : NUT_…` raw colour at `src/system/Wrench.jsx:302`.
4. `animation-delay: ${k * STAGGER * 2}s` off motion tokens at `src/docs/figures/ValueJourney.jsx:233`.
5. `left: calc(${GATE * 100}% + 24px)` off spacing at `src/sections/KeptTrue.jsx:74`.
Dead tokens Plumber reports (info): 8 colour (`styles.css` lines 207, 216-218, 226, 232, 234, 238 = `--color-trace`, `-card-foreground`, `-popover`, `-popover-foreground`, `-accent-foreground`, `-warning`, `-grid`, `-tint-4`), 14 type (`--font-heading`, `--text-2xl/4xl--line-height`, `--text-2xl/4xl/5xl--letter-spacing`, etc.), 2 motion (`--ease-spring`, `--stagger`), 1 shadow (`--shadow-sticker`); dead summary `deadDecisions`: motion 2/8, type 14/29, color 8/45, elevation 1/3, radius 0/4, z 0/4, spacing 0/16.

What it says about the site's own drift: the system is almost fully used (97% from tokens; spacing 16 of 16 steps used, z 4 of 4, radius 4 of 4). The visible drift is concentrated in three places: the six intentional hero drifts (the product demo), the Opening dev page (6 raw colours, literal `z-30`/`-z-10`, one glow shadow, all excepted or flagged), and a handful of one-off values in KeptTrue, Wrench and docs figures. 28 sites are accepted as exceptions with reasons (mostly `opaque-inline` 15, `z/by-value` 6). Dead tokens cluster in type variants, the colours shadcn expects (popover, card-foreground, accent-foreground), and three motion/shadow tokens the code replaced with inline values. The 59 "new" ledger entries are not baselined (debt 0), so the CLI exits 1.

Ledger oddity: 34 of the 37 colour decisions in the ledger carry the same recorded why, "Syntax colours for code on the dark code ground: keyword, string, flag and comment, each a…", including `--color-background`, `--color-card`, `--color-accent` (`site/.plumber/ledger.jsonl`).

---

## 10. Inconsistencies

### 10.1 Hard-coded values in components that are not tokens

- Mesh colours `#16309c #2f5be0 #6b8cf2 #dfe6ff #ffb36b` (the last two have no token; `#2f5be0` = `--primary`, `#6b8cf2` = `--tint-4`) `src/system/Field.jsx:25-29`.
- Wrench palette `#16309c #2f5be0 #a6b9ff #8e9ab3`, nut `#e5484d` / `#22a35a` (the page's tokens are `#c8394a` / `#1f845a`) `src/system/Wrench.jsx:61-62`; Mascots `#22a35a`, `#58a8ff`, etc. `src/system/Mascots.jsx:26-36`.
- Sticker whites and greys: `#fff`, `#c9d0dc/#eef1f6/#e3e8f0`, `#101828`, `#161d2b` (= `--foreground`), `#3a4357` (badge ground), `#9aa5b8` (seal ticks) `src/system/Sticker.jsx:90-123,149,298,305,348`.
- Shadow ink `rgb(16 24 40)` repeated in three tokens and in sticker/NutMark drop-shadows `src/styles.css:318-322`, `src/system/Sticker.jsx:32-33`, `src/site/NutMark.jsx:31`.
- The sticker shadow exists as a token (`--shadow-sticker`) AND as literal drop-shadows with different values: token `0 1px 0 rgb(0 0 0/.08), 0 6px 14px -6px rgb(16 24 40/.35)`; code `drop-shadow(0 1px 0 rgb(0 0 0/.1)) drop-shadow(0 6px 10px rgb(16 24 40/.28))` `src/styles.css:320` vs `src/system/Sticker.jsx:32`.
- Easing and duration literals: hero lift `cubic-bezier(.2,.8,.2,1)` (not `--ease-out`) `src/hero/Hero.jsx:92`; wipe `[0.65,0,0.35,1]` `:197`; install flip `[0.4,0,0.2,1]` `src/sections/Install.jsx:69`; Opening sweep `[0.45,0,0.55,1]` `src/opening/Opening.jsx:83`; `--ease-spring` has no user while the same curve is named in the overlay `src/styles.css:336`, `overlay/src/tokens.css:93`.
- Layout literals: conveyor `CARD = 248`, `GATE = 0.42`, `left: calc(42% + 24px)`, card `w-58` `src/sections/KeptTrue.jsx:28-29,74,93`; footer wordmark `text-[11rem]` `src/sections/Footer.jsx:34`; hero `min-h-130`, `min-h-105`, `top-32` `src/hero/Hero.jsx:248,259`; `h-48` step cards `src/sections/Install.jsx:68`; seal and tag sizes in SVG units `src/system/Sticker.jsx:237,282,316,340`.
- Opacity steps used ad hoc: `bg-foreground/8` (dim), `/10`, `/12`, `/15`, `/20`, `/45`, `/70`, `/85` across components (e.g. `src/hero/Hero.jsx:238,251,305`; `src/sections/Ruler.jsx:165`).
- Opening: `fill: ink` ×6 raw colours, `z-30`, `-z-10`, `max-w-[75rem]` `src/opening/Opening.jsx:89-105,317-341` (Plumber findings, section 9).
- The hero's own deliberate drifts (intended): `rounded-[10px] p-[21px] gap-[13px] text-[15px] px-[15px] rounded-[3px]` `src/hero/DriftedCard.jsx:24-41`. Everywhere's tiles start at an off-scale 10px on purpose `src/sections/Everywhere.jsx:20`.
- Overlay literals in the fix and element panels (`#1c1b19`, `#ff1f8f`, `#c2304f`, `#3b6cff`, `#2f6bff`, `#e2533a`, ...) instead of `--pl-*` `overlay/src/fixpanel.js:50-103`, `overlay/src/elementcard.js:59-67`; blueprint pill `#1c1b19 / #ff7ab8 / #6fd0ff` and `#00a3ff` `overlay/src/blueprint-marks.js:72,77,83-87`.

### 10.2 Duplicate or conflicting tokens

- One blue, five spellings: `--primary`, `--ring`, `--stage`, `--blueprint` all `#2f5be0`; `--family-type` is `#2f62d6` (close, not equal); Field and Wrench re-state it as `#2f5be0` `src/styles.css:33,54,80,112,102`.
- Three staggers: `STAGGER` 0.04 s (`src/site/motion.js:12`), `--stagger` 60ms (`src/styles.css:138`), Hero `stagger: 60` (`src/hero/Hero.jsx:46`), Reads chips 0.05, Everywhere ring 0.05.
- The sticker rest tilts and caption sizes differ per use; the sticker border is 4px (`STICKER.cut`) vs 3px in HOMEPAGE.md §3.2 (`src/system/Sticker.jsx:26`).
- `--font-sans` is system-ui; `--font-display` (Instrument Sans) is also loaded globally via `@import`, though only the dev Opening uses it `src/styles.css:5,203,272`.
- Two verdict reds and greens: tokens (`#c8394a`, `#1f845a`) vs Wrench nut (`#e5484d`, `#22a35a`); NutMark on the page uses tokens, so the loose nut on the title-strip wrench and the nuts on the card differ in hue `src/site/NutMark.jsx:36`, `src/system/Wrench.jsx:62`.
- Two palettes for one product: site (cool paper, ink blue `#2f5be0`, red `#c8394a`, green `#1f845a`, amber `#a86a12`) and overlay (warm paper `#fdfcf8`, sky `#2a7fd0`, coral `#e5503f`, mint `#1f9e64`, butter `#c48a00`, pink action `#e0369f`) `src/styles.css:22-62` vs `overlay/src/tokens.css:8-37`.
- Overlay comment says "Blue is for actions" but the primary action is pink (`--pl-action`) and sky is only selection/instrument `overlay/src/widget.js:155` vs `overlay/src/tokens.css:24-30`.
- Overlay older names kept: `--pl-text-title`, `--pl-text-row`, `--pl-text-reading` and "6px stays only until each component moves to the ladder" `overlay/src/tokens.css:54-58`.
- `--default-transition-duration` is 140ms, equal to `--dur-quick`, but declared separately `src/styles.css:338,135`.

### 10.3 HOMEPAGE.md versus code

| HOMEPAGE.md says | Code | Source |
|---|---|---|
| Headline "Every pixel has a plumb line." (`:107`) | "plumber prevent your design system drift" | `site/HOMEPAGE.md:107`; `src/hero/Hero.jsx:190` |
| Install command `npm i -D @unlocalhosted/plumb`; steps `npx plumb init`, `npx plumb install --overlay --write` (`:36,182-185`) | `@unlocalhosted/react-plumber`, `npx plumber init`, `npx plumber install` | `src/site/TitleStrip.jsx:54`; `src/sections/Install.jsx:26-29` |
| Stickers: "off by 3px"; "6 off the scale"; "Ships 0 bytes to prod"; "plumb · 0 new drift" (`:52-57`) | `OffBy px={2}` in the hero; Shipping reads "SHIPS TO PRODUCTION / 0 bytes"; badge label "plumber" | `src/hero/Hero.jsx:302`; `src/system/Sticker.jsx:326-330,340` |
| Shader field: `Aurora` under `Blur`, three stops incl. `#ffb36b` at ≤12% coverage; paused off-screen; blur dropped under `prefers-reduced-transparency` (`:43-49`) | `MeshGradient`, five stops, grain and pool layers; no off-screen pause; no reduced-transparency handling | `src/system/Field.jsx:21-39`; `src/system/FieldLive.jsx:12` |
| Ruler detent magnet 6px, release 10px (`:149-150`) | `RULER = { magnet: 8, release: 12 }` | `src/sections/Ruler.jsx:24` |
| Type: "system sans ... mono only for code" (`:93`); "Not used: decorative hairlines, dot paper, drafting frames" (`:98`) | mono is used on chips, labels, nut numerals, class names; `styles.css` header still describes "drafting paper ... a book serif"; `draw-*` hairline utilities, dot grid pitch `--grid-step`, 8px blueprint grid exist (Opening, Specimen only) | `src/styles.css:12-17,126-131`; `src/opening/Opening.jsx:93` |
| "Spacing is 96-128px between sections" (`:34`) | every `Section` is `py-24` top and bottom, so adjacent sections are 192px apart | `src/sections/Section.jsx:17` |
| "Live tuning panels in dev, frozen into constants before shipping" (`:90`) | `useTune` returns defaults; no panel exists | `src/site/tune.js:14` |
| Hero sticker count chip "6 off the scale" becomes "✓ on the scale" (`:55`) | `Seal` has no ✓/green back; it stays red at 0 | `src/system/Sticker.jsx:282-313` |
| Token receipt chips `gap-3, p-6, rounded-lg…`; diff at 900ms (`:131-133`) | built (`TIMING.zero`) | `src/hero/Hero.jsx:42` |
| "Sections: Hero (stage) → Reads (paper) → One fix (stage) → CI (paper) → Proof and install (paper) → Footer (stage band)" (`:34`) | matches | `src/sections/*` |
| Footer: "A shader band ... a huge Plumb wordmark cut out of it" (`:191`) | wordmark is text coloured with `text-background` over the field, not a cutout | `src/sections/Footer.jsx:34` |
| "Install is always in reach ... pinned 36px mono pill" (`:36`) | built as `h-9` pill, `md+` only | `src/site/TitleStrip.jsx:42` |
| Revision 2 "Corners: 8px and 12px" (`:97`) | tokens give 5 / 8 / 12; `rounded-sm` (5px) is widely used; Button base `rounded-none` | `src/styles.css:263-267`; `src/components/ui/button.jsx:6` |
| NutMark header: "reduced motion: no turn or pop" | pop is not gated | `src/site/NutMark.jsx:8` vs `:23-24` |
| `TitleStrip` header: a plumb bob hangs from the name | no bob; the wrench is there | `src/site/TitleStrip.jsx:1-4` |

### 10.4 Dead tokens and unused components

- Never used by any source file: `--shadow-sticker`, `--ease-spring`, `--stagger`, `--grid-step`, `--explode`, `--stroke-hair/-line/-bold` outside the `draw-*` utilities, `--dash-leader/-hidden` outside the utilities, `--font-heading`, `--popover`, `--popover-foreground`, `--card-foreground`, `--accent-foreground`, `--color-grid` (1 use, Specimen), `--tint-3`/`--tint-4` (Specimen), `font-bold` (not generated), `text-2xs` (Opening only), `STAGGER` (docs only). Plumber's own dead list is in section 9.
- Unused utilities: `draw-line/-bold/-hair/-leader/-hidden` are used only by `Specimen.jsx` (dev page) `src/Specimen.jsx:18-20,101,163-167`.
- Unused dependencies/config: `@fontsource-variable/newsreader`, `@phosphor-icons/react` (and `iconLibrary: phosphor`) `site/package.json`, `site/components.json:13`.
- Unused props: `Wrench` `target` (no caller passes it), `Ruler` `tone` (passed, not read), `Ruler` `readout`/`value` only used by Everywhere/internal `src/system/Wrench.jsx:74`; `src/sections/Everywhere.jsx:51`.
- Pages not linked from the homepage: `Specimen`, `Systems`, `Mascots`, `Opening` (hash routes) `src/entry.jsx:5-10`; `src/iso.js` used only by Specimen.
- Dead branch: `Section` CTA colour (`stage ? 'text-primary' : 'text-primary'`) `src/sections/Section.jsx:32`; `KeptTrue` `added = baseline ? 0 : 0` `src/sections/KeptTrue.jsx:41`.
- Missing dark values: nine colours (section 1.3). `--shadow-*` and `--stage` family not tuned for dark except `--stage`.
- Focus: `Reads` radio toggle, `KeptTrue` switch, Footer/TitleStrip nav links, `Day / Night` buttons in Footer have no focus-visible class beyond the global `outline-ring/50` base `src/sections/Reads.jsx:39-46`; `src/sections/KeptTrue.jsx:54-62`; `src/styles.css:344`.
- Copy versus `voice.md` on the homepage: "drift", "off the scale", "Write" ("Press Write", "In your app, Write edits the source file") appear in hero and section copy where the overlay chrome rules would say "not on your scale" and "apply" `src/hero/Hero.jsx:179-211,305`; `docs/copy/voice.md:24-31`. (The guide's stated scope is the overlay/page/finding strings; the homepage is not named.)
- `.plumber` ledger decision whys: 34 of 37 colour decisions repeat the "Syntax colours..." why `site/.plumber/ledger.jsonl`.
