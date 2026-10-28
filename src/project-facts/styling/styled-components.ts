import { stylingFamily } from './family.js';

/** styled-components: styles in tagged templates; found at the import site and skipped. */
export const stylingStyledComponents = stylingFamily({
  id: 'styled-components', label: 'styled-components', packages: /^styled-components$/, imports: /^styled-components$/,
  support: 'unsupported', skipped: 'styled`` and css`` templates', next: 'nothing to do; plumb skips it',
});
