# Cards, batch B: #15, #18, #20, #21, #23, #25

The one component per screen, no app chrome, made rich inside (owner 2026-11-05; bar: #16, `card-16.png`). Comps in
`docs/design/prototypes/comps/NN-*-card.html`, renders at 2× in `card-NN.png`, each in its broken state. Tokens are
theme.css's (surface, sunken, ink, ink-muted, ink-subtle, line, accent, radii 10/6/4, shadow-card, shadow-raised).
Dividers are 0.5px inset shadows, never borders. New photos are hot-linked from images.unsplash.com in the comps; the
build has to vendor them into `overlay/showcase/src/media/` and add them to CREDITS.md (list at the end).

## #15 Burrow, issue table (`15-burrow-issues-card.html`, 680px)
- **Product and moment:** Burrow, an issue tracker. The "Upload pipeline" project in cycle 14, six days before it ships.
- **What makes it rich:** a segmented bar of 18 issues, one segment per issue, coloured by status, with a legend and "64% · 6 days left". Seven rows, each with a priority glyph (bars, or a red urgent square), a mono ID with the case feature, label dots, the assignee's 20px face, a drawn status glyph (dashed, quarter, half), comment counts and age. The urgent row is tinted accent. The header has a stack of team faces.
- **Hierarchy:** 17px medium project name; 14px medium titles; 13px muted cells; 11–12px meta and labels.
- **Planted mistake:** the `th` labels only: `text-[11px] font-semibold uppercase`, with no `tracking-*` class. No other text is uppercase, so the rule finds those labels and nothing else.
- **Weak:**
  - Set in the system font, SF at 11px, the untracked capitals look less crowded than they will in Inter. Check the stage's loupe in the build.
  - The project icon is generic.
  - One title truncates on purpose ("Resume a paused upload…"). It carries a `title` so #35 doesn't fire. The build must keep it.

## #18 Dispatch, front page (`18-dispatch-front-card.html`, 560px)
- **Product and moment:** Dispatch, a news reader, on Wednesday morning.
- **What makes it rich:**
  - Data drawn as data: the lead story's geomagnetic storm as Kp-index bars over 24 hours, and the audio briefing's waveform, played to 4:18.
  - Photos and faces: a real aurora photo with a credit line, the byline face, and two second-rank stories with real photos (a Lisbon tram, an offshore wind farm). The second-rank stories carry publication marks and author faces.
  - Publication names are invented (Meridian, Harbour Weekly), not "The Ledger" or "Northwind".
- **Hierarchy:** 22px semibold lead headline; 15px semibold list headlines; 15px muted standfirst; 12–13px meta.
- **Planted mistake:** the lead `h3` has no `text-balance`, and "recorded" wraps alone. Its last line is 18% of the first, measured in Chromium at 512px.
  - Everything else wraps on purpose: the list headlines are spans with `text-balance` (not h1–h4, so #48 can't fire), and the standfirst has `text-pretty`.
- **Weak:**
  - The headline was reworded until it widowed in this font ("…than in any year recorded"). In Inter at the build's width the break may move, so re-check it with `measure` before signing off.
  - The card is tall (941px).
  - The Kp scale's red and green are storm-scale colours, not Quarry's.

## #20 Cadence, sprint board (`20-cadence-board-card.html`, 760px)
- **Product and moment:** Cadence, a launch team's tracker. Sprint 14, three days left, with one card lifted mid-drag and a grabbing hand on it.
- **What makes it rich:**
  - A burndown: the actual line against the dashed ideal, with "18 of 27 points left".
  - Three columns with status glyphs, counts and points. The counts and points add up.
  - Nine cards with IDs, priority, subtask progress bars, team chips, points, comment counts and owner faces, plus a team face stack.
- **Hierarchy:** 17px sprint title; 13px medium column and card titles; 12px meta; 11px IDs.
- **Planted mistake:**
  - The dragged card only (`data-dragged`): `-translate-y-1 shadow-[2px_3px_6px_rgb(18_35_61/0.12),8px_10px_24px_rgb(18_35_61/0.16)] ring-1 ring-accent/40`.
  - The eight resting cards use `shadow-raised`, straight down, and the board uses `shadow-card`, straight down. So the page's light is unambiguous (eight or more agree), and plumber's turned shadow applies.
- **Weak:**
  - Colour is mostly greys plus chips. It's livelier than before but has no photos, which is honest for a board, and it's below #16's colour life.
  - The drawn hand cursor is an illustration. It needs `pointer-events: none` in the build.

## #21 Larder, recipe (`21-larder-recipe-card.html`, 408px)
- **Product and moment:** Larder, a home cook's recipe app. Tonight's saffron risotto mid-cook: two ingredients ticked off, step 3 of 6 timing.
- **What makes it rich:**
  - A real photo of the dish, full-bleed at the top. It replaces the drawn bowl.
  - The cook's face, with a 4.8 rating and 412 cooks.
  - The 35 minutes drawn as three stages (prep 10, stir 22 marked "you're here", rest 3).
  - Seven ingredients with checkboxes, a struck-through state and a servings stepper.
  - The current step with its ring timer, and a "Continue to step 4" button.
- **Hierarchy:** 24px semibold title; 15px semibold card heading; 14px rows; 12–13px meta.
- **Planted mistake:**
  - `[data-card]` keeps Tailwind's `shadow-lg` (10% black) on the `#f4e2c3` ground.
  - Nothing else on the ground casts a shadow: the photo, the heart button, the step panel and the button are all flat. So the tinted-shadow rule sees one shadow.
  - The photo bleeds to the card's edges (the card has `overflow-hidden`), so there is no nested-radius question.
- **Weak:**
  - The white card's navy ink sits inside a brown world. That's Quarry's surface by design, but it's the one place the palettes meet.
  - The photo is an Unsplash studio shot, a little "stock". It's still far better than the drawing.

## #23 Lumen, share menu (`23-lumen-share-card.html`, 448px)
- **Product and moment:** Lumen, a family photo library. Sunday on a coast trip (Big Sur), three photos picked, Share open from its button.
- **What makes it rich:**
  - Twelve real photos of a family day: coast, sunset silhouettes, kids in the surf. One tile is a video with its duration.
  - Selected tiles are inset with accent ticks.
  - A face stack of who's in the photos.
  - The menu leads with "Send to" faces, then actions with shortcuts and one hovered row.
  - None of the photos are the shared library set (lake, valley and so on), so there's no reuse across screens.
- **Hierarchy:** 15px medium date; 14px menu items; 13px meta; 11–12px labels.
- **Planted mistake:**
  - The `[data-menu]` element: `border border-gray-200` (#e5e7eb) plus `shadow-lg`, placed over the dark sunset, dusk and coast tiles, where the light line reads as a frame.
  - Nothing else on the screen has both a solid border and a blur.
  - The menu sits 8px under its button, so its top edge crosses about 10px of white header before the photos. The other three edges sit on dark photos.
- **Weak:**
  - At 448px the menu covers most of two columns. That's right for the lesson, but the grid's best photos are under it.
  - Item rows use `rounded-chip` inside a `rounded-control` p-1 menu, as the current build does. Only the hovered middle row draws its corners, so #8 shouldn't fire. Watch it anyway.

## #25 Inkwell, feature card (`25-inkwell-feature-card.html`, 448px)
- **Product and moment:** Inkwell, a notes app, announcing Focus sessions on Today. The card shows the feature mid-use.
- **What makes it rich:**
  - A live session: "Focusing on Q3 offsite plan", 18:42 against 6:18 left, and 412 words.
  - Four session segments, the current one 75% through, which matches the clock.
  - The note's real words fading out under a caret.
  - The week's focus as seven bars, with today in white.
  - Three friends' faces: "are in a session now".
- **Hierarchy:** 56px timer; 22px title; 14–15px body and values; 12–13px labels (white at 100/80/70%).
- **Planted mistake:**
  - The article is `bg-black`, 448 × 576, about 258,000 px², over the rule's 200,000 px² area.
  - Nothing else is large and pure: the panel has no fill (an inset white/10 ring), and the white button is small. The eyebrow is `tracking-caps` (0.06em), so #15 stays quiet.
- **Weak:**
  - The card is monochrome, with no Inkwell accent. That's faithful to a dark promo, but it's the least colourful of the batch.
  - Words on the dark use white-at-opacity, as the current build does. #57 (text by opacity) may read these. It hasn't in the current build, but check it with plumber.
  - Leo (person-08) also appears in #23's menu, in a different product.

## Photo credits to vendor (all Unsplash License, free; none Unsplash+)
| Use | images.unsplash.com id | Photographer |
| --- | --- | --- |
| #21 risotto | photo-1687630433653-e6c9faec95b3 (unsplash.com/photos/6DXfs2sl5pQ) | Imad 786 |
| #18 aurora | photo-1768813282031-2aec62eee8b7 (ZPbfvIN4NXs) | Niklas Jonasson @niklasjonasson |
| #18 Lisbon tram | photo-1527936660226-7c289edf148e (0SoFH0IkBHg) | Daniel van den Berg @danielvandenberg |
| #18 wind farm | photo-1654083198752-56ff209c8129 | Jesse De Meulenaere @jessefotograaf |
| #23 Bixby bridge | photo-1581790061118-2cd9a40164b0 | Spencer Davis @spencerdavis |
| #23 sunset walk | photo-1496275068113-fff8c90750d1 | Kevin Delvecchio @kevindelvecchio |
| #23 dusk, father and son | photo-1506456331400-7088248a8db1 | Dvir Adler @dvir_adler |
| #23 coast aerial | photo-1519335337423-a3357c2cd12e | Thomas Ciszewski @coc6 |
| #23 dark coast | photo-1623169840544-0982db65d00e | George Cox @georgeallancox |
| #23 coast road (video tile) | photo-1446630073557-fca43d580fbe | Iris Papillon @papillon |
| #23 family in the surf | photo-1475503572774-15a45e5d60b9 | Natalya Zaritskaya @goodmood77 |
| #23 baby on shoulders | photo-1597524678053-5e6fef52d8a3 | Lawrence Crayton @lawrencecrayton |
| #23 grandad and child | photo-1602178041104-f974b84751d3 | Tim Mossholder @timmossholder |
| #23 mother and son | photo-1531983412531-1f49a365ffed | Xavier Mouton Photographie @mxcaptures |
| #23 girl with floats | photo-1472586662442-3eec04b9dbda | Leo Rivas @leorivas |
| #23 cove with waterfall | photo-1508107222753-0c236c337911 | Braxton Stuntz @braxton |

Licences were read from Unsplash pages through a fetch tool. The aurora and the tram were checked on their own photo
pages. The rest come from search listings that marked them free, not Unsplash+, so re-check each photo page when
vendoring.
