/* ─────────────────────────────────────────────────────────
 * CRAFT RANKS · React Plumber overlay
 *
 * Two engine checks for the faults a designer points at first on a screen built in a hurry (Karri Saarinen,
 * 2026-11-08: "vertical and horizontal alignment is missing; buttons are rounded and square, also various sizes";
 * docs/research/alignment-discourse.md). One judgement under both: things that are siblings should agree, and the one
 * that disagrees with most of them is the finding. The cause is the class that differs where the others agree, and the
 * fix is their value (a class swap; taking a class out when the others have none).
 *
 *  column-edge    a row of a column (the rows of a menu, a list) whose words start off the edge most of the rows'
 *                 words start on, by less than two steps of the spacing grid: a step or two is a slip, an indent that
 *                 means "child of" is further and is shared by its own rows. Content, never a box: a fill may bleed
 *  sibling-match  among siblings built alike (and the things at one place in rows built alike: the avatar in each
 *                 member row): where an icon sits against its label's middle (1px and up); the height of labelled,
 *                 control-sized buttons (2px and up; icon-only controls size up on purpose); the corners of
 *                 control-sized boxes (square, a radius, fully rounded)
 *
 * Never judged: the lines of one heading or paragraph against each other, centred words by an edge, text hidden from
 * sight (sr-only), anything a script or an animation is moving. A group is judged once per pass and remembered on the
 * facts, so a check per element costs a lookup.
 * ───────────────────────────────────────────────────────── */
import { say } from './words.js';

const MIN_GROUP = 3;
const ACROSS = /^-?(gap-x|gap|size|w|min-w|max-w|px|pl|pr|ps|pe|p|ml|mr|ms|me|mx|m|translate-x|space-x|left|right|start|end|inset-x|indent)$/;
const DOWN = /^-?(translate-y|mt|mb|my|top|bottom|self|items|size|h|min-h|leading|py|pt|pb|align|place-self|inset-y)$/;
const TALL = /^(h|min-h|max-h|py|pt|pb|p|size|leading|text|border|border-y|border-t|border-b|ring)$/;
const CORNER = /^(rounded|rounded-t|rounded-b|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br)$/;
const BARE = new Set(['rounded', 'border', 'ring', 'shadow']);
const TEXT_BLOCK = 'h1, h2, h3, h4, h5, h6, p, blockquote, figcaption, label, button, li > a, td, th';
const CONTROL = 'button, [role="button"], input, select, textarea';

const familyOf = (tok) => {
  if (tok.includes(':')) return null;
  if (BARE.has(tok)) return tok;
  const m = /^(-?[a-z-]+?)-(\[[^\]]+\]|[\d.]+(?:\/[\d.]+)?|px|full|auto|screen|fit|min|max|none|xs|sm|md|lg|xl|[2-9]xl|start|end|center|baseline|stretch)$/.exec(tok);
  return m ? m[1] : null;
};
const classes = (el) => (el?.getAttribute?.('class') ?? '').split(/\s+/).filter(Boolean);
const valueIn = (el, fam) => classes(el).find((c) => familyOf(c) === fam) ?? null;
const at = (root, path) => path.reduce((n, i) => n?.children[i] ?? null, root);
const builtAs = (el) => [...el.children].map((c) => c.tagName).join(',');

/** The class that sets `el` apart from `others` (place by place, two levels down): { el, fam, from, to } or null. */
export function causeOf(el, others, FAMS) {
  const paths = [[]];
  for (let i = 0; i < el.children.length; i++) { paths.push([i]); for (let j = 0; j < el.children[i].children.length; j++) paths.push([i, j]); }
  for (const p of paths) {
    const mine = at(el, p), theirs = others.map((r) => at(r, p)).filter(Boolean);
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

function mode(values, near) {
  let best = null;
  for (const v of values) {
    const n = values.filter((w) => (near ? Math.abs(w - v) < near : w === v)).length;
    if (!best || n > best.n) best = { v, n };
  }
  return best;
}

const moving = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { if (/transform|translate|rotate|scale/.test(e.getAttribute('style') ?? '') || e.getAnimations?.().some((a) => a.playState === 'running')) return true; } return false; };
const hidden = (r, s) => ((r.width <= 1 || r.height <= 1) && s.overflow !== 'visible') || /^rect\(0(px)?,?\s*0/.test(s.clip) || /inset\(50%\)/.test(s.clipPath);
const centred = (facts, el) => [el, el.parentElement].some((e) => { const s = e && facts.style(e); return s && (s.textAlign === 'center' || (/grid/.test(s.display) && s.justifyItems === 'center') || (/flex/.test(s.display) && !/column/.test(s.flexDirection) && s.justifyContent === 'center')); });
const gridUnit = () => { const v = getComputedStyle(document.documentElement).getPropertyValue('--spacing').trim(), n = parseFloat(v); return !n ? 4 : /rem$/.test(v) ? n * parseFloat(getComputedStyle(document.documentElement).fontSize) : n; };

/** The box of the first words inside `el` that can be seen, and the element holding them. */
function firstWords(facts, el) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    const holder = t.parentElement, s = facts.style(holder);
    if (s.visibility !== 'visible' || hidden(facts.rect(holder), s)) continue;
    const r = document.createRange(); r.selectNodeContents(t);
    const b = r.getClientRects()[0];
    if (b && b.width && b.height) return { box: b, holder };
  }
  return null;
}
const iconOf = (el) => [...el.querySelectorAll('svg, img')].find((i) => !i.parentElement.closest('svg') && i.getBoundingClientRect().height > 0) ?? null;
const nameOf = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) }); const t = w.nextNode()?.data.trim().replace(/\s+/g, ' '); return (t && (t.length > 28 ? `${t.slice(0, 26).replace(/\s+\S*$/, '')}…` : t)) || el.getAttribute('aria-label') || null; };
const boxed = (s) => /[1-9]/.test((/rgba?\(([^)]*)\)/.exec(s.backgroundColor)?.[1] ?? '').split(',')[3] ?? '1') && s.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(s.borderTopWidth) > 0 || s.boxShadow !== 'none';
const shapeOf = (r, s) => { const rad = parseFloat(s.borderTopLeftRadius) || 0; return rad >= r.height / 2 - 0.5 ? 'round' : rad < 0.5 ? 'square' : `${Math.round(rad)}px`; };
const SHAPE = { round: 'fully rounded', square: 'square' };
const shapeWord = (v) => SHAPE[v] ?? `${v} rounded`;
const NOUN = (el) => (el.matches(CONTROL) ? 'buttons' : el.matches('li, a') ? 'rows' : 'items');

// the groups on the page, judged once per pass: the facts object is the pass
const PASS = new WeakMap();
function verdicts(facts) {
  let v = PASS.get(facts);
  if (v) return v;
  v = new Map();
  PASS.set(facts, v);
  const unit = gridUnit();
  for (const parent of document.querySelectorAll('body *')) {
    if (parent.closest('[data-plumb-layer], plumb-overlay')) continue;
    const kids = [...parent.children].filter((k) => { const r = facts.rect(k); return r.height > 0 && r.width > 0; });
    if (kids.length < MIN_GROUP) continue;
    const byKind = new Map();
    for (const k of kids) { const key = `${k.tagName}${k.matches(CONTROL) ? ':c' : ''}|${builtAs(k)}`; byKind.set(key, [...(byKind.get(key) ?? []), k]); }
    for (const rows of byKind.values()) {
      if (rows.length < MIN_GROUP) continue;
      const still = rows.filter((el) => !moving(el));
      columnEdge(facts, still, unit, v);
      matchSet(facts, still, v, null);
      // cousins: the things at one place in rows built alike
      for (let i = 0; i < rows[0].children.length; i++) for (const p of [[i], ...[...rows[0].children[i].children].map((_, j) => [i, j])]) {
        const set = still.map((r) => at(r, p)).filter(Boolean);
        if (set.length === still.length) matchSet(facts, set, v, (el) => still.find((r) => r.contains(el)));
      }
    }
  }
  return v;
}

function columnEdge(facts, rows, unit, out) {
  if (rows.length < MIN_GROUP) return;
  const ps = facts.style(rows[0].parentElement);
  const stacked = !/flex/.test(ps.display) || /column/.test(ps.flexDirection);
  if (!stacked || rows[0].parentElement.closest(TEXT_BLOCK)) return;
  const starts = rows.map((r) => { const w = firstWords(facts, r); return w && !centred(facts, w.holder) ? w : null; });
  const xs = starts.filter(Boolean).map((w) => w.box.left);
  if (xs.length < MIN_GROUP) return;
  const m = mode(xs, 0.5);
  if (m.n / xs.length < 0.6) return;
  rows.forEach((row, i) => {
    const w = starts[i]; if (!w) return;
    const by = w.box.left - m.v, d = Math.abs(by);
    if (d <= 0.5 || d >= 2 * unit) return;
    const others = rows.filter((_, j) => starts[j] && Math.abs(starts[j].box.left - m.v) < 0.5);
    out.set(row, [...(out.get(row) ?? []), { kind: 'edge', by, d: Math.round(d * 10) / 10, x: m.v, others, words: w.box, cause: causeOf(row, others, ACROSS) }]);
  });
}

function matchSet(facts, g, out, rowOf) {
  if (g.length < MIN_GROUP) return;
  const add = (el, f) => out.set(el, [...(out.get(el) ?? []), { ...f, row: rowOf?.(el) ?? null }]);
  // an icon beside its label: where its middle sits against the words' middle
  const dy = g.map((el) => { const i = iconOf(el), t = firstWords(facts, el); if (!i || !t) return null; const b = facts.rect(i); return (b.top + b.bottom) / 2 - (t.box.top + t.box.bottom) / 2; });
  const withIcon = dy.filter((x) => x !== null);
  if (withIcon.length >= MIN_GROUP) {
    const m = mode(withIcon, 0.5);
    if (m.n / withIcon.length >= 0.6) g.forEach((el, i) => {
      if (dy[i] === null || Math.abs(dy[i] - m.v) < 1) return;
      const others = g.filter((_, j) => j !== i && dy[j] !== null && Math.abs(dy[j] - m.v) < 0.5);
      add(el, { kind: 'icon', by: dy[i] - m.v, d: Math.round(Math.abs(dy[i] - m.v) * 10) / 10, icon: iconOf(el), others, cause: causeOf(el, others, DOWN) });
    });
  }
  const controlSized = (el) => { const b = facts.rect(el); return b.height <= 120 && b.width <= 640; };
  const oneLine = (el) => { const t = firstWords(facts, el); return !!t && t.box.height < facts.rect(el).height && !el.querySelector('p, li, div > div'); };
  const boxes = g.filter((el) => controlSized(el) && (el.matches(CONTROL) || (boxed(facts.style(el)) && oneLine(el))));
  if (boxes.length < MIN_GROUP || boxes.length / g.length < 0.6) return;
  if (boxes.every((el) => firstWords(facts, el))) {
    const hs = boxes.map((el) => facts.rect(el).height), mh = mode(hs, 1);
    if (mh.n / boxes.length >= 0.6) boxes.forEach((el, i) => {
      if (Math.abs(hs[i] - mh.v) < 2) return;
      const others = boxes.filter((_, j) => Math.abs(hs[j] - mh.v) < 1);
      add(el, { kind: 'height', d: Math.round(Math.abs(hs[i] - mh.v) * 10) / 10, taller: hs[i] > mh.v, want: mh.v, others, cause: causeOf(el, others, TALL) });
    });
  }
  const shapes = boxes.map((el) => shapeOf(facts.rect(el), facts.style(el))), ms = mode(shapes);
  if (ms.n / boxes.length >= 0.6) boxes.forEach((el, i) => {
    if (shapes[i] === ms.v) return;
    const others = boxes.filter((_, j) => shapes[j] === ms.v);
    add(el, { kind: 'corners', mine: shapes[i], want: ms.v, others, cause: causeOf(el, others, CORNER) });
  });
}

const fixOf = (cause, why) => (cause?.from ? { kind: 'class', from: cause.from, to: cause.to ?? '', why } : { kind: 'advice', text: why });

export const columnEdge_ = {
  id: 'craft/column-edge', family: 'craft', number: [], owns: ['margin-x'], once: 'element', reads: ['rect', 'style', 'kids', 'text'],
  check({ el, facts }) {
    const f = (verdicts(facts).get(el) ?? []).find((x) => x.kind === 'edge');
    if (!f) return [];
    const dir = f.by > 0 ? 'right' : 'left';
    return [{
      ...say(this.id, { d: f.d, dir, name: nameOf(el) }),
      key: this.id, text: f.cause?.from ?? 'position', props: ['margin-left'], value: `${f.d}px`, n: f.d,
      evidence: { by: f.by, x: f.x, rows: f.others.length + 1, cause: f.cause && `${f.cause.from ?? 'none'} → ${f.cause.to ?? 'none'}` },
      proof: { kind: 'edge', x: f.x, by: f.by, others: f.others, words: f.words },
      confidence: f.cause ? 0.9 : 0.7,
      suggest: fixOf(f.cause, f.cause ? `The other rows use ${f.cause.to ?? 'none'}.` : 'Nothing in its classes differs from the rows around it; something outside the row pushes it.'),
    }];
  },
};

export const siblingMatch = {
  id: 'craft/sibling-match', family: 'craft', number: [], owns: ['size', 'radius', 'transform'], once: 'element', reads: ['rect', 'style', 'kids', 'text'],
  check({ el, facts }) {
    const out = [];
    for (const f of (verdicts(facts).get(el) ?? []).filter((x) => x.kind !== 'edge')) {
      // a cousin is said with its row, named by the row's own words, not the cousin's ("In Mei Tanaka's row, MT …")
      const where = f.row ? (() => { const w = document.createTreeWalker(f.row, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.data.trim() && !el.contains(t) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) }); return w.nextNode()?.data.trim().replace(/\s+/g, ' ').slice(0, 28) ?? null; })() : null;
      const vars = f.kind === 'icon' ? { kind: 'icon', d: f.d, dir: f.by > 0 ? 'lower' : 'higher', name: nameOf(el), where }
        : f.kind === 'height' ? { kind: 'height', d: f.d, dir: f.taller ? 'taller' : 'shorter', name: nameOf(el), noun: NOUN(el), where }
        : { kind: 'corners', mine: shapeWord(f.mine), want: shapeWord(f.want), name: nameOf(el), noun: NOUN(el), where };
      out.push({
        ...say(this.id, vars),
        key: `${this.id}/${f.kind}`, text: f.cause?.from ?? f.kind, props: [f.kind === 'corners' ? 'border-radius' : f.kind === 'height' ? 'height' : 'translate'],
        value: f.kind === 'corners' ? f.mine : `${f.d}px`, n: f.d ?? 0,
        evidence: { kind: f.kind, of: f.others.length + 1, cause: f.cause && `${f.cause.from ?? 'none'} → ${f.cause.to ?? 'none'}` },
        proof: { kind: f.kind, others: f.others, by: f.by, want: f.want, icon: f.icon },
        confidence: f.cause ? 0.9 : 0.7,
        suggest: fixOf(f.cause, f.cause ? `The others use ${f.cause.to ?? 'none'}.` : `Nothing in its classes differs from the ${NOUN(el)} beside it.`),
      });
    }
    return out;
  },
};

export const RANK_RULES = [columnEdge_, siblingMatch];
