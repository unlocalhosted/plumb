# Cards A: #1, #2, #3, #4, #5, #6, #8 as one rich component each (2026-11-05 bar)

Comps: docs/design/prototypes/comps/{01-quarry-client, 02-quarry-invoice, 03-easel-board, 04-satchel-activity,
05-kite-chat, 06-stride-today, 08-sonder-recent}-card.html. Renders: card-NN.png (2×, Playwright). Each comp is
plain CSS on Slate's tokens (theme.css), the way 16-timer-card.html is built (it doesn't load Tailwind). Icons are the
real dither set, rendered to static SVG. Every comp shows the broken state. Hairlines are half-pixel inset shadows.
Products: Quarry (#1, #2, the same product as #16), Easel (#3, renamed from Field, too close to Fieldday), Satchel
(#4, renamed from Shelf, which #50 uses), Kite (#5), Stride (#6), Sonder (#8). The studio in #1 and #2 is now Quay
Studio (QS, matching #16's "QS" standup), replacing Studio North, which sat too near Northwind and Northlight.
Faces mean one person everywhere: 01 Ines (Figma), 07 Ana (Quay), 05 Mira, 02 Theo, 03 Sana, 10 June (Moss & Fern).

## #1 Quarry, Figma's client page
- **Moment.** Quay Studio looking at its Figma client mid-November, with one invoice 12 days late.
- **Rich.** Figma's real mark on its brand colour; three figures (billed $38,420, outstanding $4,820 in red, pays in 11
  days); the year drawn as 12 monthly bars (October hatched red for overdue, November dashed as not yet billed); Ines's
  face on the billing contact and Ana's on the note; four invoices with PO numbers, which the note asks for.
- **Hierarchy.** 22px figures and 17px name; 14px medium row titles; 13px muted meta; 11–12px labels and axis.
- **Plant.** `[data-note]` (`aside.rounded-control.bg-sunken.px-4`) is a direct child of `[data-profile]` (flex-col
  p-6), on the column with px-4, so its words sit 16px in. Every other child is unfilled with its words on the column,
  so content-align has its peers. Fix: `-mx-4`.
- **Weak.** The header's right side is empty. The bars have no values (they're a shape, not a readout). Red shows four
  times (figure, bar, pill, amount), which is close to too loud.

## #2 Quarry, the invoice Figma opens
- **Moment.** The hosted invoice INV-2041 (the overdue one from #1), opened from the reminder email.
- **Rich.** Quay's mark and Figma's; $4,820.00 with "12 days late"; Ana's walkthrough as a frame of her screen (the
  invoice with one line highlighted, her cursor, Figma's mark on the page), her face as the camera bubble, 1:24, three
  chapters with timestamps; four line items with hours drawn as bars (33h at $145 plus an expense, summing to the
  total); Pay, with Visa and Mastercard marks.
- **Hierarchy.** 34px amount; the white play disc is the brightest thing on the dark frame; 14px medium lines; muted meta.
- **Plant.** `button[data-play]`, its svg `viewBox="0.3 0 20 20"` exported box-centred: the triangle reads left of
  centre. It's the card's only icon-only control, so optical-centre sees nothing else. Fix: `[&>svg]:translate-x-[…]`.
- **Weak.** The frame is drawn rather than a real screen capture, and the scrim makes it flat grey. The card is tall
  (about 900px). It's still money-themed, next to #1 and #16.

## #3 Easel, Moss & Fern's spring launch board
- **Moment.** Three people mid-session on the launch board, with the Shapes picker open over the toolbar.
- **Rich.** The real ceramic photo as the moodboard hero, with its palette pulled as swatches; two signed sticky notes
  (tinted shadows); Theo's selection and cursor, Sana's cursor; a pinned comment with Sana's face and "2 replies"; the
  launch flow drawn in the board's own shapes; who's here as faces; zoom.
- **Hierarchy.** The picker is the one popover-level surface, centred low; the board around it is low-contrast.
- **Plant.** `[data-shapes]` holds 8 buttons with 24px svgs; Square (rect 20×20) and Circle (r=10) share one box. The
  hexagon, star, bubble and arrow are neither square-filled nor round, so only the circle is scaled. Fix:
  `[&>:nth-child(2)>svg]:scale-[1.05]`-style.
- **Weak.** The bottom-right of the canvas is empty apart from zoom. The cursor colours (#d0457a) are outside Slate (they
  play the same part as the brand colours of data). The flow's arrows are hand-drawn SVG, not the dither set.

## #4 Satchel, Activity on the Spring launch drive
- **Moment.** Mid-morning: five events, two unread.
- **Rich.** Faces inline on every actor; All/Comments/Files tabs with counts; the PDF's first page with pages and size;
  Theo's comment quoted; three frame thumbnails (desktop, tablet, phone), each with a changed dot; the moved files
  as coloured chips by type; the member stack with +3.
- **Hierarchy.** 17px title; 14px with bold actors and objects; 12.5px subtle where · when; 11–12px chips.
- **Plant.** `li` is `flex items-start gap-3` and the 16px dither icon is its first child, so it sits on the top of
  the first line's box, about 2.5px above the capitals. The titles are long enough to wrap at narrow widths. Fix:
  `[&>svg]:translate-y-[2.5px]`-ish, from icon-cap.
- **Watch.** The attachment card is edged (a ring shadow) and the quote's rule is a pseudo-element, so content-align
  doesn't take either for a padded panel off the column. Keep it that way in the build.
- **Weak.** The frame thumbnails are drawn and toy-like (a blue block with a yellow mug). The dither icons are pale at
  16px. fig-thumb.jpg can't be used: it shows a context menu and the lake photo.

## #5 Kite, Sana and you before the walkthrough
- **Moment.** 2:41–2:44 pm: a location photo, a question, the shot list, "On my way".
- **Rich.** Sana's face, with presence, on the header and on each group; the real valley photo as a message, with the
  place under it; the shot list as a file bubble (icon tile concentric: 18 − 8 = 10); a heart reaction; a read receipt
  with her face; the composer.
- **Hierarchy.** 15px bubbles; 14px name; 12px meta. The accent carries "mine".
- **Plant.** `.bubble` is `px-3.5 py-2 text-[15px] leading-6`. "Perfect, thanks!" (`data-bubble="3"`) and "On my way"
  are one line, so they look puffy. The pills, chips and field are fixed-height with no vertical padding, so
  trim-leading sees only bubbles. Fix: `[text-box:trim-both_cap_alphabetic]`.
- **Weak.** valley.jpg is a lake under mountains, the same kind of view as lake.jpg (#23) and peak.jpg. I took peak out
  of #8 because of this, but #5 and #23 still both show a lake. A real non-lake location photo should be vendored.

## #6 Stride, Today at 4 pm
- **Moment.** Thursday afternoon, 84% to the step goal, after a morning run.
- **Rich.** Steps by the hour (18 bars from 6 am, the 7 am run in deep accent, the rest of the day still to come, a
  dashed line for your usual pace); a 7-day sparkline under each reading; the run drawn on a map (park, river, streets,
  route with start and end); four run figures; heart-rate zones as a stacked bar.
- **Hierarchy.** The 44px step count; 22px readings; 14px section titles; 11–13px meta.
- **Plant.** `.reading` (one component, `flex items-center gap-1`) at two sizes. The big one (`data-reading`) shows the
  float most. Every other row that sets two text sizes side by side (header, run title) is `items-baseline`, and the run
  figures are single strings, so baseline-align finds only readings. Fix: `items-baseline`.
- **Weak.** The map is drawn, not tiles (honest for a small map, but simple). The zone colours (#8fb0e0, #e9973a) are
  data colours outside Slate. The route's loop is a little arbitrary.

## #8 Sonder, Recently played
- **Moment.** Friday evening, Low Tide playing.
- **Rich.** The week's listening as 7 bars (today in accent); four tiles with real cover photos: an equaliser badge on
  the one playing, a half-heard album's progress, play count, a "Made for you" mix drawn as a 2×2 of covers; the player
  with a waveform scrubber (played part in ink) and times.
- **Hierarchy.** 17px title; 13px medium titles; 12px artists; 11–11.5px meta.
- **Plant.** `.tile` is `rounded-sheet p-2` and `[data-cover]` is `rounded-sheet` (14 inside 14 with 8px padding).
  Nothing else in the card has a rounded child at a padded rounded corner: the eq badge is inset 8px inside an
  unpadded cover, the mini cover sits in an unrounded footer. Fix: `rounded-[6px]` (or a 6px step).
- **Weak.** The mix tile reuses the three covers, as playlists do, but here it's also because there's no non-lake
  photo left. The week labels are 10px and only just fit under their bars.

## Credits

Built 2026-11-05 (overlay/showcase/src/principles/screens/0{1,2,3,4,5,6,8}-*.jsx). New media, for CREDITS.md:

| File | Photo | Photographer | Licence |
| --- | --- | --- | --- |
| s04-shelves.jpg | https://unsplash.com/photos/assorted-color-ceramic-bowls-and-saucers-lot-on-white-wooden-shelves-KyUmKlXrhAM (photo-1484632152040-840235adc262, stacked handmade bowls and plates on white shelves; #4's homepage frames) | Brooke Lark (@brookelark) | Unsplash License |
| s05-shed.jpg | https://unsplash.com/photos/an-empty-warehouse-with-a-lot-of-windows-cYyvktFS3Pk (photo-1634834576400-56f5e1ad8db8, a long empty rail shed with tall windows, Denver; #5's location photo) | Dillon Wanner (@dillydallying) | Unsplash License |
| logos/{visa,mastercard}.svg | simple-icons 13.21.0 (CC0 paths; the marks are their companies' trademarks, shown as payment methods in a demo) | simple-icons | CC0 |
