# Homepage primitives: decisions to make

The primitives layer, settled before any homepage part is built (`docs/homepage-skill/02-prototype-loop.md` §1).
Every problem comes from `site/system.md`, with its source there. Each decision has a recommendation and a reason.
**Nothing has been changed yet.**

Status: proposed 2026-11-03, waiting for the owner.

The shape of the recommendations: **two tiers.** Raw values (*primitives*: a blue, a shadow ink) are defined once.
Everything the page uses is a *role* that points at a primitive (`--primary`, `--stage`, `--ring`). Components read
roles, never hex. This follows the roles-not-values direction already set for the product.

---

## A. The one decision everything else depends on

### D1 · Two palettes for one product
**Problem.** The site is cool (paper `#f2f4f8`, ink blue `#2f5be0`, red `#c8394a`, green `#1f845a`). The overlay is
warm (paper `#fdfcf8`, sky, coral `#e5503f`, mint `#1f9e64`, a pink action `#e0369f`). The homepage runs the real
overlay on itself, so a visitor sees both at once, with two reds meaning "not on your scale".
(system.md §10.2, §6.2, §7.1)

| Option | What it means |
|---|---|
| **a. Page and instrument stay distinct; verdicts are shared** (recommended) | The site keeps its cool palette as *the page*. The overlay stays *the instrument* laid over it. But every place the site shows a verdict (the hero's nuts and stickers, chips, the CI stamp, the wrench's nut) uses the overlay's coral and mint. |
| b. The site adopts the overlay's palette | Warm paper, sky, coral, mint and a pink action across the whole site. One language, but the blue stages and the cool identity go. |
| c. Leave both as they are | Two languages for the same meaning. |

**Why a.** The overlay should read as a tool on top of the page; that contrast helps it. But "off" and "fixed"
must look the same in the demo as in the real tool the visitor installs, or the page teaches the wrong colours.

---

## B. Colour

### D2 · One blue, five names
**Problem.** `#2f5be0` is written in `--primary`, `--ring`, `--stage`, `--blueprint`, `--trace`, and again as raw
hex in `Field.jsx` and `Wrench.jsx`. `--family-type` is a near-miss (`#2f62d6`). (§10.2)
**Recommend.** One primitive `--blue-500: #2f5be0`, plus `--blue-800: #16309c` (the deep blue Field and Wrench both
use). `--primary`, `--ring` and `--stage` point at it. Delete `--blueprint` and `--trace`: they serve only the
Opening dev page, which can use `--stage`. `--family-type` becomes its own distinct hue, or points at `--primary`.
Field and Wrench read the roles instead of hex.
**Why.** One blue to change, and Plumber stops reporting the site's own copies.

### D3 · Verdict colours
**Problem.** The site has red, green and amber verdicts; the wrench's nut uses different raw ones (`#e5484d`,
`#22a35a`); the overlay uses coral, mint and butter. (§10.1, §10.2)
**Recommend.** Following D1a, the roles `--off`, `--on` and `--soft` take the overlay's coral, mint and butter
(light and dark). `--destructive`, `--success` and `--warning` become aliases or are renamed. The wrench's nut uses
`--off` and `--on`. Verdict grounds stay as 10–12% tints, never solid (HOMEPAGE.md's rule).

### D4 · The field's colours
**Problem.** The shader's five stops are raw hex. Two have no token: `#dfe6ff` and the warm `#ffb36b`. (§10.1)
**Recommend.** Roles `--field-deep`, `--field-base`, `--field-light`, `--field-mist` and `--field-warm`, pointing at
blue primitives and one new warm primitive. The warm one is the only warm colour on the site, so name it as such.

### D5 · shadcn leftovers
**Problem.** `--popover`, `--popover-foreground`, `--card-foreground` and `--accent-foreground` are never used, and
`--accent` only colours `::selection`. (§10.4)
**Recommend.** Delete the unused four. Add them back when a component actually needs them.

### D6 · Ad-hoc opacities
**Problem.** `/8`, `/10`, `/12`, `/15`, `/20`, `/45`, `/70` and `/85` are each chosen on the spot. (§10.1)
**Recommend.** Name the jobs, not the numbers:
- `--dim` (8%): the page under the instrument;
- `--verdict-ground` (12%): verdict tints;
- `--on-stage-quiet` (70%): secondary text on the blue stage;
- `--on-stage-fill` (15%): a surface on the stage.

Each existing use gets checked against these four when its part is rebuilt. Any use that fits none of them is
raised with you.

### D7 · Colours with no dark value
**Problem.** The four code-syntax colours and the blueprint set have no dark value. Shadows use one ink in both
themes, so they disappear in dark. (§1.3, §1.7)
**Recommend.** Code stays dark in both themes, so the syntax colours are fine as they are; record that as a
decision. Shadows get a dark set: black ink at higher alpha with the hairline kept, as the overlay already does.

---

## C. Type

### D8 · Which faces *(a fork: shown as variants on the hero headline, not decided in text)*
**Problem.** Everything uses system sans. Instrument Sans is loaded on every page but used only by the Opening dev
page. Newsreader and Phosphor are installed and never used. (§2)
**Options:**
- a. System sans everywhere at 650, as HOMEPAGE.md says. Loads nothing; the most neutral.
- b. Instrument Sans for display and section headings only, system sans for the rest. More character, and it's
  already a dependency.

**Recommend:** decide by looking. Render the hero headline both ways, side by side. Either way, remove Newsreader
and Phosphor, and load Instrument Sans only if it's chosen.

### D9 · Where mono belongs
**Problem.** HOMEPAGE.md says "mono only for code". The code uses mono for chips, labels, nut numerals and class
names. (§10.3)
**Recommend.** Rewrite the rule as "mono for code and for values: class names, tokens, numbers, commands". That's
the overlay's own rule (its pills are mono and tabular). Labels and captions that are words go back to sans.

### D10 · The type scale
**Problem.** The scale is 76 / 52 / 40 / 32 / 20 / 17 / 14 / 12.5 / 10. The 10px step serves only the Opening.
Plumber reports the `--text-4xl` line-height and tracking variants as dead, but they're used through the classes,
which looks like a false positive in Plumber. (§1.4, §9)
**Recommend.** Keep the scale. Drop `2xs` if the Opening goes (D20). Report the false positive as a Plumber bug,
separately from this work.

---

## D. Space and rhythm

### D11 · Where the spacing ladder lives
**Problem.** The theme doesn't wipe Tailwind's default spacing, so `p-5.5` and every half-step compile. The site's
16 real steps live only in `plumber.config.mjs`. (§1.5)
**Recommend.** Make the theme the one source. Declare the 16 steps in `@theme`, with their reasons as comments,
and wipe the rest. Plumber reads the theme, so the config entry goes.
**Why.** That's exactly what Plumber tells its users to do. The site should pass its own advice.

### D12 · Space between sections
**Problem.** Every section has `py-24` top and bottom, so neighbours sit 192px apart. HOMEPAGE.md says 96–128.
(§10.3)
**Recommend.**
- Each section owns only its top space: 128px on desktop (step 32, "before the close", or a new "between sections"
  step), 96px on phone.
- A section's heading sits 40px from its content (step 10, "between a figure and its text").
- Cards are 24px apart, and their insides use 8, 12 and 16.

---

## E. Corners and depth

### D13 · Radius
**Problem.** The steps are 5, 8 and 12. HOMEPAGE.md says 8 and 12. The shadcn Button's base is `rounded-none`.
(§1.6)
**Recommend.**
- Keep 5 / 8 / 12, and write down that 5 is for chips and keys.
- Make the Button base `rounded-md` (8). Check each Button use when its part is rebuilt.
- Keep the nested-radius rule (outer minus padding) as a stated rule.

### D14 · Shadows
**Problem.** The shadow ink `rgb(16 24 40)` is repeated in three tokens and in two components. The sticker shadow
exists as a token and as a different literal, and the code uses the literal. (§10.1)
**Recommend.**
- One primitive, `--shadow-ink`.
- `plate`, `lift` and `sticker` are roles built from it.
- The sticker token takes the literal's tuned value, and `Sticker.jsx` uses the token.
- Add dark values (D7).

---

## F. Motion

### D15 · One motion grammar
**Problem.** The site has two motion systems:
- CSS tokens: `--dur-quick`, `--dur-move`, `--dur-explode`, `--ease-out`, and `--ease-spring`, which nothing uses;
- JS springs in `motion.js`: snap, detent, settle, pop and turn.

On top of those there are four literal easings and three different staggers (40, 50 and 60ms). (§3, §10.2)

**Recommend.**
- **Springs** are the grammar for anything the visitor causes or that arrives. The five in `motion.js` stay.
- **CSS durations** are for hover and press only. Use `--dur-quick` (140ms) with `--ease-out`.
- **One new `--ease-in-out`** for things that move while already on screen: the wipe, the flip, the scan. It
  replaces the four literal curves.
- **One stagger, 60ms,** in both CSS and JS.
- **Delete** `--ease-spring`, `--explode` and `--grid-step`.

### D16 · Reduced motion
**Problem.** Hero, Section, Reads, TitleStrip and Footer don't check reduced motion. NutMark's pop isn't gated,
though its header says it is. (§3.4)
**Recommend.**
- Add `<MotionConfig reducedMotion="user">` at the root. Movement becomes instant and fades stay.
- Add explicit gates wherever motion carries meaning (the wrench, the field, the conveyor), as they have today.
- Fix NutMark.

### D17 · Tuning panels
**Problem.** HOMEPAGE.md promises live tuning panels. `useTune` is a stub that returns defaults. (§3.5)
**Recommend.** Delete the stub. When a part is being tuned in the build, add DialKit to that part only, and freeze
the values before it's reviewed.

---

## G. Where the truth lives

### D18 · One source for the primitives
**Problem.** HOMEPAGE.md, the `styles.css` header comment ("drafting paper… a book serif") and the code disagree in
many places: the shader, the ruler numbers, spacing, tuning, the package name. (§10.3)
**Recommend.**
- `styles.css` is the source: its comments carry each token's reason.
- `system.md` is regenerated from it.
- HOMEPAGE.md §3.5 points at it instead of restating values.
- Fix the stale claims: the shader, ruler 8/12, spacing, tuning and the package name.

The headline is a copy decision for the hero's part, not a primitive.

### D19 · Pages that aren't the homepage
**Problem.** Opening, Specimen, Systems and Mascots are dev pages. They pull the blueprint tokens, the drawing
utilities and Instrument Sans into the shared theme. (§10.4)
**Recommend.** Their tokens move into their own stylesheets (`opening.css` already exists), so the homepage theme
holds only what the homepage uses. Whether those pages stay at all is your call.

---

## Order of work once decided

1. The colour tiers: D1–D7. These change the most files, so they go first.
2. Space and corners: D11–D14.
3. Motion: D15–D17.
4. Type: D8, after its variants are shown. D9 and D10 can go with step 1.
5. Clean up the docs: D18 and D19.

Each step ends with:
- Plumber run on `site/` (its own drift should only go down, apart from the six deliberate hero drifts);
- a screenshot of every section in light and dark, compared before and after;
- your review before the next step starts.
