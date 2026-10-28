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
  capabilities: ['usage', 'states', 'structure', 'owned'],
  // Variables Base UI sets at runtime on its parts (positioners, popups, panels, tabs indicator, toasts, scroll areas,
  // sliders), and the components that configure it.
  owned: {
    variables: /^--(?:anchor-(?:width|height)|available-(?:width|height)|transform-origin|popup-(?:width|height)|positioner-(?:width|height)|active-tab-(?:left|right|top|bottom|width|height)|collapsible-panel-(?:width|height)|accordion-panel-(?:width|height)|nested-dialogs|input-container-width|slider-[\w-]+|toast-[\w-]+|scroll-area-[\w-]+)$/,
    providers: /(?:^|\.)(?:[A-Z]\w*Provider|Provider)$/,
  },
  // `Popover.Portal` renders its subtree under body; `render` replaces the library's element with the user's.
  structure: { portal: /^Portal$/, render: ['render'], role(component, part) {
    const name = component.replace(/^./, char => char.toLowerCase()), last = part ?? component;
    if (/^tooltip/.test(name)) return /Provider$/.test(last) ? 'tooltip-provider' : 'tooltip';
    if (/^menu/.test(name)) return /Submenu/.test(last) ? 'submenu' : 'menu';
    if (/^(?:dialog|alertDialog)/.test(name)) return 'dialog';
    if (/^(?:popover|previewCard)/.test(name)) return 'popover';
    return null;
  } },
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
