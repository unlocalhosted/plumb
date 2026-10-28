// Radix (`@radix-ui/react-<component>`, the unified `radix-ui`, `@radix-ui/themes`): a namespace import names the
// part as a member (`Popover.Content`); a named import carries the component as a prefix (`PopoverContent`) or is
// the part itself (`Content`); the bare component name is its root.
import type { LibraryAdapter } from './adapter.js';
import { componentName, partOf } from './adapter.js';

const primitive = /^@radix-ui\/react-([\w-]+)$/, unified = /^radix-ui$/, themes = /^@radix-ui\/themes$/;
// Packages that export one element, not a Root with parts: `Slot` is the element itself.
const single = new Set(['slot', 'portal', 'visually-hidden', 'presence', 'primitive', 'direction', 'label', 'separator', 'aspect-ratio', 'toggle']);
export const radix: LibraryAdapter = {
  family: 'radix',
  capabilities: ['usage'],
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
