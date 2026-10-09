import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { parseSync } from 'oxc-parser';
import type { EcmaScriptModule } from 'oxc-parser';
import { ResolverFactory } from 'oxc-resolver';
import { UsageError } from '../errors.js';
import type { Report } from '../report.js';

export interface ModuleImport { specifier: string; sideEffect: boolean }
export interface CssImport { file: string; specifier: string; resolved?: string; external?: boolean }
const moduleFile = (file: string) => /\.(?:[jt]sx?|[mc][jt]s)$/.test(file) && !/\.d\.[cm]?ts$/.test(file);

// Oxc's module record is independent of its program getter: external modules
// never deserialize a whole JS AST. Type-only imports/exports are not runtime edges.
export function moduleImports(module: EcmaScriptModule, text: string): ModuleImport[] {
  const imports: ModuleImport[] = [];
  for (const item of module.staticImports) {
    if (!item.entries.length || item.entries.some(entry => !entry.isType)) imports.push({ specifier: item.moduleRequest.value, sideEffect: !item.entries.length });
  }
  for (const item of module.staticExports) for (const entry of item.entries) {
    if (!entry.isType && entry.moduleRequest) imports.push({ specifier: entry.moduleRequest.value, sideEffect: false });
  }
  for (const item of module.dynamicImports) {
    const literal = text.slice(item.moduleRequest.start, item.moduleRequest.end);
    if (!/^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/s.test(literal)) continue;
    // Let the JS parser decode escapes; JSON decoding misses single quotes,
    // Unicode/hex escapes and line continuations. This parses only one import.
    const decoded = parseSync('import.js', `import ${literal}`).module.staticImports[0]?.moduleRequest.value;
    if (decoded !== undefined) imports.push({ specifier: decoded, sideEffect: false });
  }
  return imports;
}

interface CachedModule { mtimeMs: number; size: number; imports: ModuleImport[]; resolved: (string | null)[] }

export async function collectModules(root: string, sources: Map<string, ModuleImport[]>, readOnly = false): Promise<{
  imports: CssImport[]; notes: string[]; counts: Report['moduleGraph'];
}> {
  const start = performance.now();
  const hasModules = await stat(join(root, 'node_modules')).then(info => info.isDirectory()).catch(() => false);
  const directory = resolve(process.env.PLUMB_CACHE_DIR ?? join(root, hasModules ? 'node_modules/.cache/plumb' : '.plumb-cache'), 'modules');
  const path = join(directory, `${createHash('sha256').update(`module-graph-v1\n${root}`).digest('hex')}.json`);
  let cache: Record<string, CachedModule> = Object.create(null) as Record<string, CachedModule>;
  try { cache = Object.assign(cache, JSON.parse(await readFile(path, 'utf8')) as Record<string, CachedModule>); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
  const nextCache: Record<string, CachedModule> = Object.create(null) as Record<string, CachedModule>;
  const resolver = new ResolverFactory({ tsconfig: 'auto', extensions: ['.tsx', '.ts', '.jsx', '.js', '.mts', '.mjs', '.cts', '.cjs'],
    extensionAlias: { '.js': ['.ts', '.tsx', '.js'], '.mjs': ['.mts', '.mjs'], '.cjs': ['.cts', '.cjs'] },
    conditionNames: ['import', 'browser', 'default'], mainFields: ['browser', 'module', 'main'], aliasFields: ['browser'], builtinModules: true });
  const queue = [...sources.keys()].filter(moduleFile);
  const sourcePaths = new Map(queue.map(file => {
    try { return [realpathSync.native(file), file]; }
    catch (error) { if (readOnly && (error as NodeJS.ErrnoException).code === 'ENOENT') return [file, file]; throw error; }
  }));
  const seen = new Set(queue);
  const imports: CssImport[] = [];
  const notes: string[] = [];
  const counts: Report['moduleGraph'] = { modules: 0, followed: 0, cssFiles: 0, cacheHits: 0, cacheMisses: 0, parseMs: 0, totalMs: 0 };
  let bytes = 0;
  let limited = 0;
  const limit = (file: string) => {
    if (!limited++) notes.push(`Module graph limit reached at ${file}; CSS existence proof may be incomplete.`);
  };
  for (let index = 0; index < queue.length; index++) {
    const file = queue[index]!;
    const external = !sources.has(file);
    let edges = sources.get(file);
    let cached: CachedModule | undefined;
    if (external) {
      const info = statSync(file);
      if (bytes + info.size > 64 * 1024 * 1024 || info.size > 4 * 1024 * 1024) {
        limit(file);
        continue;
      }
      bytes += info.size;
      counts.followed++;
      const previous = cache[file];
      if (previous?.mtimeMs === info.mtimeMs && previous.size === info.size) {
        cached = previous; edges = previous.imports; counts.cacheHits++;
      } else {
        const text = readFileSync(file, 'utf8');
        const parseStart = performance.now();
        const parsed = parseSync(file, text);
        if (parsed.errors.length) throw new UsageError(`Read module imports ${file}: ${parsed.errors[0]?.message}`);
        edges = moduleImports(parsed.module, text);
        counts.parseMs += performance.now() - parseStart;
        cached = { mtimeMs: info.mtimeMs, size: info.size, imports: edges, resolved: [] };
        counts.cacheMisses++;
      }
      nextCache[file] = cached;
    }
    counts.modules++;
    const resolved: (string | null)[] = [];
    for (const edge of edges ?? []) {
      // Revalidate resolution even on warm hits: package exports, symlinks and
      // tsconfig paths can change independently of the importing module's stat.
      const path = resolver.resolveFileSync(file, edge.specifier).path;
      const target = path ? sourcePaths.get(path) ?? path : undefined;
      resolved.push(target ?? null);
      if (target?.endsWith('.css')) {
        imports.push({ file, specifier: edge.specifier, resolved: target, external });
      } else if (edge.sideEffect || /\.css(?:[?#].*)?$/.test(edge.specifier)) {
        // Preserve style-export/package-root CSS resolution from Layer 2.
        imports.push({ file, specifier: edge.specifier, external });
      }
      if (!target || !moduleFile(target) || seen.has(target)) continue;
      seen.add(target);
      if (queue.length >= sources.size + 20_000) { limit(target); continue; }
      queue.push(target);
    }
    if (cached) nextCache[file] = { ...cached, resolved };
  }
  if (limited) notes.push(`Module graph skipped ${limited} modules at its 20,000-module, 64 MiB total or 4 MiB per-file limit.`);
  if (!readOnly) {
    await mkdir(directory, { recursive: true });
    const temporary = `${path}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(nextCache));
    await rename(temporary, path);
  }
  counts.totalMs = performance.now() - start;
  return { imports, notes, counts };
}
