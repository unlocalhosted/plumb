import { matchesGlob, relative } from 'node:path';
import type { PlumbConfig } from '../config.js';
import type { DecisionRecord } from '../decisions/index.js';
import { references } from '../collect/source.js';
import type { Declaration, Decision, Family, Finding } from '../report.js';

export type DeadDecisionCounts = Partial<Record<Family, { total: number; used: number; exported: number; dead: number }>>;
const valueRefs = (value: string) => [...references(value), ...[...value.matchAll(/\{([\w.-]+)\}/g)].map(match => match[1]!)];
const refName = (ref: string) => /^var\(\s*([\w.-]+)(?:\s*,[\s\S]*)?\)$/.exec(ref)?.[1] ?? /^\{([\w.-]+)\}$/.exec(ref)?.[1] ?? ref;

/** Reference reachability, never value equality. Definitions are edges, not roots. */
export function deadDecisions(root: string, declarations: Declaration[], record: DecisionRecord, config: PlumbConfig): { findings: Finding[]; counts: DeadDecisionCounts } {
  const decisions = [...new Map([...(record.inventory ?? []), ...record.decisions].map(d => [`${d.family}:${d.name}`, d])).values()];
  const byRef = new Map<string, Decision[]>();
  for (const decision of decisions) for (const ref of [decision.name, ...decision.refs]) {
    const name = refName(ref);
    byRef.set(name, [...(byRef.get(name) ?? []), decision]);
  }
  const edges = new Map<string, Set<string>>();
  function edge(name: string, value: string): void {
    const refs = edges.get(name) ?? new Set<string>();
    for (const ref of valueRefs(value)) refs.add(ref);
    edges.set(name, refs);
  }
  for (const [name, variable] of record.variables) edge(name, variable.value);
  for (const definition of record.definitions) edge(definition.name, definition.value);
  for (const declaration of declarations) if (declaration.prop.startsWith('--')) edge(declaration.prop, declaration.authoredCss ?? declaration.value);
  const published = new Set(decisions.filter(d => config.decisions?.[d.family]?.exported || config.exported?.some(pattern =>
    [d.name, relative(root, d.source.file), ...d.refs.map(refName)].some(name => matchesGlob(name, pattern)))));
  const used = new Set<Decision>(), seen = new Set<string>(), queue: string[] = [];
  for (const declaration of declarations) {
    if (declaration.prop.startsWith('--') && byRef.has(declaration.prop)) continue;
    queue.push(...declaration.refs, ...(declaration.decisionRefs ?? []), ...valueRefs(declaration.authoredCss ?? declaration.value));
  }
  // Exported semantics also publish their dependency graph.
  for (const decision of published) queue.push(decision.name);
  for (let index = 0; index < queue.length; index++) {
    const name = queue[index]!;
    if (seen.has(name)) continue;
    seen.add(name);
    for (const decision of byRef.get(name) ?? []) {
      if (used.has(decision)) continue;
      used.add(decision);
      queue.push(...valueRefs(decision.value));
    }
    queue.push(...(edges.get(name) ?? []));
  }
  const counts: DeadDecisionCounts = {}, groups = new Map<Family, Decision[]>();
  for (const decision of decisions) {
    if (decision.origin !== 'project') continue;
    const count = counts[decision.family] ??= { total: 0, used: 0, exported: 0, dead: 0 };
    count.total++;
    if (published.has(decision)) count.exported++;
    else if (used.has(decision)) count.used++;
    else {
      count.dead++;
      groups.set(decision.family, [...(groups.get(decision.family) ?? []), decision]);
    }
  }
  const findings = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([family, group]): Finding => {
    group.sort((a, b) => a.name.localeCompare(b.name));
    const occurrences: Declaration[] = group.map(d => ({ prop: d.name, value: d.value, refs: valueRefs(d.value), when: [],
      site: { ...d.source, column: 1, text: `${d.name}: ${d.value}` }, owner: { kind: 'element', name: 'decisions' }, origin: 'custom-property', sourceOrigin: 'project' }));
    return { key: `dead/${family}`, rule: `dead/${family}`, family, severity: 'info', sites: occurrences.map(d => d.site),
      declaration: occurrences[0]!, occurrences, decisions: group, why: `${group.length} unused ${family} decision${group.length === 1 ? '' : 's'}; no source declaration references them.`,
      fix: `Review unused decisions; mark published tokens with decisions.${family}.exported: true or exported name/source globs.` };
  });
  return { findings, counts };
}

export function formatDeadSummary(counts: DeadDecisionCounts = {}): string {
  return Object.entries(counts).map(([family, c]) => `dead/${family}  ${c.dead} unused of ${c.total} project decisions (${c.used} used, ${c.exported} exported)\n`).join('');
}
