import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { ResolverFactory } from 'oxc-resolver';
import type { Report } from '../report.js';
import { errorMessage, UsageError } from '../errors.js';
import type { CssImport } from './modules.js';

export type Reach = Report['stylesheets'][number]['reached'][number];
export interface Stylesheet {
  file: string;
  css: string;
  sourceOrigin: 'project' | 'framework';
  package?: string;
  reached: Reach[];
  imports: { file: string; reference: boolean; tail: string }[];
}
export interface StylesheetGraph { files: Map<string, Stylesheet>; roots: string[]; notes: string[] }

// Same CSS resolution options as @tailwindcss/node: style exports/main field,
// .css extension, node_modules (including NODE_PATH). Never JS main fallbacks.
const resolver = new ResolverFactory({ extensions: ['.css'], mainFields: ['style'], conditionNames: ['style'],
  modules: ['node_modules', ...(process.env.NODE_PATH?.split(sep === '/' ? ':' : ';') ?? [])] });

export function resolveStylesheet(id: string, base: string): string {
  const path = resolver.sync(base, id.replace(/[?#].*$/, '')).path;
  if (!path) throw new UsageError(`Resolve stylesheet ${JSON.stringify(id)} from ${base}: check its import and package style exports.`);
  return path;
}

export function packageName(file: string): string | undefined {
  const suffix = file.split(`${sep}node_modules${sep}`).at(-1);
  if (suffix === file) return undefined;
  const parts = suffix!.split(sep);
  return parts[0]!.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

export function cssCode(css: string): string {
  return css.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\//g, text => text.replace(/[^\n]/g, ' '));
}

export function cssImports(css: string): { id: string; reference: boolean; tail: string; start: number; end: number }[] {
  // Mask comments without moving source offsets. Strings containing comment
  // punctuation are preserved (e.g. URL paths).
  const clean = css.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\//g, text => text.startsWith('/*') ? text.replace(/[^\n]/g, ' ') : text);
  const imports: ReturnType<typeof cssImports> = [];
  let quote = '';
  for (let index = 0; index < clean.length; index++) {
    const char = clean[index];
    if (char === '\\') { index++; continue; }
    if (quote) { if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char !== '@') continue;
    const match = /^@(?<kind>import|reference)\s+(?:url\(\s*(?:"(?<doubleUrl>[^"]+)"|'(?<singleUrl>[^']+)'|(?<url>[^\s)]+))\s*\)|"(?<double>[^"]+)"|'(?<single>[^']+)')(?<tail>[^;]*);/.exec(clean.slice(index));
    if (!match) continue;
    imports.push({ id: match.groups!.doubleUrl ?? match.groups!.singleUrl ?? match.groups!.url ?? match.groups!.double ?? match.groups!.single!,
      reference: match.groups!.kind === 'reference', tail: match.groups!.tail!.trim(), start: index, end: index + match[0].length });
    index += match[0].length - 1;
  }
  return imports;
}

export function maskImports(css: string, references = false): string {
  for (const item of cssImports(css).toReversed()) {
    if (item.reference && !references) continue;
    css = css.slice(0, item.start) + css.slice(item.start, item.end).replace(/[^\n]/g, ' ') + css.slice(item.end);
  }
  return css;
}

export async function collectStylesheets(entry: string | null, sources: string[], imports: CssImport[], overrides: ReadonlyMap<string, string> = new Map()): Promise<StylesheetGraph> {
  const graph: StylesheetGraph = { files: new Map(), roots: [], notes: [] };
  const isCss = (file: string) => file.endsWith('.css') || overrides.has(file);
  const sourcePaths = new Map([...sources.filter(isCss), ...(entry ? [entry] : [])].map(file => [overrides.has(file) ? file : realpathSync.native(file), file]));
  const projectPath = (file: string) => sourcePaths.get(file) ?? file;
  function promote(file: string): void {
    const sheet = graph.files.get(file);
    if (!sheet || packageName(file) || sheet.sourceOrigin === 'project') return;
    sheet.sourceOrigin = 'project'; delete sheet.package;
    for (const item of sheet.imports) promote(item.file);
  }
  const packages = new Map<string, string | undefined>();
  async function owner(directory: string): Promise<string | undefined> {
    if (packages.has(directory)) return packages.get(directory);
    let name: string | undefined;
    try {
      const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as { name?: string };
      name = typeof metadata.name === 'string' ? metadata.name : undefined;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
    if (!name && dirname(directory) !== directory) name = await owner(dirname(directory));
    packages.set(directory, name);
    return name;
  }
  async function visit(file: string, reach: Reach, external = false): Promise<void> {
    file = projectPath(file);
    const known = graph.files.get(file);
    if (known) {
      if (!known.reached.some(item => JSON.stringify(item) === JSON.stringify(reach))) known.reached.push(reach);
      // An explicit source/CSS reach makes workspace CSS project-authored,
      // even if a dependency module discovered it first. Propagate promotion.
      if (!external && !packageName(file) && known.sourceOrigin === 'framework') {
        promote(file);
      }
      return;
    }
    let css: string;
    try { css = overrides.get(file) ?? await readFile(file, 'utf8'); }
    catch (error) { throw new UsageError(`Read stylesheet ${file}: ${errorMessage(error)}`); }
    const pkg = packageName(file) ?? (external ? await owner(dirname(file)) : undefined);
    const sheet: Stylesheet = { file, css, sourceOrigin: external || pkg ? 'framework' : 'project', ...(pkg ? { package: pkg } : {}), reached: [reach], imports: [] };
    graph.files.set(file, sheet); // Mark before recursing: CSS cycles terminate.
    for (const item of cssImports(css)) {
      if (/^(?:[a-z]+:|\/\/|#)/i.test(item.id)) {
        graph.notes.push(`Stylesheet ${file}: external import ${item.id} is not read.`);
        continue;
      }
      const path = projectPath(resolveStylesheet(item.id, dirname(file)));
      sheet.imports.push({ file: path, reference: item.reference, tail: item.tail });
      await visit(path, { kind: item.reference ? 'reference' : 'import', from: file, specifier: item.id }, external);
    }
  }
  if (entry) { graph.roots.push(entry); await visit(entry, { kind: 'entry' }); }
  for (const item of imports) {
    let file: string;
    try { file = projectPath(item.resolved ?? resolveStylesheet(item.specifier, dirname(item.file))); }
    catch (error) { if (/\.css(?:[?#].*)?$/.test(item.specifier)) throw error; else continue; }
    if (!file.endsWith('.css')) continue;
    graph.roots.push(file);
    await visit(file, { kind: item.external ? 'module' : 'side-effect', from: item.file, specifier: item.specifier }, item.external);
  }
  for (const file of sources.filter(isCss)) {
    graph.roots.push(file);
    await visit(file, { kind: 'source' });
  }
  graph.roots = [...new Set(graph.roots)];
  return graph;
}
