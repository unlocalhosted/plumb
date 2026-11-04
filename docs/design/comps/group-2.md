# Group 2 comps, critiqued (docs/craft/taste-checklist.md)

Comps: docs/design/prototypes/comps/{45-northlight, 46-waypoint, 50-shelf, 20-cadence, 21-larder, 23-lumen,
51-lumen-delete, 25-inkwell, 55-isobar}.html. Renders: docs/design/comps/comp-NN.jpg at 2×. Each comp draws the screen
in its fixed state. The mistake is planted later, and the line "Plant" says where. References were studied for their
qualities only (magazine readers, airline and wallet passes, file drives, issue boards, recipe apps, photo libraries,
weather apps, notes apps). Nothing of their layout, brand or art is reused. Before: every one of these was a white card
of text rows on the dot board.

## #45 Northlight, a long read

- **Product.** Northlight, a monthly culture magazine read in its own app, by subscriber Ama Boateng. Serif voice
  (Charter) for the reading. Inter for the app around it.
- **World.** The issue down the side (No. 31, five stories with photo thumbnails, the read one dimmed, the open one
  with a progress bar and "9 min left"). A reader bar with the section, the time left, bookmark, share and Aa. A 2px
  reading-progress line under the bar at 38%.
- **Life.** Headline, dek and byline (Mei Lin's face), a drop cap, and a friend's yellow highlight linked to a
  margin note (Ravi Nair's face: "I was there at 1:40"). A margin photo of the sign (afterglow.jpg) with a caption.
- **Hierarchy.** Four levels: the headline (31px serif), the pull quote (26px serif italic, between a 2px ink rule
  and a hairline), body (16.5px serif), and captions and labels (11.5–12.5px Inter).
- **Weak.** The drop cap's B leaves a wide first-line gap. The margin column is busy against the calm column. A
  real reader would hide the note until hover.
- **Lesson.** The pull quote's opening “ hangs in the margin, so "Neon" lines up with every paragraph's left edge.
  **Plant:** remove `text-indent: -0.42em` from `.pull p`, so the mark takes the first place on the line and dents
  the column.

## #46 Waypoint, a boarding pass

- **Product.** Waypoint, a trip planner, at 07:00 on a flight morning (Lisbon to Copenhagen for design week). The
  pass is Northwind Air's: its own navy band, set in capitals as boarding passes are.
- **World.** Trips down the side (Copenhagen selected, Bled and Comporta with photo thumbnails, two travellers'
  faces). A day bar with "On time" pulsing green, Share and Add to Wallet. The morning's plan as a timeline beside
  the pass.
- **Life.** LIS and CPH at 44px with a dashed great-circle arc and a plane. Gate B12 in the accent. A torn stub with
  the notches, Sana's face, booking code and bags. A QR code drawn as data. The timeline: two steps done, "Boarding,
  gate B12, in 38 minutes" live, two to come. Copenhagen's noon weather.
- **Hierarchy.** Codes (44px), the big fields (20px: gate, boarding time, seat), the row fields (14px caps),
  labels (10.5px caps, tracked).
- **Weak.** The main area has empty space under the pass. The arc is decoration more than data (no progress along
  it, since the flight hasn't left).
- **Lesson.** Every capital line carries punctuation that sags without the case forms: NW–754, 07:55–12:30,
  14A (ZONE 2), OKAFOR / SANA. **Plant:** drop `font-feature-settings: "case"` from `.caps`. The measured line stays
  `07:55–12:30` under "Departs – arrives".

## #50 Shelf, an empty search

- **Product.** Shelf, a team's file drive. The product moved from a notes app to a drive, because a search that
  comes up empty in one place and full in another is a drive's everyday moment, and #25 now uses the notes app.
- **World.** Home, My files (on), Shared with me (3, in the accent), Recent, Starred, Trash. Coloured folders. A
  storage meter split by file type (41.2 GB of 100 GB). The search field focused (accent ring, caret). Filter chips
  with "In My files" active. "0 of 1,284 files".
- **Life.** Three teammates' faces. Close matches from Shared with me under the empty state: a spreadsheet and a
  PDF as typed file tiles, and a photo set (lake.jpg). Matched words highlighted. Each row has its owner's face and
  an edit time.
- **Hierarchy.** The empty state is the centre: a 48px magnifier on a 96px disc, a 15px semibold line, a muted
  hint, then two actions with "Search Shared with me · 3" as the primary.
- **Weak.** The disc is generic empty-state furniture. The near matches compete a little with the empty state for
  the eye. The icons are simple strokes, not the dither set (as in the pilots).
- **Lesson.** One stroked set, one stroke width: the 16px magnifier in the field and the 48px one in the empty
  state both draw 1.5px. **Plant:** remove `vector-effect: non-scaling-stroke` from `.empty .big` (or from `svg.i *`
  for that icon only), so its stroke triples to about 4.5px.

## #20 Cadence, a sprint board

- **Product.** Cadence, the issue tracker of Fieldday's launch team, three days before the sprint ends.
- **World.** Workspace and teams (Launch open with Sprint 14, Backlog 38, Roadmap). A toolbar with the burndown
  drawn as a line against its ideal (21 of 34 points), the team's faces, and Board and List.
- **Life.** Four columns with status marks (empty, half, three quarters, done), counts and points. Cards with IDs,
  priority bars, an urgent mark, label chips, estimates, faces, a sub-task bar, and a cover photo on the film card
  (lake.jpg). One card, "Onboarding empty states 4/4", is picked up and carried to In review: a dashed accent slot
  waits there, and a grabbing hand holds the card.
- **Hierarchy.** The lifted card is the one raised, outlined, tilted 1.2° thing on a flat board. Below it are
  column headers, card titles (13px medium), and IDs and meta (11–11.5px).
- **Weak.** The lifted card covers the edge of Done. The board still reads a little uniform: every card is the
  same width, and only one has a cover.
- **Lesson.** One light: every resting card casts straight down (the raised shadow), and the lifted one casts
  straight down, further and softer. **Plant:** give `.card.drag` the copied shadow (`2px 3px 6px …, 8px 10px 24px …`)
  that falls to the right.

## #21 Larder, a recipe

- **Product.** Larder, a home cook's recipe app, on tonight's dinner (Lucia Ferraro's saffron risotto from the
  "From Nonna" collection). The page takes the dish's saffron as its ground, with its own brown inks.
- **World.** Tonight, Recipes 214, Meal plan, Shopping list 7. Collections with their tints. The week's meal plan as
  seven day chips (Thursday marked). A ground-coloured bar with Saved and Cook mode.
- **Life.** The dish drawn from above: a plate, risotto with grain texture, parmesan shavings, saffron threads, a
  spoon. There is no food photo in src/media, so it's drawn, not downloaded. The cook's face, stars and "412 cooks".
  Ingredients with two already measured out (checked, struck). Step 3 of 6 running: a timer ring counts down and
  six step dots show where you are.
- **Hierarchy.** The title (34px serif), the ingredients card (white, the only bright surface on the ground), the
  rows (13.5px), and the meta (12px in the ground's muted brown).
- **Weak.** The drawn bowl is an illustration where the showcase's rule asks for real photos. A credited risotto
  photo should replace it before code. The left column is long, and the bowl sits low.
- **Lesson.** The ingredients card's shadow is a deeper saffron (three layers of rgb(140 86 14)), so the ground
  darkens under it rather than greying. **Plant:** give `.ing` `shadow-lg` (10% black).

## #23 Lumen, Share over the library

- **Product.** Lumen, a family photo library, on Sunday evening after a day in Lisbon.
- **World.** Library 2,418, Favourites, Memories, Recently deleted. Albums with cover thumbnails. People as a row
  of faces. A toolbar with Years, Months and Days, "3 selected", and Share pressed.
- **Life.** A day's grid of real photos and portraits (11 for Sunday, and Saturday in Sintra below), three
  selected (accent frame and check), a 0:14 video badge. The Share menu: "Send to" with three faces and More,
  Copy link hovered under the pointer, shortcuts, an Add to album submenu arrow, New shared album.
- **Hierarchy.** The menu is the one elevated, white thing over a page of photos. Inside it, the people first,
  then the actions.
- **Weak.** The menu's top third lies over the white day heading, not the photos. Portraits are reused across #23,
  #51 and the sidebars, so a viewer who sees several screens may notice the same faces.
- **Lesson.** The menu's edge is 1px black at 10%, and over the neon and the low tide it sinks into the shadow.
  **Plant:** set `.menu`'s border to `#e5e7eb` (gray-200). It glows as a light frame on the left and bottom edges,
  where the dark photos are.

## #51 Lumen, Delete from a shared album

- **Product.** The same library, inside the shared album "Banff, October". The product stays (the principle
  belongs to a destructive confirm in a library), but the view is new, so it doesn't repeat #23.
- **World.** The sidebar with Banff selected. The album header as a three-photo mosaic with the title, dates and
  places, and "Shared with" three faces. The album's grid. The toolbar's trash button pressed.
- **Life.** Three photos selected in the grid. The dialog carries them as a small fan with a red 3. A caution
  strip names the consequence for the people it's shared with ("Ravi and 2 others will lose them…"). Delete has a
  focus ring.
- **Hierarchy.** The dialog over a 38% ink scrim. Inside: the fan, the title (16px semibold), the body, the
  caution, then Delete as the one red thing.
- **Weak.** The contact shadow is right but quiet at this size, so the lesson's number lives at the bottom edge,
  and the stage has to go in close. The cover mosaic is soft at 2× (480px sources).
- **Lesson.** Four layers of one light: 1px/2px dark for contact, then 6, 20 and 48px, each fainter. **Plant:**
  give `.dialog` Tailwind's `shadow-2xl` (`0 25px 50px -12px rgb(0 0 0 / 0.25)`), so there's no contact under the
  edge.

## #25 Inkwell, Today

- **Product.** Inkwell, a notes app (Ama Boateng's personal notes), on its Today page, Thursday afternoon.
- **World.** Today, All notes 312, Pinned, Shared. Folders with counts and tags. Search with ⌘K. New note.
- **Life.** A greeting and the date. The week's writing as bars (Thursday in the accent, 4,180 words). Four notes
  to pick up: one with a photo (lake.jpg) and Ravi's face, a packing checklist half done, a 1:1 with a tag, and a
  saved quote from the Northlight story (#45: the worlds connect). The dark card carries a live Focus session:
  18:42 counting down, its progress bar, "Everything else is quiet" pulsing.
- **Hierarchy.** The dark card is the heaviest thing on the page by design, and the lesson is about exactly that
  weight. Then the greeting (26px serif), the word count, and the note cards.
- **Weak.** The right column ends early, leaving white under the card. The sparkle mark is generic.
- **Lesson.** The card is the theme's near-black (oklch 0.18 0.012 264), a dark surface rather than a hole, with a
  raised panel inside it one step lighter. **Plant:** make `.feature`'s background `#000`.

## #55 Isobar, the 10-day forecast

- **Product.** Isobar, a weather app on the desktop, with Lisbon selected at 17:42.
- **World.** Saved places as sky cards (photos from src/media with their time, condition, temperature, high and
  low). Lisbon is ringed in the accent. Search sits above them.
- **Life.** Now at 64px light. A rain warning chip for Saturday. The next 24 hours drawn as a smooth temperature
  curve with an area fill, labels every three hours, and rain-chance bars in the night. Ten days with condition
  icons, rain chance in blue, low and high, and ranges on one shared 5–24° scale, today's marked with a "now" dot.
  A sunset arc and a UV meter.
- **Hierarchy.** The current temperature, then the curve, then the 10-day list (the subject: the most colour on the
  screen), then the tiles.
- **Weak.** OKLCH from this blue to this orange takes the short way round, through violet and pink, so the bars
  read violet-to-orange. That's vivid, but not the warm-cold story a weather app wants. Worth a word with the owner:
  the fix is plumber's, but `in oklch longer hue` or a mid stop would read warmer. The sunset tile is sparse.
- **Lesson.** The range bars mix in OKLCH and stay colourful end to end. **Plant:** write `.range`'s background as
  `linear-gradient(90deg, #2f6fe4, #f5a524)` (sRGB, as design tools export it), so every bar sags to grey in its
  middle.

## Against #16

Each is a window in its world with faces, real photos or drawn data, and one live or selected state: a reading
progress line, a pulsing "On time", a focused search, a card in the hand, a running step timer, an open menu, a
confirm over a scrim, a running session, and "now" on the forecast. None is a white card of text rows. Flattest
against #16: #50, where the empty state is by nature quiet. Weakest on the media rule: #21 (a drawn dish).

## Review (lead)

- Group 2 holds the pilots' bar.
- #20: the render's product is "Fieldday", too near #3's Field; settle one name (Cadence) in the build.
- #21: the dish is drawn; a credited food photo replaces it before code.
- #55: the OKLCH ramp passes through violet; owner's call between that and a longer-hue or mid-stop ramp.
