import { formatBoxShadow, formatDuration, formatEasing } from './css.js';
import { isShadow, num, round } from './model.js';
import type { Model, MotionModel, ShadowModel, Timing } from './model.js';

/** A spring as a CSS `linear()` easing and the time it takes to settle, so a spring recipe works without a library. */
export function springToLinear(t: Extract<Timing, { type: 'spring' }>): { duration: number; easing: string } {
  const mass = 'stiffness' in t ? t.mass ?? 1 : 1;
  const w0 = 'stiffness' in t ? Math.sqrt(t.stiffness / mass) : (2 * Math.PI) / (t.duration / 1000);
  const zeta = 'stiffness' in t ? t.damping / (2 * Math.sqrt(t.stiffness * mass)) : Math.max(0.05, 1 - t.bounce);
  const at = (s: number): number => {
    if (zeta < 1) { const wd = w0 * Math.sqrt(1 - zeta * zeta); return 1 - Math.exp(-zeta * w0 * s) * (Math.cos(wd * s) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * s)); }
    return 1 - Math.exp(-w0 * s) * (1 + w0 * s);
  };
  let settle = 0.05;
  for (let s = 0.01; s < 10; s += 0.01) if (Math.abs(at(s) - 1) > 0.002) settle = s;
  settle = Math.min(10, settle + 0.01);
  const steps = 20, points = Array.from({ length: steps + 1 }, (_, i) => i === steps ? 1 : round(at((settle * i) / steps), 3));
  return { duration: Math.round(settle * 1000), easing: `linear(${points.map(p => num(p)).join(', ')})` };
}
export function timingToCss(t: Timing): { duration: number; easing: string } {
  return t.type === 'curve' ? { duration: t.duration, easing: formatEasing(t.easing) } : springToLinear(t);
}
const transformOf = (m: MotionModel, at: 'from' | 'to'): string | null => {
  const parts: string[] = [];
  for (const c of m.changes) {
    const v = c[at], n = typeof v === 'number' ? v : Number.parseFloat(String(v));
    if (c.property === 'x') parts.push(`translateX(${typeof v === 'string' && /%$/.test(v) ? v : `${num(n)}px`})`);
    else if (c.property === 'y') parts.push(`translateY(${typeof v === 'string' && /%$/.test(v) ? v : `${num(n)}px`})`);
    else if (c.property === 'scale') parts.push(`scale(${num(n)})`);
    else if (c.property === 'rotate') parts.push(`rotate(${num(n)}deg)`);
  }
  return parts.length ? parts.join(' ') : null;
};
const properties = (m: MotionModel): string[] => [...new Set(m.changes.map(c => c.property === 'opacity' ? 'opacity' : c.property === 'boxShadow' ? 'box-shadow' : 'transform'))];
/** The CSS values an overlay can put on an element inline to show a recipe, with no write. */
export function renderModel(model: Model): Record<string, unknown> {
  if (isShadow(model)) return { boxShadow: formatBoxShadow(model as ShadowModel) };
  const m = model, css = timingToCss(m.timing);
  const state = (at: 'from' | 'to') => ({ ...(transformOf(m, at) ? { transform: transformOf(m, at) } : {}), ...Object.fromEntries(m.changes.filter(c => c.property === 'opacity').map(c => ['opacity', c[at]])) });
  return { transitionProperty: properties(m).join(', ') || 'all', transitionDuration: formatDuration(css.duration), transitionTimingFunction: css.easing,
    trigger: m.trigger, rest: state('from'), active: state('to') };
}
