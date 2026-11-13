// The design site's page for the X-ray (prototype, 2026-11-13): point at any part of someone's card and see what it's
// made of, drawn on it and said beside it. Built from the overlay's own module (overlay/src/xray.js), with someone's
// theme scale so each value is judged: mint on the scale, coral off it.
import { LANGUAGE_CSS } from '../../../overlay/src/language.js';
import { TOY_DEFS } from '../../../overlay/src/toys.js';
import { XRAY_CSS, xray, zonesOf, zoneAt } from '../../../overlay/src/xray.js';
import { PICKER_CSS, picker } from '../../../overlay/src/picker.js';
import { burst } from '../../../overlay/src/burst.js';

// someone's theme (Tailwind's): spacing, radius and type steps in px
const SCALE = {
  spacing: [[2, '0.5'], [4, '1'], [6, '1.5'], [8, '2'], [10, '2.5'], [12, '3'], [14, '3.5'], [16, '4'], [20, '5'], [24, '6'], [28, '7'], [32, '8'], [40, '10'], [48, '12']],
  radius: [[2, 'xs'], [4, 'sm'], [6, 'md'], [8, 'lg'], [12, 'xl'], [16, '2xl'], [24, '3xl'], [9999, 'full']],
  // widths and heights: the spacing scale to 96, then Tailwind's larger steps and its container widths
  size: [[32, '8'], [36, '9'], [40, '10'], [48, '12'], [64, '16'], [80, '20'], [96, '24'], [128, '32'], [160, '40'], [192, '48'], [224, '56'], [256, '64'], [288, '72'], [320, '80'], [384, '96'], [448, 'md'], [512, 'lg'], [576, 'xl'], [672, '2xl']],
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
  root.innerHTML = `<style>${css}${LANGUAGE_CSS}${XRAY_CSS}${PICKER_CSS}
    :host { display: block; font-family: var(--pl-sans); color: var(--pl-text-primary); }
    h2 { margin: 44px 0 6px; font: 600 20px/28px var(--pl-sans); letter-spacing: -0.01em; }
    h2 + p, .prose p { margin: 0 0 10px; font: 400 14px/22px var(--pl-sans); color: var(--pl-text-secondary); max-width: 680px; }
    .prose b { color: var(--pl-text-primary); font-weight: 600; }
    .stage { position: relative; margin-top: 14px; min-height: 620px; border-radius: 22px; background: #f4f4f6; overflow: hidden; display: grid; align-items: center; padding: 72px 360px 72px 72px; }
    .stage .app { user-select: none; -webkit-user-select: none; }
    .stage .hint kbd { font: 600 11px/1 var(--pl-sans); padding: 2px 5px; border-radius: 5px; background: #fff; box-shadow: 0 0 0 1px #d8d8de; }
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
    /* the value in hand, beside the pointer: its number and its token, while you drag or scroll */
    .xr-live { position: absolute; z-index: 8; pointer-events: none; display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 6px 0 10px; border-radius: 99px; white-space: nowrap;
      background: var(--pl-text-primary); color: var(--pl-bg-surface); font: 600 12px/1 var(--pl-mono); font-variant-numeric: tabular-nums; box-shadow: 0 6px 16px -6px rgb(0 0 0 / .4); }
    .xr-live[hidden] { display: none; }
    .xr-live b { font-family: var(--pl-sans); } .xr-live i { font: 700 10.5px/1 var(--pl-sans); font-style: normal; padding: 4px 7px; border-radius: 99px; background: var(--pl-mint); color: #fff; }
    .xr-live i.off { background: var(--pl-coral); }
    /* a list, from a click on a number: your sizes, nearest first in order */
    .xr-list { position: absolute; z-index: 9; display: grid; padding: 4px; min-width: 120px; max-height: 240px; overflow: auto; border-radius: 12px; background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card); animation: pl-pop 200ms var(--pl-spring-pop) both; }
    .xr-list button { display: flex; justify-content: space-between; gap: 12px; padding: 6px 8px; border: 0; border-radius: 8px; background: none; font: 600 12px/1 var(--pl-sans); color: var(--pl-text-primary); cursor: pointer; }
    .xr-list button span { font: 500 11.5px/1 var(--pl-mono); color: var(--pl-text-secondary); }
    .xr-list button:hover, .xr-list button[aria-selected="true"] { background: var(--pl-sky-soft); }
    .xr-list button.hard { color: var(--pl-coral-ink); }
    /* the value in hand, as the token picker row at the top of the card: which sides and the value, side by side.
       Two fingers left and right move between them; up and down change the one lit. No tick: the card's Sync writes */
    .xr-hand { margin: -2px -2px 10px; min-height: 34px; }
    .xr-hand:empty::before { content: 'Point at a part or a number'; display: flex; align-items: center; height: 34px; padding: 0 10px; border-radius: 11px; background: var(--pl-bg-inset); font: 500 12px/1 var(--pl-sans); color: var(--pl-text-secondary); }
    .xr-hand .row { position: relative; width: 100%; box-sizing: border-box; box-shadow: 0 0 0 1px var(--pl-border-default); }
    .xr-hand .row .ok, .xr-hand .list { display: none; }
    .xr-hand .row .val { flex: 1; }
    .xr-hand .side { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 7px; border-radius: 8px; font: 600 11.5px/1 var(--pl-sans); color: var(--pl-ink-2); white-space: nowrap; transition: background-color 200ms var(--pl-ease-out), color 200ms var(--pl-ease-out); }
    /* the thumb behind the place in force: lilac over the sides, sky over the value; it slides on the overlay's spring
       and follows the fingers while they pull it */
    .xr-hand .row > :not(.thumb) { position: relative; z-index: 1; }
    .xr-hand .thumb { position: absolute; left: 0; top: 3px; bottom: 3px; z-index: 0; border-radius: 8px; pointer-events: none;
      background: var(--pl-sky-soft); box-shadow: inset 0 0 0 1.5px color-mix(in oklab, var(--pl-sky) 50%, transparent);
      transition: transform 420ms var(--pl-spring), width 420ms var(--pl-spring), background-color 220ms var(--pl-ease-out); }
    .xr-hand .thumb[data-on="mode"] { background: var(--pl-lilac-soft); box-shadow: inset 0 0 0 1.5px color-mix(in oklab, var(--pl-lilac) 50%, transparent); }
    .xr-hand .thumb[data-pulled] { transition: transform 60ms linear, width 60ms linear; }
    .xr-hand .row[data-seg="mode"] .side { color: var(--pl-lilac-ink); }
    .xr-hand .say { display: flex; gap: 10px; margin: 6px 4px 0; font: 600 10.5px/1 var(--pl-sans); color: #8a8a94; }
    .xr-hand .say span[data-on] { color: var(--pl-text-primary); }
    /* the changes, collected at the foot of the card: how many, Sync, and the way back */
    .xr-pend { display: flex; align-items: center; gap: 4px; white-space: nowrap; margin: 10px -2px -2px; padding: 8px 8px 8px 12px; border-radius: 12px; background: var(--pl-pink-soft); color: var(--pl-pink-ink); font: 600 12px/1 var(--pl-sans); animation: pl-pop 260ms var(--pl-spring-pop) both; }
    .xr-pend .sp { flex: 1; }
    .xr-pend button { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 9px; white-space: nowrap; border: 0; border-radius: 9px; font: 700 12px/1 var(--pl-sans); cursor: pointer; }
    .xr-pend .sync { background: var(--pl-pink); color: #fff; box-shadow: 0 2px 0 color-mix(in oklab, var(--pl-pink) 60%, #000); }
    .xr-pend .back { background: none; color: var(--pl-pink-ink); }
    .xr-pend kbd { font: 600 10.5px/1 var(--pl-sans); opacity: .8; }
    .xr-pend[data-done] { background: var(--pl-mint-soft); color: var(--pl-mint-ink); }
    /* a note for your agent: a well to write in, the place it's about above it */
    .xr-note { position: absolute; z-index: 7; width: 300px; box-sizing: border-box; padding: 12px; border-radius: 18px; background: var(--pl-bg-surface); box-shadow: var(--pl-shadow-card);
      animation: pl-pop 280ms var(--pl-spring-pop) both; transform-origin: 0 0; }
    .xr-note .nh { display: flex; align-items: center; gap: 8px; font: 700 13px/18px var(--pl-sans); }
    .xr-note .nh .toy { width: 22px; height: 22px; } .xr-note .nh .toy svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .xr-note code { display: block; margin: 2px 0 8px 30px; font: 500 11px/14px var(--pl-mono); color: var(--pl-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .xr-note textarea { display: block; width: 100%; box-sizing: border-box; min-height: 84px; resize: none; padding: 10px 12px; border: 0; border-radius: 12px; outline: none;
      background: var(--pl-bg-inset); box-shadow: var(--pl-shadow-well); color: var(--pl-text-primary); font: 400 13.5px/20px var(--pl-sans); }
    .xr-note textarea:focus { box-shadow: var(--pl-shadow-well), 0 0 0 2px color-mix(in oklab, var(--pl-lilac) 45%, transparent); }
    .xr-note .nf { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font: 500 11.5px/1 var(--pl-sans); color: var(--pl-text-secondary); }
    .xr-note kbd { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px; margin-right: 3px; border-radius: 6px; font: 600 11px/1 var(--pl-sans); color: var(--pl-text-primary); background: var(--pl-bg-inset); box-shadow: inset 0 -1px 0 var(--pl-border-default), 0 0 0 1px var(--pl-border-default); }
    .xr-note[data-done] textarea { opacity: .5; }
    .xr-note .done { display: none; align-items: center; gap: 6px; color: var(--pl-mint-ink); font-weight: 700; }
    .xr-note[data-done] .done { display: inline-flex; } .xr-note[data-done] .keys { display: none; }
    .xr-note .done i { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 99px; background: var(--pl-mint); color: #fff; font-style: normal; font-size: 11px; }
    @media (max-width: 900px) { .stage { padding: 56px 20px 340px; } }
  </style>
  ${TOY_DEFS}
  <h2>The idea</h2>
  <div class="prose">
    <p>Point at anything on your page and see what it's made of. <b>On the element</b>, its space in the patterns: padding hatched, margin dotted, gaps striped, corners traced, its size on rulers. Mint where a value is on your scale, coral where it's written by hand. <b>Beside it</b>, a card says the same in numbers: which part it is and where it's written, its box drawn small, then corner, gap, type, colour and contrast, each value with its token.</p>
    <p>Nothing to switch on. <b>Point at a part and it's in hand</b>: a padding side, a margin side (a band outside it, even at 0), the width or height ruler, a corner, the gap, the words. It lights up with one pill saying what it is; press on it and drag, and it snaps to your scale as you go. The row at the top of the card holds it too: two fingers left and right choose which sides or the value, up and down change it. <b>Every number in the card is a control too</b>: drag it sideways, scroll on it, or click it for the list. The card waits while you move to it. Changes collect at the foot of the card; <b>Sync</b> (or ↵, or a double-click) writes them, Esc puts them back. With nothing to sync, ↵ opens a note for your agent.</p>
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
    <div class="xr-card" hidden><div class="xr-hand"></div><div class="xr-body"></div></div>
    <p class="hint">Point at a part · drag it, or a number · <kbd>↵</kbd> sync, or a note for your agent · <kbd>Esc</kbd> put back</p>
  </div>`;

  const stage = root.querySelector('.stage'), layer = stage.querySelector('.xr'), card = stage.querySelector('.xr-card'), body = card.querySelector('.xr-body'), hand = card.querySelector('.xr-hand');
  let lastCard = '', shown = null, pinned = null, noting = null, held = null, cardAt = { x: 0, y: 0 }, lastOn = null, waiting = 0;
  const box = () => stage.getBoundingClientRect();
  const nameOf = (el) => NAMES[el.dataset.x] ?? [el.localName, null];
  // the changes not yet synced: element → { prop → the inline value it had before }
  const changes = new Map();
  // which sides move together, kept until changed: 'one', 'pair' or 'all' (the row's left place)
  let link = 'one';
  const LINKS = ['one', 'pair', 'all'];
  const PAIR = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
  // the properties a side's change moves: by the toggle, or for this drag by ⇧ (pair) and ⌘ (all four)
  const linkedOf = (prop, e = {}) => {
    const sided = prop.match(/^(padding|margin)-(top|right|bottom|left)$/); if (!sided) return [prop];
    const how = e.metaKey || e.ctrlKey ? 'all' : e.shiftKey ? 'pair' : link;
    return how === 'all' ? ['top', 'right', 'bottom', 'left'].map((k) => `${sided[1]}-${k}`) : how === 'pair' ? [prop, `${sided[1]}-${PAIR[sided[2]]}`] : [prop];
  };
  const count = () => [...changes.values()].reduce((n, m) => n + m.size, 0);

  // the part pointed at (a padding side, a margin side, the width or height ruler, a corner, the gap, the words)
  let zone = null, justDragged = false;
  const draw = (el) => {
    if (!el) { layer.innerHTML = ''; card.hidden = true; shown = null; zone = null; return; }
    const s = box(), [name, source] = nameOf(el);
    // the sides that move with the one in hand are lit with it
    const zs = zonesOf(el), inProp = held?.prop ?? zone?.prop;
    const lit = inProp ? zs.filter((q) => q.prop !== inProp && linkedOf(inProp, keysNow).includes(q.prop)) : [];
    const z = zone && zs.find((q) => q.prop === zone.prop) || zone;
    const x = xray(el, { tokenOf, origin: { left: s.left, top: s.top }, room: { left: 12, top: 12, right: s.width - 12, bottom: s.height - 96 }, name, source, zone: z, lit });
    const same = el === shown;
    if (!same) hold(null);
    layer.toggleAttribute('data-still', same);
    layer.innerHTML = x.page;
    card.toggleAttribute('data-still', same);
    const foot = pendHtml();
    if (!same || x.card + foot !== lastCard) {
      body.innerHTML = x.card + foot; lastCard = x.card + foot;
    }
    // which numbers are changed, and the one in hand, kept true whether or not the card was written again
    for (const ch of card.querySelectorAll('[data-prop]')) {
      ch.toggleAttribute('data-changed', !!changes.get(el)?.has(ch.dataset.prop));
      ch.toggleAttribute('data-held', !!held?.chip && held.prop === ch.dataset.prop);
    }
    const first = card.hidden;
    if (first) card.setAttribute('data-fresh', '');
    card.style.transform = `translate(${x.at.x}px, ${x.at.y}px)`; cardAt = x.at;
    card.hidden = !!noting;
    if (first) requestAnimationFrame(() => card.removeAttribute('data-fresh'));
    shown = el;
  };
  let keysNow = {};
  addEventListener('keydown', (e) => { if (e.key === 'Shift' || e.key === 'Meta') { keysNow = e; if (shown && !held) draw(shown); } });
  addEventListener('keyup', (e) => { if (e.key === 'Shift' || e.key === 'Meta') { keysNow = {}; if (shown && !held) draw(shown); } });

  // ── reaching the card: moving toward it keeps the element shown (the way a menu lets you cross to its submenu) ──
  const inTri = (p, a, b, c) => { const d = (u, v, w) => (u.x - w.x) * (v.y - w.y) - (v.x - w.x) * (u.y - w.y); const d1 = d(p, a, b), d2 = d(p, b, c), d3 = d(p, c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  const headingToCard = (pt) => {
    if (!lastOn || card.hidden) return false;
    const c = card.getBoundingClientRect(), right = c.left > lastOn.x;
    const near = right ? c.left : c.right;
    return inTri(pt, lastOn, { x: near, y: c.top - 24 }, { x: near, y: c.bottom + 24 });
  };
  const track = (e) => {
    if (held || noting) return;
    const pt = { x: e.clientX, y: e.clientY };
    if (e.composedPath().some((n) => n === card || n.classList?.contains('xr-list'))) { clearTimeout(waiting); return; }
    // on the shown element's outside parts (its margin, its rulers) it stays shown, unless the pointer is on another element
    const under = e.target.closest?.('[data-x]');
    const outside = shown && !pinned && (!under || under.contains(shown)) ? zoneAt(zonesOf(shown).filter((q) => q.outside), pt.x, pt.y) : null;
    const el = pinned ?? (outside ? shown : under);
    if (el && el === shown) {
      lastOn = pt; clearTimeout(waiting);
      const z = zoneAt(zonesOf(el), pt.x, pt.y);
      if (z?.prop !== zone?.prop) { zone = z; if (z) hold(el, z.prop); draw(el); }
      return;
    }
    // on the way to the card: keep what's shown, a moment longer than it takes to get there
    if (shown && !pinned && headingToCard(pt)) { clearTimeout(waiting); waiting = setTimeout(() => { if (!card.matches(':hover')) { draw(null); } }, 500); return; }
    clearTimeout(waiting);
    lastOn = el ? pt : null;
    zone = el ? zoneAt(zonesOf(el), pt.x, pt.y) : null;
    draw(el);
    if (el && zone) hold(el, zone.prop);
  };
  stage.addEventListener('pointermove', track);
  stage.addEventListener('pointerleave', () => { if (!pinned && !held && !noting && !count()) draw(null); });
  stage.addEventListener('click', (e) => {
    if (justDragged) { justDragged = false; return; }
    if (noting || e.composedPath().some((n) => n === card || n.classList?.contains('xr-list') || n.classList?.contains('xr-note'))) return;
    const el = e.target.closest?.('[data-x]');
    pinned = pinned || !el ? null : el;
    stage.toggleAttribute('data-pinned', !!pinned);
    if (!pinned) { lastOn = null; draw(el); }
  });

  // ── one value: its options (your scale, with the value as written where it falls), snapping, setting ──
  const optionsFor = (family, n) => {
    const S = SCALE[family].map(([v, name]) => ({ name, v }));
    if (n && !S.some((o) => Math.abs(o.v - n) <= 0.5) && !(family === 'radius' && n > 500)) S.push({ name: `${Math.round(n * 10) / 10}px`, v: n, hard: true });
    if (family === 'spacing') S.unshift({ name: '0', v: 0 });
    return S.sort((a, b) => a.v - b.v);
  };
  const familyOf = (prop) => (prop === 'width' || prop === 'height' ? 'size' : prop === 'border-radius' ? 'radius' : prop === 'font-size' ? 'type' : 'spacing');
  const read = (el, prop) => { const cs = getComputedStyle(el); return prop === 'width' ? el.getBoundingClientRect().width : prop === 'height' ? el.getBoundingClientRect().height : prop === 'gap' ? parseFloat(cs.columnGap) || parseFloat(cs.rowGap) || 0 : parseFloat(cs.getPropertyValue(prop)) || 0; };
  const set = (el, prop, v) => {
    if (!changes.has(el)) changes.set(el, new Map());
    const m = changes.get(el);
    if (!m.has(prop)) m.set(prop, el.style.getPropertyValue(prop));
    el.style.setProperty(prop, `${v}px`);
  };
  const nearest = (S, v) => S.reduce((b, o) => (Math.abs(o.v - v) < Math.abs(b.v - v) ? o : b), S[0]);
  const live = document.createElement('div'); live.className = 'xr-live'; live.hidden = true; stage.append(live);
  const say = (o, x, y) => { const s = box(); live.hidden = false; live.innerHTML = `<b>${o.v}</b>${o.hard ? '<i class="off">off scale</i>' : `<i>${o.name}</i>`}`; live.style.left = `${x - s.left + 16}px`; live.style.top = `${y - s.top + 14}px`; };

  // drag: the value follows the hand in px and snaps to the nearest of your sizes as it goes
  const drag = (e, el, prop, sign, gain, chip) => {
    e.preventDefault(); e.stopPropagation();
    const fam = familyOf(prop), start = read(el, prop), S = optionsFor(fam, start);
    const linked = linkedOf(prop, e);
    hold(el, prop);
    const x0 = e.clientX, y0 = e.clientY, at = e.target;
    let moved = false, cur = nearest(S, start);
    held = { prop, chip }; pinned = el; stage.setAttribute('data-pinned', '');
    const move = (m) => {
      if (!moved && Math.abs(m.clientX - x0) + Math.abs(m.clientY - y0) < 3) return;
      moved = true; justDragged = true;
      const want = Math.max(0, start + sign(m.clientX - x0, m.clientY - y0) * gain), o = nearest(S, want);
      if (o !== cur) { cur = o; for (const q of linked) set(el, q, o.v); draw(el); }
      say(cur, m.clientX, m.clientY);
    };
    const up = (u) => {
      removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true);
      held = null; live.hidden = true; resync();
      if (!moved && chip) openList(el, prop, at); else draw(el);
    };
    // on the window: the part under the hand is drawn again as the value moves, so it can't hold the pointer itself
    addEventListener('pointermove', move, true); addEventListener('pointerup', up, true);
  };
  // press on the part pointed at and drag: the part itself is the handle
  const signOf = (z) => {
    const IN = { top: [0, 1], bottom: [0, -1], left: [1, 0], right: [-1, 0] };
    if (z.side) { const [ux, uy] = IN[z.side], k = z.box === 'margin' ? -1 : 1; return (dx, dy) => k * (dx * ux + dy * uy); }
    if (z.prop === 'width') return (dx) => dx;
    if (z.prop === 'height') return (dx, dy) => dy;
    if (z.family === 'radius') return (dx, dy) => (dx + dy) / 2;
    if (z.family === 'type') return (dx, dy) => -dy / 2;
    return z.col ? (dx, dy) => dy : (dx) => dx;
  };
  stage.addEventListener('pointerdown', (e) => {
    if (!shown || !zone || noting || e.button !== 0) return;
    if (e.composedPath().some((n) => n === card || n.classList?.contains('xr-list') || n.classList?.contains('xr-note'))) return;
    // the part under the press itself (not the last one pointed at); no text is selected while the part is dragged
    const z = zoneAt(zonesOf(shown), e.clientX, e.clientY) ?? zone, el = shown, x0 = e.clientX, y0 = e.clientY;
    e.preventDefault();
    // a press that moves is a drag of the part; one that doesn't is a click (it holds the element)
    const first = (m) => {
      if (Math.abs(m.clientX - x0) + Math.abs(m.clientY - y0) < 3) return;
      removeEventListener('pointermove', first, true); removeEventListener('pointerup', cancel, true);
      drag(e, el, z.prop, signOf(z), 1, false);
    };
    const cancel = () => { removeEventListener('pointermove', first, true); removeEventListener('pointerup', cancel, true); };
    addEventListener('pointermove', first, true); addEventListener('pointerup', cancel, true);
  }, true);
  card.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.xr-hand')) return;
    const ch = e.target.closest('[data-prop]'); if (!ch || !shown) return;
    drag(e, shown, ch.dataset.prop, (dx) => dx, familyOf(ch.dataset.prop) === 'size' ? 2 : 0.5, true);
  });
  // ── the value in hand: the token picker row at the top of the card, for the part or number last pointed at ──
  let inHand = null; // { el, prop, p (the picker), S }
  const sidesSaid = (prop) => { const m = prop.match(/^(padding|margin)-(\w+)$/); if (!m) return null; return link === 'all' ? `all ${m[1]}` : link === 'pair' ? `${m[2]} + ${PAIR[m[2]]}` : m[2]; };
  const TOYS = { padding: 'padding', margin: 'margin', width: 'width', height: 'height', 'border-radius': 'corner', gap: 'gap', 'font-size': 'type' };
  const hold = (el, prop) => {
    if (inHand && inHand.el === el && inHand.prop === prop) return;
    hand.innerHTML = ''; inHand = null;
    if (!el || !prop) return;
    const sided = sidesSaid(prop) !== null, now = read(el, prop), S = optionsFor(familyOf(prop), now);
    const p = picker(stage, {
      name: prop.replace('-', ' '), toy: TOYS[prop.split('-')[0]] ?? TOYS[prop] ?? 'size', options: S, into: hand, keys: 'row', start: S.indexOf(nearest(S, now)),
      mark: () => '', format: (o) => `${o.v}px`,
      // the element takes the value only when it differs (the row also calls this as it is made)
      apply: (o) => { const qs = linkedOf(prop); if (qs.every((q) => Math.abs(read(el, q) - o.v) < 0.5)) return; for (const q of qs) set(el, q, o.v); draw(el); },
    });
    const label = sided ? sidesSaid(prop) : (prop === 'border-radius' ? 'corner' : prop === 'font-size' ? 'text size' : prop);
    p.row.querySelector('.scrub').insertAdjacentHTML('afterend', `<span class="side">${label}</span>`);
    hand.insertAdjacentHTML('beforeend', `<div class="say">${sided ? '<span data-s="mode">← sides</span>' : ''}<span data-s="value">↕ ${sided ? 'value' : 'your sizes'}</span></div>`);
    // the lit place is a thumb that slides between the sides and the value: it follows the fingers, then snaps
    p.row.insertAdjacentHTML('afterbegin', '<i class="thumb" aria-hidden="true"></i>');
    inHand = { el, prop, p, S, sided, seg: 'value', tx: 0, ty: 0, axis: null, idle: 0 };
    showSeg();
    requestAnimationFrame(() => thumbAt(0, true));
  };
  const showSeg = () => {
    if (!inHand) return;
    inHand.p.row.dataset.seg = inHand.seg;
    for (const sp of hand.querySelectorAll('.say span')) sp.toggleAttribute('data-on', sp.dataset.s === inHand.seg);
    const side = inHand.p.row.querySelector('.side'); if (inHand.sided) side.textContent = sidesSaid(inHand.prop);
    if (shown && !held) draw(shown);
  };
  // the thumb: over the place in force, pulled toward the other by `pull` (-1..1 of the way); `still` places it at once
  const thumbAt = (pull = 0, still = false) => {
    const h = inHand; if (!h) return;
    const row = h.p.row, t = row.querySelector('.thumb'), r = row.getBoundingClientRect();
    const at = (el) => { const b = el.getBoundingClientRect(); return { x: b.left - r.left - 3, w: b.width + 6 }; };
    const A = at(row.querySelector('.side')), B = at(row.querySelector('.val'));
    const [from, to] = h.seg === 'mode' ? [A, B] : [B, A];
    // toward the other place it follows the hand; away from it, it only leans a little (there's nothing there)
    const k = Math.max(-0.12, Math.min(1, pull));
    const x = from.x + (to.x - from.x) * Math.max(0, k) + (k < 0 ? k * 40 : 0), w = from.w + (to.w - from.w) * Math.max(0, k);
    t.style.transition = still ? 'none' : '';
    t.style.transform = `translateX(${x.toFixed(1)}px)`; t.style.width = `${w.toFixed(1)}px`;
    t.dataset.on = h.seg; t.toggleAttribute('data-pulled', pull !== 0);
  };
  // after a drag or a list pick elsewhere, the row shows where the value is now
  const resync = () => { if (!inHand) return; const i = inHand.S.indexOf(nearest(inHand.S, read(inHand.el, inHand.prop))); if (i !== inHand.p.at()) inHand.p.set(i); };
  // (pointing at a number in the card doesn't change what the row holds: crossing the card to reach the row would)
  // two fingers over the element or the card: left and right choose sides or value, up and down change it
  // (the fingers' own direction: up is bigger, right is toward the value)
  stage.addEventListener('wheel', (e) => {
    if (!inHand || !shown || inHand.el !== shown) return;
    if (!e.composedPath().some((n) => n === card || n === shown) && !(zone && shown)) return;
    e.preventDefault();
    const h = inHand, dx = -(e.deltaMode ? e.deltaX * 16 : e.deltaX), dy = -(e.deltaMode ? e.deltaY * 16 : e.deltaY);
    // one gesture, one direction, decided from its first few px together (a swipe's first event is often a pixel or
    // two of drift); the other axis is then ignored until the fingers rest
    clearTimeout(h.idle);
    h.idle = setTimeout(() => { h.axis = null; h.ax = h.ay = 0; h.ty = 0; h.switched = false; if (h.tx) { h.tx = 0; thumbAt(0); } }, 200);
    if (!h.axis) { h.ax = (h.ax ?? 0) + dx; h.ay = (h.ay ?? 0) + dy; if (Math.abs(h.ax) + Math.abs(h.ay) < 6) return; h.axis = Math.abs(h.ax) > Math.abs(h.ay) ? 'x' : 'y'; }
    if (h.axis === 'x') {
      // one switch per swipe: the swipe's own coasting never throws it back
      if (!h.sided || h.switched) return;
      h.tx += dx;
      const toward = h.seg === 'mode' ? 1 : -1, raw = h.tx * toward;
      if (raw >= 44) {
        // the detent: past it, the thumb lets go of the hand and clicks the rest of the way, on a spring, with a squash
        h.seg = h.seg === 'mode' ? 'value' : 'mode'; h.tx = 0; h.switched = true; showSeg(); thumbAt(0);
        const row = h.p.row, t = row.querySelector('.thumb');
        t.animate?.([{ scale: '1.12 0.86' }, { scale: '0.96 1.05', offset: 0.45 }, { scale: '1.01 0.99', offset: 0.75 }, { scale: '1 1' }], { duration: 420, easing: 'ease-out' });
        const now = row.querySelector(h.seg === 'mode' ? '.side' : '.drum');
        now?.animate?.([{ scale: 0.9 }, { scale: 1.06, offset: 0.5 }, { scale: 1 }], { duration: 320, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
      } else {
        // before it: the thumb follows with resistance (the further, the less it gives), up to a third of the way
        thumbAt(raw > 0 ? 0.36 * (1 - Math.exp(-raw / 22)) : Math.max(-0.12, raw / 160));
      }
      return;
    }
    if (h.axis !== 'y') return;
    h.ty += dy;
    while (Math.abs(h.ty) >= 30) {
      const up = h.ty > 0; h.ty -= Math.sign(h.ty) * 30;
      if (h.seg === 'mode') {
        const i = LINKS.indexOf(link), j = Math.max(0, Math.min(2, i + (up ? 1 : -1)));
        if (j !== i) {
          link = LINKS[j];
          // the sides just taken in take the value the side in hand has
          const v = read(h.el, h.prop); for (const q of linkedOf(h.prop)) if (Math.abs(read(h.el, q) - v) >= 0.5) set(h.el, q, v);
          draw(h.el); showSeg();
          h.p.row.querySelector('.side').animate?.([{ transform: `translateY(${up ? 5 : -5}px)`, opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
        }
      } else h.p.set(h.p.at() + (up ? 1 : -1));
    }
  }, { passive: false });
  // a click on a number: the list of your sizes
  const openList = (el, prop, at) => {
    stage.querySelector('.xr-list')?.remove();
    const now = read(el, prop), S = optionsFor(familyOf(prop), now), here = nearest(S, now), s = box(), b = at.getBoundingClientRect();
    const list = document.createElement('div'); list.className = 'xr-list';
    list.innerHTML = S.map((o, i) => `<button type="button" data-i="${i}" class="${o.hard ? 'hard' : ''}" aria-selected="${o === here}">${o.name}<span>${o.v}</span></button>`).join('');
    list.style.left = `${b.left - s.left}px`; list.style.top = `${b.bottom - s.top + 6}px`;
    stage.append(list);
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    list.addEventListener('click', (e) => { const o = S[Number(e.target.closest('[data-i]')?.dataset.i)]; if (!o) return; for (const q of linkedOf(prop)) set(el, q, o.v); list.remove(); draw(el); resync(); });
    const away = (e) => { if (!e.composedPath().includes(list)) { list.remove(); removeEventListener('pointerdown', away, true); } };
    addEventListener('pointerdown', away, true);
  };

  // ── the changes: counted at the foot of the card; Sync writes them, Esc puts them back ──
  function pendHtml() {
    const n = count(); if (!n) return '';
    return `<div class="xr-pend"><span>${n} change${n > 1 ? 's' : ''}</span><span class="sp"></span><button type="button" class="back" title="Esc">Put back</button><button type="button" class="sync">Sync <kbd>↵</kbd></button></div>`;
  }
  const sync = () => {
    const n = count(); if (!n) return false;
    const pend = card.querySelector('.xr-pend');
    changes.clear();
    if (pend) {
      pend.setAttribute('data-done', ''); pend.innerHTML = `<span>✓ Synced ${n} change${n > 1 ? 's' : ''} to your code</span>`;
      const b = pend.getBoundingClientRect(); burst(root, b.left + 30, b.top + b.height / 2, { pieces: 18 });
      setTimeout(() => { lastCard = ''; if (shown) draw(shown); }, 1400);
    }
    return true;
  };
  const putBack = () => {
    if (!count()) return false;
    for (const [el, m] of changes) for (const [prop, was] of m) { if (was) el.style.setProperty(prop, was); else el.style.removeProperty(prop); }
    changes.clear(); lastCard = ''; if (shown) draw(shown);
    return true;
  };
  card.addEventListener('click', (e) => { if (e.target.closest('.sync')) sync(); else if (e.target.closest('.back')) putBack(); });
  stage.addEventListener('dblclick', (e) => { if (count() && !e.target.closest('.xr-note')) { e.preventDefault(); sync(); } });

  // ── ↵ anywhere: a note for your agent about what you're pointing at; ⌘↵ copies it with the file and line ──
  const startNote = () => {
    const el = shown; if (!el) return;
    pinned = el; stage.setAttribute('data-pinned', '');
    const [name, source] = nameOf(el);
    const note = document.createElement('div');
    note.className = 'xr-note';
    note.innerHTML = `<div class="nh"><i class="toy">${card.querySelector('.xr-head .toy')?.innerHTML ?? ''}</i>Note for your agent</div><code>${name}${source ? ` · ${source}` : ''}</code>
      <textarea placeholder="What should change here?" aria-label="Note for your agent about ${name}"></textarea>
      <div class="nf"><span class="keys"><kbd>⌘</kbd><kbd>↵</kbd>copy for your agent</span><span class="done"><i>✓</i>Copied with its place</span><span><kbd>Esc</kbd></span></div>`;
    note.style.left = `${cardAt.x}px`; note.style.top = `${cardAt.y}px`;
    stage.append(note); card.hidden = true;
    const ta = note.querySelector('textarea');
    const close = () => { note.remove(); noting = null; draw(el, null); };
    noting = { close };
    draw(el);
    ta.addEventListener('keydown', async (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const said = ta.value.trim(); if (!said) return;
        const text = `${said}\n\nWhere: <${name}> at ${source ?? 'an element with no source line yet'}`;
        try { await navigator.clipboard.writeText(text); } catch { ta.select(); document.execCommand?.('copy'); }
        note.setAttribute('data-done', '');
        const b = note.getBoundingClientRect(); burst(root, b.left + 40, b.bottom - 16, { pieces: 16 });
        setTimeout(close, 1400);
      }
    });
    requestAnimationFrame(() => ta.focus({ preventScroll: true }));
  };

  const keys = (e) => {
    if (!root.host.isConnected) { removeEventListener('keydown', keys, true); return; }
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = e.composedPath().some((n) => n.localName === 'textarea' || n.localName === 'input');
    if (typing || noting) return;
    // ↵: sync what's collected; with nothing to sync, a note for your agent
    if (e.key === 'Enter' && shown) { e.preventDefault(); if (!sync()) startNote(); }
    else if (e.key === 'Escape') { e.preventDefault(); stage.querySelector('.xr-list')?.remove(); if (!putBack() && pinned) { pinned = null; stage.removeAttribute('data-pinned'); draw(null); } }
  };
  addEventListener('keydown', keys, true);
  addEventListener('resize', () => shown && draw(shown));
  void host;
}
