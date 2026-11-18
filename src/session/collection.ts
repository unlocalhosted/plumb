import { profileDuration } from '../profile.js';
import { environment } from '../paths.js';
import { parseSync } from 'oxc-parser';
import { readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { ResolverFactory } from 'oxc-resolver';
import { collectClasses } from '../collect/classes.js';
import { internAll } from '../collect/strings.js';
import type { CollectionMemory } from '../collect/classes.js';
import type { ClassSite } from '../collect/classes.js';
import type { SourceProgram } from '../collect/source.js';
import type { SourceStyles } from '../collect/inline.js';
import type { ModuleImport } from '../collect/modules.js';
import { moduleImports } from '../collect/modules.js';
import { sourceHash } from '../collect/cache.js';

import type { PlumbConfig } from '../config.js';

export function dependencySpecifiers(file: string, text: string, dynamic = false): string[] {
  let module: ReturnType<typeof parseSync>['module'];
  try { const parsed = parseSync(file, text); if (parsed.errors.length) return []; module = parsed.module; } catch { return []; }
  return [...new Set([...module.staticImports.map(edge => edge.moduleRequest.value),
    ...(dynamic ? moduleImports(module, text).map(edge => edge.specifier) : []),
    ...module.staticExports.flatMap(edge => edge.entries.flatMap(entry => entry.moduleRequest ? [entry.moduleRequest.value] : []))])];
}

type Collection = Awaited<ReturnType<typeof collectClasses>>;
interface Slice { hash: string; dependencies: Map<string, string>; value: Collection }
/** The parsed files collection shares while it runs: a file imported by its neighbours is parsed once. Only the most
 * recently used are kept, so a large app never holds every file's syntax tree at once; a dropped one is parsed again. */
export class RecentPrograms extends Map<string, SourceProgram> {
  constructor(private limit: number) { super(); }
  override get(key: string): SourceProgram | undefined {
    const value = super.get(key); if (value === undefined) return;
    super.delete(key); super.set(key, value); return value;
  }
  override set(key: string, value: SourceProgram): this {
    super.delete(key); super.set(key, value);
    while (this.size > this.limit) super.delete(this.keys().next().value!);
    return this;
  }
}
export class CollectionState {
  readonly slices = new Map<string, Slice>();
  readonly dependencies = new Set<string>();
  parsedFiles: string[] = [];
  readonly consumers = new Map<string, Set<string>>();
  private definitions = new Map<string, SourceStyles['declarations']>();
  visitedFiles: string[] = [];
  /** where a whole collection's time goes (profiling): reading text, collecting classes, imports, component shards */
  spent = { read: 0, classes: 0, parse: 0, imports: 0, shards: 0 };
  private dirty = new Set<string>();
  private memory: CollectionMemory | undefined;
  /** the hash of each imported file, during one whole collection (files don't change under it) */
  private hashes: Map<string, string> | undefined;
  programs: CollectionMemory['programs'] = new Map();
  specifiers: CollectionMemory['specifiers'] = new Map();
  markChanged(paths: string[]): void { for (const path of paths) this.dirty.add(path); }
  constructor(private root: string) {}
  private resolver = new ResolverFactory({ tsconfig: 'auto', extensions: ['.tsx', '.ts', '.jsx', '.js'], extensionAlias: { '.js': ['.ts', '.tsx', '.js'] }, conditionNames: ['import', 'node', 'default'] });
  invalidate(): void { this.slices.clear(); this.dependencies.clear(); this.resolver.clearCache(); }
  // The collector follows one-hop literal imports. Track all direct imports,
  // including types, conservatively; resolver changes rebuild the session.
  private imports(file: string, text: string): Map<string, string> {
    const dependencies = new Map<string, string>();
    for (const specifier of this.memory?.specifiers.get(file) ?? dependencySpecifiers(file, text)) {
      const target = this.resolver.resolveFileSync(file, specifier).path;
      if (!target || !/\.[cm]?[jt]sx?$/.test(target)) continue;
      try {
        // one read and hash per imported file in a whole collection: a shared component is imported by hundreds
        let hash = this.hashes?.get(target);
        if (hash === undefined) { hash = sourceHash(readFileSync(target, 'utf8')); this.hashes?.set(target, hash); }
        dependencies.set(target, hash); this.dependencies.add(target);
      } catch { /* The collector reports unreadable imports that it uses. */ }
    }
    return dependencies;
  }
  private async read(file: string, config: PlumbConfig, input?: { file: string; text: string; lang: 'tsx' | 'css' }, collected?: Collected): Promise<Collection> {
    this.visitedFiles.push(file);
    const old = this.slices.get(file);
    const overlay = !!input && old?.dependencies.has(input.file);
    if (file !== input?.file && !overlay && old && !this.dirty.has(file) && ![...old.dependencies.keys()].some(path => this.dirty.has(path))) return old.value;
    let text: string | undefined;
    let at = performance.now();
    try { text = file === input?.file ? input.text : readFileSync(file, 'utf8'); } catch { /* Collection reports the read failure. */ }
    this.spent.read += performance.now() - at; at = performance.now();
    const hash = sourceHash(text ?? '<unreadable>');
    const valid = old?.hash === hash && [...old.dependencies].every(([path, previous]) => {
      try { return sourceHash(path === input?.file ? input.text : readFileSync(path, 'utf8')) === previous; } catch { return false; }
    });
    if (valid) return old.value;
    // collected on another thread (the session's first collection), or here
    if (collected?.specifiers) this.memory?.specifiers.set(file, collected.specifiers);
    const value = collected?.value ?? await collectClasses([file], config.classHelpers, new Map([...(input ? [[input.file, input.text] as const] : []), ...(text === undefined ? [] : [[file, text] as const])]), undefined, undefined, undefined, this.memory);
    // the results keep names and values cut from the file's text; the table's copies let the text go
    internAll([value.sites, value.styles, value.diagnostics, value.modules]);
    this.spent.classes += performance.now() - at; at = performance.now();
    this.spent.parse += value.parseMs;
    if (old && file !== input?.file) {
      const stable = (value: unknown) => JSON.stringify(value, (key, item) => key === 'resolved' ? undefined : item);
      const sites = new Map(old.value.sites.map(site => [stable(site), site]));
      value.sites = value.sites.map(site => sites.get(stable(site)) ?? site);
      const ds = new Map(old.value.styles.declarations.map(d => [stable(d), d]));
      const declarations = new Map(value.styles.declarations.map(d => [d, ds.get(stable(d)) ?? d]));
      value.styles.declarations = [...declarations.values()];
      for (const site of value.styles.sites) site.declarations = site.declarations.map(d => declarations.get(d)!);
    }
    this.parsedFiles.push(file);
    if (!input) {
      for (const path of old?.dependencies.keys() ?? []) { const users = this.consumers.get(path); users?.delete(file); if (!users?.size) this.consumers.delete(path); }
      const dependencies = this.imports(file, text ?? '');
      for (const path of value.computedDependencies ?? []) if (path !== file) {
        this.dependencies.add(path);
        try { dependencies.set(path, sourceHash(readFileSync(path, 'utf8'))); } catch { /* Collection reports unreadable computed imports. */ }
      }
      this.spent.imports += performance.now() - at;
      this.slices.set(file, { hash, dependencies, value });
      for (const path of dependencies.keys()) { let users = this.consumers.get(path); if (!users) this.consumers.set(path, users = new Set()); users.add(file); }
      const definitions = value.styles.declarations.filter(d => d.prop.startsWith('--'));
      if (definitions.length) this.definitions.set(file, definitions); else this.definitions.delete(file);
    }
    return value;
  }
  async refresh(paths: string[], config: PlumbConfig): Promise<string[]> {
    const affected = new Set(paths.filter(file => this.slices.has(file)));
    for (const path of paths) for (const file of this.consumers.get(path) ?? []) affected.add(file);
    this.parsedFiles = []; this.visitedFiles = [];
    for (const file of affected) await this.read(file, config);
    this.dirty.clear();
    return [...affected];
  }
  local(file: string): Collection {
    const value = this.slices.get(file)?.value ?? { diagnostics: [], sites: [], styles: { declarations: [], sites: [], stylesheets: [], imports: [], definedVariables: [] }, modules: new Map(), opaque: 0, parseMs: 0, collectMs: 0, inlineMs: 0 };
    // Shared definitions are semantic inputs, retained by file across targeted refreshes.
    return { ...value, styles: { ...value.styles, declarations: [...value.styles.declarations, ...[...this.definitions].flatMap(([source, ds]) => source === file ? [] : ds)] } };
  }
  /** `afterFile`: called after each file is collected, while its parsed code is still among the shared programs. */
  async collect(files: string[], config: PlumbConfig, input?: { file: string; text: string; lang: 'tsx' | 'css' }, afterFile?: (file: string) => void): Promise<Collection> {
    const current = new Set(files);
    if (!input) for (const file of this.slices.keys()) if (!current.has(file)) this.slices.delete(file);
    const values: Collection[] = [];
    this.memory = { programs: new RecentPrograms(256), imports: new Map(), specifiers: new Map(), texts: new Map() };
    this.hashes = input ? undefined : new Map();
    // visible while collecting, so a component shard built after each file (afterFile) reuses its parsed code
    this.programs = this.memory.programs;
    this.specifiers = this.memory.specifiers;
    this.parsedFiles = []; this.visitedFiles = [];
    const sources = files.filter(file => file === input?.file ? input.lang === 'tsx' : /\.[jt]sx?$/.test(file));
    const threads = !input && this.slices.size === 0 ? collectOnThreads(sources, config) : undefined;
    try {
      for (const file of sources) {
        values.push(await this.read(file, config, input, await threads?.get(file)));
        afterFile?.(file);
      }
    } finally { threads?.stop(); }
    this.programs = this.memory.programs;
    this.specifiers = this.memory.specifiers;
    this.memory = undefined; this.hashes = undefined;
    for (const [name, ms] of Object.entries(this.spent)) profileDuration(`collect:${name}`, ms);
    this.spent = { read: 0, classes: 0, parse: 0, imports: 0, shards: 0 };
    if (!input) this.dirty.clear();
    const sites = new Map<string, ClassSite>(), modules = new Map<string, ModuleImport[]>();
    const styles: SourceStyles = { declarations: [], sites: [], stylesheets: [], imports: [], definedVariables: [] };
    for (const value of values) {
      for (const site of value.sites) sites.set(`${site.file}\0${site.line}:${site.column}\0${site.token}\0${JSON.stringify([site.owner, site.conditions, !!site.opaque])}`, site);
      for (const [file, imports] of value.modules) modules.set(file, imports);
      for (const key of ['declarations', 'sites', 'stylesheets', 'imports', 'definedVariables'] as const) (styles[key] as unknown[]).push(...value.styles[key]);
    }
    return { diagnostics: values.flatMap(value => value.diagnostics), sites: [...sites.values()], styles, modules, computedClassFiles: [...new Set(values.flatMap(value => value.computedClassFiles ?? []))], opaque: values.reduce((sum, v) => sum + v.opaque, 0),
      parseMs: 0, collectMs: 0, inlineMs: 0 };
  }
}

type Collected = { value: Awaited<ReturnType<typeof collectClasses>>; specifiers?: string[] | undefined };
/** A session's first collection of a large app on a few threads at once: each file is collected there exactly as it is
 * here (collectClasses, one file, its own parse cache), and the answers are read back in file order. 3,649 files on
 * algorecall spent 10.5 s collecting on one thread. Small apps, edits and helpers that can't be sent to a thread (a
 * function in the config) keep the one thread. */
const THREADS_FROM = 400;
function collectOnThreads(files: string[], config: PlumbConfig): { get(file: string): Promise<Collected | undefined>; stop(): void } | undefined {
  const count = Math.min(4, Math.max(0, availableParallelism() - 2));
  if (files.length < THREADS_FROM || count < 2 || environment('COLLECT_THREADS') === '0') return undefined;
  try { structuredClone(config.classHelpers ?? []); } catch { return undefined; }
  const waiting = new Map<string, { promise: Promise<Collected | undefined>; resolve: (value: Collected | undefined) => void }>();
  for (const file of files) { let resolve!: (value: Collected | undefined) => void; const promise = new Promise<Collected | undefined>(r => { resolve = r; }); waiting.set(file, { promise, resolve }); }
  const workers = Array.from({ length: count }, (_, i) => {
    const share = files.filter((_, at) => at % count === i);
    const worker = new Worker(new URL('./collect-thread.js', import.meta.url), { workerData: { files: share, classHelpers: config.classHelpers ?? [] } });
    // an answer that doesn't come (an error, a thread that stopped) is collected here instead
    worker.on('message', (message: { file: string; value?: Collected['value']; specifiers?: string[]; error?: string }) => waiting.get(message.file)?.resolve(message.value ? { value: message.value, specifiers: message.specifiers } : undefined));
    const settle = () => { for (const file of share) waiting.get(file)?.resolve(undefined); };
    worker.on('error', settle); worker.on('exit', settle);
    return worker;
  });
  return { get: file => waiting.get(file)?.promise ?? Promise.resolve(undefined), stop: () => { for (const worker of workers) void worker.terminate(); } };
}
