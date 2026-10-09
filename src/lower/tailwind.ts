import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { ResolverFactory } from 'oxc-resolver';
import { errorMessage, UsageError } from '../errors.js';
import { tool } from '../report.js';
import { lowerCss } from './css.js';
import type { CandidateCss } from './css.js';

type DesignSystem = {
  candidatesToCss(candidates: string[]): (string | null)[];
  parseCandidate?(name: string): Iterable<{ kind: string; root?: string; value?: unknown }>;
  utilities?: { keys(kind: 'static' | 'functional'): string[]; getCompletions(name: string): { values: (string | null)[] }[] };
  theme?: { entries(): Iterable<[string, { options: number }]>; prefix?: string | null };
};
interface LoaderOptions {
  base: string;
  loadStylesheet?: (id: string, base: string) => Promise<{ path: string; base: string; content: string }>;
  loadModule?: (id: string, base: string) => Promise<{ path: string; base: string; module: unknown }>;
}
type Compiler = { __unstable__loadDesignSystem(css: string, options: LoaderOptions): Promise<DesignSystem> };
const cssResolver = new ResolverFactory({ extensions: ['.css'], mainFields: ['style'], conditionNames: ['style', 'default'] });
const jsResolver = new ResolverFactory({ extensions: ['.js', '.mjs', '.cjs', '.ts'], conditionNames: ['node', 'import', 'default'] });
function resolved(resolver: ResolverFactory, id: string, base: string): string {
  const result = resolver.sync(base, id);
  if (!result.path) throw new Error(`Could not resolve ${JSON.stringify(id)} from ${base}: ${result.error}`);
  return result.path;
}
function hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }

// Hash the complete stylesheet graph independently of the Node wrapper, whose
// exported design-system loader doesn't expose its dependency callback.
async function graph(entry: string): Promise<{ hash: string; utilities: string[] }> {
  const contents = new Map<string, string>();
  async function visit(file: string): Promise<void> {
    if (contents.has(file)) return;
    const css = await readFile(file, 'utf8');
    contents.set(file, css);
    if (!file.endsWith('.css')) return;
    // Tailwind accepts imports after @theme; lightningcss correctly rejects
    // that ordering as browser CSS. Read import specifiers before lowering.
    const imports = css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/@(?:import|reference)\s+(?:url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)|"([^"]+)"|'([^']+)')/g);
    for (const match of imports) {
      const id = match.slice(1).find(value => value !== undefined)!;
      if (!/^(?:https?:|data:|\/\/)/.test(id)) await visit(resolved(cssResolver, id, dirname(file)));
    }
    for (const match of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/@(?:config|plugin)\s+["']([^"']+)["']/g)) await visit(resolved(jsResolver, match[1]!, dirname(file)));
  }
  await visit(entry);
  const utilities = [...new Set([...contents].filter(([file]) => file.endsWith('.css')).flatMap(([, css]) =>
    [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/@utility\s+([\w-]+)\s*\{/g)].map(match => match[1]!)))];
  return { hash: hash(JSON.stringify([...contents].sort(([a], [b]) => a.localeCompare(b)))), utilities };
}

export async function lowerTailwind(root: string, entry: string | null, version: string | null, candidates: string[]): Promise<{
  candidates: Map<string, CandidateCss>; suggestions: { token: string; prefix: string }[]; loadMs: number; compileMs: number; cacheHits: number; cacheMisses: number;
}> {
  const results = new Map<string, CandidateCss>();
  if (entry === null || !candidates.length) return { candidates: results, suggestions: [], loadMs: 0, compileMs: 0, cacheHits: 0, cacheMisses: 0 };
  const start = performance.now();
  try {
    const require = createRequire(join(dirname(entry), 'package.json'));
    const tailwindPath = require.resolve('tailwindcss');
    if (!version?.startsWith('4.')) throw new Error('Layer 1 requires the project’s Tailwind v4 installation');
    const cssGraph = await graph(entry);
    const key = hash(`${cssGraph.hash}\n${version}\n${tool.version}\nlayer1-cache-v5`);
    const hasModules = await stat(join(root, 'node_modules')).then(info => info.isDirectory()).catch(() => false);
    const directory = resolve(process.env.PLUMB_CACHE_DIR ?? join(root, hasModules ? 'node_modules/.cache/plumb' : '.plumb-cache'), key);
    let cached: Record<string, CandidateCss> = Object.create(null) as Record<string, CandidateCss>;
    try { cached = Object.assign(Object.create(null) as Record<string, CandidateCss>, JSON.parse(await readFile(join(directory, 'candidates.json'), 'utf8')) as Record<string, CandidateCss>); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
    const misses = candidates.filter(candidate => !Object.hasOwn(cached, candidate));
    let system: DesignSystem | undefined;
    // Hints depend on the roots present in this candidate set, whereas compiled
    // CSS remains reusable when a source slice adds/removes candidates.
    const suggestionPath = join(directory, `suggestions-${hash(JSON.stringify(candidates))}.json`);
    let suggestions: { token: string; prefix: string }[] | null = null;
    try { suggestions = JSON.parse(await readFile(suggestionPath, 'utf8')); } catch { /* Optional hint index. */ }
    // A fully warm run doesn't even load the design system.
    if (misses.length || suggestions === null) {
      let compilerPath = tailwindPath;
      let nodeWrapper = false;
      try {
        const nodePath = require.resolve('@tailwindcss/node');
        const nodeRequire = createRequire(nodePath);
        if (nodeRequire.resolve('tailwindcss') === tailwindPath) { compilerPath = nodePath; nodeWrapper = true; }
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') throw error; }
      const compiler = await import(pathToFileURL(compilerPath).href) as Compiler;
      const options: LoaderOptions = { base: dirname(entry) };
      if (!nodeWrapper) {
        options.loadStylesheet = async (id, base) => {
          const path = resolved(cssResolver, id, base);
          return { path, base: dirname(path), content: await readFile(path, 'utf8') };
        };
        options.loadModule = async (id, base) => {
          const path = resolved(jsResolver, id, base);
          const module = await import(pathToFileURL(path).href) as { default?: unknown };
          return { path, base: dirname(path), module: module.default ?? module };
        };
      }
      system = await compiler.__unstable__loadDesignSystem(await readFile(entry, 'utf8'), options);
    }
    const loadMs = performance.now() - start;
    const compileStart = performance.now();
    if (system && misses.length) {
      const css = system.candidatesToCss(misses);
      for (const [index, candidate] of misses.entries()) {
        try { cached[candidate] = lowerCss(css[index] ?? null); }
        catch (error) { throw new Error(`Parse compiled candidate ${candidate}: ${errorMessage(error)}`); }
      }
    }
    const compileMs = system && misses.length ? performance.now() - compileStart : 0;
    if (system) {
      // Index authored utility names and non-default @theme keys directly.
      // getClassList expands large themes into hundreds of thousands of names.
      const own = new Map(cssGraph.utilities.map(token => {
        const prefix = token.slice(0, token.lastIndexOf('-') + 1);
        // A one-segment custom namespace groups distinct utilities,
        // rather than values of one utility.
        return [token, prefix.split('-').length > 2 ? prefix : ''];
      }));
      const values = new Set<string>();
      for (const [key, metadata] of system.theme?.entries() ?? []) {
        if (metadata.options & 4) continue; // Tailwind ThemeOptions.DEFAULT
        const value = key.replace(/^--(?:font-weight|inset-shadow|drop-shadow|[a-z]+)-/, '');
        if (value !== key && value && !value.includes('--')) values.add(value);
      }
      const usedRoots = new Set(candidates.filter(name => cached[name]?.css?.trim()).flatMap(name =>
        [...(system!.parseCandidate?.(name) ?? [])].filter(candidate => candidate.kind === 'functional' && candidate.value != null).map(candidate => candidate.root)));
      const requestedRoots = new Set(candidates.flatMap(name => [...(system!.parseCandidate?.(name) ?? [])]
        .filter(candidate => candidate.kind === 'functional' && candidate.value != null).map(candidate => candidate.root)));
      const staticRoots = new Set(system.utilities?.keys('static') ?? []);
      for (const root of system.utilities?.keys('functional') ?? []) {
        // A static utility such as block is also a functional root in v4.
        // Do not invent value hints for that second meaning without usage proof.
        if (!usedRoots.has(root) && (!requestedRoots.has(root) || staticRoots.has(root))) continue;
        for (const group of system.utilities!.getCompletions(root)) {
          for (const value of group.values) if (value !== null && values.has(value)) own.set(`${root}-${value}`, `${root}-`);
        }
      }
      suggestions = [...own].map(([token, prefix]) => ({ token: system.theme?.prefix ? `${system.theme.prefix}:${token}` : token, prefix }));
    }
    if (misses.length || system) {
      await mkdir(directory, { recursive: true });
      const temporary = join(directory, `candidates-${process.pid}.json`);
      await writeFile(temporary, JSON.stringify(cached));
      await rename(temporary, join(directory, 'candidates.json'));
      await writeFile(suggestionPath, JSON.stringify(suggestions));
    }
    for (const candidate of candidates) results.set(candidate, cached[candidate]!);
    return { candidates: results, suggestions: suggestions ?? [], loadMs, compileMs, cacheHits: candidates.length - misses.length, cacheMisses: misses.length };
  } catch (error) {
    throw new UsageError(`Load project Tailwind from ${dirname(entry)}: ${errorMessage(error)}`);
  }
}
