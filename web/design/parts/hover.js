// The design site's page for words on hover: what it draws inside its host. Three kinds of words appear when you
// point: the name tag (what is this, and is it right?), the hint (what is wrong here, and what it becomes), and the
// key (what to press). The tag and the hint are the overlay's own (nametag.js, blueprint-marks.js MARKS_CSS) with its
// own words (words.js TAG); they follow the pointer over a card from someone's app the way they do on your page.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { NAME_TAG_CSS } from '../../../overlay/src/nametag.js';
import { MARKS_CSS } from '../../../overlay/src/blueprint-marks.js';
import { TAG } from '../../../overlay/src/words.js';

export function mount(host, root, css) {
  // each element on the card: how the tag names it, and what it says about it (the widget's naming rule and words)
  const SAYS = {
    card: { el: 'PricingCard', who: 'section', n: TAG.off(2), tone: '' },
    title: { el: 'h3', who: 'in PricingCard', n: TAG.clean, tone: 'ok' },
    price: { el: 'p', who: 'in PricingCard', n: TAG.off(1), tone: '', hint: ['text-[28px]', 'text-display'] },
    list: { el: 'ul', who: 'in PricingCard', n: TAG.computed, tone: 'quiet' },
    btn: { el: 'Button', who: 'button', n: TAG.styledBy('Radix'), tone: 'quiet' },
    pad: { el: 'PricingCard', who: 'section', n: TAG.off(2), tone: '', hint: ['p-[18px]', 'p-4'], n2: 2 },
  };

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${MARKS_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    h2 { margin: 44px 0 6px; font: 600 20px/28px var(--pl-sans); letter-spacing: -0.01em; }
    h2 + p, .prose p { margin: 0 0 10px; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); max-width: 680px; }
    .prose b { color: var(--pl-text-primary); font-weight: 600; }
    code { font: 500 12px/1.4 var(--pl-mono); }
    .panel { margin-top: 14px; border-radius: 18px; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); overflow: hidden; }

    /* ── on a page: the tag and the hint follow the pointer over someone's card ── */
    .live { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); }
    .page { position: relative; display: grid; place-items: center; padding: 72px 28px 64px; background: #f4f4f6; overflow: hidden; }
    .app { width: 260px; display: grid; gap: 10px; padding: 18px; border-radius: 14px; background: #fff; color: #1b1b1f; box-shadow: 0 1px 2px rgb(0 0 0 / .08), 0 10px 28px -14px rgb(0 0 0 / .3); font: 400 13px/18px system-ui, sans-serif; }
    .app h3 { margin: 0; font: 600 15px/20px system-ui, sans-serif; } .app .price { margin: 0; font: 700 28px/1 system-ui, sans-serif; }
    .app ul { margin: 0; padding: 0 0 0 16px; color: #5b5b66; } .app button { justify-self: start; padding: 8px 14px; border: 0; border-radius: 8px; background: #1b1b1f; color: #fff; font: 600 13px/1 system-ui, sans-serif; }
    .app [data-k] { cursor: default; }
    /* drift on the page: the padding is off the scale, hatched coral the way the overlay lights a wrong place */
    .app .drift { position: absolute; inset: 0; padding: 18px; border-radius: inherit; pointer-events: none; box-sizing: border-box;
      background: repeating-linear-gradient(-45deg, color-mix(in oklab, var(--pl-off) 55%, transparent) 0 1px, transparent 1px 4px);
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
    /* the overlay's own look for a wrong place (widget.js, the lit place): a coral hatch over exactly the region */
    .app { position: relative; }
    .ring { position: absolute; left: 0; top: 0; pointer-events: none; border-radius: 4px; box-shadow: 0 0 0 1.5px var(--pl-instrument); opacity: 0;
      transition: transform var(--pl-dur-travel) var(--pl-spring), width var(--pl-dur-travel) var(--pl-spring), height var(--pl-dur-travel) var(--pl-spring), opacity var(--pl-dur-feedback) var(--pl-ease-out); }
    .page[data-on] .ring { opacity: 1; }
    ${NAME_TAG_CSS}
    .page .tag { position: absolute; opacity: 0; } .page[data-on] .tag { opacity: 1; }
    .page .bp { position: absolute; inset: 0; } .page .bp-hint { position: absolute; }
    .side { padding: 22px; display: grid; gap: 14px; align-content: center; }
    .side .row { display: grid; grid-template-columns: 92px 1fr; gap: 12px; align-items: start; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }
    .side .row b { color: var(--pl-text-primary); font-weight: 600; }

    /* ── keys ── */
    .keys { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .keys > div { padding: 22px 20px; display: grid; gap: 12px; align-content: start; border-left: 1px solid var(--pl-border-default); }
    .keys > div:first-child { border-left: 0; }
    .keys h3 { margin: 0; font: 600 15px/20px var(--pl-sans); } .keys p { margin: 0; font: 400 13px/19px var(--pl-sans); color: var(--pl-text-secondary); }
    .keys .acts { display: flex; flex-wrap: wrap; gap: 8px; }
    .open { margin-top: 14px; padding: 14px 18px 14px 34px; border-radius: 16px; background: var(--pl-bg-surface); box-shadow: 0 0 0 1px var(--pl-border-default); font: 400 13px/21px var(--pl-sans); color: var(--pl-text-secondary); }
    .open li + li { margin-top: 6px; } .open b { color: var(--pl-text-primary); font-weight: 600; }
    @media (max-width: 760px) { .live, .keys { grid-template-columns: 1fr; } .keys > div { border-left: 0; border-top: 1px solid var(--pl-border-default); } .keys > div:first-child { border-top: 0; } }
  </style>
  <h2>How the system works</h2>
  <div class="prose">
    <p>Three kinds of words appear when you point, each answering one question. <b>The name tag</b>: what is this, and is it right? It follows the pointer, names the element the way your code does, and says its state in a few words. <b>The hint</b>: what is wrong here, and what it becomes, as one line from the wrong value to the right one. <b>The key</b>: what to press, said beside the thing it does.</p>
    <p>Words on hover never hold a choice; they say, and the choice is made on the element. They're quick to come and quicker to go.</p>
  </div>

  <h2>On a page</h2>
  <p>A card from someone's app. Point at its parts: the tag follows, naming each one. Point at the dashed edge, where the padding is off the scale: the hint says what it becomes.</p>
  <div class="panel live">
    <div class="page">
      <div class="app" data-k="card">
        <h3 data-k="title">Pro</h3>
        <p class="price" data-k="price">$24</p>
        <ul data-k="list"><li>Unlimited projects</li><li>A team of five</li></ul>
        <button data-k="btn">Upgrade</button>
        <i class="drift" aria-hidden="true"></i>
      </div>
      <i class="ring" aria-hidden="true"></i>
      <div class="tag" aria-hidden="true"></div>
      <div class="bp"><div class="bp-hint pill pl-dark" role="tooltip"></div></div>
    </div>
    <div class="side">
      <div class="row"><span><b>Name tag</b></span><span>Lifted like a tag on your page, light or dark with your page. The element's name in bold, where it's written in grey, its state in mono: coral when there are problems, mint when it matches your theme, grey when it can't be checked.</span></div>
      <div class="row"><span><b>Hint</b></span><span>Dark, so it reads over any page. The value as written in pink, the one it becomes in blue, and how many places, in one line.</span></div>
    </div>
  </div>

  <h2>Keys</h2>
  <p>A key is said beside what it does, in a small cap, so a hand on the keyboard never has to look for it. On a touch screen the caps go.</p>
  <div class="panel keys">
    <div><h3>On a button</h3><p>The cap sits after the words, in the button's own ink.</p><div class="acts"><button class="pl-act">Fix <kbd>↵</kbd></button><button class="pl-act quiet">Keep as is <kbd>K</kbd></button></div></div>
    <div><h3>Quiet</h3><p>On a quiet button the cap is a pale key with an edge.</p><div class="acts"><button class="pl-act quiet">Skip <kbd>→</kbd></button><button class="pl-act quiet">Close <kbd>Esc</kbd></button></div></div>
    <div><h3>One key, one meaning</h3><p>↵ takes what's in hand, Esc puts things back, → and ← move between fixes, K keeps. The same everywhere.</p></div>
  </div>

  <h2>What is still open</h2>
  <ul class="open">
    <li><b>Sixteen ways to draw a key.</b> Counted on 2026-11-13: key hints are styled 16 times across 10 files, in five sizes (9, 9.5, 10, 10.5 and 11px); 9 draw a cap and 7 are bare letters, with corners of 4, 5 and 6px. The shared cap on buttons is the one above; the rest should be it.</li>
    <li><b>The browser's own tooltip, 44 times.</b> Across 13 files, words are left to the browser's title tooltip: slow to come, grey, in the system font, and never shown on touch. They should be the name tag's words or the hint's, or said on the element.</li>
    <li><b>The hint's corner.</b> The hint pill writes its corner as 7px rather than the pill token.</li>
  </ul>`;

  // the tag, the ring and the hint follow the pointer, as on your page (the widget's travel and spring)
  const page = root.querySelector('.page'), tag = page.querySelector('.tag'), ring = page.querySelector('.ring'), hint = page.querySelector('.bp-hint');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const show = (el, k, x, y) => {
    const s = SAYS[k], p = page.getBoundingClientRect(), b = el.getBoundingClientRect();
    page.setAttribute('data-on', '');
    ring.style.transform = `translate(${b.left - p.left - 3}px, ${b.top - p.top - 3}px)`; ring.style.width = `${b.width + 6}px`; ring.style.height = `${b.height + 6}px`;
    tag.innerHTML = `<span class="el">${esc(s.el)}</span><span class="who">${esc(s.who)}</span><span class="n ${s.tone}">${esc(s.n)}</span>`;
    tag.style.transform = `translate(${Math.max(8, b.left - p.left - 3)}px, ${b.top - p.top - 34}px)`;
    if (s.hint) {
      hint.innerHTML = `<span class="line"><b class="from">${esc(s.hint[0])}</b> <span class="arr">→</span> <b class="to">${esc(s.hint[1])}</b>${s.n2 > 1 ? ` <span class="n">×${s.n2}</span>` : ''}</span>`;
      hint.style.left = `${Math.min(x - p.left + 14, p.width - 170)}px`; hint.style.top = `${y - p.top + 18}px`; hint.setAttribute('data-on', '');
    } else hint.removeAttribute('data-on');
  };
  page.addEventListener('pointermove', (e) => {
    const app = page.querySelector('.app'), a = app.getBoundingClientRect();
    const inPad = e.target === app && (e.clientX - a.left < 18 || a.right - e.clientX < 18 || e.clientY - a.top < 18 || a.bottom - e.clientY < 18);
    const el = e.target.closest('[data-k]');
    if (!el) { page.removeAttribute('data-on'); hint.removeAttribute('data-on'); return; }
    show(el, inPad ? 'pad' : el.dataset.k, e.clientX, e.clientY);
  });
  page.addEventListener('pointerleave', () => { page.removeAttribute('data-on'); hint.removeAttribute('data-on'); });
  void host;
}
