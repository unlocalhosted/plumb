import { parseSync } from 'oxc-parser';
import { readFileSync } from 'node:fs';
import { ResolverFactory } from 'oxc-resolver';
import { collectClasses } from '../collect/classes.js';
import type { ClassSite } from '../collect/classes.js';
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
export class CollectionState {
  readonly slices = new Map<string, Slice>();
  readonly dependencies = new Set<string>();
  parsedFiles: string[] = [];
  readonly consumers = new Map<string, Set<string>>();
  private definitions = new Map<string, SourceStyles['declarations']>();
  visitedFiles: string[] = [];
  private dirty = new Set<string>();
  markChanged(paths: string[]): void { for (const path of paths) this.dirty.add(path); }
  constructor(private root: string) {}
  private resolver = new ResolverFactory({ tsconfig: 'auto', extensions: ['.tsx', '.ts', '.jsx', '.js'], extensionAlias: { '.js': ['.ts', '.tsx', '.js'] }, conditionNames: ['import', 'node', 'default'] });
  invalidate(): void { this.slices.clear(); this.dependencies.clear(); this.resolver.clearCache(); }
  // The collector follows one-hop literal imports. Track all direct imports,
  // including types, conservatively; resolver changes rebuild the session.
  private imports(file: string, text: string): Map<string, string> {
    const dependencies = new Map<string, string>();
    for (const specifier of dependencySpecifiers(file, text)) {
      const target = this.resolver.resolveFileSync(file, specifier).path;
      if (!target || !/\.[cm]?[jt]sx?$/.test(target)) continue;
      try { dependencies.set(target, sourceHash(readFileSync(target, 'utf8'))); this.dependencies.add(target); } catch { /* The collector reports unreadable imports that it uses. */ }
    }
    return dependencies;
  }
  private async read(file: string, config: PlumbConfig, input?: { file: string; text: string; lang: 'tsx' | 'css' }): Promise<Collection> {
    this.visitedFiles.push(file);
    const old = this.slices.get(file);
    const overlay = !!input && old?.dependencies.has(input.file);
    if (file !== input?.file && !overlay && old && !this.dirty.has(file) && ![...old.dependencies.keys()].some(path => this.dirty.has(path))) return old.value;
    let text: string | undefined;
    try { text = file === input?.file ? input.text : readFileSync(file, 'utf8'); } catch { /* Collection reports the read failure. */ }
    const hash = sourceHash(text ?? '<unreadable>');
    const valid = old?.hash === hash && [...old.dependencies].every(([path, previous]) => {
      try { return sourceHash(path === input?.file ? input.text : readFileSync(path, 'utf8')) === previous; } catch { return false; }
    });
    if (valid) return old.value;
    const value = await collectClasses([file], config.classHelpers, new Map([...(input ? [[input.file, input.text] as const] : []), ...(text === undefined ? [] : [[file, text] as const])]));
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
  async collect(files: string[], config: PlumbConfig, input?: { file: string; text: string; lang: 'tsx' | 'css' }): Promise<Collection> {
    const current = new Set(files);
    if (!input) for (const file of this.slices.keys()) if (!current.has(file)) this.slices.delete(file);
    const values: Collection[] = [];
    this.parsedFiles = []; this.visitedFiles = [];
    for (const file of files.filter(file => file === input?.file ? input.lang === 'tsx' : /\.[jt]sx?$/.test(file))) {
      values.push(await this.read(file, config, input));
    }
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
