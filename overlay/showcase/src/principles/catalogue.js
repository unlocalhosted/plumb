// The 77 principles of docs/craft/rules.md, as the showcase shows them (generated from that table; edit it there).
// how: live = the overlay marks it on the page (Alt+B); probe = plumber craft finds it by using the page; habit = plumber finds it in source.
export const PRINCIPLES = [
 {
  "n": 1,
  "section": "Alignment and balance",
  "title": "Align content, not boxes",
  "detail": "Text and icons in a column share one left edge; a highlighted row bleeds out by its padding (-mx-3 px-3) so its background escapes the column and its text stays on the line.",
  "why": "The eye follows letters, not invisible boxes. A padded row sitting flush pushes its words in by its padding.",
  "how": "live"
 },
 {
  "n": 2,
  "section": "Alignment and balance",
  "title": "Optical centre beats geometric centre",
  "detail": "A play triangle, an arrow or a chevron centred by its box looks off; nudge it toward its heavy side (a play icon ~1–2px right).",
  "why": "Visual mass, not bounding box, is what the eye centres.",
  "how": "live"
 },
 {
  "n": 3,
  "section": "Alignment and balance",
  "title": "Optical overshoot",
  "detail": "Round shapes must be a touch larger than square ones to look the same size.",
  "why": "A circle covers less of its box than a square.",
  "how": "live"
 },
 {
  "n": 4,
  "section": "Alignment and balance",
  "title": "Centre icons on cap height, not the line box",
  "detail": "",
  "why": "Line boxes include room for descenders, so line-box centring sits icons low.",
  "how": "live"
 },
 {
  "n": 5,
  "section": "Alignment and balance",
  "title": "Trim text's leading",
  "detail": "Padding of 16 around text looks like 20+ at the top; use text-box-trim or compensate.",
  "why": "A text box carries invisible half-leading above and below the letters.",
  "how": "live"
 },
 {
  "n": 6,
  "section": "Alignment and balance",
  "title": "Baseline alignment across columns",
  "detail": "Label and value side by side share a baseline, not a top edge, at different sizes most of all.",
  "why": "Tops of different sizes don't line up visually; baselines do.",
  "how": "live"
 },
 {
  "n": 7,
  "section": "Spacing and rhythm",
  "title": "Inner spacing ≤ outer spacing",
  "detail": "The gap inside a group is smaller than the gap between groups.",
  "why": "Proximity is how people read grouping.",
  "how": "live"
 },
 {
  "n": 8,
  "section": "Spacing and rhythm",
  "title": "Nested radius = outer radius − padding",
  "detail": ", at every level, never below 0.",
  "why": "Otherwise the curves aren't concentric and the corner looks pinched or bulged.",
  "how": "live"
 },
 {
  "n": 9,
  "section": "Spacing and rhythm",
  "title": "Equal padding isn't equal",
  "detail": "Text buttons want ~2:1 horizontal to vertical; icon buttons want equal.",
  "why": "Words are wide and short; a square box around them looks cramped.",
  "how": "live"
 },
 {
  "n": 10,
  "section": "Spacing and rhythm",
  "title": "The icon side gets less padding",
  "detail": "A button with a leading icon takes 2–4px off that side.",
  "why": "An icon's whitespace is built into its glyph box.",
  "how": "live"
 },
 {
  "n": 11,
  "section": "Spacing and rhythm",
  "title": "Use few spacing values",
  "detail": "4, 8, 16, 24 reads intentional; 4, 5, 7, 10, 13 reads noisy.",
  "why": "Repetition is what makes spacing feel designed.",
  "how": "habit"
 },
 {
  "n": 12,
  "section": "Spacing and rhythm",
  "title": "Vertical rhythm",
  "detail": "Stacked sections space from a few repeated steps, consistently down the page.",
  "why": "Rhythm lets the eye predict and rest.",
  "how": "live"
 },
 {
  "n": 13,
  "section": "Typography",
  "title": "45–75 characters per line",
  "detail": "for reading text.",
  "why": "Longer lines lose the return sweep; shorter ones chop the thought.",
  "how": "live"
 },
 {
  "n": 14,
  "section": "Typography",
  "title": "Line height shrinks as size grows",
  "detail": "Body ~1.5, headings ~1.1–1.25.",
  "why": "Big text with loose leading looks like separate lines.",
  "how": "live"
 },
 {
  "n": 15,
  "section": "Typography",
  "title": "Tighten tracking on large text, loosen it on small caps and labels",
  "detail": "Headings −0.01 to −0.03em; uppercase labels +0.04 to +0.08em.",
  "why": "Large letters look loose; small capitals look cramped.",
  "how": "live"
 },
 {
  "n": 16,
  "section": "Typography",
  "title": "Tabular numbers for numbers that change or line up",
  "detail": "",
  "why": "Proportional digits jitter in counters and misalign in tables.",
  "how": "live"
 },
 {
  "n": 17,
  "section": "Typography",
  "title": "2–3 weights, 2–3 text colours",
  "detail": "Hierarchy from contrast between few levels, not many levels.",
  "why": "Every extra level weakens the others.",
  "how": "live"
 },
 {
  "n": 18,
  "section": "Typography",
  "title": "No widows in headings",
  "detail": "Balance lines with text-wrap: balance.",
  "why": "One word alone on the last line looks broken.",
  "how": "live"
 },
 {
  "n": 19,
  "section": "Typography",
  "title": "Real quotes, apostrophes, dashes, ellipses",
  "detail": "’ “ ” – …",
  "why": "Straight quotes and three dots read as unfinished.",
  "how": "habit"
 },
 {
  "n": 20,
  "section": "Colour and light",
  "title": "One light source",
  "detail": "All shadows fall the same way, usually down.",
  "why": "Mixed offsets look like a collage.",
  "how": "live"
 },
 {
  "n": 21,
  "section": "Colour and light",
  "title": "Shadows are tinted, not grey",
  "detail": "",
  "why": "A black shadow on a coloured ground looks dirty.",
  "how": "live"
 },
 {
  "n": 22,
  "section": "Colour and light",
  "title": "An elevation ladder",
  "detail": "Higher means bigger and softer, in even steps.",
  "why": "Inconsistent steps break the sense of depth.",
  "how": "live"
 },
 {
  "n": 23,
  "section": "Colour and light",
  "title": "Translucent borders on elevated surfaces",
  "detail": "",
  "why": "A solid grey border fights the shadow.",
  "how": "live"
 },
 {
  "n": 24,
  "section": "Colour and light",
  "title": "Perceptual contrast (APCA) for small text",
  "detail": "",
  "why": "WCAG 2 ratios mislead, most of all on dark themes.",
  "how": "live"
 },
 {
  "n": 25,
  "section": "Colour and light",
  "title": "No pure black or white for large areas",
  "detail": "",
  "why": "Harsh; tinted neutrals read better.",
  "how": "live"
 },
 {
  "n": 26,
  "section": "Colour and light",
  "title": "Disabled isn't just lower opacity",
  "detail": "",
  "why": "40% text on a coloured button fails contrast and looks broken.",
  "how": "live"
 },
 {
  "n": 27,
  "section": "Interaction feel",
  "title": "Hit targets ≥ 24px (44 on touch)",
  "detail": "even when the visual is smaller.",
  "why": "Small targets miss.",
  "how": "live"
 },
 {
  "n": 28,
  "section": "Interaction feel",
  "title": "Hover only where hover exists",
  "detail": "(@media (hover: hover)).",
  "why": "Hover sticks on touch.",
  "how": "habit"
 },
 {
  "n": 29,
  "section": "Interaction feel",
  "title": "A focus ring with an offset",
  "detail": "never outline: none without a replacement.",
  "why": "Keyboard users get lost.",
  "how": "habit"
 },
 {
  "n": 30,
  "section": "Interaction feel",
  "title": "Ease-out to enter, ease-in to leave, never ease-in for input responses",
  "detail": "100–300ms.",
  "why": "Ease-in on a response feels sluggish.",
  "how": "habit"
 },
 {
  "n": 31,
  "section": "Interaction feel",
  "title": "Press feedback within 100ms",
  "detail": "(scale ~0.97 or darken).",
  "why": "Without it a press feels missed.",
  "how": "probe"
 },
 {
  "n": 32,
  "section": "Interaction feel",
  "title": "Animate transform and opacity, not layout",
  "detail": "",
  "why": "Width/top animations re-lay out every frame.",
  "how": "habit"
 },
 {
  "n": 33,
  "section": "Layout and platform",
  "title": "Content-driven sizes",
  "detail": "Buttons hug, columns fill, fixed widths only where things must align.",
  "why": "Fixed sizes break with real content and translations.",
  "how": "live"
 },
 {
  "n": 34,
  "section": "Layout and platform",
  "title": "One avatar and icon size per list",
  "detail": "",
  "why": "32 next to 36 looks like a mistake.",
  "how": "live"
 },
 {
  "n": 35,
  "section": "Layout and platform",
  "title": "Truncate with intent:",
  "detail": "min-width: 0, ellipsis, the full value on hover.",
  "why": "Overflowing names break layouts or hide silently.",
  "how": "live"
 },
 {
  "n": 36,
  "section": "Layout and platform",
  "title": "scrollbar-gutter: stable",
  "detail": "",
  "why": "Layout shouldn't jump when a scrollbar appears.",
  "how": "live"
 },
 {
  "n": 37,
  "section": "Rendering and pixels",
  "title": "Never land on half pixels",
  "detail": "",
  "why": "Fractional transforms blur text and 1px lines.",
  "how": "live"
 },
 {
  "n": 38,
  "section": "Rendering and pixels",
  "title": "Hairlines are 0.5px on retina",
  "detail": "",
  "why": "A 1px grey line is twice as heavy as meant on 2× screens.",
  "how": "live"
 },
 {
  "n": 39,
  "section": "Rendering and pixels",
  "title": "Images get an inner outline",
  "detail": "(1px inset, ~6–10%).",
  "why": "Stops light images bleeding into light pages, dark into dark.",
  "how": "live"
 },
 {
  "n": 40,
  "section": "Rendering and pixels",
  "title": "Continuous corners (squircles)",
  "detail": "",
  "why": "Curvature that eases in feels softer at the same radius.",
  "how": "live"
 },
 {
  "n": 41,
  "section": "Rendering and pixels",
  "title": "Concentric corners at every nesting level",
  "detail": "",
  "why": "(see 8)",
  "how": "live"
 },
 {
  "n": 42,
  "section": "Rendering and pixels",
  "title": "Bold on hover must not shift layout",
  "detail": "Reserve the bold width (a hidden bold copy in ::after).",
  "why": "Weight changes width; the row jumps.",
  "how": "live"
 },
 {
  "n": 43,
  "section": "Typography",
  "title": "Fallback-font metric overrides",
  "detail": "size-adjust, ascent-override on the fallback @font-face.",
  "why": "The font swap then moves nothing: zero layout shift.",
  "how": "habit"
 },
 {
  "n": 44,
  "section": "Typography",
  "title": "Light text on dark looks bolder",
  "detail": "Drop variable-font weight ~25–50 or add tracking in dark mode; antialiased smoothing for light-on-dark only.",
  "why": "Irradiation: light glows into dark.",
  "how": "probe"
 },
 {
  "n": 45,
  "section": "Typography",
  "title": "Hanging punctuation",
  "detail": "Opening quotes and bullets hang outside the text edge.",
  "why": "So letters, not marks, align with the column (optical alignment for prose).",
  "how": "live"
 },
 {
  "n": 46,
  "section": "Typography",
  "title": "case feature for all-caps",
  "detail": "",
  "why": "Hyphens, parentheses and @ sit too low among capitals.",
  "how": "live"
 },
 {
  "n": 47,
  "section": "Typography",
  "title": "Tracking in em, never px",
  "detail": "",
  "why": "So it scales with size.",
  "how": "habit"
 },
 {
  "n": 48,
  "section": "Typography",
  "title": "text-wrap: pretty for paragraphs, balance for headings",
  "detail": "",
  "why": "Different jobs: avoid orphans vs even lines.",
  "how": "live"
 },
 {
  "n": 49,
  "section": "Typography",
  "title": "Optical sizing on",
  "detail": "font-optical-sizing: auto with an opsz axis.",
  "why": "Small text gets sturdier shapes, large text finer ones.",
  "how": "live"
 },
 {
  "n": 50,
  "section": "Typography",
  "title": "Icon stroke follows text weight",
  "detail": "and thins in proportion as the icon grows.",
  "why": "Icons beside bold text look faint; big icons with small-icon strokes look heavy.",
  "how": "live"
 },
 {
  "n": 51,
  "section": "Colour and light",
  "title": "Layered shadows",
  "detail": "(Josh W. Comeau's shadows work): 3–5 stacked shadows, blur and offset growing, opacity falling.",
  "why": "One big blur is a smudge; layers read as ambient plus direct light.",
  "how": "live"
 },
 {
  "n": 52,
  "section": "Colour and light",
  "title": "Colour-matched shadows",
  "detail": "Tint with the surface hue, lower lightness, raise saturation.",
  "why": "Grey shadows muddy colour.",
  "how": "live"
 },
 {
  "n": 53,
  "section": "Colour and light",
  "title": "Offset scales with elevation",
  "detail": "y-offset and blur together, one ratio across the ladder.",
  "why": "A constant ratio is what makes a ladder feel physical.",
  "how": "live"
 },
 {
  "n": 54,
  "section": "Colour and light",
  "title": "Dark mode elevates with light, not shadow",
  "detail": "Lighter raised surfaces, plus a 1px inset top highlight at low alpha.",
  "why": "Shadows barely show on dark.",
  "how": "probe"
 },
 {
  "n": 55,
  "section": "Colour and light",
  "title": "Interpolate gradients in OKLCH/OKLab",
  "detail": "linear-gradient(in oklch, …).",
  "why": "sRGB interpolation goes grey between saturated colours.",
  "how": "live"
 },
 {
  "n": 56,
  "section": "Colour and light",
  "title": "Eased gradients for scrims",
  "detail": "noise on large dark gradients.",
  "why": "Linear fades show a hard edge; dark gradients band.",
  "how": "live"
 },
 {
  "n": 57,
  "section": "Colour and light",
  "title": "color-mix instead of opacity for text colour",
  "detail": "",
  "why": "Opacity varies with the ground and composites a layer.",
  "how": "live"
 },
 {
  "n": 58,
  "section": "Colour and light",
  "title": "Set color-scheme",
  "detail": "(and accent-color).",
  "why": "Otherwise scrollbars, controls and autofill stay light in a dark UI.",
  "how": "habit"
 },
 {
  "n": 59,
  "section": "Interaction feel",
  "title": "Safe triangle for submenus",
  "detail": "Keep a submenu open while the pointer travels diagonally toward it.",
  "why": "Otherwise crossing the next item closes it.",
  "how": "probe"
 },
 {
  "n": 60,
  "section": "Interaction feel",
  "title": "Tooltip warm-up and cool-down",
  "detail": "First waits ~500ms; neighbours then open instantly until the pointer is away ~300ms.",
  "why": "Exploring a toolbar shouldn't wait each time.",
  "how": "probe"
 },
 {
  "n": 61,
  "section": "Interaction feel",
  "title": "Menus open on pointerdown, with press-drag-release selection",
  "detail": "",
  "why": "Click-to-open feels slow.",
  "how": "probe"
 },
 {
  "n": 62,
  "section": "Interaction feel",
  "title": "Don't animate frequent keyboard actions",
  "detail": "(Emil Kowalski).",
  "why": "A command palette opened 50 times a day should be instant.",
  "how": "probe"
 },
 {
  "n": 63,
  "section": "Interaction feel",
  "title": "Never scale from 0",
  "detail": "start at 0.9–0.97 with opacity, transform-origin at the trigger.",
  "why": "From 0 it appears from nowhere; from the trigger it grows out of the button.",
  "how": "live"
 },
 {
  "n": 64,
  "section": "Interaction feel",
  "title": "Interruptible motion",
  "detail": "Transitions or springs that keep velocity when reversed.",
  "why": "A restarting keyframe on reverse feels broken.",
  "how": "probe"
 },
 {
  "n": 65,
  "section": "Interaction feel",
  "title": "Rubber-band at limits",
  "detail": "keep flick velocity (Vaul-style drawers).",
  "why": "A dead stop feels like a wall.",
  "how": "probe"
 },
 {
  "n": 66,
  "section": "Interaction feel",
  "title": "Spinners: delay ~150–300ms, then hold ≥ ~500ms",
  "detail": "",
  "why": "Fast loads shouldn't flash a spinner.",
  "how": "probe"
 },
 {
  "n": 67,
  "section": "Interaction feel",
  "title": "Reduced motion means a fade, not nothing",
  "detail": "",
  "why": "The state change must still be seen.",
  "how": "habit"
 },
 {
  "n": 68,
  "section": "Interaction feel",
  "title": "Exits faster than entrances",
  "detail": "(~70% of the duration).",
  "why": "The user has already moved on.",
  "how": "probe"
 },
 {
  "n": 69,
  "section": "Layout and platform",
  "title": "100dvh, not 100vh, on mobile",
  "detail": "env(safe-area-inset-*) for notches.",
  "why": "vh hides content under browser bars.",
  "how": "habit"
 },
 {
  "n": 70,
  "section": "Layout and platform",
  "title": "Inputs ≥ 16px on iOS",
  "detail": "",
  "why": "Safari zooms the page on focus otherwise.",
  "how": "live"
 },
 {
  "n": 71,
  "section": "Layout and platform",
  "title": "touch-action: manipulation",
  "detail": "and transparent tap highlights on custom buttons.",
  "why": "Removes the double-tap delay and grey flashes.",
  "how": "probe"
 },
 {
  "n": 72,
  "section": "Layout and platform",
  "title": "overscroll-behavior: contain on modals and panels",
  "detail": "",
  "why": "Scrolling to their end shouldn't scroll the page behind.",
  "how": "habit"
 },
 {
  "n": 73,
  "section": "Layout and platform",
  "title": "scroll-margin-top on anchor targets",
  "detail": "",
  "why": "A sticky header covers the heading you jumped to.",
  "how": "live"
 },
 {
  "n": 74,
  "section": "Layout and platform",
  "title": "isolation: isolate instead of z-index wars",
  "detail": "",
  "why": "Components get their own stacking context.",
  "how": "live"
 },
 {
  "n": 75,
  "section": "Layout and platform",
  "title": "Scroll shadows",
  "detail": "where content is hidden (Lea Verou's background-attachment: local trick).",
  "why": "Shows there's more without a scrollbar.",
  "how": "live"
 },
 {
  "n": 76,
  "section": "Layout and platform",
  "title": "Truncate in the middle for paths and IDs",
  "detail": "",
  "why": "The ends carry the meaning.",
  "how": "live"
 },
 {
  "n": 77,
  "section": "Layout and platform",
  "title": "Skeletons match the final layout exactly",
  "detail": "",
  "why": "Nothing jumps when content lands.",
  "how": "probe"
 }
];
