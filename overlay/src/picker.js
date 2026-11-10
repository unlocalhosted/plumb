// One token picker: the control that moves one hard-coded value onto your tokens (docs/design/interaction-principles.md).
// A row (the property's icon, the value, a tick) beside the element or inside an editor card; its list of tokens; drag
// mode (press and drag anywhere, the value rolls in the direction of travel, a fill shows only while dragging); arrow
// keys, Enter to write, Esc to put back; the tick turns green the moment a token is in hand. Every property and every
// editor uses this one piece, so they all behave alike: the token pickers page and the text card are built from it.
//
//   import { PICKER_CSS, picker } from './picker.js';
//   picker(stage, { name, toy, options, mark, apply, place, handles, into, keys, grab })
//
//   options   in order of size, the hard-coded value among them: [{ name, v, hard? }]
//   mark(o)   what an option looks like in the list (html)
//   apply(o, { token, written })   what an option does to the element
//   place(row, list, o)   where the row and its list sit (a row inside a card can leave this out)
//   handles   the element's own handles: [{ el, perPx(dx, dy), skip?() }]
//   start     where it starts when nothing is hard-coded (an index); format(o) how a value reads (default: px)
//   into      where the row goes (default: the stage); keys: where its keys are heard ('row' for a row in a card of
//             several); grab: where the grabbing cursor shows
import { toyOf } from './toys.js';

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const px = (v) => `${v}px`;

export const PICKER_CSS = `
    /* the property's icon is a toy: pointed at, it tips and grows on the pop spring; pressed (the start of a drag), it
       squashes. A glyph instead acts out its property (glyphs.js) */
    .row .scrub { position: relative; }
    /* a glyph (the editor's hairline icons) is ink, darker when pointed at */
    .row .scrub .g { width: 20px; height: 20px; color: var(--pl-ink-2); transition: color 140ms var(--pl-ease-out), scale 320ms var(--pl-spring-pop), rotate 320ms var(--pl-spring-pop); }
    .row .scrub:hover .g { color: var(--pl-ink); }
    /* a glyph says what it does by its own motion (glyphs.js), so it doesn't also tip and grow */
    .row .scrub:hover svg.g, .row .scrub:active svg.g { scale: 1; rotate: 0deg; }
    .row .scrub svg { transition: scale 320ms var(--pl-spring-pop), rotate 320ms var(--pl-spring-pop); }
    .row .scrub:hover svg { scale: 1.14; rotate: -6deg; }
    .row .scrub:active svg { scale: 1.04 0.92; rotate: 0deg; transition-duration: 90ms; }
    @media (prefers-reduced-motion: reduce) { .row .scrub svg { transition: none; } }
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
    /* the tick answers at once: on one of your tokens it turns green (pale, a pop each time a new token lands);
       written, it is solid green. On the hard-coded value it stays grey: nothing to write */
    .row .ok { transition: background-color 180ms var(--pl-ease-out), color 180ms var(--pl-ease-out); }
    .row .ok[data-ready] { background: color-mix(in oklab, var(--pl-mint) 22%, transparent); color: var(--pl-mint-ink); }
    .row .ok.pop { animation: okpop 320ms cubic-bezier(.34, 1.56, .64, 1); }
    @keyframes okpop { 0% { scale: .8; } 60% { scale: 1.12; } 100% { scale: 1; } }
    .row .ok svg { width: 16px; height: 16px; display: block; }
    .row.written .ok { background: var(--pl-mint); color: var(--pl-mint-on); }

    /* ── the list: your tokens by name, each drawn as the corner it makes ── */
    .list { position: absolute; z-index: 5; min-width: 180px; padding: 5px; border-radius: 12px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); }
    .list[hidden] { display: none; }
    .list button { all: unset; box-sizing: border-box; display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 10px; width: 100%; height: 32px; padding: 0 8px; border-radius: 8px; cursor: pointer; font: 500 13px/1 var(--pl-sans); }
    .list button:hover, .list button[aria-selected="true"] { background: var(--pl-paper-2); }
    .list button span { font: 500 12px/1 var(--pl-mono); color: var(--pl-ink-3); }
    .list .hard { color: var(--pl-coral); }
    .list hr { margin: 4px 6px; border: 0; border-top: 1px solid var(--pl-rule); }


    /* ── the value in the field: one option at a time. When it changes, the new one comes in and the old one goes
       out, in the direction you are moving: going up, the new one rises from below and the old one leaves over
       the top; going down, the reverse. Short, eased, a little blur on the way, nothing else on screen ── */
    .row .val { position: relative; padding: 0 6px 0 8px; }
    .drum { position: relative; display: block; width: 112px; height: 28px; overflow: hidden; }
    .slot { position: absolute; inset: 0; display: flex; align-items: center; gap: 6px; will-change: transform, opacity, filter; }
    .slot b { font: 600 13px/1 var(--pl-sans); color: var(--pl-ink); }
    .slot span { font: 500 12px/1 var(--pl-mono); color: var(--pl-ink-3); }
    .slot.hard b, .slot.hard span { color: var(--pl-coral); }
    .row.dragging .val { cursor: ns-resize; }
    :host(.grabbing) { cursor: ns-resize; }
    /* ── the bar in the field, shown only while you drag: where you are among the options, like a slider. A soft fill grows from the left inside
       the field with a grip at its end, and a dot for each option along the bottom (coral for your hard-coded one).
       It follows the pointer while you drag, gives a little past either end, and springs onto the option when you
       let go ── */
    .row .val { overflow: visible; }
    /* only while dragging: it fades in as the drag starts, and out once the fill has sprung onto the option */
    .track { position: absolute; inset: 2px; border-radius: 7px; pointer-events: none; opacity: 0; transition: opacity 220ms var(--pl-ease-out) 380ms; }
    .row.dragging .track { opacity: 1; transition: opacity 120ms var(--pl-ease-out) 0ms; }
    .track .fill { position: absolute; left: 0; top: 0; bottom: 0; width: calc(12px + var(--f, 0) * (100% - 12px)); border-radius: 7px; background: color-mix(in oklab, var(--pl-sky) 14%, transparent);
      transition: width 420ms cubic-bezier(.34, 1.56, .64, 1), background-color 200ms var(--pl-ease-out); }
    .track .fill::after { content: ''; position: absolute; right: 3px; top: 50%; width: 2.5px; height: 12px; translate: 0 -50%; border-radius: 2px; background: var(--pl-sky); opacity: .75; transition: height 200ms var(--pl-spring-pop), opacity 200ms; }
    .track .dots { position: absolute; left: 8px; right: 6px; bottom: 2px; height: 2px; }
    .track .dots i { position: absolute; top: 0; width: 2px; height: 2px; margin-left: -1px; border-radius: 50%; background: var(--pl-ink-3); opacity: .35; transition: opacity 200ms, scale 240ms var(--pl-spring-pop); }
    .track .dots i.hard { background: var(--pl-coral); opacity: .8; }
    .track .dots i.here { opacity: .9; scale: 1.6; }
    .val.on-hard .fill { background: color-mix(in oklab, var(--pl-coral) 12%, transparent); }
    .val.on-hard .fill::after { background: var(--pl-coral); }
    .row.dragging .fill { transition: width 70ms linear, background-color 200ms; background: color-mix(in oklab, var(--pl-sky) 22%, transparent); }
    .row.dragging .val.on-hard .fill { background: color-mix(in oklab, var(--pl-coral) 18%, transparent); }
    .row.dragging .fill::after { height: 16px; opacity: 1; }
    .row .val:hover { background: none; }
    .drum, .car { position: relative; }

    .row.inline { position: relative; box-shadow: none; background: none; padding: 0; height: 32px; }
    .row.inline + .list { position: absolute; }
    :host(.grabbing), .grabbing { cursor: ns-resize; }
`;

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const TICK = '<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ── one picker: the row beside the element (the property's icon, the value that rolls, the tick), its list, drag
// mode and the keys. A property brings: its options, its icon, the mark each option gets in the list, what an
// option does to the element, where the row sits, and the element's own handles ──
export function picker(stage, { name, toy, options: S, mark, apply, place, handles = [], into = stage, keys = stage, grab = stage, start, format = px }) {
  const last = S.length - 1, HARD = S.findIndex((o) => o.hard), FIRST = start ?? HARD;
  into.insertAdjacentHTML('beforeend', `
    <div class="row" role="group" aria-label="${name}">
      <span class="scrub live" aria-label="${name}: drag to change">${toy.startsWith('<') ? toy : toyOf(toy)}</span>
      <button type="button" class="val" aria-haspopup="listbox" aria-expanded="false"><span class="track" aria-hidden="true"><i class="fill"></i><span class="dots"></span></span><span class="drum"></span><i class="car"></i></button>
      <button type="button" class="ok" aria-label="Write it">${TICK}</button>
    </div>
    <div class="list" role="listbox" aria-label="Your ${name.toLowerCase()} tokens" hidden></div>`);
  const row = [...into.querySelectorAll(':scope > .row')].pop(), val = row.querySelector('.val'), ok = row.querySelector('.ok'), list = [...into.querySelectorAll(':scope > .list')].pop();
  const drum = row.querySelector('.drum'), scrub = row.querySelector('.scrub');
  let at = FIRST, written = false;
  const layout = () => (place ? place(row, list, S[at]) : (list.style.left = `${row.offsetLeft}px`, list.style.top = `${row.offsetTop + row.offsetHeight + 4}px`));
  if (into !== stage || !place) row.classList.add('inline');

  // the field: the option in hand. A change rolls it, in the direction of travel
  const slotOf = (o) => { const el = document.createElement('span'); el.className = `slot${o.hard ? ' hard' : ''}`; el.innerHTML = `<b>${o.name}</b><span>${o.hard ? 'hard-coded' : format(o)}</span>`; return el; };
  const roll = (from, to) => {
    const dir = Math.sign(to - from) || 1, next = slotOf(S[to]);
    for (const old of drum.querySelectorAll('.slot:not(.gone)')) {
      old.classList.add('gone');
      if (still()) { old.remove(); continue; }
      old.animate([{ transform: old.style.transform || 'translateY(0)', opacity: 1, filter: 'blur(0)' }, { transform: `translateY(${-dir * 16}px)`, opacity: 0, filter: 'blur(3px)' }], { duration: 200, easing: EASE, fill: 'forwards' }).finished.then(() => old.remove(), () => old.remove());
    }
    drum.append(next);
    if (!still()) next.animate([{ transform: `translateY(${dir * 16}px)`, opacity: 0, filter: 'blur(3px)' }, { transform: 'translateY(0)', opacity: 1, filter: 'blur(0)' }], { duration: 260, easing: EASE });
  };
  // past either end: the one in the field leans a little the way you are pulling, and comes back when you let go
  const lean = (over) => { const el = drum.querySelector('.slot:not(.gone)'); if (el) el.style.transform = over ? `translateY(${(-Math.sign(over) * Math.min(5, Math.abs(over) * 7)).toFixed(1)}px)` : ''; };
  // the bar while dragging: f is where you are, 0 at the smallest option and 1 at the largest
  const fill = (f) => val.style.setProperty('--f', f.toFixed(4));
  val.querySelector('.dots').innerHTML = S.map((o, i) => `<i class="${o.hard ? 'hard' : ''}" style="left:${(i / last) * 100}%"></i>`).join('');
  const dots = [...val.querySelectorAll('.dots i')];
  const draw = () => {
    const o = S[at], token = !o.hard;
    apply(o, { token, written });
    // something to write: a token in hand where the value was hard-coded, or a different token where it wasn't
    const ready = token && !written && (HARD >= 0 || at !== FIRST);
    if (ready) ok.setAttribute('data-ready', ''); else ok.removeAttribute('data-ready');
    if (ready && !still()) { ok.classList.remove('pop'); void ok.offsetWidth; ok.classList.add('pop'); }
    list.innerHTML = S.map((t, i) => `<button type="button" role="option" class="${t.hard ? 'hard' : ''}" data-at="${i}" aria-selected="${at === i}">${mark(t)}${t.name}<span>${t.hard ? 'hard-coded' : format(t)}</span></button>`).join('');
    val.classList.toggle('on-hard', !!o.hard);
    dots.forEach((d, i) => d.classList.toggle('here', i === at));
    if (!row.classList.contains('dragging')) fill(at / last);
    val.setAttribute('aria-label', `${name}: ${o.hard ? `${o.name}, hard-coded` : `${o.name}, ${format(o)}`}`);
    requestAnimationFrame(layout);
  };
  // a new option in hand: the element takes it, and it rolls into the field
  const land = (n) => { if (n === at) return; const from = at; at = n; draw(); roll(from, n); };
  // the list: only one is open at a time on a stage; opening this one closes any other, and a press anywhere else or
  // Esc closes it
  const close = () => { list.hidden = true; val.setAttribute('aria-expanded', 'false'); };
  const toggle = () => {
    const open = list.hidden;
    for (const other of stage.querySelectorAll('.list:not([hidden])')) other.dispatchEvent(new Event('picker:close'));
    if (open) { list.hidden = false; val.setAttribute('aria-expanded', 'true'); }
  };
  list.addEventListener('picker:close', close);
  stage.addEventListener('pointerdown', (e) => { if (!list.hidden && !list.contains(e.target) && !val.contains(e.target)) close(); }, true);
  const go = (n) => { if (written) return; land(Math.max(0, Math.min(last, n))); };
  const write = () => { if (written || S[at].hard || (HARD < 0 && at === FIRST)) return; written = true; row.classList.add('written'); list.hidden = true; draw(); };
  const putBack = () => { written = false; row.classList.remove('written'); list.hidden = true; draw(); go(FIRST); };

  // ── drag mode: press and move, anywhere on the screen. Up (or right) is bigger; each option rolls into the
  // field as you pass it. Past either end the one in the field leans a little and comes back when you let go ──
  const drag = (el, e, perPx, done) => {
    if (written) return;
    try { el.setPointerCapture(e.pointerId); } catch {}
    const x0 = e.clientX, y0 = e.clientY, from = at;
    let moved = false;
    const move = (m) => {
      if (!moved && Math.abs(m.clientX - x0) + Math.abs(m.clientY - y0) < 4) return;
      if (!moved) { moved = true; list.hidden = true; val.setAttribute('aria-expanded', 'false'); row.classList.add('dragging'); scrub.classList.add('on'); grab.classList.add('grabbing'); }
      const raw = from + perPx(m.clientX - x0, m.clientY - y0);
      const over = raw < -0.5 ? raw + 0.5 : raw > last + 0.5 ? raw - last - 0.5 : 0;
      land(Math.max(0, Math.min(last, Math.round(raw))));
      lean(over);
      fill((Math.max(-0.6, Math.min(last + 0.6, raw < 0 ? raw * 0.3 : raw > last ? last + (raw - last) * 0.3 : raw))) / last);
    };
    const up = () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      grab.classList.remove('grabbing'); row.classList.remove('dragging'); scrub.classList.remove('on');
      fill(at / last); done?.();
      if (!moved) { if (el === val) toggle(); return; }
      const cur = drum.querySelector('.slot:not(.gone)');
      if (cur && cur.style.transform) { cur.animate([{ transform: cur.style.transform }, { transform: 'translateY(0)' }], { duration: still() ? 0 : 320, easing: 'cubic-bezier(.34, 1.56, .64, 1)' }); cur.style.transform = ''; }
      requestAnimationFrame(layout);
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  const STEP = 26;
  val.addEventListener('pointerdown', (e) => { if (e.button === 0) { e.preventDefault(); drag(val, e, (dx, dy) => (dx - dy) / STEP); } });
  scrub.addEventListener('pointerdown', (e) => { e.preventDefault(); drag(scrub, e, (dx, dy) => (dx - dy) / STEP); });
  for (const h of handles) h.el.addEventListener('pointerdown', (e) => { if (h.skip?.()) return; e.preventDefault(); h.el.classList.add('dragging'); drag(h.el, e, h.perPx, () => h.el.classList.remove('dragging')); });
  // a keyboard press on the value still opens the list
  val.addEventListener('click', (e) => { if (e.detail === 0 && !written) toggle(); });
  list.addEventListener('click', (e) => { const o = e.target.closest('[data-at]'); if (!o) return; go(Number(o.dataset.at)); list.hidden = true; val.setAttribute('aria-expanded', 'false'); });
  ok.addEventListener('click', () => (written ? putBack() : write()));
  (keys === 'row' ? row : keys).addEventListener('keydown', (e) => {
    if (e.target.isContentEditable) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); go(at + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); go(at - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); write(); }
    else if (e.key === 'Escape') { e.preventDefault(); if (!list.hidden) close(); else putBack(); }
  });
  new ResizeObserver(layout).observe(stage);
  drum.append(slotOf(S[at])); draw();
  return { layout };
}
