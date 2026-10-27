/* ─────────────────────────────────────────────────────────
 * CRAFT FACETS · React Plumber overlay
 *
 * The primitive the rule hierarchy stands on (docs/briefs/craft-hierarchy.md): what a finding is about. A facet is
 * the thing a person would say is being changed ("its side padding", "its text colour"), not a CSS property. Two
 * findings on one element conflict exactly when their facets meet; the arbitration (verdict.js) keeps one.
 *
 *  facetOf(prop)        a CSS property → its facet, or null
 *  facetOfClass(cls)    a utility (variants stripped) → its facet, or null
 *  TIER                 0 access · 1 legibility · 2 theme · 3 craft; a higher tier never loses a facet to a lower one
 *  TIERS                tiers of the server's findings by rule, until the server writes its own
 *
 * `color` includes opacity as it affects text: faded text, low contrast and disabled-by-opacity are one facet.
 * ───────────────────────────────────────────────────────── */

// advisory: a judgement of taste, shown softly and never failing a run (docs/briefs/craft-hard-rules.md)
export const TIER = { access: 0, legibility: 1, theme: 2, craft: 3, advisory: 4 };

// facet → [props, utility bases]
const TABLE = {
  'padding-x': [['padding-left', 'padding-right', 'padding-inline', 'padding-inline-start', 'padding-inline-end'], ['p', 'px', 'pl', 'pr', 'ps', 'pe']],
  'padding-y': [['padding-top', 'padding-bottom', 'padding-block'], ['p', 'py', 'pt', 'pb']],
  'margin-x': [['margin-left', 'margin-right', 'margin-inline'], ['m', 'mx', 'ml', 'mr', 'ms', 'me']],
  'margin-y': [['margin-top', 'margin-bottom', 'margin-block'], ['m', 'my', 'mt', 'mb']],
  gap: [['gap', 'row-gap', 'column-gap'], ['gap', 'gap-x', 'gap-y', 'space-x', 'space-y']],
  radius: [['border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius', 'corner-shape'], ['rounded', 'corner']],
  size: [['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'inline-size', 'block-size'], ['w', 'h', 'size', 'min-w', 'max-w', 'min-h', 'max-h']],
  color: [['color', 'opacity'], ['opacity']],
  background: [['background', 'background-color', 'background-image'], ['bg']],
  border: [['border', 'border-color', 'border-width', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'outline', 'outline-color', 'outline-width', 'stroke-width'], ['border', 'outline', 'ring', 'stroke']],
  shadow: [['box-shadow'], ['shadow']],
  'font-size': [['font-size'], []],
  'font-weight': [['font-weight', '-webkit-font-smoothing'], ['antialiased', 'subpixel-antialiased']],
  'line-height': [['line-height'], ['leading']],
  'letter-spacing': [['letter-spacing'], ['tracking']],
  'font-features': [['font-variant-numeric', 'font-feature-settings', 'font-optical-sizing', 'font-variation-settings'], ['tabular-nums', 'proportional-nums', 'lining-nums', 'oldstyle-nums']],
  'text-flow': [['text-overflow', 'text-wrap', 'text-indent', 'white-space', 'hanging-punctuation'], ['truncate', 'text-balance', 'text-pretty', 'text-wrap', 'text-nowrap', 'indent', 'whitespace', 'text-ellipsis', 'text-clip']],
  transform: [['transform', 'translate', 'scale', 'rotate', 'animation'], ['translate', 'scale', 'rotate', 'animate']],
  stacking: [['z-index', 'isolation'], ['z', 'isolate']],
  motion: [['transition', 'transition-property', 'transition-duration', 'transition-timing-function', 'animation', 'animation-duration'], ['transition', 'duration', 'ease', 'delay', 'animate']],
  align: [['align-items', 'justify-content', 'justify-items', 'align-self', 'place-items'], ['items', 'justify', 'self', 'place']],
  interaction: [['touch-action', '-webkit-tap-highlight-color', 'user-select'], ['touch', 'select']],
  'text-box': [['text-box-trim', 'text-box-edge'], []],
  scroll: [['overflow', 'overflow-x', 'overflow-y', 'scrollbar-gutter', 'scroll-margin-top', 'overscroll-behavior'], ['overflow', 'scroll-mt', 'overscroll']],
};
const BY_PROP = new Map();
for (const [facet, [props]] of Object.entries(TABLE)) for (const p of props) BY_PROP.set(p, facet);
const SIZES = /^text-(?:xs|sm|base|lg|xl|\dxl|\[\d[\d.]*(?:px|rem|em)\])$/;

export function facetOf(prop) { return BY_PROP.get(prop) ?? null; }

export function facetOfClass(cls) {
  const base = String(cls).split(':').at(-1).replace(/^!|!$/g, '').replace(/^-/, '');
  if (/^text-/.test(base)) return SIZES.test(base) || /^text-(?:body|small|caption|title|display)/.test(base) ? 'font-size' : /^text-(?:left|right|center|justify|start|end|balance|pretty|wrap|nowrap|ellipsis|clip)$/.test(base) ? 'text-flow' : 'color';
  if (/^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d)/.test(base)) return 'font-weight';
  if (/^\[([\w-]+):/.test(base)) return facetOf(/^\[([\w-]+):/.exec(base)[1]);
  let best = null, len = -1;
  for (const [facet, [, bases]] of Object.entries(TABLE)) for (const b of bases) if ((base === b || base.startsWith(b + '-')) && b.length > len) (best = facet), (len = b.length);
  return best;
}

// The server's findings, by rule prefix or habit id: their tier and facets, until the server writes its own.
export const TIERS = [
  [/^habits\/(?:hover-gate|focus-outline|reduced-motion-fade|viewport-dynamic|safe-area-fallback|logical-inline)$/, TIER.access],
  [/^habits\/(?:font-metrics|real-quotes|transition-named|no-ease-in|composited-motion)$/, TIER.legibility],
  [/^habits\//, TIER.theme],
  [/^(?:provenance|spacing|radius|color|type|elevation|z|motion|ownership|existence)\b/, TIER.theme],
];
export function tierOf(rule) { for (const [re, t] of TIERS) if (re.test(rule ?? '')) return t; return TIER.theme; }
