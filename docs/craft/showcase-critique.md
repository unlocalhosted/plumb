# Showcase critique: to come back to

Screens built but below the bar, found in the post-build review. Fix these after the remaining screens are built.

| № | Screen | What's weak | What it needs |
| --- | --- | --- | --- |
| 15 | Issue table, small-caps labels | Fixed (2026-11-04): one label at 5×, the hatch between each capital's ink and the next (canvas measureText at the letters' DOM positions), the pill the tightest ink gap in px | (done) |
| 46 | Boarding pass, case forms | Fixed (2026-11-04): the colon's and dash's real sag below the figures' middle (1.5px), hatched, closing on the case forms; 5× on the time. Canvas can't draw the case alternates, so the fixed side shows the glyphs, not a measured 0 | (done) |
| 23 | Share menu, translucent border | Fixed: the camera frames the whole menu over the photos (2026-11-04) | (done) |
| 51 | Delete dialog, layered shadows | Fixed: the pill measures the contact, the shadow’s darkness 2px under the edge from its own layers (17% → 32%) (2026-11-04) | (done) |
| 57 | Inbox, opacity on muted text | Fixed: the camera frames the whole preview line (2026-11-04) | (done) |
| 25 | Feature card, pure black | Black against the theme's night reads as a small step at this size; the pill (21 → 17) carries the point | Show the white words' glow: zoom on one glyph edge, or pair the card with the page's near-black ink |
| 20 | One light source | Built (2026-11-04): the rule reads the page's light from its shadows; a sprint board's dragged card with a diagonal lift shadow | (done) |
| 38 | Agenda, hairlines | Only a 2× screen shows it: headless Chromium computes 0.5px borders as 1px, so the recorded moment ends red; proved in the app's pane (0.5px, asked again: nothing) | A loupe on the divider, drawn in device pixels: two rows of pixels, then one |
| 39 | Glaze board, image outline | Checked: 10% black is the outline Apple’s and Linear’s images use; kept (2026-11-04) | (done) |
| 40 | Widgets, continuous corners | Fixed: the cut-out stands 10px clear of the corner, so a round hole never fights the squircle (2026-11-04) | (done) |
| 42 | Project tabs, bold on hover | Hands-on now (2026-11-04): your pointer runs the tabs and the shift is measured live | (done) |
| 37 | Stats chart, half pixels | The blur is only in the pill: the zoomed camera re-rasterises the text, so the softness can't be seen | A loupe of real pixels (a screenshot of the tooltip at 1×, magnified without smoothing), soft rows before, crisp after |
| 73 | Handbook, anchor offset | Fixed: the pane’s cue is scroll shadows (#75’s fix), not a mask, so the card keeps its shadow (2026-11-04) | (done) |
| 74 | Projects, z-index | Fixed: the pill sits on the menu’s edge, level with the badge, outside the shade (2026-11-04) | (done) |
| 36 | scrollbar-gutter (not built) | On a Mac the scrollbar overlays and takes no width, so nothing jumps where the owner looks | Build it when the stage can show a classic scrollbar (Windows, or "always show scrollbars") honestly |
| 76 | Middle truncation (not built) | Its fix is markup (the text split into a start and an end), which plumber can't hand over as a class | Teach plumber a markup fix, or build the screen with advice only |
| 75 | Share list, scroll shadows | Fixed: the hatch closes when the scroll shadow lands, so the shadow is seen at the zoom (2026-11-04) | (done) |
| 68 | Event preview, exits faster | Hands-on now (2026-11-04): you open and close it at ¼ speed; both directions timed from the browser’s transition events | (done) |
| 50 | Empty search, icon stroke | Fixed: the field’s icon keeps its stroke too, so after the fix both draw the same 2px line (2026-11-04) | (done) |
| 63 | Insert menu, scale from 0 | Hands-on now (2026-11-04): you open the menu at ¼ speed; its real outline as it grows, the first painted frame 8% of its size | (done) |
| 70 | Inputs at 16px (not built) | The harm is iOS zooming in on focus, which can't be seen on the desktop showcase honestly | Build it when the stage can show a phone, or as advice only |
| 49 | Optical sizing (not built) | The common mistake is loading a font without its opsz axis (Inter from Google Fonts as wght only); plumber's rule only sees optical sizing turned off on a font that has the axis, so the natural case is invisible to it | Teach the rule to read the @font-face / font file's axes against the family's known ones, then build |
| 59 | Layer menu, safe triangle (probe stage) | Real frames and marks work; plumber's probe is faster than a hand (11 moves, a snapshot after each), so the ruler's milliseconds are the probe's, not a person's. The Radix side's menu opens at rest without its submenu (Radix closes it on focus) | A human-paced probe for recording, or say on the ruler that it's the probe's pace; open the Radix submenu at rest |
