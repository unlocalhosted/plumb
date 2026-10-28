// Base UI (`@base-ui/react`, once `@base-ui-components/react`): one component per subpath (`@base-ui/react/slider`),
// parts as members (`Slider.Thumb`). Named imports from the package root bind the component by its export name.
import type { LibraryAdapter } from './adapter.js';

const module = /^@base-ui(?:-components)?\/react(?:\/([\w-]+))?$/;
export const baseUi: LibraryAdapter = {
  family: 'base-ui',
  capabilities: ['usage'],
  owns: specifier => module.test(specifier),
  meaning(specifier, imported) {
    if (!module.test(specifier) || imported === '*' || imported === 'default') return { component: null, part: null };
    return { component: imported, part: null };
  },
};
