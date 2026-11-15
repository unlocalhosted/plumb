/* ─────────────────────────────────────────────────────────
 * BREAK IT · React Plumber overlay (toys: longer words, narrower, extreme content, typing, lists, action, bigger text)
 *
 * Break your own screen before a user does (a post the owner shared on 2026-11-15, docs/references.md: "double the
 * length of every label, turn the system text size all the way up, make the main action fail"). A page never shows
 * these states by itself, so plumber puts it into them, on the live page, and marks what broke.
 *
 *  kinds    stress only text that can change. Each run of words is traced to where it is written (locate, then
 *           text-at over the owner chain), and sorted (owner, 2026-11-15: "this is hardcoded text on single use
 *           components … stress testing would work better on something reusable, something user would interact with"):
 *             fixed  written in the component that draws it: copy the author typed once. Never stretched; its
 *                    stress is the space round it (narrow widths, bigger text: later toys)
 *             prop   written at a use site and passed in: a reusable part's label or title. Stretched
 *             list   one line of source drawn several times with different words (a list's items, cards, tabs) whose
 *                    items mostly come from props or data. A list typed into its own component stays fixed
 *             data   not one string in source, or a string kept elsewhere and looked up (a list, a record, what the
 *                    user typed). Stretched
 *  toggle   Longer words: every run of words that is a prop or data grows to about twice its length, in accented letters, the
 *           way a German or Finnish translation does ("Save changes" → "Šàvé çhàñgéš šàvé çhàñgéš"). Placeholders
 *           too. The page stays usable: it is not frozen, and words React draws while it is on grow as they arrive
 *  grow     the words grow over a moment, so you watch the screen give way. Reduced motion: at once
 *  narrower a copy of the page (an iframe of this URL, so the app's own breakpoints fire) squeezed a step a frame from
 *           the window's width down to 320px; each break is caught at the width it starts, and stepping to it puts the
 *           copy at that width with the break ringed. Things of one row or list that break at one width are one note
 *  bigger   the reader's text size at 200%: the root size doubles, as a browser's setting does, so text in rem grows.
 *           Text that stays the same size is set in pixels: one note per class that does it (text-[11px] → its rem
 *           twin), every place it is used ringed. Layout breaks under the bigger text are noted too
 *  breaks   only what broke because of the toy (each check runs before and after; what was already broken is
 *           not this toggle's news):
 *             cut      the words no longer fit a box that hides what overflows. Not when it ends them in an ellipsis
 *                      or clamps their lines: that cut is designed
 *             spill    the words run past the edge of the box drawn around them, or off the screen
 *             overlap  the words now run into other words
 *             sideways the whole page now scrolls sideways
 *  draw     a coral ring round each break; the one in hand is filled with a coral hatch. One note at a time in the bar
 *  off      every word goes back exactly as it was, unless the app has changed it since (then the app's is kept)
 *  extreme  the places that can change (the same sort as Longer words) get, in turn: no words, one letter, 60 letters,
 *           one unbroken word (a link, an ID) and, where there is a number, a nine-digit one. Each break says which
 *           content did it; stepping to it puts that content back on the page. A drawn box (a button, a badge) that
 *           shrinks to a sliver when it is empty is a break of its own
 *  typing   every field gets, in turn, a long line, a pasted link, pasted lines (a textarea) and nothing, entered so
 *           the app reacts. Then: new breaks, a field that grows and moves its row, lines a box hides with no scroll,
 *           words running under an icon drawn inside the field, a list a search empties with nothing saying why.
 *           Each value is taken back
 *  action   you press the button you care about (plumber does not guess which is the main one). Its requests (fetch, XHR)
 *           get a server error, or are held 4 seconds in Slow. Then plumber watches and says what a person meets: no
 *           words saying it failed, a button left disabled or still saying "Creating…", a spinner that never stops;
 *           in Slow, nothing showing it is working, and a button that can be pressed twice
 *  toys     one at a time; the bar opens with none on. Picking one turns the last one off
 *  keys     Alt+S opens and closes. ← → between breaks, Esc closes
 * Nothing here writes to source.
 * ───────────────────────────────────────────────────────── */

import { locate } from './locate.js';
import { request } from './api.js';

const tokensCss = await (await fetch(new URL('./tokens.css', import.meta.url))).text();

const OURS = 'plumb-overlay, [data-plumb-layer]';
const SKIP = 'script, style, noscript, template, textarea, code, pre, svg, [contenteditable=""], [contenteditable="true"]';
const GROW_MS = 420;

// ── the longer words ────────────────────────────────────────

const ACCENT = { a: 'à', e: 'é', i: 'ï', o: 'ö', u: 'ü', c: 'ç', n: 'ñ', s: 'š', y: 'ý', z: 'ž', A: 'Å', E: 'É', I: 'Ï', O: 'Ö', U: 'Ü', C: 'Ç', N: 'Ñ', S: 'Š', Y: 'Ý', Z: 'Ž' };
const accent = (s) => s.replace(/[aeioucnsyzAEIOUCNSYZ]/g, (c) => ACCENT[c]);

/** "Save changes" → the accented words, and the extra words that double its length. */
function longer(core) {
  const base = accent(core), words = base.toLowerCase().split(/\s+/).filter(Boolean);
  let extra = '';
  for (let i = 0; extra.length < base.length; i++) extra += ' ' + words[i % words.length];
  return { base, extra };
}
const LETTER = /\p{L}/u, LETTERS = /\p{L}/gu;

// ── state ───────────────────────────────────────────────────

let kinds = new Map(), sorting = false, tally = null;   // text node → 'fixed' | 'prop' | 'list' | 'data'
let host = null, on = false, frame = 0, growing = 0, notes = [], index = 0, before = null, observer = null;
const held = new Map();   // text node or input → { orig, base, extra, now }

function eligible(node) {
  const el = node.parentElement;
  // fewer than three letters is a glyph drawn as art (a hero split letter by letter), a unit or an initial, not a label
  return el && (node.data.match(LETTERS) ?? []).length >= 3 && !el.closest(SKIP) && !el.closest(OURS);
}

function take(node, f) {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(node.data);
  const { base, extra } = longer(m[2]);
  const rec = { orig: node.data, base, extra, lead: m[1], tail: m[3], now: '' };
  held.set(node, rec);
  put(node, rec, f);
}
function put(node, rec, f) {
  const text = rec.lead + rec.base + rec.extra.slice(0, Math.round(rec.extra.length * f)) + rec.tail;
  rec.now = text;
  if (node.nodeType === 3) node.data = text; else node.placeholder = text.trim();
}
function takeField(el, f) {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(el.placeholder);
  const { base, extra } = longer(m[2]);
  const rec = { orig: el.placeholder, base, extra, lead: '', tail: '', now: '' };
  held.set(el, rec);
  put(el, rec, f);
}

const current = (node) => (node.nodeType === 3 ? node.data : node.placeholder);

function stretchUnder(root, f) {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (!held.has(n) && eligible(n) && kinds.has(n) && stressed(n)) take(n, f);
  const fields = root.querySelectorAll ? root.querySelectorAll('input[placeholder], textarea[placeholder]') : [];
  for (const el of fields) if (stressed(el) && !held.has(el) && el.placeholder && LETTER.test(el.placeholder) && !el.closest(OURS)) takeField(el, f);
}

/** Write without hearing our own writes. */
function quietly(fn) { observer?.disconnect(); fn(); observer?.observe(document.body, WATCH); }
const WATCH = { childList: true, subtree: true, characterData: true };

function heard(records) {
  if (!on) return;
  quietly(() => {
    for (const r of records) {
      if (r.type === 'characterData') {
        const rec = held.get(r.target);
        if (rec && r.target.data === rec.now) continue;
        held.delete(r.target);
        if (eligible(r.target) && stressed(r.target)) take(r.target, 1);
      } else for (const n of r.addedNodes) {
        if (n.nodeType === 3) { if (!held.has(n) && eligible(n)) { kinds.set(n, 'data'); take(n, 1); } } else if (n.nodeType === 1 && !n.closest?.(OURS)) { const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); for (let t = w.nextNode(); t; t = w.nextNode()) if (!kinds.has(t)) kinds.set(t, 'data'); stretchUnder(n, 1); }
      }
    }
  });
  later();
}

async function grow() {
  if (!tally) { sorting = true; paint(); await sortAll(); sorting = false; if (!on) return; }
  before = measure();
  observer = new MutationObserver(heard);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  quietly(() => stretchUnder(document.body, still ? 1 : 0));
  if (still) { later(); return; }
  const t0 = performance.now();
  const step = (t) => {
    const f = Math.min(1, (t - t0) / GROW_MS), e = 1 - (1 - f) ** 3;
    quietly(() => { for (const [node, rec] of held) if (node.isConnected && current(node) === (node.nodeType === 3 ? rec.now : rec.now.trim())) put(node, rec, e); });
    growing = f < 1 ? requestAnimationFrame(step) : 0;
    if (!growing) later();
  };
  growing = requestAnimationFrame(step);
}

function shrink() {
  cancelAnimationFrame(growing); growing = 0;
  observer?.disconnect(); observer = null;
  for (const [node, rec] of held) {
    if (node.nodeType === 3) { if (node.data === rec.now) node.data = rec.orig; }
    else if (node.placeholder === rec.now.trim()) node.placeholder = rec.orig;
  }
  held.clear(); notes = []; index = 0; before = null;
}

// ── where words come from ───────────────────────────────

const norm = (t) => t.replace(/\s+/g, ' ').trim();
const tail = (f) => f.replace(/^.*?\b(src|app|components|pages)\//, '$1/');
const same = (a, b) => tail(a) === tail(b);
async function kindOf(node) {
  const el = node.parentElement, words = norm(node.data);
  const found = await locate(el, { chain: true }).catch(() => null);
  if (!found?.file) return 'data';
  const owners = (found.chain ?? []).filter((c) => c?.file && !(c.file === found.file && c.line === found.line));
  const r = await request('text-at', { file: found.file, line: found.line, column: found.column, text: words, owners: owners.map((c) => `${c.file}:${c.line}:${c.column}`).join(',') }).catch(() => null);
  // several strings in source say these words: still words someone typed (a label repeated across a list or a file)
  if (!r?.file && /places in your code say/.test(r?.reason ?? '')) return r.where?.file && owners.some((o) => same(o.file, r.where.file) && !same(o.file, found.file)) ? 'prop' : 'fixed';
  if (!r?.file) return 'data';                                   // not written in source as one string: built at runtime
  // the string sits nearer a use site of the part than the part's own element: passed in. Same file counts too
  const own = same(r.file, found.file) ? Math.abs(found.line - r.line) : Infinity;
  const used = owners.filter((o) => same(o.file, r.file));
  if (used.length && Math.min(...used.map((o) => Math.abs(o.line - r.line))) < own) return 'prop';
  if (own < Infinity) return 'fixed';                             // typed in the component that draws it
  return 'data';                                                  // a string kept elsewhere and looked up
}

/** Sort every eligible run of words on the page, a few at a time. */
async function sortAll() {
  const nodes = [], seen = new Set();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (eligible(n) && !kinds.has(n)) nodes.push(n);
  // one line of source drawn several times with different words is a repeated part (a list's items, cards, tabs):
  // its words are content, whatever the strings are written as
  const bySite = new Map();
  for (const n of nodes) { const at = n.parentElement.getAttribute('data-plumb-source'); if (at) (bySite.get(at) ?? bySite.set(at, []).get(at)).push(n); }
  const memo = new Map();                                          // one lookup per element and words
  let next = 0;
  const work = async () => {
    while (next < nodes.length) {
      const n = nodes[next++], key = n.parentElement;
      const k = `${norm(n.data)}`;
      let byEl = memo.get(key); if (!byEl) memo.set(key, byEl = new Map());
      if (!byEl.has(k)) byEl.set(k, kindOf(n));
      kinds.set(n, await byEl.get(k));
    }
  };
  await Promise.all(Array.from({ length: 8 }, work));
  // a list is one thing: its items take the kind most of them have (an array typed into the component stays fixed;
  // items fed from a catalogue elsewhere are content). Its stretched items say so as 'list'
  for (const group of bySite.values()) {
    if (new Set(group.map((n) => norm(n.data))).size < 2) continue;
    const votes = new Map(); for (const n of group) votes.set(kinds.get(n), (votes.get(kinds.get(n)) ?? 0) + 1);
    const top = [...votes].sort((a, b) => b[1] - a[1])[0][0];
    for (const n of group) kinds.set(n, top === 'fixed' ? 'fixed' : 'list');
  }
  tally = { fixed: 0, prop: 0, data: 0, list: 0 };
  for (const n of nodes) tally[kinds.get(n)]++;
  void seen;
}
const stressed = (node) => node.nodeType === 3 && kinds.has(node) && kinds.get(node) !== 'fixed';   // placeholders are copy too; typing into fields is its own toy

// ── what broke ──────────────────────────────────────────────

const inView = (r, win = window) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < win.innerHeight && r.left < win.innerWidth;
const cssOf = (el) => el.ownerDocument.defaultView.getComputedStyle(el);
const hides = (cs, axis) => /hidden|clip|auto|scroll/.test(axis === 'x' ? cs.overflowX : cs.overflowY);
const drawn = (cs) => { const bg = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor); const a = bg ? (bg[1].split(/[,/]/)[3] ?? 1) : 0; return parseFloat(a) > 0.05 || parseFloat(cs.borderLeftWidth) > 0 || cs.boxShadow !== 'none' || cs.backgroundImage !== 'none'; };

function wordsRect(el) {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const n of el.childNodes) {
    if (n.nodeType !== 3 || !n.data.trim()) continue;
    const range = el.ownerDocument.createRange(); range.selectNodeContents(n);
    for (const q of range.getClientRects()) { if (!q.width) continue; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); }
  }
  return r > l ? { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t } : null;
}

/** Every text-holding element in view, and what is wrong with it now: Map(el → { kind, box, ... }). */
function measure(win = window, { all = false } = {}) {
  const doc = win.document, innerWidth = win.innerWidth, getComputedStyle = cssOf;
  const found = new Map(), boxes = [], touching = new Set();
  found.touching = touching;
  const els = new Set();
  const walk = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (eligible(n)) els.add(n.parentElement);
  for (const el of els) {
    const w = wordsRect(el);
    if (!w || !(all ? w.width > 0 && w.height > 0 : inView(w, win))) continue;
    // words the browser lays out but does not show (a label a narrow layout hides with opacity or visibility)
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    // words for screen readers only: a box of a pixel or so, clipped, whatever width the words would take
    { const bx = el.getBoundingClientRect(); if (cssOf(el).display !== 'inline' && (bx.width < 4 || bx.height < 4)) continue; }
    boxes.push({ el, w });
    // cut: this element or a close ancestor hides what overflows, and the words need more room than it has
    // (and its own words are what goes past the box's edge, so a wide section clipping something else says nothing)
    let cut = null;
    for (let a = el; a && a !== doc.body && !cut; a = a.parentElement) {   // any box up the chain that clips: a row pushed out of its frame is cut by the frame
      const cs = getComputedStyle(a), r = a.getBoundingClientRect();
      const fixed = (o) => o !== 'auto' && o !== 'scroll';
      if (hides(cs, 'x') && fixed(cs.overflowX) && a.scrollWidth > a.clientWidth + 1 && (w.right > r.right + 1 || w.left < r.left - 1 || cs.textOverflow === 'ellipsis' && a === el)) cut = { box: a, need: a.scrollWidth, have: a.clientWidth, axis: 'x' };
      else if (hides(cs, 'y') && fixed(cs.overflowY) && a.scrollHeight > a.clientHeight + 2 && w.bottom > r.bottom + 1) cut = { box: a, need: a.scrollHeight, have: a.clientHeight, axis: 'y' };
    }
    if (cut && (cut.box.clientWidth < 4 || cut.box.clientHeight < 4)) continue;   // hidden on purpose: words for screen readers only
    // cut on purpose: an ellipsis or a line clamp is the design saying "this may not fit" (owner, 2026-11-15: skip it)
    if (cut) { const c = cssOf(cut.box); if (c.textOverflow === 'ellipsis' || cssOf(el).textOverflow === 'ellipsis' || (c.webkitLineClamp && c.webkitLineClamp !== 'none')) continue; }
    if (cut) { found.set(el, { kind: 'cut', el, ...cut, rect: cut.box.getBoundingClientRect() }); continue; }
    // spill: the words cross the edge of the nearest box drawn around them, or the screen's
    if ((w.right > innerWidth + 1 || w.left < -1) && !inScroller(el)) { found.set(el, { kind: 'spill', el, rect: w, edge: 'screen', by: Math.round(Math.max(w.right - innerWidth, -w.left)) }); continue; }
    for (let a = el, i = 0; a && a !== doc.body && i < 6; a = a.parentElement, i++) {
      const cs = getComputedStyle(a);
      if (!drawn(cs)) continue;
      const r = a.getBoundingClientRect();
      const by = Math.max(w.right - r.right, r.left - w.left, w.bottom - r.bottom);
      if (by > 1) found.set(el, { kind: 'spill', el, rect: w, edge: a, by: Math.round(by) });
      break;
    }
  }
  // overlap: words that run into other words (a pair, said once, by the first)
  boxes.sort((a, b) => a.w.top - b.w.top);
  for (let i = 0; i < boxes.length; i++) {
    const A = boxes[i]; if (found.has(A.el) || [...found.values()].some((f) => f.other === A.el)) continue;
    for (let j = i + 1; j < boxes.length && boxes[j].w.top < A.w.bottom; j++) {
      const B = boxes[j]; if (A.el.contains(B.el) || B.el.contains(A.el) || pinnedOf(A.el) !== pinnedOf(B.el) || faded(A.el) || faded(B.el)) continue;   // a crossfade passes two words through each other on purpose   // a sticky bar over scrolled content is not words running into words
      const x = Math.min(A.w.right, B.w.right) - Math.max(A.w.left, B.w.left), y = Math.min(A.w.bottom, B.w.bottom) - Math.max(A.w.top, B.w.top);
      if (x > -3 && y > -3) { touching.add(A.el); touching.add(B.el); }   // within a few pixels: a hair of relayout tips it
      if (x > 2 && y > 2) { found.set(A.el, { kind: 'overlap', el: A.el, other: B.el, rect: union(A.w, B.w) }); break; }
    }
  }
  const page = doc.scrollingElement;
  if (page.scrollWidth > innerWidth + 1) {
    // what pushes it: the deepest thing whose right edge passes the screen's by the most (not inside a row that scrolls)
    let cause = null, far = innerWidth + 1;
    for (const e of doc.body.querySelectorAll('*')) {
      if (e.closest(OURS)) continue;
      const r = e.getBoundingClientRect();
      if (r.width && r.right > far - 0.5 && !inScroller(e)) { far = r.right; cause = e; }
    }
    found.set(doc.documentElement, { kind: 'sideways', el: cause ?? doc.documentElement, cause, by: page.scrollWidth - innerWidth, rect: null });
  }
  return found;
}
// a row that scrolls sideways (a carousel) is meant to run past the screen
const inScroller = (el) => { for (let a = el.parentElement; a && a !== el.ownerDocument.body; a = a.parentElement) if (/hidden|clip|auto|scroll/.test(cssOf(a).overflowX)) return true; return false; };
const faded = (el) => { let o = 1; for (let a = el; a && a !== el.ownerDocument.body; a = a.parentElement) o *= parseFloat(cssOf(a).opacity); return o < 0.98; };
const pinnedOf = (el) => { for (let a = el; a && a !== el.ownerDocument.body; a = a.parentElement) if (/fixed|sticky/.test(cssOf(a).position)) return a; return null; };
const union = (a, b) => { const l = Math.min(a.left, b.left), t = Math.min(a.top, b.top), r = Math.max(a.right, b.right), bo = Math.max(a.bottom, b.bottom); return { left: l, top: t, right: r, bottom: bo, width: r - l, height: bo - t }; };

const nameOf = (el) => { const rec = [...el.childNodes].map((n) => held.get(n) ?? swapped.get(n)).find(Boolean); const s = (rec ? rec.orig : el.textContent ?? '').trim().replace(/\s+/g, ' '); return s.length > 26 ? s.slice(0, 25) + '…' : s; };
const sourceOf = (el) => { const s = el.closest?.('[data-plumb-source]')?.getAttribute('data-plumb-source')?.split('#')[0]; if (!s) return null; const m = /([^/]+?):(\d+)(?::\d+)?$/.exec(s); return m ? `${m[1]}:${m[2]}` : s; };

function say(b) {
  const name = `“${nameOf(b.el)}”`;
  if (b.kind === 'cut') return { title: `${name} gets cut off.`, why: `Its box is ${Math.round(b.have)}px ${b.axis === 'x' ? 'wide' : 'tall'} and hides the rest; the words need ${Math.round(b.need)}px.` };
  if (b.kind === 'collapse') return { title: `the box round “${b.name.slice(0, 25)}” shrinks to ${b.w}×${b.h}px.`, why: 'With nothing in it, it reads as a stray dot or line. Give it a minimum size, or leave it out when there is nothing to show.' };
  if (b.kind === 'locked') {
    const rem = `${+(b.px / 16).toFixed(4)}rem`;
    return b.cls
      ? { title: `${b.count > 1 ? `${name} and ${b.count - 1} more stay` : `${name} stays`} ${b.px}px when the reader asks for bigger text.`, why: `${b.count > 1 ? 'They all use' : 'It uses'} ${b.cls}, a size in pixels. ${b.cls.replace(/\[[\d.]+px\]/, `[${rem}]`)} looks the same and grows with the reader's setting.` }
      : { title: `${name} stays ${b.px}px when the reader asks for bigger text.`, why: `Its size is set in pixels${b.count > 1 ? `, here and in ${b.count - 1} more place${b.count > 2 ? 's' : ''} drawn by the same line` : ''}. In rem (${rem}) it would grow with the reader's setting.` };
  }
  if (b.kind === 'spill') return { title: `${name} runs out of its box.`, why: b.edge === 'screen' ? `It runs ${b.by}px off the screen.` : `It crosses the box's edge by ${b.by}px.` };
  if (b.kind === 'overlap') return { title: `${name} runs into “${nameOf(b.other)}”.`, why: 'The two sets of words now sit on top of each other.' };
  const what = b.cause ? `“${nameOf(b.cause) || b.cause.localName}”` : 'Something';
  return { title: 'the whole page scrolls sideways.', why: `${what} reaches ${Math.round(b.by)}px past the screen's edge.` };
}

// words that already touched before the toy are not its news when they now run into each other
const old = (b, base) => b.kind === 'overlap' && !!base?.touching && (base.touching.has(b.el) && base.touching.has(b.other));
const cap = (t) => t.replace(/^[a-z]/, (c) => c.toUpperCase());
function judge() {
  const now = measure();
  const fresh = [...now.values()].filter((b) => (!before?.has(b.el) || before.get(b.el).kind !== b.kind) && !old(b, before));
  const order = { sideways: 0, cut: 1, overlap: 2, spill: 3 };
  return fresh.sort((a, b) => order[a.kind] - order[b.kind] || (a.rect?.top ?? 0) - (b.rect?.top ?? 0)).map((b) => { const t = say(b); return { ...b, ...t, title: cap(t.title), source: sourceOf(b.el) }; });
}

// ── drawing ─────────────────────────────────────────────────

const CSS_TEXT = `
:host { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; display: block; }
svg.page { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.stage { position: absolute; inset: 0; display: none; pointer-events: auto; background: color-mix(in oklab, var(--pl-ink) 72%, var(--pl-paper)); }
.stage.on { display: block; animation: fade 200ms var(--pl-ease-out) both; }
.stage iframe { position: absolute; top: 40px; left: 50%; translate: -50% 0; height: calc(100% - 40px - 176px); border: 0; border-radius: 10px;
  background: var(--pl-paper); box-shadow: var(--pl-shadow-card); }
.wpx { position: absolute; top: 10px; left: 50%; translate: -50% 0; padding: 2px 10px; border-radius: var(--pl-radius-pill);
  background: var(--pl-paper); color: var(--pl-ink); font: var(--pl-card-code); font-variant-numeric: tabular-nums; }
@keyframes fade { from { opacity: 0; } }
.ring { fill: none; stroke: var(--pl-off); stroke-width: 1.5; }
.halo { fill: none; stroke: var(--pl-halo); stroke-width: 3.5; }
.hand { fill: url(#hatch); }
.hatch { stroke: var(--pl-off); stroke-width: 1.5; opacity: .55; }
.mark { animation: pop 240ms var(--pl-spring-pop) both; transform-box: fill-box; transform-origin: center; }

.bar { position: absolute; left: 50%; bottom: 16px; translate: -50% 0; width: min(860px, calc(100vw - 32px)); box-sizing: border-box;
  display: grid; gap: 10px; padding: 12px 14px 14px; background: var(--pl-paper); color: var(--pl-ink);
  border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card); pointer-events: auto; font: var(--pl-card-body); }
.toys { display: flex; gap: 6px; align-items: center; }
.toy { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px 0 6px; border: 0; border-radius: var(--pl-radius-pill);
  background: var(--pl-paper-2); color: var(--pl-ink-2); font: var(--pl-text-label); font-size: 12px; cursor: pointer;
  transition: scale 120ms var(--pl-ease-out), background-color 160ms var(--pl-ease-out), color 160ms var(--pl-ease-out); }
.toy .face { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; background: var(--pl-paper); color: var(--pl-ink-2); transition: inherit; }
.toy svg { width: 14px; height: 14px; }
.toy:hover { color: var(--pl-ink); }
.toy:active { scale: 0.96; }
.toy[aria-pressed="true"] { background: var(--pl-off-bg); color: var(--pl-ink); }
.toy[aria-pressed="true"] .face { background: var(--pl-off); color: var(--pl-coral-ink, #fff); }
.toy:focus-visible, .step button:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 2px; }
.toys .grow { flex: 1; }
.toys { flex-wrap: wrap; }
.modes { display: inline-flex; gap: 2px; padding: 2px; border-radius: var(--pl-radius-pill); background: var(--pl-paper-2); justify-self: start; }
.modes button { height: 24px; padding: 0 10px; border: 0; border-radius: var(--pl-radius-pill); background: none; color: var(--pl-ink-2); font: var(--pl-text-label); font-size: 12px; cursor: pointer; }
.modes button[aria-pressed="true"] { background: var(--pl-paper); color: var(--pl-ink); box-shadow: var(--pl-shadow-tag); }
.modes button:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 2px; }
.verdict { margin: 0; font: var(--pl-card-meta); color: var(--pl-ink-2); }
.note { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: start; }
.say { min-width: 0; display: grid; gap: 2px; }
.title { margin: 0; font: var(--pl-card-title); text-wrap: pretty; }
.why { margin: 0; color: var(--pl-ink-2); text-wrap: pretty; }
.src { font: var(--pl-card-code); color: var(--pl-ink-2); }
.step { display: flex; align-items: center; gap: 2px; font: var(--pl-card-meta); color: var(--pl-ink-2); font-variant-numeric: tabular-nums; }
.step button { width: 24px; height: 24px; border: 0; border-radius: 6px; background: none; color: var(--pl-ink-2); cursor: pointer; font: inherit; font-size: 15px; line-height: 1; }
.step button:hover { background: var(--pl-paper-2); color: var(--pl-ink); }
.step button[disabled] { opacity: 0.35; cursor: default; background: none; }
:host([data-arrive]) .bar { animation: pop 260ms var(--pl-spring-pop) both; transform-origin: 50% 100%; }
@keyframes pop { from { scale: 0.92; opacity: 0; } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
`;

// the toy's face: a word with its stretch marks
const LONGER = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 8h7"/><path d="M11.5 5.5 14 8l-2.5 2.5"/><path d="M2 5v6" opacity=".6"/></svg>';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ── narrower: a copy of the page, squeezed ──────────────────

let stage = null, ground = [255, 255, 255];   // { frame, from, width, sweeping }
// a frame, or 50ms when the tab is in the background and frames stop: the sweep never stalls
const frames = (n = 1) => new Promise((r) => { let left = n, done = false; const tick = () => { if (done) return; if (--left <= 0) { done = true; r(); } else wait(); }; const wait = () => { requestAnimationFrame(tick); setTimeout(tick, 50); }; wait(); });
const STEP = 16, NARROWEST = 320;

function setWidth(w) { if (!stage) return; stage.width = w; stage.frame.style.width = `${w}px`; const pill = host?.shadowRoot.querySelector('.wpx'); if (pill) pill.textContent = `${w}px`; }

async function narrower() {
  const root = host.shadowRoot, box = root.querySelector('.stage');
  box.innerHTML = '<span class="wpx"></span><iframe title="This page, narrower"></iframe>';
  stage = { frame: box.querySelector('iframe'), from: Math.min(innerWidth - 32, 1440), width: 0, sweeping: true };
  box.classList.add('on');
  setWidth(stage.from);
  const loaded = new Promise((r) => stage.frame.addEventListener('load', r, { once: true }));
  stage.frame.style.background = `rgb(${ground.slice(0, 3).join(' ')})`;   // the page's own ground: an app with a transparent body is not see-through
  stage.frame.src = location.href;
  await loaded; await new Promise((r) => setTimeout(r, 900));   // the app's first render, its fonts
  const mine = stage; if (!mine || toy !== 'narrower') return;
  const win = mine.frame.contentWindow, base = measure(win, { all: true }), first = new Map();
  // squeeze a step a frame: you watch the page give way, and each break is caught at the width it starts
  for (let w = mine.from - STEP; ; w = Math.max(NARROWEST, w - STEP)) {
    if (stage !== mine) return;
    setWidth(w); await frames(1);
    for (const b of measure(win, { all: true }).values()) {
      if (base.get(b.el)?.kind === b.kind || first.has(b.el) || old(b, base)) continue;
      first.set(b.el, { ...b, width: w });
    }
    if (w === NARROWEST) break;
  }
  mine.sweeping = false;
  // one row or list giving way breaks several of its things at the same width: said once, by its first
  const seen = new Map();
  for (const b of first.values()) { const k = `${b.kind}|${b.width}|${sourceOf(b.el.parentElement) ?? ''}`; if (seen.has(k)) seen.get(k).more++; else seen.set(k, Object.assign(b, { more: 0 })); }
  notes = [...seen.values()].sort((x, y) => y.width - x.width).map((n) => { const t = say(n); return { ...n, ...t, title: cap(t.title).replace(/\.$/, ` at ${n.width}px${n.more ? `, and ${n.more} more like it` : ''}.`).replace(' scrolls sideways at', ' scrolls sideways from'), source: sourceOf(n.el), live: true }; });
  index = 0;
  if (notes.length) showAt(0); else { setWidth(NARROWEST); paint(); }
}
function showAt(i) {
  index = i; const n = notes[i];
  setWidth(n.width);
  if (n.el !== n.el.ownerDocument.documentElement) n.el.scrollIntoView({ block: 'center' });
  paint();
}
function unstage() {
  stage = null;
  const box = host?.shadowRoot.querySelector('.stage');
  if (box) { box.classList.remove('on'); box.innerHTML = ''; }
}

// ── bigger text: the reader's setting at 200% ───────────────

let saved = null, locked = [];
function bigger() {
  const html = document.documentElement, sizes = new Map();
  before = measure();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (eligible(n) && !sizes.has(n.parentElement)) sizes.set(n.parentElement, parseFloat(cssOf(n.parentElement).fontSize));
  saved = html.style.fontSize;
  // what a browser's text-size setting does: the root size doubles, and everything set in rem or em follows it
  html.style.fontSize = `${parseFloat(cssOf(html).fontSize) * 2}px`;
  const bySite = new Map();
  for (const [el, px] of sizes) {
    if (parseFloat(cssOf(el).fontSize) / px > 1.25) continue;
    // one cause, one note: the class that sets the size in pixels (text-[11px]), else the line of source that draws it
    let cls = null; for (let a = el, i = 0; a && i < 4 && !cls; a = a.parentElement, i++) cls = (a.getAttribute('class') ?? '').split(/\s+/).find((c) => /^(?:[\w-]+:)*text-\[[\d.]+px\]$/.test(c)) ?? null;
    const site = cls ?? el.closest('[data-plumb-source]')?.getAttribute('data-plumb-source') ?? el;
    (bySite.get(site) ?? bySite.set(site, []).get(site)).push({ el, px, cls });
  }
  locked = [...bySite.values()].sort((a, b) => b.length - a.length).map((g) => ({ kind: 'locked', el: g[0].el, els: g.map((x) => x.el), px: Math.round(g[0].px), count: g.length, cls: g[0].cls, live: true }));
  later();
}
function unbig() { document.documentElement.style.fontSize = saved ?? ''; saved = null; locked = []; before = null; }

// ── extreme content: what a slot that can change might really hold ──

// each kind, and what it does to one run of words. A kind that has nothing to say about a run (a number for words
// with no digits) leaves it as it is
const KINDS = [
  { id: 'empty', as: 'With no words', make: () => '' },
  { id: 'one', as: 'As one letter', make: (t) => t.trim()[0] ?? '' },
  { id: 'long', as: 'At 60 letters', make: (t) => { const w = t.trim().split(/\s+/); let o = t.trim(); for (let i = 0; o.length < 60; i++) o += ' ' + w[i % w.length]; return o.slice(0, 60); } },
  { id: 'unbroken', as: 'As one unbroken word, like a link or an ID,', make: (t) => { const c = t.replace(/\s+/g, '').toLowerCase() || 'x'; let o = ''; while (o.length < 48) o += c; return o.slice(0, 48); } },
  { id: 'number', as: 'With a nine-digit number', make: (t) => (/\d/.test(t) ? t.replace(/\d[\d,.]*/g, '123,456,789') : null) },
];
const swapped = new Map();   // text node → { orig, now }
let probing = false, tried = 0;

function swapTo(kind) {
  unswap();
  for (const [node, k] of kinds) {
    if (k === 'fixed' || !node.isConnected) continue;
    const to = kind.make(node.data);
    if (to === null || to === node.data) continue;
    const m = /^(\s*)[\s\S]*?(\s*)$/.exec(node.data), now = to ? m[1] + to + m[2] : '';
    swapped.set(node, { orig: node.data, now });
    node.data = now;
  }
}
function unswap() { for (const [node, r] of swapped) if (node.data === r.now) node.data = r.orig; swapped.clear(); }

/** The drawn box round each run of words that can change (a button, a badge, a chip): its size, to see it collapse. */
function boxesOf() {
  const out = new Map();
  for (const [node, k] of kinds) {
    if (k === 'fixed' || !node.isConnected) continue;
    for (let a = node.parentElement, i = 0; a && a !== document.body && i < 3; a = a.parentElement, i++) {
      if (!drawn(cssOf(a))) continue;
      const r = a.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) out.set(a, { node, w: r.width, h: r.height });
      break;
    }
  }
  return out;
}

async function extreme() {
  if (!tally) { sorting = true; paint(); await sortAll(); sorting = false; if (toy !== 'extreme') return; }
  probing = true; tried = 0; paint();
  const base = measure(window, { all: true }), sized = boxesOf(), found = new Map();   // the whole page: a person scrolls
  for (const kind of KINDS) {
    if (toy !== 'extreme') { unswap(); return; }
    const wide = innerWidth;
    swapTo(kind); await frames(2); tried++;
    if (innerWidth !== wide) continue;   // the window changed size mid-step: not the content's doing
    for (const b of measure(window, { all: true }).values()) {
      const k = `${b.kind}|${sourceOf(b.el) ?? ''}|${kind.id}`;
      if (base.get(b.el)?.kind === b.kind || found.has(k) || old(b, base)) continue;
      found.set(k, { ...b, variant: kind, live: true, name: nameOf(b.el) });
    }
    // a box that held words and now holds none, or one letter, shrinks to a sliver: a button or a badge with nothing in it
    if (kind.id === 'empty' || kind.id === 'one') for (const [a, was] of sized) {
      const r = a.getBoundingClientRect();
      if ((r.width < 16 && was.w >= 24) || (r.height < 8 && was.h >= 16)) {
        const k = `collapse|${sourceOf(a) ?? ''}|${kind.id}`;
        if (!found.has(k)) found.set(k, { kind: 'collapse', el: a, box: a, w: Math.round(r.width), h: Math.round(r.height), variant: kind, live: true, name: swapped.get(was.node)?.orig.trim() ?? '' });
      }
    }
  }
  unswap(); await frames(1);
  probing = false;
  notes = [...found.values()].map((n) => { const t = say(n); return { ...n, ...t, title: `${n.variant.as}${n.variant.as.endsWith(',') ? '' : ','} ${t.title}`, source: sourceOf(n.el) }; });
  index = 0;
  if (notes.length) showVariant(0); else paint();
}
function showVariant(i) {
  index = i; const n = notes[i];
  swapTo(n.variant);
  requestAnimationFrame(() => { const r = rectOf(n); if (r && (r.top < 0 || r.top + r.height > innerHeight - 160)) n.el.scrollIntoView({ block: 'center' }); later(); });
  paint();
}

// ── the action fails, or is slow ──────────────────────────────

// You press the button you care about; plumber answers the requests that press sends (fetch and XHR, never its own
// or the dev server's) with a server error, or holds them for SLOW_MS and then lets them through. Then it watches
// WATCH_MS and says what a person would meet. A WebSocket (Convex, Firebase) is not reached: said when nothing was sent
const SLOW_MS = 4000, WATCH_MS = 5000, CATCH_MS = 1500;
const MINE = /\/__plumb|\/@vite|\/@fs\/|\/node_modules\/|hot-update|\/@react-refresh/;
let act = null;   // { mode, phase: 'armed' | 'watching' | 'done', control, label, sent, before, said, t0, timer }
let mode = 'fail';
const realFetch = window.fetch, realOpen = XMLHttpRequest.prototype.open, realSend = XMLHttpRequest.prototype.send;

function caught(url) { return act && act.phase === 'watching' && performance.now() - act.t0 < CATCH_MS && !MINE.test(String(url)); }

function hook() {
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    if (!caught(url)) return realFetch.apply(this, arguments);
    act.sent.push(url);
    if (act.mode === 'slow') return new Promise((r) => setTimeout(r, SLOW_MS)).then(() => realFetch.call(window, input, init));
    act.failedAt = performance.now();
    // what a server that fell over sends: a 500 with a plain-text page, not the JSON the app hoped for
    return Promise.resolve(new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error', headers: { 'Content-Type': 'text/plain' } }));
  };
  XMLHttpRequest.prototype.open = function (method, url) { this.__plumbUrl = url; this.__plumbArgs = [...arguments]; return realOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    if (!caught(this.__plumbUrl)) return realSend.apply(this, arguments);
    act.sent.push(this.__plumbUrl);
    if (act.mode === 'slow') { setTimeout(() => realSend.apply(this, arguments), SLOW_MS); return; }
    act.failedAt = performance.now();
    // an XHR cannot be answered by hand: sent to a closed port, it fails as a network error does
    const args = this.__plumbArgs.slice(); args[1] = 'http://127.0.0.1:9/plumber-failed-this';
    realOpen.apply(this, args); return realSend.call(this);
  };
}
function unhook() { window.fetch = realFetch; XMLHttpRequest.prototype.open = realOpen; XMLHttpRequest.prototype.send = realSend; }

const CONTROL = 'button, [role="button"], a[href], input[type="submit"], input[type="button"], summary';
const stateOf = (c) => ({ disabled: !!c.disabled || c.getAttribute('aria-disabled') === 'true', busy: c.getAttribute('aria-busy') === 'true', text: norm(c.textContent ?? c.value ?? '') });
const spinners = () => new Set(document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity && a.effect.target && !a.effect.target.closest?.(OURS) && a.effect.target.isConnected && a.effect.target.checkVisibility?.()).map((a) => a.effect.target));

function pressed(event) {
  if (!act || act.phase === 'watching' || event.button !== 0 || event.composedPath().includes(host)) return;   // a press in plumber's own bar is not the app's
  if (act.phase === 'done') { notes = []; Object.assign(act, { phase: 'armed', said: null, failedAt: null, during: null }); }
  const c = event.composedPath().find((n) => n instanceof Element && n.matches?.(CONTROL));
  if (!c || c.closest(OURS)) return;
  const words = [];
  const seen = new MutationObserver((records) => {
    for (const r of records) {
      const nodes = r.type === 'characterData' ? [r.target] : [...r.addedNodes].flatMap((n) => (n.nodeType === 3 ? [n] : n.nodeType === 1 ? [...walkText(n)] : []));
      for (const n of nodes) {
        const el = n.parentElement, t = norm(n.data ?? '');
        if (!el || el.closest(OURS) || !LETTER.test(t)) continue;
        words.push({ t, el, at: performance.now() });
      }
    }
  });
  seen.observe(document.body, { childList: true, subtree: true, characterData: true });
  Object.assign(act, { phase: 'watching', control: c, label: norm(c.textContent || c.value || c.getAttribute('aria-label') || 'it').slice(0, 30), before: stateOf(c), spinBefore: spinners(), t0: performance.now(), sent: [], words, seen });
  setTimeout(() => { if (act?.control === c) act.during = { ...stateOf(c), spin: spinners() }; }, 600);
  act.timer = setTimeout(() => judgeAction(), act.mode === 'slow' ? SLOW_MS + 1500 : WATCH_MS);
  paint();
}
function* walkText(root) { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) yield n; }

function judgeAction() {
  if (!act || act.phase !== 'watching') return;
  act.seen.disconnect(); act.phase = 'done';
  const c = act.control, now = stateOf(c), out = [], label = `“${act.label}”`;
  const stillSpinning = [...spinners()].filter((el) => !act.spinBefore.has(el));
  if (!act.sent.length) {
    out.push({ kind: 'nothing', el: c, live: true, title: `${label} sent nothing plumber could fail.`, why: 'No request went out in the 1.5 seconds after the press. It may work without the network, send over a WebSocket (Convex, Firebase) or reload the page, which this toy does not reach yet.' });
  } else if (act.mode === 'fail') {
    // what changed on the page after the failure, other than the button's own words
    const said = act.words.filter((w) => w.at >= (act.failedAt ?? act.t0) && !c.contains(w.el) && w.el.checkVisibility?.());
    if (!said.length) out.push({ kind: 'silent', el: c, live: true, title: 'Nothing tells the person it failed.', why: `The request ${label} sent got a server error, and for ${WATCH_MS / 1000} seconds no words appeared anywhere on the page. Say what went wrong and what to do next, near the button.` });
    else act.said = said[said.length - 1].t;
    if (now.disabled && !act.before.disabled) out.push({ kind: 'stuck', el: c, live: true, title: `${label} stays disabled after the failure.`, why: 'It turned off when pressed and never came back, so the person cannot try again without reloading.' });
    else if (now.text !== act.before.text) out.push({ kind: 'stuck', el: c, live: true, title: `${label} still says “${now.text.slice(0, 30)}”.`, why: 'It changed its words for the wait and never changed them back after the failure.' });
    for (const el of stillSpinning) out.push({ kind: 'spinning', el, live: true, title: 'A spinner keeps spinning.', why: `It started with the press and is still going ${WATCH_MS / 1000} seconds after the request failed: it promises progress that will never come.` });
  } else {
    const d = act.during ?? {};
    const shows = d.disabled || d.busy || d.text !== act.before.text || [...(d.spin ?? [])].some((el) => !act.spinBefore.has(el));
    if (!shows) out.push({ kind: 'still', el: c, live: true, title: `Nothing shows ${label} is working.`, why: `The request takes ${SLOW_MS / 1000} seconds, and for that time the page looks exactly as it did before the press. Show it is working within a moment of the press.` });
    if (!d.disabled && !d.busy) out.push({ kind: 'twice', el: c, live: true, title: `${label} can be pressed again while it waits.`, why: 'Nothing stops a second press while the first request is still out, and a second press sends it again: two projects, two payments.' });
  }
  notes = out.map((n) => ({ ...n, source: sourceOf(n.el) })); index = 0;
  paint();
}

function arm() { hook(); act = { mode, phase: 'armed' }; addEventListener('pointerdown', pressed, true); }
function disarm() { if (act?.timer) clearTimeout(act.timer); act?.seen?.disconnect(); act = null; unhook(); removeEventListener('pointerdown', pressed, true); }
export function setMode(next) { mode = next; if (toy === 'action') { disarm(); arm(); notes = []; paint(); } }

// ── typing into fields ───────────────────────────────────────

// each field gets, in turn, what people really put there. Entered the way typing is (the value set, then an input
// event), so the app reacts: a search filters, a counter counts. Put back after each one
const TYPED = [
  { id: 'long', as: 'a long line', value: (f) => (f.type === 'email' ? 'a.very.long.name.with.several.parts@a-company-with-a-rather-long-name.example.com' : 'A long thing someone might really type here, the way people do when they explain themselves properly') },
  { id: 'link', as: 'a pasted link', value: () => 'https://example.com/a/very/long/link/someone/pasted/without/a/single/space?ref=0123456789abcdef' },
  { id: 'lines', as: 'several pasted lines', value: (f) => (f.localName === 'textarea' ? 'First line\nSecond line\nThird line\nFourth line\nFifth line\nSixth line' : null) },
  { id: 'empty', as: 'nothing', value: () => '' },
];
const FIELD = 'input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], input[type="password"], textarea';
let typing = false, typedIn = 0, shown = null;   // shown: { f, orig } while a note's value sits in its field

function enter(f, v) {
  const proto = f.localName === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(f, v);
  f.dispatchEvent(new Event('input', { bubbles: true }));
}
const fieldName = (f) => norm(f.getAttribute('aria-label') || (f.id && document.querySelector(`label[for="${CSS.escape(f.id)}"]`)?.textContent) || f.closest('label')?.textContent || f.placeholder || f.name || 'this field').slice(0, 30);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** What a person can read on the page: every visible run of words. */
function visibleWords() {
  const out = new Set(); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const el = n.parentElement; if (el && !el.closest(OURS) && LETTER.test(n.data) && el.checkVisibility?.()) out.add(norm(n.data)); }
  return out;
}
/** Lines of source drawn two or more times and visible: the page's lists, by the line that draws their items. */
function lists() {
  const by = new Map();
  for (const el of document.querySelectorAll('[data-plumb-source]')) { if (el.closest(OURS) || !el.checkVisibility?.()) continue; const k = el.getAttribute('data-plumb-source').split('#')[0]; (by.get(k) ?? by.set(k, []).get(k)).push(el); }
  return new Map([...by].filter(([, els]) => els.length >= 2));
}

async function typeAll() {
  typing = true; typedIn = 0; paint();
  const fields = [...document.querySelectorAll(FIELD)].filter((f) => !f.closest(OURS) && !f.disabled && !f.readOnly && f.checkVisibility?.());
  const found = new Map();
  for (const f of fields) {
    if (toy !== 'typing') break;
    typedIn++; paint();
    const orig = f.value, name = `“${fieldName(f)}”`;
    for (const t of TYPED) {
      const v = t.value(f);
      if (v === null || v === orig) continue;
      const base = measure(window, { all: true }), box = f.getBoundingClientRect(), words = visibleWords(), had = lists(), wide = innerWidth;
      enter(f, v); await frames(2); await pause(350);   // a search that waits for typing to stop (300ms is common)
      if (toy !== 'typing') { enter(f, orig); break; }
      if (innerWidth !== wide) { enter(f, orig); await frames(2); continue; }   // the window changed size, not the content: nothing to judge
      const into = `Typing ${t.as} into ${name}`, add = (k, n) => { if (!found.has(k)) found.set(k, { live: true, ...n, field: f, typed: t, title: `${into}, ${n.title}` }); };
      for (const b of measure(window, { all: true }).values()) {
        if (base.get(b.el)?.kind === b.kind || old(b, base) || b.el === f) continue;
        const said = say(b); add(`${b.kind}|${sourceOf(b.el) ?? ''}|${t.id}`, { ...b, ...said, title: said.title.replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/^the whole/, 'the whole') });
      }
      const now = f.getBoundingClientRect();
      if (Math.abs(now.width - box.width) > 4 && t.id !== 'empty') add(`grows|${t.id}|${sourceOf(f)}`, { kind: 'grows', el: f, px: Math.round(now.width - box.width), title: `the field grows ${Math.round(now.width - box.width)}px wider and moves what is beside it.`, why: 'A field that changes size as you type makes the row jump under your eyes. Give it a fixed width and let the text scroll inside it.' });
      const cs = cssOf(f);
      if (f.localName === 'textarea' && /hidden|clip/.test(cs.overflowY) && f.scrollHeight > f.clientHeight + 2) add(`clipped|${sourceOf(f)}`, { kind: 'clipped', el: f, title: 'the lines past the box’s height vanish.', why: 'The box hides what overflows and cannot scroll, so the person cannot see or check what they wrote. Let it scroll, or grow.' });
      if (f.scrollWidth > f.clientWidth + 1) {
        // something drawn inside the field's box (an icon, a shortcut hint, a clear button) that the text now runs under
        for (const el of f.parentElement?.querySelectorAll(':scope > *:not(input):not(textarea), :scope > * > svg') ?? []) {
          const r = el.getBoundingClientRect();
          if (r.width && r.left < now.right - 2 && r.right > now.left + 2 && r.top < now.bottom && r.bottom > now.top && !el.contains(f)) add(`under|${sourceOf(f)}|${t.id}`, { kind: 'under', el: f, other: el, title: `the words run under ${el.textContent.trim() ? `“${norm(el.textContent).slice(0, 12)}”` : 'the icon inside it'}.`, why: 'The text box reaches under something drawn on top of it. Pad the field on that side by the width of what sits there.' });
        }
      }
      // a search that matches nothing: a list emptied, and no new words to say so
      const nowLists = lists(), newWords = [...visibleWords()].filter((x) => !words.has(x) && x !== norm(v));
      for (const [k, els] of had) if (!nowLists.has(k) && els.length >= 3 && !newWords.length) {
        add(`emptied|${k}|${t.id}`, { kind: 'emptied', el: f, title: `the list of ${els.length} it filters disappears, and nothing says why.`, why: `With nothing matching, the page shows a blank space. Say that nothing matches “${norm(v).slice(0, 24)}…”, and how to get back.` });
        break;
      }
      enter(f, orig); await frames(2); await pause(200);
    }
  }
  typing = false;
  // a field that grows is the cause; what it pushes off the screen is its consequence, said in the same note
  const all = [...found.values()], out = [];
  for (const f of new Set(all.map((n) => n.field))) {
    const mine = all.filter((n) => n.field === f), grows = mine.filter((n) => n.kind === 'grows');
    if (!grows.length) { out.push(...mine); continue; }
    const rest = mine.filter((n) => n.kind !== 'grows'), by = Math.max(...grows.map((g) => g.px));
    const ways = [...new Set(grows.map((g) => g.typed.as))].join(' or '), sideways = rest.some((n) => n.kind === 'sideways');
    const pushed = new Set(rest.filter((n) => n.kind !== 'sideways').map((n) => sourceOf(n.el))).size;
    out.push({ ...grows[0], title: `Typing ${ways} into “${fieldName(f)}”, the field grows up to ${by}px wider${pushed ? ` and pushes ${count(pushed, 'thing', 'things')} off the screen` : ''}${sideways ? '; the page scrolls sideways' : ''}.`, why: 'A field that changes size as you type moves everything after it. Give it a width (or a maximum) and let the text scroll inside it.' });
    out.push(...rest.filter((n) => !['sideways', 'spill', 'cut', 'overlap'].includes(n.kind)));
  }
  notes = out.map((n) => ({ ...n, source: sourceOf(n.el) })); index = 0;
  typedIn = fields.length;
  if (notes.length) showTyped(0); else paint();
}
// put the note's value back in its field, so the break is on screen; the field's own value comes back after
function showTyped(i) {
  unshow(); index = i; const n = notes[i];
  if (n?.field && n.typed) { shown = { f: n.field, orig: n.field.value }; enter(n.field, n.typed.value(n.field)); }
  requestAnimationFrame(() => { if (n) scrollToNote(n.el); later(); });
  paint();
}
// up and down only: a field that grew past the screen must not drag the page sideways into empty space
function scrollToNote(el) { const r = el.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight - 160) scrollTo({ top: scrollY + r.top - innerHeight / 3, left: scrollX }); }
function unshow() { if (shown) { enter(shown.f, shown.orig); shown = null; }
}

// ── lists at none, one and a hundred ─────────────────────────

// A list on the page is a line of source drawn several times side by side. Plumber walks from one item up through
// React to the part that holds the array it is drawn from: a prop passed in (a reusable part's `items`, `steps`) or
// the part's own state (data it fetched or keeps). Then it hands the part, through React's own override (what React
// DevTools edits props with), no items, one item and a hundred, so the app draws its real empty state and its real
// crowd. A list built inside a part from a constant is the author's copy, not data: left alone, and counted
const SIZES = [
  { id: 'none', as: 'With no', make: () => [] },
  { id: 'one', as: 'With one of the', make: (a) => a.slice(0, 1) },
  { id: 'many', as: 'With a hundred', make: (a) => Array.from({ length: 100 }, (_, i) => copyItem(a[i % a.length], Math.floor(i / a.length))) },
];
// the copies of a round after the first get their own id, so React's keys stay apart
function copyItem(item, round) {
  if (!round) return item;
  if (typeof item === 'string') return `${item} ${round + 1}`;
  if (typeof item === 'number') return item + round * 1000;
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
  const out = { ...item };
  for (const k of ['id', 'key', 'slug', 'value', 'uuid', '_id', 'name', 'href', 'to']) if (typeof out[k] === 'string' || typeof out[k] === 'number') out[k] = `${out[k]}-${round + 1}`;
  return out;
}
const renderer = () => [...(window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.values?.() ?? [])].find((r) => r.overrideProps);
const fiberOf = (el) => { const k = Object.keys(el).find((x) => x.startsWith('__reactFiber$')); return k ? el[k] : null; };
const partName = (f) => f.type?.displayName || f.type?.name || f.type?.render?.name || 'a part';
let listing = false, listed = 0, sizedLists = [], unreached = 0, sized = null;   // sized: { list, size } on screen now

/** The page's lists and the array each is drawn from: [{ fiber, how: 'prop' | 'state', key | hook, orig, items, noun }]. */
function findLists() {
  const out = [], seen = new Set();
  unreached = 0;
  for (const [, els] of lists()) {
    const sib = els.filter((e) => e.parentElement === els[0].parentElement);
    if (sib.length < 2 || els.some((e) => els.some((o) => o !== e && o.contains(e)))) continue;
    if (out.some((l) => l.items.some((i) => i.contains(sib[0])))) continue;   // a list inside another list's item: the outer one is the list
    let hit = null;
    for (let f = fiberOf(sib[0]), i = 0; f && i < 40 && !hit; f = f.return, i++) {
      if (typeof f.type !== 'function' && typeof f.type?.render !== 'function') continue;
      for (const [k, v] of Object.entries(f.memoizedProps ?? {})) if (k !== 'children' && Array.isArray(v) && v.length >= sib.length && v.length <= sib.length * 3) { hit = { fiber: f, how: 'prop', key: k, orig: v }; break; }
      if (hit) break;
      let s = f.memoizedState, j = 0;
      for (; s && j < 60; s = s.next, j++) if (s.queue && Array.isArray(s.memoizedState) && s.memoizedState.length >= sib.length && s.memoizedState.length <= sib.length * 3) { hit = { fiber: f, how: 'state', hook: j, orig: s.memoizedState }; break; }
    }
    if (!hit) { unreached++; continue; }
    const id = hit.orig;
    if (seen.has(id)) continue;
    seen.add(id);
    const noun = hit.key && hit.key !== 'items' && /^[a-z]+s$/i.test(hit.key) ? hit.key.toLowerCase() : 'items';
    out.push({ ...hit, at: sib[0].getAttribute('data-plumb-source').split('#')[0], items: sib, box: sib[0].parentElement, noun, name: partName(hit.fiber), source: sourceOf(sib[0]) });
  }
  return out;
}
function feed(list, arr) {
  const r = renderer(); if (!r) return false;
  try {
    if (list.how === 'prop') r.overrideProps(list.fiber, [list.key], arr);
    else r.overrideHookState(list.fiber, list.hook, [], arr);
    return true;
  } catch { return false; }   // the part is gone (the page crashed and React took it down)
}
// a part that throws while drawing: React reports it on the window (nothing caught it) or on the console (a boundary did)
let crash = null, wrecked = false;
const realError = console.error;
// the first line of the app's own code in the stack: where it throws
const thrownAt = (err) => { const m = /\/src\/(?:[^\s?:()]*\/)?([^/\s?:()]+\.[jt]sx?)(?:\?[^:\s)]*)?:(\d+)/.exec(String(err?.stack ?? '')); return m ? `${m[1]}:${m[2]}` : null; };
function onCrash(e) { const err = e.error ?? e.reason; crash ??= { message: String(err?.message ?? e.message ?? 'an error').slice(0, 90), at: thrownAt(err) }; }
function listenCrash() {
  crash = null; addEventListener('error', onCrash); addEventListener('unhandledrejection', onCrash);
  console.error = function (...a) { const m = /error occurred in the <(\w+)> component/.exec(String(a[0])); if (m) crash ??= { part: m[1], message: String(a[1]?.message ?? '').slice(0, 90), at: thrownAt(a[1]) }; return realError.apply(this, a); };
}
function unlistenCrash() { removeEventListener('error', onCrash); removeEventListener('unhandledrejection', onCrash); console.error = realError; }
const settle = async () => { await frames(2); await pause(120); };
// React draws new elements after each size: find the list's items and box again by the line that draws them
function refresh(list) {
  const items = [...document.querySelectorAll('[data-plumb-source]')].filter((e) => e.getAttribute('data-plumb-source').split('#')[0] === list.at && !e.closest(OURS) && e.checkVisibility?.());
  if (items.length) { list.items = items; list.box = items[0].parentElement; }
}

async function sizeAll() {
  listing = true; listed = 0; paint();
  if (!renderer()) { listing = false; sizedLists = []; notes = []; paint(); return; }
  await settle();   // a list the last run put back is drawn again first
  if (toy !== 'lists') return;
  sizedLists = findLists();
  const found = [];
  wrecked = false;
  for (const list of sizedLists) {
    if (toy !== 'lists' || wrecked) break;
    listed++; paint();
    const label = list.noun === 'items' ? `items in ${list.name}` : list.noun;
    for (const size of SIZES) {
      refresh(list);
      const base = measure(window, { all: true }), words = visibleWords(), wide = innerWidth, area = list.box.getBoundingClientRect();
      const one = list.items[0].getBoundingClientRect();
      const t0 = performance.now();
      listenCrash();
      feed(list, size.make(list.orig)); await frames(1);
      const took = performance.now() - t0;   // React draws before the next frame: how long the screen was frozen
      await settle(); unlistenCrash();
      if (crash) {
        // the page threw: say so, and stop here. If React took the page down, turning the toy off reloads it
        found.push({ live: true, list, size, kind: 'crash', el: list.box, at: crash.at, title: `${size.as} ${label}, the page crashes.`, why: `${crash.part ?? list.name} throws “${crash.message}”. Code that reads the ${list.noun} must expect ${size.id === 'none' ? 'none' : size.id === 'one' ? 'only one' : 'a hundred'}.` });
        if (!feed(list, list.orig) || !document.body.innerText.trim()) wrecked = true;
        await settle(); if (!list.box.isConnected && !document.querySelector(`[data-plumb-source^="${CSS.escape(list.at)}"]`)) wrecked = true;
        break;
      }
      if (toy !== 'lists') break;
      if (innerWidth === wide) {
        const add = (n) => found.push({ live: true, list, size, ...n, title: `${size.as} ${label}, ${n.title}` });
        for (const b of measure(window, { all: true }).values()) {
          if (base.get(b.el)?.kind === b.kind || old(b, base)) continue;
          const said = say(b); add({ ...b, ...said, title: said.title.replace(/^[A-Z]/, (c) => c.toLowerCase()) });
        }
        const fresh = [...visibleWords()].filter((x) => !words.has(x));
        // passed in: the part decides what an empty list looks like. Its own state: the page owes the person a word
        if (size.id === 'none' && !fresh.length) add({ kind: 'blank', el: list.box, ...(list.how === 'prop'
          ? { title: `${list.noun === 'items' ? 'it' : list.name} leaves an empty space.`, why: `It can be handed an empty list, and then draws its frame with nothing in it. Leave the part out when there are no ${list.noun}, or have it say so.` }
          : { title: 'the space goes blank and nothing says why.', why: `With nothing to show, the page should say there are no ${list.noun} yet, and how to add one. Today they just vanish.` }) });
        if (size.id === 'one') {
          refresh(list);
          const solo = list.items.length === 1 ? list.items[0] : null, r = solo?.getBoundingClientRect();
          if (r && r.width > one.width * 1.8 && r.width - one.width > 160) add({ kind: 'stretch', el: solo, title: `the one left stretches to ${Math.round(r.width)}px wide.`, why: `Each one was ${Math.round(one.width)}px; alone it fills the row and reads as a different thing. Keep its width when it is on its own.` });
          const plural = fresh.find((x) => /(^|\s)1\s+\p{L}+s\b/u.test(x));
          if (plural) add({ kind: 'plural', el: list.box, title: `the page says “${plural.slice(0, 30)}”.`, why: 'One of something is singular. Pick the word by the count.' });
        }
        if (size.id === 'many') {
          refresh(list);
          const now = list.box.isConnected ? list.box.getBoundingClientRect() : area;
          if (took > 200) add({ kind: 'slow', el: list.box, title: `the page takes ${Math.round(took)}ms to draw them.`, why: 'The screen freezes while a hundred are drawn. Draw only what is on screen (a virtual list), or draw them a page at a time.' });
          // a hundred items and no way to reach most of them: a box that clips its list and cannot scroll
          for (let a = list.box; a && a !== document.body; a = a.parentElement) {
            const cs = cssOf(a);
            if (/hidden|clip/.test(cs.overflowY) && a.scrollHeight > a.clientHeight + 40 || /hidden|clip/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 40) {
              add({ kind: 'hidden', el: a, title: `most of them are hidden, with no way to scroll to them.`, why: `The box is ${Math.round(a.clientWidth)}×${Math.round(a.clientHeight)}px and hides the rest. Let it scroll, or show how many more there are.` });
              break;
            }
          }
          void now;
        }
      }
      feed(list, list.orig); await settle();
    }
  }
  listing = false;
  // one note per break and list and size: the same break said once
  const keyed = new Map();
  for (const n of found) { const k = `${n.kind}|${n.list.source}|${n.size.id}|${n.kind === 'sideways' ? '' : sourceOf(n.el) ?? ''}`; if (!keyed.has(k)) keyed.set(k, n); }
  notes = [...keyed.values()].map((n) => ({ ...n, title: cap(n.title), source: n.at ?? n.list.source })); index = 0;
  if (notes.length) showSized(0); else paint();
}
// put the note's size back on its list, so the break is on screen; the list's own items come back after
async function showSized(i) {
  unsize(); index = i; const n = notes[i];
  if (n && (n.kind === 'crash' || wrecked)) { paint(); return; }   // never crash the page again to show it
  if (n) {
    sized = n.list; feed(n.list, n.size.make(n.list.orig)); await settle(); refresh(n.list);
    // React drew new elements for this size: point the note at the ones now on screen
    if (!n.el?.isConnected) {
      if (n.kind === 'stretch') n.el = n.list.items[0];
      else if (['blank', 'plural', 'slow', 'hidden'].includes(n.kind)) n.el = n.list.box;
      else { const again = [...measure(window, { all: true }).values()].find((b) => b.kind === n.kind && (n.kind === 'sideways' || sourceOf(b.el) === sourceOf(n.el))); if (again) Object.assign(n, { el: again.el, other: again.other, box: again.box, cause: again.cause }); }
    }
    if (n.el?.isConnected) scrollToNote(n.el);
  }
  paint();
}
function unsize() { if (sized) { feed(sized, sized.orig); sized = null; } }

// ── the toys ────────────────────────────────────────────────

let toy = null;
export function setToy(next) {
  if (next === toy) next = null;
  if (toy === 'longer') { on = false; shrink(); }
  if (toy === 'narrower') unstage();
  if (toy === 'bigger') unbig();
  if (toy === 'extreme') { unswap(); probing = false; }
  if (toy === 'action') disarm();
  if (toy === 'typing') { unshow(); typing = false; }
  if (toy === 'lists') { unsize(); listing = false; unlistenCrash(); if (wrecked) { wrecked = false; location.reload(); } }
  toy = next; notes = []; index = 0;
  if (toy === 'longer') { on = true; grow(); }
  if (toy === 'narrower') narrower();
  if (toy === 'bigger') bigger();
  if (toy === 'extreme') extreme();
  if (toy === 'action') arm();
  if (toy === 'typing') typeAll();
  if (toy === 'lists') sizeAll();
  paint();
}
export const setLonger = (yes) => setToy(yes ? 'longer' : null);

// ── drawing ─────────────────────────────────────────────────

function rectOf(n) {
  if (!n.live) return n.rect;
  if (n.kind === 'sideways') { if (!n.cause) return null; const r = n.cause.getBoundingClientRect(); const off = stage ? stage.frame.getBoundingClientRect() : { left: 0, top: 0 }; return { left: r.left + off.left, top: r.top + off.top, width: r.width, height: r.height }; }
  const r = ['nothing', 'silent', 'stuck', 'still', 'twice', 'spinning', 'grows', 'clipped', 'under', 'emptied', 'blank', 'stretch', 'plural', 'slow', 'hidden', 'crash'].includes(n.kind) ? n.el.getBoundingClientRect() : n.kind === 'cut' || n.kind === 'collapse' ? n.box.getBoundingClientRect() : n.kind === 'overlap' ? (() => { const a = wordsRect(n.el), b = wordsRect(n.other); return a && b ? union(a, b) : a ?? b; })() : wordsRect(n.el);
  if (!r) return null;
  const off = stage ? stage.frame.getBoundingClientRect() : { left: 0, top: 0 };
  return { left: r.left + off.left, top: r.top + off.top, width: r.width, height: r.height };
}

function marks() {
  // narrower: only the break in hand, at its own width; the others are not broken at this width yet
  return notes.map((n, i) => {
    if ((toy === 'narrower' || toy === 'lists') && i !== index) return '';   // lists: the other notes are other sizes, not on screen
    // one cause in many places: the one in hand rings every place, the others are not drawn
    if (n.els) return i !== index ? '' : n.els.map((el) => ring(wordsRect(el), false)).join('');
    const r = rectOf(n);
    if (!r || r.width <= 0) return '';
    const x = r.left - 3, y = r.top - 3, w = r.width + 6, h = r.height + 6;
    // the one in hand: a hatched band round the box, never over the words in it
    const B = 6, band = `M${x - B} ${y - B}h${w + 2 * B}v${h + 2 * B}h${-(w + 2 * B)}z M${x} ${y}v${h}h${w}v${-h}z`;
    const fill = i === index ? `<path class="hand" fill-rule="evenodd" d="${band}"/>` : '';
    return `<g class="mark">${fill}<rect class="halo" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><rect class="ring" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"${i === index ? '' : ' opacity=".55"'}/></g>`;
  }).join('');
}

function ring(r, hand) {
  if (!r || r.width <= 0 || r.bottom < 0 || r.top > innerHeight) return '';
  const x = r.left - 3, y = r.top - 3, w = r.width + 6, h = r.height + 6, B = 6;
  const band = `M${x - B} ${y - B}h${w + 2 * B}v${h + 2 * B}h${-(w + 2 * B)}z M${x} ${y}v${h}h${w}v${-h}z`;
  return `<g class="mark">${hand ? `<path class="hand" fill-rule="evenodd" d="${band}"/>` : ''}<rect class="halo" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><rect class="ring" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/></g>`;
}
const count = (n, one, many) => (n === 1 ? `one ${one}` : `${n} ${many}`);
function verdict() {
  if (!toy) return 'Pick a toy to break this screen on purpose. Your page stays usable.';
  if (toy === 'narrower') {
    if (!stage || stage.sweeping) return `Squeezing a copy of this page from ${stage?.from ?? innerWidth}px down to ${NARROWEST}px…`;
    if (!notes.length) return `From ${stage.from}px down to ${NARROWEST}px, nothing breaks.`;
    return `From ${stage.from}px down to ${NARROWEST}px, ${count(notes.length, 'thing breaks', 'things break')}. The first at ${notes[0].width}px.`;
  }
  if (toy === 'typing') {
    if (typing) return `Typing a long line, a pasted link, pasted lines and nothing into each field… (field ${typedIn})`;
    if (!typedIn) return 'There is no field on this page to type into.';
    return `Typed four kinds of value into ${count(typedIn, 'field', 'fields')}: ${notes.length ? count(notes.length, 'thing breaks', 'things break') : 'nothing breaks'}. Each field is back as it was.`;
  }
  if (toy === 'lists') {
    const missed = unreached ? ` ${count(unreached, 'list is', 'lists are')} drawn from words written into the part itself, left alone.` : '';
    if (!renderer()) return 'This page’s React does not let plumber hand a list other items (a production build). Try it on the dev server.';
    if (listing) return `Giving each list no items, one, and a hundred… (list ${listed} of ${sizedLists.length})`;
    if (wrecked) return `The page crashed and React took it down, so plumber stopped there. Turning Lists off reloads the page.`;
    if (!sizedLists.length) return `No list on this page is fed from data or passed in.${missed}`;
    return `Gave ${count(sizedLists.length, 'list', 'lists')} no items, one and a hundred: ${notes.length ? count(notes.length, 'thing breaks', 'things break') : 'nothing breaks'}. Each is back as it was.${missed}`;
  }
  if (toy === 'action') {
    const what = mode === 'fail' ? 'its request will fail with a server error' : `its request will take ${SLOW_MS / 1000} seconds`;
    if (!act || act.phase === 'armed') return `Press the button you want to test: ${what}. Your page stays usable.`;
    if (act.phase === 'watching') return mode === 'fail' ? `“${act.label}” was pressed and its request failed. Watching what a person would see…` : `“${act.label}” was pressed; its request is held for ${SLOW_MS / 1000} seconds. Watching…`;
    const good = mode === 'fail'
      ? [act.said && `it said “${act.said.slice(0, 40)}”`, !notes.some((n) => n.kind === 'stuck') && act.sent.length && 'the button came back'].filter(Boolean)
      : act.sent.length ? [!notes.some((n) => n.kind === 'still') && 'it showed it was working', !notes.some((n) => n.kind === 'twice') && 'it could not be pressed twice'].filter(Boolean) : [];
    return notes.length ? `${count(notes.length, 'thing a person would trip on', 'things a person would trip on')}${good.length ? ` (${good.join(', and ')})` : ''}. Press it again to test once more.`
      : `It handled it${good.length ? `: ${good.join(', and ')}` : ''}. Press it again to test once more.`;
  }
  if (toy === 'extreme') {
    if (sorting) return 'Finding the words that can change: the ones passed into reusable parts, and the ones from data…';
    const where = tally ? `${tally.prop + tally.list + tally.data} places that can change` : 'the places that can change';
    if (probing) return `Trying no words, one letter, 60 letters, one unbroken word and a nine-digit number in ${where}… (${tried} of ${KINDS.length})`;
    return `Tried five kinds of content in ${where}: ${notes.length ? count(notes.length, 'thing breaks', 'things break') : 'nothing breaks'}.`;
  }
  if (toy === 'bigger') {
    const lay = notes.filter((n) => n.kind !== 'locked').length;
    const stuck = locked.reduce((t, g) => t + g.count, 0);
    return `Text at 200%: ${count(lay, 'thing breaks', 'things break')}, and ${count(stuck, 'run of words stays', 'runs of words stay')} the same size, from ${count(locked.length, 'cause', 'causes')}.`;
  }
  if (sorting) return 'Finding the words that can change: the ones passed into reusable parts, and the ones from data…';
  const of = tally ? `${tally.prop + tally.list + tally.data} runs of words can change (${tally.list} in repeated parts, ${tally.prop} passed into reusable parts, ${tally.data} from data); ${tally.fixed} are fixed copy, left alone. ` : '';
  if (growing) return of + 'Growing them to twice their length…';
  if (!notes.length) return of + 'At twice the length, nothing breaks.';
  return of + `At twice the length, ${count(notes.length, 'thing breaks', 'things break')}.`;
}

const TOYS = [
  ['longer', 'Longer words', LONGER],
  ['narrower', 'Narrower', '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8h4M14.5 8h-4"/><path d="M3.5 5.5 6 8l-2.5 2.5M12.5 5.5 10 8l2.5 2.5"/><path d="M8 3v10" opacity=".6"/></svg>'],
  ['extreme', 'Extreme content', '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="5" width="3" height="6" rx="1" opacity=".6"/><rect x="6" y="5" width="8.5" height="6" rx="1"/><path d="M8 8h4.5"/></svg>'],
  ['typing', 'Typing', '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="4" width="13" height="8" rx="2"/><path d="M4.5 8h4"/><path d="M10.5 6v4" opacity=".7"/></svg>'],
  ['lists', 'Lists', '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 4h8M5.5 8h8M5.5 12h8"/><path d="M2.5 4h0M2.5 8h0M2.5 12h0" stroke-width="2.2"/></svg>'],
  ['action', 'Action fails', '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="4" width="13" height="8" rx="2.5"/><path d="M6.5 6.5l3 3M9.5 6.5l-3 3"/></svg>'],
  ['bigger', 'Bigger text', '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12.5l2-5 2 5M2.3 10.8h2.4"/><path d="M7.5 13.5l3-10 3 10M8.7 10h3.6"/></svg>'],
];

function skeleton() {
  host.shadowRoot.innerHTML = `<style>${tokensCss}${CSS_TEXT}</style><div class="stage"></div>
    <svg class="page"><defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="hatch" x1="0" y1="0" x2="0" y2="6"/></pattern></defs><g class="marks"></g></svg>
    <div class="bar" role="region" aria-label="Break it" aria-live="polite"></div>`;
  host.shadowRoot.querySelector('.bar').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mode) setMode(b.dataset.mode); else if (b.dataset.toy) setToy(b.dataset.toy); else if (b.classList.contains('prev')) go(-1); else if (b.classList.contains('next')) go(1);
  });
}

function paint() {
  frame = 0;
  if (!host) return;
  if (toy === 'longer' && on && !growing && !sorting && tally || toy === 'bigger') {
    const keep = notes[index]?.el;
    notes = [...judge(), ...(toy === 'bigger' ? locked.map((n) => ({ ...n, ...say(n), source: sourceOf(n.el) })) : [])];
    const again = keep ? notes.findIndex((n) => n.el === keep) : -1;
    index = again >= 0 ? again : Math.min(index, Math.max(0, notes.length - 1));
  }
  const busy = growing || sorting || stage?.sweeping || probing || typing || listing || act?.phase === 'watching';
  const n = toy && !busy ? notes[index] : null;
  const step = notes.length > 1 && n ? `<span class="step"><button class="prev" aria-label="Previous break" ${index ? '' : 'disabled'}>‹</button>${index + 1} of ${notes.length}<button class="next" aria-label="Next break" ${index < notes.length - 1 ? '' : 'disabled'}>›</button></span>` : '<span></span>';
  const note = n ? `<div class="note"><div class="say"><p class="title">${esc(n.title)}</p><p class="why">${esc(n.why)}${n.source ? ` <span class="src">${esc(n.source)}</span>` : ''}</p></div>${step}</div>` : '';
  const root = host.shadowRoot;
  root.querySelector('.marks').innerHTML = toy && !busy ? marks() : '';
  root.querySelector('.bar').innerHTML = `<div class="toys">${TOYS.map(([id, label, face]) => `<button class="toy" data-toy="${id}" aria-pressed="${toy === id}"><span class="face">${face}</span>${label}</button>`).join('')}</div>
      ${toy === 'action' ? `<div class="modes" role="group" aria-label="How it goes wrong">${[['fail', 'Fails'], ['slow', 'Slow']].map(([id, l]) => `<button data-mode="${id}" aria-pressed="${mode === id}">${l}</button>`).join('')}</div>` : ''}
      <p class="verdict">${esc(verdict())}</p>${note}`;
}
const later = () => { if (host && !frame) frame = requestAnimationFrame(paint); };

function go(dir) {
  const to = Math.max(0, Math.min(notes.length - 1, index + dir));
  if (to === index) return;
  if (toy === 'narrower') { showAt(to); return; }
  if (toy === 'extreme') { showVariant(to); return; }
  if (toy === 'typing') { showTyped(to); return; }
  if (toy === 'lists') { showSized(to); return; }
  index = to;
  const r = rectOf(notes[index]);
  if (r && (r.top < 0 || r.top + r.height > innerHeight - 160)) notes[index].el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  paint();
}

export function showBreakIt() {
  if (host) return;
  host = document.createElement('div');
  host.setAttribute('data-plumb-layer', 'break-it');
  host.attachShadow({ mode: 'open' });
  ground = [document.body, document.documentElement].map((e) => /rgba?\(([^)]+)\)/.exec(getComputedStyle(e).backgroundColor)?.[1].split(/[,/]/).map(parseFloat)).find((c) => c && (c[3] ?? 1) > 0.5) ?? [255, 255, 255];
  host.setAttribute('data-scheme', 0.2126 * ground[0] + 0.7152 * ground[1] + 0.0722 * ground[2] < 128 ? 'dark' : 'light');
  host.setAttribute('data-arrive', '');
  setTimeout(() => host?.removeAttribute('data-arrive'), 600);
  document.documentElement.append(host);
  skeleton();
  addEventListener('scroll', later, { capture: true, passive: true });
  addEventListener('resize', later, { passive: true });
  paint();
}
export function hideBreakIt() {
  if (!host) return;
  setToy(null);
  removeEventListener('scroll', later, { capture: true });
  removeEventListener('resize', later);
  cancelAnimationFrame(frame); frame = 0;
  host.remove(); host = null;
}
export const toggleBreakIt = () => (host ? hideBreakIt() : showBreakIt());
export const readBreaks = () => notes.map(({ kind, title, why, source }) => ({ kind, title, why, source }));

addEventListener('keydown', (event) => {
  const at = event.composedPath()[0];
  if (at?.isContentEditable || at?.matches?.('input, textarea, select')) return;
  if (event.altKey && event.code === 'KeyS' && !event.repeat && !event.metaKey && !event.ctrlKey) { event.preventDefault(); event.stopPropagation(); toggleBreakIt(); return; }
  if (!host || event.altKey || event.metaKey || event.ctrlKey) return;
  const k = { ArrowLeft: () => go(-1), ArrowRight: () => go(1), Escape: hideBreakIt }[event.key];
  if (k) { event.preventDefault(); event.stopPropagation(); k(); }
}, true);
/** Where each run of words on the page comes from, as sorted for Longer words. */
export const readKinds = () => [...kinds].filter(([n]) => n.isConnected).map(([n, kind]) => ({ words: (held.get(n)?.orig ?? n.data).trim().slice(0, 40), kind }));
/** Put one kind of extreme content into every place that can change (or none, to put the words back). */
export const tryContent = (id) => { const k = KINDS.find((x) => x.id === id); if (k) swapTo(k); else unswap(); };
/** The page's lists plumber can hand other items: the part that holds each, and where its array comes from. */
export const readLists = () => (renderer() ? findLists() : []).map((l) => ({ part: l.name, how: l.how, key: l.key, items: l.orig.length, source: l.source }));
