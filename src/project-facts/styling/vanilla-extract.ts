import { stylingFamily } from './family.js';

/** vanilla-extract: styles in .css.ts modules, compiled at build; found and skipped. */
export const stylingVanillaExtract = stylingFamily({
  id: 'vanilla-extract', label: 'vanilla-extract', packages: /^@vanilla-extract\/.+$/, imports: /^@vanilla-extract\/|\.css\.ts$/,
  support: 'unsupported', skipped: 'style() and theme contracts in .css.ts files', next: 'nothing to do; plumb skips it',
});
