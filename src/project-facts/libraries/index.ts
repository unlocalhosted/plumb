import type { Detector } from '../detector.js';
import { importSite, lineOf } from '../detector.js';
import { claim } from '../facts.js';
import type { Detected } from '../support.js';
import { derivedSupport } from '../support.js';
import type { Capability, LibraryAdapter } from './adapter.js';
import { collectUsage } from './adapter.js';
import { baseUi } from './base-ui.js';
import { radix } from './radix.js';
import { shadcn, shadcnConfig } from './shadcn.js';

export type { Capability, LibraryAdapter, Usage, UsageSite } from './adapter.js';
export { capabilityWords, describeUsage } from './adapter.js';
import { uiAliases } from './shadcn.js';
export { shadcnConfig, uiAliases };
export type { ShadcnConfig } from './shadcn.js';

/**
 * One family per entry: the packages that mean it and how its elements take style. `classes`: the app styles its
 * elements with class names (headless libraries, class helpers), so those are judged like any element even without an
 * adapter. `own`: the library styles itself (sx, theme, style props), which plumb does not read.
 */
export interface LibraryFamily { id: string; label: string; packages: RegExp; styled: 'classes' | 'own'; configs?: string[]; helper?: boolean }
const family = (id: string, label: string, packages: RegExp, styled: 'classes' | 'own', extra: { configs?: string[]; helper?: boolean } = {}): LibraryFamily => ({ id, label, packages, styled, ...extra });

/** Families plumb names. Scoped packages collapse to their scope, as the state report has always shown them. */
export const libraryFamilies: readonly LibraryFamily[] = [
  family('radix', 'Radix', /^(?:@radix-ui\/|radix-ui$)/, 'classes'),
  family('base-ui', 'Base UI', /^@base-ui-components\//, 'classes'),
  family('headless-ui', 'Headless UI', /^@headlessui\//, 'classes'),
  family('mui', 'MUI', /^@mui\//, 'own'),
  family('chakra', 'Chakra UI', /^@chakra-ui\//, 'own'),
  family('mantine', 'Mantine', /^@mantine\//, 'own'),
  family('daisyui', 'daisyUI', /^daisyui$/, 'classes'),
  family('tailwind-variants', 'tailwind-variants', /^tailwind-variants$/, 'classes', { helper: true }),
  family('cva', 'CVA', /^class-variance-authority$/, 'classes', { helper: true }),
  family('base-ui-react', 'Base UI', /^@base-ui\/react$/, 'classes'),
  family('react-aria', 'React Aria', /^(?:react-aria|react-aria-components|@react-aria\/.+|react-stately)$/, 'classes'),
  family('ark', 'Ark UI', /^@ark-ui\/.+$/, 'classes'),
  family('shadcn', 'shadcn/ui', /^shadcn$/, 'classes', { configs: ['components.json'] }),
  family('tailwind-merge', 'tailwind-merge', /^tailwind-merge$/, 'classes', { helper: true }),
  family('clsx', 'clsx', /^(?:clsx|classnames)$/, 'classes', { helper: true }),
];

/** The adapters, by the family ids they serve. A family without one is found, not understood. */
export const libraryAdapters: readonly LibraryAdapter[] = [baseUi, radix, shadcn];
const adapterFor = (id: string) => libraryAdapters.find(adapter => adapter.family === id || (adapter.family === 'base-ui' && id === 'base-ui-react'));
export const adapterOf = (item: { id: string }): LibraryAdapter | undefined => adapterFor(item.id);

export const librariesRegistry: readonly Detector[] = [{
  id: 'libraries.manifest', reads: ['package.json', 'components.json'],
  detect(ctx) {
    const dependencies = ctx.dependencies(), text = ctx.read('package.json');
    if (typeof text !== 'string') return {};
    const found: Detected[] = [];
    for (const item of libraryFamilies) {
      const name = Object.keys(dependencies).filter(key => item.packages.test(key)).sort()[0];
      const config = item.configs?.find(file => ctx.exists(file));
      if (!name && !config) continue;
      const evidence = [];
      const site = name ? importSite(ctx, item.packages) : undefined;
      if (site) evidence.push(site);
      if (config) evidence.push(ctx.evidence(config, 1, config));
      if (name) evidence.push(ctx.evidence('package.json', lineOf(text, new RegExp(`"${name.replace(/[/@.-]/g, '\\$&')}"\\s*:`)), `${name}: ${dependencies[name]}`));
      // Each capability the adapter implements runs here; one that cannot (a file that will not parse) is unknown, with why.
      const adapter = adapterFor(item.id), ran: Partial<Record<Capability, 'judged' | 'unknown'>> = {};
      let usage: Detected['usage'];
      const detail: NonNullable<Detected['detail']> = name ? { package: name } : {};
      for (const capability of adapter?.capabilities ?? []) {
        if (capability === 'usage') {
          const result = collectUsage(adapter!, ctx);
          usage = result.usage; ran.usage = result.unknown.length ? 'unknown' : 'judged';
          evidence.push(...result.unknown);
        } else if (capability === 'system') {
          // The system is components.json: its style, theme shape, aliases and icon library are facts; unreadable is unknown.
          const system = shadcnConfig(ctx);
          if (system) { ran.system = 'judged'; Object.assign(detail, { style: system.style, css: system.css, cssVariables: system.cssVariables, baseColor: system.baseColor, iconLibrary: system.iconLibrary, ui: uiAliases(ctx)[0] ?? null, utils: system.aliases.utils ?? null }); }
          else { ran.system = 'unknown'; evidence.push(ctx.evidence('components.json', 1, ctx.exists('components.json') ? 'could not parse components.json' : 'no components.json; the ui folder is taken as @/components/ui')); }
        } else ran[capability] = 'judged'; // read at analysis or locate time through the adapter; nothing on disk can fail it here
      }
      const note = derivedSupport(item, adapter, ran);
      found.push({ id: item.id, label: item.label, ...note, source: 'declared', evidence, ...(Object.keys(detail).length ? { detail } : {}), ...(usage ? { usage } : {}), ...(adapter ? { capabilities: ran } : {}) });
    }
    return found.length ? { libraries: found.map(item => claim<Detected>(item, 'declared', item.evidence, this.id)) } : {};
  },
}];
