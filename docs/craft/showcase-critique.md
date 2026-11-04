# Showcase critique: to come back to

Screens built but below the bar, found in the post-build review. Fix these after the remaining screens are built.

| № | Screen | What's weak | What it needs |
| --- | --- | --- | --- |
| 15 | Issue table, small-caps labels | The gaps between capitals open by under a pixel; the moment barely shows anything happen | Zoom tighter on one label, and draw each letter's box so the crowding and the opening read at a glance |
| 46 | Boarding pass, case forms | The pill is on/off (1 → 0), not a measurement; the colon and dash rising is too small to see | Measure the punctuation's real height against the capitals (render it with and without `case`) and show both lines |
| 23 | Share menu, translucent border | The camera crops the menu's last row; the border swap is faint at that zoom | Frame the whole menu; zoom on one corner where border meets photo so the grey line against the picture reads |
| 51 | Delete dialog, layered shadows | The contact band under the dialog sits near the card's edge and is partly cut; the pill counts layers rather than measuring the contact | Leave room below the dialog; measure the darkness right under the edge before and after |
| 57 | Inbox, opacity on muted text | The camera frames the line's start and crops the rest; the fade on @you is visible but small | Frame the mention with the preview's grey either side; a side-by-side swatch of the mention's colour, faded and full |
| 25 | Feature card, pure black | Black against the theme's night reads as a small step at this size; the pill (21 → 17) carries the point | Show the white words' glow: zoom on one glyph edge, or pair the card with the page's near-black ink |
| 20 | One light source (not built) | The rule only sees shadows cast up or sideways in absolute terms. The natural case, a bottom bar's upward shadow, is a choice, not a mistake | Make the rule compare each shadow with the page's dominant direction (mixed lights on one page), then build a page whose popover casts a different way from its cards |
| 38 | Agenda, hairlines | Only a 2× screen shows it: headless Chromium computes 0.5px borders as 1px, so the recorded moment ends red; proved in the app's pane (0.5px, asked again: nothing) | A loupe on the divider, drawn in device pixels: two rows of pixels, then one |
| 39 | Glaze board, image outline | The outline reads a touch strong in the zoomed moment | Check at 1× and 2× that 10% black is the right weight on a white card; consider 8% |
