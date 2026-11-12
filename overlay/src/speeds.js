/* ─────────────────────────────────────────────────────────
 * SPEEDS · React Plumber overlay (docs/briefs/pass-motion.md; read and propose)
 *
 * A duration is one of the theme's named speeds. Two durations within a fifth of each other are the same speed to
 * anyone watching (the Weber fraction for time intervals, about 5–20%: Grondin 2001), so a hand-written duration that
 * near a named speed is folded into it; one further away is a speed of its own and is left as it is.
 *
 *  theme    themeSpeeds() → [{ name, ms }]: the named duration utilities the stylesheet defines (.duration-fast), a
 *           name with no digits. Also `twins`: variables whose names repeat a speed's at another value (the theme
 *           disagreeing with itself), said once
 *  read     readMotion() → [{ el, cls, ms, kind }]: every stamped element whose own class sets a duration by hand
 *           (duration-150, duration-[420ms]), with its computed duration and what it is (roles.js)
 *  propose  proposeMotion(places, speeds) → { moves, kept }: the nearest named speed within a fifth; equally near two,
 *           the faster for a control, the slower for something over the page
 *
 * Nothing here writes. No number of its own but the fifth, and that is the source's.
 * ───────────────────────────────────────────────────────── */
import { classesOf } from './craft-read.js';
import { controlKind, roleOf } from './roles.js';
import { sourceTexts } from './theme-source.js';

const SAME = 0.2; // two durations within a fifth read as one speed (Grondin 2001: Weber fraction 5–20%)
const msOf = (v) => { const m = /^\s*([\d.]+)(ms|s)\s*$/.exec(v ?? ''); return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : null; };

// every style rule on the page, through layers, media and supports blocks
function* rules(list) {
  for (const r of list ?? []) {
    if (r.cssRules && !r.selectorText) yield* rules(r.cssRules);
    else if (r.selectorText) yield r;
  }
}

// The theme's speeds as written in its source, used or not (theme-source.js): a speed nothing uses yet is there alone
let SOURCE = new Map();
export async function loadSpeeds() {
  const found = new Map();
  for (const { text } of await sourceTexts()) for (const m of text.matchAll(/@utility\s+duration-([a-z][a-z-]*)\s*\{[^}]*?transition-duration\s*:\s*([\d.]+(?:ms|s))/g)) if (!found.has(m[1])) found.set(m[1], msOf(m[2]));
  SOURCE = found;
  return themeSpeeds();
}

/** The theme's named speeds, slowest last, and any variable that names one of them at another value. */
export function themeSpeeds() {
  const speeds = new Map(SOURCE), vars = new Map();
  for (const sheet of document.styleSheets) {
    let list; try { list = sheet.cssRules; } catch { continue; } // a stylesheet from another origin
    for (const r of rules(list)) {
      const m = /^\.duration-([a-z][a-z-]*)$/.exec(r.selectorText);
      const ms = msOf(r.style?.getPropertyValue('transition-duration'));
      if (m && ms !== null && !speeds.has(m[1])) speeds.set(m[1], ms);
      if (r.selectorText === ':root' || /(^|,)\s*:root\b/.test(r.selectorText)) {
        for (let i = 0; i < r.style.length; i++) {
          const name = r.style[i], v = msOf(r.style.getPropertyValue(name));
          const n = /^--(?:dur|duration|speed)-([a-z][a-z-]*)$/.exec(name);
          if (n && v !== null) vars.set(n[1], { name, ms: v });
        }
      }
    }
  }
  // two names at one value are one speed: the first the stylesheet defines is its name (slower and spring, both 560ms)
  const list = [...speeds].filter(([, ms], i, all) => all.findIndex(([, v]) => Math.abs(v - ms) <= 0.5) === i).map(([name, ms]) => ({ name, ms })).sort((a, b) => a.ms - b.ms);
  const twins = list.filter((s) => vars.has(s.name) && Math.abs(vars.get(s.name).ms - s.ms) > 0.5).map((s) => ({ name: s.name, ms: s.ms, variable: vars.get(s.name) }));
  return Object.assign(list, { twins });
}

/** Every stamped element whose own class sets a duration by hand, with what it is. */
export function readMotion(root = document.body, { exclude = [] } = {}) {
  const out = [];
  const cut = exclude.length ? exclude.join(', ') : null;
  for (const el of root.querySelectorAll('[data-plumb-source]')) {
    if (el.closest('plumb-overlay') || (cut && el.closest(cut))) continue;
    // no variant (hover:, md:), no negative, no variable the app computes; duration-0 is "no motion", a decision
    const cls = classesOf(el).split(/\s+/).find((c) => /^duration-(?:\d+|\[\d+(?:\.\d+)?(?:ms|s)\])$/.test(c));
    if (!cls || cls === 'duration-0') continue;
    const s = getComputedStyle(el), ms = msOf(s.transitionDuration.split(',')[0]);
    if (!ms) continue;
    const kind = controlKind(el, s) ? 'control' : roleOf(el, s).over ? 'over' : null;
    out.push({ el, cls, ms, kind });
  }
  return out;
}

/** Each hand-written duration to the named speed it is, or left as its own. */
export function proposeMotion(places, speeds = themeSpeeds()) {
  const moves = [], kept = [];
  if (!speeds.length) return { moves, kept: places.map((p) => ({ ...p, why: 'your theme names no speeds' })) };
  for (const p of places) {
    const near = speeds.filter((s) => Math.abs(s.ms - p.ms) <= p.ms * SAME + 0.5).sort((a, b) => Math.abs(a.ms - p.ms) - Math.abs(b.ms - p.ms));
    if (!near.length) { kept.push({ ...p, why: 'its own speed' }); continue; }
    let to = near[0];
    const tie = near.filter((s) => Math.abs(Math.abs(s.ms - p.ms) - Math.abs(to.ms - p.ms)) <= 0.5);
    if (tie.length > 1) to = p.kind === 'over' ? tie.at(-1) : tie[0]; // a control answers fast; what floats travels further
    moves.push({ el: p.el, kind: p.kind, from: { ms: p.ms, cls: p.cls }, to: { ms: to.ms, name: to.name, cls: `duration-${to.name}` }, rule: 'motion/speed' });
  }
  return { moves, kept };
}
