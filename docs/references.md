# References

## 2026-11-10 · BoardUI typography and colour (shared by the owner)
- What: [BoardUI typography](https://www.boardui.com/components/typography), [BoardUI colour](https://www.boardui.com/components/color).
- Why: the owner felt it is "much better and scalable system for large scale" than the token system plumber suggests today.
- What it changed (corrected 2026-11-12: it is evidence to improve our spec, not a template): plumber's own token spec takes its weight axis, colour-out-of-type, three layers, fixed state words, surface levels, one-colour brand and one dark block; our derived roles and names stay. First pass wrongly moved to three layers (primitives → `category/role/state` semantic tokens → components), a named type ladder crossed with weight, colour kept out of type, one accent ramp from one colour.
- Used in: docs/design/token-spec.md, journey entry "Token spec follows BoardUI".

## 2026-11-12 · Defensive CSS tips (shared by the owner)
- What: [defensivecss.dev/tips](https://defensivecss.dev/tips/), 25 tips for CSS that survives content you don't control.
- Why: "lets improve our engine to bring these tips as suggestions".
- What it changed: each tip is weighed as a plumber rule, one at a time. First: Image distortion, now principle 78 (a picture is cropped to its box, never stretched).
- Used in: journey entry "Defensive CSS tips become suggestions: stretched pictures first".

## 2026-11-12 · Defensive CSS "Image distortion" demo (shared by the owner, two screenshots)
- What: the tip's own demo on defensivecss.dev: one photo of round pastries in a box with a "Resize me" edge and a "Toggle Defensive" checkbox; off, the pastries are pulled thin; on, they are cropped and round.
- Why: "we dont see the issue clearly in this component … in this before and after you can see the value … if you stretch the card itself to show how stretch to fill doesn't look good on small cards".
- What it changed: principle 78's demo screen. Taken: a large subject whose shape the eye knows, and a box the viewer resizes. Kept ours: a real product card (a trip day), plumber's switch, marks and fix. Not copied: its photo, layout, checkbox or words.
- Used in: overlay/showcase/src/principles/screens/78-detour-saved.jsx; journey entry "Rule 78's demo: a card you resize".

