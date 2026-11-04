# Group 1 comps, critiqued (docs/craft/taste-checklist.md)

Comps: docs/design/prototypes/comps/{01-quarry-client, 02-quarry-invoice, 03-field-board, 04-shelf-activity,
05-kite-chat, 06-stride-today, 08-sonder-recent, 15-burrow-issues, 18-dispatch-front}.html. Renders: comp-NN.jpg (2×).
Pilots they're held to: docs/design/pilots/comps.md. Nothing here is coded into the showcase; each screen's plant point
is named so the mistake can go in after sign-off. The worlds connect: Studio North bills Halden & Co. (#1, #2), Moss &
Fern's spring launch runs through the board, the drive and the chat (#3, #4, #5), and the same ten faces recur.

## #1 Quarry, Clients / Halden & Co.

- **Product.** Quarry, the time-and-billing app of #16, here for Studio North (a four-person studio): one client's page.
- **World.** A three-pane window: Quarry's sidebar (Clients selected, Invoices "1 overdue" in red, the studio's people
  with Ana live), the client list (eight clients, each with its own drawn mark and what's open), and the profile with a
  breadcrumb, Log time / New invoice, tabs with counts (Invoices 14, Time 212h).
- **Life.** Mette's face on the billing contact and Ana's on the note; the year billed drawn as eleven monthly bars, the
  overdue October hatched in red; status pills; the selected client tinted in the list. The note has real teeth (PO
  number, the €5,000 approval line) that #2's invoice then honours (PO-7716).
- **Hierarchy.** Four levels: the client name (20px semibold) and €38,420 (26px); section titles and row titles (13.5
  medium); values and meta (12.5–13.5 muted); labels and axis (10.5–12 subtle).
- **Weak.** The client marks are drawn glyphs on tinted tiles, a touch toy-like beside Mercury's restraint; the list
  column is uniform in row height. The chart's month letters are small at 1×.
- **Lesson.** The note ([data-note], inside [data-profile]) is the only filled panel in a column of sections; planted,
  it sits on the column with px-4, so its words start 16px in from "Billing contact", "Billed in 2026" and "Recent
  invoices". Here it's drawn the same way; plumber's fix bleeds the fill into the gutter.
- **Changed from the wireframe.** A lone card became the app; DKK/$ mixed became euros; the note gained an author and a
  date; a billing chart and the client list were added.

## #2 Quarry, the hosted invoice

- **Product.** The page Halden & Co. opens from Studio North's email: pay.quarry.app, in a browser.
- **World.** Browser chrome with the URL; "Studio North sent you an invoice" with the studio's mark and "Payments by
  Quarry"; the invoice as a document (letterhead, CVR, billed to, issued, due, the client's PO, four line items with
  descriptions and hours, totals with reverse-charge VAT); the pay panel beside it.
- **Life.** Ana's recorded walkthrough: a real frame of the recording (the same invoice on her screen, one line
  highlighted, her cursor on it), her camera bubble (face), 1:24, three chapter ticks. The highlighted line in the
  frame is also highlighted on the document (the fill bled into the margin, words on the column). Payment methods.
- **Hierarchy.** €6,240.00 at 34px is the one figure; then Invoice (22px); then line items; then meta. The play disc is
  the brightest object on the dark frame, so the eye lands on it second.
- **Weak.** The pay panel ends well above the document, leaving the right column's lower third empty. The video frame
  is drawn (a miniature of the invoice), not a photo; that's honest for a screen recording but less textured.
- **Lesson.** [data-play], the white 60px disc, and its triangle glyph exported box-centred (viewBox shifted, as
  design-file exports are): the triangle reads left of centre. Kept as the wireframe draws it, so it's already the
  planted state; plumber nudges it toward its point.
- **Changed from the wireframe.** The card became the client's page in a browser; the frame became Ana's actual
  recording with her face; the invoice gained line items, a PO and a due-in pill.

## #3 Field, Spring launch board

- **Product.** Field, a team whiteboard; Moss & Fern's spring launch, mid-session.
- **World.** A window with the file path, Saved, three collaborators (two ringed in their cursor colours), history,
  comments, Share; an infinite dotted canvas; the toolbar (Shapes active), the minimap, 84% zoom.
- **Life.** A moodboard of pinned photos (valley, the ceramic mugs, the lake) with captions and three notes signed by
  faces; the launch flow drawn in the board's own shapes (rectangle, diamond, dashed reshoot, circle) with yes/no
  arrows; Theo's note "now", selected with handles under his cursor; Sana's cursor on the palette photo.
- **Hierarchy.** The picker sits alone in the clear lower canvas, the brightest raised surface, so the camera knows
  where to go; the board's content is busy but low-contrast around it.
- **Weak.** The canvas's lower-left is empty apart from the minimap; the picker's style row (swatches, Outline/Fill)
  is a little generic. The tool icons are hand strokes, not the dither set.
- **Lesson.** [data-shapes]: Square, Circle, Triangle, Diamond each drawn in the same 20px box (rect 20×20, circle
  r=10). The circle reads smaller than the square beside it; the board's own Launch circle shows the same family.
  Planted as-is; plumber draws the circle 4% larger.
- **Changed from the wireframe.** Letter avatars became faces and cursors; two plain notes became a moodboard and a
  flow chart; the picker gained a hovered state and a style row; the board got a toolbar, minimap and zoom.

## #4 Shelf, Spring launch drive

- **Product.** Shelf, a team drive; the Spring launch shared drive, mid-morning.
- **World.** Sidebar (New, My files, Recent, Starred, four shared drives with colours, Trash, storage drawn as a split
  bar); the drive with members' faces and Upload; Suggested files as thumbnails (a PDF's first page, a photo, the
  Plate file from #59); a file table with type chips, owners' faces, the selected row; the Activity panel right.
- **Life.** Activity rows carry what happened: the PDF's page count, Theo's comment quoted with his face, three photo
  thumbnails stacked with +9; two unread dots; Today and Yesterday; the list fades under the panel's footer.
- **Hierarchy.** Drive title and Activity title (15px semibold); file and actor names (13.5 medium); actions in muted
  ink; where · when in subtle 12px.
- **Weak.** The file table's lower area is empty; the suggested-card thumbnails are three different kinds of image
  and read a little busy. The type chips are bespoke rather than a set.
- **Lesson.** [data-activity] .ev rows: a 16px action icon beside a title that wraps (the rows are built items-start).
  The comp nudges each icon 2px down onto the capitals; planted, the nudge is removed and every icon sits at the top
  of the line box, ~2.5px high. The first two titles wrap at this width, which is why the row can't be centred.
- **Changed from the wireframe.** The floating list became the drive's side panel; each event gained its object (the
  PDF, the quote, the photos); faces, unread state and a second day were added.

## #5 Kite, Sana Okafor

- **Product.** Kite, a desktop messenger for a small studio; 2:44 pm, Sana is typing.
- **World.** The conversation list (search, a selected thread, a group with stacked faces and 3 unread, previews that
  thread the other worlds: Mette's PO, Ana's walkthrough), the thread header with presence and call buttons, the
  composer.
- **Life.** Sana's photo message (the ceramic hero shot, with its file name), grouped bubbles with tightened corners
  between consecutive messages, an emoji, a read receipt with her face, the typing dots moving.
- **Hierarchy.** The photo, then the accent bubbles (mine), then hers; the list is quieter (13.5 names, 12.5 previews).
- **Weak.** The list's lower third is empty; the header's actions are generic. No day separator now (removed for fit).
- **Lesson.** The bubbles (data-bubble 2–4), built px-3.5 py-2 at 15/24 as the wireframe does: the short replies
  "Perfect, thanks!" and "On my way" are where the line's leading reads as puffy padding. Planted as drawn; plumber
  trims the text box to cap and baseline.
- **Changed from the wireframe.** The card became the app; letter avatar became a face; a photo message, grouping,
  read receipt and live typing were added.

## #6 Stride, Today

- **Product.** Stride, a training app on the desktop; Lea, five weeks out from a half marathon, Friday afternoon.
- **World.** Sidebar (Today, Activities, Training plan, Insights, Club), the week drawn as seven rings (Friday 84%),
  Lea's face; "Watch synced 2 min ago"; this morning's run beside the day.
- **Life.** Steps against the goal (a meter with a thumb, "about 15 min of walking"); the day by the hour, the 7 am run
  as the one accent bar, now hatched, the evening empty; three readings with their own charts (activity line, a week
  of distance bars, resting heart rate falling); the run's route drawn on a map with a lake photo, and five splits
  with the fastest marked.
- **Hierarchy.** 8,421 at 52px; then 24px readings; 19px run figures; labels and notes at 12px.
- **Weak.** The three stat cards are tall for what they hold (their charts sit low); the map is drawn, not a tile set.
  Each stat has its own hue (orange, green, red), slightly more colour than Slate usually allows; they're status-like
  (move, distance, heart), so they earn it, but it's worth a look.
- **Lesson.** Every reading (.reading, data-reading) is one component at two sizes, figure and unit side by side. The
  comp sets items-baseline; planted, it's items-center and each unit floats above its figure's baseline, most at
  "8,421 steps".
- **Changed from the wireframe.** A small card became the dashboard; a route, splits, an hourly chart and a week of
  rings were added; the unit sits beside a 52px figure, where the drift is largest.

## #8 Sonder, Listen now

- **Product.** Sonder, a music app on the desktop, Friday evening listening.
- **World.** Sidebar (search, Listen now, Browse, Radio, Library, playlists with their covers), the Listen now page
  with the listener's face, a player bar (shuffle, transport, progress 1:42 of 4:21, volume).
- **Life.** Five covers (four credited photos and one typographic cover); Low Tide playing with moving equaliser bars
  and its title in the accent; Paper Cities hovered, its play button out; three mixes under photos with scrims.
- **Hierarchy.** Listen now (24px), shelf titles (17px), album titles (13 medium), artists (12 muted).
- **Weak.** Release radar reuses Afterglow's photo and the mixes reuse covers; the media set is small. The typographic
  "Altitude" cover is ours, a small departure from photo-only covers, but it gives the shelf a second texture.
- **Lesson.** Each Recently played tile (.tile, data-tile) is a 14px card with 8px padding around its cover
  (data-cover). The comp gives the cover 6px (14 − 8); planted, the cover keeps 14px and the gap pinches at every
  corner. The tinted card makes both curves visible at once.
- **Changed from the wireframe.** Three tiles in a card became the app with five covers, a playing and a hovered tile,
  mixes and a player.

## #15 Burrow, Upload pipeline

- **Product.** Burrow, an issue tracker; Kiln's product team, the Upload pipeline project two weeks before it ships.
- **World.** Workspace sidebar (Inbox 4, My issues 7, four projects with progress pies, views), the project bar (a
  progress ring, 64% · ships 20 Nov, its lead), a filter chip, filter and grouping, List/Board/Timeline, the table.
- **Life.** Issues grouped by status with drawn status icons (half, quarter, dashed); priority as bars, one urgent;
  label chips with colour dots; assignees' faces, one unassigned; comment counts; the selected row with its accent
  edge.
- **Density.** Nine rows plus three group rows at 40/34px, as a tracker shows them; monospace ids.
- **Weak.** Titles truncate against their labels at this width; the table ends short of the window.
- **Lesson.** The column labels (thead th, data-label): 11px semibold capitals. The comp tracks them at 0.06em; planted,
  they have none and "ASSIGNEE" crowds. The first column's label is empty (priority), so ISSUE is the first word read.
- **Changed from the wireframe.** Three rows in a card became the tracker: grouping, priorities, labels, faces,
  project progress and filters.

## #18 Dispatch, Today

- **Product.** Dispatch, a news reader on the desktop; Wednesday morning in Lisbon.
- **World.** Sidebar (Today, Saved 14, Audio briefings, five followed sources with their marks and unread dots,
  topics), the date and weather, a front page: the lead story with its photo, three stories beside it, and the morning
  briefing playing.
- **Life.** The lake photo leads; thumbnails for each story; a read story greyed; source marks; the briefing's
  progress (story 3 of 7, 4:12 left).
- **Hierarchy.** The lead headline (28px semibold), the list headlines (17px), kickers in the accent, meta at 12.5px.
- **Weak.** The lead column's lower part is empty; the topic links have no icons and sit a little bare.
- **Lesson.** The headlines (data-head) wrap greedily, as browsers do. Measured at this width: "Spring tides uncover a
  Roman road off the Kent coast" ends on "coast" alone (last line 43px of 188), and "…taking apprentices" also
  widows. Planted as-is; plumber balances them. The lead headline (409 of 462) is fine, so the lesson isn't
  everywhere.
- **Changed from the wireframe.** Two rows became a front page; the stories were rewritten to fit the credited photos
  (no aurora photo exists; a Roman road under spring tides fits low-tide.jpg).

## Against the pilots

Each comp has a world (a window with its sidebar), faces or credited photos, data drawn as data, and one live or
selected state, and none is a card of text rows. The flattest are #15 and #18 (the most text by nature); the richest
are #2, #3 and #6. The common weakness is empty space at the bottom of one column; it's noted per screen.

## Review (lead)

- Group 1 holds the pilots' bar: a world, faces, data drawn as data, one selected or live state per screen.
- #6: the three reading cards leave a tall empty middle with the chart pinned to the bottom; in the build, shorten
  the cards or let the chart fill the space under the figure.
- Rename: this group's "Shelf" (#4) clashes with #50's comp; #4 becomes "Cabinet" in the build.
