// The design site's page for identity: what makes a raised thing delightful, taken apart, and a version of it that is
// ours. The raised key as the site has it today, beside "soft blocks": the same idea rebuilt from where the delight
// comes from (it has weight, it is lit, it is soft, it answers the hand). Nothing here is used elsewhere yet.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { SOFT_CSS, soften } from '../../../overlay/src/soft.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';

const PARTS = [['pink', 'fill', 'Colour', 'Six hues with one meaning each.'], ['sky', 'type', 'Type', 'Two faces, twelve styles.'], ['butter', 'icon', 'Icons', '76 toys and their rules.'], ['mint', 'padding', 'Spacing', 'Spacing and radius tokens.'], ['lilac', 'corner', 'Fix bar', 'What is hard-coded, in one line.']];

export function mount(host, root, css) {
  const inside = (toy, name, says) => `<span class="in"><span class="plate"><i class="toy">${toyOf(toy)}</i></span><b>${name}</b><em>${says}</em></span>`;
  const soft = ([hue, toy, name, says]) => `<a class="s-box" data-hue="${hue}" href="#" onclick="return false">${inside(toy, name, says)}</a>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${SOFT_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); }
    a { text-decoration: none; -webkit-tap-highlight-color: transparent; }
    button { all: unset; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .toy { display: block; width: 42px; height: 42px; } .toy svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .why { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 16px 0 8px; }
    .why div { padding: 16px 16px 14px; border-radius: 20px; background: var(--pl-paper-2); }
    .why small { font: 600 12px/1 var(--pl-mono); color: var(--pl-ink-2); }
    .why b { display: block; margin: 8px 0 4px; font: var(--pl-round-w, 600) 18px/22px var(--pl-round); }
    .why span { font: 500 14.5px/21px var(--pl-sans); color: var(--pl-ink-2); }
    .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
    .show { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; min-height: 400px; padding: 40px 24px 30px; border-radius: 26px; background: var(--pl-paper-2); }
    .show > small { align-self: flex-start; margin: -16px 0 auto; font: var(--pl-round-w, 600) 13px/1 var(--pl-round); color: var(--pl-ink-2); }
    .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: center; }
    .shelf { display: grid; grid-template-columns: repeat(auto-fill, minmax(186px, 1fr)); gap: 22px 18px; margin-top: 18px; padding: 34px 26px 30px; border-radius: 26px; background: var(--pl-paper-2); }
    .a-box .in { display: flex; flex-direction: column; }
    .a-box .in b { font: var(--pl-round-w, 600) 24px/27px var(--pl-round); }
    .a-box .in em { margin-top: 5px; font: 600 14.5px/20px var(--pl-sans); font-style: normal; }

    /* ── today: the raised key. Two flat tones; it moves up and down ── */
    .a-box { display: block; width: 250px; padding-top: 5px; border-radius: 26px; background: color-mix(in oklab, var(--pl-pink) 72%, #000); color: var(--pl-pink-on); --lift: 5px; }
    .a-box .in { padding: 18px; border-radius: 26px; background: var(--pl-pink); translate: 0 calc(-1 * var(--lift)); transition: translate 300ms var(--pl-spring-pop); }
    .a-box .plate { display: grid; place-items: center; width: 64px; height: 64px; margin-bottom: 14px; border-radius: 18px; background: var(--pl-cut); }
    .a-box:hover { --lift: 8px; } .a-box:active { --lift: 1px; }
    .a-btn { padding-top: 3px; border-radius: 13px; background: color-mix(in oklab, var(--pl-pink) 72%, #000); --lift: 3px; }
    .a-btn span { display: block; padding: 10px 16px; border-radius: 13px; background: var(--pl-pink); color: var(--pl-pink-on); font: var(--pl-round-w, 600) 15px/1 var(--pl-round); translate: 0 calc(-1 * var(--lift)); transition: translate 260ms var(--pl-spring-pop); }
    .a-btn:hover { --lift: 4px; } .a-btn:active { --lift: 1px; }
    .a-btn.q { background: var(--pl-rule); } .a-btn.q span { background: var(--pl-paper); color: var(--pl-ink); box-shadow: inset 0 0 0 1.5px var(--pl-rule); }

    /* soft blocks: overlay/src/soft.js. Here they are only given a width */
    .s-box { width: 250px; max-width: 100%; }

    /* ── the timeline: slow every motion on this page down, hold it, and drag through it ── */
    .tl { position: sticky; bottom: 16px; z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin: 18px 0 0; padding: 12px 14px; border-radius: 20px; background: var(--pl-ink); color: var(--pl-paper); box-shadow: 0 14px 30px -16px rgb(0 0 0 / .5); }
    .tl b { font: var(--pl-round-w, 600) 14px/1 var(--pl-round); }
    .tl .grp { display: inline-flex; gap: 2px; padding: 3px; border-radius: 12px; background: color-mix(in oklab, var(--pl-paper) 14%, transparent); }
    .tl button { padding: 7px 10px; border-radius: 9px; font: var(--pl-round-w, 600) 13px/1 var(--pl-round); color: inherit; }
    .tl button:hover { background: color-mix(in oklab, var(--pl-paper) 16%, transparent); }
    .tl button[aria-pressed="true"] { background: var(--pl-paper); color: var(--pl-ink); }
    .tl input[type="range"] { flex: 1; min-width: 180px; accent-color: var(--pl-pink); }
    .tl output { font: 500 12px/1 var(--pl-mono); min-width: 190px; opacity: .85; }
    .face { margin-top: 16px; padding: 26px 26px 22px; border-radius: 22px; background: var(--pl-paper-2); }
    .face b { display: block; font: var(--pl-round-w, 600) 44px/46px var(--pl-round); letter-spacing: -0.02em; color: var(--pl-ink); text-wrap: balance; max-width: 560px; }
    .face p { margin: 12px 0 0; font: 450 17px/27px var(--pl-sans); color: var(--pl-ink-2); max-width: 560px; }
    .face small { display: block; margin-top: 14px; font: 600 12px/1.3 var(--pl-mono); color: var(--pl-ink-2); }
    @media (max-width: 820px) { .why { grid-template-columns: repeat(2, minmax(0, 1fr)); } .pair { grid-template-columns: 1fr; } }
  </style>${TOY_DEFS}
  <h2>Where the delight comes from</h2>
  <p>Taking the raised key apart. It is not the two tones. It is four things the hand and eye read at once.</p>
  <div class="why">
    <div><small>01</small><b>It is soft</b><span>Round, and calm in colour. Nothing harsh to look at, nothing sharp to touch.</span></div>
    <div><small>02</small><b>It is lit</b><span>One light from above: a bright rim on top, a shadow on the ground. That is what makes it a thing and not a picture of one.</span></div>
    <div><small>03</small><b>It has weight</b><span>It sits above the page on a side you can see, and comes straight up to meet your finger.</span></div>
    <div><small>04</small><b>It answers</b><span>It goes down under the finger at once, gives a little, and springs back.</span></div>
  </div>

  <h2>Today, and soft blocks</h2>
  <p>The same card and buttons, twice. Left: what the site does now, two flat tones that move up and down. Right: rebuilt from the four things above. Point at the right one, then press, hold, and let go.</p>
  <div class="pair">
    <div class="show"><small>Today</small><a class="a-box" href="#" onclick="return false">${inside('fill', 'Colour', 'Six hues with one meaning each, the neutrals, the roles.')}</a>
      <div class="row"><button class="a-btn"><span>Use rounded-tag</span></button><button class="a-btn q"><span>Keep</span></button></div></div>
    <div class="show"><small>Soft blocks</small><a class="s-box" href="#" onclick="return false">${inside('fill', 'Colour', 'Six hues with one meaning each, the neutrals, the roles.')}</a>
      <div class="row"><button class="s-btn"><span>Use rounded-tag</span></button><button class="s-btn q"><span>Keep</span></button></div></div>
  </div>

  <div class="tl" role="group" aria-label="Timeline">
    <b>Timeline</b>
    <span class="grp" role="group" aria-label="Speed">${[['1', '1×'], ['0.25', '¼×'], ['0.1', '⅒×'], ['0.03', '1/30×']].map(([v, t], i) => `<button type="button" data-rate="${v}" aria-pressed="${i === 0}">${t}</button>`).join('')}</span>
    <span class="grp" role="group" aria-label="Do it"><button type="button" data-do="in">Point at</button><button type="button" data-do="out">Leave</button><button type="button" data-do="down">Press</button><button type="button" data-do="up">Let go</button></span>
    <button type="button" data-do="freeze" aria-pressed="false" class="grp">Hold</button>
    <input type="range" min="0" max="1000" value="0" aria-label="Drag through the motion" disabled>
    <output>nothing moving</output>
  </div>

  <h2>A shelf of them</h2>
  <p>All five hues. The pale top is calm enough to sit five in a row; the strong colour is on the side, the toy and the shadow.</p>
  <div class="shelf">${PARTS.map(soft).join('')}</div>


  <h2>And the face</h2>
  <p>The rounded face was the other borrowed part. The site is now set in a face with its own hand: a little crooked, cut heavy, so the titles have character and the toys stay the only round things.</p>
  <div class="face"><b>Keep your app on your design system.</b><p>Each mark is a place in your code that types a size by hand.</p><small>Bricolage Grotesque, heavy, for what a toy has printed on it · Instrument Sans for sentences</small></div>`;

  let rate = 1, held = false; // the timeline's speed and Hold (below)
  let onMotion = () => {};     // the timeline's: a motion just started

  // the blocks answer the hand (overlay/src/soft.js); each motion is handed to the timeline as it starts
  const { press } = soften(root, { started: (a) => { a.playbackRate = rate; if (held) a.pause(); onMotion(); } });
  const point = (el, on) => el.classList.toggle('hov', on);

  // ── the timeline ──
  // Every motion inside this page (a transition or a keyframe animation) is slowed to the chosen speed as it starts.
  // Hold stops them where they are, and the slider drags all of them through their length together. The four buttons
  // do to the first soft block and button what a pointer would, so a motion can be started while held and then dragged.
  const tl = root.querySelector('.tl'), slider = tl.querySelector('input'), out = tl.querySelector('output');
  const targets = [root.querySelector('.pair .s-box'), root.querySelector('.pair .s-btn')];
  const moving = () => root.getAnimations().filter((a) => a.playState !== 'finished' && a.playState !== 'idle');
  const lengthOf = (a) => Number(a.effect?.getComputedTiming().endTime) || 0;
  const say = () => {
    const all = moving();
    slider.disabled = !held || !all.length;
    if (!all.length) { out.textContent = 'nothing moving'; return; }
    const longest = Math.max(...all.map(lengthOf)), at = Math.max(...all.map((a) => Number(a.currentTime) || 0));
    out.textContent = `${all.length} moving · ${Math.round(at)} of ${Math.round(longest)}ms`;
    if (root.activeElement !== slider) slider.value = String(Math.round((at / Math.max(1, longest)) * 1000));
  };
  const take = () => { for (const a of moving()) { a.playbackRate = rate; if (held) a.pause(); } say(); };
  for (const type of ['transitionrun', 'animationstart']) root.addEventListener(type, () => queueMicrotask(take), true);
  for (const type of ['transitionend', 'transitioncancel', 'animationend']) root.addEventListener(type, () => queueMicrotask(say), true);
  let ticking = 0;
  const tick = () => { say(); ticking = moving().length && !held ? requestAnimationFrame(tick) : 0; };
  root.addEventListener('transitionrun', () => { if (!ticking) ticking = requestAnimationFrame(tick); }, true);
  root.addEventListener('animationstart', () => { if (!ticking) ticking = requestAnimationFrame(tick); }, true);
  onMotion = () => { say(); if (!ticking) ticking = requestAnimationFrame(tick); };
  tl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rate) { rate = Number(b.dataset.rate); for (const x of tl.querySelectorAll('[data-rate]')) x.setAttribute('aria-pressed', String(x === b)); take(); return; }
    const act = b.dataset.do;
    if (act === 'freeze') { held = !held; b.setAttribute('aria-pressed', String(held)); for (const a of moving()) { if (held) a.pause(); else a.play(); } say(); if (!held && !ticking) ticking = requestAnimationFrame(tick); return; }
    for (const el of targets) {
      if (act === 'in') point(el, true);
      if (act === 'out') point(el, false);
      if (act === 'down') press(el, true);
      if (act === 'up') press(el, false);
    }
  });
  slider.addEventListener('input', () => { for (const a of moving()) { a.pause(); a.currentTime = (slider.value / 1000) * lengthOf(a); } say(); });
}
