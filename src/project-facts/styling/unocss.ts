import { stylingFamily } from './family.js';

/** UnoCSS: an atomic engine with its own class vocabulary; found and skipped. */
export const stylingUnocss = stylingFamily({
  id: 'unocss', label: 'UnoCSS', packages: /^(?:unocss|@unocss\/.+)$/, imports: /^(?:unocss|virtual:uno\.css|@unocss\/)/, configs: ['uno.config.ts', 'uno.config.js', 'uno.config.mjs', 'unocss.config.ts', 'unocss.config.js'],
  support: 'unsupported', skipped: 'UnoCSS utilities and their generated CSS', next: 'nothing to do; plumb skips it',
});
