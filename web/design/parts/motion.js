// The design site's page for motion: what it draws inside its host. Each moment is one row: the real piece doing it on
// the left (point at it, or press Play, and it plays both ways), and on the right its curve, drawn from the token
// itself with drafting guides, a dot tracing the curve in step with the piece. Curves are read from the token file.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';
import { readTokens, probe } from '../tokens.js';
import { spring, DETENT, SETTLE } from '../../../overlay/src/motion.js';
import { SOFT_CSS, soften, feel, BEATS, LAUNCH } from '../../../overlay/src/soft.js';
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
// a physics spring's step from 0 to 1, run with the overlay's own step function until it rests; the points are on
// its own time, and `ms` is how long it took
export function springPoints(sp) {
  const p = { x: 0, y: 0, vx: 0, vy: 0 }, dt = 1 / 600, raw = [[0, 0]];
  let n = 0; while (n < 6000) { spring(p, 1, 0, sp, dt); n++; raw.push([n * dt, p.x]); if (Math.abs(p.x - 1) < 0.002 && Math.abs(p.vx) < 0.02) break; }
  const end = n * dt; return { ms: Math.round(end * 1000), pts: raw.filter((_, i) => i % 4 === 0 || i === raw.length - 1).map(([t, v]) => [t / end, v]) };
}
const at = (pts, t) => { for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0 || 1); } return 1; };

export function mount(host, root, css) {
  const value = probe(css, 'light');
  const px = (name) => parseFloat(value(`--pl-${name}`));
  const tokens = readTokens(css), by = new Map(tokens.map((t) => [t.name, t]));
  const MOTION = ['ease-out', 'spring', 'spring-pop', 'dur-feedback', 'dur-drop', 'dur-card', 'dur-travel', 'dur-build', 'dur-arrive', 'stagger', 'dur-dim', 'dur-undim'];
  const trow = (name) => `<div class="tr" role="row"><span><code class="tok" tabindex="0">--pl-${name}</code></span><span class="for">${by.get(name)?.note || '—'}</span><span class="val"><code>${by.get(name)?.light ?? ''}</code></span></div>`;

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
    { id: 'pulled', name: 'Pulled into a step', says: 'Let go of something you drag and it springs onto the nearest step. It never stops between steps. Drag the knob.',
      physics: DETENT, ghost: SETTLE, piece: 'detent',
      what: 'A real spring, run a frame at a time, so a new pull starts from wherever it is. A mark coming home uses a softer one, drawn faint.' },
    { id: 'pressed', name: 'Pressed', says: 'A soft block goes down under the finger, and on letting go springs past its rest and back as one body. A smaller thing is stiffer: it rises less and settles sooner. Press either one.',
      piece: 'press', custom: true,
      what: 'The top squashes onto its side; let go, it rises past its rest, dips under it, and settles. How far and how long is worked out from its height: a card about 190px tall is the reference.' },
  ];
  for (const m of MOMENTS) if (m.physics) { m.sim = springPoints(m.physics); m.ms = m.sim.ms; }

  // a curve, drawn with its guides: the rest line, the line it ends on, the peak it overshoots to, and the time axis
  const W = 360, H = 170, L = 44, R = 16, T = 22, B = 34;
  const ptsOf = (m) => (m.physics ? m.sim.pts : curvePoints(value(`--pl-${m.curve}`)));
  const graph = (m) => {
    const pts = ptsOf(m), peak = Math.max(...pts.map(([, v]) => v));
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
      ${m.ghost ? (() => { const g = springPoints(m.ghost), sc = g.ms / m.ms; return `<path class="line ghost" d="${g.pts.map(([t, v], i) => `${i ? 'L' : 'M'} ${x(Math.min(1, t * sc)).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')}"/>`; })() : ''}
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
    press: () => `<div class="stage press"><a class="s-box" data-hue="mint" href="#" onclick="return false"><span class="in"><span class="plate"><i class="toy">${toyOf('padding')}</i></span><b>Padding</b><em>16px, on the scale</em></span></a>
      <button class="s-btn" type="button"><span>Write</span></button></div>`,
    detent: () => `<div class="stage detent"><span class="track">${[0, 1, 2, 3, 4].map((i) => `<i class="tick" style="left:${i * 25}%"></i>`).join('')}<span class="knob" tabindex="0" role="slider" aria-label="Drag to a step" aria-valuemin="0" aria-valuemax="4" aria-valuenow="1"></span></span></div>`,
    travel: () => `<div class="stage travel"><span class="seg"><i class="fill"></i><span>Body</span><span>Title</span><span>Label</span></span></div>`,
  };
  const piece = (m) => PIECES[m.piece]();

  const row = (m) => `<section class="moment" data-id="${m.id}">
    <div class="side">${piece(m)}<button class="play" type="button">Play</button></div>
    <div class="body">
      <header><h3>${m.name}</h3><p>${m.says}</p></header>
      ${m.custom ? `<svg class="curve press" viewBox="0 0 ${W} ${H}" aria-hidden="true"></svg>` : graph(m)}
      <dl>
        ${m.custom ? `<div><dt>Spring</dt><dd><b>from its height</b><span class="hc quiet">in code, not a token</span></dd></div><div><dt>Time</dt><dd class="press-ms"></dd></div>` : m.physics ? `<div><dt>Spring</dt><dd><b>k ${m.physics.k}, c ${m.physics.c}</b><span class="hc quiet">in code, not a token</span></dd></div>
        <div><dt>Time</dt><dd>rests in about <b>${m.ms}ms</b></dd></div>` : `<div><dt>Curve</dt><dd><code class="tok" tabindex="0">--pl-${m.curve}</code></dd></div>
        <div><dt>Time</dt><dd>${m.msToken ? `<code class="tok" tabindex="0">--pl-${m.msToken}</code> ` : ''}<b>${m.ms}ms</b>${m.msToken ? '' : '<span class="hc">written as a number</span>'}</dd></div>`}
        ${m.custom ? '' : ''}${m.stagger ? `<div><dt>Apart</dt><dd><code class="tok" tabindex="0">--pl-${m.stagger}</code> <b>${px(m.stagger)}ms</b></dd></div>` : ''}
        <div class="wide"><dt>What moves</dt><dd>${m.what}</dd></div>
      </dl>
    </div></section>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${SCALE_CSS}${SOFT_CSS}
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
    .stage.detent { width: 100%; padding: 0 8px; }
    .track { position: relative; display: block; width: 100%; height: 4px; border-radius: 2px; background: var(--pl-border-default); touch-action: none; }
    .track .tick { position: absolute; top: -4px; width: 2px; height: 12px; margin-left: -1px; border-radius: 1px; background: var(--pl-border-strong); }
    .track .knob { position: absolute; top: 50%; left: 0; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; background: var(--pl-bg-surface);
      box-shadow: var(--pl-shadow-tag), inset 0 0 0 2px var(--pl-border-focus); cursor: grab; outline: none; }
    .track .knob:focus-visible { box-shadow: var(--pl-shadow-tag), inset 0 0 0 2px var(--pl-border-focus), 0 0 0 4px var(--pl-bg-selected); }
    .track .knob[data-held] { cursor: grabbing; }
    .hc.quiet { color: var(--pl-text-secondary); }
    .stage.press { display: flex; flex-direction: column; align-items: center; gap: 18px; width: 100%; }
    .stage.press .s-box { width: 168px; }
    .stage.press .toy { display: block; width: 40px; height: 40px; } .stage.press .toy svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .curve .line.btn { stroke: var(--pl-pink-block); }
    .curve .dot.btn { stroke: var(--pl-pink-block); }
    .press-ms .pm { display: block; } .press-ms .pm b { margin: 0; }
    .curve .tag { font: 600 11px/1 var(--pl-sans); paint-order: stroke; stroke: var(--pl-bg-surface); stroke-width: 4px; }
    .tr { display: grid; grid-template-columns: minmax(150px, 1fr) minmax(0, 2fr) minmax(0, 1.4fr); gap: 14px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--pl-border-default); }
    .tr.th { border-top: 0; padding: 9px 16px; background: var(--pl-bg-inset); font: 600 11px/1 var(--pl-sans); letter-spacing: .05em; text-transform: uppercase; color: var(--pl-text-secondary); }
    .tr .for { font: 400 13px/18px var(--pl-sans); color: var(--pl-text-secondary); }
    .val code { color: var(--pl-text-secondary); overflow-wrap: anywhere; font-size: 11px; }
    .open { margin-top: 14px; padding: 14px 18px 14px 34px; border-radius: 16px; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); font: 400 13px/21px var(--pl-sans); color: var(--pl-text-secondary); }
    .open li + li { margin-top: 6px; } .open b { color: var(--pl-text-primary); font-weight: 600; }
    @media (prefers-reduced-motion: reduce) { .stage.toy i, .stage.card .mini, .seg .fill { transition: none; } .stage[data-go] .chip, .stage.lands[data-go] i { animation: none; } }
    @media (max-width: 720px) { .moment { grid-template-columns: 1fr; } }
  </style>${TOY_DEFS}
  <h2>How the system works</h2>
  <div class="prose">
    <p>Pieces behave like <b>objects with a little weight</b>. A thing that moves moves as one body; a small thing is quicker and stiffer than a big one; any motion can be stopped from where it is. Under reduced motion nothing moves; states change at once.</p>
    <p>Each moment below is the real piece doing it, next to its curve, drawn from the token. Point at a piece, or press Play: the dot runs along the curve in step with it.</p>
  </div>
  <h2>Moments</h2>
  <div class="panel">${MOMENTS.map(row).join('')}</div>

  <h2>Every token</h2>
  <div class="panel" role="table"><div class="tr th" role="row"><span>Token</span><span>What it is for</span><span>Value</span></div>${MOTION.filter((n) => by.has(n)).map(trow).join('')}</div>

  <h2>What is still open</h2>
  <ul class="open">
    <li><b>The overlay writes its times as numbers.</b> Counted on 2026-11-11: the time tokens are used 71 times, but 161 times in its transitions and animations are written as numbers, across 20 files: 120ms (34 times), 200ms (24), 160ms (15), 260ms (12), 140ms (11), 320ms (9). Four of the moments above have no time token at all.</li>
    <li><b>Nine curves of its own.</b> The curve tokens are used 127 times, but 9 different hand-written cubic-bezier curves sit beside them (14 uses, most of them bouncy ones like <code>cubic-bezier(.34, 1.56, .64, 1)</code>), and 34 of the browser's own (<code>ease-out</code> 21, <code>linear</code> 7, <code>ease-in-out</code> 5).</li>
    <li><b>A third spring, private to the text card.</b> The drag springs are shared from one place (k 600 pulled into a step, k 300 coming home), but the text card's slider defines its own: k 1400 while held and k 520 on letting go. None of the springs are tokens; CSS can't run them.</li>
    <li><b>The press has no tokens.</b> A soft block's bounce is worked out from its height in code (its beats and curves live in the soft blocks), so a token can't change it; that is on purpose, since one number can't scale with size.</li>
  </ul>`;

  // playing a moment: the piece moves, and the dot follows the curve for the same time (the toy goes there and back)
  for (const m of MOMENTS) {
    if (m.custom) continue;
    const el = root.querySelector(`.moment[data-id="${m.id}"]`), stage = el.querySelector('.stage'), dot = el.querySelector('.dot'), head = el.querySelector('.head');
    const pts = ptsOf(m), peak = Math.max(...pts.map(([, v]) => v)), hi = Math.max(1.08, peak + 0.04);
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
    const knob = stage.querySelector('.knob');
    if (knob) {
      const track = knob.parentElement, p = { x: 25, y: 0, vx: 0, vy: 0 }; let target = 25, held = false, last = 0, loop = 0;
      const draw = () => { knob.style.left = `${p.x}%`; knob.setAttribute('aria-valuenow', Math.round(target / 25)); };
      const go = (to) => { target = to; if (reduce()) { p.x = to; p.vx = 0; draw(); return; } trace(true); cancelAnimationFrame(loop); last = performance.now();
        const step = (now) => { const dt = Math.min(0.032, (now - last) / 1000); last = now; for (let i = 0; i < 4; i++) spring(p, target, 0, m.physics, dt / 4); draw();
          if (!held && (Math.abs(p.x - target) > 0.05 || Math.abs(p.vx) > 0.5)) loop = requestAnimationFrame(step); else if (!held) { p.x = target; p.vx = 0; draw(); } };
        loop = requestAnimationFrame(step); };
      const at = (e) => { const r = track.getBoundingClientRect(); return Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)); };
      knob.addEventListener('pointerdown', (e) => { held = true; cancelAnimationFrame(loop); knob.setPointerCapture(e.pointerId); knob.setAttribute('data-held', ''); });
      knob.addEventListener('pointermove', (e) => { if (!held) return; const nx = at(e); p.vx = (nx - p.x) * 60; p.x = nx; draw(); });
      knob.addEventListener('pointerup', () => { held = false; knob.removeAttribute('data-held'); go(Math.round(p.x / 25) * 25); });
      knob.addEventListener('keydown', (e) => { const d = { ArrowRight: 25, ArrowUp: 25, ArrowLeft: -25, ArrowDown: -25 }[e.key]; if (d) { e.preventDefault(); go(Math.max(0, Math.min(100, target + d))); } });
      draw();
      el.querySelector('.play').addEventListener('click', () => go(target >= 100 ? 0 : target + 25));
      continue;
    }
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

  // pressed: the two blocks' release, drawn from the soft blocks' own beats and feel, measured from each one's height;
  // a dot per block runs its curve when it is let go
  {
    const el = root.querySelector('.moment[data-id="pressed"]'), stage = el.querySelector('.stage'), svg = el.querySelector('svg.press');
    const api = soften(stage);
    const ease = (spec) => { const pts = bezierPoints(spec); return (p) => at(pts, p); };
    const things = [['card', stage.querySelector('.s-box'), 'card'], ['button', stage.querySelector('.s-btn'), 'btn']].map(([name, block, cls]) => {
      const top = block.querySelector(':scope > .in, :scope > span'), f = feel(top), lift = parseFloat(getComputedStyle(block).getPropertyValue('--lift')) || 0;
      const keys = [[0, f.over / 5, LAUNCH], ...BEATS.map(([o, s, , e]) => [o, lift + f.over * s, e])];
      const pts = [];
      for (let i = 1; i < keys.length; i++) { const [t0, v0, e] = keys[i - 1], [t1, v1] = keys[i], fn = ease(e);
        for (let k = 0; k <= 16; k++) { const p = k / 16; pts.push([(t0 + p * (t1 - t0)) * f.ms, v0 + fn(p) * (v1 - v0)]); } }
      return { name, block, cls, f, lift, top: top.offsetHeight, pts };
    });
    const tmax = Math.max(...things.map((t) => t.f.ms)), vmax = Math.max(...things.flatMap((t) => t.pts.map(([, v]) => v))) + 1;
    const x = (ms) => L + (ms / tmax) * (W - L - R), y = (v) => T + (1 - v / vmax) * (H - T - B);
    const draw = () => {
      svg.innerHTML = `<line class="axis" x1="${L}" y1="${y(0)}" x2="${W - R}" y2="${y(0)}"/><line class="axis" x1="${L}" y1="${T - 6}" x2="${L}" y2="${y(0)}"/>
        <text class="gl" x="${L - 8}" y="${y(0) + 4}" text-anchor="end">seat</text>
        <text class="gl" x="${L}" y="${H - 12}">let go</text><text class="gl" x="${W - R}" y="${H - 12}" text-anchor="end">${Math.round(tmax)}ms</text>
        ${things.map((t) => { const pk = t.pts.reduce((a, b) => (b[1] > a[1] ? b : a));
          return `<line class="guide" x1="${L}" y1="${y(t.lift)}" x2="${W - R}" y2="${y(t.lift)}"/>
            <text class="gl" x="${L - 8}" y="${y(t.lift) + 4}" text-anchor="end" fill="${t.cls === 'btn' ? 'var(--pl-pink-block)' : 'var(--pl-border-focus)'}">${t.lift}px</text>
            <path class="line ${t.cls}" d="${t.pts.map(([ms, v], i) => `${i ? 'L' : 'M'} ${x(ms).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')}"/>
            <text class="tag" x="${x(pk[0]) + 6}" y="${y(pk[1]) - 4}" fill="${t.cls === 'btn' ? 'var(--pl-pink-block)' : 'var(--pl-border-focus)'}">${t.name} +${t.f.over.toFixed(1)}px</text>
            <circle class="dot ${t.cls}" cx="${x(0)}" cy="${y(t.pts[0][1])}" r="5"/>`; }).join('')}`;
      el.querySelector('.press-ms').innerHTML = things.map((t) => `<span class="pm">${t.name}, ${t.top}px tall: <b>${Math.round(t.f.ms)}ms</b>, rests ${t.lift}px up</span>`).join('');
    };
    draw();
    const trace = (t, i) => {
      const dot = svg.querySelectorAll('.dot')[i]; if (!dot || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const t0 = performance.now();
      const tick = (now) => { const ms = Math.min(t.f.ms, now - t0), v = at(t.pts.map(([a, b]) => [a / t.f.ms, b]), ms / t.f.ms);
        dot.setAttribute('cx', x(ms)); dot.setAttribute('cy', y(v)); if (ms < t.f.ms) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    };
    // a block let go (by hand, by key, or by Play) runs its dot
    things.forEach((t, i) => { let was = false; new MutationObserver(() => { const now = t.block.classList.contains('down'); if (was && !now) trace(t, i); was = now; }).observe(t.block, { attributeFilter: ['class'] }); });
    el.querySelector('.play').addEventListener('click', () => { for (const t of things) api.press(t.block, true); setTimeout(() => { for (const t of things) api.press(t.block, false); }, 160); });
  }

  const copy = (el) => { navigator.clipboard?.writeText(el.textContent).catch(() => {}); el.setAttribute('data-copied', ''); setTimeout(() => el.removeAttribute('data-copied'), 900); };
  root.addEventListener('click', (e) => { const t = e.target.closest('.tok'); if (t) copy(t); });
  root.addEventListener('keydown', (e) => { const t = e.target.closest?.('.tok'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); copy(t); } });
  void host;
}
