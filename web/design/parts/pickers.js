// The design site's page for token pickers: the control that appears on an element when one of its values is
// hard-coded, and moves it onto your tokens.
//
// The direction (owner, 2026-11-10): it is a visual editor, not a scale. Each property gets the control a visual editor
// gives that property, made small: a border radius is changed by its corner, spacing by the space itself, a colour by
// a swatch. It snaps to your tokens and says the token's name; your hard-coded value is where it starts. Little UI: one
// row beside the element, and a handle on the element itself where the property has a natural one.
//
// One property at a time, on a real piece of UI. Border radius is first.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';

// the options in order of size; the hard-coded value sits among them where it falls, so you can drag back to it
const RADIUS = [{ name: 'none', v: 0 }, { name: '5px', v: 5, hard: true }, { name: 'tag', v: 6 }, { name: 'control', v: 8 }, { name: 'card', v: 12 }, { name: 'full', v: 999 }];

export function mount(host, root, css) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const px = (v) => `${v}px`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); }
    .scene { margin: 0 0 40px; }
    .scene h2 { margin: 0 0 4px; }
    .scene > p { margin: 0 0 16px; }
    .stage { position: relative; display: grid; place-items: center start; padding-left: max(24px, calc(50% - 300px)); min-height: 360px; border-radius: 22px; background: var(--pl-paper-2); overflow: hidden; }

    /* ── the real UI: a plan card, as someone's app draws it (its own look, not ours) ── */
    .app { position: relative; width: 300px; padding: 22px; border-radius: 16px; background: #fff; box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 8px 24px -12px rgb(16 24 40 / .18); font: 14px/20px system-ui, -apple-system, sans-serif; color: #101828; }
    .app .top { display: flex; align-items: center; justify-content: space-between; }
    .app h3 { margin: 0; font: 600 18px/24px system-ui, -apple-system, sans-serif; }
    .app .price { margin: 14px 0 4px; font: 700 34px/1 system-ui, -apple-system, sans-serif; letter-spacing: -0.02em; }
    .app .price small { font-size: 14px; font-weight: 500; color: #667085; letter-spacing: 0; }
    .app ul { margin: 14px 0 18px; padding: 0; list-style: none; color: #475467; display: grid; gap: 6px; }
    .app li::before { content: '✓  '; color: #12b76a; font-weight: 700; }
    .app .cta { display: block; width: 100%; padding: 10px; border: 0; border-radius: 8px; background: #101828; color: #fff; font: 600 14px/20px system-ui, sans-serif; }
    /* the element in hand */
    .badge { position: relative; padding: 3px 10px; background: #f4ebff; color: #6941c6; font: 500 12px/18px system-ui, sans-serif; border-radius: var(--r); }
    .badge.held { outline: 1.5px solid var(--pl-coral); outline-offset: 3px; }
    .badge.held.on-token { outline-color: var(--pl-sky); }
    .badge.held.written { outline-color: var(--pl-mint); }

    /* ── the handle: on the element's corner, where a visual editor puts it. Drag it in or out ── */
    .handle { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 1.5px var(--pl-coral), 0 1px 3px rgb(0 0 0 / .25); cursor: nwse-resize; touch-action: none; z-index: 3;
      transition: left 220ms var(--pl-spring-pop), top 220ms var(--pl-spring-pop), box-shadow 160ms var(--pl-ease-out), scale 160ms var(--pl-ease-out); }
    .handle:hover, .handle.dragging { scale: 1.25; }
    .handle.on-token { box-shadow: 0 0 0 1.5px var(--pl-sky), 0 1px 3px rgb(0 0 0 / .25); }
    .handle.dragging { transition: none; }

    /* ── the row: what a visual editor shows for this property, one line, beside the element ── */
    .row { position: absolute; z-index: 4; display: flex; align-items: center; gap: 2px; height: 34px; padding: 0 4px 0 2px; border-radius: 11px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); font: 500 13px/1 var(--pl-sans); white-space: nowrap; }
    .row .scrub { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: ew-resize; touch-action: none; }
    .row .scrub:hover { background: var(--pl-paper-2); }
    .row .scrub svg { display: block; width: 18px; height: 18px; }
    .row .val { all: unset; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px; border-radius: 8px; cursor: pointer; }
    .row .val:hover, .row .val[aria-expanded="true"] { background: var(--pl-paper-2); }
    .row .val:focus-visible { outline: 2px solid var(--pl-sky); }
    .row .val b { font: 600 13px/1 var(--pl-sans); color: var(--pl-ink); }
    .row .val span { font: 500 12px/1 var(--pl-mono); color: var(--pl-ink-3); }
    .row .val.hard b { color: var(--pl-coral); }
    .row .val .car { width: 8px; height: 8px; margin-left: 2px; border-right: 1.5px solid var(--pl-ink-3); border-bottom: 1.5px solid var(--pl-ink-3); rotate: 45deg; translate: 0 -2px; }
    .row .ok { all: unset; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; color: var(--pl-ink-3); cursor: pointer; }
    .row .ok:hover { background: var(--pl-paper-2); color: var(--pl-ink); }
    .row .ok[data-ready] { background: var(--pl-pink); color: var(--pl-pink-on); }
    .row .ok svg { width: 16px; height: 16px; display: block; }
    .row.written .ok { background: var(--pl-mint); color: var(--pl-mint-on); }

    /* ── the list: your tokens by name, each drawn as the corner it makes ── */
    .list { position: absolute; z-index: 5; min-width: 180px; padding: 5px; border-radius: 12px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); }
    .list[hidden] { display: none; }
    .list button { all: unset; box-sizing: border-box; display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 10px; width: 100%; height: 32px; padding: 0 8px; border-radius: 8px; cursor: pointer; font: 500 13px/1 var(--pl-sans); }
    .list button:hover, .list button[aria-selected="true"] { background: var(--pl-paper-2); }
    .list button span { font: 500 12px/1 var(--pl-mono); color: var(--pl-ink-3); }
    .list .c { width: 16px; height: 16px; border-top: 2px solid var(--pl-ink-2); border-left: 2px solid var(--pl-ink-2); }
    .list .hard { color: var(--pl-coral); }
    .list .hard .c { border-color: var(--pl-coral); border-style: dashed; }
    .list hr { margin: 4px 6px; border: 0; border-top: 1px solid var(--pl-rule); }


    /* ── the value as a reel: the options stacked in order, the field a window onto one of them. At rest only the
       one in the window shows; a step rolls the reel. Dragging opens the window up and down, so the neighbours
       show above and below, fading with distance, and the reel follows the pointer ── */
    .row .val { position: relative; padding: 0 6px 0 8px; }
    .drum { position: relative; display: block; width: 112px; height: 28px; overflow: hidden; }
    .reel { position: absolute; left: 0; right: 0; top: 0; will-change: transform; transition: transform 340ms var(--pl-spring-pop); }
    .reel .it { display: flex; align-items: center; gap: 6px; height: 28px; transition: opacity 200ms var(--pl-ease-out); }
    .reel .it b { font: 600 13px/1 var(--pl-sans); color: var(--pl-ink); }
    .reel .it span { font: 500 12px/1 var(--pl-mono); color: var(--pl-ink-3); }
    .reel .it.hard b, .reel .it.hard span { color: var(--pl-coral); }
    .row.dragging, .row.dragging .val { overflow: visible; }
    .row.dragging .drum { overflow: visible; }
    .row.dragging .val { background: var(--pl-paper-2); cursor: grabbing; }
    .row.dragging .reel { transition: none; }
    .row.settling .drum { overflow: visible; }
    /* the window: two hairlines that hold the one in hand while the reel is open */
    .drum::before, .drum::after { content: ''; position: absolute; left: -8px; right: -6px; height: 1px; background: var(--pl-rule); opacity: 0; transition: opacity 160ms var(--pl-ease-out); }
    .drum::before { top: -1px; } .drum::after { bottom: -1px; }
    .row.dragging .drum::before, .row.dragging .drum::after { opacity: 1; }
    /* a paper behind the open reel, so its neighbours read over the page */
    .row .sheet { position: absolute; left: 32px; width: 130px; top: 50%; height: 28px; translate: 0 -50%; border-radius: 12px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); opacity: 0; pointer-events: none; z-index: -1;
      transition: height 300ms var(--pl-spring-pop), opacity 160ms var(--pl-ease-out); }
    .row.dragging .sheet { height: 156px; opacity: 1; }
    .row .val.bump { animation: bump 180ms var(--pl-ease-out); }
    @keyframes bump { 40% { scale: 1.05; } }
    body.grabbing, :host(.grabbing) { cursor: grabbing; }
    .hint { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; font: 500 12.5px/1 var(--pl-sans); color: var(--pl-ink-3); }
    .hint kbd { font: 600 11px/1 var(--pl-mono); padding: 2px 5px; border-radius: 5px; background: var(--pl-paper); box-shadow: 0 1px 0 var(--pl-rule); }
    @media (prefers-reduced-motion: reduce) { .handle { transition: none; } }
  </style>${TOY_DEFS}
  <section class="scene" id="radius">
    <h2>Border radius</h2>
    <p>The “Popular” badge has a hard-coded 5px. Press on the value and drag up or down (anywhere on the screen): the options roll past in the field and the badge follows. The dot on the badge’s corner and the icon drag the same way. A click on the value opens the list instead. Enter writes it; Esc puts it back.</p>
    <div class="stage" tabindex="0">
      <div class="app">
        <div class="top"><h3>Pro</h3><span class="badge held">Popular</span></div>
        <div class="price">$24<small> / month</small></div>
        <ul><li>Unlimited projects</li><li>Shared themes</li><li>Priority support</li></ul>
        <button type="button" class="cta" tabindex="-1">Upgrade</button>
      </div>
      <i class="handle" role="presentation"></i>
      <div class="row" role="group" aria-label="Border radius">
        <span class="scrub" title="Drag to change">${toyOf('corner')}</span>
        <i class="sheet" aria-hidden="true"></i>
        <button type="button" class="val" aria-haspopup="listbox" aria-expanded="false"><span class="drum"><span class="reel"></span></span><i class="car"></i></button>
        <button type="button" class="ok" aria-label="Write it"><svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
      <div class="list" role="listbox" aria-label="Your radius tokens" hidden></div>
      <p class="hint">drag the value up or down · <kbd>↑</kbd> <kbd>↓</kbd> step · <kbd>↵</kbd> write · <kbd>Esc</kbd> put back</p>
    </div>
  </section>`;

  // ── border radius ──
  const sc = root.querySelector('#radius'), stage = sc.querySelector('.stage');
  const badge = stage.querySelector('.badge'), handle = stage.querySelector('.handle'), row = stage.querySelector('.row'), val = row.querySelector('.val'), ok = row.querySelector('.ok'), list = stage.querySelector('.list');
  const reel = row.querySelector('.reel'), scrub = row.querySelector('.scrub');
  const S = RADIUS, H = 28, last = S.length - 1, HARD = S.findIndex((o) => o.hard);
  reel.innerHTML = S.map((o) => `<span class="it${o.hard ? ' hard' : ''}"><b>${o.name}</b><span>${o.hard ? 'hard-coded' : px(o.v)}</span></span>`).join('');
  const items = [...reel.children];
  // where it is: an index into S; while dragging, `pos` is the reel's continuous position
  let at = HARD, pos = HARD, written = false, dragging = false;
  const shown = (v) => Math.min(v, badge.offsetHeight / 2);
  const place = () => {
    const s = stage.getBoundingClientRect(), b = badge.getBoundingClientRect(), card = badge.closest('.app').getBoundingClientRect();
    const inset = shown(S[at].v) * (1 - Math.SQRT1_2);
    handle.style.left = `${b.left - s.left + inset}px`; handle.style.top = `${b.top - s.top + inset}px`;
    row.style.left = `${card.right - s.left + 14}px`; row.style.top = `${b.top - s.top + b.height / 2 - 17}px`;
    list.style.left = row.style.left; list.style.top = `${b.top - s.top + b.height / 2 + 22}px`;
  };
  // the reel at a position: open while dragging (neighbours fade with distance), shut at rest
  const roll = (p, blur = 0) => {
    reel.style.transform = `translateY(${-p * H}px)`;
    reel.style.filter = blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : '';
    items.forEach((el, i) => { el.style.opacity = dragging ? String(Math.max(0, 1 - Math.abs(i - p) * 0.4)) : ''; });
  };
  const draw = () => {
    const o = S[at], token = !o.hard;
    badge.style.setProperty('--r', `${o.v}px`);
    badge.classList.toggle('on-token', token); handle.classList.toggle('on-token', token);
    if (token && !written) ok.setAttribute('data-ready', ''); else ok.removeAttribute('data-ready');
    list.innerHTML = S.map((t, i) => `<button type="button" role="option" class="${t.hard ? 'hard' : ''}" data-at="${i}" aria-selected="${at === i}"><i class="c" style="border-top-left-radius:${Math.min(t.v, 16)}px"></i>${t.name}<span>${t.hard ? 'hard-coded' : px(t.v)}</span></button>`).join('');
    val.setAttribute('aria-label', `Border radius: ${o.hard ? '5px, hard-coded' : `${o.name}, ${px(o.v)}`}`);
    requestAnimationFrame(place);
  };
  // a new option in hand: the badge takes it, the field gives a small bump you can feel
  const land = (n) => {
    if (n === at) return;
    at = n; draw();
    val.classList.remove('bump'); void val.offsetWidth; val.classList.add('bump');
  };
  const go = (n) => { if (written) return; const k = Math.max(0, Math.min(last, n)); pos = k; land(k); roll(k); };
  const write = () => { if (written || S[at].hard) return; written = true; badge.classList.add('written'); row.classList.add('written'); list.hidden = true; draw(); };
  const putBack = () => { written = false; badge.classList.remove('written'); row.classList.remove('written'); list.hidden = true; go(HARD); };

  // ── drag mode: press and move, anywhere on the screen. Up (or right) is bigger. Past either end it gives a little
  // and springs back. Let go and the reel settles on the nearest option ──
  const drag = (el, e, perPx) => {
    if (written) return;
    try { el.setPointerCapture(e.pointerId); } catch {}
    const x0 = e.clientX, y0 = e.clientY, from = at;
    let moved = false, prev = pos, t0 = performance.now();
    const move = (m) => {
      const d = perPx(m.clientX - x0, m.clientY - y0);
      if (!moved && Math.abs(m.clientX - x0) + Math.abs(m.clientY - y0) < 4) return;
      if (!moved) { moved = true; dragging = true; list.hidden = true; row.classList.add('dragging'); host.classList.add('grabbing'); }
      const raw = from + d;
      const over = raw < 0 ? raw : raw > last ? raw - last : 0;
      pos = over ? (over < 0 ? 0 : last) + Math.sign(over) * Math.min(0.55, Math.abs(over) * 0.35) : raw;
      const now = performance.now(), speed = Math.abs(pos - prev) / Math.max(8, now - t0) * 16;
      prev = pos; t0 = now;
      roll(pos, Math.min(2.4, speed * 3));
      land(Math.max(0, Math.min(last, Math.round(pos))));
    };
    const up = () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      host.classList.remove('grabbing');
      if (!moved) { if (el === val) { list.hidden = !list.hidden; val.setAttribute('aria-expanded', String(!list.hidden)); } return; }
      dragging = false; pos = at;
      row.classList.remove('dragging'); row.classList.add('settling');
      roll(at);
      setTimeout(() => row.classList.remove('settling'), 340);
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  const STEP = 26;
  val.addEventListener('pointerdown', (e) => { if (e.button === 0) { e.preventDefault(); drag(val, e, (dx, dy) => (dx - dy) / STEP); } });
  scrub.addEventListener('pointerdown', (e) => { e.preventDefault(); drag(scrub, e, (dx, dy) => (dx - dy) / STEP); });
  // the dot on the corner: pulling it in along the diagonal rounds the corner more
  handle.addEventListener('pointerdown', (e) => { e.preventDefault(); handle.classList.add('dragging'); drag(handle, e, (dx, dy) => (dx + dy) / 2 / 14); });
  handle.addEventListener('pointerup', () => { handle.classList.remove('dragging'); requestAnimationFrame(place); });
  // a keyboard press on the value still opens the list
  val.addEventListener('click', (e) => { if (e.detail === 0 && !written) { list.hidden = !list.hidden; val.setAttribute('aria-expanded', String(!list.hidden)); } });
  list.addEventListener('click', (e) => { const o = e.target.closest('[data-at]'); if (!o) return; go(Number(o.dataset.at)); list.hidden = true; val.setAttribute('aria-expanded', 'false'); });
  ok.addEventListener('click', () => (written ? putBack() : write()));
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); go(at + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); go(at - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); write(); }
    else if (e.key === 'Escape') { e.preventDefault(); putBack(); }
  });
  new ResizeObserver(place).observe(stage);
  if (still) { handle.style.transition = 'none'; reel.style.transition = 'none'; }
  roll(at); draw();
}
