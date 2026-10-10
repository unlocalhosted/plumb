import { readFileSync } from 'node:fs';
import type { AnalysisRuntime } from './runtime.js';
import { CollectionState, dependencySpecifiers } from './collection.js';
import { JudgementState } from './judgement.js';
import { lowerTailwind } from '../lower/tailwind.js';
import type { TailwindMemory } from '../lower/tailwind.js';
import { discoverComponents } from '../ownership/components.js';
import type { ComponentGraph, ComponentMemory } from '../ownership/components.js';
import type { PlumbConfig } from '../config.js';
import { sourceHash } from '../collect/cache.js';
import { ResolverFactory } from 'oxc-resolver';
import type { Declaration } from '../report.js';
import { RankingState } from './ranking.js';
import { references } from '../collect/source.js';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { collectStylesheets, cssImports } from '../collect/stylesheets.js';
import { lowerStylesheets, lowerStylesheet } from '../lower/stylesheets.js';
import { declaredClasses } from '../lower/css.js';
import { presetInputs } from '../presets/index.js';
import { defaultSource } from '../project.js';
import type { StylesheetGraph } from '../collect/stylesheets.js';

const signature = (inputs: unknown[]) => JSON.stringify(inputs, (_, value) => value instanceof Map || value instanceof Set ? [...value] : value);
interface Memo { key: string; value: unknown }
export class WarmState implements AnalysisRuntime {
  readonly collection: CollectionState;
  readonly judgement = new JudgementState();
  readonly localJudgements = new Map<string, JudgementState>();
  localJudgement(file: string): JudgementState {
    let value = this.localJudgements.get(file);
    if (!value) { if (this.localJudgements.size >= 64) this.localJudgements.delete(this.localJudgements.keys().next().value!); value = new JudgementState(); this.localJudgements.set(file, value); }
    return value;
  }
  readonly shards = new Map<string, ComponentGraph>();
  readonly dependencies = new Set<string>();
  readonly configurationFiles = new Set<string>();
  readonly patterns = new Set<string>();
  readonly inputPatterns = new Set<string>();
  private componentConsumers = new Map<string, Set<string>>();
  private componentDependencies = new Map<string, Set<string>>();
  private dependencyEdges = new Map<string, string[]>();
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
    return JSON.stringify([cssImports(css), [...declaredClasses(css, file).classes].sort(), lowerStylesheet(css, file).filter(d => d.prop.startsWith('--')).map(d => [d.prop, d.value, d.when])]);
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
      const old = graph.files.get(file), text = readFileSync(file, 'utf8');
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
  private siteCache = new WeakMap<object, { candidate: unknown; value: unknown }>();
  private compiler: TailwindMemory = {};
  private ranking = new RankingState();
  private snippetRanking = new RankingState();
  private dead: { refs: string; record: unknown; config: unknown; value: unknown } | undefined;
  private snippet = false;
  private config: PlumbConfig = {};
  constructor(readonly root: string, public inventory?: readonly string[]) { this.collection = new CollectionState(root); }
  queryDependencies(file: string): string[] {
    return [...new Set([...this.collection.slices.get(file)?.dependencies.keys() ?? [],
      ...this.collection.consumers.get(file) ?? [], ...this.componentDependencies.get(file) ?? [],
      ...this.componentConsumers.get(file) ?? []])];
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
    for (const path of paths) for (const file of this.componentConsumers.get(path) ?? []) affected.add(file);
    for (const file of affected) { this.componentHashes.delete(file); this.shards.delete(file); }
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
      for (const pattern of this.config.source ?? defaultSource) {
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
    if (name === 'collect') { this.snippet = !!inputs[2]; return await this.collection.collect(inputs[0] as string[], this.config, inputs[2] as Parameters<CollectionState['collect']>[2]) as T; }
    if (name === 'project' || name === 'files') {
      const value = await this.memo(name, [], compute);
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
        if (file === snippet.file || this.componentDependencies.get(file)?.has(snippet.file) || !shards.has(file))
          shards.set(file, discoverComponents(this.root, [file], config, overrides, false, undefined, true, this.componentMemory));
      }
      const value = this.mergeGraph(files, shards); this.snippetGraph = { key, value }; return value;
    }
    const wanted = new Set(files.filter(file => /\.[jt]sx?$/.test(file)));
    if (!local) for (const file of this.shards.keys()) if (!wanted.has(file)) { this.shards.delete(file); this.componentHashes.delete(file); this.componentDependencies.delete(file); }
    for (const file of wanted) {
      if (this.shards.has(file)) continue;
      const text = readFileSync(file, 'utf8'), hash = sourceHash(text);
      const dependencies = new Set<string>();
      const queue = [file];
      for (let i = 0; i < queue.length; i++) {
        const source = queue[i]!;
        let edges = this.dependencyEdges.get(source);
        if (!edges) {
          let text: string; try { text = readFileSync(source, 'utf8'); } catch { continue; }
          edges = dependencySpecifiers(source, text).flatMap(id => {
            const target = this.componentResolver.resolveFileSync(source, id).path;
            return target && /\.[cm]?[jt]sx?$/.test(target) ? [target] : [];
          }); this.dependencyEdges.set(source, edges);
        }
        for (const target of edges) {
          if (dependencies.has(target) || queue.length > 20_000) continue;
          dependencies.add(target); queue.push(target); this.dependencies.add(target);
        }
      }
      const shard = discoverComponents(this.root, [file], config, undefined, false, undefined, true, this.componentMemory);
      for (const identity of shard.components) { dependencies.add(identity.source.file); this.dependencies.add(identity.source.file); }
      for (const path of this.componentDependencies.get(file) ?? []) this.componentConsumers.get(path)?.delete(file);
      for (const path of dependencies) { let users = this.componentConsumers.get(path); if (!users) this.componentConsumers.set(path, users = new Set()); users.add(file); }
      this.shards.set(file, shard); this.componentHashes.set(file, hash); this.componentDependencies.set(file, dependencies);
    }
    const graph = this.mergeGraph(files, this.shards);
    if (local) return graph;
    const key = signature([graph.components, graph.used, graph.mounts]);
    if (this.globalGraph?.key === key) {
      Object.assign(this.globalGraph.graph, { usages: graph.usages, elements: graph.elements });
      return this.globalGraph.graph;
    }
    this.globalGraph = { key, graph }; return graph;
  }
  private mergeGraph(files: string[], shards: Map<string, ComponentGraph>): ComponentGraph {
    const graphs = files.flatMap(file => shards.get(file) ?? []);
    const identities = (key: 'components' | 'used') => [...new Map(graphs.flatMap(g => g[key]).map(c => [`${c.source.file}:${c.name}`, c])).values()];
    const components = identities('components'), canonical = new Map(components.map(c => [`${c.source.file}:${c.name}`, c]));
    const identity = (c: ComponentGraph['components'][number]) => canonical.get(`${c.source.file}:${c.name}`) ?? c;
    const graph: ComponentGraph = { root: this.root, components, used: identities('used').map(identity),
      usages: new Map(graphs.flatMap(g => [...g.usages])), mounts: graphs.flatMap(g => g.mounts.map(m => ({ ...m, component: identity(m.component) }))), elements: graphs.flatMap(g => g.elements),
      rootRanges: new Map(graphs.flatMap(g => [...g.rootRanges])), fingerprintClasses: new Map(graphs.flatMap(g => [...g.fingerprintClasses])), sourceTokens: new Map(),
      caller: d => shards.get(d.site.file)?.caller(d), element: s => shards.get(s.file)?.element(s) };
    return graph;
  }
  sync<T>(name: string, inputs: unknown[], compute: () => T): T {
    if (name === 'site') {
      const site = inputs[0] as object, old = this.siteCache.get(site);
      if (old && old.candidate === inputs[1]) return old.value as T;
      const value = compute(); this.siteCache.set(site, { candidate: inputs[1], value }); return value;
    }
    if (name === 'deadVariables') return this.judgement.deadVariables(...inputs as Parameters<JudgementState['deadVariables']>) as T;
    if (name === 'deadDecisions') {
      const declarations = inputs[0] as Declaration[];
      const defined = new Set((inputs[1] as { decisions: { name: string; refs: string[] }[]; inventory?: { name: string; refs: string[] }[] }).decisions.concat((inputs[1] as { inventory?: { name: string; refs: string[] }[] }).inventory ?? []).flatMap(d => [d.name, ...d.refs.map(ref => /^var\(\s*([\w.-]+)(?:\s*,[\s\S]*)?\)$/.exec(ref)?.[1] ?? /^\{([\w.-]+)\}$/.exec(ref)?.[1] ?? ref)]));
      const refs = signature([declarations.filter(d => d.prop.startsWith('--')).map(d => [d.prop, d.authoredCss ?? d.value]),
        [...new Set(declarations.filter(d => !d.prop.startsWith('--') || !defined.has(d.prop))
          .flatMap(d => [...d.refs, ...(d.decisionRefs ?? []), ...references(d.authoredCss ?? d.value), ...[...(d.authoredCss ?? d.value).matchAll(/\{([\w.-]+)\}/g)].map(m => m[1]!)]))].sort()]);
      if (this.dead?.refs === refs && this.dead.record === inputs[1] && this.dead.config === inputs[2]) return this.dead.value as T;
      const value = compute(); this.dead = { refs, record: inputs[1], config: inputs[2], value }; return value;
    }
    if (name === 'components') return this.componentGraph(inputs[1] as string[], inputs[2] as PlumbConfig, inputs[3] as Parameters<WarmState['componentGraph']>[2]) as T;
    if (this.snippet && ['provenance', 'ownership', 'habits', 'imitation'].includes(name)) return compute();
    if (name === 'provenance') return this.judgement.provenance(...inputs as Parameters<JudgementState['provenance']>) as T;
    if (name === 'ownership') return this.judgement.ownership(inputs[0] as Declaration[], inputs[1] as ComponentGraph, this.shards, this.config) as T;
    if (name === 'habits') return this.judgement.habits(inputs[0] as Declaration[], this.config, inputs[2] as Map<Declaration, string>, inputs[3] as string[], inputs[4] as boolean | undefined) as T;
    if (name === 'imitation') return this.judgement.imitation(inputs[0] as ComponentGraph, this.shards, inputs[1] as Parameters<JudgementState['imitation']>[2], inputs[2] as Declaration[], this.config) as T;
    return compute();
  }
}
