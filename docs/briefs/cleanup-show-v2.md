# Clean-up show v2: running it looks like the reference

Owner, 2026-11-03: running "Clean up this page" must itself look like the heydamir reference
(`~/Downloads/twitter_media_harvest/heydamir-2115063463063998736-01.mp4`, 9.8 s). Decided: the product, not a produced
video; keep stays default but a page with no system gets the bigger moves; during the show the panel collapses to a
slim bar and the page is the hero.

## Problems (what made the last video trash)

1. Demos were QA fixtures: near-empty pages with two drifted values. Nothing to see.
2. Keep changes almost nothing visible by design; the reference's drama is draining gradients, one accent, line
   icons, re-levelled spacing, type roles: none of it is built.
3. The show is panel-first: the panel sits mid-frame, the on-page drawings are small rings and stripes.

## The reference, read frame by frame

| Time | What happens | Drawing |
| --- | --- | --- |
| 0–1.0 s | Sloppy AI dashboard at rest: purple page gradient, glass cards with glow, emoji icons, gradient heading, pill badges in many hues, random gaps | none |
| 1.0–2.4 s | **Spacing measured**: hairlines across the whole page at both edges of each gap; an I-beam in the left gutter; a coral pill outside the page with the value (26/44/46/30/38px, 13px horizontal at the top) | hairlines + I-beam + pill |
| 2.4–3.2 s | **Spacing snaps**: values roll (26→16, 44→24, 46→36, 30→18, 38→32), the lines travel with the page as it re-flows | pills roll, lines move |
| 3.2–4.6 s | **Colour drains**: the purple washes out top to bottom to a neutral near-black; badges become neutral pills; status dots keep their hue | a wave, no marks |
| 4.6–6.0 s | **Icons swap**: emoji → line icons, behind a light sweep; spacing re-measured once more (16/18px) | thin vertical guides |
| 6.0–7.0 s | **Type morphs**: heading blur-morphs to new words and weight, labels lose caps, the bar chart becomes line curves | blur |
| 7.0–9.8 s | Clean page at rest | none |

## The system that replaces it

- **The stage is the real app** (layer 1): pages added to crafting-ui, not a test fixture or a copy of the reference. Every layer is judged side by side with the
  reference frames on it before it is called done. Test fixtures stay for tests.
- **Reach follows the page** (layer 3): a page with a system (crafting-ui) gets keep; a page with none gets the
  bigger moves. Measured, never guessed: hue count, gradient/glow share, emoji icons, share of gaps off any scale.
- **The show is page-first** (layer 2): while a pass plays the panel is a slim bar at the bottom edge (pass name,
  progress, Space to compare, Esc); the page carries the drawings at full size: the reference's hairlines, I-beams
  and pills for spacing, a drain wave for colour, a sweep for icons, a blur morph for type.

## Layers (one at a time, each proven before the next)

1. **The stages** (done): two pages added to crafting-ui itself (`src/pages/sloppy/`, routes `/sloppy/issues`, an
   issue tracker like Linear, and `/sloppy/chat`, a chat app like ChatGPT; own names, no brand copying). Owner,
   2026-11-03: not a copy of the reference's page, not garish: crafting-ui's look, carrying the drift today's passes fix
   (text a pixel off the ladder, gaps off the 4px scale, hex near-copies of the tokens, a fourth grey). They found three
   spacing bugs at once (a 2px grid read from crafting-ui's half steps, grouped and section gaps skipped, partial moves
   adding sizes), fixed with e2e/cleanup-spacing-stage.test.mjs.
2. **Show v2 frame + spacing measure**: slim bar; page-wide hairlines, gutter I-beams, coral pills that roll; lines
   travel with the page. On today's spacing pass. Proof: a frame of it beside f1.3 / f2.0.
3. **Reach**: the "no system" reading; widens each pass's proposals on such a page (engine).
4. **Spacing re-level** on a page with no scale (the 26/44/46 → 16/24/36 case).
5. **Colour drain**: gradients, glows and hues to neutral + one accent; status hues kept (engine + drain wave).
6. **Icons**: emoji → line icons (icon pass, new).
7. **Type**: heading and label roles, blur morph.
8. **One continuous take** of all of it on the sloppy page, ~10 s, compared with the reference.
