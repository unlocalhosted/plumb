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
  'tells/caps-subtitle': {
    code: ['<p class="uppercase tracking-wide">EVERYTHING YOU NEED</p>', '<p>Everything you need</p>'],
    note: ['The line under the heading shouts louder than the heading.', 'In normal case the heading leads again.'],
    scene: (s) => {
      scene(s, card(`<h3 style="margin:0 0 4px;font:700 18px system-ui;color:#111827">Pricing</h3><p class="x" style="margin:0;font:600 11px/1.4 system-ui;color:#6b7280">${phrase('<span style="letter-spacing:.12em">SIMPLE PLANS FOR EVERY TEAM</span>', 'Simple plans for every team')}</p>`, 230));
      const x = s.querySelector('.x .ph'), set = wirePhrase(x);
      return { ...marked(s, [x], ['capitals', 'normal case']), at: set };
    },
  },
  'tells/italic-words': {
    code: ['Ship <em>faster</em> than ever', 'Ship faster than ever'],
    note: ['One word slanted for flavour: the template accent.', 'Upright, the sentence carries itself.'],
    scene: (s) => {
      scene(s, '<h3 style="margin:0;font:700 26px/1.2 system-ui;color:#111827">Ship <span class="x" style="display:inline-block;font-style:italic;font-weight:500;transition:none">faster</span> than ever</h3>');
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['italic accent', 'upright']), at: (p) => { x.style.fontStyle = p ? 'normal' : 'italic'; x.style.fontWeight = p ? 700 : 500; } };
    },
  },
  'tells/display-serif': {
    code: ['font-family: "Instrument Serif"', 'font-family: var(--font-sans)'],
    note: ['The serif every generated landing page borrows.', 'The page’s own face, bigger and bolder.'],
    scene: (s) => {
      scene(s, '<h3 class="x" style="margin:0;font:400 30px/1.15 \'Instrument Serif\', Georgia, serif;color:#111827">Notes that think with you</h3>');
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['Instrument Serif', 'your face']), at: (p) => { x.style.font = p ? '700 26px/1.15 system-ui' : "400 30px/1.15 'Instrument Serif', Georgia, serif"; } };
    },
  },
  'tells/negative-tracking': {
    code: ['tracking-tighter (-0.05em)', 'tracking-normal'],
    note: ['Letters pulled into each other: the squeezed-headline look.', 'The spacing the type was drawn with.'],
    scene: (s) => {
      scene(s, '<h3 class="x" style="margin:0;font:700 30px/1.1 system-ui;letter-spacing:-0.06em;color:#111827">Build the future</h3>');
      const x = s.querySelector('.x'), [sq, pill] = [make(s, 'sq'), make(s, 'pill')];
      return { from: -0.06, to: 0, step: 0.01, unit: 'em', name: 'normal', guides: [{ el: sq, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.letterSpacing = `${-0.06 * (1 - p)}em`; },
        track: () => { const b = box(x, s); at(sq, `left:${b.l - 6}px;top:${b.t - 4}px;width:${b.w + 12}px;height:${b.h + 8}px;border-style:dashed`); at(pill, `left:${b.l + b.w / 2}px;top:${b.b + 24}px`); } };
    },
  },
  'tells/divider': {
    code: ['<li class="border-b">', '<li> with gap-3'],
    note: ['A line under every row cuts the list into strips.', 'Space alone tells the rows apart.'],
    scene: (s) => {
      scene(s, card(['Invoices', 'Payment method', 'Tax details'].map((w) => `<div class="r" style="padding:7px 0;border-bottom:1px solid #e5e7eb;font:500 13px system-ui;color:#111827">${w}</div>`).join(''), 200));
      const rows = [...s.querySelectorAll('.r')];
      return { ...marked(s, [rows[0].parentElement], ['lines between rows', 'space']), at: (p) => rows.forEach((r) => { r.style.borderBottomColor = p ? 'transparent' : '#e5e7eb'; r.style.padding = p ? '9px 0' : '7px 0'; }) };
    },
  },
  'tells/bordered-box': {
    code: ['border border-gray-200 rounded-xl', 'bg-gray-50 rounded-xl'],
    note: ['A border round every box makes each part say “card”.', 'A quiet fill holds it together without a line.'],
    scene: (s) => {
      scene(s, '<div class="x" style="width:200px;padding:14px;border-radius:12px;background:#fff;border:1px solid #d1d5db;font:400 12.5px/1.45 system-ui;color:#4b5563"><b style="display:block;margin-bottom:4px;font:700 14px system-ui;color:#111827">Team plan</b>Up to ten people, one bill.</div>');
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['outlined', 'quiet fill'], { round: 14 }), at: (p) => { x.style.borderColor = p ? 'transparent' : '#d1d5db'; x.style.background = p ? '#f3f4f6' : '#fff'; } };
    },
  },
  'tells/detailed-diagram': {
    code: ['<svg> with 40 parts', 'one line and a label'],
    note: ['Forty marks to say one thing: nobody reads it.', 'The one idea, drawn with a few marks.'],
    scene: (s) => {
      const bits = Array.from({ length: 28 }, (_, i) => `<circle class="bit" cx="${20 + (i % 7) * 26}" cy="${18 + Math.floor(i / 7) * 22}" r="${3 + (i % 3)}" fill="${['#6366f1', '#ec4899', '#10b981', '#f59e0b'][i % 4]}"/>`).join('');
      scene(s, `<svg class="x" viewBox="0 0 200 110" width="200" height="110">${bits}<path class="bit" d="M20 18 L176 84 M46 40 L150 18 M72 84 L124 40" stroke="#9ca3af" fill="none"/><path class="keep" d="M20 90 C70 90 110 30 180 24" stroke="#111827" stroke-width="3" fill="none" opacity="0"/></svg>`);
      const x = s.querySelector('.x'), bitsEls = [...s.querySelectorAll('.bit')], keep = s.querySelector('.keep');
      return { ...marked(s, [x], ['40 parts', 'one line']), at: (p) => { bitsEls.forEach((b) => { b.style.opacity = 1 - p; }); keep.style.opacity = p; } };
    },
  },
  'tells/code-breadcrumb': {
    code: ['<code>~/app/billing/page.tsx</code>', '(no path)'],
    note: ['A file path dresses the page up as a terminal.', 'The heading names the part; no path needed.'],
    scene: (s) => {
      scene(s, card('<p class="x" style="margin:0 0 6px;font:500 11px/1.4 ui-monospace,Menlo,monospace;color:#6b7280">~/app/billing/page.tsx</p><h3 style="margin:0 0 4px;font:700 18px system-ui;color:#111827">Billing</h3>Your plan and invoices.', 220));
      const x = s.querySelector('.x'), go = fold(x);
      return { ...marked(s, [x], ['path as decoration', 'cut']), at: go };
    },
  },
  'tells/tag-row': {
    code: ['<Tag>Fast</Tag><Tag>Secure</Tag><Tag>Scalable</Tag>', '(no tags)'],
    note: ['Three pills that do nothing: labels dressed as data.', 'The sentence says what matters.'],
    scene: (s) => {
      scene(s, card(`<b style="display:block;margin-bottom:4px;font:700 14px system-ui;color:#111827">Storage</b>Files sync in under a second.<div class="x" style="display:flex;gap:6px;margin-top:8px">${['Fast', 'Secure', 'Scalable'].map((t) => `<span style="padding:2px 8px;border-radius:99px;background:#eef2ff;color:#3730a3;font:600 11px system-ui">${t}</span>`).join('')}</div>`, 220));
      const x = s.querySelector('.x'), go = fold(x);
      return { ...marked(s, [x], ['tags', 'cut'], { round: 99 }), at: (p) => { go(p); x.style.marginTop = p ? '0px' : '8px'; } };
    },
  },
  'tells/busy-card': {
    code: ['7 text styles in one card', 'title, body, one note'],
    note: ['Seven voices in one box: nothing leads.', 'Three styles; the title leads.'],
    scene: (s) => {
      const busy = [['10px', 700, '#6366f1', 'uppercase', '.1em'], ['17px', 800, '#111827', 'none', '0'], ['12px', 500, '#9ca3af', 'none', '0'], ['13px', 400, '#374151', 'none', '0'], ['11px', 600, '#059669', 'none', '0'], ['12px', 400, '#6b7280', 'none', '0'], ['11px', 700, '#dc2626', 'uppercase', '.05em']];
      const calm = [['10px', 400, '#6b7280', 'none', '0'], ['17px', 700, '#111827', 'none', '0'], ['12px', 400, '#6b7280', 'none', '0'], ['13px', 400, '#374151', 'none', '0'], ['12px', 400, '#6b7280', 'none', '0'], ['12px', 400, '#6b7280', 'none', '0'], ['12px', 400, '#6b7280', 'none', '0']];
      const words = ['Monthly', 'Pro plan', 'Billed yearly', 'Everything in Free, plus history.', '+12% this month', 'Renews 3 March', 'Save 20%'];
      scene(s, `<div class="x" style="width:210px;padding:14px;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgb(0 0 0 / .12)">${words.map((w) => `<div class="v" style="margin:1px 0;font-family:system-ui">${w}</div>`).join('')}</div>`);
      const x = s.querySelector('.x'), vs = [...s.querySelectorAll('.v')];
      const set = (list) => vs.forEach((v, i) => { const [size, weight, color, tt, ls] = list[i]; Object.assign(v.style, { fontSize: size, fontWeight: weight, color, textTransform: tt, letterSpacing: ls }); });
      set(busy);
      return { ...marked(s, [x], ['7 voices', '3 voices'], { round: 14 }), at: (p) => set(p ? calm : busy) };
    },
  },
  'tells/many-shades': {
    code: ['violet-50 … violet-900, /10 /20 /40 /60', 'three steps: ink, quiet, line'],
    note: ['Nine near-same violets and four opacities: no one can tell which means what.', 'Three steps, each with one job.'],
    scene: (s) => {
      const many = ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'], few = ['#ede9fe', '#ede9fe', '#ede9fe', '#8b5cf6', '#8b5cf6', '#8b5cf6', '#4c1d95', '#4c1d95', '#4c1d95'];
      scene(s, `<div class="x" style="display:flex;gap:4px">${many.map((c) => `<i class="sw" style="display:block;width:20px;height:44px;border-radius:6px;background:${c}"></i>`).join('')}</div>`);
      const x = s.querySelector('.x'), sw = [...s.querySelectorAll('.sw')];
      return { ...marked(s, [x], ['9 shades', '3 steps'], { round: 8 }), at: (p) => sw.forEach((e, i) => { e.style.background = p ? few[i] : many[i]; }) };
    },
  },
};
