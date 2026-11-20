// Craft and polish: an example for each check, the way the design-system checks have theirs (check-motion.js).
// Each entry: the line of code before and after, a sentence for each state, and the scene (a stage → a spec the
// tiles' player runs: at(p) sets broken (0) or fixed (1), track() puts the guides where the scene is now).
import { at, make, ringAround, pillOver, pillUnder, gapY, gapX, box } from '../check-kit.js';

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
      const rows = [...s.querySelectorAll('.rw')], lst = s.querySelector('.lst');
      return { ...ringed(s, lst, ['2px, gray-400', '1px hairline'], 8, 20), at: (p) => { for (const r of rows) r.style.borderBottom = p ? '1px solid #e5e7eb' : '2px solid #9ca3af'; } };
    },
  },
  'craft/image-outline': {
    code: ['<img> on white', 'outline outline-black/10 -outline-offset-1'],
    note: ['White photos on a white page: you can’t tell where a picture ends.', 'A faint outline inside the picture gives it an edge on any background.'],
    scene: (s) => {
      scene(s, `<div class="row" style="display:flex;gap:16px">${[['Mug', '38px', '34px', '6px 6px 16px 16px'], ['Vase', '26px', '50px', '13px 13px 8px 8px']].map(([w, iw, ih, r]) => `<figure style="margin:0;display:grid;gap:6px;font:500 12px system-ui;color:#374151"><div class="ph" style="width:96px;height:84px;border-radius:10px;background:#fff;display:grid;place-items:center;box-shadow:inset 0 0 0 1px rgb(0 0 0 / 0)"><i style="width:${iw};height:${ih};border-radius:${r};background:linear-gradient(#f4f4f5,#e4e4e7)"></i></div>${w} · $24</figure>`).join('')}</div>`);
      const phs = [...s.querySelectorAll('.ph')];
      return { ...ringed(s, s.querySelector('.row'), ['no edge', 'outline, 10%'], 10, 22), at: (p) => { for (const x of phs) x.style.boxShadow = `inset 0 0 0 1px rgb(0 0 0 / ${p ? 0.1 : 0})`; } };
    },
  },
  'craft/layered-shadow': {
    code: ['shadow-[0_22px_40px_rgb(0_0_0/.35)]', 'shadow-card'],
    note: ['One big blur reads as a smudge under the card, not a card off the page.', 'Small, tight shadows stacked: the card has an edge and a weight.'],
    scene: (s) => {
      scene(s, '<div class="x" style="width:150px;height:92px;border-radius:14px;background:#fff;display:grid;place-items:center;font:600 13px system-ui;color:#111827;box-shadow:0 22px 40px -4px rgb(0 0 0 / .35), 0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0)">Team plan</div>', '#f4f4f5');
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['one 40px blur', 'shadow-card'], 12, 26),
        at: (p) => { x.style.boxShadow = p ? '0 1px 2px rgb(0 0 0 / .08), 0 4px 10px -2px rgb(0 0 0 / .08), 0 12px 24px -8px rgb(0 0 0 / .14)' : '0 22px 40px -4px rgb(0 0 0 / .35), 0 0 0 0 rgb(0 0 0 / 0), 0 0 0 0 rgb(0 0 0 / 0)'; } };
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
      scene(s, `<div style="display:flex;gap:16px">${[0, 1, 2].map((i) => `<div class="${i === 1 ? 'x' : ''}" style="width:68px;height:60px;border-radius:12px;background:#fff;box-shadow:${i === 1 ? up : down}"></div>`).join('')}</div>`, '#f4f4f5');
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['lit from below', 'shadow-card'], 12, 24, true), at: (p) => { x.style.boxShadow = p ? down : up; } };
    },
  },
  'craft/tabular-nums': {
    code: ['proportional figures', 'tabular-nums'],
    note: ['Each digit is its own width, so the amounts don’t line up to compare.', 'Every digit one width: the column lines up.'],
    scene: (s) => {
      scene(s, `<div class="x" style="font:600 17px/1.65 system-ui;font-variant-numeric:proportional-nums;text-align:right;color:#111827">${['$1,111.11', '$48,200.00', '$904.50', '$17.71'].map((n) => `<div>${n}</div>`).join('')}</div>`);
      const x = s.querySelector('.x');
      return { ...ringed(s, x, ['proportional', 'tabular-nums'], 10, 16), at: (p) => { x.style.fontVariantNumeric = p ? 'tabular-nums' : 'proportional-nums'; } };
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
