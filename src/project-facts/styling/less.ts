import { stylingFamily } from './family.js';

/** Less: plumb reads .css files only; .less sources are found and skipped. */
export const stylingLess = stylingFamily({
  id: 'less', label: 'Less', packages: /^less$/, imports: /\.less$/, files: /\.less$/,
  support: 'unsupported', skipped: '.less sources', next: 'nothing to do; plumb reads the .css files it finds',
});
