// The design site's page for the colour picker: three prototypes, before one is built.
// The question it answers: which of your colour tokens should this hard-coded colour be? Colour is not like the
// other pickers: there is no size to order by, a theme has many colours (often 20 or more), they come in roles
// (text, surface, line, accent, status) with states (hover, soft), and each has a light and a dark value. A
// hard-coded colour stays the same in dark mode; a token follows it. So each prototype shows both schemes.
//   A  the same picker      the row every other property has; tokens in role order, each swatch split light/dark
//   B  nearest first        the three tokens closest to the hard-coded colour, said in words; the rest one click away
//   C  role, then shade     pick what the colour is for (accent), then which of that role's shades
// All three run on the same piece of someone's app: an invite card whose button colour is hard-coded.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS } from '../../../overlay/src/toys.js';
import { PICKER_CSS, picker as pick } from '../../../overlay/src/picker.js';

// someone's theme: each colour token with its role, its light value and its dark value
const ROLES = [['text', 'Text'], ['surface', 'Surface'], ['line', 'Line'], ['accent', 'Accent'], ['status', 'Status']];
const TOKENS = [
  { name: 'fg', role: 'text', l: '#101828', d: '#f5f5f6' },
  { name: 'muted', role: 'text', l: '#475467', d: '#94969c' },
  { name: 'faint', role: 'text', l: '#98a2b3', d: '#61646c' },
  { name: 'bg', role: 'surface', l: '#ffffff', d: '#0c111d' },
  { name: 'surface', role: 'surface', l: '#f9fafb', d: '#161b26' },
  { name: 'sunken', role: 'surface', l: '#f2f4f7', d: '#1f242f' },
  { name: 'line', role: 'line', l: '#eaecf0', d: '#1f242f' },
  { name: 'line-strong', role: 'line', l: '#d0d5dd', d: '#333741' },
  { name: 'accent', role: 'accent', l: '#2563eb', d: '#5b8def' },
  { name: 'accent-hover', role: 'accent', l: '#1d4ed8', d: '#7aa5f5' },
  { name: 'accent-soft', role: 'accent', l: '#dbeafe', d: '#172554' },
  { name: 'on-accent', role: 'accent', l: '#ffffff', d: '#ffffff' },
  { name: 'success', role: 'status', l: '#12b76a', d: '#47cd89' },
  { name: 'warning', role: 'status', l: '#f79009', d: '#fdb022' },
  { name: 'danger', role: 'status', l: '#d92d20', d: '#f97066' },
];
// the button's hard-coded colour: near the accent, but not it
const HARD = { name: '#2f6fed', l: '#2f6fed', d: '#2f6fed', hard: true };

// how far two colours look apart (OKLab distance, ×100): under 2 reads as the same, under 6 as close
const lab = (hex) => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const [r, g, b] = c, l = Math.cbrt(0.4122 * r + 0.5363 * g + 0.0514 * b), m = Math.cbrt(0.2119 * r + 0.6807 * g + 0.1074 * b), s = Math.cbrt(0.0883 * r + 0.2817 * g + 0.6300 * b);
  return [0.2105 * l + 0.7936 * m - 0.0041 * s, 1.978 * l - 2.4286 * m + 0.4506 * s, 0.0259 * l + 0.7828 * m - 0.8087 * s];
};
const dist = (a, b) => { const x = lab(a), y = lab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 100; };
const closeness = (d) => (d < 2 ? 'looks the same' : d < 6 ? 'close' : d < 15 ? 'near' : 'far');
const nearest = [...TOKENS].sort((a, b) => dist(HARD.l, a.l) - dist(HARD.l, b.l));
// a swatch split corner to corner: light value top-left, dark value bottom-right
const split = (t, size = 16) => `<i class="split" style="--l:${t.l};--d:${t.d};width:${size}px;height:${size}px"></i>`;

// someone's app: an invite card, its own look, with a light/dark switch so both schemes can be seen
const app = (id) => `
  <div class="app" data-scheme="light" data-id="${id}">
    <div class="ah"><b>Invite your team</b><span class="sch" role="group" aria-label="App scheme"><button type="button" data-s="light" aria-pressed="true">Light</button><button type="button" data-s="dark" aria-pressed="false">Dark</button></span></div>
    <p>Work on the same projects. They get an email with a link.</p>
    <div class="field">name@company.com</div>
    <div class="acts"><button type="button" class="ghost">Copy link</button><span class="held"><button type="button" class="go">Send invites</button></span></div>
  </div>`;

export function mount(host, root, css) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = (id, title, note, extra = '') => `<section class="scene" id="${id}"><h2>${title}</h2><p>${note}</p><div class="stage" tabindex="0">${app(id)}${extra}</div></section>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${PICKER_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); }
    .scene { margin: 0 0 48px; }
    .scene h2 { margin: 0 0 4px; }
    .scene > p { margin: 0 0 16px; max-width: 64ch; }
    .stage { position: relative; display: grid; place-items: center start; padding: 40px 0 40px max(24px, calc(50% - 320px)); min-height: 320px; border-radius: 22px; background: var(--pl-paper-2); overflow: hidden; }
    .split { display: inline-block; flex: none; width: 16px; height: 16px; border-radius: 5px; background: linear-gradient(135deg, var(--l) 50%, var(--d) 50%); box-shadow: inset 0 0 0 1px rgb(0 0 0 / .14); }
    .split.hard { background: var(--l); box-shadow: inset 0 0 0 1px rgb(0 0 0 / .14), 0 0 0 1.5px var(--pl-coral); }

    /* ── someone's app (its own look). Its colours are its theme's tokens, light or dark ── */
    .app { --bg: #fff; --fg: #101828; --muted: #475467; --line: #eaecf0; --sunken: #f2f4f7;
      position: relative; width: 320px; padding: 20px; border-radius: 14px; background: var(--bg); color: var(--fg); box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 12px 32px -14px rgb(16 24 40 / .25); font: 14px/20px system-ui, -apple-system, sans-serif; transition: background-color 240ms, color 240ms; }
    .app[data-scheme="dark"] { --bg: #0c111d; --fg: #f5f5f6; --muted: #94969c; --line: #1f242f; --sunken: #161b26; box-shadow: 0 12px 32px -14px rgb(0 0 0 / .6), 0 0 0 1px #1f242f; }
    .app .ah { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .app .ah b { font: 600 16px/22px system-ui, sans-serif; }
    .app p { margin: 6px 0 14px; color: var(--muted); }
    .app .field { padding: 9px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--sunken); color: var(--muted); }
    .app .acts { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .app .acts button { padding: 8px 14px; border-radius: 8px; font: 600 14px/20px system-ui, sans-serif; border: 1px solid var(--line); background: var(--bg); color: var(--fg); }
    .app .acts .go { border-color: transparent; background: var(--btn, #2f6fed); color: #fff; transition: background-color 200ms; }
    .app .sch { display: inline-grid; grid-auto-flow: column; padding: 2px; border-radius: 8px; background: var(--sunken); }
    .app .sch button { all: unset; padding: 3px 8px; border-radius: 6px; font: 600 11px/1.2 system-ui, sans-serif; color: var(--muted); cursor: pointer; }
    .app .sch button[aria-pressed="true"] { background: var(--bg); color: var(--fg); box-shadow: 0 1px 2px rgb(0 0 0 / .12); }
    /* the element in hand: coral while hard-coded, blue on a token, green once written */
    .held { display: inline-block; border-radius: 10px; outline: 1.5px dashed var(--pl-coral); outline-offset: 3px; transition: outline-color 160ms; }
    .held.on-token { outline: 1.5px solid var(--pl-sky); }
    .held.written { outline: 1.5px solid var(--pl-mint); }

    /* ── A: the same picker as every other property ── */
    .list { max-height: 260px; overflow: auto; }
    #a .drum { width: 150px; }
    /* the field's icon is the colour on the button now */
    .sw { display: block; width: 18px; height: 18px; border-radius: 6px; background: var(--c, #2f6fed); box-shadow: inset 0 0 0 1px rgb(0 0 0 / .14); transition: background-color 200ms; }
    .list .split { width: 16px; height: 16px; }

    /* ── B: nearest first. One small strip beside the button: your colour, then the three tokens nearest it ── */
    .near { position: absolute; z-index: 4; display: grid; gap: 2px; width: 230px; padding: 5px; border-radius: 12px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); font: 500 13px/1 var(--pl-sans); }
    .near button { all: unset; box-sizing: border-box; display: grid; grid-template-columns: 18px 1fr auto; align-items: center; gap: 10px; height: 34px; padding: 0 8px; border-radius: 8px; cursor: pointer; }
    .near button:hover, .near button[aria-selected="true"] { background: var(--pl-paper-2); }
    .near button:focus-visible { outline: 2px solid var(--pl-sky); }
    .near button b { font: 600 13px/1 var(--pl-sans); }
    .near button span { font: 500 11.5px/1 var(--pl-sans); color: var(--pl-ink-2); }
    .near button.hard b { color: var(--pl-coral); }
    .near button .ok { opacity: 0; color: var(--pl-mint); font-weight: 700; transition: opacity 140ms; }
    .near button[aria-selected="true"] .ok { opacity: 1; }
    .near .cap { padding: 6px 8px 4px; font: 600 11px/1 var(--pl-sans); color: var(--pl-ink-2); }
    .near hr { margin: 3px 6px; border: 0; border-top: 1px solid var(--pl-rule); }
    .near .all { color: var(--pl-ink-2); }
    .near .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; padding: 4px 6px 6px; }
    .near .grid[hidden] { display: none; }
    .near .grid button { display: block; height: 26px; padding: 0; border-radius: 6px; }
    .near .grid button .split { width: 100%; height: 100%; border-radius: 6px; }
    .near .grid button[aria-selected="true"] { box-shadow: 0 0 0 2px var(--pl-paper), 0 0 0 3.5px var(--pl-sky); }

    /* ── C: role, then shade ── */
    .roles { position: absolute; z-index: 4; width: 250px; padding: 8px; border-radius: 12px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); display: grid; gap: 8px; font: 500 13px/1 var(--pl-sans); }
    .roles .seg { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; padding: 2px; border-radius: 9px; background: var(--pl-paper-2); }
    .roles .seg button { all: unset; display: grid; place-items: center; height: 26px; border-radius: 7px; cursor: pointer; font: 600 11px/1 var(--pl-sans); color: var(--pl-ink-2); }
    .roles .seg button[aria-pressed="true"] { background: var(--pl-paper); color: var(--pl-ink); box-shadow: 0 1px 2px rgb(0 0 0 / .1); }
    .roles .seg button:focus-visible { outline: 2px solid var(--pl-sky); }
    .roles .shades { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .roles .shades button { all: unset; display: grid; gap: 6px; justify-items: center; padding: 6px 2px; border-radius: 9px; cursor: pointer; }
    .roles .shades button:hover { background: var(--pl-paper-2); }
    .roles .shades button[aria-selected="true"] { background: color-mix(in oklab, var(--pl-sky) 12%, transparent); }
    .roles .shades button:focus-visible { outline: 2px solid var(--pl-sky); }
    .roles .shades .split { width: 34px; height: 34px; border-radius: 9px; }
    .roles .shades span { font: 600 11px/1.1 var(--pl-sans); color: var(--pl-ink-2); text-align: center; }
    .roles .shades button[aria-selected="true"] span { color: var(--pl-ink); }
    .roles .now { display: flex; align-items: center; gap: 8px; padding: 2px 2px 0; font: 500 12px/1.3 var(--pl-sans); color: var(--pl-ink-2); }
    .roles .now b { color: var(--pl-coral); font-weight: 600; }
    .roles .guess { font: 500 11.5px/1.3 var(--pl-sans); color: var(--pl-ink-2); padding: 0 2px; }
    @media (prefers-reduced-motion: reduce) { .app, .app .acts .go, .held { transition: none; } }
  </style>
  ${TOY_DEFS}
  ${scene('a', 'A · The same picker', 'The row every other property has. Your colour tokens in role order (text, surface, line, accent, status), your hard-coded colour among them next to its nearest. Each swatch is split: the light value and the dark value. Drag through them, or click for the list. Switch the app to Dark to see what the hard-coded colour does there.')}
  ${scene('b', 'B · Nearest first', 'No list to read through: your colour, then the three tokens nearest it, said in words (“looks the same”, “close”). Most hard-coded colours are a token typed by hand, so the right one is usually first. Every colour is one click away under it.')}
  ${scene('c', 'C · Role, then shade', 'Pick what the colour is for, then which shade. Plumber guesses the role from the element (a button’s fill is Accent), so it opens there; the shades are that role’s rest, hover, soft and the colour on it.')}`;

  const rel = (stage, el) => { const s = stage.getBoundingClientRect(), b = el.getBoundingClientRect(); return { left: b.left - s.left, top: b.top - s.top, right: b.right - s.left, bottom: b.bottom - s.top, width: b.width, height: b.height }; };
  // each app: its scheme switch, and how the button shows a colour (a token follows the scheme; a hard-coded one doesn't)
  const apps = {};
  for (const a of root.querySelectorAll('.app')) {
    const id = a.dataset.id, btn = a.querySelector('.go'), ring = a.querySelector('.held');
    let now = HARD;
    const show = () => { const dark = a.dataset.scheme === 'dark'; btn.style.setProperty('--btn', dark ? now.d : now.l); };
    a.querySelector('.sch').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; a.dataset.scheme = b.dataset.s; for (const x of a.querySelectorAll('[data-s]')) x.setAttribute('aria-pressed', String(x === b)); show(); });
    apps[id] = { app: a, btn, ring, set: (t, written = false) => { now = t; show(); ring.classList.toggle('on-token', !t.hard); ring.classList.toggle('written', written && !t.hard); } };
  }

  // ── A: the same picker. Role order, the hard-coded colour next to its nearest token ──
  {
    const stage = root.querySelector('#a .stage'), { app: a, ring } = apps.a;
    const opts = TOKENS.map((t, i) => ({ ...t, v: i }));
    opts.splice(opts.findIndex((t) => t.name === nearest[0].name), 0, { ...HARD, v: -1 });
    pick(stage, {
      name: 'Colour', toy: '<i class="sw"></i>', options: opts, grab: host,
      format: (o) => (a.dataset.scheme === 'dark' ? o.d : o.l),
      mark: (o) => (o.hard ? `<i class="split hard" style="--l:${o.l}"></i>` : split(o)),
      apply: (o, { written }) => { apps.a.set(o, written); stage.querySelector('.sw')?.style.setProperty('--c', a.dataset.scheme === 'dark' ? o.d : o.l); },
      place: (row, list) => { const r = rel(stage, a), b = rel(stage, ring); row.style.left = `${r.right + 14}px`; row.style.top = `${b.top + b.height / 2 - 17}px`; list.style.left = row.style.left; list.style.top = `${b.top + b.height / 2 + 22}px`; },
    });
  }

  // ── B: nearest first ──
  {
    const stage = root.querySelector('#b .stage'), { app: a, ring } = apps.b;
    const top = nearest.slice(0, 3);
    stage.insertAdjacentHTML('beforeend', `<div class="near" role="listbox" aria-label="Your colour and the tokens nearest it">
      <div class="cap">Your colour</div>
      <button type="button" role="option" class="hard" data-n="hard" aria-selected="true"><i class="split hard" style="--l:${HARD.l}"></i><b>${HARD.name}</b><span>hard-coded</span></button>
      <div class="cap">Nearest of your tokens</div>
      ${top.map((t) => `<button type="button" role="option" data-n="${t.name}" aria-selected="false">${split(t, 18)}<b>${t.name}</b><span>${closeness(dist(HARD.l, t.l))}</span></button>`).join('')}
      <hr><button type="button" class="all" aria-expanded="false"><span></span><span style="color:inherit;font-size:12.5px">All ${TOKENS.length} colours</span><span>▾</span></button>
      <div class="grid" hidden>${TOKENS.map((t) => `<button type="button" role="option" data-n="${t.name}" title="${t.name}" aria-selected="false">${split(t)}</button>`).join('')}</div></div>`);
    const near = stage.querySelector('.near'), grid = near.querySelector('.grid'), all = near.querySelector('.all');
    let at = HARD, written = false;
    const byName = (n) => (n === 'hard' ? HARD : TOKENS.find((t) => t.name === n));
    const mark = () => { for (const b of near.querySelectorAll('[data-n]')) b.setAttribute('aria-selected', String((at.hard ? 'hard' : at.name) === b.dataset.n)); };
    const place = () => { const r = rel(stage, a); near.style.left = `${r.right + 14}px`; near.style.top = `${Math.max(12, r.top + r.height / 2 - near.offsetHeight / 2)}px`; };
    // pointing at one shows it on the button; leaving puts back the one picked; a click picks it
    near.addEventListener('pointerover', (e) => { const b = e.target.closest('[data-n]'); if (b && !written) apps.b.set(byName(b.dataset.n)); });
    near.addEventListener('pointerleave', () => apps.b.set(at, written));
    near.addEventListener('click', (e) => {
      if (e.target.closest('.all')) { grid.hidden = !grid.hidden; all.setAttribute('aria-expanded', String(!grid.hidden)); place(); return; }
      const b = e.target.closest('[data-n]'); if (!b) return;
      at = byName(b.dataset.n); written = !at.hard; apps.b.set(at, written); mark();
    });
    near.addEventListener('keydown', (e) => {
      const items = [...near.querySelectorAll('[data-n]')].filter((b) => !b.closest('[hidden]')), i = items.indexOf(root.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const n = items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]; n.focus(); apps.b.set(byName(n.dataset.n)); }
      if (e.key === 'Escape') { at = HARD; written = false; apps.b.set(HARD); mark(); }
    });
    new ResizeObserver(place).observe(stage); place();
  }

  // ── C: role, then shade ──
  {
    const stage = root.querySelector('#c .stage'), { app: a } = apps.c;
    // the role a button's fill is for
    let role = 'accent', at = HARD, written = false;
    stage.insertAdjacentHTML('beforeend', `<div class="roles" role="group" aria-label="Colour">
      <div class="now">${`<i class="split hard" style="--l:${HARD.l};width:14px;height:14px"></i>`}<span>Now <b>${HARD.name}</b>, hard-coded</span></div>
      <div class="seg" role="group" aria-label="What the colour is for">${ROLES.map(([k, t]) => `<button type="button" data-role="${k}" aria-pressed="${k === role}">${t}</button>`).join('')}</div>
      <div class="shades" role="listbox" aria-label="Shades"></div>
      <div class="guess">A button’s fill is usually Accent.</div></div>`);
    const box = stage.querySelector('.roles'), shades = box.querySelector('.shades');
    const draw = () => {
      shades.innerHTML = TOKENS.filter((t) => t.role === role).map((t) => `<button type="button" role="option" data-n="${t.name}" aria-selected="${at.name === t.name}">${split(t, 34)}<span>${t.name.replace(/^(accent|line)-/, '').replace(/^on-accent$/, 'on it')}</span></button>`).join('');
      for (const b of box.querySelectorAll('[data-role]')) b.setAttribute('aria-pressed', String(b.dataset.role === role));
      place();
    };
    const place = () => { const r = rel(stage, a); box.style.left = `${r.right + 14}px`; box.style.top = `${Math.max(12, r.top + r.height / 2 - box.offsetHeight / 2)}px`; };
    box.addEventListener('click', (e) => {
      const r = e.target.closest('[data-role]'); if (r) { role = r.dataset.role; draw(); return; }
      const b = e.target.closest('[data-n]'); if (!b) return;
      at = TOKENS.find((t) => t.name === b.dataset.n); written = true; apps.c.set(at, true); draw();
    });
    shades.addEventListener('pointerover', (e) => { const b = e.target.closest('[data-n]'); if (b) apps.c.set(TOKENS.find((t) => t.name === b.dataset.n)); });
    shades.addEventListener('pointerleave', () => apps.c.set(at, written));
    new ResizeObserver(place).observe(stage); draw();
  }
  void still;
}
