// Anti-slop: an example for each check. The marks a generated screen leaves, boxed where they are, then gone or
// set right (check-motion.js plays them; checks/marks.js has the shared pieces).
import { at, make, box, shadowReach, chip } from '../check-kit.js';
import { scene, phrase, wirePhrase, fold, marked } from './marks.js';

const card = (inner, w = 200) => `<div style="width:${w}px;padding:14px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:400 12.5px/1.45 system-ui;color:#4b5563">${inner}</div>`;
export const SLOP = {
  'tells/eyebrow': {
    code: ['<p>FEATURES</p><h2>Features</h2>', '<h2>Features</h2>'],
    note: ['A small label over the heading says the heading again, louder.', 'The heading alone says what this part is.'],
    scene: (s) => {
      scene(s, card('<p class="x" style="margin:0 0 6px;font:700 10px/1.4 system-ui;letter-spacing:.14em;color:#6366f1">FEATURES</p><h3 style="margin:0 0 4px;font:700 18px system-ui;color:#111827">Features</h3>Everything you need to ship a release.'));
      const x = s.querySelector('.x'), go = fold(x);
      return { ...marked(s, [x], ['repeats the heading', 'cut']), at: go };
    },
  },
  'tells/numbering': {
    code: ['01 Fast · 02 Private · 03 Simple', 'Fast · Private · Simple'],
    note: ['Numbers say “read in this order”; these three can be read in any order.', 'Without numbers, nothing claims a sequence that isn’t there.'],
    scene: (s) => {
      scene(s, `<div style="display:flex;gap:8px">${['Fast', 'Private', 'Simple'].map((w, i) => `<div style="width:84px;padding:10px;border-radius:10px;background:#f3f4f6;font:700 13px system-ui;color:#111827">${phrase(`<span style="color:#6366f1">0${i + 1}</span>&nbsp;`, '', 'n')}${w}</div>`).join('')}</div>`);
      const nums = [...s.querySelectorAll('.n')], sets = nums.map(wirePhrase);
      return { ...marked(s, nums, ['01 02 03, any order', 'no numbers'], { pad: 2, round: 4 }), at: (p) => sets.forEach((f) => f(p)) };
    },
  },
  'tells/flavour-badge': {
    code: ['<Badge>New ✨</Badge>', '(no badge)'],
    note: ['“New” here is decoration: nothing in the app tracks it, so people learn to ignore badges.', 'Badges kept for what the app tracks, like a stream that is live.'],
    scene: (s) => {
      scene(s, card(`<div style="display:flex;align-items:center;gap:8px;font:700 15px system-ui;color:#111827">Analytics${phrase('<span class="badge" style="padding:0 8px;font-size:11px;background:#fce7f3;color:#9d174d">New ✨</span>', '', 'b')}</div>See where people drop off.`));
      const b = s.querySelector('.b'), set = wirePhrase(b);
      return { ...marked(s, [b], ['for flavour', 'cut']), at: set };
    },
  },
  'tells/status-dot': {
    code: ['<span class="dot animate-pulse" />', '(no dot)'],
    note: ['A pulsing dot says “live”; nothing real drives this one.', 'No dot until something real is live.'],
    scene: (s) => {
      scene(s, card(`<div style="display:flex;align-items:center;gap:8px;font:700 14px system-ui;color:#111827">${phrase('<i style="display:inline-block;width:8px;height:8px;margin-right:2px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgb(34 197 94 / .2)"></i>', '', 'd')}Production</div>Deployed 2 hours ago.`));
      const d = s.querySelector('.d'), set = wirePhrase(d);
      return { ...marked(s, [d], ['claims “live”', 'cut'], { round: 8 }), at: set };
    },
  },
  'tells/emoji': {
    code: ['🚀 Ship faster', 'Ship faster'],
    note: ['The rocket says nothing the words don’t, and looks different on every system.', 'The words alone.'],
    scene: (s) => {
      scene(s, `<h3 style="margin:0;font:800 24px system-ui;color:#111827">${phrase('🚀&nbsp;', '', 'e')}Ship faster</h3>`);
      const e = s.querySelector('.e'), set = wirePhrase(e);
      return { ...marked(s, [e], ['decoration', 'cut']), at: set };
    },
  },
  'tells/icon-tile': {
    code: ['icon in bg-violet-100 rounded-lg p-2', 'icon on its own'],
    note: ['A tinted square on every row, told apart by colour alone: the names already do that.', 'The icon on its own, the name does the work.'],
    scene: (s) => {
      const rows = [['Reports', '#ede9fe', '#7c3aed'], ['Billing', '#dcfce7', '#16a34a'], ['Team', '#fee2e2', '#dc2626']];
      scene(s, `<div style="display:grid;gap:8px;width:180px">${rows.map(([n, bg, ink]) => `<div style="display:flex;align-items:center;gap:10px;font:600 13px system-ui;color:#111827"><span class="t" data-bg="${bg}" data-ink="${ink}" style="display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:${bg}"><svg viewBox="0 0 24 24" width="16" height="16"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="${ink}" stroke-width="2"/></svg></span>${n}</div>`).join('')}</div>`);
      const tiles = [...s.querySelectorAll('.t')];
      return { ...marked(s, tiles, ['a tile on every row', 'the icon alone'], { pad: 3, round: 10 }),
        at: (p) => tiles.forEach((t) => { t.style.background = p ? 'transparent' : t.dataset.bg; t.querySelector('rect').style.stroke = p ? '#4b5563' : t.dataset.ink; }) };
    },
  },
  'tells/hue-gradient': {
    code: ['bg-gradient-to-r from-violet-500 to-pink-500', 'bg-primary'],
    note: ['Violet into pink: the first thing a generated page reaches for.', 'Your one brand colour holds better.'],
    scene: (s) => {
      scene(s, '<span class="btn2 x" style="position:relative;overflow:hidden;background:linear-gradient(90deg,#8b5cf6,#ec4899)"><i class="solid" style="position:absolute;inset:0;background:#4f46e5;opacity:0"></i><span style="position:relative">Start free trial</span></span>');
      const x = s.querySelector('.x'), solid = s.querySelector('.solid');
      return { ...marked(s, [x], ['two hues', 'primary'], { round: 12 }), chip: (i) => chip(i ? '#4f46e5' : 'linear-gradient(90deg,#8b5cf6,#ec4899)'), at: (p) => { solid.style.opacity = p ? 1 : 0; } };
    },
  },
  'tells/glow': {
    code: ['shadow-[0_0_40px_rgb(139_92_246/.6)]', 'shadow-card'],
    note: ['A violet glow lifts the card with no light to explain it.', 'A soft neutral shadow says the same, quietly.'],
    scene: (s) => {
      const glow = '0 0 40px 4px rgb(139 92 246 / .6)', calm = '0 1px 2px rgb(0 0 0 / .08), 0 6px 14px -6px rgb(0 0 0 / .18)';
      scene(s, `<div class="x" style="width:150px;height:84px;border-radius:14px;background:#fff;display:grid;place-items:center;font:600 13px system-ui;color:#111827;box-shadow:${glow}, 0 0 0 0 rgb(0 0 0 / 0)">Pro plan</div>`, '#f8fafc');
      const x = s.querySelector('.x'), [reach, pill] = [make(s, 'sq'), make(s, 'pill')];
      return { labels: ['violet glow', 'shadow-card'], guides: [{ el: reach, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.boxShadow = p ? calm : `${glow}, 0 0 0 0 rgb(0 0 0 / 0)`; },
        track: () => { const b = box(x, s), e = shadowReach(x); at(reach, `left:${b.l - e.x}px;top:${b.t - e.top}px;width:${b.w + e.x * 2}px;height:${b.h + e.top + e.bottom}px;border-radius:${14 + e.x}px;border-style:dashed`); at(pill, `left:${b.l + b.w / 2}px;top:${b.t - e.top - 14}px`); } };
    },
  },
  'tells/transition-all': {
    code: ['transition-all', 'transition-[background-color,box-shadow]'],
    note: ['Every property animates, size and layout too: they slide when they should snap.', 'Only the colour and the shadow move; the rest changes at once.'],
    scene: (s) => {
      const props = ['width', 'height', 'padding', 'top', 'colour', 'shadow'];
      scene(s, `<div style="display:grid;gap:10px;justify-items:center"><span style="font:600 12px system-ui;color:#6b7280">what moves when the card changes</span><div style="display:flex;flex-wrap:wrap;gap:6px;width:220px;justify-content:center">${props.map((n) => `<span class="pp" data-keep="${n === 'colour' || n === 'shadow' ? 1 : ''}" style="padding:5px 10px;border-radius:99px;font:600 12px ui-monospace,monospace;background:#eef2ff;color:#3730a3">${n}</span>`).join('')}</div></div>`);
      const pills = [...s.querySelectorAll('.pp')], drop = pills.filter((p) => !p.dataset.keep);
      return { ...marked(s, drop, ['all', 'colour, shadow'], { pad: 3, round: 99, anchor: pills[0].parentElement, dy: 24, under: true }),
        at: (p) => drop.forEach((x) => { x.style.background = p ? '#f3f4f6' : '#eef2ff'; x.style.color = p ? '#9ca3af' : '#3730a3'; x.style.textDecoration = p ? 'line-through' : 'none'; }) };
    },
  },
  'tells/hover-grow': {
    code: ['hover:scale-105', 'hover:shadow-card'],
    note: ['At the pointer, the card jumps a size bigger and pushes over its neighbours.', 'It stays its size; a shadow says it can be clicked.'],
    scene: (s) => {
      scene(s, `<div style="display:flex;gap:10px">${[0, 1, 2].map((i) => `<div class="${i === 1 ? 'x' : ''}" style="width:76px;height:70px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;${i === 1 ? 'scale:1.12;z-index:1;' : ''}"></div>`).join('')}</div><i style="position:absolute;left:50%;top:calc(50% + 50px);translate:-50% 0;font:500 11px system-ui;color:#6b7280;font-style:normal">pointer on the middle card</i>`, '#f8fafc');
      const x = s.querySelector('.x'), [rest, pill] = [make(s, 'sq'), make(s, 'pill')];
      // dashes at the card's own size: it overflows them while it grows, and fills them when it stays put
      return { labels: ['scale 1.05', 'shadow only'], guides: [{ el: rest, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.scale = p ? '1' : '1.12'; x.style.boxShadow = p ? 'inset 0 0 0 1px #e5e7eb, 0 8px 18px -8px rgb(0 0 0 / .3)' : 'inset 0 0 0 1px #e5e7eb, 0 0 0 0 rgb(0 0 0 / 0)'; },
        track: () => { const b = box(x, s), sc = parseFloat(getComputedStyle(x).scale) || 1, w = b.w / sc, h = b.h / sc; at(rest, `left:${b.l + (b.w - w) / 2}px;top:${b.t + (b.h - h) / 2}px;width:${w}px;height:${h}px;border-radius:12px;border-style:dashed`); at(pill, `left:${b.l + b.w / 2}px;top:${b.t - 18}px`); } };
    },
  },
  'tells/heavy-weight': {
    code: ['font-black (900)', 'font-bold (700)'],
    note: ['900 shouts; size and colour already carry the order.', 'Bold is enough at this size.'],
    scene: (s) => {
      scene(s, '<h3 class="x" style="margin:0;font:900 30px/1.1 system-ui;color:#111827">Plans for every team</h3>');
      const x = s.querySelector('.x'), [sq, pill] = [make(s, 'sq'), make(s, 'pill')];
      return { from: 900, to: 700, step: 100, unit: '', name: 'bold', guides: [{ el: sq, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.fontWeight = p ? 700 : 900; },
        track: () => { const b = box(x, s); at(sq, `left:${b.l - 6}px;top:${b.t - 4}px;width:${b.w + 12}px;height:${b.h + 8}px;border-style:dashed`); at(pill, `left:${b.l + b.w / 2}px;top:${b.b + 24}px`); } };
    },
  },
};
