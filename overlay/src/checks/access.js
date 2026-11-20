// Accessible and correct: an example for each check. A screen reader's words as a caption, Tab as numbered stops,
// a page's outline as chips, a phone's keyboard, time as bars, markup with its part boxed (checks/marks.js).
import { at, make, box, chip } from '../check-kit.js';
import { scene, phrase, wirePhrase, fold, marked, spoken, stops, bars, markup } from './marks.js';

const btn = (t, x = '', bg = '#4f46e5', ink = '#fff') => `<span class="btn2 ${x}" style="height:32px;padding:0 14px;font-size:13px;background:${bg};color:${ink}">${t}</span>`;
const ghost = (t, x = '') => `<span class="btn2 ${x}" style="height:32px;padding:0 14px;font-size:13px;background:#fff;color:#111827;box-shadow:inset 0 0 0 1px #d1d5db">${t}</span>`;
const field = (label, x = '', value = '', extra = '') => `<label style="display:grid;gap:5px;width:200px;font:600 12px system-ui;color:#374151">${label}<span class="f ${x}" style="position:relative;display:flex;align-items:center;height:32px;padding:0 10px;border-radius:8px;background:#fff;box-shadow:inset 0 0 0 1px #d1d5db;font:500 13px system-ui;color:#111827;${extra}">${value}</span></label>`;
const photo = (w = 120, h = 80, x = '') => `<div class="${x}" style="position:relative;width:${w}px;height:${h}px;border-radius:10px;overflow:hidden;background:linear-gradient(#bae6fd,#e0f2fe 60%,#86efac 60%)"><i style="position:absolute;left:62%;top:16%;width:${h * 0.3}px;height:${h * 0.3}px;border-radius:50%;background:#fbbf24"></i></div>`;
const phone = (inner, x = '') => `<div class="ph ${x}" style="position:relative;width:130px;height:170px;border-radius:18px;background:#fff;box-shadow:inset 0 0 0 2px #111827;overflow:hidden">${inner}</div>`;
// a page's outline (landmarks or headings) as a column of chips; the fix changes, adds or drops one
const outline = (rows) => `<div style="display:grid;gap:5px;justify-items:start;font:600 12px system-ui">${rows.map(([tag, name, cls = '']) => `<span class="${cls}" style="display:inline-flex;align-items:center;gap:8px;padding:5px 10px;border-radius:8px;background:#f3f4f6;color:#111827"><code style="font:600 11px ui-monospace,monospace;color:#6366f1">${tag}</code>${name}</span>`).join('')}</div>`;
// swap: the row's tag changes; add: the row arrives with the fix; otherwise it folds away
const outlineFix = ({ rows, mark, swap, add, labels, code, note }) => ({ code, note, scene: (s) => {
  scene(s, outline(rows));
  const m = s.querySelector(mark), set = swap ? wirePhrase(m.querySelector('.ph') ?? m) : fold(m), go = add ? (p) => set(p ? 0 : 1) : set;
  go(0);
  return { ...marked(s, [m], labels, { pad: 3, right: true }), at: go };
} });
// a phone keyboard: letters, digits, or an email keyboard with @
const KEYS = { letters: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'], digits: ['123', '456', '789', ' 0 '], email: ['qwertyuiop', 'asdfghjkl', 'zxc@.vbnm'] };
const keyboard = (kind, cls) => `<div class="${cls}" style="position:absolute;inset:0;display:grid;gap:3px;align-content:center;padding:6px;background:#d1d5db">${KEYS[kind].map((r) => `<div style="display:flex;gap:3px;justify-content:center">${[...r].map((k) => `<i style="flex:${kind === 'digits' ? '1' : '0 0 9px'};height:${kind === 'digits' ? 16 : 14}px;border-radius:3px;background:${k === ' ' ? 'transparent' : '#fff'};font:600 8px/14px system-ui;font-style:normal;text-align:center;color:${'@'.includes(k) ? '#4f46e5' : '#111827'}">${k.trim()}</i>`).join('')}</div>`).join('')}</div>`;
const keyboardFix = ({ from, to, fieldHtml, labels, code, note }) => ({ code, note, scene: (s) => {
  scene(s, phone(`<div style="padding:10px">${fieldHtml}</div><div class="kb" style="position:absolute;left:0;right:0;bottom:0;height:78px">${keyboard(from, 'k0')}${keyboard(to, 'k1')}</div>`));
  const k0 = s.querySelector('.k0'), k1 = s.querySelector('.k1'); k1.style.opacity = 0;
  return { ...marked(s, [s.querySelector('.kb')], labels, { pad: 2, round: 4, under: true, dy: 20 }), at: (p) => { k0.style.opacity = p ? 0 : 1; k1.style.opacity = p ? 1 : 0; } };
} });
// something that appears with the fix (a caption, an arrow, a button), boxed where it lands
const appears = ({ ui, show, labels, code, note, pad = 4, under = false, also }) => ({ code, note, scene: (s) => {
  scene(s, ui);
  const x = s.querySelector(show); x.style.opacity = 0;
  also?.(s, 0);
  return { ...marked(s, [x], labels, { pad, under, dy: 20 }), at: (p) => { x.style.opacity = p ? 1 : 0; also?.(s, p); } };
} });
const pwKey = '<i class="key" style="position:absolute;right:8px;top:7px;width:18px;height:18px;border-radius:5px;background:#eef2ff;display:grid;place-items:center;font:700 10px system-ui;font-style:normal;color:#4f46e5">⚿</i>';
const table = `<table class="m" style="border-collapse:collapse;font:500 12px system-ui;color:#111827">${[['', 'Feb', 'Mar'], ['Revenue', '41,900', '48,200'], ['Costs', '30,100', '31,400']].map((r, i) => `<tr>${r.map((c, j) => `<td class="${i === 0 || j === 0 ? 'hd' : ''}${i === 1 && j === 2 ? ' cell' : ''}" style="padding:5px 9px;border-bottom:1px solid #e5e7eb">${c}</td>`).join('')}</tr>`).join('')}</table>`;

export const ACCESS = {
  'habits/focus-outline': {
    code: ['focus:outline-none', 'focus-visible:ring-2'],
    note: ['Tabbed to, the button shows nothing: keyboard users lose their place (dashes: where the ring belongs).', 'A ring on keyboard focus.'],
    scene: (s) => {
      scene(s, `<div style="display:flex;gap:10px">${ghost('Cancel')}${btn('Save', 'x')}</div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['no ring', 'focus-visible ring'], { pad: 6, round: 14 }), at: (p) => { x.style.boxShadow = p ? '0 0 0 2px #fff, 0 0 0 4px #4f46e5' : '0 0 0 2px rgb(255 255 255 / 0), 0 0 0 4px rgb(79 70 229 / 0)'; } };
    },
  },
  'habits/hover-gate': {
    code: ['hover:bg-indigo-50', '@media (hover: hover) { … }'],
    note: ['Tapped on a phone, the row keeps its hover colour after the finger lifts.', 'Hover styles only where there is a pointer to hover.'],
    scene: (s) => {
      scene(s, `<div style="position:relative;width:200px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:500 13px system-ui;color:#111827">${['Inbox', 'Starred', 'Sent'].map((t, i) => `<div class="${i === 1 ? 'x' : ''}" style="padding:9px 14px;${i === 1 ? 'background:#eef2ff' : ''}">${t}</div>`).join('')}<i style="position:absolute;right:20px;top:46px;width:20px;height:20px;border-radius:50%;border:2px dashed #9ca3af"></i><small style="position:absolute;right:-6px;top:70px;font:500 10px system-ui;color:#9ca3af">finger lifted</small></div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['stuck after a tap', 'only with a pointer'], { pad: 2 }), at: (p) => { x.style.background = p ? 'transparent' : '#eef2ff'; } };
    },
  },
  'habits/logical-inline': {
    code: ['mr-2 (icon)', 'me-2 (icon)'],
    note: ['In a right-to-left page, the icon’s space stays on the right and it touches the words.', 'margin-inline-end follows the reading direction.'],
    scene: (s) => {
      const row = (dir, cls) => `<div dir="${dir}" style="display:flex;align-items:center;width:150px;padding:8px 10px;border-radius:9px;background:#f3f4f6;font:600 13px system-ui;color:#111827"><i class="${cls}" style="width:16px;height:16px;border-radius:4px;background:#4f46e5;margin-right:8px;margin-left:0"></i>${dir === 'rtl' ? 'الإعدادات' : 'Settings'}</div>`;
      scene(s, `<div style="display:grid;gap:8px">${row('ltr', 'a')}${row('rtl', 'x')}</div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [x.parentElement], ['touches in RTL', 'spaced either way'], { pad: 3 }), at: (p) => { x.style.marginRight = p ? '0px' : '8px'; x.style.marginLeft = p ? '8px' : '0px'; } };
    },
  },
  'habits/safe-area-fallback': {
    code: ['pb-[env(safe-area-inset-bottom)]', 'pb-[env(safe-area-inset-bottom,16px)]'],
    note: ['Without a fallback the padding is lost, and the bar sits under the home indicator.', 'A fallback keeps room above it.'],
    scene: (s) => {
      scene(s, phone(`<div class="x" style="position:absolute;left:0;right:0;bottom:0;padding:10px 12px 2px;background:#111827;color:#fff;font:600 12px system-ui;display:flex;justify-content:space-between">Home<span>Search</span><span>You</span></div><i style="position:absolute;left:50%;bottom:5px;translate:-50% 0;width:46px;height:4px;border-radius:2px;background:#9ca3af"></i>`));
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['under the home bar', 'room kept'], { round: 4 }), at: (p) => { x.style.paddingBottom = p ? '16px' : '2px'; } };
    },
  },
  'habits/viewport-dynamic': {
    code: ['h-screen (100vh)', 'h-dvh'],
    note: ['100vh counts the space under the browser’s toolbar: the button is hidden behind it.', 'dvh follows the visible height.'],
    scene: (s) => {
      scene(s, phone(`<div class="x" style="position:absolute;left:0;right:0;top:0;height:192px;display:grid;align-content:end;justify-items:center;padding-bottom:12px;background:#eef2ff">${btn('Get started')}</div><div style="position:absolute;left:0;right:0;bottom:0;height:34px;background:rgb(243 244 246 / .96);border-top:1px solid #e5e7eb;font:500 10px/34px system-ui;color:#6b7280;text-align:center">browser toolbar</div>`));
      const x = s.querySelector('.x');
      return { ...marked(s, [x.querySelector('.btn2')], ['behind the toolbar', 'in view'], { round: 10 }), at: (p) => { x.style.height = p ? '136px' : '192px'; } };
    },
  },
  'craft/contrast': {
    code: ['text-gray-400', 'text-gray-500 (Lc 60+)'],
    note: ['Light grey on white: too faint to read comfortably.', 'Dark enough for its size.'],
    scene: (s) => {
      scene(s, `<div style="width:200px;display:grid;gap:4px;font:500 13px/1.45 system-ui"><b style="color:#111827">Weekly digest</b><span class="x" style="color:#b4b9c2">Sent every Monday at nine, with what changed.</span></div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['Lc 32: too faint', 'Lc 62'], { pad: 3, under: true, dy: 22 }), chip: (i) => chip(i ? '#6b7280' : '#b4b9c2'), curve: 'ease-in-out', at: (p) => { x.style.color = p ? '#6b7280' : '#b4b9c2'; } };
    },
  },
  'craft/disabled-contrast': {
    code: ['disabled:opacity-40', 'disabled:bg-gray-100 disabled:text-gray-500'],
    note: ['Opacity fades the words with the button: you can’t read what is unavailable.', 'A quiet fill with readable words.'],
    scene: (s) => {
      scene(s, `<div style="display:flex;gap:10px">${btn('Save', 'a')}<span class="btn2 x" style="height:32px;padding:0 14px;font-size:13px;background:#4f46e5;color:#fff;opacity:.4">Publish</span></div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['faded words', 'readable, quiet'], { pad: 4, round: 12 }), at: (p) => { x.style.opacity = p ? 1 : 0.4; x.style.background = p ? '#f3f4f6' : '#4f46e5'; x.style.color = p ? '#6b7280' : '#fff'; } };
    },
  },
  'craft/hit-target': {
    code: ['size-5 (icon button)', 'size-5, tap area 44px'],
    note: ['A 20px icon is a 20px target: hard to hit with a thumb (dashes: what a finger needs).', 'The tap area grows to 44px; the icon stays 20px.'],
    scene: (s) => {
      scene(s, `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:600 13px system-ui;color:#111827">Notifications<span class="x" style="position:relative;display:grid;place-items:center;width:20px;height:20px;border-radius:6px;background:#eef2ff;color:#4f46e5;font:700 12px system-ui">×<i class="ta" style="position:absolute;left:50%;top:50%;width:20px;height:20px;translate:-50% -50%;border-radius:10px;background:rgb(79 70 229 / .12)"></i></span></div>`);
      const ta = s.querySelector('.ta'), [sq, pill] = [make(s, 'sq'), make(s, 'pill')];
      return { from: 20, to: 44, unit: 'px', name: 'tap area', guides: [{ el: sq, kind: 'beam' }, { el: pill, kind: 'pill' }], at: (p) => { ta.style.width = ta.style.height = p ? '44px' : '20px'; },
        track: () => { const b = box(ta, s); at(sq, `left:${b.l}px;top:${b.t}px;width:${b.w}px;height:${b.h}px;border-radius:12px;border-style:dashed`); at(pill, `left:${b.l + b.w / 2}px;top:${b.t - 16}px`); } };
    },
  },
  'craft/input-zoom': {
    code: ['text-sm (14px) in a field', 'text-base (16px)'],
    note: ['Under 16px, Safari zooms the page in when the field is tapped, and stays zoomed.', 'At 16px the page stays put.'],
    scene: (s) => {
      scene(s, field('Email', 'x', 'ana@example.com'));
      const x = s.querySelector('.x'), [sq, pill] = [make(s, 'sq'), make(s, 'pill')];
      return { from: 14, to: 16, unit: 'px', name: 'no zoom', guides: [{ el: sq, kind: 'beam' }, { el: pill, kind: 'pill' }], at: (p) => { x.style.fontSize = p ? '16px' : '14px'; },
        track: () => { const b = box(x, s); at(sq, `left:${b.l - 3}px;top:${b.t - 3}px;width:${b.w + 6}px;height:${b.h + 6}px;border-style:dashed`); at(pill, `left:${b.l + b.w / 2}px;top:${b.b + 22}px`); } };
    },
  },
  'craft/text-collision': {
    code: ['labels at fixed positions', 'labels nudged apart'],
    note: ['Two labels run into each other and read as one.', 'Moved apart, each reads on its own.'],
    scene: (s) => {
      scene(s, `<div style="position:relative;width:220px;height:110px;border-left:1.5px solid #d1d5db;border-bottom:1.5px solid #d1d5db"><svg width="220" height="110" style="position:absolute;inset:0"><polyline points="0,90 60,62 120,40 180,46 220,30" fill="none" stroke="#4f46e5" stroke-width="2.5"/><polyline points="0,80 60,70 120,46 180,60 220,58" fill="none" stroke="#f472b6" stroke-width="2.5"/></svg><span class="a" style="position:absolute;left:122px;top:24px;font:600 11px system-ui;color:#4f46e5">Signups</span><span class="x" style="position:absolute;left:126px;top:30px;font:600 11px system-ui;color:#db2777">Visits</span></div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [s.querySelector('.a'), x], ['run together', 'apart'], { pad: 2 }), at: (p) => { x.style.top = p ? '52px' : '30px'; } };
    },
  },
  'craft/touch-manipulation': {
    code: ['(default tap highlight)', '-webkit-tap-highlight-color: transparent'],
    note: ['Tapped on a phone, a grey box flashes over the custom control.', 'No flash: the control’s own pressed state answers.'],
    scene: (s) => {
      scene(s, `<div style="position:relative"><div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:600 13px system-ui;color:#111827"><i style="width:18px;height:18px;border-radius:5px;background:#4f46e5"></i>Starred</div><span class="x" style="position:absolute;inset:0;border-radius:4px;background:rgb(0 0 0 / .18)"></span></div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['grey flash on tap', 'none'], { pad: 3 }), at: (p) => { x.style.opacity = p ? 0 : 1; } };
    },
  },
  'a11y/control-name': spoken({ ui: `<span class="m" style="display:grid;place-items:center;width:32px;height:32px;border-radius:9px;background:#f3f4f6;font:600 16px system-ui;color:#111827">×</span>`, said: ['button', 'Close, button'], labels: ['no name', 'aria-label'], code: ['<button>×</button>', '<button aria-label="Close">×</button>'], note: ['Only its role is heard: “button”.', 'It says what it does.'] }),
  'a11y/image-alt': spoken({ ui: photo(140, 90, 'm'), said: ['IMG_2041.jpg, image', 'The team on the ridge at sunrise, image'], labels: ['no alt', 'says what it shows'], code: ['<img src="IMG_2041.jpg">', '<img src="…" alt="The team on the ridge at sunrise">'], note: ['A screen reader reads out the file name.', 'Alt says what the picture is for.'] }),
  'a11y/alt-cliche': spoken({ ui: photo(140, 90, 'm'), said: ['Image of a team, image', 'The team on the ridge at sunrise, image'], labels: ['“image” twice', 'what it shows'], code: ['alt="Image of a team"', 'alt="The team on the ridge at sunrise"'], note: ['“Image of” is said, then “image” again.', 'Only what it shows.'] }),
  'a11y/svg-name': spoken({ ui: `<svg class="m" width="140" height="70" viewBox="0 0 140 70"><polyline points="0,60 35,48 70,40 105,22 140,12" fill="none" stroke="#4f46e5" stroke-width="3"/></svg>`, said: ['image', 'Signups rose 20% this month, image'], labels: ['no description', 'role="img" + a title'], code: ['<svg>', '<svg role="img" aria-label="Signups rose 20% this month">'], note: ['The chart is just “image”.', 'It says what the chart shows.'] }),
  'a11y/tabindex-positive': stops({ ui: `<div style="display:grid;gap:8px;justify-items:start">${field('Name', 'a')}${field('Email', 'b')}${btn('Send', 'c')}</div>`, before: ['.c', '.a', '.b'], after: ['.a', '.b', '.c'], labels: ['Send first, then back up', 'page order'],
    code: ['<button tabindex="1">Send</button>', '<button>Send</button>'], note: ['tabindex="1" sends focus to Send before the fields it sends.', 'Tab follows the page.'] }),
  'a11y/tabindex-redundant': markup({ pre: '<button', a: ' tabindex="0"', post: '>Save</button>', labels: ['adds nothing', 'cut'], note: ['A button is already in the Tab order.', 'Nothing to add.'] }),
  'a11y/hidden-focusable': stops({ ui: `<div style="display:grid;gap:8px;justify-items:start">${ghost('Back', 'a')}<span class="h" style="padding:6px 10px;border-radius:8px;border:1.5px dashed #d1d5db;font:500 11px system-ui;color:#9ca3af">aria-hidden menu</span>${btn('Next', 'b')}</div>`, before: ['.a', '.h', '.b'], after: ['.a', '.b'], labels: ['focus lands on nothing', 'skipped'],
    code: ['<div aria-hidden="true"><a href>…', '<div aria-hidden="true" inert>'], note: ['Focus lands inside something announced as nothing.', 'inert takes it out of the Tab order too.'] }),
  'a11y/role-presentation-control': spoken({ ui: btn('Save', 'm'), said: ['Save', 'Save, button'], labels: ['told to be nothing', 'a button'], code: ['<button role="presentation">', '<button>'], note: ['“Save”, and nothing says it can be pressed.', 'Its role is back.'] }),
  'a11y/label-on-generic': spoken({ ui: `<div class="m" style="width:160px;padding:12px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:700 13px system-ui;color:#111827">Pro plan</div>`, said: ['(nothing)', 'Pro plan, group'], labels: ['label never read', 'on a role'], code: ['<div aria-label="Pro plan">', '<section aria-label="Pro plan">'], note: ['A plain box has no name to give; the label is never read.', 'On an element with a role, it is.'] }),
  'a11y/label-in-name': spoken({ ui: btn('Send', 'm'), said: ['“Click Send” → no match (name: Submit form)', '“Click Send” → pressed'], labels: ['voice can’t find it', 'name starts with the words'], code: ['aria-label="Submit form"', 'aria-label="Send" (or none)'], note: ['Someone says the word they see, and nothing answers.', 'The name holds the visible words.'] }),
  'a11y/role-in-label': spoken({ ui: btn('Close', 'm'), said: ['Close button, button', 'Close, button'], labels: ['role said twice', 'once'], code: ['aria-label="Close button"', 'aria-label="Close"'], note: ['The role is in the label and said again.', 'The screen reader adds the role.'] }),
  'a11y/link-name-reused': spoken({ ui: `<div style="display:grid;gap:6px;width:200px;font:500 12.5px system-ui;color:#374151">${['Pricing', 'Security'].map((t, i) => `<div>${t} — <span class="${i ? '' : 'm'}" style="color:#4f46e5;text-decoration:underline">Read more</span></div>`).join('')}</div>`, said: ['Read more, link', 'Read more about pricing, link'], labels: ['which “Read more”?', 'says where'], code: ['<a>Read more</a>', '<a>Read more<span class="sr-only"> about pricing</span></a>'], note: ['In a list of links, they are all “Read more”.', 'Each says where it goes.'] }),
  'a11y/heading-skip': outlineFix({ rows: [['h1', 'Pricing'], [phrase('h3', 'h2', 'ph'), 'Plans', 'x'], ['h3', 'Pro']], mark: '.x', swap: true, labels: ['h1 → h3', 'h1 → h2'], code: ['<h3>Plans</h3>', '<h2>Plans</h2>'], note: ['Moving by headings, people hear a level missing.', 'Each level follows the last.'] }),
  'a11y/heading-h1-many': outlineFix({ rows: [['h1', 'Pricing'], [phrase('h1', 'h2', 'ph'), 'Plans', 'x'], ['h3', 'Pro']], mark: '.x', swap: true, labels: ['two h1', 'one'], code: ['<h1>Plans</h1>', '<h2>Plans</h2>'], note: ['With two h1s, neither says what the page is.', 'One h1 names the page.'] }),
  'a11y/main-many': outlineFix({ rows: [['banner', 'Header'], ['main', 'Pricing'], [phrase('main', 'section', 'ph'), 'FAQ', 'x']], mark: '.x', swap: true, labels: ['two mains', 'one'], code: ['<main>FAQ</main>', '<section>FAQ</section>'], note: ['“Skip to main content” has two places to go.', 'One main.'] }),
  'a11y/nav-unnamed': spoken({ ui: `<nav class="m" style="display:flex;gap:12px;font:600 12px system-ui;color:#4f46e5"><span>Terms</span><span>Privacy</span><span>Contact</span></nav>`, said: ['navigation', 'Footer, navigation'], labels: ['which navigation?', 'aria-label'], code: ['<nav>', '<nav aria-label="Footer">'], note: ['Every nav is “navigation”.', 'Named, each says which.'] }),
  'a11y/iframe-title': spoken({ ui: `<div class="m" style="width:170px;height:96px;border-radius:10px;background:#111827;display:grid;place-items:center"><i style="width:0;height:0;border-left:16px solid #fff;border-top:10px solid transparent;border-bottom:10px solid transparent"></i></div>`, said: ['frame, https://www.youtube.com/embed/…', 'Product tour, frame'], labels: ['the address', 'a title'], code: ['<iframe src="…">', '<iframe src="…" title="Product tour">'], note: ['A frame is announced by its address.', 'A title says what is in it.'] }),
  'a11y/iframe-scroll': {
    code: ['<iframe scrolling="no">', '<iframe> (scrolls)'],
    note: ['Zoomed in, the frame’s content no longer fits and can’t be scrolled to.', 'It scrolls when it needs to.'],
    scene: (s) => {
      scene(s, `<div class="x" style="position:relative;width:180px;height:100px;border-radius:10px;box-shadow:inset 0 0 0 1px #d1d5db;overflow:hidden;background:#fff;font:500 14px/1.5 system-ui;color:#111827;padding:8px 10px;box-sizing:border-box">Book a demo<br>Pick a day that suits<br>you and the team.<br><b>Confirm</b><i class="sb" style="position:absolute;right:3px;top:4px;width:6px;height:50px;border-radius:3px;background:#c7c9d1;opacity:0"></i></div>`);
      const sb = s.querySelector('.sb');
      return { ...marked(s, [s.querySelector('.x')], ['cut, can’t scroll', 'scrolls'], { pad: 3, round: 12 }), at: (p) => { sb.style.opacity = p ? 1 : 0; } };
    },
  },
  'a11y/table-headers': spoken({ ui: table, said: ['48,200', 'Revenue, Mar, 48,200'], labels: ['a number alone', 'with its row and column'], mark: '.cell', code: ['<td>Mar</td>', '<th scope="col">Mar</th>'], note: ['Each cell is read with nothing to say what it is.', 'Header cells give it its row and column.'],
    also: (s, p) => s.querySelectorAll('.hd').forEach((h) => { h.style.fontWeight = p ? 700 : 500; h.style.background = p ? '#f3f4f6' : 'transparent'; }) }),
  'a11y/heading-in-summary': markup({ pre: '<summary>', a: '<h3>Billing</h3>', b: 'Billing', post: '</summary>', labels: ['a heading in a button', 'plain words'], note: ['Some browsers treat summary as a button, and the heading stops being one.', 'The summary holds plain words.'] }),
  'a11y/redundant-role': markup({ pre: '<button', a: ' role="button"', post: '>Save</button>', labels: ['says it twice', 'cut'], note: ['The tag already says it.', 'One less thing to keep true.'] }),
  'a11y/role-on-structure': spoken({ ui: `<ul style="margin:0;padding:0 0 0 16px;font:500 13px/1.6 system-ui;color:#111827"><li>Fast</li><li class="m">Private</li><li>Simple</li></ul>`, said: ['list, 2 items', 'list, 3 items'], labels: ['an item lost', 'counted'], code: ['<li role="button">Private</li>', '<li><button>Private</button></li>'], note: ['A role on the item takes it out of the list: the count is wrong.', 'The control goes inside the item.'] }),
  'a11y/native-over-role': stops({ ui: `<div style="display:flex;gap:10px">${ghost('Back', 'a')}<span class="x" style="display:inline-flex;align-items:center;height:32px;padding:0 14px;border-radius:9px;background:#4f46e5;color:#fff;font:600 13px system-ui">Save</span>${ghost('Help', 'c')}</div>`, before: ['.a', '.c'], after: ['.a', '.x', '.c'], labels: ['Tab skips it', 'a <button>'],
    code: ['<div role="button">Save</div>', '<button>Save</button>'], note: ['The div says “button” and Tab never reaches it.', 'A button takes focus and Enter by itself.'] }),
  'a11y/field-autocomplete': appears({ ui: `<div style="display:grid;gap:4px">${field('Email', 'x')}<div class="sg" style="width:200px;padding:7px 10px;border-radius:8px;background:#fff;box-shadow:0 6px 16px -6px rgb(0 0 0 / .3);font:500 12px system-ui;color:#111827">ana@example.com <small style="color:#9ca3af">· saved</small></div></div>`, show: '.sg', labels: ['typed by hand', 'filled for you'], code: ['<input type="email">', '<input type="email" autocomplete="email">'], note: ['The browser can’t tell what the field is for.', 'It offers the saved address.'] }),
  'forms/nested-form': markup({ pre: '<form>…', a: '<form>…</form>', b: '', post: '…</form>', labels: ['a form in a form', 'one form'], note: ['Which form a button submits depends on how the page was built.', 'One form per submit.'] }),
  'forms/button-type': markup({ pre: '<button', a: '', b: ' type="button"', post: '>Show</button>', labels: ['submits the form', 'type="button"'], note: ['Pressing “Show password” sends the half-filled form.', 'It only does its own job.'] }),
  'forms/submit-missing': appears({ ui: `<div style="display:grid;gap:8px;justify-items:start">${field('Email')}${btn('Subscribe', 'x')}</div>`, show: '.x', labels: ['no way to send', 'a submit button'], code: ['(no submit button)', '<button type="submit">Subscribe</button>'], note: ['Enter does nothing, and a screen reader finds no way to send it.', 'A submit button.'] }),
  'forms/fieldset-legend': spoken({ ui: `<div class="m" style="display:grid;gap:6px;padding:10px;border-radius:10px;box-shadow:inset 0 0 0 1px #e5e7eb">${field('Street')}${field('City')}</div>`, said: ['group', 'Shipping address, group'], labels: ['a nameless group', 'a legend'], code: ['<fieldset>', '<fieldset><legend>Shipping address</legend>'], note: ['“group”, and never what about.', 'The legend names it.'] }),
  'forms/field-name': markup({ pre: '<input id="email"', a: '', b: ' name="email"', post: '>', labels: ['not sent', 'name="email"'], note: ['A form sends only named fields: what is typed here is left behind.', 'Named, it is sent.'] }),
  'forms/password-no-form': appears({ ui: field('Password', 'f', '••••••••', '') .replace('</span></label>', `${pwKey}</span></label>`), show: '.key', labels: ['no form to fill', 'the manager offers'], code: ['<input type="password"> (no form)', '<form><input type="password" autocomplete="current-password">'], note: ['Password managers look for a form, and find none.', 'Inside a form, the key is offered.'] }),
  'forms/search-landmark': outlineFix({ rows: [['banner', 'Header'], ['navigation', 'Main menu'], ['search', 'Search docs', 'x'], ['main', 'Docs']], mark: '.x', add: true, labels: ['no landmark', 'role="search"'], code: ['<form>…search…</form>', '<search><form>…</form></search>'], note: ['People who jump by landmarks can’t jump to search.', 'A search landmark.'] }),
  'forms/form-unnamed': spoken({ ui: `<div class="m" style="display:flex;gap:8px;align-items:end">${field('Email')}${btn('Join')}</div>`, said: ['form', 'Newsletter, form'], labels: ['which form?', 'aria-label'], code: ['<form>', '<form aria-label="Newsletter">'], note: ['Every form is “form”.', 'Named, it says which.'] }),
  'forms/get-sensitive': {
    code: ['<form method="get">', '<form method="post">'],
    note: ['The password lands in the address bar, the history and the server’s logs.', 'Sent in the body, it stays out of the address.'],
    scene: (s) => {
      scene(s, `<div style="width:250px;padding:6px 10px;border-radius:99px;background:#f3f4f6;font:500 11.5px ui-monospace,monospace;color:#374151;white-space:nowrap;overflow:hidden">atlas.app/login${phrase('?user=ana&amp;password=hunter2', '', 'x')}</div>`);
      const x = s.querySelector('.x'), set = wirePhrase(x);
      return { ...marked(s, [x], ['in the address', 'out of it'], { pad: 2 }), at: set };
    },
  },
  'forms/textarea-resize': {
    code: ['resize-none h-16', 'resize-y min-h-16'],
    note: ['A long message is written through a two-line window.', 'It can be pulled taller.'],
    scene: (s) => {
      scene(s, `<div class="x" style="position:relative;width:200px;height:44px;padding:8px 10px;border-radius:8px;box-shadow:inset 0 0 0 1px #d1d5db;font:500 12.5px/1.45 system-ui;color:#111827;overflow:hidden;box-sizing:border-box">Hi team, the export broke again this morning after the update. Steps to reproduce below.<i class="gr" style="position:absolute;right:3px;bottom:3px;width:8px;height:8px;border-right:2px solid #9ca3af;border-bottom:2px solid #9ca3af;opacity:0"></i></div>`);
      const x = s.querySelector('.x'), gr = s.querySelector('.gr');
      return { ...marked(s, [x], ['stuck at two lines', 'can grow'], { pad: 3 }), at: (p) => { x.style.height = p ? '84px' : '44px'; gr.style.opacity = p ? 1 : 0; } };
    },
  },
  'forms/label-unbound': spoken({ ui: field('Email', 'm'), said: ['edit text', 'Email, edit text'], labels: ['a field with no name', 'for= the field'], code: ['<label>Email</label><input>', '<label for="email">Email</label><input id="email">'], note: ['The label is tied to nothing: the field has no name.', 'Tied, the label names it and clicking it focuses the field.'] }),
  'forms/label-proximity': {
    code: ['label mb-5', 'label mb-1.5'],
    note: ['The label sits nearer the field above it than its own.', 'Close to its own field.'],
    scene: (s) => {
      scene(s, `<div style="display:grid;gap:10px">${['Email', 'Phone'].map((l) => `<label style="display:grid;font:600 12px system-ui;color:#374151"><span class="lb" style="margin-bottom:20px">${l}</span><span class="in" style="height:28px;border-radius:7px;box-shadow:inset 0 0 0 1px #d1d5db;width:190px"></span></label>`).join('')}</div>`);
      const lbs = [...s.querySelectorAll('.lb')], ins = [...s.querySelectorAll('.in')], g = [make(s, 'hl'), make(s, 'hl'), make(s, 'beam'), make(s, 'pill')];
      return { from: 20, to: 6, unit: 'px', guides: [{ el: g[0], kind: 'h' }, { el: g[1], kind: 'h' }, { el: g[2], kind: 'beam' }, { el: g[3], kind: 'pill' }], at: (p) => lbs.forEach((l) => { l.style.marginBottom = p ? '6px' : '20px'; }),
        track: () => { const a = box(lbs[1], s), b = box(ins[1], s); at(g[0], `top:${a.b}px;left:0;right:0`); at(g[1], `top:${b.t}px;left:0;right:0`); at(g[2], `left:${a.l - 14}px;top:${a.b}px;height:${b.t - a.b}px`); at(g[3], `left:${b.r + 14}px;top:${(a.b + b.t) / 2}px;translate:0 -50%`); } };
    },
  },
  'forms/invalid-undescribed': spoken({ ui: field('Email', 'm', 'ana@', 'box-shadow:inset 0 0 0 1.5px #ef4444'), said: ['Email, invalid entry', 'Email, invalid entry, Add the part after @'], labels: ['invalid, but what?', 'the message tied'], code: ['aria-invalid="true"', 'aria-invalid="true" aria-describedby="email-error"'], note: ['It says “invalid”, not what is wrong.', 'The message is read with it.'] }),
  'forms/required-unmarked': {
    code: ['<label>Email</label>', '<label>Email <span>(required)</span></label>'],
    note: ['Nothing says it’s required until the form refuses.', 'Said up front.'],
    scene: (s) => {
      scene(s, `<label style="display:grid;gap:5px;width:200px;font:600 12px system-ui;color:#374151"><span>Email${phrase('', '&nbsp;<span style="color:#6b7280;font-weight:500">(required)</span>', 'x')}</span><span style="height:32px;border-radius:8px;box-shadow:inset 0 0 0 1px #d1d5db"></span></label>`);
      const x = s.querySelector('.x'), set = wirePhrase(x);
      return { ...marked(s, [x.parentElement], ['not marked', 'marked'], { pad: 3 }), at: set };
    },
  },
  'forms/required-unsaid': spoken({ ui: field('Email *', 'm'), said: ['Email, edit text', 'Email, required, edit text'], labels: ['the * is only seen', 'required'], code: ['<input> (an * in the label)', '<input required>'], note: ['The star is for the eye; a screen reader doesn’t hear it, the browser doesn’t enforce it.', 'required says it and enforces it.'] }),
  'forms/label-overridden': spoken({ ui: field('Email', 'm'), said: ['Field, edit text', 'Email, edit text'], labels: ['says one thing, shows another', 'the label shown'], code: ['<input aria-label="Field">', '<input> (named by its label)'], note: ['The screen says “Email”, the screen reader “Field”.', 'One name, the one shown.'] }),
  'forms/autocomplete-off': appears({ ui: field('New password', 'f', '••••••••').replace('</span></label>', `${pwKey}</span></label>`), show: '.key', labels: ['manager turned away', 'offers a strong one'], code: ['autocomplete="off"', 'autocomplete="new-password"'], note: ['A password manager can’t fill it, so people pick one they can type.', 'It offers a strong password.'] }),
  'forms/numeric-keyboard': keyboardFix({ from: 'letters', to: 'digits', fieldHtml: field('Amount', '', '120').replace('width:200px', 'width:108px'), labels: ['letters keyboard', 'number pad'], code: ['<input>', '<input inputmode="decimal">'], note: ['People switch keyboards before they can type a number.', 'The number pad comes up.'] }),
  'forms/number-for-code': {
    code: ['<input type="number">', '<input inputmode="numeric" autocomplete="one-time-code">'],
    note: ['A number field drops the leading zero and shows spinner arrows.', 'A text field with the number pad keeps the code as typed.'],
    scene: (s) => {
      scene(s, field('Code', 'f', `${phrase('4821', '04821', 'x')}<span class="sp" style="margin-left:auto;font:600 9px/1 system-ui;color:#9ca3af;display:grid">▲<br>▼</span>`));
      const x = s.querySelector('.x'), set = wirePhrase(x), sp = s.querySelector('.sp');
      return { ...marked(s, [x], ['04821 → 4821', 'as typed'], { pad: 3 }), at: (p) => { set(p); sp.style.opacity = p ? 0 : 1; } };
    },
  },
  'forms/split-code': {
    code: ['six <input maxlength="1">', 'one <input autocomplete="one-time-code">'],
    note: ['Six boxes for one code: paste and autofill from a text message break.', 'One field takes the whole code.'],
    scene: (s) => {
      scene(s, `<div style="position:relative;width:220px;height:40px"><div class="a" style="position:absolute;inset:0;display:flex;gap:6px">${[...'048213'].map((d) => `<span style="flex:1;display:grid;place-items:center;border-radius:8px;box-shadow:inset 0 0 0 1px #d1d5db;font:600 16px system-ui;color:#111827">${d}</span>`).join('')}</div><div class="b" style="position:absolute;inset:0;display:flex;align-items:center;padding:0 12px;border-radius:8px;box-shadow:inset 0 0 0 1px #d1d5db;font:600 16px system-ui;letter-spacing:.3em;color:#111827;opacity:0">048213</div></div>`);
      const a = s.querySelector('.a'), b = s.querySelector('.b');
      return { ...marked(s, [a], ['six boxes', 'one field'], { pad: 4, round: 10 }), at: (p) => { a.style.opacity = p ? 0 : 1; b.style.opacity = p ? 1 : 0; } };
    },
  },
  'forms/identifier-correction': {
    code: ['<input> (username)', '<input autocapitalize="none" autocorrect="off" spellcheck="false">'],
    note: ['The phone capitalises and “fixes” the username as it is typed.', 'Kept as typed.'],
    scene: (s) => {
      scene(s, field('Username', 'f', phrase('Ana.Dev', 'ana.dev', 'x')));
      const x = s.querySelector('.x'), set = wirePhrase(x);
      return { ...marked(s, [x], ['autocorrected', 'as typed'], { pad: 3 }), at: set };
    },
  },
  'forms/invalid-on-load': {
    code: [':invalid { border-red }', ':user-invalid { border-red }'],
    note: ['Before anything is typed, the empty required field is already red.', 'It waits for the person to try.'],
    scene: (s) => {
      scene(s, field('Email', 'x', '', 'box-shadow:inset 0 0 0 1.5px #ef4444'));
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['an error before typing', 'waits'], { pad: 3 }), at: (p) => { x.style.boxShadow = p ? 'inset 0 0 0 1px #d1d5db' : 'inset 0 0 0 1.5px #ef4444'; } };
    },
  },
  'forms/submit-disabled': {
    code: ['<button disabled={!valid}>', '<button> + an error on press'],
    note: ['The button is grey and nothing says why.', 'It can be pressed, and says what is missing.'],
    scene: (s) => {
      scene(s, `<div style="display:grid;gap:8px;justify-items:start">${field('Email', '', 'ana@')}<span class="x" style="display:inline-flex;align-items:center;height:32px;padding:0 14px;border-radius:9px;background:#e5e7eb;color:#9ca3af;font:600 13px system-ui">Continue</span><small class="er" style="font:500 11.5px system-ui;color:#dc2626;opacity:0">Add the part after @ to continue.</small></div>`);
      const x = s.querySelector('.x'), er = s.querySelector('.er');
      return { ...marked(s, [x], ['grey, no reason', 'says why'], { pad: 4, round: 12 }), at: (p) => { x.style.background = p ? '#4f46e5' : '#e5e7eb'; x.style.color = p ? '#fff' : '#9ca3af'; er.style.opacity = p ? 1 : 0; } };
    },
  },
  'forms/control-hidden': stops({ ui: `<div style="display:grid;gap:8px;justify-items:start;font:600 13px system-ui;color:#111827">${field('Email', 'a')}<label style="display:flex;align-items:center;gap:8px"><span class="cb" style="width:18px;height:18px;border-radius:5px;background:#4f46e5;display:grid;place-items:center;color:#fff;font-size:11px">✓</span>Send me updates</label>${btn('Join', 'b')}</div>`, before: ['.a', '.b'], after: ['.a', '.cb', '.b'], labels: ['can’t be reached', 'the real checkbox, hidden visually'],
    code: ['input { display: none }', 'input { sr-only }'], note: ['The real checkbox is removed: Tab skips it and a screen reader never hears it.', 'Hidden only from sight, it stays reachable.'] }),
  'forms/name-split': {
    code: ['First name + Last name', 'Full name'],
    note: ['Many names don’t split into first and last.', 'One field takes any name.'],
    scene: (s) => {
      scene(s, `<div style="position:relative;width:220px;height:56px"><div class="a" style="position:absolute;inset:0;display:flex;gap:8px">${field('First name').replace('width:200px', 'width:106px')}${field('Last name').replace('width:200px', 'width:106px')}</div><div class="b" style="position:absolute;inset:0;opacity:0">${field('Full name', '', 'María José García López').replace('width:200px', 'width:220px')}</div></div>`);
      const a = s.querySelector('.a'), b = s.querySelector('.b');
      return { ...marked(s, [a], ['split in two', 'one field'], { pad: 4, round: 10 }), at: (p) => { a.style.opacity = p ? 0 : 1; b.style.opacity = p ? 1 : 0; } };
    },
  },
  'forms/latin-only': {
    code: ['pattern="[A-Za-z]+"', '(any letters)'],
    note: ['José is told his name is wrong.', 'Any name in any script.'],
    scene: (s) => {
      scene(s, `<div style="display:grid;gap:5px">${field('Name', 'x', 'José', 'box-shadow:inset 0 0 0 1.5px #ef4444')}<small class="er" style="font:500 11.5px system-ui;color:#dc2626">Use the letters A to Z only.</small></div>`);
      const x = s.querySelector('.x'), er = s.querySelector('.er'), go = fold(er);
      return { ...marked(s, [er], ['refuses José', 'accepted'], { pad: 3 }), at: (p) => { go(p); x.style.boxShadow = p ? 'inset 0 0 0 1px #d1d5db' : 'inset 0 0 0 1.5px #ef4444'; } };
    },
  },
  'forms/submit-wording': {
    code: ['<button>Submit</button>', '<button>Save changes</button>'],
    note: ['“Submit” says nothing about what happens.', 'The button says it.'],
    scene: (s) => {
      scene(s, `<span class="btn2" style="height:34px;padding:0 16px;font-size:13px;background:#4f46e5">${phrase('Submit', 'Save changes', 'x')}</span>`);
      const x = s.querySelector('.x'), set = wirePhrase(x);
      return { ...marked(s, [x.parentElement], ['Submit', 'says what happens'], { pad: 4, round: 12 }), at: set };
    },
  },
  'forms/radio-group': spoken({ ui: `<div class="m" style="display:grid;gap:6px;font:600 13px system-ui;color:#111827">${['Monthly', 'Yearly'].map((t, i) => `<label style="display:flex;align-items:center;gap:8px"><i style="width:14px;height:14px;border-radius:50%;box-shadow:inset 0 0 0 ${i ? 1.5 : 4}px ${i ? '#9ca3af' : '#4f46e5'}"></i>${t}</label>`).join('')}</div>`, said: ['Monthly, radio button, checked', 'Billing, radio group, Monthly, checked, 1 of 2'], labels: ['the question is never read', 'a named group'], code: ['two <input type="radio">', '<fieldset><legend>Billing</legend>…'], note: ['Each option is read, never the question they answer.', 'The group says what is being chosen.'] }),
  'forms/describedby-missing': spoken({ ui: `<div style="display:grid;gap:4px">${field('Email', 'm')}<small style="font:500 11.5px system-ui;color:#6b7280">We never share it.</small></div>`, said: ['Email, edit text', 'Email, edit text, We never share it.'], labels: ['points at nothing', 'tied'], code: ['aria-describedby="email-hint" (no such id)', 'id="email-hint" on the hint'], note: ['It points at a message that isn’t there.', 'The hint is read with the field.'] }),
  'forms/input-type': keyboardFix({ from: 'letters', to: 'email', fieldHtml: field('Email', '', 'ana').replace('width:200px', 'width:108px'), labels: ['no @ on the keyboard', '@ at hand'], code: ['<input type="text">', '<input type="email">'], note: ['A plain text field brings a keyboard with no @.', 'type="email" brings @ and the browser’s own check.'] }),
  'forms/visual-order': stops({ ui: `<div style="display:flex;gap:8px;align-items:end">${field('City', 'b').replace('width:200px', 'width:100px')}${field('Street', 'a').replace('width:200px', 'width:100px')}</div>`, before: ['.a', '.b'], after: ['.b', '.a'], labels: ['focus runs backwards', 'in reading order'],
    code: ['flex-row-reverse', 'source order = visual order'], note: ['Drawn right to left, Tab goes against the eye.', 'The source order matches what is seen.'] }),
  'forms/placeholder-instruction': {
    code: ['placeholder="8 or more characters"', 'a hint under the field'],
    note: ['The instruction lives in the placeholder: the first keystroke wipes it.', 'A hint that stays while typing.'],
    scene: (s) => {
      scene(s, `<div style="display:grid;gap:4px">${field('Password', 'f', '••••')}<small class="h" style="font:500 11.5px system-ui;color:#6b7280">8 or more characters</small></div>`);
      const h = s.querySelector('.h'); h.style.opacity = 0;
      return { ...marked(s, [h], ['gone on typing', 'stays'], { pad: 3 }), at: (p) => { h.style.opacity = p ? 1 : 0; } };
    },
  },
  'forms/inline-handler': markup({ pre: '<button', a: ' onclick="save()"', post: '>Save</button>', labels: ['blocked by a strict CSP', 'a listener in the script'], note: ['A strict content security policy blocks inline script: the button does nothing.', 'The handler is attached from the script file.'] }),
  'html/page-lang': markup({ pre: '<html', a: '', b: ' lang="fr"', post: '>', labels: ['no language', 'lang="fr"'], note: ['A screen reader guesses the accent and reads French as English.', 'It reads in the page’s language.'] }),
  'html/viewport-meta': {
    code: ['(no viewport meta)', '<meta name="viewport" content="width=device-width">'],
    note: ['A phone draws the page 980px wide and shrinks it.', 'The page is laid out for the phone.'],
    scene: (s) => {
      scene(s, phone(`<div class="x" style="width:130px;transform-origin:0 0;scale:.42;padding:10px;font:700 26px system-ui;color:#111827">Atlas<p style="margin:6px 0 0;font:500 16px/1.5 system-ui;color:#4b5563;width:290px">Plan launches with your whole team, in one place.</p></div>`));
      const x = s.querySelector('.x');
      return { ...marked(s, [s.querySelector('.ph')], ['shrunk desktop page', 'fits the phone'], { pad: 3, round: 20 }), at: (p) => { x.style.scale = p ? '1' : '.42'; x.querySelector('p').style.width = p ? '110px' : '290px'; x.style.fontSize = p ? '18px' : '26px'; } };
    },
  },
  'html/zoom-disabled': markup({ pre: '<meta name="viewport" content="', a: 'user-scalable=no', b: '…', post: '">', code: ['content="width=device-width, user-scalable=no"', 'content="width=device-width"'], labels: ['pinch zoom off', 'zoom allowed'], note: ['People who need bigger text can’t pinch to zoom.', 'Zoom works.'] }),
  'html/quirks-mode': markup({ pre: '', a: '', b: '<!DOCTYPE html>', post: '<html>…', labels: ['1990s layout rules', 'standards mode'], note: ['With no doctype, boxes and tables size by old rules.', 'One line puts the page in standards mode.'] }),
  'html/landmark-main': outlineFix({ rows: [['banner', 'Header'], ['navigation', 'Menu'], ['main', 'Pricing', 'x']], mark: '.x', add: true, labels: ['no main', '<main>'], code: ['<div class="content">', '<main>'], note: ['There is nowhere to skip to past the header.', 'A main landmark.'] }),
  'html/banner-many': outlineFix({ rows: [['banner', 'Header'], ['main', 'Pricing'], ['banner', 'Plan header', 'x']], mark: '.x', labels: ['two banners', 'one'], code: ['<header> inside the page body', '<div> (or a header inside a section)'], note: ['A landmark that appears twice says nothing about where.', 'One page header.'] }),
  'html/h1-missing': outlineFix({ rows: [['h1', 'Pricing', 'x'], ['h2', 'Plans'], ['h3', 'Pro']], mark: '.x', add: true, labels: ['no h1', 'one h1'], code: ['(no <h1>)', '<h1>Pricing</h1>'], note: ['Nothing says what the page is.', 'An h1 names it.'] }),
  'html/list-fake': spoken({ ui: `<div class="m" style="font:500 13px/1.6 system-ui;color:#111827">• Fast<br>• Private<br>• Simple</div>`, said: ['bullet Fast bullet Private bullet Simple', 'list, 3 items, Fast'], labels: ['marks read as text', 'a real list'], code: ['• Fast<br>• Private', '<ul><li>Fast</li>…</ul>'], note: ['The bullets are read as characters, and no list is announced.', 'A list says how many items.'] }),
  'html/list-structure': spoken({ ui: `<div style="font:500 13px/1.6 system-ui;color:#111827"><div class="m">• Fast</div><div>• Private</div></div>`, said: ['Fast', 'Fast, 1 of 2'], labels: ['an item on its own', 'in its list'], code: ['<li> outside <ul>', '<ul><li>'], note: ['On its own, the item isn’t part of any list.', 'Inside a list it is counted.'] }),
  'html/pointer-generic': stops({ ui: `<div style="display:flex;gap:10px">${ghost('Back', 'a')}<div class="x" style="width:110px;padding:10px;border-radius:10px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:700 12.5px system-ui;color:#111827;cursor:pointer">Project Atlas</div>${ghost('Help', 'c')}</div>`, before: ['.a', '.c'], after: ['.a', '.x', '.c'], labels: ['mouse only', 'a link'],
    code: ['<div onClick>', '<a href> (or <button>)'], note: ['Pressable with a mouse; Tab skips it.', 'A link takes focus and Enter.'] }),
  'html/link-as-button': spoken({ ui: `<span class="m" style="font:600 13px system-ui;color:#dc2626;text-decoration:underline">Delete</span>`, said: ['Delete, link', 'Delete, button'], labels: ['says link, does an action', 'a button'], code: ['<a href="#" onClick={remove}>', '<button onClick={remove}>'], note: ['Announced as a link, it deletes something.', 'An action is a button.'] }),
  'html/boolean-value': markup({ pre: '<button', a: ' disabled="false"', post: '>Save</button>', labels: ['still disabled', 'removed when off'], note: ['The attribute being there disables it, even with “false”.', 'Leave it off to enable.'] }),
  'html/figure-caption': appears({ ui: `<figure style="margin:0;display:grid;gap:6px">${photo(150, 86)}<figcaption class="x" style="font:500 11.5px system-ui;color:#6b7280">The ridge at sunrise, day two.</figcaption></figure>`, show: '.x', labels: ['a figure, no caption', 'a caption'], code: ['<figure><img></figure>', '<figure><img><figcaption>…</figcaption></figure>'], note: ['A figure without a caption is a plain image in a box.', 'The caption is what makes it a figure.'] }),
  'html/pre-no-code': markup({ pre: '<pre>', a: '', b: '<code>', post: 'npm install plumber', labels: ['spacing, not code', 'says it is code'], note: ['<pre> keeps the spacing; nothing says it is code.', '<code> says so.'] }),
  'html/pre-scroll-keyboard': stops({ ui: `<div style="display:grid;gap:8px;justify-items:start">${ghost('Back', 'a')}<pre class="sc" style="margin:0;width:180px;overflow:hidden;padding:8px;border-radius:8px;background:#111827;color:#e5e7eb;font:500 11px ui-monospace,monospace">npx plumber check --all --report=html</pre>${btn('Next', 'b')}</div>`, before: ['.a', '.b'], after: ['.a', '.sc', '.b'], labels: ['can’t be scrolled', 'tabindex="0"'],
    code: ['<pre class="overflow-x-auto">', '<pre class="overflow-x-auto" tabindex="0">'], note: ['The end of the line runs off, and a keyboard can’t scroll to it.', 'A stop of its own: arrows scroll it.'] }),
  'html/pre-scroll-region': spoken({ ui: `<pre class="m" style="margin:0;width:180px;overflow:hidden;padding:8px;border-radius:8px;background:#111827;color:#e5e7eb;font:500 11px ui-monospace,monospace">npx plumber check --all</pre>`, said: ['(nothing)', 'Install command, region'], labels: ['a stop with no name', 'aria-label'], code: ['<pre tabindex="0">', '<pre tabindex="0" role="region" aria-label="Install command">'], note: ['Focus stops on it and nothing is said.', 'It says what it holds.'] }),
  'html/img-size': {
    code: ['<img src="hero.jpg">', '<img src="hero.jpg" width="320" height="180">'],
    note: ['No room is kept for the picture: when it arrives, the text below jumps down (dashes: where the text was).', 'The size is known up front: nothing moves.'],
    scene: (s) => {
      scene(s, `<div style="width:200px;display:grid;gap:8px"><div class="x" style="height:0;border-radius:10px;background:linear-gradient(#bae6fd,#86efac);overflow:hidden"></div><p class="t" style="margin:0;font:500 12.5px/1.45 system-ui;color:#374151">Plan launches with your whole team, in one place.</p></div>`);
      const x = s.querySelector('.x'), t = s.querySelector('.t');
      return { ...marked(s, [t], ['jumps on arrival', 'room kept'], { pad: 3 }), at: (p) => { x.style.height = p ? '84px' : '0px'; } };
    },
  },
  'html/lazy-above-fold': bars({ rows: [{ label: 'layout', before: [0, 250], after: [0, 250], ink: '#cbd5e1' }, { label: 'hero', before: [250, 650], after: [0, 400] }], max: 700, marks: [1], labels: ['asked after layout', 'asked at once'], code: ['<img loading="lazy"> (first screen)', '<img> (eager)'], note: ['Lazy on the first screen, the hero waits for layout before it is even requested.', 'It is requested with the page.'] }),
  'html/eager-below-fold': bars({ rows: [{ label: 'hero', before: [0, 600], after: [0, 350] }, { label: 'footer art', before: [0, 600], after: [350, 650], ink: '#cbd5e1' }], max: 700, marks: [0], labels: ['shares the network', 'goes first'], code: ['<img> (below the fold)', '<img loading="lazy">'], note: ['Images nobody sees yet compete with the hero.', 'Off-screen ones wait; the hero arrives sooner.'] }),
  'html/fetchpriority-overused': bars({ rows: [{ label: 'hero', before: [0, 620], after: [0, 300] }, { label: 'avatar', before: [0, 600], after: [100, 500], ink: '#cbd5e1' }, { label: 'logo', before: [0, 580], after: [80, 420], ink: '#cbd5e1' }], max: 700, marks: [0], labels: ['all high: none first', 'only the hero'], code: ['fetchpriority="high" on everything', 'on the hero only'], note: ['When everything is first, nothing is.', 'One high priority: it arrives first.'] }),
  'html/hero-priority': bars({ rows: [{ label: 'hero', before: [200, 650], after: [0, 380] }, { label: 'scripts', before: [0, 400], after: [0, 400], ink: '#cbd5e1' }], max: 700, marks: [0], labels: ['found late', 'fetchpriority="high"'], code: ['<img src="hero.jpg">', '<img src="hero.jpg" fetchpriority="high">'], note: ['The browser learns the hero matters only after layout.', 'Told at once, it fetches it first.'] }),
  'html/img-oversized': bars({ rows: [{ label: '2400px', before: [0, 680], after: [0, 0], ink: '#f472b6' }, { label: '600px', before: [0, 0], after: [0, 120] }], max: 700, marks: [0, 1], labels: ['downloads 2400px for 300', 'srcset picks 600'], code: ['<img src="team-2400.jpg">', '<img srcset="team-600.jpg 600w, team-2400.jpg 2400w" sizes="300px">'], note: ['A phone downloads the whole 2400px picture for a 300px space.', 'srcset lets it fetch a size that fits.'] }),
  'html/picture-img': appears({ ui: `<div style="position:relative;width:150px;height:90px;border-radius:10px;box-shadow:inset 0 0 0 1.5px dashed #d1d5db">${photo(150, 90, 'x')}</div>`, show: '.x', labels: ['nothing drawn', 'an <img> inside'], code: ['<picture><source …></picture>', '<picture><source …><img src="…" alt="…"></picture>'], note: ['Sources only offer files; without an <img>, nothing is drawn.', 'The img is what shows.'] }),
  'html/summary-first': {
    code: ['<details><p>…</p><summary>', '<details><summary> first'],
    note: ['Only a first-child summary is the toggle: this one is hidden with the rest.', 'First, it shows and toggles.'],
    scene: (s) => {
      scene(s, `<div style="width:200px;padding:10px;border-radius:10px;box-shadow:inset 0 0 0 1px #e5e7eb;font:600 13px system-ui;color:#111827"><span class="x" style="display:block;opacity:.25">▸ Shipping details</span><small style="font:500 11px system-ui;color:#9ca3af">(collapsed)</small></div>`);
      const x = s.querySelector('.x');
      return { ...marked(s, [x], ['hidden toggle', 'shows'], { pad: 3 }), at: (p) => { x.style.opacity = p ? 1 : 0.25; } };
    },
  },
  'html/summary-nested-control': markup({ pre: '<summary>Billing', a: ' <button>Edit</button>', post: '</summary>', labels: ['two controls in one', 'moved out'], note: ['Pressing Edit also opens the details.', 'The button sits beside the summary.'] }),
  'html/summary-no-cue': appears({ ui: `<div style="width:200px;padding:10px;border-radius:10px;box-shadow:inset 0 0 0 1px #e5e7eb;font:600 13px system-ui;color:#111827;display:flex;gap:6px"><span class="x">▸</span>Shipping details</div>`, show: '.x', labels: ['no sign it opens', 'an arrow'], code: ['summary { list-style: none }', '(the marker kept, or an icon)'], note: ['Nothing shows that this opens.', 'An arrow says it does.'] }),
  'html/title-tooltip': appears({ ui: `<div style="position:relative;display:grid;justify-items:center;gap:8px"><span class="tp" style="padding:5px 9px;border-radius:7px;background:#111827;color:#fff;font:500 11.5px system-ui">Copy link</span><span style="display:grid;place-items:center;width:32px;height:32px;border-radius:9px;background:#f3f4f6;box-shadow:0 0 0 2px #fff,0 0 0 4px #4f46e5;font:600 14px system-ui">⧉</span><small style="font:500 10px system-ui;color:#9ca3af">focused with Tab</small></div>`, show: '.tp', labels: ['hover only', 'on focus too'], code: ['<button title="Copy link">', 'a tooltip on hover and focus'], note: ['A title shows only on mouse hover: not on a keyboard, not on touch.', 'A real tooltip shows on focus too.'] }),
  'html/video-size': {
    code: ['<video src="tour.mp4">', '<video src="tour.mp4" width="320" height="180">'],
    note: ['When the first frame arrives, everything below jumps.', 'The size is kept from the start.'],
    scene: (s) => {
      scene(s, `<div style="width:200px;display:grid;gap:8px"><div class="x" style="height:0;border-radius:10px;background:#111827;overflow:hidden"></div><p class="t" style="margin:0;font:500 12.5px/1.45 system-ui;color:#374151">A two-minute tour of the editor.</p></div>`);
      const x = s.querySelector('.x'), t = s.querySelector('.t');
      return { ...marked(s, [t], ['jumps', 'room kept'], { pad: 3 }), at: (p) => { x.style.height = p ? '90px' : '0px'; } };
    },
  },
  'html/video-poster': appears({ ui: `<div style="position:relative;width:180px;height:100px;border-radius:10px;background:#000;overflow:hidden">${photo(180, 100, 'x')}<i style="position:absolute;left:50%;top:50%;translate:-50% -50%;width:0;height:0;border-left:16px solid #fff;border-top:10px solid transparent;border-bottom:10px solid transparent"></i></div>`, show: '.x', labels: ['a black box', 'a poster'], code: ['<video src="tour.mp4">', '<video src="tour.mp4" poster="tour.jpg">'], note: ['Until someone presses play it is a black box.', 'A poster shows what it is.'] }),
  'html/video-captions': appears({ ui: `<div style="position:relative;width:200px;height:110px;border-radius:10px;overflow:hidden">${photo(200, 110)}<span class="x" style="position:absolute;left:50%;bottom:10px;translate:-50% 0;padding:3px 7px;border-radius:5px;background:rgb(0 0 0 / .75);color:#fff;font:500 11px system-ui;white-space:nowrap">“Press Alt to inspect any element.”</span></div>`, show: '.x', labels: ['pictures only', 'captions'], code: ['<video>', '<video><track kind="captions" src="tour.vtt"></video>'], note: ['With the sound off, or without hearing, there are only pictures.', 'Captions carry the words.'] }),
  'html/background-video': stops({ ui: `<div style="position:relative;width:220px;height:110px;border-radius:12px;overflow:hidden"><div class="v" style="position:absolute;inset:0;background:linear-gradient(135deg,#312e81,#7c3aed)"></div><div style="position:relative;padding:14px;display:grid;gap:8px;justify-items:start;font:800 16px system-ui;color:#fff">Ship faster${btn('Start', 'b', '#fff', '#312e81')}</div></div>`, before: ['.v', '.b'], after: ['.b'], labels: ['a stop on the video', 'aria-hidden, no stop'],
    code: ['<video autoplay muted loop>', '<video autoplay muted loop aria-hidden="true" tabindex="-1">'], note: ['A screen reader stops on a video with nothing to say.', 'Marked as decoration, it is passed over.'] }),
  'html/autoplay-sound': {
    code: ['<video autoplay>', '<video autoplay muted>'],
    note: ['It starts talking over a screen reader.', 'Muted until someone turns it up.'],
    scene: (s) => {
      scene(s, `<div style="position:relative;width:180px;height:100px;border-radius:10px;overflow:hidden">${photo(180, 100)}<span class="x" style="position:absolute;right:8px;bottom:8px;display:flex;align-items:center;gap:3px;padding:4px 7px;border-radius:7px;background:rgb(0 0 0 / .7);color:#fff;font:700 12px system-ui">🔊<i class="w" style="font-style:normal">)))</i></span></div>`);
      const x = s.querySelector('.x'), w = s.querySelector('.w');
      return { ...marked(s, [x], ['plays sound', 'muted'], { pad: 3 }), at: (p) => { w.textContent = p ? '×' : ')))'; x.firstChild.textContent = p ? '🔈' : '🔊'; } };
    },
  },
  'html/iframe-hidden': stops({ ui: `<div style="display:grid;gap:8px;justify-items:start">${ghost('Back', 'a')}<span class="h" style="padding:6px 10px;border-radius:8px;border:1.5px dashed #d1d5db;font:500 11px system-ui;color:#9ca3af">hidden tracking frame</span>${btn('Next', 'b')}</div>`, before: ['.a', '.h', '.b'], after: ['.a', '.b'], labels: ['focus vanishes into it', 'tabindex="-1"'],
    code: ['<iframe hidden-ish style="width:0">', '<iframe tabindex="-1" aria-hidden="true">'], note: ['Focus disappears into a frame announced as nothing.', 'Taken out of the Tab order.'] }),
};
