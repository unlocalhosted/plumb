// The colour picker: which of your colour tokens should a hard-coded colour be? (owner's pick, 2026-11-10: "B with
// C", web/design/parts/colour-ideas.js has the three prototypes it was chosen from).
// Colour has no size to order by, a theme has many colours, they come in roles, and each one has a light and a dark
// value. So the picker leads with the answer: your colour, then the three tokens nearest it, said in words ("close").
// Most hard-coded colours are a token typed by hand, so the right one is usually first. Every colour is one click away
// under it, grouped by what it is for (text, surface, line, accent, status), opening on the element's own role.
// Every swatch is split corner to corner: the light value, then the dark one.
//
//   import { COLOUR_PICK_CSS, colourPick } from './colourpick.js';
//   colourPick(stage, { tokens, hard, role, apply, place })
//
//   tokens   [{ name, role, l, d }]: each colour token, its role and its light and dark values
//   hard     { name, l, d? }: the hard-coded colour (d defaults to l: it doesn't change in dark mode)
//   role     the role this element's colour is for (a button's fill is 'accent'), where All colours opens
//   apply(t, { token, written })   what a colour does to the element (pointed at, picked or written)
//   place(box)   where the picker sits (beside the element)
//
// Pointing at a colour shows it on the element; a click picks it (blue: on a token, the tick pale green); a click on
// the picked one, or Enter, writes it (green). ↑ ↓ move through the colours shown, Esc puts it back.

export const COLOUR_PICK_CSS = `
  .cp { position: absolute; z-index: 4; display: grid; gap: 1px; width: 240px; padding: 5px; box-sizing: border-box; border-radius: 12px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); font: 500 13px/1 var(--pl-sans); color: var(--pl-ink); }
  .cp .cap { padding: 7px 8px 5px; font: 600 11px/1 var(--pl-sans); color: var(--pl-ink-2); }
  .cp .opt { all: unset; box-sizing: border-box; display: grid; grid-template-columns: 18px 1fr auto 22px; align-items: center; gap: 10px; height: 34px; padding: 0 4px 0 8px; border-radius: 8px; cursor: pointer; transition: background-color 120ms var(--pl-ease-out); }
  .cp .opt:hover, .cp .opt.at { background: var(--pl-paper-2); }
  .cp .opt:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: -2px; }
  .cp .opt b { font: 600 13px/1 var(--pl-sans); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cp .opt span { font: 500 11.5px/1 var(--pl-sans); color: var(--pl-ink-2); }
  .cp .opt.hard b { color: var(--pl-coral); }
  /* the tick on the one picked: pale green as soon as it is a token, solid once written; grey on your own colour */
  .cp .ok { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; color: transparent; transition: background-color 180ms var(--pl-ease-out), color 180ms var(--pl-ease-out); }
  .cp .ok svg { width: 14px; height: 14px; }
  .cp .opt.at:not(.mine) .ok { background: color-mix(in oklab, var(--pl-mint) 22%, transparent); color: var(--pl-mint-ink); }
  .cp.written .opt.at .ok { background: var(--pl-mint); color: var(--pl-mint-on); }
  .cp .opt.at:not(.mine) .ok.pop { animation: cp-pop 320ms cubic-bezier(.34, 1.56, .64, 1); }
  @keyframes cp-pop { 0% { scale: .8; } 60% { scale: 1.12; } 100% { scale: 1; } }
  .cp hr { margin: 4px 6px; border: 0; border-top: 1px solid var(--pl-rule); }
  .cp .all { all: unset; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; height: 30px; padding: 0 10px 0 8px; border-radius: 8px; cursor: pointer; font: 500 12.5px/1 var(--pl-sans); color: var(--pl-ink-2); }
  .cp .all:hover { background: var(--pl-paper-2); color: var(--pl-ink); }
  .cp .all:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: -2px; }
  .cp .all i { width: 7px; height: 7px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; rotate: 45deg; translate: 0 -2px; transition: rotate 200ms var(--pl-spring-pop), translate 200ms; }
  .cp .all[aria-expanded="true"] i { rotate: 225deg; translate: 0 2px; }
  /* every colour, by what it is for: the roles as tabs, that role's colours as swatches with their names */
  .cp .every { display: grid; gap: 8px; padding: 4px 3px 4px; }
  .cp .every[hidden] { display: none; }
  .cp .roles { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; padding: 2px; border-radius: 9px; background: var(--pl-paper-2); }
  .cp .roles button { all: unset; display: grid; place-items: center; height: 24px; border-radius: 7px; cursor: pointer; font: 600 11px/1 var(--pl-sans); color: var(--pl-ink-2); }
  .cp .roles button[aria-pressed="true"] { background: var(--pl-paper); color: var(--pl-ink); box-shadow: 0 1px 2px rgb(0 0 0 / .1); }
  .cp .roles button:focus-visible { outline: 2px solid var(--pl-sky); }
  .cp .shades { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
  .cp .shade { all: unset; display: grid; gap: 5px; justify-items: center; padding: 6px 2px 5px; border-radius: 9px; cursor: pointer; transition: background-color 120ms var(--pl-ease-out); }
  .cp .shade:hover { background: var(--pl-paper-2); }
  .cp .shade.at { background: color-mix(in oklab, var(--pl-sky) 12%, transparent); }
  .cp.written .shade.at { background: color-mix(in oklab, var(--pl-mint) 16%, transparent); }
  .cp .shade:focus-visible { outline: 2px solid var(--pl-sky); }
  .cp .shade .split { width: 30px; height: 30px; border-radius: 8px; }
  .cp .shade span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 600 10.5px/1.1 var(--pl-sans); color: var(--pl-ink-2); }
  .cp .shade.at span { color: var(--pl-ink); }
  /* a swatch: the light value top-left, the dark value bottom-right; your hard-coded colour is one colour, ringed coral */
  .split { display: inline-block; flex: none; width: 16px; height: 16px; border-radius: 5px; background: linear-gradient(135deg, var(--l) 50%, var(--d) 50%); box-shadow: inset 0 0 0 1px rgb(0 0 0 / .14); }
  .split.hard { background: var(--l); box-shadow: inset 0 0 0 1px rgb(0 0 0 / .14), 0 0 0 1.5px var(--pl-coral); }
  @media (prefers-reduced-motion: reduce) { .cp .opt.at .ok.pop { animation: none; } .cp .all i { transition: none; } }
`;

const ROLES = [['text', 'Text'], ['surface', 'Surface'], ['line', 'Line'], ['accent', 'Accent'], ['status', 'Status'], ['other', 'Other']];
// a token's role from its name, for a theme that doesn't say (fg, muted → text; bg, surface → surface; …)
export const roleOf = (name) => /^(fg|text|ink|muted|faint|subtle|heading|body)/.test(name) ? 'text'
  : /^(bg|background|surface|sunken|paper|card|panel|scrim|overlay)/.test(name) ? 'surface'
  : /^(line|border|rule|divider|outline|ring)/.test(name) ? 'line'
  : /^(accent|primary|brand|draw|on-|link|focus)/.test(name) ? 'accent'
  : /^(success|warning|danger|error|info|critical|positive|negative)/.test(name) ? 'status' : 'other';
const TICK = '<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// any CSS colour (hex, rgb, oklch, a named one) as its sRGB channels, read back from one pixel painted over white (a
// see-through colour is compared as it looks on a page, not as its solid self)
let ink = null;
const rgbOf = (css) => {
  const hex = /^#([\da-f]{6})$/i.exec(String(css).trim());
  if (hex) { const n = parseInt(hex[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  ink ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  // a colour written as a reference (var(--x), color-mix) is first worked out by the page itself
  let v = String(css);
  if (/var\(|color-mix|currentcolor/i.test(v)) { const probe = document.createElement('i'); probe.style.color = v; document.documentElement.append(probe); v = getComputedStyle(probe).color; probe.remove(); }
  ink.fillStyle = '#fff'; ink.fillRect(0, 0, 1, 1); ink.fillStyle = '#000'; ink.fillStyle = v; ink.fillRect(0, 0, 1, 1);
  return [...ink.getImageData(0, 0, 1, 1).data.slice(0, 3)];
};
// how far two colours look apart: OKLab distance ×100. Under 2 reads as the same colour, under 6 as close
const lab = (css) => {
  const [r, g, b] = rgbOf(css).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const l = Math.cbrt(0.4122 * r + 0.5363 * g + 0.0514 * b), m = Math.cbrt(0.2119 * r + 0.6807 * g + 0.1074 * b), s = Math.cbrt(0.0883 * r + 0.2817 * g + 0.6300 * b);
  return [0.2105 * l + 0.7936 * m - 0.0041 * s, 1.978 * l - 2.4286 * m + 0.4506 * s, 0.0259 * l + 0.7828 * m - 0.8087 * s];
};
export const colourDistance = (a, b) => { const x = lab(a), y = lab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) * 100; };
const closeness = (d) => (d < 2 ? 'looks the same' : d < 6 ? 'close' : d < 15 ? 'near' : 'far');
export const swatch = (t, size) => (t.hard && t.coral !== false ? `<i class="split hard" style="--l:${t.l}${size ? `;width:${size}px;height:${size}px` : ''}"></i>` : `<i class="split" style="--l:${t.l};--d:${t.d}${size ? `;width:${size}px;height:${size}px` : ''}"></i>`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// hard.now: the element's colour is not hard-coded but already a token, or one it gets from above: said in that word
// ('now', 'inherited'), not in coral. writes: false inside a card that writes everything with one button (a click
// picks, nothing more). onEscape: what Esc does once every colour is folded away (default: put it back)
export function colourPick(stage, { tokens, hard, role: guess, apply, place, into = stage, writes = true, onEscape }) {
  const HARD = { ...hard, d: hard.d ?? hard.l, hard: true, coral: !hard.now };
  // the nearest three, never the element's own token again
  const near = [...tokens].filter((t) => t.name !== HARD.name).sort((a, b) => colourDistance(HARD.l, a.l) - colourDistance(HARD.l, b.l)).slice(0, 3);
  const roles = ROLES.filter(([k]) => tokens.some((t) => t.role === k));
  let role = roles.some(([k]) => k === guess) ? guess : near[0]?.role ?? roles[0]?.[0];
  let at = HARD, written = false;
  const opt = (t, words) => `<button type="button" class="opt${t.hard ? ' mine' : ''}${t.hard && t.coral ? ' hard' : ''}" role="option" data-n="${esc(t.hard ? '' : t.name)}">${swatch(t, 18)}<b>${esc(t.name)}</b><span>${words}</span><i class="ok" aria-hidden="true">${TICK}</i></button>`;
  into.insertAdjacentHTML('beforeend', `<div class="cp" role="listbox" aria-label="Colour">
    <div class="cap">Your colour</div>${opt(HARD, HARD.now ?? 'hard-coded')}
    <div class="cap">Nearest of your tokens</div>${near.map((t) => opt(t, closeness(colourDistance(HARD.l, t.l)))).join('')}
    <hr><button type="button" class="all" aria-expanded="false"><span>All ${tokens.length} colours</span><i aria-hidden="true"></i></button>
    <div class="every" hidden><div class="roles" role="group" aria-label="What the colour is for">${roles.map(([k, t]) => `<button type="button" data-role="${k}">${t}</button>`).join('')}</div><div class="shades" role="group"></div></div></div>`);
  const box = [...into.querySelectorAll(':scope > .cp')].pop(), every = box.querySelector('.every'), shades = box.querySelector('.shades'), all = box.querySelector('.all');
  const byName = (n) => (n ? tokens.find((t) => t.name === n) : HARD);
  const layout = () => place?.(box);

  // the one in hand, marked wherever it is shown (in the nearest, among every colour, or both)
  const mark = (pop = false) => {
    box.classList.toggle('written', written);
    for (const b of box.querySelectorAll('[data-n]')) {
      const on = b.dataset.n === (at.hard ? '' : at.name);
      b.classList.toggle('at', on); b.setAttribute('aria-selected', String(on));
      const ok = b.querySelector('.ok'); if (on && pop && ok) { ok.classList.remove('pop'); void ok.offsetWidth; ok.classList.add('pop'); }
    }
  };
  const drawRole = () => {
    for (const b of box.querySelectorAll('[data-role]')) b.setAttribute('aria-pressed', String(b.dataset.role === role));
    shades.innerHTML = tokens.filter((t) => t.role === role).map((t) => `<button type="button" class="shade" role="option" data-n="${esc(t.name)}" title="${esc(t.name)}">${swatch(t)}<span>${esc(t.name.startsWith(`${role}-`) ? t.name.slice(role.length + 1) : t.name)}</span></button>`).join('');
    mark(); layout();
  };
  const show = (t) => apply(t, { token: !t.hard, written: written && t === at });
  const pick = (t) => { if (written) return; const was = at; at = t; show(t); mark(t !== was && !t.hard); };
  const write = () => { if (!writes || at.hard || written) return; written = true; show(at); mark(); };
  const putBack = () => { written = false; at = HARD; show(HARD); mark(); };

  // pointing at a colour shows it on the element; leaving the picker shows the one in hand again
  box.addEventListener('pointerover', (e) => { const b = e.target.closest('[data-n]'); if (b && !written) apply(byName(b.dataset.n), { token: !!b.dataset.n, written: false }); });
  box.addEventListener('pointerleave', () => show(at));
  box.addEventListener('click', (e) => {
    if (e.target.closest('.all')) { every.hidden = !every.hidden; all.setAttribute('aria-expanded', String(!every.hidden)); if (!every.hidden) drawRole(); else layout(); return; }
    const r = e.target.closest('[data-role]'); if (r) { role = r.dataset.role; drawRole(); return; }
    const b = e.target.closest('[data-n]'); if (!b) return;
    const t = byName(b.dataset.n);
    // a click on the one already picked writes it; written, a click on it again puts it back
    if (written) { if (t === at) putBack(); return; }
    if (t === at && !t.hard) write(); else pick(t);
  });
  box.addEventListener('keydown', (e) => {
    const items = [...box.querySelectorAll('[data-n]')].filter((b) => !b.closest('[hidden]'));
    const i = items.indexOf(box.getRootNode().activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.closest('.shade'))) {
      e.preventDefault(); const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
      const n = items[Math.max(0, Math.min(items.length - 1, (i < 0 ? 0 : i + d)))]; n.focus(); pick(byName(n.dataset.n));
    } else if (e.key === 'Enter' && e.target.closest('[data-n]')) { e.preventDefault(); write(); }
    else if (e.key === 'Escape') { e.preventDefault(); if (!every.hidden) { every.hidden = true; all.setAttribute('aria-expanded', 'false'); layout(); } else if (onEscape) onEscape(); else putBack(); }
  });
  new ResizeObserver(layout).observe(stage);
  mark(); show(HARD); layout();
  return { box, layout, set: (n) => pick(byName(n)), at: () => at, written: () => written, write, putBack, ready: () => !at.hard && !written };
}
