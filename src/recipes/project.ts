import { parseSync } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { literal, readMotionObject, readTheme } from './readers.js';
import type { ThemeIndex } from './readers.js';
import type { Recipe } from './model.js';
import { isTheme, scanStylesheet } from './stylesheet.js';

/** What the session knows about a project, as text: the source files it reads, package.json's dependencies, the theme file it names. */
export interface ProjectInput {
  files: { path: string; text: string }[];
  dependencies: Record<string, string>;
  /** spec.tokens.file: the Tailwind entry's @theme or the config's craft.tokens.file */
  themeFile: string | null;
}
export interface Idioms {
  tailwind: { version: number | null; entry: string | null; themeFile: string | null } | null;
  cssVariables: { files: string[]; shadowPrefix: string | null } | null;
  motion: { installed: boolean; from: 'motion/react' | 'framer-motion' | null; presets: { file: string; names: string[] } | null };
  dataState: boolean;
  /** how classes are composed on elements, by what the sources use most */
  classes: 'cn' | 'clsx' | 'cva' | 'twMerge' | 'template' | 'plain';
}
export interface ProjectIndex {
  idioms: Idioms;
  themes: ThemeIndex[];
  /** the project's own shadows, then its own motion */
  yours: Recipe[];
  /** the project's own motion presets (`export const spring = { type: 'spring', ... }`) */
  presets: (Recipe & { exportName: string })[];
}

function presetsIn(file: string, text: string): (Recipe & { exportName: string })[] {
  if (!/\.[cm]?[jt]s$/.test(file) || !/\b(?:spring|stiffness|duration|ease)\b/.test(text)) return [];
  const parsed = parseSync(file, text);
  if (parsed.errors.length) return [];
  const out: (Recipe & { exportName: string })[] = [];
  for (const item of parsed.program.body as Node[]) {
    if (item.type !== 'ExportNamedDeclaration') continue;
    const decl = (item as unknown as { declaration?: { type: string; declarations?: { id: { type: string; name: string }; init: Node | null }[] } }).declaration;
    if (decl?.type !== 'VariableDeclaration') continue;
    for (const d of decl.declarations ?? []) {
      if (d.id.type !== 'Identifier') continue;
      const recipe = readMotionObject(literal(d.init), d.id.name, { file, token: d.id.name });
      if (recipe && d.init) out.push({ ...recipe, exportName: d.id.name });
    }
  }
  return out;
}

export function indexProject(input: ProjectInput): ProjectIndex {
  const css = input.files.filter(f => f.path.endsWith('.css'));
  const code = input.files.filter(f => /\.[cm]?[jt]sx?$/.test(f.path));
  const themes: ThemeIndex[] = [];
  let tailwindEntry: string | null = null, themeFile: string | null = null, cssVars: string[] = [];
  for (const f of css) {
    const index = readTheme(f.path, f.text);
    const blocks = scanStylesheet(f.text).blocks;
    if (/@import\s+["']tailwindcss/.test(f.text) || /@import\s+["']tailwindcss\//.test(f.text)) tailwindEntry ??= f.path;
    const hasTheme = blocks.some(isTheme);
    if (hasTheme && (index.shadows.length || index.motions.length || !themeFile)) themeFile = index.shadows.length || index.motions.length ? f.path : themeFile ?? f.path;
    if (index.shadows.length || index.motions.length) { themes.push(index); if (!hasTheme) cssVars.push(f.path); }
  }
  const depVersion = input.dependencies.tailwindcss ?? input.dependencies['@tailwindcss/vite'] ?? input.dependencies['@tailwindcss/postcss'];
  const major = depVersion ? Number(/\d+/.exec(depVersion)?.[0]) : null;
  const isTailwind = !!(tailwindEntry || themeFile || depVersion);
  const presets = code.flatMap(f => presetsIn(f.path, f.text));
  const imports = (name: string) => code.some(f => new RegExp(`from\\s+['"]${name}['"]`).test(f.text));
  const motionFrom = imports('motion/react') ? 'motion/react' : imports('framer-motion') ? 'framer-motion' : 'motion' in input.dependencies ? 'motion/react' : 'framer-motion' in input.dependencies ? 'framer-motion' : null;
  const count = (re: RegExp) => code.reduce((n, f) => n + (f.text.match(re)?.length ?? 0), 0);
  const tally: [Idioms['classes'], number][] = [['cn', count(/\bcn\(/g)], ['clsx', count(/\bclsx\(/g)], ['cva', count(/\bcva\(/g)], ['twMerge', count(/\btwMerge\(/g)], ['template', count(/className=\{`/g)]];
  const top = tally.sort((a, b) => b[1] - a[1])[0]!;
  const yours: Recipe[] = [...themes.flatMap(t => t.shadows), ...themes.flatMap(t => t.motions), ...presets];
  const shadowPrefix = themes.map(t => t.shadowPrefix).find(Boolean) ?? null;
  return {
    idioms: {
      tailwind: isTailwind ? { version: major, entry: tailwindEntry, themeFile: themeFile ?? input.themeFile } : null,
      cssVariables: cssVars.length ? { files: cssVars, shadowPrefix } : null,
      motion: { installed: motionFrom !== null, from: motionFrom, presets: presets.length ? { file: presets[0]!.source.file!, names: presets.map(p => p.exportName) } : null },
      dataState: /@radix-ui\/|@base-ui|@ariakit|vaul|sonner/.test(Object.keys(input.dependencies).join(' ')) || code.some(f => /data-state|data-\[state/.test(f.text)),
      classes: top[1] ? top[0] : 'plain',
    },
    themes, yours, presets,
  };
}
