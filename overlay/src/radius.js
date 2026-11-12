/* ─────────────────────────────────────────────────────────
 * RADIUS · React Plumber overlay (layer 1: read and propose; no panel yet)
 *
 * A corner's radius says what kind of thing it is. A design system names its radii for jobs, not sizes: Atlassian's
 * tokens are for "supporting elements: labels, lozenges, tags", "interactive elements: buttons, inputs, text areas,
 * selects, navigation items" and "containment elements: cards, in-page containers"
 * (atlassian.design/foundations/radius, read 2026-11-12). So a radius is decided by what the element is, then given
 * the step the project's own theme names for that job (docs/PRINCIPLES.md: the role, where it sits, then the token).
 * A card wearing the control's radius is on a token by value and on the wrong one by job.
 *
 *  theme    themeRadii() → [{ name, short, px, role }]: the project's own --radius-* steps (the server's decisions), each
 *           with the job its name says (tag | control | card), or null when the name says a size (sm, md, lg)
 *  read     readRadii() → [{ el, px, cls, role, why? }]: every stamped element that shows one even corner radius, the
 *           class that sets it, and what the element is:
 *             control  something you press or type in (a button, a field, a link drawn as one), or the box round
 *                      controls and nothing else (a search field's wrapper, a segmented switch)
 *             tag      a small supporting label: a phrase-level element (a span), painted, holding only its own words
 *             card     a painted box that holds other things with words in them
 *             null     it does not say (a tile holding an icon, a bare shape): left alone
 *           Not read: a pill or a circle (a radius of half its side or more is its own shape), a corner nothing shows,
 *           a child sitting in a rounded parent's corner (craft/concentric-radius decides those)
 *  propose  proposeRadii(places, theme) → { moves, kept, refused }: a place whose job the theme names a step for goes
 *           to that step. No job, or no step for the job: left as it is (the drift check still judges its value)
 *
 * Nothing here writes. No number of its own: half the side is what a pill is, and 0.5px is the overlay's "same value".
 * ───────────────────────────────────────────────────────── */
import { utility } from './craft-read.js';

const CONTROL = 'button, input, select, textarea, summary, [role=button], [role=tab], [role=menuitem]';
const INSIDE_CONTROL = `${CONTROL}, a[href], label, kbd`;
const SIDE_RADIUS = /^(?:[trblse]|tl|tr|bl|br|ss|se|es|ee)(?:-|$)/;
// what a token's name says it is for (colours.js reads a colour's role the same way: by name first)
const ROLE_WORDS = [
  ['tag', /(^|-)(tag|chip|badge|pill|label|lozenge)(-|$)/],
  ['control', /(^|-)(control|button|btn|input|field)(-|$)/],
  ['card', /(^|-)(card|surface|panel|box|container|sheet|modal|dialog|popover)(-|$)/],
];
const PHRASE = new Set(['span', 'small', 'strong', 'b', 'em', 'i', 'mark', 'time', 'abbr', 'sup', 'sub']);
const roleOfName = (short) => ROLE_WORDS.find(([, re]) => re.test(short))?.[0] ?? null;

let STEPS = [];
export async function loadRadii(fresh = false) {
  if (STEPS.length && !fresh) return STEPS;
  try {
    const { request } = await import('./api.js'), d = await request('decisions', {});
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    if (Array.isArray(d)) STEPS = d.filter((x) => x.family === 'radius' && /^--radius-[a-z0-9-]+$/i.test(x.name) && x.origin !== 'framework')
      .map((x) => { const m = /^([\d.]+)(px|rem)$/.exec(String(x.resolved ?? x.value).trim()); const short = x.name.slice(9); return m ? { name: x.name, short, px: Number(m[1]) * (m[2] === 'rem' ? root : 1), role: roleOfName(short) } : null; })
      .filter(Boolean).sort((a, b) => a.px - b.px);
  } catch { /* no server: no theme to decide against */ }
  return STEPS;
}
export const themeRadii = () => STEPS;

const px = (v) => parseFloat(v) || 0;
const alpha = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return c && c !== 'transparent' ? 1 : 0; const p = m[1].split(/[\s,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
const paints = (s) => alpha(s.backgroundColor) > 0 || s.backgroundImage !== 'none' || px(s.borderTopWidth) > 0 || s.boxShadow !== 'none';
const ownWords = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.nodeValue ?? ''));

// what the element is, from what it is made of
function roleOf(el, s) {
  if (el.localName === 'kbd') return null; // a key, not a tag: the theme names no step for it
  if (el.matches(CONTROL) || (el.matches('a[href]') && paints(s))) return 'control';
  const worded = [...el.querySelectorAll('*')].filter((n) => !n.closest('svg') && ownWords(n));
  const controls = el.querySelector(`${CONTROL}, a[href]`);
  // the box round controls and nothing else: every word in it belongs to a control
  if (controls && worded.every((n) => n.closest(INSIDE_CONTROL) && el.contains(n.closest(INSIDE_CONTROL))) && !ownWords(el)) return 'control';
  // a tag is a phrase-level element (HTML's own split, which a flex row does not change) holding only its own words
  if (PHRASE.has(el.localName)) return ownWords(el) && !worded.length ? 'tag' : null;
  if (worded.length) return 'card';
  return null;
}

/** Every stamped element that shows one even corner radius, with the class that sets it and what the element is. */
export function readRadii(root = document.body) {
  const places = [];
  for (const el of root.querySelectorAll('[data-plumb-source]')) {
    if (el.closest('plumb-overlay') || el.closest('svg')) continue;
    const s = getComputedStyle(el), r = px(s.borderTopLeftRadius);
    if (!(r > 0) || !paints(s)) continue;
    if (['TopRight', 'BottomLeft', 'BottomRight'].some((c) => Math.abs(px(s[`border${c}Radius`]) - r) > 0.5)) continue; // one side rounded is its own shape
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height || r >= Math.min(box.width, box.height) / 2 - 0.5) continue; // a pill or a circle
    // in a rounded parent's corner: the two corners answer each other (craft/concentric-radius), not the theme's job steps
    const p = el.parentElement, ps = p && getComputedStyle(p), pr = ps ? px(ps.borderTopLeftRadius) : 0;
    if (pr > 0 && paints(ps)) { const pb = p.getBoundingClientRect(); if (box.left - pb.left <= pr && box.top - pb.top <= pr) continue; }
    places.push({ el, px: r, cls: utility(el, 'rounded', { not: SIDE_RADIUS }), role: roleOf(el, s) });
  }
  return places;
}

/** Each place to the step the theme names for its job. */
export function proposeRadii(places, theme = STEPS) {
  const moves = [], kept = [], refused = [];
  const stepFor = (role) => theme.find((t) => t.role === role) ?? null;
  for (const p of places) {
    const step = p.role ? stepFor(p.role) : null;
    if (!step) { kept.push({ ...p, why: p.role ? `your theme names no radius for a ${p.role}` : 'it does not say what it is' }); continue; }
    if (Math.abs(step.px - p.px) <= 0.5) { kept.push({ ...p, on: step.short }); continue; }
    if (!p.cls) { refused.push({ ...p, why: 'its radius is not set by a class here (a stylesheet or an inline style)' }); continue; }
    moves.push({ el: p.el, role: p.role, from: { px: p.px, cls: p.cls }, to: { px: step.px, token: step.short, cls: `rounded-${step.short}` }, rule: 'radius/role' });
  }
  return { moves, kept, refused };
}
