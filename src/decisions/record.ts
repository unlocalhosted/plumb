import type { Decision } from '../report.js';

export type DecisionInput = Omit<Decision, 'origin' | 'tier' | 'refs' | 'why'> & Partial<Pick<Decision, 'origin' | 'tier' | 'refs' | 'why'>>;
const overrides = new WeakSet<Decision>();
export function hasTierOverride(record: Decision): boolean { return overrides.has(record); }

export function defineDecisions(records: DecisionInput[]): Decision[] {
  const decisions = records.map(record => ({ origin: 'project' as const, tier: 'primitive' as Decision['tier'], refs: [record.name.startsWith('--') ? `var(${record.name})` : `{${record.name}}`], why: '', ...record }));
  for (const [index, decision] of decisions.entries()) {
    if (records[index]!.tier !== undefined) overrides.add(decision);
    else if (decisions.some(other => other.name !== decision.name && other.family === decision.family && other.refs.some(ref => decision.value.includes(ref)))) decision.tier = 'semantic';
  }
  return decisions;
}
