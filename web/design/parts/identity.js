// The design site's page for identity: three directions for what a box and a button are, drawn side by side with the
// same content, so the choice is made by looking and pressing. Nothing here is used elsewhere yet.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';

export function mount(host, root, css) {
  const box = (cls, extra = '') => `<a class="${cls}" href="#" onclick="return false">${extra}<span class="in"><span class="plate"><i class="toy">${toyOf('fill')}</i></span><b>Colour</b><em>Six hues with one meaning each, the neutrals, the roles.</em></span></a>`;
  const way = (id, name, claim, body, notes) => `<section class="way" id="${id}"><div class="say"><small>${id.toUpperCase()}</small><h2>${name}</h2><p>${claim}</p><ul>${notes.map((n) => `<li>${n}</li>`).join('')}</ul></div><div class="show">${body}</div></section>`;

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); --h: var(--pl-pink); --on: var(--pl-pink-on); }
    .way { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: 36px; align-items: center; padding: 34px 0; border-top: 2px solid var(--pl-paper-2); }
    .way:first-of-type { border-top: 0; padding-top: 6px; }
    .say small { font: 600 13px/1 var(--pl-mono); color: var(--pl-ink-3); }
    .say h2 { margin: 6px 0 8px !important; }
    .say p { margin: 0 0 10px; font: 500 17px/27px var(--pl-sans); color: var(--pl-ink); max-width: 430px; }
    .say ul { margin: 0; padding-left: 20px; font: 500 15px/24px var(--pl-sans); color: var(--pl-ink-2); max-width: 430px; }
    .show { display: flex; flex-direction: column; align-items: center; gap: 26px; padding: 44px 24px 36px; border-radius: 26px; background: var(--pl-paper-2); min-height: 380px; justify-content: center; }
    .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: center; }
    .toy { display: block; width: 42px; height: 42px; } .toy svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .plate { display: grid; place-items: center; width: 64px; height: 64px; margin-bottom: 14px; border-radius: 18px; background: var(--pl-cut); }
    .in { display: flex; flex-direction: column; }
    .in b { font: 600 24px/27px var(--pl-round); }
    .in em { margin-top: 5px; font: 600 14.5px/20px var(--pl-sans); font-style: normal; opacity: .92; }
    a { text-decoration: none; color: var(--on); -webkit-tap-highlight-color: transparent; }
    button { all: unset; cursor: pointer; -webkit-tap-highlight-color: transparent; }

    /* ── A · the raised key (what the site does today) ── */
    .a-box { display: block; width: 250px; padding-top: 5px; border-radius: 26px; background: color-mix(in oklab, var(--h) 72%, #000); --lift: 5px; }
    .a-box .in { padding: 18px; border-radius: 26px; background: var(--h); translate: 0 calc(-1 * var(--lift)); transition: translate 300ms var(--pl-spring-pop); }
    .a-box:hover { --lift: 8px; } .a-box:active { --lift: 1px; }
    .a-btn { padding-top: 3px; border-radius: 13px; background: color-mix(in oklab, var(--h) 72%, #000); --lift: 3px; }
    .a-btn span { display: block; padding: 10px 16px; border-radius: 13px; background: var(--h); color: var(--on); font: 600 15px/1 var(--pl-round); translate: 0 calc(-1 * var(--lift)); transition: translate 260ms var(--pl-spring-pop); }
    .a-btn:hover { --lift: 4px; } .a-btn:active { --lift: 1px; }
    .a-btn.q { background: var(--pl-rule); } .a-btn.q span { background: var(--pl-paper); color: var(--pl-ink); box-shadow: inset 0 0 0 1.5px var(--pl-rule); }

    /* ── B · it shows its box: flat and solid at rest; pointed at, it draws its own spacing in the three patterns ── */
    .b-box { position: relative; display: block; width: 250px; border-radius: 26px; background: var(--h); transition: scale 220ms var(--pl-spring-pop); }
    .b-box .in { padding: 18px; }
    /* the padding: a hatched band between the edge and the content */
    .b-box::before, .b-btn::before { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity 160ms var(--pl-ease-out);
      /* padding is mint and hatched, as in its toy: a pale mint band with the hatch on it, around the solid content */
      background: repeating-linear-gradient(45deg, var(--pl-mint) 0 2.4px, transparent 2.4px 7.5px), var(--pl-mint-soft);
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; }
    .b-box::before { padding: 18px; }
    /* the margin: a dotted halo outside it */
    .b-box::after { content: ''; position: absolute; inset: -16px; border-radius: 40px; pointer-events: none; opacity: 0; transition: opacity 160ms var(--pl-ease-out);
      /* margin is butter and dotted */
      background-image: radial-gradient(var(--pl-butter) 2.3px, transparent 2.6px); background-size: 10px 10px; padding: 16px;
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; }
    .b-box:hover::before { opacity: 1; } .b-box:hover::after { opacity: 1; }
    .b-box:active { scale: .985; }
    /* its sizes, said in the scale's own names, only while pointed at */
    .b-box .tag, .b-btn .tag { position: absolute; z-index: 2; padding: 3px 7px; border-radius: 7px; font: 600 11px/1.2 var(--pl-mono); white-space: nowrap; opacity: 0; scale: .9; transition: opacity 140ms var(--pl-ease-out), scale 220ms var(--pl-spring-pop); pointer-events: none; }
    .b-box .tag.p { top: -1px; left: 50%; translate: -50% 0; background: var(--pl-mint); color: var(--pl-mint-on); }
    .b-box .tag.m { top: -13px; right: -34px; background: var(--pl-butter); color: var(--pl-butter-on); }
    .b-box:hover .tag, .b-btn:hover .tag { opacity: 1; scale: 1; }
    .b-btn { position: relative; padding: 10px 16px; border-radius: 12px; background: var(--h); color: var(--on); font: 600 15px/1 var(--pl-round); transition: padding 180ms var(--pl-spring-pop), margin 180ms var(--pl-spring-pop); }
    .b-btn::before { padding: 10px 16px; }
    .b-btn:hover::before { opacity: 1; }
    /* pressed, its padding is squeezed (and its margin gives the room back, so nothing around it moves) */
    .b-btn:active { padding: 8px 13px; margin: 2px 3px; }
    .b-btn:active::before { padding: 8px 13px; }
    .b-btn .tag { bottom: calc(100% + 6px); left: 50%; translate: -50% 0; background: var(--pl-mint); color: var(--pl-mint-on); }
    .b-btn.q { background: var(--pl-paper); color: var(--pl-ink); box-shadow: inset 0 0 0 1.5px var(--pl-rule); }
    .b-btn { z-index: 0; } .b-btn::before { z-index: -1; }
    .b-gap { display: flex; align-items: center; }
    /* a gap is lilac and striped */
    .b-gap > i { position: relative; width: 14px; height: 30px; border-radius: 3px; opacity: 0; transition: opacity 160ms var(--pl-ease-out);
      background: repeating-linear-gradient(0deg, var(--pl-lilac) 0 2.4px, transparent 2.4px 6px); }
    .b-gap > i .tag { position: absolute; top: calc(100% + 6px); left: 50%; translate: -50% 0; padding: 3px 7px; border-radius: 7px; font: 600 11px/1.2 var(--pl-mono); font-style: normal; white-space: nowrap; background: var(--pl-lilac); color: var(--pl-lilac-on); }
    .b-gap:hover > i { opacity: 1; }

    /* ── C · it hangs plumb: everything hangs from a line and settles true; pointed at, it swings once ── */
    .c-hang { position: relative; padding-top: 34px; }
    .c-hang::before { content: ''; position: absolute; left: 50%; top: 0; width: 2px; height: 36px; translate: -50% 0; background: var(--pl-ink); border-radius: 1px; }
    .c-hang::after { content: ''; position: absolute; left: 50%; top: -5px; width: 12px; height: 12px; translate: -50% 0; border-radius: 50%; background: var(--pl-ink); }
    .c-box { position: relative; display: block; width: 250px; border-radius: 26px; background: var(--h); transform-origin: 50% -34px; }
    .c-box .in { padding: 18px; }
    .c-box .eye { position: absolute; left: 50%; top: 9px; width: 12px; height: 12px; translate: -50% 0; border-radius: 50%; background: var(--pl-cut); }
    .c-box .in { padding-top: 30px; }
    .c-hang:hover .c-box { animation: swing 1100ms var(--pl-ease-out); }
    .c-hang:hover::before { animation: swing-line 1100ms var(--pl-ease-out); transform-origin: 50% 0; }
    @keyframes swing { 0% { rotate: 0deg; } 18% { rotate: 5deg; } 42% { rotate: -3.200deg; } 64% { rotate: 1.800deg; } 82% { rotate: -.700deg; } 100% { rotate: 0deg; } }
    @keyframes swing-line { 0% { rotate: 0deg; } 18% { rotate: 5deg; } 42% { rotate: -3.200deg; } 64% { rotate: 1.800deg; } 82% { rotate: -.700deg; } 100% { rotate: 0deg; } }
    .c-box:active { translate: 0 3px; }
    /* a button is a bob: a weight on a short line, pointed at the bottom */
    .c-btn { position: relative; padding: 10px 16px 12px; border-radius: 12px 12px 16px 16px; background: var(--h); color: var(--on); font: 600 15px/1 var(--pl-round); transform-origin: 50% -10px; transition: translate 200ms var(--pl-spring-pop); }
    .c-btn::before { content: ''; position: absolute; left: 50%; bottom: 100%; width: 2px; height: 10px; translate: -50% 0; background: var(--pl-ink); }
    .c-btn:hover { animation: swing 900ms var(--pl-ease-out); }
    .c-btn:active { translate: 0 3px; }
    .c-btn.q { background: var(--pl-paper); color: var(--pl-ink); box-shadow: inset 0 0 0 1.5px var(--pl-rule); }
    .c-rail { position: relative; display: flex; gap: 14px; padding-top: 10px; }
    .c-rail::before { content: ''; position: absolute; left: -8px; right: -8px; top: 0; height: 2px; background: var(--pl-ink); border-radius: 1px; }

    /* ── the face ── */
    .faces { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
    .face { padding: 22px 22px 18px; border-radius: 22px; background: var(--pl-paper-2); }
    .face b { display: block; font-size: 34px; line-height: 37px; letter-spacing: -0.02em; color: var(--pl-ink); text-wrap: balance; }
    .face p { margin: 12px 0 0; font-size: 15.5px; line-height: 24px; color: var(--pl-ink-2); }
    .face small { display: block; margin-top: 14px; font: 600 12px/1.3 var(--pl-mono); color: var(--pl-ink-3); }
    .f1 b { font-family: var(--font-round); font-weight: 600; } .f1 p { font-family: var(--font-body); font-weight: 500; }
    .f2 b { font-family: var(--font-trial-a); font-weight: 750; font-variation-settings: 'opsz' 60; } .f2 p { font-family: var(--font-trial-b); font-weight: 450; }
    .f3 b { font-family: var(--font-trial-b); font-weight: 650; letter-spacing: -0.03em; } .f3 p { font-family: var(--font-trial-b); font-weight: 450; }
    @media (max-width: 820px) { .way, .faces { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) { .c-hang:hover .c-box, .c-hang:hover::before, .c-btn:hover { animation: none; } }
  </style>${TOY_DEFS}
  ${way('a', 'The raised key', 'What the site does today. A solid top on a darker base; it goes down when pressed.',
    box('a-box') + `<div class="row"><button class="a-btn"><span>Use rounded-tag</span></button><button class="a-btn q"><span>Keep</span></button></div>`,
    ['Feels good under the finger.', 'Borrowed: this is how a great many playful products look. Nothing about it says Plumber.'])}
  ${way('b', 'It shows its box', 'Flat and solid at rest. Pointed at, a thing draws its own spacing in the language’s own colours: padding in hatched mint, margin in dotted butter, a gap in striped lilac, each with its step’s name. The site measures itself.',
    box('b-box', '<i class="tag p">p · s5</i><i class="tag m">m · s4</i>') + `<div class="row b-gap"><button class="b-btn">Use rounded-tag<i class="tag">px · s4</i></button><i><span class="tag">gap · s3</span></i><button class="b-btn q">Keep</button></div>`,
    ['Only Plumber can do this: the three patterns are ours, and showing spacing is the whole product.', 'Every hover teaches what the product does.', 'Pressed, a button’s padding is squeezed, not pushed down.', 'Risk: busy if everything does it at once. It would need to be quick and quiet.'])}
  ${way('c', 'It hangs plumb', 'Everything hangs from a line, like the bob in the logo, and settles true. Pointed at, it swings once and comes to rest.',
    `<div class="c-hang">${box('c-box', '<i class="eye"></i>')}</div><div class="c-rail"><button class="c-btn">Use rounded-tag</button><button class="c-btn q">Keep</button></div>`,
    ['Ours too: a plumb line is the name and the logo.', 'One motion (swing, then settle) could be the signature everywhere.', 'Risk: a line above every card costs room, and a swing on every hover could tire.'])}

  <h2>And the face</h2>
  <p>The rounded face is the other borrowed part. Three candidates for the same headline.</p>
  <div class="faces">
    <div class="face f1"><b>Keep your app on your design system.</b><p>Each mark is a place in your code that types a size by hand.</p><small>Fredoka + Nunito · today · friendly, and everywhere</small></div>
    <div class="face f2"><b>Keep your app on your design system.</b><p>Each mark is a place in your code that types a size by hand.</p><small>Bricolage Grotesque + Instrument Sans · odd, hand-cut, a little crooked</small></div>
    <div class="face f3"><b>Keep your app on your design system.</b><p>Each mark is a place in your code that types a size by hand.</p><small>Instrument Sans alone · plain and exact, lets the toys be the only play</small></div>
  </div>`;
}
