// The design site's page for motion: what it draws inside its host. Each moment is one row: the real piece doing it on
// the left (point at it, or press Play, and it plays both ways), and on the right its curve, drawn from the token
// itself with drafting guides, a dot tracing the curve in step with the piece. Curves are read from the token file.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';
import { probe } from '../tokens.js';
import { SCALE_CSS, count, rollCount } from '../../../overlay/src/scale-marks.js';

// a CSS linear() easing as points [t, v], t and v from 0 to 1 (stops without a place are spread between their
// neighbours, as the browser does)
export function linearPoints(value) {
  const inner = value.trim().replace(/^linear\(|\)$/g, '');
  const stops = inner.split(',').map((s) => s.trim().split(/\s+/)).map(([v, at]) => [at ? parseFloat(at) / 100 : null, parseFloat(v)]);
  if (stops[0][0] == null) stops[0][0] = 0;
  if (stops.at(-1)[0] == null) stops.at(-1)[0] = 1;
  for (let i = 1; i < stops.length - 1; i++) if (stops[i][0] == null) {
    let j = i; while (stops[j][0] == null) j++;
    const a = stops[i - 1][0], b = stops[j][0];
    for (let k = i; k < j; k++) stops[k][0] = a + ((b - a) * (k - i + 1)) / (j - i + 1);
  }
  return stops;
}
// a cubic-bezier() easing as points, sampled along its time
export function bezierPoints(value) {
  const [x1, y1, x2, y2] = value.match(/-?[\d.]+/g).map(Number);
  const b = (a, c, u) => 3 * a * u * (1 - u) ** 2 + 3 * c * u * u * (1 - u) + u ** 3;
  return Array.from({ length: 61 }, (_, i) => i / 60).map((u) => [b(x1, x2, u), b(y1, y2, u)]);
}
export const curvePoints = (value) => (/^\s*cubic-bezier/.test(value) ? bezierPoints(value) : linearPoints(value));
const at = (pts, t) => { for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0 || 1); } return 1; };

export function mount(host, root, css) {
  const value = probe(css, 'light');
  const px = (name) => parseFloat(value(`--pl-${name}`));

  // the moments, one row each; `ms` is what the product writes today (a token name, or a number when it has none)
  const MOMENTS = [
    { id: 'picked', name: 'Picked up', says: 'Pointed at, a piece tips a few degrees and grows, then settles a little past where it stops.',
      curve: 'spring-pop', ms: 420, piece: 'toy', hover: true,
      what: 'The big toy turns 9° and grows to 114%; a small one leans the other way.' },
    { id: 'arrives', name: 'Arrives', says: 'Something new on screen pops in: it fades up from 92% and lands a little past its size.',
      curve: 'spring-pop', ms: 260, piece: 'arrive',
      what: 'Opacity 0 to 1 and scale 92% to 100%, the <code>.pl-pop</code> rule. Also written as 200ms and 320ms in places.' },
    { id: 'lands', name: 'Lands', says: 'When something is written, the pieces click in one after another, not all at once.',
      curve: 'spring-pop', ms: 320, stagger: 'stagger', piece: 'lands',
      what: 'Each piece pops in 40ms after the one before; a long list shares 400ms so it never drags.' },
    { id: 'rolls', name: 'Numbers roll', says: 'A count rolls to its new value, each digit on its own wheel. It never swaps.',
      curve: 'spring', ms: 520, piece: 'roll',
      what: 'Each digit is a column of 0 to 9 that slides to its value; the spring settles with under 2% past.' },
    { id: 'card', name: 'A card opens', says: 'A card comes up from just below where it sits, fast at first and easing in.',
      curve: 'ease-out', ms: 180, msToken: 'dur-card', piece: 'card',
      what: 'Opacity 0 to 1, up 6px, and from 98.5% of its size.' },
    { id: 'travel', name: 'Selection travels', says: 'The current choice slides to the next one as one piece, rather than one fading out and another in.',
      curve: 'spring', ms: 220, msToken: 'dur-travel', piece: 'travel',
      what: 'One fill moves and stretches to the next option; the words stay where they are.' },
  ];

  // a curve, drawn with its guides: the rest line, the line it ends on, the peak it overshoots to, and the time axis
  const W = 360, H = 170, L = 44, R = 16, T = 22, B = 34;
  const graph = (m) => {
    const pts = curvePoints(value(`--pl-${m.curve}`)), peak = Math.max(...pts.map(([, v]) => v));
    const lo = 0, hi = Math.max(1.08, peak + 0.04);
    const x = (t) => L + t * (W - L - R), y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const tp = pts.find(([, v]) => v === peak)[0] * (m.stagger ? m.ms / (m.ms + 2 * px(m.stagger)) : 1);
    const path = pts.map(([t, v], i) => `${i ? 'L' : 'M'} ${x(t).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const over = Math.round((peak - 1) * 100);
    return `<svg class="curve" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <line class="axis" x1="${L}" y1="${y(0)}" x2="${W - R}" y2="${y(0)}"/>
      <line class="axis" x1="${L}" y1="${T - 6}" x2="${L}" y2="${y(0)}"/>
      <line class="guide" x1="${L}" y1="${y(1)}" x2="${W - R}" y2="${y(1)}"/>
      ${over > 0 ? `<line class="guide peak" x1="${x(tp)}" y1="${y(peak)}" x2="${W - R}" y2="${y(peak)}"/>
        <line class="guide" x1="${x(tp)}" y1="${y(peak)}" x2="${x(tp)}" y2="${y(0)}"/>
        <text class="gl" x="${W - R}" y="${y(peak) - 6}" text-anchor="end">past by ${over}%</text>` : ''}
      <text class="gl" x="${L - 8}" y="${y(1) + 4}" text-anchor="end">end</text>
      <text class="gl" x="${L - 8}" y="${y(0) + 4}" text-anchor="end">start</text>
      <text class="gl" x="${L}" y="${H - 12}">0</text>
      <text class="gl" x="${W - R}" y="${H - 12}" text-anchor="end">${m.stagger ? m.ms + 2 * px(m.stagger) : m.ms}ms</text>
      ${m.stagger ? [2, 1].map((k) => { const off = (k * px(m.stagger)) / (m.ms + 2 * px(m.stagger)); const sc = m.ms / (m.ms + 2 * px(m.stagger));
        return `<path class="line ghost" d="${pts.map(([t, v], i) => `${i ? 'L' : 'M'} ${x(off + t * sc).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')}"/>`; }).join('') : ''}
      <path class="line" d="${m.stagger ? pts.map(([t, v], i) => `${i ? 'L' : 'M'} ${x(t * m.ms / (m.ms + 2 * px(m.stagger))).toFixed(1)} ${y(v).toFixed(1)}`).join(' ') : path}"/>
      <line class="head" x1="${L}" y1="${T - 6}" x2="${L}" y2="${y(0)}"/>
      <circle class="dot" cx="${x(0)}" cy="${y(0)}" r="5"/>
    </svg>`;
  };

  const PIECES = {
    toy: () => `<div class="stage toy" tabindex="0" aria-label="Picked up: point at it to play"><i class="big">${toyOf('padding')}</i><i class="sm">${toyOf('gap')}</i></div>`,
    arrive: () => `<div class="stage arrive"><span class="chip">Use <b>gap-3</b></span></div>`,
    lands: () => `<div class="stage lands">${['padding', 'gap', 'corner'].map((n) => `<i>${toyOf(n)}</i>`).join('')}</div>`,
    roll: () => `<div class="stage roll"><span class="sc-count-demo">${count(128, 'on the scale')}</span></div>`,
    card: () => `<div class="stage card"><div class="mini"><b>Padding</b><span>16px, on the scale</span></div></div>`,
    travel: () => `<div class="stage travel"><span class="seg"><i class="fill"></i><span>Body</span><span>Title</span><span>Label</span></span></div>`,
  };
  const piece = (m) => PIECES[m.piece]();

  const row = (m) => `<section class="moment" data-id="${m.id}">
    <div class="side">${piece(m)}<button class="play" type="button">Play</button></div>
    <div class="body">
      <header><h3>${m.name}</h3><p>${m.says}</p></header>
      ${graph(m)}
      <dl>
        <div><dt>Curve</dt><dd><code class="tok" tabindex="0">--pl-${m.curve}</code></dd></div>
        <div><dt>Time</dt><dd>${m.msToken ? `<code class="tok" tabindex="0">--pl-${m.msToken}</code> ` : ''}<b>${m.ms}ms</b>${m.msToken ? '' : '<span class="hc">written as a number</span>'}</dd></div>
        ${m.stagger ? `<div><dt>Apart</dt><dd><code class="tok" tabindex="0">--pl-${m.stagger}</code> <b>${px(m.stagger)}ms</b></dd></div>` : ''}
        <div class="wide"><dt>What moves</dt><dd>${m.what}</dd></div>
      </dl>
    </div></section>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${SCALE_CSS}
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

    /* ── a moment: the piece on the left, its curve on the right ── */
    .moment { display: grid; grid-template-columns: 220px minmax(0, 1fr); border-top: 1px solid var(--pl-border-default); }
    .moment:first-child { border-top: 0; }
    .side { display: grid; place-items: center; align-content: center; gap: 14px; padding: 24px 16px; background: var(--pl-bg-inset); }
    .play { font: 600 12px/1 var(--pl-sans); color: var(--pl-text-secondary); background: none; border: 0; padding: 6px 10px; border-radius: var(--pl-radius-tag); cursor: pointer; }
    .play:hover, .play:focus-visible { color: var(--pl-text-primary); background: var(--pl-bg-surface); outline: none; }
    .body { display: grid; gap: 12px; padding: 20px 22px 20px; }
    .body h3 { margin: 0; font: 600 16px/22px var(--pl-sans); }
    .body header p { margin: 2px 0 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); max-width: 520px; }
    dl { margin: 0; display: grid; grid-template-columns: auto auto auto; justify-content: start; gap: 6px 28px; }
    dl div { display: grid; gap: 3px; } dl .wide { grid-column: 1 / -1; }
    dt { font: 600 11px/1 var(--pl-sans); letter-spacing: .05em; text-transform: uppercase; color: var(--pl-text-secondary); }
    dd { margin: 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }
    dd b { font: 600 13px/1 var(--pl-mono); color: var(--pl-text-primary); }
    dd code + b { margin-left: 8px; }
    .hc { margin-left: 8px; font: 500 12px/1 var(--pl-sans); color: var(--pl-text-hard-coded); }

    /* the curve, with its guides */
    .curve { width: 100%; max-width: 420px; height: auto; overflow: visible; }
    .curve .axis { stroke: var(--pl-border-strong); stroke-width: 1; }
    .curve .guide { stroke: var(--pl-text-secondary); stroke-width: 1; stroke-dasharray: 3 3; opacity: .55; }
    .curve .guide.peak { stroke: var(--pl-border-focus); opacity: .8; }
    .curve .gl { font: 500 11px/1 var(--pl-mono); fill: var(--pl-text-secondary); paint-order: stroke; stroke: var(--pl-bg-surface); stroke-width: 4px; }
    .curve .line { fill: none; stroke: var(--pl-border-focus); stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
    .curve .head { stroke: var(--pl-border-focus); stroke-width: 1; opacity: 0; }
    .curve .dot { fill: var(--pl-bg-surface); stroke: var(--pl-border-focus); stroke-width: 2.5; }
    .moment[data-playing] .curve .head { opacity: .45; }

    /* picked up: the real rule from the icons page, played by a class so Play and pointing do the same thing */
    .stage.toy { position: relative; display: flex; align-items: flex-end; gap: 12px; padding: 22px 26px 18px; border-radius: 14px; background: var(--pl-bg-surface); outline: none; cursor: default; }
    .stage.toy i { display: block; flex: none; transform-origin: 50% 80%; transition: rotate var(--ms) var(--pl-spring-pop), scale var(--ms) var(--pl-spring-pop); }
    .stage.toy svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .stage.toy .big { width: 64px; height: 64px; } .stage.toy .sm { width: 24px; height: 24px; }
    .stage.toy[data-up] .big { rotate: -9deg; scale: 1.14; }
    .stage.toy[data-up] .sm { rotate: -5deg; }
    .stage.toy:focus-visible { box-shadow: 0 0 0 2px var(--pl-border-focus); }
    .curve .line.ghost { stroke-width: 1.5; opacity: .45; }
    .stage { min-height: 96px; display: grid; place-items: center; }
    .stage.arrive .chip, .stage.card .mini { box-shadow: var(--pl-shadow-tag); }
    .chip { display: inline-flex; gap: 5px; align-items: center; height: 28px; padding: 0 12px; border-radius: var(--pl-radius-pill); background: var(--pl-bg-surface); font: 500 13px/1 var(--pl-sans); color: var(--pl-text-secondary); }
    .chip b { color: var(--pl-text-primary); font-weight: 600; }
    .stage[data-go] .chip { animation: pl-pop var(--ms) var(--pl-spring-pop) both; }
    .stage.lands { display: flex; gap: 10px; }
    .stage.lands i { display: block; width: 36px; height: 36px; } .stage.lands svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .stage.lands[data-go] i { animation: pl-pop var(--ms) var(--pl-spring-pop) both; }
    .stage.lands[data-go] i:nth-child(2) { animation-delay: var(--pl-stagger); }
    .stage.lands[data-go] i:nth-child(3) { animation-delay: calc(2 * var(--pl-stagger)); }
    .stage.roll .sc-count { display: grid; justify-items: center; gap: 6px; }
    .stage.roll .say { font: 500 12px/1 var(--pl-sans); color: var(--pl-text-secondary); }
    .stage.card .mini { display: grid; gap: 3px; width: 150px; padding: 12px 14px; border-radius: var(--pl-radius-card); background: var(--pl-bg-surface);
      transition: opacity var(--pl-dur-card) var(--pl-ease-out), transform var(--pl-dur-card) var(--pl-ease-out); transform-origin: 50% 100%; }
    .stage.card .mini b { font: var(--pl-card-title); } .stage.card .mini span { font: var(--pl-card-meta); color: var(--pl-text-secondary); }
    .stage.card[data-hide] .mini { opacity: 0; transform: translateY(6px) scale(.985); transition: none; }
    .seg { position: relative; display: inline-flex; padding: 3px; border-radius: var(--pl-radius-row); background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); }
    .seg > span { position: relative; z-index: 1; display: grid; place-items: center; height: 26px; padding: 0 10px; font: 500 12px/1 var(--pl-sans); color: var(--pl-text-secondary); transition: color var(--pl-dur-travel); }
    .seg > span[data-on] { color: var(--pl-text-primary); }
    .seg .fill { position: absolute; z-index: 0; top: 3px; left: 0; height: 26px; border-radius: var(--pl-radius-tag); background: var(--pl-bg-selected);
      transition: translate var(--pl-dur-travel) var(--pl-spring), width var(--pl-dur-travel) var(--pl-spring); }
    @media (prefers-reduced-motion: reduce) { .stage.toy i, .stage.card .mini, .seg .fill { transition: none; } .stage[data-go] .chip, .stage.lands[data-go] i { animation: none; } }
    @media (max-width: 720px) { .moment { grid-template-columns: 1fr; } }
  </style>${TOY_DEFS}
  <h2>How the system works</h2>
  <div class="prose">
    <p>Pieces behave like <b>objects with a little weight</b>. A thing that moves moves as one body; a small thing is quicker and stiffer than a big one; any motion can be stopped from where it is. Under reduced motion nothing moves; states change at once.</p>
    <p>Each moment below is the real piece doing it, next to its curve, drawn from the token. Point at a piece, or press Play: the dot runs along the curve in step with it.</p>
  </div>
  <h2>Moments</h2>
  <div class="panel">${MOMENTS.map(row).join('')}</div>`;

  // playing a moment: the piece moves, and the dot follows the curve for the same time (the toy goes there and back)
  for (const m of MOMENTS) {
    const el = root.querySelector(`.moment[data-id="${m.id}"]`), stage = el.querySelector('.stage'), dot = el.querySelector('.dot'), head = el.querySelector('.head');
    const pts = curvePoints(value(`--pl-${m.curve}`)), peak = Math.max(...pts.map(([, v]) => v)), hi = Math.max(1.08, peak + 0.04);
    const total = m.stagger ? m.ms + 2 * px(m.stagger) : m.ms, sc = m.ms / total;
    const x = (t) => L + t * (W - L - R), y = (v) => T + (1 - v / hi) * (H - T - B);
    stage.style.setProperty('--ms', `${m.ms}ms`);
    const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const trace = (up) => {
      cancelAnimationFrame(raf);
      if (reduce()) { dot.setAttribute('cx', x(up ? 1 : 0)); dot.setAttribute('cy', y(up ? 1 : 0)); return; }
      const t0 = performance.now(); el.setAttribute('data-playing', '');
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / total), v = at(pts, Math.min(1, t / sc));
        dot.setAttribute('cx', x(t)); dot.setAttribute('cy', y(up ? v : 1 - v));
        head.setAttribute('x1', x(t)); head.setAttribute('x2', x(t));
        if (t < 1) raf = requestAnimationFrame(tick);
        else { el.removeAttribute('data-playing'); if (!up) { dot.setAttribute('cx', x(0)); dot.setAttribute('cy', y(0)); } }
      };
      raf = requestAnimationFrame(tick);
    };
    let n = 128, pick = 0;
    const seg = stage.querySelector('.seg');
    const place = () => { const opts = seg.querySelectorAll(':scope > span'), o = opts[pick], f = seg.querySelector('.fill');
      opts.forEach((s, i) => s.toggleAttribute('data-on', i === pick)); f.style.width = `${o.offsetWidth}px`; f.style.translate = `${o.offsetLeft}px 0`; };
    if (seg) requestAnimationFrame(place);
    const run = () => {
      if (m.piece === 'arrive' || m.piece === 'lands') { stage.removeAttribute('data-go'); void stage.offsetWidth; stage.setAttribute('data-go', ''); }
      if (m.piece === 'roll') { n = n === 128 ? 1406 : 128; rollCount(stage.querySelector('.sc-count'), n); }
      if (m.piece === 'card') { stage.setAttribute('data-hide', ''); void stage.offsetWidth; stage.removeAttribute('data-hide'); }
      if (m.piece === 'travel') { pick = (pick + 1) % 3; place(); }
      trace(true);
    };
    if (m.hover) {
      const set = (up) => { if (up === stage.hasAttribute('data-up')) return; stage.toggleAttribute('data-up', up); trace(up); };
      stage.addEventListener('pointerenter', () => set(true));
      stage.addEventListener('pointerleave', () => set(false));
      stage.addEventListener('focus', () => set(true));
      stage.addEventListener('blur', () => set(false));
      el.querySelector('.play').addEventListener('click', () => { set(true); setTimeout(() => set(false), m.ms + 500); });
    } else {
      stage.addEventListener('pointerenter', run);
      el.querySelector('.play').addEventListener('click', run);
    }
  }

  const copy = (el) => { navigator.clipboard?.writeText(el.textContent).catch(() => {}); el.setAttribute('data-copied', ''); setTimeout(() => el.removeAttribute('data-copied'), 900); };
  root.addEventListener('click', (e) => { const t = e.target.closest('.tok'); if (t) copy(t); });
  root.addEventListener('keydown', (e) => { const t = e.target.closest?.('.tok'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); copy(t); } });
  void host;
}
