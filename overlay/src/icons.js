/* ─────────────────────────────────────────────────────────
 * ICONS · React Plumber overlay (docs/research/icon-system.md, layer 1: read and propose, at scope keep)
 *
 * The icon pass's reading, one family over from colours.js. One reader for the page and the census
 * (src/census.ts loads this module in the page), so the site's icon system and this page's places are measured alike.
 *
 *  read     readIcons() → [{ el, kind: 'svg' | 'emoji', ... }], one per in-system icon place (§3, §4 "Refused categories").
 *           svg: { origin, name, via, size, stroke (px on screen), cap, join, style, colour, label, gap, offset, at, props, ... }
 *           emoji: { emoji, key, form, size, label, role, ... }. `label` is the words the icon sits with: { el, text, size, weight,
 *           lines }. `gap` the icon's edge to the label's text box; `offset` the icon's middle against the label's cap middle
 *           (§1.6); `at` the class at the usage that sets each (size, stroke, gap, offset), `props` the props of the component that
 *           drew it (a renderer's `size`, `strokeWidth`, `name`). The array carries `refused` (what was read and left: logos,
 *           illustrations, drawings, prose) and `content`
 *  family   familyOf(places, census) → the app's main family and its system (§3): size per text size, stroke per weight band,
 *           gap per icon size, caps and joins, style share; `markFor(key)` says whether the family HAS a mark for a meaning
 *           (§9.1 never invent a mark; §9.2 no new dependency)
 *  propose  proposeIcons(places, family, { scope: 'keep' }) → { moves, kept, refused, measure }
 *           each move: { el, rule: 'I1'…'I9', law, from, to, write }. `write` is the class (`cls`, with `from`, on `on`), the prop,
 *           the import, or advice. keep changes toward the app's own values only: no value the app does not already use
 *  never    a mark that is not in the family, a package that is not installed, content (a logo, an illustration, an icon in a
 *           drawing, an emoji in prose), anything whose write cannot be located
 *
 * [K] claims checked for this layer (docs/research/icon-system.md §9.4): lucide-react 1.7.0 in algorecall/node_modules: viewBox 24,
 * stroke 2, round caps and joins (defaultAttributes.js), classes `lucide lucide-<name>` (createLucideIcon.js), `absoluteStrokeWidth`
 * (Icon.js), the names in EMOJI below (dist/esm/icons). NOT checked (package not installed here): the signatures and component names of
 * Heroicons, Phosphor, Tabler, Radix, MUI and react-icons below; they only name an origin, and no write depends on one except I6 and I7,
 * which also need the target mark to exist in an installed package.
 * ───────────────────────────────────────────────────────── */
import { toRgb } from './craft-headless.js';
import { SPEC, classesOf, utility } from './craft-read.js';

// ── thresholds, with the spec section that sets each ────────
const T = {
  strokeOff: 0.25,    // §9.3 / §7.4: the pass's stroke threshold (craft/stroke-weight keeps 0.4 as a per-element hint)
  strokeSample: 8,    // §4 I1: samples in the weight band
  strokeShare: 0.6,   // §4 I1 / §3: the "usual" share
  sizePeers: 3,       // §4 I2: peers in the list
  sizeShare: 0.5,     // §4 I2: the mode
  sizeNear: 12,       // craft/media-size `near`: only a stray this close to the mode is a stray
  big: 32,            // §4 I3 ≥ 32px
  bigStroke: 2,       // §4 I3 stroke > 2
  capOff: 1,          // §4 I4: > 1px off the cap middle (craft/icon-cap)
  gapPeers: 4,        // §4 I5
  gapOff: 0.75,       // §4 I5: a gap this far from the modal one is a stray
  familyShare: 0.6,   // §3: under it the app is "mixed"
  hit: 24,            // §4 I9: WCAG 2.5.8
  art: 48,            // §4 refused: > 48px is art
  shapes: 12,         // §4 refused: > 12 shapes is art
  min: 4,
  glyph: 12,          // craft/media-size `min`: nothing under 12px is judged as a sized icon
};
const LAW = {
  I1: 'similarity', I2: 'similarity', I3: 'similarity', I4: 'aesthetic-usability', I5: 'similarity', I6: 'similarity',
  I7: 'similarity', I8: 'similarity, Jakob, aesthetic-usability', I9: 'Fitts', unlabelled: 'recognition over recall',
};
const CONTROL = 'button, [role=button], [role=tab], [role=menuitem], a[href], summary, input[type=button], input[type=submit]';
const SHAPES = 'path, circle, rect, line, polyline, polygon, ellipse';
const STATUS_HINT = '[role=status], [role=alert], [class*=badge i], [class*=status i], [class*=chip i], [class*=tag i], [class*=pill i], [class*=category i], [class*=label i]';
const CONTENT_UP = 'canvas, picture, video, plumb-overlay, .recharts-wrapper, .highcharts-container, [class*=chart i], [data-plumb-content]';
const SOCIAL = '[class*=reaction i], [class*=message i], [class*=chat i], [class*=avatar i], [class*=comment i], [data-avatar]';
const dpr = () => (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1;
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const grain = (n) => Math.round(n * 4) / 4; // §3: 0.25 grain

// ── the mapping: emoji → meaning (§4.2). Names are Lucide's, checked against lucide-react 1.7.0 ──
// "emoji… key" per entry; the key is OUR canonical key (the set's own name for it comes from the family). Variation selectors and skin
// tones are stripped before lookup. `dot:` is not an icon: a colour circle is a status hue, written as a dot (§4.1, §9.3).
const EMOJI = `
🏠 house | 🔍 🔎 search | ⚙️ settings | 🔔 bell | 🔕 bell-off | 👤 user | 👥 users | 🧑‍💼 user-round | 📥 inbox | 📤 send | 📧 ✉️ mail
💬 message-square | 🗨️ message-circle | ☰ menu | 🏷️ tag | 🔖 bookmark | ⭐ 🌟 star | ❤️ heart | 🔗 link | 📎 paperclip | 🧭 compass | 🗺️ map
📍 map-pin | 🌐 globe | 🧩 puzzle
📁 folder | 📂 folder-open | 📄 file-text | 📃 file | 📝 square-pen | ✏️ pencil | 🖊️ pen | 📋 clipboard | 📌 pin | 🗂️ folders | 🗃️ archive
🗄️ database | 💾 save | 🖼️ image | 📷 camera | 🎥 video | 🎬 clapperboard | 🎵 music | 🎤 mic | 🔊 volume-2 | 🔇 volume-x | 📚 library
📖 book-open | 📕 book | 🧾 receipt | 📰 newspaper
📊 chart-column | 📈 trending-up | 📉 trending-down | 🧮 calculator | 💹 chart-line | 🗓️ 📅 calendar | ⏰ clock | ⏱️ timer | ⌛ ⏳ hourglass
🕐 clock | 🔢 hash | 📦 package | 🚚 truck | 🏢 building-2 | 🏦 landmark | 🛒 shopping-cart | 🛍️ shopping-bag
💰 wallet | 💵 💲 dollar-sign | 💳 credit-card | 🪙 coins | 🎁 gift | 🏆 trophy | 🎯 target | 🏅 medal | 💎 gem
➕ plus | ➖ minus | ✖️ ❌ x | ✔️ ✅ ✓ check | ☑️ square-check | 🗑️ trash-2 | ♻️ recycle | 🔄 refresh-cw | 🔁 repeat | ↩️ undo-2 | ↪️ redo-2
⬆️ arrow-up | ⬇️ arrow-down | ⬅️ arrow-left | ➡️ arrow-right | ↗️ arrow-up-right | 🖨️ printer | ✂️ scissors | 🔧 🛠️ wrench | 🔨 hammer
🔑 key | 🔒 lock | 🔓 lock-open | 🛡️ shield | 👁️ eye | 🙈 eye-off | 🚀 rocket | ⚡ zap | 🔥 flame | 💡 lightbulb | ✨ sparkles | 🪄 wand-sparkles
🧪 flask-conical | 🔬 microscope | 🤖 bot | 🧠 brain | 💻 laptop | 🖥️ monitor | 📱 smartphone | ⌨️ keyboard | 🖱️ mouse-pointer | 🔌 plug
🔋 battery | 📡 radio | ☁️ cloud | 🌙 moon | ☀️ sun | 🌍 earth
⚠️ triangle-alert | ❗ ❕ circle-alert | ❓ ❔ circle-help | ℹ️ info | 🚫 ban | ⛔ octagon-x | 🛑 octagon | ⏸️ pause | ▶️ play | ⏹️ square
⏭️ skip-forward | ⏮️ skip-back | 🎉 party-popper | 👍 thumbs-up | 👎 thumbs-down | 🚩 flag | 🐛 bug | 🆕 sparkles | 💤 moon | 👀 eye
👋 🙋 hand | 🤝 handshake | 👪 users | 🎓 graduation-cap | 💼 briefcase | 🧑‍💻 code | 🏳️ flag
🔴 dot:red | 🟠 dot:orange | 🟡 dot:yellow | 🟢 dot:green | 🔵 dot:blue | 🟣 dot:purple | ⚫ dot:black | ⚪ dot:white`;
const STRIP = /[︎️\u{1F3FB}-\u{1F3FF}]/gu;
const norm = (s) => s.replace(STRIP, '').trim();
const MEANING = new Map();
for (const entry of EMOJI.split(/\||\n/)) {
  const parts = entry.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) continue;
  const key = parts.pop();
  for (const e of parts) MEANING.set(norm(e), key);
}
// §4.2 order of evidence (2): the label beside the emoji says which meaning (📥 next to "Archive" is archive)
const BY_LABEL = [
  ['📥', /archive/i, 'archive'], ['📥', /download/i, 'download'], ['📤', /upload/i, 'upload'], ['📤', /send|share|submit/i, 'send'],
  ['📋', /copy/i, 'copy'], ['🔁', /repeat|loop/i, 'repeat'], ['🔔', /mute|silence/i, 'bell-off'], ['🌙', /dark|night|theme/i, 'moon'],
].map(([e, re, key]) => [norm(e), re, key]);
// what an app's own renderer might call the same mark (§4.1: swapped to a mark only if that mark exists)
const SYN = {
  house: ['home'], settings: ['cog', 'gear', 'preferences'], search: ['magnifier', 'find'], x: ['close', 'cross'], plus: ['add'], check: ['tick', 'done'],
  'trash-2': ['trash', 'delete', 'bin'], mail: ['email', 'envelope'], 'file-text': ['document', 'doc'], 'chart-column': ['chart', 'bars', 'bar-chart'],
  'triangle-alert': ['warning', 'alert'], info: ['information'], bell: ['notification', 'notifications'], user: ['person', 'account', 'profile'],
  users: ['people', 'team', 'group'], menu: ['hamburger', 'bars'], 'arrow-right': ['next', 'forward'], 'arrow-left': ['back', 'previous'],
};
// a component's name → our key. Lucide's own names are the keys; the Heroicons names below are [K], not checked here (package not installed)
const ALIAS = {
  'cog-6-tooth': 'settings', cog: 'settings', 'user-group': 'users', 'magnifying-glass': 'search', 'x-mark': 'x', envelope: 'mail', home: 'house',
  trash: 'trash-2', 'document-text': 'file-text', 'lock-closed': 'lock', 'eye-slash': 'eye-off', 'bars-3': 'menu', 'exclamation-triangle': 'triangle-alert',
  'information-circle': 'info', 'check-circle': 'circle-check', 'x-circle': 'circle-x', 'chat-bubble-left': 'message-square', 'arrow-path': 'refresh-cw',
};

// ── where an icon comes from (§3 (a)–(d)) ───────────────────
// Lucide's output is read from the installed package (see the header); the others' signatures are [K] and only name an origin.
const PKG = { lucide: 'lucide-react', heroicons: '@heroicons/react', phosphor: '@phosphor-icons/react', tabler: '@tabler/icons-react', radix: '@radix-ui/react-icons', mui: '@mui/icons-material', 'react-icons': 'react-icons' };

const fiberOf = (el) => { const k = Object.keys(el).find((x) => x.startsWith('__reactFiber$')); return k ? el[k] : null; };
const nameOf = (f) => { const t = f?.type; return typeof t === 'string' ? t : t?.displayName ?? t?.name ?? t?.render?.displayName ?? t?.render?.name ?? t?.type?.name ?? null; };
// the components between the svg and the next element React rendered, innermost first: the renderer (or library icon) then who wraps it
function chainOf(el) {
  const out = [];
  for (let f = fiberOf(el)?.return, n = 0; f && n < 8 && typeof f.type !== 'string'; f = f.return, n++) {
    const name = nameOf(f);
    if (name && /^[A-Z]/.test(name)) out.push({ name, props: f.memoizedProps ?? {} });
  }
  return out;
}
const pick = (props) => {
  const o = {};
  for (const k of ['name', 'size', 'strokeWidth', 'absoluteStrokeWidth', 'className', 'width', 'height', 'title', 'weight', 'color']) if (props?.[k] !== undefined && typeof props[k] !== 'object') o[k] = props[k];
  return o;
};
const kebab = (s) => s.replace(/([a-z\d])([A-Z])/g, '$1-$2').replace(/([a-zA-Z])(\d)/g, '$1-$2').replace(/(\d)([A-Za-z])/g, '$1-$2').toLowerCase();

function originOf(svg, chain) {
  const cls = svg.getAttribute('class') ?? '', vb = (svg.getAttribute('viewBox') ?? '').trim();
  const use = svg.querySelector('use');
  const href = use && (use.getAttribute('href') ?? use.getAttribute('xlink:href'));
  if (href && href.includes('#')) return { origin: 'sprite', via: 'sprite', name: href.split('#')[1], evidence: href };
  if (/(^|\s)lucide(\s|$)/.test(cls)) {
    const names = cls.split(/\s+/).filter((c) => c.startsWith('lucide-'));
    return { origin: 'lucide', via: 'signature', name: (names.at(-1) ?? names[0] ?? '').replace(/^lucide-/, '') || null, evidence: 'class lucide' };
  }
  if (/icon-tabler/.test(cls)) return { origin: 'tabler', via: 'signature', name: (cls.match(/icon-tabler-([\w-]+)/)?.[1]) ?? null, evidence: 'class icon-tabler' };
  if (/MuiSvgIcon/.test(cls)) return { origin: 'mui', via: 'signature', name: (svg.getAttribute('data-testid') ?? '').replace(/Icon$/, '') || null, evidence: 'class MuiSvgIcon' };
  if (svg.getAttribute('data-slot') === 'icon' && /^0 0 (24|20|16) (24|20|16)$/.test(vb)) {
    const grid = vb.split(/\s+/)[2];
    const comp = chain.find((c) => /Icon$/.test(c.name));
    return { origin: 'heroicons', via: 'signature', name: comp ? kebab(comp.name.replace(/Icon$/, '')) : null, variant: `${grid}-${svg.getAttribute('fill') === 'currentColor' ? 'solid' : 'outline'}`, evidence: `data-slot=icon, viewBox ${vb}` };
  }
  if (vb === '0 0 256 256') return { origin: 'phosphor', via: 'signature', name: chain[0] ? kebab(chain[0].name.replace(/Icon$/, '')) : null, evidence: 'viewBox 0 0 256 256' };
  if (vb === '0 0 15 15') return { origin: 'radix', via: 'signature', name: chain[0] ? kebab(chain[0].name.replace(/Icon$/, '')) : null, evidence: 'viewBox 0 0 15 15' };
  if (svg.getAttribute('stroke') === 'currentColor' && svg.getAttribute('fill') === 'currentColor' && svg.getAttribute('stroke-width') === '0') return { origin: 'react-icons', via: 'signature', name: chain[0]?.name ?? null, evidence: 'stroke=fill=currentColor, stroke-width 0' };
  // a component of the app's own that draws the svg: its renderer (crafting-ui `Icon`)
  const comp = chain[0];
  if (comp) return { origin: `app:${comp.name}`, via: 'renderer', name: typeof comp.props.name === 'string' ? comp.props.name : null, evidence: `<${comp.name}>` };
  return { origin: 'inline', via: 'inline', name: null, evidence: `inline svg${vb ? ` ${vb}` : ''}` };
}

// ── what an svg paints ──────────────────────────────────────
function paint(svg, cs, scale) {
  const shapes = [...svg.querySelectorAll(SHAPES)].filter((s) => !s.closest('defs, clipPath, mask, symbol, pattern, marker'));
  const own = shapes.map((s) => ({ s, c: getComputedStyle(s) }));
  const stroked = own.filter(({ c }) => c.stroke !== 'none' && parseFloat(c.strokeWidth) > 0 && parseFloat(c.strokeOpacity || 1) > 0);
  const filled = own.filter(({ c }) => c.fill !== 'none' && parseFloat(c.fillOpacity || 1) > 0);
  const use = svg.querySelector('use');
  // a filled marker (a dot, an arrowhead) on a line icon is part of the line drawing: only a fill over a tenth of the grid makes it duotone
  const grid = (svg.viewBox?.baseVal?.width || 1) * (svg.viewBox?.baseVal?.height || 1);
  const area = (list) => list.reduce((n, { s: sh }) => { try { const b = sh.getBBox(); return n + b.width * b.height; } catch { return n; } }, 0);
  const bigFill = area(filled) / grid > 0.1;
  let line = stroked.length > 0, solid = filled.length > 0 && (stroked.length === 0 || bigFill);
  if (!shapes.length) { line = cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0; solid = !line && cs.fill !== 'none'; }
  const style = line && solid ? 'duotone' : line ? 'line' : solid ? 'solid' : null;
  const first = stroked[0]?.c ?? cs;
  const widths = stroked.length ? stroked.map(({ c }) => parseFloat(c.strokeWidth)) : line ? [parseFloat(cs.strokeWidth)] : [];
  const nonScaling = first.vectorEffect === 'non-scaling-stroke';
  const user = widths.length ? widths.sort((a, b) => a - b)[Math.floor(widths.length / 2)] : null;
  const stroke = user === null || style === 'solid' ? null : r2(nonScaling ? user : user * scale);
  // child shapes inherit the stroke only when none of them writes its own width (§4 I1 write)
  const inherits = stroked.length > 0 && !stroked.some(({ s }) => s.hasAttribute('stroke-width') || s.style.strokeWidth) && widths.every((w) => w === widths[0]);
  // the ink: currentColor (the text's colour) or colours baked into the drawing (§1.1)
  const paints = new Set();
  for (const { s, c } of own) {
    if (c.stroke !== 'none' && parseFloat(c.strokeWidth) > 0) paints.add(s.getAttribute('stroke') === 'currentColor' || c.stroke === cs.color ? 'currentColor' : c.stroke);
    if (c.fill !== 'none') paints.add(s.getAttribute('fill') === 'currentColor' || c.fill === cs.color ? 'currentColor' : c.fill);
  }
  const baked = [...paints].filter((p) => p !== 'currentColor');
  const gradient = !!svg.querySelector('linearGradient, radialGradient') || [...own].some(({ c }) => /url\(/.test(c.fill + c.stroke));
  return { shapes: shapes.length, stroke, userStroke: user, cap: line ? first.strokeLinecap : null, join: line ? first.strokeLinejoin : null, style, inherits, baked, gradient, sprite: !!use, shapesOwn: own.length };
}

// ── the words an icon sits with (§1.6) ──────────────────────
const letters = /[\p{L}\p{N}]/u;
function textNodes(root, skip) {
  const out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (!letters.test(n.nodeValue ?? '')) continue;
    const p = n.parentElement;
    if (!p || (skip && skip.contains(p)) || p.closest('svg, style, script, textarea')) continue;
    out.push(n);
  }
  return out;
}
const rectsOf = (node) => { const r = document.createRange(); r.selectNodeContents(node); return [...r.getClientRects()].filter((q) => q.width > 0 || q.height > 0); };
let ctx = null; const memo = new Map();
function metricsOf(cs) {
  const font = cs.font || `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  try { if (document.fonts && !document.fonts.check(font)) return null; } catch { return null; }
  let m = memo.get(font);
  if (!m) {
    ctx ??= document.createElement('canvas').getContext('2d');
    ctx.font = font;
    const H = ctx.measureText('H');
    m = { cap: H.actualBoundingBoxAscent, ascent: H.fontBoundingBoxAscent, descent: H.fontBoundingBoxDescent };
    memo.set(font, m);
  }
  return m;
}
// the label of an icon: the first words in the nearest ancestor that has any, up to three levels (or the control with none)
function labelAround(el) {
  let box = el;
  for (let up = 0; up < 3; up++) {
    const row = box.parentElement;
    if (!row || row === document.body || row === document.documentElement) return null;
    const nodes = textNodes(row, el);
    if (nodes.length) return { row, box, node: nodes[0], nodes };
    if (row.matches(CONTROL)) return { row, box, node: null, nodes: [] };
    box = row;
  }
  return null;
}
function labelFacts(l, iconRect) {
  if (!l.node) return null;
  const host = l.node.parentElement, cs = getComputedStyle(host), m = metricsOf(cs);
  const rects = rectsOf(l.node);
  const first = rects[0];
  const tops = new Set(l.nodes.flatMap((n) => rectsOf(n).map((q) => Math.round(q.top / Math.max(4, parseFloat(cs.fontSize) * 0.6)))));
  const text = l.row.textContent.replace(/\s+/g, ' ').trim();
  let gap = null, offset = null;
  const sameLine = first && first.top < iconRect.bottom && first.bottom > iconRect.top;
  if (first && sameLine) {
    if (first.left >= iconRect.right - 0.5) gap = first.left - iconRect.right;
    else if (first.right <= iconRect.left + 0.5) gap = iconRect.left - first.right;
    if (m) { const baseline = first.top + (first.height - (m.ascent + m.descent)) / 2 + m.ascent; offset = iconRect.top + iconRect.height / 2 - (baseline - m.cap / 2); }
  }
  return { el: host, row: l.row, text: text.slice(0, 60), words: text.length, size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10) || 400, colour: cs.color,
    lines: tops.size, gap: gap === null ? null : r2(gap), offset: offset === null ? null : r2(offset), cap: m?.cap ?? null, side: first && sameLine ? (first.left >= iconRect.right - 0.5 ? 'before' : first.right <= iconRect.left + 0.5 ? 'after' : 'stacked') : 'stacked' };
}

// the class (or prop) that sets each thing, at the element and its row; a renderer's props from the fiber
const STROKE_CLS = /^(?:\[stroke-width:[^\]]+\]|stroke-\[?[\d.]+(?:px)?\]?)$/;
const clsOf = (el, re) => classesOf(el).split(/\s+/).find((c) => c && !c.includes(':') && re.test(c)) ?? null;
function classesAt(el, row) {
  const size = utility(el, 'size'), w = utility(el, 'w', { not: /^(full|auto|screen|fit|min|max)/ }), h = utility(el, 'h', { not: /^(full|auto|screen|fit|min|max)/ });
  return {
    size: size ?? (w && h ? `${w} ${h}` : null),
    stroke: clsOf(el, STROKE_CLS),
    gap: row ? utility(row, 'gap') : null,
    margin: utility(el, 'mr') ?? utility(el, 'ml') ?? utility(el, 'mx'),
    translate: clsOf(el, /^-?translate-y-/),
    align: row ? utility(row, 'items') : null,
  };
}

// ── reading the page ────────────────────────────────────────

/** Every in-system icon place: inline svg, a component's svg at icon size, and an emoji standing in for one. */
export function readIcons(root = document.body, { exclude = [] } = {}) {
  const places = [], refused = [], cut = exclude.length ? exclude.join(',') : null;
  places.refused = refused; places.content = 0;
  const refuse = (el, kind, why, category, extra = {}) => { refused.push({ el, kind, why, category, ...extra }); if (category === 'content') places.content++; };

  for (const svg of root.querySelectorAll('svg')) {
    if (svg.closest('plumb-overlay') || svg.parentElement?.closest('svg')) continue;
    const r = svg.getBoundingClientRect(), cs = getComputedStyle(svg);
    if (cs.display === 'none' || cs.visibility === 'hidden' || (!r.width && !r.height)) continue; // a sprite sheet, or hidden
    if (r.width < T.min || r.height < T.min) continue;
    if (svg.closest(CONTENT_UP) || (cut && svg.closest(cut))) { refuse(svg, 'svg', 'inside a drawing, a chart or an excluded path (content, not UI)', 'content'); continue; }
    const chain = chainOf(svg), o = originOf(svg, chain);
    const vbAttr = svg.viewBox?.baseVal, vbw = vbAttr?.width || parseFloat(svg.getAttribute('width')) || r.width, scale = r.width / vbw;
    const p = paint(svg, cs, scale);
    // under 12px it is a marker (a chevron, a play triangle, a dot), not a sized icon: craft/media-size judges nothing below 12 either
    if (r.width < T.glyph || r.height < T.glyph) { refuse(svg, 'svg', `${r1(Math.max(r.width, r.height))}px: under ${T.glyph}px it is a marker, not a sized icon`, 'glyph'); continue; }
    // §4 refused: art. Over 48px, over 12 shapes
    if (r.width > T.art || r.height > T.art) { refuse(svg, 'svg', `${Math.round(Math.max(r.width, r.height))}px: over ${T.art}px an svg is an illustration, and a size or stroke change would distort it`, 'illustration'); continue; }
    if (p.shapes > T.shapes) { refuse(svg, 'svg', `${p.shapes} shapes: over ${T.shapes} is an illustration`, 'illustration'); continue; }
    // brand logos: named so, or drawn in their own colours
    const named = (e) => /logo|wordmark|brand/i.test([e.id, e.getAttribute?.('class'), e.getAttribute?.('aria-label'), e.getAttribute?.('title'), e.getAttribute?.('alt'), e.getAttribute?.('data-testid')].filter(Boolean).join(' '));
    let logo = named(svg) || /logo/i.test(svg.querySelector(':scope > title')?.textContent ?? '');
    for (let a = svg.parentElement, i = 0; !logo && a && a !== document.body && i < 3; a = a.parentElement, i++) if (named(a)) logo = true;
    if (logo) { refuse(svg, 'svg', 'a logo: fixed shape and colour, a stroke or size change would distort it', 'logo'); continue; }
    if (p.baked.length >= 2 || p.gradient) { refuse(svg, 'svg', 'it carries its own colours (a logo or art), not currentColor', 'logo'); continue; }
    // in-system means beside words or in a control (§3 "controls, links, rows and labels")
    const lab = labelAround(svg);
    if (!lab) { refuse(svg, 'svg', 'not in a control, link or row: nothing here says it is an icon of the interface', 'content'); continue; }
    const label = labelFacts(lab, r);
    const row = lab.row, rcs = getComputedStyle(row), control = row.closest(CONTROL) ?? null;
    const at = classesAt(svg, row);
    const comp = chain[0] ?? null;
    places.push({
      el: svg, kind: 'svg', ...o, origin: o.origin, grid: vbw, size: r1(r.width), height: r1(r.height), stroke: p.stroke, cap: p.cap, join: p.join, style: p.style,
      colour: { source: p.baked.length ? 'baked' : 'currentColor', css: p.baked[0] ?? cs.color, cls: utility(svg, 'text') },
      label, row, rowFlex: /flex/.test(rcs.display) && !/column/.test(rcs.flexDirection), justify: rcs.justifyContent, rowGap: parseFloat(rcs.columnGap) || 0,
      control, iconOnly: !label, gap: label?.gap ?? null, offset: label?.offset ?? null, scale, inherits: p.inherits, userStroke: p.userStroke, shapes: p.shapes,
      positioned: /absolute|fixed/.test(cs.position) || /absolute|fixed/.test(getComputedStyle(lab.box).position),
      at, props: comp ? pick(comp.props) : {}, component: comp?.name ?? null, wrappers: chain.slice(1, 4).map((c) => c.name), rect: r,
      state: !!svg.closest('[aria-current], [aria-selected=true], [aria-pressed=true], [data-state=active], [data-selected], [class*=active i], [class*=selected i]'),
      stamp: svg.getAttribute('data-plumb-source') ?? svg.parentElement?.closest('[data-plumb-source]')?.getAttribute('data-plumb-source') ?? null,
    });
  }
  readEmoji(root, places, refuse, cut);
  return places;
}

// the emoji standing in for an icon: a text node that is an emoji, or that leads (or ends) with one, in a control, link, row or nav label
const EMOJI_RE = /[\p{Extended_Pictographic}✓☰]/u;
const NOT_EMOJI = /^[©®™]$/;
function readEmoji(root, places, refuse, cut) {
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const text = n.nodeValue ?? '', host = n.parentElement;
    if (!host || !EMOJI_RE.test(text) || host.closest('plumb-overlay, script, style, textarea, svg')) continue;
    const g = seg ? [...seg.segment(text)].map((s) => s.segment) : [...text];
    const trimmed = text.trim();
    const lead = g.find((x) => x.trim()), last = [...g].reverse().find((x) => x.trim());
    const isE = (x) => !!x && EMOJI_RE.test(x) && !NOT_EMOJI.test(x);
    const form = isE(lead) && norm(trimmed) === norm(lead) ? 'own' : isE(lead) && trimmed.startsWith(lead) ? 'leading' : isE(last) && trimmed.endsWith(last) ? 'trailing' : 'inside';
    const emoji = form === 'trailing' ? last : form === 'inside' ? g.find(isE) : lead;
    if (!isE(emoji)) continue;
    if (form === 'inside') { refuse(host, 'emoji', 'in the middle of words: content, not an icon', 'content', { emoji }); continue; }
    if (cut && host.closest(cut)) { refuse(host, 'emoji', 'inside an excluded path', 'content', { emoji }); continue; }
    if (host.closest(SOCIAL)) { refuse(host, 'emoji', 'a reaction, message or avatar: content (§4 I8)', 'content', { emoji }); continue; }
    const control = host.closest(CONTROL) ?? null;
    const nav = host.closest('nav, [role=navigation], [role=menu], [role=menubar], [role=tablist], li, [role=listitem], [role=option]');
    // a colour circle beside a short label is a status wherever it stands (§4.2 Status); anything else needs a control, nav or row
    const statusDot = /^dot:/.test(MEANING.get(norm(emoji)) ?? '') && !host.closest('p, h1, h2, h3, h4, h5, h6') && trimmed.length < 40;
    if (!control && !nav && !statusDot) { refuse(host, 'emoji', 'not in a control, link, nav or list row: it reads as content', 'content', { emoji }); continue; }
    if (host.closest('h1, h2, h3, h4, h5, h6, p') && !control) { refuse(host, 'emoji', 'in a heading or paragraph: content', 'content', { emoji }); continue; }
    // the words it sits with: the rest of this text, or the next words in the row
    const rest = form === 'own' ? null : trimmed.replace(emoji, '').trim();
    let lab = null;
    if (form === 'own') {
      let box = host;
      for (let up = 0; up < 2 && !lab; up++) {
        const row = box.parentElement;
        if (!row || row === document.body) break;
        const others = textNodes(row, host).filter((x) => x !== n);
        if (others.length) lab = { row, node: others[0], nodes: others };
        else if (row.matches(CONTROL)) break; // the control is the edge: words beyond it are another control's
        else box = row;
      }
    } else if (rest) lab = { row: host, node: n, nodes: [n] };
    const words = (lab ? lab.row.textContent : text).replace(/\s+/g, ' ').trim();
    if (words.replace(emoji, '').length > 60) { refuse(host, 'emoji', 'in a sentence: content, not an icon', 'content', { emoji }); continue; }
    const cs = getComputedStyle(host), key = MEANING.get(norm(emoji)) ?? null, acc = host.closest('[aria-label], [title]');
    const label = lab?.node ? { el: lab.node.parentElement, text: words.replace(emoji, '').trim().slice(0, 60), words: words.length, size: parseFloat(getComputedStyle(lab.node.parentElement).fontSize) } : null;
    if (!key) { refuse(host, 'emoji', `${emoji} has no entry in the mapping (§4.2: faces, hands, animals, food and flags carry emotion or identity)`, 'unmapped', { emoji }); continue; }
    const hint = BY_LABEL.find(([e, re]) => e === norm(emoji) && re.test(label?.text ?? acc?.getAttribute('aria-label') ?? ''));
    places.push({
      el: host, node: n, kind: 'emoji', emoji, key: hint ? hint[2] : key, tableKey: key, via: hint ? 'label' : 'table', form, size: r1(parseFloat(cs.fontSize)), weight: parseInt(cs.fontWeight, 10) || 400,
      label, row: lab?.row ?? host.parentElement, control, nav: !!nav, accessibleName: acc ? (acc.getAttribute('aria-label') || acc.getAttribute('title')) : null,
      status: !!host.closest(STATUS_HINT) || /^dot:/.test(key), stamp: host.getAttribute('data-plumb-source') ?? host.closest('[data-plumb-source]')?.getAttribute('data-plumb-source') ?? null,
      conflict: hint && hint[2] !== key ? `${emoji} next to "${label?.text}" means ${hint[2]}, not ${key}` : null,
    });
  }
}

/** The places as rows the census keeps: what the family and the site's system are read from. */
export function iconRows(places) {
  return places.map((p) => p.kind === 'emoji'
    ? { stamp: p.stamp, kind: 'emoji', emoji: p.emoji, key: p.key, size: p.size, textSize: p.label?.size ?? p.size }
    : { stamp: p.stamp, kind: 'svg', origin: p.origin, variant: p.variant ?? null, name: p.name, size: p.size, textSize: p.label ? Math.round(p.label.size) : null, band: p.label && p.label.weight >= 600 ? 'bold' : 'regular',
        stroke: p.stroke, cap: p.cap, join: p.join, style: p.style, grid: p.grid, gap: p.rowFlex && p.label?.lines === 1 ? p.gap : null, cls: p.at.size, hasLabel: !!p.label });
}

/** Where a class that sets something on an icon is written: the usage's site, through locate (the colour pass's route). */
export async function iconSite(place, cls) {
  const { classSiteOf } = await import('./locate.js');
  return classSiteOf(place.el, cls ? String(cls).split(/\s+/) : []);
}
/** The edits that change `from` to `to` where the icon wears it (locate.classEditsOf), for the writer. */
export async function iconEdits(place, from, to) {
  const { classEditsOf } = await import('./locate.js');
  return classEditsOf(place.el, from, to);
}

// ── the family (§3) ─────────────────────────────────────────

const mode = (values) => {
  const m = new Map();
  for (const v of values) if (v !== null && v !== undefined) m.set(v, (m.get(v) ?? 0) + 1);
  const top = [...m].sort((a, b) => b[1] - a[1])[0];
  return top ? { value: top[0], n: top[1], of: values.filter((v) => v !== null && v !== undefined).length } : null;
};
const pascal = (key) => key.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('');

/**
 * The app's main family and its system. `census` is the site's `icons` answer ({ icons: rows, installed: [{ pkg, version, marks }] });
 * with none, this page's places are the sample. Under 60% share the family is "mixed" (§3) and the pass lists instead of swapping.
 */
export function familyOf(places, census = null) {
  const own = iconRows(places).filter((r) => r.kind === 'svg');
  const rows = census?.icons?.length ? census.icons.filter((r) => r.kind === 'svg') : own;
  const installed = census?.installed ?? [];
  const emoji = (census?.icons?.length ? census.icons : iconRows(places)).filter((r) => r.kind === 'emoji').length;
  const counts = new Map();
  for (const r of rows) counts.set(r.origin, (counts.get(r.origin) ?? 0) + 1);
  const ranked = [...counts].sort((a, b) => b[1] - a[1]).map(([origin, count]) => ({ origin, count }));
  const total = rows.length;
  if (!total) return { id: null, origin: null, mixed: false, count: 0, total: 0, share: 0, candidates: [], emoji, installed, sizes: {}, strokes: {}, gaps: {}, markFor: () => null, reason: 'the page has no svg icons: no family to swap into (install an icon set, then choose it)' };
  // inline svgs with no signature do not make a family of their own: the family is the most used named origin
  const named = ranked.filter((c) => c.origin !== 'inline');
  const top = named[0] ?? ranked[0];
  const share = top.count / total;
  const mine = rows.filter((r) => r.origin === top.origin);
  const strokes = {}, sizes = {}, gaps = {};
  for (const band of ['regular', 'bold']) {
    const m = mode(mine.filter((r) => r.band === band && r.stroke !== null).map((r) => grain(r.stroke)));
    if (m) strokes[band] = { value: r2(mean(mine.filter((r) => r.band === band && r.stroke !== null && grain(r.stroke) === m.value).map((r) => r.stroke))), n: m.n, of: m.of };
  }
  for (const t of [...new Set(mine.map((r) => r.textSize).filter((x) => x))]) { const m = mode(mine.filter((r) => r.textSize === t).map((r) => Math.round(r.size))); if (m) sizes[t] = { px: m.value, n: m.n, of: m.of, cls: mode(mine.filter((r) => r.textSize === t && Math.round(r.size) === m.value && r.cls).map((r) => r.cls))?.value ?? null }; }
  for (const s of [...new Set(mine.map((r) => Math.round(r.size)))]) { const m = mode(mine.filter((r) => Math.round(r.size) === s && r.gap !== null).map((r) => Math.round(r.gap))); if (m && m.of >= T.gapPeers) gaps[s] = { px: m.value, n: m.n, of: m.of }; }
  const style = { line: 0, solid: 0, duotone: 0 };
  for (const r of mine) if (r.style) style[r.style]++;
  const base = top.origin.split(':')[0];
  const pkgName = PKG[base] ?? null;
  const pkg = pkgName ? installed.find((p) => p.pkg === pkgName || p.pkg.startsWith(pkgName)) ?? null : null;
  // the marks the family HAS: an installed package's names (read from the package), or an own renderer's names seen in use
  let marks = null, marksFrom = null;
  if (pkg?.marks) { marks = new Set(pkg.marks); marksFrom = `${pkg.pkg}@${pkg.version}`; }
  else if (base === 'app') { marks = new Set(mine.map((r) => r.name).filter(Boolean)); marksFrom = 'seen in use (the renderer\'s own list is not read)'; }
  const f = {
    id: share >= T.familyShare ? top.origin : 'mixed', origin: top.origin, mixed: share < T.familyShare, count: top.count, total, share: r2(share), candidates: ranked, emoji, installed, pkg,
    grid: mode(mine.map((r) => r.grid))?.value ?? null, cap: mode(mine.map((r) => r.cap))?.value ?? null, join: mode(mine.map((r) => r.join))?.value ?? null,
    style, strokes, sizes, gaps, marks, marksFrom, renderer: base === 'app' ? top.origin.slice(4) : null,
  };
  f.markFor = (key) => markFor(f, key);
  f.reason = f.mixed ? `the icons are mixed (${Math.round(share * 100)}% from ${top.origin}, under ${T.familyShare * 100}%)` : null;
  return f;
}
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

// whether the family has a mark for a meaning, and what the swap writes. Never invents (§9.1), never adds a package (§9.2)
function markFor(f, key) {
  if (!key || key.startsWith('dot:')) return null;
  if (f.mixed || !f.origin) return { no: f.reason ?? 'no icon family' };
  if (f.renderer) {
    const names = [key, ...(SYN[key] ?? [])];
    const hit = names.find((n) => f.marks?.has(n));
    return hit ? { name: hit, component: f.renderer, via: 'renderer' } : { no: 'no mark yet' };
  }
  if (f.origin === 'lucide') {
    if (!f.pkg) return { no: 'lucide-react is not in this project: install lucide-react first' };
    if (!f.pkg.marks) return { no: `${f.pkg.pkg} is in package.json but its names could not be read: install it first` };
    return f.marks.has(key) ? { name: pascal(key), key, import: { from: 'lucide-react', name: pascal(key) }, via: 'package' } : { no: `${f.pkg.pkg}@${f.pkg.version} has no ${key}` };
  }
  return { no: `${f.origin}: its names are not read by this pass yet` };
}

// ── proposing ───────────────────────────────────────────────

const sizeCls = (px) => (px % 2 === 0 && px <= 96 ? `size-${px / 4}` : `size-[${px}px]`);
const num = (c) => { const m = /(-?)(?:translate-y-)(?:\[(-?[\d.]+)px\]|([\d.]+))/.exec(c ?? ''); return m ? (m[1] ? -1 : 1) * (m[2] !== undefined ? parseFloat(m[2]) : parseFloat(m[3]) * 4) : null; };
const padCls = (px) => (px % 2 === 0 ? `p-${px / 4}` : `p-[${px}px]`);
const gapCls = (px) => (px % 2 === 0 ? `gap-${px / 4}` : `gap-[${px}px]`);
// the component a usage names for this icon (BellIcon, Bell): the one the swap replaces
const iconName = (p) => [p.component, ...p.wrappers].find((n) => n && (/Icon$/.test(n) || n === pascal(p.name ?? ''))) ?? p.component;
const bandOf = (p) => (p.label && p.label.weight >= 600 ? 'bold' : 'regular');
const textBand = (p) => (p.label ? Math.round(p.label.size) : 'solo');

export function proposeIcons(places, family = familyOf(places), { scope = 'keep' } = {}) {
  void scope; // layer 1 is keep only: refine and new are later layers
  const moves = [], listed = [], refused = [...(places.refused ?? [])];
  const svgs = places.filter((p) => p.kind === 'svg'), emojis = places.filter((p) => p.kind === 'emoji');
  const moved = new Map(); // place → { size?, stroke?, origin?, style?, gone? } after
  const note = (p, patch) => moved.set(p, { ...(moved.get(p) ?? {}), ...patch });
  const move = (p, rule, from, to, write, extra = {}) => { moves.push({ el: p.el, rule, law: LAW[rule], from, to, write, ...extra }); };
  const refuse = (p, rule, why) => refused.push({ el: p.el, kind: p.kind, rule, law: LAW[rule], why });

  // I2 stray size (§4): a peer list of ≥ 3, the mode ≥ 50%; at keep the target is the app's own size, the class its peers wear
  const bySize = new Map();
  for (const p of svgs) { const k = `${p.origin}|${textBand(p)}`; if (!bySize.has(k)) bySize.set(k, []); bySize.get(k).push(p); }
  for (const [, group] of bySize) {
    if (group.length < T.sizePeers) continue;
    const m = mode(group.map((p) => Math.round(p.size)));
    if (!m || m.n < 2 || m.n / group.length < T.sizeShare) continue;
    const peers = group.filter((p) => Math.round(p.size) === m.value);
    const cls = mode(peers.map((p) => p.at.size).filter(Boolean))?.value ?? sizeCls(m.value);
    for (const p of group) {
      if (Math.abs(p.size - m.value) < 0.5 || Math.abs(p.size - m.value) > T.sizeNear) continue;
      if (p.positioned) { refuse(p, 'I2', 'positioned art: the layout depends on its size'); continue; }
      const from = { size: p.size, cls: p.at.size }, to = { size: m.value, cls };
      if (p.at.size) { move(p, 'I2', from, to, { cls: cls, from: p.at.size }); note(p, { size: m.value }); }
      else if (p.props.size !== undefined && p.component) { move(p, 'I2', { ...from, prop: p.props.size }, { ...to, prop: m.value }, { prop: { name: 'size', value: m.value, on: p.component } }); note(p, { size: m.value }); }
      else refuse(p, 'I2', 'its size is set by the renderer or a stylesheet, not by a class or prop at the usage');
    }
  }

  // I1 stray stroke (§4): ≥ 8 samples in the weight band, the mode ≥ 60%, off by ≥ 0.25px
  const byBand = new Map();
  for (const p of svgs) { if (p.stroke === null || p.style !== 'line') continue; const k = bandOf(p); if (!byBand.has(k)) byBand.set(k, []); byBand.get(k).push(p); }
  const usual = {};
  for (const [band, group] of byBand) {
    if (group.length < T.strokeSample) continue;
    const m = mode(group.map((p) => grain(p.stroke)));
    if (!m || m.n / group.length < T.strokeShare) continue;
    const value = r2(mean(group.filter((p) => grain(p.stroke) === m.value).map((p) => p.stroke)));
    usual[band] = value;
    for (const p of group) {
      if (Math.abs(p.stroke - value) < T.strokeOff - 1e-6) continue;
      const to = { stroke: value }, from = { stroke: p.stroke };
      const user = r2(Math.round((value / (p.scale || 1)) * 20) / 20);
      if (p.props.strokeWidth !== undefined && p.component) { move(p, 'I1', from, to, { prop: { name: 'strokeWidth', value: user, on: p.component } }); note(p, { stroke: value }); }
      else if (p.at.stroke) { move(p, 'I1', { ...from, cls: p.at.stroke }, { ...to, cls: `[stroke-width:${user}]` }, { cls: `[stroke-width:${user}]`, from: p.at.stroke }); note(p, { stroke: value }); }
      else if (p.via === 'renderer') { move(p, 'I1', from, to, { advice: `Set the ${value}px stroke in the renderer (${p.component}), not on this mark: a renderer sets every mark's weight.` }); note(p, { stroke: value }); }
      else if (!p.inherits) refuse(p, 'I1', 'the stroke is drawn into the shapes (each sets its own width), so one class on the svg would not reach them');
      else { move(p, 'I1', from, to, { cls: `[stroke-width:${user}]`, from: null }); note(p, { stroke: value }); }
    }
  }
  // I3 big icon, heavy stroke (§4): ≥ 32px with stroke > 2, to the app's usual stroke
  for (const p of svgs) {
    if (p.size < T.big || p.stroke === null || p.stroke <= T.bigStroke || moved.get(p)?.stroke !== undefined) continue;
    const value = usual[bandOf(p)] ?? usual.regular ?? family?.strokes?.[bandOf(p)]?.value ?? null;
    if (value === null) { refuse(p, 'I3', 'the app has no usual stroke to bring it back to'); continue; }
    const user = r2(Math.round((value / (p.scale || 1)) * 20) / 20);
    if (p.label && p.label.size >= p.size * 0.9) { refuse(p, 'I3', `it is sized to its ${Math.round(p.label.size)}px text, so its stroke follows the text's stem (§1.3 rule 2), not the small-size stroke`); continue; }
    if (!p.inherits && !p.at.stroke) { refuse(p, 'I3', 'the stroke is drawn into the shapes'); continue; }
    move(p, 'I3', { stroke: p.stroke, size: p.size }, { stroke: value }, { cls: `[stroke-width:${user}]`, from: p.at.stroke ?? null });
    note(p, { stroke: value });
  }

  // I4 misaligned icon + label (§4, craft/icon-cap): off the cap middle by > 1px, one-line label in a flex row
  const capOff = SPEC.rule('craft/icon-cap').off ?? T.capOff;
  for (const p of svgs) {
    if (!p.label || p.offset === null || Math.abs(p.offset) <= capOff) continue;
    if (p.label.lines > 1) { refuse(p, 'I4', 'the label runs over more than one line'); continue; }
    if (!p.rowFlex) { refuse(p, 'I4', 'the icon and label are not a flex row (a column or inline flow)'); continue; }
    const centred = /center/.test(getComputedStyle(p.row).alignItems);
    const cur = num(p.at.translate) ?? 0;
    const rowMid = p.row.getBoundingClientRect().top + p.row.getBoundingClientRect().height / 2;
    const capMid = p.rect.top + p.rect.height / 2 - p.offset;
    let write, to;
    if (!centred) {
      // items-center puts the icon's middle on the row's middle; judge whether that is within a pixel of the cap middle
      const after = rowMid - capMid;
      if (Math.abs(after) <= capOff) { write = { cls: 'items-center', on: 'row', from: p.at.align }; to = { offset: r1(after) }; }
      else { const by = -Math.round(after * dpr()) / dpr(); write = { cls: `items-center ${by < 0 ? '-' : ''}translate-y-[${Math.abs(by)}px]`, on: 'row+icon', from: p.at.align }; to = { offset: 0 }; }
    } else {
      const by = cur - Math.round(p.offset * dpr()) / dpr();
      write = { cls: `${by < 0 ? '-' : ''}translate-y-[${Math.abs(by)}px]`, from: p.at.translate }; to = { offset: 0 };
    }
    move(p, 'I4', { offset: r1(p.offset), cls: p.at.translate ?? p.at.align }, to, write, { row: p.row });
  }

  // I5 gap (§4): the modal gap for that icon size, ≥ 4 peers, set by the row's gap or the icon's margin; at keep, no new value
  const bySz = new Map();
  for (const p of svgs) { if (p.gap === null || !p.rowFlex || p.label?.lines !== 1) continue; const k = `${p.origin}|${Math.round(p.size)}`; if (!bySz.has(k)) bySz.set(k, []); bySz.get(k).push(p); }
  for (const [, group] of bySz) {
    if (group.length < T.gapPeers) continue;
    const m = mode(group.map((p) => Math.round(p.gap)));
    if (!m || m.n / group.length < T.sizeShare) continue;
    const peers = group.filter((p) => Math.round(p.gap) === m.value);
    for (const p of group) {
      if (Math.abs(p.gap - m.value) <= T.gapOff) continue;
      if (/between|around|evenly/.test(p.justify)) { refuse(p, 'I5', 'the row spreads its children (justify-between): the gap is not the icon\'s'); continue; }
      const byRow = p.rowGap > 0 && Math.abs(p.rowGap - p.gap) < 0.6;
      const byMargin = !byRow && p.at.margin && Math.abs(parseFloat(getComputedStyle(p.el)[p.label.side === 'before' ? 'marginRight' : 'marginLeft']) - p.gap) < 0.6;
      if (!byRow && !byMargin) { refuse(p, 'I5', 'the gap is made by padding or a space, not by a gap or margin class'); continue; }
      const cls = mode(peers.map((x) => (byRow ? x.at.gap : x.at.margin)).filter(Boolean))?.value ?? (byRow ? gapCls(m.value) : null);
      if (!cls) { refuse(p, 'I5', 'no peer shows the class that makes this gap'); continue; }
      move(p, 'I5', { gap: r1(p.gap), cls: byRow ? p.at.gap : p.at.margin }, { gap: m.value, cls }, { cls, from: byRow ? p.at.gap : p.at.margin, on: byRow ? 'row' : 'icon' }, { row: p.row });
    }
  }

  // I6 second library (§4): another origin than the main family, in a list with the main one; every icon of the instance mapped
  if (family?.origin && !family.mixed) {
    const strangers = svgs.filter((p) => p.origin !== family.origin && PKG[p.origin]);
    for (const p of strangers) {
      const key = p.origin === 'lucide' ? p.name : (ALIAS[p.name] ?? p.name);
      const mk = key ? family.markFor(key) : null;
      if (!mk || mk.no) { listed.push({ el: p.el, kind: 'svg', rule: 'I6', law: LAW.I6, why: mk?.no ?? `no mapping for ${p.name ?? 'an unnamed icon'}`, from: `${p.origin}${p.name ? `:${p.name}` : ''}` }); continue; }
      const mates = svgs.filter((x) => x.row?.parentElement === p.row?.parentElement && x.origin === family.origin);
      if (!mates.length && svgs.filter((x) => x.origin === family.origin).length < 3) { listed.push({ el: p.el, kind: 'svg', rule: 'I6', law: LAW.I6, why: 'not in a list with the main family', from: p.origin }); continue; }
      move(p, 'I6', { origin: p.origin, name: p.name, component: p.component }, { origin: family.origin, name: mk.name }, { import: mk.import ?? null, component: mk.component ?? mk.name, replaces: iconName(p), ...(mk.import ? {} : { renderer: true }) });
      note(p, { origin: family.origin });
    }
  }

  // I7 style mix (§4): a solid among lines (or the reverse) in one row of ≥ 3 peers; selected state is exempt
  const rowsOf = new Map();
  for (const p of svgs) { const k = p.row?.parentElement; if (!k || !p.style) continue; if (!rowsOf.has(k)) rowsOf.set(k, []); rowsOf.get(k).push(p); }
  for (const [, group] of rowsOf) {
    if (group.length < 3) continue;
    const m = mode(group.map((p) => p.style));
    if (!m || m.n === group.length) continue;
    for (const p of group) {
      if (p.style === m.value) continue;
      if (p.state) continue; // fill marks selection
      if (p.origin === 'heroicons' && p.name && /(solid|outline)$/.test(p.variant ?? '')) {
        const to = p.variant.replace(/(solid|outline)$/, m.value === 'solid' ? 'solid' : 'outline');
        move(p, 'I7', { style: p.style, variant: p.variant }, { style: m.value, variant: to }, { import: { from: `@heroicons/react/${to.replace('-', '/')}`, name: p.component }, replaces: iconName(p) });
        note(p, { style: m.value });
      } else listed.push({ el: p.el, kind: 'svg', rule: 'I7', law: LAW.I7, why: `${p.style} among ${m.value}: the set has no counterpart this pass can name`, from: p.style });
    }
  }

  // I8 emoji in a control, link or nav (§4 I8, §4.2): the family's mark, or listed. A colour circle is a dot, not an icon
  for (const p of emojis) {
    if (/^dot:/.test(p.key)) {
      move(p, 'I8', { emoji: p.emoji }, { dot: p.key.slice(4) }, { dot: p.key.slice(4), remove: p.emoji, form: p.form }, { label: p.label?.text ?? null });
      note(p, { gone: true });
      continue;
    }
    if (!p.label && !p.accessibleName) { listed.push({ el: p.el, kind: 'emoji', emoji: p.emoji, rule: 'I8', law: LAW.I8, why: 'it is the only content: it needs an aria-label first' }); continue; }
    const mk = family.markFor(p.key);
    if (!mk || mk.no) { listed.push({ el: p.el, kind: 'emoji', emoji: p.emoji, key: p.key, rule: 'I8', law: LAW.I8, why: mk?.no ?? family.reason ?? 'no mark yet', label: p.label?.text ?? null, ...(p.conflict ? { warn: p.conflict } : {}) }); continue; }
    const px = family.sizes?.[Math.round(p.label?.size ?? p.size)]?.px ?? null;
    const cls = family.sizes?.[Math.round(p.label?.size ?? p.size)]?.cls ?? (px ? sizeCls(px) : null);
    if (!cls) { listed.push({ el: p.el, kind: 'emoji', emoji: p.emoji, key: p.key, rule: 'I8', law: LAW.I8, why: 'the app has no icon size for this text size', label: p.label?.text ?? null }); continue; }
    move(p, 'I8', { emoji: p.emoji, label: p.label?.text ?? null }, { name: mk.name, size: px, ...(p.status ? { dot: true } : {}) },
      { ...(mk.import ? { import: mk.import } : { component: mk.component, prop: { name: mk.name } }), cls: `${cls} shrink-0`, aria: p.label ? 'aria-hidden' : null, remove: p.emoji, form: p.form, ...(p.status ? { dot: true } : {}) },
      { label: p.label?.text ?? null, ...(p.conflict ? { warn: p.conflict } : {}) });
    note(p, { gone: true });
  }

  // I9 icon-only hit region (§4, WCAG 2.5.8): a control that holds an icon alone and is under 24px
  const hit = SPEC.rule('craft/hit-target').min ? Math.min(T.hit, SPEC.rule('craft/hit-target').min) : T.hit;
  for (const p of svgs) {
    if (!p.iconOnly || !p.control) continue;
    const c = p.control, r = c.getBoundingClientRect(), short = Math.min(r.width, r.height);
    if (short >= hit) {
      if (!(c.getAttribute('aria-label') || c.getAttribute('title') || c.getAttribute('aria-labelledby') || p.el.getAttribute('aria-label') || p.el.querySelector('title'))) listed.push({ el: p.el, kind: 'svg', rule: 'unlabelled', law: LAW.unlabelled, why: 'an icon alone with no accessible name: it needs an aria-label (the pass never removes a label)' });
      continue;
    }
    const parentText = (c.parentElement?.textContent ?? '').replace(c.textContent ?? '', '').replace(/\s+/g, ' ').trim();
    if (c.closest('p, li, td') && parentText.length > 20) { refuse(p, 'I9', 'a control inside dense text'); continue; }
    const pad = parseFloat(getComputedStyle(c).paddingLeft) || 0, need = Math.ceil((hit - short) / 2) + pad, was = utility(c, 'p');
    const size = utility(c, 'size');
    if (size) move(p, 'I9', { target: r1(short), cls: size }, { target: hit, cls: 'size-6' }, { cls: 'size-6', from: size, on: 'control' }, { control: c });
    else move(p, 'I9', { target: r1(short), cls: was }, { target: hit }, { cls: padCls(need), from: was, on: 'control' }, { control: c });
    if (!(c.getAttribute('aria-label') || c.getAttribute('title') || c.getAttribute('aria-labelledby'))) listed.push({ el: p.el, kind: 'svg', rule: 'unlabelled', law: LAW.unlabelled, why: 'an icon alone with no accessible name: it needs an aria-label' });
  }

  // an icon that is being swapped for another is not also tuned: the new one takes the family's size and stroke (I6, I7)
  const swapped = new Set(moves.filter((m) => m.rule === 'I6' || m.rule === 'I7').map((m) => m.el));
  for (let i = moves.length - 1; i >= 0; i--) if (swapped.has(moves[i].el) && !/^I[67]$/.test(moves[i].rule)) moves.splice(i, 1);
  for (const p of swapped) moved.set(p, { origin: moved.get(p)?.origin, style: moved.get(p)?.style });

  // measure (§5.5): distinct icon sizes, strokes, styles, and the emoji left, before → after
  const after = (p, k) => moved.get(p)?.[k];
  const sizes = [new Set(svgs.map((p) => Math.round(p.size))), new Set(svgs.map((p) => Math.round(after(p, 'size') ?? p.size)))];
  const strokes = [new Set(svgs.filter((p) => p.stroke !== null).map((p) => grain(p.stroke))), new Set(svgs.filter((p) => p.stroke !== null).map((p) => grain(after(p, 'stroke') ?? p.stroke)))];
  const styles = [new Set(svgs.map((p) => `${p.origin}|${p.style}`)), new Set(svgs.map((p) => `${after(p, 'origin') ?? p.origin}|${after(p, 'style') ?? p.style}`))];
  const measure = {
    sizes: [sizes[0].size, sizes[1].size], strokes: [strokes[0].size, strokes[1].size], styles: [styles[0].size, styles[1].size],
    emoji: [emojis.length, emojis.filter((p) => !moved.get(p)?.gone).length],
  };
  const touched = new Set([...moves.map((m) => m.el), ...listed.map((l) => l.el), ...refused.map((r) => r.el)]);
  const kept = {
    count: places.filter((p) => !touched.has(p.el)).length, listed,
    onSystem: svgs.filter((p) => !touched.has(p.el)).length, family: family?.id ?? null,
  };
  return { moves, kept, refused, measure, content: places.content ?? 0 };
}
