import { num, round } from './model.js';
import type { Easing, ShadowColor, ShadowLayer, ShadowModel } from './model.js';

/** Split on a separator at the top level of parentheses and quotes. */
export function splitTop(text: string, separator: ',' | ' '): string[] {
  const out: string[] = []; let depth = 0, quote = '', current = '';
  for (const ch of text) {
    if (quote) { current += ch; if (ch === quote) quote = ''; continue; }
    if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (depth === 0 && (separator === ',' ? ch === ',' : /\s/.test(ch))) { if (separator === ',' || current) out.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

const length = /^(-?(?:\d+\.?\d*|\.\d+))(?:px)?$/;
export function parseColor(text: string): ShadowColor {
  const s = text.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join('');
    if (h.length === 6 || h.length === 8) return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? round(parseInt(h.slice(6, 8), 16) / 255) : 1, notation: 'hex' };
  }
  const fn = /^rgba?\(\s*([^)]*)\)$/i.exec(s);
  if (fn) {
    const body = fn[1]!, comma = body.includes(',');
    const parts = body.split(comma ? /\s*,\s*/ : /\s*[\s/]\s*/).filter(Boolean);
    if (parts.length >= 3 && parts.length <= 4 && parts.slice(0, 3).every(p => /^\d+(\.\d+)?$/.test(p))) {
      const alpha = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? Number(parts[3].slice(0, -1)) / 100 : Number(parts[3]);
      if (Number.isFinite(alpha)) return { r: Number(parts[0]), g: Number(parts[1]), b: Number(parts[2]), a: alpha, notation: comma ? 'rgba' : 'rgb' };
    }
  }
  return { token: s };
}
export function formatColor(color: ShadowColor): string {
  if ('token' in color) return color.token;
  const { r, g, b, a } = color, alpha = num(a);
  if (color.notation === 'hex') {
    const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}${a < 1 ? h(a * 255) : ''}`;
  }
  if (color.notation === 'rgba') return `rgba(${num(r)}, ${num(g)}, ${num(b)}, ${alpha})`;
  return a === 1 ? `rgb(${num(r)} ${num(g)} ${num(b)})` : `rgb(${num(r)} ${num(g)} ${num(b)} / ${alpha})`;
}

/** A box-shadow value as layers, or null when it is not one the model can hold (none, var(), rem lengths, calc). */
export function parseBoxShadow(text: string): ShadowModel | null {
  const value = text.trim().replace(/\s*!important$/, '');
  if (!value || /^(?:none|inherit|initial|unset|revert)$/i.test(value) || /^var\(/i.test(value)) return null;
  const layers: ShadowLayer[] = [];
  for (const part of splitTop(value, ',')) {
    const words = splitTop(part, ' ');
    let inset = false, insetAt = -1, colorAt = -1, firstLength = -1; const lengths: number[] = []; let color: string | undefined;
    for (const [i, word] of words.entries()) {
      if (/^inset$/i.test(word)) { inset = true; insetAt = i; continue; }
      const match = length.exec(word);
      if (match) { lengths.push(Number(match[1])); if (firstLength < 0) firstLength = i; continue; }
      if (color !== undefined) return null;
      color = word; colorAt = i;
    }
    if (lengths.length < 2 || lengths.length > 4) return null;
    const layer: ShadowLayer = { x: lengths[0]!, y: lengths[1]!, blur: lengths[2] ?? 0, spread: lengths[3] ?? 0, color: color === undefined ? { token: '' } : parseColor(color), inset, lengths: lengths.length as 2 | 3 | 4 };
    if (color !== undefined && colorAt < firstLength) layer.colorFirst = true;
    if (inset && insetAt === words.length - 1) layer.insetLast = true;
    layers.push(layer);
  }
  return layers.length ? { layers } : null;
}
const px = (n: number): string => n === 0 ? '0' : `${num(n)}px`;
export function formatBoxShadow(model: ShadowModel): string {
  return model.layers.map(l => {
    const lengths = [px(l.x), px(l.y)];
    const count = Math.max(l.lengths ?? 2, l.spread !== 0 ? 4 : l.blur !== 0 || (l.lengths ?? 2) >= 3 ? 3 : 2);
    if (count >= 3) lengths.push(px(l.blur));
    if (count >= 4) lengths.push(px(l.spread));
    const color = formatColor(l.color);
    const parts = (l.colorFirst ? [color, ...lengths] : [...lengths, color]).filter(Boolean);
    if (l.inset) l.insetLast ? parts.push('inset') : parts.unshift('inset');
    return parts.join(' ');
  }).join(', ');
}

const named: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1],
};
const motionNames: Record<string, [number, number, number, number]> = { easeIn: [0.42, 0, 1, 1], easeOut: [0, 0, 0.58, 1], easeInOut: [0.42, 0, 0.58, 1], circIn: [0.55, 0, 1, 0.45], circOut: [0, 0.55, 0.45, 1], circInOut: [0.85, 0, 0.15, 1], backIn: [0.31, 0.01, 0.66, -0.59], backOut: [0.33, 1.53, 0.69, 0.99], backInOut: [0.68, -0.6, 0.32, 1.6], anticipate: [0.36, 0, 0.66, -0.56] };
export function parseEasing(text: string): Easing | null {
  const s = text.trim();
  const bezier = /^cubic-bezier\(\s*([^)]*)\)$/i.exec(s);
  if (bezier) { const n = bezier[1]!.split(/\s*,\s*/).map(Number); return n.length === 4 && n.every(Number.isFinite) ? n as [number, number, number, number] : null; }
  if (/^linear\(/i.test(s)) return s;
  return named[s] ?? motionNames[s] ?? null;
}
export const formatEasing = (e: Easing): string => typeof e === 'string' ? e : `cubic-bezier(${e.map(n => num(n)).join(', ')})`;
export function parseDuration(text: string): number | null {
  const m = /^(-?\d*\.?\d+)\s*(ms|s)$/i.exec(text.trim());
  return m ? round(Number(m[1]) * (m[2]!.toLowerCase() === 's' ? 1000 : 1), 2) : null;
}
export const formatDuration = (ms: number): string => `${num(ms)}ms`;
