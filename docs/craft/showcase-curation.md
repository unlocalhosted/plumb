# Which principles get a showcase screen

The bar (owner, 2026-11-04): the kind of craft knowledge people share online as an insight. It's obvious once
shown, and missed by everyone who hasn't been shown it (the safe triangle, tabular numbers). Hygiene a reviewer
would catch, and mistakes nobody really ships, get no screen; plumber keeps checking them.

## Insights: a screen each (48)

Alignment and optics
- 1 Align content, not boxes (a filled panel bleeds by its padding)
- 2 Optical centre beats geometric centre (the play triangle)
- 3 Optical overshoot (round shapes drawn larger)
- 4 Icons sit on cap height, not the line box
- 5 Trim the text's leading (text-box-trim)
- 6 Baseline alignment across sizes
- 8 / 41 Concentric corners at every nesting level

Type
- 15 Tighten tracking on large text, open it on small caps
- 16 Tabular numbers for numbers that change or line up
- 18 / 48 No widows: text-wrap balance for headings, pretty for paragraphs
- 19 Real quotes, apostrophes, dashes and ellipses
- 43 Fallback-font metric overrides (no jump when the web font loads)
- 44 Light text on dark looks bolder
- 45 Hanging punctuation
- 46 Case-sensitive forms for all-caps
- 49 Optical sizing on
- 50 Icon stroke follows text weight
- 76 Truncate in the middle for paths and IDs

Colour, light and depth
- 20 One light source
- 21 / 52 Shadows tinted to their background, not grey
- 23 Translucent borders on elevated surfaces
- 25 No pure black or white for large areas
- 51 Layered shadows
- 54 Dark mode elevates with lighter surfaces, not shadow
- 55 Gradients interpolated in OKLCH (no grey dead zone)
- 56 Eased gradients for scrims
- 57 color-mix for text colour, not opacity

Rendering
- 37 Never land on half pixels (blurry edges)
- 38 Hairlines are 0.5px on retina
- 39 Images get an inner outline
- 40 Continuous corners (squircles)
- 42 Bold on hover must not shift layout

Interaction and motion
- 59 Safe triangle for submenus
- 60 Tooltip warm-up and cool-down
- 61 Menus open on pointerdown, with press-drag-release
- 62 Don't animate frequent keyboard actions
- 63 Never scale from 0
- 64 Interruptible motion
- 65 Rubber-band at the limits
- 66 Spinners: wait ~150–300ms, then hold ≥ ~500ms
- 68 Exits faster than entrances
- 70 Inputs at 16px or more on iOS (no zoom on focus)
- 75 Scroll shadows
- 77 Skeletons match the final layout exactly

Platform
- 36 scrollbar-gutter: stable (no layout jump when a scrollbar appears)
- 69 100dvh, not 100vh, on mobile
- 73 scroll-margin-top on anchor targets
- 74 isolation: isolate instead of z-index wars

## Off the showcase: plumber keeps checking them (26)

Hygiene a reviewer would catch, or not a mistake people really ship:
7 inner ≤ outer spacing · 9 equal padding · 10 icon side · 11 few spacing values · 12 vertical rhythm ·
13 45–75 characters · 14 line height by size · 17 2–3 weights and colours · 22 elevation ladder · 24 APCA contrast ·
26 disabled states · 27 hit targets · 28 hover only where hover exists · 29 focus ring offset · 30 easing direction ·
31 press feedback · 32 animate transform and opacity · 33 content-driven sizes · 34 one media size per list ·
35 truncate with intent · 47 tracking in em · 53 shadow offset by elevation · 58 color-scheme ·
67 reduced motion as a fade · 71 touch-action · 72 overscroll-behavior

(Merged into a sibling: 41 into 8, 48 into 18, 52 into 21.)
