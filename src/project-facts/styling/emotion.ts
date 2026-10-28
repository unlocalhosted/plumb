import { stylingFamily } from './family.js';

/** Emotion: css prop and styled() objects; found at the import site and skipped. */
export const stylingEmotion = stylingFamily({
  id: 'emotion', label: 'Emotion', packages: /^@emotion\/.+$/, imports: /^@emotion\//,
  support: 'unsupported', skipped: 'css`` templates, css prop objects and styled() calls', next: 'nothing to do; plumb skips it',
});
