import { Claims, LEVEL } from './claims.js';
/* ─────────────────────────────────────────────────────────
 * TEXT STYLES · React Plumber overlay (docs/design/system-proposal.md)
 *
 * The project's text styles (server: POST system, a `system/type-roles` proposal) as people meet them in the clean-up's
 * text pass (cleanup.js): each style's plain name ("Body small"), the styles largest first, and the page drawn in them.
 * People see "text styles", named in plain words; the code names (type-body-large) appear only where code is shown.
 * ───────────────────────────────────────────────────────── */

// a style's name in plain words, from its role (display/headline/title/body/label × large/medium/small): the largest
// of its group present is the group's own name, the next ones "small"
const GROUP = { display: 'Display', headline: 'Headline', title: 'Title', body: 'Body', label: 'Label' };
export function namesOf(roles) {
  const names = new Map(), byGroup = new Map();
  for (const r of roles) { const g = r.name.split('-')[0]; if (!byGroup.has(g)) byGroup.set(g, []); byGroup.get(g).push(r); }
  for (const [g, list] of byGroup) list.sort((a, b) => px(b.bundle) - px(a.bundle)).forEach((r, i) => names.set(r.name, `${GROUP[g] ?? g}${i ? ' small' : ''}${i > 1 ? 'er' : ''}`));
  return names;
}
// the size in px: a number, or a fluid clamp(min, preferred, max) read at its largest
function px(bundle) {
  if (Number.isFinite(bundle?.size)) return bundle.size;
  const m = /clamp\(\s*([\d.]+)(rem|px)[^,]*,[^,]*,\s*([\d.]+)(rem|px)/.exec(bundle?.sizeText ?? '');
  return m ? Number(m[3]) * (m[4] === 'rem' ? 16 : 1) : 16;
}
export const rolesInOrder = (p) => [...p.roles].sort((a, b) => px(b.bundle) - px(a.bundle));

// ── on the page: where a style lives, and the page as it would be ──────────

const inView = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };

// The page as it would be: every place of every style takes its style's values, as inline styles the overlay owns;
// put back exactly as they were. What is in view glides there (inplace.js); the rest changes at once.
export class StylePreview {
  #claims = new Claims(LEVEL.cleanup); // the page's own values are kept by claims.js, not here
  get on() { return this.#claims.size > 0; }
  show(proposal, glide) {
    for (const role of proposal.roles) this.setRole(role, glide);
  }
  // one style's places take it (the show sets the roles one at a time); `move(el, set)` animates it, or null for at once
  setRole(role, move) {
    const b = role.bundle;
    for (const m of role.members ?? []) {
      if (!m.stamp) continue;
      const lh = m.variant === 'compact' ? role.variants?.compact?.lineHeight : b.lineHeight;
      const sets = { 'font-size': b.sizeText ?? `${b.size}px`, 'letter-spacing': `${b.letterSpacing ?? 0}em`, 'font-weight': String(b.weight ?? 400), 'text-transform': b.transform ?? 'none', ...(Number(lh) > 0 ? { 'line-height': String(lh) } : {}) };
      for (const el of document.querySelectorAll(`[data-plumb-source="${CSS.escape(m.stamp)}"]`)) {
        if (this.#claims.has(el)) continue;
        const set = () => { for (const [p, v] of Object.entries(sets)) this.#claims.set(el, p, v); };
        if (move && inView(el)) move(el, set); else set();
      }
    }
  }
  clear(glide) {
    for (const el of this.#claims.elements()) {
      const put = () => this.#claims.clear(el);
      if (el.isConnected && inView(el)) glide(el, put); else put();
    }
    this.#claims.clear();
  }
}
