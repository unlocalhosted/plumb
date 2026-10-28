// Base UI (`@base-ui/react`, once `@base-ui-components/react`): one component per subpath (`@base-ui/react/slider`),
// parts as members (`Slider.Thumb`). Named imports from the package root bind the component by its export name.
import type { LibraryAdapter } from './adapter.js';

const module = /^@base-ui(?:-components)?\/react(?:\/([\w-]+))?$/;
// Base UI's state attributes: a flag (`data-checked`) or a value (`data-orientation="horizontal"`). The same words
// are the keys of the state object its className and style functions receive.
const flags = new Set(['checked', 'unchecked', 'indeterminate', 'disabled', 'readonly', 'required', 'valid', 'invalid', 'dirty', 'touched', 'filled', 'focused', 'focus-visible', 'open', 'closed', 'popup-open', 'pressed', 'highlighted', 'selected', 'active', 'inactive', 'dragging', 'starting-style', 'ending-style', 'anchor-hidden', 'expanded', 'swiping', 'instant', 'uncontrolled', 'nested', 'nested-dialog-open', 'has-nested-dialogs', 'limited', 'panel-open', 'visible', 'hidden', 'empty', 'multiple', 'loading', 'error', 'complete', 'dropdown', 'has-value', 'current', 'placeholder']);
const valued = new Set(['orientation', 'side', 'align', 'swipe-direction', 'activation-direction', 'type', 'index', 'instant', 'position']);
export const baseUi: LibraryAdapter = {
  family: 'base-ui',
  capabilities: ['usage', 'states'],
  state(attribute, value) {
    const name = attribute.replace(/^data-/, '');
    if (value !== null && valued.has(name)) return `${name}=${value}`;
    return flags.has(name) || valued.has(name) ? name : null;
  },
  owns: specifier => module.test(specifier),
  meaning(specifier, imported) {
    if (!module.test(specifier) || imported === '*' || imported === 'default') return { component: null, part: null };
    return { component: imported, part: null };
  },
};
