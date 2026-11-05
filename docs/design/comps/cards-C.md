# Card comps, batch C: #36, #37, #38, #39, #40, #42

The new bar (2026-11-05): one component, no app around it, rich inside, judged beside #16 (card-16.png). Comps:
docs/design/prototypes/comps/NN-*-card.html. Renders: card-NN.png in this folder, 2×, headless Chromium with its
scrollbars on (Playwright's default `--hide-scrollbars` removed, or #36 can't show its flaw). Every comp is drawn
BROKEN. The two hands-on comps (#36, #42) draw plumber's marks from live measurements in the page, not by hand.

## #36 Thread, the channel sidebar (hands-on)

- **Product, moment.** Thread, a team chat. Longwave (a podcast studio; renamed from Fieldwork, which clashed with
  Field and #74's Fieldwork Studio) mid-edit. *Show all channels* was just pressed, so the list shows 12 channels.
- **Rich.** A live huddle in #ep-112-edit with its voice levels and three faces; a channel shared with a sponsor
  (Spotify's mark instead of #); mention counts in the accent, plain unread counts in grey; DMs with faces, presence
  and "back Monday"; your own face and status at the foot (Recording until 3pm).
- **Hierarchy.** Workspace name 15/600; unread channels 13.5/600 ink; read channels 13.5 muted; section labels 12 subtle.
- **Mistake.** `ul[data-scroll]`: `overflow-y-auto` with the app's styled scrollbar (`::-webkit-scrollbar` 8px) and no
  `[scrollbar-gutter:stable]`. It's 288×272, so it's over the rule's 280×200 (the current build's `w-64` list is 256
  wide, under the rule's width: worth checking). Measured: scrollbar 8px, counts slid 8px. The Mentions badge above
  the list now sits 8px right of the channel counts, which shows the shift without the marks.
- **Behaviour.** At rest six channels fit, no scrollbar. Press *Show all channels*: the scrollbar appears and every
  count jumps 8px left under the pointer. Fixed: the room is kept from the start and nothing moves.
- **Weak.** The cut-off "music-licensing" row under the list is real scrolling but reads a little untidy. A tall,
  narrow component sits on a wide board, so there's a lot of empty board. Sidebars have no data drawn as data, so the
  huddle levels are the only "drawing".

## #37 Margin, the readers card

- **Product, moment.** Margin, a newsletter platform. Walter Brandt's "Low Water" (renamed from "Field Notes",
  which clashed with Field). The pointer rests on Tuesday's spike, the day the post went out.
- **Rich.** Three figures with their changes (Readers underlined as the one charted); a smooth area chart on whole
  pixels with gridlines, y labels, a dashed guide, a ringed point and a "post sent" envelope on the axis; three posts
  with covers (low-tide, afterglow, a typographic cover) and open-rate meters; where readers came from as a stacked bar
  with Bluesky, Google and Reddit marks.
- **Hierarchy.** Figures 22/600; titles 14–15/500; meta 12.5–13 muted; labels and axis 11–12 subtle.
- **Mistake.** `[data-tip]`: `top-1/2 -translate-y-1/2` on a two-line tooltip (12px and 13px at `leading-snug`,
  py-1.5). It's 46.375px tall, so it moves up 23.1875px. Checked in the page: translateY −23.1875, the box top lands
  0.625 device px off a row at 2×. The point's anchor is on whole pixels, so the transform is the only fraction.
- **Data note.** It keeps the build's READERS (820…1,284…1,120, total 7,244) but dates them 31 Oct to 6 Nov, so the
  spike is Tue 4 Nov, not "Thu 6 Nov" as the build's tooltip says. The tooltip sits left of the point (`right-3`),
  because on the right it ran to the card's edge.
- **Weak.** At 1× the softness is hard to see at all; the lesson leans on plumber's loupe. The chart takes the eye, so
  the tooltip has to win as the darkest object, which it does.

## #38 Daybook, Thursday's agenda

- **Product, moment.** Daybook, a calendar (renamed from Almanac, which #68 also uses). Ruth's Thursday at 14:42,
  18 minutes before a Figma call.
- **Rich.** The week strip with each day's booked hours as bars per calendar; seven events with time ranges, calendar
  bars, attendee faces (+4, +9), a Figma mark on the external call; past events in muted ink; the red now line with
  14:42; the next event tinted, "in 18 min" and Join; the weather; tomorrow at the foot.
- **Hierarchy.** "Thursday" 22/600; event titles 14/500; places and end times 12.5 muted; labels 11–12 subtle.
- **Mistake.** `.row` (`[data-row]` on the first): `border-b border-line`, 1px, two device pixels at 2×, six times
  down the card. Every other line (header, foot) is a half-pixel inset shadow; the check found no other border.
- **Weak.** The now line sits on a divider and hides it there. Past rows fade by colour, but their bars use
  `opacity: 0.35` (a bar, not text, so the text-opacity rule doesn't apply, but it's a second technique). The week
  strip's bars have no scale or legend.

## #39 Tack, the glaze board

- **Product, moment.** Tack, a moodboard app. Ama Ceramics' "Glaze tests" for the spring mugs, the day the glaze
  was chosen.
- **Rich.** Masonry of real pins: the chosen mugs (lead, with "Chosen", a comment count and a face); "Satin white" as a
  reference photo; round three's six test tiles with codes, the picked one ringed; the honey base's recipe drawn as a
  bar of its parts plus the iron oxide addition; Saturday's firing curve to 1,222° with its peak; a note from Kwame.
  Collaborators' faces, one live.
- **Hierarchy.** Board title 15/500; pin titles 13/500; notes 12 muted; codes and axis 9.5–11.
- **Mistake.** `img[data-light]` (ceramic.jpg): every image has `outline outline-1 -outline-offset-1
  outline-black/10` except this one. Its white sweep meets the white pin with no edge. Checked: only ceramic.jpg has
  outline none.
- **Weak.** The sweep in ceramic.jpg is a light grey, not pure white, so the missing edge is visible but not dramatic
  at 1×. Its pin is the same size as the others, where the old comp made it twice as big. Test tiles are drawn colour
  swatches (honest for a test sheet, but not photos). No lake photos are used.

## #40 Widget gallery, the sheet

- **Product, moment.** A phone's widget gallery, Small selected, four suggestions. This is the OS, so there's no
  product name. The calendar widget shows the same 15:00 call as #38 on purpose, but it's labelled "Calendar", not
  Daybook.
- **Rich.** Lisbon's weather on an oklch sky gradient with the day's temperature curve, high and low; Thursday with
  two upcoming events; "On this day" over valley.jpg with an eased scrim; activity rings with figures.
- **Hierarchy.** Sheet title 20/600; widget figures 40–42; widget labels 12–15; captions 12 muted.
- **Mistake.** `.w` (`[data-widget]` on Weather): `rounded-[22px]` with a plain corner (computed `superellipse(1)`) on
  182px tiles. The sheet (32px), search field and Add button are `[corner-shape:squircle]`, so the smooth shape is right
  beside them. The other rounded things are under the rule's 120px floor.
- **Weak.** valley.jpg is a mountain lake again (it's Moraine Lake, captioned so). The media set has no other memory
  photo, so it should be replaced before the build. The ring figures have no units. The kink needs the loupe at 1×.

## #42 Tandem, a project's views (hands-on)

- **Product, moment.** Tandem, a project tracker. A studio's "Spring campaign site" for Duolingo, week 8 of 14 (moved
  from a ceramics launch, which clashed with #39). The pointer rests on Board.
- **Rich.** The client's mark; team faces; the road to launch drawn as a track with milestones done, today's line and
  launch ahead; this week's tasks with status rings (done, half, quarter, not started), labels, owners' faces and due
  chips; the budget burnt as a bar.
- **Hierarchy.** Project 17/500; tabs and tasks 14; meta 12–13 muted; labels 12 subtle.
- **Mistake.** The tabs other than the current one: `hover:font-semibold hover:text-ink` (drawn with a `.hover`
  class on Board). Measured in the page: Board grows 1.8px and Timeline, Files and Settings slide 1.8px. plumber's marks
  show the dashed resting edges, hatch, Board outlined and "+1.8px · 3 slid".
- **Behaviour.** Run the pointer along the tabs and each one you cross widens and shoves the rest. Fixed: darker only.
- **Weak.** 1.8px is honest but small in a still: the hatch is barely visible, and the lesson really lives in the
  motion. Milestone dates run Jan to Mar while the rest of the showcase is set in November. The task row's grey label
  chips and the due chips are close in weight.

## Against #16

All six have faces or real marks, data drawn as data and one live moment. The strongest beside #16 are #37 and #38.
The flattest are #36 (a sidebar is mostly text by nature) and #42 (the lesson is a 1.8px motion).

## Built (2026-11-05)

Built as overlay/showcase/src/principles/screens/{36-thread-channels,37-margin-readers,38-daybook-agenda,39-tack-glaze,
40-widget-gallery,42-tandem-tabs}.jsx. Changes from the comps: #36 shows eight channels at rest (the list is
`max-h-[272px]`, so it is 256px tall and over the rule's 200px floor before the click too); #37's slip is on every
label pinned to a point (the tooltip and the three y-axis labels, one `Pin`), ×4; #39's pin photo has no outline on
any pin, and three pins are white-sweep shots (the chosen mugs, a satin white cup, a celadon vase), ×3; #40's rings are
conic fills (an SVG ring read as a big icon to the stroke rule); #42's road runs 15 Sep to 19 Dec, so today sits in
November. The comps' painted plumber marks are left out; #36 and #42 draw them live after the gesture, as before.

## Credits

Photos from Unsplash, under the Unsplash License (free to use, no permission needed). Resized to 800px (400px for
the post covers).

| File | Photo | Photographer |
| --- | --- | --- |
| s37-causeway.jpg | https://unsplash.com/photos/rocky-causeway-stretches-towards-a-distant-island-castle-DGQzEOEkhhI (photo-1783108079876-1f97aad5c981) | @jcorl |
| s37-harbour.jpg | https://unsplash.com/photos/white-and-black-boat-on-dock-during-night-time-EgK47RHZgKM (photo-1614158026438-a2eeaec25401) | @fonsheijnsbroek_amsterdam_photos |
| s39-satin-white.jpg | https://unsplash.com/photos/white-ceramic-mug-on-white-surface-AJsdrXaRhHk (photo-1587411768065-fd9b9dd13359) | @mockupgraphics |
| s39-celadon-vase.jpg | https://unsplash.com/photos/a-ceramic-vase-with-a-brown-top-on-a-white-surface-7TB3xKdB-iw (photo-1642582615780-35343a19fd65) | @mark_huang |
| s40-lisbon-tram.jpg | https://unsplash.com/photos/yellow-and-white-tram-on-street-during-daytime-anrBiSm4iFQ (photo-1599069158346-684fee0e414a) | @andrelergier |
| logos/{bluesky,google,reddit,duolingo}.svg | simple-icons 13.21.0 (CC0 paths; the marks are their companies' trademarks, shown as sources and a client in a demo) | simple-icons |
