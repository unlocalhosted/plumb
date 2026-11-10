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
    .shelf { display: grid; grid-template-columns: repeat(auto-fill, minmax(186px, 1fr)); gap: 22px 18px; margin-top: 18px; padding: 34px 26px 30px; border-radius: 26px; background: var(--pl-paper-2); perspective: 1100px; }
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
       weight    pointed at, it rises and leans toward the pointer; what sits on it (the plate, the toy, the name)
                 floats a little above it, so it has depth, not just a second tone
       answers   pressed, it goes down onto its side and squashes a hair wider, as a soft thing does; let go, it
                 springs back past where it was and settles */
    .s-stage { perspective: 900px; }
    .s-box { --h: var(--pl-pink); --hs: var(--pl-pink-soft); --hi: var(--pl-pink-ink); --side: var(--h); --lift: 7px; --rx: 0deg; --ry: 0deg; --gx: 50%; --gy: 0%;
      position: relative; display: block; width: 250px; max-width: 100%; padding-top: 7px; border-radius: 28px; background: var(--side); color: var(--hi);
      box-shadow: 0 16px 24px -14px color-mix(in oklab, var(--h) 70%, transparent), 0 3px 5px -2px color-mix(in oklab, var(--h) 40%, transparent);
      transform: rotateX(var(--rx)) rotateY(var(--ry)); transform-style: preserve-3d; transition: transform 520ms var(--pl-ease-out), box-shadow 300ms var(--pl-ease-out);
      /* a block is always on its own layers: lifted into 3D only while pointed at, its words were redrawn (a visible
         flicker) each time it went flat again */
      will-change: transform; backface-visibility: hidden; }
    .s-box .in, .s-box .plate, .s-box .toy, .s-box b, .s-box em { will-change: transform; backface-visibility: hidden; }
    .s-box[data-hue="sky"] { --h: var(--pl-sky); --hs: var(--pl-sky-soft); --hi: var(--pl-sky-ink); }
    .s-box[data-hue="butter"] { --h: var(--pl-butter); --hs: var(--pl-butter-soft); --hi: var(--pl-butter-ink); }
    .s-box[data-hue="mint"] { --h: var(--pl-mint); --hs: var(--pl-mint-soft); --hi: var(--pl-mint-ink); }
    .s-box[data-hue="lilac"] { --h: var(--pl-lilac); --hs: var(--pl-lilac-soft); --hi: var(--pl-lilac-ink); }
    :host([data-scheme="dark"]) .s-box { --side: color-mix(in oklab, var(--hs) 58%, #000); }
    .s-box .in { position: relative; padding: 18px; border-radius: 28px; background: linear-gradient(180deg, color-mix(in oklab, var(--hs) 82%, #fff), var(--hs));
      box-shadow: inset 0 2px 0 0 color-mix(in oklab, #fff 75%, transparent), inset 0 -2.5px 0 0 color-mix(in oklab, var(--h) 22%, transparent);
      transform: translateY(calc(-1 * var(--lift))); transform-origin: 50% 100%; transform-style: preserve-3d; transition: transform 320ms var(--pl-spring-pop); }
    :host([data-scheme="dark"]) .s-box .in { background: linear-gradient(180deg, color-mix(in oklab, var(--hs) 88%, #fff), var(--hs)); box-shadow: inset 0 2px 0 0 color-mix(in oklab, #fff 22%, transparent), inset 0 -2.5px 0 0 color-mix(in oklab, #000 22%, transparent); }
    /* the light: a soft glint that follows the pointer across the top */
    .s-box .in::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity 240ms var(--pl-ease-out); transform: translateZ(0.5px);
      background: radial-gradient(180px circle at var(--gx) var(--gy), color-mix(in oklab, #fff 70%, transparent), transparent 70%); }
    .s-box:hover .in::after { opacity: .55; }
    .s-box .plate { display: grid; place-items: center; width: 64px; height: 64px; margin-bottom: 14px; border-radius: 19px; background: var(--pl-paper); transform-origin: 50% 100%;
      box-shadow: 0 6px 10px -6px color-mix(in oklab, var(--h) 75%, transparent), inset 0 -2px 0 0 color-mix(in oklab, var(--h) 14%, transparent);
      transform: translateZ(2px); transition: transform 420ms var(--pl-spring-pop); }
    .s-box .toy { transform: translateZ(2px); transition: transform 420ms var(--pl-spring-pop); }
    .s-box b, .s-box em { transform: translateZ(1.5px); transition: transform 420ms var(--pl-spring-pop); }
    .s-box em { opacity: .86; }
    .s-box:hover { transition-duration: 160ms, 300ms; --lift: 11px; box-shadow: 0 26px 30px -18px color-mix(in oklab, var(--h) 70%, transparent), 0 4px 6px -2px color-mix(in oklab, var(--h) 36%, transparent); }
    .s-box:hover .plate { transform: translateZ(26px); }
    .s-box:hover .toy { transform: translateZ(18px) scale(1.08); }
    .s-box:hover b { transform: translateZ(14px); }
    .s-box:hover em { transform: translateZ(8px); }
    /* leaving: everything comes down together, eased, with no overshoot */
    .s-box:not(:hover) .in, .s-box:not(:hover) .plate, .s-box:not(:hover) .toy, .s-box:not(:hover) b, .s-box:not(:hover) em { transition-timing-function: var(--pl-ease-out); transition-duration: 420ms; }
    /* ── the squash ──
       A soft block is pressed from above against the ground, so it is anchored at its bottom edge and keeps its
       volume: what it loses in height it gains in width.
       down     90ms. It sinks onto its side, 4% shorter and 2.4% wider. Its shadow tightens to nothing: it is on the
                ground. The plate on it is squashed too, a beat behind.
       let go   620ms, in four beats, as a soft thing does:
                  rebound   it shoots up past where it rests, stretched 3.5% tall and thinner
                  settle    comes down a little wide
                  again     a last small stretch
                  rest
                The toy on the plate leaves late and lands late (it is loose), with a small hop of its own.
       The button does the same, more of it: it is smaller, so it gives more under a finger. */
    .s-box.down { --lift: 1px; box-shadow: 0 5px 8px -7px color-mix(in oklab, var(--h) 70%, transparent); }
    .s-box.down .in { transform: translateY(-1px) scale(1.024, 0.96); transition: transform 90ms var(--pl-ease-out); }
    .s-box.down .plate { transform: translateZ(4px) scale(1.035, 0.94); transition: transform 110ms 20ms var(--pl-ease-out); }
    .s-box.down .toy { transform: translateZ(2px) scale(1.04, 0.92); transition: transform 110ms 30ms var(--pl-ease-out); }
    .s-box.rel .in { animation: s-rebound 620ms linear both; }
    .s-box.rel .plate { animation: s-plate 620ms 30ms linear both; }
    .s-box.rel .toy { animation: s-hop 640ms 60ms linear both; }
    @keyframes s-rebound {
      0%   { transform: translateY(-1px) scale(1.024, 0.96); animation-timing-function: cubic-bezier(.2, .9, .3, 1); }
      30%  { transform: translateY(calc(-1 * var(--lift) - 5px)) scale(0.982, 1.035); animation-timing-function: cubic-bezier(.4, 0, .6, 1); }
      56%  { transform: translateY(calc(-1 * var(--lift) + 1.5px)) scale(1.01, 0.988); animation-timing-function: cubic-bezier(.4, 0, .6, 1); }
      78%  { transform: translateY(calc(-1 * var(--lift) - 1px)) scale(0.996, 1.006); animation-timing-function: cubic-bezier(.4, 0, .6, 1); }
      100% { transform: translateY(calc(-1 * var(--lift))) scale(1, 1); }
    }
    @keyframes s-plate {
      0%   { transform: translateZ(4px) scale(1.035, 0.94); animation-timing-function: cubic-bezier(.2, .9, .3, 1); }
      34%  { transform: translateZ(30px) scale(0.975, 1.05); animation-timing-function: cubic-bezier(.4, 0, .6, 1); }
      62%  { transform: translateZ(24px) scale(1.012, 0.985); animation-timing-function: cubic-bezier(.4, 0, .6, 1); }
      100% { transform: translateZ(26px) scale(1, 1); }
    }
    @keyframes s-hop {
      0%   { transform: translateZ(2px) translateY(0) scale(1.04, 0.92); animation-timing-function: cubic-bezier(.2, .9, .3, 1); }
      36%  { transform: translateZ(22px) translateY(-7px) scale(0.96, 1.1) rotate(-6deg); animation-timing-function: cubic-bezier(.5, 0, .7, 1); }
      64%  { transform: translateZ(18px) translateY(1px) scale(1.06, 0.94) rotate(2deg); animation-timing-function: cubic-bezier(.4, 0, .6, 1); }
      84%  { transform: translateZ(18px) translateY(-1px) scale(0.99, 1.02) rotate(0deg); }
      100% { transform: translateZ(18px) translateY(0) scale(1.08) rotate(0deg); }
    }
    .s-box:focus-visible { outline: 3px solid var(--pl-sky); outline-offset: 5px; }
    /* a button is the same block, small. The action keeps the strong colour on top: it is the one loud thing */
    .s-btn { --h: var(--pl-pink); --side: color-mix(in oklab, var(--h) 70%, #000); --lift: 4px; position: relative; padding-top: 4px; border-radius: 14px; background: var(--side);
      box-shadow: 0 9px 12px -8px color-mix(in oklab, var(--h) 75%, transparent); transition: box-shadow 240ms var(--pl-ease-out); }
    .s-btn span { display: block; padding: 10px 16px; border-radius: 14px; background: linear-gradient(180deg, color-mix(in oklab, var(--h) 88%, #fff), var(--h)); color: var(--pl-pink-on);
      font: 600 15px/1 var(--pl-round); box-shadow: inset 0 1.5px 0 0 color-mix(in oklab, #fff 45%, transparent), inset 0 -2px 0 0 color-mix(in oklab, #000 12%, transparent);
      transform: translateY(calc(-1 * var(--lift))); transition: transform 300ms var(--pl-spring-pop); }
    .s-btn:hover { --lift: 6px; box-shadow: 0 14px 16px -10px color-mix(in oklab, var(--h) 75%, transparent); }
    .s-btn span { transform-origin: 50% 100%; will-change: transform; }
    .s-btn.down { --lift: 0px; box-shadow: 0 3px 5px -4px color-mix(in oklab, var(--h) 75%, transparent); }
    .s-btn.down span { transform: translateY(0) scale(1.045, 0.89); transition: transform 80ms var(--pl-ease-out); }
    .s-btn.rel span { animation: s-btn 520ms linear both; }
    @keyframes s-btn {
      0%   { transform: translateY(0) scale(1.045, 0.89); animation-timing-function: cubic-bezier(.2, .9, .3, 1); }
      32%  { transform: translateY(calc(-1 * var(--lift) - 4px)) scale(0.97, 1.09); animation-timing-function: cubic-bezier(.4, 0, .6, 1); }
      60%  { transform: translateY(calc(-1 * var(--lift) + 1px)) scale(1.015, 0.97); animation-timing-function: cubic-bezier(.4, 0, .6, 1); }
      82%  { transform: translateY(calc(-1 * var(--lift) - .5px)) scale(0.995, 1.012); }
      100% { transform: translateY(calc(-1 * var(--lift))) scale(1, 1); }
    }
    .s-btn.q { --h: var(--pl-ink-3); --side: var(--pl-rule); box-shadow: 0 9px 12px -9px rgb(0 0 0 / .28); }
    .s-btn.q span { background: linear-gradient(180deg, var(--pl-paper), var(--pl-paper-2)); color: var(--pl-ink); box-shadow: inset 0 1.5px 0 0 color-mix(in oklab, #fff 90%, transparent), inset 0 0 0 1.5px var(--pl-rule); }

    .faces { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
    .face { padding: 22px 22px 18px; border-radius: 22px; background: var(--pl-paper-2); }
    .face b { display: block; font-size: 34px; line-height: 37px; letter-spacing: -0.02em; color: var(--pl-ink); text-wrap: balance; }
    .face p { margin: 12px 0 0; font-size: 15.5px; line-height: 24px; color: var(--pl-ink-2); }
    .face small { display: block; margin-top: 14px; font: 600 12px/1.3 var(--pl-mono); color: var(--pl-ink-3); }
    .f1 b { font-family: var(--font-round); font-weight: 600; } .f1 p { font-family: var(--font-body); font-weight: 500; }
    .f2 b { font-family: var(--font-trial-a); font-weight: 750; font-variation-settings: 'opsz' 60; } .f2 p { font-family: var(--font-trial-b); font-weight: 450; }
    .f3 b { font-family: var(--font-trial-b); font-weight: 650; letter-spacing: -0.03em; } .f3 p { font-family: var(--font-trial-b); font-weight: 450; }
    @media (max-width: 820px) { .why { grid-template-columns: repeat(2, minmax(0, 1fr)); } .pair, .faces { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) { .s-box, .s-box .in, .s-box .plate, .s-box .toy, .s-box b, .s-box em, .s-btn span { transition: none !important; animation: none !important; } }
  </style>${TOY_DEFS}
  <h2>Where the delight comes from</h2>
  <p>Taking the raised key apart. It is not the two tones. It is four things the hand and eye read at once.</p>
  <div class="why">
    <div><small>01</small><b>It is soft</b><span>Round, and calm in colour. Nothing harsh to look at, nothing sharp to touch.</span></div>
    <div><small>02</small><b>It is lit</b><span>One light from above: a bright rim on top, a shadow on the ground. That is what makes it a thing and not a picture of one.</span></div>
    <div><small>03</small><b>It has weight</b><span>It sits above the page, and what is on it sits above that. It rises to meet you.</span></div>
    <div><small>04</small><b>It answers</b><span>It goes down under the finger at once, gives a little, and springs back.</span></div>
  </div>

  <h2>Today, and soft blocks</h2>
  <p>The same card and buttons, twice. Left: what the site does now, two flat tones that move up and down. Right: rebuilt from the four things above. Move the pointer across the right one, then press, hold, and let go.</p>
  <div class="pair">
    <div class="show"><small>Today</small><a class="a-box" href="#" onclick="return false">${inside('fill', 'Colour', 'Six hues with one meaning each, the neutrals, the roles.')}</a>
      <div class="row"><button class="a-btn"><span>Use rounded-tag</span></button><button class="a-btn q"><span>Keep</span></button></div></div>
    <div class="show s-stage"><small>Soft blocks</small><a class="s-box" href="#" onclick="return false">${inside('fill', 'Colour', 'Six hues with one meaning each, the neutrals, the roles.')}</a>
      <div class="row"><button class="s-btn"><span>Use rounded-tag</span></button><button class="s-btn q"><span>Keep</span></button></div></div>
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

  // weight: a soft block leans toward the pointer and its glint follows; it comes back level when the pointer leaves
  for (const el of root.querySelectorAll('.s-box')) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${(x - 0.5) * 12}deg`);
      el.style.setProperty('--rx', `${(0.5 - y) * 10}deg`);
      el.style.setProperty('--gx', `${x * 100}%`);
      el.style.setProperty('--gy', `${y * 100}%`);
    });
    el.addEventListener('pointerleave', () => { for (const p of ['--rx', '--ry']) el.style.removeProperty(p); });
  }
  // answers: down while it is held (a pointer or a key), then let go, which plays the rebound once
  for (const el of root.querySelectorAll('.s-box, .s-btn')) {
    const down = () => { el.classList.remove('rel'); el.classList.add('down'); };
    const up = () => { if (!el.classList.contains('down')) return; el.classList.remove('down'); el.classList.add('rel'); };
    el.addEventListener('pointerdown', down);
    for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'blur']) el.addEventListener(type, up);
    el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) down(); });
    el.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') up(); });
    el.addEventListener('animationend', (e) => { if (e.animationName === 's-rebound' || e.animationName === 's-btn') el.classList.remove('rel'); });
  }
}
