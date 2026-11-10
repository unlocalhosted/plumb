// The design site's page for color: what it draws inside its host. The site (web/design/Part.jsx) gives it the host,
// the overlay's token file as text, and the scheme; it draws with the overlay's own source.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { readTokens, probe, say } from '../tokens.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';
import { BUTTON_CSS, button } from '../../../overlay/src/kit.js';

export function mount(host, root, css) {

  const tokens = readTokens(css), by = new Map(tokens.map((t) => [t.name, t]));
  const inLight = probe(css, 'light'), inDark = probe(css, 'dark');

  // what each hue means in the visual language (docs/design/visual-language.md), and a toy that shows it
  const HUES = [
    ['mint', 'Padding. Things that are on, done, saved, on your scale.', 'padding'],
    ['butter', 'Margin. Warm objects: cards, keys, alerts. A value typed by hand.', 'margin'],
    ['lilac', 'Gap. Names, text, navigation, menus.', 'gap'],
    ['pink', 'Actions: what you press, what is in front, what is current.', 'button'],
    ['sky', 'Measurements and type. Things you type into or look into.', 'input'],
    ['coral', 'Only “this is wrong”: off your scale, an error.', 'error'],
  ];
  // the sections of the token table: a title, what the group is, and which tokens are in it (by name)
  const GROUPS = [
    ['Ground and words', 'Every surface and every word. Warm neutrals, so the overlay sits apart from whatever page is under it.', (n) => /^(paper|paper-2|desk|rule|ink|ink-2|ink-3)$/.test(n)],
    ['Roles', 'What a colour is for. A part asks for a role (“the action colour”) and never for a hue, so changing which hue acts is one line.', (n) => /^(action|action-soft|on-action|instrument|accent|on-accent|halo)$/.test(n)],
    ['Verdicts', 'On your scale, off it, or in between. Each is always paired with a shape or a word, never colour alone.', (n) => /^(on|off|soft|soft-text|unknown|on-bg|off-bg|soft-bg)$/.test(n)],
    ['On your page', 'What Blueprint draws on your app. Outside the six hues on purpose: these sit on any colour, so they are tuned to be seen anywhere.', (n) => /^(heat|sys|scrim)$/.test(n)],
  ];
  const sw = (value, cls = '') => `<i class="sw ${cls}" style="background:${value}"></i>`;
  const cellOf = (name, scheme) => {
    const t = by.get(name), authored = scheme === 'dark' ? (t.dark ?? t.light) : t.light, shown = (scheme === 'dark' ? inDark : inLight)(`--pl-${name}`);
    return `<span class="val">${sw(shown, scheme)}<code>${say(authored).replace(/color-mix\(in oklab, (\S+) (\d+)%, (\S+)\)/, '$2% $1 in $3')}</code></span>`;
  };
  const table = (names) => `<div class="tbl" role="table"><div class="tr th" role="row"><span>Token</span><span>What it is for</span><span>Light</span><span>Dark</span></div>${names.map((n) => `
    <div class="tr" role="row"><span><code class="tok" title="Click to copy" tabindex="0">--pl-${n}</code></span><span class="for">${by.get(n).note || '—'}</span>${cellOf(n, 'light')}${cellOf(n, 'dark')}</div>`).join('')}</div>`;
  const hueCard = ([hue, means, toy]) => `<article class="hue" style="--h: var(--pl-${hue}); --hs: var(--pl-${hue}-soft); --hi: var(--pl-${hue}-ink)">
      <div class="top"><i class="toy">${toyOf(toy)}</i><b>${hue}</b></div>
      <p>${means}</p>
      <div class="three">
        <span class="chip" style="background: var(--h); color: #fff"><b>${hue}</b><code class="tok" tabindex="0">--pl-${hue}</code><small>the body of a piece</small></span>
        <span class="chip" style="background: var(--hs); color: var(--hi)"><b>soft</b><code class="tok" tabindex="0">--pl-${hue}-soft</code><small>what is not there</small></span>
        <span class="chip" style="background: var(--hi); color: #fff"><b>ink</b><code class="tok" tabindex="0">--pl-${hue}-ink</code><small>marks drawn on the hue</small></span>
      </div></article>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${BUTTON_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); }
    a.back { font: 500 13px/1 var(--pl-sans); color: var(--pl-ink-2); text-decoration: none; }
    a.back:hover { color: var(--pl-ink); }
    .head { display: flex; align-items: flex-start; gap: 16px; margin: 14px 0 6px; }
    h1 { margin: 0; font: 600 30px/36px var(--pl-sans); letter-spacing: -0.02em; }
    .head .tb { margin-left: auto; }
    .lede { margin: 0 0 30px; font: 400 16px/26px var(--pl-sans); color: var(--pl-ink-2); max-width: 680px; }
    h2 { margin: 44px 0 6px; font: 600 20px/28px var(--pl-sans); letter-spacing: -0.01em; }
    h2 + p, .prose p { margin: 0 0 10px; font: 400 14px/22px var(--pl-sans); color: var(--pl-ink-2); max-width: 680px; }
    .prose b, h2 + p b { color: var(--pl-ink); font-weight: 600; }
    code { font: 500 12px/1.4 var(--pl-mono); }
    .prose code, h2 + p code { padding: 1px 5px; border-radius: 5px; background: var(--pl-paper-2); color: var(--pl-ink); }
    /* one set of names, two schemes */
    .card { margin-top: 18px; border-radius: 18px; background: var(--pl-paper); box-shadow: 0 0 0 1px var(--pl-rule); overflow: hidden; }
    .card .hd { display: flex; align-items: center; gap: 16px; padding: 18px 20px; }
    .card .hd h3 { margin: 0; font: 600 16px/22px var(--pl-sans); }
    .card .hd p { margin: 2px 0 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-ink-2); max-width: 520px; }
    .card .hd .tb { margin-left: auto; flex: none; }
    .steps { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--pl-rule); }
    .steps div { padding: 16px 20px 18px; border-left: 1px solid var(--pl-rule); }
    .steps div:first-child { border-left: 0; }
    .steps small { font: 500 11px/1 var(--pl-mono); color: var(--pl-ink-3); }
    .steps b { display: block; margin: 8px 0 3px; font: 600 14px/20px var(--pl-sans); }
    .steps span { font: 400 13px/19px var(--pl-sans); color: var(--pl-ink-2); }
    /* the six hues */
    .hues { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; margin-top: 16px; }
    .hue { padding: 16px; border-radius: 18px; background: var(--pl-paper); box-shadow: 0 0 0 1px var(--pl-rule); }
    .hue .top { display: flex; align-items: center; gap: 10px; }
    .hue .toy { display: block; width: 34px; height: 34px; transition: rotate 420ms var(--pl-spring-pop), scale 420ms var(--pl-spring-pop); }
    .hue:hover .toy { rotate: -9deg; scale: 1.14; }
    .hue .toy svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .hue .top b { font: 600 17px/22px var(--pl-sans); text-transform: capitalize; }
    .hue p { margin: 8px 0 12px; font: 400 13px/19px var(--pl-sans); color: var(--pl-ink-2); min-height: 38px; }
    .three { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 6px; }
    .chip { display: flex; flex-direction: column; gap: 2px; padding: 10px 10px 9px; border-radius: 12px; min-width: 0; }
    .chip b { font: 600 13px/16px var(--pl-sans); text-transform: capitalize; }
    .chip code { font-size: 10px; opacity: .85; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: copy; }
    .chip small { font: 400 11px/14px var(--pl-sans); opacity: .8; }
    /* the tables */
    .tbl { margin-top: 14px; border-radius: 16px; background: var(--pl-paper); box-shadow: 0 0 0 1px var(--pl-rule); overflow: hidden; }
    .tr { display: grid; grid-template-columns: minmax(150px, 1.1fr) minmax(0, 2.2fr) minmax(0, 1.25fr) minmax(0, 1.25fr); gap: 14px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--pl-rule); }
    .tr.th { border-top: 0; padding: 9px 16px; background: var(--pl-paper-2); font: 600 11px/1 var(--pl-sans); letter-spacing: .05em; text-transform: uppercase; color: var(--pl-ink-2); }
    .tr .for { font: 400 13px/18px var(--pl-sans); color: var(--pl-ink-2); }
    .tok { color: var(--pl-ink); cursor: copy; border-radius: 5px; outline: none; }
    .tok:hover, .tok:focus-visible { background: var(--pl-sky-soft); color: var(--pl-sky-ink); box-shadow: 0 0 0 3px var(--pl-sky-soft); }
    .tok[data-copied] { background: var(--pl-mint-soft); color: var(--pl-mint-ink); box-shadow: 0 0 0 3px var(--pl-mint-soft); }
    .val { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .val code { color: var(--pl-ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sw { flex: none; width: 22px; height: 22px; border-radius: 7px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
    .sw.dark { box-shadow: inset 0 0 0 1px rgb(255 255 255 / .14), 0 0 0 3px #1c1c1e; margin: 0 3px; }
    .open { margin-top: 14px; padding: 14px 18px 14px 34px; border-radius: 16px; background: var(--pl-paper); box-shadow: 0 0 0 1px var(--pl-rule); font: 400 13px/21px var(--pl-sans); color: var(--pl-ink-2); }
    .open b { color: var(--pl-ink); font-weight: 600; }
    @media (max-width: 720px) { .steps { grid-template-columns: 1fr; } .steps div { border-left: 0; border-top: 1px solid var(--pl-rule); } .tr { grid-template-columns: 1fr 1fr; } .tr.th span:nth-child(2), .tr .for { display: none; } }
    @media (prefers-reduced-motion: reduce) { .hue .toy { transition: none; } }
  </style>${TOY_DEFS}
  <a class="back" href="/design">← The kit</a>
  <div class="head"><h1>Colour</h1>${button('Dark', { cls: 'sm quiet', attrs: 'id="scheme"' })}</div>
  <p class="lede">Six hues with one meaning each, a handful of warm neutrals, and the roles that parts ask for. Every table on this page is read from the token file itself, so it can’t disagree with the product.</p>

  <h2>How the system works</h2>
  <div class="prose">
    <p>Colour is in two layers. <b>Hues</b> are the raw palette: six of them, each with three values (the hue, its <b>soft</b>, its <b>ink</b>), plus seven neutrals for surfaces and words. <b>Roles</b> sit on top and point at a hue by purpose: what the colour is <i>for</i>, never what it looks like. <code>--pl-action</code> says “the thing you can press”, not “pink”.</p>
    <p>A part takes a role when one exists and a hue only for what the hue itself means (padding is mint everywhere). That one step is what keeps the system in one piece: move a role to another hue and every part follows, with no part edited.</p>
    <p>The dark scheme is the same names with other values. A part never asks which scheme it is in.</p>
  </div>

  <div class="card">
    <div class="hd"><div><h3>One set of names, two schemes</h3><p>Flip the page. Everything you see is drawn from the same tokens; only their values change.</p></div>${button('Flip it', { cls: '', attrs: 'id="flip"' })}</div>
    <div class="steps">
      <div><small>01</small><b>A hue has one meaning</b><span>Mint is padding and “done”. If a new thing needs a colour, find its meaning in the six first.</span></div>
      <div><small>02</small><b>Ask for the role</b><span>Use <code>--pl-action</code>, not <code>--pl-pink</code>, for a thing you press. Use the hue only for what the hue means.</span></div>
      <div><small>03</small><b>Pale means not there</b><span>A hue’s soft is for the empty part of a ring, the tabs behind, a disabled button. Never for a main action.</span></div>
    </div>
  </div>

  <h2>The six hues</h2>
  <p>Each one is a solid for the body of a piece, a soft for what is not there, and an ink for marks drawn on it. Click a token name to copy it.</p>
  <div class="hues">${HUES.map(hueCard).join('')}</div>

  ${GROUPS.map(([title, why, has]) => `<h2>${title}</h2><p>${why}</p>${table(tokens.map((t) => t.name).filter(has))}`).join('')}

  <h2>What is still open</h2>
  <ul class="open">
    <li><b>The action role is pale today.</b> Buttons in the product use <code>--pl-action-soft</code> with dark pink words. In the toy language pale means “not there”, so the role should be the solid pink with white on it (see Buttons).</li>
    <li><b>The dark surfaces are near black.</b> <code>--pl-paper</code> in dark is ${inDark('--pl-paper')}; the comps try a lifted warm graphite (#2e2d2b). Not in the token file yet.</li>
    <li><b>Butter can’t carry words.</b> It is 2.45:1 on paper, so text in its tone uses <code>--pl-soft-text</code>. Keep butter for bodies and marks.</li>
    <li><b>Two names for one colour.</b> <code>--pl-accent</code> and <code>--pl-instrument</code> are the same sky; one of them should go.</li>
  </ul>`;

  const flip = () => host.dispatchEvent(new CustomEvent('kit:flip', { bubbles: true }));
  root.getElementById('scheme').onclick = flip; root.getElementById('flip').onclick = flip;
  // a token name copies itself
  const copy = (el) => { navigator.clipboard?.writeText(el.textContent).catch(() => {}); el.setAttribute('data-copied', ''); setTimeout(() => el.removeAttribute('data-copied'), 900); };
  root.addEventListener('click', (e) => { const t = e.target.closest('.tok'); if (t) copy(t); });
  root.addEventListener('keydown', (e) => { const t = e.target.closest?.('.tok'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); copy(t); } });
}
