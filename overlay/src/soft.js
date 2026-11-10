// Soft blocks: the one raised thing (docs/design/visual-language.md). A card you can go to (.s-box), a button
// (.s-btn), and the kit's toy button (.tb, overlay/src/kit.js) are the same object at three sizes: a pale or solid
// top on a side of its own colour, lit from above, that goes down under the finger and springs back as one body.
//
//   import { SOFT_CSS, soften } from './soft.js';
//   root.innerHTML = `<style>${SOFT_CSS}</style>…`;  soften(root);
//
// SOFT_CSS works inside a shadow root (the overlay, the design pages) and on a plain page (the site): the dark
// scheme is read from the host or from any ancestor's data-scheme.

const dark = (sel, body) => `:host([data-scheme="dark"]) ${sel} { ${body} } [data-scheme="dark"] ${sel} { ${body} }`;

export const SOFT_CSS = `
    /* ── a soft block ─────────────────────────────────────────────────────────────────────────────────────────
       soft      the top is the hue's pale, lettered in its ink; the strong colour is kept for the side
       lit       one light, from above: a bright rim along the top edge, a darker one along the bottom, and a
                 shadow of the block's own colour on the ground
       weight    it sits on a side of its own strong colour; pointed at, it comes straight up to meet the finger
       the side  fades in down the block and is solid only under its lower part, so when the top is pressed down
                 and squashed nothing of the side shows above it, and when it stretches thin no hard step
                 shows at its edges
       answers   pressed, it goes down onto its side and squashes a hair wider; let go, it springs back past where
                 it was and settles. That part is the script below (soften) */
    .s-box { --h: var(--pl-pink); --hs: var(--pl-pink-soft); --hi: var(--pl-pink-ink); --side: var(--h); --lift: 7px;
      position: relative; display: block; padding-top: 7px; border-radius: 28px; background: linear-gradient(180deg, transparent 25%, var(--side) 60%); color: var(--hi); text-decoration: none; -webkit-tap-highlight-color: transparent;
      box-shadow: 0 16px 24px -14px color-mix(in oklab, var(--h) 70%, transparent), 0 3px 5px -2px color-mix(in oklab, var(--h) 40%, transparent);
      transition: box-shadow 300ms var(--pl-ease-out); }
    .s-box[data-hue="sky"] { --h: var(--pl-sky); --hs: var(--pl-sky-soft); --hi: var(--pl-sky-ink); }
    .s-box[data-hue="butter"] { --h: var(--pl-butter); --hs: var(--pl-butter-soft); --hi: var(--pl-butter-ink); }
    .s-box[data-hue="mint"] { --h: var(--pl-mint); --hs: var(--pl-mint-soft); --hi: var(--pl-mint-ink); }
    .s-box[data-hue="lilac"] { --h: var(--pl-lilac); --hs: var(--pl-lilac-soft); --hi: var(--pl-lilac-ink); }
    ${dark('.s-box', '--side: color-mix(in oklab, var(--hs) 58%, #000);')}
    /* the top. Anchored at its bottom edge, because it is pressed down against its side */
    .s-box .in { position: relative; display: flex; flex-direction: column; padding: 18px; border-radius: 28px; background: linear-gradient(180deg, color-mix(in oklab, var(--hs) 82%, #fff), var(--hs));
      box-shadow: inset 0 2px 0 0 color-mix(in oklab, #fff 75%, transparent), inset 0 -2.5px 0 0 color-mix(in oklab, var(--h) 22%, transparent);
      transform: translateY(calc(-1 * var(--lift))); transform-origin: 50% 100%; transition: transform 320ms var(--pl-spring-pop); will-change: transform; }
    ${dark('.s-box .in', 'background: linear-gradient(180deg, color-mix(in oklab, var(--hs) 88%, #fff), var(--hs)); box-shadow: inset 0 2px 0 0 color-mix(in oklab, #fff 22%, transparent), inset 0 -2.5px 0 0 color-mix(in oklab, #000 22%, transparent);')}
    .s-box .in b { font: var(--pl-round-w, 600) 24px/27px var(--pl-round); }
    .s-box .in em { margin-top: 5px; font: 600 14.5px/20px var(--pl-sans); font-style: normal; opacity: .86; }
    .s-box .plate { display: grid; place-items: center; width: 64px; height: 64px; margin-bottom: 14px; border-radius: 19px; background: var(--pl-paper); transform-origin: 50% 100%;
      box-shadow: 0 5px 8px -5px color-mix(in oklab, var(--h) 75%, transparent), inset 0 -2px 0 0 color-mix(in oklab, var(--h) 14%, transparent);
      will-change: transform; }
    .s-box .toy { --big: 1; transform: scale(var(--big)); transform-origin: 50% 90%; transition: transform 320ms var(--pl-spring-pop); will-change: transform; }
    /* pointed at: straight up, and its shadow grows. It does not lean or follow the pointer: a thing that tilts
       under the pointer reads as a card to look at, not a key to press */
    .s-box:hover .toy, .s-box.hov .toy { --big: 1.07; }
    .s-box:hover, .s-box.hov { --lift: 10px; box-shadow: 0 22px 28px -16px color-mix(in oklab, var(--h) 70%, transparent), 0 4px 6px -2px color-mix(in oklab, var(--h) 36%, transparent); }
    .s-box.down { box-shadow: 0 5px 8px -7px color-mix(in oklab, var(--h) 70%, transparent); }
    .s-box:focus-visible { outline: 3px solid var(--pl-sky); outline-offset: 5px; }
    /* not there yet: flat, small, and without its colour. Nothing to press (pale is for what is not there; a ready
       box is pale too, so one that isn't ready gives up its hue as well) */
    .s-box.soon, .s-box.soon:hover { --lift: 0px; padding-top: 0; background: none; box-shadow: none; }
    .s-box.soon .in { padding: 14px; background: var(--pl-paper-2); box-shadow: none; color: var(--pl-ink-2); }
    .s-box.soon .plate { width: 40px; height: 40px; margin-bottom: 10px; border-radius: 13px; background: color-mix(in oklab, var(--pl-ink) 7%, transparent); box-shadow: none; }
    .s-box.soon .toy, .s-box.soon:hover .toy { --big: 1; width: 24px; height: 24px; filter: grayscale(1); opacity: .6; }
    .s-box.soon .in b { font-size: 17px; line-height: 21px; }
    .s-box.soon .in em { font-size: 13px; line-height: 18px; opacity: .8; }
    .s-box .when { position: absolute; top: 14px; right: 14px; padding: 4px 9px; border-radius: 10px; font: var(--pl-round-w2, 700) 11.5px/1.2 var(--pl-round); font-style: normal; background: color-mix(in oklab, var(--pl-ink) 7%, transparent); color: var(--pl-ink-2); }

    /* ── a button is the same block, small. The action keeps the strong colour on top: it is the one loud thing ── */
    .s-btn { --h: var(--pl-pink-block); --side: color-mix(in oklab, var(--h) 70%, #000); --lift: 4px;
      position: relative; display: inline-block; box-sizing: border-box; margin: 0; padding: 4px 0 0; border: 0; border-radius: 14px; background: linear-gradient(180deg, transparent 25%, var(--side) 60%); cursor: pointer; text-decoration: none; -webkit-tap-highlight-color: transparent; user-select: none;
      box-shadow: 0 9px 12px -8px color-mix(in oklab, var(--h) 75%, transparent); transition: box-shadow 240ms var(--pl-ease-out); }
    .s-btn > span { display: flex; align-items: center; justify-content: center; gap: 7px; padding: 10px 16px; border-radius: 14px; background: linear-gradient(180deg, color-mix(in oklab, var(--h) 88%, #fff), var(--h)); color: var(--pl-pink-block-on); white-space: nowrap;
      font: var(--pl-round-w, 600) 15px/1 var(--pl-round); box-shadow: inset 0 1.5px 0 0 color-mix(in oklab, #fff 45%, transparent), inset 0 -2px 0 0 color-mix(in oklab, #000 12%, transparent);
      transform: translateY(calc(-1 * var(--lift))); transform-origin: 50% 100%; transition: transform 300ms var(--pl-spring-pop); will-change: transform; }
    .s-btn:hover, .s-btn.hov { --lift: 6px; box-shadow: 0 14px 16px -10px color-mix(in oklab, var(--h) 75%, transparent); }
    .s-btn.down { box-shadow: 0 3px 5px -4px color-mix(in oklab, var(--h) 75%, transparent); }
    .s-btn:focus-visible { outline: 2.5px solid var(--pl-sky); outline-offset: 3px; }
    /* quiet: paper on a rule */
    .s-btn.q { --h: var(--pl-ink-3); --side: var(--pl-rule); box-shadow: 0 9px 12px -9px rgb(0 0 0 / .28); }
    .s-btn.q > span { background: linear-gradient(180deg, var(--pl-paper), var(--pl-paper-2)); color: var(--pl-ink); box-shadow: inset 0 1.5px 0 0 color-mix(in oklab, #fff 90%, transparent), inset 0 0 0 1.5px var(--pl-rule); }
    ${dark('.s-btn.q > span', 'box-shadow: inset 0 1.5px 0 0 color-mix(in oklab, #fff 14%, transparent), inset 0 0 0 1.5px var(--pl-rule);')}
    /* bare: a word you can press (a place in a bar that isn't the current one). Flat until pointed at; it still gives */
    .s-btn.bare, .s-btn.bare:hover, .s-btn.bare.down { --lift: 0px; padding: 0 0 4px; background: none; box-shadow: none; }
    .s-btn.bare > span { background: none; box-shadow: none; color: var(--pl-ink-2); transition: transform 300ms var(--pl-spring-pop), background-color 200ms var(--pl-ease-out); }
    .s-btn.bare:hover > span { background: var(--pl-paper-2); color: var(--pl-ink); }
    @media (prefers-reduced-motion: reduce) { .s-box, .s-box .in, .s-box .plate, .s-box .toy, .s-btn > span { transition: none !important; animation: none !important; } }
`;

// ── the answer: one body, sized ──
// A block has one motion: how far it is stretched past rest (1 = fully stretched tall, negative = wide). Every part
// reads that same number at the same moment, so the top, the plate and the toy leave together, peak together and
// land together. The toy is loose, so it goes further on the same beat; it is never later.
// The beats are written by hand (they are what made it feel right) and played with the Web Animations API. Before a
// part starts a new motion, whatever it is doing is frozen where it is and the new motion starts from exactly there,
// so a press in the middle of a rebound, or a release in the middle of a press, carries on from the pose on screen.
const LAUNCH = 'cubic-bezier(.2, .9, .3, 1)', SWING = 'cubic-bezier(.4, 0, .6, 1)', OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const REST = 'translateY(calc(-1 * var(--lift)))';
//             when   top/plate  toy
const BEATS = [[0.30, 1, 1, SWING], [0.56, -0.3, -0.55, SWING], [0.78, 0.2, 0.2, SWING], [1, 0, 0]];
// A small thing is stiffer than a big one: it travels fewer pixels, and it is back sooner. The card (about 190 tall)
// is the reference; a 35px button gets about half the overshoot and four fifths the time.
const feel = (top) => {
  const r = Math.min(1.5, Math.max(0.1, top.offsetHeight / 190));
  return { give: 0.04 * r ** -0.15, over: 5 * r ** 0.45, ms: 620 * r ** 0.12, down: 90 * r ** 0.12 };
};
const n = (v) => +v.toFixed(4);
const POSE = {
  top:   (s, f) => (s === 0 ? `${REST} scale(1, 1)` : `translateY(calc(-1 * var(--lift) - ${n(f.over * s)}px)) scale(${n(1 - 0.45 * f.give * s)}, ${n(1 + 0.875 * f.give * s)})`),
  plate: (s) => `translateY(${n(-3 * s)}px) scale(${n(1 - 0.025 * s)}, ${n(1 + 0.05 * s)})`,
  toy:   (t) => (t === 0 ? 'translateY(0) scale(var(--big)) rotate(0deg)' : t > 0 ? `translateY(${n(-7 * t)}px) scale(${n(1 - 0.04 * t)}, ${n(1 + 0.1 * t)}) rotate(${n(-6 * t)}deg)` : `translateY(${n(-1.8 * t)}px) scale(${n(1 - 0.11 * t)}, ${n(1 + 0.11 * t)}) rotate(${n(-3.6 * t)}deg)`),
};
const DOWN = {
  top:   (f) => `translateY(${n(-f.over / 5)}px) scale(${n(1 + 0.6 * f.give)}, ${n(1 - f.give)})`,
  plate: () => 'scale(1.035, 0.94)',
  toy:   () => 'scale(1.04, 0.92)',
};
// where a part is right now, held in its own style, with anything it was doing stopped
const freeze = (part) => {
  const here = getComputedStyle(part).transform;
  for (const a of part.getAnimations()) { if (a.id === 'soft') a.cancel(); }
  part.style.transform = here === 'none' ? '' : here;
  return here === 'none' ? 'translateY(0)' : here;
};
const BLOCK = '.s-box, .s-btn, .tb';
const DEAD = '.soon, :disabled, [aria-disabled="true"], [aria-busy="true"]';
const partsOf = (el) => [['top', el.querySelector(':scope > .in, :scope > .top, :scope > span')], ['plate', el.querySelector('.plate')], ['toy', el.querySelector('.plate .toy')]].filter(([, part]) => part);

const DONE = new WeakMap();
/**
 * Make every soft block under `root` (a document or a shadow root) answer the hand. Safe to call twice.
 * `started(animation)` is told of each motion as it begins (the design site's timeline slows and holds them).
 * Returns { press(el, on) } to press one by hand.
 */
export function soften(root, { started } = {}) {
  if (DONE.has(root)) return DONE.get(root);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const down = new Set();
  const press = (el, on) => {
    if (el.classList.contains('down') === on) return;
    el.classList.toggle('down', on);
    if (on) down.add(el); else down.delete(el);
    if (still) return;
    const parts = partsOf(el);
    if (!parts.length) return;
    const f = feel(parts[0][1]);
    for (const [kind, part] of parts) {
      const from = freeze(part);
      const frames = on
        ? [{ transform: from, easing: OUT }, { transform: DOWN[kind](f) }]
        : [{ offset: 0, transform: from, easing: LAUNCH }, ...BEATS.map(([offset, s, t, easing]) => ({ offset, transform: POSE[kind](kind === 'toy' ? t : s, f), ...(easing ? { easing } : {}) }))];
      const a = part.animate(frames, { duration: on ? f.down : f.ms, fill: 'both' });
      a.id = 'soft';
      started?.(a);
      // at rest again: the stylesheet has it back (so pointing at it lifts it as before)
      if (!on) a.finished.then(() => { if (!el.classList.contains('down')) { part.style.transform = ''; a.cancel(); } }, () => {});
      part.style.transform = '';
    }
  };
  const blockOf = (e) => { const el = e.target instanceof Element ? e.target.closest(BLOCK) : null; return el && !el.matches(DEAD) ? el : null; };
  const letGo = () => { for (const el of [...down]) press(el, false); };
  root.addEventListener('pointerdown', (e) => { const el = blockOf(e); if (el && e.button === 0) press(el, true); });
  root.addEventListener('pointerup', letGo);
  root.addEventListener('pointercancel', letGo);
  root.addEventListener('pointerout', (e) => { const el = blockOf(e); if (el && !(e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) press(el, false); });
  root.addEventListener('focusout', (e) => { const el = blockOf(e); if (el) press(el, false); });
  root.addEventListener('keydown', (e) => { const el = blockOf(e); if (el && (e.key === 'Enter' || e.key === ' ') && !e.repeat) press(el, true); });
  root.addEventListener('keyup', (e) => { const el = blockOf(e); if (el && (e.key === 'Enter' || e.key === ' ')) press(el, false); });
  const api = { press };
  DONE.set(root, api);
  return api;
}
