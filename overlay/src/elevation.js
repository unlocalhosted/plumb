/* ─────────────────────────────────────────────────────────
 * ELEVATION · React Plumber overlay (read and propose; elevation-pass.js shows and writes)
 *
 * A shadow says how far a thing sits above the page, and a design system names its shadows for that: Atlassian's
 * raised shadow is for cards, its overlay shadow "is reserved for a UI that sits over another UI": modals, dropdown
 * menus, floating toolbars (atlassian.design/foundations/elevation, read 2026-11-12). So a shadow is decided by what
 * casts it, then given the step the project's theme names for that (docs/PRINCIPLES.md: the role, then the token).
 *
 *  theme    themeShadows() → [{ name, short, css, role }]: the project's own --shadow-* steps (the server's decisions),
 *           each with the job its name says (card | overlay), or null when the name says a size (sm, md, lg)
 *  read     readShadows() → [{ el, cls, css, role }]: every stamped element that casts a shadow, the class that sets it,
 *           and what the element is:
 *             overlay  it sits over the page: a menu, a dialog, a listbox, a tooltip, a popover, or anything fixed
 *             card     a painted box in the page that holds things with words (radius.js roleOf)
 *             null     a control (a pressed or raised button's shadow is its own state), or it does not say
 *  propose  proposeShadows(places, theme) → { moves, kept, refused }: a place whose job the theme names a shadow for,
 *           casting another shadow, goes to that one. A card that casts no shadow is not given one: adding depth is a
 *           design change, not a tidy-up. No job, or no step for the job: left (the drift check still judges its value)
 *
 * Nothing here writes. No number of its own.
 * ───────────────────────────────────────────────────────── */
import { utility } from './craft-read.js';
import { roleOf, roleOfToken } from './roles.js';
import { STAMPED } from './stamp.js';

// a theme's shadows name two jobs: over the page, or a card on it (roles.js)
const roleOfName = (short) => { const r = roleOfToken(short); return r === 'overlay' || r === 'card' ? r : null; };

let STEPS = [];
export async function loadShadows(fresh = false) {
  if (STEPS.length && !fresh) return STEPS;
  try {
    const { request } = await import('./api.js'), d = await request('decisions', {});
    if (Array.isArray(d)) STEPS = d.filter((x) => /^--shadow-[a-z0-9-]+$/i.test(x.name) && x.origin !== 'framework')
      .map((x) => { const short = x.name.slice(9); return { name: x.name, short, css: String(x.resolved ?? x.value), role: roleOfName(short) }; });
  } catch { /* no server: no theme to decide against */ }
  return STEPS;
}
export const themeShadows = () => STEPS;

/** Every stamped element that casts a shadow, with the class that sets it and what the element is. */
export function readShadows(root = document.body) {
  const places = [];
  for (const el of root.querySelectorAll(STAMPED)) {
    if (el.closest('plumb-overlay') || el.closest('svg')) continue;
    const s = getComputedStyle(el);
    if (!s.boxShadow || s.boxShadow === 'none') continue;
    // the class that sets the shadow itself, not its colour or an inset ring (shadow-black/10, shadow-inner)
    const cls = utility(el, 'shadow', { not: /^(?:inner$|none$|\[inset|[a-z]+-\d|black|white|current|transparent)/ });
    const r = roleOf(el, s), role = r.over ? 'overlay' : r.role === 'card' ? 'card' : null;
    places.push({ el, cls, css: s.boxShadow, role });
  }
  return places;
}

/** Each place to the shadow the theme names for its job. */
export function proposeShadows(places, theme = STEPS) {
  const moves = [], kept = [], refused = [];
  for (const p of places) {
    const step = p.role ? theme.find((t) => t.role === p.role) ?? null : null;
    if (!step) { kept.push({ ...p, why: p.role ? `your theme names no shadow for ${p.role === 'card' ? 'a card' : 'something that floats'}` : 'it does not say what it is' }); continue; }
    if (p.cls === `shadow-${step.short}`) { kept.push({ ...p, on: step.short }); continue; }
    if (!p.cls) { refused.push({ ...p, why: 'its shadow is not set by a class here (a stylesheet or an inline style)' }); continue; }
    moves.push({ el: p.el, role: p.role, from: { cls: p.cls, css: p.css }, to: { token: step.short, cls: `shadow-${step.short}`, css: step.css }, rule: 'elevation/role' });
  }
  return { moves, kept, refused };
}
