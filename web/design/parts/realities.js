// The design site's page for showing realities (docs/briefs/realities.md): the same page opened under one changed
// condition, and what did not hold up there. The question the component answers: "where does this page break, and
// what breaks there?" Three ways to show it, differing in kind, each live on the same piece of someone's app:
//   A  a dial in the bar        the bar carries the realities as stops; step through them and the page itself changes
//   B  a sheet of small pages   every reality drawn at once, small, side by side; pick one to go to it
//   C  on the element           no mode: a thing that breaks somewhere carries a small mark; hold it to see it break
// Every piece is the overlay's own: tokens, pills and cards (language.js), the toy button (kit.js), the toys (toys.js).
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { BUTTON_CSS, button } from '../../../overlay/src/kit.js';
import { TOY_DEFS, toyOf } from '../../../overlay/src/toys.js';

const AV = (c) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 26"><rect width="40" height="26" rx="5" fill="${c}"/><rect x="5" y="15" width="16" height="4" rx="2" fill="#fff" opacity=".85"/></svg>`)}`;
const ROWS = [
  { who: 'Acme Co', long: 'Wolfeschlegelsteinhausen Logistics GmbH', date: '3 Nov', amt: '$1,240.00', big: '$1,204,880.00', card: '#4f46e5' },
  { who: 'Northwind', long: 'Northwind Traders', date: '28 Oct', amt: '$310.00', big: '$310.00', card: '#0f766e' },
  { who: 'Globex', long: 'Globex Corporation of Springfield', date: '14 Oct', amt: '$2,075.50', big: '$92,075.50', card: '#b45309' },
];

// the realities: what is changed on the page, and what does not hold up there, in plain words
const REALITIES = [
  { id: 'plain', name: 'As it is', toy: 'card', said: 'This is the page as you built it.', finds: [] },
  { id: 'text', name: 'Larger text', toy: 'type', said: 'Someone who set a larger text size in their browser.', finds: [
    { sel: '.note', words: 'This line stays at 13px. Everything around it grew.' },
    { sel: '.dl', words: 'The box is 36px tall, so the larger words are cut off.' }] },
  { id: 'data', name: 'Other data', toy: 'table', said: 'Longer names and bigger amounts than yours.', finds: [
    { sel: 'table', words: 'A long name pushes the amount out of the card.' }] },
  { id: 'rtl', name: 'Right to left', toy: 'direction', said: 'The page in Arabic or Hebrew.', finds: [
    { sel: '.new', words: 'The space is on the wrong side of the icon.' }] },
  { id: 'images', name: 'Pictures fail', toy: 'image', said: 'A slow or broken connection.', finds: [
    { sel: '.paid', words: 'This column is only a picture. Without it, nothing says how each was paid.' }] },
];
const byId = (id) => REALITIES.find((r) => r.id === id);

// someone's invoices screen. Its sizes are in em, as a rem-based app's are; two things are hard-coded in pixels
const site = () => `
  <div class="site">
    <div class="hd"><h3>Invoices</h3><span class="new"><i class="plus">+</i>New invoice</span></div>
    <p class="note">Payment is taken from the card ending 4242.</p>
    <table><tbody>${ROWS.map((r) => `<tr><td class="who"><span class="nm" data-a="${r.who}" data-b="${r.long}">${r.who}</span></td><td class="dt">${r.date}</td><td class="amt" data-a="${r.amt}" data-b="${r.big}">${r.amt}</td><td class="paid"><img alt="" src="${AV(r.card)}"></td></tr>`).join('')}</tbody></table>
    <div class="dl">Download this year’s invoices as one PDF</div>
  </div>`;

// put one reality on a page, and take the last one off: everything is put back exactly
function open(el, id) {
  el.dataset.reality = id;
  el.style.fontSize = id === 'text' ? '24px' : '';
  if (id === 'rtl') el.setAttribute('dir', 'rtl'); else el.removeAttribute('dir');
  for (const n of el.querySelectorAll('[data-a]')) n.textContent = n.dataset[id === 'data' ? 'b' : 'a'];
  for (const n of el.querySelectorAll('.bad')) n.classList.remove('bad', 'at');
  for (const f of byId(id).finds) for (const n of el.querySelectorAll(f.sel)) { n.classList.add('bad'); break; }
}

export function mount(host, root, css) {
  const scene = (id, title, note, body) => `<section class="scene" id="${id}"><h2>${title}</h2><p>${note}</p><div class="stage" tabindex="0">${body}</div></section>`;
  // a stop is its toy and how many things break there. Its name is said in the bar when you are on it, and on hover
  const stop = (r) => button(r.finds.length ? `<b class="n">${r.finds.length}</b>` : '', { cls: 'sm quiet stop', icon: toyOf(r.toy), attrs: `data-stop="${r.id}" aria-pressed="false" aria-label="${r.name}${r.finds.length ? `, ${r.finds.length} to look at` : ''}" title="${r.name}"` });

  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${BUTTON_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-ink); }
    .scene { margin: 0 0 56px; }
    .scene > h2 { margin: 0 0 4px; }
    .scene > p { margin: 0 0 16px; max-width: 680px; }
    .stage { position: relative; padding: 26px 26px 92px; border-radius: 22px; background: var(--pl-paper-2); outline: none; }
    .stage:focus-visible { box-shadow: 0 0 0 2.5px var(--pl-sky); }

    /* ── someone's app (its own look). Sizes in em, so its text follows the size set on it ── */
    .site { position: relative; width: 430px; max-width: 100%; box-sizing: border-box; margin: 0 auto; padding: 1.25em 1.25em 1.4em; border-radius: 14px; background: #fff; color: #101828; font: 400 16px/1.5 system-ui, -apple-system, sans-serif; overflow: hidden;
      box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 10px 30px -16px rgb(16 24 40 / .25); transition: font-size 320ms var(--pl-ease-out); }
    .site .hd { display: flex; align-items: center; justify-content: space-between; gap: 1em; margin-bottom: .5em; }
    .stage .site h3 { margin: 0; font: 700 1.375em/1.2 system-ui, sans-serif; color: #101828; }
    .site .new { display: inline-flex; align-items: center; padding: .4em .8em; border-radius: .5em; background: #4f46e5; color: #fff; font-weight: 600; font-size: .875em; white-space: nowrap; }
    .site .plus { margin-right: .45em; font-style: normal; font-weight: 700; }            /* a physical margin: wrong side in a right-to-left page */
    .stage .site .note { margin: 0 0 1em; font-size: 13px; color: #475467; }                 /* hard-coded in pixels */
    .site table { width: 100%; border-collapse: collapse; font-size: .9375em; }
    .site td { padding: .55em 0; border-top: 1px solid #eaecf0; white-space: nowrap; }
    .site .who { width: 100%; }
    .site .dt { padding-inline: .9em; color: #475467; }
    .site .amt { font-variant-numeric: tabular-nums; text-align: end; font-weight: 600; }
    .site .paid { padding-inline-start: .9em; }
    .site .paid img { display: block; width: 2em; height: 1.3em; }
    .site[data-reality="images"] .paid img { visibility: hidden; }
    .site .dl { margin-top: 1em; height: 36px; box-sizing: border-box; padding: .35em .8em; border-radius: .5em; background: #f2f4f7; color: #344054; font-weight: 500; line-height: 1.5; overflow: hidden; } /* a set height in pixels */

    /* what did not hold up: marked in coral, the only colour that means wrong. The one in hand is marked harder */
    .site .bad { outline: 2px solid color-mix(in oklab, var(--pl-coral) 55%, transparent); outline-offset: 3px; border-radius: 6px; cursor: pointer; }
    .site .bad.at { outline-color: var(--pl-coral); outline-width: 2.5px; }

    /* ── A: the dial, a state of the bar ── */
    .dial { position: absolute; left: 50%; bottom: 16px; translate: -50% 0; max-width: calc(100% - 24px); box-sizing: border-box; display: flex; align-items: center; gap: 12px; padding: 7px 8px 5px 14px; border-radius: 25px; }
    .dial .say { display: grid; gap: 1px; min-width: 0; margin-right: 4px; }
    .dial .say b { font: var(--pl-round-w2, 700) 14px/18px var(--pl-round); color: var(--pl-ink); white-space: nowrap; }
    .dial .say span { font: 500 12px/16px var(--pl-sans); color: var(--pl-ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 380px; }
    .dial .say span.wrong { color: var(--pl-coral-ink); }
    .stops { display: inline-flex; gap: 6px; padding-top: 2px; }
    .stop .ic { display: block; width: 18px; height: 18px; } .stop .ic svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .stop .top { padding: 0 10px; gap: 5px; }
    .stop .n { font: 600 11px/1 var(--pl-mono); opacity: .8; }
    /* the stop you are on is pink: pink is what is current */
    .tb.quiet.stop[aria-pressed="true"], .tb.stop[aria-pressed="true"] { --hue: var(--pl-pink-block); --base: color-mix(in oklab, var(--pl-pink-block) 70%, #000); --on: var(--pl-pink-block-on); color: var(--pl-pink-block-on); }
    .tb.stop[aria-pressed="true"] .top { background: linear-gradient(180deg, color-mix(in oklab, var(--pl-pink-block) 88%, #fff), var(--pl-pink-block)); color: var(--pl-pink-block-on); }

    /* ── B: the sheet of small pages ── */
    .sheet { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
    .sheet figure { margin: 0; min-width: 0; cursor: pointer; }
    .sheet .mini { position: relative; height: 0; padding-bottom: 86%; border-radius: 12px; overflow: hidden; background: #fff; container-type: inline-size; }
    .sheet .mini .site { position: absolute; left: 0; top: 0; width: 430px; max-width: none; margin: 0; border-radius: 0; box-shadow: none; transform: scale(var(--k, .3)); transform-origin: 0 0; pointer-events: none; }
    .sheet figcaption { display: flex; align-items: center; gap: 6px; margin-top: 8px; font: var(--pl-round-w, 600) 13px/1 var(--pl-round); color: var(--pl-ink); }
    .sheet figcaption i { width: 18px; height: 18px; } .sheet figcaption svg { display: block; width: 100%; height: 100%; }
    .sheet figcaption .n { margin-left: auto; font: 600 11px/1 var(--pl-mono); color: var(--pl-ink-2); }
    .sheet figure[aria-current="true"] .mini { box-shadow: 0 0 0 3px var(--pl-pink); }
    .b-big { margin-top: 22px; } .b-line { margin: 12px auto 0; max-width: 430px; font: 500 13px/18px var(--pl-sans); color: var(--pl-ink-2); min-height: 18px; }

    /* ── C: on the element ── */
    .site .hold { position: absolute; display: grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 7px; background: var(--pl-paper); box-shadow: var(--pl-shadow-card); cursor: pointer; transition: scale 260ms var(--pl-spring-pop); }
    .site .hold:hover { scale: 1.14; } .site .hold svg { display: block; width: 15px; height: 15px; }
    .c-line { position: absolute; left: 50%; bottom: 18px; translate: -50% 0; display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 16px; border-radius: 22px; white-space: nowrap; font: 500 13px/1 var(--pl-sans); color: var(--pl-ink-2); }
    .c-line b { font: var(--pl-round-w2, 700) 14px/1 var(--pl-round); color: var(--pl-ink); }
    .c-line .wrong { color: var(--pl-coral-ink); }

    .pick { margin: 0 0 56px; } .pick li { margin: 0 0 8px; max-width: 680px; font: 500 16px/25px var(--pl-sans); color: var(--pl-ink-2); } .pick b { color: var(--pl-ink); }
    @media (prefers-reduced-motion: reduce) { .site { transition: none; } }
  </style>${TOY_DEFS}

  ${scene('a', 'A. A dial in the bar', 'The bar that says what is hard-coded has a second state: the realities, as stops. Step through them with ← and →, or press one. Your page itself changes, and what did not hold up is marked on it in coral. Press a marked thing to read what is wrong with it.',
    `${site()}<div class="dial pl-card" role="toolbar" aria-label="Realities"><span class="say"><b></b><span></span></span><span class="stops">${REALITIES.map((r) => stop(r)).join('')}</span></div>`)}

  ${scene('b', 'B. A sheet of small pages', 'Every reality drawn at once, small. You see where the trouble is before you go anywhere; picking one makes it the big one.',
    `<div class="sheet">${REALITIES.map((r) => `<figure data-stop="${r.id}"><div class="mini">${site()}</div><figcaption><i>${toyOf(r.toy)}</i>${r.name}${r.finds.length ? `<span class="n">${r.finds.length}</span>` : ''}</figcaption></figure>`).join('')}</div><div class="b-big">${site()}</div><p class="b-line"></p>`)}

  ${scene('c', 'C. On the element', 'No dial and no mode. A thing that breaks somewhere carries a small mark, the toy of that reality. Press and hold the mark and the page becomes that reality for as long as you hold.',
    `${site()}<div class="c-line pl-card"><b>4 realities</b><span>Hold a mark to see it break.</span></div>`)}

  <h2>Which one</h2>
  <ul class="pick">
    <li><b>A, with C’s way in.</b> The dial answers the whole question (where does it break, and what breaks there) in one small surface that is already on the page, and the page is the picture. From C it takes one thing: a finding that belongs to a reality says so on its element, and choosing it turns the dial there.</li>
    <li><b>B is not picked.</b> It is the best overview, and it is a large thing that opens over the page to show states, which this product does not do. Small copies also hide small faults: a line that failed to grow is hard to see at a third of its size.</li>
    <li><b>C alone is not picked.</b> It keeps you on the element, and it only works once you know which element to ask. It gives no answer to “is anything else broken at larger text?”.</li>
  </ul>`;

  // ── A ──
  const A = root.querySelector('#a'), aSite = A.querySelector('.site'), say = A.querySelector('.say'), stops = [...A.querySelectorAll('.stop')];
  let at = 0;
  const tell = (r, find = null) => {
    say.children[0].textContent = r.finds.length ? `${r.name}: ${r.finds.length === 1 ? '1 thing doesn’t' : `${r.finds.length} things don’t`} hold up` : r.id === 'plain' ? 'Your page, as it is' : `${r.name}: everything holds up`;
    say.children[1].textContent = find ? find.words : r.said;
    say.children[1].classList.toggle('wrong', !!find);
  };
  const go = (i) => {
    at = (i + REALITIES.length) % REALITIES.length;
    const r = REALITIES[at];
    open(aSite, r.id);
    stops.forEach((b, k) => b.setAttribute('aria-pressed', String(k === at)));
    tell(r);
  };
  stops.forEach((b, i) => b.addEventListener('click', () => go(i)));
  A.querySelector('.stage').addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { go(at + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { go(at - 1); e.preventDefault(); } if (e.key === 'Escape') go(0); });
  aSite.addEventListener('click', (e) => {
    const r = REALITIES[at], hit = r.finds.find((f) => e.target.closest(f.sel));
    if (!hit) return;
    for (const n of aSite.querySelectorAll('.bad')) n.classList.toggle('at', n === e.target.closest(hit.sel));
    tell(r, hit);
  });
  go(0);

  // ── B ──
  const B = root.querySelector('#b'), figs = [...B.querySelectorAll('figure')], big = B.querySelector('.b-big .site'), line = B.querySelector('.b-line');
  figs.forEach((f) => open(f.querySelector('.site'), f.dataset.stop));
  // each small page is the real one, scaled to its tile
  const fit = () => figs.forEach((f) => { const m = f.querySelector('.mini'); m.style.setProperty('--k', String(m.clientWidth / 430)); });
  fit(); new ResizeObserver(fit).observe(B.querySelector('.sheet'));
  const pick = (id) => { open(big, id); figs.forEach((f) => f.setAttribute('aria-current', String(f.dataset.stop === id))); const r = byId(id); line.textContent = r.finds.length ? r.finds.map((f) => f.words).join(' ') : r.said; };
  figs.forEach((f) => f.addEventListener('click', () => pick(f.dataset.stop)));
  pick('plain');

  // ── C ──
  const C = root.querySelector('#c'), cSite = C.querySelector('.site'), cLine = C.querySelector('.c-line');
  open(cSite, 'plain');
  const rest = () => { open(cSite, 'plain'); cLine.innerHTML = '<b>4 realities</b><span>Hold a mark to see it break.</span>'; place(); };
  const marks = [];
  for (const r of REALITIES) for (const f of r.finds) {
    const m = document.createElement('button');
    m.type = 'button'; m.className = 'hold'; m.innerHTML = toyOf(r.toy); m.setAttribute('aria-label', `${r.name}: hold to see`);
    cSite.append(m); marks.push({ m, r, f });
    const show = () => { open(cSite, r.id); cLine.innerHTML = `<b>${r.name}</b><span class="wrong">${f.words}</span>`; place(); };
    m.addEventListener('pointerdown', (e) => { m.setPointerCapture(e.pointerId); show(); });
    m.addEventListener('pointerup', rest); m.addEventListener('pointercancel', rest);
    m.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { show(); e.preventDefault(); } });
    m.addEventListener('keyup', rest);
  }
  // each mark sits at the end of its thing, outside it, so it never covers what it is about
  function place() {
    const S = cSite.getBoundingClientRect();
    for (const { m, f } of marks) { const t = cSite.querySelector(f.sel); if (!t) continue; const b = t.getBoundingClientRect(); m.style.left = `${Math.min(S.width - 26, b.right - S.left + 4)}px`; m.style.top = `${b.top - S.top + b.height / 2 - 11}px`; }
  }
  requestAnimationFrame(place);
}
