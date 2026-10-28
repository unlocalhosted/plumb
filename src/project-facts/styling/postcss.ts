import { stylingFamily } from './family.js';

/** PostCSS on its own (a postcss.config.* beside the app): stylesheets are read as authored; what a plugin generates is not. */
export const stylingPostcss = stylingFamily({
  id: 'postcss', label: 'PostCSS', packages: /^$/, configs: ['postcss.config.js', 'postcss.config.cjs', 'postcss.config.mjs', 'postcss.config.ts', 'postcss.config.json', '.postcssrc', '.postcssrc.json', '.postcssrc.js'],
  support: 'partial', judged: 'stylesheets as authored', skipped: 'declarations a PostCSS plugin generates (nesting and custom media are read as written)', next: 'nothing to do; plumb reads your source CSS',
});
