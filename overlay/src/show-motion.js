/* ─────────────────────────────────────────────────────────
 * HOW A CHANGE MOVES · React Plumber overlay
 *
 * The motion of a fix landing on the page, one tile per kind of change: Clean up's steps (text, padding, margin, gap,
 * colour, icons, corners, controls, shadows, timing, disabled) and the craft fixes (line spacing, letter spacing,
 * baseline, shared edges, line length, tap target, number columns, weight). Every change plays the same four beats:
 * the guides draw in (hairlines at the edges that change, an I-beam, the value in a pill), the page moves on the
 * overlay's spring with the guides following every frame, the number rolls and lands (coral to sky, named by its
 * step), the guides go.
 *
 * One source (owner, 2026-11-20: "polishing it from here should reflect in the same"): the design site's page
 * (web/design/parts/change-motion.js), the demo (overlay/demo/show-motion.html) and Clean up's show all draw from
 * here, and the beats and the spring are show.js's.
 *
 *  MOTION_CSS                         the tiles' styles (the host gives the tokens)
 *  MOTION_TILES                       [title, line, build(stage) → spec] and section names (strings)
 *  playTile(stage, spec)              one change, its four beats
 *  mountMotionBoard(board, opts)      every tile with its own Play; { playAll, runs }
 * ───────────────────────────────────────────────────────── */
import { SPRING, BEAT } from './motion-beats.js';

// the beats of one change, from show.js's: guides draw in, a hold to read them, the move, the landing, the guides go
const T = { guides: BEAT.in + 120, hold: Math.max(200, BEAT.hold - 200), move: BEAT.move + 80, land: 520, out: BEAT.out + 120 };

// the board the tiles sit on: a grid of tiles, each titled, with its own Play (the host page gives the board this class)
export const BOARD_CSS = `
  .mo-board { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 28px 22px; }
  .mo-board > h3 { grid-column: 1 / -1; margin: 22px 0 -8px; font: 700 18px/1.2 var(--pl-round, var(--pl-sans, system-ui)); color: var(--pl-text-primary); }
  /* each tile spans two of the board's rows (subgrid): the titles of a row share one height, so its stages line up */
  .mo-board .tile { grid-row: span 2; display: grid; grid-template-rows: subgrid; row-gap: 10px; min-width: 0; }
  .mo-board .tile header { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; align-items: start; }
  .mo-board .tile h2 { margin: 0; font: 650 15px/1.3 var(--pl-sans, system-ui); color: var(--pl-text-primary); }
  .mo-board .tile p { grid-column: 1; margin: 0; font: 400 13px/1.45 var(--pl-sans, system-ui); color: var(--pl-text-secondary); }
  .mo-board .tile header button { grid-column: 2; grid-row: 1 / span 2; align-self: center; font: 600 12px var(--pl-sans, system-ui); padding: 7px 12px; border-radius: 9px; border: 0;
    background: var(--pl-bg-inset, #f1f1ef); color: var(--pl-text-primary); cursor: pointer; }
  @media (hover: hover) and (pointer: fine) { .mo-board .tile header button:hover { background: var(--pl-pink); color: #fff; } }
  .mo-board .tile header button:focus-visible { outline: 2px solid var(--pl-sky); outline-offset: 2px; }
  @media (max-width: 560px) { .mo-board { grid-template-columns: 1fr; } }
`;

// The guides, as one family (hairlines, an I-beam, the value in a pill, a ring, a square, an arc): one set of rules
// for a tile's stage and for the page under Clean up's show. \`c(name)\` is how each piece is selected where it is drawn
// (on the page every piece is prefixed and scoped, so no other rule of the overlay's can reach it)
const guideRules = (c) => `
    ${c('g')} { position: absolute; pointer-events: none; }
    ${c('hl')} { height: 1px; background: color-mix(in oklab, var(--c) 60%, transparent); transform-origin: left; }
    ${c('vl')} { width: 1px; background: color-mix(in oklab, var(--c) 60%, transparent); transform-origin: top; }
    ${c('beam')} { width: 9px; } ${c('beam')}::before { content: ''; position: absolute; left: 4px; top: 0; bottom: 0; width: 1.5px; background: var(--c); }
    ${c('beam')}::after { content: ''; position: absolute; inset: 0; border-top: 1.5px solid var(--c); border-bottom: 1.5px solid var(--c); }
    ${c('hbeam')} { height: 9px; } ${c('hbeam')}::before { content: ''; position: absolute; top: 4px; left: 0; right: 0; height: 1.5px; background: var(--c); }
    ${c('hbeam')}::after { content: ''; position: absolute; inset: 0; border-left: 1.5px solid var(--c); border-right: 1.5px solid var(--c); }
    ${c('pill')} { height: 22px; padding: 0 8px; border-radius: 11px; background: var(--c); color: #fff; font: 600 12px/22px system-ui; font-variant-numeric: tabular-nums; white-space: nowrap;
      translate: -50% -50%; box-shadow: 0 1px 2px rgb(0 0 0 / .25); display: inline-flex; gap: 4px; transition: background-color 280ms ease-out; }
    ${c('pill')} .roll { display: inline-block; height: 22px; overflow: hidden; } ${c('pill')} .roll > span { display: flex; flex-direction: column; }
    ${c('pill')} .roll b { height: 22px; font-weight: inherit; } ${c('pill')} i { font-style: normal; opacity: .85; font-weight: 500; }
    ${c('ring')} { border: 1.5px dashed var(--c); border-radius: 12px; }
    ${c('sq')} { border: 1.5px solid color-mix(in oklab, var(--c) 70%, transparent); border-radius: 4px; }
    ${c('arc')} { border-top: 2px solid var(--c); border-left: 2px solid var(--c); }
    ${c('pill')} .chip { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin: 6px 2px 0 -2px; box-shadow: 0 0 0 1.5px #fff; }`;

export const MOTION_CSS = `
    :host { display: block; }
    /* the stage is someone's page, light in either scheme: its words are the page's ink, never the docs' (white on
       white in the dark scheme) */
    .stage { position: relative; height: 240px; border-radius: 16px; background: #fff; color: #1c1b19; color-scheme: light; overflow: hidden; font-family: system-ui; }
    .pg { position: absolute; inset: 0; padding: 40px 72px 40px 96px; }
    ${guideRules((n) => '.' + n)}
    .hl { left: 0; right: 0; } .vl { top: 0; bottom: 0; }
    .stage { --c: var(--pl-coral); } .stage[data-landed] { --c: var(--pl-sky); }
    /* the space patterns: hatch for padding, dither for margin, stripes for a gap */
    .hatch { background: repeating-linear-gradient(45deg, color-mix(in oklab, var(--pl-mint) 55%, transparent) 0 1px, transparent 1px 6px), color-mix(in oklab, var(--pl-mint) 10%, transparent); }
    .dither { background: radial-gradient(color-mix(in oklab, var(--pl-butter) 85%, transparent) 0.8px, transparent 1px) 0 0 / 4px 4px; }
    .stripes { background: repeating-linear-gradient(90deg, color-mix(in oklab, var(--pl-lilac) 60%, transparent) 0 1px, transparent 1px 4px), color-mix(in oklab, var(--pl-lilac) 12%, transparent); }
    .card { background: #f3f4f6; border-radius: 12px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0 18px; border-radius: 10px; background: #4f46e5; color: #fff; font: 600 14px/1 system-ui; }
    .track { height: 6px; border-radius: 3px; background: #eef0f3; overflow: hidden; } .track i { display: block; height: 100%; width: 0; background: var(--c); border-radius: 3px; }
    .meter { position: relative; height: 8px; border-radius: 4px; background: linear-gradient(90deg, var(--pl-coral) 0 60%, var(--pl-mint) 60% 100%); opacity: .35; }
    .needle { position: absolute; top: -5px; width: 3px; height: 18px; border-radius: 2px; background: var(--c); }
    .txt { margin: 0; color: #111; font-weight: 700; letter-spacing: -0.01em; line-height: 1.15; }
    .sub { margin: 6px 0 0; color: #64748b; font-size: 13px; }
  `;

// the digits a value passes through, every `step` (a time rolls by 10ms, a ratio by a tenth), at most 24 of them
const roll = (from, to, step = 1, fmt = (v) => v) => { const n = Math.max(1, Math.round(Math.abs(to - from) / step)), k = Math.ceil(n / 24), out = [];
  for (let i = 0; i <= n; i += k) out.push(fmt(from + Math.sign(to - from) * i * step)); if (out[out.length - 1] !== fmt(to)) out.push(fmt(to)); return out; };
const pillHtml = (vals, unit, name = '') => `<span class="roll"><span>${vals.map((v) => `<b>${v}</b>`).join('')}</span></span>${unit}${name ? ` <i>${name}</i>` : ''}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const animate = (el, kf, o) => el.animate(kf, { fill: 'both', ...o }).finished;

// one tile: build(stage) returns { from, to, unit, name, guides(), apply(value) }; the beats are the same for all
// spec.now: turn round a move already under way, without drawing the guides in again.
// spec.stale(), when given, says a newer run took the stage (a toggle flipped mid-play): this one stops at its next beat
export async function playTile(stage, spec) {
  const gone = () => spec.stale?.();
  stage.removeAttribute('data-landed');
  const g = spec.guides(); // [{ el, kind: 'h'|'v'|'beam'|'pill' }]
  const pill = g.find((x) => x.kind === 'pill').el, fmt = spec.fmt ?? ((v) => Math.round(v)), vals = spec.labels ? [spec.labels[0]] : roll(spec.from, spec.to, spec.step ?? 1, fmt);
  pill.innerHTML = spec.labels ? `${spec.chip?.(0) ?? ''}${spec.labels[0]}` : pillHtml(vals, spec.unit);
  const strip = pill.querySelector('.roll > span');
  // 1. the guides draw in: lines sweep from the edge, the beam and the pill pop. A run that turns round a move already
  // under way (spec.now) keeps the guides where they are and moves at once
  // spec.quick (a toggle the hand pressed): the move starts at once and the guides draw in alongside it, no hold
  const drawIn = spec.now ? Promise.resolve() : Promise.all(g.map((x, i) => x.kind === 'h' ? animate(x.el, [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], { duration: T.guides, delay: i * 40, easing: 'cubic-bezier(.2,.8,.2,1)' })
    : x.kind === 'v' ? animate(x.el, [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: T.guides, delay: i * 40, easing: 'cubic-bezier(.2,.8,.2,1)' })
    : animate(x.el, [{ opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1 }], { duration: T.guides * 0.8, delay: 120, easing: 'cubic-bezier(.34,1.56,.64,1)' })));
  if (!spec.now && !spec.quick) await drawIn;
  if (gone()) return;
  if (!spec.now && !spec.quick) await wait(T.hold);
  if (gone()) return;
  // 2. the page moves on the spring; the guides follow it every frame; the number rolls with it
  spec.ease(true); spec.apply(spec.to);
  strip?.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-(vals.length - 1) * 22}px)` }], { duration: T.move, easing: SPRING, fill: 'both' });
  // a value that is a name (a colour, a shadow): the pill's words cross over halfway through the move
  if (spec.labels) setTimeout(() => { if (gone()) return; pill.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(2px)' }], { duration: 140 }).finished.then(() => { pill.innerHTML = `${spec.chip?.(1) ?? ''}${spec.labels[1]}`; pill.animate([{ opacity: 0, filter: 'blur(2px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 180 }); }); }, T.move * 0.35);
  const t0 = performance.now();
  await new Promise((done) => { const f = () => { spec.track(); if (performance.now() - t0 < T.move + 80) requestAnimationFrame(f); else done(); }; f(); });
  if (gone()) return;
  // 3. it lands: the pill turns to the scale's colour and names the step, a small settle
  stage.setAttribute('data-landed', '');
  pill.innerHTML = spec.labels ? `${spec.chip?.(1) ?? ''}${spec.labels[1]}` : pillHtml([fmt(spec.to)], spec.unit, spec.name);
  pill.animate([{ scale: 1 }, { scale: 1.08 }, { scale: 1 }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  await wait(T.land);
  if (gone()) return;
  // 4. the guides go, the page keeps its change
  await Promise.all(g.map((x) => animate(x.el, [{ opacity: 1 }, { opacity: 0 }], { duration: T.out, easing: 'ease-out' })));
}

export const MOTION_TILES = [
  ['Text size', '18px → 24px: baseline and cap line ride the words', (s) => {
    s.innerHTML = `<div class="pg"><p class="txt" style="font-size:18px">Recent deploys</p><p class="sub">Every release this week, newest first.</p></div>
      <i class="g hl cap"></i><i class="g hl base"></i><i class="g beam"></i><i class="g pill"></i>`;
    const t = s.querySelector('.txt'), cap = s.querySelector('.cap'), base = s.querySelector('.base'), beam = s.querySelector('.beam'), pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(), r = t.getBoundingClientRect(), fs = parseFloat(getComputedStyle(t).fontSize);
      const b = r.top - S.top + (r.height + fs * 0.72) / 2, c = b - fs * 0.72;
      cap.style.top = `${c}px`; base.style.top = `${b}px`; beam.style.cssText = `left:80px;top:${c}px;height:${b - c}px`; pill.style.cssText = `left:44px;top:${(b + c) / 2}px`; };
    track();
    return { from: 18, to: 24, unit: 'px', name: 'title', guides: () => [{ el: cap, kind: 'h' }, { el: base, kind: 'h' }, { el: beam, kind: 'beam' }, { el: pill, kind: 'pill' }],
      ease: (on) => { t.style.transition = on ? `font-size ${T.move}ms ${SPRING}` : ''; t.animate([{ filter: 'blur(0)' }, { filter: 'blur(1.2px)', offset: .35 }, { filter: 'blur(0)' }], { duration: T.move }); },
      apply: (v) => { t.style.fontSize = `${v}px`; }, track, reset: () => { t.style.transition = ''; t.style.fontSize = '18px'; track(); } };
  }],
  ['Padding', '28px → 16px: the hatch is the space, the beam measures it', (s) => {
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;padding:0"><div class="card box" style="position:relative;padding:28px;width:240px"><div class="hatch pad" style="position:absolute;inset:0;border-radius:12px"></div><div class="in" style="position:relative;background:#fff;border-radius:6px;padding:10px 12px;font-weight:600">Total revenue <span style="color:#64748b;font-weight:500">$48,200</span></div></div></div>
      <i class="g hl top"></i><i class="g hl inner"></i><i class="g beam"></i><i class="g pill"></i>`;
    const box = s.querySelector('.box'), inn = s.querySelector('.in'), pad = s.querySelector('.pad'), top = s.querySelector('.top'), inner = s.querySelector('.inner'), beam = s.querySelector('.beam'), pill = s.querySelector('.pill');
    const clip = () => { const p = parseFloat(getComputedStyle(box).paddingTop); pad.style.clipPath = `path(evenodd, "M0 0H${box.offsetWidth}V${box.offsetHeight}H0Z M${p} ${p}H${box.offsetWidth - p}V${box.offsetHeight - p}H${p}Z")`; };
    const track = () => { clip(); const S = s.getBoundingClientRect(), a = box.getBoundingClientRect(), b = inn.getBoundingClientRect(); const y1 = a.top - S.top, y2 = b.top - S.top;
      top.style.top = `${y1}px`; inner.style.top = `${y2}px`; beam.style.cssText = `left:${a.left - S.left - 26}px;top:${y1}px;height:${y2 - y1}px`; pill.style.cssText = `left:${a.left - S.left - 58}px;top:${(y1 + y2) / 2}px`; };
    track();
    return { from: 28, to: 16, unit: 'px', name: 'space-4', guides: () => [{ el: top, kind: 'h' }, { el: inner, kind: 'h' }, { el: beam, kind: 'beam' }, { el: pill, kind: 'pill' }],
      ease: (on) => { box.style.transition = on ? `padding ${T.move}ms ${SPRING}` : ''; }, apply: (v) => { box.style.padding = `${v}px`; }, track,
      reset: () => { box.style.transition = ''; box.style.padding = '28px'; track(); } };
  }],
  ['Margin', '40px → 24px: the dither between two blocks closes up', (s) => {
    s.innerHTML = `<div class="pg" style="padding:34px 28px 0 104px"><div class="card a" style="height:56px;display:flex;align-items:center;padding:0 14px;font-weight:600">Overview</div><div class="dither m" style="height:40px"></div><div class="card b" style="height:56px;display:flex;align-items:center;padding:0 14px;font-weight:600">Deployments</div></div>
      <i class="g hl t"></i><i class="g hl u"></i><i class="g beam"></i><i class="g pill"></i>`;
    const m = s.querySelector('.m'), a = s.querySelector('.a'), b = s.querySelector('.b'), t = s.querySelector('.t'), u = s.querySelector('.u'), beam = s.querySelector('.beam'), pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(), y1 = a.getBoundingClientRect().bottom - S.top, y2 = b.getBoundingClientRect().top - S.top;
      t.style.top = `${y1}px`; u.style.top = `${y2}px`; beam.style.cssText = `left:84px;top:${y1}px;height:${y2 - y1}px`; pill.style.cssText = `left:52px;top:${(y1 + y2) / 2}px`; };
    track();
    return { from: 40, to: 24, unit: 'px', name: 'space-6', guides: () => [{ el: t, kind: 'h' }, { el: u, kind: 'h' }, { el: beam, kind: 'beam' }, { el: pill, kind: 'pill' }],
      ease: (on) => { m.style.transition = on ? `height ${T.move}ms ${SPRING}` : ''; }, apply: (v) => { m.style.height = `${v}px`; }, track,
      reset: () => { m.style.transition = ''; m.style.height = '40px'; track(); } };
  }],
  ['Gap', '12px → 20px: stripes in each gap, the items slide apart together', (s) => {
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;padding:0"><div class="row" style="display:flex;gap:12px;position:relative">${['Design', 'Build', 'Ship'].map((w) => `<div class="card it" style="width:80px;height:64px;display:grid;place-items:center;font-weight:600">${w}</div>`).join('')}</div></div>
      <i class="g stripes s1" style="opacity:0"></i><i class="g stripes s2" style="opacity:0"></i><i class="g vl l1"></i><i class="g vl l2"></i><i class="g hbeam"></i><i class="g pill"></i>`;
    const row = s.querySelector('.row'), its = [...s.querySelectorAll('.it')], st = [s.querySelector('.s1'), s.querySelector('.s2')], l1 = s.querySelector('.l1'), l2 = s.querySelector('.l2'), hb = s.querySelector('.hbeam'), pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(); const r = its.map((x) => x.getBoundingClientRect());
      [0, 1].forEach((k) => { const x1 = r[k].right - S.left, x2 = r[k + 1].left - S.left; st[k].style.cssText = `left:${x1}px;top:${r[0].top - S.top}px;width:${x2 - x1}px;height:${r[0].height}px;opacity:${st[k].style.opacity || 0}`; });
      const x1 = r[0].right - S.left, x2 = r[1].left - S.left, y = r[0].bottom - S.top + 22;
      l1.style.left = `${x1}px`; l2.style.left = `${x2}px`; hb.style.cssText = `top:${y}px;left:${x1}px;width:${x2 - x1}px`; pill.style.cssText = `left:${(x1 + x2) / 2}px;top:${y + 26}px`; };
    track();
    return { from: 12, to: 20, unit: 'px', name: 'space-5', guides: () => [{ el: l1, kind: 'v' }, { el: l2, kind: 'v' }, { el: hb, kind: 'beam' }, { el: pill, kind: 'pill' }, ...st.map((el) => ({ el, kind: 'beam' }))],
      ease: (on) => { row.style.transition = on ? `gap ${T.move}ms ${SPRING}` : ''; }, apply: (v) => { row.style.gap = `${v}px`; }, track,
      reset: () => { row.style.transition = ''; row.style.gap = '12px'; track(); } };
  }],
  ['Colour', '#3b82f6 → your accent: a ring marks it, the colour fades across', (s) => {
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;padding:0"><span class="btn b" style="height:44px;background:#3b82f6">Start free trial</span></div><i class="g ring"></i><i class="g pill"></i>`;
    const btn = s.querySelector('.b'), ring = s.querySelector('.ring'), pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(), r = btn.getBoundingClientRect(); ring.style.cssText = `left:${r.left - S.left - 6}px;top:${r.top - S.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px`; pill.style.cssText = `left:${r.left - S.left + r.width / 2}px;top:${r.bottom - S.top + 30}px`; };
    track();
    const to = 'var(--pl-pink)';
    return { labels: ['#3b82f6', 'accent'], chip: (i) => `<i class="chip" style="background:${i ? to : '#3b82f6'}"></i>`, guides: () => [{ el: ring, kind: 'beam' }, { el: pill, kind: 'pill' }],
      ease: (on) => { btn.style.transition = on ? `background-color ${T.move}ms ease-in-out` : ''; }, apply: () => { btn.style.background = to; }, track,
      reset: () => { btn.style.transition = ''; btn.style.background = '#3b82f6'; track(); } };
  }],
  ['Icons', '22px → 16px: a square around the icon, it settles to the text', (s) => {
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;padding:0"><div style="display:flex;align-items:center;gap:8px;font:600 15px system-ui"><svg class="ic" viewBox="0 0 24 24" style="width:22px;height:22px"><circle cx="12" cy="12" r="9" fill="none" stroke="#111" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"/></svg>Last deployed 2h ago</div></div><i class="g sq"></i><i class="g hbeam"></i><i class="g pill"></i>`;
    const ic = s.querySelector('.ic'), sq = s.querySelector('.sq'), hb = s.querySelector('.hbeam'), pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(), r = ic.getBoundingClientRect(); sq.style.cssText = `left:${r.left - S.left - 3}px;top:${r.top - S.top - 3}px;width:${r.width + 6}px;height:${r.height + 6}px`;
      hb.style.cssText = `left:${r.left - S.left}px;top:${r.top - S.top - 18}px;width:${r.width}px`; pill.style.cssText = `left:${r.left - S.left + r.width / 2}px;top:${r.top - S.top - 42}px`; };
    track();
    return { from: 22, to: 16, unit: 'px', name: 'icon-sm', guides: () => [{ el: sq, kind: 'beam' }, { el: hb, kind: 'beam' }, { el: pill, kind: 'pill' }],
      ease: (on) => { ic.style.transition = on ? `width ${T.move}ms ${SPRING}, height ${T.move}ms ${SPRING}` : ''; }, apply: (v) => { ic.style.width = ic.style.height = `${v}px`; }, track,
      reset: () => { ic.style.transition = ''; ic.style.width = ic.style.height = '22px'; track(); } };
  }],
  ['Corners', '4px → 12px: an arc on the corner opens with it', (s) => {
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;padding:0"><div class="card c" style="width:220px;height:110px;border-radius:4px;background:#e8eaef;display:grid;place-items:center;font-weight:600">Project card</div></div><i class="g arc"></i><i class="g pill"></i>`;
    const c = s.querySelector('.c'), arc = s.querySelector('.arc'), pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(), r = c.getBoundingClientRect(), rad = parseFloat(getComputedStyle(c).borderTopLeftRadius), w = Math.max(10, rad * 2);
      arc.style.cssText = `left:${r.left - S.left - 5}px;top:${r.top - S.top - 5}px;width:${w + 10}px;height:${w + 10}px;border-top-left-radius:${rad + 5}px`; pill.style.cssText = `left:${r.left - S.left - 40}px;top:${r.top - S.top - 20}px`; };
    track();
    return { from: 4, to: 12, unit: 'px', name: 'rounded-card', guides: () => [{ el: arc, kind: 'beam' }, { el: pill, kind: 'pill' }],
      ease: (on) => { c.style.transition = on ? `border-radius ${T.move}ms ${SPRING}` : ''; }, apply: (v) => { c.style.borderRadius = `${v}px`; }, track,
      reset: () => { c.style.transition = ''; c.style.borderRadius = '4px'; track(); } };
  }],
  ['Controls', '48px → 40px: a button settles to your control height', (s) => {
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;padding:0"><span class="btn b" style="height:48px">Save changes</span></div><i class="g hl t"></i><i class="g hl u"></i><i class="g beam"></i><i class="g pill"></i>`;
    const b = s.querySelector('.b'), t = s.querySelector('.t'), u = s.querySelector('.u'), beam = s.querySelector('.beam'), pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(), r = b.getBoundingClientRect(), y1 = r.top - S.top, y2 = r.bottom - S.top;
      t.style.top = `${y1}px`; u.style.top = `${y2}px`; beam.style.cssText = `left:${r.left - S.left - 26}px;top:${y1}px;height:${y2 - y1}px`; pill.style.cssText = `left:${r.left - S.left - 58}px;top:${(y1 + y2) / 2}px`; };
    track();
    return { from: 48, to: 40, unit: 'px', name: 'control', guides: () => [{ el: t, kind: 'h' }, { el: u, kind: 'h' }, { el: beam, kind: 'beam' }, { el: pill, kind: 'pill' }],
      ease: (on) => { b.style.transition = on ? `height ${T.move}ms ${SPRING}` : ''; }, apply: (v) => { b.style.height = `${v}px`; }, track,
      reset: () => { b.style.transition = ''; b.style.height = '48px'; track(); } };
  }],
  ['Shadows', 'a hand-made glow → your shadow: its reach is outlined and pulls in', (s) => {
    const from = '0 18px 40px -6px rgb(79 70 229 / .45)', to = '0 1px 3px rgb(0 0 0 / .1), 0 1px 2px rgb(0 0 0 / .06)';
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;padding:0"><div class="c" style="width:200px;height:84px;border-radius:12px;background:#fff;box-shadow:${from};display:grid;place-items:center;font-weight:600">Usage this month</div></div><i class="g ring"></i><i class="g pill"></i>`;
    const c = s.querySelector('.c'), ring = s.querySelector('.ring'), pill = s.querySelector('.pill');
    let reach = 34; const track = () => { const S = s.getBoundingClientRect(), r = c.getBoundingClientRect(); ring.style.cssText = `left:${r.left - S.left - reach}px;top:${r.top - S.top - reach * 0.6}px;width:${r.width + reach * 2}px;height:${r.height + reach * 1.8}px;border-radius:${12 + reach}px`;
      pill.style.cssText = `left:${r.left - S.left + r.width / 2}px;top:${r.top - S.top - reach * 0.6 - 16}px`; };
    track();
    return { labels: ['custom glow', 'shadow-sm'], guides: () => [{ el: ring, kind: 'beam' }, { el: pill, kind: 'pill' }],
      ease: (on) => { c.style.transition = on ? `box-shadow ${T.move}ms ease-in-out` : ''; if (on) c.animate([{}, {}], { duration: T.move }); const t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / T.move); reach = 34 - 28 * (1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(f); }; if (on) f(); },
      apply: () => { c.style.boxShadow = to; }, track, reset: () => { c.style.transition = ''; c.style.boxShadow = from; reach = 34; track(); } };
  }],
  ['Timing', '400ms → 150ms: the duration is a length, and it shrinks', (s) => {
    // the bar's length is the time (240px is 400ms); the old length stays as a dashed ghost so the cut is seen
    const PX = 240 / 400;
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;align-content:center;gap:22px;padding:0"><span class="btn b" style="height:40px">Open menu</span>
      <div class="lane" style="position:relative;width:240px;height:10px"><i class="ghost" style="position:absolute;left:0;top:0;height:10px;width:240px;border-radius:5px;border:1.5px dashed color-mix(in oklab, var(--pl-coral) 70%, transparent);box-sizing:border-box;opacity:0"></i><i class="len" style="position:absolute;left:0;top:0;height:10px;width:240px;border-radius:5px;background:var(--c)"></i></div></div><i class="g pill"></i>`;
    const b = s.querySelector('.b'), len = s.querySelector('.len'), ghost = s.querySelector('.ghost'), pill = s.querySelector('.pill');
    const press = (ms) => b.animate([{ scale: 1, background: '#4f46e5' }, { scale: .94, background: '#6d63ff', offset: .5 }, { scale: 1, background: '#4f46e5' }], { duration: ms * 2, easing: 'ease-in-out' });
    const track = () => { const S = s.getBoundingClientRect(), r = len.getBoundingClientRect(); pill.style.cssText = `left:${r.left - S.left + r.width}px;top:${r.bottom - S.top + 26}px`; };
    track();
    return { from: 400, to: 150, step: 10, unit: 'ms', name: 'fast', guides: () => [{ el: pill, kind: 'pill' }],
      ease: (on) => { if (!on) return; press(400); ghost.style.transition = 'opacity 200ms ease-out'; ghost.style.opacity = '1'; len.style.transition = `width ${T.move}ms ${SPRING}`; setTimeout(() => press(150), T.move + 120); },
      apply: (v) => { len.style.width = `${v * PX}px`; }, track,
      reset: () => { len.style.transition = ''; len.style.width = '240px'; ghost.style.transition = ''; ghost.style.opacity = '0'; track(); } };
  }],
  ['Disabled', 'opacity .3 → .5: the needle climbs until it can be read', (s) => {
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;align-content:center;gap:22px;padding:0"><span class="btn b" style="height:40px;opacity:.3">Delete project</span><div class="meter" style="width:240px"></div><i class="needle"></i></div><i class="g pill"></i>`;
    const b = s.querySelector('.b'), meter = s.querySelector('.meter'), needle = s.querySelector('.needle'), pill = s.querySelector('.pill');
    const ratio = () => 1 + (parseFloat(getComputedStyle(b).opacity) - 0.3) / 0.2 * 2.5 + 0.9; // 1.9:1 at .3 → 4.4:1 at .5, for the comp
    const track = () => { const S = s.getBoundingClientRect(), r = meter.getBoundingClientRect(), k = Math.min(1, (ratio() - 1) / 5);
      needle.style.cssText = `position:absolute;left:${r.left - S.left + k * r.width - 1}px;top:${r.top - S.top - 5}px`; pill.style.cssText = `left:${r.left - S.left + k * r.width}px;top:${r.bottom - S.top + 24}px`; };
    track();
    return { from: 1.9, to: 4.4, step: 0.1, fmt: (v) => v.toFixed(1), unit: ':1', name: 'readable', guides: () => [{ el: pill, kind: 'pill' }],
      ease: (on) => { b.style.transition = on ? `opacity ${T.move}ms ${SPRING}` : ''; }, apply: () => { b.style.opacity = '.5'; }, track,
      reset: () => { b.style.transition = ''; b.style.opacity = '.3'; track(); } };
  }],
  '— Craft fixes —',
  ['Line spacing', 'leading 1.2 → 1.5: a baseline under every line, and they spread', (s) => {
    s.innerHTML = `<div class="pg" style="padding:40px 28px 0 92px"><p class="t" style="margin:0;font-size:14px;line-height:1.2;color:#222;max-width:300px">Every release this week, newest first. Each one lists who shipped it, what changed and how long it took to reach production.</p></div><i class="g hl l0"></i><i class="g hl l1"></i><i class="g hl l2"></i><i class="g beam"></i><i class="g pill"></i>`;
    const t = s.querySelector('.t'), ls = [0, 1, 2].map((i) => s.querySelector('.l' + i)), beam = s.querySelector('.beam'), pill = s.querySelector('.pill');
    const lines = () => { const r = document.createRange(); r.selectNodeContents(t); const out = []; for (const q of r.getClientRects()) if (!out.some((o) => Math.abs(o.bottom - q.bottom) < 2)) out.push(q); return out; };
    const track = () => { const S = s.getBoundingClientRect(), L = lines(), fs = 15, lh = parseFloat(getComputedStyle(t).lineHeight), y = L.map((q) => q.top - S.top + (lh + fs * 0.72) / 2);
      ls.forEach((el, i) => { el.style.top = `${(y[i] ?? -10)}px`; }); beam.style.cssText = `left:84px;top:${y[0]}px;height:${(y[1] ?? y[0]) - y[0]}px`; pill.style.cssText = `left:48px;top:${(y[0] + (y[1] ?? y[0])) / 2}px`; };
    track();
    return { from: 1.2, to: 1.5, step: 0.05, fmt: (v) => v.toFixed(2), unit: '', name: 'relaxed', guides: () => [...ls.map((el) => ({ el, kind: 'h' })), { el: beam, kind: 'beam' }, { el: pill, kind: 'pill' }],
      ease: (on) => { t.style.transition = on ? `line-height ${T.move}ms ${SPRING}` : ''; }, apply: (v) => { t.style.lineHeight = v; }, track, reset: () => { t.style.transition = ''; t.style.lineHeight = 1.2; track(); } };
  }],
  ['Letter spacing', 'tracking .12em → .04em: a tick at each letter, closing in', (s) => {
    const word = 'OVERVIEW';
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;padding:0"><p class="t" style="margin:0;font:700 13px system-ui;letter-spacing:.12em;color:#475569">${[...word].map((c) => `<span>${c}</span>`).join('')}</p></div>${[...word].map(() => '<i class="g vl tk" style="top:auto;bottom:auto;height:30px"></i>').join('')}<i class="g pill"></i>`;
    const t = s.querySelector('.t'), cs = [...t.children], tks = [...s.querySelectorAll('.tk')], pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(); cs.forEach((c, i) => { const r = c.getBoundingClientRect(); tks[i].style.left = `${r.left - S.left}px`; tks[i].style.top = `${r.top - S.top - 8}px`; });
      const r = t.getBoundingClientRect(); pill.style.cssText = `left:${r.left - S.left + r.width / 2}px;top:${r.bottom - S.top + 30}px`; };
    track();
    return { from: 0.12, to: 0.04, step: 0.01, fmt: (v) => v.toFixed(2), unit: 'em', name: 'caps', guides: () => [...tks.map((el) => ({ el, kind: 'v' })), { el: pill, kind: 'pill' }],
      ease: (on) => { t.style.transition = on ? `letter-spacing ${T.move}ms ${SPRING}` : ''; }, apply: (v) => { t.style.letterSpacing = `${v}em`; }, track, reset: () => { t.style.transition = ''; t.style.letterSpacing = '.12em'; track(); } };
  }],
  ['Baseline', 'centred → on one baseline: two lines meet as one', (s) => {
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;padding:0"><div class="row" style="display:flex;align-items:center;gap:6px"><b class="a" style="font:800 34px/1 system-ui">$48,200</b><span class="b" style="font:500 14px/1 system-ui;color:#64748b">/ month</span></div></div><i class="g hl ba"></i><i class="g hl bb"></i><i class="g pill"></i>`;
    const row = s.querySelector('.row'), a = s.querySelector('.a'), b = s.querySelector('.b'), ba = s.querySelector('.ba'), bb = s.querySelector('.bb'), pill = s.querySelector('.pill');
    let k = 0; const base = (el, fs) => el.getBoundingClientRect().top + (el.getBoundingClientRect().height + fs * 0.72) / 2;
    const track = () => { const S = s.getBoundingClientRect(); ba.style.top = `${base(a, 34) - S.top}px`; bb.style.top = `${base(b, 14) - S.top}px`; const r = row.getBoundingClientRect(); pill.style.cssText = `left:${r.right - S.left + 50}px;top:${base(b, 14) - S.top}px`; };
    track();
    return { labels: ['centred', 'baseline'], guides: () => [{ el: ba, kind: 'h' }, { el: bb, kind: 'h' }, { el: pill, kind: 'pill' }],
      ease: (on) => { if (!on) return; const d = (base(a, 34) - base(b, 14)); b.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${d}px)` }], { duration: T.move, easing: SPRING, fill: 'both' }); },
      apply: () => {}, track, reset: () => { b.getAnimations().forEach((x) => x.cancel()); track(); } };
  }],
  ['Shared edges', 'three left edges → one: the gutter line, and the blocks slide onto it', (s) => {
    const offs = [30, 14, 38];
    s.innerHTML = `<div class="pg" style="padding:38px 28px 0 56px">${['Overview', 'Recent deploys', 'Team'].map((w, i) => `<div class="card k" style="height:40px;margin:0 0 12px ${offs[i]}px;width:230px;display:flex;align-items:center;padding:0 12px;font-weight:600">${w}</div>`).join('')}</div><i class="g vl edge"></i><i class="g pill"></i>`;
    const ks = [...s.querySelectorAll('.k')], edge = s.querySelector('.edge'), pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(), x = ks[1].getBoundingClientRect().left - S.left - 0; edge.style.left = `${Math.min(...ks.map((k) => k.getBoundingClientRect().left)) - S.left}px`; pill.style.cssText = `left:${parseFloat(edge.style.left)}px;top:20px`; };
    track();
    return { labels: ['3 edges', '1 edge'], guides: () => [{ el: edge, kind: 'v' }, { el: pill, kind: 'pill' }],
      ease: (on) => { ks.forEach((k) => { k.style.transition = on ? `margin-left ${T.move}ms ${SPRING}` : ''; }); }, apply: () => { ks.forEach((k) => { k.style.marginLeft = '14px'; }); }, track,
      reset: () => { ks.forEach((k, i) => { k.style.transition = ''; k.style.marginLeft = `${offs[i]}px`; }); track(); } };
  }],
  ['Line length', '60 → 42 characters: the line shortens to a reading measure', (s) => {
    s.innerHTML = `<div class="pg" style="padding:40px 28px 0 28px"><p class="t" style="margin:0;font-size:13px;line-height:1.5;color:#222;max-width:60ch">Plumber reads the page the way a person does: what is drawn, where it sits, and how each part relates to the parts beside it, so its notes are about what you see.</p></div><i class="g vl rim"></i><i class="g hbeam"></i><i class="g pill"></i>`;
    const t = s.querySelector('.t'), rim = s.querySelector('.rim'), hb = s.querySelector('.hbeam'), pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(), r = t.getBoundingClientRect(); rim.style.left = `${r.right - S.left}px`; hb.style.cssText = `left:${r.left - S.left}px;top:${r.bottom - S.top + 16}px;width:${r.width}px`; pill.style.cssText = `left:${r.left - S.left + r.width / 2}px;top:${r.bottom - S.top + 40}px`; };
    track();
    return { from: 60, to: 42, unit: 'ch', name: 'measure', guides: () => [{ el: rim, kind: 'v' }, { el: hb, kind: 'beam' }, { el: pill, kind: 'pill' }],
      ease: (on) => { t.style.transition = on ? `max-width ${T.move}ms ${SPRING}` : ''; }, apply: (v) => { t.style.maxWidth = `${v}ch`; }, track, reset: () => { t.style.transition = ''; t.style.maxWidth = '60ch'; track(); } };
  }],
  ['Tap target', '28px → 44px: the reach grows, the icon stays', (s) => {
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;padding:0"><span class="hit" style="position:relative;display:grid;place-items:center;width:28px;height:28px;border-radius:8px"><svg viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M6 6l12 12M18 6 6 18" stroke="#111" stroke-width="2.2" stroke-linecap="round"/></svg></span></div><i class="g ring"></i><i class="g pill"></i>`;
    const hit = s.querySelector('.hit'), ring = s.querySelector('.ring'), pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(), r = hit.getBoundingClientRect(); ring.style.cssText = `left:${r.left - S.left}px;top:${r.top - S.top}px;width:${r.width}px;height:${r.height}px;border-radius:10px;background:color-mix(in oklab, var(--c) 10%, transparent)`; pill.style.cssText = `left:${r.left - S.left + r.width / 2}px;top:${r.bottom - S.top + 22}px`; };
    track();
    return { from: 28, to: 44, unit: 'px', name: 'hit target', guides: () => [{ el: ring, kind: 'beam' }, { el: pill, kind: 'pill' }],
      ease: (on) => { hit.style.transition = on ? `width ${T.move}ms ${SPRING}, height ${T.move}ms ${SPRING}` : ''; }, apply: (v) => { hit.style.width = hit.style.height = `${v}px`; }, track, reset: () => { hit.style.transition = ''; hit.style.width = hit.style.height = '28px'; track(); } };
  }],
  ['Number columns', 'proportional → tabular figures: the digits fall into columns', (s) => {
    const nums = ['$1,204.50', '$48,200.00', '$911.11'];
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;padding:0"><div class="col" style="font:600 18px/1.6 system-ui;text-align:right">${nums.map((n) => `<div>${n}</div>`).join('')}</div></div>${Array.from({ length: 9 }, () => '<i class="g vl dc" style="top:auto;bottom:auto"></i>').join('')}<i class="g pill"></i>`;
    const col = s.querySelector('.col'), dcs = [...s.querySelectorAll('.dc')], pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(), r = col.getBoundingClientRect(), last = col.lastElementChild, rg = document.createRange(), node = col.children[1].firstChild;
      dcs.forEach((d, i) => { const at = node.length - 1 - i; if (at < 0) { d.style.display = 'none'; return; } rg.setStart(node, at); rg.setEnd(node, at + 1); const q = rg.getBoundingClientRect(); d.style.cssText = `left:${q.left - S.left}px;top:${r.top - S.top - 6}px;height:${r.height + 12}px;display:${d.style.display}`; });
      pill.style.cssText = `left:${r.left - S.left + r.width / 2}px;top:${r.bottom - S.top + 28}px`; };
    track();
    return { labels: ['proportional', 'tabular-nums'], guides: () => [...dcs.map((el) => ({ el, kind: 'v' })), { el: pill, kind: 'pill' }],
      ease: () => {}, apply: () => { col.animate([{ filter: 'blur(0)' }, { filter: 'blur(1.2px)', offset: .4 }, { filter: 'blur(0)' }], { duration: T.move }); setTimeout(() => { col.style.fontVariantNumeric = 'tabular-nums'; }, T.move * 0.4); }, track,
      reset: () => { col.style.fontVariantNumeric = ''; track(); } };
  }],
  ['Weight', '800 → 600: the heading eases to one of your weights', (s) => {
    s.innerHTML = `<div class="pg" style="display:grid;place-items:center;padding:0"><p class="t" style="margin:0;font:800 30px/1.1 system-ui;letter-spacing:-.01em">Usage this month</p></div><i class="g sq"></i><i class="g pill"></i>`;
    const t = s.querySelector('.t'), sq = s.querySelector('.sq'), pill = s.querySelector('.pill');
    const track = () => { const S = s.getBoundingClientRect(), r = t.getBoundingClientRect(); sq.style.cssText = `left:${r.left - S.left - 6}px;top:${r.top - S.top - 4}px;width:${r.width + 12}px;height:${r.height + 8}px;border-style:dashed`; pill.style.cssText = `left:${r.left - S.left + r.width / 2}px;top:${r.bottom - S.top + 26}px`; };
    track();
    return { from: 800, to: 600, step: 100, unit: '', name: 'semibold', guides: () => [{ el: sq, kind: 'beam' }, { el: pill, kind: 'pill' }],
      ease: (on) => { t.style.transition = on ? `font-weight ${T.move}ms ${SPRING}` : ''; }, apply: (v) => { t.style.fontWeight = v; }, track, reset: () => { t.style.transition = ''; t.style.fontWeight = 800; track(); } };
  }],
];

// one tile's stage in a host of its own (a shadow root), and how to play it again from the start
function stageTile(host, build, tokensCss = '') {
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' }); root.innerHTML = `<style>${tokensCss}${MOTION_CSS}</style><div class="stage"></div>`;
  const stage = root.querySelector('.stage'); const spec = build(stage);
  for (const g of stage.querySelectorAll('.g')) g.style.opacity = 0;
  return async () => { spec.reset(); stage.getAnimations({ subtree: true }).forEach((a) => a.cancel()); for (const g of stage.querySelectorAll('.g')) g.style.opacity = 0; await wait(300); for (const g of stage.querySelectorAll('.g')) g.style.opacity = ''; await playTile(stage, spec); };
}
// One tile by its title, on its own (the docs' "What Plumber checks" shows the fix of a check with it): { play, title, line }
export function mountTile(host, title, { tokensCss = '' } = {}) {
  const tile = MOTION_TILES.find((t) => Array.isArray(t) && t[0] === title);
  if (!tile) return null;
  return { play: stageTile(host, tile[2], tokensCss), title: tile[0], line: tile[1] };
}
export function mountMotionBoard(board, { tokensCss = '', autoplay = false } = {}) {
  board.classList.add('mo-board');
  const runs = [];
  for (const tile of MOTION_TILES) {
    if (typeof tile === 'string') { const h = document.createElement('h3'); h.textContent = tile.replace(/—/g, '').trim(); board.append(h); continue; }
    const [title, sub, build] = tile;
    const sec = document.createElement('section'); sec.className = 'tile'; sec.innerHTML = `<header><h2>${title}</h2><p>${sub}</p><button type="button">▶ Play</button></header>`;
    const host = document.createElement('div'); sec.append(host); board.append(sec);
    const run = stageTile(host, build, tokensCss);
    runs.push(run);
    sec.querySelector('header button').onclick = run; // each tile plays on its own
  }
  const all = () => runs.forEach((r, i) => setTimeout(r, i * 260));
  if (autoplay) all();
  return { playAll: all, runs };
}

// ── on the page: Clean up's show ───────────────────────────────
// The same guides drawn over your own elements while Clean up plays (show.js play, playAll), so what the docs page
// shows is what your page does. A step hands its places (bands: rect() each, a kind; padding also its element), its
// value before and after, the name it lands on, and its look (the pass it belongs to). Each look is its tile's:
//   text     a cap line and a baseline at every place
//   pad      the box's edge and its padding's inner edge, at every place
//   measure  the two sides of a space between two blocks (a margin or a gap)
//   height   a control's top and bottom
//   ring     a dashed ring round each place (colour, shadow, timing, disabled)
//   square   a square round each icon
//   arc      an arc on each corner
// The first place of each step carries the I-beam (where there is a length to measure) and the pill: it rolls while
// the page moves, turns sky and names the step when it lands, and the guides go.
const P = (n) => `.mo-page .mo-${n}`;
const PAGE_CSS = `
  .mo-page { position: fixed; inset: 0; pointer-events: none; z-index: 1; --c: var(--pl-coral); }
  .mo-page[data-landed] { --c: var(--pl-sky); }
  ${guideRules(P)}
`;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export class PageGuides {
  #layer; #frame = 0; #groups = [];
  constructor(root) {
    if (!root.querySelector('style[data-mo-page]')) { const st = Object.assign(document.createElement('style'), { textContent: PAGE_CSS }); st.setAttribute('data-mo-page', ''); root.append(st); }
    this.#layer = Object.assign(document.createElement('div'), { className: 'mo-page' });
    this.#layer.setAttribute('aria-hidden', 'true');
    root.append(this.#layer);
  }
  can(step) { return (step?.bands?.() ?? []).length > 0; }
  #lookOf(step, band) { return step.look ?? (band.kind === 'line' ? 'text' : band.kind === 'pad' ? 'pad' : band.kind === 'measure' ? 'measure' : 'ring'); }
  // one step or several (spacing measures all its steps at once)
  async in(steps, signal) {
    this.clear();
    const list = Array.isArray(steps) ? steps : [steps];
    const make = (n) => { const el = document.createElement('i'); el.className = `mo-g mo-${n}`; this.#layer.append(el); return el; };
    for (const step of list) {
      const bands = step.bands().slice(0, 12); if (!bands.length) continue;
      const look = this.#lookOf(step, bands[0]), lengthy = ['text', 'pad', 'measure', 'height'].includes(look);
      const piece = { ring: 'ring', square: 'sq', arc: 'arc' }[look];
      const places = bands.map((b) => ({ b, a: make(piece ?? 'hl'), z: piece ? null : make('hl') }));
      const from = step.from ?? step.chip?.from, to = step.to, num = isNum(from) && isNum(to);
      const unit = step.unit ?? (look === 'text' || look === 'pad' || look === 'measure' || look === 'height' || look === 'arc' ? 'px' : '');
      const g = { step, look, places, beam: lengthy ? make('beam') : null, pill: make('pill'), num, from, to, unit, name: step.name ?? '', vals: num ? roll(Math.round(from), Math.round(to)) : null };
      g.pill.innerHTML = num ? pillHtml(g.vals, unit) : `${from ?? ''}${isNum(from) ? unit : ''}`;
      this.#groups.push(g);
    }
    const draw = () => { for (const g of this.#groups) this.#place(g); this.#frame = requestAnimationFrame(draw); };
    draw();
    if (signal?.aborted || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const anims = [];
    for (const g of this.#groups) {
      g.places.forEach((p, i) => { for (const el of [p.a, p.z].filter(Boolean)) anims.push(el.classList.contains('mo-hl')
        ? animate(el, [{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], { duration: T.guides, delay: Math.min(i, 6) * 40, easing: 'cubic-bezier(.2,.8,.2,1)' })
        : animate(el, [{ opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1 }], { duration: T.guides, delay: Math.min(i, 6) * 40, easing: 'cubic-bezier(.34,1.56,.64,1)' })); });
      for (const el of [g.beam, g.pill].filter(Boolean)) anims.push(animate(el, [{ opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1 }], { duration: T.guides * 0.8, delay: 120, easing: 'cubic-bezier(.34,1.56,.64,1)' }));
    }
    await Promise.all(anims).catch(() => {});
  }
  // where each piece sits now, from the live places (the page moves under the show)
  #place(g) {
    let first = null;
    for (const p of g.places) {
      const r = p.b.rect?.(), off = !r || r.width < 0.5 || r.bottom < 0 || r.top > innerHeight || (g.look !== 'measure' && r.height < 0.5);
      for (const el of [p.a, p.z].filter(Boolean)) el.style.visibility = off ? 'hidden' : '';
      if (off) continue;
      let y1, y2, x = r.left, w = r.width;
      if (g.look === 'text') { y1 = r.top + r.height * 0.24; y2 = r.top + r.height * 0.8; x -= 10; w += 20; }
      else if (g.look === 'pad') { const el = p.b.el, pt = el ? parseFloat(getComputedStyle(el).paddingTop) || 0 : 0; y1 = r.top; y2 = r.top + pt; x -= 6; w += 12; }
      else if (g.look === 'measure' || g.look === 'height') { y1 = r.top; y2 = r.bottom; x -= 6; w += 12; }
      const at = (el, css) => { el.style.cssText = css + (el.style.visibility ? `;visibility:${el.style.visibility}` : ''); };
      if (g.look === 'ring') at(p.a, `left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px;border-radius:${(parseFloat(getComputedStyle(p.b.el ?? document.body).borderTopLeftRadius) || 6) + 6}px`);
      else if (g.look === 'square') at(p.a, `left:${r.left - 3}px;top:${r.top - 3}px;width:${r.width + 6}px;height:${r.height + 6}px`);
      else if (g.look === 'arc') { const rad = Math.max(6, Math.min(r.width, r.height) * 0.25); at(p.a, `left:${r.left - 5}px;top:${r.top - 5}px;width:${rad * 2 + 10}px;height:${rad * 2 + 10}px;border-top-left-radius:${rad + 5}px`); }
      else { at(p.a, `left:${x}px;top:${y1}px;width:${w}px`); at(p.z, `left:${x}px;top:${y2}px;width:${w}px`); }
      first ??= { r, y1, y2, x };
    }
    for (const el of [g.beam, g.pill].filter(Boolean)) el.style.visibility = first ? '' : 'hidden';
    if (!first) return;
    if (g.beam) { g.beam.style.left = `${first.x - 14}px`; g.beam.style.top = `${first.y1}px`; g.beam.style.height = `${Math.max(1.5, first.y2 - first.y1)}px`; }
    const py = g.beam ? (first.y1 + first.y2) / 2 : first.r.top - 18, px = g.beam ? Math.max(34, first.x - 46) : first.r.left + first.r.width / 2;
    // whole inside the window: a wide value by the left edge, or a place by the top, would cut the pill
    const hw = g.pill.offsetWidth / 2 + 6, hh = g.pill.offsetHeight / 2 + 4;
    const x = Math.max(hw, Math.min(innerWidth - hw, px)), y = py >= hh ? py : g.beam ? hh : first.r.top + first.r.height + hh + 6;
    g.pill.style.left = `${x}px`; g.pill.style.top = `${y}px`;
  }
  // the page is moving: each number rolls with it; a name crosses over halfway
  move() {
    for (const g of this.#groups) {
      if (g.num) g.pill.querySelector('.roll > span')?.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-(g.vals.length - 1) * 22}px)` }], { duration: BEAT.move, easing: SPRING, fill: 'both' });
      else setTimeout(() => { if (g.pill.isConnected) g.pill.textContent = `${g.to ?? ''}`; }, BEAT.move * 0.35);
    }
  }
  // it landed: the pills turn to the scale's colour, name the step, settle
  land() { this.#layer.setAttribute('data-landed', ''); for (const g of this.#groups) { g.pill.innerHTML = g.num ? pillHtml([Math.round(g.to)], g.unit, g.name) : `${g.to ?? ''}`; g.pill.animate([{ scale: 1 }, { scale: 1.08 }, { scale: 1 }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' }); } }
  async out(signal) { if (!signal?.aborted) await Promise.all([...this.#layer.children].map((el) => animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: T.out, easing: 'ease-out' }))).catch(() => {}); this.clear(); }
  clear() { cancelAnimationFrame(this.#frame); this.#frame = 0; this.#groups = []; this.#layer.replaceChildren(); this.#layer.removeAttribute('data-landed'); }
  remove() { this.clear(); this.#layer.remove(); }
}

// the tiles' own beats and pieces, for the checks' examples (check-motion.js): one motion for every fix (principle 35b)
export { T as TILE_BEATS, roll as rollValues, pillHtml, animate as animateTo, wait as waitFor, guideRules };
