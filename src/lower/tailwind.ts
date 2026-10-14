import { environment, cacheDirectory } from '../paths.js';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { ResolverFactory } from 'oxc-resolver';
import { errorMessage, UsageError } from '../errors.js';
import { tool } from '../report.js';
import type { Finding } from '../report.js';
import { unreadable } from '../diagnostics.js';
import { lowerCss } from './css.js';
import type { CandidateCss } from './css.js';
import { hoverGated, positivePseudo, selector } from '../habits/css.js';
import { cssCode, cssImports, resolveStylesheet } from '../collect/stylesheets.js';
import { tailwindFix } from '../setup-messages.js';

type ParsedCandidate = { kind: string; root?: string; value?: { kind: string; value: string } | null };
type DesignSystem = {
  candidatesToCss(candidates: string[]): (string | null)[];
  parseCandidate(name: string): Iterable<ParsedCandidate>;
  compileAstNodes(candidate: ParsedCandidate): unknown[];
  variants?: { keys(): Iterable<string>; kind(name: string): string };
  utilities?: { keys(kind: 'static' | 'functional'): string[]; getCompletions(name: string): { values: (string | null)[] }[] };
  theme?: { entries(): Iterable<[string, { options: number; value: string }]>; prefix?: string | null };
};
export interface ThemeValue { name: string; value: string }
interface LoaderOptions {
  base: string;
  loadStylesheet?: (id: string, base: string) => Promise<{ path: string; base: string; content: string }>;
  loadModule?: (id: string, base: string) => Promise<{ path: string; base: string; module: unknown }>;
}
type Compiler = { __unstable__loadDesignSystem(css: string, options: LoaderOptions): Promise<DesignSystem> };
const jsResolver = new ResolverFactory({ extensions: ['.js', '.mjs', '.cjs', '.ts'], conditionNames: ['node', 'import', 'default'] });
function resolved(resolver: ResolverFactory, id: string, base: string): string {
  const result = resolver.sync(base, id);
  if (!result.path) throw new Error(`Could not resolve ${JSON.stringify(id)} from ${base}: ${result.error}`);
  return result.path;
}
function hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }

// Hash the complete stylesheet graph independently of the Node wrapper, whose
// exported design-system loader doesn't expose its dependency callback.
export async function tailwindGraph(entry: string, cssOverride?: string): Promise<{ hash: string; utilities: string[]; variants: string[]; files: string[] }> {
  const contents = new Map<string, string>();
  async function visit(file: string): Promise<void> {
    if (contents.has(file)) return;
    const css = file === entry && cssOverride !== undefined ? cssOverride : await readFile(file, 'utf8');
    contents.set(file, css);
    if (!file.endsWith('.css') && !(file === entry && cssOverride !== undefined)) return;
    // Tailwind accepts imports after @theme; lightningcss correctly rejects
    // that ordering as browser CSS. Read import specifiers before lowering.
    for (const { id } of cssImports(css)) {
      if (!/^(?:[a-z]+:|\/\/|#)/i.test(id)) await visit(resolveStylesheet(id, dirname(file)));
    }
    for (const match of cssCode(css).matchAll(/@(?:config|plugin)\b/g)) {
      const path = /^@(?:config|plugin)\s+["']([^"']+)["']/.exec(css.slice(match.index))?.[1];
      if (path) await visit(resolved(jsResolver, path, dirname(file)));
    }
  }
  await visit(entry);
  const utilities = [...new Set([...contents].filter(([file]) => file.endsWith('.css')).flatMap(([, css]) =>
    [...cssCode(css).matchAll(/@utility\s+([\w-]+)\s*\{/g)].map(match => match[1]!)))];
  const variants = [...new Set([...contents].filter(([file]) => file.endsWith('.css')).flatMap(([, css]) => [...cssCode(css).matchAll(/@custom-variant\s+([\w-]+)/g)].map(match => match[1]!)))];
  return { hash: hash(JSON.stringify([...contents].sort(([a], [b]) => a.localeCompare(b)))), utilities, variants, files: [...contents.keys()] };
}

/** A session retains one compiler identity. Replace this object when inputs change. */
export interface TailwindMemory {
  graph?: Awaited<ReturnType<typeof tailwindGraph>>;
  cached?: Record<string, CandidateCss>;
  cachedCount?: number;
  system?: DesignSystem;
  theme?: ThemeValue[];
  hoverVariants?: string[];
  hints?: Map<string, { token: string; prefix: string }[]>;
}

export async function lowerTailwind(root: string, entry: string | null, version: string | null, candidates: string[], probeHover = false, readOnly = false, _reportOnly = false, memory?: TailwindMemory): Promise<{
  diagnostics: Finding[]; hoverVariants: string[]; theme: ThemeValue[]; candidates: Map<string, CandidateCss>; suggestions: { token: string; prefix: string }[]; loadMs: number; compileMs: number; cacheHits: number; cacheMisses: number;
}> {
  const results = new Map<string, CandidateCss>();
  const diagnostics: Finding[] = [];
  if (entry === null) return { diagnostics, hoverVariants: [], theme: [], candidates: results, suggestions: [], loadMs: 0, compileMs: 0, cacheHits: 0, cacheMisses: 0 };
  if (!version?.startsWith('4.')) throw new UsageError(`${version ? `Tailwind ${version} is not supported.` : 'Tailwind is not installed.'} ${tailwindFix}`);
  const start = performance.now();
  function skipped(error: unknown) {
    const message = errorMessage(error);
    diagnostics.push(unreadable(entry!, entry!, message));
    for (const candidate of candidates) results.set(candidate, { css: null, declarations: [], notes: [], unreadable: message });
    return { diagnostics, hoverVariants: [], theme: [], candidates: results, suggestions: [], loadMs: performance.now() - start, compileMs: 0, cacheHits: 0, cacheMisses: candidates.length };
  }
  try {
    const require = createRequire(join(dirname(entry), 'package.json'));
    const tailwindPath = require.resolve('tailwindcss');
    let cssGraph: Awaited<ReturnType<typeof tailwindGraph>>;
    try { cssGraph = memory?.graph ?? await tailwindGraph(entry); }
    catch (error) { return skipped(error); }
    if (memory) memory.graph = cssGraph;
    const key = hash(`${cssGraph.hash}\n${version}\n${tool.version}\nmessages-keyword-values-v7-elevation-ring-layer-refs`);
    const directory = resolve(cacheDirectory(root), key);
    let cached: Record<string, CandidateCss> = Object.create(null) as Record<string, CandidateCss>;
    try { cached = memory?.cached ?? Object.assign(Object.create(null) as Record<string, CandidateCss>, JSON.parse(await readFile(join(directory, 'candidates.json'), 'utf8')) as Record<string, CandidateCss>); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
    let cachedCount = memory?.cachedCount ?? Object.keys(cached).length;
    const misses = candidates.filter(candidate => !Object.hasOwn(cached, candidate));
    let system: DesignSystem | undefined = memory?.system;
    let defaultVariants = new Set<string>();
    let theme: ThemeValue[] | null = memory?.theme ?? null;
    if (!theme) try { theme = JSON.parse(await readFile(join(directory, 'theme.json'), 'utf8')); } catch { /* Optional theme cache. */ }
    // Hints depend on the roots present in this candidate set, whereas compiled
    // CSS remains reusable when a source slice adds/removes candidates.
    const suggestionPath = join(directory, `suggestions-${hash(JSON.stringify(candidates))}.json`);
    let suggestions: { token: string; prefix: string }[] | null = null;
    if (!memory?.system) try { suggestions = JSON.parse(await readFile(suggestionPath, 'utf8')); } catch { /* Optional hint index. */ }
    const hoverPath = join(directory, 'hover-variants-v3.json');
    let hoverVariants: string[] | null = probeHover ? memory?.hoverVariants ?? null : [];
    if (probeHover && !memory?.hoverVariants) try { hoverVariants = JSON.parse(await readFile(hoverPath, 'utf8')); } catch { /* Oracle proof cache follows compiler/graph identity. */ }
    // A fully warm run doesn't even load the design system.
    if (!system && (memory || misses.length || suggestions === null || theme === null || hoverVariants === null)) {
      let compilerPath = tailwindPath;
      let nodeWrapper = false;
      try {
        // Tests force the plain tailwindcss path that projects without @tailwindcss/node take.
        if (environment('TAILWIND_DIRECT') === '1') throw Object.assign(new Error('direct'), { code: 'MODULE_NOT_FOUND' });
        const nodePath = require.resolve('@tailwindcss/node');
        const nodeRequire = createRequire(nodePath);
        if (nodeRequire.resolve('tailwindcss') === tailwindPath) { compilerPath = nodePath; nodeWrapper = true; }
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') throw error; }
      // require.resolve finds a package's CommonJS build; importing that puts the API under default.
      const loaded = await import(pathToFileURL(compilerPath).href) as Partial<Compiler> & { default?: Partial<Compiler> };
      const compiler = (typeof loaded.__unstable__loadDesignSystem === 'function' ? loaded : loaded.default) as Compiler;
      if (typeof compiler?.__unstable__loadDesignSystem !== 'function') throw new Error(`${compilerPath} does not export __unstable__loadDesignSystem; React Plumber needs Tailwind CSS 4.`);
      const options: LoaderOptions = { base: dirname(entry) };
      if (!nodeWrapper) {
        options.loadStylesheet = async (id, base) => {
          const path = resolveStylesheet(id, base);
          return { path, base: dirname(path), content: await readFile(path, 'utf8') };
        };
        options.loadModule = async (id, base) => {
          const path = resolved(jsResolver, id, base);
          const module = await import(pathToFileURL(path).href) as { default?: unknown };
          return { path, base: dirname(path), module: module.default ?? module };
        };
      }
      if (probeHover && hoverVariants === null) {
        const baseline = await compiler.__unstable__loadDesignSystem('', options);
        defaultVariants = new Set(baseline.variants?.keys() ?? []);
      }
      try { system = await compiler.__unstable__loadDesignSystem(await readFile(entry, 'utf8'), options); }
      catch (error) { return skipped(error); }
    }
    const failures = new Map<string, string>();
    let hoverFailed = false, hintsFailed = false;
    // Keep the fast batch path. Retry individually only when the compiler throws.
    function compileCandidates(names: string[]): (string | null)[] {
      try { return system!.candidatesToCss(names); }
      catch {
        return names.map(name => {
          try { return system!.candidatesToCss([name])[0] ?? null; }
          catch (error) { failures.set(name, errorMessage(error)); return null; }
        });
      }
    }
    function parsedCandidates(name: string): ParsedCandidate[] {
      try { return [...system!.parseCandidate(name)]; }
      catch (error) { hintsFailed = true; diagnostics.push(unreadable(entry!, name, error)); return []; }
    }
    if (system && probeHover && hoverVariants === null) {
      const roots = [...new Set(['pointer-hover', ...cssGraph.variants, ...[...(system.variants?.keys() ?? [])].filter(name => system!.variants?.kind(name) === 'static' && !defaultVariants.has(name))])];
      const variants = [...roots, ...roots.flatMap(name => [`group-${name}`, `peer-${name}`, `${name}:hover`, `${name}:group-hover`, `${name}:peer-hover`])];
      const prefix = system.theme?.prefix ? `${system.theme.prefix}:` : '';
      const probes = compileCandidates(variants.map(name => `${prefix}${name}:[--plumb-hover-probe:1]`));
      hoverVariants = variants.filter((_, i) => {
        const name = `${prefix}${variants[i]}:[--plumb-hover-probe:1]`;
        let declarations: CandidateCss['declarations'];
        try {
          if (failures.has(name)) throw new Error(failures.get(name));
          declarations = lowerCss(probes[i] ?? null).declarations;
        } catch (error) { hoverFailed = true; diagnostics.push(unreadable(entry!, name, error)); return false; }
        return declarations.length > 0 && declarations.every(d => positivePseudo(selector(d.when), 'hover') && hoverGated(d.when));
      });
    }
    if (system && !memory?.theme) theme = [...(system.theme?.entries() ?? [])].map(([name, metadata]) => ({ name, value: metadata.value }));
    const loadMs = performance.now() - start;
    const compileStart = performance.now();
    if (system && misses.length) {
      const css = compileCandidates(misses);
      for (const [index, candidate] of misses.entries()) {
        try {
          if (failures.has(candidate)) throw new Error(failures.get(candidate));
          // Parsing can return several interpretations (e.g. mt-auto is both
          // static and functional). Only a compiling value-bearing parse is
          // evidence that the author supplied a value, rather than a utility.
          const authoredValue = [...system.parseCandidate(candidate)].some(parsed =>
            (parsed.kind === 'arbitrary' || parsed.kind === 'functional' && parsed.value != null && !(parsed.value.kind === 'named' && ['full', 'none', 'px'].includes(parsed.value.value))) && system.compileAstNodes(parsed).length > 0);
          const result = lowerCss(css[index] ?? null);
          for (const parsed of system.parseCandidate(candidate)) {
            // @theme inline erases these names from transition utility output.
            // Preserve the compiler's default-key identity, as for named values.
            if (parsed.root === 'transition' && system.compileAstNodes(parsed).length) {
              for (const declaration of result.declarations) {
                const name = declaration.prop === 'transition-duration' ? '--default-transition-duration' :
                  declaration.prop === 'transition-timing-function' ? '--default-transition-timing-function' : undefined;
                const token = name && theme!.find(item => item.name === name);
                const fallback = /^var\(--tw-(?:duration|ease),\s*([\s\S]+)\)$/.exec(declaration.value)?.[1];
                if (token && fallback && [token.value, `var(${token.name})`].some(value => value.replace(/\s/g, '') === fallback.replace(/\s/g, ''))) {
                  declaration.decisionRefs = [token.name];
                }
              }
            }
            if (parsed.kind !== 'functional' || parsed.value?.kind !== 'named' || !system.compileAstNodes(parsed).length) continue;
            for (const declaration of result.declarations) {
              const prop = declaration.prop;
              const namespace = prop === 'box-shadow' ? '--shadow-' : prop === 'font-weight' ? '--font-weight-' :
                /^(?:color|background-color|(?:border|outline|text-decoration)-color|fill|stroke|caret-color|accent-color)$/.test(prop) ? '--color-' :
                /radius$/.test(prop) ? '--radius-' : prop === 'font-size' ? '--text-' : prop === 'font-family' ? '--font-' :
                prop === 'line-height' ? '--leading-' : prop === 'letter-spacing' ? '--tracking-' :
                /timing-function$/.test(prop) ? '--ease-' : /duration$/.test(prop) ? '--duration-' : prop === 'z-index' ? '--z-' :
                /^(?:gap|row-gap|column-gap|padding(?:-.+)?|margin(?:-.+)?|inset(?:-.+)?|top|right|bottom|left)$/.test(prop) ? '--spacing-' : undefined;
              const name = namespace && `${namespace}${parsed.value.value}`;
              if (name && theme!.some(item => item.name === name)) declaration.decisionRefs = [name];
            }
          }
          cached[candidate] = { ...result, authoredValue }; cachedCount++;
        }
        catch (error) {
          if (error instanceof SyntaxError) {
            // Invalid authored selectors remain diagnostic-only and are retried
            // on later reads rather than cached as successfully lowered.
            results.set(candidate, { css: css[index] ?? null, declarations: [], notes: [`Could not lower ${candidate}: ${errorMessage(error)}`], unreadable: errorMessage(error) });
          } else {
            // Retain compiler text for existence proof; never judge failed CSS.
            cached[candidate] = { css: css[index] ?? null, declarations: [], notes: [], unreadable: errorMessage(error) }; cachedCount++;
          }
        }
      }
    }
    const compileMs = system && misses.length ? performance.now() - compileStart : 0;
    const usedRoots = new Set(system ? candidates.filter(name => !cached[name]?.unreadable && cached[name]?.css?.trim()).flatMap(name =>
      parsedCandidates(name).filter(candidate => candidate.kind === 'functional' && candidate.value != null).map(candidate => candidate.root)) : []);
    const requestedRoots = new Set(system ? candidates.filter(name => !cached[name]?.unreadable).flatMap(name => parsedCandidates(name)
      .filter(candidate => candidate.kind === 'functional' && candidate.value != null).map(candidate => candidate.root)) : []);
    const hintKey = JSON.stringify([[...usedRoots].sort(), [...requestedRoots].sort()]);
    const warmHints = memory?.hints?.get(hintKey);
    if (warmHints) suggestions = warmHints;
    if (system && !warmHints) {
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
      const staticRoots = new Set(system.utilities?.keys('static') ?? []);
      for (const root of system.utilities?.keys('functional') ?? []) {
        // A static utility such as block is also a functional root in v4.
        // Do not invent value hints for that second meaning without usage proof.
        if (!usedRoots.has(root) && (!requestedRoots.has(root) || staticRoots.has(root))) continue;
        let completions: ReturnType<NonNullable<DesignSystem['utilities']>['getCompletions']>;
        try { completions = system.utilities!.getCompletions(root); }
        catch (error) { hintsFailed = true; diagnostics.push(unreadable(entry, root, error)); continue; }
        for (const group of completions) {
          for (const value of group.values) if (value !== null && values.has(value)) own.set(`${root}-${value}`, `${root}-`);
        }
      }
      suggestions = [...own].map(([token, prefix]) => ({ token: system.theme?.prefix ? `${system.theme.prefix}:${token}` : token, prefix }));
      if (memory && !hintsFailed) { const hints = memory.hints ??= new Map(); if (hints.size >= 2) hints.delete(hints.keys().next().value!); hints.set(hintKey, suggestions); }
    }
    if (!readOnly && (misses.length || system)) {
      await mkdir(directory, { recursive: true });
      const temporary = join(directory, `candidates-${process.pid}.json`);
      await writeFile(temporary, JSON.stringify(cached));
      await rename(temporary, join(directory, 'candidates.json'));
      if (!hintsFailed) await writeFile(suggestionPath, JSON.stringify(suggestions));
      await writeFile(join(directory, 'theme.json'), JSON.stringify(theme));
      if (probeHover && !hoverFailed) await writeFile(hoverPath, JSON.stringify(hoverVariants));
    }
    if (memory) { memory.cached = cached; memory.cachedCount = cachedCount; if (system) memory.system = system; memory.theme = theme ?? []; if (hoverFailed) delete memory.hoverVariants; else memory.hoverVariants = hoverVariants ?? []; }
    for (const candidate of candidates) if (!results.has(candidate)) results.set(candidate, cached[candidate]!);
    for (const [candidate, value] of results) if (value.unreadable) diagnostics.push(unreadable(entry, candidate, value.unreadable));
    suggestions = suggestions?.filter(hint => !cached[hint.token]?.unreadable) ?? [];
    return { diagnostics, hoverVariants: hoverVariants ?? [], theme: theme ?? [], candidates: results, suggestions: suggestions ?? [], loadMs, compileMs, cacheHits: candidates.length - misses.length, cacheMisses: misses.length };
  } catch (error) {
    throw new UsageError(`Load project Tailwind from ${dirname(entry)}: ${errorMessage(error)}`);
  }
}
