// Radix (`@radix-ui/react-<component>`, the unified `radix-ui`, `@radix-ui/themes`): a namespace import names the
// part as a member (`Popover.Content`); a named import carries the component as a prefix (`PopoverContent`) or is
// the part itself (`Content`); the bare component name is its root.
import type { LibraryAdapter } from './adapter.js';
import { componentName, partOf } from './adapter.js';

const primitive = /^@radix-ui\/react-([\w-]+)$/, unified = /^radix-ui$/, themes = /^@radix-ui\/themes$/;
// Packages that export one element, not a Root with parts: `Slot` is the element itself.
const single = new Set(['slot', 'portal', 'visually-hidden', 'presence', 'primitive', 'direction', 'label', 'separator', 'aspect-ratio', 'toggle']);
// Radix states: `data-state` carries the value (open, checked, on, active, delayed-open…); placement and orientation
// are valued attributes; the rest are flags.
const valued = new Set(['state', 'side', 'align', 'orientation', 'swipe-direction', 'swipe', 'motion']);
const flags = new Set(['disabled', 'highlighted', 'placeholder', 'invalid', 'valid', 'selected', 'checked', 'readonly', 'required', 'active', 'inactive', 'hidden', 'visible', 'open', 'closed']);
export const radix: LibraryAdapter = {
  family: 'radix',
  capabilities: ['usage', 'states'],
  state(attribute, value) {
    const name = attribute.replace(/^data-/, '');
    if (name === 'state') return value;
    if (valued.has(name)) return value === null ? name : `${name}=${value}`;
    return flags.has(name) ? name : null;
  },
  owns: specifier => primitive.test(specifier) || unified.test(specifier) || themes.test(specifier),
  meaning(specifier, imported) {
    const match = primitive.exec(specifier);
    if (match) {
      const component = componentName(match[1]!);
      if (imported === '*' || imported === 'default') return { component, part: null };
      // `Root`, `Trigger`, `Content` are parts of this package's component; `PopoverContent` the same with its prefix.
      return { component, part: partOf(imported, component, single.has(match[1]!) ? null : 'Root') };
    }
    if (imported === '*' || imported === 'default') return { component: null, part: null };
    // `radix-ui` exports each component as a namespace (`Popover.Content`); Themes exports styled components by name.
    return { component: imported, part: null };
  },
};
