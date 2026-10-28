import { stylingFamily } from './family.js';

/** CSS Modules: `*.module.css` imported as an object. The declarations are read as stylesheets; the mapping from `styles.x` to an element is not followed. */
export const stylingCssModules = stylingFamily({
  id: 'css-modules', label: 'CSS Modules', packages: /^$/, imports: /\.module\.(?:css|scss|sass|less)$/, files: /\.module\.(?:css|scss|sass|less)$/,
  support: 'partial', judged: 'declarations in *.module.css, as stylesheets', skipped: 'class names applied through the styles object are not traced to elements', next: 'nothing to do; plumb reads the module files',
});
