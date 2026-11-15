/* ─────────────────────────────────────────────────────────
 * ROAST · React Plumber overlay
 *
 * Sitting beside a principal designer while they look at your screen (Karri Saarinen on a vibe-coded app,
 * 2026-11-08: "my eyes are bleeding though … send this to your agent to fix"; docs/research/alignment-discourse.md).
 * They give one verdict, then point at one thing at a time, worst first, and say what is wrong, why, and what to
 * change. A line is drawn only when it proves the point in hand. Owner, 2026-11-15: "i dont want to draw the lines
 * without actionable outcome and judgement".
 *
 *  note     one per row that is off its line (guides.js judge: the line its neighbours share). A row's label and its
 *           icon off together are one note, said by the label
 *  agree    the same judgement for everything else a critic names: siblings (the rows of one menu, the buttons of
 *           one toolbar) should agree. Per property, against the value most of them share (60% or more): where an
 *           icon sits beside its label (1px and up), a boxed sibling's height (2px and up), its corners (square,
 *           a radius, fully rounded), heights and corners only for controls and one-line boxed items (a list
 *           row with more to say is taller for a reason). Only things built alike (the same children, in order) are
 *           siblings. Line notes are about content, never a box's edge: a fill may bleed past the line on purpose
 *           (craft rule #1, align content, not boxes); centred words have no edge to judge. A thing a script or an
 *           animation is moving is never judged. Cousins too: the things at the same place in rows built alike (the
 *           avatar in each member row) are judged as one set and said with their row.
 *           The odd one is the note, ringed, its siblings ticked
 *  cause    the class that makes the difference: the row and its first two levels of children, place by place,
 *           against the same places in the neighbour rows on the line. A horizontal property (gap, size, padding,
 *           margin, width, nudge) whose value differs from the one most neighbours use is the cause, and the fix is
 *           the neighbours' value. No such class: said plainly, no button
 *  say      the verdict, then the note: "Views sits 5px right of the other labels." / "Its gap is gap-[13px]; the
 *           others use gap-2." / the file and line. The button says what it writes: "Use gap-2"
 *  draw     only the note's line, from its first row to its last, 3px out in the gutter beside the edge it marks
 *           and broken wherever it would still pass words or an icon, so it never touches a letter; a pin and a bob, the plumb line of the glyph set. The row off it gets a coral ring and a
 *           dimension mark above and below, from its edge to the line
 *  fix      the button writes the swap where the class is written (locate.js classEditsOf, POST swaps); the page
 *           hot-updates, the note leaves, the next one comes up. Refused: the reason, in coral, in its place
 *  invite   at rest, when the screen has notes, a pill beside plumber's dock (the bob, "3 notes on this screen", ⌥G)
 *           opens them; it is the only thing shown uninvited (see "the invitation" below)
 *  keys     ← → between notes, Enter fixes the one in hand, Esc closes. Alt+G opens and closes. The bar shows them
 *           as keycaps; plumber's at-rest hint and its keyboard help name Alt+G
 *  proof    every note draws the lines the good siblings share, run across all of them and a little past (the top
 *           and bottom of a row of buttons, every chip's corners, the middle each icon sits on beside its label, the
 *           edge the labels start at), so you see the odd one break them; the break in coral (the part past the line,
 *           the corner that differs, the shaded gap), and its size in one pill, like a redline in a design review.
 *           Lines run in gutters and along edges, never over words
 *  motion   the bar pops in; the line drops from its pin and swings once; the marks pop after. Nothing loops.
 *           Under reduced motion it all appears at once
 * ───────────────────────────────────────────────────────── */
import { readGuides } from './guides.js';
import { classEditsOf } from './locate.js';
import { post } from './api.js';

const tokensCss = await (await fetch(new URL('./tokens.css', import.meta.url))).text();

// ── what to say ─────────────────────────────────────────────

const ACROSS = /^-?(gap-x|gap|size|w|min-w|max-w|px|pl|pr|ps|pe|p|ml|mr|ms|me|mx|m|translate-x|space-x|left|right|start|end|inset-x|indent)$/;
const DOWN = /^-?(translate-y|mt|mb|my|top|bottom|self|items|size|h|min-h|leading|py|pt|pb|align|place-self|inset-y)$/;
const TALL = /^(h|min-h|max-h|py|pt|pb|p|size|leading|text|border|border-y|border-t|border-b|ring)$/;
const CORNER = /^(rounded|rounded-t|rounded-b|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br)$/;
const BARE = new Set(['rounded', 'border', 'ring', 'shadow']);
const familyOf = (tok) => {
  if (tok.includes(':')) return null;
  if (BARE.has(tok)) return tok;
  const m = /^(-?[a-z-]+?)-(\[[^\]]+\]|[\d.]+(?:\/[\d.]+)?|px|full|auto|screen|fit|min|max|none|xs|sm|md|lg|xl|[2-9]xl|start|end|center|baseline|stretch)$/.exec(tok);
  return m ? m[1] : null;
};
const classes = (el) => (el?.getAttribute?.('class') ?? '').split(/\s+/).filter(Boolean);
const valueIn = (el, fam) => classes(el).find((c) => familyOf(c) === fam) ?? null;
const at = (root, path) => path.reduce((n, i) => n?.children[i] ?? null, root);
const WORD = { gap: 'gap', 'gap-x': 'gap', size: 'size', w: 'width', 'min-w': 'width', 'max-w': 'width', px: 'side padding', p: 'padding', pl: 'left padding', ps: 'left padding', pr: 'right padding', pe: 'right padding', ml: 'left margin', ms: 'left margin', mr: 'right margin', me: 'right margin', mx: 'side margin', m: 'margin', 'translate-x': 'nudge', 'space-x': 'spacing', indent: 'indent' };
Object.assign(WORD, { 'translate-y': 'nudge', mt: 'top margin', mb: 'bottom margin', my: 'margin', top: 'offset', self: 'alignment', items: 'alignment', h: 'height', 'min-h': 'height', leading: 'line height', py: 'top and bottom padding', pt: 'top padding', pb: 'bottom padding', text: 'text size', border: 'border', ring: 'ring', rounded: 'corners' });
const wordFor = (fam, el) => (fam === 'size' && el?.matches?.('svg, img') ? 'icon size' : /^rounded/.test(fam) ? 'corners' : WORD[fam.replace(/^-/, '')] ?? fam);

/** The class that sets this row apart from the rows on its line: { el, fam, from, to } or null. */
function causeOf(row, others, FAMS = ACROSS) {
  const paths = [[]];
  for (let i = 0; i < row.children.length; i++) { paths.push([i]); for (let j = 0; j < row.children[i].children.length; j++) paths.push([i, j]); }
  for (const p of paths) {
    const mine = at(row, p), theirs = others.map((r) => at(r, p)).filter(Boolean);
    if (!mine || theirs.length < Math.max(1, others.length / 2)) continue;
    const fams = new Set([...classes(mine), ...theirs.flatMap(classes)].map(familyOf).filter((f) => f && FAMS.test(f)));
    for (const fam of fams) {
      const from = valueIn(mine, fam), votes = new Map();
      for (const t of theirs) { const v = valueIn(t, fam); votes.set(v, (votes.get(v) ?? 0) + 1); }
      const [to, n] = [...votes].sort((a, b) => b[1] - a[1])[0];
      if (to !== from && n > theirs.length / 2) return { el: mine, fam, from, to };
    }
  }
  return null;
}

const regionOf = (el) => (el.closest('aside') ? 'sidebar' : el.closest('header') ? 'header' : el.closest('nav') ? 'menu' : el.closest('footer') ? 'footer' : el.closest('dialog, [role="dialog"]') ? 'dialog' : 'page');
const nameOf = (el) => {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
  const first = w.nextNode()?.data.trim().replace(/\s+/g, ' ');
  return (first && (first.length > 28 ? `${first.slice(0, 26).replace(/\s+\S*$/, '')}…` : first)) || el.getAttribute('aria-label') || 'This';
};
const TEXT_BLOCK = 'h1, h2, h3, h4, h5, h6, p, blockquote, figcaption, label, button, li > a, td, th';
const centred = (el) => [el, el.parentElement].some((e) => { const cs = e && getComputedStyle(e); return cs && (cs.textAlign === 'center' || (/grid/.test(cs.display) && cs.justifyItems === 'center') || (/flex/.test(cs.display) && !/column/.test(cs.flexDirection) && cs.justifyContent === 'center')); });
// a thing a script or an animation is moving (a draggable letter, a spring): where it is now is not where it was put
const moving = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { if (/transform|translate|rotate|scale/.test(e.getAttribute('style') ?? '') || e.getAnimations?.().some((a) => a.playState === 'running')) return true; } return false; };
// how a thing is built: its children's tags in order. Only things built alike are siblings to compare
const builtAs = (el) => [...el.children].map((c) => c.tagName).join(',');
const sourceOf = (el) => { const s = el.closest?.('[data-plumb-source]')?.getAttribute('data-plumb-source')?.split('#')[0]; if (!s) return null; const m = /([^/]+?):(\d+)(?::\d+)?$/.exec(s); return m ? `${m[1]}:${m[2]}` : s; };
const KIND = { words: 'labels', picture: 'icons', box: 'boxes' };

/** Every note on the screen, worst first. */
export function readNotes() {
  const { strays, all } = readGuides();
  const rows = new Map();
  for (const z of strays) {
    if (z.thing.kind === 'box') continue;   // align content, not boxes (craft rule #1): a fill may bleed past the line on purpose
    if (moving(z.thing.el)) continue;
    if (z.thing.kind === 'words' && centred(z.thing.el)) continue;   // centred words start where their width puts them
    const holders = z.guide.things.filter((o) => o.kind === z.thing.kind && o.el !== z.thing.el);
    if (!holders.length) continue;
    const near = [...holders].sort((a, b) => Math.abs(a.top - z.thing.top) - Math.abs(b.top - z.thing.top))[0];
    let row = z.thing.el;
    while (row.parentElement && !row.parentElement.contains(near.el)) row = row.parentElement;
    const group = row.parentElement;
    if (!group || group === document.body) continue;
    // the lines of one heading or paragraph share their edge by construction; at display sizes the first letters'
    // own shapes differ by a few px (a T against a b), which is type, not layout
    if (group.closest(TEXT_BLOCK)) continue;
    const others = [...new Set(holders.filter((o) => o.el !== group && group.contains(o.el)).map((o) => { let r = o.el; while (r && r.parentElement !== group) r = r.parentElement; return r; }))].filter((r) => r && r !== row && builtAs(r) === builtAs(row));
    if (!others.length) continue;
    const note = rows.get(row) ?? rows.set(row, { row, group, others, strays: [], guide: z.guide }).get(row);
    note.strays.push(z);
  }
  const notes = [...rows.values()].map((n) => {
    const lead = n.strays.find((z) => z.thing.kind === 'words') ?? n.strays[0];
    const d = Math.round(Math.abs(lead.by) * 10) / 10, dir = lead.by > 0 ? 'right' : 'left';
    const cause = causeOf(n.row, n.others);
    const name = nameOf(n.row);
    return {
      ...n, lead, d, cause, all,
      title: `${name} sits ${d}px ${dir} of the other ${KIND[lead.thing.kind] ?? 'things'}.`,
      why: cause
        ? `Its ${wordFor(cause.fam, cause.el)} is ${cause.from ?? 'not set'}; the others use ${cause.to ?? 'none'}.`
        : 'Nothing in its classes differs from the rows around it; something outside the row pushes it.',
      act: cause && cause.from ? (cause.to ? `Use ${cause.to}` : `Remove ${cause.from}`) : null,
      source: sourceOf(n.row),   // where the row is written: an icon's own file is not where its size was chosen
      region: regionOf(n.row), type: 'line', weight: d,
    };
  });
  const seen = new Set(notes.map((n) => n.row));
  for (const n of siblingNotes()) if (!seen.has(n.row)) { seen.add(n.row); notes.push({ ...n, all }); }
  return notes.sort((a, b) => b.weight - a.weight);
}

// ── siblings agree ──────────────────────────────────────────
// The rest of what a critic sees is one judgement too: things that are siblings (the rows of one menu, the buttons of
// one toolbar) should agree, and the one that disagrees with most of them is the note. Measured per property, against
// the value most of them share; the cause is the class that differs where the others agree, the fix their value.

const MIN_GROUP = 3;     // fewer than three cannot show what most of them do
const MOST = 0.6;        // the share of siblings that must agree before the odd one is wrong
const NOTICE = { icon: 1, height: 2 };   // px: below this nobody sees it (sub-pixel layout, a rounding)
const boxed = (el) => { const cs = getComputedStyle(el); return el.matches('button, [role="button"], input, select') || /^rgba?\([^)]*[1-9][^)]*\)$/.test(cs.backgroundColor) && !/, 0\)$/.test(cs.backgroundColor) || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none'; };
const NOUN = (el) => (el.matches('button, [role="button"]') ? 'buttons' : el.matches('li, a') ? 'rows' : el.matches('input, select, textarea') ? 'fields' : 'items');
const textBox = (el) => { const n = [...el.childNodes].find((c) => c.nodeType === 3 && c.data.trim()) ?? el.querySelector('*:not(svg):not(img)')?.firstChild; if (!n || n.nodeType !== 3) return null; const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); return b.height ? b : null; };
const iconOf = (el) => [...el.querySelectorAll('svg, img')].find((i) => !i.parentElement.closest('svg') && i.getBoundingClientRect().height > 0) ?? null;
const shapeOf = (el) => { const h = el.getBoundingClientRect().height, r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0; return r >= h / 2 - 0.5 ? 'round' : r < 0.5 ? 'square' : `${Math.round(r)}px`; };
const SHAPE = { round: 'fully rounded', square: 'square' };
const shapeWord = (v) => SHAPE[v] ?? `${v} rounded`;

function mode(values, near) {
  let best = null;
  for (const v of values) {
    const n = values.filter((w) => (near ? Math.abs(w - v) < near : w === v)).length;
    if (!best || n > best.n) best = { v, n };
  }
  return best;
}

function siblingGroups() {
  const groups = [];
  for (const parent of document.querySelectorAll('body *')) {
    if (parent.closest('[data-plumb-layer], plumb-overlay')) continue;
    const kids = [...parent.children].filter((k) => { const r = k.getBoundingClientRect(); return r.height > 0 && r.bottom > 0 && r.top < innerHeight; });
    const byKind = new Map();
    for (const k of kids) { const key = k.tagName + (k.matches('button, [role="button"]') ? ':button' : '') + '|' + builtAs(k); byKind.set(key, [...(byKind.get(key) ?? []), k]); }
    for (const g of byKind.values()) if (g.length >= MIN_GROUP) groups.push(g);
  }
  return groups;
}

function siblingNotes() {
  const out = [];
  for (const rows of siblingGroups()) {
    judgeSet(rows.filter((el) => !moving(el)), out, null);
    // cousins: the avatar in each member row, the tag in each issue row; judged as one set, said with their row
    const paths = [];
    for (let i = 0; i < rows[0].children.length; i++) { paths.push([i]); for (let j = 0; j < rows[0].children[i].children.length; j++) paths.push([i, j]); }
    for (const p of paths) {
      const set = rows.map((r) => at(r, p)).filter((el) => el && !moving(el));
      if (set.length === rows.length) judgeSet(set, out, (el) => rows.find((r) => r.contains(el)));
    }
  }
  return out;
}

function judgeSet(g, out, rowOf) {
  {
    if (g.length < MIN_GROUP) return;
    // the icon beside its label: where its middle sits against the words' middle
    const dy = g.map((el) => { const i = iconOf(el), t = textBox(el); if (!i || !t) return null; const b = i.getBoundingClientRect(); return (b.top + b.bottom) / 2 - (t.top + t.bottom) / 2; });
    const withIcon = dy.filter((v) => v !== null);
    if (withIcon.length >= MIN_GROUP) {
      const m = mode(withIcon, 0.5);
      if (m.n / withIcon.length >= MOST) g.forEach((el, i) => {
        const v = dy[i]; if (v === null || Math.abs(v - m.v) < NOTICE.icon) return;
        const d = Math.round(Math.abs(v - m.v) * 10) / 10, others = g.filter((o, j) => j !== i && dy[j] !== null && Math.abs(dy[j] - m.v) < 0.5);
        out.push(sibling(el, others, 'icon', d, `The ${nameOf(el)} icon sits ${d}px ${v > m.v ? 'lower' : 'higher'} than the other icons beside their labels.`, DOWN, { icon: iconOf(el), by: v - m.v }));
      });
    }
    // controls and boxed rows: the same height and the same corners
    const oneLine = (el) => { const t = textBox(el); return !!t && t.height < el.getBoundingClientRect().height && el.querySelectorAll('p, li, div > div').length === 0; };
    const boxes = g.filter((el) => el.matches('button, [role="button"], input, select, textarea') || (boxed(el) && oneLine(el)));
    if (boxes.length >= MIN_GROUP && boxes.length / g.length >= MOST) {
      const hs = boxes.map((el) => el.getBoundingClientRect().height), mh = mode(hs, 1);
      if (mh.n / boxes.length >= MOST) boxes.forEach((el, i) => {
        if (Math.abs(hs[i] - mh.v) < NOTICE.height) return;
        const d = Math.round(Math.abs(hs[i] - mh.v) * 10) / 10, others = boxes.filter((o, j) => Math.abs(hs[j] - mh.v) < 1);
        out.push(sibling(el, others, 'height', d, `${nameOf(el)} is ${d}px ${hs[i] > mh.v ? 'taller' : 'shorter'} than the other ${NOUN(el)}.`, TALL, { height: mh.v }));
      });
      const shapes = boxes.map(shapeOf), ms = mode(shapes);
      if (ms.n / boxes.length >= MOST) boxes.forEach((el, i) => {
        if (shapes[i] === ms.v) return;
        const others = boxes.filter((o, j) => shapes[j] === ms.v);
        out.push(sibling(el, others, 'corners', 6, `${nameOf(el)} has ${shapeWord(shapes[i])} corners; the other ${NOUN(el)} are ${shapeWord(ms.v)}.`, CORNER, { shape: ms.v }));
      });
    }
  }
  // said with its row, named by the row's own words (not the cousin's): "In Mei Tanaka's row, MT has …"
  if (rowOf) for (const n of out) if (!n.said && g.includes(n.row)) {
    n.said = true;
    const row = rowOf(n.row), w = document.createTreeWalker(row, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.data.trim() && !n.row.contains(t) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
    const who = w.nextNode()?.data.trim().replace(/\s+/g, ' ').slice(0, 28);
    n.title = `${who ? `In ${who}'s row, ` : ''}${n.title.replace(/^The /, 'the ')}`.replace(/the other (buttons|rows|items|fields)/, 'the others in its place');
  }
}

function sibling(el, others, type, weight, title, FAMS, extra = {}) {
  const cause = causeOf(el, others, FAMS);
  return {
    row: el, others, type, weight, d: weight, title, ...extra,
    cause,
    why: cause
      ? `Its ${wordFor(cause.fam, cause.el)} ${/s$/.test(wordFor(cause.fam, cause.el)) ? 'are' : 'is'} ${cause.from ?? 'not set'}; the others use ${cause.to ?? 'none'}.`
      : `Nothing in its classes differs from the ${NOUN(el)} beside it; what is inside it makes the difference.`,
    act: cause && cause.from ? (cause.to ? `Use ${cause.to}` : `Remove ${cause.from}`) : null,
    source: sourceOf(el), region: regionOf(el),
  };
}

function verdictOf(notes) {
  if (!notes.length) return 'Everything here hangs true. Nothing to roast.';
  const regions = new Set(notes.map((n) => n.region)), where = regions.size === 1 ? `your ${[...regions][0]}` : 'this screen';
  const kinds = new Set(notes.map((n) => (n.type === 'line' || n.type === 'icon' ? 'line' : 'shape')));
  const what = kinds.size > 1 ? "doesn't line up, and its pieces don't match" : kinds.has('line') ? "doesn't line up" : "has pieces that don't match";
  return notes.length === 1 ? `Close, but ${where} has one thing that breaks ranks.` : `Close, but ${where} ${what}: ${notes.length} things break ranks.`;
}

// ── drawing ─────────────────────────────────────────────────

const CSS_TEXT = `
:host { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; display: block; }
svg.page { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.halo { stroke: var(--pl-halo); fill: none; }
.str { stroke: var(--pl-instrument); fill: none; stroke-linecap: round; }
.pin { stroke: var(--pl-instrument); stroke-width: 1.5; }
.bob { fill: var(--pl-instrument); stroke: var(--pl-halo); stroke-width: 1; paint-order: stroke; }
.ring { fill: none; stroke: var(--pl-off); stroke-width: 1.5; }
.brk { stroke: var(--pl-off); fill: none; stroke-linecap: round; }
.gapfill { fill: color-mix(in oklab, var(--pl-off) 22%, transparent); }
.pill rect { fill: var(--pl-coral-soft); stroke: var(--pl-halo); stroke-width: 1; }
.pill text { fill: var(--pl-coral-ink); font: 600 11px var(--pl-mono); text-anchor: middle; font-variant-numeric: tabular-nums; }
.ghost { fill: none; stroke: var(--pl-instrument); stroke-width: 1.5; stroke-dasharray: 4 3; }
.dim { fill: none; stroke: var(--pl-off); stroke-width: 1.5; stroke-linecap: round; }
.g, .mark { transform-box: view-box; }

.bar { position: absolute; left: 50%; bottom: 16px; translate: -50% 0; width: min(560px, calc(100vw - 32px)); box-sizing: border-box;
  display: grid; grid-template-columns: 28px 1fr auto; gap: 12px; align-items: start; padding: 14px 14px 14px 12px;
  background: var(--pl-paper); color: var(--pl-ink); border-radius: var(--pl-radius-card); box-shadow: var(--pl-shadow-card);
  pointer-events: auto; font: var(--pl-card-body); }
.who { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--pl-sky-soft); color: var(--pl-sky-ink); }
.who svg { width: 18px; height: 18px; }
.who .str, .who .pin { stroke: currentColor; } .who .bob { fill: currentColor; stroke: none; }
.say { min-width: 0; display: grid; gap: 2px; }
.verdict { margin: 0; font: var(--pl-card-meta); color: var(--pl-ink-2); }
.title { margin: 0; font: var(--pl-card-title); text-wrap: pretty; }
.why { margin: 0; color: var(--pl-ink-2); text-wrap: pretty; }
.why code, .src { font: var(--pl-card-code); color: var(--pl-ink); }
.src { color: var(--pl-ink-2); }
.wrong { margin: 0; color: var(--pl-off); }
.acts { display: grid; justify-items: end; gap: 8px; }
.fix { height: 28px; padding: 0 12px; border: 0; border-radius: var(--pl-radius-pill); background: var(--pl-action-soft); color: var(--pl-on-action);
  font: var(--pl-text-label); font-size: 12px; cursor: pointer; white-space: nowrap; transition: scale 120ms var(--pl-ease-out), background-color 120ms var(--pl-ease-out); }
.fix:hover { background: color-mix(in oklab, var(--pl-action) 22%, var(--pl-action-soft)); }
.fix:active { scale: 0.96; }
.fix:focus-visible, .step button:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 2px; }
.fix[disabled] { cursor: default; opacity: 0.6; }
.fix[data-done] { background: var(--pl-mint-soft); color: var(--pl-mint-ink); opacity: 1; }
.step { display: flex; align-items: center; gap: 2px; font: var(--pl-card-meta); color: var(--pl-ink-2); font-variant-numeric: tabular-nums; }
.keys { display: flex; align-items: center; gap: 4px; font: var(--pl-card-meta); color: var(--pl-ink-2); white-space: nowrap; }
kbd { min-width: 18px; height: 18px; padding: 0 4px; box-sizing: border-box; display: inline-grid; place-items: center; border-radius: 5px;
  background: var(--pl-paper-2); box-shadow: inset 0 -1px 0 var(--pl-rule); font: var(--pl-card-code); font-size: 11px; color: var(--pl-ink); }
.step button { width: 24px; height: 24px; border: 0; border-radius: 6px; background: none; color: var(--pl-ink-2); cursor: pointer; font: inherit; font-size: 15px; line-height: 1; }
.step button:hover { background: var(--pl-paper-2); color: var(--pl-ink); }
.step button[disabled] { opacity: 0.35; cursor: default; background: none; }
.clear .who { background: var(--pl-mint-soft); color: var(--pl-mint-ink); }

:host([data-arrive]) .bar { animation: pop 260ms var(--pl-spring-pop) both; transform-origin: 50% 100%; }
.g .seg { animation: drop var(--pl-dur-arrive) var(--pl-spring) both; transform-box: fill-box; transform-origin: top; }
.g { animation: swing 900ms var(--pl-ease-out) both; }
.mark { animation: pop 260ms var(--pl-spring-pop) both; animation-delay: 380ms; transform-box: fill-box; transform-origin: center; }
@keyframes drop { from { transform: scaleY(0); } }
@keyframes swing { 0% { rotate: var(--a); } 38% { rotate: calc(var(--a) * -0.45); } 68% { rotate: calc(var(--a) * 0.18); } 100% { rotate: 0deg; } }
@keyframes pop { from { scale: 0.92; opacity: 0; } }
@media (prefers-reduced-motion: reduce) { *, *::before { animation: none !important; transition: none !important; } }
`;

const GUTTER = 3;  // px between a line and the edge it marks
const BOB = (x, y, s) => `M${x} ${y}l${s} ${1.33 * s}L${x} ${y + 2.83 * s}L${x - s} ${y + 1.33 * s}z`;
const PLUMB = `<svg viewBox="0 0 18 18"><path class="pin" d="M5 2.5h8"/><path class="str" d="M9 2.5V9" stroke-width="1.5"/><path class="bob" d="${BOB(9, 9, 2.8)}"/></svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

let host = null, notes = [], index = 0, frame = 0, state = 'idle', wrong = null, drawnFor = null;

/** The line of a note, from its group's first row to its last, cut wherever a thing sits on it. */
function lineOf(n) {
  // drawn in the gutter beside the edge it marks, never on it: a line on a text's edge would touch every letter
  const x = Math.round((n.guide.x + (n.guide.kind === 'left' ? -GUTTER : n.guide.kind === 'right' ? GUTTER : 0)) * 2) / 2;
  const rs = [n.row, ...n.others].map((r) => r.getBoundingClientRect());
  const top = Math.min(...rs.map((r) => r.top)) - OVER, bottom = Math.max(...rs.map((r) => r.bottom)) + OVER;
  const cuts = n.all.filter((t) => t.kind !== 'box' && t.left - 3 < x && t.right + 3 > x && t.bottom > top && t.top < bottom).map((t) => [t.top - 3, t.bottom + 3]).sort((a, b) => a[0] - b[0]);
  const segs = []; let y = top;
  for (const [a, b] of cuts) { if (a > y + 2) segs.push([y, a]); y = Math.max(y, b); }
  if (bottom > y + 2) segs.push([y, bottom]);
  return { x, top, bottom, segs };
}

function draw() {
  const n = notes[index];
  if (!n) return '';
  FREE = (n.all ?? []).filter((t) => t.kind !== 'box');
  if (n.type !== 'line') return drawSibling(n);
  const { x, top, bottom, segs } = lineOf(n), fresh = drawnFor !== n.row;
  drawnFor = n.row;
  const a = (Math.atan(5 / Math.max(1, bottom - top)) * 180 / Math.PI).toFixed(2);
  const line = segs.map(([y0, y1]) => `<path class="halo seg" d="M${x} ${y0}V${y1}" stroke-width="3.5"/><path class="str seg" d="M${x} ${y0}V${y1}" stroke-width="1.5"/>`).join('');
  const r = n.row.getBoundingClientRect(), t = n.lead.thing, ex = Math.round(n.lead.x * 2) / 2;
  const dim = (y, up) => `M${ex} ${y + (up ? 3 : -3)}V${y}H${x}V${y + (up ? 3 : -3)}`;
  const anim = fresh ? '' : ' style="animation:none"';
  return `<g class="g"${anim} style="--a:${a}deg;transform-origin:${x}px ${top}px${fresh ? '' : ';animation:none'}">${line}
      <path class="pin" d="M${x - 4} ${top}h8"/><path class="bob" d="${BOB(x, bottom + 2, 3.2)}"/></g>
    <g class="mark"${anim}><rect class="ring" x="${r.left - 3}" y="${r.top - 3}" width="${r.width + 6}" height="${r.height + 6}" rx="8"/>
      <path class="halo" d="${dim(t.top - 5, false)}" stroke-width="3.5"/><path class="dim" d="${dim(t.top - 5, false)}"/>
      <path class="halo" d="${dim(t.bottom + 5, true)}" stroke-width="3.5"/><path class="dim" d="${dim(t.bottom + 5, true)}"/>
      <rect class="gapfill" x="${Math.min(ex, x)}" y="${t.top - 5}" width="${Math.abs(ex - x)}" height="${t.bottom - t.top + 10}"/>${pill(r, (r.top + r.bottom) / 2, `${n.d}px ${n.lead.by > 0 ? 'right' : 'left'}`)}</g>`;
}

// a sibling note: the odd one ringed; its siblings marked with a quiet tick so you see who it is measured against;
// for an icon, a dimension mark from where the others' icons sit to where this one does, beside it, clear of its label
// the lines the good siblings share, drawn across all of them and a little past; the break in coral; its size in one pill
const median = (xs) => { const v = [...xs].sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
const seg = (x1, y1, x2, y2, cls = 'str') => `<path class="halo" d="M${x1} ${y1}L${x2} ${y2}" stroke-width="3"/><path class="${cls}" d="M${x1} ${y1}L${x2} ${y2}" stroke-width="1.25"/>`;
const OVER = 14;   // px a shared line runs past the first and last sibling
// the pill goes where it covers nothing: above the thing, below it, right of it, left of it, the first that is clear
let FREE = [];   // the words and pictures on screen, set before each drawing
function pill(r, y, text) {
  const w = text.length * 6.6 + 14, h = 20, cx = (r.left + r.right) / 2 - w / 2;
  const spots = [[r.right + 10, y - h / 2], [r.left - 10 - w, y - h / 2]];
  for (let k = 0; k < 6; k++) spots.push([cx, r.top - 8 - h - k * 14], [cx, r.bottom + 8 + k * 14]);
  spots.sort((a, b) => Math.hypot(a[0] + w / 2 - (r.left + r.right) / 2, a[1] + h / 2 - y) - Math.hypot(b[0] + w / 2 - (r.left + r.right) / 2, b[1] + h / 2 - y));
  // how much of a spot is on something: zero is clear; off screen counts as fully covered
  const covered = ([x, t]) => (x < 4 || t < 4 || x + w > innerWidth - 4 || t + h > innerHeight - 4 ? Infinity
    : FREE.reduce((sum, b) => sum + Math.max(0, Math.min(b.right + 2, x + w) - Math.max(b.left - 2, x)) * Math.max(0, Math.min(b.bottom + 2, t + h) - Math.max(b.top - 2, t)), 0));
  const [x, t] = spots.reduce((best, sp) => (covered(sp) < covered(best) ? sp : best), spots[0]);
  return `<g class="pill"><rect x="${x}" y="${t}" width="${w}" height="${h}" rx="7"/><text x="${x + w / 2}" y="${t + 14}">${esc(text)}</text></g>`;
}
function corners(b, rr, cls) {
  const o = 2.5, R = Math.min(rr, b.height / 2, b.width / 2) + o, L = b.left - o, T = b.top - o, Rt = b.right + o, B = b.bottom + o, k = Math.max(R, 7);
  const arc = (x, y, sx, sy) => (R > o + 0.5
    ? `M${x} ${y + sy * k}V${y + sy * R}A${R} ${R} 0 0 ${sx * sy > 0 ? 1 : 0} ${x + sx * R} ${y}H${x + sx * k}`
    : `M${x} ${y + sy * k}V${y}H${x + sx * k}`);
  const d = [arc(L, T, 1, 1), arc(Rt, T, -1, 1), arc(L, B, 1, -1), arc(Rt, B, -1, -1)].join('');
  return `<path class="halo" d="${d}" stroke-width="3.5"/><path class="${cls}" d="${d}" stroke-width="1.5" fill="none"/>`;
}
const radiusOf = (el) => { const b = el.getBoundingClientRect(); return Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, b.height / 2); };
const radiusWord = (el) => { const b = el.getBoundingClientRect(), r = radiusOf(el); return r >= b.height / 2 - 0.5 ? 'full' : `${Math.round(r)}px`; };

function drawSibling(n) {
  const fresh = drawnFor !== n.row; drawnFor = n.row;
  const anim = fresh ? '' : ' style="animation:none"';
  const r = n.row.getBoundingClientRect(), os = n.others.map((o) => o.getBoundingClientRect()), all = [r, ...os];
  const lines = [], breaks = [];
  if (n.type === 'height') {
    // the top and bottom every other one sits between, run across the row; the odd one pokes past them
    const top = median(os.map((b) => b.top)), bottom = median(os.map((b) => b.bottom));
    const x0 = Math.min(...all.map((b) => b.left)) - OVER, x1 = Math.max(...all.map((b) => b.right)) + OVER;
    lines.push(seg(x0, top, x1, top), seg(x0, bottom, x1, bottom));
    const band = (y0, y1) => (y1 - y0 > 0.4 ? `<rect class="gapfill" x="${r.left}" y="${y0}" width="${r.width}" height="${y1 - y0}"/>` : '');
    breaks.push(band(Math.min(r.top, top), Math.max(r.top, top)), band(Math.min(r.bottom, bottom), Math.max(r.bottom, bottom)));
    breaks.push(seg(r.left, r.top, r.right, r.top, 'brk'), seg(r.left, r.bottom, r.right, r.bottom, 'brk'));
    breaks.push(pill(r, (r.top + r.bottom) / 2, `${r.height > n.height ? '+' : '−'}${n.d}px`));
  } else if (n.type === 'corners') {
    // every sibling's corners traced in sky; the odd one's in coral, its ghost the shape it should have
    for (const o of n.others) lines.push(corners(o.getBoundingClientRect(), radiusOf(o), 'str'));
    breaks.push(corners(r, radiusOf(n.row), 'brk'));
    breaks.push(pill(r, (r.top + r.bottom) / 2, `${radiusWord(n.row)} → ${radiusWord(n.others[0])}`));
  } else if (n.type === 'icon' && n.icon) {
    // through every row, the line its icon sits on, from the icon to just before the words, never over them
    const across = (el, y) => { const i = iconOf(el)?.getBoundingClientRect(), t = textBox(el); return i && t ? [i.left - 6, y, Math.max(i.right + 2, t.left - 3), y] : null; };
    for (const o of n.others) { const i = iconOf(o)?.getBoundingClientRect(); const a = i && across(o, (i.top + i.bottom) / 2); if (a) lines.push(seg(...a)); }
    const b = n.icon.getBoundingClientRect(), now = (b.top + b.bottom) / 2, want = now - n.by, a = across(n.row, want);
    if (a) lines.push(seg(...a));
    breaks.push(`<rect class="gapfill" x="${b.left}" y="${Math.min(now, want)}" width="${b.width}" height="${Math.abs(n.by)}"/>`);
    if (a) breaks.push(seg(a[0], now, a[2], now, 'brk'));
    breaks.push(pill(r, now, `${n.d}px ${n.by > 0 ? 'low' : 'high'}`));
  }
  return `<g class="mark"${anim}>${lines.join('')}${breaks.join('')}</g>`;
}

function paint() {
  frame = 0;
  if (!host) return;
  const held = notes[index]?.row;
  notes = readNotes();
  const again = held ? notes.findIndex((n) => n.row === held) : -1;
  index = again >= 0 ? again : Math.min(index, Math.max(0, notes.length - 1));
  const n = notes[index];
  const say = n ? `<p class="title">${esc(n.title)}</p><p class="why">${esc(n.why).replace(/(\S+-\[[^\]]+\]|\b[a-z]+(?:-[a-z]+)*-[\w.]+\b)/g, '<code>$1</code>')}${n.source ? ` <span class="src">${esc(n.source)}</span>` : ''}</p>${wrong ? `<p class="wrong">${esc(wrong)}</p>` : ''}` : '';
  const btn = n?.act ? `<button class="fix" ${state === 'writing' ? 'disabled' : ''} ${state === 'done' ? 'data-done disabled' : ''}>${state === 'writing' ? 'Writing…' : state === 'done' ? 'Fixed' : esc(n.act)}</button>` : '';
  const step = notes.length > 1 ? `<span class="step"><button class="prev" aria-label="Previous note" ${index ? '' : 'disabled'}>‹</button>${index + 1} of ${notes.length}<button class="next" aria-label="Next note" ${index < notes.length - 1 ? '' : 'disabled'}>›</button></span>` : '';
  host.shadowRoot.innerHTML = `<style>${tokensCss}${CSS_TEXT}</style><svg class="page">${draw()}</svg>
    <div class="bar ${n ? '' : 'clear'}" role="region" aria-label="Plumber's notes" aria-live="polite"><div class="who">${PLUMB}</div>
    <div class="say"><p class="verdict">${esc(verdictOf(notes))}</p>${say}</div><div class="acts">${btn}${step}
    <span class="keys">${notes.length > 1 ? '<kbd>←</kbd><kbd>→</kbd> notes · ' : ''}${n?.act ? '<kbd>↵</kbd> fix · ' : ''}<kbd>esc</kbd> close</span></div></div>`;
  const root = host.shadowRoot;
  root.querySelector('.fix')?.addEventListener('click', fix);
  root.querySelector('.prev')?.addEventListener('click', () => go(-1));
  root.querySelector('.next')?.addEventListener('click', () => go(1));
}
const later = () => { if (host && !frame) frame = requestAnimationFrame(paint); };

function go(dir) {
  const to = Math.max(0, Math.min(notes.length - 1, index + dir));
  if (to === index) return;
  index = to; wrong = null; state = 'idle';
  const r = notes[index].row.getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight - 140) notes[index].row.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  paint();
}

async function fix() {
  const n = notes[index];
  if (!n?.cause?.from || state === 'writing') return;
  state = 'writing'; wrong = null; paint();
  try {
    const trace = { group: `roast.${Date.now().toString(36)}`, meta: { step: 'Roast', laws: [] } };
    const places = await classEditsOf(n.cause.el, n.cause.from, n.cause.to ?? '');
    const byFile = new Map();
    for (const { file, hash, edit } of places) (byFile.get(file) ?? byFile.set(file, { hash, edits: [] }).get(file)).edits.push(edit);
    if (!byFile.size) throw new Error('Plumber could not find where that class is written.');
    for (const [file, f] of byFile) {
      const r = await post('swaps', { file, hash: f.hash, edits: f.edits, trace });
      if (r?.refused?.length) throw new Error(r.refused.map((x) => x.reason).join(' '));
    }
    state = 'done'; paint();
    setTimeout(() => { state = 'idle'; drawnFor = null; paint(); }, 700);   // the page has hot-updated: read it again
  } catch (error) { state = 'idle'; wrong = error?.message ?? 'That change could not be written.'; paint(); }
}

// drawn on the page, so the page's ground picks light or dark
function schemeOfPage() {
  // the ground where the bar sits: the first opaque background under the bottom of the screen, up through its parents,
  // then the body and the root (an app may paint its dark ground on a wrapper, not on the root)
  const under = document.elementsFromPoint(innerWidth / 2, innerHeight - 40).find((e) => !e.closest('[data-plumb-layer], plumb-overlay'));
  const chain = []; for (let e = under; e; e = e.parentElement) chain.push(e);
  // each ground as [lightness 0–1, alpha]: rgb by its luminance, oklch and oklab by their own L
  const read = (c) => {
    let m = /^rgba?\(([^)]+)\)/.exec(c);
    if (m) { const v = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [(0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]) / 255, v[3] ?? 1]; }
    m = /^okl(?:ch|ab)\(\s*([\d.]+)(%?)[^/)]*(?:\/\s*([\d.]+)(%?))?/.exec(c);
    if (m) return [parseFloat(m[1]) / (m[2] ? 100 : 1), m[3] === undefined ? 1 : parseFloat(m[3]) / (m[4] ? 100 : 1)];
    return null;
  };
  const ground = [...chain, document.body, document.documentElement].map((e) => read(getComputedStyle(e).backgroundColor)).find((g) => g && g[1] > 0.5);
  return ground && ground[0] < 0.5 ? 'dark' : 'light';
}

export function showRoast() {
  if (host) return;
  host = document.createElement('div');
  host.setAttribute('data-plumb-layer', 'roast');
  host.attachShadow({ mode: 'open' });
  host.setAttribute('data-scheme', schemeOfPage());
  host.setAttribute('data-arrive', '');
  setTimeout(() => host?.removeAttribute('data-arrive'), 600);
  document.documentElement.append(host);
  index = 0; state = 'idle'; wrong = null; drawnFor = null;
  invite?.remove(); invite = null; inviteCount = -1;
  addEventListener('scroll', later, { capture: true, passive: true });
  addEventListener('resize', later, { passive: true });
  paint();
}
export function hideRoast() {
  if (!host) return;
  removeEventListener('scroll', later, { capture: true });
  removeEventListener('resize', later);
  cancelAnimationFrame(frame); frame = 0;
  host.remove(); host = null;
  settle();
}
export const toggleRoast = () => (host ? hideRoast() : showRoast());

// ── the invitation ──────────────────────────────────────────
// At rest, when the screen has notes, a small pill beside plumber's dock says so and opens them: the plumb bob, "3 notes
// on this screen", the key. It is the only thing the roast shows uninvited. It arrives once the page has settled, its
// bob swinging once from its pin, swings again under the pointer, and leaves while the notes are open or when there is
// nothing to say. It reads the page again only when the page has been still for a moment, and never while you type.

const INVITE_CSS = `
:host { position: fixed; inset: 0; z-index: 2147482999; pointer-events: none; display: block; }
.inv { position: absolute; display: flex; align-items: center; gap: 8px; height: 28px; padding: 0 6px 0 4px; box-sizing: border-box;
  border: 0; border-radius: 14px; background: var(--pl-paper); color: var(--pl-ink); box-shadow: var(--pl-shadow-tag);
  font: var(--pl-card-meta); white-space: nowrap; cursor: pointer; pointer-events: auto;
  animation: in 320ms var(--pl-spring-pop) both; transform-origin: 100% 50%;
  transition: box-shadow 160ms var(--pl-ease-out), translate 160ms var(--pl-ease-out); }
.inv:hover { translate: 0 -1px; box-shadow: var(--pl-shadow-tag), 0 6px 16px -6px rgb(28 27 25 / 0.28); }
.inv:active { translate: 0 0; scale: 0.97; }
.inv:focus-visible { outline: 2px solid var(--pl-instrument); outline-offset: 2px; }
.inv b { font-weight: 600; font-variant-numeric: tabular-nums; }
.who { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; background: var(--pl-coral-soft); color: var(--pl-coral-ink); }
.who svg { width: 14px; height: 14px; overflow: visible; }
.who .str, .who .pin { stroke: currentColor; fill: none; } .who .bob { fill: currentColor; }
.swing { transform-box: view-box; transform-origin: 9px 2.5px; animation: swing 1100ms var(--pl-ease-out) 200ms both; }
.inv:hover .swing { animation: nudge 700ms var(--pl-ease-out) both; }
kbd { min-width: 18px; height: 18px; padding: 0 4px; box-sizing: border-box; display: inline-grid; place-items: center; border-radius: 5px;
  background: var(--pl-paper-2); box-shadow: inset 0 -1px 0 var(--pl-rule); font: var(--pl-card-code); font-size: 11px; color: var(--pl-ink-2); }
@keyframes in { from { opacity: 0; scale: 0.9; } }
@keyframes swing { 0% { rotate: 28deg; } 35% { rotate: -14deg; } 62% { rotate: 6deg; } 82% { rotate: -2deg; } 100% { rotate: 0deg; } }
@keyframes nudge { 0% { rotate: 0deg; } 30% { rotate: 12deg; } 60% { rotate: -5deg; } 100% { rotate: 0deg; } }
@media (prefers-reduced-motion: reduce) { .inv, .swing, .inv:hover .swing { animation: none; transition: none; } }
`;
const INVITE_BOB = `<svg viewBox="0 0 18 18"><path class="pin" d="M5 2.5h8" stroke-width="1.5"/><g class="swing"><path class="str" d="M9 2.5V9" stroke-width="1.5"/><path class="bob" d="${BOB(9, 9, 2.8)}"/></g></svg>`;

let invite = null, inviteCount = -1, idle = 0, watcher = null;
const typing = () => { const a = document.activeElement; return !!a && (a.isContentEditable || a.matches?.('input, textarea, select')); };

function placeInvite(btn) {
  // left of plumber's dock, centred on it; where the dock is not drawn, the corner it would be in
  const d = document.querySelector('plumb-overlay')?.shadowRoot?.querySelector('.dock')?.getBoundingClientRect();
  const ok = d && d.width > 0 && d.right > 0 && d.bottom > 0;
  // from the dock's right edge and its folded size (a square mark): the dock is wide for a few seconds while it shows
  // its own hint, then folds, and the pill must not be left stranded where the wide dock ended
  btn.style.right = `${ok ? innerWidth - d.right + d.height + 8 : 46}px`;
  btn.style.bottom = `${ok ? innerHeight - d.bottom - (28 - d.height) / 2 : 9}px`;
}

function refreshInvite() {
  idle = 0;
  if (host || typing() || document.hidden) return;
  let count = 0;
  try { count = readNotes().length; } catch { count = 0; }
  if (count === inviteCount && invite) { placeInvite(invite.shadowRoot.querySelector('.inv')); return; }
  inviteCount = count;
  invite?.remove(); invite = null;
  if (!count) return;
  invite = document.createElement('div');
  invite.setAttribute('data-plumb-layer', 'roast-invite');
  invite.setAttribute('data-scheme', schemeOfPage());
  invite.attachShadow({ mode: 'open' }).innerHTML = `<style>${tokensCss}${INVITE_CSS}</style>
    <button class="inv" type="button" aria-label="${count} ${count === 1 ? 'note' : 'notes'} on this screen. Open them with Alt G.">
    <span class="who">${INVITE_BOB}</span><span><b>${count}</b> ${count === 1 ? 'note' : 'notes'} on this screen</span><kbd>⌥G</kbd></button>`;
  const btn = invite.shadowRoot.querySelector('.inv');
  btn.addEventListener('click', () => showRoast());
  document.documentElement.append(invite);
  placeInvite(btn);
}
// read again once the page has been still for a moment (a route change, a fix landing, content loading)
const settle = () => { if (idle) clearTimeout(idle); idle = setTimeout(() => (window.requestIdleCallback ?? setTimeout)(refreshInvite), 900); };
function watch() {
  if (watcher) return;
  watcher = new MutationObserver((records) => { if (records.some((r) => !r.target.closest?.('[data-plumb-layer], plumb-overlay'))) settle(); });
  watcher.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'], characterData: true });
  addEventListener('resize', settle, { passive: true });
  addEventListener('popstate', settle);
  settle();
}
if (document.readyState === 'complete') watch(); else addEventListener('load', watch, { once: true });

addEventListener('keydown', (event) => {
  const at = event.composedPath()[0];
  if (at?.isContentEditable || at?.matches?.('input, textarea, select')) return;
  if (event.altKey && event.code === 'KeyG' && !event.repeat && !event.metaKey && !event.ctrlKey) { event.preventDefault(); event.stopPropagation(); toggleRoast(); return; }
  if (!host || event.altKey || event.metaKey || event.ctrlKey) return;
  const k = { ArrowLeft: () => go(-1), ArrowRight: () => go(1), Escape: hideRoast, Enter: () => (at?.closest?.('button') ? null : fix()) }[event.key];
  if (k) { event.preventDefault(); event.stopPropagation(); k(); }
}, true);
