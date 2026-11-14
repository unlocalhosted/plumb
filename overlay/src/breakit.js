/* ─────────────────────────────────────────────────────────
 * BREAK IT · React Plumber overlay (layer 1: longer words)
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
 *  breaks   only what broke because of the toggle (each check runs before and after; what was already broken is
 *           not this toggle's news):
 *             cut      the words no longer fit a box that hides what overflows (an ellipsis, a clipped line, a clamp)
 *             spill    the words run past the edge of the box drawn around them, or off the screen
 *             overlap  the words now run into other words
 *             sideways the whole page now scrolls sideways
 *  draw     a coral ring round each break; the one in hand is filled with a coral hatch. One note at a time in the bar
 *  off      every word goes back exactly as it was, unless the app has changed it since (then the app's is kept)
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

const inView = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
const hides = (cs, axis) => /hidden|clip|auto|scroll/.test(axis === 'x' ? cs.overflowX : cs.overflowY);
const drawn = (cs) => { const bg = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor); const a = bg ? (bg[1].split(/[,/]/)[3] ?? 1) : 0; return parseFloat(a) > 0.05 || parseFloat(cs.borderLeftWidth) > 0 || cs.boxShadow !== 'none' || cs.backgroundImage !== 'none'; };

function wordsRect(el) {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const n of el.childNodes) {
    if (n.nodeType !== 3 || !n.data.trim()) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    for (const q of range.getClientRects()) { if (!q.width) continue; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); }
  }
  return r > l ? { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t } : null;
}

/** Every text-holding element in view, and what is wrong with it now: Map(el → { kind, box, ... }). */
function measure() {
  const found = new Map(), boxes = [];
  const els = new Set();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (eligible(n)) els.add(n.parentElement);
  for (const el of els) {
    const w = wordsRect(el);
    if (!w || !inView(w)) continue;
    boxes.push({ el, w });
    // cut: this element or a close ancestor hides what overflows, and the words need more room than it has
    // (and its own words are what goes past the box's edge, so a wide section clipping something else says nothing)
    let cut = null;
    for (let a = el, i = 0; a && a !== document.body && i < 4 && !cut; a = a.parentElement, i++) {
      const cs = getComputedStyle(a), r = a.getBoundingClientRect();
      const fixed = (o) => o !== 'auto' && o !== 'scroll';
      if (hides(cs, 'x') && fixed(cs.overflowX) && a.scrollWidth > a.clientWidth + 1 && (w.right > r.right + 1 || w.left < r.left - 1 || cs.textOverflow === 'ellipsis' && a === el)) cut = { box: a, need: a.scrollWidth, have: a.clientWidth, axis: 'x' };
      else if (hides(cs, 'y') && fixed(cs.overflowY) && a.scrollHeight > a.clientHeight + 2 && w.bottom > r.bottom + 1) cut = { box: a, need: a.scrollHeight, have: a.clientHeight, axis: 'y' };
    }
    if (cut && (cut.box.clientWidth < 4 || cut.box.clientHeight < 4)) continue;   // hidden on purpose: words for screen readers only
    if (cut) { found.set(el, { kind: 'cut', el, ...cut, rect: cut.box.getBoundingClientRect() }); continue; }
    // spill: the words cross the edge of the nearest box drawn around them, or the screen's
    if ((w.right > innerWidth + 1 || w.left < -1) && !inScroller(el)) { found.set(el, { kind: 'spill', el, rect: w, edge: 'screen', by: Math.round(Math.max(w.right - innerWidth, -w.left)) }); continue; }
    for (let a = el, i = 0; a && a !== document.body && i < 6; a = a.parentElement, i++) {
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
    const A = boxes[i]; if (found.has(A.el)) continue;
    for (let j = i + 1; j < boxes.length && boxes[j].w.top < A.w.bottom; j++) {
      const B = boxes[j]; if (A.el.contains(B.el) || B.el.contains(A.el) || pinnedOf(A.el) !== pinnedOf(B.el)) continue;   // a sticky bar over scrolled content is not words running into words
      const x = Math.min(A.w.right, B.w.right) - Math.max(A.w.left, B.w.left), y = Math.min(A.w.bottom, B.w.bottom) - Math.max(A.w.top, B.w.top);
      if (x > 2 && y > 2) { found.set(A.el, { kind: 'overlap', el: A.el, other: B.el, rect: union(A.w, B.w) }); break; }
    }
  }
  const page = document.scrollingElement;
  if (page.scrollWidth > innerWidth + 1) found.set(document.documentElement, { kind: 'sideways', el: document.documentElement, by: page.scrollWidth - innerWidth, rect: null });
  return found;
}
// a row that scrolls sideways (a carousel) is meant to run past the screen
const inScroller = (el) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) if (/hidden|clip|auto|scroll/.test(getComputedStyle(a).overflowX)) return true; return false; };
const pinnedOf = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) if (/fixed|sticky/.test(getComputedStyle(a).position)) return a; return null; };
const union = (a, b) => { const l = Math.min(a.left, b.left), t = Math.min(a.top, b.top), r = Math.max(a.right, b.right), bo = Math.max(a.bottom, b.bottom); return { left: l, top: t, right: r, bottom: bo, width: r - l, height: bo - t }; };

const nameOf = (el) => { const rec = [...el.childNodes].map((n) => held.get(n)).find(Boolean); const s = (rec ? rec.orig : el.textContent ?? '').trim().replace(/\s+/g, ' '); return s.length > 26 ? s.slice(0, 25) + '…' : s; };
const sourceOf = (el) => { const s = el.closest?.('[data-plumb-source]')?.getAttribute('data-plumb-source')?.split('#')[0]; if (!s) return null; const m = /([^/]+?):(\d+)(?::\d+)?$/.exec(s); return m ? `${m[1]}:${m[2]}` : s; };

function say(b) {
  const name = `“${nameOf(b.el)}”`;
  if (b.kind === 'cut') return { title: `${name} gets cut off.`, why: `Its box ${b.axis === 'x' ? 'is' : 'is'} ${Math.round(b.have)}px ${b.axis === 'x' ? 'wide' : 'tall'} and hides the rest; the longer words need ${Math.round(b.need)}px.` };
  if (b.kind === 'spill') return { title: `${name} runs out of its box.`, why: b.edge === 'screen' ? `It runs ${b.by}px off the screen.` : `It crosses the box's edge by ${b.by}px.` };
  if (b.kind === 'overlap') return { title: `${name} runs into “${nameOf(b.other)}”.`, why: 'The two sets of words now sit on top of each other.' };
  return { title: 'The whole page now scrolls sideways.', why: `Something is ${Math.round(b.by)}px wider than the screen.` };
}

function judge() {
  const now = measure();
  const fresh = [...now.values()].filter((b) => !before?.has(b.el) || before.get(b.el).kind !== b.kind);
  const order = { sideways: 0, cut: 1, overlap: 2, spill: 3 };
  return fresh.sort((a, b) => order[a.kind] - order[b.kind] || (a.rect?.top ?? 0) - (b.rect?.top ?? 0)).map((b) => ({ ...b, ...say(b), source: sourceOf(b.el) }));
}

// ── drawing ─────────────────────────────────────────────────

const CSS_TEXT = `
:host { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; display: block; }
svg.page { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.ring { fill: none; stroke: var(--pl-off); stroke-width: 1.5; }
.halo { fill: none; stroke: var(--pl-halo); stroke-width: 3.5; }
.hand { fill: url(#hatch); }
.hatch { stroke: var(--pl-off); stroke-width: 1.5; opacity: .55; }
.mark { animation: pop 240ms var(--pl-spring-pop) both; transform-box: fill-box; transform-origin: center; }

.bar { position: absolute; left: 50%; bottom: 16px; translate: -50% 0; width: min(560px, calc(100vw - 32px)); box-sizing: border-box;
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

function marks() {
  return notes.map((n, i) => {
    if (!n.rect) return '';
    const r = n.rect, x = r.left - 3, y = r.top - 3, w = r.width + 6, h = r.height + 6;
    // the one in hand: a hatched band round the box, never over the words in it
    const B = 6, band = `M${x - B} ${y - B}h${w + 2 * B}v${h + 2 * B}h${-(w + 2 * B)}z M${x} ${y}v${h}h${w}v${-h}z`;
    const fill = i === index ? `<path class="hand" fill-rule="evenodd" d="${band}"/>` : '';
    return `<g class="mark">${fill}<rect class="halo" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><rect class="ring" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"${i === index ? '' : ' opacity=".55"'}/></g>`;
  }).join('');
}

function verdict() {
  if (!on) return 'Turn a toy on to break this screen on purpose. Your page stays usable.';
  if (sorting) return 'Finding the words that can change: the ones passed into reusable parts, and the ones from data…';
  const of = tally ? `${tally.prop + tally.list + tally.data} runs of words can change (${tally.list} in repeated parts, ${tally.prop} passed into reusable parts, ${tally.data} from data); ${tally.fixed} are fixed copy, left alone. ` : '';
  if (growing) return of + 'Growing them to twice their length…';
  if (!notes.length) return of + 'At twice the length, nothing breaks.';
  return of + `At twice the length, ${notes.length === 1 ? 'one thing breaks' : `${notes.length} things break`}.`;
}

function paint() {
  frame = 0;
  if (!host) return;
  if (on && !growing && !sorting && tally) {
    const keep = notes[index]?.el;
    notes = judge();
    const again = keep ? notes.findIndex((n) => n.el === keep) : -1;
    index = again >= 0 ? again : Math.min(index, Math.max(0, notes.length - 1));
  }
  const n = on && !growing && !sorting ? notes[index] : null;
  const step = notes.length > 1 && n ? `<span class="step"><button class="prev" aria-label="Previous break" ${index ? '' : 'disabled'}>‹</button>${index + 1} of ${notes.length}<button class="next" aria-label="Next break" ${index < notes.length - 1 ? '' : 'disabled'}>›</button></span>` : '<span></span>';
  const note = n ? `<div class="note"><div class="say"><p class="title">${esc(n.title)}</p><p class="why">${esc(n.why)}${n.source ? ` <span class="src">${esc(n.source)}</span>` : ''}</p></div>${step}</div>` : '';
  host.shadowRoot.innerHTML = `<style>${tokensCss}${CSS_TEXT}</style>
    <svg class="page"><defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="hatch" x1="0" y1="0" x2="0" y2="6"/></pattern></defs>${on && !growing && !sorting ? marks() : ''}</svg>
    <div class="bar" role="region" aria-label="Break it" aria-live="polite">
      <div class="toys"><button class="toy" data-toy="longer" aria-pressed="${on}"><span class="face">${LONGER}</span>Longer words</button><span class="grow"></span></div>
      <p class="verdict">${esc(verdict())}</p>${note}</div>`;
  const root = host.shadowRoot;
  root.querySelector('[data-toy="longer"]').addEventListener('click', () => setLonger(!on));
  root.querySelector('.prev')?.addEventListener('click', () => go(-1));
  root.querySelector('.next')?.addEventListener('click', () => go(1));
}
const later = () => { if (host && !frame) frame = requestAnimationFrame(paint); };

function go(dir) {
  const to = Math.max(0, Math.min(notes.length - 1, index + dir));
  if (to === index) return;
  index = to;
  const r = notes[index].rect;
  if (r && (r.top < 0 || r.bottom > innerHeight - 160)) notes[index].el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  paint();
}

export function setLonger(next) {
  if (next === on) return;
  on = next;
  if (on) grow(); else shrink();
  paint();
}

export function showBreakIt() {
  if (host) return;
  host = document.createElement('div');
  host.setAttribute('data-plumb-layer', 'break-it');
  host.attachShadow({ mode: 'open' });
  const ground = [document.body, document.documentElement].map((e) => /rgba?\(([^)]+)\)/.exec(getComputedStyle(e).backgroundColor)?.[1].split(/[,/]/).map(parseFloat)).find((c) => c && (c[3] ?? 1) > 0.5) ?? [255, 255, 255];
  host.setAttribute('data-scheme', 0.2126 * ground[0] + 0.7152 * ground[1] + 0.0722 * ground[2] < 128 ? 'dark' : 'light');
  host.setAttribute('data-arrive', '');
  setTimeout(() => host?.removeAttribute('data-arrive'), 600);
  document.documentElement.append(host);
  addEventListener('scroll', later, { capture: true, passive: true });
  addEventListener('resize', later, { passive: true });
  setLonger(true);
  paint();
}
export function hideBreakIt() {
  if (!host) return;
  setLonger(false);
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
