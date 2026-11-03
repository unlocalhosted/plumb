# libraries.dev: what Plumber's primitives can take

Researched 2026-11-03. Method: WebFetch of libraries.dev pages, the GitHub repo and raw package READMEs. WebFetch summarises
pages through a small model, so numbers are as it reported them; the actual source files were NOT read (UNVERIFIED at code level).

## 1. What it is
libraries.dev is Jakub Antalik's site for "high-crafted UI libraries for AI agents": nine UI-effect packages (border beam,
thinking orbs, bot avatars, gooey, voice glow, voice ring, liquid metal, image fx, plus an on-device "Magnetic UI" model),
installed by pasting a per-library prompt into Claude Code/Cursor/Codex, plus a Skill (`reveal`/`review`/`apply`) and a paid
Pro/Studio tier (https://libraries.dev, https://libraries.dev/how-to-use.html, https://libraries.dev/skill.html). It is an
npm-workspaces monorepo, MIT for the libraries, models under a separate licence, 4.6k stars
(https://github.com/Jakubantalik/Libraries.dev). Packages: border-beam, bot-avatars, img-fx, liquid-gooey, magnetkit-web,
metal-fx, thinking-orbs, voice-glow, voice-ring (https://github.com/Jakubantalik/Libraries.dev/tree/main/packages).
Honest verdict: it is AI-interface effects (loaders, glows, avatars), not form controls. It has NO steppers, sliders, segmented
controls, swatches, pills, tooltips, toasts, command menus, charts, icon sets or patterns. Every package needs React 18+ (so we
take ideas only). The value to us is in four implementation details, below.

## 2. Relevant libraries and what to take

**border-beam** (https://libraries.dev/beam.html, https://raw.githubusercontent.com/Jakubantalik/Libraries.dev/main/packages/border-beam/README.md; MIT; React 18+)
- Does: a glow riding an element's border. Presets: rotate (`md`, `sm`, `line`) and pulse (`pulse-inner`, `pulse-outside`).
- Technique worth taking: a conic-gradient masked to the border ring, rotated by animating a registered `@property` angle;
  durations rotate 1.96s, line 3.1s, pulse 2.3s; browsers Chrome 85+, Safari 15.4+, Firefox 128+. Without `@property` motion
  steps rather than interpolates. Pulse presets use ONE shared requestAnimationFrame loop capped ~30fps writing CSS custom
  properties, isolate the stacking context, cap blur radius. Effect layers are `pointer-events: none` and decorative.
  Border radius is auto-detected from the first child. `onActivate`/`onDeactivate` fire when the fade completes.
- Take: idea only (code is React). The mask-the-border trick is plain CSS and could live in language.js.

**liquid-gooey** (https://libraries.dev/gooey.html, https://raw.githubusercontent.com/Jakubantalik/Libraries.dev/main/packages/liquid-gooey/README.md; MIT; React peer dep)
- Does: blobs that merge and morph; text stays crisp.
- Technique: the goo filter runs only on a separate SVG silhouette layer; real DOM (text, icons) sits unfiltered above it,
  because "CSS url() filters on HTML" render wrongly in WebKit. Defaults blur 6, contrast 18, `contentBlur` 7px, morph `bounce` 0.5;
  motion collapses to instant snaps under reduced motion; its measurement loop sleeps after ~0.5s of stillness.
- Take: the layering rule (filter a drawing, never the text) and the idle-sleep loop. Idea only.

**thinking-orbs** (https://libraries.dev/orbs.html, raw README under packages/thinking-orbs; MIT)
- Does: nine named loading states (working, searching, solving, listening, connecting, weaving, composing, breathing, shaping) at two separately tuned sizes (64 and 20).
- Technique: plain 2D canvas, arcs only, DPR capped at 2; pauses offscreen (IntersectionObserver) and on hidden tab; all
  instances share one clock so they resume in phase; reduced motion shows a static representative frame; `role="img"` with a
  per-state default `aria-label`; theme `auto` reads an ancestor `data-theme`/class then `prefers-color-scheme`.
- Take: idea only. The shared clock, offscreen pause, per-state aria-label and "static representative frame" are directly reusable.

**bot-avatars** (https://libraries.dev/bots.html; licence UNVERIFIED on page)
- Does: canvas-drawn plush avatars with `default`/`working`/`sleeping` states. Reduced motion gives a still pose; `role="img"`
  label changes with state; pauses offscreen.
- Take: the per-state label and still-pose fallback only. Character art does not fit "precise like an instrument".

**metal-fx** (https://libraries.dev/metal.html; built on Paper Shaders; WebGL2; licence UNVERIFIED) and **voice-ring**
(https://libraries.dev/voice-ring.html; 2D canvas plus a small WebGL pass; React package licence UNVERIFIED)
- Take: only the fallback rule (no WebGL2 means render the plain child) and a `paused` prop on every animated thing. Nothing else.

**Skill / Studio** (https://libraries.dev/skill.html): `libraries review` is a read-only scan for fit before `apply`. Same shape as
our find-then-fix flow, no new technique. No design principles are published there.

## 3. Apply here (ranked)
1. **One shared clock + offscreen/hidden pause for every looping thing** (`language.js` `.pl-ants` march, the dock rainbow shimmer, any future loader). Evidence: thinking-orbs shared clock resumes in phase, IntersectionObserver pause (orbs.html README). Ants on many picked elements currently each run their own CSS animation; a single registered `@property`/shared `animation-delay: calc(var(--now))` keeps all marching dashes in phase and lets the overlay set `animation-play-state: paused` when the page is inert or tab hidden.
2. **Static representative frame under reduced motion, not "nothing"** (`language.js` reduced-motion block, `show.js` roll). Ours disables `pl-ants` outright, which drops the "picked, unwritten" signal for those users. Orbs/avatars keep one meaningful still frame; ants should stay as a static dashed outline (they already are, since only the animation is removed; verify the dash is still visible against the page) and `roll` should snap, not blank.
3. **Per-state aria-label on the decorative marks** (`scale-marks.js` `step`/`place`, `boxmodel.js` bands, `glyphs.js`). Orbs and avatars use `role="img"` with a label that changes with state ("searching"). Our `.sc-step` ring states (rest/unused/pointed/pulled/off) and `.sc-place` tones (off/typed/on) carry meaning only by colour and shape; give each a state-worded label (e.g. "padding 12, off the scale") so meaning is not colour-only.
4. **"Filter the drawing, never the text" rule** (`boxmodel.js`, `show.js`). Gooey keeps text in live DOM above the filtered layer. Our pills sit over hatches and dithers; keep all patterns on a separate underlay layer, never `filter`/`backdrop-filter` an ancestor of pill text, so numbers stay crisp on WebKit. Add as a one-line rule in `docs/briefs/visual-language.md`.
5. **Idle-sleep rAF loop** (`show.js` `Marks`, which re-measures bands while the page moves). Gooey's measurement loop stops after ~0.5s stillness; border-beam caps its shared rAF at ~30fps. Make `Marks` sleep when nothing moved and wake on scroll/resize/mutation. (Check `Marks` first: it may already do this. UNVERIFIED against its code beyond the constructor.)
6. **A border-trace state for the pill/chip "write in flight"** (`language.js`, new `.pl-trace`). Border-beam's technique: conic-gradient + border mask + registered `@property` angle, 1.96s lap, pointer-events none. Fits "being written" between ants (picked) and solid mint (written). Single hue (mint) not the rainbow, to keep "rainbow once". Use `@property --a` with a fallback of a static ring (border-beam steps without it).
7. **Fade-complete callbacks on state changes** (`editor-primitives.js` `bind`). Border-beam's `onActivate`/`onDeactivate` fire after the fade finishes. Our picked-ring fade-in and drift states could emit an event on `transitionend` so tests and the show can wait on real completion instead of timers.
8. **Auto-detected radius for overlays** (`boxmodel.js`). Border-beam reads the first child's border radius so the glow hugs it; our selection outline and ants should copy the target's computed radius per corner (the radius block exists; check the outline uses it).

## 4. Do NOT take
- **Any package as a dependency.** All need React 18+; the overlay has no React and no runtime deps. (https://libraries.dev/how-to-use.html)
- **Rainbow glow border-beam colour variants** (`colorful`, `ocean`, `sunset`). Our rainbow is "once, on the dock mark"; a rotating rainbow on every selection breaks one-colour-one-meaning.
- **Gooey/melt/bend effects, bot avatars, voice ring, liquid metal, image fx.** Toys of a different kind; "a toy you can trust" is exact and instrument-like, and these are decorative AI branding. They also add WebGL/canvas weight.
- **Canvas or WebGL for our marks.** Our marks are layout-bound DOM; canvas would lose text selection, a11y and crisp 1px lines.
- **Magnetic UI on-device models.** Separate Libraries.dev Model License, mobile-only (https://github.com/Jakubantalik/Libraries.dev).
- **The Pro/Studio presets and recipes.** Licensed per plan, and not published.
- **The "paste a prompt and let an agent wire it in" install model**: wrong for a shipped overlay with zero deps.

## Unverified / limits
- Source code of every package was not read; techniques come from READMEs via a summarising fetcher.
- Licences of bot-avatars, metal-fx, voice-ring (React) not stated on their pages; repo says libraries are MIT but per-package LICENSE files were not opened.
- The border-beam accessibility page and the Studio/Pro pages were not read.
- Compared to what the task listed (steppers, sliders, scrubbers, tooltips, toasts, command menus, charts, icon sets): none exist on this site. Jakub's separate writing on jakub.kr (referenced in our memory as "better-writing") was out of scope and not fetched.
