import type { DecisionRecord } from '../decisions/index.js';
import { resolveValue } from '../decisions/resolve.js';
import type { Variable } from '../decisions/resolve.js';
import type { Declaration } from '../report.js';
import { references } from '../collect/source.js';
import { themeSourceGraph } from '../decisions/theme-sources.js';
import { partsFor, varUses } from './families.js';
import type { JudgedFamily } from './families.js';

export interface AttributedDeclaration {
  declaration: Declaration;
  parts: string[];
  definition?: Declaration;
  uses: Set<string>;
}

const siteKey = (d: Declaration) => JSON.stringify([d.site.file, d.site.line, d.site.column]);
export function indexDefinitions(declarations: Declaration[], record: DecisionRecord) {
  const definitions = new Map<string, Map<string, Declaration>>();
  function add(d: Declaration): void {
    if (d.prop === '--spacing' || d.prop.startsWith('--tw-')) return;
    const entries = definitions.get(d.prop) ?? new Map();
    entries.set(siteKey(d), d); definitions.set(d.prop, entries);
  }
  for (const item of record.definitions) if (!item.theme || record.theme.has(item.name)) {
    add({ prop: item.name, value: item.value, refs: references(item.value), when: [], site: item.site,
      owner: { kind: 'element', name: item.root ? ':root' : item.name }, origin: 'custom-property', sourceOrigin: item.origin === 'framework' ? 'framework' : 'project' });
  }
  // Lowered inline/embedded CSS also supplies definitions. Raw CSS above keeps
  // unused theme values and precise authored text before compiler rewrites.
  for (const d of declarations) if (d.origin === 'custom-property' && !definitions.get(d.prop)?.has(siteKey(d))) add(d);
  const scopedVariables = new Map<string, Variable>();
  for (const [name, entries] of definitions) {
    const values = [...entries.values()];
    scopedVariables.set(name, { value: values[0]!.value,
      dynamic: values.some(d => d.opaque || d.when.some(c => ['media', 'supports', 'container'].includes(c.kind)) || d.value !== values[0]!.value) });
  }
  return { definitions, scopedVariables, themeSources: themeSourceGraph(record) };
}
const registries = new WeakMap<ReturnType<typeof indexDefinitions>, Map<string, { nondecisions: Set<string>; protectedRefs: Set<string> }>>();

// Keep recipe references intact until their authored owner is known. Family
// parsing can otherwise expand a variable into color/time parts and lose its site.
export function attribution(family: JudgedFamily, index: ReturnType<typeof indexDefinitions>,
  sourceFiles: ReadonlySet<string>, decisionRefs: ReadonlySet<string>) {
  const { definitions, scopedVariables } = index;
  let registriesForIndex = registries.get(index);
  if (!registriesForIndex) registries.set(index, registriesForIndex = new Map());
  const registryKey = JSON.stringify([...decisionRefs]);
  let registry = registriesForIndex.get(registryKey);
  if (!registry) {
    const nondecisions = new Set([...definitions.keys()].filter(name => !decisionRefs.has(`var(${name})`) && !index.themeSources.names.has(name)));
    registry = { nondecisions, protectedRefs: new Set([...decisionRefs, ...[...index.themeSources.names, ...nondecisions].map(name => `var(${name})`)]) };
    registriesForIndex.set(registryKey, registry);
  }
  const { nondecisions, protectedRefs } = registry;
  const attributed = new Map<string, AttributedDeclaration>();
  const resolutions = new WeakMap<ReadonlyMap<string, Variable>, Map<string, string | undefined>>();
  const variableMaps = new WeakMap<ReadonlyMap<string, Variable>, Map<string, Variable>>();
  const literalChains = new Map<string, boolean>();
  function reachesLiteral(name: string, seen = new Set<string>()): boolean {
    if (seen.has(name) || seen.size >= 8) return false;
    return [...definitions.get(name)?.values() ?? []].some(entry => {
      if (entry.opaque) return false;
      const refs = references(entry.value);
      return refs.length ? refs.some(ref => nondecisions.has(ref) && reachesLiteral(ref, new Set([...seen, name]))) : resolveValue(entry.value, new Map()) !== undefined;
    });
  }
  function staticValue(part: string, variables: ReadonlyMap<string, Variable>): string | undefined {
    let cached = resolutions.get(variables);
    if (!cached) { cached = new Map(); resolutions.set(variables, cached); }
    if (!cached.has(part)) {
      let values = variableMaps.get(variables);
      if (!values) { values = new Map([...scopedVariables, ...variables]); variableMaps.set(variables, values); }
      cached.set(part, resolveValue(part, values));
    }
    return cached.get(part);
  }

  function parts(prop: string, value: string, variables: ReadonlyMap<string, Variable>): string[] {
    return partsFor(family, prop, value.replace(/\s*!important$/, ''), variables, protectedRefs);
  }
  function visit(declaration: Declaration, values: string[], variables: ReadonlyMap<string, Variable>, consumer: Declaration,
    seen = new Set<string>()): string[] {
    const own: string[] = [];
    for (const part of values) {
      const use = /^var\([\s\S]*\)$/.test(part) ? varUses(part)[0] : undefined;
      if (!use || use.text !== part || !nondecisions.has(use.name) || seen.has(use.name) || seen.size >= 8) { own.push(part); continue; }
      const entries = definitions.get(use.name)!;
      const owned = [...entries.values()].filter(d => sourceFiles.has(d.site.file) && d.sourceOrigin !== 'framework');
      if (!literalChains.has(use.name)) literalChains.set(use.name, reachesLiteral(use.name));
      if (owned.length && !literalChains.get(use.name) && staticValue(part, variables) === undefined) {
        // Unresolved chains still expose explicit decisions (including dynamic
        // tokens). Cycles/runtime values retain the prior use-site diagnosis.
        own.push(...partsFor(family, declaration.prop, part, variables, decisionRefs)); continue;
      }
      for (const entry of entries.values()) {
        // Import graph definitions prove existence, but do not belong to this
        // source slice. Neither their literal nor a fallback is consumer debt.
        if (!sourceFiles.has(entry.site.file) || entry.sourceOrigin === 'framework') continue;
        const next = { ...entry, prop: declaration.prop };
        const remaining = visit(next, parts(next.prop, entry.authoredCss ?? entry.value, variables), variables, consumer, new Set([...seen, use.name]));
        if (!remaining.length) continue;
        const key = siteKey(entry);
        let item = attributed.get(key);
        if (!item) { item = { declaration: next, parts: [], definition: entry, uses: new Set() }; attributed.set(key, item); }
        for (const value of remaining) if (!item.parts.includes(value)) item.parts.push(value);
        item.uses.add(siteKey(consumer));
      }
    }
    return own;
  }
  return {
    consume(declaration: Declaration, variables: ReadonlyMap<string, Variable>, selectedRefs: string[]): AttributedDeclaration | undefined {
      const authored = family === 'spacing' ? declaration.value : family === 'elevation' ? declaration.elevationValue ?? declaration.authoredCss ?? declaration.value : declaration.authoredCss ?? declaration.value;
      const values = selectedRefs.length ? selectedRefs.map(name => `var(${name})`) : parts(declaration.prop, authored, variables);
      const own = visit(declaration, values, variables, declaration);
      return own.length || declaration.opaque || !values.length ? { declaration, parts: own, uses: new Set() } : undefined;
    },
    definitions: attributed.values(),
  };
}
