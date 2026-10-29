// One value, read one way everywhere: the fix panel, the Alt reading, the page's pills and the preview all take a length
// from here. A length is px at the root the project's CSS sets: the browser's own default font size (a person's setting)
// moves the live page, never the system's numbers. A token written `1.125rem` is 18px in a system drawn at 16px, on any
// machine. What the page renders (live px) is converted to the same root, so yours and the steps are measured alike.

// The root the CSS sets: an `html` / `:root` font-size in the page's own stylesheets, as px (a % or rem/em of the
// browser's default is taken of 16px, the default the system was drawn against). None set: 16.
let cssRoot = null, sheets = -1;
export function rootPx() {
  if (cssRoot !== null && sheets === document.styleSheets.length) return cssRoot;
  sheets = document.styleSheets.length;
  let found = null;
  const walk = (rules) => {
    for (const r of rules) {
      if (r.cssRules && !r.selectorText) { try { walk(r.cssRules); } catch {} continue; }
      if (!r.selectorText || !r.style?.fontSize) continue;
      let hit = false;
      try { hit = document.documentElement.matches(r.selectorText); } catch {}
      if (hit) found = r.style.fontSize; // later rules win, as in the cascade (specificity aside: roots are set plainly)
    }
  };
  for (const s of document.styleSheets) { try { walk(s.cssRules); } catch {} }
  const m = String(found ?? '').trim().match(/^(-?[\d.]+)(px|%|rem|em)$/);
  cssRoot = !m ? 16 : m[2] === 'px' ? parseFloat(m[1]) : m[2] === '%' ? parseFloat(m[1]) * 0.16 : parseFloat(m[1]) * 16;
  return cssRoot;
}
// the live root this browser renders at, and the factor from live px to the CSS's px
const liveRoot = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
export const fromLive = (px) => (Number.isFinite(px) ? px * (rootPx() / liveRoot()) : px);

export const UNITLESS = new Set(['font-weight', 'line-height', 'z-index', 'opacity', 'flex', 'flex-grow', 'flex-shrink', 'order', 'zoom', 'tab-size', 'column-count', 'animation-iteration-count']);

// px of a written length at the CSS's root: `18px`, `1.125rem`, `0.5em` (of the element's own size), a bare number
// (px, unless the property takes none). Anything else (a clamp(), a var(), a keyword): undefined.
export function pxOf(value, el, prop) {
  const m = String(value ?? '').trim().match(/^(-?[\d.]+)(px|rem|em)?$/);
  if (!m || (!m[2] && UNITLESS.has(prop))) return undefined;
  const n = parseFloat(m[1]);
  if (m[2] === 'rem') return n * rootPx();
  if (m[2] === 'em') return n * fromLive(parseFloat(getComputedStyle(el ?? document.documentElement).fontSize));
  return n;
}

// A length as a person reads it: whole px when it is whole to the eye (a scale drawn in whole px stays whole), else
// to the hundredth.
export const fmtPx = (n) => `${Math.abs(n - Math.round(n)) < 0.02 ? Math.round(n) : Math.round(n * 100) / 100}px`;
