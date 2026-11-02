import { formatEasing } from './css.js';
import { deriveMotion } from './dials.js';
import { isShadow, num } from './model.js';
import type { MotionModel, Recipe, ShadowLayer, ShadowModel, Timing } from './model.js';

/**
 * How far a recipe is from one the project already has, and what to say about it. The distance is over the model, never
 * the strings: per layer the offsets, blur, spread and alpha; per timing the duration and the curve's shape.
 */
export type VerdictKind = 'same' | 'close' | 'new';
export interface Verdict { kind: VerdictKind; text: string; differs: string[] }
export interface Nearest { id: string; name: string; token?: string; class?: string; distance: number }

const alphaOf = (l: ShadowLayer) => 'token' in l.color ? 1 : l.color.a;
const empty = (inset: boolean): ShadowLayer => ({ x: 0, y: 0, blur: 0, spread: 0, color: { r: 0, g: 0, b: 0, a: 0 }, inset });
const size = (l: ShadowLayer) => Math.abs(l.x) + Math.abs(l.y) + l.blur + Math.abs(l.spread);
function shadowParts(a: ShadowModel, b: ShadowModel): { distance: number; differs: string[] } {
  const n = Math.max(a.layers.length, b.layers.length);
  let total = 0, magnitude = 0; const differs: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = a.layers[i] ?? empty(b.layers[i]!.inset), q = b.layers[i] ?? empty(a.layers[i]!.inset);
    total += Math.abs(p.x - q.x) + Math.abs(p.y - q.y) + Math.abs(p.blur - q.blur) * 0.5 + Math.abs(p.spread - q.spread) + Math.abs(alphaOf(p) - alphaOf(q)) * 20 + (p.inset !== q.inset ? 4 : 0);
    magnitude += size(p) + size(q) + 1;
    const where = n > 1 ? `layer ${i + 1} ` : '';
    if (!a.layers[i]) differs.push(`yours has an extra layer ${i + 1}`);
    else if (!b.layers[i]) differs.push(`yours has no layer ${i + 1}`);
    else {
      if (p.y !== q.y || p.x !== q.x) differs.push(`${where}offset ${num(p.x)} ${num(p.y)}, yours ${num(q.x)} ${num(q.y)}`);
      if (p.blur !== q.blur) differs.push(`${where}blur ${num(p.blur)}px, yours ${num(q.blur)}px`);
      if (p.spread !== q.spread) differs.push(`${where}spread ${num(p.spread)}px, yours ${num(q.spread)}px`);
      if (alphaOf(p) !== alphaOf(q)) differs.push(`${where}alpha ${num(alphaOf(p))}, yours ${num(alphaOf(q))}`);
    }
  }
  return { distance: total / (magnitude / 2 || 1), differs };
}
const sameTrigger = (a: MotionModel, b: MotionModel) => a.trigger === b.trigger || !a.changes.length || !b.changes.length;
function timingParts(a: Timing, b: Timing): { distance: number; differs: string[] } {
  const differs: string[] = []; let d = 0;
  const log = (x: number, y: number) => Math.abs(Math.log((x || 1) / (y || 1)));
  if (a.type === 'curve' && b.type === 'curve') {
    d += log(a.duration, b.duration) * 1.5; if (a.duration !== b.duration) differs.push(`${num(a.duration)}ms, yours ${num(b.duration)}ms`);
    if (typeof a.easing !== 'string' && typeof b.easing !== 'string') {
      const be = b.easing, c = a.easing.reduce((s, v, i) => s + Math.abs(v - be[i]!), 0); d += c; if (c) differs.push(`curve ${formatEasing(a.easing)}, yours ${formatEasing(b.easing)}`);
    } else if (a.easing !== b.easing) { d += 1; differs.push('a different easing'); }
  } else if (a.type === 'spring' && b.type === 'spring') {
    if ('stiffness' in a && 'stiffness' in b) {
      d += log(a.stiffness, b.stiffness) + log(a.damping, b.damping);
      if (a.stiffness !== b.stiffness) differs.push(`stiffness ${a.stiffness}, yours ${b.stiffness}`);
      if (a.damping !== b.damping) differs.push(`damping ${a.damping}, yours ${b.damping}`);
    } else if ('duration' in a && 'duration' in b) {
      d += log(a.duration, b.duration) + Math.abs(a.bounce - b.bounce); if (a.duration !== b.duration) differs.push(`${num(a.duration)}ms, yours ${num(b.duration)}ms`); if (a.bounce !== b.bounce) differs.push(`bounce ${a.bounce}, yours ${b.bounce}`);
    } else { d += 1; differs.push('a different kind of spring'); }
  } else { d += 2; differs.push(`${a.type === 'spring' ? 'a spring' : 'a curve'}, yours ${b.type === 'spring' ? 'a spring' : 'a curve'}`); }
  return { distance: d, differs };
}
function motionParts(a: MotionModel, b: MotionModel): { distance: number; differs: string[] } {
  if (!sameTrigger(a, b)) return { distance: 99, differs: [`on ${a.trigger}, not ${b.trigger}`] };
  const t = timingParts(a.timing, b.timing);
  const da = deriveMotion(a), db = deriveMotion(b);
  const travel = Math.abs(da.distance - db.distance); if (travel) t.differs.push(`moves ${num(da.distance)}px, yours ${num(db.distance)}px`);
  return { distance: t.distance + travel / 8, differs: t.differs };
}
export function distance(a: Recipe, b: Recipe): { distance: number; differs: string[] } {
  if (a.kind !== b.kind) return { distance: Infinity, differs: [] };
  return isShadow(a.model) && isShadow(b.model) ? shadowParts(a.model, b.model) : motionParts(a.model as MotionModel, b.model as MotionModel);
}

const thresholds = { shadow: { same: 0.005, close: 0.3 }, motion: { same: 0.02, close: 0.6 } };
/** The nearest of the project's own recipes to this one, and a plain verdict about it. */
export function map(recipe: Recipe, yours: Recipe[]): { nearest: Nearest | null; verdict: Verdict } {
  let best: { r: Recipe; distance: number; differs: string[] } | null = null;
  for (const r of yours) {
    if (r.kind !== recipe.kind) continue;
    const d = distance(recipe, r);
    if (!best || d.distance < best.distance) best = { r, ...d };
  }
  if (!best || !isFinite(best.distance)) return { nearest: null, verdict: { kind: 'new', text: `new to this project`, differs: [] } };
  const nearest: Nearest = { id: best.r.id, name: best.r.name, ...(best.r.token ? { token: best.r.token } : {}), ...(best.r.class ? { class: best.r.class } : {}), distance: Math.round(best.distance * 1000) / 1000 };
  const t = thresholds[recipe.kind];
  const label = best.r.token ? best.r.token.replace(/^--/, '') : best.r.name;
  if (best.distance <= t.same) return { nearest, verdict: { kind: 'same', text: `same as your ${label}`, differs: [] } };
  if (best.distance <= t.close) { const differs = best.differs.slice(0, 3); return { nearest, verdict: { kind: 'close', text: `close to your ${label}${differs.length ? `: ${differs.join(', ')}` : ''}`, differs } }; }
  return { nearest: { ...nearest }, verdict: { kind: 'new', text: `new to this project (nearest is your ${label})`, differs: [] } };
}
