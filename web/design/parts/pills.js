// The design site's page for pills, tags and chips: what it draws inside its host. Three small things that look
// alike and mean different things: a pill is a value, a tag is a name, a chip is a property with its value. Each is
// the overlay's own piece (language.js, show.js), drawn large with its space marked the way Plumber marks yours:
// padding hatched mint, a gap striped lilac, the corner's arc; the guides are measured from the piece itself.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { SHOW_CSS, chipsHtml, roll } from '../../../overlay/src/show.js';
import { BLOCK_ICONS } from '../../../overlay/src/boxmodel.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';

export function mount(host, root, css) {
  const Z = 2.5;
  // each kind: the piece, what it is, and which of its parts carry meaning
  const KINDS = [
    { id: 'pill', name: 'Pill', is: 'a value', says: 'A measurement, a count or a token. Mono, tabular numbers, so a column of them lines up; the pastel of the hue it belongs to.',
      html: '<span class="pl-pill" data-hue="sky">16px</span>' },
    { id: 'tag', name: 'Tag', is: 'a name', says: 'An element or a component, by name. Lilac unless asked, the plain face, a small picture of the kind of thing before the words.',
      html: `<span class="pl-tag">${toyOf('button') || BLOCK_ICONS.g}Button</span>` },
    { id: 'chip', name: 'Chip', is: 'a property and its value', says: 'A property you can change, its icon before its value. Neutral until it plays, then the icon takes the hue and the value rolls.',
      html: chipsHtml([{ label: 'Padding 16', icon: BLOCK_ICONS.p, from: 16 }]) },
  ];

  // a pill's hue says what it is about (docs/design/visual-language.md, the hue table)
  const HUE_ROWS = [['sky', '320px', 'a measurement, a size of type'], ['mint', '16px', 'on your scale, done, saved'], ['coral', '13px', 'off your scale: the only "wrong"'],
    ['butter', '24px', 'margin, or a value typed by hand'], ['lilac', 'gap 8', 'a gap; names and text'], ['pink', 'now', 'what is current, what you press']];
  const anatomy = (k) => `<figure class="kind" data-id="${k.id}">
    <div class="big"><div class="zoom">${k.html}</div><svg class="guides" aria-hidden="true"></svg></div>
    <figcaption><h3>${k.name} <span>${k.is}</span></h3><p>${k.says}</p><dl class="sizes"></dl></figcaption></figure>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${SHOW_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    h2 { margin: 44px 0 6px; font: 600 20px/28px var(--pl-sans); letter-spacing: -0.01em; }
    h2 + p, .prose p { margin: 0 0 10px; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); max-width: 680px; }
    .prose b { color: var(--pl-text-primary); font-weight: 600; }
    code { font: 500 12px/1.4 var(--pl-mono); }
    .panel { margin-top: 14px; border-radius: 18px; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); overflow: hidden; }
    .tok { color: var(--pl-text-primary); cursor: copy; border-radius: 5px; outline: none; }
    .tok:hover, .tok:focus-visible { background: var(--pl-bg-selected); color: var(--pl-state-on-token-text); box-shadow: 0 0 0 3px var(--pl-bg-selected); }
    .tok[data-copied] { background: var(--pl-state-written-bg); color: var(--pl-state-written-text); box-shadow: 0 0 0 3px var(--pl-state-written-bg); }

    /* ── anatomy: each piece large, its space marked ── */
    .kinds { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .kind { margin: 0; display: grid; grid-template-rows: 190px auto; border-left: 1px solid var(--pl-border-default); }
    .kind:first-child { border-left: 0; }
    .big { position: relative; display: grid; place-items: center; background: var(--pl-bg-inset); }
    .zoom { zoom: ${Z}; }
    .guides { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
    .guides .dim { stroke: var(--pl-text-secondary); stroke-width: 1; }
    .guides .tick { stroke: var(--pl-text-secondary); stroke-width: 1; }
    .guides .arc { fill: none; stroke: var(--pl-border-focus); stroke-width: 2.5; stroke-linecap: round; }
    .guides text { font: 500 11px/1 var(--pl-mono); fill: var(--pl-text-secondary); paint-order: stroke; stroke: var(--pl-bg-inset); stroke-width: 4px; }
    .guides .arc-l { fill: var(--pl-border-focus); }
    .guides .pad { fill: url(#pl-hatch); } .guides .gap { fill: url(#pl-stripes); }
    figcaption { padding: 16px 18px 18px; display: grid; gap: 6px; align-content: start; }
    figcaption h3 { margin: 0; font: 600 16px/22px var(--pl-sans); }
    figcaption h3 span { margin-left: 6px; font: 500 13px/1 var(--pl-sans); color: var(--pl-text-secondary); }
    figcaption p { margin: 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }
    .sizes { margin: 6px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font: 400 12px/17px var(--pl-sans); color: var(--pl-text-secondary); }
    .sizes dt { color: var(--pl-text-secondary); } .sizes dd { margin: 0; color: var(--pl-text-primary); }
    .sizes dd code { font-size: 11px; }
    /* ── in use: a card from someone's app, marked ── */
    .use { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); align-items: center; }
    .scene { position: relative; display: grid; place-items: center; padding: 64px 40px 52px; background: var(--pl-bg-inset); }
    .app-card { width: 240px; display: grid; gap: 13px; padding: 16px; border-radius: 12px; background: #fff; color: #1b1b1f; box-shadow: 0 1px 2px rgb(0 0 0 / .08), 0 8px 24px -12px rgb(0 0 0 / .25); font: 400 13px/18px system-ui, sans-serif; }
    .app-card b { font: 600 16px/20px system-ui, sans-serif; } .app-card span { color: #5b5b66; }
    .app-card .btn { justify-self: start; padding: 7px 12px; border-radius: 8px; background: #1b1b1f; color: #fff; font-weight: 600; }
    .marks { position: absolute; inset: 0; pointer-events: none; }
    .marks > * { position: absolute; }
    .marks .mk { border-radius: 2px; opacity: .35; transition: opacity 200ms var(--pl-ease-out); }
    .marks .mk.corner { border: 2.5px solid var(--hue); border-right: 0; border-bottom: 0; border-radius: 12px 0 0 0; background: none; }
    .marks .mk[data-lit] { opacity: 1; }
    .marks .ruler { height: 1px; background: var(--pl-sky); } .marks .ruler::before, .marks .ruler::after { content: ''; position: absolute; top: -4px; width: 1px; height: 9px; background: var(--pl-sky); } .marks .ruler::after { right: 0; }
    .side-chips { display: grid; gap: 14px; padding: 24px; }
    .side-chips .sh-chip { cursor: default; }
    .legend { margin: 0; font: 400 13px/26px var(--pl-sans); color: var(--pl-text-secondary); }
    .open { margin-top: 14px; padding: 14px 18px 14px 34px; border-radius: 16px; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); font: 400 13px/21px var(--pl-sans); color: var(--pl-text-secondary); }
    .open li + li { margin-top: 6px; } .open b { color: var(--pl-text-primary); font-weight: 600; }
    .hues { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .hue { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-top: 1px solid var(--pl-border-default); border-left: 1px solid var(--pl-border-default); font: 400 13px/18px var(--pl-sans); color: var(--pl-text-secondary); }
    .hue:nth-child(-n+3) { border-top: 0; } .hue:nth-child(3n+1) { border-left: 0; }
    .hue b { color: var(--pl-text-primary); font-weight: 600; }
    .hue .pl-pill { flex: none; }
    @media (max-width: 760px) { .use { grid-template-columns: 1fr; } .hues { grid-template-columns: 1fr; } .hue { border-left: 0 !important; border-top: 1px solid var(--pl-border-default) !important; } .hue:first-child { border-top: 0 !important; } }
    @media (max-width: 760px) { .kinds { grid-template-columns: 1fr; } .kind { border-left: 0; border-top: 1px solid var(--pl-border-default); } .kind:first-child { border-top: 0; } }
  </style>${TOY_DEFS}
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <pattern id="pl-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="color-mix(in oklab, var(--pl-mark-padding) 16%, transparent)"/><rect width="1.5" height="5" fill="color-mix(in oklab, var(--pl-mark-padding) 70%, transparent)"/></pattern>
    <pattern id="pl-stripes" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="color-mix(in oklab, var(--pl-mark-gap) 16%, transparent)"/><rect width="1.5" height="4" fill="color-mix(in oklab, var(--pl-mark-gap) 70%, transparent)"/></pattern>
  </defs></svg>
  <h2>How the system works</h2>
  <div class="prose">
    <p>Three small things look alike and mean different things. <b>A pill is a value</b>: a measurement, a count, a token. <b>A tag is a name</b>: the element or component you're looking at. <b>A chip is a property and its value</b>: something you can change, and when it changes its number rolls.</p>
    <p>Each is drawn here two and a half times its size, its space marked the way Plumber marks yours: padding hatched mint, a gap striped lilac, the corner's arc in blue. The numbers are measured from the piece itself.</p>
  </div>
  <h2>Anatomy</h2>
  <div class="panel kinds">${KINDS.map(anatomy).join('')}</div>

  <h2>In use</h2>
  <p>A card in someone's app, pointed at. The tag names it, the pills measure it, the chips are what you can change. Point at a chip: its places on the card light up in its hue.</p>
  <div class="panel use">
    <div class="scene">
      <div class="app-card"><b>Pro plan</b><span>Everything in Free, and a team.</span><span class="btn">Upgrade</span></div>
      <div class="marks" aria-hidden="true"></div>
    </div>
    <div class="side-chips">${chipsHtml([{ label: 'Padding 16', icon: BLOCK_ICONS.p, from: 16 }, { label: 'Gap 13', icon: BLOCK_ICONS.g, from: 13 }, { label: 'Corner 12', icon: toyOf('corner'), from: 12 }])}
      <p class="legend"><span class="pl-tag">${toyOf('card') || BLOCK_ICONS.p}Card</span> names it · <span class="pl-pill legend-w" data-hue="sky">0px</span> measures it · the chips are its properties</p></div>
  </div>

  <h2>Colours</h2>
  <p>A pill takes the hue of what it is about, from the hue table. Coral only ever means "this is wrong".</p>
  <div class="panel hues">${HUE_ROWS.map(([hue, v, means]) => `<div class="hue"><span class="pl-pill" data-hue="${hue}">${v}</span><span><b>${hue[0].toUpperCase() + hue.slice(1)}</b> ${means}</span></div>`).join('')}</div>

  <h2>What is still open</h2>
  <ul class="open">
    <li><b>Most pills in the overlay are home-made.</b> Counted on 2026-11-13: the shared pill is used 8 times and the shared tag 4 times, but 8 other pill or tag shapes are written out in 7 files (the Blueprint hint, the history strip's pill, the readiness chip, the text tag, the widget's tag, and the chips in the editor controls and the text card) instead of using them.</li>
    <li><b>Six heights where three would do.</b> Small rounded things come at 14, 16, 18, 20, 22 and 24px: one per kind is the system (pill 20, tag 22, chip 24); the 14, 16 and 18 are copies made smaller by hand.</li>
    <li><b>Corners off the tokens.</b> Four of the copies write their corner as a number (4, 5, 5 and 7px) rather than the pill or tag token, and one restyles the shared tag to 5px.</li>
  </ul>`;

  // the guides: padding on both sides (hatched), the gap between picture and words (striped), the height, one corner
  const px = (v) => parseFloat(v) || 0;
  const guide = (fig) => {
    const big = fig.querySelector('.big'), piece = fig.querySelector('.zoom > *:not(.sh-chips), .sh-chip'), svg = fig.querySelector('.guides');
    const b = big.getBoundingClientRect(), r = piece.getBoundingClientRect(), cs = getComputedStyle(piece);
    const x0 = r.left - b.left, y0 = r.top - b.top, x1 = r.right - b.left, y1 = r.bottom - b.top, h = r.height;
    const pl = px(cs.paddingLeft) * Z, pr = px(cs.paddingRight) * Z, rad = px(cs.borderTopLeftRadius) * Z;
    const kids = [...piece.children].filter((c) => c.getBoundingClientRect().width > 0);
    const out = [];
    out.push(`<rect class="pad" x="${x0}" y="${y0}" width="${pl}" height="${h}"/>`, `<rect class="pad" x="${x1 - pr}" y="${y0}" width="${pr}" height="${h}"/>`);
    let gap = 0;
    if (kids.length > 1) {
      const a = kids[0].getBoundingClientRect(), c = kids[1].getBoundingClientRect();
      gap = (c.left - a.right) / Z;
      out.push(`<rect class="gap" x="${a.right - b.left}" y="${y0}" width="${c.left - a.right}" height="${h}"/>`);
    } else if (piece.firstChild?.nodeType === 1 && piece.childNodes.length > 1) {
      // a tag: its picture is an element, its words are text after it
      const a = piece.firstElementChild.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(piece); range.setStartAfter(piece.firstElementChild);
      const c = range.getBoundingClientRect(); gap = (c.left - a.right) / Z;
      if (gap > 0) out.push(`<rect class="gap" x="${a.right - b.left}" y="${y0}" width="${c.left - a.right}" height="${h}"/>`);
    }
    // height, on the left
    const hx = x0 - 18;
    out.push(`<line class="dim" x1="${hx}" y1="${y0}" x2="${hx}" y2="${y1}"/><line class="tick" x1="${hx - 4}" y1="${y0}" x2="${hx + 4}" y2="${y0}"/><line class="tick" x1="${hx - 4}" y1="${y1}" x2="${hx + 4}" y2="${y1}"/>`,
      `<text x="${hx - 8}" y="${(y0 + y1) / 2 + 4}" text-anchor="end">${Math.round(h / Z)}</text>`);
    // padding, under
    out.push(`<text x="${x0 + pl / 2}" y="${y1 + 18}" text-anchor="middle">${Math.round(pl / Z)}</text>`, `<text x="${x1 - pr / 2}" y="${y1 + 18}" text-anchor="middle">${Math.round(pr / Z)}</text>`);
    if (gap > 0) { const g0 = kids.length > 1 ? kids[0].getBoundingClientRect().right - b.left : piece.firstElementChild.getBoundingClientRect().right - b.left; out.push(`<text x="${g0 + (gap * Z) / 2}" y="${y0 - 10}" text-anchor="middle">${Math.round(gap)}</text>`); }
    // the corner, top right
    if (rad) { const cx = x1 - rad, cy = y0 + rad; out.push(`<path class="arc" d="M ${cx} ${y0} A ${rad} ${rad} 0 0 1 ${x1} ${cy}"/>`, `<text x="${x1 + 8}" y="${y0 + 4}">r ${Math.round(rad / Z)}</text>`); }
    svg.innerHTML = out.join('');
    // the numbers, said beside it
    const font = `${cs.fontWeight} ${Math.round(px(cs.fontSize))}px ${/mono/i.test(cs.fontFamily) ? 'mono' : 'sans'}`;
    fig.querySelector('.sizes').innerHTML = [['Height', `${Math.round(h / Z)}px`], ['Padding', `${Math.round(pl / Z)} left, ${Math.round(pr / Z)} right`], gap > 0 ? ['Gap', `${Math.round(gap)}px`] : null,
      ['Corner', fig.dataset.id === 'tag' ? '<code class="tok" tabindex="0">--pl-radius-tag</code>' : '<code class="tok" tabindex="0">--pl-radius-pill</code>'], ['Type', font]]
      .filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  };
  const figs = [...root.querySelectorAll('.kind')];
  const all = () => figs.forEach(guide);
  new ResizeObserver(all).observe(root.querySelector('.kinds'));
  requestAnimationFrame(all);

  // in use: the card's marks, measured from it; a chip lights its own places
  const scene = root.querySelector('.scene'), card = scene.querySelector('.app-card'), marks = scene.querySelector('.marks');
  const placeMarks = () => {
    const sb = scene.getBoundingClientRect(), c = card.getBoundingClientRect(), kids = [...card.children].map((k) => k.getBoundingClientRect());
    const L = c.left - sb.left, T = c.top - sb.top, W = c.width, H = c.height, P = 16;
    const tone = (role) => root.querySelector(`.side-chips .sh-chip[data-i="${role}"]`)?.dataset.tone ?? 'sky';
    const box = (cls, x, y, w, h, role) => `<i class="mk sh-mark ${cls}" data-role="${role}" data-tone="${tone(role)}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></i>`;
    const gaps = kids.slice(1).map((k, i) => box('gap', L + P, kids[i].bottom - sb.top, W - 2 * P, k.top - kids[i].bottom, 1)).join('');
    marks.innerHTML = box('pad', L, T, W, P, 0) + box('pad', L, T + H - P, W, P, 0) + box('pad', L, T + P, P, H - 2 * P, 0) + box('pad', L + W - P, T + P, P, H - 2 * P, 0) + gaps
      + `<i class="mk corner sh-mark" data-role="2" data-tone="${tone(2)}" style="left:${L}px;top:${T}px;width:22px;height:22px"></i>`
      + `<span class="pl-tag" style="left:${L}px;top:${T - 30}px">${toyOf('card') || BLOCK_ICONS.p}Card</span>`
      + `<i class="ruler" style="left:${L}px;top:${T + H + 14}px;width:${W}px"></i><span class="pl-pill" data-hue="sky" style="left:${L + W / 2 - 24}px;top:${T + H + 22}px">${Math.round(W)}px</span>`
      + `<span class="pl-pill" data-hue="coral" style="left:${L + W + 10}px;top:${kids[0].bottom - sb.top + (kids[1].top - kids[0].bottom) / 2 - 10}px">13px</span>`;
  };
  const placeAll = () => { placeMarks(); root.querySelector('.legend-w').textContent = `${Math.round(card.getBoundingClientRect().width)}px`; };
  new ResizeObserver(placeAll).observe(scene); requestAnimationFrame(placeAll);
  root.querySelectorAll('.side-chips .sh-chip').forEach((ch) => {
    ch.addEventListener('pointerenter', () => { ch.setAttribute('data-on', ''); marks.querySelectorAll(`[data-role="${ch.dataset.i}"]`).forEach((m) => m.setAttribute('data-lit', '')); });
    ch.addEventListener('pointerleave', () => { ch.removeAttribute('data-on'); marks.querySelectorAll('[data-lit]').forEach((m) => m.removeAttribute('data-lit')); });
  });

  // the chip plays: pointed at, its icon takes the hue and its value rolls on
  const chip = root.querySelector('.kind[data-id="chip"] .sh-chip');
  let n = 16;
  root.querySelector('.kind[data-id="chip"] .big').addEventListener('pointerenter', () => { chip.setAttribute('data-on', ''); n = n === 16 ? 24 : 16; roll(chip, n); });
  root.querySelector('.kind[data-id="chip"] .big').addEventListener('pointerleave', () => chip.removeAttribute('data-on'));

  const copy = (el) => { navigator.clipboard?.writeText(el.textContent).catch(() => {}); el.setAttribute('data-copied', ''); setTimeout(() => el.removeAttribute('data-copied'), 900); };
  root.addEventListener('click', (e) => { const t = e.target.closest('.tok'); if (t) copy(t); });
  root.addEventListener('keydown', (e) => { const t = e.target.closest?.('.tok'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); copy(t); } });
  void host;
}
