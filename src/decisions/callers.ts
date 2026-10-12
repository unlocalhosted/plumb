import type { Decision } from '../report.js';
import { references } from '../collect/source.js';

/** Default caller policy follows each primitive's intent aliases, not its family. */
export function callerPolicy(decisions: Decision[], callers?: Decision['tier'][]) {
  const aliases = new Map<Decision, Decision[]>();
  const primitives = new Map<string, Decision[]>();
  for (const decision of decisions) if (decision.tier === 'primitive') {
    for (const ref of decision.refs) {
      const targets = primitives.get(ref) ?? [];
      targets.push(decision); primitives.set(ref, targets);
    }
  }
  for (const semantic of decisions) {
    // Tailwind/preflight and shadcn slots connect fonts/defaults to the theme.
    if (semantic.tier !== 'semantic' || /^--(?:font-(?:sans|serif|mono|heading|body)$|default-)/.test(semantic.name)) continue;
    const refs = [...references(semantic.value).map(name => `var(${name})`),
      ...[...semantic.value.matchAll(/\{([\w.-]+)\}/g)].map(match => match[0])];
    for (const ref of new Set(refs)) for (const primitive of primitives.get(ref) ?? []) {
      if (primitive.family !== semantic.family) continue;
      const names = aliases.get(primitive) ?? [];
      if (!names.includes(semantic)) names.push(semantic);
      aliases.set(primitive, names);
    }
  }
  return {
    allows: (decision: Decision): boolean => callers !== undefined ? callers.includes(decision.tier) : !aliases.has(decision),
    semanticsFor: (decision: Decision): Decision[] => aliases.get(decision) ?? [],
  };
}
