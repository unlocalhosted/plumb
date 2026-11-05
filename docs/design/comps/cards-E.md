# Cards E: #57, #59, #60, #61, #63, #64 as one rich component each

Comps in docs/design/prototypes/comps/NN-*-card.html, renders at 2× in docs/design/comps/card-NN.png. Each is the one
component on the board, no app chrome, built from theme.css values (Slate ink/greys, `--color-line`, accent, radii
card 10 / sheet 14, `shadow-window` for the component, `shadow-popover` for menus, hairlines as 0.5px inset shadows).
Like 16-timer-card.html they're plain CSS, not Tailwind. All six use the same arrow pointer to mark the moment, and
none draw plumber's marks; those stay the stage's job.

Shared caveats: new photos are hotlinked from images.unsplash.com and have to be vendored into
overlay/showcase/src/media with CREDITS rows before the build. Every existing media photo is already used on another
screen, so these are new and no two of my screens share one. Portraits do repeat across the showcase, because there
are only ten. GitHub and Linear marks come from simple-icons 13.21.0 on the CDN and need vendoring into media/logos.
Inter isn't installed here, so the renders use the system face (as card-16.png did).

## #57 Relay, Inbox (text-opacity)
- Moment: the Important tab mid-morning, Mei's crit notes selected. Six messages across Today and Yesterday.
- Rich: faces, plus the company's own mark on a round tile for GitHub and Linear. Unread dots, thread counts and label chips in the status tints. Mei's row carries a .plate attachment (fig-thumb.jpg) and a PDF. Anika's row has the three teammates on it as faces. Amara's has a meeting invite drawn as a date tile with Maybe/Going.
- Hierarchy: sender 14/500 (400 once read) · subject 13 ink · preview 13 muted · time and day labels 12 subtle.
- Mistake: every `.pv` preview is `opacity: 0.6` on ink (the build's `opacity-60`). The `@you` inside Mei's is the accent at 500, and it reads lilac-grey: faded with the line. Code plants it exactly as now, and the fix is `text-ink-muted`.
- Weak: it's long (about 890px tall). The opacity also fades the GitHub and Linear previews, which is consistent but means the lesson only lands on one word. The invite's Going button is the only filled accent, and it competes with the faded mention.

## #59 Plate, Layers panel with the layer menu (submenu-path)
- Moment: Story card is selected, ⋯ is pressed, the menu is open and Arrange's submenu is open beside it. The pointer has just left Arrange on the straight line to Send to back.
- Rich: a layer tree with kinds by icon (frame #, auto-layout, rect, text T, component ◇ in its own violet). An image layer shows its photo as the thumbnail. A hidden layer is greyed with eye-off. Teammates' faces sit on the layers they're in (orange and green presence rings). Frame widths (1440/834/390) and the page picker use the fig-thumb render. A selection footer gives the size and the fill swatch.
- Hierarchy: frame names 13/500 · layers 13 · menu label and section 11 subtle · shortcuts 12 subtle.
- Mistake: behaviour only. The hand-rolled menu sets `sub=false` on pointerenter of any other item, so crossing Hide (directly under Arrange, on the diagonal) closes the submenu. Code plants it by keeping HandRolledMenu; the fix is Radix's menu.
- Weak: a still can't show the loss. The composition is left-heavy, with empty board on the right, because the menus open rightwards. The component violet (#8a4fd8) is a new hue: it's a design-tool convention, not a theme token. Swap it for accent-deep if that counts as a new primitive.

## #60 Folio, the editor (tooltip-delay)
- Moment: the pointer sweeping right along the toolbar. Strikethrough's tooltip is up the instant it arrived, while the pointer is already leaving.
- Rich: the piece itself, with a caps kicker, a serif title, a byline with two faces, a selection with a caret, a phrase under comment (caution tint, plus a face pin with the count), an aerial tide photo with its caption, and a footer saying it's saved, the word count, and who's editing.
- Hierarchy: title 30 serif · body 17/28 serif · toolbar and byline 13 sans · caption and footer 12–12.5 muted.
- Mistake: behaviour only (no warm-up delay; the build's broken side shows on pointerenter). The tooltip is drawn correctly: ink, with a quieter shortcut.
- Weak: a still of a tooltip looks like a correct hover, so the flaw lives only in motion and in the md. The toolbar's right third is empty (I moved the word count out so nothing wrapped at 600px). The serif is the system's New York/Georgia: that's a new type role, and the magazine needs one, but the owner should approve it.

## #61 Stowe, Brand drive (menu-pointerdown)
- Moment: View was pressed and held. Nothing opened until the release, and the menu has only now appeared with the pointer still on the button.
- Rich: the drive's space drawn as a stacked bar by kind with a key. Each kind keeps one colour everywhere: video orange, images accent, PDFs crimson, documents blue, vectors teal. The rows have real thumbnails (a film frame with its 2:14 length, the campaign photo) and coloured kind tiles. Each row shows the owner's face, the date and a tabular size, and second lines carry facts (48 pages, 6000 × 4000, 4K · 2 min 14 s). The menu has Sort by and Show, with checks.
- Hierarchy: drive name 17/500 · file names 13/500 · secondary 12–13 muted · caps column labels 11 subtle (tracked).
- Mistake: behaviour only. The build opens it in onClick, so a press-drag-release picks nothing.
- Weak: the comp shows the menu after release, so it looks like a working menu. The other honest frame, held with nothing open, is poorer, so I didn't draw it. The kind palette is five new hues; they're conventions, but nothing in theme.css holds them. The menu covers the "free" figure and three owner names: true to life, but it hides data.

## #63 Commonplace, offsite page (scale-from-zero)
- Moment: + beside the empty line was just clicked. The Insert menu is frozen a quarter of the way into its entrance: scale 0.6 at opacity 0.6, grown from the + (origin top left), smeared over the Rooms table.
- Rich: a cover photo (the jetty), the page's properties (dates, host face, Booked status, seven faces going with "9 of 11"), a checklist, and a Rooms table of who sleeps where, as faces. The menu has icon tiles with a description under each block name.
- Hierarchy: title 26/600 · Rooms 15/600 · body 14 · properties and table 13 · labels 11–12 subtle.
- Mistake: the menu's entrance from `starting:scale-0` with `origin-top-left`, as InsertMenu has now. The frozen frame is that habit's quarter-way frame. The fix is `starting:scale-95`.
- At rest: open the file with `#rest`, rendered as card-63-rest.png, to judge the menu itself.
- Weak: the frozen frame is meant to look wrong, and it does (a muddle of tiny words over the table), but it's a judgement call whether the owner wants the rest frame as the comp instead. The full menu clears the card's bottom by only ~2px. The Going stack shows seven faces for "9 of 11", with no +2.

## #64 Negative, Highlands album (interruptible)
- Moment: Info was clicked, then clicked again while the panel was 55% of the way in. Drawn is the frame of the second press, the pointer on the pressed Info button.
- Rich: a photo grid by day, with place names and counts. A selected photo has its ring and tick, and a favourite has its heart. The Info panel has the preview, the file name with MP and size, an RGB histogram drawn as data, the exposure as four readings, and when, camera and who (with a face).
- Hierarchy: album 17/500 · day 13/500 with the place muted · panel file name 13/500 · exposure 13/500 over 11 subtle labels · meta 12.5.
- Mistake: the panel's entrance and exit are two keyframe animations (`data-[state=open]:animate-in slide-in-from-right` / `data-[state=closed]:animate-out slide-out-to-right`). Reversed at 55%, the exit restarts from fully open, so the next frame snaps to 100%. The fix is one transition on `translate`.
- Weak: a half-in panel reads as a clipped column, not as motion. The snap is the lesson and it only exists between frames. The photos are generic mountain and forest stock, not one real shoot. The panel has a hairline edge and no shadow, on purpose (a sideways shadow would be a second light, #20), so it separates from the grid only by its white.

## Against #16
#57, #61 and #64 come closest to the bar: each has data drawn as data (invite, space bar, histogram), faces, density and one accent. #59 and #60 are richer than before, but their lesson is invisible in a still, so their pictures can only sell the product, not the lesson. #63 deliberately shows the broken frame. All six need the owner's eye on the new hues (component violet, file kinds) and on the serif before any build.

## Credits
Photos from Unsplash, under the Unsplash License (free to use, no permission needed), vendored into
overlay/showcase/src/media at most 1600px on the long side, quality 80. Logos from simple-icons 13.21.0 (CC0 paths; the
marks are their companies' trademarks, shown as senders in a demo).

| File | Photo | Photographer |
| --- | --- | --- |
| s57-crit-wall.jpg | https://unsplash.com/photos/HUuWNQmW58A (photo-1641355527446-232d7f1f2c10, a wall of post-it notes) | Annie Vo |
| s59-cabin.jpg | https://unsplash.com/photos/FKJgBUDoVC0 (photo-1449158743715-0a90ebb6d2d8, a wooden cabin in a pine forest) | @olivier_twwli |
| s60-tide.jpg | https://unsplash.com/photos/sLAk1guBG90 (photo-1505142468610-359e7d316be0, aerial photo of a seashore) | Shifaaz Shamoon (@sotti) |
| s61-campaign.jpg | https://unsplash.com/photos/HlVjI5WmoQY (photo-1613915617430-8ab0fd7c6baf, a person in a blazer, black and white) | Chyntia Juls (@chyntiajuls) |
| s61-film.jpg | https://unsplash.com/photos/GW7AiVXuuuY (photo-1597099911706-1f7c9ba6839b, a waterfall between pines) | Joshua Woroniecki (@joshuaworoniecki) |
| s63-cottage.jpg | https://unsplash.com/photos/jBI5n6d8ZwY (photo-1579627559241-aa855a66df15, a thatched brick cottage) | @liv_escapes |
| s64-ridge.jpg | https://unsplash.com/photos/Cd3Ek7rNXSk (photo-1551801691-f0bce83d4f68, the Quiraing under cloud) | Bjorn Snelders (@bjorns) |
| s64-storr.jpg | https://unsplash.com/photos/ND2jxuy569c (photo-1763332183284-a40cb9111665, the Old Man of Storr) | Diane Rish (@dianerish) |
| s64-cattle.jpg | https://unsplash.com/photos/PTwcNxVfNWI (photo-1618651310777-acc5fe06493a, Highland cattle on a hill) | Piotr Musioł (@szamanm) |
| s64-road.jpg | https://unsplash.com/photos/IHKBF23A_iw (photo-1476990789491-712b869b91a5, a road through the Trotternish hills) | @v2osk |
| s64-stones.jpg | https://unsplash.com/photos/-6hvB84fyYA (photo-1576405515541-cb47b7da4fa7, rock pinnacles on a green hillside at dusk) | Massimiliano Morosinotto (@therawhunter) |
| s64-sheep.jpg | https://unsplash.com/photos/slI38tNPHcs (photo-1761147950077-0c5d58759ff2, sheep on a hillside, mountains beyond) | Duwaraka Murugadas (@duwa) |
| s64-bluebells.jpg | https://unsplash.com/photos/APesM3x0wRg (photo-1719457844066-53a8854cc364, a wood full of bluebells) | Suzanne Rushton (@suzanne_ella) |
| s64-path.jpg | https://unsplash.com/photos/XQUcjQOGGCg (photo-1638627740211-32f29fe69912, a path between tall pines) | Abhishek Banik (@abphotography) |
| s64-river.jpg | https://unsplash.com/photos/Nj7gBJ7-JUo (photo-1680038409811-81fcb9e1f789, a river through a forest) | Adrian Mag (@l2space) |
| logos/github.svg, logos/linear.svg | simple-icons 13.21.0 | simple-icons |
