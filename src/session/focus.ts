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
  private judgement: JudgementState;
  /** `consumers`: for a file whose class literals are only lowered where other files use them (a helper of class
   * strings), the files that import it; its sites are read from their collections, as the whole-app report reads them. */
  constructor(private state: WarmState, private file: string, private line?: number, private consumers: string[] = []) { this.judgement = state.localJudgement(file); }
  private collected() {
    if (!this.consumers.length) return this.state.collection.local(this.file);
    // its own slice (inline styles, definitions) and its sites as lowered in each file that imports it
    const parts = [this.file, ...this.consumers].map(file => this.state.collection.local(file)), first = parts[0]!;
    return { ...first, diagnostics: parts.flatMap(p => p.diagnostics), sites: parts.flatMap(p => p.sites), modules: new Map(parts.flatMap(p => [...p.modules])),
      styles: { declarations: parts.flatMap(p => p.styles.declarations), sites: parts.flatMap(p => p.styles.sites), stylesheets: parts.flatMap(p => p.styles.stylesheets),
        imports: parts.flatMap(p => p.styles.imports), definedVariables: parts.flatMap(p => p.styles.definedVariables) } };
  }
  async phase<T>(name: string, inputs: unknown[], compute: () => T | Promise<T>): Promise<T> {
    if (name === 'ranking' && this.queryTokens.every(token => (inputs[1] as Map<string, { css: string | null }>).get(token)?.css?.trim())) return { rankings: new Map(), save: async () => {} } as T;
    if (name === 'files') return [this.file] as T;
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
    const value = name === 'collect' ? this.collected() : name === 'css' ? this.state.localStyles(this.file) : await this.state.phase(name, inputs, compute);
    if (name === 'collect') {
      const collection = value as Awaited<ReturnType<WarmState['collection']['collect']>>;
      this.candidates = [...new Set(collection.sites.filter(s => !s.opaque).map(s => s.token))].sort();
      const contexts = new Set(collection.sites.filter(s => s.file === this.file && (this.line === undefined || s.line === this.line)).flatMap(s => s.context ? [s.context] : []));
      const sites = collection.sites.filter(s => s.file === this.file && ((this.line === undefined || s.line === this.line) || s.context && contexts.has(s.context)));
      this.queryTokens = sites.filter(s => !s.opaque).map(s => s.token);
      return { ...collection, sites, styles: { ...collection.styles,
        sites: collection.styles.sites.filter(s => s.site.file === this.file && (this.line === undefined || s.site.line === this.line)),
        declarations: collection.styles.declarations.filter(d => d.site.file === this.file && (this.line === undefined || d.site.line === this.line) || d.prop.startsWith('--')) } } as T;
    }
    if (name === 'css') {
      const css = value as { declarations: Declaration[] };
      return { ...css, declarations: css.declarations.filter(d => d.site.file === this.file && (this.line === undefined || d.site.line === this.line) || d.prop.startsWith('--')) } as T;
    }
    return value as T;
  }
  sync<T>(name: string, inputs: unknown[], compute: () => T): T {
    if (name === 'deadDecisions') return { findings: [], counts: {} } as T;
    if (name === 'components') return this.state.localComponents(this.file) as T;
    if (name === 'site') return this.state.sync(name, inputs, compute);
    if (name === 'provenance') return this.judgement.provenance(...inputs as Parameters<JudgementState['provenance']>) as T;
    if (name === 'imitation') {
      if (!(inputs[3] as PlumbConfig).imitation) return [] as T;
      const graph = inputs[0] as ComponentGraph;
      return judgeImitation({ ...graph, elements: graph.elements.filter(e => e.site.file === this.file), element: site => site.file === this.file ? graph.element(site) : undefined }, inputs[1] as ClassSite[],
        [...inputs[2] as Declaration[], ...this.state.imitationStyles(this.queryTokens, this.file)], inputs[3] as PlumbConfig) as T;
    }
    return compute();
  }
}
