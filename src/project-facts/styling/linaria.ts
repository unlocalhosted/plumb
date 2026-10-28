import { stylingFamily } from './family.js';

/** Linaria: zero-runtime CSS-in-JS, extracted at build; found at the import site and skipped. */
export const stylingLinaria = stylingFamily({
  id: 'linaria', label: 'Linaria', packages: /^@linaria\/.+$/, imports: /^@linaria\//,
  support: 'unsupported', skipped: 'css`` and styled`` templates Linaria extracts', next: 'nothing to do; plumb skips it',
});
