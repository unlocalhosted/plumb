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
 *  keys     ← → between notes, Enter fixes the one in hand, Esc closes. Alt+G opens and closes
 *  motion   the bar pops in; the line drops from its pin and swings once; the marks pop after. Nothing loops.
 *           Under reduced motion it all appears at once
 * ───────────────────────────────────────────────────────── */
import { readGuides } from './guides.js';
import { classEditsOf } from './locate.js';
import { post } from './api.js';

const tokensCss = await (await fetch(new URL('./tokens.css', import.meta.url))).text();

// ── what to say ─────────────────────────────────────────────

const ACROSS = /^-?(gap-x|gap|size|w|min-w|max-w|px|pl|pr|ps|pe|p|ml|mr|ms|me|mx|m|translate-x|space-x|left|right|start|end|inset-x|indent)$/;
const familyOf = (tok) => { if (tok.includes(':')) return null; const m = /^(-?[a-z-]+?)-(\[[^\]]+\]|[\d.]+(?:\/[\d.]+)?|px|full|auto|screen|fit|min|max)$/.exec(tok); return m ? m[1] : null; };
const classes = (el) => (el?.getAttribute?.('class') ?? '').split(/\s+/).filter(Boolean);
const valueIn = (el, fam) => classes(el).find((c) => familyOf(c) === fam) ?? null;
const at = (root, path) => path.reduce((n, i) => n?.children[i] ?? null, root);
const WORD = { gap: 'gap', 'gap-x': 'gap', size: 'size', w: 'width', 'min-w': 'width', 'max-w': 'width', px: 'side padding', p: 'padding', pl: 'left padding', ps: 'left padding', pr: 'right padding', pe: 'right padding', ml: 'left margin', ms: 'left margin', mr: 'right margin', me: 'right margin', mx: 'side margin', m: 'margin', 'translate-x': 'nudge', 'space-x': 'spacing', indent: 'indent' };
const wordFor = (fam, el) => (fam === 'size' && el?.matches?.('svg, img') ? 'icon size' : WORD[fam.replace(/^-/, '')] ?? fam);

/** The class that sets this row apart from the rows on its line: { el, fam, from, to } or null. */
function causeOf(row, others) {
  const paths = [[]];
  for (let i = 0; i < row.children.length; i++) { paths.push([i]); for (let j = 0; j < row.children[i].children.length; j++) paths.push([i, j]); }
  for (const p of paths) {
    const mine = at(row, p), theirs = others.map((r) => at(r, p)).filter(Boolean);
    if (!mine || theirs.length < Math.max(1, others.length / 2)) continue;
    const fams = new Set([...classes(mine), ...theirs.flatMap(classes)].map(familyOf).filter((f) => f && ACROSS.test(f)));
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
const nameOf = (el) => (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 28) || el.getAttribute('aria-label') || 'This';
const sourceOf = (el) => { const s = el.closest?.('[data-plumb-source]')?.getAttribute('data-plumb-source')?.split('#')[0]; if (!s) return null; const m = /([^/]+?):(\d+)(?::\d+)?$/.exec(s); return m ? `${m[1]}:${m[2]}` : s; };
const KIND = { words: 'labels', picture: 'icons', box: 'boxes' };

/** Every note on the screen, worst first. */
export function readNotes() {
  const { strays, all } = readGuides();
  const rows = new Map();
  for (const z of strays) {
    const holders = z.guide.things.filter((o) => o.kind === z.thing.kind && o.el !== z.thing.el);
    if (!holders.length) continue;
    const near = [...holders].sort((a, b) => Math.abs(a.top - z.thing.top) - Math.abs(b.top - z.thing.top))[0];
    let row = z.thing.el;
    while (row.parentElement && !row.parentElement.contains(near.el)) row = row.parentElement;
    const group = row.parentElement;
    if (!group || group === document.body) continue;
    const others = [...new Set(holders.filter((o) => group.contains(o.el)).map((o) => { let r = o.el; while (r.parentElement !== group) r = r.parentElement; return r; }))].filter((r) => r !== row);
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
      region: regionOf(n.row),
    };
  });
  return notes.sort((a, b) => b.d - a.d);
}

function verdictOf(notes) {
  if (!notes.length) return 'Everything here hangs true. Nothing to roast.';
  const regions = new Set(notes.map((n) => n.region)), where = regions.size === 1 ? `your ${[...regions][0]}` : 'this screen';
  return notes.length === 1 ? `Close, but ${where} has one thing off its line.` : `Close, but ${where} doesn't line up: ${notes.length} things are a few pixels off.`;
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
  const top = Math.min(...rs.map((r) => r.top)), bottom = Math.max(...rs.map((r) => r.bottom));
  const cuts = n.all.filter((t) => t.kind !== 'box' && t.left - 3 < x && t.right + 3 > x && t.bottom > top && t.top < bottom).map((t) => [t.top - 3, t.bottom + 3]).sort((a, b) => a[0] - b[0]);
  const segs = []; let y = top;
  for (const [a, b] of cuts) { if (a > y + 2) segs.push([y, a]); y = Math.max(y, b); }
  if (bottom > y + 2) segs.push([y, bottom]);
  return { x, top, bottom, segs };
}

function draw() {
  const n = notes[index];
  if (!n) return '';
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
      <path class="halo" d="${dim(t.bottom + 5, true)}" stroke-width="3.5"/><path class="dim" d="${dim(t.bottom + 5, true)}"/></g>`;
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
    <div class="say"><p class="verdict">${esc(verdictOf(notes))}</p>${say}</div><div class="acts">${btn}${step}</div></div>`;
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

export function showRoast() {
  if (host) return;
  host = document.createElement('div');
  host.setAttribute('data-plumb-layer', 'roast');
  host.attachShadow({ mode: 'open' });
  // drawn on the page, so the page's ground picks light or dark
  const ground = [document.body, document.documentElement].map((e) => /rgba?\(([^)]+)\)/.exec(getComputedStyle(e).backgroundColor)?.[1].split(/[,/]/).map(parseFloat)).find((c) => c && (c[3] ?? 1) > 0.5) ?? [255, 255, 255];
  host.setAttribute('data-scheme', 0.2126 * ground[0] + 0.7152 * ground[1] + 0.0722 * ground[2] < 128 ? 'dark' : 'light');
  host.setAttribute('data-arrive', '');
  setTimeout(() => host?.removeAttribute('data-arrive'), 600);
  document.documentElement.append(host);
  index = 0; state = 'idle'; wrong = null; drawnFor = null;
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
}
export const toggleRoast = () => (host ? hideRoast() : showRoast());

addEventListener('keydown', (event) => {
  const at = event.composedPath()[0];
  if (at?.isContentEditable || at?.matches?.('input, textarea, select')) return;
  if (event.altKey && event.code === 'KeyG' && !event.repeat && !event.metaKey && !event.ctrlKey) { event.preventDefault(); event.stopPropagation(); toggleRoast(); return; }
  if (!host || event.altKey || event.metaKey || event.ctrlKey) return;
  const k = { ArrowLeft: () => go(-1), ArrowRight: () => go(1), Escape: hideRoast, Enter: () => (at?.closest?.('button') ? null : fix()) }[event.key];
  if (k) { event.preventDefault(); event.stopPropagation(); k(); }
}, true);
