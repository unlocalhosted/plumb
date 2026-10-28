import { stylingFamily } from './family.js';

/** StyleX: styles as compiled objects; found and skipped. */
export const stylingStylex = stylingFamily({
  id: 'stylex', label: 'StyleX', packages: /^@stylexjs\/.+$/, imports: /^@stylexjs\//,
  support: 'unsupported', skipped: 'stylex.create() objects', next: 'nothing to do; plumb skips it',
});
