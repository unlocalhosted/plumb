import type { Decision } from '../report.js';
import type { CssVariable } from './css.js';
import { pixels, resolveValue } from './resolve.js';
import type { Variable } from './resolve.js';
import { references } from '../collect/source.js';

/** `replaced`: named steps or a reset stand in for the numeric scale when judging. `reset`: the theme dropped the scale itself (`--spacing-*: initial`), so an editor has no multiplier to step by. */
export interface NumericSpacing { unit: Decision; replaced: boolean; reset: boolean }

/** Recognize homogeneous multiples, including Tailwind's nested sibling/reverse
 * arithmetic. The length resolver permits only scalar products/divisors: a zero
 * intercept proves this is a spacing multiple, not a token plus a raw offset. */
export function numericExpression(value: string): boolean {
  // Most emitted utilities need no arithmetic probes.
  if (/^(?:calc\(\s*(?:var\(--spacing\)\s*\*\s*[-+]?(?:\d*\.)?\d+|[-+]?(?:\d*\.)?\d+\s*\*\s*var\(--spacing\))\s*\)|var\(--spacing\))$/.test(value)) return true;
  const refs = references(value);
  if (!refs.includes('--spacing') || refs.some(name => name !== '--spacing')) return false;
  const at = (base: string) => {
    const resolved = resolveValue(value, new Map([['--spacing', { value: base }]]));
    return resolved === undefined ? undefined : pixels(resolved);
  };
  return at('0px') === 0 && at('1px') !== undefined;
}

/** Layout geometry is not a reusable ladder, even when three dimensions are small. */
const layoutRole = /(?:^|-)(?:page|rail|content|reader|safe|tab|sidebar|header|footer|panel|shell|viewport|screen|container|width|height|max|min)(?:-|$)/;
export function numericSpacing(definitions: CssVariable[], decisions: Decision[], variables: Map<string, Variable>, theme: Set<string>): NumericSpacing | undefined {
  // one reader of --spacing: a second definition or a base that reads a variable with no single value is a guess, and a guess is not a scale
  const base = spacingBase(definitions, variables, theme);
  if (!base || base.note) return;
  const definition = definitions.findLast(d => d.name === '--spacing' && (d.theme || d.root));
  const value = variables.get('--spacing');
  if (!definition || !value || value.dynamic) return;
  const resolved = resolveValue('var(--spacing)', variables), amount = resolved === undefined ? undefined : pixels(resolved);
  if (amount === undefined || amount <= 0) return;
  const reset = definitions.some(d => d.origin === 'project' && d.theme && ['--*', '--spacing', '--spacing-*'].includes(d.name) && d.value === 'initial');
  const steps = new Set(decisions.filter(d => d.family === 'spacing' && d.origin === 'project' && d.tier === 'primitive' && !layoutRole.test(d.name.slice('--spacing-'.length)))
    .flatMap(d => { const n = d.resolved === undefined ? undefined : pixels(d.resolved); return n !== undefined && n > 0 && n <= 64 ? [n] : []; }));
  return { replaced: reset || steps.size >= 1, reset, unit: { family: 'spacing', name: '--spacing', value: value.value, resolved: resolved!, refs: ['var(--spacing)'],
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

/** The multiplier an editor needs when {@link numericSpacing} declined it: `--spacing` defined twice with different values, or a
 * base that reads another variable (`calc(0.25rem * var(--z))`). The last definition wins, and a variable it reads that has no
 * single value is read at 1, said in `note`. */
export interface SpacingBase { px: number; text: string; note?: string }
export function spacingBase(definitions: CssVariable[], variables: Map<string, Variable>, theme: Set<string>): SpacingBase | undefined {
  if (!theme.has('--spacing')) return;
  const definition = definitions.findLast(d => d.name === '--spacing' && (d.theme || d.root));
  if (!definition) return;
  const text = definition.value.trim(), notes: string[] = [];
  const known = new Map(variables);
  if (variables.get('--spacing')?.dynamic) notes.push('--spacing is defined more than once; the last definition is read');
  known.set('--spacing', { value: text });
  for (const name of references(text)) {
    if (name === '--spacing') continue;
    const variable = variables.get(name);
    if (!variable || variable.dynamic || resolveValue(`var(${name})`, variables) === undefined) { known.set(name, { value: '1' }); notes.push(`${name} read at 1`); }
  }
  const resolved = resolveValue('var(--spacing)', known), px = resolved === undefined ? undefined : pixels(resolved);
  if (px === undefined || px <= 0) return;
  return { px, text, ...(notes.length ? { note: `${notes.join('; ')}.` } : {}) };
}

/** What an element editor steps spacing by, from the one reading of `--spacing`: the numeric scale when the theme has one, else the base
 * it could guess. Named steps do not take it away (`p-4` and `p-card` are both valid in v4); only a reset of the scale does. */
export function spacingUnit(numeric: NumericSpacing | undefined, base: SpacingBase | undefined): { px: number; text: string; note?: string } | null {
  if (numeric) { const px = pixels(numeric.unit.resolved ?? ''); return numeric.reset || px === undefined ? null : { px, text: numeric.unit.value }; }
  return base ? { px: base.px, text: base.text, ...(base.note ? { note: base.note } : {}) } : null;
}
