// The design site's page for type: what it draws inside its host. The site (web/design/Part.jsx) gives it the host,
// the overlay's token file as text, and the scheme; it draws with the overlay's own source.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { readTokens, probe } from '../tokens.js';
import { BUTTON_CSS, button } from '../../../overlay/src/kit.js';

export function mount(host, root, css) {

  const tokens = readTokens(css), by = new Map(tokens.map((t) => [t.name, t]));
  const value = probe(css, 'light');

  // a style token is a `font` shorthand: weight size/line-height face. Read it back into its parts.
  const WEIGHT = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
  const partsOf = (name) => {
    const m = value(`--pl-${name}`).match(/^(\d+)\s+(\d+(?:\.\d+)?)px\/(\d+(?:\.\d+)?)px\s+(.*)$/);
    return m ? { weight: +m[1], size: +m[2], line: +m[3], mono: /mono/i.test(m[4]) } : null;
  };
  // what to set in each style, so the specimen reads like the product and shows what the style is for
  const SAY = {
    'card-title': 'The corner is 5px. Your scale has 6 and 8.',
    'card-body': 'Round it to the nearest step and all 16 places take it. Nothing else on the page moves.',
    'card-meta': '16 places · 3 files · last changed in Tag.jsx',
    'card-code': 'rounded-[5px] → rounded-tag   Tag.jsx:12',
    'text-label': 'ON YOUR SCALE',
    'page-display': 'Where your sizes land',
    'page-display-narrow': 'Where your sizes land',
    'page-title': 'Text sizes typed by hand',
    'page-body': 'Each mark is a place in your code that types a size by hand, next to the size it is closest to.',
    'page-small': '214 places use your scale. 37 sit just off it.',
    'page-meta': 'text-sm · 14px · used in 62 places',
    'page-figure': '1,284',
  };
  const CAPS = new Set(['text-label']);
  const FAMILIES = [
    ['On a card', 'Anything the size of a card or a bar: the fix bar, a toast, a tooltip, the dock. Five steps.', ['card-title', 'card-body', 'card-meta', 'card-code', 'text-label']],
    ['On a page', 'Anything bigger than a card: the project page, the kit. Each step is a clear jump from the next, so the eye knows what to read first.', ['page-display', 'page-figure', 'page-title', 'page-body', 'page-small', 'page-meta', 'page-display-narrow']],
  ];
  const nice = (name) => name.replace(/^(card|page|text)-/, '').replace(/-/g, ' ');
  const style = (name) => {
    const p = partsOf(name), t = by.get(name);
    return `<article class="style">
      <div class="meta"><b>${nice(name)}</b><span class="nums">${p.size}px / ${p.line}px</span><p>${t.note || ''}</p>
        <code class="tok" tabindex="0" title="Click to copy">font: var(--pl-${name})</code><span class="w">${WEIGHT[p.weight] ?? p.weight} · ${p.weight}${p.mono ? ' · mono' : ''}</span></div>
      <div class="spec" style="font: var(--pl-${name});${CAPS.has(name) ? 'letter-spacing: var(--pl-tracking-caps);' : name === 'page-display' || name === 'page-display-narrow' ? 'letter-spacing: var(--pl-tracking-display);' : name === 'page-title' ? 'letter-spacing: var(--pl-tracking-title);' : ''}${name === 'page-figure' ? 'font-variant-numeric: tabular-nums;' : ''}">${SAY[name] ?? 'The five boxing wizards jump quickly.'}</div>
    </article>`;
  };
  // every size in use, smallest first, as bars: how far apart the steps really are
  const all = FAMILIES.flatMap(([, , names]) => names).map((n) => ({ name: n, ...partsOf(n) })).sort((a, b) => a.size - b.size);
  const ladder = `<div class="ladder">${all.map((s) => `<span class="rung" title="--pl-${s.name}"><i style="height:${s.size * 1.6}px"></i><b>${s.size}</b><small>${nice(s.name)}</small></span>`).join('')}</div>`;
  const row = (name, shown) => `<div class="tr" role="row"><span><code class="tok" tabindex="0">--pl-${name}</code></span><span class="for">${by.get(name).note || '—'}</span><span class="val"><code>${shown ?? by.get(name).light}</code></span></div>`;

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
    .prose b { color: var(--pl-ink); font-weight: 600; }
    code { font: 500 12px/1.4 var(--pl-mono); }
    .prose code { padding: 1px 5px; border-radius: 5px; background: var(--pl-paper-2); color: var(--pl-ink); }
    .styles { margin-top: 14px; border-radius: 18px; background: var(--pl-paper); box-shadow: 0 0 0 1px var(--pl-rule); overflow: hidden; }
    .style { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 24px; align-items: center; padding: 18px 20px; border-top: 1px solid var(--pl-rule); }
    .style:first-child { border-top: 0; }
    .style .meta { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }
    .style .meta b { font: 600 15px/20px var(--pl-sans); text-transform: capitalize; }
    .style .nums { font: 500 12px/16px var(--pl-mono); color: var(--pl-ink-2); }
    .style .meta p { margin: 4px 0 6px; font: 400 13px/18px var(--pl-sans); color: var(--pl-ink-2); }
    .style .w { font: 400 11px/14px var(--pl-sans); color: var(--pl-ink-3); margin-top: 3px; }
    .style .spec { color: var(--pl-ink); min-width: 0; overflow-wrap: anywhere; }
    .tok { color: var(--pl-ink); cursor: copy; border-radius: 5px; outline: none; }
    .tok:hover, .tok:focus-visible { background: var(--pl-sky-soft); color: var(--pl-sky-ink); box-shadow: 0 0 0 3px var(--pl-sky-soft); }
    .tok[data-copied] { background: var(--pl-mint-soft); color: var(--pl-mint-ink); box-shadow: 0 0 0 3px var(--pl-mint-soft); }
    .ladder { display: flex; align-items: flex-end; gap: 6px; margin-top: 14px; padding: 22px 20px 16px; border-radius: 18px; background: var(--pl-paper); box-shadow: 0 0 0 1px var(--pl-rule); overflow-x: auto; }
    .rung { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 56px; }
    .rung i { display: block; width: 100%; max-width: 46px; border-radius: 7px 7px 3px 3px; background: var(--pl-sky); }
    .rung b { font: 600 13px/1 var(--pl-mono); }
    .rung small { font: 400 10px/12px var(--pl-sans); color: var(--pl-ink-3); text-align: center; text-transform: capitalize; }
    .tbl { margin-top: 14px; border-radius: 16px; background: var(--pl-paper); box-shadow: 0 0 0 1px var(--pl-rule); overflow: hidden; }
    .tr { display: grid; grid-template-columns: minmax(190px, 1fr) minmax(0, 2fr) minmax(0, 1.6fr); gap: 14px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--pl-rule); }
    .tr.th { border-top: 0; padding: 9px 16px; background: var(--pl-paper-2); font: 600 11px/1 var(--pl-sans); letter-spacing: .05em; text-transform: uppercase; color: var(--pl-ink-2); }
    .tr .for { font: 400 13px/18px var(--pl-sans); color: var(--pl-ink-2); }
    .val code { color: var(--pl-ink-2); }
    .open { margin-top: 14px; padding: 14px 18px 14px 34px; border-radius: 16px; background: var(--pl-paper); box-shadow: 0 0 0 1px var(--pl-rule); font: 400 13px/21px var(--pl-sans); color: var(--pl-ink-2); }
    .open b { color: var(--pl-ink); font-weight: 600; }
    @media (max-width: 720px) { .style { grid-template-columns: 1fr; gap: 10px; } .tr { grid-template-columns: 1fr 1fr; } .tr .for { display: none; } }
  </style>
  <a class="back" href="/design">← The kit</a>
  <div class="head"><h1>Type</h1>${button('Dark', { cls: 'sm quiet', attrs: 'id="scheme"' })}</div>
  <p class="lede">Twelve styles in two families: five for anything the size of a card, seven for a page. System faces only, so the overlay never fetches a font. Every style here is read from the token file itself.</p>

  <h2>How the system works</h2>
  <div class="prose">
    <p>Every style is <b>one token that sets everything at once</b>: weight, size, line height and face, as a single <code>font</code> value. You write <code>font: var(--pl-card-title)</code>. You never put a size, a weight and a line height together by hand, so two parts can’t end up almost the same.</p>
    <p>Names are <code>--pl-{where}-{what}</code>. <b>Where</b> is <code>card</code> or <code>page</code>. <b>What</b> is the job the words do (title, body, meta, code), never a size. Colour is separate: a style sets the shape of the words, an ink token sets their colour.</p>
    <p><b>Mono is only for real code</b>: a class, a value, a file and line, a command. Never for prose, never for a label.</p>
  </div>

  <h2>Every size in use</h2>
  <p>All twelve, smallest first, drawn to scale. Where the bars crowd together, the steps are too close to tell apart.</p>
  ${ladder}

  ${FAMILIES.map(([title, why, names]) => `<h2>${title}</h2><p>${why}</p><div class="styles">${names.map(style).join('')}</div>`).join('')}

  <h2>Faces and spacing between letters</h2>
  <p>Two faces, both the system’s own. Four letter-spacing values, each tied to a job.</p>
  <div class="tbl" role="table"><div class="tr th" role="row"><span>Token</span><span>What it is for</span><span>Value</span></div>
    ${row('sans', 'the system’s sans')}${row('mono', 'the system’s mono')}
    ${['tracking-display', 'tracking-title', 'tracking-label', 'tracking-caps'].map((n) => row(n)).join('')}</div>

  <h2>What is still open</h2>
  <ul class="open">
    <li><b>Four sizes within three pixels.</b> 11, 12, 13 and 14 all live on a card. Side by side, 12 and 13 are hard to tell apart; the scale would be clearer with one of them gone.</li>
    <li><b>Three older names still exist.</b> <code>--pl-text-title</code>, <code>--pl-text-row</code> and <code>--pl-text-reading</code> duplicate card styles and should be removed once nothing uses them.</li>
    <li><b>The label is the only style not named for where it lives.</b> <code>--pl-text-label</code> should be <code>--pl-card-label</code>.</li>
    <li><b>The toy language hasn’t reached type yet.</b> The icons and buttons are rounder and bolder than these styles. Whether headings get heavier, or a rounder face, is not decided.</li>
  </ul>`;

  const flip = () => host.dispatchEvent(new CustomEvent('kit:flip', { bubbles: true }));
  root.getElementById('scheme').onclick = flip;
  const copy = (el) => { navigator.clipboard?.writeText(el.textContent).catch(() => {}); el.setAttribute('data-copied', ''); setTimeout(() => el.removeAttribute('data-copied'), 900); };
  root.addEventListener('click', (e) => { const t = e.target.closest('.tok'); if (t) copy(t); });
  root.addEventListener('keydown', (e) => { const t = e.target.closest?.('.tok'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); copy(t); } });
}
