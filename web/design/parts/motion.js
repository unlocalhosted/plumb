// The design site's page for motion: what it draws inside its host. Each moment is one row: the real piece doing it on
// the left (point at it, or press Play, and it plays both ways), and on the right its curve, drawn from the token
// itself with drafting guides, a dot tracing the curve in step with the piece. Curves are read from the token file.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';
import { probe } from '../tokens.js';

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
const at = (pts, t) => { for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0 || 1); } return 1; };

export function mount(host, root, css) {
  const value = probe(css, 'light');

  // the moments, one row each; `ms` is what the product writes today (a token name, or a number when it has none)
  const MOMENTS = [
    { id: 'picked', name: 'Picked up', says: 'Pointed at, a piece tips a few degrees and grows, then settles a little past where it stops.',
      curve: 'spring-pop', ms: 420, msToken: null, piece: 'toy',
      what: 'The big toy turns 9° and grows to 114%; a small one leans the other way.' },
  ];

  // a curve, drawn with its guides: the rest line, the line it ends on, the peak it overshoots to, and the time axis
  const W = 360, H = 170, L = 44, R = 16, T = 22, B = 34;
  const graph = (m) => {
    const pts = linearPoints(value(`--pl-${m.curve}`)), peak = Math.max(...pts.map(([, v]) => v));
    const lo = 0, hi = Math.max(1.08, peak + 0.04);
    const x = (t) => L + t * (W - L - R), y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const tp = pts.find(([, v]) => v === peak)[0];
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
      <text class="gl" x="${W - R}" y="${H - 12}" text-anchor="end">${m.ms}ms</text>
      <path class="line" d="${path}"/>
      <line class="head" x1="${L}" y1="${T - 6}" x2="${L}" y2="${y(0)}"/>
      <circle class="dot" cx="${x(0)}" cy="${y(0)}" r="5"/>
    </svg>`;
  };

  const piece = (m) => m.piece === 'toy' ? `<div class="stage toy" tabindex="0" aria-label="${m.name}: point at it to play">
      <i class="big">${toyOf('padding')}</i><i class="sm">${toyOf('gap')}</i></div>` : '';

  const row = (m) => `<section class="moment" data-id="${m.id}">
    <div class="side">${piece(m)}<button class="play" type="button">Play</button></div>
    <div class="body">
      <header><h3>${m.name}</h3><p>${m.says}</p></header>
      ${graph(m)}
      <dl>
        <div><dt>Curve</dt><dd><code class="tok" tabindex="0">--pl-${m.curve}</code></dd></div>
        <div><dt>Time</dt><dd>${m.msToken ? `<code class="tok" tabindex="0">--pl-${m.msToken}</code> ` : ''}<b>${m.ms}ms</b>${m.msToken ? '' : '<span class="hc">written as a number</span>'}</dd></div>
        <div class="wide"><dt>What moves</dt><dd>${m.what}</dd></div>
      </dl>
    </div></section>`;

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

    /* ── a moment: the piece on the left, its curve on the right ── */
    .moment { display: grid; grid-template-columns: 220px minmax(0, 1fr); border-top: 1px solid var(--pl-border-default); }
    .moment:first-child { border-top: 0; }
    .side { display: grid; place-items: center; align-content: center; gap: 14px; padding: 24px 16px; background: var(--pl-bg-inset); }
    .play { font: 600 12px/1 var(--pl-sans); color: var(--pl-text-secondary); background: none; border: 0; padding: 6px 10px; border-radius: var(--pl-radius-tag); cursor: pointer; }
    .play:hover, .play:focus-visible { color: var(--pl-text-primary); background: var(--pl-bg-surface); outline: none; }
    .body { display: grid; gap: 12px; padding: 20px 22px 20px; }
    .body h3 { margin: 0; font: 600 16px/22px var(--pl-sans); }
    .body header p { margin: 2px 0 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); max-width: 520px; }
    dl { margin: 0; display: grid; grid-template-columns: auto auto; justify-content: start; gap: 6px 28px; }
    dl div { display: grid; gap: 3px; } dl .wide { grid-column: 1 / -1; }
    dt { font: 600 11px/1 var(--pl-sans); letter-spacing: .05em; text-transform: uppercase; color: var(--pl-text-secondary); }
    dd { margin: 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }
    dd b { font: 600 13px/1 var(--pl-mono); color: var(--pl-text-primary); }
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
    @media (prefers-reduced-motion: reduce) { .stage.toy i { transition: none; } }
    @media (max-width: 720px) { .moment { grid-template-columns: 1fr; } }
  </style>${TOY_DEFS}
  <h2>How the system works</h2>
  <div class="prose">
    <p>Pieces behave like <b>objects with a little weight</b>. A thing that moves moves as one body; a small thing is quicker and stiffer than a big one; any motion can be stopped from where it is. Under reduced motion nothing moves; states change at once.</p>
    <p>Each moment below is the real piece doing it, next to its curve, drawn from the token. Point at a piece, or press Play: the dot runs along the curve in step with it.</p>
  </div>
  <h2>Moments</h2>
  <div class="panel">${MOMENTS.map(row).join('')}</div>`;

  // playing a moment: the piece changes state, and the dot follows the curve for the same time, there and back
  for (const m of MOMENTS) {
    const el = root.querySelector(`.moment[data-id="${m.id}"]`), stage = el.querySelector('.stage'), dot = el.querySelector('.dot'), head = el.querySelector('.head');
    const pts = linearPoints(value(`--pl-${m.curve}`)), peak = Math.max(...pts.map(([, v]) => v)), hi = Math.max(1.08, peak + 0.04);
    const x = (t) => L + t * (W - L - R), y = (v) => T + (1 - v / hi) * (H - T - B);
    stage.style.setProperty('--ms', `${m.ms}ms`);
    let raf = 0;
    const set = (up) => {
      if (up === stage.hasAttribute('data-up')) return;
      stage.toggleAttribute('data-up', up);
      cancelAnimationFrame(raf);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { dot.setAttribute('cx', x(1)); dot.setAttribute('cy', y(up ? 1 : 0)); return; }
      const t0 = performance.now(); el.setAttribute('data-playing', '');
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / m.ms), v = at(pts, t);
        dot.setAttribute('cx', x(t)); dot.setAttribute('cy', y(up ? v : 1 - v));
        head.setAttribute('x1', x(t)); head.setAttribute('x2', x(t));
        if (t < 1) raf = requestAnimationFrame(tick);
        else { el.removeAttribute('data-playing'); if (!up) { dot.setAttribute('cx', x(0)); dot.setAttribute('cy', y(0)); } }
      };
      raf = requestAnimationFrame(tick);
    };
    stage.addEventListener('pointerenter', () => set(true));
    stage.addEventListener('pointerleave', () => set(false));
    stage.addEventListener('focus', () => set(true));
    stage.addEventListener('blur', () => set(false));
    el.querySelector('.play').addEventListener('click', () => { set(true); setTimeout(() => set(false), m.ms + 500); });
  }

  const copy = (el) => { navigator.clipboard?.writeText(el.textContent).catch(() => {}); el.setAttribute('data-copied', ''); setTimeout(() => el.removeAttribute('data-copied'), 900); };
  root.addEventListener('click', (e) => { const t = e.target.closest('.tok'); if (t) copy(t); });
  root.addEventListener('keydown', (e) => { const t = e.target.closest?.('.tok'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); copy(t); } });
  void host;
}
