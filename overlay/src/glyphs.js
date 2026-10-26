// Plumb's glyphs, drawn with a drafting pen: one constant 1px line at every size, square ends, sharp joins.
//
// Rules, so the eleven read as one hand:
//   - 24-unit artboard; live area 3 to 21; straight strokes on half units so the 1px line lands on a pixel
//   - the stroke never scales (vector-effect: non-scaling-stroke): a 14px glyph and a 48px glyph draw the same pen
//   - curves meet their straights tangentially; corners use one radius family (2.5, or 8.5 for the measured arc)
//   - fills only where a part is solid by meaning: a sampled colour, a cast shadow, a control point, the bob
//   - each glyph draws the property itself, never an action (no arrows, cursors, locks or toggles)

export const GLYPHS = {
  // two faces and the dimension line spanning them
  spacing: '<path d="M4.5 5v14M19.5 5v14"/><path d="M8 12h8M8 9.5v5M16 9.5v5"/>',

  // a measured corner arc and its drafting centre mark
  radius: '<path d="M4.5 19.5V13a8.5 8.5 0 0 1 8.5-8.5h6.5"/><path d="M13 11v4M11 13h4"/>',

  // a capital A on its baseline
  type: '<path d="M5.75 19.5 12 4.5l6.25 15"/><path d="M8.25 14h7.5"/>',

  // a paint chip: the colour, and its label band
  color: '<path class="fill" d="M8.6 4.6h6.8a1.9 1.9 0 0 1 1.9 1.9v8H6.7v-8a1.9 1.9 0 0 1 1.9-1.9z"/><path d="M8.5 3.75h7a2.75 2.75 0 0 1 2.75 2.75v11a2.75 2.75 0 0 1-2.75 2.75h-7a2.75 2.75 0 0 1-2.75-2.75v-11A2.75 2.75 0 0 1 8.5 3.75zM5.75 15.25h12.5"/>',

  // elevation: a card lifted off the ground, and the shadow under it
  shadow: '<rect x="4.5" y="4.5" width="15" height="6" rx="1.5"/><rect class="fill soft" x="6" y="14.25" width="12" height="2.5" rx="1.25"/><path d="M2.5 19.5h19"/>',

  // elevation: three slabs at three heights
  z: '<path d="M3.5 6h10M7 12h10M10.5 18h10"/>',

  // a timing curve and its two control handles
  motion: '<path d="M4.5 19.5C12 19.5 12 4.5 19.5 4.5"/><path d="M4.5 19.5h6M19.5 4.5h-6"/><circle class="fill" cx="10.5" cy="19.5" r="1.25"/><circle class="fill" cx="13.5" cy="4.5" r="1.25"/>',

  // the plumb line: a team's rule for how things hang, true against the vertical beside it
  habit: '<path d="M8.5 3.5h7M12 3.5V12"/><path class="fill" d="M12 12l3 4-3 4.5L9 16z"/><path d="M19.5 4v16" stroke-dasharray="1.5 1.5"/>',

  // a component's frame, and a line from outside crossing into what it owns
  ownership: '<rect x="7.5" y="7.5" width="12.5" height="12.5" rx="2.5"/><path d="M3.5 3.5l10.25 10.25"/><circle class="fill" cx="13.75" cy="13.75" r="1.5"/>',

  // a component's outline pieced from two halves that do not meet
  imitation: '<path d="M12 5H7a2.5 2.5 0 0 0-2.5 2.5v9A2.5 2.5 0 0 0 7 19h5M12 6.5h5a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5h-5"/>',

  // craft: two rounded frames sharing one centre, the concentric corner a mentor points at
  craft: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><rect x="8" y="8" width="8" height="8" rx="1.5"/><path class="fill" d="M3.5 7.5v-4h4L3.5 7.5z"/>',

  // a rule with nothing in it
  existence: '<path d="M9.5 4.5H9A2.5 2.5 0 0 0 6.5 7v2.5c0 1.4-.9 2.5-2.25 2.5 1.35 0 2.25 1.1 2.25 2.5V17A2.5 2.5 0 0 0 9 19.5h.5M14.5 4.5h.5A2.5 2.5 0 0 1 17.5 7v2.5c0 1.4.9 2.5 2.25 2.5-1.35 0-2.25 1.1-2.25 2.5V17a2.5 2.5 0 0 1-2.5 2.5h-.5"/>',
};

export const GLYPH_CSS = `
  .g { flex: none; overflow: visible; }
  .g path, .g rect, .g circle { fill: none; stroke: currentColor; stroke-width: 1px; vector-effect: non-scaling-stroke; stroke-linecap: butt; stroke-linejoin: miter; }
  .g .fill { fill: currentColor; stroke: none; }
  .g .soft { fill-opacity: .4; }
`;

export const glyph = (family, cls = '') =>
  `<svg class="g ${cls}" viewBox="0 0 24 24" aria-hidden="true" shape-rendering="geometricPrecision">${GLYPHS[family]}</svg>`;
