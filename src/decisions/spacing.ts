import type { Decision } from '../report.js';
import type { CssVariable } from './css.js';
import { pixels, resolveValue } from './resolve.js';
import type { Variable } from './resolve.js';

export interface NumericSpacing { unit: Decision; replaced: boolean }

/** Layout geometry is not a reusable ladder, even when three dimensions are small. */
const layoutRole = /(?:^|-)(?:page|rail|content|reader|safe|tab|sidebar|header|footer|panel|shell|viewport|screen|container|width|height|max|min)(?:-|$)/;
export function numericSpacing(definitions: CssVariable[], decisions: Decision[], variables: Map<string, Variable>, theme: Set<string>): NumericSpacing | undefined {
  if (!theme.has('--spacing')) return;
  const definition = definitions.findLast(d => d.name === '--spacing' && (d.theme || d.root));
  const value = variables.get('--spacing');
  if (!definition || !value || value.dynamic) return;
  const resolved = resolveValue('var(--spacing)', variables), amount = resolved === undefined ? undefined : pixels(resolved);
  if (amount === undefined || amount <= 0) return;
  const reset = definitions.some(d => d.origin === 'project' && d.theme && ['--*', '--spacing', '--spacing-*'].includes(d.name) && d.value === 'initial');
  const steps = new Set(decisions.filter(d => d.family === 'spacing' && d.origin === 'project' && d.tier === 'primitive' && !layoutRole.test(d.name.slice('--spacing-'.length)))
    .flatMap(d => { const n = d.resolved === undefined ? undefined : pixels(d.resolved); return n !== undefined && n > 0 && n <= 64 ? [n] : []; }));
  return { replaced: reset || steps.size >= 1, unit: { family: 'spacing', name: '--spacing', value: value.value, resolved: resolved!, refs: ['var(--spacing)'],
    origin: 'project', tier: 'primitive', why: "Your theme uses Tailwind's numeric spacing scale.", source: definition.source } };
}

/** Numeric utilities use half steps for the nearest actionable choices. */
export function numericStep(scale: NumericSpacing, step: number): Decision {
  const value = `calc(var(--spacing) * ${step})`;
  return { ...scale.unit, name: `--spacing-${step}`, value, resolved: `${Number((pixels(scale.unit.resolved!)! * step).toFixed(8))}px`, refs: [value] };
}
export function numericUse(decision: Decision): string | undefined {
  return decision.family === 'spacing' && decision.refs.includes(decision.value) && /^calc\(var\(--spacing\) \* [\d.]+\)$/.test(decision.value) ? decision.value : undefined;
}
