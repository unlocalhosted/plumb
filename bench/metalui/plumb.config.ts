import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineDecisions } from '../../dist/index.js';

export default {
  css: 'apps/docs/src/styles.css',
  source: ['apps/docs/src/**/*.{tsx,jsx,ts,js,css}'],
  decisions: {
    spacing: {
      identity: 'value', callers: ['primitive', 'semantic'],
      // Only the shared layout ladder and semantic gaps, never recipe geometry.
      from: async () => {
        const file = fileURLToPath(new URL('../../../metalui/tokens/tokens.json', import.meta.url));
        const text = await readFile(file, 'utf8');
        const tokens = JSON.parse(text);
        const line = (key: string) => text.slice(0, text.indexOf(`"${key}"`)).split('\n').length;
        const space = tokens.foundations.space;
        const layout = tokens.foundations.layout;
        return defineDecisions([
          ...space.map((amount: number) => ({
            family: 'spacing' as const, name: `--spacing-mu-space-${amount}`, value: `var(--mu-space-${amount})`,
            refs: [`var(--spacing-mu-space-${amount})`, `var(--mu-space-${amount})`], tier: 'primitive' as const,
            why: tokens.foundations.$use ?? '', source: { file, line: line('space') },
          })),
          ...Object.entries(layout.gap).map(([name]) => ({
            family: 'spacing' as const, name: `--spacing-mu-${name}`, value: `var(--mu-layout-gap-${name})`,
            refs: [`var(--spacing-mu-${name})`, `var(--mu-layout-gap-${name})`], tier: 'semantic' as const,
            why: layout.gap.$use ?? layout.$use ?? '', source: { file, line: line(name) },
          })),
        ]);
      },
    },
  },
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
