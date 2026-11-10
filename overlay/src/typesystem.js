/* ─────────────────────────────────────────────────────────
 * TEXT STYLES · React Plumber overlay (docs/design/system-proposal.md)
 *
 * The project's text styles (server: POST system, a `system/type-roles` proposal) as people meet them in the clean-up's
 * text pass (cleanup.js): each style's plain name ("Body small"), the styles largest first, and the page drawn in them.
 * People see "text styles", named in plain words; the code names (text-body-medium) appear only where code is shown.
 * ───────────────────────────────────────────────────────── */

// a style's name in plain words, from its ladder step and weight (docs/design/token-spec.md §2): "Body", "Title 2 semibold",
// "Caption 1 medium caps"; regular weight is left unsaid
const STEP = { 'large-title': 'Large title', 'display-1': 'Display 1', 'display-2': 'Display 2', 'display-3': 'Display 3', 'display-4': 'Display 4', 'title-1': 'Title 1', 'title-2': 'Title 2', 'title-3': 'Title 3', headline: 'Headline', body: 'Body', 'body-2': 'Body 2', 'caption-1': 'Caption 1', 'caption-2': 'Caption 2' };
const WEIGHT = /-(regular|medium|semibold|bold)(-caps)?$/;
// a project's older Material-style names (display/headline/title/body/label × large/medium/small): the largest of a group
// is the group's own name, the next ones "small"
const GROUP = { display: 'Display', headline: 'Headline', title: 'Title', body: 'Body', label: 'Label' };
export function namesOf(roles) {
  const names = new Map(), older = new Map();
  for (const r of roles) {
    const m = WEIGHT.exec(r.name), step = r.step ?? (m ? r.name.slice(0, m.index) : r.name);
    if (!STEP[step]) { const g = r.name.split('-')[0]; if (!older.has(g)) older.set(g, []); older.get(g).push(r); continue; }
    const weight = r.weightName ?? m?.[1], caps = r.caps ?? !!m?.[2];
    names.set(r.name, [STEP[step], weight && weight !== 'regular' ? weight : '', caps ? 'caps' : ''].filter(Boolean).join(' '));
  }
  for (const [g, list] of older) list.sort((a, b) => px(b.bundle) - px(a.bundle)).forEach((r, i) => names.set(r.name, `${GROUP[g] ?? g}${i ? ' small' : ''}${i > 1 ? 'er' : ''}`));
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
  #had = new Map(); // el → [[prop, value, priority]]
  get on() { return this.#had.size > 0; }
  #prose = null; // reading text's shared leading (proposal.prose)
  show(proposal, glide) {
    this.#prose = proposal.prose?.lineHeight ?? null;
    for (const role of proposal.roles) this.setRole(role, glide);
  }
  // one style's places take it (the show sets the roles one at a time); `move(el, set)` animates it, or null for at once
  setRole(role, move, prose = this.#prose) {
    const b = role.bundle;
    for (const m of role.members ?? []) {
      if (!m.stamp) continue;
      const lh = m.variant === 'compact' ? role.variants?.compact?.lineHeight : m.variant === 'prose' ? prose ?? b.lineHeight : b.lineHeight;
      const sets = { 'font-size': b.sizeText ?? `${b.size}px`, 'letter-spacing': `${b.letterSpacing ?? 0}em`, 'font-weight': String(b.weight ?? 400), 'text-transform': b.transform ?? 'none', ...(Number(lh) > 0 ? { 'line-height': String(lh) } : {}) };
      for (const el of document.querySelectorAll(`[data-plumb-source="${CSS.escape(m.stamp)}"]`)) {
        if (this.#had.has(el)) continue;
        this.#had.set(el, Object.keys(sets).map((p) => [p, el.style.getPropertyValue(p), el.style.getPropertyPriority(p)]));
        const set = () => { for (const [p, v] of Object.entries(sets)) el.style.setProperty(p, v, 'important'); };
        if (move && inView(el)) move(el, set); else set();
      }
    }
  }
  clear(glide) {
    for (const [el, had] of this.#had) {
      const put = () => { for (const [p, v, pr] of had) { if (v) el.style.setProperty(p, v, pr); else el.style.removeProperty(p); } if (!el.getAttribute('style')?.trim()) el.removeAttribute('style'); };
      if (el.isConnected && inView(el)) glide(el, put); else put();
    }
    this.#had.clear();
  }
}
