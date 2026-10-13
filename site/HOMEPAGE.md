# Plumb homepage: design doc

Status: **approved direction, revision 2**, 2026-10-13. Revision 1 was reviewed by Fable, and the owner adopted its recommendations. Build one section at a time, each reviewed before the next starts.

---

## 1. What the page has to do

A front-end engineer or design-system owner lands here. In ten seconds they should get:
1. **What Plumb is:** it catches UI that drifts from your design system, and fixes it from the page.
2. **That it's real:** they fix drift themselves, with Plumb's real overlay, in the first viewport.
3. **That it's safe to adopt:** it works on a messy repo today (only new drift fails), ships nothing to production, and judges compiled CSS rather than class spellings.
4. **What to do next:** one command, always within reach.

**How it should feel:** *"Oh, that's satisfying."* The snap of a token into place, a sticker flipping to ✓, a wrench seating a nut. A tool for careful people, built by people who enjoy being careful.

**The signature moment:** you click a pixel and Plumb edits the file. The real reading card opens on a drifted part, the ruler shows your value between two steps, you pick one, press Write, and see the diff. That's the screenshot people share. Stickers and the mascot are garnish; this is the meal.

**Quality bar:** the overlay's reading card. It has solid surfaces, real type weight, colour as fill, and one clear action. Every section is held to it.

---

## 2. The page: six sections

| # | Section | The visitor… | Feels |
|---|---|---|---|
| 1 | **Hero: fix it yourself** | fixes six drifts on a live card with Plumb's real overlay, then sees the diff | "I just used it, and it edited the file." |
| 2 | **It reads your system** | drags a value and feels it detent onto your tokens; flips Tailwind defaults ↔ your theme | "It knows *our* scale." |
| 3 | **One fix, every site** | drags the same handle; nine real components snap in a ripple | "That's hours of review comments, gone." |
| 4 | **CI keeps it true** | watches PRs roll through a gate: only new drift gets stamped | "We can turn this on tomorrow on a messy repo." |
| 5 | **Proof, then install** | reads four facts, copies four commands (the last sets up their agent) | "Thirty seconds, and it's safe." |
| 6 | **Footer** | hands the wrench a nut, finds the links | "These people care." |

**Rhythm:** saturated **stages** (the blue field) alternate with calm paper sections: Hero (stage) → Reads (paper) → One fix (stage) → CI (paper) → Proof and install (paper) → Footer (stage band). Spacing is 96–128px between sections, 24 between cards, and 8/12/16 inside cards.

**Install is always in reach:** once you scroll past the hero, the title strip shows a pinned 36px mono pill, `npm i -D @unlocalhosted/plumb`, with Copy. Every section's last line is a verb that points at it.

---

## 3. Systems shared by every section

### 3.1 The shader field (`shaders/react`)
- **What:** one `Aurora` layer under `Blur` (about 60px), with three stops: `#2f5be0`, `#6b8cf2`, and a warm `#ffb36b` at no more than 12% coverage.
- **Where:** **inside** the blue stages only, clipped to their 12px corners. Never full-bleed.
- **Drift is turbulence:** speed and saturation step from restless (0.6) to still (0.15) as drift is fixed. Each step is felt within **300ms** (an eased lerp of the shader values), and a caption reads "6 off · restless" → "0 off · still".
- **Fallbacks:**
  - paused when off-screen;
  - a static image under reduced motion, with no WebGL, or on weak GPUs;
  - the blur dropped under `prefers-reduced-transparency`.

### 3.2 Stickers (four kinds, each true)
| Sticker | Where | Becomes |
|---|---|---|
| **off by 3px** (red) | on the worst part in the hero | **✓ gap-3** (green) when fixed |
| **6 off the scale** | the hero's count chip | **✓ on the scale** |
| **Ships 0 bytes to prod** | the overlay step in Install | (fixed) |
| **plumb · 0 new drift** (CI badge) | footer, CI section | (fixed): only new drift fails |

**Rules:**
- at most 2 per viewport, and never over text;
- tilted between −6° and 6°;
- a 3px white border and shadow `0 1px 0 rgb(0 0 0/.08), 0 6px 14px -6px rgb(16 24 40/.35)`;
- hover peels from the hovered corner (`rotateX(-14deg)`, origin at that corner);
- draggable, but a dropped sticker snaps back home on `pop {500, 22}`.

### 3.3 Wrench buddy (the React Plumber's tool)
- **The world:** the design system is the pipework, a hard-coded value is a leak, a fix tightens the joint.
- **Look:** an adjustable wrench standing on its handle: fixed jaw, movable jaw on a knurled worm, I-beam handle with a hang hole. **Two dot eyes, no mouth, no limbs.** A compact build (shorter handle, bigger eyes) for the title strip.
- **The nut is the drift:** it arrives red and leaves green. He only ever moves for a reason, using the wrench's own verbs:
  - **measure** (worried): the jaw clicks open, holds, clicks shut;
  - **fit** (each fix): the jaw clicks shut detent by detent until it bites the nut, an off-size value snapping to the scale;
  - **turn:** 60° round the nut on `turn {260, 21}`, the nut turning with him and going green;
  - **release:** the jaw lets go, he swings back upright, the nut lifts out;
  - **last fix:** a final torque, leaning his weight in; then happy eyes.
- **Idle:** still; eyes follow the pointer; blinks every 4–7s. **Hover:** the jaw clicks open, ready. **Click:** he fixes a nut.
- **Where:** the title strip, the footer, and as the logo on the CI badge sticker. Source: `src/system/Wrench.jsx`.

### 3.4 Motion grammar (Interface Craft)
- **Stage-driven:** one integer `stage` per section, a `TIMING` table, config objects, and a storyboard comment at the top of each file.
- **Springs:**
  - `snap {500, 30}` for token snaps;
  - `detent {600, 35}` for the magnet;
  - `settle {300, 30}` for arrivals;
  - `pop {500, 22}` for stickers and checks;
  - `turn {260, 21}` for the wrench turning a nut.
- **Triggers:** scroll-into-view starts each intro once. Your own actions run on springs. Only the CI conveyor is scroll-scrubbed, and for at most 1.5 viewports.
- **Performance:** animate transform and opacity only, never `box-shadow`: crossfade a shadow overlay instead. Set `will-change` only during a spring.
- **Reduced motion:** final states appear instantly, and every interaction still works.
- **No sound.** The visual click is the click.
- **Tuning:** live tuning panels in dev, frozen into constants before shipping.

### 3.5 Visual language (locked from the card)
- **Type:** system sans with weight 650 for headings; mono only for code; tabular figures on every counter.
- **Type scale:** 76 (hero), 52, **40/44 section titles (new token)**, 32 sub-heads, and 20/30 section leads in muted text.
- **Surfaces:** white cards with layered shadows on `#f2f4f8`.
- **Colour:** blue as fill and action; verdicts as 10–12% tints, never solid.
- **Corners:** 8px and 12px.
- **Not used:** decorative hairlines, dot paper, drafting frames, confetti.

---

## 4. Section storyboards

### 4.1 Hero: fix it yourself

**Layout:**
- **Left:** the headline "Every pixel has a plumb line.", one line of what it does, the install command, and a hint: "Click a number, or hold Alt."
- **Right:** the blue stage, with the field breathing inside it. On it, the drifted ProfileCard with its numbered balloons, one **off by 3px** sticker, and the **6 off the scale** count chip.

**On load:**
```
   0ms   stage + field (restless)
 120ms   headline rises 12px → 0, settle
 300ms   card drops 16px, rotate −1.5° → 0, settle
 560ms   balloons pop on, 60ms apart; sticker slaps on (pop + 2-frame squash)
1100ms   hint arrow wiggles once
```

**The signature beat (first pin):**
1. The page dims 8%.
2. The pinned part lifts 2px.
3. Plumb's real reading slides in.
4. Pick a step: the ruler's *yours* tick moves first (it's the cause), and the part follows 40ms later on `snap`.
5. Write: the balloon flips to ✓, the count ticks, and the field calms one step within 300ms.

**At zero:**
```
   0ms   card settles
 150ms   token receipt: the six written tokens (gap-3, p-6, rounded-lg…) drop as mono chips
         into a stack under the count, 50ms apart, settle
 400ms   field goes still; caption "0 off · still"
 600ms   headline's last phrase reveals "Straight as a plumb line." (clip-path wipe), stays
 900ms   the real diff opens: ProfileCard.jsx in a mono panel, the six changed lines lit green
```

**Accepts when:**
- all six are fixable through the real overlay or by clicking a balloon;
- the first viewport works without the shader (the fallback image);
- it runs at 60fps on a 2020 MacBook Air;
- it works at 390px, where the dock replaces Alt;
- the count is announced to screen readers through `aria-live`, and focus order reaches the balloons.

### 4.2 It reads your system

**Layout:** a ruler card with this site's spacing scale as solid steps, plus type, radius and colour chips with their whys. A draggable handle sits at 13px.

**The magnet (detent):**
- The handle follows the pointer exactly until it's within 6px of a step. Then it springs onto the step (`detent`), overshoots 1.5px, and the step pulses 100ms (scale 1 → 1.15 → 1).
- **Hysteresis:** leaving a step takes 10px of pull.
- The readout says `13px · off the scale`, or `12px · gap-3 · related parts`.

**The conversion idea:** a toggle switches **Tailwind defaults ↔ your theme**, and the ruler's steps animate to their new positions while their labels crossfade. *Your design system, not a generic one.*

**On load:** steps grow from the baseline (40ms stagger, settle); chips fan out from a stack (pop); the handle drops onto 13px with a small bounce.

### 4.3 One fix, every site

**Layout:** a blue stage holding nine *recognisable* components: a button, a form row, a card, a list, a toast, a nav, a modal, a tabs bar and an avatar row. Each carries a red `10px` chip. The same ruler handle from 4.2 sits under the grid.

**Interaction:** drag the handle to `gap-3`. A ripple goes out from the centre at ring distance × 50ms. Each tile's gap snaps, its chip flips to ✓, and an odometer counts 0 → 9: **"9 sites · 1 decision"**.

### 4.4 CI keeps it true

**Layout:**
- A conveyor of PR cards passing through a gate.
- A meter labelled honestly: **"baseline: 312 known · 0 new"**. The numbers are illustrative and labelled as such.

**Interaction:**
- Scroll drives the conveyor, for at most 1.5 viewports.
- The baseline toggle **starts on**, showing the relief: only PRs with new drift get a **BLOCKED** stamp (`pop`, a 3° rotate, a 2-frame squash, no ink splat), and fixes roll the meter down like an odometer.
- Toggling it off shows the alternative: every PR blocked.

### 4.5 Proof, then install

**Proof** is four factual cards, with no logos, star counts or testimonials:
1. **Judges compiled CSS, not class names:** `@apply`, inline styles and plain CSS give one answer.
2. **Baseline: only new drift fails:** adopt it on a messy repo today.
3. **Dev-only:** production builds carry nothing.
4. **Readings in milliseconds:** the figure is quoted from the real benchmark, and only if measured.

**Install** is four step cards. Copy flips a card (`rotateY` 180°, 320ms, perspective 900px), and the back shows ✓ and the next command:
1. `npx @unlocalhosted/plumb`: report the drift
2. `npx plumb init`: config and baseline
3. `npx plumb install --overlay --write`: the overlay. Carries the **Ships 0 bytes to prod** sticker.
4. `npx plumb install`: sets up your coding agent. Today that's Claude Code: it writes `.claude/skills/plumb/SKILL.md`, so the agent fixes drift the way Plumb says. Other agents are named only once the CLI supports them.

When all four are copied, the wrench in the title strip seats one last nut.

### 4.6 Footer

- **A shader band:** the calm field, with a huge **Plumb** wordmark cut out of it and the wrench standing beside it.
- **Click the wrench:** he fits and turns a nut, as many times as you like.
- **Link columns:**
  - Product: Overlay, CLI, CI, Agents
  - Docs: links to README sections until the docs site exists, and never to pages that don't exist
  - Project: GitHub, npm, Issues, License (MIT)
- **A bottom row:** ©, the "plumb · 0 new drift" CI badge sticker, the theme toggle, and "Back to top".

---

## 5. Build plan: one section at a time

Each step ships fully (every state, motion, reduced motion, phone, dark), gets a review from you, then the next starts.

1. **Shared systems:** the shader field component and its fallback, the 40px title token, the Sticker component, the wrench buddy, named springs, the pinned install pill, and live tuning panels.
2. Hero, with the signature beat, the receipt and the diff
3. Footer
4. It reads your system
5. One fix, every site
6. CI keeps it true
7. Proof, then install
8. Full-page pass: rhythm, performance budget, an accessibility audit, and Plumb on the page reporting no unintended drift.

The docs site is the next project after the homepage.

## 6. Decisions

- **Mascot:** the wrench buddy, replacing Bob the plumb bob (rejected: a pendulum, however it's animated, reads as a desk toy). Two dot eyes, no mouth; every motion is a wrench verb on the drift's nut.
- **Sound:** none.
- **Shader:** blues plus one warm accent at low coverage, inside the stages only.
- **Agents:** folded into Install as a real step that writes the agent's instruction file. No illustrative chat window.
- **Docs:** footer links point to README sections for now. The docs site comes after the homepage.
- **Cut from revision 1:** Spot the drift (the hero already is one), confetti, Bob the plumb bob, sound, full-bleed aurora, sticker-bombing.
