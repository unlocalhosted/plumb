// The design site's page for the X-ray (prototype, 2026-11-13): point at any part of someone's card and see what it's
// made of, drawn on it and said beside it. Built from the overlay's own module (overlay/src/xray.js), with someone's
// theme scale so each value is judged: mint on the scale, coral off it.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS } from '../../../overlay/src/toys.js';
import { XRAY_CSS, xray } from '../../../overlay/src/xray.js';

// someone's theme (Tailwind's): spacing, radius and type steps in px
const SCALE = {
  spacing: [[2, '0.5'], [4, '1'], [6, '1.5'], [8, '2'], [10, '2.5'], [12, '3'], [14, '3.5'], [16, '4'], [20, '5'], [24, '6'], [28, '7'], [32, '8'], [40, '10'], [48, '12']],
  radius: [[2, 'xs'], [4, 'sm'], [6, 'md'], [8, 'lg'], [12, 'xl'], [16, '2xl'], [24, '3xl'], [9999, 'full']],
  type: [[12, 'xs'], [14, 'sm'], [16, 'base'], [18, 'lg'], [20, 'xl'], [24, '2xl']],
};
const tokenOf = (family, n) => SCALE[family]?.find(([v]) => Math.abs(v - n) <= 0.5 || (v === 9999 && n > 500))?.[1] ?? null;

// each part of the card: the name its code gives it, and the line it's written on
const NAMES = {
  card: ['TeamCard', 'app/settings/TeamCard.tsx:14'], head: ['CardHeader', 'app/settings/TeamCard.tsx:16'], title: ['h3', 'app/settings/TeamCard.tsx:18'],
  badge: ['Badge', 'components/ui/badge.tsx:9'], lede: ['p', 'app/settings/TeamCard.tsx:21'], list: ['ul', 'app/settings/TeamCard.tsx:24'],
  member: ['MemberRow', 'app/settings/MemberRow.tsx:7'], avatar: ['Avatar', 'components/ui/avatar.tsx:12'], who: ['div', 'app/settings/MemberRow.tsx:10'],
  role: ['Select', 'components/ui/select.tsx:31'], foot: ['div', 'app/settings/TeamCard.tsx:40'], invite: ['Button', 'components/ui/button.tsx:22'], cancel: ['Button', 'components/ui/button.tsx:22'],
};

export function mount(host, root, css) {
  const people = [['MA', 'Mara Ellis', 'mara@shoreline.co', 'Owner', '#ffd3cd'], ['JK', 'Jun Kato', 'jun@shoreline.co', 'Editor', '#c5e6fd'], ['SR', 'Sami Reyes', 'sami@shoreline.co', 'Viewer', '#e3dcff']];
  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${XRAY_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    h2 { margin: 44px 0 6px; font: 600 20px/28px var(--pl-sans); letter-spacing: -0.01em; }
    h2 + p, .prose p { margin: 0 0 10px; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); max-width: 680px; }
    .prose b { color: var(--pl-text-primary); font-weight: 600; }
    .stage { position: relative; margin-top: 14px; min-height: 620px; border-radius: 22px; background: #f4f4f6; overflow: hidden; display: grid; align-items: center; padding: 72px 360px 72px 72px; }
    .stage .hint { position: absolute; left: 0; right: 0; bottom: 18px; margin: 0; text-align: center; font: 500 12.5px/1 var(--pl-sans); color: #6b6b75; }
    .stage[data-pinned] .hint b { color: var(--pl-pink); }
    .xr-card[hidden] { display: block; opacity: 0; }
    .xr-card { opacity: 1; transition: transform 420ms var(--pl-spring), opacity 200ms var(--pl-ease-out); }

    /* someone's card, in someone's styles: some on their scale, some written by hand */
    .app { justify-self: center; width: 420px; box-sizing: border-box; padding: 22px; border-radius: 14px; background: #fff; color: #101828; box-shadow: 0 1px 2px rgb(16 24 40 / .06), 0 12px 32px -16px rgb(16 24 40 / .28);
      font: 400 14px/20px ui-sans-serif, system-ui, sans-serif; display: grid; gap: 18px; cursor: default; }
    .app .head { display: flex; align-items: center; gap: 10px; }
    .app h3 { margin: 0; font: 650 17px/24px ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.01em; }
    .app .badge { padding: 2px 8px; border-radius: 9999px; background: #ecfdf3; color: #067647; font: 600 12px/18px ui-sans-serif, system-ui, sans-serif; }
    .app .lede { margin: -12px 0 0; color: #475467; }
    .app ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 12px; }
    .app li { display: flex; align-items: center; gap: 12px; }
    .app .av { width: 36px; height: 36px; border-radius: 9999px; display: grid; place-items: center; font: 600 13px/1 ui-sans-serif, system-ui, sans-serif; color: #344054; }
    .app .who { display: grid; flex: 1; min-width: 0; } .app .who b { font-weight: 600; } .app .who span { font-size: 13px; color: #667085; }
    .app .role { padding: 6px 10px; border-radius: 8px; box-shadow: inset 0 0 0 1px #d0d5dd; font: 500 13px/18px ui-sans-serif, system-ui, sans-serif; color: #344054; }
    .app .foot { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
    .app button { padding: 9px 15px; border: 0; border-radius: 7px; font: 600 14px/20px ui-sans-serif, system-ui, sans-serif; cursor: default; }
    .app .invite { background: #2563eb; color: #fff; } .app .cancel { background: #fff; color: #344054; box-shadow: inset 0 0 0 1px #d0d5dd; }
    @media (max-width: 900px) { .stage { padding: 56px 20px 340px; } }
  </style>
  ${TOY_DEFS}
  <h2>The idea</h2>
  <div class="prose">
    <p>Point at anything on your page and see what it's made of. <b>On the element</b>, its space in the patterns: padding hatched, margin dotted, gaps striped, corners traced, its size on rulers. Mint where a value is on your scale, coral where it's written by hand. <b>Beside it</b>, a card says the same in numbers: which part it is and where it's written, its box drawn small, then corner, gap, type, colour and contrast, each value with its token.</p>
    <p>It follows the pointer; a click holds it. Next, the values on it can be dragged to change, snapping to your scale.</p>
  </div>
  <h2>Point at the card</h2>
  <div class="stage" tabindex="0">
    <div class="app" data-x="card">
      <div class="head" data-x="head"><h3 data-x="title">Your team</h3><span class="badge" data-x="badge">3 seats left</span></div>
      <p class="lede" data-x="lede">People here can edit the workspace and its billing.</p>
      <ul data-x="list">${people.map(([i, n, e, r, c]) => `<li data-x="member"><span class="av" data-x="avatar" style="background:${c}">${i}</span><span class="who" data-x="who"><b>${n}</b><span>${e}</span></span><span class="role" data-x="role">${r}</span></li>`).join('')}</ul>
      <div class="foot" data-x="foot"><button class="cancel" data-x="cancel">Cancel</button><button class="invite" data-x="invite">Invite people</button></div>
    </div>
    <div class="xr"></div>
    <div class="xr-card" hidden></div>
    <p class="hint">Point at anything · click to hold it · click again to let go</p>
  </div>`;

  const stage = root.querySelector('.stage'), layer = stage.querySelector('.xr'), card = stage.querySelector('.xr-card');
  let shown = null, pinned = null;
  const draw = (el) => {
    if (!el) { layer.innerHTML = ''; card.hidden = true; shown = null; return; }
    const s = stage.getBoundingClientRect(), [name, source] = NAMES[el.dataset.x] ?? [el.localName, null];
    const x = xray(el, { tokenOf, origin: { left: s.left, top: s.top }, room: { left: 12, top: 12, right: s.width - 12, bottom: s.height - 40 }, name, source });
    layer.innerHTML = x.page;
    if (el !== shown) card.innerHTML = x.card;
    const first = card.hidden;
    if (first) card.setAttribute('data-fresh', '');
    card.style.transform = `translate(${x.at.x}px, ${x.at.y}px)`;
    card.hidden = false;
    if (first) requestAnimationFrame(() => card.removeAttribute('data-fresh'));
    shown = el;
  };
  stage.addEventListener('pointermove', (e) => { if (pinned) return; const el = e.target.closest?.('[data-x]'); if (el !== shown) draw(el); });
  stage.addEventListener('pointerleave', () => { if (!pinned) draw(null); });
  stage.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-x]');
    pinned = pinned || !el ? null : el;
    stage.toggleAttribute('data-pinned', !!pinned);
    draw(el);
  });
  addEventListener('resize', () => shown && draw(shown));
  void host;
}
