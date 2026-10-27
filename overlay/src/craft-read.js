/* ─────────────────────────────────────────────────────────
 * CRAFT READ · React Plumber overlay
 *
 * The small reads every craft module shares (colours, an element's classes, the utility that sets a property), in a
 * module of their own so craft.js, craft-rules.js and verdict.js import them without a cycle.
 * ───────────────────────────────────────────────────────── */

import { resolveSpec, specFor } from './craft-spec.js';

// The spec in effect on this page (docs/briefs/craft-spec.md): the standard until the project's own arrives from the
// server (craft.js asks for it), then that. `rule(id)` is the resolved entry for one rule: { enabled, tier, …values }.
export const SPEC = { value: resolveSpec(), loaded: false, rule(id) { return specFor(SPEC.value, id) ?? { enabled: true }; } };

// 'rgb(r, g, b)' or 'rgba(r, g, b, a)' → [r, g, b, a]; null for anything else (a colour the page never resolved)
export function rgb(s) {
  const m = String(s ?? '').match(/^rgba?\(([^)]+)\)$/);
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

// An element's classes as the rules read them: its own, or the ones a suggestion would give it while the arbitration
// re-runs a rule on the page as it will be (Facts.with). Set and cleared in one synchronous call; never written.
export const VIRTUAL = new WeakMap();
export const classesOf = (el) => VIRTUAL.get(el) ?? el.getAttribute('class') ?? '';

// The utility in a class list that sets a property, by its Tailwind prefix: 'rounded-card' for /^rounded(-|$)/,
// with variants stripped (hover:rounded-lg is not the rest state). Side and corner forms are excluded by `not`.
export function utility(el, prefix, { not } = {}) {
  for (const c of classesOf(el).split(/\s+/)) {
    if (!c) continue;
    let depth = 0, colon = -1;
    for (let i = 0; i < c.length; i++) { if (c[i] === '[') depth++; else if (c[i] === ']') depth--; else if (c[i] === ':' && !depth) colon = i; }
    if (colon >= 0) continue;
    const base = c.replace(/^!/, '').replace(/!$/, '').replace(/^-/, '');
    if (base !== prefix && !base.startsWith(prefix + '-')) continue;
    const suffix = base === prefix ? '' : base.slice(prefix.length + 1);
    if (not && not.test(suffix)) continue;
    return c;
  }
  return null;
}

