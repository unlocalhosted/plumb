import type { Declaration, Finding, ProvenanceCoverage } from '../report.js';
import type { ProvenanceEntry } from '../rules/provenance.js';
import type { PlumbConfig } from '../config.js';
import type { DecisionRecord } from '../decisions/index.js';
import { familyProvenance, findingsForFamily, groupByValue, presentProvenance, resolutionContext } from '../rules/provenance.js';
import { judgedFamilies, isJudged, familiesFor, varUses } from '../rules/families.js';
import { judgeOwnership } from '../ownership/judge.js';
import { judgeHabits } from '../habits/index.js';
import { judgeImitation } from '../imitation/index.js';
import { indexDefinitions } from '../rules/attribution.js';
import { references } from '../collect/source.js';
import type { ComponentGraph } from '../ownership/components.js';
import type { ClassSite } from '../collect/classes.js';
import { deadVariables } from '../rules/existence.js';

const same = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((v, i) => v === b[i]);
class FileCache<T> {
  private entries = new Map<string, { inputs: unknown[]; value: T }>();
  changed: string[] = [];
  get(file: string, inputs: unknown[], compute: () => T): T {
    const old = this.entries.get(file);
    if (old && same(old.inputs, inputs)) return old.value;
    const value = compute(); this.entries.set(file, { inputs, value }); this.changed.push(file); return value;
  }
  keep(files: Set<string>): void { for (const file of this.entries.keys()) if (!files.has(file)) this.entries.delete(file); this.changed = []; }
}
export function byFile(declarations: Declaration[]): Map<string, Declaration[]> {
  const files = new Map<string, Declaration[]>();
  for (const d of declarations) { const group = files.get(d.site.file) ?? []; group.push(d); files.set(d.site.file, group); }
  return files;
}
const locations = new WeakMap<Declaration['site'], string>();
const siteKey = (s: Declaration['site']) => {
  let key = locations.get(s); if (key === undefined) { key = `${s.file}\0${s.line}:${s.column}\0${s.text}`; locations.set(s, key); } return key;
};
const location = (d: Declaration) => siteKey(d.site);
const indices = new WeakMap<Declaration[], { order: Map<string, number>; declarations: Map<Declaration, number> }>();
function orders(ds: Declaration[]) {
  let value = indices.get(ds);
  if (!value) {
    value = { order: new Map(), declarations: new Map() };
    ds.forEach((d, i) => { value!.declarations.set(d, i); if (!value!.order.has(location(d))) value!.order.set(location(d), i); });
    indices.set(ds, value);
  }
  return value;
}
const merged = new WeakMap<Finding, { members: Finding[]; result: Finding }>();

/** Merge non-provenance rule groups in cold-pipeline declaration order. */
function mergeFindings(parts: Finding[][], declarations: Declaration[]): Finding[] {
  const { order, declarations: declarationOrder } = orders(declarations);
  const rank = (d: Declaration) => declarationOrder.get(d) ?? order.get(location(d)) ?? Infinity;
  const groups = new Map<string, Finding[]>();
  for (const findings of parts) for (const finding of findings) {
    const group = groups.get(finding.key) ?? []; group.push(finding); groups.set(finding.key, group);
  }
  const results = [...groups.values()].map(group => {
    const old = merged.get(group[0]!);
    if (old && same(old.members, group)) return old.result;
    const members = [...group];
    group.sort((a, b) => rank(a.declaration) - rank(b.declaration));
    const first = group[0]!;
    const sites = [...new Map(group.flatMap(f => f.sites).map(s => [siteKey(s), s])).values()]
      .sort((a, b) => (order.get(siteKey(a)) ?? Infinity) - (order.get(siteKey(b)) ?? Infinity));
    const occurrences = group.flatMap(f => f.occurrences ?? []).sort((a, b) => rank(a) - rank(b));
    const finding: Finding = { ...first, sites, ...(first.occurrences ? { occurrences } : {}) };
    if (group.some(f => f.severity === 'error')) finding.severity = 'error';
    if (finding.variable) finding.variable = { ...finding.variable, useCount: group.reduce((n, f) => n + (f.variable?.useCount ?? 0), 0) };
    merged.set(members[0]!, { members, result: finding }); return finding;
  });
  results.sort((a, b) => rank(a.declaration) - rank(b.declaration));
  return results;
}

export class JudgementState {
  private provenanceCache = new FileCache<ReturnType<typeof familyProvenance>>();
  private ownershipCache = new FileCache<ReturnType<typeof judgeOwnership>>();
  private habitCache = new FileCache<ReturnType<typeof judgeHabits>>();
  private imitationCache = new FileCache<ReturnType<typeof judgeImitation>>();
  private variableCache = new FileCache<Finding[]>();
  private contributions = new WeakMap<Declaration, { families: string[]; refs: string[] }>();
  private variableUses = new WeakMap<Declaration, string[]>();
  judgedFiles: string[] = [];
  deadVariables(declarations: Declaration[], defined: Set<string>, theme: Set<string>): Finding[] {
    const files = byFile(declarations), key = [...defined].sort().join('\0'), themeKey = [...theme].sort().join('\0');
    this.variableCache.keep(new Set(files.keys()));
    const parts = [...files].map(([file, ds]) => {
      const refs = [...new Set(ds.flatMap(d => {
        let uses = this.variableUses.get(d);
        if (!uses) { uses = isJudged(d) && !d.opaque ? varUses(d.value).map(use => use.name) : []; this.variableUses.set(d, uses); }
        return uses;
      }))].sort();
      const unknown = refs.some(name => !defined.has(name));
      // Defined-variable consumers depend on their names' presence. Only
      // undefined-variable suggestions depend on the complete hint registry.
      const registry = unknown ? key : JSON.stringify(refs.map(name => [name, defined.has(name)]));
      return this.variableCache.get(file, [registry, unknown ? themeKey : '', ...ds], () => deadVariables(ds, defined, theme));
    });
    return mergeFindings(parts, declarations).sort((a, b) => a.key.localeCompare(b.key));
  }
  provenance(declarations: Declaration[], record: DecisionRecord, config: PlumbConfig, sourceFiles: Set<string>, verbose = false) {
    const usedNumericSpacing = new Set<string>();
    const positions = orders(declarations).declarations;
    const files = byFile(declarations), definitions = indexDefinitions(declarations, record);
    const resolution = resolutionContext(declarations, record);
    const custom = declarations.filter(d => d.origin === 'custom-property');
    const familyFiles = new Map(judgedFamilies.map(f => [f, new Map<string, Declaration[]>()]));
    for (const d of declarations) {
      let item = this.contributions.get(d);
      if (!item) { item = { families: isJudged(d) ? familiesFor(d.prop) : [], refs: [...d.refs, ...references(d.authoredCss ?? '')] }; this.contributions.set(d, item); }
      for (const family of judgedFamilies) if (item.families.includes(family) || d.prop.startsWith('--tw-')) {
        const map = familyFiles.get(family)!, ds = map.get(d.site.file) ?? []; ds.push(d); map.set(d.site.file, ds);
      }
    }
    const parts = new Map(judgedFamilies.map(family => [family, [] as ProvenanceEntry[]])), keys = new Set<string>();
    const coverage = Object.fromEntries(judgedFamilies.map(family => [family, { fromDecisions: 0, total: 0, findings: 0 }])) as ProvenanceCoverage;
    this.provenanceCache.changed = [];
    for (const family of judgedFamilies) {
      const decisionRefs = new Set(record.decisions.filter(d => d.family === family).flatMap(d => d.refs));
      const parent = new Map([...files.keys()].map(file => [file, file]));
      const reachedCache = new Map<string, Declaration[]>();
      const find = (file: string): string => {
        let root = file; while (parent.get(root) !== root) root = parent.get(root)!;
        while (file !== root) { const next = parent.get(file)!; parent.set(file, root); file = next; }
        return root;
      };
      const join = (a: string, b: string) => { if (parent.has(a) && parent.has(b)) parent.set(find(b), find(a)); };
      function reached(name: string, seen = new Set<string>()): Declaration[] {
        if (!seen.size && reachedCache.has(name)) return reachedCache.get(name)!;
        if (seen.has(name) || seen.size >= 8 || decisionRefs.has(`var(${name})`)) return [];
        const entries = [...definitions.definitions.get(name)?.values() ?? []];
        const result = entries.flatMap(d => [d, ...references(d.value).flatMap(ref => reached(ref, new Set([...seen, name])))]);
        if (!seen.size) reachedCache.set(name, result); return result;
      }
      const relevant = familyFiles.get(family)!;
      for (const ds of relevant.values()) for (const d of ds) {
        const item = this.contributions.get(d)!; if (!item.families.includes(family)) continue;
        for (const ref of item.refs) for (const definition of reached(ref)) {
          if (!sourceFiles.has(definition.site.file) || definition.sourceOrigin === 'framework') continue;
          join(d.site.file, definition.site.file);
        }
      }
      const clusters = new Map<string, string[]>();
      for (const file of files.keys()) { const root = find(file), group = clusters.get(root) ?? []; group.push(file); clusters.set(root, group); }
      for (const cluster of clusters.values()) {
        const ds = cluster.flatMap(file => relevant.get(file) ?? []).sort((a, b) => positions.get(a)! - positions.get(b)!);
        if (!ds.length) continue;
        const refs = new Set(ds.flatMap(d => this.contributions.get(d)!.refs));
        for (const name of refs) for (const definition of reached(name)) for (const ref of definition.refs) refs.add(ref);
        const dependencies = custom.filter(d => refs.has(d.prop));
        const key = `${family}:${JSON.stringify(cluster)}`; keys.add(key);
        const result = this.provenanceCache.get(key, [record, config, ...ds, '|definitions', ...dependencies], () => {
          return familyProvenance(family, ds, record, config, sourceFiles, definitions, resolution);
        });
        parts.get(family)!.push(...result.entries);
        for (const name of result.usedNumericSpacing) usedNumericSpacing.add(name);
        for (const key of ['fromDecisions', 'total', 'findings'] as const) coverage[family][key] += result.coverage[key];
      }
    }
    this.judgedFiles = [...new Set(this.provenanceCache.changed.flatMap(key => JSON.parse(key.slice(key.indexOf(':') + 1)) as string[]))];
    this.provenanceCache.keep(keys);
    const siteOrder = new Map<string, number>();
    declarations.forEach((d, i) => {
      const site = JSON.stringify([d.site.file, d.site.line, d.site.column]);
      if (!siteOrder.has(site)) siteOrder.set(site, i);
    });
    const findings = judgedFamilies.flatMap(family => {
      const entries = parts.get(family)!;
      const rank = (entry: ProvenanceEntry) => entry.definition ? Math.min(...[...entry.uses].map(site => siteOrder.get(site) ?? Infinity)) : positions.get(entry.declaration) ?? siteOrder.get(JSON.stringify([entry.declaration.site.file, entry.declaration.site.line, entry.declaration.site.column])) ?? Infinity;
      entries.sort((a, b) => Number(!!a.definition) - Number(!!b.definition) || rank(a) - rank(b));
      const merged = findingsForFamily(family, entries, record);
      return verbose || config.decisions?.[family]?.byValue === 'each' ? merged : groupByValue(family, merged);
    });
    return { findings: presentProvenance(findings), coverage, usedNumericSpacing: [...usedNumericSpacing].sort() };
  }
  ownership(declarations: Declaration[], graph: ComponentGraph, shards: Map<string, ComponentGraph>, config: PlumbConfig) {
    const files = byFile(declarations); this.ownershipCache.keep(new Set(files.keys()));
    const results = [...files].map(([file, ds]) => {
      const context = ds.some(d => ['stylesheet', 'apply'].includes(d.origin)) ? graph : shards.get(file) ?? graph;
      return this.ownershipCache.get(file, [context, config, ...ds], () => judgeOwnership(ds, context, config));
    });
    const coverage = { callerDeclarations: 0, findings: 0, heuristicFindings: 0, byFamily: {} as ReturnType<typeof judgeOwnership>['coverage']['byFamily'] };
    for (const result of results) {
      coverage.callerDeclarations += result.coverage.callerDeclarations; coverage.findings += result.coverage.findings; coverage.heuristicFindings += result.coverage.heuristicFindings;
      for (const [family, counts] of Object.entries(result.coverage.byFamily)) { const c = coverage.byFamily[family] ??= { total: 0, allowed: 0, findings: 0 }; c.total += counts.total; c.allowed += counts.allowed; c.findings += counts.findings; }
    }
    return { findings: mergeFindings(results.map(r => r.findings), declarations).sort((a, b) => a.rule.localeCompare(b.rule) || a.key.localeCompare(b.key)), coverage };
  }
  habits(declarations: Declaration[], config: PlumbConfig, contexts: Map<Declaration, string>, hover: string[], list?: boolean) {
    const files = byFile(declarations); this.habitCache.keep(new Set(files.keys()));
    const results = [...files].map(([file, ds]) => this.habitCache.get(file, [config, list, ...hover, ...ds, ...ds.map(d => contexts.get(d))], () => judgeHabits(ds, config.habits ?? [], contexts, hover, list)));
    const summaries = judgeHabits([], config.habits ?? [], new Map(), hover, list).summaries;
    for (const result of results) for (const summary of summaries) if (summary.breaks !== null) summary.breaks += result.summaries.find(s => s.id === summary.id)?.breaks ?? 0;
    const customIds = new Set((config.habits ?? []).flatMap(entry => typeof entry === 'string' ? [] : [entry.id]));
    const findings = mergeFindings(results.map(r => r.findings), declarations).sort((a, b) => Number(customIds.has(a.rule.slice(7))) - Number(customIds.has(b.rule.slice(7))));
    return { findings, summaries };
  }
  imitation(graph: ComponentGraph, shards: Map<string, ComponentGraph>, sites: ClassSite[], declarations: Declaration[], config: PlumbConfig) {
    if (!config.imitation) return [];
    const files = byFile(declarations), css = declarations.filter(d => ['stylesheet', 'apply'].includes(d.origin));
    const classFiles = new Map<string, ClassSite[]>();
    for (const site of sites) { const group = classFiles.get(site.file) ?? []; group.push(site); classFiles.set(site.file, group); }
    this.imitationCache.keep(new Set(shards.keys()));
    const results = [...shards].map(([file, shard]) => {
      const ds = files.get(file) ?? [], classes = classFiles.get(file) ?? [];
      // Canonical component definitions are global even when no caller uses them.
      const context = { ...shard, components: graph.components };
      return this.imitationCache.get(file, [shard, config, ...graph.components, ...classes, ...ds, ...css], () => judgeImitation(context, classes, [...ds, ...css.filter(d => d.site.file !== file)], config));
    });
    return mergeFindings(results, declarations).sort((a, b) => a.rule.localeCompare(b.rule) || a.key.localeCompare(b.key));
  }
}
