# Cards D: #45, #46, #50, #51, #55, #56 as the one component, made rich inside

Comps: docs/design/prototypes/comps/{45-longread, 46-boardingpass, 50-nonotes, 51-deletedialog, 55-forecast,
56-destination}-card.html. Renders: docs/design/comps/card-NN.png at 2×. Each comp shows the broken state. Like
16-timer-card.html, they're plain CSS on Slate's tokens (theme.css values copied in), with no Tailwind. Inter isn't
installed on this machine, so they render in the system face, as card-16.png does. Hairlines are 0.5px inset shadows.

## #45 Northlight, a long read (560px)
- **Product and moment.** Northlight, a monthly culture magazine. A subscriber is 38% into the November long read.
- **Rich.** The neon photo (afterglow.jpg) with its credit. A pink reading-place line under it, and "7 min left of 12" with a ring. The byline face (person-07) with save and share. A friend's yellow highlight in the body. A data figure the story carries: the crowd under the sign each hour, with the 02:00 peak in the brand. Three friends' faces. The next story with a thumbnail.
- **Hierarchy.** Headline 28 → pull quote 22 → body 16/28 → meta 12–13.
- **Plant.** `.pull p` (build: `blockquote[data-quote] > p`) has no `text-indent`, so the “ sits flush and "Neon" starts a mark's width in. Fix: `-indent-[0.42em]` (plumber measures it). No paragraph opens with a quote mark, so #45 can't fire anywhere else.
- **Weak.** The brand pink (#c2366f) is new to the showcase and is used only inside this product. The chart is the biggest block and pulls a little from the quote. low-tide.jpg is already in #8 and #18 (only as a 44px thumbnail here).

## #46 Tern, a boarding pass (440px)
- **Product and moment.** Tern, a small Lisbon airline (renamed: "Northwind" is #75's). It's 07:00 on flight morning, LIS to CPH.
- **Rich.** The route drawn with the plane and "3h 35m · direct". Gate, Boards and Seat as big fields. Six caps fields. The seat on a slice of the cabin (rows 12–16, 14A in teal). Boarding zones as a bar, with "On time" and "Zone 2 boards in 38 min". A notched tear. The stub with the passenger's face (person-03), a booking code and a QR code drawn from the booking reference.
- **Hierarchy.** Codes 42 → big fields 22 → fields 13 caps → labels 11 caps tracked.
- **Plant.** `.caps` (build: `Caps`) has no `font-feature-settings: "case"`, so TN–754, ECONOMY (Y), 14A (WINDOW) and the measured `07:15–07:40` (Boarding) all sag. Labels carry no punctuation, so they need no case.
- **Weak.** The sag is subtle at 13px, as before; the stage needs its zoom. The teal brand band is a new colour. The bird mark is a tiny drawn glyph, not a real logo.

## #50 Quire, an empty search (420px)
- **Product and moment.** Quire, a team's notes app (a new name: Shelf is #4 and Inkwell is #25). The search "offsite budget" in Personal comes up empty.
- **Rich.** The focused field with a caret, clear and esc. Folder scope chips with colours and counts. The empty state. "Found in other folders": three notes with matched words highlighted, a match-count bar, the author's face, a folder chip and the edit time. A footer that leads on.
- **Hierarchy.** Empty title 15/500 → note titles 14/500 → snippets 13 → meta 12.
- **Plant.** Every icon is one set: 24-box, `stroke-width 1.75`, `vector-effect: non-scaling-stroke` on its shapes (1.75px at any size). The 48px `.empty svg` lacks the vector-effect, so it draws 3.5px (the rule fires above 3). Build: drop `[&_*]:[vector-effect:non-scaling-stroke]` from the big Magnifier only. Its stroke has to be ≥1.6 for the rule to catch it, so 1.5 won't do.
- **Weak.** There are no photos, only faces. Truncated snippets carry `title` for #35. The empty state is still a quiet glyph on white. The chip count text is near the contrast floor (#c3c9d4 on ink is fine, but check it).

## #51 A shared album's Delete (480px)
- **Product and moment.** The photo library #23 shows (no name on screen, so no clash). In "Sintra, October", three photos are picked and Delete is pressed.
- **Rich.** The album header with shared faces. A "3 selected" pill and the day. Toolbar with trash pressed. A 4-column grid with a 2×2 lead, picked tiles inset with checks, and a 0:14 video badge. The dialog: a fan of the three photos with a red 3, "Ravi and 2 others lose them too" with faces, a storage meter with the freed slice in red, and Delete with a focus ring.
- **Hierarchy.** Dialog title 16/600 → body 13 → caution 12.5 → meter 12; the red button is the one loud thing.
- **Plant.** `.dialog` has `box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)` (Tailwind `shadow-2xl`): no contact under its edge. The dim is a flat `rgb(18 35 61 / 0.38)`, not a gradient, and the fan's thumbnails use small two-layer shadows (under 16px blur), so no other #51/#56 finding.
- **Weak.** The grid is portrait-heavy (the media set has few non-lake landscapes). peak.jpg and valley.jpg are mountain lakes that #74 also uses. The dialog covers most of the grid. The "haze" reads only faintly at this scrim.

## #55 Isobar, the forecast (432px)
- **Product and moment.** Isobar, a weather app's Lisbon card, Thursday 15:40.
- **Rich.** Now at 52px with the sun. A caution strip for Sunday's rain. The next 12 hours as a smooth curve with temperature labels and rain chances. Ten days, each with an icon, rain %, low/high and a range on one shared 7–24° scale. Today has a "now" dot. A sunset / UV meter / wind footer.
- **Hierarchy.** 19° 52 → day rows 14 → labels 11–12. The bars are the most colour on the card.
- **Ramp, rethought.** Instead of violet, the ramp is sky blue #1b9fd0 → orange #f28c28. The OKLCH hues are 230° and 59°, under 180° apart, so the fix runs teal → green → yellow → orange: the cool-to-warm scale people read weather by. The cold end, deepened to #0b6b91, is Isobar's accent (the place arrow and the curve). sRGB loses 68% of the colour midway (computed with the example's own OKLab maths), and the HSL hue gap is 167° (≥60), so gradient-space still fires.
- **Plant.** `.range` = `linear-gradient(90deg, #1b9fd0, #f28c28)`. Build: change `COLD`/`WARM` and the class to these hexes. The fixed state was rendered and checked in scratch: vivid end to end, with a slightly olive yellow-green in the middle.
- **Weak.** Ten even rows are a little list-like. Each bar repeats the full ramp rather than its slice of the scale (kept that way so the measure stays simple).

## #56 Wayfare, featured destination (384px)
- **Product and moment.** A trip planner's featured card (the Wayfare of #65, unnamed on screen) for a December break.
- **Rich.** paper-cities.jpg (the Getty's white stone) with an Editors' pick chip, 1 / 24, and a saved red heart. A caps kicker, the title, three savers' faces and "Saved by Tomi and 1,311". Under the photo: rating, "from $162 a night", December's nightly prices as 31 bars with the chosen four nights in terracotta on a tint, the dates, the total and Plan this trip.
- **Hierarchy.** Title 26 white → price 17 → body 13 → axis 11.
- **Plant.** `[data-scrim]` = `linear-gradient(to top, rgb(0 0 0 / 0.7), transparent)` over the lower 66.7% (build: `bg-linear-to-t from-black/70 to-transparent`). The grey band across the pale stone is plainly visible. The kicker has `"case"`, since "·" sits between capitals and would otherwise be a #46 finding.
- **Weak.** The 480px source is soft at 2× across 384px. The terracotta brand is new. The chart's selection tint is placed by calc and is about 1px off the grid gaps.

## Against #16
All six are single components with no app chrome, and each carries data drawn as data: a crowd chart, a seat map and zone bar, match bars, a storage meter, a temperature curve and ranges, a price chart. Each also has faces. Five use real photos; #55 uses drawn weather icons instead. Flattest: #50, because the empty state is quiet by nature. Riskiest new colour: the four product brand hues (pink, teal, terracotta, sky). Each is confined to its own product, but the owner should confirm them.
