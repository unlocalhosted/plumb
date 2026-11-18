import type { AnalysisRuntime } from './runtime.js';
import type { WarmState } from './state.js';
import type { Declaration } from '../report.js';
import type { ComponentGraph } from '../ownership/components.js';
import { judgeImitation } from '../imitation/index.js';
import type { PlumbConfig } from '../config.js';
import type { ClassSite } from '../collect/classes.js';
import type { JudgementState } from './judgement.js';

/** A local read uses the warm global compiler, module graph and token record.
 * Whole-project coverage and dead-token reachability are assembled on report(). */
export class Focus implements AnalysisRuntime {
  private candidates: string[] = [];
  private queryTokens: string[] = [];
  /** the CSS variables this file defines: a stylesheet declaration that reads one is part of how they are judged */
  private defines = new Set<string>();
  private judgement: JudgementState;
  /** the files judged: the file, or the page's files with it (a finding that spans them lists all its places) */
  private files: ReadonlySet<string>;
  /** `consumers`: for a file whose class literals are only lowered where other files use them (a helper of class
   * strings), the files that import it; its sites are read from their collections, as the whole-app report reads them.
   * `page`: the other files the page draws, judged with this one. */
  constructor(private state: WarmState, private file: string, private line?: number, private consumers: string[] = [], private page: string[] = []) {
    this.files = new Set([file, ...page]);
    this.judgement = state.localJudgement(page.length ? [...this.files].sort().join('\0') : file);
  }
  private collected() {
    if (this.page.length) {
      // this file's slice (with every file's variable definitions), and the page's other files: their sites, inline
      // styles and the declarations that are not definitions (those already come with the first)
      const first = this.state.collection.local(this.file);
      const others = this.page.flatMap(file => this.state.collection.slices.get(file)?.value ?? []);
      return { ...first, diagnostics: [...first.diagnostics, ...others.flatMap(p => p.diagnostics)], sites: [...first.sites, ...others.flatMap(p => p.sites)],
        modules: new Map([...first.modules, ...others.flatMap(p => [...p.modules])]),
        styles: { declarations: [...first.styles.declarations, ...others.flatMap(p => p.styles.declarations.filter(d => !d.prop.startsWith('--')))],
          sites: [...first.styles.sites, ...others.flatMap(p => p.styles.sites)], stylesheets: [...first.styles.stylesheets, ...others.flatMap(p => p.styles.stylesheets)],
          imports: [...first.styles.imports, ...others.flatMap(p => p.styles.imports)], definedVariables: [...first.styles.definedVariables, ...others.flatMap(p => p.styles.definedVariables)] } };
    }
    if (!this.consumers.length) return this.state.collection.local(this.file);
    // its own slice (inline styles, definitions) and its sites as lowered in each file that imports it
    const parts = [this.file, ...this.consumers].map(file => this.state.collection.local(file)), first = parts[0]!;
    return { ...first, diagnostics: parts.flatMap(p => p.diagnostics), sites: parts.flatMap(p => p.sites), modules: new Map(parts.flatMap(p => [...p.modules])),
      styles: { declarations: parts.flatMap(p => p.styles.declarations), sites: parts.flatMap(p => p.styles.sites), stylesheets: parts.flatMap(p => p.styles.stylesheets),
        imports: parts.flatMap(p => p.styles.imports), definedVariables: parts.flatMap(p => p.styles.definedVariables) } };
  }
  projectFiles(): ReadonlySet<string> | undefined { return this.state.projectFileSet(); }
  /** this file's stylesheet context, plus declarations elsewhere that read a variable this file defines */
  private localStyles() {
    const base = this.state.localStyles(this.file), seen = new Set(base.declarations);
    return { ...base, declarations: [...base.declarations, ...this.state.stylesReading(this.defines).filter(d => !seen.has(d))] };
  }
  alsoJudged(d: Declaration): boolean { return this.readsOwn(d); }
  private readsOwn(d: Declaration): boolean { return this.defines.size > 0 && !this.files.has(d.site.file) && [...d.value.matchAll(/var\(\s*(--[\w-]+)/g)].some(m => this.defines.has(m[1]!)); }
  async phase<T>(name: string, inputs: unknown[], compute: () => T | Promise<T>): Promise<T> {
    if (name === 'ranking' && this.queryTokens.every(token => (inputs[1] as Map<string, { css: string | null }>).get(token)?.css?.trim())) return { rankings: new Map(), save: async () => {} } as T;
    if (name === 'files') return [...this.files] as T;
    if (['modules', 'graph', 'record', 'unreachable'].includes(name)) {
      const shared = this.state.shared<T>(name);
      if (shared !== undefined) return shared;
    }
    if (name === 'tailwind') {
      // The app-wide compile already has this file's classes unless one was just typed: reading it gives the file the
      // same class props the whole-app report reads, including the classes of components it uses, which live in other
      // files (ownership compares an element's classes with its component's root). Compiling only this file's classes
      // missed those, and replaced the app-wide compile the session keeps.
      const shared = this.state.shared<{ candidates: ReadonlyMap<string, unknown> }>('tailwind');
      if (shared && this.candidates.every(token => shared.candidates.has(token))) return shared as T;
      inputs = [...inputs.slice(0, 3), this.candidates, ...inputs.slice(4)];
    }
    const value = name === 'collect' ? this.collected() : name === 'css' ? this.localStyles() : await this.state.phase(name, inputs, compute);
    if (name === 'collect') {
      const collection = value as Awaited<ReturnType<WarmState['collection']['collect']>>;
      this.candidates = [...new Set(collection.sites.filter(s => !s.opaque).map(s => s.token))].sort();
      const contexts = new Set(collection.sites.filter(s => this.files.has(s.file) && (this.line === undefined || s.line === this.line)).flatMap(s => s.context ? [s.context] : []));
      const sites = collection.sites.filter(s => this.files.has(s.file) && ((this.line === undefined || s.line === this.line) || s.context && contexts.has(s.context)));
      this.queryTokens = sites.filter(s => !s.opaque).map(s => s.token);
      for (const d of collection.styles.declarations) if (this.files.has(d.site.file) && d.prop.startsWith('--')) this.defines.add(d.prop);
      return { ...collection, sites, styles: { ...collection.styles,
        sites: collection.styles.sites.filter(s => this.files.has(s.site.file) && (this.line === undefined || s.site.line === this.line)),
        declarations: collection.styles.declarations.filter(d => this.files.has(d.site.file) && (this.line === undefined || d.site.line === this.line) || d.prop.startsWith('--')) } } as T;
    }
    if (name === 'css') {
      const css = value as { declarations: Declaration[] };
      // a stylesheet that reads one of this file's variables (`background: var(--track-hex)`) decides what that
      // variable is judged as, so its declaration comes along, as it is in the whole-app report
      return { ...css, declarations: css.declarations.filter(d => this.files.has(d.site.file) && (this.line === undefined || d.site.line === this.line) || d.prop.startsWith('--') || this.readsOwn(d)) } as T;
    }
    return value as T;
  }
  sync<T>(name: string, inputs: unknown[], compute: () => T): T {
    if (name === 'components') return this.state.localComponents([...this.files]) as T;
    if (name === 'site') return this.state.sync(name, inputs, compute);
    return compute();
  }
  async judge<T>(name: string, inputs: unknown[], compute: () => T): Promise<T> {
    if (name === 'deadDecisions') return { findings: [], counts: {} } as T;
    if (name === 'provenance') { const [ds, record, config, files, verbose] = inputs as Parameters<JudgementState['provenance']>; return await this.judgement.provenance(ds, record, config, files, verbose, this.files) as T; }
    if (name === 'imitation') {
      if (!(inputs[3] as PlumbConfig).imitation) return [] as T;
      const graph = inputs[0] as ComponentGraph;
      return judgeImitation({ ...graph, elements: graph.elements.filter(e => this.files.has(e.site.file)), element: site => this.files.has(site.file) ? graph.element(site) : undefined }, inputs[1] as ClassSite[],
        [...inputs[2] as Declaration[], ...this.state.imitationStyles(this.queryTokens, this.file)], inputs[3] as PlumbConfig) as T;
    }
    return compute();
  }
}
