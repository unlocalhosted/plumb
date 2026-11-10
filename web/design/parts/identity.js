// The design site's page for identity: what makes a raised thing delightful, taken apart, and a version of it that is
// ours. The raised key as the site has it today, beside "soft blocks": the same idea rebuilt from where the delight
// comes from (it has weight, it is lit, it is soft, it answers the hand). Nothing here is used elsewhere yet.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';

const PARTS = [['pink', 'fill', 'Colour', 'Six hues with one meaning each.'], ['sky', 'type', 'Type', 'Two faces, twelve styles.'], ['butter', 'icon', 'Icons', '76 toys and their rules.'], ['mint', 'padding', 'Space', 'The ladder and the corners.'], ['lilac', 'corner', 'Fix bar', 'The cause in hand, one line.']];

export function mount(host, root, css) {
  const inside = (toy, name, says) => `<span class="in"><span class="plate"><i class="toy">${toyOf(toy)}</i></span><b>${name}</b><em>${says}</em></span>`;
  const soft = ([hue, toy, name, says]) => `<a class="s-box" data-hue="${hue}" href="#" onclick="return false">${inside(toy, name, says)}</a>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); }
    a { text-decoration: none; -webkit-tap-highlight-color: transparent; }
    button { all: unset; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .toy { display: block; width: 42px; height: 42px; } .toy svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .why { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 16px 0 8px; }
    .why div { padding: 16px 16px 14px; border-radius: 20px; background: var(--pl-paper-2); }
    .why small { font: 600 12px/1 var(--pl-mono); color: var(--pl-ink-3); }
    .why b { display: block; margin: 8px 0 4px; font: 600 18px/22px var(--pl-round); }
    .why span { font: 500 14.5px/21px var(--pl-sans); color: var(--pl-ink-2); }
    .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
    .show { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; min-height: 400px; padding: 40px 24px 30px; border-radius: 26px; background: var(--pl-paper-2); }
    .show > small { align-self: flex-start; margin: -16px 0 auto; font: 600 13px/1 var(--pl-round); color: var(--pl-ink-2); }
    .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: center; }
    .shelf { display: grid; grid-template-columns: repeat(auto-fill, minmax(186px, 1fr)); gap: 22px 18px; margin-top: 18px; padding: 34px 26px 30px; border-radius: 26px; background: var(--pl-paper-2); }
    .in { display: flex; flex-direction: column; }
    .in b { font: 600 24px/27px var(--pl-round); }
    .in em { margin-top: 5px; font: 600 14.5px/20px var(--pl-sans); font-style: normal; }

    /* ── today: the raised key. Two flat tones; it moves up and down ── */
    .a-box { display: block; width: 250px; padding-top: 5px; border-radius: 26px; background: color-mix(in oklab, var(--pl-pink) 72%, #000); color: var(--pl-pink-on); --lift: 5px; }
    .a-box .in { padding: 18px; border-radius: 26px; background: var(--pl-pink); translate: 0 calc(-1 * var(--lift)); transition: translate 300ms var(--pl-spring-pop); }
    .a-box .plate { display: grid; place-items: center; width: 64px; height: 64px; margin-bottom: 14px; border-radius: 18px; background: var(--pl-cut); }
    .a-box:hover { --lift: 8px; } .a-box:active { --lift: 1px; }
    .a-btn { padding-top: 3px; border-radius: 13px; background: color-mix(in oklab, var(--pl-pink) 72%, #000); --lift: 3px; }
    .a-btn span { display: block; padding: 10px 16px; border-radius: 13px; background: var(--pl-pink); color: var(--pl-pink-on); font: 600 15px/1 var(--pl-round); translate: 0 calc(-1 * var(--lift)); transition: translate 260ms var(--pl-spring-pop); }
    .a-btn:hover { --lift: 4px; } .a-btn:active { --lift: 1px; }
    .a-btn.q { background: var(--pl-rule); } .a-btn.q span { background: var(--pl-paper); color: var(--pl-ink); box-shadow: inset 0 0 0 1.5px var(--pl-rule); }

    /* ── soft blocks ──────────────────────────────────────────────────────────────────────────────────────────
       The same raised thing, rebuilt from where the delight comes from.
       soft      the top is the hue's pale, lettered in its ink; the strong colour is kept for the side. Calm to read,
                 and the colour still says which part it is
       lit       one light, from above: a bright rim along the top edge, a darker one along the bottom, and a soft
                 shadow of the block's own colour on the ground
       weight    it sits on a side of its own strong colour and throws a shadow of that colour; pointed at, it comes
                 straight up to meet the finger and the shadow grows
       answers   pressed, it goes down onto its side and squashes a hair wider, as a soft thing does; let go, it
                 springs back past where it was and settles */
    .s-box { --h: var(--pl-pink); --hs: var(--pl-pink-soft); --hi: var(--pl-pink-ink); --side: var(--h); --lift: 7px;
      position: relative; display: block; width: 250px; max-width: 100%; padding-top: 7px; border-radius: 28px; background: var(--side); color: var(--hi);
      box-shadow: 0 16px 24px -14px color-mix(in oklab, var(--h) 70%, transparent), 0 3px 5px -2px color-mix(in oklab, var(--h) 40%, transparent);
      transition: box-shadow 300ms var(--pl-ease-out); }
    .s-box[data-hue="sky"] { --h: var(--pl-sky); --hs: var(--pl-sky-soft); --hi: var(--pl-sky-ink); }
    .s-box[data-hue="butter"] { --h: var(--pl-butter); --hs: var(--pl-butter-soft); --hi: var(--pl-butter-ink); }
    .s-box[data-hue="mint"] { --h: var(--pl-mint); --hs: var(--pl-mint-soft); --hi: var(--pl-mint-ink); }
    .s-box[data-hue="lilac"] { --h: var(--pl-lilac); --hs: var(--pl-lilac-soft); --hi: var(--pl-lilac-ink); }
    :host([data-scheme="dark"]) .s-box { --side: color-mix(in oklab, var(--hs) 58%, #000); }
    /* the top: pale, lit from above (a bright rim on its top edge, a darker one on its bottom edge). Anchored at its
       bottom edge, because it is pressed down against its side */
    .s-box .in { position: relative; padding: 18px; border-radius: 28px; background: linear-gradient(180deg, color-mix(in oklab, var(--hs) 82%, #fff), var(--hs));
      box-shadow: inset 0 2px 0 0 color-mix(in oklab, #fff 75%, transparent), inset 0 -2.5px 0 0 color-mix(in oklab, var(--h) 22%, transparent);
      transform: translateY(calc(-1 * var(--lift))); transform-origin: 50% 100%; will-change: transform; }
    :host([data-scheme="dark"]) .s-box .in { background: linear-gradient(180deg, color-mix(in oklab, var(--hs) 88%, #fff), var(--hs)); box-shadow: inset 0 2px 0 0 color-mix(in oklab, #fff 22%, transparent), inset 0 -2.5px 0 0 color-mix(in oklab, #000 22%, transparent); }
    .s-box .plate { display: grid; place-items: center; width: 64px; height: 64px; margin-bottom: 14px; border-radius: 19px; background: var(--pl-paper); transform-origin: 50% 100%;
      box-shadow: 0 5px 8px -5px color-mix(in oklab, var(--h) 75%, transparent), inset 0 -2px 0 0 color-mix(in oklab, var(--h) 14%, transparent);
      will-change: transform; }
    .s-box .toy { transform-origin: 50% 90%; will-change: transform; }
    .s-box em { opacity: .86; }
    /* pointed at: it comes up to meet the finger, straight up, and its shadow grows. It does not lean or follow the
       pointer: a thing that tilts under the pointer reads as a card to look at, not a key to press */
    .s-box:hover, .s-box.hov { box-shadow: 0 22px 28px -16px color-mix(in oklab, var(--h) 70%, transparent), 0 4px 6px -2px color-mix(in oklab, var(--h) 36%, transparent); }
    /* ── the squash ──
       A soft block is pressed from above against the ground, so it is anchored at its bottom edge and keeps its
       volume: what it loses in height it gains in width. Its top, the plate on it and the toy on the plate are each on
       a spring (see the script): the top follows the finger, the plate follows the top, the toy follows the plate,
       each a little looser than the last. Springs, not keyframes, so a press in the middle of a rebound carries on
       from where the block is and how fast it is moving: it can be pressed again and again and never jumps. */
    .s-box.down { box-shadow: 0 5px 8px -7px color-mix(in oklab, var(--h) 70%, transparent); }
    .s-box:focus-visible { outline: 3px solid var(--pl-sky); outline-offset: 5px; }
    /* a button is the same block, small. The action keeps the strong colour on top: it is the one loud thing */
    .s-btn { --h: var(--pl-pink); --side: color-mix(in oklab, var(--h) 70%, #000); --lift: 4px; position: relative; padding-top: 4px; border-radius: 14px; background: var(--side);
      box-shadow: 0 9px 12px -8px color-mix(in oklab, var(--h) 75%, transparent); transition: box-shadow 240ms var(--pl-ease-out); }
    .s-btn span { display: block; padding: 10px 16px; border-radius: 14px; background: linear-gradient(180deg, color-mix(in oklab, var(--h) 88%, #fff), var(--h)); color: var(--pl-pink-on);
      font: 600 15px/1 var(--pl-round); box-shadow: inset 0 1.5px 0 0 color-mix(in oklab, #fff 45%, transparent), inset 0 -2px 0 0 color-mix(in oklab, #000 12%, transparent);
      transform: translateY(calc(-1 * var(--lift))); }
    .s-btn:hover, .s-btn.hov { box-shadow: 0 14px 16px -10px color-mix(in oklab, var(--h) 75%, transparent); }
    .s-btn span { transform-origin: 50% 100%; will-change: transform; }
    .s-btn.down { box-shadow: 0 3px 5px -4px color-mix(in oklab, var(--h) 75%, transparent); }
    .s-btn.q { --h: var(--pl-ink-3); --side: var(--pl-rule); box-shadow: 0 9px 12px -9px rgb(0 0 0 / .28); }
    .s-btn.q span { background: linear-gradient(180deg, var(--pl-paper), var(--pl-paper-2)); color: var(--pl-ink); box-shadow: inset 0 1.5px 0 0 color-mix(in oklab, #fff 90%, transparent), inset 0 0 0 1.5px var(--pl-rule); }

    /* ── the timeline: slow every motion on this page down, hold it, and drag through it ── */
    .tl { position: sticky; bottom: 16px; z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin: 18px 0 0; padding: 12px 14px; border-radius: 20px; background: var(--pl-ink); color: var(--pl-paper); box-shadow: 0 14px 30px -16px rgb(0 0 0 / .5); }
    .tl b { font: 600 14px/1 var(--pl-round); }
    .tl .grp { display: inline-flex; gap: 2px; padding: 3px; border-radius: 12px; background: color-mix(in oklab, var(--pl-paper) 14%, transparent); }
    .tl button { padding: 7px 10px; border-radius: 9px; font: 600 13px/1 var(--pl-round); color: inherit; }
    .tl button:hover { background: color-mix(in oklab, var(--pl-paper) 16%, transparent); }
    .tl button[aria-pressed="true"] { background: var(--pl-paper); color: var(--pl-ink); }
    .tl input[type="range"] { flex: 1; min-width: 180px; accent-color: var(--pl-pink); }
    .tl output { font: 500 12px/1 var(--pl-mono); min-width: 190px; opacity: .85; }
    .faces { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
    .face { padding: 22px 22px 18px; border-radius: 22px; background: var(--pl-paper-2); }
    .face b { display: block; font-size: 34px; line-height: 37px; letter-spacing: -0.02em; color: var(--pl-ink); text-wrap: balance; }
    .face p { margin: 12px 0 0; font-size: 15.5px; line-height: 24px; color: var(--pl-ink-2); }
    .face small { display: block; margin-top: 14px; font: 600 12px/1.3 var(--pl-mono); color: var(--pl-ink-3); }
    .f1 b { font-family: var(--font-round); font-weight: 600; } .f1 p { font-family: var(--font-body); font-weight: 500; }
    .f2 b { font-family: var(--font-trial-a); font-weight: 750; font-variation-settings: 'opsz' 60; } .f2 p { font-family: var(--font-trial-b); font-weight: 450; }
    .f3 b { font-family: var(--font-trial-b); font-weight: 650; letter-spacing: -0.03em; } .f3 p { font-family: var(--font-trial-b); font-weight: 450; }
    @media (max-width: 820px) { .why { grid-template-columns: repeat(2, minmax(0, 1fr)); } .pair, .faces { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) { .s-box, .s-box .in, .s-box .plate, .s-box .toy, .s-btn span { transition: none !important; animation: none !important; } }
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
  <p>The rounded face is the other borrowed part. Three candidates for the same headline.</p>
  <div class="faces">
    <div class="face f1"><b>Keep your app on your design system.</b><p>Each mark is a place in your code that types a size by hand.</p><small>Fredoka + Nunito · today · friendly, and everywhere</small></div>
    <div class="face f2"><b>Keep your app on your design system.</b><p>Each mark is a place in your code that types a size by hand.</p><small>Bricolage Grotesque + Instrument Sans · odd, hand-cut, a little crooked</small></div>
    <div class="face f3"><b>Keep your app on your design system.</b><p>Each mark is a place in your code that types a size by hand.</p><small>Instrument Sans alone · plain and exact, lets the toys be the only play</small></div>
  </div>`;

  let rate = 1, held = false; // the timeline's speed and Hold (below); the springs read them every frame

  // ── answers: springs ──
  // Each soft thing has four springs. `press` runs 0 (up) to 1 (down on its side) and goes past 0 on the way back,
  // which is the stretch. `plate` chases press and `toy` chases plate, each looser, so what sits on the block arrives
  // late. `lift` is how far the top sits above its side: more while pointed at. A spring keeps where it is and how
  // fast it is going when its target changes, so any motion can be interrupted by any other.
  const SPRINGS = { down: { k: 1200, c: 64 }, up: { k: 400, c: 21 }, plate: { k: 300, c: 19 }, toy: { k: 210, c: 13 }, lift: { k: 320, c: 30 } };
  const SHAPE = { box: { rest: 7, hover: 10, wide: 0.024, short: 0.04 }, btn: { rest: 4, hover: 6, wide: 0.045, short: 0.11 } };
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const things = [...root.querySelectorAll('.s-box, .s-btn')].map((el) => {
    const kind = el.classList.contains('s-btn') ? 'btn' : 'box', shape = SHAPE[kind];
    return { el, shape, top: el.querySelector(kind === 'btn' ? 'span' : '.in'), plate: el.querySelector('.plate'), toy: el.querySelector('.toy'),
      press: { x: 0, v: 0 }, platePress: { x: 0, v: 0 }, toyPress: { x: 0, v: 0 }, lift: { x: shape.rest, v: 0 }, pressed: false, hover: false };
  });
  const byEl = new Map(things.map((t) => [t.el, t]));
  const pull = (o, target, { k, c }, dt) => { o.v += (-k * (o.x - target) - c * o.v) * dt; o.x += o.v * dt; };
  const draw = (t) => {
    const { shape } = t, p = t.press.x, y = -t.lift.x + (t.lift.x - (t.plate ? 1 : 0)) * p;
    t.top.style.transform = `translateY(${y.toFixed(2)}px) scale(${(1 + shape.wide * p).toFixed(4)}, ${(1 - shape.short * p).toFixed(4)})`;
    if (t.plate) { const q = t.platePress.x; t.plate.style.transform = `translateY(${(Math.min(0, q) * 6).toFixed(2)}px) scale(${(1 + 0.035 * q).toFixed(4)}, ${(1 - 0.06 * q).toFixed(4)})`; }
    if (t.toy) { const q = t.toyPress.x, up = (t.lift.x - shape.rest) / (shape.hover - shape.rest); t.toy.style.transform = `translateY(${(Math.min(0, q) * 16).toFixed(2)}px) rotate(${(Math.min(0, q) * 14).toFixed(2)}deg) scale(${(1 + 0.07 * up + 0.04 * q).toFixed(4)}, ${(1 + 0.07 * up - 0.08 * q).toFixed(4)})`; }
  };
  const live = new Set();
  let last = 0, loop = 0;
  const frame = (now) => {
    // the timeline's speed and Hold apply to springs too
    const dt = held ? 0 : Math.min(0.034, (now - last) / 1000) * rate; last = now;
    for (const t of live) {
      for (let n = 0; n < 4 && dt; n++) {
        const h = dt / 4;
        pull(t.press, t.pressed ? 1 : 0, t.pressed ? SPRINGS.down : SPRINGS.up, h);
        pull(t.platePress, t.press.x, SPRINGS.plate, h);
        pull(t.toyPress, t.platePress.x, SPRINGS.toy, h);
        pull(t.lift, t.hover ? t.shape.hover : t.shape.rest, SPRINGS.lift, h);
      }
      draw(t);
      const quiet = (o, target) => Math.abs(o.v) < 0.004 && Math.abs(o.x - target) < 0.0008;
      if (!held && quiet(t.press, t.pressed ? 1 : 0) && quiet(t.platePress, t.press.x) && quiet(t.toyPress, t.platePress.x) && Math.abs(t.lift.v) < 0.02 && Math.abs(t.lift.x - (t.hover ? t.shape.hover : t.shape.rest)) < 0.01) live.delete(t);
    }
    loop = live.size ? requestAnimationFrame(frame) : 0;
    springsMoving();
  };
  const wake = (t) => {
    if (still) { t.press.x = t.platePress.x = t.toyPress.x = t.pressed ? 1 : 0; t.lift.x = t.hover ? t.shape.hover : t.shape.rest; draw(t); return; }
    live.add(t);
    if (!loop) { last = performance.now(); loop = requestAnimationFrame(frame); }
  };
  const press = (el, on) => { const t = byEl.get(el); if (!t || t.pressed === on) return; t.pressed = on; el.classList.toggle('down', on); wake(t); };
  const point = (el, on) => { const t = byEl.get(el); if (!t || t.hover === on) return; t.hover = on; wake(t); };
  for (const { el } of things) {
    el.addEventListener('pointerenter', () => point(el, true));
    el.addEventListener('pointerleave', () => { point(el, false); press(el, false); });
    el.addEventListener('pointerdown', () => press(el, true));
    for (const type of ['pointerup', 'pointercancel', 'blur']) el.addEventListener(type, () => press(el, false));
    el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) press(el, true); });
    el.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') press(el, false); });
  }

  // ── the timeline ──
  // Every motion inside this page (a transition or a keyframe animation) is slowed to the chosen speed as it starts.
  // Hold stops them where they are, and the slider drags all of them through their length together. The four buttons
  // do to the first soft block and button what a pointer would, so a motion can be started while held and then dragged.
  const tl = root.querySelector('.tl'), slider = tl.querySelector('input'), out = tl.querySelector('output');
  const targets = [root.querySelector('.pair .s-box'), root.querySelector('.pair .s-btn')];
  let springsMoving = () => {};
  const moving = () => root.getAnimations().filter((a) => a.playState !== 'finished' && a.playState !== 'idle');
  const lengthOf = (a) => Number(a.effect?.getComputedTiming().endTime) || 0;
  const say = () => {
    const all = moving();
    slider.disabled = !held || !all.length;
    if (!all.length) { out.textContent = live.size ? `${live.size} on springs (no fixed length: slow them, or Hold)` : 'nothing moving'; return; }
    const longest = Math.max(...all.map(lengthOf)), at = Math.max(...all.map((a) => Number(a.currentTime) || 0));
    out.textContent = `${all.length} moving · ${Math.round(at)} of ${Math.round(longest)}ms`;
    if (root.activeElement !== slider) slider.value = String(Math.round((at / Math.max(1, longest)) * 1000));
  };
  springsMoving = () => { if (!moving().length) say(); };
  const take = () => { for (const a of moving()) { a.playbackRate = rate; if (held) a.pause(); } say(); };
  for (const type of ['transitionrun', 'animationstart']) root.addEventListener(type, () => queueMicrotask(take), true);
  for (const type of ['transitionend', 'transitioncancel', 'animationend']) root.addEventListener(type, () => queueMicrotask(say), true);
  let ticking = 0;
  const tick = () => { say(); ticking = moving().length && !held ? requestAnimationFrame(tick) : 0; };
  root.addEventListener('transitionrun', () => { if (!ticking) ticking = requestAnimationFrame(tick); }, true);
  root.addEventListener('animationstart', () => { if (!ticking) ticking = requestAnimationFrame(tick); }, true);
  tl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rate) { rate = Number(b.dataset.rate); for (const x of tl.querySelectorAll('[data-rate]')) x.setAttribute('aria-pressed', String(x === b)); take(); return; }
    const act = b.dataset.do;
    if (act === 'freeze') { held = !held; b.setAttribute('aria-pressed', String(held)); for (const a of moving()) { if (held) a.pause(); else a.play(); } say(); if (!held && !ticking) ticking = requestAnimationFrame(tick); return; }
    for (const el of targets) {
      if (act === 'in') { el.classList.add('hov'); point(el, true); }
      if (act === 'out') { el.classList.remove('hov'); point(el, false); }
      if (act === 'down') press(el, true);
      if (act === 'up') press(el, false);
    }
  });
  slider.addEventListener('input', () => { for (const a of moving()) { a.pause(); a.currentTime = (slider.value / 1000) * lengthOf(a); } say(); });
}
