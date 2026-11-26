/* ─────────────────────────────────────────────────────────
 * CRAFT ROWS · React Plumber overlay
 *
 * What a designer checks first on cards set side by side (plans, products, people): does each part sit on one line
 * across the row, does each card start its lines on one edge, and does each card have one main button. Measures
 * only; the three rules that judge them are in craft-rules.js (row-lines, shared-edges, action-fit). The organism
 * generator's designer's read (generator/read.mjs) asks the same measures, so it can say what holds as well as what
 * is wrong.
 *
 *  rowsOf(el, facts)      el's children that are cards side by side, as lines (a wrapped grid has several); [] if none
 *  partsOf(card, facts)   { price, list, action }: the card's largest figure, its first list, its last real button
 *  rowLines(line, facts)  per part: the tops across the line's cards and how far apart they are
 *  edgesOf(card, facts)   where the card's lines start: { edges, hanging, width }, x from the card's content edge
 *  actionsOf(card, facts) { filled, main, full }: its filled buttons, the last one, whether it spans the card
 *
 * Reads only, through facts (rect, style, kids, text) and the first line box of a text node.
 * ───────────────────────────────────────────────────────── */
import { rgb } from './craft-read.js';

const px = (v) => parseFloat(v) || 0;
const CONTROL = 'a, button, [role="button"]';
const painted = (s) => { const c = rgb(s.backgroundColor); return !!c && c[3] > 0.5; };
const drawn = (s) => painted(s) || px(s.borderTopWidth) > 0 || (s.boxShadow && s.boxShadow !== 'none');
// drawn and readable: a 1px box (text kept for screen readers only) isn't something the eye lines up
const visible = (el, facts) => { const r = facts.rect(el); return r.width >= 4 && r.height >= 4; };

// Cards side by side: at least two children of one tag, each wide enough to hold a card (140px) and holding a
// button, grouped into lines by overlapping heights (a plan singled out is often taller, and starts higher), with no
// two in a line overlapping sideways. Widths may differ (a chosen plan is often wider), but not by more than 1.6×.
// What a card is made of, as counts of its tags (its first 300 elements). Cards in a row are built alike, so their
// counts point the same way; a hero's words beside its player, or a form beside its picture, do not.
const make = (el) => { const m = new Map(); let n = 0; for (const d of el.querySelectorAll('*')) { if (++n > 300) break; m.set(d.localName, (m.get(d.localName) ?? 0) + 1); } return m; };
const alike = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (const [k, v] of a) { na += v * v; dot += v * (b.get(k) ?? 0); }
  for (const v of b.values()) nb += v * v;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
};
export function rowsOf(el, facts) {
  const kids = facts.kids(el);
  if (kids.length < 2 || !kids.every((k) => k.localName === kids[0].localName)) return [];
  const rs = kids.map((k) => facts.rect(k));
  if (rs.some((r) => r.width < 140)) return [];
  const lines = [];
  for (const k of [...kids].sort((a, b) => facts.rect(a).top - facts.rect(b).top || facts.rect(a).left - facts.rect(b).left)) {
    const overlap = (a, b) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) >= Math.min(a.height, b.height) / 2;
    const line = lines.find((l) => overlap(facts.rect(l[0]), facts.rect(k)));
    line ? line.push(k) : lines.push([k]);
  }
  return lines.filter((line) => {
    if (line.length < 2) return false;
    const ws = line.map((k) => facts.rect(k).width);
    if (Math.max(...ws) / Math.min(...ws) > 1.6) return false;
    const byX = [...line].sort((a, b) => facts.rect(a).left - facts.rect(b).left);
    if (byX.some((k, i) => i && facts.rect(k).left < facts.rect(byX[i - 1]).right - 1)) return false;
    if (!line.every((k) => partsOf(k, facts).action)) return false;
    // a card is a thing you take in at once: drawn as a shape, or no taller than the screen. Tall undrawn columns (two
    // lists of tracks side by side) are columns of a layout, and their parts never line up across
    if (!line.every((k) => drawn(facts.style(k)) || facts.rect(k).height <= innerHeight)) return false;
    const first = make(line[0]);
    return line.slice(1).every((k) => alike(first, make(k)) >= 0.6);
  });
}

// The parts a row is compared by. The price is the largest text holding a figure, and only when it stands out from
// the card's usual text (1.25× its most common size): a plan with no price ("Custom") has none, rather than a figure
// borrowed from its list. The list is the first ul or ol
// with two items; the action is the last control that is a button (drawn, or at least 28px tall), not a link inside
// a sentence or a list item.
export function partsOf(card, facts) {
  let price = null, size = 0;
  const sizes = new Map();
  for (const n of card.querySelectorAll('*')) {
    if (!facts.text(n) || !visible(n, facts)) continue;
    const s = px(facts.style(n).fontSize);
    sizes.set(s, (sizes.get(s) ?? 0) + n.textContent.trim().length);
    if (/\d/.test(n.textContent) && s > size) { size = s; price = n; }
  }
  const usual = [...sizes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  if (size < usual * 1.25) price = null;
  const list = [...card.querySelectorAll('ul, ol')].find((l) => visible(l, facts) && [...l.children].filter((c) => visible(c, facts)).length >= 2) ?? null;
  const controls = [...card.querySelectorAll(CONTROL)].filter((c) => visible(c, facts) && c.textContent.trim() && !c.closest('p, li'));
  const buttons = controls.filter((c) => drawn(facts.style(c)) || facts.rect(c).height >= 28);
  // a card that is itself a link (the whole card is pressed) is its own action
  const action = buttons.at(-1) ?? controls.at(-1) ?? (card.matches(CONTROL) ? card : null);
  return { price, list, action };
}

// One line of cards: for each part every card has, where it sits across the line (a price's baseline, a list's or a
// button's top), and how far apart the furthest two are.
export function rowLines(line, facts) {
  const out = [];
  for (const part of ['price', 'list', 'action']) {
    // compared across the cards that have it, when at least two and at least half of the line do
    const els = line.map((card) => partsOf(card, facts)[part]).filter(Boolean);
    if (els.length < 2 || els.length < line.length / 2) continue;
    // figures of different sizes are compared where the eye compares them, on their baseline; boxes by their tops
    const at = (e) => (part === 'price' ? facts.metrics(e)?.baseline ?? facts.rect(e).bottom : facts.rect(e).top);
    const tops = els.map(at);
    out.push({ part, els, tops, off: Math.max(...tops) - Math.min(...tops) });
  }
  return out;
}

// Where a card's lines start. Everything the card draws is gathered (words, controls, chips, icons) and grouped into
// visual lines; a line starts at its leftmost thing. When that is an icon (a check, a switch, a logo), the words after
// it hang: their indent is the icon's business, reported apart (`hanging`). A line whose words start on a hanging
// indent with no icon (a list item's second line) is a hanging line too. Words inside a control or a chip belong to
// its box. Lines that start in the card's right part (past 35% of its content width: a badge at the end of a row, a
// second column) are placed on purpose and aren't edges. x is from the card's content edge, clustered within 1.5px.
export function edgesOf(card, facts, { tolerance = 1.5 } = {}) {
  const r = facts.rect(card), b = facts.style(card);
  const left = r.left + px(b.borderLeftWidth) + px(b.paddingLeft);
  const width = r.right - px(b.borderRightWidth) - px(b.paddingRight) - left;
  const items = [], boxes = [];
  const ICON = 'svg, img, input, [role="switch"]';
  for (const n of card.querySelectorAll('*')) {
    if (!visible(n, facts) || boxes.some((bx) => bx.contains(n))) continue;
    const s = facts.style(n), nr = facts.rect(n);
    // a small drawn box with no words (a switch's track, a status dot) leads its line the way an icon does
    const glyph = n.matches(ICON) || (drawn(s) && !n.textContent.trim() && nr.width <= 48 && nr.height <= 48);
    if (n.matches(CONTROL) || (drawn(s) && nr.width < width * 0.98 && n.textContent.trim()) || glyph) {
      boxes.push(n); items.push({ el: n, x: nr.left, top: nr.top, bottom: nr.bottom, icon: glyph });
      continue;
    }
    if (!facts.text(n) || /center|end|right/.test(s.textAlign)) continue;
    for (const t of n.childNodes) {
      if (t.nodeType !== 3 || !t.nodeValue.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(t);
      for (const q of range.getClientRects()) if (q.width > 0) items.push({ el: n, x: q.left, top: q.top, bottom: q.bottom, icon: false });
    }
  }
  // visual lines: things whose heights overlap by half the shorter one
  const lines = [];
  for (const it of items.sort((a, b) => a.top - b.top)) {
    const line = lines.find((l) => l.some((o) => Math.min(o.bottom, it.bottom) - Math.max(o.top, it.top) >= Math.min(o.bottom - o.top, it.bottom - it.top) / 2));
    line ? line.push(it) : lines.push([it]);
  }
  const starts = [], hanging = [];
  for (const line of lines) {
    const [first, second] = line.sort((a, b) => a.x - b.x);
    starts.push({ el: first.el, x: first.x - left, icon: first.icon });
    if (first.icon && second) hanging.push({ el: second.el, x: second.x - left });
  }
  // an icon's box carries its own inner space (craft/icon-side), so an icon a few px off a line of words is on its
  // edge: an eighth of the icon's width, at least the tolerance
  const slack = (s) => (s.icon ? Math.max(tolerance, facts.rect(s.el).width / 8 + tolerance) : tolerance);
  const cluster = (list) => {
    const kept = list.filter((s) => s.x < width * 0.35).sort((a, b) => a.x - b.x), groups = [];
    for (const s of kept) { const g = groups.at(-1); if (g && s.x - g.x <= Math.max(slack(s), g.slack)) { g.els.push(s.el); g.slack = Math.max(g.slack, slack(s)); } else groups.push({ x: s.x, els: [s.el], slack: slack(s) }); }
    return groups.map((g) => ({ x: Math.round(g.x * 10) / 10, els: g.els }));
  };
  const hang = cluster(hanging);
  // a line of words that starts on a hanging indent (a list item's second line) belongs to the hanging edge
  const onHang = (x) => hang.some((h) => Math.abs(h.x - x) <= tolerance);
  return { edges: cluster(starts.filter((s) => s.icon || !onHang(s.x))), hanging: hang, width };
}

// A card's buttons: the filled ones (painted, and standing apart from the card's own ground), the main one (the last
// real button), and whether it spans the card's content width.
export function actionsOf(card, facts) {
  // a fill the same colour as the card's ground isn't seen as a fill; a card painted with a gradient or a picture has
  // no single ground colour, so any opaque fill on it stands out
  const ground = facts.ground(card);
  const pictured = (() => { for (let n = card; n && n !== document.body; n = n.parentElement) { const s = facts.style(n); if (painted(s)) return false; if (s.backgroundImage !== 'none') return true; } return false; })();
  const differs = (c) => !!c && (pictured || Math.abs(c[0] - ground[0]) + Math.abs(c[1] - ground[1]) + Math.abs(c[2] - ground[2]) > 24);
  const filled = [...card.querySelectorAll(CONTROL)].filter((c) => visible(c, facts) && c.textContent.trim() && !c.closest('p, li') && painted(facts.style(c)) && differs(rgb(facts.style(c).backgroundColor)));
  const { action } = partsOf(card, facts);
  const r = facts.rect(card), b = facts.style(card);
  const content = r.width - px(b.paddingLeft) - px(b.paddingRight) - px(b.borderLeftWidth) - px(b.borderRightWidth);
  return { filled, main: action, full: !!action && facts.rect(action).width >= content * 0.9 };
}
