// The design site's page for spacing, radius and shadow: what it draws inside its host. The site (web/design/Part.jsx)
// gives it the host, the overlay's token file as text, and the scheme; the tables are read from the file.
// Spacing is drawn as space in the visual language's own patterns (padding hatched mint, a gap striped lilac); every
// corner is shown on the object it belongs to; the open list says plainly where the overlay itself is off its scale.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { readTokens, probe } from '../tokens.js';

export function mount(host, root, css) {
  const tokens = readTokens(css), by = new Map(tokens.map((t) => [t.name, t]));
  const value = probe(css, 'light');
  const px = (name) => parseFloat(value(`--pl-${name}`));

  const CARD = ['space-1', 'space-2', 'space-3', 'space-4', 'space-5', 'space-6', 'space-7', 'space-8'];
  const PAGE = ['page-space-1', 'page-space-2', 'page-space-3', 'page-space-4'];
  const RADII = ['radius-mark', 'radius-tag', 'radius-pill', 'radius-row', 'radius-card'];

  // a card step: its band of space drawn three times its size (2px can't be seen at its own), hatched like padding;
  // the 6px step is off the 4-based ladder and drawn as such
  const step = (name) => {
    const v = px(name), off = v % 4 !== 0 && v > 2;
    return `<div class="step${off ? ' off' : ''}">
      <code class="tok" tabindex="0" title="Click to copy">--pl-${name}</code>
      <b>${v}px</b>
      <span class="band"><i style="width:${v * 3}px"></i></span>
      <span class="for">${by.get(name)?.note ?? ''}</span>
    </div>`;
  };
  // a page step: the real gap between two blocks, at its own size
  const pageStep = (name) => `<div class="pstep"><span class="blk"></span><i class="gapband" style="height:${px(name)}px"></i><span class="blk"></span>
    <b>${px(name)}px</b><code class="tok" tabindex="0">--pl-${name}</code><small>${by.get(name)?.note ?? ''}</small></div>`;
  // each corner on the object it belongs to
  const OBJ = {
    'radius-mark': `<span class="o-mark"><i></i><i></i><i></i></span>`,
    'radius-tag': `<span class="o-tag">button · 6px</span>`,
    'radius-pill': `<span class="o-pill">16px</span>`,
    'radius-row': `<span class="o-row"><i></i>Radius<b>6px</b></span>`,
    'radius-card': `<span class="o-card"><b>Spacing not in your theme</b><i></i><i></i></span>`,
  };
  const corner = (name) => `<figure class="corner"><div class="stage" style="--r:${px(name)}px">${OBJ[name]}</div>
    <figcaption><b>${px(name)}px</b><code class="tok" tabindex="0">--pl-${name}</code><span>${by.get(name)?.note ?? ''}</span></figcaption></figure>`;
  const row = (name) => `<div class="tr" role="row"><span><code class="tok" tabindex="0">--pl-${name}</code></span><span class="for">${by.get(name)?.note || '—'}</span><span class="val"><code>${by.get(name)?.light ?? ''}</code></span></div>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    h2 { margin: 44px 0 6px; font: 600 20px/28px var(--pl-sans); letter-spacing: -0.01em; }
    h2 + p, .prose p { margin: 0 0 10px; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); max-width: 680px; }
    .prose b { color: var(--pl-text-primary); font-weight: 600; }
    code { font: 500 12px/1.4 var(--pl-mono); }
    .prose code { padding: 1px 5px; border-radius: 5px; background: var(--pl-bg-inset); color: var(--pl-text-primary); }
    .panel { margin-top: 14px; border-radius: 18px; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); overflow: hidden; }
    .tok { color: var(--pl-text-primary); cursor: copy; border-radius: 5px; outline: none; }
    .tok:hover, .tok:focus-visible { background: var(--pl-bg-selected); color: var(--pl-state-on-token-text); box-shadow: 0 0 0 3px var(--pl-bg-selected); }
    .tok[data-copied] { background: var(--pl-state-written-bg); color: var(--pl-state-written-text); box-shadow: 0 0 0 3px var(--pl-state-written-bg); }
    /* padding is hatched mint, a gap is striped lilac (the visual language's patterns, one meaning each) */
    .hatch { background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-mark-padding) 60%, transparent) 0 1.5px, color-mix(in oklab, var(--pl-mark-padding) 14%, transparent) 1.5px 5px); }
    .stripes { background: repeating-linear-gradient(90deg, color-mix(in oklab, var(--pl-mark-gap) 65%, transparent) 0 1.5px, color-mix(in oklab, var(--pl-mark-gap) 14%, transparent) 1.5px 4px); }

    /* ── the card ladder ── */
    .step { display: grid; grid-template-columns: 150px 52px 96px minmax(0, 1fr); gap: 14px; align-items: center; padding: 12px 18px; border-top: 1px solid var(--pl-border-default); }
    .step:first-child { border-top: 0; }
    .step b { font: 600 14px/1 var(--pl-mono); font-variant-numeric: tabular-nums; }
    .step .band { display: flex; align-items: center; height: 22px; }
    .step .band i { display: block; height: 22px; border-radius: 3px; background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-mark-padding) 70%, transparent) 0 1.5px, color-mix(in oklab, var(--pl-mark-padding) 16%, transparent) 1.5px 5px); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--pl-mark-padding) 60%, transparent); }
    .step .for { font: 400 13px/18px var(--pl-sans); color: var(--pl-text-secondary); }
    .step.off b { color: var(--pl-text-hard-coded); }
    .step.off .band i { background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-border-hard-coded) 55%, transparent) 0 1.5px, transparent 1.5px 5px); box-shadow: inset 0 0 0 1px var(--pl-border-hard-coded); }
    .scale-note { padding: 10px 18px; border-top: 1px solid var(--pl-border-default); font: 400 12px/1 var(--pl-sans); color: var(--pl-text-secondary); }

    /* ── a card, measured ── */
    .measured { display: grid; grid-template-columns: minmax(0, 360px) minmax(0, 1fr); gap: 28px; align-items: center; padding: 28px; }
    .mcard { position: relative; padding: 16px; border-radius: var(--pl-radius-card); background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card); display: grid; gap: 16px; font: var(--pl-card-body); }
    .mcard .pad { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; padding: 16px; }
    .mcard .hd { display: grid; gap: 4px; position: relative; }
    .mcard .hd b { font: var(--pl-card-title); }
    .mcard .hd span { font: var(--pl-card-meta); color: var(--pl-text-secondary); }
    .mcard .acts { display: flex; gap: 8px; position: relative; }
    .mcard .acts span { height: 28px; padding: 0 12px; display: inline-flex; align-items: center; border-radius: var(--pl-radius-tag); font: var(--pl-card-label); background: var(--pl-bg-inset); }
    .mcard .acts span:first-child { background: var(--pl-action-soft); color: var(--pl-on-action); }
    .mcard .gapmark { position: absolute; pointer-events: none; border-radius: 2px; }
    .legend { display: grid; gap: 12px; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }
    .legend div { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 12px; align-items: center; }
    .legend i { display: block; height: 18px; border-radius: 4px; }
    .legend b { color: var(--pl-text-primary); font-weight: 600; }

    /* ── the page ladder: real gaps between two blocks ── */
    .pages { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; padding: 24px; align-items: end; }
    .pstep { display: grid; justify-items: center; gap: 0; text-align: center; }
    .pstep .blk { width: 100%; height: 22px; border-radius: 6px; background: var(--pl-bg-inset); box-shadow: inset 0 0 0 1px var(--pl-border-default); }
    .pstep .gapband { display: block; width: 70%; background: repeating-linear-gradient(0deg, color-mix(in oklab, var(--pl-mark-gap) 65%, transparent) 0 1.5px, color-mix(in oklab, var(--pl-mark-gap) 14%, transparent) 1.5px 4px); }
    .pstep b { margin-top: 10px; font: 600 14px/1 var(--pl-mono); }
    .pstep code { margin-top: 4px; }
    .pstep small { margin-top: 4px; font: 400 12px/16px var(--pl-sans); color: var(--pl-text-secondary); }

    /* ── corners on their objects ── */
    .corners { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .corner { margin: 0; border-left: 1px solid var(--pl-border-default); }
    .corner:first-child { border-left: 0; }
    .corner .stage { display: grid; place-items: center; height: 120px; background: var(--pl-bg-inset); }
    .corner figcaption { display: grid; gap: 4px; padding: 12px 14px 14px; font: 400 12px/16px var(--pl-sans); color: var(--pl-text-secondary); }
    .corner figcaption b { font: 600 14px/1 var(--pl-mono); color: var(--pl-text-primary); }
    .o-mark { display: flex; align-items: flex-end; gap: 6px; height: 54px; }
    .o-mark i { width: 12px; border-radius: 0 0 0 0; border-top-left-radius: var(--r); border-top-right-radius: var(--r); background: var(--pl-sky); }
    .o-mark i:nth-child(1) { height: 26px; } .o-mark i:nth-child(2) { height: 48px; } .o-mark i:nth-child(3) { height: 36px; }
    .o-tag { padding: 4px 8px; border-radius: var(--r); background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-tag); font: var(--pl-card-label); }
    .o-pill { padding: 5px 10px; border-radius: var(--r); background: var(--pl-coral-soft); color: var(--pl-coral-ink); font: 600 12px/1 var(--pl-mono); }
    .o-row { display: flex; align-items: center; gap: 8px; width: 80%; height: 32px; padding: 0 10px; box-sizing: border-box; border-radius: var(--r); background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); font: var(--pl-card-meta); }
    .o-row i { width: 10px; height: 10px; border-radius: 3px; background: var(--pl-mint); } .o-row b { margin-left: auto; font: 600 12px/1 var(--pl-mono); }
    .o-card { display: grid; gap: 6px; width: 80%; padding: 12px; box-sizing: border-box; border-radius: var(--r); background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card); }
    .o-card b { font: var(--pl-card-label); } .o-card i { height: 6px; border-radius: 3px; background: var(--pl-bg-inset); } .o-card i:last-child { width: 60%; }

    /* ── shadows ── */
    .shadows { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    .shadow { display: grid; grid-template-rows: 150px auto; border-left: 1px solid var(--pl-border-default); }
    .shadow:first-child { border-left: 0; }
    .shadow .stage { display: grid; place-items: center; background: var(--pl-bg-page); }
    .shadow .s-tag { padding: 6px 10px; border-radius: var(--pl-radius-tag); background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-tag); font: var(--pl-card-label); }
    .shadow .s-card { width: 60%; height: 80px; border-radius: var(--pl-radius-card); background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card); }
    .shadow p { margin: 0; padding: 12px 16px 14px; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }
    .shadow p b { color: var(--pl-text-primary); }

    .tr { display: grid; grid-template-columns: minmax(170px, 1fr) minmax(0, 2fr) minmax(0, 1.2fr); gap: 14px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--pl-border-default); }
    .tr.th { border-top: 0; padding: 9px 16px; background: var(--pl-bg-inset); font: 600 11px/1 var(--pl-sans); letter-spacing: .05em; text-transform: uppercase; color: var(--pl-text-secondary); }
    .tr .for { font: 400 13px/18px var(--pl-sans); color: var(--pl-text-secondary); }
    .val code { color: var(--pl-text-secondary); overflow-wrap: anywhere; }
    .open { margin-top: 14px; padding: 14px 18px 14px 34px; border-radius: 16px; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); font: 400 13px/21px var(--pl-sans); color: var(--pl-text-secondary); }
    .open b { color: var(--pl-text-primary); font-weight: 600; }
    @media (max-width: 720px) {
      .step { grid-template-columns: 1fr auto; } .step .band { grid-column: 1 / -1; } .step .for { grid-column: 1 / -1; }
      .measured { grid-template-columns: 1fr; } .pages { grid-template-columns: 1fr 1fr; } .corners { grid-template-columns: 1fr 1fr; } .shadows { grid-template-columns: 1fr; }
      .tr { grid-template-columns: 1fr 1fr; } .tr .for { display: none; }
    }
  </style>
  <h2>How the system works</h2>
  <div class="prose">
    <p>Space comes in <b>two ladders</b>. On a card (anything the size of a card or a bar) it is a ladder of 4: 2, 4, 8, 12, 16, 20, 24, with one old 6 still in use. On a page (anything bigger) it is four big steps, 32 to 96, each a clear jump from the last. You write <code>gap: var(--pl-space-4)</code>, never <code>gap: 8px</code>.</p>
    <p><b>A corner belongs to an object, not to a size.</b> A mark has 2, a tag or key 6, a value pill 7, a row in a card 8, the card itself 12. Inside a rounded thing a corner is smaller than the one around it, so nested corners look parallel.</p>
    <p><b>Only two things are lifted:</b> a tag on your page and a card. Everything else is flat on its surface.</p>
  </div>

  <h2>On a card</h2>
  <p>Every step, drawn at three times its size and hatched like padding. The 6 is off the ladder of 4, kept only until each part moves to 4 or 8.</p>
  <div class="panel">${CARD.map(step).join('')}<div class="scale-note">Bands drawn at 3× (2px can’t be seen at its own size).</div></div>

  <h2>A card, measured</h2>
  <p>The fix bar’s card, with its space marked the way Plumber marks yours.</p>
  <div class="panel measured">
    <div class="mcard">
      <span class="pad hatch"></span>
      <div class="hd"><b>Spacing not in your theme</b><span>gap-[12px] · 3 places in your code</span></div>
      <div class="acts"><span>Use gap-3</span><span>Keep as is</span><span>Skip</span></div>
    </div>
    <div class="legend">
      <div><i class="hatch"></i><span><b>16px inset</b> (<code>--pl-space-6</code>): the card’s padding, the same on every side.</span></div>
      <div><i class="stripes"></i><span><b>16px between sections</b> (<code>--pl-space-6</code>): the heading and the actions.</span></div>
      <div><i class="stripes" style="width:14px"></i><span><b>8px between controls</b> (<code>--pl-space-4</code>): buttons side by side.</span></div>
    </div>
  </div>

  <h2>On a page</h2>
  <p>Four steps, each drawn at its own size as the gap between two blocks.</p>
  <div class="panel pages">${PAGE.map(pageStep).join('')}</div>

  <h2>Corners</h2>
  <p>Each corner on the object it belongs to.</p>
  <div class="panel corners">${RADII.map(corner).join('')}</div>

  <h2>Lifted things</h2>
  <p>Two shadows, one per thing that is lifted. In dark mode both are deeper, so a lifted thing still reads on a dark page.</p>
  <div class="panel shadows">
    <div class="shadow"><div class="stage"><span class="s-tag">button · Use gap-3</span></div><p><b>A tag on your page</b> (<code class="tok" tabindex="0">--pl-shadow-tag</code>): close to the page, a hairline and a short shadow.</p></div>
    <div class="shadow"><div class="stage"><span class="s-card"></span></div><p><b>A card</b> (<code class="tok" tabindex="0">--pl-shadow-card</code>): a hairline, a contact shadow and a long soft one.</p></div>
  </div>

  <h2>Every token</h2>
  <div class="panel" role="table"><div class="tr th" role="row"><span>Token</span><span>What it is for</span><span>Value</span></div>
    ${[...CARD, ...PAGE, 'page-inset', ...RADII, 'shadow-tag', 'shadow-card'].map(row).join('')}</div>

  <h2>What is still open</h2>
  <ul class="open">
    <li><b>The overlay hard-codes its corners.</b> Counted on 2026-11-11: the radius tokens are used about 45 times, but about 180 corners are written as numbers, many off the scale: 9px (22 times), 5px (14), 10px (10), 4px, 3px and 1px. That is the drift Plumber finds in other apps, in its own code.</li>
    <li><b>6px is the most-used gap,</b> written as a number 35 times beside the 30 uses of <code>--pl-space-3</code>, which is itself off the ladder of 4.</li>
    <li><b>Two names nobody uses.</b> <code>--pl-card-pad</code> and <code>--pl-card-gap</code> say the card’s inset and gap, but every part writes <code>--pl-space-6</code> or a number instead.</li>
    <li><b>The soft blocks’ corners aren’t tokens.</b> Cards are 28px and buttons 13 to 14px, written as numbers in the soft block and the button.</li>
    <li><b>A tag (6) and a pill (7) are a pixel apart,</b> too close to tell, and could be one step.</li>
  </ul>`;

  // the measured card's gaps, drawn where they really are: between its heading and its actions, and between each two
  // buttons (measured, so they stay right when the tokens change)
  const card = root.querySelector('.mcard');
  const mark = () => {
    for (const g of card.querySelectorAll('.gapmark')) g.remove();
    const c = card.getBoundingClientRect(), hd = card.querySelector('.hd').getBoundingClientRect(), acts = card.querySelector('.acts'), a = acts.getBoundingClientRect();
    const add = (x, y, w, h) => card.insertAdjacentHTML('beforeend', `<i class="gapmark stripes" style="left:${x - c.left}px;top:${y - c.top}px;width:${w}px;height:${h}px"></i>`);
    add(hd.left, hd.bottom, hd.width, a.top - hd.bottom);
    const bs = [...acts.children].map((b) => b.getBoundingClientRect());
    for (let i = 1; i < bs.length; i++) add(bs[i - 1].right, bs[i].top, bs[i].left - bs[i - 1].right, bs[i].height);
  };
  new ResizeObserver(mark).observe(card); mark();
  const copy = (el) => { navigator.clipboard?.writeText(el.textContent).catch(() => {}); el.setAttribute('data-copied', ''); setTimeout(() => el.removeAttribute('data-copied'), 900); };
  root.addEventListener('click', (e) => { const t = e.target.closest('.tok'); if (t) copy(t); });
  root.addEventListener('keydown', (e) => { const t = e.target.closest?.('.tok'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); copy(t); } });
  void host;
}
