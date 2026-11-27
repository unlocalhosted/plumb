/* ─────────────────────────────────────────────────────────
 * ACCESSIBILITY RULES · React Plumber overlay
 *
 * The accessibility pack's rules (pack-a11y.js says what the pack is). The same rule object craft uses: it reads
 * facts and the element, never writes, and says nothing when its evidence is ambiguous.
 *
 * Each comes from a bullet of Chrome's Modern Web Guidance (pack-a11y.js says which).
 *
 *  control-name   accessibility §3, WCAG 4.1.2, 3.3.2   a control has a name that is not only a title or a placeholder
 *  … and 23 more, each beside its code below with the section and criterion it comes from
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
    // a <label for> names any labelable element: a library's switch is a <button id> with one
    const labels = trimmed([...(el.labels ?? [])].map(contentName).join(' '));
    if (labels) return { name: labels, from: 'label' };
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


// ── the batch (2026-11-13): one rule per item of the guide that the page itself shows ───────────────────────
// Every rule begins with the cheapest test of whether the element is its kind, so an element that is not costs a
// tag or attribute check. What is hidden from assistive tech, or not drawn, is not judged.

// one finding, in the engine's shape; `n` are the numbers and names the rule's words use
const found = (rule, el, n, { value = el.localName, confidence = 0.9, advice }) => [{
  ...say(rule.id, n), key: rule.id, text: el.localName, props: [], value, n: 0,
  evidence: n, confidence, guide: 'accessibility', suggest: { kind: 'advice', text: advice },
}];
const drawn = (el, facts) => { const r = facts.rect(el); return r.width > 0 && r.height > 0; };
const shown = (el, facts) => drawn(el, facts) && !hiddenFromAT(el);
const INTERACTIVE = 'button, a[href], input:not([type="hidden"]), select, textarea, summary';
const inDialog = (el) => !!el.closest('dialog, [role="dialog"], [role="alertdialog"]');
const named = (el) => trimmed(el.getAttribute('aria-label')) || trimmed((el.getAttribute('aria-labelledby') ?? '').split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' '));
// what a rule works out once for the whole page (every heading in order, every link's name): kept for the pass, on its facts
const PAGE = new WeakMap();
const page = (facts, key, make) => { let m = PAGE.get(facts); if (!m) PAGE.set(facts, (m = new Map())); if (!m.has(key)) m.set(key, make()); return m.get(key); };
const rule = (short, owns, check, extra = {}) => ({ id: `a11y/${short}`, family: 'craft', owns: [owns], once: 'ancestor', reads: ['rect'], ...extra, check({ el, facts }) { return check.call(this, el, facts) ?? []; } });

// §6 Images: "Mandatory - Apply the alt attribute to all <img> elements" (1.1.1)
export const imageAlt = rule('image-alt', 'alt', function (el, facts) {
  if (el.localName !== 'img' || el.hasAttribute('alt') || /^(?:presentation|none)$/.test(el.getAttribute('role') ?? '') || !shown(el, facts)) return;
  if (named(el)) return;
  return found(this, el, {}, { advice: 'Add alt with what the image is for. If it is decoration, alt="".' });
});
// §6 Images: "Don't use clichéd prefixes: Avoid terms like 'Image of…' and 'Picture of…'" (best practice)
export const altCliche = rule('alt-cliche', 'alt', function (el, facts) {
  if (el.localName !== 'img') return;
  const alt = trimmed(el.getAttribute('alt')), m = /^(image|picture|photo|photograph|graphic|icon)\s+of\b/i.exec(alt);
  if (!m || !shown(el, facts)) return;
  return found(this, el, { prefix: m[0] }, { value: alt, confidence: 0.85, advice: `Drop "${m[0]}": a screen reader already says it is an image.` });
});
// §6 Inline SVGs: role="img" and a text description for a non-decorative svg (4.1.2, 1.1.1); aria-hidden for a decorative one
export const svgName = rule('svg-name', 'alt', function (el, facts) {
  if (el.localName !== 'svg' || el.ownerSVGElement || !shown(el, facts)) return;
  const described = !!(el.querySelector(':scope > title')?.textContent?.trim() || named(el));
  if (el.getAttribute('role') === 'img') return described ? undefined : found(this, el, { kind: 'undescribed' }, { advice: 'Give it a <title>, or aria-label, saying what it shows.' });
  // an icon beside words, inside a control: decoration that is still read out as a nameless graphic
  const control = el.closest(INTERACTIVE + ', [role="button"], [role="link"]');
  if (!control || described || !trimmed(control.innerText)) return;
  return found(this, el, { kind: 'decoration' }, { confidence: 0.8, advice: 'Add aria-hidden="true": the words beside it already say it.' });
});
// §5 Tab order: "Mandatory - Don't use positive tabindex values" (2.4.3)
export const tabindexPositive = rule('tabindex-positive', 'tabindex', function (el, facts) {
  if (!el.hasAttribute('tabindex')) return;
  const n = parseInt(el.getAttribute('tabindex'), 10);
  if (!(n > 0) || !shown(el, facts)) return;
  return found(this, el, { n }, { value: `tabindex="${n}"`, advice: el.matches(INTERACTIVE) ? 'Remove tabindex (it takes focus already) and put it where it belongs in the page’s order.' : 'Use tabindex="0" and put it where it belongs in the page’s order.' });
});
// §5 Tab order: "Don't apply tabindex="0" to interactive elements that are already focusable by default" (best practice)
export const tabindexRedundant = rule('tabindex-redundant', 'tabindex', function (el, facts) {
  // a tab, option or menu item with tabindex="0" is one stop of a roving tab order (its siblings are -1): that is the pattern, not a slip
  if (el.getAttribute('tabindex') !== '0' || el.hasAttribute('role') || !el.matches(INTERACTIVE) || !shown(el, facts)) return;
  return found(this, el, { tag: el.localName }, { value: 'tabindex="0"', confidence: 0.85, advice: 'Remove tabindex: it is focusable already.' });
});
// §2 ARIA: "Mandatory - Don't hide interactive elements from screen readers" (aria-hidden on what takes focus, 4.1.2)
export const hiddenFocusable = rule('hidden-focusable', 'hidden', function (el, facts) {
  if (!el.matches(INTERACTIVE + ', [tabindex]') || !drawn(el, facts)) return;
  const t = el.getAttribute('tabindex');
  if (t !== null && parseInt(t, 10) < 0 || el.matches(':disabled') || el.closest('[inert]')) return;
  const hider = el.closest('[aria-hidden="true"]');
  if (!hider) return;
  return found(this, el, { self: hider === el }, { value: 'aria-hidden="true"', advice: hider === el ? 'Remove aria-hidden, or take it out of the tab order too (tabindex="-1" or inert).' : 'Its parent is aria-hidden. Use inert on that parent, so focus cannot land in it either.' });
});
// §2 ARIA: "Mandatory - Don't suppress the roles of interactive elements" (role="presentation"/"none", 4.1.2)
export const rolePresentationControl = rule('role-presentation-control', 'role', function (el, facts) {
  const role = el.getAttribute('role');
  if (role !== 'presentation' && role !== 'none' || !el.matches(INTERACTIVE) || !shown(el, facts)) return;
  return found(this, el, { role, tag: el.localName }, { value: `role="${role}"`, advice: `Remove role="${role}": it takes away what tells people this can be used.` });
});
// §3 Naming: "Don't put aria-label/aria-labelledby on elements that shouldn't be named" (a plain div or span, 1.3.1)
export const labelOnGeneric = rule('label-on-generic', 'name', function (el, facts) {
  if (el.localName !== 'div' && el.localName !== 'span' || el.hasAttribute('role') || !(el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) || !shown(el, facts)) return;
  return found(this, el, { tag: el.localName }, { value: el.hasAttribute('aria-label') ? `aria-label="${trimmed(el.getAttribute('aria-label')).slice(0, 30)}"` : 'aria-labelledby', confidence: 0.85, advice: 'Give it the role it plays (group, region, img), or move the label to the control it is for.' });
});
// §3 Choosing the name: "Do include a control's visible text in its accessible name" (2.5.3 Label in Name)
export const labelInName = rule('label-in-name', 'name', function (el, facts) {
  if (!el.hasAttribute('aria-label') || !el.matches(CONTROL) || !shown(el, facts)) return;
  // a control whose name never comes from its content (a slider, a field, a list): what is drawn on it is its value or
  // its parts, not a label someone reads out to press it
  if (/^(slider|progressbar|meter|scrollbar|spinbutton|textbox|searchbox|combobox|listbox|tree|grid|treegrid|tablist|menu|menubar|radiogroup|toolbar)$/.test(el.getAttribute('role') ?? '')) return;
  const norm = (t) => trimmed(t).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
  const visible = norm(el.innerText ?? ''), label = norm(el.getAttribute('aria-label'));
  // what is shown has to hold a word someone would say: a drawing's numbers, or one mark, is not a label
  if (!visible || !label || !/\p{L}{3}/u.test(visible) || label.includes(visible)) return;
  // said only when the label shares no word with what is shown ("Dismiss" named "Close dialog"). A row of several
  // pieces whose label says them in another order or at more length still answers to the words on screen.
  const words = new Set(label.split(' '));
  if (visible.split(' ').some((w) => w.length > 1 && words.has(w))) return;
  return found(this, el, { visible: trimmed(el.innerText).slice(0, 30), label: trimmed(el.getAttribute('aria-label')).slice(0, 30) }, { value: el.getAttribute('aria-label'), confidence: 0.85, advice: `Start the aria-label with the words shown ("${trimmed(el.innerText).slice(0, 30)}"), so someone speaking them can press it.` });
});
// §3 Choosing the name: "Don't include the role name in the label" (best practice)
export const roleInLabel = rule('role-in-label', 'name', function (el, facts) {
  const label = trimmed(el.getAttribute('aria-label'));
  if (!label) return;
  const word = el.matches('nav, [role="navigation"]') ? /\bnav(?:igation)?\b/i : el.matches('button, [role="button"]') ? /\bbutton\b/i : el.matches('a[href], [role="link"]') ? /\blink\b/i : null;
  const m = word?.exec(label);
  if (!m || !shown(el, facts)) return;
  return found(this, el, { word: m[0], label: label.slice(0, 40) }, { value: label, confidence: 0.85, advice: `Drop "${m[0]}" from the label: the role is already read out after it.` });
});
// §3 Choosing the name: "Don't reuse an accessible name across hyperlinks that point to different href targets"
export const linkNameReused = rule('link-name-reused', 'name', function (el, facts) {
  if (el.localName !== 'a' || !el.hasAttribute('href') || !shown(el, facts)) return;
  const names = page(facts, 'links', () => {
    const map = new Map();
    for (const a of document.querySelectorAll('a[href]')) {
      if (a.closest('plumb-overlay') || hiddenFromAT(a) || !a.getClientRects().length) continue;
      const name = accessibleName(a).name.toLowerCase();
      if (!name) continue;
      let set = map.get(name); if (!set) map.set(name, (set = new Set()));
      set.add(a.href.replace(/[#?].*$/, '').replace(/\/$/, ''));
    }
    return map;
  });
  const name = accessibleName(el).name, targets = names.get(name.toLowerCase());
  if (!name || !targets || targets.size < 2) return;
  return found(this, el, { name: name.slice(0, 30), targets: targets.size }, { value: name, confidence: 0.85, advice: `Say where each goes: "${name.slice(0, 24)}" leads to ${targets.size} different pages here.` });
});
const headings = (facts) => page(facts, 'headings', () => [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"][aria-level]')]
  .filter((h) => !h.closest('plumb-overlay') && !hiddenFromAT(h) && h.getClientRects().length && !inDialog(h))
  .map((h) => ({ el: h, level: h.hasAttribute('aria-level') ? parseInt(h.getAttribute('aria-level'), 10) : Number(h.localName[1]) })));
// §1 Headings: "Avoid 'skipped' heading levels: Avoid jumping directly from (for example) <h1> → <h4>" (best practice)
export const headingSkip = rule('heading-skip', 'structure', function (el, facts) {
  if (!/^h[1-6]$/.test(el.localName) && el.getAttribute('role') !== 'heading') return;
  const list = headings(facts), i = list.findIndex((h) => h.el === el);
  if (i < 1 || list[i].level <= list[i - 1].level + 1) return;
  return found(this, el, { level: list[i].level, after: list[i - 1].level }, { value: `h${list[i].level} after h${list[i - 1].level}`, confidence: 0.85, advice: `Make it an h${list[i - 1].level + 1}, and style it as you like.` });
});
// §1 Headings: "Use one <h1> element per page" (a dialog's own title aside)
export const headingH1Many = rule('heading-h1-many', 'structure', function (el, facts) {
  if (el.localName !== 'h1') return;
  const ones = headings(facts).filter((h) => h.level === 1);
  if (ones.length < 2 || ones[0].el === el || !ones.some((h) => h.el === el)) return;
  return found(this, el, { count: ones.length }, { value: `${ones.length} h1`, confidence: 0.85, advice: 'Keep one h1 for the page; make this an h2.' });
});
// §1 Landmarks: "Use one <main> landmark per page" (1.3.1)
export const mainMany = rule('main-many', 'structure', function (el, facts) {
  if (el.localName !== 'main' && el.getAttribute('role') !== 'main') return;
  const mains = page(facts, 'mains', () => [...document.querySelectorAll('main, [role="main"]')].filter((m) => !m.closest('plumb-overlay') && !hiddenFromAT(m) && m.getClientRects().length));
  if (mains.length < 2 || mains[0] === el || !mains.includes(el)) return;
  return found(this, el, { count: mains.length }, { value: `${mains.length} main`, advice: 'Keep one main; make this a section or a div.' });
});
// §1 Landmarks: "Provide distinguishable accessible names for navigation regions" when a page has several (1.3.1)
export const navUnnamed = rule('nav-unnamed', 'name', function (el, facts) {
  if (el.localName !== 'nav' && el.getAttribute('role') !== 'navigation') return;
  const navs = page(facts, 'navs', () => [...document.querySelectorAll('nav, [role="navigation"]')].filter((m) => !m.closest('plumb-overlay') && !hiddenFromAT(m) && m.getClientRects().length).map((m) => ({ el: m, name: named(m).toLowerCase() })));
  if (navs.length < 2) return;
  const mine = navs.find((x) => x.el === el);
  if (!mine) return;
  const same = mine.name && navs.filter((x) => x.name === mine.name).length > 1;
  if (mine.name && !same) return;
  return found(this, el, { count: navs.length, same: !!same }, { value: mine.name || 'nav', confidence: 0.85, advice: same ? 'Give each navigation its own name.' : 'Add aria-label saying which navigation this is ("Main", "Footer").' });
});
// §4 Iframes: "Do provide a descriptive title for <iframe> elements" (4.1.2)
export const iframeTitle = rule('iframe-title', 'name', function (el, facts) {
  if (el.localName !== 'iframe' || trimmed(el.getAttribute('title')) || named(el) || !shown(el, facts)) return;
  return found(this, el, {}, { advice: 'Add title saying what the frame holds.' });
});
// §4 Iframes: "Don't disable iframe scrolling using scrolling="no"" (people who zoom need to scroll, 1.4.4)
export const iframeScroll = rule('iframe-scroll', 'scroll', function (el, facts) {
  if (el.localName !== 'iframe' || el.getAttribute('scrolling') !== 'no' || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'scrolling="no"', confidence: 0.85, advice: 'Remove scrolling="no".' });
});
// §1 Tables: "Do use the correct table elements" (th for headers); "Mandatory - Don't use tables for layout" (1.3.1)
export const tableHeaders = rule('table-headers', 'structure', function (el, facts) {
  if (el.localName !== 'table' || /^(?:presentation|none)$/.test(el.getAttribute('role') ?? '') || !shown(el, facts)) return;
  if (el.querySelector('th, [role="columnheader"], [role="rowheader"]')) return;
  const rows = el.querySelectorAll('tr');
  if (rows.length < 2 || rows[0].children.length < 2) return;
  return found(this, el, { rows: rows.length }, { value: `${rows.length} rows, no th`, confidence: 0.85, advice: 'Mark the header cells with <th scope="col"> (or scope="row"). If this is only for layout, use grid instead of a table.' });
});
// §1 Headings: "Avoid placing headings inside the <summary> element" (some browsers expose it as a button and drop the heading)
export const headingInSummary = rule('heading-in-summary', 'summary', function (el, facts) {
  if (!/^h[1-6]$/.test(el.localName) || !el.closest('summary') || !shown(el, facts)) return;
  return found(this, el, { tag: el.localName }, { confidence: 0.85, advice: 'Put the <details> under the heading, not the heading in its summary.' });
});
// §2 Native HTML: "Don't add redundant ARIA roles or properties" (best practice; ul role="list" is the guide's own exception)
const IMPLICIT = { nav: 'navigation', main: 'main', button: 'button', form: 'form', img: 'img', article: 'article', aside: 'complementary' };
export const redundantRole = rule('redundant-role', 'role', function (el, facts) {
  const role = el.getAttribute('role');
  const twice = role && (IMPLICIT[el.localName] === role || el.localName === 'a' && el.hasAttribute('href') && role === 'link') ? `role="${role}"` : el.hasAttribute('required') && el.getAttribute('aria-required') === 'true' ? 'aria-required="true"' : null;
  if (!twice || !shown(el, facts)) return;
  return found(this, el, { twice, tag: el.localName }, { value: twice, confidence: 0.85, advice: `Remove ${twice}: <${el.localName}${twice.startsWith('aria') ? ' required' : ''}> already says it.` });
});
// §2 Native HTML: "Don't apply interactive ARIA roles to structural HTML elements" (<li role="button">, 4.1.2)
export const roleOnStructure = rule('role-on-structure', 'role', function (el, facts) {
  const role = el.getAttribute('role');
  if (!role || !/^(?:button|link|checkbox|switch|radio)$/.test(role) || !/^(?:li|td|th|h[1-6]|p|dt|dd|tr|ul|ol)$/.test(el.localName) || !shown(el, facts)) return;
  return found(this, el, { role, tag: el.localName }, { value: `<${el.localName} role="${role}">`, advice: `Put a <${role === 'link' ? 'a' : role === 'button' ? 'button' : 'input'}> inside the <${el.localName}> instead: the role replaces what the <${el.localName}> was.` });
});
// §2 Native HTML: "Prefer HTML elements and attributes to ARIA: Avoid <div role="button"> or <a role="button">" (4.1.2)
export const nativeOverRole = rule('native-over-role', 'role', function (el, facts) {
  const role = el.getAttribute('role');
  if (role !== 'button' && role !== 'link' && role !== 'checkbox' || !/^(?:div|span|a)$/.test(el.localName) || el.localName === 'a' && role === 'link' || !shown(el, facts)) return;
  const native = role === 'button' ? '<button>' : role === 'link' ? '<a href>' : '<input type="checkbox">';
  return found(this, el, { role, tag: el.localName, native }, { value: `<${el.localName} role="${role}">`, confidence: 0.85, advice: `Use ${native}: it brings the keyboard, focus and disabled behaviour this has to rebuild.` });
});
// §7 Input assistance: "Mandatory - Use the autocomplete attribute" on fields that collect personal information (1.3.5)
const PERSONAL = [[/e-?mail/i, 'email'], [/phone|mobile|\btel\b/i, 'tel'], [/first.?name|given.?name|fname/i, 'given-name'], [/last.?name|family.?name|surname|lname/i, 'family-name'], [/full.?name|^name$|your.?name/i, 'name'],
  [/street|address.?(?:line)?.?1|^address$/i, 'street-address'], [/zip|postal|postcode/i, 'postal-code'], [/\bcity\b|town/i, 'address-level2'], [/country/i, 'country-name'], [/organi[sz]ation|company/i, 'organization'], [/user.?name|login/i, 'username']];
export const fieldAutocomplete = rule('field-autocomplete', 'autocomplete', function (el, facts) {
  if (el.localName !== 'input' && el.localName !== 'textarea' && el.localName !== 'select' || el.hasAttribute('autocomplete') || !shown(el, facts)) return;
  const type = (el.getAttribute('type') ?? 'text').toLowerCase();
  if (!/^(?:text|email|tel|password|url|search)$/.test(type) && el.localName === 'input') return;
  if (el.matches(':disabled') || el.readOnly || el.closest('form[autocomplete]')) return;
  const hint = `${el.getAttribute('name') ?? ''} ${el.id} ${accessibleName(el).name}`;
  const token = type === 'email' ? 'email' : type === 'tel' ? 'tel' : type === 'password' ? 'current-password' : PERSONAL.find(([re]) => re.test(hint))?.[1];
  if (!token || type === 'search') return;
  return found(this, el, { token }, { value: token, confidence: 0.8, advice: `Add autocomplete="${token}"${token === 'current-password' ? ' (or "new-password" where one is being chosen)' : ''}, so the browser can fill it in.` });
});

export const A11Y_RULES = [controlName, imageAlt, altCliche, svgName, tabindexPositive, tabindexRedundant, hiddenFocusable, rolePresentationControl, labelOnGeneric, labelInName, roleInLabel, linkNameReused,
  headingSkip, headingH1Many, mainMany, navUnnamed, iframeTitle, iframeScroll, tableHeaders, headingInSummary, redundantRole, roleOnStructure, nativeOverRole, fieldAutocomplete];


// what each rule is about (kinds.js): where the engine asks it. No narrower than the rule's own first test; a rule not
// listed is asked about every element.
const ON = {
  'control-name': 'button,a,input,select,textarea,summary,[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="switch"],[role="tab"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="combobox"],[role="textbox"],[role="searchbox"],[role="slider"],[role="spinbutton"],[role="option"]',
  'image-alt': 'img',
  'alt-cliche': 'img',
  'svg-name': 'svg',
  'tabindex-positive': '[tabindex]',
  'tabindex-redundant': '[tabindex]',
  'hidden-focusable': 'button,a,input,select,textarea,summary,[tabindex]',
  'role-presentation-control': '[role="presentation"],[role="none"]',
  'label-on-generic': '[aria-label],[aria-labelledby]',
  'label-in-name': '[aria-label]',
  'role-in-label': '[aria-label]',
  'link-name-reused': 'a',
  'heading-skip': 'h1,h2,h3,h4,h5,h6,[role="heading"]',
  'main-many': 'main,[role="main"]',
  'nav-unnamed': 'nav,[role="navigation"]',
  'iframe-title': 'iframe',
  'iframe-scroll': 'iframe',
  'table-headers': 'table',
  'heading-in-summary': 'h1,h2,h3,h4,h5,h6',
  'role-on-structure': '[role]',
  'native-over-role': '[role="button"],[role="link"],[role="checkbox"]',
  'field-autocomplete': 'input,select,textarea',
};
for (const r of A11Y_RULES) { const on = ON[r.id.split('/')[1]]; if (on) r.on = on; }

// what the other packs' page rules share with these (forms-rules.js)
export { trimmed, hiddenFromAT, drawn, shown, named, page };
