/* ─────────────────────────────────────────────────────────
 * GRAVITY · React Plumber (docs/design/onboarding.md, "The page": the hero, chosen 2026-11-03)
 *
 * Every place in your code that types a text size by hand, as a mark near the step of your scale it's closest to.
 * Drawn from the overlay's own pieces: the steps are scale-marks.js steps (quiet: names as words, a pill only while
 * pointed at), the places are its place marks (on a canvas, in the same hues), the count is its rolling count, the
 * action is language.js's pl-act. Type is the page scale (tokens.css --pl-page-*): a title and one line above, the
 * drawing, then the count and the action as one row; nothing loud at rest.
 *
 *  arrival    the steps appear left to right; then the places fall onto their spots with one small bounce, once
 *  rest       a slow drift round each place's spot; paused while off screen or while the tab is hidden
 *  point      a step: it shows `pointed` (sky hatch, its value), its places come forward, the rest fade back;
 *             a cluster of places: the readout says that size, how it's written, the step it's nearest, and a dashed
 *             sky guide runs to that step
 *  click      a step pulls only its own places in and shows `pulled` (mint, +n); click again to let them go
 *  snap all   places leave nearest-first, a wave across the scale, and spring into their step; the count rolls up
 *  let go     every place goes back
 *  keys       Tab to the plot; ← → walk the steps (as pointing does), Home and End go to the ends, Enter or Space
 *             pulls the step in focus, Esc lets everything go
 *  reader     a table of every step's numbers stands in for the drawing; the new count is announced
 *  reduced    no drift, no fall: places sit at their spots, and pulling moves them at once
 *  empty      nothing typed by hand, or no sizes in the theme: the plot says so and the action goes
 * ───────────────────────────────────────────────────────── */
import { esc } from './choices.js';
import { step as stepMark, place, drawPlace, count as countMark, rollCount } from './scale-marks.js';
import { SETTLE, DETENT, spring, ms, stagger } from './motion.js';

const nf = new Intl.NumberFormat('en');
const plural = (n, one, many) => `${nf.format(n)} ${n === 1 ? one : many}`;
const fmt = (px) => `${+(+px).toFixed(2)}px`;

export const GRAVITY_CSS = `
  .gv { position: relative; overflow: hidden; }
  .gv-head { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px 24px; padding: var(--pl-page-inset) var(--pl-page-inset) 0; }
  .gv-head h2 { margin: 0; font: var(--pl-page-title); letter-spacing: var(--pl-tracking-title); }
  .gv-head p { margin: 2px 0 0; font: var(--pl-page-small); color: var(--pl-ink-2); }
  .gv-key { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-left: auto; font: var(--pl-page-meta); color: var(--pl-ink-2); }
  .gv-key span { display: inline-flex; align-items: center; gap: 7px; }
  .gv-key .sc-place { scale: 1.34; }
  .gv-plot { position: relative; height: 320px; }
  .gv-plot canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; outline: none; touch-action: manipulation; }
  .gv-plot canvas:focus-visible { box-shadow: inset 0 0 0 2px var(--pl-sky); }
  .gv-steps { position: absolute; inset: 0; pointer-events: none; }
  .gv-steps .sc-step { position: absolute; translate: -50% calc(-26px - var(--r)); opacity: 0; transition: opacity var(--pl-dur-build) var(--pl-ease-out); }
  .gv-steps .sc-step.in { opacity: 1; }
  .gv-steps .sc-step[data-crowded]:not([data-state="pointed"]) .pl-tag { opacity: 0; }
  .gv-read { position: absolute; z-index: 2; max-width: 300px; padding: 10px 12px; border-radius: var(--pl-radius-row); pointer-events: none; background: var(--pl-paper-2);
    box-shadow: 0 0 0 1px var(--pl-rule), 0 12px 32px -16px rgb(0 0 0 / .45); font: var(--pl-page-meta); color: var(--pl-ink-2); }
  .gv-read b { display: block; margin-bottom: 2px; font: 600 14px/20px var(--pl-sans); color: var(--pl-ink); }
  .gv-read code { display: block; margin-bottom: 4px; font: 500 12px/18px var(--pl-mono); color: var(--pl-ink-2); }
  .gv-read .to { color: var(--pl-ink); }
  .gv[data-empty] .gv-plot { height: 160px; }
  .gv-empty { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; font: var(--pl-page-title); }
  .gv-empty small { display: block; font: var(--pl-page-small); color: var(--pl-ink-2); }
  .gv-foot { display: flex; align-items: center; gap: 16px; padding: var(--pl-space-6) var(--pl-page-inset) var(--pl-page-inset); border-top: 1px solid var(--pl-rule); }
  .gv-foot .pl-act { margin-left: auto; height: 40px; padding: 0 18px; font-size: 14px; }
  .gv .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  @media (max-width: 720px) { .gv-key { margin-left: 0; } .gv-head { padding: var(--pl-space-6) var(--pl-space-6) 0; } .gv-foot { padding: var(--pl-space-6); } }
  @media (prefers-reduced-motion: reduce) { .gv-steps .sc-step { transition: none; } }
`;

export class Gravity {
  /**
   * @param el      where to draw (inside a shadow root that carries tokens.css, LANGUAGE_CSS, SCALE_CSS, GRAVITY_CSS)
   * @param steps   your scale: [{ name, px, uses }]
   * @param strays  sizes typed by hand: [{ px, places, near, copy, scaled, written: [{ text, n }] }]
   */
  constructor(el, { steps, strays }) {
    this.el = el;
    this.steps = steps.slice().sort((a, b) => a.px - b.px);
    this.strays = strays;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.onScale = this.steps.reduce((n, s) => n + s.uses, 0);
    this.byHand = strays.reduce((n, s) => n + s.places, 0);
    this.render();
    if (this.steps.length && this.byHand) this.start();
  }

  render() {
    const { steps, strays, onScale, byHand } = this;
    const empty = !steps.length ? ['No scale to draw yet', 'Add text sizes to your theme, and this fills in.'] : !byHand ? ['Every text size uses your scale', 'Nothing typed by hand.'] : null;
    this.el.innerHTML = `<div class="gv pl-card sc-quiet"${empty ? ' data-empty' : ''}>
      <div class="gv-head"><div><h2>Where your text sizes land</h2>${empty ? '' : `<p>Each mark is a place in your code that types a size by hand, next to the size it's closest to.</p>`}</div>
        ${empty ? '' : `<div class="gv-key" aria-hidden="true"><span>${place('on')}On your scale</span><span>${place('typed')}Your size, typed by hand</span><span>${place('off')}Not on your scale</span></div>`}</div>
      <div class="gv-plot">${empty ? `<div class="gv-empty"><span>${esc(empty[0])}<small>${esc(empty[1])}</small></span></div>` : `<canvas tabindex="0" role="img" aria-describedby="gv-table" aria-label="${esc(`Your ${steps.length} text sizes with ${plural(byHand, 'hand-typed place', 'hand-typed places')} around them`)}"></canvas><div class="gv-steps"></div>`}</div>
      <div class="gv-foot">${countMark(onScale, 'places use your scale')}${empty ? '' : '<button type="button" class="pl-act" aria-pressed="false">Snap to your scale</button>'}</div>
      <table class="sr" id="gv-table"><caption>Your text sizes, and the places that type a size close to each</caption><tr><th>Size</th><th>Pixels</th><th>Places that use it</th><th>Places typed by hand close to it</th></tr>${steps.map((s) => `<tr><td>${esc(s.name)}</td><td>${fmt(s.px)}</td><td>${s.uses}</td><td>${strays.filter((x) => x.near === s.name).reduce((n, x) => n + x.places, 0)}</td></tr>`).join('')}</table>
      <span class="sr" aria-live="polite"></span>
    </div>`;
  }

  start() {
    const root = this.el.querySelector('.gv'), canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d'), layer = root.querySelector('.gv-steps');
    const button = root.querySelector('.pl-act'), countEl = root.querySelector('.sc-count'), live = root.querySelector('[aria-live]');
    const { steps, strays, reduce, onScale } = this;
    let T = {}, W = 0, H = 0, raf = 0, visible = true, hover = null, focus = -1, every = false, said = onScale, shown = onScale, input = 'mouse';
    const read = () => { const cs = getComputedStyle(root); for (const n of ['--pl-coral', '--pl-butter', '--pl-mint', '--pl-sky', '--pl-rule']) T[n] = cs.getPropertyValue(n).trim(); };
    read();
    const t0 = performance.now(), arrive = ms(root, '--pl-dur-arrive'); let last = t0, snapAt = 0;
    const lo = Math.log(8), hi = Math.log(64), M = 56;
    const X = (px) => M + ((Math.log(Math.min(Math.max(px, 8), 64)) - lo) / (hi - lo)) * (W - 2 * M);
    const cy = () => H * 0.48;
    const rand = (() => { let a = 11; return () => (a = (a * 16807) % 2147483647) / 2147483647; })();
    const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;

    // the steps: real step marks, one per step of your scale, kept in sync with what they hold
    const anchors = steps.map((s, i) => {
      const at = document.createElement('div'); at.innerHTML = stepMark({ name: s.name.replace(/^text-/, ''), n: s.px, uses: s.uses });
      const mark = at.firstElementChild; layer.append(mark);
      setTimeout(() => mark.classList.add('in'), reduce ? 0 : stagger(root, i, steps.length));
      return { s, mark, inside: 0, state: '', took: -1, r: 0 };
    });
    const anchorOf = (name) => anchors.find((a) => a.s.name === name);
    const parts = [];
    for (const s of strays) for (let k = 0; k < s.places; k++)
      parts.push({ s, a: anchorOf(s.near), jx: gauss() * 4, jy: gauss() * (32 + Math.sqrt(s.places) * 10), ph: rand() * 6.28, f: 0.4 + rand() * 0.6, ta: rand() * 6.28, tr: Math.sqrt(rand()),
        hx: 0, hy: 0, x: 0, y: 0, vx: 0, vy: 0, mode: reduce ? 'spring' : 'wait', wake: 0, bounced: false, delay: 0, home: true });
    const wants = (p) => p.a && (every || p.a.local);
    const radius = (a) => 9 + Math.sqrt(a.s.uses + a.inside) * 1.7;

    const size = () => {
      const dpr = devicePixelRatio || 1; W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const a of anchors) { a.mark.style.left = `${X(a.s.px)}px`; a.mark.style.top = `${cy()}px`; }
      // names that would touch a busier step's name are hidden at rest and shown while pointed at
      const taken = [];
      for (const a of anchors.slice().sort((p, q) => q.s.uses - p.s.uses)) {
        const w = (a.mark.querySelector('.pl-tag')?.offsetWidth ?? 24) / 2 + 4, x = X(a.s.px);
        const crowded = taken.some(([l, r]) => x - w < r && x + w > l);
        a.mark.toggleAttribute('data-crowded', crowded);
        if (!crowded) taken.push([x - w, x + w]);
      }
      for (const p of parts) {
        p.hx = X(p.s.px) + p.jx; p.hy = cy() + Math.max(-cy() + 20, Math.min(H - cy() - 64, p.jy));
        if (p.mode === 'wait') { p.x = p.hx; p.y = -10 - rand() * H * 0.5; p.wake = 420 + (p.hx / W) * 520 + rand() * 420; }
        if (reduce) { p.x = p.hx; p.y = p.hy; }
      }
    };
    const target = (p, now) => {
      if (wants(p) && now - snapAt > p.delay) { const r = radius(p.a) * 0.7 * p.tr; return [X(p.a.s.px) + Math.cos(p.ta) * r, cy() + Math.sin(p.ta) * r, true]; }
      const t = now / 1000;
      return [p.hx + (reduce ? 0 : Math.sin(t * p.f + p.ph) * 2.2), p.hy + (reduce ? 0 : Math.cos(t * p.f * 0.8 + p.ph) * 3), false];
    };
    const tick = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000); last = now;
      for (const a of anchors) a.inside = 0;
      for (const p of parts) {
        if (p.mode === 'wait') { if (now - t0 < p.wake) continue; p.mode = 'fall'; p.vy = 120 + rand() * 120; }
        const [tx, ty, going] = target(p, now);
        if (p.mode === 'fall') {
          // falling: gravity, one small bounce where it lands, then the spring holds it
          p.vy += 2000 * dt; p.y += p.vy * dt; p.x += (tx - p.x) * 0.2;
          if (p.y >= ty) { p.y = ty; if (!p.bounced && p.vy > 120) { p.vy = -p.vy * 0.22; p.bounced = true; } else { p.mode = 'spring'; p.vy = 0; } }
          continue;
        }
        if (reduce) { p.x = tx; p.y = ty; }
        else spring(p, tx, ty, going ? DETENT : SETTLE, dt);
        p.home = !going;
        if (going && Math.hypot(tx - p.x, ty - p.y) < 3) p.a.inside++;
      }
      // each step mark shows what it holds: pointed, pulled (+n), its use, or unused
      anchors.forEach((a, i) => {
        const hot = hover?.a === a && !hover.stray || focus === i;
        const state = hot ? 'pointed' : a.inside ? 'pulled' : a.s.uses ? 'rest' : 'unused';
        const r = radius(a);
        if (Math.abs(r - a.r) > 0.2) { a.r = r; a.mark.style.setProperty('--r', `${r.toFixed(1)}px`); }
        if (state !== a.state) { a.state = state; a.mark.dataset.state = state; }
        const v = state === 'pulled' ? `+${a.inside}` : fmt(a.s.px).replace('px', '');
        if (v !== a.took) { a.took = v; a.mark.querySelector('.v').textContent = v; }
      });
      // the count rolls as places land
      const n = onScale + anchors.reduce((k, a) => k + a.inside, 0);
      shown += (n - shown) * (reduce ? 1 : 0.2);
      const at = Math.abs(n - shown) < 0.5 ? n : Math.round(shown);
      if (at !== this.at) { this.at = at; rollCount(countEl, at); }
      if (at === n && n !== said) { said = n; live.textContent = `${plural(n, 'place', 'places')} on your scale`; }
    };
    const draw = (now) => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = T['--pl-rule']; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, cy()); ctx.lineTo(W - 20, cy()); ctx.stroke();
      const lit = hover?.stray ? (p) => p.s === hover.stray : hover?.a ? (p) => p.a === hover.a : focus >= 0 ? (p) => p.a === anchors[focus] : null;
      const intro = reduce || !arrive ? 1 : Math.min(1, (now - t0) / arrive);
      for (const p of parts) {
        if (p.mode === 'wait') continue;
        ctx.globalAlpha = (lit && !lit(p) ? 0.14 : p.s.scaled ? 0.7 : 1) * intro;
        // two cues: a mint disc on your scale, a butter ring your size typed by hand, a coral square not on your scale
        const tone = wants(p) && !p.home ? 'on' : p.s.copy ? 'typed' : 'off';
        ctx.fillStyle = ctx.strokeStyle = T[tone === 'on' ? '--pl-mint' : tone === 'typed' ? '--pl-butter' : '--pl-coral'];
        drawPlace(ctx, tone, p.x, p.y);
      }
      ctx.globalAlpha = 1;
      if (hover?.stray && hover.a) {
        const sx = X(hover.stray.px), ax = X(hover.a.s.px);
        ctx.strokeStyle = T['--pl-sky']; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.25;
        ctx.beginPath(); ctx.moveTo(sx, cy() - 8); ctx.quadraticCurveTo((sx + ax) / 2, cy() - 52, ax, cy() - radius(hover.a) - 2); ctx.stroke(); ctx.setLineDash([]);
      }
    };
    // the loop stops when the plot is off screen, the tab is hidden, or the plot was taken off the page for good
    const frame = (now) => { if (!visible || document.hidden || !canvas.isConnected) { raf = 0; return; } tick(now); draw(now); raf = requestAnimationFrame(frame); };
    const run = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };

    // the readout, for a cluster pointed at (a step says its own value on its mark)
    const readout = root.querySelector('.gv-plot').appendChild(document.createElement('div'));
    readout.className = 'gv-read'; readout.hidden = true;
    const sayCluster = (s, mx, my) => {
      const near = anchorOf(s.near);
      readout.innerHTML = `<b>${fmt(s.px)} · ${plural(s.places, 'place', 'places')}</b><code>${s.written.map((w) => `${esc(w.text)} ×${w.n}`).join(' · ')}</code><span class="to">${s.copy ? `Your scale has it: ${esc(s.near)}` : `Nearest on your scale: ${esc(s.near)} (${fmt(near.s.px)})`}</span>`;
      readout.hidden = false; readout.style.left = `${Math.min(mx + 14, W - 310)}px`; readout.style.top = `${Math.max(8, my + 14)}px`;
    };
    const sayStep = (a) => {
      const n = strays.filter((s) => s.near === a.s.name).reduce((k, s) => k + s.places, 0);
      readout.innerHTML = `<b>${esc(a.s.name)} · ${fmt(a.s.px)}</b>${a.s.uses ? plural(a.s.uses, 'place uses it', 'places use it') : 'Not used anywhere'}${n ? `<br>${plural(n, 'place types', 'places type')} a size close to it<br><span class="to">${{ key: 'Enter', touch: 'Tap' }[input] ?? 'Click'} to ${a.local || every ? 'let them go' : 'pull them in'}</span>` : ''}`;
      const x = X(a.s.px); readout.hidden = false; readout.style.left = `${Math.min(x + 18, W - 310)}px`; readout.style.top = `${cy() + radius(a) + 34}px`;
    };
    const hush = () => { readout.hidden = true; };
    const point = (e) => {
      input = e.pointerType === 'touch' ? 'touch' : 'mouse';
      const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      const a = anchors.find((a) => Math.hypot(mx - X(a.s.px), my - cy()) < radius(a) + 8);
      if (a) { hover = { a }; canvas.style.cursor = 'pointer'; sayStep(a); run(); return; }
      const s = Math.abs(my - cy()) < 150 && !every ? strays.slice().sort((p, q) => Math.abs(X(p.px) - mx) - Math.abs(X(q.px) - mx) || q.places - p.places)[0] : null;
      if (s && Math.abs(X(s.px) - mx) < 7) { hover = { stray: s, a: anchorOf(s.near) }; canvas.style.cursor = ''; sayCluster(s, mx, my); run(); return; }
      hover = null; canvas.style.cursor = ''; hush();
    };
    canvas.addEventListener('pointermove', point);
    canvas.addEventListener('pointerleave', () => { hover = null; hush(); });
    const toggle = (a) => {
      a.local = !a.local; snapAt = performance.now();
      for (const p of parts) if (p.a === a) p.delay = reduce ? 0 : rand() * 180;
      say();
      if (hover?.a === a || focus >= 0) sayStep(a);
      run();
    };
    // a click or tap reads where it landed: a tap has no pointermove before it
    canvas.addEventListener('click', (e) => { point(e); if (hover?.a && !hover.stray) toggle(hover.a); });
    const firstFocus = () => { if (focus < 0) focus = anchors.reduce((b, a, i) => (a.s.uses > anchors[b].s.uses ? i : b), 0); };
    canvas.addEventListener('focus', () => { if (!canvas.matches(':focus-visible')) return; input = 'key'; firstFocus(); sayStep(anchors[focus]); run(); });
    canvas.addEventListener('blur', () => { focus = -1; hush(); });
    canvas.addEventListener('keydown', (e) => {
      input = 'key'; hover = null; firstFocus();
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); focus = (focus + (e.key === 'ArrowRight' ? 1 : -1) + anchors.length) % anchors.length; sayStep(anchors[focus]); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); focus = e.key === 'Home' ? 0 : anchors.length - 1; sayStep(anchors[focus]); }
      else if ((e.key === 'Enter' || e.key === ' ') && focus >= 0) { e.preventDefault(); toggle(anchors[focus]); }
      else if (e.key === 'Escape') snap(false);
      run();
    });
    // what the count means right now: today, or a preview of some or all of it pulled in
    const say = () => {
      const some = anchors.filter((a) => a.local).map((a) => a.s.name);
      countEl.querySelector('.say').textContent = every ? 'places on your scale, if every size snapped to it'
        : some.length ? `places on your scale, with the sizes close to ${some.length > 2 ? `${some.length} of your sizes` : some.join(' and ')} pulled in` : 'places use your scale';
    };
    const snap = (on) => {
      every = on; snapAt = performance.now();
      if (!on) anchors.forEach((a) => { a.local = false; });
      // nearest first, so the pull reads as a wave across the scale
      for (const p of parts) p.delay = reduce ? 0 : Math.abs(p.hx - (p.a ? X(p.a.s.px) : p.hx)) * 3 + rand() * 260;
      button.setAttribute('aria-pressed', String(on)); button.textContent = on ? 'Let go' : 'Snap to your scale';
      say(); run();
    };
    button.addEventListener('click', () => snap(!every));

    new ResizeObserver(() => { size(); run(); }).observe(canvas);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); }).observe(canvas);
    document.addEventListener('visibilitychange', run);
    // the hues follow the scheme: read them again when it changes
    new MutationObserver(() => { read(); run(); }).observe(this.el.getRootNode().host ?? document.documentElement, { attributes: true, attributeFilter: ['data-scheme', 'class'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { read(); run(); });
    size(); run();
  }
}
