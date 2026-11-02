import { parseBoxShadow, parseEasing, parseDuration } from './css.js';
import type { Easing, MotionChange, MotionModel, Recipe, Timing, Trigger } from './model.js';
import { round } from './model.js';
import { UsageError } from '../errors.js';
import first from './packs/first.json' with { type: 'json' };

/**
 * The recipe pack format (docs/research/recipe-pack.md) as one reader among several. Formulas are the format's own
 * small language (numbers, + - * / %, parentheses, dial and variable names, min max clamp round abs sin cos pow sqrt mix),
 * evaluated at the dials' defaults, so a pack recipe becomes the model at its published values.
 */
type Scope = Record<string, number>;
export function evaluate(expression: string, scope: Scope): number {
  const tokens = expression.match(/\d*\.?\d+(?:e[+-]?\d+)?|[A-Za-z_]\w*|[-+*/%(),]/g) ?? [];
  let at = 0;
  const peek = () => tokens[at], next = () => tokens[at++];
  const fail = (): never => { throw new UsageError(`A recipe formula could not be read: ${expression}`); };
  const call = (name: string, args: number[]): number => {
    const [a = 0, b = 0, c = 0] = args, rad = (d: number) => d * Math.PI / 180;
    switch (name) {
      case 'min': return Math.min(...args); case 'max': return Math.max(...args);
      case 'clamp': return Math.min(Math.max(a, b), c);
      case 'round': return b ? Math.round(a / b) * b : Math.round(a);
      case 'abs': return Math.abs(a); case 'sin': return Math.sin(rad(a)); case 'cos': return Math.cos(rad(a));
      case 'pow': return a ** b; case 'sqrt': return Math.sqrt(a); case 'mix': return a + (b - a) * c;
      default: return fail();
    }
  };
  function primary(): number {
    const t = next();
    if (t === undefined) return fail();
    if (t === '(') { const v = sum(); if (next() !== ')') fail(); return v; }
    if (t === '-') return -primary();
    if (t === '+') return primary();
    if (/^[\d.]/.test(t)) return Number(t);
    if (peek() === '(') {
      next(); const args: number[] = [];
      if (peek() !== ')') do args.push(sum()); while (peek() === ',' && next());
      if (next() !== ')') fail();
      return call(t, args);
    }
    const v = scope[t]; return v === undefined ? fail() : v;
  }
  function product(): number { let v = primary(); while (peek() === '*' || peek() === '/' || peek() === '%') { const op = next(); const r = primary(); v = op === '*' ? v * r : op === '/' ? v / r : v % r; } return v; }
  function sum(): number { let v = product(); while (peek() === '+' || peek() === '-') { const op = next(); const r = product(); v = op === '+' ? v + r : v - r; } return v; }
  const value = sum();
  if (at < tokens.length) fail();
  return value;
}
const template = (text: string, scope: Scope): string => text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, e: string) => String(round(evaluate(e, scope), 3)));
function resolveScope(recipe: PackRecipe): Scope {
  const scope: Scope = {};
  for (const d of recipe.dials ?? []) scope[d.id] = d.default;
  for (const [name, formula] of Object.entries(recipe.variables ?? {})) scope[name] = evaluate(formula, scope);
  return scope;
}
const fill = (value: unknown, scope: Scope): unknown => {
  if (typeof value === 'string') { const m = /^\{\{\s*([^}]+?)\s*\}\}$/.exec(value); return m ? round(evaluate(m[1]!, scope), 3) : template(value, scope); }
  if (Array.isArray(value)) return value.map(v => fill(v, scope));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, scope)]));
  return value;
};

interface PackRecipe {
  id: string; name: string; kind: string; summary?: string;
  source: { library?: string; url?: string; licence: string; attribution?: string; copied?: string };
  tokens?: { name: string; value: string | { light: string; dark?: string } }[];
  variables?: Record<string, string>; dials?: { id: string; default: number }[];
  apply?: { type: string; requires?: string; props?: Record<string, unknown>; css?: string }[];
  requires?: string;
}
export interface Pack { format: string; id: string; name: string; version?: string; recipes: PackRecipe[]; licence?: { spdx: string } }
const allowed = new Set(['MIT', 'Apache-2.0', 'none']);
const rest: Record<string, number | string> = { x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 };
const num = (v: unknown, fallback = 0): number => typeof v === 'number' ? v : fallback;

/** motion/react's transition object (seconds) as the model's timing (milliseconds). */
export function timingFromTransition(t: Record<string, unknown> | undefined): Timing | null {
  if (!t) return null;
  if (t.type === 'spring' || (t.type === undefined && (typeof t.stiffness === 'number' || typeof t.bounce === 'number' || typeof t.damping === 'number'))) {
    if (typeof t.stiffness === 'number' || typeof t.damping === 'number' || (typeof t.duration !== 'number' && typeof t.bounce !== 'number')) {
      return { type: 'spring', stiffness: num(t.stiffness, 100), damping: num(t.damping, 10), ...(typeof t.mass === 'number' ? { mass: t.mass } : {}) };
    }
    return { type: 'spring', duration: round(num(t.duration, 0.3) * 1000, 2), bounce: num(t.bounce, 0.25) };
  }
  if (typeof t.duration === 'number' || t.ease !== undefined) {
    const ease = Array.isArray(t.ease) && t.ease.length === 4 && t.ease.every(n => typeof n === 'number') ? t.ease as Easing
      : typeof t.ease === 'string' ? parseEasing(t.ease) ?? [0.42, 0, 0.58, 1] : [0.42, 0, 0.58, 1] as Easing;
    return { type: 'curve', duration: round(num(t.duration, 0.3) * 1000, 2), easing: ease };
  }
  return null;
}
const changesBetween = (from: Record<string, unknown>, to: Record<string, unknown>): MotionChange[] =>
  Object.keys({ ...from, ...to }).filter(k => k !== 'transition' && (typeof (to[k] ?? from[k]) === 'number' || typeof (to[k] ?? from[k]) === 'string'))
    .map(k => ({ property: k, from: (from[k] ?? rest[k] ?? 0) as number | string, to: (to[k] ?? rest[k] ?? 0) as number | string }))
    .filter(c => c.from !== c.to);

export function readPack(pack: Pack): Recipe[] {
  const out: Recipe[] = [];
  for (const r of pack.recipes) {
    if (!allowed.has(r.source.licence)) continue;
    const scope = resolveScope(r);
    const source = { reader: 'pack', ...(r.source.library ? { library: r.source.library } : {}), licence: r.source.licence, ...(r.source.url ? { url: r.source.url } : {}),
      ...(r.source.licence !== 'none' && r.source.attribution ? { credit: `${r.source.attribution}${r.source.url ? ` ${r.source.url.replace(/\/raw\.githubusercontent\.com\//, '/github.com/').replace('/main/', '/blob/main/')}` : ''}` } : {}), token: `${pack.id}:${r.id}` };
    if (r.kind === 'shadow') {
      for (const token of r.tokens ?? []) {
        const light = typeof token.value === 'string' ? token.value : token.value.light;
        const text = template(light, scope);
        const model = /\{(?:var|prop|class):/.test(text) ? null : parseBoxShadow(text);
        if (model) { out.push({ id: r.id, name: r.name, kind: 'shadow', model, source, ...(r.summary ? { summary: r.summary } : {}) }); break; }
      }
      continue;
    }
    const props = r.apply?.find(a => a.type === 'motion-props')?.props;
    const hasCss = r.apply?.some(a => a.type === 'css') ?? false;
    if (!props) continue;
    const p = fill(props, scope) as Record<string, Record<string, unknown> | undefined>;
    const transition = (o: Record<string, unknown> | undefined): Timing | null => timingFromTransition((o?.transition ?? undefined) as Record<string, unknown> | undefined);
    const base = timingFromTransition(p.transition as Record<string, unknown> | undefined);
    const make = (trigger: Trigger, changes: MotionChange[], timing: Timing | null, requires: MotionModel['requires']): MotionModel | null =>
      timing ? { trigger, changes, timing, requires } : null;
    const requires: MotionModel['requires'] = r.requires === 'motion' || !hasCss ? 'motion' : 'none';
    let model: MotionModel | null = null, exit: MotionModel | undefined;
    if (p.whileHover) model = make('hover', changesBetween({}, p.whileHover), transition(p.whileHover) ?? base, requires);
    else if (p.whileTap) model = make('press', changesBetween({}, p.whileTap), transition(p.whileTap) ?? base, requires);
    else if (p.whileFocus) model = make('focus', changesBetween({}, p.whileFocus), transition(p.whileFocus) ?? base, requires);
    else if (r.kind === 'motion.layout' || (p.layout !== undefined && !p.initial)) model = make('layout', [], base ?? transition(p.animate), requires);
    else if (p.initial && p.animate) {
      model = make('enter', changesBetween(p.initial, p.animate), transition(p.animate) ?? base, requires);
      if (p.exit) { const e = make('exit', changesBetween(p.animate, p.exit), transition(p.exit) ?? base, hasCss ? 'data-state' : 'motion'); if (e) exit = e; }
    }
    if (model) out.push({ id: r.id, name: r.name, kind: 'motion', model, source, ...(exit ? { exit } : {}), ...(r.summary ? { summary: r.summary } : {}) });
  }
  return out;
}
export const firstPack: Pack = first as unknown as Pack;
void parseDuration;
