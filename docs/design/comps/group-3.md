# Group 3 comps, critiqued (docs/craft/taste-checklist.md)

Comps: docs/design/prototypes/comps/{56-wayfare, 37-margin, 38-almanac, 39-tack, 40-widgets, 73-commons, 74-plinth,
75-share, 36-thread}.html. Renders: comp-NN.jpg in this folder, at 2×.
References studied for their qualities (not copied): travel discovery apps (Airbnb, Hopper), newsletter stats
(Substack, Ghost, Buttondown), calendars (Cron/Notion Calendar, Fantastical), moodboards (Are.na, Pinterest, Milanote),
iPadOS's widget gallery, team wikis (Notion, Slab), site-builder dashboards (Framer, Webflow), Google Docs/Figma share
dialogs, and Slack/Linear sidebars.
Each comp is drawn with the fix in place, as the pilots were; the mistake is planted when the screen is coded. Where it
goes is named under **Lesson**.

## #56 Wayfare, Explore

- **Product.** Wayfare (the travel family #65 also uses, there as its city maps), a trip planner for two people choosing a winter break (Hana Sato, with a partner on the trip).
  Soft, photographic, the photos sell the place; the accent is kept for the editors' pick dot and the brand.
- **World.** Sidebar (Explore, Trips 2, Saved 18, Map), two upcoming trips with their photos, Hana's face; a search bar
  with "California · anywhere", dates (Dec 11–15, 4 nights) and guests; filter chips with Architecture chosen.
- **Life.** Six real photos; the featured card carries a kicker, a two-line title, three savers' faces, "Saved by
  1,312" and a white price pill; a saved heart (filled, red) against outline hearts elsewhere; ratings and nightly
  prices; a small bar chart of December prices with the cheap week in the accent.
- **Hierarchy.** Four levels: the featured title (27px semibold, white on photo), the page title (19px), card titles
  (13.5px medium), meta (12.5px muted).
- **Weak.** The four small cards are a uniform 2×2; two mountain-lake photos look alike (the media set has three of
  them). The feature's top half is a near-white photo, which is right for the lesson but makes the card heavy at the
  bottom.
- **Lesson.** The scrim under "Light and stone at the Getty" ([data-scrim], lower two thirds of the feature). Planted
  as from-black/70 to-transparent: on this pale stone the linear fade's top edge reads as a grey band across the
  building, mid-card. The comp draws the eased ten-stop curve.
- **From the wireframe.** Was one card alone on the board; now it's the lead of a destination grid in an app, with
  the same photo, title and copy.

## #37 Margin, Stats

- **Product.** Margin, a newsletter platform; Walter Brandt's "Field Notes", 4,812 subscribers. A writer's tool:
  quiet, numbers given room, one ink-dark brand mark with a serif F.
- **World.** Sidebar with the publication, New post, Posts 38, Stats (on), Subscribers, Settings, two drafts (one
  scheduled "Sends Fri 7:00" in caution); a range switch (7 days) and Export.
- **Life.** Four KPIs with deltas (Readers selected, underlined in the accent); readers per day drawn as a smooth
  area chart on dotted gridlines; the pointer resting on Monday's spike with a dashed guide, a ringed point, the
  "post sent" envelope on the axis, and the two-line tooltip "Mon 3 Nov · post sent / 1,284 readers +23%"; the week's
  posts with cover thumbnails and open rates; referrer bars (Email dominant).
- **Hierarchy.** KPI figures (21px), chart and tooltip (13px medium on ink), list titles (13px), labels (11–12px).
- **Weak.** The lower half is two short lists; the chart's y-axis labels are a little loose; the KPI row and the chart
  could share more (the selected KPI only underlines).
- **Lesson.** The tooltip ([data-tip]), pinned beside the point by a zero-height anchor. Planted as top-1/2 with
  -translate-y-1/2: two lines at 1.375 make it 46.4px tall, so it moves up 23.19px and its words sit between pixel
  rows, soft beside the sharp axis labels. The comp places it by layout (top: -23px).
- **From the wireframe.** Was a 28rem card with a bare polyline; now the chart is the centre of a stats page, the
  spike has a cause (the post went out), and the tooltip says so.

## #38 Almanac, Thursday

- **Product.** Almanac, a calendar for a design lead (Ruth Calder) whose day mixes crits, hiring and life.
- **World.** Mini-month with event dots and today in red; calendars with coloured checkboxes and counts (Holidays off);
  Day/Week/Month, arrows and Today; a detail pane for the selected event.
- **Life.** Six events, past ones faded, attendees as faces with +4 / +9; a red 14:42 now line; the next event
  (Interview: Priya Nair, "in 18 min") selected in the accent tint and open on the right with Join call, guests with
  RSVP chips, and notes; the weather.
- **Hierarchy.** The day numeral (40px red), the selected event's title in the pane (18px), event titles (13.5px
  medium), times and places (12.5px muted).
- **Weak.** The agenda's lower third is empty after 18:30 (honest for an evening, but quiet); the detail pane is a
  form-like stack.
- **Lesson.** The dividers between agenda rows ([data-row] on the first). Drawn at 0.5px, one device pixel. Planted as
  border-b, 1px: two device pixels at 2×, as heavy as the time labels' stems, so the agenda reads as a striped table.
- **From the wireframe.** Was four rows in a white card; now a whole day in a calendar, and the dividers are many
  enough (five) that their weight is the page's texture.

## #39 Tack, Glaze tests

- **Product.** Tack, a moodboard app; Ama Ceramics' board of glaze tests for the spring mugs. A maker's board:
  warm, mixed media, terracotta for the studio's mark.
- **World.** Workspace and boards with mosaic thumbnails (Glaze tests selected, 14 pins); collaborators' faces with one
  live (green ring); Share and Add pin; the board itself on a sunken ground.
- **Life.** The lead pin is the mugs on a white sweep with "Chosen", tags, author and 4 comments; a celadon reference
  photo; test tiles drawn as fired tiles (cobalt, honey, speckled shino, celadon, tenmoku, iron speckle) with codes;
  a kiln firing curve with its peak; a yellow note about Saturday's firing; a palette strip; a collaborator's cursor
  (Kwame) in the board.
- **Hierarchy.** The lead photo (two columns, 268px tall) is the subject; pin titles (13px medium), notes (12–12.5px),
  tags (11px).
- **Weak.** Three of the photos are mountain lakes (the only ones the media set has), which reads repetitive for a
  ceramics board; a second product shot of a glaze would sit better than "Iron speckle" as a mountain.
- **Lesson.** The lead pin's image ([data-light]). Every photo carries a 10% black inner outline; planted without it
  on the lead pin, the white sweep meets the white card with no edge and the mugs float loose. The dark photos beside
  it show the outline does nothing to them.
- **From the wireframe.** Was three equal pins in a grey card; now a working board where the light photo is the
  biggest thing on it.

## #40 Widget gallery

- **Product.** A tablet's home screen in edit mode, the widget gallery open: the case where large rounded tiles sit
  beside the system's own smooth icons.
- **World.** A device frame with status bar (9:41, Thu 6 Nov, wifi, 82%), a mountain wallpaper, a row of app icons
  with their remove badges (edit mode), Done, the dock, and the gallery sheet with Search and close.
- **Life.** Four suggested widgets, each real: Lisbon weather on a sky gradient (21°, clear until 6pm, highs and
  lows), Thursday's calendar with the next event, a photo memory ("On this day, Lake Bled, 2023"), activity rings with
  412/530; page dots; Add widget.
- **Hierarchy.** The widgets' figures (40px), the sheet title (19px), widget labels (12–13px).
- **Weak.** App icons are simple stroke glyphs on gradients (a stand-in for a real icon set); the dock repeats the
  icon colours. The sheet hides the home screen's lower rows, so the icons and the tiles meet only at the top.
- **Lesson.** The tiles' 22px corners (the Weather tile is [data-widget]). Drawn with corner-shape: squircle, as the
  app icons, sheet and dock are. Planted as plain border-radius: the tile's quarter-circle kink shows beside the
  smooth icons just above it, which is the comparison the eye makes.
- **From the wireframe.** Was two tiles in a grey card; now the tiles sit in the system they're judged against.

## #73 Commons, Onboarding

- **Product.** Commons, a team wiki; Northwind's handbook, read by Dev Malhotra on his third day.
- **World.** Workspace, search with ⌘K, Home and Recent, a page tree (Handbook open, Onboarding selected), breadcrumbs,
  two editors' faces and "Edited by Ruth · 3d", Share; the page's sticky header with its title, read time and the
  section links, First week underlined.
- **Life.** The page has just been jumped to "First week": the heading is flashed as the target; a day-by-day
  checklist with Monday and Tuesday done, Wednesday "Today, 15:00", owners as faces; the buddy card with a face and
  Message; the scrollbar thumb part way down; the previous section's last line still visible under the header.
- **Hierarchy.** The section heading (21px semibold), the sticky title (15px), checklist items (13.5px), meta (12px).
- **Weak.** The checklist box is a little wide for the text column; the sticky header's title row and the window's
  breadcrumb say "Onboarding" twice.
- **Lesson.** The heading jumped to ([data-target] on First week). Drawn landing below the header. Planted with no
  scroll margin: the jump parks the heading's top at the pane's top, under the sticky header, so you arrive at the
  checklist with its title hidden.
- **From the wireframe.** Was four paragraphs in a card; now a handbook in a wiki, with a section worth jumping to.

## #74 Plinth, Sites

- **Product.** Plinth, a site builder (renamed from Harbor, which #20 uses for its tracker); Fieldwork Studio's dashboard of six client sites.
- **World.** Workspace, Sites 6, Analytics, Domains 4, Templates, Team 5, the plan's storage bar, the admin's face;
  New site; Sort, owner and status filters, grid/list switch.
- **Life.** Six covers drawn as their sites (nav strip and headline on the photo), Live and Draft badges with status
  dots, domains and last-edited, a week's visits as sparklines (dotted for drafts); the Sort menu open, its current
  choice checked, Name hovered under the pointer with its shortcut, and a toggle.
- **Hierarchy.** Covers first, then site names (13.5px medium), the menu (13px), domains and figures (12px).
- **Weak.** Six cards of equal weight; the menu hides almost all of the first card, which is the point but leaves
  the top-left feeling covered rather than layered.
- **Lesson.** The first card's Live badge ([data-badge]) under the open menu. Drawn sitting under it. Planted as
  z-[999] (someone's fix for the cover's hover zoom lifting over it): the badge pokes through the z-50 menu, next to
  "Last edited".
- **From the wireframe.** Was three thumbnails and a menu in a card; now a full dashboard, and the menu is the app's
  own control in the toolbar.

## #75 Outline, Share

- **Product.** Outline, a team's planning docs; Anika Rao sharing "Q3 plan".
- **World.** The doc behind a dimmed scrim: workspace, the Planning docs, breadcrumbs, the doc's title and its three
  goals with progress bars; the dialog with add-people field, role picker, Invite (disabled until filled), general
  access, Copy link and Done.
- **Life.** Faces for people, a monogram for an outside invitee with an "Invited" chip, an email per person, a role
  per person, one row hovered.
- **Hierarchy.** Dialog title (15px semibold), names (13.5px medium), emails and roles (12–12.5px), section label.
- **Weak.** The doc behind is mostly hidden; only its goals' bars show at the right. The dialog is a well-made but
  common object; the life is in the people.
- **Lesson.** The people list ([data-list], 192px, four rows of 48). Drawn with a soft shadow at its bottom edge
  where four more are hidden. Planted without it: with macOS hiding scrollbars at rest, Theo's row ends exactly at the
  box's edge and the list looks complete. Nothing else on the dialog counts the people, so nothing else gives it away.
- **From the wireframe.** Was the dialog alone with initials; now it sits over the doc it shares, with faces.

## #36 Thread, #design (hands-on)

- **Product.** Thread, a team chat; Fieldwork's workspace, mid-morning in #design.
- **World.** A workspace rail (three workspaces, one with a red dot, add); the sidebar (Threads, Mentions, Channels,
  Show all channels, Direct messages with presence); the channel header with topic and members; a composer.
- **Life.** Unread channels bold with accent counts (a muted count for a muted channel), #design selected; the pointer
  on Show all channels, hovered; in the channel, two design directions as photos with reactions (one mine) and a
  thread of 6 replies, an @mention, a PDF, "Theo is typing".
- **Hierarchy.** Selected channel (accent fill), message authors (13px semibold), body (13.5px), timestamps (11.5px).
- **Weak.** The workspace rail's letter tiles are generic; the channel header's member stack is small.
- **Lesson / operation.** The sidebar's scroll area ([data-scroll]) with the app's 8px styled scrollbar. At rest the
  six channels and three DMs fit. Press Show all channels: twelve channels overflow the sidebar, the scrollbar
  appears, and (planted) every count slides 8px left under the pointer. plumber's fix, scrollbar-gutter: stable, keeps
  the room from the start. Same operation as now; the list that grows is the real sidebar instead of a card.
- **From the wireframe.** Was a 16rem card of channels; now it's the sidebar of a chat app, with the channel it opens.

## Against #16

Each comp has a world, faces or real photos, data drawn as data (a chart, a firing curve, sparklines, rings,
progress bars, a now line) and one live or selected state. Flattest of the nine: #75 (a dialog is a dialog) and #74's
equal grid. Strongest beside #16: #37, #38, #36.

## Review (lead)

- Group 3 holds the pilots' bar; #74's photo covers carry it past "six equal cards".
- #75's company is "Northwind", as is #46's airline; rename one in the build.
- Mountain-lake photos repeat across #20, #39, #55, #56 and #74; vary the media before code.
