# Cards F: #65 #66 #68 #73 #74 #75 #76 #77, one component each

Comps: docs/design/prototypes/comps/NN-*-card.html. Renders: card-NN.png in this folder, at 2×, by Playwright.
The bar is #16 (16-timer-card.html, card-16.png). Each card is the one component, alone on the board, with Slate's
tokens from overlay/showcase/src/theme.css. Hairlines are half-pixel inset shadows. Logos are simple-icons 13.21.0 masks
on the brand's colour, as #16 does them. Still screens (#73 #74 #75) are drawn as they show at rest, which is the
broken side, because each mistake is something you see at rest. Hands-on screens (#65 #66 #68 #76 #77) are drawn at the
moment the flaw shows, with plumber's marks in tokens.css colours.
Products checked for clashes: no Northwind (#46 is Northwind Air), no Field*, no Halden & Co. (Quarry's client), no
Relay (#57). The lake photo is not used. valley.jpg and peak.jpg both show water under mountains, though.

## #65 Wayfare, Café Mona's place sheet (hands-on)
- **Product + moment.** Wayfare's city map on a phone (the travel family of #56). The sheet is fully open and the hand
  has pulled 80px up past its limit. The clamped sheet hasn't moved.
- **Rich.** A drawn map with parks, the river, streets, the walk to the café pin and other pins; search with a face and
  filter chips. The sheet has rating, open status, four actions, a real photo, a review with a face, and popular times
  as bars with "now" in the accent.
- **Hierarchy.** Title 20/600, actions and section heads 13/500, meta 13 muted, axis 11 subtle.
- **Mistake.** At the sheet's open top edge (`top: REST`). Planted as it is today: the offset is clamped at 0 when you
  drag up (`off = elastic ? -rubber(-dy) : 0`). Marks: the dashed limit, a sky ring where you pressed, a coral dot where
  your hand is, a hatched coral wall over the map, and "0 of 80px · dead".
- **Weak.** The phone grows from 300×352 to 340×640, so the code's REST/limit numbers need to change. The map is
  drawn, not a photo: the old code put valley.jpg there, which never read as a map. Drawn bridges cross the river
  plainly.

## #66 Tally, a bank feed card (hands-on)
- **Product + moment.** Tally, bookkeeping for Okapi Studio (renamed from Halden & Co., which is Quarry's client).
  The Monzo business account. Drawn the frame after a fast Sync now: "Synced just now", and the spinner has already
  come and gone.
- **Rich.** Monzo's mark; £24,318.40 with a 30-day balance chart (paydays step up, outgoings step down) and a 7d/30d/90d
  switch. Five feed transactions with real merchant marks (Stripe, GitHub, Figma, Slack, Airbnb), category chips (one
  uncategorised in caution), new dots, and tabular amounts. The footer says how many are left to review.
- **Hierarchy.** Balance 32/500 (pence 20 muted), names 14–15/500, meta 12.5–13 muted, axis and labels 11–12 subtle.
- **Mistake.** In the Sync now button (fixed 120px wide, so Syncing/Sync now never jumps). Planted as today: the
  spinner shows on the press and hides on the reply. Marks below the card: reply and spinner lanes on one 1.6s scale,
  both 122ms, the rule's 200ms line, and "flashed 122ms" above the button.
- **Weak.** The card itself only says "Synced just now". The blink lives in the lanes and the tag, so a still frame
  can't show the flash. The Monzo tile's navy is very close to the ink.

## #68 Almanac, Thursday with the crit's preview (still EventPreview + hands-on ExitFaster)
- **Product + moment.** Almanac, Ruth Calder's calendar (the same product as #38). Close was pressed and the pointer
  has already moved on to the 1:1 with Tomi, but the preview is still only halfway out (300ms both ways, at ¼ speed).
- **Rich.** A week strip with each day's calendar dots, today filled. The morning is a timeline of six events in three
  calendars' colours, with faces, a "+2", and the now line. The preview has a Google Meet mark and link, a stack of
  four guests with their replies, a note, and Join with Meet / Close.
- **Hierarchy.** Day 17/500, preview title 15/500, events 13/500, meta 12–13, hour labels 11.
- **Mistake.** On the popover's transition (`[data-popover]`): `duration-300` with no
  `data-[state=closed]:duration-*`. Drawn at about 85% opacity and 98.5% scale over the events, with the in/out bars
  under the card (both 300ms, the out bar coral) and "no quicker out".
- **Weak.** Halfway through fading, the preview's words lie over the events' words. That is the lesson (it lingers in
  front of what you want next), but the frame is busy. The still EventPreview screen should rest with the preview fully
  open. The 13:00 event sits tight against the card's bottom.

## #73 Commons, Halyard's onboarding page (still)
- **Product + moment.** Commons, a team wiki. Halyard's handbook (renamed from Northwind, which clashed with #46).
  First week has just been jumped to.
- **Rich.** A sticky header with the workspace, breadcrumb, two editors' faces with "Edited by Ruth · 3d", the title,
  read time, and section links with First week underlined. Below it: a day-by-day checklist with each owner's face
  (Mon and Tue done, Wed "Today, 15:00" in the accent), the buddy card with a face and Message, and Tools with Linear
  and Slack marks. A scrollbar thumb part way down.
- **Hierarchy.** Section heading 21/600, page title 18/600, items 13.5, meta 12.
- **Mistake.** At `#first-week` (`[data-target]`), which has no `scroll-mt-*`. The jump puts the heading at the very
  top of the pane, under the sticky header (about 104px tall, 95% white with blur). You land on a checklist with no
  title: the heading and its intro paragraph are both underneath, and only their blur shows through.
- **Weak.** The hidden heading is easy to miss in a still: the checklist starts cleanly enough to look intended until
  the camera moment points at it. The header is taller than the code's, so the scroll-mt fix grows (about
  scroll-mt-28).

## #74 Plinth, Oriel Studio's sites (still)
- **Product + moment.** Plinth, a site builder: six client sites in a grid, with the Sort menu open over the first card.
- **Rich.** Six photo covers drawn as the sites themselves (each with its nav and headline), Live/Draft badges with
  status dots, domains, a week of visits as a sparkline with a total (dashed and "—" for drafts), owner and sort
  controls, a grid/list switch, and New site. The menu has a checked choice, a hovered row, shortcut keys, a separator,
  and a toggle.
- **Hierarchy.** Cover headlines 15/600 (the site's own voice), site names 13.5/500, menu 13, domains and figures 12.
- **Mistake.** The first card's Live badge (`[data-badge]`) with `z-[999]`. It pokes through the z-50 menu, across
  "Recently edited" and "Name". In the code the badge is inside its cover; the comp draws it at panel level, where the
  stacking puts it.
- **Weak.** Six cards of equal weight. Covers reuse photos the Lumen library (#23/#51) also shows, and the visible
  Riverline cover (valley.jpg) reads as lake and mountains, close to the retired lake. A new cover photo would help.

## #75 Outline, sharing "Q3 plan" (still)
- **Product + moment.** Outline, planning docs. Anika Rao shares Brindle's Q3 plan (renamed from Northwind).
- **Rich.** The doc's own head and its three goals drawn as progress bars. An add-people field with a role, and Invite
  disabled until it's filled. Faces with emails and per-person roles, one row hovered (its role turns into a control).
  An outside invitee as a monogram with an "Invited" chip, general access, Copy link and Done.
- **Hierarchy.** Title 15/600, names and goal values 13–13.5/500, emails and roles 12–12.5, the section label
  12/500 muted.
- **Mistake.** The people list (`[data-list]`), 192px tall and holding 8 rows of 48px. Theo's row ends exactly on the
  box's edge and the general-access line follows, so the list reads as complete. On purpose, nothing else counts the
  people: the label's right side says "Sorted by role", not "8 people".
- **Weak.** A share dialog is a common object; the life is in the faces and the goals. The input is drawn at 13px:
  the code keeps `text-base md:text-[13px]` (#70's rule), which must stay.

## #76 Seam, PR #482's changed files (hands-on)
- **Product + moment.** Seam, code review. The panel's edge has been dragged in to 320px and is still held (accent
  handle, resize cursor).
- **Rich.** PR state, number and approvals; the title; the author's face and branch; +214/−96 with diffstat blocks.
  Six files with M/A status tiles, a comment count on one, and per-file +/− in a fixed tabular column. The selected
  file is tinted, with "2 of 6 viewed" and a viewed bar.
- **Hierarchy.** PR title 14/600, section 13/500, paths 12 mono, meta 11–12.
- **Mistake.** In each `[data-path]` row: one `truncate` span, so the browser cuts at the end. All six rows now read
  `src/components/forms…`. The fixed comment and count columns leave every path the same width, so the cut lands in
  the same place on every row. Marks: a coral outline round each row's words, and "6 rows read the same".
- **Weak.** It's a narrow panel, so it's the least dense card. The comment marker "● 3" is a plain glyph rather than a
  dither icon.

## #77 Spool, the team's activity card (hands-on)
- **Product + moment.** Spool, a design team's hub collecting activity from their tools. Drawn the frame the rows land
  after Refresh. The generic skeleton was three thin bars (3 × 32px, 104px with padding); four rows of 56px landed.
- **Rich.** Faces carrying each tool's mark (Figma, GitHub, Linear, Notion, as on #16), names and objects in ink with
  the verb muted, a design thumbnail, a merged-PR chip, an unread dot, an Everyone/Mentions switch, Refresh, and a
  weekly count by View all activity.
- **Hierarchy.** "Activity" 17/500, actions 13.5 (bold names), meta 12, the link 13/500 in the accent.
- **Mistake.** The `<ul>` while `aria-busy`: generic `h-8` bars instead of the row's own shape. Marks: the skeleton's
  promised box (dashed coral), +128px hatched as a bracket beside the card (so no hatch crosses the rows' words; the
  code's Hatch spans the whole width and should move the same way), an outline where View all activity sat, the sky
  ring of the pointer still there, and "+128px · 3 → 4 rows".
- **Weak.** The skeleton itself isn't in the frame; only its dashed ghost is. The thumbnail (fig-thumb.jpg) is
  unreadable at 48×32. The old link's outline overlaps the first line of Tomi's row, which is what happened but crowds
  the words.

## Against #16
#66 and #77 come closest: data drawn as data, brand marks, and a calm three-level hierarchy. #74 and #73 are dense and
real. #68 is the richest but the noisiest at its flaw moment. #76 is honest but thin. None introduces a second mistake
by eye. Lists use one avatar size, the figures are tabular, targets are at least 24px, images have inner outlines, and
nested radii were checked at the corners. Plumber still has to confirm each once it's coded.

## Credits
Photos from Unsplash, under the Unsplash License. Resized to 1600px on the long side, quality 80.

| File | Photo | Photographer |
| --- | --- | --- |
| s65-cafe.jpg | https://unsplash.com/photos/a-cup-of-coffee-on-a-marble-table-ztWQ2IsKAU4 (photo-1678569187178-eab3ece6f778, a latte on a marble café table) | @omariko |
| s74-lodge.jpg | https://unsplash.com/photos/brown-wooden-house-in-the-middle-of-snow-covered-pine-trees-bTQRVLiOXps (photo-1622066869975-df6a5029338a, an A-frame cabin in snowy pines) | @katertottz |
| s74-trail.jpg | https://unsplash.com/photos/a-winding-dirt-path-leads-through-rolling-hills-mAYAhMwyFF4 (photo-1774462524607-e89868e006bc, a hill path) | @beewhy001 |
| s74-architecture.jpg | https://unsplash.com/photos/modern-brutalist-architecture-with-concrete-textures-and-ceiling-lights-0I0lfvXvOhw (photo-1761850149117-ec0df2bfb141, board-formed concrete) | @creative_hina |
| s74-neon.jpg | https://unsplash.com/photos/teal-and-purple-nightclub-spotlights-QOajY0MNp8Y (photo-1657208431551-cbf415b8ef26, stage spotlights) | @scarlettalt |
| s74-pottery.jpg | https://unsplash.com/photos/hands-sculpt-a-clay-pot-on-the-potters-wheel-miTlsTvoLVg (photo-1753164726043-31e583f8a9b8, a pot on the wheel) | @silverkblack |
| s74-sea.jpg | https://unsplash.com/photos/sunrise-over-the-ocean-xBMNXN8_-ng (photo-1743360557314-38213aefc925, sunrise over the sea) | @tizio1964 |
| s77-design.jpg | https://unsplash.com/photos/website-wireframe-sketch-on-paper-4UGmm3WRUoQ (photo-1600132806608-231446b2e7af, wireframe sketches) | @sigmund |
| logos/{monzo,github,slack,airbnb,linear,googlemeet}.svg | simple-icons 13.21.0 (CC0 paths; the marks are their companies' trademarks), vendored if missing | simple-icons |
