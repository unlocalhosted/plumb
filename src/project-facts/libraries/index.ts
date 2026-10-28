import type { Detector } from '../detector.js';
import { importSite, lineOf } from '../detector.js';
import { claim } from '../facts.js';
import type { Detected, SupportNote } from '../support.js';
import { nothingToDo } from '../support.js';

/** One family per entry: the packages that mean it, and what plumb does with it. */
export interface LibraryFamily extends SupportNote { id: string; label: string; packages: RegExp; configs?: string[] }
const family = (id: string, label: string, packages: RegExp, note: SupportNote, configs?: string[]): LibraryFamily => ({ id, label, packages, ...note, ...(configs ? { configs } : {}) });
const classes = { support: 'supported' as const, judged: 'class names are read through the helper' };
const components = (what: string): SupportNote => ({ support: 'partial', judged: 'your own class names and styles on its elements', skipped: `${what}'s own styles`, next: nothingToDo });

/** Families plumb names. Scoped packages collapse to their scope, as the state report has always shown them. */
export const libraryFamilies: readonly LibraryFamily[] = [
  family('radix', 'Radix', /^@radix-ui\//, components('Radix')),
  family('base-ui', 'Base UI', /^@base-ui-components\//, components('Base UI')),
  family('headless-ui', 'Headless UI', /^@headlessui\//, components('Headless UI')),
  family('mui', 'MUI', /^@mui\//, { support: 'unsupported', skipped: 'MUI’s sx and theme styles', next: nothingToDo }),
  family('chakra', 'Chakra UI', /^@chakra-ui\//, { support: 'unsupported', skipped: 'Chakra’s style props and theme', next: nothingToDo }),
  family('mantine', 'Mantine', /^@mantine\//, { support: 'unsupported', skipped: 'Mantine’s style props and theme', next: nothingToDo }),
  family('daisyui', 'daisyUI', /^daisyui$/, { support: 'partial', judged: 'your utilities beside its component classes', skipped: 'daisyUI’s component classes', next: nothingToDo }),
  family('tailwind-variants', 'tailwind-variants', /^tailwind-variants$/, classes),
  family('cva', 'CVA', /^class-variance-authority$/, classes),
  family('base-ui-react', 'Base UI', /^@base-ui\/react$/, components('Base UI')),
  family('react-aria', 'React Aria', /^(?:react-aria|react-aria-components|@react-aria\/.+|react-stately)$/, components('React Aria')),
  family('ark', 'Ark UI', /^@ark-ui\/.+$/, components('Ark UI')),
  family('shadcn', 'shadcn/ui', /^shadcn$/, { support: 'supported', judged: 'the generated components as your own source; the shadcn theme shape is read' }, ['components.json']),
  family('tailwind-merge', 'tailwind-merge', /^tailwind-merge$/, classes),
  family('clsx', 'clsx', /^(?:clsx|classnames)$/, classes),
];

export const librariesRegistry: readonly Detector[] = [{
  id: 'libraries.manifest', reads: ['package.json'],
  detect(ctx) {
    const dependencies = ctx.dependencies(), text = ctx.read('package.json');
    if (typeof text !== 'string') return {};
    const found: Detected[] = [];
    for (const item of libraryFamilies) {
      const name = Object.keys(dependencies).filter(key => item.packages.test(key)).sort()[0];
      const config = item.configs?.find(file => ctx.exists(file));
      if (!name && !config) continue;
      const { packages, configs: _configs, ...note } = item;
      const evidence = [];
      const site = name ? importSite(ctx, packages) : undefined;
      if (site) evidence.push(site);
      if (config) evidence.push(ctx.evidence(config, 1, config));
      if (name) evidence.push(ctx.evidence('package.json', lineOf(text, new RegExp(`"${name.replace(/[/@.-]/g, '\\$&')}"\\s*:`)), `${name}: ${dependencies[name]}`));
      found.push({ ...note, source: 'declared', evidence, ...(name ? { detail: { package: name } } : {}) });
    }
    return found.length ? { libraries: found.map(item => claim<Detected>(item, 'declared', item.evidence, this.id)) } : {};
  },
}];
