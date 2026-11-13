// Reads the overlay's token file (overlay/src/tokens.css) for the kit's spec pages, so a page's tables are the file:
// a token added, renamed or re-valued there shows here with no edit, and a page can never say something the product
// doesn't do.
//
//   import { readTokens, probe } from './kit-tokens.js';
//   const tokens = readTokens(cssText);            // [{ name, light, dark, note, line }]
//   const value = probe(cssText, 'dark')('--pl-paper');   // the value the browser computes in that scheme

const DECL = /--pl-([a-z0-9-]+):\s*([^;]+);/g;
const NOTE = /\/\*\s*([^*]*?)\s*\*\//;

function block(css, open) {
  const at = css.indexOf(open);
  if (at < 0) return '';
  let depth = 0, i = css.indexOf('{', at);
  const start = i + 1;
  for (; i < css.length; i++) { if (css[i] === '{') depth++; else if (css[i] === '}' && --depth === 0) break; }
  return css.slice(start, i);
}
function declarations(body) {
  const out = new Map();
  for (const line of body.split('\n')) {
    const note = line.match(NOTE)?.[1] ?? '';
    const found = [...line.matchAll(DECL)];
    // a comment at the end of a line belongs to the line's first token (a hue's line, its soft and its ink share one)
    found.forEach((m, k) => out.set(m[1], { value: m[2].trim(), note: k === 0 ? note : '' }));
  }
  return out;
}
/** Every --pl- token: its light value, its dark value (the same when the dark scheme doesn't change it), its note. */
export function readTokens(css) {
  // the palette (:host) and the roles and states, which sit in a rule of their own (:host, .pl-scheme)
  const light = new Map([...declarations(block(css, ':host, .pl-light {')), ...declarations(block(css, ':host, .pl-scheme, .pl-light, .pl-dark {'))]);
  const dark = declarations(block(css, ':host([data-scheme="dark"])'));
  return [...light].map(([name, { value, note }]) => ({ name, light: value, dark: dark.get(name)?.value ?? null, note }));
}
/** A function giving a token's computed value in one scheme, from a hidden element that carries the token file. */
export function probe(css, scheme) {
  const host = document.createElement('div');
  host.dataset.scheme = scheme;
  host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  host.attachShadow({ mode: 'open' }).innerHTML = `<style>${css}</style>`;
  document.body.append(host);
  const cs = getComputedStyle(host);
  return (name) => cs.getPropertyValue(name).trim();
}
/** A value as a person would say it: `var(--pl-pink)` is "pink", a hex stays a hex. */
export const say = (value) => value.replace(/var\(--pl-([a-z0-9-]+)\)/g, '$1');
