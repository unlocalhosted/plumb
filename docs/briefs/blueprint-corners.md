# Blueprint: the corner cases

Step 1 of the reliability pass, 2026-10-14: every way a real page can break the blueprint, before any of it is
built into the demo. Each line says what the blueprint must do. "demo" marks the ones built into
`overlay/demo/src/App.jsx` under `#corners` and proven in `e2e/blueprint-corners.test.mjs`; the rest are known limits.

## Words (greek)

1. A line with mixed inline weight (`plain <b>bold</b> <em>em</em>`): one bar per inline run, the bold one solid, no gap between runs. demo
2. A paragraph that wraps: one bar per line box, each the line's own width. demo
3. Truncated text (`truncate`): the bar is the visible line box, never the full string. demo
4. Text in `<input>`, `<textarea>`, `<select>`: no bar; the control's own text stays white so the form still reads. demo
5. `contenteditable`: a bar like any text, caret white. demo
6. Pseudo-element text (`::before { content }`): painted transparent like the element's own words; no bar (it is not a text node). demo
7. Text inside `<svg>` (`<text>`): no bar; the svg is a plate. demo
8. Tiny text (9px): bar never under 3px. demo
9. `<pre>` / `<code>` blocks: a bar per line. limit: verified by eye only
10. Vertical writing modes, RTL: untested. limit

## Plates

11. An inline `<svg>` in a button: the button keeps its outline, the icon is a hatched plate, its paths hidden, and none of its paths is read or badged. demo
12. A standalone `<svg>` with a `fill` and a `<path>`: plate; no mark inside it. demo
13. `<img>`, `<canvas>`, `<video>`, `<iframe>`: faint plate at 0.18. demo (img, canvas)
14. CSS `background-image` on a hero: cleared. demo

## Hidden and empty

15. `display: none`, `visibility: hidden`, zero size, a closed `<details>`: no bar, no mark, no wash, no badge. demo
16. An element with `gap` but one child: no dimension, a dot if it drifts. demo
17. Info-level findings (a runtime value): no break, no wash, not in the causes. demo

## Nesting and density

18. Drift inside drift (card with off padding holding a button with off radius): both marked; the inner is washed only if warmer; badges step clear. demo
19. A dense grid of 36 cells, each with three drifts: 108 breaks, 36 badges, and the rails carry one tick for the repeated gap, not 36. demo
20. The same JSX site rendered four times (a list): one server reading, four sets of marks. demo
21. A page-sized wrapper with drift: its wash would paint the whole screen; a wash is capped to elements under 60% of the view. demo
22. Deeply nested containers (10 levels): the per-element ink never touches an inherited property on a container, so entry stays cheap. measured on algorecall

## Position and clipping

23. `position: absolute` badge in a corner: its break sits at its real place. demo
24. A transformed (scaled) element: geometry follows the transformed box. demo
25. `position: sticky` / `fixed` header: marks follow it on scroll. limit: eye
26. An inner scroll container: only lines intersecting the view are read; marks of lines scrolled out of the container are not drawn outside it. demo
27. Overlapping absolute layers (an open dropdown): both read. limit: eye

## Runtime and change

28. `style={{ marginLeft: k * 13 }}`: a step break with the engine's step verdict; `width: \`${…}%\``: info, nothing drawn. demo
29. Hold D on a page with runtime values: only numeric drift with a token near it moves. demo
30. The page mutates while on: a removed element's marks go without error; an added element is inked and barred within a frame or two; readings arrive for it. demo
31. A write while on: the mark leaves on re-read. covered by blueprint.test.mjs
32. Rapid toggling, toggling mid-sweep, resize while on, reduced motion. covered by blueprint.test.mjs

## Performance budgets (same demo, 1200×1400)

33. Entry to count under 6 s on the dense demo; no frame over 500 ms after the first; the first marks frame under 400 ms. demo
34. Leaving restores every attribute and inline style exactly. demo

## Known limits, written down rather than hidden

- Shadow DOM inside the host page is not traversed: no bars, no marks inside it.
- `<iframe>` content is a plate; nothing inside it is read.
- Marks are drawn in a fixed layer above the page, so a mark for an element inside a transformed or clipped ancestor is placed by its bounding box and is not clipped by the ancestor.
