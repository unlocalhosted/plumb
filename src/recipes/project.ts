import { parseSync } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { knownClassHelpers } from '../collect/class-helpers.js';
import { defaultRootPx } from './css.js';
import { literal, readMotionObject, readTheme, rootFontSize } from './readers.js';
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
  /** why each idiom was read so: the package, config or files that say it, with how many times (D9) */
  evidence: Evidence[];
}
export interface Evidence { idiom: 'tailwind' | 'motion' | 'presets' | 'dataState' | 'classes'; says: string; file?: string; count?: number }
export interface ProjectIndex {
  idioms: Idioms;
  themes: ThemeIndex[];
  /** the project's own shadows, then its own motion */
  yours: Recipe[];
  /** the project's own motion presets (`export const spring = { type: 'spring', ... }`) */
  presets: (Recipe & { exportName: string })[];
  /** the code files, then the stylesheets, of the project as read (relative paths, forward slashes): what a plan searches for users and import styles */
  paths: string[];
  /** the root font size the project's stylesheets declare, else the browser's 16 */
  rootPx: number;
}

function presetsIn(file: string, text: string): (Recipe & { exportName: string })[] {
  if (!/\.[cm]?[jt]sx?$/.test(file) || !/\b(?:spring|stiffness|duration|ease)\b/.test(text)) return [];
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

/** Text with its comments blanked (same length, so offsets hold). Strings are not parsed: `//` inside one is rare in code that composes classes. */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\/|(^|[^:'"\\])\/\/[^\n]*/g, (m, lead: string | undefined) => (lead ?? '') + ' '.repeat(m.length - (lead?.length ?? 0)));
}

/**
 * The project as the recipes see it. Idioms come from what the project declares first (package.json, the stylesheet that
 * imports Tailwind, the files that import a helper or a motion library), then from what its code uses most; comments never
 * count, and `evidence` says what each reading rests on so a card can show why.
 */
export function indexProject(input: ProjectInput): ProjectIndex {
  const css = input.files.filter(f => f.path.endsWith('.css'));
  const code = input.files.filter(f => /\.[cm]?[jt]sx?$/.test(f.path));
  const themes: ThemeIndex[] = [];
  const rootPx = css.map(f => rootFontSize(f.text)).find((n): n is number => n !== null) ?? defaultRootPx;
  let tailwindEntry: string | null = null, themeFile: string | null = null, cssVars: string[] = [];
  for (const f of css) {
    const index = readTheme(f.path, f.text, rootPx);
    const blocks = scanStylesheet(f.text).blocks;
    if (/@import\s+["']tailwindcss/.test(f.text) || /@import\s+["']tailwindcss\//.test(f.text)) tailwindEntry ??= f.path;
    const hasTheme = blocks.some(isTheme);
    if (hasTheme && (index.shadows.length || index.motions.length || !themeFile)) themeFile = index.shadows.length || index.motions.length ? f.path : themeFile ?? f.path;
    if (index.shadows.length || index.motions.length) { themes.push(index); if (!hasTheme) cssVars.push(f.path); }
  }
  const depVersion = input.dependencies.tailwindcss ?? input.dependencies['@tailwindcss/vite'] ?? input.dependencies['@tailwindcss/postcss'];
  const major = depVersion ? Number(/\d+/.exec(depVersion)?.[0]) : null;
  const isTailwind = !!(tailwindEntry || themeFile || depVersion);
  const evidence: Evidence[] = [];
  if (depVersion) evidence.push({ idiom: 'tailwind', says: `package.json depends on Tailwind ${depVersion}` });
  if (tailwindEntry) evidence.push({ idiom: 'tailwind', says: 'imports tailwindcss', file: tailwindEntry });
  // the code as written, without its comments: an idiom named in a comment is not one the project uses
  const sources = code.map(f => ({ path: f.path, text: withoutComments(f.text) }));
  const presets = code.flatMap(f => presetsIn(f.path, f.text));
  const importing = (name: string) => sources.filter(f => new RegExp(`from\\s+['"]${name}['"]`).test(f.text));
  const motionFrom = importing('motion/react').length ? 'motion/react' : importing('framer-motion').length ? 'framer-motion' : 'motion' in input.dependencies ? 'motion/react' : 'framer-motion' in input.dependencies ? 'framer-motion' : null;
  if (motionFrom) evidence.push({ idiom: 'motion', says: importing(motionFrom).length ? `imports ${motionFrom}` : `package.json depends on ${motionFrom === 'motion/react' ? 'motion' : motionFrom}`, ...(importing(motionFrom)[0] ? { file: importing(motionFrom)[0]!.path, count: importing(motionFrom).length } : {}) });
  // the presets file is the one that exports the most of them, not the first one read
  const presetFiles = [...presets.reduce((m, p) => m.set(p.source.file!, (m.get(p.source.file!) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const presetsFile = presetFiles[0]?.[0];
  if (presetsFile) evidence.push({ idiom: 'presets', says: 'exports motion presets', file: presetsFile, count: presetFiles[0]![1] });
  // a class helper counts only where the file imports or declares it: a vendored example or a word in a string is not the idiom
  // a call, not the helper's own declaration
  const calls = (name: string) => new RegExp(`(?<!function\\s+)\\b${name}\\(`, 'g');
  // the helpers the recipes name as an idiom: the rows of the one class-helper table that say so
  const helpers: [Idioms['classes'], RegExp][] = knownClassHelpers.filter(h => h.idiom).map(h => [h.name as Idioms['classes'], calls(h.name)]);
  const holds = (text: string, name: string) => new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from|import\\s+${name}\\s+from|(?:function|const|let|var)\\s+${name}\\b`).test(text);
  const tally = helpers.map(([idiom, re]) => {
    const files = sources.filter(f => holds(f.text, idiom)).map(f => ({ file: f.path, count: f.text.match(re)?.length ?? 0 })).filter(f => f.count);
    return { idiom, count: files.reduce((n, f) => n + f.count, 0), top: files.sort((a, b) => b.count - a.count)[0] };
  });
  const templates = sources.map(f => ({ file: f.path, count: f.text.match(/className=\{`/g)?.length ?? 0 })).filter(f => f.count);
  tally.push({ idiom: 'template', count: templates.reduce((n, f) => n + f.count, 0), top: templates.sort((a, b) => b.count - a.count)[0] });
  const top = tally.sort((a, b) => b.count - a.count)[0]!;
  if (top.count) evidence.push({ idiom: 'classes', says: top.idiom === 'template' ? 'className={`…`} is used most' : `${top.idiom}(…) is used most`, ...(top.top ? { file: top.top.file, count: top.count } : {}) });
  // data-state: a headless library that sets it, else the project's own JSX that sets it or selectors and classes that read it
  const library = Object.keys(input.dependencies).find(d => /^@radix-ui\/|^@base-ui|^@ariakit|^vaul$|^sonner$/.test(d));
  const reading = [...sources, ...css.map(f => ({ path: f.path, text: withoutComments(f.text) }))].map(f => ({ file: f.path, count: f.text.match(/data-\[state[=\]]|\[data-state[=\]]|\bdata-state=/g)?.length ?? 0 })).filter(f => f.count);
  if (library) evidence.push({ idiom: 'dataState', says: `package.json depends on ${library}` });
  else if (reading.length) evidence.push({ idiom: 'dataState', says: 'sets or reads data-state', file: reading[0]!.file, count: reading.reduce((n, f) => n + f.count, 0) });
  // the stylesheet the app compiles first (its theme file, then its Tailwind entry), so where two files name the same token
  // (a prototype's copy under public/), the project's own is the one kept
  const rank = (t: ThemeIndex) => t.file === themeFile ? 0 : t.file === tailwindEntry ? 1 : 2;
  themes.sort((a, b) => rank(a) - rank(b));
  // one recipe per kind and id: the id names it in a request and keys it in a list (N-12)
  const seen = new Set<string>();
  const yours: Recipe[] = [...themes.flatMap(t => t.shadows), ...themes.flatMap(t => t.motions), ...presets].filter(r => !seen.has(`${r.kind}:${r.id}`) && !!seen.add(`${r.kind}:${r.id}`));
  const shadowPrefix = themes.map(t => t.shadowPrefix).find(Boolean) ?? null;
  return {
    idioms: {
      tailwind: isTailwind ? { version: major, entry: tailwindEntry, themeFile: themeFile ?? input.themeFile } : null,
      cssVariables: cssVars.length ? { files: cssVars, shadowPrefix } : null,
      motion: { installed: motionFrom !== null, from: motionFrom, presets: presetsFile ? { file: presetsFile, names: presets.filter(p => p.source.file === presetsFile).map(p => p.exportName) } : null },
      dataState: !!library || reading.length > 0,
      classes: top.count ? top.idiom : 'plain',
      evidence,
    },
    themes, yours, presets, rootPx,
    paths: [...code.map(f => f.path), ...css.map(f => f.path)],
  };
}
