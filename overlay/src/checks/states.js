// States and behaviour: an example for each check. What a screen reader says is drawn as a caption, where Tab goes
// as numbered stops, time as bars on one axis; layout and motion are shown on the thing itself (checks/marks.js).
import { at, make, box } from '../check-kit.js';
import { scene, phrase, wirePhrase, fold, marked, spoken, stops, bars, markup } from './marks.js';

const btn = (t, x = '', bg = '#4f46e5', ink = '#fff') => `<span class="btn2 ${x}" style="height:32px;padding:0 14px;font-size:13px;background:${bg};color:${ink}">${t}</span>`;
const ghost = (t, x = '') => btn(t, x, '#fff', '#111827').replace('style="', 'style="box-shadow:inset 0 0 0 1px #d1d5db;');
const panel = (inner, w = 220, extra = '') => `<div style="width:${w}px;padding:12px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:500 12.5px/1.45 system-ui;color:#374151;${extra}">${inner}</div>`;
const crumbs = (sep = ' / ', m = '') => `<nav class="m" style="font:500 13px system-ui;color:#4b5563">Home<span class="sep ${m}">${sep}</span>Docs<span class="sep ${m}">${sep}</span><b style="color:#111827">Guides</b></nav>`;
const tabsUi = (sel = 0, extra = '') => `<div class="tl m" style="display:flex;gap:4px;padding:3px;border-radius:10px;background:#f3f4f6;font:600 12.5px system-ui;${extra}">${['Monthly', 'Yearly', 'Lifetime'].map((t, i) => `<span class="tb t${i}" style="padding:6px 12px;border-radius:8px;${i === sel ? 'background:#fff;color:#111827;box-shadow:0 1px 2px rgb(0 0 0 / .12)' : 'color:#6b7280'}">${t}</span>`).join('')}</div>`;
const dialogUi = (extra = '') => `<div style="position:relative;width:250px;height:150px;border-radius:12px;background:#f3f4f6;overflow:hidden"><div style="padding:10px;display:flex;gap:8px"><span class="pl" style="font:600 11px system-ui;color:#4f46e5">Pricing</span><span style="font:600 11px system-ui;color:#4f46e5">Docs</span></div><div style="position:absolute;inset:0;background:rgb(15 23 42 / .4)"></div><div class="dlg m" style="position:absolute;left:30px;right:30px;top:30px;bottom:20px;padding:12px;border-radius:10px;background:#fff;display:grid;gap:8px;align-content:center;font:700 13px system-ui;color:#111827">Delete project?<div style="display:flex;gap:6px">${ghost('Cancel', 'cn')}${btn('Delete', 'dl', '#dc2626')}</div>${extra}</div></div>`;

export const STATES = {
  'habits/no-ease-in': {
    code: ['transition: transform 200ms ease-in', 'transition: transform 200ms ease-out'],
    note: ['Ease-in starts slowly: the press seems to lag behind the hand.', 'Ease-out moves at once and settles: it answers the hand.'],
    scene: (s) => {
      const curve = (a, b, c, d) => `path('M0 90 C${a * 140} ${90 - b * 80} ${c * 140} ${90 - d * 80} 140 10')`;
      const ein = curve(0.42, 0, 1, 1), eout = curve(0, 0, 0.58, 1);
      scene(s, `<svg class="sv" viewBox="-6 0 152 100" width="190" height="125"><path d="M0 90H140M0 90V6" stroke="#d1d5db" stroke-width="1.5" fill="none"/><path class="x" style="d:${ein}" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round"/><text x="0" y="99" font-size="7" fill="#9ca3af" font-family="system-ui">press</text><text x="116" y="99" font-size="7" fill="#9ca3af" font-family="system-ui">200 ms</text></svg>`);
      const x = s.querySelector('.x'), sv = s.querySelector('.sv'), start = { getBoundingClientRect: () => { const r = sv.getBoundingClientRect(); return new DOMRect(r.left + r.width * 0.04, r.top + r.height * 0.45, r.width * 0.3, r.height * 0.45); } };
      return { ...marked(s, [start], ['ease-in: a slow start', 'ease-out: moves at once'], { round: 8 }), at: (p) => { x.style.d = p ? eout : ein; } };
    },
  },
  'habits/overflow-clip': {
    code: ['overflow-hidden (on the panel)', 'overflow-clip'],
    note: ['overflow: hidden makes the panel a scroll box, so the sticky header inside scrolls away with the list.', 'overflow: clip still cuts the corners and lets the header stick.'],
    scene: (s) => {
      scene(s, `<div style="position:relative;width:200px;height:140px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;overflow:hidden"><div class="hd" style="position:absolute;left:0;right:0;top:-26px;height:30px;padding:0 12px;display:flex;align-items:center;background:#eef2ff;font:700 12px system-ui;color:#3730a3;z-index:2">Invoices</div><div style="position:absolute;left:12px;right:12px;top:14px;display:grid;gap:8px">${'<i style="height:16px;border-radius:5px;background:#f3f4f6"></i>'.repeat(6)}</div></div>`);
      const hd = s.querySelector('.hd');
      return { ...marked(s, [hd.parentElement], ['scrolled away', 'stays on top'], { round: 14 }), at: (p) => { hd.style.top = p ? '0px' : '-26px'; } };
    },
  },
  'habits/overscroll-contain': {
    code: ['(the list scrolls the page at its end)', 'overscroll-behavior: contain'],
    note: ['At the end of the list, the scroll carries on into the page behind it.', 'The scroll stops at the list’s edge; the page stays put.'],
    scene: (s) => {
      scene(s, `<div style="position:relative;width:240px;height:150px;border-radius:12px;background:#f9fafb;overflow:hidden"><div class="pg" style="position:absolute;left:12px;right:12px;top:12px;display:grid;gap:9px;translate:0 -22px">${'<i style="height:12px;border-radius:5px;background:#e5e7eb"></i>'.repeat(9)}</div><div style="position:absolute;right:14px;top:20px;width:110px;height:110px;border-radius:10px;background:#fff;box-shadow:0 8px 20px -6px rgb(0 0 0 / .3);padding:8px;display:grid;gap:6px;align-content:end;font:600 11px system-ui;color:#111827">${['Ana', 'Sam', 'Kai'].map((n) => `<span>${n}</span>`).join('')}<small style="color:#9ca3af">end of list</small></div></div>`);
      const pg = s.querySelector('.pg');
      return { ...marked(s, [pg], ['the page scrolls too', 'contained'], { round: 8 }), at: (p) => { pg.style.translate = p ? '0 0' : '0 -22px'; } };
    },
  },
  'habits/transition-named': {
    code: ['transition', 'transition-colors'],
    note: ['With every property listed, a change of size slides too.', 'Only the colour moves; the size changes at once.'],
    scene: (s) => {
      const props = ['width', 'height', 'margin', 'colour'];
      scene(s, `<div style="display:grid;gap:10px;justify-items:center"><span style="font:600 12px system-ui;color:#6b7280">what animates on hover</span><div style="display:flex;gap:6px">${props.map((n) => `<span class="pp" data-keep="${n === 'colour' ? 1 : ''}" style="padding:5px 10px;border-radius:99px;font:600 12px ui-monospace,monospace;background:#eef2ff;color:#3730a3">${n}</span>`).join('')}</div></div>`);
      const drop = [...s.querySelectorAll('.pp')].filter((p) => !p.dataset.keep);
      return { ...marked(s, drop, ['every property', 'colour only'], { pad: 3, round: 99, under: true, dy: 24 }), at: (p) => drop.forEach((x) => { x.style.background = p ? '#f3f4f6' : '#eef2ff'; x.style.color = p ? '#9ca3af' : '#3730a3'; x.style.textDecoration = p ? 'line-through' : 'none'; }) };
    },
  },
  'craft/flex-min': {
    code: ['<span>{name}</span>', '<span class="min-w-0 truncate">{name}</span>'],
    note: ['A long name never shrinks, so it pushes the date off the row.', 'The name gives way and cuts; the date stays in.'],
    scene: (s) => {
      scene(s, `<div class="row" style="display:flex;gap:10px;width:200px;padding:10px 12px;border-radius:10px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:600 13px system-ui;color:#111827"><span class="nm" style="flex:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Quarterly planning notes, final</span><span style="flex:none;color:#6b7280;font-weight:500">20 Nov</span></div>`);
      const row = s.querySelector('.row'), nm = s.querySelector('.nm'), [edge, pill] = [make(s, 'vl'), make(s, 'pill')];
      return { labels: ['pushed off the row', 'min-w-0 truncate'], guides: [{ el: edge, kind: 'v' }, { el: pill, kind: 'pill' }],
        at: (p) => { nm.style.flex = p ? '1 1 0%' : 'none'; nm.style.minWidth = p ? '0' : 'auto'; },
        track: () => { const b = box(row, s); at(edge, `left:${b.r}px;top:${b.t - 14}px;height:${b.h + 28}px;bottom:auto`); at(pill, `left:${b.r}px;top:${b.t - 26}px`); } };
    },
  },
  'craft/fixed-height': {
    code: ['h-16', 'min-h-16'],
    note: ['The box is fixed at 64px, so the third line spills out below it.', 'A least height: the box grows with its words.'],
    scene: (s) => {
      scene(s, panel('<b style="display:block;color:#111827">Release notes</b>Faster search, a dark theme, fixes for the export and a new way to share pages.', 200, 'height:64px;box-sizing:border-box'));
      const x = s.querySelector('.ck-scene > div'), full = x.scrollHeight, [l1, l2, beam, pill] = [make(s, 'hl'), make(s, 'hl'), make(s, 'beam'), make(s, 'pill')];
      return { labels: ['h-16', 'min-h-16'], guides: [{ el: l1, kind: 'h' }, { el: beam, kind: 'beam' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.height = `${p ? full : 64}px`; },
        track: () => { const b = box(x, s); at(l1, `top:${b.b}px;left:${b.l - 12}px;width:${b.w + 24}px;right:auto`); at(pill, `left:${b.r + 12}px;top:${b.b}px;translate:0 -50%`); at(beam, `left:${b.l - 16}px;top:${b.t}px;height:${b.h}px`); } };
    },
  },
  'craft/press-feedback': {
    code: ['(nothing on :active)', 'active:scale-[.97] active:bg-indigo-700'],
    note: ['It looks the same when pressed, so you can’t tell it registered.', 'It gives under the finger the moment it is pressed.'],
    scene: (s) => {
      scene(s, `<div style="position:relative">${btn('Save changes', 'x')}<i class="fg" style="position:absolute;right:-14px;bottom:-16px;width:22px;height:22px;border-radius:50%;background:rgb(17 24 39 / .18);box-shadow:0 0 0 2px #fff"></i></div>`);
      const x = s.querySelector('.x');
      let on = 0;
      const press = () => x.animate(on ? [{ scale: 1, background: '#4f46e5' }, { scale: 0.96, background: '#4338ca', offset: 0.3 }, { scale: 1, background: '#4f46e5' }] : [{ scale: 1 }, { scale: 1 }], { duration: 700, delay: 200 });
      return { ...marked(s, [x], ['no response', 'gives on press'], { round: 12 }), at: (p) => { on = p; press(); } };
    },
  },
  'craft/exit-faster': bars({
    rows: [{ label: 'opens', before: [0, 300], after: [0, 300] }, { label: 'closes', before: [0, 300], after: [0, 180], ink: '#f472b6' }], max: 400, marks: [1], from: 300, to: 180, name: 'exit',
    code: ['exit: 300ms', 'exit: 180ms'], note: ['It leaves as slowly as it came, when people are already done with it.', 'Out faster than in: it gets out of the way.'] }),
  'craft/interruptible': {
    code: ['@keyframes (runs to its end)', 'transition (turns round where it is)'],
    note: ['Flipped back halfway, it first finishes, then comes back: a full trip for nothing.', 'A transition turns round from wherever it is.'],
    scene: (s) => {
      const keyf = "path('M0 80 C40 80 50 10 90 10 C110 10 120 80 160 80')", trans = "path('M0 80 C20 80 30 45 45 45 C60 45 70 80 110 80')";
      scene(s, `<svg class="sv" viewBox="-6 0 172 100" width="210" height="122"><path d="M0 88H160M0 88V4" stroke="#d1d5db" stroke-width="1.5" fill="none"/><path class="x" style="d:${keyf}" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round"/><line x1="45" y1="4" x2="45" y2="88" stroke="#f43f5e" stroke-dasharray="3 3"/><text x="48" y="12" font-size="7" fill="#f43f5e" font-family="system-ui">flipped back</text><text x="0" y="97" font-size="7" fill="#9ca3af" font-family="system-ui">time →</text></svg>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [s.querySelector('.sv')], ['runs to the end first', 'turns round at once'], { round: 10 }), at: (p) => { x.style.d = p ? trans : keyf; } };
    },
  },
  'craft/skeleton-match': {
    code: ['h-10 (skeleton)', 'h-16 (as tall as the card)'],
    note: ['The skeleton is shorter than what arrives, so everything under it jumps (dashes: the real card).', 'The same size as the content: nothing moves when it lands.'],
    scene: (s) => {
      scene(s, `<div style="display:grid;gap:8px;width:200px"><div style="position:relative"><span class="gh" style="position:absolute;left:0;right:0;top:0;height:64px;border:1.5px dashed #a5b4fc;border-radius:10px"></span><div class="x" style="height:40px;border-radius:10px;background:linear-gradient(90deg,#f3f4f6,#e5e7eb,#f3f4f6)"></div></div><i style="height:14px;border-radius:5px;background:#e5e7eb"></i><i style="height:14px;width:70%;border-radius:5px;background:#e5e7eb"></i></div>`);
      const x = s.querySelector('.x'), g = [make(s, 'hl'), make(s, 'hl'), make(s, 'beam'), make(s, 'pill')];
      return { from: 40, to: 64, unit: 'px', guides: [{ el: g[0], kind: 'h' }, { el: g[1], kind: 'h' }, { el: g[2], kind: 'beam' }, { el: g[3], kind: 'pill' }], at: (p) => { x.style.height = p ? '64px' : '40px'; },
        track: () => { const b = box(x, s); at(g[0], `top:${b.t}px;left:${b.l - 12}px;width:${b.w + 24}px;right:auto`); at(g[1], `top:${b.b}px;left:${b.l - 12}px;width:${b.w + 24}px;right:auto`); at(g[2], `left:${b.l - 16}px;top:${b.t}px;height:${b.h}px`); at(g[3], `left:${b.r + 14}px;top:${b.t + b.h / 2}px;translate:0 -50%`); } };
    },
  },
  'craft/spinner-timing': bars({
    rows: [{ label: 'loading', before: [0, 120], after: [0, 120], ink: '#cbd5e1' }, { label: 'spinner', before: [0, 120], after: [200, 700], ink: '#f472b6' }], max: 800, marks: [1],
    labels: ['flashes for 120ms', 'waits 200, stays 500'], code: ['spinner while loading', 'after 200ms, at least 500ms'], note: ['A quick load flashes the spinner for an instant: worse than nothing.', 'It waits 200ms, and once shown stays long enough to read.'] }),
  'craft/menu-pointerdown': bars({
    rows: [{ label: 'press', before: [0, 260], after: [0, 260], ink: '#cbd5e1' }, { label: 'menu', before: [260, 800], after: [0, 800], ink: '#818cf8' }], max: 800, marks: [1],
    labels: ['opens on release', 'opens on press'], code: ['onClick', 'onPointerDown'], note: ['The menu waits for the finger to lift.', 'It opens the moment the finger goes down, and a drag can pick.'] }),
  'craft/tooltip-delay': bars({
    rows: [{ label: 'pointer', before: [0, 120], after: [0, 120], ink: '#cbd5e1' }, { label: 'tooltip', before: [0, 120], after: [0, 0], ink: '#818cf8' }], max: 800, marks: [1],
    labels: ['pops on a pass', 'waits for a stop'], code: ['tooltip at once', 'tooltip after 400ms'], note: ['The pointer only passed over, and a tooltip flashed up.', 'It waits until the pointer rests, so passing is quiet.'] }),
  'craft/submenu-path': {
    code: ['closes on leave', 'a safe triangle while moving to it'],
    note: ['Moving straight to the submenu crosses another item, and the submenu closes.', 'A safe triangle keeps it open while the pointer heads its way.'],
    scene: (s) => {
      scene(s, `<div style="position:relative;width:250px;height:140px"><div style="position:absolute;left:10px;top:10px;width:110px;padding:6px;border-radius:10px;background:#fff;box-shadow:0 8px 20px -8px rgb(0 0 0 / .3);display:grid;gap:2px;font:500 12px system-ui;color:#111827">${['Rename', 'Share  ›', 'Move', 'Delete'].map((t, i) => `<span style="padding:5px 8px;border-radius:6px;${i === 1 ? 'background:#eef2ff' : ''}">${t}</span>`).join('')}</div><div class="sub" style="position:absolute;left:128px;top:24px;width:100px;padding:6px;border-radius:10px;background:#fff;box-shadow:0 8px 20px -8px rgb(0 0 0 / .3);display:grid;gap:2px;font:500 12px system-ui;color:#111827;opacity:.25"><span style="padding:5px 8px">Copy link</span><span style="padding:5px 8px">Email</span></div><svg style="position:absolute;inset:0;overflow:visible" width="250" height="140"><polygon class="tri" points="96,52 130,24 130,96" fill="rgb(99 102 241 / .14)" stroke="#6366f1" stroke-dasharray="3 3" opacity="0"/><path d="M96 52 L150 76" stroke="#f43f5e" stroke-width="2" stroke-dasharray="4 3" fill="none"/></svg></div>`);
      const sub = s.querySelector('.sub'), tri = s.querySelector('.tri');
      return { ...marked(s, [sub], ['closes on the way', 'safe triangle'], { round: 12 }), at: (p) => { sub.style.opacity = p ? 1 : 0.25; tri.style.opacity = p ? 1 : 0; } };
    },
  },
  'craft/overdrag': {
    code: ['translateY = drag', 'translateY = drag past the end, eased'],
    note: ['Dragged past its end, the sheet follows the finger all the way.', 'Past the end it moves less and less, then springs back.'],
    scene: (s) => {
      scene(s, `<div style="position:relative;width:200px;height:150px;border-radius:14px;background:#f3f4f6;overflow:hidden"><div class="x" style="position:absolute;left:0;right:0;bottom:-10px;height:110px;border-radius:14px 14px 0 0;background:#fff;box-shadow:0 -6px 16px -8px rgb(0 0 0 / .3);translate:0 -46px"><i style="display:block;width:36px;height:4px;margin:8px auto;border-radius:2px;background:#d1d5db"></i></div><i class="fg" style="position:absolute;left:92px;top:2px;width:18px;height:18px;border-radius:50%;background:rgb(17 24 39 / .2)"></i></div>`);
      const x = s.querySelector('.x'), fg = s.querySelector('.fg'), g = [make(s, 'hl'), make(s, 'hl'), make(s, 'beam'), make(s, 'pill')];
      return { from: 46, to: 12, unit: 'px', guides: [{ el: g[0], kind: 'h' }, { el: g[1], kind: 'h' }, { el: g[2], kind: 'beam' }, { el: g[3], kind: 'pill' }], at: (p) => { x.style.translate = p ? '0 -12px' : '0 -46px'; },
        track: () => { const b = box(x, s), F = box(fg.parentElement, s), rest = F.b - 100; at(g[0], `top:${rest}px;left:${F.l}px;width:${F.w}px;right:auto`); at(g[1], `top:${b.t}px;left:${F.l}px;width:${F.w}px;right:auto`); at(g[2], `left:${F.r + 8}px;top:${b.t}px;height:${Math.max(0, rest - b.t)}px`); at(g[3], `left:${F.r + 18}px;top:${(b.t + rest) / 2}px;translate:0 -50%`); } };
    },
  },
  'components/breadcrumb-list': spoken({ ui: crumbs(), said: ['Home, Docs, Guides', 'list, 3 items: Home, Docs, Guides'], labels: ['three words', 'an ordered list'],
    code: ['<nav>Home / Docs / Guides</nav>', '<nav><ol><li>Home</li>…</ol></nav>'], note: ['Read as loose words, nobody hears how deep they are.', 'An ordered list says how many steps, and in which order.'] }),
  'components/breadcrumb-current': spoken({ ui: crumbs(), said: ['Guides, link', 'Guides, current page'], labels: ['every step the same', 'says where you are'],
    code: ['<a>Guides</a>', '<a aria-current="page">Guides</a>'], note: ['The last step is read like the others: nobody hears where they are.', 'aria-current marks this page.'] }),
  'components/breadcrumb-separator': {
    ...spoken({ ui: crumbs(' / ', 's'), said: ['Home, slash, Docs, slash, Guides', 'Home, Docs, Guides'], labels: ['dividers read out', 'aria-hidden'], mark: '.s',
      code: ['<span>/</span>', '<span aria-hidden="true">/</span>'], note: ['The slashes are read out between every step.', 'Hidden from screen readers, they stay for the eye.'] }),
  },
  'components/link-nested-control': spoken({ ui: `<div class="m" style="position:relative;width:200px;padding:12px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #c7d2fe;font:700 13px system-ui;color:#111827">Project Atlas<span class="ib" style="position:absolute;right:10px;top:8px">${ghost('Delete')}</span></div>`,
    said: ['link, Project Atlas, button, Delete…', 'link, Project Atlas · button, Delete Atlas'], labels: ['a button inside a link', 'side by side'],
    code: ['<a><button>Delete</button></a>', '<a>…</a><button>Delete</button>'], note: ['One press, two meanings: browsers and screen readers each pick a different one.', 'The link and the button are siblings: each press means one thing.'],
    also: (s, p) => { s.querySelector('.m').style.boxShadow = p ? 'inset 0 0 0 1px #c7d2fe' : 'inset 0 0 0 2px #a5b4fc'; } }),
  'components/carousel-name': spoken({ ui: `<div class="m" style="display:flex;gap:8px;padding:8px;border-radius:12px;background:#f3f4f6">${['#fde68a', '#bfdbfe', '#fbcfe8'].map((c) => `<i style="width:60px;height:46px;border-radius:8px;background:${c}"></i>`).join('')}</div>`,
    said: ['carousel', 'Featured plans, carousel'], labels: ['no name', 'aria-label'], code: ['<section aria-roledescription="carousel">', '<section aria-roledescription="carousel" aria-label="Featured plans">'], note: ['A screen reader says “carousel” and not what it shows.', 'Named, it says what the slides are.'] }),
  'components/dialog-name': spoken({ ui: dialogUi(), said: ['dialog', 'Delete project?, dialog'], labels: ['no name', 'named by its heading'],
    code: ['<dialog>', '<dialog aria-labelledby="dlg-title">'], note: ['It opens and says only “dialog”.', 'It says what it asks as it opens.'] }),
  'components/dialog-native': stops({ ui: dialogUi(), before: ['.cn', '.dl', '.pl'], after: ['.cn', '.dl', '.cn'], labels: ['Tab walks out', 'focus stays inside'],
    code: ['<div role="dialog">', '<dialog> opened with showModal()'], note: ['A div playing a dialog: the third Tab lands on the page behind.', 'A real dialog keeps focus inside, closes on Esc and gives focus back.'] }),
  'components/dialog-aria-extras': markup({ pre: '<dialog', a: ' aria-modal="true"', post: '>', labels: ['adds nothing', 'cut'], note: ['A modal <dialog> already is one; the attribute only risks going stale.', 'The element says it by itself.'] }),
  'components/dialog-fake-modal': stops({ ui: dialogUi(), before: ['.cn', '.dl', '.pl'], after: ['.cn', '.dl', '.cn'], labels: ['show(): Tab leaves', 'showModal(): it can’t'],
    code: ['dialog.show()', 'dialog.showModal()'], note: ['Opened with show(), it says modal but Tab walks into the page behind.', 'Opened with showModal(), the page behind is out of reach.'] }),
  'components/dialog-close': {
    code: ['(no close button)', '<button aria-label="Close">×</button>'],
    note: ['On a touch screen or a screen reader there is nothing to press to leave.', 'A close button: a way out for everyone.'],
    scene: (s) => {
      scene(s, dialogUi('<span class="x" style="position:absolute;right:8px;top:6px;width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:#f3f4f6;color:#374151;font:600 14px system-ui;opacity:0;scale:.6">×</span>'));
      const x = s.querySelector('.x'), corner = { getBoundingClientRect: () => x.getBoundingClientRect() };
      return { ...marked(s, [corner], ['no way out', 'a close button'], { round: 9 }), at: (p) => { x.style.opacity = p ? 1 : 0; x.style.scale = p ? '1' : '.6'; } };
    },
  },
  'components/dialog-scroll-lock': {
    code: ['body { overflow: hidden }', 'scrollbar-gutter: stable; overscroll-behavior: contain'],
    note: ['Locking the page takes its scrollbar away, and everything jumps sideways (dashes: where it was).', 'The gutter is kept, so nothing moves when the dialog opens.'],
    scene: (s) => {
      scene(s, `<div style="position:relative;width:230px;height:130px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;overflow:hidden;display:grid;place-items:center"><div style="position:relative"><span style="position:absolute;inset:-4px -6px;border:1.5px dashed #a5b4fc;border-radius:8px"></span><b class="x" style="display:block;font:700 15px system-ui;color:#111827;translate:7px 0">Account settings</b></div></div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['jumps 7px', 'stays put'], { pad: 6 }), at: (p) => { x.style.translate = p ? '0 0' : '7px 0'; } };
    },
  },
  'components/dialog-display': {
    code: ['dialog { display: grid }', 'dialog[open] { display: grid }'],
    note: ['A display on dialog overrides its closed state: the closed dialog still shows.', 'Scoped to [open], it shows only when open.'],
    scene: (s) => {
      scene(s, `<div style="position:relative;width:230px;height:130px;border-radius:12px;background:#f9fafb;box-shadow:inset 0 0 0 1px #e5e7eb;padding:12px;box-sizing:border-box"><b style="font:700 13px system-ui;color:#111827">Projects</b><div class="x" style="position:absolute;left:30px;right:30px;top:40px;padding:10px;border-radius:10px;background:#fff;box-shadow:0 8px 20px -8px rgb(0 0 0 / .3);font:600 12px system-ui;color:#111827">Delete project? <small style="display:block;color:#9ca3af">(closed)</small></div></div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['closed, still showing', 'hidden when closed'], { round: 12 }), at: (p) => { x.style.opacity = p ? 0 : 1; } };
    },
  },
  'components/menu-structure': spoken({ ui: `<div class="m" style="width:120px;padding:6px;border-radius:10px;background:#fff;box-shadow:0 8px 20px -8px rgb(0 0 0 / .3);display:grid;gap:2px;font:500 12px system-ui;color:#111827">${['Rename', 'Duplicate', 'Delete'].map((t) => `<span style="padding:5px 8px">${t}</span>`).join('')}</div>`,
    said: ['menu, 0 items', 'Rename, menu item, 1 of 3'], labels: ['items not counted', 'menuitem'], code: ['<div role="menu"><div>Rename</div>…', '<div role="menu"><div role="menuitem">Rename</div>…'], note: ['The items are not menu items, so the menu is announced empty.', 'Each is a menuitem: counted and moved through with arrows.'] }),
  'components/nav-as-menu': spoken({ ui: `<nav class="m" style="display:flex;gap:14px;font:600 13px system-ui;color:#4f46e5"><span>Home</span><span>Pricing</span><span>Docs</span></nav>`,
    said: ['menu bar, Home, menu item', 'navigation, list, 3 items, Home, link'], labels: ['a menu', 'a list of links'], code: ['<nav role="menubar">', '<nav><ul><li><a>'], note: ['As a menu, it leaves the Tab order and promises arrow keys.', 'Site navigation is a list of links.'] }),
  'components/popup-expanded': spoken({ ui: `<div style="display:grid;gap:6px;justify-items:start">${ghost('Filters ▾', 'm')}<div class="pop" style="width:130px;padding:8px;border-radius:10px;background:#fff;box-shadow:0 8px 20px -8px rgb(0 0 0 / .3);font:500 12px system-ui;color:#111827">Status · Owner · Date</div></div>`,
    said: ['Filters, button', 'Filters, button, expanded'], labels: ['open or not?', 'aria-expanded'], code: ['<button>Filters</button>', '<button aria-expanded="true">Filters</button>'], note: ['It opened a panel, and nothing says so.', 'aria-expanded says it is open.'] }),
  'components/checked-missing': spoken({ ui: `<div style="display:flex;align-items:center;gap:10px;font:600 13px system-ui;color:#111827">Dark mode<span class="m" style="width:38px;height:22px;border-radius:11px;background:#4f46e5;position:relative"><i style="position:absolute;right:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#fff"></i></span></div>`,
    said: ['Dark mode, switch', 'Dark mode, switch, on'], labels: ['on? off?', 'aria-checked'], code: ['<button role="switch">', '<button role="switch" aria-checked="true">'], note: ['It is announced and never whether it is on.', 'aria-checked says on or off.'] }),
  'components/nav-current': spoken({ ui: `<nav style="display:flex;gap:14px;font:600 13px system-ui;color:#6b7280"><span>Home</span><span class="m" style="color:#111827;box-shadow:0 2px 0 #4f46e5">Pricing</span><span>Docs</span></nav>`,
    said: ['Pricing, link', 'Pricing, link, current page'], labels: ['drawn, not said', 'aria-current'], code: ['<a class="active">Pricing</a>', '<a aria-current="page">Pricing</a>'], note: ['Underlined for the eye; a screen reader reads it like any link.', 'aria-current says where you are, and is the hook to style it.'] }),
  'components/nav-details': spoken({ ui: `<div class="m" style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;background:#f3f4f6;font:600 13px system-ui;color:#111827">Products ▸</div>`,
    said: ['Products, summary', 'Products, button, collapsed'], labels: ['read differently everywhere', 'button + aria-expanded'], code: ['<details><summary>Products</summary>', '<button aria-expanded="false">Products</button>'], note: ['Screen readers disagree on what a summary is.', 'A button with aria-expanded is read the same everywhere.'] }),
  'components/current-many': {
    code: ['aria-current="page" on two links', 'on one'],
    note: ['Two links both say “current page”: only one can be where you are.', 'One current page.'],
    scene: (s) => {
      scene(s, `<nav style="display:flex;gap:14px;font:600 13px system-ui;color:#6b7280"><span>Home</span><span class="c1" style="color:#111827;box-shadow:0 2px 0 #4f46e5">Pricing</span><span class="c2" style="color:#111827;box-shadow:0 2px 0 #4f46e5">Docs</span></nav>`);
      const c2 = s.querySelector('.c2');
      return { ...marked(s, [s.querySelector('.c1'), c2], ['two current pages', 'one'], { pad: 4 }), at: (p) => { c2.style.color = p ? '#6b7280' : '#111827'; c2.style.boxShadow = p ? '0 2px 0 rgb(79 70 229 / 0)' : '0 2px 0 #4f46e5'; } };
    },
  },
  'components/tablist-name': spoken({ ui: tabsUi(), said: ['tab list', 'Billing period, tab list'], labels: ['no name', 'aria-label'], code: ['<div role="tablist">', '<div role="tablist" aria-label="Billing period">'], note: ['It says “tab list”, not what the tabs switch.', 'Named for what they switch.'] }),
  'components/tab-selected': spoken({ ui: tabsUi(), said: ['Monthly, tab, 1 of 3', 'Monthly, tab, selected, 1 of 3'], labels: ['which is showing?', 'aria-selected'], mark: '.t0', code: ['<button role="tab">', '<button role="tab" aria-selected="true">'], note: ['Drawn as selected, never said.', 'aria-selected says which panel is showing.'] }),
  'components/tabpanel-name': spoken({ ui: `<div style="display:grid;gap:8px">${tabsUi()}<div class="m" style="padding:10px;border-radius:10px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:500 12px system-ui;color:#374151">$24 a month, billed monthly.</div></div>`,
    said: ['tab panel', 'Monthly, tab panel'], labels: ['no name', 'labelled by its tab'], code: ['<div role="tabpanel">', '<div role="tabpanel" aria-labelledby="tab-monthly">'], note: ['The panel is announced with no words.', 'It takes its tab’s words.'] }),
  'components/tabs-as-nav': spoken({ ui: tabsUi(), said: ['Monthly, tab, 1 of 3', 'Monthly, link, current page'], labels: ['promises a panel', 'navigation'], code: ['<a role="tab" href="/monthly">', '<a href="/monthly" aria-current="page">'], note: ['These go to other pages, but say “tab”: people expect a panel and arrow keys.', 'Links that look like tabs are navigation.'] }),
  'components/tab-shift': {
    code: ['font-semibold on the selected tab', 'width kept for the bold'],
    note: ['The selected tab turns bold and grows, so every tab after it moves.', 'Room for the bold is kept: the tabs stay put.'],
    scene: (s) => {
      scene(s, `<div style="display:flex;gap:16px;font:400 14px system-ui;color:#374151"><span>Overview</span><span style="font-weight:700;color:#111827;box-shadow:0 2px 0 #4f46e5">Activity</span><span class="nx">Settings</span><span>Billing</span></div>`);
      const nx = s.querySelector('.nx');
      return { ...marked(s, [nx, nx.nextElementSibling], ['the rest shift 4px', 'stay put'], { pad: 3 }), at: (p) => { nx.parentElement.style.letterSpacing = '0'; for (const e of [nx, nx.nextElementSibling]) e.style.translate = p ? '-4px 0' : '0 0'; } };
    },
  },
  'components/tabs-wrap': {
    code: ['flex flex-wrap (tabs)', 'flex overflow-x-auto'],
    note: ['The tabs wrap onto two rows: the order and the selected one are hard to follow.', 'One row that scrolls.'],
    scene: (s) => {
      scene(s, `<div class="bx" style="width:210px;overflow:hidden;border-radius:10px;background:#f3f4f6;padding:3px"><div class="x" style="display:flex;flex-wrap:wrap;gap:4px;font:600 12px system-ui;color:#6b7280">${['Overview', 'Activity', 'Settings', 'Billing', 'Members', 'Usage'].map((t, i) => `<span style="flex:none;padding:6px 10px;border-radius:8px;${i === 4 ? 'background:#fff;color:#111827' : ''}">${t}</span>`).join('')}</div></div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [s.querySelector('.bx')], ['two rows', 'one row, scrolls'], { round: 12 }), at: (p) => { x.style.flexWrap = p ? 'nowrap' : 'wrap'; } };
    },
  },
  'components/tab-structure': spoken({ ui: tabsUi(), said: ['Lifetime, tab', 'Lifetime, tab, 3 of 3'], labels: ['not counted', 'inside the tab list'], mark: '.t2', code: ['<div role="tab"> outside the tablist', 'inside role="tablist"'], note: ['Outside the tab list, it is not counted or tied to its neighbours.', 'Inside it, it is “3 of 3”.'] }),
  'components/tabpanel-many': {
    code: ['both panels shown', 'hidden on the others'],
    note: ['Two panels show at once under one selected tab.', 'Only the selected tab’s panel.'],
    scene: (s) => {
      scene(s, `<div style="display:grid;gap:8px">${tabsUi()}<div style="padding:8px 10px;border-radius:10px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:500 12px system-ui;color:#374151">$24 a month.</div><div class="x" style="padding:8px 10px;border-radius:10px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:500 12px system-ui;color:#374151">$240 a year.</div></div>`);
      const x = s.querySelector('.x'), go = fold(x);
      return { ...marked(s, [x], ['two panels', 'one'], { under: true, dy: 20 }), at: go };
    },
  },
  'components/tab-stops': stops({ ui: tabsUi(), before: ['.t0', '.t1', '.t2'], after: ['.t0'], labels: ['three Tab stops', 'one; arrows move'], code: ['tabindex="0" on every tab', 'tabindex="0" on the selected, -1 on the rest'], note: ['Tab stops on every tab before it reaches the panel.', 'One stop for the set; arrows move between tabs.'] }),
  'components/toolbar-name': spoken({ ui: `<div class="m" style="display:flex;gap:4px;padding:4px;border-radius:9px;background:#f3f4f6;font:700 12px system-ui;color:#374151">${['B', 'I', 'U', 'Link'].map((t) => `<span style="padding:5px 9px;border-radius:6px;background:#fff">${t}</span>`).join('')}</div>`,
    said: ['toolbar', 'Text formatting, toolbar'], labels: ['no name', 'aria-label'], code: ['<div role="toolbar">', '<div role="toolbar" aria-label="Text formatting">'], note: ['It says “toolbar” without saying what it is for.', 'Named for its job.'] }),
  'components/menubar-name': spoken({ ui: `<div class="m" style="display:flex;gap:14px;padding:6px 10px;border-radius:8px;background:#f3f4f6;font:600 12px system-ui;color:#374151"><span>File</span><span>Edit</span><span>View</span></div>`,
    said: ['menu bar', 'Editor, menu bar'], labels: ['no name', 'aria-label'], code: ['<div role="menubar">', '<div role="menubar" aria-label="Editor">'], note: ['It says “menu bar” without saying what it belongs to.', 'Named, it is clear which menus these are.'] }),
  'components/pressed-on-action': spoken({ ui: btn('Save', 'm'), said: ['Save, toggle button, not pressed', 'Save, button'], labels: ['said as a toggle', 'an action'], code: ['<button aria-pressed="false">Save</button>', '<button>Save</button>'], note: ['aria-pressed makes an action sound like a switch.', 'An action is a plain button.'] }),
  'components/progress-name': spoken({ ui: `<div class="m" style="width:200px;height:10px;border-radius:5px;background:#e5e7eb"><i style="display:block;width:40%;height:100%;border-radius:5px;background:#4f46e5"></i></div>`,
    said: ['40 percent', 'Uploading report.pdf, 40 percent'], labels: ['40% of what?', 'aria-label'], code: ['<progress value="40" max="100">', '<progress aria-label="Uploading report.pdf" …>'], note: ['A screen reader says “40 percent” and not of what.', 'Named, it says what is uploading.'] }),
  'components/progress-tabindex': stops({ ui: `<div style="display:grid;gap:10px;justify-items:start">${ghost('Cancel', 'a')}<div class="pr" style="width:200px;height:10px;border-radius:5px;background:#e5e7eb"><i style="display:block;width:40%;height:100%;border-radius:5px;background:#4f46e5"></i></div>${btn('Done', 'b')}</div>`,
    before: ['.a', '.pr', '.b'], after: ['.a', '.b'], labels: ['a stop on the bar', 'skipped'], code: ['<progress tabindex="0">', '<progress>'], note: ['Tab stops on a bar that does nothing.', 'Tab goes from Cancel to Done.'] }),
  'components/progress-native': spoken({ ui: `<div class="m" style="width:200px;height:10px;border-radius:5px;background:#e5e7eb"><i style="display:block;width:40%;height:100%;border-radius:5px;background:#4f46e5"></i></div>`,
    said: ['progress bar', 'Uploading, progress bar, 40 percent'], labels: ['value kept by hand', '<progress>'], code: ['<div role="progressbar">', '<progress value="40" max="100">'], note: ['A div with a role needs its value kept right by hand; this one never was.', '<progress> says its value by itself.'] }),
  'components/spinner-silent': spoken({ ui: `<div class="m" style="width:26px;height:26px;border-radius:50%;border:3px solid #e5e7eb;border-top-color:#4f46e5"></div>`,
    said: ['(nothing)', 'Loading invoices…'], labels: ['silent', 'role="status"'], code: ['<div class="spinner" />', '<div role="status">Loading invoices…</div>'], note: ['Someone who cannot see it never learns anything is loading.', 'A status message says it.'] }),
  'components/expanded-on-generic': spoken({ ui: `<div class="m" style="padding:7px 12px;border-radius:8px;background:#f3f4f6;font:600 13px system-ui;color:#111827">Details ▸</div>`,
    said: ['Details', 'Details, button, collapsed'], labels: ['a box with a state', 'a button'], code: ['<div aria-expanded="false">', '<button aria-expanded="false">'], note: ['A plain box can’t be pressed from the keyboard, and its state is never read.', 'A button carries the state and the keys.'] }),
  'components/expanded-out-of-sync': spoken({ ui: `<div style="display:grid;gap:6px;justify-items:start">${ghost('Filters ▴', 'm')}<div style="width:130px;padding:8px;border-radius:10px;background:#fff;box-shadow:0 8px 20px -8px rgb(0 0 0 / .3);font:500 12px system-ui;color:#111827">Status · Owner · Date</div></div>`,
    said: ['Filters, button, collapsed', 'Filters, button, expanded'], labels: ['says closed, is open', 'in step'], code: ['aria-expanded="false" (panel open)', 'aria-expanded="true"'], note: ['The panel is open and the button says it is closed.', 'The state follows the panel.'] }),
  'experience/nowrap-sentence': {
    code: ['whitespace-nowrap (a sentence)', 'wraps'],
    note: ['A sentence that can’t wrap runs off the side of a narrow screen.', 'It wraps at the edge.'],
    scene: (s) => {
      scene(s, `<div class="ph" style="width:150px;padding:12px;border-radius:16px;background:#fff;box-shadow:inset 0 0 0 2px #111827;overflow:visible;font:500 12.5px/1.45 system-ui;color:#374151"><p class="x" style="margin:0;white-space:nowrap">Your trial ends in three days unless you choose a plan.</p></div>`);
      const x = s.querySelector('.x'), ph = s.querySelector('.ph'), [edge, pill] = [make(s, 'vl'), make(s, 'pill')];
      return { labels: ['runs off the side', 'wraps'], guides: [{ el: edge, kind: 'v' }, { el: pill, kind: 'pill' }], at: (p) => { x.style.whiteSpace = p ? 'normal' : 'nowrap'; },
        track: () => { const b = box(ph, s); at(edge, `left:${b.r}px;top:${b.t - 12}px;height:${b.h + 24}px;bottom:auto`); at(pill, `left:${b.r}px;top:${b.t - 24}px`); } };
    },
  },
  'experience/justify-rivers': {
    code: ['text-justify', 'text-left (or hyphens: auto)'],
    note: ['Justified in a narrow column, the spaces stretch into rivers of white.', 'Set ragged, the spaces are even.'],
    scene: (s) => {
      scene(s, '<p class="x" style="margin:0;width:150px;font:400 13px/1.5 system-ui;color:#374151;text-align:justify">Plumber reads every page you open and offers fixes, in your code, for what has drifted from your system.</p>');
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['rivers of space', 'even spaces'], { pad: 6 }), curve: 'steps(1, jump-end)', at: (p) => { x.style.textAlign = p ? 'left' : 'justify'; } };
    },
  },
  'experience/caps-long': {
    code: ['uppercase (a sentence)', 'sentence case'],
    note: ['A whole sentence in capitals has no word shapes: it is read letter by letter.', 'In sentence case the words read at a glance.'],
    scene: (s) => {
      scene(s, '<p class="x" style="margin:0;width:220px;font:700 13px/1.5 system-ui;color:#111827;text-transform:uppercase;letter-spacing:.04em">Your changes are saved and will go live with the next release.</p>');
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['all capitals', 'sentence case'], { pad: 6 }), curve: 'steps(1, jump-end)', at: (p) => { x.style.textTransform = p ? 'none' : 'uppercase'; x.style.letterSpacing = p ? '0' : '.04em'; } };
    },
  },
  'experience/page-overflow-x': {
    code: ['w-[420px] (a table)', 'max-w-full overflow-x-auto'],
    note: ['One wide table pushes past the phone’s edge, and the whole page scrolls sideways.', 'The table scrolls in its own box; the page fits.'],
    scene: (s) => {
      scene(s, `<div class="ph" style="width:140px;height:150px;padding:10px;border-radius:18px;background:#fff;box-shadow:inset 0 0 0 2px #111827;overflow:visible"><i style="display:block;height:10px;border-radius:5px;background:#e5e7eb;margin-bottom:8px"></i><div class="x" style="width:210px;height:60px;border-radius:8px;background:repeating-linear-gradient(90deg,#eef2ff 0 40px,#e0e7ff 40px 80px)"></div></div>`);
      const x = s.querySelector('.x'), ph = s.querySelector('.ph'), [edge, pill] = [make(s, 'vl'), make(s, 'pill')];
      return { labels: ['wider than the screen', 'scrolls in its box'], guides: [{ el: edge, kind: 'v' }, { el: pill, kind: 'pill' }], at: (p) => { x.style.width = p ? '120px' : '210px'; },
        track: () => { const b = box(ph, s); at(edge, `left:${b.r}px;top:${b.t - 12}px;height:${b.h + 24}px;bottom:auto`); at(pill, `left:${b.r}px;top:${b.t - 24}px`); } };
    },
  },
  'experience/motion-no-opt-out': {
    code: ['animate-marquee', 'motion-safe:animate-marquee'],
    note: ['This person asked for less motion, and the banner keeps sliding.', 'Asked for less motion, it holds still.'],
    scene: (s) => {
      scene(s, `<div style="display:grid;gap:10px;justify-items:center"><span style="padding:4px 9px;border-radius:99px;background:#f3f4f6;font:600 11px system-ui;color:#374151">Reduce motion: on</span><div style="width:220px;overflow:hidden;border-radius:10px;background:#111827;padding:8px 0"><div class="x" style="white-space:nowrap;font:700 13px system-ui;color:#fff">New: dark theme · Faster search · New: dark theme · Faster search</div></div></div>`);
      const x = s.querySelector('.x'), run = x.animate([{ translate: '0 0' }, { translate: '-50% 0' }], { duration: 4000, iterations: Infinity });
      return { ...marked(s, [x.parentElement], ['keeps moving', 'holds still'], { round: 12 }), at: (p) => { if (p) run.pause(); else run.play(); } };
    },
  },
  'experience/font-display': {
    code: ['font-display: block', 'font-display: swap'],
    note: ['While the font loads, the words are invisible (up to three seconds).', 'The words show at once in a fallback, then switch.'],
    scene: (s) => {
      scene(s, panel('<b class="x" style="display:block;font:700 18px Georgia,serif;color:transparent;transition:color 0s">Quarterly report</b><span class="y" style="color:transparent">Revenue grew 12% on last quarter.</span><small style="display:block;margin-top:6px;color:#9ca3af">font still loading</small>'));
      const x = s.querySelector('.x'), y = s.querySelector('.y');
      return { ...marked(s, [x, y], ['words invisible', 'shown at once'], { pad: 3 }), at: (p) => { x.style.color = p ? '#111827' : 'transparent'; y.style.color = p ? '#374151' : 'transparent'; } };
    },
  },
  'experience/preconnect-missing': bars({
    rows: [{ label: 'page', before: [0, 200], after: [0, 200], ink: '#cbd5e1' }, { label: 'connect', before: [200, 500], after: [20, 320], ink: '#f472b6' }, { label: 'font', before: [500, 700], after: [320, 520] }], max: 800, marks: [1],
    labels: ['connects late', 'preconnect'], code: ['(no preconnect)', '<link rel="preconnect" href="https://fonts.example">'], note: ['The connection to the other site starts only when the font is asked for.', 'Started with the page, it is ready when needed.'] }),
  'experience/script-blocking': bars({
    rows: [{ label: 'scripts', before: [0, 450], after: [0, 450], ink: '#cbd5e1' }, { label: 'first paint', before: [450, 520], after: [80, 150], ink: '#34d399' }], max: 600, marks: [1],
    labels: ['waits for scripts', 'defer'], code: ['<script src="app.js">', '<script src="app.js" defer>'], note: ['Nothing is drawn until every script has loaded and run.', 'Deferred, the page draws first.'] }),
  'experience/page-title': {
    code: ['(no <title>)', '<title>Pricing · Atlas</title>'],
    note: ['The tab, the history and a screen reader’s first words are the address.', 'A title says what the page is.'],
    scene: (s) => {
      scene(s, `<div style="width:240px;border-radius:10px;background:#e5e7eb;padding:6px 6px 0"><div style="display:inline-flex;align-items:center;gap:6px;max-width:200px;padding:6px 10px;border-radius:8px 8px 0 0;background:#fff;font:500 12px system-ui;color:#111827"><i style="width:10px;height:10px;border-radius:3px;background:#4f46e5"></i>${phrase('localhost:3000/pricing', 'Pricing · Atlas', 'x')}</div></div>`);
      const x = s.querySelector('.x'), set = wirePhrase(x);
      return { ...marked(s, [x], ['the address', 'a title'], { pad: 3 }), at: set };
    },
  },
  'experience/skip-link': stops({ ui: `<div style="display:grid;gap:8px;width:230px"><span class="sk" style="justify-self:start;padding:4px 8px;border-radius:6px;background:#111827;color:#fff;font:600 11px system-ui;opacity:0">Skip to content</span><nav style="display:flex;gap:10px;font:600 12px system-ui;color:#4f46e5"><span class="n1">Home</span><span class="n2">Pricing</span><span class="n3">Docs</span><span class="n4">Blog</span></nav><div class="mn" style="padding:10px;border-radius:10px;background:#f3f4f6;font:700 13px system-ui;color:#111827">Pricing</div></div>`,
    before: ['.n1', '.n2', '.n3', '.n4', '.mn'], after: ['.sk', '.mn'], labels: ['5 Tabs to the content', '2'], also: (s, p) => { s.querySelector('.sk').style.opacity = p ? 1 : 0; },
    code: ['(no skip link)', '<a href="#main" class="skip">Skip to content</a>'], note: ['A keyboard user tabs through every link on every page to reach the content.', 'The first Tab offers a way straight to it.'] }),
  'experience/color-scheme-missing': {
    code: ['(no color-scheme)', ':root { color-scheme: dark }'],
    note: ['A dark page with a white scrollbar and white form controls.', 'The browser’s own parts turn dark too.'],
    scene: (s) => {
      scene(s, `<div style="position:relative;width:230px;height:130px;border-radius:12px;background:#0f172a;overflow:hidden;padding:14px;box-sizing:border-box;display:grid;gap:8px;align-content:start;font:600 12px system-ui;color:#e5e7eb">Region<span class="sel" style="padding:6px 10px;border-radius:6px;background:#fff;color:#111827;box-shadow:inset 0 0 0 1px #d1d5db">Europe ▾</span><i class="sb" style="position:absolute;right:3px;top:4px;bottom:4px;width:9px;border-radius:5px;background:#f3f4f6"></i></div>`);
      const sel = s.querySelector('.sel'), sb = s.querySelector('.sb');
      return { ...marked(s, [sel, sb], ['white browser parts', 'dark too'], { pad: 3 }), at: (p) => { sel.style.background = p ? '#1e293b' : '#fff'; sel.style.color = p ? '#e5e7eb' : '#111827'; sel.style.boxShadow = p ? 'inset 0 0 0 1px #334155' : 'inset 0 0 0 1px #d1d5db'; sb.style.background = p ? '#334155' : '#f3f4f6'; } };
    },
  },
  'experience/link-target-renamed': {
    code: ['“Pricing” and “Plans” → /pricing', 'both “Pricing”'],
    note: ['Two names for one place: in a list of links they look like two places.', 'One place, one name.'],
    scene: (s) => {
      scene(s, panel(`<nav style="display:flex;gap:12px;font:600 12.5px system-ui;color:#4f46e5;margin-bottom:8px"><span>Home</span><span>Pricing</span></nav>See all ${phrase('<span style="color:#4f46e5;text-decoration:underline">plans</span>', '<span style="color:#4f46e5;text-decoration:underline">pricing</span>', 'x')} and what each includes.`));
      const x = s.querySelector('.x'), set = wirePhrase(x);
      return { ...marked(s, [x], ['a second name', 'one name'], { pad: 3 }), at: set };
    },
  },
  'experience/button-name-reused': spoken({ ui: panel(['Ana', 'Sam'].map((n, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font:600 12.5px system-ui;color:#111827">${n}${ghost('Edit', i ? '' : 'm')}</div>`).join(''), 200),
    said: ['Edit, button', 'Edit Ana, button'], labels: ['which Edit?', 'names the row'], code: ['<button>Edit</button>', '<button aria-label="Edit Ana">Edit</button>'], note: ['Out of their rows, every button is just “Edit”.', 'Each says whose row it edits.'] }),
  'experience/state-in-label': spoken({ ui: btn('🔇 Muted', 'm', '#111827'), said: ['Muted, toggle button, pressed', 'Mute, toggle button, pressed'], labels: ['state said twice', 'the action, then the state'], code: ['aria-label="Muted" aria-pressed="true"', 'aria-label="Mute" aria-pressed="true"'], note: ['The label says the state and so does aria-pressed: heard twice.', 'The label names the action; the state is said once.'] }),
  'experience/scroll-no-hint': {
    code: ['overflow-x-auto (cut on a gap)', 'a faded edge, the next card peeking'],
    note: ['The row ends on a gap: nothing says there is more to the side.', 'A card peeks in under a fade.'],
    scene: (s) => {
      scene(s, `<div class="bx" style="width:236px;overflow:hidden"><div style="display:flex;gap:10px">${['#fde68a', '#bfdbfe', '#fbcfe8'].map((c) => `<i style="flex:none;width:108px;height:80px;border-radius:12px;background:${c}"></i>`).join('')}</div></div>`);
      const bx = s.querySelector('.bx');
      return { ...marked(s, [bx], ['no sign of more', 'a peek and a fade'], { pad: 6, round: 14 }), at: (p) => { bx.style.width = p ? '284px' : '236px'; bx.style.maskImage = p ? 'linear-gradient(to right, #000 86%, transparent)' : 'none'; } };
    },
  },
  'experience/scroll-keyboard': stops({ ui: `<div style="display:grid;gap:8px;justify-items:start">${ghost('Back', 'a')}<div class="sc" style="width:200px;height:60px;overflow:hidden;border-radius:10px;background:#f3f4f6;padding:8px;box-sizing:border-box;font:500 11px/1.5 ui-monospace,monospace;color:#374151">npm install plumber<br>npx plumber init<br>npx plumber check</div>${btn('Next', 'b')}</div>`,
    before: ['.a', '.b'], after: ['.a', '.sc', '.b'], labels: ['can’t be reached', 'tabindex="0"'], code: ['<div class="overflow-auto">', '<div class="overflow-auto" tabindex="0" aria-label="Install steps">'], note: ['A keyboard can’t get into the box, so what’s below is out of reach.', 'A stop of its own: arrows scroll it.'] }),
  'experience/control-covered': {
    code: ['an empty overlay on top', 'pointer-events: none on the overlay'],
    note: ['An invisible layer sits on the button: the press lands on it (dashes).', 'The layer lets presses through.'],
    scene: (s) => {
      scene(s, `<div style="position:relative">${btn('Download', 'x')}<span class="ov" style="position:absolute;inset:-14px -30px;border-radius:10px;background:repeating-linear-gradient(45deg, rgb(244 63 94 / .12) 0 4px, transparent 4px 8px)"></span></div>`);
      const ov = s.querySelector('.ov');
      return { ...marked(s, [ov], ['covered', 'reachable'], { pad: 0, round: 10 }), at: (p) => { ov.style.opacity = p ? 0 : 1; } };
    },
  },

  // ── scroll snapping and scroll chaining (docs/research/scroll-batch.md). Each scene is a real scroll area with the
  // fault on it, so the check itself can be run over the scene (scripts/proof/demo-check.mjs) ──
  'craft/snap-rest': {
    code: ['overflow-x-auto', 'overflow-x-auto snap-x snap-mandatory *:snap-start'],
    note: ['The row stops wherever the scroll ends: one plan cut off at each edge.', 'It comes to rest on a whole plan.'],
    scene: (s) => {
      scene(s, `<div class="x" style="display:flex;gap:12px;width:300px;overflow-x:auto;scrollbar-width:none;font:600 13px system-ui;color:#111827">${['Starter', 'Team', 'Business', 'Enterprise'].map((t) => `<div style="flex:none;width:200px;height:96px;display:grid;place-items:center;border-radius:12px;background:#eef2ff;scroll-snap-align:start">${t}</div>`).join('')}</div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['stops anywhere', 'rests on a plan'], { round: 14 }), at: (p) => { x.style.scrollSnapType = p ? 'x mandatory' : 'none'; x.scrollLeft = p ? 212 : 118; } };
    },
  },
  'craft/snap-strict': {
    code: ['snap-y snap-mandatory', 'snap-y snap-proximity'],
    note: ['The long part is taller than the view, and the scroll always pulls back to its top.', 'It snaps when a part is near, and the long one reads through.'],
    scene: (s) => {
      scene(s, `<div class="x" style="display:grid;gap:8px;width:230px;height:150px;overflow-y:auto;scrollbar-width:none;scroll-snap-type:y mandatory;font:600 13px system-ui;color:#111827">${[['Overview', 150], ['The full terms', 330], ['Sign', 150]].map(([t, h]) => `<div class="pt" style="height:${h}px;padding:12px;border-radius:12px;background:#eef2ff;scroll-snap-align:start">${t}</div>`).join('')}</div>`);
      const x = s.querySelector('.x'), long = s.querySelectorAll('.pt')[1];
      return { ...marked(s, [x], ['always pulled back', 'reads through'], { round: 14 }), at: (p) => { x.style.scrollSnapType = p ? 'y proximity' : 'y mandatory'; x.scrollTop = p ? long.offsetTop + 90 : long.offsetTop; } };
    },
  },
  'craft/snap-unreachable': {
    code: ['<section>', '<section class="snap-start">'],
    note: ['Every step but this one has a place to rest, so the scroll is always pulled past it.', 'It rests here like the steps beside it.'],
    scene: (s) => {
      scene(s, `<div class="a" style="display:grid;gap:8px;width:230px;height:150px;overflow-y:auto;scrollbar-width:none;scroll-snap-type:y mandatory;font:600 13px system-ui;color:#111827">${['Step one', 'Step two', 'Step three', 'Step four'].map((t, i) => `<div class="pt${i === 2 ? ' x' : ''}" style="height:150px;padding:12px;border-radius:12px;background:${i === 2 ? '#fef3c7' : '#eef2ff'};${i === 2 ? '' : 'scroll-snap-align:start'}">${t}</div>`).join('')}</div>`);
      const a = s.querySelector('.a'), x = s.querySelector('.x');
      return { ...marked(s, [a], ['pulled past step three', 'rests on it'], { round: 14 }), at: (p) => { x.style.scrollSnapAlign = p ? 'start' : 'none'; a.scrollTop = p ? x.offsetTop : x.offsetTop - 150 - 8; } };
    },
  },
  'craft/snap-offset': {
    code: ['snap-y', 'snap-y scroll-pt-8'],
    note: ['Each month comes to rest under the bar, with its heading covered.', 'Room is kept for the bar: the heading lands below it.'],
    scene: (s) => {
      scene(s, `<div class="x" style="width:230px;height:160px;overflow-y:auto;scrollbar-width:none;scroll-snap-type:y mandatory;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:600 13px system-ui;color:#111827"><div class="bar" style="position:sticky;top:0;height:32px;display:flex;align-items:center;padding:0 12px;background:#111827;color:#fff;font-size:12px">Release notes</div>${['November', 'October', 'September'].map((t) => `<div class="pt" style="height:150px;padding:10px 12px;scroll-snap-align:start;box-shadow:inset 0 1px 0 #e5e7eb">${t}</div>`).join('')}</div>`);
      const x = s.querySelector('.x'), bar = s.querySelector('.bar'), second = s.querySelectorAll('.pt')[1];
      return { ...marked(s, [bar], ['covers the heading', 'heading clear'], { pad: 2, round: 4 }), at: (p) => { x.style.scrollPaddingTop = p ? '32px' : ''; x.scrollTop = second.offsetTop - (p ? 32 : 0); } };
    },
  },
  'craft/scroll-chain': {
    code: ['overflow-y-auto', 'overflow-y-auto overscroll-contain'],
    note: ['At the end of the notes, the page behind starts to move.', 'The scroll stops at the panel’s end.'],
    scene: (s) => {
      scene(s, `<div style="width:300px;height:170px;border-radius:12px;background:#f3f4f6;padding:10px;font:500 12px system-ui;color:#6b7280">The page<div class="x" style="position:sticky;top:8px;margin:8px 0 0 auto;width:150px;height:120px;overflow-y:auto;scrollbar-width:none;border-radius:10px;background:#fff;box-shadow:0 6px 18px rgb(0 0 0 / .12);padding:8px 10px;color:#111827">${Array.from({ length: 12 }, (_, i) => `<div style="padding:4px 0">Note ${i + 1}</div>`).join('')}</div></div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['moves the page too', 'keeps its scroll'], { round: 12 }), at: (p) => { x.style.overscrollBehavior = p ? 'contain' : ''; x.scrollTop = x.scrollHeight; } };
    },
  },

  // ── from Pratik's tips (docs/research/harvests/maybepratikk/tips.md) ──
  'craft/row-dead-zone': {
    code: ['<ul class="grid gap-1">', '<ul class="grid">  rows padded, the fill inset'],
    note: ['Between two rows, 4px belong to neither: the highlight flickers and a click does nothing.', 'The rows touch, so the pointer is always on one of them.'],
    scene: (s) => {
      scene(s, `<div class="x" style="display:grid;gap:4px;width:210px;padding:4px;border-radius:12px;background:#fff;box-shadow:0 6px 18px rgb(0 0 0 / .1), inset 0 0 0 1px #e5e7eb;font:500 13px system-ui;color:#111827">${['Open in new tab', 'Rename', 'Duplicate', 'Copy link'].map((t, i) => `<button class="rw" style="all:unset;box-sizing:border-box;display:block;width:100%;padding:6px 10px;border-radius:7px;cursor:default;${i === 1 ? 'background:#f3f4f6' : ''}">${t}</button>`).join('')}</div>`);
      const x = s.querySelector('.x'), rows = [...s.querySelectorAll('.rw')];
      const strip = { getBoundingClientRect: () => { const a = rows[1].getBoundingClientRect(), b = rows[2].getBoundingClientRect(); return new DOMRect(a.left, a.bottom, a.width, Math.max(0, b.top - a.bottom)); } };
      return { ...marked(s, [strip], ['4px no row owns', 'no dead strip'], { pad: 1, round: 2, right: true }), at: (p) => { x.style.gap = p ? '0px' : '4px'; for (const r of rows) r.style.padding = p ? '8px 10px' : '6px 10px'; } };
    },
  },
  'craft/tooltip-cut': {
    code: ['<Tooltip side="top">', '<Tooltip side="top" avoidCollisions>'],
    note: ['The button sits at the top of the screen, and its tooltip opens above it, half off the edge.', 'With no room above, it opens below.'],
    scene: (s) => {
      scene(s, '<div style="position:relative;width:260px;height:150px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;overflow:hidden;font:600 12px system-ui"><div style="height:40px;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:0 12px;background:#f3f4f6"><span class="bt" style="display:grid;place-items:center;width:26px;height:26px;border-radius:7px;background:#111827;color:#fff">↑</span></div><span class="x" style="position:absolute;right:8px;top:-9px;padding:4px 8px;border-radius:6px;background:#111827;color:#fff;white-space:nowrap">Copy share link</span></div>');
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['off the screen', 'opens below'], { under: true, round: 8 }), at: (p) => { x.style.top = p ? '44px' : '-9px'; } };
    },
  },
};
