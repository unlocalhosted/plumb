// Craft and polish: an example for each check, the way the design-system checks have theirs (check-motion.js).
// Each entry: the line of code before and after, a sentence for each state, and the scene (a stage → a spec the
// tiles' player runs: at(p) sets broken (0) or fixed (1), track() puts the guides where the scene is now).
import { at, make, ringAround, pillOver, pillUnder, gapY, gapX, box, charBox, chip, shadowReach, shadowOffsetY } from '../check-kit.js';
// a line across from x1 to x2 at y, or down from y1 to y2 at x
const lineH = (el, y, x1, x2) => at(el, `top:${y}px;left:${x1}px;width:${x2 - x1}px;right:auto`);
const lineV = (el, x, y1, y2, extra = '') => at(el, `left:${x}px;top:${y1}px;height:${y2 - y1}px;bottom:auto;${extra}`);

const scene = (s, html, bg = '') => { s.innerHTML = `<div class="ck-scene"${bg ? ` style="background:${bg}"` : ''}>${html}</div>`; };
const G = (s, ...cls) => cls.map((c) => make(s, c));
const ringed = (s, x, labels, pad = 7, dy = 18, under = false) => {
  const [ring, pill] = G(s, 'ring', 'pill');
  return { labels, guides: [{ el: ring, kind: 'ring' }, { el: pill, kind: 'pill' }], track: () => { ringAround(ring, x, s, pad); (under ? pillUnder : pillOver)(pill, x, s, dy); } };
};

export const CRAFT = {
  'craft/concentric-radius': {
    code: ['rounded-[20px] inside p-2', 'rounded-xl inside p-2'],
    note: ['The inner corner copies the outer one, so the rim between them swells at every corner.', 'Inner corner is the outer one less the padding: the two curves run side by side.'],
    scene: (s) => {
      scene(s, '<div class="o" style="width:180px;padding:8px;border-radius:20px;background:#e0e7ff"><div class="x" style="height:92px;border-radius:20px;background:#fff;display:grid;place-items:center;font:600 13px system-ui;color:#3730a3">Pro plan</div></div>');
      const o = s.querySelector('.o'), x = s.querySelector('.x'), [arc, pill] = G(s, 'arc', 'pill');
      return { from: 20, to: 12, unit: 'px', name: '20 − 8', guides: [{ el: arc, kind: 'ring' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.borderRadius = p ? '12px' : '20px'; },
        track: () => { const b = box(x, s), rad = parseFloat(getComputedStyle(x).borderTopLeftRadius), d = Math.max(12, rad * 2) + 10; at(arc, `left:${b.l - 5}px;top:${b.t - 5}px;width:${d}px;height:${d}px;border-top-left-radius:${rad + 5}px`); pillOver(pill, o, s, 18); } };
    },
  },
  'craft/inner-outer-spacing': {
    code: ['label mb-[18px]', 'label mb-1.5'],
    note: ['Each label sits as far from its field as the fields sit from each other: nothing says which goes with which.', 'Label and field close, pairs apart: the form reads as two questions.'],
    scene: (s) => {
      scene(s, `<div style="display:grid;gap:14px;width:180px;font:500 13px system-ui;color:#374151">${['Email', 'Password'].map((w) => `<label style="display:grid"><span class="lb" style="margin-bottom:18px">${w}</span><span class="in" style="height:30px;border-radius:8px;box-shadow:inset 0 0 0 1px #d1d5db;background:#fff"></span></label>`).join('')}</div>`);
      const lbs = [...s.querySelectorAll('.lb')], inp = s.querySelector('.in'), g = G(s, 'hl', 'hl', 'beam', 'pill');
      return { from: 18, to: 6, unit: 'px', guides: [{ el: g[0], kind: 'h' }, { el: g[1], kind: 'h' }, { el: g[2], kind: 'beam' }, { el: g[3], kind: 'pill' }],
        at: (p) => { for (const l of lbs) l.style.marginBottom = p ? '6px' : '18px'; },
        track: () => { const a = box(lbs[0], s), b = box(inp, s); gapY(s, g, a.b, b.t, a.l - 10); } };
    },
  },
  'craft/hairline': {
    code: ['border-b-2 border-gray-400', 'border-b border-gray-200'],
    note: ['Heavy dividers are louder than the rows they divide.', 'A hairline keeps the rows apart without shouting over them.'],
    scene: (s) => {
      scene(s, `<div class="lst" style="width:190px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:500 13px system-ui;color:#111827">${['Invoices', 'Members', 'Settings'].map((w, i) => `<div class="${i < 2 ? 'rw' : ''}" style="padding:10px 14px;${i < 2 ? 'border-bottom:2px solid #9ca3af' : ''}">${w}</div>`).join('')}</div>`, '#f9fafb');
      const rows = [...s.querySelectorAll('.rw')], marks = rows.map(() => make(s, 'sq')), pill = make(s, 'pill');
      // a box round each divider itself, the line the check is about
      return { from: 2, to: 1, unit: 'px', name: 'hairline', guides: [...marks.map((el) => ({ el, kind: 'beam' })), { el: pill, kind: 'pill' }],
        at: (p) => { for (const r of rows) r.style.borderBottom = p ? '1px solid #e5e7eb' : '2px solid #9ca3af'; },
        track: () => { rows.forEach((r, i) => { const b = box(r, s), bw = parseFloat(getComputedStyle(r).borderBottomWidth); at(marks[i], `left:${b.l - 4}px;top:${b.b - bw - 4}px;width:${b.w + 8}px;height:${bw + 8}px;border-radius:5px`); }); at(pill, `left:${box(rows[0], s).r + 12}px;top:${box(rows[0], s).b}px;translate:0 -50%`); } };
    },
  },
  'craft/image-outline': {
    code: ['<img> on white', 'outline outline-black/10 -outline-offset-1'],
    note: ['White photos on a white page: you can’t tell where a picture ends.', 'A faint outline inside the picture gives it an edge on any background.'],
    scene: (s) => {
      scene(s, `<div class="row" style="display:flex;gap:16px">${[['Mug', '38px', '34px', '6px 6px 16px 16px'], ['Vase', '26px', '50px', '13px 13px 8px 8px']].map(([w, iw, ih, r]) => `<figure style="margin:0;display:grid;gap:6px;font:500 12px system-ui;color:#374151"><div class="ph" style="width:96px;height:84px;border-radius:10px;background:#fff;display:grid;place-items:center;box-shadow:inset 0 0 0 1px rgb(0 0 0 / 0)"><i style="width:${iw};height:${ih};border-radius:${r};background:linear-gradient(#f4f4f5,#e4e4e7)"></i></div>${w} · $24</figure>`).join('')}</div>`);
      const phs = [...s.querySelectorAll('.ph')], edges = phs.map(() => make(s, 'sq')), pill = make(s, 'pill');
      // dashes exactly on each picture's edge: the edge you can't see until it has an outline
      return { labels: ['no edge', 'outline, 10%'], guides: [...edges.map((el) => ({ el, kind: 'beam' })), { el: pill, kind: 'pill' }],
        at: (p) => { for (const x of phs) x.style.boxShadow = `inset 0 0 0 1px rgb(0 0 0 / ${p ? 0.1 : 0})`; },
        track: () => { phs.forEach((x, i) => { const b = box(x, s); at(edges[i], `left:${b.l}px;top:${b.t}px;width:${b.w}px;height:${b.h}px;border-radius:10px;border-style:dashed`); }); pillOver(pill, s.querySelector('.row'), s, 18); } };
    },
  },
  'craft/layered-shadow': {
    code: ['shadow-[0_22px_40px_rgb(0_0_0/.35)]', 'shadow-card'],
    note: ['One big blur reads as a smudge under the card, not a card off the page.', 'Small, tight shadows stacked: the card has an edge and a weight.'],
    scene: (s) => {
      const one = '0 22px 40px -4px rgb(0 0 0 / .35), 0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0)', layered = '0 1px 2px rgb(0 0 0 / .08), 0 4px 10px -2px rgb(0 0 0 / .08), 0 12px 24px -8px rgb(0 0 0 / .14)';
      scene(s, `<div class="x" style="width:150px;height:84px;border-radius:14px;background:#fff;display:grid;place-items:center;font:600 13px system-ui;color:#111827;box-shadow:${one}">Team plan</div>`, '#f4f4f5');
      const x = s.querySelector('.x'), [reach, pill] = G(s, 'sq', 'pill');
      // dashes where the shadow reaches: a wide smudge, then a tight edge
      return { labels: ['one 40px blur', 'shadow-card'], guides: [{ el: reach, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.boxShadow = p ? layered : one; },
        track: () => { const b = box(x, s), e = shadowReach(x); at(reach, `left:${b.l - e.x}px;top:${b.t - e.top}px;width:${b.w + e.x * 2}px;height:${b.h + e.top + e.bottom}px;border-radius:${14 + e.x}px;border-style:dashed`); at(pill, `left:${b.l + b.w / 2}px;top:${b.t - e.top - 14}px`); } };
    },
  },
  'craft/content-align': {
    code: ['ml-1.5', 'ml-0'],
    note: ['The heading starts 6px in from its text: the column has two left edges.', 'Heading and text start on one edge.'],
    scene: (s) => {
      scene(s, '<div style="width:190px;font:400 13px/1.5 system-ui;color:#4b5563"><h4 class="x" style="margin:0 0 6px 6px;font:700 17px system-ui;color:#111827">Release notes</h4><p class="bd" style="margin:0">Faster search, a dark theme, and fixes for the export.</p></div>');
      const x = s.querySelector('.x'), bd = s.querySelector('.bd'), g = G(s, 'vl', 'vl', 'hbeam', 'pill');
      return { from: 6, to: 0, unit: 'px', guides: [{ el: g[0], kind: 'v' }, { el: g[1], kind: 'v' }, { el: g[2], kind: 'beam' }, { el: g[3], kind: 'pill' }],
        at: (p) => { x.style.marginLeft = p ? '0px' : '6px'; },
        track: () => { const a = box(bd, s), b = box(x, s); gapX(s, g, a.l, b.l, b.t - 12); at(g[3], `left:${a.l - 10}px;top:${b.t - 12}px;translate:-100% -50%`); } };
    },
  },
  'craft/button-padding': {
    code: ['px-1.5', 'px-4'],
    note: ['The words nearly touch the edges: Save looks squeezed next to Cancel.', 'The same sides as Cancel: the two read as a pair.'],
    scene: (s) => {
      scene(s, '<div style="display:flex;gap:10px"><span class="btn2" style="background:#fff;color:#111827;box-shadow:inset 0 0 0 1px #d1d5db;padding:0 16px;height:36px">Cancel</span><span class="btn2 x" style="background:#4f46e5;padding:0 6px;height:36px"><span class="t">Save</span></span></div>');
      const x = s.querySelector('.x'), t = s.querySelector('.t'), g = G(s, 'vl', 'vl', 'hbeam', 'pill');
      return { from: 6, to: 16, unit: 'px', guides: [{ el: g[0], kind: 'v' }, { el: g[1], kind: 'v' }, { el: g[2], kind: 'beam' }, { el: g[3], kind: 'pill' }],
        at: (p) => { x.style.padding = p ? '0 16px' : '0 6px'; },
        track: () => { const a = box(x, s), b = box(t, s); gapX(s, g, a.l, b.l, a.b + 14); at(g[3], `left:${(a.l + b.l) / 2}px;top:${a.b + 36}px`); } };
    },
  },
  'craft/leading': {
    code: ['leading-[1.1]', 'leading-normal'],
    note: ['Lines this close make the eye slip onto the wrong line.', 'Room between the lines lets the eye find the next one.'],
    scene: (s) => {
      scene(s, '<p class="x" style="margin:0;width:180px;font:400 13px/1.1 system-ui;color:#374151">Plumber reads your page the way a designer would, then fixes what it finds in your code.</p>');
      const x = s.querySelector('.x'), g = G(s, 'hl', 'hl', 'beam', 'pill');
      return { from: 1.1, to: 1.5, step: 0.1, fmt: (v) => v.toFixed(1), unit: '', guides: [{ el: g[0], kind: 'h' }, { el: g[1], kind: 'h' }, { el: g[2], kind: 'beam' }, { el: g[3], kind: 'pill' }],
        at: (p) => { x.style.lineHeight = p ? '1.5' : '1.1'; },
        track: () => { const b = box(x, s), lh = parseFloat(getComputedStyle(x).lineHeight); gapY(s, g, b.t + lh, b.t + 2 * lh, b.l - 10); } };
    },
  },
  'craft/tracking': {
    code: ['tracking-[0.08em]', 'tracking-tight'],
    note: ['Big type spaced like small type falls apart into letters.', 'Big type set tighter reads as one word.'],
    scene: (s) => {
      scene(s, '<p class="x" style="margin:0;font:800 32px/1.1 system-ui;letter-spacing:0.08em;color:#111827">Pricing</p>');
      const x = s.querySelector('.x'), [sq, pill] = G(s, 'sq', 'pill');
      return { from: 0.08, to: -0.02, step: 0.01, fmt: (v) => v.toFixed(2), unit: 'em', guides: [{ el: sq, kind: 'ring' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.letterSpacing = p ? '-0.02em' : '0.08em'; },
        track: () => { ringAround(sq, x, s, 6); sq.style.borderStyle = 'dashed'; pillUnder(pill, x, s, 24); } };
    },
  },
  'craft/one-light': {
    code: ['shadow-[0_-6px_14px…]', 'shadow-card'],
    note: ['One card is lit from below while its neighbours are lit from above.', 'One light for the page: every shadow falls the same way.'],
    scene: (s) => {
      const down = '0 6px 14px -4px rgb(0 0 0 / .28)', up = '0 -6px 14px -4px rgb(0 0 0 / .28)';
      scene(s, `<div style="display:flex;gap:16px">${[0, 1, 2].map((i) => `<div class="cd${i === 1 ? ' x' : ''}" style="width:68px;height:60px;border-radius:12px;background:#fff;box-shadow:${i === 1 ? up : down}"></div>`).join('')}</div>`, '#f4f4f5');
      const cards = [...s.querySelectorAll('.cd')], x = s.querySelector('.x'), dots = cards.map(() => make(s, 'sq')), pill = make(s, 'pill');
      // a mark on the side each shadow falls: two below, one above, until it joins them
      return { labels: ['lit from below', 'shadow-card'], guides: [...dots.map((el) => ({ el, kind: 'beam' })), { el: pill, kind: 'pill' }],
        at: (p) => { x.style.boxShadow = p ? down : up; },
        track: () => { cards.forEach((c, i) => { const b = box(c, s), oy = shadowOffsetY(c), y = b.t + b.h / 2 + (b.h / 2 + 12) * Math.max(-1, Math.min(1, oy / 6)); at(dots[i], `left:${b.l + b.w / 2 - 5}px;top:${y - 5}px;width:10px;height:10px;border-radius:50%;background:var(--c);border:0`); }); pillUnder(pill, x, s, 36); } };
    },
  },
  'craft/tabular-nums': {
    code: ['proportional figures', 'tabular-nums'],
    note: ['Each digit is its own width, so the amounts don’t line up to compare.', 'Every digit one width: the column lines up.'],
    scene: (s) => {
      scene(s, `<div class="x" style="font:600 17px/1.65 system-ui;font-variant-numeric:proportional-nums;text-align:right;color:#111827">${['$1,111.11', '$48,200.00', '$904.50', '$17.71'].map((n) => `<div>${n}</div>`).join('')}</div>`);
      const x = s.querySelector('.x'), ref = x.children[1].firstChild, n = ref.length;
      // the columns of the longest amount, drawn down the whole list (as the Number columns tile does): with digits
      // of their own widths the other rows cross the lines; with one width they fall between them
      const ticks = Array.from({ length: 7 }, (_, k) => [ref, n - 1 - k, make(s, 'vl')]);
      const pill = make(s, 'pill');
      return { labels: ['proportional', 'tabular-nums'], guides: [...ticks.map((t) => ({ el: t[2], kind: 'v' })), { el: pill, kind: 'pill' }],
        at: (p) => { x.style.fontVariantNumeric = p ? 'tabular-nums' : 'proportional-nums'; },
        track: () => { const X = box(x, s); for (const [t, i, el] of ticks) { const c = charBox(t, i, s); lineV(el, c.l, X.t - 8, X.b + 8); } pillUnder(pill, x, s, 22); } };
    },
  },
  'craft/pair-spacing': {
    code: ['mt-3 mb-7', 'mt-6 mb-1.5'],
    note: ['The heading sits nearer the line above than the text it introduces.', 'Closer to its own text than to the one before: it reads as that text’s heading.'],
    scene: (s) => {
      scene(s, '<div style="width:190px;font:400 13px/1.45 system-ui;color:#4b5563"><p style="margin:0">Your plan renews on 1 December.</p><h4 class="x" style="margin:12px 0 28px;font:700 15px system-ui;color:#111827">Payment method</h4><p class="nx" style="margin:0">Visa ending 4242, expires 08/27.</p></div>');
      const x = s.querySelector('.x'), nx = s.querySelector('.nx'), g = G(s, 'hl', 'hl', 'beam', 'pill');
      return { from: 28, to: 6, unit: 'px', guides: [{ el: g[0], kind: 'h' }, { el: g[1], kind: 'h' }, { el: g[2], kind: 'beam' }, { el: g[3], kind: 'pill' }],
        at: (p) => { x.style.margin = p ? '22px 0 6px' : '12px 0 28px'; },
        track: () => { const a = box(x, s), b = box(nx, s); gapY(s, g, a.b, b.t, a.l - 10); } };
    },
  },
};

// ── the second dozen and more ─────────────────────────────────
const four = (g) => [{ el: g[0], kind: g[0].classList.contains('vl') ? 'v' : 'h' }, { el: g[1], kind: g[1].classList.contains('vl') ? 'v' : 'h' }, { el: g[2], kind: 'beam' }, { el: g[3], kind: 'pill' }];
const sun = (w, h) => `<div class="art" style="position:absolute;inset:0;background:linear-gradient(#bae6fd,#e0f2fe 60%,#86efac 60%)"><i style="position:absolute;left:${w * 0.62}px;top:${h * 0.18}px;width:${h * 0.32}px;height:${h * 0.32}px;border-radius:50%;background:#fbbf24"></i><i style="position:absolute;left:${w * 0.12}px;bottom:${h * 0.4}px;width:${w * 0.42}px;height:${h * 0.32}px;background:#16a34a;clip-path:polygon(0 100%,50% 0,100% 100%)"></i></div>`;
Object.assign(CRAFT, {
  'craft/text-opacity': {
    code: ['text-black/45', 'text-muted'],
    note: ['See-through words take the colour of what’s under them: grey on white, almost gone on blue.', 'A muted colour made for each surface reads the same on both.'],
    scene: (s) => {
      scene(s, `<div style="display:flex;gap:12px">${[['#fff', '#111827', 'Draft'], ['#1e3a8a', '#fff', 'Live']].map(([bg, ink, t], i) => `<div style="width:118px;padding:14px;border-radius:12px;background:${bg};color:${ink};box-shadow:inset 0 0 0 1px rgb(0 0 0 / .08);display:grid;gap:4px;font:600 14px system-ui">${t}<span class="m${i}" style="font:500 12px system-ui;color:#000;opacity:.45">Edited 2h ago</span></div>`).join('')}</div>`, '#f9fafb');
      const m0 = s.querySelector('.m0'), m1 = s.querySelector('.m1'), [a, b, pill] = G(s, 'sq', 'sq', 'pill');
      // the same line on two grounds: see-through, it is two different colours
      return { labels: ['black at 45%', 'muted'], chip: (i) => chip(i ? '#a5b4fc' : 'rgb(0 0 0 / .45)'), guides: [{ el: a, kind: 'beam' }, { el: b, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { m0.style.cssText += p ? ';color:#6b7280;opacity:1' : ';color:#000;opacity:.45'; m1.style.cssText += p ? ';color:#a5b4fc;opacity:1' : ';color:#000;opacity:.45'; },
        track: () => { for (const [el, m] of [[a, m0], [b, m1]]) { const B = box(m, s); at(el, `left:${B.l - 4}px;top:${B.t - 3}px;width:${B.w + 8}px;height:${B.h + 6}px;border-style:dashed`); } const B0 = box(m0, s), B1 = box(m1, s); at(pill, `left:${(B0.l + B1.r) / 2}px;top:${B0.b + 34}px`); } };
    },
  },
  'craft/half-pixel': {
    code: ['left-1/2 -translate-x-1/2 (141px wide)', 'snapped to a whole pixel'],
    note: ['Centred on half a pixel, the words smear across two rows of pixels (shown magnified).', 'On a whole pixel, every edge is sharp.'],
    scene: (s) => {
      scene(s, '<div style="display:grid;justify-items:center;gap:10px"><span class="x" style="padding:8px 14px;border-radius:10px;background:#111827;color:#fff;font:600 22px system-ui;filter:blur(.8px);translate:3px 0">Link copied</span><small style="font:500 11px system-ui;color:#6b7280">magnified: each line is one pixel</small></div>');
      const x = s.querySelector('.x'), [grid, edge, pill] = G(s, 'sq', 'vl', 'pill');
      x.style.translate = '0 0'; const home = box(x, s).l; x.style.translate = '3px 0';
      // the pixel grid under the tooltip's edge: half a pixel off, the edge falls between two lines and blurs
      return { labels: ['x = 70.5px', 'x = 70px'], guides: [{ el: grid, kind: 'beam' }, { el: edge, kind: 'v' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.filter = p ? 'blur(0px)' : 'blur(.8px)'; x.style.translate = p ? '0 0' : '3px 0'; },
        track: () => { const b = box(x, s); at(grid, `left:${home - 24}px;top:${b.t - 10}px;width:48px;height:${b.h + 20}px;border:0;border-radius:0;background:repeating-linear-gradient(90deg, color-mix(in oklab, var(--c) 55%, transparent) 0 1px, transparent 1px 6px)`); lineV(edge, b.l, b.t - 16, b.b + 16); at(pill, `left:${b.l}px;top:${b.t - 28}px`); } };
    },
  },
  'craft/scale-from-zero': {
    code: ['from scale-0', 'from scale-95, fading in'],
    note: ['Grown from a dot, the menu seems to come from nowhere.', 'Starting near full size, it simply arrives where it belongs.'],
    scene: (s) => {
      scene(s, '<div style="position:relative;width:170px;height:120px"><div class="x" style="position:absolute;inset:0;border-radius:12px;background:#fff;box-shadow:0 10px 30px -10px rgb(0 0 0 / .35),0 0 0 1px rgb(0 0 0 / .06);display:grid;align-content:center;gap:6px;padding:0 14px;font:500 13px system-ui;color:#111827"><span>Rename</span><span>Duplicate</span><span style="color:#dc2626">Delete</span></div></div>');
      const x = s.querySelector('.x'), [start, pill] = G(s, 'sq', 'pill');
      let from = 0;
      // the opening plays slowed down while the guides are up, so you watch where it starts
      const open = () => x.animate([{ scale: from, opacity: 0 }, { scale: 1, opacity: 1 }], { duration: 760, easing: 'cubic-bezier(.2,.8,.2,1)', delay: 120 });
      // dashes where the menu starts its opening: a point, then nearly its own size
      return { from: 0, to: 0.95, step: 0.05, fmt: (v) => v.toFixed(2), unit: '', name: 'scale', guides: [{ el: start, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { from = p ? 0.95 : 0; open(); },
        track: () => { const b = box(x.parentElement, s), w = Math.max(6, b.w * from), h = Math.max(6, b.h * from); at(start, `left:${b.l + (b.w - w) / 2}px;top:${b.t + (b.h - h) / 2}px;width:${w}px;height:${h}px;border-radius:${from ? 12 : 50}px;border-style:dashed`); pillUnder(pill, x.parentElement, s, 24); } };
    },
  },
  'craft/z-index-war': {
    code: ['z-[99999] (help button)', 'z-raised'],
    note: ['The help button was typed 99999, so it sits on the toast that says your work was saved.', 'On its own layer, under messages: the toast reads in full.'],
    scene: (s) => {
      scene(s, '<div style="position:relative;width:240px;height:150px;border-radius:12px;background:#f3f4f6;overflow:hidden"><div style="position:absolute;left:14px;top:14px;right:14px;display:grid;gap:8px"><i style="height:10px;border-radius:5px;background:#e5e7eb"></i><i style="height:10px;width:70%;border-radius:5px;background:#e5e7eb"></i></div><div class="t" style="position:absolute;left:40px;right:16px;bottom:18px;padding:10px 12px;border-radius:10px;background:#111827;color:#fff;font:500 12px system-ui;z-index:50">Saved. All changes are live.</div><div class="x" style="position:absolute;right:12px;bottom:12px;width:40px;height:40px;border-radius:50%;background:#4f46e5;color:#fff;display:grid;place-items:center;font:700 16px system-ui;box-shadow:0 6px 16px -4px rgb(0 0 0 / .4);z-index:99999">?</div></div>');
      const x = s.querySelector('.x'), t = s.querySelector('.t'), [lap, pill] = G(s, 'sq', 'pill');
      // a box on where the two overlap: whichever is on top there is the question
      return { labels: ['button 99999 › toast 50', 'toast 50 › button 10'], curve: 'steps(1, jump-end)', guides: [{ el: lap, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.zIndex = p ? 10 : 99999; },
        track: () => { const a = box(x, s), b = box(t, s), l = Math.max(a.l, b.l), r = Math.min(a.r, b.r), tp = Math.max(a.t, b.t), bt = Math.min(a.b, b.b); at(lap, `left:${l - 3}px;top:${tp - 3}px;width:${r - l + 6}px;height:${bt - tp + 6}px;border-style:dashed`); at(pill, `left:${(a.l + b.l) / 2 + 10}px;top:${b.t - 18}px`); } };
    },
  },
  'craft/icon-side': {
    code: ['pl-4 with an icon', 'pl-3 with an icon'],
    note: ['The icon brings its own space, so the left side looks wider than the right.', 'A little less on the icon’s side: both sides look equal.'],
    scene: (s) => {
      scene(s, '<span class="btn2 x" style="background:#4f46e5;padding:0 16px 0 16px;gap:8px;height:38px"><svg class="ic" viewBox="0 0 24 24" width="18" height="18"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>New project</span>');
      const x = s.querySelector('.x'), ic = s.querySelector('.ic'), g = G(s, 'vl', 'vl', 'hbeam', 'pill');
      return { from: 16, to: 12, unit: 'px', guides: four(g), at: (p) => { x.style.paddingLeft = p ? '12px' : '16px'; },
        track: () => { const a = box(x, s), b = box(ic, s); gapX(s, g, a.l, b.l + 3, a.b + 14); at(g[3], `left:${a.l - 8}px;top:${a.b + 14}px;translate:-100% -50%`); } };
    },
  },
  'craft/measure': {
    code: ['max-w-none (≈ 100 characters a line)', 'max-w-prose (65)'],
    note: ['A hundred letters a line: the eye loses its place on the way back (shown small).', 'Around 65 letters: each line is easy to follow back to the start.'],
    scene: (s) => {
      scene(s, '<div style="width:300px;height:150px;display:grid;place-items:start;overflow:hidden"><p class="x" style="margin:0;width:700px;transform-origin:0 0;scale:.42;font:400 15px/1.6 system-ui;color:#374151">Plumber reads your page the way a designer would. It looks at the type, the spacing and the colour, finds what has drifted from your system, and offers a fix you can take with one click. Every change lands in your code, at the line that made it, so what you see is what you ship. Nothing is rewritten that you did not choose.</p></div>');
      const x = s.querySelector('.x'), g = G(s, 'vl', 'vl', 'hbeam', 'pill');
      return { from: 100, to: 65, unit: 'ch', guides: four(g), at: (p) => { x.style.width = p ? '455px' : '700px'; },
        track: () => { const b = box(x, s); gapX(s, g, b.l, b.r, b.t - 10); at(g[3], `left:${(b.l + b.r) / 2}px;top:${b.b + 16}px`); } };
    },
  },
  'craft/border-on-shadow': {
    code: ['border-black/25', 'border-subtle (solid)'],
    note: ['A see-through border darkens where the shadow is under it: the edge is heavier at the bottom.', 'A solid border is one weight all the way round.'],
    scene: (s) => {
      scene(s, '<div class="x" style="width:150px;height:84px;border-radius:14px;background:#fff;border:2px solid rgb(0 0 0 / .25);box-shadow:0 12px 22px -6px rgb(0 0 0 / .45);display:grid;place-items:center;font:600 13px system-ui;color:#111827">Invoice #204</div>', '#f4f4f5');
      const x = s.querySelector('.x'), [topEdge, botEdge, pill] = G(s, 'sq', 'sq', 'pill');
      // the border at its top and at its bottom: see-through, the bottom is darker where the shadow is under it
      return { labels: ['black at 25%', 'border-subtle'], chip: (i) => chip(i ? '#d4d4d8' : 'rgb(0 0 0 / .25)'), guides: [{ el: topEdge, kind: 'beam' }, { el: botEdge, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.borderColor = p ? '#d4d4d8' : 'rgb(0 0 0 / .25)'; },
        track: () => { const b = box(x, s); at(topEdge, `left:${b.l + b.w / 2 - 22}px;top:${b.t - 4}px;width:44px;height:10px;border-radius:5px`); at(botEdge, `left:${b.l + b.w / 2 - 22}px;top:${b.b - 6}px;width:44px;height:10px;border-radius:5px`); at(pill, `left:${b.r + 14}px;top:${b.t + b.h / 2}px;translate:0 -50%`); } };
    },
  },
  'craft/words-on-layers': {
    code: ['text-gray-900 over the fill', 'text that turns white over the fill'],
    note: ['As the fill slides under the words, they go dark on blue and can’t be read.', 'Where the fill is, the words turn white: they read at every percent.'],
    scene: (s) => {
      scene(s, '<div class="bar" style="position:relative;width:220px;height:36px;border-radius:10px;background:#e5e7eb;overflow:hidden;font:600 13px/36px system-ui;text-align:center"><i class="f" style="position:absolute;inset:0 40% 0 0;background:#4f46e5"></i><span class="tx" style="position:relative;color:#111827">Uploading 60%</span><span class="w" style="position:absolute;inset:0;color:#fff;clip-path:inset(0 40% 0 0);opacity:0">Uploading 60%</span></div>');
      const w = s.querySelector('.w'), f = s.querySelector('.f'), tx = s.querySelector('.tx'), [edge, lap, pill] = G(s, 'vl', 'sq', 'pill');
      // the fill's edge, and the part of the words that sits on the fill
      return { labels: ['one colour', 'follows the fill'], guides: [{ el: edge, kind: 'v' }, { el: lap, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { w.style.opacity = p ? 1 : 0; },
        track: () => { const F = box(f, s), T = box(tx, s); lineV(edge, F.r, F.t - 14, F.b + 14); at(lap, `left:${T.l - 3}px;top:${T.t + 6}px;width:${F.r - T.l + 3}px;height:${T.h - 12}px;border-style:dashed`); at(pill, `left:${F.r}px;top:${F.t - 24}px`); } };
    },
  },
  'craft/media-size': {
    code: ['size-9 (one avatar)', 'size-8'],
    note: ['One avatar is a size bigger than the rest: it looks like a mistake, not a choice.', 'One size down the list.'],
    scene: (s) => {
      scene(s, `<div style="display:grid;gap:8px;width:180px">${[['Ana', '#f472b6'], ['Sam', '#60a5fa'], ['Kai', '#34d399']].map(([n, c], i) => `<div style="display:flex;align-items:center;gap:10px;font:600 13px system-ui;color:#111827"><i class="${i === 1 ? 'x' : ''}" style="width:${i === 1 ? 38 : 30}px;height:${i === 1 ? 38 : 30}px;border-radius:50%;background:${c};flex:none"></i>${n}</div>`).join('')}</div>`);
      const x = s.querySelector('.x'), [sq, pill] = G(s, 'sq', 'pill');
      return { from: 38, to: 30, unit: 'px', guides: [{ el: sq, kind: 'ring' }, { el: pill, kind: 'pill' }], at: (p) => { x.style.width = x.style.height = p ? '30px' : '38px'; },
        track: () => { const b = box(x, s); at(sq, `left:${b.l - 3}px;top:${b.t - 3}px;width:${b.w + 6}px;height:${b.h + 6}px`); at(pill, `left:${b.l - 10}px;top:${b.t + b.h / 2}px;translate:-100% -50%`); } };
    },
  },
  'craft/image-fit': {
    code: ['w-full h-24 (no fit)', 'object-cover'],
    note: ['Given a box of a different shape, the picture is pulled out of shape to fill it.', 'Cropped to fill: the sun stays round.'],
    scene: (s) => {
      scene(s, `<div class="bx" style="position:relative;width:220px;height:100px;border-radius:12px;overflow:hidden"><div class="x" style="position:absolute;left:0;top:0;width:120px;height:100px;transform-origin:0 0;scale:1.833 1">${sun(120, 100)}</div></div>`);
      const x = s.querySelector('.x'), sunEl = x.querySelector('i'), [round, pill] = G(s, 'sq', 'pill');
      // an outline on the sun: an oval while the picture is pulled, a circle once it is cropped
      return { labels: ['stretched', 'object-cover'], guides: [{ el: round, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.scale = p ? '1.833' : '1.833 1'; },
        track: () => { const b = box(sunEl, s); at(round, `left:${b.l - 4}px;top:${b.t - 4}px;width:${b.w + 8}px;height:${b.h + 8}px;border-radius:50%;border-style:dashed`); pillOver(pill, s.querySelector('.bx'), s, 16); } };
    },
  },
  'craft/image-ground': {
    code: ['no colour under the picture', 'bg-gray-800 under the picture'],
    note: ['The picture hasn’t loaded: white words on a pale box, gone.', 'A dark colour waits under the picture, so the words read before it arrives.'],
    scene: (s) => {
      scene(s, '<div class="x" style="position:relative;width:230px;height:110px;border-radius:12px;background:#f3f4f6;display:grid;align-content:end;padding:14px;box-sizing:border-box;color:#fff;font:800 20px system-ui">Summer sale<span style="font:500 12px system-ui">Up to 40% off</span><i style="position:absolute;right:10px;top:10px;font:500 10px system-ui;color:#9ca3af;font-style:normal">picture not loaded</i></div>');
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['nothing under it', 'gray-800 under it'], 8, 20), chip: (i) => chip(i ? '#1f2937' : 'repeating-conic-gradient(#d1d5db 0 25%, #fff 0 50%) 0 0 / 6px 6px'), at: (p) => { x.style.background = p ? '#1f2937' : '#f3f4f6'; } };
    },
  },
  'craft/sticky-room': {
    code: ['sticky, stretched to the row', 'sticky self-start'],
    note: ['Stretched as tall as its row, the side panel has nowhere to slide, so it scrolls away.', 'As tall as its content: the dotted room is where it slides while you scroll.'],
    scene: (s) => {
      scene(s, '<div style="display:grid;grid-template-columns:70px 1fr;gap:10px;width:230px;height:150px"><div style="position:relative;border-radius:10px;background:radial-gradient(color-mix(in oklab, var(--pl-butter) 85%, transparent) .8px, transparent 1px) 0 0 / 4px 4px"><div class="x" style="height:150px;border-radius:10px;background:#e0e7ff;font:600 11px system-ui;color:#3730a3;padding:8px;box-sizing:border-box">On this page</div></div><div style="display:grid;gap:8px;align-content:start">' + '<i style="height:12px;border-radius:6px;background:#e5e7eb"></i>'.repeat(7) + '</div></div>');
      const x = s.querySelector('.x');
      return { from: 150, to: 60, unit: 'px', name: 'self-start', ...((() => { const [sq, pill] = G(s, 'sq', 'pill'); return { guides: [{ el: sq, kind: 'ring' }, { el: pill, kind: 'pill' }], track: () => { const b = box(x, s); at(sq, `left:${b.l - 3}px;top:${b.t - 3}px;width:${b.w + 6}px;height:${b.h + 6}px`); at(pill, `left:${b.l + b.w / 2}px;top:${b.b + 16}px`); } }; })()),
        at: (p) => { x.style.height = p ? '60px' : '150px'; } };
    },
  },
  // ── from CSS Protips (docs/research/harvests/css-protips/tips.md). Each scene is real markup with the fault on it ──
  'craft/image-broken': {
    code: ['<img src="/team-photo.png">  (nothing there)', '<img src="/team.png">'],
    note: ['The address returns nothing, so the page shows a hole and the alt words.', 'The picture is there.'],
    scene: (s) => {
      scene(s, '<img class="x" alt="The team at the offsite" src="data:image/png;base64,AAAA" style="display:block;width:190px;height:110px;border-radius:10px;background:#f3f4f6;font:500 12px system-ui;color:#6b7280">');
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['didn’t load', 'loaded'], 6), at: (p) => { x.src = p ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" : 'data:image/png;base64,AAAA'; x.style.background = p ? '#c7d2fe' : '#f3f4f6'; } };
    },
  },
  'craft/empty-box': {
    code: ['<p class="error">', '<p class="error empty:hidden">'],
    note: ['There is no error, yet its red box is drawn between the field and the button.', 'With nothing to say, it takes no room.'],
    scene: (s) => {
      scene(s, '<div style="display:grid;gap:10px;width:220px;font:500 13px system-ui;color:#111827"><span style="height:34px;border-radius:8px;box-shadow:inset 0 0 0 1px #d1d5db;display:flex;align-items:center;padding:0 10px;color:#6b7280">name@example.com</span><p class="x" style="margin:0;padding:10px 12px;min-height:14px;border-radius:8px;background:#fef2f2"></p><span class="btn2" style="justify-content:center;height:34px;background:#4f46e5">Continue</span></div>');
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['empty, still drawn', 'takes no room'], 5), at: (p) => { x.style.display = p ? 'none' : ''; } };
    },
  },
  'craft/link-in-text': {
    code: ['<a class="text-indigo-600">', '<a class="text-indigo-600 underline">'],
    note: ['The link differs from the sentence by colour alone.', 'Underlined, it reads as a link to everyone.'],
    scene: (s) => {
      scene(s, '<p style="width:260px;margin:0;font:400 14px/1.55 system-ui;color:#374151">Read the <a class="x" href="#terms" style="color:#4f46e5;text-decoration:none">terms of service</a> before you continue with the upgrade to the team plan.</p>');
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['colour alone', 'underlined'], 3), at: (p) => { x.style.textDecoration = p ? 'underline' : 'none'; } };
    },
  },
  'craft/last-divider': {
    code: ['<li class="border-b">  on every row', '<ul class="[&>*:last-child]:border-b-0">'],
    note: ['The last row’s line doubles the box’s own edge.', 'Lines sit between rows only.'],
    scene: (s) => {
      scene(s, `<ul class="x" style="list-style:none;margin:0;padding:0;width:220px;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;font:500 13px system-ui;color:#111827">${['Profile', 'Billing', 'Members'].map((t) => `<li style="padding:9px 12px;border-bottom:1px solid #cbd5e1">${t}</li>`).join('')}</ul>`);
      const x = s.querySelector('.x'), last = x.lastElementChild;
      return { ...ringed(s, last, ['a line after the last row', 'between rows only'], 3, 18, true), at: (p) => { last.style.borderBottomWidth = p ? '0' : '1px'; } };
    },
  },
  'craft/box-overflow': {
    code: ['box-content w-full px-4', 'box-border w-full px-4'],
    note: ['Told to fill its parent, with its padding added on top: it sticks out by 32px.', 'Padding counts inside the width, so it fits.'],
    scene: (s) => {
      scene(s, '<div style="width:190px;padding:10px 0;border-radius:10px;background:#f3f4f6"><div class="x" style="box-sizing:content-box;width:100%;padding:8px 16px;background:#c7d2fe;font:500 13px system-ui;color:#1e1b4b">Usage this month</div></div>');
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['sticks out 32px', 'fits'], 4), at: (p) => { x.style.boxSizing = p ? 'border-box' : 'content-box'; } };
    },
  },
  'craft/icon-soft': {
    code: ['<img src="icon.png">  24px file, drawn at 24px', '<img src="icon.svg">'],
    note: ['A sharp screen needs 48 pixels here and the file has fewer: the icon reads soft.', 'A vector is sharp at any size.'],
    scene: (s) => {
      scene(s, '<span style="display:flex;align-items:center;gap:8px;font:500 14px system-ui;color:#111827"><img class="x" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" style="width:24px;height:24px;border-radius:6px;background:#818cf8"> Export</span>');
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['too few pixels', 'a vector'], 5), at: (p) => { x.src = p ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='%234f46e5'/%3E%3C/svg%3E" : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="; x.style.background = p ? 'none' : '#818cf8'; } };
    },
  },
  'craft/css-words': {
    code: ['after:content-[\'New\']', '<span>New</span>'],
    note: ['“New” is drawn by CSS: it can’t be selected, copied or translated.', 'Written in the page, it is text like the rest.'],
    scene: (s) => {
      scene(s, '<style>.ck-new::after{content:"New";margin-left:8px;padding:1px 6px;border-radius:6px;background:#d1fae5;color:#065f46;font-size:11px}</style><span class="x ck-new" style="font:600 14px system-ui;color:#111827">Reports</span>');
      const x = s.querySelector('.x'), real = Object.assign(document.createElement('b'), { textContent: 'New' });
      real.style.cssText = 'margin-left:8px;padding:1px 6px;border-radius:6px;background:#d1fae5;color:#065f46;font:600 11px system-ui';
      return { ...ringed(s, x, ['drawn by CSS', 'in the page'], 5), at: (p) => { x.classList.toggle('ck-new', !p); if (p) x.append(real); else real.remove(); } };
    },
  },
  'craft/type-viewport': {
    code: ['text-[2.4vw]', 'text-[clamp(1rem,2.4vw,2rem)]'],
    note: ['Sized by the window alone: zooming the page leaves this heading the same size.', 'With ends that follow the text size, it grows when the person zooms.'],
    scene: (s) => {
      scene(s, '<style>.ck-vw{font-size:2.4vw}</style><div class="x ck-vw" style="font-family:system-ui;font-weight:700;color:#111827;white-space:nowrap">Quarterly review</div>');
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['follows the window only', 'follows your text size'], 5), at: (p) => { x.classList.toggle('ck-vw', !p); x.style.fontSize = p ? 'clamp(1rem, 2.4vw, 2rem)' : ''; } };
    },
  },
  'craft/br-spacing': {
    code: ['line one<br><br>line two', '<p>line one</p><p>line two</p>'],
    note: ['The gap is a blank line: no spacing step sets it.', 'The gap is a margin, on your scale.'],
    scene: (s) => {
      scene(s, '<p class="x" style="width:240px;margin:0;font:400 14px/1.5 system-ui;color:#374151"><span>Ship to the office on Hill Street.</span><br><br class="y"><span class="z">Bill to the address on file.</span></p>');
      const x = s.querySelector('.x'), y = s.querySelector('.y'), z = s.querySelector('.z');
      return { ...ringed(s, x, ['a blank line as the gap', 'a margin'], 5), at: (p) => { if (p) { y.remove(); z.style.cssText = 'display:block;margin-top:12px'; } else { z.before(y); z.style.cssText = ''; } } };
    },
  },
  'craft/native-accent': {
    code: ['<input type="checkbox">', '<input type="checkbox" class="accent-emerald-600">'],
    note: ['The tick is the browser’s blue, beside buttons in your green.', 'The tick wears your colour.'],
    scene: (s) => {
      scene(s, '<div style="display:grid;gap:14px;justify-items:start;font:500 13px system-ui;color:#111827"><label style="display:flex;align-items:center;gap:8px"><input class="x" type="checkbox" checked style="width:18px;height:18px;margin:0"> Email me the weekly summary</label><div style="display:flex;gap:8px"><button type="button" style="height:32px;padding:0 14px;border:0;border-radius:8px;background:#059669;color:#fff;font:600 13px system-ui">Save</button><button type="button" style="height:32px;padding:0 14px;border:0;border-radius:8px;background:#059669;color:#fff;font:600 13px system-ui">Save and close</button></div></div>');
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['the browser’s blue', 'your green'], 5), at: (p) => { x.style.accentColor = p ? '#059669' : ''; } };
    },
  },
  'craft/scroll-on-demand': {
    code: ['overflow-y-scroll', 'overflow-y-auto'],
    note: ['Three rows fit, yet a scrollbar says there is more.', 'The bar shows only when there is more to see.'],
    scene: (s) => {
      scene(s, '<div class="bx" style="position:relative;width:200px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:500 13px system-ui;color:#111827;overflow:hidden"><div class="ct" style="display:grid">' + ['Inbox', 'Starred', 'Sent'].map((w) => `<span style="padding:9px 14px">${w}</span>`).join('') + '</div><i class="x" style="position:absolute;right:3px;top:4px;bottom:4px;width:8px;border-radius:4px;background:#f3f4f6;box-shadow:inset 0 0 0 1px #e5e7eb"><b style="position:absolute;left:1px;right:1px;top:1px;height:70%;border-radius:3px;background:#c7c9d1"></b></i></div>');
      const x = s.querySelector('.x'), ct = s.querySelector('.ct'), bx = s.querySelector('.bx'), [end, edge, bar, pill] = G(s, 'hl', 'hl', 'sq', 'pill');
      // where the content ends and where the box ends are one line: there is nothing more, yet a bar is drawn
      return { labels: ['always shown', 'when needed'], guides: [{ el: end, kind: 'h' }, { el: edge, kind: 'h' }, { el: bar, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.opacity = p ? 0 : 1; },
        track: () => { const C = box(ct, s), B = box(bx, s), X = box(x, s); lineH(end, C.b, B.l - 16, B.r + 16); lineH(edge, B.b + 1, B.l - 16, B.r + 16); at(bar, `left:${X.l - 3}px;top:${X.t - 3}px;width:${X.w + 6}px;height:${X.h + 6}px;border-style:dashed`); at(pill, `left:${X.r + 14}px;top:${X.t + X.h / 2}px;translate:0 -50%`); } };
    },
  },
  'craft/declared-gap': {
    code: ['justify-between, no gap', 'gap-2'],
    note: ['The space between the buttons is whatever is left over; on a narrow screen that’s nothing.', 'A gap of its own: the buttons never touch.'],
    scene: (s) => {
      scene(s, '<div style="display:flex;justify-content:space-between;align-items:center;width:210px;padding:10px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:700 14px system-ui;color:#111827">Projects<span class="x" style="display:flex;gap:0"><span class="btn2 a" style="height:30px;padding:0 10px;font-size:12px;background:#fff;color:#111827;box-shadow:inset 0 0 0 1px #d1d5db">Import</span><span class="btn2 b" style="height:30px;padding:0 10px;font-size:12px;background:#4f46e5">New</span></span></div>');
      const x = s.querySelector('.x'), a = s.querySelector('.a'), b = s.querySelector('.b'), g = G(s, 'vl', 'vl', 'hbeam', 'pill');
      return { from: 0, to: 8, unit: 'px', name: 'gap-2', guides: four(g), at: (p) => { x.style.gap = p ? '8px' : '0px'; },
        track: () => { const A = box(a, s), B = box(b, s); gapX(s, g, A.r, B.l, A.b + 16); at(g[3], `left:${(A.r + B.l) / 2}px;top:${A.b + 38}px`); } };
    },
  },
  'craft/list-wrap': {
    code: ['flex (no wrap)', 'flex flex-wrap'],
    note: ['Five tags from your data, one row: the last ones run out of the card.', 'Told to wrap, a long list takes a second row.'],
    scene: (s) => {
      scene(s, '<div class="bx" style="width:190px;padding:12px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #d1d5db;font:700 13px system-ui;color:#111827;display:grid;gap:8px">Design system<div class="x" style="display:flex;gap:6px;flex-wrap:nowrap">' + ['tokens', 'type', 'colour', 'motion', 'icons'].map((t) => `<span class="badge" style="padding:0 8px;font-size:11px;flex:none">${t}</span>`).join('') + '</div></div>');
      const x = s.querySelector('.x'), bx = s.querySelector('.bx'), [edge, pill] = G(s, 'vl', 'pill');
      // the card's inner edge: the tags run past it until they wrap
      return { labels: ['nowrap', 'flex-wrap'], guides: [{ el: edge, kind: 'v' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.flexWrap = p ? 'wrap' : 'nowrap'; },
        track: () => { const B = box(bx, s); lineV(edge, B.r - 12, B.t - 14, B.b + 14); at(pill, `left:${B.r - 12}px;top:${B.t - 26}px`); } };
    },
  },
  'craft/image-stretch': {
    code: ['w-14 (height from the row)', 'size-14 self-start'],
    note: ['Given only a width, the picture stretches to the row’s height and the sun turns into an egg.', 'A height of its own: the picture keeps its shape.'],
    scene: (s) => {
      scene(s, `<div style="display:flex;gap:12px;width:230px;padding:10px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb"><div class="x" style="position:relative;width:56px;height:100px;flex:none;border-radius:8px;overflow:hidden"><div class="in" style="position:absolute;left:0;top:0;width:56px;height:56px;transform-origin:0 0;scale:1 1.79">${sun(56, 56)}</div></div><div style="display:grid;gap:4px;align-content:start;font:500 12px/1.4 system-ui;color:#4b5563"><b style="font:700 13px system-ui;color:#111827">Morning hike</b>Up the ridge before the heat, back by ten, coffee at the top.</div></div>`);
      const x = s.querySelector('.x'), inn = s.querySelector('.in'), g = G(s, 'hl', 'hl', 'beam', 'pill');
      // a line where the square picture should end, and one where the row pulls it to: the beam is the stretch, and it closes
      return { from: 44, to: 0, unit: 'px', name: 'size-14', guides: four(g),
        at: (p) => { x.style.height = p ? '56px' : '100px'; inn.style.scale = p ? '1' : '1 1.79'; },
        track: () => { const b = box(x, s); at(g[0], `top:${b.t + b.w}px;left:${b.l - 14}px;width:${b.w + 28}px;right:auto`); at(g[1], `top:${b.b}px;left:${b.l - 14}px;width:${b.w + 28}px;right:auto`); at(g[2], `left:${b.l - 18}px;top:${b.t + b.w}px;height:${Math.max(0, b.b - b.t - b.w)}px`); at(g[3], `left:${b.l - 24}px;top:${(b.t + b.w + b.b) / 2}px;translate:-100% -50%`); } };
    },
  },
  'craft/background-tile': {
    code: ['bg-[url(beach.jpg)]', 'bg-cover bg-no-repeat'],
    note: ['The photo repeats like wallpaper: you see its seams.', 'One photo, covering the box.'],
    scene: (s) => {
      scene(s, '<div class="x" style="width:230px;height:110px;border-radius:12px;background-image:linear-gradient(#bae6fd,#e0f2fe 55%,#fde68a 55%);background-size:76px 55px;box-shadow:inset 0 0 0 1px rgb(0 0 0 / .06);display:grid;place-items:center;font:800 18px system-ui;color:#0c4a6e">Book a stay</div>');
      const x = s.querySelector('.x'), cols = [0, 1, 2].map(() => make(s, 'vl')), rows = [0].map(() => make(s, 'hl')), pill = make(s, 'pill');
      // a line on every seam between copies of the photo: they slide out to the edges as it becomes one picture
      return { labels: ['repeats', 'cover, no-repeat'], guides: [...cols.map((el) => ({ el, kind: 'v' })), ...rows.map((el) => ({ el, kind: 'h' })), { el: pill, kind: 'pill' }],
        at: (p) => { x.style.backgroundSize = p ? '230px 110px' : '76px 55px'; },
        track: () => { const b = box(x, s), [tw, th] = getComputedStyle(x).backgroundSize.split(' ').map(parseFloat); cols.forEach((el, k) => { const xx = b.l + tw * (k + 1); lineV(el, Math.min(xx, b.r), b.t, b.b); el.style.opacity = xx < b.r - 1 ? '' : '0'; }); rows.forEach((el, k) => { const yy = b.t + th * (k + 1); lineH(el, Math.min(yy, b.b), b.l, b.r); el.style.opacity = yy < b.b - 1 ? '' : '0'; }); pillOver(pill, x, s, 16); } };
    },
  },
  'craft/fixed-column': {
    code: ['grid-cols-[96px_1fr]', 'grid-cols-1 sm:grid-cols-[96px_1fr]'],
    note: ['On a phone, the fixed label column leaves the field a sliver.', 'One column where two don’t fit: the label sits over its field.'],
    scene: (s) => {
      scene(s, '<div style="width:150px;padding:12px;border-radius:18px;background:#fff;box-shadow:inset 0 0 0 2px #111827"><div class="x" style="display:grid;grid-template-columns:96px 1fr;gap:6px;align-items:center;font:600 12px system-ui;color:#374151">Billing email<span class="f" style="height:28px;border-radius:7px;box-shadow:inset 0 0 0 1px #d1d5db"></span></div></div>');
      const x = s.querySelector('.x'), f = s.querySelector('.f'), g = G(s, 'vl', 'vl', 'hbeam', 'pill');
      const fw = (c) => { x.style.transition = 'none'; x.style.gridTemplateColumns = c; const w = box(f, s).w; x.style.transition = ''; return Math.round(w); };
      const narrow = fw('96px 1fr'), full = fw('1fr'); x.style.gridTemplateColumns = '96px 1fr';
      // the field's width, end to end: a sliver beside the fixed column, the full width in one
      return { from: narrow, to: full, unit: 'px', name: 'one column', guides: four(g),
        at: (p) => { x.style.gridTemplateColumns = p ? '1fr' : '96px 1fr'; },
        track: () => { const b = box(f, s); gapX(s, g, b.l, b.r, b.b + 14); at(g[3], `left:${b.l + b.w / 2}px;top:${b.b + 34}px`); } };
    },
  },
  'craft/scrollbar-gutter': {
    code: ['(no gutter)', 'scrollbar-gutter: stable'],
    note: ['When the list grows a scrollbar, everything centred shifts 8px left (dashes: where it was).', 'Room kept for the bar: nothing moves when it comes.'],
    scene: (s) => {
      scene(s, '<div style="position:relative;width:220px;height:120px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;overflow:hidden"><i style="position:absolute;right:3px;top:4px;bottom:4px;width:8px;border-radius:4px;background:#e5e7eb"></i><div style="position:absolute;inset:0 0 0 0;display:grid;place-items:center"><div style="position:relative"><span style="position:absolute;inset:-4px -6px;border:1.5px dashed #a5b4fc;border-radius:8px"></span><b class="x" style="display:block;font:700 16px system-ui;color:#111827;translate:-8px 0">Settings</b></div></div></div>');
      const x = s.querySelector('.x');
      return { from: 8, to: 0, unit: 'px', ...((() => { const [ring, pill] = G(s, 'ring', 'pill'); return { guides: [{ el: ring, kind: 'ring' }, { el: pill, kind: 'pill' }], track: () => { ringAround(ring, x, s, 8); pillUnder(pill, x, s, 30); } }; })()),
        at: (p) => { x.style.translate = p ? '0 0' : '-8px 0'; } };
    },
  },
  'craft/bold-hover': {
    code: ['hover:font-bold', 'hover:font-bold, width kept'],
    note: ['Bold is wider: on hover, Docs grows and pushes Pricing over.', 'Room for the bold is kept, so nothing beside it moves.'],
    scene: (s) => {
      scene(s, '<div style="display:flex;gap:18px;font:400 15px system-ui;color:#111827"><span>Home</span><span class="d" style="font-weight:700">Docs</span><span class="pr" style="margin-left:0">Pricing</span></div><i style="position:absolute;left:50%;top:calc(50% + 18px);translate:-50% 0;font:500 11px system-ui;color:#6b7280;font-style:normal">pointer on Docs</i>');
      const pr = s.querySelector('.pr'), d = s.querySelector('.d'), [l, m, beam, pill] = G(s, 'vl', 'vl', 'hbeam', 'pill');
      const rest = () => { const old = d.style.fontWeight; d.style.transition = 'none'; d.style.fontWeight = '400'; const x = box(pr, s).l; d.style.fontWeight = old; return x; };
      let home = 0;
      return { from: 4, to: 0, unit: 'px', guides: four([l, m, beam, pill]),
        at: (p) => { pr.style.marginLeft = '0px'; if (!home) home = rest(); pr.style.translate = p ? `${-(box(pr, s).l - home)}px 0` : '0 0'; },
        track: () => { const b = box(pr, s); gapX(s, [l, m, beam, pill], home || b.l, b.l, b.t - 8); at(pill, `left:${b.l + b.w / 2}px;top:${b.b + 34}px`); } };
    },
  },
  'craft/caps-case': {
    code: ['uppercase', 'uppercase, case features on'],
    note: ['In capitals, the dash and brackets sit at the height of small letters: they hang low.', 'The font’s case forms lift them to sit with the capitals.'],
    scene: (s) => {
      scene(s, '<p class="x" style="margin:0;font:800 26px system-ui;color:#111827;letter-spacing:.01em">SALE – (50% OFF)</p>');
      const x = s.querySelector('.x'), [cap, mid, base, pill] = G(s, 'hl', 'hl', 'hl', 'pill');
      // the capitals' top, middle and baseline: the dash and brackets belong on the middle line
      return { labels: ['case off', 'case on'], guides: [{ el: cap, kind: 'h' }, { el: base, kind: 'h' }, { el: mid, kind: 'h' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.fontFeatureSettings = p ? '"case" 1' : 'normal'; },
        track: () => { const m = capMid(x, s), b = box(x, s); lineH(cap, m.cap, b.l - 10, b.r + 10); lineH(base, m.base, b.l - 10, b.r + 10); lineH(mid, m.mid, b.l - 10, b.r + 10); mid.style.borderTop = '1.5px dashed var(--c)'; mid.style.background = 'none'; pillUnder(pill, x, s, 22); } };
    },
  },
  'craft/gradient-space': {
    code: ['from-blue-500 to-yellow-400', 'bg-linear-to-r/oklch'],
    note: ['Mixed in sRGB, blue and yellow meet in a muddy grey.', 'Mixed in OKLCH, the middle stays bright.'],
    scene: (s) => {
      scene(s, '<div class="x" style="width:240px;height:70px;border-radius:12px;background:linear-gradient(to right in srgb, #3b82f6, #facc15)"></div>');
      const x = s.querySelector('.x'), [mid, pill] = G(s, 'vl', 'pill');
      // the middle of the gradient, and its colour in the pill
      return { labels: ['in sRGB', 'in OKLCH'], chip: (i) => chip(`color-mix(in ${i ? 'oklch' : 'srgb'}, #3b82f6, #facc15)`), guides: [{ el: mid, kind: 'v' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.background = `linear-gradient(to right in ${p ? 'oklch' : 'srgb'}, #3b82f6, #facc15)`; },
        track: () => { const b = box(x, s); lineV(mid, b.l + b.w / 2, b.t - 14, b.b + 14); at(pill, `left:${b.l + b.w / 2}px;top:${b.b + 28}px`); } };
    },
  },
  'craft/anchor-offset': {
    code: ['(no scroll margin)', 'scroll-mt-12'],
    note: ['Jump to “Billing” and the heading lands under the sticky header.', 'Room for the header: the heading lands just below it.'],
    scene: (s) => {
      scene(s, '<div style="position:relative;width:220px;height:140px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;overflow:hidden"><div style="position:absolute;left:0;right:0;top:0;height:34px;background:rgb(255 255 255 / .92);box-shadow:0 1px 0 #e5e7eb;z-index:2;display:flex;align-items:center;padding:0 12px;font:700 12px system-ui;color:#111827;backdrop-filter:blur(4px)">Account</div><div class="x" style="position:absolute;left:12px;right:12px;top:14px;display:grid;gap:6px"><b style="font:700 16px system-ui;color:#111827">Billing</b><i style="height:9px;border-radius:5px;background:#e5e7eb"></i><i style="height:9px;width:70%;border-radius:5px;background:#e5e7eb"></i></div></div>');
      const x = s.querySelector('.x');
      return { from: 14, to: 46, unit: 'px', name: 'scroll-mt-12', ...((() => { const [ring, pill] = G(s, 'ring', 'pill'); return { guides: [{ el: ring, kind: 'ring' }, { el: pill, kind: 'pill' }], track: () => { ringAround(ring, x.firstElementChild, s, 5); pillUnder(pill, x, s, 20); } }; })()),
        at: (p) => { x.style.top = p ? '46px' : '14px'; } };
    },
  },
  'craft/continuous-corners': {
    code: ['rounded-3xl (a circle’s arc)', 'corner-shape: squircle'],
    note: ['A circle’s arc meets the straight edge with a kink you can feel at this size.', 'A corner that eases into its curve looks softer, like a phone’s icon.'],
    scene: (s) => {
      const c = (k, h) => `M${k} 0 H${120 - k} C${120 - k + h} 0 120 ${k - h} 120 ${k} V${120 - k} C120 ${120 - k + h} ${120 - k + h} 120 ${120 - k} 120 H${k} C${k - h} 120 0 ${120 - k + h} 0 ${120 - k} V${k} C0 ${k - h} ${k - h} 0 ${k} 0 Z`;
      const arc = c(30, 13.4), sq = c(44, 30);
      scene(s, `<svg class="sv" viewBox="-2 -2 124 124" width="124" height="124"><path class="x" d="${arc}" fill="#6366f1" style="d:path('${arc}')"/></svg>`);
      const x = s.querySelector('.x'), sv = s.querySelector('.sv'), [circle, pill] = G(s, 'arc', 'pill');
      // a true circle's arc drawn on the corner: the eased corner leaves it, starting its curve earlier and softer
      return { labels: ['circle arc', 'squircle'], guides: [{ el: circle, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.d = `path('${p ? sq : arc}')`; },
        track: () => { const b = box(sv, s); at(circle, `left:${b.l + 2 - 4}px;top:${b.t + 2 - 4}px;width:${60 + 8}px;height:${60 + 8}px;border-top-left-radius:${30 + 4}px;border-width:1.5px`); at(pill, `left:${b.l}px;top:${b.t - 18}px`); } };
    },
  },
  'craft/optical-sizing': {
    code: ['font-optical-sizing: none', 'font-optical-sizing: auto'],
    note: ['With optical size off, a big headline is drawn with the small-text cut: thick and loose.', 'On, the headline gets its display cut: finer strokes, tighter fit.'],
    scene: (s) => {
      scene(s, '<p class="x" style="margin:0;font:600 40px/1 system-ui;color:#111827;font-variation-settings:\'opsz\' 12">Quarterly</p>');
      const x = s.querySelector('.x'), g = G(s, 'vl', 'vl', 'hbeam', 'pill');
      const wide = (v) => { x.style.transition = 'none'; x.style.fontVariationSettings = `'opsz' ${v}`; const w = box(x, s).w; x.style.transition = ''; return Math.round(w); };
      const w12 = wide(12), w40 = wide(40); x.style.fontVariationSettings = "'opsz' 12";
      // the word's width, end to end: the small-text cut sets it wide and loose, the display cut fits it
      return { from: w12, to: w40, unit: 'px', name: 'display cut', guides: four(g),
        at: (p) => { x.style.fontVariationSettings = p ? "'opsz' 40" : "'opsz' 12"; },
        track: () => { const b = box(x, s); gapX(s, g, b.l, b.r, b.b + 12); at(g[3], `left:${b.l + b.w / 2}px;top:${b.b + 32}px`); } };
    },
  },
});

// ── the last of Craft ─────────────────────────────────────────
// the middle of a line's capitals, from its box (as the Text size tile measures it)
const capMid = (el, s) => { const b = box(el, s), fs = parseFloat(getComputedStyle(el).fontSize), base = b.t + (b.h + fs * 0.72) / 2; return { base, cap: base - fs * 0.72, mid: base - fs * 0.36 }; };
const measured = (s, x, fromTo, unit, getY, side = 'left', name = '') => { const g = G(s, 'hl', 'hl', 'beam', 'pill'); return { from: fromTo[0], to: fromTo[1], unit, name, guides: four(g), track: () => { const [y1, y2, xx] = getY(); gapY(s, g, y1, y2, xx); } }; };
Object.assign(CRAFT, {
  'craft/tinted-shadow': {
    code: ['shadow-black/35 on indigo', 'shadow-indigo-950/50'],
    note: ['A grey shadow on a coloured ground looks like dirt.', 'Shadows on colour take the colour, darker: the card sits in the light of its page.'],
    scene: (s) => {
      scene(s, '<div class="x" style="width:150px;height:88px;border-radius:14px;background:#fff;box-shadow:0 14px 26px -6px rgb(0 0 0 / .45);display:grid;place-items:center;font:600 13px system-ui;color:#312e81">Upgrade</div>', '#818cf8');
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['grey on colour', 'tinted'], 12, 24), at: (p) => { x.style.boxShadow = `0 14px 26px -6px ${p ? 'rgb(30 27 75 / .55)' : 'rgb(0 0 0 / .45)'}`; } };
    },
  },
  'craft/eased-scrim': {
    code: ['from-transparent to-black/70', 'an eased scrim (8 stops)'],
    note: ['The dark fade under the words starts on a line you can see.', 'Eased, it drops in fast then slow: no edge, the words still read.'],
    scene: (s) => {
      const hard = 'linear-gradient(rgb(0 0 0 / 0) 46%, rgb(0 0 0 / .72) 72%)', soft = 'linear-gradient(rgb(0 0 0 / 0) 25%, rgb(0 0 0 / .02) 35%, rgb(0 0 0 / .07) 45%, rgb(0 0 0 / .16) 55%, rgb(0 0 0 / .3) 65%, rgb(0 0 0 / .47) 75%, rgb(0 0 0 / .62) 87%, rgb(0 0 0 / .72) 100%)';
      scene(s, `<div class="bx" style="position:relative;width:230px;height:124px;border-radius:12px;overflow:hidden">${sun(230, 124)}<i class="x" style="position:absolute;inset:0;background:${hard}"></i><b style="position:absolute;left:12px;bottom:10px;font:800 17px system-ui;color:#fff">Alpine trails</b></div>`);
      const x = s.querySelector('.x'), bx = s.querySelector('.bx'), [line, pill] = G(s, 'hl', 'pill');
      let on = 0;
      // a line on the row where the fade begins: you can see it, until the fade eases in from nothing
      return { labels: ['hard edge', 'eased'], guides: [{ el: line, kind: 'h' }, { el: pill, kind: 'pill' }],
        at: (p) => { on = p; x.style.background = p ? soft : hard; },
        track: () => { const b = box(bx, s), y = b.t + b.h * (on ? 0.25 : 0.46); lineH(line, y, b.l - 12, b.r + 12); line.style.opacity = on ? 0.35 : ''; at(pill, `left:${b.r + 12}px;top:${y}px;translate:0 -50%`); } };
    },
  },
  'craft/pure-black-white': {
    code: ['bg-white', 'bg-surface'],
    note: ['Every surface here is a warm off-white; one card is pure white and glares.', 'On your surface colour, it sits with the others.'],
    scene: (s) => {
      scene(s, `<div style="display:flex;gap:12px">${[0, 1, 2].map((i) => `<div class="${i === 1 ? 'x' : ''}" style="width:70px;height:86px;border-radius:12px;background:${i === 1 ? '#ffffff' : '#fbf8f3'};box-shadow:0 1px 2px rgb(60 40 20 / .1)"></div>`).join('')}</div>`, '#efe9df');
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['#ffffff', 'surface'], 8, 20), chip: (i) => chip(i ? '#fbf8f3' : '#ffffff'), at: (p) => { x.style.background = p ? '#fbf8f3' : '#ffffff'; } };
    },
  },
  'craft/content-size': {
    code: ['w-24', 'min-w-24 (width from its words)'],
    note: ['Fixed at 96px, the Spanish label breaks onto two lines and spills.', 'A minimum, not a fixed width: the button fits its words in any language.'],
    scene: (s) => {
      scene(s, '<div style="display:flex;gap:10px;align-items:center"><span class="btn2" style="width:96px;justify-content:center;padding:0;height:auto;min-height:38px;background:#4f46e5">Save</span><span class="btn2 x" style="width:96px;justify-content:center;padding:6px 0;height:auto;min-height:38px;background:#4f46e5;line-height:1.2;text-align:center;box-sizing:border-box">Guardar cambios</span></div>');
      const x = s.querySelector('.x'), g = G(s, 'vl', 'vl', 'hbeam', 'pill');
      // the button's width, end to end: fixed at 96, then as wide as its words
      return { from: 96, to: 148, unit: 'px', name: 'fits its words', guides: four(g),
        at: (p) => { x.style.width = p ? '148px' : '96px'; x.style.padding = p ? '6px 16px' : '6px 0'; },
        track: () => { const b = box(x, s); gapX(s, g, b.l, b.r, b.t - 12); at(g[3], `left:${b.l + b.w / 2}px;top:${b.t - 30}px`); } };
    },
  },
  'craft/baseline-align': {
    code: ['items-center', 'items-baseline'],
    note: ['Centred, the small words float halfway up the big price.', 'On one baseline, price and period read as one line.'],
    scene: (s) => {
      scene(s, '<div class="x" style="display:flex;align-items:center;gap:6px;color:#111827"><b class="big" style="font:800 40px/1 system-ui">$24</b><span class="sm" style="font:500 14px system-ui;color:#6b7280">/ month</span></div>');
      const x = s.querySelector('.x'), big = s.querySelector('.big'), sm = s.querySelector('.sm'), g = G(s, 'hl', 'hl', 'beam', 'pill');
      return { labels: ['items-center', 'items-baseline'], curve: 'steps(1, jump-end)', guides: four(g),
        at: (p) => { x.style.alignItems = p ? 'baseline' : 'center'; },
        track: () => { const a = capMid(big, s).base, b = capMid(sm, s).base, B = box(x, s); gapY(s, g, Math.min(a, b), Math.max(a, b), B.l - 10); } };
    },
  },
  'craft/icon-cap': {
    code: ['items-center (line box)', 'centred on the capitals'],
    note: ['Centred on the line box, the icon sits low against the words.', 'Centred on the capitals’ middle, where the eye reads it.'],
    scene: (s) => {
      scene(s, '<div style="display:flex;align-items:center;gap:8px;font:600 18px/2 system-ui;color:#b91c1c"><svg class="ic" viewBox="0 0 24 24" width="20" height="20" style="translate:0 4px"><circle cx="12" cy="12" r="10" fill="#dc2626"/><path d="M12 7v6M12 16.5v.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg><span class="t">Payment failed</span></div>');
      const ic = s.querySelector('.ic'), t = s.querySelector('.t');
      return { ...measured(s, ic, [4, 0], 'px', () => { const m = capMid(t, s).mid, b = box(ic, s); return [Math.min(m, b.t + b.h / 2), Math.max(m, b.t + b.h / 2) + 0.01, b.l - 10]; }), at: (p) => { ic.style.translate = p ? '0 0' : '0 4px'; } };
    },
  },
  'craft/trim-leading': {
    code: ['py-3, leading-loose', 'py-3, text-box: trim-both'],
    note: ['The line carries invisible room above its letters: 12px of padding looks like 24.', 'Trimmed to the letters, the padding you set is the padding you see.'],
    scene: (s) => {
      scene(s, '<div class="bx" style="padding:12px 18px;border-radius:12px;background:#ecfdf5;box-shadow:inset 0 0 0 1px #a7f3d0"><span class="x" style="display:block;font:600 15px/2.2 system-ui;color:#065f46">Your export is ready</span></div>');
      const x = s.querySelector('.x'), bx = s.querySelector('.bx');
      return { ...measured(s, x, [24, 12], 'px', () => { const B = box(bx, s); return [B.t, capMid(x, s).cap, B.l - 10]; }), at: (p) => { x.style.lineHeight = p ? '1' : '2.2'; } };
    },
  },
  'craft/heading-lead': {
    code: ['my-4', 'mt-7 mb-2'],
    note: ['The same space above and below: the heading floats between two paragraphs.', 'More above than below: it clearly opens what follows.'],
    scene: (s) => {
      scene(s, '<div style="width:190px;font:400 12.5px/1.45 system-ui;color:#4b5563"><p class="pv" style="margin:0">Exports run every night at two.</p><h4 class="x" style="margin:16px 0;font:700 15px system-ui;color:#111827">Notifications</h4><p style="margin:0">Choose what we email you about.</p></div>');
      const x = s.querySelector('.x'), pv = s.querySelector('.pv');
      return { ...measured(s, x, [16, 28], 'px', () => { const a = box(pv, s), b = box(x, s); return [a.b, b.t, a.l - 10]; }), at: (p) => { x.style.margin = p ? '28px 0 8px' : '16px 0'; } };
    },
  },
  'craft/card-optical-padding': {
    code: ['p-5', 'pt-4 px-5 pb-5'],
    note: ['The first line brings room above its capitals: equal padding looks taller on top.', 'A little less on top, and the card looks even.'],
    scene: (s) => {
      scene(s, '<div class="x" style="width:180px;padding:20px;border-radius:14px;background:#fff;box-shadow:0 1px 3px rgb(0 0 0 / .12),inset 0 0 0 1px #e5e7eb;font:400 13px/1.5 system-ui;color:#4b5563"><b class="t" style="display:block;font:700 15px/1.5 system-ui;color:#111827">Weekly digest</b>Every Monday at nine.</div>', '#f9fafb');
      const x = s.querySelector('.x'), t = s.querySelector('.t');
      return { ...measured(s, x, [20, 16], 'px', () => { const B = box(x, s); return [B.t, box(t, s).t, B.l - 10]; }), at: (p) => { x.style.paddingTop = p ? '16px' : '20px'; } };
    },
  },
  'craft/weight-levels': {
    code: ['font-black (900)', 'font-bold (700)'],
    note: ['Four weights on one card: the price shouts over the plan’s name.', 'Two weights, bold and regular: a clear order.'],
    scene: (s) => {
      scene(s, '<div style="width:170px;padding:16px;border-radius:14px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;display:grid;gap:2px;font:400 12.5px/1.5 system-ui;color:#4b5563"><b style="font:700 15px system-ui;color:#111827">Pro</b><span class="x" style="font:900 30px/1.1 system-ui;color:#111827">$24</span>per month, billed yearly</div>');
      const x = s.querySelector('.x'), [sq, pill] = G(s, 'sq', 'pill');
      return { from: 900, to: 700, step: 100, unit: '', name: 'bold', guides: [{ el: sq, kind: 'ring' }, { el: pill, kind: 'pill' }], at: (p) => { x.style.fontWeight = p ? 700 : 900; },
        track: () => { const b = box(x, s); at(sq, `left:${b.l - 4}px;top:${b.t - 3}px;width:${b.w + 8}px;height:${b.h + 6}px;border-style:dashed`); at(pill, `left:${b.r + 14}px;top:${b.t + b.h / 2}px;translate:0 -50%`); } };
    },
  },
  'craft/grey-levels': {
    code: ['text-gray-600 (a fourth grey)', 'text-muted'],
    note: ['A grey between your two greys: it reads as a slip, not a level.', 'Back on your muted grey: two levels, clearly apart.'],
    scene: (s) => {
      scene(s, '<div class="col" style="width:190px;display:grid;gap:3px;font:500 13px/1.45 system-ui"><b style="font:700 15px system-ui;color:#111827">Design review</b><span style="color:#6b7280">Thursday, 3:00 pm</span><span class="x" style="color:#4b5563">Room 4, second floor</span><span style="color:#6b7280">Ana, Sam and Kai</span></div>');
      const x = s.querySelector('.x'), lines = [...s.querySelector('.col').children], dots = lines.map(() => make(s, 'sq')), pill = make(s, 'pill');
      // a swatch beside every line, its own colour: four greys, then three
      return { labels: ['gray-600, a 4th grey', 'muted'], chip: (i) => chip(i ? '#6b7280' : '#4b5563'), curve: 'ease-in-out', guides: [...dots.map((el) => ({ el, kind: 'beam' })), { el: pill, kind: 'pill' }],
        at: (p) => { x.style.color = p ? '#6b7280' : '#4b5563'; },
        track: () => { lines.forEach((l, i) => { const b = box(l, s); at(dots[i], `left:${b.l - 22}px;top:${b.t + b.h / 2 - 6}px;width:12px;height:12px;border-radius:4px;border:0;background:${getComputedStyle(l).color}`); }); const b = box(x, s); at(pill, `left:${b.r + 8}px;top:${b.t + b.h / 2}px;translate:0 -50%`); } };
    },
  },
  'craft/rhythm': {
    code: ['mt-[19px]', 'mt-6'],
    note: ['Every section is 24px apart but one, at 19: the page’s beat stumbles.', 'One gap down the page: it feels even.'],
    scene: (s) => {
      scene(s, `<div style="display:grid;width:180px">${[0, 1, 2, 3].map((i) => `<i class="${i === 2 ? 'x' : ''}" style="display:block;height:22px;border-radius:6px;background:#e5e7eb;margin-top:${i === 0 ? 0 : i === 2 ? 19 : 24}px"></i>`).join('')}</div>`);
      const x = s.querySelector('.x');
      return { ...measured(s, x, [19, 24], 'px', () => { const b = box(x, s), pr = box(x.previousElementSibling, s); return [pr.b, b.t, b.l - 10]; }), at: (p) => { x.style.marginTop = p ? '24px' : '19px'; } };
    },
  },
  'craft/elevation-ladder': {
    code: ['shadow-[0_3px_8px…] (menu)', 'shadow-popover'],
    note: ['The menu’s shadow is one hair bigger than the card’s: they look like the same height.', 'A clear step up: the menu floats over the card.'],
    scene: (s) => {
      const card = '0 2px 6px rgb(0 0 0 / .14)', near = '0 3px 8px rgb(0 0 0 / .15), 0 0 0 0 rgb(0 0 0 / 0)', far = '0 16px 34px -8px rgb(0 0 0 / .3), 0 4px 10px rgb(0 0 0 / .08)';
      scene(s, `<div style="position:relative;width:200px;height:120px"><div class="c" style="position:absolute;inset:0;border-radius:12px;background:#fff;box-shadow:${card};padding:12px;font:700 13px system-ui;color:#111827">Project Atlas</div><div class="x" style="position:absolute;right:-6px;top:34px;width:110px;padding:6px;border-radius:10px;background:#fff;box-shadow:${near};display:grid;gap:2px;font:500 12px system-ui;color:#374151"><span style="padding:4px 6px">Rename</span><span style="padding:4px 6px">Archive</span></div></div>`, '#f4f4f5');
      const x = s.querySelector('.x'), c = s.querySelector('.c'), [l1, l2, beam, pill] = G(s, 'hl', 'hl', 'beam', 'pill');
      // where each shadow reaches below its surface: two lines a hair apart, then a clear step
      return { labels: ['a step too close', 'shadow-popover'], guides: four([l1, l2, beam, pill]),
        at: (p) => { x.style.boxShadow = p ? far : near; },
        track: () => { const C = box(c, s), X = box(x, s), yc = C.b + shadowReach(c).bottom, yx = X.b + shadowReach(x).bottom; lineH(l1, yc, C.l, X.r + 10); lineH(l2, yx, X.l, X.r + 10); at(beam, `left:${X.r + 14}px;top:${Math.min(yc, yx)}px;height:${Math.abs(yx - yc)}px`); at(pill, `left:${X.r + 24}px;top:${(yc + yx) / 2}px;translate:0 -50%`); } };
    },
  },
  'craft/optical-centre': {
    code: ['centred by its box', 'nudged 3px right'],
    note: ['Centred by its box, the play triangle looks pushed to the left.', 'Nudged toward its point, it looks centred.'],
    scene: (s) => {
      scene(s, '<div class="c" style="width:72px;height:72px;border-radius:50%;background:#4f46e5;display:grid;place-items:center"><svg class="x" viewBox="0 0 24 24" width="28" height="28"><path d="M6 4l14 8-14 8z" fill="#fff"/></svg></div>');
      const x = s.querySelector('.x'), c = s.querySelector('.c'), g = G(s, 'vl', 'vl', 'hbeam', 'pill');
      return { from: 0, to: 3, unit: 'px', guides: four(g), at: (p) => { x.style.translate = p ? '3px 0' : '0 0'; },
        track: () => { const C = box(c, s), X = box(x, s); gapX(s, g, C.l + C.w / 2, X.l + X.w * 0.43, C.b + 14); at(g[3], `left:${C.l + C.w / 2}px;top:${C.b + 34}px`); } };
    },
  },
  'craft/overshoot': {
    code: ['size-6 (circle)', 'size-[26px] (circle)'],
    note: ['A circle as wide as the square covers less, so it reads smaller.', 'Let past the square a little, it reads the same size.'],
    scene: (s) => {
      scene(s, '<div style="display:flex;gap:18px;align-items:center"><i style="width:28px;height:28px;border-radius:6px;background:#4f46e5"></i><i class="x" style="width:28px;height:28px;border-radius:50%;background:#4f46e5"></i><i style="width:0;height:0;border-left:16px solid transparent;border-right:16px solid transparent;border-bottom:30px solid #4f46e5"></i></div>');
      const x = s.querySelector('.x'), [sq, pill] = G(s, 'sq', 'pill');
      return { from: 28, to: 31, unit: 'px', guides: [{ el: sq, kind: 'ring' }, { el: pill, kind: 'pill' }], at: (p) => { x.style.width = x.style.height = p ? '31px' : '28px'; },
        track: () => { const b = box(x, s); at(sq, `left:${b.l - 3}px;top:${b.t - 3}px;width:${b.w + 6}px;height:${b.h + 6}px;border-radius:50%`); pillUnder(pill, x, s, 26); } };
    },
  },
  'craft/stroke-weight': {
    code: ['stroke-width="1"', 'stroke-width="2"'],
    note: ['A hairline icon beside bold words looks faint and unfinished.', 'A stroke that weighs what the words weigh.'],
    scene: (s) => {
      scene(s, '<div style="display:flex;align-items:center;gap:8px;font:650 17px system-ui;color:#111827"><svg viewBox="0 0 24 24" width="22" height="22"><path class="x" d="M4 12l5 5L20 6" fill="none" stroke="#111827" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>All tests passed</div>');
      const x = s.querySelector('.x');
      return { from: 1, to: 2, step: 0.25, fmt: (v) => +v.toFixed(2), unit: 'px', ...((() => { const [sq, pill] = G(s, 'sq', 'pill'); return { guides: [{ el: sq, kind: 'ring' }, { el: pill, kind: 'pill' }], track: () => { const b = box(x.ownerSVGElement, s); at(sq, `left:${b.l - 4}px;top:${b.t - 4}px;width:${b.w + 8}px;height:${b.h + 8}px`); pillUnder(pill, x.ownerSVGElement, s, 26); } }; })()),
        at: (p) => { x.style.strokeWidth = p ? '2' : '1'; } };
    },
  },
  'craft/scroll-cue': {
    code: ['overflow-x-auto, cut between cards', 'a faded edge, the next card peeking'],
    note: ['The row is cut cleanly between two cards: it looks like that’s all there is.', 'The next card peeks in under a fade: there is more to the side.'],
    scene: (s) => {
      scene(s, `<div class="bx" style="width:236px;overflow:hidden"><div class="x" style="display:flex;gap:10px">${['#fde68a', '#bfdbfe', '#fbcfe8', '#bbf7d0'].map((c) => `<i class="cd" style="flex:none;width:108px;height:90px;border-radius:12px;background:${c}"></i>`).join('')}</div></div>`);
      const bx = s.querySelector('.bx'), cards = [...s.querySelectorAll('.cd')], [clip, seam, pill] = G(s, 'vl', 'vl', 'pill');
      // the edge that cuts the row, and the end of the last card: cut right on the gap, the row looks finished
      return { labels: ['cut on the gap', 'a card crosses the edge'], guides: [{ el: clip, kind: 'v' }, { el: seam, kind: 'v' }, { el: pill, kind: 'pill' }],
        at: (p) => { bx.style.width = p ? '284px' : '236px'; bx.style.maskImage = p ? 'linear-gradient(to right, #000 86%, transparent)' : 'none'; },
        track: () => { const B = box(bx, s), c = box(cards[1], s); lineV(clip, B.r, B.t - 12, B.b + 12); lineV(seam, c.r, B.t - 12, B.b + 12); at(pill, `left:${B.r}px;top:${B.b + 26}px`); } };
    },
  },
  'craft/row-lines': {
    code: ['button after the list', 'mt-auto on the button'],
    note: ['A shorter list lifts one plan’s button: you can’t read across the row.', 'Buttons pinned to the bottom: the plans line up.'],
    scene: (s) => {
      scene(s, `<div style="display:flex;gap:10px;align-items:stretch">${[3, 1].map((n, i) => `<div class="cd" style="width:104px;padding:10px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;display:flex;flex-direction:column;gap:5px;font:500 11px system-ui;color:#4b5563"><b style="font:700 13px system-ui;color:#111827">${i ? 'Free' : 'Pro'}</b>${'<span>✓ feature</span>'.repeat(n)}<span class="btn2 ${i ? 'x' : 'o'}" style="height:26px;justify-content:center;padding:0;font-size:11px;background:#4f46e5;margin-top:${i ? 6 : 'auto'}px">Choose</span></div>`).join('')}</div>`);
      const x = s.querySelector('.x'), o = s.querySelector('.o'), [l1, l2, beam, pill] = G(s, 'hl', 'hl', 'beam', 'pill');
      let drop = 0;
      // a line along each button's top: two lines, one apart, until they are one
      return { labels: ['after the list', 'mt-auto'], guides: four([l1, l2, beam, pill]),
        at: (p) => { if (!drop) drop = box(o, s).t - box(x, s).t + 6; x.style.marginTop = p ? `${drop}px` : '6px'; },
        track: () => { const a = box(o, s), b = box(x, s); lineH(l1, a.t, a.l - 10, b.r + 10); lineH(l2, b.t, a.l - 10, b.r + 10); at(beam, `left:${b.r + 8}px;top:${Math.min(a.t, b.t)}px;height:${Math.abs(a.t - b.t)}px`); at(pill, `left:${b.r + 18}px;top:${(a.t + b.t) / 2}px;translate:0 -50%`); } };
    },
  },
  'craft/shared-edges': {
    code: ['pl-5 (the button)', 'pl-4'],
    note: ['The button starts 4px in from the words above it: the card has two left edges.', 'Everything starts on one edge.'],
    scene: (s) => {
      scene(s, '<div style="width:190px;padding:16px;border-radius:14px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;display:grid;gap:8px;justify-items:start;font:400 12.5px/1.45 system-ui;color:#4b5563"><b class="t" style="font:700 15px system-ui;color:#111827">Invite your team</b>Work on one page together.<span class="x" style="margin-left:4px;font:600 13px system-ui;color:#4f46e5">Send invites →</span></div>');
      const x = s.querySelector('.x'), t = s.querySelector('.t'), g = G(s, 'vl', 'vl', 'hbeam', 'pill');
      return { from: 4, to: 0, unit: 'px', guides: four(g), at: (p) => { x.style.marginLeft = p ? '0px' : '4px'; },
        track: () => { const a = box(t, s), b = box(x, s); gapX(s, g, a.l, b.l, b.b + 12); at(g[3], `left:${a.l - 8}px;top:${b.b + 12}px;translate:-100% -50%`); } };
    },
  },
  'craft/action-fit': {
    code: ['two looks for “Choose”', 'one <Button> for both'],
    note: ['The same choice, drawn two ways: one plan looks like the lesser option.', 'One button for one action: the row reads as equal choices.'],
    scene: (s) => {
      scene(s, `<div style="display:flex;gap:10px">${['Starter', 'Team'].map((w, i) => `<div style="width:104px;padding:12px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;display:grid;gap:10px;font:700 13px system-ui;color:#111827">${w}<span class="btn2 ${i ? 'x' : 'o'}" style="height:30px;justify-content:center;padding:0;font-size:12px;${i ? 'background:transparent;color:#4f46e5;box-shadow:inset 0 0 0 1px #c7d2fe;border-radius:99px' : 'background:#4f46e5'}">Choose</span></div>`).join('')}</div>`);
      const x = s.querySelector('.x'), o = s.querySelector('.o'), [a, b, pill] = G(s, 'sq', 'sq', 'pill');
      // a box on each plan's “Choose”: the same action, two looks, until it is one
      return { labels: ['two looks', 'one Button'], guides: [{ el: a, kind: 'beam' }, { el: b, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.background = p ? '#4f46e5' : 'transparent'; x.style.color = p ? '#fff' : '#4f46e5'; x.style.boxShadow = p ? 'inset 0 0 0 1px rgb(199 210 254 / 0)' : 'inset 0 0 0 1px #c7d2fe'; x.style.borderRadius = p ? '9px' : '99px'; },
        track: () => { for (const [el, n] of [[a, o], [b, x]]) { const B = box(n, s); at(el, `left:${B.l - 4}px;top:${B.t - 4}px;width:${B.w + 8}px;height:${B.h + 8}px;border-radius:${parseFloat(getComputedStyle(n).borderTopLeftRadius) + 4}px;border-style:dashed`); } const A = box(o, s), B = box(x, s); at(pill, `left:${(A.l + B.r) / 2}px;top:${A.b + 30}px`); } };
    },
  },
  'craft/column-edge': {
    code: ['pl-[15px] (one row)', 'pl-3'],
    note: ['One row’s name sits 3px off the others: the column wobbles.', 'Every row on one edge.'],
    scene: (s) => {
      scene(s, `<div style="width:200px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:500 13px system-ui;color:#111827">${['Ana Ruiz', 'Sam Lee', 'Kai Moss'].map((n, i) => `<div style="display:flex;justify-content:space-between;padding:9px 12px;${i ? 'border-top:1px solid #f3f4f6' : ''}"><span class="${i === 1 ? 'x' : i === 0 ? 'f' : ''}" style="${i === 1 ? 'padding-left:3px' : ''}">${n}</span><span style="color:#6b7280">Editor</span></div>`).join('')}</div>`);
      const x = s.querySelector('.x'), f = s.querySelector('.f'), g = G(s, 'vl', 'vl', 'hbeam', 'pill');
      return { from: 3, to: 0, unit: 'px', guides: four(g), at: (p) => { x.style.paddingLeft = p ? '0px' : '3px'; },
        track: () => { const a = box(f, s), b = box(x, s); gapX(s, g, a.l, b.l + parseFloat(getComputedStyle(x).paddingLeft), b.t - 6); at(g[3], `left:${a.l - 16}px;top:${b.t + b.h / 2}px;translate:-100% -50%`); } };
    },
  },
  'craft/sibling-match': {
    code: ['rounded (one button)', 'rounded-lg'],
    note: ['One button in the toolbar has sharper corners: the set looks like two sets.', 'One corner for the set.'],
    scene: (s) => {
      scene(s, `<div style="display:flex;gap:8px">${['Bold', 'Italic', 'Link'].map((w, i) => `<span class="${i === 2 ? 'x' : ''}" style="padding:8px 12px;border-radius:${i === 2 ? 3 : 9}px;background:#eef2ff;font:600 13px system-ui;color:#3730a3">${w}</span>`).join('')}</div>`);
      const x = s.querySelector('.x'), [arc, pill] = G(s, 'arc', 'pill');
      return { from: 3, to: 9, unit: 'px', name: 'rounded-lg', guides: [{ el: arc, kind: 'ring' }, { el: pill, kind: 'pill' }], at: (p) => { x.style.borderRadius = p ? '9px' : '3px'; },
        track: () => { const b = box(x, s), rad = parseFloat(getComputedStyle(x).borderTopLeftRadius), d = Math.max(10, rad * 2) + 10; at(arc, `left:${b.l - 5}px;top:${b.t - 5}px;width:${d}px;height:${d}px;border-top-left-radius:${rad + 5}px`); pillUnder(pill, x, s, 24); } };
    },
  },
  'craft/dark-elevation': {
    code: ['shadow-lg (dark theme)', 'bg-surface-2 + a light top edge'],
    note: ['On a dark page, a black shadow vanishes: the card doesn’t rise.', 'A lighter surface and a faint light edge on top: it rises, in the dark.'],
    scene: (s) => {
      scene(s, '<div class="x" style="width:160px;height:92px;border-radius:14px;background:#111827;box-shadow:0 12px 24px -6px rgb(0 0 0 / .6), inset 0 1px 0 rgb(255 255 255 / 0);display:grid;place-items:center;font:600 13px system-ui;color:#e5e7eb">Usage</div>', '#0b1120');
      const x = s.querySelector('.x'), [top, pill] = G(s, 'hl', 'pill');
      // the card's top edge, where the light catches it once it rises
      return { labels: ['shadow only', 'lighter + top edge'], chip: (i) => chip(i ? '#1e293b' : '#111827'), guides: [{ el: top, kind: 'h' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.background = p ? '#1e293b' : '#111827'; x.style.boxShadow = `0 12px 24px -6px rgb(0 0 0 / .6), inset 0 1px 0 rgb(255 255 255 / ${p ? 0.1 : 0})`; },
        track: () => { const b = box(x, s); lineH(top, b.t, b.l + 10, b.r - 10); pillOver(pill, x, s, 18); } };
    },
  },
  'craft/dark-weight': {
    code: ['font-semibold (dark theme)', 'font-medium, antialiased'],
    note: ['Light words glow into a dark ground: semibold looks bold.', 'A step lighter in the dark: the same weight to the eye.'],
    scene: (s) => {
      scene(s, '<p class="x" style="margin:0;width:200px;font:600 15px/1.5 system-ui;color:#f3f4f6">Your workspace is ready. Invite the team to start.</p>', '#0b1120');
      const x = s.querySelector('.x');
      return { from: 600, to: 500, step: 100, unit: '', name: 'medium', ...((() => { const [sq, pill] = G(s, 'sq', 'pill'); return { guides: [{ el: sq, kind: 'ring' }, { el: pill, kind: 'pill' }], track: () => { ringAround(sq, x, s, 6); sq.style.borderStyle = 'dashed'; pillUnder(pill, x, s, 22); } }; })()),
        at: (p) => { x.style.fontWeight = p ? 500 : 600; x.style.webkitFontSmoothing = p ? 'antialiased' : 'auto'; } };
    },
  },
  'craft/palette-motion': {
    code: ['duration-[400ms] (⌘K)', 'duration-instant'],
    note: ['The palette you open fifty times a day takes 400ms each time.', 'A shortcut answers at once: a quick fade, no waiting.'],
    scene: (s) => {
      scene(s, '<div style="display:grid;gap:12px;justify-items:center"><div class="pal" style="width:200px;padding:8px;border-radius:12px;background:#fff;box-shadow:0 12px 30px -8px rgb(0 0 0 / .3),0 0 0 1px rgb(0 0 0 / .06);font:500 12px system-ui;color:#6b7280">Search or jump to…</div><div style="display:flex;align-items:center;gap:8px;font:600 11px system-ui;color:#6b7280"><span class="key">⌘K</span><span style="width:120px;height:8px"><i class="x" style="display:block;height:8px;width:120px;border-radius:4px;background:var(--c)"></i></span></div></div>');
      const x = s.querySelector('.x'), pal = s.querySelector('.pal'), pill = make(s, 'pill');
      return { from: 400, to: 60, step: 20, unit: 'ms', name: 'instant', guides: [{ el: pill, kind: 'pill' }],
        at: (p) => { x.style.width = p ? '18px' : '120px'; pal.animate([{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: p ? 60 : 400, delay: 300, easing: 'ease-out', fill: 'backwards' }); },
        track: () => { const b = box(x, s); at(pill, `left:${b.r + 12}px;top:${b.t + 4}px;translate:0 -50%`); } };
    },
  },
});
