/* ─────────────────────────────────────────────────────────
 * COMPONENTS RULES · React Plumber overlay
 *
 * The components pack's rules (pack-components.js says what the pack is and which guide each rule comes from). The
 * same rule object craft uses: it reads facts and the element, never writes, and says nothing when its evidence is
 * ambiguous. Each rule is the part of one of Chrome's ui-components guides that a drawn page shows to be broken.
 * Every rule begins with the cheapest test of whether the element is its kind (a role, a tag, one attribute).
 * ───────────────────────────────────────────────────────── */
import { say } from './words.js';
import { accessibleName, trimmed, drawn, shown, named, page } from './a11y-rules.js';
import { COMPONENTS } from './pack-components.js';

const found = (rule, el, n, { value = el.localName, confidence = 0.9, advice }) => [{
  ...say(rule.id, n), key: rule.id, text: el.localName, props: [], value, n: 0,
  evidence: n, confidence, guide: COMPONENTS.guides[rule.id.split('/')[1]], suggest: { kind: 'advice', text: advice },
}];
const rule = (short, owns, check) => ({ id: `components/${short}`, family: 'craft', owns: [owns], once: 'ancestor', reads: ['rect', 'style'], check({ el, facts }) { return check.call(this, el, facts) ?? []; } });
const roleOf = (el) => el.getAttribute('role');
const PRESSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"]';

// ── breadcrumbs ─────────────────────────────────────────────
const isTrail = (el) => (el.localName === 'nav' || roleOf(el) === 'navigation') && /breadcrumb/i.test(`${el.getAttribute('aria-label') ?? ''} ${el.className?.baseVal ?? el.className ?? ''}`);
// "Wrap the trail in <nav aria-label="Breadcrumbs"> containing an ordered list (<ol>) … Order conveys hierarchy, so use ol, not ul"
export const breadcrumbList = rule('breadcrumb-list', 'list', function (el, facts) {
  if (!isTrail(el) || el.querySelector('ol') || !shown(el, facts)) return;
  return found(this, el, {}, { value: el.querySelector('ul') ? '<ul>' : 'no list', advice: 'Put the steps in an <ol>, one <li> each.' });
});
// "Mark the current page, the last item, as a link with aria-current="page""
export const breadcrumbCurrent = rule('breadcrumb-current', 'current', function (el, facts) {
  if (!isTrail(el) || el.querySelector('[aria-current]') || el.querySelectorAll('a[href]').length < 2 || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'no aria-current', advice: 'Add aria-current="page" to the last step.' });
});
// "Dividers are decorative. Do not put them in the markup as text. Generate them in CSS"
const DIVIDER = /^[/\\›»>→|·•-]$/;
export const breadcrumbSeparator = rule('breadcrumb-separator', 'divider', function (el, facts) {
  if (!isTrail(el) || !shown(el, facts)) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const mark = n.nodeValue.trim();
    if (DIVIDER.test(mark) && !n.parentElement.closest('[aria-hidden="true"]')) return found(this, el, { mark }, { value: mark, confidence: 0.85, advice: 'Draw it in CSS (li + li::before), or add aria-hidden="true" to it.' });
  }
});

// ── card ────────────────────────────────────────────────────
// "Do not nest other links, buttons, or form controls inside the link"
export const linkNestedControl = rule('link-nested-control', 'nesting', function (el, facts) {
  if (!el.matches('a[href], button') || !el.firstElementChild) return;
  const inner = el.querySelector(PRESSABLE);
  if (!inner || !shown(el, facts) || !drawn(inner, facts)) return;
  const kind = (n) => (n.localName === 'a' ? 'link' : n.localName === 'button' || roleOf(n) === 'button' ? 'button' : 'field');
  return found(this, el, { outer: kind(el), inner: kind(inner) }, { value: `<${inner.localName}> in <${el.localName}>`, advice: el.localName === 'a' ? 'Make the title the link and stretch it over the card with a pseudo-element; keep the other controls beside it.' : 'Move the inner control out, beside the button.' });
});

// ── carousel ────────────────────────────────────────────────
// "Use a named region with aria-roledescription="carousel" … Give each slide … an aria-label that includes its position"
export const carouselName = rule('carousel-name', 'name', function (el, facts) {
  const kind = el.getAttribute('aria-roledescription');
  if (kind !== 'carousel' && kind !== 'slide' || named(el) || !shown(el, facts)) return;
  const slide = kind === 'slide';
  if (slide && el.parentElement?.querySelector('[aria-roledescription="slide"]') !== el) return; // said once, on the first slide
  return found(this, el, { slide }, { value: `aria-roledescription="${kind}"`, advice: slide ? 'Give each slide aria-label="1 of 4" (its place of how many).' : 'Add an aria-label saying what it shows.' });
});

// ── dialog ──────────────────────────────────────────────────
const isDialog = (el) => el.localName === 'dialog' || /^(?:alert)?dialog$/.test(roleOf(el) ?? '');
const isOpen = (el) => (el.localName === 'dialog' ? el.open : true);
const isModal = (el) => { try { return el.matches(':modal'); } catch { return false; } };
// "DO name every dialog with aria-labelledby pointing at its heading, or aria-label when there is no visible title"
export const dialogName = rule('dialog-name', 'name', function (el, facts) {
  if (!isDialog(el) || !isOpen(el) || named(el) || !shown(el, facts)) return;
  const heading = el.querySelector('h1, h2, h3, h4, [role="heading"]');
  return found(this, el, {}, { value: roleOf(el) ?? 'dialog', advice: heading ? 'Give its heading an id and name it in aria-labelledby.' : 'Add an aria-label saying what it asks.' });
});
// "DON'T add role="dialog", aria-modal, a focus trap, inert toggling or an Esc handler" (the native element does them)
export const dialogNative = rule('dialog-native', 'role', function (el, facts) {
  if (el.localName === 'dialog' || !/^(?:alert)?dialog$/.test(roleOf(el) ?? '') || !shown(el, facts)) return;
  return found(this, el, { tag: el.localName }, { value: `<${el.localName} role="${roleOf(el)}">`, confidence: 0.8, advice: 'Use <dialog> and open it with showModal().' });
});
export const dialogAriaExtras = rule('dialog-aria-extras', 'modal', function (el, facts) {
  if (el.localName !== 'dialog' || !el.hasAttribute('aria-modal') || !isModal(el) || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'aria-modal', confidence: 0.85, advice: 'Remove aria-modal: showModal() already makes it modal.' });
});
// "DON'T open it with show() or the open attribute" (a modal): it says it is modal and nothing behind it is inert
export const dialogFakeModal = rule('dialog-fake-modal', 'modal', function (el, facts) {
  if (el.localName !== 'dialog' || !el.open || el.getAttribute('aria-modal') !== 'true' || isModal(el) || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'open, not modal', advice: 'Open it with showModal() (or command="show-modal" on its button).' });
});
// "DO include a visible close button" / "DO use a native <button> with an accessible name for close controls"
export const dialogClose = rule('dialog-close', 'close', function (el, facts) {
  if (!isDialog(el) || !isOpen(el) || !shown(el, facts)) return;
  if ([...el.querySelectorAll('button, a[href], [role="button"], input[type="submit"], input[type="button"]')].some((b) => drawn(b, facts))) return;
  return found(this, el, {}, { value: 'no button', confidence: 0.85, advice: 'Add a Close button (in a <form method="dialog">, or with command="close").' });
});
// "DON'T lock scrolling with overflow: hidden or position: fixed on html or body"
export const dialogScrollLock = rule('dialog-scroll-lock', 'scroll', function (el, facts) {
  if (!isDialog(el) || !isOpen(el) || !(isModal(el) || el.getAttribute('aria-modal') === 'true') || !shown(el, facts)) return;
  const locked = (n) => { const s = facts.style(n); return s.overflowY === 'hidden' || s.position === 'fixed'; };
  const on = locked(document.body) ? 'body' : locked(document.documentElement) ? 'html' : null;
  if (!on) return;
  return found(this, el, { on }, { value: `${on}: overflow hidden`, confidence: 0.8, advice: 'Drop the lock and give the dialog and its backdrop overscroll-behavior: contain.' });
});
// "DON'T set display on dialog unconditionally. It overrides the closed state. Scope it with dialog[open]"
export const dialogDisplay = rule('dialog-display', 'display', function (el, facts) {
  if (el.localName !== 'dialog' || el.open || !drawn(el, facts)) return;
  try { if (el.matches(':popover-open')) return; } catch { /* no popover here */ }
  return found(this, el, {}, { value: `display: ${facts.style(el).display}`, advice: 'Move the display rule to dialog[open].' });
});

// ── menus and navigation ────────────────────────────────────
const ITEM = /^menuitem(?:checkbox|radio)?$/;
// the menu's own shape: items are menu items, and a menu item has a menu (the fallback the menu guide gives)
export const menuStructure = rule('menu-structure', 'role', function (el, facts) {
  const role = roleOf(el);
  if (!role) return;
  if (ITEM.test(role)) return el.closest('[role="menu"], [role="menubar"]') || !shown(el, facts) ? undefined : found(this, el, { loose: true }, { value: `role="${role}"`, advice: 'Put it inside a role="menu", or make it a plain button.' });
  if (role !== 'menu' || !shown(el, facts)) return;
  const stray = [...el.querySelectorAll('button, a[href]')].find((b) => !b.closest('[role^="menuitem"], [role="option"]') && drawn(b, facts));
  if (!stray) return;
  return found(this, el, { loose: false }, { value: `<${stray.localName}> with no role`, confidence: 0.85, advice: 'Give each item role="menuitem" (menuitemcheckbox or menuitemradio where it holds a choice).' });
});
// navbar: "It is navigation, not an application menu: links stay in the Tab order, with no … role="menubar", role="menu", role="menuitem""
export const navAsMenu = rule('nav-as-menu', 'role', function (el, facts) {
  const role = roleOf(el);
  if (role !== 'menu' && role !== 'menubar' || !el.closest('nav, [role="navigation"]') || !shown(el, facts)) return;
  const items = [...el.querySelectorAll('[role^="menuitem"]')];
  if (!items.length || !items.every((i) => i.matches('a[href]') || i.querySelector('a[href]'))) return;
  return found(this, el, { role }, { value: `role="${role}"`, confidence: 0.85, advice: 'Remove the menu roles: a <ul> of links in the <nav> is what it is.' });
});
// menu: "The submenu trigger keeps aria-haspopup="menu" and aria-expanded"
export const popupExpanded = rule('popup-expanded', 'state', function (el, facts) {
  const pop = el.getAttribute('aria-haspopup');
  if (!pop || pop === 'false' || el.hasAttribute('aria-expanded') || !el.matches('button, a, [role="button"], [role="menuitem"]') || !shown(el, facts)) return;
  return found(this, el, {}, { value: `aria-haspopup="${pop}"`, confidence: 0.85, advice: 'Add aria-expanded and keep it true while the popup is open.' });
});
// menu: "A boolean option is a <button> with aria-checked and an explicit role="menuitemcheckbox""
export const checkedMissing = rule('checked-missing', 'state', function (el, facts) {
  const role = roleOf(el);
  if (!role || !/^(?:checkbox|switch|radio|menuitemcheckbox|menuitemradio)$/.test(role) || el.hasAttribute('aria-checked') || el.localName === 'input' || !shown(el, facts)) return;
  return found(this, el, { role: role.replace('menuitem', 'menu ') }, { value: `role="${role}"`, advice: 'Add aria-checked="true" or "false" and keep it in step with what is shown.' });
});
const isNav = (el) => el.localName === 'nav' || roleOf(el) === 'navigation';
// navbar: "Use aria-current="page" to identify the current page"
export const navCurrent = rule('nav-current', 'current', function (el, facts) {
  if (!isNav(el) || isTrail(el) || el.querySelector('[aria-current]') || !shown(el, facts)) return;
  const links = [...el.querySelectorAll('a[href]')].filter((a) => !a.getAttribute('href').startsWith('#'));
  if (links.length < 2) return;
  const here = links.find((a) => a.origin === location.origin && a.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '') && a.search === location.search && trimmed(a.innerText) && drawn(a, facts));
  if (!here) return;
  return found(this, el, { name: accessibleName(here).name.slice(0, 40) }, { value: here.getAttribute('href'), confidence: 0.85, advice: 'Add aria-current="page" to that link, and style the current link from it.' });
});
// navbar: "DO NOT use <details> and <summary>" for nested site navigation
export const navDetails = rule('nav-details', 'role', function (el, facts) {
  if (el.localName !== 'details' || !el.closest('nav, [role="navigation"]') || !el.querySelector('a[href]') || !shown(el, facts)) return;
  return found(this, el, {}, { value: '<details>', confidence: 0.8, advice: 'Use a <button aria-expanded> followed by the list of links.' });
});
export const currentMany = rule('current-many', 'current', function (el, facts) {
  if (!isNav(el) || !shown(el, facts)) return;
  const count = [...el.querySelectorAll('[aria-current="page"]')].filter((a) => drawn(a, facts)).length;
  if (count < 2) return;
  return found(this, el, { count }, { value: `${count} current`, advice: 'Keep aria-current="page" on the one link for this page.' });
});

// ── tabs ────────────────────────────────────────────────────
const tabsOf = (list) => [...list.querySelectorAll('[role="tab"]')].filter((t) => t.closest('[role="tablist"]') === list);
// "Use aria-labelledby or aria-label to give the tablist an accessible name"
export const tablistName = rule('tablist-name', 'name', function (el, facts) {
  if (roleOf(el) !== 'tablist' || named(el) || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'role="tablist"', advice: 'Add an aria-label saying what the tabs switch between.' });
});
// "Use aria-selected to indicate which tab is currently selected" / "aria-selected="true" on the selected tab"
export const tabSelected = rule('tab-selected', 'state', function (el, facts) {
  if (roleOf(el) !== 'tablist' || !shown(el, facts)) return;
  const tabs = tabsOf(el), count = tabs.filter((t) => t.getAttribute('aria-selected') === 'true').length;
  if (tabs.length < 2 || count === 1) return;
  return found(this, el, { count }, { value: `${count} selected`, advice: 'Set aria-selected="true" on the tab whose panel is showing, and "false" on the rest.' });
});
// "Set role=tabpanel on the tab panels and use aria-labelledby or aria-label to give the panel an accessible name"
export const tabpanelName = rule('tabpanel-name', 'name', function (el, facts) {
  if (roleOf(el) !== 'tabpanel' || named(el) || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'role="tabpanel"', advice: 'Add aria-labelledby with its tab’s id.' });
});
// "DO NOT use this or the WAI-ARIA tabs pattern for page navigation"
export const tabsAsNav = rule('tabs-as-nav', 'role', function (el, facts) {
  if (roleOf(el) !== 'tab' || el.localName !== 'a' || !el.hasAttribute('href') || el.getAttribute('href').startsWith('#') || !shown(el, facts)) return;
  if (el.parentElement?.closest('[role="tablist"]')?.querySelector('[role="tab"]') !== el) return; // said once, on the first
  return found(this, el, {}, { value: 'role="tab" on a link', confidence: 0.85, advice: 'Drop the tab roles: put the links in a <nav> and mark this page’s with aria-current="page".' });
});
// "Do not apply any styling that changes the dimensions of the tab (e.g., padding, border, margin, font-size, font-weight)"
const SIZING = [['fontWeight', 'weight'], ['fontSize', 'text size'], ['paddingLeft', 'padding'], ['paddingRight', 'padding'], ['paddingTop', 'padding'], ['paddingBottom', 'padding'], ['borderLeftWidth', 'border'], ['borderRightWidth', 'border'], ['borderBottomWidth', 'border'], ['borderTopWidth', 'border'], ['marginLeft', 'margin'], ['marginRight', 'margin']];
export const tabShift = rule('tab-shift', 'size', function (el, facts) {
  if (roleOf(el) !== 'tab' || el.getAttribute('aria-selected') !== 'true' || !shown(el, facts)) return;
  const list = el.closest('[role="tablist"]'), other = list && tabsOf(list).find((t) => t !== el && t.getAttribute('aria-selected') !== 'true' && drawn(t, facts));
  if (!other) return;
  const a = facts.style(el), b = facts.style(other), differs = SIZING.find(([p]) => a[p] !== b[p]);
  if (!differs) return;
  return found(this, el, { prop: differs[1] }, { value: `${differs[1]}: ${a[differs[0]]} / ${b[differs[0]]}`, confidence: 0.85, advice: `Keep the ${differs[1]} the same on every tab and show selection with colour and an underline drawn on a pseudo-element.` });
});
// "Keep tabs on a single row. DO NOT wrap them onto multiple rows"
export const tabsWrap = rule('tabs-wrap', 'wrap', function (el, facts) {
  if (roleOf(el) !== 'tablist' || el.getAttribute('aria-orientation') === 'vertical' || !shown(el, facts)) return;
  const tabs = tabsOf(el).filter((t) => drawn(t, facts)).map((t) => facts.rect(t));
  // a row of tabs, some of which have dropped below: the first two sit side by side and a later one starts a new row
  if (tabs.length < 3 || Math.abs(tabs[0].top - tabs[1].top) > 4) return;
  const rows = new Set(tabs.map((r) => Math.round(r.top / 8))).size;
  if (rows < 2) return;
  return found(this, el, { rows }, { value: `${rows} rows`, confidence: 0.85, advice: 'Make the row scroll (overflow-x: auto, flex: none on the tabs), or move what does not fit into a "More" menu.' });
});
export const tabStructure = rule('tab-structure', 'role', function (el, facts) {
  if (roleOf(el) !== 'tab' || el.closest('[role="tablist"]') || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'role="tab"', advice: 'Put the tabs inside one element with role="tablist".' });
});
// "MANDATORY: Render the initial state in the HTML: hidden on every panel except the selected one"
export const tabpanelMany = rule('tabpanel-many', 'hidden', function (el, facts) {
  if (roleOf(el) !== 'tabpanel' || !el.parentElement || !shown(el, facts)) return;
  const showing = [...el.parentElement.children].filter((p) => roleOf(p) === 'tabpanel' && drawn(p, facts) && facts.rect(p).height > 1 && !p.hidden);
  if (showing.length < 2 || showing[1] !== el) return; // said once, on the second
  return found(this, el, { count: showing.length }, { value: `${showing.length} panels`, advice: 'Add hidden to every panel but the selected tab’s.' });
});
// "focus entering the group must land on the selected item" (one Tab stop for the set)
export const tabStops = rule('tab-stops', 'tabindex', function (el, facts) {
  if (roleOf(el) !== 'tablist' || el.hasAttribute('focusgroup') || !shown(el, facts)) return;
  const count = tabsOf(el).filter((t) => drawn(t, facts) && !t.matches(':disabled') && (t.hasAttribute('tabindex') ? t.tabIndex >= 0 : t.matches('button, a[href]'))).length;
  if (count < 2) return;
  return found(this, el, { count }, { value: `${count} Tab stops`, confidence: 0.85, advice: 'Set tabindex="0" on the selected tab and "-1" on the others, and move between them with the arrow keys (or focusgroup).' });
});

// ── toolbar, menu bar ───────────────────────────────────────
// "MANDATORY: Put role="toolbar" and an aria-label on the container"
export const toolbarName = rule('toolbar-name', 'name', function (el, facts) {
  if (roleOf(el) !== 'toolbar' || named(el) || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'role="toolbar"', advice: 'Add an aria-label saying what the tools act on.' });
});
// "Put role="menubar" with an aria-label on the container of the top-level triggers"
export const menubarName = rule('menubar-name', 'name', function (el, facts) {
  if (roleOf(el) !== 'menubar' || named(el) || el.closest('nav, [role="navigation"]') || !shown(el, facts)) return;
  return found(this, el, {}, { value: 'role="menubar"', advice: 'Add an aria-label (the app’s name, or "Main menu").' });
});
// "Action buttons (copy, undo, save) run once and have no on/off state, so DO NOT add aria-pressed to them"
const ACTION = /^(?:copy|undo|redo|save|delete|remove|download|print|share|send|refresh|reload|close|clear|add|new|export|import)\b/i;
export const pressedOnAction = rule('pressed-on-action', 'state', function (el, facts) {
  if (!el.hasAttribute('aria-pressed') || !shown(el, facts)) return;
  const name = accessibleName(el).name;
  // a name that carries a state ("Copy, not selected": an icon called Copy that can be picked) is a toggle, rightly
  if (!ACTION.test(name) || /,|\b(?:selected|on|off|enabled|pinned|active)\b/i.test(name) || name.split(' ').length > 3) return;
  return found(this, el, { name: name.slice(0, 30) }, { value: `aria-pressed="${el.getAttribute('aria-pressed')}"`, confidence: 0.8, advice: 'Remove aria-pressed, and say the result in a status line ("Copied").' });
});

// ── progress, spinner ───────────────────────────────────────
const isProgress = (el) => el.localName === 'progress' || el.localName === 'meter' || roleOf(el) === 'progressbar' || roleOf(el) === 'meter';
// "Use <label for="...">, aria-labelledby, or aria-label to associate the progress element with a label"
export const progressName = rule('progress-name', 'name', function (el, facts) {
  if (!isProgress(el) || named(el) || el.labels?.length || !shown(el, facts)) return;
  return found(this, el, { what: el.localName === 'meter' || roleOf(el) === 'meter' ? 'meter' : 'progress bar' }, { value: roleOf(el) ?? el.localName, advice: 'Add a <label for> or an aria-label saying what is progressing.' });
});
// "Do not set tabindex or call .focus() on <progress>, as it is non-interactive"
export const progressTabindex = rule('progress-tabindex', 'tabindex', function (el, facts) {
  if (!isProgress(el) || !el.hasAttribute('tabindex') || el.tabIndex < 0 || !shown(el, facts)) return;
  return found(this, el, {}, { value: `tabindex="${el.getAttribute('tabindex')}"`, advice: 'Remove tabindex. To say it finished, write to a role="status" line.' });
});
// "The <progress> element is the semantic way to represent the completion progress of a task"
export const progressNative = rule('progress-native', 'role', function (el, facts) {
  if (roleOf(el) !== 'progressbar' || el.localName === 'progress' || !shown(el, facts)) return;
  return found(this, el, { tag: el.localName }, { value: `<${el.localName} role="progressbar">`, confidence: 0.8, advice: 'Use <progress value max> (no value while the length is unknown).' });
});
// spinner: an endless animation that stands for "loading" and says so to nobody. The engine judges nothing that is
// mid-animation, so this is said on the spinner's parent: the spinners are found once a pass, by what they call themselves.
const SPINNERS = '[class*="spinner" i], [class*="animate-spin"], [class*="loader" i]';
export const spinnerSilent = rule('spinner-silent', 'status', function (el, facts) {
  const hosts = page(facts, 'components/spinners', () => { const m = new Map(); for (const sp of document.querySelectorAll(SPINNERS)) if (sp.parentElement && !m.has(sp.parentElement)) m.set(sp.parentElement, sp); return m; });
  const sp = hosts.get(el);
  if (!sp || !drawn(sp, facts)) return;
  const s = facts.style(sp), r = facts.rect(sp);
  if (s.animationName === 'none' || s.animationIterationCount !== 'infinite' || r.width > 96 || r.height > 96) return;
  // said already: hidden as decoration beside words, named, or inside something that announces
  if (sp.closest('[aria-hidden="true"], [role="status"], [role="progressbar"], [role="alert"], [aria-live], [aria-busy="true"]') || named(sp) || roleOf(sp)) return;
  const host = sp.closest('button, a[href], [role="button"]') ?? el;
  if (trimmed(host.textContent)) return; // words beside it (visible or visually hidden) say it
  const cls = typeof sp.className === 'string' ? sp.className : sp.className?.baseVal ?? '';
  return found(this, el, {}, { value: cls.split(/\s+/).find((c) => /spin|load/i.test(c)) ?? 'spinner', confidence: 0.8, advice: 'Wrap it in role="status" with visually hidden words ("Loading"), or use an indeterminate <progress aria-label="Loading">.' });
});

// ── disclosure state ────────────────────────────────────────
// navbar/menu: "Use a <button> with aria-expanded and aria-controls as the trigger"
export const expandedOnGeneric = rule('expanded-on-generic', 'state', function (el, facts) {
  if (!el.hasAttribute('aria-expanded') || el.matches('button, summary, a[href], input, select, textarea, [role]') || !shown(el, facts)) return;
  return found(this, el, { tag: el.localName }, { value: `aria-expanded="${el.getAttribute('aria-expanded')}"`, advice: 'Make the thing that is pressed a <button> and put aria-expanded on it.' });
});
// menu: "the toggle listener keeps aria-expanded in sync"
export const expandedOutOfSync = rule('expanded-out-of-sync', 'state', function (el, facts) {
  const says = el.getAttribute('aria-expanded'), ids = trimmed(el.getAttribute('aria-controls'));
  if (says !== 'true' && says !== 'false' || !ids || roleOf(el) === 'tab' || !shown(el, facts)) return;
  const targets = ids.split(' ').map((id) => document.getElementById(id));
  // what is not in the page while closed is closed; judged only where the thing it controls can be looked at
  if (targets.some((t) => !t)) return says === 'true' && targets.every((t) => !t) ? found(this, el, { says }, { value: `aria-controls="${ids}"`, confidence: 0.8, advice: 'Set aria-expanded from the same state that shows the panel.' }) : undefined;
  const showing = targets.some((t) => drawn(t, facts) && facts.rect(t).height > 1 && facts.style(t).visibility !== 'hidden' && !t.closest('[inert]'));
  if (showing === (says === 'true')) return;
  return found(this, el, { says }, { value: `aria-expanded="${says}"`, confidence: 0.8, advice: 'Set aria-expanded from the same state that shows the panel.' });
});

export const COMPONENTS_RULES = [breadcrumbList, breadcrumbCurrent, breadcrumbSeparator, linkNestedControl, carouselName, dialogName, dialogNative, dialogAriaExtras, dialogFakeModal, dialogClose, dialogScrollLock, dialogDisplay,
  menuStructure, navAsMenu, popupExpanded, checkedMissing, navCurrent, navDetails, currentMany, tablistName, tabSelected, tabpanelName, tabsAsNav, tabShift, tabsWrap, tabStructure, tabpanelMany, tabStops,
  toolbarName, menubarName, pressedOnAction, progressName, progressTabindex, progressNative, spinnerSilent, expandedOnGeneric, expandedOutOfSync];
