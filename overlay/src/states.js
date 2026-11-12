/* ─────────────────────────────────────────────────────────
 * STATES · React Plumber overlay (docs/briefs/pass-states.md; read and propose)
 *
 * A disabled control looks the same everywhere: being unavailable is one state, so it is one decision, not a fade
 * picked per button. Material 3 gives disabled content one opacity, 38% (m3.material.io/foundations/interaction/states,
 * "Disabled"). The theme's own value leads when it names one; otherwise Material's, on the framework's nearest step.
 *
 *  theme    disabledOpacity() → { pct, cls, from }: the theme's named disabled opacity (an `opacity-disabled` utility or
 *           an `--opacity-disabled` variable, in the page's CSS or its source), else Material's 38% as `opacity-40`
 *  read     readStates() → [{ el, cls, variant, pct }]: every stamped element with an opacity set for its disabled
 *           state (disabled:, aria-disabled:, data-[disabled]:, group-disabled:, peer-disabled:)
 *  propose  proposeStates(places, target) → { moves, kept }: each to the one disabled opacity, its variant kept
 *
 * Nothing here writes. Contrast is not judged here: craft/disabled-contrast still says when faded words can't be read.
 * ───────────────────────────────────────────────────────── */
import { classesOf } from './craft-read.js';
import { sourceTexts } from './theme-source.js';

const MATERIAL = 38; // Material 3: disabled content at 38% opacity
const STEP = 40;     // the nearest step every Tailwind version has (opacity-40)
const VARIANT = /^((?:group-|peer-)?(?:disabled|aria-disabled|data-\[disabled\]|data-disabled)):opacity-(\d+|\[[\d.]+%?\])$/;
const pctOf = (v) => { const m = /^\[?([\d.]+)(%?)\]?$/.exec(v); if (!m) return null; const n = Number(m[1]); return m[2] || !v.startsWith('[') ? n : n <= 1 ? n * 100 : n; };

/** The one disabled opacity: the theme's, else Material's. */
export async function disabledOpacity() {
  const named = (text) => /@utility\s+opacity-disabled\s*\{[^}]*?opacity\s*:\s*([\d.]+%?)/.exec(text) ?? /--opacity-disabled\s*:\s*([\d.]+%?)/.exec(text);
  for (const { text } of await sourceTexts()) {
    const m = named(text);
    if (m) { const v = m[1].endsWith('%') ? parseFloat(m[1]) : parseFloat(m[1]) * (parseFloat(m[1]) <= 1 ? 100 : 1); return { pct: v, cls: /@utility/.test(m[0]) ? 'opacity-disabled' : 'opacity-(--opacity-disabled)', from: 'theme' }; }
  }
  const root = getComputedStyle(document.documentElement).getPropertyValue('--opacity-disabled').trim();
  if (root) { const v = parseFloat(root); return { pct: root.endsWith('%') || v > 1 ? v : v * 100, cls: 'opacity-(--opacity-disabled)', from: 'theme' }; }
  return { pct: STEP, cls: `opacity-${STEP}`, from: 'material', material: MATERIAL };
}

/** Every stamped element with an opacity for its disabled state. */
export function readStates(root = document.body) {
  const out = [];
  for (const el of root.querySelectorAll('[data-plumb-source]')) {
    if (el.closest('plumb-overlay')) continue;
    for (const c of classesOf(el).split(/\s+/)) {
      const m = VARIANT.exec(c);
      if (m) out.push({ el, cls: c, variant: m[1], pct: pctOf(m[2]) });
    }
  }
  return out;
}

/** Each disabled opacity to the one, its variant kept. */
export function proposeStates(places, target) {
  const moves = [], kept = [];
  for (const p of places) {
    const to = `${p.variant}:${target.cls}`;
    if (p.cls === to || (target.from !== 'theme' && Math.abs(p.pct - target.pct) < 0.5)) { kept.push(p); continue; }
    moves.push({ el: p.el, from: { cls: p.cls, pct: p.pct }, to: { cls: to, pct: target.pct }, rule: 'state/disabled' });
  }
  return { moves, kept };
}
