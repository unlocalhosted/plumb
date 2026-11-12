/* ─────────────────────────────────────────────────────────
 * ROLES · React Plumber overlay
 *
 * What an element is, read once, for every decision that follows from it (docs/PRINCIPLES.md: "the role, where it
 * sits, then the token"). Before this file seven places each kept their own list of what a control is; on four pages
 * of a real app they disagreed on 137 of 174 elements, 134 of them links (docs/journey.md, 2026-11-12). A design
 * system names its tokens for jobs (Atlassian's radius: "interactive elements: buttons, inputs…", "containment
 * elements: cards…", "supporting elements: labels, lozenges, tags"; atlassian.design/foundations/radius), so the job
 * is decided here, and a pass only says which token the job takes.
 *
 *  roleOf(el, style?) → { role, kind, why, over }   over: it sits over the page (an overlay, or anything fixed in
 *                                                    place: a floating button is a control that is also over)
 *    overlay   it sits over the page: a menu, a dialog, a listbox, a tooltip, a popover, or anything fixed in place
 *              (Atlassian elevation: overlay "is reserved for a UI that sits over another UI")
 *    control   something you press or type in. kind says which:
 *                button   a button, a tab, a menu item, a summary, a link drawn as a button (it paints a box)
 *                field    a text field, a select, a text area
 *                toggle   a checkbox, a radio, a switch, a range: its size is the mark's, not a box of words
 *                group    the painted box round controls and nothing else (a search field's wrapper, a segmented switch)
 *    link      a link that is words. kind says where:
 *                inline   in a sentence: its parent has words of its own beside it. It is as tall as its line and
 *                         takes the sentence's type (WCAG 2.2, 2.5.8 Target Size: "Inline: the target is in a
 *                         sentence or its size is otherwise constrained by the line-height of non-target text")
 *                nav      standing alone: a navigation item, a row in a list of links, a card's title
 *              (a painted link that holds lines of words is a card you can open: role card)
 *    tag       a small supporting label: a phrase-level element, painted, holding only its own words
 *    card      a painted box that holds other things with words in them
 *    null      it does not say (a tile holding an icon, a bare shape, a layout box): left alone
 *
 * Nothing here reads a theme or proposes anything. No number of its own.
 * ───────────────────────────────────────────────────────── */

const OVERLAY = '[role=menu], [role=dialog], [role=alertdialog], [role=listbox], [role=tooltip], [popover], dialog';
const BUTTON = 'button, summary, [role=button], [role=tab], [role=menuitem], input[type=button], input[type=submit], input[type=reset]';
const TOGGLE = 'input[type=checkbox], input[type=radio], input[type=range], [role=checkbox], [role=radio], [role=switch], [role=slider]';
const FIELD = 'input:not([type=hidden]):not([type=file]), select, textarea';
export const CONTROL = `${BUTTON}, ${TOGGLE}, ${FIELD}`;
/** Anything you act on: a control, or a link of any kind (an icon's edge: icons.js). */
export const ACTS = `${CONTROL}, a[href]`;
// what counts as a control's own content when asking "is this box only controls?"
const INSIDE_CONTROL = `${CONTROL}, a[href], label, kbd`;
// HTML's phrasing elements that carry a label's words (a flex row does not change what they are)
const PHRASE = new Set(['span', 'small', 'strong', 'b', 'em', 'i', 'mark', 'time', 'abbr', 'sup', 'sub']);

const px = (v) => parseFloat(v) || 0;
const alpha = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return c && c !== 'transparent' ? 1 : 0; const p = m[1].split(/[\s,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1; };
/** It draws a box of its own: a fill, a border or a shadow. */
export const paints = (s) => alpha(s.backgroundColor) > 0 || s.backgroundImage !== 'none' || px(s.borderTopWidth) > 0 || s.boxShadow !== 'none';
/** It holds words directly, not through a child. */
export const ownWords = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.nodeValue ?? ''));

let over = false;
/** What kind of control it is, without looking inside it: cheap enough to ask of every element. Null when it is not one
 *  by itself (a box round controls is decided by roleOf, which looks inside). */
export function controlKind(el, s = getComputedStyle(el)) {
  if (el.matches(TOGGLE)) return 'toggle';
  if (el.matches(BUTTON)) return 'button';
  if (el.matches(FIELD)) return 'field';
  // a link drawn as a button, or one of a bar of them; a link that holds lines of words is a card you can open, not a button
  if (el.matches('a[href]') && (paints(s) || barOf(el)) && oneLine(el)) return 'button';
  return null;
}

// a button's words are one label on one line (a wrapped label is still one: its words are one run). A heading, a
// paragraph or a picture inside, or words in pieces on more than one line, make it a card
function oneLine(el) {
  if (el.querySelector('h1, h2, h3, h4, h5, h6, p, img, picture, video, ul, ol')) return false;
  // the middles of each piece's first line: on one line when they are within half a line of each other
  const mids = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!/\S/.test(n.nodeValue)) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const q = range.getClientRects()[0];
    if (q && q.width > 1) mids.push([q.top + q.height / 2, q.height]);
  }
  if (mids.length < 2) return true;
  const lo = Math.min(...mids.map((m) => m[0])), hi = Math.max(...mids.map((m) => m[0]));
  return hi - lo < Math.min(...mids.map((m) => m[1])) / 2;
}

// a bar of links where one is painted: a tab bar or a segmented switch, which paints only the one you are on. The
// others are the same control at rest, not words (WAI-ARIA APG, Tabs: one tab is active, the rest are the same kind)
const BARS = new WeakMap();
function barOf(el) {
  const p = el.parentElement;
  if (!p) return false;
  let v = BARS.get(p);
  if (v === undefined) {
    const links = [...p.children].filter((c) => c.matches('a[href]'));
    v = links.length > 1 && links.some((c) => paints(getComputedStyle(c)) && oneLine(c));
    BARS.set(p, v);
  }
  return v;
}

/** The words of this element are a control's label: it sits in a button, a form label, or a link drawn as a button. */
export function inControl(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.matches(`${BUTTON}, label`)) return true;
    if (n.matches('a[href]')) return controlKind(n) === 'button';
  }
  return false;
}

const is = (role, kind, why) => ({ role, kind, why, over: over || role === 'overlay' });
const NONE = is(null, null, 'it does not say what it is');

/** What the element is, from what it is made of and where it sits. */
export function roleOf(el, s = getComputedStyle(el)) {
  over = s.position === 'fixed';
  if (el.localName === 'kbd') return is(null, null, 'a key: no job a theme names');
  if (el.matches(OVERLAY)) return is('overlay', null, 'it is a menu, a dialog or a popover');
  const kind = controlKind(el, s);
  if (kind) return is('control', kind, kind === 'toggle' ? 'a mark you switch' : kind === 'field' ? 'something you type in or choose from' : el.matches('a[href]') ? 'a link drawn as a button' : 'something you press');
  if (el.matches('a[href]') && !paints(s)) {
    // in a sentence: the parent has words of its own beside the link
    if (el.parentElement && ownWords(el.parentElement)) return is('link', 'inline', 'a link in a sentence');
    return is('link', 'nav', 'a link standing alone');
  }
  const worded = [...el.querySelectorAll('*')].filter((n) => !n.closest('svg') && ownWords(n));
  // the box round controls and nothing else: every word in it belongs to a control
  if (paints(s) && el.querySelector(`${CONTROL}, a[href]`) && !ownWords(el) && worded.every((n) => n.closest(INSIDE_CONTROL) && el.contains(n.closest(INSIDE_CONTROL)))) return is('control', 'group', 'the box round controls and nothing else');
  if (!paints(s)) return over ? is('overlay', null, 'it is fixed over the page') : is(null, null, NONE.why);
  if (PHRASE.has(el.localName)) return ownWords(el) && !worded.length ? is('tag', null, 'a small painted label') : is(null, null, NONE.why);
  if (over) return is('overlay', null, 'it is fixed over the page');
  if (worded.length) return is('card', null, 'a painted box that holds other things');
  return is(null, null, NONE.why);
}
