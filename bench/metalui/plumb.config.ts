export default {
  css: 'apps/docs/src/styles.css',
  source: ['apps/docs/src/**/*.{tsx,jsx,ts,js,css}'],
  // Exact selector hooks only; no mu-*, ed-*, xr-* or block-* exemptions.
  markers: [
    'mu-tooltip', 'mu-tooltip-key', // tooltip.spec.ts; no standalone paint.
    'mu-dialog-title', // xray-dialog-handoff.spec.ts title selector.
    'mu-palette-status', // xray-palette-code.spec.ts status lookup.
    'is-flat', 'is-drop', // xray-switch[-er]-editing.spec.ts state selectors.
    'library-card-label', // component-catalog-transitions.spec.ts label lookup.
    'part-dot-display', // catalog-transition.ts specimen lookup.
    'xr-ib-glyph', // xray-icon-button-editing.spec.ts SVG lookup.
    'xr-slider-vars', // xray-slider-handoff.spec.ts inline-variable host.
  ],
};
