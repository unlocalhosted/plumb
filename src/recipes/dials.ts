import { round } from './model.js';
import type { MotionModel, RGBA, ShadowLayer, ShadowModel } from './model.js';

/**
 * Generic dials: they work on the model, so they work for any recipe, imported or not. All are pure and return a new
 * model. Multipliers are relative to the model they are given (1 is "as read"), so a dial set and then set back
 * (height 1.5, then 1/1.5) returns the model; angles and scales are absolute.
 */
const rad = (d: number) => d * Math.PI / 180, deg = (r: number) => r * 180 / Math.PI;
const dominant = (layers: ShadowLayer[]): ShadowLayer | undefined => layers.filter(l => !l.inset).sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y))[0] ?? layers[0];

/** The numbers an editor shows for a shadow, computed from its layers. */
export function deriveShadow(model: ShadowModel): { height: number; softness: number; light: number; layers: number; tint: string | null } {
  const top = dominant(model.layers);
  if (!top) return { height: 0, softness: 1, light: 0, layers: 0, tint: null };
  const reach = Math.hypot(top.x, top.y);
  const color = !top.color || 'token' in top.color ? null : top.color;
  return { height: round(reach, 2), softness: round(reach ? top.blur / reach : 1, 2), light: round(reach ? deg(Math.atan2(-top.x, top.y)) : model.light ?? 0, 1),
    layers: model.layers.length, tint: color ? `rgb(${round(color.r, 0)} ${round(color.g, 0)} ${round(color.b, 0)})` : null };
}
const mapLayers = (model: ShadowModel, fn: (l: ShadowLayer) => ShadowLayer): ShadowModel => ({ ...model, layers: model.layers.map(fn) });
/** Offsets, blur, spread and alpha scale together; alpha by the square root of the factor, so the shadow darkens as it rises, slowly, and the dial inverts. */
export function shadowHeight(model: ShadowModel, factor: number): ShadowModel {
  if (!(factor > 0)) return model;
  return mapLayers(model, l => ({ ...l, x: round(l.x * factor, 2), y: round(l.y * factor, 2), blur: round(l.blur * factor, 2), spread: round(l.spread * factor, 2),
    color: !l.color || 'token' in l.color ? l.color : { ...l.color, a: round(Math.min(1, l.color.a * Math.sqrt(factor)), 3) } }));
}
/** Blur against offset: only the blur is multiplied. */
export function shadowSoftness(model: ShadowModel, factor: number): ShadowModel {
  return factor > 0 ? mapLayers(model, l => ({ ...l, blur: round(l.blur * factor, 2) })) : model;
}
/** One light: every layer's offset turns around the origin until the dominant layer is lit from this angle; lengths and the ratios between layers stay. */
export function shadowLight(model: ShadowModel, to: number): ShadowModel {
  const by = to - deriveShadow(model).light;
  if (!by) return model;
  return mapLayers(model, l => {
    const r = Math.hypot(l.x, l.y); if (!r) return l;
    const angle = Math.atan2(-l.x, l.y) + rad(by);
    return { ...l, x: round(-Math.sin(angle) * r, 2), y: round(Math.cos(angle) * r, 2) };
  });
}
/** The colour of the surface below: every channel colour moves toward it by `amount` (0 to 1), alpha kept. */
export function shadowTint(model: ShadowModel, surface: { r: number; g: number; b: number }, amount = 0.6): ShadowModel {
  const mix = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return mapLayers(model, l => !l.color || 'token' in l.color ? l : { ...l, color: { ...l.color, r: mix(l.color.r, surface.r), g: mix(l.color.g, surface.g), b: mix(l.color.b, surface.b) } satisfies RGBA });
}

export interface ShadowDials { height?: number; softness?: number; light?: number; tint?: { r: number; g: number; b: number; amount?: number } }
export const shadowDials = (model: ShadowModel, d: ShadowDials): ShadowModel => {
  let m = model;
  if (d.height !== undefined) m = shadowHeight(m, d.height);
  if (d.softness !== undefined) m = shadowSoftness(m, d.softness);
  if (d.light !== undefined) m = shadowLight(m, d.light);
  if (d.tint) m = shadowTint(m, d.tint, d.tint.amount);
  return m;
};

// ---- motion ----
const pxValue = /^(-?\d*\.?\d+)px$/;
const moves = (property: string) => /^(?:x|y|translate[XY]?)$/.test(property);
export function deriveMotion(model: MotionModel): { duration: number | null; bounce: number; distance: number; startScale: number | null } {
  const t = model.timing;
  const duration = t.type === 'curve' || 'duration' in t ? t.duration : null;
  const bounce = t.type === 'curve' ? (typeof t.easing !== 'string' && t.easing[3] > 1 ? round((t.easing[3] - 1) / 1.5, 2) : 0)
    : 'bounce' in t ? t.bounce : round(Math.max(0, 1 - t.damping / (2 * Math.sqrt(t.stiffness * (t.mass ?? 1)))), 2);
  const travel = model.changes.filter(c => moves(c.property)).flatMap(c => [c.from, c.to].map(v => typeof v === 'number' ? v : pxValue.test(String(v)) ? Number(String(v).replace('px', '')) : 0));
  const scale = model.changes.find(c => c.property === 'scale');
  return { duration, bounce, distance: round(Math.max(0, ...travel.map(Math.abs)), 2), startScale: scale ? Number(scale.from) : null };
}
/** Duration divides by the factor; a spring's stiffness multiplies by its square and damping by the factor, which keeps its damping ratio. */
export function motionSpeed(model: MotionModel, factor: number): MotionModel {
  if (!(factor > 0)) return model;
  const t = model.timing;
  const timing = t.type === 'curve' || 'duration' in t ? { ...t, duration: round(t.duration / factor, 2) } as typeof t
    : { ...t, stiffness: round(t.stiffness * factor * factor, 2), damping: round(t.damping * factor, 2) };
  return { ...model, timing };
}
/** Overshoot: a spring's damping ratio (or its bounce), a curve's last control point above 1 (1 + bounce * 1.5, the pack's rule). 0 to 1. */
export function motionBounce(model: MotionModel, bounce: number): MotionModel {
  const b = Math.max(0, Math.min(1, bounce)), t = model.timing;
  if (t.type === 'spring') {
    if ('bounce' in t) return { ...model, timing: { ...t, bounce: round(b, 2) } };
    const critical = 2 * Math.sqrt(t.stiffness * (t.mass ?? 1));
    return { ...model, timing: { ...t, damping: round(critical * (1 - b), 2) } };
  }
  if (typeof t.easing === 'string') return model;
  const e = t.easing;
  return { ...model, timing: { ...t, easing: [e[0], e[1], e[2], round(1 + b * 1.5, 2)] } };
}
const scaled = (v: number | string, k: number): number | string => typeof v === 'number' ? round(v * k, 2) : pxValue.test(v) ? `${round(Number(v.replace('px', '')) * k, 2)}px` : v;
/** Translate amounts (x, y, translateX/Y, numbers or px) multiplied. */
export function motionDistance(model: MotionModel, factor: number): MotionModel {
  return { ...model, changes: model.changes.map(c => moves(c.property) ? { ...c, from: scaled(c.from, factor), to: scaled(c.to, factor) } : c) };
}
/** The scale an entrance starts from (or a press ends at). */
export function motionStartScale(model: MotionModel, start: number): MotionModel {
  const entering = model.trigger === 'enter' || model.trigger === 'exit';
  return { ...model, changes: model.changes.map(c => c.property !== 'scale' ? c
    : !entering ? { ...c, to: start }
    : model.trigger === 'enter' ? { ...c, from: start } : { ...c, to: start }) };
}
export interface MotionDials { speed?: number; bounce?: number; distance?: number; startScale?: number }
export const motionDials = (model: MotionModel, d: MotionDials): MotionModel => {
  let m = model;
  if (d.speed !== undefined) m = motionSpeed(m, d.speed);
  if (d.bounce !== undefined) m = motionBounce(m, d.bounce);
  if (d.distance !== undefined) m = motionDistance(m, d.distance);
  if (d.startScale !== undefined) m = motionStartScale(m, d.startScale);
  return m;
};
