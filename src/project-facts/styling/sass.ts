import { stylingFamily } from './family.js';

/** Sass: plumb reads .css files only; .scss/.sass sources are found and skipped. */
export const stylingSass = stylingFamily({
  id: 'sass', label: 'Sass', packages: /^(?:sass|sass-embedded|node-sass)$/, imports: /\.s[ac]ss$/, files: /\.s[ac]ss$/,
  support: 'unsupported', skipped: '.scss and .sass sources', next: 'nothing to do; plumb reads the .css files it finds',
});
