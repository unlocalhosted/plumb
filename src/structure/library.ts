// What a component imported from a known library is, by role. The table behind `facts.source(el).role`: it lets a
// rule know the tooltip provider, the menu that ships a safe triangle, the icon from a library, without a probe.
export type Role = 'menu' | 'submenu' | 'tooltip' | 'tooltip-provider' | 'dialog' | 'popover' | 'drawer' | 'palette' | 'skeleton' | 'spinner' | 'icon' | 'motion';
export interface Resolved { library: string; role: Role | null }

/** `name` is the export the element is (Provider, Tooltip, TooltipProvider); `member` the part after it (Tooltip.Provider). */
type Roles = (name: string, member: string | null) => Role | null;
const last = (name: string, member: string | null) => member ?? name;

const tooltip: Roles = (name, member) => (/Provider$/.test(last(name, member)) ? 'tooltip-provider' : 'tooltip');
const menu: Roles = (name, member) => (/Sub/.test(last(name, member)) ? 'submenu' : 'menu');
const only = (role: Role): Roles => () => role;

// by import source
const sources: { match: RegExp; library: string; roles: (m: RegExpExecArray) => Roles | null }[] = [
  { match: /^@radix-ui\/react-tooltip$/, library: 'radix', roles: () => tooltip },
  { match: /^@radix-ui\/react-(?:dropdown-menu|context-menu|menubar)$/, library: 'radix', roles: () => menu },
  { match: /^@radix-ui\/react-(?:dialog|alert-dialog)$/, library: 'radix', roles: () => only('dialog') },
  { match: /^@radix-ui\/react-(?:popover|hover-card)$/, library: 'radix', roles: () => only('popover') },
  // Base UI: the package root or one component's path
  { match: /^@base-ui(?:-components)?\/react(?:\/([\w-]+))?$/, library: 'base-ui', roles: () => (name, member) => {
    const component = name.replace(/^./, c => c.toLowerCase());
    if (/^tooltip/.test(component)) return tooltip(name, member);
    if (/^menu/.test(component)) return /Submenu/.test(last(name, member)) ? 'submenu' : 'menu';
    if (/^(?:dialog|alertDialog)/.test(component)) return 'dialog';
    if (/^(?:popover|previewCard)/.test(component)) return 'popover';
    return null;
  } },
  { match: /^@headlessui\/react$/, library: 'headlessui', roles: () => name => (/^Menu/.test(name) ? 'menu' : /^Dialog/.test(name) ? 'dialog' : /^Popover/.test(name) ? 'popover' : null) },
  { match: /^vaul$/, library: 'vaul', roles: () => only('drawer') },
  { match: /^cmdk$/, library: 'cmdk', roles: () => only('palette') },
  { match: /^@floating-ui\/react(?:-dom)?$/, library: 'floating-ui', roles: () => only('popover') },
  { match: /^lucide-react(?:\/.*)?$/, library: 'lucide', roles: () => only('icon') },
  { match: /^@heroicons\/react(?:\/.*)?$/, library: 'heroicons', roles: () => only('icon') },
  { match: /^react-icons(?:\/.*)?$/, library: 'react-icons', roles: () => only('icon') },
  { match: /^(?:motion\/react|framer-motion|motion)$/, library: 'motion', roles: () => only('motion') },
];

// shadcn/ui keeps its components in your own files: components/ui/<name>
const shadcn: Record<string, Roles> = {
  tooltip, 'dropdown-menu': menu, 'context-menu': menu, menubar: menu, dialog: only('dialog'), 'alert-dialog': only('dialog'), sheet: only('dialog'),
  popover: only('popover'), 'hover-card': only('popover'), drawer: only('drawer'), command: only('palette'), skeleton: only('skeleton'),
};

/** The library and role of an element imported from `source` as `name` (with `member` after it), or null when the import is nothing we know. */
export function libraryOf(source: string, name: string, member: string | null): Resolved | null {
  for (const entry of sources) {
    const m = entry.match.exec(source);
    if (m) return { library: entry.library, role: entry.roles(m)?.(name, member) ?? null };
  }
  const ui = /(?:^|\/)components\/ui\/([\w-]+)(?:\.[jt]sx?)?$/.exec(source);
  if (ui && shadcn[ui[1]!]) return { library: 'shadcn', role: shadcn[ui[1]!]!(name, member) };
  return null;
}
