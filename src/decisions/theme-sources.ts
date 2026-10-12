import type { DecisionRecord } from './index.js';
import { references } from '../collect/source.js';

type Sources = Pick<DecisionRecord, 'definitions' | 'theme' | 'variables' | 'decisions'>;

// Keep all scoped values as graph edges. Resolution may be dynamic, but a
// reference still identifies a definition and can still make a fix circular.
export function themeSourceGraph(record: Sources) {
  const edges = new Map<string, Set<string>>();
  function add(name: string, value: string): void {
    const refs = edges.get(name) ?? new Set<string>();
    for (const ref of references(value)) refs.add(ref);
    edges.set(name, refs);
  }
  for (const [name, variable] of record.variables) add(name, variable.value);
  for (const definition of record.definitions) if (!definition.theme || record.theme.has(definition.name)) add(definition.name, definition.value);
  for (const decision of record.decisions) add(decision.name, decision.value);
  const chains = new Map<string, Set<string>>();
  function sources(name: string): ReadonlySet<string> {
    if (!chains.has(name)) {
      const seen = new Set<string>(), queue = [...edges.get(name) ?? []];
      for (let index = 0; index < queue.length; index++) {
        const ref = queue[index]!;
        if (seen.has(ref)) continue;
        seen.add(ref); queue.push(...edges.get(ref) ?? []);
      }
      chains.set(name, seen);
    }
    return chains.get(name)!;
  }
  const names = new Set<string>();
  for (const name of record.theme) for (const ref of sources(name)) names.add(ref);
  return { names, sources };
}
