import { stylingFamily } from './family.js';

/** Panda CSS: styles written in TS, generated at build; found and skipped. */
export const stylingPanda = stylingFamily({
  id: 'panda', label: 'Panda CSS', packages: /^@pandacss\/.+$/, imports: /^(?:@pandacss\/|(?:\.\.?\/)*styled-system\/)/, configs: ['panda.config.ts', 'panda.config.js', 'panda.config.mjs'],
  support: 'unsupported', skipped: 'css() and recipe styles Panda generates', next: 'nothing to do; plumb skips it',
});
