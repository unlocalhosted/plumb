// shadcn/ui: the generated files under the `ui` alias of components.json are the app's own components. An import
// from `@/components/ui/dialog` binds `Dialog` (the root) and `DialogContent` (the part `Content`).
import type { Context } from '../detector.js';
import type { LibraryAdapter } from './adapter.js';
import { componentName, partOf } from './adapter.js';
import type { Role } from '../../structure/library.js';

export interface ShadcnConfig {
  style: string | null; cssVariables: boolean | null; baseColor: string | null; iconLibrary: string | null; css: string | null;
  aliases: Record<string, string>;
}
/** components.json as the adapter reads it; null when absent or unreadable (the detector keeps the evidence). */
export function shadcnConfig(ctx: Context): ShadcnConfig | null {
  const text = ctx.read('components.json');
  if (typeof text !== 'string') return null;
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    const tailwind = (raw.tailwind ?? {}) as Record<string, unknown>, aliases = (raw.aliases ?? {}) as Record<string, unknown>;
    const string = (value: unknown) => typeof value === 'string' ? value : null;
    return { style: string(raw.style), cssVariables: typeof tailwind.cssVariables === 'boolean' ? tailwind.cssVariables : null, baseColor: string(tailwind.baseColor), iconLibrary: string(raw.iconLibrary), css: string(tailwind.css),
      aliases: Object.fromEntries(Object.entries(aliases).flatMap(([key, value]) => typeof value === 'string' ? [[key, value]] : [])) };
  } catch { return null; }
}

/** The import prefixes that reach the ui folder: the `ui` alias, else `<components alias>/ui`, else `@/components/ui`. */
export function uiAliases(ctx?: Context): string[] {
  const config = ctx ? shadcnConfig(ctx) : null, aliases = config?.aliases ?? {};
  const out = new Set<string>();
  if (aliases.ui) out.add(aliases.ui);
  if (aliases.components) out.add(`${aliases.components}/ui`);
  if (!out.size) out.add('@/components/ui');
  return [...out];
}

const generated = (specifier: string, ctx?: Context) => {
  for (const alias of uiAliases(ctx)) if (specifier.startsWith(`${alias}/`)) return specifier.slice(alias.length + 1).replace(/\.[jt]sx?$/, '');
  const relative = /(?:^|\/)components\/ui\/([\w-]+)(?:\.[jt]sx?)?$/.exec(specifier);
  return relative?.[1] ?? null;
};
// shadcn's own attributes: `data-slot` names the part (identity, not a state); `data-size`/`data-variant` carry the
// chosen variant; the Radix states underneath are the Radix adapter's. Its components wrap Radix, so `asChild`
// replaces the element and `DialogContent` manages focus; `*Provider` configures it; it sets no variables of its own.
const roles: Record<string, (part: string | null, component: string) => Role | null> = {
  Tooltip: part => /Provider$/.test(part ?? '') ? 'tooltip-provider' : 'tooltip',
  DropdownMenu: part => /Sub/.test(part ?? '') ? 'submenu' : 'menu', ContextMenu: part => /Sub/.test(part ?? '') ? 'submenu' : 'menu', Menubar: part => /Sub/.test(part ?? '') ? 'submenu' : 'menu',
  Dialog: () => 'dialog', AlertDialog: () => 'dialog', Sheet: () => 'dialog', Popover: () => 'popover', HoverCard: () => 'popover', Drawer: () => 'drawer', Command: () => 'palette', Skeleton: () => 'skeleton',
};
export const shadcn: LibraryAdapter = {
  family: 'shadcn',
  capabilities: ['usage', 'states', 'structure', 'owned', 'system'],
  state(attribute, value) {
    const name = attribute.replace(/^data-/, '');
    if (['size', 'variant', 'orientation', 'state', 'side'].includes(name)) return value === null ? name : name === 'state' ? value : `${name}=${value}`;
    return ['active', 'disabled', 'selected', 'checked', 'placeholder'].includes(name) ? name : null;
  },
  structure: { portal: /^Portal$/, render: ['asChild'], focus: /^(?:Dialog|AlertDialog|Sheet)\.Content$/, role: (component, part) => roles[component]?.(part, component) ?? null },
  owned: { variables: /^$/, providers: /Provider$/ },
  owns: (specifier, ctx) => generated(specifier, ctx) !== null,
  meaning(specifier, imported, ctx) {
    const file = generated(specifier, ctx);
    if (!file || imported === '*' || imported === 'default' || !/^[A-Z]/.test(imported)) return { component: null, part: null };
    const component = componentName(file);
    const part = partOf(imported, component, null);
    // `Toaster` from `sonner.tsx` is its own component, not a part of one named after the file.
    return part === imported ? { component: imported, part: null } : { component, part };
  },
};
