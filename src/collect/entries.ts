import { bundlerConfigFiles } from '../project-facts/index.js';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { parseSync, visitorKeys } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { ResolverFactory } from 'oxc-resolver';
import { configDiagnostic, unreadable } from '../diagnostics.js';
import type { Finding } from '../report.js';
import { cssImports, resolveStylesheet } from './stylesheets.js';
import { moduleImports } from './modules.js';

/** Resolve runtime entries without importing/executing a project's bundler config. */
export async function appTailwindEntry(root: string, candidates: string[], diagnostics: Finding[], inputs: string[]): Promise<string | undefined> {
  const resolver = new ResolverFactory({ tsconfig: 'auto', extensions: ['.tsx', '.ts', '.jsx', '.js', '.mts', '.mjs', '.css'],
    extensionAlias: { '.js': ['.ts', '.tsx', '.js'] }, conditionNames: ['import', 'browser', 'default'], mainFields: ['browser', 'module', 'main'] });
  const texts = new Map<string, string | undefined>();
  const modules = new Map<string, { imports: string[]; css: string[] }>();
  const roots: string[] = [], cssRoots: string[] = [];
  const local = (file: string) => { const path = relative(root, file); return path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path) && !path.split(sep).includes('node_modules'); };
  const remote = (id: string) => /^(?:[a-z]+:|\/\/|#)/i.test(id);
  function target(file: string, id: string, html = false): string | undefined {
    if (remote(id)) return;
    const clean = id.replace(/[?#].*$/, '');
    const path = html ? clean.startsWith('/') ? resolve(root, '.' + clean) : resolve(dirname(file), clean) : resolver.resolveFileSync(file, clean).path;
    return path && local(path) ? path : undefined;
  }
  async function read(file: string): Promise<string | undefined> {
    if (texts.has(file)) return texts.get(file);
    inputs.push(file);
    try { const text = await readFile(file, 'utf8'); texts.set(file, text); return text; }
    catch (error) { texts.set(file, undefined); if ((error as NodeJS.ErrnoException).code !== 'ENOENT') diagnostics.push(unreadable(file, file, error)); return; }
  }
  async function html(file: string): Promise<void> {
    const text = await read(file); if (text === undefined) return;
    const clean = text.replace(/<!--[\s\S]*?-->/g, '');
    const attrs = (tag: string) => new Map([...tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(match => [match[1]!.toLowerCase(), match[2] ?? match[3] ?? match[4]!]));
    for (const match of clean.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      const attributes = attrs(match[1]!); if (attributes.get('type') !== 'module') continue;
      const src = attributes.get('src');
      if (src) { const path = target(file, src, true); if (path) roots.push(path); }
      else {
        try {
          const parsed = parseSync(file + '.js', match[2]!);
          if (parsed.errors.length) throw new Error(parsed.errors[0]?.message);
          for (const edge of moduleImports(parsed.module, match[2]!)) { const path = target(file, edge.specifier, true); if (path) roots.push(path); }
        } catch (error) { diagnostics.push(unreadable(file, file, error)); }
      }
    }
    for (const match of clean.matchAll(/<link\b([^>]*)>/gi)) {
      const attributes = attrs(match[1]!);
      if (attributes.get('rel') !== 'stylesheet') continue;
      const href = attributes.get('href'), path = href && target(file, href, true); if (path) cssRoots.push(path);
    }
  }
  await html(resolve(root, 'index.html'));
  // Static Rollup/Vite inputs and webpack entries cover projects without the
  // conventional HTML entry. Dynamic config remains explicitly undecidable.
  if (!roots.length) for (const name of bundlerConfigFiles(root)) {
    const file = resolve(root, name), text = await read(file); if (text === undefined) continue;
    try {
      const parsed = parseSync(file, text); if (parsed.errors.length) throw new Error(parsed.errors[0]?.message);
      function values(node: Node): string[] {
        if (node.type === 'Literal' && typeof node.value === 'string') return [node.value];
        if (node.type === 'ArrayExpression') return node.elements.flatMap(item => item ? values(item) : []);
        if (node.type === 'ObjectExpression') return node.properties.flatMap(item => item.type === 'Property' ? values(item.value) : []);
        return [];
      }
      function walk(node: Node): void {
        if (node.type === 'Property' && !node.computed && (node.key.type === 'Identifier' ? ['input', 'entry'].includes(node.key.name) : node.key.type === 'Literal' && ['input', 'entry'].includes(String(node.key.value)))) {
          for (const id of values(node.value)) { const path = target(file, id, true); if (path) roots.push(path); }
        }
        const record = node as unknown as Record<string, unknown>;
        for (const key of visitorKeys[node.type] ?? []) {
          const value = record[key];
          if (Array.isArray(value)) { for (const child of value) if (child) walk(child as Node); }
          else if (value) walk(value as Node);
        }
      }
      walk(parsed.program);
    } catch (error) { diagnostics.push(unreadable(file, file, error)); }
  }
  const queue = [...new Set(roots)], scheduled = new Set(queue);
  for (let index = 0; index < queue.length && index < 20_000; index++) {
    const file = queue[index]!;
    if (file.endsWith('.html')) { await html(file); for (const root of roots) if (!scheduled.has(root)) { scheduled.add(root); queue.push(root); } continue; }
    if (file.endsWith('.css')) { cssRoots.push(file); continue; }
    if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
    const text = await read(file); if (text === undefined) continue;
    try {
      const parsed = parseSync(file, text); if (parsed.errors.length) throw new Error(parsed.errors[0]?.message);
      const imports: string[] = [], css: string[] = [];
      for (const edge of moduleImports(parsed.module, text)) {
        const path = target(file, edge.specifier); if (!path) continue;
        if (path.endsWith('.css')) css.push(path);
        else if (/\.[cm]?[jt]sx?$/.test(path)) { imports.push(path); if (!scheduled.has(path)) { scheduled.add(path); queue.push(path); } }
      }
      modules.set(file, { imports, css });
    } catch (error) { diagnostics.push(unreadable(file, file, error)); }
  }
  const reached = new Set<string>(), scores = new Map<string, Set<string>>();
  async function cssEntries(file: string, seen = new Set<string>()): Promise<Set<string>> {
    if (seen.has(file)) return new Set(); seen.add(file);
    const entries = new Set(candidates.includes(file) ? [file] : []);
    const css = await read(file); if (css === undefined) return entries;
    for (const item of cssImports(css)) {
      if (item.reference || remote(item.id) || item.id.startsWith('tailwindcss')) continue;
      try {
        const path = resolveStylesheet(item.id, dirname(file));
        if (local(path)) for (const entry of await cssEntries(path, seen)) entries.add(entry);
      } catch (error) { diagnostics.push(unreadable(file, item.id, error)); }
    }
    return entries;
  }
  function descendants(file: string, seen = new Set<string>()): Set<string> {
    if (seen.has(file)) return seen; seen.add(file);
    for (const child of modules.get(file)?.imports ?? []) descendants(child, seen);
    return seen;
  }
  for (const file of cssRoots) for (const entry of await cssEntries(file)) reached.add(entry);
  for (const [file, module] of modules) for (const css of module.css) for (const entry of await cssEntries(css)) {
    reached.add(entry);
    const sources = scores.get(entry) ?? new Set<string>();
    for (const source of descendants(file)) sources.add(source); scores.set(entry, sources);
  }
  if (reached.size === 1) return [...reached][0];
  const ranked = [...reached].map(file => ({ file, count: scores.get(file)?.size ?? 0 })).sort((a, b) => b.count - a.count);
  if (ranked[0] && ranked[0].count > (ranked[1]?.count ?? 0)) {
    const { file, count } = ranked[0];
    diagnostics.push(configDiagnostic('config/tailwind-entry', { file, line: 1, column: 1, text: file },
      `Using Tailwind entry ${file}`, `The app reaches several Tailwind entries; this entry reaches the most source files (${count}).`, 'Set css in plumber.config.ts to choose a different entry.'));
    return file;
  }
}
