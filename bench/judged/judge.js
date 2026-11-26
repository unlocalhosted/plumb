// The judging page (bench/judged/README.md). One screen at a time, the real app in a frame, and a layer over it:
//   look   the judge clicks the first three things their eye went to (or skips)
//   mark   the judge drags a box round anything that looks wrong, says what is off and how much it matters
//   done   "Nothing else here": the screen is saved as plain data, and what is not marked counts as fine
// Plumber's own overlay is hidden in the frame, so the judge never sees what plumber thinks. Every change is saved
// as it is made. Holding Space lets the pointer through to the app.
import { SOFT_CSS, soften } from './soft.js';
import { snapshot } from './snapshot.js';

const judge = new URLSearchParams(location.search).get('judge') || 'owner';
const call = async (path, value) => {
  const res = await fetch(`/__judge/${path}?judge=${encodeURIComponent(judge)}`, value === undefined ? undefined
    : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
};

const WEIGHTS = [['small', 'Small', 'butter'], ['wrong', 'Wrong', 'pink'], ['hurts', 'Hurts', 'coral']];
const CSS = `
  :host { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100%; background: var(--pl-paper-2); color: var(--pl-ink); font: var(--pl-card-body); }
  .bar { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: var(--pl-space-6); padding: var(--pl-space-4) var(--pl-space-6); background: var(--pl-paper); min-height: 56px; box-sizing: border-box; }
  .where { display: flex; align-items: baseline; gap: var(--pl-space-4); min-width: 0; }
  .count { font: var(--pl-card-title); white-space: nowrap; }
  .path { font: var(--pl-card-code); color: var(--pl-ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ask { margin: 0; font: var(--pl-page-small); text-align: center; text-wrap: balance; }
  .ask kbd { font: var(--pl-card-code); padding: 1px 6px; border-radius: 6px; background: var(--pl-paper-2); }
  .acts { display: flex; align-items: center; justify-content: flex-end; gap: var(--pl-space-4); }
  .saved { font: var(--pl-card-meta); color: var(--pl-ink-2); white-space: nowrap; }
  .saved.bad { color: var(--pl-coral); }
  [hidden] { display: none !important; }
  .desk { position: relative; overflow: hidden; min-height: 0; display: grid; }
  .stage { position: absolute; left: 50%; top: 16px; transform-origin: top center; border-radius: 10px; overflow: hidden; background: #fff;
    box-shadow: 0 1px 2px rgb(0 0 0 / .06), 0 10px 28px -14px rgb(0 0 0 / .22); }
  iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  .layer { position: absolute; inset: 0; overflow: hidden; touch-action: none; }
  .layer.look { cursor: cell; } .layer.mark { cursor: crosshair; } .layer.using { pointer-events: none; }
  .page { position: absolute; left: 0; top: 0; width: 0; height: 0; }
  .dot { position: absolute; width: 24px; height: 24px; margin: -12px 0 0 -12px; border-radius: 50%; background: var(--pl-sky); color: var(--pl-sky-on);
    font: 700 12px/24px var(--pl-round); text-align: center; box-shadow: 0 0 0 2px var(--pl-halo); pointer-events: none; animation: land 160ms var(--ease) both; }
  .box { --h: var(--pl-pink); --on: var(--pl-pink-on); position: absolute; box-sizing: border-box; padding: 0; margin: 0; background: transparent;
    border: 2px solid var(--h); border-radius: 4px; box-shadow: 0 0 0 1.5px var(--pl-halo), inset 0 0 0 1.5px var(--pl-halo); cursor: pointer; }
  .box[data-w="small"] { --h: var(--pl-butter); --on: var(--pl-butter-on); } .box[data-w="hurts"] { --h: var(--pl-coral); --on: var(--pl-coral-on); }
  .box:hover, .box.sel { background: color-mix(in oklab, var(--h) 14%, transparent); }
  .box.sel { border-width: 3px; }
  .box:focus-visible { outline: 2.5px solid var(--pl-sky); outline-offset: 3px; }
  .box.live { pointer-events: none; border-style: dashed; }
  .box > b { position: absolute; left: -2px; top: -22px; min-width: 20px; height: 20px; padding: 0 5px; box-sizing: border-box; border-radius: 10px;
    background: var(--h); color: var(--on); font: 700 11px/20px var(--pl-round); text-align: center; box-shadow: 0 0 0 1.5px var(--pl-halo); }
  .note { position: absolute; display: grid; gap: var(--pl-space-4); width: 280px; padding: var(--pl-space-5); border-radius: 14px; background: var(--pl-paper); color: var(--pl-ink);
    box-shadow: 0 1px 2px rgb(0 0 0 / .08), 0 14px 30px -12px rgb(0 0 0 / .3); cursor: default; animation: land 160ms var(--ease) both; }
  .note input { font: var(--pl-card-body); color: inherit; padding: 8px 10px; border: 0; border-radius: 9px; background: var(--pl-paper-2); outline: none; min-width: 0; }
  .note input:focus-visible { box-shadow: 0 0 0 2px var(--pl-sky); }
  .note .row { display: flex; align-items: center; gap: var(--pl-space-3); }
  .chip { --h: var(--pl-pink); --on: var(--pl-pink-on); font: var(--pl-card-label); letter-spacing: var(--pl-tracking-label); padding: 6px 10px; border: 0; border-radius: 99px;
    background: color-mix(in oklab, var(--h) 16%, var(--pl-paper)); color: var(--pl-ink); cursor: pointer; transition: transform 120ms var(--ease), background-color 120ms var(--ease); }
  .chip[data-w="small"] { --h: var(--pl-butter); --on: var(--pl-butter-on); } .chip[data-w="hurts"] { --h: var(--pl-coral); --on: var(--pl-coral-on); }
  .chip:hover { background: color-mix(in oklab, var(--h) 30%, var(--pl-paper)); } .chip:active { transform: scale(.96); }
  .chip[aria-pressed="true"] { background: var(--h); color: var(--on); }
  .chip:focus-visible, .gone:focus-visible { outline: 2.5px solid var(--pl-sky); outline-offset: 2px; }
  .gone { margin-left: auto; font: var(--pl-card-meta); color: var(--pl-ink-2); background: none; border: 0; padding: 6px 4px; border-radius: 6px; cursor: pointer; }
  .gone:hover { color: var(--pl-coral); }
  .end { place-self: center; text-align: center; max-width: 420px; padding: var(--pl-space-6); }
  .end h1 { font: var(--pl-page-title); margin: 0 0 var(--pl-space-4); } .end p { font: var(--pl-page-small); color: var(--pl-ink-2); margin: 0; }
  :host { --ease: cubic-bezier(0.16, 1, 0.3, 1); }
  @keyframes land { from { opacity: 0; transform: scale(.9); } }
  @media (prefers-reduced-motion: reduce) { .dot, .note { animation: none; } .chip { transition: none; } }
`;

class JudgeDesk extends HTMLElement {
  async connectedCallback() {
    const root = this.attachShadow({ mode: 'open' });
    const [tokens, loaded] = await Promise.all([fetch('/__judge/tokens.css').then((r) => r.text()), call('set')]);
    this.set = loaded.set; this.judgements = loaded.judgements; this.scale = 1; this.sel = null; this.drag = null;
    // what makes the app ready to be judged (set.json, `ready`): its own switches for questions that come from how
    // the copy was set up, not from its design. The frame shares this origin, so a cookie set here is the app's too.
    for (const [name, value] of Object.entries(this.set.ready?.cookies ?? {})) document.cookie = `${name}=${value}; path=/; max-age=7776000`;
    root.innerHTML = `<style>${tokens}${SOFT_CSS}${CSS}</style>
      <header class="bar">
        <div class="where"><b class="count"></b><code class="path"></code></div>
        <p class="ask" aria-live="polite"></p>
        <div class="acts"><span class="saved" role="status"></span>
          <button class="s-btn bare back" type="button"><span>Back</span></button>
          <button class="s-btn q skip" type="button"><span>Skip</span></button>
          <button class="s-btn next" type="button"><span>Nothing else here</span></button></div>
      </header>
      <main class="desk">
        <div class="stage"><iframe title="The screen being judged"></iframe><div class="layer"><div class="page"></div></div></div>
        <div class="end" hidden><h1></h1><p></p></div>
      </main>`;
    const $ = (sel) => root.querySelector(sel);
    Object.assign(this, { root, frame: $('iframe'), layer: $('.layer'), page: $('.page'), stage: $('.stage'), desk: $('.desk') });
    soften(root);
    $('.back').addEventListener('click', (e) => { e.currentTarget.blur(); this.go(this.i - 1); });
    $('.skip').addEventListener('click', (e) => { e.currentTarget.blur(); this.now.looksSkipped = true; this.changed(); this.draw(); });
    $('.next').addEventListener('click', (e) => { e.currentTarget.blur(); this.finish(); });
    this.frame.addEventListener('load', () => this.arrived());
    this.layer.addEventListener('wheel', (e) => { e.preventDefault(); this.frame.contentWindow?.scrollBy(e.deltaX, e.deltaY); }, { passive: false });
    this.layer.addEventListener('pointerdown', (e) => this.down(e));
    this.layer.addEventListener('pointermove', (e) => this.move(e));
    this.layer.addEventListener('pointerup', (e) => this.up(e));
    this.layer.addEventListener('pointercancel', () => { this.drag = null; this.draw(); });
    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
    window.addEventListener('blur', () => this.use(false));
    new ResizeObserver(() => this.fit()).observe(this.desk);
    const first = this.set.screens.findIndex((s) => !this.judgements[s.id]?.done);
    this.go(first < 0 ? this.set.screens.length : first);
  }

  get screen() { return this.set.screens[this.i]; }
  get now() { return this.judgements[this.screen.id]; }
  get step() { const j = this.now; return j.looksSkipped || j.looks.length >= 3 ? 'mark' : 'look'; }

  go(i) {
    const n = this.set.screens.length;
    this.i = Math.max(0, Math.min(n, i)); this.sel = null; this.drag = null;
    const over = this.i === n;
    this.stage.hidden = over; this.root.querySelector('.end').hidden = !over;
    if (over) return this.draw();
    const s = this.screen;
    this.judgements[s.id] ??= { screen: s.id, judge, path: s.path, width: this.set.width, startedAt: new Date().toISOString(), looks: [], looksSkipped: false, marks: [], done: false };
    this.shownAt = null;
    this.frame.src = s.path;
    this.fit(); this.draw();
  }

  // the frame's page is in: hide plumber, follow its scrolling, and hear Space from inside it
  arrived() {
    const win = this.frame.contentWindow, doc = win?.document;
    if (!doc || this.i === this.set.screens.length) return;
    // plumber, and Next's own dev badge. A sheet the page's framework cannot take out again, as it would a <style>
    const hide = new win.CSSStyleSheet(); hide.replaceSync('plumb-overlay, nextjs-portal { display: none !important; }');
    doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, hide];
    win.addEventListener('scroll', () => this.place(), { passive: true });
    win.addEventListener('keydown', (e) => this.key(e, true));
    win.addEventListener('keyup', (e) => this.key(e, false));
    this.shownAt = performance.now();
    this.place();
  }

  fit() {
    if (!this.set) return;
    const w = this.set.width, room = this.desk.clientWidth - 32, tall = this.desk.clientHeight - 32;
    this.scale = Math.min(1, room / w);
    Object.assign(this.stage.style, { width: `${w}px`, height: `${Math.max(200, tall / this.scale)}px`, transform: `translateX(-50%) scale(${this.scale})` });
  }

  place() { const win = this.frame.contentWindow; if (win) this.page.style.transform = `translate(${-win.scrollX}px, ${-win.scrollY}px)`; }

  // a pointer's place on the judged page, in the page's own pixels
  at(e) {
    const r = this.layer.getBoundingClientRect(), win = this.frame.contentWindow;
    return { x: Math.round((e.clientX - r.left) / this.scale + (win?.scrollX ?? 0)), y: Math.round((e.clientY - r.top) / this.scale + (win?.scrollY ?? 0)) };
  }
  since() { return this.shownAt === null ? null : Math.round(performance.now() - this.shownAt); }

  key(e, down) {
    const typing = e.target?.closest?.('input, textarea, select, [contenteditable]') || e.composedPath?.()[0]?.matches?.('input, textarea');
    if (e.code === 'Space' && !typing) { e.preventDefault(); this.use(down); return; }
    if (!down || typing) return;
    if (e.key === 'Escape') { this.drag = null; this.sel = null; this.draw(); }
    if ((e.key === 'Backspace' || e.key === 'Delete') && this.sel !== null) this.remove(this.sel);
  }
  use(on) { this.layer.classList.toggle('using', !!on); }

  down(e) {
    if (e.button !== 0 || e.target.closest('.note')) return;
    const box = e.target.closest('.box');
    if (box && this.step === 'mark') { this.sel = Number(box.dataset.n); this.draw(true); return; }
    this.layer.setPointerCapture(e.pointerId);
    this.drag = { from: this.at(e), to: this.at(e) };
    if (this.step === 'mark') { this.sel = null; this.draw(); }
  }
  move(e) { if (!this.drag) return; this.drag.to = this.at(e); if (this.step === 'mark') this.draw(); }
  up(e) {
    if (!this.drag) return;
    const { from } = this.drag, to = this.at(e); this.drag = null;
    const j = this.now;
    if (this.step === 'look') { j.looks.push({ x: to.x, y: to.y, afterMs: this.since() }); this.changed(); return this.draw(); }
    const x = Math.min(from.x, to.x), y = Math.min(from.y, to.y), w = Math.abs(to.x - from.x), h = Math.abs(to.y - from.y);
    if (w < 6 || h < 6) return this.draw();
    const n = j.marks.reduce((m, k) => Math.max(m, k.n), 0) + 1;
    j.marks.push({ n, x, y, w, h, words: '', weight: 'wrong', afterMs: this.since(), scrollY: this.frame.contentWindow?.scrollY ?? 0 });
    this.sel = n; this.changed(); this.draw(true);
  }
  remove(n) { const j = this.now; j.marks = j.marks.filter((m) => m.n !== n); this.sel = null; this.changed(); this.draw(); }

  draw(focus = false) {
    const $ = (sel) => this.root.querySelector(sel), n = this.set.screens.length, over = this.i === n;
    $('.back').hidden = this.i === 0;
    if (over) {
      const all = Object.values(this.judgements), marks = all.reduce((sum, j) => sum + j.marks.length, 0);
      $('.count').textContent = `${n} of ${n} judged`; $('.path').textContent = ''; $('.ask').textContent = '';
      $('.skip').hidden = $('.next').hidden = true;
      $('.end h1').textContent = `All ${n} screens are judged.`;
      $('.end p').textContent = `You made ${marks} ${marks === 1 ? 'mark' : 'marks'}. Everything is saved. Back lets you change one.`;
      return;
    }
    const j = this.now, step = this.step;
    $('.count').textContent = `Screen ${this.i + 1} of ${n}`; $('.path').textContent = this.screen.path;
    $('.ask').innerHTML = step === 'look'
      ? `Click the first three things your eye went to. <b>${j.looks.length} of 3</b>`
      : 'Drag a box round anything that looks wrong. Hold <kbd>Space</kbd> to use the page.';
    $('.skip').hidden = step !== 'look'; $('.next').hidden = step !== 'mark';
    $('.next span').textContent = j.marks.length ? 'Nothing else here' : 'Nothing wrong here';
    this.layer.className = `layer ${step}${this.layer.classList.contains('using') ? ' using' : ''}`;
    this.page.replaceChildren();
    // the looks are shown only while they are being made: afterwards they would sit on the page being judged
    if (step === 'look') j.looks.forEach((p, i) => { const d = document.createElement('i'); d.className = 'dot'; d.textContent = i + 1; d.style.cssText = `left:${p.x}px;top:${p.y}px`; this.page.append(d); });
    if (step === 'mark') for (const m of j.marks) {
      const b = document.createElement('button'); b.type = 'button'; b.className = `box${m.n === this.sel ? ' sel' : ''}`; b.dataset.n = m.n; b.dataset.w = m.weight;
      b.setAttribute('aria-label', `Mark ${m.n}: ${m.words || 'no words yet'}`);
      b.style.cssText = `left:${m.x}px;top:${m.y}px;width:${m.w}px;height:${m.h}px`; b.innerHTML = `<b>${m.n}</b>`;
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter') { this.sel = m.n; this.draw(true); } });
      this.page.append(b);
    }
    if (this.drag && step === 'mark') {
      const { from, to } = this.drag, live = document.createElement('div'); live.className = 'box live';
      live.style.cssText = `left:${Math.min(from.x, to.x)}px;top:${Math.min(from.y, to.y)}px;width:${Math.abs(to.x - from.x)}px;height:${Math.abs(to.y - from.y)}px`;
      this.page.append(live);
    }
    const m = step === 'mark' && j.marks.find((k) => k.n === this.sel);
    if (m) this.note(m, focus);
    this.place();
  }

  // the small card under a selected mark: what is off, how much it matters, or take the mark away
  note(m, focus) {
    const win = this.frame.contentWindow, bottom = (win?.scrollY ?? 0) + (win?.innerHeight ?? 800), right = this.set.width;
    const card = document.createElement('form'); card.className = 'note';
    const below = m.y + m.h + 10 + 110 < bottom;
    card.style.cssText = `left:${Math.max(8, Math.min(m.x, right - 288))}px;top:${below ? m.y + m.h + 10 : Math.max((win?.scrollY ?? 0) + 8, m.y - 120)}px`;
    card.innerHTML = `<input type="text" placeholder="What’s off here?" aria-label="What is off here" autocomplete="off">
      <div class="row" role="group" aria-label="How much it matters">${WEIGHTS.map(([w, word]) => `<button type="button" class="chip" data-w="${w}" aria-pressed="${m.weight === w}">${word}</button>`).join('')}
        <button type="button" class="gone">Remove</button></div>`;
    const input = card.querySelector('input'); input.value = m.words;
    input.addEventListener('input', () => { m.words = input.value; this.changed(); });
    card.addEventListener('submit', (e) => { e.preventDefault(); this.sel = null; this.draw(); });
    card.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.sel = null; this.draw(); } });
    for (const chip of card.querySelectorAll('.chip')) chip.addEventListener('click', () => { m.weight = chip.dataset.w; this.changed(); this.draw(); card.isConnected || this.root.querySelector('.note input')?.focus(); });
    card.querySelector('.gone').addEventListener('click', () => this.remove(m.n));
    this.page.append(card);
    if (focus) input.focus({ preventScroll: true });
  }

  changed() {
    const id = this.screen.id, said = this.root.querySelector('.saved');
    clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      try { await call(`judgement/${id}`, this.judgements[id]); said.className = 'saved'; said.textContent = 'Saved'; }
      catch { said.className = 'saved bad'; said.textContent = 'Not saved yet, trying again'; this.timer = setTimeout(() => this.changed(), 2000); }
    }, 250);
  }

  async finish() {
    const id = this.screen.id, j = this.now, said = this.root.querySelector('.saved');
    clearTimeout(this.timer);
    said.className = 'saved'; said.textContent = 'Saving the screen';
    try {
      const win = this.frame.contentWindow;
      await call(`screen/${id}`, { screen: id, set: this.set.name, app: this.set.app, ...snapshot(win) });
      j.done = true; j.finishedAt = new Date().toISOString();
      await call(`judgement/${id}`, j);
      said.textContent = 'Saved';
      this.go(this.i + 1);
    } catch (e) { said.className = 'saved bad'; said.textContent = 'Could not save this screen. Press the button again.'; console.error(e); }
  }
}
customElements.define('judge-desk', JudgeDesk);
