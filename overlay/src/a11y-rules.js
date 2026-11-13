/* ─────────────────────────────────────────────────────────
 * ACCESSIBILITY RULES · React Plumber overlay
 *
 * The accessibility pack's rules (pack-a11y.js says what the pack is). The same rule object craft uses: it reads
 * facts and the element, never writes, and says nothing when its evidence is ambiguous.
 *
 * Each comes from a bullet of Chrome's Modern Web Guidance (pack-a11y.js says which).
 *
 *  control-name   accessibility §3, WCAG 4.1.2, 3.3.2   a control has a name that is not only a title or a placeholder
 * ───────────────────────────────────────────────────────── */
import { say } from './words.js';

// what can be pressed, followed or typed into, by tag or by role
const CONTROL = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="combobox"], [role="textbox"], [role="searchbox"], [role="slider"], [role="spinbutton"], [role="option"]';
const SAYS = { a: 'link', button: 'button', input: 'field', select: 'menu', textarea: 'field', summary: 'toggle' };
const ROLE_SAYS = { link: 'link', textbox: 'field', searchbox: 'field', combobox: 'menu', checkbox: 'checkbox', radio: 'option', switch: 'switch', tab: 'tab', slider: 'slider', spinbutton: 'field' };

const trimmed = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// Out of the accessibility tree: aria-hidden or inert on it or above it, or not drawn at all.
function hiddenFromAT(el) {
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
    if (n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('inert')) return true;
  }
  return false;
}

// The words a subtree contributes to its parent's name: its text, an image's alt, an svg's title or label, a nested
// element's aria-label; nothing from what is hidden from assistive tech. Visually hidden text (an sr-only span) counts:
// that is what it is for.
function contentName(root) {
  let out = '';
  const walk = (n) => {
    if (n.nodeType === 3) { out += n.nodeValue; return; }
    if (n.nodeType !== 1) return;
    if (n.getAttribute('aria-hidden') === 'true' || n.hidden || n.localName === 'script' || n.localName === 'style') return;
    const label = n.getAttribute('aria-label');
    if (n !== root && label?.trim()) { out += ` ${label} `; return; }
    if (n.localName === 'img' || n.getAttribute('role') === 'img') { out += ` ${n.getAttribute('alt') ?? n.getAttribute('aria-label') ?? ''} `; return; }
    if (n.localName === 'svg') { out += ` ${n.querySelector(':scope > title')?.textContent ?? ''} `; return; }
    for (const c of n.childNodes) walk(c);
  };
  walk(root);
  return trimmed(out);
}

// The accessible name, as far as plumber needs it: whether there is one, and where it came from. The order follows
// the accessible name computation (aria-labelledby, aria-label, the host language's label, content, title).
export function accessibleName(el) {
  const ids = trimmed(el.getAttribute('aria-labelledby'));
  if (ids) {
    const said = trimmed(ids.split(' ').map((id) => { const t = document.getElementById(id); return t ? contentName(t) || trimmed(t.getAttribute('aria-label')) : ''; }).join(' '));
    if (said) return { name: said, from: 'aria-labelledby' };
  }
  const label = trimmed(el.getAttribute('aria-label'));
  if (label) return { name: label, from: 'aria-label' };
  const tag = el.localName, type = (el.getAttribute('type') ?? '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') {
    const labels = trimmed([...(el.labels ?? [])].map(contentName).join(' '));
    if (labels) return { name: labels, from: 'label' };
    if (tag === 'input' && ['submit', 'reset'].includes(type)) return { name: trimmed(el.value) || type, from: 'value' };
    if (tag === 'input' && type === 'button' && trimmed(el.value)) return { name: trimmed(el.value), from: 'value' };
    if (tag === 'input' && type === 'image') { const alt = trimmed(el.getAttribute('alt')); if (alt) return { name: alt, from: 'alt' }; }
    const placeholder = trimmed(el.getAttribute('placeholder'));
    if (placeholder) return { name: placeholder, from: 'placeholder' };
  } else {
    const content = contentName(el);
    if (content) return { name: content, from: 'content' };
  }
  const title = trimmed(el.getAttribute('title'));
  if (title) return { name: title, from: 'title' };
  return { name: '', from: null };
}

const disabled = (el) => el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true';

// Modern Web Guidance, accessibility §3: "Every interactive element … need[s] an accessible name" (WCAG 4.1.2), and
// "Don't use title" or "placeholder" "as a naming mechanism" (a title shows only on hover; a placeholder goes when
// someone types, WCAG 3.3.2). A control with no name is announced as its role alone ("button").
export const controlName = {
  id: 'a11y/control-name', family: 'craft', owns: ['name'], once: 'ancestor', reads: ['rect'],
  check({ el, facts }) {
    if (!el.matches(CONTROL) || disabled(el)) return [];
    // a checkbox or radio inside its label, or a control nobody can reach, has nothing to say
    const r = facts.rect(el);
    if (!r.width || !r.height || hiddenFromAT(el)) return [];
    const { name, from } = accessibleName(el);
    // a title or a placeholder is a name the browser accepts and the guide does not
    const weak = from === 'title' || from === 'placeholder' ? from : null;
    if (name && !weak) return [];
    const role = el.getAttribute('role');
    const what = (role && ROLE_SAYS[role]) ?? SAYS[el.localName] ?? 'control';
    const icon = !!el.querySelector('svg, img');
    return [{
      ...say(this.id, { what, weak }),
      key: this.id, text: el.localName, props: [], value: weak ? `${weak}: ${name}` : role ?? el.localName, n: 0,
      evidence: { role: role ?? el.localName, icon, named: from }, confidence: weak ? 0.8 : 0.9,
      guide: 'accessibility',
      suggest: { kind: 'advice', text: weak === 'placeholder' ? `Add a <label> for it ("${name}" can stay as the example).` : weak === 'title' ? `Add aria-label="${name}", or words beside it.` : icon ? 'Add aria-label with what it does, or a visually hidden label beside the icon.' : 'Give it visible words, or an aria-label with what it does.' },
    }];
  },
};

export const A11Y_RULES = [controlName];
