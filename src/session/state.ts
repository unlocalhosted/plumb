import { readFileSync } from 'node:fs';
import type { AnalysisRuntime } from './runtime.js';
import { CollectionState, dependencySpecifiers } from './collection.js';
import { JudgementState } from './judgement.js';
import { lowerTailwind } from '../lower/tailwind.js';
import type { TailwindMemory } from '../lower/tailwind.js';
import { componentBatch, discoverComponents } from '../ownership/components.js';
import type { ComponentGraph, ComponentMemory } from '../ownership/components.js';
import type { LoweredProps } from '../ownership/judge.js';
import type { PlumbConfig } from '../config.js';
import { sourceHash } from '../collect/cache.js';
import { ResolverFactory } from 'oxc-resolver';
import type { Declaration } from '../report.js';
import { RankingState } from './ranking.js';
import { references } from '../collect/source.js';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { sourceSelectors } from '../source-boundary.js';
import { collectStylesheets, cssImports } from '../collect/stylesheets.js';
import { lowerStylesheets, lowerStylesheet } from '../lower/stylesheets.js';
import { declaredClasses } from '../lower/css.js';
import { presetInputs } from '../presets/index.js';
import { defaultSourceSelectors } from '../project.js';

import type { StylesheetGraph } from '../collect/stylesheets.js';

const signature = (inputs: unknown[]) => JSON.stringify(inputs, (_, value) => value instanceof Map || value instanceof Set ? [...value] : value);
interface Memo { key: string; value: unknown }
export class WarmState implements AnalysisRuntime {
  readonly collection: CollectionState;
  judgement = new JudgementState();
  /** set while the session's start-up runs the analysis: read what the app shares, judge nothing (runtime.ts) */
  prepareOnly = false;
  readonly localJudgements = new Map<string, JudgementState>();
  /** Lets go of what only the whole-app judgement keeps: its caches, every site's expanded declarations and the merged
   * component graph. The collected files, the component shards and the app-wide phases stay, so a file is judged
   * alone as fast as before, and the whole app again when asked (docs/briefs/analysis-memory.md, open page first). */
  /** The project's source files as the whole-app analysis counted them (its file list and computed class files), one set
   * per list. */
  projectFileSet(): ReadonlySet<string> | undefined {
    const files = this.shared<string[]>('files'), collected = this.shared<{ computedClassFiles?: string[] }>('collect');
    if (!files) return undefined;
    if (this.projectFilesFor?.files !== files || this.projectFilesFor.collected !== collected) this.projectFilesFor = { files, collected, set: new Set([...files, ...collected?.computedClassFiles ?? []]) };
    return this.projectFilesFor.set;
  }
  private projectFilesFor: { files: string[]; collected: unknown; set: ReadonlySet<string> } | undefined;
  release(): void { this.judgement = new JudgementState(); this.siteCache = new WeakMap(); this.globalGraph = undefined; this.dead = undefined; }
  localJudgement(file: string): JudgementState {
    let value = this.localJudgements.get(file);
    if (!value) { if (this.localJudgements.size >= 64) this.localJudgements.delete(this.localJudgements.keys().next().value!); value = new JudgementState(); this.localJudgements.set(file, value); }
    return value;
  }
  readonly shards = new Map<string, ComponentGraph>();
  readonly dependencies = new Set<string>();
  readonly configurationFiles = new Set<string>();
  /** the modules walked to choose the Tailwind entry and their import lists (discoverProject): a change to one is a
   * configuration change only when its imports change */
  readonly entryGraph = new Map<string, string | null>();
  readonly patterns = new Set<string>();
  readonly inputPatterns = new Set<string>();
  private componentConsumers = new Map<string, Set<string>>();
  private componentDependencies = new Map<string, Set<string>>();
  private dependencyEdges = new Map<string, string[]>();
  // the parsed modules the component graph reads, the most recently used ones only: kept for every file, they held each
  // file's whole syntax tree for the life of the session (most of 2 GB on a 3,600-file app); one dropped is parsed again
  private componentMemory: ComponentMemory = { modules: new Map() };
  private snippetGraph: { key: string; value: ComponentGraph } | undefined;
  private componentResolver = new ResolverFactory({ tsconfig: 'auto', extensions: ['.tsx', '.ts', '.jsx', '.js', '.mts', '.mjs', '.cts', '.cjs'], extensionAlias: { '.js': ['.ts', '.tsx', '.js'] }, conditionNames: ['import', 'browser', 'default'], mainFields: ['browser', 'module', 'main'] });
  private globalGraph: { key: string; graph: ComponentGraph } | undefined;
  private componentHashes = new Map<string, string>();
  private phases = new Map<string, Memo>();
  private sharedContext = new Map<string, unknown>();
  private cssFiles = new Map<string, Declaration[]>();
  private cssDefinitions = new Map<string, Declaration[]>();
  private cssHashes = new Map<string, string>();
  private stylesheetClasses = new Map<string, Set<Declaration>>();
  private classKeys(d: Declaration): string[] {
    if (!['stylesheet', 'apply'].includes(d.origin)) return [];
    return d.when.filter(condition => condition.kind === 'selector' && !/[\s>+~#]|:[\w-]+\(|\[/.test(condition.text)).flatMap(({ text }) => /\.([\w-]+)/.exec(text)?.[1] ?? []);
  }
  private setCss(file: string, declarations: Declaration[]): void {
    for (const d of this.cssFiles.get(file) ?? []) for (const token of this.classKeys(d)) { const ds = this.stylesheetClasses.get(token); ds?.delete(d); if (!ds?.size) this.stylesheetClasses.delete(token); }
    this.cssFiles.set(file, declarations);
    for (const d of declarations) for (const token of this.classKeys(d)) { let ds = this.stylesheetClasses.get(token); if (!ds) this.stylesheetClasses.set(token, ds = new Set()); ds.add(d); }
  }
  imitationStyles(tokens: string[], file: string): Declaration[] {
    return [...new Set(tokens.flatMap(token => [...this.stylesheetClasses.get(token) ?? []]))].filter(d => d.site.file !== file);
  }
  private rememberCss(value: Awaited<ReturnType<typeof lowerStylesheets>>): void {
    this.cssFiles.clear(); this.cssDefinitions.clear(); this.stylesheetClasses.clear(); this.cssHashes.clear();
    for (const d of value.declarations) { let ds = this.cssFiles.get(d.site.file); if (!ds) this.cssFiles.set(d.site.file, ds = []); ds.push(d); }
    for (const [file, ds] of this.cssFiles) { const definitions = ds.filter(d => d.prop.startsWith('--')); if (definitions.length) this.cssDefinitions.set(file, definitions); }
    for (const [file, ds] of this.cssFiles) this.setCss(file, ds);
  }
  private stylesheetShape(css: string, file: string): string {
    try { return JSON.stringify([cssImports(css), [...declaredClasses(css, file).classes].sort(), lowerStylesheet(css, file).filter(d => d.prop.startsWith('--')).map(d => [d.prop, d.value, d.when])]); }
    catch { return JSON.stringify(['unreadable', css]); }
  }
  embeddedShape(file: string): string[] {
    return (this.collection.slices.get(file)?.value.styles.stylesheets ?? []).map(sheet => this.stylesheetShape(sheet.css, file));
  }
  async refreshStyles(paths: string[]): Promise<boolean> {
    let structural = false;
    const graph = this.shared<StylesheetGraph>('graph');
    const project = this.shared<{ tailwind: { entry: string | null; version: string | null } }>('project');
    if (!graph || !project) return paths.some(file => file.endsWith('.css'));
    for (const file of paths.filter(file => file.endsWith('.css'))) {
      const old = graph.files.get(file);
      let text: string; try { text = readFileSync(file, 'utf8'); } catch { structural = true; continue; }
      this.cssHashes.set(file, sourceHash(text));
      if (!old || this.stylesheetShape(old.css, file) !== this.stylesheetShape(text, file)) { structural = true; continue; }
      const local = await collectStylesheets(project.tailwind.entry, [file], []);
      const value = await lowerStylesheets(this.root, project.tailwind.entry, project.tailwind.version, local, [], true);
      this.setCss(file, value.declarations.filter(d => d.site.file === file));
    }
    for (const file of paths.filter(file => !file.endsWith('.css'))) {
      const embedded = this.collection.slices.get(file)?.value.styles.stylesheets ?? [];
      if (!embedded.length && !this.cssFiles.has(file)) continue;
      const local = await collectStylesheets(project.tailwind.entry, [], []);
      const value = await lowerStylesheets(this.root, project.tailwind.entry, project.tailwind.version, local, embedded, true);
      this.setCss(file, value.declarations.filter(d => d.site.file === file));
    }
    return structural;
  }
  localStyles(file: string) {
    const base = this.shared<Awaited<ReturnType<typeof lowerStylesheets>>>('css');
    if (!base) throw new Error('Missing warm stylesheet context.');
    return { ...base, declarations: [...this.cssFiles.get(file) ?? [], ...[...this.cssDefinitions].flatMap(([source, ds]) => source === file ? [] : ds)] };
  }
  /** Declarations in any stylesheet that read one of these CSS variables: they decide how a variable a component sets
   * inline is judged (a background reading `var(--track-hex)` makes it a colour). */
  stylesReading(names: ReadonlySet<string>): Declaration[] {
    if (!names.size) return [];
    const out: Declaration[] = [];
    for (const ds of this.cssFiles.values()) for (const d of ds) if (!d.prop.startsWith('--') && d.value.includes('var(') && [...d.value.matchAll(/var\(\s*(--[\w-]+)/g)].some(m => names.has(m[1]!))) out.push(d);
    return out;
  }
  private siteCache = new WeakMap<object, { candidate: unknown; value: unknown }>();
  private compiler: TailwindMemory = {};
  private ranking = new RankingState();
  private snippetRanking = new RankingState();
  private dead: { refs: string; record: unknown; config: unknown; value: unknown } | undefined;
  private snippet = false;
  private initializedRules = new Set<string>();
  private reachability = new WeakMap<object, Map<string, Set<string>>>();
  private config: PlumbConfig = {};
  /** The project's config as loaded (presets merged): what the craft spec resolves from. */
  get settings(): PlumbConfig { return this.config; }
  constructor(readonly root: string, public inventory?: readonly string[]) { this.collection = new CollectionState(root); }
  private reachable(file: string, edges: ReadonlyMap<string, Iterable<string>>): Set<string> {
    let cache = this.reachability.get(edges);
    if (!cache) this.reachability.set(edges, cache = new Map());
    const old = cache.get(file); if (old) return old;
    const found = new Set<string>(), queue = [file];
    for (let i = 0; i < queue.length; i++) for (const next of edges.get(queue[i]!) ?? []) {
      if (next === file || found.has(next)) continue;
      found.add(next);
      const known = cache.get(next);
      if (known) for (const target of known) { if (target !== file) found.add(target); }
      else queue.push(next);
    }
    cache.set(file, found);
    return found;
  }
  queryDependencies(file: string): string[] {
    return [...new Set([...this.collection.slices.get(file)?.dependencies.keys() ?? [],
      ...this.collection.consumers.get(file) ?? [], ...this.reachable(file, this.componentDependencies),
      ...this.reachable(file, this.componentConsumers)])];
  }
  /** queryDependencies of every file in `files` together, from one walk that starts at all of them. Never one walk per
   * file: a file near the top of a large app (its shell) reaches most of it, and a list per file is files × files paths
   * (about 13 million on a 3,600-file app, which ran the dev server out of memory on one write). */
  queryDependenciesOf(files: Iterable<string>): Set<string> {
    const roots = [...new Set(files)], out = new Set<string>();
    for (const file of roots) {
      for (const dependency of this.collection.slices.get(file)?.dependencies.keys() ?? []) out.add(dependency);
      for (const consumer of this.collection.consumers.get(file) ?? []) out.add(consumer);
    }
    for (const edges of [this.componentDependencies, this.componentConsumers] as ReadonlyMap<string, Iterable<string>>[]) {
      const seen = new Set(roots), queue = [...roots];
      for (let i = 0; i < queue.length; i++) for (const next of edges.get(queue[i]!) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next); out.add(next); queue.push(next);
      }
    }
    return out;
  }
  get compilerFiles(): string[] { return this.compiler.graph?.files ?? []; }
  sourceHash(file: string): string | undefined {
    if (this.cssHashes.has(file)) return this.cssHashes.get(file);
    const slice = this.collection.slices.get(file);
    if (slice) return slice.hash;
    for (const slice of this.collection.slices.values()) {
      const hash = slice.dependencies.get(file); if (hash) return hash;
    }
    const graph = this.shared<StylesheetGraph>('graph');
    const sheet = graph?.files.get(file);
    return sheet ? sourceHash(sheet.css) : undefined;
  }
  get caches() { return { files: this.collection.slices.size, candidates: (this.compiler.cachedCount ?? 0),
    modules: this.componentMemory.modules.size, components: this.shards.size, localViews: this.localJudgements.size }; }
  async prepare(paths: string[]): Promise<string[]> {
    const affected = await this.collection.refresh(paths, this.config);
    this.judgement.judgedFiles = [];
    return affected;
  }
  changed(paths: string[]): void {
    this.collection.markChanged(paths);
    this.snippetGraph = undefined;
    for (const path of paths) { this.componentMemory.modules.delete(path); this.dependencyEdges.delete(path); }
    const affected = new Set(paths);
    for (const path of paths) for (const file of this.reachable(path, this.componentConsumers)) affected.add(file);
    for (const file of affected) { this.componentHashes.delete(file); this.shards.delete(file); }
    this.reachability = new WeakMap();
    this.componentMemory.identities?.clear(); this.componentMemory.rootRanges?.clear(); this.componentMemory.fingerprintClasses?.clear();
    this.phases.delete('collect');
    if (paths.some(path => path.endsWith('.css'))) {
      for (const phase of ['graph', 'css', 'unreachable']) this.phases.delete(phase);
      if (paths.some(path => this.compilerFiles.includes(path))) { this.phases.delete('tailwind'); this.compiler = {}; }
    }
  }
  private async memo<T>(name: string, inputs: unknown[], compute: () => T | Promise<T>): Promise<T> {
    const key = signature(inputs), old = this.phases.get(name);
    if (old?.key === key) return old.value as T;
    const value = await compute(); this.phases.set(name, { key, value });
    if (!this.snippet) this.sharedContext.set(name, value);
    if (name === 'css' && !this.snippet) this.rememberCss(value as Awaited<ReturnType<typeof lowerStylesheets>>);
    return value;
  }
  async phase<T>(name: string, inputs: unknown[], compute: () => T | Promise<T>): Promise<T> {
    if (name === 'config') {
      const value = await this.memo(name, inputs, compute);
      const loaded = value as { value: PlumbConfig; path: string | null };
      this.config = loaded.value;
      for (const pattern of sourceSelectors(this.root, this.config.source ?? await defaultSourceSelectors(this.root)).filter(pattern => !pattern.startsWith('!'))) {
        const file = resolve(this.root, pattern), path = relative(this.root, file);
        if (path === '..' || path.startsWith('..' + sep) || isAbsolute(path)) this.patterns.add(file);
      }
      const presets = presetInputs(this.config);
      for (const file of presets?.files ?? []) { this.dependencies.add(file); this.configurationFiles.add(file); }
      for (const pattern of presets?.patterns ?? []) { this.patterns.add(pattern); this.inputPatterns.add(pattern); }
      for (const source of Object.values(this.config.decisions ?? {})) {
        const from = source.from;
        if (typeof from !== 'function') for (const pattern of Array.isArray(from) ? from : from === undefined ? [] : [from])
          if (pattern.startsWith('dtcg:')) { const path = resolve(this.root, pattern.slice(5)); this.patterns.add(path); this.inputPatterns.add(path); }
      }
      if (loaded.path || presets) {
        const resolver = new ResolverFactory({ extensions: ['.ts', '.mts', '.mjs', '.js', '.cjs', '.json'], conditionNames: ['import', 'node', 'default'] });
        const queue = [...(loaded.path ? [loaded.path] : []), ...presets?.files ?? []], visited = new Set<string>();
        for (let i = 0; i < queue.length; i++) {
          const file = queue[i]!; if (visited.has(file)) continue; visited.add(file); this.dependencies.add(file); this.configurationFiles.add(file);
          if (!/\.[cm]?[jt]s$/.test(file)) continue;
          for (const id of dependencySpecifiers(file, readFileSync(file, 'utf8'), true)) {
            const target = resolver.resolveFileSync(file, id).path;
            if (target && !target.includes('/node_modules/') && /\.[cm]?[jt]s$|\.json$/.test(target)) queue.push(target);
          }
        }
      }
      return value;
    }
    if (name === 'collect') {
      this.snippet = !!inputs[2];
      // a whole-app collection builds each file's component shard as it goes (buildShard); componentGraph ends the batch
      const prebuild = !inputs[2] && /\.[jt]sx?$/;
      if (prebuild && !this.componentMemory.batch) this.componentMemory.batch = componentBatch();
      return await this.collection.collect(inputs[0] as string[], this.config, inputs[2] as Parameters<CollectionState['collect']>[2],
        prebuild ? file => { if (prebuild.test(file) && !this.shards.has(file)) this.buildShard(file, this.config, false); } : undefined) as T;
    }
    if (name === 'project' || name === 'files') {
      const value = await this.memo(name, [], compute);
      if (name === 'project') {
        for (const file of (value as { inputs: string[] }).inputs) { this.dependencies.add(file); this.configurationFiles.add(file); }
        for (const [file, imports] of (value as { entryGraph?: [string, string | null][] }).entryGraph ?? []) { this.dependencies.add(file); this.entryGraph.set(file, imports); }
      }
      // Snippets may extend the file list or change file counts. Never mutate
      // the warm project's identity through the cold pipeline's local view.
      return structuredClone(value);
    }
    if (name === 'tailwind') {
      if ((this.compiler.cachedCount ?? 0) > 4096) this.compiler = {};
      const value = await this.memo(name, inputs, () => lowerTailwind(inputs[0] as string, inputs[1] as string | null, inputs[2] as string | null, inputs[3] as string[], inputs[4] as boolean, true, false, this.compiler));
      for (const file of this.compiler.graph?.files ?? []) this.dependencies.add(file);
      return value as T;
    }
    if (name === 'ranking') {
      const candidates = inputs[1] as Parameters<RankingState['update']>[0];
      if ([...candidates.values()].every(result => result.css?.trim())) return { rankings: new Map(), save: async () => {} } as T;
      return (this.snippet ? this.snippetRanking : this.ranking).update(candidates, inputs[2] as Parameters<RankingState['update']>[1]) as T;
    }
    if (name === 'graph') {
      const graphInputs = [inputs[0], (inputs[1] as string[]).filter(file => file.endsWith('.css')), inputs[2], (inputs[3] as { lang?: string } | undefined)?.lang === 'css' ? inputs[3] : undefined];
      const value = await this.memo(name, graphInputs, compute);
      for (const file of (value as { files: Map<string, unknown> }).files.keys()) this.dependencies.add(file);
      return value;
    }
    if (name === 'modules') {
      const value = await this.memo(name, inputs, compute) as { counts: object };
      return { ...value, counts: { ...value.counts } } as T;
    }
    // The effective record, stylesheet graph and module graph are shared until
    // their actual inputs change. One entry per phase, never per edit/snippet.
    return this.memo(name, inputs, compute);
  }
  shared<T>(name: string): T | undefined { return (this.sharedContext.get(name) ?? this.phases.get(name)?.value) as T | undefined; }
  localComponents(file: string): ComponentGraph { return this.componentGraph([file], this.config, undefined, true); }
  private componentGraph(files: string[], config: PlumbConfig, snippet?: { file: string; text: string; lang: 'tsx' | 'css' }, local = false): ComponentGraph {
    if (snippet) {
      const key = signature([files, snippet]); if (this.snippetGraph?.key === key) return this.snippetGraph.value;
      const overrides = new Map([[snippet.file, snippet.text]]), shards = new Map(this.shards);
      for (const file of files.filter(file => /\.[jt]sx?$/.test(file))) {
        if (file === snippet.file && snippet.lang === 'css') { shards.delete(file); continue; }
        if (file === snippet.file || this.reachable(file, this.componentDependencies).has(snippet.file) || !shards.has(file))
          shards.set(file, discoverComponents(this.root, [file], config, overrides, false, undefined, true, { modules: this.componentMemory.modules }));
      }
      const value = this.mergeGraph(files, shards); this.snippetGraph = { key, value }; return value;
    }
    const wanted = new Set(files.filter(file => /\.[jt]sx?$/.test(file)));
    if ([...wanted].some(file => !this.shards.has(file))) this.reachability = new WeakMap();
    if (!local) for (const file of this.shards.keys()) if (!wanted.has(file)) { this.shards.delete(file); this.componentHashes.delete(file); this.componentDependencies.delete(file); }
    // one file at a time, but one set of resolvers, resolutions and directory listings for the whole build
    if ([...wanted].some(file => !this.shards.has(file))) this.componentMemory.batch = componentBatch();
    try {
    for (const file of wanted) if (!this.shards.has(file)) this.buildShard(file, config);
    this.reachEdges(wanted);
    } finally { delete this.componentMemory.batch; }
    const graph = this.mergeGraph(files, this.shards);
    this.collection.programs.clear();
    this.collection.specifiers.clear();
    if (local) return graph;
    const key = signature([graph.components, graph.used, graph.mounts]);
    if (this.globalGraph?.key === key) {
      Object.assign(this.globalGraph.graph, { diagnostics: graph.diagnostics, usages: graph.usages, elements: graph.elements });
      return this.globalGraph.graph;
    }
    this.globalGraph = { key, graph }; return graph;
  }
  /** One file's component shard and the import edges it reaches. Built right after the file is collected when the
   * whole app is collected (its parsed code is still in memory then: building every shard afterwards parsed and read
   * each file again, about 3 s on a 3,600-file app), otherwise by componentGraph for the files that lack one. The
   * order is the files' order either way, so the shards are the same. */
  /** The import edges of every file `files` reach, for the files whose own were never read: a shard built during
   * collection reads only its file's imports (the rest are not collected yet, and reading them meant parsing them a
   * second time, 1.25 s on a 3,600-file app), so the walk across the graph happens here, once collection has them. */
  private reachEdges(files: Iterable<string>): void {
    // each file is queued once: a file many others import must not fill the queue (bounded, as the walk always was)
    const queue = [...new Set(files)], queued = new Set(queue);
    for (let i = 0; i < queue.length; i++) {
      const source = queue[i]!;
      if (!this.dependencyEdges.has(source)) this.readEdges(source);
      for (const target of this.dependencyEdges.get(source) ?? []) if (!queued.has(target) && queue.length < 20_000) { queued.add(target); queue.push(target); }
    }
  }
  /** One file's import edges, recorded with its consumers; false when it cannot be read. */
  private readEdges(source: string): boolean {
    let text = this.collection.programs.get(source)?.text; if (text === undefined) try { text = readFileSync(source, 'utf8'); } catch { return false; }
    const edges = (this.collection.specifiers.get(source) ?? dependencySpecifiers(source, text)).flatMap(id => {
      const target = this.componentResolver.resolveFileSync(source, id).path;
      return target && /\.[cm]?[jt]sx?$/.test(target) ? [target] : [];
    });
    this.dependencyEdges.set(source, edges);
    for (const path of this.componentDependencies.get(source) ?? []) this.componentConsumers.get(path)?.delete(source);
    this.componentDependencies.set(source, new Set(edges));
    for (const target of edges) {
      this.dependencies.add(target);
      let users = this.componentConsumers.get(target);
      if (!users) this.componentConsumers.set(target, users = new Set());
      users.add(source);
    }
    return true;
  }
  private buildShard(file: string, config: PlumbConfig, deep = true): void {
    // the text collection just parsed, when it is still held; otherwise the file
    let text = this.collection.programs.get(file)?.text ?? ''; if (!this.collection.programs.has(file)) try { text = readFileSync(file, 'utf8'); } catch { /* Component discovery reports this file. */ }
    const hash = sourceHash(text);
    const dependencies = new Set<string>();
    // a whole-app collection reads only this file's edges here; the walk across the graph is reachEdges, afterwards
    if (deep) this.reachEdges([file]); else if (!this.dependencyEdges.has(file)) this.readEdges(file);
    for (const target of this.componentDependencies.get(file) ?? []) dependencies.add(target);
    const shard = discoverComponents(this.root, [file], config, undefined, false, this.collection.programs, true, this.componentMemory);
    for (const identity of shard.components) { dependencies.add(identity.source.file); this.dependencies.add(identity.source.file); }
    for (const path of this.componentDependencies.get(file) ?? []) this.componentConsumers.get(path)?.delete(file);
    for (const path of dependencies) { let users = this.componentConsumers.get(path); if (!users) this.componentConsumers.set(path, users = new Set()); users.add(file); }
    this.shards.set(file, shard); this.componentHashes.set(file, hash); this.componentDependencies.set(file, dependencies);
  }
  private mergeGraph(files: string[], shards: Map<string, ComponentGraph>): ComponentGraph {
    const graphs = files.flatMap(file => shards.get(file) ?? []);
    const identities = (key: 'components' | 'used') => [...new Map(graphs.flatMap(g => g[key]).map(c => [`${c.source.file}:${c.name}`, c])).values()];
    const components = identities('components'), canonical = new Map(components.map(c => [`${c.source.file}:${c.name}`, c]));
    const identity = (c: ComponentGraph['components'][number]) => canonical.get(`${c.source.file}:${c.name}`) ?? c;
    const graph: ComponentGraph = { diagnostics: graphs.flatMap(g => g.diagnostics), root: this.root, components, used: identities('used').map(identity),
      usages: new Map(graphs.flatMap(g => [...g.usages])), mounts: graphs.flatMap(g => g.mounts.map(m => ({ ...m, component: identity(m.component) }))), elements: graphs.flatMap(g => g.elements),
      rootRanges: new Map(graphs.flatMap(g => [...g.rootRanges])), fingerprintClasses: new Map(graphs.flatMap(g => [...g.fingerprintClasses])), sourceTokens: new Map(),
      caller: d => shards.get(d.site.file)?.caller(d), selection: d => shards.get(d.site.file)?.selection(d), element: s => shards.get(s.file)?.element(s) };
    return graph;
  }
  sync<T>(name: string, inputs: unknown[], compute: () => T): T {
    if (name === 'site') {
      const site = inputs[0] as object, old = this.siteCache.get(site);
      if (old && old.candidate === inputs[1]) return old.value as T;
      const value = compute(); this.siteCache.set(site, { candidate: inputs[1], value }); return value;
    }
    if (['deadVariables', 'ownership', 'habits', 'imitation'].includes(name) && !this.initializedRules.has(name)) {
      this.initializedRules.add(name); return compute();
    }
    if (name === 'deadVariables') return this.judgement.deadVariables(...inputs as Parameters<JudgementState['deadVariables']>) as T;
    if (name === 'deadDecisions') {
      const declarations = inputs[0] as Declaration[];
      const defined = new Set((inputs[1] as { decisions: { name: string; refs: string[] }[]; inventory?: { name: string; refs: string[] }[] }).decisions.concat((inputs[1] as { inventory?: { name: string; refs: string[] }[] }).inventory ?? []).flatMap(d => [d.name, ...d.refs.map(ref => /^var\(\s*([\w.-]+)(?:\s*,[\s\S]*)?\)$/.exec(ref)?.[1] ?? /^\{([\w.-]+)\}$/.exec(ref)?.[1] ?? ref)]));
      const refs = signature([inputs[3], declarations.filter(d => d.prop.startsWith('--')).map(d => [d.prop, d.authoredCss ?? d.value]),
        [...new Set(declarations.filter(d => !d.prop.startsWith('--') || !defined.has(d.prop))
          .flatMap(d => [...d.refs, ...(d.decisionRefs ?? []), ...references(d.authoredCss ?? d.value), ...[...(d.authoredCss ?? d.value).matchAll(/\{([\w.-]+)\}/g)].map(m => m[1]!)]))].sort()]);
      if (this.dead?.refs === refs && this.dead.record === inputs[1] && this.dead.config === inputs[2]) return this.dead.value as T;
      const value = compute(); this.dead = { refs, record: inputs[1], config: inputs[2], value }; return value;
    }
    if (name === 'components') return this.componentGraph(inputs[1] as string[], inputs[2] as PlumbConfig, inputs[3] as Parameters<WarmState['componentGraph']>[2]) as T;
    if (this.snippet && ['provenance', 'ownership', 'habits', 'imitation'].includes(name)) return compute();
    if (name === 'provenance') return this.judgement.provenance(...inputs as Parameters<JudgementState['provenance']>) as T;
    if (name === 'ownership') return this.judgement.ownership(inputs[0] as Declaration[], inputs[1] as ComponentGraph, this.shards, this.config, inputs[3], inputs[4] as LoweredProps) as T;
    if (name === 'habits') return this.judgement.habits(inputs[0] as Declaration[], this.config, inputs[2] as Map<Declaration, string>, inputs[3] as string[], inputs[4] as boolean | undefined, inputs[5] as ReadonlySet<Declaration>) as T;
    if (name === 'imitation') return this.judgement.imitation(inputs[0] as ComponentGraph, this.shards, inputs[1] as Parameters<JudgementState['imitation']>[2], inputs[2] as Declaration[], this.config) as T;
    return compute();
  }
}
